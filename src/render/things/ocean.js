// The deep's obstacles: a coral head, an anchor and a treasure chest to jump; a jellyfish trailing its sting, a hanging
// net and a whale's rib arch to slide under; an aquarium's glass and a wall of barnacled stone to kick through; an
// anchor chain to swing on; ledges of coral and wreck planking.
import { mulberry } from '../../rng.js';
import { rgba } from '../util.js';
import { courses, hanging, ledge } from './kit.js';

// a ribbon through points, `w(u)` wide along it (0..1 of the way): one smooth shape, so its outline runs round the
// whole of it, not round each piece
function ribbon(k, P, w, fill) {
  const L = [],
    R = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)],
      b = P[Math.min(P.length - 1, i + 1)],
      dx = b[0] - a[0],
      dy = b[1] - a[1],
      d = Math.hypot(dx, dy) || 1,
      h = w(i / (P.length - 1)) / 2;
    L.push([P[i][0] - (dy / d) * h, P[i][1] + (dx / d) * h]);
    R.push([P[i][0] + (dy / d) * h, P[i][1] - (dx / d) * h]);
  }
  k.poly([...L, ...R.reverse()], fill);
}

export default {
  coral(k, o) {
    for (const [x, w, h] of [[-0.25, 0.14, 1], [0, 0.16, 0.8], [0.22, 0.12, 0.95]]) k.round(x - w / 2, 0, w, o.h * h, w / 2, '#e05a7a');
    k.plain();
    k.disc(0, o.h * 0.85, 0.06, rgba(k.T.jump, 0.5 + 0.5 * k.mf.kick));
  },
  anchor(k, o) {
    k.box(-0.05, 0.1, 0.1, o.h - 0.1, '#5a5a62');
    k.plain();
    k.line(-0.35, 0.2, 0, 0.02, 0.07, '#5a5a62');
    k.line(0.35, 0.2, 0, 0.02, 0.07, '#5a5a62');
    k.line(-0.2, o.h * 0.75, 0.2, o.h * 0.75, 0.06, '#5a5a62');
    k.disc(0, o.h, 0.08, rgba(k.T.jump, 0.5 + 0.5 * k.mf.beat));
  },
  chest(k, o) {
    k.box(-0.34, 0, 0.68, o.h * 0.7, '#6a4426', k.accent, 0.035);
    k.round(-0.34, o.h * 0.6, 0.68, o.h * 0.4, 0.15, '#7a5030');
    k.plain();
    k.box(-0.06, o.h * 0.5, 0.12, 0.12, rgba('#ffd84a', 0.6 + 0.4 * k.mf.kick));
  },
  // a jellyfish hanging over the way, its sting trailing down to just over his head: a scalloped bell with a paler
  // inner one, four rings of gonads seen through it, lights round its rim, frilled oral arms and fine tentacles; the
  // bell beats on the beat (a quick squeeze, a slow relax, as a jellyfish swims), its arms and tentacles trailing the
  // squeeze with a wave running down them, never lower than they always hung (he slides under at 1.05 m)
  jelly(k) {
    const c = k.T.slide,
      ph = ((k.beats % 1) + 1) % 1,
      sq = ph < 0.18 ? Math.sin((ph / 0.18) * (Math.PI / 2)) : Math.exp(-(ph - 0.18) * 5),
      w = 0.48 * (1 - 0.1 * sq),
      h = 0.46 * (1 + 0.12 * sq),
      y0 = 1.42 + 0.03 * sq,
      dome = (rw, rh, lift = 0, n = 20) => {
        const pts = [];
        for (let i = 0; i <= n; i++) {
          const a = (Math.PI * i) / n;
          pts.push([-Math.cos(a) * rw, y0 + lift + Math.sin(a) * rh]);
        }
        // (the rim scalloped into lappets, each a little lobe hanging under it)
        for (let i = 8; i >= 0; i--) {
          const x = -rw + (2 * rw * (i + 0.5)) / 9;
          pts.push([x + (rw / 9) * 0.9, y0 + lift - 0.01], [x, y0 + lift - 0.045 - 0.015 * sq], [x - (rw / 9) * 0.9, y0 + lift - 0.01]);
        }
        return pts;
      };
    k.plain();
    k.line(0, y0 + h, 0, k.sky, 0.015, rgba(c, 0.35));
    // (the tentacles: fine, from the rim, a wave running down each, swept back by the squeeze)
    for (let i = 0; i < 9; i++) {
      const x0 = -0.42 + i * 0.105,
        len = 0.3 + 0.07 * ((i * 5) % 3),
        P = [];
      for (let s = 0; s <= 8; s++) {
        const u = s / 8;
        P.push([x0 * (1 - 0.18 * u * sq) + 0.04 * u * Math.sin(k.t * 3.1 - s * 0.7 + i * 1.7), Math.max(1.06, y0 - 0.03 - len * u * (1 - 0.15 * sq))]);
      }
      ribbon(k, P, u => 0.016 * (1 - 0.7 * u), rgba(c, 0.6));
    }
    // (the oral arms: four frilled ribbons from the middle, thicker, trailing deeper, a pale frill down each)
    for (let i = 0; i < 4; i++) {
      const x0 = -0.09 + i * 0.06,
        P = [];
      for (let s = 0; s <= 10; s++) {
        const u = s / 10;
        P.push([x0 * (1 + 0.8 * u) + 0.05 * u * Math.sin(k.t * 2.3 - s * 0.55 + i * 2.1), Math.max(1.05, y0 - 0.37 * u * (1 - 0.12 * sq))]);
      }
      ribbon(k, P, u => 0.05 * (1 - 0.65 * u) * (1 + 0.25 * Math.sin(u * 18 + i)), rgba(c, 0.85));
      ribbon(k, P, u => 0.016 * (1 - 0.6 * u), rgba('#ffffff', 0.45));
    }
    // (the bell: its outer glass, the paler inner bell, a sheen up its crown)
    k.glow(1.5);
    k.poly(dome(w, h), rgba(c, 0.42 + 0.25 * k.mf.kick));
    k.plain();
    k.poly(dome(w * 0.72, h * 0.72, 0.02, 16), rgba('#ffffff', 0.14 + 0.1 * sq));
    k.poly(
      [[-w * 0.55, y0 + h * 0.55], [-w * 0.3, y0 + h * 0.86], [-w * 0.05, y0 + h * 0.95], [-w * 0.25, y0 + h * 0.8], [-w * 0.45, y0 + h * 0.5]],
      rgba('#ffffff', 0.35),
    );
    // (the four gonads, rings seen through the bell, glowing with the snare)
    for (let i = 0; i < 4; i++) {
      const gx = (i - 1.5) * w * 0.28,
        gy = y0 + h * 0.35 + 0.02 * Math.sin(i * 2.4);
      k.disc(gx, gy, 0.055, rgba('#ffffff', 0.25 + 0.35 * k.mf.snare));
      k.disc(gx, gy, 0.032, rgba(c, 0.9));
    }
    // (lights along the rim, running round it on the hats)
    for (let i = 0; i < 9; i++) {
      const on = 0.35 + 0.65 * Math.max(0, Math.cos(k.t * 6 - i * 0.8)) * (0.4 + 0.6 * k.mf.hat);
      k.disc(-w + (2 * w * (i + 0.5)) / 9, y0 - 0.03, 0.017, rgba('#ffffff', on));
    }
  },
  net(k) {
    hanging(k, 1.6, 1.2, '#8a7a5a', 0.02);
    k.plain();
    for (let x = -0.6; x <= 0.6; x += 0.15) k.line(x, 1.6, x + 0.05 * Math.sin(k.t * 2 + x * 5), 1.05, 0.015, '#c8b88a');
    for (let y = 1.1; y <= 1.6; y += 0.12) k.line(-0.6, y, 0.6, y, 0.015, '#c8b88a');
    k.box(-0.62, 1.03, 1.24, 0.05, rgba(k.accent, 0.8));
  },
  ribs(k) {
    k.plain();
    k.box(-0.8, 1.55, 1.6, 0.14, '#e8dcc0');
    k.glow();
    for (let i = 0; i < 6; i++) {
      const x = -0.65 + i * 0.26;
      k.line(x, 1.6, x + 0.06, 1.08 + 0.04 * k.mf.kick, 0.05, '#e8dcc0');
    }
  },
  aquarium(k, o) {
    k.box(-0.14, 0, 0.28, o.h, rgba('#7fe0ff', 0.22 + 0.2 * k.mf.kick), k.accent, 0.03);
    k.plain();
    for (let i = 0; i < 4; i++) k.disc(0, ((k.t * 0.5 + i * 0.25) % 1) * o.h, 0.03, 'rgba(255,255,255,0.6)');
  },
  barnacles(k, o) {
    const rr = mulberry(Math.round(o.t * 1000));
    courses(k, o, 11, 0.42, () => (rr() < 0.5 ? '#4a5a5a' : '#3a4a4c'));
  },
  anchorchain(k) {
    hanging(k, 2.12, 0.9, '#5a5a62', 0.035);
    k.box(-0.7, 2.05, 1.4, 0.09, '#7a7a82', rgba(k.T.hold, 0.9), 0.025);
  },
  coralledge: ledge('#a03a5a', true),
  plankledge: ledge('#5a4028'),
};
