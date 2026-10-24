// The obstacles the cursor has put in the world: slammed down (a squash and spring back), pasted (a flash), knocked
// away when he hits one; each tells the hints layer where its note goes.
import { BEAM, KINDS, beamAt, beamMark } from '../../kinds.js';
import { glowDot, hash, onScreen, rgba } from '../util.js';
import { ALT, LANE } from '../../run.js';
import { drawThing } from '../things/index.js';
import { DANGER } from '../things/hazards.js';
import { mulberry } from '../../rng.js';
import { inSeg } from '../stage.js';
import { drawFoe, foePose, foeX } from './clones.js';
import { drawProp } from './props.js';
import { fistMarks } from './fistmarks.js';
import { blackoutAlpha } from './modes.js';
import { JI } from '../../lib/skeleton.js';
import { GATES } from '../shafts/storms.js';
import { drawBeam } from '../shafts/climb.js';
import { SHAFT, drawFlyby, drawGate, drawLid, drawRing, drawZone } from '../shafts/index.js';

// where each kind's note goes (metres above its base; layers/hints.js draws it), and a star phrase's star over it
const SHAFT_GATE = f => SHAFT[f.place]?.gate;
const ABOVE = { leap: 2.3, roll: 1.7, stomp: 1.6, jump: 1.7, slide: 2.4, long: 2.4, smash: 4.6, foe: 2.4, foeback: 2.4, grab: 3.1, hold: 1.4, glide: 2.5, zip: 3.4, grind: 1.1, dash: 2.3, chord: 2.4, ring: 1.6 };

// a thing's note's place, taken to the screen through the frame's transform at this moment (a mirrored or turned-over
// world, a stretch run the other way) for the hints layer to draw upright over everything
function mark(f, o, X, Y) {
  f.marks?.set(o, onScreen(f.g, X, Y));
}

// a stretch of a shaft to hold through: a storm of red lightning from wall to wall (no lane is out of it), and the one
// way through it is to hold the key: while it is held he is wrapped in a shield of the key's colour (a dart diving
// down, a bubble floating up) and the lightning breaks on it in sparks. The shield shows as a dashed ghost round him in
// the beat before, pulsing, so the press reads as "put it on" (Subway Surfers' hoverboard, Thumper's held barriers:
// the reason to hold is a thing on screen, not a rule)
function zone(f, o) {
  const { g, v, run, mf, t, T } = f,
    m = v.ppm,
    s = o.seg,
    down = o.key === 'slide',
    col = down ? T.slide : T.jump,
    ya = run.shaftY(s, o.t),
    yb = run.shaftY(s, o.t + o.dur),
    inside = t >= o.t && t <= o.t + o.dur,
    held = !!run.held[o.key];
  if (o.res === 'hit') return;
  const lo = Math.min(ya, yb),
    hi = Math.max(ya, yb),
    // (wall to wall: the shaft's walls stand 2.6 m out either side, shafts/walls.js)
    X0 = v.sx(s.x - 2.7),
    X1 = v.sx(s.x + 2.7),
    rr = mulberry(Math.floor(t * 24 + o.t * 100)),
    fade = t > o.t + o.dur ? Math.max(0, 1 - (t - o.t - o.dur) / 0.4) : 1;
  g.save();
  g.globalAlpha = fade;
  // the storm's air: a red haze over its whole length, its edges ragged
  const Y0 = v.sy(hi + 0.4),
    Y1 = v.sy(lo - 0.4),
    gr = g.createLinearGradient(0, Y0, 0, Y1);
  gr.addColorStop(0, rgba(DANGER, 0));
  gr.addColorStop(0.12, rgba(DANGER, 0.22 + 0.12 * mf.beat));
  gr.addColorStop(0.88, rgba(DANGER, 0.22 + 0.12 * mf.beat));
  gr.addColorStop(1, rgba(DANGER, 0));
  g.fillStyle = gr;
  g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
  // the place's storm through it (shafts/storms.js): lightning, sand, fire, a swarm...
  g.save();
  drawZone(f, o, { X0, X1, Y0, Y1, lo, hi }, rr);
  g.restore();
  // the field itself, the same in every place over its storm (a sandstorm on a canyon's sand or steam on a pale wall
  // alone does not show where it starts and ends): its two ends a hard red edge of light with teeth pointing in,
  // flaring on the kick, and its sides a thinner one with light running along it the way he goes
  const Ylo = v.sy(lo),
    Yhi = v.sy(hi),
    teeth = Math.max(4, Math.round((X1 - X0) / (0.45 * m)));
  for (const [Y, d] of [
    [Yhi, 1],
    [Ylo, -1],
  ]) {
    g.fillStyle = rgba(DANGER, (0.25 + 0.3 * mf.kick) * f.glow);
    g.fillRect(X0, Y - 0.22 * m, X1 - X0, 0.44 * m);
    g.fillStyle = DANGER;
    g.fillRect(X0, Y - 0.06 * m, X1 - X0, 0.12 * m);
    g.beginPath();
    for (let k = 0; k < teeth; k++) {
      const a = X0 + ((X1 - X0) * k) / teeth,
        b = X0 + ((X1 - X0) * (k + 1)) / teeth;
      g.moveTo(a, Y);
      g.lineTo((a + b) / 2, Y + d * (0.22 + 0.08 * mf.kick) * m);
      g.lineTo(b, Y);
    }
    g.fill();
    g.fillStyle = rgba('#ffffff', 0.7 + 0.3 * mf.kick);
    g.fillRect(X0, Y - 0.015 * m, X1 - X0, 0.03 * m);
  }
  g.fillStyle = rgba(DANGER, 0.75);
  for (const X of [X0, X1]) g.fillRect(X - 0.04 * m, Yhi, 0.08 * m, Ylo - Yhi);
  for (let k = 0; k < 6; k++) {
    const u = (((down ? 1 : -1) * t * 0.9 + k / 6) % 1 + 1) % 1,
      Y = Yhi + (Ylo - Yhi) * u;
    for (const X of [X0, X1]) glowDot(g, X, Y, 0.22 * m, DANGER, 0.8);
  }
  g.globalCompositeOperation = 'lighter';
  // the way to go: big arrows of the key's colour streaming down the middle
  for (let y = lo; y < hi; y += 1.2) {
    const X = v.sx(s.x),
      Y = v.sy(y + (((((down ? -t : t) * 2.6) % 1.2) + 1.2) % 1.2)),
      d = down ? 1 : -1;
    g.fillStyle = rgba(col, 0.35 + 0.5 * mf.beat);
    g.beginPath();
    g.moveTo(X - 0.4 * m, Y - d * 0.2 * m);
    g.lineTo(X, Y + d * 0.1 * m);
    g.lineTo(X + 0.4 * m, Y - d * 0.2 * m);
    g.lineTo(X, Y + d * 0.3 * m);
    g.fill();
  }
  g.restore();
  // the shield round him: on while held in the zone (sparks where the storm breaks on it); a ghost of it before
  const before = o.t - t,
    bt = f.L.A.beat;
  // (drawn with him, in his own frame (layers/hero.js), so that it is round him wherever he is drawn: turned round in a
  // shaft run into to -x, or still on the stretch before it as he drops in)
  if (inside && held) wanted = [col, down, 1, rr];
  else if (before > 0 && before < bt * 2)
    wanted = [col, down, 0.5 + 0.5 * Math.abs(Math.sin((before / bt) * Math.PI * 2)), null];
  // (its note: in his lane, at its start)
  mark(f, o, v.sx(run.laneX) + 0.9 * m, v.sy(run.shaftY(s, o.t) + 1));
}
// a shield of colour col round his body J, along it from his feet to his head: a teardrop of light diving (its point past
// his head) or a bubble floating. Drawn as energy, not an outline: a body of light brighter at its front, a hexagonal
// lattice in it shimmering in a wave that runs back from the front on the beat, a rim bright at its edge (fresnel) over
// a wide soft one, the air parting in arcs ahead of it, light streaming back over its surface; and where the storm's
// lightning (rr) hits it, flashes with crackling forks. `a`: how much of it there is (a dashed ghost before it is on)
let wanted = null;
// the shield the zones want round him this frame, if any (taken by the hero's layer, once)
export function shieldOn(f, J, show) {
  if (!wanted) return;
  if (show) shield(f, J, ...wanted);
  wanted = null;
}
function shield(f, J, col, down, a, rr) {
  const { g, v, mf, t } = f,
    m = v.ppm,
    P = n => [v.sx(J[JI[n] * 2]), v.sy(J[JI[n] * 2 + 1])],
    [hx, hy] = P('head'),
    [lx, ly] = P('ftL'),
    [rx2, ry2] = P('ftR'),
    fx = (lx + rx2) / 2,
    fy = (ly + ry2) / 2,
    ang = Math.atan2(hy - fy, hx - fx),
    ca = Math.cos(ang),
    sa = Math.sin(ang),
    cx0 = (hx + fx) / 2,
    cy0 = (hy + fy) / 2;
  // (sized to all of him, not just the line from his feet to his head: a bent neck, a flung arm, his head's own size
  // stay inside it)
  let x0 = -0.6 * m,
    x1 = 0.6 * m,
    yw = 0;
  for (let j = 0; j < J.length / 2; j++) {
    const dx = v.sx(J[j * 2]) - cx0,
      dy = v.sy(J[j * 2 + 1]) - cy0,
      px = dx * ca + dy * sa,
      py = -dx * sa + dy * ca,
      r = j === JI.head ? 0.22 * m : 0.06 * m;
    x0 = Math.min(x0, px - r);
    x1 = Math.max(x1, px + r);
    yw = Math.max(yw, Math.abs(py) + r);
  }
  const front = x1 + 0.45 * m,
    back = -x0 + 0.3 * m,
    wide = Math.max(0.75 * m, (yw + 0.12 * m) * 1.35),
    ghost = !rr;
  // the outline: +x runs from his feet to his head
  const outline = () => {
    // (a teardrop either way: its point where he is going, past his head or his fists)
    g.beginPath();
    g.moveTo(front, 0);
    g.bezierCurveTo(front * 0.8, wide * 1.0, -back * 0.6, wide * 1.05, -back, 0);
    g.bezierCurveTo(-back * 0.6, -wide * 1.05, front * 0.8, -wide * 1.0, front, 0);
  };
  g.save();
  g.translate(cx0, cy0);
  g.rotate(ang);
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = a;
  if (ghost) {
    // (before it is on: its rim dashed, turning, pulsing; nothing in it yet)
    g.setLineDash([0.22 * m, 0.14 * m]);
    g.lineDashOffset = -t * m * 3;
    g.strokeStyle = rgba(col, 0.8);
    g.lineWidth = 0.05 * m;
    outline();
    g.stroke();
    g.restore();
    return;
  }
  glowDot(g, front * 0.7, 0, wide * 1.6, col, 0.35 + 0.25 * mf.kick);
  // its body: light thick at the front, thin at the back
  const body = g.createLinearGradient(front, 0, -back, 0);
  body.addColorStop(0, rgba(col, 0.45 + 0.2 * mf.beat));
  body.addColorStop(0.45, rgba(col, 0.12));
  body.addColorStop(1, rgba(col, 0.03));
  g.fillStyle = body;
  outline();
  g.fill();
  // the lattice, clipped to it: hexagons lit by a wave running back from the front
  g.save();
  outline();
  g.clip();
  const r = 0.13 * m,
    w = r * Math.sqrt(3),
    wave = ((t / f.L.A.beat) % 1) * (front + back);
  g.lineWidth = Math.max(1, 0.012 * m);
  for (let row = -Math.ceil(wide / (r * 1.5)) - 1, rows = -row; row <= rows; row++)
    for (let x = -back - w; x < front + w; x += w) {
      const cx = x + (row % 2 ? w / 2 : 0),
        cy = row * r * 1.5,
        d = Math.abs(front - cx - wave),
        lit = Math.max(0.08, 1 - d / (0.5 * m)) * (0.5 + 0.5 * hash(Math.round(cx), row + Math.floor(t * 6)));
      g.strokeStyle = rgba('#ffffff', 0.35 * lit);
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        const q = (Math.PI / 3) * k + Math.PI / 6;
        g[k ? 'lineTo' : 'moveTo'](cx + Math.cos(q) * r * 0.92, cy + Math.sin(q) * r * 0.92);
      }
      g.closePath();
      g.stroke();
    }
  g.restore();
  // the rim: wide and soft under thin and bright
  g.strokeStyle = rgba(col, 0.3);
  g.lineWidth = 0.2 * m;
  outline();
  g.stroke();
  g.strokeStyle = rgba('#ffffff', 0.85);
  g.lineWidth = (0.035 + 0.02 * mf.kick) * m;
  g.stroke();
  // the air parting ahead of it
  for (let k = 1; k <= 3; k++) {
    const off = ((t * 4 + k / 3) % 1) * 0.6 * m;
    g.strokeStyle = rgba('#ffffff', 0.4 * (1 - off / (0.6 * m)));
    g.lineWidth = 0.025 * m;
    g.beginPath();
    g.arc(front - 0.2 * m - off, 0, 0.35 * m + off * 1.2, -0.9, 0.9);
    g.stroke();
  }
  // light streaming back over its surface
  for (let k = 0; k < 10; k++) {
    const u = (t * 1.6 + k / 10) % 1,
      x = front - u * (front + back),
      side = k % 2 ? 1 : -1,
      yy = side * wide * Math.sqrt(Math.max(0, 1 - ((x - (front - back) / 2) / ((front + back) / 2)) ** 2)) * 0.98;
    g.fillStyle = rgba('#ffffff', 0.8 * (1 - u));
    g.fillRect(x - 0.06 * m, yy - 1 * v.dpr, 0.12 * m, 2 * v.dpr);
  }
  // the storm breaking on it: a flash and a fork at a point on its rim
  for (let i = 0; i < 3; i++) {
    if (rr() > 0.55) continue;
    const q = rr() * Math.PI * 2,
      px = Math.cos(q) * (q < Math.PI / 2 || q > (3 * Math.PI) / 2 ? front : back) * 0.95,
      py = Math.sin(q) * wide * 0.95;
    glowDot(g, px, py, 0.35 * m, '#ff6a7a', 0.9);
    g.strokeStyle = rgba('#ffffff', 0.9);
    g.lineWidth = 0.02 * m;
    g.beginPath();
    g.moveTo(px, py);
    let x = px,
      y = py;
    for (let j = 0; j < 4; j++) {
      x += Math.cos(q) * 0.12 * m + (rr() - 0.5) * 0.12 * m;
      y += Math.sin(q) * 0.12 * m + (rr() - 0.5) * 0.12 * m;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  g.restore();
}
// a gate: a wall across the shaft but for one lane, and in that lane a golden ring to fly through, pulsing on the beat
function gate(f, o) {
  const { v, run, t, plan } = f,
    m = v.ppm,
    since = t - plan.placeT(o),
    Y = v.sy(o.y),
    pop = since < 0.15 ? 1 + 0.25 * (1 - since / 0.15) : 1;
  if (Y > v.H + m * 2 || Y < -m * 3) return;
  // (the place's own wall across the lanes it closes, shafts/storms.js; or its hazards, one in each)
  if (GATES[SHAFT_GATE(f)]) drawGate(f, o, o.lanes.map(l => [run.laneXOf(o.seg, l) - LANE / 2, run.laneXOf(o.seg, l) + LANE / 2]), Y);
  else for (const l of o.lanes) drawThing(f, { ...o, type: 'lane' }, v.sx(run.laneXOf(o.seg, l)), Y, { sq: 1 / pop });
  const X = v.sx(run.laneXOf(o.seg, o.free));
  ring(f, o, X, Y, 1);
}
// the way through, gold (the one thing in a shaft that is good to touch, beside the red that is not: Celeste's crystal
// over its spikes): a ring pulsing on the beat, bursting wide as he goes through it
function ring(f, o, X, Y, a) {
  const { g, v, mf, t } = f,
    m = v.ppm,
    r = (0.5 + 0.06 * mf.kick) * m,
    passed = o.res === 'ok' ? Math.min(1, (t - o.t) / 0.3) : 0;
  if (passed >= 1) return;
  glowDot(g, X, Y - 0.3 * m, r * 1.8, '#ffd84a', (0.35 + 0.3 * mf.beat) * a * (1 - passed) * f.glow);
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.strokeStyle = rgba('#ffd84a', (0.7 + 0.3 * mf.beat) * (1 - passed) * a);
  g.lineWidth = (0.09 + 0.05 * mf.kick) * m;

  g.beginPath();
  g.ellipse(X, Y - 0.3 * m, r * (1 + passed), r * 0.42 * (1 + passed), 0, 0, Math.PI * 2);
  g.stroke();
  g.restore();
}

// (every obstacle's look is outlined in black where it is drawn (things/index.js), so it reads on any background)
// (in a blackout, dim but for their beat: modes.js)
export function drawObstacles(f) {
  f.g.globalAlpha = blackoutAlpha(f);
  // (a flight: the place's things flying by, behind its rings)
  const w = f.L.flightAt?.(f.t);
  if (w) drawFlyby(f, w);
  drawString(f);
  eachObstacle(f);
  f.g.globalAlpha = 1;
}
// a solo's string (level.js: its rings on the solo's own notes): a line of light through the rings ahead, in order, so
// it draws the solo's tune; plucked as he goes through each (a wave running along it, dying away), shimmering with the
// hats; gone behind him
function drawString(f) {
  const { L, t, plan, g, v, mf } = f,
    m = v.ppm,
    rings = L.obs.filter(o => o.solo && o.type === 'ring' && o.t > t - 0.4 && o.t < t + 6 && t >= plan.placeT(o));
  if (rings.length < 2) return;
  const last = L.obs.filter(o => o.solo && o.type === 'ring' && o.t <= t).at(-1),
    pluck = last ? Math.exp(-(t - last.t) * 5) : 0;
  inSeg(f, rings[0].seg, () => {
    const pts = rings.map(o => [v.sx(o.x), v.sy(o.y + ALT[o.lane] + 0.3), o]);
    // (each stretch a quadratic through its midpoint, bent by the pluck and the shimmer: a string, not a wire)
    const path = () => {
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1],
          [x1, y1] = pts[i],
          bend = (pluck * 0.35 * Math.sin(t * 40 + i) + 0.04 * mf.hat * Math.sin(t * 23 + i * 2)) * m;
        g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + bend, x1, y1);
      }
    };
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // (its glow a wide faint stroke under a thin bright one)
    path();
    g.strokeStyle = rgba('#ffd84a', 0.18 + 0.2 * pluck);
    g.lineWidth = (0.3 + 0.2 * pluck) * m;
    g.stroke();
    path();
    g.strokeStyle = rgba('#fff3b0', 0.75 + 0.25 * mf.beat);
    g.lineWidth = (0.05 + 0.04 * pluck) * m;
    g.stroke();
    g.restore();
  });
}
function eachObstacle(f) {
  const { L, t, plan, seg, g } = f,
    ghosts = L.mods?.includes('ghosts'),
    a0 = g.globalAlpha;
  // (the farthest ahead first, so what he meets sooner is drawn over it: a clone on its box further on stands behind the
  // beam he is about to slide under, not over it)
  for (let i = L.obs.length - 1; i >= 0; i--) {
    const o = L.obs[i];
    // (a gap is the roof's; a pane kicked through is in pieces; a stretch long gone is not on screen)
    if (
      o.res === 'skip' ||
      ((o.type === 'smash' || o.type === 'foe') && o.res === 'ok' && o.skin !== 'fist') ||
      ((o.type === 'jump' || o.type === 'slide') && o.shatter) ||
      o.seg.t1 < t - 3
    )
      continue;
    if (t < plan.placeT(o) && o.type !== 'hold' && o.type !== 'glide' && o.type !== 'zip' && o.type !== 'grind')
      continue;
    if (
      (o.type === 'lane' || o.type === 'gate' || o.type === 'zone') &&
      !(o.seg === seg || (o.seg.t0 > t && o.seg.t0 - t < 1))
    )
      continue;
    // (an echo bar unseen till it gets him; a fork's hard route only once it is taken)
    // (an echo's place shows a beat before as a dashed ring: where, not what)
    if (o.echo && !o.res && o.t - t < L.A.beat && o.t > t - 0.1) inSeg(f, o.seg, () => echoMark(f, o));
    if ((o.echo && o.res !== 'hit') || (o.hard !== undefined && f.run.routes?.[o.hard] !== 'hard')) continue;
    // (ghosts: gone over the last beat and a half before its moment; what is held or ridden stays)
    const fade =
      ghosts && !o.res && o.type !== 'hold' && o.type !== 'glide' && o.type !== 'zip' && o.type !== 'grind'
        ? Math.max(0, Math.min(1, (o.t - t) / (1.5 * L.A.beat) - 0.3))
        : 1;
    if (fade <= 0) continue;
    // (in a blackout his eyes light the few metres ahead of him: what is near shows whatever the beat)
    const lit = a0 < 1 && o.x !== undefined ? 1 - Math.max(0, Math.min(1, (o.x - L.xAt(Math.max(0, t)) - 2) / 2.5)) : 0;
    g.globalAlpha = Math.max(a0, lit) * fade;
    inSeg(f, o.seg, () => {
      drawOne(f, o);
      star(f, o);
    });
  }
  g.globalAlpha = a0;
}
// a star phrase's obstacles (level.js; Guitar Hero's star notes): a gold four-pointed star turning over each, till the
// phrase is broken by a miss
function star(f, o) {
  if (o.star === undefined || o.res || f.run.stars[o.star]?.broke) return;
  const { g, v, mf, t } = f,
    m = v.ppm,
    X = v.sx(
      o.thingX ??
        (o.type === 'long' || o.type === 'hold' || o.type === 'glide' || o.type === 'zip' || o.type === 'dash'
          ? o.x0
          : o.x),
    ),
    Y = v.sy(o.y + (ABOVE[o.type] ?? 2) + 1),
    r = (0.22 + 0.06 * mf.beat) * m,
    a = t * 2;
  glowDot(g, X, Y, r * 2.2, '#ffd84a', 0.5 * f.glow);
  g.save();
  g.translate(X, Y);
  g.rotate(a);
  g.fillStyle = '#ffd84a';

  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const rr = i % 2 ? r * 0.35 : r,
      b = (i * Math.PI) / 4;
    i ? g.lineTo(Math.cos(b) * rr, Math.sin(b) * rr) : g.moveTo(rr, 0);
  }
  g.fill();
  g.restore();
}
// a plate to dive onto (a stomp): a dark slab set in the roof, cracked, its cracks glowing hot and beating with the kick;
// gone in pieces once he has come down on it (run.js: shatter)
function stomp(f, o) {
  const { v } = f;
  drawLid(f, o, v.sx(o.x), v.sy(o.y), false);
  mark(f, o, v.sx(o.x), v.sy(o.y + ABOVE.stomp));
}
// a leap down a ladder of islands (level.js ladder): the island's lip he leaps off lit in the jump's colour on the beat
// (as every edge to jump is), its note over it (the diagonal: up, or up and on)
function leap(f, o) {
  const { g, v, T, mf } = f,
    m = v.ppm,
    X = v.sx(o.edge),
    Y = v.sy(o.yFrom);
  if (o.asc) return trampoline(f, o);
  if (X < -2 * m || X > v.W + 2 * m || o.res) return;
  g.fillStyle = rgba(T.jump, 0.55 + 0.45 * mf.beat);
  g.fillRect(X - 0.6 * m, Y - 0.04 * m, 0.6 * m, 0.1 * m);
  mark(f, o, v.sx(o.x), v.sy(o.yFrom + ABOVE.leap));
}
// how each world's trampoline is made (a ladder up, level.js): a soft dome (a cloud, a mushroom's cap, a jellyfish's
// bell, a puffball), a steel plate on coil springs, a ring of neon over a pad of light, or a sports trampoline (its
// frame, springs and mat); its colours: body, the lit part
const TRAMP = {
  skies: ['dome', '#f4f8ff', '#8fd8ff'],
  forest: ['dome', '#c8323a', '#fff4d8'],
  ocean: ['dome', '#e889c8', '#b8f4ff'],
  graveyard: ['dome', '#6a4a8a', '#b8ff9a'],
  factory: ['plate', '#5a5650', '#ffb347'],
  station: ['plate', '#8a94a8', '#7af0ff'],
  moon: ['plate', '#b0b0b8', '#ffe08a'],
  wasteland: ['plate', '#7a4a2a', '#ffb347'],
  volcano: ['plate', '#2a1a16', '#ff6a2a'],
  circuit: ['plate', '#1e5a3a', '#7affb0'],
  kowloon: ['plate', '#59606e', '#ff4f9a'],
  synth: ['neon', '#1a0630', '#ff4fd8'],
  rave: ['neon', '#15151c', '#4ff0ff'],
  casino: ['neon', '#7a0e22', '#ffd84a'],
  arena: ['neon', '#14161e', '#4fa8ff'],
  mall: ['neon', '#f0d8e8', '#ff8ac8'],
  tokyo: ['neon', '#2a1418', '#ff3b52'],
  blacksnow: ['plate', '#5a5a5e', '#c81e1e'],
  holyrave: ['neon', '#14101e', '#3dff6a'],
  apocradio: ['plate', '#5a3a26', '#2fb7b0'],
  anthill: ['dome', '#8a4a22', '#ffc23a'],
  fujisan: ['dome', '#f0e8ea', '#ff7aa8'],
  lastman: ['dome', '#3a5a2a', '#d8ff7a'],
  compost: ['dome', '#5a3a1e', '#9aff5a'],
  crocsky: ['dome', '#2a5a2a', '#4ae0d0'],
};
// a trampoline on an island's edge up a ladder (level.js ladder): its lit part pulsing on the beat and brighter as his
// beat comes, chevrons over it pointing up and on (the diagonal), climbing on the beat; as he bounds onto it it gives
// under him (down a fifth of a metre by his beat), and as it launches him it springs back up past its rest and
// shivers out, a ring of light thrown off it; unpressed it gives him a dud's little throw
function trampoline(f, o) {
  const { g, v, t, mf, L } = f,
    m = v.ppm,
    x1 = o.edge - 0.05,
    x0 = x1 - 1.7,
    X0 = v.sx(x0),
    X1 = v.sx(x1),
    Y = v.sy(o.yFrom);
  if (X1 < -2 * m || X0 > v.W + 2 * m) return;
  const [kind, body, lit] = TRAMP[L.placeAt?.(o.t) ?? L.place] ?? ['mat', '#20242c', f.T.jump],
    // (when it let him go: his launch, or the dud (run.js))
    gone = o.goT ?? Infinity,
    shot = o.goT !== undefined && !o.dud,
    on = o.t - 0.14,
    k = t < on ? 0 : t < gone ? Math.min(1, ((t - on) / 0.14) ** 0.7) : (gone < t ? Math.exp(-(t - gone) / 0.11) * Math.cos(((t - gone) * Math.PI * 2) / 0.2) : 1) * (shot ? 1 : 0.5),
    near = Math.max(0, Math.min(1, 1 - (o.t - t) / (3 * L.A.beat))),
    glow = Math.min(1, 0.45 + 0.35 * mf.beat + 0.3 * near),
    H = 0.3 * m,
    top = Y - H + 0.2 * k * m,
    W = X1 - X0,
    cx = (X0 + X1) / 2;
  g.save();
  // (the chevrons over it: up and on, running up on the beat; gone once it has thrown him)
  if (!o.res || t < gone + 0.1) {
    g.strokeStyle = rgba(lit, (0.25 + 0.6 * near) * (0.7 + 0.3 * mf.beat));
    g.lineWidth = 0.07 * m;
    g.lineJoin = 'round';
    for (let i = 0; i < 3; i++) {
      const cy = top - (0.45 + 0.3 * i + 0.08 * mf.beat) * m,
        ccx = cx + (0.15 + 0.12 * i) * m;
      g.beginPath();
      g.moveTo(ccx - 0.28 * m, cy + 0.12 * m);
      g.lineTo(ccx, cy - 0.16 * m);
      g.lineTo(ccx + 0.2 * m, cy + 0.14 * m);
      g.stroke();
    }
  }
  if (kind === 'dome') {
    // (a soft dome: squashed wide as it gives, tall as it springs back; a lit rim, a few spots on it)
    const sq = 1 - 0.55 * k;
    g.fillStyle = body;
    g.beginPath();
    g.ellipse(cx, Y, W / 2 + 0.08 * k * m, H * 1.35 * sq, 0, Math.PI, 0);
    g.fill();
    g.fillStyle = rgba(lit, 0.5 * glow);
    g.beginPath();
    g.ellipse(cx, Y, W / 2 - 0.12 * m, H * 1.35 * sq - 0.08 * m, 0, Math.PI, 0);
    g.fill();
    g.fillStyle = rgba('#ffffff', 0.55);
    for (const [dx, dy, r] of [[-0.45, 0.55, 0.09], [0.1, 0.8, 0.07], [0.5, 0.45, 0.06]]) {
      g.beginPath();
      g.arc(cx + dx * W * 0.5, Y - dy * H * 1.35 * sq, r * m, 0, Math.PI * 2);
      g.fill();
    }
  } else {
    // (a frame on legs, its springs, the mat or plate on top: the springs shortened as it gives)
    const legs = kind === 'plate' ? 3 : 2;
    g.fillStyle = kind === 'neon' ? '#0c0c12' : '#1a1c22';
    g.fillRect(X0, Y - 0.08 * m, W, 0.08 * m);
    g.strokeStyle = kind === 'plate' ? rgba(lit, 0.5 + 0.4 * glow) : rgba('#c8ccd4', 0.8);
    g.lineWidth = Math.max(1, 0.035 * m);
    for (let i = 0; i <= legs + 2; i++) {
      const sx = X0 + (W * (i + 0.5)) / (legs + 3);
      g.beginPath();
      // (a coil: zigzag from the frame up to the mat)
      const n = 4,
        y0 = Y - 0.08 * m,
        y1 = top + 0.06 * m;
      g.moveTo(sx, y0);
      for (let q = 1; q <= n; q++) g.lineTo(sx + (q % 2 ? 0.06 : -0.06) * m, y0 + ((y1 - y0) * q) / n);
      g.stroke();
    }
    g.fillStyle = body;
    g.fillRect(X0 - 0.04 * m, top, W + 0.08 * m, 0.09 * m);
    g.fillStyle = rgba(lit, kind === 'neon' ? glow : 0.4 + 0.5 * glow);
    g.fillRect(X0 + 0.06 * m, top - 0.035 * m, W - 0.12 * m, 0.05 * m);
    if (kind === 'neon') glowDot(g, cx, top, 0.9 * m, lit, 0.25 * glow);
  }
  // (thrown off as it launches him: a ring of light spreading and fading)
  const sinceGo = t - gone;
  if (sinceGo >= 0 && sinceGo < 0.35 && shot) {
    const e = sinceGo / 0.35;
    g.strokeStyle = rgba(lit, 0.8 * (1 - e));
    g.lineWidth = 0.08 * m * (1 - e) + 1;
    g.beginPath();
    g.ellipse(cx, top, (W / 2) * (1 + 1.2 * e), 0.25 * m * (1 + 2 * e), 0, 0, Math.PI * 2);
    g.stroke();
  }
  g.restore();
  if (!o.res) mark(f, o, v.sx(o.x), v.sy(o.yFrom + ABOVE.leap));
}
// a touch on an island of a ladder (level.js ladder): where his feet will come down on it, a pane of glass set in the
// island's top at its lip, in the roll's colour: it holds a roll (his weight spread over it), not a stiff landing.
// A ring on it closes to its spot as the beat comes (the next one only, the ones after faint), its note over it, and
// his shadow on it grows and darkens as he falls to it, so the touch is seen coming. Touched: gold for a roll; landed
// on stiff it cracks under his feet, and as the touch's window passes it gives way, red, its hole left in the island
function roll(f, o) {
  const { g, v, t, T, mf, L, run } = f,
    m = v.ppm,
    X = v.sx(o.x),
    Y = v.sy(o.y);
  if (X < -2 * m || X > v.W + 2 * m) return;
  const since = t - o.t,
    a0 = v.sx(o.x - 0.35),
    w = 1.25 * m,
    broke = o.res === 'hit' && o.hitT >= o.t - 0.05 && t >= o.hitT,
    cracked = !broke && since >= 0 && o.res !== 'ok';
  // (the pane: dark glass, its top edge lit; broken, a jagged hole with the island's dark under it)
  g.save();
  if (broke) {
    g.fillStyle = 'rgba(0,0,0,0.75)';
    g.beginPath();
    g.moveTo(a0, Y);
    for (let i = 0; i <= 8; i++) g.lineTo(a0 + (w * i) / 8, Y + (0.12 + 0.18 * hash(i, Math.round(o.t * 10))) * m);
    g.lineTo(a0 + w, Y);
    g.closePath();
    g.fill();
  } else {
    g.fillStyle = rgba(T.slide, 0.35 + 0.15 * mf.beat);
    g.fillRect(a0, Y - 0.02 * m, w, 0.22 * m);
    g.fillStyle = rgba('#ffffff', 0.6 + 0.3 * mf.beat);
    g.fillRect(a0, Y - 0.04 * m, w, 0.045 * m);
    // (its frame and the glints slanting across it)
    g.fillRect(a0, Y - 0.04 * m, 0.04 * m, 0.26 * m);
    g.fillRect(a0 + w - 0.04 * m, Y - 0.04 * m, 0.04 * m, 0.26 * m);
    g.strokeStyle = 'rgba(255,255,255,0.45)';
    g.lineWidth = Math.max(1, 0.03 * m);
    g.beginPath();
    for (const k of [0.18, 0.3, 0.62]) (g.moveTo(a0 + w * k, Y + 0.17 * m), g.lineTo(a0 + w * k + 0.12 * m, Y + 0.01 * m));
    g.stroke();
    if (cracked) {
      // (cracks running out from under his feet, more as the window runs out)
      const n = 3 + Math.floor(5 * Math.min(1, since / L.difficulty.near));
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineWidth = Math.max(1, 0.02 * m);
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const dx = (hash(i, 7) - 0.5) * w * 0.9;
        g.moveTo(X, Y + 0.02 * m);
        g.lineTo(X + dx * 0.5, Y + 0.06 * m + hash(i, 3) * 0.04 * m);
        g.lineTo(X + dx, Y + 0.1 * m);
      }
      g.stroke();
    }
  }
  g.restore();
  if (since >= 0) {
    if (o.res && since < 0.4) {
      const a = 1 - since / 0.4;
      g.fillStyle = rgba(o.res === 'hit' ? '#ff3b52' : '#ffd84a', 0.9 * a);
      g.fillRect(X - (0.9 + since * 3) * m, Y - (0.05 + 0.08 * a) * m, (1.8 + since * 6) * m, (0.1 + 0.16 * a) * m);
    }
    return;
  }
  // (his shadow on it as he falls to it: wider and darker the nearer he is; over the island only)
  const flying = run.jump?.drop === o || (run.short?.ro === o && !run.short.c);
  if (flying) {
    const hx = run.heroX(t),
      h = Math.max(0, run.y - o.y),
      k = Math.max(0, Math.min(1, 1 - h / 6));
    if (hx > o.x - 0.45) {
      g.fillStyle = `rgba(0,0,0,${0.15 + 0.5 * k})`;
      g.beginPath();
      g.ellipse(v.sx(hx), Y - 0.02 * m, (0.25 + 0.35 * k) * m, (0.05 + 0.05 * k) * m, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  const is = L.isles[o.isle],
    next = is.rolls.find(q => !q.res) === o,
    lead = 2 * L.A.beat,
    u = Math.max(0, Math.min(1, 1 - -since / lead)),
    r = (0.9 - 0.55 * u) * m,
    a = next ? 0.45 + 0.5 * u : 0.2;
  g.save();
  g.strokeStyle = rgba(T.slide, a * (0.75 + 0.25 * mf.beat));
  g.lineWidth = (0.05 + 0.05 * u) * m;
  g.beginPath();
  g.ellipse(X, Y, r, r * 0.3, 0, 0, Math.PI * 2);
  g.stroke();
  // (the spot itself, filling as the beat comes)
  g.fillStyle = rgba(T.slide, a * 0.6 * u);
  g.beginPath();
  g.ellipse(X, Y, 0.35 * m, 0.1 * m, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
  if (!o.res) mark(f, o, X, v.sy(o.y + ABOVE.roll));
}
// a lid over the top of a shaft he flies up (a hatch): a wide steel slab across the shaft's mouth, riveted, its
// underside cracked and glowing cold and beating with the kick; its note under it, where he comes up from
function hatch(f, o) {
  const { v } = f;
  drawLid(f, o, v.sx(o.x), v.sy(o.y), true);
  mark(f, o, v.sx(o.x), v.sy(o.y - 1.2));
}
// a climb's beam: let go out of the sky a second before its beat, falling free (kinds.js beamAt), leaning, the side he
// kicks lit gold while it is the next and flashing on its beat; kicked, flung away spinning, falling on out of sight
function tic(f, o) {
  const { g, v, mf, t, L, T } = f,
    m = v.ppm,
    beat = L.A.beat,
    nx = L.obs.find(q => q.type === 'tic' && q.seg === o.seg && q.k === o.k + 1);
  // (the way to the next hold, over the beat and a half before he leaps for it: a dashed arc from this one (the road's
  // launch plate, or the grip on this beam) to where the next beam will be gripped on its beat, as high as the leap)
  if (nx && !o.res && t > o.t - 1.5 * beat && t < o.t + 0.05 && t >= f.plan.placeT(nx)) {
    const a = o.floor ? { x: o.x, y: o.y } : beamMark(o, t),
      b = beamMark(nx, nx.t),
      k = Math.min(1, (t - (o.t - 1.5 * beat)) / (0.5 * beat));
    g.save();
    g.setLineDash([m * 0.16, m * 0.14]);
    g.lineDashOffset = -t * m * 2;
    g.strokeStyle = rgba(T.jump, (0.45 + 0.4 * mf.beat) * k);
    g.lineWidth = m * 0.06;
    g.beginPath();
    g.moveTo(v.sx(a.x), v.sy(a.y + 0.4));
    g.quadraticCurveTo(v.sx((a.x + b.x) / 2), v.sy(Math.max(a.y, b.y) + 2.0), v.sx(b.x), v.sy(b.y + 0.4));
    g.stroke();
    g.restore();
  }
  // (the road's edge, where he leaps at the first beam: a launch plate there from afar, its note over it, its ring
  // closing on its beat like every note's)
  if (o.floor) {
    launch(f, o);
    if (!o.res) mark(f, o, v.sx(o.x), v.sy(o.y + 2.2));
    return;
  }
  // (in the cursor's hand until it lets go: cursor.js draws it there)
  if (t < f.plan.placeT(o)) return;
  const B = beamAt(o, t),
    X = v.sx(B.x),
    Y = v.sy(B.y),
    dt = o.t - t,
    lit = B.kicked ? 0 : Math.max(0, 1 - Math.abs(dt) / 0.3),
    next = !B.kicked && dt > 0 && dt < 2 * L.A.beat;
  if (Y > v.H + BEAM.LEN * m || Y < -BEAM.LEN * m * 2) return;
  if (next) glowDot(g, X, Y, (1.4 + 0.3 * mf.kick) * m, '#ffd84a', 0.25 + 0.4 * lit);
  // (falling: streaks of the air it tears through trailing up off it, as long as it is fast, and grit shed behind it)
  if (!B.held && B.v > 1) {
    const L2 = Math.min(5, B.v * 0.16) * m,
      hl = (B.look.len / 2) * m,
      cx = Math.sin(B.rot),
      cy = Math.cos(B.rot);
    g.save();
    g.lineCap = 'round';
    for (const [off, a] of [[-0.6, 0.35], [0, 0.5], [0.6, 0.35]]) {
      const x0 = X + off * B.look.w * m * cy - cx * hl,
        y0 = Y - off * B.look.w * m * cx - cy * hl,
        gr = g.createLinearGradient(x0, y0, x0, y0 - L2);
      gr.addColorStop(0, `rgba(255,255,255,${a})`);
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.strokeStyle = gr;
      g.lineWidth = (0.05 + 0.03 * mf.hat) * m;
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x0, y0 - L2);
      g.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const u = ((t * 3 + i * 0.37 + o.t) % 1),
        gx = X + (Math.sin(i * 12.9 + o.t) * 0.5) * B.look.w * m * 2,
        gy = Y - hl - u * L2 * 1.2;
      g.fillStyle = `rgba(255,255,255,${0.5 * (1 - u)})`;
      g.fillRect(gx, gy, 0.05 * m, 0.05 * m);
    }
    g.restore();
  }
  // (pasted: popping in a little big, flashing white, as everything the cursor pastes does)
  const since = t - f.plan.placeT(o),
    pop = since < 0.15 ? 1 + 0.25 * (1 - since / 0.15) : 1;
  drawBeam(g, f.place, X, Y, B.rot, m, B.look.len * pop, B.look.w * pop, Math.max(lit, next ? 0.35 * mf.beat : 0), mf, -B.side, B.look.kind);
  if (since < 0.25) {
    g.save();
    g.translate(X, Y);
    g.rotate(-B.rot);
    g.fillStyle = `rgba(255,255,255,${0.8 * (1 - since / 0.25)})`;
    g.fillRect(-(B.look.w / 2 + 0.2) * m, -(B.look.len / 2 + 0.2) * m, (B.look.w + 0.4) * m, (B.look.len + 0.4) * m);
    g.restore();
  }
  // (its grip: where his feet will meet it, a ring closing on it over the two beats before its beat, the hold lit)
  if (!o.res && dt > -0.05 && dt < 2 * beat) {
    const P = beamMark(o, t),
      u = Math.max(0, Math.min(1, 1 - dt / (2 * beat))),
      r = (1.0 - 0.7 * u) * m;
    g.save();
    g.strokeStyle = rgba(T.jump, (0.4 + 0.5 * u) * (0.75 + 0.25 * mf.beat));
    g.lineWidth = (0.05 + 0.04 * u) * m;
    g.beginPath();
    g.arc(v.sx(P.x), v.sy(P.y + 0.3), r, 0, Math.PI * 2);
    g.stroke();
    glowDot(g, v.sx(P.x), v.sy(P.y + 0.3), 0.35 * m, T.jump, 0.3 + 0.6 * u);
    g.restore();
  }
  // (each beam carries its own note over its top: the press that kicks him off it, to the other side (the road's edge's
  // stays at the edge); seen from the moment it is pasted, over everything, clear of him)
  const hl = B.look.len / 2 + 0.7;
  if (!o.res) mark(f, o, v.sx(B.x - Math.sin(B.rot) * hl), v.sy(B.y + Math.cos(B.rot) * hl));
}
// the launch plate at the road's edge before a climb over beams: a springboard set in the road where he must take
// off, chevrons on it pointing up and out the way the first beam is (the diagonal), lit on the beat and brighter as
// his beat comes, a column of light over it so it is seen from afar; sprung (squashed and flashing) as he leaves it
function launch(f, o) {
  const { g, v, mf, t, T } = f,
    m = v.ppm,
    d = o.keys[1] === 'right' ? 1 : -1,
    X = v.sx(o.x),
    Y = v.sy(o.y),
    dt = o.t - t,
    near = Math.max(0, Math.min(1, 1 - dt / 1.5)),
    sprung = dt < 0 && dt > -0.25 ? 1 + dt / 0.25 : 0;
  if (X < -3 * m || X > v.W + 3 * m) return;
  const x0 = X - d * 1.5 * m,
    w = 1.7 * m * d;
  g.save();
  // (the column of light over it)
  const gr = g.createLinearGradient(0, Y, 0, Y - 5 * m);
  gr.addColorStop(0, rgba(T.jump, (0.18 + 0.25 * near) * (0.7 + 0.3 * mf.beat)));
  gr.addColorStop(1, rgba(T.jump, 0));
  g.fillStyle = gr;
  g.fillRect(Math.min(x0, x0 + w), Y - 5 * m, Math.abs(w), 5 * m);
  // (the plate: dark, its lip lit, raised a hand on its springs, squashed as he leaves it)
  const h = (0.14 - 0.08 * sprung) * m;
  g.fillStyle = '#16181f';
  g.fillRect(Math.min(x0, x0 + w), Y - h, Math.abs(w), h);
  g.fillStyle = rgba(T.jump, 0.6 + 0.4 * Math.max(mf.beat, sprung));
  g.fillRect(Math.min(x0, x0 + w), Y - h - 0.04 * m, Math.abs(w), 0.05 * m);
  // (chevrons pointing up and out, running towards the edge on the beat)
  g.strokeStyle = rgba(T.jump, 0.55 + 0.45 * Math.max(near * mf.beat, sprung));
  g.lineWidth = 0.07 * m;
  g.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    const cx = x0 + w * (0.25 + 0.27 * i + 0.06 * mf.beat),
      cy = Y - h - (0.35 + 0.18 * i) * m;
    g.beginPath();
    g.moveTo(cx - d * 0.18 * m, cy + 0.02 * m);
    g.lineTo(cx + d * 0.08 * m, cy - 0.22 * m);
    g.lineTo(cx + d * 0.26 * m, cy + 0.05 * m);
    g.stroke();
  }
  g.restore();
}
// the beat a hazard snaps in on: the first one after it is pasted, at least a beat before it matters
function snapAt(f, o) {
  const p = f.plan.placeT(o),
    B = f.L.A.beats,
    bt = f.L.A.beat,
    b = B.find(q => q > p + 0.05) ?? p;
  return Math.min(b, o.t - bt);
}
// a ring of a flight: gold, upright, at its height, pulsing on the beat; the heights it is not at are marked faintly
// on the same line (the three heights he can be at), so where to be reads at a glance
function ringOf(f, o) {
  const { g, v, mf, t } = f,
    m = v.ppm,
    X = v.sx(o.x);
  if (X < -m || X > v.W + m) return;
  for (let l = 0; l < 3; l++) {
    const Y = v.sy(o.y + ALT[l] + 0.3);
    if (l !== o.lane) {
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.beginPath();
      g.arc(X, Y, 0.06 * m, 0, Math.PI * 2);
      g.fill();
      continue;
    }
    const passed = o.res === 'ok' ? Math.min(1, (t - o.t) / 0.3) : 0,
      hit = o.res === 'hit';
    if (passed >= 1) continue;
    // (the place's ring, shafts/flight.js; flashing on the syllable or beat it is on as he comes to it)
    const r = (0.62 + 0.08 * mf.kick) * m * (1 + passed);
    drawRing(f, o, X, Y, r, passed, hit);
  }
  // (over the ring to go through, at its height: the flight's rings are at three)
  mark(f, o, X, v.sy(o.y + ALT[o.lane] + ABOVE.ring));
}
// a chord: the thing (low, to jump; or hanging, to slide under) and the clone running at him behind it; its note stays
// on the thing, which stands still, not on the clone walking in
function chord(f, o) {
  const { v, t, plan } = f,
    since = t - plan.placeT(o),
    up = o.keys[0] === 'jump',
    Y = v.sy(o.y);
  if (!o.shatter)
    drawThing(f, { ...o, type: up ? 'jump' : 'slide', h: up ? o.h : 0, passT: o.thingT }, v.sx(o.thingX), Y, {
      sq: since < 0.2 ? 1 - 0.18 * Math.sin((since / 0.2) * Math.PI) : 1,
    });
  if (o.res === 'ok') return;
  drawFoe(f, o, since);
  if (!o.res) mark(f, o, v.sx(o.thingX), v.sy(o.y + (up ? (o.h ?? 0.7) + 1 : ABOVE.chord)));
}
function drawOne(f, o) {
  const { g, v, run, t, plan } = f,
    m = v.ppm;
  // (a leap between islands: over its higher side)
  if (o.type === 'hold') return mark(f, o, v.sx((o.x0 + o.x1) / 2), v.sy((o.isle !== undefined ? Math.max(o.yFrom, o.yTo) : o.y) + ABOVE.hold));
  // (a held stretch over a gap: its note at its start)
  if (o.type === 'glide' || o.type === 'zip' || o.type === 'grind') return mark(f, o, v.sx(o.x0), v.sy(o.y + ABOVE[o.type] * (o.mini ?? 1)));
  if (o.type === 'ring') return ringOf(f, o);
  if (o.type === 'tic') return tic(f, o);
  if (o.type === 'stomp') return stomp(f, o);
  if (o.type === 'roll') return roll(f, o);
  if (o.type === 'leap') return leap(f, o);
  // (the props: a throw at him, a thing on the roof, a throw's target; layers/props.js)
  if (o.type === 'bat' || o.type === 'pick' || o.type === 'throw') return drawProp(f, o);
  if (o.type === 'hatch') return hatch(f, o);
  if (o.type === 'zone') return zone(f, o);
  if (o.type === 'gate') return gate(f, o);
  if (o.type === 'chord') return chord(f, o);
  const since = t - plan.placeT(o);
  // a corridor of panes: each standing till he dashes through it (or all of them, once he has hit one)
  if (o.type === 'dash') {
    for (const [i, px] of o.panes.entries()) {
      if (o.broke[i] && o.res !== 'hit') continue;
      drawThing(f, { ...o, type: 'smash' }, v.sx(px), v.sy(o.y), {
        sq: since < 0.2 ? 1 - 0.18 * Math.sin((since / 0.2) * Math.PI) : 1,
      });
    }
    return mark(f, o, v.sx(o.x0), v.sy(o.y + ABOVE.dash));
  }
  // the boss's fist: coming down out of the sky at him
  // (a boss's fist and a piece of the cursor are kicked like a clone: their move is shown like one's)
  if (o.skin === 'fist' || o.skin === 'bit') return o.skin === 'fist' ? fist(f, o) : bit(f, o);
  // a clone: running at him (or up behind him), pasted in with a flash; one that got him glitches out
  if (o.type === 'foe' || o.type === 'foeback') {
    if (o.res === 'ok') return;
    const J = foePose(f, o, t);
    // (its strike telegraphed: a pink zone on the roof under it, pulsing faster through the last beat)
    const left = o.t + f.L.M.kickAt - t,
      bt = f.L.A.beat;
    if (!o.res && left > 0 && left < bt * 1.5) {
      const p = left < bt / 2 ? 8 : left < bt ? 4 : 2,
        a = (0.25 + 0.45 * (1 - left / (bt * 1.5))) * (0.6 + 0.4 * Math.abs(Math.sin((left / bt) * p * Math.PI)));
      g.fillStyle = `rgba(255,60,170,${a})`;
      g.beginPath();
      g.ellipse(v.sx(J[0]), v.sy(o.y), 0.8 * m, 0.14 * m, 0, 0, Math.PI * 2);
      g.fill();
    }
    if (!drawFoe(f, o, since, o.res === 'hit' ? null : J)) return;
    if (since < 0.25) {
      g.fillStyle = `rgba(255,255,255,${0.7 * (1 - since / 0.25)})`;
      g.fillRect(v.sx(J[0]) - 0.5 * m, v.sy(o.y + 1.9), m, 1.9 * m);
    }
    if (!o.res) mark(f, o, v.sx(J[0]), v.sy(o.y + ABOVE[o.type]));
    return;
  }
  const xs = o.type === 'lane' ? o.lanes.map(l => run.laneXOf(o.seg, l)) : [o.x],
    Y = v.sy(o.y);
  if (Y > v.H + m * 2 || Y < -m * 3 || xs.every(x => v.sx(x) > v.W + m || v.sx(x) < -m * 2)) return;
  const broke = o.res === 'hit' ? t - o.hitT : -1;
  g.save();
  if (broke >= 0) {
    g.globalAlpha = Math.max(0, 1 - broke / 0.6);
    g.translate(broke * m * 3, -broke * m * 1.5 + broke * broke * m * 10);
  }
  for (const x of xs) {
    const X = v.sx(x);
    if (o.type === 'lane') {
      // (a hazard comes in as Just Shapes & Beats' do: its ghost first, faint and drifting in from the shaft's wall, then
      // on the next beat it snaps into his lane with a flash; a first shaft's are only pasted in)
      const snap = o.tier ? snapAt(f, o) : plan.placeT(o),
        sn = t - snap;
      if (sn < 0) {
        const u = Math.max(0, Math.min(1, (t - plan.placeT(o)) / Math.max(0.05, snap - plan.placeT(o)))),
          side = x < o.seg.x ? -1 : x > o.seg.x ? 1 : hash(Math.round(o.t * 10), 3) < 0.5 ? -1 : 1,
          ga = g.globalAlpha;
        g.globalAlpha = ga * (0.18 + 0.22 * u);
        drawThing(f, o, X + side * (1 - u) * (1 - u) * LANE * 1.4 * m, Y, { sq: 0.85 });
        g.globalAlpha = ga;
        continue;
      }
      const pop = sn < 0.15 ? 1 + 0.35 * (1 - sn / 0.15) : 1;
      drawThing(f, o, X, Y, { sq: 1 / pop });
      if (sn < 0.25) {
        g.fillStyle = `rgba(255,255,255,${0.8 * (1 - sn / 0.25)})`;
        g.fillRect(X - LANE * 0.5 * m, Y - 0.7 * m, LANE * m, 0.8 * m);
      }
      // (the way past it, nearest to where he is: a fainter ring when he is already in it)
      if (!o.res || o.res === 'ok') {
        const free = [0, 1, 2]
          .filter(l => !o.lanes.includes(l))
          .sort((a, b) => Math.abs(a - run.lane) - Math.abs(b - run.lane))[0];
        ring(f, o, v.sx(run.laneXOf(o.seg, free)), Y, free === run.lane ? 0.45 : 0.85);
      }
    } else {
      const sq = since < 0.2 ? 1 - 0.18 * Math.sin((since / 0.2) * Math.PI) : 1;
      drawThing(f, o, X, Y, { sq, u: KINDS[o.type].cursor(o) === 'paint' ? plan.paintU(o, t) : 1 });
    }
  }
  g.restore();
  // (a long ceiling stays marked while it is held: its note rides with him)
  if (o.res === 'hit' || o.type === 'lane') return;
  if (o.type === 'long') return mark(f, o, v.sx(o.x0), v.sy(o.y + ABOVE.long * (o.mini ?? 1)));
  if (o.res) return;
  mark(f, o, v.sx(o.x), v.sy(o.y + (o.type === 'jump' ? (o.h ?? 0.8) + 0.9 : (ABOVE[o.type] ?? 2) * (o.mini ?? 1))));
}

// the boss's fist (level.js: its act's things turned into its blows): the cursor's giant pointing hand, in the boss's
// colour, driving down out of the sky to where his kick meets it on the beat; kicked back it flies up and away, if it
// gets him it slams the roof
// (how long the fist alone hangs where it was struck before it flies: its own hit-stop, the picture running on)
const FIST_HOLD = 0.06;
function fist(f, o) {
  const { g, v, t, L, T, mf } = f,
    m = v.ppm,
    c = o.t + L.M.kickAt,
    // (kicked back: from the blow, after the fist's own hit-stop)
    hitAt = o.res === 'ok' ? (o.okT ?? c) : Infinity,
    kb = o.res === 'ok' ? Math.max(0, t - hitAt - FIST_HOLD) : -1,
    // (coming down; stopped where the kick met it)
    u = Math.max(0, Math.min(1, 1 - (c - Math.min(t, hitAt)) / (2 * L.A.beat))),
    // (knocked back whole along the kick, forward and up, tipping over; its arm a spring hauling it back up into the
    // sky, harder the longer it goes: a thing struck, not a thing switched off)
    kx = kb > 0 ? 2.6 * (1 - Math.exp(-kb / 0.12)) : 0,
    ky = kb > 0 ? 1.4 * (1 - Math.exp(-kb / 0.1)) + 22 * kb * kb * kb + 4 * kb * kb : 0,
    tip = kb > 0 ? -0.75 * (1 - Math.exp(-kb / 0.09)) * (1 - 0.6 * Math.min(1, kb / 0.5)) : 0,
    // (and in its hold, shaken by the blow)
    shake = o.res === 'ok' && kb <= 0 ? 0.04 * Math.sin((t - hitAt) * 190) : 0,
    X = v.sx(o.x + 0.4 + kx + shake),
    top = v.sy(o.y + 12),
    Y = top + (v.sy(o.y + 1.1) - top) * u * u - ky * m,
    s = (0.9 + 0.1 * mf.kick) * m;
  // (its marks on the roof where it comes down: layers/fistmarks.js)
  fistMarks(f, o, c, T.hold);
  if (o.res === 'hit' && t - o.hitT > 0.5) return;
  if (o.res === 'ok' && kb > 0.55) return;
  g.save();
  g.translate(X, Y);
  g.rotate(tip);
  // (its arm back up to the sky)
  g.fillStyle = '#0b0b10';
  g.strokeStyle = T.hold;
  g.lineWidth = 0.08 * m;
  g.fillRect(-0.32 * s, -v.H, 0.64 * s, v.H - 0.5 * s);
  g.strokeRect(-0.32 * s, -v.H, 0.64 * s, v.H - 0.5 * s);
  // (the fist: a block of knuckles, its pointing finger down)
  g.beginPath();
  g.roundRect(-0.55 * s, -0.7 * s, 1.1 * s, 0.75 * s, 0.18 * s);
  g.fill();
  g.stroke();
  g.beginPath();
  g.roundRect(-0.14 * s, -0.05 * s, 0.28 * s, 0.55 * s, 0.12 * s);
  g.fill();
  g.stroke();
  g.strokeStyle = rgba(T.hold, 0.6);
  g.lineWidth = 0.04 * m;
  for (let i = 1; i < 4; i++) {
    g.beginPath();
    g.moveTo(-0.55 * s + i * 0.275 * s, -0.7 * s);
    g.lineTo(-0.55 * s + i * 0.275 * s, -0.3 * s);
    g.stroke();
  }
  glowDot(g, 0, -0.3 * s, 1.4 * s, T.hold, 0.35 + 0.3 * mf.kick);
  // (struck: white-hot through its hold, cooling as it flies)
  if (o.res === 'ok' && kb < 0.15) glowDot(g, 0, -0.3 * s, 1.1 * s, '#ffffff', 0.9 * (1 - kb / 0.15));
  g.restore();
  // (where it will land: a shadow on the roof darkening as it comes, and its note on the way at his height, still)
  if (o.res) return;
  g.fillStyle = `rgba(0,0,0,${0.25 + 0.5 * Math.max(0, u)})`;
  g.beginPath();
  g.ellipse(X, v.sy(o.y), (0.35 + 0.4 * Math.max(0, u)) * m, 0.12 * m, 0, 0, Math.PI * 2);
  g.fill();
  mark(f, o, X, v.sy(o.y + 1));
}

// where an echo's thing is (played from memory): a dashed ring closing in on its beat
function echoMark(f, o) {
  const { g, v, t, L } = f,
    m = v.ppm,
    u = Math.max(0, (o.t - t) / L.A.beat);
  g.save();
  g.setLineDash([0.12 * m, 0.1 * m]);
  g.lineDashOffset = -t * m;
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = 0.05 * m;
  g.beginPath();
  g.arc(v.sx(o.x), v.sy(o.y + 0.9), (0.45 + 0.6 * u) * m, 0, Math.PI * 2);
  g.stroke();
  g.restore();
}

// a piece of the fleeing cursor (a cursor chase, level.js): its arrow, big as he is, sliding at him glitching red and
// cyan, to be kicked to bits on the beat
function bit(f, o) {
  if (o.res === 'ok' || (o.res === 'hit' && f.t - o.hitT > 0.4)) return;
  const { g, v, t, mf } = f,
    m = v.ppm,
    X = v.sx(foeX(f.L, o, o.res === 'hit' ? o.hitT : t)),
    Y = v.sy(o.y + 1.6 + 0.1 * mf.beat),
    u = 1.1 * m,
    P = [
      [0, 0],
      [0, 1],
      [0.24, 0.77],
      [0.42, 1.18],
      [0.58, 1.11],
      [0.4, 0.72],
      [0.71, 0.72],
    ];
  const arrow = (dx, col, stroke) => {
    g.beginPath();
    P.forEach(([x, y], i) => (i ? g.lineTo(X + dx - x * u, Y + y * u) : g.moveTo(X + dx - x * u, Y + y * u)));
    g.closePath();
    g.fillStyle = col;
    g.fill();
    if (stroke) {
      g.strokeStyle = stroke;
      g.lineWidth = 0.06 * m;
      g.stroke();
    }
  };
  g.save();
  g.globalAlpha *= 0.7;
  arrow(-0.08 * m * (1 + mf.snare), '#29e7ff');
  arrow(0.08 * m * (1 + mf.snare), '#ff2b3a');
  g.globalAlpha /= 0.7;
  arrow(0, '#ffffff', '#000000');
  g.restore();
  if (!o.res) mark(f, o, X - 0.3 * m, v.sy(o.y + 2.6));
}
