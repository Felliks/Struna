// The casino: the Las Vegas Strip at night. Hotel towers far off, their crowns lit and their windows flickering on the
// hats and bass; a nearer row of casino fronts under giant marquees, their bulbs chasing on the hats and their panels
// flashing on the kick; landmarks by the song (a lattice tower like Paris's, its lights sparkling on the hats and its
// beacon on the beat; a dancing fountain, its jets leaping with the bass and towering on the drops; a giant marquee
// sign with a slot reel spinning); a jackpot burst of coins over it all on each drop; the boulevard underfoot, a carpet
// of gold diamonds with a strip of bulbs chasing along its edge.
import { clamp, hash, rgba } from '../util.js';
import { cells, edge, glow, landmark, row, slab, tint } from './kit.js';

const GOLD = '#ffd34a',
  BULB = '#fff1b8',
  RED = '#ff2b4a',
  PINK = '#ff3df0';

// a run of bulbs from (x0, y0) to (x1, y1) on screen, every third one lit in turn (the chase steps on the eighths and
// flares on the hats)
function bulbs(f, x0, y0, x1, y1, n, r, salt = 0) {
  const { g, mf, t, L } = f,
    step = Math.floor((t / L.A.beat) * 2) + salt,
    hat = clamp(mf.hat * 2.5, 0, 1);
  for (let i = 0; i < n; i++) {
    const u = n > 1 ? i / (n - 1) : 0,
      on = (i + step) % 3 === 0;
    g.fillStyle = rgba(on ? BULB : GOLD, on ? 0.6 + 0.4 * hat : 0.18 + 0.15 * mf.beat);
    g.beginPath();
    g.arc(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, r, 0, Math.PI * 2);
    g.fill();
  }
}
// a sign's frame of chasing bulbs round a rectangle on screen
function bulbFrame(f, X, Y, w, h, r, salt) {
  const n = Math.max(3, Math.round(w / (r * 4))),
    nv = Math.max(2, Math.round(h / (r * 4)));
  bulbs(f, X, Y, X + w, Y, n, r, salt);
  bulbs(f, X + w, Y, X + w, Y + h, nv, r, salt + n);
  bulbs(f, X + w, Y + h, X, Y + h, n, r, salt + n + nv);
  bulbs(f, X, Y + h, X, Y, nv, r, salt + 2 * n + nv);
}

export const LANDMARKS = {
  // a lattice tower: four legs tapering to a spire, its girders sparkling on the hats, a beacon on the beat
  eiffel(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.08, 50, 0.7, 11, (X, base) => {
      const m = v.ppm,
        top = base - 13 * m;
      g.fillStyle = T.far;
      g.beginPath();
      g.moveTo(X - 3.2 * m, base);
      g.quadraticCurveTo(X - 0.9 * m, base - 6 * m, X - 0.15 * m, top);
      g.lineTo(X + 0.15 * m, top);
      g.quadraticCurveTo(X + 0.9 * m, base - 6 * m, X + 3.2 * m, base);
      g.lineTo(X + 2.2 * m, base);
      g.quadraticCurveTo(X, base - 3 * m, X - 2.2 * m, base);
      g.fill();
      g.fillRect(X - 1.6 * m, base - 4.2 * m, 3.2 * m, 0.25 * m);
      g.fillRect(X - 0.8 * m, base - 8.4 * m, 1.6 * m, 0.2 * m);
      // its sparkle: lights scattered over the girders, twinkling on the hats
      for (let k = 0; k < 26; k++) {
        const yy = hash(k, 3),
          half = 3.2 * (1 - yy) ** 1.6 + 0.15,
          sp = hash(k + Math.floor(f.t * 12), 7) < 0.25 + 0.6 * mf.hat * 2;
        g.fillStyle = rgba(BULB, sp ? 0.9 : 0.2);
        g.fillRect(X + (hash(k, 5) * 2 - 1) * half * m, base - yy * 13 * m, 0.12 * m, 0.12 * m);
      }
      glow(g, X, top, (0.4 + 0.7 * mf.beat) * m, GOLD, 0.4 + 0.6 * mf.beat);
    });
  },
  // a dancing fountain in its lake: a row of jets leaping with the bass, a wave across them on the beat, towering on
  // the drops, lit from under in the song's colours
  fountain(f) {
    const { g, v, mf, T, t, L } = f;
    landmark(f, 0.22, 34, 0.75, 12, (X, base) => {
      const m = v.ppm,
        ph = (t / L.A.beat) * Math.PI;
      g.fillStyle = rgba(T.line, 0.15 + 0.2 * mf.bass);
      g.fillRect(X - 7 * m, base - 0.3 * m, 14 * m, 0.3 * m);
      for (let k = 0; k < 11; k++) {
        const x = X + (k - 5) * 1.25 * m,
          wave = 0.5 + 0.5 * Math.sin(ph + k * 0.7),
          h = (0.6 + 3 * mf.bass * (0.4 + 0.6 * wave) + 7 * mf.drop) * m,
          col = mf.drop > 0.3 ? '#ffffff' : T.win[k % 3],
          gr = g.createLinearGradient(0, base, 0, base - h);
        gr.addColorStop(0, rgba(col, 0.7));
        gr.addColorStop(1, rgba('#ffffff', 0));
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(x - 0.18 * m, base);
        g.quadraticCurveTo(x, base - h * 1.15, x + 0.18 * m, base);
        g.fill();
      }
      glow(g, X, base - 1 * m, 6 * m, T.line, 0.1 + 0.25 * mf.drop);
    });
  },
  // a giant marquee on its pylon: bulbs chasing round it, its panel flashing on the kick, a slot reel spinning that
  // stops on three of a kind on the drops
  marquee(f) {
    const { g, v, mf, T, t } = f;
    landmark(f, 0.16, 26, 0.7, 13, (X, base, i) => {
      const m = v.ppm,
        w = 5 * m,
        h = 2.6 * m,
        Y = base - 9.5 * m;
      g.fillStyle = T.far;
      g.fillRect(X - 0.45 * m, Y + h, 0.9 * m, base - Y - h);
      g.fillStyle = rgba(i % 2 ? RED : PINK, 0.35 + 0.65 * mf.kick);
      g.fillRect(X - w / 2, Y, w, h);
      g.fillStyle = '#14080e';
      for (let c = 0; c < 3; c++) g.fillRect(X - 2 * m + c * 1.4 * m, Y + 0.5 * m, 1.2 * m, 1.6 * m);
      // the reels: symbols rolling down, all three the same on a drop
      for (let c = 0; c < 3; c++) {
        const roll = mf.drop > 0.3 ? 0 : ((t * (6 + c * 2)) % 1) * 1.6,
          sym = mf.drop > 0.3 ? 0 : Math.floor(t * (6 + c * 2) + c * 3) % 3;
        g.fillStyle = [GOLD, RED, T.win[0]][sym];
        g.beginPath();
        g.arc(X - 1.4 * m + c * 1.4 * m, Y + 1.3 * m + (roll - 0.8) * 0.6 * m, 0.38 * m, 0, Math.PI * 2);
        g.fill();
      }
      bulbFrame(f, X - w / 2, Y, w, h, 0.1 * m, i * 7);
    });
  },
};

// a row of towers or casino fronts at parallax par: windows on the hats and bass, each front crowned with a marquee
function strip(f, par, col, hmul, signs) {
  const { g, v, mf, T } = f,
    r = row(f, par),
    m = v.ppm;
  cells(r, 4, (i, X) => {
    const w = 4 * (0.6 + 0.35 * hash(i, 7 + par * 10)),
      hgt = (4 + 10 * hash(i, 3 + par * 10)) * hmul,
      top = r.base - hgt * m;
    g.fillStyle = col;
    g.fillRect(X, top, w * m, v.H * 2);
    // (its crown: a band lit along its top, in the song's colours on the bass)
    g.fillStyle = rgba(T.win[((i % 3) + 3) % 3], 0.2 + 0.6 * mf.bass);
    g.fillRect(X, top, w * m, 0.18 * m);
    for (let c = 0; c < Math.floor(w / 0.6); c++)
      for (let k = 1; k < hgt / 0.8; k++) {
        const hv = hash(i * 97 + c, k + par * 500);
        if (hv > 0.25 + 0.3 * mf.stage) continue;
        g.fillStyle = rgba(T.win[Math.floor(hv * 30) % 3], (hv < 0.1 ? 0.2 + mf.hat * 2 : 0.15 + 0.5 * mf.bass) * (0.4 + par));
        g.fillRect(X + (c + 0.3) * 0.6 * m, top + k * 0.8 * m, 0.25 * m, 0.4 * m);
      }
    if (!signs || hash(i, 21) > 0.7) return;
    const sw = w * 0.8 * m,
      sh = 1.3 * m,
      sx = X + w * 0.1 * m,
      sy = r.base - 4.2 * m;
    g.fillStyle = rgba(hash(i, 4) < 0.5 ? RED : PINK, 0.25 + 0.7 * mf.kick);
    g.fillRect(sx, sy, sw, sh);
    bulbFrame(f, sx, sy, sw, sh, 0.07 * m, i * 5);
  });
  return r;
}

// the jackpot: coins and stars spraying up over the Strip on each drop and raining back down
function jackpot(f) {
  const { g, v, mf, t } = f;
  if (mf.drop < 0.05) return;
  const n = Math.round(60 * mf.drop);
  for (let k = 0; k < n; k++) {
    const u = (t * 0.7 + hash(k, 3)) % 1,
      a = -Math.PI / 2 + (hash(k, 5) - 0.5) * 2.2,
      sp = 0.6 + 0.6 * hash(k, 9),
      X = v.W * 0.5 + Math.cos(a) * u * v.W * 0.6 * sp,
      Y = v.H * 0.75 + Math.sin(a) * u * v.H * sp + u * u * v.H * 0.9,
      r = (0.08 + 0.06 * hash(k, 2)) * v.ppm,
      flip = Math.abs(Math.cos(t * 9 + k));
    g.fillStyle = rgba(k % 4 ? GOLD : BULB, mf.drop * (1 - u));
    g.beginPath();
    g.ellipse(X, Y, r * (0.2 + 0.8 * flip), r, 0, 0, Math.PI * 2);
    g.fill();
  }
}

// the far rows: the far Strip, its towers' windows and crowns lit
function far(f) {
  strip(f, 0.12, f.T.far, 1, false);
}

// the near rows: the near Strip with its bulb-framed signs
function near(f) {
  strip(f, 0.38, tint(f, '#1a0c16', f.T.near, 0.6), 0.6, true);
}

// over the rows: the jackpot spraying up over the Strip on the drops
function after(f) {
  jackpot(f);
}

export default {
  back(f) {
    far(f);
    for (const l of f.look.landmarks) LANDMARKS[l]?.(f);
    near(f);
    after(f);
  },
  far,
  near,
  after,
  ground(f, a, b, y) {
    const { g, v, mf, T } = f,
      // (the boulevard much darker than the casino fronts behind it and its edge bright gold: of the same dark red as
      // them it read as one wall with them, the road he runs on lost in it)
      s = slab(f, a, b, y, tint(f, '#0c0306', T.near, 0.15), rgba(GOLD, 0.35 + 0.3 * mf.kick));
    if (!s) return;
    const m = v.ppm;
    // the carpet: rows of gold diamonds, a row lit in turn on the kick
    for (let k = Math.floor(s.a / 0.8); k < s.b / 0.8; k++)
      for (let r = 0; r < 3; r++) {
        const X = v.sx(k * 0.8 + (r % 2 ? 0.4 : 0)),
          Y = s.Y + (0.6 + r * 0.7) * m,
          lit = hash(k, r + 11) < 0.15 + 0.5 * mf.kick * mf.amp;
        g.fillStyle = rgba(lit ? GOLD : T.line, lit ? 0.7 : 0.12 + 0.1 * mf.beat);
        g.beginPath();
        g.moveTo(X, Y - 0.2 * m);
        g.lineTo(X + 0.16 * m, Y);
        g.lineTo(X, Y + 0.2 * m);
        g.lineTo(X - 0.16 * m, Y);
        g.fill();
      }
    // the strip of bulbs along the boulevard's edge, chasing
    for (let k = Math.ceil(s.a / 0.35); k < s.b / 0.35; k++) bulbs(f, v.sx(k * 0.35), s.Y + 0.2 * m, 0, 0, 1, 0.06 * m, k);
    edge(f, s, GOLD);
  },
};
