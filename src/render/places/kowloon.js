// Kowloon: a walled slum of the future. A far wall of stacked flats whose tiny windows flicker on the hats, a nearer
// wall of bays sticking out at every floor, AC units on the facades, laundry on lines and wires sagging between the
// blocks swaying with the bass, holographic ad panels (shapes, no words) flashing on the kick; landmarks by the song (a
// giant hologram turning over the roofs, a mag-train gliding along its viaduct, a neon gate); a rain-wet tar roof whose
// puddles catch the ads, rain splashing on the snare.
import { hash, mixHex, rgba } from '../util.js';
import { celestial, cells, edge, glow, landmark, row, slab, tint } from './kit.js';

const HOLO = ['#29ffd0', '#ff4fd8', '#ffd84a'];

// a wall of flats at parallax `par`: blocks of stacked bays, their windows flickering, wires and laundry between them
function wall(f, par, col, hmul, near) {
  const { g, v, mf, T, t } = f,
    r = row(f, par),
    m = v.ppm,
    step = Math.floor(t * 10);
  cells(r, 1.8, (i, X) => {
    const w = 1.8 * (0.9 + 0.3 * hash(i, 11)),
      hgt = (5 + hash(i, 13 + par * 10) * 8) * hmul,
      top = r.base - hgt * m;
    g.fillStyle = col;
    g.fillRect(X, top, w * m, v.H * 2);
    // bays sticking out of the block at random floors
    const lit = mixHex(col, '#ffffff', 0.08);
    for (let k = 0; k < hgt / 0.9; k++) {
      const hb = hash(i * 17 + k, 3 + par * 100);
      if (hb > 0.35) continue;
      g.fillStyle = lit;
      g.fillRect(X - 0.15 * m + hb * 0.5 * m, top + k * 0.9 * m, (0.6 + hb) * m, 0.8 * m);
    }
    // the windows: a few always on, the rest flickering on the hats, the kick or the bass
    const cols = Math.max(2, Math.floor(w / 0.45)),
      rows = Math.floor(hgt / 0.9),
      cw = (w * m) / cols;
    for (let c = 0; c < cols; c++)
      for (let k = 0; k < rows; k++) {
        const hv = hash(i * 97 + c, k + par * 1000);
        if (hv > 0.35 + 0.2 * mf.stage) continue;
        const flick = hash(i * 31 + c * 7 + k, step) < 0.5 ? 1 : 0.25,
          on = hv < 0.14 ? (0.15 + 2.2 * mf.hat) * flick : hv < 0.24 ? mf.kick : hv < 0.3 ? 0.8 * mf.bass : 0.2 + 0.3 * mf.stage;
        g.fillStyle = rgba(T.win[Math.floor(hv * 40) % 3], Math.max(0.06, Math.min(1, on)) * (0.3 + par));
        g.fillRect(X + (c + 0.2) * cw, top + (k + 0.3) * 0.9 * m, cw * 0.55, 0.32 * m);
        // an AC unit under some windows
        if (near && hv < 0.06) {
          g.fillStyle = mixHex(col, '#c9ccd2', 0.35);
          g.fillRect(X + (c + 0.1) * cw, top + (k + 0.72) * 0.9 * m, cw * 0.75, 0.2 * m);
        }
      }
    if (!near) return;
    // wires sagging across to the next block, swaying with the bass
    g.strokeStyle = 'rgba(0,0,0,0.65)';
    g.lineWidth = 1.5 * v.dpr;
    g.beginPath();
    for (let n = 0; n < 3; n++) {
      const y0 = top + (0.6 + n * 1.3 + hash(i, n) * 0.8) * m,
        sag = (0.4 + 0.3 * hash(i, n + 5) + 0.5 * mf.bass * Math.sin(t * 3 + i + n)) * m;
      g.moveTo(X + 0.3 * w * m, y0);
      g.quadraticCurveTo(X + 2.1 * m, y0 + sag * 2, X + 3.9 * m, y0 + 0.2 * m);
    }
    g.stroke();
    // laundry on a line, flapping with the bass
    if (hash(i, 21) < 0.4) {
      const y0 = top + (1.5 + hash(i, 22) * 2) * m;
      for (let n = 0; n < 4; n++) {
        const sw = Math.sin(t * 4 + n + i) * 0.08 * (0.3 + mf.bass) * m;
        g.fillStyle = mixHex(T.win[n % 3], col, 0.5);
        g.fillRect(X + w * m + (0.15 + n * 0.4) * m + sw, y0 + 0.15 * m, 0.25 * m, (0.3 + 0.15 * hash(i, n)) * m);
      }
    }
    // a holographic ad: a panel of abstract shapes flashing on the kick, glitching out for a frame now and then
    if (hash(i, 5) < 0.28 && hash(i, step) > 0.07) {
      const col2 = HOLO[Math.floor(hash(i, 6) * 3)],
        a = 0.3 + 0.6 * mf.kick,
        Y = top + 1.2 * m,
        pw = 1.3 * m,
        ph = 0.9 * m,
        kind = Math.floor(hash(i, 7) * 3);
      glow(g, X + pw / 2, Y + ph / 2, (1 + 0.6 * mf.kick) * m, col2, 0.15 + 0.3 * mf.kick);
      g.fillStyle = rgba(col2, a * 0.35);
      g.fillRect(X, Y, pw, ph);
      g.fillStyle = rgba(col2, a);
      g.beginPath();
      if (kind === 0) g.arc(X + pw / 2, Y + ph / 2, ph * (0.25 + 0.1 * mf.bass), 0, Math.PI * 2);
      else if (kind === 1) {
        g.moveTo(X + pw * 0.3, Y + ph * 0.8);
        g.lineTo(X + pw * 0.5, Y + ph * 0.15);
        g.lineTo(X + pw * 0.7, Y + ph * 0.8);
      } else for (let b = 0; b < 4; b++) g.rect(X + pw * (0.15 + b * 0.2), Y + ph * (0.8 - 0.6 * hash(b, step >> 2)), pw * 0.12, ph * 0.6 * hash(b, step >> 2));
      g.fill();
      // its scanlines
      g.fillStyle = 'rgba(0,0,0,0.35)';
      for (let y = 0; y < ph; y += 3 * v.dpr) g.fillRect(X, Y + y, pw, v.dpr);
    }
  });
}

export const LANDMARKS = {
  // a giant hologram over the roofs: rings turning about a diamond, swelling with the bass, sliced on the hats
  hologram(f) {
    const { g, v, mf, T, t } = f;
    landmark(f, 0.06, 60, 0.8, 1, (X, base) => {
      const m = v.ppm,
        Y = base - 12 * m,
        s = (1 + 0.08 * mf.bass) * m,
        col = HOLO[0];
      const beam = g.createLinearGradient(0, base, 0, Y);
      beam.addColorStop(0, rgba(col, 0.25));
      beam.addColorStop(1, rgba(col, 0));
      g.fillStyle = beam;
      g.beginPath();
      g.moveTo(X - 0.3 * m, base);
      g.lineTo(X - 4 * s, Y);
      g.lineTo(X + 4 * s, Y);
      g.lineTo(X + 0.3 * m, base);
      g.fill();
      glow(g, X, Y, 6 * s, T.hold, 0.12 + 0.25 * mf.kick);
      const off = mf.hat > 0.3 ? (hash(Math.floor(t * 20), 3) - 0.5) * 0.6 * m : 0;
      g.lineWidth = 2 * v.dpr;
      for (let k = 0; k < 3; k++) {
        g.strokeStyle = rgba(HOLO[k], 0.35 + 0.5 * mf.kick);
        g.beginPath();
        g.ellipse(X + (k === 1 ? off : 0), Y, (3 + k) * s * Math.abs(Math.cos(t * 0.6 + k)), (1.2 + k * 0.6) * s, k * 0.5, 0, Math.PI * 2);
        g.stroke();
      }
      g.fillStyle = rgba(T.hold, 0.3 + 0.5 * mf.kick);
      g.beginPath();
      g.moveTo(X + off, Y - 2.5 * s);
      g.lineTo(X + 1.4 * s * Math.cos(t), Y);
      g.lineTo(X - off, Y + 2.5 * s);
      g.lineTo(X - 1.4 * s * Math.cos(t), Y);
      g.fill();
    });
  },
  // a mag-train on its viaduct: pillars, a rail, cars gliding by with lit windows and an underglow on the beat
  magtrain(f) {
    const { g, v, mf, T, t } = f;
    landmark(f, 0.22, 50, 1, 2, (X, base, i) => {
      const m = v.ppm,
        deck = base - 7 * m;
      g.fillStyle = T.far;
      g.fillRect(X - 25 * m, deck, 50 * m, 0.35 * m);
      for (let p = -24; p < 25; p += 8) g.fillRect(X + p * m - 0.25 * m, deck, 0.5 * m, 7 * m);
      g.fillStyle = rgba(T.line, 0.3 + 0.5 * mf.kick);
      g.fillRect(X - 25 * m, deck + 0.35 * m, 50 * m, 0.06 * m);
      const tx = (((t * 12 + i * 23) % 80) + 80) % 80 - 40;
      if (tx < -25 || tx > 16) return;
      for (let c = 0; c < 3; c++) {
        const x0 = X + (tx + c * 3.1) * m;
        g.fillStyle = mixHex(T.far, '#ffffff', 0.12);
        g.beginPath();
        g.roundRect(x0, deck - 1.1 * m, 3 * m, 1 * m, 0.35 * m);
        g.fill();
        for (let w = 0; w < 5; w++) {
          g.fillStyle = rgba(T.win[(w + c) % 3], 0.4 + 0.6 * (hash(c * 5 + w, Math.floor(t * 6)) < 0.5 ? mf.hat * 2 : 0.4));
          g.fillRect(x0 + (0.2 + w * 0.55) * m, deck - 0.85 * m, 0.35 * m, 0.25 * m);
        }
      }
      glow(g, X + (tx + 4.6) * m, deck + 0.1 * m, (2 + 2 * mf.beat) * m, T.line, 0.2 + 0.4 * mf.beat);
    });
  },
  // a neon gate over the alley: two pillars, two lintels outlined in light on the beat, lanterns on the hats
  torii(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.12, 45, 0.6, 3, (X, base) => {
      const m = v.ppm;
      g.fillStyle = T.far;
      for (const px of [-2.6, 2.2]) g.fillRect(X + px * m, base - 7 * m, 0.4 * m, 7 * m);
      g.fillRect(X - 3.6 * m, base - 7.4 * m, 7.2 * m, 0.5 * m);
      g.fillRect(X - 3 * m, base - 6.1 * m, 6 * m, 0.3 * m);
      g.strokeStyle = rgba(T.hold, 0.4 + 0.6 * mf.beat);
      g.lineWidth = 2 * v.dpr;
      g.strokeRect(X - 3.6 * m, base - 7.4 * m, 7.2 * m, 0.5 * m);
      for (let k = 0; k < 5; k++) glow(g, X + (-2 + k) * m, base - 5.4 * m, 0.35 * m, '#ff3b4f', 0.25 + 0.7 * mf.hat * 2 * (k % 2 ? 1 : 0.6));
    });
  },
};

// the far rows: the far wall of stacked flats
function far(f) {
  wall(f, 0.15, f.T.far, 1.1, false);
}
// the near rows: the nearer wall, its signs and its pipes
function near(f) {
  wall(f, 0.38, f.T.near, 0.7, true);
}

export default {
  sky(f) {
    celestial(f);
  },
  back(f) {
    for (const l of f.look.landmarks) LANDMARKS[l]?.(f);
    far(f);
    near(f);
  },
  far,
  near,
  ground(f, a, b, y) {
    const { g, v, mf, T, t, L } = f,
      s = slab(f, a, b, y, tint(f, '#2a2228'), 'rgba(255,255,255,0.05)');
    if (!s) return;
    // tar seams across the roof
    g.fillStyle = 'rgba(0,0,0,0.4)';
    for (let x = Math.ceil(s.a / 1.4) * 1.4; x < s.b; x += 1.4) g.fillRect(v.sx(x), s.Y, v.dpr * 1.5, 0.22 * v.ppm);
    // puddles catching the ads, brighter on the kick
    for (let k = Math.floor(s.a / 2.3); k < s.b / 2.3; k++) {
      const h = hash(k, 61);
      if (h > 0.55) continue;
      g.fillStyle = rgba(HOLO[k % 3], 0.12 + 0.35 * mf.kick);
      g.fillRect(v.sx(k * 2.3), s.Y + 0.03 * v.ppm, (0.5 + h) * v.ppm, 0.05 * v.ppm);
    }
    // the flats under the roof: windows flickering on the hats, an AC unit's fan turning
    const step = Math.floor(t * 10);
    for (let k = Math.floor(s.a / 0.5); k < s.b / 0.5; k++) {
      const wx = k * 0.5 + 0.1;
      if (wx < s.a || wx + 0.3 > s.b) continue;
      for (let r = 0; r < 5; r++) {
        const h = hash(k, r * 37 + 9),
          on = h < 0.1 + 0.3 * mf.stage ? (hash(k + r, step) < 0.6 ? 0.3 + 2 * mf.hat : 0.1) : h < 0.2 ? mf.kick * mf.amp : 0;
        g.fillStyle = on > 0.05 ? rgba(T.win[Math.floor(h * 30) % 3], Math.min(1, on)) : 'rgba(255,255,255,0.04)';
        g.fillRect(v.sx(wx), v.sy(y - 0.5 - r * 0.75), 0.3 * v.ppm, 0.38 * v.ppm);
        if (h > 0.93) {
          g.fillStyle = '#59606e';
          g.fillRect(v.sx(wx - 0.05), v.sy(y - 0.95 - r * 0.75), 0.4 * v.ppm, 0.12 * v.ppm);
        }
      }
    }
    // rain splashing off the roof on the snare
    if (mf.snare > 0.2) {
      g.strokeStyle = rgba('#cfe8ff', 0.6 * mf.snare);
      g.lineWidth = v.dpr;
      g.beginPath();
      const beat = Math.floor(t / L.A.beat);
      for (let k = Math.floor(s.a / 0.5); k < s.b / 0.5; k++) {
        if (hash(k, beat) > 0.3) continue;
        const X = v.sx(k * 0.5 + hash(k, 3) * 0.5),
          h = (0.06 + 0.12 * mf.snare) * v.ppm;
        g.moveTo(X, s.Y);
        g.lineTo(X - h * 0.6, s.Y - h);
        g.moveTo(X, s.Y);
        g.lineTo(X + h * 0.6, s.Y - h);
      }
      g.stroke();
    }
    edge(f, s, T.hold);
  },
};
