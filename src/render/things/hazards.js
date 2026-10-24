// The hazards in a shaft: what the cursor throws into his lane as he falls or flies up. They must never read as
// somewhere to stand (a child took the old ledges for platforms): research on shape language (Celeste's testers kept
// off spiky ground they would walk on rounded; Just Shapes & Beats: "the pink, it's bad") says sharp, jagged, spinning
// and red-hot is danger before anything is explained. So every one of them is spiked or spinning or crackling, its
// teeth on every side (nothing flat to land on), with a red-hot core pulsing on the beat, in the place's own material.
// Drawn in the kit's frame (metres, base centre, y up), about 1.3 m across and 0.6 m tall, centred 0.3 m up.
// They move with the music by the shaft's tier (o.tier: the first shaft barely, the second more, the third and on all
// of it): spinning, swinging, snapping on the kick, swelling on the bass, sparking on the hats, shaking on the snare;
// but always inside their lane (within about 0.65 m of the middle across, 0.5 m up and down), so no lane ever looks
// left safe and none looks taken that is not.
import { rgba } from '../util.js';

export const DANGER = '#ff2a3d';
const C = 0.3;
const TAU = Math.PI * 2;

// how much a hazard moves by its shaft: the first barely (it is being learned), the second more, the third all of it
const amp = o => [0.35, 0.7, 1][Math.min(2, Math.max(0, o?.tier ?? 0))];
// a hazard's own clock: its steady motion (spin, sway, bob) on the song's beat (as fast as the wall clock's at 120 beats
// a minute, faster in a faster song), each a way through it of its own, so two in a shaft never swing in step
const own = (k, o) => ({ ...k, t: 0.5 * (k.beats ?? k.t * 2) + ((((o?.t ?? 0) * 7.31 + (o?.lane ?? 0) * 2.9) % 9) + 9) % 9 });
// one of the music's impulses, 0 where the analysis has none
const mu = (k, n) => k.mf[n] ?? 0;
// a jolt on the snare: a small shake (dx, dy) that dies with the hit (never random)
const jolt = (k, a, s = 0.05) => [Math.sin(k.t * 71) * s * a * mu(k, 'snare'), Math.cos(k.t * 53) * s * 0.7 * a * mu(k, 'snare')];

// the kit moved: everything drawn through it turned by ang about (px, py), then shifted by (dx, dy), scaled by s
function xf(k, px, py, ang = 0, dx = 0, dy = 0, s = 1) {
  const c = Math.cos(ang) * s,
    sn = Math.sin(ang) * s,
    P = (x, y) => [px + dx + (x - px) * c - (y - py) * sn, py + dy + (x - px) * sn + (y - py) * c];
  const q = {
    ...k,
    box(x, y, w, h, fill, stroke, lw = 0.03) {
      k.poly([P(x, y), P(x + w, y), P(x + w, y + h), P(x, y + h)], fill);
      if (stroke) q.frame(x, y, w, h, stroke, lw);
    },
    frame(x, y, w, h, col, lw = 0.03) {
      const p = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
      for (let i = 0; i < 4; i++) q.line(p[i][0], p[i][1], p[(i + 1) % 4][0], p[(i + 1) % 4][1], lw, col);
    },
    round(x, y, w, h, r, fill) {
      q.box(x, y, w, h, fill);
    },
    line(x0, y0, x1, y1, w, col) {
      const [ax, ay] = P(x0, y0),
        [bx, by] = P(x1, y1);
      k.line(ax, ay, bx, by, w * s, col);
    },
    disc(x, y, r, fill) {
      const [ax, ay] = P(x, y);
      k.disc(ax, ay, r * s, fill);
    },
    poly(pts, fill) {
      k.poly(
        pts.map(([x, y]) => P(x, y)),
        fill,
      );
    },
  };
  return q;
}

// teeth all round a circle of radius r at (x, y): n of them, len long, turned by a
function teeth(k, x, y, r, n, len, a, col) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const ang = a + (i * Math.PI) / n,
      rr = i % 2 ? r : r + len;
    pts.push([x + Math.cos(ang) * rr, y + Math.sin(ang) * rr]);
  }
  k.poly(pts, col);
}
// the red-hot core: a disc that swells and brightens on the kick
function core(k, x, y, r) {
  k.glow(2);
  k.disc(x, y, r * (1 + 0.25 * k.mf.kick), rgba(DANGER, 0.75 + 0.25 * k.mf.beat));
  k.plain();
  k.disc(x, y, r * 0.45, rgba('#fff3e0', 0.6 + 0.4 * k.mf.kick));
}
// sparks thrown from (x, y) on the hats: n short streaks fanned about angle a (spread wide), len long at most
function sparks(k, x, y, n, a, spread, len, amt, col = '#fff3a0') {
  if (amt < 0.05) return;
  for (let j = 0; j < n; j++) {
    const b = a + spread * (j / Math.max(1, n - 1) - 0.5) + 0.25 * Math.sin(k.t * 13 + j * 2.1),
      r0 = len * 0.25,
      r1 = len * (0.35 + 0.65 * amt);
    k.line(x + Math.cos(b) * r0, y + Math.sin(b) * r0, x + Math.cos(b) * r1, y + Math.sin(b) * r1, 0.02, col);
  }
}

// two saw blades spinning on a bar (metal, red hubs), the bar rocking and jolted by the snare
export const saw =
  (body, blade = '#d9dde3') =>
  (k, o) => {
    k = own(k, o);
    const a = amp(o),
      [dx, dy] = jolt(k, a, 0.06),
      q = xf(k, 0, C, a * 0.12 * Math.sin(k.t * 2.6), dx, dy + a * 0.05 * Math.sin(k.t * 3.1));
    q.box(-0.65, C - 0.05, 1.3, 0.1, body);
    for (const x of [-0.35, 0.35]) {
      teeth(q, x, C, 0.24, 12, 0.08 + 0.03 * a * mu(k, 'kick'), k.t * (10 + 8 * a) * (x < 0 ? 1 : -1), blade);
      q.disc(x, C, 0.17, body);
      core(q, x, C, 0.07);
    }
  };
// a beam bristling with spikes above and below (its material, red-hot tips), seesawing, the spikes stabbing on the beat
export const spikes = (body, spike) => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    [dx, dy] = jolt(k, a),
    q = xf(k, 0, C, a * 0.1 * Math.sin(k.t * 2.2), dx, dy);
  q.box(-0.62, C - 0.1, 1.24, 0.2, body, rgba(DANGER, 0.6 + 0.4 * k.mf.kick), 0.03);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const x = -0.52 + (i * 1.04) / (n - 1),
      l = 0.2 + (0.04 + 0.06 * a) * (0.5 + 0.5 * Math.sin(k.t * 6 + i)) * (0.4 + 0.6 * k.mf.beat);
    q.poly([[x - 0.08, C + 0.1], [x + 0.08, C + 0.1], [x, C + 0.1 + l]], spike);
    q.poly([[x - 0.08, C - 0.1], [x + 0.08, C - 0.1], [x, C - 0.1 - l]], spike);
    q.disc(x, C + 0.1 + l, 0.025, rgba(DANGER, 0.6 + 0.4 * k.mf.beat));
    q.disc(x, C - 0.1 - l, 0.025, rgba(DANGER, 0.6 + 0.4 * k.mf.beat));
  }
  for (const x of [-0.3, 0.3]) core(q, x, C, 0.06);
};
// a spiked ball (a sea mine, a space mine, a lava bomb, a thorn ball): spikes all round, turning, swaying, swelling on
// the bass, a blinking eye
export const mine =
  (body, spike = body) =>
  (k, o) => {
    k = own(k, o);
    const am = amp(o),
      q = xf(k, 0, C, 0, am * 0.1 * Math.sin(k.t * 1.7), am * 0.04 * Math.sin(k.t * 2.3), 1 + 0.08 * am * mu(k, 'bass')),
      a = k.t * (1 + 2 * am);
    for (let i = 0; i < 10; i++) {
      const ang = a + (i * Math.PI) / 5;
      q.line(Math.cos(ang) * 0.22, C + Math.sin(ang) * 0.22, Math.cos(ang) * 0.4, C + Math.sin(ang) * 0.4, 0.05, spike);
      q.disc(Math.cos(ang) * 0.41, C + Math.sin(ang) * 0.41, 0.035, rgba(DANGER, 0.7 + 0.3 * k.mf.beat));
    }
    q.disc(0, C, 0.27, body);
    core(q, 0, C, 0.09);
    // (a second, smaller one beside it: the lane is full)
    teeth(k, 0.5, C + 0.05, 0.08, 7, 0.07, -a, spike);
    teeth(k, -0.5, C - 0.05, 0.08, 7, 0.07, a, spike);
  };
// an electric barrier: two emitters and lightning crackling across between them, jumping on the hats
export const zapper =
  (body, arc = '#8ff7ff') =>
  (k, o) => {
    k = own(k, o);
    const a = amp(o),
      [dx, dy] = jolt(k, a, 0.04);
    for (const x of [-0.62, 0.62]) {
      k.box(x - 0.08 + dx, C - 0.25 + dy, 0.16, 0.5, body, rgba(DANGER, 0.7), 0.03);
      core(k, x + dx, C + dy, 0.06);
    }
    k.glow(2);
    for (let j = 0; j < 3; j++) {
      const pts = [];
      let y = C;
      for (let i = 0; i <= 8; i++) {
        const x = -0.54 + (i * 1.08) / 8;
        y = i === 0 || i === 8 ? C : C + Math.sin(k.t * 37 + i * 2.3 + j * 5) * (0.06 + 0.06 * a + (0.06 + 0.1 * a) * k.mf.hat);
        pts.push([x, y]);
      }
      for (let i = 1; i < pts.length; i++) k.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], j ? 0.025 : 0.05, j ? arc : rgba('#ffffff', 0.9));
    }
    k.plain();
  };
// a cluster of jagged shards (ice, crystal, obsidian), points every way, glowing red at the heart, rocking and
// swelling on the bass
export const shards = (body, edge) => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    [dx, dy] = jolt(k, a),
    q = xf(k, 0, C, a * 0.14 * Math.sin(k.t * 1.9), dx, dy, 1 + 0.06 * a * mu(k, 'bass'));
  for (const [x, dx2, dy2] of [[-0.45, -0.2, 0.45], [-0.15, -0.05, 0.6], [0.2, 0.1, 0.55], [0.5, 0.25, 0.4], [-0.35, -0.15, -0.4], [0.05, 0.05, -0.45], [0.4, 0.2, -0.35]]) {
    // (a shard's length wavers, out of step with the others)
    const l = 0.85 + 0.15 * Math.sin(k.t * 4 + x * 9) * a;
    q.poly([[x - 0.1, C], [x + 0.1, C], [x + dx2 * l, C + dy2 * l]], body);
    q.line(x, C, x + dx2 * l, C + dy2 * l, 0.02, edge);
  }
  core(q, 0, C, 0.08);
};

// a neon sign torn loose, swinging on its two chains: broken glass in teeth along its bottom, torn metal spiked along
// its top, its tube flickering, sparks spitting from its broken corner on the hats
export const neonsign = (board, neon, glass = '#d6f0ff') => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    py = C + 0.5,
    q = xf(k, 0, py, a * 0.2 * Math.sin(k.t * 2.4) + a * 0.06 * mu(k, 'kick')),
    fl = Math.sin(k.t * 23) + Math.sin(k.t * 37.3) > -1.3 ? 1 : 0.2;
  for (const x of [-0.36, 0.36]) q.line(x * 0.8, py, x, C + 0.18, 0.025, '#9aa0a8');
  const bot = [[-0.5, C - 0.12]];
  for (let i = 0; i <= 8; i++) bot.push([-0.5 + i * 0.125, C - 0.14 - (i % 2 ? 0.15 + 0.04 * Math.sin(i * 2.1) : 0.02)]);
  bot.push([0.5, C - 0.12]);
  q.poly(bot, glass);
  q.box(-0.5, C - 0.14, 1.0, 0.32, board, rgba(DANGER, 0.6 + 0.4 * mu(k, 'kick')), 0.03);
  for (let i = 0; i < 5; i++) {
    const x = -0.4 + i * 0.2;
    q.poly([[x - 0.06, C + 0.18], [x + 0.06, C + 0.18], [x + 0.02 * Math.sin(i * 3), C + 0.31]], '#c9ccd2');
  }
  q.frame(-0.44, C - 0.09, 0.88, 0.22, rgba(neon, 0.3 + 0.5 * fl), 0.02);
  // (the tube: a zigzag bolt across it)
  for (let i = 0; i < 6; i++) {
    const x0 = -0.36 + i * 0.12;
    q.line(x0, C + (i % 2 ? 0.07 : -0.05), x0 + 0.12, C + (i % 2 ? -0.05 : 0.07), 0.035, rgba(neon, 0.25 + 0.75 * fl));
  }
  sparks(q, 0.42, C - 0.13, 4, -1.6, 1.6, 0.24, a * mu(k, 'hat'));
  core(q, 0, C + 0.02, 0.06);
};
// a shattered window: shards bursting out of a bent frame from the hit at its heart, a web of cracks, flung further on
// the snare
export const glassburst = (frame, glass) => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    sn = mu(k, 'snare'),
    q = xf(k, 0, C, a * 0.1 * Math.sin(k.t * 1.7), 0, 0, 1 + 0.05 * a * mu(k, 'bass'));
  q.frame(-0.5, C - 0.28, 1.0, 0.56, frame, 0.06);
  const web = [];
  for (let i = 0; i < 9; i++) {
    const ang = (i * TAU) / 9 + 0.25 * Math.sin(i * 2.7),
      out = 0.035 * a * sn + 0.015 * a * Math.sin(k.t * 5 + i),
      f = 0.8 + 0.2 * Math.sin(i * 1.3),
      tip = [Math.cos(ang) * 0.56 * f + Math.cos(ang) * out, C + Math.sin(ang) * 0.42 * f + Math.sin(ang) * out],
      b0 = 0.06 + out;
    q.poly([[Math.cos(ang - 0.3) * b0, C + Math.sin(ang - 0.3) * b0], [Math.cos(ang + 0.3) * b0, C + Math.sin(ang + 0.3) * b0], tip], glass);
    q.line(Math.cos(ang) * b0, C + Math.sin(ang) * b0, tip[0], tip[1], 0.015, '#ffffff');
    web.push([Math.cos(ang) * 0.24, C + Math.sin(ang) * 0.19]);
  }
  for (let i = 0; i < 9; i++) q.line(web[i][0], web[i][1], web[(i + 1) % 9][0], web[(i + 1) % 9][1], 0.015, rgba('#ffffff', 0.8));
  core(q, 0, C, 0.07);
};
// a rooftop fan broken off its housing: a toothed cage, four blades spinning in it (faster on the kick), red leading
// edges, barbed mounts out to the lane's sides
export const fan = (hub, blade) => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    [dx, dy] = jolt(k, a, 0.04),
    q = xf(k, 0, C, 0, dx, dy),
    sp = k.t * (4 + 7 * a) + a * 0.8 * mu(k, 'kick');
  for (const s of [-1, 1]) {
    q.line(s * 0.4, C, s * 0.62, C, 0.07, hub);
    q.poly([[s * 0.5, C + 0.03], [s * 0.6, C + 0.03], [s * 0.55, C + 0.17]], blade);
    q.poly([[s * 0.5, C - 0.03], [s * 0.6, C - 0.03], [s * 0.55, C - 0.17]], blade);
  }
  teeth(q, 0, C, 0.4, 16, 0.07, -sp * 0.15, hub);
  q.disc(0, C, 0.35, '#0c0e12');
  for (let i = 0; i < 4; i++) {
    const b = sp + (i * TAU) / 4,
      P = (r, da) => [Math.cos(b + da) * r, C + Math.sin(b + da) * r];
    q.poly([P(0.07, -0.4), P(0.33, -0.22), P(0.34, 0.14), P(0.07, 0.4)], blade);
    q.line(...P(0.33, -0.22), ...P(0.34, 0.14), 0.03, DANGER);
  }
  q.disc(0, C, 0.1, hub);
  core(q, 0, C, 0.05);
};
// a glitching cube: turning in space, its corners spiked, its edges lit; on the snare it tears sideways into its own
// coloured ghosts
export const glitchcube = (body, edge) => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    sn = mu(k, 'snare'),
    h = 0.235 * (1 + 0.06 * a * mu(k, 'bass')),
    ry = k.t * (0.7 + 1.6 * a),
    rx = 0.5 + 0.2 * Math.sin(k.t * 0.9),
    gx = a * 0.1 * sn * (Math.sin(k.t * 40) > 0 ? 1 : -1),
    V = [],
    Z = [];
  for (const x of [-h, h])
    for (const y of [-h, h])
      for (const z of [-h, h]) {
        const x1 = x * Math.cos(ry) + z * Math.sin(ry),
          z1 = -x * Math.sin(ry) + z * Math.cos(ry);
        V.push([x1 + gx, C + y * Math.cos(rx) - z1 * Math.sin(rx)]);
        Z.push(y * Math.sin(rx) + z1 * Math.cos(rx));
      }
  const faces = [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]].filter(f => f.reduce((s, i) => s + Z[i], 0) > 0);
  // (its ghosts, see-through: no outline)
  if (a * sn > 0.15)
    for (const [d, col] of [[-0.1, '#ff2a8a'], [0.1, '#29e7ff']]) for (const f of faces) k.poly(f.map(i => [V[i][0] + d, V[i][1]]), rgba(col, 0.35));
  faces.forEach((f, j) => {
    k.poly(
      f.map(i => V[i]),
      body,
    );
    k.poly(
      f.map(i => V[i]),
      rgba('#ffffff', 0.06 + 0.08 * j),
    );
  });
  for (let i = 0; i < 8; i++)
    for (const bit of [1, 2, 4]) if (!(i & bit)) k.line(V[i][0], V[i][1], V[i | bit][0], V[i | bit][1], 0.025, edge);
  for (const [x, y] of V) {
    const ux = x - gx,
      uy = y - C,
      l = Math.hypot(ux, uy) || 1,
      nx = ux / l,
      ny = uy / l;
    k.poly([[x - ny * 0.04, y + nx * 0.04], [x + ny * 0.04, y - nx * 0.04], [x + nx * 0.11, y + ny * 0.11]], DANGER);
  }
  core(k, gx, C, 0.05);
};
// a pair of laser emitters on spiked posts at the lane's edges, two beams scissoring between them (crossing at the
// red heart in the middle), fatter on the bass, sparks off the crossing on the hats
export const laserpair = (body, beam) => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    w = k.t * (1.4 + 2.4 * a),
    A = 0.08 + 0.14 * a,
    bw = 0.03 + 0.03 * mu(k, 'bass');
  for (const x of [-0.56, 0.56]) {
    k.box(x - 0.05, C - 0.32, 0.1, 0.64, body, rgba(DANGER, 0.7), 0.025);
    teeth(k, x, C + 0.33, 0.05, 5, 0.07, k.t * 3 * Math.sign(x), body);
    teeth(k, x, C - 0.33, 0.05, 5, 0.07, -k.t * 3 * Math.sign(x), body);
  }
  k.glow(2);
  for (const e of [Math.sin(w), Math.cos(w * 0.8)]) {
    const y0 = C + A * e,
      y1 = C - A * e;
    k.line(-0.5, y0, 0.5, y1, bw * 2.2, rgba(beam, 0.5));
    k.line(-0.5, y0, 0.5, y1, bw * 0.6, '#ffffff');
    k.disc(-0.53, y0, 0.045, DANGER);
    k.disc(0.53, y1, 0.045, DANGER);
  }
  k.plain();
  sparks(k, 0, C, 4, Math.PI / 2, TAU * 0.9, 0.3, a * mu(k, 'hat'), beam);
  core(k, 0, C, 0.05);
};
// a hornets' nest: a papery ball in bands, bulging on the bass, the red heat in its hole, and the swarm round it (more
// of them by the shaft, wilder on the hats), stings out
export const hornetnest = (body, stripe) => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    b = 1 + 0.1 * a * mu(k, 'bass'),
    n = 4 + 2 * Math.min(2, o?.tier ?? 0),
    pts = [];
  k.line(0, C + 0.28, 0, C + 0.5, 0.04, '#3a2a14');
  for (let i = 0; i < 14; i++) {
    const th = (i * TAU) / 14,
      r = 1 + 0.06 * (i % 2);
    pts.push([Math.cos(th) * 0.24 * b * r, C + Math.sin(th) * 0.3 * b * r]);
  }
  k.poly(pts, body);
  for (const y of [-0.17, -0.06, 0.05, 0.16]) {
    const w = 0.24 * b * Math.sqrt(Math.max(0, 1 - (y / (0.3 * b)) ** 2));
    k.line(-w, C + y, w, C + y, 0.03, stripe);
  }
  core(k, 0, C - 0.12, 0.06);
  for (let i = 0; i < n; i++) {
    const dir = i % 2 ? -1 : 1,
      ph = k.t * (1.8 + 2.2 * a) * dir + (i * TAU) / n,
      rr = 0.44 + 0.08 * Math.sin(k.t * 3 + i * 1.7) + 0.04 * mu(k, 'hat') * Math.sin(k.t * 29 + i),
      x = Math.cos(ph) * rr * 1.1,
      y = C + Math.sin(ph) * rr * 0.75,
      tx = -Math.sin(ph) * dir,
      ty = Math.cos(ph) * dir;
    k.poly([[x - tx * 0.04 - ty * 0.025, y - ty * 0.04 + tx * 0.025], [x - tx * 0.04 + ty * 0.025, y - ty * 0.04 - tx * 0.025], [x - tx * 0.12, y - ty * 0.12]], DANGER);
    k.disc(x, y, 0.045, stripe);
    k.disc(x + tx * 0.05, y + ty * 0.05, 0.03, '#1a1408');
    k.disc(x - ty * 0.04, y + tx * 0.04, 0.035, rgba('#ffffff', 0.35));
  }
};
// a knot of thorny vines writhing round itself, thorns out along every stem, the red heat where they cross
export const vineknot = (vine, thorn) => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    w = k.t * (0.4 + 0.9 * a),
    sw = 1 + 0.06 * a * mu(k, 'bass');
  core(k, 0, C, 0.07);
  for (let c = 0; c < 2; c++) {
    let prev = null;
    for (let i = 0; i <= 10; i++) {
      const th = (i / 10) * TAU,
        x = 0.5 * Math.sin(2 * th + w * (c ? -1 : 1) + c * 1.3),
        y = C + 0.33 * sw * Math.sin(3 * th + c * 0.8);
      if (prev) {
        k.line(prev[0], prev[1], x, y, 0.055, vine);
        const ux = x - prev[0],
          uy = y - prev[1],
          l = Math.hypot(ux, uy) || 1,
          mx = (x + prev[0]) / 2,
          my = (y + prev[1]) / 2,
          side = i % 2 ? 1 : -1;
        k.poly([[mx - (ux / l) * 0.04, my - (uy / l) * 0.04], [mx + (ux / l) * 0.04, my + (uy / l) * 0.04], [mx - (uy / l) * 0.12 * side, my + (ux / l) * 0.12 * side]], thorn);
      }
      prev = [x, y];
    }
  }
};
// a pair of toothed jaws (a bear trap, a skull, a crusher, a clam): open, and snapping shut on the kick, the two rows of
// teeth interlocking, spikes on their backs, the red heat seen between them
export const jaws =
  (body, tooth, { block = false, ribs = 0, eyes = false } = {}) =>
  (k, o) => {
    k = own(k, o);
    const a = amp(o),
      gap = 0.03 + 0.2 * (1 - a * mu(k, 'kick')),
      [dx, dy] = jolt(k, a, 0.04),
      q = xf(k, 0, C, 0, dx, dy);
    core(q, 0, C, 0.07);
    for (const s of [1, -1]) {
      const y0 = C + (s * gap) / 2,
        back = [];
      if (block) back.push([-0.58, y0], [-0.52, y0 + s * 0.2], [0.52, y0 + s * 0.2], [0.58, y0]);
      else for (let i = 0; i <= 8; i++) back.push([-0.58 * Math.cos((Math.PI * i) / 8), y0 + s * 0.2 * Math.sin((Math.PI * i) / 8)]);
      for (let i = 0; i < 7; i++) {
        const x = -0.48 + i * 0.16 + (s < 0 ? 0.08 : 0);
        q.poly([[x - 0.06, y0], [x + 0.06, y0], [x, y0 - s * 0.13]], tooth);
      }
      q.poly(back, body);
      for (let r = 1; r <= ribs; r++) {
        const th = (Math.PI * r) / (ribs + 1);
        q.line(0, y0, -0.5 * Math.cos(th), y0 + s * 0.17 * Math.sin(th), 0.025, tooth);
      }
      for (let i = 0; i < 4; i++) {
        const th = (Math.PI * (i + 1)) / 5,
          bx = -0.58 * Math.cos(th),
          by = block ? y0 + s * 0.2 : y0 + s * 0.2 * Math.sin(th),
          nx = block ? 0 : -Math.cos(th) * 0.4,
          ny = s;
        q.poly([[bx - 0.045, by], [bx + 0.045, by], [bx + nx * 0.08, by + ny * 0.09]], tooth);
      }
    }
    // (a skull's: two sockets in its upper jaw, red-lit)
    if (eyes)
      for (const x of [-0.2, 0.2]) {
        q.disc(x, C + gap / 2 + 0.1, 0.055, '#1a1408');
        q.disc(x, C + gap / 2 + 0.1, 0.025, rgba(DANGER, 0.6 + 0.4 * k.mf.beat));
      }
    for (const x of [-0.58, 0.58]) q.disc(x, C, 0.06, body);
  };
// a scorpion: legs scuttling, pincers snapping on the snare, its tail curled over and striking on the kick, a red
// sting dripping
export const scorpion = (body, sting) => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    strike = a * mu(k, 'kick'),
    open = 0.5 * (1 - a * mu(k, 'snare')),
    x0 = 0.05 * a * Math.sin(k.t * 2.2),
    q = xf(k, 0, C, 0, x0 + 0.17, 0, 1.22);
  for (let i = 0; i < 4; i++) {
    const hx = -0.24 + i * 0.1,
      kx = hx - 0.05 + 0.02 * a * Math.sin(k.t * 9 + i * 1.6);
    q.line(hx, C - 0.16, kx, C - 0.22, 0.03, body);
    q.line(kx, C - 0.22, kx - 0.06, C - 0.36, 0.025, sting);
  }
  // the tail: five segments curling up and over, further on the strike
  let px = 0.1,
    py = C - 0.1;
  const tail = [[px, py]];
  for (let i = 0; i < 5; i++) {
    const ang = 1.1 + i * 0.48 + strike * 0.3 * ((i + 1) / 5) + 0.05 * a * Math.sin(k.t * 3);
    px += Math.cos(ang) * 0.13;
    py += Math.sin(ang) * 0.13;
    tail.push([px, py]);
  }
  for (let i = 0; i < 5; i++) q.line(tail[i][0], tail[i][1], tail[i + 1][0], tail[i + 1][1], 0.1 - i * 0.012, body);
  for (let i = 1; i <= 5; i++) q.disc(tail[i][0], tail[i][1], 0.05 - i * 0.005, rgba(DANGER, 0.35 + 0.1 * i));
  const [tx, ty] = tail[5],
    sa = 1.1 + 4 * 0.48 + strike * 0.3 + 1.2;
  q.poly([[tx - 0.04, ty + 0.03], [tx + 0.03, ty - 0.03], [tx + Math.cos(sa) * 0.15, ty + Math.sin(sa) * 0.15]], DANGER);
  q.disc(tx + Math.cos(sa) * 0.17, ty + Math.sin(sa) * 0.17 - 0.03 * ((k.t * 2) % 1), 0.018, sting);
  // the body, plated, spined along its back
  const pts = [];
  for (let i = 0; i < 12; i++) pts.push([-0.08 + Math.cos((i * TAU) / 12) * 0.24, C - 0.12 + Math.sin((i * TAU) / 12) * 0.09]);
  q.poly(pts, body);
  for (const x of [-0.2, -0.08, 0.04]) q.poly([[x - 0.04, C - 0.05], [x + 0.04, C - 0.05], [x + 0.01, C + 0.04]], sting);
  // the pincers, open, and snapping on the snare
  q.line(-0.3, C - 0.1, -0.43, C - 0.02, 0.05, body);
  q.poly([[-0.43, C], [-0.43, C - 0.05], [-0.62, C + 0.02 + open * 0.12]], sting);
  q.poly([[-0.43, C - 0.01], [-0.43, C - 0.06], [-0.6, C - 0.08 - open * 0.1]], sting);
  core(q, -0.18, C - 0.1, 0.045);
};
// a tumbleweed of thorny twigs, rolling to and fro in its lane, bouncing on the kick, thorns all round
export const tumbleweed = (stem, thorn) => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    roll = 0.14 * a * Math.sin(k.t * 1.6),
    spin = -roll / 0.17 - k.t * (0.6 + a),
    x0 = roll,
    y0 = C - 0.02 + 0.07 * a * mu(k, 'kick'),
    R = 0.34,
    P = (i, r = R) => [x0 + Math.cos(spin + i) * r, y0 + Math.sin(spin + i) * r];
  core(k, x0, y0, 0.06);
  for (let i = 0; i < 11; i++) k.line(...P(i * 2.4), ...P(i * 2.4 + 2.4 * 4), 0.03, stem);
  for (let i = 0; i < 10; i++) k.line(...P((i * TAU) / 10), ...P(((i + 1) * TAU) / 10), 0.04, stem);
  for (let i = 0; i < 10; i++) {
    const b = (i * TAU) / 10 + 0.3;
    k.poly([P(b - 0.1, R - 0.01), P(b + 0.1, R - 0.01), P(b, R + 0.11)], thorn);
  }
};
// a satellite tumbling: a spiked body, its two pointed panels turning over and over, its antennas blinking red
export const satellite = (body, panel) => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    [dx, dy] = jolt(k, a, 0.04),
    q = xf(k, 0, C, a * 0.25 * Math.sin(k.t * 0.9), dx, dy),
    flip = Math.cos(k.t * (1.2 + 2.5 * a)),
    hg = 0.2 * Math.max(0.12, Math.abs(flip)),
    face = flip > 0 ? panel : '#2a3040';
  for (const s of [-1, 1]) {
    q.line(s * 0.12, C, s * 0.2, C, 0.04, '#c9d2e0');
    q.poly([[s * 0.2, C - hg], [s * 0.5, C - hg], [s * 0.62, C], [s * 0.5, C + hg], [s * 0.2, C + hg]], face);
    for (const x of [0.3, 0.4]) q.line(s * x, C - hg, s * x, C + hg, 0.012, rgba('#ffffff', 0.5));
    q.line(s * 0.2, C, s * 0.5, C, 0.012, rgba('#ffffff', 0.5));
    q.disc(s * 0.6, C, 0.03, DANGER);
  }
  const hex = [];
  for (let i = 0; i < 6; i++) hex.push([Math.cos((i * TAU) / 6 + 0.5) * 0.16, C + Math.sin((i * TAU) / 6 + 0.5) * 0.16]);
  q.line(0, C, 0, C + 0.42, 0.025, '#c9d2e0');
  q.line(0, C, 0.06, C - 0.36, 0.025, '#c9d2e0');
  q.poly([[-0.04, C - 0.3], [0.16, C - 0.28], [0.07, C - 0.44]], '#c9d2e0');
  for (let i = 0; i < 4; i++) {
    const b = (i * TAU) / 4 + Math.PI / 4;
    q.line(Math.cos(b) * 0.14, C + Math.sin(b) * 0.14, Math.cos(b) * 0.26, C + Math.sin(b) * 0.26, 0.03, '#c9d2e0');
  }
  q.poly(hex, body);
  q.disc(0, C + 0.42, 0.035, rgba(DANGER, 0.4 + 0.6 * k.mf.beat));
  core(q, 0, C, 0.06);
};
// a plasma orb: a toothed shell turning round a heart of plasma that swells on the bass, tendrils crackling out to the
// shell, jumping on the hats
export const plasmaorb = (shell, plasma) => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    rot = k.t * (0.8 + 1.5 * a),
    h = mu(k, 'hat'),
    [dx, dy] = jolt(k, a, 0.04),
    q = xf(k, 0, C, 0, dx, dy);
  teeth(q, 0, C, 0.36, 14, 0.08 + 0.03 * a * mu(k, 'kick'), rot, shell);
  q.disc(0, C, 0.31, '#07080c');
  q.disc(0, C, 0.29, rgba(plasma, 0.18 + 0.15 * mu(k, 'bass')));
  k.glow(2);
  for (let j = 0; j < 5; j++) {
    const b = -rot * 1.3 + (j * TAU) / 5 + 0.3 * Math.sin(k.t * 2 + j);
    let prev = [Math.cos(b) * 0.08, C + Math.sin(b) * 0.08];
    for (let i = 1; i <= 4; i++) {
      const r = 0.08 + i * 0.055,
        jit = (0.03 + 0.05 * h * a) * Math.sin(k.t * 41 + i * 3 + j * 1.7),
        p = [Math.cos(b) * r - Math.sin(b) * jit, C + Math.sin(b) * r + Math.cos(b) * jit];
      q.line(prev[0], prev[1], p[0], p[1], 0.025, plasma);
      prev = p;
    }
  }
  k.plain();
  q.disc(0, C, 0.1 * (1 + 0.35 * a * mu(k, 'bass')), plasma);
  core(q, 0, C, 0.06);
};
// a grappling hook swinging on its chain: three barbed prongs, red-hot at their points, a spiked stock across it
export const grapnel = (chain, metal) => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    py = C + 0.52,
    q = xf(k, 0, py, a * 0.22 * Math.sin(k.t * 2.1));
  for (let i = 0; i < 4; i++) q.line(0, py - i * 0.065, 0, py - (i + 1) * 0.065, i % 2 ? 0.025 : 0.06, chain);
  q.disc(0, C + 0.26, 0.04, metal);
  q.line(0, C + 0.26, 0, C - 0.12, 0.08, metal);
  q.line(-0.28, C + 0.16, 0.28, C + 0.16, 0.05, metal);
  for (const s of [-1, 1]) {
    teeth(q, s * 0.3, C + 0.16, 0.035, 5, 0.05, k.t * 2, metal);
    const pts = [[0, C - 0.12], [s * 0.25, C - 0.18], [s * 0.42, C - 0.07], [s * 0.48, C + 0.12]];
    for (let i = 0; i < 3; i++) q.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 0.07, metal);
    q.poly([[s * 0.52, C + 0.1], [s * 0.43, C + 0.1], [s * 0.49, C + 0.27]], metal);
    q.poly([[s * 0.44, C + 0.02], [s * 0.46, C + 0.1], [s * 0.34, C + 0.1]], metal);
    q.disc(s * 0.49, C + 0.25, 0.025, rgba(DANGER, 0.6 + 0.4 * k.mf.beat));
  }
  q.line(0, C - 0.12, 0.02, C - 0.3, 0.06, metal);
  q.poly([[-0.03, C - 0.28], [0.07, C - 0.28], [0.02, C - 0.42]], metal);
  core(q, 0, C - 0.12, 0.05);
};
// two gears grinding into each other, spoked, their red hubs, sparks spat up and down from the nip on the hats
export const gears = (body, tooth) => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    r = 0.24,
    n = 10,
    ang = k.t * (1.2 + 2.8 * a) + a * 0.3 * mu(k, 'kick'),
    [dx, dy] = jolt(k, a, 0.04),
    q = xf(k, 0, C, 0, dx, dy);
  for (const s of [-1, 1]) {
    const x = s * 0.3,
      A = s < 0 ? ang : -ang + Math.PI / n;
    teeth(q, x, C, r, n, 0.08, A, tooth);
    q.disc(x, C, r - 0.03, body);
    for (let i = 0; i < 3; i++) {
      const b = A + (i * TAU) / 3;
      q.line(x, C, x + Math.cos(b) * (r - 0.05), C + Math.sin(b) * (r - 0.05), 0.05, tooth);
    }
    core(q, x, C, 0.05);
  }
  const h = (0.3 + 0.7 * a) * mu(k, 'hat');
  sparks(q, 0, C + 0.05, 3, Math.PI / 2, 1.0, 0.42, h);
  sparks(q, 0, C - 0.05, 3, -Math.PI / 2, 1.0, 0.42, h);
};
// a mirror ball with hooked blades sweeping round it, its tiles flashing on the hats and the beat
export const discoball = (tile, blade) => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    rot = k.t * (1.5 + 3 * a),
    r = 0.24 * (1 + 0.05 * a * mu(k, 'bass'));
  k.line(0, C + r, 0, C + 0.5, 0.025, '#9aa0a8');
  for (let i = 0; i < 4; i++) {
    const b = rot + (i * TAU) / 4,
      P = (rr, da) => [Math.cos(b + da) * rr, C + Math.sin(b + da) * rr * 0.82];
    k.poly([P(0.25, -0.25), P(0.45, -0.05), P(0.61, 0.2), P(0.4, 0.2), P(0.25, 0.25)], blade);
    k.line(...P(0.45, -0.05), ...P(0.61, 0.2), 0.03, DANGER);
  }
  k.disc(0, C, r, '#4a5060');
  const hat = mu(k, 'hat');
  [2, 3, 4, 3, 2].forEach((m, row) => {
    const y = (row - 2) * 0.085,
      w = Math.sqrt(Math.max(0, r * r - y * y)) * 0.92;
    for (let j = 0; j < m; j++) {
      const x = -w + ((j + 0.5) * 2 * w) / m,
        on = 0.5 + 0.5 * Math.sin(k.t * 7 + row * 2.1 + j * 1.7 + rot);
      k.box(x - 0.03, C + y - 0.03, 0.06, 0.06, on * (0.5 + 0.5 * hat) > 0.55 ? '#ffffff' : tile);
    }
  });
  core(k, 0, C, 0.05);
};
// a speaker cab spitting sparks: studded with spikes on every side, its woofer pumping on the kick, the whole box
// jolted by the snare, sparks sprayed out of it on the hats
export const speakerspit = (box, cone) => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    kick = mu(k, 'kick'),
    [dx, dy] = jolt(k, a, 0.06),
    q = xf(k, 0, C, 0, dx, dy, 1 + 0.04 * a * kick);
  for (let i = 0; i < 4; i++) {
    const x = -0.27 + i * 0.18;
    q.poly([[x - 0.05, C + 0.29], [x + 0.05, C + 0.29], [x, C + 0.42]], cone);
    q.poly([[x - 0.05, C - 0.29], [x + 0.05, C - 0.29], [x, C - 0.42]], cone);
  }
  for (const s of [-1, 1])
    for (const y of [-0.13, 0.13]) q.poly([[s * 0.35, C + y - 0.05], [s * 0.35, C + y + 0.05], [s * 0.5, C + y]], cone);
  q.box(-0.36, C - 0.3, 0.72, 0.6, box, rgba(DANGER, 0.6 + 0.4 * kick), 0.03);
  q.disc(0, C - 0.06, 0.2, '#07080c');
  q.disc(0, C - 0.06, 0.15 + 0.04 * a * kick, cone);
  q.disc(0, C - 0.06, 0.07, box);
  core(q, 0, C - 0.06, 0.04);
  q.disc(0, C + 0.2, 0.05, cone);
  const h = mu(k, 'hat') * (0.4 + 0.6 * a);
  if (h > 0.05)
    for (let j = 0; j < 6; j++) {
      const b = (j * TAU) / 6 + k.t * 2,
        r1 = 0.22 + 0.34 * h;
      k.line(Math.cos(b) * 0.22, C - 0.06 + Math.sin(b) * 0.16, Math.cos(b) * r1, C - 0.06 + Math.sin(b) * r1 * 0.75, 0.025, '#fff3a0');
    }
};
// two nozzles at the lane's edges blasting fire at each other, the jets crossing in a blast on the kick, licking on
// the hats, embers rising
export const firejet = (nozzle, flame) => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    kick = mu(k, 'kick'),
    h = mu(k, 'hat');
  for (const s of [-1, 1]) {
    const L = 0.3 + 0.14 * a * kick + 0.03 * Math.sin(k.t * 13 + s);
    [[0.17, flame], [0.11, '#ffd23a'], [0.05, '#fff3e0']].forEach(([w, col], li) => {
      const Ll = L * (1 - li * 0.18),
        fl = (0.02 + 0.03 * h) * Math.sin(k.t * 31 + s * 2 + li);
      k.poly([[s * 0.38, C + w], [s * (0.38 - Ll * 0.5), C + w * 1.2 + fl], [s * (0.38 - Ll), C + fl * 0.5], [s * (0.38 - Ll * 0.5), C - w * 1.2 - fl], [s * 0.38, C - w]], col);
    });
    k.box(s > 0 ? 0.42 : -0.62, C - 0.09, 0.2, 0.18, nozzle, rgba(DANGER, 0.6), 0.025);
    k.box(s > 0 ? 0.38 : -0.42, C - 0.15, 0.04, 0.3, nozzle);
    k.poly([[s * 0.47, C + 0.09], [s * 0.57, C + 0.09], [s * 0.52, C + 0.22]], nozzle);
    k.poly([[s * 0.47, C - 0.09], [s * 0.57, C - 0.09], [s * 0.52, C - 0.22]], nozzle);
  }
  for (let j = 0; j < 4; j++) {
    const u = (k.t * (0.6 + 0.6 * a) + j * 0.25) % 1;
    k.disc(0.3 * Math.sin(j * 2.3 + k.t), C + 0.1 + u * 0.36, 0.022 * (1 - u), '#ffb347');
  }
  core(k, 0, C, 0.05 + 0.03 * kick);
};
// a blob of lava wobbling, swelling on the bass, a cracked crust in plates and spikes over it, drips falling off it,
// two little ones beside it
export const lavablob = (crust, lava) => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    w = k.t * (1.5 + 2 * a),
    sw = 1 + 0.12 * a * mu(k, 'bass'),
    R = th => 0.3 * (1 + 0.1 * Math.sin(3 * th + w) + 0.06 * Math.sin(5 * th - w * 1.3)) * sw,
    P = (th, f = 1) => [Math.cos(th) * R(th) * 1.15 * f, C + Math.sin(th) * R(th) * 0.95 * f],
    pts = [];
  for (let j = 0; j < 2; j++) {
    const u = (k.t * 0.9 + j * 0.5) % 1;
    k.disc(j ? 0.1 : -0.12, C - 0.28 - u * 0.18, 0.045 * (1 - 0.5 * u), lava);
  }
  for (let i = 0; i < 16; i++) pts.push(P((i * TAU) / 16));
  k.poly(pts, lava);
  for (let i = 0; i < 5; i++) {
    const f = (i * TAU) / 5 + w * 0.15;
    k.poly([P(f - 0.35, 0.3), P(f - 0.3, 0.8), P(f + 0.25, 0.85), P(f + 0.35, 0.35)], crust);
  }
  for (let i = 0; i < 8; i++) {
    const th = (i * TAU) / 8 + 0.2;
    k.poly([P(th - 0.15, 0.95), P(th + 0.15, 0.95), P(th, 1.35)], crust);
  }
  for (const s of [-1, 1]) {
    teeth(k, s * 0.53, C + s * 0.06, 0.06, 6, 0.05, w * s, crust);
    k.disc(s * 0.53, C + s * 0.06, 0.04, lava);
  }
  core(k, 0, C, 0.08);
};
// a jellyfish: its bell pulsing (squeezing on the kick), a spiked skirt, stinging tentacles swaying under it with red
// stings at their ends
export const jellyfish = (bell, sting) => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    kick = mu(k, 'kick'),
    y0 = C + 0.1 + 0.05 * a * Math.sin(k.t * 2.6),
    W = 0.42 * (1 - 0.15 * a * kick),
    H = 0.26 * (1 + 0.15 * a * kick),
    pts = [];
  for (let i = 0; i < 6; i++) {
    const x = -W * 0.8 + (i * 1.6 * W) / 5;
    let px = x,
      py = y0 - 0.03;
    for (let sg = 1; sg <= 3; sg++) {
      const nx = x + 0.06 * (0.5 + a) * sg * Math.sin(k.t * 3 + i + sg * 1.2),
        ny = y0 - 0.03 - sg * 0.15;
      k.line(px, py, nx, ny, 0.03, sting);
      px = nx;
      py = ny;
    }
    k.disc(px, py, 0.028, DANGER);
  }
  for (let i = 0; i <= 8; i++) pts.push([-W * Math.cos((Math.PI * i) / 8), y0 + H * Math.sin((Math.PI * i) / 8)]);
  for (let i = 0; i <= 8; i++) pts.push([W - (i * 2 * W) / 8, y0 - (i % 2 ? 0.07 : 0)]);
  k.poly(pts, bell);
  k.disc(0, y0 + H * 0.4, W * 0.5, rgba('#ffffff', 0.25));
  for (const x of [-0.18, 0.18]) k.disc(x * W * 2.2, y0 + 0.08, 0.03, sting);
  core(k, 0, y0 + 0.1, 0.06);
};
// an anglerfish: its jaws dropping open and snapping shut on the kick, needle teeth, a lure glowing on its stalk, a
// spiked tail flicking, spines down its back
export const angler = (body, lure) => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    open = 0.03 + 0.22 * (1 - a * mu(k, 'kick')),
    sway = Math.sin(k.t * 2.2),
    hinge = [0.05, C],
    up = [-0.55, C + 0.04 + open * 0.4],
    lo = [-0.58, C - 0.04 - open * 0.8];
  k.poly([[0.36, C], [0.62, C + 0.2 + 0.05 * sway * a], [0.53, C], [0.62, C - 0.2 + 0.05 * sway * a]], body);
  k.disc(0.12, C, 0.27, body);
  for (let i = 0; i < 4; i++) k.line(0.02 + i * 0.09, C + 0.24 - i * 0.02, 0.06 + i * 0.1, C + 0.42 - i * 0.04, 0.025, '#c9d2e0');
  k.poly([hinge, up, lo], '#07080c');
  core(k, -0.22, C - 0.02, 0.05);
  for (const [lip, dir] of [[up, -1], [lo, 1]])
    for (let i = 0; i < 5; i++) {
      const u = (i + 0.5) / 5,
        x = hinge[0] + (lip[0] - hinge[0]) * u,
        y = hinge[1] + (lip[1] - hinge[1]) * u;
      k.poly([[x - 0.03, y], [x + 0.03, y], [x, y + dir * (0.09 + 0.04 * (i % 2))]], '#f0f0e8');
    }
  k.poly([hinge, up, [-0.45, C + 0.22], [0.05, C + 0.25]], body);
  k.poly([hinge, lo, [-0.4, lo[1] - 0.14], [0.05, C - 0.24]], body);
  k.disc(0.0, C + 0.12, 0.045, DANGER);
  k.disc(0.0, C + 0.12, 0.018, '#fff3e0');
  const lx = -0.33 + 0.08 * sway * (0.5 + a);
  k.line(-0.05, C + 0.24, -0.2, C + 0.44, 0.025, body);
  k.line(-0.2, C + 0.44, lx, C + 0.32, 0.02, body);
  k.disc(lx, C + 0.3, 0.05 * (1 + 0.4 * k.mf.beat), lure);
  k.disc(lx, C + 0.3, 0.02, '#ffffff');
};
// a frozen chunk bristling with icicles down and up, uneven, quivering on the snare, the red heat frozen in its heart
export const icefangs = (ice, tip) => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    [dx, dy] = jolt(k, a, 0.07),
    q = xf(k, 0, C, a * 0.06 * Math.sin(k.t * 1.4), dx, dy),
    b = 0.03 * a * mu(k, 'bass');
  [-0.42, -0.24, -0.06, 0.12, 0.3, 0.46].forEach((x, i) => {
    const L = [0.26, 0.38, 0.22, 0.4, 0.3, 0.24][i] + b * Math.sin(k.t * 7 + i),
      tx = x + 0.02 * Math.sin(i * 3);
    q.poly([[x - 0.07, C - 0.05], [x + 0.07, C - 0.05], [tx, C - 0.05 - L]], ice);
    q.line(x - 0.02, C - 0.06, tx, C - 0.05 - L, 0.015, tip);
  });
  [-0.34, -0.12, 0.08, 0.24, 0.42].forEach((x, i) => {
    const L = [0.2, 0.28, 0.18, 0.3, 0.16][i] + b * Math.sin(k.t * 6 + i),
      tx = x - 0.02 * Math.sin(i * 2);
    q.poly([[x - 0.06, C + 0.1], [x + 0.06, C + 0.1], [tx, C + 0.1 + L]], ice);
    q.line(x + 0.02, C + 0.1, tx, C + 0.1 + L, 0.015, tip);
  });
  q.poly([[-0.52, C + 0.02], [-0.3, C + 0.14], [0, C + 0.1], [0.32, C + 0.16], [0.54, C + 0.03], [0.34, C - 0.1], [-0.05, C - 0.07], [-0.36, C - 0.12]], ice);
  core(q, 0, C + 0.02, 0.07);
};
// a frost crystal: six barbed arms turning, swelling on the bass, two small stars beside it
export const frostflake = (ice, edge) => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    rot = k.t * (0.5 + 1.5 * a),
    q = xf(k, 0, C, rot, 0, 0, 1 + 0.08 * a * mu(k, 'bass')),
    hex = [];
  for (let i = 0; i < 6; i++) {
    const b = (i * TAU) / 6,
      ux = Math.cos(b),
      uy = Math.sin(b),
      P = (r, p) => [ux * r - uy * p, C + uy * r + ux * p];
    q.line(...P(0, 0), ...P(0.38, 0), 0.05, ice);
    q.line(...P(0.2, 0), ...P(0.3, 0.1), 0.035, ice);
    q.line(...P(0.2, 0), ...P(0.3, -0.1), 0.035, ice);
    q.poly([P(0.36, 0.04), P(0.36, -0.04), P(0.45, 0)], edge);
    hex.push(P(0.11, 0));
  }
  q.poly(hex, ice);
  for (const s of [-1, 1]) teeth(k, s * 0.56, C - s * 0.08, 0.025, 6, 0.06, -rot * 1.5, edge);
  core(q, 0, C, 0.06);
};
// a blizzard's eye: shards of ice whirling in a spiral round a spiked heart, faster by the shaft, swelling on the bass
export const vortex = (ice, shard) => (k, o) => {
  k = own(k, o);
  const a = amp(o),
    w = k.t * (1.5 + 3 * a),
    sw = 1 + 0.06 * a * mu(k, 'bass');
  for (let i = 0; i < 12; i++) {
    const r = (0.12 + (i >> 1) * 0.075) * sw,
      ang = -w * (1.4 - r) + (i % 2) * Math.PI + (i >> 1) * 0.55,
      x = Math.cos(ang) * r,
      y = C + Math.sin(ang) * r * 0.78,
      tl = Math.hypot(Math.sin(ang), Math.cos(ang) * 0.78) || 1,
      tx = Math.sin(ang) / tl,
      ty = (-Math.cos(ang) * 0.78) / tl;
    k.poly([[x - tx * 0.07 - ty * 0.045, y - ty * 0.07 + tx * 0.045], [x - tx * 0.07 + ty * 0.045, y - ty * 0.07 - tx * 0.045], [x + tx * 0.15, y + ty * 0.15]], i % 2 ? shard : ice);
  }
  for (let j = 0; j < 5; j++) {
    const b = -w * 0.7 + j * 1.3,
      r = 0.2 + 0.07 * j;
    k.disc(Math.cos(b) * r, C + Math.sin(b) * r * 0.75, 0.02, '#ffffff');
  }
  teeth(k, 0, C, 0.08, 6, 0.06, w, ice);
  core(k, 0, C, 0.05);
};

// every place's set, in its own materials: the first three of each are the old recoloured ones, the rest its own
export const HAZARDS = {
  citysaw: saw('#3b4048'),
  razor: spikes('#59606e', '#c9ccd2'),
  cityzap: zapper('#2a3a52'),
  cityneon: neonsign('#1a1d24', '#ff4fd8'),
  cityglass: glassburst('#3b4048', '#bfe8ff'),
  cityfan: fan('#3b4048', '#c9ccd2'),
  synthzap: zapper('#3a1660', '#ff6ad5'),
  prism: shards('#7a3aff', '#ffd6ff'),
  synthsaw: saw('#1a0a30', '#29e7ff'),
  glitchcube: glitchcube('#2a0d50', '#29e7ff'),
  synthlaser: laserpair('#1a0a30', '#ff6ad5'),
  synthorb: plasmaorb('#3a1660', '#29e7ff'),
  thornball: mine('#3a2a14', '#6a8a2a'),
  thornlog: spikes('#5a3a22', '#9ac04a'),
  stingers: shards('#2a4a1a', '#c8ff6a'),
  hornets: hornetnest('#8a6a3a', '#e8c040'),
  vineknot: vineknot('#3a5a1a', '#c8ff6a'),
  beartrap: jaws('#4a4038', '#d9dde3'),
  cactusball: mine('#3a6a2a', '#e8e0b0'),
  bonespikes: spikes('#8a6a40', '#f0e6cc'),
  desertsaw: saw('#6a4a2a', '#e8d0a0'),
  scorpion: scorpion('#6a3a1a', '#e8b060'),
  tumbleweed: tumbleweed('#8a6a3a', '#e8d0a0'),
  skulltrap: jaws('#d8c8a0', '#f6eedc', { eyes: true }),
  spacemine: mine('#3a4458', '#c9d2e0'),
  stationzap: zapper('#5a6478'),
  stationsaw: saw('#2a3040', '#9ad4ff'),
  satellite: satellite('#5a6478', '#2a5ab0'),
  plasmaorb: plasmaorb('#3a4458', '#8ff7ff'),
  stationlaser: laserpair('#5a6478', '#9ad4ff'),
  ravezap: zapper('#1a1a24', '#ffe14a'),
  discosaw: saw('#14141c', '#e0e8ff'),
  ravespikes: spikes('#2a2a38', '#ff6ad5'),
  discoball: discoball('#c9d2ff', '#ff6ad5'),
  speakerspit: speakerspit('#14141c', '#ffe14a'),
  ravelaser: laserpair('#2a2a38', '#4aff8a'),
  lavabomb: mine('#2a1410', '#ff7a2a'),
  obsidianshard: shards('#1a0c14', '#ff7a2a'),
  magmaspikes: spikes('#2a1814', '#ffb347'),
  firejet: firejet('#2a1814', '#ff7a2a'),
  lavablob: lavablob('#1a0c0c', '#ff7a2a'),
  magmaorb: plasmaorb('#2a1410', '#ffb347'),
  seamine: mine('#2a3a40', '#8aa0a8'),
  urchin: mine('#2a0a3a', '#b06aff'),
  coralspikes: spikes('#2a5a52', '#ff9ab0'),
  jellystinger: jellyfish('#b06aff', '#ff9ad8'),
  angler: angler('#1a2a3a', '#8ff7ff'),
  clamjaws: jaws('#5a7a8a', '#f0f0e8', { ribs: 4 }),
  iceshard: shards('#9ad4f0', '#ffffff'),
  icespikes: spikes('#5a7a96', '#e8fbff'),
  arcticsaw: saw('#3a4a5a', '#e8fbff'),
  icefangs: icefangs('#9ad4f0', '#ffffff'),
  frostflake: frostflake('#cfeeff', '#ffffff'),
  blizzard: vortex('#9ad4f0', '#ffffff'),
  factorysaw: saw('#4a3a30', '#e0e0e0'),
  factoryzap: zapper('#3a3028', '#ffe14a'),
  factoryspikes: spikes('#6a5048', '#c9ccd2'),
  grapnel: grapnel('#4a3a30', '#9aa0a8'),
  grinder: gears('#5a4a3a', '#c9a050'),
  crusher: jaws('#6a5048', '#e0e0e0', { block: true }),
};
