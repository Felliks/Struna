// The HUD: health, score (it jumps a little on the kick), the streak (a flame), the multiplier, the overdrive's charge,
// the song's progress, a freestyle window. What to press is the hints' (hints.js), not the HUD's.
import { goldNear } from '../../anim.js';
import { tr } from '../../i18n.js';
import { icon, keycap } from '../icons.js';
// something drawn scaled by k about (x, y)
function pulse(g, x, y, k, draw) {
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  g.translate(-x, -y);
  draw();
  g.restore();
}
// a line of text drawn once into a sprite of its own and stamped while it stays the same (slot: one per thing the HUD
// says; its text, font and colour kept with it): text set afresh each frame, a number formatted each frame, was most of
// the HUD's time
const SLOTS = {};
function text(g, slot, str, font, col, x, y, align = 'right') {
  const S = (SLOTS[slot] ??= {});
  if (S.str !== str || S.font !== font || S.col !== col) {
    const c = (S.c ??= document.createElement('canvas')),
      x2 = c.getContext('2d');
    x2.font = font;
    const w = x2.measureText(str).width,
      px = parseFloat(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? '20'),
      pad = Math.ceil(px * 0.3);
    Object.assign(c, { width: Math.max(1, Math.ceil(w + 2 * pad)), height: Math.ceil(px * 1.7) });
    x2.font = font;
    x2.textAlign = 'left';
    x2.fillStyle = col;
    x2.fillText(str, pad, Math.round(px * 1.25));
    Object.assign(S, { str, font, col, w, pad, base: Math.round(px * 1.25) });
  }
  const left = align === 'right' ? x - S.w : align === 'center' ? x - S.w / 2 : x;
  // (on whole pixels, as the text would have been drawn crisp)
  g.drawImage(S.c, Math.round(left - S.pad), Math.round(y - S.base));
  return S.w;
}
// the score as the HUD writes it, formatted only when it changes
const MULT = Object.fromEntries([1, 2, 3, 4, 6, 8].map(n => [n, `×${n}`]));
let scoreN = null,
  scoreS = '';
export function drawHud(f) {
  const { g, v, run: R, t, T, mf } = f,
    d = v.dpr,
    // (inside the screen's safe area: clear of the notch and the home bar)
    S = f.safe ?? { t: 0, r: 0, b: 0, l: 0 },
    W = v.W - (S.l + S.r) * d,
    H = v.H - (S.t + S.b) * d,
    pad = 18 * d,
    // (the bars start right of their marks: a heart for his health, a bolt for the overdrive's charge)
    bx = pad + 22 * d,
    // (on a narrow phone short of the pause button in the middle: 44 px wide)
    hw = Math.max(80 * d, Math.min(150 * d, v.W / 2 - S.l * d - 30 * d - bx)),
    hh = 10 * d,
    hp = Math.max(0, R.hp) / 100,
    hit = t - (R.hitT ?? -9);
  g.save();
  g.translate(S.l * d, S.t * d);
  // his health: a heart beating with the song (faster and red when low, jolted by a hit), and a bar cut into the hits
  // he can still take: what it is reads without a word
  const low = hp <= 0.25,
    col = hp > 0.5 ? '#3ddc84' : hp > 0.25 ? '#ffc93c' : '#ff3b4f',
    jolt = hit > 0 && hit < 0.3 ? (1 - hit / 0.3) * Math.sin(hit * 60) * 3 * d : 0;
  icon(g, 'heart', pad + 8 * d + jolt, pad + hh / 2, 20 * d, hit > 0 && hit < 0.15 ? '#ffffff' : low ? '#ff3b4f' : '#ff5a7a', { pulse: low ? Math.abs(Math.sin(t * 9)) : mf.kick });
  g.fillStyle = 'rgba(0,0,0,0.5)';
  g.fillRect(bx, pad, hw, hh);
  g.fillStyle = col;
  g.fillRect(bx, pad, hw * hp, hh);
  const lives = Math.max(1, Math.round(100 / (R.L.difficulty?.hit ?? 25)));
  g.fillStyle = 'rgba(0,0,0,0.6)';
  for (let i = 1; i < lives; i++) g.fillRect(bx + (hw * i) / lives - d, pad, 2 * d, hh);
  g.strokeStyle = '#fff';
  g.lineWidth = 1.5 * d;
  g.strokeRect(bx, pad, hw, hh);
  g.textAlign = 'right';
  g.fillStyle = '#fff';
  // (the text at one size and the jump made by scaling it: a font size that moves with the music makes the browser draw
  // its letters afresh at every new size, the dearest thing a phone can be asked for)
  const sf = `900 ${Math.round(20 * d)}px Unbounded, 'Arial Black', sans-serif`;
  if (scoreN !== R.score) ((scoreN = R.score), (scoreS = R.score.toLocaleString('en-US')));
  pulse(g, W - pad, pad + 12 * d, 1 + 0.08 * mf.kick, () => text(g, 'score', scoreS, sf, '#fff', W - pad, pad + 18 * d));
  if (R.combo > 1) {
    // (the streak: its number and a flame, burning on the beat)
    const cw = text(g, 'combo', String(R.combo), `800 ${Math.round(15 * d)}px Unbounded, system-ui, sans-serif`, T.slide, W - pad, pad + 40 * d);
    icon(g, 'flame', W - pad - cw - 12 * d, pad + 34 * d, 18 * d, '#ff8a3d', { pulse: mf.beat });
  }
  // the flow's multiplier (1x-4x, doubled in the overdrive), bigger and hotter as it climbs; under it the pips to the
  // next tier
  const tier = R.tier,
    mult = (1 + tier) * (R.od ? 2 : 1),
    hot = ['#ffffff', T.slide, T.jump, '#ff4fd8'][tier];
  const mf2 = `900 ${Math.round((22 + 6 * tier) * d)}px Unbounded, 'Arial Black', sans-serif`,
    mc = R.od ? '#ffd84a' : hot;
  // (his golden pose: he kicks the multiplier, and it spins off its place and drops back)
  const gp = R.anim?.face === 'front' && goldNear(R.L.A, t, 0.4) !== null ? goldNear(R.L.A, t, 0.4) : null,
    ku = gp === null ? -1 : (t - (gp - 0.4)) / 0.8;
  if (ku >= 0 && ku <= 1) {
    const s = Math.sin(Math.PI * ku);
    g.save();
    g.translate(W - pad - 30 * d * s, pad + (72 + 4 * tier) * d - 40 * d * s);
    g.rotate(-2 * Math.PI * ku);
    text(g, 'mult', MULT[mult] ?? `×${mult}`, mf2, mc, 0, 0);
    g.restore();
  } else pulse(g, W - pad, pad + (64 + 4 * tier) * d, 1 + 0.1 * mf.beat * tier, () => text(g, 'mult', MULT[mult] ?? `×${mult}`, mf2, mc, W - pad, pad + (72 + 4 * tier) * d));
  const next = [10, 25, 50][tier];
  if (next && !R.od) {
    const prev = [0, 10, 25][tier],
      n = 10,
      k = Math.floor(((R.combo - prev) / (next - prev)) * n);
    for (let i = 0; i < n; i++) {
      g.fillStyle = i < k ? hot : 'rgba(255,255,255,0.2)';
      g.fillRect(W - pad - (n - i) * 7 * d, pad + (82 + 4 * tier) * d, 5 * d, 4 * d);
    }
  }
  // the overdrive's charge, gold, under the health, its bolt beside it (the bolt on its button: main.js); ready from
  // half: the bolt lit and beating, and on a computer its key beside the bar
  const sy = pad + hh + 8 * d,
    od = R.od ? Math.max(0, (R.od.t1 - t) / (R.od.t1 - R.od.t0)) : R.sync,
    ready = !R.od && R.sync >= 0.5;
  icon(g, 'bolt', pad + 8 * d, sy + 3 * d, 16 * d, ready || R.od ? '#ffd84a' : 'rgba(255,216,74,0.45)', { pulse: ready ? mf.beat : 0 });
  g.fillStyle = 'rgba(0,0,0,0.5)';
  g.fillRect(bx, sy, hw, 6 * d);
  g.fillStyle = R.od ? `hsl(${(t * 300) % 360},100%,65%)` : '#ffd84a';
  g.fillRect(bx, sy, hw * od, 6 * d);
  g.strokeStyle = 'rgba(255,216,74,0.8)';
  g.lineWidth = d;
  g.strokeRect(bx, sy, hw, 6 * d);
  // (the half it is ready from, a faint tick)
  if (!R.od) {
    g.fillStyle = 'rgba(255,255,255,0.3)';
    g.fillRect(bx + hw / 2, sy, d, 6 * d);
  }
  if (ready && !f.touch) keycap(g, '⇧', bx + hw + 18 * d, sy + 3 * d, 22 * d, '#ffd84a', { lit: 0.5 + 0.5 * mf.beat });
  g.fillStyle = 'rgba(255,255,255,0.15)';
  g.fillRect(pad, H - pad, W - 2 * pad, 3 * d);
  g.fillStyle = T.line;
  g.fillRect(pad, H - pad, ((W - 2 * pad) * Math.max(0, t)) / R.L.A.dur, 3 * d);
  // a freestyle window: its name over the screen as it opens, and a ring on each beat at the bottom (any key on it)
  const w = R.L.free?.find(q => t >= q[0] && t < q[1]);
  // (hidden while a string is up: its bank stands there)
  if (w && R.mode === 'run' && !R.string) {
    const since = t - w[0],
      beat = R.L.A.beat,
      ph = (((t - (R.L.A.beats[0] ?? 0)) % beat) + beat) % beat;
    g.textAlign = 'center';
    g.globalAlpha = since < 1.5 ? 1 : Math.max(0.35, 1 - (since - 1.5));
    // (under the pause button on a short screen)
    const fy = Math.max(H * 0.16, 84 * d);
    pulse(g, W / 2, fy - 9 * d, 1 + 0.1 * mf.beat, () => text(g, 'free', tr('FREESTYLE'), `900 ${Math.round(26 * d)}px Unbounded, 'Arial Black', sans-serif`, '#ffd84a', W / 2, fy, 'center'));
    g.globalAlpha = 1 - ph / beat;
    g.strokeStyle = '#ffd84a';
    g.lineWidth = 3 * d;
    g.beginPath();
    g.arc(W / 2, fy + 44 * d, (6 + 26 * (ph / beat)) * d, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
    g.textAlign = 'right';
  }
  g.restore();
}
