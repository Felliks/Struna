// The deep: the sea's light falling in shafts from a surface far up (swaying with the voice), kelp forests in layers
// swaying with the bass, jellyfish drifting up and lighting on the kick, plankton glittering on the hats; landmarks by
// the song (a whale gliding past, a sunken temple, a wreck); a reef underfoot, its anemones pulsing on the beat and
// glowing more as the song grows.
import { hash, rgba } from '../util.js';
import { cells, edge, flat, glow, landmark, row, slab, tint } from './kit.js';

export const LANDMARKS = {
  // a whale gliding by far off, its song (the voice) lighting its outline
  whale(f) {
    const { g, v, mf, T, t } = f;
    landmark(f, 0.04, 70, 0.9, 1, (X, base) => {
      const m = v.ppm,
        Y = base - 8 * m + Math.sin(t * 0.4) * m;
      g.fillStyle = rgba(T.far.startsWith('#') ? T.far : '#203040', 0.55);
      g.beginPath();
      g.ellipse(X, Y, 3.2 * m, 0.85 * m, 0, 0, Math.PI * 2);
      g.moveTo(X + 3 * m, Y);
      g.lineTo(X + 4.3 * m, Y - 0.8 * m + Math.sin(t) * 0.3 * m);
      g.lineTo(X + 4.3 * m, Y + 0.8 * m + Math.sin(t) * 0.3 * m);
      g.fill();
      g.strokeStyle = rgba(T.slide, 0.15 + 0.6 * mf.voice);
      g.lineWidth = v.dpr * 2;
      g.stroke();
    });
  },
  // a sunken temple's columns, lit from inside on the downbeat
  temple(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.1, 40, 0.7, 2, (X, base) => {
      const m = v.ppm;
      g.fillStyle = T.far;
      g.beginPath();
      g.moveTo(X - 4 * m, base - 5 * m);
      g.lineTo(X, base - 6.5 * m);
      g.lineTo(X + 4 * m, base - 5 * m);
      g.fill();
      for (let k = -3; k <= 3; k += 2) g.fillRect(X + k * m - 0.3 * m, base - 5 * m, 0.6 * m, 5 * m);
      glow(g, X, base - 2.5 * m, 2.5 * m, T.slide, 0.15 + 0.4 * mf.down);
    });
  },
  wreckship(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.14, 50, 0.7, 3, (X, base) => {
      const m = v.ppm;
      g.fillStyle = T.far;
      g.beginPath();
      g.moveTo(X - 5 * m, base);
      g.lineTo(X - 4 * m, base - 2 * m);
      g.lineTo(X + 4 * m, base - 2.6 * m);
      g.lineTo(X + 5 * m, base);
      g.fill();
      g.fillRect(X - 0.1 * m, base - 6 * m, 0.2 * m, 4 * m);
      glow(g, X + 3 * m, base - 2.3 * m, (0.4 + 0.6 * mf.kick) * m, '#ffd84a', 0.3 + 0.5 * mf.kick);
    });
  },
};

// a row of kelp swaying with the bass
function kelp(f, par, col, hmul) {
  const { g, v, mf, t } = f,
    r = row(f, par);
  g.strokeStyle = col;
  g.lineCap = 'round';
  cells(r, 0.9, (i, X, u) => {
    if (u > 0.7) return;
    const h = (2.5 + 4 * u) * hmul * v.ppm;
    g.lineWidth = (0.07 + 0.06 * u) * v.ppm;
    g.beginPath();
    g.moveTo(X, r.base);
    for (let k = 1; k <= 6; k++) g.lineTo(X + Math.sin(t * 1.2 + i + k * 0.6) * (0.15 + 0.35 * mf.bass) * k * v.ppm * 0.4, r.base - (h * k) / 6);
    g.stroke();
  });
}

// the far rows: the far kelp forest
function far(f) {
  kelp(f, 0.2, tint(f, '#0c2a26', f.T.far), 1);
}

// the near rows: the near kelp
function near(f) {
  kelp(f, 0.45, tint(f, '#082018', f.T.near), 0.75);
}

// over the rows: jellyfish drifting up, lighting on the kick; more as the song grows
function after(f) {
  // (across the screen, not in a row's frame)
  flat(f);
  const { g, v, mf, T, t } = f,
    n = Math.round(4 + 10 * mf.stage);
  for (let i = 0; i < n; i++) {
    const X = ((hash(i, 1) * v.W * 1.3 - v.x * v.ppm * 0.15) % v.W + v.W) % v.W,
      Y = v.H - ((t * 25 * v.dpr * (0.5 + hash(i, 2)) + hash(i, 3) * v.H) % (v.H * 1.2)),
      r = (0.25 + 0.3 * hash(i, 4)) * v.ppm,
      pulse = 1 + 0.25 * Math.sin(t * 3 + i) + 0.3 * mf.kick,
      col = [T.slide, T.hold, '#bff6ff'][((i % 3) + 3) % 3];
    glow(g, X, Y, r * 2.5, col, 0.15 + 0.35 * mf.kick);
    g.fillStyle = rgba(col, 0.5);
    g.beginPath();
    g.ellipse(X, Y, r * pulse, r * 0.7, 0, Math.PI, 0);
    g.fill();
    g.strokeStyle = rgba(col, 0.4);
    g.lineWidth = v.dpr;
    g.beginPath();
    for (let k = -2; k <= 2; k++) {
      g.moveTo(X + k * r * 0.35, Y);
      g.lineTo(X + k * r * 0.35 + Math.sin(t * 4 + k) * r * 0.3, Y + r * 1.8);
    }
    g.stroke();
  }
}

export default {
  sky(f) {
    // light falling from the surface in shafts, swaying with the voice
    const { g, v, mf, t } = f;
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const x = v.W * (0.1 + i * 0.17) + Math.sin(t * 0.3 + i) * v.W * 0.05 * (1 + mf.voice),
        gr = g.createLinearGradient(0, 0, 0, v.H * 0.8);
      gr.addColorStop(0, rgba('#bff6ff', 0.12 + 0.12 * mf.voice));
      gr.addColorStop(1, rgba('#bff6ff', 0));
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(x - v.W * 0.02, 0);
      g.lineTo(x + v.W * 0.02, 0);
      g.lineTo(x + v.W * 0.09, v.H * 0.8);
      g.lineTo(x - v.W * 0.05, v.H * 0.8);
      g.fill();
    }
    g.restore();
  },
  back(f) {
    for (const l of f.look.landmarks) LANDMARKS[l]?.(f);
    far(f);
    near(f);
    after(f);
  },
  far,
  near,
  after,
  ground(f, a, b, y) {
    const { g, v, mf, T, t } = f,
      s = slab(f, a, b, y, tint(f, '#10252a'), tint(f, '#2a5a52', T.far, 0.25));
    if (!s) return;
    // anemones along the reef, pulsing on the beat, glowing more as the song grows
    for (let k = Math.floor(s.a / 0.8); k < s.b / 0.8; k++) {
      if (hash(k, 7) > 0.55) continue;
      const X = v.sx(k * 0.8 + 0.4),
        col = [T.hold, T.slide, '#ffd84a'][k % 3 < 0 ? 0 : k % 3];
      for (let j = -2; j <= 2; j++) {
        g.strokeStyle = rgba(col, 0.35 + 0.4 * mf.beat + 0.25 * mf.stage);
        g.lineWidth = 0.05 * v.ppm;
        g.beginPath();
        g.moveTo(X, s.Y);
        g.lineTo(X + j * 0.08 * v.ppm + Math.sin(t * 3 + j + k) * 0.05 * v.ppm, s.Y - (0.2 + 0.12 * mf.beat) * v.ppm);
        g.stroke();
      }
    }
    edge(f, s, T.slide);
  },
};
