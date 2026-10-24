// The volcano: a red sky under an ash cloud lit from within, black ridges in layers with rivers of lava between them
// glowing with the bass; landmarks by the song (the cone itself, erupting on each drop and smoking between; obsidian
// spires; a lava fall); basalt underfoot, its cracks glowing on the kick and opening wider as the song grows.
import { hash, rgba } from '../util.js';
import { celestial, cells, edge, flat, glow, landmark, row, slab, tint } from './kit.js';

const LAVA = ['#ff5a1f', '#ffb347', '#ff2b1a'];

export const LANDMARKS = {
  // the volcano: a cone far off, its crater glowing, a fountain of fire and a column of ash on the drops
  cone(f) {
    const { g, v, mf, T, t } = f;
    landmark(f, 0.05, 60, 0.9, 1, (X, base) => {
      const m = v.ppm,
        top = base - 9 * m;
      g.fillStyle = T.far;
      g.beginPath();
      g.moveTo(X - 12 * m, base);
      g.lineTo(X - 1.5 * m, top);
      g.lineTo(X + 1.5 * m, top);
      g.lineTo(X + 12 * m, base);
      g.fill();
      glow(g, X, top, (1.5 + 2 * mf.bass + 4 * mf.drop) * m, '#ff7a2a', 0.4 + 0.5 * mf.drop);
      const erupt = Math.max(mf.drop, 0.25 * mf.stage);
      for (let i = 0; i < Math.round(30 * erupt); i++) {
        const u = (t * 0.8 + hash(i, 3)) % 1,
          a = -Math.PI / 2 + (hash(i, 5) - 0.5) * 0.9;
        g.fillStyle = rgba(LAVA[((i % 3) + 3) % 3], 1 - u);
        g.fillRect(X + Math.cos(a) * u * 6 * m, top + Math.sin(a) * u * 8 * m + u * u * 6 * m, 0.15 * m, 0.15 * m);
      }
    });
  },
  // obsidian spires, their edges catching the lava's light on the beat
  spires(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.18, 7, 0.6, 2, (X, base, i) => {
      const m = v.ppm,
        h = (3 + 3 * hash(i, 2)) * m;
      g.fillStyle = T.far;
      g.beginPath();
      g.moveTo(X - 0.8 * m, base);
      g.lineTo(X, base - h);
      g.lineTo(X + 0.6 * m, base);
      g.fill();
      g.strokeStyle = rgba('#ff7a2a', 0.2 + 0.5 * mf.beat);
      g.lineWidth = v.dpr * 2;
      g.beginPath();
      g.moveTo(X, base - h);
      g.lineTo(X + 0.6 * m, base);
      g.stroke();
    });
  },
  // a lava fall pouring down a cliff, brightening with the bass
  lavafall(f) {
    const { g, v, mf, t } = f;
    landmark(f, 0.12, 40, 0.7, 3, (X, base) => {
      const m = v.ppm;
      for (let k = 0; k < 5; k++) {
        g.fillStyle = rgba(LAVA[k % 3], 0.5 + 0.4 * mf.bass);
        const off = ((t * 3 + k * 0.4) % 1) * m;
        g.fillRect(X + (k - 2) * 0.35 * m, base - 7 * m + off, 0.25 * m, 7 * m);
      }
      glow(g, X, base, 3 * m, '#ff5a1f', 0.4 + 0.4 * mf.bass);
    });
  },
};

// a black ridge with a river of lava along its foot, glowing with the bass
function ridge(f, par, hmul, col) {
  const { g, v, mf } = f,
    r = row(f, par);
  // a river of lava along the foot of the ridge, glowing with the bass
  g.fillStyle = rgba('#ff5a1f', 0.35 + 0.45 * mf.bass);
  g.fillRect(r.L, r.base - 0.15 * v.ppm, r.R - r.L, 0.25 * v.ppm);
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(-v.W, v.H * 2);
  cells(r, 2, (i, X) => g.lineTo(X, r.base - (1 + 3 * hash(i, 11 + par * 10)) * hmul * v.ppm));
  g.lineTo(v.W * 2, v.H * 2);
  g.fill();
}

// (the far ridge, paler, toward the far silhouettes)
function far(f) {
  ridge(f, 0.12, 1, tint(f, '#1a0c0c', f.T.far));
}

// (the near ridge, lower and darker)
function near(f) {
  ridge(f, 0.3, 0.7, tint(f, '#120808', f.T.near));
}

// (what rises over its rows)
function after(f) {
  // (across the screen, not in a row's frame)
  flat(f);
  const { g, v, mf, t } = f;
  // heat rising off it all
  for (let i = 0; i < 12; i++) {
    const x = (hash(i, 2) * v.W + Math.sin(t + i) * 20) % v.W,
      y = v.H - ((t * 60 * v.dpr + hash(i, 4) * v.H) % v.H);
    g.fillStyle = rgba('#ff9a3c', 0.15 + 0.3 * mf.hat);
    g.fillRect(x, y, 2 * v.dpr, 2 * v.dpr);
  }
}

export default {
  sky(f) {
    const { g, v, mf, t } = f;
    celestial(f);
    // the ash cloud overhead, lit from within on the snare
    const gr = g.createLinearGradient(0, 0, 0, v.H * 0.35);
    gr.addColorStop(0, rgba('#1a0a08', 0.85));
    gr.addColorStop(1, rgba('#1a0a08', 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, v.W, v.H * 0.35);
    if (mf.snare > 0.4) glow(g, v.W * (0.2 + 0.6 * hash(Math.floor(t * 4), 7)), v.H * 0.12, v.ppm * 4, '#ff9a5a', 0.35 * mf.snare);
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
    const { g, v, mf, T } = f,
      s = slab(f, a, b, y, tint(f, '#1a1414'), tint(f, '#3a2a26', T.far, 0.3));
    if (!s) return;
    // the cracks: zigzags through the basalt glowing on the kick, wider as the song grows
    g.strokeStyle = rgba('#ff6a2a', 0.35 + 0.6 * mf.kick);
    g.lineWidth = (1.5 + 3 * mf.stage) * v.dpr;
    g.beginPath();
    for (let k = Math.floor(s.a / 1.3); k < s.b / 1.3; k++) {
      let x = k * 1.3 + hash(k, 3) * 0.5,
        yy = y - 0.25;
      g.moveTo(v.sx(x), v.sy(yy));
      for (let j = 0; j < 4; j++) {
        x += (hash(k, j) - 0.5) * 0.5;
        yy -= 0.5 + hash(k, j + 9) * 0.4;
        g.lineTo(v.sx(x), v.sy(yy));
      }
    }
    g.stroke();
    edge(f, s, '#ff7a2a');
  },
};
