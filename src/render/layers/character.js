// The song's character on screen (character.js): its diagnosis as the run starts, the cursor's tool announced as it
// picks it up (and the crop's frame closing in), the boss's name and life: a word and a mark each, no sentences (a run
// has no time to read; the rest is on the loading screen and with the results). Over the picture, under the HUD.
import { SIGNS, TOOLS } from '../../character.js';
import { glowDot, kana, smooth } from '../util.js';
import { onStage } from '../stage.js';
import { tr, trName } from '../../i18n.js';
import { icon } from '../icons.js';

// the easter eggs' lines (shown with the results: ui/results.js; a run has no time to read them)
export const EGGS = {
  128: '128 BPM. the simulation approves.',
  420: '4:20. the simulation is relaxed about it.',
  remix: 'a remix. the simulation has heard the original.',
  short: 'short song. speedrun the simulation.',
  hyper: 'over 168 BPM. the simulation overclocks.',
  slow: 'under 80 BPM. the simulation yawns.',
  self: 'a song about the simulation. it is flattered.',
};

const FONT = (px, w = 900) => `${w} ${Math.round(px)}px Unbounded, 'Arial Black', sans-serif`;

// a card over the picture: a big word (swelling on the beat, `pulse`), maybe a small line under it, maybe an icon over it
function card(g, W, H, d, a, big, small, y = 0.3, col = '#ffffff', { pulse = 0, mark = null } = {}) {
  if (a <= 0) return;
  g.save();
  g.globalAlpha = a;
  // (on a short screen, a phone held sideways, smaller: the word over the picture, not over what is in his way)
  const k = Math.min(1, H / (560 * d));
  if (mark) icon(g, mark, W / 2, H * y - 52 * d * k, 52 * d * k, col, { pulse });
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  // (each line made to fit the screen's width)
  const fit = (text, px, w) => {
    g.font = FONT(px, w);
    const m = g.measureText(text).width;
    if (m > W * 0.92) g.font = FONT((px * W * 0.92) / m, w);
  };
  // (the big word drawn once at its size off the beat into a sprite of its own, and swollen on the beat by scaling it,
  // as far as the screen's width lets it: a font of a new size each frame and its text measured cost each frame)
  // (its size as the text's own was: the font's whole pixels, swollen, then made to fit the screen's width if too wide)
  const px0 = Math.min(W / 14, 46 * d * k),
    B = bigWord(g, big, px0, W, d, col),
    want = px0 * (1 + 0.06 * pulse),
    p1 = Math.round(want),
    m1 = (B.m0 * p1) / B.r0,
    s = (m1 > W * 0.92 ? Math.round((want * W * 0.92) / m1) : p1) / B.px;
  g.drawImage(B.c, W / 2 - B.ax * s, H * y - B.ay * s, B.c.width * s, B.c.height * s);
  if (small) {
    fit(small, Math.min(W / 34, 17 * d), 700);
    g.lineWidth = 4 * d;
    g.strokeText(small, W / 2, H * y + 38 * d);
    g.fillStyle = '#fff';
    g.fillText(small, W / 2, H * y + 38 * d);
  }
  g.restore();
}
// a card's big word in its sprite: { c, ax, ay (where its middle is in it), px (its font's size in it), r0 and m0 (the
// font's size at the card's size and the word's width at it, unfitted) }; the last few kept
const BIG = new Map();
function bigWord(g, text, px0, W, d, col) {
  const key = `${text}|${Math.round(px0)}|${W}|${d}|${col}`;
  let b = BIG.get(key);
  if (b) return b;
  const x = document.createElement('canvas').getContext('2d');
  x.font = FONT(px0, 900);
  const m0 = x.measureText(text).width;
  let px = px0,
    m = m0;
  // (too wide for the screen at its size: made to fit)
  if (m > W * 0.92) {
    px = (px0 * W * 0.92) / m;
    x.font = FONT(px, 900);
    m = x.measureText(text).width;
  }
  const lw = 6 * d,
    w = Math.ceil(m + 2 * lw + 8),
    h = Math.ceil(Math.round(px) * 1.6 + 2 * lw);
  Object.assign(x.canvas, { width: w, height: h });
  x.font = FONT(px, 900);
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.lineJoin = 'round';
  x.strokeStyle = '#000';
  x.lineWidth = lw;
  x.strokeText(text, w / 2, h / 2);
  x.fillStyle = col;
  x.fillText(text, w / 2, h / 2);
  b = { c: x.canvas, ax: w / 2, ay: h / 2, px: Math.round(px), r0: Math.round(px0), m0 };
  if (BIG.size >= 12) BIG.delete(BIG.keys().next().value);
  BIG.set(key, b);
  return b;
}
// the run's cards made before it starts (drawCharacter's words in their colours), at the screen's size now
export function warmCards(f) {
  const { L, v, T } = f,
    ch = L.ch;
  if (!ch) return;
  const d = v.dpr,
    k = Math.min(1, v.H / (560 * d)),
    px = Math.min(v.W / 14, 46 * d * k),
    g = f.g;
  bigWord(g, tr(SIGNS[ch.sign].name), px, v.W, d, T.line);
  for (const q of L.tools ?? []) bigWord(g, tr(TOOLS[q.tool].name), px, v.W, d, '#ff4fd8');
  if (L.boss) bigWord(g, trName(L.boss.name), px, v.W, d, '#ff2b3a');
}
// in for a quarter second, out over the last half
const span = (t, t0, t1) => Math.min(smooth(t0, t0 + 0.25, t), 1 - smooth(t1 - 0.5, t1, t));

export function drawCharacter(f) {
  const { g, v, L, t, run: R, T } = f,
    ch = L.ch;
  if (!ch) return;
  const W = v.W,
    H = v.H,
    d = v.dpr;
  // the crop: the frame closing in from both sides through its act, with the crop tool's handles; never over him (on a
  // tall screen he runs close to an edge)
  const tl = L.tools?.find(q => t >= q.t0 - 1 && t < q.t1 + 1);
  if (tl?.tool === 'crop') {
    const u = Math.min(smooth(tl.t0, tl.t0 + 2 * L.A.beat, t), 1 - smooth(tl.t1 - L.A.beat, tl.t1, t)) * (0.16 + 0.04 * f.mf.beat),
      hx = f.spots?.hero?.[0],
      w = Math.min(W * u, hx === undefined ? W : Math.min(hx, W - hx) - 36 * d);
    if (w > 1) {
      g.fillStyle = 'rgba(0,0,0,0.92)';
      g.fillRect(0, 0, w, H);
      g.fillRect(W - w, 0, w, H);
      g.strokeStyle = '#fff';
      g.lineWidth = 2 * d;
      g.setLineDash([8 * d, 6 * d]);
      g.strokeRect(w, 2 * d, W - 2 * w, H - 4 * d);
      g.setLineDash([]);
      g.lineWidth = 5 * d;
      for (const [x, y, sx, sy] of [[w, 0, 1, 1], [W - w, 0, -1, 1], [w, H, 1, -1], [W - w, H, -1, -1]]) {
        g.beginPath();
        g.moveTo(x, y + sy * 40 * d);
        g.lineTo(x, y + sy * 4 * d);
        g.lineTo(x + sx * 40 * d, y + sy * 4 * d);
        g.stroke();
      }
    }
  }
  // the diagnosis as the run starts: its one word (the whole of it was on the loading screen: main.js)
  const S = SIGNS[ch.sign],
    pulse = f.mf.beat;
  card(g, W, H, d, span(t, 0.4, 2.4), tr(S.name), '', 0.3, T.line, { pulse });
  // each tool as the cursor picks it up: its mark and its name
  for (const q of L.tools ?? []) card(g, W, H, d, span(t, q.t0, q.t0 + 2), tr(TOOLS[q.tool].name), '', 0.3, '#ff4fd8', { pulse, mark: { undo: 'undo', crop: 'scissors', rotate: 'rotate', zoom: 'zoom', errors: 'error', lasso: 'lasso' }[q.tool] });
  // the boss: its name as it comes, then its life along the top
  const B = L.boss;
  if (B && t >= B.t0 && t < B.t1 + 2) {
    card(g, W, H, d, span(t, B.t0, B.t0 + 3), trName(B.name), '', 0.3, '#ff2b3a', { pulse: f.mf.beat, mark: 'fist' });
    const left = Math.max(0, B.hp - (R.bossHits ?? 0)),
      bw = Math.min(W * 0.5, 520 * d),
      x0 = (W - bw) / 2,
      y0 = 56 * d,
      a = Math.min(smooth(B.t0, B.t0 + 1, t), 1 - smooth(B.t1, B.t1 + 2, t));
    g.save();
    g.globalAlpha = a;
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.fillRect(x0, y0, bw, 12 * d);
    g.fillStyle = left ? '#ff2b3a' : '#ffd84a';
    g.fillRect(x0, y0, (bw * left) / Math.max(1, B.hp), 12 * d);
    g.strokeStyle = '#fff';
    g.lineWidth = 1.5 * d;
    g.strokeRect(x0, y0, bw, 12 * d);
    g.font = FONT(12 * d, 800);
    g.textAlign = 'center';
    g.fillStyle = '#fff';
    g.fillText(left ? trName(B.name) : tr('{name} — DELETED', { name: trName(B.name) }), W / 2, y0 - 6 * d);
    g.restore();
  }
}

// the ending (character.js) behind him: the world deleted to a white void, pixel by pixel, while he stands; a beam of
// light he leaps into; a sunrise
export function drawFinale(f) {
  const { g, v, L, t, run: R } = f,
    F = L.finale;
  if (!F || F.kind === 'knee' || t < F.t0) return;
  const W = v.W,
    H = v.H,
    m = v.ppm;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (F.kind === 'delete') {
    // (the selection over all of it first, marching ants; then the void, the world dissolving into it in blocks)
    const sel = smooth(F.t0, F.jump, t),
      u = smooth(F.hit, F.hit + 1.2, t);
    if (t < F.hit && sel > 0) {
      g.setLineDash([10 * v.dpr, 8 * v.dpr]);
      g.lineDashOffset = -t * 60 * v.dpr;
      g.strokeStyle = '#fff';
      g.lineWidth = 3 * v.dpr;
      g.strokeRect(W * 0.04, H * 0.04, (W * 0.92) * sel, H * 0.92 * sel);
      g.setLineDash([]);
      g.fillStyle = `rgba(80,140,255,${0.18 * sel})`;
      g.fillRect(W * 0.04, H * 0.04, W * 0.92 * sel, H * 0.92 * sel);
    }
    if (u > 0) {
      const q = Math.max(16, Math.round(m * 0.6)),
        cols = Math.ceil(W / q),
        rows = Math.ceil(H / q);
      g.fillStyle = '#f2f3f7';
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
          if ((h % 1000) / 1000 < u) g.fillRect(x * q, y * q, q + 1, q + 1);
        }
    }
  } else if (F.kind === 'ascend') {
    // (a beam down onto where he leaps, widening as he goes up into it)
    const u = smooth(F.t0, F.jump, t),
      X = v.sx(onStage(f.heroSeg, R.heroX(Math.max(0, t)))),
      w = (1.2 + 1.4 * smooth(F.jump, F.hit, t)) * m,
      gr = g.createLinearGradient(X - w, 0, X + w, 0);
    gr.addColorStop(0, 'rgba(255,240,200,0)');
    gr.addColorStop(0.5, `rgba(255,244,214,${0.75 * u})`);
    gr.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = gr;
    g.fillRect(X - w, 0, 2 * w, H);
    g.fillStyle = `rgba(255,250,235,${0.35 * smooth(F.hit, F.land + 1, t)})`;
    g.fillRect(0, 0, W, H);
  } else if (F.kind === 'dawn') {
    // (the sun coming up behind him and the light warming the whole picture)
    const u = smooth(F.t0, F.end, t),
      sy = H * (1.05 - 0.55 * u),
      gr = g.createRadialGradient(W * 0.62, sy, 0, W * 0.62, sy, H * 0.9);
    gr.addColorStop(0, `rgba(255,236,170,${0.95 * u})`);
    gr.addColorStop(0.12, `rgba(255,190,110,${0.7 * u})`);
    gr.addColorStop(1, 'rgba(255,140,90,0)');
    g.globalCompositeOperation = 'screen';
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
  }
  g.restore();
}

// the secrets behind the world (level.js's L.secret): the sky falling through a drop, meteors on the beats
export function drawSecretSky(f) {
  const sc = f.L.secret;
  if (sc?.kind !== 'meteor' || f.t < sc.t0 || f.t > sc.t1 + 2) return;
  const { g, v, t, L } = f,
    b = L.A.beat;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.lineCap = 'round';
  for (let k = Math.floor((t - sc.t0) / b) - 3; k <= Math.floor((t - sc.t0) / b); k++) {
    const t0 = sc.t0 + k * b;
    if (k < 0 || t0 > sc.t1) continue;
    const u = (t - t0) / (b * 2.5);
    if (u < 0 || u > 1) continue;
    const h = ((k * 2654435761) >>> 0) / 4294967296,
      x0 = v.W * (0.2 + 1.0 * h),
      x = x0 - u * v.W * 0.5,
      y = -v.H * 0.1 + u * v.H * 0.75,
      len = 0.12 * v.W;
    g.strokeStyle = 'rgba(255,190,110,0.5)';
    g.lineWidth = 0.015 * v.H;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + len, y - len * 1.5);
    g.stroke();
    glowDot(g, x, y, 0.05 * v.H, '#ffd08a', 0.9);
    // (its impact on the horizon, a flash)
    if (u > 0.92) glowDot(g, x, y, 0.2 * v.H * (u - 0.92) * 12, '#ffb347', 1 - (u - 0.92) * 12);
  }
  g.restore();
}
// the source's door (a secret): a doorway of green light on the roof on its beat, code spilling from it; it shows from
// four beats before
export function drawSecretDoor(f) {
  const sc = f.L.secret;
  if (sc?.kind !== 'source' || f.t < sc.t0 || f.t > sc.door + 0.5 || f.run.secretT) return;
  const { g, v, t, L, mf } = f,
    s = L.segAt(sc.door),
    m = v.ppm,
    X = v.sx(onStage(s, L.xAt(sc.door) + 0.4)),
    Y = v.sy(s.y0),
    a = smooth(sc.t0, sc.t0 + L.A.beat, t) * (0.6 + 0.4 * mf.beat);
  g.save();
  g.globalAlpha = a;
  glowDot(g, X, Y - 1.2 * m, 1.6 * m, '#3dff7a', 0.6);
  g.fillStyle = 'rgba(10,40,20,0.85)';
  g.fillRect(X - 0.45 * m, Y - 2.3 * m, 0.9 * m, 2.3 * m);
  g.strokeStyle = '#5dff8f';
  g.lineWidth = 0.06 * m;
  g.strokeRect(X - 0.45 * m, Y - 2.3 * m, 0.9 * m, 2.3 * m);
  // (the glyphs stamped from their atlas, util.js kana)
  const px = Math.round(0.22 * m);
  for (let k = 0; k < 6; k++) kana(g, (k * 13 + Math.floor(t * 10)) % 90, X + ((k % 3) - 1) * 0.25 * m, Y - (0.3 + k * 0.33) * m, px, '#5dff8f');
  g.restore();
}
