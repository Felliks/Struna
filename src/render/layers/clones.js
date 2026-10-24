// The clones: copies of him the cursor pastes ahead (a 'foe', kinds.js), running at him in the simulation's negative
// (white with a black edge, red and cyan ghosts splitting off on the snare, eyes flaring on the kick, bobbing on the
// beat), kicked out on the beat into the engine's ragdoll (engine/sim/core/ragdoll.js) to tumble away; and on the drops
// and the loudest bars, echoes of him trailing behind in the song's colours.
import { partOf } from '../../world/index.js';
import { RELAX, makeRagdoll, ragAir, ragJoints, ragMuscles } from '../../lib/ragdoll.js';
import { BONES, JI } from '../../lib/skeleton.js';
import { frameOf } from '../../anim.js';
import { fromRig, toRig, wrap } from '../../body.js';
import { glowDot, hash, rgba } from '../util.js';
import { inSeg } from '../stage.js';
import { pieces } from './roofs.js';
import { stick } from './hero.js';

// how fast a clone runs at him (m/s, on top of his own run) and its stride
export const VF = 2.4;
const STRIDE = 3.16;

// where a clone is at t: running at him until his foot meets it
// (one coming up behind him closes from behind at its own speed)
export const foeX = (L, o, t) => (o.type === 'foeback' ? o.x - o.vb * Math.max(0, o.t + L.M.kickAt - t) : o.x + VF * Math.max(0, o.t + L.M.kickAt - t));

// (how a blend eases)
const ease =u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
// the strikes a clone throws at him as he comes in (as STRIKES' in anim.js: [clip, from, to, contact], the whole body)
const FOE_STRIKES = [
  ['hook_punch', 45, 90, 0.49],
  ['jab_cross', 14, 60, 0.59],
  ['mma_kick', 22, 70, 0.48],
  ['standing_melee_kick', 18, 64, 0.52],
  ['cross_punch', 48, 90, 0.48],
];
// (the frame of a cycle its left foot is lowest in: the run's phase is whole when it is planted)
const lowest = (c, j) => c.F.reduce((m, F, i) => (F[j * 2 + 1] < c.F[m][j * 2 + 1] ? i : m), 0);
// a clone's gait, worked out once: how fast it runs, its stride locked to the beat when the song's tempo gives one near
// its own (a step on the beat, as his in anim.js runPhase), which foot it starts on (so two never step in lockstep), the
// strike it throws
const GAITS = new WeakMap();
function gait(f, o) {
  let G = GAITS.get(o);
  if (G) return G;
  const L = f.L,
    C = f.run.anim.C,
    beat = L.A.beat,
    v = o.type === 'foeback' ? o.vb : VF,
    h = hash(Math.round((o.v ?? 0.5) * 1e4), Math.round(o.t * 100));
  let c = 0,
    k = 1;
  for (const q of [0.25, 0.5, 1]) {
    const r = v / ((q / beat) * STRIDE);
    if (r > 0.6 && r < 1.45 && (!c || Math.abs(Math.log(r)) < Math.abs(Math.log(k)))) ((c = q), (k = r));
  }
  G = {
    v,
    c,
    k,
    // (beat-locked: either foot first, so its footfalls stay on the beat; free: anywhere in the cycle)
    off: c ? (h < 0.5 ? 0 : 0.5) : h,
    // (its last steps: slowing to plant its feet for the strike; one rushing up from behind is stopped by his kick)
    d: o.type === 'foeback' ? Math.min(0.15, 0.3 / v) : 0.15,
    sprint: ease((v - 4.4) / 1.55),
    st: FOE_STRIKES[Math.floor(hash(Math.round(o.t * 1000), 31) * FOE_STRIKES.length)],
    cr: lowest(C.standard_run, JI.ftL) / C.standard_run.n,
    cs: lowest(C.sprint, JI.ftL) / C.sprint.n,
  };
  GAITS.set(o, G);
  return G;
}
// how far it still has to run r seconds before the contact (m), easing to a stop on its last steps
const toGo = (G, r) => (r <= 0 ? 0 : r < G.d ? (G.v * r * r) / (2 * G.d) : G.v * (r - G.d / 2));
// the strike's frame at t: wound up through about a beat to the contact on the beat at tc, then its follow-through;
// and how long the wind-up is
function strikeFrame(f, G, tc, t) {
  const [, from, to, cf] = G.st,
    fc = from + cf * (to - from),
    wu = Math.max(0.28, Math.min(0.55, f.L.A.beat)),
    rate = (fc - from) / wu;
  return [Math.max(from, Math.min(to, fc + (t - tc) * rate)), wu, rate];
}

// a clone's pose at t, in its stretch's distance: the run (or the sprint, by its speed) stepping with the distance it
// covers (on the beat where the tempo allows), facing him (back along the run); about a beat out it winds up and
// strikes, the contact on the beat
export function foePose(f, o, t) {
  const C = f.run.anim.C,
    G = gait(f, o),
    tc = o.t + f.L.M.kickAt,
    face = o.type === 'foeback' ? 1 : -1,
    // (where it is: running at him, its last steps slowing to a stop)
    x = o.x - face * toGo(G, tc - t),
    // (its phase: the beat's, or the distance covered; frozen once its feet stop, never running on the spot)
    ph = (G.c ? ((Math.min(t, tc - G.d / 2) - (f.L.A.beats?.[0] ?? 0)) / f.L.A.beat) * G.c : -toGo(G, tc - t) / STRIDE) + G.off,
    P = frameOf(C.standard_run, (ph + G.cr) * C.standard_run.n, true),
    out = new Float32Array(P.length);
  if (G.sprint > 0) {
    const S = frameOf(C.sprint, (ph + G.cs) * C.sprint.n, true);
    for (let k = 0; k < P.length; k++) P[k] += (S[k] - P[k]) * G.sprint;
  }
  // (a stride longer or shorter than the clip's, to step on the beat: the legs' reach scaled, so a planted foot keeps
  // pace with the roof)
  if (G.c) for (const j of [JI.hiL, JI.knL, JI.ftL, JI.toL, JI.hiR, JI.knR, JI.ftR, JI.toR]) P[j * 2] *= G.k;
  // (the strike: the upper body wound up from a beat out, the legs planted into its stance on the last steps)
  const [fr, wu] = strikeFrame(f, G, tc, t),
    wU = ease((t - (tc - wu - 0.08)) / 0.18),
    wL = ease((t - (tc - G.d - 0.06)) / (G.d + 0.02));
  // (blended as a rig, each bone turned from the run's angle to the strike's: joints blended in place fold the neck as the
  // body leans back into a kick, its head dropping under its neck)
  if (wU > 0) {
    const S = frameOf(C[G.st[0]], fr),
      A = toRig(P),
      B = toRig(S);
    A[0] += (B[0] - A[0]) * wL;
    A[1] += (B[1] - A[1]) * wL;
    for (const [b, [, c]] of BONES.entries()) {
      const w = JI[c] >= JI.hiL ? wL : wU,
        i = 2 + b * 2;
      A[i] += wrap(B[i] - A[i]) * w;
      A[i + 1] += (B[i + 1] - A[i + 1]) * w;
    }
    fromRig(A, P);
  }
  // (the beat in its upper body only: a nod of the head and shoulders, its feet left where the capture plants them)
  const bob = 0.04 * f.mf.beat * (1 - wU),
    // (in a part played mini the clones are as small as he is, scaled about their feet: run.js place)
    sc = 1 - 0.35 * (f.L.miniAt?.(o.t) ?? 0);
  for (let k = 0; k < P.length; k += 2) {
    const j = k / 2,
      up = j !== JI.hips && j < JI.hiL ? bob : 0;
    out[k] = x + face * P[k] * sc;
    out[k + 1] = o.y + (P[k + 1] + up) * sc;
  }
  // (the way it faces, kept with the pose: a kick leans its head back past its hips, and its eyes must not follow)
  out.face = face;
  return out;
}

// a clone as it comes, pasted in with a fade; one that got him follows its strike through, then the simulation takes it
// back (it glitches out in slices). Returns its pose (null once gone)
export function drawFoe(f, o, since, pose = null) {
  const { t } = f;
  if (o.res !== 'hit') {
    const J = pose ?? foePose(f, o, t);
    drawClone(f, J, Math.min(1, since / 0.1));
    return J;
  }
  const G = gait(f, o),
    tc = o.t + f.L.M.kickAt,
    [, , rate] = strikeFrame(f, G, tc, t),
    // (its follow-through played out to the strike's end (a little after the blow at most), then its glitch)
    fc = G.st[1] + G.st[3] * (G.st[2] - G.st[1]),
    end = Math.min(Math.max(o.hitT, tc) + 0.3, tc + (G.st[2] - fc) / rate),
    u = (t - Math.max(o.hitT, end)) / 0.35;
  if (u >= 1) return null;
  const J = foePose(f, o, t);
  if (u <= 0) drawClone(f, J, 1);
  else glitchOut(f, J, u);
  return J;
}
// a clone taken back by the simulation, u 0..1: torn into slices jumping apart on their own steps, red and cyan split off
// them, thinning to nothing
function glitchOut(f, J, u) {
  const { g, v, t } = f,
    m = v.ppm,
    N = 7,
    top = v.sy(J[JI.head * 2 + 1] + 0.35),
    bot = v.sy(Math.min(J[JI.ftL * 2 + 1], J[JI.ftR * 2 + 1]) - 0.1),
    h = (bot - top) / N,
    // (a few steps a second: a glitch jumps, it does not slide)
    st = Math.floor(t * 24);
  for (let i = 0; i < N; i++) {
    if (hash(i * 7 + st, 11) < u * u) continue;
    g.save();
    g.beginPath();
    g.rect(-v.W, top + i * h, v.W * 3, h + 1);
    g.clip();
    g.translate((hash(i * 13 + st, 7) - 0.5) * 1.4 * u * m, 0);
    if (hash(i, st) < 0.5) {
      stick(f, J, [['rgba(41,231,255,0.6)', 0.14]], -0.12 * m * u);
      stick(f, J, [['rgba(255,43,58,0.6)', 0.14]], 0.12 * m * u);
    }
    drawClone(f, J, 1 - u * u);
    g.restore();
  }
}

// a clone drawn: its body in the negative, its head, its eyes
export function drawClone(f, J, alpha = 1) {
  const { g, v, mf } = f,
    m = v.ppm;
  g.save();
  g.globalAlpha *= alpha;
  if (mf.snare > 0.35) {
    const o = (0.05 + 0.1 * mf.snare) * m;
    stick(f, J, [['rgba(41,231,255,0.5)', 0.14]], -o);
    stick(f, J, [['rgba(255,43,58,0.5)', 0.14]], o);
  }
  stick(f, J, [
    ['#000000', 0.16],
    ['#ffffff', 0.085],
  ]);
  const nx = v.sx(J[JI.neck * 2]),
    ny = v.sy(J[JI.neck * 2 + 1]),
    hx = v.sx(J[JI.head * 2]),
    hy = v.sy(J[JI.head * 2 + 1]),
    d = Math.hypot(hx - nx, hy - ny) || 1,
    r = 0.15 * m,
    cx = nx + ((hx - nx) / d) * (d + r * 0.3),
    cy = ny + ((hy - ny) / d) * (d + r * 0.3);
  g.fillStyle = '#fff';
  g.strokeStyle = '#000';
  g.lineWidth = 0.04 * m;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  // (eyes on the side it faces: toward him, back along the run)
  const face = J.face ?? (Math.sign(J[JI.head * 2] - J[0]) || -1);
  glowDot(g, cx + face * r * 0.32, cy - r * 0.15, r * (0.7 + 0.8 * mf.kick), '#29e7ff', 0.7 * f.glow);
  g.fillStyle = rgba('#29e7ff', 0.7 + 0.3 * mf.kick);
  for (const ex of [0.1, 0.55]) {
    g.beginPath();
    g.ellipse(cx + face * r * ex, cy - r * 0.15, r * 0.16, r * 0.1 * (1 + mf.kick), 0, 0, Math.PI * 2);
    g.fill();
  }
  g.shadowBlur = 0;
  // (a song's world dresses its clones its own way, world/parts/clones: over the body, round the head)
  partOf('clone', f.look?.mix?.clone)?.draw(f, { J, cx, cy, r, face, m });
  g.restore();
}

// the clones kicked out, each its own death (a perfect blow the showiest), after a hit-stop on the clone alone (HOLD:
// it hangs in the pose it was struck in, white-hot, while the music, the camera and he run on: a freeze of the whole
// picture reads as lag):
//   ragdoll  thrown into the engine's ragdoll to tumble away (its own small physics world)
//   bones    knocked to pieces: every bone flies off on its own, spinning, bouncing on the roof
//   pixels   the simulation takes it back: it bursts into its pixels along the blow
//   slice    cut in two along the blow: the top slides off, the legs fold
//   glass    frozen to glass on the blow and shattered into shards
//   delete   the cursor selects it and deletes it: it collapses like an old screen switched off
//   rubber   stretched along the blow like a band and snapped into pixels
const HOLD = 0.075,
  LIFE = 2.6,
  SHOWY = ['bones', 'slice', 'glass', 'delete', 'rubber', 'pixels'],
  PLAIN = ['ragdoll', 'ragdoll', 'pixels', 'bones'];
const rnd = seed => {
  let h = seed >>> 0;
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0) / 4294967296);
};
// (what is knocked off falls as he does off a jump: his gravity, about 20 m/s²; the ragdoll stepped at a fixed 120 Hz)
const GRAV = 20,
  STEP = 1 / 120;
// the roof of stretch s now as solid pieces [a, b, height] (roofs.js pieces): what is knocked off lands on these, and
// falls on down past their ends and through the gaps
function floorOf(f, s) {
  const i = f.L.segs.indexOf(s);
  if (i < 0 || s.kind !== 'run') return [[-Infinity, Infinity, s.y0]];
  return pieces(f, s, i).out.map(([a, b]) => [a, b, f.L.groundAt ? f.L.groundAt(s, (a + b) / 2) : s.y0]);
}
// the height of the roof under x (or none)
const floorAt = (k, x) => {
  for (const [a, b, y] of k.floor) if (x >= a && x <= b) return y;
  return -Infinity;
};
// the blow's sparks: small and hot, gone in a moment
function sparks(f, k, age) {
  const { g, v, T } = f,
    m = v.ppm;
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const p of k.sparks) {
    if (age > p.life) continue;
    g.globalAlpha = 1 - age / p.life;
    g.fillStyle = p.col ?? T.line;
    g.fillRect(v.sx(p.x) - p.s * m * 0.5, v.sy(p.y) - p.s * m * 0.5, p.s * m, p.s * m);
  }
  g.restore();
}
export class KOs {
  constructor() {
    this.list = [];
  }
  clear() {
    this.list = [];
  }
  // one clone built and thrown off screen before the run, so the physics' first build (its code compiled) is not paid
  // on the first kick
  warm(f, o) {
    this.add(f, o, 0, false, false, 'ragdoll');
    const k = this.list.pop();
    for (let i = 0; i < 6; i++) k.world.step(1 / 60, 4, 2);
    ragJoints(k.rag);
  }
  // a clone kicked out at t (its pose then, in its stretch's distance); swept: its legs taken from under it, it flips
  // up over him head first; back: kicked out behind him
  add(f, o, t, swept = false, back = false, force = null) {
    const J = foePose(f, o, t),
      dir = back ? -1 : 1,
      r = rnd(Math.round((o.v ?? 0.5) * 1e6) + Math.round(t * 1000)),
      list = o.grade === 'perfect' ? SHOWY : o.grade === 'great' ? [...SHOWY, 'ragdoll'] : PLAIN,
      kind = force ?? (swept ? 'ragdoll' : list[Math.floor(r() * list.length)]),
      // (what flies off carries his run's speed: the stretch's distance moves with him, a piece slower than he runs would
      // seem to fly back)
      base = f.L.vAt(Math.max(0, t)),
      // (the roof under it as it is: its pieces, each at its height; past their ends and over the gaps, nothing)
      floor = floorOf(f, o.seg),
      k = { kind, seg: o.seg, t0: t, J, dir, y: o.y, r, base, floor, acc: 0 };
    // (sparks off the contact, on his side of it, flying on along the blow with his run's speed)
    const hx = J[JI.hips * 2] - dir * 0.3,
      hy = J[JI.hips * 2 + 1] + 0.6;
    k.sparks = Array.from({ length: 16 }, () => ({ x: hx, y: hy + (r() - 0.5) * 0.4, vx: base + dir * (2 + r() * 8) * (r() < 0.2 ? -0.4 : 1), vy: (r() - 0.4) * 7, life: 0.35 + 0.2 * r(), col: r() < 0.7 ? '#ffffff' : null, s: 0.03 + r() * 0.04 }));
    if (kind === 'ragdoll') {
      const PL = window.planck;
      if (!PL) return;
      const world = new PL.World({ gravity: PL.Vec2(0, -GRAV) }),
        ground = world.createBody();
      for (const [a, b, y] of floor) {
        const a1 = Math.max(a, J[0] - 60),
          b1 = Math.min(b, J[0] + 60);
        if (b1 > a1) ground.createFixture(new PL.Box((b1 - a1) / 2, 1, PL.Vec2((a1 + b1) / 2, y - 1), 0), { friction: 0.9 });
      }
      // (swept: its own run carries it on over him, head first, its legs taken; kicked: his run's speed and the blow's)
      const rag = makeRagdoll(world, J, swept ? { vx: 2.5, vy: 9.5 + 2 * f.mf.kick, spin: 11 } : { vx: base + dir * (back ? 5 + 2 * f.mf.kick : 3.5 + 3 * f.mf.kick), vy: back ? 7 : 7.5, spin: -dir * 5 });
      // (no muscles: a dead weight; no continuous collision: it only ever meets the floor, slowly enough)
      ragMuscles(rag, RELAX, 0);
      for (const p of rag) p.b.setBullet(false);
      Object.assign(k, { world, rag });
    } else if (kind === 'bones' || kind === 'glass') {
      // (the pieces: its bones, or shards of glass round them)
      k.parts = [];
      for (const [a, c] of BONES) {
        const n = kind === 'glass' ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const x0 = J[a * 2],
            y0 = J[a * 2 + 1],
            x1 = J[c * 2],
            y1 = J[c * 2 + 1],
            u0 = i / n,
            u1 = (i + 1) / n,
            ax = x0 + (x1 - x0) * u0,
            ay = y0 + (y1 - y0) * u0,
            bx = x0 + (x1 - x0) * u1,
            by = y0 + (y1 - y0) * u1,
            cx = (ax + bx) / 2,
            cy = (ay + by) / 2;
          k.parts.push({ cx, cy, ax: ax - cx, ay: ay - cy, bx: bx - cx, by: by - cy, w: (r() - 0.5) * 30, a: 0, vx: base + dir * (2 + r() * 8), vy: 3 + r() * 9, head: c === JI.head, tri: kind === 'glass' ? [(r() - 0.5) * 0.25, (r() - 0.5) * 0.25] : null });
        }
      }
    } else if (kind === 'pixels' || kind === 'rubber') {
      // (its pixels: points along its bones)
      k.dots = [];
      for (const [a, c] of BONES)
        for (let u = 0; u <= 1; u += 0.2) {
          const x = J[a * 2] + (J[c * 2] - J[a * 2]) * u,
            y = J[a * 2 + 1] + (J[c * 2 + 1] - J[a * 2 + 1]) * u;
          k.dots.push({ x, y, vx: base + dir * (1 + r() * 9) + (r() - 0.5) * 2, vy: (r() - 0.3) * 6, col: r() < 0.12 ? '#ff2b3a' : r() < 0.24 ? '#29e7ff' : r() < 0.6 ? '#ffffff' : '#000000' });
        }
    } else if (kind === 'slice') {
      // (cut where the blow met it, a little slanted: what is above the cut and what is below)
      k.cut = J[JI.hips * 2 + 1] + 0.35 + r() * 0.3;
      k.slant = (r() - 0.5) * 0.6;
      // (the top: a body of its own, slid off along the blow with his run's speed, falling and turning, landing on the
      // roof (or down a gap); the legs fold where they stood)
      k.top = { x: 0, y: 0, vx: base + dir * 1.5, vy: 2.2, a: 0, w: -dir * 2 };
    }
    this.list.push(k);
  }
  draw(f) {
    const { t, dt, g } = f;
    if (this.list.some(k => t - k.t0 >= LIFE || t < k.t0)) this.list = this.list.filter(k => t - k.t0 < LIFE && t >= k.t0);
    for (const k of this.list) {
      const age = t - k.t0,
        held = age < HOLD;
      // (its physics on a fixed step, whatever the frame's: the same fall at any frame rate)
      if (k.kind === 'ragdoll' && dt > 0 && !held) {
        k.acc = Math.min(k.acc + dt, 6 * STEP);
        for (; k.acc >= STEP; k.acc -= STEP) {
          ragAir(k.rag);
          k.world.step(STEP, 6, 3);
        }
        k.J = ragJoints(k.rag);
      }
      if (dt > 0) for (const p of k.sparks) ((p.vy -= GRAV * 0.5 * dt), (p.x += p.vx * dt), (p.y += p.vy * dt));
      inSeg(f, k.seg, () => {
        if (held || k.kind === 'ragdoll') drawClone(f, k.J, Math.min(1, (LIFE - age) / 0.6));
        else DEATH[k.kind](f, k, age - HOLD, dt);
        sparks(f, k, age);
        // (the hold: the struck clone flashes white over, fading as it starts to go)
        const w = 1 - age / (HOLD * 2.5);
        if (w > 0) {
          g.save();
          g.globalCompositeOperation = 'lighter';
          g.globalAlpha = w;
          stick(f, k.J, [['#ffffff', 0.2]]);
          g.restore();
        }
      });
    }
  }
}
// a piece of a clone (a bone or a shard) drawn at its place and turn
function piece(f, p, fade) {
  const { g, v } = f,
    m = v.ppm,
    c = Math.cos(p.a),
    s = Math.sin(p.a),
    P = (x, y) => [v.sx(p.cx + x * c - y * s), v.sy(p.cy + x * s + y * c)];
  g.globalAlpha = fade;
  if (p.tri) {
    // a shard: a triangle of glass along the bone
    const [A, B, C] = [P(p.ax, p.ay), P(p.bx, p.by), P(p.tri[0], p.tri[1])];
    g.fillStyle = 'rgba(200,240,255,0.75)';
    g.strokeStyle = '#ffffff';
    g.lineWidth = 0.02 * m;
    g.beginPath();
    g.moveTo(...A);
    g.lineTo(...B);
    g.lineTo(...C);
    g.closePath();
    g.fill();
    g.stroke();
    return;
  }
  const [A, B] = [P(p.ax, p.ay), P(p.bx, p.by)];
  g.lineCap = 'round';
  for (const [col, w] of [['#000000', 0.16], ['#ffffff', 0.085]]) {
    g.strokeStyle = col;
    g.lineWidth = w * m;
    g.beginPath();
    g.moveTo(...A);
    g.lineTo(...B);
    g.stroke();
  }
  if (p.head) {
    g.fillStyle = '#fff';
    g.strokeStyle = '#000';
    g.lineWidth = 0.04 * m;
    g.beginPath();
    g.arc(B[0], B[1], 0.15 * m, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
}
// pieces flying under gravity and bouncing on the roof
// (on the roof's own pieces: one past its end or over a gap falls on down; the roof met only from above)
function fly(list, dt, k, lift = 0.05, at = p => p.cx) {
  for (const p of list) {
    const y0 = p.cy;
    p.vy -= GRAV * dt;
    p.cx += p.vx * dt;
    p.cy += p.vy * dt;
    p.a += p.w * dt;
    const fl = floorAt(k, at(p)) + lift;
    if (p.cy < fl && y0 >= fl - 0.02 && p.vy < 0) {
      p.cy = fl;
      p.vy *= -0.35;
      p.vx *= 0.75;
      p.w *= 0.6;
    }
  }
}
const DEATH = {
  bones(f, k, age, dt) {
    if (dt > 0) fly(k.parts, dt, k);
    const fade = Math.min(1, (LIFE - HOLD - age) / 0.6);
    for (const p of k.parts) piece(f, p, fade);
    f.g.globalAlpha = 1;
  },
  glass(f, k, age, dt) {
    // (a moment as glass first, then the shards)
    if (age < 0.12) {
      f.g.save();
      f.g.globalAlpha = 0.9;
      stick(f, k.J, [['#ffffff', 0.2], ['rgba(170,230,255,0.9)', 0.12]]);
      f.g.restore();
      return;
    }
    if (dt > 0) fly(k.parts, dt, k);
    const fade = Math.min(1, (LIFE - HOLD - age) / 0.8);
    for (const p of k.parts) piece(f, p, fade);
    f.g.globalAlpha = 1;
  },
  pixels(f, k, age, dt) {
    const { g, v } = f,
      q = Math.max(2, v.ppm * 0.07);
    if (dt > 0)
      for (const d of k.dots) {
        d.vy -= 3 * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.vx = k.base + (d.vx - k.base) * (1 - 1.2 * dt);
      }
    g.globalAlpha = Math.max(0, 1 - age / 1.2);
    for (const d of k.dots) {
      g.fillStyle = d.col;
      g.fillRect(Math.round(v.sx(d.x) / q) * q, Math.round(v.sy(d.y) / q) * q, q, q);
    }
    g.globalAlpha = 1;
  },
  slice(f, k, age, dt) {
    const { g, v } = f,
      u = Math.min(1, age / 0.9),
      cx0 = k.J[JI.hips * 2];
    // (the top: a body of its own, its cut edge landing on the roof where it comes down (or falling on down a gap); the
    // legs: folding where they stood)
    if (dt > 0) {
      const tp = k.top;
      tp.cx = cx0 + tp.x;
      tp.cy = tp.y;
      fly([tp], dt, k, -k.cut);
      tp.x = tp.cx - cx0;
      tp.y = tp.cy;
      // (on the roof it slides to a stop, no longer turning)
      if (tp.y <= floorAt(k, tp.cx) - k.cut + 0.01) ((tp.vx *= 1 - Math.min(1, 6 * dt)), (tp.w *= 1 - Math.min(1, 8 * dt)));
    }
    const top = k.top,
      low = { x: 0, y: -0.3 * u, a: k.dir * 0.9 * u };
    const fade = Math.min(1, (LIFE - HOLD - age) / 0.6);
    for (const [side, T] of [[1, top], [-1, low]]) {
      const cx = k.J[JI.hips * 2],
        cy = k.cut;
      g.save();
      g.globalAlpha = fade;
      // (each half clipped off the other along the cut, moved and turned as one)
      g.translate(v.sx(cx + T.x), v.sy(cy + T.y));
      g.rotate(-T.a);
      g.translate(-v.sx(cx), -v.sy(cy));
      g.beginPath();
      const X0 = v.sx(cx - 3),
        X1 = v.sx(cx + 3),
        Y0 = v.sy(cy + k.slant * -3),
        Y1 = v.sy(cy + k.slant * 3);
      g.moveTo(X0, Y0);
      g.lineTo(X1, Y1);
      g.lineTo(X1, side > 0 ? -1e4 : 1e4);
      g.lineTo(X0, side > 0 ? -1e4 : 1e4);
      g.closePath();
      g.clip();
      drawClone(f, k.J, 1);
      g.restore();
    }
    // (the cut's flash)
    if (age < 0.2) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = `rgba(255,255,255,${1 - age / 0.2})`;
      g.lineWidth = 0.06 * v.ppm;
      const cx = k.J[JI.hips * 2];
      g.beginPath();
      g.moveTo(v.sx(cx - 1.2), v.sy(k.cut - k.slant * 1.2));
      g.lineTo(v.sx(cx + 1.2), v.sy(k.cut + k.slant * 1.2));
      g.stroke();
      g.restore();
    }
  },
  delete(f, k, age) {
    const { g, v } = f,
      m = v.ppm,
      cx = v.sx(k.J[JI.hips * 2]),
      cy = v.sy(k.J[JI.hips * 2 + 1] + 0.3);
    // (selected: the marquee round it, marching; then switched off: squashed to a line, the line to a point, gone)
    if (age < 0.18) {
      drawClone(f, k.J, 1);
      g.save();
      g.setLineDash([0.1 * m, 0.08 * m]);
      g.lineDashOffset = -age * 4 * m;
      g.strokeStyle = '#fff';
      g.lineWidth = 0.035 * m;
      g.strokeRect(cx - 0.75 * m, cy - 1.45 * m, 1.5 * m, 2.5 * m);
      g.fillStyle = 'rgba(80,140,255,0.2)';
      g.fillRect(cx - 0.75 * m, cy - 1.45 * m, 1.5 * m, 2.5 * m);
      g.restore();
      return;
    }
    const u = age - 0.18;
    if (u > 0.45) return;
    const sy = Math.max(0.02, 1 - u / 0.15),
      sx = u < 0.15 ? 1 + u * 2 : Math.max(0, 1.3 * (1 - (u - 0.15) / 0.3));
    g.save();
    g.translate(cx, cy);
    g.scale(sx, sy);
    g.translate(-cx, -cy);
    drawClone(f, k.J, 1);
    g.restore();
    g.fillStyle = '#ffffff';
    g.fillRect(cx - 0.9 * m * sx, cy - 0.02 * m, 1.8 * m * sx, 0.04 * m);
    glowDot(g, cx, cy, 0.6 * m * (1 - u / 0.45), '#ffffff', 1 - u / 0.45);
  },
  rubber(f, k, age, dt) {
    const { g, v } = f;
    // (stretched along the blow for a fifth of a second, then snapped into its pixels)
    if (age < 0.2) {
      const u = age / 0.2,
        fx = v.sx(k.J[JI.ftL * 2]),
        fy = v.sy(k.y);
      g.save();
      g.translate(fx, fy);
      g.scale(1 + 2.2 * u * u, 1 - 0.55 * u);
      g.transform(1, 0, -0.6 * k.dir * u, 1, 0, 0);
      g.translate(-fx, -fy);
      drawClone(f, k.J, 1);
      g.restore();
      return;
    }
    if (!k.snapped) {
      k.snapped = true;
      for (const d of k.dots) (d.x += k.dir * 1.2), (d.vx = k.base + (d.vx - k.base) * 1.6);
    }
    DEATH.pixels(f, k, age - 0.2, dt);
  },
};

// echoes of him: his last poses, drawn behind him a few frames late in the song's colours, on a drop and in loud bars
export function drawEchoes(f, history) {
  const { g, v, mf, T, run: R, t } = f,
    // (and as the streak climbs: the flow trails him; in the overdrive, a rainbow of him)
    a = Math.max(mf.drop * (f.react ?? 0.5), mf.amp >= 1 ? (0.35 + 0.4 * mf.kick) * (f.react ?? 0.5) : 0, [0, 0.25, 0.45, 0.65][R.tier], R.od ? 0.9 : 0);
  if (a < 0.05 || history.length < 4) return;
  const cols = R.od ? [0, 1, 2].map(i => `hsl(${(t * 400 + i * 110) % 360},100%,62%)`) : [T.hold, T.slide, T.line];
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  for (let e = 3; e >= 1; e--) {
    const h = history[history.length - 1 - e * 3];
    if (!h) continue;
    g.strokeStyle = cols[e - 1].startsWith('#') ? rgba(cols[e - 1], a * (0.5 - e * 0.1)) : cols[e - 1];
    g.globalAlpha = cols[e - 1].startsWith('#') ? 1 : a * (0.5 - e * 0.1);
    g.lineWidth = 0.12 * v.ppm;
    g.beginPath();
    for (const [p, c] of BONES) {
      g.moveTo(v.sx(h[p * 2]), v.sy(h[p * 2 + 1]));
      g.lineTo(v.sx(h[c * 2]), v.sy(h[c * 2 + 1]));
    }
    g.stroke();
  }
  g.globalAlpha = 1;
  g.restore();
}

// an ally (a secret, level.js): a clone of his that runs with him, a step behind and a moment late, doing what he does
export function drawAlly(f, history) {
  const sc = f.L.secret;
  if (sc?.kind !== 'ally' || f.t < sc.t0 || f.t > sc.t1 || history.length < 8 || f.run.mode !== 'run') return;
  const h = history[history.length - 8],
    J = new Float32Array(h.length);
  for (let k = 0; k < h.length; k += 2) {
    J[k] = h[k] - 1.3;
    J[k + 1] = h[k + 1];
  }
  // (it faces the way he runs, whatever his pose: carrying a thing his head is behind his hips, and its eyes must not
  // turn back)
  J.face = 1;
  drawClone(f, J, Math.min(1, (f.t - sc.t0) / 0.5, (sc.t1 - f.t) / 0.5));
}
