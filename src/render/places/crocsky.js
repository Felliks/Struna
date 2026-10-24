// The Swallowed Sky, «Крокодил проглотил небо» (after ATL's "Крокодил": a gloomy crocodile swallowed the sky and the
// stars, "Sun, come out!", the Nile, a pyramid of a tower, a colourful clearing; "Марабу": the marabou leading the way
// down the jungle path; "Шаман": diving into aquamarine skies like monochrome orcas, the drum, fly agarics luring into
// the woods; "Водяной": the swamp, mushroom rain; world/artists.js): a jungle delta under a sky that is the inside of
// a colossal crocodile. Its upper jaw spans the top of the screen, green and scaled, a row of teeth along it and a great
// yellow eye blinking on the beat; the stars it swallowed glitter in its throat; in a drop it opens its jaws wide and
// the sun bursts out of it, flooding the sky with light. Orcas in black and white swim through a band of aquamarine sky,
// leaping on the beat. Far off the delta: still water with the sky in it, papyrus in clumps nodding on the bass, giant
// fly agarics glowing in the swamp, marabou storks standing on one leg; near, mangrove roots in arches, mossy logs and
// fern; underfoot a boardwalk of planks over the dark water, lily pads by it, ripples on the kick. Landmarks: a step
// pyramid as tall as a tower, its windows lit in turn on the beat; a grove of giant glowing fly agarics, their spots
// pulsing; a hut on stilts with a lantern swinging.
import { glowDot, hash, mixHex, rgba } from '../util.js';
import { cells, edge, glow, landmark, pic, row, sizeStep, slab, stamp, steady, still, vgrad } from './kit.js';

const TAU = Math.PI * 2,
  CROC = '#2a5a2a',
  CROC2 = '#3a7a34',
  TOOTH = '#f4f0dc',
  EYE = '#ffd23a',
  AQUA = '#4ae0d0',
  AGARIC = '#e8202a',
  PAPYRUS = '#5aa83a',
  WATER = '#0e2a2e';

const beatOf = f => {
  const b = f.t / f.L.A.beat;
  return { n: Math.floor(b), u: b - Math.floor(b) };
};
function mark(f, par, every, chance, salt, draw) {
  const up = Math.max(1.6 * f.v.ppm, 0.2 * f.v.H);
  landmark(f, par, every, chance, salt, (X, base, i) => draw(X, base - up, up, i));
}
// how wide the crocodile's jaws are open: shut but for a drop, opening wide over two beats of one
const jawOpen = f => {
  const sc = f.look.sceneAt?.(f.t);
  if (!sc || sc.kind !== 'drop') return 0;
  const u = Math.min(1, (f.t - sc.t0) / (2 * f.L.A.beat));
  return u * u * (3 - 2 * u);
};

// ---- the sky: the crocodile's upper jaw, the stars in its throat, the sun bursting out, the orcas
function orca(g, X, Y, L, dir, a) {
  const L0 = sizeStep(L),
    c = pic(`cr-orca|${L0}`, L0 * 1.3, L0 * 0.7, (x, w, h) => {
      x.translate(w * 0.5, h * 0.62);
      const L = L0;
      x.fillStyle = '#0c0c10';
      x.beginPath();
      x.moveTo(L * 0.5, 0);
      x.quadraticCurveTo(L * 0.4, -L * 0.2, 0, -L * 0.18);
      x.quadraticCurveTo(-L * 0.35, -L * 0.15, -L * 0.5, -L * 0.02);
      x.lineTo(-L * 0.62, -L * 0.14);
      x.lineTo(-L * 0.6, L * 0.08);
      x.lineTo(-L * 0.5, L * 0.03);
      x.quadraticCurveTo(0, L * 0.16, L * 0.5, 0);
      x.moveTo(-L * 0.02, -L * 0.17);
      x.lineTo(-L * 0.1, -L * 0.42);
      x.lineTo(-L * 0.2, -L * 0.15);
      x.fill();
      x.fillStyle = '#f4f4f0';
      x.beginPath();
      x.ellipse(L * 0.28, -L * 0.07, L * 0.07, L * 0.03, -0.2, 0, TAU);
      x.ellipse(L * 0.1, L * 0.06, L * 0.25, L * 0.04, 0.05, 0, TAU);
      x.fill();
      // (a sheen along its back)
      x.strokeStyle = 'rgba(160,240,230,0.35)';
      x.lineWidth = Math.max(1, L * 0.02);
      x.beginPath();
      x.moveTo(L * 0.4, -L * 0.12);
      x.quadraticCurveTo(L * 0.1, -L * 0.2, -L * 0.3, -L * 0.13);
      x.stroke();
    }),
    k = L / L0;
  g.save();
  g.translate(X, Y);
  g.scale(dir, 1);
  g.rotate(a);
  g.drawImage(c, -c.width * 0.5 * k, -c.height * 0.62 * k, c.width * k, c.height * k);
  g.restore();
}
function sky(f) {
  const { g, v, t, mf } = f,
    S = Math.min(v.W, v.H),
    open = jawOpen(f),
    { u, n } = beatOf(f);
  // (the stars it swallowed, glittering in its throat on the hats; fading as the sun comes out)
  // (in four brightnesses, a style each: the twinkle of each star picks which)
  if (open < 0.99)
    for (let b = 0; b < 4; b++) {
      g.fillStyle = rgba('#fff8e0', (0.3 + 0.5 * ((b + 0.5) / 4) * (0.6 + 0.4 * mf.hat)) * (1 - open));
      for (let i = 0; i < 60; i++) {
        const tw = 0.5 + 0.5 * Math.sin(t * (2 + hash(i, 83) * 3) + i);
        if (Math.min(3, Math.floor(tw * 4)) !== b) continue;
        const x = hash(i, 81) * v.W,
          y = v.H * (0.05 + 0.4 * hash(i, 82)),
          sz = (1 + 1.5 * hash(i, 84)) * v.dpr * (1 + 0.6 * mf.hat * (b / 3));
        g.fillRect(x - sz / 2, y - sz / 2, sz, sz);
      }
    }
  // (the sun bursting out of it in a drop, rays turning)
  if (open > 0.01) {
    const sx = v.W * 0.5,
      sy = v.H * 0.2,
      R = S * 0.12 * open * (1 + 0.05 * mf.kick);
    glow(g, sx, sy, R * 7, '#fff0a0', 0.55 * open);
    g.fillStyle = rgba('#fff4c0', 0.45 * open);
    g.beginPath();
    for (let k = 0; k < 16; k++) {
      const a = t * 0.3 + (k * TAU) / 16;
      g.moveTo(sx, sy);
      g.lineTo(sx + Math.cos(a - 0.06) * R * 6, sy + Math.sin(a - 0.06) * R * 6);
      g.lineTo(sx + Math.cos(a + 0.06) * R * 6, sy + Math.sin(a + 0.06) * R * 6);
    }
    g.fill();
    g.fillStyle = '#fff8d8';
    g.beginPath();
    g.arc(sx, sy, R, 0, TAU);
    g.fill();
  }
  // (the band of aquamarine sky the orcas swim in, leaping on the beat; only in ATL's own songs ("Шаман"'s orcas): in
  // any other song (a guest here, artists.js, or this sky in a composed world) they would be fish in the sky for no
  // reason)
  const by = v.H * 0.5,
    orcas = f.L?.dress?.pack === 'atl' && !f.L.dress.guest ? 3 : 0;
  glow(g, v.W * 0.5, by, v.W * 0.6, AQUA, 0.18);
  for (let i = 0; i < orcas; i++) {
    const L = S * (0.09 + 0.03 * i),
      per = 14 + 4 * i,
      q = ((t + i * 5) % per) / per,
      dir = i % 2 ? -1 : 1,
      x = dir > 0 ? -L + q * (v.W + 2 * L) : v.W + L - q * (v.W + 2 * L),
      leap = Math.sin((n + u + i) * Math.PI * 0.5),
      y = by + (i - 1) * S * 0.08 - Math.abs(leap) * S * 0.04 * (1 + mf.beat);
    orca(g, x, y, L, dir, -0.25 * leap * dir);
  }
  // (the upper jaw: a long green snout across the top, lifting out of sight as it opens, its scales, its teeth along
  // its edge, its eye blinking on the beat, its nostrils at the end)
  const lift = open * v.H * 0.32,
    jy = v.H * 0.2 - lift,
    jaw = mixHex(CROC, '#000000', 0.15);
  g.fillStyle = jaw;
  g.beginPath();
  g.moveTo(-10, -10);
  g.lineTo(v.W + 10, -10);
  g.lineTo(v.W + 10, jy - S * 0.02);
  g.quadraticCurveTo(v.W * 0.5, jy + S * 0.05, -10, jy);
  g.fill();
  g.fillStyle = rgba(CROC2, 0.9);
  g.beginPath();
  for (let k = 0; k < 16; k++) {
    const x = (k + 0.5) * (v.W / 16),
      y = jy * 0.5 + Math.sin(k * 1.7) * S * 0.02;
    g.moveTo(x + v.W / 40, y);
    g.ellipse(x, y, v.W / 40, S * 0.025, 0, 0, TAU);
  }
  g.fill();
  // (its scales' rims lit on the beat, a ripple along them)
  g.strokeStyle = rgba('#8aff9a', 0.12 + 0.3 * mf.beat);
  g.lineWidth = Math.max(1, S * 0.004);
  g.stroke();
  g.fillStyle = TOOTH;
  const nT = 18;
  g.beginPath();
  for (let k = 0; k < nT; k++) {
    const x = (k + 0.5) * (v.W / nT),
      y = jy + S * 0.02 * Math.sin((x / v.W) * Math.PI),
      h = S * (0.03 + 0.015 * (k % 2)) * (1 + 0.15 * mf.kick);
    g.moveTo(x - S * 0.012, y - 2);
    g.lineTo(x, y + h);
    g.lineTo(x + S * 0.012, y - 2);
  }
  g.fill();
  const ex = v.W * 0.82,
    ey = jy - S * 0.07,
    blink = n % 8 === 0 ? Math.max(0.1, Math.abs(1 - 2 * u)) : 1;
  g.fillStyle = jaw;
  g.beginPath();
  g.ellipse(ex, ey, S * 0.07, S * 0.06, 0, Math.PI, TAU);
  g.fill();
  g.fillStyle = EYE;
  g.beginPath();
  g.ellipse(ex, ey, S * 0.045, S * 0.035 * blink, 0, 0, TAU);
  g.fill();
  g.fillStyle = '#1a1a10';
  g.beginPath();
  g.ellipse(ex, ey, S * 0.008, S * 0.03 * blink, 0, 0, TAU);
  g.fill();
  glow(g, ex, ey, S * 0.06, EYE, 0.25 + 0.3 * mf.beat);
  for (const d of [0.03, 0.06]) {
    g.fillStyle = '#0e1a0e';
    g.beginPath();
    g.ellipse(v.W * d * 2, jy - S * 0.03, S * 0.012, S * 0.007, 0, 0, TAU);
    g.fill();
  }
}

// ---- the far rows: the delta, papyrus, agarics glowing, marabou standing
// how far the rows stand up off the horizon (a phone's horizon sits low, under the roofs)
const lift = (f, k) => Math.max(1.2 * f.v.ppm, k * f.v.H);
function far(f) {
  const { g, v, mf, T, t } = f,
    r0 = row(f, 0.12),
    r = { ...r0, base: r0.base - lift(f, 0.16) },
    m = v.ppm,
    water = mixHex(WATER, T.far, 0.35),
    pap = mixHex(PAPYRUS, T.far, 0.35),
    bank = mixHex('#1a3a1a', T.far, 0.35);
  g.fillStyle = water;
  g.fillRect(r.L, r.base - 1.4 * m, r.R - r.L, 4 * m);
  g.fillStyle = rgba(T.sky[2], 0.25);
  for (let k = 0; k < 6; k++) g.fillRect(r.L, r.base - (1.2 - k * 0.22) * m, r.R - r.L, 0.05 * m * (1 + mf.kick));
  const papyrus = [];
  cells(r, 4.6, (i, X, u) => {
    // (a bank of the delta: a low island, a clump of papyrus on it, its heads nodding on the bass)
    g.fillStyle = bank;
    g.beginPath();
    g.ellipse(X + 2 * m, r.base - 1.3 * m, 2.6 * m, 0.6 * m, 0, Math.PI, TAU);
    g.fill();
    for (let k = 0; k < 5; k++) papyrus.push(X + (1 + k * 0.45) * m, (2.5 + 1.2 * hash(i, k)) * m, Math.sin(t * 1.1 + k + i) * (0.2 + 0.3 * mf.bass) * m);
    if (u < 0.35) {
      // (a fly agaric glowing in the swamp, its spots pulsing on the beat)
      const ax = X + 3.6 * m,
        ay = r.base - 1.4 * m,
        R = (0.8 + 0.4 * u) * m;
      glow(g, ax, ay - 1.3 * m, R * 2.5, AGARIC, 0.15 + 0.2 * mf.beat);
      g.fillStyle = mixHex('#f4ecd8', T.far, 0.2);
      g.fillRect(ax - 0.15 * m, ay - 1.2 * m, 0.3 * m, 1.2 * m);
      g.fillStyle = mixHex(AGARIC, T.far, 0.15);
      g.beginPath();
      g.ellipse(ax, ay - 1.2 * m, R, R * 0.65, 0, Math.PI, TAU);
      g.fill();
      g.fillStyle = rgba('#ffffff', 0.7 + 0.3 * mf.beat);
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        g.arc(ax + (k - 1.5) * R * 0.4, ay - 1.2 * m - R * (0.3 + 0.15 * (k % 2)), R * 0.1, 0, TAU);
        g.fill();
      }
    } else if (u > 0.8) {
      // (a marabou standing on one leg in the shallows, its bill down, its head turning on the beat)
      const mx = X + 3.4 * m,
        my = r.base - 1.4 * m,
        look = beatOf(f).n % 4 < 2 ? 1 : -1;
      g.strokeStyle = '#d8d0c0';
      g.lineWidth = Math.max(1, 0.06 * m);
      g.beginPath();
      g.moveTo(mx, my);
      g.lineTo(mx, my - 1.4 * m);
      g.stroke();
      g.fillStyle = '#1a1a20';
      g.beginPath();
      g.ellipse(mx, my - 1.9 * m, 0.55 * m, 0.4 * m, -0.2, 0, TAU);
      g.fill();
      g.fillStyle = '#f0ece4';
      g.beginPath();
      g.arc(mx + look * 0.3 * m, my - 2.35 * m, 0.18 * m, 0, TAU);
      g.fill();
      g.fillStyle = '#e88a7a';
      g.beginPath();
      g.arc(mx + look * 0.35 * m, my - 2.55 * m, 0.16 * m, 0, TAU);
      g.fill();
      g.fillStyle = '#c8b890';
      g.beginPath();
      g.moveTo(mx + look * 0.45 * m, my - 2.6 * m);
      g.lineTo(mx + look * 1.3 * m, my - 2.2 * m);
      g.lineTo(mx + look * 0.45 * m, my - 2.45 * m);
      g.fill();
    }
  });
  // (the papyrus: its stems in one path, its heads in another, nodding on the bass)
  g.strokeStyle = pap;
  g.lineWidth = Math.max(1, 0.07 * m);
  g.beginPath();
  for (let k = 0; k < papyrus.length; k += 3) {
    const x = papyrus[k],
      h = papyrus[k + 1],
      sw = papyrus[k + 2],
      y = r.base - 1.4 * m;
    g.moveTo(x, y);
    g.quadraticCurveTo(x, y - h * 0.6, x + sw, y - h);
  }
  g.stroke();
  g.fillStyle = pap;
  g.beginPath();
  for (let k = 0; k < papyrus.length; k += 3) {
    const x = papyrus[k] + papyrus[k + 2],
      y = r.base - 1.4 * m - papyrus[k + 1];
    g.moveTo(x, y);
    for (let q = 0; q < 5; q++) {
      const a = -Math.PI / 2 + (q - 2) * 0.45;
      g.lineTo(x + Math.cos(a) * 0.5 * m, y + Math.sin(a) * 0.5 * m);
      g.lineTo(x, y);
    }
  }
  g.fill();
}

// ---- the near rows: a bank of the swamp lifted over the roofs (a phone's horizon sits under them), mangroves standing
// on their cages of arched roots with crowns of moss, lianas hanging off them swaying on the bass, fireflies on the hats,
// mossy logs with fern
// (a mangrove: a trunk on a cage of arched roots, its crown of moss in clumps lit from above, painted once)
const mangrovePic = (m, sz, root, moss) =>
  still(`cr-mangrove|${sz}|${root}|${moss}`, m, 6, 9, 2.5, 8.8, (g, s) => {
    const h = (3.4 + 2 * sz) * s;
    g.strokeStyle = root;
    g.lineWidth = Math.max(1, 0.16 * s);
    g.beginPath();
    for (let k = -3; k <= 3; k++) {
      g.moveTo(0, -1.4 * s);
      g.quadraticCurveTo(k * 0.5 * s, -1.8 * s, k * 0.75 * s, 0);
    }
    g.stroke();
    g.fillStyle = vgrad(g, -h, 0, [[0, mixHex(root, '#000000', 0.2)], [1, root]]);
    g.beginPath();
    g.moveTo(-0.22 * s, -1.2 * s);
    g.quadraticCurveTo(-0.1 * s, -h * 0.6, -0.15 * s, -h);
    g.lineTo(0.15 * s, -h);
    g.quadraticCurveTo(0.2 * s, -h * 0.6, 0.22 * s, -1.2 * s);
    g.fill();
    for (const [col, dy] of [[mixHex(moss, '#000000', 0.35), 0.15], [moss, 0]]) {
      g.fillStyle = col;
      g.beginPath();
      for (let k = 0; k < 9; k++) {
        const x = (-1.35 + 0.34 * k) * s,
          y = -h - (0.2 + 0.35 * Math.sin(k * 2.1 + 1)) * s + dy * s,
          R = (0.45 + 0.18 * hash(k, 3)) * s;
        g.moveTo(x + R, y);
        g.arc(x, y, R, 0, TAU);
      }
      g.fill();
    }
    g.fillStyle = 'rgba(220,255,160,0.25)';
    g.beginPath();
    for (let k = 0; k < 9; k += 2) {
      const x = (-1.35 + 0.34 * k) * s - 0.15 * s,
        y = -h - (0.2 + 0.35 * Math.sin(k * 2.1 + 1)) * s - 0.2 * s;
      g.moveTo(x + 0.2 * s, y);
      g.arc(x, y, 0.2 * s, 0, TAU);
    }
    g.fill();
  });
function near(f) {
  const { g, v, mf, t } = f,
    P = steady(f),
    r0 = row(f, 0.4),
    r = { ...r0, base: r0.base - lift(f, 0.12) },
    m = v.ppm,
    root = mixHex('#3a2a1c', P.near, 0.4),
    moss = mixHex('#1e5a26', P.near, 0.45),
    lianas = [];
  // (the bank, the water's sheen along its edge on the kick)
  g.fillStyle = mixHex(WATER, P.near, 0.3);
  g.fillRect(r.L, r.base, r.R - r.L, 5 * m);
  g.fillStyle = rgba(AQUA, 0.2 + 0.3 * mf.kick);
  g.fillRect(r.L, r.base, r.R - r.L, 0.05 * m);
  cells(r, 3.2, (i, X, u) => {
    if (u < 0.35) {
      const sz = Math.floor(hash(i, 3) * 3) / 2,
        h = (3.4 + 2 * sz) * m,
        lean = Math.sin(t * 0.7 + i) * 0.012 * (0.5 + mf.bass);
      stamp(g, mangrovePic(m, sz, root, moss), X + 1.5 * m, r.base, m, 0, lean, 1, 1 + 0.02 * mf.kick);
      // (lianas off its crown, swaying on the bass)
      for (let k = 0; k < 3; k++) lianas.push(X + (0.6 + 0.8 * k) * m - lean * h, r.base - h + 0.2 * m, (1.8 + 1.4 * hash(i, k + 7)) * m, Math.sin(t * 1.3 + i + k) * (0.2 + 0.4 * mf.bass) * m);
    } else if (u < 0.7) {
      // (a mossy log, a fern out of it)
      g.fillStyle = root;
      g.beginPath();
      g.ellipse(X + 1.5 * m, r.base - 0.3 * m, 1.4 * m, 0.35 * m, 0, 0, TAU);
      g.fill();
      g.fillStyle = moss;
      g.beginPath();
      g.ellipse(X + 1.4 * m, r.base - 0.55 * m, 1.1 * m, 0.15 * m, 0, 0, TAU);
      g.fill();
      g.strokeStyle = moss;
      g.lineWidth = Math.max(1, 0.05 * m);
      g.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k - 2) * 0.45 + Math.sin(t + k) * 0.05 + 0.08 * mf.beat * (k - 2);
        g.moveTo(X + 2.2 * m, r.base - 0.5 * m);
        g.quadraticCurveTo(X + 2.2 * m + Math.cos(a) * 0.6 * m, r.base - 0.5 * m + Math.sin(a) * 1.2 * m, X + 2.2 * m + Math.cos(a) * 1.2 * m, r.base - 0.5 * m + Math.sin(a) * 1.1 * m);
      }
      g.stroke();
    }
  });
  if (lianas.length) {
    g.strokeStyle = mixHex(moss, '#000000', 0.3);
    g.lineWidth = Math.max(1, 0.06 * m);
    g.beginPath();
    for (let k = 0; k < lianas.length; k += 4) {
      const x = lianas[k],
        y = lianas[k + 1],
        L = lianas[k + 2],
        sw = lianas[k + 3];
      g.moveTo(x, y);
      g.quadraticCurveTo(x + sw * 0.5, y + L * 0.6, x + sw, y + L);
    }
    g.stroke();
  }
  // (fireflies drifting in the swamp's air, flaring on the hats)
  for (let k = 0; k < 10; k++) {
    // (across the row's frame, kit.js row)
    const x = r.L + ((((hash(k, 31) * v.W - r.x0 * m * 0.4 + Math.sin(t * 0.5 + k) * 2 * m) % (r.R - r.L)) + (r.R - r.L)) % (r.R - r.L)),
      y = r.base - (1 + 4 * hash(k, 32)) * m + Math.sin(t * 1.1 + k * 2) * 0.5 * m;
    glowDot(g, x, y, (0.12 + 0.2 * mf.hat) * m, '#e8ff8a', 0.4 + 0.6 * mf.hat * hash(k, Math.floor(t * 4)));
  }
}

export const LANDMARKS = {
  // a step pyramid as tall as a tower out of the jungle, its stepped tiers, its windows lit in turn on the beat, a beam
  // of light up off its top in a drop
  pyramid(f) {
    const { g, v, mf, T } = f;
    mark(f, 0.06, 56, 0.8, 81, (X, B, up) => {
      const m = v.ppm * 0.9,
        n = beatOf(f).n,
        stone = mixHex('#a08a5a', T.far, 0.4),
        tiers = 7;
      if (mf.drop > 0) {
        g.fillStyle = rgba('#fff0a0', 0.35 * mf.drop);
        g.beginPath();
        g.moveTo(X - 0.8 * m, B - tiers * 2 * m);
        g.lineTo(X - 3 * m, -10);
        g.lineTo(X + 3 * m, -10);
        g.lineTo(X + 0.8 * m, B - tiers * 2 * m);
        g.fill();
      }
      for (let k = 0; k < tiers; k++) {
        const w = (10 - k * 1.3) * m,
          y = B + up - (k + 1) * 2 * m - (k === 0 ? 0 : 0);
        g.fillStyle = mixHex(stone, '#000000', k % 2 ? 0.08 : 0);
        g.fillRect(X - w / 2, y, w, 2 * m + (k === 0 ? up : 0));
        for (let q = 0; q < 4; q++) {
          const on = (k + q + n) % 5 === 0;
          g.fillStyle = on ? rgba('#ffe080', 0.6 + 0.4 * mf.beat) : 'rgba(30,20,10,0.45)';
          g.fillRect(X - w / 2 + (q + 0.5) * (w / 4) - 0.2 * m, y + 0.6 * m, 0.4 * m, 0.7 * m);
        }
      }
      g.fillStyle = mixHex('#3a8a3a', T.far, 0.35);
      for (let k = 0; k < 8; k++) {
        g.beginPath();
        g.arc(X + (hash(k, 3) - 0.5) * 9 * m, B + up - hash(k, 4) * 6 * m, 0.6 * m, 0, TAU);
        g.fill();
      }
    });
  },
  // a grove of giant fly agarics glowing in the swamp, their spots pulsing on the beat, spores puffing off on the kick
  agarics(f) {
    const { g, v, mf, T, t } = f;
    mark(f, 0.08, 46, 0.75, 83, (X, B, up) => {
      const m = v.ppm * 0.9;
      for (let k = 0; k < 3; k++) {
        const x = X + (k - 1) * 4.5 * m,
          h = (7 + 3 * (k === 1)) * m,
          R = (2.6 + 1.2 * (k === 1)) * m,
          y = B + up;
        glow(g, x, y - h, R * 2.2, AGARIC, 0.15 + 0.25 * mf.beat);
        g.fillStyle = mixHex('#f4ecd8', T.far, 0.25);
        g.beginPath();
        g.moveTo(x - 0.5 * m, y);
        g.quadraticCurveTo(x - 0.3 * m, y - h * 0.6, x - 0.4 * m, y - h);
        g.lineTo(x + 0.4 * m, y - h);
        g.quadraticCurveTo(x + 0.3 * m, y - h * 0.6, x + 0.5 * m, y);
        g.fill();
        g.fillStyle = mixHex(AGARIC, T.far, 0.15);
        g.beginPath();
        g.ellipse(x, y - h, R, R * 0.6, 0, Math.PI, TAU);
        g.fill();
        g.fillStyle = rgba('#ffffff', 0.75 + 0.25 * mf.beat);
        for (let q = 0; q < 6; q++) {
          const a = Math.PI + ((q + 0.5) / 6) * Math.PI;
          g.beginPath();
          g.arc(x + Math.cos(a) * R * 0.6, y - h + Math.sin(a) * R * 0.35, R * 0.1 * (1 + 0.2 * mf.beat), 0, TAU);
          g.fill();
        }
        if (mf.kick > 0.2)
          for (let q = 0; q < 6; q++) {
            const u = (t * 0.6 + q / 6) % 1;
            glowDot(g, x + (hash(q, k) - 0.5) * R * 2, y - h - u * 3 * m, 0.15 * m, '#ffe0a0', (1 - u) * mf.kick);
          }
      }
    });
  },
  // a hut on stilts over the water, its thatch, a lantern under its eaves swinging, lit on the beat
  stilthut(f) {
    const { g, v, mf, T, t } = f;
    mark(f, 0.08, 50, 0.75, 85, (X, B, up) => {
      const m = v.ppm * 0.9,
        wood = mixHex('#6a4a2a', T.far, 0.3),
        thatch = mixHex('#c8a050', T.far, 0.3),
        y = B + up * 0.5 - 4 * m;
      g.strokeStyle = wood;
      g.lineWidth = Math.max(1, 0.25 * m);
      g.beginPath();
      for (const d of [-2, -0.7, 0.7, 2]) {
        g.moveTo(X + d * m, B + up);
        g.lineTo(X + d * m * 0.9, y);
      }
      g.stroke();
      g.fillStyle = wood;
      g.fillRect(X - 2.6 * m, y - 3 * m, 5.2 * m, 3 * m);
      g.fillStyle = 'rgba(20,10,5,0.6)';
      g.fillRect(X - 0.5 * m, y - 2.2 * m, 1 * m, 1.6 * m);
      g.fillStyle = thatch;
      g.beginPath();
      g.moveTo(X - 3.6 * m, y - 2.6 * m);
      g.lineTo(X, y - 6 * m);
      g.lineTo(X + 3.6 * m, y - 2.6 * m);
      g.fill();
      const sw = 0.3 * Math.sin(t * 2),
        lx = X + 2.8 * m + Math.sin(sw) * 0.8 * m,
        ly = y - 1.8 * m;
      g.strokeStyle = wood;
      g.lineWidth = Math.max(1, 0.05 * m);
      g.beginPath();
      g.moveTo(X + 2.8 * m, y - 2.6 * m);
      g.lineTo(lx, ly);
      g.stroke();
      glow(g, lx, ly, 1.2 * m, '#ffc040', 0.4 + 0.5 * mf.beat);
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
  // a boardwalk of planks over the dark water: lily pads by it, ripples going out on the kick
  ground(f, a, b, y) {
    const { g, v, mf } = f,
      s = slab(f, a, b, y, WATER, '#8a6a3a');
    if (!s) return;
    const m = v.ppm;
    for (let k = Math.floor(s.a / 0.5); k < s.b / 0.5; k++) {
      const X = v.sx(k * 0.5);
      g.fillStyle = k % 3 ? '#7a5a32' : '#6a4a28';
      g.fillRect(X + 1, s.Y, 0.5 * m - 2, 0.32 * m);
    }
    for (let k = Math.floor(s.a / 1.5); k < s.b / 1.5; k++) {
      const X = v.sx(k * 1.5),
        u = hash(k, 61);
      g.strokeStyle = rgba('#8ae0d0', 0.15 + 0.35 * mf.kick);
      g.lineWidth = Math.max(1, 0.03 * m);
      g.beginPath();
      g.ellipse(X + 0.7 * m, s.Y + (0.9 + 1.2 * u) * m, (0.3 + 0.4 * mf.kick) * m, 0.08 * m, 0, 0, TAU);
      g.stroke();
      if (u > 0.55) {
        g.fillStyle = '#3a9a4a';
        g.beginPath();
        g.ellipse(X + 0.4 * m, s.Y + (0.6 + 0.8 * u) * m, 0.35 * m, 0.1 * m, 0, 0.3, TAU);
        g.lineTo(X + 0.4 * m, s.Y + (0.6 + 0.8 * u) * m);
        g.fill();
        if (u > 0.85) {
          g.fillStyle = '#ff9ad0';
          g.beginPath();
          g.arc(X + 0.4 * m, s.Y + (0.55 + 0.8 * u) * m, 0.08 * m, 0, TAU);
          g.fill();
        }
      }
    }
    edge(f, s, AQUA);
  },
  // the pictures painted while the song loads, in its palette and its drop's (world/render.js warmWorld)
  warm(f) {
    const { v } = f,
      P = steady(f),
      S = Math.min(v.W, v.H);
    for (let i = 0; i < 3; i++) orca(f.g, -9999, -9999, S * (0.09 + 0.03 * i), 1, 0);
    for (const m of [v.ppm, v.ppm * 0.8]) for (let sz = 0; sz <= 1; sz += 0.5) mangrovePic(m, sz, mixHex('#3a2a1c', P.near, 0.4), mixHex('#1e5a26', P.near, 0.45));
  },
};
