// The forest: the sun or the moon by the song, hills, pines swaying with the bass (thicker as the song grows);
// landmarks by the song (a waterfall pouring on the beat, ruins with lit runes, a giant tree); a path of earth and
// grass whose blades flare on the kick; a cliff of rock and glowing mushrooms to fall past.
import { hash, rgba } from '../util.js';
import { celestial, cells, edge, glow, landmark, row, slab, tint } from './kit.js';
import { eased, lean } from '../physics.js';

export const LANDMARKS = {
  waterfall(f) {
    const { g, v, mf, T, t, L } = f;
    landmark(f, 0.12, 35, 0.7, 1, (X, base) => {
      const m = v.ppm;
      g.fillStyle = T.far;
      g.fillRect(X - 3 * m, base - 7 * m, 6 * m, 7 * m);
      // the water in streaks, pouring a step on every beat
      // (each streak fading in at the lip and out as it falls, so its start over again is never seen)
      const step = (t / L.A.beat) % 1,
        b = eased(f, 'B', mf.bass);
      for (let k = 0; k < 7; k++) {
        const u = (step + k * 0.37) % 1;
        g.fillStyle = rgba('#cfefff', (0.25 + 0.3 * b) * Math.sin(Math.PI * u));
        g.fillRect(X - 1 * m + k * 0.3 * m, base - 7 * m + u * 2 * m, 0.12 * m, 5 * m);
      }
      glow(g, X, base, 2.5 * m, '#cfefff', 0.15 + 0.25 * mf.kick);
    });
  },
  ruins(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.15, 25, 0.65, 2, (X, base, i) => {
      const m = v.ppm;
      g.fillStyle = T.far;
      for (let k = 0; k < 4; k++) {
        const h = (2 + hash(i, k) * 2.5) * m;
        g.fillRect(X + k * 1.2 * m, base - h, 0.6 * m, h);
        glow(g, X + k * 1.2 * m + 0.3 * m, base - h * 0.6, 0.35 * m, '#5ef0ff', (k / 4 < mf.stage ? 0.4 : 0.1) + 0.5 * mf.hat);
      }
      g.fillRect(X - 0.2 * m, base - 4.6 * m, 4.4 * m, 0.4 * m);
    });
  },
  giant(f) {
    const { g, v, T, t } = f;
    landmark(f, 0.08, 45, 0.7, 3, (X, base) => {
      // (its crown swaying slowly and leaning with the world's wind)
      const m = v.ppm,
        sway = (Math.sin(t * 0.8) * 0.1 + 0.15 * lean(f, X / m)) * m;
      g.fillStyle = T.far;
      g.fillRect(X - 0.6 * m, base - 9 * m, 1.2 * m, 9 * m);
      for (const [dx, dy, r] of [[0, -10, 3], [-2.2, -8.5, 2.2], [2.3, -8.8, 2.4]]) {
        g.beginPath();
        g.arc(X + dx * m + sway, base + dy * m, r * m, 0, Math.PI * 2);
        g.fill();
      }
    });
  },
};

// (the far row: rolling hills)
function far(f) {
  const { g, v, T } = f;
  // hills, far
  const hills = row(f, 0.1);
  g.fillStyle = T.far;
  g.beginPath();
  // (across the row's frame, its screen's edges and bottom in it: kit.js row)
  g.moveTo(hills.L - v.W, hills.B);
  for (let X = hills.L - 20; X < hills.R + 40; X += 20) {
    const x = hills.x(X);
    g.lineTo(X, hills.base - (2 + 1.2 * Math.sin(x * 0.35) + 0.8 * Math.sin(x * 0.9)) * v.ppm);
  }
  g.lineTo(hills.R + v.W, hills.B);
  g.fill();
}

// (the near rows: pines in two rows, swaying in the wind the bass blows)
function near(f) {
  const { g, v, t, T } = f;
  for (const [par, hmul, col] of [
    [0.3, 0.8, tint(f, '#0b2219', T.far)],
    [0.55, 1.1, tint(f, '#06140e')],
  ]) {
    const r = row(f, par);
    cells(r, 1.3, (i, X, u, seen) => {
      // (more trees as the song grows)
      // (decided by the world's stage as it came into view: kit.js stageSeen, never popping in in sight)
      if (u > 0.55 + 0.45 * seen()) return;
      const h = (2.5 + u * 3) * hmul * v.ppm,
        w = h * 0.35,
        // (each tip swaying on its own and leant by the wind, the bass's swell in it through a spring (physics.js), a gust
        // running along the row)
        sway = (Math.sin(t * 1.5 + i) * 0.03 + 0.05 * lean(f, i * 1.3)) * h;
      g.fillStyle = col;
      g.fillRect(X - w * 0.06, r.base - h * 0.25, w * 0.12, h * 0.3);
      for (let k = 0; k < 3; k++) {
        const yb = r.base - h * (0.2 + k * 0.25),
          ww = w * (1 - k * 0.25);
        g.beginPath();
        g.moveTo(X - ww / 2, yb);
        g.lineTo(X + sway * (k + 1) * 0.4, yb - h * 0.4);
        g.lineTo(X + ww / 2, yb);
        g.closePath();
        g.fill();
      }
    });
  }
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
    const { g, v, mf } = f,
      s = slab(f, a, b, y, tint(f, '#1a120b'), tint(f, '#2c4a1e', f.T.far, 0.3)),
      // (the blades springing up on the kick and settling with a wobble, never doubling in a frame; leant by the wind)
      spring = 1 + 0.35 * eased(f, 'Ks', mf.kick),
      bend = 0.3 + 0.15 * lean(f, v.x);
    if (!s) return;
    // stones in the earth, grass along the top flaring on the kick
    for (let k = Math.floor(s.a / 0.5); k < s.b / 0.5; k++) {
      const u = hash(k, 41);
      if (u < 0.4) {
        g.fillStyle = '#2a2018';
        g.beginPath();
        g.ellipse(v.sx(k * 0.5 + 0.25), s.Y + (0.6 + u * 2) * v.ppm, 0.12 * v.ppm, 0.08 * v.ppm, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.strokeStyle = rgba('#7dff6a', 0.45 + 0.5 * mf.kick);
    g.lineWidth = v.dpr * 1.5;
    g.beginPath();
    for (let x = Math.ceil(s.a / 0.12) * 0.12; x < s.b; x += 0.12) {
      const h = (0.06 + hash(Math.round(x * 100), 3) * 0.1) * spring * v.ppm;
      g.moveTo(v.sx(x), s.Y);
      g.lineTo(v.sx(x) + h * bend, s.Y - h);
    }
    g.stroke();
    edge(f, s, '#7dff6a');
  },
};
