// Black Snow (after ATL's "Чёрным снегом", "Мерзлота", "Кривой эфир"; world/artists.js): a frozen sea of black snow
// under a grey moon with a bite out of it, in black and white and one red (the grammar of his videos). Ink clouds
// tremble across the moon on the kick; out on the ice giant radio masts stand to the horizon, breathing rings of static
// on the beat, their red lights blinking, the ice between them cracked with red light; near, black floes heaved up in
// slabs, snow on their tops and red seams glowing in them on the kick, and totems of stacked bird skulls (the marabou's
// long bill) with red eyes flaring on the snare; underfoot a crust of black ice, grey grit of the snow in it, red cracks.
// Landmarks by the song: a totem of marabou skulls as tall as a tower, a mast breathing static far across, a giant
// radio half sunk in the ice, its dial glowing and its needle jumping on the beat.
import { hash, mixHex, rgba } from '../util.js';
import { cells, edge, glow, landmark, row, sizeStep, slab, stamp, steady, still, vgrad } from './kit.js';

const TAU = Math.PI * 2,
  RED = '#c81e1e',
  SNOW = '#e8e6e0',
  INK = '#0c0c0e';

const beatOf = f => {
  const b = f.t / f.L.A.beat;
  return { n: Math.floor(b), u: b - Math.floor(b) };
};
// a landmark standing up from the far horizon (a phone's horizon sits low: lifted to a fifth of the screen)
function mark(f, par, every, chance, salt, draw) {
  const up = Math.max(1.6 * f.v.ppm, 0.2 * f.v.H);
  landmark(f, par, every, chance, salt, (X, base, i) => draw(X, base - up, up, i));
}

// ---- the moon: painted once a size, mottled, a bite out of its edge, its limb darkened by rings
const MOONS = new Map();
function moonSprite(R) {
  const key = sizeStep(R);
  let c = MOONS.get(key);
  if (c) return c;
  const S = Math.ceil(key * 2 + 4);
  // (keyed by its size step, never by the bass it breathes with: stamped at the size asked)
  c = Object.assign(document.createElement('canvas'), { width: S, height: S });
  const g = c.getContext('2d'),
    o = S / 2;
  g.beginPath();
  g.arc(o, o, key, 0, TAU);
  g.moveTo(o + key * 1.37, o - key * 0.55);
  g.arc(o + key * 0.95, o - key * 0.55, key * 0.42, 0, TAU, true);
  g.clip('evenodd');
  g.fillStyle = '#cfcbc2';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 26; i++) {
    const a = hash(i, 3) * TAU,
      d = Math.sqrt(hash(i, 4)) * key,
      r = key * (0.05 + 0.22 * hash(i, 5) ** 2);
    g.fillStyle = i % 3 ? 'rgba(60,58,56,0.16)' : 'rgba(255,255,250,0.25)';
    g.beginPath();
    g.arc(o + Math.cos(a) * d, o + Math.sin(a) * d, r, 0, TAU);
    g.fill();
  }
  for (let k = 0; k < 8; k++) {
    g.strokeStyle = `rgba(20,20,22,${0.05 + k * 0.035})`;
    g.lineWidth = key * 0.06;
    g.beginPath();
    g.arc(o + key * 0.06, o + key * 0.06, key * (0.62 + k * 0.055), 0, TAU);
    g.stroke();
  }
  MOONS.set(key, c);
  if (MOONS.size > 6) MOONS.delete(MOONS.keys().next().value);
  return c;
}
// ink clouds: long torn strokes of near black drifting in a band, trembling on the kick
function inkClouds(f, Y, n, a, salt) {
  const { g, v, t, mf } = f;
  g.fillStyle = rgba(mixHex(INK, f.T.sky[1], 0.25), a);
  for (let i = 0; i < n; i++) {
    const w = v.W * (0.25 + 0.35 * hash(i, salt + 1)),
      x = ((hash(i, salt) * (v.W + w) + t * v.dpr * (5 + 6 * hash(i, salt + 2))) % (v.W + w)) - w * 0.5,
      y = Y + (hash(i, salt + 3) - 0.5) * v.H * 0.12 + Math.sin(t * 31 + i) * mf.kick * 2 * v.dpr,
      h = v.H * (0.012 + 0.02 * hash(i, salt + 4));
    g.beginPath();
    g.moveTo(x - w / 2, y);
    g.quadraticCurveTo(x - w * 0.2, y - h * 1.6, x + w * 0.1, y - h * 0.4);
    g.quadraticCurveTo(x + w * 0.35, y - h * 1.2, x + w / 2, y + h * 0.2);
    g.quadraticCurveTo(x, y + h * 0.9, x - w / 2, y);
    g.fill();
  }
}
function sky(f) {
  const { g, v, mf, look } = f,
    R = Math.min(v.W, v.H) * 0.17 * (1 + 0.03 * mf.bass),
    X = v.W * 0.68,
    Y = v.H * 0.24 + mf.drop * mf.kick * 0.02 * v.H,
    night = 0.75 + 0.25 * (look.night ?? 0.5);
  inkClouds(f, v.H * 0.14, 5, 0.35, 11);
  glow(g, X, Y, R * 2.6, '#f4f0e8', (0.16 + 0.1 * mf.voice + 0.08 * mf.kick) * night);
  const c = moonSprite(R),
    k = R / sizeStep(R);
  g.globalAlpha = night;
  g.drawImage(c, X - (c.width * k) / 2, Y - (c.height * k) / 2, c.width * k, c.height * k);
  g.globalAlpha = 1;
  inkClouds(f, Y + R * 0.4, 4, 0.75, 23);
}

// a lattice mast from (X, base) up h, its rings of static breathing out on the beat, red lights up it
function mast(g, X, base, h, m, f, i, col) {
  const { mf, t, L } = f;
  g.strokeStyle = col;
  g.lineWidth = Math.max(1, 0.06 * m);
  g.beginPath();
  g.moveTo(X - 0.7 * m, base);
  g.lineTo(X, base - h);
  g.lineTo(X + 0.7 * m, base);
  for (let k = 1; k < 10; k++) {
    const y = base - (h * k) / 10,
      w = 0.7 * (1 - k / 10);
    g.moveTo(X - w * m, y);
    g.lineTo(X + w * 0.9 * m, y - h / 10);
  }
  g.stroke();
  for (let k = 0; k < 3; k++) glow(g, X, base - h + k * h * 0.3, 0.22 * m, RED, (k + i + Math.floor(t * 2)) % 2 ? 0.95 : 0.3);
  const b = t / L.A.beat + i * 0.37;
  g.lineWidth = Math.max(1, 0.05 * m);
  for (let k = 0; k < 3; k++) {
    const u = (b - Math.floor(b) + k) / 3,
      a = 0.55 * (1 - u) * (0.6 + 0.4 * mf.kick);
    if (a < 0.03) continue;
    g.strokeStyle = rgba(k ? '#f0eee8' : RED, a);
    g.beginPath();
    g.ellipse(X, base - h, (0.4 + 4 * u) * m, (0.15 + 1.2 * u) * m, 0, 0, TAU);
    g.stroke();
  }
  // (a crackle of static round its top on the snare)
  if (mf.snare > 0.25) {
    g.fillStyle = rgba('#ffffff', mf.snare);
    for (let k = 0; k < 10; k++) g.fillRect(X + (hash(k, Math.floor(t * 20) + i) - 0.5) * 3 * m, base - h + (hash(k, i + 50) - 0.5) * 2 * m, 2 * f.v.dpr, f.v.dpr);
  }
}

// ---- the far rows: the frozen sea to the horizon, its cracks of red light, the masts on it, a berg of black ice
// how far the rows stand up off the horizon (a phone's horizon sits low, under the roofs)
const lift = (f, k) => Math.max(1.2 * f.v.ppm, k * f.v.H);
function far(f) {
  const { g, v, mf, T } = f,
    r0 = row(f, 0.12),
    r = { ...r0, base: r0.base - lift(f, 0.16) },
    m = v.ppm,
    ice = mixHex(T.far, '#3a3a3e', 0.3);
  // (the ice: a pale line of horizon, the sea darker toward us)
  g.fillStyle = mixHex(T.sky[2], SNOW, 0.3);
  g.fillRect(r.L, r.base - 1.3 * m, r.R - r.L, 0.08 * m);
  g.fillStyle = ice;
  g.fillRect(r.L, r.base - 1.22 * m, r.R - r.L, 4.5 * m);
  cells(r, 9, (i, X, u) => {
    // (a crack across the ice, lit red on the kick)
    g.strokeStyle = rgba(RED, 0.2 + 0.5 * mf.kick * (i % 2 ? 1 : 0.4));
    g.lineWidth = Math.max(1, 0.04 * m);
    g.beginPath();
    g.moveTo(X, r.base - 1.1 * m);
    g.lineTo(X + 2 * m, r.base - 0.7 * m);
    g.lineTo(X + 1.4 * m, r.base - 0.2 * m);
    g.lineTo(X + 4 * m, r.base + 0.4 * m);
    g.stroke();
    if (u < 0.55) mast(g, X + 4 * m, r.base - 1.1 * m, (6 + 4 * hash(i, 7)) * m, m, f, i, mixHex(T.far, INK, 0.4));
    else if (u < 0.8) {
      // (a berg of black ice, snow along its edges)
      g.fillStyle = mixHex(INK, T.far, 0.35);
      g.beginPath();
      g.moveTo(X + 1 * m, r.base - 1.1 * m);
      g.lineTo(X + 2 * m, r.base - (3 + 1.5 * u) * m);
      g.lineTo(X + 3.2 * m, r.base - (2.4 + u) * m);
      g.lineTo(X + 4.4 * m, r.base - 1.1 * m);
      g.fill();
      g.strokeStyle = rgba(SNOW, 0.7);
      g.lineWidth = Math.max(1, 0.06 * m);
      g.beginPath();
      g.moveTo(X + 2 * m, r.base - (3 + 1.5 * u) * m);
      g.lineTo(X + 3.2 * m, r.base - (2.4 + u) * m);
      g.stroke();
    }
  });
}

// ---- the near rows: black ice heaved up in floes, bare black trees in a lace of branches (the angels circle in it),
// totems of marabou skulls with eyes of red light (lifted over the roofs: a phone's horizon sits under them)
// (a floe heaved up: a tilted slab of black ice, glassy, a sheen down its face, snow on its top edge; painted once)
const floePic = (m, v, floe) =>
  still(`bs-floe|${v}|${floe}`, m, 4.2, 4.4, 0.3, 4.2, (g, s) => {
    const h = (1.8 + 0.7 * v) * s,
      w = (1.8 + 0.5 * v) * s,
      tilt = (v - 1) * 0.35 * s;
    g.fillStyle = vgrad(g, -h, 0, [[0, mixHex(floe, '#8a8a96', 0.35)], [0.5, floe], [1, mixHex(floe, '#000000', 0.5)]]);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0.2 * s, -h - tilt);
    g.lineTo(w, -h + tilt);
    g.lineTo(w + 0.3 * s, 0);
    g.fill();
    g.strokeStyle = 'rgba(220,225,235,0.18)';
    g.lineWidth = Math.max(1, 0.05 * s);
    g.beginPath();
    for (let k = 0; k < 3; k++) {
      g.moveTo((0.4 + k * 0.5) * s, -h * 0.9);
      g.lineTo((0.6 + k * 0.5) * s, -h * 0.2);
    }
    g.stroke();
    g.strokeStyle = SNOW;
    g.lineWidth = 0.14 * s;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(0.2 * s, -h - tilt);
    g.lineTo(w, -h + tilt);
    g.stroke();
    g.lineCap = 'butt';
  });
// (a bare black tree: a trunk forking up into a lace of branches; painted once)
const treePic = (m, ink) =>
  still(`bs-tree|${ink}`, m, 6.4, 8.6, 3.2, 8.4, (g, s) => {
    g.strokeStyle = ink;
    g.lineCap = 'round';
    const branch = (x, y, a, L, w, d) => {
      const x1 = x + Math.cos(a) * L,
        y1 = y + Math.sin(a) * L;
      g.lineWidth = Math.max(1, w);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x1, y1);
      g.stroke();
      if (d > 0) for (const da of [-0.45, 0.4]) branch(x1, y1, a + da + (hash(d, Math.round(L)) - 0.5) * 0.3, L * 0.72, w * 0.6, d - 1);
    };
    branch(0, 0, -Math.PI / 2, 3 * s, 0.32 * s, 5);
    g.lineCap = 'butt';
  });
// (a totem of marabou skulls on a pole: round craniums, long bills out to alternate sides, dark sockets; painted once)
const totemPic = (m, n, bone, pole) =>
  still(`bs-totem|${n}|${bone}|${pole}`, m, 2.6, 2 + 0.75 * n, 1.3, 1.6 + 0.75 * n, (g, s) => {
    g.fillStyle = pole;
    g.fillRect(-0.07 * s, -(1.4 + 0.75 * n) * s, 0.14 * s, (1.4 + 0.75 * n) * s);
    for (let k = 0; k < n; k++) {
      const y = -(1.4 + k * 0.75) * s,
        sd = k % 2 ? 1 : -1,
        gr = g.createRadialGradient(-0.08 * s, y - 0.08 * s, 0, 0, y, 0.32 * s);
      gr.addColorStop(0, mixHex(bone, '#ffffff', 0.3));
      gr.addColorStop(1, mixHex(bone, '#000000', 0.35));
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(0, y, 0.28 * s, 0.24 * s, 0, 0, TAU);
      g.moveTo(sd * 0.15 * s, y - 0.08 * s);
      g.lineTo(sd * 1.05 * s, y + 0.12 * s);
      g.lineTo(sd * 0.15 * s, y + 0.12 * s);
      g.fill();
      g.fillStyle = INK;
      g.beginPath();
      g.arc(sd * 0.06 * s, y - 0.03 * s, 0.08 * s, 0, TAU);
      g.fill();
    }
  });
function near(f) {
  const { g, v, mf, t } = f,
    P = steady(f),
    r0 = row(f, 0.4),
    r = { ...r0, base: r0.base - lift(f, 0.12) },
    m = v.ppm,
    n = Math.floor(t / f.L.A.beat),
    floe = mixHex('#2a2a2e', P.near, 0.4),
    ink = mixHex(INK, P.near, 0.15),
    bone = mixHex('#d8d6d0', P.near, 0.35),
    pole = mixHex(INK, P.near, 0.3),
    seams = [],
    eyes = [];
  // (the shelf of ice they stand on, snow along its edge)
  g.fillStyle = mixHex(INK, P.near, 0.25);
  g.fillRect(r.L, r.base, r.R - r.L, 5 * m);
  g.fillStyle = mixHex(SNOW, P.near, 0.3);
  g.fillRect(r.L, r.base - 0.1 * m, r.R - r.L, 0.2 * m);
  cells(r, 2.6, (i, X, u) => {
    if (u < 0.22) {
      // (a bare black tree, its lace of branches trembling on the kick)
      stamp(g, treePic(m, ink), X + 1.3 * m, r.base, m, 0, Math.sin(t * 0.6 + i) * 0.01 + 0.012 * mf.kick * Math.sin(t * 31 + i));
      return;
    }
    const vv = Math.floor(hash(i, 3) * 3);
    stamp(g, floePic(m, vv, floe), X, r.base, m);
    if (u < 0.6) seams.push(X, (1.8 + 0.7 * vv) * m, (1.8 + 0.5 * vv) * m);
    if (u > 0.8) {
      const k = 2 + Math.floor(hash(i, 6) * 3),
        tx = X + (2.4 + 0.5 * vv) * m;
      stamp(g, totemPic(m, k, bone, pole), tx, r.base, m);
      for (let q = 0; q < k; q++) eyes.push(tx + (q % 2 ? 1 : -1) * 0.06 * m, r.base - (1.4 + q * 0.75 + 0.03) * m, (q + n + i) % k === 0);
    }
  });
  // (the red seams in the floes, lit on the kick: one path)
  if (seams.length) {
    g.strokeStyle = rgba(RED, 0.25 + 0.65 * mf.kick);
    g.lineWidth = Math.max(1, 0.05 * m);
    g.beginPath();
    for (let k = 0; k < seams.length; k += 3) {
      const X = seams[k],
        h = seams[k + 1],
        w = seams[k + 2];
      g.moveTo(X + w * 0.4, r.base - h * 0.85);
      g.lineTo(X + w * 0.55, r.base - h * 0.45);
      g.lineTo(X + w * 0.45, r.base);
    }
    g.stroke();
  }
  // (the skulls' eyes: red glints flaring on the snare, one of each totem's in turn on the beat)
  for (let k = 0; k < eyes.length; k += 3) glow(g, eyes[k], eyes[k + 1], 0.18 * m * (eyes[k + 2] ? 1.6 : 1), RED, 0.4 + 0.6 * mf.snare + (eyes[k + 2] ? 0.4 * mf.beat : 0));
}

export const LANDMARKS = {
  // a totem of marabou skulls as tall as a tower, its bills out both ways, its sockets lit red on the beat, a crown of
  // crow feathers on top spreading on a drop
  skulltotem(f) {
    const { g, v, mf, T } = f;
    mark(f, 0.07, 46, 0.75, 31, (X, B, up) => {
      const m = v.ppm * 0.9,
        col = mixHex('#cfcbc2', T.far, 0.4),
        n = 6,
        spread = mf.drop > 0 ? Math.min(1, mf.drop * 3) : 0;
      g.fillStyle = mixHex(INK, T.far, 0.3);
      g.fillRect(X - 0.3 * m, B - 10 * m, 0.6 * m, 10 * m + up);
      glow(g, X, B - 9 * m, 5 * m, RED, 0.1 + 0.12 * mf.kick + 0.12 * spread);
      for (let k = 0; k < n; k++) {
        const y = B - (1.5 + k * 1.45) * m,
          s = k % 2 ? 1 : -1,
          bill = (2.2 - k * 0.15) * m;
        g.fillStyle = col;
        g.beginPath();
        g.ellipse(X, y, 0.75 * m, 0.6 * m, 0, 0, TAU);
        g.fill();
        g.beginPath();
        g.moveTo(X + s * 0.4 * m, y - 0.25 * m);
        g.lineTo(X + s * bill, y + 0.3 * m);
        g.lineTo(X + s * 0.4 * m, y + 0.3 * m);
        g.fill();
        g.fillStyle = INK;
        g.beginPath();
        g.arc(X + s * 0.15 * m, y - 0.1 * m, 0.22 * m, 0, TAU);
        g.fill();
        glow(g, X + s * 0.15 * m, y - 0.1 * m, 0.4 * m, RED, (k + beatOf(f).n) % n === 0 ? 0.6 + 0.4 * mf.beat : 0.25);
      }
      g.fillStyle = mixHex(INK, T.far, 0.2);
      g.beginPath();
      for (let k = -4; k <= 4; k++) {
        const a = -Math.PI / 2 + k * (0.18 + 0.12 * spread),
          L = (2 + 1.2 * spread - 0.15 * Math.abs(k)) * m,
          bx = X,
          by = B - 10 * m;
        g.moveTo(bx + Math.cos(a - 0.08) * 0.4 * m, by + Math.sin(a - 0.08) * 0.4 * m);
        g.lineTo(bx + Math.cos(a) * L, by + Math.sin(a) * L);
        g.lineTo(bx + Math.cos(a + 0.08) * 0.4 * m, by + Math.sin(a + 0.08) * 0.4 * m);
      }
      g.fill();
    });
  },
  // the tallest of the masts, far across the ice, breathing static
  staticmast(f) {
    const { g, v, T } = f;
    mark(f, 0.05, 52, 0.75, 35, (X, B, up) => {
      const m = v.ppm * 0.9;
      mast(g, X, B + up * 0.3, 14 * m, m * 1.5, f, 3, mixHex(T.far, T.sky[2], 0.2));
    });
  },
  // a giant radio half sunk in the ice: its dial glowing, its needle jumping to a station on the beat, its speaker
  // grille pushed by the bass, snow on its top, its aerial up crooked with a red light
  frozenradio(f) {
    const { g, v, mf, T } = f;
    mark(f, 0.08, 44, 0.75, 33, (X, B) => {
      const m = v.ppm * 0.9,
        W = 9 * m,
        H = 5 * m,
        body = mixHex('#3a3a3e', T.far, 0.4),
        tilt = -0.12;
      g.save();
      g.translate(X, B);
      g.rotate(tilt);
      g.fillStyle = body;
      g.fillRect(-W / 2, -H, W, H + 2 * m);
      g.fillStyle = SNOW;
      g.fillRect(-W / 2 - 0.2 * m, -H - 0.3 * m, W + 0.4 * m, 0.4 * m);
      g.fillStyle = mixHex(INK, body, 0.3);
      g.beginPath();
      g.arc(-W * 0.22, -H * 0.45, 1.7 * m * (1 + 0.05 * mf.bass), 0, TAU);
      g.fill();
      g.strokeStyle = rgba('#8a8884', 0.6);
      g.lineWidth = 0.1 * m;
      for (let k = 1; k < 4; k++) {
        g.beginPath();
        g.arc(-W * 0.22, -H * 0.45, 0.42 * k * m * (1 + 0.05 * mf.bass), 0, TAU);
        g.stroke();
      }
      g.fillStyle = rgba('#f0e8d0', 0.55 + 0.3 * mf.beat);
      g.fillRect(W * 0.05, -H * 0.75, W * 0.38, H * 0.3);
      g.fillStyle = RED;
      g.fillRect(W * 0.07 + W * 0.34 * hash(beatOf(f).n, 7), -H * 0.8, 0.12 * m, H * 0.4);
      g.strokeStyle = body;
      g.lineWidth = 0.15 * m;
      g.beginPath();
      g.moveTo(W * 0.4, -H);
      g.lineTo(W * 0.6, -H - 5 * m);
      g.lineTo(W * 0.5, -H - 7 * m);
      g.stroke();
      glow(g, W * 0.5, -H - 7 * m, 0.4 * m, RED, 0.5 + 0.5 * mf.beat);
      g.restore();
      // (the ice it is sunk in, heaped round its foot)
      g.fillStyle = mixHex(SNOW, T.far, 0.35);
      g.beginPath();
      g.ellipse(X, B + 0.5 * m, W * 0.65, 1.2 * m, 0, Math.PI, TAU);
      g.fill();
    });
  },
};

export default {
  sky,
  far,
  near,
  back(f) {
    for (const l of f.look.landmarks) LANDMARKS[l]?.(f);
    far(f);
    near(f);
  },
  // a crust of black ice: snow lumped along its top, its body glassy black with grey grit in it and pale streaks of
  // its depth, red cracks lit on the kick
  ground(f, a, b, y) {
    const { g, v, mf } = f,
      s = slab(f, a, b, y, '#101014', mixHex(SNOW, '#8a8884', 0.15));
    if (!s) return;
    const m = v.ppm,
      k0 = Math.floor(s.a / 1.3),
      k1 = s.b / 1.3;
    // (snow lumped along its top, one path)
    g.fillStyle = SNOW;
    g.beginPath();
    for (let k = Math.floor(s.a / 0.6); k < s.b / 0.6; k++) {
      const X = v.sx(k * 0.6),
        u = hash(k, 81);
      g.moveTo(X + (0.68 + 0.1 * u) * m, s.Y + 0.04 * m);
      g.ellipse(X + 0.3 * m, s.Y + 0.04 * m, (0.38 + 0.1 * u) * m, (0.07 + 0.05 * u) * m, 0, Math.PI, TAU);
    }
    g.fill();
    // (pale streaks of its depth, one path; grey grit; red cracks lit on the kick, one path)
    g.fillStyle = 'rgba(180,190,200,0.08)';
    g.beginPath();
    for (let k = k0; k < k1; k++) {
      const X = v.sx(k * 1.3);
      g.moveTo(X, s.Y + 0.3 * m);
      g.lineTo(X + 0.5 * m, s.Y + 0.3 * m);
      g.lineTo(X + 1.3 * m, s.Y + 2.4 * m);
      g.lineTo(X + 0.8 * m, s.Y + 2.4 * m);
    }
    g.fill();
    g.fillStyle = 'rgba(200,198,190,0.25)';
    for (let k = k0; k < k1; k++) {
      const X = v.sx(k * 1.3);
      for (let j = 0; j < 4; j++) g.fillRect(X + hash(k, 84 + j) * 1.2 * m, s.Y + (0.4 + 1.6 * hash(k, 88 + j)) * m, 0.05 * m, 0.05 * m);
    }
    g.strokeStyle = rgba(RED, 0.25 + 0.65 * mf.kick);
    g.lineWidth = Math.max(1, 0.04 * m);
    g.beginPath();
    for (let k = k0; k < k1; k++) {
      if (hash(k, 83) <= 0.7) continue;
      const X = v.sx(k * 1.3);
      g.moveTo(X + 0.4 * m, s.Y + 0.25 * m);
      g.lineTo(X + 0.6 * m, s.Y + 0.8 * m);
      g.lineTo(X + 0.45 * m, s.Y + 1.4 * m);
      g.lineTo(X + 0.75 * m, s.Y + 2 * m);
    }
    g.stroke();
    edge(f, s, RED);
  },
  // the pictures painted while the song loads, in its palette and its drop's (world/render.js warmWorld)
  warm(f) {
    const { v } = f,
      P = steady(f),
      R = Math.min(v.W, v.H) * 0.17;
    for (const r of [R, R * 1.03]) moonSprite(r);
    for (const m of [v.ppm, v.ppm * 0.8]) {
      treePic(m, mixHex(INK, P.near, 0.15));
      for (let k = 0; k < 3; k++) floePic(m, k, mixHex('#2a2a2e', P.near, 0.4));
      for (let k = 2; k < 5; k++) totemPic(m, k, mixHex('#d8d6d0', P.near, 0.35), mixHex(INK, P.near, 0.3));
    }
  },
};
