// The level: a song's analysis -> its profile and its one place, the run stretches and shafts (from the sections),
// and the obstacles the AI's cursor draws (from the onsets). Deterministic: the song's seed drives every choice, and a
// bar that sounds like an earlier bar gets the same obstacles again, so a song's chorus plays the same each time.
//
// Rules (research, docs in game/README.md):
//   - every press is ON the music (an onset on the half-beat grid) and every move lands on the grid too (motion.js:
//     the rhythm-game rule), and the cursor puts each obstacle down two beats before its press
//   - after a move has ended there is a breath (half a beat at least) before the next press
//   - one obstacle, one press, read by shape and colour: low and warm = jump (↑), hanging and cold = slide (↓),
//     a tall pane = kick through it (→), a bar over a wide gap = grab it (←), a gap = jump, a long ceiling = slide and
//     hold (↓ held)
//   - kicks make jumps, snares make slides, snares with a crash make panes, the hardest accents (a kick and a crash
//     struck together) make clones to kick out, held notes make long ceilings, long loud notes after a kick make gaps,
//     and a gap with a bar to swing on only where a note is held over it;
//     density follows the section (calm 1 per bar, verse 2, build rising, drop up to every beat)
//   - the drums are the song's main layer (the charting rule: one layer, the same way all through; a voice only where
//     there is nothing more to follow): in an intro, a verse or a break a voice sings on the grid (half its syllables
//     on it at least), a bar it sings two syllables in is played by the voice, not the drums: a press on each of its
//     syllables, up where it goes up and down where it goes down, a held note a bar to swing on (high) or a ceiling to
//     slide under (low), nothing where it breathes; quick lines get quick moves (motion.js), so the presses follow the
//     words' rhythm, not a metronome
//   - a build before a drop is a fall (the cursor deletes the floor) that lands on the drop; dark songs fall more
//   - speed follows the section's energy (Audiosurf's rule: intense music is fast)
import { mulberry, pick } from './rng.js';
import { actAt, songActs } from './acts.js';
import { planModes } from './modes.js';
import { sampleEnv } from './analyze.js';
import { KINDS } from './kinds.js';
import { makeMotion } from './motion.js';
import { PLACES, pickPlace } from './places.js';
import { intensityOf, profile } from './profile.js';
import { DIFFICULTY } from './difficulty.js';
import { character } from './character.js';
import { LASTING, PROPS, STAR_RATE, starKind, starPlan } from './stars.js';
import { AIM_Y, themeOf } from './props.js';
import { artistDress, dressLevel, guestDress } from './world/artists.js';

// (an island of a ladder starts that far before where he touches down on it: his landing spot by its lip, so tucked
// into the roll too soon in the air he comes down short of it, run.js)
export const LIP = 0.45;
// how long he takes to turn round on landing when the run goes the other way (anim.js plays a captured turn over it)
export const TURN = 0.7;

// a wall to kick through stands taller than any jump goes (he clears 1.5 m, his head 3.3 m up): it cannot read as
// something to jump
// the things that keep their own beat, never spaced apart from the rest (a lane's fall, a flight's ring, a climb's beam, a
// zone held through)
const FREEBEAT = new Set(['lane', 'ring', 'tic', 'zone', 'gate']);
const WALL = 4.2;
// the set pieces a song's drops open with (level.js: one per song, its signature), in beats from the drop's first: each
// thing that fits where it falls (a fast song leaves out what it has no time for)
const PIECES = {
  // a staircase of boxes up to a tall one
  stairs: [[0, 'jump', { tall: true }], [2, 'jump'], [3, 'jump'], [4, 'jump'], [6, 'jump', { tall: true }]],
  // over, under, over, under, and through a clone
  gauntlet: [[0, 'jump', { tall: true }], [1.5, 'slide'], [3, 'jump'], [4.5, 'slide'], [6, 'chordjump']],
  // a corridor of panes dashed through, then low and through a clone, over and under
  breach: [[0, 'dash', { dur: 2 }], [3.5, 'chordslide'], [5, 'jump'], [6.5, 'slide']],
  // a pack of clones from both sides
  pack: [[0, 'foe'], [1.5, 'foe'], [3, 'foeback'], [4.5, 'foe'], [6, 'chordjump']],
  // a leap over a gap on a bar, then low and through
  leap: [[0, 'grab', { dur: 2 }], [3.5, 'slide'], [5, 'chordslide'], [7, 'jump']],
};
const PIECE_NAMES = Object.keys(PIECES);

export function buildLevel(A, { difficulty = 'normal', ml = null, place: forcePlace = null, title = '', artist = '', locked = [], stars: forceStars = null, avoidStars = [], lesson = false } = {}) {
  const r = mulberry(A.seed),
    { beat, bars, onsets, fps } = A,
    // how the song feels (profile.js); the mood the rest of the level reads: dark (low valence) and tense (aroused)
    P = profile(A, ml),
    mood = { dark: 1 - P.valence, tense: P.arousal };
  // each bar's intensity on an absolute scale: a chill song's loudest bar stays gentle (profile.js)
  for (const b of bars) b.intensity = intensityOf(P, b);
  // the cursor's temper: tense music, a twitchy, quick cursor
  const temper = { speed: 0.6 + mood.tense * 0.8, jitter: mood.tense, laugh: 0.4 + (1 - mood.dark) * 0.6 };

  // ---- how long his moves take, from the tempo (motion.js)
  const M = makeMotion(beat);

  // ---- run stretches and the shafts between them (a fall down, or a launch up)
  const segs = [],
    start = bars[0]?.t0 ?? 0;
  const isFall = new Array(bars.length).fill(false);
  bars.forEach((b, i) => {
    if (!b.dropStart || i < 4) return;
    // the bars of build before this drop (2-4), or the 2 bars before it
    let k = i - 1;
    while (k > i - 4 && k > 3 && bars[k - 1]?.kind === 'build') k--;
    if (i - k < 2) k = i - 2;
    for (let j = Math.max(4, k); j < i; j++) isFall[j] = true;
  });
  // dark songs also fall through their long calm stretches (after the intro)
  if (mood.dark > 0.55)
    for (let i = 6; i < bars.length - 2; i++) {
      let n = 0;
      while (bars[i + n] && bars[i + n].kind === 'calm') n++;
      if (n >= 4) for (let j = i + 1; j < i + Math.min(n, 4); j++) isFall[j] = true;
      i += n;
    }
  // the climbs (the tic-tac, below): a change of pace in the middle of a part, never a drop's way in (a drop wants the
  // big entrance: flown up through a lid, or fallen onto the roof): two bars up a shaft (four in a fast song, over 140 a
  // minute) where the kick plays on half the beats at least (nothing to push off on over a bare voice), well clear of
  // a drop and of any other shaft, after the intro and before the end; at most two in a song, as far apart as can be
  const isClimb = new Array(bars.length).fill(false);
  {
    const n = 60 / beat > 140 ? 4 : 2,
      kicked = b => [0, 1, 2, 3].filter(k => onsets.some(o => o.band === 'low' && o.s >= 0.4 && Math.abs(o.t - (b.t0 + k * beat)) < 0.08)).length >= 2,
      clear = i => bars[i] && !isFall[i] && !bars[i].dropStart,
      fits = i => {
        for (let j = i - 2; j < i + n + 2; j++) if (!clear(j)) return false;
        for (let j = i; j < i + n; j++) if (bars[j].kind === 'calm' || !kicked(bars[j])) return false;
        return true;
      },
      starts = [];
    for (let i = 8; i + n < bars.length - 4; i++) if (fits(i)) starts.push(i);
    const first = starts[0],
      far = starts.filter(i => i - first >= 16).at(Math.floor(starts.filter(i => i - first >= 16).length / 2));
    for (const i of [first, far]) if (i !== undefined) for (let j = i; j < i + n; j++) isClimb[j] = true;
  }
  let cur = null;
  bars.forEach((b, i) => {
    const kind = isFall[i] || isClimb[i] ? 'shaft' : 'run';
    if (!cur || (cur.kind === 'run') !== (kind === 'run')) {
      if (cur) cur.t1 = b.t0;
      cur = { kind, t0: i === 0 ? 0 : b.t0, t1: b.t1, bars: [], climbs: isClimb[i] };
      segs.push(cur);
    }
    cur.bars.push(b);
    cur.t1 = b.t1;
  });
  if (cur) cur.t1 = A.dur;

  // one place for the whole song (places.js); each shaft is a fall or a launch up (bright songs fly up more); a way
  // across the screen by the seed, which may change only on landing on a new level after a shaft: he lands facing the
  // way he went, turns round (a captured turn, TURN s) and runs off the other way, the camera panning across (the stage
  // is one world: nothing mirrors)
  // (a place may be forced, for the tests)
  const place = forcePlace ?? pickPlace(P, r),
    dir0 = r() < 0.5 ? 1 : -1;
  let flownAt = null;
  // ---- what kind of play each act is (modes.js), and the place the song is rewritten into midway, if it is
  const acts = songActs(A),
    plan = planModes(A, P, acts, mulberry((A.seed ?? 1) ^ 0x30de)),
    // the song's character (character.js): its diagnosis shapes what the level is made of below
    ch = character(A, P, plan.acts, title),
    sign = ch.sign,
    // (an act flown is flown only where its flight is (eight bars at most, below); the rest of it is run)
    modeAt = t => {
      const m = actAt(plan.acts, t).mode;
      return m === 'fly' && flownAt && !flownAt(t) ? 'run' : m;
    },
    rewriteT = plan.acts.find(a => a.rewrite)?.t0 ?? Infinity,
    // (the place it is rewritten into midway: another that suits it, never the first)
    place2 = pickPlace(P, mulberry((A.seed ?? 1) ^ 0x91ac), [place]),
    placeAt = t => (t >= rewriteT ? place2 : place);
  // (a rush: every other drop a brawl, the rest as planned: a song of one kind of play all through is one long run)
  if (sign === 'rush') plan.acts.filter(a => a.kind === 'drop' && a.mode !== 'boss' && !a.open).forEach((a, k) => k % 2 === 0 && (a.mode = 'brawl'));
  let dir = dir0;
  for (const sg of segs) {
    sg.place = placeAt(sg.t0);
    if (sg.kind === 'run') {
      sg.turn = sg.t0 > 0 && sg.dir === undefined && dir !== (sg.face ?? dir);
      // (which captured turn, anim.js)
      if (sg.turn) sg.v = r();
      sg.dir = dir;
    } else {
      // (skyward: nearly always up)
      const up = r() < (sign === 'sky' ? 0.85 : 0.3 + 0.4 * (1 - mood.dark));
      sg.kind = up || sg.climbs ? 'rise' : 'fall';
      sg.face = dir;
      const next = segs[segs.indexOf(sg) + 1];
      if (next) next.face = dir;
      // (landing on a drop he does not turn round: he lands on the drop and runs straight into it)
      if (r() < 0.4 && !next?.bars[0]?.dropStart) dir = -dir;
    }
  }
  const vertical = sg => sg.kind !== 'run';
  // (no world turned over across a shaft: a climb seen upside down goes down the screen, so its up is the down key, and
  // a tic-tac can no longer be read; a ceiling act over one is a blackout instead, which leaves the keys)
  for (const a of plan.acts) if (a.mode === 'ceiling' && segs.some(s => vertical(s) && s.t1 > a.t0 && s.t0 < a.t1)) a.mode = 'blackout';
  // the first moment after a landing something may be pressed: a beat and a half of clear roof (and the turn, if he
  // turns), only a beat landing on a drop (its second beat a hit: the landing is the drop's)
  const clearAt = sg => (sg.t0 > 0 ? sg.t0 + (sg.bars[0]?.dropStart && !sg.turn ? beat : beat * 1.5) + (sg.turn ? TURN : 0) : -9);

  // ---- the finale (the song's last seconds, on its last run): the cursor comes down in front of him to gloat, he
  // leaps at it on a beat with a flying knee and smashes it on the next, lands, slows to a stop and celebrates
  const lastRun = segs.at(-1),
    jumpAt = A.beats.find(b => b >= A.dur - 4.6),
    air = beat * Math.max(1, Math.round(1.0 / beat)),
    finale = lastRun?.kind === 'run' && jumpAt !== undefined && jumpAt - 2 * beat > lastRun.t0 + 2 ? { kind: ch.finale, t0: jumpAt - 2 * beat, jump: jumpAt, air, hit: jumpAt + air * 0.45, land: jumpAt + air, end: Math.max(A.dur - 0.3, jumpAt + air + 2.6) } : null;

  // ---- speed: by the bar's absolute intensity (Audiosurf, Melody's Escape: calm music walks, intense music runs),
  // from a jog of 3.6 m/s (a chill song) to a sprint of 6.6 m/s (a hard song's drop), eased; distance is its integral
  // (precomputed at 60 Hz). The run and the sprint are phased by distance, so his feet never slide at any speed
  // how mini he is at t (0..1): eased in over the first beat of a part played mini and out over its last
  const miniAt = t => {
    const a = actAt(plan.acts, t);
    return a.mini ? Math.max(0, Math.min(1, (t - a.t0) / beat, (a.t1 - t) / beat)) : 0;
  };
  const barAt = t => bars.find(b => t >= b.t0 && t < b.t1),
    DT = 1 / 60,
    n = Math.ceil((A.dur + 4) * 60),
    X = new Float32Array(n + 1),
    V = new Float32Array(n + 1);
  // (a shaft is straight down or up: no ground speed while it lasts; he lands running at the drop's speed)
  let v = 3.6 + 3.0 * (bars[0]?.intensity ?? 0.3);
  for (let i = 0; i < n; i++) {
    const t = i * DT,
      b = barAt(t),
      // (on the hoverboard: faster; in a turbo act, faster still)
      // (a dream: slower)
      target = (3.6 + 3.0 * (b?.intensity ?? 0.3)) * (modeAt(t) === 'ride' ? 1.2 : modeAt(t) === 'turbo' ? 1.35 : 1) * (sign === 'dream' ? 0.85 : 1),
      falling = segs.some(s => vertical(s) && t >= s.t0 && t < s.t1);
    // (turning round after a landing, he only gets going as the turn ends)
    const turning = segs.find(s => s.turn && t >= s.t0 && t < s.t0 + TURN);
    v = falling ? target : finale && t > finale.land ? v * Math.exp(-DT * 4) : turning ? target * ((t - turning.t0) / TURN) ** 2 : v + (target - v) * 0.02;
    V[i] = falling ? 0 : v;
    X[i + 1] = X[i] + V[i] * DT;
  }
  const xAt = t => {
    const f = Math.max(0, Math.min(n - 1, t * 60)),
      i = Math.floor(f);
    return X[i] + (X[i + 1] - X[i]) * (f - i);
  };
  const vAt = t => V[Math.max(0, Math.min(n - 1, Math.round(t * 60)))];

  // ---- the onsets near a time, per band
  const near = (t, band, w = 0.07) => {
    let s = 0;
    for (const o of onsets) {
      if (o.t < t - w) continue;
      if (o.t > t + w) break;
      if (o.band === band) s = Math.max(s, o.s);
    }
    return s;
  };
  // the voice's syllable nearest a time, within w (analyze.js vox), or null; by default only one sung on the grid (a
  // voice singing sixteenths or off the beat is not pressed to: the press would sit beside what is heard)
  const vox = A.vox ?? [],
    voxAt = (t, w = Math.min(0.05, beat / 8)) => {
      let best = null;
      for (const o of vox) {
        if (o.t < t - w) continue;
        if (o.t > t + w) break;
        if (!best || Math.abs(o.t - t) < Math.abs(best.t - t)) best = o;
      }
      return best;
    };
  // a note of the tune (Basic Pitch's line) starting at t and held over a beat
  const noteHeld = t => (A.melody ?? []).some(n => Math.abs(n[0] - t) < 0.09 && n[1] >= 1.1 * beat);
  // whether a voice may lead an act: not a drop or a solo, and sung on the grid there (half its syllables at least)
  const leads = new Map(),
    voiceLeads = a => {
      if (!leads.has(a)) {
        const sy = vox.filter(v => v.t >= a.t0 && v.t < a.t1),
          b0 = A.beats[0] ?? 0,
          on = sy.filter(v => Math.abs(((v.t - b0) / (beat / 2)) % 1 > 0.5 ? (((v.t - b0) / (beat / 2)) % 1) - 1 : ((v.t - b0) / (beat / 2)) % 1) * (beat / 2) <= Math.min(0.05, beat / 8)).length;
        leads.set(a, a.kind !== 'drop' && a.kind !== 'solo' && sy.length >= 4 && on >= sy.length * 0.5);
      }
      return leads.get(a);
    };
  // a loud held note from t for about d seconds: loud, few onsets
  const held = (t, d) => {
    let e = 0,
      f = 0,
      c = 0;
    for (let u = t; u < t + d; u += 1 / fps) {
      e += sampleEnv(A.env.rms, u, fps);
      f += sampleEnv(A.env.flux, u, fps);
      c++;
    }
    return e / c > 0.4 && f / c < A.fluxMed * 1.05;
  };

  // a note held from t: the melody's band (mids and highs: voice, pads, leads, not the drums' quick decay) staying up
  // with no new attack in it, how long, in whole beats (0 if under two); the hold notes' rule (osu!mania, DDR freezes):
  // from a sustained sound only, a beat or more long, its end on the grid
  const sustain = t => {
    const m0 = Math.max(sampleEnv(A.env.mid, t + 0.05, fps), sampleEnv(A.env.high, t + 0.05, fps));
    if (m0 < (sign === 'voice' ? 0.22 : 0.3)) return 0;
    let u = t + beat / 2;
    for (; u < t + beat * 4; u += 1 / fps) {
      const m = Math.max(sampleEnv(A.env.mid, u, fps), sampleEnv(A.env.high, u, fps));
      if (m < Math.max(0.28, m0 * 0.55) || sampleEnv(A.env.fMid, u, fps) > 0.6) break;
    }
    const n = Math.floor((u - t) / beat + 0.25);
    return n >= 2 ? n * beat : 0;
  };

  // the bass held from t (an 808 or a sustained low note): the low band staying up with no new kick, in whole beats
  const lowHeld = t => {
    const l0 = sampleEnv(A.env.low, t + 0.06, fps);
    if (l0 < (sign === 'wobble' ? 0.3 : 0.45)) return 0;
    let u = t + beat / 2;
    for (; u < t + beat * 4; u += 1 / fps) if (sampleEnv(A.env.low, u, fps) < Math.max(0.35, l0 * 0.6) || sampleEnv(A.env.fLow, u, fps) > 0.5) break;
    const n = Math.floor((u - t) / beat + 0.25);
    return n >= 2 ? n * beat : 0;
  };

  // ---- the song's star (stars.js): the move this song is about, brought in, built up, turned on its drops and played out
  // at its end (Nintendo's introduce, develop, twist, conclude), so that every song plays differently, not only looks so
  const SP = starPlan(A, P, plan.acts, { locked, force: forceStars, avoid: avoidStars }),
    rs = mulberry((A.seed ?? 1) ^ 0x57a2);
  // (whether a slot at t, in a bar of kind `kind`, is asked to be one of the song's stars, and which)
  const starAt = (t, kind) => {
    const ph = SP.phaseAt(t),
      // (the props are the level's own pass, below: not asked of a slot)
      ks = SP.kindsAt(t).filter(q => !PROPS.has(q));
    if (!ks.length) return null;
    const k = ks[Math.floor(rs() * ks.length)],
      // (a move that lasts (a dash, a swing, a hold) fits only a bar's first slots: asked for more often where it can be)
      rate = (kind === 'calm' ? 0.15 : STAR_RATE[ph]) * (LASTING.has(k) ? 1.8 : 1);
    return rs() < rate ? k : null;
  };

  // ---- which obstacle a slot of a bar asks for: the same sound always asks for the same move, so the player plays the
  // song's parts (the charting rule: one sound, one pattern, the whole song through):
  //   kick -> jump (a hard kick: a tall thing and a flip over it); snare -> slide; a snare with a crash or a clap on it
  //   (bright and hard) -> a pane to kick through, or a clone of him to kick out; a held note -> a long ceiling to slide under and hold;
  //   a kick the music holds after (a long note, a breath) or a phrase's last bar sailing into the next -> a gap, in a
  //   build or a drop one with a crane's bar to swing over (one gap, one pane, one hold a bar at most)
  // (a pane or a clone every other bar at most, every bar in a drop: the big moment stays big)
  let kickBar = -9;
  // (what carries the part a moment is in: the drums or the tune, analyze.js parts)
  const tuneAt = t => (A.parts ?? []).find(q => t >= q.t0 && t < q.t1)?.lead === 'melody';
  const kindFor = (s, b, slots, phraseEnd, pat, P) => {
    const after = slots.slice(s.k + 1, s.k + 3),
      quiet = after.length === 2 && after.every(a => a.hi < 0.3 && a.lo < 0.3),
      has = type => pat.some(p => p.type === type),
      gapped = has('hold') || has('grab');
    // (the song's star, where its schedule asks for it and the slot can take it, sung or not: stars.js)
    const st = starAt(s.t, b.kind),
      so = st && starKind(st, s, b, { beat, has, gapped, kick: s.lo * 1.2 >= Math.max(s.mid, s.hi), skins: P, pick: l => pick(r, l), WALL, room: (8 - s.k) * (beat / 2) });
    if (so) return so;
    // (a bar the voice plays: a hard accent of the drums between its syllables a clone; a syllable says the move)
    if (s.sing && !s.vx) {
      if (has('foe') || has('smash')) return { type: 'jump', h: 0.7, skin: pick(r, P.jump) };
      kickBar = b.i;
      return { type: 'foe', h: 1.8, skin: 'clone' };
    }
    if (s.sing) {
      const v = s.vx,
        held = Math.max(1.5 * beat, Math.round(v.held / (beat / 2)) * (beat / 2));
      // (a note held over a beat: a bar to swing on over a gap, a beat and a half at least; one the voice falls into, low,
      // a ceiling to slide under, held)
      if (v.held >= 1.1 * beat && !gapped && !has('long')) {
        const dur = Math.min(held, 3 * beat, (8 - s.k) * (beat / 2) + beat);
        return v.dir < 0 && !v.high ? { type: 'long', dur, skin: 'ceiling' } : { type: 'grab', dur, skin: pick(r, P.grab) };
      }
      return v.move === 'jump' ? { type: 'jump', h: 0.7, skin: pick(r, P.jump) } : { type: 'slide', skin: pick(r, P.slide) };
    }
    if (b.kind !== 'calm' && s.k % 4 === 0 && !gapped && ((s.lo > 0.25 && (quiet || held(s.t, beat * 1.5))) || (phraseEnd && s.k === 4))) {
      // (a held note over it in a build or a drop: a long line to ride, left held)
      // (or a rail across it to grind along, down held: one or the other, by the seed)
      // (by the sound, not by chance: the same music asks for the same move: a high held note a line to ride, a low one a
      // rail to grind)
      if ((b.kind === 'drop' || b.kind === 'build') && held(s.t, beat * 2.5)) return s.hi > s.lo ? { type: 'zip', dur: beat * 3, skin: 'line' } : { type: 'grind', dur: beat * 3, skin: 'rail' };
      // (a bar to swing on only where a note is held over the gap)
      if ((b.kind === 'drop' || b.kind === 'build') && (sustain(s.t) || noteHeld(s.t))) return { type: 'grab', dur: beat * 2, skin: pick(r, P.grab) };
      return { type: 'hold', dur: beat * (quiet && s.k === 0 ? 2 : 1.5), skin: 'gap' };
    }
    // (a part the tune carries: its notes are the presses, one instrument the whole part through: a held note a long
    // ceiling, a high note a thing overhead to slide under, a low one a thing underfoot to jump, the level the tune's shape)
    if (s.tune) {
      if (!has('long')) {
        const d = sustain(s.t);
        if (d) return { type: 'long', dur: Math.min(d, (8 - s.k) * (beat / 2) + beat), skin: 'ceiling' };
      }
      const pitch = A.env.pitch?.[Math.min(A.env.pitch.length - 1, Math.floor((s.t + 0.05) * fps))] ?? 0.5;
      return pitch < 0.5 ? { type: 'jump', h: 0.7, skin: pick(r, P.jump) } : { type: 'slide', skin: pick(r, P.slide) };
    }
    const kick = s.lo * 1.2 >= Math.max(s.mid, s.hi);
    // a kick the bass holds after (an 808 ringing on): a gap with a stream of air over it to glide on, up held
    if (kick && s.k % (sign === 'wobble' ? 2 : 4) === 0 && !gapped && b.kind !== 'calm' && s.lo > (sign === 'wobble' ? 0.3 : 0.4)) {
      const d = lowHeld(s.t);
      if (d) return { type: 'glide', dur: Math.min(d, (8 - s.k) * (beat / 2) + beat), skin: 'stream' };
    }
    // an accent (the kick and a snare or a crash struck hard together, on a beat): a clone of him running at him, to kick
    // out (only there: a clone is the song's hardest hit)
    if (b.kind !== 'calm' && s.k % 2 === 0 && s.lo > 0.55 && s.hi > 0.6 && !has('smash') && !has('foe') && !has('chord') && b.i - kickBar >= (b.kind === 'drop' ? 1 : 2) && (kickBar = b.i)) return { type: 'foe', h: 1.8, skin: 'clone' };
    // the hats rolling (sixteenths for a beat and more): a corridor of panes to dash through, right held
    if (!kick && s.k % 4 === 0 && !has('dash') && !has('smash') && !has('foe')) {
      const n = onsets.filter(q => q.band === 'high' && q.t >= s.t - 0.03 && q.t < s.t + beat * 2).length;
      if (n >= (sign === 'trap' ? 5 : 7) && b.kind !== 'calm') return { type: 'dash', dur: beat * 2, h: WALL, skin: pick(r, P.smash) };
    }
    if (!kick && !has('long')) {
      const d = sustain(s.t);
      if (d) return { type: 'long', dur: Math.min(d, (8 - s.k) * (beat / 2) + beat), skin: 'ceiling' };
    }
    if (!kick && b.kind !== 'calm' && ((s.k === 4 && s.mid > 0.55 && s.hi > 0.5) || (s.k % 2 === 0 && s.k !== 0 && s.mid > 0.8 && s.hi > 0.75)) && !has('smash') && !has('foe') && b.i - kickBar >= 2 && (kickBar = b.i)) return { type: 'smash', h: WALL, skin: pick(r, P.smash) };
    // a kick and a snare struck together, loud, in a build or a drop: a chord, two keys at once (one every two bars at
    // most, with the panes and clones): a low thing with a clone behind it (up + kick) or a hanging one (down + kick)
    if (s.k % 2 === 0 && s.k !== 0 && (b.kind === 'drop' || b.kind === 'build' || (sign === 'pump' && b.kind === 'verse')) && s.lo > 0.4 && Math.max(s.mid, s.hi) > 0.35 && !has('chord') && !has('smash') && !has('foe') && b.i - kickBar >= (sign === 'pump' ? 1 : 2) && (kickBar = b.i))
      return s.lo >= Math.max(s.mid, s.hi) ? { type: 'chord', keys: ['jump', 'right'], h: 0.7, skin: pick(r, P.jump) } : { type: 'chord', keys: ['slide', 'right'], h: 0, skin: pick(r, P.slide) };
    // (a slot where the drums do not say which: the melody does, a high note a thing overhead to slide under, a low
    // one a thing underfoot to jump: the level takes the tune's shape)
    const pitch = A.env.pitch?.[Math.min(A.env.pitch.length - 1, Math.floor((s.t + 0.05) * fps))] ?? 0.5,
      up = Math.abs(s.lo - s.hi) < 0.15 ? pitch < 0.5 : kick;
    if (up) {
      const tall = s.lo > 0.75;
      return { type: 'jump', h: tall ? 0.95 : 0.7, tall, skin: pick(r, P.jump) };
    }
    return { type: 'slide', skin: pick(r, P.slide) };
  };

  // ---- obstacles, bar by bar; a bar that sounds like one already seen repeats its pattern
  const obs = [],
    seen = [],
    // from the end of one move to the next press: half a beat (by difficulty; the charting rule: half a beat at least
    // between two different moves)
    GAP = M.rest * DIFFICULTY[difficulty].rest * (sign === 'dream' ? 1.3 : 1),
    // (never two presses closer than two press windows (0.3 s either side): one press can never be judged against the
    // next thing, and each move has room to be seen; a climb's beams and a flight's rings keep their own beat)
    MINGAP = 0.6,
    apart = (p, q) => Math.abs(p - q) >= MINGAP - 1e-6;
  const lastEnd = () => (obs.length ? obs[obs.length - 1].end : -9);
  // a bar's allowance of obstacles, by its absolute intensity (a chill song's drop still breathes; a hard song's drop
  // asks for every beat) and the difficulty; after two dense bars running, one bar to breathe
  const D = DIFFICULTY[difficulty],
    allowance = b => Math.max(1, Math.min(6, Math.round((1.1 + 4 * b.intensity) * D.density)));
  // the flights (modes.js: a verse a voice carries): from a beat into the act to a beat before its end, on one run
  // stretch, two bars at least; in one, rings at the melody's height instead of obstacles (three heights, as a shaft
  // has three lanes), one every beat or two where a note starts
  const flights = [],
    // (eight bars of flight a song at most over its verses, whatever goes on with their play; a solo its own)
    budget = { verse: 32 * beat, solo: 32 * beat };
  for (const a of plan.acts) {
    if (a.mode !== 'fly') continue;
    const kind = a.kind === 'solo' ? 'solo' : 'verse';
    // (on every run stretch of the verse: a shaft in the middle of it is fallen or flown up, and he takes off again)
    for (const sg of segs) {
      if (sg.kind !== 'run' || sg.t1 <= a.t0 || sg.t0 >= a.t1) continue;
      // (the whole verse, down again a bar before the song's end: he wins on his feet)
      // (eight bars at most: a long verse flown whole is a sky with nothing in it; he lands and runs the rest of it)
      const t0 = Math.max(a.t0 + beat, sg.t0 + 2 * beat),
        t1 = Math.min(a.t1 - beat, sg.t1 - beat, A.dur - 4 * beat, t0 + budget[kind]);
      if (t1 - t0 < 8 * beat) continue;
      // (a flight straight after another on the same stretch is the same flight: no landing and taking off between)
      const prev = flights.at(-1);
      if (prev && prev.seg === sg && t0 - prev.t1 < 4 * beat) prev.t1 = Math.min(Math.max(prev.t1, t1), prev.t0 + 32 * beat);
      else flights.push({ t0, t1, seg: sg, solo: a.kind === 'solo' });
      budget[kind] -= t1 - t0;
    }
  }
  const flightAt = t => flights.find(w => t >= w.t0 - beat && t < w.t1 + beat);
  flownAt = flightAt;
  // (down from a flight (a beat after it ends) a landing's beat and a half of clear roof, as off a shaft: a drop or its
  // set piece just after a flight starts after it)
  const offFlight = t => flights.some(w => t >= w.t1 && t < w.t1 + 2.5 * beat);
  // (each shaft a step further than the last, Thumper's way: the first only hazards in his lane, the second gates too,
  // from the third storms to hold through as well; `tier` also tells the hazards how much to move, render)
  let shaftN = 0;
  for (const sg of segs) {
    if (vertical(sg)) {
      const tier = Math.min(2, shaftN++);
      // a climb (the tic-tac: Prince of Persia's, Vector's): a rise onto a drop is climbed up the shaft's two walls, a
      // push off one to the other on the beat, a diagonal swipe up and across; the last carries him out over the top.
      // The song owns the climb: where he is and when does not depend on the presses, only how he gets there (run.js)
      // (the whole rise climbed, from the shaft's floor, at one steady pace: a push on every beat (every other one in a
      // fast song, over 140 a minute, so a crossing never snaps), the first a couple of beats off the floor)
      if (sg.climbs) {
        // (no shaft walls: the road ends over a drop, and the cursor sets up beams for him to go up, one on this side,
        // the next higher on the other: on the road's last beat he leaps at the first, a diagonal swipe up and towards
        // it, then from each beam to the next on the beat, each beam breaking up as he leaves it; the last leap carries
        // him out onto the roof above. The beams stand as far apart as a leap carries him in a beat (a quick song's
        // closer); a push on every beat, every other one over 140 a minute)
        const every = 60 / beat > 140 ? 2 : 1,
          // (the last push two beats before the top at least: the finish is a leap at the roof's face and a climb up it)
          ticks = A.beats.filter(t => t >= sg.t0 - 0.01 && t <= sg.t1 - 2 * beat + 0.01).filter((t, k) => k % every === 0);
        // (the first beam on the side he runs to; the last behind the way he runs on, so he leaves it already going
        // that way: one beam fewer when the two do not fit)
        const into = segs[segs.indexOf(sg) - 1]?.dir ?? 1,
          out = segs[segs.indexOf(sg) + 1]?.dir ?? 1,
          sideOf = i => ((i - 1) % 2 ? -into : into);
        if (ticks.length > 3 && sideOf(ticks.length - 1) !== -out) ticks.pop();
        if (ticks.length >= 3) {
          sg.climb = true;
          sg.wall = Math.max(1.1, Math.min(2.3, (6.5 * (every * beat - 0.1)) / 2));
          ticks.forEach((t, i) => {
            // (the road's edge: no beam, a leap towards the first; each beam: a push towards the other side)
            const side = i ? sideOf(i) : 0,
              to = i ? -side : into;
            obs.push({ t, type: 'tic', side, floor: !i, k: i, keys: ['jump', to > 0 ? 'right' : 'left'], f: i / ticks.length, end: t + 0.1, h: 0, tier });
          });
          continue;
        }
      }
      // lanes: every few beats (by difficulty) that have something in them, one ledge in one of three lanes (two are
      // always free, so seeing where the cursor puts it is enough to get out of its way); often the lane he is in
      let free = 1,
        zoned = false;
      const ledges = PLACES[sg.place].skins.hazard;
      const b0 = sg.bars[0].i;
      for (let bi = b0 + 2; bi < b0 + sg.bars.length * 4 - 1; bi++) {
        const t = A.beats[bi];
        if (t === undefined || t >= sg.t1 - beat) break;
        const s = near(t, 'low') + near(t, 'high');
        if (s < 0.15 && bi % 2) continue;
        // a held note: a stretch to dive through (down held) or, flying up, to float through (up held), no ledges in it
        // (and one in every shaft two bars long or more: on its second bar's downbeat, two beats, through the riser)
        const room = t + beat * 3 < sg.t1 - beat,
          d = room ? sustain(t) || lowHeld(t) || (!zoned && bi - b0 >= 4 && (bi - (A.bar0 ?? 0)) % 4 === 0 ? beat * 2 : 0) : 0;
        if (d && tier >= 2 && (r() < 0.6 || !zoned)) {
          zoned = true;
          const dur = Math.min(d, beat * 3);
          obs.push({ t, type: 'zone', key: sg.kind === 'fall' ? 'slide' : 'jump', dur, end: t + dur, h: 0, tier });
          bi += Math.round(dur / beat) + DIFFICULTY[difficulty].laneEvery - 1;
          continue;
        }
        // (always in the lane he is in: every hazard of a shaft asks for a move; the way out by the tune, up or down it)
        const lane = free,
          next = lane === 1 ? (s > 0.5 ? 2 : 0) : 1;
        // on a strong beat, often a gate: a wall across all of it but the one way through (where he must get to)
        if (s > 0.5 && r() < 0.45 && tier >= 1) obs.push({ t, type: 'gate', lanes: [0, 1, 2].filter(l => l !== next), free: next, end: t + 0.1, h: 0.45, skin: pick(r, ledges), tier });
        else obs.push({ t, type: 'lane', lanes: [lane], free: next, end: t + 0.1, h: 0.45, skin: pick(r, ledges), tier });
        free = next;
        bi += DIFFICULTY[difficulty].laneEvery - 1;
      }
      continue;
    }
    for (const b of sg.bars) {
      // (two bars in, and five seconds at least: a song whose grid starts at once still gives him time to get going)
      if (b.t0 < Math.max(start + 2 * 4 * beat, 5) || flightAt(b.t0) || flightAt(b.t1 - 0.01)) continue;
      // the bar's sound in 8 half-beat slots: kick strength and snare/hat strength, coarse
      const slots = [];
      for (let k = 0; k < 8; k++) {
        const t = b.t0 + (k * beat) / 2;
        slots.push({ t, k, lo: near(t, 'low'), hi: Math.max(near(t, 'mid'), near(t, 'high')), mid: near(t, 'mid'), ld: near(t, 'lead'), tune: tuneAt(t), vx: voxAt(t) });
      }
      // (a part the tune carries: its notes say where the presses go, the drums only fill)
      const tune = slots[0].tune,
        // (a bar a voice sings two syllables in at least, in an act the voice may lead: the voice plays it)
        voxN = slots.filter(q => q.vx).length,
        sung = voiceLeads(actAt(acts, b.t0)) && voxN >= 2,
        // (a hard accent of the drums: the kick and a snare or a crash struck hard together, on a beat)
        accent = q => b.kind !== 'calm' && q.k % 2 === 0 && q.lo > 0.55 && q.hi > 0.6 && b.i - kickBar >= (b.kind === 'drop' ? 1 : 2),
        // (quick moves where the music is quick: a sung bar, a drop, a part the tune carries)
        quick = sung || tune || b.kind === 'drop';
      for (const q of slots) q.sing = sung;
      const phraseEnd = (b.i - (A.bar0 ?? 0)) % 16 === 12,
        // (a breath on the last bar of each eight in a busy part: by where the bar is in its phrase, so a phrase heard
        // again breathes in the same place)
        // (a sung bar as many presses as syllables, a beat or so apart; a drop one more than its loudness alone gives)
        // (a drop two more than its loudness alone gives, a build one more: the music's peaks are where the hands are busiest)
        base = sung ? Math.min(voxN, allowance(b) + 1, 5) : allowance(b) + (b.kind === 'drop' ? 2 : b.kind === 'build' ? 1 : 0),
        c = base - ((b.i - (A.bar0 ?? 0)) % 8 === 7 && base >= 3 ? 1 : 0),
        // (the bar's sound, slot by slot: what it is like to another bar)
        vec = slots.flatMap(q => [q.lo, q.mid, q.hi, q.ld]);
      const print = slots.map(s => `${Math.min(2, Math.floor((tune ? s.ld : s.lo) * 2.5))}${Math.min(2, Math.floor(s.hi * 2.5))}`).join('') + b.kind[0] + c + (phraseEnd ? 'P' : '') + (tune ? 'T' : '') + (sung ? 'V' + slots.map(q => (q.vx ? q.vx.move[0] + (q.vx.held >= 1.25 * beat ? 'h' : '') : '.')).join('') : '');
      // (a bar that sounds like one already played plays its pattern again, exactly: the same music, the same presses)
      // (the most alike one: very alike whatever the part, or alike in a part of the same kind; however loud it is now)
      let best = null,
        bestS = 0;
      for (const p of seen) {
        const sim = p.print === print ? 1 : cosine(p.vec, vec);
        if ((sim >= 0.9 || (p.kind === b.kind && sim >= 0.84)) && sim > bestS) [best, bestS] = [p, sim];
      }
      let pat = best?.pat;
      if (!pat) {
        pat = [];
        // (a sung bar only on its syllables, the held ones and those on a beat first; a part the tune carries on its notes,
        // off the beat too)
        const order = slots
            .filter(s => (sung ? s.vx || accent(s) : s.k % 2 === 0 || c >= 3 || (tune && s.ld > 0.3)))
            .map(s => ({ ...s, score: sung ? 1 + (s.vx ? (s.vx.held >= 1.25 * beat ? 0.4 : 0) : 0.3) + (s.k % 2 === 0 ? 0.15 : 0) + r() * 0.05 : (tune ? s.ld * 1.2 : Math.max(s.lo * 1.1, s.hi)) + (s.k % 2 === 0 ? 0.15 : 0) + (s.k === 0 ? 0.1 : 0) + r() * 0.05 }))
            .sort((a, c2) => c2.score - a.score);
        for (const s of order) {
          if (pat.length >= c) break;
          // (a weak slot only on a beat, and only to make up the bar's allowance)
          if (s.score < 0.22 && s.k % 2 === 1) continue;
          const fits = o => pat.every(p => apart(o.rel, p.rel) && (o.rel >= p.rel + KINDS[p.type].post(M, p) + GAP || p.rel >= o.rel + KINDS[o.type].post(M, o) + GAP));
          // (v: its take of the move, anim.js)
          const o = { rel: s.t - b.t0, v: r(), ...kindFor(s, b, slots, phraseEnd, pat, PLACES[placeAt(b.t0)].skins) };
          // (a quick bar's things to jump or slide under asked for quickly first: a hop, a duck; lengthened below)
          // (and a busy bar's, a build's: three presses or more a bar want the quick ones too)
          if ((quick || c >= 3 || b.kind === 'build') && o.type === 'jump') o.air = M.hop;
          if ((quick || c >= 3 || b.kind === 'build') && o.type === 'slide') o.slide = M.duck;
          if (fits(o)) pat.push(o);
        }
        if (!pat.length) {
          const s = slots[0],
            type = s.hi > s.lo ? 'slide' : 'jump';
          pat.push({ rel: 0, type, skin: pick(r, PLACES[placeAt(b.t0)].skins[type]), h: type === 'jump' ? 0.7 : 0 });
        }
        pat.sort((a, c2) => a.rel - c2.rel);
        // (each quick move as long as the room before the next press lets it, on the grid, up to the usual length: a hop
        // only where the music gives no more)
        pat.forEach((p, i) => {
          const room = (pat[i + 1]?.rel ?? 4 * beat) - p.rel - GAP;
          if (p.air !== undefined) p.air = Math.max(M.hop, Math.min(M.air, Math.floor(room / M.grid + 1e-6) * M.grid));
          if (p.slide !== undefined) p.slide = Math.max(M.duck, Math.min(M.slide, Math.floor((room - 0.1) / M.grid + 1e-6) * M.grid));
          if (p.air >= M.air) delete p.air;
          if (p.slide >= M.slide) delete p.slide;
        });
        seen.push({ print, kind: b.kind, c, vec, pat });
      }
      // (a landing gets a beat and a half of clear roof, off a shaft or a flight)
      // (and a move is over before the next flight takes him up: a slide still running when he takes off is cut short)
      const room = (p, t) =>
        t >= Math.max(lastEnd() + GAP, clearAt(sg)) &&
        !offFlight(t) &&
        !obs.some(q => !FREEBEAT.has(q.type) && !apart(q.t, t)) &&
        t + KINDS[p.type].post(M, p) <= Math.min(sg.t1 - 0.1, finale ? finale.t0 - beat : 1e9, (flights.find(w => w.t0 - beat > t)?.t0 ?? 1e9) - beat);
      for (const p of pat) {
        const t = b.t0 + p.rel;
        if (room(p, t)) obs.push({ ...p, t, end: t + KINDS[p.type].post(M, p), kind: b.kind, bar: b.i, print });
      }
    }
  }
  // (a solo's string: its rings on the solo's own notes, each on the half-beat grid, a beat apart at least, at the note's
  // pitch; strung in order, so the line of light between them is the solo's tune)
  const ringLane = (t, lane) => {
    const i = Math.min((A.env.pitch?.length ?? 1) - 1, Math.floor((t + 0.05) * fps)),
      p = A.env.pitch?.[i] ?? 0.5,
      want = p > 0.62 ? 2 : p < 0.38 ? 0 : 1;
    // (one lane at a time, so each ring is a press away from the last)
    return want > lane ? lane + 1 : want < lane ? lane - 1 : lane === 1 ? (r() < 0.5 ? 0 : 2) : 1;
  };
  // (the flights in order, the rings of one carried on into the next when he stays up between them: the height he is
  // at goes on, so the next ring is a press away)
  let lane = 1,
    last = -9;
  for (const w of [...flights].sort((p, q) => p.t0 - q.t0)) {
    if (w.t0 - last > 4 * beat) lane = 1;
    if (w.solo) {
      // (on the solo's own notes, each on the half-beat grid, a beat apart at least)
      const grid = beat / 2,
        b0 = A.beats[0] ?? 0;
      let n = 0;
      for (const o of onsets) {
        if (o.band !== 'lead' || o.t < w.t0 + 2 * beat || o.t > w.t1 - beat) continue;
        const t = b0 + Math.round((o.t - b0) / grid) * grid;
        if (t - last < beat) continue;
        lane = ringLane(t, lane);
        obs.push({ t, type: 'ring', lane, end: t + 0.1, h: 0, solo: true, note: n++ });
        last = t;
      }
      continue;
    }
    // (a verse with the voice heard: a ring on each of its syllables, on the half-beat grid, a beat apart at least, a lane
    // up where the voice goes up, down where it goes down)
    const sy = vox.filter(v => v.t >= w.t0 + 2 * beat && v.t <= w.t1 - beat);
    if (sy.length >= (w.t1 - w.t0) / beat / 4) {
      const grid = beat / 2,
        b0 = A.beats[0] ?? 0;
      // (and where the voice rests more than two beats, rings on the beats between, at the tune's height: never an empty
      // sky)
      const ring = t => {
        obs.push({ t, type: 'ring', lane, end: t + 0.1, h: 0 });
        last = t;
      };
      const fill = until => {
        for (const t of A.beats) if (t > last + 1.9 * beat && t < until - 1.5 * beat && t > w.t0 + 2 * beat) ((lane = ringLane(t, lane)), ring(t));
      };
      for (const v of sy) {
        const t = b0 + Math.round((v.t - b0) / grid) * grid;
        if (t - last < beat) continue;
        fill(t);
        lane = v.dir > 0 && lane < 2 ? lane + 1 : v.dir < 0 && lane > 0 ? lane - 1 : ringLane(t, lane);
        ring(t);
      }
      fill(w.t1);
      continue;
    }
    for (const t of A.beats) {
      if (t < w.t0 + 2 * beat || t > w.t1 - beat || t - last < beat * 1.5) continue;
      // (where a note starts; and never three beats without one, so a quiet line of the verse is not an empty sky)
      const s = near(t, 'mid') + near(t, 'high') + near(t, 'low');
      if (s < 0.25 && t - last < beat * 2.9) continue;
      lane = ringLane(t, lane);
      obs.push({ t, type: 'ring', lane, end: t + 0.1, h: 0 });
      last = t;
    }
  }
  obs.sort((p, q) => p.t - q.t);
  // ---- the song's dramaturgy round its drops, and its signature (a set piece of its own on every drop's start):
  // the bar before a drop is left empty (the world holds its breath: director.js zooms in through it), and the drop's
  // first beat is a hit; then the song's own set piece (one of PIECES, by its seed: the same in each of its drops, so it
  // is what this song is remembered by) over the drop's first two bars
  const rp = mulberry((A.seed ?? 1) ^ 0x5e7a),
    piece = PIECE_NAMES[Math.floor(rp() * PIECE_NAMES.length)],
    onRunAt = t => {
      const sg = segs.find(q => t >= q.t0 && t < q.t1);
      return sg && !vertical(sg) ? sg : null;
    },
    fitsAt = o => {
      const sg = onRunAt(o.t);
      if (!sg || o.t < clearAt(sg) || offFlight(o.t) || o.end > sg.t1 - 0.1 || (finale && o.end > finale.t0 - beat)) return false;
      return obs.every(q => (q.end + GAP <= o.t || o.end + GAP <= q.t) && (FREEBEAT.has(q.type) || FREEBEAT.has(o.type) || apart(q.t, o.t)));
    };
  for (const a of plan.acts) {
    if (a.kind !== 'drop' || a.mode === 'boss' || a.mode === 'fly' || a.t0 < start + 8 * beat || !onRunAt(a.t0)) continue;
    const b = A.bars.find(q => q.t0 >= a.t0 - 0.01);
    for (let k = obs.length - 1; k >= 0; k--) if (obs[k].t >= a.t0 - 4 * beat && obs[k].t < a.t0 + 8 * beat && onRunAt(obs[k].t)) obs.splice(k, 1);
    // (landed on from a shaft: the landing is the drop's first hit, fallen into a cracked plate he slams down onto (↓ on
    // the drop's beat) or flown up into a lid over the shaft he bursts up through (↑), and the set piece a beat later,
    // its first thing on the drop's second beat)
    const ls = segs.find(q => q.kind === 'run' && q.t0 > 0 && Math.abs(q.t0 - a.t0) < 0.05 && vertical(segs[segs.indexOf(q) - 1] ?? q)),
      landed = ls ? 1 : 0;
    // (a climb ends out over the top by its own last push: no lid to burst)
    if (ls && !segs[segs.indexOf(ls) - 1].climb) {
      const up = segs[segs.indexOf(ls) - 1].kind === 'rise';
      obs.push({ t: a.t0, type: up ? 'hatch' : 'stomp', land: true, h: 0, end: a.t0 + 0.3, kind: 'drop', bar: b?.i, print: `land:${piece}` });
      obs.sort((p, q) => p.t - q.t);
    }
    for (const [at, type, extra] of PIECES[piece]) {
      const t = a.t0 + (at + landed) * beat,
        skins = PLACES[placeAt(t)].skins,
        base = type === 'chordjump' ? { type: 'chord', keys: ['jump', 'right'], h: 0.7, skin: pick(rp, skins.jump) } : type === 'chordslide' ? { type: 'chord', keys: ['slide', 'right'], h: 0, skin: pick(rp, skins.slide) } : type === 'foe' || type === 'foeback' ? { type, h: 1.8, skin: 'clone' } : { type, h: type === 'jump' ? (extra?.tall ? 0.95 : 0.7) : type === 'smash' || type === 'dash' ? WALL : 0, skin: pick(rp, skins[type === 'dash' ? 'smash' : type] ?? skins.jump), ...extra },
        o = { ...base, v: rp(), t, kind: 'drop', bar: b?.i, print: `piece:${piece}:${at}`, piece };
      if (o.dur) o.dur *= beat;
      o.end = t + KINDS[o.type].post(M, o);
      if (fitsAt(o)) {
        obs.push(o);
        obs.sort((p, q) => p.t - q.t);
      }
    }
  }
  // a part of the song heard again (a chorus come back: its bars sound as an earlier act's did) is played again harder:
  // every third thing to jump or slide gets a clone behind it to kick in the same press (two at once)
  const heard = a => new Set(obs.filter(o => o.t >= a.t0 && o.t < a.t1 && o.print && !o.piece).map(o => o.print));
  plan.acts.forEach((a, i) => {
    if (a.mode === 'fly' || a.mode === 'boss' || a.mode === 'brawl') return;
    const mine = heard(a);
    if (mine.size < 3) return;
    // (a bar sounds like another's when its print is all but the same: hamming 2 at most, as bars repeat above)
    const like = (x, ys) => [...ys].some(y => y.length === x.length && hamming(x, y) <= 2),
      again = plan.acts.slice(0, i).some(q => {
        const theirs = heard(q);
        return [...mine].filter(x => like(x, theirs)).length >= mine.size * 0.5;
      });
    // (heard again: marked, and its looks change with its act; its presses stay those of the first time)
    if (again) a.reprise = true;
  });
  // a brawl (modes.js): every kick a clone running at him from in front (→), every snare one coming up behind him (←)
  for (const o of obs) {
    if (modeAt(o.t) !== 'brawl' || vertical(segs.find(q => o.t >= q.t0 && o.t < q.t1))) continue;
    // (its looks only: what is kicked is a clone; a jump stays a jump, a slide a slide)
    if (o.type === 'smash') Object.assign(o, { type: 'foe', h: 1.8, skin: 'clone', tall: false });
    o.end = o.t + KINDS[o.type].post(M, o);
  }
  // each act its own obstacles of the place (acts.js): a pattern heard again in a later act wears that act's looks (the
  // place's looks of each kind take turns through the acts, now and then another for variety)
  const rk = mulberry((A.seed ?? 1) ^ 0x5c1e);
  // (the first two bars of each breakdown and each verse after a drop are left to the player: a freestyle window, below)
  for (const a of acts)
    if (a.i && (a.kind === 'break' || a.kind === 'verse'))
      // (not a flight's rings: each is a press away from the one before, one left out would leave him a height off)
      for (let k = obs.length - 1; k >= 0; k--) if (obs[k].t >= a.t0 && obs[k].t < a.t0 + 8 * beat && obs[k].type !== 'ring' && !vertical(segs.find(q => obs[k].t >= q.t0 && obs[k].t < q.t1))) obs.splice(k, 1);
  for (const o of obs) {
    const skins = PLACES[placeAt(o.t)].skins,
      list = Object.values(skins).find(l => l.includes(o.skin)) ?? skins[o.type === 'chord' ? o.keys[0] : o.type];
    if (!list) continue;
    // (a pattern heard first in the place before the rewrite wears the new place's looks after it)
    if (!list.includes(o.skin)) o.skin = list[0];
    if (list.length < 2) continue;
    o.skin = list[(actAt(acts, o.t).i + (rk() < 0.25 ? 1 + Math.floor(rk() * (list.length - 1)) : 0)) % list.length];
  }
  // ---- the moves he has not unlocked yet (meta.js) swapped for plainer ones: a chord for its first thing, a glide or
  // a line or a rail for a gap, a corridor for one pane
  for (const o of obs) {
    if (!locked.includes(o.type)) continue;
    if (o.type === 'chord') Object.assign(o, { type: o.keys[0], h: o.keys[0] === 'jump' ? 0.7 : 0, keys: undefined, skin: pick(r, PLACES[placeAt(o.t)].skins[o.keys[0]]) });
    else if (o.type === 'dash') Object.assign(o, { type: 'smash', dur: undefined, skin: pick(r, PLACES[placeAt(o.t)].skins.smash) });
    else Object.assign(o, { type: 'hold', dur: Math.min(o.dur, beat * 1.5), skin: 'gap' });
    o.end = o.t + KINDS[o.type].post(M, o);
  }
  // ---- the song's character at work (character.js) on what has been laid
  const onRun = o => !vertical(segs.find(q => o.t >= q.t0 && o.t < q.t1)),
    inAct = (o, a) => o.t >= a.t0 && o.t < a.t1,
    rc = mulberry((A.seed ?? 1) ^ 0x7c0e);
  // an echo song: a bar played again right after itself comes back unseen (the cursor does not draw it): played from
  // memory of the bar before (call and response); never two such bars running
  if (sign === 'echo') {
    let lastEcho = -9;
    for (const bi of [...new Set(obs.filter(o => o.bar !== undefined && o.kind !== 'drop').map(o => o.bar))]) {
      const here = obs.filter(o => o.bar === bi),
        before = obs.filter(o => o.bar === bi - 1);
      if (bi - lastEcho < 2 || bi < 8 || !before.length || here[0].print !== before[0].print || here.length !== before.length) continue;
      for (const o of here) o.echo = true;
      lastEcho = bi;
    }
  }
  // the boss's act: every other thing on a run a fist of it slamming down at him, to be kicked back (the boss's life)
  const bossAct = plan.acts.find(a => a.mode === 'boss'),
    boss = bossAct ? { name: ch.boss, t0: bossAct.t0, t1: bossAct.t1, hp: 0 } : null;
  if (boss) {
    for (const o of obs)
      if (inAct(o, bossAct) && onRun(o) && (o.type === 'smash' || o.type === 'foe')) {
        Object.assign(o, { type: 'foe', h: 1.8, skin: 'fist', tall: false });
        o.end = o.t + KINDS.foe.post(M, o);
        boss.hp++;
      }
  }
  // (a boss with nothing to throw at him is no boss: its act is a drop like the others)
  const bossOn = boss?.hp ? boss : null;
  // a cursor chase: every fourth thing a piece of the fleeing cursor dropped in his way, to be kicked to bits
  for (const a of plan.acts) {
    if (a.mode !== 'cursorchase') continue;
    let k = 0;
    for (const o of obs)
      if (inAct(o, a) && onRun(o) && o.type === 'smash' && k++ % 2 === 1) {
        Object.assign(o, { type: 'foe', h: 1.8, skin: 'bit', tall: false });
        o.end = o.t + KINDS.foe.post(M, o);
      }
  }
  // the cursor's error windows: in its act, its panes are error dialogs, and every third thing to jump becomes one
  // (where there is room for the kick)
  // (and its lasso: every third thing to jump cut out of the roof, a gap, where there is room for the long jump)
  for (const tl of ch.tools) {
    if (tl.tool !== 'lasso') continue;
    let k = 0;
    obs.forEach((o, i) => {
      if (!inAct(o, tl) || !onRun(o) || o.type !== 'jump' || k++ % 3 !== 1) return;
      const dur = beat * 1.5;
      if ((obs[i + 1]?.t ?? 1e9) < o.t + dur + GAP) return;
      Object.assign(o, { type: 'hold', dur, skin: 'gap', h: 0, tall: false, air: undefined });
      o.end = o.t + dur;
    });
  }
  for (const tl of ch.tools) {
    if (tl.tool !== 'errors') continue;
    obs.forEach(o => {
      if (!inAct(o, tl) || !onRun(o)) return;
      if (o.type === 'smash') o.skin = 'error';
    });
  }
  // forks: in a drop eight bars long or more, from its fifth bar, a gold gate a bar before it (a thing to jump or slide under made the gate,
  // where there is room for a kick): kicked, the next four bars are the hard route (each thing doubled with a clone
  // behind it: two keys at once, twice the points); left standing, the easy one. Both are laid; the run skips the other
  const forks = [];
  for (const a of plan.acts) {
    if (a.kind !== 'drop' || a.mode === 'boss' || a.mode === 'brawl' || a.t1 - a.t0 < 8 * 4 * beat || rc() < 0.3) continue;
    const t0 = a.t0 + 4 * 4 * beat,
      t1 = t0 + 4 * 4 * beat,
      gi = obs.findLastIndex(o => o.t < t0 - beat && o.t > t0 - 5 * beat && (o.type === 'jump' || o.type === 'slide') && onRun(o)),
      gate = obs[gi];
    if (!gate || (obs[gi + 1]?.t ?? 1e9) < gate.t + KINDS.smash.post(M, gate) + GAP) continue;
    const id = forks.length,
      // (not a quick one: doubled into a chord it would take its full time and run into the next)
      easy = obs.filter(o => o.t >= t0 && o.t < t1 && (o.type === 'jump' || o.type === 'slide') && !o.air && !o.slide && onRun(o));
    if (easy.length < 3) continue;
    Object.assign(gate, { type: 'smash', h: WALL, skin: 'fork', fork: id, tall: false });
    gate.end = gate.t + KINDS.smash.post(M, gate);
    for (const o of easy) {
      o.easy = id;
      obs.push({ ...o, easy: undefined, hard: id, type: 'chord', keys: [o.type, 'right'], h: o.type === 'jump' ? 0.7 : 0, star: undefined });
    }
    forks.push({ id, t0, t1, gate });
  }
  // the stomp (Thumper's): in a drop, over a thing to jump with room after it, a cracked plate where he comes down, to
  // dive onto from the air on the grid point halfway through the jump (one every two bars at most)
  {
    const half = beat / 2,
      b0 = A.beats[0] ?? 0,
      snapHalf = t => b0 + Math.round((t - b0) / half) * half;
    let lastBar = -9;
    obs.sort((p, q) => p.t - q.t);
    for (let k = 0; k < obs.length; k++) {
      const o = obs[k],
        next = obs[k + 1];
      if (o.type !== 'jump' || o.air || o.kind !== 'drop' || !['run', 'turbo', 'brawl'].includes(modeAt(o.t)) || (o.bar ?? 0) - lastBar < 2) continue;
      // (the dive only once he is over the thing he jumped: past its pass point)
      const over = o.t + KINDS.jump.passAt(M, o) + 0.12,
        t = snapHalf(Math.max(over, o.t + M.air * 0.5));
      if (t < over || t > o.t + M.air - 0.1 || (next && next.t < t + 0.3 + GAP + M.slide)) continue;
      obs.splice(k + 1, 0, { t, type: 'stomp', h: 0, end: t + 0.3, kind: 'drop', bar: o.bar });
      lastBar = o.bar ?? 0;
    }
  }
  // islands (a change of road, not a big moment): where the beat goes on unchanged (the kick drum on all four beats
  // of a bar, the drums' hiss over it, a bar of it already heard), the next bar or two of the run (four kicks or eight)
  // are cut out by the cursor and break into small islands floating at the tune's heights, stepping stones he bounds
  // across on the kick, one key (up) for all of them: he takes off on a kick and is in the air until the next, touches
  // down on its island on that kick and is off again on it (the press), so every touch is a kick heard (the landing is
  // what the eye takes for the beat; every other kick in a fast song); after the last he lands back on the road at its
  // own height, on the next kick. In a part run on the roof (a plain run, a sprint, a cursor chase; a verse, a calm
  // part, a drop past its first two bars): never in a build or the bar before a drop, a flight, a part played mini, a
  // fork or a freestyle window; two beats clear of a shaft; twelve bars apart, five a song at most. Each leap a gap
  // (hold), its island the stretch of road between it and the next
  const isles = [];
  {
    const ri = mulberry((A.seed ?? 1) ^ 0x15e5),
      half = beat / 2,
      b0 = A.beats[0] ?? 0,
      snapHalf = t => b0 + Math.round((t - b0) / half) * half,
      pitchAt = t => A.env.pitch?.[Math.min(A.env.pitch.length - 1, Math.max(0, Math.floor((t + 0.05) * fps)))] ?? 0.5,
      // (the kick drum's hits: the sub-bass to the fore in the hit, dying away, not the softest)
      drum = (A.kicks ?? []).filter(k => k.dom >= 0.5 && k.decay <= 0.9 && k.s >= 0.15),
      // (and a drum beat over them: the drums' hiss up top (analyze.js env.hiss: hats, snares, claps) in the bar, against
      // the song's own beat; a pad pumping with a sidechain thumps in the sub-bass too, but has none)
      hissOf = b => {
        const h = A.env.hiss;
        if (!h) return 0;
        let s = 0,
          n = 0;
        for (let f = Math.floor(b.t0 * fps); f < Math.min(h.length, Math.floor(b.t1 * fps)); f++) ((s += h[f]), n++);
        return n ? s / n : 0;
      },
      hissBar = bars.map(hissOf),
      hissTop = [...hissBar].sort((a, b) => a - b)[Math.floor(bars.length * 0.8)] ?? 0,
      beatIn = j => hissBar[j] >= Math.max(0.12, 0.6 * hissTop),
      // (the kinds of play that are a run on the roof: plain, a sprint, chasing the cursor)
      RUNS = new Set(['run', 'turbo', 'cursorchase']),
      // (the first two bars of a verse or a break after the first act are the player's own: freestyle, above)
      freeAt = t => acts.some(a => a.i && (a.kind === 'break' || a.kind === 'verse') && t >= a.t0 && t < a.t0 + 8 * beat),
      ok = (i, n, build = false) => {
        const b = bars[i],
          sg = segs.find(q => b && b.t0 >= q.t0 && b.t0 < q.t1);
        if (!b || !sg || sg.kind !== 'run' || b.t0 < start + 8 * 4 * beat || b.t0 < clearAt(sg)) return null;
        const t1 = bars[i + n - 1]?.t1;
        if (t1 === undefined || t1 + 2 * beat > sg.t1 || (finale && t1 + 4 * beat > finale.t0)) return null;
        for (let j = i - 1; j <= i + n; j++) if (!bars[j] || bars[j].dropStart || (j >= i && bars[j].kind === 'build' && !build)) return null;
        if (forks.some(fk => fk.gate.t - beat < t1 && fk.t1 > b.t0)) return null;
        for (let j = i; j < i + n; j++) {
          const q = bars[j];
          if (q.kind !== 'verse' && q.kind !== 'calm' && q.kind !== 'drop' && !(build && q.kind === 'build')) return null;
          if (!RUNS.has(modeAt(q.t0)) || !RUNS.has(modeAt(q.t1 - 0.01))) return null;
          if (flightAt(q.t0) || flightAt(q.t1 - 0.01) || miniAt(q.t0) > 0 || miniAt(q.t1 - 0.01) > 0) return null;
          if (freeAt(q.t0)) return null;
        }
        return sg;
      };
    // (a bar of a steady beat: the kick drum on each of its four beats, with the drums' hiss over it)
    const kickOn = t => drum.some(k => Math.abs(k.t - t) < 0.07),
      steady = j => !!bars[j] && beatIn(j) && [0, 1, 2, 3].every(q => kickOn(bars[j].t0 + q * beat)),
      // (a leap on every kick, or on every other one in a fast song: 0.42 s of flight at least)
      step = beat >= 0.42 ? beat : 2 * beat;
    for (let i = 1; i < bars.length && isles.length < 5; i++) {
      if (isles.length && i - isles.at(-1).bar < 12) continue;
      // (only where the beat has gone on unchanged a bar already: a bar of it or two, four kicks or eight)
      if (!steady(i - 1)) continue;
      let n = 0;
      while (n < 2 && steady(i + n)) n++;
      let sg = null;
      for (; n >= 1 && !(sg = ok(i, n)); n--);
      if (!sg) continue;
      const t0 = bars[i].t0,
        t1 = bars[i + n - 1].t1;
      // (the leaps: the stretch's kicks, one a beat (every other in a fast song), from its first beat to a beat before
      // its end; the last back onto the road on the kick after it)
      const kicks = [];
      for (let t = t0; t < t1 - beat + 0.01; t += step) kicks.push(snapHalf(t));
      const airs = kicks.map(() => step);
      // (each island's height from the tune where he lands on it, against the stretch's own: up where the tune goes up,
      // a metre and a half either way at most, never more than 1.3 m from the last, the last 1.2 m from the road; a flat
      // tune still steps up and down, so the islands read as islands)
      const lands = kicks.map((t, k) => t + airs[k]),
        pm = lands.reduce((s, t) => s + pitchAt(t), 0) / lands.length,
        dys = [];
      let prev = 0;
      lands.forEach((t, k) => {
        if (k === lands.length - 1) return dys.push(0);
        let dy = Math.max(-1.6, Math.min(1.6, Math.round(((pitchAt(t) - pm) * 8) / 0.2) * 0.2));
        if (Math.abs(dy - prev) < 0.5) dy = prev + (pitchAt(t) >= pitchAt(lands[k - 1] ?? t) ? 0.7 : -0.7) * (ri() < 0.2 ? -1 : 1);
        dy = Math.max(-1.6, prev - 1.3, Math.min(1.6, prev + 1.3, dy));
        if (k === lands.length - 2) dy = Math.max(-1.2, Math.min(1.2, dy));
        dys.push((prev = Math.round(dy * 10) / 10));
      });
      // (what the bars had in them gives way: from a breath before the first leap to a breath after the last landing)
      const from = kicks[0] - GAP,
        to = lands.at(-1) + GAP;
      if (to > sg.t1 - beat || (finale && to > finale.t0 - beat)) continue;
      for (let k = obs.length - 1; k >= 0; k--) if (obs[k].t < to && (obs[k].end ?? obs[k].t) > from && !vertical(segs.find(q => obs[k].t >= q.t0 && obs[k].t < q.t1))) obs.splice(k, 1);
      const id = isles.length,
        gaps = kicks.map((t, k) => ({ t, type: 'hold', dur: airs[k], skin: 'isle', isle: id, k, dyFrom: k ? dys[k - 1] : 0, dy: dys[k], h: 0, v: ri(), end: t + airs[k], kind: bars[i].kind, bar: barAt(t)?.i ?? bars[i].i }));
      obs.push(...gaps);
      isles.push({ id, bar: i, seg: sg, t0: kicks[0], t1: lands.at(-1), gaps, head: gaps[0] });
    }
    // a ladder of islands (the islands' sibling, a change of road where the tune falls): at the end of a run that goes
    // on into a shaft (down it, or launched or climbing up it), the cursor cuts the road away ahead of him and what is
    // left of it falls apart into islands floating lower and lower, each pasted in ahead of him in time to read it. He
    // leaps off each edge on a kick (up, or up and on: the diagonal), flies a long way down (two beats, three to six
    // metres) and touches down on the next island on a kick, down pressed on the touch (a roll out of it at a run,
    // kinds.js roll); three leaps, and he runs on at the bottom to where the shaft takes him (it starts from there:
    // run.js). The beat it is laid on (`u`): a beat, two in a fast song (a flight that long reads as one); a leap on a
    // bar's first beat, its touch on its third, the next leap on the next bar's first. Each drop as big as the tune
    // falls into its touch. Where an island may be (a plain run, a sprint, a cursor chase; a verse, a calm part, a
    // drop; never a build or the bar before a drop), with a kick on its first leap and every touch, in the phrase whose
    // tune falls most; a bar to three of running left at the bottom before the shaft; twelve bars from any island or
    // other ladder; up to three a song, as many as its seed and its energy give (a calm song none or one, a driving one
    // up to three)
    // a ladder up (its mirror, where the tune rises or builds): the cursor cuts the road away ahead of him the same way
    // and what is left of it rises into islands floating higher and higher, a trampoline on each one's edge (and on
    // the road's): he bounds onto it, it gives under him and on the kick (up, or up and on: the diagonal) it launches
    // him high and far, two beats up over the next island, two to three and a half metres higher, a flip at the top
    // of a long flight, and down onto it on a kick, down pressed on the touch to roll out of it; three, and he runs on
    // on the road above to where the shaft takes him. Where a ladder down may be, a build too, in the phrase whose
    // tune rises most; twelve bars from any island or ladder; up to two a song (the step ups it replaces were two)
    const ladders = (rs, rise) => {
      const u = beat < 0.4 ? 2 * beat : beat,
        air = 2 * u,
        want = Math.min(rise ? 2 : 3, Math.floor(rs() * 1.7 + P.arousal * 2.3)),
        // (a kick heard on the beat: any of the kick drum's hits, or a hit low down, not only the clean ones a steady beat
        // is made of: a flight lands on what thumps)
        thump = t => (A.kicks ?? []).some(k => Math.abs(k.t - t) < 0.07) || onsets.some(o => o.band === 'low' && Math.abs(o.t - t) < 0.07),
        cands = [];
      for (const sg of segs) {
        const next = segs[segs.indexOf(sg) + 1];
        if (sg.kind !== 'run' || !next) continue;
        // (up: anywhere along a run with no flight in it, the road above going on as a stretch of its own (split off at
        // the top, below) a bar at least)
        if (rise && flights.some(w => w.seg === sg)) continue;
        // (the last leap a bar (two in a fast song) before the bars left at the bottom, on a bar's first beat)
        // (or, where the kick is on the bars' first beats, a leap on a bar's third beat and its touch on the next bar's
        // first)
        const lasts = rise ? sg.bars.map(b => b.t0 + 2 * 4 * u) : [1, 2, 3].map(left => sg.t1 - left * 4 * beat - 4 * u);
        // (three leaps; up, two where three do not fit)
        for (const N of rise ? [3, 2] : [3])
          for (const last of lasts.map(t => t - (rise ? (3 - N) * 4 * u : 0)))
            for (const ph of [0, 2 * u]) {
              const tL = last - (rise ? -ph : ph),
                tj = Array.from({ length: N }, (_, m) => snapHalf(tL - (N - 1 - m) * 4 * u)),
                tl = tj.map(t => snapHalf(t + air)),
                from = tj[0] - GAP,
                top = snapHalf(tl.at(-1) + 2 * beat),
                i = bars.findIndex(b => from >= b.t0 && from < b.t1),
                n = bars.findIndex(b => (rise ? top : tl.at(-1)) >= b.t0 && (rise ? top : tl.at(-1)) < b.t1) - i + 1;
              if (rise && top + 4 * beat > sg.t1) continue;
              // (down: the bottom it runs on to the shaft is the ladder's too, at its own height; a flight there would
              // take off from the road's height above it, out of the picture over the islands)
              if (!rise && flights.some(w => w.seg === sg && w.t1 + beat > tj[0] - GAP)) continue;
              // (the first leap off the road and every touch on a kick heard; up, every launch too)
              if (i < 0 || n < 1 || ![tj[0], ...tl, ...(rise ? tj : [])].every(thump) || ok(i, n, rise) !== sg) continue;
              // (how far the tune falls over it (rises, up), touch by touch, from where he leaps off the road)
              // (up: a build under it the more its place)
              const p = [tj[0], ...tl].map(rise ? t => -pitchAt(t) : pitchAt),
                falls = tl.map((_, m) => Math.max(0, p[m] - p[m + 1])),
                builds = rise ? bars.slice(i, i + n).filter(b => b.kind === 'build').length / n : 0;
              cands.push({ i, sg, tj, tl, p, falls, top, score: p[0] - p.at(-1) + 0.5 * falls.reduce((q, x) => q + x, 0) + 0.15 * builds + 0.02 * rs() });
            }
      }
      const picks = [];
      for (const c of cands.sort((x, y) => y.score - x.score)) {
        if (picks.length >= want) break;
        // (up: a stretch with islands on it before the ladder will do, the road above split off it after them)
        // (and up, from a stretch of island hops only a bar clear of it either way: they are another thing)
        const clear = q => (rise && q.gaps?.length ? c.tj[0] - GAP > q.t1 + 4 * beat || c.top + beat < q.t0 - 4 * beat : Math.abs((q.bar ?? q.i) - c.i) >= 12);
        if ([...isles, ...picks].some(q => !clear(q) || q.sg === c.sg || (rise && q.seg === c.sg && q.t1 >= c.tj[0]))) continue;
        picks.push(c);
      }
      for (const c of picks.sort((x, y) => x.tj[0] - y.tj[0])) {
        const { i, sg, tj, tl, falls } = c,
          // (each drop 3 m, and up to 3 m more: more as the tune falls into its touch, more the more it falls overall)
          // (each rise 2.2 m, and up to 1.4 m more, the same way)
          ws = falls.reduce((q, x) => q + x, 0) || 1,
          big = Math.max(0, Math.min(1, 0.5 + (c.p[0] - c.p.at(-1)) * 5)),
          [d0, dd] = rise ? [2.2, 1.4] : [3, 3],
          d = falls.map(x => Math.round((d0 + dd * Math.max(0, Math.min(1, 0.15 + 0.45 * big + 0.9 * (x / ws - 1 / 3)))) * 10) / 10),
          dys = [];
        let y = 0;
        for (const x of d) dys.push((y = Math.round((y + (rise ? x : -x)) * 10) / 10));
        // (what the bars had in them gives way: from a breath before he leaps off the road (0.6 s at least, the least
        // between two presses) to the shaft)
        // (up: to a beat past the top, where the road above is split off as a stretch of its own: what is on it after
        // that is on the road above)
        const from = tj[0] - Math.max(GAP, 0.6),
          to = rise ? c.top + beat : sg.t1;
        for (let k = obs.length - 1; k >= 0; k--) if (obs[k].t < to && (obs[k].end ?? obs[k].t) > from && !vertical(segs.find(q => obs[k].t >= q.t0 && obs[k].t < q.t1))) obs.splice(k, 1);
        const id = isles.length,
          at = (t, m) => ({ isle: id, k: m, dyFrom: m ? dys[m - 1] : 0, dy: dys[m], h: 0, v: rs(), air, kind: barAt(t)?.kind ?? bars[i].kind, bar: barAt(t)?.i ?? bars[i].i, ...(rise && { asc: true }) }),
          // (each leap pressed with up, or up and on together: its note the diagonal)
          leaps = tj.map((t, m) => ({ t, type: 'leap', keys: ['jump', 'right'], ...at(t, m), end: tl[m] })),
          rolls = tl.map((t, m) => ({ t, type: 'roll', ...at(t, m), end: t + KINDS.roll.post(M) }));
        obs.push(...leaps, ...rolls);
        if (rise) {
          const after = { ...sg, t0: c.top, bars: sg.bars.filter(b => b.t0 >= c.top - 0.01), turn: false };
          Object.assign(sg, { t1: c.top, bars: sg.bars.filter(b => b.t0 < c.top - 0.01) });
          segs.splice(segs.indexOf(sg) + 1, 0, after);
        }
        isles.push({ id, bar: i, seg: sg, t0: tj[0], t1: sg.t1, gaps: [], leaps, rolls, head: leaps[0], ladder: true, depth: -dys.at(-1), ...(rise && { rise: true }) });
      }
    };
    ladders(mulberry((A.seed ?? 1) ^ 0x57a1), false);
    ladders(mulberry((A.seed ?? 1) ^ 0x57a2), true);
    obs.sort((p, q) => p.t - q.t);
  }
  // the props (kinds.js bat, pick and throw; props.js what they are in this world): a clone on a rooftop ahead throws a
  // thing at him on a call (a snare, or a syllable sung), it flies a bar (half of one in a slow song) and comes down on
  // a beat, batted home on it (→); and a thing lying on the roof scooped up on a snare (↓), carried two beats to a bar and
  // thrown on an accent (→, the kick and a crash) at a target ahead. Laid over what the bars have: what is on the press's
  // beat gives way to it (and a carry clears the beats between its pick and its throw), and the rest keeps its breath
  // from it. Only where the road is a run on one roof (a run, a sprint, a cursor chase, a brawl): never in a flight, a part
  // played mini, a fork, a freestyle window, by an island or a staircase, in the bar before a drop or under a drop's set
  // piece. A song whose star one is (stars.js) tells it as its story: brought in now and then, built up, turned on the
  // drops (two throwers taking turns, a throw chained into the next pick), played out after the last; any other song
  // meets one now and then, on its drops mostly, two of each a song at most; a build seldom
  {
    const rq = mulberry((A.seed ?? 1) ^ 0xba75),
      b0 = A.beats[0] ?? 0,
      // (the kinds of play on the roof he runs: plain, a sprint, a chase of the cursor, a brawl (a thrower among the
      // clones), the boss's act, a mirrored world; not on the board, under the ceiling or in the dark)
      RUNS = new Set(['run', 'turbo', 'cursorchase', 'brawl', 'boss', 'mirror']),
      freeAt = t => acts.some(a => a.i && (a.kind === 'break' || a.kind === 'verse') && t >= a.t0 && t < a.t0 + 8 * beat),
      // (the bar before a drop held empty and the drop's set piece over its first two)
      setPiece = t => bars.some(b => b.dropStart && t >= b.t0 - 4 * beat - 0.01 && t < b.t0 + 8 * beat),
      snare = t => Math.max(near(t, 'mid'), near(t, 'high')),
      call = t => snare(t) > 0.3 || !!voxAt(t, 0.06),
      accent = t => near(t, 'low') > 0.4 && snare(t) > 0.4,
      onBeat = t => Math.abs((t - b0) / beat - Math.round((t - b0) / beat)) < 0.02,
      // (what may not give way to a prop: a drop's set piece and landing, a fork's routes, an island's leap, a stomp
      // and the jump it is dived out of, a bar played from memory, the boss's fists (its life), another prop)
      stomped = new Set(obs.filter(q => q.type === 'jump' && obs.some(w => w.type === 'stomp' && w.t > q.t && w.t < q.t + M.air))),
      kept = q => stomped.has(q) || q.piece || q.land || q.skin === 'fist' || q.fork !== undefined || q.easy !== undefined || q.hard !== undefined || q.isle !== undefined || q.echo || ['stomp', 'bat', 'pick', 'throw', 'roll', 'leap'].includes(q.type),
      // (from `from` to `end` a run on one roof, or null; a bat swung on the board too, his upper body over his stance)
      fine = (from, end, board = false) => {
        const sg = onRunAt(from);
        if (!sg || from < Math.max(start + 16 * beat, 6) || end > sg.t1 - 0.2 || from < clearAt(sg) || (finale && end > finale.t0 - beat)) return null;
        for (let t = from; t <= end + 1e-6; t += beat / 2) if (!(RUNS.has(modeAt(t)) || (board && modeAt(t) === 'ride')) || flightAt(t) || miniAt(t) > 0 || freeAt(t) || setPiece(t) || onRunAt(t) !== sg) return null;
        if (forks.some(fk => fk.gate.t - beat < end && fk.t1 > from) || isles.some(is => is.t0 - 2 * beat < end && is.t1 + beat > from)) return null;
        return sg;
      },
      // (what gives way to a press at t0 busy till `end` (all from t0 to t1), and what would leave it no breath either
      // side; or null if something that must stay is in the way)
      room = (t0, t1, end) => {
        const gone = obs.filter(q => (q.t > t0 - 0.05 && q.t < t1 + 0.05) || !(((q.end ?? q.t) + GAP <= t0 && apart(q.t, t0)) || q.t >= end + GAP));
        return gone.some(kept) || gone.some(q => q.t < t0 - 2 * beat || q.t > end + 2 * beat) ? null : gone;
      },
      lay = (gone, ...add) => {
        for (const q of gone) obs.splice(obs.indexOf(q), 1);
        obs.push(...add);
        obs.sort((p, q) => p.t - q.t);
      },
      star = k => SP.stars.includes(k),
      // (how likely a bar is to get one, by the part of the story it is in; how many bars at least between two)
      rate = (k, t) => {
        const b = barAt(t);
        let u = star(k) ? { ki: 0.3, sho: 0.45, ten: 0.75, ketsu: 0.55 }[SP.phaseAt(t)] : b?.kind === 'drop' ? 0.1 : 0.025;
        if (b?.kind === 'build') u *= 0.35;
        if (b?.kind === 'calm') u *= 0.5;
        return u;
      },
      every = (k, t) => (star(k) ? (SP.phaseAt(t) === 'ten' ? 1 : 2) : 8),
      twist = t => SP.phaseAt(t) === 'ten' || SP.phaseAt(t) === 'ketsu',
      laid = { bat: [], pick: [] };
    let pid = 0;
    // a throw at him, its press (the bat's) on t; its thrower one of two (slot), throwing a bar before (half a bar in
    // a slow song), winding up a beat before that
    const bat = (t, slot) => {
      const nb = beat >= 0.6 ? 2 : 4,
        tr = t - nb * beat,
        end = t + KINDS.bat.post(M);
      if (!onBeat(t) || !fine(tr - 1.5 * beat, end, true)) return null;
      // (one thrower throws one thing at a time)
      if (obs.some(q => q.type === 'bat' && q.slot === slot && q.tr - 1.5 * beat < t + beat && q.t + beat > tr - 1.5 * beat)) return null;
      const gone = room(t, t, end);
      if (!gone) return null;
      const b = barAt(t);
      return { gone, o: { t, type: 'bat', h: 0, skin: 'prop', nb, tr, slot, v: rq(), fly: themeOf(placeAt(t)).fly, end, kind: b?.kind, bar: b?.i, print: `bat:${slot}` }, score: (gone.length ? 1 : 0) + (call(tr) ? 1 : 0) + (Math.round((t - b0) / beat) % 2 === 0 ? 0.5 : 0) + 0.1 * rq() };
    };
    // a thing picked up on t1 and thrown on t2
    const pair = (t1, t2) => {
      const end = t2 + KINDS.throw.post(M);
      if (!onBeat(t2) || !fine(t1, end)) return null;
      const gone = room(t1, t2, end);
      if (!gone) return null;
      const th = themeOf(placeAt(t1)),
        b1 = barAt(t1),
        b2 = barAt(t2),
        aim = th.aim[pid % th.aim.length],
        v = rq();
      return {
        gone,
        os: [
          { t: t1, type: 'pick', pid, item: th.item, h: 0, skin: 'prop', v, end: t1 + KINDS.pick.post(M), kind: b1?.kind, bar: b1?.i, print: 'pick' },
          { t: t2, type: 'throw', pid, item: th.item, aim, h: 0, skin: 'prop', v: rq(), end, kind: b2?.kind, bar: b2?.i, print: `throw:${aim}` },
        ],
        score: (accent(t2) ? 1 : 0) + (snare(t1) > 0.3 ? 1 : 0) + (gone.some(q => Math.abs(q.t - t1) < 0.05) ? 0.5 : 0) + (Math.round((t2 - b0) / beat) % 2 === 0 ? 0.3 : 0) + (t2 - t1 > 3.9 * beat ? 0.2 : 0) + 0.1 * rq(),
      };
    };
    const best = list => list.filter(Boolean).sort((p, q) => q.score - p.score)[0];
    for (const b of bars) {
      for (const k of rq() < 0.5 ? ['bat', 'pick'] : ['pick', 'bat']) {
        if ((!star(k) && laid[k].length >= 2) || laid[k].some(q => b.i - q.bar < every(k, b.t0)) || rq() >= rate(k, b.t0)) continue;
        if (k === 'bat') {
          const slot = obs.some(q => q.type === 'bat' && q.slot === 0 && q.t + beat > b.t0 - 5 * beat) ? 1 : 0,
            c = best([0, 1, 2, 3].map(j => bat(b.t0 + j * beat, slot)));
          if (!c || c.score < 1) continue;
          lay(c.gone, c.o);
          laid.bat.push(c.o);
          // (turned: the other thrower's answer two beats on, the two taking turns)
          if (star('bat') && twist(b.t0)) {
            const c2 = bat(c.o.t + 2 * beat, 1 - c.o.slot);
            if (c2) lay(c2.gone, c2.o);
          }
          continue;
        }
        const cs = [];
        for (let j = 0; j < 8; j++) for (const d of [2, 3, 4]) cs.push(pair(b.t0 + (j * beat) / 2, b.t0 + (j * beat) / 2 + d * beat));
        let c = best(cs);
        if (!c || c.score < 1.5) continue;
        lay(c.gone, ...c.os);
        laid.pick.push(c.os[0]);
        pid++;
        // (turned: the throw chained into the next pick two beats on, and its throw two beats after that, twice at most)
        for (let n = 0; n < 2 && star('pick') && twist(b.t0) && c; n++) {
          const t1 = c.os[1].t + 2 * beat;
          c = best([pair(t1, t1 + 2 * beat), pair(t1, t1 + 3 * beat)]);
          if (!c) break;
          lay(c.gone, ...c.os);
          pid++;
        }
      }
    }
  }
  // (a part played mini: its things to jump lower, as his jump is)
  for (const o of obs) if (o.type === 'jump' && actAt(plan.acts, o.t).mini) Object.assign(o, { h: o.h * 0.7, tall: false });
  // (and what hangs over him (to slide under, a bar to grab, a line to ride) as small as he is, from the roof up: so he
  // can no longer just run under it, and his hands reach the bar; run.js place() scales him 0.65; a chord's thing to
  // jump lower like the others)
  for (const o of obs)
    if (actAt(plan.acts, o.t).mini) {
      if (o.type === 'slide' || o.type === 'long' || o.type === 'grab' || o.type === 'zip' || (o.type === 'chord' && o.keys[0] === 'slide')) o.mini = 0.65;
      else if (o.type === 'chord' && o.h) o.h *= 0.7;
    }
  // ---- the lesson (main.js startLesson): the song's run stretches from its first bars made a course, the moves brought
  // in one at a time (Thumper's and Nintendo's way: each new on its own, where nothing else asks anything, then played
  // again twice to learn it, then the next), on the song's beats; the song's own set ways (a ladder of islands, a lid to
  // burst through, a shaft) left where they are, met as they come. The lesson ends a bar after the course
  // (lessonEnd).
  let lessonEnd = null;
  if (lesson) {
    // (each: the move, how many times, beats from one to the next)
    const COURSE = [
        ['jump', 3, 2],
        ['slide', 3, 2],
        ['smash', 3, 2],
        ['foeback', 2, 3],
        ['long', 2, 4],
        ['chordjump', 2, 3],
        ['review', 4, 2],
      ],
      REVIEW = ['jump', 'slide', 'smash', 'chordjump'],
      // (what the course takes the place of; the rest (islands, lids, shafts, flights) stays the song's)
      COURSED = new Set(['jump', 'slide', 'smash', 'foe', 'foeback', 'chord', 'long', 'dash', 'glide', 'zip', 'grind', 'grab', 'hold']),
      rl = mulberry((A.seed ?? 1) ^ 0x1e55),
      first = A.bars.find(b => b.t0 >= 6)?.t0 ?? 6,
      make = (kind, t) => {
        const skins = PLACES[placeAt(t)].skins,
          b = A.bars.find(q => t >= q.t0 && t < q.t1),
          o =
            kind === 'chordjump'
              ? { type: 'chord', keys: ['jump', 'right'], h: 0.7, skin: pick(rl, skins.jump) }
              : kind === 'foeback'
                ? { type: 'foeback', h: 1.8, skin: 'clone' }
                : kind === 'long'
                  ? { type: 'long', dur: 2 * beat, h: 0, skin: 'ceiling' }
                  : { type: kind, h: kind === 'jump' ? 0.7 : kind === 'smash' ? WALL : 0, skin: pick(rl, skins[kind] ?? skins.jump) };
        Object.assign(o, { v: rl(), t, kind: b?.kind ?? 'verse', bar: b?.i, print: `lesson:${kind}` });
        o.end = t + KINDS[o.type].post(M, o);
        return o;
      },
      // (the song's own that stay, and room round them: islands from four beats before (a new move's slow approach
      // needs them clear) to two after; five beats after anything else, two before)
      kept = obs.filter(o => !COURSED.has(o.type) || o.isle !== undefined),
      blocked = t =>
        isles.some(is => t > is.t0 - 4 * beat && t < is.t1 + 2 * beat) || flights.some(w => t > w.t0 - 2 * beat && t < w.t1 + beat),
      fits = o => {
        const sg = onRunAt(o.t);
        if (!sg || o.t < clearAt(sg) + beat || o.end > sg.t1 - 0.3 || (finale && o.end > finale.t0 - beat) || blocked(o.t) || blocked(o.end)) return false;
        return kept.every(q => (q.end ?? q.t) + 5 * beat <= o.t || o.end + 2 * beat <= q.t);
      },
      laid = [];
    let t = first,
      ri = 0;
    course: for (const [kind, n, step] of COURSE)
      for (let k = 0; k < n; k++) {
        const want = kind === 'review' ? REVIEW[ri++ % REVIEW.length] : kind;
        // (a new move a little apart from what came before: its slow approach and the play again after it)
        const gap = k === 0 ? (laid.length ? 6 : 0) : k === 1 && kind !== 'review' ? 4 : step;
        let at = laid.length ? laid.at(-1).t + Math.max(gap, Math.ceil((laid.at(-1).end - laid.at(-1).t) / beat + 1)) * beat : t;
        // (on a beat of the song's, the next that leaves it room)
        let o = null;
        for (const bt of A.beats) {
          if (bt < at - 0.01) continue;
          const c = make(want, bt);
          if (fits(c)) {
            o = c;
            break;
          }
          if (bt > at + 60) break;
        }
        // (played again only while the song lets it follow on: not over a flight or a shaft; the course ends there)
        if (!o || (k > 0 && o.t > at + 8 * beat)) break course;
        laid.push(o);
        t = o.t;
      }
    if (laid.length) {
      const t0 = first - 0.05,
        t1 = laid.at(-1).end + beat;
      for (let k = obs.length - 1; k >= 0; k--) if (obs[k].t >= t0 && obs[k].t < t1 && !kept.includes(obs[k])) obs.splice(k, 1);
      obs.push(...laid);
      // (the end: the bar after the course's last, once he is past it)
      lessonEnd = A.bars.find(b => b.t0 >= laid.at(-1).end + beat)?.t0 ?? laid.at(-1).end + 4 * beat;
    }
  }
  obs.sort((p, q) => p.t - q.t);
  // where each run obstacle stands: where he goes past it, the move having started on its press (and when: what moves
  // to the music is where it must be then)
  for (const o of obs) {
    o.press = o.t;
    o.passT = o.t + KINDS[o.type].passAt(M, o);
    const pass = xAt(o.t + KINDS[o.type].passAt(M, o));
    if (o.type === 'hold') {
      // (an island's edge a little further on: a leap pressed late is still taken off its edge; and the island he lands
      // on a step before where he touches down, so he lands on it, not on its lip)
      o.x0 = xAt(o.t + (o.isle !== undefined ? 0.15 : 0.04));
      o.x1 = xAt(o.t + o.dur) - (o.isle !== undefined ? 0.35 : 0);
      o.x = o.x0;
    } else if (o.type === 'grab') {
      // the bar where his hands close on it as he presses (run_and_swing's hands are 0.55 m ahead of his hips then)
      o.barX = xAt(o.t) + 0.55;
      o.x0 = xAt(o.t) + 0.3;
      o.x1 = xAt(o.t + o.dur);
      o.x = o.barX;
    } else if (o.type === 'glide' || o.type === 'zip' || o.type === 'grind') {
      o.x0 = xAt(o.t + 0.1);
      o.x1 = xAt(o.t + o.dur);
      o.x = o.x0;
    } else if (o.type === 'dash') {
      // a pane on each beat, the first where his kick would meet it
      o.panes = [];
      // (a pane every half beat: a run of walls too close to press for each, so it reads as one to hold through)
      // (each met while the key is still held: the last one before the hold's end, or a dash held exactly to its end
      // runs into it)
      for (let k = 0; k === 0 || M.kickAt + k * (beat / 2) < o.dur - 0.02; k++) o.panes.push(xAt(o.t + M.kickAt + k * (beat / 2)) + 0.45);
      o.x0 = o.panes[0];
      o.x1 = o.panes.at(-1) + 0.3;
      o.x = o.x0;
      o.broke = [];
    } else if (o.type === 'long') {
      // from where he is down in the slide to where he gets up
      o.x0 = xAt(o.t + 0.2);
      o.x1 = xAt(o.t + o.dur);
      o.x = (o.x0 + o.x1) / 2;
    } else if (o.type === 'smash' || o.type === 'foe') o.x = pass + 0.45;
    else if (o.type === 'foeback') {
      // (where his back kick meets it, and how fast it closes from behind: a little quicker than he runs)
      o.x = pass - 0.45;
      o.vb = vAt(o.t) + 2.4;
    } else if (o.type === 'ring') o.x = xAt(o.t);
    // (a lid across a shaft's mouth: over the shaft, where he comes up through it)
    else if (o.type === 'hatch') o.x = xAt(o.t - 0.05);
    else if (o.type === 'chord') {
      // (the clone where his strike meets it; the thing to jump or slide under just before)
      o.x = pass + 0.45;
      o.thingT = o.t + (o.keys[0] === 'jump' ? 0.9 * M.kickAt : M.slide / 2);
      o.thingX = xAt(o.thingT);
    }
    else if (o.type === 'bat') {
      // (a throw: the bat meets it on the grid point after the press, at the sweet spot ahead of his hands; it flies home
      // a beat. Its thrower on a rooftop past the road, a parallax row of its own (par: 0 the road's, 1 riding with him),
      // so he stays in the picture all the while: dC ahead of him at the contact, about six metres as he winds up)
      o.tc = o.t + M.kickAt;
      o.ti = o.tc + beat;
      o.x = xAt(o.tc) + 0.7;
      o.dC = 3.3 + 1.4 * o.slot;
      o.par = Math.max(0.3, Math.min(0.9, 1 - (6.3 + 0.4 * o.slot - o.dC) / Math.max(1, xAt(o.tc) - xAt(o.tr - 1.5 * beat))));
      o.th = 1.6 + 0.7 * o.v + 0.5 * o.slot;
    } else if (o.type === 'pick') o.x = xAt(o.t + 0.12) + 0.42;
    else if (o.type === 'throw') {
      // (let go on the grid point after the press, at the target half a beat later: it stands where a thing to press for
      // stands, about 3 m ahead of him at the press, so it is in view as long before it as any (renderer.js ahead), and
      // still ahead of him when it is hit)
      o.tc = o.t + M.kickAt;
      o.ti = o.tc + beat / 2;
      o.x = xAt(o.t) + 1.1;
      o.tx = Math.max(xAt(o.ti) + 0.3, xAt(o.t) + 3.3 + 0.4 * o.v);
      o.ty = AIM_Y[o.aim];
    } else if (o.type === 'leap') {
      // (a leap off an island's edge: where he takes off on its beat, the edge a moment on (a leap pressed a little
      // late is still taken off it; unpressed, he runs off it there), the island he lands on from a step before his
      // touch)
      o.x = xAt(o.t);
      o.edgeT = o.t + Math.min(0.2, 0.6 * D.near);
      o.edge = xAt(o.edgeT);
      o.landX = xAt(o.t + o.air);
    } else if (o.type !== 'lane') o.x = pass;
  }
  // each island's road: from where one leap lands to where the next takes off, at that leap's height; the cursor's marquee
  // over the first three (cursor-plan.js: the whole stretch is cut out at once)
  for (const is of isles) {
    const G = is.gaps;
    // (a ladder: the road to the first leap's edge; each island from a step before its touch to the next leap's edge,
    // the bottom one on to the stretch's end; its pieces in order, each landed on by its leap)
    if (is.ladder) {
      const P = is.leaps;
      is.x0 = P[0].edge;
      is.x1 = P.at(-1).landX - LIP;
      is.pieces = P.map((o, k) => ({ x0: o.landX - LIP, x1: P[k + 1]?.edge ?? Infinity, dy: o.dy, k }));
      P[0].x0 = is.x0;
      P[0].selX1 = is.pieces[0].x1;
      continue;
    }
    is.x0 = G[0].x0;
    is.x1 = G.at(-1).x1;
    is.pieces = G.slice(0, -1).map((o, k) => ({ x0: o.x1, x1: G[k + 1].x0, dy: o.dy, k }));
    G[0].selX1 = G[Math.min(2, G.length - 1)].x1;
  }
  // how far over his level's own height the ground under x is (an island's lift; over a leap's gap the lower of its two
  // sides, its far side's from a step before it)
  const isleDy = (s, x) => {
    for (const is of isles) {
      if (is.seg !== s || x < is.x0 || (x > is.x1 && !is.ladder)) continue;
      // (a ladder: each island where it is; over a gap the island it falls to (nothing holds him there: run.js), and
      // the bottom one on to the stretch's end)
      if (is.ladder) {
        for (const p of is.pieces) if (x < p.x1) return p.dy;
        return -is.depth;
      }
      for (const o of is.gaps) if (x > o.x0 + 0.15 && x < o.x1 - 0.15) return Math.min(o.dyFrom, o.dy);
      for (const p of is.pieces) if (x >= p.x0 - 0.15 && x <= p.x1 + 0.15) return p.dy;
      return 0;
    }
    return 0;
  };
  // star phrases (Guitar Hero's star power): the obstacles of each build and of the first two bars of every act after
  // the first, glowing; all of one played without a miss charges half the overdrive
  const stars = {},
    builds = [];
  for (const b of A.bars) if (b.kind === 'build') builds.at(-1)?.[1] === b.t0 ? (builds.at(-1)[1] = b.t1) : builds.push([b.t0, b.t1]);
  for (const w of [...builds, ...acts.slice(1).map(a => [a.t0, a.t0 + 8 * beat])]) {
    const run = obs.filter(o => o.t >= w[0] - 0.01 && o.t < w[1] - 0.01 && o.star === undefined && !['lane', 'gate', 'zone'].includes(o.type));
    if (run.length < 2) continue;
    const id = Object.keys(stars).length;
    for (const o of run) o.star = id;
    stars[id] = run.length;
  }
  // freestyle windows (Hi-Fi Rush's beat between fights): two bars or more of a run with nothing in them, a beat in
  // from either end; any move on the beat in one scores style twice over
  const free = [];
  for (const sg of segs) {
    if (vertical(sg)) continue;
    // (not in a flight: its rings are its play)
    const inSg = obs.filter(o => o.t >= sg.t0 && o.t < sg.t1).sort((a, b) => a.t - b.t);
    let from = sg.t0 + 2 * beat;
    for (const o of [...inSg, { t: sg.t1 - beat, end: sg.t1 }]) {
      if (o.t - from >= 8 * beat && !flights.some(w => w.t0 - beat < o.t - beat && w.t1 + beat > from + beat)) free.push([from + beat, o.t - beat]);
      from = Math.max(from, o.end ?? o.t);
    }
  }
  // the song's secret (character.js), when and where: the source's door on a beat in the middle of the first freestyle
  // window (none: the sky falls instead), the meteors through the first drop, the ally through the first verse, the giant
  // with the boss
  let secret = null;
  if (ch.secret) {
    const fw = free[0],
      drop = plan.acts.find(a => a.kind === 'drop'),
      verse = plan.acts.find(a => a.i > 0 && a.kind === 'verse') ?? plan.acts[1],
      door = fw && A.beats.find(b => b >= (fw[0] + fw[1]) / 2);
    if (ch.secret === 'source' && door) secret = { kind: 'source', t0: door - 4 * beat, t1: door + 0.3, door };
    else if (ch.secret === 'giant' && bossOn) secret = { kind: 'giant', t0: bossOn.t0, t1: bossOn.t1 };
    else if (ch.secret === 'ally' && verse) secret = { kind: 'ally', t0: verse.t0, t1: Math.min(verse.t1, verse.t0 + 16 * 4 * beat) };
    else if (drop) secret = { kind: 'meteor', t0: drop.t0, t1: Math.min(drop.t1, drop.t0 + 8 * 4 * beat) };
  }
  // (an artist's song dressed in its pack's places, world/artists.js: only its look; what is played stays the sound's)
  return dressLevel({ A, ch, piece, boss: bossOn, forks, secret, tools: ch.tools, toolAt: t => ch.tools.find(q => t >= q.t0 && t < q.t1)?.tool ?? null, profile: P, place, place2, rewriteT, placeAt, acts: plan.acts, modeAt, miniAt, chase: plan.chase, lensAt: plan.lensAt,
    // (where the song's lenses lie (render/layers/lens.js: which, how strong, for how long): on its drops only, the peaks
    // (the rest of the song is the rest that makes a peak felt); hinted at over the two beats before a drop; never in its
    // opening (lensAt), never over a boss or a flight (too much to read), never on its last act (it ends as it is)
    lensSlot: (() => {
      const after = plan.acts.filter(a => a.t0 >= plan.lensAt).sort((p, q) => p.t0 - q.t0),
        last = after.at(-1),
        ok = a => a && a !== last && a.mode !== 'fly' && a.mode !== 'boss',
        bar = 4 * beat,
        // (a third of the song at most under a lens: the drops in order while they fit, the first always)
        drops = after
          .filter(a => a.kind === 'drop' && ok(a))
          .reduce((kept, a) => {
            const used = kept.reduce((n, d) => n + Math.min(d.t1 - d.t0, (d.t1 - d.t0 >= 24 * bar ? 16 : 8) * bar), 0),
              hold = Math.min(a.t1 - a.t0, (a.t1 - a.t0 >= 24 * bar ? 16 : 8) * bar);
            return !kept.length || used + hold <= 0.35 * A.dur ? [...kept, a] : kept;
          }, []);
      return t => {
        if (t < plan.lensAt - 2 * beat) return null;
        const a = actAt(plan.acts, t);
        if (a.kind === 'drop' && drops.includes(a)) return { kind: 'drop', k: drops.indexOf(a), n: drops.length, since: t - a.t0, len: a.t1 - a.t0 };
        const next = drops.find(d => d.t0 > t && d.t0 - t <= 2 * beat);
        if (next) return { kind: 'pre', k: drops.indexOf(next), n: drops.length, since: t - next.t0, len: next.t1 - next.t0 };
        return null;
      };
    })(),
    // (the islands: their stretches, the ground under x on a level, the height the camera rides at t: the island he is
    // on or leaping to, a moment ahead)
    isles,
    // the song's star moves (stars.js): the one it is about, and all it plays (a set's remix plays several)
    star: SP.star,
    starMoves: SP.stars,
    groundAt: (s, x) => s.y0 + isleDy(s, x),
    isleCam: t => {
      const is = isles.find(q => t >= q.t0 - beat && t < q.t1 + beat);
      // (down a ladder: the island he is on, from his touch on it (the camera frames the one he leaps to itself,
      // renderer.js))
      // (past the top of one up, on the road above: a stretch of its own, at its own height)
      if (is?.ladder) return is.rise && t >= is.t1 ? 0 : (is.leaps.findLast(o => o.t + o.air <= t)?.dy ?? 0);
      return is ? (is.gaps.findLast(o => o.t - 0.25 <= t)?.dy ?? 0) : 0;
    },
    // (how far down a ladder the island he is on is at t, eased through each flight: what the backdrop rests on)
    stairDy: t => {
      const is = isles.find(q => q.ladder && t >= q.t0 && t < q.t1);
      if (!is) return 0;
      let y = 0;
      for (const o of is.leaps) {
        const u = Math.max(0, Math.min(1, (t - o.t) / o.air));
        y += (o.dy - o.dyFrom) * u * u * (3 - 2 * u);
      }
      return y;
    },
    flights, flightAt, stars, free, dir: dir0, finale, lessonEnd, difficulty: D, temper, M, segs, vertical, obs, xAt, vAt, segAt: t => segs.find(s => t >= s.t0 && t < s.t1) ?? segs[segs.length - 1] }, forcePlace ? null : (artistDress(artist, title, P, A.seed ?? 1, rewriteT < Infinity ? place2 : null) ?? guestDress(P, A.seed ?? 1, rewriteT < Infinity ? place2 : null)));
}
// how alike two bars sound (cosine of their slot vectors)
const cosine = (a, b) => {
  let d = 0,
    x = 0,
    y = 0;
  for (let i = 0; i < a.length; i++) {
    d += a[i] * b[i];
    x += a[i] * a[i];
    y += b[i] * b[i];
  }
  return x && y ? d / Math.sqrt(x * y) : 0;
};
const hamming = (a, b) => {
  let d = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) d++;
  return d + Math.abs(a.length - b.length);
};
