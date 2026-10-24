// The arctic: the northern lights over everything, drawn by the voice (bright as it sings, rippling as high as it goes),
// glaciers in layers of blue ice cracking light on the kick, snow drifting; landmarks by the song (an icebreaker
// beached in the pack ice, a research station's radar turning a notch each beat, an ice cathedral glowing inside on
// the downbeat); packed snow over ice underfoot, frost sparkling on the hats and lit deeper as the song grows.
import { hash, mixHex, rgba } from '../util.js';
import { celestial, cells, edge, glow, landmark, row, slab, tint } from './kit.js';

export const LANDMARKS = {
  icebreaker(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.1, 55, 0.7, 1, (X, base) => {
      const m = v.ppm;
      g.fillStyle = T.far;
      g.beginPath();
      g.moveTo(X - 6 * m, base);
      g.lineTo(X - 5 * m, base - 2 * m);
      g.lineTo(X + 5 * m, base - 2 * m);
      g.lineTo(X + 6.5 * m, base);
      g.fill();
      g.fillRect(X - 1.5 * m, base - 4 * m, 3 * m, 2 * m);
      glow(g, X, base - 4.2 * m, (0.3 + 0.5 * mf.kick) * m, '#ff3b4f', 0.4 + 0.6 * mf.beat);
    });
  },
  radar(f) {
    const { g, v, mf, T, t, L } = f;
    const notch = Math.floor(t / L.A.beat);
    landmark(f, 0.15, 30, 0.7, 2, (X, base) => {
      const m = v.ppm;
      g.fillStyle = T.far;
      g.fillRect(X - 1.5 * m, base - 1.6 * m, 3 * m, 1.6 * m);
      g.fillRect(X - 0.08 * m, base - 3.4 * m, 0.16 * m, 1.8 * m);
      const w = Math.cos((notch * Math.PI) / 4) * 1.2 * m;
      g.fillRect(X - Math.abs(w), base - 3.6 * m, Math.abs(w) * 2, 0.3 * m);
      glow(g, X, base - 3.5 * m, 0.4 * m, T.slide, 0.3 + 0.6 * mf.beat);
    });
  },
  cathedral(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.07, 65, 0.8, 3, (X, base) => {
      const m = v.ppm;
      g.fillStyle = T.far;
      for (const [dx, h] of [[-3, 6], [-1.2, 9], [1.2, 9], [3, 6]]) {
        g.beginPath();
        g.moveTo(X + (dx - 0.9) * m, base);
        g.lineTo(X + dx * m, base - h * m);
        g.lineTo(X + (dx + 0.9) * m, base);
        g.fill();
      }
      glow(g, X, base - 3 * m, 3.5 * m, T.slide, 0.12 + 0.4 * mf.down);
    });
  },
};

// a range of glaciers in blue ice, cracks of light in it on the kick
function glaciers(f, par, hmul, col) {
  const { g, v, mf } = f;
  const r = row(f, par);
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(-v.W, v.H * 2);
  cells(r, 3, (i, X) => {
    g.lineTo(X, r.base - (2 + 4 * hash(i, 13 + par * 10)) * hmul * v.ppm);
    g.lineTo(X + 1.5 * v.ppm, r.base - (1 + 2 * hash(i, 17 + par * 10)) * hmul * v.ppm);
  });
  g.lineTo(v.W * 2, v.H * 2);
  g.fill();
  // cracks of light in the ice on the kick
  g.strokeStyle = rgba('#e8fbff', 0.15 + 0.6 * mf.kick * mf.amp);
  g.lineWidth = v.dpr * 1.5;
  g.beginPath();
  cells(r, 3, (i, X) => {
    if (hash(i, 23) > 0.4) return;
    g.moveTo(X + 0.5 * v.ppm, r.base - 0.5 * v.ppm);
    g.lineTo(X + 0.9 * v.ppm, r.base - (1.5 + hash(i, 3)) * hmul * v.ppm);
  });
  g.stroke();
}

// a far range of snow peaks: each a face in the light and a face in shadow under a ragged cap of snow, a seam of
// blue ice down the shadow side glinting on the kick, the caps catching the light on the beat
function peaks(f, par, col) {
  const { g, v, mf, T } = f,
    r = row(f, par),
    m = v.ppm,
    lit = mixHex(col, T.sky[2], 0.35),
    dark = mixHex(col, T.far, 0.5),
    snow = mixHex('#eef6ff', T.sky[2], 0.35);
  // (a foot of the range under them all)
  g.fillStyle = dark;
  g.fillRect(r.L, r.base - 1.2 * m, r.R - r.L, v.H);
  cells(r, 5, (i, X, u) => {
    const w = (5 + 3 * hash(i, 31)) * m,
      ax = X + w * (0.35 + 0.3 * hash(i, 37)),
      ay = r.base - (3 + 3.5 * hash(i, 41)) * m,
      x0 = X - w * 0.3,
      x1 = X + w * 0.9;
    // the shadow face, then the lit one down to a ridge that wanders a little
    g.fillStyle = dark;
    g.beginPath();
    g.moveTo(x0, r.base);
    g.lineTo(ax, ay);
    g.lineTo(x1, r.base);
    g.fill();
    const rx = ax + (hash(i, 43) - 0.5) * 0.5 * m;
    g.fillStyle = lit;
    g.beginPath();
    g.moveTo(x0, r.base);
    g.lineTo(ax, ay);
    g.lineTo(rx + 0.3 * m, ay + (r.base - ay) * 0.45);
    g.lineTo(rx - 0.2 * m, r.base);
    g.fill();
    // the cap of snow: a ragged hem a third of the way down
    const k = 0.3 + 0.1 * hash(i, 47),
      hy = ay + (r.base - ay) * k,
      lx = ax + (x0 - ax) * k,
      gx = ax + (x1 - ax) * k;
    g.fillStyle = rgba(snow, 0.75 + 0.25 * mf.beat);
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(gx, hy);
    for (let j = 1; j < 6; j++) {
      const q = j / 6;
      g.lineTo(gx + (lx - gx) * q, hy - (j % 2 ? 0.35 : -0.15) * m * (0.6 + hash(i * 7 + j, 53)));
    }
    g.lineTo(lx, hy);
    g.fill();
    // the seam of ice down the shadow side, glinting on the kick
    g.strokeStyle = rgba('#e8fbff', 0.12 + 0.6 * mf.kick * mf.amp * (u < 0.6 ? 1 : 0.3));
    g.lineWidth = Math.max(1, 0.05 * m);
    g.beginPath();
    g.moveTo(ax + 0.2 * m, hy);
    g.lineTo(ax + (x1 - ax) * 0.35, ay + (r.base - ay) * 0.75);
    g.stroke();
  });
}

// the far rows: the far range of snow peaks, the glaciers before it
function far(f) {
  peaks(f, 0.08, tint(f, '#8ab4d4', f.T.far, 0.6));
  glaciers(f, 0.14, 0.6, tint(f, '#9ac4e0', f.T.far, 0.5));
}

// the near rows: the nearer glaciers
function near(f) {
  glaciers(f, 0.32, 0.7, tint(f, '#6a9ac0', f.T.near, 0.5));
}

export default {
  sky(f) {
    const { g, v, mf, T, t } = f;
    celestial(f);
    // the northern lights: curtains of green and violet, drawn by the voice, rippling as high as it sings
    const a = 0.12 + 0.55 * mf.voice + 0.15 * mf.stage;
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let c = 0; c < 2; c++) {
      const col = c ? '#b06aff' : '#5affb0',
        base = v.H * (0.18 + 0.12 * c - 0.1 * mf.pitch);
      // (in strips 18 px wide: a gradient each, so no more of them than the curtains need)
      for (let X = 0; X < v.W; X += 18 * v.dpr) {
        const y = base + Math.sin(X / (v.ppm * 3) + t * 0.6 + c) * v.ppm * (0.5 + mf.voice),
          h = v.ppm * (1.5 + 1.5 * Math.sin(X / (v.ppm * 1.3) + t + c * 2) ** 2) * (0.6 + mf.voice),
          gr = g.createLinearGradient(0, y, 0, y + h);
        gr.addColorStop(0, rgba(col, 0));
        gr.addColorStop(0.3, rgba(col, a * (0.5 + 0.5 * Math.sin(X * 0.01 + t * 2))));
        gr.addColorStop(1, rgba(col, 0));
        g.fillStyle = gr;
        g.fillRect(X, y, 18 * v.dpr, h);
      }
    }
    g.restore();
    void T;
  },
  back(f) {
    for (const l of f.look.landmarks) LANDMARKS[l]?.(f);
    far(f);
    near(f);
  },
  far,
  near,
  ground(f, a, b, y) {
    const { g, v, mf, T, t } = f,
      s = slab(f, a, b, y, tint(f, '#5a7a96', T.near, 0.3), tint(f, '#eef6ff', T.far, 0.1));
    if (!s) return;
    // ice under the snow, lit deeper as the song grows
    g.fillStyle = rgba('#7fd4ff', 0.12 + 0.3 * mf.stage);
    g.fillRect(s.X0, s.Y + 0.3 * v.ppm, s.X1 - s.X0, 0.8 * v.ppm);
    // frost sparkling on the hats
    for (let k = Math.floor(s.a / 0.4); k < s.b / 0.4; k++) {
      if (hash(k, Math.floor(t * 8)) > 0.15 + 0.3 * mf.hat) continue;
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.fillRect(v.sx(k * 0.4 + hash(k, 2) * 0.3), s.Y + 0.05 * v.ppm, 2 * v.dpr, 2 * v.dpr);
    }
    edge(f, s, '#bff6ff');
  },
};
