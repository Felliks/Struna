// The wasteland: a dust storm walling the horizon and rolling in on the snare, scrap towers leaning and swaying with the
// bass, car wrecks and tyre stacks with oil barrels burning between them (their fires flaring on the kick, sparks
// spitting on the hats); landmarks by the song (a crashed airliner with its blinking beacon and smoke, a giant skull on
// a hill whose eyes burn with the bass, a ruined billboard whose bulbs flicker on the hats); cracked rusted earth with
// tyre tracks, dust kicked up off it on the snare.
import { clamp, hash, rgba } from '../util.js';
import { celestial, cells, edge, glow, landmark, row, slab, tint } from './kit.js';

const RUST = '#8a4a2a',
  DUST = '#d8a870',
  FIRE = '#ff8a2a',
  HOT = '#ffe08a';

// a fire's flames: tongues licking up from (X, Y), h px tall, taller on the kick
function flames(g, X, Y, w, h, t, seed, a = 1) {
  const gr = g.createLinearGradient(0, Y, 0, Y - h);
  gr.addColorStop(0, rgba(HOT, 0.9 * a));
  gr.addColorStop(0.5, rgba(FIRE, 0.7 * a));
  gr.addColorStop(1, rgba('#ff2b1a', 0));
  g.fillStyle = gr;
  g.beginPath();
  // (four tongues side by side, each licking up to its own height)
  for (let k = 0; k < 4; k++) {
    const x0 = X - w + (k / 4) * 2 * w,
      x1 = x0 + w / 2,
      hh = h * (0.45 + 0.55 * Math.abs(Math.sin(t * 9 + k * 1.7 + seed))) * (k === 1 || k === 2 ? 1 : 0.7);
    g.moveTo(x0 - w * 0.15, Y);
    g.quadraticCurveTo(x0 - w * 0.1, Y - hh * 0.6, (x0 + x1) / 2 + Math.sin(t * 7 + k) * w * 0.2, Y - hh);
    g.quadraticCurveTo(x1 + w * 0.1, Y - hh * 0.6, x1 + w * 0.15, Y);
  }
  g.fill();
}

export const LANDMARKS = {
  // a crashed airliner nose-down in the sand: its broken fuselage, a wing, its tail fin, a beacon on the beat, smoke
  plane(f) {
    const { g, v, mf, T, t } = f;
    landmark(f, 0.1, 50, 0.7, 1, (X, base) => {
      // (drawn half as big again: its tail stands high over the wrecks)
      const m = v.ppm * 1.5;
      for (let k = 0; k < 4; k++) {
        g.fillStyle = rgba('#3a3028', (0.22 - k * 0.04) * (0.5 + mf.bass));
        g.beginPath();
        g.arc(X - 3 * m + Math.sin(t * 0.5 + k) * m, base - (4 + k * 1.6) * m, (0.9 + k * 0.6) * m, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = T.far;
      g.beginPath();
      g.moveTo(X - 6 * m, base);
      g.lineTo(X - 5 * m, base - 2.2 * m);
      g.lineTo(X + 3 * m, base - 3.4 * m);
      g.lineTo(X + 3.4 * m, base - 1.6 * m);
      g.lineTo(X - 2 * m, base);
      g.fill();
      g.beginPath();
      g.moveTo(X + 2.6 * m, base - 3.3 * m);
      g.lineTo(X + 4.4 * m, base - 6 * m);
      g.lineTo(X + 4.9 * m, base - 6 * m);
      g.lineTo(X + 4 * m, base - 2.6 * m);
      g.fill();
      g.beginPath();
      g.moveTo(X - 2 * m, base - 1.6 * m);
      g.lineTo(X + 1.5 * m, base - 0.9 * m);
      g.lineTo(X + 2.5 * m, base - 0.3 * m);
      g.lineTo(X - 1.5 * m, base - 1 * m);
      g.fill();
      glow(g, X + 4.7 * m, base - 6 * m, (0.3 + 0.5 * mf.beat) * m, '#ff3b2a', 0.3 + 0.7 * mf.beat);
    });
  },
  // a giant skull half buried in a hill, its eye sockets burning with the bass
  skull(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.08, 45, 0.65, 2, (X, floor) => {
      // (half as big again and up on its hill)
      const m = v.ppm * 1.2,
        base = floor - 1.2 * m;
      g.fillStyle = T.far;
      g.beginPath();
      g.ellipse(X, base, 7 * m, 1.8 * m, 0, Math.PI, 0);
      g.fill();
      g.fillRect(X - 7 * m, base, 14 * m, floor - base + 1);
      g.beginPath();
      g.ellipse(X, base - 4 * m, 3 * m, 2.8 * m, 0, 0, Math.PI * 2);
      g.fill();
      g.fillRect(X - 1.8 * m, base - 2 * m, 3.6 * m, 1.6 * m);
      for (const ex of [-1.2, 1.2]) {
        glow(g, X + ex * m, base - 4 * m, (0.8 + 1.2 * mf.bass) * m, FIRE, 0.3 + 0.6 * mf.bass * (0.5 + mf.stage));
        g.fillStyle = rgba('#1a0c08', 0.85);
        g.beginPath();
        g.ellipse(X + ex * m, base - 4 * m, 0.75 * m, 0.6 * m, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = rgba(HOT, 0.2 + 0.7 * mf.bass);
        g.beginPath();
        g.arc(X + ex * m, base - 4 * m, (0.12 + 0.15 * mf.bass) * m, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = rgba('#1a0c08', 0.8);
      for (let k = 0; k < 5; k++) g.fillRect(X + (k - 2.5) * 0.65 * m + 0.1 * m, base - 1.6 * m, 0.4 * m, 0.7 * m);
    });
  },
  // a ruined billboard leaning on its legs, its torn panels and a row of bulbs flickering on the hats
  billboard(f) {
    const { g, v, mf, T, t } = f;
    landmark(f, 0.16, 26, 0.6, 3, (X, base, i) => {
      const m = v.ppm,
        hat = clamp(mf.hat * 2.5, 0, 1);
      g.save();
      g.translate(X, base);
      g.rotate(-0.08);
      g.fillStyle = T.far;
      g.fillRect(-1.6 * m, -4.6 * m, 0.2 * m, 4.6 * m);
      g.fillRect(1.4 * m, -4.3 * m, 0.2 * m, 4.3 * m);
      g.fillRect(-2.2 * m, -6.8 * m, 4.4 * m, 2.3 * m);
      // (its torn panels, some of them gone)
      for (let p = 0; p < 3; p++) {
        if (hash(i, p) < 0.3) continue;
        g.fillStyle = rgba(T.win[p % 3], 0.12 + 0.1 * mf.beat);
        g.fillRect((-2.05 + p * 1.4) * m, -6.65 * m, 1.3 * m, 2 * m * (0.5 + hash(i, p + 5) * 0.5));
      }
      for (let k = 0; k < 6; k++) {
        const on = hash(k + i * 8, Math.floor(t * 14)) < 0.3 + 0.7 * hat;
        g.fillStyle = rgba(HOT, on ? 0.5 + 0.5 * hat : 0.1);
        g.fillRect((-2 + k * 0.78) * m, -4.6 * m, 0.12 * m, 0.12 * m);
      }
      g.restore();
    });
  },
};

// the dust storm on the horizon: a wall of dust rolling, swelling forward on the snare
function storm(f) {
  const { g, v, mf, t } = f,
    r = row(f, 0.04),
    h = (4 + 2 * mf.snare + 1.5 * mf.stage) * v.ppm,
    gr = g.createLinearGradient(0, r.base - h * 1.3, 0, r.base);
  gr.addColorStop(0, rgba(DUST, 0));
  gr.addColorStop(1, rgba(DUST, 0.25 + 0.25 * mf.snare));
  g.fillStyle = gr;
  g.beginPath();
  // (across the row's frame: kit.js row)
  g.moveTo(r.L - 10, r.base);
  for (let X = r.L - 10; X < r.R + 40; X += 24) {
    const x = r.x(X);
    g.lineTo(X, r.base - h * (0.8 + 0.25 * Math.sin(x * 0.3 + t * 0.7) + 0.15 * Math.sin(x * 0.9 - t)));
  }
  g.lineTo(r.R + 40, r.base);
  g.fill();
}
// scrap towers of welded junk, leaning and swaying with the bass, a lamp on the beat on some
function scrap(f) {
  const { g, v, mf, T, t } = f,
    r = row(f, 0.18),
    m = v.ppm;
  cells(r, 5, (i, X, u) => {
    if (u > 0.55) return;
    const h = (3 + u * 7) * m,
      sw = Math.sin(t * 1.1 + i) * (0.05 + 0.25 * mf.bass) * m;
    g.fillStyle = T.far;
    g.beginPath();
    g.moveTo(X - 1.1 * m, r.base);
    for (let k = 1; k <= 5; k++) {
      const y = r.base - (h * k) / 5,
        dx = (hash(i, k) - 0.5) * 0.8 * m + (sw * k) / 5;
      g.lineTo(X - (1.1 - k * 0.16) * m + dx, y);
      g.lineTo(X - (0.6 - k * 0.1) * m + dx, y + 0.2 * m);
    }
    g.lineTo(X + 0.3 * m + sw, r.base - h);
    g.lineTo(X + 1.2 * m, r.base);
    g.fill();
    if (hash(i, 9) < 0.4)
      glow(g, X + 0.3 * m + sw, r.base - h, (0.3 + 0.4 * mf.beat) * m, '#ff3b2a', 0.3 + 0.6 * mf.beat);
  });
}
// wrecks near by: rusted cars and tyre stacks, burning barrels between them flaring on the kick, sparks on the hats
function wrecks(f) {
  const { g, v, mf, T, t } = f,
    r = row(f, 0.42),
    m = v.ppm,
    rust = tint(f, RUST, T.near, 0.55),
    hat = clamp(mf.hat * 2.5, 0, 1),
    // (they lie on a ridge of junk and sand, high enough to be seen over the roof he runs on)
    ridge = x => 2.8 + 0.5 * Math.sin(x * 0.35) + 0.25 * Math.sin(x * 1.3);
  g.fillStyle = tint(f, '#3a2418', T.near, 0.5);
  g.beginPath();
  // (across the row's frame, its screen's edges and bottom in it: kit.js row)
  g.moveTo(r.L - 10, r.B);
  for (let X = r.L - 10; X < r.R + 30; X += 12) g.lineTo(X, r.base - ridge(r.x(X)) * m);
  g.lineTo(r.R + 30, r.B);
  g.fill();
  cells(r, 4, (i, X, u) => {
    // (each a size and a half, standing on the ridge)
    const M = 1.5 * m,
      base = r.base - ridge(r.x(X)) * m + 0.1 * m;
    if (u < 0.3) {
      g.fillStyle = rust;
      g.beginPath();
      g.moveTo(X - 1.8 * M, base);
      g.lineTo(X - 1.7 * M, base - 0.7 * M);
      g.lineTo(X - 0.8 * M, base - 0.8 * M);
      g.lineTo(X - 0.4 * M, base - 1.35 * M);
      g.lineTo(X + 0.8 * M, base - 1.3 * M);
      g.lineTo(X + 1.3 * M, base - 0.7 * M);
      g.lineTo(X + 1.8 * M, base - 0.6 * M);
      g.lineTo(X + 1.8 * M, base);
      g.fill();
      g.fillStyle = rgba('#000000', 0.45);
      g.fillRect(X - 0.25 * M, base - 1.2 * M, 0.95 * M, 0.38 * M);
    } else if (u < 0.55) {
      g.fillStyle = T.near;
      for (let k = 0; k < 2 + (Math.floor(u * 8) % 3); k++) {
        g.beginPath();
        g.ellipse(X, base - (0.18 + k * 0.34) * M, 0.6 * M, 0.17 * M, 0, 0, Math.PI * 2);
        g.fill();
      }
    } else if (u < 0.8) {
      const fire = 0.4 + 0.6 * mf.kick * (0.6 + 0.4 * mf.amp);
      glow(g, X, base - 1.2 * M, (1 + 1.5 * mf.kick) * M, FIRE, 0.2 + 0.4 * mf.kick);
      g.fillStyle = rust;
      g.fillRect(X - 0.3 * M, base - 0.9 * M, 0.6 * M, 0.9 * M);
      g.fillStyle = rgba('#000000', 0.35);
      for (const y of [0.25, 0.6]) g.fillRect(X - 0.3 * M, base - y * M, 0.6 * M, 0.06 * M);
      flames(g, X, base - 0.9 * M, 0.3 * M, (0.35 + 0.75 * fire) * M, t, i);
      for (let k = 0; k < 5 * hat; k++) {
        const a = -Math.PI / 2 + (hash(k, Math.floor(t * 20) + i) - 0.5) * 1.6,
          d = (0.8 + 1.2 * hash(k + 3, Math.floor(t * 20))) * M;
        g.fillStyle = rgba(HOT, 0.6 + 0.4 * hat);
        g.fillRect(X + Math.cos(a) * d, base - 1.2 * M + Math.sin(a) * d, 2 * v.dpr, 2 * v.dpr);
      }
    }
  });
}

// the far rows: the dust storm on the horizon, the scrap towers
function far(f) {
  storm(f);
  scrap(f);
}
// the near rows: the wrecks near by
function near(f) {
  wrecks(f);
}

export default {
  sky(f) {
    celestial(f);
  },
  back(f) {
    // (the landmarks between the storm and the scrap towers, as made)
    storm(f);
    for (const l of f.look.landmarks) LANDMARKS[l]?.(f);
    scrap(f);
    near(f);
  },
  far,
  near,
  ground(f, a, b, y) {
    const { g, v, mf, t, L } = f,
      s = slab(f, a, b, y, tint(f, '#4a2a1a', f.T.near, 0.35), tint(f, DUST, f.T.far, 0.3));
    if (!s) return;
    // the cracked crust: plates of rust and earth, the cracks between them
    g.strokeStyle = rgba('#000000', 0.4);
    g.lineWidth = 1.5 * v.dpr;
    g.beginPath();
    for (let k = Math.floor(s.a / 1.1); k < s.b / 1.1; k++) {
      const x = k * 1.1 + hash(k, 2) * 0.4,
        X = v.sx(x);
      g.moveTo(X, s.Y + 0.22 * v.ppm);
      g.lineTo(X + (hash(k, 3) - 0.5) * 0.4 * v.ppm, s.Y + (0.6 + hash(k, 4)) * v.ppm);
      g.lineTo(X + (hash(k, 5) - 0.5) * 0.6 * v.ppm, s.Y + (1.6 + hash(k, 6)) * v.ppm);
      // (a rusted plate sunk in the crust here and there)
      if (hash(k, 7) < 0.4) {
        g.fillStyle = rgba(RUST, 0.5);
        g.fillRect(X, s.Y + 0.5 * v.ppm, 0.5 * v.ppm, 0.3 * v.ppm);
      }
    }
    g.stroke();
    // tyre tracks along the top
    g.fillStyle = rgba('#000000', 0.25);
    for (let k = Math.floor(s.a / 0.3); k < s.b / 0.3; k++)
      g.fillRect(v.sx(k * 0.3), s.Y + 0.26 * v.ppm, 0.15 * v.ppm, 0.07 * v.ppm);
    // dust kicked off the top on the snare
    if (mf.snare > 0.25)
      for (let k = Math.floor(s.a / 0.8); k < s.b / 0.8; k++) {
        const u = hash(k, Math.floor(t / L.A.beat) + 11);
        if (u > 0.4) continue;
        g.fillStyle = rgba(DUST, 0.35 * mf.snare);
        g.beginPath();
        g.arc(
          v.sx(k * 0.8) + (1 - mf.snare) * 0.4 * v.ppm,
          s.Y - (0.1 + (1 - mf.snare) * 0.5) * v.ppm,
          (0.1 + 0.3 * (1 - mf.snare)) * v.ppm,
          0,
          Math.PI * 2,
        );
        g.fill();
      }
    edge(f, s, FIRE);
  },
};
