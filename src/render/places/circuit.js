// Inside the computer: the simulation's own motherboard. A silicon grid far behind breathing with the bass, towers of
// chips and capacitor cans whose status LEDs blink on the hats, copper traces between them with packets of data streaming
// along (faster as the song grows and in the drops), the traces flashing on the kick; landmarks by the song (the CPU die
// with its cores lit by the bands, a cooler's fan spun by the energy, RAM sticks chasing on the beat); a board to run on,
// its traces and vias pulsing, its pads lit on the kick.
import { clamp, hash, rgba } from '../util.js';
import { cells, edge, glow, landmark, row, slab, tint } from './kit.js';

// how fast the data streams: with the song's growth, its loudness and its drops
const flow = mf => 1.5 + 4 * mf.stage + 2 * mf.amp + 4 * (mf.drop ?? 0);

export const LANDMARKS = {
  // the CPU: a socket of pins, the die on it, its cores lit each by a band of the song
  cpu(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.07, 48, 0.75, 1, (X, base) => {
      const m = v.ppm,
        s = 7 * m,
        top = base - 9 * m;
      g.fillStyle = T.far;
      g.fillRect(X - s / 2, top, s, s);
      // (its pins round the edge)
      g.fillStyle = rgba('#d8b25a', 0.35 + 0.3 * mf.beat);
      for (let k = 0; k < 14; k++) {
        const d = (k + 0.5) * (s / 14);
        g.fillRect(X - s / 2 + d - 0.06 * m, top - 0.35 * m, 0.12 * m, 0.35 * m);
        g.fillRect(X - s / 2 - 0.35 * m, top + d - 0.06 * m, 0.35 * m, 0.12 * m);
        g.fillRect(X + s / 2, top + d - 0.06 * m, 0.35 * m, 0.12 * m);
      }
      const bands = [mf.kick, mf.snare, mf.hat * 2.5, mf.bass],
        c = (s * 0.7) / 2;
      bands.forEach((val, b) => {
        const e = clamp(val, 0, 1),
          cx = X - c + (b % 2) * c,
          cy = top + s * 0.15 + Math.floor(b / 2) * c;
        g.fillStyle = rgba(T.win[b % 3], 0.15 + 0.75 * e);
        g.fillRect(cx + 0.1 * m, cy + 0.1 * m, c - 0.2 * m, c - 0.2 * m);
      });
      glow(g, X, top + s / 2, (3 + 2 * mf.kick) * m, T.line, 0.12 + 0.3 * mf.kick * mf.amp);
    });
  },
  // a tower cooler: its fins and its fan, spinning with the energy
  cooler(f) {
    const { g, v, mf, T, t } = f;
    landmark(f, 0.12, 34, 0.7, 2, (X, base) => {
      const m = v.ppm,
        r = 2 * m,
        cy = base - 4.5 * m;
      g.fillStyle = T.far;
      for (let k = 0; k < 9; k++) g.fillRect(X - 2.6 * m + k * 0.6 * m, base - 7 * m, 0.3 * m, 7 * m);
      g.fillStyle = tint(f, '#0a0d12', T.far, 0.4);
      g.beginPath();
      g.arc(X, cy, r * 1.05, 0, Math.PI * 2);
      g.fill();
      const a = t * flow(mf) * 1.5;
      g.fillStyle = rgba(T.line, 0.25 + 0.4 * mf.beat);
      for (let k = 0; k < 7; k++) {
        const b = a + (k * Math.PI * 2) / 7;
        g.beginPath();
        g.moveTo(X, cy);
        g.arc(X, cy, r * 0.95, b, b + 0.5);
        g.fill();
      }
      glow(g, X, cy, r * 0.5, T.win[0], 0.2 + 0.5 * mf.bass);
    });
  },
  // RAM sticks stood in their slots, their chips lit in a chase on the beat
  ram(f) {
    const { g, v, mf, T, t, L } = f;
    landmark(f, 0.18, 22, 0.7, 3, (X, base) => {
      const m = v.ppm,
        chase = Math.floor((t / L.A.beat) * 2);
      for (let s = 0; s < 4; s++) {
        const x = X + s * 0.9 * m;
        g.fillStyle = T.far;
        g.fillRect(x, base - 4.5 * m, 0.35 * m, 4.5 * m);
        for (let c = 0; c < 6; c++) {
          const on = (c + s) % 6 === chase % 6;
          g.fillStyle = on ? rgba(T.hold, 0.5 + 0.5 * mf.beat) : 'rgba(0,0,0,0.35)';
          g.fillRect(x + 0.05 * m, base - (4.2 - c * 0.65) * m, 0.25 * m, 0.45 * m);
        }
      }
    });
  },
};

// a row of components: chips with pin rows, capacitor cans and heat sinks, LEDs blinking on the hats
function components(f, par, col, hmul) {
  const { g, v, mf, T } = f,
    r = row(f, par),
    m = v.ppm;
  cells(r, 2.4, (i, X, u) => {
    const kind = Math.floor(hash(i, 11 + par * 10) * 3),
      h = (1.5 + u * 5) * hmul * m,
      w = (1.2 + hash(i, 5) * 0.8) * m;
    g.fillStyle = col;
    if (kind === 0) {
      // a chip stood up, its pins down both sides
      g.fillRect(X, r.base - h, w, h);
      g.fillStyle = rgba('#d8b25a', 0.25 + 0.2 * par);
      for (let y = r.base - h + 0.2 * m; y < r.base - 0.1 * m; y += 0.3 * m) {
        g.fillRect(X - 0.15 * m, y, 0.15 * m, 0.1 * m);
        g.fillRect(X + w, y, 0.15 * m, 0.1 * m);
      }
    } else if (kind === 1) {
      // a capacitor can: a round top with its vent cross
      g.fillRect(X, r.base - h, w * 0.7, h);
      g.beginPath();
      g.ellipse(X + w * 0.35, r.base - h, w * 0.35, 0.15 * m, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = rgba(T.line, 0.15 + 0.4 * mf.bass);
      g.lineWidth = v.dpr;
      g.beginPath();
      g.moveTo(X + w * 0.15, r.base - h);
      g.lineTo(X + w * 0.55, r.base - h);
      g.stroke();
    } else {
      // a heat sink: fins
      for (let k = 0; k < 5; k++) g.fillRect(X + (k * w) / 5, r.base - h, w / 10, h);
    }
    // (its status LED, blinking on the hats; more of them lit as the song grows)
    if (hash(i, 23) < 0.35 + 0.5 * mf.stage) {
      const on = hash(i, 29) < 0.5 ? mf.hat * 3 : mf.kick;
      glow(g, X + w * 0.3, r.base - h + 0.3 * m, 0.25 * m, T.win[i & 1 ? 0 : 1], clamp(0.15 + on, 0, 1) * (0.4 + par));
    }
  });
  return r;
}

// copper traces across a row with packets of data running along them, flashing on the kick
function traces(f, par, n) {
  const { g, v, mf, T, t } = f,
    r = row(f, par),
    m = v.ppm,
    sp = flow(mf);
  for (let k = 0; k < n; k++) {
    const Y = r.base - (0.6 + k * 0.9) * m;
    g.fillStyle = rgba(T.line, 0.12 + 0.35 * mf.kick * mf.amp);
    g.fillRect(-10, Y, v.W + 20, 0.08 * m);
    // (the packets: a run of three short bars, each its own speed)
    cells(r, 7, (i, X) => {
      const u = hash(i, k * 13 + 3),
        p = ((t * sp * (0.6 + u) + u * 7) % 7) * m;
      for (let d = 0; d < 3; d++) {
        g.fillStyle = rgba(d ? T.win[k % 3] : '#ffffff', (0.5 + 0.5 * mf.beat) * (1 - d * 0.3));
        g.fillRect(X + p - d * 0.35 * m, Y - 0.04 * m, 0.25 * m, 0.16 * m);
      }
    });
  }
}

// the far rows: the far components
function far(f) {
  components(f, 0.2, f.T.far, 1.2);
}

// the near rows: the traces with their packets, then the near components
function near(f) {
  traces(f, 0.3, 3);
  components(f, 0.45, f.T.near, 0.6);
}

export default {
  sky(f) {
    // the silicon far behind: a fine grid breathing with the bass
    const { g, v, mf, T } = f,
      step = 1.5 * v.ppm,
      ox = -((v.x * 0.03 * v.ppm) % step);
    g.fillStyle = rgba(T.line, 0.04 + 0.08 * mf.bass + 0.04 * mf.stage);
    for (let X = ox; X < v.W; X += step) g.fillRect(X, 0, v.dpr, v.H);
    for (let Y = 0; Y < v.H; Y += step) g.fillRect(0, Y, v.W, v.dpr);
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
      s = slab(f, a, b, y, tint(f, '#0a2418'), tint(f, '#1d5a3a', T.far, 0.3));
    if (!s) return;
    const m = v.ppm,
      sp = flow(mf);
    // traces along the board's face, a via where one dives, packets running along
    for (let r = 0; r < 4; r++) {
      const Y = s.Y + (0.35 + r * 0.5) * m;
      g.fillStyle = rgba('#d8b25a', 0.18 + 0.3 * mf.kick);
      g.fillRect(s.X0, Y, s.X1 - s.X0, 0.05 * m);
      for (let k = Math.floor(s.a / 1.2); k < s.b / 1.2; k++) {
        if (hash(k, r * 7 + 1) > 0.3) continue;
        g.strokeStyle = rgba(T.line, 0.4 + 0.5 * mf.kick);
        g.lineWidth = 0.04 * m;
        g.beginPath();
        g.arc(v.sx(k * 1.2 + 0.6), Y + 0.025 * m, 0.09 * m, 0, Math.PI * 2);
        g.stroke();
      }
      for (let k = Math.floor(s.a / 5); k < s.b / 5; k++) {
        const x = k * 5 + ((t * sp + hash(k, r) * 5) % 5);
        if (x < s.a || x > s.b) continue;
        g.fillStyle = rgba(T.win[r % 3], 0.6 + 0.4 * mf.beat);
        g.fillRect(v.sx(x), Y - 0.03 * m, 0.3 * m, 0.11 * m);
      }
    }
    // solder pads along the top, lit on the kick, more of them as the song grows
    for (let k = Math.floor(s.a / 0.4); k < s.b / 0.4; k++) {
      const u = hash(k, 61);
      if (u > 0.3 + 0.4 * mf.stage || k * 0.4 < s.a || k * 0.4 + 0.2 > s.b) continue;
      g.fillStyle = u < 0.15 ? rgba(T.line, 0.3 + 0.7 * mf.kick) : rgba('#d8b25a', 0.35 + 0.3 * mf.hat * 2);
      g.fillRect(v.sx(k * 0.4), s.Y + 0.08 * m, 0.2 * m, 0.1 * m);
    }
    edge(f, s);
  },
};
