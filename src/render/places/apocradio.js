// Radio Limbo (after ATL's "Радио Апокалипсис", "Лимб", "Кривой эфир"; world/artists.js): the limbo between stations,
// a void under a teal storm sky. Searchlights sweep its clouds on the kick, a tuning dial's band glows across the sky
// with its needle jumping from station to station on the beat; far off doorways stand adrift at every depth over a sea
// of static, each opening on the beat in turn on a light of another place; near, old television sets float, snow on
// their screens and an eye on one now and then, aerials growing out of them like reeds, their cables trailing into
// nothing; underfoot a road of magnetic tape, a shine running along it on the beat, spools turning under it, sparks
// off it on the snare. Landmarks by the song: a boombox as big as a tower afloat, flowers growing out of its speakers
// (the cover), its cones pushed by the bass; a tower of doorways stacked crooked into the clouds; a great television
// adrift with an eye on its screen blinking on the kick.
import { hash, mixHex, rgba } from '../util.js';
import { cells, edge, glow, landmark, pic, row, slab, stamp, steady, still, vgrad } from './kit.js';

const TAU = Math.PI * 2,
  TEAL = '#2fb7b0',
  AMBER = '#ffb040',
  MAGENTA = '#d0328c',
  CHROME = '#9aa3ad';

const beatOf = f => {
  const b = f.t / f.L.A.beat;
  return { n: Math.floor(b), u: b - Math.floor(b) };
};
const notch = (f, q = 3) => {
  const { n, u } = beatOf(f),
    k = Math.min(1, u * q);
  return n + k * k * (3 - 2 * k);
};

function sky(f) {
  const { g, v, mf, T, t } = f;
  // (a bank of storm cloud along the top, lit from under by the searchlights)
  g.fillStyle = rgba(mixHex('#1a2426', T.sky[0], 0.4), 0.75);
  g.beginPath();
  g.moveTo(0, 0);
  for (let x = 0; x <= v.W; x += v.W / 20) g.lineTo(x, v.H * (0.16 + 0.05 * Math.sin(x / v.W * 9 + t * 0.15) + 0.03 * Math.sin(x / v.W * 23)));
  g.lineTo(v.W, 0);
  g.fill();
  // (searchlights: two beams sweeping, brighter on the kick)
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let s = 0; s < 3; s++) {
    const ox = v.W * (0.15 + 0.35 * s),
      oy = v.H * 0.9,
      an = -Math.PI / 2 + Math.sin(t * (0.3 + 0.1 * s) + s * 2) * 0.7,
      L = v.H * 1.1,
      w = 0.05;
    g.fillStyle = rgba(s === 1 ? AMBER : '#d8f4f0', 0.06 + 0.1 * mf.kick);
    g.beginPath();
    g.moveTo(ox, oy);
    g.lineTo(ox + Math.cos(an - w) * L, oy + Math.sin(an - w) * L);
    g.lineTo(ox + Math.cos(an + w) * L, oy + Math.sin(an + w) * L);
    g.fill();
  }
  g.restore();
  // (the tuning dial over the horizon: a band of ticks, its needle jumping to a station on the beat, the band warming
  // as the signal is caught on a drop)
  const Y = v.H * 0.42,
    x0 = v.W * 0.08,
    x1 = v.W * 0.92,
    caught = mf.drop > 0 ? 1 : 0.4;
  g.fillStyle = rgba(AMBER, 0.08 + 0.1 * caught);
  g.fillRect(x0, Y - 10 * v.dpr, x1 - x0, 20 * v.dpr);
  g.fillStyle = rgba(AMBER, 0.35 + 0.3 * caught);
  for (let k = 0; k <= 40; k++) {
    const x = x0 + ((x1 - x0) * k) / 40;
    g.fillRect(x, Y - (k % 5 ? 4 : 8) * v.dpr, v.dpr, (k % 5 ? 8 : 16) * v.dpr);
  }
  const st = hash(Math.floor(notch(f, 6)), 3),
    nx = x0 + (x1 - x0) * (0.1 + 0.8 * st);
  g.fillStyle = rgba('#ff3a2a', 0.85);
  g.fillRect(nx - v.dpr, Y - 16 * v.dpr, 2 * v.dpr, 32 * v.dpr);
  glow(g, nx, Y, 14 * v.dpr, '#ff3a2a', 0.5 + 0.4 * mf.beat);
}

// a doorway standing in the air: its frame, its door ajar (wider on the beat), a light of another place behind it,
// its sill hanging over nothing, a few steps up to it from nowhere
function doorway(g, X, Y, m, open, glowCol, frame, i) {
  const w = 1.1 * m,
    h = 2.2 * m;
  glow(g, X, Y - h / 2, 1.6 * m, glowCol, 0.12 + 0.35 * open);
  g.fillStyle = frame;
  g.fillRect(X - w / 2 - 0.15 * m, Y - h - 0.15 * m, w + 0.3 * m, h + 0.15 * m);
  g.fillStyle = rgba(glowCol, 0.6 + 0.35 * open);
  g.fillRect(X - w / 2, Y - h, w, h);
  // (the door, swung in: narrower as it opens)
  const dw = w * (1 - 0.75 * open);
  g.fillStyle = mixHex(frame, '#000000', 0.3);
  g.fillRect(X - w / 2, Y - h, dw, h);
  g.fillStyle = rgba('#ffd27a', 0.8);
  g.fillRect(X - w / 2 + dw - 0.12 * m, Y - h / 2, 0.06 * m, 0.06 * m);
  // (steps under it going down a little way and stopping)
  g.fillStyle = frame;
  for (let k = 0; k < 3 + (i % 3); k++) g.fillRect(X - w / 2 - (k + 1) * 0.35 * m, Y + k * 0.3 * m, 0.4 * m, 0.12 * m);
}
// ---- far: doorways adrift at every depth, opening on the beat in turn, each with another place's light
// how far the rows stand up off the horizon (a phone's horizon sits low, under the roofs)
const lift = (f, k) => Math.max(1.2 * f.v.ppm, k * f.v.H);
function far(f) {
  const { g, v, mf, T, t } = f,
    r0 = row(f, 0.12),
    r = { ...r0, base: r0.base - lift(f, 0.16) },
    m = v.ppm,
    { n } = beatOf(f),
    frame = mixHex(T.far, '#2a2a30', 0.3),
    cols = [TEAL, AMBER, MAGENTA, '#9a7dff'];
  // (the sea of static below the horizon: a band of grey snow)
  g.fillStyle = rgba(mixHex(T.sky[2], '#8a9a9a', 0.4), 0.35);
  g.fillRect(r.L, r.base - 1 * m, r.R - r.L, 3 * m);
  g.fillStyle = 'rgba(255,255,255,0.2)';
  const fr = Math.floor(t * 15);
  for (let k = 0; k < 60; k++) g.fillRect(hash(k, fr) * v.W, r.base - 1 * m + hash(k, fr + 1) * 1.6 * m, 2 * v.dpr, v.dpr);
  cells(r, 4.5, (i, X, u) => {
    const Y = r.base - (2.5 + 5 * hash(i, 3)) * m + Math.sin(t * 0.6 + i) * 0.3 * m,
      open = ((i % 4) + 4) % 4 === n % 4 ? mf.beat : 0.1 * mf.kick;
    if (u < 0.75) doorway(g, X, Y, m * (0.7 + 0.3 * u), open, cols[((i % 4) + 4) % 4], frame, i);
  });
}
// ---- near: floating television sets showing snow, aerials growing out of them like reeds, wires trailing (lifted
// over the roofs: a phone's horizon sits under them)
// (a set: a wooden cabinet shaded round, a bulging screen in its frame, knobs, legs; painted once; its screen's snow is
// one of four painted frames of noise, swapped as fast as the hats)
const tvPic = (m, body) =>
  still(`ar-tv|${body}`, m, 1.8, 1.6, 0.9, 1.3, (g, s) => {
    const W = 1.6 * s,
      H = 1.2 * s;
    g.fillStyle = vgrad(g, -H, 0, [[0, mixHex(body, '#c8a070', 0.25)], [1, mixHex(body, '#000000', 0.35)]]);
    g.fillRect(-W / 2, -H, W, H);
    g.fillRect(-W * 0.3, 0, 0.1 * s, 0.3 * s);
    g.fillRect(W * 0.2, 0, 0.1 * s, 0.3 * s);
    g.fillStyle = '#16181a';
    g.fillRect(-W * 0.45, -H * 0.91, W * 0.74, H * 0.82);
    g.fillStyle = '#c8b090';
    g.beginPath();
    for (const y of [0.3, 0.55]) {
      g.moveTo(W * 0.4 + 0.07 * s, -H * y);
      g.arc(W * 0.4, -H * y, 0.07 * s, 0, TAU);
    }
    g.fill();
  });
const snowPic = k =>
  pic(`ar-snow|${k}`, 48, 36, g => {
    g.fillStyle = '#5a6464';
    g.fillRect(0, 0, 48, 36);
    for (let i = 0; i < 260; i++) {
      const u = hash(i, k * 7 + 3);
      g.fillStyle = u < 0.5 ? 'rgba(255,255,255,0.75)' : 'rgba(20,24,26,0.6)';
      g.fillRect(Math.floor(hash(i, k * 7 + 1) * 48), Math.floor(hash(i, k * 7 + 2) * 36), 1 + (u > 0.9 ? 1 : 0), 1);
    }
    g.fillStyle = 'rgba(255,255,255,0.12)';
    for (let y = 0; y < 36; y += 3) g.fillRect(0, y, 48, 1);
  });
function near(f) {
  const { g, v, mf, t } = f,
    P = steady(f),
    r0 = row(f, 0.4),
    r = { ...r0, base: r0.base - lift(f, 0.12) },
    m = v.ppm,
    body = mixHex(P.near, '#4a3424', 0.35),
    fr = Math.floor(t * 18),
    n = beatOf(f).n,
    cables = [],
    aerials = [];
  cells(r, 3.2, (i, X, u) => {
    if (u > 0.7) return;
    const sc = 0.8 + 0.6 * hash(i, 3),
      W = 1.6 * m * sc,
      H = 1.2 * m * sc,
      Y = r.base - (1.2 + 2.2 * hash(i, 4)) * m + Math.sin(t * 0.9 + i * 2) * 0.25 * m,
      tilt = (hash(i, 5) - 0.5) * 0.3 + 0.03 * Math.sin(t + i);
    g.save();
    g.translate(X, Y);
    g.rotate(tilt);
    stamp(g, tvPic(m, body), 0, 0, m * sc);
    // (its screen: snow, brighter on the hats, and a picture of an eye now and then on the beat)
    g.globalAlpha = 0.55 + 0.4 * mf.hat;
    g.drawImage(snowPic((fr + i) & 3), -W * 0.42, -H * 0.88, W * 0.68, H * 0.76);
    g.globalAlpha = 1;
    if ((i + n) % 5 === 0) {
      g.fillStyle = rgba(MAGENTA, 0.8 * mf.beat + 0.2);
      g.beginPath();
      g.ellipse(-W * 0.08, -H * 0.5, W * 0.2, H * 0.14, 0, 0, TAU);
      g.fill();
      g.fillStyle = '#0a0a0c';
      g.beginPath();
      g.arc(-W * 0.08, -H * 0.5, H * 0.08, 0, TAU);
      g.fill();
    }
    g.fillStyle = rgba(AMBER, 0.5 + 0.5 * mf.kick);
    g.fillRect(W * 0.32, -H * 0.8, W * 0.08, W * 0.08);
    g.restore();
    // (aerials out of its top like reeds, swaying; its cable trailing down out of sight)
    for (let k = 0; k < 2; k++) {
      const sw = Math.sin(t * 1.5 + i + k) * 0.15 * m,
        bx = X + (-W * 0.1 + k * W * 0.2) * Math.cos(tilt) + H * Math.sin(tilt),
        by = Y - H * Math.cos(tilt);
      aerials.push(bx, by, X + (-W * 0.35 + k * W * 0.7) + sw, by - 1.1 * m * sc);
    }
    cables.push(X, Y, Math.sin(t + i) * 0.2 * m);
  });
  g.strokeStyle = CHROME;
  g.lineWidth = Math.max(1, 0.04 * m);
  g.beginPath();
  for (let k = 0; k < aerials.length; k += 4) {
    g.moveTo(aerials[k], aerials[k + 1]);
    g.lineTo(aerials[k + 2], aerials[k + 3]);
  }
  g.stroke();
  g.strokeStyle = rgba('#0a0a0c', 0.8);
  g.lineWidth = Math.max(1, 0.03 * m);
  g.beginPath();
  for (let k = 0; k < cables.length; k += 3) {
    const X = cables[k],
      Y = cables[k + 1];
    g.moveTo(X, Y);
    g.quadraticCurveTo(X + 0.5 * m, Y + 1 * m, X + 0.2 * m + cables[k + 2], r.base + 1 * m);
  }
  g.stroke();
}

export const LANDMARKS = {
  // a boombox as big as a tower block, flowers out of its speakers (magenta, teal), its cones pushed by the bass, the
  // needle on its dial jumping on the beat, an aerial off it with a red light
  boombox(f) {
    const { g, v, mf, t } = f,
      P = steady(f);
    landmark(f, 0.07, 46, 0.75, 61, (X, base) => {
      const m = v.ppm * 0.9,
        up = Math.max(1.6 * v.ppm, 0.2 * v.H),
        B = base - up - 3 * m + Math.sin(t * 0.6) * 0.4 * m,
        W = 11 * m,
        H = 6.5 * m,
        x0 = X - W / 2,
        y0 = B - H,
        body = mixHex(P.far, '#2a2c30', 0.3),
        chrome = mixHex(CHROME, P.far, 0.4),
        stem = mixHex('#2a6a3a', P.far, 0.3),
        // (its body, handle, aerial, speaker rims and the flowers grown out of them: painted once)
        c = still(`ar-boom|${body}|${chrome}|${stem}`, m, 17, 15, 8, 8, (g, s) => {
          const W = 11 * s,
            H = 6.5 * s,
            x0 = -W / 2,
            y0 = -H;
          g.fillStyle = vgrad(g, y0, 0, [[0, mixHex(body, '#8a8e96', 0.35)], [1, mixHex(body, '#000000', 0.4)]]);
          g.fillRect(x0, y0, W, H);
          g.strokeStyle = chrome;
          g.lineWidth = 0.35 * s;
          g.beginPath();
          g.moveTo(x0 + 2 * s, y0);
          g.lineTo(x0 + 2.5 * s, y0 - 1.2 * s);
          g.lineTo(x0 + W - 2.5 * s, y0 - 1.2 * s);
          g.lineTo(x0 + W - 2 * s, y0);
          g.stroke();
          g.lineWidth = 0.1 * s;
          g.beginPath();
          g.moveTo(x0 + W - 1 * s, y0);
          g.lineTo(x0 + W + 2 * s, y0 - 6 * s);
          g.stroke();
          for (const sd of [-1, 1]) {
            const cx = sd * 3.3 * s,
              cy = -2.9 * s,
              R = 2.2 * s;
            g.fillStyle = chrome;
            g.beginPath();
            g.arc(cx, cy, R + 0.25 * s, 0, TAU);
            g.fill();
            g.fillStyle = '#0c0c10';
            g.beginPath();
            g.arc(cx, cy, R, 0, TAU);
            g.fill();
            for (let k = 0; k < 7; k++) {
              const a = -Math.PI / 2 + (k - 3) * 0.45,
                d = R * (0.5 + 0.8 * hash(k, sd + 5)),
                fx = cx + Math.cos(a) * d,
                fy = cy + Math.sin(a) * d - R * 0.3;
              g.strokeStyle = stem;
              g.lineWidth = 0.12 * s;
              g.beginPath();
              g.moveTo(cx, cy);
              g.quadraticCurveTo(cx + Math.cos(a) * d * 0.4, cy, fx, fy);
              g.stroke();
              g.fillStyle = k % 2 ? MAGENTA : TEAL;
              g.beginPath();
              for (let q = 0; q < 5; q++) {
                const pa = (q / 5) * TAU + k,
                  px = fx + Math.cos(pa) * 0.4 * s,
                  py = fy + Math.sin(pa) * 0.4 * s;
                g.moveTo(px + 0.28 * s, py);
                g.arc(px, py, 0.28 * s, 0, TAU);
              }
              g.fill();
              g.fillStyle = AMBER;
              g.beginPath();
              g.arc(fx, fy, 0.22 * s, 0, TAU);
              g.fill();
            }
          }
        }, 0.6);
      // (the cones pushed by the bass, under the flowers)
      g.fillStyle = '#1e1e24';
      g.beginPath();
      for (const sd of [-1, 1]) {
        const R = 2.2 * m * (0.45 + 0.08 * mf.bass);
        g.moveTo(X + sd * 3.3 * m + R, B - 2.9 * m);
        g.arc(X + sd * 3.3 * m, B - 2.9 * m, R, 0, TAU);
      }
      g.fill();
      stamp(g, c, X, B, m, 0, 0, 1 + 0.01 * mf.kick, 1 + 0.01 * mf.kick);
      glow(g, x0 + W + 2 * m, y0 - 6 * m, 0.4 * m, '#ff3a2a', 0.5 + 0.5 * mf.beat);
      // (the dial between them, its needle on the beat)
      g.fillStyle = rgba(AMBER, 0.6 + 0.3 * mf.beat);
      g.fillRect(X - 1 * m, y0 + 0.8 * m, 2 * m, 0.9 * m);
      g.fillStyle = '#ff3a2a';
      g.fillRect(X - 0.9 * m + 1.8 * m * hash(beatOf(f).n, 7), y0 + 0.7 * m, 0.1 * m, 1.1 * m);
    });
  },
  // a tower of doorways stacked crooked into the clouds, each opening on the beat in turn, a light of its own in each
  doorstack(f) {
    const { g, v, mf, T, t } = f;
    landmark(f, 0.06, 50, 0.75, 63, (X, base) => {
      const m = v.ppm * 1.1,
        up = Math.max(1.6 * v.ppm, 0.2 * v.H),
        B = base - up,
        frame = mixHex(T.far, T.sky[2], 0.2),
        { n } = beatOf(f),
        cols = [TEAL, AMBER, MAGENTA, '#9a7dff'];
      for (let k = 0; k < 6; k++) {
        const x = X + Math.sin(k * 1.7 + t * 0.2) * 0.8 * m,
          y = B - k * 2.6 * m;
        doorway(g, x, y, m, k === n % 6 ? mf.beat : 0.05, cols[k % 4], frame, k);
      }
    });
  },
  // a great television adrift in the sky, an eye on its screen following him, blinking on the kick, snow across it on
  // the snare
  eyetv(f) {
    const { g, v, mf, T, t } = f;
    landmark(f, 0.08, 44, 0.75, 65, (X, base) => {
      const m = v.ppm * 0.9,
        up = Math.max(1.6 * v.ppm, 0.2 * v.H),
        B = base - up - 4 * m + Math.sin(t * 0.5) * 0.5 * m,
        W = 8 * m,
        H = 6 * m,
        body = mixHex(T.far, '#3a3a40', 0.3);
      g.fillStyle = body;
      g.fillRect(X - W / 2, B - H, W, H);
      g.strokeStyle = body;
      g.lineWidth = 0.2 * m;
      g.beginPath();
      g.moveTo(X - 0.5 * m, B - H);
      g.lineTo(X - 2.5 * m, B - H - 3 * m);
      g.moveTo(X + 0.5 * m, B - H);
      g.lineTo(X + 2.2 * m, B - H - 3.4 * m);
      g.stroke();
      g.fillStyle = rgba('#d8e8e4', 0.75);
      g.fillRect(X - W * 0.4, B - H * 0.88, W * 0.62, H * 0.76);
      const cx = X - W * 0.09,
        cy = B - H * 0.5,
        open = 1 - 0.9 * mf.kick;
      g.fillStyle = '#f4f0e8';
      g.beginPath();
      g.ellipse(cx, cy, W * 0.24, H * 0.2 * open, 0, 0, TAU);
      g.fill();
      g.fillStyle = MAGENTA;
      g.beginPath();
      g.arc(cx + Math.sin(t * 0.7) * W * 0.06, cy, H * 0.14 * open, 0, TAU);
      g.fill();
      g.fillStyle = '#0a0a0c';
      g.beginPath();
      g.arc(cx + Math.sin(t * 0.7) * W * 0.06, cy, H * 0.06 * open, 0, TAU);
      g.fill();
      if (mf.snare > 0.2) {
        g.fillStyle = rgba('#ffffff', 0.5 * mf.snare);
        for (let k = 0; k < 5; k++) g.fillRect(X - W * 0.4, B - H * 0.88 + hash(k, Math.floor(t * 20)) * H * 0.7, W * 0.62, 3 * v.dpr);
      }
      for (let k = 0; k < 2; k++) glow(g, X + W * 0.35, B - H * (0.7 - k * 0.3), 0.4 * m, k ? TEAL : AMBER, 0.5 + 0.5 * mf.beat);
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
  // a road of magnetic tape over the void: glossy brown, its edge lines, a shine running along it on the beat, a
  // spool now and then under it, sparks off it on the snare
  ground(f, a, b, y) {
    const { g, v, mf, t, L } = f,
      s = slab(f, a, b, y, '#2a1a12', '#6a4430');
    if (!s) return;
    const m = v.ppm,
      run = ((t / L.A.beat) % 1) * 8;
    g.fillStyle = 'rgba(255,220,180,0.12)';
    g.fillRect(s.X0, s.Y + 0.35 * m, s.X1 - s.X0, 0.05 * m);
    g.fillRect(s.X0, s.Y + 1.5 * m, s.X1 - s.X0, 0.05 * m);
    for (let k = Math.floor(s.a / 8); k < s.b / 8; k++) {
      const X = v.sx(k * 8 + run);
      g.fillStyle = rgba('#ffe0c0', 0.12 + 0.2 * mf.beat);
      g.fillRect(X, s.Y + 0.22 * m, 1.6 * m, 1.4 * m);
      if (hash(k, 7) < 0.4) {
        const cx = v.sx(k * 8 + 4),
          cy = s.Y + 2.6 * m;
        g.fillStyle = '#e8e4dc';
        g.beginPath();
        g.arc(cx, cy, 0.9 * m, 0, TAU);
        g.fill();
        g.fillStyle = '#2a1a12';
        for (let j = 0; j < 6; j++) {
          const an = (j / 6) * TAU + t;
          g.beginPath();
          g.arc(cx + Math.cos(an) * 0.45 * m, cy + Math.sin(an) * 0.45 * m, 0.12 * m, 0, TAU);
          g.fill();
        }
      }
      if (hash(k, 9) < 0.5 && mf.snare > 0.2)
        for (let j = 0; j < 4; j++) {
          const an = -Math.PI / 2 + (hash(j, Math.floor(t * 12)) - 0.5) * 2,
            l = 0.5 * m * mf.snare,
            x0 = v.sx(k * 8 + 2);
          g.strokeStyle = rgba(TEAL, 0.9);
          g.lineWidth = 1.5 * v.dpr;
          g.beginPath();
          g.moveTo(x0, s.Y);
          g.lineTo(x0 + Math.cos(an) * l, s.Y + Math.sin(an) * l);
          g.stroke();
        }
    }
    edge(f, s, TEAL);
  },
  // the pictures painted while the song loads, in its palette and its drop's (world/render.js warmWorld)
  warm(f) {
    const { v } = f,
      body = mixHex(steady(f).near, '#4a3424', 0.35);
    for (let k = 0; k < 4; k++) snowPic(k);
    for (const m of [v.ppm, v.ppm * 0.8]) tvPic(m, body);
  },
};
