// What the places share: parallax rows, the ground's slab and its underside, a shaft's air, and the glowing edge every running
// surface has (it flashes on the kick, so the floor plays the song in every place).
import { LANE } from '../../run.js';
import { clamp, hash, mixHex, rgba, softGlow } from '../util.js';
import { at, eased, fieldOf, timeAt } from '../physics.js';

// how big a thing of a row at parallax `par` is drawn (1 at par 0.5 and nearer): in perspective both how fast a thing
// passes and how big it looks go as 1/Z, so a far row drawn at the metres of his own reads as a flat card; the true 1/Z
// (par itself) would leave the far rows specks, so they shrink only toward 0.55 (a TV tower at par 0.08 to 0.62 of its
// metres); a big landmark more gently still (MARK_DEPTH), so it keeps reading from far off
export const depth = par => 0.55 + 0.45 * Math.min(1, Math.max(0, par) / 0.5);
export const MARK_DEPTH = par => 0.7 + 0.3 * Math.min(1, Math.max(0, par) / 0.5);
// a background row at parallax `par` (0 far .. 1 with him): its base line on screen, and stage x -> screen x. It rests
// on the roof he is on (v.rest, stage.js) and moves only with the camera's swing about it, so after any number of shafts
// the skyline is where it was. Drawn `s` of its size (depth): the row's things are drawn in metres as ever (X, base,
// v.ppm) in the row's frame, which shrinks them about the line of the roof at rest (the horizon: what stood below it
// still stands below it, nothing floats) and about the middle of the screen across; x0..x1 the row's distance in view
// then (L..R its screen's edges in the frame), passing at par of the camera's speed whatever its size. In the place's
// background (sky.js drawBack, f.rowFrame) a row takes its frame as it is made, for all its place draws of it after;
// elsewhere only what r.on draws (cells, landmark) is in it
export function row(f, par, s = depth(par)) {
  const { v, g } = f,
    m = v.ppm,
    // (up and down half as much as across, as it always was: rows moved by the whole depth went out of the picture)
    base = v.H * 0.92 + ((v.y - (v.rest ?? 0)) * m * par) / 2,
    ay = base - ((v.roofUp ?? 0.3) - 0.08) * v.H,
    ax = v.W / 2,
    xr = (v.x * par) / s,
    x0 = xr - (ax * (1 - s)) / (s * m),
    F = f.rowFrame;
  const r = { base, X: x => (x - xr) * m, x0, x1: x0 + v.vw / s, f, par, s, k: par / s, ax, ay, inside: false };
  r.L = r.X(r.x0);
  r.R = r.X(r.x1);
  // (and back: the row's distance at a screen x of its frame; B a depth in its frame below the screen's bottom, for what
  // is filled down out of sight)
  r.x = X => xr + X / m;
  r.B = ay + (1.5 * v.H - ay) / s;
  // (the frame: shrunk about (ax, ay) from the background's own transform, or from the one it is drawn in)
  const frame = () => {
    if (F) g.setTransform(F.T0);
    if (s === 1) return;
    g.translate(ax, ay);
    g.scale(s, s);
    g.translate(-ax, -ay);
  };
  if (F) frame();
  // (draw(): the row's things in its frame; a call inside another draws in the one frame)
  r.on = draw => {
    if (r.inside || (s === 1 && !F)) return draw();
    const T = g.getTransform();
    frame();
    r.inside = true;
    try {
      return draw();
    } finally {
      r.inside = false;
      g.setTransform(T);
    }
  };
  return r;
}
// what a place draws over its rows across the screen (flocks, petals, sparks rising): back in the world's own frame, out
// of the last row's
export function flat(f) {
  if (f.rowFrame) f.g.setTransform(f.rowFrame.T0);
}
// the world's stage when a thing of a row at row distance x came into view, as the camera brought it in at the edge he
// runs towards (a pure function of the time: the field's distance run, inverted); what the song's growth adds to a row
// is decided by it, so a thing never grows out of the air or vanishes in sight: it is there or not as it comes in
export function stageSeen(r, x) {
  const { f, par } = r,
    F = f && fieldOf(f),
    s = f?.heroSeg ?? f?.seg;
  if (!F || !s?.st) return f?.mf?.stage ?? 0;
  const { v } = f,
    st = s.st,
    t = f.t;
  let te = s.t0;
  if (!f.L.vertical(s) && par > 1e-3) {
    // (the camera's x when the thing was at the leading edge, a metre out; the distance he had run then: the row's
    // distance in view is x0..x1, x0 the camera's x times k, and `off`)
    const mg = 1,
      k = r.k ?? par,
      off = r.x0 - v.x * k,
      span = r.x1 - r.x0,
      cx = st.dir > 0 ? (x - mg - off - span) / k : (x + mg - off) / k,
      d = st.dir > 0 ? st.d0 + (cx + v.lead - st.ox) : st.d0 + (st.ox - (cx + v.vw - v.lead));
    te = timeAt(F, d);
  }
  return at(F, 'St', clamp(te, Math.min(s.t0, t), t));
}
// for each cell of width w along a row: i (stable index), X (screen), u (0..1 stable random), and seen() the world's
// stage when the cell came into view (stageSeen)
export function cells(r, w, fn) {
  // (one seen() for the row, asked about the cell being drawn: no new function a cell a frame)
  let cur = 0;
  const seen = () => stageSeen(r, cur * w);
  // (in the row's frame: shrunk by its depth, r.on)
  const each = () => {
    for (let i = Math.floor(r.x0 / w) - 1; i < r.x1 / w + 2; i++) {
      cur = i;
      fn(i, r.X(i * w), hash(i, Math.round(w * 100)), seen);
    }
  };
  if (r.on) r.on(each);
  else each();
}
// the running surface from a to b at height y: a slab of `body` with a lit top strip and the edge glowing on the kick
export function slab(f, a, b, y, body, top) {
  const { g, v } = f;
  a = Math.max(a, v.x - 2);
  b = Math.min(b, v.x + v.vw + 2);
  if (b <= a) return null;
  const X0 = v.sx(a),
    X1 = v.sx(b),
    Y = v.sy(y);
  g.fillStyle = body;
  g.fillRect(X0, Y, X1 - X0, v.H * 2);
  g.fillStyle = top;
  g.fillRect(X0, Y, X1 - X0, 0.22 * v.ppm);
  return { a, b, X0, X1, Y };
}
export function edge(f, s, col = f.T.line) {
  const { g, v, mf } = f;
  g.fillStyle = col;
  // (its glow: a wide faint band under the bright line, no blur)
  if (f.glow) {
    g.globalAlpha = 0.18 + 0.25 * mf.kick;
    const hw = (0.12 + 0.25 * mf.kick) * v.ppm;
    g.fillRect(s.X0, s.Y - hw, s.X1 - s.X0, hw * 2);
  }
  g.globalAlpha = 0.6 + 0.4 * mf.kick;
  g.fillRect(s.X0, s.Y - (0.03 + 0.03 * mf.kick) * v.ppm, s.X1 - s.X0, (0.06 + 0.04 * mf.kick) * v.ppm);
  g.globalAlpha = 1;
}
// the level's underside: each running surface is a slab of the simulation floating in the sky, THICK m deep (its
// place's ground drawn down to there), its underside in shadow with struts and a strip of light under it on the kick;
// seen only from a shaft, flying up to it or falling away from it
export const THICK = 4.5;
export function underside(f, a, b, y, body) {
  const { g, v, mf, T } = f;
  a = Math.max(a, v.x - 2);
  b = Math.min(b, v.x + v.vw + 2);
  if (b <= a) return;
  const X0 = v.sx(a),
    X1 = v.sx(b),
    Y = v.sy(y - THICK),
    sh = g.createLinearGradient(0, Y - 1.6 * v.ppm, 0, Y);
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = sh;
  g.fillRect(X0, Y - 1.6 * v.ppm, X1 - X0, 1.6 * v.ppm);
  // struts hanging under it, a light at each end pulsing on the beat
  for (let k = Math.ceil(a / 2.4); k < b / 2.4; k++) {
    const x = k * 2.4,
      len = 0.4 + 0.9 * hash(k, 41);
    g.fillStyle = mixHex(body, '#000000', 0.45);
    g.fillRect(v.sx(x) - 0.06 * v.ppm, Y, 0.12 * v.ppm, len * v.ppm);
    glow(g, v.sx(x), Y + len * v.ppm, (0.25 + 0.3 * mf.beat) * v.ppm, T.line, 0.35 + 0.5 * mf.beat);
  }
  g.fillStyle = rgba(T.line, 0.35 + 0.6 * mf.kick);
  g.fillRect(X0, Y - 0.05 * v.ppm, X1 - X0, 0.05 * v.ppm);
}
// a cut through a level (a gap, a deleted floor, a hatch): its two faces lit, glitching for a moment after the cut
export function cutFace(f, x, y, side, fresh = 0) {
  const { g, v, mf, T } = f,
    X = v.sx(x);
  g.fillStyle = rgba(T.line, 0.5 + 0.5 * mf.kick);
  g.fillRect(side < 0 ? X - 0.05 * v.ppm : X, v.sy(y), 0.05 * v.ppm, THICK * v.ppm);
  for (let i = 0; i < 4 * fresh; i++) {
    const u = hash(Math.floor(f.t * 30) + i, Math.round(x * 10));
    g.fillStyle = i % 2 ? 'rgba(255,43,58,0.85)' : 'rgba(41,231,255,0.85)';
    g.fillRect(X + side * u * 0.3 * v.ppm, v.sy(y - u * THICK), (0.1 + 0.3 * u) * v.ppm * side, 3 * v.dpr);
  }
}
// the air of a shaft: his three lanes as faint rails of light pulsing on the beat (brighter on the downbeat), and the
// simulation's dust streaming past (streaks as long as he is fast), so the drop is felt with no wall to fall past
export function air(f, s, speed) {
  const { g, v, mf, T } = f;
  for (let l = 0; l < 4; l++) {
    const X = v.sx(s.x + (l - 1.5) * LANE),
      gr = g.createLinearGradient(0, 0, 0, v.H);
    gr.addColorStop(0, rgba(T.line, 0));
    gr.addColorStop(0.5, rgba(T.line, 0.12 + 0.25 * mf.beat + 0.3 * mf.down));
    gr.addColorStop(1, rgba(T.line, 0));
    g.fillStyle = gr;
    g.fillRect(X - v.dpr, 0, 2 * v.dpr, v.H);
  }
  const step = 0.9,
    y0 = Math.floor(v.y / step) - 1,
    len = Math.min(3, 0.08 * speed) * v.ppm;
  for (let k = y0; k < y0 + v.vh / step + 3; k++) {
    const u = hash(k, 17),
      x = s.x + (u - 0.5) * 14,
      Y = v.sy(k * step + hash(k, 5) * step);
    g.fillStyle = k % 3 ? rgba('#ffffff', 0.12 + 0.2 * mf.hat) : rgba(T.win[k % 3 === 0 ? 0 : 1], 0.3 + 0.4 * mf.kick);
    g.fillRect(v.sx(x), Y - len / 2, (1 + 2 * hash(k, 9)) * v.dpr, len);
  }
}
// a soft round glow (util.js softGlow: a sprite per colour, not a gradient per call)
export function glow(g, X, Y, r, col, a) {
  softGlow(g, X, Y, r, col, a);
}

// the sun and the moon at the hour the song has got to (look.day: between two hours of its path): the sun high and
// small by day, low and huge at dusk and dawn, sinking out of sight into the night while the moon comes up, and back;
// both breathe with the bass and the voice. `style` may draw them its own way (a striped synthwave sun)
const SUN = { day: [0.72, 0.16, 0.9], dusk: [0.66, 0.5, 2], dawn: [0.3, 0.52, 1.6] },
  SUNCOL = { day: '#fff6d8', dusk: '#ffc27a', dawn: '#ffc27a' };
export function celestial(f, style) {
  const { g, v, mf, look } = f,
    d = look.day ?? { a: look.time, b: look.time, u: 0 };
  if (d.a === 'space' || d.a === 'deep') return;
  // (where the sun is at an hour: at night, set: below the horizon, where the last hour had it)
  const at = (h, other) => SUN[h] ?? [...(SUN[other] ?? SUN.dusk).slice(0, 1), 1.25, (SUN[other] ?? SUN.dusk)[2]],
    pa = at(d.a, d.b),
    pb = at(d.b, d.a),
    u = d.u * d.u * (3 - 2 * d.u),
    pos = pa.map((x, k) => x + (pb[k] - x) * u),
    night = look.night ?? (look.time === 'night' ? 1 : 0),
    // (a body that big hardly swells: 3 % at most, the bass through its spring; its light does the rest)
    bs = eased(f, 'B', mf.bass),
    swell = 1 + 0.02 * bs + 0.01 * mf.voice;
  if (night > 0) {
    const X = v.W * 0.74,
      Y = v.H * (0.2 + 0.5 * (1 - night)),
      r = v.ppm * 0.75 * swell;
    g.globalAlpha = night;
    glow(g, X, Y, r * (3 + 2 * mf.voice + 0.6 * bs), '#e8f0ff', 0.18 + 0.15 * mf.kick + 0.25 * mf.voice);
    if (style) style(g, X, Y, r, true);
    else {
      g.fillStyle = '#e8f0ff';
      g.beginPath();
      g.arc(X, Y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }
  if (pos[1] > 1.1) return;
  const X = v.W * pos[0],
    Y = v.H * pos[1],
    r = v.ppm * pos[2] * swell,
    col = d.u < 0.5 ? SUNCOL[d.a] ?? SUNCOL[d.b] : SUNCOL[d.b] ?? SUNCOL[d.a];
  glow(g, X, Y, r * (3 + 2 * mf.voice + 0.6 * bs), col, 0.35 + 0.15 * mf.kick + 0.25 * mf.voice);
  if (style) return style(g, X, Y, r, false);
  g.fillStyle = col;
  g.beginPath();
  g.arc(X, Y, r, 0, Math.PI * 2);
  g.fill();
}
// a landmark repeated far off: one every `every` metres at parallax `par` where the hash lets it be, drawn by
// draw(X, base, i) in its row's frame (shrunk by MARK_DEPTH: a big thing far off keeps more of its size)
export function landmark(f, par, every, chance, salt, draw) {
  // (the frame it was called in given back after: a landmark drawn among a row's things leaves them in theirs)
  const T = f.rowFrame && f.g.getTransform(),
    r = row(f, par, MARK_DEPTH(par));
  cells(r, every, (i, X) => {
    if (hash(i, salt) < chance) draw(X, r.base, i);
  });
  if (T) f.g.setTransform(T);
}
// a colour of a place's own, pulled toward the song's palette (so each song's place has its own cast)
export function tint(f, base, toward = f.T.near, u = 0.45) {
  return mixHex(base, toward, u);
}

// ---- pictures painted once and stamped (the pack's places: what stands still is painted into a canvas of its own as
// the song loads, with its shading and texture, and only stamped while it plays; what moves with the music is drawn
// over it, or picked from a few painted poses)
// (kept by name, at most PIC_MAX; past that the oldest one's canvas is painted again for the new one, so a song that
// meets one late makes no new canvas)
const PICS = new Map(),
  PIC_MAX = 220;
let picPixels = 0;
// the picture called `key` (its name with all it depends on: its colours, its size step), w x h px, painted by
// paint(g, w, h) the first time
export function pic(key, w, h, paint) {
  let c = PICS.get(key);
  if (c) return c;
  w = Math.max(1, Math.ceil(w));
  h = Math.max(1, Math.ceil(h));
  if (PICS.size >= PIC_MAX || picPixels > 24e6) {
    const old = PICS.keys().next().value;
    c = PICS.get(old);
    PICS.delete(old);
    picPixels -= c.width * c.height;
    Object.assign(c, { width: w, height: h });
  } else c = Object.assign(document.createElement('canvas'), { width: w, height: h });
  picPixels += w * h;
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, w, h);
  paint(g, w, h);
  PICS.set(key, c);
  return c;
}
// a size in pixels as a step of a quarter octave (a picture painted at the step and stamped at the size: the camera
// pulling back and coming in again never paints it anew)
export const sizeStep = px => 2 ** (Math.ceil(Math.log2(Math.max(4, px)) * 4) / 4);
// the palette a place's painted pictures are coloured with: the song's own, or its drop's (a drop repaints the world in
// its colours at once; the acts' drifts in between are the sky's and the lights')
export const steady = f => (f.mf.amp >= 1 || f.run?.od ? (f.look.palDrop ?? f.T) : (f.look.pal ?? f.T));
// a vertical gradient over a shape in a picture being painted (painted once: free while it plays)
export function vgrad(g, y0, y1, stops) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([u, c]) => gr.addColorStop(u, c));
  return gr;
}
// a still thing painted once in metres: a box wM x hM metres with its anchor (axM, ayM) metres in from its top left,
// painted by paint(g, s) at s px a metre with the origin at the anchor; s the camera's scale (m px a metre) taken to
// its quarter-octave step, times `res` (a far thing painted at half the pixels is as sharp as the haze it is in)
export function still(key, m, wM, hM, axM, ayM, paint, res = 1) {
  const s = sizeStep(m * res),
    c = pic(`${key}|${s}`, wM * s, hM * s, g => {
      g.translate(axM * s, ayM * s);
      paint(g, s);
    });
  c.s = s;
  c.ax = axM * s;
  c.ay = ayM * s;
  return c;
}
// a still thing stamped with its anchor at (X, Y) at m px a metre: turned by `rot`, its top leant by `lean` (a shear
// about its anchor: grass in the wind), scaled `sx` across and `sy` up (a bounce, a breath); `below` (screen px) cuts it
// off that far under its anchor (a landmark's foot down to the horizon it stands on)
export function stamp(g, c, X, Y, m, rot = 0, lean = 0, sx = 1, sy = 1, below = Infinity) {
  const k = m / c.s,
    sh = Math.min(c.height, c.ay + below / (k * sy));
  if (sh <= 0) return;
  if (!rot && !lean) {
    g.drawImage(c, 0, 0, c.width, sh, X - c.ax * k * sx, Y - c.ay * k * sy, c.width * k * sx, sh * k * sy);
    return;
  }
  g.save();
  g.translate(X, Y);
  if (rot) g.rotate(rot);
  if (lean) g.transform(1, 0, -lean, 1, 0, 0);
  g.drawImage(c, 0, 0, c.width, sh, -c.ax * k * sx, -c.ay * k * sy, c.width * k * sx, sh * k * sy);
  g.restore();
}
