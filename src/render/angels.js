// The angels' drawing, shared by their parts (world/parts/atl/angels.js) and the ophan threat (layers/props.js): an
// eye as the oldest descriptions cover them with, and the wheel within wheels.
import { glowDot, hash, rgba } from './util.js';

const TAU = Math.PI * 2,
  GOLD = '#ffd060';

// an eye, white and almond-shaped with a gold rim and its iris looking one of eight ways (or shut: a gold lash line),
// painted once a size step (a quarter octave: the wheels breathing with the bass never paint one anew) and stamped at the
// size asked: one stamp an eye
const EYES = new Map();
const step = r => 2 ** (Math.ceil(Math.log2(Math.max(2, r)) * 4) / 4);
export function eyeSprite(r, way) {
  const R = step(r),
    key = `${R}|${way}`;
  let c = EYES.get(key);
  if (c) return c;
  const W = Math.ceil(R * 2 + 4),
    H = Math.ceil(R * 1.3) + 4;
  c = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const g = c.getContext('2d'),
    ox = W / 2,
    oy = H / 2;
  if (way < 0) {
    g.strokeStyle = GOLD;
    g.lineWidth = Math.max(1, R * 0.2);
    g.beginPath();
    g.moveTo(ox - R, oy);
    g.quadraticCurveTo(ox, oy + R * 0.4, ox + R, oy);
    g.stroke();
  } else {
    g.beginPath();
    g.moveTo(ox - R, oy);
    g.quadraticCurveTo(ox, oy - R * 1.2, ox + R, oy);
    g.quadraticCurveTo(ox, oy + R * 1.2, ox - R, oy);
    g.fillStyle = '#fffaf0';
    g.fill();
    // (the iris, a gleam on it)
    const an = (way / 8) * TAU,
      ix = ox + Math.cos(an) * R * 0.35,
      iy = oy + Math.sin(an) * R * 0.2;
    g.fillStyle = '#3a2a6a';
    g.beginPath();
    g.arc(ix, iy, R * 0.38, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.beginPath();
    g.arc(ix - R * 0.12, iy - R * 0.12, R * 0.1, 0, TAU);
    g.fill();
    g.lineWidth = Math.max(1, R * 0.18);
    g.strokeStyle = GOLD;
    g.beginPath();
    g.moveTo(ox - R, oy);
    g.quadraticCurveTo(ox, oy - R * 1.2, ox + R, oy);
    g.quadraticCurveTo(ox, oy + R * 1.2, ox - R, oy);
    g.stroke();
  }
  c.r = R;
  EYES.set(key, c);
  if (EYES.size > 96) EYES.delete(EYES.keys().next().value);
  return c;
}
// the eyes' sprites for half-widths from r0 to r1 made now (while the song loads)
export function warmEyes(r0, r1) {
  for (let r = Math.max(2, r0); r <= r1 * 1.2; r *= 1.18) for (let w = -1; w < 8; w++) eyeSprite(r, w);
}
// an eye at (X, Y), r its half-width, looking toward (tx, ty), shut by `lid` (0 open .. 1 shut)
export function eye(g, X, Y, r, tx, ty, lid, a = 1) {
  const way = lid >= 0.9 ? -1 : (Math.round((Math.atan2(ty - Y, tx - X) / TAU) * 8) + 8) % 8,
    c = eyeSprite(r, way),
    k = r / c.r,
    ga = g.globalAlpha,
    sq = way < 0 ? 1 : 1 - lid;
  g.globalAlpha = ga * a;
  g.drawImage(c, X - (c.width * k) / 2, Y - ((c.height * k) / 2) * sq, c.width * k, c.height * k * sq);
  g.globalAlpha = ga;
}
// where he is on the screen (what the eyes look at)
export function heroAt(f) {
  const { v, L, t } = f;
  if (!L?.xAt) return [v.W / 2, v.H * 0.7];
  return [v.sx(L.xAt(t)), v.sy((f.run?.y ?? 0) + 1.3)];
}
// a wheel within wheels at (X, Y), radius R: three rings turning through each other, `spin` their turn, eyes along their
// rims looking at (tx, ty), blinking on the hats; `fire` the fire in their middle
// (each ring: its tilt, its size, how fast it turns)
const RINGS = [
  [0.0, 1.0, 1.0],
  [1.05, 0.92, -1.3],
  [2.1, 0.84, 0.8],
];
export function ophan(f, X, Y, R, spin, tx, ty, a = 1, fire = 1) {
  const { g, mf } = f;
  glowDot(g, X, Y, R * 0.9 * (1 + 0.2 * mf.kick), '#ffb040', a * fire * (0.35 + 0.35 * mf.kick));
  glowDot(g, X, Y, R * 0.35, '#fff4d0', a * fire);
  for (let k = 0; k < RINGS.length; k++) {
    const [tilt, size, speed] = RINGS[k],
      rr = R * size,
      ph = spin * speed + k,
      squash = Math.abs(Math.cos(ph)) * 0.85 + 0.15;
    g.save();
    g.translate(X, Y);
    g.rotate(tilt + spin * 0.1 * speed);
    g.strokeStyle = rgba('#8a5a10', a);
    g.lineWidth = Math.max(2, R * 0.11);
    g.beginPath();
    g.ellipse(0, 0, rr, rr * squash, 0, 0, TAU);
    g.stroke();
    g.strokeStyle = rgba(GOLD, a);
    g.lineWidth = Math.max(1.5, R * 0.07);
    g.stroke();
    g.restore();
    // (the eyes along its rim, at its points turned to us: those on its far side hidden behind)
    const n = 9,
      cs = Math.cos(tilt + spin * 0.1 * speed),
      sn = Math.sin(tilt + spin * 0.1 * speed);
    for (let q = 0; q < n; q++) {
      const an = (q / n) * TAU + ph * 0.6,
        ex = Math.cos(an) * rr,
        ey = Math.sin(an) * rr * squash,
        front = Math.sin(an) * Math.sin(ph) >= -0.2;
      if (!front) continue;
      const x = X + ex * cs - ey * sn,
        y = Y + ex * sn + ey * cs,
        lid = mf.hat > 0.5 && hash(q + k * 9, Math.floor(f.t * 6)) < 0.35 ? 1 : 0;
      eye(g, x, y, R * 0.11, tx, ty, lid, a);
    }
  }
}

