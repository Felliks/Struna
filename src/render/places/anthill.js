// The Anthill, «Генератор ахиней» (after ATL's "Архитектор": a little ant trudging among wild orchids with a straw on
// its back, a thing shining in the sky it cannot look away from, pulled back into the anthill by an old instinct; the
// video's city filmed as a toy, its crowds flowing like ant columns, a golden lattice tunnel; "Урожай", "Таракан",
// "Генератор ахиней": the sun a lantern shaking its fiery mane like a rocker; world/artists.js): the world at an ant's
// height, warm, gold and orchid. In the sky the sun with its mane of fire flung out on the kick and tossed like a
// rocker's on the beat, shafts of its light raking down through the grass on the beat, pollen bokeh drifting and
// swelling on the bass, and the shining thing: a little star glinting high, flaring on the beat, streaking a trail on a
// drop (the cosmonaut's dream). Far off a haze of grass blades leaning in the wind, nearer giant blades with wild orchids
// on their stems as big as trees and dew drops hung on them catching the kick, the orchids lit on the beat and
// blooming in a drop; near, straws lying across like fallen beams, clover nodding on the beat, pebbles like boulders,
// and a column of ants marching along with straws and leaves on their backs, stepping on the beat; underfoot the
// anthill's cut-away: a crust of grains over a gallery in a golden lattice lit on the kick, chambers glowing in turn on
// the beat, ants filing through. Landmarks: the anthill itself as tall as a mountain, its doorways lit in spiralling
// rows in turn on the beat, straw cranes on its flanks; a wild orchid towering, opening on a drop; a dandelion clock as
// tall as a tower, its seeds blowing off on the kick.
// What stands still is painted once as the song loads (kit.js still/pic: shaded, textured) and only stamped while it
// plays; what plays the music is drawn over it (lights, glows) or leans and bounces the stamps.
import { glowDot, hash, mixHex, rgba } from '../util.js';
import { cells, edge, glow, landmark, pic, row, sizeStep, slab, stamp, steady, still, vgrad } from './kit.js';
import { eased, lean as windLean } from '../physics.js';

const TAU = Math.PI * 2,
  GOLD = '#ffc23a',
  ORCHID = '#e05ac8',
  ORCHID2 = '#f6b8e8',
  CHITIN = '#2a140a',
  STRAW = '#e8c070',
  LEAF = '#5aa83a';

const beatOf = f => {
  const b = f.t / f.L.A.beat;
  return { n: Math.floor(b), u: b - Math.floor(b) };
};
// a landmark standing up from the far horizon (a phone's horizon sits low: lifted to a fifth of the screen)
function mark(f, par, every, chance, salt, draw) {
  const up = Math.max(1.6 * f.v.ppm, 0.2 * f.v.H);
  landmark(f, par, every, chance, salt, (X, base, i) => draw(X, base - up, up, i));
}

// ---- an orchid's flower, painted once a size step: five petals (two wide wings, three narrow), a spotted lip, a pale
// column, its petals veined and shaded from the centre
function orchidSprite(R, col) {
  const S = sizeStep(R);
  return pic(`ah-orchid|${S}|${col}`, S * 2.6 + 4, S * 2.6 + 4, (g, w) => {
    const o = w / 2,
      pale = mixHex(col, '#ffffff', 0.45),
      deep = mixHex(col, '#3a0a30', 0.35),
      petal = (an, len, wid, fill) => {
        g.save();
        g.translate(o, o);
        g.rotate(an);
        const gr = g.createLinearGradient(0, 0, 0, -len);
        gr.addColorStop(0, deep);
        gr.addColorStop(0.35, fill);
        gr.addColorStop(1, mixHex(fill, '#ffffff', 0.25));
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(0, 0);
        g.bezierCurveTo(wid, -len * 0.3, wid * 0.8, -len * 0.9, 0, -len);
        g.bezierCurveTo(-wid * 0.8, -len * 0.9, -wid, -len * 0.3, 0, 0);
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.35)';
        g.lineWidth = Math.max(1, S * 0.03);
        g.beginPath();
        g.moveTo(0, -len * 0.15);
        g.lineTo(0, -len * 0.85);
        g.stroke();
        g.restore();
      };
    for (const an of [-1.2, 1.2]) petal(an, S * 1.05, S * 0.75, pale);
    for (const an of [0, -2.4, 2.4]) petal(an, S * 1.1, S * 0.32, col);
    // (the lip: a frilled cup hanging down, spotted dark)
    g.fillStyle = mixHex(col, '#5a0a40', 0.25);
    g.beginPath();
    g.ellipse(o, o + S * 0.45, S * 0.42, S * 0.5, 0, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(70,10,50,0.55)';
    g.beginPath();
    for (let i = 0; i < 9; i++) {
      const x = o + (hash(i, 3) - 0.5) * S * 0.5,
        y = o + S * (0.25 + 0.5 * hash(i, 4));
      g.moveTo(x + S * 0.05, y);
      g.arc(x, y, S * 0.05, 0, TAU);
    }
    g.fill();
    g.fillStyle = '#fff4c8';
    g.beginPath();
    g.ellipse(o, o + S * 0.05, S * 0.12, S * 0.2, 0, 0, TAU);
    g.fill();
  });
}
function orchid(g, X, Y, R, col, open = 1) {
  const c = orchidSprite(R, col),
    s = (R / sizeStep(R)) * (0.85 + 0.15 * open);
  g.drawImage(c, X - (c.width * s) / 2, Y - (c.height * s) / 2, c.width * s, c.height * s);
}

// ---- the sky: a low sun with its mane of fire, its shafts of light, pollen bokeh drifting, the shining thing high up
// (the mane: tongues of flame round the disc, combed one way, each lit gold at its root and red at its tip)
const manePic = R =>
  pic(`ah-mane|${R}`, R * 6, R * 6, g => {
    const o = R * 3,
      gr = g.createRadialGradient(o, o, R * 0.8, o, o, R * 2.9);
    gr.addColorStop(0, '#fff4c0');
    gr.addColorStop(0.3, '#ffd23a');
    gr.addColorStop(0.65, '#ff8a1a');
    gr.addColorStop(1, 'rgba(255,70,20,0)');
    g.fillStyle = gr;
    g.beginPath();
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * TAU + 0.35 * Math.sin(k * 2.3),
        L = R * (1.6 + 0.9 * hash(k, 15)),
        w = 0.22;
      g.moveTo(o + Math.cos(a - w) * R * 0.9, o + Math.sin(a - w) * R * 0.9);
      g.quadraticCurveTo(o + Math.cos(a + 0.25) * L * 0.8, o + Math.sin(a + 0.25) * L * 0.8, o + Math.cos(a + 0.35) * L, o + Math.sin(a + 0.35) * L);
      g.quadraticCurveTo(o + Math.cos(a + 0.1) * L * 0.7, o + Math.sin(a + 0.1) * L * 0.7, o + Math.cos(a + w) * R * 0.9, o + Math.sin(a + w) * R * 0.9);
    }
    g.fill();
  });
// (the disc: white hot at its heart, gold at its limb)
const discPic = R =>
  pic(`ah-disc|${R}`, R * 2 + 4, R * 2 + 4, g => {
    const o = R + 2,
      gr = g.createRadialGradient(o - R * 0.25, o - R * 0.25, 0, o, o, R);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(0.6, '#fff4c8');
    gr.addColorStop(1, '#ffc860');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(o, o, R, 0, TAU);
    g.fill();
  });
// (its shafts: long wedges fanning down from it, fading out)
const raysPic = R =>
  pic(`ah-rays|${R}`, R * 16, R * 12, g => {
    const ox = R * 8,
      oy = 0;
    for (let k = 0; k < 9; k++) {
      const a = Math.PI / 2 + (k - 4) * 0.2 + 0.05 * Math.sin(k * 3),
        L = R * 12,
        w = 0.035 + 0.03 * hash(k, 3),
        gr = g.createLinearGradient(ox, oy, ox + Math.cos(a) * L, oy + Math.sin(a) * L);
      gr.addColorStop(0, 'rgba(255,240,180,0.55)');
      gr.addColorStop(1, 'rgba(255,240,180,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(ox, oy);
      g.lineTo(ox + Math.cos(a - w) * L, oy + Math.sin(a - w) * L);
      g.lineTo(ox + Math.cos(a + w) * L, oy + Math.sin(a + w) * L);
      g.fill();
    }
  });
// (a soft hex of pollen out of focus, its rim brighter)
const hexPic = (r, col) =>
  pic(`ah-hex|${r}|${col}`, r * 2 + 2, r * 2 + 2, g => {
    const o = r + 1,
      gr = g.createRadialGradient(o, o, 0, o, o, r);
    gr.addColorStop(0, rgba(col, 0.35));
    gr.addColorStop(0.8, rgba(col, 0.6));
    gr.addColorStop(1, rgba(col, 0.9));
    g.fillStyle = gr;
    g.beginPath();
    for (let k = 0; k < 6; k++) g.lineTo(o + Math.cos((k * TAU) / 6) * r, o + Math.sin((k * TAU) / 6) * r);
    g.fill();
  });
// (a four-pointed glint, a star's)
const sparklePic = r =>
  pic(`ah-spark|${r}`, r * 2 + 2, r * 2 + 2, g => {
    const o = r + 1;
    for (const [col, s] of [['#fff4c8', 1], ['#ffffff', 0.6]]) {
      g.fillStyle = col;
      g.beginPath();
      for (let k = 0; k < 8; k++) {
        const an = (k * Math.PI) / 4,
          R = (k % 2 ? r * 0.16 : r) * s;
        g.lineTo(o + Math.cos(an) * R, o + Math.sin(an) * R);
      }
      g.fill();
    }
  });
function sky(f) {
  const { g, v, t, mf, T } = f,
    { n, u } = beatOf(f),
    S = Math.min(v.W, v.H),
    sunX = v.W * 0.3,
    sunY = v.H * 0.42,
    R0 = sizeStep(S * 0.1),
    R = S * 0.1 * (1 + 0.04 * mf.bass);
  glow(g, sunX, sunY, R * 5, mixHex(GOLD, T.sky[2], 0.3), 0.32 + 0.1 * mf.voice);
  // (its shafts of light raking down through the grass, brighter on the beat, blazing in a drop)
  const rays = raysPic(R0),
    rk = (R / R0) * 1.1;
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = 0.12 + 0.18 * mf.beat * mf.amp + 0.25 * mf.drop;
  g.translate(sunX, sunY);
  g.rotate(0.12 * Math.sin(t * 0.15));
  g.drawImage(rays, (-rays.width / 2) * rk, 0, rays.width * rk, rays.height * rk);
  g.restore();
  // (its mane ("Генератор ахиней": the sun shaking its fiery mane like a rocker): tossed one way and back on the beat,
  // flung out on the kick, a second mane flaring over it on the kick)
  const toss = 0.35 * Math.sin((n + u) * Math.PI) + 0.2 * mf.kick,
    mane = manePic(R0),
    k = R / R0;
  for (const [a, sc, rot] of [[1, 1 + 0.18 * mf.kick, toss], [0.55 * mf.kick, 1.25 + 0.25 * mf.kick, -toss * 0.6 + 0.3]]) {
    if (a < 0.02) continue;
    g.save();
    if (a < 1) g.globalCompositeOperation = 'lighter';
    g.globalAlpha = a;
    g.translate(sunX, sunY);
    g.rotate(rot);
    g.drawImage(mane, -R0 * 3 * k * sc, -R0 * 3 * k * sc, mane.width * k * sc, mane.height * k * sc);
    g.restore();
  }
  glow(g, sunX, sunY, R * 1.6, '#fff2c8', 0.75);
  const disc = discPic(R0);
  g.drawImage(disc, sunX - (R0 + 2) * k, sunY - (R0 + 2) * k, disc.width * k, disc.height * k);
  // (bokeh: soft hexes of pollen out of focus, drifting up, swelling on the bass, brighter on the kick)
  const hx = [hexPic(sizeStep(S * 0.05), '#fff0c0'), hexPic(sizeStep(S * 0.05), ORCHID2)];
  g.save();
  for (let i = 0; i < 14; i++) {
    const r = (0.02 + 0.05 * hash(i, 7)) * S * (1 + 0.15 * mf.bass),
      x = ((hash(i, 5) * v.W * 1.2 + t * v.dpr * (4 + 6 * hash(i, 6))) % (v.W * 1.2)) - v.W * 0.1,
      y = v.H * (0.1 + 0.55 * hash(i, 8)) - ((t * v.dpr * (3 + 3 * hash(i, 9))) % (v.H * 0.3)),
      c = hx[i % 3 ? 0 : 1];
    g.globalAlpha = 0.16 + 0.12 * mf.kick;
    g.drawImage(c, x - r, y - r, r * 2, r * 2);
  }
  g.restore();
  // (the shining thing: a star high over it all, a sparkle on each beat, a trail across on a drop)
  const X = v.W * 0.78 + Math.sin(t * 0.2) * v.W * 0.02,
    Y = v.H * 0.12 + Math.cos(t * 0.27) * v.H * 0.01,
    r = S * (0.025 + 0.03 * (1 - u) * mf.beat + 0.06 * mf.drop);
  if (mf.drop > 0) {
    g.strokeStyle = rgba('#ffffff', 0.5 * mf.drop);
    g.lineWidth = 2 * v.dpr;
    g.beginPath();
    g.moveTo(X, Y);
    g.lineTo(X - v.W * 0.25 * (1 - mf.drop * 0.5), Y + v.H * 0.12 * (1 - mf.drop * 0.5));
    g.stroke();
  }
  glow(g, X, Y, r * 4, '#bfe8ff', 0.35 + 0.4 * mf.beat + 0.3 * mf.drop);
  const sp = sparklePic(sizeStep(S * 0.05)),
    sr = r * 1.6;
  g.save();
  g.translate(X, Y);
  g.rotate(0.3 * Math.sin(t * 0.7) + 0.4 * mf.hat);
  g.drawImage(sp, -sr, -sr, sr * 2, sr * 2);
  g.restore();
}

// ---- the far rows: a haze of grass blades leaning in the wind, giant blades with orchids and dew drops
// (a blade: a long leaf tapering to its tip, shaded from its root up, a pale rib down it)
function blade(g, X, base, h, w, lean, col, tip) {
  g.fillStyle = vgrad(g, base, base - h, [[0, mixHex(col, '#1a2a0a', 0.35)], [0.6, col], [1, tip]]);
  g.beginPath();
  g.moveTo(X - w, base);
  g.quadraticCurveTo(X - w * 0.6 + lean * 0.4, base - h * 0.6, X + lean, base - h);
  g.quadraticCurveTo(X + w * 0.6 + lean * 0.4, base - h * 0.6, X + w, base);
  g.fill();
  g.strokeStyle = 'rgba(255,255,220,0.22)';
  g.lineWidth = Math.max(1, w * 0.18);
  g.beginPath();
  g.moveTo(X, base);
  g.quadraticCurveTo(X + lean * 0.4, base - h * 0.6, X + lean, base - h);
  g.stroke();
}
// (the haze of blades far behind: a strip of them 13 m long, painted pale and leant by the wind as a whole)
const hazeStrip = (f, m, col) =>
  still(`ah-haze|${col}`, m, 13, 10, 0, 10, (g, s) => {
    for (let i = 0; i < 11; i++) {
      const x = (i + 0.5 * hash(i, 2)) * 1.18 * s,
        h = (4 + 5 * hash(i, 3)) * s;
      blade(g, x, 0, h, 0.22 * s, (hash(i, 4) - 0.5) * 0.8 * s, col, mixHex(col, '#fff4d0', 0.25));
    }
  }, 0.5);
// (a giant blade of the nearer far row, with what grows on it: an orchid's stem with three flowers, or a dew drop at its
// tip, or nothing; hb its height step)
const bladePic = (m, kind, hb, front, stem, orch) =>
  still(`ah-blade|${kind}|${hb}|${front}|${orch}`, m, kind === 0 ? 5 : 1.4, kind === 0 ? 14 : 7.3 + 3 * hb, kind === 0 ? 1 : 0.7, kind === 0 ? 14 : 7.3 + 3 * hb, (g, s) => {
    const h = (6 + 3 * hb) * s;
    blade(g, 0, 0, h, 0.35 * s, 0, front, mixHex(front, '#f4ffc0', 0.3));
    if (kind === 0) {
      const sx = 1.4 * s,
        top = -h * 1.05;
      g.strokeStyle = stem;
      g.lineWidth = Math.max(1, 0.12 * s);
      g.beginPath();
      g.moveTo(sx, 0);
      g.quadraticCurveTo(sx - 0.5 * s, top + 2 * s, sx + 1.6 * s, top);
      g.stroke();
      for (let k = 0; k < 3; k++) {
        const c = orchidSprite(0.55 * s * (1 - k * 0.12), orch),
          q = (0.55 * (1 - k * 0.12) * s) / sizeStep(0.55 * s * (1 - k * 0.12)),
          x = sx + (0.4 + 0.6 * k) * s,
          y = top + (0.6 + k * 1.1) * s;
        g.drawImage(c, x - (c.width * q) / 2, y - (c.height * q) / 2, c.width * q, c.height * q);
      }
    } else if (kind === 1) {
      const dy = -h * 0.92 + 0.5 * s,
        gr = g.createRadialGradient(-0.12 * s, dy - 0.12 * s, 0, 0, dy, 0.45 * s);
      gr.addColorStop(0, 'rgba(255,255,255,0.85)');
      gr.addColorStop(0.5, 'rgba(220,250,255,0.45)');
      gr.addColorStop(1, 'rgba(160,220,255,0.6)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(0, dy, 0.45 * s, 0, TAU);
      g.fill();
    }
  });
function far(f) {
  const { g, v, t, mf, T } = f,
    P = steady(f),
    r0 = row(f, 0.12),
    r = { ...r0, base: r0.base - lift(f, 0.2) },
    m = v.ppm,
    back = mixHex(P.far, '#c8a860', 0.25),
    front = mixHex(P.far, '#3a5a20', 0.4),
    stem = mixHex(front, '#2a4a14', 0.3);
  // (the haze, leant by the wind, more on the bass)
  const hz = hazeStrip(f, m, back);
  // (swaying more as the bass swells, through its spring, never jerking on a beat of it; physics.js)
  const bs = eased(f, 'B', mf.bass);
  for (let i = Math.floor(r.x0 / 13) - 1; i < r.x1 / 13 + 1; i++) stamp(g, hz, r.X(i * 13), r.base, m, 0, (Math.sin(t * 0.7 + i) * 0.03 + 0.02) * (1 + bs) + 0.01 * windLean(f, i * 13));
  g.fillStyle = mixHex(T.far, '#5a3a1a', 0.3);
  g.fillRect(r.L, r.base - 0.3 * m, r.R - r.L, 4 * m);
  const open = mf.drop > 0 ? 1 : 0.4 + 0.6 * mf.beat;
  cells(r, 3.4, (i, X, u) => {
    const kind = u < 0.4 ? 0 : u < 0.65 ? 1 : 2,
      hb = Math.floor(hash(i, 3) * 3),
      orch = i % 3 ? ORCHID : '#f0c0e8',
      c = bladePic(m, kind, hb, front, stem, mixHex(orch, P.far, 0.25)),
      h = (6 + 3 * hb) * m,
      lean = ((Math.sin(t * 0.6 + i * 1.3) * 0.5 + (hash(i, 4) - 0.5)) * (1 + 0.6 * bs) * m + 0.25 * windLean(f, i * 3.4) * m) / h;
    stamp(g, c, X, r.base, m, 0, lean);
    // (the orchids lit on the beat, blooming in a drop; the dew catching the kick)
    if (kind === 0) for (let k = 0; k < 3; k++) glow(g, X + (1.8 + 0.6 * k) * m + lean * h, r.base - h * 1.05 + (0.6 + k * 1.1) * m, 0.9 * m, '#ffd0f0', 0.1 + 0.3 * open * (k === (i + beatOf(f).n) % 3 ? 1 : 0.4));
    else if (kind === 1) {
      const dx = X + lean * h * 0.92,
        dy = r.base - h * 0.92 + 0.5 * m;
      glowDot(g, dx - 0.12 * m, dy - 0.12 * m, (0.2 + 0.35 * mf.kick) * m, '#ffffff', 0.5 + 0.5 * mf.kick);
    }
  });
}

// ---- the near rows: straws across, clover, pebbles, the column of ants
// (an ant from the side: three beads of chitin with a shine on each, six legs in one of two steps, two feelers; its
// load on its back: none, a straw, a leaf)
const antPic = (m, step, load, col) =>
  still(`ah-ant|${step}|${load}|${col}`, m, 2.2, 1.2, 1.1, 0.7, (g, s) => {
    const sd = step ? 1 : -1;
    g.strokeStyle = col;
    g.lineWidth = Math.max(1, 0.05 * s);
    g.beginPath();
    for (let k = 0; k < 3; k++) {
      const x = (-0.15 + k * 0.15) * s,
        sw = (k % 2 ? sd : -sd) * 0.08 * s;
      g.moveTo(x, 0);
      g.lineTo(x + sw - 0.05 * s, 0.22 * s);
      g.moveTo(x, 0);
      g.lineTo(x - sw + 0.05 * s, 0.22 * s);
    }
    g.moveTo(0.33 * s, -0.08 * s);
    g.quadraticCurveTo(0.45 * s, -0.32 * s, 0.55 * s, -0.3 * s);
    g.stroke();
    for (const [dx, r] of [[-0.32, 0.14], [0, 0.08], [0.28, 0.1]]) {
      g.fillStyle = col;
      g.beginPath();
      g.ellipse(dx * s, -0.02 * s, r * s * 1.2, r * s, 0, 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(255,220,160,0.35)';
      g.beginPath();
      g.ellipse((dx - r * 0.3) * s, (-0.02 - r * 0.45) * s, r * s * 0.5, r * s * 0.25, -0.3, 0, TAU);
      g.fill();
    }
    if (load === 1) {
      g.strokeStyle = STRAW;
      g.lineWidth = 0.09 * s;
      g.beginPath();
      g.moveTo(-0.8 * s, -0.35 * s);
      g.lineTo(0.7 * s, -0.15 * s);
      g.stroke();
    } else if (load === 2) {
      g.fillStyle = LEAF;
      g.beginPath();
      g.ellipse(-0.05 * s, -0.4 * s, 0.35 * s, 0.18 * s, -0.3, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(255,255,200,0.4)';
      g.lineWidth = Math.max(1, 0.03 * s);
      g.beginPath();
      g.moveTo(-0.35 * s, -0.3 * s);
      g.lineTo(0.25 * s, -0.5 * s);
      g.stroke();
    }
  });
// how far the rows stand up off the horizon (a phone's horizon sits low, under the roofs: the rows are lifted so what
// they hold rises over the roofs, as the landmarks are)
const lift = (f, k) => Math.max(1.2 * f.v.ppm, k * f.v.H);
// (near: a giant stalk of thistle, dark against the light, its sunny side rim-lit gold, its leaves, its head of
// bristles; a clover on its stalk with a dew drop; or a pebble as big as a boulder with a straw leaning on it)
const nearPic = (m, kind, sz, dark, rim, thistle, clover, pebble, straw) =>
  still(`ah-near|${kind}|${sz}|${dark}|${thistle}|${clover}|${pebble}|${straw}`, m, ...NEAR_BOX[kind], (g, s) => {
    if (kind === 0) {
      const h = (7 + 2 * sz) * s;
      g.fillStyle = dark;
      g.beginPath();
      g.moveTo(-0.22 * s, 0);
      g.quadraticCurveTo(-0.3 * s, -h * 0.5, -0.08 * s, -h);
      g.lineTo(0.08 * s, -h);
      g.quadraticCurveTo(0.1 * s, -h * 0.5, 0.22 * s, 0);
      g.fill();
      // (its leaves out both ways, long and toothed, a little lighter than the stalk, lit along their tops)
      const lf = mixHex(dark, '#2a4a14', 0.35);
      for (const [y, sd, L] of [[0.3, -1, 2.2], [0.5, 1, 1.9], [0.68, -1, 1.5]]) {
        const x0 = 0,
          y0 = -h * y,
          tx = sd * L * s,
          ty = y0 - 0.5 * s;
        g.fillStyle = lf;
        g.beginPath();
        g.moveTo(x0, y0);
        g.quadraticCurveTo(tx * 0.5, y0 - 0.75 * s, tx, ty);
        for (let k = 5; k >= 1; k--) {
          const q = k / 6;
          g.lineTo(tx * q + sd * 0.12 * s, y0 - 0.5 * s * q + 0.22 * s * Math.sin(q * Math.PI) - (k % 2 ? 0 : 0.12 * s));
        }
        g.closePath();
        g.fill();
        g.strokeStyle = rim;
        g.lineWidth = Math.max(1, 0.04 * s);
        g.beginPath();
        g.moveTo(x0, y0);
        g.quadraticCurveTo(tx * 0.5, y0 - 0.75 * s, tx, ty);
        g.stroke();
        g.fillStyle = dark;
      }
      // (its rim of light on the sun's side)
      g.strokeStyle = rim;
      g.lineWidth = Math.max(1, 0.07 * s);
      g.beginPath();
      g.moveTo(-0.22 * s, 0);
      g.quadraticCurveTo(-0.3 * s, -h * 0.5, -0.08 * s, -h);
      g.stroke();
      // (its head: a cup of green scales, a crown of bristles)
      g.fillStyle = mixHex(dark, '#3a5a20', 0.4);
      g.beginPath();
      g.ellipse(0, -h - 0.45 * s, 0.55 * s, 0.6 * s, 0, 0, TAU);
      g.fill();
      g.strokeStyle = thistle;
      g.lineWidth = Math.max(1, 0.07 * s);
      g.beginPath();
      for (let k = 0; k < 15; k++) {
        const a = -Math.PI / 2 + (k - 7) * 0.12;
        g.moveTo(Math.cos(a) * 0.35 * s, -h - 0.85 * s + Math.sin(a) * 0.2 * s);
        g.lineTo(Math.cos(a) * 1.15 * s, -h - 0.85 * s + Math.sin(a) * 1.15 * s);
      }
      g.stroke();
    } else if (kind === 1) {
      const h = (3.5 + 1.5 * sz) * s;
      g.strokeStyle = dark;
      g.lineWidth = Math.max(1, 0.14 * s);
      g.beginPath();
      g.moveTo(0.4 * s, 0);
      g.quadraticCurveTo(0.1 * s, -h * 0.6, 0.4 * s, -h);
      g.stroke();
      g.strokeStyle = rim;
      g.lineWidth = Math.max(1, 0.05 * s);
      g.stroke();
      for (let k = 0; k < 3; k++) {
        const an = -Math.PI / 2 + (k - 1) * 1.2,
          x = 0.4 * s + Math.cos(an) * 0.6 * s,
          y = -h + Math.sin(an) * 0.6 * s,
          gr = g.createRadialGradient(x - 0.25 * s, y - 0.25 * s, 0, x, y, 0.7 * s);
        gr.addColorStop(0, mixHex(clover, '#f4ffd0', 0.2));
        gr.addColorStop(1, mixHex(clover, '#000000', 0.4));
        g.fillStyle = gr;
        g.beginPath();
        g.arc(x, y, 0.62 * s, 0, TAU);
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.3)';
        g.lineWidth = Math.max(1, 0.06 * s);
        g.beginPath();
        g.arc(x, y, 0.3 * s, an + 2.4, an + 3.9);
        g.stroke();
      }
    } else {
      const w = (1.1 + 0.5 * sz) * s,
        h = (0.9 + 0.4 * sz) * s,
        cx = 1.2 * s,
        gr = g.createRadialGradient(cx - w * 0.35, -h * 0.75, 0, cx, -h * 0.2, w * 1.2);
      gr.addColorStop(0, mixHex(pebble, '#fff0c8', 0.45));
      gr.addColorStop(0.5, pebble);
      gr.addColorStop(1, mixHex(pebble, '#000000', 0.45));
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(cx, 0, w, h, 0, Math.PI, TAU);
      g.fill();
      g.fillStyle = 'rgba(30,20,10,0.35)';
      g.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = Math.PI + hash(k, 5) * Math.PI,
          d = Math.sqrt(hash(k, 6)) * 0.85,
          x = cx + Math.cos(a) * w * d,
          y = Math.sin(a) * h * d;
        g.moveTo(x + 0.04 * s, y);
        g.arc(x, y, 0.04 * s, 0, TAU);
      }
      g.fill();
      // (a straw leaning on it, its joints, its hollow end)
      g.save();
      g.translate(-1.2 * s, 0);
      g.rotate(-0.45);
      const L = 4 * s,
        sg = g.createLinearGradient(0, -0.16 * s, 0, 0.16 * s);
      sg.addColorStop(0, mixHex(straw, '#fff4d0', 0.4));
      sg.addColorStop(0.5, straw);
      sg.addColorStop(1, mixHex(straw, '#5a3a10', 0.5));
      g.fillStyle = sg;
      g.fillRect(0, -0.16 * s, L, 0.32 * s);
      g.fillStyle = 'rgba(90,58,16,0.55)';
      for (const q of [0.33, 0.66]) g.fillRect(L * q - 0.05 * s, -0.17 * s, 0.1 * s, 0.34 * s);
      g.fillStyle = '#3a2408';
      g.beginPath();
      g.ellipse(L, 0, 0.06 * s, 0.15 * s, 0, 0, TAU);
      g.fill();
      g.restore();
    }
  });
// (each kind's box: its width and height, and where its root is in it, metres)
const NEAR_BOX = [
  [5, 11.5, 2.4, 11.3],
  [2.6, 6.6, 0.9, 6.4],
  [4.4, 2.2, 1.4, 2],
];
// (the twig the ants march along: a stretch of it 6 m long, bark lit on top)
const twigPic = (m, bark) =>
  still(`ah-twig|${bark}`, m, 6, 0.6, 0, 0.3, (g, s) => {
    g.fillStyle = vgrad(g, -0.18 * s, 0.18 * s, [[0, mixHex(bark, '#ffe0a0', 0.4)], [0.4, bark], [1, mixHex(bark, '#000000', 0.5)]]);
    g.beginPath();
    g.moveTo(0, -0.16 * s);
    g.lineTo(6 * s, -0.12 * s);
    g.lineTo(6 * s, 0.14 * s);
    g.lineTo(0, 0.18 * s);
    g.fill();
    g.strokeStyle = 'rgba(30,15,5,0.4)';
    g.lineWidth = Math.max(1, 0.03 * s);
    g.beginPath();
    for (let k = 0; k < 9; k++) {
      const x = (k * 0.7 + 0.3 * hash(k, 3)) * s;
      g.moveTo(x, -0.05 * s);
      g.lineTo(x + 0.4 * s, 0.02 * s);
    }
    g.stroke();
  });
function near(f) {
  const { g, v, mf, t } = f,
    P = steady(f),
    r = row(f, 0.4),
    m = v.ppm,
    n = beatOf(f).n,
    base = r.base - lift(f, 0.13),
    dark = mixHex(P.near, '#0a0602', 0.45),
    rim = rgba(mixHex(GOLD, '#fff4d0', 0.3), 0.75),
    thistle = mixHex('#c050d0', P.near, 0.2),
    clover = mixHex(LEAF, P.near, 0.35),
    pebble = mixHex('#7a6a5a', P.near, 0.45),
    straw = mixHex(STRAW, P.near, 0.3);
  // (the bank they grow on, dark, its edge catching the light)
  g.fillStyle = dark;
  g.fillRect(r.L, base, r.R - r.L, 5 * m);
  g.fillStyle = rgba(GOLD, 0.25 + 0.2 * mf.kick);
  g.fillRect(r.L, base, r.R - r.L, 0.06 * m);
  const heads = [];
  cells(r, 3.1, (i, X, u) => {
    const kind = u < 0.35 ? 0 : u < 0.7 ? 1 : 2,
      sz = Math.floor(hash(i, kind + 2) * 3) / 2,
      c = nearPic(m, kind, sz, dark, rim, thistle, clover, pebble, straw),
      h = kind === 0 ? (7 + 2 * sz) * m : (3.5 + 1.5 * sz) * m,
      // (the thistles sway on the bass, the clover nods on the beat)
      lean = kind === 0 ? (Math.sin(t * 0.9 + i) * 0.4 * (0.4 + mf.bass) * m) / h : kind === 1 ? 0.08 * mf.beat * (i % 2 ? 1 : -1) : 0;
    stamp(g, c, X, base, m, 0, lean);
    if (kind === 0) heads.push(X + lean * h, base - h - 0.85 * m, (i + n) % 3 === 0);
    else if (kind === 1) heads.push(X + 0.4 * m + lean * h, base - h, false);
  });
  // (the thistles' crowns lit on the beat in turn, the hats sparkling on the clover's dew)
  for (let k = 0; k < heads.length; k += 3) {
    if (heads[k + 2]) glow(g, heads[k], heads[k + 1], 1.4 * m, '#ff8ae8', 0.25 + 0.5 * mf.beat);
    else glowDot(g, heads[k] + 0.3 * m, heads[k + 1] + 0.5 * m, (0.15 + 0.25 * mf.hat) * m, '#ffffff', 0.3 + 0.6 * mf.hat);
  }
  // (the twig across, and the column of ants marching along it, stepping on the beat, a straw or a leaf on every
  // other back)
  const ty = base - 2.4 * m,
    tw = twigPic(m, mixHex('#6a4a2a', P.near, 0.3));
  for (let i = Math.floor(r.x0 / 6) - 1; i < r.x1 / 6 + 1; i++) stamp(g, tw, r.X(i * 6), ty + Math.sin(i * 1.9) * 0.2 * m, m);
  const col = mixHex(CHITIN, P.near, 0.15),
    walk = t * 0.6;
  for (let i = Math.floor((r.x0 - walk) / 1.1) - 1; i < (r.x1 - walk) / 1.1 + 1; i++) {
    if (hash(i, 61) < 0.25) continue;
    const x = i * 1.1 + walk,
      c = antPic(m * 0.9, (n + i) % 2, i % 3 === 0 ? 1 : i % 5 === 0 ? 2 : 0, col);
    stamp(g, c, r.X(x), ty - 0.25 * m + Math.sin(Math.floor(x / 6) * 1.9) * 0.2 * m - 0.05 * m * mf.kick * ((n + i) % 2), m * 0.7);
  }
}

export const LANDMARKS = {
  // the anthill as tall as a mountain: a cone of needles and twigs lit on its sunny flank, spiralling rows of doorways
  // lit gold, lit brighter in turn round the spiral on the beat, straw cranes on its flanks swinging their loads, a glow
  // out of its top on a drop
  spire(f) {
    const { g, v, mf, T, t } = f,
      P = steady(f);
    mark(f, 0.06, 58, 0.8, 41, (X, B, up) => {
      const m = v.ppm * 0.9,
        body = mixHex('#6a3a1a', P.far, 0.35),
        n = beatOf(f).n,
        c = still(`ah-spire|${body}`, m, 28, 32, 14, 24, (g, s) => {
          const H = 22 * s,
            W = 13 * s;
          g.fillStyle = vgrad(g, -H, 8 * s, [[0, mixHex(body, '#ffd890', 0.25)], [0.6, body], [1, mixHex(body, '#000000', 0.3)]]);
          g.beginPath();
          g.moveTo(-W, 8 * s);
          g.quadraticCurveTo(-W * 0.45, -H * 0.7, -1.2 * s, -H);
          g.lineTo(1.2 * s, -H);
          g.quadraticCurveTo(W * 0.45, -H * 0.7, W, 8 * s);
          g.fill();
          // (its shady flank)
          g.fillStyle = 'rgba(30,10,0,0.28)';
          g.beginPath();
          g.moveTo(0.4 * s, -H);
          g.lineTo(1.2 * s, -H);
          g.quadraticCurveTo(W * 0.45, -H * 0.7, W, 8 * s);
          g.lineTo(W * 0.3, 8 * s);
          g.quadraticCurveTo(W * 0.2, -H * 0.5, 0.4 * s, -H);
          g.fill();
          // (its needles and twigs down its flanks)
          g.strokeStyle = 'rgba(42,20,8,0.4)';
          g.lineWidth = Math.max(1, 0.08 * s);
          g.beginPath();
          for (let k = 0; k < 70; k++) {
            const y = -H * (0.02 + 0.95 * hash(k, 3)),
              w = W * (1 - -y / (H * 1.1)) * 0.9,
              x = (hash(k, 4) - 0.5) * 2 * w;
            g.moveTo(x, y);
            g.lineTo(x + (hash(k, 5) - 0.5) * 1.2 * s, y + 0.7 * s);
          }
          g.stroke();
          g.strokeStyle = 'rgba(255,230,160,0.25)';
          g.beginPath();
          for (let k = 0; k < 30; k++) {
            const y = -H * (0.05 + 0.9 * hash(k, 13)),
              w = W * (1 - -y / (H * 1.1)) * 0.9,
              x = -hash(k, 14) * w;
            g.moveTo(x, y);
            g.lineTo(x - 0.6 * s, y + 0.4 * s);
          }
          g.stroke();
          // (its doorways in a spiral, each a little dark arch with a sill of gold)
          for (let k = 0; k < 18; k++) {
            const q = k / 18,
              y = -H * (0.08 + 0.85 * q),
              w = W * (1 - q * 0.85) * 0.75,
              x = Math.sin(q * 5 * TAU * 0.5 + 0.6) * w;
            g.fillStyle = '#1e0e04';
            g.beginPath();
            g.arc(x, y, 0.32 * s, Math.PI, TAU);
            g.lineTo(x + 0.32 * s, y + 0.3 * s);
            g.lineTo(x - 0.32 * s, y + 0.3 * s);
            g.fill();
            g.fillStyle = 'rgba(255,194,58,0.55)';
            g.fillRect(x - 0.36 * s, y + 0.28 * s, 0.72 * s, 0.08 * s);
          }
        }, 0.5),
        H = 22 * m,
        W = 13 * m;
      glow(g, X, B - H, 6 * m, GOLD, 0.12 + 0.35 * mf.drop);
      stamp(g, c, X, B, m, 0, 0, 1, 1, up);
      // (the doorways lit: a ring of them in turn on the beat, all on the kick a little)
      for (let k = 0; k < 18; k++) {
        const q = k / 18,
          y = B - H * (0.08 + 0.85 * q),
          w = W * (1 - q * 0.85) * 0.75,
          x = X + Math.sin(q * 5 * TAU * 0.5 + 0.6) * w,
          on = (k + n) % 6 === 0 ? 0.6 + 0.4 * mf.beat : 0.3 * mf.kick;
        if (on > 0.05) glowDot(g, x, y, 0.55 * m, (k + n) % 6 === 0 ? '#ffe08a' : GOLD, on);
      }
      // (two straw cranes on its flanks, their jibs swinging, a load hung on each)
      g.strokeStyle = mixHex(STRAW, T.far, 0.3);
      g.fillStyle = mixHex(LEAF, T.far, 0.3);
      for (const s of [-1, 1]) {
        const cx = X + s * W * 0.42,
          cy = B - H * 0.38,
          jib = s * (4 * m),
          sw = 0.15 * Math.sin(t * 0.8 + s),
          jx = cx + jib * Math.cos(sw);
        g.lineWidth = Math.max(1, 0.18 * m);
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx, cy - 4 * m);
        g.lineTo(jx, cy - 4 * m + jib * Math.sin(sw) * 0.3);
        g.moveTo(jx, cy - 4 * m);
        g.lineTo(jx, cy - 2.4 * m + 0.2 * m * Math.sin(t * 2));
        g.stroke();
        g.fillRect(jx - 0.4 * m, cy - 2.4 * m + 0.2 * m * Math.sin(t * 2), 0.8 * m, 0.5 * m);
      }
    });
  },
  // a wild orchid towering over the grass: a long arching stem, five flowers down it opening on a drop, glowing on the
  // kick
  orchid(f) {
    const { g, v, mf, T, t } = f,
      P = steady(f);
    mark(f, 0.08, 46, 0.75, 43, (X, B, up) => {
      const m = v.ppm * 0.9,
        top = B - 15 * m,
        sway = Math.sin(t * 0.5) * (0.6 + 0.6 * mf.bass) * m;
      g.strokeStyle = mixHex('#3a6a20', T.far, 0.3);
      g.lineWidth = Math.max(1, 0.35 * m);
      g.beginPath();
      g.moveTo(X, B + up);
      g.quadraticCurveTo(X - 2 * m, top + 4 * m, X + 5 * m + sway, top);
      g.stroke();
      // (its leaves at its foot)
      g.fillStyle = mixHex('#4a8a2a', T.far, 0.3);
      g.beginPath();
      for (const s of [-1, 1]) {
        g.moveTo(X + s * 2 * m + 3 * m, B + up * 0.6);
        g.ellipse(X + s * 2 * m, B + up * 0.6, 3 * m, 0.9 * m, s * 0.35, 0, TAU);
      }
      g.fill();
      const open = Math.max(mf.drop, 0.4 + 0.3 * mf.beat);
      for (let k = 0; k < 5; k++) {
        const fx = X + (4.8 - k * 0.2) * m + sway * (1 - k * 0.15),
          fy = top + (0.8 + k * 2.2) * m;
        orchid(g, fx, fy, (1.6 - k * 0.12) * m, mixHex(k % 2 ? ORCHID : '#f070d8', P.far, 0.2), open);
        if (mf.kick > 0.3) glow(g, fx, fy, 1.6 * m, '#fff0a0', 0.3 * mf.kick);
      }
    });
  },
  // a dandelion clock as tall as a tower: its stalk swaying, its globe of seeds, seeds blowing off it in a drift on the
  // kick and in a gust on a drop
  dandelion(f) {
    const { g, v, mf, T, t } = f,
      P = steady(f);
    mark(f, 0.07, 52, 0.75, 47, (X, B, up) => {
      const m = v.ppm * 0.9,
        sw = Math.sin(t * 0.6) * (0.8 + 0.8 * mf.bass) * m,
        top = B - 14 * m,
        cx = X + sw,
        seed = mixHex('#ffffff', P.far, 0.15);
      g.strokeStyle = mixHex('#7aa84a', T.far, 0.3);
      g.lineWidth = Math.max(1, 0.3 * m);
      g.beginPath();
      g.moveTo(X, B + up);
      g.quadraticCurveTo(X - 0.5 * m, top + 6 * m, cx, top);
      g.stroke();
      glow(g, cx, top, 4.5 * m, '#ffffff', 0.18 + 0.15 * mf.kick);
      // (the globe: its seeds' threads out from the head, a tuft at each end, painted once; turning a little in the wind)
      const c = still(`ah-clock|${seed}`, m, 8, 8, 4, 4, (g, s) => {
        const R = 3.2 * s;
        g.strokeStyle = rgba(seed, 0.7);
        g.lineWidth = Math.max(1, 0.05 * s);
        g.beginPath();
        for (let k = 0; k < 48; k++) {
          const a = (k / 48) * TAU + hash(k, 3) * 0.1;
          g.moveTo(0, 0);
          g.lineTo(Math.cos(a) * R, Math.sin(a) * R);
        }
        g.stroke();
        g.fillStyle = rgba(seed, 0.85);
        g.beginPath();
        for (let k = 0; k < 48; k++) {
          const a = (k / 48) * TAU + hash(k, 3) * 0.1,
            x = Math.cos(a) * R,
            y = Math.sin(a) * R;
          g.moveTo(x + 0.2 * s, y);
          g.arc(x, y, 0.2 * s, 0, TAU);
        }
        g.fill();
        g.fillStyle = '#c8a060';
        g.beginPath();
        g.arc(0, 0, 0.6 * s, 0, TAU);
        g.fill();
      });
      stamp(g, c, cx, top, m, 0.1 * Math.sin(t * 0.4) + 0.05 * mf.kick, 0, 1 + 0.04 * mf.kick, 1 + 0.04 * mf.kick);
      // (seeds blowing off it, more on the kick, a gust of them in a drop)
      const nS = 4 + Math.round(10 * mf.drop + 4 * mf.kick);
      g.strokeStyle = rgba(seed, 0.8);
      g.lineWidth = Math.max(1, 0.05 * m);
      g.beginPath();
      for (let k = 0; k < nS; k++) {
        const q = (((t * 0.25 + hash(k, 5)) % 1) + 1) % 1,
          x = cx + q * 14 * m + Math.sin(t * 2 + k) * m,
          y = top - q * 6 * m + hash(k, 6) * 4 * m;
        g.moveTo(x, y);
        g.lineTo(x - 0.4 * m, y + 0.3 * m);
        g.moveTo(x + 0.25 * m, y);
        g.arc(x, y, 0.25 * m, 0, Math.PI, true);
      }
      g.stroke();
    });
  },
};

// ---- the ground: the anthill cut away
// (a stretch of it 4.4 m long: a crust of grains on top, a gallery under it in a golden lattice (dim: its light is
// laid over it on the kick), round chambers off it, the soil's layers; v which of its two chambers are dug)
const groundPic = (m, v) =>
  still(`ah-ground|${v}`, m, 4.4, 3.4, 0, 0.1, (g, s) => {
    const W = 4.4 * s;
    g.fillStyle = 'rgba(90,50,20,0.35)';
    for (const d of [0.6, 1.75, 2.9]) g.fillRect(0, d * s, W, 0.06 * s);
    // (the grains of the crust, lit on top)
    for (let k = 0; k < 13; k++) {
      const x = (k * 0.35 + 0.17) * s,
        u = hash(k + v * 13, 91);
      g.fillStyle = u < 0.5 ? '#c8904a' : u < 0.8 ? '#8a5a2a' : '#e8c070';
      g.beginPath();
      g.ellipse(x, 0.18 * s, (0.1 + 0.08 * u) * s, (0.07 + 0.04 * u) * s, u * 3, 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(255,240,200,0.35)';
      g.beginPath();
      g.ellipse(x - 0.03 * s, 0.14 * s, 0.05 * s, 0.025 * s, 0, 0, TAU);
      g.fill();
    }
    // (the gallery: a dark band with a dim lattice)
    const gy = 1.1 * s;
    g.fillStyle = vgrad(g, gy - 0.4 * s, gy + 0.4 * s, [[0, '#0e0602'], [0.5, '#2a1406'], [1, '#0e0602']]);
    g.fillRect(0, gy - 0.4 * s, W, 0.8 * s);
    g.strokeStyle = 'rgba(255,194,58,0.3)';
    g.lineWidth = Math.max(1, 0.05 * s);
    g.beginPath();
    for (let k = 0; k <= 8; k++) {
      const x = k * 0.5 * s;
      g.moveTo(x, gy - 0.4 * s);
      g.lineTo(x + 0.25 * s, gy);
      g.lineTo(x, gy + 0.4 * s);
    }
    g.stroke();
    // (its chambers: round, dark, a rim of packed earth)
    for (let q = 0; q < 2; q++) {
      if (!((v >> q) & 1)) continue;
      const x = (q * 2.2 + 1.1) * s,
        y = 2.3 * s;
      g.fillStyle = '#4a2a10';
      g.beginPath();
      g.ellipse(x, y, 1.0 * s, 0.65 * s, 0, 0, TAU);
      g.fill();
      g.fillStyle = vgrad(g, y - 0.55 * s, y + 0.55 * s, [[0, '#080402'], [1, '#2a1406']]);
      g.beginPath();
      g.ellipse(x, y, 0.9 * s, 0.55 * s, 0, 0, TAU);
      g.fill();
    }
  });
// (the lattice's light, laid over the gallery on the kick)
const latticePic = m =>
  still('ah-lattice', m, 4.4, 1, 0, 0.5, (g, s) => {
    g.strokeStyle = GOLD;
    g.lineWidth = Math.max(1, 0.06 * s);
    g.beginPath();
    for (let k = 0; k <= 8; k++) {
      const x = k * 0.5 * s;
      g.moveTo(x, -0.4 * s);
      g.lineTo(x + 0.25 * s, 0);
      g.lineTo(x, 0.4 * s);
    }
    g.stroke();
  });

export default {
  sky,
  far,
  near,
  back(f) {
    for (const l of f.look.landmarks) LANDMARKS[l]?.(f);
    far(f);
    near(f);
  },
  // the anthill cut away: a crust of grains and needles on top, under it a gallery in a golden lattice (the video's
  // tunnel) lit in a wave on the kick, chambers glowing in turn on the beat, ants filing along the gallery
  ground(f, a, b, y) {
    const { g, v, mf, t } = f,
      s = slab(f, a, b, y, '#3a2010', mixHex(STRAW, '#8a5a2a', 0.4));
    if (!s) return;
    const m = v.ppm,
      n = beatOf(f).n,
      gy = s.Y + 1.1 * m,
      lat = latticePic(m),
      k0 = Math.floor(s.a / 4.4),
      k1 = Math.ceil(s.b / 4.4);
    // (clipped to the stretch: its tiles run on past its ends)
    g.save();
    g.beginPath();
    g.rect(s.X0, s.Y, s.X1 - s.X0, v.H * 2);
    g.clip();
    for (let k = k0; k < k1; k++) stamp(g, groundPic(m, Math.floor(hash(k, 93) * 4)), v.sx(k * 4.4), s.Y, m);
    g.globalCompositeOperation = 'lighter';
    for (let k = k0; k < k1; k++) {
      // (the light runs along the lattice on the kick, a wave from him outward)
      g.globalAlpha = Math.min(1, 0.15 + 0.6 * mf.kick * (0.5 + 0.5 * Math.sin(k * 1.7 - t * 6)));
      stamp(g, lat, v.sx(k * 4.4), gy, m);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.restore();
    // (the chambers lit gold in turn on the beat)
    for (let k = k0; k < k1; k++) {
      const vv = Math.floor(hash(k, 93) * 4);
      for (let q = 0; q < 2; q++) if ((vv >> q) & 1) glow(g, v.sx(k * 4.4 + q * 2.2 + 1.1), s.Y + 2.3 * m, 1.1 * m, GOLD, (k * 2 + q + n) % 4 === 0 ? 0.5 + 0.5 * mf.beat : 0.18);
    }
    // (ants filing along the gallery, one path)
    g.fillStyle = '#0e0603';
    g.beginPath();
    for (let k = Math.floor(s.a / 0.9) - 1; k < s.b / 0.9 + 1; k++) {
      if (hash(k, 95) < 0.5) continue;
      const x = k * 0.9 + ((t * 0.5) % 0.9);
      for (const [dx, r] of ANT_DOTS) {
        const X = v.sx(x + dx);
        g.moveTo(X + r * m, gy + 0.18 * m);
        g.arc(X, gy + 0.18 * m, r * m, 0, TAU);
      }
    }
    g.fill();
    edge(f, s, GOLD);
  },
  // the pictures painted while the song loads, in its palette and its drop's (world/render.js warmWorld)
  warm(f) {
    const { v } = f,
      S = Math.min(v.W, v.H),
      R0 = sizeStep(S * 0.1),
      P = steady(f),
      front = mixHex(P.far, '#3a5a20', 0.4),
      stem = mixHex(front, '#2a4a14', 0.3),
      col = mixHex(CHITIN, P.near, 0.15);
    (manePic(R0), discPic(R0), raysPic(R0), sparklePic(sizeStep(S * 0.05)));
    for (const c of ['#fff0c0', ORCHID2]) hexPic(sizeStep(S * 0.05), c);
    for (const m of [v.ppm, v.ppm * 0.9]) {
      hazeStrip(f, m, mixHex(P.far, '#c8a860', 0.25));
      for (let kind = 0; kind < 3; kind++)
        for (let hb = 0; hb < 3; hb++) for (const orch of [ORCHID, '#f0c0e8']) bladePic(m, kind, hb, front, stem, mixHex(orch, P.far, 0.25));
      for (let w = 0; w < 4; w++) groundPic(m, w);
      latticePic(m);
      for (let step = 0; step < 2; step++) for (let load = 0; load < 3; load++) antPic(m * 0.9, step, load, col);
      const dark = mixHex(P.near, '#0a0602', 0.45),
        rim = rgba(mixHex(GOLD, '#fff4d0', 0.3), 0.75);
      for (let kind = 0; kind < 3; kind++)
        for (let sz = 0; sz <= 1; sz += 0.5) nearPic(m, kind, sz, dark, rim, mixHex('#c050d0', P.near, 0.2), mixHex(LEAF, P.near, 0.35), mixHex('#7a6a5a', P.near, 0.45), mixHex(STRAW, P.near, 0.3));
      twigPic(m, mixHex('#6a4a2a', P.near, 0.3));
    }
  },
};
const ANT_DOTS = [
  [-0.12, 0.06],
  [0, 0.04],
  [0.11, 0.05],
];
