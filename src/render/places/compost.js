// The Spring out of the Ash, «Подснежник» (after ATL's "Удобрением": things falling out of the sky, mushrooms of ash on
// the horizon, the planet smouldering like an ember in the dark; then the sun squinting through the smoke, a seed below
// longing to burst into a lush bush, roots, a slow dance of insects and microbes, juicy leaves applauding the rain and
// the wind; "Подснежник": a snowdrop up out of the snow, the moles' town waking, the sky drawing a line of birds, the
// snow-walker going away; "Гори ясно", "Хоровод": a ribbon pole and a round dance; world/artists.js): a world that grows
// out of its own ash as the song goes on (fx grow: a step with each drop, never back). At first ash and snow under a
// smoky sky, a pale sun squinting through the smoke, cartoon meteors streaking down, embers in the cracks of the ridges
// flaring on the kick; on the first drop a cartoon mushroom cloud rises far off on the horizon (rings round it pulsing
// on the kick: a poster's, no one near it) and slowly greys away; with each drop after it the spring takes more: the
// snow melting off, sprouts shooting up over the ridges, snowdrops popping up on the beat, moles popping out of their
// hills, a line of birds drawn across the sky, and in a drop the leaves clap on the beat (the rain's applause). Near, fly
// agarics, sprouts, crystals and molehills; underfoot the cut-away of the soil under its crust of snow: fine black
// layers, embers, roots threading down, microbes in a slow dance, green spots of pigment spreading. Landmarks: a giant
// seed split open, its sprout growing with the song; a ribbon pole with a round dance going round it; a great bush
// bursting into bloom; a cluster of crystals forming.
import { hash, mixHex, rgba } from '../util.js';
import { cells, edge, glow, landmark, row, slab, stamp, steady, still, vgrad } from './kit.js';

const TAU = Math.PI * 2,
  EMBER = '#ff5a1e',
  ASH = '#6a6066',
  SOIL = '#140c0a',
  GREEN = '#5ae04a',
  JUICY = '#2ab83a',
  AGARIC = '#e8202a',
  CRYSTAL = '#9af0ff',
  BLOOM = '#ff8ad0';

const beatOf = f => {
  const b = f.t / f.L.A.beat;
  return { n: Math.floor(b), u: b - Math.floor(b) };
};
function mark(f, par, every, chance, salt, draw) {
  const up = Math.max(1.6 * f.v.ppm, 0.2 * f.v.H);
  landmark(f, par, every, chance, salt, (X, base, i) => draw(X, base - up, up, i));
}
// how far the garden has grown (0 ash .. 1 green) and whether a drop is on (its leaves clapping)
const grown = f => Math.min(1, 0.1 + 0.95 * (f.mf.grow ?? 0));
const inDrop = f => (f.look.sceneAt?.(f.t)?.kind === 'drop' ? 1 : 0);
// a juicy leaf from (X, Y) at angle a, length L
function leaf(g, X, Y, a, L, col, vein = true) {
  g.save();
  g.translate(X, Y);
  g.rotate(a);
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(L * 0.5, -L * 0.42, L, 0);
  g.quadraticCurveTo(L * 0.5, L * 0.42, 0, 0);
  g.fill();
  if (vein) {
    g.strokeStyle = 'rgba(255,255,255,0.3)';
    g.lineWidth = Math.max(1, L * 0.04);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(L * 0.9, 0);
    g.stroke();
  }
  g.restore();
}
// a leaf as a path (no turning of the canvas: many of them go into one fill)
function leafPath(g, X, Y, a, L) {
  const c = Math.cos(a),
    sn = Math.sin(a),
    P = (x, y) => [X + x * c - y * sn, Y + x * sn + y * c],
    [x1, y1] = P(L * 0.5, -L * 0.42),
    [x2, y2] = P(L, 0),
    [x3, y3] = P(L * 0.5, L * 0.42);
  g.moveTo(X, Y);
  g.quadraticCurveTo(x1, y1, x2, y2);
  g.quadraticCurveTo(x3, y3, X, Y);
}
// sprouts in two paths: their stems (stroked) and their leaves (filled), all of them at once; each [X, Y, h, i]
function sprouts(g, list, m, col, clap) {
  if (!list.length) return;
  g.strokeStyle = col;
  g.lineWidth = Math.max(1, 0.1 * m);
  g.beginPath();
  for (const [X, Y, h, i] of list) {
    const sw = Math.sin(i * 1.7) * 0.3 * h;
    g.moveTo(X, Y);
    g.quadraticCurveTo(X - sw, Y - h * 0.6, X, Y - h);
  }
  g.stroke();
  g.fillStyle = col;
  g.beginPath();
  const open = 0.9 - 0.75 * clap;
  for (const [X, Y, h] of list) {
    const L = Math.min(1.2 * m, h * 0.6);
    leafPath(g, X, Y - h, -Math.PI / 2 - open, L);
    leafPath(g, X, Y - h, -Math.PI / 2 + open, L);
  }
  g.fill();
}

// ---- the sky: the ash, the meteors, the sun squinting through the smoke
function sky(f) {
  const { g, v, t, mf } = f,
    G = grown(f),
    S = Math.min(v.W, v.H);
  // (the cover's red stroke: a swirl of ember red across the sky, fading as the garden grows)
  g.strokeStyle = rgba('#c81e1e', 0.22 * (1 - G));
  g.lineWidth = S * 0.05;
  g.lineCap = 'round';
  g.beginPath();
  for (let a = 0; a < TAU * 1.3; a += 0.15) {
    const r = S * (0.1 + 0.05 * a);
    g.lineTo(v.W * 0.62 + Math.cos(a + t * 0.05) * r * 1.4, v.H * 0.22 + Math.sin(a + t * 0.05) * r * 0.6);
  }
  g.stroke();
  g.lineCap = 'butt';
  // (the sun behind the smoke: a pale disc, the smoke across it like a lid that lifts as the garden grows)
  const sx = v.W * 0.32,
    sy = v.H * 0.24,
    R = S * 0.08,
    eye = 0.2 + 0.8 * G + 0.1 * mf.voice;
  glow(g, sx, sy, R * 4, mixHex('#ffd08a', '#fff4c0', G), 0.25 + 0.35 * G + 0.15 * mf.voice);
  g.fillStyle = mixHex('#e8c8a0', '#fff8d8', G);
  g.beginPath();
  g.arc(sx, sy, R, 0, TAU);
  g.fill();
  g.fillStyle = rgba(mixHex(ASH, '#9aa0a0', G), 0.85);
  g.fillRect(sx - R * 1.3, sy - R * 1.3, R * 2.6, R * 1.3 * (1 - eye * 0.9));
  g.fillRect(sx - R * 1.3, sy + R * 1.3 * eye * 0.9, R * 2.6, R * 1.3 * (1 - eye * 0.9) + 1);
  // (things falling out of the sky: cartoon meteors streaking down, fewer as the garden grows)
  const n = Math.round(4 * (1 - G)) + 1;
  for (let i = 0; i < n; i++) {
    const per = 3.5 + 2 * hash(i, 3),
      u = ((t + hash(i, 4) * per) % per) / per;
    if (u > 0.5) continue;
    const q = u / 0.5,
      x0 = v.W * (0.2 + 0.9 * hash(i, 5)),
      x = x0 - q * v.W * 0.35,
      y = -v.H * 0.05 + q * v.H * 0.45;
    g.strokeStyle = rgba('#ffd08a', 0.5 * (1 - q));
    g.lineWidth = S * 0.012;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + v.W * 0.08, y - v.H * 0.1);
    g.stroke();
    glow(g, x, y, S * 0.03, EMBER, 0.8 * (1 - q * 0.5));
    g.fillStyle = '#fff0c0';
    g.beginPath();
    g.arc(x, y, S * 0.008, 0, TAU);
    g.fill();
  }
  // (the sky drawing a line of birds across it as the spring comes, their wings beating on the beat)
  if (G > 0.3) {
    const q = (t * 0.03) % 1,
      bx = v.W * (1.1 - 1.3 * q),
      by = v.H * 0.12,
      flap = mf.beat;
    g.strokeStyle = rgba('#1a1414', Math.min(1, (G - 0.3) * 3) * 0.8);
    g.lineWidth = Math.max(1, S * 0.004);
    g.beginPath();
    for (let k = 0; k < 9; k++) {
      const x = bx + Math.abs(k - 4) * S * 0.035 + k * S * 0.01,
        y = by + Math.abs(k - 4) * S * 0.018,
        w = S * 0.012,
        h = w * (0.3 + 0.8 * flap);
      g.moveTo(x - w, y - h);
      g.quadraticCurveTo(x - w * 0.4, y - h * 0.2, x, y);
      g.quadraticCurveTo(x + w * 0.4, y - h * 0.2, x + w, y - h);
    }
    g.stroke();
  }
  // (in a drop, the rain's grey veil lit green from below)
  if (inDrop(f)) glow(g, v.W * 0.5, v.H * 0.95, v.W * 0.6, GREEN, 0.12 + 0.1 * mf.kick);
}

// ---- the far rows: smouldering ridges and ash clouds, the garden's sprouts rising over them
function far(f) {
  const { g, v, mf, T, t } = f,
    r = row(f, 0.12),
    m = v.ppm,
    G = grown(f),
    clap = inDrop(f) * mf.beat,
    ridge = mixHex(mixHex('#2a1a16', '#2a4a1a', G), T.far, 0.3),
    smoke = mixHex(ASH, T.far, 0.4);
  // (on the first drop a cartoon mushroom cloud rises far off on the horizon, a poster's: a column and a round cap of
  // billows lit orange from within, rings round its stem pulsing on the kick; it greys and fades as the spring comes)
  const d0 = f.L.A.bars.find(b => b.dropStart)?.t0 ?? Infinity,
    since = t - d0;
  if (since > 0) {
    const rise = Math.min(1, since / (8 * f.L.A.beat)),
      e = rise * rise * (3 - 2 * rise),
      fade = Math.max(0, 1 - Math.max(0, G - 0.35) * 2),
      X = v.W * 0.72,
      B = r.base - 1.5 * m,
      H = (6 + 9 * e) * m,
      hot = mixHex('#ff8a2a', '#8a8088', Math.min(1, since / 30));
    if (fade > 0.01) {
      g.globalAlpha = fade;
      glow(g, X, B - H, 6 * m * e, '#ffb040', 0.35 * (1 - Math.min(1, since / 30)));
      g.fillStyle = mixHex(hot, ASH, 0.4);
      g.beginPath();
      g.moveTo(X - 0.8 * m, B);
      g.quadraticCurveTo(X - 0.5 * m, B - H * 0.5, X - 0.9 * m, B - H);
      g.lineTo(X + 0.9 * m, B - H);
      g.quadraticCurveTo(X + 0.5 * m, B - H * 0.5, X + 0.8 * m, B);
      g.fill();
      g.fillStyle = mixHex('#c8b8b0', T.far, 0.3);
      for (const [dx, dy, rr] of [[0, -1.1, 2.4], [-2.2, -0.4, 1.7], [2.2, -0.4, 1.7], [-1.2, 0.4, 1.5], [1.2, 0.4, 1.5], [0, 0.3, 1.8]]) {
        g.beginPath();
        g.arc(X + dx * m * e, B - H + dy * m * e, rr * m * (0.4 + 0.6 * e) * (1 + 0.05 * mf.bass), 0, TAU);
        g.fill();
      }
      g.fillStyle = rgba(hot, 0.6);
      g.beginPath();
      g.ellipse(X, B - H + 1.2 * m * e, 3 * m * e, 0.8 * m * e, 0, 0, TAU);
      g.fill();
      g.strokeStyle = rgba('#f0e0d0', 0.4 + 0.5 * mf.kick);
      g.lineWidth = Math.max(1, 0.15 * m);
      for (const k of [0.45, 0.7]) {
        g.beginPath();
        g.ellipse(X, B - H * k, (1.6 + 0.4 * mf.kick) * m * e, 0.35 * m * e, 0, 0, TAU);
        g.stroke();
      }
      g.globalAlpha = 1;
    }
  }
  // (the ash clouds on the horizon: round billows, lit red from under, rolling)
  for (let k = 0; k < 5; k++) {
    const w = v.W * 0.3,
      // (across the row's frame, kit.js row)
      x = r.L + ((((hash(k, 3) * v.W * 1.3 - r.x0 * m * 0.3 + t * v.dpr * 2) % ((r.R - r.L) * 1.3)) + (r.R - r.L) * 1.3) % ((r.R - r.L) * 1.3)) - (r.R - r.L) * 0.15,
      y = r.base - (4 + 2 * hash(k, 4)) * m;
    g.fillStyle = rgba(smoke, 0.75 * (1 - 0.6 * G));
    g.beginPath();
    g.ellipse(x, y, w * 0.4, w * 0.12, 0, 0, TAU);
    g.ellipse(x - w * 0.15, y - w * 0.1, w * 0.18, w * 0.14, 0, 0, TAU);
    g.ellipse(x + w * 0.12, y - w * 0.12, w * 0.2, w * 0.16, 0, 0, TAU);
    g.fill();
    glow(g, x, y + w * 0.1, w * 0.35, EMBER, (0.12 + 0.1 * mf.kick) * (1 - G));
  }
  const farSprouts = [];
  cells(r, 6, (i, X, u) => {
    const h = (2.2 + 2.5 * u) * m;
    g.fillStyle = ridge;
    g.beginPath();
    g.moveTo(X - 0.5 * m, r.base);
    g.lineTo(X + 1.5 * m, r.base - h);
    g.lineTo(X + 3 * m, r.base - h * 0.7);
    g.lineTo(X + 6.5 * m, r.base);
    g.fill();
    // (an ember crack down its face, flaring on the kick, cooling as it greens)
    g.strokeStyle = rgba(EMBER, (0.3 + 0.6 * mf.kick) * (1 - G));
    g.lineWidth = Math.max(1, 0.08 * m);
    g.beginPath();
    g.moveTo(X + 1.5 * m, r.base - h);
    g.lineTo(X + 2 * m, r.base - h * 0.5);
    g.lineTo(X + 1.6 * m, r.base);
    g.stroke();
    // (the garden's sprouts over it, taller the more it has grown)
    if (G * 1.5 * m >= 0.1 * m) for (let k = 0; k < 3; k++) farSprouts.push([X + (1 + k * 1.6) * m, r.base - h * (0.55 - k * 0.15), G * (1.5 + 1.5 * hash(i, k + 5)) * m, i + k]);
  });
  sprouts(g, farSprouts, m, mixHex(JUICY, T.far, 0.3), clap);
  g.fillStyle = ridge;
  g.fillRect(r.L, r.base - 0.05 * m, r.R - r.L, 3 * m);
}

// ---- the near rows: a bank of soil lifted over the roofs (a phone's horizon sits under them), charred trees on it
// leafing out as the garden grows and blooming in a drop, fly agarics glowing on the beat, crystals glinting on the
// hats, sprouts and snowdrops, molehills with their moles popping out on the beat
const lift = (f, k) => Math.max(1.2 * f.v.ppm, k * f.v.H);
// (a charred tree: a black trunk forking into bare branches, embers in its cracks; where its twigs end, its leaves
// will come (TWIGS))
const TWIGS = [
  [-2.2, -6.6],
  [-1.2, -7.6],
  [0.4, -8.2],
  [1.8, -7.2],
  [2.6, -6],
  [-2.8, -5.2],
  [1.2, -5.4],
  [-0.6, -6.4],
];
const treePic = (m, bark) =>
  still(`cm-tree|${bark}`, m, 7, 9, 3.5, 8.8, (g, s) => {
    g.strokeStyle = bark;
    g.lineCap = 'round';
    g.lineWidth = 0.5 * s;
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(-0.3 * s, -2.5 * s, 0, -4.2 * s);
    g.stroke();
    g.lineWidth = 0.18 * s;
    g.beginPath();
    for (const [x, y] of TWIGS) {
      g.moveTo(0, -4 * s);
      g.quadraticCurveTo(x * 0.3 * s, (y * 0.75 - 1) * s, x * s, y * s);
    }
    g.stroke();
    g.lineWidth = 0.06 * s;
    g.beginPath();
    for (const [x, y] of TWIGS) {
      g.moveTo(x * s, y * s);
      g.lineTo((x + 0.4) * s, (y - 0.5) * s);
      g.moveTo(x * s, y * s);
      g.lineTo((x - 0.3) * s, (y - 0.4) * s);
    }
    g.stroke();
    g.lineCap = 'butt';
    // (embers in its cracks)
    g.strokeStyle = 'rgba(255,90,30,0.55)';
    g.lineWidth = Math.max(1, 0.05 * s);
    g.beginPath();
    g.moveTo(-0.05 * s, -0.4 * s);
    g.lineTo(0.08 * s, -1.4 * s);
    g.lineTo(-0.06 * s, -2.4 * s);
    g.stroke();
  });
// (fly agarics, two or three of them, their caps shaded and spotted)
const agaricPic = (m, n) =>
  still(`cm-agaric|${n}`, m, 3.4, 2.6, 1.2, 2.5, (g, s) => {
    for (let k = 0; k < n; k++) {
      const sc = [1.3, 0.8, 0.6][k],
        X = [0, 1.1, -0.7][k] * s,
        h = 1.1 * sc * s,
        R = 0.55 * sc * s;
      g.fillStyle = vgrad(g, -h, 0, [[0, '#fffaf0'], [1, '#c8b8a0']]);
      g.fillRect(X - 0.12 * sc * s, -h, 0.24 * sc * s, h);
      const gr = g.createRadialGradient(X - R * 0.3, -h - R * 0.5, 0, X, -h, R * 1.2);
      gr.addColorStop(0, '#ff6a5a');
      gr.addColorStop(0.6, AGARIC);
      gr.addColorStop(1, '#6a0a10');
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(X, -h, R, R * 0.7, 0, Math.PI, TAU);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      for (let q = 0; q < 5; q++) {
        const x = X + (q - 2) * R * 0.35,
          y = -h - R * (0.25 + 0.25 * (q % 2));
        g.moveTo(x + R * 0.1, y);
        g.arc(x, y, R * 0.1, 0, TAU);
      }
      g.fill();
    }
  });
function near(f) {
  const { g, v, mf, T, t } = f,
    P = steady(f),
    r0 = row(f, 0.4),
    r = { ...r0, base: r0.base - lift(f, 0.12) },
    m = v.ppm,
    G = grown(f),
    D = inDrop(f),
    clap = D * mf.beat,
    n = beatOf(f).n,
    mound = mixHex(mixHex('#2a1a12', '#2a3a14', G * 0.6), T.near, 0.3),
    bark = mixHex('#1a1210', P.near, 0.2);
  // (the bank, its edge glowing ember at first and green as it grows)
  g.fillStyle = mound;
  g.fillRect(r.L, r.base, r.R - r.L, 5 * m);
  g.fillStyle = rgba(mixHex(EMBER, GREEN, G), 0.3 + 0.25 * mf.kick);
  g.fillRect(r.L, r.base, r.R - r.L, 0.06 * m);
  const leaves = [],
    blooms = [],
    near = [],
    drops = [],
    caps = [];
  cells(r, 2.4, (i, X, u) => {
    if (u < 0.22) {
      // (a charred tree leafing out as the garden grows, swaying on the bass, blooming in a drop)
      const lean = Math.sin(t * 0.8 + i) * 0.015 * (0.5 + mf.bass),
        x0 = X + 1.2 * m;
      stamp(g, treePic(m, bark), x0, r.base, m, 0, lean);
      const nL = Math.round(G * TWIGS.length);
      for (let k = 0; k < nL; k++) {
        const [tx, ty] = TWIGS[(((k + i) % TWIGS.length) + TWIGS.length) % TWIGS.length];
        leaves.push(x0 + (tx - lean * ty) * m, r.base + ty * m, (0.5 + 0.4 * G) * m * (1 + 0.08 * mf.kick));
        if (D && k % 2 === 0) blooms.push(x0 + (tx - lean * ty) * m, r.base + (ty - 0.3) * m);
      }
      return;
    }
    // (its mound and its cap of snow, melting off as the spring comes)
    caps.push(X + 1.2 * m, (1.1 + 0.5 * u) * m, (0.4 + 0.3 * u) * m, u);
    // (snowdrops up out of it, more as it grows, their bells popping up and nodding on the beat)
    const nd = Math.floor(G * 4 * hash(i, 9) + G);
    for (let k = 0; k < nd; k++) drops.push(X + (0.5 + k * 0.45) * m, (0.5 + 0.25 * hash(i, k + 30)) * m * (0.85 + 0.15 * mf.beat));
    if (u > 0.85) {
      // (a molehill, its mole popping out on its beat: a round dark head, pink nose, little paws)
      const up = (n + i) % 4 === 0 ? 1 - beatOf(f).u : 0,
        mx = X + 1.9 * m;
      g.fillStyle = mixHex('#3a2418', T.near, 0.2);
      g.beginPath();
      g.ellipse(mx, r.base, 0.7 * m, 0.45 * m, 0, Math.PI, TAU);
      g.fill();
      if (up > 0) {
        const my = r.base - 0.3 * m - up * 0.45 * m;
        g.fillStyle = '#2a2026';
        g.beginPath();
        g.arc(mx, my, 0.28 * m, 0, TAU);
        g.fill();
        g.fillStyle = '#ff9ab0';
        g.beginPath();
        g.arc(mx + 0.2 * m, my + 0.03 * m, 0.07 * m, 0, TAU);
        g.fill();
        g.fillStyle = '#ffffff';
        for (const d of MOLE_EYES) g.fillRect(mx + d * m, my - 0.08 * m, 0.05 * m, 0.05 * m);
      }
    }
    if (u < 0.45) {
      // (fly agarics, glowing on the beat, swelling on the kick)
      stamp(g, agaricPic(m, 1 + Math.floor(hash(i, 3) * 3)), X + 1.2 * m, r.base - 0.1 * m, m * (0.9 + 0.5 * G), 0, 0, 1 + 0.05 * mf.kick, 1 + 0.05 * mf.kick);
      glow(g, X + 1.2 * m, r.base - 1.6 * m * (0.9 + 0.5 * G), 1.2 * m, AGARIC, 0.1 + 0.3 * mf.beat);
    } else if (u < 0.6) {
      // (a crystal cluster forming, glinting on the hats)
      const sz = (0.4 + 0.8 * G) * m;
      g.fillStyle = rgba(mixHex(CRYSTAL, T.near, 0.25), 0.8);
      g.beginPath();
      for (let k = 0; k < 3; k++) {
        const x = X + (0.8 + k * 0.35) * m,
          h = sz * (1.4 - 0.4 * Math.abs(k - 1)),
          a = (k - 1) * 0.3;
        g.moveTo(x - 0.16 * m, r.base);
        g.lineTo(x - 0.16 * m + Math.sin(a) * h, r.base - h * 0.8);
        g.lineTo(x + Math.sin(a) * h, r.base - h);
        g.lineTo(x + 0.16 * m + Math.sin(a) * h, r.base - h * 0.8);
        g.lineTo(x + 0.16 * m, r.base);
      }
      g.fill();
      glow(g, X + 1.15 * m, r.base - sz, 0.5 * m, '#ffffff', 0.15 + 0.5 * mf.hat);
    } else for (let k = 0; k < 2; k++) near.push([X + (0.9 + k * 0.7) * m, r.base - 0.3 * m, (0.4 + 2.2 * G) * (0.7 + 0.5 * hash(i, k)) * m, i * 3 + k]);
  });
  // (the snow caps, one path)
  if (G < 0.85) {
    g.fillStyle = rgba('#f0f4f8', 0.95 * (1 - G / 0.85));
    g.beginPath();
    for (let k = 0; k < caps.length; k += 4) {
      const x = caps[k],
        w = caps[k + 1],
        u = caps[k + 3];
      g.moveTo(x + w * 0.85 * (1 - 0.5 * G), r.base - (0.25 + 0.2 * u) * m);
      g.ellipse(x, r.base - (0.25 + 0.2 * u) * m, w * 0.85 * (1 - 0.5 * G), (0.2 + 0.15 * u) * m, 0, Math.PI, TAU);
    }
    g.fill();
  }
  sprouts(g, near, m, mixHex(GREEN, T.near, 0.25), clap);
  // (the snowdrops: their stems in one path, their bells in another)
  if (drops.length) {
    g.strokeStyle = '#3aa83a';
    g.lineWidth = Math.max(1, 0.04 * m);
    g.beginPath();
    for (let k = 0; k < drops.length; k += 2) {
      const sx = drops[k],
        h = drops[k + 1];
      g.moveTo(sx, r.base - 0.2 * m);
      g.quadraticCurveTo(sx, r.base - 0.2 * m - h, sx + 0.15 * m, r.base - 0.15 * m - h);
    }
    g.stroke();
    g.fillStyle = '#ffffff';
    g.beginPath();
    for (let k = 0; k < drops.length; k += 2) {
      const x = drops[k] + 0.17 * m,
        y = r.base - 0.05 * m - drops[k + 1];
      g.moveTo(x + 0.07 * m, y);
      g.ellipse(x, y, 0.07 * m, 0.12 * m, -0.2 - 0.3 * mf.beat, 0, TAU);
    }
    g.fill();
  }
  // (the trees' leaves, one path; their blossoms in a drop)
  if (leaves.length) {
    g.fillStyle = mixHex(JUICY, T.near, 0.2);
    g.beginPath();
    for (let k = 0; k < leaves.length; k += 3) {
      g.moveTo(leaves[k] + leaves[k + 2], leaves[k + 1]);
      g.arc(leaves[k], leaves[k + 1], leaves[k + 2], 0, TAU);
    }
    g.fill();
    g.fillStyle = rgba('#d8ffa0', 0.35);
    g.beginPath();
    for (let k = 0; k < leaves.length; k += 3) {
      g.moveTo(leaves[k] - leaves[k + 2] * 0.2 + leaves[k + 2] * 0.45, leaves[k + 1] - leaves[k + 2] * 0.3);
      g.arc(leaves[k] - leaves[k + 2] * 0.2, leaves[k + 1] - leaves[k + 2] * 0.3, leaves[k + 2] * 0.45, 0, TAU);
    }
    g.fill();
  }
  if (blooms.length) {
    g.fillStyle = BLOOM;
    g.beginPath();
    for (let k = 0; k < blooms.length; k += 2) {
      g.moveTo(blooms[k] + (0.3 + 0.15 * mf.beat) * m, blooms[k + 1]);
      g.arc(blooms[k], blooms[k + 1], (0.3 + 0.15 * mf.beat) * m, 0, TAU);
    }
    g.fill();
  }
  // (vegetables walking out of their greenhouse as the spring comes: a carrot and a beet waddling along, stepping on
  // the beat)
  if (G > 0.45) {
    const walk = f.t * 0.5,
      n = beatOf(f).n;
    for (let i = Math.floor((r.x0 - walk) / 7) - 1; i < (r.x1 - walk) / 7 + 1; i++) {
      if (hash(i, 77) < 0.5) continue;
      const X = r.X(i * 7 + walk),
        Y = r.base - 0.25 * m,
        step = ((n + i) % 2 ? 1 : -1) * 0.12 * m,
        carrot = i % 2;
      g.strokeStyle = '#2a1a12';
      g.lineWidth = Math.max(1, 0.05 * m);
      g.beginPath();
      g.moveTo(X - 0.1 * m, Y - 0.2 * m);
      g.lineTo(X - 0.1 * m + step, Y);
      g.moveTo(X + 0.1 * m, Y - 0.2 * m);
      g.lineTo(X + 0.1 * m - step, Y);
      g.stroke();
      g.fillStyle = carrot ? '#ff8a2a' : '#a01a4a';
      g.beginPath();
      if (carrot) {
        g.moveTo(X - 0.22 * m, Y - 0.95 * m);
        g.lineTo(X + 0.22 * m, Y - 0.95 * m);
        g.lineTo(X, Y - 0.15 * m);
      } else g.arc(X, Y - 0.45 * m, 0.3 * m, 0, TAU);
      g.fill();
      g.fillStyle = '#ffffff';
      for (const d of [-0.07, 0.07]) g.fillRect(X + d * m, Y - (carrot ? 0.75 : 0.55) * m, 0.05 * m, 0.06 * m);
      g.strokeStyle = GREEN;
      g.lineWidth = Math.max(1, 0.06 * m);
      g.beginPath();
      for (const d of [-0.1, 0, 0.1]) {
        g.moveTo(X, Y - (carrot ? 0.95 : 0.72) * m);
        g.lineTo(X + d * 2 * m, Y - (carrot ? 1.3 : 1.05) * m);
      }
      g.stroke();
    }
  }
}

export const LANDMARKS = {
  // a giant seed split open, half sunk in the soil, its sprout up out of it growing with the song, its leaves unfurling
  // and clapping in a drop
  seedling(f) {
    const { g, v, mf, T, t } = f;
    mark(f, 0.07, 50, 0.8, 71, (X, B, up) => {
      const m = v.ppm * 0.9,
        G = grown(f),
        clap = inDrop(f) * mf.beat,
        shell = mixHex('#8a5a2a', T.far, 0.3),
        stem = mixHex(JUICY, T.far, 0.25);
      for (const s of [-1, 1]) {
        g.fillStyle = shell;
        g.beginPath();
        g.ellipse(X + s * 1.6 * m, B + up * 0.3, 2.4 * m, 3.6 * m, s * (0.4 + 0.3 * G), 0, TAU);
        g.fill();
        g.fillStyle = rgba('#f0d8a0', 0.25);
        g.beginPath();
        g.ellipse(X + s * 1.2 * m, B + up * 0.3 - 0.8 * m, 0.6 * m, 1.8 * m, s * (0.4 + 0.3 * G), 0, TAU);
        g.fill();
      }
      const H = (3 + 14 * G) * m,
        sw = Math.sin(t * 0.7) * 0.8 * m;
      g.strokeStyle = stem;
      g.lineWidth = Math.max(2, 0.7 * m);
      g.beginPath();
      g.moveTo(X, B + up * 0.3);
      g.bezierCurveTo(X - 2 * m, B - H * 0.4, X + 2 * m + sw, B - H * 0.7, X + sw, B - H);
      g.stroke();
      const L = (2 + 4 * G) * m,
        open = 0.95 - 0.8 * clap;
      leaf(g, X + sw, B - H, -Math.PI / 2 - open, L, mixHex(GREEN, T.far, 0.2));
      leaf(g, X + sw, B - H, -Math.PI / 2 + open, L, mixHex(GREEN, T.far, 0.2));
      for (let k = 1; k < 4; k++) leaf(g, X + Math.sin(k * 2) * 0.8 * m, B - H * (k / 4), (k % 2 ? -0.5 : -2.6) - 0.15 * Math.sin(t + k), L * 0.6 * G, mixHex(JUICY, T.far, 0.25));
      glow(g, X + sw, B - H, 2 * m, GREEN, 0.15 * G + 0.3 * mf.drop);
    });
  },
  // a cluster of crystals forming out of the ground (the grain of chaos a new world crystallises round), growing with
  // the song, its faces flashing in turn on the beat
  crystal(f) {
    const { g, v, mf, T } = f;
    mark(f, 0.08, 46, 0.75, 73, (X, B, up) => {
      const m = v.ppm * 0.9,
        G = grown(f),
        n = beatOf(f).n,
        col = mixHex(CRYSTAL, T.far, 0.3),
        dark = mixHex('#3a6a8a', T.far, 0.35);
      for (let k = 0; k < 7; k++) {
        const a = (k - 3) * 0.22 + (hash(k, 3) - 0.5) * 0.2,
          h = (4 + 8 * hash(k, 4)) * m * (0.45 + 0.55 * G) * (k === 3 ? 1.4 : 1),
          w = (0.9 + 0.5 * hash(k, 5)) * m,
          x = X + (k - 3) * 1.1 * m,
          y = B + up * 0.5,
          tx = x + Math.sin(a) * h,
          ty = y - Math.cos(a) * h;
        g.fillStyle = dark;
        g.beginPath();
        g.moveTo(x - w, y);
        g.lineTo(tx - w * 0.9, ty + w);
        g.lineTo(tx, ty);
        g.lineTo(tx + w * 0.9, ty + w);
        g.lineTo(x + w, y);
        g.fill();
        g.fillStyle = rgba(col, (k + n) % 7 === 0 ? 0.6 + 0.4 * mf.beat : 0.45);
        g.beginPath();
        g.moveTo(x - w * 0.1, y);
        g.lineTo(tx - w * 0.1, ty + w * 0.3);
        g.lineTo(tx, ty);
        g.lineTo(tx + w * 0.9, ty + w);
        g.lineTo(x + w, y);
        g.fill();
      }
      glow(g, X, B - 4 * m, 6 * m, CRYSTAL, 0.08 + 0.2 * mf.kick);
    });
  },
  // a ribbon pole on a green rise, its ribbons streaming out to a round dance of little figures going round it hand in
  // hand (faster in a drop), a spring bonfire beside it crackling on the kick
  maypole(f) {
    const { g, v, mf, T, t } = f;
    mark(f, 0.08, 48, 0.75, 75, (X, B, up) => {
      const m = v.ppm * 0.9,
        G = grown(f),
        spin = t * (inDrop(f) ? 1.6 : 0.5),
        top = B - 11 * m,
        cols = ['#ff3a5a', '#ffd23a', '#3ab8ff', '#5ae04a', '#ff8ad0', '#ffffff'];
      g.fillStyle = mixHex(mixHex('#5a4a40', '#4aa83a', G), T.far, 0.3);
      g.beginPath();
      g.ellipse(X, B + up, 9 * m, 2.5 * m + up, 0, Math.PI, TAU);
      g.fill();
      g.fillStyle = mixHex('#e8d8b0', T.far, 0.2);
      g.fillRect(X - 0.2 * m, top, 0.4 * m, B + up - top);
      glow(g, X, top, 1 * m, '#fff0a0', 0.3 + 0.5 * mf.beat);
      const N = 10;
      for (let k = 0; k < N; k++) {
        const a = spin + (k * TAU) / N,
          x = X + Math.cos(a) * 5 * m,
          y = B + up * 0.5 + Math.sin(a) * 1 * m,
          front = Math.sin(a) > 0;
        g.strokeStyle = rgba(cols[k % 6], front ? 0.9 : 0.5);
        g.lineWidth = Math.max(1, 0.12 * m);
        g.beginPath();
        g.moveTo(X, top + 0.3 * m);
        g.quadraticCurveTo(X + Math.cos(a) * 3 * m, top + 4 * m, x, y - 1.6 * m);
        g.stroke();
        // (a dancer: a little round head, a dress, an arm out holding the ribbon, a hop on the beat)
        const hop = (k % 2 ? mf.beat : 1 - mf.beat) * 0.25 * m;
        g.fillStyle = rgba(front ? '#1a1414' : '#3a3030', 1);
        g.beginPath();
        g.arc(x, y - 1.9 * m - hop, 0.3 * m, 0, TAU);
        g.moveTo(x - 0.5 * m, y - hop);
        g.lineTo(x, y - 1.6 * m - hop);
        g.lineTo(x + 0.5 * m, y - hop);
        g.fill();
      }
      // (the bonfire beside it)
      const bx = X + 7 * m,
        by = B + up * 0.6;
      glow(g, bx, by - 1 * m, 2.5 * m, '#ff8a2a', 0.4 + 0.4 * mf.kick);
      for (let k = 0; k < 5; k++) {
        const h = (1.4 + 0.8 * Math.sin(t * 9 + k * 2) + 0.8 * mf.kick) * m;
        g.fillStyle = k % 2 ? '#ffd23a' : '#ff6a2a';
        g.beginPath();
        g.moveTo(bx + (k - 2) * 0.35 * m - 0.3 * m, by);
        g.quadraticCurveTo(bx + (k - 2) * 0.3 * m, by - h * 0.6, bx + (k - 2) * 0.2 * m, by - h);
        g.quadraticCurveTo(bx + (k - 2) * 0.3 * m + 0.2 * m, by - h * 0.5, bx + (k - 2) * 0.35 * m + 0.3 * m, by);
        g.fill();
      }
    });
  },
  // a great bush, a smoulder of bare twigs at first, leafing out as the garden grows and bursting into bloom in a drop
  bush(f) {
    const { g, v, mf, T, t } = f;
    mark(f, 0.06, 54, 0.75, 77, (X, B, up) => {
      const m = v.ppm * 0.9,
        G = grown(f),
        D = inDrop(f),
        twig = mixHex('#3a2a1a', T.far, 0.3),
        green = mixHex(JUICY, T.far, 0.25);
      g.strokeStyle = twig;
      g.lineWidth = Math.max(1, 0.3 * m);
      g.beginPath();
      for (let k = 0; k < 9; k++) {
        const a = -Math.PI / 2 + (k - 4) * 0.28;
        g.moveTo(X, B + up * 0.5);
        g.lineTo(X + Math.cos(a) * 9 * m, B + up * 0.5 + Math.sin(a) * 9 * m);
      }
      g.stroke();
      for (let k = 0; k < 26; k++) {
        const a = -Math.PI / 2 + (hash(k, 3) - 0.5) * 2.4,
          d = (3 + 6 * hash(k, 4)) * m,
          x = X + Math.cos(a) * d + Math.sin(t * 1.3 + k) * 0.15 * m * (1 + mf.bass),
          y = B + up * 0.5 + Math.sin(a) * d;
        if (hash(k, 5) > G) {
          glow(g, x, y, 0.5 * m, EMBER, 0.3 * (1 - G) + 0.3 * mf.kick * (1 - G));
          continue;
        }
        g.fillStyle = green;
        g.beginPath();
        g.arc(x, y, (1.1 + 0.6 * hash(k, 6)) * m, 0, TAU);
        g.fill();
        if (D && k % 3 === 0) {
          g.fillStyle = k % 2 ? BLOOM : '#fff0a0';
          g.beginPath();
          g.arc(x, y - 0.4 * m, (0.35 + 0.25 * mf.beat) * m, 0, TAU);
          g.fill();
        }
      }
    });
  },
};

const MOLE_EYES = [-0.08, 0.1];

export default {
  sky,
  far,
  near,
  back(f) {
    for (const l of f.look.landmarks) LANDMARKS[l]?.(f);
    far(f);
    near(f);
  },
  // the soil cut away: fine black layers, embers in them, roots threading down, green spots spreading as it grows and
  // microbes in a slow dance (little rings with a wiggle of a tail, turning round on the beat)
  ground(f, a, b, y) {
    const { g, v, mf, t } = f,
      G = grown(f),
      s = slab(f, a, b, y, SOIL, G < 0.5 ? mixHex('#e8eef4', '#3a2418', G * 2) : mixHex('#3a2418', '#3a7a22', (G - 0.5) * 2));
    if (!s) return;
    const m = v.ppm;
    g.fillStyle = 'rgba(70,40,30,0.35)';
    for (const d of [0.7, 1.6, 2.7]) g.fillRect(s.X0, s.Y + d * m, s.X1 - s.X0, 0.08 * m);
    for (let k = Math.floor(s.a / 1.1); k < s.b / 1.1; k++) {
      const X = v.sx(k * 1.1),
        u = hash(k, 51);
      if (u < 0.35) {
        // (a root threading down, its tip lit green as the garden grows)
        g.strokeStyle = 'rgba(200,170,120,0.45)';
        g.lineWidth = Math.max(1, 0.05 * m);
        g.beginPath();
        g.moveTo(X, s.Y + 0.2 * m);
        g.quadraticCurveTo(X + 0.4 * m, s.Y + 1 * m, X + 0.1 * m, s.Y + 2.2 * m);
        g.stroke();
        glow(g, X + 0.1 * m, s.Y + 2.2 * m, 0.25 * m, GREEN, 0.2 + 0.5 * G);
      } else if (u < 0.6) {
        glow(g, X + 0.5 * m, s.Y + (0.5 + 1.5 * hash(k, 52)) * m, 0.18 * m, EMBER, (0.4 + 0.5 * mf.kick) * (1 - G * 0.8));
      } else if (u < 0.85) {
        // (a microbe: a ring, a tail wiggling, turning slowly round)
        const cx = X + 0.5 * m + Math.sin(t * 0.7 + k) * 0.2 * m,
          cy = s.Y + (0.6 + 1.6 * hash(k, 53)) * m,
          a = t * 0.8 + k + 0.6 * mf.beat;
        g.strokeStyle = rgba(k % 2 ? '#9af0ff' : '#c8ff9a', 0.55);
        g.lineWidth = Math.max(1, 0.03 * m);
        g.beginPath();
        g.arc(cx, cy, 0.09 * m, 0, TAU);
        g.moveTo(cx + Math.cos(a) * 0.09 * m, cy + Math.sin(a) * 0.09 * m);
        g.quadraticCurveTo(cx + Math.cos(a) * 0.2 * m + Math.sin(t * 9) * 0.05 * m, cy + Math.sin(a) * 0.2 * m, cx + Math.cos(a) * 0.3 * m, cy + Math.sin(a) * 0.3 * m);
        g.stroke();
      }
      if (hash(k, 55) < G * 0.8) {
        g.fillStyle = rgba(GREEN, 0.35);
        g.beginPath();
        g.ellipse(X + 0.3 * m, s.Y + (0.3 + 0.6 * hash(k, 56)) * m, 0.25 * m, 0.1 * m, 0, 0, TAU);
        g.fill();
      }
    }
    edge(f, s, mixHex(EMBER, GREEN, G));
  },
  // the pictures painted while the song loads, in its palette and its drop's (world/render.js warmWorld)
  warm(f) {
    const { v } = f,
      bark = mixHex('#1a1210', steady(f).near, 0.2);
    for (const m of [v.ppm, v.ppm * 0.8]) {
      treePic(m, bark);
      for (let n = 1; n <= 3; n++) for (let G = 0.1; G <= 1.05; G += 0.2) agaricPic(m * (0.9 + 0.5 * G), n);
    }
  },
};
