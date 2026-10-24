// A song's character: what makes it this song and not another in a new coat (Kate Compton's "10,000 bowls of
// oatmeal": a generator's output must feel unique, not only differ). Read from the song (profile.js's features) and its
// seed, so the same song always has the same character:
//   - its diagnosis: the one thing the song does most (a wobble bass, a sidechain pump, rolling trap hats, a voice
//     held long, a rush of onsets, a dreamy calm, a bright lift, a chorus that comes back); it changes what the level
//     is made of all song long, and is shown as the run starts (Rhythm Doctor: each patient's heart is the level's rule)
//   - the cursor's tools: two or three acts in which the AI uses a tool of its desktop on him (undo, crop, rotate,
//     zoom, error windows, lasso), chosen by its temper
//   - a secret (one song in three): something only this song has, to be found
//   - easter eggs: facts about the audio the simulation notices (128 BPM, 4:20 long, ...)
//   - its finale and its boss's name
import { mulberry, pick } from './rng.js';

const c01 = x => Math.max(0, Math.min(1, x));

export const SIGNS = {
  wobble: { name: 'WOBBLE', line: 'the bass bends the floor: ride it' },
  pump: { name: 'PUMP', line: 'the kick sucks the world in: hit two at once' },
  trap: { name: 'TRAP', line: 'the hats roll: dash through' },
  voice: { name: 'VOICE', line: 'the voice holds: hold with it, fly with it' },
  rush: { name: 'RUSH', line: 'too many notes: too many of you' },
  dream: { name: 'DREAM', line: 'slow down: the gaps are wide' },
  sky: { name: 'SKYWARD', line: 'it lifts: everything goes up' },
  echo: { name: 'ECHO', line: 'it repeats itself: so will you, from memory' },
};
export const TOOLS = {
  undo: { name: 'CTRL+Z', line: 'miss and it takes you back' },
  crop: { name: 'CROP', line: 'it cuts the world down' },
  rotate: { name: 'ROTATE', line: 'it turns the world' },
  zoom: { name: 'ZOOM', line: 'it plays with the lens' },
  errors: { name: 'ERROR', line: 'its windows block the way: kick them' },
  lasso: { name: 'LASSO', line: 'it cuts the floor out' },
};
export const SECRETS = {
  source: 'a door to the source code, on a downbeat of a quiet stretch: press on it',
  giant: 'the giant comes down for the last drop',
  ally: 'a clone that runs with you, not at you',
  meteor: 'the sky falls in a drop',
};
// the boss's name: what it is made of, and what it is
const BOSS_A = { wobble: 'WOBBLING', pump: 'PUMPING', trap: 'HALF-TIME', voice: 'SINGING', rush: 'SWARMING', dream: 'SLEEPWALKING', sky: 'ASCENDED', echo: 'ECHOING' },
  BOSS_N = ['CURSOR', 'ADMIN', 'DEBUGGER', 'COMPILER', 'DAEMON', 'KERNEL', 'ROOT', 'SCHEDULER'];

const ADJ = { hard: ['BURNING', 'SHATTERED', 'OVERCLOCKED', 'RED'], dark: ['DROWNED', 'HOLLOW', 'NIGHT', 'COLD'], bright: ['GOLDEN', 'BLOOMING', 'SUNLIT', 'NEON'], chill: ['SLEEPING', 'SOFT', 'DRIFTING', 'BLUE'], epic: ['ENDLESS', 'TITAN', 'ASCENDING', 'GRAND'] },
  NOUN = ['CACHE', 'LOOP', 'GARDEN', 'ARCHIVE', 'HIGHWAY', 'KERNEL', 'HARBOUR', 'CATHEDRAL', 'STATIC', 'MIRROR'];
const GIANTS = { hard: ['headphones', 'horns'], dark: ['horns', 'hood'], bright: ['halo', 'crown'], chill: ['beanie', 'halo'], epic: ['crown', 'headphones'] };

export function character(A, P, acts, title = '') {
  const r = mulberry((A.seed ?? 1) ^ 0xc4a7),
    F = P.F ?? {},
    pace = c01(((F.bpm ?? 120) - 70) / 90);
  // the diagnosis: the strongest of the song's traits (a little seed in it, so near-ties go both ways)
  // (scaled on what real songs measure: every song has some wobble and some sustain, only the strongest count)
  const score = {
    wobble: c01(((F.wobble ?? 0) - 0.4) / 0.3),
    pump: c01(((F.duck ?? 1) - 1.05) / 0.4),
    trap: c01(((F.halfTime ?? 0) - 0.45) / 0.35),
    voice: c01(((F.sustain ?? 0) - 0.4) / 0.25),
    rush: c01(((F.onRate ?? 0) - 9) / 3) * 0.45 + pace * 0.25,
    dream: P.chill * 1.2,
    sky: P.valence * (1 - P.hardness) * 1.1,
    echo: 0.4,
  };
  for (const k in score) score[k] += r() * 0.15;
  const sign = Object.entries(score).sort((a, b) => b[1] - a[1])[0][0];
  // the tools: two of the acts after the intro that are not flown nor the boss's, each one tool, from those of the cursor's
  // temper (twitchy when the song is tense, playful when it is bright)
  // (two, three in a song of six acts or more; the first always one that moves the camera: the world tipped, or pushed in)
  const tense = P.arousal > 0.55,
    camera = tense ? 'rotate' : 'zoom',
    // (no undo: the song never goes back; a miss is played through on time, never replayed)
    pool = tense ? ['crop', 'errors', 'zoom'] : ['lasso', 'errors', 'rotate'],
    free = acts.filter(a => a.i > 0 && a.mode !== 'fly' && a.mode !== 'boss' && a.t1 - a.t0 >= 8 * A.beat && a.t0 < A.dur - 10),
    tools = [];
  for (const a of [...free].sort(() => r() - 0.5).slice(0, acts.length >= 6 ? 3 : 2)) {
    const left = pool.filter(x => !tools.some(q => q.tool === x)),
      tool = tools.length ? left[Math.floor(r() * left.length)] : camera;
    tools.push({ t0: a.t0, t1: a.t1, tool });
  }
  tools.sort((a, b) => a.t0 - b.t0);
  // a secret in one song of three, in an act of its own
  const secret = r() < 0.34 ? pick(r, Object.keys(SECRETS)) : null;
  // the easter eggs
  const bpm = Math.round((F.bpm ?? 0) * 10) / 10,
    eggs = [];
  if (Math.abs(bpm - 128) < 0.6) eggs.push('128');
  if (Math.abs(A.dur - 260) < 3) eggs.push('420');
  if (/remix|edit|bootleg|vip/i.test(title)) eggs.push('remix');
  if (A.dur < 75) eggs.push('short');
  if (bpm > 168) eggs.push('hyper');
  if (bpm > 0 && bpm < 80) eggs.push('slow');
  if (/sim|felliks|glitch|matrix|robot|ai\b/i.test(title)) eggs.push('self');
  // the finale (how the song ends: level.js / run.js / render): a hard song's flying knee at the cursor, a dark song's
  // world deleted round him, a bright or epic song's ascension, a chill song's sunrise
  const FIN = { hard: ['knee', 'knee', 'delete'], dark: ['delete', 'delete', 'knee'], epic: ['ascend', 'ascend', 'knee'], bright: ['ascend', 'knee', 'dawn'], chill: ['dawn', 'dawn', 'ascend'] },
    finale = pick(r, FIN[P.style] ?? FIN.dark);
  const boss = `THE ${BOSS_A[sign]} ${pick(r, BOSS_N)}`,
    // the giant dancing in the sky: who it is, by the song's style
    giant = pick(r, GIANTS[P.style] ?? GIANTS.dark);
  // the world's grammar (Compton: a world must feel like a place of its own): an anomaly in its sky, out of the
  // simulation's set, and the sector's name
  const anomaly = pick(r, ['moon', 'ring', 'aurora', 'islands', 'wormhole', 'skycity', 'none']),
    sector = `SECTOR ${((A.seed >>> 0) % 4096).toString(16).toUpperCase().padStart(3, '0')} · ${pick(r, ADJ[P.style] ?? ADJ.dark)} ${pick(r, NOUN)}`;
  return { sign, tools, secret, eggs, finale, boss, giant, anomaly, sector };
}
