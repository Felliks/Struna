// The sky: the theme's gradient warming toward its accents with the bass, the simulation's grid breathing behind it
// all, then the place's own piece of sky (a sun, a moon, a planet), all in the song's look (look.js).
import { LOOKS, MARKS } from '../places/index.js';
import { drawWorldBack, drawWorldSky } from '../../world/index.js';
import { mixHex } from '../util.js';
import { at, fieldOf } from '../physics.js';

export function drawSky(f) {
  const { g, v, mf, T } = f,
    gr = g.createLinearGradient(0, 0, 0, v.H);
  gr.addColorStop(0, T.sky[0]);
  gr.addColorStop(0.55, mixHex(T.sky[1], T.hold, 0.25 * mf.bass));
  // (the horizon warms toward the accent as the song grows, and flares on the bass and the drops)
  gr.addColorStop(1, mixHex(T.sky[2], T.line, 0.25 * mf.stage + 0.25 * mf.bass + 0.2 * mf.drop));
  g.fillStyle = gr;
  g.fillRect(-v.W, -v.H, v.W * 3, v.H * 3);
  // (the simulation's grid, the furthest thing behind the world: moved by the camera less than any row of the place,
  // breathing with the bass through its spring (physics.js) about the middle of the screen, its lines never slipping)
  const F = fieldOf(f),
    m = v.ppm0 ?? v.ppm,
    cell = 1.2 * m,
    off = (((-v.x * m * 0.025) % cell) + cell) % cell,
    sc = 1 + 0.08 * (F ? at(F, 'B', f.t) : mf.bass),
    cx = v.W / 2;
  g.strokeStyle = `rgba(255,255,255,${0.035 + 0.09 * mf.beat * mf.amp})`;
  g.lineWidth = v.dpr;
  g.beginPath();
  for (let X0 = off - cell; X0 < v.W + cell; X0 += cell) {
    const X = cx + (X0 - cx) * sc;
    g.moveTo(X, -v.H);
    g.lineTo(X, v.H * 2);
  }
  g.stroke();
  // (a song's world's sky piece (world/), or the place's own)
  if (f.look?.mix) drawWorldSky(f, f.look.mix);
  else LOOKS[f.place].sky?.(f);
}

// the place's background rows (a song's world's: its parts, world/)
// (each row in it drawn in its own frame, shrunk by its depth from the world's: places/kit.js row; the world's given
// back after)
export function drawBack(f) {
  const mix = f.look?.mix,
    look = LOOKS[f.place],
    T0 = f.g.getTransform();
  f.rowFrame = { T0 };
  try {
    if (!mix) look.back(f);
    else drawWorldBack(f, mix, look, look.late?.includes(mix.own) ? null : MARKS[f.place]?.[mix.own]);
  } finally {
    f.rowFrame = null;
    f.g.setTransform(T0);
  }
}
