// Small pure helpers shared by the drawing modules.
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, u) => a + (b - a) * u;
// a canvas point (x, y) where it lands on the screen through the context's transform now
export const onScreen = (g, x, y) => {
  const T = g.getTransform();
  return [T.a * x + T.c * y + T.e, T.b * x + T.d * y + T.f];
};
// 0 before a, 1 after b, a smooth step between
export const smooth = (a, b, t) => {
  const u = clamp((t - a) / (b - a || 1e-6), 0, 1);
  return u * u * (3 - 2 * u);
};
// a stable pseudo-random number in [0, 1) for two integers (windows, buildings: the same every frame)
export const hash = (a, b = 0) => {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
// (each colour's strings kept, by alpha in 255ths (what the canvas keeps of it): a new string per call was an eighth of
// all a frame allocated)
const RGBA = new Map();
export const rgba = (hex, a) => {
  let row = RGBA.get(hex);
  if (!row) {
    if (RGBA.size >= 4096) RGBA.clear();
    row = new Array(256);
    row.n = parseInt(hex.slice(1), 16);
    RGBA.set(hex, row);
  }
  const n = row.n;
  // (no alpha (NaN): as before, a colour the canvas ignores)
  if (a !== a) return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},NaN)`;
  const i = Math.round(clamp(a, 0, 1) * 255);
  return (row[i] ??= `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${i / 255})`);
};
function mixNow(a, b, u) {
  const p = parseInt(a.slice(1), 16),
    q = parseInt(b.slice(1), 16),
    c = s => Math.round(((p >> s) & 255) * (1 - u) + ((q >> s) & 255) * u);
  // (as hex, so that it can be mixed again or given an alpha by rgba())
  return '#' + ((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0');
}
// (each mix kept, by its two colours and how far (in 1024ths, past what a channel shows): the places mix their colours
// toward the palette's on every frame, and a new string each time was much of what a frame allocated)
const MIX = new Map();
let mixed = 0;
export const mixHex = (a, b, u) => {
  const i = Math.round(u * 1024);
  if (!(i >= 0 && i <= 1024)) return mixNow(a, b, u);
  let byA = MIX.get(a);
  if (!byA) {
    if (mixed > 60000) (MIX.clear(), (mixed = 0));
    MIX.set(a, (byA = new Map()));
  }
  let row = byA.get(b);
  if (!row) byA.set(b, (row = []));
  let out = row[i];
  if (out === undefined) {
    out = row[i] = mixNow(a, b, i / 1024);
    mixed++;
  }
  return out;
};
// a 0..1 bump on every beat (the cursor's tease, the idle bob)
export const beatBump = (t, beat0, beat) => Math.max(0, Math.sin(((t - beat0) * Math.PI) / beat)) ** 6;
// draw something that must read the right way round (text, the mouse pointer) at screen x X, even in a mirrored frame
// (whatever turned the frame, a stretch run to -x, a mirror act, a ceiling act turning the world over, or two of them:
// read off the canvas's own transform, and undone about (X, Y) so words read the right way round and the right way up;
// `flip` is kept for the callers that say which way they read)
export function upright(g, flip, X, draw, Y = null) {
  const m = g.getTransform(),
    hx = m.a < 0,
    // (turned upright only where the caller says about which height)
    vy = Y !== null && m.d < 0;
  if (!hx && !vy) return draw();
  g.save();
  unmirror(g, X, Y ?? 0, hx, vy);
  draw();
  g.restore();
}
// the frame's mirrorings undone about (X, Y), in place (the caller saves and restores)
export function unmirror(g, X, Y, hx = g.getTransform().a < 0, vy = g.getTransform().d < 0) {
  g.translate(X, Y);
  g.scale(hx ? -1 : 1, vy ? -1 : 1);
  g.translate(-X, -Y);
}
// the 90 katakana of the source's code (U+30A0 on) in 'Courier New', which has none of them: the browser searches the
// system's fonts for each the first time it is drawn (90-180 ms on the frame a secret door or the source's rain first
// shows), so they are drawn once, at load (warmKana), into an atlas per colour at KPX px, and then only stamped, scaled
const KANA = new Map(),
  KPX = 48,
  KW = Math.ceil(KPX * 1.4),
  KH = Math.ceil(KPX * 1.5),
  KB = Math.round(KPX * 1.15);
function kanaAtlas(col) {
  let c = KANA.get(col);
  if (c) return c;
  c = Object.assign(document.createElement('canvas'), { width: KW * 10, height: KH * 9 });
  const x = c.getContext('2d');
  x.font = `700 ${KPX}px 'Courier New', monospace`;
  x.textAlign = 'center';
  x.fillStyle = col;
  for (let i = 0; i < 90; i++) x.fillText(String.fromCharCode(0x30a0 + i), (i % 10) * KW + KW / 2, Math.floor(i / 10) * KH + KB);
  KANA.set(col, c);
  return c;
}
// the atlases for these colours made now (at load)
export const warmKana = cols => cols.forEach(kanaAtlas);
// katakana i (0..89) as fillText would draw it at px (textAlign centre, alphabetic baseline) at (x, y) in colour col
// (an opaque colour; a faded one is the opaque one under globalAlpha)
export function kana(g, i, x, y, px, col) {
  const s = px / KPX;
  g.drawImage(kanaAtlas(col), (i % 10) * KW, Math.floor(i / 10) * KH, KW, KH, x - (KW / 2) * s, y - KB * s, KW * s, KH * s);
}
// a soft round glow: colour col at alpha a in the middle to clear at radius r, as a radial gradient filled over its
// square draws it; the gradient drawn once per colour into a sprite and stamped under the alpha (a gradient made for
// every glow of every frame was most of a frame's gradients)
const GLOWS = new Map();
// (the glows' sprites: 64 px canvases kept by colour, the colour read to 5 bits a channel (a soft glow 4/255 off is the
// same glow; the palettes crossfading between acts made a new one at each of their steps), at most 256 of each kind;
// past that the oldest one's canvas is painted again for the new colour, and spare ones are made while the song loads
// (warmGlows), so none is made while it plays)
const SPARE = [];
const glowKey = col => {
  if (typeof col !== 'string' || col[0] !== '#' || col.length !== 7) return col;
  const n = parseInt(col.slice(1), 16);
  return ((n >> 19) & 31) * 1024 + ((n >> 11) & 31) * 32 + ((n >> 3) & 31);
};
function glowCanvas(store, key) {
  let c = null;
  if (store.size >= 256) {
    const old = store.keys().next().value;
    c = store.get(old);
    store.delete(old);
  }
  c ??= SPARE.pop() ?? Object.assign(document.createElement('canvas'), { width: 64, height: 64 });
  const x = c.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.clearRect(0, 0, 64, 64);
  store.set(key, c);
  return c;
}
// spare glow canvases made now (while a song loads), up to n
export function warmGlows(n = 96) {
  while (SPARE.length < n) SPARE.push(Object.assign(document.createElement('canvas'), { width: 64, height: 64 }));
}
export function softGlow(g, X, Y, r, col, a) {
  // (what the gradient would not draw, or would throw on, left to it)
  if (!(r >= 0) || a !== a || typeof col !== 'string' || col[0] !== '#') {
    const gr = g.createRadialGradient(X, Y, 0, X, Y, r);
    gr.addColorStop(0, rgba(col, a));
    gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr;
    g.fillRect(X - r, Y - r, r * 2, r * 2);
    return;
  }
  if (a <= 0 || r === 0) return;
  const key = glowKey(col);
  let c = GLOWS.get(key);
  if (!c) {
    // (64 px: its alpha falls off in a straight line, which a stretched sprite keeps)
    c = glowCanvas(GLOWS, key);
    const x = c.getContext('2d'),
      gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, rgba(col, 1));
    gr.addColorStop(1, rgba(col, 0));
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
  }
  const ga = g.globalAlpha;
  g.globalAlpha = ga * Math.min(1, a);
  g.drawImage(c, X - r, Y - r, r * 2, r * 2);
  g.globalAlpha = ga;
}
// a soft round glow of colour col, a ra-sized sprite drawn once per colour and blitted (a blurred shadow
// (shadowBlur) is drawn anew every time and is the slowest thing a 2D canvas does: MDN, "Optimizing canvas")
const SPRITES = new Map();
export function glowDot(g, X, Y, r, col, a = 1) {
  if (a <= 0.01 || r <= 0) return;
  const key = glowKey(col);
  let c = SPRITES.get(key);
  if (!c) {
    c = glowCanvas(SPRITES, key);
    const x = c.getContext('2d'),
      gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, col);
    gr.addColorStop(0.35, col);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    // (only what fades: the middle of a glow is soft too)
    x.globalCompositeOperation = 'destination-in';
    const fade = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    fade.addColorStop(0, 'rgba(0,0,0,0.9)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = fade;
    x.fillRect(0, 0, 64, 64);
    x.globalCompositeOperation = 'source-over';
  }
  const ga = g.globalAlpha;
  g.globalAlpha = ga * Math.min(1, a);
  g.drawImage(c, X - r, Y - r, r * 2, r * 2);
  g.globalAlpha = ga;
}
