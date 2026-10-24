// The factory: smokestacks puffing smoke on the snare, gears turning a notch on every beat, sparks on the hats (more as
// the song grows); landmarks by the song (cooling towers breathing steam, a gantry crane, a furnace glowing with the
// bass); a steel grating with a hazard-striped edge.
import { mulberry } from '../../rng.js';
import { rgba } from '../util.js';
import { celestial, cells, edge, flat, glow, landmark, row, slab, tint } from './kit.js';

function gear(g, X, Y, r, a, col) {
  g.fillStyle = col;
  g.beginPath();
  for (let i = 0; i < 24; i++) {
    const ang = a + (i / 24) * Math.PI * 2,
      rr = i % 2 ? r : r * 0.8;
    g.lineTo(X + Math.cos(ang) * rr, Y + Math.sin(ang) * rr);
  }
  g.closePath();
  g.fill();
}

export const LANDMARKS = {
  cooling(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.08, 35, 0.7, 1, (X, base) => {
      const m = v.ppm;
      g.fillStyle = T.far;
      g.beginPath();
      g.moveTo(X - 2.5 * m, base);
      g.quadraticCurveTo(X - 1.2 * m, base - 3 * m, X - 1.8 * m, base - 6 * m);
      g.lineTo(X + 1.8 * m, base - 6 * m);
      g.quadraticCurveTo(X + 1.2 * m, base - 3 * m, X + 2.5 * m, base);
      g.fill();
      for (let k = 0; k < 3; k++) {
        g.fillStyle = `rgba(200,200,200,${(0.25 - k * 0.06) * (0.4 + mf.bass)})`;
        g.beginPath();
        g.arc(X + k * 0.6 * m, base - (6.5 + k * 1.1 + mf.bass) * m, (1 + k * 0.5) * m, 0, Math.PI * 2);
        g.fill();
      }
    });
  },
  crane(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.12, 30, 0.6, 2, (X, base) => {
      const m = v.ppm;
      g.fillStyle = T.far;
      g.fillRect(X - 3 * m, base - 6 * m, 0.3 * m, 6 * m);
      g.fillRect(X + 3 * m, base - 6 * m, 0.3 * m, 6 * m);
      g.fillRect(X - 3.2 * m, base - 6.3 * m, 6.7 * m, 0.4 * m);
      glow(g, X, base - 6.1 * m, 0.4 * m, '#ffb347', 0.3 + 0.7 * mf.beat);
    });
  },
  furnace(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.18, 25, 0.6, 3, (X, base) => {
      const m = v.ppm;
      glow(g, X, base - 1 * m, (2 + 2 * mf.bass) * m, '#ff6a2a', 0.25 + 0.4 * mf.bass * (0.5 + mf.stage));
      g.fillStyle = T.far;
      g.fillRect(X - 1.5 * m, base - 3 * m, 3 * m, 3 * m);
      g.fillStyle = `rgba(255,140,60,${0.4 + 0.6 * mf.bass})`;
      g.fillRect(X - 0.6 * m, base - 1.4 * m, 1.2 * m, 0.9 * m);
    });
  },
};

// (the far row: smokestacks puffing smoke on the snare)
function far(f) {
  const { g, v, mf, T } = f,
    r = row(f, 0.15);
  cells(r, 4, (i, X, u) => {
    const h = (4 + u * 4) * v.ppm,
      w = 0.6 * v.ppm;
    g.fillStyle = T.far;
    g.fillRect(X, r.base - h, w, h);
    g.fillRect(X - w, r.base - h * 0.35, w * 3, h * 0.35);
    // smoke on the snare
    for (let k = 0; k < 3; k++) {
      const up = (k + mf.snare * 0.8) * 0.6 * v.ppm;
      g.fillStyle = `rgba(120,110,110,${(0.25 - k * 0.07) * (0.5 + mf.snare)})`;
      g.beginPath();
      g.arc(X + w / 2 + k * 6 * v.dpr, r.base - h - up, (0.3 + k * 0.2) * v.ppm, 0, Math.PI * 2);
      g.fill();
    }
  });
}

// (the near row: gears a notch on every beat over their housings)
function near(f) {
  const { g, v, mf, t, L, T } = f,
    r = row(f, 0.4),
    notch = Math.floor(t / L.A.beat) + Math.min(1, ((t / L.A.beat) % 1) * 4);
  cells(r, 5, (i, X, u) => {
    if (u > 0.55) return;
    gear(g, X, r.base - 2.4 * v.ppm, (0.8 + u) * v.ppm, (notch * Math.PI) / 12 * (i % 2 ? 1 : -1), T.near);
    g.fillStyle = T.near;
    g.fillRect(X - 2 * v.ppm, r.base - 1.2 * v.ppm, 4 * v.ppm, 1.2 * v.ppm);
    g.fillStyle = rgba('#ffb347', 0.2 + 0.7 * mf.kick);
    g.fillRect(X - 1.5 * v.ppm, r.base - 0.9 * v.ppm, 0.5 * v.ppm, 0.3 * v.ppm);
  });
}

// (what rises over its rows)
function after(f) {
  // (across the screen, not in a row's frame)
  flat(f);
  const { g, v, mf, t } = f;
  // sparks on the hats
  if (mf.hat > 0.12) {
    const rr = mulberry(Math.floor(t * 10));
    for (let i = 0; i < 4 + 10 * mf.stage; i++) glow(g, rr() * v.W, v.H * (0.4 + rr() * 0.3), 6 * v.dpr, '#ffd27a', mf.hat * 2.5);
  }
}

export default {
  sky(f) {
    celestial(f);
  },
  far,
  near,
  after,
  back(f) {
    for (const l of f.look.landmarks) LANDMARKS[l]?.(f);
    far(f);
    near(f);
    after(f);
  },

  ground(f, a, b, y) {
    const { g, v } = f,
      s = slab(f, a, b, y, tint(f, '#1f1b1d'), tint(f, '#4a4448', f.T.far, 0.3));
    if (!s) return;
    // the grating
    g.strokeStyle = 'rgba(0,0,0,0.45)';
    g.lineWidth = v.dpr;
    g.beginPath();
    for (let x = Math.ceil(s.a / 0.25) * 0.25; x < s.b; x += 0.25) {
      g.moveTo(v.sx(x), s.Y + 0.25 * v.ppm);
      g.lineTo(v.sx(x), s.Y + 1.4 * v.ppm);
    }
    g.stroke();
    // the hazard stripes under the edge
    for (let x = Math.ceil(s.a / 0.3) * 0.3, k = 0; x < s.b; x += 0.3, k++) {
      g.fillStyle = (Math.round(x / 0.3) % 2 + 2) % 2 ? '#f2c230' : '#1a1a1a';
      g.fillRect(v.sx(x), s.Y + 0.05 * v.ppm, 0.3 * v.ppm, 0.15 * v.ppm);
    }
    edge(f, s, '#ffb347');
  },
};
