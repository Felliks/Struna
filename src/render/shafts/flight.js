// A flight's look in each place (index.js SHAFT's ring and fly): its rings and the things flying by.
//   RINGS[name](f, o, X, Y, r, passed, hit): the ring to fly through at (X, Y) on screen, r its radius in px; passed
//     0..1 its burst as he goes through, hit he missed it (draw it red)
//   FLYBYS[name](f, w): the place's things flying past in flight w ({ t0, t1 }), behind the rings, in world metres
//     round the view (f.v.x .. f.v.x + f.v.vw, f.v.y .. f.v.y + f.v.vh)
// Every ring stays gold and upright, glowing and pulsing on the beat, flashing on each beat counting down to its
// moment; the place changes what it is made of. The things flying by stay dim and out of the rings' band, never red.
import { clamp, glowDot, hash, mixHex, rgba, smooth } from '../util.js';
import { restY } from '../stage.js';
import { ALT } from '../../run.js';

const GOLD = '#ffd84a',
  RED = '#ff2a3d',
  TAU = Math.PI * 2;

// a ring's colours and sounds: gold (red if missed), how near its moment (0 two beats before, 1 on it), a flash on each
// beat counting down to it, how much is left of it as it bursts
function cue(f, o, passed, hit) {
  const beat = f.L?.A?.beat ?? 0.5,
    dt = o.t - f.t,
    near = clamp(1 - dt / (2 * beat), 0, 1),
    tick = dt > -0.05 && dt < 4 * beat ? Math.max(0, Math.cos((TAU * dt) / beat)) ** 6 * (0.35 + 0.65 * near) : 0;
  return { col: hit ? RED : GOLD, hot: hit ? '#ffb0b8' : '#fff3b0', near, tick, a: 1 - passed, mf: f.mf, m: f.v.ppm, g: f.g, t: f.t, s: Math.floor(o.t * 97) % 100000 };
}
// the glow behind every ring and its thin gold line (so its shape reads whatever it is made of)
function base(f, C, X, Y, r, lw = 0.05) {
  const { g, mf, a, col, m, tick, near } = C;
  glowDot(g, X, Y, r * (1.5 + 0.3 * tick), col, (0.32 + 0.25 * mf.beat + 0.35 * tick + 0.1 * near) * a * f.glow);
  g.strokeStyle = rgba(col, (0.6 + 0.2 * mf.beat + 0.2 * tick) * a);
  g.lineWidth = (lw + 0.03 * tick) * m;
  g.beginPath();
  g.ellipse(X, Y, r * 0.38, r, 0, 0, TAU);
  g.stroke();
}
// a point on the ring's ellipse at angle b (scaled by k: 1 the ring, more outside it)
const at = (X, Y, r, b, k = 1) => [X + Math.cos(b) * r * 0.38 * k, Y + Math.sin(b) * r * k];
// a point on the ring's ellipse at angle b pushed d px out along its normal (teeth and rays as long at its sides as at
// its top)
function out(X, Y, r, b, d) {
  const c = Math.cos(b),
    s = Math.sin(b),
    nx = c / 0.38,
    ny = s,
    l = Math.hypot(nx, ny) || 1;
  return [X + c * r * 0.38 + (nx / l) * d, Y + s * r + (ny / l) * d];
}

export const RINGS = {
  // a neon hoop sign: a glass tube in segments between electrodes, a white-hot core, a hanging wire, light chasing
  // round it on the beat, a flicker on the hats
  neon(f, o, X, Y, r, passed, hit) {
    const C = cue(f, o, passed, hit),
      { g, m, mf, a, col, hot, tick, t, s } = C,
      flick = hash(Math.floor(t * 24), s) < 0.12 * mf.hat ? 0.55 : 1;
    if (a <= 0) return;
    g.save();
    glowDot(g, X, Y, r * (1.6 + 0.3 * tick), col, (0.4 + 0.3 * mf.beat + 0.3 * tick) * a * f.glow * flick);
    g.strokeStyle = rgba('#20180a', 0.5 * a);
    g.lineWidth = 0.025 * m;
    g.beginPath();
    g.moveTo(X, Y - r);
    g.lineTo(X, Y - r - 1.2 * m);
    g.stroke();
    g.lineCap = 'round';
    for (const [c, lw, al] of [[col, 0.13, 0.75], [hot, 0.045, 1]]) {
      g.strokeStyle = rgba(c, (al * (0.75 + 0.25 * mf.beat) + 0.2 * tick) * a * flick);
      g.lineWidth = (lw + 0.04 * mf.kick) * m;
      g.beginPath();
      for (let i = 0; i < 6; i++) g.ellipse(X, Y, r * 0.38, r, 0, (i / 6) * TAU + 0.08, ((i + 1) / 6) * TAU - 0.08);
      g.stroke();
    }
    g.fillStyle = rgba('#3a3020', a);
    for (let i = 0; i < 6; i++) {
      const [ex, ey] = at(X, Y, r, (i / 6) * TAU);
      g.fillRect(ex - 0.035 * m, ey - 0.035 * m, 0.07 * m, 0.07 * m);
    }
    const beat = f.L?.A?.beat ?? 0.5,
      ch = ((t / beat) % 1) * TAU - Math.PI / 2,
      [cx, cy] = at(X, Y, r, ch);
    glowDot(g, cx, cy, 0.35 * m, '#ffffff', 0.7 * a * f.glow);
    g.fillStyle = rgba('#ffffff', a);
    g.beginPath();
    g.arc(cx, cy, 0.05 * m, 0, TAU);
    g.fill();
    g.restore();
  },
  // a ring of fireflies orbiting where the hoop is, blinking on the hats, scattering as he goes through
  fireflies(f, o, X, Y, r, passed, hit) {
    const C = cue(f, o, passed, hit),
      { g, m, mf, a, col, hot, t, s, tick } = C;
    if (a <= 0) return;
    g.save();
    base(f, { ...C, a: a * 0.6 }, X, Y, r, 0.03);
    const n = 16;
    g.fillStyle = rgba(hot, a);
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const b = (i / n) * TAU + t * 1.4 + 0.15 * Math.sin(t * 3 + i),
        k = 1 + 0.08 * Math.sin(t * 5 + i * 2) + 0.6 * passed * (0.5 + hash(s, i)),
        [x, y] = at(X, Y, r, b, k),
        blink = 0.5 + 0.5 * Math.sin(t * 9 + i * 1.7) + mf.hat * hash(Math.floor(t * 24), i);
      glowDot(g, x, y, (0.16 + 0.08 * blink + 0.08 * tick) * m, col, (0.4 + 0.4 * blink) * a * f.glow);
      g.moveTo(x + 0.045 * m, y);
      g.arc(x, y, (0.035 + 0.02 * blink) * m, 0, TAU);
    }
    g.fill();
    g.restore();
  },
  // a sun disk's hoop: a thick gold rim, rays all round it turning slowly, longer on the beat
  sun(f, o, X, Y, r, passed, hit) {
    const C = cue(f, o, passed, hit),
      { g, m, mf, a, col, hot, t, tick } = C;
    if (a <= 0) return;
    g.save();
    base(f, C, X, Y, r, 0.16);
    g.strokeStyle = rgba('#ff9a3c', 0.8 * a);
    g.lineWidth = 0.03 * m;
    g.beginPath();
    g.ellipse(X, Y, r * 0.38 * 0.82, r * 0.88, 0, 0, TAU);
    g.stroke();
    // (soft rays, round-ended: light, not spikes)
    g.strokeStyle = rgba(col, (0.45 + 0.3 * tick) * a);
    g.lineCap = 'round';
    g.beginPath();
    const n = 20,
      len = 0.14 + 0.1 * mf.beat + 0.1 * tick + 0.3 * passed;
    for (let i = 0; i < n; i++) {
      const b = (i / n) * TAU + t * 0.4,
        [x0, y0] = out(X, Y, r, b, 0.1 * m),
        [x1, y1] = out(X, Y, r, b, (0.1 + len * (i % 2 ? 0.55 : 1)) * m);
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
    }
    g.lineWidth = 0.05 * m;
    g.stroke();
    g.strokeStyle = rgba(hot, 0.8 * a);
    g.lineWidth = 0.035 * m;
    g.beginPath();
    g.ellipse(X, Y, r * 0.38, r, 0, 0, TAU);
    g.stroke();
    g.restore();
  },
  // a holographic hoop: gold light in scanlines, a cyan ghost of it slipping off on the hats, a scan running down it,
  // the projector's beam from below
  holo(f, o, X, Y, r, passed, hit) {
    const C = cue(f, o, passed, hit),
      { g, m, mf, a, col, hot, t, s, tick } = C,
      slip = (hash(Math.floor(t * 24), s) - 0.5) * 0.12 * m * (0.3 + mf.hat);
    if (a <= 0) return;
    g.save();
    glowDot(g, X, Y, r * 1.5, col, (0.3 + 0.25 * mf.beat + 0.35 * tick) * a * f.glow);
    g.fillStyle = rgba(col, 0.14 * a);
    g.beginPath();
    g.moveTo(X - 0.04 * m, Y + r * 1.7);
    g.lineTo(X + 0.04 * m, Y + r * 1.7);
    g.lineTo(X + r * 0.2, Y + r * 0.96);
    g.lineTo(X - r * 0.2, Y + r * 0.96);
    g.fill();
    g.fillStyle = rgba('#3a3a40', a);
    g.fillRect(X - 0.08 * m, Y + r * 1.7, 0.16 * m, 0.06 * m);
    g.strokeStyle = rgba(hit ? col : '#5affe8', 0.4 * a);
    g.lineWidth = 0.03 * m;
    g.beginPath();
    g.ellipse(X + slip, Y, r * 0.38, r, 0, 0, TAU);
    g.stroke();
    g.strokeStyle = rgba(col, (0.75 + 0.25 * mf.beat + 0.2 * tick) * a);
    g.lineWidth = (0.1 + 0.04 * mf.kick) * m;
    g.setLineDash([0.06 * m, 0.02 * m]);
    g.lineDashOffset = -t * 0.3 * m;
    g.beginPath();
    g.ellipse(X, Y, r * 0.38, r, 0, 0, TAU);
    g.stroke();
    g.setLineDash([]);
    const sy = Y - r + ((t * 1.5) % 1) * 2 * r,
      sw = r * 0.38 * Math.sqrt(Math.max(0, 1 - ((sy - Y) / r) ** 2));
    g.strokeStyle = rgba(hot, 0.85 * a);
    g.lineWidth = 0.03 * m;
    g.beginPath();
    g.moveTo(X - sw - 0.1 * m, sy);
    g.lineTo(X - sw + 0.1 * m, sy);
    g.moveTo(X + sw - 0.1 * m, sy);
    g.lineTo(X + sw + 0.1 * m, sy);
    g.stroke();
    g.restore();
  },
  // a gear's rim: teeth all round it, turning (a notch on each kick)
  gear(f, o, X, Y, r, passed, hit) {
    const C = cue(f, o, passed, hit),
      { g, m, mf, a, col, hot, t, tick } = C;
    if (a <= 0) return;
    g.save();
    base(f, C, X, Y, r, 0.14);
    const n = 16,
      turn = t * 0.5 + 0.1 * mf.kick;
    g.fillStyle = rgba(hit ? col : '#f0c040', (0.85 + 0.15 * tick) * a);
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const b = (i / n) * TAU + turn,
        [x0, y0] = out(X, Y, r, b - 0.12, 0.02 * m),
        [x1, y1] = out(X, Y, r, b + 0.12, 0.02 * m),
        [x2, y2] = out(X, Y, r, b + 0.08, 0.17 * m),
        [x3, y3] = out(X, Y, r, b - 0.08, 0.17 * m);
      g.moveTo(x0, y0);
      g.lineTo(x3, y3);
      g.lineTo(x2, y2);
      g.lineTo(x1, y1);
    }
    g.fill();
    g.strokeStyle = rgba(hot, 0.7 * a);
    g.lineWidth = 0.025 * m;
    g.beginPath();
    g.ellipse(X, Y, r * 0.38 * 0.86, r * 0.9, 0, 0, TAU);
    g.stroke();
    g.fillStyle = rgba(hit ? '#5a1018' : '#8a6a20', a);
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const [x, y] = at(X, Y, r, (i / 8) * TAU + turn);
      g.moveTo(x + 0.03 * m, y);
      g.arc(x, y, 0.03 * m, 0, TAU);
    }
    g.fill();
    g.restore();
  },
  // a laser hoop: a white-hot beam round it in dashes racing round, emitters top and bottom shooting beams off it
  laser(f, o, X, Y, r, passed, hit) {
    const C = cue(f, o, passed, hit),
      { g, m, mf, a, col, hot, t, tick } = C;
    if (a <= 0) return;
    g.save();
    base(f, C, X, Y, r, 0.08);
    g.strokeStyle = rgba(hot, (0.85 + 0.15 * tick) * a);
    g.lineWidth = 0.035 * m;
    g.setLineDash([0.4 * m, 0.15 * m]);
    g.lineDashOffset = -t * 4 * m;
    g.beginPath();
    g.ellipse(X, Y, r * 0.38, r, 0, 0, TAU);
    g.stroke();
    g.setLineDash([]);
    g.strokeStyle = rgba(col, (0.15 + 0.35 * mf.beat + 0.3 * tick) * a);
    g.lineWidth = 0.02 * m;
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      const b = (i / 4) * TAU + Math.PI / 4 + 0.3 * Math.sin(t * 2),
        [x0, y0] = at(X, Y, r, b, 1),
        [x1, y1] = at(X, Y, r, b, 2.2);
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
    }
    g.stroke();
    g.fillStyle = rgba('#2a2018', a);
    for (const sy of [-1, 1]) g.fillRect(X - 0.09 * m, Y + sy * r - 0.06 * m, 0.18 * m, 0.12 * m);
    g.fillStyle = rgba(hot, a);
    for (const sy of [-1, 1]) g.fillRect(X - 0.04 * m, Y + sy * r - 0.02 * m, 0.08 * m, 0.04 * m);
    g.restore();
  },
  // a hoop of fire: flames licking up off it, flickering, sparks rising
  ember(f, o, X, Y, r, passed, hit) {
    const C = cue(f, o, passed, hit),
      { g, m, mf, a, col, hot, t, s, tick } = C,
      fr = Math.floor(t * 24);
    if (a <= 0) return;
    g.save();
    base(f, C, X, Y, r, 0.1);
    for (const [c, sc] of [['#ff8a2a', 1], [col, 0.6]]) {
      g.fillStyle = rgba(c, (0.75 + 0.25 * tick) * a);
      g.beginPath();
      for (let i = 0; i < 14; i++) {
        const b = (i / 14) * TAU,
          [x, y] = at(X, Y, r, b),
          hgt = (0.16 + 0.14 * hash(fr, i + s) + 0.1 * mf.beat + 0.1 * tick) * m * sc,
          bw = 0.06 * m * sc;
        g.moveTo(x - bw, y);
        g.quadraticCurveTo(x - bw * 0.3, y - hgt * 0.5, x + bw * 0.3 * Math.sin(t * 8 + i), y - hgt);
        g.quadraticCurveTo(x + bw * 0.3, y - hgt * 0.5, x + bw, y);
      }
      g.fill();
    }
    g.fillStyle = rgba(hot, a);
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const u = (t * 0.8 + hash(s, i)) % 1,
        x = X + (hash(s, i + 9) - 0.5) * r * 0.9,
        y = Y + r * 0.6 - u * r * 2.4;
      g.moveTo(x + 0.025 * m, y);
      g.arc(x, y, 0.025 * m * (1 - u), 0, TAU);
    }
    g.fill();
    g.restore();
  },
  // a ring of bubbles, wobbling with the bass, a highlight on each; they pop outward as he goes through
  bubble(f, o, X, Y, r, passed, hit) {
    const C = cue(f, o, passed, hit),
      { g, m, mf, a, col, hot, t, tick } = C;
    if (a <= 0) return;
    g.save();
    base(f, { ...C, a: a * 0.7 }, X, Y, r, 0.04);
    const n = 15,
      bass = mf.bass ?? 0;
    g.strokeStyle = rgba(col, (0.8 + 0.2 * tick) * a);
    g.lineWidth = 0.03 * m;
    g.fillStyle = rgba(col, 0.15 * a);
    g.beginPath();
    const hl = [];
    for (let i = 0; i < n; i++) {
      const b = (i / n) * TAU + t * 0.3,
        k = 1 + 0.05 * Math.sin(t * 4 + i * 1.3) * (1 + 2 * bass) + 0.5 * passed,
        [x, y] = at(X, Y, r, b, k),
        br = (0.09 + 0.04 * Math.sin(i * 2.3) + 0.03 * mf.beat + 0.03 * tick) * m * (1 - 0.6 * passed);
      g.moveTo(x + br, y);
      g.arc(x, y, br, 0, TAU);
      hl.push([x - br * 0.35, y - br * 0.35, br * 0.25]);
    }
    g.fill();
    g.stroke();
    g.fillStyle = rgba(hot, 0.9 * a);
    g.beginPath();
    for (const [x, y, rr] of hl) {
      g.moveTo(x + rr, y);
      g.arc(x, y, rr, 0, TAU);
    }
    g.fill();
    g.restore();
  },
  // an aurora's ribbon bent into a hoop: strands of gold rippling, a green and violet fringe, a curtain hanging off it
  aurora(f, o, X, Y, r, passed, hit) {
    const C = cue(f, o, passed, hit),
      { g, m, mf, a, col, hot, t, tick } = C;
    if (a <= 0) return;
    g.save();
    glowDot(g, X, Y, r * 1.6, col, (0.3 + 0.25 * mf.beat + 0.35 * tick) * a * f.glow);
    const strand = (c, k, w, al, ph, amp) => {
      g.strokeStyle = rgba(c, al * a);
      g.lineWidth = w * m;
      g.beginPath();
      for (let i = 0; i <= 40; i++) {
        const b = (i / 40) * TAU,
          kk = k + amp * Math.sin(b * 7 + t * 3 + ph),
          [x, y] = at(X, Y, r, b, kk);
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    };
    strand(hit ? col : '#5affb0', 1.12, 0.05, 0.35, 1, 0.04);
    strand(hit ? col : '#b06aff', 0.9, 0.04, 0.3, 2, 0.04);
    strand(col, 1, 0.12 + 0.04 * mf.kick, 0.75 + 0.2 * mf.beat + 0.2 * tick, 0, 0.012);
    strand(hot, 1, 0.035, 0.9, 0, 0.012);
    g.strokeStyle = rgba(hit ? col : '#5affb0', 0.18 * a);
    g.lineWidth = 0.02 * m;
    g.beginPath();
    for (let i = 0; i < 9; i++) {
      const b = Math.PI * (0.15 + (0.7 * i) / 8),
        [x, y] = at(X, Y, r, b, 1.05);
      g.moveTo(x, y);
      g.lineTo(x + 0.05 * m * Math.sin(t * 2 + i), y + (0.4 + 0.3 * Math.sin(t + i)) * m);
    }
    g.stroke();
    g.restore();
  },
};

// The things flying by: a few layers deep (the further, the slower past, smaller and darker), one thing per cell of
// each layer's own distance, there or not by a hash and the song's stage; kept out of the band the rings are in.
// Each kind draws its things into one path per layer (one fill or stroke each), so a frame costs a few dozen calls.
const LAYERS = [
  { p: 0.35, sz: 0.85, dim: 0.65, cell: 2.6 },
  { p: 0.6, sz: 1.25, dim: 0.85, cell: 3.2 },
  { p: 0.9, sz: 1.7, dim: 1, cell: 4 },
];
function flock(f, w, K) {
  const { g, v, mf, t } = f,
    m = v.ppm,
    fade = smooth(w.t0, w.t0 + 1, t) * (1 - smooth(w.t1 - 0.6, w.t1 + 0.4, t));
  if (fade <= 0.01) return;
  // (the rings' band, from the roof below to above the highest ring; things inside it only faint)
  const ry = restY(f.L, t),
    hi = ry + ALT[2] + 1.3,
    vy0 = v.y,
    vy1 = v.y + v.vh - 0.3,
    dens = 0.45 + 0.45 * (mf.stage ?? 0),
    a0 = g.globalAlpha;
  g.save();
  LAYERS.forEach((Ly, li) => {
    const span = t - w.t0,
      // (their own way and speed, as a layer: the stream past him plus their flight)
      drift = K.speed * span,
      ox = v.x * Ly.p - drift,
      c0 = Math.floor(ox / Ly.cell) - 1,
      c1 = Math.ceil((ox + v.vw) / Ly.cell) + 1,
      list = [];
    for (let c = c0; c <= c1; c++) {
      const hs = hash(c, li * 31 + K.key);
      if (hs > dens) continue;
      const ux = c * Ly.cell + hash(c, li * 31 + K.key + 1) * Ly.cell,
        X = v.sx(v.x) + (ux - ox) * m,
        // (in the sky left above the band: below it is the roof)
        up0 = Math.max(hi, vy0),
        upH = Math.max(0, vy1 - up0),
        side = hash(c, li * 31 + K.key + 2) * upH,
        surge = (mf.kick ?? 0) * 0.25 * Math.sin(c * 1.7),
        bob = 0.15 * Math.sin(t * K.bob + c),
        ym = up0 + side + surge + bob;
      if (upH < 0.4) continue;
      if (X < -2 * m || X > v.W + 2 * m) continue;
      list.push({ X, Y: v.sy(ym), c, s: Ly.sz, ph: hash(c, li + 3) * TAU });
    }
    if (!list.length) return;
    const dim = Ly.dim * fade;
    g.globalAlpha = a0 * dim;
    K.draw(f, list, Ly, li, m);
  });
  g.restore();
  g.globalAlpha = a0;
}
// the far colour of the place, a little lit
const tone = (f, c, u) => mixHex(f.T?.far?.startsWith?.('#') ? f.T.far : '#202838', c, u);
// a silhouette against the sky: dark, its edge catching a little light, more with the voice (the caller fills and
// strokes the same path)
function sil(f, g, m, c) {
  g.fillStyle = tone(f, c, 0.5);
  g.strokeStyle = rgba('#e8f0ff', 0.12 + 0.3 * (f.mf.voice ?? 0));
  g.lineWidth = Math.max(0.015 * m, f.v.dpr);
}
// how a wing is up: flapping, a stroke harder on each hat
const flap = (f, i, rate) => Math.sin(f.t * rate + i * 1.3) + 0.6 * (f.mf.hat ?? 0);

// a bird's silhouette, wings at w (-1 down .. 1 up), span sp px, into the current path
function bird(g, X, Y, sp, w, hook = 0) {
  g.moveTo(X - sp, Y - w * sp * 0.5);
  g.quadraticCurveTo(X - sp * 0.45, Y - sp * 0.2 - w * sp * 0.3, X - sp * 0.08, Y);
  g.lineTo(X + sp * 0.12, Y + sp * hook * 0.15);
  g.lineTo(X + sp * 0.08, Y);
  g.quadraticCurveTo(X + sp * 0.45, Y - sp * 0.2 - w * sp * 0.3, X + sp, Y - w * sp * 0.5);
}

export const FLYBYS = {
  // little quadcopters: a body, four rotors blurring, a white or green light blinking
  drones(f, w) {
    flock(f, w, {
      key: 11,
      speed: -1.2,
      bob: 2,
      draw(f, list, Ly, li, m) {
        const { g, t } = f;
        g.fillStyle = tone(f, '#8090a8', 0.35);
        g.beginPath();
        for (const q of list) {
          const s = 0.22 * m * q.s;
          g.rect(q.X - s, q.Y - s * 0.25, 2 * s, s * 0.5);
          for (const dx of [-1.3, 1.3]) {
            g.moveTo(q.X + dx * s + s * 0.7, q.Y - s * 0.45);
            g.ellipse(q.X + dx * s, q.Y - s * 0.45, s * 0.7, s * 0.12, 0, 0, TAU);
          }
        }
        g.fill();
        g.fillStyle = li % 2 ? '#bfffd8' : '#f0f4ff';
        g.beginPath();
        for (const q of list) {
          if (Math.sin(t * 6 + q.ph) < 0.3 - (f.mf.hat ?? 0)) continue;
          g.moveTo(q.X + 0.04 * m, q.Y);
          g.arc(q.X, q.Y, 0.04 * m * q.s, 0, TAU);
        }
        g.fill();
      },
    });
  },
  // wireframe polyhedra turning: an octahedron's edges in the place's line colour, glowing with the voice
  shapes(f, w) {
    flock(f, w, {
      key: 13,
      speed: -0.6,
      bob: 1,
      draw(f, list, Ly, li, m) {
        const { g, t, mf } = f;
        g.strokeStyle = rgba(f.T?.line ?? '#5ef0ff', 0.22 + 0.3 * (mf.voice ?? 0));
        g.lineWidth = Math.max(0.025 * m, 1.2 * f.v.dpr);
        g.beginPath();
        for (const q of list) {
          const R = 0.26 * m * q.s * (1 + 0.15 * (mf.kick ?? 0)),
            b = t * 0.8 + q.ph,
            pts = [0, 1, 2, 3].map(i => [q.X + Math.cos(b + (i * Math.PI) / 2) * R, q.Y + Math.sin(b + (i * Math.PI) / 2) * R * 0.35]);
          for (let i = 0; i < 4; i++) {
            const [x, y] = pts[i],
              [nx, ny] = pts[(i + 1) % 4];
            g.moveTo(x, y);
            g.lineTo(nx, ny);
            g.moveTo(x, y);
            g.lineTo(q.X, q.Y - R);
            g.moveTo(x, y);
            g.lineTo(q.X, q.Y + R);
          }
        }
        g.stroke();
      },
    });
  },
  // a flock of small birds, flapping on the hats
  birds(f, w) {
    flock(f, w, {
      key: 17,
      speed: -2,
      bob: 3,
      draw(f, list, Ly, li, m) {
        const { g } = f;
        sil(f, g, m, '#203028');
        g.beginPath();
        for (const q of list)
          for (let j = 0; j < 3; j++) {
            const x = q.X + (j - 1) * 0.5 * m * q.s - Math.abs(j - 1) * 0.1 * m,
              y = q.Y + Math.abs(j - 1) * 0.25 * m * q.s;
            bird(g, x, y, 0.18 * m * q.s, flap(f, q.c * 3 + j, 14));
          }
        g.fill();
        g.stroke();
      },
    });
  },
  // vultures gliding slowly, wide wings with fingered tips, a slow beat now and then
  vultures(f, w) {
    flock(f, w, {
      key: 19,
      speed: -0.5,
      bob: 0.8,
      draw(f, list, Ly, li, m) {
        const { g, t } = f;
        sil(f, g, m, '#2a1810');
        g.beginPath();
        for (const q of list) {
          const sp = 0.55 * m * q.s,
            wing = 0.25 * Math.sin(t * 1.5 + q.ph) + 0.3 * (f.mf.hat ?? 0) * 0.5;
          bird(g, q.X, q.Y, sp, wing, 1);
          for (const d of [-1, 1])
            for (let k = 0; k < 3; k++) {
              const tx = q.X + d * sp * (0.92 + 0.04 * k),
                ty = q.Y - wing * sp * 0.5;
              g.moveTo(tx, ty);
              g.lineTo(tx + d * sp * 0.12, ty + (k - 1) * sp * 0.06);
              g.lineTo(tx, ty + 0.02 * sp);
            }
        }
        g.fill();
        g.stroke();
      },
    });
  },
  // the wreck of something tumbling past: plates and struts turning, a lit edge
  debris(f, w) {
    flock(f, w, {
      key: 23,
      speed: 0.4,
      bob: 0.5,
      draw(f, list, Ly, li, m) {
        const { g, t } = f;
        g.fillStyle = tone(f, '#5a6a88', 0.3);
        g.strokeStyle = rgba('#9ab8e0', 0.35);
        g.lineWidth = 0.02 * m;
        g.beginPath();
        for (const q of list) {
          const b = t * (0.5 + hash(q.c, 5)) + q.ph,
            a = 0.3 * m * q.s,
            c = 0.12 * m * q.s * (1 + hash(q.c, 6)),
            co = Math.cos(b),
            si = Math.sin(b);
          g.moveTo(q.X + co * a - si * c, q.Y + si * a + co * c);
          g.lineTo(q.X - co * a - si * c, q.Y - si * a + co * c);
          g.lineTo(q.X - co * a + si * c, q.Y - si * a - co * c);
          g.lineTo(q.X + co * a + si * c, q.Y + si * a - co * c);
          g.closePath();
        }
        g.fill();
        g.stroke();
      },
    });
  },
  // sparks off the works: short hot streaks arcing down, more on the kick
  sparks(f, w) {
    flock(f, w, {
      key: 29,
      speed: 0,
      bob: 0,
      draw(f, list, Ly, li, m) {
        const { g, t, mf } = f;
        g.strokeStyle = rgba('#ffb347', 0.4 + 0.4 * (mf.kick ?? 0));
        g.lineWidth = Math.max(0.03 * m * Ly.sz, 1.2 * f.v.dpr);
        g.lineCap = 'round';
        g.beginPath();
        for (const q of list)
          for (let j = 0; j < 4; j++) {
            const u = (t * 0.9 + hash(q.c, j + 40)) % 1,
              x = q.X + (j - 1.5) * 0.25 * m + u * 0.8 * m * (hash(q.c, j) - 0.5),
              y = q.Y + u * u * 1.6 * m,
              l = 0.18 * m * q.s;
            g.moveTo(x, y);
            g.lineTo(x - 0.3 * l, y - l);
          }
        g.stroke();
      },
    });
  },
  // confetti tumbling: little papers in the lights' colours, turning edge-on and back
  confetti(f, w) {
    flock(f, w, {
      key: 31,
      speed: -0.3,
      bob: 1.5,
      draw(f, list, Ly, li, m) {
        const { g, t } = f,
          cols = f.T?.win ?? ['#ff5ae0', '#5ef0ff', '#ffe14a'];
        for (let c = 0; c < 3; c++) {
          g.fillStyle = cols[c % cols.length];
          g.beginPath();
          for (const q of list)
            for (let j = c; j < 9; j += 3) {
              const u = (t * 0.35 + hash(q.c, j)) % 1,
                x = q.X + (hash(q.c, j + 20) - 0.5) * 1.6 * m + 0.2 * m * Math.sin(t * 2 + j),
                y = q.Y + (u - 0.5) * 1.6 * m,
                sw = 0.07 * m * q.s * Math.abs(Math.cos(t * (3 + j) + j + (f.mf.kick ?? 0))),
                sh = 0.04 * m * q.s;
              g.rect(x - sw, y - sh, 2 * sw + 0.5, 2 * sh);
            }
          g.fill();
        }
      },
    });
  },
  // bats: jagged wings beating fast, a flutter on each hat
  bats(f, w) {
    flock(f, w, {
      key: 37,
      speed: -2.4,
      bob: 6,
      draw(f, list, Ly, li, m) {
        const { g } = f;
        sil(f, g, m, '#1a0a10');
        g.beginPath();
        for (const q of list)
          for (let j = 0; j < 2; j++) {
            const x = q.X + j * 0.6 * m * q.s,
              y = q.Y + j * 0.3 * m * q.s,
              sp = 0.25 * m * q.s,
              wing = flap(f, q.c * 2 + j, 20);
            for (const d of [-1, 1]) {
              const tipY = y - wing * sp * 0.6;
              g.moveTo(x, y);
              g.lineTo(x + d * sp * 0.5, y - wing * sp * 0.4 - sp * 0.15);
              g.lineTo(x + d * sp, tipY);
              g.lineTo(x + d * sp * 0.75, tipY + sp * 0.2);
              g.lineTo(x + d * sp * 0.5, y - wing * sp * 0.2 + sp * 0.1);
              g.lineTo(x + d * sp * 0.25, y + sp * 0.15);
              g.closePath();
            }
          }
        g.fill();
        g.stroke();
      },
    });
  },
  // schools of fish, turning together on the kick, a glint on each with the voice
  fish(f, w) {
    flock(f, w, {
      key: 41,
      speed: -1.5,
      bob: 1.2,
      draw(f, list, Ly, li, m) {
        const { g, t, mf } = f;
        g.fillStyle = tone(f, '#7ac0c8', 0.4);
        g.beginPath();
        const gl = [];
        for (const q of list)
          for (let j = 0; j < 7; j++) {
            const b = j * 2.4 + q.ph + t * 0.6,
              x = q.X + Math.cos(b) * 0.6 * m * q.s,
              y = q.Y + Math.sin(b * 1.3) * 0.3 * m * q.s + (mf.kick ?? 0) * 0.1 * m * Math.sin(j),
              l = 0.13 * m * q.s,
              tail = Math.sin(t * 12 + j) * l * 0.2;
            g.moveTo(x - l, y);
            g.quadraticCurveTo(x, y - l * 0.4, x + l * 0.6, y);
            g.quadraticCurveTo(x, y + l * 0.4, x - l, y);
            g.moveTo(x + l * 0.5, y);
            g.lineTo(x + l, y - l * 0.3 + tail);
            g.lineTo(x + l, y + l * 0.3 + tail);
            g.closePath();
            if (j % 3 === 0) gl.push([x - l * 0.4, y]);
          }
        g.fill();
        g.fillStyle = rgba('#bff6ff', 0.25 + 0.5 * (mf.voice ?? 0));
        g.beginPath();
        for (const [x, y] of gl) g.rect(x, y - 0.012 * m, 0.04 * m, 0.024 * m);
        g.fill();
      },
    });
  },
  // white snowbirds in pairs, pale against the night, flapping on the hats
  snowbirds(f, w) {
    flock(f, w, {
      key: 43,
      speed: -1.6,
      bob: 2.5,
      draw(f, list, Ly, li, m) {
        const { g } = f;
        g.fillStyle = mixHex('#c8dcec', '#6a8aa8', 0.4 * (2 - li) / 2);
        g.beginPath();
        for (const q of list)
          for (let j = 0; j < 2; j++)
            bird(g, q.X + j * 0.55 * m * q.s, q.Y + j * 0.2 * m * q.s, 0.2 * m * q.s, flap(f, q.c * 2 + j, 11));
        g.fill();
        g.strokeStyle = 'rgba(40,60,90,0.35)';
        g.lineWidth = Math.max(0.015 * m, f.v.dpr);
        g.stroke();
      },
    });
  },
};
