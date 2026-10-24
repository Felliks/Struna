// The Last Man on Earth (after ATL's "Последний человек на Земле": alone on both halves of the planet and never so well
// in a thousand years, no stress, no drama, his sun never stops shining; a muscle car through endless fields, a fur coat
// on the hottest day, the mountain serpentine sinking into the noise of the ocean, a hole in the sky smiling at us, the
// Earth green as a lettuce leaf; "Под небом салатовым": a red shark of a car down an endless highway under a lettuce
// sky; "Притопил": the car taking off to the stars through a portal; world/artists.js): an empty Earth that is all
// summer and bliss, not ruins. A lettuce-green sky with fat clouds drifting, a big sun turning its rays on the beat, and
// in it a round hole onto the starry night that smiles, grinning wider on a drop, its ring spinning, the red car flying
// up into it on a drop; far off green hills folding down to the sea, a serpentine road winding down them, the ocean's
// rollers breaking white on the kick; near, a field of golden wheat swaying in waves on the bass, poppies in it, a
// billboard gone wild with flowers and a fuel pump grown over; underfoot the empty highway, its dashes lit on the kick,
// grass and flowers along its verge. Landmarks: the serpentine winding down a mountain to the sea, a little red
// car going down it; a throne on a hill with a fur coat thrown over it (the emperor of the planet); a great wave curling.
import { glowDot, hash, mixHex, rgba } from '../util.js';
import { cells, edge, glow, landmark, pic, row, sizeStep, slab, stamp, steady, still, vgrad } from './kit.js';
import { eased, lean } from '../physics.js';

const TAU = Math.PI * 2,
  SUN = '#fff4c0',
  WHEAT = '#f0c050',
  LETTUCE = '#7ad04a',
  SEA = '#2a8ad0',
  FOAM = '#f4fbff',
  POPPY = '#ff3a2a',
  CAR = '#e8302a';

const beatOf = f => {
  const b = f.t / f.L.A.beat;
  return { n: Math.floor(b), u: b - Math.floor(b) };
};
function mark(f, par, every, chance, salt, draw) {
  const up = Math.max(1.6 * f.v.ppm, 0.2 * f.v.H);
  landmark(f, par, every, chance, salt, (X, base, i) => draw(X, base - up, up, i));
}
// a fat summer cloud: painted once a size step, lit white on top, its belly shaded toward the sky
const cloudPic = w =>
  pic(`lm-cloud|${w}`, w * 1.1, w * 0.5, g => {
    const X = w * 0.55,
      Y = w * 0.32;
    g.fillStyle = vgrad(g, Y - w * 0.3, Y + w * 0.16, [[0, '#ffffff'], [0.6, '#f4fbff'], [1, '#c8e8d8']]);
    g.beginPath();
    g.ellipse(X, Y, w * 0.5, w * 0.16, 0, 0, TAU);
    g.ellipse(X - w * 0.18, Y - w * 0.1, w * 0.2, w * 0.17, 0, 0, TAU);
    g.ellipse(X + w * 0.08, Y - w * 0.16, w * 0.24, w * 0.22, 0, 0, TAU);
    g.ellipse(X + w * 0.3, Y - w * 0.05, w * 0.16, w * 0.13, 0, 0, TAU);
    g.fill();
  });
function cloud(g, X, Y, w, a) {
  const W = sizeStep(w),
    c = cloudPic(W),
    k = w / W;
  g.globalAlpha = a;
  g.drawImage(c, X - W * 0.55 * k, Y - W * 0.32 * k, c.width * k, c.height * k);
  g.globalAlpha = 1;
}

// ---- the sky: clouds, the sun, the smiling hole
function sky(f) {
  const { g, v, t, mf } = f,
    S = Math.min(v.W, v.H),
    { u } = beatOf(f);
  // (the sun: high on the left, its rays turning a step on each beat, swelling on the kick)
  const sx = v.W * 0.22,
    sy = v.H * 0.14,
    // (a sun hardly swells: 2.5 % on the kick through a springy mass, physics.js, its rays and its light do the rest)
    R = S * 0.07 * (1 + 0.025 * eased(f, 'Ks', mf.kick));
  glow(g, sx, sy, R * 6, '#fff0b0', 0.35 + 0.15 * mf.voice);
  g.fillStyle = rgba(SUN, 0.5);
  const turn = (beatOf(f).n + Math.min(1, u * 3)) * 0.1;
  g.beginPath();
  for (let k = 0; k < 12; k++) {
    const a = turn + (k * TAU) / 12;
    g.moveTo(sx + Math.cos(a - 0.08) * R * 1.3, sy + Math.sin(a - 0.08) * R * 1.3);
    g.lineTo(sx + Math.cos(a) * R * (2.3 + 0.5 * mf.beat), sy + Math.sin(a) * R * (2.3 + 0.5 * mf.beat));
    g.lineTo(sx + Math.cos(a + 0.08) * R * 1.3, sy + Math.sin(a + 0.08) * R * 1.3);
  }
  g.fill();
  g.fillStyle = SUN;
  g.beginPath();
  g.arc(sx, sy, R, 0, TAU);
  g.fill();
  // (the hole in the sky: a round window onto the starry night, its rim glowing, two stars for eyes and a smile of
  // light under them, grinning wider on a drop)
  const hx = v.W * 0.7,
    hy = v.H * 0.2,
    hr = S * 0.09 * (1 + 0.03 * eased(f, 'B', mf.bass));
  glow(g, hx, hy, hr * 1.8, '#c8e8ff', 0.45);
  g.fillStyle = '#0a0a2a';
  g.beginPath();
  g.arc(hx, hy, hr, 0, TAU);
  g.fill();
  for (let i = 0; i < 16; i++) {
    const a = hash(i, 3) * TAU,
      d = Math.sqrt(hash(i, 4)) * hr * 0.9;
    g.fillStyle = rgba('#ffffff', 0.4 + 0.5 * hash(i, 5));
    g.fillRect(hx + Math.cos(a) * d, hy + Math.sin(a) * d, 1.5 * v.dpr, 1.5 * v.dpr);
  }
  g.strokeStyle = rgba('#e8f4ff', 0.9);
  g.lineWidth = Math.max(1.5, hr * 0.06);
  g.beginPath();
  g.arc(hx, hy, hr, 0, TAU);
  g.stroke();
  const grin = 0.55 + 0.25 * mf.drop + 0.1 * mf.beat;
  g.strokeStyle = '#ffe890';
  g.lineWidth = Math.max(2, hr * 0.1);
  g.lineCap = 'round';
  g.beginPath();
  g.arc(hx, hy, hr * 0.55, Math.PI / 2 - grin, Math.PI / 2 + grin);
  g.stroke();
  for (const s of [-1, 1]) {
    glow(g, hx + s * hr * 0.32, hy - hr * 0.2, hr * 0.22, '#ffe890', 0.8);
    g.fillStyle = '#fff8d0';
    g.beginPath();
    g.arc(hx + s * hr * 0.32, hy - hr * 0.2, hr * (0.07 + 0.03 * (1 - u)), 0, TAU);
    g.fill();
  }
  // (the portal's ring of light round its rim, its dashes spinning, fast in a drop)
  const spin = t * 0.4 + (f.look.sceneAt?.(t)?.kind === 'drop' ? t * 2.5 : 0);
  g.strokeStyle = rgba('#ffe890', 0.85);
  g.lineWidth = Math.max(2, hr * 0.07);
  for (let k = 0; k < 8; k++) {
    g.beginPath();
    g.arc(hx, hy, hr * 1.12, spin + (k * TAU) / 8, spin + (k * TAU) / 8 + 0.4);
    g.stroke();
  }
  g.lineCap = 'butt';
  // (on a drop the red car takes off from the road below and flies up into the hole ("Притопил"), a trail of
  // sparks behind it)
  const since = t - (mf.dropT ?? -9),
    bar = 4 * f.L.A.beat;
  if (since >= 0 && since < bar * 1.5) {
    const q = since / (bar * 1.5),
      e = q * q * (3 - 2 * q),
      x = v.W * 0.05 + (hx - v.W * 0.05) * e,
      y = v.H * 0.85 + (hy - v.H * 0.85) * e - Math.sin(e * Math.PI) * v.H * 0.15,
      sc = S * 0.05 * (1 - 0.7 * e);
    for (let k = 1; k < 8; k++) {
      const e2 = Math.max(0, e - k * 0.03);
      glowDot(g, v.W * 0.05 + (hx - v.W * 0.05) * e2, v.H * 0.85 + (hy - v.H * 0.85) * e2 - Math.sin(e2 * Math.PI) * v.H * 0.15, sc * 0.4, k % 2 ? '#ffe890' : '#ff8a5a', 0.6 * (1 - k / 8));
    }
    g.fillStyle = CAR;
    g.beginPath();
    g.moveTo(x - sc, y);
    g.lineTo(x - sc * 0.9, y - sc * 0.3);
    g.lineTo(x - sc * 0.3, y - sc * 0.35);
    g.lineTo(x - sc * 0.1, y - sc * 0.6);
    g.lineTo(x + sc * 0.4, y - sc * 0.6);
    g.lineTo(x + sc * 0.7, y - sc * 0.3);
    g.lineTo(x + sc, y - sc * 0.25);
    g.lineTo(x + sc, y);
    g.fill();
    g.fillStyle = '#1a1a20';
    for (const d of [-0.6, 0.6]) {
      g.beginPath();
      g.arc(x + d * sc, y, sc * 0.2, 0, TAU);
      g.fill();
    }
  }
  // (clouds drifting across)
  for (let i = 0; i < 5; i++) {
    const w = S * (0.25 + 0.2 * hash(i, 41)),
      x = ((hash(i, 42) * (v.W + w) + t * v.dpr * (6 + 5 * hash(i, 43))) % (v.W + w * 1.5)) - w * 0.75,
      y = v.H * (0.08 + 0.3 * hash(i, 44));
    // (puffing up a little on the bass)
    cloud(g, x, y, w * (1 + 0.04 * eased(f, 'B', mf.bass)), 0.9);
  }
}

// ---- the far rows: green hills to the sea, a road winding down them, the rollers breaking
function far(f) {
  const { g, v, mf, T, t } = f,
    r0 = row(f, 0.12),
    r = { ...r0, base: r0.base - lift(f, 0.16) },
    m = v.ppm,
    sea = mixHex(SEA, T.far, 0.25),
    hill = mixHex(LETTUCE, T.far, 0.3),
    hill2 = mixHex('#4aa83a', T.far, 0.35);
  // (the sea on the horizon, its rollers' white crests breaking on the kick)
  g.fillStyle = sea;
  g.fillRect(r.L, r.base - 1.6 * m, r.R - r.L, 4 * m);
  // (the crests on the sea's own row, rolling in along it: passed by the camera at the sea's distance, not slid across
  // the screen; breaking higher on the kick through a springy mass, physics.js)
  g.fillStyle = rgba(FOAM, 0.5 + 0.4 * mf.kick);
  const roll = (t * 1.6) % 4,
    crest = 0.08 * m * Math.max(0.4, 1 + 0.8 * eased(f, 'Ks', mf.kick));
  for (let xr = Math.floor(r.x0 / 4) * 4 - 4 - roll; xr < r.x1 + 4; xr += 4) {
    const x = r.X(xr);
    g.fillRect(x, r.base - 1.6 * m + 0.1 * m * Math.sin(xr * 0.75 + t), 1.4 * m, crest);
  }
  cells(r, 11, (i, X, u) => {
    // (a hill folding down to the sea, a road winding down it in loops)
    const h = (3 + 3 * u) * m,
      w = (5 + 2 * u) * m;
    g.fillStyle = i % 2 ? hill : hill2;
    g.beginPath();
    g.moveTo(X - w, r.base);
    g.quadraticCurveTo(X - w * 0.3, r.base - h * 1.4, X + w * 0.2, r.base - h);
    g.quadraticCurveTo(X + w * 0.8, r.base - h * 0.6, X + w * 1.2, r.base);
    g.fill();
    if (u > 0.4) {
      g.strokeStyle = rgba('#f0e8d8', 0.75);
      g.lineWidth = Math.max(1, 0.12 * m);
      g.beginPath();
      g.moveTo(X + w * 0.1, r.base - h * 0.95);
      for (let k = 1; k <= 4; k++) g.lineTo(X + (k % 2 ? w * 0.6 : -w * 0.3) * (1 - k * 0.12), r.base - h * (0.95 - k * 0.22));
      g.stroke();
    }
  });
}

// ---- the near rows: the wheat in waves, poppies, sunflowers turning to the sun on the beat, a billboard gone wild
// with flowers and a fuel pump grown over (lifted over the roofs: a phone's horizon sits under them)
const lift = (f, k) => Math.max(1.2 * f.v.ppm, k * f.v.H);
// (a sunflower as tall as a lamp post: its stalk and leaves, its face of seeds in a ring of petals, lit by the sun)
const sunflowerPic = (m, stalk, petal) =>
  still(`lm-sunfl|${stalk}|${petal}`, m, 3, 7, 1.5, 6.8, (g, s) => {
    g.strokeStyle = stalk;
    g.lineWidth = Math.max(1, 0.14 * s);
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(-0.3 * s, -3 * s, 0, -5.4 * s);
    g.stroke();
    g.fillStyle = stalk;
    g.beginPath();
    for (const [y, sd] of [[-1.8, -1], [-3.2, 1]]) {
      g.moveTo(0, y * s);
      g.quadraticCurveTo(sd * 0.9 * s, (y - 0.7) * s, sd * 1.3 * s, (y - 0.1) * s);
      g.quadraticCurveTo(sd * 0.7 * s, (y + 0.2) * s, 0, y * s);
    }
    g.fill();
    const cy = -5.6 * s;
    g.fillStyle = petal;
    g.beginPath();
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU;
      g.moveTo(Math.cos(a - 0.12) * 0.45 * s, cy + Math.sin(a - 0.12) * 0.45 * s);
      g.lineTo(Math.cos(a) * 1.05 * s, cy + Math.sin(a) * 1.05 * s);
      g.lineTo(Math.cos(a + 0.12) * 0.45 * s, cy + Math.sin(a + 0.12) * 0.45 * s);
    }
    g.fill();
    const gr = g.createRadialGradient(-0.12 * s, cy - 0.12 * s, 0, 0, cy, 0.55 * s);
    gr.addColorStop(0, '#8a5a1a');
    gr.addColorStop(1, '#2a1a0a');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(0, cy, 0.5 * s, 0, TAU);
    g.fill();
  });
// (a billboard gone wild: nothing on it but the flowers grown over it; a fuel pump of a gas station long left, grown
// over with ivy)
const signPic = (m, kind, panel, leaf, pump) =>
  still(`lm-sign|${kind}|${panel}|${leaf}|${pump}`, m, 3.6, 5.2, 0.4, 5, (g, s) => {
    if (kind === 0) {
      g.fillStyle = '#6a6a70';
      g.fillRect(0.2 * s, -3 * s, 0.1 * s, 3 * s);
      g.fillRect(2.2 * s, -3 * s, 0.1 * s, 3 * s);
      g.fillStyle = vgrad(g, -4.6 * s, -2.9 * s, [[0, mixHex(panel, '#ffffff', 0.3)], [1, mixHex(panel, '#000000', 0.15)]]);
      g.fillRect(-0.2 * s, -4.6 * s, 2.9 * s, 1.7 * s);
      for (let k = 0; k < 18; k++) {
        const fx = -0.1 * s + hash(k, 20) * 2.7 * s,
          fy = -4.6 * s + hash(k, 40) ** 0.6 * 1.7 * s;
        g.fillStyle = leaf;
        g.beginPath();
        g.arc(fx, fy, 0.22 * s, 0, TAU);
        g.fill();
      }
      g.strokeStyle = leaf;
      g.lineWidth = Math.max(1, 0.08 * s);
      g.beginPath();
      for (const x of [0.25, 2.25]) {
        g.moveTo(x * s, 0);
        for (let k = 1; k < 8; k++) g.lineTo((x + (k % 2 ? 0.2 : -0.15)) * s, -k * 0.38 * s);
      }
      g.stroke();
    } else {
      g.fillStyle = vgrad(g, -2 * s, 0, [[0, mixHex(pump, '#ffffff', 0.2)], [1, mixHex(pump, '#000000', 0.25)]]);
      g.fillRect(0, -2 * s, 0.9 * s, 2 * s);
      g.fillStyle = '#f0ece0';
      g.fillRect(0.15 * s, -1.7 * s, 0.6 * s, 0.45 * s);
      g.strokeStyle = '#2a2a2e';
      g.lineWidth = Math.max(1, 0.06 * s);
      g.beginPath();
      g.moveTo(0.9 * s, -1.2 * s);
      g.quadraticCurveTo(1.5 * s, -0.6 * s, 1.1 * s, -0.3 * s);
      g.stroke();
      g.strokeStyle = leaf;
      g.lineWidth = Math.max(1, 0.1 * s);
      g.beginPath();
      g.moveTo(0, 0);
      for (let k = 1; k < 7; k++) g.lineTo((k % 2 ? 0.7 : 0.15) * s, -k * 0.32 * s);
      g.stroke();
    }
  });
function near(f) {
  const { g, v, mf, t } = f,
    P = steady(f),
    r0 = row(f, 0.4),
    r = { ...r0, base: r0.base - lift(f, 0.12) },
    m = v.ppm,
    n = Math.floor(t / f.L.A.beat),
    wheat = mixHex(WHEAT, P.near, 0.25),
    dark = mixHex('#b08020', P.near, 0.35);
  // (the field: a band of gold, its ears in rows swaying in a wave that runs along it on the bass; the stalks in one
  // path, the ears in another)
  g.fillStyle = vgrad(g, r.base - 0.9 * m, r.base + 3 * m, [[0, dark], [1, mixHex(dark, '#000000', 0.35)]]);
  g.fillRect(r.L, r.base - 0.9 * m, r.R - r.L, 4 * m);
  const step = 0.22,
    i0 = Math.floor(r.x0 / step),
    i1 = r.x1 / step + 1;
  g.strokeStyle = wheat;
  g.lineWidth = Math.max(1, 0.05 * m);
  g.beginPath();
  for (let i = i0; i < i1; i++) {
    const X = r.X(i * step),
      h = (1.3 + 0.5 * hash(i, 3)) * m,
      sw = (Math.sin(t * 1.6 - i * 0.18) * 0.18 + 0.15 * lean(f, i * step)) * m;
    g.moveTo(X, r.base);
    g.quadraticCurveTo(X, r.base - h * 0.6, X + sw, r.base - h);
  }
  g.stroke();
  g.fillStyle = mixHex(wheat, '#fff4c0', 0.15 + 0.3 * mf.kick);
  g.beginPath();
  for (let i = i0; i < i1; i++) {
    const X = r.X(i * step),
      h = (1.3 + 0.5 * hash(i, 3)) * m,
      sw = (Math.sin(t * 1.6 - i * 0.18) * 0.18 + 0.15 * lean(f, i * step)) * m;
    g.moveTo(X + sw + 0.07 * m, r.base - h);
    g.ellipse(X + sw, r.base - h, 0.07 * m, 0.2 * m, sw / m, 0, TAU);
  }
  g.fill();
  // (poppies in it, nodding on the beat: their petals in one path, their hearts in another)
  const pops = [];
  cells(r, 2.7, (i, X, u) => {
    if (u < 0.3) for (let k = 0; k < 3; k++) pops.push(X + k * 0.4 * m, r.base - (1.1 + 0.3 * hash(i, k)) * m + 0.06 * m * mf.beat);
  });
  g.fillStyle = POPPY;
  g.beginPath();
  for (let k = 0; k < pops.length; k += 2) {
    g.moveTo(pops[k] + 0.17 * m, pops[k + 1]);
    g.arc(pops[k], pops[k + 1], 0.17 * m, 0, TAU);
  }
  g.fill();
  g.fillStyle = '#1a0a0a';
  g.beginPath();
  for (let k = 0; k < pops.length; k += 2) {
    g.moveTo(pops[k] + 0.05 * m, pops[k + 1]);
    g.arc(pops[k], pops[k + 1], 0.05 * m, 0, TAU);
  }
  g.fill();
  const stalk = mixHex('#3a7a2a', P.near, 0.3),
    petal = mixHex('#ffd23a', P.near, 0.1);
  cells(r, 2.7, (i, X, u) => {
    if (u > 0.9) {
      // (a billboard gone wild, or a fuel pump grown over with its little lamp lit on the beat)
      stamp(g, signPic(m, i % 2 ? 0 : 1, mixHex('#f0ece0', P.near, 0.15), mixHex(LETTUCE, P.near, 0.2), mixHex('#e8302a', P.near, 0.2)), X, r.base, m);
      if (i % 2) for (let k = 0; k < 14; k += 3) {
        const fx = X - 0.1 * m + hash(i, k + 20) * 2.7 * m,
          fy = r.base - 4.6 * m + hash(i, k + 40) ** 0.6 * 1.7 * m;
        glowDot(g, fx, fy - 0.05 * m, (0.14 + 0.08 * mf.beat) * m, k % 2 ? POPPY : '#ffe060', 1);
      }
      else glow(g, X + 0.45 * m, r.base - 2.2 * m, 0.5 * m, '#fff0a0', 0.3 + 0.6 * mf.beat);
    } else if (u > 0.55 && u < 0.75) {
      // (a sunflower, its face turning to the sun a step on each beat and back, swaying on the bass)
      // (turning over the first third of each beat, not snapping; bobbing on the kick through a springy mass, its width
      // giving as it stretches: physics.js)
      const ks = eased(f, 'Ks', mf.kick),
        nb = t / f.L.A.beat,
        turn = 0.12 * Math.sin((n + Math.min(1, (nb - Math.floor(nb)) * 3) + i) * 0.9) + 0.03 * ks;
      stamp(g, sunflowerPic(m, stalk, petal), X + 1.3 * m, r.base, m, 0, turn + 0.02 * lean(f, i * 2.7), 1 - 0.015 * ks, 1 + 0.03 * ks);
    }
  });
}

export const LANDMARKS = {
  // the serpentine: a mountain with a road winding down it in hairpins to the sea, a little red car going down it
  serpentine(f) {
    const { g, v, mf, T, t } = f;
    mark(f, 0.07, 56, 0.8, 61, (X, B, up) => {
      const m = v.ppm * 0.9,
        H = 13 * m,
        W = 11 * m,
        body = mixHex('#5aa83a', T.far, 0.3);
      g.fillStyle = body;
      g.beginPath();
      g.moveTo(X - W, B + up);
      g.quadraticCurveTo(X - W * 0.4, B - H, X, B - H);
      g.quadraticCurveTo(X + W * 0.5, B - H, X + W * 1.2, B + up);
      g.fill();
      g.fillStyle = rgba('#ffffff', 0.12);
      g.beginPath();
      g.moveTo(X - W * 0.2, B - H * 0.95);
      g.quadraticCurveTo(X - W * 0.5, B - H * 0.3, X - W * 0.9, B + up);
      g.lineTo(X - W, B + up);
      g.quadraticCurveTo(X - W * 0.4, B - H, X, B - H);
      g.fill();
      // (the road: hairpins down from the top; the car's way along it)
      const pts = [];
      for (let k = 0; k <= 6; k++) pts.push([X + (k % 2 ? 0.55 : -0.45) * W * (0.2 + (k / 6) * 0.75), B - H * 0.92 + (k / 6) * (H * 0.92 + up * 0.8)]);
      g.strokeStyle = '#3a3a40';
      g.lineWidth = Math.max(2, 0.45 * m);
      g.lineJoin = 'round';
      g.beginPath();
      pts.forEach(([x, y]) => g.lineTo(x, y));
      g.stroke();
      g.strokeStyle = rgba('#ffffff', 0.7);
      g.lineWidth = Math.max(1, 0.06 * m);
      g.setLineDash([0.4 * m, 0.4 * m]);
      g.stroke();
      g.setLineDash([]);
      g.lineJoin = 'miter';
      const q = (((t * 0.05) % 1) + 1) % 1,
        seg = Math.min(5, Math.floor(q * 6)),
        w = q * 6 - seg,
        cx = pts[seg][0] + (pts[seg + 1][0] - pts[seg][0]) * w,
        cy = pts[seg][1] + (pts[seg + 1][1] - pts[seg][1]) * w;
      g.fillStyle = CAR;
      g.fillRect(cx - 0.5 * m, cy - 0.45 * m, 1 * m, 0.4 * m);
      glow(g, cx, cy - 0.25 * m, 0.8 * m, '#fff0a0', 0.2 + 0.4 * mf.beat);
    });
  },
  // a throne on a green hill, as big as a house, a fur coat thrown over its back, the sun glinting off its gold on the
  // beat: the emperor of the planet's (nobody in it)
  throne(f) {
    const { g, v, mf } = f,
      P = steady(f);
    mark(f, 0.08, 50, 0.75, 63, (X, B, up) => {
      const m = v.ppm * 0.9,
        gold = mixHex('#f0b830', P.far, 0.2),
        velvet = mixHex('#c02040', P.far, 0.25),
        fur = mixHex('#e8d8c0', P.far, 0.2),
        hill = mixHex(LETTUCE, P.far, 0.35),
        c = still(`lm-throne|${gold}|${velvet}|${fur}|${hill}`, m, 19, 21, 9.5, 13, (g, s) => {
          g.fillStyle = vgrad(g, -3 * s, 8 * s, [[0, mixHex(hill, '#f4ffd0', 0.2)], [1, mixHex(hill, '#000000', 0.2)]]);
          g.beginPath();
          g.ellipse(0, 8 * s, 9 * s, 11 * s, 0, Math.PI, TAU);
          g.fill();
          const by = -3 * s,
            gg = g.createLinearGradient(-3.4 * s, 0, 3.4 * s, 0);
          gg.addColorStop(0, mixHex(gold, '#fff4c0', 0.5));
          gg.addColorStop(0.5, gold);
          gg.addColorStop(1, mixHex(gold, '#5a3a00', 0.45));
          // (its back, high and rounded, its seat, its arms, its legs)
          g.fillStyle = gg;
          g.beginPath();
          g.moveTo(-2.6 * s, by);
          g.lineTo(-2.6 * s, by - 6 * s);
          g.quadraticCurveTo(0, by - 9 * s, 2.6 * s, by - 6 * s);
          g.lineTo(2.6 * s, by);
          g.fill();
          g.fillStyle = vgrad(g, by - 8 * s, by, [[0, mixHex(velvet, '#ff8090', 0.25)], [1, mixHex(velvet, '#200008', 0.4)]]);
          g.beginPath();
          g.moveTo(-2 * s, by);
          g.lineTo(-2 * s, by - 5.6 * s);
          g.quadraticCurveTo(0, by - 8 * s, 2 * s, by - 5.6 * s);
          g.lineTo(2 * s, by);
          g.fill();
          g.fillStyle = gg;
          g.fillRect(-3.4 * s, by - 0.2 * s, 6.8 * s, 1.2 * s);
          g.fillRect(-3.4 * s, by - 2.4 * s, 0.8 * s, 2.4 * s);
          g.fillRect(2.6 * s, by - 2.4 * s, 0.8 * s, 2.4 * s);
          g.fillRect(-3 * s, by + 1, 0.6 * s, 3 * s);
          g.fillRect(2.4 * s, by + 1, 0.6 * s, 3 * s);
          // (the fur coat over its back and an arm, fluffy)
          g.fillStyle = fur;
          g.beginPath();
          g.moveTo(-2.8 * s, by - 6.6 * s);
          g.quadraticCurveTo(-0.5 * s, by - 7.5 * s, 1 * s, by - 6.8 * s);
          g.lineTo(1.5 * s, by - 2 * s);
          g.lineTo(-3.6 * s, by - 0.5 * s);
          g.fill();
          g.beginPath();
          for (let k = 0; k < 16; k++) {
            const x = -3.4 * s + hash(k, 7) * 4.6 * s,
              y = by - 6.8 * s + hash(k, 8) * 6 * s;
            g.moveTo(x + 0.35 * s, y);
            g.arc(x, y, 0.35 * s, 0, TAU);
          }
          g.fill();
          g.fillStyle = 'rgba(120,90,60,0.25)';
          g.beginPath();
          for (let k = 0; k < 16; k++) {
            const x = -3.4 * s + hash(k, 7) * 4.6 * s + 0.12 * s,
              y = by - 6.8 * s + hash(k, 8) * 6 * s + 0.12 * s;
            g.moveTo(x + 0.2 * s, y);
            g.arc(x, y, 0.2 * s, 0, TAU);
          }
          g.fill();
        }, 0.5);
      // (its fur shaking on the kick, the sun glinting off its gold on the beat)
      stamp(g, c, X, B + up * 0.2, m, 0, 0, 1 - 0.008 * eased(f, 'Ks', mf.kick), 1 + 0.015 * eased(f, 'Ks', mf.kick), up * 0.8 + 3 * m);
      const by = B + up * 0.2 - 3 * m;
      for (const [dx, dy] of GLINTS) glow(g, X + dx * m, by + dy * m, 0.8 * m, '#fff8c0', 0.3 + 0.6 * mf.beat);
    });
  },
  // a great wave curling over, its lip of foam throwing spray on the kick
  wave(f) {
    const { g, v, mf, T, t } = f;
    mark(f, 0.06, 52, 0.75, 67, (X, B, up) => {
      const m = v.ppm * 0.9,
        sea = mixHex(SEA, T.far, 0.2),
        deep = mixHex('#1a5a9a', T.far, 0.25),
        curl = 0.1 * Math.sin(t * 0.8);
      g.fillStyle = deep;
      g.beginPath();
      g.moveTo(X - 12 * m, B + up);
      g.quadraticCurveTo(X - 4 * m, B - 4 * m, X + 1 * m, B - 11 * m);
      g.quadraticCurveTo(X + 6 * m, B - (14 + curl * 10) * m, X + 8 * m, B - 8 * m);
      g.quadraticCurveTo(X + 5 * m, B - 10 * m, X + 4 * m, B - 6 * m);
      g.quadraticCurveTo(X + 5 * m, B, X + 10 * m, B + up);
      g.fill();
      g.fillStyle = sea;
      g.beginPath();
      g.moveTo(X - 12 * m, B + up);
      g.quadraticCurveTo(X - 4 * m, B - 3 * m, X + 1 * m, B - 9 * m);
      g.quadraticCurveTo(X, B - 3 * m, X + 2 * m, B + up);
      g.fill();
      g.strokeStyle = FOAM;
      g.lineWidth = Math.max(2, 0.5 * m);
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(X + 1 * m, B - 11 * m);
      g.quadraticCurveTo(X + 6 * m, B - (14 + curl * 10) * m, X + 8 * m, B - 8 * m);
      g.stroke();
      g.lineCap = 'butt';
      g.fillStyle = rgba(FOAM, 0.85);
      for (let k = 0; k < 10; k++) {
        const a = hash(k, 3) * Math.PI,
          d = (1 + 2 * eased(f, 'Sk', mf.kick)) * m * hash(k, 4);
        g.beginPath();
        g.arc(X + 8 * m + Math.cos(a) * d, B - 8 * m - Math.sin(a) * d, (0.15 + 0.2 * hash(k, 5)) * m, 0, TAU);
        g.fill();
      }
    });
  },
};

const GLINTS = [
  [0, -8.4],
  [-2.6, -6],
  [2.6, -6],
];
const VERGE = [
  [0, 0.6, '#4aa82a'],
  [0.6, 1, '#7ad04a'],
];

export default {
  sky,
  far,
  near,
  back(f) {
    for (const l of f.look.landmarks) LANDMARKS[l]?.(f);
    far(f);
    near(f);
  },
  // the empty highway: warm grey asphalt, a verge of grass and flowers on its top, its centre dashes lit on the kick
  ground(f, a, b, y) {
    const { g, v, mf } = f,
      s = slab(f, a, b, y, '#4a4a52', '#5ab83a');
    if (!s) return;
    const m = v.ppm,
      k0 = Math.floor(s.a / 0.3),
      k1 = s.b / 0.3;
    // (the verge: blades of grass along its top in two greens (a path each), flowers in it nodding on the beat)
    for (const [lo, hi, col] of VERGE) {
      g.fillStyle = col;
      g.beginPath();
      for (let k = k0; k < k1; k++) {
        const u = hash(k, 31);
        if (u < lo || u >= hi) continue;
        const X = v.sx(k * 0.3);
        g.moveTo(X, s.Y + 0.2 * m);
        g.lineTo(X + 0.08 * m + 0.03 * m * mf.bass, s.Y - (0.1 + 0.15 * u) * m);
        g.lineTo(X + 0.16 * m, s.Y + 0.2 * m);
      }
      g.fill();
    }
    for (const [c, col] of [[0, '#fff4a0'], [1, '#ffffff']]) {
      g.fillStyle = col;
      g.beginPath();
      for (let k = k0; k < k1; k++) {
        if (hash(k, 31) <= 0.9 || ((k % 2) + 2) % 2 !== c) continue;
        const X = v.sx(k * 0.3) + 0.08 * m,
          Y = s.Y - (0.12 + 0.04 * mf.beat) * m;
        g.moveTo(X + 0.07 * m, Y);
        g.arc(X, Y, 0.07 * m, 0, TAU);
      }
      g.fill();
    }
    g.fillStyle = rgba('#fff0a0', 0.55 + 0.45 * mf.kick);
    for (let k = Math.floor(s.a / 1.6); k < s.b / 1.6; k++) g.fillRect(v.sx(k * 1.6), s.Y + 1.1 * m, 0.9 * m, 0.12 * m);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(s.X0, s.Y + 0.38 * m, s.X1 - s.X0, 0.05 * m);
    g.fillRect(s.X0, s.Y + 1.9 * m, s.X1 - s.X0, 0.05 * m);
    edge(f, s, '#ffe070');
  },
  // the pictures painted while the song loads, in its palette and its drop's (world/render.js warmWorld)
  warm(f) {
    const { v } = f,
      P = steady(f),
      S = Math.min(v.W, v.H);
    for (let w = S * 0.25; w <= S * 0.47; w *= 1.15) cloudPic(sizeStep(w));
    for (const m of [v.ppm, v.ppm * 0.8]) {
      sunflowerPic(m, mixHex('#3a7a2a', P.near, 0.3), mixHex('#ffd23a', P.near, 0.1));
      for (let k = 0; k < 2; k++) signPic(m, k, mixHex('#f0ece0', P.near, 0.15), mixHex(LETTUCE, P.near, 0.2), mixHex('#e8302a', P.near, 0.2));
    }
  },
};
