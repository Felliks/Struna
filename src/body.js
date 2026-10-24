// The body's maths under the animation (anim.js): a pose as a rig (the hips' place and each bone's angle and length),
// so blends turn bones instead of sliding their ends (a lerp of joint positions shortens every bone through the blend
// and folds limbs through the body), critically damped springs (Holden, "Spring-It-On": exact for any step, so the
// fixed 120 Hz step keeps everything deterministic), two-bone IK and a few event responses that are pure functions of
// the time since the event.
import { BONES, NB, NJ } from './lib/skeleton.js';

export const RIG = 2 + NB * 2;
const LN2 = 0.6931471805599453;
export const TAU = Math.PI * 2;
export const wrap = a => a - TAU * Math.floor((a + Math.PI) / TAU);
export const clamp = (x, a = 0, c = 1) => Math.min(c, Math.max(a, x));
export const ease = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

// joint positions -> rig: [hips x, hips y, angle and length of each bone]
export function toRig(J, out = new Float64Array(RIG)) {
  out[0] = J[0];
  out[1] = J[1];
  for (let b = 0; b < NB; b++) {
    const [p, c] = BONES[b],
      dx = J[c * 2] - J[p * 2],
      dy = J[c * 2 + 1] - J[p * 2 + 1];
    out[2 + b * 2] = Math.atan2(dy, dx);
    out[3 + b * 2] = Math.hypot(dx, dy);
  }
  return out;
}
// rig -> joint positions (the bones in order, each from its parent's end)
export function fromRig(R, out = new Float32Array(NJ * 2)) {
  out[0] = R[0];
  out[1] = R[1];
  for (let b = 0; b < NB; b++) {
    const [p, c] = BONES[b],
      a = R[2 + b * 2],
      l = R[3 + b * 2];
    out[c * 2] = out[p * 2] + Math.cos(a) * l;
    out[c * 2 + 1] = out[p * 2 + 1] + Math.sin(a) * l;
  }
  return out;
}
// a rig between two rigs: angles the short way round, lengths and the hips straight
export function mixRig(A, B, u, out = new Float64Array(RIG)) {
  out[0] = A[0] + (B[0] - A[0]) * u;
  out[1] = A[1] + (B[1] - A[1]) * u;
  for (let b = 0; b < NB; b++) {
    const i = 2 + b * 2;
    out[i] = A[i] + wrap(B[i] - A[i]) * u;
    out[i + 1] = A[i + 1] + (B[i + 1] - A[i + 1]) * u;
  }
  return out;
}
// two poses (joint positions) mixed as rigs
export const mixPose = (A, B, u) => (u <= 0 ? Float32Array.from(A) : u >= 1 ? Float32Array.from(B) : fromRig(mixRig(toRig(A), toRig(B), u)));

// ---- springs: state {x, v}
const damping = hl => (4 * LN2) / (hl + 1e-5);
const negexp = x => 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
// towards a goal, critically damped, `hl` the seconds to cover half the way
export function spring(s, goal, hl, dt) {
  const y = damping(hl) / 2,
    j0 = s.x - goal,
    j1 = s.v + j0 * y,
    e = negexp(y * dt);
  s.x = e * (j0 + j1 * dt) + goal;
  s.v = e * (s.v - j1 * y * dt);
}
// the same towards 0 (an offset decaying: inertialization)
export function decay(x, v, hl, dt) {
  const y = damping(hl) / 2,
    j1 = v + x * y,
    e = negexp(y * dt);
  return [e * (x + j1 * dt), e * (v - j1 * y * dt)];
}

// the same, in place: X[i] decayed with its velocity V[j] (no array made: it runs dozens of times a step)
export function decayAt(X, i, V, j, hl, dt) {
  const y = damping(hl) / 2,
    x = X[i],
    v = V[j],
    j1 = v + x * y,
    e = negexp(y * dt);
  X[i] = e * (x + j1 * dt);
  V[j] = e * (v - j1 * y * dt);
}
// a bounce after an event, a pure function of the time since it: an under-damped spring let go from `amp`
export const bounce = (tau, amp, period = 0.24, hl = 0.07) => (tau < 0 ? 0 : amp * Math.exp((-tau * LN2) / hl) * Math.cos((TAU * tau) / period));
// a moving hold: time within a beat warped so the body slows to a stop on the beat and moves between (0..1 -> 0..1)
export const hold = (u, a) => u - (a * Math.sin(TAU * u)) / TAU;

// two-bone IK in the plane: the angles of the upper and lower bone that put the end at (tx, ty) from the root at
// (rx, ry), the joint bending the way `bend` says (+1 / -1)
export function ik2(rx, ry, tx, ty, l1, l2, bend) {
  const dx = tx - rx,
    dy = ty - ry,
    d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-4),
    c2 = clamp((d * d - l1 * l1 - l2 * l2) / (2 * l1 * l2), -1, 1),
    t2 = bend * Math.acos(c2),
    a1 = Math.atan2(dy, dx) - Math.atan2(l2 * Math.sin(t2), l1 + l2 * Math.cos(t2));
  return [a1, a1 + t2];
}
