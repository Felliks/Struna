// The simulation glitching with the music (it is an AI's simulation testing him: its seams show when the song hits):
// on a snare, slices of the picture jump sideways; on a hit, a fall out of a gap, a respawn and a drop, blocks of it are
// torn out of place and its colours split; the hats leave dead pixel rows; the page lays scanlines over it all. All of it as
// strong as the song is hard (f.react) and the player's effects setting allows, and none of it a full flash (the flash
// limit stays the post layer's: WCAG 2.3.1).
import { mulberry } from '../../rng.js';
import { rgba } from '../util.js';

export class Glitch {
  constructor(reduced) {
    this.reduced = reduced;
  }
  draw(f) {
    if (this.reduced) return;
    const { g, v, t, mf, run: R } = f,
      W = v.W,
      H = v.H,
      k = Math.min(1, 0.35 + (f.react ?? 0)) * (f.effects ?? 1),
      // the heavy moments: a hit, back out of a gap, the drop
      heavy = Math.max(R.mode !== 'dead' ? 1 - (t - R.hitT) / 0.3 : 0, 1 - (t - (R.respawnT ?? -9)) / 0.35, mf.drop > 0.85 ? (mf.drop - 0.85) / 0.15 : 0, 0),
      snap = t - mf.snareT < 0.09 && mf.snare > 0.4 ? mf.snare : 0;
    // (the scanlines are the page's, over the canvas: index.html #cv's overlay, free)
    if (k < 0.05) return;
    const rr = mulberry(Math.floor(t * 30));
    // slices on the snare
    const n = Math.round((snap * 6 + heavy * 10) * k),
      src = n || heavy > 0 ? f.snap() : null;
    for (let i = 0; i < n; i++) {
      const y = rr() * H,
        h = (3 + rr() * (heavy > 0 ? 60 : 24)) * v.dpr,
        dx = (rr() - 0.5) * (30 + 90 * heavy) * v.dpr * k;
      g.drawImage(src, 0, y, W, h, dx, y, W, h);
    }
    // blocks torn out of place and colours split, on the heavy moments
    if (heavy > 0) {
      for (let i = 0; i < Math.round(8 * heavy * k); i++) {
        const w = (40 + rr() * 220) * v.dpr,
          h = (10 + rr() * 80) * v.dpr,
          x = rr() * W,
          y = rr() * H;
        g.drawImage(src, x, y, w, h, x + (rr() - 0.5) * 120 * v.dpr, y + (rr() - 0.5) * 40 * v.dpr, w, h);
        g.fillStyle = rgba(i % 2 ? '#ff2b3a' : '#29e7ff', 0.25 * heavy);
        g.fillRect(x, y, w, h * 0.3);
      }
    }
    // dead pixel rows on the hats
    if (mf.hat > 0.3) {
      g.fillStyle = rgba('#ffffff', 0.25 * mf.hat * k);
      for (let i = 0; i < 3; i++) g.fillRect(rr() * W, rr() * H, (20 + rr() * 200) * v.dpr, v.dpr);
    }
  }
}
