// Fujisan (after ATL's "Фудзи": quietly crawling out of the pit up the slopes of Fujiyama, a snail that will reach its
// top one day; the sky black velvet, the far cosmos luring; a rusty rocket, fractal shells, an echo-zeppelin puffed
// up, the dawn painting it all purple; the cover's tunnel of storm cloud with a man's shape of blue sky cut through it;
// world/artists.js): a dream of the sacred mountain at a snail's height, no town and no shrine in it. The sky black
// velvet thick with stars twinkling on the hats, a purple dawn low behind; the mountain itself fills it, always ahead,
// a perfect cone of violet with its cap of snow, a spiral of steam turning up out of its crater and puffing on the kick,
// the sun coming up behind its shoulder on the voice; on a drop the storm cloud over it parts in a window of blue sky
// the shape of a man (the cover's). Far off a sea of cloud rolling, lit pink from below, black ridges standing out of it;
// near, boulders of black cinder capped with snow, tufts of reeds, and great snails gliding up the slope, their shells'
// spirals lit in turn on the beat; underfoot black cinder, snow in its hollows and a snail's trail shimmering along it.
// Landmarks: a giant spiral shell standing on the slope, its chambers lit round on the beat; a rusty rocket overgrown
// with ivy, glowing and lifting on a drop; the echo-zeppelin, puffing up with the bass, rings of its echo out on the
// beat.
import { hash, mixHex, rgba } from '../util.js';
import { cells, edge, glow, landmark, pic, row, sizeStep, slab, stamp, steady, still, vgrad } from './kit.js';

const TAU = Math.PI * 2,
  SNOW = '#f4f0ff',
  PEACH = '#ffb08a',
  PINK = '#ff7aa8',
  VIOLET = '#5a3a8a',
  CINDER = '#16101e',
  RUST = '#b0582a';

const beatOf = f => {
  const b = f.t / f.L.A.beat;
  return { n: Math.floor(b), u: b - Math.floor(b) };
};
function mark(f, par, every, chance, salt, draw) {
  const up = Math.max(1.6 * f.v.ppm, 0.2 * f.v.H);
  landmark(f, par, every, chance, salt, (X, base, i) => draw(X, base - up, up, i));
}
// how far into a drop's stretch the song is (0 out of one): the window in the clouds opens over a bar and stays
const dropOpen = f => {
  const sc = f.look.sceneAt?.(f.t);
  if (!sc || sc.kind !== 'drop') return 0;
  const u = Math.min(1, (f.t - sc.t0) / (2 * f.L.A.beat));
  return u * u * (3 - 2 * u);
};

// ---- the stars of the velvet, painted once a size
const STARS = new Map();
function starField(W, H) {
  const key = `${W}x${H}`;
  let c = STARS.get(key);
  if (c) return c;
  c = Object.assign(document.createElement('canvas'), { width: W, height: Math.ceil(H * 0.6) });
  const g = c.getContext('2d');
  for (let i = 0; i < 240; i++) {
    const x = hash(i, 11) * W,
      y = hash(i, 12) ** 1.4 * c.height,
      r = (0.4 + 1.3 * hash(i, 13) ** 3) * Math.max(1, W / 900);
    g.fillStyle = `rgba(255,250,255,${0.25 + 0.6 * hash(i, 14) * (1 - y / c.height)})`;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
  STARS.clear();
  STARS.set(key, c);
  return c;
}
// the mountain: a cone with concave flanks, lit on its dawn side and shadowed on the other, its cap of snow with a
// ragged hem, gullies running down from it, ridges of old lava down its flanks; painted once a size step (mountainPic)
function mountain(g, X, Y, W, H, body, cap, shade) {
  g.fillStyle = vgrad(g, Y, Y + H, [[0, mixHex(body, '#ffffff', 0.12)], [1, mixHex(body, '#000000', 0.25)]]);
  g.beginPath();
  g.moveTo(X - W, Y + H);
  g.quadraticCurveTo(X - W * 0.3, Y + H * 0.55, X - W * 0.09, Y);
  g.lineTo(X + W * 0.09, Y);
  g.quadraticCurveTo(X + W * 0.3, Y + H * 0.55, X + W, Y + H);
  g.fill();
  // (the shadowed side)
  g.fillStyle = shade;
  g.beginPath();
  g.moveTo(X + W * 0.02, Y);
  g.lineTo(X + W * 0.09, Y);
  g.quadraticCurveTo(X + W * 0.3, Y + H * 0.55, X + W, Y + H);
  g.lineTo(X + W * 0.25, Y + H);
  g.quadraticCurveTo(X + W * 0.08, Y + H * 0.5, X + W * 0.02, Y);
  g.fill();
  // (ridges of old lava down its flanks, the lit ones pale)
  g.lineWidth = Math.max(1, W * 0.006);
  for (let k = 0; k < 14; k++) {
    const q = (k + 0.5) / 14,
      x0 = X + W * (-0.09 + 0.18 * q),
      x1 = X + W * (-0.95 + 1.9 * q);
    g.strokeStyle = x1 < X ? 'rgba(255,220,240,0.12)' : 'rgba(10,4,20,0.25)';
    g.beginPath();
    g.moveTo(x0, Y + H * 0.05);
    g.quadraticCurveTo(X + (x1 - X) * 0.35, Y + H * 0.55, x1, Y + H);
    g.stroke();
  }
  g.fillStyle = cap;
  g.beginPath();
  g.moveTo(X - W * 0.09, Y);
  g.lineTo(X + W * 0.09, Y);
  const hem = 12;
  for (let k = 0; k <= hem; k++) {
    const q = k / hem,
      x = X + W * (0.22 - 0.44 * q),
      y = Y + H * (0.2 + (k % 2 ? 0.1 : 0.02) + 0.05 * Math.sin(k * 2.3));
    g.lineTo(x, y);
  }
  g.fill();
  // (the snow's shadowed side)
  g.fillStyle = 'rgba(80,60,140,0.25)';
  g.beginPath();
  g.moveTo(X + W * 0.02, Y);
  g.lineTo(X + W * 0.09, Y);
  g.lineTo(X + W * 0.22, Y + H * 0.22);
  g.lineTo(X + W * 0.06, Y + H * 0.26);
  g.fill();
  g.strokeStyle = cap;
  g.lineWidth = Math.max(1, W * 0.012);
  g.beginPath();
  for (let k = 0; k < 7; k++) {
    const x = X + W * (-0.16 + k * 0.05),
      y = Y + H * 0.25;
    g.moveTo(x, y);
    g.lineTo(x + (x - X) * 0.6, y + H * (0.12 + 0.1 * hash(k, 3)));
  }
  g.stroke();
}
const mountainPic = (W, body, cap, shade) =>
  pic(`fj-mount|${W}|${body}|${cap}|${shade}`, W * 2 + 4, W * 0.48 + 4, g => mountain(g, W + 2, 2, W, W * 0.48, body, cap, shade));
// the shape of a man (the cover's), standing, arms a little out: a window of blue sky cut in the cloud
function manShape(g, X, Y, h) {
  const u = h / 10;
  g.beginPath();
  g.ellipse(X, Y + 0.9 * u, 0.75 * u, 0.9 * u, 0, 0, TAU);
  g.moveTo(X - 1.2 * u, Y + 2 * u);
  g.lineTo(X + 1.2 * u, Y + 2 * u);
  g.lineTo(X + 2.6 * u, Y + 5.4 * u);
  g.lineTo(X + 2 * u, Y + 5.6 * u);
  g.lineTo(X + 1.1 * u, Y + 3.6 * u);
  g.lineTo(X + 1 * u, Y + 6 * u);
  g.lineTo(X + 0.9 * u, Y + 10 * u);
  g.lineTo(X + 0.15 * u, Y + 10 * u);
  g.lineTo(X, Y + 6.4 * u);
  g.lineTo(X - 0.15 * u, Y + 10 * u);
  g.lineTo(X - 0.9 * u, Y + 10 * u);
  g.lineTo(X - 1 * u, Y + 6 * u);
  g.lineTo(X - 1.1 * u, Y + 3.6 * u);
  g.lineTo(X - 2 * u, Y + 5.6 * u);
  g.lineTo(X - 2.6 * u, Y + 5.4 * u);
  g.closePath();
}
function sky(f) {
  const { g, v, t, mf, look } = f,
    open = dropOpen(f);
  const st = starField(v.W, v.H);
  g.globalAlpha = 0.75 + 0.25 * mf.hat;
  g.drawImage(st, 0, 0);
  g.globalAlpha = 1;
  // (a few big stars twinkling on the hats, one shooting across on a drop)
  for (let i = 0; i < 6; i++) {
    const x = hash(i, 21) * v.W,
      y = hash(i, 22) * v.H * 0.35,
      tw = 0.5 + 0.5 * Math.sin(t * (2 + i) + i * 3);
    glow(g, x, y, (2 + 3 * tw + 4 * mf.hat) * v.dpr, '#e8e0ff', 0.4 + 0.4 * tw);
  }
  // (the storm cloud over the mountain, and on a drop the window in it: blue sky and white clouds in a man's shape)
  const cx = v.W * 0.5,
    cy = v.H * 0.16,
    ch = Math.min(v.H * 0.26, v.W * 0.5);
  if (open > 0.01) {
    g.save();
    g.globalAlpha = open;
    g.fillStyle = 'rgba(20,14,30,0.85)';
    g.beginPath();
    g.ellipse(cx, cy + ch * 0.5, ch * 0.75, ch * 0.62, 0, 0, TAU);
    g.fill();
    manShape(g, cx, cy + ch * (0.5 - 0.5 * open), ch * open);
    g.clip();
    const sk = g.createLinearGradient(0, cy, 0, cy + ch);
    sk.addColorStop(0, '#3a8ae8');
    sk.addColorStop(1, '#bfe4ff');
    g.fillStyle = sk;
    g.fillRect(cx - ch, cy - ch * 0.2, ch * 2, ch * 1.4);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    for (let k = 0; k < 6; k++) {
      const x = cx + (hash(k, 31) - 0.5) * ch * 0.6 + t * 4 * v.dpr * (k % 2 ? 1 : -1) * 0.2,
        y = cy + ch * (0.1 + 0.85 * hash(k, 32));
      g.beginPath();
      g.ellipse(x, y, ch * 0.12, ch * 0.05, 0, 0, TAU);
      g.fill();
    }
    g.restore();
  }
  // (the sun coming up behind the mountain's shoulder, breathing on the voice)
  const MX = v.W * 0.5,
    MW = Math.max(v.W * 0.5, v.H * 0.42),
    MH = MW * 0.48,
    MY = v.H * 0.92 - MH - v.H * 0.2;
  // (the dawn creeping up as the song grows: the sun rising behind the shoulder with each drop)
  const dawn = 0.25 + 0.75 * (mf.grow ?? 0),
    sunY = MY + MH * (0.75 - 0.35 * dawn);
  glow(g, MX + MW * 0.42, sunY, MW * (0.35 + 0.35 * dawn), PEACH, (0.25 + 0.25 * mf.voice + 0.2 * mf.drop) * (0.5 + 0.5 * dawn));
  glow(g, MX + MW * 0.42, sunY + MH * 0.05, MW * 0.12, '#fff0d8', 0.5 + 0.4 * dawn);
  const P = steady(f),
    MW0 = sizeStep(MW),
    mp = mountainPic(MW0, mixHex(VIOLET, P.far, 0.35), mixHex(SNOW, P.sky[2], 0.12), mixHex(VIOLET, '#0a0614', 0.45)),
    mk = MW / MW0;
  g.drawImage(mp, MX - (MW0 + 2) * mk, MY - 2 * mk, mp.width * mk, mp.height * mk);
  // (its snow catching the dawn on the beat, the first light on its crown on the kick)
  glow(g, MX - MW * 0.04, MY + MH * 0.08, MW * 0.12, '#ffd0e8', 0.08 + 0.18 * mf.beat * (0.4 + 0.6 * (mf.grow ?? 0)));
  // (its spiral of steam: puffs going up and round out of the crater, the kick sending one out bigger)
  const n = 9;
  for (let k = 0; k < n; k++) {
    const u = (t * 0.12 + k / n) % 1,
      an = u * TAU * 1.5 + t * 0.3,
      r = MW * 0.03 * (1 + 4 * u) * (k === 0 ? 1 + mf.kick : 1);
    glow(g, MX + Math.cos(an) * MW * 0.06 * (1 + 3 * u), MY - u * MH * 0.9, r * 2.2, '#f4ecff', (1 - u) * (0.35 + 0.25 * mf.bass));
  }
  void look;
}

// ---- the far rows: a sea of cloud rolling, lit from below, black ridges out of it
// how far the rows stand up off the horizon (a phone's horizon sits low, under the roofs)
const lift = (f, k) => Math.max(1.2 * f.v.ppm, k * f.v.H);
function far(f) {
  const { g, v, t, mf, T } = f,
    r0 = row(f, 0.12),
    r = { ...r0, base: r0.base - lift(f, 0.16) },
    m = v.ppm,
    ridge = mixHex(CINDER, T.far, 0.3),
    lit = mixHex(PINK, T.sky[2], 0.4),
    cloud = mixHex('#e8d8f0', T.far, 0.35);
  cells(r, 9, (i, X, u) => {
    if (u < 0.45) {
      g.fillStyle = ridge;
      g.beginPath();
      g.moveTo(X, r.base - 1 * m);
      g.lineTo(X + 2.5 * m, r.base - (3.5 + 2 * u) * m);
      g.lineTo(X + 4 * m, r.base - (2.8 + u) * m);
      g.lineTo(X + 6.5 * m, r.base - 1 * m);
      g.fill();
      g.fillStyle = rgba(SNOW, 0.5);
      g.beginPath();
      g.moveTo(X + 2.5 * m, r.base - (3.5 + 2 * u) * m);
      g.lineTo(X + 3.1 * m, r.base - (2.9 + 1.6 * u) * m);
      g.lineTo(X + 2.1 * m, r.base - (3 + 1.7 * u) * m);
      g.fill();
    }
  });
  // (the cloud sea: rows of billows rolling, their undersides lit pink, heaving on the bass)
  for (let k = 0; k < 3; k++) {
    const y = r.base - (1.6 - k * 0.9) * m,
      w = (2.2 + k * 0.8) * m,
      off = (t * (0.3 + k * 0.2)) % 1;
    g.fillStyle = k === 2 ? mixHex(cloud, lit, 0.35) : cloud;
    g.beginPath();
    g.moveTo(r.L, y + 2 * m);
    // (from the row's left edge to its right, kit.js row: whole billows back from where they started)
    for (let x = -off * w - w - Math.ceil(Math.max(0, -r.L) / w) * w; x < r.R + w; x += w) {
      const hh = (0.5 + 0.4 * hash(Math.round((x + r.x0 * m) / w), k + 5)) * w * (1 + 0.1 * mf.bass);
      g.ellipse(x + w / 2, y, w * 0.62, hh * 0.45, 0, Math.PI, TAU);
    }
    g.lineTo(r.R, y + 2 * m);
    g.fill();
    g.fillStyle = rgba(lit, 0.25 + 0.2 * mf.kick);
    g.fillRect(r.L, y - 0.05 * m, r.R - r.L, 0.15 * m);
  }
  g.fillStyle = cloud;
  g.fillRect(r.L, r.base + 0.3 * m, r.R - r.L, 4 * m);
}

// ---- the near rows: a bank of black cinder, silver grass standing tall on it with plumes lit by the dawn, boulders
// capped with snow, and the snails gliding up the slope
// (a snail: a slug's foot, two eyestalks, a spiral shell on its back with its chambers' walls, shaded round, a pearl
// sheen on it; painted once (still) and stamped, its eyestalks bobbing as it bounces)
const snailPic = (m, col, shell) =>
  still(`fj-snail|${col}|${shell}`, m, 3, 2.2, 1.3, 2, (g, s) => {
    g.fillStyle = vgrad(g, -0.35 * s, 0, [[0, mixHex(col, '#ffffff', 0.2)], [1, mixHex(col, '#000000', 0.3)]]);
    g.beginPath();
    g.moveTo(-1.2 * s, 0);
    g.quadraticCurveTo(0, -0.35 * s, 1.1 * s, -0.3 * s);
    g.quadraticCurveTo(1.4 * s, -0.25 * s, 1.3 * s, 0);
    g.fill();
    g.strokeStyle = col;
    g.lineWidth = Math.max(1, 0.07 * s);
    g.beginPath();
    for (const dx of [0.05, 0.25]) {
      g.moveTo((1.05 + dx * 0.3) * s, -0.3 * s);
      g.lineTo((1.2 + dx) * s, -(0.95 + dx * 0.4) * s);
    }
    g.stroke();
    g.fillStyle = col;
    g.beginPath();
    for (const dx of [0.05, 0.25]) {
      g.moveTo((1.28 + dx) * s, -(0.95 + dx * 0.4) * s);
      g.arc((1.2 + dx) * s, -(0.95 + dx * 0.4) * s, 0.08 * s, 0, TAU);
    }
    g.fill();
    const R = 0.85 * s,
      cx = -0.1 * s,
      cy = -0.85 * s,
      gr = g.createRadialGradient(cx - R * 0.35, cy - R * 0.35, 0, cx, cy, R);
    gr.addColorStop(0, mixHex(shell, '#ffffff', 0.4));
    gr.addColorStop(0.6, shell);
    gr.addColorStop(1, mixHex(shell, '#1a0a20', 0.45));
    g.fillStyle = gr;
    g.beginPath();
    g.arc(cx, cy, R, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(26,10,20,0.55)';
    g.lineWidth = Math.max(1, 0.08 * s);
    g.beginPath();
    for (let a = 0; a < TAU * 2.6; a += 0.2) {
      const rr = R * (1 - a / (TAU * 2.9));
      g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    g.stroke();
    g.strokeStyle = 'rgba(255,240,255,0.35)';
    g.lineWidth = Math.max(1, 0.05 * s);
    g.beginPath();
    g.arc(cx, cy, R * 0.82, Math.PI * 1.1, Math.PI * 1.6);
    g.stroke();
  });
// (silver grass: a clump of long blades arching out, plumes of seed on them, dark against the dawn with their tips
// rim-lit; a boulder of black cinder capped with snow)
const nearPic = (m, kind, sz, dark, rim, plume, rock) =>
  still(`fj-near|${kind}|${sz}|${dark}|${plume}|${rock}`, m, ...(kind === 0 ? [5.2, 7.4, 1.6, 7.2] : [3.2, 3.4, 0.3, 3.2]), (g, s) => {
    if (kind === 0) {
      const h = (4 + 1.6 * sz) * s;
      // (blades arching over the way the wind goes, thin and dark, drooping at their tips)
      for (let k = 0; k < 8; k++) {
        const a = -0.2 + k * 0.09 + (hash(k, 3) - 0.5) * 0.08,
          L = h * (0.7 + 0.3 * hash(k, 4)),
          tx = Math.sin(a) * L * 1.1,
          ty = -Math.cos(a) * L;
        g.strokeStyle = dark;
        g.lineWidth = Math.max(1, 0.07 * s);
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(tx * 0.2, ty * 1.05, tx + (0.4 + 0.5 * k / 8) * s, ty * 0.92);
        g.stroke();
        g.strokeStyle = rim;
        g.lineWidth = Math.max(1, 0.025 * s);
        g.stroke();
      }
      // (its plumes: soft silver feathers of seed nodding off the tallest stems, pale against the dark)
      for (let k = 0; k < 4; k++) {
        const a = -0.12 + k * 0.13,
          L = h * (1 + 0.12 * hash(k, 9)),
          x = Math.sin(a) * L * 0.6,
          y = -L,
          bend = 0.5 + 0.2 * k;
        g.strokeStyle = dark;
        g.lineWidth = Math.max(1, 0.05 * s);
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(x * 0.3, y * 0.7, x, y);
        g.stroke();
        const gr = g.createLinearGradient(x, y, x + bend * s, y + 1.4 * s);
        gr.addColorStop(0, plume);
        gr.addColorStop(1, rgba(plume, 0.1));
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + bend * 1.1 * s, y - 0.1 * s, x + bend * s, y + 1.4 * s);
        g.quadraticCurveTo(x + bend * 0.2 * s, y + 0.6 * s, x, y);
        g.fill();
        g.strokeStyle = rim;
        g.lineWidth = Math.max(1, 0.03 * s);
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + bend * 1.1 * s, y - 0.1 * s, x + bend * s, y + 1.4 * s);
        g.stroke();
      }
    } else {
      const w = (1.4 + sz * 1.2) * s,
        h = (1 + sz * 1.3) * s;
      g.fillStyle = vgrad(g, -h, 0, [[0, mixHex(rock, '#6a4a8a', 0.25)], [1, rock]]);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(w * 0.15, -h * 0.8);
      g.lineTo(w * 0.5, -h);
      g.lineTo(w * 0.9, -h * 0.7);
      g.lineTo(w, 0);
      g.fill();
      g.fillStyle = SNOW;
      g.beginPath();
      g.moveTo(w * 0.12, -h * 0.75);
      g.lineTo(w * 0.5, -h - 0.08 * s);
      g.lineTo(w * 0.92, -h * 0.65);
      g.quadraticCurveTo(w * 0.5, -h * 0.75, w * 0.12, -h * 0.75);
      g.fill();
      g.fillStyle = 'rgba(120,100,200,0.3)';
      g.beginPath();
      g.moveTo(w * 0.5, -h - 0.08 * s);
      g.lineTo(w * 0.92, -h * 0.65);
      g.lineTo(w * 0.6, -h * 0.72);
      g.fill();
    }
  });
function near(f) {
  const { g, v, mf, t } = f,
    P = steady(f),
    r = row(f, 0.4),
    m = v.ppm,
    n = beatOf(f).n,
    base = r.base - lift(f, 0.12),
    dark = mixHex(P.near, '#06030c', 0.5),
    rim = rgba(mixHex(PINK, '#ffe0f0', 0.4), 0.8),
    plume = mixHex('#f4e4ff', P.near, 0.15),
    rock = mixHex(CINDER, P.near, 0.35),
    snailCol = mixHex('#c8b8d8', P.near, 0.35);
  // (the bank, its rim catching the dawn)
  g.fillStyle = dark;
  g.fillRect(r.L, base, r.R - r.L, 5 * m);
  g.fillStyle = rgba(PINK, 0.25 + 0.15 * mf.kick);
  g.fillRect(r.L, base, r.R - r.L, 0.05 * m);
  cells(r, 3.3, (i, X, u) => {
    const kind = u < 0.55 ? 0 : 1,
      sz = Math.floor(hash(i, 3) * 3) / 2,
      c = nearPic(m, kind, sz, dark, rim, plume, rock);
    // (the grass leaning on the bass, all its plumes one way)
    stamp(g, c, X + (kind ? 0 : 1.2 * m), base, m, 0, kind ? 0 : (Math.sin(t * 1.2 + i) * 0.06 + 0.03) * (0.5 + mf.bass));
    if (hash(i, 9) < 0.35) {
      // (a snail gliding up the slope, its shell's chambers lit in turn on the beat)
      const sx = X + 1.6 * m + ((t * 0.15) % 1) * m,
        lit = (n + i) % 4 === 0 ? mf.beat : 0,
        sc = mixHex(i % 2 ? '#e8a0c0' : '#c890e8', P.near, 0.25);
      stamp(g, snailPic(m * 0.8, snailCol, sc), sx, base, m * 0.8, 0, 0, 1 + 0.03 * mf.kick, 1 - 0.03 * mf.kick);
      glow(g, sx - 0.08 * m, base - 0.68 * m, 0.4 * m, PEACH, 0.15 + 0.5 * lit);
    }
  });
}

export const LANDMARKS = {
  // a giant spiral shell standing on the slope: a nautilus-like spiral of chambers, each lit round in turn on the beat,
  // the snail's eyestalks up over it
  shell(f) {
    const { g, v, mf } = f,
      P = steady(f);
    mark(f, 0.07, 48, 0.8, 51, (X, B, up) => {
      const m = v.ppm * 0.9,
        R = 6 * m,
        cx = X,
        cy = B - R * 0.9,
        n = beatOf(f).n,
        body = mixHex('#d8a0d0', P.far, 0.35),
        c = still(`fj-shell|${body}`, m, 20, 13.5, 7, 11, (g, s) => {
          const R = 6 * s,
            cy = -R * 0.9;
          g.fillStyle = mixHex('#b8a8c8', body, 0.3);
          g.beginPath();
          g.ellipse(3 * s, 2 * s, 9 * s, 2.4 * s, 0, Math.PI, TAU);
          g.fill();
          const gr = g.createRadialGradient(-R * 0.35, cy - R * 0.35, 0, 0, cy, R);
          gr.addColorStop(0, mixHex(body, '#ffffff', 0.45));
          gr.addColorStop(0.55, body);
          gr.addColorStop(1, mixHex(body, '#2a0a2a', 0.45));
          g.fillStyle = gr;
          g.beginPath();
          g.arc(0, cy, R, 0, TAU);
          g.fill();
          // (its chambers' walls out along a golden spiral, and the spiral itself, a pearl sheen along it)
          g.strokeStyle = 'rgba(58,26,58,0.6)';
          g.lineWidth = Math.max(1, 0.12 * s);
          g.beginPath();
          for (let k = 14; k > 0; k--) {
            const a0 = (k / 14) * TAU * 2.2,
              r0 = R * Math.exp(-0.25 * (TAU * 2.2 - a0));
            g.moveTo(Math.cos(a0) * r0 * 0.55, cy + Math.sin(a0) * r0 * 0.55);
            g.lineTo(Math.cos(a0) * r0, cy + Math.sin(a0) * r0);
          }
          g.stroke();
          g.lineWidth = Math.max(1, 0.18 * s);
          g.beginPath();
          for (let a = 0; a < TAU * 2.2; a += 0.1) {
            const rr = R * Math.exp(-0.25 * (TAU * 2.2 - a));
            g.lineTo(Math.cos(a) * rr, cy + Math.sin(a) * rr);
          }
          g.stroke();
          g.strokeStyle = 'rgba(255,240,255,0.3)';
          g.lineWidth = Math.max(1, 0.1 * s);
          g.beginPath();
          g.arc(0, cy, R * 0.9, Math.PI * 1.05, Math.PI * 1.55);
          g.stroke();
        }, 0.5);
      stamp(g, c, X, B, m, 0, 0, 1, 1, up * 0.3 + 2.4 * m);
      // (its chambers lit in turn on the beat, the one the beat is on bright)
      for (let k = 14; k > 0; k--) {
        if ((k + n) % 7 !== 0) continue;
        const a0 = (k / 14) * TAU * 2.2,
          r0 = R * Math.exp(-0.25 * (TAU * 2.2 - a0));
        glow(g, cx + Math.cos(a0) * r0 * 0.6, cy + Math.sin(a0) * r0 * 0.6, r0 * 0.6, PINK, 0.25 + 0.6 * mf.beat);
      }
      glow(g, cx, cy, R * 1.3, PEACH, 0.08 + 0.15 * mf.kick);
    });
  },
  // a rusty rocket overgrown with ivy, leaning on the slope: its rivets and porthole, its fins; on a drop its engine
  // glows and it lifts a little on its flame
  rustrocket(f) {
    const { g, v, mf, t } = f;
    mark(f, 0.08, 54, 0.75, 53, (X, B, up) => {
      const m = v.ppm * 0.9,
        lift = mf.drop * 2.5 * m,
        rust = mixHex(RUST, steady(f).far, 0.35),
        ivy = mixHex('#3a8a4a', steady(f).far, 0.35);
      g.save();
      g.translate(X, B + up * 0.4 - lift);
      g.rotate(0.18 - 0.1 * mf.drop);
      if (mf.drop > 0 || mf.build > 0.4) {
        const fl = Math.max(mf.drop, (mf.build - 0.4) * 0.6);
        glow(g, 0, 1.2 * m, 3 * m, '#ffb040', fl);
        g.fillStyle = rgba('#fff0c0', fl);
        g.beginPath();
        g.moveTo(-0.9 * m, 0.4 * m);
        g.lineTo(0, (2 + 2 * fl + Math.sin(t * 40) * 0.3) * m);
        g.lineTo(0.9 * m, 0.4 * m);
        g.fill();
      }
      // (its body: rusted plates shaded round, rivets, a porthole, fins, the ivy up it: painted once)
      const c = still(`fj-rocket|${rust}|${ivy}`, m, 6.4, 13.4, 3.2, 12.8, (g, s) => {
          const gr = g.createLinearGradient(-1.3 * s, 0, 1.3 * s, 0);
          gr.addColorStop(0, mixHex(rust, '#ffd0a0', 0.3));
          gr.addColorStop(0.45, rust);
          gr.addColorStop(1, mixHex(rust, '#1a0a06', 0.5));
          g.fillStyle = gr;
          g.beginPath();
          g.moveTo(-1.3 * s, 0);
          g.lineTo(-1.3 * s, -8 * s);
          g.quadraticCurveTo(0, -12.5 * s, 1.3 * s, -8 * s);
          g.lineTo(1.3 * s, 0);
          g.fill();
          g.fillStyle = mixHex(rust, '#000000', 0.25);
          g.beginPath();
          for (const sd of [-1, 1]) {
            g.moveTo(sd * 1.3 * s, -2.5 * s);
            g.lineTo(sd * 2.8 * s, 0.6 * s);
            g.lineTo(sd * 1.3 * s, 0);
          }
          g.fill();
          g.strokeStyle = 'rgba(40,16,6,0.45)';
          g.lineWidth = Math.max(1, 0.06 * s);
          g.beginPath();
          for (let k = 1; k < 8; k++) {
            g.moveTo(-1.3 * s, -k * s);
            g.lineTo(1.3 * s, -k * s);
          }
          g.stroke();
          g.fillStyle = 'rgba(90,42,16,0.6)';
          for (let k = 0; k < 14; k++) g.fillRect((hash(k, 5) - 0.5) * 2 * s, -hash(k, 6) * 8 * s, 0.35 * s, 0.25 * s);
          g.fillStyle = '#c8a890';
          g.beginPath();
          g.arc(0, -7 * s, 0.85 * s, 0, TAU);
          g.fill();
          g.fillStyle = '#2a1a2a';
          g.beginPath();
          g.arc(0, -7 * s, 0.7 * s, 0, TAU);
          g.fill();
          g.strokeStyle = ivy;
          g.lineWidth = Math.max(1, 0.12 * s);
          g.beginPath();
          g.moveTo(-1.3 * s, 0);
          for (let k = 1; k < 9; k++) g.lineTo(Math.sin(k * 1.4) * 1.2 * s, -k * s);
          g.stroke();
          g.fillStyle = ivy;
          g.beginPath();
          for (let k = 1; k < 9; k++) {
            const x = Math.sin(k * 1.4) * 1.2 * s + 0.25 * s;
            g.moveTo(x + 0.3 * s, -k * s);
            g.ellipse(x, -k * s, 0.3 * s, 0.18 * s, 0.6, 0, TAU);
          }
          g.fill();
        }, 0.5);
      stamp(g, c, 0, 0, m, 0, 0, 1 + 0.02 * mf.kick, 1 - 0.02 * mf.kick);
      glow(g, 0, -7 * m, 0.9 * m, '#bfe8ff', 0.3 + 0.4 * mf.beat);
      g.restore();
    });
  },
  // the echo-zeppelin: a fat airship, puffing up with the bass, rings of its echo going out on the beat
  echoship(f) {
    const { g, v, mf, T, t } = f;
    mark(f, 0.05, 60, 0.7, 57, (X, B) => {
      const m = v.ppm * 0.9,
        Y = B - 14 * m + Math.sin(t * 0.6) * 0.6 * m,
        puff = 1 + 0.08 * mf.bass + 0.06 * mf.kick,
        body = mixHex('#e8c8d8', T.far, 0.3),
        { u } = beatOf(f);
      for (let k = 0; k < 3; k++) {
        const q = (u + k) / 3;
        g.strokeStyle = rgba(PINK, 0.5 * (1 - q));
        g.lineWidth = Math.max(1, 0.12 * m);
        g.beginPath();
        g.ellipse(X, Y, (5 + 9 * q) * m, (2 + 4 * q) * m, 0, 0, TAU);
        g.stroke();
      }
      g.fillStyle = body;
      g.beginPath();
      g.ellipse(X, Y, 5.5 * m * puff, 2.2 * m * puff, 0, 0, TAU);
      g.fill();
      g.strokeStyle = rgba('#5a3a5a', 0.4);
      g.lineWidth = Math.max(1, 0.08 * m);
      g.beginPath();
      for (const k of [-0.5, 0, 0.5]) g.ellipse(X, Y, 5.5 * m * puff * Math.abs(Math.cos(k)), 2.2 * m * puff, 0, -Math.PI / 2, Math.PI / 2);
      g.stroke();
      g.fillStyle = mixHex(body, '#5a3a5a', 0.4);
      g.beginPath();
      g.moveTo(X - 5 * m, Y);
      g.lineTo(X - 7 * m, Y - 1.8 * m);
      g.lineTo(X - 6.5 * m, Y);
      g.lineTo(X - 7 * m, Y + 1.8 * m);
      g.fill();
      g.fillRect(X - 1.2 * m, Y + 2.1 * m * puff, 2.4 * m, 0.8 * m);
      g.fillStyle = rgba(PEACH, 0.6 + 0.4 * mf.beat);
      for (let k = 0; k < 4; k++) g.fillRect(X - 1 * m + k * 0.55 * m, Y + 2.25 * m * puff, 0.3 * m, 0.35 * m);
    });
  },
};

export default {
  sky,
  far,
  near,
  back(f) {
    for (const l of f.look.landmarks) LANDMARKS[l]?.(f);
    far(f);
    near(f);
  },
  // black cinder, snow lying in its hollows, glints of violet in it, and a snail's trail shimmering along the top
  ground(f, a, b, y) {
    const { g, v, mf, t } = f,
      s = slab(f, a, b, y, CINDER, '#3a2a48');
    if (!s) return;
    const m = v.ppm;
    // (snow lying in its hollows, one path; glints of violet in the cinder twinkling)
    g.fillStyle = SNOW;
    g.beginPath();
    for (let k = Math.floor(s.a / 1.6); k < s.b / 1.6; k++) {
      const X = v.sx(k * 1.6),
        u = hash(k, 71);
      if (u <= 0.45) continue;
      g.moveTo(X + (1.2 + 0.5 * u) * m, s.Y + 0.08 * m);
      g.ellipse(X + 0.8 * m, s.Y + 0.08 * m, (0.4 + 0.5 * u) * m, 0.1 * m, 0, Math.PI, TAU);
    }
    g.fill();
    g.fillStyle = 'rgba(180,140,255,0.35)';
    for (let k = Math.floor(s.a / 1.6); k < s.b / 1.6; k++) {
      const X = v.sx(k * 1.6);
      for (let j = 0; j < 5; j++) {
        const tw = 0.5 + 0.5 * Math.sin(t * 3 + k * 7 + j) + 0.8 * mf.hat * hash(k, j + 60);
        g.fillRect(X + hash(k, 72 + j) * 1.6 * m, s.Y + (0.4 + 1.8 * hash(k, 77 + j)) * m, 0.06 * m * (0.5 + tw), 0.06 * m * (0.5 + tw));
      }
    }
    // (the trail: a band of mother-of-pearl colours sliding along it, brighter on the hats; a colour at a time)
    const step = Math.floor(t * 4);
    for (let c = 0; c < 4; c++) {
      g.fillStyle = rgba(TRAIL[c], 0.22 + 0.25 * mf.hat);
      for (let k = Math.floor(s.a / 0.8); k < s.b / 0.8; k++) if ((((k + step) % 4) + 4) % 4 === c) g.fillRect(v.sx(k * 0.8), s.Y + 0.1 * m, 0.8 * m + 1, 0.07 * m);
    }
    edge(f, s, PINK);
  },
  // the pictures painted while the song loads, in its palette and its drop's (world/render.js warmWorld)
  warm(f) {
    const { v } = f,
      P = steady(f),
      MW = Math.max(v.W * 0.5, v.H * 0.42),
      dark = mixHex(P.near, '#06030c', 0.5);
    mountainPic(sizeStep(MW), mixHex(VIOLET, P.far, 0.35), mixHex(SNOW, P.sky[2], 0.12), mixHex(VIOLET, '#0a0614', 0.45));
    starField(v.W, v.H);
    for (const m of [v.ppm, v.ppm * 0.8]) {
      for (let kind = 0; kind < 2; kind++) for (let sz = 0; sz <= 1; sz += 0.5) nearPic(m, kind, sz, dark, rgba(mixHex(PINK, '#ffe0f0', 0.4), 0.8), mixHex('#f4e4ff', P.near, 0.15), mixHex(CINDER, P.near, 0.35));
      for (const c of ['#e8a0c0', '#c890e8']) snailPic(m * 0.8, mixHex('#c8b8d8', P.near, 0.35), mixHex(c, P.near, 0.25));
    }
  },
};
const TRAIL = ['#ff9ad0', '#9ad8ff', '#d8ffb0', '#ffd89a'];
