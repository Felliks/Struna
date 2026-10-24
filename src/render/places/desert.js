// The desert canyon: the sun or the moon by the song, mesas in layers, dunes rolling, heat shimmering harder with the
// bass; landmarks by the song (a stone arch, wind turbines turning a notch each beat, a wrecked ship with a beacon);
// sand in strata whose dust puffs up on the kick; the canyon's banded wall to fall past.
import { hash, rgba } from '../util.js';
import { celestial, cells, edge, glow, landmark, row, slab, tint } from './kit.js';

const STRATA = ['#7a3a22', '#94502c', '#6a2f1c', '#a8623a'];

export const LANDMARKS = {
  arch(f) {
    const { g, v, T } = f;
    landmark(f, 0.1, 40, 0.7, 1, (X, base) => {
      const m = v.ppm;
      g.strokeStyle = T.far;
      g.lineWidth = 1.4 * m;
      g.beginPath();
      g.arc(X, base, 4 * m, Math.PI, 0);
      g.stroke();
    });
  },
  turbines(f) {
    const { g, v, mf, T, t, L } = f;
    const notch = Math.floor(t / L.A.beat) + Math.min(1, ((t / L.A.beat) % 1) * 3);
    landmark(f, 0.15, 9, 0.6, 2, (X, base, i) => {
      const m = v.ppm,
        top = base - 5 * m;
      g.fillStyle = T.far;
      g.fillRect(X - 0.08 * m, top, 0.16 * m, 5 * m);
      g.strokeStyle = T.far;
      g.lineWidth = 0.12 * m;
      for (let k = 0; k < 3; k++) {
        const a = (notch * Math.PI) / 6 + i + (k * 2 * Math.PI) / 3;
        g.beginPath();
        g.moveTo(X, top);
        g.lineTo(X + Math.cos(a) * 1.8 * m, top + Math.sin(a) * 1.8 * m);
        g.stroke();
      }
      glow(g, X, top, 0.3 * m, '#ff3b4f', 0.3 + 0.7 * mf.beat);
    });
  },
  wreck(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.12, 50, 0.7, 3, (X, base) => {
      const m = v.ppm;
      g.fillStyle = T.far;
      g.beginPath();
      g.moveTo(X - 5 * m, base);
      g.lineTo(X - 3 * m, base - 2.5 * m);
      g.lineTo(X + 4 * m, base - 3.5 * m);
      g.lineTo(X + 5 * m, base);
      g.fill();
      glow(g, X + 4 * m, base - 3.5 * m, (0.5 + mf.kick) * m, T.line, 0.3 + 0.6 * mf.kick * mf.stage);
    });
  },
};

// (the far rows: mesas in two layers, wobbling in the heat)
function far(f) {
  const { g, v, mf, t, T } = f;
  for (const [par, hmul, col] of [
    [0.1, 1, tint(f, '#4a2030', T.far)],
    [0.25, 0.7, tint(f, '#5e2a26', T.far)],
  ]) {
    const r = row(f, par);
    cells(r, 5, (i, X, u) => {
      if (u > 0.6) return;
      const h = (2 + u * 4) * hmul * v.ppm,
        w = (2 + u * 3) * v.ppm,
        // the heat: the mesas wobble, more with the bass
        wob = Math.sin(t * 6 + i) * (1 + 3 * mf.bass) * v.dpr;
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(X - w * 0.2 + wob, r.base);
      g.lineTo(X + wob, r.base - h);
      g.lineTo(X + w + wob, r.base - h);
      g.lineTo(X + w * 1.2 + wob, r.base);
      g.closePath();
      g.fill();
    });
  }
}

// (the near row: dunes rolling)
function near(f) {
  const { g, v, T } = f;
  // dunes
  const d = row(f, 0.45);
  g.fillStyle = tint(f, '#7a3b26', T.near, 0.3);
  g.beginPath();
  // (across the row's frame, its screen's edges and bottom in it: kit.js row)
  g.moveTo(d.L - v.W, d.B);
  for (let X = d.L - 20; X < d.R + 40; X += 16) {
    const x = d.x(X);
    g.lineTo(X, d.base - (0.8 + 0.5 * Math.sin(x * 0.5) + 0.3 * Math.sin(x * 1.3)) * v.ppm);
  }
  g.lineTo(d.R + v.W, d.B);
  g.fill();
}

export default {
  sky(f) {
    celestial(f);
  },
  far,
  near,
  back(f) {
    for (const l of f.look.landmarks) LANDMARKS[l]?.(f);
    far(f);
    near(f);
  },
  ground(f, a, b, y) {
    const { g, v, mf, t, L } = f,
      s = slab(f, a, b, y, tint(f, STRATA[0], f.T.near, 0.3), tint(f, '#c98a52', f.T.far, 0.2));
    if (!s) return;
    for (let k = 0; k < 6; k++) {
      g.fillStyle = tint(f, STRATA[k % STRATA.length], f.T.near, 0.3);
      g.fillRect(s.X0, s.Y + (0.22 + k * 0.55) * v.ppm, s.X1 - s.X0, 0.3 * v.ppm);
    }
    // dust off the top on the kick
    if (mf.kick > 0.3)
      for (let k = Math.floor(s.a / 0.7); k < s.b / 0.7; k++) {
        const u = hash(k, Math.floor(t / L.A.beat));
        if (u > 0.35) continue;
        g.fillStyle = rgba('#f0c08a', 0.4 * mf.kick);
        g.beginPath();
        g.arc(v.sx(k * 0.7), s.Y - (0.1 + (1 - mf.kick) * 0.4) * v.ppm, (0.08 + 0.2 * (1 - mf.kick)) * v.ppm, 0, Math.PI * 2);
        g.fill();
      }
    edge(f, s, '#ffcf70');
  },
};
