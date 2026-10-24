// The plate he slams down onto out of a fall and the lid he bursts up through out of a rise, both on a drop, one look
// per place (index.js SHAFT's plate and lid). Each is fn(f, o, X, Y, up): (X, Y) its base on screen (the roof's
// level), up true for a lid seen from under it. Nothing drawn once it is broken (o.res === 'ok').
// What reads the same in every place: a slab of the place's own stuff, cracked from the point he hits (the middle of
// its top for a plate, of its underside for a lid), the cracks glowing hot, beating with the kick and spreading as his
// moment comes (a flash on each beat before it), a glow where he hits. What changes is the stuff.
import { LANE } from '../../run.js';
import { clamp, glowDot, hash, mixHex, rgba } from '../util.js';
import { WORLD_G } from '../physics.js';

// the old look of both, for a place without its own
export function slab(f, o, X, Y, up) {
  const { g, v, mf } = f,
    m = v.ppm,
    w = (up ? LANE * 1.5 + 0.35 : 0.9) * m,
    h = (up ? 0.22 : 0.24) * m,
    hot = up ? '#5ad1ff' : '#ff8a3d';
  if (o.res === 'ok') return;
  g.save();
  g.fillStyle = up ? '#10161c' : '#1a1210';
  g.fillRect(X - w, Y - h, 2 * w, h);
  g.strokeStyle = up ? 'rgba(160,190,210,0.8)' : rgba(hot, 0.55 + 0.45 * mf.kick);
  g.lineWidth = 0.05 * m;
  g.strokeRect(X - w, Y - h, 2 * w, h);
  g.strokeStyle = rgba(hot, 0.55 + 0.45 * mf.kick);
  g.lineWidth = 0.035 * m;
  g.beginPath();
  for (const [a, b, c] of [[-0.6, -0.1, 0.2], [0.1, 0.5, -0.3], [-0.2, 0.25, 0.65]]) {
    g.moveTo(X + a * w, up ? Y : Y - h);
    g.lineTo(X + b * w, Y - h * 0.5);
    g.lineTo(X + c * w, up ? Y - h : Y);
  }
  g.stroke();
  glowDot(g, X, up ? Y : Y - h, (0.7 + 0.3 * mf.kick) * m, hot, 0.35 * f.glow);
  g.restore();
}

// a colour u of the way to white, as hex (rgba reads hex only)
function white(hex, u) {
  const n = parseInt(hex.slice(1), 16),
    c = sh => Math.round(((n >> sh) & 255) * (1 - u) + 255 * u);
  return '#' + ((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0');
}

// how near his moment is (0 two beats before, 1 on it) and a flash on each beat counting down to it
function cue(f, o) {
  const beat = f.L?.A?.beat ?? 0.5,
    dt = o.t - f.t,
    near = clamp(1 - dt / (2 * beat), 0, 1),
    tick = dt > -0.05 && dt < 4 * beat ? Math.max(0, Math.cos((2 * Math.PI * dt) / beat)) ** 6 * (0.4 + 0.6 * near) : 0;
  return { near, tick };
}

// the slab's box and its sounds, for the stuff to draw itself in
function box(f, o, X, Y, up, hh) {
  const m = f.v.ppm,
    // (a lid covers the whole mouth of the shaft, a little over its edges: roofs.js cuts it LANE * 1.5 + 0.1 either side)
    w = (up ? LANE * 1.5 + 0.35 : 1.0) * m,
    h = (hh ?? 0.3) * m,
    { near, tick } = cue(f, o);
  return { f, g: f.g, m, X, Y, w, h, up, x0: X - w, x1: X + w, top: Y - h, bot: Y, iy: up ? Y : Y - h, k: f.mf.kick, near, tick, s: Math.floor(o.t * 97) % 100000 };
}

// the box's outline as a path (a stuff with its own outline gives its own)
function rectPath(P) {
  P.g.beginPath();
  P.g.rect(P.x0, P.top, 2 * P.w, P.h);
}

// the cracks: rays from where he hits, zigzagging out along the slab, a branch here and there, reaching further as his
// moment comes; a wide faint stroke under a hot one under a white-hot core
function cracks(P, hot) {
  const { g, m, X, w, h, top, iy, s, k, near, tick, f } = P,
    reach = 0.5 + 0.5 * near,
    path = () => {
      g.beginPath();
      for (let i = 0; i < 7; i++) {
        const dir = i % 2 ? 1 : -1;
        let x = X + (hash(s, i) - 0.5) * 0.12 * w,
          y = iy;
        g.moveTo(x, y);
        for (let j = 1; j <= 4; j++) {
          x += dir * w * reach * (0.08 + 0.2 * hash(s + j, i * 7 + 3)) * (i < 2 ? 0.4 : 1);
          y = top + h * (0.08 + 0.84 * hash(s + i, j * 13 + 1));
          g.lineTo(x, y);
          if (j === 2 && hash(s, i * 5 + j) < 0.6) {
            g.lineTo(x + dir * 0.18 * w * reach, top + h * hash(s, i * 11 + 9));
            g.moveTo(x, y);
          }
        }
      }
    },
    a = 0.6 + 0.3 * k + 0.4 * tick;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (f.glow) {
    path();
    g.strokeStyle = rgba(hot, 0.15 + 0.2 * k + 0.25 * tick);
    g.lineWidth = (0.09 + 0.05 * k) * m;
    g.stroke();
  }
  path();
  g.strokeStyle = rgba(hot, a);
  g.lineWidth = (0.045 + 0.02 * k) * m;
  g.stroke();
  g.strokeStyle = rgba(white(hot, 0.7), a);
  g.lineWidth = 0.016 * m;
  g.stroke();
}

// the slab: its lip (the underside seen from under a lid, the top face of a plate), its stuff, a dark outline so it
// reads on any background, its cracks and the glow where he hits; burst through (a lid), its pieces flying
function lid(f, o, X, Y, up, M) {
  if (o.res === 'ok') return up ? burst(f, o, X, Y, M) : undefined;
  const P = box(f, o, X, Y, up, M.h),
    { g, m } = P;
  g.save();
  paint(P, M);
  // (where he hits: a glow, its heart white on the beat)
  glowDot(g, X, P.iy, (0.5 + 0.25 * P.k + 0.3 * P.near + 0.2 * P.tick) * m, M.hot, (0.25 + 0.2 * P.near + 0.3 * P.tick) * f.glow);
  g.fillStyle = rgba(white(M.hot, 0.75), 0.6 + 0.4 * Math.max(P.k, P.tick));
  g.beginPath();
  g.arc(X, P.iy, (0.05 + 0.04 * P.near) * m, 0, Math.PI * 2);
  g.fill();
  g.restore();
}
function paint(P, M) {
  const { g, m, x0, x1, top, bot, w, up } = P,
    shape = M.shape ?? rectPath;
  // (the lip, in perspective: below a lid, above a plate)
  // (a stuff with its own outline has no straight edge to show a lip on)
  g.fillStyle = M.lip;
  g.beginPath();
  if (M.shape) g.rect(0, 0, 0, 0);
  else if (up) {
    g.moveTo(x0, bot);
    g.lineTo(x1, bot);
    g.lineTo(x1 - 0.12 * m, bot + 0.09 * m);
    g.lineTo(x0 + 0.12 * m, bot + 0.09 * m);
  } else {
    g.moveTo(x0 + 0.05 * w, top + 0.02 * m);
    g.lineTo(x1 - 0.05 * w, top + 0.02 * m);
    g.lineTo(x1 - 0.14 * m, top - 0.09 * m);
    g.lineTo(x0 + 0.14 * m, top - 0.09 * m);
  }
  g.fill();
  M.face(P);
  shape(P);
  g.strokeStyle = 'rgba(0,0,0,0.75)';
  g.lineWidth = 0.05 * m;
  g.stroke();
  cracks(P, M.hot);
}

// the lid burst up through on the drop: a white flash where his fists hit, the slab breaking along a jagged grid into
// its own pieces (each the lid's own stuff, cracks and all, its fresh edges glowing hot), flung up and out from the hit
// (the outer ones wider, some at the camera and growing, some away and shrinking), spinning, falling back under
// gravity; a shockwave out along the roof's line, sparks spraying from the hit, dust rolling out after
// a piece of a lid (poly: its corners on screen) cut out into a canvas of its own: { cv, edge (its hot outline, to fade
// apart), cx, cy (its middle from the lid's top left), ax, ay (that middle inside the canvas) }
function cut(P, M, poly) {
  const { m, x0, top } = P,
    pad = 0.12 * m,
    xs = poly.map(p => p[0]),
    ys = poly.map(p => p[1]),
    bx = Math.min(...xs) - pad,
    by = Math.min(...ys) - pad,
    W = Math.ceil(Math.max(...xs) - bx + pad + 0.05 * m),
    H = Math.ceil(Math.max(...ys) - by + pad + 0.16 * m),
    cx = xs.reduce((a, v) => a + v, 0) / 4,
    cy = ys.reduce((a, v) => a + v, 0) / 4,
    make = () => Object.assign(document.createElement('canvas'), { width: Math.max(1, W), height: Math.max(1, H) }),
    cv = make(),
    edge = make(),
    g = cv.getContext('2d'),
    outline = (c, ox, oy) => {
      c.beginPath();
      poly.forEach(([px, py], k) => (k ? c.lineTo(px + ox, py + oy) : c.moveTo(px + ox, py + oy)));
      c.closePath();
    };
  g.translate(-bx, -by);
  // (its thickness: the broken body under its face, the stuff's lip colour, a dark edge)
  outline(g, 0.05 * m, 0.16 * m);
  g.fillStyle = M.lip;
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.7)';
  g.lineWidth = 0.04 * m;
  g.stroke();
  outline(g, 0, 0);
  g.save();
  g.clip();
  paint({ ...P, g }, M);
  g.restore();
  const e = edge.getContext('2d');
  e.translate(-bx, -by);
  outline(e, 0, 0);
  e.strokeStyle = M.hot;
  e.lineWidth = 0.035 * m;
  e.stroke();
  return { cv, edge, cx: cx - x0, cy: cy - top, ax: cx - bx, ay: cy - by };
}

const BURST = 1.9,
  COLS = 7;
// the lid's pieces (P its box in full flower), each cut out into a little canvas of its own: the lid's stuff, cracks and
// all, under its outline, on its thickness, its fresh edges hot. Drawing the lid again under a clip for every piece,
// every frame, cost the graphics card a frame's time over at a retina's size; cutting them on the drop's first frame
// cost that frame 25-65 ms, so they are cut while the song loads (prepLid)
function shards(P, M) {
  const { m, x0, w, top, bot, h, s } = P;
  // (the jagged grid it breaks along: a cut's top and bottom apart, a row line across it, all shaken by the seed)
  const at = (i, k) => x0 + (2 * w * i) / COLS + (i > 0 && i < COLS ? (hash(s + k, i * 3) - 0.5) * (1.3 * w) / COLS : 0),
    tops = Array.from({ length: COLS + 1 }, (_, i) => at(i, 1)),
    bots = Array.from({ length: COLS + 1 }, (_, i) => at(i, 2)),
    mids = Array.from({ length: COLS + 1 }, (_, i) => top + h * (0.35 + 0.3 * hash(s, i * 7 + 5))),
    midX = i => (tops[i] + bots[i]) / 2;
  const pieces = [];
  for (let i = 0; i < COLS; i++) {
    pieces.push([[tops[i], top], [tops[i + 1], top], [midX(i + 1), mids[i + 1]], [midX(i), mids[i]]]);
    pieces.push([[midX(i), mids[i]], [midX(i + 1), mids[i + 1]], [bots[i + 1], bot + 0.09 * m], [bots[i], bot + 0.09 * m]]);
  }
  return { m, list: pieces.map(poly => cut(P, M, poly)) };
}
// a lid's pieces cut before its drop (f: a frame at the moment it bursts, its music then; at (X, Y) on screen: the cut
// is the same anywhere but for how its edges fall on the pixels)
export function prepLid(f, o, X, Y, name) {
  const M = STUFF[name];
  if (!M || o.shards) return;
  const P = box(f, o, X, Y, true, M.h);
  P.near = 1;
  P.tick = 0;
  o.shards = shards(P, M);
}
function burst(f, o, X, Y, M) {
  const e = f.t - (o.okT ?? o.t);
  if (e < 0 || e > BURST) return;
  const P = box(f, o, X, Y, true, M.h),
    { g, m, x0, w, top, bot, s } = P,
    hot = M.hot,
    fade = clamp((BURST - e) / 0.5, 0, 1);
  // (the slab in full flower: its cracks as far as they go)
  P.near = 1;
  P.tick = 0;
  g.save();
  // (each piece cut out once into a little canvas of its own (shards), at load (prepLid) or else the first frame it
  // flies: then each frame only placed)
  if (!o.shards || Math.abs(o.shards.m - m) > 0.25 * o.shards.m) o.shards = shards(P, M);
  const k = m / o.shards.m,
    cool = clamp(1 - e / 1.2, 0, 1);
  o.shards.list.forEach((sh, i) => {
    const d = (sh.cx * k - (X - x0)) / w,
      r = q => hash(s + i * 17, q),
      // (metres a second: out from the hit, the outer ones wider; up hard, the middle hardest, the underside's less)
      vx = d * (6 + 7 * r(1)) + (r(2) - 0.5) * 2,
      vy = (11 + 7 * r(3)) * (1 - 0.45 * Math.abs(d)) * (i % 2 ? 0.75 : 1),
      x = vx * e,
      y = vy * e - 0.5 * 16 * e * e,
      spin = (r(4) - 0.5) * 14 + Math.sign(d || 1) * 5,
      // (swelling at once as it breaks off towards the camera, then on at its own pace: a chunk, not a splinter)
      z = (1 + 0.9 * Math.min(1, e / 0.12) + (r(5) - 0.3) * 1.4 * e) * k;
    if (z <= 0.1) return;
    g.save();
    g.translate(x0 + sh.cx * k + x * m, top + sh.cy * k - y * m);
    g.rotate(spin * e);
    g.scale(z, z);
    g.globalAlpha = fade;
    g.drawImage(sh.cv, -sh.ax, -sh.ay);
    if (cool > 0) {
      g.globalAlpha = fade * cool;
      g.drawImage(sh.edge, -sh.ax, -sh.ay);
    }
    g.restore();
  });
  // (rubble: small chunks of its stuff and its hot core, thrown wider and higher than the pieces)
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI / 2 + (hash(s, i * 11) - 0.5) * 2.9,
      sp = 7 + 11 * hash(s, i * 11 + 1),
      x = Math.cos(a) * sp * e,
      y = -Math.sin(a) * sp * e - 0.5 * 16 * e * e,
      sz = (0.07 + 0.13 * hash(s, i * 11 + 2)) * m * (1 + 0.6 * Math.min(1, e / 0.12));
    g.save();
    g.globalAlpha = fade;
    g.translate(X + x * m, bot - y * m);
    g.rotate(e * (8 + 10 * hash(s, i * 11 + 3)));
    g.fillStyle = i % 4 ? M.lip : hot;
    g.fillRect(-sz, -sz * 0.7, 2 * sz, 1.4 * sz);
    g.restore();
  }
  // (the flash where his fists hit)
  if (e < 0.25) {
    glowDot(g, X, bot, 4.5 * m, '#ffffff', 0.85 * (1 - e / 0.25));
    glowDot(g, X, bot, 2.2 * m, hot, 0.8 * (1 - e / 0.25));
  }
  // (the shockwave out along the roof's line, flat in perspective)
  for (const [dl, lw, c] of [[0, 0.18, '#ffffff'], [0.07, 0.1, hot]]) {
    const u = clamp((e - dl) / 0.6, 0, 1),
      rr = (w / m + 9 * u) * m;
    if (u <= 0 || u >= 1) continue;
    g.strokeStyle = rgba(c, 0.85 * (1 - u));
    g.lineWidth = lw * m * (1 - 0.6 * u);
    g.beginPath();
    g.ellipse(X, bot, rr, rr * 0.18, 0, 0, Math.PI * 2);
    g.stroke();
  }
  // (sparks: streaks sprayed up and out from the hit, falling back)
  g.lineCap = 'round';
  for (let i = 0; i < 28; i++) {
    const a = -Math.PI / 2 + (hash(s, i * 5) - 0.5) * 2.6,
      sp = 9 + 12 * hash(s, i * 5 + 1),
      life = 0.5 + 0.5 * hash(s, i * 5 + 2);
    if (e > life) continue;
    const px = Math.cos(a) * sp * e,
      py = -Math.sin(a) * sp * e - 0.5 * WORLD_G * e * e,
      vx = Math.cos(a) * sp,
      vyy = -Math.sin(a) * sp - WORLD_G * e,
      k = 0.035,
      u = 1 - e / life;
    g.strokeStyle = rgba(i % 3 ? hot : '#ffffff', u);
    g.lineWidth = (0.03 + 0.03 * u) * m;
    g.beginPath();
    g.moveTo(X + px * m, bot - py * m);
    g.lineTo(X + (px - vx * k) * m, bot - (py - vyy * k) * m);
    g.stroke();
  }
  // (dust rolling out under the hole and hanging)
  for (let i = 0; i < 9; i++) {
    const side = i % 2 ? 1 : -1,
      u = clamp(e / 1.2, 0, 1),
      dx = side * (0.4 + (1.5 + 2 * hash(s, i * 3 + 7)) * (1 - (1 - u) ** 2)),
      dy = -0.4 * u + 0.3 * hash(s, i);
    glowDot(g, X + (dx + (hash(s, i) - 0.5)) * m, bot + dy * m, (0.7 + 1.3 * u) * m, M.lip, 0.35 * (1 - u));
  }
  g.restore();
}

// the stuff of each
const STUFF = {
  // steel frame round four glass panes, the sky's light in them, a glint across each
  skylight: {
    hot: '#9be8ff',
    lip: '#141a22',
    face(P) {
      const { g, m, x0, top, w, h, near } = P;
      g.fillStyle = '#2c3644';
      rectPath(P);
      g.fill();
      const n = 4,
        fw = 0.07 * m,
        pw = (2 * w - fw * (n + 1)) / n;
      for (let i = 0; i < n; i++) {
        const px = x0 + fw + i * (pw + fw);
        g.fillStyle = rgba('#6fb8e8', 0.35 + 0.25 * near);
        g.fillRect(px, top + fw, pw, h - 2 * fw);
        g.strokeStyle = 'rgba(255,255,255,0.35)';
        g.lineWidth = 0.025 * m;
        g.beginPath();
        g.moveTo(px + pw * 0.15, top + h - fw);
        g.lineTo(px + pw * 0.4, top + fw);
        g.stroke();
      }
    },
  },
  // terracotta tiles in two overlapping rows, their round ends
  tiles: {
    hot: '#ffb347',
    lip: '#b0583a',
    face(P) {
      const { g, m, x0, top, w, h } = P,
        tw = 0.24 * m;
      g.fillStyle = '#8a3a22';
      rectPath(P);
      g.fill();
      g.strokeStyle = '#4a1a10';
      g.lineWidth = 0.025 * m;
      g.beginPath();
      for (let r = 0; r < 2; r++) {
        const y = top + h * (r ? 0.95 : 0.5),
          off = r * tw * 0.5;
        for (let x = x0 - off; x < x0 + 2 * w - 0.01; x += tw) {
          const a = Math.max(x0, x),
            b = Math.min(x0 + 2 * w, x + tw);
          if (b <= a) continue;
          g.moveTo(a, y - h * 0.42);
          g.quadraticCurveTo((a + b) / 2, y + h * 0.05, b, y - h * 0.42);
        }
      }
      g.stroke();
      g.fillStyle = 'rgba(255,190,140,0.18)';
      g.fillRect(x0, top, 2 * w, h * 0.12);
    },
  },
  // dark glass in a neon tube frame, the place's grid in it
  neonpane: {
    hot: '#ff7af5',
    lip: '#0a0414',
    face(P) {
      const { g, m, x0, top, w, h, k } = P,
        line = '#5ef0ff';
      g.fillStyle = '#140628';
      rectPath(P);
      g.fill();
      g.strokeStyle = rgba(line, 0.3);
      g.lineWidth = 0.015 * m;
      g.beginPath();
      for (let x = x0 + 0.2 * m; x < x0 + 2 * w; x += 0.2 * m) {
        g.moveTo(x, top);
        g.lineTo(x, top + h);
      }
      g.moveTo(x0, top + h / 2);
      g.lineTo(x0 + 2 * w, top + h / 2);
      g.stroke();
      g.strokeStyle = rgba(line, 0.75 + 0.25 * k);
      g.lineWidth = 0.05 * m;
      g.strokeRect(x0 + 0.04 * m, top + 0.04 * m, 2 * w - 0.08 * m, h - 0.08 * m);
    },
  },
  // a woven nest of sticks, a leaf or two, light seeping through the gaps
  branches: {
    hot: '#d4ff6a',
    lip: '#1e140a',
    h: 0.36,
    shape(P) {
      const { g, x0, x1, top, bot, h, X } = P;
      g.beginPath();
      g.moveTo(x0, bot - h * 0.4);
      g.quadraticCurveTo(x0 + 0.1 * (x1 - x0), top - h * 0.1, X, top);
      g.quadraticCurveTo(x1 - 0.1 * (x1 - x0), top - h * 0.1, x1, bot - h * 0.4);
      g.quadraticCurveTo(x1 - 0.05 * (x1 - x0), bot + h * 0.1, X, bot);
      g.quadraticCurveTo(x0 + 0.05 * (x1 - x0), bot + h * 0.1, x0, bot - h * 0.4);
      g.closePath();
    },
    face(P) {
      const { g, m, x0, top, w, h, s, k } = P;
      g.fillStyle = '#2a1c10';
      STUFF.branches.shape(P);
      g.fill();
      g.fillStyle = rgba('#d4ff6a', 0.08 + 0.12 * k);
      g.fill();
      for (const [col, lw, j] of [['#5a3c20', 0.06, 0], ['#8a6236', 0.04, 1]]) {
        g.strokeStyle = col;
        g.lineWidth = lw * m;
        g.beginPath();
        for (let i = 0; i < 9; i++) {
          const a = x0 + 2 * w * hash(s + j, i * 3),
            b = clamp(a + (hash(s + j, i * 3 + 1) - 0.5) * 1.6 * w, x0 + 0.1 * w, x0 + 1.9 * w),
            ya = top + h * (0.2 + 0.6 * hash(s + j, i * 3 + 2)),
            yb = top + h * (0.2 + 0.6 * hash(s + j, i * 3 + 5));
          g.moveTo(a, ya);
          g.quadraticCurveTo((a + b) / 2, Math.min(ya, yb) - 0.12 * h, b, yb);
        }
        g.stroke();
      }
      g.fillStyle = '#3f7a2a';
      g.beginPath();
      for (let i = 0; i < 5; i++) {
        const lx = x0 + 2 * w * (0.1 + 0.8 * hash(s, i + 40)),
          ly = top + h * (0.15 + 0.7 * hash(s, i + 50));
        g.moveTo(lx + 0.07 * m, ly);
        g.ellipse(lx, ly, 0.07 * m, 0.035 * m, hash(s, i + 60) * 3, 0, Math.PI * 2);
      }
      g.fill();
    },
  },
  // boards laid across, gaps between, grain and nails
  planks: {
    hot: '#ffb347',
    lip: '#8a5a30',
    face(P) {
      const { g, m, x0, top, w, h, s } = P,
        bw = 0.3 * m;
      g.fillStyle = '#20140a';
      rectPath(P);
      g.fill();
      for (let i = 0, x = x0; x < x0 + 2 * w - 1; i++, x += bw) {
        const b = Math.min(bw - 0.03 * m, x0 + 2 * w - x),
          dy = (hash(s, i) - 0.5) * 0.04 * m;
        g.fillStyle = mixHex('#7a4e28', '#5a361a', hash(s, i + 9));
        g.fillRect(x, top + dy, b, h - dy);
      }
      g.strokeStyle = 'rgba(30,15,5,0.55)';
      g.lineWidth = 0.012 * m;
      g.beginPath();
      for (let i = 0, x = x0; x < x0 + 2 * w - 1; i++, x += bw) {
        g.moveTo(x + bw * 0.3, top + 0.04 * m);
        g.quadraticCurveTo(x + bw * (0.2 + 0.3 * hash(s, i + 20)), top + h / 2, x + bw * 0.35, top + h - 0.03 * m);
      }
      g.stroke();
      g.fillStyle = '#c8c0b0';
      g.beginPath();
      for (let x = x0; x < x0 + 2 * w - 1; x += bw) {
        g.moveTo(x + bw * 0.5, top + 0.06 * m);
        g.arc(x + bw * 0.5, top + 0.06 * m, 0.018 * m, 0, Math.PI * 2);
      }
      g.fill();
    },
  },
  // a hatch: hazard stripes at its ends, the iris's blades meeting at a lit seam in the middle, rivets
  airlock: {
    hot: '#7ff0ff',
    lip: '#121826',
    face(P) {
      const { g, m, x0, x1, X, top, w, h, k, near } = P,
        sw = 0.32 * m;
      g.fillStyle = '#2e3a52';
      rectPath(P);
      g.fill();
      g.save();
      g.beginPath();
      g.rect(x0, top, sw, h);
      g.rect(x1 - sw, top, sw, h);
      g.clip();
      g.fillStyle = '#f2c230';
      g.fillRect(x0, top, 2 * w, h);
      g.fillStyle = '#16161a';
      g.beginPath();
      for (let x = x0 - h; x < x1; x += 0.16 * m) {
        g.moveTo(x, top + h);
        g.lineTo(x + 0.08 * m, top + h);
        g.lineTo(x + 0.08 * m + h, top);
        g.lineTo(x + h, top);
      }
      g.fill();
      g.restore();
      g.strokeStyle = '#4a5a78';
      g.lineWidth = 0.025 * m;
      g.beginPath();
      for (let i = -3; i <= 3; i++) {
        if (!i) continue;
        const x = X + (i / 3.5) * (w - sw);
        g.moveTo(x, top);
        g.lineTo(x - Math.sign(i) * 0.1 * m, top + h);
      }
      g.stroke();
      g.fillStyle = rgba('#7ff0ff', 0.4 + 0.4 * Math.max(k, near));
      g.fillRect(X - 0.025 * m, top, 0.05 * m, h);
      g.fillStyle = '#8a9ab8';
      g.beginPath();
      for (let x = x0 + sw + 0.15 * m; x < x1 - sw - 0.1 * m; x += 0.3 * m) {
        g.moveTo(x, top + 0.05 * m);
        g.arc(x, top + 0.05 * m, 0.015 * m, 0, Math.PI * 2);
      }
      g.fill();
    },
  },
  // steel bars in a frame, the heat glowing behind them
  grate: {
    hot: '#ffb347',
    lip: '#241e20',
    face(P) {
      const { g, m, x0, top, w, h, k } = P;
      g.fillStyle = '#1a0e08';
      rectPath(P);
      g.fill();
      g.fillStyle = rgba('#ff6a2a', 0.25 + 0.35 * k);
      g.fillRect(x0, top + h * 0.2, 2 * w, h * 0.6);
      g.fillStyle = '#5a5258';
      for (let x = x0 + 0.06 * m; x < x0 + 2 * w - 0.04 * m; x += 0.17 * m) g.fillRect(x, top, 0.06 * m, h);
      g.fillStyle = '#6e666c';
      g.fillRect(x0, top + h * 0.42, 2 * w, 0.05 * m);
      g.strokeStyle = '#3a3438';
      g.lineWidth = 0.07 * m;
      g.strokeRect(x0 + 0.035 * m, top + 0.035 * m, 2 * w - 0.07 * m, h - 0.07 * m);
    },
  },
  // a speaker grille: rows of holes lit from inside on the kick, a frame, the badge in the middle
  grille: {
    hot: '#ff5ae0',
    lip: '#0a0a10',
    face(P) {
      const { g, m, x0, X, top, w, h, k, f } = P,
        lit = f.T?.win?.[0] ?? '#ff5ae0';
      g.fillStyle = '#1a1a24';
      rectPath(P);
      g.fill();
      g.fillStyle = rgba(lit, 0.25 + 0.6 * k);
      g.beginPath();
      for (let r = 0; r < 3; r++)
        for (let x = x0 + 0.1 * m + (r % 2) * 0.05 * m; x < x0 + 2 * w - 0.06 * m; x += 0.1 * m) {
          const y = top + h * (0.25 + 0.25 * r);
          g.moveTo(x + 0.022 * m, y);
          g.arc(x, y, 0.022 * m, 0, Math.PI * 2);
        }
      g.fill();
      g.strokeStyle = '#3a3a4c';
      g.lineWidth = 0.05 * m;
      g.strokeRect(x0 + 0.025 * m, top + 0.025 * m, 2 * w - 0.05 * m, h - 0.05 * m);
      g.fillStyle = '#c8c8d8';
      g.fillRect(X + 0.4 * w, top + h * 0.35, 0.18 * m, h * 0.3);
    },
  },
  // a crust of cooled lava, its edge broken, the melt showing under it
  crust: {
    hot: '#ffb347',
    lip: '#3a1a10',
    h: 0.34,
    shape(P) {
      const { g, x0, x1, top, bot, h, s } = P;
      g.beginPath();
      g.moveTo(x0, bot);
      g.lineTo(x0 + 0.02 * (x1 - x0), top + 0.3 * h);
      for (let i = 1; i < 12; i++) g.lineTo(x0 + ((x1 - x0) * i) / 12, top + h * 0.25 * hash(s, i + 70));
      g.lineTo(x1 - 0.02 * (x1 - x0), top + 0.3 * h);
      g.lineTo(x1, bot);
      g.closePath();
    },
    face(P) {
      const { g, m, x0, bot, w, h, s, f } = P,
        bass = f.mf.bass ?? 0;
      STUFF.crust.shape(P);
      g.fillStyle = '#241412';
      g.fill();
      g.fillStyle = rgba('#ff5a1f', 0.3 + 0.35 * bass);
      g.fillRect(x0, bot - h * 0.22, 2 * w, h * 0.22);
      g.fillStyle = '#382220';
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const cx = x0 + 2 * w * (0.08 + 0.84 * hash(s, i + 80)),
          cy = bot - h * (0.45 + 0.2 * hash(s, i + 90));
        g.moveTo(cx + 0.14 * m, cy);
        g.ellipse(cx, cy, 0.14 * m, 0.06 * m, 0, 0, Math.PI * 2);
      }
      g.fill();
    },
  },
  // a giant clam's shell: a scalloped dome, its ribs fanning from the hinge, pearl sheen along it, the pearl inside
  // glowing with the voice
  shell: {
    hot: '#7ffff0',
    lip: '#5a3a50',
    h: 0.38,
    shape(P) {
      const { g, x0, x1, top, bot, X, h } = P,
        n = 9;
      g.beginPath();
      g.moveTo(x0, bot);
      g.quadraticCurveTo(x0, top + 0.3 * h, x0 + 0.1 * (x1 - x0), top + 0.25 * h);
      for (let i = 1; i <= n; i++) {
        const a = x0 + 0.1 * (x1 - x0) + ((x1 - x0) * 0.8 * (i - 0.5)) / n,
          b = x0 + 0.1 * (x1 - x0) + ((x1 - x0) * 0.8 * i) / n,
          dome = 1 - Math.abs((b - X) / (x1 - x0)) * 0.9;
        g.quadraticCurveTo(a, top - 0.12 * h * dome, b, top + 0.2 * h * (1 - dome));
      }
      g.quadraticCurveTo(x1, top + 0.3 * h, x1, bot);
      g.closePath();
    },
    face(P) {
      const { g, m, X, top, bot, w, h, f } = P,
        hy = P.up ? top : bot;
      STUFF.shell.shape(P);
      g.fillStyle = '#b48aa4';
      g.fill();
      g.fillStyle = 'rgba(255,240,250,0.22)';
      g.fillRect(X - w, top + h * 0.15, 2 * w, h * 0.18);
      g.strokeStyle = '#7a5470';
      g.lineWidth = 0.02 * m;
      g.beginPath();
      for (let i = -4; i <= 4; i++) {
        g.moveTo(X + i * 0.04 * w, hy);
        g.lineTo(X + (i / 4.5) * w * 0.95, P.up ? bot : top + 0.1 * h);
      }
      g.stroke();
      glowDot(g, X, hy + (P.up ? 0.1 : -0.1) * m, (0.25 + 0.3 * (f.mf.voice ?? 0)) * m, '#fff0f8', 0.5 * f.glow);
    },
  },
  // a sheet of ice: clear, faceted, frost along its top edge, a bubble or two frozen in it
  ice: {
    hot: '#7fe6ff',
    lip: '#5a8ab0',
    face(P) {
      const { g, m, x0, top, w, h, s } = P;
      g.fillStyle = 'rgba(120,180,225,0.8)';
      rectPath(P);
      g.fill();
      g.fillStyle = 'rgba(230,248,255,0.35)';
      g.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = x0 + 2 * w * (i / 4 + 0.05 * hash(s, i)),
          b = a + 2 * w * (0.12 + 0.08 * hash(s, i + 4));
        g.moveTo(a, top + h);
        g.lineTo(a + 0.2 * (b - a), top);
        g.lineTo(b, top);
        g.lineTo(b - 0.4 * (b - a), top + h);
      }
      g.fill();
      g.fillStyle = '#f4fbff';
      g.fillRect(x0, top, 2 * w, 0.035 * m);
      g.strokeStyle = 'rgba(255,255,255,0.6)';
      g.lineWidth = 0.012 * m;
      g.beginPath();
      for (let i = 0; i < 5; i++) {
        const bx = x0 + 2 * w * hash(s, i + 30),
          by = top + h * (0.3 + 0.5 * hash(s, i + 35));
        g.moveTo(bx + 0.025 * m, by);
        g.arc(bx, by, 0.025 * m, 0, Math.PI * 2);
      }
      g.stroke();
    },
  },
};

export const LIDS = Object.fromEntries(Object.entries(STUFF).map(([name, M]) => [name, (f, o, X, Y, up) => lid(f, o, X, Y, up, M)]));

// what each place's roof breaks into (chunks, dust) when he slams into it
const RUBBLE = {
  city: ['#59606e', '#9aa0a8'],
  synth: ['#3a1660', '#ff6ad5'],
  forest: ['#5a3a22', '#7ab04a'],
  desert: ['#b08850', '#e8d0a0'],
  station: ['#5a6478', '#c9d2e0'],
  factory: ['#6a5048', '#ffb347'],
  rave: ['#2a2a38', '#ffe14a'],
  volcano: ['#2a1814', '#ff7a2a'],
  ocean: ['#2a5a52', '#8af0ff'],
  arctic: ['#9ad4f0', '#ffffff'],
  circuit: ['#0e3a24', '#d8b25a'],
};
// the spot he slams into on a drop out of a fall: no lid on a roof he lands on from above, but a target on it, its
// rings closing in on the drop's beat (a countdown: one ring a beat, the last on the moment), its roof already cracking
// round it; slammed into (↓ on the beat) it is a crater: a shockwave out across the roof, the roof in chunks flying up and
// out, dust, its rim glowing and cooling. Missed, the target just goes out
export function impact(f, o, X, Y) {
  const { g, v, mf, t, T } = f,
    m = v.ppm,
    beat = f.L?.A?.beat ?? 0.5,
    [body, lit] = RUBBLE[f.place] ?? RUBBLE.city,
    hot = T?.line ?? '#ffd84a',
    sq = 0.28;
  if (o.res === 'hit' || o.res === 'skip') return;
  g.save();
  if (o.res !== 'ok') {
    const dt = o.t - t;
    if (dt > 4 * beat) {
      g.restore();
      return;
    }
    const near = clamp(1 - dt / (4 * beat), 0, 1),
      R = (2.0 + 0.15 * mf.kick) * m;
    // (the roof cracking under the spot, more as the moment comes)
    g.strokeStyle = rgba(hot, 0.25 + 0.5 * near);
    g.lineWidth = (0.03 + 0.03 * near) * m;
    g.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3 * Math.sin(i * 7.1),
        len = (0.6 + 1.2 * near) * (0.6 + 0.4 * Math.sin(i * 3.3) ** 2);
      g.moveTo(X + Math.cos(a) * R * 0.25, Y + Math.sin(a) * R * 0.25 * sq);
      g.lineTo(X + Math.cos(a + 0.15) * len * m * 0.6, Y + Math.sin(a + 0.15) * len * m * 0.6 * sq);
      g.lineTo(X + Math.cos(a) * len * m, Y + Math.sin(a) * len * m * sq);
    }
    g.stroke();
    // (the rings: one closing in each beat, the last one landing on the moment)
    for (let k = 0; k < 3; k++) {
      const u = (dt / beat + k) % 3,
        r = R * (0.35 + u * 0.75);
      if (u > 2.6) continue;
      g.strokeStyle = rgba(k ? hot : '#ffffff', (0.85 - u * 0.28) * (0.5 + 0.5 * near));
      g.lineWidth = (0.06 + 0.04 * mf.beat) * m;
      g.beginPath();
      g.ellipse(X, Y, r, r * sq, 0, 0, Math.PI * 2);
      g.stroke();
    }
    // (the bullseye, white-hot on the kick)
    glowDot(g, X, Y, R * (0.9 + 0.6 * near), hot, (0.35 + 0.4 * near) * (f.glow ? 1 : 0.6));
    g.fillStyle = rgba('#ffffff', 0.5 + 0.5 * mf.kick);
    g.beginPath();
    g.ellipse(X, Y, R * 0.18, R * 0.18 * sq, 0, 0, Math.PI * 2);
    g.fill();
    // (crosshair ticks on the roof)
    g.strokeStyle = rgba(hot, 0.7);
    g.lineWidth = 0.05 * m;
    for (const a of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
      g.beginPath();
      g.moveTo(X + Math.cos(a) * R * 1.25, Y + Math.sin(a) * R * 1.25 * sq);
      g.lineTo(X + Math.cos(a) * R * 1.6, Y + Math.sin(a) * R * 1.6 * sq);
      g.stroke();
    }
    g.restore();
    return;
  }
  // the crater: since he slammed in
  const e = t - (o.okT ?? o.t);
  if (e > 2.5) {
    g.restore();
    return;
  }
  const grow = 1 - (1 - Math.min(1, e / 0.18)) ** 3,
    cool = clamp(1 - e / 2.5, 0, 1);
  // (the shockwave racing out across the roof)
  for (const [d, w, c] of [[0, 0.16, '#ffffff'], [0.08, 0.1, hot]]) {
    const u = clamp((e - d) / 0.55, 0, 1),
      r = (1.2 + 8 * u) * m;
    if (u <= 0 || u >= 1) continue;
    g.strokeStyle = rgba(c, 0.9 * (1 - u));
    g.lineWidth = w * m * (1 - u * 0.6);
    g.beginPath();
    g.ellipse(X, Y, r, r * sq, 0, 0, Math.PI * 2);
    g.stroke();
  }
  // (the crater itself: a dark bowl, a hot rim cooling, cracks out from it)
  const cr = 2.2 * m * grow;
  g.fillStyle = 'rgba(0,0,0,0.75)';
  g.beginPath();
  g.ellipse(X, Y, cr, cr * sq, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = rgba(lit, 0.9 * cool);
  g.lineWidth = 0.08 * m;
  g.beginPath();
  g.ellipse(X, Y, cr, cr * sq, 0, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = rgba(hot, 0.8 * cool);
  g.lineWidth = 0.04 * m;
  g.beginPath();
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + 0.4 * Math.sin(i * 5.3),
      len = cr + (0.8 + 1.4 * Math.sin(i * 2.7) ** 2) * m * grow;
    g.moveTo(X + Math.cos(a) * cr, Y + Math.sin(a) * cr * sq);
    g.lineTo(X + Math.cos(a) * len, Y + Math.sin(a) * len * sq);
  }
  g.stroke();
  // (the roof in chunks, up and out under gravity, spinning; dust after them)
  for (let i = 0; i < 22; i++) {
    const a = hash(Math.floor(o.t * 13), i) * Math.PI * 2,
      sp = 3 + 6 * hash(i, Math.floor(o.t * 7)),
      up = 4 + 7 * hash(i * 3, 11),
      x = Math.cos(a) * sp * e,
      y = up * e - 0.5 * WORLD_G * e * e,
      dep = Math.sin(a) * sp * e * sq;
    if (y < -0.2 && e > 0.3) continue;
    const s = (0.08 + 0.16 * hash(i, 5)) * m,
      rot = e * (6 + 10 * hash(i, 9));
    g.save();
    g.translate(X + x * m, Y + dep * m - Math.max(0, y) * m);
    g.rotate(rot);
    g.fillStyle = i % 3 ? body : lit;
    g.fillRect(-s, -s * 0.6, s * 2, s * 1.2);
    g.restore();
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2,
      r = (0.8 + 2.5 * Math.min(1, e / 0.8)) * m,
      d = clamp(1 - e / 1.6, 0, 1);
    if (d <= 0) continue;
    glowDot(g, X + Math.cos(a) * r, Y + Math.sin(a) * r * sq - 0.3 * m * e, (0.6 + 0.8 * e) * m, lit, 0.18 * d);
  }
  // (the flash of it)
  if (e < 0.2) glowDot(g, X, Y, 3 * m, '#ffffff', 0.7 * (1 - e / 0.2));
  g.restore();
}
