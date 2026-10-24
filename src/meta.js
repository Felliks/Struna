// What the player has done across songs, kept on the device: the simulation's map (each song scanned is a sector of
// its region), each song's trophy and secrets, the moves unlocked, the logs of the story found, what the cursor remembers
// of him, the track of the day, and the ghosts of his best runs. A song is known by a key: its file for the songs that
// come with the game, its link, or its file's name and size.
import { tr, trName } from './i18n.js';

const KEY = 'sim.meta';

// the map's regions: a song's style is where it lies
export const REGIONS = {
  hard: { name: 'FIREWALL', col: '#ff2b3a', at: [0.8, 0.3] },
  dark: { name: 'DEEP WEB', col: '#4a7bff', at: [0.2, 0.32] },
  bright: { name: 'SUNNY CACHE', col: '#ffd84a', at: [0.78, 0.76] },
  chill: { name: 'IDLE LOOP', col: '#3de0c0', at: [0.22, 0.76] },
  epic: { name: 'MAINFRAME', col: '#b36bff', at: [0.5, 0.16] },
};
// the moves a new player does not meet at once: one more with each win (level.js swaps a locked one for a plainer one)
export const UNLOCKS = [
  { type: 'chord', at: 1, name: 'CHORDS', hint: 'two keys at once: the thing and the clone behind it' },
  { type: 'glide', at: 2, name: 'GLIDE', hint: 'hold ↑ over a gap on the bass' },
  { type: 'dash', at: 3, name: 'DASH', hint: 'hold → through a corridor of panes' },
  { type: 'zip', at: 5, name: 'ZIPLINE', hint: 'hold ← along a line' },
  { type: 'grind', at: 7, name: 'GRIND', hint: 'hold ↓ along a rail' },
];
// the story, found a log at a time (the digital copy and the AI that keeps testing him)
export const LOGS = [
  ['first', 'LOG 01', 'subject: a copy of mr.felliks, made from his videos. task: break him. method: music.'],
  ['win1', 'LOG 02', 'the copy finished a song. the cursor was not supposed to lose. retrying with harder songs.'],
  ['dead3', 'LOG 03', 'deleted three times. it keeps coming back. the backups are his, not ours.'],
  ['region2', 'LOG 04', 'the copy has left its sector. it is looking for something in the other regions.'],
  ['secret', 'LOG 05', 'it found a door we did not build. someone else is in the simulation.'],
  ['boss', 'LOG 06', 'a boss process deleted. the copy is learning the music faster than we write it.'],
  ['songs5', 'LOG 07', 'five sectors scanned. each song makes a world. it wants to see all of them.'],
  ['route', 'LOG 08', 'it took the hard way when the easy one was open. that is not in its training data.'],
  ['flawless', 'LOG 09', 'a flawless run. the cursor had nothing to do. the cursor did not like that.'],
  ['region5', 'LOG 10', 'every region visited. the map is his now. what is past the edge of it?'],
  ['set', 'LOG 11', 'three songs in a row without dying. it is not running from the music any more. it is running with it.'],
  ['songs12', 'LOG 12', 'twelve sectors. the copy uploads its own songs now. we cannot predict the next world.'],
  ['secrets3', 'LOG 13', 'three secrets. the someone else left them for him. a message, maybe. from the original.'],
  ['daily7', 'LOG 14', 'seven days of the track of the day. it has a routine. copies are not supposed to have routines.'],
];
// what the cursor says as a song starts: on a first scan, after deaths on it, after wins, back after a while
const SAY = {
  first: ['new sector. new music. same you.', 'never heard this one. neither have you, in here.', 'scanning. let us see what this song makes of you.'],
  again: ['attempt #{n}. I have been counting.', 'back again? #{n}.', 'this song again. #{n}. I remember every miss.'],
  died: ['you died here {d} times. I kept all of them.', '{d} deletions on this one. try not to make it {d1}.', 'last time you lost at {at}. I saved the spot.'],
  won: ['you beat this one. luck, I logged it as luck.', 'already won here. now do it without a miss.', 'best {best}. I have written a better one for you to lose to.'],
  daily: ['track of the day. one try. no undo for you.', 'everyone gets this song today. one shot.'],
  set: ['a set: three songs, one life between them.', 'no rest between songs. I like sets.'],
};
// the end of a run: a line for the results
const END = {
  won: ['fine. the next song is worse.', 'you made it. I made notes.', 'logged. deleted the log. logged again.'],
  flawless: ['not one miss. I am rewriting myself.', 'flawless. this is not funny.'],
  died: ['deleted. restore from backup?', 'that is {d} on this song.', 'the music kept going. you did not.'],
};

const today = () => new Date().toISOString().slice(0, 10);
const pickOf = (arr, n) => arr[Math.abs(n) % arr.length];
// (a line in the player's language, its {name}s filled)
const fill = (s, v = {}) => tr(s, v);
// a stable hash of a string
export const hashStr = s => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export class Meta {
  constructor() {
    this.s = { songs: {}, logs: [], wins: 0, deaths: 0, daily: {}, sets: { best: 0, done: 0 }, ghosts: {} };
    try {
      Object.assign(this.s, JSON.parse(localStorage.getItem(KEY)) ?? {});
      // (a player from before the map: each song he has a best on counts as a win, so nothing he had is locked away)
      if (!localStorage.getItem(KEY)) this.s.wins = Object.keys(JSON.parse(localStorage.getItem('sim.best')) ?? {}).length * 2;
    } catch {}
  }
  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.s));
    } catch {
      // (full: the ghosts go first, they are the biggest)
      this.s.ghosts = {};
      try {
        localStorage.setItem(KEY, JSON.stringify(this.s));
      } catch {}
    }
  }
  song(key) {
    return this.s.songs[key];
  }
  // the moves still locked for him
  locked() {
    return UNLOCKS.filter(u => this.s.wins < u.at).map(u => u.type);
  }
  // the line the cursor greets a song with
  hello(key, mode) {
    const s = this.song(key),
      n = (s?.plays ?? 0) + 1;
    if (mode === 'daily' || mode === 'set') return fill(pickOf(SAY[mode], n));
    if (!s) return fill(pickOf(SAY.first, hashStr(key)));
    if (s.wins && n % 2) return fill(pickOf(SAY.won, n), { best: (s.best ?? 0).toLocaleString('en-US') });
    if (s.deaths) return fill(pickOf(SAY.died, n), { d: s.deaths, d1: s.deaths + 1, at: `${Math.floor(s.lastDeath / 60)}:${String(Math.floor(s.lastDeath % 60)).padStart(2, '0')}` });
    return fill(pickOf(SAY.again, n), { n });
  }
  // a run ended: what is new because of it (for the results), and the cursor's last word
  record(r) {
    const S = this.s,
      s = (S.songs[r.key] ??= { title: r.title, artist: r.artist, plays: 0, wins: 0, deaths: 0, best: 0, stars: 0, found: {} }),
      news = [],
      firstScan = !s.style;
    Object.assign(s, { title: r.title, artist: r.artist, style: r.style, place: r.place, lens: r.lens, sign: r.sign, sector: r.sector, secret: r.secret, boss: r.boss, hue: r.hue, link: r.link ?? s.link ?? null, file: r.file ?? s.file ?? null, last: Date.now() });
    s.plays++;
    if (firstScan) news.push(tr('SECTOR SCANNED: {sector}', { sector: trName(r.sector) }));
    const before = new Set(Object.values(S.songs).filter(q => q.style).map(q => q.style));
    if (r.win) {
      s.wins++;
      S.wins++;
      const was = UNLOCKS.find(u => u.at === S.wins);
      if (was) news.push(tr('NEW MOVE: {name} — {hint}', { name: tr(was.name), hint: tr(was.hint) }));
      if (r.score > s.best) {
        s.best = r.score;
        if (r.inputs) S.ghosts[r.key] = r.inputs;
      }
      s.stars = Math.max(s.stars, r.stars);
      if (!s.trophy) {
        s.trophy = { name: r.boss, sign: r.sign, hue: r.hue, lens: r.lens, at: Date.now() };
        news.push(tr('TROPHY: {name}', { name: trName(r.boss) }));
      }
    } else {
      s.deaths++;
      S.deaths++;
      s.lastDeath = r.t;
    }
    const found = s.found;
    if (r.secretFound && !found.secret) (found.secret = true), news.push(tr('SECRET FOUND'));
    if (r.bossDown && !found.boss) (found.boss = true), news.push(tr('BOSS DELETED'));
    if (r.hardRoute && !found.route) (found.route = true), news.push(tr('HARD ROUTE TAKEN'));
    for (const e of r.eggs ?? []) if (!(found.eggs ??= []).includes(e)) found.eggs.push(e);
    // the story's logs, each when its moment first comes
    const songs = Object.values(S.songs).filter(q => q.style),
      regions = new Set(songs.map(q => q.style)),
      secrets = songs.filter(q => q.found?.secret).length,
      days = Object.keys(S.daily).length,
      cond = {
        first: true,
        win1: S.wins >= 1,
        dead3: S.deaths >= 3,
        region2: regions.size >= 2 && before.size < regions.size,
        secret: secrets >= 1,
        boss: songs.some(q => q.found?.boss),
        songs5: songs.length >= 5,
        route: songs.some(q => q.found?.route),
        flawless: r.win && r.miss === 0,
        region5: regions.size >= 5,
        set: S.sets.done >= 1,
        songs12: songs.length >= 12,
        secrets3: secrets >= 3,
        daily7: days >= 7,
      };
    for (const [id, name] of LOGS) if (cond[id] && !S.logs.includes(id)) S.logs.push(id), news.push(tr('{name} UNLOCKED', { name: tr('LOG {n}', { n: name.slice(4) }) }));
    this.save();
    const say = r.win ? fill(r.miss === 0 ? pickOf(END.flawless, s.plays) : pickOf(END.won, s.plays)) : fill(pickOf(END.died, s.plays), { d: s.deaths });
    return { news, say };
  }
  // the track of the day: one of the game's songs and a modifier, by the date; one try counts
  daily(tracks) {
    const d = today(),
      h = hashStr(d);
    return { date: d, track: h % tracks.length, mods: [[], ['ghosts'], ['nightcore'], ['upside'], ['blind'], ['onelife']][h % 6], done: this.s.daily[d] ?? null };
  }
  dailyDone(score, win) {
    const d = today();
    if (!this.s.daily[d]) this.s.daily[d] = { score, win };
    this.save();
  }
}
