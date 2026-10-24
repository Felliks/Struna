// The picture's physics (view-only: the run's own, which decides the timing, is run.js's and kinds.js's). One gravity
// for everything that falls in the picture (debris, chunks, sparks), smooth value noise for the camera's shake, the wind
// of a song's world, and the song's field: the music turned into slow, continuous quantities a picture can be a pure
// function of time with (the weather's distance travelled, the bass through a spring, the camera's punches with an
// attack), worked out once per song at fixed steps from its start and read back by interpolation, so a frame seeked to
// at any time is the frame played to it.
import { clamp, hash } from './util.js';

// the world's gravity in the picture (m/s²): his jump's (a 1.5 m arc over 0.8 s on the half-beat grid, run.js) is about
// this, so what is knocked off the roof falls the way he does
export const WORLD_G = 20;

// smooth value noise, -1..1, continuous with a continuous slope (a smoothstep between a random value at each integer)
export function vnoise(t, seed = 0) {
  const i = Math.floor(t),
    u = t - i,
    s = u * u * (3 - 2 * u),
    a = hash(i, seed),
    b = hash(i + 1, seed);
  return (a + (b - a) * s) * 2 - 1;
}
// two octaves of it (the camera's shake: Eiserloh's smooth noise, a different seed per axis)
export const noise2 = (t, seed) => 0.67 * vnoise(t, seed) + 0.33 * vnoise(t * 2.13 + 7.1, seed + 101);

// the song's field: its quantities sampled every STEP seconds from 0 (on the song's clock)
const STEP = 1 / 40,
  FIELDS = new WeakMap();
// (an attack: a quantity following the music up over about 50 ms instead of in one frame, and down with it)
const UP = 1 - Math.exp(-STEP / 0.04),
  DOWN = 1 - Math.exp(-STEP / 0.015);
const follow = (y, x) => y + (x - y) * (x > y ? UP : DOWN);

function build(fx, dur, L) {
  const n = Math.ceil((dur + 2) / STEP) + 2,
    F = { n, dur },
    names = ['St', 'D', 'Ks', 'K', 'P', 'B', 'Bi', 'Ki', 'W', 'Wi', 'Zd', 'Zb', 'Zp', 'Zu', 'Sd', 'Sb', 'Sk'];
  for (const k of names) F[k] = new Float32Array(n);
  let P = 0,
    b = 0,
    bv = 0,
    Wi = 0,
    Bi = 0,
    Ki = 0,
    gust = 0,
    zd = 0,
    zb = 0,
    zp = 0,
    zu = 0,
    ks = 0,
    kv = 0,
    sd = 0,
    sb = 0,
    sk = 0;
  for (let j = 0; j < n; j++) {
    const t = j * STEP,
      m = fx(Math.min(t, dur)),
      // (how strong the weather is: the world's stage, as layers/weather.js always had it)
      k = clamp((m.stage - 0.15) / 0.75, 0, 1),
      // (the wind's own part of the music: a slow gust, the bass through the spring below, and a gust thrown by each
      // snare that dies away over half a second)
      w = 0.7 * vnoise(t * 0.4, 23) + b + 1.2 * gust;
    F.K[j] = k;
    // (the world's stage itself, and the distance he has run: when a far thing came into view, places/kit.js)
    F.St[j] = m.stage;
    F.D[j] = L?.xAt ? L.xAt(Math.min(t, dur)) : 0;
    // (the kick through a springy, underdamped mass: what a solid thing swells with, squashed and back with a wobble)
    F.Ks[j] = ks;
    F.P[j] = P;
    F.B[j] = b;
    F.W[j] = w;
    F.Wi[j] = Wi;
    F.Bi[j] = Bi;
    F.Ki[j] = Ki;
    // (the camera's punches: a downbeat's and a kick's, the bass's pump, a drop's; and its shake's: the drop's, a build's
    // kicks, a hard song's kicks, each followed with an attack)
    zd = follow(zd, (0.06 * m.down + 0.03 * m.kick) * m.amp);
    zb = follow(zb, 0.025 * m.bass * m.amp);
    zp = follow(zp, 0.12 * m.drop ** 3);
    // (a build's creep in, let go over a moment as it ends on the drop)
    zu += (m.build - zu) * (m.build > zu ? UP : 1 - Math.exp(-STEP / 0.12));
    sd = follow(sd, m.drop ** 2);
    sb = follow(sb, m.build * m.kick);
    sk = follow(sk, m.kick * m.amp);
    F.Zd[j] = zd;
    F.Zb[j] = zb;
    F.Zp[j] = zp;
    F.Zu[j] = zu;
    F.Sd[j] = sd;
    F.Sb[j] = sb;
    F.Sk[j] = sk;
    // (the bass through a critically damped spring: the music pushes it, it never jumps)
    const om = 7,
      a = om * om * ((m.bass ?? 0) - b) - 2 * om * bv;
    bv += a * STEP;
    b += bv * STEP;
    const kw = 22,
      ka = kw * kw * (sk - ks) - 2 * 0.35 * kw * kv;
    kv += ka * STEP;
    ks += kv * STEP;
    gust += ((m.snare ?? 0) - gust) * (m.snare > gust ? UP : 1 - Math.exp(-STEP / 0.4));
    P += k * STEP;
    Wi += w * STEP;
    Bi += b * STEP;
    Ki += sk * STEP;
  }
  return F;
}
// (each integral and what it integrates: carried on at that rate before the song's start and past its end)
const OF = { P: 'K', Wi: 'W', Bi: 'B', Ki: 'Sk' };
// the field's quantity `name` at song time t (interpolated)
export function at(F, name, t) {
  const A = F[name],
    x = t / STEP,
    of = OF[name];
  if (x <= 0) return of ? F[of][0] * t : A[0];
  const j = Math.floor(x);
  if (j >= F.n - 1) return of ? A[F.n - 1] + F[of][F.n - 1] * (t - (F.n - 1) * STEP) : A[F.n - 1];
  return A[j] + (A[j + 1] - A[j]) * (x - j);
}
// the song's field for a frame (its renderer's fx; made the first time a frame asks, which is the run's first frame,
// drawn out of sight as the song loads)
export function fieldOf(f) {
  const fx = f.R?.fx,
    dur = f.L?.A?.dur;
  if (!fx || !dur) return null;
  let F = FIELDS.get(fx);
  if (!F) FIELDS.set(fx, (F = build(fx, dur, f.L)));
  return F;
}
// a quantity of the frame's field at its time, or `or` without one
export const eased = (f, name, or = 0) => {
  const F = fieldOf(f);
  return F ? at(F, name, f.t) : or;
};
// the song time he had run `d` metres by (the field's distance inverted: it never runs back)
export function timeAt(F, d) {
  const D = F.D;
  if (d <= D[0]) return 0;
  let lo = 0,
    hi = F.n - 1;
  if (d >= D[hi]) return hi * STEP;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (D[mid] <= d) lo = mid;
    else hi = mid;
  }
  return (lo + (D[hi] > D[lo] ? (d - D[lo]) / (D[hi] - D[lo]) : 0)) * STEP;
}

// a song's world's wind (m/s along +x on stage) at stage x: its own steady breeze, by the look, and the field's gusts
// and bass (one wind for the weather, the drifting motes and the plants, so all of them lean the same way), the gusts
// travelling along x at GUST m/s (a tree further on bends a moment later)
const BREEZE = new WeakMap(),
  GUST = 6;
export function breeze(look) {
  let b = look && BREEZE.get(look);
  if (b) return b;
  const h = hash(Math.round((look?.hue ?? 0) * 13) + (look?.place?.length ?? 0) * 7, 991);
  // (most worlds a light breeze along the run, some a breeze against it; the gusts and the bass on top of it)
  b = { base: -0.6 + 2.2 * h, gain: 0.8 + 0.8 * hash(Math.round((look?.hue ?? 0) * 13), 992) };
  if (look) BREEZE.set(look, b);
  return b;
}
export function wind(f, x = 0) {
  const F = fieldOf(f),
    b = breeze(f.look);
  if (!F) return b.base;
  return b.base + b.gain * at(F, 'W', Math.max(0, f.t - x / GUST));
}
// how far the world's wind leans a plant at x (-1.5..1.5; a gust along a row reaches each plant a moment apart)
export const lean = (f, x = 0) => clamp(wind(f, x) / 2.5, -1.5, 1.5);
// how far the wind has carried something (m) by song time t: the integral of wind(f, 0)
export function windRun(f) {
  const F = fieldOf(f),
    b = breeze(f.look);
  return b.base * f.t + (F ? b.gain * at(F, 'Wi', f.t) : 0);
}
