// The AI's cursor, drawn from its plan (render/cursor-plan.js): what it holds hangs from its hand over the obstacle's
// place (dashed, blinking on the beat), the marquee it drags, the paint off its brush, the click ring of each press;
// when it gets him it shakes with laughter, and when he is dead it comes over to look. Kept inside the screen: it comes
// in from an edge, never from off it.
import { BEAM, beamAt } from '../../kinds.js';
import { drawBeam } from '../shafts/climb.js';
import { clamp, hash, lerp, onScreen, rgba, smooth, upright } from '../util.js';
import { topOf } from '../cursor-plan.js';
import { drawThing } from '../things/index.js';
import { onStage } from '../stage.js';
import { heldProp } from './props.js';

const ARROW = [
  [0, 0],
  [0, 1],
  [0.24, 0.77],
  [0.42, 1.18],
  [0.58, 1.11],
  [0.4, 0.72],
  [0.71, 0.72],
];
// the pointer (engine/sim/render/screen.js drawPointer): an arrow, a closed hand holding, a brush
const TOOLS = {
  arrow(g, u) {
    g.beginPath();
    ARROW.forEach(([x, y], i) => (i ? g.lineTo(x * u, y * u) : g.moveTo(x * u, y * u)));
    g.closePath();
    g.fill();
    g.stroke();
  },
  hand(g, u) {
    g.translate(-0.42 * u, -0.3 * u);
    const part = (x, y, w, h, r) => {
      g.beginPath();
      g.roundRect(x * u, y * u, w * u, h * u, r * u);
      g.fill();
      g.stroke();
    };
    part(0.06, 0.28, 0.74, 0.62, 0.2);
    for (let i = 0; i < 4; i++) part(0.08 + i * 0.17, 0.12, 0.18, 0.36, 0.09);
    part(-0.06, 0.42, 0.24, 0.3, 0.1);
  },
  // (the tools of its desktop it picks up in an act of its own: character.js)
  crop(g, u) {
    g.lineWidth = Math.max(g.lineWidth, u * 0.12);
    g.strokeStyle = '#fff';
    g.beginPath();
    g.moveTo(0.2 * u, -0.1 * u);
    g.lineTo(0.2 * u, 0.8 * u);
    g.lineTo(1.1 * u, 0.8 * u);
    g.moveTo(-0.1 * u, 0.2 * u);
    g.lineTo(0.8 * u, 0.2 * u);
    g.lineTo(0.8 * u, 1.1 * u);
    g.stroke();
  },
  rotate(g, u) {
    g.lineWidth = Math.max(g.lineWidth, u * 0.12);
    g.strokeStyle = '#fff';
    g.beginPath();
    g.arc(0.45 * u, 0.45 * u, 0.4 * u, -2.6, 1.6);
    g.stroke();
    g.beginPath();
    g.moveTo(0.38 * u, 0.6 * u);
    g.lineTo(0.42 * u, 0.98 * u);
    g.lineTo(0.75 * u, 0.82 * u);
    g.fill();
  },
  zoom(g, u) {
    g.lineWidth = Math.max(g.lineWidth, u * 0.12);
    g.strokeStyle = '#fff';
    g.beginPath();
    g.arc(0.4 * u, 0.4 * u, 0.32 * u, 0, Math.PI * 2);
    g.moveTo(0.64 * u, 0.64 * u);
    g.lineTo(1.0 * u, 1.0 * u);
    g.stroke();
  },
  lasso(g, u) {
    g.lineWidth = Math.max(g.lineWidth, u * 0.1);
    g.strokeStyle = '#fff';
    g.beginPath();
    g.ellipse(0.5 * u, 0.35 * u, 0.45 * u, 0.28 * u, -0.3, 0, Math.PI * 2);
    g.moveTo(0.2 * u, 0.6 * u);
    g.quadraticCurveTo(0.1 * u, 0.95 * u, 0.3 * u, 1.1 * u);
    g.stroke();
  },
  undo(g, u) {
    g.lineWidth = Math.max(g.lineWidth, u * 0.14);
    g.strokeStyle = '#fff';
    g.beginPath();
    g.arc(0.55 * u, 0.6 * u, 0.4 * u, Math.PI * 1.1, Math.PI * 2.4);
    g.stroke();
    g.beginPath();
    g.moveTo(0.0 * u, 0.25 * u);
    g.lineTo(0.3 * u, 0.7 * u);
    g.lineTo(0.48 * u, 0.25 * u);
    g.fill();
  },
  errors(g, u) {
    g.fillStyle = '#ffd84a';
    g.beginPath();
    g.moveTo(0.5 * u, 0);
    g.lineTo(1.05 * u, 0.95 * u);
    g.lineTo(-0.05 * u, 0.95 * u);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = '#000';
    g.fillRect(0.45 * u, 0.3 * u, 0.1 * u, 0.38 * u);
    g.fillRect(0.45 * u, 0.75 * u, 0.1 * u, 0.1 * u);
  },
  brush(g, u) {
    g.rotate(-0.7);
    g.beginPath();
    g.roundRect(-0.07 * u, 0.32 * u, 0.14 * u, 0.8 * u, 0.06 * u);
    g.fill();
    g.stroke();
    g.fillStyle = '#ff2b3a';
    g.beginPath();
    g.moveTo(-0.12 * u, 0.34 * u);
    g.quadraticCurveTo(-0.13 * u, 0.08 * u, 0, 0);
    g.quadraticCurveTo(0.13 * u, 0.08 * u, 0.12 * u, 0.34 * u);
    g.closePath();
    g.fill();
    g.stroke();
  },
};

function pointer(f, X, Y, tool, press, spin, tint = null) {
  const { g, v } = f,
    u = Math.max(30 * v.dpr, v.ppm * 0.42) * (1 - 0.14 * press);
  g.save();
  g.translate(X, Y);
  g.rotate(spin);
  g.fillStyle = tint ?? '#fff';
  g.strokeStyle = tint ?? '#000';
  g.lineWidth = Math.max(2 * v.dpr, u * 0.05);
  g.lineJoin = 'round';
  TOOLS[tool](g, u);
  g.restore();
}

// what of a thing the cursor holds: a chord's thing (low, to jump; or hanging, to slide under: its clone comes in after
// it, layers/obstacles.js chord), else the thing itself
const inHand = o => (o.type === 'chord' ? { ...o, type: o.keys[0] === 'jump' ? 'jump' : 'slide', h: o.keys[0] === 'jump' ? o.h : 0 } : o);
function held(f, c, X, Y) {
  const { g, v, mf } = f,
    o = inHand(c.held.o),
    m = v.ppm;
  // (a climb's beam: hung from the hand by its top, leaning as it will be let go)
  if (o.type === 'tic') {
    const B = beamAt(o, o.t - BEAM.T),
      h = (B.look.len / 2) * m;
    g.save();
    g.globalAlpha = c.held.appear;
    drawBeam(g, f.place, X + Math.sin(B.rot) * h, Y + Math.cos(B.rot) * h, B.rot, m, B.look.len, B.look.w, 0.3 * mf.beat, mf, -B.side, B.look.kind);
    g.restore();
    // (and the note of the leap at it rides with it from the first, over the hand: seen as soon as it comes)
    const prev = f.L.obs.find(q => q.type === 'tic' && q.k === o.k - 1 && q.seg === o.seg);
    if (prev && !prev.floor && !prev.res) f.marks?.set(prev, onScreen(g, X, Y - 0.9 * m));
    return;
  }
  // (a prop: a thing on its spot, or a throw's target, layers/props.js)
  if (o.type === 'pick' || o.type === 'throw') {
    g.save();
    g.globalAlpha = c.held.appear;
    heldProp(f, o, X, Y + (o.type === 'pick' ? 0.9 : 0.5) * m);
    g.restore();
    return;
  }
  const top = topOf(o),
    // its outline where it goes (a hanging thing: its board; a standing one: all of it)
    [ox0, ow, oy0, oh] = (o.type === 'slide' ? [-0.6, 1.2, 1.05, 0.45] : o.type === 'grab' ? [-0.7, 1.4, 2.05, 0.2] : [-0.35, 0.7, 0, top / (o.mini ?? 1)]).map(q => q * (o.mini ?? 1));
  g.setLineDash([10 * v.dpr, 7 * v.dpr]);
  g.strokeStyle = `rgba(255,255,255,${0.45 + 0.45 * mf.beat})`;
  g.lineWidth = 2.5 * v.dpr;
  g.strokeRect(v.sx(onStage(o.seg, o.x) + ox0), v.sy(o.y + oy0 + oh), ow * m, oh * m);
  g.setLineDash([]);
  // hung from the hand by its top (facing the way its stretch runs)
  const base = Y + top * m - 0.02 * m;
  g.save();
  g.globalAlpha = c.held.appear;
  upright(g, o.seg.st.dir, X, () => drawThing(f, o, X, base));
  g.restore();
  if (c.held.appear < 1) {
    g.fillStyle = `rgba(255,255,255,${0.7 * (1 - c.held.appear)})`;
    g.beginPath();
    g.arc(X, Y + m * 0.3, m * 0.6, 0, Math.PI * 2);
    g.fill();
  }
}

function marquee(f, b) {
  const { g, v, mf, t } = f,
    X0 = v.sx(b.x0),
    Y0 = v.sy(b.y0),
    X1 = v.sx(b.x1),
    Y1 = v.sy(b.y1);
  g.fillStyle = b.kill ? `rgba(255,43,58,${0.12 + 0.2 * mf.beat})` : 'rgba(80,160,255,0.22)';
  g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
  g.setLineDash([10 * v.dpr, 7 * v.dpr]);
  g.lineDashOffset = -t * 60 * v.dpr;
  g.strokeStyle = '#fff';
  g.lineWidth = (2.5 + 2 * mf.beat) * v.dpr;
  g.strokeRect(X0, Y0, X1 - X0, Y1 - Y0);
  g.setLineDash([]);
}

// the cursor and the music when it is not busy: a click ring on every beat (bigger on the downbeat), a shockwave from it
// on a drop, and its trail glowing while a voice sings (it draws the tune)
function music(f, c, X, Y) {
  const { g, v, mf, t, T, L } = f,
    m = v.ppm,
    trail = f.trail;
  trail.push([c.p[0], c.p[1], t]);
  while (trail.length && (t - trail[0][2] > 0.7 || trail[0][2] > t)) trail.shift();
  if (mf.voice > 0.08 && trail.length > 2) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const [w, a] of [
      [0.22, 0.18],
      [0.07, 0.7],
    ]) {
      g.strokeStyle = rgba(T.hold, a * mf.voice);
      g.lineWidth = w * m * (0.6 + mf.voice);
      g.beginPath();
      for (const [x, y] of trail) g.lineTo(v.sx(x), v.sy(y));
      g.stroke();
    }
    g.restore();
  }
  if (!c.act) {
    const i = L.A.beats.findLastIndex(b => b <= t),
      since = t - (L.A.beats[i] ?? -9),
      down = (i - (L.A.bar0 ?? 0)) % 4 === 0;
    if (since < 0.45) {
      const u = since / 0.45;
      g.strokeStyle = rgba(down ? T.line : '#ffffff', (1 - u) * (down ? 0.8 : 0.45) * mf.amp);
      g.lineWidth = (down ? 3 : 2) * v.dpr;
      g.beginPath();
      g.arc(X, Y, (0.15 + u * (down ? 1.1 : 0.6)) * m, 0, Math.PI * 2);
      g.stroke();
    }
  }
  const sd = t - mf.dropT;
  if (sd >= 0 && sd < 0.7) {
    const u = sd / 0.7;
    g.strokeStyle = rgba('#ffffff', 0.7 * (1 - u));
    g.lineWidth = (2 + 10 * (1 - u)) * v.dpr;
    g.beginPath();
    g.arc(X, Y, u * Math.max(v.W, v.H) * 1.1, 0, Math.PI * 2);
    g.stroke();
  }
}

export function drawCursor(f) {
  const { g, v, run: R, t, plan } = f,
    m = v.ppm,
    c = plan.at(t);
  if (c.gone) return;
  // (in a tool's act it holds that tool when it is not carrying or painting)
  const tl = f.L.toolAt?.(t);
  if (tl && c.tool === 'arrow' && TOOLS[tl]) c.tool = tl;
  let [wx, wy] = c.p;
  if (R.mode === 'dead') {
    const u = smooth(R.deadT, R.deadT + 0.6, t);
    wx = lerp(wx, onStage(f.heroSeg, R.J[0]) + 1.0, u);
    wy = lerp(wy, R.J[1] + 1.6, u);
  }
  // (holding something, it keeps the whole thing on screen)
  let X = clamp(v.sx(wx), m * (c.held ? 0.7 : 0.15), v.W - m * (c.held ? 0.75 : 0.4)),
    Y = clamp(v.sy(wy), m * 0.6, v.H - m * 0.6);
  music(f, c, X, Y);
  if (c.held) held(f, c, X, Y);
  if (c.box) marquee(f, c.box);
  if (c.tool === 'brush') {
    g.fillStyle = 'rgba(255,240,240,0.9)';
    g.beginPath();
    g.arc(X, Y, 0.07 * m, 0, Math.PI * 2);
    g.fill();
  }
  const laugh = R.mode === 'dead' || c.taunt ? 1 : Math.max(0, 1 - (t - R.hitT) / 0.9);
  if (laugh > 0) {
    X += Math.sin(t * 50) * m * 0.06 * laugh;
    Y -= Math.abs(Math.sin(t * 25)) * m * 0.1 * laugh;
  }
  if (c.press > 0) {
    g.strokeStyle = `rgba(255,255,255,${0.95 * c.press})`;
    g.lineWidth = 3 * v.dpr;
    g.beginPath();
    g.arc(X, Y, (8 + 40 * (1 - c.press)) * v.dpr, 0, Math.PI * 2);
    g.stroke();
  }
  // it plays the song too: a jerk on each kick (out to a spot of its own and straight back, a few hundredths of a
  // second, as hard as the kick), a twitch on the hats (a quick tremor, smooth, the same every time at t), a tilt on the
  // beat; on a hard snare it glitches (red and cyan ghosts split off it, a slice of it jumps sideways)
  const { mf } = f,
    k = Math.floor(mf.kickT * 1000),
    since = t - mf.kickT,
    // (the kick's own strength, its envelope undone: out in 12 ms, back over the next 30 or so)
    jerk = since >= 0 && since < 0.12 ? mf.kick * Math.exp(since / 0.09) * (since < 0.012 ? since / 0.012 : Math.exp(-(since - 0.012) / 0.012)) * (0.5 + 0.5 * mf.amp) * m * 0.16 : 0,
    tremor = mf.hat * m * 0.02;
  X += (hash(k, 1) - 0.5) * 2 * jerk + tremor * (Math.sin(t * 61.3) + 0.6 * Math.sin(t * 97.1 + 1.7));
  Y += (hash(k, 2) - 0.5) * 2 * jerk + tremor * 0.5 * Math.sin(t * 79.7 + 0.4);
  const tilt = (laugh > 0 ? Math.sin(t * 30) * 0.25 * laugh : 0) + 0.12 * mf.beat * Math.sin(k);
  if (mf.snare > 0.45 && (f.react ?? 0) > 0.3) {
    const o = (0.05 + 0.12 * mf.snare) * m;
    g.save();
    g.globalAlpha = 0.6;
    g.globalCompositeOperation = 'lighter';
    pointer(f, X - o, Y, c.tool, c.press, tilt, '#29e7ff');
    pointer(f, X + o, Y + o * 0.3, c.tool, c.press, tilt, '#ff2b3a');
    g.restore();
  }
  upright(g, f.flip, X, () => pointer(f, X, Y, c.tool, c.press, tilt), Y);
  if (mf.snare > 0.6 && (f.react ?? 0) > 0.5) {
    const sy = Y + (hash(Math.floor(t * 30), 3) - 0.2) * m * 0.4,
      h = 0.08 * m;
    // (the slice is the pointer drawn again in that band, shifted: the canvas is never read back, a stall)
    const dx = (hash(Math.floor(t * 30), 4) - 0.5) * m * 0.5;
    g.save();
    g.beginPath();
    g.rect(X - m + dx, sy, 2 * m, h);
    g.clip();
    g.fillStyle = '#000';
    g.fill();
    upright(g, f.flip, X + dx, () => pointer(f, X + dx, Y, c.tool, c.press, tilt), Y);
    g.restore();
  }
}
