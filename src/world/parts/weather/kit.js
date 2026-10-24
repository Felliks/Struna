// What the weathers are drawn with: streaks falling, dots drifting, a haze over the lower screen (screen space, px).
// The music decides how hard, the physics how: a speed that grows with the weather's strength k is a distance
// travelled (the field's integral of k, render/physics.js), never a speed times the song's time, so nothing jumps or
// runs backwards as the song grows and calms; everything is carried by the world's one wind, and the camera runs past it
// (his run, a fall down a shaft) by its depth `par` (1 at his distance, less further off).
import { hash, rgba } from '../../../render/util.js';
import { at, breeze, fieldOf, wind, windRun } from '../../../render/physics.js';

const wrap = (x, m) => ((x % m) + m) % m;

// the frame's weather clock: the time, the weather's strength k (without the quality's cut: that only thins it) and
// its integral P to the time, the wind (m/s) and how far it has carried (m), which way it blows (1 or -1), the bass and
// the kicks eased
export function clock(f) {
  const F = fieldOf(f),
    t = f.t,
    k = F ? at(F, 'K', t) : 0;
  return {
    t,
    k,
    P: F ? at(F, 'P', t) : k * t,
    wind: wind(f),
    run: windRun(f),
    dir: breeze(f.look).base < 0 ? -1 : 1,
    // (the bass through its spring, and the kicks with an attack: what a weather swells with, never in one frame)
    bass: F ? at(F, 'B', t) : (f.mf?.bass ?? 0),
    kick: F ? at(F, 'Sk', t) : (f.mf?.kick ?? 0),
    // (and their integrals: what a speed that grows with the bass or the kicks has carried a thing)
    bassRun: F ? at(F, 'Bi', t) : 0,
    kickRun: F ? at(F, 'Ki', t) : 0,
  };
}
// the camera in screen px at the base scale (so a pull back up a climb does not sweep the weather): where it is, times
// a depth to get an offset, and how fast it goes (renderer.js measures it each frame)
export function cam(f) {
  const { v } = f,
    m = v.ppm0 ?? v.ppm;
  return { m, x: -v.x * m, y: v.y * m, vx: -(v.cvx ?? 0) * m, vy: (v.cvy ?? 0) * m };
}
// how much of the i-th of n shows (n fractional: the first floor(n) whole, the next fading in, the rest not)
export const share = (i, n) => Math.max(0, Math.min(1, n - i));
// a speed as a number or as [its rate at k = 0, more per unit of k]: the distance travelled at it by the clock c, and
// the speed itself now
export const travel = (q, c) => (typeof q === 'number' ? q * c.t : q[0] * c.t + q[1] * c.P);
export const rate = (q, c) => (typeof q === 'number' ? q : q[0] + q[1] * c.k);

// falling streaks: n of them (fractional: the last fading), speed in screens a second, slant (a drift of its own along
// the wind, 60 px/s a unit), length and width in px, at depth par; each drawn along its velocity against the camera, as
// long as it falls past it fast (a streak is the drop's path through the exposure)
export function fall(f, n, speed, slant, len, w, col, seed = 5, par = 1) {
  const { g, v } = f,
    c = clock(f),
    C = cam(f),
    d = v.dpr,
    sx = 60 * d * c.dir,
    // (the drift: its own slant and the wind, as a distance and as a speed, px)
    ox = sx * travel(slant, c) + c.run * C.m * par + C.x * par,
    vx0 = sx * rate(slant, c) + c.wind * C.m * par,
    vx = vx0 + C.vx * par,
    fy = v.H * travel(speed, c),
    vy0 = v.H * rate(speed, c),
    cy = C.y * par,
    vcy = C.vy * par,
    m = Math.ceil(n);
  g.strokeStyle = col;
  g.lineWidth = w * d;
  const draw = (i0, i1) => {
    g.beginPath();
    for (let i = i0; i < i1; i++) {
      const s = 0.7 + 0.6 * hash(i, 2),
        x = wrap(hash(i, seed) * v.W + ox, v.W),
        y = wrap(hash(i, seed + 4) * v.H + fy * s + cy, v.H),
        ux = vx,
        uy = vy0 * s + vcy,
        // (the time the streak spans: its length at rest over its speed at rest, the same for the speed it goes by at)
        sp = Math.hypot(ux, uy),
        k = Math.min(3 * len * d, (len * d * sp) / Math.max(1, Math.hypot(vx0, vy0 * s))) / Math.max(1, sp);
      g.moveTo(x, y);
      g.lineTo(x - ux * k, y - uy * k);
    }
    g.stroke();
  };
  draw(0, Math.floor(n));
  // (the one fading in)
  if (m > Math.floor(n)) {
    const a = g.globalAlpha;
    g.globalAlpha = a * (n - Math.floor(n));
    draw(Math.floor(n), m);
    g.globalAlpha = a;
  }
}
// drifting dots: n of them (fractional: the last fading), speed px/s (along the wind's way), radius px; the bigger ones
// nearer, so moved more by the camera
export function drift(f, n, sx, sy, r, col, seed) {
  const { g, v, t } = f,
    c = clock(f),
    C = cam(f),
    d = v.dpr,
    ox = travel(sx, c) * d * c.dir,
    oy = travel(sy, c) * d,
    a0 = g.globalAlpha;
  g.fillStyle = col;
  for (let i = 0; i < Math.ceil(n); i++) {
    const near = hash(i, 1),
      par = 0.45 + 0.55 * near,
      x = wrap(hash(i, seed) * v.W + ox * (0.5 + hash(i, 3)) + (c.run * C.m + C.x) * par, v.W),
      y = wrap(hash(i, seed + 7) * v.H + oy * (0.5 + hash(i, 9)) + C.y * par + Math.sin(t + i) * 6 * d, v.H);
    g.globalAlpha = a0 * share(i, n);
    g.beginPath();
    g.arc(x, y, r * d * (0.6 + near), 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = a0;
}
// a haze over the lower screen, its density breathing with the bass
export function haze(f, col, a) {
  const { g, v } = f,
    gr = g.createLinearGradient(0, v.H * 0.3, 0, v.H);
  gr.addColorStop(0, rgba(col, 0));
  gr.addColorStop(1, rgba(col, a));
  g.fillStyle = gr;
  g.fillRect(0, 0, v.W, v.H);
}
