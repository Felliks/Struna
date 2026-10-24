// A man's body as a physical ragdoll (planck) that falls, gets hit and lies like a man, not like a doll on sticks.
// The owner rejected two versions before this one: a ragdoll with no joint limits curled into a ball, and one whose
// strong motors held a mocap pose looked clenched ("not a free fall of a man at all"). What works (Euphoria /
// PuppetMaster / GTA practice and fall biomechanics), all in this file:
//   - a man's segment masses (Winter's table: half of the mass in the trunk) and NO linear damping: he accelerates; the
//     air is a quadratic drag on each part by its length x width, so the heavy trunk leads and the light arms and legs
//     trail upward, the way they rise on a falling man (terminal speed VT for the whole body);
//   - hinge limits set by hand in the anatomical frame (knees bend back only, elbows forward only). Limits read off a
//     mocap projected to the side view are useless: an elbow seen from the side bends both ways;
//   - the hinge motors are weak muscles driven by state (fallStep): in the air he windmills his arms and pedals his
//     legs on the beat; the moment before a hit he braces his arms at it; a hit knocks the strength out of him and it
//     comes back; lying on something he keeps a little tone (with none he folds into a knot); dead, nothing;
//   - a soft torque keeps a living faller flat to the air, back or belly down (with none he ends in a stiff head-first dart);
//   - blows are impulses on one part (the chest, the head): the rest is dragged after it. Never set every part's velocity.
// A world builds the bodies with makeRagdoll(), calls fallStep() every physics step before world.step(), and reads
// the pose with ragJoints(). docs/ENGINE.md, "Bodies that fall".
import { BONES, JI, NJ, PARENT, clamp, smooth } from './skeleton.js';

const PL = () => window.planck;
export const GRAV = 9.81;

// ---- the joints' human range in the anatomical frame of a man facing +x. Each hinge is measured against the body
// part it hangs from: the spine and the neck against the trunk below, the shoulders and the hips against the trunk
// turned down (an arm hanging and a leg standing read 0, forward is +), the elbows, knees and ankles against the bone
// above. Bones (figure.js BONES): 0 hips-chest, 1 chest-neck, 2 neck-head, 3/6 collarbones, 4/7 upper arms, 5/8
// forearms, 9/13 pelvis, 10/14 thighs, 11/15 shanks, 12/16 feet.
export const HINGES = [1, 2, 4, 5, 7, 8, 10, 11, 12, 14, 15, 16];
export const ANAT = {
  1: { base: 0, off: 0, lo: -0.9, hi: 0.45 },
  2: { base: 1, off: 0, lo: -0.9, hi: 0.7 },
  4: { base: 1, off: Math.PI, lo: -1.4, hi: 3.3 },
  5: { base: 4, off: 0, lo: -0.12, hi: 2.6 },
  7: { base: 1, off: Math.PI, lo: -1.4, hi: 3.3 },
  8: { base: 7, off: 0, lo: -0.12, hi: 2.6 },
  10: { base: 0, off: Math.PI, lo: -0.7, hi: 2.4 },
  11: { base: 10, off: 0, lo: -2.4, hi: 0.03 },
  12: { base: 11, off: 0, lo: 0.5, hi: 2.1 },
  14: { base: 0, off: Math.PI, lo: -0.7, hi: 2.4 },
  15: { base: 14, off: 0, lo: -2.4, hi: 0.03 },
  16: { base: 15, off: 0, lo: 0.5, hi: 2.1 },
};
export const wrap = a => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));
export const boneAng = (J, i) => {
  const [a, c] = BONES[i];
  return Math.atan2(J[c * 2 + 1] - J[a * 2 + 1], J[c * 2] - J[a * 2]);
};
// a hinge's anatomical angle in pose J for a man facing `face`, unwrapped around the middle of its range
export const anat = (J, i, face) => {
  const r = ANAT[i],
    mid = (r.lo + r.hi) / 2;
  return mid + wrap(face * (boneAng(J, i) - boneAng(J, r.base)) + r.off - mid);
};

// ---- the bodies: one box per bone (the trunk thicker, a ball of a head), welded at the collarbones and the pelvis,
// hinged within the human range elsewhere.
// shares of the body's mass per bone (head and neck 8, trunk 50, upper arm 2.8, forearm and hand 2.2, thigh 10, shank
// 4.65, foot 1.45; the collarbones and the pelvis take a little from the trunk so the welds hold)
export const MASS = [20, 18.7, 8.1, 1.5, 2.8, 2.2, 1.5, 2.8, 2.2, 4, 10, 4.65, 1.45, 4, 10, 4.65, 1.45];
// how wide each part is to the air (the trunk is a man's chest across, a forearm a forearm)
export const WIDE = [0.34, 0.36, 0.2, 0.1, 0.1, 0.09, 0.1, 0.1, 0.09, 0.15, 0.15, 0.11, 0.09, 0.15, 0.15, 0.11, 0.09];
// the whole body's terminal speed, m/s (a real man's is ~55; 10 keeps him readable in a 4 m frame and still falling)
export const VT = 10;
const HEAD = 2;

// rag = the 17 parts ({b body, len, air, m, tq, j joint, a0}); rag.face, rag.mtot (total mass), rag.drag, rag.vt.
// o: vx, vy, spin, face (+1 facing +x), vt, group (collision filter group; the parts never collide with each other)
export function makeRagdoll(world, J, o = {}) {
  const { vx = 0, vy = 0, spin = 0, face = 1, vt = VT, group = -1 } = o;
  const P = PL(),
    parts = [];
  parts.face = face;
  BONES.forEach(([a, c], i) => {
    const x0 = J[a * 2],
      y0 = J[a * 2 + 1],
      x1 = J[c * 2],
      y1 = J[c * 2 + 1],
      len = Math.max(0.06, Math.hypot(x1 - x0, y1 - y0));
    const b = world.createBody({
      type: 'dynamic',
      position: P.Vec2((x0 + x1) / 2, (y0 + y1) / 2),
      angle: Math.atan2(y1 - y0, x1 - x0),
      angularDamping: 0.3,
      linearVelocity: P.Vec2(vx, vy),
      angularVelocity: spin,
      bullet: true,
    });
    b.createFixture(new P.Box(len / 2, i <= 1 ? 0.09 : 0.055), { density: 3, friction: 0.9, restitution: 0.04, filterGroupIndex: group });
    if (i === HEAD) b.createFixture(new P.Circle(P.Vec2(len / 2 + 0.06, 0), 0.14), { density: 3, friction: 0.9, restitution: 0.08, filterGroupIndex: group });
    b.setUserData({ bone: i });
    parts.push({ b, len, air: (len + (i === HEAD ? 0.1 : 0)) * WIDE[i] });
  });
  // the man's masses, scaled to the bodies' total so impulses keep their size
  const m0 = parts.reduce((v, p) => v + p.b.getMass(), 0),
    share = MASS.reduce((v, x) => v + x, 0);
  parts.forEach((p, i) => {
    const md = { mass: 0, center: P.Vec2(), I: 0 };
    p.b.getMassData(md);
    const m = (MASS[i] / share) * m0;
    p.b.setMassData({ mass: m, center: md.center, I: (md.I * m) / md.mass });
    p.m = m;
  });
  parts.mtot = m0;
  parts.vt = vt;
  parts.drag = (GRAV * m0) / (vt * vt * parts.reduce((v, p) => v + p.air, 0));
  // each muscle's strength is what it takes to hold up what hangs from it
  BONES.forEach((_, i) => {
    let m = 0;
    for (let k = 0; k < BONES.length; k++) for (let p = k; p >= 0; p = PARENT[p]) if (p === i) m += parts[k].m;
    parts[i].tq = m * GRAV * Math.max(0.25, parts[i].len);
  });
  const RIGID = new Set([3, 6, 9, 13]);
  BONES.forEach(([a], i) => {
    if (!i) return;
    const p = PARENT[i] < 0 ? 0 : PARENT[i],
      anchor = i === 9 || i === 13 ? P.Vec2(J[JI.hips * 2], J[JI.hips * 2 + 1]) : P.Vec2(J[a * 2], J[a * 2 + 1]);
    if (RIGID.has(i)) {
      parts[i].j = world.createJoint(new P.WeldJoint({}, parts[p].b, parts[i].b, anchor));
      return;
    }
    // the limit is on (angle now - angle at creation), mirrored when he faces -x
    const r = ANAT[i],
      now = anat(J, i, face),
      lo = Math.min(r.lo, now - 0.05),
      hi = Math.max(r.hi, now + 0.05),
      lim = face > 0 ? [lo - now, hi - now] : [now - hi, now - lo];
    parts[i].j = world.createJoint(
      new P.RevoluteJoint({ enableMotor: true, maxMotorTorque: 0, motorSpeed: 0, enableLimit: true, lowerAngle: lim[0], upperAngle: lim[1] }, parts[p].b, parts[i].b, anchor),
    );
    parts[i].a0 = now;
  });
  return parts;
}
// the pose (joints) of the ragdoll now
export function ragJoints(parts) {
  const J = new Float32Array(NJ * 2),
    n = new Float32Array(NJ);
  BONES.forEach(([a, c], i) => {
    const { b, len } = parts[i],
      p = b.getPosition(),
      an = b.getAngle(),
      dx = (Math.cos(an) * len) / 2,
      dy = (Math.sin(an) * len) / 2;
    J[a * 2] += p.x - dx;
    J[a * 2 + 1] += p.y - dy;
    n[a]++;
    J[c * 2] += p.x + dx;
    J[c * 2 + 1] += p.y + dy;
    n[c]++;
  });
  for (let j = 0; j < NJ; j++) {
    J[j * 2] /= n[j] || 1;
    J[j * 2 + 1] /= n[j] || 1;
  }
  return J;
}
// the air on each part: quadratic in its speed, on its area
export function ragAir(rag) {
  const P = PL();
  for (const p of rag) {
    const v = p.b.getLinearVelocity(),
      s = Math.hypot(v.x, v.y),
      k = rag.drag * p.air * s;
    p.b.applyForceToCenter(P.Vec2(-k * v.x, -k * v.y));
  }
}
// the muscles: every hinge is driven toward its target angle T[i] (anatomical) with strength S (a number, or per
// hinge; 1 = it can hold up what hangs from it against gravity). Weak muscles let the air, the momentum and the blows
// shape him; a little friction is left even in a limp body
export function ragMuscles(rag, T, S) {
  for (const i of HINGES) {
    const { j, a0, tq } = rag[i],
      cur = a0 + j.getJointAngle() * rag.face,
      s = typeof S === 'number' ? S : S[i];
    j.setMaxMotorTorque(tq * (0.03 + s));
    j.setMotorSpeed(clamp((T[i] - cur) * 7, -12, 12) * rag.face);
  }
}
// a part's world angle (a body keeps its bone's direction)
export const partAng = (rag, i) => rag[i].b.getAngle();
// the anatomical targets of a clip's pose (hanging, holding on: muscles toward a mocap pose)
export const clipT = (J, face = 1) => Object.fromEntries(HINGES.map(i => [i, anat(J, i, face)]));
// in the air, alive: he windmills his arms and pedals his legs, on the music's beats (beat0, the first beat; beatLen,
// seconds per beat), never twice the same; the panic `a` (1 = fresh terror, less as he is broken) sets how wide
export function flailT(t, a, seed, beat0 = 0, beatLen = 0.5) {
  const ph = (2 * Math.PI * (t - beat0)) / (2 * beatLen) + seed,
    w = (x, k) => Math.sin(x) + 0.35 * Math.sin(2.3 * x + k);
  return {
    1: 0.15 - 0.25 * a * w(ph * 0.5, 1),
    2: 0.25 * w(ph * 0.7 + 2, 0.4) - 0.1,
    4: 1.9 + 1.0 * a * w(ph, 0),
    7: 1.9 + 1.0 * a * w(ph + Math.PI + 0.6, 2),
    5: 0.6 + 0.5 * a * w(ph + 1.1, 3),
    8: 0.6 + 0.5 * a * w(ph + 4.2, 1),
    10: 0.55 + 0.6 * a * w(ph * 0.8, 5),
    14: 0.55 + 0.6 * a * w(ph * 0.8 + Math.PI, 6),
    11: -0.9 - 0.6 * a * w(ph * 0.8 + 1.6, 2),
    15: -0.9 - 0.6 * a * w(ph * 0.8 + Math.PI + 1.6, 4),
    12: 1.4,
    16: 1.4,
  };
}
// sprawled: a body with the fight knocked out of it, limbs loose and long
export const RELAX = { 1: 0, 2: -0.1, 4: 0.9, 7: 0.4, 5: 0.5, 8: 0.3, 10: 0.35, 14: 0.1, 11: -0.45, 15: -0.25, 12: 1.4, 16: 1.4 };
// the moment before he hits: the arms go out toward what he will hit (world direction `dir`), the knees give, the
// head turns away
export function braceT(rag, dir) {
  const up = partAng(rag, 1),
    arm = clamp(wrap(rag.face * (dir - up) + Math.PI), -1.4, 3.3);
  return { 1: -0.2, 2: 0.45, 4: arm, 7: arm - 0.25, 5: 0.25, 8: 0.35, 10: 0.7, 14: 0.45, 11: -0.8, 15: -0.5, 12: 1.3, 16: 1.3 };
}
// how far his strength has come back after a hit {t, k} (0 just after it, 1 again; the harder, the longer)
export function recovered(hit, t) {
  if (!hit) return 1;
  const kk = Math.min(hit.k ?? 0, 4);
  return smooth(0.3 + 0.15 * kk, 0.9 + 0.2 * kk, t - hit.t);
}

// ---- one physics step of a living (or dead) faller: his muscles for his state, the air, and the soft hand that
// keeps him flat to it. Call it before world.step(). s:
//   t          the time now
//   hit        the last hit {t, k} or null (k: its impulse; it sets how long he lies limp)
//   panic      1 = fresh terror; lower as he is broken (flail width and strength)
//   touching   he is lying on / pressed against something now
//   brace      world direction (radians) of what he is about to hit in the next ~0.3 s, or null
//   hang       anatomical targets to hold (e.g. clipT(hanging clip)) while his hands hold something, or null
//   dead       no muscles at all
//   seed       his own flail phase; beat0, beatLen: the music's beat grid
export function fallStep(rag, s) {
  const { t, hit = null, panic = 1, touching = false, brace = null, hang = null, dead = false, seed = 0, beat0 = 0, beatLen = 0.5 } = s;
  const back = recovered(hit, t);
  let T, S;
  if (hang) {
    T = hang;
    S = { ...Object.fromEntries(HINGES.map(i => [i, 0.25])), 4: 1.4, 7: 1.4, 5: 1.4, 8: 1.4 };
  } else if (brace !== null && !touching) {
    T = braceT(rag, brace);
    S = 1.8 * Math.max(back, 0.5) * panic;
  } else if (!touching && back < 0.5) {
    // knocked senseless in the air: he comes to flailing, weak and wide, never a stiff dart
    T = flailT(t * 0.8, 0.8 * panic, seed + 1, beat0, beatLen);
    S = 0.3 + 0.4 * back;
  } else if (touching) {
    // lying on it: the tone of a man who is still alive, sprawled, not knotted
    T = RELAX;
    S = 0.32 + 0.25 * back * panic;
  } else {
    T = flailT(t, panic, seed, beat0, beatLen);
    S = (0.45 + 0.6 * panic) * back;
  }
  ragMuscles(rag, T, dead ? 0 : S);
  ragAir(rag);
  // a falling man spreads out flat to the air, back or belly down, and turns slowly about it; head first is where a
  // dead weight ends up, not a man fighting it. A soft hand on the trunk for that, gone while he is knocked out,
  // touching anything, holding on or dead
  if (!hang && !touching && !dead) {
    const tr = rag[0].b,
      a = tr.getAngle(),
      flat = Math.abs(wrap(a)) < Math.PI / 2 ? 0 : Math.PI,
      err = wrap(flat + 0.45 * Math.sin(t * 0.9 + seed) - a),
      k = 0.35 * rag.mtot * back;
    tr.applyTorque(k * (5 * err - 2.2 * tr.getAngularVelocity()));
  }
  return back;
}

// where a point falling through the same air will be in tau seconds (to put things in his way): [x, y, vx, vy]
export function predictFall(x, y, vx, vy, tau, vt = VT) {
  const dt = 1 / 240,
    kd = GRAV / (vt * vt);
  for (let s = 0; s < tau; s += dt) {
    const sp = Math.hypot(vx, vy);
    vx -= kd * sp * vx * dt;
    vy -= (GRAV + kd * sp * vy) * dt;
    x += vx * dt;
    y += vy * dt;
  }
  return [x, y, vx, vy];
}

// a blow on one part (a flick, a punch, a throw): impulse I = [ix, iy] in units of his total mass (so [4, 0] is a
// 4 m/s shove on the whole body), at a point of the part (local x along the bone, from its middle). The rest of the
// body is dragged after it by the joints, which is what makes a blow read as a blow.
export function ragBlow(rag, part, I, along = 0) {
  const P = PL(),
    b = rag[part].b;
  b.applyLinearImpulse(P.Vec2(I[0] * rag.mtot, I[1] * rag.mtot), b.getWorldPoint(P.Vec2(along, 0)));
}
