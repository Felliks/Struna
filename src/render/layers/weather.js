// The weather of the song's look (look.js), growing with the world's stage (rain to a downpour, a breeze to a sand
// storm as the song builds to its drop) and moving with the music. Behind the world: the stars of a night or of space.
// In front of it: rain, snow, fog, sand, smog, embers, fireflies, debris.
import { mulberry } from '../../rng.js';
import { partOf } from '../../world/index.js';
import { at, fieldOf } from '../physics.js';

export function weatherBack(f) {
  const { g, v, t, mf, look } = f;
  // (the weather's own, behind the world: an aurora, meteors)
  partOf('weather', look.weather)?.back?.(f);
  // (the stars come out as the night does)
  const vis = look.time === 'space' || look.weather === 'stars' ? 1 : (look.night ?? (look.time === 'night' ? 1 : 0));
  if (vis <= 0) return;
  const rr = mulberry(11),
    n = look.time === 'space' ? 120 : 70,
    ga = g.globalAlpha,
    // (the stars a little nearer than the sky's grid behind them, never moved by the camera pulling back: the base scale)
    off = v.x * (v.ppm0 ?? v.ppm) * 0.03,
    // (on the beat a few of the stars flare, a different few each beat: never more flashes a second than beats; the
    // hats only shimmer them)
    A = f.L?.A,
    bi = A ? Math.floor((t - (A.beats?.[0] ?? 0)) / A.beat + 0.25) : 0;
  // (white under each star's alpha: a colour string per star per frame was a frame's garbage)
  g.fillStyle = '#ffffff';
  for (let i = 0; i < n; i++) {
    const lit = rr() < 0.3,
      tw = 0.35 + 0.3 * Math.sin(t * 2 + i) + (lit ? 0.12 * Math.min(1, mf.hat * 2) + (((i * 7 + bi) % 11) === 0 ? 0.45 * mf.beat : 0) : 0),
      x = ((rr() * v.W - off) % v.W + v.W) % v.W,
      y = rr() * v.H * 0.75;
    g.globalAlpha = ga * Math.max(0, Math.min(1, Math.min(1, tw) * vis));
    g.fillRect(x, y, 2 * v.dpr, 2 * v.dpr);
  }
  g.globalAlpha = ga;
}

export function weatherFront(f) {
  // (the weather's strength, the field's (physics.js: the stage as it always was, never stepped); lighter weather at
  // low quality, the cut eased over a second of real time so a step of the quality never pops drops in or out)
  const R = f.R,
    F = fieldOf(f),
    q = R ? (R.wq = (R.wq ?? f.glow) + (f.glow - (R.wq ?? f.glow)) * Math.min(1, (f.dt || 0) * 2)) : f.glow,
    k = (F ? at(F, 'K', f.t) : Math.max(0, Math.min(1, (f.mf.stage - 0.15) / 0.75))) * (0.4 + 0.6 * q);
  // (in the screen's frame: the weather is between the camera and the world, so the world's punches in and tilts are
  // not its; it is moved by the camera's travel itself, weather/kit.js)
  const { g } = f;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  try {
    partOf('weather', f.look.weather)?.front?.(f, k);
  } finally {
    g.restore();
  }
}
