// The graveyard: a huge moon over it whatever the hour, dead trees on the hills swaying with the bass and crows
// bursting off them on the snare, ghosts drifting with the voice and the bass, mist rolling low; landmarks by the song
// (a mausoleum whose doorway glows on the kick, a haunted church whose bell swings on the beat, a giant dead oak);
// crooked tombstones and iron fences, jack-o'-lanterns lighting up on the kick, candles flickering on the hats; a path
// of cobbles and grave earth underfoot, its candles flickering and its cracks glowing green on the kick.
import { hash, rgba } from '../util.js';
import { cells, edge, glow, landmark, row, slab, tint } from './kit.js';

const PUMPKIN = '#ff8a2a',
  GHOST = '#d8fff0',
  SPECTRE = '#7dffb0',
  CANDLE = '#ffd27a';

// a dead tree: a trunk and forked boughs, swaying with the bass
function deadTree(g, X, base, h, m, sway, col) {
  g.strokeStyle = col;
  g.lineCap = 'round';
  const bough = (x, y, a, len, w, d) => {
    const x1 = x + Math.cos(a) * len + sway * (4 - d) * 0.3,
      y1 = y - Math.sin(a) * len;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x1, y1);
    g.stroke();
    if (d < 3) for (const s of [-0.5, 0.45]) bough(x1, y1, a + s, len * 0.62, w * 0.6, d + 1);
  };
  bough(X, base, Math.PI / 2, h * 0.45, 0.18 * m, 0);
  g.lineCap = 'butt';
}
// a crooked tombstone (a rounded slab or a cross), leaning by its hash
function tomb(g, X, base, m, u, col) {
  g.save();
  g.translate(X, base);
  g.rotate((u - 0.5) * 0.35);
  g.fillStyle = col;
  if (u < 0.3) {
    g.fillRect(-0.07 * m, -1.1 * m, 0.14 * m, 1.1 * m);
    g.fillRect(-0.3 * m, -0.85 * m, 0.6 * m, 0.13 * m);
  } else {
    const w = (0.4 + 0.25 * u) * m,
      h = (0.7 + 0.5 * u) * m;
    g.beginPath();
    g.moveTo(-w / 2, 0.2 * m);
    g.lineTo(-w / 2, -h + w / 2);
    g.arc(0, -h + w / 2, w / 2, Math.PI, 0);
    g.lineTo(w / 2, 0.2 * m);
    g.fill();
  }
  g.restore();
}
// a jack-o'-lantern on the ground, its face lighting up on the kick
function pumpkin(g, X, Y, r, kick) {
  glow(g, X, Y, r * (2.5 + 2 * kick), PUMPKIN, 0.2 + 0.5 * kick);
  g.fillStyle = '#c4561a';
  g.beginPath();
  g.ellipse(X, Y, r * 1.2, r, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = rgba('#ffe14a', 0.3 + 0.7 * kick);
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(X + s * r * 0.55, Y - r * 0.15);
    g.lineTo(X + s * r * 0.25, Y - r * 0.15);
    g.lineTo(X + s * r * 0.4, Y - r * 0.5);
    g.fill();
  }
  g.fillRect(X - r * 0.5, Y + r * 0.2, r, r * 0.2);
}

export const LANDMARKS = {
  // a mausoleum: steps, columns, a pediment, its doorway glowing green on the kick
  crypt(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.14, 32, 0.7, 1, (X, base) => {
      const m = v.ppm;
      g.fillStyle = T.far;
      g.fillRect(X - 3 * m, base - 0.5 * m, 6 * m, 0.5 * m);
      g.fillRect(X - 2.5 * m, base - 4 * m, 5 * m, 3.6 * m);
      g.beginPath();
      g.moveTo(X - 3 * m, base - 4 * m);
      g.lineTo(X, base - 5.6 * m);
      g.lineTo(X + 3 * m, base - 4 * m);
      g.fill();
      glow(g, X, base - 1.6 * m, (1.2 + 1.5 * mf.kick) * m, SPECTRE, 0.2 + 0.5 * mf.kick);
      g.fillStyle = rgba(SPECTRE, 0.25 + 0.6 * mf.kick);
      g.fillRect(X - 0.6 * m, base - 2.6 * m, 1.2 * m, 2.1 * m);
      g.fillStyle = rgba('#000000', 0.35);
      for (const cx of [-2, -1.3, 1.3, 2]) g.fillRect(X + cx * m - 0.12 * m, base - 3.8 * m, 0.24 * m, 3.3 * m);
    });
  },
  // a haunted church: a nave, a steeple with its bell swinging on the beat, windows lit by the voice
  church(f) {
    const { g, v, mf, T, t, L } = f;
    landmark(f, 0.08, 50, 0.75, 2, (X, base) => {
      const m = v.ppm;
      g.fillStyle = T.far;
      g.fillRect(X - 4 * m, base - 4 * m, 7 * m, 4 * m);
      g.beginPath();
      g.moveTo(X - 4.3 * m, base - 4 * m);
      g.lineTo(X - 0.5 * m, base - 6.5 * m);
      g.lineTo(X + 3.3 * m, base - 4 * m);
      g.fill();
      g.fillRect(X + 2 * m, base - 8 * m, 2 * m, 8 * m);
      g.beginPath();
      g.moveTo(X + 1.8 * m, base - 8 * m);
      g.lineTo(X + 3 * m, base - 11.5 * m);
      g.lineTo(X + 4.2 * m, base - 8 * m);
      g.fill();
      const swing = Math.sin((t / L.A.beat) * Math.PI) * (0.2 + 0.5 * mf.beat);
      g.save();
      g.translate(X + 3 * m, base - 7.5 * m);
      g.rotate(swing);
      g.fillStyle = rgba(CANDLE, 0.4 + 0.5 * mf.beat);
      g.beginPath();
      g.moveTo(-0.35 * m, 0.6 * m);
      g.quadraticCurveTo(0, -0.4 * m, 0.35 * m, 0.6 * m);
      g.fill();
      g.restore();
      for (let k = 0; k < 4; k++) {
        g.fillStyle = rgba(k % 2 ? '#8a4aff' : CANDLE, 0.2 + 0.5 * mf.voice + 0.3 * mf.hat);
        g.beginPath();
        g.arc(X - 3.2 * m + k * 1.5 * m, base - 2.3 * m, 0.3 * m, Math.PI, 0);
        g.fillRect(X - 3.5 * m + k * 1.5 * m, base - 2.3 * m, 0.6 * m, 1 * m);
        g.fill();
      }
    });
  },
  // a giant dead oak, crows burst off its boughs on the snare
  oak(f) {
    const { g, v, mf, T, t } = f;
    landmark(f, 0.11, 40, 0.7, 3, (X, base, i) => {
      const m = v.ppm;
      deadTree(g, X, base, 16 * m, m * 2.2, Math.sin(t * 0.7) * (0.2 + 0.4 * mf.bass) * m, T.far);
      crows(f, X, base - 9 * m, 7 + Math.round(6 * mf.stage), i);
    });
  },
};
// crows round a perch, bursting up and out on the snare and settling back
function crows(f, X, Y, n, salt) {
  const { g, v, mf, t } = f,
    m = v.ppm;
  g.strokeStyle = '#08060a';
  g.lineWidth = 0.08 * m;
  g.beginPath();
  for (let k = 0; k < n; k++) {
    const u = hash(k, salt * 7 + 3),
      out = mf.snare * (1.5 + 3 * u),
      cx = X + ((u - 0.5) * 6 + Math.cos(u * 9) * out) * m,
      cy = Y + (hash(k, salt) * 2 - out * 0.8) * m,
      flap = Math.sin(t * 14 + k) * (0.1 + 0.25 * mf.snare) * m;
    g.moveTo(cx - 0.3 * m, cy - flap);
    g.lineTo(cx, cy);
    g.lineTo(cx + 0.3 * m, cy - flap);
  }
  g.stroke();
}

// the far rows: far hills with dead trees on them, swaying with the bass, crows on the snare
function far(f) {
  const { g, v, mf, T, t } = f,
    hills = row(f, 0.18);
  g.fillStyle = tint(f, '#14101c', T.far, 0.5);
  g.beginPath();
  // (across the row's frame, its screen's edges and bottom in it: kit.js row)
  g.moveTo(hills.L - v.W, hills.B);
  for (let X = hills.L - 20; X < hills.R + 40; X += 20) {
    const x = hills.x(X);
    g.lineTo(X, hills.base - (1.5 + Math.sin(x * 0.3) + 0.6 * Math.sin(x * 0.8)) * v.ppm);
  }
  g.lineTo(hills.R + v.W, hills.B);
  g.fill();
  cells(hills, 6, (i, X, u, seen) => {
    // (decided by the world's stage as it came into view: kit.js stageSeen, never popping in in sight)
    if (u > 0.35 + 0.4 * seen()) return;
    const x = hills.x(X),
      top = hills.base - (1.5 + Math.sin(x * 0.3) + 0.6 * Math.sin(x * 0.8)) * v.ppm;
    deadTree(g, X, top + 0.3 * v.ppm, (4 + 3 * u) * v.ppm, v.ppm, Math.sin(t * 1.2 + i) * (0.05 + 0.2 * mf.bass) * v.ppm, tint(f, '#0c0a12', T.far, 0.3));
    if (u < 0.15) crows(f, X, top - 3 * v.ppm, 4, i);
  });
}

// the near rows: ghosts over the graves, then the fence and the tombstones
function near(f) {
  const { g, v, mf, T, t } = f;
  // ghosts drifting over the graves, rising and falling with the voice and the bass
  const gr = row(f, 0.3);
  cells(gr, 9, (i, X, u, seen) => {
    // (decided by the world's stage as it came into view: kit.js stageSeen, never popping in in sight)
    if (u > 0.3 + 0.35 * seen()) return;
    const m = v.ppm,
      gx = X + Math.sin(t * 0.6 + i * 2) * 1.5 * m,
      gy = gr.base - (3 + 1.5 * u + 0.8 * Math.sin(t * 1.3 + i) + 1.2 * mf.voice + 0.6 * mf.bass) * m,
      a = 0.2 + 0.25 * mf.voice + 0.15 * mf.bass;
    glow(g, gx, gy, 1.4 * m, SPECTRE, a * 0.5);
    g.fillStyle = rgba(GHOST, a);
    g.beginPath();
    g.arc(gx, gy, 0.45 * m, Math.PI, 0);
    for (let k = 0; k <= 4; k++) g.lineTo(gx + (0.45 - k * 0.225) * m, gy + (0.9 + (k % 2 ? 0.2 : 0) + 0.1 * Math.sin(t * 6 + k)) * m);
    g.fill();
    g.fillStyle = '#0a0a12';
    for (const s of [-1, 1]) g.fillRect(gx + s * 0.15 * m - 0.05 * m, gy - 0.1 * m, 0.1 * m, 0.16 * m);
  });
  // the near row: an iron fence, crooked tombstones, jack-o'-lanterns on the kick, candles on the hats
  const r = row(f, 0.5),
    m = v.ppm,
    stone = tint(f, '#2a2a34', T.near, 0.35);
  g.fillStyle = tint(f, '#060508', T.near, 0.3);
  g.fillRect(r.L, r.base - 1.6 * m, r.R - r.L, 0.06 * m);
  cells(r, 0.3, (i, X) => {
    g.fillRect(X, r.base - 1.75 * m, 0.04 * m, 1.75 * m);
    g.beginPath();
    g.moveTo(X - 0.06 * m, r.base - 1.75 * m);
    g.lineTo(X + 0.02 * m, r.base - 1.95 * m);
    g.lineTo(X + 0.1 * m, r.base - 1.75 * m);
    g.fill();
  });
  cells(r, 1.6, (i, X, u, seen) => {
    tomb(g, X, r.base + 0.1 * m, m, u, stone);
    const h = hash(i, 19);
    // (decided by the world's stage as it came into view: kit.js stageSeen, never popping in in sight)
    if (h < 0.3 + 0.3 * seen()) pumpkin(g, X + 0.6 * m, r.base - 0.15 * m, 0.22 * m, mf.kick * (0.5 + 0.5 * mf.amp));
    else if (h < 0.75) {
      const fl = 0.5 + 0.5 * Math.sin(t * 23 + i * 3) * mf.hat * 3;
      g.fillStyle = '#e8e0c8';
      g.fillRect(X + 0.5 * m, r.base - 0.3 * m, 0.06 * m, 0.25 * m);
      glow(g, X + 0.53 * m, r.base - 0.35 * m, (0.25 + 0.25 * fl) * m, CANDLE, 0.4 + 0.5 * fl);
    }
  });
}

// over the rows: mist rolling low over the graves, thicker with the bass
function after(f) {
  const { g, v, mf, t } = f,
    r = row(f, 0.5),
    m = v.ppm,
    mist = g.createLinearGradient(0, r.base - 1.5 * m, 0, r.base + 0.5 * m);
  mist.addColorStop(0, rgba(GHOST, 0));
  mist.addColorStop(1, rgba(GHOST, 0.12 + 0.15 * mf.bass));
  g.fillStyle = mist;
  for (let k = 0; k < 3; k++) {
    const off = ((t * (8 + k * 5) + k * 300) % (v.W * 0.8)) - v.W * 0.4;
    g.fillRect(off - v.W * 0.2, r.base - (1.5 - k * 0.3) * m, v.W * 1.4, 2 * m);
  }
}

export default {
  // the moon: huge, pale green whatever the hour (fainter by day), breathing with the bass, a wisp of cloud across it
  sky(f) {
    const { g, v, mf, look, t } = f,
      night = 0.55 + 0.45 * (look.night ?? 1),
      X = v.W * 0.3,
      Y = v.H * 0.3,
      r = v.ppm * 2.4 * (1 + 0.06 * mf.bass + 0.08 * mf.voice);
    g.globalAlpha = night;
    glow(g, X, Y, r * (3 + mf.voice), '#e8ffd8', 0.25 + 0.2 * mf.kick);
    g.fillStyle = '#f0f6d8';
    g.beginPath();
    g.arc(X, Y, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(120,130,100,0.25)';
    for (const [dx, dy, s] of [[-0.35, -0.2, 0.22], [0.25, 0.3, 0.16], [0.3, -0.35, 0.1], [-0.1, 0.45, 0.12]]) {
      g.beginPath();
      g.arc(X + dx * r, Y + dy * r, s * r, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = 'rgba(10,10,20,0.55)';
    const cx = X + (((t * 0.04) % 1) * 4 - 2) * r;
    g.beginPath();
    g.ellipse(cx, Y + 0.25 * r, 1.4 * r, 0.12 * r, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
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
    const { g, v, mf, t } = f,
      s = slab(f, a, b, y, tint(f, '#16121a'), tint(f, '#3a3a42', f.T.far, 0.3));
    if (!s) return;
    const m = v.ppm;
    // cobbles along the path, a crack between some glowing green on the kick
    for (let k = Math.floor(s.a / 0.45); k < s.b / 0.45; k++) {
      const u = hash(k, 61),
        X = v.sx(k * 0.45);
      g.fillStyle = u < 0.5 ? '#2c2a32' : '#24222a';
      g.fillRect(X + 0.02 * m, s.Y + 0.24 * m, 0.41 * m, 0.22 * m);
      if (u < 0.2) {
        g.fillStyle = rgba(SPECTRE, 0.2 + 0.7 * mf.kick);
        g.fillRect(X + 0.43 * m, s.Y + 0.24 * m, 0.03 * m, (0.3 + u * 3) * m);
      }
      // (bones in the grave earth below, glowing faintly with the bass)
      if (u > 0.85) {
        g.strokeStyle = rgba('#e8e0c8', 0.12 + 0.2 * mf.bass);
        g.lineWidth = 0.06 * m;
        g.beginPath();
        g.moveTo(X, s.Y + (1.2 + u) * m);
        g.lineTo(X + 0.4 * m, s.Y + (1.4 + u) * m);
        g.stroke();
      }
    }
    // little candles on the path, flickering on the hats
    for (let k = Math.floor(s.a / 2.3); k < s.b / 2.3; k++) {
      if (hash(k, 71) > 0.5) continue;
      const X = v.sx(k * 2.3 + 0.7),
        fl = 0.5 + 0.5 * Math.sin(t * 29 + k) * Math.min(1, mf.hat * 3);
      g.fillStyle = '#e8e0c8';
      g.fillRect(X, s.Y - 0.18 * m, 0.05 * m, 0.18 * m);
      glow(g, X + 0.025 * m, s.Y - 0.22 * m, (0.15 + 0.15 * fl) * m, CANDLE, 0.5 + 0.5 * fl);
    }
    edge(f, s, PUMPKIN);
  },
};
