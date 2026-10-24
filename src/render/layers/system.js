// The system's voice (lines.js: the AI's cursor, an experiment's dry operator): its log line as the song starts, its
// order as each act of a new kind comes (from two beats before it to one into it), its remarks as the streak climbs and
// on a first-try win, typed out in a terminal's green at the bottom of the screen, glitching; and its quip in a bubble by
// the cursor when the hero is hit. He looks out at the player as each order comes up (anim.js gesture).
import { orderAt } from '../../anim.js';
import { line } from '../../lines.js';
import { icon } from '../icons.js';
import { screenSwap } from './modes.js';

const hash = x => (((Math.sin(x * 12.9898) * 43758.5453) % 1) + 1) % 1;
// whether a line is typed at all, decided once as it would begin: only when the next moments are free of things to
// press (a player in the middle of a run has no eyes for reading); kept per line and start
const said = new Map();
function quiet(L, t, text, t0) {
  const k = `${text}|${t0}`;
  if (!said.has(k)) {
    const span = text.length / 30 + 1.5;
    said.set(k, !L.obs.some(o => !o.echo && o.t > t - 0.3 && o.t < t + span));
    if (said.size > 64) said.delete(said.keys().next().value);
  }
  return said.get(k);
}
// (forgotten after a song is rehearsed out of sight (rehearse.js): it decided them at other moments than play will)
export const forgetSaid = () => said.clear();

export function drawSystem(f) {
  const { v, L, t, run: R } = f,
    seed = L.A.seed ?? 0,
    d = v.dpr,
    a = orderAt(L, t),
    up = R.anim?.tierUp;
  let text = null,
    t0 = 0;
  if (R.victory && R.memory && R.memory.runs === 0 && t - R.victory.t0 < 3.5) (text = line('firstTry', seed)), (t0 = R.victory.t0);
  else if (a) (text = line(a.mode, seed, L.acts.indexOf(a))), (t0 = a.t0 - 2 * L.A.beat);
  else if (up && up.tier >= 2 && t - up.t0 < 2.2 && !R.od) (text = line(up.tier === 2 ? 'streak25' : 'streak50', seed)), (t0 = up.t0);
  else if (t > 0.2 && t < 3.4) (text = line('start', seed, 0, { n: 1000 + (seed % 9000), odds: 1 + (seed % 9) })), (t0 = 0.2);
  if (text && quiet(L, t, text, t0)) terminal(f, text, t0);
  // a new kind of act: its mark, big, swelling on the beat, as its order comes (whether or not there is time to read it)
  if (a) {
    const u = (t - (a.t0 - 2 * L.A.beat)) / (3 * L.A.beat),
      al = Math.min(1, u * 6, (1 - u) * 4);
    if (al > 0) {
      // (high, just under the HUD's band, clear of what is in his way on a short screen; pointing the way he runs)
      const sz = Math.min(v.W * 0.16, 72 * d),
        y = Math.min(v.H * 0.24, ((f.safe?.t ?? 0) + 56) * d + sz * 0.6),
        back = screenSwap(L, t).right === 'left';
      f.g.save();
      f.g.setTransform(back ? -1 : 1, 0, 0, 1, back ? v.W : 0, 0);
      icon(f.g, a.mode, v.W / 2, y, sz, '#ffffff', { pulse: f.mf.beat, alpha: al });
      f.g.restore();
    }
  }
  if (R.mode === 'dead') deleted(f, seed);
  // (hit: the cursor's quip by it)
  const hit = t - (R.hitT ?? -9);
  if (hit > 0.1 && hit < 1.1 && R.mode !== 'dead') {
    const c = f.plan?.at(t);
    if (c?.p) bubble(f, line('quip', seed, Math.round(R.hitT * 10)), v.sx(c.p[0]), v.sy(c.p[1]) - 30 * d, hit);
  }
}
// a line typed out at the bottom left, a cursor blinking after it, torn sideways for a frame now and then
function terminal(f, text, t0) {
  const { g, v, t } = f,
    d = v.dpr,
    shown = Math.floor(Math.min(text.length, (t - t0) * 30)),
    txt = `> ${text.slice(0, shown)}${Math.floor(t * 4) % 2 ? '_' : ' '}`,
    S = f.safe ?? { l: 0, b: 0 },
    x = (18 + S.l) * d,
    // (at the bottom, over the run's own time line: the top is the game's titles'; a short screen (a phone held
    // sideways) has its ground there, so lower, just over the controls' hint)
    y = v.H - (S.b + (v.H / d < 520 ? 62 : 110)) * d;
  if (shown <= 0) return;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.font = `bold ${15 * d}px ui-monospace, Menlo, Consolas, monospace`;
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  // (a long line wrapped to the screen)
  const words = txt.split(' '),
    rows = [''];
  for (const w of words) {
    const next = rows.at(-1) ? `${rows.at(-1)} ${w}` : w;
    if (g.measureText(next).width > v.W - 40 * d && rows.at(-1)) rows.push(w);
    else rows[rows.length - 1] = next;
  }
  const tear = hash(Math.floor(t * 15)) > 0.85 ? (hash(t) - 0.5) * 10 * d : 0;
  rows.forEach((r, i) => {
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.fillRect(x - 6 * d, y - 16 * d + i * 22 * d, g.measureText(r).width + 12 * d, 22 * d);
    g.fillStyle = '#39ff88';
    g.fillText(r, x + tear, y + i * 22 * d);
  });
  g.restore();
}
// the cursor's speech bubble: white, popping in
function bubble(f, text, x, y, age) {
  const { g, v } = f,
    d = v.dpr,
    s = Math.min(1, age / 0.08);
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.font = `bold ${14 * d}px Helvetica, Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const w = g.measureText(text).width + 16 * d,
    h = 24 * d,
    bx = Math.max(w / 2 + 6 * d, Math.min(v.W - w / 2 - 6 * d, x)),
    by = Math.max(h + 6 * d, y);
  g.translate(bx, by);
  g.scale(s, s);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.roundRect(-w / 2, -h / 2, w, h, 8 * d);
  g.moveTo(-6 * d, h / 2);
  g.lineTo(0, h / 2 + 8 * d);
  g.lineTo(6 * d, h / 2);
  g.fill();
  g.fillStyle = '#111';
  g.fillText(text, 0, 0);
  g.restore();
}
// dead: the system's verdict on a sign (lines.js death) dropping from the top of the screen into its upper middle and
// bouncing, over everything: wherever his body went (down a shaft, off a mirrored stretch), the sign is in the picture
function deleted(f, seed) {
  const { g, v, run: R, t } = f,
    d = v.dpr,
    u = t - R.deadT - 0.3;
  if (u < 0) return;
  const said = line('death', seed, R.memory?.runs ?? 0),
    fall = Math.min(1, u / 0.35),
    y = -60 * d + (v.H * 0.3 + 60 * d) * fall * fall - 18 * d * Math.exp(-u * 6) * Math.abs(Math.sin(u * 18));
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.font = `bold ${34 * d}px Helvetica, Arial, sans-serif`;
  // (a long one in smaller letters: never wider than most of the screen)
  const fit = Math.min(1, (v.W * 0.82) / (g.measureText(said).width + 40 * d));
  g.font = `bold ${34 * d * fit}px Helvetica, Arial, sans-serif`;
  const hw = g.measureText(said).width / 2 + 20 * d * fit,
    hh = 28 * d * fit;
  g.translate(v.W / 2, y);
  g.rotate(-0.08 + 0.18 * Math.sin(u * 3) * Math.exp(-u * 2));
  g.fillStyle = '#ff2040';
  g.fillRect(-hw, -hh, 2 * hw, 2 * hh);
  g.strokeStyle = '#fff';
  g.lineWidth = 3 * d;
  g.strokeRect(-hw, -hh, 2 * hw, 2 * hh);
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(said, 0, 0);
  g.restore();
}
