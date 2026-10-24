// What the obstacles' looks share: each look draws in metres in a frame whose origin is the obstacle's base centre, y
// up, through a kit `k` (box, frame, round, line, disc, poly, glow on/off, the frame's music `k.mf`, the song's
// palette `k.T`, `k.u` how much of a painted thing is done, `k.spin` a turning angle that kicks with the hats).
import { rgba } from '../util.js';

// chains or cables up out of sight (k.sky: the top of the screen, however tall or turned) from a hanging thing whose
// top is at `top`, `w` apart
export function hanging(k, top, w, col = '#8a8a8a', lw = 0.025) {
  k.plain();
  k.line(-w * 0.62, top, -w * 0.45, k.sky, lw, col);
  k.line(w * 0.62, top, w * 0.45, k.sky, lw, col);
  k.glow();
}
// a box with a fan turning with the hats
export const fanBox = col => (k, o) => {
  k.box(-0.32, 0, 0.64, o.h, col, k.accent, 0.03);
  k.plain();
  const r = Math.min(0.64, o.h) * 0.32;
  k.disc(0, o.h / 2, r, '#3b4048');
  for (let i = 0; i < 3; i++) {
    const a = k.spin + (i * 2 * Math.PI) / 3;
    k.line(0, o.h / 2, Math.cos(a) * r, o.h / 2 + Math.sin(a) * r, 0.05, '#d9dde3');
  }
};
// a ledge into his lane in a shaft (1.28 m across): a slab of a colour with lights on the kick
export const ledge = (col, neon = false) => k => {
  k.box(-0.64, 0, 1.28, 0.45, col, k.accent, neon ? 0.05 : 0.035);
  k.plain();
  for (let i = 0; i < 4; i++) k.box(-0.64 + (i + 0.3) * 0.32, 0.18, 0.13, 0.09, rgba(k.T.jump, 0.5 + 0.5 * k.mf.kick));
};
// something built up course by course as far as the brush has got (k.u): `rows` courses of `fill(r)` colour, `w` wide
export function courses(k, o, rows, w, fill, offset = true) {
  k.plain();
  const bh = o.h / rows,
    done = Math.ceil(rows * k.u);
  for (let r = 0; r < done; r++)
    for (let c = -1; c < 3; c++) {
      const x0 = Math.max(-w / 2, -w / 2 + c * (w / 2.5) + (offset && r % 2 ? w / 5 : 0)),
        x1 = Math.min(w / 2, -w / 2 + (c + 1) * (w / 2.5) + (offset && r % 2 ? w / 5 : 0));
      if (x1 > x0) k.box(x0 + 0.008, r * bh + 0.008, x1 - x0 - 0.016, bh - 0.016, fill(r, c));
    }
  k.glow();
  k.frame(-w / 2, 0, w, done * bh, rgba('#ff2b3a', 0.6 + 0.4 * k.mf.kick), 0.04);
}
