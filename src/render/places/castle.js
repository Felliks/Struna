// The castle: a gothic fortress at night under a huge moon breathing with the voice, clouds drifting over it; crags far
// off, a nearer curtain wall of battlements and pointed towers, their stained glass glowing with the bass, banners
// waving, torches flickering on the hats; bats bursting out of the towers on each snare; landmarks by the song (the keep
// with its rose window and a chandelier in its hall, a bell tower whose bell swings on the beat, a rampart of gargoyles
// whose eyes flash on the kick); flagstones underfoot, iron studs along the edge, torches in sconces under it.
import { clamp, hash, rgba } from '../util.js';
import { cells, edge, flat, glow, landmark, row, slab, tint } from './kit.js';

const MOON = '#f2ecd8',
  FIRE = ['#ffb347', '#ff7a2a', '#ffe08a'],
  GLASS = ['#c8102e', '#2a5ad8', '#e8b020', '#3aa060'];

// a torch's flame at (X, Y) on screen, licking higher on the hats
function torch(f, X, Y, m, salt) {
  const { g, mf, t } = f,
    fl = clamp(0.5 + mf.hat * 2.5 + 0.3 * Math.sin(t * 23 + salt * 3), 0, 1.6),
    h = (0.25 + 0.25 * fl) * m;
  glow(g, X, Y - h * 0.5, (0.6 + 0.6 * fl) * m, FIRE[1], 0.25 + 0.3 * fl);
  g.fillStyle = rgba(FIRE[((salt % 2) + 2) % 2], 0.85);
  g.beginPath();
  g.moveTo(X - 0.08 * m, Y);
  g.quadraticCurveTo(X + 0.05 * m * Math.sin(t * 17 + salt), Y - h * 1.4, X + 0.08 * m, Y);
  g.fill();
}
// a pointed arch window of stained glass on screen, its panes glowing with the bass (brighter as the song grows)
function stained(f, X, Y, w, h, salt) {
  const { g, mf } = f,
    a = 0.25 + 0.6 * mf.bass + 0.15 * mf.stage;
  for (let p = 0; p < 4; p++) {
    g.fillStyle = rgba(GLASS[(p + salt) % 4], a * (0.6 + 0.4 * hash(p, salt)));
    g.beginPath();
    const x0 = X - w / 2 + (p * w) / 4;
    g.moveTo(x0, Y);
    g.lineTo(x0, Y - h * 0.65);
    g.lineTo(X, Y - h);
    g.lineTo(x0 + w / 4, Y - h * 0.65);
    g.lineTo(x0 + w / 4, Y);
    g.fill();
  }
}
// battlements: merlons along a top edge at screen y Y from X0 to X1
function merlons(g, X0, X1, Y, m) {
  for (let x = X0; x < X1; x += 0.8 * m) g.fillRect(x, Y - 0.5 * m, 0.45 * m, 0.5 * m);
}

export const LANDMARKS = {
  // the keep: a great square tower between two turrets, its rose window glowing with the bass and the voice, a
  // chandelier swinging in its open hall on the beat
  keep(f) {
    const { g, v, mf, T, t, L } = f;
    landmark(f, 0.07, 60, 0.8, 21, (X, base, i) => {
      const m = v.ppm;
      g.fillStyle = T.far;
      g.fillRect(X - 3 * m, base - 10 * m, 6 * m, 10 * m);
      merlons(g, X - 3 * m, X + 3 * m, base - 10 * m, m);
      for (const dx of [-4.2, 4.2]) {
        g.fillRect(X + (dx - 0.9) * m, base - 12 * m, 1.8 * m, 12 * m);
        g.beginPath();
        g.moveTo(X + (dx - 1.1) * m, base - 12 * m);
        g.lineTo(X + dx * m, base - 15 * m);
        g.lineTo(X + (dx + 1.1) * m, base - 12 * m);
        g.fill();
      }
      const R = 1.3 * m,
        a = 0.25 + 0.5 * mf.bass + 0.3 * mf.voice;
      glow(g, X, base - 7 * m, R * 2.2, GLASS[0], 0.15 + 0.3 * a);
      for (let p = 0; p < 8; p++) {
        g.fillStyle = rgba(GLASS[p % 4], a);
        g.beginPath();
        g.moveTo(X, base - 7 * m);
        g.arc(X, base - 7 * m, R, (p * Math.PI) / 4, ((p + 1) * Math.PI) / 4);
        g.fill();
      }
      // (its stone tracery: a ring, an inner ring and the spokes)
      g.strokeStyle = rgba('#05040a', 0.8);
      g.lineWidth = 0.1 * m;
      g.beginPath();
      g.arc(X, base - 7 * m, R, 0, Math.PI * 2);
      g.moveTo(X + R * 0.35, base - 7 * m);
      g.arc(X, base - 7 * m, R * 0.35, 0, Math.PI * 2);
      for (let p = 0; p < 8; p++) {
        g.moveTo(X + Math.cos((p * Math.PI) / 4) * R * 0.35, base - 7 * m + Math.sin((p * Math.PI) / 4) * R * 0.35);
        g.lineTo(X + Math.cos((p * Math.PI) / 4) * R, base - 7 * m + Math.sin((p * Math.PI) / 4) * R);
      }
      g.stroke();
      // its hall's arch, a chandelier swinging in it
      g.fillStyle = rgba(FIRE[0], 0.15 + 0.2 * mf.beat);
      g.fillRect(X - 1 * m, base - 3.4 * m, 2 * m, 3.4 * m);
      const sw = Math.sin((t / L.A.beat) * Math.PI) * 0.25,
        cx = X + Math.sin(sw) * 2 * m,
        cy = base - 3.4 * m + Math.cos(sw) * 1.8 * m;
      g.strokeStyle = rgba('#000000', 0.7);
      g.lineWidth = v.dpr;
      g.beginPath();
      g.moveTo(X, base - 3.4 * m);
      g.lineTo(cx, cy);
      g.stroke();
      for (let c = -2; c <= 2; c++) glow(g, cx + c * 0.25 * m, cy, 0.25 * m, FIRE[2], 0.5 + 0.4 * mf.hat * 2);
    });
  },
  // a bell tower: a slender belfry, its bell swinging over on each beat, a glow at its mouth on the downbeat
  belltower(f) {
    const { g, v, mf, T, t, L } = f;
    landmark(f, 0.13, 40, 0.75, 22, (X, base) => {
      const m = v.ppm,
        top = base - 11 * m;
      g.fillStyle = T.far;
      g.fillRect(X - 1.1 * m, top, 2.2 * m, 11 * m);
      g.beginPath();
      g.moveTo(X - 1.4 * m, top);
      g.lineTo(X, top - 4 * m);
      g.lineTo(X + 1.4 * m, top);
      g.fill();
      g.fillStyle = rgba('#000000', 0.6);
      g.fillRect(X - 0.75 * m, top + 0.4 * m, 1.5 * m, 1.8 * m);
      const sw = Math.sin((t / L.A.beat) * Math.PI) * 0.7;
      g.save();
      g.translate(X, top + 0.5 * m);
      g.rotate(sw);
      g.fillStyle = '#b08a3a';
      g.beginPath();
      g.moveTo(-0.15 * m, 0);
      g.quadraticCurveTo(-0.3 * m, 0.7 * m, -0.6 * m, 1.1 * m);
      g.lineTo(0.6 * m, 1.1 * m);
      g.quadraticCurveTo(0.3 * m, 0.7 * m, 0.15 * m, 0);
      g.fill();
      g.restore();
      glow(g, X, top + 1.6 * m, (0.8 + 1.2 * mf.down) * m, FIRE[2], 0.15 + 0.5 * mf.down);
    });
  },
  // a rampart lined with gargoyles crouched on its corbels, their eyes flashing on the kick
  rampart(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.25, 22, 0.7, 23, (X, base) => {
      const m = v.ppm,
        Y = base - 4.5 * m;
      g.fillStyle = T.far;
      g.fillRect(X - 6 * m, Y, 12 * m, 4.5 * m);
      merlons(g, X - 6 * m, X + 6 * m, Y, m);
      for (const dx of [-4, 0, 4]) {
        const gx = X + dx * m;
        g.beginPath();
        g.moveTo(gx - 0.5 * m, Y);
        g.lineTo(gx - 0.35 * m, Y - 0.9 * m);
        g.lineTo(gx - 0.2 * m, Y - 0.6 * m);
        g.lineTo(gx + 0.2 * m, Y - 0.6 * m);
        g.lineTo(gx + 0.35 * m, Y - 0.9 * m);
        g.lineTo(gx + 0.5 * m, Y);
        g.fill();
        for (const ex of [-0.12, 0.12]) glow(g, gx + ex * m, Y - 0.4 * m, (0.1 + 0.2 * mf.kick) * m, '#ff2b3a', 0.5 + 0.5 * mf.kick);
      }
    });
  },
};

// a curtain wall at parallax par: battlements, towers with pointed roofs and stained glass, banners and torches
function wall(f, par, col, hmul) {
  const { g, v, mf, t } = f,
    r = row(f, par),
    m = v.ppm,
    top = r.base - 3.2 * hmul * m;
  g.fillStyle = col;
  g.fillRect(r.L, top, r.R - r.L, v.H * 2);
  // (from the row's left edge to its right, kit.js row)
  merlons(g, -((r.x0 * m) % (0.8 * m)) - 0.8 * m - Math.ceil(Math.max(0, -r.L) / (0.8 * m)) * 0.8 * m, r.R + m, top, m);
  cells(r, 7, (i, X) => {
    if (hash(i, 31 + par * 10) > 0.6) return;
    const h = (5 + 4 * hash(i, 32)) * hmul * m,
      w = 1.8 * m;
    g.fillStyle = col;
    g.fillRect(X - w / 2, r.base - h, w, h);
    g.beginPath();
    g.moveTo(X - w * 0.65, r.base - h);
    g.lineTo(X, r.base - h - 2.4 * hmul * m);
    g.lineTo(X + w * 0.65, r.base - h);
    g.fill();
    stained(f, X, r.base - h + 2.2 * hmul * m, 0.7 * m, 1.6 * hmul * m, ((i % 4) + 4) % 4);
    // a banner off its roof, waving with the bass
    const wave = Math.sin(t * 3 + i) * (0.2 + 0.4 * mf.bass) * m;
    g.fillStyle = rgba(GLASS[((i % 2) + 2) % 2], 0.75);
    g.beginPath();
    g.moveTo(X + 0.6 * m, r.base - h + 0.3 * m);
    g.lineTo(X + 0.6 * m + wave * 0.3, r.base - h + 2.2 * m);
    g.lineTo(X + 0.95 * m + wave, r.base - h + 1.8 * m);
    g.lineTo(X + 1.2 * m + wave * 0.6, r.base - h + 0.3 * m);
    g.fill();
    torch(f, X - w * 0.8, top + 1.2 * m, m * 0.8, i);
  });
  return r;
}

// bats bursting out of the towers on each snare, flapping off across the moon
function bats(f) {
  // (across the screen, not in a row's frame)
  flat(f);
  const { g, v, mf, t } = f,
    n = Math.round(4 + 22 * mf.snare * (0.5 + 0.5 * mf.amp)),
    m = v.ppm;
  g.fillStyle = tint(f, '#0a0610', f.T.near, 0.2);
  for (let k = 0; k < n; k++) {
    const u = (t * (0.25 + 0.3 * hash(k, 2)) + hash(k, 3)) % 1,
      X = (hash(k, 5) * v.W + u * v.W * (hash(k, 6) < 0.5 ? 0.6 : -0.6) + v.W) % v.W,
      Y = v.H * (0.7 - 0.6 * u) + Math.sin(t * 5 + k) * 0.4 * m,
      s = (0.25 + 0.2 * hash(k, 7)) * m,
      flap = Math.sin(t * 22 + k * 1.7) * 0.5 * s;
    g.beginPath();
    g.moveTo(X - s, Y - flap);
    g.quadraticCurveTo(X - s * 0.5, Y + s * 0.1, X, Y + s * 0.2);
    g.quadraticCurveTo(X + s * 0.5, Y + s * 0.1, X + s, Y - flap);
    g.lineTo(X, Y - s * 0.15);
    g.fill();
  }
}

// the far rows: the crags far off, the bats over them
function far(f) {
  const { g, v, T } = f;
  // the crags far off
  const r = row(f, 0.04);
  g.fillStyle = tint(f, '#0c0a14', T.far, 0.6);
  g.beginPath();
  g.moveTo(-v.W, v.H * 2);
  cells(r, 3, (i, X) => g.lineTo(X, r.base - (2 + 5 * hash(i, 41)) * v.ppm));
  g.lineTo(v.W * 2, v.H * 2);
  g.fill();
  bats(f);
}
// the near rows: the curtain wall of battlements and towers
function near(f) {
  wall(f, 0.35, tint(f, '#120e18', f.T.near, 0.6), 1);
}

export default {
  sky(f) {
    const { g, v, mf, t } = f,
      X = v.W * 0.68,
      Y = v.H * 0.3,
      R = v.ppm * (3 + 0.15 * mf.bass + 0.25 * mf.voice);
    // the huge moon, its halo swelling with the voice, its seas on its face
    glow(g, X, Y, R * (2.4 + 0.8 * mf.voice), MOON, 0.18 + 0.12 * mf.kick + 0.25 * mf.voice);
    g.fillStyle = MOON;
    g.beginPath();
    g.arc(X, Y, R, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(120,110,90,0.25)';
    for (const [dx, dy, r] of [[-0.3, -0.2, 0.28], [0.25, 0.1, 0.2], [-0.05, 0.4, 0.15], [0.35, -0.35, 0.1]]) {
      g.beginPath();
      g.arc(X + dx * R, Y + dy * R, r * R, 0, Math.PI * 2);
      g.fill();
    }
    // clouds drifting over it
    for (let k = 0; k < 4; k++) {
      const cx = ((t * 0.02 * (1 + k * 0.4) + hash(k, 9)) % 1.4) * v.W * 1.2 - v.W * 0.3,
        cy = v.H * (0.18 + 0.12 * k);
      g.fillStyle = rgba('#05040a', 0.35);
      g.beginPath();
      g.ellipse(cx, cy, v.W * 0.14, v.ppm * 0.45, 0, 0, Math.PI * 2);
      g.fill();
    }
  },
  back(f) {
    far(f);
    for (const l of f.look.landmarks) LANDMARKS[l]?.(f);
    near(f);
  },
  far,
  near,
  ground(f, a, b, y) {
    const { g, v, mf, T } = f,
      s = slab(f, a, b, y, tint(f, '#2a2630', T.near, 0.4), tint(f, '#4a4450', T.far, 0.3));
    if (!s) return;
    const m = v.ppm;
    // the flagstones: courses of blocks, their joints lit faintly on the kick
    g.fillStyle = rgba(T.line, 0.1 + 0.25 * mf.kick);
    for (let r = 0; r < 4; r++) {
      g.fillRect(s.X0, s.Y + (0.6 + r * 0.7) * m, s.X1 - s.X0, 0.04 * m);
      for (let k = Math.floor(s.a / 1.2); k < s.b / 1.2; k++) g.fillRect(v.sx(k * 1.2 + (r % 2) * 0.6), s.Y + (0.6 + (r - 1) * 0.7) * m, 0.04 * m, 0.7 * m);
    }
    // iron studs along the edge, catching the beat
    g.fillStyle = rgba('#9aa0a8', 0.4 + 0.5 * mf.beat);
    for (let k = Math.ceil(s.a / 0.5); k < s.b / 0.5; k++) g.fillRect(v.sx(k * 0.5) - 0.04 * m, s.Y + 0.28 * m, 0.08 * m, 0.08 * m);
    // torches in sconces in the face, every few metres
    for (let k = Math.ceil(s.a / 4); k < s.b / 4; k++) {
      const X = v.sx(k * 4 + 2);
      g.fillStyle = '#1a1414';
      g.fillRect(X - 0.06 * m, s.Y + 1.6 * m, 0.12 * m, 0.4 * m);
      torch(f, X, s.Y + 1.6 * m, m, k);
    }
    edge(f, s, FIRE[0]);
  },
};
