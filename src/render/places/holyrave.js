// Holy Rave (after ATL's "Священный рейв", "Шаман", "Стоунхендж"; world/artists.js): a rite of a rave on rings of
// stone floating in a sky of radio static, all acid neon. Over it a shaman's drum hangs for a moon, its skin booming in
// on the kick and its spiral turning a step on the beat, bands of a lost signal drifting across the sky; far off,
// islands of rock adrift, their roots trailing, standing stones on them whose faces are speaker cones pushed by the
// bass; near, a ring of tall standing stones carved with rings of made-up glyphs (no runes, no symbol of any faith)
// lit in turn on the beat, ribbons strung between them lifting on the kick, orbs of light drifting; beams fanning up
// from the stones on the kick; underfoot a path of stone slabs, their glyph cells lit under him and in a wave on the
// kick. Landmarks by the song: a great ring of stones turning in the air with a beam up through it, two cartoon
// skeletons drumming on a floating rock, and a perpetual motion machine of gears and speakers as tall as the sky.
import { hash, mixHex, rgba } from '../util.js';
import { cells, edge, glow, landmark, pic, row, slab, stamp, steady, still, vgrad } from './kit.js';

const TAU = Math.PI * 2,
  ACID = ['#3dff6a', '#ff2fd0', '#6a2cff', '#9dff3a'];

const beatOf = f => {
  const b = f.t / f.L.A.beat;
  return { n: Math.floor(b), u: b - Math.floor(b) };
};
const notch = (f, q = 3) => {
  const { n, u } = beatOf(f),
    k = Math.min(1, u * q);
  return n + k * k * (3 - 2 * k);
};
function light(g, draw) {
  g.save();
  g.globalCompositeOperation = 'lighter';
  draw();
  g.restore();
}
// a landmark standing up from the far horizon (a phone's horizon sits low)
function mark(f, par, every, chance, salt, draw) {
  const up = Math.max(1.6 * f.v.ppm, 0.2 * f.v.H);
  landmark(f, par, every, chance, salt, (X, base, i) => draw(X, base - up, up, i));
}
// a floating rock: a flat top, a jagged underside tapering to a point, roots hanging off it swaying
function rock(g, X, Y, w, d, m, t, col, i) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(X - w / 2, Y);
  g.lineTo(X + w / 2, Y);
  g.lineTo(X + w * 0.32, Y + d * 0.45);
  g.lineTo(X + w * 0.1, Y + d);
  g.lineTo(X - w * 0.15, Y + d * 0.6);
  g.lineTo(X - w * 0.38, Y + d * 0.35);
  g.fill();
  g.strokeStyle = col;
  g.lineWidth = Math.max(1, 0.04 * m);
  g.beginPath();
  for (let k = 0; k < 4; k++) {
    const x = X + (hash(k, i) - 0.5) * w * 0.6,
      y = Y + d * (0.4 + 0.3 * hash(k, i + 3));
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.sin(t + k) * 0.2 * m, y + 0.8 * m, x + Math.sin(t * 0.8 + k) * 0.3 * m, y + (1.4 + hash(k, i + 5)) * m);
  }
  g.stroke();
}

// (a strip of a lost signal's snow: white specks on clear, painted once, four of them)
const staticPic = k =>
  pic(`hr-static|${k}`, 256, 16, g => {
    g.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 40; i++) g.fillRect(Math.floor(hash(i, k * 3 + 1) * 256), Math.floor(hash(i, k * 3 + 2) * 16), 2, 1);
  });
// ---- the sky: bands of static drifting, and a shaman's drum for a moon
function sky(f) {
  const { g, v, mf, t, T } = f,
    fr = Math.floor(t * 12);
  // (each band a wash of colour and the snow of a lost signal in it: one of four painted strips of snow, swapped
  // twelve times a second)
  for (let k = 0; k < 7; k++) {
    const y = ((hash(k, 3) * v.H * 0.7 + t * (6 + 8 * hash(k, 4)) * v.dpr) % (v.H * 0.75)),
      h = (6 + 30 * hash(k, 5)) * v.dpr;
    g.fillStyle = rgba(k % 2 ? T.win[2] : T.win[0], 0.04 + 0.04 * mf.hat);
    g.fillRect(0, y, v.W, h);
    g.drawImage(staticPic((fr + k) & 3), 0, y, v.W, h);
  }
  const R = Math.min(v.W, v.H) * 0.17,
    X = v.W * 0.3,
    Y = v.H * 0.24,
    wood = mixHex('#8a5a2a', T.sky[1], 0.25),
    skin = mixHex('#efe2bf', T.sky[2], 0.15),
    boom = 1 - 0.05 * mf.kick;
  glow(g, X, Y, R * 2.4, T.win[0], 0.18 + 0.15 * mf.kick + 0.1 * mf.voice);
  g.fillStyle = wood;
  g.beginPath();
  g.arc(X, Y, R * 1.08, 0, TAU);
  g.fill();
  g.fillStyle = skin;
  g.beginPath();
  g.ellipse(X, Y, R * boom, R * boom, 0, 0, TAU);
  g.fill();
  // (the dent of the beater on the kick: a shade in the skin)
  g.fillStyle = rgba('#5a3a1a', 0.18 * mf.kick);
  g.beginPath();
  g.arc(X + R * 0.15, Y + R * 0.1, R * 0.45, 0, TAU);
  g.fill();
  // (its spiral, painted, a step on the beat)
  g.strokeStyle = mixHex('#c81e1e', T.win[1], 0.3);
  g.lineWidth = R * 0.05;
  g.beginPath();
  const rot = notch(f) * 0.5;
  for (let a = 0; a < TAU * 2.4; a += 0.15) {
    const r = R * (0.05 + a * 0.058);
    g.lineTo(X + Math.cos(a + rot) * r, Y + Math.sin(a + rot) * r);
  }
  g.stroke();
  g.fillStyle = '#e0b040';
  g.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU,
      x = X + Math.cos(a) * R * 1.04,
      y = Y + Math.sin(a) * R * 1.04;
    g.moveTo(x + R * 0.07, y);
    g.arc(x, y, R * 0.07, 0, TAU);
  }
  g.fill();
  // (its ribbons hanging off its rim)
  for (let k = 0; k < 4; k++) {
    g.strokeStyle = rgba(ACID[k], 0.8);
    g.lineWidth = R * 0.04;
    g.beginPath();
    const x0 = X + (k - 1.5) * R * 0.35,
      y0 = Y + R;
    g.moveTo(x0, y0);
    for (let q = 1; q <= 6; q++) g.lineTo(x0 + Math.sin(t * 2 + q + k) * R * 0.08, y0 + q * R * 0.22);
    g.stroke();
  }
}

// ---- far: islands of rock adrift, speaker-faced standing stones on them
// how far the rows stand up off the horizon (a phone's horizon sits low, under the roofs)
const lift = (f, k) => Math.max(1.2 * f.v.ppm, k * f.v.H);
function far(f) {
  const { g, v, mf, T, t } = f,
    r0 = row(f, 0.12),
    r = { ...r0, base: r0.base - lift(f, 0.16) },
    m = v.ppm,
    col = mixHex(T.far, '#6a6a7c', 0.35);
  cells(r, 7, (i, X, u) => {
    const Y = r.base - (3 + 4 * hash(i, 3)) * m + Math.sin(t * 0.5 + i) * 0.25 * m,
      w = (3 + 2 * u) * m;
    rock(g, X, Y, w, 2.2 * m, m, t, col, i);
    for (let k = 0; k < 2; k++) {
      const sx = X + (k ? 0.6 : -0.6) * w * 0.4,
        sh = (1.6 + 0.6 * hash(i, k + 7)) * m;
      g.fillStyle = col;
      g.fillRect(sx - 0.35 * m, Y - sh, 0.7 * m, sh);
      g.fillStyle = mixHex(col, '#000000', 0.45);
      g.beginPath();
      g.arc(sx, Y - sh * 0.55, (0.24 + 0.06 * mf.bass) * m, 0, TAU);
      g.fill();
      glow(g, sx, Y - sh * 0.55, 0.4 * m, ACID[(((i + k) % 4) + 4) % 4], 0.25 + 0.5 * mf.kick);
    }
  });
}

// ---- near: the ring of stones, ribbons strung between them, orbs adrift (lifted over the roofs: a phone's horizon
// sits under them)
// (a standing stone: rough-hewn, lit cold from the rave on one side, lichen on it, its ring of made-up glyphs cut in it
// dim (lit over it on the beat); a lintel across the top of some; painted once)
const stonePic = (m, sz, lintel, stone) =>
  still(`hr-stone|${sz}|${lintel}|${stone}`, m, 3.6, 6.4, 0.9, 6.2, (g, s) => {
    const h = (3.6 + 2 * sz) * s,
      w = (1.1 + 0.3 * sz) * s;
    g.fillStyle = vgrad(g, -h, 0, [[0, mixHex(stone, '#9aa0c0', 0.25)], [1, mixHex(stone, '#000000', 0.4)]]);
    g.beginPath();
    g.moveTo(-w / 2, 0);
    g.lineTo(-w * 0.45, -h + 0.2 * s);
    g.lineTo(-w * 0.1, -h);
    g.lineTo(w * 0.45, -h + 0.35 * s);
    g.lineTo(w / 2, 0);
    g.fill();
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.beginPath();
    g.moveTo(w * 0.15, -h + 0.1 * s);
    g.lineTo(w * 0.45, -h + 0.35 * s);
    g.lineTo(w / 2, 0);
    g.lineTo(w * 0.2, 0);
    g.fill();
    g.fillStyle = 'rgba(120,200,120,0.18)';
    g.beginPath();
    for (let k = 0; k < 8; k++) {
      const x = (hash(k, 3) - 0.5) * w * 0.8,
        y = -h * (0.1 + 0.8 * hash(k, 4));
      g.moveTo(x + 0.12 * s, y);
      g.arc(x, y, 0.12 * s, 0, TAU);
    }
    g.fill();
    const cy = -h * 0.55;
    g.strokeStyle = 'rgba(0,0,0,0.45)';
    g.lineWidth = Math.max(1, 0.06 * s);
    g.beginPath();
    g.arc(0, cy, 0.3 * s, 0, TAU);
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * TAU,
        hh = hash(j, 7);
      g.moveTo(Math.cos(a) * 0.38 * s, cy + Math.sin(a) * 0.38 * s);
      g.lineTo(Math.cos(a + hh - 0.5) * (0.5 + 0.1 * hh) * s, cy + Math.sin(a + hh - 0.5) * (0.5 + 0.1 * hh) * s);
    }
    g.stroke();
    if (lintel) {
      g.fillStyle = vgrad(g, -h - 0.35 * s, -h + 0.1 * s, [[0, mixHex(stone, '#9aa0c0', 0.3)], [1, mixHex(stone, '#000000', 0.3)]]);
      g.fillRect(-w * 0.6, -h - 0.3 * s, w * 2.6, 0.42 * s);
    }
  });
function near(f) {
  const { g, v, mf, T, t } = f,
    P = steady(f),
    r0 = row(f, 0.4),
    r = { ...r0, base: r0.base - lift(f, 0.12) },
    m = v.ppm,
    { n } = beatOf(f),
    stone = mixHex('#4a4a5c', P.near, 0.3),
    tops = [];
  // (the hill they stand on, its edge lit by the rave)
  g.fillStyle = mixHex('#14141e', P.near, 0.3);
  g.fillRect(r.L, r.base, r.R - r.L, 5 * m);
  g.fillStyle = rgba(T.line, 0.25 + 0.3 * mf.kick);
  g.fillRect(r.L, r.base, r.R - r.L, 0.05 * m);
  g.strokeStyle = rgba(T.line, 0.35 + 0.3 * mf.kick);
  g.lineWidth = Math.max(1, 0.05 * m);
  cells(r, 2.8, (i, X, u) => {
    const sz = Math.floor(u * 3) / 2,
      h = (3.6 + 2 * sz) * m;
    stamp(g, stonePic(m, sz, u < 0.3, stone), X, r.base, m);
    // (its ring of glyphs, lit as the beat goes round the stones)
    const lit = ((i % 5) + 5) % 5 === n % 5,
      on = lit ? 0.5 + 0.5 * mf.beat : 0.15 + 0.1 * mf.kick,
      cy = r.base - h * 0.55,
      col = ACID[((i % 4) + 4) % 4];
    glow(g, X, cy, 0.8 * m, col, on * 0.6);
    if (lit) {
      g.strokeStyle = rgba(col, 0.4 + 0.6 * on);
      g.beginPath();
      g.arc(X, cy, 0.3 * m, 0, TAU);
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * TAU,
          hh = hash(j, 7);
        g.moveTo(X + Math.cos(a) * 0.38 * m, cy + Math.sin(a) * 0.38 * m);
        g.lineTo(X + Math.cos(a + hh - 0.5) * (0.5 + 0.1 * hh) * m, cy + Math.sin(a + hh - 0.5) * (0.5 + 0.1 * hh) * m);
      }
      g.stroke();
    }
    tops.push(X, r.base - h * 0.9);
  });
  // (ribbons from stone to stone, lifting on the kick, a colour each: one path a colour)
  g.lineWidth = Math.max(1, 0.06 * m);
  for (let c = 0; c < 4; c++) {
    g.strokeStyle = rgba(ACID[c], 0.7);
    g.beginPath();
    for (let k = c * 2; k + 3 < tops.length; k += 8) {
      const ax = tops[k],
        ay = tops[k + 1],
        bx = tops[k + 2],
        by = tops[k + 3];
      g.moveTo(ax, ay);
      g.quadraticCurveTo((ax + bx) / 2, Math.max(ay, by) + (0.9 - 0.6 * mf.kick) * m, bx, by);
    }
    g.stroke();
  }
  // (orbs adrift over the ring)
  for (let k = 0; k < 9; k++) {
    // (across the row's frame, kit.js row)
    const x = r.L + (((hash(k, 21) * v.W - r.x0 * m * 0.3 + t * 8 * v.dpr) % (r.R - r.L)) + (r.R - r.L)) % (r.R - r.L),
      y = r.base - (3 + 3 * hash(k, 22)) * m + Math.sin(t * 1.3 + k) * 0.4 * m;
    glow(g, x, y, (0.25 + 0.1 * mf.hat) * m, ACID[k % 4], 0.5 + 0.3 * mf.hat);
  }
}
// over the rows: beams fanning up from the stones on the kick
function after(f) {
  const { g, v, mf, T, t } = f,
    r0 = row(f, 0.4),
    r = { base: r0.base - lift(f, 0.12) };
  light(g, () => {
    const k = 0.3 + 0.7 * Math.max(mf.kick, mf.drop > 0 ? 0.5 : 0);
    g.lineWidth = Math.max(1, 1.5 * v.dpr);
    for (let c = 0; c < 2; c++) {
      g.strokeStyle = rgba(c ? T.win[0] : T.win[1], 0.3 * k);
      g.beginPath();
      for (let s = 0; s < 3; s++) {
        const ox = v.W * (0.15 + 0.35 * s),
          oy = r.base - 1.5 * v.ppm;
        for (let j = c; j < 4; j += 2) {
          const an = -Math.PI / 2 + Math.sin(t * 0.6 + s * 2) * 0.5 + (j - 1.5) * 0.14;
          g.moveTo(ox, oy);
          g.lineTo(ox + Math.cos(an) * v.H * 1.2, oy + Math.sin(an) * v.H * 1.2);
        }
      }
      g.stroke();
    }
  });
}

export const LANDMARKS = {
  // a great ring of stones floating in the air, turning, the near stones over the far, a beam of light up through it on
  // the kick and the stones flaring in turn on the beat
  stonering(f) {
    const { g, v, mf, T, t } = f;
    mark(f, 0.07, 46, 0.75, 51, (X, B) => {
      const m = v.ppm * 0.9,
        cy = B - 7 * m + Math.sin(t * 0.4) * 0.4 * m,
        col = mixHex(T.far, '#5a5a68', 0.25),
        n = 14,
        rot = t * 0.15,
        lit = beatOf(f).n % n;
      light(g, () => {
        g.fillStyle = rgba(T.win[0], 0.08 + 0.18 * mf.kick);
        g.beginPath();
        g.moveTo(X - 2 * m, cy);
        g.lineTo(X - 0.6 * m, -10 * m);
        g.lineTo(X + 0.6 * m, -10 * m);
        g.lineTo(X + 2 * m, cy);
        g.fill();
      });
      rock(g, X, cy + 0.6 * m, 13 * m, 3 * m, m, t, mixHex(col, T.near, 0.3), 77);
      const order = [...Array(n).keys()].sort((a, b) => Math.sin(rot + (a / n) * TAU) - Math.sin(rot + (b / n) * TAU));
      for (const k of order) {
        const an = rot + (k / n) * TAU,
          depth = Math.sin(an),
          x = X + Math.cos(an) * 5.5 * m,
          y = cy + depth * 0.8 * m,
          sc = 0.8 + 0.2 * depth,
          h = 2.8 * m * sc,
          w = 0.75 * m * sc;
        g.fillStyle = depth < 0 ? mixHex(col, T.sky[2], 0.25) : col;
        g.fillRect(x - w / 2, y - h, w, h);
        if (k % 2 === 0) g.fillRect(x - w / 2, y - h - 0.35 * m * sc, w * 2.5, 0.35 * m * sc);
        if (k === lit || mf.kick > 0.3) glow(g, x, y - h * 0.5, 0.9 * m, ACID[k % 4], k === lit ? 0.4 + 0.6 * mf.beat : 0.25 * mf.kick);
      }
    });
  },
  // two cartoon skeletons drumming on a far stage (the covers of the DRUMTAPEs): sticks down on the kick and the snare,
  // a cymbal shivering on the hats, a spotlight on them, on a rock adrift
  skulldrums(f) {
    const { g, v, mf, T } = f;
    mark(f, 0.09, 40, 0.75, 55, (X, B) => {
      const m = v.ppm * 0.9,
        bone = '#f0ece4',
        col = mixHex(T.far, T.sky[2], 0.2);
      // (the stage, its spot)
      g.fillStyle = col;
      rock(g, X, B - 1.2 * m, 13 * m, 3.4 * m, m, f.t, col, 55);
      light(g, () => {
        g.fillStyle = rgba(T.win[0], 0.1 + 0.1 * mf.kick);
        g.beginPath();
        g.moveTo(X, B - 14 * m);
        g.lineTo(X - 6 * m, B - 1.2 * m);
        g.lineTo(X + 6 * m, B - 1.2 * m);
        g.fill();
      });
      for (const s of [-1, 1]) {
        const cx = X + s * 2.6 * m,
          y = B - 1.2 * m,
          hit = s < 0 ? mf.kick : mf.snare;
        // (the kit: a bass drum, a snare, a cymbal on its stand)
        g.fillStyle = mixHex('#2a2a34', col, 0.3);
        g.beginPath();
        g.arc(cx, y - 1.1 * m, 1.1 * m * (1 + 0.04 * mf.kick), 0, TAU);
        g.fill();
        g.strokeStyle = rgba(T.win[1], 0.6 + 0.4 * mf.kick);
        g.lineWidth = 0.12 * m;
        g.stroke();
        g.strokeStyle = '#c9a24a';
        g.lineWidth = 0.1 * m;
        g.beginPath();
        g.moveTo(cx + s * 1.6 * m, y - 3.4 * m + Math.sin(f.t * 40) * mf.hat * 0.15 * m);
        g.lineTo(cx + s * 2.6 * m, y - 3.6 * m - Math.sin(f.t * 40) * mf.hat * 0.15 * m);
        g.stroke();
        // (the drummer: a skull, a rib cage, arms with sticks, down on its hit)
        g.strokeStyle = bone;
        g.fillStyle = bone;
        g.lineWidth = 0.14 * m;
        const sy = y - 4.2 * m;
        g.beginPath();
        g.moveTo(cx - s * 0.4 * m, sy + 0.6 * m);
        g.lineTo(cx - s * 0.4 * m, sy + 2.4 * m);
        g.stroke();
        for (let k = 0; k < 3; k++) {
          g.beginPath();
          g.moveTo(cx - s * 0.4 * m - 0.45 * m, sy + (1 + k * 0.35) * m);
          g.lineTo(cx - s * 0.4 * m + 0.45 * m, sy + (1 + k * 0.35) * m);
          g.stroke();
        }
        g.beginPath();
        g.arc(cx - s * 0.4 * m, sy, 0.55 * m, 0, TAU);
        g.fill();
        g.fillStyle = '#0a0a10';
        for (const e of [-0.2, 0.2]) {
          g.beginPath();
          g.arc(cx - s * 0.4 * m + e * m, sy - 0.05 * m, 0.14 * m, 0, TAU);
          g.fill();
        }
        g.fillStyle = bone;
        for (const arm of [-1, 1]) {
          const ax = cx - s * 0.4 * m + arm * 0.5 * m,
            ay = sy + 1 * m,
            hx = ax + arm * 0.5 * m + s * 0.5 * m,
            hy = ay + (0.3 + 0.7 * hit) * m;
          g.beginPath();
          g.moveTo(ax, ay);
          g.lineTo(hx, hy);
          g.lineTo(hx + s * 0.9 * m, hy - (0.9 - 1.4 * hit) * m);
          g.stroke();
        }
      }
    });
  },
  // a perpetual motion machine as tall as the sky (after "Вечный двигатель"): gears in a tower, each turning a tooth on
  // every beat the other way from the next, speaker cones in their hubs pushed by the bass, a wheel of weights at its
  // top flopping over for ever
  perpetuum(f) {
    const { g, v, mf, T } = f;
    mark(f, 0.06, 50, 0.75, 57, (X, B, up) => {
      const m = v.ppm * 0.9,
        col = mixHex(T.far, '#6a4a2a', 0.3),
        step = (notch(f) * TAU) / 16;
      g.fillStyle = col;
      g.fillRect(X - 0.6 * m, B - 16 * m, 1.2 * m, 16 * m + up);
      const gears = [[0, -3, 2.2], [1.8, -6.5, 1.6], [-1.6, -9, 1.8], [0.6, -12.2, 1.4]];
      gears.forEach(([gx, gy, R], k) => {
        const cx = X + gx * m,
          cy = B + gy * m,
          a = step * (k % 2 ? -1 : 1) * (2.2 / R);
        g.fillStyle = col;
        g.beginPath();
        for (let i = 0; i < 32; i++) {
          const an = a + (i / 32) * TAU,
            rr = (i % 2 ? R : R * 0.84) * m;
          g.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr);
        }
        g.fill();
        g.fillStyle = mixHex(col, '#000000', 0.5);
        g.beginPath();
        g.arc(cx, cy, R * 0.5 * m * (1 + 0.06 * mf.bass), 0, TAU);
        g.fill();
        glow(g, cx, cy, R * 0.4 * m, ACID[k % 4], 0.25 + 0.45 * mf.kick);
      });
      const wy = B - 15 * m;
      g.strokeStyle = col;
      g.lineWidth = 0.15 * m;
      g.beginPath();
      g.arc(X, wy, 2.4 * m, 0, TAU);
      g.stroke();
      for (let k = 0; k < 8; k++) {
        const an = step * 0.5 + (k * TAU) / 8,
          ex = X + Math.cos(an) * 2.4 * m,
          ey = wy + Math.sin(an) * 2.4 * m,
          out = Math.cos(an) > 0 ? 1 : 0.3;
        g.fillStyle = col;
        g.beginPath();
        g.arc(ex + Math.cos(an) * 0.7 * m * out, ey + Math.sin(an) * 0.7 * m * out + (1 - out) * 0.4 * m, 0.3 * m, 0, TAU);
        g.fill();
      }
    });
  },
};

export default {
  sky,
  far,
  near,
  after,
  back(f) {
    for (const l of f.look.landmarks) LANDMARKS[l]?.(f);
    far(f);
    near(f);
    after(f);
  },
  // a path of stone slabs, each with a cell of acid light set in it, lit under his feet and in a wave rolling along on
  // the kick
  ground(f, a, b, y) {
    const { g, v, mf, t, T, L } = f,
      s = slab(f, a, b, y, mixHex('#1c1c24', T.near, 0.3), '#4a4a58');
    if (!s) return;
    const m = v.ppm,
      cw = 0.5,
      hx = f.run?.heroX ? f.run.heroX(t) : L.xAt(t),
      wave = (t / L.A.beat) % 1;
    // (each cell's light: dim in four colours (a path each), and the lit ones (under him, in the wave) over them)
    const k0 = Math.floor(s.a / cw),
      k1 = s.b / cw;
    for (let c = 0; c < 4; c++) {
      g.fillStyle = rgba(ACID[c], 0.08 * 0.7);
      g.beginPath();
      for (let k = k0; k < k1; k++) if ((((k % 4) + 4) % 4) === c) g.rect(v.sx(k * cw) + 0.03 * m, s.Y + 0.25 * m, cw * m - 0.06 * m, 0.4 * m);
      g.fill();
      g.fillStyle = rgba(ACID[(c + 2) % 4], 0.08 * 0.3);
      g.beginPath();
      for (let k = k0; k < k1; k++) if ((((k % 4) + 4) % 4) === c) g.rect(v.sx(k * cw) + 0.03 * m, s.Y + 0.71 * m, cw * m - 0.06 * m, 0.4 * m);
      g.fill();
    }
    for (let k = k0; k < k1; k++) {
      const x = k * cw,
        X = v.sx(x),
        d = Math.abs(x - hx),
        under = d < 1.2 ? 1 - d / 1.2 : 0,
        w = Math.max(0, 1 - Math.abs(((x - hx) / 12 - wave + 2) % 1) * 6) * mf.kick,
        on = Math.min(1, under * 0.8 + w * 0.8);
      if (on < 0.03) continue;
      g.fillStyle = rgba(ACID[((k % 4) + 4) % 4], on * 0.7);
      g.fillRect(X + 0.03 * m, s.Y + 0.25 * m, cw * m - 0.06 * m, 0.4 * m);
      g.fillStyle = rgba(ACID[((k + 2) % 4 + 4) % 4], on * 0.3);
      g.fillRect(X + 0.03 * m, s.Y + 0.71 * m, cw * m - 0.06 * m, 0.4 * m);
    }
    edge(f, s, T.line);
  },
  // the pictures painted while the song loads, in its palette and its drop's (world/render.js warmWorld)
  warm(f) {
    const { v } = f,
      stone = mixHex('#4a4a5c', steady(f).near, 0.3);
    for (const m of [v.ppm, v.ppm * 0.8]) for (let sz = 0; sz <= 1; sz += 0.5) for (const l of [false, true]) stonePic(m, sz, l, stone);
  },
};
