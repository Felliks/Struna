// Red and cyan pixels jumping round him on the hats (the simulation's noise).
import { mulberry } from '../../rng.js';
import { rgba } from '../util.js';

export function drawPixels(f) {
  const { g, v, run: R, t, mf } = f,
    rh = mulberry(Math.floor(t * 15) + 3),
    n = 2 + Math.round(16 * Math.min(1, mf.hat * 2.5) * mf.amp),
    hx = R.heroX(Math.max(0, t));
  for (let i = 0; i < n; i++) {
    g.fillStyle = i % 2 ? rgba('#ff2b3a', 0.5 + mf.hat) : rgba('#29e7ff', 0.5 + mf.hat);
    g.fillRect(v.sx(hx + (rh() - 0.3) * 4), v.sy(R.y + 0.3 + rh() * 3.5), 4 * v.dpr, 4 * v.dpr);
  }
}
