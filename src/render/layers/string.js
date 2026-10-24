// A freestyle string (run.js link), kept off him so his dance is seen whole (Tony Hawk's string at the screen's edge,
// Beat Saber's multiplier ring, Rez's world that grows with you):
// - on him only a glow, its colour the string's multiplier (white, blue, gold, then every colour), breathing on the kick
//   and flaring as each move lands (drawAura, under him);
// - at the top, in the middle (clear of the thumbs, of the way ahead and of him), its bank: a ring of eight that lights a
//   piece for each move that scores, its multiplier in it, its points ticking up beside it, all bouncing on the beat;
// - landed, the ring folds into a comet that flies into the score; fallen, its pieces burst away red
import { MOVE_COLOUR } from '../../hints.js';

const COLOUR = { air: MOVE_COLOUR.jump, brk: MOVE_COLOUR.slide, kick: MOVE_COLOUR.kick, dance: MOVE_COLOUR.grab };
const flown = [];
let shown = 0;

export function tierColour(n, t) {
  if (n >= 7) return `hsl(${(t * 240) % 360},100%,65%)`;
  return n >= 5 ? '#ffd84a' : n >= 3 ? '#5ee7ff' : '#ffffff';
}
const backOut = u => 1 + 2.7 * (u - 1) ** 3 + 1.7 * (u - 1) ** 2;
// where the bank sits: top middle, under the pause and the HUD's band
const spot = f => [f.v.W / 2, Math.max(f.v.H * 0.16, ((f.safe?.t ?? 0) + 84) * f.v.dpr)];

// the glow on him (world layer, before he is drawn)
export function drawAura(f) {
  const { g, v, run: R, t, mf } = f,
    c = R.string;
  if (!c || !R.J || R.mode !== 'run') return;
  const n = R.stringN,
    last = c.links.at(-1),
    flare = last ? Math.max(0, 1 - (t - last.t) / 0.25) : 0,
    x = v.sx(R.J[0]),
    y = v.sy(R.J[1] + 0.2),
    r = (1.1 + 0.12 * n + 0.5 * flare) * v.ppm * (1 + 0.06 * mf.kick),
    gr = g.createRadialGradient(x, y, 0, x, y, r);
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = Math.min(0.55, 0.18 + 0.04 * n + 0.25 * flare);
  gr.addColorStop(0, tierColour(n, t));
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function ring(g, x, y, r, lit, col, d, pop, links) {
  for (let i = 0; i < 8; i++) {
    const a0 = -Math.PI / 2 + (i / 8) * Math.PI * 2 + 0.09,
      a1 = a0 + (Math.PI * 2) / 8 - 0.18,
      on = i < lit;
    g.strokeStyle = on ? (links?.[i] ? COLOUR[links[i]] : col) : 'rgba(255,255,255,0.18)';
    g.lineWidth = (on ? 5 : 3) * d * (i === lit - 1 ? pop : 1);
    g.beginPath();
    g.arc(x, y, r, a0, a1);
    g.stroke();
  }
}
export function drawString(f) {
  const { g, run: R, t, v, mf } = f,
    d = v.dpr,
    [bx, by] = spot(f);
  // landed and fallen, still in the air
  for (let i = flown.length - 1; i >= 0; i--) {
    const q = flown[i],
      u = (t - q.t0) / (q.bail ? 0.5 : 0.45);
    if (u >= 1 || u < 0) {
      flown.splice(i, 1);
      continue;
    }
    g.save();
    if (q.bail) {
      for (let k = 0; k < 8; k++) {
        const a = -Math.PI / 2 + (k / 8) * Math.PI * 2;
        g.strokeStyle = `rgba(255,59,92,${1 - u})`;
        g.lineWidth = 4 * d;
        g.beginPath();
        const rr = q.r + u * 40 * d;
        g.arc(bx + Math.cos(a) * u * 20 * d, by + Math.sin(a) * u * 20 * d + u * u * 30 * d, rr, a + 0.1, a + 0.6);
        g.stroke();
      }
    } else {
      // (a comet along a curve into the score, its tail behind it)
      const tx = v.W - 70 * d,
        ty = ((f.safe?.t ?? 0) + 26) * d,
        P = w => [bx + (tx - bx) * w, by + (ty - by) * w - Math.sin(w * Math.PI) * 40 * d];
      g.globalCompositeOperation = 'lighter';
      for (let k = 8; k >= 0; k--) {
        const w = Math.max(0, u - k * 0.035),
          [x, y] = P(w * w * (3 - 2 * w));
        g.fillStyle = q.col;
        g.globalAlpha = (1 - k / 9) * 0.9;
        g.beginPath();
        g.arc(x, y, (7 - k * 0.6) * d, 0, Math.PI * 2);
        g.fill();
      }
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1 - u;
      g.fillStyle = '#ffd84a';
      g.font = `900 ${Math.round(18 * d)}px Unbounded, 'Arial Black', sans-serif`;
      g.textAlign = 'center';
      g.fillText(`+${q.total.toLocaleString('en-US')}`, bx, by + 44 * d + u * 10 * d);
    }
    g.restore();
  }
  for (const e of R.fx) {
    if ((e.k !== 'bank' && e.k !== 'bail') || e.drawn) continue;
    e.drawn = true;
    flown.push({ t0: t, r: 20 * d, col: R.lastCol ?? '#fff', total: e.total ?? 0, bail: e.k === 'bail' });
  }
  const c = R.string;
  if (!c || R.mode !== 'run') {
    shown = 0;
    return;
  }
  const n = R.stringN,
    last = c.links.at(-1),
    since = last ? t - last.t : 9,
    pop = since < 0.18 ? backOut(Math.min(1, since / 0.18)) * 0.25 + 1 : 1,
    s = (1 + 0.06 * mf.kick) * (since < 0.18 ? 1 + 0.25 * (1 - since / 0.18) : 1),
    col = tierColour(n, t),
    total = c.pot * Math.max(1, n);
  R.lastCol = col;
  shown += (total - shown) * 0.25;
  g.save();
  g.translate(bx, by);
  g.scale(s, s);
  // (a soft glow behind, the beat's)
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 34 * d);
  gr.addColorStop(0, col);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = 0.18 + 0.15 * mf.kick;
  g.fillStyle = gr;
  g.beginPath();
  g.arc(0, 0, 34 * d, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;
  ring(g, 0, 0, 20 * d, n, col, d, pop, c.links.filter(l => l.pts > 0).map(l => l.kind));
  g.fillStyle = '#fff';
  g.shadowColor = 'rgba(0,0,0,0.6)';
  g.shadowBlur = 4 * d;
  g.font = `900 ${Math.round(15 * d)}px Unbounded, 'Arial Black', sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(`×${Math.max(1, n)}`, 0, 1 * d);
  g.font = `800 ${Math.round(12 * d)}px Unbounded, 'Arial Black', sans-serif`;
  g.fillStyle = col;
  g.fillText(Math.round(shown).toLocaleString('en-US'), 0, 36 * d);
  g.restore();
}
