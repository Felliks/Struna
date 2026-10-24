// The marks the boss's fists leave on the roof (obstacles.js fist; level.js its act): where each will come down, a scar
// of cracks and a crater from the moment it is put there (it strikes here, again and again), its danger zone on the
// roof filling to the beat in the boss's colour (Hades's and LoL's ground telegraphs: where, and when), the shadow under
// it; at the blow, fresh cracks of light running out through the roof, dust thrown up along it, chips flying. The
// cracks stay where they were struck as he runs on over them.
import { glowDot, hash, rgba } from '../util.js';

const TAU = Math.PI * 2,
  EDGE = '#0b0b10',
  clamp01 = u => Math.max(0, Math.min(1, u)),
  CRACKS = new WeakMap();
// its cracks (metres off where it lands, along the roof and a little into it): a few jagged lines out from the middle,
// the same every frame
function cracksOf(o) {
  let c = CRACKS.get(o);
  if (!c) {
    const sd = Math.floor((o.v ?? 0.5) * 9973);
    c = [];
    for (let i = 0; i < 7; i++) {
      const side = i % 2 ? 1 : -1,
        len = 0.55 + 0.6 * hash(i, sd),
        pts = [[0, 0]];
      for (let j = 1; j <= 3; j++) pts.push([side * len * (j / 3) * (0.8 + 0.4 * hash(j, i + sd)), (hash(i * 3 + j, sd) - 0.5) * 0.12 + 0.03 * j * (hash(i, j) - 0.3)]);
      c.push(pts);
    }
    CRACKS.set(o, c);
  }
  return c;
}
// the cracks through the roof at (X, Y), m pixels a metre, grown to `grow` of their length
function crackLines(g, c, X, Y, m, grow) {
  g.beginPath();
  for (const pts of c) {
    g.moveTo(X, Y);
    for (let j = 1; j < pts.length; j++) g.lineTo(X + pts[j][0] * m * grow, Y + pts[j][1] * m * grow);
  }
  g.stroke();
}
// a fist's marks: c the moment it comes down (its kick's contact), col the boss's colour
export function fistMarks(f, o, c, col) {
  const { g, v, t, L, mf } = f,
    m = v.ppm,
    X = v.sx(o.x + 0.4),
    Y = v.sy(o.y),
    beat = L.A.beat,
    after = t - c,
    cr = cracksOf(o);
  if (X < -3 * m || X > v.W + 3 * m) return;
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  // (the scar of the blows before it: a crater and its cracks, there from the moment the fist is put here)
  g.fillStyle = 'rgba(0,0,0,0.38)';
  g.beginPath();
  g.ellipse(X, Y + 0.02 * m, 0.62 * m, 0.11 * m, 0, 0, TAU);
  g.fill();
  g.strokeStyle = rgba('#ffffff', 0.18);
  g.lineWidth = Math.max(1, 0.025 * m);
  g.beginPath();
  g.ellipse(X, Y + 0.02 * m, 0.62 * m, 0.11 * m, 0, Math.PI, TAU);
  g.stroke();
  // (its cracks: a pale edge under a dark line, read on a dark roof as on a light one)
  g.strokeStyle = rgba('#ffffff', 0.3);
  g.lineWidth = Math.max(2, 0.08 * m);
  crackLines(g, cr, X, Y, m, after > 0 ? 1.35 : 1);
  g.strokeStyle = rgba(EDGE, 0.85);
  g.lineWidth = Math.max(1.2, 0.04 * m);
  crackLines(g, cr, X, Y, m, after > 0 ? 1.35 : 1);
  if (after < 0) {
    // (its danger zone on the roof: a ring in the boss's colour, filling to the beat it comes down on)
    const u = clamp01(1 + after / (2 * beat));
    g.beginPath();
    g.ellipse(X, Y, 1.1 * m, 0.22 * m, 0, 0, TAU);
    g.strokeStyle = rgba(EDGE, 0.7);
    g.lineWidth = Math.max(3, 0.12 * m);
    g.stroke();
    g.strokeStyle = rgba(col, 0.65 + 0.35 * mf.beat);
    g.lineWidth = Math.max(1.5, 0.06 * m);
    g.stroke();
    g.fillStyle = rgba(col, 0.22 + 0.4 * u);
    g.beginPath();
    g.ellipse(X, Y, 1.1 * m * u, 0.22 * m * u, 0, 0, TAU);
    g.fill();
  } else if (after < 1.2) {
    // (the blow: fresh cracks of light running out through the roof, dust thrown up along it, chips flying)
    const grow = Math.min(1, after / 0.12) * 1.35,
      a = 1 - after / 1.2;
    g.strokeStyle = rgba(col, 0.9 * a);
    g.lineWidth = Math.max(1.5, 0.07 * m);
    crackLines(g, cr, X, Y, m, grow);
    g.strokeStyle = rgba('#ffffff', a);
    g.lineWidth = Math.max(1, 0.025 * m);
    crackLines(g, cr, X, Y, m, grow);
    glowDot(g, X, Y, (0.8 + 1.4 * Math.min(1, after / 0.2)) * m, col, 0.7 * a);
    for (let i = 0; i < 8; i++) {
      const side = i % 2 ? 1 : -1,
        h = hash(i, 31),
        w = Math.min(1.2, after) / 1.2;
      glowDot(g, X + side * (0.3 + 1.6 * w * (0.5 + h)) * m, Y - (0.15 + 0.5 * w * h) * m, (0.25 + 0.5 * w) * m, '#8a8590', 0.55 * (1 - w));
    }
    if (after < 0.6) {
      const u = after / 0.6;
      g.fillStyle = rgba('#d8d4cc', 1 - u);
      for (let i = 0; i < 10; i++) {
        const an = Math.PI + (i / 9) * Math.PI,
          d = (0.4 + 1.4 * u * (0.6 + 0.4 * hash(i, 5))) * m,
          s = Math.max(2, 0.07 * m * (1 - u));
        g.fillRect(X + Math.cos(an) * d - s / 2, Y + Math.sin(an) * d * 0.9 + 2.5 * u * u * m - s / 2, s, s);
      }
    }
  }
  g.restore();
}
