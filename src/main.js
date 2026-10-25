// The shell: the screens (the songs, with the lesson offered to a first-timer; settings, calibration), the analysis,
// the run, the pause and the results (panels beside the held picture), the queue of songs played one after another. The run is stepped at a fixed rate (120 Hz) up to the song's clock and drawn once
// per frame. Keys: ↑ ↓ pick a song, Enter / Space start it, Esc back to the songs, Enter / Space / R play again. URL: ?bot=1 the bot plays (tests), ?track=<n> starts a track at
// once, ?probe=1 only loads.
import { track } from './telemetry.js';
import { BlackBox } from './blackbox.js';
import { analyze } from './analyze.js';
import { buildLevel } from './level.js';
import { Run } from './run.js';
import { moveClips, prepClips, warmCartoon } from './anim.js';
import { Renderer } from './render/renderer.js';
import { screenSwap } from './render/layers/modes.js';
import { Song } from './audio.js';
import { Input } from './input.js';
import { Pads } from './ui/pads.js';
import { padEditor } from './ui/pads-edit.js';
import { Bot } from './bot.js';
import { record as rememberRun, remember } from './memory.js';
import { Cues, Sfx } from './sfx.js';
import { Settings } from './settings.js';
import { applySettings, bindSettings } from './ui/settings-screen.js';
import { languagePicker } from './ui/language.js';
import { bindCalibration } from './ui/calibrate-screen.js';
import { showResults } from './ui/results.js';
import { ML_ENABLED, neuralMood } from './ml/mood.js';
import { modRate } from './mods.js';
import { Meta } from './meta.js';
import { drawLogs, drawMemory } from './ui/songs.js';
import { songSelect } from './ui/select.js';
import { Preview } from './ui/preview.js';
import { vaultGet, vaultPut } from './vault.js';
import { PERKS, offer } from './perks.js';
import { starsFor } from './ui/results.js';
import { SessionLog, gameSnapshot, reportDialog, sendReport } from './report.js';
// (`tr` is also the name of a track here: the translation goes by another name)
import { initLang, onLangChange, tr as l10n, trName } from './i18n.js';
import { SIGNS } from './character.js';
import { EGGS } from './render/layers/character.js';
import { noteOf } from './hints.js';
import { Library } from './library.js';
import { coverURL, readTags } from './tags.js';
import { HEART, cover, hueOf, songLink } from './ui/select.js';
import * as audius from './audius.js';
import { lyricsOf } from './lyrics.js';
import { Haptics } from './haptics.js';
import { wants } from './kinds.js';
import { heldFor, pressesOf } from './bot.js';
import { slowZones } from './stretch.js';
import { fpNeeds, knownId, knownOf, lagOf } from './known.js';
import { Feed } from './stream.js';

const STEP = 1 / 120;
// the build the world plays (tools/build.mjs --public): no song from a link (it needs the owner's computer), no bug
// reports sent to it
const PUBLIC = document.querySelector('meta[name="sim-build"]')?.content === 'public';
if (PUBLIC) document.documentElement.classList.add('public');
// the touch controls now (input.js): the setting, or by how the phone is held
// (how it is held read on a resize, not each frame: reading the window's size can make the browser lay the page out)
let wide = innerWidth > innerHeight;
addEventListener('resize', () => (wide = innerWidth > innerHeight));
const controls = () => {
  const c = settings.get('controls');
  return c === 'auto' ? (wide ? 'zones' : 'swipe') : c;
};
// (first, so that what goes wrong from the start is in a bug report)
const log = new SessionLog();
const Q = new URLSearchParams(location.search),
  BOT = Q.has('bot'),
  $ = s => document.querySelector(s);
const song = new Song(),
  cv = $('#cv'),
  R = new Renderer(cv),
  // (the flight recorder: the last 20 s of frames and music, for a bug report)
  box = new BlackBox(song),
  settings = new Settings(),
  // the buttons on the screen, for the scheme that has them, where the player put them
  pads = new Pads($('#pads'), () => settings.get('pads')),
  padEdit = padEditor(pads, settings),
  // (a flight's heights and a shaft's lanes are stepped by following the finger)
  input = new Input(cv, song, () => controls(), () => (run?.fly ? 'v' : run?.mode === 'shaft' && !run?.climbPose ? 'h' : null), () => !!run?.climbPose, pads),
  sfx = new Sfx(song),
  cues = new Cues(sfx),
  haptics = new Haptics(),
  targets = { song, sfx, renderer: R },
  cache = new Map();
box.wrap(R);
// a race waiting for the player's own copy of a song (a challenge link with its fingerprint): { fp, ghost, title }
let race = null;
// a line at the bottom of the screen for a few seconds
function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (el.hidden = true), 4000);
}
function raceBanner() {
  const el = $('#racebanner');
  el.hidden = !race;
  if (race) el.querySelector('span').textContent = l10n('race a friend on {title}: add your copy of this song', { title: race.title });
}
let clips = null,
  tracks = [],
  run = null,
  level = null,
  bot = null,
  current = null,
  simT = 0,
  raf = 0,
  // (a bug report open: the run stands still)
  paused = false,
  inputs = [],
  // the modifiers for the next song (a challenge link's, the day's)
  mods = [],
  // what is played: a song picked on the map (null), the track of the day ('daily') or a set of three ('set', with
  // `set` its state); the ghost raced (its inputs and its own run of its own copy of the level)
  mode = null,
  set = null,
  ghostIn = null,
  ghostLevel = null,
  ghost = null;
const meta = new Meta();
// the songs screen (ui/select.js): a song picked is heard (ui/preview.js); what its choices do
const preview = new Preview(song),
  lib = new Library();
let select = null,
  // the songs played one after another (a tab of the songs screen: ui/select.js): { list, i, auto, shuffle, name };
  // `auto` the next one starts by itself after a win
  queue = null,
  // (a new build has taken over while a song played: the page is reloaded into it on the way back to the songs)
  stale = false;

const store = {
  get(k, d) {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? d;
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};

// the sound woken on the first touch or key anywhere (a phone's browser starts it only on one), so the songs' previews
// and the game are heard from the start
addEventListener('pointerdown', () => song.ensure(), { once: true, capture: true });
addEventListener('keydown', () => song.ensure(), { once: true, capture: true });
// a file fetched with its progress told as it comes (0..1; `guess` its size when the server does not say, as it does not
// for a compressed one); its bytes
async function fetchWithProgress(url, onProgress, guess = 4e6) {
  const r = await fetch(url);
  if (!r.ok || !r.body) return r.arrayBuffer();
  const total = +(r.headers.get('content-length') ?? 0) || guess,
    reader = r.body.getReader(),
    parts = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    got += value.length;
    onProgress(Math.min(0.99, got / total), got);
  }
  const out = new Uint8Array(got);
  let at = 0;
  for (const c of parts) out.set(c, (at += c.length) - c.length);
  onProgress(1, got);
  return out.buffer;
}
const MB = n => (n / 1048576).toFixed(1);

async function boot() {
  // (the player's language loaded, and the page's own words put in it, before any screen shows)
  await initLang();
  // (the moves' clips are most of what the game downloads: the boot screen's bar, index.html, after the modules)
  const clipsAt = p => window.__boot?.(0.4 + 0.58 * p),
    [c, t] = await Promise.all([fetchWithProgress('data/clips.json', clipsAt, 2.2e6).then(b => JSON.parse(new TextDecoder().decode(b))), fetch('tracks/tracks.json').then(r => r.json())]);
  clips = prepClips(c);
  select = songSelect({
    meta,
    tracks: t,
    settings,
    preview,
    lib,
    on: {
      play: (e, picked, q) => ((queue = q ?? null), pick(e, picked, false)),
      full: () => fullScreen(),
      lesson: () => startLesson(),
      daily: () => startDaily(),
      set: () => startSet(),
      add: () => $('#upload').click(),
      near: e => nearSong(e),
    },
  });
  warmCartoon(clips, moveClips());
  tracks = t;
  applySettings(settings, targets);
  // (a player from before the coach: what they learned then is taken as known)
  if (settings.get('taught') === undefined && settings.get('learned')) settings.set('taught', 'all');
  // (everyone lands on the songs: a first-timer finds the lesson picked there, one who has played before on another
  // device can skip it)
  menu();
  window.GAME = { get run() { return run; }, get level() { return level; }, get coach() { return coach; }, get lap() { return lap; }, nearSong, coachOn, song, R, box, start, tracks, offline, stepTo, swapAt, resolve, controls, settings };
  window.GAME_READY = true;
  // (the songs screen up: how long the page took to be playable)
  track('menu_ready', { ms: Math.round(performance.now()), touch: !!input.touch });
  // (the boot screen faded out)
  window.__boot?.(1);
  const bootEl = document.getElementById('boot');
  bootEl?.classList.add('gone');
  setTimeout(() => bootEl?.remove(), 400);
  // (a challenge link: a song of the game's, its modifiers and the ghost to race)
  if (Q.has('mods')) mods = Q.get('mods').split(',').filter(Boolean);
  if (Q.has('ghost')) ghostIn = decodeGhost(Q.get('ghost'));
  // (a phone's browser plays no sound until the page is touched: a link opened from a chat waits for the tap)
  // (a race on a song of the friend's own: waits for the file, shown on the songs screen)
  if (Q.has('fp') && ghostIn) {
    race = { fp: +Q.get('fp'), ghost: ghostIn, title: Q.get('title') ?? '' };
    ghostIn = null;
    raceBanner();
  }
  if (Q.has('track') || Q.has('audius')) {
    const go = () => (Q.has('audius') ? start(null, null, `audius:${Q.get('audius')}`) : start(tracks[+Q.get('track')]));
    if (BOT || Q.has('probe') || navigator.userActivation?.hasBeenActive) go();
    else {
      show('#loading');
      $('#loadtxt').textContent = l10n('tap to start');
      addEventListener('pointerdown', go, { once: true });
    }
  }
}

function show(id) {
  for (const el of document.querySelectorAll('.screen')) el.hidden = el.id !== id.slice(1);
  $('#odbtn').hidden = true;
  // (a song being listened to on the songs screen stops when it is left)
  if (id !== '#menu') select?.leave();
  input.enabled = id === '#game';
  document.body.classList.toggle('playing', id === '#game');
}
function menu() {
  if (stale) return location.reload();
  leaveFullScreen();
  show('#menu');
  $('#panel').hidden = true;
  select.draw()?.focus({ preventScroll: true });
  raceBanner();
}
// a song picked
async function pick(s, picked, race) {
  mode = null;
  set = null;
  mods = picked;
  ghostIn = race ? meta.s.ghosts[s.key] : null;
  if (s.track !== undefined) return start(tracks[s.track]);
  const link = s.link ?? s.m?.link;
  if (link) return start(null, null, link);
  const v = await vaultGet(s.key);
  if (v) start(null, new File([v.bytes], v.name));
}

// a song from a link: an Audius track (audius:<id>) straight from Audius, credited to its artist; any other link
// through the local server (tools/serve.mjs), which has yt-dlp fetch its audio (the owner's own computer only);
// [audio, title, artist, credit] or an error
async function fromLink(url) {
  if (url.startsWith('audius:')) {
    $('#loadtxt').textContent = l10n('fetching the song…');
    const id = url.slice(7),
      [t, ab] = await Promise.all([audius.track(id), audius.audio(id)]);
    return [ab, t.title, t.artist, { by: t.artist, url: t.url }, t.art];
  }
  $('#loadtxt').textContent = l10n('fetching the song…');
  const r = await fetch(`api/fetch?url=${encodeURIComponent(url)}`).catch(() => null);
  if (!r?.ok) throw new Error(r ? (await r.text()) || l10n('could not get that song') : l10n('links need the game server (node game/tools/serve.mjs)'));
  return [await r.arrayBuffer(), decodeURIComponent(r.headers.get('X-Title') ?? 'track'), decodeURIComponent(r.headers.get('X-Artist') ?? '')];
}

// the controls asked for once on a touch screen, while the first song loads: swipes or buttons; the song waits for the
// answer (a player who set them in the settings, or has played with buttons, is not asked)
let ctlAsk = null;
function pickControls() {
  const asked = settings.get('ctlPicked') || settings.get('controls') !== 'auto' || BOT || Q.has('probe') || !matchMedia('(pointer: coarse)').matches;
  if (asked) return Promise.resolve();
  $('#ctlpick').hidden = false;
  return (ctlAsk ??= new Promise(res => {
    for (const b of document.querySelectorAll('#ctlpick button'))
      b.onclick = () => {
        settings.set('controls', b.dataset.v);
        settings.set('ctlPicked', true);
        track('controls_pick', { controls: b.dataset.v });
        $('#ctlpick').hidden = true;
        ctlAsk = null;
        res();
      };
  }));
}
async function start(tr, file, link, again = false) {
  // (a song of the game's that is an Audius one: played from Audius, credited)
  if (tr?.audius) return start(null, null, `audius:${tr.audius}`);
  // (a song picked: the funnel's step before its loading, so a player lost while it loads is seen; not again when a
  // song known ahead turned out to be another recording and is read the slow way)
  if (!again) track('song_pick', { from: teach?.lesson ? 'lesson' : link?.startsWith('audius:') ? 'audius' : link ? 'link' : file ? 'file' : 'game', ms: Math.round(performance.now()) });
  song.ensure();
  fullScreen();
  show('#loading');
  $('#loadtxt').textContent = l10n('reading the song…');
  $('#loadbar').style.width = '0%';
  const picked = pickControls();
  const key = link ? `link:${link}` : file ? `file:${file.name}:${file.size}` : tr.file,
    // (read again the slow way: from the first pick)
    loadT0 = again && lap ? lap.t0 : performance.now(),
    fromNow = link?.startsWith('audius:') ? 'audius' : link ? 'link' : file ? 'file' : 'game';
  // (how long each step of the loading took, ms from the pick: sent with song_loaded, to see where a phone waits)
  lap = { t0: loadT0 };
  const mark = k => (lap[k] = Math.round(performance.now() - loadT0)),
    myLap = lap;
  // (a file of the player's own kept on the device, so the map can play it again)
  if (file && !cache.has(key)) file.arrayBuffer().then(b => vaultPut(key, b, file.name));
  // (a song still coming for another song picked before: let go, and that song fetched again when it is played again)
  if (streaming && cache.get(key)?.feed !== streaming) {
    streaming.abort();
    for (const [k, e] of cache) if (e.feed === streaming && !e.buf) cache.delete(k);
    streaming = null;
  }
  let entry = cache.get(key);
  // (one that could not all come: fetched again)
  if (entry && !entry.buf && entry.feed?.error) {
    cache.delete(key);
    entry = null;
  }
  let way = entry ? 'cached' : 'whole',
    check = null;
  if (!entry) {
    let ab, title, artist, credit, art;
    try {
      // (a song known ahead: its analysis from a small file, its audio played as it comes; else, or if the song that
      // comes is not the one known, the audio already coming is read the slow way)
      const q = !file && !ML_ENABLED && !Q.has('whole') ? await quick(knownId(tr, link), key, tr, link, mark) : null;
      if (q?.entry) {
        ({ entry, check } = q);
        way = 'known';
      } else if (q?.feed) {
        const i = await q.info;
        [ab, title, artist, credit, art] = [await q.feed.all(), i.title, i.artist, i.credit, i.art];
      } else {
        // (a song of the game's: its download on the bar, the first half of it, with how much has come)
        const got = (p, n) => {
          $('#loadbar').style.width = `${Math.round(p * 50)}%`;
          $('#loadtxt').textContent = `${l10n('reading the song…')} ${MB(n)} MB`;
        };
        [ab, title, artist, credit, art] = link ? await fromLink(link) : [file ? await file.arrayBuffer() : await fetchWithProgress(`tracks/${tr.file}`, got), null, tr?.artist ?? ''];
      }
    } catch (e) {
      track('song_load_failed', { from: fromNow, error: String(e.message).slice(0, 120) });
      $('#loadtxt').textContent = String(e.message);
      setTimeout(menu, 3500);
      return;
    }
    if (!entry) {
      mark('dl');
      // (the player's own file: its title, artist and cover from its tags, else its name; read before the bytes are
      // handed to the decoder, which takes them)
      if (file) {
        const tags = readTags(ab);
        title = tags.title ?? null;
        artist = tags.artist ?? artist;
        lib.setCover(key, await coverURL(tags.pic));
        const m = meta.song(key);
        if (m) Object.assign(m, { tagged: true, ...(tags.title && { title: tags.title }), ...(tags.artist && { artist: tags.artist }) });
      }
      // (decoded twice: for playing, at the device's rate; for listening, always at 44.1 kHz, so that a song gives the
      // same level on every device and in the tests: decoding at another rate moves the samples a little, and with them
      // the close calls)
      const fixed = await new OfflineAudioContext(2, 44100, 44100).decodeAudioData(ab.slice(0)),
        buf = await song.decode(ab);
      mark('decode');
      $('#loadtxt').textContent = l10n('Struna is listening…');
      // (listening: the second half of the bar)
      const A = await analyze(fixed, p => ($('#loadbar').style.width = `${Math.round(50 + p * 50)}%`));
      mark('analyze');
      // (the neural mood, when it is on: once per song, then from the device's cache)
      if (ML_ENABLED) $('#loadtxt').textContent = l10n('the AI is feeling it…');
      const ml = ML_ENABLED ? await neuralMood(buf, A.seed) : null;
      entry = { buf, A, ml, credit: credit ?? null, link: link ?? null, title: title ?? tr?.title ?? file.name.replace(/\.[^.]+$/, ''), artist: artist ?? '', art: art ?? null };
    }
    // (its words, timed, if the song is known: looked up while it plays, shown when they come)
    entry.lyrics = lyricsOf(entry.artist, entry.title, entry.A.dur).catch(() => null);
    cache.set(key, entry);
  }
  current = entry;
  current.key = key;
  current.art ??= lib.cover(key);
  // (its cover loaded now, so the pause shows it at once)
  if (current.art) new Image().src = current.art;
  // (a race sent for a song of the friend's own: the ghost runs only if this is the same recording, its fingerprint
  // the same; another recording of it would make another level, and the ghost would run into walls)
  if (race && !tr) {
    ghostIn = race.fp === entry.A.seed ? race.ghost : null;
    if (!ghostIn) toast(l10n('not the same recording: no race this time'));
    race = null;
  }
  level = make(entry, key);
  mark('level');
  track('song_loaded', { from: fromNow, ms: Math.round(performance.now() - loadT0), cached: way === 'cached', way, ...(again && { again }), ...stepsOf(myLap) });
  // (the ghost raced: its own copy of the level, so its run judges its own things)
  ghostLevel = ghostIn ? make(entry, key) : null;
  const L = level;
  entry.lyrics?.then(w => (L.lyrics = w));
  // (the song's audio to play: once a song known ahead is matched with what has come of it (while the diagnosis is read);
  // and the coach's slowed stretches of it made meanwhile (stretch.js, in a worker), so play() finds them: a song still
  // coming has each made as soon as it has come that far)
  const sure = (check ?? Promise.resolve(true)).then(ok => {
    if (ok && level === L) {
      song.use(entry);
      if (!BOT) song.slow(newCoach()?.zones ?? []);
    }
    return ok;
  });
  // (the song rehearsed meanwhile, out of sight: each of its moments that first draws something new drawn once now, on
  // a run of its own that is never played (render/rehearse.js), so no act, lens or boss costs its first frame in play;
  // in the time the song takes to be ready, its moments in order: a slow phone that has not done them all by then
  // starts the song all the same, the rest drawn for the first time as they come (the tests rehearse all of it))
  let ready = false;
  const rehearsal = R.rehearse(new Run(L, clips), () => ready && !BOT && !Q.has('probe')).catch(e => console.error('rehearse:', e));
  // (the diagnosis read out while it is still loading, where there is time to read it: the run shows only its word)
  if (!BOT && !Q.has('probe')) {
    const S = SIGNS[L.ch.sign],
      esc = x => String(x).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
    $('#loadtxt').innerHTML = `<b class="diag">${esc(l10n('DIAGNOSIS: {name}', { name: l10n(S.name) }))}</b><br>${esc(l10n(S.line))} · ${esc(trName(L.ch.sector))}${L.say ? `<br><small>${esc(l10n('STRUNA: {say}', { say: L.say }))}</small>` : ''}${entry.credit ? `<br><small>♪ ${esc(entry.credit.by)} · Audius</small>` : ''}`;
    await new Promise(r => setTimeout(r, 2200));
  }
  try {
    // (another recording than the one known: read the slow way, its audio kept coming)
    if (!(await sure)) {
      ready = true;
      await rehearsal;
      misfits.set(key, entry.feed);
      streaming = null;
      cache.delete(key);
      return start(tr, file, link, true);
    }
    // (a song still coming: enough of it here that it will not run out)
    if (!entry.buf) await enough(entry);
    mark('buffered');
    // (the coach's first slowed stretches made: the song's first seconds are scheduled as it starts)
    await song.made(6, 1500);
    mark('stretched');
  } catch (e) {
    ready = true;
    await rehearsal;
    track('song_load_failed', { from: fromNow, error: String(e.message).slice(0, 120) });
    $('#loadtxt').textContent = String(e.message);
    setTimeout(menu, 3500);
    return;
  }
  ready = true;
  await rehearsal;
  mark('rehearsed');
  // (not before the controls are picked, however soon the song is ready)
  await picked;
  if (lap !== myLap) return;
  mark('play');
  play();
  myLap.played = true;
}

// the steps of a loading as telemetry: each step's ms from the pick
const stepsOf = lap => Object.fromEntries(Object.entries(lap).filter(([k]) => k !== 't0' && k !== 'played').map(([k, v]) => [`at_${k}`, v]));
// (the loading's steps of the song played last; the song still coming, if one is)
let lap = null,
  streaming = null;
// what is known ahead of each song (known.js), asked once: a promise of it or null (the last few songs asked kept)
const knownAsked = new Map();
function knownFor(kid) {
  if (!kid) return Promise.resolve(null);
  if (!knownAsked.has(kid)) {
    knownAsked.set(
      kid,
      knownOf(kid).then(k => k ?? (knownAsked.delete(kid), null)),
    );
    if (knownAsked.size > 8) knownAsked.delete(knownAsked.keys().next().value);
  }
  return knownAsked.get(kid);
}
// a song picked on the songs screen: what is known of it fetched a moment later if it is still the one picked (a quick
// run through the list fetches nothing)
let nearT = 0;
function nearSong(e) {
  clearTimeout(nearT);
  const kid = e?.audius ? knownId(null, `audius:${e.audius}`) : e?.track !== undefined ? knownId(tracks[e.track]) : null;
  if (kid && !ML_ENABLED)
    nearT = setTimeout(() => {
      knownFor(kid);
      if (e.audius) audius.resolve(e.audius);
    }, 400);
}
// a song known ahead (known.js): what is known of it fetched (a small file) while its audio starts coming (stream.js).
// { entry, check } to play it so (`check` resolves once the audio decoded here is matched against it: true, or false if
// it is another recording), else { feed, info }: the audio coming and its title and credit, to be read the slow way
// (also a song found not to match before: its audio still coming, misfits)
const misfits = new Map();
async function quick(kid, key, tr, link, mark) {
  if (!kid) return null;
  const id = link?.slice(7),
    // (its title and credit, asked of Audius when not known ahead)
    info = () => (link ? audius.track(id).then(t => ({ title: t.title, artist: t.artist, credit: { by: t.artist, url: t.url }, art: t.art })) : Promise.resolve({ title: null, artist: tr?.artist ?? '' }));
  if (misfits.has(key)) {
    const feed = misfits.get(key);
    misfits.delete(key);
    return { feed, info: info() };
  }
  const loadBar = g => {
      $('#loadbar').style.width = `${Math.round(Math.min(1, g / Math.max(1, want)) * 50)}%`;
      $('#loadtxt').textContent = `${l10n('reading the song…')} ${MB(g)} MB`;
    },
    // (an Audius song's stream found where it ends meanwhile (audius.resolve: its redirects take a second and more))
    end = link ? audius.resolve(id) : null;
  let want = 4e5;
  const K = await knownFor(kid);
  mark('known');
  // (the audio fetched after the small file, which the level waits for, so they do not share the network; an Audius
  // song's from where its stream ends once that is found, else the stream itself)
  const feed = new Feed(song.ensure(), link ? end.then(at => at ?? audius.streamUrl(id)) : `tracks/${tr.file}`, { progress: g => feed.loading && loadBar(g), alt: link && audius.streamUrl(id) });
  feed.loading = true;
  feed.start();
  streaming = feed;
  if (!K) return { feed, info: info() };
  feed.loading = false;
  Object.assign(feed, { bps: K.bps, total: feed.total || K.size });
  want = feed.bytesFor(Math.max(fpNeeds(K.fp), START + 0.4));
  // (an Audius song's title and credit known ahead too: the level is built without waiting for Audius to answer)
  const i = K.meta ? { ...K.meta, credit: { by: K.meta.artist, url: K.meta.url } } : await info(),
    entry = { A: K.A, buf: null, feed, lead: 0, ml: null, credit: i.credit ?? null, link: link ?? null, title: i.title ?? tr?.title, artist: i.artist ?? '', art: i.art ?? null },
    // (another recording than the one known: its size says so, or its first sound)
    other = () => feed.other || (feed.done && feed.got !== K.size),
    // (decoded first as far as the song needs to start, enough(), the fingerprint in it)
    check = feed.until(Math.max(fpNeeds(K.fp), START + 0.4)).then(() => {
      const lead = lagOf(K.fp, feed.buf);
      mark('head');
      if (lead === null || other()) return false;
      entry.lead = lead;
      entry.sure = true;
      if (feed.full) feed.bytes = null;
      return true;
    });
  // (all of it here: kept whole, as a song read the slow way is; its bytes let go once it is sure to be the song known)
  feed.on(f => {
    if (!f.full) return;
    entry.buf = f.buf;
    if (entry.sure) f.bytes = null;
  });
  return { entry, check };
}
// a song still coming: resolves when enough of it is decoded to start (START seconds), and enough is coming fast enough
// that it will not run out (else as much more as the rest will take to come); the bar shows how near
const START = 6;
function enough(entry) {
  const f = entry.feed,
    dur = entry.A.dur,
    R = modRate(mods);
  return new Promise((yes, no) => {
    const check = () => {
      if (f.error) return (clearInterval(t), off(), no(f.error));
      const bps = f.bps || f.total / dur,
        have = f.full ? dur : f.valid - entry.lead,
        came = (f.got - (f.skip ?? 0)) / bps,
        speed = f.rate / bps,
        rest = Math.max(0, (f.total - f.got) / Math.max(1, f.rate)),
        need = Math.min(dur, Math.max(START, speed >= 1.15 * R ? 0 : (R - speed) * rest + 5));
      if (f.full || (have >= Math.min(dur, START) && came >= need)) return (clearInterval(t), off(), yes());
      $('#loadbar').style.width = `${Math.round(Math.min(1, came / need) * 100)}%`;
    };
    const off = f.on(check),
      t = setInterval(check, 200);
    check();
  });
}
// the level of a song as it is played now: its modifiers, a set's perks, the moves still locked, the cursor's greeting
function make(entry, key) {
  // (a set's songs each about a move of their own; its last plays the moves of the ones before with its own: a remix,
  // stars.js)
  const remix = set && set.i >= 2 ? set.stars : null,
    L = buildLevel(entry.A, { difficulty: teach ? 'easy' : settings.get('difficulty'), ml: entry.ml, title: entry.title, artist: entry.artist, locked: meta.locked(), avoidStars: set?.stars ?? [], stars: remix, lesson: !!teach?.lesson });
  if (set && !remix && !set.stars.includes(L.star)) set.stars.push(L.star);
  L.mods = [...mods];
  L.key = key;
  L.say = meta.hello(key, mode);
  if (set) {
    L.perks = set.perks;
    L.set = set;
    if (set.perks.includes('magnet')) L.difficulty = { ...L.difficulty, perfect: L.difficulty.perfect * 1.33, great: L.difficulty.great * 1.33, near: L.difficulty.near * 1.33 };
  }
  return L;
}
// a ghost's inputs in a link: each `a<step>~<ms off its step>`, the action a letter (a capital: its release)
const CODE = { jump: 'j', slide: 's', left: 'l', right: 'r', sync: 'y' },
  DECODE = Object.fromEntries(Object.entries(CODE).map(([k, v]) => [v, k]));
const encodeGhost = list => list.map(e => (e.a === 'release' ? CODE[e.of]?.toUpperCase() : CODE[e.a]) + Math.round(e.step * 120) + '~' + Math.round((e.t - e.step) * 1000)).join('.');
function decodeGhost(str) {
  return str.split('.').flatMap(c => {
    const m = /^([a-zA-Z])(\d+)~(-?\d+)$/.exec(c);
    if (!m) return [];
    const step = +m[2] / 120,
      t = step + +m[3] / 1000,
      low = m[1].toLowerCase();
    return [m[1] === low ? { a: DECODE[low], t, step } : { a: 'release', of: DECODE[low], t, step }];
  });
}
// a fresh run of the current level
function newRun(botOpts) {
  run = new Run(level, clips);
  // (what he remembers of the player on this song: memory.js; nothing under the tests)
  run.memory = BOT || Q.has('probe') ? null : remember(level.key);
  // (a set: the health carried over from the song before)
  if (set) run.hp = set.hp;
  ghost = ghostLevel ? new Run(ghostLevel, clips) : null;
  if (ghost) ghost.feed = 0;
  R.ghost = ghost;
  bot = new Bot(level, botOpts);
  R.reset();
  // (the song's lenses and the canvases they draw on made now, while it loads, never on a drop's first beat)
  R.prewarm(run);
  // (and the sounds' mix bus and white noise, never on the first sound)
  sfx.bus();
  cues.reset();
  simT = -STEP;
  inputs = [];
}
// running the other way across the screen, the keys and swipes for forward and back swap: the kick is always the one
// he runs towards; a mirror act (the screen turned left to right) swaps them again, and a ceiling act (the world upside
// down) swaps up and down: the key is always the way it looks. A tap means its action whichever way (abs).
const swapAt = t => screenSwap(level, t);
// how well actions fit the obstacle due at t: 2 all it wants (a chord: both keys), 1 part of it, 0 none
function fit(acts, t) {
  const D = level.difficulty,
    o = level.obs.find(q => !q.res && !q.echo && Math.abs(q.t - t) < D.near) ?? run.closing?.(['foe', 'foeback'], t, level.segAt(Math.max(0, t)));
  if (!o) return [0, null];
  const w = acts.filter(a => wants(o, a)).length;
  return [o.type === 'chord' ? (w >= 2 ? 2 : w) : w === acts.length ? 2 : w ? 1 : 0, o];
}
// the time of the obstacle nearest a press, if one is in reach of it (else the press's own)
function dueAt(t) {
  const near = level.difficulty.near;
  let best = null;
  for (const q of level.obs) {
    if (q.res || q.echo || Math.abs(q.t - t) >= near) continue;
    if (!best || Math.abs(q.t - t) < Math.abs(best.t - t)) best = q;
  }
  return best ? best.t : t;
}
// the gestures as the run's actions: swapped for the way he runs and the world is turned; a touch gesture near a
// sector's edge read as the obstacle at hand wants it (its other reading fits it better); with easy chords on, a
// touch gesture giving half a chord gives the whole (the run scores it as one press, run.js)
function resolve(events) {
  const out = [];
  for (const e of events) {
    // (swapped as the world is at the obstacle it answers, not at the press: the hint shows its keys as they are then,
    // and a press a moment early can fall on the run before it, the other way across the screen: the first tic-tac of a
    // shaft entered running left)
    const S = e.abs ? {} : swapAt(dueAt(e.t)),
      map = acts => acts.map(a => S[a] ?? a);
    if (e.a === 'sync') out.push(e);
    else if (e.a === 'release') for (const a of map(e.of)) out.push({ a: 'release', of: a, t: e.t });
    else {
      let best = map(e.acts),
        [score, o] = fit(best, e.t);
      for (const alt of e.alts ?? []) {
        const [sc, q] = fit(map(alt), e.t);
        if (sc > score) [best, score, o, e.acts] = [map(alt), sc, q, alt];
      }
      for (const a of best) out.push({ a, t: e.t });
      // (a climb's beam on a phone: a swipe the way he leaps (straight across or on the diagonal) is the whole of it, the
      // up added; a thumb flicking left, right, left on the beat is the tic-tac, the hint still showing the diagonal)
      // (a leap down or up a ladder of islands' diagonal on a phone: any of its keys does, a swipe up (a plain jump),
      // across or on the diagonal)
      if (e.touch && o?.type === 'leap' && o.keys.length > 1 && o.keys.some(k => best.includes(k)))
        for (const k of o.keys.filter(q => !best.includes(q))) {
          out.push({ a: k, t: e.t, assist: true });
          e.acts = [...e.acts, ['jump', 'slide', 'left', 'right'].find(a => (S[a] ?? a) === k)];
        }
      if (e.touch && o?.type === 'tic' && best.includes(o.keys[1]) && !best.includes(o.keys[0])) {
        out.push({ a: o.keys[0], t: e.t, assist: true });
        e.acts = [...e.acts, ['jump', 'slide', 'left', 'right'].find(a => (S[a] ?? a) === o.keys[0])];
      }
      if (e.touch && settings.get('easyChords') && o?.type === 'chord' && score === 1) {
        const other = o.keys.find(k => !best.includes(k));
        out.push({ a: other, t: e.t, assist: true });
        // (let go with the rest: in screen terms, as the release is swapped like the press)
        e.acts = [...e.acts, ['jump', 'slide', 'left', 'right'].find(a => (S[a] ?? a) === other)];
      }
    }
  }
  return out;
}
// the run stepped at the fixed rate up to song time t; the actions go to the first step
function advance(t, events) {
  let ev = resolve(events);
  // (every input as the run got it, with the step it went in on: a report can replay the run exactly, tools/replay.mjs)
  for (const e of ev) inputs.push({ ...e, step: +(simT + STEP).toFixed(5) });
  while (simT + STEP <= t && !run.over) {
    simT += STEP;
    run.update(simT, BOT ? bot.step(run, simT) : ev);
    ev = [];
    // (the ghost: its inputs fed on the steps they went in on)
    if (ghost && !ghost.over) {
      const due = [];
      while (ghost.feed < ghostIn.length && ghostIn[ghost.feed].step <= simT + 1e-6) due.push(ghostIn[ghost.feed++]);
      ghost.update(simT, due);
    }
    if (run.undoTo !== undefined) return undo();
  }
}

// the cursor's undo (run.js): the run, the song and the sounds back to where it says
function undo() {
  const to = run.undoTo;
  delete run.undoTo;
  run.rewind(to);
  simT = to;
  song.play(to);
  cues.reset();
  R.rewound();
}

// the coach, in every song, never stopping it (the flow is the lesson: Rhythm Doctor, Thumper, NecroDancer): the first
// time a kind of thing comes (on this device, in any song), the song and the world slow down round it, its pitch kept
// (stretch.js: eased to 0.7 over two beats, held through its press, eased back by two beats after), while the move
// shows big beside him (render/layers/coach.js): a keycap pressed, or a finger swiping, as the player plays it now
// (input.touch: the last thing played), counted in on the beats before (three pips, a tick each on the audio clock) and
// made on its beat, as its ring closes. Nothing to read: a child who has never played learns by doing it once. That
// first time is forgiving: a press too early is kept back (the card shakes: not yet), a wrong one does nothing, and
// if the move is not made by a moment after its beat the cursor helps him over (the move pressed for him then, late
// but on the grid: a miss never skips a beat; a held one held to its end). What was learned is kept (settings
// 'taught'), so no one song has to hold every move; one helped over is not learned: its next one in the song gets the
// card again (at speed), and one of a kind not yet learned is helped over if missed (three a song at most). One who
// has played before on another device turns it off ("I have played before": 'all'). The moves after are taught by
// the hints (their notes, and a small key or finger beside each move not yet known, fading as it is played right:
// render/layers/hints.js).
// The lesson ("learn" on the songs screen, or the ? button): a course of the moves one at a time on a song played easy
// (level.js lesson), every hint shown, no dying, every move taught again; it ends a bar after the course.
// Everything the coach does goes through the run's inputs (recorded with their steps): a report replays it exactly; the
// run's judging stays in song time (song.now() is the slowed song's time). Never under the bot or the probe (?coach=1
// forces it on there, for tests).
let teach = null,
  coach = null;
const kindOf = o => o.type + (o.keys ? `:${o.keys.join('+')}` : '') + (o.key ? `:${o.key}` : '');
// (no coach for a shaft's lanes and gates (no note: the lit lane says where) or a flight's rings (each a press up or
// down as the tune goes))
const UNCOACHED = new Set(['lane', 'gate', 'ring']),
  // the slowest the song is slowed to; how late the cursor's help presses (seconds after the beat: a great on easy, on
  // the grid all the same)
  SLOWEST = 0.7,
  LATE = 0.09;
function newCoach() {
  const had = settings.get('taught');
  if (BOT || (Q.has('probe') && !Q.has('coach')) || (had === 'all' && !teach)) return null;
  const taught = new Set(teach || !Array.isArray(had) ? [] : had),
    beat = level.A.beat,
    targets = [],
    chosen = new Set();
  // (each kind not learned: its first one with four beats clear of the one taught before, so each comes on its own, and
  // three beats clear of anything else to answer before it (the count in): taught only when it is the next thing he
  // can answer, the song slowed only from the thing before it on (from: beats, at most five); an earlier one of the
  // kind with something in its way gets the small hint only)
  let last = -1e9,
    prev = -1e9;
  const from = new Map(),
    noted = o => !o.echo && !!noteOf(o, run ?? { lane: 1, alt: 1 });
  for (const o of level.obs) {
    const k = kindOf(o),
      before = prev;
    if (noted(o)) prev = o.t;
    if (o.echo || UNCOACHED.has(o.type) || taught.has(k) || chosen.has(k) || !noted(o)) continue;
    if (o.t - last < 4 * beat || o.t < 3 || o.t - before < 3 * beat) continue;
    chosen.add(k);
    targets.push(o);
    from.set(o, Math.min(5, (o.t - before) / beat - 0.25));
    last = o.t;
  }
  return { taught, targets, tset: new Set(targets), from, st: new Map(), notes: new Map(), helped: new Set(), again: new Map(), helps: new Map(), i: 0, card: null, cardOf: {}, shake: -9, beat, zones: slowZones(targets.map(o => [o.t, from.get(o)]), beat, SLOWEST, level.A.dur), lesson: !!teach?.lesson };
}
// a thing the coach looks after: of a kind not learned yet, with a note (whether it has one worked out once a thing)
function minded(o) {
  let m = coach.notes.get(o);
  if (m === undefined) coach.notes.set(o, (m = !o.echo && !UNCOACHED.has(o.type) && !!noteOf(o, run)));
  return m && !coach.taught.has(kindOf(o));
}
// what the coach knows of a thing: pressed on time by the player (on), too early (eager), helped over (helped), its hold
// let go too early (letGo) and let go for him (released)
function stOf(o) {
  let st = coach.st.get(o);
  if (!st) coach.st.set(o, (st = { on: false, eager: false, helped: false, letGo: false, released: false, done: false, ticks: 0 }));
  return st;
}
// the presses of an input event in the run's terms (as the world is turned at the thing it answers), every reading of it
function readings(e, o) {
  const S = e.abs ? {} : swapAt(o.t);
  return [e.acts, ...(e.alts ?? [])].map(acts => acts.map(a => S[a] ?? a));
}
// whether the player pressed `a` (or any of the thing's moves, a undefined) near its beat (the run's presses: after the
// shell's reading of them), looked for from the latest back
function pressed(o, a) {
  const near = level.difficulty.near,
    P = run.presses;
  for (let k = P.length - 1; k >= 0 && P[k].t > o.t - near - 0.2; k--) if (Math.abs(P[k].t - o.t) < near && (a === undefined ? wants(o, P[k].a) : P[k].a === a)) return true;
  return false;
}
// the coach's step, before the run's: the inputs as they go to the run (some kept back, the cursor's help added)
const due = [];
function coachStep(evs, t) {
  const D = level.difficulty,
    beat = coach.beat,
    obs = level.obs;
  while (coach.i < obs.length && obs[coach.i].t < simT - 2) coach.i++;
  // (the things being looked after now: from a moment back to four beats on)
  due.length = 0;
  for (let k = coach.i; k < obs.length && obs[k].t < t + 4 * beat; k++) if (minded(obs[k])) due.push(obs[k]);
  let out = evs;
  for (let n = 0; n < evs.length; n++) {
    const e = evs[n];
    let keep = true;
    if (e.acts) {
      // (a press in a taught thing's approach: kept back if too early or not its move (the card shakes), unless it is
      // for another thing at hand; its own move on time goes through)
      const o = due.find(q => coach.tset.has(q) && !q.res && e.t > q.t - 3.5 * beat && e.t < q.t + LATE);
      if (o) {
        const R2 = readings(e, o),
          fits = R2.some(acts => acts.some(a => wants(o, a))),
          other = R2.some(acts => {
            const [sc, q] = fit(acts, e.t);
            return sc > 0 && q !== o;
          });
        if (!other && (e.t < o.t - D.near || !fits)) {
          keep = false;
          coach.shake = e.t;
          if (fits) stOf(o).eager = true;
        }
      }
    } else if (e.a === 'release') {
      // (a held one let go too early: held on for him to its end)
      const o = due.find(q => heldFor(q) && !q.res && coach.st.get(q)?.on && e.t < q.t + heldFor(q) - beat / 4 && readings({ ...e, acts: e.of }, q)[0].some(a => wants(q, a)));
      if (o) {
        keep = false;
        stOf(o).letGo = true;
      }
    }
    if (!keep && out === evs) out = evs.slice(0, n);
    else if (keep && out !== evs) out.push(e);
  }
  for (const o of due) {
    const st = stOf(o);
    if (!st.on && !st.helped && pressed(o)) st.on = true;
    // (not made by a moment after its beat: the cursor's help, the move's keys not yet pressed pressed for him, late
    // but on time; a held one let go at its end)
    if (!o.res && !st.helped && !st.done && t >= o.t + LATE && run.mode !== 'dead') {
      const missing = pressesOf(o).filter(a => !pressed(o, a)),
        k = kindOf(o),
        n = coach.helps.get(k) ?? 0;
      st.done = true;
      // (three times a kind a song at most, besides its taught one: a player who never presses is not carried through)
      if (missing.length && (coach.tset.has(o) || n < 3)) {
        coach.helps.set(k, n + 1);
        st.helped = true;
        if (coach.tset.has(o)) (coach.helped.add(kindOf(o)), track('move_helped', { kind: kindOf(o), lesson: coach.lesson }));
        if (out === evs) out = evs.slice();
        out.push({ acts: missing, abs: true, t: o.t + LATE });
      }
    }
    const hold = heldFor(o);
    if (hold && (st.helped || st.letGo) && !st.released && t >= o.t + hold) {
      st.released = true;
      if (out === evs) out = evs.slice();
      out.push({ a: 'release', of: pressesOf(o), abs: true, t: o.t + hold });
    }
    // (made by the player without help, the taught one or one after it was helped over: learned, and kept (the next
    // song does not teach it again); one before its taught one teaches nothing yet, the song slows for that one anyway)
    // (passed without the cursor's help, however it was pressed (a landing held down from before counts as the run
    // counts it): learned)
    if (o.res === 'ok' && !st.helped && (coach.tset.has(o) || coach.helped.has(kindOf(o)))) {
      const k = kindOf(o);
      // (a move learned: the tutorial's step, each move its own)
      if (!coach.taught.has(k)) track('move_learned', { kind: k, lesson: coach.lesson, helped_first: coach.helped.has(k) });
      coach.taught.add(k);
      const had = settings.get('taught');
      if (had !== 'all') settings.set('taught', [...new Set([...(Array.isArray(had) ? had : []), k])]);
    }
  }
  // the card shown (render/layers/coach.js): a taught thing from four beats before it to a beat after, slowed; or, at
  // speed, the next of a kind whose taught one he was helped over
  // (the card only once its thing is the next to answer: with a box to jump before the ball to bat, nothing till the
  // box is passed; the card for what comes later read as the move to make now)
  const card = coach.cardOf;
  coach.card = null;
  let first = null;
  for (let k = coach.i; k < obs.length && obs[k].t < t + 4 * beat; k++) {
    const o = obs[k];
    if (o.t < t - beat) continue;
    const full = coach.tset.has(o);
    if (!first && !o.res && o.t > t - LATE && !o.echo && noteOf(o, run)) first = o;
    // (one helped over gets its card again at speed once a song, then only its small hint: never on every drop)
    const again = !full && coach.helped.size && minded(o) && coach.helped.has(kindOf(o)) && (!coach.again.has(kindOf(o)) || coach.again.get(kindOf(o)) === o);
    if (full || again) {
      if (again) coach.again.set(kindOf(o), o);
      // (something else to answer first: no card yet; its own small hint is enough for a move already known)
      if (first && first !== o && first.t < o.t) break;
      card.o = o;
      card.full = full;
      card.from = coach.from.get(o);
      card.st = stOf(o);
      coach.card = card;
      break;
    }
  }
  return out;
}
// the count in to a taught thing: a tick on each of the three beats before it, scheduled a moment ahead on the audio
// clock (heard on the beat, slowed as the song is)
function countIn(card, t) {
  const st = card.st,
    beat = coach.beat;
  for (let k = 3; k >= 1; k--) {
    const at = card.o.t - k * beat,
      bit = 1 << k;
    if (st.ticks & bit || at > t + 0.3 || at < t - 0.02) continue;
    st.ticks = (st.ticks ?? 0) | bit;
    sfx.play(k === 1 ? 'count3' : 'count', at);
  }
}
// what an event says of the song played (the player's own file by its length only: never its name)
let plays = 0,
  firstPress = false;
function songProps(extra) {
  const link = current?.link ?? null,
    from = teach?.lesson ? 'lesson' : link?.startsWith('audius:') ? 'audius' : link ? 'link' : current?.key?.startsWith('file:') ? 'file' : 'game',
    named = from === 'game' || from === 'audius' || from === 'lesson';
  return { from, title: named ? current?.title : null, artist: named ? current?.artist : null, audius: from === 'audius' ? link.slice(7) : null, dur: Math.round(level?.A.dur ?? 0), bpm: Math.round(level?.A.bpm ?? 0), difficulty: settings.get?.('difficulty') ?? null, mods: level?.mods?.join(',') || null, place: level?.place ?? null, star: level?.star ?? null, touch: !!input.touch, ...extra };
}
function play() {
  const odBtn = $('#odbtn');
  fullScreen();
  show('#game');
  keepAwake(true);
  haptics.reset();
  song.rate = modRate(level.mods);
  newRun();
  plays++;
  firstPress = false;
  // (the first play after a song is picked: how long the player waited from the pick)
  track('song_start', songProps({ n: plays, mode: mode ?? (teach?.lesson ? 'lesson' : queue ? 'list' : 'one'), ...(lap && !lap.played && { wait: Math.round(performance.now() - lap.t0), ...stepsOf(lap) }) }));
  held = false;
  coach = newCoach();
  R.teach = coach;
  song.slow(coach?.zones ?? []);
  song.play(0);
  // (the run's video, saved from the results)
  // (no video of the run: a screen is recorded with the device's own tools; copying the canvas every frame cost frames)
  cancelAnimationFrame(raf);
  let last = performance.now();
  const loop = () => {
    const js0 = performance.now();
    try {
      tickLoop();
    } finally {
      box.frame(js0 - (box.last ?? js0), performance.now() - js0, run, R);
      box.last = js0;
    }
  };
  const tickLoop = () => {
    if (paused || held) {
      // (paused, or the song waiting for more of itself to come: the picture held, but he knows: he knocks on the glass
      // from inside, hero.js)
      R.pausedFor = (performance.now() - (R.pausedAt ??= performance.now())) / 1000;
      R.draw(run, simT);
      raf = requestAnimationFrame(loop);
      last = performance.now();
      return;
    }
    R.pausedAt = null;
    R.pausedFor = 0;
    // (the song's clock, never more than a moment past the run's: just after the audio comes back from a pause its
    // clock can read ahead, and the run would be stepped through what it skipped)
    const now = performance.now(),
      t = Math.min(song.now(), simT + 0.25);
    R.frameTime(now - last);
    log.frame(now - last);
    last = now;
    R.touch = input.touch;
    R.controls = controls();
    // (the buttons while a finger plays them, each in the colour of its move as the world is turned now)
    pads.show(input.touch && R.controls === 'buttons');
    if (pads.on) pads.tint(swapAt(t));
    R.hints = teach ? 'always' : settings.get('hints');
    advance(t, coach ? coachStep(input.take(), t) : input.take());
    if (coach?.card?.full) countIn(coach.card, t);
    // (the run's first press: the player has the controls; how long it took them)
    if (!firstPress && run.presses.length) ((firstPress = true), track('first_press', { at: Math.round(run.t * 10) / 10, n: plays }));
    keepFullScreen();
    // (in the lesson he cannot die: it is for learning the moves; it ends a bar after its course)
    if (teach && run.hp < 35 && run.mode !== 'dead') run.hp = 35;
    if (teach?.lesson && level.lessonEnd && simT >= level.lessonEnd && !run.over) run.over = { win: true, t: simT };
    // (the overdrive ready and a finger playing: its button, so one thumb (or two thumbs, each with its own half) can let it go)
    // (written only when it changes: a write each frame made the page's style be worked out again each frame)
    const odHide = !(input.touch && run.sync >= 0.5 && !run.od && run.mode !== 'dead' && !run.over);
    if (odBtn.hidden !== odHide) odBtn.hidden = odHide;
    R.draw(run, simT);
    cues.update(run, R.plan, simT);
    buzz();
    // (the frame's own work, for the resolution: frames slow with little work are a capped screen, not slow drawing)
    R.work = performance.now() - now;
    if (run.over) return finish();
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}

function finish() {
  keepAwake(false);
  haptics.stop();
  if (run.over.win) haptics.fire([12, 60, 12, 60, 30], 4);
  teach = null;
  coach = null;
  R.teach = null;
  const r = run;
  track('song_end', songProps({ result: r.over.win ? 'win' : 'dead', at: Math.round(r.t), pct: Math.round((100 * Math.min(r.t, level.A.dur)) / level.A.dur), score: r.score, miss: r.counts.miss, perfect: r.counts.perfect, stars: starsFor(r), killer: r.over.win ? null : (r.killer ?? null) }));
  if (!BOT && !Q.has('probe')) rememberRun(level.key, { win: r.over.win, deathT: r.mode === 'dead' ? r.deadT : null });
  song.fade(r.over.win ? 1.5 : 0.4);
  const best = store.get('sim.best', {}),
    isBest = r.over.win && r.score > (best[current.title] ?? 0);
  if (isBest) store.set('sim.best', { ...best, [current.title]: r.score });
  showResults(r, level, current.title, isBest);
  // (what the run adds to the map, and the cursor's last word)
  const ch = level.ch,
    rec = meta.record({ key: level.key, title: current.title, artist: current.artist, link: current.link, style: level.profile.style, place: level.place, lens: R.look?.lens ?? null, hue: Math.round(R.look?.hue ?? 0), sign: ch.sign, sector: ch.sector, secret: !!level.secret, boss: level.boss?.name ?? ch.boss, win: r.over.win, score: r.score, stars: starsFor(r), miss: r.counts.miss, t: r.t, secretFound: !!r.secretT, bossDown: !!level.boss && r.bossHits >= level.boss.hp, hardRoute: Object.values(r.routes).includes('hard'), eggs: ch.eggs, inputs: r.over.win && !BOT ? inputs : null });
  $('#rsay').textContent = l10n('STRUNA: {say}', { say: rec.say });
  // (and the easter eggs the simulation noticed in the song: there was no time for them in the run)
  // (an Audius song: its artist credited, with a link to it)
  $('#rcredit').hidden = !current.credit;
  if (current.credit) Object.assign($('#rcredit'), { href: current.credit.url, textContent: `♪ ${current.credit.by} · Audius` });
  $('#rnews').innerHTML = [...rec.news, ...(level.ch.eggs ?? []).map(e => l10n(EGGS[e]))].map(n => `<p>${n}</p>`).join('');
  if (mode === 'daily') meta.dailyDone(r.score, r.over.win);
  // (a challenge: a link to this song with these modifiers and this run as the ghost to race: a song of the game's by
  // its number, an Audius one by its id, the player's own file by its fingerprint (the song is never sent: the friend
  // brings their own copy, and the same recording makes the same level))
  const ti = tracks.findIndex(tr => tr.title === current.title),
    which = ti >= 0 ? `track=${ti}` : current.link?.startsWith('audius:') ? `audius=${current.link.slice(7)}` : !current.link ? `fp=${current.A.seed}&title=${encodeURIComponent(current.title)}` : null;
  $('#challenge').hidden = !(r.over.win && which && !BOT);
  $('#challenge').onclick = () => {
    const url = `${location.origin}${location.pathname}?${which}${level.mods.length ? `&mods=${level.mods.join(',')}` : ''}&ghost=${encodeGhost(inputs)}`;
    navigator.clipboard?.writeText(url).then(() => ($('#challenge').textContent = l10n('link copied')));
  };
  setResult(r);
  nowPlaying($('#result'));
  // (the next song of the queue: first after a win, after a death the song again; after a win in a playlist played
  // through, it starts by itself after a count the player can stop with any touch)
  const nx = set ? null : nextUp(),
    first = nx && r.over.win ? $('#rnext') : $('#retry');
  $('#rnext').hidden = !nx;
  if (nx) $('#rnext .nxt').textContent = nx.title;
  $('#rnext').classList.toggle('main', !!nx && r.over.win);
  $('#retry').classList.toggle('main', !(nx && r.over.win));
  $('#retry').classList.toggle('ghost', !!(nx && r.over.win));
  $('#rqueue').textContent = queue?.auto && queue.list.length > 1 ? `${queue.name ?? ''} · ${queue.i + 1} / ${queue.list.length}` : '';
  setTimeout(() => {
    show('#result');
    $('#result').scrollTop = 0;
    first.focus({ preventScroll: true });
    if (nx && queue.auto && r.over.win && !BOT && !Q.has('probe')) countdown();
  }, 300);
  window.GAME_RESULT = { win: r.over.win, score: r.score, counts: r.counts, t: r.t };
}
// a set's results: on a win, the next song after a perk is picked (three to choose from); the set ends on a death or
// after its third song
function setResult(r) {
  const box = $('#rperks');
  box.replaceChildren();
  $('#retry').hidden = !!set;
  if (!set) return;
  set.score += r.score;
  if (!r.over.win || set.i >= 2) {
    if (r.over.win) meta.s.sets.done++;
    meta.s.sets.best = Math.max(meta.s.sets.best, set.score);
    meta.save();
    box.innerHTML = `<p class="setend">${l10n(r.over.win ? 'SET COMPLETE' : 'SET OVER')} · ${set.score.toLocaleString('en-US')}</p>`;
    set = null;
    $('#retry').hidden = false;
    return;
  }
  set.hp = Math.min(100, run.hp + 20);
  set.i++;
  box.innerHTML = `<p class="setend">${l10n('song {i} of 3 done · {score} · health {hp} · pick a perk', { i: set.i, score: set.score.toLocaleString('en-US'), hp: set.hp })}</p>`;
  for (const k of offer(set.perks, set.seed + set.i)) {
    const b = document.createElement('button');
    b.className = 'btn ghost perk';
    b.innerHTML = `${l10n(PERKS[k].name)}<small>${l10n(PERKS[k].hint)}</small>`;
    b.onclick = () => {
      set.perks.push(k);
      start(tracks[set.songs[set.i]]);
    };
    box.append(b);
  }
  box.querySelector('button')?.focus({ preventScroll: true });
}
function startSet() {
  queue = null;
  const seed = (Date.now() / 1000) | 0,
    order = tracks.map((_, i) => i).sort((a, b) => ((a * 2654435761 + seed) >>> 0) % 997 - ((b * 2654435761 + seed) >>> 0) % 997);
  set = { songs: order.slice(0, 3), i: 0, hp: 100, score: 0, perks: [], seed, wind: false, stars: [] };
  mode = 'set';
  mods = [];
  ghostIn = null;
  start(tracks[set.songs[0]]);
}
function startDaily() {
  queue = null;
  const d = meta.daily(tracks);
  mode = 'daily';
  set = null;
  mods = d.mods;
  ghostIn = null;
  start(tracks[d.track]);
}
// a song still coming that has run out of what has come (a stalled download: audio.js holds it): the run and its clock
// held until more has come, a word on the screen; one that cannot come at all is given up
let held = false;
song.onHold = on => {
  held = on;
  if (on && song.feed?.error) {
    toast(String(song.feed.error.message));
    stopRun();
    return menu();
  }
  if (paused) return;
  // (no presses meanwhile: their times would be read off a clock that has stopped)
  input.enabled = !on;
  if (on) {
    song.ctx?.suspend();
    toast(l10n('fetching the song…'));
  } else song.ctx?.resume();
};
// the run let go: the song, its sounds, its frames
function stopRun() {
  // (a run let go before its end: quit, retried, or another song)
  if (run && level && !run.over && run.t > 0) track('song_quit', songProps({ at: Math.round(run.t), pct: Math.round((100 * Math.min(run.t, level.A.dur)) / level.A.dur), score: run.score, miss: run.counts.miss }));
  keepAwake(false);
  haptics.stop();
  teach = null;
  coach = null;
  R.teach = null;
  song.stop();
  if (held) ((held = false), song.ctx?.resume());
  cues.reset();
  cancelAnimationFrame(raf);
  cancelCount();
}
function toMenu() {
  stopRun();
  menu();
}

// ---- the queue: the song after this one, played from the results or the pause (N)
const nextUp = () => (queue && queue.i + 1 < queue.list.length ? queue.list[queue.i + 1] : null);
function playNext() {
  const e = nextUp();
  if (!e) return;
  queue.i++;
  $('#pause').hidden = true;
  paused = false;
  stopRun();
  song.ctx?.resume();
  pick(e, mods, false);
}
// the count to the next song on the results: a ring filling round its button; any touch or key stops it
let counting2 = 0;
function countdown() {
  const b = $('#rnext'),
    t0 = performance.now(),
    T = 6000;
  b.classList.add('counting');
  const tick = () => {
    const u = (performance.now() - t0) / T;
    b.style.setProperty('--p', Math.min(1, u).toFixed(3));
    b.querySelector('.cnt').textContent = Math.ceil((1 - u) * (T / 1000));
    if (u >= 1) return ((counting2 = 0), playNext());
    counting2 = requestAnimationFrame(tick);
  };
  counting2 = requestAnimationFrame(tick);
}
function cancelCount() {
  cancelAnimationFrame(counting2);
  counting2 = 0;
  $('#rnext').classList.remove('counting');
}
for (const ev of ['pointerdown', 'keydown', 'wheel'])
  $('#result').addEventListener(ev, e => !e.target.closest?.('#rnext') && cancelCount(), { passive: true });
$('#rnext').onclick = playNext;
$('#pnext').onclick = playNext;

// the song now, on the pause and the results: its cover, title and artist, a heart, the world's hue
function nowPlaying(box) {
  if (!current) return;
  const e = { key: current.key, title: current.title, artist: current.artist, art: current.art, m: meta.song(current.key), link: current.link },
    h = box.querySelector('.np .like');
  box.querySelector('.npart').outerHTML = cover(e, 'npart');
  box.querySelector('.nptitle').textContent = current.title;
  box.querySelector('.npartist').textContent = current.artist || '';
  if (!h.firstChild) h.innerHTML = HEART;
  h.hidden = !current.key || !!teach;
  h.classList.toggle('on', lib.isLiked(current.key));
  h.onclick = () => h.classList.toggle('on', lib.toggle(e));
  box.style.setProperty('--h', Math.round(R.look?.hue ?? hueOf(e.m, e.title)));
  // (the song's link copied, a tick on the button for a moment; none for a file of the player's own)
  const ti = tracks.findIndex(x => x.file === current.key),
    url = songLink({ title: current.title, audius: current.link?.startsWith('audius:') ? current.link.slice(7) : (tracks[ti]?.audius ?? null), track: ti >= 0 ? ti : undefined, key: current.key }),
    sh = box.querySelector('.np .npshare');
  sh.hidden = !url;
  sh.classList.remove('done');
  sh.onclick = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return toast(url);
    }
    sh.classList.add('done');
    clearTimeout(sh.t);
    sh.t = setTimeout(() => sh.classList.remove('done'), 1600);
    toast(l10n('link copied'));
  };
}

// ---- tests: a run on a virtual clock (no audio), played by the bot or by nobody
async function offline(i, opts = {}) {
  const tr = tracks[i],
    ab = await fetch(`tracks/${tr.file}`).then(r => r.arrayBuffer()),
    // (a file of the player's kind, outside the game's songs, says who it is by in its tags)
    tags = opts.tags ? readTags(ab) : {},
    buf = await new OfflineAudioContext(2, 44100, 44100).decodeAudioData(ab),
    A = await analyze(buf),
    title = tags.title ?? tr.title,
    artist = tags.artist ?? tr.artist ?? '';
  current = { A, title, artist };
  level = buildLevel(A, { difficulty: opts.difficulty, place: opts.place, title, artist, lesson: !!opts.lesson });
  level.mods = opts.mods ?? [];
  // (rehearsed first as a song that is played is (start), to see that it changes nothing)
  if (opts.rehearse) await R.rehearse(new Run(level, clips));
  show('#game');
  newRun({ offset: opts.botOffset ?? 0 });
  simT = -0.5;
  // presses a second: over the whole song, and at the busiest 4 s
  const presses = level.obs.map(o => o.t),
    busiest = Math.max(0, ...presses.map(t => presses.filter(u => u >= t && u < t + 4).length)) / 4;
  return { piece: level.piece, reprise: level.acts.filter(a => a.reprise).length, ch: { ...level.ch, tools: level.ch.tools.map(q => `${q.tool}@${Math.round(q.t0)}`).join(' ') }, forks: level.forks.length, boss: level.boss && `${level.boss.name} hp${level.boss.hp}`, echo: level.obs.filter(o => o.echo).length, modes: level.acts.map(a => `${a.mode}@${Math.round(a.t0)}${a.rewrite ? '>' + level.place2 : ''}`).join(' '), place: level.place, style: level.profile.style, nps: +(presses.length / A.dur).toFixed(2), peak: busiest, bpm: A.bpm, segs: level.segs.map(s => [s.kind, +s.t0.toFixed(2), +s.t1.toFixed(2), s.dir ?? s.face, s.turn ? "T" : ""]), n: level.obs.length, at: level.obs.reduce((m, o) => ((m[o.type] ??= []).length < 3 && m[o.type].push(+o.t.toFixed(2)), m), {}), types: level.obs.reduce((m, o) => ((m[o.type] = (m[o.type] ?? 0) + 1), m), {}), mood: A.mood };
}
function stepTo(t, useBot = true, every = 2) {
  // fixed steps up to t, a frame drawn every 1/60 s of song time (as a real screen would); `every` larger skips drawing
  // to get somewhere fast (a test winding on to a moment). With the coach on (coachOn), the bot's presses go through it
  // as a player's would
  let n = 0;
  while (simT + STEP <= t + 1e-9 && !run.over) {
    simT += STEP;
    let ev = useBot ? bot.step(run, simT) : [];
    if (coach) {
      const raw = ev.map(e => (e.a === 'release' ? { a: 'release', of: [e.of], abs: true, t: e.t } : e.a === 'sync' ? e : { acts: [e.a], abs: true, t: e.t }));
      ev = resolve(coachStep(raw, simT));
    }
    run.update(simT, ev);
    if (run.undoTo !== undefined) {
      const to = run.undoTo;
      delete run.undoTo;
      run.rewind(to);
      simT = to;
      R.rewound();
    }
    // (no hit-stop offline: it holds for real milliseconds, a moment here is many frames)
    if (++n % every === 0) R.draw(run, simT, (R.holdUntil = 0));
  }
  R.holdUntil = 0;
  R.draw(run, simT);
  return { t: simT, hp: run.hp, mode: run.mode, tier: run.tier, sync: run.sync, od: run.od, counts: run.counts, score: run.score, over: run.over };
}
// (tests, ?coach=1: the coach on the offline run, as a first-timer's (or the lesson's) would be)
function coachOn(lessonToo = false) {
  teach = lessonToo ? { lesson: true } : null;
  coach = newCoach();
  R.teach = coach;
  return coach && { targets: coach.targets.map(o => ({ type: o.type, keys: o.keys, t: o.t })), zones: coach.zones.map(z => [z.pa, z.pb]) };
}

// ---- the shell's controls
$('#retry').onclick = () => play();
$('#tomenu').onclick = toMenu;
// (what a player does after a run, or from the pause: again, the next song, the songs screen)
for (const [id, a] of [['#retry', 'retry'], ['#tomenu', 'menu'], ['#rnext', 'next']]) $(id)?.addEventListener('click', () => track('after_run', { a, from: run?.over ? 'result' : 'pause', won: !!run?.over?.win }));
// songs of the player's own: picked (several at once, or a folder of them) or dropped on the songs screen (files or
// folders); one is played at once, several are kept on the device and put on the songs screen (vault.js: nothing leaves
// the browser)
const AUDIO = /\.(mp3|m4a|aac|wav|ogg|oga|flac|opus|webm)$/i;
async function addFiles(files) {
  const list = [...files].filter(f => f.type.startsWith('audio/') || AUDIO.test(f.name));
  if (!list.length) return toast(l10n('that is not a song file'));
  if (list.length === 1) {
    mode = null;
    set = null;
    mods = [];
    return start(null, list[0]);
  }
  for (const f of list) {
    const key = `file:${f.name}:${f.size}`;
    const bytes = await f.arrayBuffer(),
      tags = readTags(bytes);
    await vaultPut(key, bytes, f.name);
    meta.s.songs[key] ??= { title: tags.title ?? f.name.replace(/\.[^.]+$/, ''), artist: tags.artist ?? '', plays: 0, wins: 0, deaths: 0, best: 0, stars: 0, found: {}, tagged: true };
    lib.setCover(key, await coverURL(tags.pic));
  }
  meta.save();
  menu();
  select.tab('mine');
  toast(l10n('{n} songs added', { n: list.length }));
}
$('#raceadd').onclick = () => $('#upload').click();
$('#songsdir').onclick = () => $('#uploaddir').click();
for (const id of ['#upload', '#uploaddir'])
  $(id).onchange = e => {
    addFiles(e.target.files);
    e.target.value = '';
  };
// what was dropped, as files: a folder's songs too, at any depth (the browser hands a dropped folder over as an entry
// to walk, read a batch at a time)
async function droppedFiles(dt) {
  const entries = [...(dt.items ?? [])].map(i => i.webkitGetAsEntry?.()).filter(Boolean);
  if (!entries.length) return [...dt.files];
  const out = [],
    walk = async en => {
      if (en.isFile) out.push(await new Promise((ok, no) => en.file(ok, no)).catch(() => null));
      else if (en.isDirectory) {
        const rd = en.createReader();
        for (let batch; (batch = await new Promise((ok, no) => rd.readEntries(ok, no)).catch(() => [])).length; ) for (const e of batch) await walk(e);
      }
    };
  for (const en of entries) await walk(en);
  return out.filter(Boolean);
}
const onMenu = () => !$('#menu').hidden;
addEventListener('dragover', e => {
  if (!onMenu() || !e.dataTransfer?.types?.includes('Files')) return;
  e.preventDefault();
  document.body.classList.add('dropping');
});
addEventListener('dragleave', e => !e.relatedTarget && document.body.classList.remove('dropping'));
addEventListener('drop', e => {
  document.body.classList.remove('dropping');
  if (!onMenu() || !e.dataTransfer?.items?.length) return;
  e.preventDefault();
  droppedFiles(e.dataTransfer).then(addFiles);
});
$('#linkform').onsubmit = e => {
  e.preventDefault();
  const url = $('#link').value.trim();
  if (/^https?:\/\//i.test(url)) start(null, null, url);
};
const openSettings = bindSettings(settings, targets, menu, () => openSettings()),
  openCalibration = bindCalibration(settings, song, () => applySettings(settings, targets), menu);
$('#tosettings').onclick = () => {
  openSettings();
  show('#settings');
};
$('#tocalib').onclick = () => {
  openCalibration();
  show('#calibrate');
};
$('#tointro').onclick = () => startLesson();
$('#tomemory').onclick = () => drawMemory(meta);
$('#tologs').onclick = () => drawLogs(meta);
function startLesson() {
  queue = null;
  settings.set('learned', true);
  mode = null;
  set = null;
  mods = [];
  ghostIn = null;
  teach = { lesson: true };
  track('lesson_start');
  start(tracks[0]);
}
// bug reports (report.js): B / F8 or the BUG button; the run stands still while it is open
let pending = null;
const bugs = reportDialog({ send: (description, screenshot, marks) => sendReport({ ...pending, description, marks, screenshot: screenshot ?? pending.screenshot }) });
function openReport() {
  if (bugs.isOpen || PUBLIC) return;
  let shot = null;
  try {
    shot = cv.toDataURL('image/jpeg', 0.85);
  } catch {}
  const playing = !$('#game').hidden && run && !run.over;
  pending = {
    id: new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19),
    client: { url: location.href, userAgent: navigator.userAgent, viewport: `${innerWidth}×${innerHeight}@${devicePixelRatio}`, touch: matchMedia('(pointer: coarse)').matches, fps: log.fps(), log: log.export(), box: box.export() },
    game: gameSnapshot({ run, level, R, current, settings, simT }),
    // (to replay the run up to this moment: the song, the difficulty and every input with the step it went in on)
    replay: run && current ? { title: current.title, track: tracks.findIndex(tr => tr.title === current.title), link: current.link ?? null, difficulty: teach ? 'easy' : settings.get('difficulty'), lesson: !!teach?.lesson, mods: level?.mods ?? [], perks: level?.perks ?? [], t: simT, inputs } : null,
    screenshot: shot,
  };
  // (the pointer back while it is open: it is hidden while a song plays)
  document.body.classList.remove('playing');
  if (playing) {
    paused = true;
    song.ctx?.suspend();
    input.enabled = false;
    leaveFullScreen();
    $('#pause').hidden = true;
  }
  // (closed, sent or not, the run stays held: the pause comes back, and the player resumes it when ready)
  bugs.open(shot, () => {
    if (!playing || $('#game').hidden) return document.body.classList.toggle('playing', !$('#game').hidden);
    showPause();
  });
}
$('#bugbtn').onclick = e => {
  e.stopPropagation();
  openReport();
};
addEventListener('keydown', e => {
  // (while a report is open the keys are its own: Escape closes it, nothing reaches the game)
  if (bugs.isOpen) {
    if (e.code === 'Escape') bugs.close();
    return;
  }
  // (and while the buttons are being placed: Escape is done)
  if (padEdit.isOpen) {
    if (e.code === 'Escape') $('#pedone').click();
    return;
  }
  if ((e.code === 'KeyB' || e.code === 'F8') && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
    e.preventDefault();
    return openReport();
  }
  const screen = [...document.querySelectorAll('.screen')].find(s => !s.hidden)?.id;
  if (screen === 'menu' && document.activeElement?.id !== 'link' && (e.code === 'ArrowDown' || e.code === 'ArrowUp')) {
    const items = [...document.querySelectorAll('#songs .song')],
      i = items.indexOf(document.activeElement),
      n = items.length;
    items[i < 0 ? 0 : (i + (e.code === 'ArrowDown' ? 1 : n - 1)) % n]?.focus();
    e.preventDefault();
  } else if (screen === 'result' && e.code === 'KeyR') play();
  else if (screen === 'game' && (e.code === 'Escape' || e.code === 'KeyP')) paused ? resumeGame() : pauseGame();
  else if (screen === 'result' && e.code === 'Escape') toMenu();
  else if (screen === 'result' && e.code === 'KeyN') playNext();
  else if ((screen === 'settings' || screen === 'calibrate') && e.code === 'Escape') menu();
  else if (screen === 'menu' && e.code === 'Escape') ($('#panel').hidden = true);
});
// (the tab hidden mid-song: paused, not lost; he waits, knocking on the glass, hero.js)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && run && !run.over && !$('#game').hidden && !bugs.isOpen) pauseGame();
});
// ---- the pause: P or Esc while a song plays, its button, or the tab hidden; the song held (its audio suspended, the
// clock with it), the picture drawn on (main loop), and the card over it: resume, again, songs
function pauseGame() {
  if (paused || !run || run.over || $('#game').hidden || bugs.isOpen) return;
  paused = true;
  song.ctx?.suspend();
  leaveFullScreen();
  input.enabled = false;
  showPause();
}
// the pause's panel: the song (where it is in it, a heart), resume, again, the next song of the queue, the songs
function showPause() {
  $('#pause').hidden = false;
  $('#odbtn').hidden = true;
  haptics.stop();
  document.body.classList.remove('playing');
  nowPlaying($('#pause'));
  const dur = level?.A.dur ?? 1,
    t = Math.max(0, Math.min(dur, simT)),
    nx = set ? null : nextUp();
  $('#pause .npbar i').style.width = `${((t / dur) * 100).toFixed(1)}%`;
  $('#pause .nptime').textContent = `${mmss(t)} / ${mmss(dur)}`;
  $('#pnext').hidden = !nx;
  pauseLooks();
  $('#ppads').hidden = controls() !== 'buttons';
  $('#pqueue').textContent = nx ? l10n('next: {title}', { title: nx.title }) : '';
  $('#presume').focus({ preventScroll: true });
}
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
// back in after a count of three (a phone's thumb needs a moment to find its place again)
let counting = 0;
function resumeGame() {
  if (!paused || bugs.isOpen || counting) return;
  fullScreen();
  $('#pause').hidden = true;
  let n = 3;
  const tick = () => {
    if (!paused || !$('#pause').hidden) return ((counting = 0), ($('#count').hidden = true));
    if (n === 0) {
      counting = 0;
      $('#count').hidden = true;
      document.body.classList.add('playing');
      if (!held) song.ctx?.resume();
      paused = false;
      input.enabled = !held;
      return;
    }
    $('#count').hidden = false;
    $('#count').textContent = n--;
    counting = setTimeout(tick, 450);
  };
  tick();
}
$('#pausebtn').onclick = e => {
  e.stopPropagation();
  pauseGame();
};
$('#presume').onclick = resumeGame;
// the effects and the background, turned down from the pause (the first thing a player wants when it is too much)
const FX = [1, 0.6, 0.25, 0],
  pauseLooks = () => {
    $('#pfxv').textContent = `${Math.round(settings.get('effects') * 100)}%`;
    $('#pbgv').textContent = l10n(settings.get('plain') ? 'off' : 'on');
  };
$('#pfx').onclick = () => {
  const e = settings.get('effects'),
    i = FX.findIndex(x => x < e - 0.01);
  settings.set('effects', FX[i < 0 ? 0 : i]);
  applySettings(settings, targets);
  pauseLooks();
};
$('#pbg').onclick = () => {
  settings.set('plain', !settings.get('plain'));
  applySettings(settings, targets);
  pauseLooks();
};
// the buttons placed from the pause, over the run held behind them; the pause back after
$('#ppads').onclick = () => {
  $('#pause').hidden = true;
  padEdit.open({ sketch: false, done: () => ($('#pause').hidden = false) });
};
$('#spads').onclick = () => padEdit.open();
$('#odbtn').addEventListener('pointerdown', e => input.overdrive(e));
$('#pbug').onclick = () => {
  // (from the pause: the report opens over the run, held as it was; closing it brings the pause back)
  $('#pause').hidden = true;
  openReport();
};
// the phone turned over mid-song: paused (the picture is laid out again, the controls change with it: input.js)
let wasPortrait = innerWidth < innerHeight;
addEventListener('resize', () => {
  const p = innerWidth < innerHeight;
  if (p !== wasPortrait && run && !run.over && !$('#game').hidden) pauseGame();
  wasPortrait = p;
});
// the screen kept awake while a song plays (taken back when the page is hidden: asked again when it comes back)
let wake = null;
async function keepAwake(on) {
  try {
    if (on && !wake && navigator.wakeLock && !document.hidden) wake = await navigator.wakeLock.request('screen');
    else if (!on && wake) await wake.release();
  } catch {}
  if (!on) wake = null;
  wake?.addEventListener('release', () => (wake = null));
}
document.addEventListener('visibilitychange', () => !document.hidden && !$('#game').hidden && keepAwake(true));
// the whole screen while a song plays, on any device that lets a page have it (an iPhone's Safari does not, its
// installed app is full screen already): asked first thing on the press of play (select.js) or of resume, as it must
// be; given back on the pause and on the songs screen; and leaving it (Esc on a computer) pauses the song
// (a page's own full screen: not the browser's window made full (the window's green button, F11), which still shows its
// address bar, and which `display-mode: fullscreen` also matches; an iPhone has none at all)
const canFullScreen = !!document.documentElement.requestFullscreen;
// (turned down, it says why in the console)
let fsTried = -Infinity,
  fsAsking = false;
function fullScreen() {
  if (BOT || Q.has('probe') || document.fullscreenElement || fsAsking || !canFullScreen) return;
  fsTried = performance.now();
  fsAsking = true;
  document.documentElement.requestFullscreen({ navigationUI: 'hide' }).finally(() => (fsAsking = false)).catch(e => {
    console.warn('full screen refused:', e.name, e.message, 'enabled:', document.fullscreenEnabled, 'activation:', navigator.userActivation?.isActive);
  });
}
// (each frame of a song: not full and the player has just pressed or tapped, the browser counting it as a gesture: asked
// again; the first move made takes the screen back whatever turned the first ask down)
function keepFullScreen() {
  if (!document.fullscreenElement && canFullScreen && navigator.userActivation?.isActive && performance.now() - fsTried > 800) fullScreen();
}
// the mouse shown while it moves, hidden again a moment after it stops (index.html: .mousing), so the pause can be reached
let mouseIdle = 0;
addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  document.body.classList.add('mousing');
  clearTimeout(mouseIdle);
  mouseIdle = setTimeout(() => document.body.classList.remove('mousing'), 1500);
});
function leaveFullScreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
// (full, Esc is the game's where the browser lets a page keep it (Chromium's keyboard lock): a press pauses, a hold of
// it leaves)
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) return navigator.keyboard?.lock?.(['Escape'])?.catch?.(() => {});
  navigator.keyboard?.unlock?.();
  if (run && !run.over && !$('#game').hidden) pauseGame();
});
// the buzz in the hand (haptics.js), at the player's setting (it used to be on or off), only for a finger
const buzzLevel = () => {
  const h = settings.get('haptics');
  return !input.touch ? 'off' : h === true ? 'full' : h === false ? 'off' : h;
};
function buzz() {
  haptics.level = buzzLevel();
  if (R.fx) haptics.frame(run, simT, R.fx(Math.max(0, simT)), R.fx(Math.max(0, simT) + 0.06));
}
$('#prestart').onclick = () => {
  $('#pause').hidden = true;
  paused = false;
  song.ctx?.resume();
  play();
};
$('#retry').addEventListener('click', cancelCount);
$('#pmenu').onclick = () => {
  $('#pause').hidden = true;
  paused = false;
  song.ctx?.resume();
  toMenu();
};
// the language from the songs screen: its globe opens the languages; a pick closes them (the menu redraws itself in it)
languagePicker($('#mlang'), () => ($('#langsheet').hidden = true));
// (what the songs screen wrote itself, written again in the language now)
onLangChange(() => !$('#menu').hidden && menu());
$('#langbtn').onclick = () => ($('#langsheet').hidden = false);
$('#langx').onclick = () => ($('#langsheet').hidden = true);
$('#langsheet').onclick = e => e.target === $('#langsheet') && ($('#langsheet').hidden = true);
// the install offered from the menu: Chrome's prompt where it gives one (Android, desktop), the way to do it on an
// iPhone's Safari (it has no prompt); nothing once installed
const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
let installPrompt = null;
addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installPrompt = e;
  $('#install').hidden = false;
});
$('#install').onclick = async () => {
  installPrompt?.prompt();
  if ((await installPrompt?.userChoice)?.outcome === 'accepted') $('#install').hidden = true;
  installPrompt = null;
};
$('#iosinstall').hidden = installed || !/iPhone|iPad|iPod/.test(navigator.userAgent) || BOT;
// installable and offline where the page is secure (https or localhost); never under the tests
if ('serviceWorker' in navigator && isSecureContext && !BOT && !Q.has('probe')) {
  const reg = navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => null);
  // (a new build took over: reload into it at once, or, mid-song, on the way back to the songs screen)
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!had) return;
    if ($('#game').hidden) location.reload();
    else stale = true;
  });
  // (a tab or an installed app left open for days asks for a new build whenever it is come back to, and every half
  // hour: the browser itself looks only when the page is loaded)
  const check = () => reg.then(r => r?.update()).catch(() => {});
  document.addEventListener('visibilitychange', () => !document.hidden && check());
  setInterval(check, 30 * 60e3);
}
boot();
