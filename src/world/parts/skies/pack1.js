// (a pack of parts: see registry.js)
// Twelve pieces of sky, each a whole sky of its own in place of the plain sun and moon: drawn right after the sky's
// gradient, behind everything, in screen space, in the song's palette, and every one of them plays the music (swelling
// with the bass, flaring on the kick, twinkling on the hats, glowing with the voice).
import { registerPart } from '../../registry.js';
import { glow } from '../../../render/places/kit.js';
import { hash, mixHex, rgba } from '../../../render/util.js';
import { eased } from '../../../render/physics.js';

const TAU = Math.PI * 2;

// how dark the hour is, 0..1 (space and the deep count as night)
const darkOf = f => {
  const { look } = f;
  if (look.time === 'space' || look.time === 'deep') return 1;
  return look.night ?? (look.time === 'night' ? 1 : 0);
};
// a hex colour (or an rgb() one), as rgba with alpha a
const rgbaAny = (c, a) => {
  if (c[0] === '#') return rgba(c, a);
  return c.replace('rgb(', 'rgba(').replace(')', `,${Math.max(0, Math.min(1, a))})`);
};
// (two hex colours mixed, as hex)
const mix = (a, b, u) => mixHex(a, b, u);
function disc(g, X, Y, r) {
  g.beginPath();
  g.arc(X, Y, r, 0, TAU);
}
// a field of stars in a box, the brightest twinkling on the hats
function stars(f, n, salt, x0, y0, w, h, a) {
  const { g, v, mf, t } = f,
    a0 = g.globalAlpha;
  g.fillStyle = '#ffffff';
  for (let i = 0; i < n; i++) {
    const s = hash(i, salt + 2),
      tw = 0.65 + 0.35 * Math.sin(t * (1.3 + 3 * s) + i * 1.7),
      al = a * (0.35 + 0.65 * s) * tw + (i % 4 === 0 ? a * 0.5 * mf.hat : 0),
      sz = (s > 0.85 ? 2.6 : s > 0.5 ? 1.8 : 1.2) * v.dpr,
      X = x0 + hash(i, salt) * w,
      Y = y0 + hash(i, salt + 1) * h;
    g.globalAlpha = a0 * Math.min(1, al);
    g.fillRect(X - sz / 2, Y - sz / 2, sz, sz);
    // (the brightest with a little glow)
    if (s > 0.94) {
      g.globalAlpha = a0;
      glow(g, X, Y, 6 * v.dpr * (1 + mf.hat), '#ffffff', 0.35 * al);
      g.fillStyle = '#ffffff';
    }
  }
  g.globalAlpha = a0;
}
// a star with diffraction spikes
function spikeStar(g, X, Y, len, col, a, lw) {
  glow(g, X, Y, len * 0.6, col, a * 0.6);
  g.strokeStyle = rgbaAny(col, a);
  g.lineWidth = lw;
  g.beginPath();
  g.moveTo(X - len, Y);
  g.lineTo(X + len, Y);
  g.moveTo(X, Y - len);
  g.lineTo(X, Y + len);
  g.stroke();
}
// a moon at a phase (lit 0..1: new .. full), its lit side turned `rot` from the right, with craters and earthshine
function phaseMoon(g, X, Y, r, lit, rot, col, dark, salt) {
  g.save();
  g.translate(X, Y);
  g.rotate(rot);
  // (the dark side, faintly lit by earthshine)
  g.fillStyle = dark;
  disc(g, 0, 0, r);
  g.fill();
  const rx = r * Math.abs(1 - 2 * lit);
  g.beginPath();
  g.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
  if (lit > 0.5) g.ellipse(0, 0, Math.max(0.1, rx), r, 0, Math.PI / 2, (3 * Math.PI) / 2, false);
  else g.ellipse(0, 0, Math.max(0.1, rx), r, 0, Math.PI / 2, -Math.PI / 2, true);
  g.closePath();
  g.fillStyle = col;
  g.fill();
  // (its seas and craters, over both sides)
  g.save();
  disc(g, 0, 0, r);
  g.clip();
  for (let k = 0; k < 7; k++) {
    const a = hash(k, salt) * TAU,
      d = Math.sqrt(hash(k, salt + 1)) * r * 0.8,
      cr = r * (0.08 + 0.2 * hash(k, salt + 2));
    g.fillStyle = 'rgba(0,0,0,0.14)';
    disc(g, Math.cos(a) * d, Math.sin(a) * d, cr);
    g.fill();
  }
  // (the limb darkened, so it reads as a ball)
  const sh = g.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.2, 0, 0, r * 1.05);
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = sh;
  g.fillRect(-r, -r, 2 * r, 2 * r);
  g.restore();
  g.restore();
}

// 1. A ringed gas giant: banded, its bands drifting, a storm in them; its rings passing behind it and before it (the
// near half drawn after the planet), with a gap in them and the ring's shadow across the planet; two moons going round
// it, behind it and in front. It swells with the bass, the rings flash on the kick and glint on the hats.
function gasGiant(f) {
  const { g, v, mf, T, t } = f,
    // (a planet hardly swells: the bass through its spring, physics.js, never in a frame)
    R = v.H * 0.16 * (1 + 0.03 * eased(f, 'B', mf.bass)),
    X = v.W * 0.7,
    Y = v.H * 0.3,
    tilt = -0.32,
    light = mix(T.win[0], T.sky[2], 0.35),
    body = mix(T.far, T.win[1], 0.45),
    deep = mix(body, '#000000', 0.35),
    ringC = mix(T.win[0], '#ffffff', 0.35),
    dark = darkOf(f),
    // (its night side as black as space only at night: by day the day's air lights it)
    nd = 0.45 + 0.55 * dark;
  stars(f, 50 * dark, 19, 0, 0, v.W, v.H * 0.6, 0.6);
  glow(g, X, Y, R * 2.6, T.sky[2], 0.3 + 0.2 * mf.voice);
  // the rings: dense thin rings making one band, a dark gap in it, brighter on the kick
  const ring = front => {
    g.save();
    g.translate(X, Y);
    g.rotate(tilt);
    const a0 = front ? 0 : Math.PI,
      a1 = front ? Math.PI : TAU,
      n = 34;
    g.lineWidth = (R * 1.0) / n + 0.5;
    for (let i = 0; i < n; i++) {
      const u = i / n,
        rr = R * (1.3 + u * 1.0),
        gap = u > 0.62 && u < 0.68;
      if (gap) continue;
      const dens = 0.25 + 0.45 * hash(i, 3) * (1 - 0.6 * u) + (u < 0.15 ? -0.15 : 0);
      g.strokeStyle = rgbaAny(i % 5 === 2 ? light : ringC, dens * (0.8 + 0.45 * mf.kick));
      g.beginPath();
      g.ellipse(0, 0, rr, rr * 0.22, 0, a0, a1);
      g.stroke();
    }
    // (glints running along the near rings on the hats)
    if (front) {
      for (let k = 0; k < 5; k++) {
        const a = ((t * 0.07 + k / 5) % 1) * Math.PI,
          rr = R * (1.45 + 0.6 * hash(k, 9));
        glow(g, Math.cos(a) * rr, Math.sin(a) * rr * 0.22, R * 0.1, '#ffffff', 0.1 + 0.6 * mf.hat);
      }
    }
    g.restore();
  };
  // the moons: where each is on its orbit, and whether it is behind
  const moons = [0, 1].map(k => {
    const a = t * (0.045 + 0.03 * k) + k * 2.4,
      ox = Math.cos(a) * R * (2.7 + 0.8 * k),
      oy = Math.sin(a) * R * (0.55 + 0.2 * k);
    return { X: X + ox * Math.cos(tilt) - oy * Math.sin(tilt), Y: Y + ox * Math.sin(tilt) + oy * Math.cos(tilt), r: R * (0.12 - 0.05 * k), back: Math.sin(a) < 0, k };
  });
  const moon = m => {
    glow(g, m.X, m.Y, m.r * 3, light, 0.25);
    phaseMoon(g, m.X, m.Y, m.r, 0.72, Math.PI * 1.2, mix(light, '#ffffff', 0.45), rgba(mix(T.far, '#000000', 0.4), 0.95), 40 + m.k);
  };
  moons.filter(m => m.back).forEach(moon);
  ring(false);
  // the planet: its bands as one gradient of many stops, turbulence along them, its storm, its night side
  g.save();
  disc(g, X, Y, R);
  g.clip();
  g.translate(X, Y);
  g.rotate(tilt);
  const bg = g.createLinearGradient(0, -R, 0, R);
  for (let k = 0; k <= 18; k++) {
    const u = hash(k, 8),
      c = k === 9 ? light : u < 0.35 ? deep : u < 0.7 ? body : mix(body, light, 0.6);
    bg.addColorStop(k / 18, c);
  }
  g.fillStyle = bg;
  g.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
  // (eddies along the band edges, drifting each band its own way)
  for (let k = 1; k < 18; k++) {
    const y0 = -R + (k / 18) * 2 * R;
    g.fillStyle = rgbaAny(k % 2 ? light : deep, 0.22);
    g.beginPath();
    for (let s = 0; s < 4; s++) {
      const sx = ((((hash(k, s + 20) * 2.4 + t * 0.015 * (k % 2 ? 1 : -1)) % 2.4) + 2.4) % 2.4) * R - R * 1.2,
        ex = R * (0.08 + 0.12 * hash(k, s));
      g.moveTo(sx + ex, y0);
      g.ellipse(sx, y0, ex, R * 0.018, 0, 0, TAU);
    }
    g.fill();
  }
  // (the great storm, its eye pulsing with the bass)
  const sx = (((t * 0.012) % 1.6) - 0.5) * R;
  g.fillStyle = rgbaAny(mix(T.win[1], '#ffffff', 0.2), 0.85);
  g.beginPath();
  g.ellipse(sx, R * 0.36, R * 0.17, R * 0.085, 0, 0, TAU);
  g.fill();
  g.fillStyle = rgbaAny(mix(T.win[1], '#000000', 0.2), 0.5 + 0.3 * mf.bass);
  g.beginPath();
  g.ellipse(sx, R * 0.36, R * 0.08, R * 0.04, 0, 0, TAU);
  g.fill();
  // (the ring's shadow on the planet)
  g.strokeStyle = 'rgba(0,0,0,0.4)';
  g.lineWidth = R * 0.14;
  g.beginPath();
  g.ellipse(0, -R * 0.12, R * 1.75, R * 0.36, 0, Math.PI * 1.1, Math.PI * 1.9);
  g.stroke();
  g.restore();
  // (the night side, the light from the upper left)
  const sh = g.createRadialGradient(X - R * 0.5, Y - R * 0.5, R * 0.1, X - R * 0.3, Y - R * 0.3, R * 1.5);
  sh.addColorStop(0, 'rgba(255,255,255,0.18)');
  sh.addColorStop(0.35, 'rgba(0,0,0,0)');
  sh.addColorStop(0.75, `rgba(0,0,0,${0.6 * nd})`);
  sh.addColorStop(1, `rgba(0,0,0,${0.92 * nd})`);
  g.fillStyle = sh;
  disc(g, X, Y, R);
  g.fill();
  // (and by day the sky's haze over it, a world seen far off through the air)
  if (dark < 1) {
    g.fillStyle = rgba(T.sky[2], 0.22 * (1 - dark));
    g.fill();
  }
  // (the lit limb, glowing with the voice)
  g.strokeStyle = rgbaAny(mix(light, '#ffffff', 0.3), 0.4 + 0.45 * mf.voice);
  g.lineWidth = R * 0.025;
  g.beginPath();
  g.arc(X, Y, R * 0.99, Math.PI * 0.8, Math.PI * 1.7);
  g.stroke();
  ring(true);
  moons.filter(m => !m.back).forEach(moon);
}

// 2. A total eclipse: the moon's black disc, the corona's streamers round it (reaching further on the kick, slowly
// turning), prominences at the limb, Baily's beads flickering on the hats and the diamond ring on the downbeat.
function eclipse(f) {
  const { g, v, mf, T, t } = f,
    X = v.W * 0.66,
    Y = v.H * 0.28,
    R = v.H * 0.085 * (1 + 0.03 * eased(f, 'B', mf.bass)),
    white = mix('#ffffff', T.win[2], 0.2);
  // (the sky darkened round it, the stars out)
  const dk = g.createRadialGradient(X, Y, R, X, Y, v.W * 0.7);
  dk.addColorStop(0, rgba(mix(T.sky[0], '#000000', 0.5), 0.55));
  dk.addColorStop(1, rgba(mix(T.sky[0], '#000000', 0.5), 0));
  g.fillStyle = dk;
  g.fillRect(0, 0, v.W, v.H);
  stars(f, 50, 71, 0, 0, v.W, v.H * 0.6, 0.6);
  glow(g, X, Y, R * 6, T.win[0], 0.18 + 0.15 * mf.voice);
  glow(g, X, Y, R * 2.6, white, 0.45 + 0.3 * mf.kick);
  // the corona's streamers: thin curved petals, longer at the sun's equator
  const cg = g.createRadialGradient(X, Y, R * 0.9, X, Y, R * 5);
  cg.addColorStop(0, rgbaAny(white, 0.5));
  cg.addColorStop(0.3, rgbaAny(mix(white, T.win[0], 0.4), 0.16));
  cg.addColorStop(1, rgbaAny(T.win[0], 0));
  g.fillStyle = cg;
  g.globalCompositeOperation = 'lighter';
  g.beginPath();
  for (let i = 0; i < 70; i++) {
    const a = (i / 70) * TAU + hash(i, 5) * 0.1 + t * 0.012,
      eq = 0.45 + 0.55 * Math.abs(Math.cos(a - 0.3)),
      len = R * (0.6 + 3.2 * hash(i, 6) * eq) * (1 + 0.35 * mf.kick + 0.2 * mf.bass),
      w = 0.02 + 0.05 * hash(i, 7),
      bend = (hash(i, 8) - 0.5) * 0.3;
    g.moveTo(X + Math.cos(a - w) * R, Y + Math.sin(a - w) * R);
    g.quadraticCurveTo(X + Math.cos(a + bend) * (R + len * 0.55), Y + Math.sin(a + bend) * (R + len * 0.55), X + Math.cos(a + bend * 1.6) * (R + len), Y + Math.sin(a + bend * 1.6) * (R + len));
    g.quadraticCurveTo(X + Math.cos(a + bend + w) * (R + len * 0.5), Y + Math.sin(a + bend + w) * (R + len * 0.5), X + Math.cos(a + w) * R, Y + Math.sin(a + w) * R);
    // (in groups, so where streamers cross they add up)
    if (i % 10 === 9) {
      g.fill();
      g.beginPath();
    }
  }
  g.globalCompositeOperation = 'source-over';
  // (prominences: red loops standing on the limb)
  const prom = mix('#ff3d6e', T.win[0], 0.25);
  for (let k = 0; k < 4; k++) {
    const a = hash(k, 31) * TAU,
      h = R * (0.08 + 0.12 * hash(k, 32)) * (1 + 0.5 * mf.bass);
    g.strokeStyle = rgbaAny(prom, 0.85);
    g.lineWidth = R * 0.035;
    g.beginPath();
    g.arc(X + Math.cos(a) * R, Y + Math.sin(a) * R, h, a - Math.PI * 0.55, a + Math.PI * 0.55);
    g.stroke();
  }
  // the moon
  g.fillStyle = mix(T.sky[0], '#000000', 0.75);
  disc(g, X, Y, R);
  g.fill();
  g.strokeStyle = rgbaAny(white, 0.9);
  g.lineWidth = Math.max(1.5 * v.dpr, R * 0.025);
  g.stroke();
  // (Baily's beads on the hats, the diamond ring on the downbeat)
  for (let k = 0; k < 6; k++) {
    const a = -0.9 + k * 0.13;
    glow(g, X + Math.cos(a) * R, Y + Math.sin(a) * R, R * 0.12, '#ffffff', mf.hat * hash(k, Math.floor(t * 8)));
  }
  const dr = Math.max(mf.down, 0.15 * mf.kick);
  if (dr > 0.02) {
    const DX = X + Math.cos(-0.7) * R,
      DY = Y + Math.sin(-0.7) * R;
    glow(g, DX, DY, R * 1.2 * dr, '#ffffff', 0.9 * dr);
    spikeStar(g, DX, DY, R * 2 * dr, '#ffffff', 0.8 * dr, 1.5 * v.dpr);
  }
}

// 3. Three moons of different sizes, colours and phases, their phases turning slowly through the song, each with its
// halo (a big one low, a ringed small one high, a tiny one twinkling on the hats); they breathe with the voice.
function threeMoons(f) {
  const { g, v, mf, T, t } = f,
    dark = darkOf(f),
    a = 0.55 + 0.45 * dark,
    shade = rgba(mix(T.sky[0], '#9aa6c0', 0.18), 0.92);
  stars(f, 40 * dark, 23, 0, 0, v.W, v.H * 0.55, 0.7);
  const ms = [
    { X: v.W * 0.24, Y: v.H * 0.3, r: v.H * 0.12, col: mix('#f4eee0', T.sky[2], 0.2), lit: 0.62 + 0.3 * Math.sin(t * 0.02), rot: -0.5 },
    { X: v.W * 0.68, Y: v.H * 0.15, r: v.H * 0.055, col: mix(T.win[0], '#ffffff', 0.45), lit: 0.3 + 0.2 * Math.sin(t * 0.03 + 1), rot: Math.PI - 0.4 },
    { X: v.W * 0.85, Y: v.H * 0.34, r: v.H * 0.03, col: mix(T.line, '#ffffff', 0.55), lit: 0.85, rot: 0.3 },
  ];
  g.globalAlpha = a;
  ms.forEach((m, k) => {
    const sw = 1 + 0.04 * mf.voice + (k === 0 ? 0.03 * mf.bass : 0),
      r = m.r * sw;
    glow(g, m.X, m.Y, r * (2.6 + 1.2 * mf.voice), m.col, 0.22 + 0.2 * mf.voice + (k === 2 ? 0.4 * mf.hat : 0));
    phaseMoon(g, m.X, m.Y, r, m.lit, m.rot, m.col, shade, 60 + k * 9);
  });
  // (a thin ring round the middle moon, and a halo of ice round the big one)
  const m = ms[1];
  g.strokeStyle = rgbaAny(m.col, 0.55);
  g.lineWidth = 1.5 * v.dpr;
  g.beginPath();
  g.ellipse(m.X, m.Y, m.r * 2.1, m.r * 0.45, 0.25, Math.PI * 1.05, Math.PI * 1.95, true);
  g.stroke();
  g.strokeStyle = rgbaAny(ms[0].col, 0.04 + 0.08 * mf.voice);
  g.lineWidth = ms[0].r * 0.06;
  disc(g, ms[0].X, ms[0].Y, ms[0].r * 2.4);
  g.stroke();
  g.globalAlpha = 1;
}

// 4. A comet crossing the sky slowly through the song: its broad curved dust tail and its straight blue ion tail
// rippling with the voice, the coma round its head flaring on the kick, specks shed along the tail twinkling on the hats.
function comet(f) {
  const { g, v, mf, T, t } = f,
    p = ((t + 60) / 360) % 1,
    fade = Math.min(1, p / 0.06, (1 - p) / 0.06),
    X = v.W * (0.7 - 0.55 * p),
    Y = v.H * (0.34 + 0.08 * p),
    L = v.W * 0.6,
    ang = -0.24,
    dx = Math.cos(ang),
    dy = Math.sin(ang),
    nx = -dy,
    ny = dx,
    dust = mix(T.win[0], '#ffffff', 0.4),
    ion = mix(T.line, '#bfe8ff', 0.45),
    hr = v.H * 0.02 * (1 + 0.5 * mf.kick);
  stars(f, 70 * darkOf(f) + 10, 47, 0, 0, v.W, v.H * 0.6, 0.7);
  g.globalAlpha = fade;
  // the dust tail: a broad fan curving away (toward the bottom of the turn), bright at the head; soft ovals laid along
  // its curve, each wider and fainter than the one before, so it widens and fades with no edge anywhere
  const dg = g.createLinearGradient(X, Y, X + dx * L, Y + dy * L);
  dg.addColorStop(0, rgbaAny(dust, 0.85));
  dg.addColorStop(0.3, rgbaAny(dust, 0.35));
  dg.addColorStop(1, rgbaAny(dust, 0));
  const B = v.H * 0.12,
    P1x = X + dx * L * 0.45 + nx * B * 0.35,
    P1y = Y + dy * L * 0.45 + ny * B * 0.35,
    P2x = X + dx * L + nx * B,
    P2y = Y + dy * L + ny * B;
  for (let k = 0; k < 8; k++) {
    const s = 0.04 + (k / 8) * 0.9,
      cx = (1 - s) ** 2 * X + 2 * s * (1 - s) * P1x + s * s * P2x,
      cy = (1 - s) ** 2 * Y + 2 * s * (1 - s) * P1y + s * s * P2y,
      ta = Math.atan2((1 - s) * (P1y - Y) + s * (P2y - P1y), (1 - s) * (P1x - X) + s * (P2x - P1x)),
      rx = L * (0.1 + 0.16 * s),
      ry = v.H * (0.016 + 0.13 * s) * (1 + 0.15 * mf.bass),
      gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    gr.addColorStop(0, rgbaAny(dust, 0.85));
    gr.addColorStop(0.45, rgbaAny(dust, 0.35));
    gr.addColorStop(1, rgbaAny(dust, 0));
    g.save();
    g.translate(cx, cy);
    g.rotate(ta);
    g.scale(1, ry / rx);
    g.globalAlpha = fade * Math.min(1, 1.1 * (1 - s) ** 1.2 + 0.12);
    g.fillStyle = gr;
    g.fillRect(-rx, -rx, 2 * rx, 2 * rx);
    g.restore();
  }
  // (striations across the dust tail)
  g.strokeStyle = dg;
  g.lineWidth = 1.2 * v.dpr;
  for (let k = 0; k < 7; k++) {
    const bend = v.H * (0.02 + 0.03 * k),
      off = v.H * 0.015 * (k - 3);
    g.globalAlpha = fade * (0.06 + 0.12 * hash(k, 5));
    g.beginPath();
    g.moveTo(X, Y);
    g.quadraticCurveTo(X + dx * L * 0.45 + nx * (bend * 0.35 + off), Y + dy * L * 0.45 + ny * (bend * 0.35 + off), X + dx * L * 0.9 + nx * (bend + off * 2), Y + dy * L * 0.9 + ny * (bend + off * 2));
    g.stroke();
  }
  // the ion tail: straight blue streamers, rippling with the voice
  const ig = g.createLinearGradient(X, Y, X + dx * L * 1.3, Y + dy * L * 1.3);
  ig.addColorStop(0, rgbaAny(ion, 0.95));
  ig.addColorStop(0.5, rgbaAny(ion, 0.35));
  ig.addColorStop(1, rgbaAny(ion, 0));
  g.strokeStyle = ig;
  for (let k = 0; k < 7; k++) {
    g.globalAlpha = fade * (0.35 + 0.5 * hash(k, 3));
    g.lineWidth = (1 + 3 * hash(k, 4)) * v.dpr;
    g.beginPath();
    const off = (k - 3) * v.H * 0.004;
    for (let s = 0; s <= 28; s++) {
      const u = s / 28,
        wob = Math.sin(u * 10 - t * 2.4 + k) * v.H * 0.012 * u * (0.4 + mf.voice) + off * (1 + 6 * u) - v.H * 0.03 * u * u,
        px = X + dx * L * 1.3 * u + nx * wob,
        py = Y + dy * L * 1.3 * u + ny * wob;
      s ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.stroke();
  }
  // (specks shed along the dust tail, twinkling on the hats)
  for (let i = 0; i < 40; i++) {
    const u = (hash(i, 51) + t * 0.01) % 1,
      off = v.H * (0.01 + 0.15 * u * hash(i, 52)),
      px = X + dx * L * u + nx * off,
      py = Y + dy * L * u + ny * off;
    g.globalAlpha = fade * (1 - u) * (0.35 + 0.65 * (i % 3 ? mf.hat : 0.6));
    g.fillStyle = dust;
    g.fillRect(px, py, 2 * v.dpr, 2 * v.dpr);
  }
  g.globalAlpha = fade;
  // the coma and the nucleus, flaring on the kick
  glow(g, X, Y, v.H * 0.1 * (1 + 0.3 * mf.kick), ion, 0.45);
  glow(g, X, Y, hr * 3, '#ffffff', 0.95);
  spikeStar(g, X, Y, hr * (2.5 + 2 * mf.kick), '#ffffff', 0.6, 1.2 * v.dpr);
  g.fillStyle = '#ffffff';
  disc(g, X, Y, hr * 0.5);
  g.fill();
  g.globalAlpha = 1;
}

// 5. A black hole: the accretion disc's near half crossing in front of its shadow, its far half bent by the lensing
// into a halo over the top and under the bottom, a thin photon ring; the disc brighter on the side coming toward us,
// clumps streaming round it; the whole thing pulsing with the bass, the ring flaring on the kick.
function blackHole(f) {
  const { g, v, mf, T, t } = f,
    X = v.W * 0.68,
    Y = v.H * 0.3,
    Rs = v.H * 0.085 * (1 + 0.03 * eased(f, 'B', mf.bass)),
    tilt = -0.14,
    hot = mix('#fff1c9', T.win[0], 0.5),
    warm = mix(mix(T.win[1], T.win[0], 0.3), '#ff6a2a', 0.25);
  stars(f, 55, 83, 0, 0, v.W, v.H * 0.6, 0.6);
  glow(g, X, Y, Rs * 7, warm, 0.22 + 0.15 * mf.bass);
  // (the disc's colour: hot toward us on the left, dimmer and redder going away)
  const dg = g.createLinearGradient(X - Rs * 3.6, Y, X + Rs * 3.6, Y);
  dg.addColorStop(0, rgbaAny(hot, 1));
  dg.addColorStop(0.5, rgbaAny(mix(hot, warm, 0.4), 0.85));
  dg.addColorStop(1, rgbaAny(warm, 0.45));
  const discHalf = front => {
    g.save();
    g.translate(X, Y);
    g.rotate(tilt);
    g.strokeStyle = dg;
    for (let i = 0; i < 12; i++) {
      const rr = Rs * (1.45 + i * 0.17);
      g.globalAlpha = (1 - i / 13) ** 1.5 * (0.6 + 0.35 * mf.bass);
      g.lineWidth = Rs * 0.22;
      g.beginPath();
      g.ellipse(0, 0, rr, rr * 0.16, 0, front ? 0 : Math.PI, front ? Math.PI : TAU);
      g.stroke();
      // (clumps streaming round)
      g.globalAlpha *= 0.8;
      g.lineWidth = Rs * 0.07;
      g.setLineDash([Rs * (0.2 + 0.3 * hash(i, 2)), Rs * (0.3 + 0.5 * hash(i, 3))]);
      g.lineDashOffset = -t * Rs * (2.5 - i * 0.18);
      g.strokeStyle = rgbaAny('#ffffff', 0.7);
      g.stroke();
      g.setLineDash([]);
      g.strokeStyle = dg;
    }
    g.restore();
    g.globalAlpha = 1;
  };
  discHalf(false);
  // the far side of the disc, lensed into a halo round the shadow (wide over the top, thin under it)
  g.save();
  g.translate(X, Y);
  g.rotate(tilt);
  for (let i = 0; i < 8; i++) {
    const rr = Rs * (1.1 + i * 0.075);
    g.strokeStyle = dg;
    g.globalAlpha = (1 - i / 9) ** 1.4 * (0.7 + 0.3 * mf.bass);
    g.lineWidth = Rs * 0.16;
    g.beginPath();
    g.ellipse(0, -Rs * 0.05, rr, rr * 0.95, 0, Math.PI * 1.02, Math.PI * 1.98);
    g.stroke();
    if (i < 3) {
      g.globalAlpha *= 0.55;
      g.lineWidth = Rs * 0.06;
      g.beginPath();
      g.ellipse(0, Rs * 0.04, rr * 0.98, rr * 0.9, 0, Math.PI * 0.05, Math.PI * 0.95);
      g.stroke();
    }
  }
  g.restore();
  g.globalAlpha = 1;
  // the shadow and its photon ring
  g.fillStyle = '#000000';
  disc(g, X, Y, Rs);
  g.fill();
  g.strokeStyle = rgbaAny(hot, 0.65 + 0.35 * mf.kick);
  g.lineWidth = Rs * (0.04 + 0.05 * mf.kick);
  disc(g, X, Y, Rs * 1.04);
  g.stroke();
  discHalf(true);
  // (a jet up and down on the drop)
  if (mf.drop > 0) {
    const jg = g.createLinearGradient(X, Y - Rs * 6, X, Y + Rs * 6);
    jg.addColorStop(0, rgbaAny(T.line, 0));
    jg.addColorStop(0.5, rgbaAny(T.line, 0.5 * mf.drop * (0.5 + mf.kick)));
    jg.addColorStop(1, rgbaAny(T.line, 0));
    g.fillStyle = jg;
    g.fillRect(X - Rs * 0.06, Y - Rs * 6, Rs * 0.12, Rs * 12);
  }
}

// 6. A huge planet rising at the horizon, rising higher as the song grows: its atmosphere a bright rim along the limb
// (glowing with the voice), clouds and continents turning slowly, its cities lit in the dark below the rim (twinkling on
// the hats), a sunrise glint on the limb flaring on the kick.
function riser(f) {
  const { g, v, mf, T, t } = f,
    R = Math.max(v.W, v.H) * 1.1,
    rise = 0.5 + 0.1 * Math.min(1, t / 150) + 0.04 * (mf.stage ?? 0),
    cx = v.W * 0.42,
    cy = v.H * (1 - rise) + R,
    rim = mix(T.line, '#cfeeff', 0.45),
    land = mix(T.far, T.win[1], 0.35),
    sea = mix(T.far, T.sky[0], 0.45),
    cloud = mix('#ffffff', T.sky[2], 0.3),
    dark = darkOf(f),
    // (the angle of a screen x on the limb, for arcs that follow the planet's curve)
    at = x => Math.PI * 1.5 + Math.asin(Math.max(-1, Math.min(1, (x - cx) / R)));
  stars(f, 60 * darkOf(f) + 20, 91, 0, 0, v.W, v.H * (1 - rise), 0.7);
  // (the atmosphere's glow above the limb)
  const ag = g.createRadialGradient(cx, cy, R * 0.995, cx, cy, R * 1.08);
  ag.addColorStop(0, rgbaAny(rim, 0.7 + 0.3 * mf.voice));
  ag.addColorStop(0.2, rgbaAny(rim, 0.28 + 0.15 * mf.voice));
  ag.addColorStop(1, rgbaAny(rim, 0));
  g.fillStyle = ag;
  g.fillRect(0, cy - R * 1.1, v.W, v.H);
  g.save();
  disc(g, cx, cy, R);
  g.clip();
  const sg = g.createLinearGradient(0, cy - R, 0, cy - R + v.H * 0.5);
  sg.addColorStop(0, mix(sea, rim, 0.35));
  // (by day lit through the day's air, by night falling into the dark)
  sg.addColorStop(1, mix(mix(sea, '#000000', 0.5), T.sky[1], 0.45 * (1 - dark)));
  g.fillStyle = sg;
  g.fillRect(0, cy - R, v.W, v.H);
  // (cloud bands along the curve: soft, wide and faint, the whole turning slowly; and the airglow, a thin line of light
  // just inside the limb)
  const a0 = at(0) - 0.05,
    a1 = at(v.W) + 0.05;
  for (let k = 0; k < 14; k++) {
    const depth = hash(k, 12),
      d = R * (0.006 + 0.05 * depth * depth),
      span = 0.08 + 0.2 * hash(k, 13),
      wrap = a1 - a0 + 0.4,
      s0 = a0 - 0.2 + ((((hash(k, 11) * wrap + t * 0.0015 * (1 + depth)) % wrap) + wrap) % wrap);
    g.lineCap = 'round';
    for (const [lw, al] of [[3, 0.05], [1, 0.1]]) {
      g.strokeStyle = rgbaAny(k % 2 ? cloud : land, al * (1.4 - depth));
      g.lineWidth = R * (0.004 + 0.016 * depth) * lw;
      g.beginPath();
      g.arc(cx, cy, R - d, s0, s0 + span);
      g.stroke();
    }
  }
  g.lineCap = 'butt';
  g.strokeStyle = rgbaAny(mix('#7dffb8', rim, 0.5), 0.35 + 0.25 * mf.voice);
  g.lineWidth = 1.5 * v.dpr;
  g.beginPath();
  g.arc(cx, cy, R - 4 * v.dpr, a0, a1);
  g.stroke();
  // (deeper in, toward the night: darker)
  const sh = g.createRadialGradient(cx, cy, R * 0.9, cx, cy, R);
  sh.addColorStop(0, `rgba(0,0,0,${0.25 + 0.5 * dark})`);
  sh.addColorStop(0.7, `rgba(0,0,0,${0.1 + 0.2 * dark})`);
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sh;
  g.fillRect(0, cy - R, v.W, v.H * 2);
  // (by day the sky's own haze over it: far off, through the air)
  if (dark < 1) {
    g.fillStyle = rgba(T.sky[2], 0.3 * (1 - dark));
    g.fillRect(0, cy - R, v.W, v.H * 2);
  }
  // (its cities, lit in the dark, in clusters)
  for (let i = 0; i < 90; i++) {
    const c = Math.floor(i / 6),
      x = (hash(c, 14) + (hash(i, 17) - 0.5) * 0.04) * v.W,
      d = (0.035 + 0.06 * hash(c, 15) + (hash(i, 18) - 0.5) * 0.008) * R,
      a = at(x),
      px = cx + Math.cos(a) * (R - d),
      py = cy + Math.sin(a) * (R - d);
    g.fillStyle = T.win[i % 3];
    g.globalAlpha = Math.min(1, (0.45 + 0.5 * hash(i, 16)) * (i % 4 ? 0.8 : 0.4 + mf.hat) * (0.2 + 0.8 * dark));
    g.fillRect(px, py, 2 * v.dpr, 1.5 * v.dpr);
  }
  g.globalAlpha = 1;
  g.restore();
  // the rim itself
  g.strokeStyle = rgbaAny(mix(rim, '#ffffff', 0.5), 0.75 + 0.25 * mf.voice);
  g.lineWidth = 2 * v.dpr;
  g.beginPath();
  g.arc(cx, cy, R, a0, a1);
  g.stroke();
  // (the sun peeking over the limb, flaring on the kick)
  const ga = at(v.W * 0.72),
    GX = cx + Math.cos(ga) * R,
    GY = cy + Math.sin(ga) * R;
  glow(g, GX, GY, v.H * (0.12 + 0.06 * mf.kick), mix(T.win[0], '#ffffff', 0.4), 0.6 + 0.3 * mf.kick);
  g.fillStyle = rgbaAny(mix(rim, '#ffffff', 0.6), 0.35 + 0.3 * mf.kick);
  g.beginPath();
  g.ellipse(GX, GY, v.W * (0.12 + 0.1 * mf.kick), 1.5 * v.dpr, ga + Math.PI / 2, 0, TAU);
  g.fill();
  g.strokeStyle = rgbaAny(mix(rim, '#ffffff', 0.8), 0.7);
  g.lineWidth = 3 * v.dpr;
  g.beginPath();
  g.arc(cx, cy, R, ga - 0.08, ga + 0.08);
  g.stroke();
  spikeStar(g, GX, GY, v.H * 0.06 * (1 + mf.kick), '#ffffff', 0.75, 1.5 * v.dpr);
}

// the aurora's rays drawn once into a strip a little wider than the screen: three takes of the same rays (one above the
// other), each ray lit differently in each, every ray green at its foot (the strip's bottom) and violet at its tip, a
// soft glow along the foot; kept
// for the last few palettes (the colours rounded, so a palette sliding from one act's to the next's redraws it seldom)
const RAYS = new Map();
function raysOf(green, violet, v) {
  const q = c => '#' + c.slice(1).match(/../g).map(h => (Math.round(parseInt(h, 16) / 12) * 12).toString(16).padStart(2, '0').slice(-2)).join(''),
    gq = q(green),
    vq = q(violet),
    key = `${gq}${vq}${v.W}x${v.dpr}`;
  let R = RAYS.get(key);
  if (R) return R;
  const w = Math.ceil(v.W * 1.4),
    h = 128,
    // (a few empty rows between the takes, so a take stretched never shows the foot of the one above it)
    stride = h + 6,
    c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, stride * 3) : Object.assign(document.createElement('canvas'), { width: w, height: stride * 3 }),
    x = c.getContext('2d'),
    n = 230;
  for (let take = 0; take < 3; take++) {
    // (a soft glow along the arc's foot, just above it)
    const fy = take * stride + 3 + h,
      fg = x.createLinearGradient(0, fy - h * 0.2, 0, fy);
    fg.addColorStop(0, rgbaAny(gq, 0));
    fg.addColorStop(0.6, rgbaAny(gq, 0.2));
    fg.addColorStop(1, rgbaAny(gq, 0.06));
    x.globalAlpha = 1;
    x.fillStyle = fg;
    x.fillRect(0, fy - h * 0.2, w, h * 0.2);
    for (let i = 0; i < n; i++) {
      const px = (i / n) * w + hash(i, 100) * v.W * 0.008,
        rh = h * ((0.55 + 0.6 * hash(i, 110)) / 1.15),
        foot = take * stride + 3 + h,
        gr = x.createLinearGradient(0, foot, 0, foot - rh);
      gr.addColorStop(0, rgbaAny(mix(gq, '#ffffff', 0.35), 0.9));
      gr.addColorStop(0.12, rgbaAny(gq, 0.7));
      gr.addColorStop(0.55, rgbaAny(mix(gq, vq, 0.6), 0.35));
      gr.addColorStop(1, rgbaAny(vq, 0));
      x.globalAlpha = 0.25 + 0.75 * hash(i, 130 + take * 7);
      x.fillStyle = gr;
      x.fillRect(px, foot - rh, (3 + 7 * hash(i, 120)) * v.dpr, rh);
    }
  }
  R = { c, w, h, stride };
  RAYS.set(key, R);
  if (RAYS.size > 3) RAYS.delete(RAYS.keys().next().value);
  return R;
}

// 7. A cold night: a small moon with its ring of ice high up, and aurora arcs bowed across the top of the sky (their
// lower edges bright, their rays standing up and fading into violet), rippling with the bass, their rays flickering
// on the hats, brighter with the voice. (Weather 'aurora' hangs curtains in the air; this one is the sky's arcs.)
function auroraSky(f) {
  const { g, v, mf, T, t } = f,
    dark = darkOf(f),
    a = 0.18 + 0.82 * dark,
    green = mix('#4dffa6', T.line, 0.12),
    violet = mix('#b56bff', T.sky[0], 0.2);
  stars(f, 80 * dark + 10, 37, 0, 0, v.W, v.H * 0.65, 0.75);
  // the moon and its ring of ice
  const MX = v.W * 0.82,
    MY = v.H * 0.4,
    mr = v.H * 0.045 * (1 + 0.05 * mf.voice),
    mc = mix('#f0f4ff', T.sky[2], 0.15);
  glow(g, MX, MY, mr * 5, mc, 0.3 * a + 0.2 * mf.voice);
  g.strokeStyle = rgbaAny(mc, 0.07 * a);
  g.lineWidth = mr * 0.25;
  disc(g, MX, MY, mr * 5.5);
  g.stroke();
  g.globalAlpha = a;
  phaseMoon(g, MX, MY, mr, 0.8, -0.3, mc, rgba(mix(T.sky[0], mc, 0.25), 0.95), 77);
  // the arcs: bowed bands, folding as they ripple, their lower edges bright, their rays standing up into violet (the
  // rays are drawn once into a strip, raysOf, and laid along each arc in slices, each slice sheared to the arc's slope
  // and stretched to its height there, the strip sliding slowly along it so the rays drift)
  g.globalCompositeOperation = 'lighter';
  const R = raysOf(green, violet, v),
    SL = 22,
    sw = (v.W * 1.04) / SL,
    M = g.getTransform();
  for (let k = 0; k < 3; k++) {
    const base = x => {
        const u = x / v.W;
        return v.H * (0.17 + 0.09 * k) + (u - 0.4 - 0.15 * k) ** 2 * v.H * 0.45 + Math.sin(u * 4 + t * (0.22 + 0.07 * k) + k * 2) * v.H * (0.035 + 0.035 * mf.bass) + Math.sin(u * 11 - t * 0.5 + k) * v.H * 0.012;
      },
      hgt = x => v.H * (0.13 + 0.04 * k + 0.06 * mf.voice) * (0.55 + 0.45 * Math.sin((x / v.W) * 7 - t * 0.4 + k * 1.3)),
      lvl = a * (0.7 - 0.12 * k) * (0.8 + 0.35 * mf.voice),
      drift = (0.5 + 0.5 * Math.sin(t * 0.035 + k * 2.1)) * (R.w - v.W * 1.08) + k * 7;
    for (let s = 0; s < SL; s++) {
      const x0 = -v.W * 0.02 + s * sw,
        y0 = base(x0) + 2 * v.dpr,
        y1 = base(x0 + sw) + 2 * v.dpr,
        h = hgt(x0 + sw / 2),
        // (each slice flickers on its own, eight times a second, the more with the hats: one of the strip's three
        // takes of the same rays, lit differently)
        take = Math.floor(hash(s + k * 41, Math.floor(t * 8)) * 3),
        fl = 0.75 + 0.35 * hash(s + k * 53, Math.floor(t * 8) + 5) * (0.3 + mf.hat);
      g.globalAlpha = lvl * fl;
      // (M times the slice's own shear and stretch, in one call)
      const sl = (y1 - y0) / sw,
        sy = h / R.h,
        ty = y0 - h;
      g.setTransform(M.a + M.c * sl, M.b + M.d * sl, M.c * sy, M.d * sy, M.a * x0 + M.c * ty + M.e, M.b * x0 + M.d * ty + M.f);
      g.drawImage(R.c, drift + s * sw, take * R.stride + 3, sw, R.h, 0, 0, sw, R.h);
    }
  }
  g.setTransform(M);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
}

// 8. A nebula: soft clouds of glowing gas layered over each other, slowly turning, dark lanes of dust across them,
// stars in and round them with diffraction spikes; the gas swelling with the bass, the stars twinkling on the hats.
function nebula(f) {
  const { g, v, mf, T, t } = f,
    X = v.W * 0.6,
    Y = v.H * 0.3,
    S = v.H * (1 + 0.04 * eased(f, 'B', mf.bass)),
    cols = [T.line, T.win[0], T.win[2], mix(T.line, '#ffffff', 0.3), T.win[1], mix(T.win[0], T.line, 0.5)],
    // (by day only a ghost of it shows through the blue, never a white blot added up over a bright sky)
    vis = 0.3 + 0.7 * darkOf(f);
  stars(f, 110, 13, 0, 0, v.W, v.H * 0.65, 0.8);
  // (a cluster of stars thick in its middle)
  stars(f, 50, 17, X - S * 0.35, Y - S * 0.15, S * 0.7, S * 0.3, 0.7);
  g.globalCompositeOperation = 'lighter';
  const blob = (bx, by, r, rot, sx, sy, col, al) => {
    g.save();
    g.translate(bx, by);
    g.rotate(rot);
    g.scale(sx, sy);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
    gr.addColorStop(0, rgbaAny(col, al));
    gr.addColorStop(0.45, rgbaAny(col, al * 0.35));
    gr.addColorStop(1, rgbaAny(col, 0));
    g.fillStyle = gr;
    g.fillRect(-r, -r, 2 * r, 2 * r);
    g.restore();
  };
  // the broad glow of its gas
  for (let k = 0; k < 5; k++) {
    const a = hash(k, 21) * TAU + t * 0.006 * (k % 2 ? 1 : -1),
      d = S * (0.04 + 0.14 * hash(k, 22));
    blob(X + Math.cos(a) * d * 1.8, Y + Math.sin(a) * d * 0.6, S * (0.18 + 0.16 * hash(k, 23)), a, 1.8, 0.7, cols[k % cols.length], (0.16 + 0.1 * mf.bass) * vis);
  }
  // its filaments: wisps along two curling arms, slowly turning
  for (let arm = 0; arm < 2; arm++)
    for (let k = 0; k < 9; k++) {
      const u = k / 9,
        a = arm * Math.PI + u * 2.6 + t * 0.01,
        d = S * (0.03 + 0.32 * u),
        wx = X + Math.cos(a) * d * 1.5,
        wy = Y + Math.sin(a) * d * 0.55;
      blob(wx, wy, S * (0.07 + 0.05 * hash(k, 31 + arm)), a + Math.PI / 2 + 0.4, 2.6, 0.45, cols[(k + arm * 2) % cols.length], (0.3 - 0.18 * u) * (0.8 + 0.4 * mf.bass) * vis);
    }
  // (its bright heart, glowing with the voice)
  glow(g, X, Y, S * 0.09, '#ffffff', (0.22 + 0.3 * mf.voice) * vis);
  g.globalCompositeOperation = 'source-over';
  // (a lane of dust across it, off its middle)
  g.save();
  g.translate(X - S * 0.12, Y + S * 0.05);
  g.rotate(0.5 + t * 0.004);
  g.scale(3, 0.45);
  const r = S * 0.09,
    dg = g.createRadialGradient(0, 0, 0, 0, 0, r);
  dg.addColorStop(0, rgba(mix(T.sky[0], '#000000', 0.4), 0.22));
  dg.addColorStop(1, rgba(mix(T.sky[0], '#000000', 0.4), 0));
  g.fillStyle = dg;
  g.fillRect(-r, -r, 2 * r, 2 * r);
  g.restore();
  // (young stars in it, with spikes, twinkling on the hats)
  for (let k = 0; k < 7; k++) {
    const sx = X + (hash(k, 61) - 0.5) * S * 0.9,
      sy = Y + (hash(k, 62) - 0.5) * S * 0.4,
      tw = 0.7 + 0.3 * Math.sin(t * 2 + k) + (k % 2 ? 0.6 * mf.hat : 0);
    spikeStar(g, sx, sy, S * (0.012 + 0.022 * hash(k, 63)) * tw, mix('#ffffff', cols[k % 3], 0.3), 0.8, 1 * v.dpr);
  }
}

// 9. A shattered moon: what is left of it, with a bite out of it and cracks glowing from a molten core (flaring on the
// kick), its broken pieces drifting round it and turning slowly, a ring of rubble round it twinkling on the hats.
function shattered(f) {
  const { g, v, mf, T, t } = f,
    X = v.W * 0.68,
    Y = v.H * 0.32,
    R = v.H * 0.13 * (1 + 0.025 * mf.bass),
    rock = mix('#ece6da', T.sky[2], 0.25),
    rockD = mix(T.far, '#000000', 0.35),
    core = mix(T.win[0], '#ffffff', 0.2),
    // (the way the pieces fly out: up and right, out of the bite)
    out = -0.75;
  stars(f, 60 * darkOf(f) + 15, 61, 0, 0, v.W, v.H * 0.6, 0.7);
  glow(g, X, Y, R * 3.2, core, 0.16 + 0.22 * mf.kick);
  // (the rubble ring, tilted, twinkling on the hats)
  for (let i = 0; i < 90; i++) {
    const a = hash(i, 71) * TAU + t * 0.02,
      rr = R * (1.5 + 0.55 * hash(i, 72)),
      px = X + Math.cos(a) * rr,
      py = Y + Math.sin(a) * rr * 0.22 - Math.cos(a) * rr * 0.2;
    g.fillStyle = i % 5 ? rock : core;
    g.globalAlpha = Math.min(1, (0.3 + 0.5 * hash(i, 73)) * (i % 4 ? 0.8 : 0.4 + mf.hat));
    const s = (1 + 2.2 * hash(i, 74)) * v.dpr;
    g.fillRect(px, py, s, s);
  }
  g.globalAlpha = 1;
  // a fragment: a jagged polygon lit from the upper left, its broken face rimmed by the core's light
  const frag = (fx, fy, fr, spin, k) => {
    const n = 5 + Math.floor(hash(k, 86) * 3);
    g.beginPath();
    for (let j = 0; j < n; j++) {
      const ja = spin + (j / n) * TAU,
        jr = fr * (0.6 + 0.4 * hash(k * 7 + j, 87));
      j ? g.lineTo(fx + Math.cos(ja) * jr, fy + Math.sin(ja) * jr) : g.moveTo(fx + Math.cos(ja) * jr, fy + Math.sin(ja) * jr);
    }
    g.closePath();
    const lg = g.createLinearGradient(fx - fr, fy - fr, fx + fr * 0.6, fy + fr * 0.6);
    lg.addColorStop(0, rock);
    lg.addColorStop(1, rockD);
    g.fillStyle = lg;
    g.fill();
    g.strokeStyle = rgbaAny(core, 0.35 + 0.5 * mf.kick);
    g.lineWidth = 1.5 * v.dpr;
    g.stroke();
  };
  // the pieces: a stream drifting out of the bite, the farther the smaller and slower to turn
  for (let k = 0; k < 13; k++) {
    const u = (hash(k, 81) + t * 0.004) % 1,
      spread = (hash(k, 82) - 0.5) * 1.1,
      d = R * (1.0 + 2.4 * u),
      a = out + spread * (1 - 0.4 * u),
      fx = X + Math.cos(a) * d + Math.sin(t * 0.2 + k) * R * 0.03,
      fy = Y + Math.sin(a) * d,
      fr = R * (0.1 + 0.26 * hash(k, 84)) * (1 - 0.4 * u),
      spin = t * 0.1 * (hash(k, 85) - 0.5) + k;
    g.globalAlpha = Math.min(1, (1 - u) / 0.15);
    frag(fx, fy, fr, spin, k);
  }
  g.globalAlpha = 1;
  // the body: a disc with a jagged bite out of it where the pieces come from
  const bite = [];
  for (let j = 0; j <= 9; j++) {
    const u = j / 9,
      ba = out - 0.75 + u * 1.5,
      br = R * (0.92 - 0.55 * Math.sin(u * Math.PI) + 0.12 * (hash(j, 91) - 0.5));
    bite.push([X + Math.cos(ba) * br, Y + Math.sin(ba) * br]);
  }
  const body = () => {
    g.beginPath();
    g.arc(X, Y, R, out + 0.75, TAU + out - 0.75);
    bite.forEach(([bx, by]) => g.lineTo(bx, by));
    g.closePath();
  };
  // (the molten core showing in the bite)
  glow(g, X + Math.cos(out) * R * 0.45, Y + Math.sin(out) * R * 0.45, R * 0.9, core, 0.8 + 0.2 * mf.kick);
  body();
  g.fillStyle = rock;
  g.fill();
  g.save();
  body();
  g.clip();
  g.fillStyle = 'rgba(0,0,0,0.13)';
  for (let k = 0; k < 9; k++) {
    const a = hash(k, 92) * TAU,
      d = Math.sqrt(hash(k, 93)) * R * 0.85;
    disc(g, X + Math.cos(a) * d, Y + Math.sin(a) * d, R * (0.05 + 0.14 * hash(k, 94)));
    g.fill();
  }
  const sh = g.createRadialGradient(X - R * 0.45, Y - R * 0.35, R * 0.1, X, Y, R * 1.1);
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(1, 'rgba(0,0,0,0.6)');
  g.fillStyle = sh;
  g.fillRect(X - R, Y - R, 2 * R, 2 * R);
  // (the cracks running from the bite across it, glowing: a wide dim pass, then a thin bright one)
  for (let pass = 0; pass < 2; pass++) {
    g.strokeStyle = rgbaAny(core, pass ? 0.95 : 0.25 + 0.35 * mf.kick);
    g.lineWidth = (pass ? 1.6 : 6 + 5 * mf.kick) * v.dpr;
    g.beginPath();
    for (let c = 0; c < 4; c++) {
      let [cx, cy] = bite[2 + c * 2];
      let ca = out + Math.PI + (c - 1.5) * 0.45;
      g.moveTo(cx, cy);
      for (let s = 0; s < 4; s++) {
        ca += (hash(c * 9 + s, 95) - 0.5) * 0.7;
        cx += Math.cos(ca) * R * 0.28;
        cy += Math.sin(ca) * R * 0.28;
        g.lineTo(cx, cy);
        // (a branch now and then)
        if (s === 1) {
          const b = ca + (hash(c, 96) > 0.5 ? 0.9 : -0.9);
          g.lineTo(cx + Math.cos(b) * R * 0.2, cy + Math.sin(b) * R * 0.2);
          g.moveTo(cx, cy);
        }
      }
    }
    g.stroke();
  }
  g.restore();
  // (the bite's broken edge lit)
  g.strokeStyle = rgbaAny(core, 0.9);
  g.lineWidth = 2.5 * v.dpr;
  g.beginPath();
  bite.forEach(([bx, by], j) => (j ? g.lineTo(bx, by) : g.moveTo(bx, by)));
  g.stroke();
}

// the sun's place and size at the song's hour (low and big at dusk and dawn, high and small by day, set at night)
const SUNAT = { day: [0.7, 0.18, 1], dusk: [0.62, 0.52, 1.7], dawn: [0.32, 0.5, 1.5], night: [0.6, 0.95, 1.7], space: [0.7, 0.25, 1], deep: [0.7, 0.25, 1] };
function sunAt(f) {
  const d = f.look.day ?? { a: f.look.time, b: f.look.time, u: 0 },
    pa = SUNAT[d.a] ?? SUNAT.day,
    pb = SUNAT[d.b] ?? SUNAT.day,
    u = d.u * d.u * (3 - 2 * d.u);
  return pa.map((x, k) => x + (pb[k] - x) * u);
}

// 10. A sun with god-rays: broad shafts of light fanning from it all over the sky, two sets turning slowly against each
// other, flaring on the kick, the sun swelling with the bass and the voice; low and gold at dusk, white by day; at
// night a moon in its place with the faint rays of moonlight.
function godRays(f) {
  const { g, v, mf, T, t } = f,
    dark = darkOf(f),
    [px, py, sz] = sunAt(f),
    X = v.W * px,
    Y = v.H * (Math.min(py, 0.62) * (1 - dark) + 0.24 * dark),
    r = v.H * 0.055 * sz * (1 + 0.06 * mf.bass + 0.08 * mf.voice),
    sun = mix(py > 0.35 ? '#ffb45e' : '#fff3cf', T.win[0], 0.25),
    moon = mix('#eef2ff', T.sky[2], 0.15),
    col = mix(sun, moon, dark),
    k0 = 1 - 0.85 * dark,
    L = Math.hypot(v.W, v.H);
  const rays = (n, spin, salt, a, wide = 1) => {
    // (strongest by the sun and gone well before the far side of the screen, so the shafts light the sky and never
    // streak over the run below)
    const gr = g.createRadialGradient(X, Y, r, X, Y, L * 0.62);
    gr.addColorStop(0, rgbaAny(col, a));
    gr.addColorStop(0.2, rgbaAny(col, a * 0.38));
    gr.addColorStop(0.5, rgbaAny(col, a * 0.07));
    gr.addColorStop(1, rgbaAny(col, 0));
    g.fillStyle = gr;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const c = (i / n) * TAU + spin + hash(i, salt) * 0.25,
        w = (0.02 + 0.05 * hash(i, salt + 1)) * wide;
      g.moveTo(X, Y);
      g.lineTo(X + Math.cos(c - w) * L, Y + Math.sin(c - w) * L);
      g.lineTo(X + Math.cos(c + w) * L, Y + Math.sin(c + w) * L);
      g.closePath();
    }
    g.fill();
  };
  glow(g, X, Y, r * 9, col, (0.3 + 0.2 * mf.voice) * k0);
  // (each set twice, a wide faint pass under a narrow one, so the shafts have soft edges)
  rays(16, t * 0.025, 5, (0.11 + 0.1 * mf.kick) * k0, 1.8);
  rays(16, t * 0.025, 5, (0.18 + 0.17 * mf.kick) * k0);
  rays(11, -t * 0.015 + 0.3, 9, (0.08 + 0.1 * mf.bass) * k0, 1.8);
  rays(11, -t * 0.015 + 0.3, 9, (0.11 + 0.12 * mf.bass) * k0);
  glow(g, X, Y, r * 2.8, '#ffffff', 0.5 * k0 + 0.25);
  if (dark > 0.5) phaseMoon(g, X, Y, r * 0.8, 0.9, -0.4, moon, rgba(mix(T.sky[0], '#000000', 0.2), 0.9), 33);
  else {
    const sg = g.createRadialGradient(X, Y, 0, X, Y, r);
    sg.addColorStop(0, '#ffffff');
    sg.addColorStop(0.7, mix(col, '#ffffff', 0.7));
    sg.addColorStop(1, mix(col, '#ffffff', 0.35));
    g.fillStyle = sg;
    disc(g, X, Y, r);
    g.fill();
  }
  // (a ring of light round it on the downbeat)
  if (mf.down > 0.05) {
    g.strokeStyle = rgbaAny(col, 0.5 * mf.down);
    g.lineWidth = r * 0.12;
    disc(g, X, Y, r * (1.6 + 2.5 * (1 - mf.down)));
    g.stroke();
  }
}

// 11. Binary suns: a big warm one and a small blue-white one going slowly round each other, each with its halo and a
// halo of the two together; a line of lens-flare ghosts from them across the sky; low and red at dusk and night (a
// double sunset), high by day. The halos swell with the voice and the bass, the ghosts flash on the kick.
function binarySuns(f) {
  const { g, v, mf, T, t } = f,
    dark = darkOf(f),
    [, py] = sunAt(f),
    CX = v.W * 0.6,
    CY = v.H * Math.min(0.62, Math.max(0.22, py)),
    low = Math.max(0, Math.min(1, (CY / v.H - 0.25) / 0.35)),
    s = v.H * 0.15,
    a = t * 0.03,
    sw = 1 + 0.06 * mf.bass + 0.06 * mf.voice,
    A = { X: CX - Math.cos(a) * s * 0.4, Y: CY - Math.sin(a) * s * 0.12, r: v.H * 0.075 * sw, c: mix(mix('#ffb04a', '#ff5a3a', low * 0.6), T.win[0], 0.2) },
    B = { X: CX + Math.cos(a) * s * 0.9, Y: CY + Math.sin(a) * s * 0.28, r: v.H * 0.04 * sw, c: mix(mix('#d6ecff', '#ffd0b0', low * 0.5), T.line, 0.2) };
  stars(f, 30 * dark, 29, 0, 0, v.W, v.H * 0.5, 0.6);
  glow(g, CX, CY, s * 2.6, mix(A.c, B.c, 0.4), 0.25 + 0.2 * mf.voice);
  // (the far one first, as they turn)
  const order = Math.sin(a) > 0 ? [A, B] : [B, A];
  for (const S of order) {
    glow(g, S.X, S.Y, S.r * (4 + 1.5 * mf.voice), S.c, 0.55);
    glow(g, S.X, S.Y, S.r * 1.9, mix(S.c, '#ffffff', 0.5), 0.7);
    // (its disc: white-hot in the middle, its own colour at the limb)
    const sg = g.createRadialGradient(S.X, S.Y, 0, S.X, S.Y, S.r);
    sg.addColorStop(0, '#ffffff');
    sg.addColorStop(0.6, mix(S.c, '#ffffff', 0.7));
    sg.addColorStop(1, mix(S.c, '#ffffff', 0.25));
    g.fillStyle = sg;
    disc(g, S.X, S.Y, S.r);
    g.fill();
  }
  // (each one's spikes, the small one's twinkling on the hats)
  spikeStar(g, A.X, A.Y, A.r * (2.2 + 0.8 * mf.kick), '#ffffff', 0.45, 1.5 * v.dpr);
  spikeStar(g, B.X, B.Y, B.r * (2.5 + 1.5 * mf.hat), '#ffffff', 0.5, 1.2 * v.dpr);
  // the ghosts: along the line from the suns through the screen's middle
  const mx = v.W * 0.5,
    my = v.H * 0.5,
    gh = [0.45, 0.8, 1.05, 1.35, 1.7],
    gc = [T.line, A.c, T.win[2], B.c, T.win[1]];
  gh.forEach((u, k) => {
    const gx = CX + (mx - CX) * u * 2,
      gy = CY + (my - CY) * u * 2,
      gr = v.H * (0.012 + 0.05 * hash(k, 7));
    // (each ghost the lens's aperture: a hexagon, faintly filled, its rim a little brighter)
    g.fillStyle = rgbaAny(gc[k], (0.07 + 0.08 * hash(k, 8)) * (1 + 1.5 * mf.kick));
    g.beginPath();
    for (let j = 0; j < 6; j++) {
      const ja = 0.26 + (j / 6) * TAU;
      j ? g.lineTo(gx + Math.cos(ja) * gr, gy + Math.sin(ja) * gr) : g.moveTo(gx + Math.cos(ja) * gr, gy + Math.sin(ja) * gr);
    }
    g.closePath();
    g.fill();
    g.strokeStyle = rgbaAny(gc[k], 0.12 * (1 + mf.kick));
    g.lineWidth = v.dpr;
    g.stroke();
  });
  // (a streak through the big one, wider on the kick)
  g.fillStyle = rgbaAny(mix(A.c, '#ffffff', 0.5), 0.35 + 0.3 * mf.kick);
  g.beginPath();
  g.ellipse(A.X, A.Y, v.W * (0.12 + 0.08 * mf.kick), 1.4 * v.dpr, 0, 0, TAU);
  g.fill();
}

// 12. The simulation's moon: a wireframe sphere turning slowly (its far lines faint, its near ones bright), one
// meridian after another lit on the hats, the whole frame flashing on the kick; a scan line sweeping down it, a ring of
// data going round it, and in a drop the frame glitching apart in slices.
function wireMoon(f) {
  const { g, v, mf, T, t, L } = f,
    X = v.W * 0.7,
    Y = v.H * 0.3,
    R = v.H * 0.16 * (1 + 0.04 * mf.bass),
    ry = t * 0.15,
    rx = 0.38,
    cr = Math.cos(rx),
    sr = Math.sin(rx),
    line = mix(T.line, '#ffffff', 0.25),
    beat = L?.A?.beat ?? 0.5,
    step = Math.floor(t / (beat / 2)) % 12,
    dark = darkOf(f),
    gl = mf.drop > 0 ? hash(Math.floor(t * 14), 7) : 0;
  // (a point on the sphere: screen x, y and depth)
  const P = (lat, lon) => {
    const x = Math.cos(lat) * Math.sin(lon + ry),
      y = Math.sin(lat),
      z = Math.cos(lat) * Math.cos(lon + ry);
    return [X + x * R, Y - (y * cr - z * sr) * R, y * sr + z * cr];
  };
  glow(g, X, Y, R * 2.4, T.line, 0.2 + 0.15 * mf.voice + 0.15 * mf.kick);
  // (its glass: dark at night, by day only a tint of the sky's top, so it never sits on a bright sky as a grey blot)
  g.fillStyle = rgba(mix(mix(T.sky[0], '#000000', 0.35), T.sky[1], 0.4 * (1 - dark)), 0.4 + 0.35 * dark);
  disc(g, X, Y, R);
  g.fill();
  const lg = g.createRadialGradient(X - R * 0.35, Y - R * 0.35, 0, X, Y, R);
  lg.addColorStop(0, rgbaAny(T.line, 0.22 + 0.2 * mf.voice));
  lg.addColorStop(1, rgbaAny(T.line, 0.02));
  g.fillStyle = lg;
  disc(g, X, Y, R);
  g.fill();
  // (the frame built once into three paths, its far lines, its near ones and the meridian lit on the hats, each stroked
  // in one go)
  const back = new Path2D(),
    front = new Path2D(),
    lit = new Path2D(),
    curve = (pts, on) => {
      const near = on ? lit : front;
      // (one polyline per run of segments on the same side, so the lines join cleanly)
      let last = null;
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0, z0] = pts[i - 1],
          [x1, y1, z1] = pts[i],
          p = z0 + z1 > 0 ? near : back;
        if (p !== last) p.moveTo(x0, y0);
        p.lineTo(x1, y1);
        last = p;
      }
    };
  for (let k = -5; k <= 5; k++) {
    const lat = (k / 6) * (Math.PI / 2),
      pts = [];
    for (let s = 0; s <= 32; s++) pts.push(P(lat, (s / 32) * TAU));
    curve(pts, false);
  }
  for (let m = 0; m < 12; m++) {
    const lon = (m / 12) * Math.PI,
      pts = [];
    for (let s = 0; s <= 32; s++) pts.push(P(-Math.PI / 2 + (s / 32) * TAU, lon));
    curve(pts, m === step);
  }
  const frame = () => {
    g.strokeStyle = rgbaAny(line, 0.12);
    g.lineWidth = v.dpr;
    g.stroke(back);
    g.strokeStyle = rgbaAny(line, 0.45 + 0.4 * mf.kick);
    g.lineWidth = 1.3 * v.dpr;
    g.stroke(front);
    g.strokeStyle = rgbaAny('#ffffff', 0.5 + 0.5 * mf.hat);
    g.lineWidth = 2.5 * v.dpr;
    g.stroke(lit);
  };
  // (in a drop: a slice of the frame shifted sideways, the rest where it was)
  const slice = gl > 0.55;
  if (slice) {
    g.save();
    g.beginPath();
    g.rect(0, Y - R * 1.2 + gl * R, v.W, R * 0.3);
    g.clip();
    g.translate((gl - 0.75) * R * 0.6, 0);
    frame();
    g.restore();
    g.save();
    g.beginPath();
    g.rect(0, Y - R * 1.2 + gl * R, v.W, R * 0.3);
    g.rect(0, 0, v.W, v.H);
    g.clip('evenodd');
  }
  frame();
  if (slice) g.restore();
  // (nodes on the near side, the hats lighting some)
  for (let k = -4; k <= 4; k += 2)
    for (let m = 0; m < 12; m += 2) {
      const [px, py, z] = P((k / 6) * (Math.PI / 2), (m / 12) * TAU);
      if (z < 0.1) continue;
      const on = hash(k * 13 + m, Math.floor(t / beat)) < 0.3;
      g.fillStyle = rgbaAny(on ? '#ffffff' : line, on ? 0.4 + 0.6 * mf.hat : 0.5 * z);
      g.fillRect(px - 1.5 * v.dpr, py - 1.5 * v.dpr, 3 * v.dpr, 3 * v.dpr);
    }
  // (the scan line)
  const sy = Y - R + ((t * 0.35) % 1) * 2 * R,
    sw = Math.sqrt(Math.max(0, R * R - (sy - Y) ** 2));
  g.fillStyle = rgbaAny(line, 0.55);
  g.fillRect(X - sw, sy, sw * 2, 1.5 * v.dpr);
  // (the frame of the readout round it: arcs turning against each other, a segment lit on each beat)
  g.lineWidth = 2 * v.dpr;
  for (let k = 0; k < 3; k++) {
    const rr = R * (1.22 + 0.1 * k),
      sp = t * (0.3 - 0.25 * k) + k;
    g.strokeStyle = rgbaAny(line, 0.25 + 0.15 * k + 0.3 * mf.kick);
    g.beginPath();
    g.arc(X, Y, rr, sp, sp + 0.9 + 0.4 * k);
    g.stroke();
    g.beginPath();
    g.arc(X, Y, rr, sp + Math.PI, sp + Math.PI + 0.5);
    g.stroke();
  }
  const seg = Math.floor(t / beat) % 16;
  for (let k = 0; k < 16; k++) {
    const sa = (k / 16) * TAU - Math.PI / 2;
    g.strokeStyle = rgbaAny(k === seg ? '#ffffff' : line, k === seg ? 0.5 + 0.5 * mf.beat : 0.18);
    g.lineWidth = (k === seg ? 4 : 3) * v.dpr;
    g.beginPath();
    g.arc(X, Y, R * 1.55, sa + 0.03, sa + TAU / 16 - 0.03);
    g.stroke();
  }
  // (the ring of data going round it)
  g.save();
  g.translate(X, Y);
  g.rotate(-0.2);
  g.strokeStyle = rgbaAny(line, 0.3);
  g.lineWidth = v.dpr;
  g.setLineDash([4 * v.dpr, 6 * v.dpr]);
  g.lineDashOffset = -t * 30 * v.dpr;
  g.beginPath();
  g.ellipse(0, 0, R * 1.7, R * 0.32, 0, 0, TAU);
  g.stroke();
  g.setLineDash([]);
  const sa = t * 0.4;
  g.fillStyle = rgbaAny('#ffffff', 0.8);
  g.fillRect(Math.cos(sa) * R * 1.7 - 3 * v.dpr, Math.sin(sa) * R * 0.32 - 3 * v.dpr, 6 * v.dpr, 6 * v.dpr);
  g.restore();
  // (glitch bars on the drop)
  if (gl > 0.4) {
    g.fillStyle = 'rgba(255,43,58,0.5)';
    g.fillRect(X - R * (0.4 + gl), Y + (gl - 0.5) * R * 2, R * (0.8 + gl), 3 * v.dpr);
    g.fillStyle = 'rgba(41,231,255,0.5)';
    g.fillRect(X - R * (1.2 - gl), Y + (0.5 - gl) * R * 1.6, R * 1.4 * gl, 2 * v.dpr);
  }
}

registerPart({ id: 'gasgiant', slot: 'sky', media: ['air', 'space'], tags: ['future', 'fantasy', 'cold'], mood: [0.4, 0.55, 0.25], draw: gasGiant });
registerPart({ id: 'eclipse', slot: 'sky', media: ['air'], tags: ['gothic', 'ancient', 'cold'], mood: [0.7, 0.2, 0.7], draw: eclipse });
registerPart({ id: 'moons', slot: 'sky', media: ['air'], tags: ['fantasy', 'nature', 'mild'], mood: [0.35, 0.55, 0.2], draw: threeMoons });
registerPart({ id: 'comet', slot: 'sky', media: ['air', 'space'], tags: ['nature', 'ancient', 'fantasy'], mood: [0.5, 0.5, 0.35], draw: comet });
registerPart({ id: 'blackhole', slot: 'sky', media: ['air', 'space'], tags: ['future', 'tech', 'cold'], mood: [0.8, 0.25, 0.8], draw: blackHole });
registerPart({ id: 'riser', slot: 'sky', media: ['air', 'space'], tags: ['future', 'fantasy', 'tech'], mood: [0.6, 0.6, 0.4], draw: riser });
registerPart({ id: 'aurorasky', slot: 'sky', media: ['air'], tags: ['nature', 'cold', 'modern'], mood: [0.35, 0.5, 0.15], draw: auroraSky });
registerPart({ id: 'nebula', slot: 'sky', media: ['air', 'space'], tags: ['future', 'neon', 'fantasy'], mood: [0.5, 0.6, 0.3], draw: nebula });
registerPart({ id: 'shattered', slot: 'sky', media: ['air'], tags: ['fantasy', 'gothic', 'ancient'], mood: [0.7, 0.3, 0.7], draw: shattered });
registerPart({ id: 'godrays', slot: 'sky', media: ['air'], tags: ['nature', 'warm', 'mild'], mood: [0.5, 0.75, 0.3], draw: godRays });
registerPart({ id: 'binary', slot: 'sky', media: ['air'], tags: ['hot', 'future', 'fantasy'], mood: [0.65, 0.6, 0.45], draw: binarySuns });
registerPart({ id: 'wiremoon', slot: 'sky', media: ['air', 'space'], tags: ['future', 'tech', 'cold', 'neon'], mood: [0.65, 0.35, 0.55], draw: wireMoon });
