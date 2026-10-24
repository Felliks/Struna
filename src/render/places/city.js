// The city: towers far off whose LED bars play the track and whose windows flicker on the hats, kicks and bass, a
// nearer darker row; landmarks by the song (a TV tower with its beacon on the beat, a lit bridge, billboards flashing
// on the kick, a stadium's floodlights); rooftops over buildings whose windows light up on the kick and a whole row on
// the bass, more of them lit as the song grows; a tower's face to fall past.
import { clamp, hash, rgba } from '../util.js';
import { celestial, cells, edge, glow, landmark, row, slab } from './kit.js';

function skyline(f, par, col, hmul, leds) {
  const { g, v, mf, T } = f,
    r = row(f, par),
    ppm = v.ppm;
  cells(r, 3.0, (i, X) => {
    const w = 3 * (0.55 + hash(i, 7 + par * 10) * 0.4),
      hgt = (3 + hash(i, 3 + par * 10) * 9) * hmul,
      top = r.base - hgt * ppm;
    g.fillStyle = col;
    g.fillRect(X, top, w * ppm, v.H * 2);
    if (leds && hash(i, 77) < 0.3) {
      const bands = [mf.kick, mf.snare, mf.hat * 2.5, mf.bass, mf.beat, mf.kick],
        bw = (w * ppm) / 6;
      bands.forEach((val, b) => {
        const e = clamp(val, 0, 1),
          h = (0.2 + (0.4 + 0.6 * mf.stage) * e) * hgt * 0.8 * ppm;
        g.fillStyle = rgba(T.win[b % 3], 0.35 + 0.6 * e);
        g.fillRect(X + (b + 0.25) * bw, r.base - h, bw * 0.55, h);
      });
      return;
    }
    const cols = Math.max(2, Math.floor(w / 0.55)),
      rows = Math.floor(hgt / 0.7),
      cw = (w * ppm) / cols;
    for (let c = 0; c < cols; c++)
      for (let k = 0; k < rows; k++) {
        const hv = hash(i * 131 + c, k + par * 1000);
        if (hv > 0.3 + 0.25 * mf.stage) continue;
        const lit = hv < 0.12 ? 0.25 + mf.hat * 2 : hv < 0.22 ? mf.kick : hv < 0.3 ? mf.bass * 0.8 : 0.15 + 0.3 * mf.stage;
        g.fillStyle = T.win[Math.floor(hv * 30) % 3];
        g.globalAlpha = clamp(lit, 0.06, 1) * (0.35 + par);
        g.fillRect(X + (c + 0.25) * cw, top + (k + 0.4) * 0.7 * ppm, cw * 0.5, 0.36 * ppm);
      }
    g.globalAlpha = 1;
  });
  return r;
}

export const LANDMARKS = {
  // a TV tower: its mast, its pod, its beacon on the beat
  tower(f) {
  const { g, v, mf, T } = f;
    landmark(f, 0.08, 40, 0.6, 1, (X, base) => {
      const m = v.ppm;
      g.fillStyle = T.far;
      g.fillRect(X - 0.15 * m, base - 11 * m, 0.3 * m, 11 * m);
      g.beginPath();
      g.ellipse(X, base - 8.5 * m, 0.9 * m, 0.45 * m, 0, 0, Math.PI * 2);
      g.fill();
      g.fillRect(X - 0.04 * m, base - 13 * m, 0.08 * m, 2 * m);
      glow(g, X, base - 13 * m, (0.4 + 0.5 * mf.beat) * m, '#ff3b4f', 0.4 + 0.6 * mf.beat);
      for (let k = 0; k < 6; k++) {
        g.fillStyle = rgba(T.win[k % 3], k / 6 < mf.stage ? 0.4 + 0.6 * mf.hat * 2 : 0.15);
        g.fillRect(X - 0.8 * m + k * 0.3 * m, base - 8.55 * m, 0.15 * m, 0.08 * m);
      }
    });
  },
  // a cable bridge: towers, a deck, its cables lit along on the hats
  bridge(f) {
  const { g, v, mf, T } = f;
    landmark(f, 0.12, 30, 0.7, 2, (X, base) => {
      const m = v.ppm,
        deck = base - 2 * m;
      g.fillStyle = T.far;
      g.fillRect(X - 6 * m, deck, 12 * m, 0.3 * m);
      for (const tx of [-3, 3]) g.fillRect(X + tx * m - 0.2 * m, deck - 5 * m, 0.4 * m, 7 * m);
      g.strokeStyle = rgba(T.line, 0.3 + 0.5 * mf.hat * 2);
      g.lineWidth = v.dpr;
      g.beginPath();
      for (const tx of [-3, 3])
        for (let k = 1; k <= 4; k++) {
          g.moveTo(X + tx * m, deck - 5 * m);
          g.lineTo(X + (tx + k * 0.7) * m, deck);
          g.moveTo(X + tx * m, deck - 5 * m);
          g.lineTo(X + (tx - k * 0.7) * m, deck);
        }
      g.stroke();
    });
  },
  // a stadium's bowl and its floodlights on the kick
  stadium(f) {
  const { g, v, mf, T } = f;
    landmark(f, 0.1, 45, 0.6, 3, (X, base) => {
      const m = v.ppm;
      g.fillStyle = T.far;
      g.beginPath();
      g.ellipse(X, base - 1.5 * m, 5 * m, 2 * m, 0, Math.PI, 0);
      g.fill();
      for (const lx of [-4, 4]) {
        g.fillRect(X + lx * m, base - 6 * m, 0.15 * m, 5 * m);
        glow(g, X + lx * m, base - 6 * m, (1 + 2 * mf.kick) * m, T.win[2], 0.25 + 0.6 * mf.kick * mf.amp);
      }
    });
  },
};

// (the far row: tall pale towers whose LED bars play the track)
function far(f) {
  return skyline(f, 0.15, f.T.far, 1.0, true);
}

// (the near row: lower darker blocks with flickering windows)
function near(f) {
  return skyline(f, 0.4, f.T.near, 0.65, false);
}

// (billboards on the near row's roofs, flashing on the kick: the city's own landmark, drawn over its rows)
function after(f) {
  if (!f.look.landmarks.includes('billboards')) return;
  const r = row(f, 0.4);
  const { g, v, mf, T } = f;
  cells(r, 9, (i, X) => {
    if (hash(i, 5) > 0.5) return;
    const Y = r.base - 5 * v.ppm;
    const e = (0.15 + 0.4 * mf.kick) * v.ppm;
    g.fillStyle = rgba(T.hold, 0.12 + 0.2 * mf.kick);
    g.fillRect(X - e, Y - e, 2.2 * v.ppm + 2 * e, 0.8 * v.ppm + 2 * e);
    g.fillStyle = rgba(T.hold, 0.35 + 0.65 * mf.kick);
    g.fillRect(X, Y, 2.2 * v.ppm, 0.8 * v.ppm);
    g.fillStyle = T.near;
    g.beginPath();
    g.ellipse(X + 0.75 * v.ppm, Y + 0.4 * v.ppm, 0.18 * v.ppm, 0.1 * v.ppm, 0, 0, Math.PI * 2);
    g.ellipse(X + 1.45 * v.ppm, Y + 0.4 * v.ppm, 0.18 * v.ppm, 0.1 * v.ppm, 0, 0, Math.PI * 2);
    g.fill();
  });
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
    const { g, v, mf, T, L, t } = f,
      s = slab(f, a, b, y, T.near, 'rgba(255,255,255,0.04)');
    if (!s) return;
    const rowLit = Math.floor(t / L.A.beat) % 4;
    for (let k = Math.floor(s.a / 0.6); k < s.b / 0.6; k++) {
      const wx = k * 0.6 + 0.12;
      if (wx < s.a || wx + 0.36 > s.b) continue;
      for (let r = 0; r < 5; r++) {
        const h = hash(k, r * 31 + 5),
          on = h < 0.08 + 0.25 * mf.stage + 0.5 * mf.kick * mf.amp || (r === rowLit && h < 0.2 + 0.4 * mf.stage + 0.4 * mf.bass);
        g.fillStyle = on ? T.win[Math.floor(h * 30) % 3] : 'rgba(255,255,255,0.05)';
        g.globalAlpha = on ? 0.45 + 0.5 * mf.beat : 1;
        g.fillRect(v.sx(wx), v.sy(y - 0.45 - r * 0.8), 0.36 * v.ppm, 0.42 * v.ppm);
      }
    }
    g.globalAlpha = 1;
    edge(f, s);
  },
};
