// The hero's animation: which captured clip, at which frame, for the run's state at t, as a pose relative to his root
// (x, floor + jump height). Read-only on the run.
//
//   - the run and the sprint are blended by speed and phased by the distance run, not by time (both strides are
//     3.16 m a cycle), so a planted foot stays where it landed whatever the speed: no foot sliding
//   - a jump is running_jump's own flight (frames 4-37, 0.55 s) with its rise taken out (the parabola is the run's);
//     a long jump is front_flip's flip (frames 30-84) stretched over the gap; a slide is running_slide going down,
//     held, and getting up; the landing on a drop is fall_a_land_to_run_forward; a kick through a pane is
//     flying_kick (frames 4-48, the foot meets the pane 41 % in, timed to the grid); a swing over a gap is run_and_swing (frames 30-130:
//     the grab, the hang, the swing, letting go)
//   - a change of clip is inertialized (Bollo, "Inertialization", GDC 2018): the jump between the last pose shown and
//     the new clip's pose is kept as an offset that decays to nothing over 0.2 s, so nothing snaps and, unlike a
//     crossfade or a filter, the new clip is never late
import { JI, NB, NJ, PARENT } from './lib/skeleton.js';
import { TURN } from './level.js';
import { RIG, TAU, bounce, clamp, decayAt, fromRig, hold, ik2, mixPose, spring, toRig, wrap } from './body.js';
import { makeFX } from './fx.js';

const STRIDE = 3.16,
  BLEND = 0.25;

// ---- the moves, several takes of each (captured clips, the frames of the move itself): an obstacle keeps its take
// (o.v, the level's seeded pick, so a chorus plays the same each time), another obstacle of its kind may get another
//   jumps      [clip, take-off frame, landing frame]: the clip's own rise taken out, the run's arc put in
//   flips      the same, over a tall thing or a gap
//   slides     down / held / up frame ranges (they can be held, for a long ceiling)
//   rolls      a dive or a roll under it (a plain slide only: it cannot be held)
//   kicks      [clip, from, to, where the foot meets the pane (0..1 of the way)]
export const MOVES = {
  // (no vaults or dives: a vault's hands reach for a box that is not under them on the run's arc, and a dive lands on
  // its head)
  jumps: [
    ['running_jump', 4, 37],
    ['unarmed_jump_running', 25, 58],
    ['jump_forward', 8, 30],
    ['jumping', 34, 63],
    ['running_jump_to_run', 34, 60],
    ['mutant_jumping', 78, 114],
  ],
  flips: [
    ['front_flip', 30, 84],
    ['running_forward_flip', 20, 52],
    ['front_twist_flip', 32, 80],
  ],
  slides: [
    ['running_slide', [6, 21], [21, 45], [45, 78]],
    // (feet first: a slide tackle's slide; never head first, into whatever is ahead)
    ['soccer_tackle', [6, 30], [30, 54], [54, 100]],
  ],
  rolls: [
    ['sprinting_forward_roll', 6, 62],
    ['running_dive_roll', 28, 88],
    ['dive_roll', 40, 120],
  ],
  // [clip, from, to]: from running one way to running the other
  turns: [
    ['running_turn_180', 0, 38],
    ['pivot', 20, 72],
  ],
  // (forward strikes only: nothing that leaves the ground backwards or flips reads as a kick)
  kicks: [
    ['flying_kick', 4, 48, 0.48],
    ['strike_foward_jog', 12, 56, 0.48],
    ['side_kick', 26, 64, 0.4],
    ['standing_melee_attack_kick_ver_2', 20, 70, 0.38],
  ],
};
// the flow's tricks (run.js: the tier the streak has reached, Guitar Hero's multiplier; overdrive is the top one): the
// same press, a bigger move as the streak grows, from a vault to a cartwheel, a butterfly twist, a corkscrew
//   jump[tier]   flights [clip, take-off, landing] (null: the move's own takes, MOVES)
//   kick[tier]   [clip, from, to, contact]
//   slide[tier]  rolls [clip, from, to] (a plain slide; a long one keeps its holding slide)
// (every take ends on his feet or crouched: one ending lying down would snap up into the run; a trick that touches down
// bent double or still turning (a backflip, a cartwheel) ends where it has stood up, so he lands upright; every slide and roll
// keeps his head under 0.9 m through its middle, where he passes under the thing: tools/takes.mjs checks both)
export const TRICKS = {
  jump: [
    null,
    [...MOVES.flips, ['run_to_flip', 24, 80], ['backflip', 40, 106], ['corkscrew_evade', 40, 72]],
    [['cartwheel', 66, 128], ['butterfly_twirl', 72, 128], ['aerial_evade', 90, 165], ['torch_running_jump', 42, 70]],
    [['swing_backflip_superhero', 22, 78], ['back_flip_to_uppercut', 92, 155], ['aerial_evade', 90, 165], ['butterfly_twirl', 72, 128], ['macaco_side', 75, 156], ['backflip_moving_back', 77, 160]],
  ],
  kick: [
    null,
    [['roundhouse_kick', 44, 86, 0.5], ['inside_crescent_kick', 60, 104, 0.43], ['side_kick', 26, 64, 0.4], ['standing_melee_attack_kick_ver_1', 25, 75, 0.4]],
    [['martelo_2', 8, 60, 0.38], ['meia_lua_de_frente', 30, 90, 0.4], ['roundhouse_kick', 44, 86, 0.5], ['hurricane_kick', 6, 60, 0.39]],
    [['armada', 52, 98, 0.54], ['meia_lua_de_frente', 30, 90, 0.4], ['meia_lua_de_compasso', 45, 95, 0.54], ['chapa_giratoria_2', 80, 130, 0.56], ['martelo_3', 30, 80, 0.46]],
  ],
  slide: [null, null, [['quick_roll_to_run', 6, 80], ['falling_to_roll', 14, 80]], [['standing_dive_forward', 14, 90], ['quick_roll_to_run', 6, 80], ['run_to_rolling', 30, 140]]],
  // the chords (two keys at once): over the thing and into the clone (up + kick), under it feet first into the clone's
  // legs (down + kick: a slide tackle, its foot reaching a metre ahead of him as it meets them)
  airkick: [['flying_kick', 4, 48], ['flip_kick', 33, 86]],
  sweep: [['soccer_tackle', 6, 100]],
};
// the freestyle's moves (run.js link): a string of presses on the beat between things, each way its own family, played
// in a shuffled turn so a string never shows the same move twice
//   air    up: flights [clip, take-off, landing] on the run's arc (every one of them, from a front flip to an aerial)
//   kick   on: [clip, from, to, contact] the capoeira and the spinning kicks
//   brk    down: breaking on the roof as he slides along it, [clip, from, to] or a run of them played as one (into a
//          headstand and out of it); the whole body, crossfaded in from the run and out to it
export const FREE = {
  air: [
    ['front_flip', 30, 84], ['running_forward_flip', 20, 52], ['front_twist_flip', 32, 80], ['run_to_flip', 24, 80],
    ['backflip', 40, 106], ['corkscrew_evade', 40, 72], ['cartwheel', 66, 128], ['butterfly_twirl', 72, 128],
    ['aerial_evade', 90, 165], ['swing_backflip_superhero', 22, 78], ['back_flip_to_uppercut', 92, 155],
    ['macaco_side', 75, 156], ['backflip_moving_back', 77, 160], ['torch_running_jump', 42, 70],
  ],
  kick: [
    ['armada', 52, 98, 0.54], ['meia_lua_de_compasso', 45, 95, 0.54], ['martelo_2', 8, 60, 0.38],
    ['hurricane_kick', 6, 60, 0.39], ['meia_lua_de_frente', 30, 90, 0.4], ['chapa_giratoria_2', 80, 130, 0.56],
    ['roundhouse_kick', 44, 86, 0.5], ['martelo_3', 30, 80, 0.46], ['inside_crescent_kick', 60, 104, 0.43],
    ['armada_to_esquiva', 55, 110, 0.45], ['flying_kick', 4, 48, 0.48], ['standing_melee_attack_kick_ver_1', 25, 75, 0.4],
  ],
  brk: [
    [['flair', 0, 59], ['flair', 0, 59]],
    [['headspin_start', 95, 168], ['headspin_end', 0, 80]],
    ['breakdance_freeze_var_1', 100, 215],
    ['breakdance_swipes', 105, 178],
    ['breakdance_freeze_var_2', 100, 240],
    ['breakdance_footwork_1', 14, 145],
    ['breakdance_freeze_var_4', 60, 240],
    ['breakdance_ending_1', 90, 209],
    ['breakdance_footwork_3', 21, 189],
    ['breakdance_freeze_var_3', 80, 200],
    ['breakdance_1990', 128, 200],
    ['breakdance_ending_3', 147, 265],
    ['breakdance_uprock_to_ground', 104, 250],
    ['crossleg_freeze', 0, 93],
  ],
};
// the board's freestyle (run.js link on the hoverboard; Mixamo has no board tricks, so they are the rig's own): each a
// turn of the board and of him over the ollie's flight, in turns: roll (the board over its long axis: a kickflip),
// byaw (the board spun flat under him: a shove-it), yaw (he and the board spun round: a 360), pitch (he and the board
// head over heels: a flip); down, ridden along: manual (nose up), nose (nose down), slide (the board sideways, a
// powerslide in sparks), duckspin (ducked low and spun round)
export const BOARD_FREE = {
  air: ['kickflip', 'shove', 'varial', 'heelflip', 'back', 'tre', 'double', 'shove360', 'front', 'hardflip'],
  kick: ['spin360', 'cork', 'bodyvarial', 'spin720'],
  brk: ['manual', 'slide', 'nose', 'duckspin'],
};
const BT = {
  kickflip: { roll: TAU }, heelflip: { roll: -TAU }, double: { roll: 2 * TAU }, shove: { byaw: Math.PI }, shove360: { byaw: TAU },
  varial: { byaw: Math.PI, roll: TAU }, hardflip: { byaw: -Math.PI, roll: TAU }, tre: { byaw: TAU, roll: TAU },
  back: { pitch: TAU }, front: { pitch: -TAU }, spin360: { yaw: TAU }, spin720: { yaw: 2 * TAU }, cork: { yaw: TAU, pitch: TAU },
  bodyvarial: { yaw: TAU, byaw: -TAU },
};
// a break's parts ([clip, from, to] each) and its length in frames
export const brkParts = k => (Array.isArray(k[0]) ? k : [k]);
export const brkFrames = k => brkParts(k).reduce((n, p) => n + p[2] - p[1], 0);
// the strikes at the clones (a brawl): never the same twice running (run.js), bigger ones as the streak grows
//   [clip, from, to, contact (0..1 of the way), how]; how:
//     (none)      the whole body (a kick, a knee)
//     'arms'      his upper body from the clip over his running legs: a punch thrown on the run
//     'turn'      the whole body turned round: he turns (his run blended into the strike facing back, which side on reads
//                 as the turn) and strikes at the clone behind him, then turns back into the run
//     'turnarms'  his upper body turned round over his running legs: a look back over his shoulder and a punch behind
//   front[0] / back[0] for any streak, front[1] / back[1] added from the second tier on
export const STRIKES = {
  front: [
    [
      ['cross_punch', 48, 90, 0.48, 'arms'],
      ['side_kick', 26, 64, 0.4],
      ['jab_cross', 14, 60, 0.59, 'arms'],
      ['mma_kick', 22, 70, 0.48],
      ['right_hook', 0, 40, 0.475, 'arms'],
      ['standing_melee_kick', 18, 64, 0.52],
      ['uppercut', 10, 50, 0.475, 'arms'],
      ['illegal_knee', 28, 66, 0.6],
      ['lead_jab', 6, 44, 0.47, 'arms'],
      ['kicking', 16, 62, 0.48],
      ['hook_punch', 45, 90, 0.49, 'arms'],
      ['standing_melee_attack_kick_ver_1', 25, 75, 0.4],
      ['body_jab_cross', 8, 50, 0.4, 'arms'],
      ['standing_melee_attack_kick_ver_2', 20, 70, 0.38],
      ['standing_melee_punch', 4, 40, 0.36, 'arms'],
      ['hook', 8, 50, 0.4, 'arms'],
      ['standing_melee_attack_backhand', 40, 90, 0.46, 'arms'],
      ['mutant_punch', 4, 40, 0.36, 'arms'],
    ],
    [
      ['roundhouse_kick', 44, 86, 0.5],
      ['flying_kick', 4, 48, 0.48],
      ['meia_lua_de_frente', 30, 90, 0.4],
      ['martelo_2', 8, 60, 0.38],
      ['hurricane_kick', 6, 60, 0.39],
      ['meia_lua_de_compasso', 45, 95, 0.54],
      ['chapa_giratoria_2', 80, 130, 0.56],
      ['martelo_3', 30, 80, 0.46],
      ['armada_to_esquiva', 55, 110, 0.45],
    ],
  ],
  back: [
    [
      ['flying_kick', 4, 48, 0.5, 'turn'],
      ['cross_punch', 48, 90, 0.48, 'turnarms'],
      ['rifle_turn_and_kick', 30, 108, 0.74],
      ['mma_kick', 22, 70, 0.48, 'turn'],
      ['right_hook', 0, 40, 0.475, 'turnarms'],
      ['uppercut', 10, 50, 0.475, 'turnarms'],
      ['standing_melee_kick', 18, 64, 0.52, 'turn'],
      ['lead_jab', 6, 44, 0.47, 'turnarms'],
      ['side_kick', 26, 64, 0.4, 'turn'],
      ['jab_cross', 14, 60, 0.59, 'turnarms'],
      ['hook_punch', 45, 90, 0.49, 'turnarms'],
      ['standing_melee_attack_kick_ver_1', 25, 75, 0.4, 'turn'],
      ['standing_melee_attack_backhand', 40, 90, 0.46, 'turnarms'],
    ],
    [
      ['roundhouse_kick', 44, 86, 0.5, 'turn'],
      ['martelo_2', 8, 60, 0.38, 'turn'],
      ['inside_crescent_kick', 60, 104, 0.43, 'turn'],
      ['hurricane_kick', 6, 60, 0.39, 'turn'],
    ],
  ],
};
// the props' moves (level.js; kinds.js bat, throw), as strikes: his upper body over his run (a bat swung at what is
// thrown at him, meeting it on the contact; what he carries thrown overarm, let go on it)
export const PROP_TAKES = {
  // (from where the bat is already back over his shoulder, the arm already back: what is left to the contact plays at
  // about the capture's own speed in the grid step before it)
  bat: ['baseball_hit', 70, 118, 0.29, 'arms'],
  throw: ['run_and_throw_grenade', 92, 132, 0.33, 'arms'],
};
// his dance moves for a left pressed for nothing (upper body only, over his run, two beats long, never the same twice
// running): [clip, from, to], each the two beats of its clip where the arms move most (the captures dance at about
// 120 bpm: 60 frames)
export const DANCES = [
  ['arm_wave_hip_hop_dance', 6, 60],
  ['raise_the_roof_hip_hop', 110, 170],
  ['wave_hip_hop_dance', 294, 354],
  ['wave_hip_hop_dance_2', 152, 212],
  ['robot_hip_hop_dance', 126, 186],
  ['robot_hip_hop_dance_2', 122, 182],
  ['gangnam_style', 20, 80],
  ['tut_hip_hop_dance', 12, 72],
  ['tut_hip_hop_dance_2', 300, 360],
  ['ymca_dance', 206, 266],
  ['macarena_dance', 92, 152],
  ['chicken_dance', 156, 216],
  ['cabbage_patch_dance', 90, 150],
  ['body_wave_hip_hop', 286, 346],
  ['locking_hip_hop_dance', 298, 358],
  ['rib_pops_hip_hop', 102, 162],
  ['snake_hip_hop_dance', 122, 182],
  ['thriller_part_2', 332, 392],
  ['twist_dance', 64, 124],
  ['quake_hip_hop', 208, 268],
  ['boogaloo_dance', 126, 186],
  ['bboy_hip_hop', 270, 330],
  ['breakdance_uprock', 24, 84],
  ['brooklyn_uprock', 36, 96],
  ['swing_charleston', 108, 168],
  ['house_dancing_3', 254, 314],
  ['house_dancing_4', 10, 70],
  ['moonwalk_hip_hop', 198, 258],
  ['northern_soul_spin_combo', 30, 90],
  ['running_man_hip_hop', 224, 284],
  ['shuffling_dance', 108, 168],
];
// the poses he strikes on a golden beat or for a bar of his own: [clip, frame], each a dance's keypose (arms out, up, a
// point, a stop) that reads side on
const POSES = [
  ['raise_the_roof_hip_hop', 140],
  ['ymca_dance', 236],
  ['gangnam_style', 50],
  ['thriller_part_2', 362],
  ['tut_hip_hop_dance', 42],
  ['robot_hip_hop_dance', 156],
  ['house_dancing_4', 40],
  ['victory', 120],
];
// a bar of his own on the run (Pizza Tower's taunts): a battle cry, a thump on the chest, a come-on, played through the
// bar ([clip, from, to]); or a dancer's stop held ([clip, frame])
const FLOURISHES = [['standing_taunt_battlecry', 20, 150], ['standing_taunt_chest_thump', 20, 150], ['taunt', 8, 92], ...POSES.slice(0, 4)];
// an obstacle's take from a list (a move pressed for nothing: the first)
export const take = (list, o) => list[Math.min(list.length - 1, Math.floor((o?.v ?? 0) * list.length))];
// a plain slide may be any slide or roll; a long one must be one that holds
export const slideTake = o => (o?.type === 'long' ? take(MOVES.slides, o) : take([...MOVES.slides, ...MOVES.rolls], o));

// ---- clips: root motion taken out (hips at x = 0, heights kept)
export function prepClips(raw) {
  const C = {};
  for (const [name, frames] of Object.entries(raw.clips)) {
    const F = frames.map(f => {
      const J = Float32Array.from(f),
        hx = J[0];
      for (let j = 0; j < NJ; j++) J[j * 2] -= hx;
      return J;
    });
    C[name] = { F, n: F.length, loop: LOOPS.has(name) };
  }
  return C;
}
// the clips that cycle (their filter wraps round)
const LOOPS = new Set(['standard_run', 'sprint', 'flying', 'bouncing_fight_idle', 'falling_idle']);
// The cartoon animation filter (Wang, Drucker, Agrawala, Cohen, SIGGRAPH 2006): each joint's track minus its smoothed
// second derivative (a Laplacian of Gaussian), so every move winds up the other way before it goes and overshoots
// where it stops: anticipation, follow-through, exaggeration, from the capture itself. Worked out once per clip (on its
// first use), mixed in by `toon` (0: the capture as it is, 1: the filter's, more: past it). Not the cycles (the run's
// feet must stay planted): the moves.
const SIGMA = 5;
function cartoon(c) {
  const n = c.n,
    R = 3 * SIGMA,
    // (one kernel: the Laplacian of the Gaussian, scaled by sigma squared: the smoothed second derivative in one pass)
    K = new Float64Array(2 * R + 1);
  let ks = 0;
  for (let d = -R; d <= R; d++) ks += Math.exp((-d * d) / (2 * SIGMA * SIGMA));
  for (let d = -R; d <= R; d++) K[d + R] = (((d * d) / (SIGMA * SIGMA) - 1) * Math.exp((-d * d) / (2 * SIGMA * SIGMA))) / ks;
  // (filtered as a rig: the hips' height and each bone's angle, the angles unwrapped along the clip; the bones keep
  // their lengths)
  const rigs = c.F.map(f => toRig(f)),
    X = new Float64Array(n + 2 * R),
    G = rigs.map(r => Float64Array.from(r));
  for (let k = 1; k < RIG; k++) {
    if (k >= 2 && k % 2 === 1) continue;
    // (the track, padded at either end: wrapped round for a cycle, held for a move)
    let prev = rigs[0][k],
      acc = prev;
    for (let i = 0; i < n; i++) {
      acc = k >= 2 && i ? acc + wrap(rigs[i][k] - prev) : rigs[i][k];
      prev = rigs[i][k];
      X[i + R] = acc;
    }
    for (let i = 0; i < R; i++) {
      X[i] = c.loop ? X[n + i] : X[R];
      X[n + R + i] = c.loop ? X[R + i] : X[n + R - 1];
    }
    for (let i = 0; i < n; i++) {
      let v = 0;
      for (let d = 0; d < K.length; d++) v += K[d] * X[i + d];
      G[i][k] = X[i + R] - v;
    }
  }
  return G.map(r => fromRig(r));
}
// the filter worked out ahead for the clips the moves use, a few at a time while the game is idle (main.js), so no move
// stalls a frame the first time it plays
export function warmCartoon(C, names, now = false) {
  const todo = [...names].filter(n => C[n] && !C[n].loop && !C[n].G);
  // (now: all of it at once, while a song loads; about 2 ms a clip on a laptop)
  if (now) {
    for (const n of todo) C[n].G = cartoon(C[n]);
    return;
  }
  const step = () => {
    const t0 = performance.now();
    while (todo.length && performance.now() - t0 < 4) {
      const c = C[todo.shift()];
      c.G ??= cartoon(c);
    }
    if (todo.length) (globalThis.requestIdleCallback ?? setTimeout)(step);
  };
  step();
}
export const moveClips = () => new Set([...Object.values(MOVES).flat(), ...Object.values(TRICKS).flatMap(l => (typeof l[0]?.[0] === 'string' ? l : l.flat())).filter(Boolean), ...STRIKES.front.flat(), ...STRIKES.back.flat(), ...Object.values(PROP_TAKES), ...DANCES, ...POSES, ...FLOURISHES, ...['fall_a_land_to_run_forward', 'run_and_swing', 'falling_to_landing', 'falling_from_losing_balance', 'victory', 'vault_over_box', 'falling_to_roll', 'falling_roll_b', 'hard_landing', 'running_jump', 'pick_up_item', 'carrying'].map(n => [n])].map(k => k?.[0]).filter(n => typeof n === 'string'));
// how far into the cartoon filter the clips are read (the animator sets it while it poses him, by the section)
let toon = 0;
// a frame between frames; `loop` wraps the last frame onto the first
export function frameOf(c, f, loop = false) {
  const n = c.n,
    i = loop ? ((f % n) + n) % n : Math.max(0, Math.min(n - 1, f)),
    a = Math.floor(i),
    b = loop ? (a + 1) % n : Math.min(n - 1, a + 1),
    u = i - a,
    out = new Float32Array(NJ * 2);
  for (let k = 0; k < NJ * 2; k++) out[k] = c.F[a][k] + (c.F[b][k] - c.F[a][k]) * u;
  if (toon > 0 && n > 8 && !c.loop) {
    c.G ??= cartoon(c);
    for (let k = 0; k < NJ * 2; k++) out[k] += (c.G[a][k] + (c.G[b][k] - c.G[a][k]) * u - out[k]) * toon;
  }
  return out;
}
// (a plain loop: Float32Array.from with a function goes through an iterator and a call per element, a hot spot of the
// pose; the same numbers)
const mixJ = (A, B, u) => {
  const out = new Float32Array(A.length);
  for (let k = 0; k < A.length; k++) out[k] = A[k] + (B[k] - A[k]) * u;
  return out;
};
const ease = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
// a pose turned by a about (px, py)
export function turn(J, a, px, py) {
  if (!a) return J;
  const c = Math.cos(a),
    s = Math.sin(a),
    out = new Float32Array(J.length);
  for (let k = 0; k < J.length; k += 2) {
    const dx = J[k] - px,
      dy = J[k + 1] - py;
    out[k] = px + dx * c - dy * s;
    out[k + 1] = py + dx * s + dy * c;
  }
  return out;
}
// a parabola's height at u (0..1) for a peak of h
const lower = (F, h, from = 1) => {
  for (let k = from; k < F.length; k += 2) F[k] -= h;
  return F;
};
// a flight from a clip, u of the way from take-off to landing, with the clip's own rise taken out (its hips kept on the
// line from where they took off to where they land), so the run's arc is the only rise
// (a trick hangs at its top: time slows through the middle of the flight and makes it up at either end, the same
// landing; a bullet-time beat at the top of a flip)
function flight(C, [name, f0, f1], u, hang = 0) {
  u += (hang * Math.sin(TAU * u)) / TAU;
  const c = C[name],
    J = frameOf(c, f0 + (f1 - f0) * u),
    h0 = c.F[Math.min(c.n - 1, f0)][1],
    h1 = c.F[Math.min(c.n - 1, f1)][1];
  return lower(J, J[1] - (h0 + (h1 - h0) * u));
}


// Superman: the flying clip (prone, arms swept back) with his leading fist punched out ahead of him, the other arm back
// along his side
function superman(F, both = false) {
  const J = Float32Array.from(F);
  for (const [sh, el, ha, dy] of both ? [[JI.shR, JI.elR, JI.haR, 0.02], [JI.shL, JI.elL, JI.haL, -0.02]] : [[JI.shR, JI.elR, JI.haR, 0.08]]) {
    const sx = J[sh * 2],
      sy = J[sh * 2 + 1];
    J[el * 2] = sx + 0.25;
    J[el * 2 + 1] = sy + dy * 0.6;
    J[ha * 2] = sx + 0.5;
    J[ha * 2 + 1] = sy + dy;
  }
  // (both fists out: a rocket, his legs together behind him)
  if (both)
    for (const [a, b] of [[JI.knL, JI.knR], [JI.ftL, JI.ftR], [JI.toL, JI.toR]]) {
      const mx = (J[a * 2] + J[b * 2]) / 2,
        my = (J[a * 2 + 1] + J[b * 2 + 1]) / 2;
      J[a * 2] = J[b * 2] = mx;
      J[a * 2 + 1] = my + 0.03;
      J[b * 2 + 1] = my - 0.03;
    }
  return J;
}

// a take-off straight up (Superman's): both fists up first, a hand's width apart, the body and legs a line under them,
// toes pointed, one knee a little bent back (the comic-book take-off), the legs scissoring a little (`kick` 0..1, the
// beat's), stood on end, leaning `lean` (radians, towards his front); from a flight's frame, so his chest and head are
// the clip's
function rocket(F, d, kick = 0, lean = 0) {
  const J = Float32Array.from(F),
    P = j => [J[j * 2], J[j * 2 + 1]],
    set = (j, [x, y]) => ((J[j * 2] = x), (J[j * 2 + 1] = y)),
    len = (a, b) => Math.hypot(J[a * 2] - J[b * 2], J[a * 2 + 1] - J[b * 2 + 1]),
    [hx, hy] = P(JI.hips),
    [nx, ny] = P(JI.neck),
    n = Math.hypot(nx - hx, ny - hy) || 1,
    u = [(nx - hx) / n, (ny - hy) / n],
    side = [-u[1], u[0]],
    at = ([x, y], k, w = 0) => [x + u[0] * k + side[0] * w, y + u[1] * k + side[1] * w];
  for (const [sh, el, ha, w] of [[JI.shL, JI.elL, JI.haL, 0.05], [JI.shR, JI.elR, JI.haR, -0.05]]) {
    set(el, at(P(sh), 0.27, w * 0.5));
    set(ha, at(P(sh), 0.55, w));
  }
  for (const [hi, kn, ft, to, ph, bend] of [[JI.hiL, JI.knL, JI.ftL, JI.toL, 0, 0], [JI.hiR, JI.knR, JI.ftR, JI.toR, Math.PI, 1]]) {
    const lt = len(hi, kn),
      ls = len(kn, ft),
      flutter = (0.03 + 0.05 * kick) * Math.sin(d * 13 + ph),
      // (the bent leg: its knee a little forward, its foot tucked back behind the other)
      k = at(P(hi), -lt * (1 - 0.06 * bend), flutter * 0.5 + 0.1 * bend),
      f = [k[0] - u[0] * ls * (1 - 0.12 * bend) + side[0] * (flutter - 0.12 * bend), k[1] - u[1] * ls * (1 - 0.12 * bend) + side[1] * (flutter - 0.12 * bend)];
    set(kn, k);
    set(ft, f);
    set(to, [f[0] - u[0] * 0.12, f[1] - u[1] * 0.12]);
  }
  // (stood on end: his axis turned up, then leaning)
  return turn(J, Math.PI / 2 - Math.atan2(u[1], u[0]) - lean, hx, hy);
}
// up a shaft: Superman's flight seen side on, from Mixamo's Flying (prone, legs together) stood on end: his body one
// straight, tense line up the shaft, head up, his leading fist punched up ahead of his head (both fists, held through a
// zone), the other arm swept back along his side, his legs straight and together under him, toes pointed, one knee
// bent a touch (the comic-book take-off) and snapping straight on the kick (`push`, 0..1); `trail` (radians) swings
// his legs a little behind the way he drifts across the lanes
function soar(F, d, push = 0, trail = 0, both = false) {
  // (Superman taking off, seen from the front: his chest to the player, never side on: the body straight up the shaft,
  // one fist punched straight up overhead (both on a held zone), the other arm down along his side, the legs together,
  // straight and pointed down, fluttering a little; the kick drives the fist up; the drift tilts the whole of him
  // about his hips, the legs trailing it a little more)
  const k = 1 + 0.1 * push,
    fl = 0.025 * Math.sin(d * 10),
    hx = F[JI.hips * 2],
    hy = F[JI.hips * 2 + 1],
    pose = {
      hips: [0, 0],
      chest: [0, 0.27 * k],
      neck: [0, 0.48 * k],
      head: [0, 0.63 * k],
      shR: [0.17, 0.45],
      elR: [0.19, 0.45 + 0.28 * k],
      haR: [0.2, 0.45 + 0.56 * k],
      shL: [-0.17, 0.45],
      elL: both ? [-0.19, 0.45 + 0.28 * k] : [-0.3, 0.22],
      haL: both ? [-0.2, 0.45 + 0.56 * k] : [-0.36, -0.03],
      // (the legs as comic artists draw a hero going up: nearly straight, the knees a little apart (a long diamond),
      // the toes pointed down so the feet carry on the body's line; one knee a touch softer, so the two are not one
      // plank; stretched along the way up on the kick)
      hiL: [-0.09, 0],
      knL: [-0.13 + fl, -0.44 * k],
      ftL: [-0.06 + fl, -0.86 * k],
      toL: [-0.04 + fl, -0.98 * k],
      hiR: [0.09, 0],
      knR: [0.15 - fl, -0.42 * k],
      ftR: [0.07 - fl, -0.82 * k],
      toR: [0.05 - fl, -0.94 * k],
    },
    J = Float32Array.from(F),
    rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  for (const [name, [x, y]] of Object.entries(pose)) {
    // (the legs trail the drift a little more than the body)
    const [rx, ry] = rot(x, y, y < 0 ? trail * 1.6 : trail);
    J[JI[name] * 2] = hx + rx;
    J[JI[name] * 2 + 1] = hy + ry;
  }
  return J;
}
// a surfer's stance on the board: one still frame of a fighter's stance (left foot ahead), arms out for balance; the
// bounce is the body's (the music layer: knees on the beat), not the clip's
function stance(C) {
  const F = Float32Array.from(C.bouncing_fight_idle.F[0]);
  F[JI.haL * 2] = F[JI.shL * 2] + 0.45;
  F[JI.haL * 2 + 1] = F[JI.shL * 2 + 1] - 0.05;
  F[JI.haR * 2] = F[JI.shR * 2] - 0.45;
  F[JI.haR * 2 + 1] = F[JI.shR * 2 + 1] - 0.05;
  F[JI.elL * 2] = F[JI.shL * 2] + 0.22;
  F[JI.elR * 2] = F[JI.shR * 2] - 0.22;
  return F;
}
// the board under his feet (pose space, the board's top at y): half its foot span, the ankles' height over it
const BOARD = { x: 0.035, y: 0.08, half: 0.255, ankle: 0.07 };

// the bones by name (skeleton.js BONES order)
const BN = { spine: 0, neck: 1, head: 2, clL: 3, upL: 4, loL: 5, clR: 6, upR: 7, loR: 8, hipL: 9, thL: 10, shinL: 11, footL: 12, hipR: 13, thR: 14, shinR: 15, footR: 16 };
// how far each bone lags its parent (seconds to half way, 0: not at all): overlap, the head and the hands a moment behind
// the body; on the ground the legs are the feet's (IK), in the air they trail a little, flying they stream behind like a
// tail (each leg its own lag, so they never move as one plank)
const LAG = {
  ground: [0.02, 0.03, 0.06, 0.02, 0.035, 0.06, 0.02, 0.035, 0.06, 0, 0, 0, 0, 0, 0, 0, 0],
  air: [0.015, 0.025, 0.05, 0.015, 0.03, 0.05, 0.015, 0.03, 0.05, 0, 0.02, 0.03, 0.03, 0, 0.02, 0.03, 0.03],
  fly: [0.035, 0.035, 0.06, 0.02, 0.03, 0.035, 0.02, 0.03, 0.035, 0.04, 0.09, 0.11, 0.12, 0.05, 0.105, 0.125, 0.135],
  // (taking off up a shaft: tense, all of him as one; the arms a touch of follow-through, the legs none)
  rigid: [0.01, 0.015, 0.03, 0.01, 0.015, 0.03, 0.01, 0.015, 0.03, 0, 0, 0, 0, 0, 0, 0, 0],
};
// the keys he stands on the ground in (his feet held where they land: IK under the music and lean layers)
const GROUND = /^(run|ride|strike|land|getup|dropland|turn|victory|ollie|pick|carry)/;
// a change of clip's blend (inertialization half-life): a strike gets there at once, a change of mode takes longer
// (into a flight or a glide he throws himself into the pose: quick, not a slow tip over)
const blendHL = key => (key.startsWith('strike') ? 0.03 : /^(fly|glide)/.test(key) ? 0.045 : /^(ride|dropland)/.test(key) ? 0.065 : 0.055);
const FX = new WeakMap();
const fxOf = L => {
  if (!L.A?.onsets || !L.segs) return null;
  if (!FX.has(L)) FX.set(L, makeFX(L.A, L.segs, L.finale));
  return FX.get(L);
};
// the obstacles whose time is between a and b (they are sorted by time: a binary search, then a walk), as a list
function obsIn(L, a, b) {
  const obs = L.obs;
  if (!obs?.length) return [];
  let lo = 0,
    hi = obs.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (obs[m].t < a) lo = m + 1;
    else hi = m;
  }
  const out = [];
  for (let i = lo; i < obs.length && obs[i].t <= b; i++) out.push(obs[i]);
  return out;
}
// where the kick of each chord take meets (0..1 of the take)
const AIRKICK = { flying_kick: 0.48, flip_kick: 0.49 };
// the chord pressed at t0 whose first key is `key` (jump: over the thing and into the clone; slide: under it into its legs)
function chordOf(L, t0, key) {
  return obsIn(L, t0 - 0.3, t0 + 0.3).find(o => o.type === 'chord' && o.keys?.[0] === key) ?? null;
}
// the act whose order the system gives at t (render/layers/system.js: from two beats before the act to one after)
export function orderAt(L, t) {
  const b = L.A?.beat ?? 0.5;
  return L.acts?.find((a, i) => i > 0 && a.mode !== L.acts[i - 1].mode && a.mode !== 'run' && t > a.t0 - 2 * b && t < a.t0 + b) ?? null;
}
// the golden beats: the last beat of each four-bar phrase and the last before the section changes (Just Dance's gold
// moves): his best move goes there; a sorted list per song
const GOLD = new WeakMap();
export function goldBeats(A) {
  if (!A.beats || !A.bars) return [];
  if (!GOLD.has(A)) {
    const b0 = A.bar0 ?? 0,
      out = new Set();
    A.beats.forEach((t, i) => i > b0 && (i - b0) % 16 === 15 && out.add(t));
    for (let k = 1; k < A.bars.length; k++) if (A.bars[k].kind !== A.bars[k - 1].kind) out.add(A.bars[k].t0 - A.beat);
    GOLD.set(A, [...out].filter(t => t > 1).sort((p, q) => p - q));
  }
  return GOLD.get(A);
}
// the golden beat within `w` of t, or null
export function goldNear(A, t, w) {
  for (const g of goldBeats(A)) {
    if (g > t + w) break;
    if (Math.abs(g - t) <= w) return g;
  }
  return null;
}
// how clear the pulse is in the bar at t, 0..1: how many of its beats have a drum on them, and how hard (worked out
// once per song)
const CLAR = new WeakMap();
function clarityAt(A, t) {
  if (!A.bars || !A.onsets) return 0.5;
  if (!CLAR.has(A)) {
    const os = A.onsets.filter(o => o.band !== 'high').sort((p, q) => p.t - q.t),
      top = Math.max(1e-6, ...os.map(o => o.s));
    // (each beat's strongest drum within 50 ms, the onsets walked once alongside the beats; then a mean per bar)
    const at = new Float32Array(A.beats.length);
    let j = 0;
    for (const [i, bt] of A.beats.entries()) {
      while (j < os.length && os[j].t < bt - 0.05) j++;
      for (let k = j; k < os.length && os[k].t <= bt + 0.05; k++) at[i] = Math.max(at[i], os[k].s / top);
    }
    CLAR.set(
      A,
      A.bars.map(b => {
        let s = 0,
          n = 0;
        for (const [i, bt] of A.beats.entries())
          if (bt >= b.t0 - 0.01 && bt < b.t1) {
            s += at[i];
            n++;
          }
        return n ? Math.min(1, (s / n) * 1.5) : 0.5;
      }),
    );
  }
  const i = A.bars.findIndex(b => t < b.t1);
  return CLAR.get(A)[i < 0 ? A.bars.length - 1 : i];
}
// a clip's frame where a foot is lowest (mid-stance): the run is phased so that it falls on the beat
const lowest = (c, j) => c.F.reduce((m, f, i) => (f[j * 2 + 1] < c.F[m][j * 2 + 1] ? i : m), 0);
// a dance take's moving hold: the frame nearest its middle where the hands move least (Shiratori's keypose; the
// captures' motion beats), put on the take's middle beat
function keypose(c, f0, f1) {
  let best = (f0 + f1) / 2,
    bv = Infinity;
  for (let f = Math.round(f0 + (f1 - f0) * 0.3); f <= Math.round(f0 + (f1 - f0) * 0.7); f++) {
    const a = c.F[Math.max(0, f - 1)],
      b = c.F[Math.min(c.n - 1, f + 1)];
    let s = 0;
    for (const j of [JI.haL, JI.haR, JI.elL, JI.elR]) s += Math.hypot(b[j * 2] - a[j * 2], b[j * 2 + 1] - a[j * 2 + 1]);
    s += Math.abs(f - (f0 + f1) / 2) * 0.002;
    if (s < bv) (bv = s), (best = f);
  }
  return best;
}

export class Animator {
  constructor(clips) {
    this.C = clips;
    this.contact = { run: lowest(clips.standard_run, JI.ftL) / clips.standard_run.n, sprint: lowest(clips.sprint, JI.ftL) / clips.sprint.n };
    this.keyposes = new Map();
    // (the legs' own lengths, the run's median: the feet put back with these, not with a clip's leg shortened by the side
    // view or the stride's scaling)
    const med = (a, b) => {
      const v = clips.standard_run.F.map(f => Math.hypot(f[b * 2] - f[a * 2], f[b * 2 + 1] - f[a * 2 + 1])).sort((p, q) => p - q);
      return v[v.length >> 1];
    };
    this.leg = { thigh: (med(JI.hiL, JI.knL) + med(JI.hiR, JI.knR)) / 2, shin: (med(JI.knL, JI.ftL) + med(JI.knR, JI.ftR)) / 2 };
    // (the cartoon filter of every move worked out before the run starts, not on a move's first frame: a song's
    // loading hides it, once; the clips keep it)
    warmCartoon(clips, moveClips(), true);
    this.reset();
  }
  reset() {
    this.mHist = [];
    this.key = null;
    this.out = null;
    this.lastT = null;
    this.prev = null;
    this.vel = new Float64Array(RIG);
    this.off = null;
    this.offV = null;
    this.footOff = null;
    this.hl = BLEND;
    this.lag = null;
    this.ph = null;
    this.board = null;
    this.bs = { x: BOARD.x, v: 0 };
    this.cape = null;
  }
  // how far ahead of his hips his hands are at frame f of a clip (what holds him to the bar)
  handAhead(name, f) {
    const J = frameOf(this.C[name], f);
    return (J[JI.haL * 2] + J[JI.haR * 2]) / 2 - J[0];
  }
  // the run's phase (cycles; a whole number: the left foot planted): locked to the beat when the song's tempo gives a
  // stride near his own (a step on every beat or every half beat: Hi-Fi Rush's runs step on the beat), else by the distance
  // run; a phase-locked loop keeps it continuous when that changes. Returns [phase, the stride's scale]
  runPhase(R, t) {
    const L = R.L,
      beat = L.A.beat,
      v = L.vAt(t),
      b0 = L.A.beats?.[0] ?? 0;
    let target = L.xAt(t) / STRIDE,
      rate = v / STRIDE,
      ratio = 1;
    // (before the song he stands at the start: no beat to step to)
    for (const c of t > 0 ? [0.5, 1] : []) {
      const r = v / ((c / beat) * STRIDE);
      if (r > 0.72 && r < 1.4 && (ratio === 1 || Math.abs(Math.log(r)) < Math.abs(Math.log(ratio)))) {
        ratio = r;
        rate = c / beat;
        target = ((t - b0) / beat) * c;
      }
    }
    if (this.ph === null || !this.dt) this.ph = target;
    else {
      const err = wrap(TAU * (target - this.ph)) / TAU;
      this.ph += (rate + err * 4) * this.dt;
    }
    return [this.ph, ratio];
  }
  runPose(R, t) {
    const C = this.C,
      [ph, ratio] = this.runPhase(R, t),
      w = ease((R.L.vAt(t) - 4.4) / 1.55),
      run = mixJ(frameOf(C.standard_run, (ph + this.contact.run) * C.standard_run.n, true), frameOf(C.sprint, (ph + this.contact.sprint) * C.sprint.n, true), w);
    // (a stride longer or shorter than the clip's: the legs' reach scaled, so a planted foot keeps pace with the roof)
    const k = clamp(ratio, 0.75, 1.35);
    for (const j of [JI.hiL, JI.knL, JI.ftL, JI.toL, JI.hiR, JI.knR, JI.ftR, JI.toR]) run[j * 2] *= k;
    return run;
  }
  // ---- what the clips say: [key, pose]
  target(R, t, s) {
    const C = this.C,
      c = (this.c ??= { lag: 'ground' });
    // tucked into the roll too soon in a leap's flight (run.js tuck): balled up, tumbling forward over the gap as he
    // drops short of the island; then, like any fall into a gap, dangling in the cursor's grip as it puts him on it
    if (R.short && R.mode === 'run') {
      c.lag = 'air';
      const sh = R.short,
        d = t - sh.t0;
      if (!sh.c) {
        const F = frameOf(C.falling_roll_b, Math.min(10, 2 + d * 60));
        return ['tuck', turn(F, -Math.min(2.6, 0.4 + 5 * d), F[0], F[1] + 0.3)];
      }
      const since = t - sh.c.t0,
        J = Float32Array.from(turn(frameOf(C.swinging, 20 + since * 30), 0.2 * Math.sin(since * 9), 0, 1));
      lower(J, (J[JI.haL * 2 + 1] + J[JI.haR * 2 + 1]) / 2 - 2.35);
      return ['gapcarry', J];
    }
    // fallen in a gap: dropping into it, arms flung up; then dangling in the cursor's grip as it carries him over
    if (R.respawn && R.mode === 'run') {
      c.lag = 'air';
      const since = t - R.respawn.t0;
      if (since < 0.25) return ['gapfall', frameOf(C.falling_from_losing_balance, 130 + since * 60)];
      const J = Float32Array.from(turn(frameOf(C.swinging, 20 + since * 30), 0.2 * Math.sin(since * 9), 0, 1));
      lower(J, (J[JI.haL * 2 + 1] + J[JI.haR * 2 + 1]) / 2 - 2.35);
      return ['gapcarry', J];
    }
    if (R.mode === 'shaft') {
      // flying up: a superhero's flight (flying, stood on end: arms first, up); falling: a skydiver's fall, arms flung up
      // (falling_to_landing's first frame) and legs pedalling slowly (floating's); either way leaning into the drift
      // across the lanes; over the last moment, the legs come down to land (falling_to_landing on to the touch)
      c.lag = 'air';
      const d = t - s.t0,
        left = s.t1 - t,
        face = s.face ?? 1;
      let key = R.shaft,
        J,
        // (leaning into the drift across the lanes; rising, held to a lean, and lifted on the beat)
        lean = -R.laneV * 0.11 * face,
        lift = 0;
      // a climb (the tic-tac), by its phases (parkour coaching and platformer craft: a short, compressed plant, an
      // explosive push, a turn at the apex, a free flight reaching for the next wall feet first, a squash on contact):
      //   on a wall   crouched against it, the ball of his foot at hip height, body leaning out from it (the push off a
      //               wall's first frames), squashed a moment on contact; slipping, arms flung, scrabbling
      //   push        the push off a wall's extension: legs straightening hard, arms swinging up, off it backwards
      //   turn        across the apex he turns from the wall he left to the one he is going to (the two poses blended
      //               through his front: the 2D turn), knees coming up
      //   flight      a running leap's flight: legs scissored, arms high, the lead leg reaching for the wall
      //   run-up      in off the roof: running at the wall in front, then running up it, his body along it
      // each pose turned to face its wall (mirrored about his hips when that is not the shaft's own facing)
      const cp = R.climbPose;
      if (cp && s.climbPts) {
        c.lag = 'air';
        const W = C.jump_from_wall,
          RJ = C.running_jump,
          RN = C.standard_run,
          face2 = (P, f) => (f === face ? P : Float32Array.from(P, (v, i) => (i % 2 ? v : 2 * P[0] - v))),
          mix = (A, B, k) => Float32Array.from(A, (v, i) => v + (B[i] - v) * k),
          squash = (P, sy, sx = 1 / Math.sqrt(sy)) => Float32Array.from(P, (v, i) => (i % 2 ? P[1] + (v - P[1]) * sy : P[0] + (v - P[0]) * sx));
        if (cp.entry === 'run') J = face2(frameOf(RN, d * 60, true), cp.face);
        // (the finish: planted on the roof's face, up it and over the edge, from Mixamo's sprint to wall climb)
        // (hung on the edge and pulling up (its middle frames), then over the top into its crouch (its last))
        else if (cp.mantle) J = face2(frameOf(C.sprint_to_wall_climb, C.sprint_to_wall_climb.n * (cp.u < 0.62 ? 0.42 + 0.3 * (cp.u / 0.62) : 0.72 + 0.27 * ((cp.u - 0.62) / 0.38))), cp.face);
        else if (cp.entry === 'up') {
          // (running up the wall: upright, leaning back a little off it, his feet stepping up its face)
          J = turn(frameOf(RN, d * 75, true), (cp.face > 0 ? 1 : -1) * 0.3, 0, 1);
          J = face2(J, cp.face);
        } else if (cp.wall) {
          // (on a beam: crouched against its side, its first frames of the jump from wall, squashed a moment as he hits
          // it, falling with it)
          const k = Math.min(1, (cp.since ?? 1) / 0.08);
          // (late, past its beat: hanging off it by his hands (Mixamo's hanging idle), feet off it, going down with it)
          J = cp.slip ? frameOf(C.hanging_idle, d * 60, true) : frameOf(W, W.n * (0.04 + 0.14 * k));
          if (!cp.slip && k < 1) J = squash(J, 0.84 + 0.16 * k);
          J = face2(J, cp.face);
        }
        // (up alone: a hop straight up, rising)
        else if (cp.hop) J = face2(frameOf(RJ, RJ.n * 0.12), cp.face);
        else if (cp.falling) J = face2(frameOf(C.falling_from_losing_balance, 130 + d * 60), cp.face);
        else if (cp.carry) J = face2(turn(frameOf(C.swinging, 20 + cp.u * 30), 0.25 * Math.sin(cp.u * Math.PI * 3), 0, 1), cp.face);
        else {
          const u = cp.u,
            fa = cp.fa ?? cp.face,
            fz = cp.fz ?? cp.face,
            // (every third push a bigger tuck at the apex: the same move never twice alike)
            tuck = cp.n % 3 === 2 ? 0.25 : 0;
          if (cp.leap) {
            // (off the road's edge at the first beam: a running leap, forwards and up, reaching for it)
            J = face2(frameOf(RJ, RJ.n * (0.06 + (0.4 + tuck * 0.3) * u)), fz);
            if (u < 0.15) J = squash(J, 1.07);
          } else if (u < 0.14) {
            // (the kick off the beam's middle: Mixamo's jump from wall, legs driving it away, stretched off the push)
            J = squash(face2(frameOf(W, W.n * (0.3 + 0.15 * (u / 0.14))), fa), 1.06);
          } else if (u < 0.26) {
            // (turned the way he flies, at once: from the push into the stretched flight)
            const k = (u - 0.14) / 0.12,
              F = turn(frameOf(RJ, RJ.n * 0.2), fz * -0.55, 0, 1);
            J = mix(face2(frameOf(W, W.n * 0.45), fa), face2(F, fz), k * k * (3 - 2 * k));
          } else if (u < 0.62) {
            // (flying: the body pitched into the way he goes, arms and legs streaming behind it)
            J = face2(turn(frameOf(RJ, RJ.n * (0.18 + 0.06 * Math.sin(u * 9))), fz * -0.55, 0, 1), fz);
          } else {
            // (gathering for the next: knees to the chest, coming upright, into the crouch he meets the beam in; on the
            // way out, the roof's face is the finish's)
            const k = (u - 0.62) / 0.38,
              A = turn(frameOf(RJ, RJ.n * 0.2), fz * -0.55 * (1 - k), 0, 1),
              Bp = frameOf(W, W.n * (0.06 + tuck * 0.06));
            J = face2(mix(A, Bp, k * k * (3 - 2 * k)), fz);
          }
        }
        lower(J, J[1] - 1.0);
        return ['climb', J];
      }
      if (left < 0.28) {
        key = `${R.shaft}-land`;
        J = frameOf(C.falling_to_landing, 4 + 12 * (1 - left / 0.28));
      } else if (R.L.obs.some(o => o.type === 'zone' && o.seg === s && t >= o.t && t <= o.t + o.dur && R.held[o.key])) {
        // holding through a zone: diving head first (down), or rocketing up both fists first, legs together (up)
        const F = frameOf(C.flying, d * 30, true);
        key = `${R.shaft}-zone`;
        if (R.shaft === 'fall') {
          J = turn(F, -Math.PI / 2 + 0.2, F[0], F[1]);
          c.lag = 'fly';
        } else {
          const kick = fxOf(R.L)?.(t)?.kick ?? 0;
          lean = clamp(-R.laneV * 0.06 * face, -0.22, 0.22);
          c.lag = 'rigid';
          J = soar(F, d, kick, -lean * 0.6, true);
          lift = 0.05 * Math.sin(d * 9) + 0.12 * kick;
        }
      } else if (R.shaft === 'rise') {
        // (going up: Superman, not a body hung on a rope: straight and tense up the shaft, his fist leading, legs
        // together under him; he hovers on the beat, surges up on the kick, and leans into a drift across the lanes, his
        // legs swinging a little behind it. The air's lag, not the flight's: the flight's long trail makes a limp tail
        // of him stood on end)
        const kick = fxOf(R.L)?.(t)?.kick ?? 0,
          beat = R.L.A.beat,
          b0 = R.L.A.beats?.[0] ?? 0;
        lean = clamp(-R.laneV * 0.06 * face, -0.22, 0.22);
        c.lag = 'rigid';
        J = soar(frameOf(C.flying, d * 30, true), d, kick, -lean * 0.6);
        lift = 0.06 * Math.cos(TAU * hold((((t - b0) / beat) % 1 + 1) % 1, 0.7)) + 0.14 * kick;
      } else {
        // falling: alive all the way down (a body falling flails): his arms windmilling (losing his balance, played
        // back and forth), his legs bent and pedalling (the free fall's), his body tumbling slowly forward and back,
        // further in a long fall
        const n = 170,
          k = (d * 60 * 1.3) % (2 * n),
          arms = frameOf(C.falling_from_losing_balance, 130 + (k < n ? k : 2 * n - k)),
          legs = frameOf(C.falling_idle, d * 40, true),
          dy = arms[1] - legs[1],
          pedal = Math.sin(d * 6);
        J = Float32Array.from(arms, (v, i) => (i >= 20 ? legs[i] + (i % 2 ? dy : 0) : v));
        for (const [kn, ft, to, ph] of [[JI.knL, JI.ftL, JI.toL, 0], [JI.knR, JI.ftR, JI.toR, Math.PI]]) {
          const lift = 0.12 * Math.sin(d * 6 + ph);
          J[kn * 2 + 1] += lift;
          J[ft * 2 + 1] += lift * 1.6;
          J[to * 2 + 1] += lift * 1.6;
          J[ft * 2] += 0.08 * pedal * (ph ? -1 : 1);
        }
        const long = s.t1 - s.t0 > 4.5 ? 1 : 0.6;
        J = turn(J, long * (0.45 * Math.sin(d * 1.6) + 0.15 * Math.sin(d * 4.1)), J[0], J[1]);
      }
      // (his hips a metre over his root, as they are standing; rising, a hover and a surge on the beat)
      lower(J, J[1] - 1.0 - lift);
      return [key, turn(J, lean, J[0], J[1])];
    }
    // a flight (modes.js): Superman, his whole body along the way he is going (pitched up as he climbs, down as he dives:
    // the angle of his velocity, not a tilt on the spot), his fist leading, his legs streaming behind on their own lag;
    // he goes up off the roof stood on end, a rocket, and tips forward into the flight; at the end he dives and swings his
    // legs under him to land; hovering, he bobs on the beat
    if (R.fly) {
      c.lag = 'fly';
      const w = R.fly,
        beat = R.L.A.beat,
        F = superman(frameOf(C.flying, (t - w.t0) * 30, true)),
        v = Math.max(2, R.L.vAt(t)),
        uIn = clamp((t - (w.t0 - beat)) / beat),
        uOut = clamp((t - w.t1) / beat),
        travel = clamp(Math.atan2(R.vy, v), -0.45, 0.45),
        entry = (Math.PI / 2 - 0.25) * (1 - ease(uIn)),
        exit = uOut < 0.4 ? -0.3 * ease(uOut / 0.4) : -0.3 + 1.55 * ease((uOut - 0.4) / 0.6),
        b0 = R.L.A.beats?.[0] ?? 0,
        bob = 0.07 * Math.cos(TAU * hold(((t - b0) / beat) % 1, 0.7));
      return ['fly', lower(turn(F, travel + entry + exit, F[0], F[1]), F[1] - 0.3 + bob)];
    }
    // the holds: gliding (a superhero's flight, level), on the line (hanging from it, swaying), dashing (a shoulder
    // charge: the sprint leaning hard into it)
    if (R.hold2) {
      const h = R.hold2,
        d = t - h.t0;
      c.lag = 'air';
      if (h.kind === 'glide') {
        // (nose up a little, riding the air, rising and falling with it)
        c.lag = 'fly';
        const F = superman(frameOf(C.flying, d * 30, true));
        return ['glide', lower(turn(F, 0.12 + 0.06 * Math.sin(d * 5), F[0], F[1]), -1.0 - 0.08 * Math.sin(d * 5))];
      }
      if (h.kind === 'zip') {
        // (hanging straight under the line, the swing's frame where the legs are under him, swaying a little; the frames
        // either side kick the legs up behind or ahead)
        const F = frameOf(C.run_and_swing, 70 + 2 * Math.sin(d * 4));
        return ['zip', turn(F, 0.08 * Math.sin(d * 4), F[0], F[1] + 1)];
      }
      if (h.kind === 'grind') {
        // (grinding: a skater's crouch along the rail, arms out)
        const F = stance(C);
        F[JI.haL * 2] = F[JI.shL * 2] + 0.5;
        F[JI.haR * 2] = F[JI.shR * 2] - 0.5;
        F[JI.haL * 2 + 1] = F[JI.haR * 2 + 1] = F[JI.shL * 2 + 1];
        c.lag = 'ground';
        c.bob = 1;
        return ['grind', lower(turn(F, 0.05 * Math.sin(d * 9), F[0], 0), 0.12)];
      }
      // (through a corridor of walls: a ram, Juggernaut's, head first: his body bent level over his sprinting legs, head
      // down and leading, shoulders hunched, arms swept back; each wall he smashes through knocks his head and
      // shoulders back a little, and he drives on)
      const F = frameOf(C.sprint, ((R.L.xAt(t) / STRIDE) * C.sprint.n) % C.sprint.n, true),
        o = h.o,
        half = R.L.A.beat / 2,
        n = o?.panes?.length ?? 0,
        tp = i => o.t + R.L.M.kickAt + i * half,
        i = n ? Math.max(0, Math.min(n - 1, Math.floor((t - tp(0)) / half + 0.5))) : -1,
        knock = i >= 0 && t >= tp(i) ? bounce(t - tp(i), 0.22, 0.2, 0.05) : 0,
        lean = -(1.05 - knock) * Math.min(1, d / 0.12),
        hx = F[0],
        hy = F[1];
      // (the upper body turned forward about his hips; the legs keep running)
      for (let k = 1; k < 10; k++) {
        const dx = F[k * 2] - hx,
          dy = F[k * 2 + 1] - hy;
        F[k * 2] = hx + dx * Math.cos(lean) - dy * Math.sin(lean);
        F[k * 2 + 1] = hy + dx * Math.sin(lean) + dy * Math.cos(lean);
      }
      // (head tucked down in front of his shoulders, the crown first)
      const nx = F[JI.neck * 2],
        ny = F[JI.neck * 2 + 1];
      F[JI.head * 2] = nx + 0.13;
      F[JI.head * 2 + 1] = ny - 0.02;
      // (arms swept back along his sides, hands behind his hips)
      for (const [sh, el, ha, k] of [[JI.shL, JI.elL, JI.haL, 0], [JI.shR, JI.elR, JI.haR, 0.06]]) {
        F[el * 2] = F[sh * 2] - 0.28;
        F[el * 2 + 1] = F[sh * 2 + 1] + 0.04 + k;
        F[ha * 2] = F[sh * 2] - 0.56;
        F[ha * 2 + 1] = F[sh * 2 + 1] + 0.1 + k;
      }
      lower(F, 0.12);
      return ['dash', F];
    }
    if (R.victory) {
      // the win: his body from the clip, his arms thrown up in a wide V (one up and forward, one up and back: seen side
      // on, two arms raised together read as one arm held out, a salute), elbows bent, fists pumping on the beat
      const d = t - R.victory.t0,
        F = frameOf(C.victory, Math.min(190, 24 + d * 50)),
        up = ease(d / 0.35),
        pump = Math.sin(((t - (R.L.A.beats[0] ?? 0)) / R.L.A.beat) * Math.PI) ** 2;
      for (const [sh, el, ha, side] of [[JI.shL, JI.elL, JI.haL, 1], [JI.shR, JI.elR, JI.haR, -1]]) {
        const a = side * (0.62 + 0.12 * pump),
          b = a - side * (0.35 + 0.35 * pump),
          ex = F[sh * 2] + Math.sin(a) * 0.29,
          ey = F[sh * 2 + 1] + Math.cos(a) * 0.29;
        F[el * 2] += (ex - F[el * 2]) * up;
        F[el * 2 + 1] += (ey - F[el * 2 + 1]) * up;
        F[ha * 2] += (ex + Math.sin(b) * 0.27 - F[ha * 2]) * up;
        F[ha * 2 + 1] += (ey + Math.cos(b) * 0.27 - F[ha * 2 + 1]) * up;
      }
      return ['victory', F];
    }
    const ride = R.L.modeAt?.(t) === 'ride' && R.mode === 'run',
      j = R.jump;
    // on the hoverboard (modes.js ride) everything grows out of his stance on it, not out of a run: his feet stay on
    // the board (IK) whatever his arms do
    c.ride = ride;
    const base = ride ? stance(C) : this.runPose(R, t);
    // (on the hoverboard a jump is an ollie: the board kicked up nose first, tucked under him, level at the top, nose
    // down to land; a trick (the streak's tiers) flips the board under his tucked feet)
    // (but a chord's kick over the thing is the flying kick itself, off the board: it stays under his tucked foot)
    if (j && ride && !TRICKS.airkick.includes(j.take)) {
      const u = clamp((t - j.t0) / j.air);
      c.ollie = { u, flip: !j.btrick && (R.tier >= 2 || TRICKS.jump.slice(1).some(l => l?.includes(j.take))), trick: j.btrick };
      return ['ollie', base];
    }
    // (a leap down a ladder of islands, flying to the next: leapFlight)
    if (j?.ladder) return this.leapFlight(R, t, j, base);
    // (up a ladder, bounding onto a trampoline: giving with it, crouched into the push off (running_jump's plant))
    const pad = !j && R.padSink?.(t);
    if (pad) {
      const F = frameOf(C.running_jump, 2);
      return ['bound', mixPose(base, lower(F, F[1] - 0.86), ease(pad / 0.2))];
    }
    if (j) {
      c.lag = 'air';
      let u = clamp((t - j.t0) / j.air);
      const tk = this.jumpTake(R, j),
        trick = tk !== j.take ? 0 : TRICKS.jump.slice(1).some(l => l?.includes(tk)) ? 0.4 : 0;
      c.ctx = this.ctx;
      // (the chord's kick over the thing into the clone: the clip's kick put on the moment the clone is met, not on the
      // top of the jump; and aimed at it, below him: pose.js turns him so the kicking foot points at its chest)
      const ch = TRICKS.airkick.includes(tk) && chordOf(R.L, j.t0, 'jump');
      if (ch) {
        const uc = clamp((ch.t + R.L.M.kickAt - j.t0) / j.air, 0.12, 0.85),
          cf = AIRKICK[tk[0]] ?? 0.48;
        u = u < uc ? (cf * u) / uc : cf + ((1 - cf) * (u - uc)) / (1 - uc);
        c.aim = { o: ch, w: Math.max(0, 1 - Math.abs((t - j.t0) / j.air - uc) / 0.22), toe: tk[0] === 'flip_kick' ? JI.toR : JI.toL };
      }
      const F = flight(C, tk, u, tk === this.ctx?.take && this.ctx.kind === 'gold' ? 0.45 : trick);
      // (a strike thrown in the air, at a clone or a pane met mid-jump: the strike's clip over the jump, its contact on
      // the moment it lands, aimed at what it hits)
      const st = R.strike;
      if (st && !ch && t < st.t0 + st.dur) {
        const k = st.take,
          us = (t - st.t0) / st.dur,
          cf = k[3],
          cu = us < cf ? cf * (0.22 + 0.78 * (us / cf)) : cf + (1 - cf) * (1 - (1 - clamp((us - cf) / (1 - cf))) ** 2),
          K = frameOf(C[k[0]], k[1] + (k[2] - k[1]) * cu),
          w = Math.min(ease(us / (cf * 0.3)), 1 - ease((us - cf - 0.08) / (0.92 - cf)));
        if ((k[4] ?? '').startsWith('turn')) for (let i = 0; i < K.length; i += 2) K[i] = -K[i];
        lower(K, K[1] - F[1]);
        const Kc = frameOf(C[k[0]], k[1] + (k[2] - k[1]) * cf),
          toe = [JI.toL, JI.toR, JI.haL, JI.haR].reduce((m, jj) => (Math.abs(Kc[jj * 2]) > Math.abs(Kc[m * 2]) ? jj : m), JI.toL),
          foe = obsIn(R.L, st.contact - R.L.M.kickAt - 0.2, st.contact - R.L.M.kickAt + 0.2).find(o => o.type === 'foe' || o.type === 'foeback' || o.type === 'smash');
        if (foe) c.aim = { o: foe, w: Math.max(0, 1 - Math.abs(t - st.contact) / (st.dur * 0.35)), toe };
        c.strike = true;
        return [`jump:${tk[0]}+strike:${k[0]}`, mixPose(F, K, w)];
      }
      return [`jump:${tk[0]}`, F];
    }
    if (R.swing) {
      c.lag = 'air';
      const w = R.swing,
        u = Math.min(1, (t - w.t0) / (w.t1 - w.t0));
      return ['swing', frameOf(C.run_and_swing, 30 + 100 * u)];
    }
    // (below the ground under him: an island's or his level's)
    if (R.y < (R.gy ? R.gy(s, R.L.xAt(t)) : s.y0) - 0.05) {
      c.lag = 'air';
      return ['drop', frameOf(C.falling_idle, t * 54, true)];
    }
    // (a strike thrown while sliding or ducking stays low: the slide's pose with the strike's arms, below)
    if (R.strike && !R.slide) {
      // the strike: the first frame already the move (its wind-up's start skipped: the silhouette changes the moment he
      // presses, Hi-Fi Rush), on through the wind-up to the contact, which lands on the grid; held there an instant (a
      // hit-stop of the body alone, the song runs on), then a quick follow-through that settles back (the held instant
      // taken out of it, so the next move is still on the grid)
      const k = R.strike.take,
        st = R.strike,
        cf = k[3],
        u = (t - st.t0) / st.dur,
        stop = 0.035 + 0.025 * (R.L.profile?.hardness ?? 0),
        tc = st.t0 + cf * st.dur;
      let cu;
      if (t < tc) cu = cf * (0.22 + 0.78 * (u / cf));
      else if (t < tc + stop) cu = cf;
      else cu = cf + (1 - cf) * (1 - (1 - clamp((t - tc - stop) / Math.max(0.05, st.dur * (1 - cf) - stop))) ** 2);
      const w = Math.min(ease(u / (cf * 0.3)), 1 - ease((u - cf - 0.08) / (0.92 - cf)));
      const K = frameOf(C[k[0]], k[1] + (k[2] - k[1]) * cu),
        how = k[4] ?? '';
      if (u < 1) {
        c.strike = true;
        // (turned round: the pose mirrored about his hips, which are at x = 0)
        if (how.startsWith('turn')) for (let i = 0; i < K.length; i += 2) K[i] = -K[i];
        // (a punch on the run, and any strike on the board: his upper body from the strike about his hips over his legs;
        // a kick on the board kicks with the leg that kicks in the clip, the other foot stays on the board)
        if (how.endsWith('arms') || ride) {
          const P = Float32Array.from(base);
          for (let i = 2; i < 20; i++) P[i] += (K[i] - K[i % 2] + base[i % 2] - base[i]) * w;
          if (ride && !how.endsWith('arms')) {
            const kc = frameOf(C[k[0]], k[1] + (k[2] - k[1]) * cf),
              side = kc[JI.ftL * 2 + 1] > kc[JI.ftR * 2 + 1] ? 'L' : 'R';
            if (Math.max(kc[JI.ftL * 2 + 1], kc[JI.ftR * 2 + 1]) > 0.35) {
              c.free = side;
              for (const n of ['hi', 'kn', 'ft', 'to']) {
                const jj = JI[n + side];
                P[jj * 2] += (K[jj * 2] - K[0] + base[0] - P[jj * 2]) * w;
                P[jj * 2 + 1] += (K[jj * 2 + 1] - K[1] + base[1] - P[jj * 2 + 1]) * w;
              }
            }
          }
          return [`strike:${how}:${k[0]}`, P];
        }
        return [`strike:${how}:${k[0]}`, mixPose(base, K, w)];
      }
    }
    // (on the board a landing, a getting up, a landing from a drop are his stance taking the shock: the music layer's
    // squash, not a runner's clip)
    if (ride) {
      // (a trick of his own ridden along (freestyle, down): its kind and how far through it he is)
      if (R.brk?.board && t < R.brk.t1) {
        c.btrick = { kind: R.brk.board, u: clamp((t - R.brk.t0) / (R.brk.t1 - R.brk.t0)) };
        if (R.brk.board === 'duckspin') c.duck = true;
        return ['ride-trick', base];
      }
      // (a slide on the board: he ducks, folded down over it, his head under what he rides beneath)
      // (the chord down + kick on the board: ducked, his front leg sweeps out low into the clone's legs and back)
      if (R.slide) {
        c.duck = true;
        if (TRICKS.sweep.includes(R.slide.take)) {
          c.free = 'L';
          // (out by the moment the clone is met, held a moment, drawn back)
          const ch = chordOf(R.L, R.slide.t0, 'slide'),
            since = t - R.slide.t0,
            hitAt = ch ? Math.max(0.08, ch.t + R.L.M.kickAt - R.slide.t0) : 0.15;
          c.sweep = since < hitAt ? ease(since / hitAt) : since < hitAt + 0.15 ? 1 : Math.max(0, 1 - (since - hitAt - 0.15) / 0.2);
          c.sweepO = ch;
          return ['ride-sweep', base];
        }
        if (R.strike) c.lowStrike = true;
        return ['ride-duck', base];
      }
      if (R.landing || R.getup || t - R.landT < 0.62) c.squash = Math.max(R.landing?.t0 ?? -9, R.getup?.t0 ?? -9, R.landT);
      return ['ride', base];
    }
    // (down on an island of a ladder: rolled out of it, or landed hard)
    if (R.roll) return this.stairLand(R, t, base);
    // (a thing picked up off a crate on the run, and carried: his upper body over his running legs)
    if (R.pickup || R.carry) return this.propPose(R, t, base);
    if (R.landing) {
      // the landing: the take's clip played on from its landing frame, into the run
      // (a trick that touches down still turning or bent double, a cartwheel, a backflip, plays on to where it stands up,
      // quicker, before it gives way to the run: never 0.24 s of him head down)
      const u = (t - R.landing.t0) / R.landing.d,
        k = this.ctx && R.landing.take === this.ctx.from ? this.ctx.take : R.landing.take,
        up = k ? this.upright(k[0], k[2]) : 10,
        F = k ? frameOf(C[k[0]], k[2] + up * u) : frameOf(C.run_and_swing, 130 + 10 * u);
      return ['land', mixPose(F, base, ease(up > 14 ? (u - 0.35) / 0.65 : u))];
    }
    // a break of his own (freestyle, down): its parts one after another over its beats, his feet sliding on with the run
    if (R.brk && t < R.brk.t1) {
      c.lag = 'air';
      const parts = brkParts(R.brk.take),
        n = brkFrames(R.brk.take);
      let f = clamp((t - R.brk.t0) / (R.brk.t1 - R.brk.t0), 0, 1) * n,
        i = 0;
      while (i < parts.length - 1 && f > parts[i][2] - parts[i][1]) f -= parts[i][2] - parts[i++][1];
      return [`brk:${R.brk.t0}`, frameOf(C[parts[i][0]], parts[i][1] + Math.min(f, parts[i][2] - parts[i][1]))];
    }
    if (R.slide) {
      c.lag = 'air';
      const sl = R.slide,
        k = sl.take,
        d = t - sl.t0;
      // a roll: the whole of it over the slide
      if (typeof k[1] === 'number') {
        let u = Math.min(1, d / Math.max(0.2, sl.t1 - sl.t0));
        // (the chord's slide tackle: its foot reaching furthest on the moment the clone is met)
        const ch = TRICKS.sweep.includes(k) && chordOf(R.L, sl.t0, 'slide');
        if (ch) {
          const uc = clamp((ch.t + R.L.M.kickAt - sl.t0) / Math.max(0.2, sl.t1 - sl.t0), 0.1, 0.9),
            cf = 0.34;
          u = u < uc ? (cf * u) / uc : cf + ((1 - cf) * (u - uc)) / (1 - uc);
        }
        return [`roll:${k[0]}`, frameOf(C[k[0]], k[1] + (k[2] - k[1]) * u)];
      }
      const [down, held] = [k[1], k[2]],
        f = d < 0.16 ? down[0] + ((down[1] - down[0]) * d) / 0.16 : held[0] + (held[1] - held[0]) * Math.min(1, (d - 0.16) / Math.max(0.05, Math.min(9, sl.t1 - sl.t0) - 0.16));
      if (R.strike) c.lowStrike = true;
      return [`slide:${k[0]}`, frameOf(C[k[0]], f)];
    }
    if (R.getup) {
      const u = (t - R.getup.t0) / R.getup.d,
        k = R.getup.take,
        F = typeof k[1] === 'number' ? frameOf(C[k[0]], k[2]) : frameOf(C[k[0]], k[3][0] + (k[3][1] - k[3][0]) * u);
      return ['getup', mixPose(F, base, ease(u * 1.2 - 0.2))];
    }
    if (s.turn && t - s.t0 < TURN) {
      // turning round on landing: the level's take of a captured turn, its pose turned about him so that it starts
      // facing back the way he came and ends facing the way he runs now
      const k = take(MOVES.turns, s),
        u = (t - s.t0) / TURN,
        F = frameOf(C[k[0]], k[1] + (k[2] - k[1]) * u);
      for (let i = 0; i < F.length; i += 2) F[i] = -F[i];
      return [`turn:${k[0]}`, F];
    }
    if (t - R.landT < 0.62) {
      const u = (t - R.landT) / 0.62;
      return ['dropland', mixPose(frameOf(C.fall_a_land_to_run_forward, 2 + 50 * u), base, ease((u - 0.55) / 0.45))];
    }
    return ['run', base];
  }
  // ---- the pose to show: the clips' pose, then (as a rig) the change of clip inertialized, the music and the lean
  // added, each bone lagging its parent, the feet put back where they stand (IK), the squash and stretch; the board and
  // the cape alongside
  pose(R, t, s) {
    const dt = this.lastT === null ? 0 : t - this.lastT;
    this.lastT = t;
    // (a jump in time, a seek or an undo: everything settles at once)
    this.dt = dt > 0 && dt < 0.1 ? dt : 0;
    this.c = { lag: 'ground' };
    // the section's and the song's way of moving (style below): the clips read that far into the cartoon filter
    // (the song's envelopes worked out once a step; the moment-before values the music layer wants, from the last few
    // steps' (at 120 Hz: four steps back is 33 ms, seven is 58)
    const mfAt0 = fxOf(R.L),
      mNow = mfAt0 ? mfAt0(t) : null;
    if (!this.dt) this.mHist = [];
    if (mNow) {
      this.mHist ??= [];
      this.mHist.unshift(mNow);
      if (this.mHist.length > 8) this.mHist.pop();
    }
    const sty = this.style(R, mNow);
    toon = sty.toon;
    let [key, J] = this.target(R, t, s);
    toon = 0;
    const c = this.c,
      L = R.L,
      A = L.A,
      beat = A.beat,
      b0 = A.beats?.[0] ?? 0,
      bph = (t - b0) / beat;
    // a dance move: his upper body from the dance (about his hips), his legs running on, eased in and out over a beat;
    // the take retimed so its keypose (where the hands stop) lands on its middle beat, and held a moment on each beat
    const dn = R.dance;
    if (dn && (key === 'run' || key === 'ride') && t - dn.t0 < beat * 2) {
      const [name, f0, f1] = dn.take,
        id = dn.take.join(':');
      if (!this.keyposes.has(id)) this.keyposes.set(id, keypose(this.C[name], f0, f1));
      const fm = this.keyposes.get(id),
        u = (t - dn.t0) / (beat * 2),
        half = u < 0.5 ? hold(u * 2, 0.6) : hold(u * 2 - 1, 0.6),
        f = u < 0.5 ? f0 + (fm - f0) * half : fm + (f1 - fm) * half,
        D = frameOf(this.C[name], f),
        w = Math.min(ease(u * 4), ease((1 - u) * 4));
      J = Float32Array.from(J);
      // (joints 0-9: hips, chest, neck, head, both arms)
      for (let k = 2; k < 20; k++) J[k] += (D[k] - D[k % 2] + J[k % 2] - J[k]) * w;
      c.dance = true;
    }
    // a golden beat with nothing to do on it (goldBeats): a pose struck on the beat and held a moment, his upper body from
    // a dance's keypose, eased in over half a beat; and every fourth bar, if it is free, a pose of his own for a bar
    // (Pizza Tower's taunts, a look back, a dancer's stop): the run never stops under them
    this.face = null;
    if (key === 'run' && !c.dance) {
      const g = goldNear(A, t, beat * 0.9),
        bar = Math.floor((bph - (A.bar0 ?? 0)) / 4),
        barT = (A.beats?.[0] ?? 0) + ((A.bar0 ?? 0) + bar * 4) * beat,
        free = (t0, t1) => !R.jump && !R.slide && !R.strike && !obsIn(L, t0 - beat * 0.5, t1 + beat * 0.5).length;
      let pose = null,
        w = 0;
      if (g !== null && free(g - beat, g + beat)) {
        pose = POSES[goldBeats(A).indexOf(g) % POSES.length];
        w = Math.min(ease((t - (g - beat * 0.6)) / (beat * 0.6)), 1 - ease((t - (g + beat * 0.5)) / (beat * 0.4)));
        this.face = 'front';
      } else if (bar % 4 === 2 && free(barT, barT + 4 * beat) && R.L.modeAt?.(t) !== 'ride') {
        // (a taunt played through the bar, or a dancer's stop held)
        const u = (t - barT) / (4 * beat),
          fl = FLOURISHES[(bar * 7) % FLOURISHES.length];
        pose = fl.length > 2 ? [fl[0], fl[1] + (fl[2] - fl[1]) * u] : fl;
        w = Math.min(ease(u * 4), ease((1 - u) * 4)) * 0.85;
      }
      if (pose && w > 0) {
        const D = frameOf(this.C[pose[0]], pose[1]);
        J = Float32Array.from(J);
        for (let k = 2; k < 20; k++) J[k] += (D[k] - D[k % 2] + J[k % 2] - J[k]) * w;
        c.dance = true;
      }
    }
    // a clumsy move (pressed well off the beat): his arms windmill and he wobbles
    const clumsy = R.jump?.clumsy || R.slide?.clumsy || R.strike?.clumsy;
    if (clumsy) {
      J = Float32Array.from(J);
      for (const [sh, el, ha, ph] of [[JI.shL, JI.elL, JI.haL, 0], [JI.shR, JI.elR, JI.haR, Math.PI]]) {
        const a = Math.sin(t * 22 + ph) * 1.4,
          cs = Math.cos(a),
          sn = Math.sin(a),
          px = J[sh * 2],
          py = J[sh * 2 + 1];
        for (const j of [el, ha]) {
          const dx = J[j * 2] - px,
            dy = J[j * 2 + 1] - py;
          J[j * 2] = px + dx * cs - dy * sn;
          J[j * 2 + 1] = py + dx * sn + dy * cs;
        }
      }
      J = turn(J, 0.15 * Math.sin(t * 13), J[0], J[1]);
    }
    // a hit: pitched forward (tripped) or back (a bar in the chest), and he runs on out of it
    const st = R.stumble;
    if (st && t - st.t0 < 0.5) {
      const u = (t - st.t0) / 0.5;
      J = turn(J, st.dir * 0.9 * Math.sin(u * Math.PI) * (1 - u), 0, 0);
    }
    // ---- as a rig: the change of clip inertialized (the offset from the last pose shown, and its velocity, decaying on a
    // critically damped spring: the old motion carries on into the new and nothing pops)
    const rig = toRig(J),
      dtt = this.dt;
    if (this.prev && key !== this.key) {
      // (the feet are blended where they are, not by turning the legs: turned, a planted foot would sweep an arc across
      // the roof as the legs turn out of a flip)
      this.footOff = [JI.ftL, JI.ftR].map(ft => [this.out[ft * 2] - J[ft * 2], this.out[ft * 2 + 1] - J[ft * 2 + 1], 0, 0]);
      this.off = new Float64Array(RIG);
      this.offV = new Float64Array(RIG);
      for (let i = 0; i < RIG; i++) {
        const isA = i >= 2 && i % 2 === 0;
        this.off[i] = isA ? wrap(this.prev[i] - rig[i]) : this.prev[i] - rig[i];
        // (the old pose's velocity, capped: a flip's spin is not carried into a run)
        this.offV[i] = clamp(this.vel[i], isA ? -4 : -2, isA ? 4 : 2);
      }
      // (a big turn of the body out of a flip or a roll takes longer than a small one)
      let turnBy = 0;
      if (/^(jump|roll|slide|swing)/.test(this.key)) for (let b = 0; b < NB; b++) turnBy = Math.max(turnBy, Math.abs(this.off[2 + b * 2]));
      this.hl = Math.min(0.1, blendHL(key) * (1 + turnBy / Math.PI));
    }
    this.key = key;
    if (this.off) {
      let big = 0;
      for (let i = 0; i < RIG; i++) {
        if (dtt) decayAt(this.off, i, this.offV, i, this.hl, dtt);
        rig[i] += this.off[i];
        big = Math.max(big, Math.abs(this.off[i]));
      }
      if (big < 1e-3) this.off = null;
    }
    if (this.footOff && dtt)
      for (const fo of this.footOff) {
        decayAt(fo, 0, fo, 2, this.hl, dtt);
        decayAt(fo, 1, fo, 3, this.hl, dtt);
      }
    // the feet where the clips put them (before the layers move the body: IK puts them back)
    const ground = GROUND.test(key) && R.mode !== 'dead',
      F0 = fromRig(rig);
    // ---- the music in his body (AudioLink's bands on body parts, each a moment behind the last up the chain): the kick
    // in his knees, the snare in his chest and then his head, the hats in his hands, the bass a sway; a build crouches him
    // tense, the drop's first beat throws his arms open; how much, by the section and the song (a hard song hits sharp,
    // a chill one sways)
    const mfAt = fxOf(L),
      P = L.profile ?? { hardness: 0.3, chill: 0.3 };
    let dip = 0;
    if (mfAt && (ground || c.lag === 'fly')) {
      const H = this.mHist ?? [],
        m0 = mNow ?? mfAt(t),
        m1 = H[4] ?? m0,
        m2 = H[7] ?? m0,
        E = m0.amp * (0.65 + 0.6 * P.hardness - 0.25 * P.chill),
        calm = c.strike ? 0.35 : 1,
        hu = ((bph % 1) + 1) % 1,
        // (how clear the pulse is in this bar scales the whole body's bounce; the hats' brightness the head and the hands;
        // the bass his weight: Burger et al. 2013, what in music moves which part of a dancer)
        clar = 0.5 + clarityAt(L.A, t),
        groove = clar * (0.5 + 0.5 * Math.cos(TAU * hold(hu, sty.hold))),
        a = (b, x) => (rig[2 + b * 2] += x);
      // (on the board he rides low, knees bent, and bobs deeper on the beat; a build sinks him lower, the inhale)
      dip = E * calm * (0.035 * m0.kick + (c.ride || c.bob ? 0.06 * groove + 0.08 * m0.build : 0.012 * groove)) + (c.ride || c.bob ? 0.07 : 0);
      a(BN.spine, -E * calm * (0.05 * m1.snare + 0.04 * m0.build + 0.03 * m0.bass * Math.sin(Math.PI * bph * 0.5)));
      a(BN.head, -E * calm * (0.14 * m2.snare + 0.04 * groove + 0.05 * m2.hat * Math.sin(TAU * bph)));
      dip += 0.02 * E * m0.bass;
      const hat = (Math.floor(bph * 2) % 2 ? 1 : -1) * 0.12 * E * calm * m2.hat * (1 - P.chill);
      a(BN.loL, hat);
      a(BN.loR, -hat);
      // (the drop's first beats: arms flung open, out of a run or a stance, not out of a strike or a dance)
      if (!c.strike && !c.dance && c.lag !== 'fly') {
        const open = m0.drop ** 6 * E;
        a(BN.upL, open * 1.1);
        a(BN.loL, open * 0.6);
        a(BN.upR, -open * 1.4);
        a(BN.loR, -open * 0.8);
        // (the build: arms drawn in, shoulders up, the inhale)
        const tense = m0.build * E * 0.25;
        a(BN.upL, -tense);
        a(BN.upR, tense);
      }
      // (flying: his legs kick slowly in turn on the half bar, the knees bending his feet up behind him, and his chest leads
      // into a climb or a dive, so his body arcs along the way he goes)
      if (c.lag === 'fly' && R.fly) {
        const fl = Math.sin(Math.PI * bph * 0.5);
        a(BN.shinL, -(0.22 + 0.18 * fl) * (0.6 + 0.4 * E));
        a(BN.shinR, -(0.22 - 0.18 * fl) * (0.6 + 0.4 * E));
        a(BN.spine, clamp((R.vy ?? 0) * 0.05, -0.2, 0.2));
      }
      // (a beat before the next thing in his way: his head comes round to it, the cue in his body)
      const o = this.next(R, t);
      if (o && c.lag !== 'fly') a(BN.head, -0.12 * (1 - clamp((o.t - t) / beat)));
      rig[1] -= dip;
    }
    // ---- the board: kicked, tucked, flipped, landed, its nose up as he climbs; it slides under him on a spring
    if (c.ride) {
      if (dtt) spring(this.bs, BOARD.x + (c.free ? (c.free === 'L' ? -0.12 : 0.12) : 0), 0.06, dtt);
      else this.bs.x = BOARD.x;
      let by = BOARD.y,
        ba = clamp(-(R.vy ?? 0) * 0.02, -0.2, 0.2),
        flip = 0,
        lift = 0,
        byaw = 0;
      this.spin = null;
      if (c.ollie) {
        const u = c.ollie.u;
        ba += u < 0.12 ? 0.4 * ease(u / 0.12) : u < 0.45 ? 0.4 * (1 - ease((u - 0.12) / 0.33)) : u < 0.85 ? -0.12 * ease((u - 0.45) / 0.4) : -0.12 * (1 - ease((u - 0.85) / 0.15));
        lift = 0.28 * Math.sin(Math.PI * u) ** 1.5;
        by += lift;
        // (crouched deep as he kicks off, stretched up at the top, crouched again to take the landing)
        rig[1] -= 0.24 * (1 - Math.sin(Math.PI * u)) ** 1.5;
        if (c.ollie.flip) flip = TAU * ease((u - 0.15) / 0.5);
        // (a trick of his own: its turns over the flight, done by the time he lands; a spin of him leans into it)
        const k = BT[c.ollie.trick];
        if (k) {
          const e = ease((u - 0.1) / 0.62);
          flip = (k.roll ?? 0) * e;
          byaw = (k.byaw ?? 0) * e;
          this.spin = { yaw: (k.yaw ?? 0) * e, pitch: (k.pitch ?? 0) * e };
          // (a flip of him tucks him tight, a spin stretches his arms round)
          if (k.pitch) rig[1] -= 0.15 * Math.sin(Math.PI * u);
        }
      }
      if (c.btrick) {
        const { kind, u } = c.btrick,
          // (into it and out of it over a sixth of it each)
          w = Math.min(ease(u * 6), ease((1 - u) * 6));
        const to = (b, ang, k = w) => (rig[2 + b * 2] += wrap(ang - rig[2 + b * 2]) * k);
        if (kind === 'manual' || kind === 'nose') {
          // (balanced on its tail (or its nose), leaning the other way over it, arms wide, the beat rocking him)
          const up = kind === 'manual' ? 1 : -1;
          ba += up * 0.38 * w;
          by += 0.1 * w;
          to(BN.spine, -0.35 * up);
          to(BN.upL, -1.2);
          to(BN.upR, Math.PI + 1.2);
        } else if (kind === 'slide') {
          // (the board slung sideways across his way, sparks off it, him sat back low against it)
          byaw = 1.45 * w;
          rig[1] -= 0.25 * w;
          to(BN.spine, -0.3);
          this.sparks = w > 0.5;
        } else if (kind === 'duckspin') this.spin = { yaw: TAU * ease(clamp((u - 0.1) / 0.75)), pitch: 0 };
      }
      if (c.duck) {
        // (folded down over the board: hips sunk, his back pitched forward nearly flat, head down, arms out low for
        // balance; his head under 0.9 m, the things he slides under hang at 1 m)
        rig[1] -= 0.55;
        const to = (b, ang) => (rig[2 + b * 2] += wrap(ang - rig[2 + b * 2]));
        to(BN.spine, 0.7);
        to(BN.neck, 0.45);
        to(BN.head, 0.3);
        to(BN.upL, -0.2);
        to(BN.loL, 0.1);
        to(BN.upR, Math.PI + 0.3);
        to(BN.loR, Math.PI);
      }
      this.board = { x: this.bs.x, y: by, a: ba, flip, yaw: byaw, sparks: c.btrick?.kind === 'slide' && this.sparks };
    } else ((this.board = null), (this.spin = null));
    // ---- the changes of mode on the beat (Sayonara Wild Hearts): he hops up onto the board as the ride starts (it
    // appears under his feet as they come down, hero.js); as the boss comes in he shakes a fist at it for two beats
    if (L.acts) {
      const a = L.acts.find(q => Math.abs(t - q.t0) < beat);
      if (a?.mode === 'ride' && ground) {
        const u = (t - (a.t0 - beat * 0.5)) / beat;
        if (u > 0 && u < 1) rig[1] += 0.45 * Math.sin(Math.PI * u);
      }
      const b = L.acts.find(q => q.mode === 'boss' && t >= q.t0 && t < q.t0 + 2 * beat);
      if (b && key === 'run') {
        const w = Math.min(1, (t - b.t0) / (beat * 0.3), (b.t0 + 2 * beat - t) / (beat * 0.3));
        rig[2 + BN.upR * 2] += wrap(1.2 - rig[2 + BN.upR * 2]) * w;
        rig[2 + BN.loR * 2] += wrap(1.6 + 0.25 * Math.sin(t * 30) - rig[2 + BN.loR * 2]) * w;
        this.face = 'angry';
      }
    }
    // (the fourth wall: he looks out at the player in the bar before a drop, and glares after he is hit; hero.js draws
    // the face)
    if (mfAt) {
      const m = mNow ?? mfAt(t);
      if (m.toDrop > 0 && m.toDrop < beat * 2 && ground) this.face = 'front';
    }
    if (t - (R.hitT ?? -9) < 0.7) this.face = 'angry';
    // ---- he knows he is played (the game's lore: someone is behind the system that builds his trials, and he wants to
    // know who): his gestures at the player, each over a beat or so, never under a move
    this.gesture(R, t, s, rig, key, c, ground);
    // ---- a strike thrown low (sliding, ducked on the board): the lead arm punched straight out ahead at the contact
    if (c.lowStrike && R.strike) {
      const st = R.strike,
        us = (t - st.t0) / st.dur,
        w = Math.min(ease(us / (st.take[3] * 0.4)), 1 - ease((us - st.take[3] - 0.1) / 0.3));
      rig[2 + BN.upR * 2] += wrap(0.05 - rig[2 + BN.upR * 2]) * w;
      rig[2 + BN.loR * 2] += wrap(0 - rig[2 + BN.loR * 2]) * w;
    }
    // ---- a clone coming up behind him: he hunches, head pulled down between his shoulders, arms drawn in, bracing for
    // the blow, and his eyes slide back to it (hero.js) without his head turning
    this.glance = 0;
    if (ground && !c.strike && L.obs) {
      const o = obsIn(L, t - 0.05, t + 1.6 * beat).find(q => q.type === 'foeback' && !q.res);
      if (o) {
        const w = ease(1 - (o.t - t) / (1.6 * beat));
        this.glance = w;
        rig[2 + BN.neck * 2] += wrap(rig[2 + BN.spine * 2] - 0.55 - rig[2 + BN.neck * 2]) * 0.6 * w;
        rig[2 + BN.head * 2] += wrap(rig[2 + BN.spine * 2] - 0.5 - rig[2 + BN.head * 2]) * 0.6 * w;
        rig[2 + BN.spine * 2] -= 0.12 * w;
        rig[2 + BN.clL * 2] += 0.25 * w;
        rig[2 + BN.clR * 2] -= 0.25 * w;
        rig[1] -= 0.05 * w;
      }
    }
    // ---- the line of action (the one curve through head, spine and standing leg that a stick figure reads by): bowed
    // back against a blow as it winds up, a straight diagonal into it at the contact; a C crouched into a take-off and a
    // landing, straight and stretched at the top of a jump
    {
      const a = (b, x) => (rig[2 + b * 2] += x),
        straight = (k, b) => (rig[2 + b * 2] += wrap(rig[2 + BN.spine * 2] - rig[2 + b * 2]) * k),
        w = sty.loa;
      if (c.strike && R.strike) {
        const k = R.strike.take,
          u = (t - R.strike.t0) / R.strike.dur,
          dir = (k[4] ?? '').startsWith('turn') ? -1 : 1;
        if (u < k[3]) {
          const arch = Math.sin((Math.PI * u) / k[3]) * w * dir;
          a(BN.spine, 0.14 * arch);
          a(BN.neck, 0.12 * arch);
          a(BN.head, 0.1 * arch);
        } else if (u < k[3] + 0.3) {
          const hit = (1 - (u - k[3]) / 0.3) * w;
          a(BN.spine, -0.16 * hit * dir);
          straight(0.6 * hit, BN.neck);
          straight(0.6 * hit, BN.head);
        }
      }
      if (R.jump && c.lag === 'air') {
        const u = clamp((t - R.jump.t0) / R.jump.air),
          top = Math.sin(Math.PI * u) ** 2 * w;
        straight(0.5 * top, BN.neck);
        straight(0.5 * top, BN.head);
        if (u < 0.15) a(BN.spine, -0.2 * (1 - u / 0.15) * w);
      }
      const since = t - (c.squash ?? Math.max(R.landing?.t0 ?? -9, R.landT ?? -9));
      if (ground && since >= 0 && since < 0.15) a(BN.spine, -0.12 * (1 - since / 0.15) * w);
    }
    // ---- each bone lagging its parent (overlap, follow-through), held within reach of the clip's pose
    const lag = LAG[c.lag] ?? LAG.ground;
    if (!this.lag) this.lag = Array.from({ length: NB }, () => ({ x: 0, v: 0, on: false }));
    // (each bone's goal is its parent's lagged angle plus the clip's angle between them, so a parent's lag carries into
    // its children and the chain whips)
    const clip = (this.clipBuf ??= new Float64Array(RIG));
    clip.set(rig);
    for (let b = 0; b < NB; b++) {
      const sp = this.lag[b],
        i = 2 + b * 2,
        par = PARENT[b],
        goal = par < 0 ? clip[i] : rig[2 + par * 2] + wrap(clip[i] - clip[2 + par * 2]),
        hl = lag[b] * (c.strike ? 0.4 : 1);
      if (!hl || !dtt || !sp.on) {
        sp.x = goal;
        sp.v = 0;
        sp.on = true;
        rig[i] = goal;
        continue;
      }
      spring(sp, sp.x + wrap(goal - sp.x), hl, dtt);
      const dev = wrap(sp.x - goal),
        mx = c.lag === 'fly' ? 0.9 : 0.5;
      if (Math.abs(dev) > mx) sp.x = goal + Math.sign(dev) * mx;
      rig[i] = sp.x;
    }
    let out = fromRig(rig);
    // ---- the feet put back where they stand (two-bone IK: hip, knee, ankle), the toes along the ground, or on the board
    if (ground) {
      const bd = this.board;
      for (const side of ['L', 'R']) {
        if (c.free === side) continue;
        const hi = JI['hi' + side],
          kn = JI['kn' + side],
          ft = JI['ft' + side],
          to = JI['to' + side];
        const fo = this.footOff?.[side === 'L' ? 0 : 1];
        let tx = J[ft * 2] + (fo?.[0] ?? 0),
          ty = J[ft * 2 + 1] + (fo?.[1] ?? 0),
          toeA = Math.atan2(F0[to * 2 + 1] - F0[ft * 2 + 1], F0[to * 2] - F0[ft * 2]);
        if (bd) {
          // (on the board: the left foot ahead, the right behind, ankles over it, toes along it; tucked up off it in a flip)
          const along = side === 'L' ? BOARD.half : -BOARD.half,
            ca = Math.cos(bd.a),
            sa = Math.sin(bd.a),
            tuck = bd.flip ? 0.18 * Math.sin(Math.min(Math.PI, bd.flip / 2)) : 0;
          tx = bd.x + along * ca - (BOARD.ankle + tuck) * sa;
          ty = bd.y + along * sa + (BOARD.ankle + tuck) * ca;
          toeA = bd.a;
        } else {
          // (a foot up in the air in the clip goes with his hips, one on the roof stays where it is: eased between, so a
          // foot coming down is never snatched from one to the other)
          const up = clamp((ty - 0.1) / 0.25);
          tx += (out[0] - F0[0]) * up;
          ty += (out[1] - F0[1]) * up;
        }
        // (never under the roof, whatever the filter's overshoot)
        ty = Math.max(ty, 0.06);
        const l1 = this.leg.thigh,
          l2 = this.leg.shin,
          lt = Math.hypot(F0[to * 2] - F0[ft * 2], F0[to * 2 + 1] - F0[ft * 2 + 1]),
          cross = (F0[kn * 2] - F0[hi * 2]) * (F0[ft * 2 + 1] - F0[kn * 2 + 1]) - (F0[kn * 2 + 1] - F0[hi * 2 + 1]) * (F0[ft * 2] - F0[kn * 2]),
          [a1, a2] = ik2(out[hi * 2], out[hi * 2 + 1], tx, ty, l1, l2, bd ? -1 : this.bendOf(side, cross));
        out[kn * 2] = out[hi * 2] + Math.cos(a1) * l1;
        out[kn * 2 + 1] = out[hi * 2 + 1] + Math.sin(a1) * l1;
        out[ft * 2] = out[kn * 2] + Math.cos(a2) * l2;
        out[ft * 2 + 1] = out[kn * 2 + 1] + Math.sin(a2) * l2;
        out[to * 2] = out[ft * 2] + Math.cos(toeA) * lt;
        out[to * 2 + 1] = out[ft * 2 + 1] + Math.sin(toeA) * lt;
      }
    }
    // ---- the sweep on the board: the front leg kicked out straight and low ahead (two-bone IK from the hip), out fast,
    // held through the contact, drawn back in at the end
    if (c.sweep !== undefined) {
      // (aimed at the clone's shins, as far as the leg reaches)
      const w = c.sweep,
        hi = JI.hiL,
        reach = c.sweepO ? clamp(c.sweepO.x - R.heroX(t) + out[0] - out[hi * 2], 0.4, this.leg.thigh + this.leg.shin - 0.05) : 0.9,
        tx = out[hi * 2] + 0.15 + (reach - 0.15) * w,
        ty = Math.max(0.12, out[hi * 2 + 1] - 0.25),
        [a1, a2] = ik2(out[hi * 2], out[hi * 2 + 1], tx, ty, this.leg.thigh, this.leg.shin, -1),
        lt = Math.hypot(out[JI.toL * 2] - out[JI.ftL * 2], out[JI.toL * 2 + 1] - out[JI.ftL * 2 + 1]);
      out[JI.knL * 2] = out[hi * 2] + Math.cos(a1) * this.leg.thigh;
      out[JI.knL * 2 + 1] = out[hi * 2 + 1] + Math.sin(a1) * this.leg.thigh;
      out[JI.ftL * 2] = out[JI.knL * 2] + Math.cos(a2) * this.leg.shin;
      out[JI.ftL * 2 + 1] = out[JI.knL * 2 + 1] + Math.sin(a2) * this.leg.shin;
      out[JI.toL * 2] = out[JI.ftL * 2] + lt;
      out[JI.toL * 2 + 1] = out[JI.ftL * 2 + 1];
    }
    // ---- a vault: both hands planted on the box's top as he passes over it (two-bone IK, shoulder, elbow, hand)
    if (c.ctx?.kind === 'vault' && R.jump && c.ctx.o) {
      const o = c.ctx.o,
        u = clamp((t - R.jump.t0) / R.jump.air),
        w = u > 0.2 && u < 0.62 ? Math.sin((Math.PI * (u - 0.2)) / 0.42) : 0;
      // (the run's arc clears 1.5 m, the box is 0.7: over it he is brought down so his hips pass just over its top and
      // his hands can reach it; take-off and landing untouched)
      const top = (o.y ?? s.y0) + o.h - R.y,
        drop = Math.min(0, top + 0.6 - out[1]) * Math.sin(Math.PI * u);
      for (let k = 1; k < out.length; k += 2) out[k] += drop;
      if (w > 0) {
        const tx = o.x - R.heroX(t) + out[0],
          ty = top;
        for (const [sh, el, ha, dx] of [[JI.shL, JI.elL, JI.haL, -0.08], [JI.shR, JI.elR, JI.haR, 0.08]]) {
          const l1 = Math.hypot(out[el * 2] - out[sh * 2], out[el * 2 + 1] - out[sh * 2 + 1]),
            l2 = Math.hypot(out[ha * 2] - out[el * 2], out[ha * 2 + 1] - out[el * 2 + 1]),
            [a1, a2] = ik2(out[sh * 2], out[sh * 2 + 1], tx + dx, ty, l1, l2, 1),
            ex = out[sh * 2] + Math.cos(a1) * l1,
            ey = out[sh * 2 + 1] + Math.sin(a1) * l1;
          out[el * 2] += (ex - out[el * 2]) * w;
          out[el * 2 + 1] += (ey - out[el * 2 + 1]) * w;
          out[ha * 2] += (ex + Math.cos(a2) * l2 - out[ha * 2]) * w;
          out[ha * 2 + 1] += (ey + Math.sin(a2) * l2 - out[ha * 2 + 1]) * w;
        }
      }
    }
    // ---- a kick in the air at a clone below: his whole body turned (a dive kick) so the kicking foot points at its chest
    if (c.aim && c.aim.w > 0) {
      const o = c.aim.o,
        tx = o.x - R.heroX(t) + out[0],
        ty = s.y0 + 1.1 - R.y,
        hx = out[0],
        hy = out[1],
        toe = c.aim.toe,
        want = Math.atan2(ty - hy, tx - hx),
        has = Math.atan2(out[toe * 2 + 1] - hy, out[toe * 2] - hx),
        a = clamp(wrap(want - has), -1.3, 1.3) * ease(c.aim.w * 1.6),
        ca = Math.cos(a),
        sa = Math.sin(a);
      for (let k = 0; k < out.length; k += 2) {
        const dx = out[k] - hx,
          dy = out[k + 1] - hy;
        out[k] = hx + dx * ca - dy * sa;
        out[k + 1] = hy + dx * sa + dy * ca;
      }
      // (and brought down onto it: from the top of a jump a leg does not reach a clone's chest, so he dives at it, the
      // foot arriving where it is struck, and is carried back up into his arc after)
      const ew = ease(c.aim.w * 1.4),
        mx = clamp((tx - out[toe * 2]) * ew, -0.6, 0.6),
        my = clamp((ty - out[toe * 2 + 1]) * ew, -1.3, 0.3);
      for (let k = 0; k < out.length; k += 2) {
        out[k] += mx;
        out[k + 1] += my;
      }
    }
    // ---- squash and stretch (volume kept: taller is thinner): squashed as he takes off, stretched rising, squashed on
    // landing and bouncing back; about his feet on the ground, his hips in the air
    let sq = 0;
    if (R.jump) {
      const tau = t - R.jump.t0;
      sq += tau < 0.05 ? -0.07 * Math.sin((Math.PI * tau) / 0.05) : 0.06 * Math.sin(Math.PI * clamp((tau - 0.05) / 0.22));
    }
    const landAt = c.squash ?? Math.max(R.landing?.t0 ?? -9, R.landT ?? -9);
    sq += bounce(t - landAt, -0.1);
    if (R.strike && !c.ride) sq += bounce(t - (R.strike.t0 + R.strike.take[3] * R.strike.dur), 0.05, 0.2, 0.05);
    if (Math.abs(sq) > 1e-3 && R.mode !== 'dead') {
      const s1 = 1 + sq,
        sx = 1 / Math.sqrt(s1),
        py = ground ? 0 : out[1],
        px = out[0];
      // (on the ground the thinning grows with the height over the roof: the feet keep their place)
      for (let k = 0; k < out.length; k += 2) {
        out[k] = px + (out[k] - px) * (ground ? 1 + (sx - 1) * clamp(out[k + 1] / 0.9) : sx);
        out[k + 1] = py + (out[k + 1] - py) * s1;
      }
    }
    // ---- the cape: a rope from his neck (Verlet, a fixed step: the same run draws the same cape), blown back by the air he
    // flies through and swinging as he climbs and dives
    this.capeStep(R, t, out);
    // (what the next change of clip carries on from: the rig shown and its velocity)
    const shown = toRig(out);
    if (this.prev && dtt) for (let i = 0; i < RIG; i++) this.vel[i] = (i >= 2 && i % 2 === 0 ? wrap(shown[i] - this.prev[i]) : shown[i] - this.prev[i]) / dtt;
    this.prev = shown;
    this.out = out;
    // ---- on twos (Spider-Verse, Guilty Gear: each pose held for a few frames, the world going on smoothly round him, so
    // every pose reads like a panel): the slots on the beat's grid, a fresh pose on each change of clip; on the ground
    // only his upper body holds (his feet stay planted where they are), in the air all of him about his hips
    const fps = c.lag === 'fly' ? 60 : c.strike ? sty.fps * 0.6 : sty.fps;
    if (fps >= 59 || !dtt || R.mode === 'dead') {
      this.held = null;
      return out;
    }
    const slot = Math.floor((t - b0) / (beat / Math.max(1, Math.round(beat * fps))));
    if (!this.held || this.held.slot !== slot || this.held.key !== key) {
      const rel = new Float32Array(out.length);
      for (let k = 0; k < out.length; k++) rel[k] = out[k] - out[k % 2];
      this.held = { slot, key, rel };
      return out;
    }
    const disp = Float32Array.from(out),
      last = ground ? 20 : out.length;
    for (let k = 2; k < last; k++) disp[k] = out[k % 2] + this.held.rel[k];
    return disp;
  }
  // the gestures at the player: a nod (10 in a row), a wink (25), a finger pointed out of the screen (50); a glance at the
  // player after a press well off the beat; hands over his ears when the keys are hammered at nothing; hit, a finger at
  // what hit him and then at the player; a glance at the player as another try starts, and a finger at the place he died
  // last time a beat before it comes (memory.js); a glance as each order of the system's comes up (render/layers/system.js)
  gesture(R, t, s, rig, key, c, ground) {
    const L = R.L,
      beat = L.A.beat,
      free = ground && !c.strike && !c.dance && !R.jump && !R.slide && /^(run|ride)/.test(key),
      a = (b, x) => (rig[2 + b * 2] += x),
      to = (b, ang, w) => (rig[2 + b * 2] += wrap(ang - rig[2 + b * 2]) * w),
      bell = (t0, d) => (t < t0 || t > t0 + d ? 0 : Math.sin((Math.PI * (t - t0)) / d)),
      pointOut = w => {
        // (his arm straight out toward the screen, slightly down: at the player)
        to(BN.upR, -0.25, w);
        to(BN.loR, -0.15, w);
      },
      pointBack = w => {
        to(BN.upR, Math.PI - 0.3, w);
        to(BN.loR, Math.PI - 0.1, w);
      };
    // (the streak's tiers: each step up remembered once, from its time on)
    if (R.tier > (this.tierSeen ?? 0)) this.tierUp = { tier: R.tier, t0: t };
    this.tierSeen = R.tier;
    // (held back until he is free to make it: the first free moment within three seconds)
    const up = this.tierUp;
    if (up && up.s === undefined && free && t - up.t0 < 3) up.s = t;
    if (up?.s !== undefined && t - up.s < beat * 1.2) {
      const w = bell(up.s, beat * 1.2);
      if (up.tier === 1) a(BN.head, -0.4 * w), (this.face = 'front');
      else if (up.tier === 2) this.face = 'wink';
      else pointOut(w), (this.face = 'front');
    }
    const clumsy = R.jump?.clumsy ? R.jump.t0 : R.slide?.clumsy ? R.slide.t0 : R.strike?.clumsy ? R.strike.t0 : null;
    if (clumsy !== null && t - clumsy > 0.15 && t - clumsy < 0.6) this.face = 'front';
    // (hammered keys: four presses in 0.6 s with nothing there to press for)
    const pr = R.presses ?? [],
      ps = [];
    for (let i = pr.length - 1; i >= 0 && t - pr[i].t < 0.6; i--) ps.push(pr[i]);
    if (ps.length >= 4 && !ps.some(p => obsIn(L, p.t - 0.25, p.t + 0.25).length)) this.spamT = t;
    if (t - (this.spamT ?? -9) < 0.8 && free) {
      const w = Math.min(1, (t - this.spamT) / 0.1, (0.8 - (t - this.spamT)) / 0.2);
      to(BN.upL, 1.3, w);
      to(BN.loL, 2.6, w);
      to(BN.upR, 1.85, w);
      to(BN.loR, 0.55, w);
      this.face = 'annoyed';
    }
    // (hit: a finger back at what did it, then out at the player)
    const hit = t - (R.hitT ?? -9);
    if (hit > 0.15 && hit < 0.95 && free) {
      if (hit < 0.55) pointBack(bell(R.hitT + 0.15, 0.4));
      else pointOut(bell(R.hitT + 0.55, 0.4)), (this.face = 'front');
    }
    const mem = R.memory;
    if (mem) {
      // (another try: a look at the player as it starts)
      if (mem.runs > 0 && t > 1 && t < 1.7) this.face = 'front';
      // (the place he died last time, coming: a finger at it, a look at the player)
      const d = mem.deaths.find(x => x - t > 0 && x - t < 2 * beat);
      if (d !== undefined && free) {
        const u = (t - (d - 2 * beat)) / (2 * beat);
        if (u < 0.5) pointOut(bell(d - 2 * beat, beat)), (this.face = 'front');
      }
    }
    // (an order of the system's coming up on the screen: he looks out at the player, as if the player had given it)
    const ac = orderAt(L, t);
    if (ac && free && t > ac.t0 - beat && t < ac.t0 - 0.25 * beat) this.face = 'front';
    void s;
  }
  // how he moves now: how far into the cartoon filter (toon), how hard the body stops on each beat (hold), how many poses a
  // second he holds (fps, on twos), how bent the line of action (loa); a calm part floats and flows, a verse dabs, a build
  // presses, a drop slashes; a hard song snaps, a chill one stays smooth (Laban's efforts, EMOTE)
  style(R, m) {
    const P = R.L.profile ?? { hardness: 0.3, chill: 0.3 },
      amp = m?.amp ?? 0.6,
      e = clamp((amp - 0.35) / 0.65);
    return {
      toon: clamp(0.2 + 0.6 * e + 0.3 * P.hardness - 0.3 * P.chill, 0, 1),
      hold: clamp(0.2 + 0.45 * e + 0.2 * P.hardness - 0.15 * P.chill, 0.1, 0.8),
      fps: P.chill > 0.55 ? 60 : amp >= 1 ? 20 : P.hardness > 0.45 ? 24 : 30,
      loa: 0.4 + 0.6 * e,
    };
  }
  // a leap down a ladder of islands (level.js ladder), the clips time-warped onto its flight so the take-off is the
  // press, the touch the beat: off the edge in a running long jump's stride (running_jump, from the push off to the
  // split), the legs cycling through in the air while it lasts (a hitch kick: the split swapped leg for leg and arm for
  // arm, once in a short flight, twice in a long one), then the legs drawn up and reaching down for the island
  // (falling_roll_b, from the tuck to the touch, its feet on it on the beat). The clips' own rise taken out: his hips
  // ride the flight's arc. Run off the edge unpressed: a stumble off its lip into the same tuck and reach, his arms
  // flailing (the clumsy move's)
  leapFlight(R, t, j, base) {
    const C = this.C,
      c = this.c,
      tau = t - j.t0,
      u = clamp(tau / j.air),
      // (his hips that high over his feet's arc: the take-off's, then the touch's)
      hip = (F, h) => lower(F, F[1] - h),
      reach = v => hip(frameOf(C.falling_roll_b, 4 + 25 * v ** 1.8), 1.0 - 0.05 * v),
      // (the hitch kick: a stride turned leg for leg and arm for arm)
      swap = F => {
        const S = Float32Array.from(F);
        for (const [l, r] of [[JI.shL, JI.shR], [JI.elL, JI.elR], [JI.haL, JI.haR], [JI.hiL, JI.hiR], [JI.knL, JI.knR], [JI.ftL, JI.ftR], [JI.toL, JI.toR]])
          for (const k of [0, 1]) [S[l * 2 + k], S[r * 2 + k]] = [F[r * 2 + k], F[l * 2 + k]];
        return S;
      };
    c.lag = 'air';
    if (j.fell) {
      // (off the lip: the run giving way to the tuck over a fifth of the fall, then the reach)
      const P = u < 0.2 ? mixPose(base, reach(0), ease(u / 0.2)) : reach((u - 0.2) / 0.8);
      return ['leap:fell', P];
    }
    const take = v => hip(frameOf(C.running_jump, 2 + 14 * v), 0.98 + 0.1 * Math.sin(Math.PI * v)),
      n = Math.max(1, Math.round((0.32 * j.air) / 0.3)),
      A = 0.28,
      B = 0.62;
    // (up a ladder, thrown off a trampoline: the push off it (the stride's take-off, quicker: a fifth of the flight),
    // then, a long flight, a front flip over the top (front_flip's own, from its tuck to its opening) or, a short one,
    // the hitch kick; then the reach down for the island, its feet on it on the beat)
    if (j.leap?.asc && j.air >= 0.7) {
      const A2 = 0.2,
        B2 = 0.72;
      let Q;
      if (u < A2) Q = take(u / A2);
      else if (u < B2) {
        const w = (u - A2) / (B2 - A2),
          Fl = flight(C, ['front_flip', 30, 84], ease(w));
        Q = mixPose(take(1), Fl, ease(w / 0.18));
      } else {
        const w = (u - B2) / (1 - B2);
        Q = mixPose(flight(C, ['front_flip', 30, 84], 1), reach(w), ease(w / 0.35));
      }
      // (out of the crouch he bounded onto it in, below)
      const F = frameOf(C.running_jump, 2);
      return ['leap:up', tau < 0.12 ? mixPose(lower(F, F[1] - 0.86), Q, ease(tau / 0.12)) : Q];
    }
    let P;
    if (u < A) P = take(u / A);
    else if (u < B) {
      // (the legs cycled through: each swap eased in and out)
      const v = (u - A) / (B - A),
        k = Math.min(n - 1, Math.floor(v * n)),
        w = ease(v * n - k),
        S = take(1),
        from = k % 2 ? swap(S) : S,
        to = k % 2 ? S : swap(S);
      P = mixPose(from, to, w);
    } else {
      // (the last stride drawn into the tuck, then the legs reaching down for the island)
      const v = (u - B) / (1 - B),
        S = n % 2 ? swap(take(1)) : take(1);
      P = mixPose(S, reach(v), ease(v / 0.3));
    }
    return ['leap', tau < 0.15 ? mixPose(base, P, ease(tau / 0.15)) : P];
  }
  // down on an island of a ladder: rolled out of it (falling_roll_b on from the touch: the crouch, over and up, quicker
  // when the next edge is near), into the run; or, missed, landed hard (hard_landing: the knees giving, a hand down, a
  // stagger about his feet dying away), up and running again by the next edge
  stairLand(R, t, base) {
    const C = this.C,
      c = this.c,
      r = R.roll,
      d = t - r.t0,
      dur = Math.max(0.2, r.t1 - r.t0);
    if (!r.hard) {
      c.lag = 'air';
      const F = frameOf(C.falling_roll_b, Math.min(100, 29 + (71 * d) / (0.85 * dur)));
      return ['roll:ladder', mixPose(F, base, ease((d - 0.75 * dur) / (0.25 * dur)))];
    }
    c.squash = r.t0;
    const u = d / dur,
      F = turn(frameOf(C.hard_landing, Math.min(96, 3 + (93 * d) / (0.9 * dur))), 0.22 * Math.exp(-u * 3) * Math.sin(u * 14), 0, 0);
    // (the glass giving way under him: his feet through it, a step down into it and out)
    if (r.broke !== undefined) {
      const b = t - r.broke;
      lower(F, 0.3 * ease(b / 0.06) * (1 - ease((b - 0.2) / 0.3)));
    }
    return ['land:hard', mixPose(F, base, ease((d - 0.75 * dur) / (0.25 * dur)))];
  }
  // a prop (level.js): reaching down over his running legs for the thing on the roof (pick_up_item's upper body, from
  // where his hands already go down, the hand on it an eighth of a second after the press, up to his chest by the
  // half second), then carried before his chest in both hands (carrying's), bobbing with his stride, until he throws it
  propPose(R, t, base) {
    const C = this.C,
      p = R.pickup,
      held = frameOf(C.carrying, 10),
      d = p ? t - p.t0 : 9;
    let K = held,
      w = 1,
      key = 'carry';
    if (d < 0.7) {
      key = 'pick';
      const f = d < 0.12 ? 10 + (8 * d) / 0.12 : 18 + (16 * (d - 0.12)) / 0.4,
        P = frameOf(C.pick_up_item, Math.min(34, f));
      K = d > 0.4 && R.carry ? mixPose(P, held, ease((d - 0.4) / 0.3)) : P;
      w = Math.min(ease(d / 0.08), R.carry ? 1 : 1 - ease((d - 0.4) / 0.3));
    }
    const P = Float32Array.from(base);
    for (let i = 2; i < 20; i++) P[i] += (K[i] - K[i % 2] + base[i % 2] - base[i]) * w;
    // (the thing lies on the roof: his upper body bowed forward about his hips as he scoops it, so his right hand is at
    // the floor on its beat (an eighth of a second after the press), and straightens up over the next third)
    if (key === 'pick') {
      const bow = d < 0.12 ? ease(d / 0.12) : 1 - ease((d - 0.12) / 0.33),
        hx = P[0],
        hy = P[1],
        rx = P[JI.haR * 2] - hx,
        ry = P[JI.haR * 2 + 1] - hy,
        r = Math.hypot(rx, ry),
        // (the bow that takes the hand from where it is down to 0.25 m over his feet, at most 75 degrees)
        want = Math.asin(Math.max(-1, Math.min(1, (0.25 - hy) / Math.max(0.01, r)))),
        a = Math.max(0, Math.min(1.3, Math.atan2(ry, rx) - want)) * Math.max(0, bow),
        c = Math.cos(a),
        sn = Math.sin(a);
      for (let j = 1; j < 10; j++) {
        const dx = P[j * 2] - hx,
          dy = P[j * 2 + 1] - hy;
        P[j * 2] = hx + dx * c + dy * sn;
        P[j * 2 + 1] = hy - dx * sn + dy * c;
      }
    }
    // (carried, it rides his stride: a little up and down with his hips)
    if (key === 'carry') for (let j = 1; j < 10; j++) P[j * 2 + 1] += 0.02 * Math.sin((t - (R.carry?.t0 ?? 0)) * 9);
    return [key, P];
  }
  // the take a jump is shown with: the run's own, or (the same arc, the same landing) one for the thing he goes over: a
  // low box vaulted, his hands planted on it (IK); on a phrase's golden beat the top trick. Kept for the jump (this.ctx), so its landing plays the same take
  jumpTake(R, j) {
    if (this.ctx?.t0 === j.t0 && this.ctx.from === j.take) return this.ctx.take;
    const A = R.L.A,
      g = goldNear(A, j.t0 + j.air / 2, A.beat * 0.6),
      // (the box the jump was pressed for: its beat by the take-off; a long jump over a gap vaults nothing, however
      // near the next box)
      o = j.gap ? null : obsIn(R.L, j.t0 - 0.2, j.t0 + 0.2).find(q => q.type === 'jump'),
      pick = (list, x) => list[Math.floor((((Math.sin(x * 12.9898) * 43758.5453) % 1) + 1) % 1 * list.length)];
    let take = j.take,
      kind = null;
    const plain = MOVES.jumps.includes(j.take) || MOVES.flips.includes(j.take);
    if (g !== null && !TRICKS.airkick.includes(j.take)) (take = pick(TRICKS.jump[3], j.t0)), (kind = 'gold');
    else if (o && (plain || R.tier <= 1) && !o.tall && !TRICKS.airkick.includes(j.take) && (o.v ?? 0.5) < 0.6) (take = ['vault_over_box', 30, 84]), (kind = 'vault');
    this.ctx = { t0: j.t0, from: j.take, take, kind, o };
    return take;
  }
  // how many frames after a take's landing frame it stands up (its head well over its hips), at least 10
  upright(name, f0) {
    const id = name + f0;
    this.ups ??= new Map();
    if (!this.ups.has(id)) {
      const c = this.C[name];
      let f = f0;
      while (f < Math.min(c.n - 1, f0 + 40) && c.F[f][JI.head * 2 + 1] - c.F[f][1] < 0.42) f++;
      this.ups.set(id, Math.max(10, f - f0));
    }
    return this.ups.get(id);
  }
  // which way a knee bends: the clip's, kept until the clip clearly bends it the other way (a straight leg's bend flickers)
  bendOf(side, cross) {
    this.bend ??= { L: -1, R: -1 };
    if (Math.abs(cross) > 0.01) this.bend[side] = cross >= 0 ? 1 : -1;
    return this.bend[side];
  }
  // the next thing in his way not yet met (a cursor along the obstacles)
  next(R, t) {
    const obs = R.L.obs;
    if (!obs) return null;
    if (this.oi === undefined || obs[this.oi]?.t > t + 1) this.oi = 0;
    while (this.oi < obs.length && obs[this.oi].t < t) this.oi++;
    const o = obs[this.oi];
    return o && o.type !== 'ring' && o.type !== 'lane' && o.type !== 'gate' ? o : null;
  }
  capeStep(R, t, J) {
    // (not climbing: a man going up two walls by his own legs is no superhero)
    const on = R.mode !== 'dead' && (R.fly || R.hold2?.kind === 'glide' || (R.mode === 'shaft' && R.shaft === 'rise' && !R.climbPose));
    if (!on) {
      this.cape = null;
      return;
    }
    const N = 9,
      seg = 1.3 / (N - 1),
      nx = J[JI.neck * 2],
      ny = J[JI.neck * 2 + 1],
      hx = J[0],
      hy = J[1],
      d = Math.hypot(hx - nx, hy - ny) || 1;
    if (!this.cape || !this.dt) {
      this.cape = Array.from({ length: N }, (_, i) => {
        const x = nx + ((hx - nx) / d) * seg * i,
          y = ny + ((hy - ny) / d) * seg * i;
        return { x, y, px: x, py: y };
      });
      return;
    }
    const dt = this.dt,
      // (the air: he flies forward through it and up or down, so it streams back and against his climb; a flutter on top)
      vx = R.mode === 'shaft' ? 0 : R.L.vAt(t),
      vy = R.mode === 'shaft' ? 6 : R.vy ?? 0,
      ax = -vx * 9 - 2,
      ay = -vy * 9 - 3;
    for (const [i, p] of this.cape.entries()) {
      if (!i) continue;
      const fl = 6 * Math.sin(t * 17 - i * 0.9),
        x = p.x + (p.x - p.px) * 0.92 + ax * dt * dt,
        y = p.y + (p.y - p.py) * 0.92 + (ay + fl) * dt * dt;
      p.px = p.x;
      p.py = p.y;
      p.x = x;
      p.y = y;
    }
    for (let it = 0; it < 4; it++) {
      const p0 = this.cape[0];
      p0.x = p0.px = nx;
      p0.y = p0.py = ny;
      for (let i = 0; i < N - 1; i++) {
        const a = this.cape[i],
          b = this.cape[i + 1],
          dx = b.x - a.x,
          dy = b.y - a.y,
          l = Math.hypot(dx, dy) || 1e-6,
          k = (l - seg) / l;
        if (i === 0) {
          b.x -= dx * k;
          b.y -= dy * k;
        } else {
          a.x += dx * k * 0.5;
          a.y += dy * k * 0.5;
          b.x -= dx * k * 0.5;
          b.y -= dy * k * 0.5;
        }
      }
    }
  }
}
