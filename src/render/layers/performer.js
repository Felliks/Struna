// The song's performer: a hologram of the simulation's singer, huge and far off in the sky, dancing to the song (a
// captured dance, its steps put on the song's beats), bright while the voice sings and faint between, a new dance
// with each act, bigger on the drops, flickering on the hats. The music made visible (Rez, Tetris Effect: the music's
// player on the stage).
import { BONES, JI } from '../../lib/skeleton.js';
import { frameOf } from '../../anim.js';
import { glowDot, rgba, smooth } from '../util.js';
import { partOf } from '../../world/index.js';

// [clip, frame its liveliest four beats start on, how lively (the movement of all of it over those beats)], calmest
// first: the calm parts of the song take from the calm half, the drops from the lively one
const DANCES = [
  ['thriller_part_1', 70, 8.6],
  ['wave_hip_hop_dance', 278, 12.5],
  ['arms_hip_hop_dance', 194, 12.3],
  ['robot_hip_hop_dance', 86, 13.7],
  ['twerk_dance', 178, 13.7],
  ['shimmy_hip_hop', 222, 14.3],
  ['quake_hip_hop', 220, 14.6],
  ['tut_hip_hop_dance', 126, 15.7],
  ['tut_hip_hop_dance_2', 272, 15.6],
  ['snake_hip_hop_dance', 70, 15.9],
  ['body_wave_hip_hop', 278, 16.1],
  ['macarena_dance', 46, 16.4],
  ['robot_hip_hop_dance_2', 126, 16.8],
  ['cabbage_patch_dance', 46, 17],
  ['northern_soul_dance', 10, 17.1],
  ['booty_hip_hop_dance', 134, 17.5],
  ['ymca_dance', 148, 17.7],
  ['wave_hip_hop_dance_2', 82, 18],
  ['slide_hip_hop_dance', 110, 18],
  ['step_hip_hop_dance', 154, 18.6],
  ['chicken_dance', 86, 19.1],
  ['raise_the_roof_hip_hop', 80, 19.8],
  ['twist_dance', 196, 20.1],
  ['side_to_side_hip_hop', 54, 20.5],
  ['rib_pops_hip_hop', 54, 20.8],
  ['quick_steps', 62, 21.5],
  ['house_dancing_3', 252, 23.2],
  ['house_dancing_2', 236, 23.8],
  ['samba_olodum', 142, 24.3],
  ['boogaloo_dance', 98, 24.8],
  ['house_dancing_4', 88, 25.2],
  ['bboy_hip_hop', 208, 25.4],
  ['locking_hip_hop_dance', 272, 25.8],
  ['thriller_part_2', 16, 25.9],
  ['moonwalk_hip_hop', 142, 28.5],
  ['kick_step_hip_hop', 10, 28.8],
  ['gangnam_style', 22, 29.5],
  ['jazz_rockette_kick', 196, 31.7],
  ['brooklyn_uprock', 42, 35],
  ['swing_charleston', 102, 36.1],
  ['running_man_hip_hop', 220, 40.2],
  ['charleston_crazy_legs', 26, 40.6],
  ['shuffling_dance', 50, 44.9],
  ['northern_soul_spin_combo', 132, 51],
];
// (the dances were captured at about 120 bpm: 30 frames of 60 a beat)
const PER_BEAT = 30,
  // (a new dance every two bars)
  EVERY = 8;

export function drawPerformer(f) {
  const { g, v, mf, t, T, L, run } = f,
    C = run.anim?.C;
  if (!C) return;
  const beats = (t - (L.A.beats[0] ?? 0)) / L.A.beat,
    k = Math.floor(Math.max(0, beats) / EVERY),
    since = beats - k * EVERY,
    bar = L.A.bars.find(b => t >= b.t0 && t < b.t1),
    lively = bar && (bar.kind === 'drop' || bar.kind === 'build'),
    half = DANCES.length >> 1,
    // (the song's own order through its half of them: none back till all of that half have been danced; each dance's
    // frame u beats into it)
    dance = (n, live, u) => {
      const [name, from] = DANCES[(live ? half : 0) + (((n * 7 + (L.A.seed ?? 0)) >>> 0) % half)],
        c = C[name];
      return c ? frameOf(c, from + ((u * PER_BEAT) % Math.max(1, c.n - from)), true) : null;
    },
    J = dance(k, lively, since);
  if (!J) return;
  // (the dance before blended into the new one over its first half beat: no cut from one pose to the next)
  if (k > 0 && since < 0.5) {
    const tb = t - since * L.A.beat - 0.01,
      pb = L.A.bars.find(b => tb >= b.t0 && tb < b.t1),
      P0 = dance(k - 1, pb ? pb.kind === 'drop' || pb.kind === 'build' : lively, since + EVERY),
      w = since / 0.5,
      e = w * w * (3 - 2 * w);
    if (P0) for (let q = 0; q < J.length; q++) J[q] = P0[q] + (J[q] - P0[q]) * e;
  }
  // (a new dance comes in as a hologram would: torn and flickering for its first quarter beat)
  const torn = since < 0.25 ? Math.floor(t * 40) % 2 : 1,
    a = Math.min(1, torn * (0.14 + 0.45 * mf.voice + 0.15 * mf.drop) + 0.5 * giantDown(L, t)) * (Math.floor(t * 24) % 9 === 0 && mf.hat > 0.4 ? 0.3 : 1);
  if (a < 0.03) return;
  // (the secret giant, character.js: down out of the sky for the last drop, huge, close behind the roofs)
  const down = giantDown(L, t),
    s = ((v.H * (0.42 + 0.08 * mf.drop + 0.04 * mf.stage)) / 1.8) * (1 + 0.9 * down),
    cx = v.W * (0.62 + 0.04 * Math.sin(t * 0.2)),
    floor = v.H * (0.62 + 0.4 * down),
    P = k => [cx + J[k * 2] * s, floor - J[k * 2 + 1] * s],
    col = mf.amp >= 1 ? T.line : T.hold;
  // (a song's world dresses its performer its own way, world/parts/performers)
  const style = partOf('performer', f.look?.mix?.performer);
  if (style) return style.draw(f, { J, P, s, a, col, cx, floor, giant: L.ch?.giant, hat: (x, y, c) => hat(g, L.ch?.giant, x, y, s, c) });
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  // (its glow: a wide faint body under a thin bright one, no blur)
  for (const [w, al] of [
    [0.16, 0.25],
    [0.05, 1],
  ]) {
    g.strokeStyle = rgba(col, a * al);
    g.lineWidth = w * s;
    g.beginPath();
    for (const [p, q] of BONES) {
      const [x0, y0] = P(p),
        [x1, y1] = P(q);
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
    }
    g.stroke();
  }
  const [hx, hy] = P(JI.head);
  glowDot(g, hx, hy - 0.08 * s, 0.25 * s, col, a);
  // (who it is: its headgear, character.js)
  hat(g, L.ch?.giant, hx, hy - 0.08 * s, s, rgba(col, a));
  g.restore();
}

// the giant's headgear, round its head at (x, y), scale s
function hat(g, kind, x, y, s, col) {
  if (!kind) return;
  g.strokeStyle = col;
  g.fillStyle = col;
  g.lineWidth = 0.04 * s;
  g.beginPath();
  if (kind === 'headphones') {
    g.arc(x, y, 0.17 * s, Math.PI * 1.05, Math.PI * 1.95);
    g.stroke();
    for (const d of [-1, 1]) g.fillRect(x + d * 0.17 * s - 0.04 * s, y - 0.04 * s, 0.08 * s, 0.13 * s);
  } else if (kind === 'horns') {
    for (const d of [-1, 1]) {
      g.moveTo(x + d * 0.08 * s, y - 0.1 * s);
      g.quadraticCurveTo(x + d * 0.28 * s, y - 0.2 * s, x + d * 0.2 * s, y - 0.42 * s);
    }
    g.stroke();
  } else if (kind === 'halo') {
    g.ellipse(x, y - 0.26 * s, 0.16 * s, 0.05 * s, 0, 0, Math.PI * 2);
    g.stroke();
  } else if (kind === 'crown') {
    const b = y - 0.14 * s;
    g.moveTo(x - 0.14 * s, b);
    for (const [dx, dy] of [[-0.14, -0.2], [-0.07, -0.1], [0, -0.24], [0.07, -0.1], [0.14, -0.2], [0.14, 0]]) g.lineTo(x + dx * s, b + dy * s);
    g.closePath();
    g.stroke();
  } else if (kind === 'beanie') {
    g.arc(x, y - 0.04 * s, 0.15 * s, Math.PI, 0);
    g.stroke();
    g.beginPath();
    g.arc(x, y - 0.21 * s, 0.04 * s, 0, Math.PI * 2);
    g.fill();
  } else if (kind === 'hood') {
    g.moveTo(x - 0.2 * s, y + 0.18 * s);
    g.quadraticCurveTo(x - 0.24 * s, y - 0.3 * s, x, y - 0.3 * s);
    g.quadraticCurveTo(x + 0.24 * s, y - 0.3 * s, x + 0.2 * s, y + 0.18 * s);
    g.stroke();
  }
}

// how far down the secret giant has come (character.js): with the boss's act
function giantDown(L, t) {
  return L.ch?.secret === 'giant' && L.boss ? smooth(L.boss.t0 - 1, L.boss.t0 + 1, t) * (1 - smooth(L.boss.t1, L.boss.t1 + 2, t)) : 0;
}
