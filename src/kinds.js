// The kinds of obstacle, one entry each. Every obstacle's time `o.t` is the moment its action is pressed, on the
// half-beat grid (on the music), and one press beats it; `M` is the song's motion (motion.js).
//   action    the input that beats it
//   passAt    how long after the press he goes past it (where it stands)
//   post      how long after the press he is busy with it (nothing else may be pressed before that, plus a rest)
//   top       how tall it stands (what the cursor holds it by)
//   cursor    what the cursor does to put it there
//   cue       the sound of beating it, scheduled on the grid point the move ends on: [name, seconds after the press]
// A new kind is a new entry here, a JUDGE entry in run.js, a look in render/things/<place>.js and a line in level.js.
import { MATERIAL, PAINTED } from './places.js';

export const KINDS = {
  // (a quick one, in a quick line of the music, has its own shorter `air`, motion.js)
  jump: {
    action: 'jump',
    passAt: (M, o) => (o?.air ?? M.air) / 2,
    post: (M, o) => o?.air ?? M.air,
    top: o => o.h,
    cursor: () => 'carry',
    cue: (M, o) => ['land', o?.air ?? M.air],
  },
  // (and a quick duck its own shorter `slide`)
  slide: {
    action: 'slide',
    passAt: (M, o) => (o?.slide ?? M.slide) / 2,
    post: (M, o) => (o?.slide ?? M.slide) + 0.1,
    top: () => 1.5,
    cursor: () => 'carry',
    cue: (M, o) => ['swish', o?.slide ?? M.slide],
  },
  // a long ceiling over a held note: slid under on the press and held down for as long as the note sounds (a hold note:
  // the press is graded, every beat held under it scores, letting go early stands him up into it)
  long: {
    action: 'slide',
    passAt: (M, o) => o.dur / 2,
    post: (M, o) => o.dur + 0.35,
    top: () => 1.6,
    cursor: () => 'paint',
    cue: (M, o) => ['swish', o.dur],
  },
  // a gap: one jump carries him over it (a long one, landing on the grid)
  hold: {
    action: 'jump',
    passAt: () => 0,
    post: (M, o) => o.dur,
    top: () => 0,
    cursor: () => 'select',
    cue: (M, o) => ['land', o.dur],
  },
  // a pane, planks or a painted brick wall, too tall to jump: kicked through, the foot meeting it on the grid
  smash: {
    action: 'right',
    passAt: M => M.kickAt,
    post: M => M.kickDur * 0.85,
    top: o => o.h,
    cursor: o => (PAINTED.has(MATERIAL[o.skin]) ? 'paint' : 'carry'),
    cue: (M, o) => [MATERIAL[o.skin] === 'glass' ? 'glass' : 'crack', M.kickAt],
  },
  // a clone of him the cursor copy-pastes ahead, running at him: kicked out on the beat (a flying kick, as a pane), or
  // it knocks him back
  foe: {
    action: 'right',
    passAt: M => M.kickAt,
    post: M => M.kickDur * 0.85,
    top: () => 1.8,
    cursor: () => 'clone',
    cue: M => ['punch', M.kickAt],
  },
  // the holds (one press, held as long as the music holds a note; graded on the press, every beat held scores, the end
  // lenient by a quarter beat):
  // a wide gap with a stream of air over it: jumped into and glided over, jump held
  glide: {
    action: 'jump',
    passAt: () => 0,
    post: (M, o) => o.dur + 0.45,
    top: () => 0,
    cursor: () => 'select',
    cue: (M, o) => ['land', o.dur + 0.3],
  },
  // a corridor of panes, one on each beat: dashed through, right held, each pane breaking as he reaches it
  dash: {
    action: 'right',
    passAt: () => 0,
    post: (M, o) => o.dur + 0.3,
    top: o => o.h,
    cursor: () => 'carry',
    cue: (M, o) => ['glass', 0],
  },
  // a wide gap with a line over it: reached up for (↑, a swipe up) and ridden along it, held
  zip: {
    action: 'jump',
    passAt: () => 0,
    post: (M, o) => o.dur + 0.3,
    top: () => 2.5,
    cursor: () => 'carry',
    cue: (M, o) => ['land', o.dur + 0.3],
  },
  // a wide gap with a rail across it: landed on and ground along, down held, sparks flying
  grind: {
    action: 'slide',
    passAt: () => 0,
    post: (M, o) => o.dur + 0.3,
    top: () => 0.3,
    cursor: () => 'carry',
    cue: (M, o) => ['land', o.dur + 0.3],
  },
  // in a shaft, a stretch to dive through (down held) or float through (up held)
  zone: {
    action: 'zone',
    passAt: () => 0,
    post: (M, o) => o.dur,
    top: () => 0,
    cursor: () => 'paste',
    cue: () => ['tick', 0],
  },
  // in a shaft, a wall across it with one way through, a ring in the lane he must be in
  gate: {
    action: 'lane',
    passAt: () => 0,
    post: () => 0.1,
    top: () => 0.45,
    cursor: () => 'paste',
    cue: () => ['through', 0],
  },
  // a wide gap with a crane's bar over it: reached up for and grabbed on the press (↑, a swipe up), swung on, let go of,
  // landed on the grid
  grab: {
    action: 'jump',
    passAt: () => 0,
    post: (M, o) => o.dur + 0.15,
    top: () => 2.3,
    cursor: () => 'carry',
    cue: (M, o) => ['land', o.dur],
  },
  // a chord: two keys at once (Guitar Hero's), two things the player already reads in one: a low thing (or a hanging
  // one) with a clone running at him behind it, so up + kick (over it into a flying strike) or down + kick (under it,
  // sweeping the clone)
  chord: {
    action: 'chord',
    passAt: M => M.kickAt,
    post: (M, o) => (o.keys[0] === 'jump' ? M.air : M.slide + 0.1) + 0.1,
    top: () => 1.8,
    cursor: () => 'clone',
    cue: M => ['punch', M.kickAt],
  },
  // a clone coming up behind him (a brawl): turned on with a back kick (←) as it reaches him
  foeback: {
    action: 'left',
    passAt: M => M.kickAt,
    post: M => M.kickDur * 0.85,
    top: () => 1.8,
    cursor: () => 'clone',
    cue: M => ['punch', M.kickAt],
  },
  // a ring in a flight, at one of three heights (the melody's): be at its height as he gets there (↑ / ↓)
  ring: {
    action: 'alt',
    passAt: () => 0,
    post: () => 0.1,
    top: () => 0,
    cursor: () => 'paste',
    cue: () => ['through', 0],
  },
  // a cracked plate on the roof, in a drop on a heavy kick: over the thing before it, and down onto it out of the air on
  // its beat (↓ in the air: a dive, Thumper's stomp) to break it; landed on any other way it holds and hurts
  stomp: {
    action: 'slide',
    passAt: () => 0.15,
    post: () => 0.3,
    top: () => 0.12,
    cursor: () => 'carry',
    cue: () => ['crack', 0.1],
  },
  // a leap down a ladder of islands (level.js ladder): off the island's edge on its kick, up (or up and on together,
  // the diagonal its note shows), a long flight down to the next island, lower by three to six metres, touched on the
  // kick two beats on (its roll, below); unpressed he runs off the edge and drops onto it, flailing (the streak lost,
  // not a life: the roll may still save him). The cursor cuts the road away for the first; each island after it is
  // pasted in. Up a ladder (its mirror): off a trampoline on the island's edge on its kick, a long, high throw two beats
  // up onto the next, two to three and a half metres higher; unpressed the trampoline gives him a dud's little throw and
  // he falls into the gap, the cursor putting him on the island above (a life: the touch missed)
  leap: {
    action: 'chord',
    passAt: () => 0,
    post: (M, o) => o.air,
    top: () => 0,
    cursor: () => 'select',
    cue: () => ['swish', 0],
  },
  // a touch down on an island of a ladder (level.js ladder): his feet touching it on its kick out of the leap's flight;
  // down pressed on that beat (↓) rolls him out of it at a run, missed he lands hard and staggers
  // (judged at the touchdown, the press its moment; the island it is on pasted in by the cursor)
  roll: {
    action: 'slide',
    passAt: () => 0,
    post: () => 0.35,
    top: () => 0,
    cursor: () => 'select',
    cue: () => ['swish', 0.05],
  },
  // a thing thrown at him (level.js props): a clone on a rooftop ahead throws it on a call, it flies at him over a bar
  // (or half of one) and comes down on his press's beat; → on that beat swings a glowing bat (his upper body over the
  // run) that meets it on the next grid point and sends it home to knock the thrower down; missed, it hits him
  bat: {
    action: 'right',
    passAt: M => M.kickAt,
    post: M => M.kickDur * 0.85,
    top: () => 1.8,
    cursor: () => 'clone',
    cue: M => ['crack', M.kickAt],
  },
  // a thing lying on the roof in his way (level.js props): ↓ on a snare scoops it up without breaking his run (his upper body
  // reaching down over his running legs), and he carries it on to its throw; missed, he runs past it empty-handed and
  // the throw is not asked
  pick: {
    action: 'slide',
    passAt: () => 0.1,
    post: () => 0.45,
    top: () => 0.4,
    cursor: () => 'carry',
    cue: () => ['tick', 0.1],
  },
  // what he carries thrown (its pick's pair, o.pid): → on an accent hurls it at a threat ahead (a drone, a clone with a
  // rifle on its rooftop, a force field's emitter) that has had him in its sights for two beats; it is hit half a beat
  // after the release and taken out; not thrown (missed, or nothing picked up to throw), it fires on him: a hit
  throw: {
    action: 'right',
    passAt: M => M.kickAt,
    post: M => M.kickDur * 0.85,
    top: () => 2.2,
    cursor: () => 'carry',
    cue: M => ['swish', M.kickAt],
  },
  // a lid over the top of a shaft he flies up to land on a drop: burst up through on the drop's beat (↑), or he hits it
  hatch: {
    action: 'jump',
    passAt: () => 0.15,
    post: () => 0.3,
    top: () => 0.3,
    cursor: () => 'carry',
    cue: () => ['crack', 0],
  },
  // a push off a wall in a climb (a tic-tac up a shaft's two walls): up and towards the other wall at once, a diagonal
  // swipe (two keys: jump and the way across); judged on the press, missed or not he is across on the next push's beat
  tic: {
    action: 'chord',
    passAt: () => 0,
    post: () => 0.1,
    top: () => 0,
    cursor: () => 'paste',
    cue: () => ['land', 0],
  },
  // a hazard in his lane while he falls
  lane: {
    action: 'lane',
    passAt: () => 0,
    post: () => 0.1,
    top: () => 0.45,
    cursor: () => 'paste',
    cue: () => ['tick', 0],
  },
};
// a climb's dropped beam (the cursor drops them one after another, from either side, for him to tic-tac up): a tall
// thing in free fall (gravity a little gentler than the world's, so it reads), let go a second before its beat out of
// the sky above, its side's mark (where his feet meet it, o.y) passing its height on its beat, leaning a little; kicked
// (o.kickT, run.js), it is flung away from him, spinning, and falls on out of sight
// (AT: his feet's mark is that far under the beam's middle, so his body is at its middle; GAP: his hips that far off its
// face, his crouch's hands and feet reaching to it, not through it)
// (HOLD: the cursor brings it up over its place that long before letting it go, so it is seen coming before the press
// that leaps at it)
export const BEAM = { G: 8, T: 1.3, HOLD: 0, LEN: 3.2, W: 0.42, AT: 1.0, GAP: 0.55 };
// each beam its own: its size, its lean when let go, its tumble as it falls (from its beat: the same song, the same)
const rnd = (o, k) => {
  const x = Math.sin(o.t * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export function beamLook(o) {
  // (it tumbles through upright: let go leaning one way, passing near upright about his beat, leaning the other after)
  const lean = (rnd(o, 3) < 0.5 ? -1 : 1) * (0.2 + 0.3 * rnd(o, 4));
  return { len: 2.6 + 1.3 * rnd(o, 1), w: 0.34 + 0.3 * rnd(o, 2), lean, spin: (-lean / BEAM.T) * (0.8 + 0.5 * rnd(o, 7)), kind: Math.floor(rnd(o, 6) * 3) };
}
// a beam as a rigid body: its mass from its size (a hollow girder or a log, 100 to 300 kg), a rod's moment of inertia
export const HERO_M = 70;
const MU = 0.9;
export const beamMass = lk => 45 * lk.len * (lk.w / 0.4);
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const rotv = (v, r) => [v[0] * Math.cos(r) - v[1] * Math.sin(r), v[0] * Math.sin(r) + v[1] * Math.cos(r)];
// free fall of a body's state on to t (its middle ballistic, turning at its rate)
function drift(b, t) {
  const e = t - b.t;
  return { t, c: [b.c[0] + b.v[0] * e, b.c[1] + b.v[1] * e - 0.5 * BEAM.G * e * e], v: [b.v[0], b.v[1] - BEAM.G * e], rot: b.rot + b.w * e, w: b.w, M: b.M, I: b.I };
}
// where his feet are on it: the point of its face, AT under its middle, and its face's normal out to him
function contactOf(b, side, lk) {
  return { p: [b.c[0] + rotv([-side * lk.w / 2, -BEAM.AT], b.rot)[0], b.c[1] + rotv([-side * lk.w / 2, -BEAM.AT], b.rot)[1]], n: rotv([-side, 0], b.rot) };
}
// a contact impulse between him (a point of HERO_M) and the beam at its face: the relative velocity `want` of him to
// the beam's point is to become `goal` (a landing: the normal part stopped dead (his legs soak it), the sliding part only
// as far as friction holds, |jt| <= MU jn; a kick: his legs drive him off it at `goal`, the same friction limit), the
// beam taking the equal and opposite impulse at that point: its middle shoved, and it spun by the lever about its middle
function impulse(b, side, lk, vh, goal) {
  const { p, n } = contactOf(b, side, lk),
    r = [p[0] - b.c[0], p[1] - b.c[1]],
    tg = [-n[1], n[0]],
    vp = [b.v[0] - b.w * r[1], b.v[1] + b.w * r[0]],
    vr = [vh[0] - vp[0], vh[1] - vp[1]],
    dv = goal ? [goal[0] - vr[0], goal[1] - vr[1]] : [-vr[0], -vr[1]],
    k = d => 1 / HERO_M + 1 / b.M + cross(r, d) ** 2 / b.I,
    jn = Math.max(0, (dv[0] * n[0] + dv[1] * n[1]) / k(n)),
    jt = Math.max(-MU * jn, Math.min(MU * jn, (dv[0] * tg[0] + dv[1] * tg[1]) / k(tg))),
    J = [-(jn * n[0] + jt * tg[0]), -(jn * n[1] + jt * tg[1])];
  return { ...b, v: [b.v[0] + J[0] / b.M, b.v[1] + J[1] / b.M], w: b.w + cross(r, J) / b.I };
}
// the beam's body at t: pasted at rest a T before its beat, falling free and tumbling, its mark passing his height on its
// beat; met by him (o.meetT, o.meetV: his velocity as he lands on it, run.js) it is shoved and turned by his weight;
// kicked off (o.kickT, o.kickV: his velocity as he leaves) it takes his legs' push, flung off spinning
export function beamBody(o, t) {
  const side = o.side || 1,
    lk = beamLook(o),
    M = beamMass(lk),
    tr = o.t - BEAM.T,
    d = [side * (lk.w / 2 + BEAM.GAP), BEAM.AT],
    rT = lk.lean + lk.spin * BEAM.T,
    off = rotv(d, rT);
  let b = { t: tr, c: [o.x + off[0], o.y + off[1] + 0.5 * BEAM.G * BEAM.T * BEAM.T], v: [0, 0], rot: lk.lean, w: lk.spin, M, I: (M * (lk.len * lk.len + lk.w * lk.w)) / 12 };
  if (t <= tr) return { b, lk, side, d };
  if (o.meetT !== undefined && t > o.meetT && o.meetV) b = impulse(drift(b, o.meetT), side, lk, o.meetV, null);
  if (o.kickT !== undefined && t > o.kickT && o.kickV) {
    // (on it till then he moved with its face: his velocity was its point's)
    const k = drift(b, o.kickT),
      { p } = contactOf(k, side, lk),
      vp = [k.v[0] - k.w * (p[1] - k.c[1]), k.v[1] + k.w * (p[0] - k.c[0])];
    b = impulse(k, side, lk, vp, [o.kickV[0] - vp[0], o.kickV[1] - vp[1]]);
  }
  return { b: drift(b, t), lk, side, d };
}
// where his feet's mark is on a beam at t (moving with it)
export function beamMark(o, t) {
  const { b, d } = beamBody(o, t),
    r = rotv(d, b.rot);
  return { x: b.c[0] - r[0], y: b.c[1] - r[1] };
}
export function beamAt(o, t) {
  const { b, lk, side } = beamBody(o, t);
  return { x: b.c[0], y: b.c[1], rot: b.rot, kicked: o.kickT !== undefined && t > o.kickT, held: t < o.t - BEAM.T, side, look: lk, v: Math.hypot(b.v[0], b.v[1]) };
}
export const beamFoot = (o, t) => beamMark(o, t).y;
// whether an input action is the one an obstacle wants
export const wants = (o, a) => {
  const k = KINDS[o.type].action;
  return k === 'lane' ? a === 'left' || a === 'right' : k === 'alt' ? a === 'jump' || a === 'slide' : k === 'zone' ? a === o.key : k === 'chord' ? o.keys.includes(a) : k === a;
};
