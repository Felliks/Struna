// A run of one level: the hero's state from the player's inputs and the song's clock, the judgement of every
// obstacle, health, score, and the death (the engine's ragdoll, engine/sim/core/ragdoll.js, falls the way a man
// falls). Stepped at a fixed rate up to the song's time (main.js); the pose comes from the Animator (anim.js).
//
// One press beats each obstacle. Keys and swipes: up = jump (over a gap too: a long one), down = slide, right = a
// flying kick through a pane, left = grab a crane's bar and swing over a wide gap; falling, left and right change lanes.
// On the music (motion.js): a move pressed for an obstacle is stretched or squeezed to end on the grid point it would
// have ended on had the press been perfect (Hi-Fi Rush's rule: the action lands on the beat even when the press was a
// little off), and the sound of beating it is scheduled on that grid point (a cue); a hit cancels it.
// Forgiveness (the input is fair, not literal): a jump pressed up to 0.12 s before he is back on the roof is kept and
// fires on landing (jump buffer); a jump pressed up to 0.09 s after he has run off an edge still counts (coyote time).
import { fallStep, makeRagdoll, ragJoints } from './lib/ragdoll.js';
import { Animator, BOARD_FREE, DANCES, FREE, MOVES, PROP_TAKES, STRIKES, TRICKS, brkFrames, slideTake, take } from './anim.js';
import { KINDS, beamMark, wants } from './kinds.js';
import { LIP } from './level.js';
import { modBonus } from './mods.js';

export const LANE = 1.5;
// a shaft's top speed, down or up (m/s)
export const FALL_V = 6.5;
const H_LONG = 1.9,
  TAU = 0.35,
  BUFFER = 0.12,
  COYOTE = 0.09,
  // his feet tuck up this far above his hips' rise in the jump clip
  TUCK = 0.25,
  // a chord's two keys: this close together
  CHORD = 0.15,
  // the gravity a launch up a ladder flies under (m/s², the world's own a little over twice: a trampoline's long, high
  // throw that still comes down hard enough to read as a landing)
  UP_G = 22;
export const GRADE_PTS = { perfect: 300, great: 200, good: 100 };
// the three heights of a flight (his root over the roof), as a shaft has three lanes
export const ALT = [0.5, 1.7, 2.9];

// ---- judgement per obstacle type: 'hit', 'pass' (with the action to grade by) or nothing yet
const JUDGE = {
  jump(R, o, x) {
    if (Math.abs(x - o.x) < 0.35 && R.y - o.y + TUCK < o.h) return ['hit'];
    if (x > o.x + 0.35) return ['pass'];
  },
  slide(R, o, x) {
    if (Math.abs(x - o.x) < 0.35 && !R.slide) return ['hit'];
    if (x > o.x + 0.35) return ['pass'];
  },
  // a long ceiling: down under it all the way (graded by the press; the beats held under it score on the way)
  long(R, o, x) {
    if (x > o.x0 + 0.25 && x < o.x1 - 0.25 && !R.slide) return ['hit'];
    if (x > o.x1) return ['pass'];
  },
  hold(R, o, x) {
    if (x > o.x0 + 0.15 && x < o.x1 - 0.15 && R.y < o.y - 0.5) return ['hit'];
    if (x > o.x1) return ['pass'];
  },
  grab(R, o, x) {
    return JUDGE.hold(R, o, x);
  },
  // his front reaches the pane: through it if his kick is out, into it if not
  smash(R, o, x) {
    if (x < o.x - 0.45) return;
    const k = R.strike ? R.t - R.strike.contact : -9;
    return k > -0.25 && k < 0.3 ? ['pass'] : ['hit'];
  },
  // a clone: met by a kick under way as it reaches him (its beat + kickAt), a moment's grace after
  foe(R, o, x, t) {
    const c = o.t + R.L.M.kickAt;
    if (t < c - 0.02) return;
    if (R.strike && !R.strike.back && Math.abs(R.strike.contact - c) < 0.3 && t >= R.strike.contact - 0.02) return ['pass'];
    if (t > c + 0.15) return ['hit'];
  },
  // the holds over a gap (glide: jump held; zip: left held along a line): in it while he is in the air over it
  glide(R, o, x) {
    return JUDGE.hold(R, o, x);
  },
  zip(R, o, x) {
    return JUDGE.hold(R, o, x);
  },
  grind(R, o, x) {
    return JUDGE.hold(R, o, x);
  },
  // a corridor of panes: through it only while he dashes (right held)
  dash(R, o, x) {
    if (x > o.x0 - 0.45 && x < o.x1 - 0.45 && !R.held2?.dash) return ['hit'];
    if (x > o.x1) return ['pass'];
  },
  // in a shaft, a stretch to hold down (dive) or up (float) through, the key kept down till its end (the end lenient)
  zone(R, o, x, t) {
    if (t > o.t + 0.25 && t < o.t + o.dur - R.L.M.beat / 4 && !R.held[o.key]) return ['hit'];
    if (t > o.t + o.dur) return ['pass'];
  },
  // a gate: a wall across the shaft with one way through, where he must be
  gate(R, o, x, t) {
    return JUDGE.lane(R, o, x, t);
  },
  // a chord (two keys at once, Guitar Hero's): the thing before the clone taken (jumped, or slid under) and the clone
  // kicked out, both pressed together near its beat
  // (any press of each key in its window will do, so long as the two are together: a stray kick a moment before it
  // does not spoil the pair pressed on its beat)
  chord(R, o, x, t) {
    if (t < o.t + R.L.M.kickAt) return;
    return ticPress(R, o) !== null ? ['pass'] : ['hit'];
  },
  // a plate to dive onto: reached by a dive out of the air near its beat, or not
  stomp(R, o, x, t) {
    // (the plate he lands on out of a shaft on a drop: down pressed near its beat, as he comes down or as he touches it)
    if (o.land) return landed(R, o, t, 'slide');
    if (x < o.x - 0.2) return;
    // (a dive any time in the jump over the thing before it counts: down pressed right after up is fine)
    return R.diveT !== undefined && R.diveT > o.t - 0.9 && R.diveT < o.t + 0.3 ? ['pass'] : ['hit'];
  },
  // a leap down a ladder of islands: up pressed near its beat (with on, or alone: the diagonal is the hint, up the
  // move); a miss once the window is past
  leap(R, o, x, t) {
    const near = R.L.difficulty.near;
    if (t < o.t - near) return;
    if (R.presses.some(p => p.a === 'jump' && Math.abs(p.t - o.t) < near)) return ['pass'];
    if (t > o.t + near) return ['hit'];
  },
  // a touch down on an island of a ladder: down pressed near the beat his feet touch it (falling to it, or just down on
  // it); a miss once the window is past (held down from before does not count: each touch is its own press)
  roll(R, o, x, t) {
    const near = R.L.difficulty.near;
    if (t < o.t - near) return;
    if (R.presses.some(p => p.a === 'slide' && Math.abs(p.t - o.t) < near)) return ['pass'];
    if (t > o.t + near) return ['hit'];
  },
  // a thing thrown at him (a prop, level.js): batted by a swing under way as it comes down (the swing's contact, the grid
  // point after its beat), a moment's grace after; unswung, it hits him
  bat(R, o, x, t) {
    const c = o.t + R.L.M.kickAt;
    if (t < c - 0.02) return;
    if (R.strike?.o === o && t >= R.strike.contact - 0.02) return ['pass'];
    if (t > c + 0.15) return ['hit'];
  },
  // a thing on the roof: down pressed near its beat scoops it up (each its own press); a miss once the window is past
  pick(R, o, x, t) {
    const near = R.L.difficulty.near;
    if (t < o.t - near) return;
    if (R.presses.some(p => p.a === 'slide' && Math.abs(p.t - o.t) < near)) return ['pass'];
    if (t > o.t + near) return ['hit'];
  },
  // what he carries thrown: let go by a throw under way (its release the grid point after its beat); or he drops it
  throw(R, o, x, t) {
    return JUDGE.bat(R, o, x, t);
  },
  // a lid over a shaft he flies up: up pressed near its beat, as he comes up to it or as he is through
  hatch(R, o, x, t) {
    return landed(R, o, t, 'jump');
  },
  // a push off a wall in a climb: both its keys pressed together near its beat; a miss once the window is past
  tic(R, o, x, t) {
    // (up alone, not up and across: a hop straight up where he is, and down into the drop)
    if (o.up !== undefined) return ['hit'];
    if (ticPress(R, o) !== null) return ['pass'];
    if (t > o.t + R.L.difficulty.near) return ['hit'];
  },
  // a ring in a flight: at its height at some moment of its window (`near` either side of its beat, as any other thing's
  // press): a press on its beat for the next ring's height, a moment before or after it, does not take him out of it,
  // nor does a press a moment late fail to take him into it (judged by the heights pressed for, run.altLog)
  ring(R, o, x, t) {
    if (t < o.t) return;
    const near = R.L.difficulty.near,
      log = R.altLog,
      from = log.findLast(q => q.t <= o.t - near)?.alt ?? 1;
    if (from === o.lane || log.some(q => q.t > o.t - near && q.t <= Math.min(t, o.t + near) && q.alt === o.lane)) return ['pass'];
    if (t > o.t + near) return ['hit'];
  },
  // a clone from behind: a back kick out as it reaches him
  // (a strike under way that meets it passes it; with none, it gets him a moment after it reaches him)
  foeback(R, o, x, t) {
    const c = o.t + R.L.M.kickAt;
    if (t < c - 0.02) return;
    if (R.strike?.back && Math.abs(R.strike.contact - c) < 0.3 && t >= R.strike.contact - 0.02) return ['pass'];
    if (t > c + 0.2) return ['hit'];
  },
  lane(R, o, x, t) {
    if (t < o.t) return;
    return o.lanes.includes(R.lane) ? ['hit'] : ['pass'];
  },
};
// how high a launch up a ladder goes over where it leaves from (m), D under the island it lands on (D < 0), in T s: a
// body's apex under UP_G, 1.2 m to 3 m over the island
export function launchApex(D, T) {
  const s = Math.sqrt(UP_G) * Math.max(0.3, T);
  return Math.max(1.2 - D, Math.min(3 - D, (s - (2 * D) / s) ** 2 / 8));
}
// when a climb's push was pressed (both its keys together near its beat: the later of the two), or null
function ticPress(R, o) {
  const near = R.L.difficulty.near,
    by = k => R.presses.filter(p => p.a === k && Math.abs(p.t - o.t) < near);
  for (const p of by(o.keys[0])) for (const q of by(o.keys[1])) if (Math.abs(p.t - q.t) < CHORD) return Math.max(p.t, q.t);
  return null;
}
// up pressed alone near a climb's push, no way across pressed with it (nor within a chord's time after it): when, or
// null. Only a push across wants two keys
function loneUp(R, o, t) {
  if (o.keys.length < 2 || o.res === 'ok') return null;
  const near = R.L.difficulty.near,
    // (a jump pressed with either way across is a push, the last one's or this one's, never up alone)
    p = R.presses.find(q => q.a === 'jump' && Math.abs(q.t - o.t) < near && q.t + CHORD <= t && !R.presses.some(w => (w.a === 'left' || w.a === 'right') && Math.abs(w.t - q.t) < CHORD));
  return p ? p.t : null;
}
// a climb's walls: where his feet meet each, either side of the shaft's middle (the chute's inner faces, shafts/index.js)
const WALL = 1.6;
// a drop's landing out of a shaft (a slam down, a burst up): its key pressed up to `near` either side of its beat, or
// held down through it; judged as soon as it is pressed, a miss only once the window is past
function landed(R, o, t, key) {
  if (t < o.t - R.L.difficulty.near) return;
  const near = R.L.difficulty.near;
  if (R.presses.some(p => p.a === key && p.t > o.t - near && p.t < o.t + near) || (t >= o.t && R.held[key])) return ['pass'];
  if (t > o.t + near) return ['hit'];
}
// after a hit: what happens to him (a gap: the simulation takes him out and puts him back on its far side, a glitch, and
// he runs on; nothing holds him over the hole meanwhile)
// (fallen in a gap: from where he is in it, the cursor takes him over it, stepRun)
const backOnTheFarSide = (R, o) => Object.assign(R, { vy: 0, jump: null, hold2: null, swing: null, respawn: { o, t0: R.t, y: Math.min(R.y, o.y) } });
const AFTER_HIT = { hold: backOnTheFarSide, grab: backOnTheFarSide, glide: backOnTheFarSide, zip: backOnTheFarSide, grind: backOnTheFarSide };

// the points of a freestyle link, by its family (the dance holds a string up, the others build it)
const LINK = { dance: 5, air: 20, kick: 15, brk: 25 };
export class Run {
  constructor(L, clips) {
    this.L = L;
    // (the modifiers' bonus on every point scored)
    this.mult = modBonus(L.mods) * (L.perks?.includes('glass') ? 1.5 : 1);
    // (a set's perks, perks.js)
    this.perk = k => !!L.perks?.includes(k);
    this.shieldLeft = this.perk('shield') ? 2 : 0;
    this.anim = new Animator(clips);
    // each stretch's height: a fall goes down, a launch goes up, and the next roof is there
    let base = 0;
    for (const s of L.segs) {
      s.y0 = base;
      if (L.vertical(s)) {
        s.x = L.xAt(s.t0);
        s.y1 = this.shaftY(s, s.t1);
        base = s.y1;
      } else {
        // (a ladder of islands down at its end, or up (level.js ladder): the stretch ends that much lower or higher, and
        // the shaft after it starts from there)
        s.y1 = base - (L.isles?.find(q => q.ladder && q.seg === s)?.depth ?? 0);
        base = s.y1;
      }
    }
    // (a climb's path: the shaft's floor, each push's mark on a wall, its height a share of the climb, the top)
    // (a long rise flies up first: the climb starts from where the flight has him a beat before its first push)
    for (const s of L.segs)
      if (s.climb) {
        const y0 = s.y0;
        s.climbPts = [
          ...L.obs.filter(o => o.type === 'tic' && o.t >= s.t0 - 0.02 && o.t < s.t1).map(o => ({ t: o.t, x: s.x + o.side * (s.wall ?? WALL), y: y0 + (s.y1 - y0) * o.f, o })),
          { t: s.t1, x: s.x, y: s.y1 },
        ];
      }
    // (a ledge in a shaft is where he will be when it matters: under his feet falling, over his head flying up)
    // (a climb's push: its mark on its wall)
    for (const o of L.obs) {
      const s = L.segAt(o.t),
        cp = o.type === 'tic' ? s.climbPts?.find(q => q.o === o) : null;
      if (cp) Object.assign(o, { x: cp.x });
      o.seg = s;
      o.y = cp ? cp.y : s.kind === 'fall' ? this.shaftY(s, o.t) - 0.2 : s.kind === 'rise' ? this.shaftY(s, o.t) + 2.1 : s.y0;
      // (a leap between islands: the lower of its two sides, and each side's own height; up a ladder, a leap's the
      // island it is off and a touch's the one it is on)
      if (o.isle !== undefined) Object.assign(o, { y: s.y0 + (o.asc ? (o.type === 'roll' ? o.dy : o.dyFrom) : Math.min(o.dyFrom, o.dy)), yFrom: s.y0 + o.dyFrom, yTo: s.y0 + o.dy });
      delete o.res;
      delete o.grade;
      delete o.tick;
      delete o.shatter;
      delete o.okT;
      delete o.fell;
      delete o.dropT;
      delete o.relX;
      delete o.relY;
      for (const k of ['kickT', 'kickV', 'meetT', 'meetV', 'up']) delete o[k];
      if (o.type === 'dash') o.broke = [];
    }
    // the boss's fists kicked back (its life is level.boss.hp); the forks' routes taken; the cursor's undos used
    this.bossHits = 0;
    this.routes = {};
    this.undone = new Set();
    // the chords given whole by easy chords (main.js): scored as one press
    this.assisted = new Set();
    Object.assign(this, {
      t: -1,
      hp: 100,
      score: 0,
      combo: 0,
      maxCombo: 0,
      // the overdrive (Guitar Hero's star power): charged by star phrases played clean, half a phrase's worth each, let
      // loose with its key for as many bars as it holds (eight when full)
      sync: 0,
      od: null,
      stars: {},
      counts: { perfect: 0, great: 0, good: 0, miss: 0 },
      fx: [],
      presses: [],
      strays: [],
      trippedT: -9,
      buffered: null,
      y: 0,
      vy: 0,
      jump: null,
      strike: null,
      dance: null,
      string: null,
      brk: null,
      // (the heights pressed for in a flight, each from its press's moment: the rings are judged by them)
      altLog: [],
      freeN: {},
      fly: null,
      alt: 1,
      chain: [],
      chains: 0,
      swing: null,
      slide: null,
      getup: null,
      landing: null,
      // down on an island of a ladder: { o, t0, t1, hard, broke } (rolled out of it, or landed hard on it; the glass of
      // its landing spot given way under him when the touch was missed)
      roll: null,
      // tucked into the roll too soon in a leap's flight: { t0, ro, ... } falling short of the island, into the gap,
      // then in the cursor's grip carried onto it (c)
      short: null,
      // a prop (level.js): reaching down for a thing on the roof { o, t0 }; the thing in his hands { o, t0 } till thrown
      pickup: null,
      carry: null,
      offEdgeT: -9,
      // the keys (or the finger after its swipe) still held: a hold lasts as long as its key is
      held: { jump: false, slide: false, left: false, right: false },
      // a hold under way: { o, kind: 'glide' | 'dash' | 'zip', t0, t1, tick }
      hold2: null,
      // taken out of a gap he fell down: { o, t0 } until he is past it
      respawn: null,
      lane: 1,
      laneX: 0,
      laneV: 0,
      mode: 'run',
      hitT: -9,
      landT: -9,
      stumble: null,
      J: null,
      over: null,
    });
  }
  // how far he has gone down (or up) the shaft d seconds in: speeding up to FALL_V
  shaftDrop(d) {
    return FALL_V * (d - TAU * (1 - Math.exp(-d / TAU)));
  }
  shaftY(s, t) {
    return s.y0 + (s.kind === 'rise' ? 1 : -1) * this.shaftDrop(Math.max(0, t - s.t0));
  }
  // the ground under x on run stretch s: its level, or the island there (level.js)
  gy(s, x) {
    return this.L.groundAt ? this.L.groundAt(s, x) : s.y0;
  }
  laneXOf(s, l) {
    return s.x + (l - 1) * LANE;
  }
  heroX(t) {
    if (this.mode === 'dead' && this.J) return this.J[0];
    if (this.swing) return this.swing.x;
    // (tucked too soon: his flight forward gone, short of where the run has him)
    if (this.short) return this.L.xAt(t) - this.lag(t);
    const s = this.L.segAt(t);
    return this.L.vertical(s) ? this.laneX : this.L.xAt(t);
  }
  // ---- one step
  update(t, events) {
    if (this.over) return;
    const dt = this.t < 0 ? 0 : Math.max(0, Math.min(0.05, t - this.t));
    this.t = t;
    if (this.mode === 'dead') return this.stepDead(t, dt);
    const L = this.L,
      s = L.segAt(t);
    if (L.vertical(s) && this.mode !== 'shaft') this.startShaft(s);
    else if (s.kind === 'run' && this.mode === 'shaft') this.endShaft(t, s);
    for (const e of events) this.input(e, t, s);
    if (this.od && t > this.od.t1) {
      this.od = null;
      this.fx.push({ k: 'odend', t, x: this.heroX(t), y: this.y + 1 });
    }
    if (this.mode === 'run') this.finale(t, s);
    // (a secret to be seen, not pressed: found by getting there)
    const sc = L.secret;
    if (sc && sc.kind !== 'source' && !this.secretT && t >= sc.t0) {
      this.secretT = t;
      this.fx.push({ k: 'secret', t, kind: sc.kind, x: this.heroX(t), y: this.y + 2 });
    }
    // (a climb's pose is only his while he climbs: back on a roof his eyes and cape are a runner's again)
    this.stepString(t, s);
    if (this.mode === 'run') ((this.climbPose = null), this.stepRun(t, dt, s));
    else this.stepShaft(dt, s, t);
    this.judge(t, s);
    this.J = this.place(this.anim.pose(this, t, s), t);
    if (t > (L.finale?.end ?? L.A.dur - 0.3)) this.over = { win: true, t };
  }
  // the finale (level.js): on its beat he leaps at the cursor gloating in front of him, a flying knee, smashes it on the
  // next beat (an event the picture and the sound make much of), lands, slows down and celebrates
  finale(t, s) {
    const F = this.L.finale;
    if (!F || t < F.jump) return;
    // (the other endings, character.js: the world deleted round him or a sunrise, standing; an ascension, a leap high
    // into a beam of light)
    if (!this.fin && (F.kind === 'delete' || F.kind === 'dawn')) this.fin = { hit: false };
    if (!this.fin) {
      const h = F.kind === 'ascend' ? 3.4 : 2.1;
      this.fin = { hit: false };
      this.jump = { t0: F.jump, g: (8 * h) / F.air ** 2, air: F.air, gap: null, take: F.kind === 'ascend' ? ['unarmed_jump_running', 25, 58] : ['flying_knee_punch_combo', 32, 100] };
      this.y = s.y0;
      this.vy = (4 * h) / F.air;
      this.slide = this.getup = this.landing = this.strike = this.buffered = null;
    }
    if (!this.fin.hit && t >= F.hit) {
      this.fin.hit = true;
      this.score += Math.round((1000) * this.mult);
      this.fx.push({ k: F.kind === 'knee' ? 'finisher' : F.kind, t, x: this.L.xAt(t) + 0.6, y: this.y + 1.6 });
    }
    if (t >= F.land + 0.45) this.victory ??= { t0: t };
  }
  // the flow: the streak's tier (Guitar Hero's multiplier, 1x to 4x at 10, 25 and 50 in a row; the overdrive is the
  // top one), and with it the tricks he plays the same presses with
  get tier() {
    return this.od ? 3 : this.combo >= 50 ? 3 : this.combo >= 25 ? 2 : this.combo >= 10 ? 1 : 0;
  }
  // a take for a press from the tricks of the tier he is at (the obstacle's own pick within them)
  // the timing picks the move too (the press's own grade, before he gets there): a perfect press plays a trick a tier
  // up, a great one the tier's, a late or early one the plain move, clumsily (arms flailing: animator)
  trick(kind, o, fallback, at) {
    const q = this.quality(o, at),
      tier = q === 'perfect' ? Math.min(3, this.tier + 1) : q === 'good' ? 0 : this.tier,
      list = TRICKS[kind][tier];
    return list ? take(list, o) : fallback;
  }
  // a strike at a clone in front or behind: the obstacle's pick from the strikes for the streak's tier (a perfect press a
  // tier up, a sloppy one the plain ones), never the one he threw last
  blow(side, o, at) {
    const q = this.quality(o, at),
      tier = q === 'perfect' ? Math.min(3, this.tier + 1) : q === 'good' ? 0 : this.tier,
      list = tier >= 2 ? [...STRIKES[side][0], ...STRIKES[side][1]] : STRIKES[side][0];
    let i = Math.floor((o.v ?? 0) * list.length) % list.length;
    if (list[i] === this.lastBlow) i = (i + 1) % list.length;
    return (this.lastBlow = list[i]);
  }
  quality(o, at) {
    if (!o || at === undefined) return null;
    const e = Math.abs(at - o.t),
      D = this.L.difficulty;
    return e < D.perfect ? 'perfect' : e < D.great ? 'great' : 'good';
  }
  // how far a moment is off the nearest point of a grid of step g (s): the level's grid by default
  offGrid(at, g = this.L.M.grid) {
    const b0 = this.L.A.beats[0] ?? 0;
    return Math.abs(((((at - b0) % g) + g * 1.5) % g) - g / 2);
  }
  // a press with nothing to beat: a move of his own, a link of a freestyle string (Tony Hawk's combo, Alto's
  // multiplier, Devil May Cry's style: the same move again is worth half, then nothing; another wipes that). On the beat
  // (its grid) it adds its points to the string's bank over his head; off it, the string falls (its bank lost). The bank
  // is his only when the string lands: a beat and a bit with no press, or a beat before the next thing in his way; then
  // it pays its points times the moves in it. A thing hit while it is up loses it (the life is the thing's, not the
  // string's). Twice in a freestyle window (level.js)
  link(kind, at, t, dur) {
    const L = this.L,
      beat = L.A.beat;
    if (this.offGrid(at) > L.difficulty.great) return this.string && this.bail(t);
    // (near a thing in his way it is a try at it: no string begun, none added to)
    if (!this.clear(at)) return;
    const free = L.free?.some(w => at >= w[0] && at < w[1]);
    // (the source's door, a secret: pressed on its beat, eight bars of the source code at twice the points)
    if (L.secret?.kind === 'source' && !this.secretT && Math.abs(at - L.secret.door) < L.difficulty.great) {
      this.secretT = t;
      this.source = { t0: t, t1: t + 32 * beat };
      this.fx.push({ k: 'secret', t, kind: 'source', x: this.heroX(t), y: this.y + 1.5 });
    }
    if (this.string && at > this.string.until + 1.25 * beat) this.bank(t);
    const c = (this.string ??= { t0: at, until: at, links: [], pot: 0 });
    let rep = 0;
    for (let i = c.links.length - 1; i >= 0 && c.links[i].kind === kind; i--) rep++;
    const pts = Math.round(LINK[kind] * [1, 0.5, 0][Math.min(rep, 2)] * (free ? 2 : 1) * (1 + this.tier) * this.mult);
    c.links.push({ kind, pts, t: at });
    c.pot += pts;
    c.until = Math.max(c.until, at + dur);
    this.fx.push({ k: 'link', t, kind, pts, n: c.links.length, x: this.heroX(t), y: this.y + 2.3, free });
  }
  // the moves in the string that scored (the bank's multiplier)
  get stringN() {
    return this.string ? Math.min(8, this.string.links.filter(l => l.pts > 0).length) : 0;
  }
  // the string landed: its bank his, times its moves
  bank(t) {
    const c = this.string;
    if (!c) return;
    const n = this.stringN,
      total = c.pot * Math.max(1, n);
    this.score += total;
    this.string = null;
    if (total > 0) this.fx.push({ k: 'bank', t, total, n, x: this.heroX(t), y: this.y + 3.1 });
  }
  // the string fallen: its bank gone
  bail(t) {
    if (!this.string) return;
    this.string = null;
    this.brk = null;
    this.fx.push({ k: 'bail', t, x: this.heroX(t), y: this.y + 3.1 });
  }
  // a string up: landed when he stops pressing, or a beat before the next thing in his way, or out of the run
  stepString(t, s) {
    const c = this.string;
    if (!c) return;
    const beat = this.L.A.beat;
    if (this.mode !== 'run' || this.fly || t > c.until + 1.25 * beat) return this.bank(t);
    if (this.L.obs.some(o => !o.res && o.seg === s && o.t > t && o.t - t < beat && o.t > c.t0 && KINDS[o.type].action !== 'lane')) this.bank(t);
  }
  // nothing in his way (a thing, a clone ahead or behind) whose press window `at` is in (its near window, or `after`
  // seconds ahead if longer), wherever it is: a press there is a try at it, never freestyle
  clear(at, after = 0) {
    const near = this.L.difficulty.near;
    // (a held one is in his way to its end)
    return !this.L.obs.some(o => !o.res && o.type !== 'lane' && o.t + (o.dur ?? 0) > at - near && o.t < at + Math.max(near, after));
  }
  // on the hoverboard (modes.js ride): his freestyle is the board's
  riding(at) {
    return this.L.modeAt?.(at) === 'ride';
  }
  // the next of a family's moves in a turn of the song's own, never the one before
  freeTake(kind, board) {
    const list = board ? BOARD_FREE[kind] : FREE[kind],
      key = board ? `board-${kind}` : kind,
      n = (this.freeN[key] = (this.freeN[key] ?? 0) + 1);
    return list[(n * 5 + (this.L.A.seed ?? 0)) % list.length];
  }
  overdrive(t) {
    if (this.od || this.sync < 0.5 || this.mode === 'dead') return;
    this.od = { t0: t, t1: t + this.sync * 8 * 4 * this.L.A.beat };
    this.sync = 0;
    this.fx.push({ k: 'overdrive', t, x: this.heroX(t), y: this.y + 1 });
  }
  startShaft(s) {
    Object.assign(this, { mode: 'shaft', shaft: s.kind, lane: 1, laneX: s.x, laneV: 0, jump: null, strike: null, swing: null, slide: null, getup: null, landing: null, buffered: null });
  }
  endShaft(t, s) {
    Object.assign(this, { mode: 'run', landT: t, y: s.y0, vy: 0 });
    this.fx.push({ k: 'land', t, x: this.L.xAt(t), y: s.y0 });
  }
  onGround(s) {
    return this.y <= this.gy(s, this.L.xAt(this.t)) + 0.001 && !this.jump;
  }
  // a press of a move nothing near wants, off the beat (its beats, not the finer grid: a mashing thumb is always near
  // some grid point): a stray. It breaks the streak (Guitar Hero's overstrum), and three in two beats trip him: a beat
  // with no moves, whatever comes. A child's one slip costs the streak only; a hop, his own, costs nothing. True while
  // he is tripped (the press is lost)
  stray(a, at, t, s) {
    if (t < this.trippedT) return true;
    if (a === 'jump' || this.offGrid(at, this.L.A.beat) <= this.L.difficulty.perfect) return false;
    const wants = o => KINDS[o.type].action === a || o.keys?.includes(a) || o.key === a,
      due = o => at > o.t - 0.7 && at < o.t + (o.dur ?? 0) + 0.3;
    if (this.L.obs.some(o => !o.res && o.seg === s && due(o) && wants(o))) return false;
    const beat = this.L.A.beat;
    this.combo = 0;
    this.bail(t);
    this.strays = [...this.strays.filter(x => at - x < 2 * beat), at];
    this.fx.push({ k: 'stray', t, x: this.heroX(t), y: this.y + 2.2 });
    if (this.strays.length >= 3) {
      this.trippedT = t + beat;
      this.strays = [];
      this.fx.push({ k: 'tripped', t, x: this.heroX(t), y: this.y + 1.2 });
    }
    return false;
  }
  input(e, t, s) {
    if (e.a === 'release') return this.release(e, t);
    if (e.a === 'sync') return this.overdrive(t);
    this.presses.push({ a: e.a, t: e.t });
    if (e.assist) {
      const c = this.near(['chord'], e.t, s, e.a);
      if (c) this.assisted.add(c);
    }
    if (e.a in this.held) this.held[e.a] = true;
    if (this.mode === 'shaft') {
      if (e.a === 'left') this.lane = Math.max(0, this.lane - 1);
      if (e.a === 'right') this.lane = Math.min(2, this.lane + 1);
      return;
    }
    const at = Math.max(t - 0.15, Math.min(t, e.t));
    if (!this.fly && this.stray(e.a, at, t, s)) return;
    // flying: up and down between the three heights, nothing else
    if (this.fly) {
      if (e.a === 'jump') this.alt = Math.min(2, this.alt + 1);
      if (e.a === 'slide') this.alt = Math.max(0, this.alt - 1);
      this.altLog.push({ t: at, alt: this.alt });
      return;
    }
    if (this.hold2) return;
    // (up pressed for a lid he bursts through out of a shaft: the burst is the move, not a jump after it)
    if (e.a === 'jump' && this.L.obs.some(o => o.type === 'hatch' && !o.res && Math.abs(o.t - at) < this.L.difficulty.near)) return;
    // (up pressed for a leap down a ladder (on with it, or on alone near one, or in its flight: the leap is the move,
    // not a kick): the leap off the island's edge, a late one from as far as he has dropped off it)
    if (e.a === 'jump' || e.a === 'right') {
      const lp = this.near(['leap'], at, s);
      if (lp && e.a === 'jump' && !(this.jump?.leap === lp && !this.jump.fell)) this.startLeap(lp, at, t);
      if (lp || this.jump?.ladder) return;
    }
    // (down pressed too soon in a leap's flight, before the touch's window: he tucks into the roll in mid-air, and the
    // flight forward is gone: short of the island, a miss)
    if (e.a === 'slide' && this.jump?.ladder && !this.short && !this.jump.drop.res && at < this.jump.drop.t - this.L.difficulty.near) return this.tuck(at, t);
    // (down pressed for a touch on an island, or falling to one: the roll is the move, not a dive or a slide; the press
    // judged on the touch's beat)
    // (down pressed for a thing on the roof: scooped up on the run, no slide)
    if (e.a === 'slide') {
      const o = this.near(['roll', 'pick'], at, s);
      if (o) this.cue(o);
      if (o?.type === 'pick') this.pickup = { o, t0: at };
      if (o || this.jump?.drop) return;
    }
    if (e.a === 'jump') {
      if (this.hang(at, t, s)) return;
      if (this.onGround(s) || (!this.jump && t - this.offEdgeT < COYOTE)) this.startJump(at, t, s);
      else this.buffered = { a: 'jump', t };
    } else if (e.a === 'slide') {
      if (this.onGround(s)) this.startSlide(at, s);
      else {
        // in the air: down fast, and the slide starts the moment he touches the roof (a dive: a plate breaks under it);
        // pressed while still over the thing he jumped, the dive waits till he is past it (a press too early is kept, not
        // a fall onto the box)
        this.dive = true;
        this.diveT = at;
        this.buffered = { a: 'slide', t };
      }
    } else if (e.a === 'right') {
      if (!this.swing && !this.hold2) this.startKick(at, s);
    } else if (e.a === 'left') this.backKick(at, t, s);
  }
  // the slide let go: a hold ends (let go within a quarter beat of its end, it is held to the end: the tail is lenient,
  // as in osu!mania and DDR); a plain slide does not care
  release(e, t) {
    const of = e.of ?? 'slide';
    this.held[of] = false;
    const lenient = (o, h) => (h.t1 = t < o.t + o.dur - this.L.M.beat / 4 ? t : Math.max(t, o.t + o.dur));
    const sl = this.slide;
    if (of === 'slide' && sl?.hold) lenient(sl.hold, sl);
    const h = this.hold2;
    if (h && KINDS[h.o.type].action === of) lenient(h.o, h);
  }
  // a hold begun on its press: it lasts while its key is down (to a moment past its end at most)
  startHold(o, at) {
    this.hold2 = { o, kind: o.type, t0: at, t1: this.held[KINDS[o.type].action] ? o.t + o.dur + 0.2 : at + 0.3, tick: 1 };
    this.jump = this.slide = this.getup = this.landing = this.strike = this.swing = null;
    this.cue(o);
  }
  // a clone of these types closing on him that a strike pressed at `at` can meet: from 0.6 s before its beat to a moment
  // after it reaches him (contact: its beat + kickAt)
  closing(types, at, s) {
    const k = this.L.M.kickAt;
    return this.L.obs.find(o => types.includes(o.type) && !o.res && o.seg === s && at > o.t - 0.6 && at < o.t + k + 0.2) ?? null;
  }
  // the obstacle of one of these types whose press is nearest `at` (and near enough), on this stretch, not yet beaten
  near(types, at, s, key) {
    let best = null;
    for (const o of this.L.obs)
      if (types.includes(o.type) && (o.type !== 'chord' || o.keys.includes(key)) && !o.res && o.seg === s && Math.abs(o.t - at) < this.L.difficulty.near && (!best || Math.abs(o.t - at) < Math.abs(best.t - at))) best = o;
    return best;
  }
  // a move committed to an obstacle: the sound of beating it, on the grid point the move ends on
  cue(o) {
    const [name, dt] = KINDS[o.type].cue(this.L.M, o);
    this.fx.push({ k: 'cue', o, name, at: o.t + dt });
  }
  // a grab of the crane's bar near its beat: he swings over the gap under it (run_and_swing's hang, swing and let go)
  // back (←, a swipe back): a back kick at a clone coming up behind him (a brawl), turned on as it reaches him; pressed
  // any time from a little before its beat to the moment it reaches him (the player waits for it to get close, as
  // anyone would); with none, a dance move of his upper body as he runs, a beat long
  backKick(at, t, s) {
    const fb = this.closing(['foeback'], at, s);
    if (fb) {
      const M = this.L.M,
        k = this.blow('back', fb, at),
        contact = Math.max(at + 0.15, fb.t + M.kickAt);
      this.strike = { t0: at, contact, dur: (contact - at) / k[3], take: k, back: true, clumsy: this.quality(fb, at) === 'good' };
      this.jump = this.slide = this.getup = this.landing = null;
      return this.cue(fb);
    }
    if (this.swing) return;
    // (the next of the dances in a shuffled order of the song's own, so none comes back till all have been danced)
    this.danceN = (this.danceN ?? 0) + 1;
    this.dance = { t0: at, take: DANCES[(this.danceN * 13 + (this.L.A.seed ?? 0)) % DANCES.length] };
    this.brk = null;
    this.link('dance', at, t, 2 * this.L.A.beat);
  }
  // up (↑, a swipe up) under something hanging: reached for. A line over a gap ridden along while held; a crane's bar
  // grabbed, swung on, let go of. True if there was one (the press is spent on it, not on a jump)
  hang(at, t, s) {
    const zip = this.near(['zip'], at, s);
    if (zip) {
      if (this.y < s.y0 + 0.2) this.startHold(zip, at);
      return true;
    }
    const o = this.near(['grab'], at, s);
    if (!o) return false;
    if (this.swing || this.y < s.y0 - 0.2) return true;
    this.swing = { o, t0: at, t1: o.t + o.dur, x: this.L.xAt(t) };
    this.cue(o);
    this.jump = this.slide = this.getup = this.landing = this.strike = null;
    this.y = s.y0;
    this.vy = 0;
    return true;
  }
  // where he is on the swing: his hands on the bar while he hangs, then flying on to where the run picks him up
  swingX(t) {
    const w = this.swing,
      u = Math.min(1, (t - w.t0) / (w.t1 - w.t0)),
      handX = this.anim.handAhead('run_and_swing', 30 + 100 * u),
      hang = w.o.barX - handX,
      off = u < 0.55 ? 0 : (u - 0.55) / 0.45;
    return hang + (this.L.xAt(t) - hang) * off * off * (3 - 2 * off);
  }
  // the jump starts when the finger landed: its arc is advanced to now. Pressed for an obstacle it lands where a
  // perfect press would have (on the grid); pressed for a gap it is a long jump over it
  startJump(at, t, s, spin = false) {
    const glide = this.near(['glide'], at, s);
    if (glide) return this.startHold(glide, at);
    const M = this.L.M,
      o = this.near(['jump', 'hold', 'chord'], at, s, 'jump'),
      gap = o?.type === 'hold' ? o : null,
      isle = gap?.isle !== undefined ? gap : null,
      oa = o?.air ?? M.air,
      air = gap ? Math.max(isle ? 0.3 : 0.5, o.t + o.dur - at) : o ? Math.max(0.6 * oa, Math.min(1.5 * oa, o.t + oa - at)) : M.air,
      // (mini: a lower jump, over lower things)
      // (a leap to an island: as high as its air lets it look easy, and up or down onto it: the arc ends on its top)
      // (off the island he leaves, even pressed a moment after running off its edge)
      y0 = isle ? isle.yFrom : this.gy(s, this.L.xAt(at)),
      rise = isle ? isle.yTo - y0 : 0,
      h = isle ? Math.max(1.0, Math.min(2.6, 2.4 * air)) + Math.max(0, rise) * 0.4 : gap ? H_LONG : M.jumpH * (this.L.miniAt?.(at) > 0.5 ? 0.7 : 1),
      g = (8 * h) / air ** 2,
      v0 = (4 * h) / air + rise / air,
      d = t - at;
    // (the obstacle's take of the move: over a gap or a tall thing, a flip)
    // (and as the streak grows, bigger tricks; a chord: up into a flying strike at the clone)
    // (an island's leap a jump, a long one a flip)
    this.jump = { t0: at, g, air, gap, clumsy: this.quality(o, at) === 'good', take: o?.type === 'chord' ? take(TRICKS.airkick, o) : this.trick('jump', o, take((gap && !(isle && air < 0.7)) || o?.tall ? MOVES.flips : MOVES.jumps, o), at) };
    // (a hop of his own, for nothing: a trick of the streak's tier, a bit lower and quicker)
    if (!o && this.clear(at)) {
      const board = this.riding(at);
      this.jump.take = this.freeTake('air');
      if (board) this.jump.btrick = this.freeTake(spin ? 'kick' : 'air', true);
      this.link(spin ? 'kick' : 'air', at, t, air);
    } else if (!o && this.tier) this.jump.take = take(TRICKS.jump[this.tier], { v: (at * 7.31) % 1 });
    if (o?.type === 'chord') this.strike = null;
    this.y = y0 + v0 * d - (g * d * d) / 2;
    this.vy = v0 - g * d;
    this.slide = this.getup = this.landing = this.buffered = this.brk = this.roll = null;
    if (o) this.cue(o);
  }
  // a slide pressed for something to slide under lasts until a perfect one would have got up
  startSlide(at, s) {
    const grind = this.near(['grind'], at, s);
    if (grind) return this.startHold(grind, at);
    const M = this.L.M,
      o = this.near(['slide', 'long', 'chord'], at, s, 'slide');
    // (down for nothing: a break of his own on the roof, two to four beats as its moves are long, never into the next
    // thing in his way)
    if (!o && this.clear(at, 1.5 * this.L.A.beat)) {
      const beat = this.L.A.beat,
        board = this.riding(at),
        k = board ? FREE.brk[0] : this.freeTake('brk'),
        beats = Math.max(2, Math.min(4, Math.round(brkFrames(k) / 60 / beat / 1.4))),
        next = this.L.obs.find(q => !q.res && q.t > at && q.type !== 'lane'),
        t1 = Math.min(at + beats * beat, next ? next.t - beat : Infinity, s.t1 - 0.5 * beat);
      this.brk = { t0: at, t1: Math.max(at + beat, t1), take: k, board: board ? this.freeTake('brk', true) : null };
      if (board) this.brk.t1 = Math.min(this.brk.t1, at + 2 * beat);
      this.dance = this.strike = this.getup = this.landing = null;
      return this.link('brk', at, at, this.brk.t1 - at);
    }
    this.brk = this.roll = null;
    if (o?.type === 'chord') {
      this.strike = null;
      this.slide = { t0: at, t1: Math.max(at + 0.3, o.t + M.slide), take: take(TRICKS.sweep, o) };
    } else if (o?.type === 'long') {
      // held for as long as the note: until let go, or a moment past its end (no getting stuck down)
      this.slide = { t0: at, t1: this.held.slide ? o.t + o.dur + 0.25 : at + 0.3, hold: o, tick: 1, take: slideTake(o) };
      if (this.held.slide) this.cue(o);
    } else this.slide = { t0: at, t1: o ? Math.max(at + Math.min(0.3, M.duck), o.t + (o.slide ?? M.slide)) : at + M.slide, clumsy: this.quality(o, at) === 'good', take: this.trick('slide', o, slideTake(o), at) };
    this.getup = this.landing = null;
    if (o && o.type !== 'long') this.cue(o);
  }
  // the flying kick, timed so the foot meets the pane on its grid point
  startKick(at, s) {
    const dash = this.near(['dash'], at, s);
    if (dash) return this.startHold(dash, at);
    const M = this.L.M,
      // (a thing thrown at him, batted home; or what he carries, thrown: his upper body over his run, its contact (the
      // bat meeting it, the hand letting go) on the grid point after the press)
      pr = this.near(['bat', 'throw'], at, s);
    if (pr && (pr.type === 'bat' || this.carry)) {
      const k = PROP_TAKES[pr.type],
        contact = Math.max(at + 0.15, pr.t + M.kickAt);
      this.strike = { t0: at, contact, dur: (contact - at) / k[3], take: k, o: pr, clumsy: this.quality(pr, at) === 'good' };
      this.dance = this.brk = this.getup = this.landing = null;
      return this.cue(pr);
    }
    const o = this.near(['smash', 'chord'], at, s, 'right') ?? this.closing(['foe'], at, s);
    // (a chord's kick lands from the jump or the slide it goes with)
    if (o?.type === 'chord' && (this.jump || this.slide)) return;
    // (on the board, on for nothing: he spins round with it in the air, a trick of his own, not a kick)
    if (!o && this.riding(at) && this.onGround(s) && !this.slide && !this.hold2 && this.clear(at, M.air + 0.4)) return this.startJump(at, at, s, true);
    const k = o?.type === 'foe' ? this.blow('front', o, at) : o ? this.trick('kick', o, take(MOVES.kicks, o), at) : this.clear(at) ? this.freeTake('kick') : take(TRICKS.kick[Math.max(1, this.tier)], { v: (at * 3.7) % 1 }),
      contact = o ? Math.max(at + 0.15, o.t + M.kickAt) : at + M.kickAt;
    this.strike = { t0: at, contact, dur: (contact - at) / k[3], take: k, clumsy: this.quality(o, at) === 'good' };
    this.brk = null;
    if (o) this.cue(o);
    else this.link('kick', at, at, this.strike.dur);
  }
  overGap(x) {
    const h = this.hold2?.kind;
    return !this.swing && h !== 'glide' && h !== 'zip' && h !== 'grind' && this.L.obs.find(o => (o.type === 'hold' || o.type === 'grab' || o.type === 'glide' || o.type === 'zip' || o.type === 'grind') && o !== this.respawn?.o && x > o.x0 + 0.15 && x < o.x1 - 0.15);
  }
  stepRun(t, dt, s) {
    const x = this.L.xAt(t),
      j = this.jump,
      // (the ground under him: his level's, or an island's)
      gy = this.gy(s, x);
    // a flight (modes.js): up off the roof a beat before it, a spring to the height he is at, down a beat after
    const w = this.L.flightAt?.(t);
    if (w) {
      if (!this.fly) Object.assign(this, { fly: w, alt: 1, altLog: [{ t, alt: 1 }], vy: 0, jump: null, slide: null, strike: null, getup: null, landing: null, buffered: null, dance: null, brk: null });
      const beat = this.L.M.beat,
        up = Math.min(1, (t - (w.t0 - beat)) / beat) * Math.min(1, Math.max(0, (w.t1 + beat - t) / beat)),
        target = s.y0 + ALT[this.alt] * up,
        k = 15;
      // (two critically damped springs in a row: the height eases out of where it was and into where it goes, an S
      // with no snap at either end, the body's pitch following its velocity smoothly; the ring is judged by the height
      // pressed for, not this)
      if (this.fy === undefined || !this.flyOn) Object.assign(this, { fy: this.y, fvy: 0, flyOn: true });
      this.fvy += (k * k * (target - this.fy) - 2 * k * this.fvy) * dt;
      this.fy += this.fvy * dt;
      this.vy += (k * k * (this.fy - this.y) - 2 * k * this.vy) * dt;
      this.y += this.vy * dt;
      return;
    }
    this.flyOn = false;
    if (this.fly) {
      Object.assign(this, { fly: null, y: s.y0, vy: 0, landT: t });
      this.fx.push({ k: 'land', t, x, y: s.y0 });
    }
    // fallen in a gap: he drops into it a moment, then the cursor has him by the scruff and carries him over it at a run,
    // dangling, and sets him down past it, running on (never gone, never put somewhere else: the song goes on and he
    // with it)
    if (this.respawn) {
      const since = t - this.respawn.t0;
      if (x < this.respawn.o.x1 + 0.2) {
        const e = Math.min(since, 0.25),
          down = this.respawn.y - 4.9 * e * e,
          up = Math.max(0, Math.min(1, (since - 0.25) / 0.3));
        this.y = down + ((this.respawn.o.yTo ?? s.y0) + 0.5 - down) * up * up * (3 - 2 * up);
        this.vy = 0;
        return;
      }
      this.respawn = null;
      this.y = gy;
      this.landT = t;
      this.fx.push({ k: 'land', t, x, y: gy });
    }
    // (fallen down a hole however it happened: counted as the gap it is, and taken out of it)
    if (!this.short && this.y < gy - 2.5) {
      const o = this.L.obs.find(q => q.x0 !== undefined && x > q.x0 - 0.5 && x < q.x1 + 0.5 && q.seg === s);
      if (o && !o.res) this.hit(o, t);
      else if (o) backOnTheFarSide(this, o);
      else Object.assign(this, { y: gy, vy: 0 });
      if (this.mode === 'dead') return;
    }
    // (out of a kick he is back in his run: the animator has blended it back in through the follow-through)
    if (this.strike && t - this.strike.t0 > this.strike.dur) this.strike = null;
    if (!j && !this.hold2 && !this.swing) this.offEdge(t, s);
    if (this.short) this.stepShort(t, s);
    else if (this.jump?.ladder) {
      // (a flight down a ladder: on its arc exactly, down on the island on the touch's beat)
      const k = this.jump,
        d = Math.min(t, k.t0 + k.air) - k.t0;
      this.y = k.y0 + k.v0 * d - (k.g * d * d) / 2;
      this.vy = k.v0 - k.g * d;
      // (a dud off a trampoline, fallen past the island it was on: the cursor's grip, as out of any gap, sets him on the
      // island above a moment after its touch's beat; the touch missed then and there, a life)
      if (k.dud && this.vy < 0 && this.y < k.y0 - 0.8) {
        const ro = k.drop;
        this.short = { t0: t, ro, y0: this.y, vy0: this.vy, g: k.g, v: this.L.vAt(t), T: 0.1, c: { t0: t, y: this.y, lag: 0, t1: Math.max(t + 0.45, ro.t + 0.4 * ro.air) } };
        this.jump = null;
        if (!ro.res) this.hit(ro, t);
      } else if (t >= k.t0 + k.air) this.land(t, s, k);
    } else if (this.hold2) this.stepHold(t, dt, s, x);
    else if (this.swing) {
      this.swing.x = this.swingX(t);
      if (t >= this.swing.t1) {
        this.landing = { t0: t, d: 0.24 };
        this.swing = null;
      }
    } else if (j || this.y > gy + 0.001) {
      if (this.dive && !this.L.obs.some(o => o.type === 'jump' && o.seg === s && x > o.x - 0.6 && x < o.x + 0.4)) {
        this.dive = false;
        if (this.vy > -6) this.vy = -9;
      }
      this.vy -= (j ? j.g : (8 * this.L.M.jumpH) / this.L.M.air ** 2) * dt;
      this.y += this.vy * dt;
      if (this.y <= gy && !this.overGap(x)) this.land(t, s, j);
    } else if (this.overGap(x)) {
      if (this.vy === 0) this.offEdgeT = t;
      this.vy -= 30 * dt;
      this.y += this.vy * dt;
    }
    // each beat held under a long ceiling scores and adds to the combo
    const sl = this.slide;
    if (sl?.hold && sl.tick * this.L.M.beat < sl.hold.dur && t >= sl.hold.t + sl.tick * this.L.M.beat && t <= sl.t1) {
      sl.tick++;
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.score += Math.round((50) * this.mult);
      this.fx.push({ k: 'tick', t, x: this.L.xAt(t), y: this.y + 0.5 });
    }
    if (this.brk && t > this.brk.t1) this.brk = null;
    // (a thing coming after all: the break and the dance give way a beat before it, so he is up and ready for it)
    if ((this.brk || this.dance) && !this.clear(t, this.L.A.beat)) this.brk = this.dance = null;
    if (this.slide && t > this.slide.t1) {
      this.getup = { t0: t, d: 0.32, take: this.slide.take };
      this.slide = null;
    }
    if (this.getup && t - this.getup.t0 > this.getup.d) this.getup = null;
    if (this.landing && t - this.landing.t0 > this.landing.d) this.landing = null;
    if (this.roll && t > this.roll.t1) this.roll = null;
    if (this.pickup && t - this.pickup.t0 > 0.7) this.pickup = null;
  }
  // a leap down a ladder of islands (level.js ladder), from the press: a long jump off the edge, its apex a metre and
  // more over it, down onto the next island on the touch's beat whenever it was pressed (Hi-Fi Rush's rule: the flight
  // squeezed or stretched to land on the beat); a late one from where he has dropped to off the edge, lower
  // Up a ladder, a launch off the trampoline on its edge: as high as a body thrown that far up in that time goes under
  // a gravity a little over twice the world's (UP_G), over the next island by 1.2 m to 3 m; a late one off the
  // trampoline's rebound, from where it has him
  startLeap(o, at, t) {
    const ro = this.L.isles[o.isle].rolls[o.k],
      off = !!this.jump?.ladder,
      // (up: from as far down as the trampoline has given under him)
      y0 = off ? this.jump.y0 + this.jump.v0 * (at - this.jump.t0) - (this.jump.g * (at - this.jump.t0) ** 2) / 2 : o.yFrom - (o.asc ? this.padSink(at) : 0),
      D = y0 - ro.yTo,
      h = o.asc ? launchApex(D, ro.t - at) : off ? 0.45 : Math.max(0.9, Math.min(1.4, 0.7 + 0.12 * D));
    o.fell = true;
    // (when it threw him, for its trampoline's spring back, render)
    Object.assign(o, { goT: at, dud: false });
    this.fly2(at, t, o, ro, y0, h, false);
    this.cue(o);
  }
  // the flight to the next island: from y0 at t0, up h, down onto the island on the touch's beat (g and the speed up
  // off the edge from those: the apex and the fall of a body, a little stronger than the world's gravity)
  fly2(t0, t, o, ro, y0, h, fell) {
    const T = Math.max(0.3, ro.t - t0),
      D = y0 - ro.yTo,
      g = ((Math.sqrt(2 * h) + Math.sqrt(2 * (h + D))) / T) ** 2,
      v0 = Math.sqrt(2 * g * h),
      d = Math.max(0, t - t0);
    this.jump = { t0, g, air: T, v0, y0, gap: null, leap: o, drop: ro, ladder: true, fell, clumsy: fell || this.quality(o, t0) === 'good', take: null };
    this.y = y0 + v0 * d - (g * d * d) / 2;
    this.vy = v0 - g * d;
    this.slide = this.getup = this.landing = this.buffered = this.brk = this.dance = this.roll = this.strike = null;
  }
  // tucked too soon: balled up, his run forward through the air checked at once (to a twentieth in a few hundredths of
  // a second, a metre short of the run at most) and falling quicker for it, so he comes down short of the island's lip
  // whenever he tucked (by its touch at the latest, the lip and a body's width behind where the run has him), past it
  // into the gap; then the cursor has him,
  // as out of any gap, and sets him on the island in time for the next leap. The touch missed then and there (a life)
  tuck(at, t) {
    const j = this.jump,
      ro = j.drop,
      d = at - j.t0;
    this.short = { t0: at, ro, y0: j.y0 + j.v0 * d - (j.g * d * d) / 2, vy0: j.v0 - j.g * d, g: 1.8 * j.g, v: this.L.vAt(at), T: Math.max(0.1, ro.t - at), c: null };
    this.hit(ro, t);
  }
  // how far short of the run he is, tucked (and carried back up to it by the cursor)
  lag(t) {
    const sh = this.short,
      d = Math.max(0, t - sh.t0),
      u = Math.min(1, d / sh.T),
      run = Math.min(LIP + 0.6, sh.v * 0.95 * (d - 0.06 * (1 - Math.exp(-d / 0.06)))),
      lag = Math.max(run, (LIP + 0.4) * u * u * (3 - 2 * u));
    if (!sh.c) return lag;
    const e = Math.min(1, (t - sh.c.t0) / (sh.c.t1 - sh.c.t0));
    return sh.c.lag * (1 - e * e * (3 - 2 * e));
  }
  stepShort(t, s) {
    const sh = this.short,
      d = t - sh.t0;
    if (!sh.c) {
      this.y = sh.y0 + sh.vy0 * d - (sh.g * d * d) / 2;
      this.vy = sh.vy0 - sh.g * d;
      // (down past the island's top, short of it: the cursor's grip, as out of a gap, till a moment after the touch's
      // beat)
      // (up a ladder: once falling under the island's lip, a body's height short of it)
      if (this.y < sh.ro.yTo - (sh.ro.asc ? (this.vy < 0 ? 0.9 : 1e9) : 1.6)) {
        sh.c = { t0: t, y: this.y, lag: this.lag(t), t1: Math.max(t + 0.45, sh.ro.t + 0.4 * sh.ro.air) };
        this.jump = null;
      }
      return;
    }
    const e = Math.min(1, (t - sh.c.t0) / (sh.c.t1 - sh.c.t0)),
      w = e * e * (3 - 2 * e);
    this.y = sh.c.y + (sh.ro.yTo - sh.c.y) * w + 0.5 * 4 * e * (1 - e);
    this.vy = 0;
    if (t >= sh.c.t1) {
      this.short = null;
      this.y = this.gy(s, this.L.xAt(t));
      this.landT = this.respawnT = t;
      this.landing = { t0: t, d: 0.3 };
      this.fx.push({ k: 'land', t, x: this.L.xAt(t), y: this.y });
    }
  }
  // a leap not pressed by the time he is at the island's edge: he runs off it and drops onto the next (a stumble off
  // its lip, then falling), touching it on its beat all the same
  // Up a ladder, unpressed: the trampoline throws him up a little, not onto the island above (a dud: a hop of 0.9 m), and
  // he falls past its edge into the gap, where the cursor has him (stepRun)
  offEdge(t, s) {
    const o = this.L.obs.find(q => q.type === 'leap' && q.seg === s && t >= q.edgeT && t < q.end && !q.fell);
    if (!o) return;
    o.fell = true;
    const ro = this.L.isles[o.isle].rolls[o.k];
    if (!o.asc) return this.fly2(o.edgeT, t, o, ro, o.yFrom, 0.06, true);
    Object.assign(o, { goT: o.edgeT, dud: true });
    const g = UP_G,
      v0 = Math.sqrt(2 * g * 0.9),
      d = Math.max(0, t - o.edgeT);
    this.jump = { t0: o.edgeT, g, air: Math.max(0.3, ro.t - o.edgeT), v0, y0: o.yFrom, gap: null, leap: o, drop: ro, ladder: true, fell: true, dud: true, clumsy: true, take: null };
    this.y = o.yFrom + v0 * d - (g * d * d) / 2;
    this.vy = v0 - g * d;
    this.slide = this.getup = this.landing = this.buffered = this.brk = this.dance = this.roll = this.strike = null;
  }
  // a hold under way: gliding (up over the gap, floating), dashing (through the panes) or on the line (hanging, carried
  // along); every beat of it scores; let go, he falls (into the gap, if it is under him) or runs on
  stepHold(t, dt, s, x) {
    const h = this.hold2,
      o = h.o,
      beat = this.L.M.beat;
    if (h.kind === 'glide') {
      const top = s.y0 + 1.7 + 0.12 * Math.sin((t - h.t0) * 5);
      this.y += (top - this.y) * Math.min(1, dt * 7);
      this.vy = 0;
    } else if (h.kind === 'grind') {
      // (on the rail: a hand's breadth over the roof's line)
      this.y += (s.y0 + 0.18 - this.y) * Math.min(1, dt * 14);
      this.vy = 0;
    } else if (h.kind === 'zip') {
      this.y += (s.y0 + 0.35 - this.y) * Math.min(1, dt * 10);
      this.vy = 0;
    } else if (h.kind === 'dash') {
      // (a ram runs on his feet: started in the air (a jump just before it), he comes down onto the roof in a moment and
      // drives on along it, never on through the air at the height the press caught him)
      this.y += (this.gy(s, x) - this.y) * Math.min(1, dt * 16);
      this.vy = 0;
    }
    if (h.tick * beat < o.dur && t >= o.t + h.tick * beat && t <= h.t1) {
      h.tick++;
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.score += Math.round((50) * this.mult);
      this.fx.push({ k: 'tick', t, x, y: this.y + 0.8 });
    }
    // (a dash breaks each pane as he reaches it)
    if (h.kind === 'dash') for (const [i, px] of o.panes.entries()) if (!o.broke[i] && x > px - 0.45 && t <= h.t1) (o.broke[i] = t), this.fx.push({ k: 'smash', t, x: px, y: o.y, skin: o.skin, dash: true });
    if (t > h.t1) {
      this.hold2 = null;
      if (h.kind === 'dash') this.landing = { t0: t, d: 0.25 };
    }
  }
  // the hold he is in, by kind (the judge of a corridor asks)
  get held2() {
    return this.hold2 ? { [this.hold2.kind]: true } : {};
  }
  land(t, s, j) {
    this.dive = false;
    this.y = this.gy(s, this.L.xAt(t));
    // (touched down on an island, on its kick: a puff off it, the picture knocked a little)
    if (j?.gap?.isle !== undefined) this.fx.push({ k: 'touch', t, x: this.L.xAt(t), y: this.y });
    this.vy = 0;
    this.jump = null;
    // (down on an island: rolled out of it if down was pressed on its beat, else landed hard (a late press still turns
    // it into a roll, pass below), till he leaps off its edge)
    if (j?.drop) {
      const o = j.drop,
        next = this.L.isles?.[o.isle]?.leaps?.[o.k + 1];
      this.roll = { o, t0: t, t1: Math.min(t + 1.2, next ? next.t - 0.12 : Infinity), hard: o.res !== 'ok' };
      this.fx.push({ k: 'touch', t, x: this.L.xAt(t), y: this.y });
    } else if (j) this.landing = { t0: t, d: 0.24, take: j.take };
    // a jump pressed just before touching down fires now; a slide pressed in the air starts now
    const b = this.buffered;
    if (b?.a === 'jump' && t - b.t <= BUFFER) this.startJump(t, t, s);
    else if (b?.a === 'slide') this.startSlide(t, s);
    this.buffered = null;
  }
  // where a climb has him at t: on the music's path whatever was pressed. He leaps from the road's edge onto a thing
  // the cursor has dropped, rides it down as it falls, and leaps on the beat to the next one, falling higher up on the
  // other side, and so on up: a leap goes the moment it is pressed (early or late within its window: a late one is a
  // quicker leap to the same thing on the same beat, from lower down: he rode it further); unpressed, the thing drops
  // away faster under him until its window is gone, then he falls, and the cursor (the AI that keeps him in its test)
  // snatches him out of the air and sets him on the next thing on its beat: the song never waits (a life gone; with none
  // left it lets him fall)
  climbAt(s, t) {
    const P = s.climbPts,
      k = Math.max(0, P.findLastIndex(p => p.t <= t)),
      a = P[k],
      z = P[Math.min(P.length - 1, k + 1)];
    if (a === z) return { x: a.x, y: a.y, u: 1, face: 1 };
    // (each leap lands on the next thing a little before its beat: the window to press in is the ride and a moment
    // after it, never a millisecond to hit; pressed, he is off at once)
    const near = this.L.difficulty.near,
      cling = mark => (mark?.o ? Math.min(0.12, 0.25 * (mark.t - a.t)) : 0);
    // (up alone where up and across was asked: a hop straight up off where he is, falling into the drop)
    if (a.o.up === undefined && ticPress(this, a.o) === null) {
      const up = loneUp(this, a.o, t);
      if (up !== null) a.o.up = up;
    }
    const hop = a.o.up,
      pr = hop === undefined ? ticPress(this, a.o) : null,
      arrived = a.t - cling(a),
      bad = pr === null && (t > a.t + near || a.o.res === 'hit' || hop !== undefined),
      push = pr !== null ? Math.max(arrived, Math.min(a.t + near, pr)) : hop !== undefined ? Math.max(arrived, hop) : bad ? a.t + near : Infinity,
      land = z.t - cling(z),
      face = Math.sign(z.x - a.x) || (s.face ?? 1),
      // (a beam's mark moves with it: shoved by his landing, kicked by his leaving (kinds.js beamBody))
      at = (p, tt) => (p.o && !p.o.floor ? beamMark(p.o, tt) : p),
      // (on a beam he faces it, his feet on its side: the side it is on)
      sideOf = p => (p.o && !p.o.floor ? p.o.side : face);
    // (at the road's edge, running at the first; on a beam, crouched against its side, falling with it)
    if (t < push) {
      if (a.o.floor) return { x: a.x, y: a.y, u: 0, face, entry: 'run' };
      const m = at(a, t);
      return { x: m.x, y: m.y, u: 0, face: sideOf(a), wall: true, since: t - arrived, slip: t > a.t + 0.05 };
    }
    const S = at(a, push),
      xs = S.x,
      ys = S.y,
      // (in the air to the next: on it by its beat at the latest)
      end = Math.max(Math.min(land, z.t), push + 0.12),
      E = at(z, end),
      xe = E.x,
      ye = E.y,
      T = Math.max(0.08, end - push),
      fin = z === P.at(-1);
    // (the moment he leaves it: his legs drive him off it at the leap's first velocity, it taking the push back (the
    // beam's own flight, kinds.js); falling off it unpressed, nothing pushes)
    if (!a.o.floor && a.o.kickT === undefined) {
      a.o.kickT = push;
      a.o.kickV = bad ? null : fin ? [(1.6 * (s.x - face * 0.85 - xs)) / (0.38 * T), (s.y1 - 1.4 - ys + 3.2) / (0.38 * T)] : [(1.6 * (xe - xs)) / T, (ye - ys + 4.4) / T];
    }
    // (the moment he lands on the next: his velocity then, coming in, shoves it (set down in the cursor's grip: gently))
    if (t >= end && !fin && z.o && z.o.meetT === undefined) {
      z.o.meetT = end;
      z.o.meetV = bad ? null : [(1.25 * (xe - xs)) / T, (ye - ys - 4.4) / T];
    }
    if (t >= end && !fin) {
      const m = at(z, t);
      return { x: m.x, y: m.y, u: 1, face: sideOf(z), wall: true, since: t - end };
    }
    const u = Math.min(1, (t - push) / T);
    if (bad && hop !== undefined) {
      // (the hop straight up: up off it and down past where he was, a little out over the drop off the road's edge; then
      // the cursor's grip, carrying him up to the next)
      const span = Math.max(0.3, end - push),
        H = Math.min(0.8, span * 0.55),
        // (the hop and the fall under way before the grip has him, whatever the beat: half a metre up a third of the way
        // in, a metre and more under where he hopped from by its end, quicker the less time there is)
        e = Math.min(t - push, H),
        hx = xs + (a.o.floor ? face * 0.9 * Math.min(1, e / H) : 0),
        hy = ys + (2.857 * e) / H - (4.08 * e * e) / (H * H);
      if (t - push < H) return { x: hx, y: hy, u, face, bad, hop: e < 0.35 * H, falling: e >= 0.35 * H };
      const v = Math.min(1, (t - push - H) / Math.max(0.05, span - H)),
        w = v * v * (3 - 2 * v);
      return { x: hx + (xe - hx) * w, y: hy + (ye - hy) * w + 0.6 * 4 * v * (1 - v), u: v, face, bad, carry: true };
    }
    if (bad) {
      // (falling with it, then caught and carried across in the cursor's grip, dangling, set down on the next)
      const span = Math.max(0.2, end - push),
        fallT = Math.min(0.32, span * 0.4),
        e = Math.min(t - push, fallT),
        fy = ys - 4.9 * e * e;
      if (t - push < fallT) return { x: xs, y: fy, u, face, bad, falling: true };
      const v = Math.min(1, (t - push - fallT) / Math.max(0.05, span - fallT)),
        w = v * v * (3 - 2 * v);
      return { x: xs + (xe - xs) * w, y: fy + (ye - fy) * w + 0.6 * 4 * v * (1 - v), u: v, face, bad, carry: true };
    }
    // (the finish: a leap at the face of the roof above, feet planted on it a metre and more under its top, then up it
    // and over its edge onto the roof (Mixamo's sprint to wall climb), there on the top's beat)
    if (fin) {
      const out = face,
        fx = s.x - out * 0.85,
        fy = s.y1 - 1.4,
        leap = 0.38;
      if (u < leap) {
        const v = u / leap,
          q = v < 0.5 ? 0.5 * (1 - (1 - 2 * v) ** 1.6) : 0.5 + 0.5 * (2 * v - 1) ** 1.25;
        return { x: xs + (fx - xs) * q, y: ys + (fy - ys) * v + 0.8 * 4 * v * (1 - v), u: v, face: out, fa: sideOf(a), fz: out, n: a.o.k ?? 0 };
      }
      // (hung from its edge, feet on its face; pulled up till his chest is over it; then over and up onto it)
      const v = (u - leap) / (1 - leap);
      if (v < 0.62) {
        const p = v / 0.62;
        return { x: fx, y: fy + (z.y - 0.55 - fy) * p * p * (3 - 2 * p), u: v, face: out, mantle: true };
      }
      const p = (v - 0.62) / 0.38,
        e = p * p * (3 - 2 * p);
      return { x: fx + (z.x - fx) * e, y: z.y - 0.55 + 0.55 * Math.min(1, p * 1.6), u: v, face: out, mantle: true };
    }
    // (a real leap: off fast, easing into its apex, quickening into the landing: a high arc between)
    const w = u < 0.5 ? 0.5 * (1 - (1 - 2 * u) ** 1.6) : 0.5 + 0.5 * (2 * u - 1) ** 1.25;
    return { x: xs + (xe - xs) * w, y: ys + (ye - ys) * u + 1.1 * 4 * u * (1 - u), u, face, fa: sideOf(a), fz: fin ? face : sideOf(z), out: fin, n: a.o.k ?? 0, leap: !!a.o.floor };
  }
  // where his eyes go on a climb: on a beam (or the road's edge), at the one he leaps to next; in the air, at the one
  // he is flying to (its middle, where he will meet it; the roof's edge at the end)
  climbLook(s, t, c) {
    const P = s.climbPts,
      k = Math.max(0, P.findLastIndex(p => p.t <= t)),
      onIt = c.wall || c.entry,
      // (landed early on the next one: he is on P[k + 1], looking at P[k + 2])
      ahead = c.wall && c.u === 1 ? 2 : 1,
      q = P[Math.min(P.length - 1, k + (onIt ? ahead : 1))];
    if (!q.o || q.o.floor) return [q.x, q.y + 0.6];
    const m = beamMark(q.o, t);
    return [m.x, m.y + 1.4];
  }
  stepShaft(dt, s, t) {
    if (s.climbPts?.length > 1 && t >= s.climbPts[0].t) {
      const c = this.climbAt(s, t);
      c.look = this.climbLook(s, t, c);
      this.laneV = (c.x - this.laneX) / Math.max(dt, 1e-3);
      this.laneX = c.x;
      this.y = c.y;
      this.climbPose = c;
      return;
    }
    this.climbPose = null;
    // (each beat held through a zone scores)
    for (const o of this.L.obs)
      if (o.type === 'zone' && o.seg === s && !o.res && this.held[o.key]) {
        o.tick ??= 1;
        if (o.tick * this.L.M.beat < o.dur && t >= o.t + o.tick * this.L.M.beat) {
          o.tick++;
          this.combo++;
          this.score += Math.round((50) * this.mult);
          this.fx.push({ k: 'tick', t, x: this.laneX, y: this.y + 1 });
        }
      }
    // a critically damped spring: he drifts across the lanes in about a third of a second, he does not snap
    // (and in the shaft's last half second drawn in to its middle, so he lands, or comes out on top, where the run goes
    // on: never beside the shaft and put back)
    const w = 10,
      gather = Math.max(0, Math.min(1, (s.t1 - t) / 0.5)),
      to = s.x + (this.laneXOf(s, this.lane) - s.x) * gather * gather * (3 - 2 * gather),
      a = w * w * (to - this.laneX) - 2 * w * this.laneV;
    this.laneV += a * dt;
    this.laneX += this.laneV * dt;
    this.y = this.shaftY(s, t);
  }
  judge(t, s) {
    const x = this.heroX(t);
    for (const o of this.L.obs) {
      if (o.res || o.t > t + 1) continue;
      if (o.type !== 'lane' && o.type !== 'gate' && o.seg !== s) {
        if (t > o.t + 0.5) o.res = 'skip';
        continue;
      }
      const r = JUDGE[o.type](this, o, x, t);
      if (r?.[0] === 'hit') this.hit(o, t);
      else if (r?.[0] === 'pass') this.pass(o, t);
    }
  }
  // graded by how near its press moment the press was (a ledge dodged is a perfect: it is where he is that counts)
  pass(o, t) {
    o.res = 'ok';
    o.okT = t;
    // (a clean kick off a beam: a puff off its side where his feet left it)
    if (o.type === 'tic' && !o.floor) this.fx.push({ k: 'chalk', t, ...beamMark(o, t), side: o.side || 1, place: this.L.placeAt?.(t) ?? this.L.place });
    // (a fork's gate kicked: the hard route; a boss's fist kicked back: a blow to it)
    if (o.fork !== undefined) this.route(o.fork, true, t);
    if (o.skin === 'fist' && this.L.boss) {
      this.bossHits++;
      this.fx.push({ k: this.bossHits >= this.L.boss.hp ? 'bossdown' : 'bossdmg', t, x: o.x, y: o.y + 1.2 });
    }
    const at = o.press ?? o.t,
      p = this.presses
        .filter(q => wants(o, q.a) && q.t > at - 0.4 && q.t < at + 0.3)
        .sort((a, b) => Math.abs(a.t - at) - Math.abs(b.t - at))[0],
      e = p ? p.t - at : null,
      D = this.L.difficulty,
      g = o.type === 'lane' || o.type === 'gate' || o.type === 'zone' || o.type === 'ring' ? 'perfect' : e === null ? 'good' : Math.abs(e) < D.perfect ? 'perfect' : Math.abs(e) < D.great ? 'great' : 'good';
    o.grade = g;
    this.counts[g]++;
    if (g === 'perfect' && this.perk('vampire')) this.hp = Math.min(100, this.hp + 2);
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.score += Math.round(Math.round(GRADE_PTS[g] * (1 + this.tier) * (this.od ? 2 : 1) * (o.type === 'chord' && !this.assisted.has(o) ? 2 : 1)) * this.mult * (this.source && t < this.source.t1 ? 2 : 1));
    // a chain (Guitar Hero's riffs, fighting games' strings): four things beaten in a row, within four bars, with three
    // different moves among them, is a combination: a bonus, a quarter of the overdrive, and its flourish
    if (KINDS[o.type].action !== 'lane' && KINDS[o.type].action !== 'alt') {
      this.chain.push({ a: o.type === 'chord' ? 'chord' : KINDS[o.type].action, t });
      if (this.chain.length > 4) this.chain.shift();
      const c = this.chain;
      if (c.length === 4 && c[3].t - c[0].t < 16 * this.L.M.beat && new Set(c.map(q => q.a)).size >= 3) {
        this.chains++;
        this.score += Math.round(500 * (1 + this.tier) * (this.perk('chainer') ? 3 : 1) * this.mult);
        this.sync = Math.min(1, this.sync + 0.25 * (this.perk('overcharge') ? 1.5 : 1));
        this.fx.push({ k: 'chain', t, x: this.heroX(t), y: this.y + 1.4, n: this.chains, moves: c.map(q => q.a) });
        this.chain = [];
      }
    }
    // a star phrase played to its end without a miss: half the overdrive charged, and a flourish
    if (o.star !== undefined) {
      const st = (this.stars[o.star] ??= { n: 0, broke: false });
      if (++st.n === this.L.stars[o.star] && !st.broke) {
        this.sync = Math.min(1, this.sync + 0.5 * (this.perk('overcharge') ? 1.5 : 1));
        this.fx.push({ k: 'starphrase', t, x: this.heroX(t), y: this.y + 1.2 });
      }
    }
    // high in the flow he breaks what he passes: the thing jumped over or slid under goes to pieces (the top tier with
    // a shockwave through the world)
    if (this.tier >= 2 && (o.type === 'jump' || o.type === 'slide' || o.type === 'chord')) {
      o.shatter = t;
      this.fx.push({ k: 'shatter', t, x: o.thingX ?? o.x, y: o.y + (o.type === 'slide' || o.keys?.[0] === 'slide' ? 1.3 : 0.4), up: o.type === 'jump' || o.keys?.[0] === 'jump', tier: this.tier });
    }
    // (off the beat by more than a perfect: which way, so the player can learn it)
    const side = e === null || g === 'perfect' ? '' : e < 0 ? 'early' : 'late';
    this.fx.push({ k: 'grade', g, side, t, x: this.heroX(t), y: this.y + 2.2, o });
    if (o.type === 'lane' || o.type === 'gate' || o.type === 'ring') this.cue(o);
    if (o.type === 'gate') this.fx.push({ k: 'through', t, x: this.laneX, y: this.y + 1 });
    if (o.type === 'smash') this.fx.push({ k: 'smash', t, x: o.x, y: o.y, skin: o.skin });
    if (o.type === 'stomp') this.fx.push({ k: 'shatter', t, x: o.x, y: o.y + 0.1, up: false, tier: 3 });
    // (a step's touch pressed a moment late: he was landing hard, and rolls out of it after all)
    if (o.type === 'roll' && this.roll?.o === o) this.roll.hard = false;
    // (a prop: the thing in his hands, picked up; thrown, gone from them; batted, a blow landing)
    if (o.type === 'pick') this.carry = { o, t0: t };
    if (o.type === 'throw') this.carry = null;
    if (o.type === 'bat' || o.type === 'throw') this.fx.push({ k: 'prop', t, x: o.x, y: o.y + 1.1, o });
    if (o.type === 'hatch') this.fx.push({ k: 'shatter', t, x: o.x, y: o.y + 0.1, up: true, tier: 3, lid: true });
    if (o.type === 'foe' || o.type === 'chord' || o.type === 'foeback') this.fx.push({ k: 'ko', t, x: o.x, y: o.y, o, swept: o.keys?.[0] === 'slide', back: o.type === 'foeback' });
    if (o.type === 'ring') this.fx.push({ k: 'through', t, x: this.heroX(t), y: this.y + 0.3 });
  }
  // a fork decided: the other route's things are gone
  route(id, hard, t) {
    this.routes[id] = hard ? 'hard' : 'easy';
    for (const q of this.L.obs) if ((hard ? q.easy : q.hard) === id && !q.res) q.res = 'skip';
    this.fx.push({ k: 'route', hard, t, x: this.heroX(t), y: this.y + 2.4 });
  }
  hit(o, t) {
    this.bail(t);
    // (a fork's gate left standing is no miss: he goes round it, the easy way)
    if (o.fork !== undefined) {
      o.res = 'ok';
      return this.route(o.fork, false, t);
    }
    // (a thing on the roof not picked up: nothing is coming at him, so it costs no life, only the streak; its throw is
    // still asked, and with nothing in his hands to throw, the threat it was for fires on him then)
    // (a leap not taken: he drops off the edge all the same, onto the island below; nothing hurts him yet (the roll may
    // save him), so only the streak)
    if (o.type === 'pick' || o.type === 'leap') {
      this.chain = [];
      if (o.star !== undefined) (this.stars[o.star] ??= { n: 0, broke: false }).broke = true;
      o.res = 'hit';
      o.hitT = t;
      this.counts.miss++;
      this.combo = 0;
      this.fx.push({ k: 'uncue', o }, { k: 'whiff', t, o });
      return;
    }
    // (the cursor's undo, once in its act: a miss takes him back two bars to play them again, the song with him)
    // (back to two bars ago, or to the start of the roof he is on if that is nearer: never back into a shaft)
    const s = this.L.segAt(t),
      b = this.L.A.beat,
      to = Math.max(t - 8 * b, s.t0 + (s.turn ? 1.5 : 1) * b);
    if (this.L.toolAt?.(t) === 'undo' && this.mode === 'run' && !this.undone.has(s) && t - to > 2 * b && !this.L.vertical(s)) {
      this.undone.add(s);
      o.res = 'hit';
      o.hitT = t;
      this.combo = 0;
      this.counts.miss++;
      this.fx.push({ k: 'undo', t, to, x: this.heroX(t), y: this.y + 1.5 });
      this.undoTo = to;
      return;
    }
    this.chain = [];
    if (o.star !== undefined) (this.stars[o.star] ??= { n: 0, broke: false }).broke = true;
    o.res = 'hit';
    o.hitT = t;
    this.counts.miss++;
    this.combo = 0;
    this.hitT = t;
    // (one life: the first miss is the last; a shield takes the first two; a glass cannon takes them twice)
    if (this.shieldLeft > 0 && !this.L.mods?.includes('onelife')) {
      this.shieldLeft--;
      this.fx.push({ k: 'shield', t, x: this.heroX(t), y: this.y + 1.2 });
    } else this.hp -= this.L.mods?.includes('onelife') ? 1e3 : this.L.difficulty.hit * (this.perk('glass') ? 2 : 1);
    // (a second wind, once in a set: back with 30)
    if (this.hp <= 0 && this.perk('secondwind') && this.L.set && !this.L.set.wind) {
      this.L.set.wind = true;
      this.hp = 30;
      this.fx.push({ k: 'secret', t, kind: 'wind', x: this.heroX(t), y: this.y + 2 });
    }
    this.fx.push({ k: 'uncue', o });
    // (a threat not taken out by a throw (layers/props.js): it fires on him; what he carried, if anything, dropped)
    if (o.type === 'throw' && this.carry) {
      this.carry = null;
      o.dropT = t;
    }
    // (an island's touch missed, landed on stiff: the glass of its landing spot gives way under him, a roll would have
    // spread his weight over it)
    if (o.type === 'roll' && this.roll?.o === o) {
      this.roll.broke = t;
      this.fx.push({ k: 'shatter', t, x: o.x + 0.2, y: o.y + 0.05, up: false, tier: 3 });
    }
    // tripped by a low thing pitches him forward; a bar in the chest knocks him back
    // (an island landed on hard pitches him forward too)
    this.stumble = { t0: t, dir: o.type === 'slide' || o.type === 'smash' || o.type === 'roll' ? 1 : -1 };
    if (o.type === 'smash') this.fx.push({ k: 'smash', t, x: o.x, y: o.y, skin: o.skin });
    AFTER_HIT[o.type]?.(this, o);
    this.fx.push({ k: 'hit', t, x: this.heroX(t), y: this.y + 1.1, o });
    if (this.hp <= 0) this.die(t, o);
  }
  // the undo carried out (main.js, with the song): back to song time `to`, what lay ahead of it there again
  rewind(to) {
    const s = this.L.segAt(to);
    for (const o of this.L.obs) {
      if (o.t < to - 0.05 || o.res === 'skip') continue;
      for (const k of ['res', 'grade', 'hitT', 'shatter', 'tick', 'fell', 'dropT', 'up', 'goT', 'dud']) delete o[k];
      if (o.type === 'dash') o.broke = [];
    }
    this.presses = this.presses.filter(p => p.t < to);
    this.altLog = this.altLog.filter(q => q.t < to);
    // (a thing picked up before it and thrown after it: still in his hands)
    const held = this.L.obs.find(q => q.type === 'pick' && q.res === 'ok' && q.t < to && this.L.obs.some(w => w.type === 'throw' && w.pid === q.pid && !w.res));
    Object.assign(this, { pickup: null, carry: held ? { o: held, t0: to } : null });
    Object.assign(this, { t: to, y: this.gy(s, this.L.xAt(to)), vy: 0, jump: null, strike: null, swing: null, slide: null, getup: null, landing: null, buffered: null, hold2: null, respawn: null, stumble: null, roll: null, short: null, dance: null, chain: [], string: null, brk: null, flyOn: false, strays: [], trippedT: -9 });
    this.anim.reset();
    this.trail = [];
  }
  // how far down a trampoline he is on has given under him (m): up a ladder, from his bound onto it (a moment before
  // his beat) to its throw (or the dud's), a fifth of a metre by his beat
  padSink(t) {
    if (this.mode !== 'run' || this.jump || this.short) return 0;
    const o = this.L.obs.find(q => q.type === 'leap' && q.asc && t >= q.t - 0.14 && t < (q.goT ?? q.edgeT) && q.seg === this.L.segAt(t));
    return o ? 0.2 * Math.min(1, ((t - (o.t - 0.14)) / 0.14) ** 0.7) : 0;
  }
  // the animator's pose (relative to his root) placed in the world
  place(P, t) {
    const x = this.heroX(t),
      root = (this.mode === 'shaft' ? this.y + 0.25 : this.y) - this.padSink(t),
      out = new Float32Array(P.length),
      // (small in a part played mini, level.js: the whole of him scaled about his feet)
      sc = 1 - 0.35 * (this.L.miniAt?.(t) ?? 0);
    for (let k = 0; k < P.length; k += 2) {
      out[k] = x + (P[k] - P[0]) * sc;
      out[k + 1] = root + P[k + 1] * sc;
    }
    // (the board and the cape the animator keeps beside the pose, and the last few poses: the smears and the afterimages)
    const b = this.anim.board,
      at = (px, py) => [x + (px - P[0]) * sc, root + py * sc];
    this.board = b ? { ...b, x: at(b.x, 0)[0], y: root + b.y * sc } : null;
    // (a spin or a flip of his on the board (anim.js BOARD_FREE): all of him and the board turned about his hips;
    // seen side on, a spin round is him narrowing to his edge and back)
    const sp = this.anim.spin;
    if (sp && (sp.yaw || sp.pitch)) {
      const hx = out[0],
        hy = out[1],
        cy = Math.cos(sp.yaw),
        c = Math.cos(sp.pitch),
        sn = Math.sin(sp.pitch),
        turn = (px, py) => {
          const dx = (px - hx) * cy,
            dy = py - hy;
          return [hx + dx * c - dy * sn, hy + dx * sn + dy * c];
        };
      for (let k = 0; k < out.length; k += 2) [out[k], out[k + 1]] = turn(out[k], out[k + 1]);
      if (this.board) {
        [this.board.x, this.board.y] = turn(this.board.x, this.board.y);
        this.board.a += sp.pitch;
        this.board.yaw = (this.board.yaw ?? 0) + sp.yaw;
      }
    }
    this.cape = this.anim.cape?.map(p => at(p.x, p.y)) ?? null;
    (this.trail ??= []).unshift(out);
    if (this.trail.length > 24) this.trail.pop();
    return out;
  }
  // ---- death: the engine's ragdoll takes the body from the pose he was in
  die(t, o) {
    this.bail(t);
    this.mode = 'dead';
    this.deadT = t;
    // (what killed him: the renderer flattens him by it)
    this.killer = o?.type ?? null;
    const PL = window.planck,
      world = new PL.World({ gravity: PL.Vec2(0, -9.81) }),
      s = this.L.segAt(t),
      falling = this.L.vertical(s),
      gy = falling ? this.y - 30 : this.gy(s, this.L.xAt(t));
    world.createBody().createFixture(new PL.Box(400, 1, PL.Vec2(this.heroX(t), gy - 1), 0), { friction: 0.9 });
    if (o.type === 'jump') world.createBody({ position: PL.Vec2(o.x, o.y + o.h / 2) }).createFixture(new PL.Box(0.3, o.h / 2), { friction: 0.8 });
    this.world = world;
    this.rag = makeRagdoll(world, this.J, { vx: falling ? 0 : this.L.vAt(t) * 0.8, vy: falling ? -FALL_V : Math.max(2, this.vy), spin: -2 });
    this.fx.push({ k: 'dead', t, x: this.heroX(t), y: this.y + 1 });
    // (out of lives in a climb: the cursor does not catch him this time; he comes apart in the air, his pieces drifting
    // up and away like a deleted file's)
    if (this.climbPose) {
      this.shattered = t;
      this.fx.push({ k: 'pieces', t, x: this.heroX(t), y: this.y + 1 });
    }
  }
  stepDead(t, dt) {
    const sub = 2;
    for (let i = 0; i < sub; i++) {
      fallStep(this.rag, { t, dead: true });
      this.world.step(dt / sub, 10, 5);
    }
    this.J = ragJoints(this.rag);
    if (t - this.deadT > 1.8) this.over = { win: false, t };
  }
  get acc() {
    const c = this.counts,
      n = c.perfect + c.great + c.good + c.miss;
    return n ? (c.perfect + c.great * 0.75 + c.good * 0.5) / n : 0;
  }
}
