// (a pack of parts: see registry.js)
// ATL's skies (world/artists.js), each after a cover of his, drawn after the sky's gradient in screen space, in the
// song's palette pulled toward the cover's, every one playing the music:
//   acideye  "Лимб": a huge eye of acid contour lines like a map's, its pupil closing on the kick, its rings a step on
//            on the beat, blinking on a drop
//   helios   "Гелиоз": a sun wound into a spiral of fire, turning faster with the bass, spears of light on the snare
//   cyclone  "Центр циклона": a funnel of storm cloud turning over him, a hole of clear blue at its heart opening on a
//            drop, lightning round its rim on the snare
//   wavesky  "Ящик": the song's waveform across the sky, its amplitude the bass, a skull's outline coming up in it only
//            on a drop
import { registerPart } from '../../registry.js';
import { glow } from '../../../render/places/kit.js';
import { hash, mixHex, rgba } from '../../../render/util.js';

const TAU = Math.PI * 2;
const notch = (f, quick = 3) => {
  const b = f.t / f.L.A.beat,
    n = Math.floor(b),
    k = Math.min(1, (b - n) * quick);
  return n + k * k * (3 - 2 * k);
};

// ---- the acid eye: wavy rings out from the iris, filled one inside another (the largest first), in the cover's
// green, magenta and violet pulled a little to the song's, the pupil dark with an amber glint
const EYE = ['#3dff6a', '#9dff3a', '#ff2fd0', '#6a2cff', '#2a1a6a', '#04140f'];
function acidEye(f) {
  const { g, v, mf, t, T } = f,
    R = Math.min(v.W, v.H * 0.9) * 0.42,
    X = v.W * 0.5,
    Y = v.H * 0.3,
    step = Math.floor(notch(f)),
    swap = mf.drop > 0 ? 1 : 0,
    n = 11;
  glow(g, X, Y, R * 1.3, mixHex(EYE[2], T.sky[1], 0.4), 0.18 + 0.12 * mf.kick);
  g.save();
  g.globalAlpha = 0.85;
  for (let k = n; k >= 1; k--) {
    const r = (R * k) / n,
      col = EYE[(k + step + swap * 2) % 4],
      ph = k * 0.7 + t * 0.25;
    g.fillStyle = mixHex(k % 2 ? col : mixHex(col, '#000000', 0.55), T.sky[0], 0.18);
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * TAU,
        w = 1 + 0.07 * Math.sin(a * 5 + ph) + 0.05 * Math.sin(a * 3 - ph * 1.3) + 0.03 * mf.bass * Math.sin(a * 9 + t * 3);
      // (an eye's almond: wider than tall)
      const x = X + Math.cos(a) * r * w * 1.35,
        y = Y + Math.sin(a) * r * w * 0.82;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.fill();
  }
  // (the iris and its pupil, closing on the kick)
  const ir = R * 0.24;
  g.fillStyle = '#e0b040';
  g.beginPath();
  g.arc(X, Y, ir, 0, TAU);
  g.fill();
  g.strokeStyle = 'rgba(80,40,0,0.5)';
  g.lineWidth = Math.max(1, ir * 0.04);
  g.beginPath();
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU;
    g.moveTo(X + Math.cos(a) * ir * 0.45, Y + Math.sin(a) * ir * 0.45);
    g.lineTo(X + Math.cos(a) * ir * 0.95, Y + Math.sin(a) * ir * 0.95);
  }
  g.stroke();
  g.fillStyle = EYE[5];
  g.beginPath();
  g.arc(X, Y, ir * (0.55 - 0.22 * mf.kick), 0, TAU);
  g.fill();
  g.fillStyle = 'rgba(255,255,240,0.85)';
  g.beginPath();
  g.arc(X - ir * 0.3, Y - ir * 0.3, ir * 0.12, 0, TAU);
  g.fill();
  // (a blink on a drop's downbeats: a lid of the sky's top colour across it and back)
  const blink = mf.drop > 0 ? mf.down : 0;
  if (blink > 0.05) {
    g.fillStyle = T.sky[0];
    g.globalAlpha = 1;
    g.fillRect(X - R * 1.5, Y - R, R * 3, R * blink);
    g.fillRect(X - R * 1.5, Y + R * (1 - blink), R * 3, R * blink);
  }
  g.restore();
}

// ---- the spiral sun: five arms of fire wound from its heart, turning, faster with the bass; spears of light out of
// it on the snare
function helios(f) {
  const { g, v, mf, t, T } = f,
    R = Math.min(v.W, v.H) * 0.3,
    X = v.W * 0.62,
    Y = v.H * 0.28,
    spin = t * (0.3 + 0.6 * mf.bass) + notch(f) * 0.05,
    hot = mixHex('#ffb04a', T.win[0], 0.25),
    fire = mixHex('#ff5a1a', T.line, 0.15),
    deep = mixHex('#3a0a06', T.sky[0], 0.3);
  glow(g, X, Y, R * 1.6, fire, 0.3 + 0.15 * mf.kick + 0.2 * mf.voice);
  g.fillStyle = rgba(deep, 0.6);
  g.beginPath();
  g.arc(X, Y, R, 0, TAU);
  g.fill();
  for (let arm = 0; arm < 5; arm++) {
    const a0 = spin + (arm * TAU) / 5;
    g.fillStyle = arm % 2 ? fire : mixHex(fire, hot, 0.5);
    g.beginPath();
    for (let i = 0; i <= 24; i++) {
      const u = i / 24,
        a = a0 + u * 4.2,
        r = R * u,
        w = 0.28 * (1 - u) + 0.03;
      g.lineTo(X + Math.cos(a) * r, Y + Math.sin(a) * r * 0.9);
      if (i === 24) for (let j = 24; j >= 0; j--) {
        const uu = j / 24,
          aa = a0 + uu * 4.2 + w * 1.6 * (1 - uu) + 0.25;
        g.lineTo(X + Math.cos(aa) * R * uu * 0.92, Y + Math.sin(aa) * R * uu * 0.83);
      }
    }
    g.fill();
  }
  glow(g, X, Y, R * 0.35, '#fff0c0', 0.7 + 0.3 * mf.kick);
  // (the spears)
  if (mf.snare > 0.05) {
    g.strokeStyle = rgba(hot, 0.7 * mf.snare);
    g.lineWidth = 2 * v.dpr;
    g.beginPath();
    for (let k = 0; k < 9; k++) {
      const a = hash(k, Math.floor(t / f.L.A.beat)) * TAU;
      g.moveTo(X + Math.cos(a) * R * 0.5, Y + Math.sin(a) * R * 0.5);
      g.lineTo(X + Math.cos(a) * R * (1.5 + mf.snare), Y + Math.sin(a) * R * (1.5 + mf.snare));
    }
    g.stroke();
  }
}

// ---- the cyclone: rings of torn cloud round a hole straight up, each turning, slower outward
function cyclone(f) {
  const { g, v, mf, t, T } = f,
    X = v.W * 0.5,
    Y = v.H * 0.2,
    R = Math.max(v.W, v.H) * 0.62,
    hole = R * (0.09 + 0.06 * mf.drop + 0.02 * mf.bass),
    dark = mixHex('#2a2a2e', T.sky[0], 0.35),
    light = mixHex('#55565c', T.sky[2], 0.3);
  // (the clear sky through its eye, and a glow off it)
  glow(g, X, Y, hole * 3, '#6aa0e0', 0.35 + 0.2 * mf.voice);
  g.fillStyle = mixHex('#6aa0e0', T.sky[1], 0.2);
  g.beginPath();
  g.ellipse(X, Y, hole * 1.3, hole * 0.8, 0, 0, TAU);
  g.fill();
  for (let ring = 0; ring < 7; ring++) {
    const r0 = hole * 1.3 + (R * ring) / 7,
      r1 = r0 + R / 7,
      spin = t * (0.12 / (1 + ring * 0.5)) + ring;
    g.fillStyle = rgba(ring % 2 ? dark : light, 0.55 - ring * 0.04);
    for (let k = 0; k < 5; k++) {
      const a0 = spin + (k * TAU) / 5 + hash(ring, k) * 0.5,
        a1 = a0 + TAU / 5 - 0.25;
      g.beginPath();
      g.ellipse(X, Y, r1, r1 * 0.38, 0, a0, a1);
      g.ellipse(X, Y, r0, r0 * 0.38, 0, a1, a0, true);
      g.fill();
    }
  }
  // (lightning about its rim on the snare)
  if (mf.snare > 0.25) {
    const b = Math.floor(t / f.L.A.beat),
      a = hash(b, 5) * TAU,
      r = hole * 3 + R * 0.25 * hash(b, 6);
    g.strokeStyle = rgba('#e8f0ff', mf.snare);
    g.lineWidth = 2 * v.dpr;
    g.beginPath();
    let x = X + Math.cos(a) * r,
      y = Y + Math.sin(a) * r * 0.38;
    g.moveTo(x, y);
    for (let i = 0; i < 6; i++) {
      x += (hash(i, b) - 0.5) * 40 * v.dpr;
      y += 18 * v.dpr;
      g.lineTo(x, y);
    }
    g.stroke();
  }
}

// ---- the sky's waveform: a band of vertical strokes across the screen, the song's bass in it, a skull's outline
// risen out of it on a drop (the cover of "Ящик": a skull of sound)
function waveSky(f) {
  const { g, v, mf, t, T } = f,
    Y = v.H * 0.3,
    col = mixHex('#9a7dff', T.line, 0.25),
    pale = mixHex('#c0b0ff', '#ffffff', 0.2),
    n = Math.round(v.W / (5 * v.dpr)),
    dx = v.W / n,
    sk = mf.drop > 0 ? Math.min(1, mf.drop * 2) : 0,
    S = Math.min(v.W * 0.3, v.H * 0.2);
  glow(g, v.W / 2, Y, v.W * 0.4, col, 0.15 + 0.15 * mf.bass);
  g.strokeStyle = rgba(col, 0.75);
  g.lineWidth = Math.max(1, dx * 0.55);
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const x = i * dx,
      u = (x - v.W / 2) / (v.W / 2),
      env = Math.exp(-u * u * 3),
      h = v.H * 0.04 * (0.25 + env * (0.6 + 1.3 * mf.bass)) * (0.5 + 0.5 * Math.abs(Math.sin(i * 0.9 + t * 7) * Math.sin(i * 0.23 - t * 2)));
    // (the skull: its dome, its eye holes and its jaw cut into the bars)
    let top = h,
      bot = h;
    if (sk > 0 && Math.abs(u) < 0.32) {
      const q = u / 0.32;
      top = Math.max(h, S * sk * Math.sqrt(Math.max(0, 1 - q * q)) * 0.95);
      bot = Math.max(h, S * sk * (Math.abs(q) < 0.6 ? 0.75 : 0.45));
      const eye = Math.abs(Math.abs(q) - 0.42) < 0.2;
      if (eye) {
        g.moveTo(x, Y - top);
        g.lineTo(x, Y - S * sk * 0.15);
        g.moveTo(x, Y + S * sk * 0.2);
        g.lineTo(x, Y + bot);
        continue;
      }
    }
    g.moveTo(x, Y - top);
    g.lineTo(x, Y + bot);
  }
  g.stroke();
  g.fillStyle = rgba(pale, 0.5 + 0.4 * mf.kick);
  g.fillRect(0, Y - v.dpr, v.W, 2 * v.dpr);
}

registerPart({ pack: 'atl', id: 'acideye', slot: 'sky', media: ['air'], tags: ['acid', 'occult', 'neon'], mood: [0.6, 0.35, 0.5], draw: acidEye });
registerPart({ pack: 'atl', id: 'helios', slot: 'sky', media: ['air'], tags: ['hot', 'acid', 'province'], mood: [0.75, 0.45, 0.6], draw: helios });
registerPart({ pack: 'atl', id: 'cyclone', slot: 'sky', media: ['air'], tags: ['cold', 'nature', 'occult'], mood: [0.6, 0.3, 0.6], draw: cyclone });
registerPart({ pack: 'atl', id: 'wavesky', slot: 'sky', media: ['air', 'space'], tags: ['radio', 'acid', 'occult', 'tech'], mood: [0.8, 0.3, 0.75], draw: waveSky });
