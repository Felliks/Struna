// The songs screen as a rhythm game's song select (osu!, Beat Saber) crossed with a music player's library (Spotify):
// the stage of the song picked (its cover moving to its preview: preview.js, what it is, how the player did on it, a
// heart, and one big play in reach of the thumb) and the library in tabs:
//   songs   the lesson for a first-timer, the track of the day, three in a row, the game's songs, then what is popular
//           on Audius now (with its covers, credited), with a search and genres over it;
//   picks   recommended: songs on Audius the owner recommends to players (from a playlist of the songs they like: the
//           songs themselves where Audius has them, else their artists' most played; tools/recommend.mjs), most played
//           first;
//   liked   every song given a heart, anywhere (the stage, the pause, the results: library.js);
//   mine    the player's own files (their tags read for a title and a cover: tags.js), a zone to add more;
//   lists   the player's own playlists (a chip each, a + to make one);
//   recent  what was played last.
// The recommended, liked, mine and the playlists are in the player's own order if they put them so (ui/order.js: a
// grip dragged, a row held and moved, Alt or Ctrl with up or down; kept on the device by song, ↺ puts the list back as
// it came), and a song goes from them with a swipe to the left, its menu or Delete (undone for a few seconds:
// ui/sheet.js; a file of the player's own is deleted from the device only once that has passed, and only from its
// menu after a second tap or from the swipe's button). Every song has a menu (⋯ on its row and on the stage, a held
// row, a right click): its heart, its artist, its link, into a playlist, out of the list. Its artist's name opens their
// page (ui/artist.js): their songs on Audius, most played first, or the player's files of theirs, played as a tab.
// On the owner's own computer (serve.mjs answers /api/recommended) the recommended list is the game's own: its order,
// a song taken out or put in (only Audius songs: the list streams from there) is written to data/recommended.json.
// Each tab plays as a playlist: "play all" from its top, "shuffle" in a random order; a song picked and played makes the
// tab its queue too, so the results offer the next one (main.js). A tap on a song picks it and lets it be heard (unless
// the preview is turned off on the cover: remembered); a second tap on it, or the play, starts it.
// Held upright the stage is on top and the play at the bottom; held sideways and on a computer, the stage on the left.
import { MODS, modBonus } from '../mods.js';
import * as audius from '../audius.js';
import { REGIONS } from '../meta.js';
import { tr } from '../i18n.js';
import { vaultGet, vaultList } from '../vault.js';
import { coverURL, readTags } from '../tags.js';
import { vaultDel } from '../vault.js';
import { inOrder, sortable } from './order.js';
import { openMenu, closeMenu, menuOpen, undoable, settle } from './sheet.js';
import { artist as artistOf, song as audiusSong } from './artist.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
export const hueOf = (m, title) => m?.hue ?? [...String(title)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
const STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.2 6.6.7-5 4.5 1.4 6.6L12 17.2l-5.9 3.3 1.4-6.6-5-4.5 6.6-.7z"/></svg>';
const stars = n => `<span class="stars">${[0, 1, 2].map(i => STAR.replace('<svg', `<svg class="${i < n ? 'on' : ''}"`)).join('')}</span>`;
export const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.4C1.5 7.8 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.5 3.3 4.3 6.6-1.8 4.8-9.3 9.4-9.3 9.4z"/></svg>';
const SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="spk" d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="on" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/><path class="off" d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
// how hard a song is, once played (its world's mood), 1..5
const LEVEL = { chill: 1, bright: 2, dark: 3, epic: 4, hard: 5 };
const TAB_NAME = { songs: 'songs', picks: 'recommended', liked: 'liked', mine: 'mine', lists: 'playlists', recent: 'recent' };
// the tabs whose songs the player can put in their own order and take out
const OWN = new Set(['picks', 'liked', 'mine', 'lists']);
// (the icons of the menus: drawn as strokes, as the screen's others)
const ICON = {
  more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
  grip: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>',
  add: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h11M4 11h11M4 16h7M18 13v8M14 17h8"/></svg>',
  list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h12M4 11h12M4 16h7"/><circle cx="17" cy="17" r="2.5"/><path d="M19.5 17V8.5l2-1"/></svg>',
  person: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.2-4 4-6 7.5-6s6.3 2 7.5 6"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
  bin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/></svg>',
  hide: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.5-6 9-6c1.6 0 3 .5 4.2 1.2M21 12s-3.5 6-9 6c-1.6 0-3-.5-4.2-1.2"/><path d="M9.5 14.5a3.5 3.5 0 0 1 5-5M4 20L20 4"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  pen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.2 6.6.7-5 4.5 1.4 6.6L12 17.2l-5.9 3.3 1.4-6.6-5-4.5 6.6-.7z"/></svg>',
  off: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 18.5h10a4 4 0 0 0 .6-8 6 6 0 0 0-10.4-2.6M4.6 9.6A4.5 4.5 0 0 0 6.5 18.5M3 3l18 18"/></svg>',
  out: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
};
// (the owner's own computer: the page from it, or from the house's network; never the public build)
const LOCAL = /^(localhost|127(\.\d+){3}|\[::1\]|10(\.\d+){3}|192\.168(\.\d+){2}|172\.(1[6-9]|2\d|3[01])(\.\d+){2}|[\w-]+\.local)$/;
// a song's own link (to send to a friend: the game opens on it, picked): an Audius song by its id, a song of the
// game's own by its file; the title in front only to be read (?s=tuca-donka-Ab3xY); a file of the player's own has none
const slug = t => String(t ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
export function songLink(e) {
  const id = e?.audius ? e.audius : e?.track !== undefined && e.key ? `t_${e.key.replace(/\.[^.]+$/, '')}` : null;
  if (!id) return null;
  // (the page's other words in the address kept: its language, say)
  const q = new URLSearchParams(location.search);
  q.set('s', [slug(e.title), id].filter(Boolean).join('-'));
  return `${location.origin}${location.pathname}?${q}`;
}
// the id in a song link (what follows the title's last hyphen)
const linkId = s => (s ? s.slice(s.lastIndexOf('-') + 1) : null);
// a count of plays, short (12.3K, 4.5M)
const short = n => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K` : String(n));

// ---- covers: an Audius song's own art (asked once, kept on the device), a file's own (its tags), else a sun over a
// grid in the song's hue
const ART_KEY = 'sim.art',
  art = (() => {
    try {
      return JSON.parse(localStorage.getItem(ART_KEY)) ?? {};
    } catch {
      return {};
    }
  })();
async function artOf(id) {
  if (id in art) return art[id];
  try {
    const t = await audius.track(id);
    art[id] = t.art;
    localStorage.setItem(ART_KEY, JSON.stringify(art));
  } catch {
    return null;
  }
  return art[id];
}
export const cover = (e, cls) => `<span class="${cls}" style="--h:${hueOf(e.m, e.title)}${e.art ? `;background-image:url('${esc(e.art)}')` : ''}"${e.art ? ' data-art' : ''}></span>`;

// ---- the popular songs on Audius: the known artists' first (audius.KNOWN), then what is trending now across the
// genres that run well (asked once an hour)
const POP_KEY = 'sim.popular.2';
async function popular() {
  try {
    const kept = JSON.parse(sessionStorage.getItem(POP_KEY));
    if (kept && Date.now() - kept.at < 3600e3) return kept.list;
  } catch {}
  const [known, ...lists] = await Promise.all([audius.tracks(audius.KNOWN).catch(() => []), ...[null, 'Electronic', 'Drum & Bass', 'Dubstep', 'House', 'Hip-Hop/Rap', 'Pop', 'Trap'].map(g => audius.trending(g).catch(() => []))]),
    seen = new Set(known.map(t => t.id)),
    list = [...known];
  // (taken from each in turn, so no one genre fills it)
  for (let i = 0; list.length < 80 && i < 60; i++)
    for (const l of lists) {
      const t = l[i];
      if (t && !seen.has(t.id)) seen.add(t.id), list.push(t);
    }
  try {
    sessionStorage.setItem(POP_KEY, JSON.stringify({ at: Date.now(), list }));
  } catch {}
  return list;
}
// a list in a random order
const shuffled = a => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

// the songs screen; `on`: what its choices do (play a song with its queue, the lesson, the day's, a set, a file, the
// whole screen); `preview`: the player that lets a song be heard; `lib`: the likes and covers (library.js)
export function songSelect({ meta, tracks, settings, preview, lib, on }) {
  let entries = [],
    picked = null,
    raf = 0,
    // (the game opens on the recommended songs; a tab picked is kept while the page is open)
    tab = 'picks',
    // what the Audius part of the songs tab shows: the popular songs, a genre's, or a search's (its label, said in the
    // language of the moment, and its songs)
    found = { label: () => tr('popular now'), list: [] };
  const list = $('#songs'),
    stage = $('#stage'),
    library = $('.library');

  // what a song is heard from (the game's own file, Audius, or the player's file from the device)
  const urls = new Map();
  async function urlOf(e) {
    if (e.url) return e.url;
    if (!urls.has(e.key)) {
      const v = await vaultGet(e.key);
      urls.set(e.key, v ? URL.createObjectURL(new Blob([v.bytes])) : null);
    }
    return urls.get(e.key);
  }

  // ---- a song as an entry of the list, from wherever it is known
  const fromAudius = t => ({ kind: 'song', key: `link:audius:${t.id}`, title: t.title, artist: t.artist, art: t.art, dur: t.dur, m: meta.song(`link:audius:${t.id}`), url: audius.streamUrl(t.id), audius: t.id, page: t.url, link: `audius:${t.id}` });
  const fromPick = x => ({ kind: 'song', key: `link:audius:${x.id}`, title: x.title, artist: x.artist, art: x.art ?? art[x.id] ?? null, dur: x.dur, m: meta.song(`link:audius:${x.id}`), url: audius.streamUrl(x.id), audius: x.id, page: x.url, link: `audius:${x.id}`, plays: x.plays, raw: x });
  // (the recommended songs: a file of the game's, asked for once)
  let picks = [],
    byHand = false;
  fetch('data/recommended.json')
    .then(r => (r.ok ? r.json() : { list: [] }))
    .then(j => {
      picks = j.list ?? [];
      // (the list made before the bar counts it: counted first, an empty list left play all and shuffle off)
      if (tab === 'picks') (build(), rows());
      bar();
      // (a first-timer, on the tab the game opens on, nothing picked by them yet: the easiest of them picked, so play
      // starts there (before they came the stage had the game's first song))
      if (tab === 'picks' && !settings.get('learned') && !byHand && entries[0]) pick(entries[0], false);
    })
    .catch(() => {});
  const fromGame = (t, i) => ({ kind: 'song', key: t.file, title: t.title, artist: t.artist, track: i, m: meta.song(t.file), url: t.audius ? audius.streamUrl(t.audius) : `tracks/${t.file}`, audius: t.audius ?? null, art: t.audius ? art[t.audius] : null });
  function fromKey(key, known = {}) {
    const ti = tracks.findIndex(t => t.file === key);
    if (ti >= 0) return fromGame(tracks[ti], ti);
    const m = meta.song(key),
      link = m?.link ?? known.link ?? (key.startsWith('link:') ? key.slice(5) : null),
      id = link?.startsWith('audius:') ? link.slice(7) : null;
    return { kind: 'song', key, title: m?.title ?? known.title ?? key.replace(/^file:/, '').replace(/:\d+$/, '').replace(/\.[^.]+$/, ''), artist: m?.artist ?? known.artist ?? '', m, link, url: id ? audius.streamUrl(id) : null, audius: id, art: lib.cover(key) ?? (id ? art[id] : null) ?? known.art ?? null, file: key.startsWith('file:') };
  }
  // the player's own songs: their files (those kept on the device too, a run of them finished or not: vault.js), and
  // songs from links that are not Audius (Audius ones are in recent)
  let kept = [];
  // (less those the player deleted from here: ownOff)
  const ownKeys = () => [...new Set([...kept.map(v => v.key), ...Object.keys(meta.s.songs).filter(k => k.startsWith('file:') || (k.startsWith('link:') && !k.startsWith('link:audius:')))])].filter(k => !hidden('mine')[k]);
  // (a kept file the map never heard of: listed under its file name until its tags are read)
  function adopt() {
    let added = false;
    for (const v of kept)
      if (!meta.s.songs[v.key]) {
        meta.s.songs[v.key] = { title: v.name.replace(/\.[^.]+$/, ''), artist: '', plays: 0, wins: 0, deaths: 0, best: 0, stars: 0, found: {} };
        added = true;
      }
    if (added) meta.save();
  }
  async function loadKept() {
    kept = await vaultList();
    // (a song deleted from here comes back once it is added or played again)
    const off = hidden('mine');
    for (const [k, h] of Object.entries(off)) if ((h.gone && kept.some(v => v.key === k)) || (meta.s.songs[k]?.last ?? 0) > h.at) hide('mine', k, null);
    adopt();
    bar();
    if (tab !== 'mine') return;
    build();
    rows();
    for (const r of list.querySelectorAll('.row')) r.classList.toggle('on', r.dataset.key === picked?.key);
  }

  // ---- the player's own order of a tab (keys, kept in the settings) and the songs they took out of it (by key: when)
  const orders = () => settings.get('order') ?? {},
    hidden = t => settings.get('hidden')?.[t] ?? {};
  let changed = false;
  function saveOrder(t, keys) {
    const o = { ...orders() };
    if (keys) o[t] = keys;
    else delete o[t];
    settings.set('order', o);
  }
  function hide(t, key, v) {
    const h = { ...(settings.get('hidden') ?? {}) };
    h[t] = { ...(h[t] ?? {}) };
    if (v) h[t][key] = v;
    else delete h[t][key];
    settings.set('hidden', h);
  }
  // (a tab's songs in the order the player put them; whether that is not the order they came in, or some were taken out)
  function mine(t, list) {
    const out = inOrder(list, orders()[t]);
    changed = out.some((e, i) => e !== list[i]) || Object.keys(hidden(t)).length > 0;
    return out;
  }
  // the playlist shown in the playlists tab (the last one opened, else the first)
  const curList = () => lib.list(settings.get('playlist')) ?? lib.lists[0] ?? null;

  // ---- the owner's own computer: the recommended list is the game's (serve.mjs writes data/recommended.json), asked
  // once whether it answers there
  let owner = false;
  if (LOCAL.test(location.hostname) && !document.querySelector('meta[name="sim-build"][content="public"]'))
    fetch('api/recommended', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        owner = j?.owner === true;
        document.body.classList.toggle('owner', owner);
      })
      .catch(() => {});
  // (a change to the list sent, its answer the list as it is now; null when the computer did not take it)
  async function ownerSay(body) {
    try {
      const r = await fetch('api/recommended', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) return null;
      const j = await r.json();
      picks = j.list ?? picks;
      return j;
    } catch {
      return null;
    }
  }
  const isPick = e => !!e?.audius && picks.some(x => x.id === e.audius);

  // what the player has typed over their own list (cleared with another tab)
  let query = '';
  const fold = s =>
    String(s ?? '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '');
  $('#listfind').onsubmit = ev => ev.preventDefault();
  $('#listq').oninput = () => {
    query = $('#listq').value.trim();
    build();
    rows();
    bar();
  };
  function build(all = found.list) {
    changed = false;
    // (no lesson on the lists: every song teaches its moves as they come (the coach, main.js) and the recommended ones
    // start with the easiest (rec-order.mjs), so a first-timer just plays; the lesson stays behind the ? button)
    if (tab === 'picks') entries = mine('picks', picks.filter(x => !hidden('picks')[x.id]).map(fromPick));
    else if (tab === 'liked') entries = mine('liked', lib.liked.map(x => fromKey(x.key, x)));
    else if (tab === 'mine') entries = mine('mine', ownKeys().map(k => fromKey(k)));
    else if (tab === 'lists') entries = (curList()?.items ?? []).map(x => fromKey(x.key, x));
    else if (tab === 'artist') entries = artistSongs();
    else if (tab === 'recent')
      entries = Object.entries(meta.s.songs)
        .filter(([, m]) => m.last)
        .sort((a, b) => b[1].last - a[1].last)
        .slice(0, 40)
        .map(([k]) => fromKey(k));
    else {
      // (only what is popular on Audius, the known artists first: the game's own songs are in the recommended and the
      // player's lists, and the track of the day and three in a row are gone from here)
      const pop = all.filter(p => !tracks.some(t => t.audius === p.id)),
        top = found.top ? pop.filter(p => audius.KNOWN.includes(p.id)) : [];
      entries = [
        { kind: 'head', key: 'pop', title: found.label() },
        ...top.map(fromAudius),
        ...pop.filter(t => !top.includes(t)).map(fromAudius),
      ];
    }
    // (a search of the player's own list: every word typed in its title or its artist, letters with or without their
    // accents, ё as е)
    // and under it what matches in the player's other lists (liked, mine, every playlist, the recommended, recent), each
    // song once
    if (query && tab !== 'songs') {
      const words = fold(query).split(/\s+/).filter(Boolean),
        // (all a song has: its title and artist, its file's name or its link, the album it came from, the player's
        // playlists it is in, and what the game made of it once played: its world, mood, diagnosis, boss, lens, sector)
        hay = e => {
          const m = e.m ?? {};
          return fold(
            [e.title, e.artist, e.key.replace(/^(file|link):/, ''), e.link, e.page, e.raw?.from, m.place, m.style, m.sign, m.boss, m.lens, m.sector, ...lib.lists.filter(l => l.items.some(x => x.key === e.key)).map(l => l.name)]
              .filter(Boolean)
              .join(' '),
          );
        },
        hit = e => e.kind === 'song' && words.every(w => hay(e).includes(w));
      entries = entries.filter(e => e.kind !== 'song' || hit(e));
      const seen = new Set(entries.map(e => e.key)),
        recent = Object.entries(meta.s.songs)
          .filter(([, m]) => m.last)
          .map(([k]) => fromKey(k)),
        more = [...lib.liked.map(x => fromKey(x.key, x)), ...ownKeys().map(k => fromKey(k)), ...lib.lists.flatMap(l => l.items.map(x => fromKey(x.key, x))), ...picks.map(fromPick), ...recent].filter(e => hit(e) && !seen.has(e.key) && seen.add(e.key));
      if (more.length) entries = [...entries, { kind: 'head', key: 'elsewhere', title: tr('in your other lists') }, ...more];
    }
    for (const e of entries) if (e.audius && !e.art && art[e.audius]) e.art = art[e.audius];
  }
  // the songs of the tab now that can be played one after another
  const songs = () => entries.filter(e => e.kind === 'song');

  const badge = e => {
    if (e.kind === 'lesson') return '<i class="ico learn">▶</i>';
    if (e.kind === 'daily') return '<i class="ico sun"></i>';
    if (e.kind === 'set') return '<i class="ico three"></i>';
    return '';
  };
  const EMPTY = { liked: 'tap ♥ on a song to keep it here', mine: 'your songs show up here', recent: 'the songs you play show up here', lists: 'tap ⋯ on a song to add it here' };
  // the rows drawn afresh; `keep`: where the list was scrolled kept, and no rows flying in (a song moved or taken out)
  function rows(keep = false) {
    const at = list.scrollTop,
      own = OWN.has(tab) && !query;
    sorter.reset();
    const out = entries.map((e, n) => {
      if (e.kind === 'head') {
        const h = document.createElement('div'),
          p = document.createElement('p');
        h.className = 'rowhead';
        p.textContent = e.title;
        // (the genres sit at the heading of the popular songs: where they change what is under them)
        h.append(p, ...(e.key === 'pop' ? [chips] : []));
        return h;
      }
      const b = document.createElement('div');
      b.className = `row ${e.kind}`;
      b.dataset.key = e.key;
      b.tabIndex = 0;
      b.setAttribute('role', 'option');
      b.style.setProperty('--n', Math.min(n, 14));
      b.entry = e;
      const right = (e.plays ? `<span class="plays">▶ ${short(e.plays)}</span>` : '') + (e.m?.stars ? stars(e.m.stars) : e.kind === 'song' && !e.m && !e.plays ? '<span class="new">✦</span>' : ''),
        heart = e.kind === 'song' ? `<button class="heart${lib.isLiked(e.key) ? ' on' : ''}" aria-label="${esc(tr('like'))}">${HEART}</button>` : '';
      const grip = own ? `<span class="grip" title="${esc(tr('drag to move'))}" aria-hidden="true">${ICON.grip}</span>` : '',
        more = e.kind === 'song' ? `<button class="more" aria-label="${esc(tr('more'))}" aria-haspopup="menu">${ICON.more}</button>` : '';
      b.innerHTML = `${grip}${badge(e) || cover(e, 'thumb')}<span class="txt"><b>${esc(e.title)}</b><small>${esc(e.artist)}</small></span><span class="eq"><s></s><s></s><s></s></span>${right}${heart}${more}`;
      // (the row's song as the tab has it now: kept on the row, so a new order need not draw the rows again)
      b.onclick = ev => {
        const e = b.entry;
        if (ev.target.closest('.heart')) return like(e);
        if (ev.target.closest('.more')) return songMenu(e, { anchor: ev.target.closest('.more') });
        picked === e ? go() : pick(e, true);
      };
      return b;
    });
    if (!out.length) {
      const p = document.createElement('p');
      p.className = 'empty';
      // (the playlists tab with none yet: its + says it all; an artist still asked for: nothing said yet)
      p.textContent = query ? tr('nothing found') : tab === 'lists' && !lib.lists.length ? '' : tab === 'artist' && artistView?.busy ? '' : tab === 'artist' && artistView?.err ? tr('Audius did not answer') : tr(EMPTY[tab] ?? 'nothing found');
      out.push(p);
    }
    list.classList.toggle('calm', keep);
    list.classList.toggle('sortable', own);
    list.replaceChildren(...out);
    list.scrollTop = keep ? at : 0;
    // (an Audius song's cover asked for as its row comes)
    for (const e of entries)
      if (e.audius && !e.art)
        artOf(e.audius).then(a => {
          if (!a) return;
          e.art = a;
          const r = list.querySelector(`[data-key="${CSS.escape(e.key)}"] .thumb`);
          if (r) Object.assign(r.style, { backgroundImage: `url('${a}')` }), r.setAttribute('data-art', '');
          if (picked === e) drawStage();
        });
  }
  // the tab's bar: its name and count, play all and shuffle
  function bar() {
    for (const b of $('#tabs').children) {
      const k = b.dataset.tab,
        n = k === 'liked' ? lib.liked.length : k === 'mine' ? ownKeys().length : k === 'picks' ? picks.filter(x => !hidden('picks')[x.id]).length : k === 'lists' ? lib.lists.length : 0;
      b.classList.toggle('on', k === tab);
      b.setAttribute('aria-selected', k === tab);
      b.querySelector('span').textContent = tr(TAB_NAME[k]);
      b.querySelector('small').textContent = n || '';
    }
    library.dataset.tab = tab;
    const n = songs().length;
    $('#playall').disabled = $('#shuffle').disabled = !n;
    // (no count over the popular songs: a count of whatever Audius answered says nothing)
    $('#listcount').textContent = n && tab !== 'songs' ? tr('{n} songs', { n }) : '';
    // (↺ only where the player changed the list)
    $('#listreset').hidden = !(OWN.has(tab) && tab !== 'lists' && changed);
    if (tab === 'lists') drawLists();
    if (tab === 'artist') drawArtist();
  }
  function setTab(k) {
    if (k === tab) return;
    if (tab === 'artist') leaveArtist(true);
    tab = k;
    query = $('#listq').value = '';
    build();
    rows();
    bar();
    // (the stage keeps the song it had: a tab is only another way to look)
    for (const r of list.querySelectorAll('.row')) r.classList.toggle('on', r.dataset.key === picked?.key);
    if (tab === 'mine') backfill();
  }
  $('#tabs').onclick = ev => {
    const b = ev.target.closest('[data-tab]');
    if (b) setTab(b.dataset.tab);
  };
  // the tab as a playlist: from its top, or shuffled; heard one after the other, the next one coming by itself
  $('#playall').onclick = () => playList(songs(), false);
  $('#shuffle').onclick = () => playList(shuffled(songs()), true);
  // (what the queue is called: the tab, the playlist, the artist)
  const tabName = () => (tab === 'artist' ? artistView?.name : tab === 'lists' ? curList()?.name : null) ?? tr(TAB_NAME[tab]);
  function playList(list, shuffle) {
    if (!list.length) return;
    on.full?.();
    preview.stop();
    on.play(list[0], [...mods], { list, i: 0, auto: true, shuffle, name: tabName() });
  }

  // ---- likes: the heart on a row and on the stage; any like anywhere redraws what shows it
  function like(e) {
    lib.toggle(e);
  }
  // (still: a song taken out here folds its row away first)
  let still = false;
  lib.onChange(key => {
    for (const h of list.querySelectorAll(`[data-key="${CSS.escape(key)}"] .heart`)) h.classList.toggle('on', lib.isLiked(key));
    if (picked?.key === key) stage.querySelector('.like').classList.toggle('on', lib.isLiked(key));
    if (tab === 'liked' && !$('#menu').hidden && !still) (build(), rows(true), mark());
    bar();
  });

  // ---- the player's own files: their tags read once (a title, an artist, a cover), the rows redrawn as they come
  let filling = false;
  async function backfill() {
    if (filling) return;
    filling = true;
    for (const key of ownKeys().filter(k => k.startsWith('file:') && !meta.s.songs[k].tagged)) {
      const v = await vaultGet(key),
        m = meta.s.songs[key];
      m.tagged = true;
      if (!v) continue;
      const t = readTags(v.bytes);
      if (t.title) m.title = t.title;
      if (t.artist) m.artist = t.artist;
      lib.setCover(key, await coverURL(t.pic));
      meta.save();
      const e = entries.find(x => x.key === key);
      if (!e) continue;
      Object.assign(e, { title: m.title, artist: m.artist, art: lib.cover(key) });
      const r = list.querySelector(`[data-key="${CSS.escape(key)}"]`);
      if (r) {
        r.querySelector('.txt b').textContent = e.title;
        r.querySelector('.txt small').textContent = e.artist;
        r.querySelector('.thumb').outerHTML = cover(e, 'thumb');
      }
      if (picked === e) drawStage();
    }
    filling = false;
  }

  // the Audius part of the songs tab: `load()` its songs, `label()` its heading; the list redrawn when they come (the
  // newest ask wins), the song picked kept picked
  let asked = 0;
  async function show(load, label) {
    const n = ++asked;
    found = { label, list: found.list };
    $('#songsfind').classList.add('busy');
    let got = [];
    try {
      got = await load();
    } catch {
      got = [];
    }
    if (n !== asked) return;
    $('#songsfind').classList.remove('busy');
    found = { label: got.length ? label : () => tr('nothing found'), list: got, top: load === popular };
    if (tab !== 'songs') return;
    const keep = picked?.key,
      at = list.scrollTop;
    build();
    rows();
    bar();
    list.scrollTop = at;
    const e = entries.find(x => x.key === keep);
    if (e) picked = e;
    for (const r of list.querySelectorAll('.row')) r.classList.toggle('on', r.dataset.key === keep);
  }
  // the search, the genres, a file
  const chips = $('#songsgenres'),
    named = g => () => (g ? tr(g) : tr('popular now'));
  chips.replaceChildren(
    ...[null, ...audius.GENRES].map(g => {
      const b = document.createElement('button');
      b.label = named(g);
      b.onclick = () => {
        chips.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        show(g ? () => audius.trending(g) : popular, b.label);
      };
      return b;
    }),
  );
  chips.firstChild.classList.add('on');
  $('#songsfind').onsubmit = ev => {
    ev.preventDefault();
    const q = $('#songsq').value.trim();
    if (!q) return;
    chips.querySelectorAll('button').forEach(x => x.classList.remove('on'));
    show(() => audius.search(q), () => `⌕ ${q}`);
    // (the answer lands under the game's songs: scrolled to)
    setTimeout(() => list.querySelector('.rowhead')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 600);
  };
  $('#songsadd').onclick = () => on.add();
  // the modifiers for a song of one's choice (harder, more points: mods.js), kept for the next songs
  const mods = new Set((meta.s.lastMods ?? []).filter(k => MODS[k])),
    modBox = $('#stagemods');
  function drawMods() {
    modBox.replaceChildren(
      ...Object.entries(MODS).map(([k, d]) => {
        const b = document.createElement('button');
        b.className = mods.has(k) ? 'on' : '';
        b.title = tr(d.hint);
        b.innerHTML = `${esc(tr(d.name))}<small>+${Math.round(d.bonus * 100)}%</small>`;
        b.onclick = () => {
          mods.has(k) ? mods.delete(k) : mods.add(k);
          meta.s.lastMods = [...mods];
          meta.save();
          drawMods();
        };
        return b;
      }),
    );
    stage.querySelector('.go .mult').textContent = picked?.kind === 'song' && mods.size ? `×${modBonus([...mods]).toFixed(2)}` : '';
  }
  function go() {
    if (!picked) return;
    // (the whole screen asked for first thing on the press, before anything else is started: as its own button does)
    on.full?.();
    preview.stop();
    if (picked.kind === 'lesson') on.lesson();
    else if (picked.kind === 'daily') on.daily();
    else if (picked.kind === 'set') on.set();
    else {
      // (the tab is the queue: the results offer the song after this one)
      const list = songs(),
        i = Math.max(0, list.indexOf(picked));
      on.play(picked, [...mods], { list: list.length ? list : [picked], i, auto: false, name: tabName() });
    }
  }

  function drawStage() {
    const e = picked;
    if (!e) return;
    const m = e.m,
      lvl = LEVEL[m?.style] ?? 0,
      col = REGIONS[m?.style]?.col ?? '#8a90ad',
      facts = [];
    if (e.kind === 'song') {
      facts.push(lvl ? `<span class="fact energy" style="--c:${col}"><i></i><i></i><span class="bars">${[1, 2, 3, 4, 5].map(k => `<s class="${k <= lvl ? 'on' : ''}"></s>`).join('')}</span></span>` : `<span class="fact sleepy"><i></i><i></i></span>`);
      if (m?.stars) facts.push(`<span class="fact">${stars(m.stars)}</span>`);
      if (m?.best) facts.push(`<span class="fact best">🏆 ${m.best.toLocaleString('en-US')}</span>`);
      if (e.dur) facts.push(`<span class="fact">⏱ ${mmss(e.dur)}</span>`);
      if (e.plays) facts.push(`<span class="fact">▶ ${short(e.plays)}</span>`);
    } else if (e.sub) facts.push(`<span class="fact">${esc(e.sub)}</span>`);
    const audible = e.kind !== 'set';
    stage.querySelector('.art').outerHTML = `<div class="art ${e.kind}">${badge(e) ? `<span class="bigico">${badge(e)}</span>` : cover(e, 'img')}<canvas class="vis"></canvas>${audible ? `<button class="pv${settings.get('preview') ? '' : ' off'}" aria-label="${esc(tr('preview'))}">${SOUND}</button>` : ''}</div>`;
    stage.querySelector('.title').textContent = e.title;
    // (the artist's name opens their page: a song's, with a name)
    const who = stage.querySelector('.artist');
    who.textContent = e.artist;
    who.disabled = e.kind !== 'song' || !e.artist;
    stage.querySelector('.more').hidden = stage.querySelector('.add').hidden = e.kind !== 'song';
    stage.querySelector('.facts').innerHTML = facts.join('');
    stage.querySelector('.credit').hidden = !e.audius;
    stage.querySelector('.share').hidden = !songLink(e);
    const lk = stage.querySelector('.like');
    lk.hidden = e.kind !== 'song';
    lk.classList.toggle('on', lib.isLiked(e.key));
    // (the lesson for a first-timer, with a way out for one who has played before on another device)
    stage.querySelector('.skip').hidden = e.kind !== 'lesson';
    modBox.hidden = e.kind !== 'song';
    drawMods();
    if (e.audius) Object.assign(stage.querySelector('.credit'), { href: e.page ?? `https://audius.co/search?query=${encodeURIComponent(`${e.artist} ${e.title}`)}`, textContent: `♪ ${e.artist} · Audius` });
    stage.style.setProperty('--h', hueOf(m, e.title));
    stage.querySelector('.pv')?.addEventListener('click', togglePreview);
  }
  stage.querySelector('.like').onclick = () => picked && like(picked);
  stage.querySelector('.artist').onclick = () => picked?.kind === 'song' && openArtist(picked);
  stage.querySelector('.more').onclick = ev => picked && songMenu(picked, { anchor: ev.currentTarget });
  stage.querySelector('.add').onclick = ev => picked && songMenu(picked, { anchor: ev.currentTarget, only: 'add' });
  // the song's link copied (a tick on the button for a moment)
  stage.querySelector('.share').onclick = async () => {
    const url = songLink(picked),
      b = stage.querySelector('.share');
    if (!url) return;
    // (copied first; the phone's share sheet only where the clipboard is refused)
    try {
      await navigator.clipboard.writeText(url);
      b.classList.add('done');
      setTimeout(() => b.classList.remove('done'), 1600);
    } catch {
      navigator.share?.({ title: `${picked.title} — Struna`, text: tr('play “{title}” as a level', { title: picked.title }), url }).catch(() => {});
    }
  };
  // a song link the page was opened with (?s=...): that song, picked on the stage, as soon as it is known
  const wanted = linkId(new URLSearchParams(location.search).get('s'));
  async function opened() {
    if (!wanted) return null;
    if (wanted.startsWith('t_')) {
      const i = tracks.findIndex(t => t.file.replace(/\.[^.]+$/, '') === wanted.slice(2));
      return i >= 0 ? fromGame(tracks[i], i) : null;
    }
    const i = tracks.findIndex(t => t.audius === wanted);
    if (i >= 0) return fromGame(tracks[i], i);
    try {
      return fromAudius(await audius.track(wanted));
    } catch {
      return null;
    }
  }
  let openedOnce = false;
  stage.querySelector('.skip').onclick = () => {
    settings.set('learned', true);
    // (and the coach that stops a song at a move met for the first time: off)
    settings.set('taught', 'all');
    const keep = picked;
    build();
    rows();
    bar();
    pick(entries.find(x => x.kind === 'song') ?? entries[0], false);
    if (keep?.kind === 'lesson') list.querySelector('.row.on')?.focus({ preventScroll: true });
  };
  // the preview turned off (and kept off) or back on, from the cover
  function togglePreview(ev) {
    ev.stopPropagation();
    const now = !settings.get('preview');
    settings.set('preview', now);
    stage.querySelector('.pv')?.classList.toggle('off', !now);
    if (!now) preview.stop();
    else if (picked) listen(picked);
  }
  async function listen(e) {
    const url = await urlOf(e);
    if (picked === e && url && settings.get('preview')) preview.play(url, settings.get('music'));
    else if (!url) preview.stop();
  }

  function pick(e, hear) {
    picked = e;
    // (what is known of it ahead fetched meanwhile, if it is played: main.js)
    on.near?.(e);
    // (picked by the player's own hand, a tap or a key: not overridden when the recommended songs come in)
    if (hear !== false) byHand = true;
    settings.set('lastPick', e.key);
    // (the address bar is the song's link while it is picked: copied from there, it opens on it)
    try {
      if (!$('#menu').hidden && location.protocol.startsWith('http')) {
        const q = new URLSearchParams(location.search);
        q.delete('s');
        history.replaceState(null, '', songLink(e) ?? `${location.pathname}${q.size ? `?${q}` : ''}`);
      }
    } catch {}
    for (const r of list.querySelectorAll('.row')) r.classList.toggle('on', r.dataset.key === e.key);
    drawStage();
    list.querySelector('.row.on')?.scrollIntoView({ block: 'nearest' });
    if (!hear) return;
    if (settings.get('preview') && e.kind !== 'set') listen(e);
    else preview.stop();
  }

  // the stage moving to what is heard: its cover swelling on the low end, bars round it from the spectrum
  function frame() {
    raf = requestAnimationFrame(frame);
    const vis = stage.querySelector('.vis');
    if (!vis) return;
    const lv = preview.level(),
      d = preview.bands(),
      w = vis.clientWidth,
      h = vis.clientHeight,
      dpr = Math.min(2, devicePixelRatio || 1);
    stage.style.setProperty('--pulse', lv.toFixed(3));
    if (vis.width !== Math.round(w * dpr)) Object.assign(vis, { width: Math.round(w * dpr), height: Math.round(h * dpr) });
    const g = vis.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    if (!d) return;
    const n = 48,
      bw = w / n;
    g.fillStyle = `hsl(${hueOf(picked?.m, picked?.title)} 100% 70% / 0.9)`;
    for (let i = 0; i < n; i++) {
      const v = d[Math.floor(2 + i * 1.6)] / 255,
        bh = Math.max(2, v * v * h * 0.45);
      g.fillRect(i * bw + 1, h - bh, bw - 2, bh);
    }
  }
  preview.onChange(url => {
    list.querySelectorAll('.row').forEach(r => r.classList.toggle('playing', !!url && r.classList.contains('on')));
    stage.classList.toggle('hearing', !!url);
  });

  // ---- a song's menu: its heart, its artist, its link, out of this list; into a playlist (or the owner's list)
  const rowOf = e => list.querySelector(`.row[data-key="${CSS.escape(e.key)}"]`);
  const mark = () => {
    for (const r of list.querySelectorAll('.row')) r.classList.toggle('on', r.dataset.key === picked?.key);
  };
  // (how a song leaves the tab: hidden from the recommended (or out of the game's list, on the owner's computer),
  // its heart let go, out of the playlist, its file deleted from the device)
  const canRemove = e => OWN.has(tab) && entries.includes(e) && (tab !== 'lists' || !!curList());
  const removeWord = () => (tab === 'picks' ? (owner ? 'remove for everyone' : 'hide') : tab === 'mine' ? 'delete from this device' : 'remove');
  function songMenu(e, { anchor, x, y, only } = {}) {
    if (e.kind !== 'song') return;
    openMenu({
      anchor,
      x,
      y,
      cls: only ? 'addonly' : '',
      fill(el) {
        const head = document.createElement('div');
        head.className = 'mhead';
        head.innerHTML = `${cover(e, 'mthumb')}<span class="mt"><b>${esc(e.title)}</b><small>${esc(e.artist)}</small></span>`;
        const acts = document.createElement('div');
        acts.className = 'macts';
        const act = (cls, icon, word, f, on) => {
          const b = document.createElement('button');
          b.className = `mact ${cls}${on ? ' on' : ''}`;
          b.innerHTML = `<i>${icon}</i><span>${esc(tr(word))}</span>`;
          b.onclick = () => f(b);
          acts.append(b);
          return b;
        };
        act('mlike', HEART, 'like', b => b.classList.toggle('on', lib.toggle(e)), lib.isLiked(e.key));
        if (e.artist && !(tab === 'artist' && artistView?.name === e.artist)) act('who', ICON.person, 'artist', () => openArtist(e));
        if (songLink(e))
          act('send', ICON.share, 'share the song', async b => {
            try {
              await navigator.clipboard.writeText(songLink(e));
              b.classList.add('done');
              setTimeout(closeMenu, 500);
            } catch {
              navigator.share?.({ title: `${e.title} — Struna`, url: songLink(e) }).catch(() => {});
            }
          });
        if (canRemove(e))
          act('rm', tab === 'picks' && !owner ? ICON.hide : ICON.bin, removeWord(), b => {
            // (a file deleted from the device: asked twice, the second tap within a few seconds)
            if (tab === 'mine' && !b.classList.contains('armed')) {
              b.classList.add('armed');
              b.querySelector('span').textContent = tr('delete?');
              return setTimeout(() => b.classList.remove('armed'), 3000);
            }
            closeMenu();
            removeSong(e);
          });
        const add = document.createElement('div');
        add.className = 'madd';
        add.innerHTML = `<p class="mh">${ICON.add}<span>${esc(tr('add to playlist'))}</span></p>`;
        const item = (icon, name, on, f, off, cls = '') => {
          const b = document.createElement('button');
          b.className = `mrow ${cls}${on ? ' on' : ''}`;
          b.setAttribute('role', 'menuitemcheckbox');
          b.setAttribute('aria-checked', !!on);
          b.innerHTML = `<i>${icon}</i><span>${esc(name)}</span><em>${off ? ICON.off : ICON.check}</em>`;
          if (off) (b.disabled = true), (b.title = off);
          b.onclick = async () => {
            const now = await f();
            b.classList.toggle('on', now);
            b.setAttribute('aria-checked', now);
          };
          return b;
        };
        for (const l of lib.lists)
          add.append(
            item(ICON.list, l.name, lib.inList(l.id, e.key), () => {
              if (lib.inList(l.id, e.key)) lib.takeFrom(l.id, e.key);
              else lib.addTo(l.id, e);
              if (tab === 'lists' && curList()?.id === l.id) refresh();
              bar();
              return lib.inList(l.id, e.key);
            }),
          );
        // (a new one, named on the spot: Enter or the tick makes it, with the song in it)
        const make = document.createElement('button');
        make.className = 'mrow new';
        make.innerHTML = `<i>${ICON.plus}</i><span>${esc(tr('new playlist'))}</span>`;
        make.onclick = () =>
          nameBox(make, '', name => {
            const l = lib.makeList(name);
            lib.addTo(l.id, e);
            bar();
            const b = item(ICON.list, l.name, true, () => {
              if (lib.inList(l.id, e.key)) lib.takeFrom(l.id, e.key);
              else lib.addTo(l.id, e);
              if (tab === 'lists') refresh();
              return lib.inList(l.id, e.key);
            });
            add.insertBefore(b, add.querySelector('.mrow.new'));
            b.focus();
            if (tab === 'lists') refresh();
          });
        add.append(make);
        // (the owner's: the game's own list, for every player; only a song Audius streams can be in it)
        if (owner)
          add.append(
            item(ICON.star, tr('recommended (for everyone)'), isPick(e), () => ownerToggle(e), e.audius ? null : tr('only songs from Audius can be recommended'), 'rec'),
          );
        if (only) el.append(head, add);
        else el.append(head, acts, add);
        head.querySelector('small').onclick = () => e.artist && openArtist(e);
      },
    });
  }
  // a name typed in place of a menu's button (a new playlist's, a playlist renamed)
  function nameBox(b, value, done) {
    const f = document.createElement('form');
    f.className = 'mrow name';
    f.innerHTML = `<i>${ICON.pen}</i><input maxlength="40" enterkeyhint="done" /><button aria-label="ok">${ICON.check}</button>`;
    const inp = f.querySelector('input');
    inp.value = value || tr('playlist {n}', { n: lib.lists.length + 1 });
    inp.setAttribute('aria-label', tr('new playlist'));
    f.onsubmit = ev => {
      ev.preventDefault();
      const name = inp.value.trim();
      if (!name) return;
      f.replaceWith(b);
      done(name);
    };
    b.replaceWith(f);
    inp.focus();
    inp.select();
  }
  // the owner's list: a song in or out of it for every player (the computer's answer, its state after)
  async function ownerToggle(e) {
    if (!owner || !e.audius) return isPick(e);
    if (isPick(e)) await ownerSay({ op: 'remove', id: e.audius });
    else {
      // (the fields the list keeps, from Audius when the song came without them)
      let x = e.raw;
      if (!x || x.plays === undefined) x = await audiusSong(e.audius).catch(() => null);
      if (!x) return false;
      const { id, title, artist, art, dur, url, plays } = x;
      await ownerSay({ op: 'add', entry: { id, title, artist, art, dur, url, plays, why: 'owner', from: 'owner' } });
    }
    if (tab === 'picks') refresh();
    bar();
    return isPick(e);
  }
  // the tab drawn again where it was (a song moved, out or back)
  function refresh() {
    build();
    rows(true);
    bar();
    mark();
  }
  // a song out of the tab, its row folding away, with an undo
  function removeSong(e) {
    if (!canRemove(e)) return;
    const t = tab,
      row = rowOf(e),
      l = curList();
    let back,
      done = () => {};
    if (t === 'picks' && owner) {
      const at = picks.findIndex(x => x.id === e.audius),
        x = picks[at];
      ownerSay({ op: 'remove', id: e.audius }).then(() => tab === t && refresh());
      back = () => ownerSay({ op: 'add', entry: x, at }).then(() => tab === t && refresh());
    } else if (t === 'picks') {
      hide('picks', e.audius, Date.now());
      back = () => hide('picks', e.audius, null);
    } else if (t === 'liked') {
      const at = lib.liked.findIndex(x => x.key === e.key),
        x = lib.likedItem(e.key);
      still = true;
      lib.toggle(e);
      still = false;
      back = () => lib.restore(x, at);
    } else if (t === 'mine') {
      hide('mine', e.key, { at: Date.now() });
      back = () => hide('mine', e.key, null);
      // (the file itself let go once the undo has gone)
      done = () => {
        if (!hidden('mine')[e.key]) return;
        hide('mine', e.key, { at: Date.now(), gone: true });
        if (e.key.startsWith('file:')) vaultDel(e.key);
      };
    } else if (t === 'lists') {
      const was = lib.takeFrom(l.id, e.key);
      back = () => was && lib.addTo(l.id, was.item, was.i);
    }
    const after = () => tab === t && (t !== 'lists' || curList() === l) && refresh();
    if (row) {
      row.style.height = `${row.offsetHeight}px`;
      void row.offsetHeight;
      row.classList.add('gone');
      setTimeout(after, 200);
    } else after();
    undoable(tr(t === 'picks' && !owner ? 'hidden' : 'removed'), () => (back(), after(), bar()), done);
  }
  // the song picked one place up or down (the keys)
  function moveBy(d) {
    const i = entries.indexOf(picked),
      j = i + d;
    if (!OWN.has(tab) || i < 0 || j < 0 || j >= entries.length) return;
    const row = rowOf(picked),
      other = rowOf(entries[j]);
    [entries[i], entries[j]] = [entries[j], entries[i]];
    list.classList.add('calm');
    if (row && other) list.insertBefore(row, d > 0 ? other.nextSibling : other);
    row?.classList.remove('nudge');
    void row?.offsetWidth;
    row?.classList.add('nudge');
    row?.focus({ preventScroll: true });
    row?.scrollIntoView({ block: 'nearest' });
    ordered(picked);
  }
  // the tab's new order kept (a playlist's in itself; on the owner's computer the recommended for everyone)
  function ordered(e) {
    const keys = entries.map(x => x.key);
    if (tab === 'lists') lib.orderList(curList()?.id, keys);
    else saveOrder(tab, keys);
    if (tab === 'picks' && owner)
      ownerSay({ op: 'order', ids: entries.map(x => x.audius), moved: [e.audius] }).then(j => {
        // (the game's list is in that order now: nothing of the player's own left over it)
        if (j && tab === 'picks') saveOrder('picks', null), relink();
      });
    relink();
  }
  // (the tab's songs taken again in the order now kept, the rows as they are given theirs: no row drawn again)
  function relink() {
    build();
    const by = new Map(entries.map(x => [x.key, x]));
    for (const r of list.querySelectorAll('.row')) r.entry = by.get(r.dataset.key) ?? r.entry;
    if (picked && by.has(picked.key)) picked = by.get(picked.key);
    bar();
  }
  const sorter = sortable(list, {
    sort: () => OWN.has(tab) && entries.length > 1,
    remove: row => !!row.entry && canRemove(row.entry),
    full: () => tab !== 'mine',
    label: () => tr(removeWord()),
    move(from, to) {
      const [e] = entries.splice(from, 1);
      entries.splice(to, 0, e);
      ordered(e);
    },
    menu: (row, x, y) => row.entry && songMenu(row.entry, { x, y }),
    swipe: row => row.entry && removeSong(row.entry),
  });
  // ↺: the tab back as it came (its order, the songs hidden from it), with an undo
  $('#listreset').onclick = () => {
    const t = tab,
      o = orders()[t],
      h = hidden(t);
    saveOrder(t, null);
    const all = { ...(settings.get('hidden') ?? {}) };
    // (a file deleted for good stays deleted)
    all[t] = t === 'mine' ? Object.fromEntries(Object.entries(h).filter(([, v]) => v.gone)) : {};
    settings.set('hidden', all);
    refresh();
    undoable(tr('order reset'), () => {
      saveOrder(t, o);
      settings.set('hidden', { ...(settings.get('hidden') ?? {}), [t]: h });
      if (tab === t) refresh();
    });
  };

  // ---- the playlists tab: a chip each (a tap opens it; on the one open, its menu: renamed, deleted), + makes one
  const listChips = $('#plists');
  function drawLists() {
    const cur = curList(),
      chip = (l, on) => {
        const b = document.createElement('button');
        b.className = on ? 'on' : '';
        b.innerHTML = `${esc(l.name)}<small>${l.items.length || ''}</small>`;
        b.onclick = () => {
          if (on) return listMenu(l, b);
          settings.set('playlist', l.id);
          build();
          rows();
          bar();
          mark();
        };
        b.oncontextmenu = ev => (ev.preventDefault(), listMenu(l, b));
        return b;
      },
      plus = document.createElement('button');
    plus.className = 'plus';
    plus.setAttribute('aria-label', tr('new playlist'));
    // (with no playlist yet the + says what it makes)
    plus.innerHTML = ICON.plus + (lib.lists.length ? '' : `<span>${esc(tr('new playlist'))}</span>`);
    plus.onclick = () =>
      openMenu({
        anchor: plus,
        fill(el) {
          const b = document.createElement('button');
          el.append(b);
          nameBox(b, '', name => {
            const l = lib.makeList(name);
            settings.set('playlist', l.id);
            closeMenu();
            build();
            rows();
            bar();
          });
        },
      });
    listChips.replaceChildren(plus, ...lib.lists.map(l => chip(l, l === cur)));
    if (cur) listChips.children[lib.lists.indexOf(cur) + 1]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }
  function listMenu(l, anchor) {
    openMenu({
      anchor,
      fill(el) {
        const ren = document.createElement('button'),
          del = document.createElement('button');
        ren.className = 'mrow';
        ren.innerHTML = `<i>${ICON.pen}</i><span>${esc(tr('rename'))}</span>`;
        ren.onclick = () =>
          nameBox(ren, l.name, name => {
            lib.renameList(l.id, name);
            closeMenu();
            bar();
          });
        del.className = 'mrow rm';
        del.innerHTML = `<i>${ICON.bin}</i><span>${esc(tr('delete playlist'))}</span>`;
        del.onclick = () => {
          closeMenu();
          const was = lib.dropList(l.id);
          refresh();
          undoable(tr('playlist deleted'), () => {
            lib.putList(was.l, was.i);
            settings.set('playlist', was.l.id);
            if (tab === 'lists') refresh();
          });
        };
        el.append(ren, del);
      },
    });
  }

  // ---- an artist's page: their songs as a tab of their own, the way back to the tab the player came from (its
  // button, Escape, the phone's back)
  let artistView = null,
    pushed = false,
    popping = false;
  const same = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
  function artistSongs() {
    const v = artistView;
    if (!v) return [];
    // (theirs on the device and among the game's first: the player's files of theirs, the game's songs, their liked)
    const local = [...tracks.map(fromGame), ...ownKeys().map(k => fromKey(k)), ...lib.liked.map(x => fromKey(x.key, x))].filter(e => same(e.artist, v.name)),
      seen = new Set(),
      out = [];
    for (const e of [...local, ...(v.data?.songs ?? []).map(fromPick)]) {
      const id = e.audius ?? e.key;
      if (seen.has(id) || seen.has(e.key)) continue;
      seen.add(id);
      seen.add(e.key);
      out.push(e);
    }
    return out;
  }
  async function openArtist(e) {
    if (e.kind !== 'song' || !e.artist) return;
    closeMenu();
    const from = tab === 'artist' ? artistView.from : tab,
      v = (artistView = { from, name: e.artist, song: e, data: null, busy: !e.file, err: false });
    if (!pushed) {
      try {
        history.pushState({ struna: 'artist' }, '');
        pushed = true;
      } catch {}
    }
    tab = 'artist';
    build();
    rows();
    bar();
    mark();
    if (e.file) return;
    try {
      v.data = await artistOf({ audius: e.audius, name: e.artist });
    } catch {
      v.err = true;
    }
    v.busy = false;
    if (artistView !== v || tab !== 'artist') return;
    build();
    rows(true);
    bar();
    mark();
  }
  // (back from the artist: to the tab they came from, unless a tab was picked; `quiet`: the history entry taken back too)
  function leaveArtist(quiet) {
    const from = artistView?.from ?? 'picks';
    artistView = null;
    if (pushed) {
      pushed = false;
      popping = true;
      try {
        history.back();
      } catch {
        popping = false;
      }
    }
    if (quiet) return;
    tab = from;
    build();
    rows();
    bar();
    mark();
  }
  addEventListener('popstate', () => {
    if (popping) return void (popping = false);
    if (tab !== 'artist') return;
    pushed = false;
    leaveArtist();
  });
  const head = $('#artisthead');
  head.querySelector('.back').onclick = () => leaveArtist();
  function drawArtist() {
    const v = artistView,
      d = v?.data,
      pic = head.querySelector('.ava');
    if (!v) return;
    head.classList.toggle('busy', v.busy);
    head.classList.toggle('err', v.err);
    head.querySelector('.who b').textContent = d?.name ?? v.name;
    const facts = [];
    if (d?.followers) facts.push(`<span>${ICON.person}${short(d.followers)}</span>`);
    const n = songs().length;
    if (n) facts.push(`<span>♪ ${n}</span>`);
    if (v.err) facts.push(`<span class="off" title="${esc(tr('Audius did not answer'))}">${ICON.off}</span>`);
    head.querySelector('.who small').innerHTML = facts.join('');
    pic.style.setProperty('--h', hueOf(v.song.m, v.name));
    // (their picture over the song's cover over a disc in their hue: whichever loads)
    pic.style.backgroundImage = [d?.pic, v.song.art].filter(Boolean).map(u => `url('${u}')`).concat('radial-gradient(circle at 50% 35%, hsl(var(--h) 90% 70%), hsl(var(--h) 70% 22%))').join(', ');
    const out = head.querySelector('.out');
    out.hidden = !d?.url;
    if (d?.url) out.href = d.url;
  }

  // Escape closes a menu, then the artist's page (before the screen's own keys: main.js)
  addEventListener(
    'keydown',
    ev => {
      if (ev.key !== 'Escape' || $('#menu').hidden) return;
      if (menuOpen()) closeMenu();
      else if (tab === 'artist') leaveArtist();
      else return;
      ev.stopPropagation();
      ev.preventDefault();
    },
    true,
  );
  addEventListener('visibilitychange', () => document.hidden && settle());
  undoable.word = () => tr('undo');

  // keys: up and down through the songs (heard as they come), Enter plays, L likes; with Alt or Ctrl the song picked
  // moves up or down (in a tab of the player's own order), Delete takes it out, the menu key opens its menu
  list.onkeydown = ev => {
    const all = entries.filter(x => x.kind !== 'head'),
      i = all.indexOf(picked);
    if (!all.length) return;
    if ((ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && (ev.altKey || ev.ctrlKey) && OWN.has(tab)) {
      ev.preventDefault();
      moveBy(ev.key === 'ArrowDown' ? 1 : -1);
    } else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      const next = all[(i + (ev.key === 'ArrowDown' ? 1 : all.length - 1)) % all.length];
      pick(next, true);
      list.querySelector('.row.on')?.focus({ preventScroll: true });
    } else if (ev.key === 'Enter' && document.activeElement?.classList.contains('row')) {
      ev.preventDefault();
      go();
    } else if (ev.code === 'KeyL' && picked?.kind === 'song') like(picked);
    else if ((ev.key === 'Delete' || ev.key === 'Backspace') && picked && canRemove(picked)) {
      ev.preventDefault();
      const i = entries.indexOf(picked);
      removeSong(picked);
      // (the song after it picked, so a run of Deletes goes down the list)
      setTimeout(() => {
        const next = entries[Math.min(i, entries.length - 1)];
        if (next) pick(next, false), rowOf(next)?.focus({ preventScroll: true });
      }, 220);
    } else if ((ev.key === 'ContextMenu' || (ev.shiftKey && ev.key === 'F10')) && picked?.kind === 'song') {
      ev.preventDefault();
      songMenu(picked, { anchor: rowOf(picked)?.querySelector('.more') });
    }
  };
  stage.querySelector('.go').onclick = go;

  return {
    // the screen drawn afresh (the songs as they are now); the song picked before kept picked, else the first
    draw() {
      for (const b of chips.children) b.textContent = b.label();
      build();
      rows();
      bar();
      const last = settings.get('lastPick'),
        known = last && (meta.song(last) || tracks.some(t => t.file === last)),
        first = (settings.get('learned') ? entries.find(x => x.key === last) : entries.find(x => x.kind === 'song')) ?? (picked && entries.find(x => x.key === picked.key)) ?? (known ? fromKey(last) : null) ?? entries.find(x => x.kind === 'song') ?? (tracks.length ? fromGame(tracks[0], 0) : null);
      if (first) pick(first, false);
      else drawStage();
      if (wanted && !openedOnce) {
        openedOnce = true;
        opened().then(e => e && pick(e, false));
      }
      if (!raf) frame();
      // (and the popular ones, as Audius answers, unless a search or a genre is shown)
      if (!found.list.length) show(popular, chips.firstChild.label);
      loadKept().then(backfill);
      return list.querySelector('.row.on');
    },
    // a tab opened from outside (the songs added: mine)
    tab: setTab,
    // the screen left: silence, no more frames
    leave() {
      preview.stop();
      cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}
