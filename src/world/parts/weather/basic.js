// The weathers every place had (look.js lists each place's): rain, snow, fog, sand, smog, embers, fireflies, bubbles,
// confetti, debris; a clear sky; the stars. Each grows with the world's stage (k) and moves with the music; what is in
// front of the world stays small, light and sparse so the obstacles and the hero always read through it.
import { registerPart } from '../../registry.js';
import { cam, clock, drift, fall, haze, share } from './kit.js';
import { hash, rgba } from '../../../render/util.js';

const W = (id, media, tags, front, back) => registerPart({ id, slot: 'weather', media, tags, front, back });
const TAU = Math.PI * 2;
const wrap = (x, m) => ((x % m) + m) % m;
// two hex colours mixed, as a hex colour (so rgba() can take it)
const mixHex = (a, b, u) => {
  const p = parseInt(a.slice(1), 16),
    q = parseInt(b.slice(1), 16),
    c = s => Math.round(((p >> s) & 255) * (1 - u) + ((q >> s) & 255) * u);
  return '#' + ((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0');
};
// how much a thing of the night shows (stars, fireflies): full at night, a little by day
const night = f => f.look?.night ?? (f.look?.time === 'night' || f.look?.time === 'space' ? 1 : 0);

W('clear', ['air'], ['mild'], () => {});
// stars: the night's stars (layers/weather.js) and a few brighter ones, four-pointed sparkles flaring on the hats,
// behind the world
W('stars', ['air', 'space'], ['future', 'fantasy', 'cold'], null, f => {
  const { g, v, t, mf } = f,
    vis = 0.35 + 0.65 * night(f),
    n = 12;
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.strokeStyle = 'rgba(255,255,255,1)';
  for (let i = 0; i < n; i++) {
    const h = hash(i, 131),
      x = wrap(hash(i, 132) * v.W - v.x * v.ppm * 0.03, v.W),
      y = v.H * 0.55 * hash(i, 133),
      tw = 0.5 + 0.5 * Math.sin(t * (1.2 + 1.5 * h) + h * 30),
      a = vis * (0.35 + 0.45 * tw + Math.min(0.4, mf.hat * 1.5 * hash(i, 134))),
      r = (4 + 6 * hash(i, 135)) * v.dpr * (0.7 + 0.3 * tw);
    g.globalAlpha = a * 0.25;
    g.fillStyle = 'rgba(220,235,255,1)';
    g.beginPath();
    g.arc(x, y, r * 0.45, 0, TAU);
    g.fill();
    g.globalAlpha = a;
    g.lineWidth = 1.2 * v.dpr;
    g.beginPath();
    g.moveTo(x - r, y);
    g.lineTo(x + r, y);
    g.moveTo(x, y - r);
    g.lineTo(x, y + r);
    g.stroke();
  }
  g.restore();
});
// rain: a far sheet of thin streaks and a near one of fewer, longer, brighter drops, heavier on the bass
W('rain', ['air'], ['urban', 'neon', 'gothic'], (f, k) => {
  const col = mixHex(f.T.win[1], '#dfe8ff', 0.4);
  // (the far sheet at half his distance, the near one at his; the bass's weight through its spring, never a flicker)
  const b = clock(f).bass;
  fall(f, 60 + 100 * k, [1.6, 1], [3, 3], 16, 1.1, rgba(col, 0.3 + 0.2 * b), 5, 0.55);
  fall(f, 16 + 24 * k, [2.3, 1], [4, 3], 30, 1.8, rgba(col, 0.42 + 0.2 * b), 7, 1);
});
W('snow', ['air'], ['cold', 'gothic', 'nature'], (f, k) => drift(f, 30 + 60 * k, [15, 30], [40, 30], 2.2, 'rgba(255,255,255,0.75)', 3));
W('fog', ['air', 'water'], ['gothic', 'nature', 'cold'], (f, k) => haze(f, f.T.sky[2], 0.15 + 0.25 * k + 0.1 * clock(f).bass));
W('sand', ['air'], ['hot', 'industrial'], (f, k) => {
  haze(f, '#d9a066', 0.08 + 0.3 * k * k);
  // (blown the way the world's wind blows, harder as the storm grows)
  drift(f, 20 + 80 * k, [120, 300], 10, 1.4, 'rgba(240,200,150,0.6)', 8);
});
// smog: a brown haze and in it slow banks of smoke rolling along low over the ground, swelling on the bass
W('smog', ['air'], ['industrial', 'urban'], (f, k) => {
  const { g, v, t } = f,
    c = clock(f),
    C = cam(f),
    col = mixHex('#8a7a6e', f.T.sky[2], 0.35);
  haze(f, col, 0.18 + 0.2 * k + 0.08 * c.bass);
  for (let i = 0; i < 4; i++) {
    const h = hash(i, 141),
      // (low over the ground, half his distance off: rolled on by the wind, passed by the camera at half its speed)
      rx = v.W * (0.3 + 0.15 * h) * (1 + 0.1 * c.bass),
      ry = v.H * (0.07 + 0.04 * hash(i, 142)),
      x = wrap(hash(i, 143) * (v.W + 2 * rx) + c.dir * t * (8 + 10 * h) * v.dpr + (c.run * C.m + C.x) * 0.45, v.W + 2 * rx) - rx,
      y = v.H * (0.55 + 0.3 * hash(i, 144)),
      gr = g.createRadialGradient(x, y, 0, x, y, rx);
    gr.addColorStop(0, rgba(col, 0.2 + 0.12 * k));
    gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr;
    g.save();
    g.translate(x, y);
    g.scale(1, ry / rx);
    g.translate(-x, -y);
    g.fillRect(x - rx, y - rx, 2 * rx, 2 * rx);
    g.restore();
  }
});
// embers: sparks rising and wandering, each a hot core in a soft glow, flaring on the hats
W('embers', ['air'], ['hot', 'industrial'], (f, k) => {
  const { g, v, t, mf } = f,
    c = clock(f),
    C = cam(f),
    n = 18 + 40 * k;
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < Math.ceil(n); i++) {
    const h = hash(i, 151),
      life = v.H * 1.1,
      // (rising faster as the fire grows: the distance risen, so none ever sinks back; carried by the wind, passed by the
      // camera at their depth)
      par = 0.5 + 0.5 * hash(i, 155),
      up = wrap(hash(i, 152) * life + ((40 + 60 * h) * t + 50 * c.P) * v.dpr - C.y * par, life),
      x = wrap(hash(i, 153) * v.W + c.dir * t * 20 * v.dpr + (c.run * C.m + C.x) * par + Math.sin(t * (1 + h) + h * 9) * 16 * v.dpr, v.W),
      y = v.H - up,
      a = share(i, n) * (1 - 0.6 * up / life) * (0.55 + Math.min(0.45, mf.hat * 2 * hash(i, 154))),
      r = (1.2 + 1.2 * hash(i, 155)) * v.dpr;
    g.fillStyle = `rgba(255,110,30,${0.18 * a})`;
    g.beginPath();
    g.arc(x, y, r * 3.2, 0, TAU);
    g.fill();
    g.fillStyle = `rgba(255,${190 + Math.round(50 * h)},110,${a})`;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
  g.restore();
});
// fireflies: slow wandering lights, each blinking on its own, brighter on the hats and at night
W('fireflies', ['air'], ['nature', 'fantasy'], f => {
  const { g, v, t, mf } = f,
    vis = 0.5 + 0.5 * night(f),
    col = mixHex('#d8ff6a', f.T.win[1], 0.2),
    c = clock(f),
    C = cam(f);
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 32; i++) {
    const h = hash(i, 161),
      // (hanging in the air at their depth: the camera passes them, the wind a little carries them)
      par = 0.4 + 0.6 * hash(i, 165),
      x = wrap(hash(i, 162) * v.W + Math.sin(t * (0.3 + 0.3 * h) + h * 20) * 60 * v.dpr + (0.3 * c.run * C.m + C.x) * par, v.W),
      y = wrap(v.H * (0.25 + 0.65 * hash(i, 163)) + Math.sin(t * (0.5 + 0.4 * h) + h * 7) * 30 * v.dpr + C.y * par, v.H),
      blink = 0.5 + 0.5 * Math.sin(t * (0.8 + 0.9 * h) + h * 40),
      a = vis * Math.min(1, 0.25 + 0.75 * blink * blink + mf.hat * 1.5 * hash(i, 164)),
      r = 2 * v.dpr;
    if (a < 0.04) continue;
    g.fillStyle = rgba(col, 0.16 * a);
    g.beginPath();
    g.arc(x, y, r * 5, 0, TAU);
    g.fill();
    g.fillStyle = rgba(col, a);
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
  g.restore();
});
// the deep's bubbles rising, more and faster on the kick: thin rings with a glint, wobbling as they climb
W('bubbles', ['water'], ['nature'], (f, k) => {
  const { g, v, t } = f,
    c = clock(f),
    C = cam(f),
    n = 18 + 40 * k,
    a0 = g.globalAlpha;
  g.lineWidth = 1.2 * v.dpr;
  for (let i = 0; i < Math.ceil(n); i++) {
    const h = hash(i, 171),
      r = (2 + 6 * hash(i, 172) ** 2) * v.dpr,
      // (the bigger ones nearer; risen the distance the field says, a little more as the kicks push the water)
      par = 0.4 + 0.6 * hash(i, 172),
      up = wrap(hash(i, 173) * v.H + ((40 + 40 * h) * t + 60 * c.P) * v.dpr + c.kick * 6 * v.dpr - C.y * par, v.H + 4 * r),
      x = wrap(hash(i, 174) * v.W + Math.sin(t * (1.5 + h) + h * 9) * 8 * v.dpr + (0.3 * c.run * C.m + C.x) * par, v.W),
      y = v.H + 2 * r - up;
    g.globalAlpha = a0 * share(i, n);
    g.strokeStyle = 'rgba(220,250,255,0.5)';
    g.beginPath();
    g.ellipse(x, y, r * (1 + 0.08 * Math.sin(t * 6 + h * 9)), r, 0, 0, TAU);
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.fillRect(x - r * 0.45, y - r * 0.55, Math.max(1, r * 0.3), Math.max(1, r * 0.3));
  }
  g.globalAlpha = a0;
});
// a rave's confetti: little paper squares tumbling down, flashing as they turn, thrown on the drops
W('confetti', ['air'], ['party'], (f, k) => {
  const { g, v, t, mf } = f,
    c = clock(f),
    C = cam(f),
    cols = ['#ff2b3a', '#29e7ff', '#ffe14d', '#b06aff', '#4dff8a'],
    d = v.dpr,
    // (always some in the air, more as the world grows; the extra ones fading in and out by turn, never popping)
    n = (24 + 70 * k) * (0.6 + 0.4 * k),
    a0 = g.globalAlpha;
  const piece = (h, x, y, s, col, a) => {
    const turn = Math.cos(t * (3 + 4 * h) + h * 20);
    g.globalAlpha = a0 * a;
    g.save();
    g.translate(x, y);
    g.rotate(h * 6 + t * (1 + h));
    g.fillStyle = turn > 0.6 ? mixHex(col, '#ffffff', 0.5) : col;
    g.fillRect(-s, -s * 0.6 * Math.abs(turn), 2 * s, 1.2 * s * Math.abs(turn) + 0.6 * d);
    g.restore();
  };
  for (let i = 0; i < Math.ceil(n); i++) {
    const h = hash(i, 181),
      par = 0.5 + 0.5 * hash(i, 184),
      y = wrap(hash(i, 182) * v.H + ((50 + 30 * h) * t + 40 * c.P) * d + C.y * par, v.H + 20 * d) - 10 * d,
      x = wrap(hash(i, 183) * v.W + c.dir * t * 20 * d + (0.4 * c.run * C.m + C.x) * par + Math.sin(t * 1.4 + h * 11) * 20 * d, v.W);
    piece(h, x, y, (2.5 + 2 * hash(i, 184)) * d, cols[Math.floor(hash(i, 185) * cols.length)], share(i, n));
  }
  // (thrown on a drop: a shower from over the top of the screen at its first beat, falling through and out, as thrown
  // paper does: in from above, never out of the air)
  const age = t - (mf.dropT ?? -9);
  if (age >= 0 && age < 8) {
    const seed = Math.round((mf.dropT ?? 0) * 10);
    for (let j = 0; j < 60; j++) {
      const h = hash(j, seed + 186),
        par = 0.5 + 0.5 * hash(j, seed + 189),
        y = -12 * d - hash(j, seed + 187) * v.H * 0.7 + age * (90 + 70 * h) * d,
        x = wrap(hash(j, seed + 188) * v.W + c.dir * age * 30 * d + (0.4 * c.run * C.m + C.x) * par + Math.sin(t * 1.4 + h * 11) * 20 * d, v.W);
      if (y < -12 * d || y > v.H + 12 * d) continue;
      piece(h, x, y, (2.5 + 2 * hash(j, seed + 190)) * d, cols[j % cols.length], 1);
    }
  }
  g.globalAlpha = a0;
});
// debris: shards of wreckage drifting past, tumbling, one edge catching the light
W('debris', ['space'], ['tech', 'future'], (f, k) => {
  const { g, v, t, mf } = f,
    c = clock(f),
    C = cam(f),
    n = 10 + 22 * k,
    a0 = g.globalAlpha,
    body = mixHex('#8a92a6', f.T.far, 0.35),
    lit = mixHex('#e8eef8', f.T.line, 0.25);
  g.lineWidth = 1.2 * v.dpr;
  for (let i = 0; i < Math.ceil(n); i++) {
    const h = hash(i, 191),
      s = (2.5 + 5 * hash(i, 192) ** 2) * v.dpr,
      // (the bigger shards nearer: passed faster by the camera; drifting on faster as the storm of them grows, the
      // distance the field says)
      par = 0.4 + 0.6 * hash(i, 192),
      x = wrap(hash(i, 193) * v.W - (40 * t + 120 * c.P) * (0.5 + h) * v.dpr + C.x * par, v.W + 4 * s) - 2 * s,
      y = wrap(hash(i, 194) * v.H + t * 15 * v.dpr + C.y * par + Math.sin(t * 0.7 + h * 9) * 8 * v.dpr, v.H),
      rot = t * (0.6 + 1.5 * h) * (h < 0.5 ? -1 : 1) + h * 9;
    g.globalAlpha = a0 * share(i, n);
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.fillStyle = rgba(body, 0.75);
    g.beginPath();
    g.moveTo(-s, -s * 0.3);
    g.lineTo(s * 0.4, -s * 0.8);
    g.lineTo(s, s * 0.2);
    g.lineTo(-s * 0.2, s * 0.7);
    g.closePath();
    g.fill();
    g.strokeStyle = rgba(lit, 0.6 + 0.3 * Math.max(0, Math.sin(rot * 2)) + 0.1 * mf.hat);
    g.beginPath();
    g.moveTo(-s, -s * 0.3);
    g.lineTo(s * 0.4, -s * 0.8);
    g.stroke();
    g.restore();
  }
  g.globalAlpha = a0;
});
