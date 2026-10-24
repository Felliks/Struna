// (a pack of parts: see registry.js)
// ATL's weathers (world/artists.js), light and sparse in front so what is in his way always reads through them:
//   blacksnow  "Чёрным снегом": dark grey flakes falling slowly aslant, a red one here and there, frozen still for a
//              moment on each kick (a stop frame)
//   acidrain   "Священный рейв" ("we rain acid from the sky"): slanting toxic green streaks, thicker with the hats,
//              splashing on a drop
//   static     "Кривой эфир", "Радио Апокалипсис": bands of a lost signal's interference across the screen on the snare,
//              the screen's snow in them, a burst on a drop (soft, never a flash)
//   feathers   "Вороний грай", "Марабу": black feathers turning over as they fall, a gust on the kick
//   soot       "Гелиоз", "INDUSTRIAL": flakes of soot and ash out of the chimneys, thicker with the bass
import { registerPart } from '../../registry.js';
import { cam, clock, fall, share } from '../weather/kit.js';
import { hash, rgba } from '../../../render/util.js';

const TAU = Math.PI * 2;
const wrap = (x, m) => ((x % m) + m) % m;

// the time a stop-frame weather shows: it holds while a kick sounds, then goes on (so it lags the clock a little)
const held = new WeakMap();
function heldTime(f) {
  let h = held.get(f.look);
  if (!h) held.set(f.look, (h = { t: f.t, last: f.t }));
  const dt = Math.max(0, Math.min(0.1, f.t - h.last));
  h.last = f.t;
  if (f.t < h.t - 1) h.t = f.t;
  h.t += f.mf.kick > 0.55 ? dt * 0.05 : dt;
  return h.t;
}

registerPart({
  pack: 'atl',
  id: 'blacksnow',
  slot: 'weather',
  media: ['air'],
  tags: ['cold', 'snow', 'province', 'gothic', 'dark'],
  front(f, k) {
    const { g, v } = f,
      t = heldTime(f),
      C = cam(f),
      n = 30 + 60 * k,
      a0 = g.globalAlpha;
    for (let i = 0; i < Math.ceil(n); i++) {
      const h = hash(i, 201),
        sz = (1.6 + 2.6 * hash(i, 202)) * v.dpr,
        par = 0.45 + 0.55 * hash(i, 202),
        x = wrap(h * v.W + t * (18 + 14 * hash(i, 203)) * v.dpr + C.x * par + Math.sin(t * 0.9 + i) * 10 * v.dpr, v.W),
        y = wrap(hash(i, 204) * v.H + t * (26 + 30 * hash(i, 205)) * v.dpr + C.y * par, v.H),
        red = i % 17 === 0;
      // (a flake: a little square on its side or flat, as it tumbles (no turning a canvas per flake))
      g.fillStyle = red ? 'rgba(200,30,30,0.85)' : i % 3 ? 'rgba(28,28,30,0.7)' : 'rgba(90,90,94,0.6)';
      const flat = Math.sin(t * (0.5 + h) + i) > 0;
      g.globalAlpha = a0 * share(i, n);
      g.fillRect(x - sz, y - sz * (flat ? 0.4 : 0.8), sz * 2, sz * (flat ? 0.8 : 1.6));
    }
    g.globalAlpha = a0;
  },
});

registerPart({
  pack: 'atl',
  id: 'acidrain',
  slot: 'weather',
  media: ['air'],
  tags: ['acid', 'party', 'neon'],
  front(f, k) {
    const { g, v, mf, T } = f,
      col = mf.drop > 0 ? '#9dff3a' : '#3dff6a';
    // (thicker with the hats in its light, not in drops popping in and out on every sixteenth)
    fall(f, 30 + 60 * k, [1.8, 1], 6, 22, 1.4, rgba(col, 0.32 + 0.25 * mf.hat), 31, 0.55);
    fall(f, 8 + 14 * k, [2.6, 1], 7, 40, 2.2, rgba(T.win[1] ?? col, 0.35 + 0.2 * clock(f).kick), 37, 1);
    // (splashes on the roofs on a drop: little rings low on the screen)
    if (mf.drop > 0) {
      g.strokeStyle = rgba(col, 0.5 * mf.kick);
      g.lineWidth = v.dpr;
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const x = hash(i, Math.floor(f.t * 4)) * v.W,
          y = v.H * (0.6 + 0.35 * hash(i, 41));
        g.moveTo(x + 8 * v.dpr, y);
        g.ellipse(x, y, 8 * v.dpr, 2.5 * v.dpr, 0, 0, TAU);
      }
      g.stroke();
    }
  },
});

registerPart({
  pack: 'atl',
  id: 'static',
  slot: 'weather',
  media: ['air', 'space'],
  tags: ['radio', 'tech', 'industrial'],
  front(f, k) {
    const { g, v, mf, t } = f,
      fr = Math.floor(t * 20),
      amt = Math.min(1, 0.15 + 0.6 * mf.snare + 0.4 * (mf.drop > 0 ? mf.kick : 0)) * (0.5 + 0.5 * k),
      bands = 1 + Math.round(3 * amt);
    for (let b = 0; b < bands; b++) {
      const y = hash(b, fr) * v.H,
        h = (4 + 26 * hash(b, fr + 1)) * v.dpr;
      g.fillStyle = `rgba(200,220,220,${0.05 + 0.1 * amt})`;
      g.fillRect(0, y, v.W, h);
      // (the snow of a lost channel in the band)
      g.fillStyle = `rgba(255,255,255,${0.25 + 0.35 * amt})`;
      for (let i = 0; i < 40 * amt; i++) g.fillRect(hash(i, fr + b * 7) * v.W, y + hash(i, fr + b * 9) * h, 2 * v.dpr, v.dpr);
    }
    // (a thin roll bar creeping up the screen, as a tuned-off picture has)
    const ry = wrap(-t * 60 * v.dpr, v.H);
    g.fillStyle = 'rgba(0,0,0,0.08)';
    g.fillRect(0, ry, v.W, 14 * v.dpr);
  },
});

registerPart({
  pack: 'atl',
  id: 'feathers',
  slot: 'weather',
  media: ['air'],
  tags: ['folk', 'occult', 'gothic', 'cold', 'dark'],
  front(f, k) {
    const { g, v, t } = f,
      c = clock(f),
      C = cam(f),
      n = 6 + 14 * k,
      a0 = g.globalAlpha;
    g.fillStyle = 'rgba(14,14,18,0.85)';
    g.strokeStyle = 'rgba(60,60,70,0.8)';
    g.lineWidth = v.dpr;
    for (let i = 0; i < Math.ceil(n); i++) {
      const h = hash(i, 221),
        L = (10 + 10 * hash(i, 222)) * v.dpr,
        par = 0.45 + 0.55 * hash(i, 222),
        // (a gust on the kick: a push the feathers drift on from, the kicks' distance, never a jump)
        x = wrap(h * v.W - ((20 + 30 * hash(i, 223)) * t + 80 * c.kickRun) * v.dpr + C.x * par, v.W),
        y = wrap(hash(i, 224) * v.H + t * (22 + 18 * hash(i, 225)) * v.dpr + C.y * par + Math.sin(t * 1.4 + i) * 12 * v.dpr, v.H),
        a = Math.sin(t * (1 + h) + i) * 1.2;
      g.globalAlpha = a0 * share(i, n);
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.beginPath();
      g.moveTo(-L, 0);
      g.quadraticCurveTo(0, -L * 0.35, L, 0);
      g.quadraticCurveTo(0, L * 0.2, -L, 0);
      g.fill();
      g.beginPath();
      g.moveTo(-L * 1.2, 0);
      g.lineTo(L, 0);
      g.stroke();
      g.restore();
    }
    g.globalAlpha = a0;
  },
});

registerPart({
  pack: 'atl',
  id: 'soot',
  slot: 'weather',
  media: ['air'],
  tags: ['industrial', 'province', 'hot'],
  front(f, k) {
    const { g, v, t } = f,
      c = clock(f),
      C = cam(f),
      n = 24 + 50 * k + 30 * c.bass,
      a0 = g.globalAlpha;
    for (let i = 0; i < Math.ceil(n); i++) {
      const par = 0.45 + 0.55 * hash(i, 245),
        x = wrap(hash(i, 241) * v.W - t * (30 + 40 * hash(i, 242)) * v.dpr + C.x * par, v.W),
        y = wrap(hash(i, 243) * v.H - t * (8 + 14 * hash(i, 244)) * v.dpr + C.y * par + Math.sin(t + i) * 8 * v.dpr, v.H),
        s = (1 + 2.5 * hash(i, 245)) * v.dpr;
      g.globalAlpha = a0 * share(i, n);
      g.fillStyle = i % 7 ? 'rgba(30,26,24,0.6)' : `rgba(255,${120 + 60 * hash(i, 246)},40,${0.4 + 0.5 * c.kick})`;
      g.fillRect(x, y, s, s * 0.7);
    }
    g.globalAlpha = a0;
  },
});
