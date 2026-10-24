// Neon Tokyo at night (and old Kyoto in it): the moon or the sun by the song, a skyline of towers hung with vertical
// neon signs of glyph strokes flickering on the kick, a nearer street of sakura trees swaying with the bass, strings of
// paper lanterns swinging on the beat and vending machines humming; petals drifting down, fluttering on the hats, more
// of them as the song grows; landmarks by the song (a pagoda with its eaves lit, a row of torii gates, a snowy mountain
// breathing with the voice); a street of stone flags with the lanterns' light pooled on it.
import { clamp, hash, rgba } from '../util.js';
import { celestial, cells, edge, flat, glow, landmark, row, slab, tint } from './kit.js';

const RED = '#e8343c',
  PAPER = '#ffb45a',
  PINK = '#ffb7d0';

// a sign's glyph: a few strokes (a bar, a post, a hook, a slash) picked by the hash, no real letters
function glyph(g, X, Y, s, seed) {
  g.beginPath();
  for (let k = 0; k < 4; k++) {
    const u = hash(seed, k * 7 + 1),
      a = hash(seed, k * 7 + 2),
      b = hash(seed, k * 7 + 3);
    if (u < 0.35) {
      g.moveTo(X - s * 0.4, Y - s * 0.4 + a * s * 0.8);
      g.lineTo(X + s * 0.4, Y - s * 0.4 + a * s * 0.8);
    } else if (u < 0.65) {
      g.moveTo(X - s * 0.3 + b * s * 0.6, Y - s * 0.45);
      g.lineTo(X - s * 0.3 + b * s * 0.6, Y + s * 0.45);
    } else {
      g.moveTo(X - s * 0.4 * a, Y - s * 0.3);
      g.lineTo(X + s * 0.4 * b, Y + s * 0.4);
    }
  }
  g.stroke();
}
// a neon tube's flicker: lit on the kick, now and then dropping out for a moment
const flicker = (mf, t, i) => (Math.sin(t * 31 + i * 7) + Math.sin(t * 17.3 + i) > 1.6 ? 0.15 : 0.35 + 0.65 * mf.kick);

export const LANDMARKS = {
  // a pagoda: five tiers of upturned eaves, a lantern under each lit on the beat, its spire's tip on the kick
  pagoda(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.09, 42, 0.75, 1, (X, base) => {
      const m = v.ppm;
      g.fillStyle = T.far;
      for (let k = 0; k < 5; k++) {
        const y = base - (1.8 + k * 1.7) * m,
          w = (3.4 - k * 0.45) * m;
        g.fillRect(X - w * 0.35, y, w * 0.7, 1.8 * m);
        g.beginPath();
        g.moveTo(X - w * 0.75, y - 0.1 * m);
        g.quadraticCurveTo(X - w * 0.4, y + 0.15 * m, X, y - 0.6 * m);
        g.quadraticCurveTo(X + w * 0.4, y + 0.15 * m, X + w * 0.75, y - 0.1 * m);
        g.lineTo(X, y + 0.2 * m);
        g.fill();
        glow(g, X, y + 0.8 * m, 0.5 * m, PAPER, (k / 5 < 0.3 + mf.stage ? 0.35 : 0.1) + 0.5 * mf.beat);
      }
      g.fillRect(X - 0.05 * m, base - 12 * m, 0.1 * m, 2 * m);
      glow(g, X, base - 12 * m, (0.3 + 0.4 * mf.kick) * m, RED, 0.4 + 0.6 * mf.kick);
    });
  },
  // a row of torii gates going off, their red lit along on the kick
  torii(f) {
    const { g, v, mf } = f;
    landmark(f, 0.22, 16, 0.65, 2, (X, base, i) => {
      const m = v.ppm;
      for (let k = 0; k < 3; k++) {
        const x = X + k * 1.6 * m,
          s = 1 - k * 0.15;
        g.fillStyle = rgba(RED, (0.5 + 0.5 * (k === i % 3 ? mf.kick : 0.3)) * (1 - k * 0.2));
        g.fillRect(x - 1.1 * s * m, base - 3.4 * s * m, 0.18 * s * m, 3.4 * s * m);
        g.fillRect(x + 0.92 * s * m, base - 3.4 * s * m, 0.18 * s * m, 3.4 * s * m);
        g.fillRect(x - 1.5 * s * m, base - 3.6 * s * m, 3 * s * m, 0.22 * s * m);
        g.fillRect(x - 1.2 * s * m, base - 2.9 * s * m, 2.4 * s * m, 0.14 * s * m);
      }
    });
  },
  // a snowy mountain far off, its cap glowing with the voice
  fuji(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.03, 80, 0.9, 3, (X, base) => {
      const m = v.ppm;
      g.fillStyle = T.far;
      g.beginPath();
      g.moveTo(X - 14 * m, base);
      g.lineTo(X - 2 * m, base - 9 * m);
      g.lineTo(X + 2 * m, base - 9 * m);
      g.lineTo(X + 14 * m, base);
      g.fill();
      g.fillStyle = rgba('#f4f0ff', 0.4 + 0.4 * (mf.voice ?? 0));
      g.beginPath();
      g.moveTo(X - 4.2 * m, base - 7 * m);
      g.lineTo(X - 2 * m, base - 9 * m);
      g.lineTo(X + 2 * m, base - 9 * m);
      g.lineTo(X + 4.2 * m, base - 7 * m);
      g.lineTo(X + 1 * m, base - 7.6 * m);
      g.lineTo(X - 1.5 * m, base - 7.1 * m);
      g.fill();
    });
  },
};

// the far skyline: towers, each with a vertical sign of glyphs flickering on the kick
function skyline(f) {
  const { g, v, mf, T, t } = f,
    r = row(f, 0.18),
    m = v.ppm;
  cells(r, 2.6, (i, X, u, seen) => {
    const h = (3 + u * 8) * m,
      w = (1.6 + hash(i, 4) * 0.8) * m;
    g.fillStyle = T.far;
    g.fillRect(X, r.base - h, w, v.H);
    // (decided by the world's stage as it came into view: kit.js stageSeen, never popping in in sight)
    if (hash(i, 9) > 0.35 + 0.5 * seen()) return;
    const col = [T.hold, T.slide, PINK, T.win[0]][Math.floor(hash(i, 13) * 4)],
      a = flicker(mf, t, i),
      n = 2 + Math.floor(hash(i, 17) * 3),
      s = 0.55 * m;
    g.fillStyle = rgba('#05040a', 0.8);
    g.fillRect(X + w * 0.6, r.base - h + 0.4 * m, s + 0.2 * m, n * s * 1.15 + 0.2 * m);
    g.strokeStyle = rgba(col, a);
    g.lineWidth = 2 * v.dpr;
    for (let k = 0; k < n; k++) glyph(g, X + w * 0.6 + 0.1 * m + s / 2, r.base - h + 0.5 * m + (k + 0.5) * s * 1.15, s * 0.8, i * 10 + k);
    glow(g, X + w * 0.6 + s / 2, r.base - h + n * s * 0.6, n * s * 0.7, col, 0.08 + 0.2 * a * mf.amp);
  });
}

// the street: sakura swaying with the bass, vending machines, lantern strings swinging on the beat
function street(f) {
  const { g, v, mf, T, t, L } = f,
    r = row(f, 0.45),
    m = v.ppm,
    swing = Math.sin((t / L.A.beat) * Math.PI) * (0.08 + 0.2 * mf.amp);
  cells(r, 3.2, (i, X, u) => {
    const kind = hash(i, 31);
    if (kind < 0.55) {
      // a sakura: a trunk, a crown of blossom balls swaying with the bass
      const h = (2.2 + u * 1.5) * m,
        sway = Math.sin(t * 1.2 + i) * (0.05 + 0.15 * mf.bass) * m;
      g.fillStyle = tint(f, '#1a0e12', T.near, 0.4);
      g.fillRect(X - 0.1 * m, r.base - h, 0.2 * m, h);
      for (const [dx, dy, rr] of [[0, -0.3, 1.0], [-0.8, 0, 0.75], [0.8, 0.1, 0.8], [0.3, 0.4, 0.6]]) {
        g.fillStyle = rgba(PINK, 0.35 + 0.15 * mf.stage + 0.15 * mf.beat);
        g.beginPath();
        g.arc(X + dx * m + sway, r.base - h + dy * m, rr * m, 0, Math.PI * 2);
        g.fill();
      }
    } else if (kind < 0.75) {
      // a vending machine: its lit face and rows of bottles, humming with the hats
      g.fillStyle = T.near;
      g.fillRect(X, r.base - 1.9 * m, 0.95 * m, 1.9 * m);
      g.fillStyle = rgba(T.win[2], 0.4 + 0.4 * clamp(mf.hat * 2.5, 0, 1));
      g.fillRect(X + 0.08 * m, r.base - 1.8 * m, 0.79 * m, 1.0 * m);
      for (let k = 0; k < 3; k++)
        for (let c = 0; c < 4; c++) {
          g.fillStyle = [RED, T.slide, PAPER][(c + k) % 3];
          g.fillRect(X + (0.14 + c * 0.18) * m, r.base - (1.7 - k * 0.3) * m, 0.1 * m, 0.2 * m);
        }
    }
    // a string of lanterns from a pole, swinging on the beat
    if (hash(i, 37) < 0.6) {
      g.strokeStyle = tint(f, '#2a1a14', T.near, 0.3);
      g.lineWidth = v.dpr;
      g.beginPath();
      g.moveTo(X, r.base - 3.4 * m);
      g.quadraticCurveTo(X + 1.6 * m, r.base - 2.9 * m, X + 3.2 * m, r.base - 3.4 * m);
      g.stroke();
      for (let k = 1; k < 5; k++) {
        const lx = X + k * 0.64 * m,
          ly = r.base - (3.4 - 0.4 * Math.sin((k / 5) * Math.PI)) * m,
          a = swing * (k % 2 ? 1 : -0.8),
          px = lx + Math.sin(a) * 0.35 * m,
          py = ly + Math.cos(a) * 0.35 * m;
        glow(g, px, py, 0.5 * m, PAPER, 0.15 + 0.35 * mf.beat);
        g.fillStyle = k % 2 ? RED : PAPER;
        g.beginPath();
        g.ellipse(px, py, 0.14 * m, 0.19 * m, -a, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
}

// petals drifting across the screen, fluttering on the hats, more of them as the song grows
function petals(f) {
  // (across the screen, not in a row's frame)
  flat(f);
  const { g, v, mf, t } = f,
    m = v.ppm,
    n = Math.round(14 + 40 * mf.stage);
  g.fillStyle = rgba(PINK, 0.75);
  for (let i = 0; i < n; i++) {
    const u = hash(i, 71),
      w = hash(i, 73),
      x = (((u * v.W - t * (0.4 + w) * m - v.x * 0.5 * m) % v.W) + v.W) % v.W,
      y = ((w * v.H + t * (0.5 + u * 0.6) * m) % v.H),
      fl = Math.sin(t * (3 + 9 * mf.hat) + i) * 0.6;
    g.beginPath();
    g.ellipse(x + fl * 0.2 * m, y, 0.07 * m, 0.04 * m, fl, 0, Math.PI * 2);
    g.fill();
  }
}

// the far rows: the far skyline
function far(f) {
  skyline(f);
}

// the near rows: the street
function near(f) {
  street(f);
}

// over the rows: petals drifting across the screen
function after(f) {
  petals(f);
}

export default {
  sky(f) {
    celestial(f);
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
    const { g, v, mf, T } = f,
      s = slab(f, a, b, y, tint(f, '#16121a'), tint(f, '#3a2a30', T.far, 0.3));
    if (!s) return;
    const m = v.ppm;
    // stone flags, staggered course by course
    for (let r = 0; r < 4; r++) {
      const Y = s.Y + (0.22 + r * 0.5) * m,
        off = r % 2 ? 0.45 : 0;
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.fillRect(s.X0, Y, s.X1 - s.X0, 0.03 * m);
      for (let k = Math.floor((s.a - off) / 0.9); k < (s.b - off) / 0.9; k++) g.fillRect(v.sx(k * 0.9 + off), Y, 0.03 * m, 0.5 * m);
    }
    // the lanterns' light pooled on the street, warm on the beat, and the neon's on the kick
    for (let k = Math.floor(s.a / 3.2); k < s.b / 3.2; k++) {
      const X = v.sx(k * 3.2 + 1.6);
      glow(g, X, s.Y + 0.1 * m, 1.3 * m, hash(k, 3) < 0.5 ? PAPER : T.hold, 0.1 + 0.25 * (hash(k, 3) < 0.5 ? mf.beat : mf.kick));
    }
    // petals lying along the top
    for (let k = Math.floor(s.a / 0.25); k < s.b / 0.25; k++) {
      const u = hash(k, 91);
      if (u > 0.2 + 0.4 * mf.stage) continue;
      g.fillStyle = rgba(PINK, 0.5 + 0.4 * mf.hat * 2);
      g.beginPath();
      g.ellipse(v.sx(k * 0.25 + u), s.Y + 0.05 * m, 0.06 * m, 0.03 * m, u * 3, 0, Math.PI * 2);
      g.fill();
    }
    edge(f, s, RED);
  },
};
