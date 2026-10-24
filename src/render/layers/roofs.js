// The running surfaces: one level of the simulation per run stretch, a slab floating in the sky in its place's look
// (render/places/), cut by the gaps once the cursor has deleted them. Nothing tells a shaft is coming: a level runs on
// past it until the cursor acts. Before a fall the cursor deletes the floor under him (its slabs tumble down) and he
// drops through open air to the level below, which runs on both ways; before a launch up it slams a spring down, he
// flies up through a hatch in the level above, and the hatch slams shut under his feet on the beat he lands on.
import { mulberry } from '../../rng.js';
import { LOOKS } from '../places/index.js';
import { groundOf } from '../../world/index.js';
import { THICK, air, cutFace, underside } from '../places/kit.js';
import { hash, rgba, smooth } from '../util.js';
import { drawThing } from '../things/index.js';
import { inSeg } from '../stage.js';
import { drawWalls } from '../shafts/index.js';
import { LANE } from '../../run.js';

// half the width of the hole a shaft goes through (his three lanes and a margin)
const HOLE = LANE * 1.5 + 0.1,
  // how far a level runs on past where anything happens on it (beyond the screen)
  ON = 16;

// slabs of a deleted piece [a, b] at height y, `dt` after the delete
export function tumble(f, a, b, y, dt) {
  if (dt < 0 || dt > 1.4) return;
  const { g, v, T } = f,
    ppm = v.ppm,
    rr = mulberry(Math.floor(a * 100));
  for (let x = a; x < b - 0.05; x += 0.3) {
    const d = rr() * 0.12,
      u = dt > d ? dt - d : 0,
      cx = x + 0.15 + (rr() - 0.5) * 0.4 * u;
    g.save();
    g.translate(v.sx(cx), v.sy(y - 4.9 * u * u - 1.2 * u - 0.2));
    g.rotate((rr() - 0.5) * 6 * u);
    g.fillStyle = T.near;
    g.fillRect(-0.15 * ppm, -0.2 * ppm, 0.3 * ppm, 0.4 * ppm);
    g.fillStyle = T.line;
    g.fillRect(-0.15 * ppm, -0.2 * ppm, 0.3 * ppm, 0.05 * ppm);
    g.restore();
  }
}

// a rail across a gap to grind along: a bar of the place's line colour on posts at either edge, lit cold on the beat,
// sparks off it under him while he grinds
function rail(f, o) {
  const { g, v, mf, T, run: R, t } = f,
    m = v.ppm,
    Y = v.sy(o.y + 0.12);
  g.fillStyle = '#1a1d24';
  for (const x of [o.x0 - 0.1, o.x1 - 0.1]) g.fillRect(v.sx(x), Y, 0.2 * m, 0.8 * m);
  g.strokeStyle = rgba(T.slide, 0.25 + 0.2 * mf.beat);
  g.lineWidth = 0.22 * m;
  g.beginPath();
  g.moveTo(v.sx(o.x0 - 0.3), Y);
  g.lineTo(v.sx(o.x1 + 0.3), Y);
  g.stroke();
  g.strokeStyle = '#d9dde3';
  g.lineWidth = 0.07 * m;
  g.stroke();
  if (R.hold2?.o === o) {
    const X = v.sx(R.heroX(t));
    for (let i = 0; i < 10; i++) {
      const a = Math.PI + (i / 10) * 1.2 + Math.sin(t * 40 + i) * 0.3,
        l = (0.2 + 0.4 * ((i * 0.37 + t * 9) % 1)) * m;
      g.strokeStyle = rgba(i % 2 ? '#ffd84a' : '#ffffff', 0.9);
      g.lineWidth = 2 * v.dpr;
      g.beginPath();
      g.moveTo(X, Y);
      g.lineTo(X + Math.cos(a) * l, Y - Math.sin(a) * l * 0.5);
      g.stroke();
    }
  }
}
// a gap the cursor deleted: open air down through the level, its faces lit, and the way over it while it is ahead
function gap(f, o) {
  const { g, v, mf, T, t, plan } = f,
    ppm = v.ppm,
    fresh = Math.max(0, 1 - (t - plan.placeT(o)) / 0.5);
  // (a leap between islands: its sides as high as the islands have floated yet; only the road's own ends cut deep)
  const is = o.isle !== undefined ? f.L.isles[o.isle] : null,
    u = is ? riseOf(f, is) : 1,
    yA = is ? o.seg.y0 + o.dyFrom * u : o.y,
    yB = is ? o.seg.y0 + o.dy * u : o.y;
  // (a hole through the level reads as one on any backdrop: dark down into it, its two lips lit in the jump's warm
  // colour on the beat, as everything to jump is; the islands float in open sky and keep it)
  if (!is && o.type === 'hold') {
    const X0 = v.sx(o.x0),
      X1 = v.sx(o.x1),
      gr = g.createLinearGradient(0, v.sy(o.y), 0, v.sy(o.y - THICK));
    gr.addColorStop(0, 'rgba(0,0,0,0.82)');
    gr.addColorStop(1, 'rgba(0,0,0,0.35)');
    g.fillStyle = gr;
    g.fillRect(X0, v.sy(o.y), X1 - X0, THICK * ppm);
    g.fillStyle = rgba(T.jump, 0.55 + 0.45 * mf.beat);
    for (const [x, d] of [
      [o.x0, -1],
      [o.x1, 1],
    ])
      g.fillRect(d < 0 ? v.sx(x) - 0.45 * ppm : v.sx(x), v.sy(o.y) - 0.04 * ppm, 0.45 * ppm, 0.1 * ppm);
  }
  if (!is || o.k === 0) cutFace(f, o.x0, yA, -1, fresh);
  if (!is || o === is.gaps.at(-1)) cutFace(f, o.x1, yB, 1, fresh);
  tumble(f, o.x0, o.x1, Math.min(yA, yB), t - plan.placeT(o));
  if (o.type === 'glide') stream(f, o);
  if (o.type === 'zip') line(f, o);
  if (o.type === 'grind') rail(f, o);
  // (over islands only the next leap's way, not a row of them)
  if (!o.res && o.type === 'hold' && (!is || is.gaps.find(q => !q.res) === o)) {
    g.setLineDash([ppm * 0.14, ppm * 0.14]);
    g.lineDashOffset = -t * ppm * 2;
    g.strokeStyle = rgba(T.hold, 0.5 + 0.4 * mf.beat);
    g.lineWidth = ppm * 0.04;
    g.beginPath();
    g.moveTo(v.sx(o.x0), v.sy(yA + 0.3));
    g.quadraticCurveTo(v.sx((o.x0 + o.x1) / 2), v.sy(Math.max(yA, yB) + 2.4), v.sx(o.x1), v.sy(yB + 0.3));
    g.stroke();
    g.setLineDash([]);
  }
}

// the air to glide on over a gap: warm ribbons rising off it, up-arrows riding them on the beat
function stream(f, o) {
  const { g, v, mf, T, t } = f,
    m = v.ppm,
    X0 = v.sx(o.x0),
    X1 = v.sx(o.x1);
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) {
    g.strokeStyle = rgba(T.jump, (0.25 + 0.35 * mf.beat) * (1 - k * 0.25));
    g.lineWidth = m * (0.08 - k * 0.02);
    g.beginPath();
    for (let X = X0; X <= X1; X += 8) {
      const u = (X - X0) / (X1 - X0 || 1);
      g.lineTo(X, v.sy(o.y + 1.5 + 0.35 * k + 0.25 * Math.sin(u * 9 - t * 4 + k)) - Math.sin(u * Math.PI) * m * 0.4);
    }
    g.stroke();
  }
  for (let x = o.x0 + 0.5; x < o.x1; x += 1.1) {
    const Y = v.sy(o.y + 1.0 + ((t * 1.5 + x * 0.3) % 1) * 1.2),
      a = 0.4 + 0.6 * mf.beat;
    g.fillStyle = rgba(T.jump, a);
    g.beginPath();
    g.moveTo(v.sx(x) - 0.14 * m, Y);
    g.lineTo(v.sx(x) + 0.14 * m, Y);
    g.lineTo(v.sx(x), Y - 0.18 * m);
    g.fill();
  }
  g.restore();
}
// a line to ride over a gap: a pole each side, the cable sagging between them, lights running along it on the hats
export function line(f, o) {
  const { g, v, mf, T, t } = f,
    m = v.ppm,
    // (a part played mini: the line as low as he is small, level.js)
    top = o.y + 2.55 * (o.mini ?? 1),
    a = o.x0 - 0.4,
    b = o.x1 + 0.4;
  g.fillStyle = '#20242c';
  for (const x of [a, b]) g.fillRect(v.sx(x) - 0.06 * m, v.sy(top + 0.2), 0.12 * m, (top + 0.2 - o.y + 4.5) * m);
  const at = u => [v.sx(a + (b - a) * u), v.sy(top - 0.35 * (o.mini ?? 1) * Math.sin(u * Math.PI))];
  g.strokeStyle = '#d9dde3';
  g.lineWidth = 0.04 * m;
  g.beginPath();
  for (let u = 0; u <= 1.001; u += 0.05) g.lineTo(...at(u));
  g.stroke();
  for (let k = 0; k < 8; k++) {
    const [X, Y] = at((k / 8 + t * 0.5) % 1);
    g.fillStyle = rgba(T.hold, 0.5 + 0.5 * mf.hat * 2);
    g.beginPath();
    g.arc(X, Y, 0.06 * m, 0, Math.PI * 2);
    g.fill();
  }
}

export function drawShafts(f) {
  const { L, t, run } = f;
  for (const s of L.segs)
    if (L.vertical(s) && t > s.t0 - 12 && t < s.t1 + 10)
      inSeg(f, s, () => {
        const speed = t >= s.t0 && t < s.t1 ? Math.abs((run.shaftY(s, t + 0.01) - run.shaftY(s, t)) / 0.01) : 0;
        // (its chute, there whether he is in it or not, shafts/index.js; its air only while he goes through it; a climb
        // has neither: its beams are the cursor's, obstacles.js)
        if (s.climb) return;
        drawWalls(f, s, speed);
        if (t > s.t0 - 0.2 && t < s.t1 + 0.6) air(f, s, speed);
      });
}

export function drawRoofs(f) {
  const { L, t } = f;
  // (only the levels near now: the stage may lay a later level where an old one was, far above or below)
  L.segs.forEach((s, i) => {
    if (s.kind === 'run' && t > s.t0 - 9 && t < s.t1 + 4) inSeg(f, s, () => roof(f, s, i));
  });
}

// the pieces of a level's floor, [a, b] each, as they are at t
export function pieces(f, s, i) {
  const { L, t, plan } = f,
    prev = L.segs[i - 1],
    next = L.segs[i + 1],
    cuts = [];
  // (a level reached through a shaft runs on behind the hole it was reached by: from below, its hatch, open until he
  // is through)
  // (a climb has no shaft: the road under it ends just past where he leaps, and the roof he climbs onto starts where he
  // lands, the beams standing free over the drop between)
  // (a road going on from a ladder up's top as a stretch of its own (level.js): the two meet where it is split)
  const a = prev?.kind === 'run' ? L.xAt(s.t0) : prev?.climb ? prev.x - 0.5 : prev ? prev.x - ON : L.xAt(s.t0) - 20,
    b = next?.kind === 'run' ? L.xAt(s.t1) : next?.climb ? next.x + 0.6 : next ? next.x + ON : L.xAt(s.t1) + ON;
  if (prev?.kind === 'rise' && !prev.climb && t < s.t0) cuts.push([prev.x - HOLE, prev.x + HOLE, 'hatch']);
  for (const o of L.obs) if ((o.type === 'hold' || o.type === 'grab' || o.type === 'glide' || o.type === 'zip' || o.type === 'grind') && o.seg === s && t >= plan.placeT(o)) cuts.push([o.x0, o.x1, o]);
  // (a ladder of islands: the road from its first edge on cut away by the cursor; the islands are drawn by themselves,
  // and the bottom, the road on at its depth, once it is pasted in)
  for (const is of L.isles ?? []) if (is.ladder && is.seg === s && t >= plan.placeT(is.head)) cuts.push([is.x0, t >= plan.placeT(is.rolls.at(-1)) ? is.x1 : b, 'ladder']);
  if (next?.kind === 'fall' && t >= next.t0) cuts.push([next.x - HOLE, next.x + HOLE, 'fall']);
  cuts.sort((p, q) => p[0] - q[0]);
  const out = [];
  let x = a;
  for (const c of cuts) {
    if (c[0] > x) out.push([x, c[0]]);
    x = Math.max(x, c[1]);
  }
  out.push([x, b]);
  return { out, cuts, prev, next };
}

function roof(f, s, i) {
  const { g, v, t, plan, T } = f,
    look = { ground: (...a) => (groundOf(f.look?.mix, s.place) ?? { draw: LOOKS[s.place].ground }).draw(...a) },
    { out, cuts, prev, next } = pieces(f, s, i);
  // (a ladder of islands down at its end: the road past its last island is its bottom, at the stretch's end height; the
  // level's depth taken from the lowest)
  const st = f.L.isles?.find(q => q.ladder && q.seg === s && t >= plan.placeT(q.head)),
    yAt = a => (st && a >= st.x1 - 0.01 ? s.y1 : s.y0),
    bottom = v.sy(Math.min(s.y0, s.y1 ?? s.y0) - THICK);
  // (off the screen only when even its highest part is below it: a ladder up has its islands high over the road it was
  // cut out of, and the camera follows him up them)
  if (bottom < -v.H || v.sy(Math.max(s.y0, s.y1 ?? s.y0)) > v.H * 2) return;
  // the place's ground, down to the slab's depth
  // (the islands cut out of it are drawn as islands, each at its height, the rest as the level)
  const isles = [];
  for (const is of f.L.isles ?? [])
    if (is.seg === s && !is.ladder && t >= plan.placeT(is.head))
      for (const p of is.pieces) {
        const k = out.findIndex(([a, b]) => Math.abs(a - p.x0) < 0.02 && Math.abs(b - p.x1) < 0.02);
        if (k >= 0) (out.splice(k, 1), isles.push([is, p]));
      }
  // (each piece down to its own slab's depth: the road a ladder is cut out of is not a cliff down to its bottom)
  for (const [a, b] of out) {
    g.save();
    g.beginPath();
    g.rect(-v.W, -v.H * 2, v.W * 3, (st ? v.sy(yAt(a) - THICK) : bottom) + v.H * 2);
    g.clip();
    look.ground(f, a, b, yAt(a));
    g.restore();
  }
  for (const [a, b] of out) underside(f, a, b, yAt(a), T.near);
  for (const [is, p] of isles) isle(f, s, p, look, { y: s.y0 + p.dy * riseOf(f, is), t0: plan.placeT(is.head), o: is.gaps[p.k], land: is.gaps[p.k].t + is.gaps[p.k].dur });
  if (st) ladder(f, s, st, look);
  for (const [a, b, what] of cuts) {
    if (what === 'fall') {
      cutFace(f, a, yAt(a), -1, Math.max(0, 1 - (t - next.t0) / 0.5));
      cutFace(f, b, yAt(a), 1, Math.max(0, 1 - (t - next.t0) / 0.5));
      tumble(f, a, b, yAt(a), t - next.t0);
    } else if (what === 'hatch') hatch(f, a, b, s.y0, s.t0);
    else if (what !== 'ladder') gap(f, what);
  }
  // the spring for a launch up, once the cursor has slammed it down
  if (next?.kind === 'rise' && !next.climb && t >= plan.placeT(plan.padOf(next))) {
    const pad = plan.padOf(next),
      since = t - next.t0,
      sq = since >= 0 && since < 0.25 ? 0.4 + 0.6 * (since / 0.25) : 1;
    drawThing(f, pad, v.sx(pad.x), v.sy(pad.y), { sq });
  }
  void prev;
}

// how far the islands of a stretch have floated to their heights: over the beat after the cursor cuts them out
function riseOf(f, is) {
  const t0 = f.plan.placeT(is.head),
    u = smooth(t0, t0 + 0.75 * f.L.A.beat, f.t);
  return u;
}

// an island: a piece of the level the cursor cut out, floated up or down to the tune's height (level.js). The place's
// ground in a chunk tapering away under it in torn steps (a piece of the simulation, not a rock), its sides lit, its
// seams glitching as it is cut, a crumb falling off it on each kick; its top flashing gold as he lands on it clean, red
// as he is carried onto it
function isle(f, s, p, look, { y, t0, o, land }) {
  const { g, v, mf, T, t, L } = f,
    m = v.ppm,
    w = p.x1 - p.x0,
    depth = Math.min(3.4, 1.3 + 0.5 * w),
    N = 6,
    seed = Math.round(p.x0 * 10);
  if (v.sx(p.x1) < -m || v.sx(p.x0) > v.W + m) return;
  // (its outline: straight down a little at either side, then stepping in, pixel by pixel, to a narrow foot)
  const side = k => {
      const pts = [];
      let x = 0;
      for (let i = 1; i <= N; i++) {
        x += ((w * 0.3) / N) * (0.5 + hash(seed + k * 7, i));
        pts.push([x, 0.45 + ((depth - 0.45) * i) / N]);
      }
      return pts;
    },
    L0 = side(0),
    R0 = side(1);
  g.save();
  g.beginPath();
  g.moveTo(v.sx(p.x0), v.sy(y + 0.3));
  g.lineTo(v.sx(p.x1), v.sy(y + 0.3));
  g.lineTo(v.sx(p.x1), v.sy(y - 0.45));
  let last = p.x1;
  for (const [dx, dd] of R0) {
    g.lineTo(v.sx(last), v.sy(y - dd));
    g.lineTo(v.sx((last = p.x1 - dx)), v.sy(y - dd));
  }
  last = p.x0 + L0.at(-1)[0];
  for (const [dx, dd] of [...L0].reverse()) {
    g.lineTo(v.sx((last = p.x0 + dx)), v.sy(y - dd));
    g.lineTo(v.sx(last), v.sy(y - dd + (depth - 0.45) / N));
  }
  g.lineTo(v.sx(p.x0), v.sy(y - 0.45));
  g.closePath();
  // (its outline lit, brighter on the kick, so a small island reads against any backdrop)
  g.strokeStyle = rgba(T.line, 0.45 + 0.45 * mf.kick);
  g.lineWidth = Math.max(2 * v.dpr, 0.06 * m);
  g.stroke();
  g.clip();
  look.ground(f, p.x0, p.x1, y);
  // (darker deeper down, so it reads as a lump hanging in the air)
  const sh = g.createLinearGradient(0, v.sy(y - 0.3), 0, v.sy(y - depth));
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(1, 'rgba(0,0,0,0.7)');
  g.fillStyle = sh;
  g.fillRect(v.sx(p.x0), v.sy(y - 0.3), w * m, depth * m);
  g.restore();
  // (its sides, lit on the kick; glitching in red and cyan while it is fresh)
  const fresh = 1 - smooth(0, 0.6, t - t0);
  g.fillStyle = rgba(T.line, 0.45 + 0.5 * mf.kick);
  for (const [x, d] of [
    [p.x0, -1],
    [p.x1, 1],
  ]) {
    g.fillRect(d < 0 ? v.sx(x) : v.sx(x) - 0.05 * m, v.sy(y), 0.05 * m, 0.45 * m);
    for (let i = 0; i < 4 * fresh; i++) {
      const h = hash(Math.floor(t * 30) + i, seed + (d > 0 ? 3 : 0));
      g.fillStyle = i % 2 ? 'rgba(255,43,58,0.85)' : 'rgba(41,231,255,0.85)';
      g.fillRect(v.sx(x), v.sy(y - h * depth), d * (0.1 + 0.3 * h) * m, 3 * v.dpr);
    }
    g.fillStyle = rgba(T.line, 0.45 + 0.5 * mf.kick);
  }
  // (a crumb off its foot on each beat, falling away into the void)
  const beat = L.A.beat,
    n = Math.floor(t / beat),
    ph = (t / beat) % 1,
    cx = p.x0 + w * (0.3 + 0.4 * hash(n, seed)),
    fall = 4.9 * (ph * beat) ** 2 + 0.6 * ph;
  g.fillStyle = rgba(T.line, 0.6 * (1 - ph));
  g.fillRect(v.sx(cx), v.sy(y - depth - fall), 0.12 * m, 0.12 * m);
  g.fillStyle = rgba('#000000', 0.5 * (1 - ph));
  g.fillRect(v.sx(cx + 0.25), v.sy(y - depth * 0.8 - fall * 1.3), 0.18 * m, 0.18 * m);
  // (landed on: gold clean, red carried)
  const since = t - land;
  if (o.res && since >= 0 && since < 0.4) {
    const a = 1 - since / 0.4;
    g.fillStyle = rgba(o.res === 'hit' ? '#ff3b52' : '#ffd84a', 0.9 * a);
    g.fillRect(v.sx(p.x0), v.sy(y) - (0.06 + 0.08 * a) * m, w * m, (0.12 + 0.16 * a) * m);
  }
}

// a ladder of islands (level.js ladder): the road ahead cut away by the cursor (its pieces tumbling into the void),
// the first island sinking to its height over the beat after the cut, each one after it pasted in where it floats (a
// flash, its seams glitching), the place's own ground on each (forest, ice, neon: the world's floor broken up, not a
// thing put on it) as the island hops' are; the bottom, the road on at its depth, pasted in last. The way of the next
// leap not yet taken drawn over it, a dashed arc from the edge to where he touches down, once that island is there
function ladder(f, s, is, look) {
  const { g, v, mf, T, t, plan, L } = f,
    m = v.ppm,
    cut = plan.placeT(is.head),
    beat = L.A.beat;
  cutFace(f, is.x0, s.y0, -1, Math.max(0, 1 - (t - cut) / 0.5));
  tumble(f, is.x0, is.pieces[0].x0 + 1.5, s.y0, t - cut);
  for (const p of is.pieces) {
    const ro = is.rolls[p.k],
      t0 = p.k ? plan.placeT(ro) : cut;
    if (t < t0) continue;
    // (the bottom: its near face lit, glitching as it is pasted; its ground is the road's, drawn with it)
    if (p.x1 === Infinity) {
      cutFace(f, p.x0, s.y1, 1, Math.max(0, 1 - (t - t0) / 0.6));
      landed(f, ro, p.x0, p.x0 + 3, s.y1);
      continue;
    }
    if (v.sx(p.x1) < -m || v.sx(p.x0) > v.W + m) continue;
    const y = s.y0 + p.dy * (p.k ? 1 : smooth(t0, t0 + 0.75 * beat, t));
    // (pasted: a white flash over its place, fading)
    if (p.k && t - t0 < 0.25) {
      g.fillStyle = `rgba(255,255,255,${0.6 * (1 - (t - t0) / 0.25)})`;
      g.fillRect(v.sx(p.x0), v.sy(y + 0.3), (p.x1 - p.x0) * m, 2 * m);
    }
    isle(f, s, p, look, { y, t0, o: ro, land: ro.t });
  }
  // (the next leap's way, while it is to come and the island it goes to is there)
  const o = is.leaps.find(q => !q.res && t < q.t + 0.1),
    ro = o && is.rolls[o.k];
  if (o && t >= plan.placeT(ro) && t >= plan.placeT(o)) {
    const a = o.edge - 0.2,
      b = o.landX,
      ya = o.yFrom + 0.3,
      yb = ro.yTo + 0.3,
      // (up: over the island it goes to, as the launch goes)
      top = Math.max(ya, yb) + (is.rise ? 2 : 1.4);
    g.setLineDash([m * 0.16, m * 0.16]);
    g.lineDashOffset = -t * m * 2;
    g.strokeStyle = rgba(T.jump, 0.5 + 0.4 * mf.beat);
    g.lineWidth = m * 0.05;
    g.beginPath();
    g.moveTo(v.sx(a), v.sy(ya));
    g.bezierCurveTo(v.sx(a + (b - a) * 0.35), v.sy(top), v.sx(a + (b - a) * 0.7), v.sy(top), v.sx(b), v.sy(yb));
    g.stroke();
    g.setLineDash([]);
  }
}
// where he touched down on the bottom of a ladder: gold clean, red hard
function landed(f, o, a, b, y) {
  const { g, v, t } = f,
    since = t - o.t;
  if (!o.res || since < 0 || since >= 0.4) return;
  const k = 1 - since / 0.4;
  g.fillStyle = rgba(o.res === 'hit' ? '#ff3b52' : '#ffd84a', 0.9 * k);
  g.fillRect(v.sx(a), v.sy(y) - (0.06 + 0.08 * k) * v.ppm, (b - a) * v.ppm, (0.12 + 0.16 * k) * v.ppm);
}

// a hatch in a level he flies up to: two doors folded down out of the way, swinging shut over the last moment before
// he lands (they meet under his feet on the beat)
function hatch(f, a, b, y, tShut) {
  const { g, v, t, T, mf } = f,
    u = smooth(tShut - 0.22, tShut, t),
    w = (b - a) / 2,
    Y = v.sy(y);
  cutFace(f, a, y, -1);
  cutFace(f, b, y, 1);
  g.fillStyle = T.near;
  for (const [hx, dir] of [
    [a, 1],
    [b, -1],
  ]) {
    // each door hinged at its edge, from hanging straight down (u = 0) to flat (u = 1)
    const ang = (1 - u) * (Math.PI / 2),
      ex = v.sx(hx + dir * w * Math.cos(ang)),
      ey = Y + w * Math.sin(ang) * v.ppm;
    g.strokeStyle = T.near;
    g.lineWidth = 0.3 * v.ppm;
    g.beginPath();
    g.moveTo(v.sx(hx), Y + 0.15 * v.ppm);
    g.lineTo(ex, ey + 0.15 * v.ppm);
    g.stroke();
    g.strokeStyle = rgba(T.line, 0.5 + 0.5 * mf.kick);
    g.lineWidth = 0.05 * v.ppm;
    g.beginPath();
    g.moveTo(v.sx(hx), Y);
    g.lineTo(ex, ey);
    g.stroke();
  }
}
