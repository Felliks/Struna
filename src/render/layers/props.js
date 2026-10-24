// The props (kinds.js bat, pick, throw; level.js lays them; props.js says what they are in the song's world): a clone
// on a rooftop past the road throwing a thing at him and knocked off it when he bats it home; a thing on the roof he
// scoops up on the run, carries and throws at a threat ahead (each world's own: a hornet hive, a jellyfish, a vulture,
// a fire spirit, a ghost, a camera on a cable, a sniper on a rooftop...), taking it out before it fires on him. All of
// it drawn in the place's palette (f.T), lit on the kick, each world's own things.
// (fast to draw: what does not move is painted once into a sprite (an offscreen canvas per thing, per palette, per
// screen resolution, built when the level loads: warmProps) and only blitted while it plays; what moves (a rotor's
// blur, a flame, a tentacle, a beam) is a few strokes and glow sprites; no blurred shadows, no filters)
import { JI } from '../../lib/skeleton.js';
import { frameOf } from '../../anim.js';
import { MOVE_COLOUR } from '../../hints.js';
import { PROP_TAKES } from '../../anim.js';
import { threatX, throwerX, themeOf } from '../../props.js';
import { PLACE_TAGS } from '../../world/places.js';
import { glowDot, hash, mixHex, onScreen, rgba } from '../util.js';
import { drawClone } from './clones.js';
import { ophan as ophanWheel, warmEyes } from '../angels.js';

const TAU = Math.PI * 2,
  KICK = MOVE_COLOUR.kick,
  SIGHT = '#ff2b3a',
  HOT = '#fff3b0',
  EDGE = '#0b0b10',
  SMOKE = '#2a2a31',
  clamp01 = u => Math.max(0, Math.min(1, u)),
  ease = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u)),
  // (overshooting a little and settling: a thing put in place with a snap)
  back = u => (u <= 0 ? 0 : u >= 1 ? 1 : 1 + 2.4 * (u - 1) ** 3 + 1.4 * (u - 1) ** 2),
  lerp = (a, b, u) => a + (b - a) * u;
// the world's props (its base place's, props.js)
const theme = f => themeOf(f.place, PLACE_TAGS[f.place]);
// a thing's note's place for the hints layer (as obstacles.js marks its own)
const mark = (f, o, X, Y) => f.marks?.set(o, onScreen(f.g, X, Y));

// ---- sprites: a thing painted once, in metres (y down, its anchor at the origin), into a canvas at RES pixels a
// metre (the screen's own scale, rounded up), in the palette quantized (so a palette drifting with the song's hour
// remakes it a few times a song, not every frame); the least used dropped past a few dozen
const SPR = new Map(),
  q = hex => {
    const n = parseInt(hex.slice(1), 16),
      c = s => Math.min(255, Math.round(((n >> s) & 255) / 17) * 17);
    return '#' + ((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0');
  },
  PALS = new WeakMap(),
  PKEYS = new Map();
// the palette as the sprites see it, quantized, with its key (a short number: palettes that quantize alike share it);
// looked up by the palette itself (look.js hands out the same object for the same moment)
function palOf(T) {
  let P = PALS.get(T);
  if (!P) {
    P = { near: q(T.near), far: q(T.far), line: q(T.line), win: [q(T.win[0]), q(T.win[1] ?? T.win[0]), q(T.win[2])], sky1: q(T.sky[1]) };
    const k = P.near + P.far + P.line + P.win.join('') + P.sky1;
    if (!PKEYS.has(k)) PKEYS.set(k, PKEYS.size + 1);
    P.key = PKEYS.get(k);
    PALS.set(T, P);
  }
  return P;
}
// the sprites' scale: the screen's pixels a metre, rounded up a step (a zoom punch on the kick barely softens them)
const resOf = v => Math.min(320, Math.max(32, Math.ceil(((v.ppm0 ?? v.ppm) * 1.25) / 16) * 16));
// a sprite { c, ox, oy, res }: def [w, h, ox, oy, paint(x, P, mat)] in metres
function sprite(id, def, P, mat, res) {
  const key = id + '|' + mat + '|' + P.key + '|' + res;
  let s = SPR.get(key);
  if (s) {
    SPR.delete(key);
    SPR.set(key, s);
    return s;
  }
  const [w, h, ox, oy, paint] = def,
    c = Object.assign(document.createElement('canvas'), { width: Math.ceil(w * res), height: Math.ceil(h * res) }),
    x = c.getContext('2d');
  x.scale(res, res);
  x.translate(ox, oy);
  x.lineJoin = 'round';
  x.lineCap = 'round';
  x.strokeStyle = EDGE;
  paint(x, P, mat);
  s = { c, ox, oy, res };
  SPR.set(key, s);
  if (SPR.size > 72) SPR.delete(SPR.keys().next().value);
  return s;
}
// a sprite blitted with its anchor at screen (X, Y), m pixels a metre, turned rot, scaled (sx, sy)
function blit(g, s, X, Y, m, rot = 0, sx = 1, sy = 1) {
  const k = m / s.res,
    W = s.c.width * k,
    H = s.c.height * k;
  if (!rot && sx === 1 && sy === 1) return g.drawImage(s.c, X - s.ox * m, Y - s.oy * m, W, H);
  g.save();
  g.translate(X, Y);
  if (rot) g.rotate(rot);
  if (sx !== 1 || sy !== 1) g.scale(sx, sy);
  g.drawImage(s.c, -s.ox * m, -s.oy * m, W, H);
  g.restore();
}
// glitched in (a copy being pasted by the cursor): in horizontal slices thrown sideways and dropping out, settling
function blitGlitch(g, s, X, Y, m, gl, t, seed = 0) {
  if (gl <= 0.02) return blit(g, s, X, Y, m);
  const k = m / s.res,
    n = 6,
    sh = s.c.height / n,
    fr = Math.floor(t * 40);
  for (let i = 0; i < n; i++) {
    const h = hash(i + seed * 7, fr);
    if (h < 0.3 * gl) continue;
    const dx = (hash(fr, i + 31) - 0.5) * 1.2 * gl * m;
    g.drawImage(s.c, 0, i * sh, s.c.width, sh, X - s.ox * m + dx, Y - s.oy * m + i * sh * k, s.c.width * k, sh * k);
  }
}
// the materials a shared thing is skinned in (its body and its light), pulled toward the song's palette
const MATS = {
  metal: ['#4a5264', '#b4bdcc'],
  neon: ['#2a2050', '#8f80e6'],
  rust: ['#4a3426', '#b0703e'],
  gold: ['#4a3a14', '#e0b448'],
  stone: ['#5d5b57', '#a8a49a'],
  iron: ['#25232b', '#64606e'],
  wood: ['#4a3020', '#946036'],
  ice: ['#5f98b8', '#e4f6ff'],
  crystal: ['#43277e', '#d0a8ff'],
  coral: ['#1d3a58', '#62b6d6'],
  paper: ['#3a2a2e', '#c08a6a'],
};
const matOf = (P, mat) => {
  const [a, b] = MATS[mat] ?? MATS.metal;
  return [mixHex(a, P.near, 0.22), mixHex(b, P.near, 0.15)];
};
// painting helpers (in a sprite's metres)
function rr(x, X, Y, W, H, R, fill, lw = 0.045) {
  x.beginPath();
  x.roundRect(X, Y, W, H, R);
  x.fillStyle = fill;
  x.fill();
  if (lw) {
    x.lineWidth = lw;
    x.strokeStyle = EDGE;
    x.stroke();
  }
}
function polyP(x, pts, fill, lw = 0.045) {
  x.beginPath();
  pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
  x.closePath();
  x.fillStyle = fill;
  x.fill();
  if (lw) {
    x.lineWidth = lw;
    x.strokeStyle = EDGE;
    x.stroke();
  }
}
function discP(x, X, Y, R, fill, lw = 0.045) {
  x.beginPath();
  x.arc(X, Y, R, 0, TAU);
  x.fillStyle = fill;
  x.fill();
  if (lw) {
    x.lineWidth = lw;
    x.strokeStyle = EDGE;
    x.stroke();
  }
}
function lineP(x, pts, col, lw) {
  x.beginPath();
  pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
  x.strokeStyle = col;
  x.lineWidth = lw;
  x.stroke();
}
// a flame: a tongue of fire, outer colour to its white heart (a sprite of its own, scaled and flickered as it burns)
const flameDef = (outer, inner) => [
  0.8,
  1.2,
  0.4,
  0.95,
  x => {
    for (const [s, col, a] of [[1, outer, 0.9], [0.66, inner, 1], [0.34, '#ffffff', 0.95]]) {
      x.beginPath();
      x.moveTo(0, 0.2 * s);
      x.bezierCurveTo(-0.38 * s, 0.1 * s, -0.36 * s, -0.35 * s, -0.08 * s, -0.55 * s);
      x.quadraticCurveTo(0, -0.95 * s, 0.02 * s, -0.9 * s);
      x.quadraticCurveTo(0.1 * s, -0.6 * s, 0.22 * s, -0.48 * s);
      x.bezierCurveTo(0.4 * s, -0.25 * s, 0.38 * s, 0.1 * s, 0, 0.2 * s);
      x.globalAlpha = a;
      x.fillStyle = col;
      x.fill();
    }
    x.globalAlpha = 1;
  },
];
// (what is painted without the palette: keyed only by its own colours)
const NOPAL = { key: 0 };
const FLAMES = new Map();
const flameOf = (f, outer, inner) => {
  const id = outer + inner;
  if (!FLAMES.has(id)) FLAMES.set(id, flameDef(outer, inner));
  return sprite('flame' + id, FLAMES.get(id), NOPAL, '', resOf(f.v));
};
// a jet: a thruster's cone of light fading off (down), in colour col
const JETS = new Map();
const jetOf = (f, col) => {
  if (!JETS.has(col))
    JETS.set(col, [
      0.4,
      1,
      0.2,
      0,
      x => {
        const gr = x.createLinearGradient(0, 0, 0, 1);
        gr.addColorStop(0, rgba('#ffffff', 0.95));
        gr.addColorStop(0.15, rgba(col, 0.85));
        gr.addColorStop(1, rgba(col, 0));
        x.fillStyle = gr;
        x.beginPath();
        x.moveTo(-0.16, 0);
        x.lineTo(0.16, 0);
        x.lineTo(0.02, 1);
        x.lineTo(-0.02, 1);
        x.closePath();
        x.fill();
      },
    ]);
  return sprite('jet' + col, JETS.get(col), NOPAL, '', resOf(f.v));
};

// ---- the things themselves, at screen (X, Y), r pixels across its middle, turned by rot; hot: burning, batted home
// (each a few paths in its own material, pulled toward the song's palette, its rim lit in the place's accent: painted
// once a palette into a sprite a unit across (r), its glow a live sprite under it, lit on the kick)
const THING = {
  bottle(x, P, mat) {
    rr(x, -0.45, -0.3, 0.9, 1.3, 0.3, rgba(mat('#3fe08a'), 0.92), 0.14);
    rr(x, -0.16, -0.95, 0.32, 0.7, 0.02, rgba(mat('#3fe08a'), 0.92), 0.14);
    x.fillStyle = rgba('#ffffff', 0.75);
    x.fillRect(-0.3, -0.1, 0.12, 0.8);
  },
  brick(x, P, mat) {
    rr(x, -0.9, -0.45, 1.8, 0.9, 0.04, mat('#c8442e'), 0.14);
    lineP(x, [[-0.9, 0], [0.9, 0]], EDGE, 0.12);
    lineP(x, [[0, -0.45], [0, 0]], EDGE, 0.12);
    lineP(x, [[-0.45, 0], [-0.45, 0.45]], EDGE, 0.12);
    lineP(x, [[0.45, 0], [0.45, 0.45]], EDGE, 0.12);
    x.fillStyle = rgba('#ffffff', 0.2);
    x.fillRect(-0.8, -0.38, 1.6, 0.1);
  },
  cube: (x, P) => cubeP(x, P.line, false),
  datacube: (x, P) => cubeP(x, mixHex(P.line, '#7ff3ff', 0.5), true),
  glowstick(x, P) {
    rr(x, -0.2, -1, 0.4, 2, 0.2, mixHex(P.line, '#ffffff', 0.45), 0.14);
    x.fillStyle = rgba('#ffffff', 0.8);
    x.fillRect(-0.08, -0.8, 0.07, 1.5);
  },
  cone(x, P, mat) {
    x.beginPath();
    x.ellipse(0, 0, 0.6, 0.95, 0, 0, TAU);
    x.fillStyle = mat('#8a5a32');
    x.fill();
    x.lineWidth = 0.14;
    x.stroke();
    x.strokeStyle = mat('#4a2c16');
    for (let i = -2; i <= 2; i++) {
      x.beginPath();
      x.arc(0, i * 0.32 - 0.3, 0.55, 0.25 * Math.PI, 0.75 * Math.PI);
      x.stroke();
    }
  },
  rock(x, P, mat) {
    polyP(x, [[-0.85, 0.2], [-0.55, -0.6], [0.1, -0.85], [0.75, -0.4], [0.9, 0.3], [0.35, 0.8], [-0.5, 0.7]], mat('#8d8a86'), 0.14);
    x.fillStyle = rgba('#ffffff', 0.25);
    x.beginPath();
    x.ellipse(-0.2, -0.35, 0.3, 0.15, -0.4, 0, TAU);
    x.fill();
  },
  lava(x, P, mat) {
    polyP(x, [[-0.85, 0.2], [-0.55, -0.6], [0.1, -0.85], [0.75, -0.4], [0.9, 0.3], [0.35, 0.8], [-0.5, 0.7]], mat('#3a2422'), 0.14);
    lineP(x, [[-0.5, -0.2], [0, 0.1], [0.5, -0.3]], '#ff7a2a', 0.2);
    lineP(x, [[0, 0.1], [0.1, 0.6]], '#ff7a2a', 0.2);
    lineP(x, [[-0.5, -0.2], [0, 0.1], [0.5, -0.3]], '#ffd27a', 0.07);
  },
  jar(x, P, mat) {
    x.beginPath();
    x.moveTo(-0.3, -0.85);
    x.lineTo(0.3, -0.85);
    x.quadraticCurveTo(0.2, -0.55, 0.75, -0.1);
    x.quadraticCurveTo(0.95, 0.6, 0.35, 0.9);
    x.lineTo(-0.35, 0.9);
    x.quadraticCurveTo(-0.95, 0.6, -0.75, -0.1);
    x.quadraticCurveTo(-0.2, -0.55, -0.3, -0.85);
    x.fillStyle = mat('#c4743c');
    x.fill();
    x.lineWidth = 0.14;
    x.stroke();
    lineP(x, [[-0.8, 0.15], [0.8, 0.15]], rgba(P.win[0], 0.85), 0.14);
    x.fillStyle = rgba('#ffffff', 0.3);
    x.fillRect(-0.5, -0.2, 0.12, 0.6);
  },
  bolt(x, P, mat) {
    polyP(x, [[-0.8, -0.45], [0, -0.9], [0.8, -0.45], [0.8, 0.45], [0, 0.9], [-0.8, 0.45]], mat('#9aa0a8'), 0.14);
    discP(x, 0, 0, 0.35, mixHex(P.near, '#000000', 0.4), 0.14);
    x.fillStyle = rgba('#ffffff', 0.75);
    x.fillRect(-0.6, -0.4, 0.15, 0.6);
  },
  gear(x, P, mat) {
    x.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU,
        r = i % 2 ? 0.7 : 0.95;
      x.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    x.closePath();
    x.fillStyle = mat('#b08a4a');
    x.fill();
    x.lineWidth = 0.14;
    x.stroke();
    discP(x, 0, 0, 0.3, mixHex(P.near, '#000000', 0.4), 0.14);
  },
  coconut(x, P, mat) {
    discP(x, 0, 0, 0.85, mat('#6b4428'), 0.14);
    for (const [a, b] of [[-0.25, -0.2], [0.2, -0.25], [0, 0.15]]) discP(x, a, b, 0.12, '#2a1608', 0);
  },
  shell(x, P, mat) {
    x.beginPath();
    x.moveTo(0, 0.8);
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * (1 + i / 8);
      x.lineTo(Math.cos(a) * 0.95, Math.sin(a) * 0.95 + 0.15);
    }
    x.closePath();
    x.fillStyle = mat('#f2b6a0');
    x.fill();
    x.lineWidth = 0.14;
    x.stroke();
    for (let i = 1; i < 8; i += 2) {
      const a = Math.PI * (1 + i / 8);
      lineP(x, [[0, 0.8], [Math.cos(a) * 0.9, Math.sin(a) * 0.9 + 0.15]], EDGE, 0.1);
    }
  },
  snowball(x, P) {
    discP(x, 0, 0, 0.85, '#f4fbff', 0.14);
    discP(x, 0.15, 0.15, 0.6, rgba(mixHex('#9fc6e8', P.sky1, 0.3), 0.6), 0);
    discP(x, -0.25, -0.3, 0.22, '#ffffff', 0);
  },
  ice: (x, P) => crystalP(x, '#bfeeff'),
  crystal: (x, P) => crystalP(x, mixHex('#c27bff', P.line, 0.3)),
  can(x, P, mat) {
    rr(x, -0.5, -0.85, 1, 1.7, 0.15, mat('#d22a3c'), 0.14);
    x.fillStyle = mixHex(P.win[0], '#ffffff', 0.4);
    x.fillRect(-0.5, -0.2, 1, 0.4);
    x.fillStyle = rgba('#ffffff', 0.75);
    x.fillRect(-0.35, -0.75, 0.12, 1.4);
  },
  skull(x) {
    x.beginPath();
    x.arc(0, -0.15, 0.8, Math.PI * 0.85, Math.PI * 2.15);
    x.lineTo(0.45, 0.85);
    x.lineTo(-0.45, 0.85);
    x.closePath();
    x.fillStyle = '#ecebe2';
    x.fill();
    x.lineWidth = 0.14;
    x.stroke();
    x.fillStyle = EDGE;
    for (const a of [-0.32, 0.32]) {
      x.beginPath();
      x.ellipse(a, 0, 0.22, 0.26, 0, 0, TAU);
      x.fill();
    }
    for (let i = -1; i <= 1; i++) x.fillRect(i * 0.22 - 0.04, 0.55, 0.08, 0.3);
  },
  bone(x) {
    x.lineWidth = 0.14;
    x.fillStyle = '#ecebe2';
    x.fillRect(-0.75, -0.16, 1.5, 0.32);
    x.strokeRect(-0.75, -0.16, 1.5, 0.32);
    for (const a of [-0.8, 0.8]) for (const b of [-0.25, 0.25]) discP(x, a, b, 0.25, '#ecebe2', 0.14);
    x.fillStyle = '#ecebe2';
    x.fillRect(-0.7, -0.14, 1.4, 0.28);
  },
  ball(x, P, mat) {
    discP(x, 0, 0, 0.9, mat('#e8742a'), 0.14);
    x.beginPath();
    x.moveTo(-0.9, 0);
    x.lineTo(0.9, 0);
    x.moveTo(0, -0.9);
    x.lineTo(0, 0.9);
    x.moveTo(-0.6, -0.65);
    x.quadraticCurveTo(-0.1, 0, -0.6, 0.65);
    x.moveTo(0.6, -0.65);
    x.quadraticCurveTo(0.1, 0, 0.6, 0.65);
    x.lineWidth = 0.12;
    x.strokeStyle = EDGE;
    x.stroke();
  },
  dice(x, P) {
    rr(x, -0.8, -0.8, 1.6, 1.6, 0.25, '#f6f2ea', 0.14);
    x.fillStyle = mixHex('#d22a3c', P.line, 0.3);
    for (const [a, b] of [[-0.4, -0.4], [0.4, 0.4], [0, 0], [0.4, -0.4], [-0.4, 0.4]]) discP(x, a, b, 0.14, x.fillStyle, 0);
  },
  chip(x, P) {
    discP(x, 0, 0, 0.9, mixHex('#d22a3c', P.line, 0.25), 0.14);
    x.strokeStyle = '#ffffff';
    x.lineWidth = 0.22;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      x.beginPath();
      x.arc(0, 0, 0.78, a, a + 0.35);
      x.stroke();
    }
    discP(x, 0, 0, 0.45, '#f6f2ea', 0.14);
  },
  // (ATL's pack's: a kettlebell cast as a grinning cartoon skull ("Тяжесть"), a record, a cassette, a radio valve)
  kettlebell(x) {
    lineP(x, [[-0.45, -0.3], [-0.4, -0.85], [0.4, -0.85], [0.45, -0.3]], EDGE, 0.3);
    lineP(x, [[-0.45, -0.3], [-0.4, -0.85], [0.4, -0.85], [0.45, -0.3]], '#2a2a30', 0.16);
    discP(x, 0, 0.2, 0.72, '#26262c', 0.14);
    for (const a of [-0.26, 0.26]) discP(x, a, 0.1, 0.16, '#0a0a0c', 0);
    polyP(x, [[-0.06, 0.32], [0.06, 0.32], [0, 0.42]], '#0a0a0c', 0);
    x.fillStyle = '#d8d6d0';
    for (let i = 0; i < 4; i++) x.fillRect(-0.27 + i * 0.15, 0.55, 0.1, 0.16);
    x.fillStyle = rgba('#ffffff', 0.25);
    x.fillRect(-0.45, -0.1, 0.12, 0.5);
  },
  vinyl(x, P) {
    discP(x, 0, 0, 0.9, '#0c0c10', 0.14);
    x.strokeStyle = rgba('#ffffff', 0.18);
    x.lineWidth = 0.04;
    for (const r of [0.75, 0.62, 0.5]) {
      x.beginPath();
      x.arc(0, 0, r, 0, TAU);
      x.stroke();
    }
    discP(x, 0, 0, 0.32, mixHex('#ff2fd0', P.line, 0.3), 0);
    discP(x, 0, 0, 0.07, '#0c0c10', 0);
    x.fillStyle = rgba('#ffffff', 0.4);
    x.fillRect(-0.55, -0.5, 0.3, 0.06);
  },
  cassette(x, P) {
    rr(x, -0.95, -0.6, 1.9, 1.2, 0.1, '#2a2a30', 0.14);
    rr(x, -0.75, -0.45, 1.5, 0.55, 0.06, mixHex('#ffb040', P.win[0], 0.3), 0.06);
    for (const a of [-0.38, 0.38]) {
      discP(x, a, -0.17, 0.17, '#f0ece4', 0.05);
      discP(x, a, -0.17, 0.06, '#2a2a30', 0);
    }
    polyP(x, [[-0.5, 0.6], [-0.4, 0.3], [0.4, 0.3], [0.5, 0.6]], '#4a4a52', 0.06);
  },
  tube(x) {
    rr(x, -0.4, 0.45, 0.8, 0.45, 0.06, '#3a3a40', 0.14);
    x.beginPath();
    x.moveTo(-0.38, 0.45);
    x.lineTo(-0.38, -0.5);
    x.quadraticCurveTo(-0.38, -0.95, 0, -0.95);
    x.quadraticCurveTo(0.38, -0.95, 0.38, -0.5);
    x.lineTo(0.38, 0.45);
    x.closePath();
    x.fillStyle = rgba('#d8f0ff', 0.45);
    x.fill();
    x.lineWidth = 0.12;
    x.stroke();
    rr(x, -0.2, -0.4, 0.4, 0.6, 0.04, '#9aa3ad', 0.04);
    discP(x, 0, 0.05, 0.12, '#ffb040', 0);
  },
  // (the favourites' worlds': a sugar cube for the anthill, a head of lettuce for the green Earth, a seed for the
  // compost garden)
  sugar(x) {
    polyP(x, [[-0.7, -0.35], [0, -0.75], [0.7, -0.35], [0.7, 0.45], [0, 0.85], [-0.7, 0.45]], '#f4f0e8', 0.14);
    polyP(x, [[-0.7, -0.35], [0, -0.75], [0.7, -0.35], [0, 0.05]], '#ffffff', 0);
    polyP(x, [[0, 0.05], [0.7, -0.35], [0.7, 0.45], [0, 0.85]], '#dcd6c8', 0);
    x.fillStyle = rgba('#c8c0b0', 0.8);
    for (let i = 0; i < 6; i++) x.fillRect(-0.5 + hash(i, 3) * 1.0, -0.3 + hash(i, 4) * 0.9, 0.08, 0.08);
  },
  lettuce(x) {
    discP(x, 0, 0.05, 0.85, '#5ab83a', 0.14);
    for (const [cx, cy, r, c] of [[-0.35, -0.15, 0.45, '#7ad04a'], [0.3, -0.2, 0.42, '#8ae05a'], [0, 0.25, 0.48, '#6ac83a'], [0, -0.35, 0.3, '#b8f07a']]) discP(x, cx, cy, r, c, 0.05);
    lineP(x, [[0, 0.7], [0, -0.2]], rgba('#e8ffd0', 0.7), 0.06);
  },
  seed(x) {
    x.beginPath();
    x.ellipse(0, 0, 0.55, 0.8, 0.3, 0, TAU);
    x.fillStyle = '#8a5a2a';
    x.fill();
    x.lineWidth = 0.14;
    x.stroke();
    lineP(x, [[-0.15, -0.6], [0.2, 0.6]], '#5a3a1a', 0.06);
    lineP(x, [[0.1, -0.75], [0.25, -1.0]], '#5ae04a', 0.12);
    polyP(x, [[0.25, -1.0], [0.6, -1.05], [0.35, -0.85]], '#5ae04a', 0.05);
  },
};

function cubeP(x, col, data) {
  polyP(x, [[0, -0.85], [0.75, -0.45], [0.75, 0.45], [0, 0.85], [-0.75, 0.45], [-0.75, -0.45]], rgba(mixHex(col, '#000000', 0.55), 0.95), 0.14);
  polyP(x, [[0, -0.85], [0.75, -0.45], [0, -0.05], [-0.75, -0.45]], rgba(mixHex(col, '#000000', 0.25), 0.95), 0);
  x.beginPath();
  x.moveTo(-0.75, -0.45);
  x.lineTo(0, -0.05);
  x.lineTo(0.75, -0.45);
  x.moveTo(0, -0.05);
  x.lineTo(0, 0.85);
  if (data) {
    x.moveTo(-0.5, 0.05);
    x.lineTo(-0.5, 0.45);
    x.lineTo(-0.25, 0.6);
    x.moveTo(0.3, 0.15);
    x.lineTo(0.55, 0.05);
  }
  x.strokeStyle = col;
  x.lineWidth = 0.18;
  x.stroke();
}
function crystalP(x, c) {
  polyP(x, [[0, -1], [0.55, -0.3], [0.4, 0.75], [-0.35, 0.85], [-0.6, -0.2]], rgba(c, 0.9), 0.14);
  polyP(x, [[0, -1], [0.55, -0.3], [0, -0.25]], rgba('#ffffff', 0.35), 0);
  lineP(x, [[0, -1], [0, 0.8]], rgba('#ffffff', 0.8), 0.1);
  lineP(x, [[-0.6, -0.2], [0.55, -0.3]], rgba('#ffffff', 0.8), 0.1);
}
// what glows round a thing (a live sprite, on the kick)
const THING_GLOW = {
  cube: P => P.line,
  datacube: P => mixHex(P.line, '#7ff3ff', 0.5),
  glowstick: P => P.line,
  lava: () => '#ff7a2a',
  ice: () => '#bfeeff',
  crystal: P => mixHex('#c27bff', P.line, 0.3),
  tube: () => '#ffb040',
  vinyl: P => P.line,
  sugar: () => '#ffffff',
  seed: () => '#9aff5a',
  lettuce: () => '#b8f07a',
};
const THING_DEFS = {};
const thingDef = kind => (THING_DEFS[kind] ??= [2.4, 2.4, 1.2, 1.2, (x, P) => (THING[kind] ?? THING.rock)(x, P, c => mixHex(c, P.near, 0.18))]);
const thingSprite = (f, kind) => sprite('thing:' + kind, thingDef(kind), palOf(f.T), '', Math.max(24, Math.round(resOf(f.v) * 0.3)));
function thing(f, kind, X, Y, r, rot = 0, hot = 0) {
  const { g, mf } = f,
    gc = THING_GLOW[kind];
  if (gc) glowDot(g, X, Y, (kind === 'glowstick' ? 1.8 : 1.5) * r, gc(palOf(f.T)), 0.4 + 0.45 * mf.kick);
  blit(g, thingSprite(f, kind), X, Y, r, rot);
  // (a skull's eyes lit)
  if (kind === 'skull' && !rot) for (const s of [-0.32, 0.32]) glowDot(g, X + s * r, Y, 0.35 * r, f.T.line, 0.2 + 0.6 * mf.kick);
  // (batted home: burning, white-hot at its heart)
  if (hot > 0) {
    glowDot(g, X, Y, 2.4 * r, '#ff8a3d', 0.7 * hot);
    glowDot(g, X, Y, 1.2 * r, HOT, 0.85 * hot);
  }
}

// ---- what a thrower (or a sniper) stands on: its top at screen Y, w pixels wide, down to the roof at screen Yb (it
// stands on a roof past the road, behind it). Painted once a palette, two metres wide and tall enough for the tallest,
// and cut off where it meets the roof; its lamps and its jets live
const STAND_H = 3.6;
const STANDS = {
  board: [
    2.2,
    STAND_H,
    1.1,
    0.15,
    (x, P) => {
      const body = mixHex(P.far, P.near, 0.45),
        dark = mixHex(P.near, '#000000', 0.25);
      x.fillStyle = dark;
      for (const s of [-0.64, 0.64]) x.fillRect(s - 0.06, 0, 0.12, STAND_H);
      // (a cross brace between its legs)
      lineP(x, [[-0.64, 1.3], [0.64, 2.3]], dark, 0.06);
      lineP(x, [[0.64, 1.3], [-0.64, 2.3]], dark, 0.06);
      const gr = x.createLinearGradient(0, 0, 0, 1.1);
      gr.addColorStop(0, mixHex(P.win[0], body, 0.35));
      gr.addColorStop(1, mixHex(P.win[1], body, 0.6));
      x.fillStyle = gr;
      x.fillRect(-1, 0, 2, 1.1);
      // (its picture: the cursor's arrow, the AI's ad)
      x.fillStyle = rgba(dark, 0.85);
      const ax = -0.16,
        ay = 0.2,
        a = 0.64;
      polyP(x, [[ax, ay], [ax, ay + a], [ax + 0.24 * a, ay + 0.77 * a], [ax + 0.42 * a, ay + 1.1 * a], [ax + 0.56 * a, ay + 1.03 * a], [ax + 0.4 * a, ay + 0.72 * a], [ax + 0.71 * a, ay + 0.72 * a]], rgba(dark, 0.85), 0);
      x.strokeStyle = P.line;
      x.lineWidth = 0.05;
      x.strokeRect(-1, 0, 2, 1.1);
      x.fillStyle = dark;
      x.fillRect(-1.02, -0.1, 2.04, 0.08);
    },
  ],
  pillar: [
    2.2,
    STAND_H,
    1.1,
    0.05,
    (x, P) => {
      const body = mixHex(P.far, P.near, 0.45),
        cw = 0.84;
      x.fillStyle = body;
      x.fillRect(-cw / 2, 0.16, cw, STAND_H);
      x.fillStyle = mixHex(body, '#ffffff', 0.12);
      x.fillRect(-0.72, 0, 1.44, 0.2);
      x.fillRect(-0.6, 0.18, 1.2, 0.08);
      x.fillStyle = rgba('#000000', 0.25);
      for (let k = 0; k < 3; k++) x.fillRect(-cw / 2 + ((k + 1) * cw) / 4, 0.26, 0.06, STAND_H);
      x.fillStyle = rgba('#ffffff', 0.08);
      x.fillRect(-cw / 2, 0.26, 0.1, STAND_H);
      x.fillStyle = P.line;
      x.fillRect(-0.72, -0.03, 1.44, 0.06);
    },
  ],
  tomb: [
    2.2,
    STAND_H,
    1.1,
    0.05,
    (x, P) => {
      const body = mixHex(P.far, P.near, 0.45),
        cw = 1.6;
      x.fillStyle = body;
      x.fillRect(-cw / 2, 0.16, cw, STAND_H);
      x.fillStyle = mixHex(body, '#ffffff', 0.12);
      x.fillRect(-0.72 - 0.1, 0, 1.64, 0.2);
      x.fillStyle = rgba('#000000', 0.25);
      for (let k = 0; k < 3; k++) x.fillRect(-cw / 2 + ((k + 1) * cw) / 4, 0.3, 0.05, STAND_H);
      x.fillStyle = mixHex(body, '#ffffff', 0.08);
      x.fillRect(-0.06, 0.28, 0.12, 0.64);
      x.fillRect(-0.26, 0.44, 0.52, 0.12);
      x.fillStyle = P.line;
      x.fillRect(-0.82, -0.03, 1.64, 0.06);
    },
  ],
  stump: [
    2.2,
    STAND_H,
    1.1,
    0.15,
    (x, P) => {
      x.fillStyle = mixHex('#5a3a22', P.near, 0.45);
      x.fillRect(-0.6, 0, 1.2, STAND_H);
      x.fillStyle = rgba('#000000', 0.22);
      for (const s of [-0.35, 0, 0.3]) x.fillRect(s, 0.1, 0.05, STAND_H);
      x.fillStyle = mixHex('#c79a62', P.near, 0.3);
      x.beginPath();
      x.ellipse(0, 0, 0.6, 0.12, 0, 0, TAU);
      x.fill();
      x.strokeStyle = mixHex('#7a5232', P.near, 0.3);
      x.lineWidth = 0.035;
      for (const r of [0.36, 0.18]) {
        x.beginPath();
        x.ellipse(0, 0, r, r * 0.2, 0, 0, TAU);
        x.stroke();
      }
      x.strokeStyle = P.line;
      x.lineWidth = 0.05;
      x.beginPath();
      x.ellipse(0, 0, 0.6, 0.12, 0, Math.PI, TAU);
      x.stroke();
    },
  ],
  pad: [
    2.2,
    0.6,
    1.1,
    0.3,
    (x, P) => {
      const dark = mixHex(P.near, '#000000', 0.25);
      x.beginPath();
      x.ellipse(0, 0.08, 0.96, 0.18, 0, 0, TAU);
      x.fillStyle = dark;
      x.fill();
      x.strokeStyle = P.line;
      x.lineWidth = 0.05;
      x.stroke();
      x.beginPath();
      x.ellipse(0, 0.04, 0.6, 0.08, 0, 0, TAU);
      x.fillStyle = mixHex(dark, '#ffffff', 0.12);
      x.fill();
    },
  ],
};
function stand(f, kind, X, Y, w, Yb, a = 1) {
  const { g, mf, v } = f,
    s = sprite('stand:' + kind, STANDS[kind] ?? STANDS.board, palOf(f.T), '', Math.max(24, Math.round(resOf(v) * 0.75))),
    m = w / 2,
    k = m / s.res,
    h = Math.max(0, Yb - Y);
  if (a <= 0) return;
  const ga = g.globalAlpha;
  g.globalAlpha = ga * a;
  if (kind === 'pad') {
    // (a hover pad: a disc on its glow, no legs, its thrusters breathing with the bass)
    const bob = 0.06 * m * Math.sin(f.t * 3),
      jet = jetOf(f, palOf(f.T).line);
    for (const sx of [-0.6, 0, 0.6]) blit(g, jet, X + sx * m, Y + bob + 0.12 * m, m, 0, 1, 0.8 + 0.8 * mf.bass);
    blit(g, s, X, Y + bob, m);
  } else {
    // (cut off at the roof: as much of it as stands above the roof past the road)
    const sh = Math.min(s.c.height, (h + s.oy * m) / k);
    g.drawImage(s.c, 0, 0, s.c.width, sh, X - s.ox * m, Y - s.oy * m, s.c.width * k, sh * k);
    if (kind === 'stump') {
      // (its roots spread on the roof)
      g.fillStyle = mixHex('#5a3a22', f.T.near, 0.45);
      g.beginPath();
      g.moveTo(X - 0.6 * m, Yb - 0.3 * m);
      g.quadraticCurveTo(X - 0.7 * m, Yb - 0.05 * m, X - 1.2 * m, Yb);
      g.lineTo(X + 1.2 * m, Yb);
      g.quadraticCurveTo(X + 0.7 * m, Yb - 0.05 * m, X + 0.6 * m, Yb - 0.3 * m);
      g.closePath();
      g.fill();
    }
    // (its lamps along the top, on the beat: a billboard's bulbs, a pillar's or a tomb's light on its capital)
    if (kind === 'board') for (let i = 0; i < 4; i++) glowDot(g, X - 0.76 * m + (i * 1.52 * m) / 3, Y - 0.12 * m, 0.14 * m, f.T.win[2], 0.5 + 0.5 * mf.beat);
    else if (kind === 'tomb') glowDot(g, X, Y + 0.5 * m, 0.4 * m, f.T.line, 0.25 + 0.4 * mf.kick);
  }
  g.globalAlpha = ga;
}

// ---- effects
// a burst at (X, Y) u of the way through it: n sparks out to R pixels, falling a little
function burst(g, X, Y, u, col, n, R, seed = 7) {
  if (u <= 0 || u >= 1) return;
  g.fillStyle = rgba(col, 1 - u);
  const e = ease(u) * R,
    s = Math.max(2, R * 0.06 * (1 - u));
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996 + 0.3 + seed,
      d = e * (0.55 + 0.45 * hash(i, seed));
    g.fillRect(X + Math.cos(a) * d - s / 2, Y + Math.sin(a) * d + R * 0.6 * u * u - s / 2, s, s);
  }
}
// streaks flying out of (X, Y) u of the way through: a hit's sparks, long and thin
function streaks(g, X, Y, u, col, n, R, seed = 3) {
  if (u <= 0 || u >= 1) return;
  g.strokeStyle = rgba(col, 1 - u);
  g.lineWidth = Math.max(1, R * 0.035);
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + hash(i, seed) * 0.8,
      d0 = R * ease(u) * 0.5,
      d1 = d0 + R * 0.35 * (1 - u);
    g.moveTo(X + Math.cos(a) * d0, Y + Math.sin(a) * d0);
    g.lineTo(X + Math.cos(a) * d1, Y + Math.sin(a) * d1);
  }
  g.stroke();
}
// smoke rising off (X, Y) u seconds on: n puffs swelling and fading, R pixels high
function smoke(g, X, Y, u, n, R, col = SMOKE, seed = 1) {
  if (u <= 0 || u > 1.6) return;
  for (let i = 0; i < n; i++) {
    const w = u - i * 0.07;
    if (w <= 0 || w > 1.2) continue;
    const h = hash(i, seed);
    glowDot(g, X + (h - 0.5) * R * 0.5 + w * R * 0.25 * (h - 0.3), Y - w * R, R * (0.22 + 0.35 * w), col, 0.75 * (1 - w / 1.2));
  }
}
// bubbles rising off (X, Y) (the deep's smoke)
function bubbles(g, X, Y, u, n, R, seed = 5) {
  if (u <= 0 || u > 1.4) return;
  g.strokeStyle = rgba('#d8f6ff', 0.8 * (1 - u / 1.4));
  g.lineWidth = Math.max(1, R * 0.02);
  for (let i = 0; i < n; i++) {
    const h = hash(i, seed),
      w = u - h * 0.3;
    if (w <= 0) continue;
    const bx = X + (h - 0.5) * R + Math.sin(w * 9 + i) * R * 0.08,
      by = Y - w * R * (0.8 + h),
      r = R * (0.03 + 0.05 * hash(i, seed + 1));
    g.beginPath();
    g.arc(bx, by, r, 0, TAU);
    g.stroke();
  }
}
// feathers (or leaves, scraps) drifting down off (X, Y): n slips of colour col, turning, u seconds on
function feathers(g, X, Y, u, n, R, col, seed = 9) {
  if (u <= 0 || u > 1.5) return;
  g.fillStyle = rgba(col, 1 - u / 1.5);
  for (let i = 0; i < n; i++) {
    const h = hash(i, seed),
      a = i * 2.4 + h,
      out = R * (1 - Math.exp(-u * 5)) * (0.5 + 0.5 * h),
      fx = X + Math.cos(a) * out + Math.sin(u * 6 + i) * R * 0.08,
      fy = Y + Math.sin(a) * out * 0.6 + u * u * R * 0.5,
      r = u * 7 + i,
      c = Math.cos(r) * R * 0.09,
      s = Math.sin(r) * R * 0.09;
    g.beginPath();
    g.moveTo(fx - c, fy - s);
    g.lineTo(fx - s * 0.3, fy + c * 0.3);
    g.lineTo(fx + c, fy + s);
    g.lineTo(fx + s * 0.3, fy - c * 0.3);
    g.fill();
  }
}
// a sprite broken into pieces flying apart off its anchor (X, Y), u seconds on: cols x rows of it, each thrown out and
// up, turning, falling, fading (m pixels a metre; a stone gargoyle, a camera's housing, a hive torn in two)
function shatter(g, s, X, Y, m, u, cols = 3, rows = 2, seed = 0, rot = 0) {
  if (u <= 0 || u > 1.2) return;
  const k = m / s.res,
    tw = s.c.width / cols,
    th = s.c.height / rows,
    ga = g.globalAlpha;
  g.globalAlpha = ga * clamp01(1.2 - u);
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const h = hash(i * 7 + j, seed + 11),
        // (its middle, from the anchor, in metres)
        cx = ((i + 0.5) * tw) / s.res - s.ox,
        cy = ((j + 0.5) * th) / s.res - s.oy,
        // (blown apart from its middle, and all of it on along the blow: he kicks it the way he runs)
        vx = cx * 2.2 + 2.6 + (h - 0.5) * 2,
        vy = cy * 2 - 2.6 - 2 * hash(j, i + seed),
        px = X + (Math.cos(rot) * cx - Math.sin(rot) * cy + vx * u) * m,
        py = Y + (Math.sin(rot) * cx + Math.cos(rot) * cy + vy * u + 4.9 * u * u) * m;
      g.save();
      g.translate(px, py);
      g.rotate(rot + (h - 0.5) * 11 * u);
      g.drawImage(s.c, i * tw, j * th, tw, th, (-tw / 2) * k, (-th / 2) * k, tw * k, th * k);
      g.restore();
    }
  g.globalAlpha = ga;
}
// a flash at (X, Y): white at its heart, col round it, R pixels, u of the way through
function flash(g, X, Y, u, R, col = HOT) {
  if (u <= 0 || u >= 1) return;
  glowDot(g, X, Y, R * (0.6 + 0.8 * u), col, 0.9 * (1 - u));
  glowDot(g, X, Y, R * 0.4 * (1 - u), '#ffffff', 1 - u);
}
// a ring of force going out from (X, Y), u of the way through
function shock(g, X, Y, u, R, col, w = 0.06) {
  if (u <= 0 || u >= 1) return;
  g.strokeStyle = rgba(col, 0.9 * (1 - u));
  g.lineWidth = Math.max(1, R * w * (1 - u));
  g.beginPath();
  g.arc(X, Y, R * ease(u), 0, TAU);
  g.stroke();
}
// the hint's ring (the hints layer's: closing on the spot to the press's beat), in the move's colour
function closing(f, X, Y, o, col, lead) {
  const { g, v, t, mf } = f,
    left = o.t - t;
  if (left < 0 || left > lead) return;
  const u = 1 - left / lead,
    m = v.ppm;
  // (a dark line under its colour: it reads on any sky, under any lens)
  g.beginPath();
  g.arc(X, Y, (0.25 + 0.75 * (1 - u)) * m, 0, TAU);
  g.strokeStyle = rgba(EDGE, 0.5 + 0.4 * u);
  g.lineWidth = (0.11 + 0.05 * u) * m;
  g.stroke();
  g.strokeStyle = rgba(col, 0.45 + 0.55 * u);
  g.lineWidth = (0.05 + 0.04 * u) * m;
  g.stroke();
  glowDot(g, X, Y, 0.3 * m, col, 0.35 * u * (0.7 + 0.3 * mf.beat));
}
// a path to come, dotted: dark squares under bright ones, running along it toward its end (the way a thing will fly)
function dotted(g, p, w0, n, col, ds, a, t) {
  const step = (1 - w0) / n,
    off = ((t * 3) % 1) * step;
  for (let i = 0; i < n; i++) {
    const w = w0 + off + i * step;
    if (w >= 1) break;
    const [x, y] = p(w);
    g.fillStyle = rgba(EDGE, 0.75 * a);
    g.fillRect(x - ds * 1.7, y - ds * 1.7, ds * 3.4, ds * 3.4);
    g.fillStyle = rgba(col, a);
    g.fillRect(x - ds, y - ds, 2 * ds, 2 * ds);
  }
}
// a thing flying at him, made to be seen whatever is behind it: a glow of the move's colour, a dark disc, a bright ring
// round it, the thing on top (Cuphead's and Gungeon's rule: a dark outline and a bright core on any background)
function projectile(f, kind, X, Y, r, rot, col = KICK, hot = 0) {
  const { g, mf } = f;
  glowDot(g, X, Y, 2.8 * r, col, 0.55 + 0.35 * mf.kick);
  g.beginPath();
  g.arc(X, Y, 1.45 * r, 0, TAU);
  g.fillStyle = rgba(EDGE, 0.8);
  g.fill();
  g.strokeStyle = col;
  g.lineWidth = Math.max(1.5, 0.3 * r);
  g.stroke();
  thing(f, kind, X, Y, r, rot, hot);
}

// ---- a clone posed by a clip at world (x, y), facing -x (toward him), k its size (further away, smaller); into one of
// a few scratch buffers (slot), not a new one a frame
const POSES = [];
function clonePose(f, clip, fr, x, y, k, loop = false, face = -1, slot = 0) {
  const P = frameOf(f.run.anim.C[clip], fr, loop);
  let J = POSES[slot];
  if (!J || J.length !== P.length) J = POSES[slot] = new Float32Array(P.length);
  for (let i = 0; i < P.length; i += 2) {
    J[i] = x + face * P[i] * k;
    J[i + 1] = y + P[i + 1] * k;
  }
  // (the way it faces, kept with the pose: a throw's wind-up or a fall leans its head back past its hips, and its eyes
  // must not turn round with it)
  J.face = face;
  return J;
}
// a long gun along a clone's forearms, on past its front hand (a rifle; a sniper's, longer, with its scope)
function rifle(f, J, a, long = 0) {
  const bx = J[JI.haR * 2],
    by = J[JI.haR * 2 + 1],
    fx = J[JI.haL * 2],
    fy = J[JI.haL * 2 + 1],
    d = Math.hypot(fx - bx, fy - by) || 1,
    ux = (fx - bx) / d,
    uy = (fy - by) / d;
  return gun(f, bx - ux * 0.18, by - uy * 0.18, ux, uy, d + 0.58 + long, a, long);
}
// the gun itself: from its butt (x0, y0) along (ux, uy), len metres; its tip and its scope
function gun(f, x0, y0, ux, uy, len, a, long = 0) {
  const { g, v } = f,
    m = v.ppm,
    tip = [x0 + ux * len, y0 + uy * len];
  const ga = g.globalAlpha;
  g.globalAlpha = ga * a;
  g.lineCap = 'round';
  g.strokeStyle = '#15121a';
  g.lineWidth = 0.1 * m;
  g.beginPath();
  g.moveTo(v.sx(x0), v.sy(y0));
  g.lineTo(v.sx(tip[0]), v.sy(tip[1]));
  g.stroke();
  g.strokeStyle = rgba(f.T.line, 0.8);
  g.lineWidth = 0.03 * m;
  g.stroke();
  // (its scope on top, over the middle of its grip)
  const mx = x0 + ux * (0.18 + (len - long - 0.58) / 2) - uy * 0.09,
    my = y0 + uy * (0.18 + (len - long - 0.58) / 2) + ux * 0.09;
  if (long) {
    g.strokeStyle = '#15121a';
    g.lineWidth = 0.08 * m;
    g.beginPath();
    g.moveTo(v.sx(mx - ux * 0.14), v.sy(my - uy * 0.14));
    g.lineTo(v.sx(mx + ux * 0.14), v.sy(my + uy * 0.14));
    g.stroke();
  }
  g.globalAlpha = ga;
  return { tip, scope: [mx + ux * 0.14, my + uy * 0.14] };
}
// a rifleman alive: breathing (its chest and arms rising and falling over two beats, a slow sway in its aim), its arms
// turned about its shoulders so the barrel is on his chest; J changed in place
function aimAt(f, J, seed) {
  const { L, t } = f,
    br = Math.sin((TAU * (t - (L.A.beats?.[0] ?? 0))) / (2 * L.A.beat) + seed),
    [cx, cy] = chestOf(f),
    px = (J[JI.shL * 2] + J[JI.shR * 2]) / 2,
    py = (J[JI.shL * 2 + 1] + J[JI.shR * 2 + 1]) / 2,
    now = Math.atan2(J[JI.haL * 2 + 1] - J[JI.haR * 2 + 1], J[JI.haL * 2] - J[JI.haR * 2]),
    want = Math.atan2(cy - py, cx - px);
  let d = want - now;
  d -= TAU * Math.round(d / TAU);
  d = Math.max(-0.7, Math.min(0.7, d)) + 0.03 * Math.sin(t * 1.7 + seed);
  const c = Math.cos(d),
    sn = Math.sin(d);
  for (const j of [JI.elL, JI.haL, JI.elR, JI.haR]) {
    const x = J[j * 2] - px,
      y = J[j * 2 + 1] - py;
    J[j * 2] = px + x * c - y * sn;
    J[j * 2 + 1] = py + x * sn + y * c;
  }
  for (const j of [JI.chest, JI.neck, JI.head, JI.shL, JI.elL, JI.haL, JI.shR, JI.elR, JI.haR]) J[j * 2 + 1] += 0.018 * br;
  return J;
}
// a rifle let go as its man is hit: a body of its own from where it was held (its pose then, worked out once), knocked
// up and back, turning end over end, falling as he does (20 m/s²); u seconds since
const DROPPED = new WeakMap();
function droppedRifle(f, o, held, u, a, long = 0) {
  let r = DROPPED.get(o);
  if (!r) {
    const J = held(),
      bx = J[JI.haR * 2],
      by = J[JI.haR * 2 + 1],
      d = Math.hypot(J[JI.haL * 2] - bx, J[JI.haL * 2 + 1] - by) || 1,
      len = d + 0.58 + long,
      ux = (J[JI.haL * 2] - bx) / d,
      uy = (J[JI.haL * 2 + 1] - by) / d,
      h = hash(Math.floor(o.v * 1000), 5);
    r = { cx: bx - ux * 0.18 + (ux * len) / 2, cy: by - uy * 0.18 + (uy * len) / 2, a0: Math.atan2(uy, ux), len, vx: 1.4 + h, vy: 3 + 1.5 * h, w: -(6 + 5 * h) };
    DROPPED.set(o, r);
  }
  const an = r.a0 + r.w * u,
    ux = Math.cos(an),
    uy = Math.sin(an),
    cx = r.cx + r.vx * u,
    cy = r.cy + r.vy * u - 10 * u * u;
  gun(f, cx - (ux * r.len) / 2, cy - (uy * r.len) / 2, ux, uy, r.len, a, long);
}

// ---- a throw at him (kinds.js bat)
// its thrower: pasted on its rooftop (glitching in), guarding (bouncing on the beat), winding up the beat before the
// throw (the telegraph: its arm back, the thing in its hand charging up, a flash), throwing on the call; knocked off
// backwards when it comes home, a blast of dust off its rooftop
const RELEASE = 50,
  RELEASED = new WeakMap();
function thrower(f, o) {
  const { L, t, v, g, mf } = f,
    m = v.ppm,
    beat = L.A.beat,
    k = 1.05 - 0.45 * o.par,
    X = throwerX(L, o, t),
    top = o.y + o.th,
    tw = o.tr - beat,
    home = o.res === 'ok' ? t - o.ti : -1,
    since = t - f.plan.placeT(o);
  let J,
    dx = 0,
    dy = 0,
    a = 1;
  if (home >= 0) {
    // (knocked down: falling back off its rooftop, past its edge, then down out of sight)
    const fr = 6 + home * 60 * 1.3;
    J = clonePose(f, 'falling_back_death', fr, X, top, k);
    dx = 1.1 * k * ease(home / 0.8);
    if (home > 0.5) dy = -9.8 * 0.5 * (home - 0.5) ** 2;
    a = clamp01(1 - (home - 0.75) / 0.3);
  } else if (t >= tw && t < o.tr + 0.9) {
    // (the throw: from its wind-up on through the release on the call to its follow-through)
    const fr = t < o.tr ? 18 + ((RELEASE - 18) * (t - tw)) / beat : RELEASE + (t - o.tr) * 60;
    J = clonePose(f, 'throw', Math.min(120, fr), X, top, k);
  } else J = clonePose(f, 'bouncing_fight_idle', t * 50 + o.slot * 31, X, top, k, true);
  if (dx || dy) for (let i = 0; i < J.length; i += 2) ((J[i] += dx), (J[i + 1] += dy));
  // (its rooftop's thing first, under its feet; pasted in with it)
  const w = 2.0 * k * m,
    sx = v.sx(X),
    sy = v.sy(top);
  // (down to the road's edge and no further: it stands past the road, so the road hides its foot; drawn on down over
  // the road it read as nearer than the road)
  stand(f, theme(f).stand, sx, sy, w, v.sy(o.y), clamp01(since / 0.15));
  // (pasted in: a white copy-flash and its outline flickering in over a moment)
  if (since < 0.35) {
    flash(g, sx, sy - 1.1 * k * m, since / 0.35, 1.4 * k * m, '#ffffff');
    if (since < 0.2) shock(g, sx, sy - 0.9 * k * m, since / 0.2, 1.6 * k * m, KICK);
  }
  const gl = since < 0.3 && Math.floor(since * 40) % 3 === 1 ? 0.35 : 1;
  if (a > 0) drawClone(f, J, a * gl * clamp01(since / 0.12));
  const hx = v.sx(J[JI.haR * 2]),
    hy = v.sy(J[JI.haR * 2 + 1]);
  // (the thing in its hand till the release, glowing up to the throw: the telegraph)
  if (t >= tw && t < o.tr) {
    const u = (t - tw) / beat;
    glowDot(g, hx, hy, (0.35 + 0.5 * u) * k * m, KICK, 0.3 + 0.5 * u * (0.7 + 0.3 * mf.beat));
    thing(f, o.fly, hx, hy, 0.2 * k * m, t * 3);
  }
  // (the wind-up's flash round its hand, and the throw's)
  for (const [t0, col] of [[tw, '#ffffff'], [o.tr, KICK]]) shock(g, hx, hy, (t - t0) / 0.3, 0.8 * m, col, 0.05);
  // (knocked off: dust and splinters off its rooftop where it stood)
  if (home >= 0 && home < 1) {
    const rx = v.sx(throwerX(L, o, o.ti)),
      ry = sy;
    burst(g, rx, ry, home / 0.6, mixHex(f.T.far, '#ffffff', 0.5), 10, 1.0 * m, 4);
    smoke(g, rx, ry, home, 4, 0.9 * m, mixHex(f.T.far, '#888888', 0.5), 3);
  }
  return { X, top, k };
}
// where a throw is let go: its thrower's hand at the release (a pose that does not change: worked out once)
function releaseAt(f, o, k) {
  let r = RELEASED.get(o);
  if (!r) {
    const R = clonePose(f, 'throw', RELEASE, throwerX(f.L, o, o.tr), o.y + o.th, k, false, -1, 1);
    r = [R[JI.haR * 2], R[JI.haR * 2 + 1]];
    RELEASED.set(o, r);
  }
  return r;
}
// a trail of light behind something flying along path p (w: 0..1 along it) up to u: dots of glow, larger to the head
function trail(f, p, u, len, col, r, n = 7) {
  const { g, v } = f;
  for (let i = n; i >= 1; i--) {
    const w = u - (len * i) / n;
    if (w < 0) continue;
    const [x, y] = p(w),
      a = 1 - i / (n + 1);
    glowDot(g, v.sx(x), v.sy(y), r * (0.45 + 0.55 * a), col, 0.6 * a);
  }
}
function bat(f, o) {
  const { g, v, t, mf } = f,
    m = v.ppm;
  if (t > o.ti + 2 || (o.res === 'hit' && t > o.tc + 1.5)) return;
  const th = thrower(f, o),
    // (where it is let go, its thrower's hand at the release; where the bat meets it)
    [rx, ry] = releaseAt(f, o, th.k),
    cx = o.x,
    cy = o.y + 1.15,
    apex = 1.4 + 0.3 * o.nb,
    out = u => [lerp(rx, cx, u), lerp(ry, cy, u) + apex * 4 * u * (1 - u)],
    r = 0.22 * m;
  // (in the air: a high arc to his bat over the bar, its path still to fly dotted (pulsing on the beat), a trail of
  // light behind it)
  // (its whole path shown from the wind-up, a beat before it is let go: where it will come down, to be met there)
  const tw = o.tr - f.L.A.beat;
  if (t >= tw && t < o.tc && !o.res) {
    const u = Math.max(0, (t - o.tr) / (o.tc - o.tr)),
      ds = Math.max(1.5, 0.045 * m) * (1 + 0.35 * mf.beat),
      p = w => {
        const [x, y] = out(w);
        return [v.sx(x), v.sy(y)];
      };
    dotted(g, p, u + 0.04, 14, '#ffffff', ds, clamp01((t - tw) / (0.5 * f.L.A.beat)) * (0.6 + 0.4 * mf.beat), t);
  }
  if (t >= o.tr && (t < o.tc || (!o.res && t < o.tc + 0.2))) {
    const u = (t - o.tr) / (o.tc - o.tr);
    trail(f, out, u, 0.2, KICK, 0.3 * m, 8);
    trail(f, out, u, 0.08, '#ffffff', 0.14 * m, 3);
    const [px, py] = out(Math.min(1.1, u));
    // (as big as its thrower where it leaves its hand, far back, growing as it comes on to him)
    projectile(f, o.fly, v.sx(px), v.sy(py), r * lerp(th.k, 1, clamp01(u)), t * 9);
  }
  // (the press: a ring on the bat's sweet spot closing to its beat, its note over it)
  if (!o.res) {
    closing(f, v.sx(cx), v.sy(cy), o, KICK, 2 * f.L.A.beat);
    if (t > o.tr - f.L.A.beat) mark(f, o, v.sx(cx), v.sy(o.y + 2.7));
  }
  // (batted: home in a beat, burning, a long trail of fire; the bat's sparks at the contact, a blast at the thrower)
  if (o.res === 'ok') {
    const tx = throwerX(f.L, o, o.ti),
      ty = o.y + o.th + 1.2 * th.k,
      home = w => [lerp(cx, tx, w), lerp(cy, ty, w) + 0.8 * 4 * w * (1 - w)];
    if (t >= o.tc && t < o.ti) {
      const u = (t - o.tc) / (o.ti - o.tc);
      trail(f, home, u, 0.3, '#ff8a3d', 0.32 * m, 9);
      trail(f, home, u, 0.12, HOT, 0.18 * m, 4);
      const [px, py] = home(u);
      thing(f, o.fly, v.sx(px), v.sy(py), r * 1.1 * lerp(1, th.k, u), t * 20, 1);
    }
    const uc = (t - o.tc) / 0.4;
    flash(g, v.sx(cx), v.sy(cy), uc, 1.0 * m, KICK);
    streaks(g, v.sx(cx), v.sy(cy), uc, '#ffffff', 10, 1.6 * m);
    burst(g, v.sx(cx), v.sy(cy), (t - o.tc) / 0.3, KICK, 8, 0.7 * m);
    const ui = (t - o.ti) / 0.55,
      TX = v.sx(tx),
      TY = v.sy(ty);
    flash(g, TX, TY, ui, 2.2 * m, '#ffb347');
    shock(g, TX, TY, ui * 1.4, 2 * m, '#ffe14d');
    burst(g, TX, TY, ui, '#ff8a3d', 18, 1.6 * m);
    burst(g, TX, TY, ui * 0.8, '#ffe14d', 10, 1.0 * m, 2);
  }
  // (missed: it hits him, bursts off him and drops)
  if (o.res === 'hit') {
    const d = t - o.hitT;
    if (d < 0.9) {
      const px = cx - 0.5 - 1.2 * d,
        py = cy + 1.2 * d - 6 * d * d;
      if (py > o.y) thing(f, o.fly, v.sx(px), v.sy(py), r, t * 6);
      flash(g, v.sx(cx - 0.5), v.sy(cy), d / 0.3, 0.9 * m, SIGHT);
      burst(g, v.sx(cx - 0.5), v.sy(cy), d / 0.4, '#ff3b52', 12, 0.9 * m);
    }
  }
}

// (a thing lying on the roof, not on a crate: a crate reads as a box to jump, and the press is down, to the floor)
// the spot it lies on: a flat pool of the slide's colour on the roof, its rings going out on the beat as the press
// nears, a dark shadow under the thing
function spot(f, X, Y, glow, beatU = 0) {
  const { g, v } = f,
    m = v.ppm;
  g.fillStyle = rgba(MOVE_COLOUR.slide, 0.16 + 0.36 * glow);
  g.beginPath();
  g.ellipse(X, Y, 0.6 * m, 0.1 * m, 0, 0, TAU);
  g.fill();
  if (glow > 0.05) {
    // (a ring going out from it on each beat)
    const u = beatU;
    g.strokeStyle = rgba(MOVE_COLOUR.slide, glow * (1 - u));
    g.lineWidth = Math.max(1, 0.035 * m);
    g.beginPath();
    g.ellipse(X, Y, (0.35 + 0.6 * u) * m, (0.06 + 0.1 * u) * m, 0, 0, TAU);
    g.stroke();
  }
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.beginPath();
  g.ellipse(X, Y, 0.24 * m, 0.045 * m, 0, 0, TAU);
  g.fill();
}
// (a column of light standing up off the spot as the press nears: a sprite, the slide's colour fading up)
const PICKBEAM = [
  0.8,
  2,
  0.4,
  2,
  x => {
    const gr = x.createLinearGradient(0, 0, 0, -2);
    gr.addColorStop(0, rgba(MOVE_COLOUR.slide, 0.55));
    gr.addColorStop(1, rgba(MOVE_COLOUR.slide, 0));
    x.fillStyle = gr;
    x.fillRect(-0.4, -2, 0.8, 2);
    const gc = x.createLinearGradient(0, 0, 0, -1.6);
    gc.addColorStop(0, rgba('#ffffff', 0.7));
    gc.addColorStop(1, rgba('#ffffff', 0));
    x.fillStyle = gc;
    x.fillRect(-0.06, -1.6, 0.12, 1.6);
  },
];
function pick(f, o) {
  const { v, t, run, L, g, mf } = f,
    m = v.ppm,
    X = v.sx(o.x),
    Y = v.sy(o.y);
  if (X < -2 * m || X > v.W + 2 * m) return;
  const beat = L.A.beat,
    left = o.t - t,
    near = o.res ? 0 : clamp01(1 - left / (2 * beat)),
    since = t - f.plan.placeT(o),
    // (how far a ring has gone out since the beat: the beat's pulse falling)
    bu = 1 - mf.beat;
  spot(f, X, Y, near * (0.7 + 0.3 * mf.beat), bu);
  const grabbed = o.res === 'ok' && !(run.pickup?.o === o && t - run.pickup.t0 < 0.12);
  if (grabbed) {
    // (scooped: a flash of the slide's colour where it lay, a ring going out)
    const u = (t - o.t) / 0.35;
    flash(g, X, Y - 0.2 * m, u, 0.8 * m, MOVE_COLOUR.slide);
    shock(g, X, Y, u, 1.0 * m, MOVE_COLOUR.slide);
    return;
  }
  // (put down by the cursor: dropped in from a little over the roof, bouncing once)
  const drop = since < 0.3 ? -((1 - since / 0.3) ** 2) * 0.8 * m : since < 0.45 ? -Math.sin(((since - 0.3) / 0.15) * Math.PI) * 0.08 * m : 0,
    bob = !o.res ? Math.sin(t * 5 + o.v * 6) * 0.025 * m : 0,
    iy = v.sy(o.y + 0.18) + drop + bob;
  if (!o.res) {
    if (near > 0) blit(g, sprite('pickbeam', PICKBEAM, palOf(f.T), '', Math.max(16, Math.round(resOf(v) * 0.25))), X, Y, m, 0, 1, 0.4 + 0.6 * near);
    glowDot(g, X, iy, (0.4 + 0.25 * near) * m, MOVE_COLOUR.slide, 0.2 + 0.5 * near * (0.7 + 0.3 * mf.beat));
    closing(f, X, iy, o, MOVE_COLOUR.slide, 2 * beat);
    mark(f, o, X, v.sy(o.y + 1.5));
  }
  thing(f, o.item, X, iy, 0.22 * m, 0.2 + 0.1 * Math.sin(t * 3 + o.v));
}

// ---- a throw's target (kinds.js throw): a threat ahead of him that belongs to the world it is in (props.js THEMES:
// a hornet hive hung over a forest's road, a jellyfish in the deep, a vulture over the desert, a ghost over a graveyard,
// a camera on a cable in a city...), never anything standing on his roof (nothing left behind to jump): hung from above,
// hovering, flying over the road, or a sniper on a rooftop past it. The cursor puts it there (placeT) and it arrives its
// own way (lowered on its cable, flying in, glitching in, rising, kindling); from two beats before the press it takes aim
// at him (a red sight on his chest, closing to a lock by the beat: a laser, a camera's cone, a ghost's thread, the path
// a bird will dive); hit by his throw it is taken out its own way (broken apart, blown off, snuffed out, feathers
// flying); not thrown at (missed, or nothing in his hands) it charges and fires on him its own way (tracers, a beam,
// lightning, a fireball, a rocket, sound, a swarm, a dive), and his life is the run's (run.js)
const APPEAR = 0.5,
  // (drawn a size up on the world's metres: a threat must read at a glance on a phone, beside him)
  SIZE = 1.25;
// where his chest is (what everything aims at)
function chestOf(f) {
  const J = f.run.J;
  return J ? [J[JI.chest * 2], J[JI.chest * 2 + 1]] : [f.L.xAt(f.t), f.run.y + 1.3];
}
// the threat as it is at t: { m pixels a metre, X, Y its anchor on screen, a its alpha, gl its glitch, sc its size,
// hitU seconds since it was hit (-1 alive), shot seconds since it fired (-1), aim 0..1 over the two beats before the
// press, charge 0..1 between the release it did not get and its shot, P the palette, mat the place's material, mx, my
// where it fires from, CX, CY his chest }
function stateOf(f, o) {
  const { v, t, L, mf } = f,
    hitU = o.res === 'ok' ? t - o.ti : -1,
    shot = o.res === 'hit' ? t - o.hitT : -1,
    since = t - f.plan.placeT(o),
    [cx, cy] = chestOf(f);
  return {
    m: v.ppm * SIZE,
    t,
    res: resOf(v),
    X: v.sx(threatX(L, o, t)),
    Y: v.sy(o.y + o.ty),
    Yr: v.sy(o.y),
    a: 1,
    gl: 0,
    sc: 1,
    dx: 0,
    dy: 0,
    tilt: 0,
    since,
    app: clamp01(since / APPEAR),
    hitU,
    alive: hitU < 0,
    shot,
    aim: !o.res ? clamp01(1 - (o.t - t) / (2 * L.A.beat)) : 0,
    charge: !o.res && t > o.tc && f.run.strike?.o !== o ? clamp01((t - o.tc) / 0.15) : shot >= 0 ? clamp01(1 - shot / 0.25) : 0,
    P: palOf(f.T),
    mat: theme(f).mat,
    k: mf.kick,
    b: mf.beat,
    mx: 0,
    my: 0,
    CX: v.sx(cx),
    CY: v.sy(cy),
    seed: Math.floor(o.v * 1000),
  };
}
// how it arrives: offsets (metres), alpha, glitch and size over its first half second
function arrive(s, how) {
  const u = s.app;
  if (u >= 1) return;
  const e = ease(u);
  if (how === 'drop') {
    // (lowered on its cable from out of sight above, bouncing on it as it stops)
    s.dy = u < 0.55 ? -7 * (1 - u / 0.55) ** 2 : 0.22 * Math.sin(((u - 0.55) / 0.45) * TAU) * (1 - (u - 0.55) / 0.45);
  } else if (how === 'fly') {
    // (flying in from ahead and above, swooping down to its place)
    s.dx = 4.5 * (1 - e);
    s.dy = -2.6 * (1 - e) ** 1.5;
    s.a = clamp01(u * 3);
    s.tilt = -0.5 * (1 - e);
  } else if (how === 'swim') {
    s.dx = 3.5 * (1 - e);
    s.dy = 0.35 * Math.sin(u * TAU) * (1 - e);
    s.a = clamp01(u * 2.5);
  } else if (how === 'rise') {
    s.dy = 1.8 * (1 - e);
    s.a = clamp01(u * 2);
  } else if (how === 'glitch') {
    // (pasted in by the cursor: in slices, flickering, settling)
    s.gl = 1 - e;
    s.a = u < 0.6 && Math.floor(s.t * 40) % 3 === 1 ? 0.4 : 1;
  } else if (how === 'fade') {
    s.a = e;
    s.sc = 0.5 + 0.5 * back(u);
  } else if (how === 'grow') {
    s.sc = back(u);
    s.a = clamp01(u * 4);
  }
}
// a sprite of the threat's, in its palette and material
const spr = (s, id, def) => sprite(id, def, s.P, s.mat, s.res);
// a sprite of the threat's put at (X, Y): through its arrival's alpha, glitch and size
function put(g, s, sp, X, Y, rot = 0, sx = 1, sy = 1) {
  const ga = g.globalAlpha;
  if (s.a < 1) g.globalAlpha = ga * s.a;
  if (s.gl > 0.02 && !rot && sx === 1 && sy === 1 && s.sc === 1) blitGlitch(g, sp, X, Y, s.m, s.gl, s.t, s.seed);
  else blit(g, sp, X, Y, s.m, rot, sx * s.sc, sy * s.sc);
  g.globalAlpha = ga;
}
// a cable (or a chain, a vine, a string) from (X, Y) up out of sight
function cable(g, X, Y, m, col, w, sep = 0) {
  g.strokeStyle = col;
  g.lineWidth = Math.max(1, w * m);
  g.beginPath();
  if (sep) {
    g.moveTo(X - sep * m, Y);
    g.lineTo(X - sep * 0.6 * m, Y - 30 * m);
    g.moveTo(X + sep * m, Y);
    g.lineTo(X + sep * 0.6 * m, Y - 30 * m);
  } else {
    g.moveTo(X, Y);
    g.lineTo(X, Y - 30 * m);
  }
  g.stroke();
}
// a point (lx, ly) metres off (X, Y) turned by rot, on screen
const turn = (X, Y, m, rot, lx, ly) => [X + (Math.cos(rot) * lx - Math.sin(rot) * ly) * m, Y + (Math.sin(rot) * lx + Math.cos(rot) * ly) * m];

// ---- its aim: a red sight from where it fires to his chest, flickering in and solid by the press's beat, and a lock
// on his chest closing to it; each threat's own kind of sight
function lockOn(f, s) {
  const { g } = f,
    m = s.m,
    u = s.aim,
    R = (0.28 + 0.5 * (1 - u)) * m,
    a = (0.3 + 0.65 * u) * (0.75 + 0.25 * s.b);
  g.strokeStyle = rgba(SIGHT, a);
  g.lineWidth = Math.max(1.2, 0.035 * m);
  g.beginPath();
  g.arc(s.CX, s.CY, R, 0, TAU);
  // (four ticks turning in on it)
  for (let q = 0; q < 4; q++) {
    const an = (q * Math.PI) / 2 + s.t * 1.5 * (1 - u) + Math.PI / 4;
    g.moveTo(s.CX + Math.cos(an) * (R + 0.18 * m), s.CY + Math.sin(an) * (R + 0.18 * m));
    g.lineTo(s.CX + Math.cos(an) * (R - 0.08 * m), s.CY + Math.sin(an) * (R - 0.08 * m));
  }
  g.stroke();
  glowDot(g, s.CX, s.CY, (0.15 + 0.22 * u) * m, SIGHT, 0.35 + 0.5 * u);
}
const SIGHTS = {
  // (a laser, a thin red line)
  laser(f, s, on) {
    const { g } = f;
    g.strokeStyle = rgba(SIGHT, (on ? 0.3 + 0.6 * s.aim : 0.1) * (0.7 + 0.3 * s.b));
    g.lineWidth = Math.max(1, (0.02 + 0.03 * s.aim) * s.m);
    g.beginPath();
    g.moveTo(s.mx, s.my);
    g.lineTo(s.CX, s.CY);
    g.stroke();
    glowDot(g, s.mx, s.my, 0.22 * s.m, SIGHT, 0.4 + 0.4 * s.aim);
  },
  // (a sniper's laser, its scope glinting on the beat)
  glint(f, s, on) {
    SIGHTS.laser(f, s, on);
    const { g } = f,
      r = (0.18 + 0.3 * s.b) * s.m * (0.5 + 0.5 * s.aim);
    g.strokeStyle = rgba('#ffffff', 0.9);
    g.lineWidth = Math.max(1, 0.025 * s.m);
    g.beginPath();
    g.moveTo(s.gx - r, s.gy);
    g.lineTo(s.gx + r, s.gy);
    g.moveTo(s.gx, s.gy - r * 0.6);
    g.lineTo(s.gx, s.gy + r * 0.6);
    g.stroke();
    glowDot(g, s.gx, s.gy, r * 0.8, '#ffffff', 0.8);
  },
  // (a camera's cone, its view of him narrowing to a lock)
  cone(f, s, on) {
    const { g } = f,
      dx = s.CX - s.mx,
      dy = s.CY - s.my,
      d = Math.hypot(dx, dy) || 1,
      w = (0.15 + 0.5 * (1 - s.aim)) * s.m,
      nx = (-dy / d) * w,
      ny = (dx / d) * w;
    g.fillStyle = rgba(SIGHT, (on ? 0.08 + 0.12 * s.aim : 0.04) * (0.7 + 0.3 * s.b));
    g.beginPath();
    g.moveTo(s.mx, s.my);
    g.lineTo(s.CX + nx, s.CY + ny);
    g.lineTo(s.CX - nx, s.CY - ny);
    g.closePath();
    g.fill();
    g.strokeStyle = rgba(SIGHT, on ? 0.25 + 0.5 * s.aim : 0.1);
    g.lineWidth = Math.max(1, 0.02 * s.m);
    g.stroke();
  },
  // (a ghostly thread wavering to him)
  wave(f, s, on, col = SIGHT) {
    const { g } = f,
      dx = s.CX - s.mx,
      dy = s.CY - s.my,
      d = Math.hypot(dx, dy) || 1,
      nx = -dy / d,
      ny = dx / d;
    g.strokeStyle = rgba(col, (on ? 0.3 + 0.6 * s.aim : 0.12) * (0.7 + 0.3 * s.b));
    g.lineWidth = Math.max(1, (0.025 + 0.025 * s.aim) * s.m);
    g.beginPath();
    for (let i = 0; i <= 12; i++) {
      const u = i / 12,
        w = Math.sin(u * 14 - s.t * 9) * 0.12 * s.m * (1 - s.aim * 0.7) * Math.sin(u * Math.PI);
      g.lineTo(s.mx + dx * u + nx * w, s.my + dy * u + ny * w);
    }
    g.stroke();
  },
  // (the path it will dive or swarm along: red dots running down to him)
  dots(f, s, on) {
    const { g } = f,
      r = Math.max(1.5, (0.04 + 0.03 * s.aim) * s.m);
    g.fillStyle = rgba(SIGHT, (on ? 0.35 + 0.6 * s.aim : 0.12) * (0.7 + 0.3 * s.b));
    for (let i = 0; i < 9; i++) {
      const u = (i + ((s.t * 2.5) % 1)) / 9,
        [x, y] = arc(s.mx, s.my, s.CX, s.CY, u, 1.4 * s.m);
      g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
  },
  // (sound: rings going out toward him on the beat)
  rings(f, s, on) {
    const { g } = f,
      an = Math.atan2(s.CY - s.my, s.CX - s.mx);
    g.lineWidth = Math.max(1, 0.03 * s.m);
    for (let i = 0; i < 3; i++) {
      const u = (i / 3 + (1 - s.b) / 3) % 1,
        x = lerp(s.mx, s.CX, u * 0.85),
        y = lerp(s.my, s.CY, u * 0.85);
      g.strokeStyle = rgba(SIGHT, (on ? 0.2 + 0.5 * s.aim : 0.08) * (1 - u));
      g.beginPath();
      g.arc(x, y, (0.25 + 0.5 * u) * s.m, an - 0.8, an + 0.8);
      g.stroke();
    }
    SIGHTS.laser(f, s, on && s.aim > 0.6);
  },
};
// a point u of the way along an arc from (x0, y0) to (x1, y1), bowing up h pixels
function arc(x0, y0, x1, y1, u, h) {
  return [lerp(x0, x1, u), lerp(y0, y1, u) - h * 4 * u * (1 - u)];
}

// ---- its shot: each kind of fire, from (s.mx, s.my) into his chest, s.shot seconds on
function impact(f, s, u, col, R = 1) {
  const { g } = f,
    m = s.m;
  flash(g, s.CX, s.CY, u / 0.35, 1.0 * R * m, col);
  streaks(g, s.CX, s.CY, u / 0.4, '#ffffff', 9, 1.3 * R * m, 5);
  burst(g, s.CX, s.CY, u / 0.45, col, 10, 0.9 * R * m, 6);
}
const FIRES = {
  // (a burst of tracers, the muzzle flashing)
  tracers(f, s, col = HOT) {
    const { g } = f,
      sh = s.shot,
      m = s.m;
    if (sh > 0.45) return;
    if (Math.floor(sh * 24) % 2 === 0) glowDot(g, s.mx, s.my, 0.5 * m, HOT, 0.95);
    g.lineWidth = Math.max(1.5, 0.06 * m);
    for (let q = 0; q < 4; q++) {
      const u = (sh * 7 + q / 4) % 1,
        u2 = Math.min(1, u + 0.14);
      g.strokeStyle = rgba(SIGHT, 0.6);
      g.lineWidth = Math.max(2, 0.12 * m);
      g.beginPath();
      g.moveTo(lerp(s.mx, s.CX, u), lerp(s.my, s.CY, u));
      g.lineTo(lerp(s.mx, s.CX, u2), lerp(s.my, s.CY, u2));
      g.stroke();
      g.strokeStyle = col;
      g.lineWidth = Math.max(1, 0.045 * m);
      g.stroke();
    }
    impact(f, s, sh, SIGHT, 0.8);
  },
  // (one shot: a white streak across, gone in a blink, a puff off the muzzle)
  snipe(f, s) {
    const { g } = f,
      sh = s.shot,
      m = s.m;
    if (sh < 0.12) {
      const a = 1 - sh / 0.12;
      g.strokeStyle = rgba(SIGHT, 0.7 * a);
      g.lineWidth = Math.max(2, 0.16 * m * a);
      g.beginPath();
      g.moveTo(s.mx, s.my);
      g.lineTo(s.CX, s.CY);
      g.stroke();
      g.strokeStyle = rgba('#ffffff', a);
      g.lineWidth = Math.max(1, 0.05 * m);
      g.stroke();
    }
    flash(g, s.mx, s.my, sh / 0.2, 0.7 * m, HOT);
    smoke(g, s.mx, s.my, sh * 1.5, 3, 0.6 * m);
    impact(f, s, sh, SIGHT, 0.9);
  },
  // (a beam: its core white, red round it, flickering, burning into him)
  beam(f, s, col = SIGHT) {
    const { g } = f,
      sh = s.shot,
      m = s.m;
    if (sh > 0.42) return;
    const a = sh < 0.3 ? 1 : 1 - (sh - 0.3) / 0.12,
      w = (0.16 + 0.05 * Math.sin(sh * 70)) * m * Math.min(1, sh / 0.04);
    for (const [c, k, al] of [[col, 2.4, 0.35], [col, 1, 0.9], ['#ffffff', 0.35, 1]]) {
      g.strokeStyle = rgba(c, al * a);
      g.lineWidth = Math.max(1, w * k);
      g.beginPath();
      g.moveTo(s.mx, s.my);
      g.lineTo(s.CX, s.CY);
      g.stroke();
    }
    glowDot(g, s.mx, s.my, 0.6 * m, col, a);
    glowDot(g, s.CX, s.CY, 0.9 * m, col, 0.8 * a);
    streaks(g, s.CX, s.CY, (sh % 0.15) / 0.15, '#ffffff', 6, 0.9 * m, Math.floor(sh / 0.15));
    impact(f, s, sh - 0.05, col, 0.8);
  },
  // (lightning: jagged, forking, white at its heart, struck again and again for a moment)
  bolt(f, s, col = '#ff8a9a', from = null) {
    const { g } = f,
      sh = s.shot,
      m = s.m;
    if (sh > 0.4) return;
    const fr = Math.floor(s.t * 30),
      a = 1 - sh / 0.4,
      [x0, y0] = from ?? [s.mx, s.my];
    for (const [c, w, al] of [[col, 0.14, 0.45], ['#ffffff', 0.045, 1]]) {
      g.strokeStyle = rgba(c, al * a);
      g.lineWidth = Math.max(1, w * m);
      g.beginPath();
      g.moveTo(x0, y0);
      for (let q = 1; q <= 9; q++) {
        const u = q / 9,
          j = q < 9 ? (hash(q, fr) - 0.5) * 0.6 * m : 0;
        g.lineTo(lerp(x0, s.CX, u) + j * 0.5, lerp(y0, s.CY, u) + j);
      }
      // (a fork off it)
      const u = 0.45,
        bx = lerp(x0, s.CX, u),
        by = lerp(y0, s.CY, u);
      g.moveTo(bx, by);
      g.lineTo(bx + (hash(fr, 3) - 0.3) * 0.8 * m, by + 0.5 * m);
      g.stroke();
    }
    glowDot(g, x0, y0, 0.6 * m, col, a);
    impact(f, s, sh, col, 0.9);
  },
  // (a ball of fire (a hex, a firework) flying at him along an arc, a trail behind it, bursting on him)
  orb(f, s, col, kind = 'fire') {
    const { g } = f,
      sh = s.shot,
      m = s.m,
      T = 0.16,
      p = u => arc(s.mx, s.my, s.CX, s.CY, u, (kind === 'hex' ? 0.3 : 0.7) * m),
      wob = u => (kind === 'hex' ? Math.sin(u * 18) * 0.18 * m * (1 - u) : 0);
    if (sh < T) {
      const u = sh / T;
      for (let i = 7; i >= 1; i--) {
        const w = u - i * 0.06;
        if (w < 0) continue;
        const [x, y] = p(w),
          a = 1 - i / 8;
        glowDot(g, x, y + wob(w), (0.18 + 0.25 * a) * m, kind === 'firework' ? (i % 2 ? '#ffe14d' : '#ff5ad0') : col, 0.7 * a);
      }
      const [x, y] = p(u);
      glowDot(g, x, y + wob(u), 0.55 * m, col, 1);
      glowDot(g, x, y + wob(u), 0.2 * m, '#ffffff', 1);
    } else {
      const u = sh - T;
      if (kind === 'firework') {
        for (const [c, R, sd] of [['#ff5ad0', 1.6, 1], ['#ffe14d', 1.2, 2], ['#5ae0ff', 0.9, 3]]) burst(g, s.CX, s.CY, u / 0.6, c, 14, R * m, sd);
        flash(g, s.CX, s.CY, u / 0.3, 1.2 * m, '#ffe14d');
      } else {
        impact(f, s, u, col, 1.1);
        smoke(g, s.CX, s.CY, u, 4, 0.8 * m, kind === 'hex' ? '#3a2a4a' : SMOKE);
      }
    }
  },
  // (a rocket: a streak of flame on a trail of smoke, an explosion)
  rocket(f, s) {
    const { g } = f,
      sh = s.shot,
      m = s.m,
      T = 0.17,
      p = u => arc(s.mx, s.my, s.CX, s.CY, u, 0.4 * m);
    flash(g, s.mx, s.my, sh / 0.2, 0.6 * m, HOT);
    if (sh < T) {
      const u = sh / T;
      for (let i = 6; i >= 1; i--) {
        const w = u - i * 0.07;
        if (w < 0) continue;
        const [x, y] = p(w);
        glowDot(g, x, y, (0.15 + 0.06 * i) * m, '#77737a', 0.5 * (1 - i / 7));
      }
      const [x, y] = p(u),
        [x2, y2] = p(Math.max(0, u - 0.06));
      g.strokeStyle = '#e8e4dc';
      g.lineWidth = Math.max(2, 0.09 * m);
      g.beginPath();
      g.moveTo(x2, y2);
      g.lineTo(x, y);
      g.stroke();
      glowDot(g, x2, y2, 0.35 * m, '#ff8a3d', 1);
    } else {
      const u = sh - T;
      flash(g, s.CX, s.CY, u / 0.4, 1.8 * m, '#ffb347');
      shock(g, s.CX, s.CY, u / 0.35, 1.6 * m, '#ffe14d');
      burst(g, s.CX, s.CY, u / 0.6, '#ff8a3d', 16, 1.4 * m);
      smoke(g, s.CX, s.CY, u, 6, 1.2 * m);
    }
  },
  // (sound: rings thrown at him, each bigger, one after another)
  rings(f, s, col) {
    const { g } = f,
      sh = s.shot,
      m = s.m,
      an = Math.atan2(s.CY - s.my, s.CX - s.mx);
    if (sh > 0.5) return;
    g.lineWidth = Math.max(2, 0.08 * m);
    for (let i = 0; i < 5; i++) {
      const u = sh * 5 - i * 0.3;
      if (u <= 0 || u >= 1) continue;
      const x = lerp(s.mx, s.CX, u),
        y = lerp(s.my, s.CY, u);
      g.strokeStyle = rgba(i % 2 ? '#ffffff' : col, 0.9 * (1 - u * 0.5));
      g.beginPath();
      g.arc(x, y, (0.3 + 0.7 * u) * m, an - 0.9, an + 0.9);
      g.stroke();
    }
    glowDot(g, s.mx, s.my, 0.7 * m, col, 1 - sh / 0.5);
    impact(f, s, sh - 0.12, col, 0.9);
    shock(g, s.CX, s.CY, (sh - 0.12) / 0.3, 1.3 * m, col);
  },
  // (a swarm: hornets streaming at him along their own curves, swirling round him, gone)
  swarm(f, s) {
    const { g } = f,
      sh = s.shot,
      m = s.m;
    if (sh > 0.8) return;
    for (let i = 0; i < 14; i++) {
      const h = hash(i, 17),
        u = clamp01((sh - i * 0.012) / 0.16);
      if (u <= 0) continue;
      let x, y;
      if (u < 1) [x, y] = arc(s.mx, s.my, s.CX, s.CY, u, (h - 0.3) * 1.6 * m);
      else {
        const an = s.t * 14 + i * 1.7,
          r = (0.3 + 0.3 * h) * m * (1 + (sh - 0.2) * 2);
        x = s.CX + Math.cos(an) * r;
        y = s.CY + Math.sin(an) * r * 0.7;
      }
      hornet(g, x, y, m, s.t + i, 1 - clamp01((sh - 0.5) / 0.3));
    }
    impact(f, s, sh - 0.16, '#ffd23a', 0.6);
  },
};
// a hornet at (X, Y): its striped body, its wings a flicker
function hornet(g, X, Y, m, t, a = 1) {
  if (a <= 0) return;
  const L = 0.13 * m,
    H = 0.06 * m;
  g.fillStyle = rgba('#ffd23a', a);
  g.fillRect(X - L / 2, Y - H / 2, L, H);
  g.fillStyle = rgba('#120c06', a);
  g.fillRect(X - L * 0.1, Y - H / 2, L * 0.18, H);
  g.fillRect(X + L * 0.25, Y - H / 2, L * 0.25, H);
  g.fillStyle = rgba('#ffffff', 0.6 * a * Math.abs(Math.sin(t * 60)));
  g.fillRect(X - L * 0.2, Y - H * 1.6, L * 0.4, H * 0.9);
}

// ---- the threats, by kind (props.js AIM_Y says how high each is): its sprites, how it arrives, its sight, how it is
// drawn (alive and taken out) and how it fires
// a quadcopter (the AI's, over a modern city's roads): arms out to its rotors, a gun pod under it, a red camera eye
const DRONE = [
  2.0,
  1.0,
  1.0,
  0.5,
  (x, P, mat) => {
    const [body, light] = matOf(P, mat);
    lineP(x, [[-0.72, -0.13], [0.72, -0.13]], EDGE, 0.13);
    lineP(x, [[-0.72, -0.13], [0.72, -0.13]], light, 0.05);
    for (const s of [-0.7, 0.7]) {
      rr(x, s - 0.11, -0.27, 0.22, 0.17, 0.06, body);
      lineP(x, [[s, -0.27], [s, -0.36]], EDGE, 0.05);
    }
    lineP(x, [[-0.28, 0.16], [-0.36, 0.34], [-0.12, 0.34]], EDGE, 0.05);
    lineP(x, [[0.28, 0.16], [0.36, 0.34], [0.12, 0.34]], EDGE, 0.05);
    rr(x, -0.46, -0.21, 0.92, 0.4, 0.17, body);
    rr(x, -0.3, -0.29, 0.52, 0.14, 0.07, light, 0.035);
    x.fillStyle = P.line;
    x.fillRect(-0.4, 0.05, 0.8, 0.05);
    rr(x, -0.36, 0.13, 0.36, 0.14, 0.05, body, 0.035);
    lineP(x, [[-0.34, 0.2], [-0.64, 0.2]], EDGE, 0.08);
    discP(x, -0.2, -0.02, 0.13, EDGE, 0);
    discP(x, -0.2, -0.02, 0.1, '#3a0a10', 0);
  },
];
// an orb sentry (in space: no rotors, only thrusters): a sphere banded in the accent, a visor, a thruster each side
const SENTRY = [
  1.5,
  1.3,
  0.75,
  0.65,
  (x, P, mat) => {
    const [body, light] = matOf(P, mat),
      gr = x.createRadialGradient(-0.14, -0.18, 0.03, 0, 0, 0.44);
    gr.addColorStop(0, mixHex(light, '#ffffff', 0.4));
    gr.addColorStop(0.5, light);
    gr.addColorStop(1, body);
    for (const sx of [-1, 1]) polyP(x, [[sx * 0.34, -0.13], [sx * 0.6, -0.2], [sx * 0.6, 0.2], [sx * 0.34, 0.13]], body);
    lineP(x, [[0.04, -0.42], [0.12, -0.62]], EDGE, 0.035);
    discP(x, 0.12, -0.62, 0.045, P.line, 0.02);
    discP(x, 0, 0, 0.44, gr);
    x.beginPath();
    x.ellipse(0, 0.04, 0.44, 0.1, 0, 0, Math.PI);
    x.strokeStyle = P.line;
    x.lineWidth = 0.04;
    x.stroke();
    x.beginPath();
    x.ellipse(-0.18, -0.04, 0.2, 0.13, 0, 0, TAU);
    x.fillStyle = EDGE;
    x.fill();
  },
];
// a clone's hover platform
const PLATFORM = [
  1.5,
  0.45,
  0.75,
  0.12,
  (x, P, mat) => {
    const [body, light] = matOf(P, mat);
    rr(x, -0.64, -0.06, 1.28, 0.2, 0.1, body);
    x.fillStyle = P.line;
    x.fillRect(-0.55, -0.02, 1.1, 0.04);
    for (const s of [-0.36, 0.36]) rr(x, s - 0.11, 0.12, 0.22, 0.1, 0.04, light, 0.03);
  },
];
// a force field's emitter (hung on its cables): its housing, its coils, its lens down at the road
const EMITTER = [
  1.3,
  0.9,
  0.65,
  0.4,
  (x, P, mat) => {
    const [body, light] = matOf(P, mat);
    for (const s of [-1, 1]) polyP(x, [[s * 0.4, -0.1], [s * 0.62, -0.02], [s * 0.6, 0.12], [s * 0.36, 0.1]], body, 0.035);
    polyP(x, [[-0.48, -0.26], [0.48, -0.26], [0.3, 0.22], [-0.3, 0.22]], body);
    rr(x, -0.5, -0.34, 1, 0.1, 0.03, light, 0.035);
    x.strokeStyle = P.line;
    x.lineWidth = 0.035;
    for (const cx of [-0.22, 0, 0.22]) {
      x.beginPath();
      x.ellipse(cx, -0.02, 0.06, 0.16, 0, 0, TAU);
      x.stroke();
    }
    discP(x, 0, 0.24, 0.12, EDGE, 0);
  },
];
// its curtain: a band of force, a metre of it, stretched down to the roof
const CURTAIN = [
  1,
  1,
  0.5,
  1,
  x => {
    const gr = x.createLinearGradient(-0.5, 0, 0.5, 0);
    gr.addColorStop(0, rgba(SIGHT, 0));
    gr.addColorStop(0.35, rgba(SIGHT, 0.4));
    gr.addColorStop(0.5, rgba('#ffb0b8', 0.75));
    gr.addColorStop(0.65, rgba(SIGHT, 0.4));
    gr.addColorStop(1, rgba(SIGHT, 0));
    x.fillStyle = gr;
    x.fillRect(-0.5, -1, 1, 1);
  },
];
// the AI's eye: a camera on a cable (where cameras hang: streets, malls, a casino's floor, inside the machine), its
// clamp and bracket (still), its head turning to watch him, the cursor's arrow on its side
const EYE_MOUNT = [
  0.6,
  0.6,
  0.3,
  0.5,
  (x, P, mat) => {
    const [body, light] = matOf(P, mat);
    rr(x, -0.2, -0.48, 0.4, 0.13, 0.04, light);
    lineP(x, [[0, -0.36], [0, -0.04]], EDGE, 0.11);
    lineP(x, [[0, -0.36], [0, -0.04]], body, 0.05);
    discP(x, 0, 0, 0.08, body);
  },
];
const EYE_HEAD = [
  1.5,
  0.8,
  0.85,
  0.2,
  (x, P, mat) => {
    const [body, light] = matOf(P, mat);
    for (let i = 0; i < 4; i++) lineP(x, [[0.42 + i * 0.05, 0.1], [0.42 + i * 0.05, 0.4]], EDGE, 0.03);
    rr(x, -0.58, 0.04, 1.02, 0.44, 0.13, light);
    rr(x, -0.58, 0.04, 1.02, 0.14, 0.07, mixHex(light, '#ffffff', 0.3), 0);
    x.fillStyle = P.line;
    x.fillRect(-0.5, 0.38, 0.86, 0.04);
    // (the hood over its lens)
    polyP(x, [[-0.58, 0.02], [-0.8, -0.02], [-0.8, 0.5], [-0.58, 0.48]], body);
    discP(x, -0.68, 0.25, 0.17, EDGE, 0);
    x.beginPath();
    x.arc(-0.68, 0.25, 0.14, 0, TAU);
    x.strokeStyle = P.line;
    x.lineWidth = 0.025;
    x.stroke();
    // (the cursor's arrow, the AI's mark)
    const ax = 0.02,
      ay = 0.12,
      a = 0.24;
    polyP(x, [[ax, ay], [ax, ay + a], [ax + 0.24 * a, ay + 0.77 * a], [ax + 0.42 * a, ay + 1.1 * a], [ax + 0.56 * a, ay + 1.03 * a], [ax + 0.4 * a, ay + 0.72 * a], [ax + 0.71 * a, ay + 0.72 * a]], '#ffffff', 0.02);
  },
];
// a crane's hook block (a factory's, a scrapyard's) and the rocket turret hung off it
const HOOK = [
  0.8,
  1.0,
  0.4,
  0.9,
  x => {
    discP(x, 0, -0.78, 0.14, '#3a3a40');
    rr(x, -0.25, -0.72, 0.5, 0.38, 0.05, '#d8a020');
    x.save();
    x.beginPath();
    x.rect(-0.25, -0.72, 0.5, 0.38);
    x.clip();
    x.strokeStyle = EDGE;
    x.lineWidth = 0.07;
    for (let i = -3; i <= 3; i++) {
      x.beginPath();
      x.moveTo(i * 0.16 - 0.2, -0.72);
      x.lineTo(i * 0.16 + 0.2, -0.34);
      x.stroke();
    }
    x.restore();
    x.lineWidth = 0.045;
    x.strokeRect(-0.25, -0.72, 0.5, 0.38);
    lineP(x, [[0, -0.34], [0, -0.14], [0.02, -0.04], [0.12, -0.04], [0.16, -0.12]], EDGE, 0.08);
    lineP(x, [[0, -0.34], [0, -0.14], [0.02, -0.04], [0.12, -0.04], [0.16, -0.12]], '#9aa0a8', 0.035);
  },
];
const TURRET = [
  1.5,
  0.8,
  0.6,
  0.12,
  (x, P, mat) => {
    const [body, light] = matOf(P, mat);
    lineP(x, [[0, -0.04], [-0.2, 0.1]], EDGE, 0.035);
    lineP(x, [[0, -0.04], [0.2, 0.1]], EDGE, 0.035);
    for (const y of [0.13, 0.31]) {
      rr(x, -0.86, y, 0.56, 0.15, 0.04, light);
      discP(x, -0.86, y + 0.075, 0.065, EDGE, 0);
    }
    rr(x, -0.4, 0.08, 0.8, 0.44, 0.08, body);
    x.fillStyle = '#d8a020';
    x.fillRect(-0.34, 0.42, 0.68, 0.05);
    x.fillStyle = EDGE;
    for (let i = 0; i < 5; i++) x.fillRect(-0.32 + i * 0.14, 0.42, 0.06, 0.05);
    x.fillStyle = P.line;
    x.fillRect(-0.34, 0.15, 0.04, 0.24);
  },
];
// a speaker stack hung over a rave's (an arena's, a mall's) floor on its chains: three cabinets in a curve, their cones
const SPEAKER = [
  1.4,
  1.8,
  0.7,
  0.9,
  (x, P, mat) => {
    const [body, light] = matOf(P, mat);
    rr(x, -0.55, -0.88, 1.1, 0.09, 0.03, light);
    for (let i = 0; i < 3; i++) {
      const dx = -0.07 * i * i,
        y = -0.76 + i * 0.5;
      polyP(x, [[-0.5 + dx, y], [0.5 + dx, y], [0.46 + dx, y + 0.46], [-0.46 + dx - 0.04 * i, y + 0.47]], body);
      rr(x, -0.44 + dx - 0.02 * i, y + 0.05, 0.84, 0.35, 0.04, mixHex(body, '#000000', 0.35), 0);
      for (const cx of [-0.2, 0.17]) {
        discP(x, cx + dx, y + 0.22, 0.15, EDGE, 0);
        x.beginPath();
        x.arc(cx + dx, y + 0.22, 0.14, 0, TAU);
        x.strokeStyle = mixHex(light, P.line, 0.4);
        x.lineWidth = 0.02;
        x.stroke();
      }
    }
  },
];
// lanterns: a paper one (a night market's, a Tokyo street's) on its string, an iron one (a castle's) on its chain
const LANTERN_PAPER = [
  1.0,
  1.4,
  0.5,
  0.7,
  (x, P) => {
    const red = mixHex('#d8342a', P.near, 0.12),
      gold = '#e0b040';
    lineP(x, [[0, 0.46], [0, 0.66]], red, 0.03);
    for (const s of [-0.05, 0.05]) lineP(x, [[s, 0.5], [s * 1.6, 0.66]], red, 0.025);
    x.beginPath();
    x.ellipse(0, 0, 0.4, 0.44, 0, 0, TAU);
    x.fillStyle = red;
    x.fill();
    x.lineWidth = 0.045;
    x.stroke();
    x.strokeStyle = rgba('#5a0a0a', 0.6);
    x.lineWidth = 0.025;
    for (const r of [0.13, 0.27]) {
      x.beginPath();
      x.ellipse(0, 0, r, 0.43, 0, 0, TAU);
      x.stroke();
    }
    x.fillStyle = rgba('#ffe0a0', 0.35);
    x.beginPath();
    x.ellipse(-0.06, -0.04, 0.2, 0.3, 0, 0, TAU);
    x.fill();
    rr(x, -0.2, -0.53, 0.4, 0.11, 0.03, gold, 0.035);
    rr(x, -0.18, 0.41, 0.36, 0.09, 0.03, gold, 0.035);
  },
];
const LANTERN_IRON = [
  0.9,
  1.4,
  0.45,
  0.7,
  (x, P) => {
    const iron = mixHex('#22202a', P.near, 0.15);
    x.beginPath();
    x.arc(0, -0.6, 0.06, 0, TAU);
    x.strokeStyle = iron;
    x.lineWidth = 0.035;
    x.stroke();
    x.fillStyle = rgba('#b07aff', 0.22);
    x.fillRect(-0.24, -0.38, 0.48, 0.66);
    polyP(x, [[-0.32, -0.36], [0.32, -0.36], [0.12, -0.54], [-0.12, -0.54]], iron);
    polyP(x, [[-0.3, 0.28], [0.3, 0.28], [0.16, 0.4], [-0.16, 0.4]], iron);
    polyP(x, [[-0.06, 0.4], [0.06, 0.4], [0, 0.56]], iron, 0.03);
    for (const bx of [-0.24, -0.08, 0.08, 0.24]) lineP(x, [[bx, -0.36], [bx, 0.28]], iron, 0.045);
    lineP(x, [[-0.24, -0.05], [0.24, -0.05]], iron, 0.03);
  },
];
// a ghost (a graveyard's, a castle's): a sheet of pale light, its eyes and mouth dark holes
const GHOST = [
  1.2,
  1.5,
  0.6,
  0.6,
  (x, P) => {
    const pale = mixHex('#e6fff4', P.line, 0.12);
    x.beginPath();
    x.moveTo(-0.38, 0.55);
    x.lineTo(-0.38, -0.15);
    x.arc(0, -0.15, 0.38, Math.PI, TAU);
    x.lineTo(0.38, 0.55);
    for (let i = 0; i < 4; i++) {
      const x0 = 0.38 - i * 0.19;
      x.quadraticCurveTo(x0 - 0.095, i % 2 ? 0.7 : 0.4, x0 - 0.19, 0.55);
    }
    x.closePath();
    x.fillStyle = rgba(pale, 0.9);
    x.fill();
    x.lineWidth = 0.04;
    x.strokeStyle = EDGE;
    x.stroke();
    // (its arms, reaching)
    polyP(x, [[-0.36, 0.02], [-0.58, 0.14], [-0.52, 0.22], [-0.36, 0.16]], rgba(pale, 0.9), 0.035);
    x.fillStyle = EDGE;
    for (const [ex, ey] of [[-0.16, -0.18], [0.08, -0.18]]) {
      x.beginPath();
      x.ellipse(ex, ey, 0.075, 0.11, 0, 0, TAU);
      x.fill();
    }
    x.beginPath();
    x.ellipse(-0.04, 0.04, 0.06, 0.1, 0, 0, TAU);
    x.fill();
  },
];
// an ice sentry (the arctic's) or a floating crystal (the sky islands'): a great crystal, two smaller off its foot
const SHARD = [
  1.3,
  1.9,
  0.65,
  0.95,
  (x, P, mat) => {
    const [hi, mid] = mat === 'crystal' ? ['#e2c4ff', '#8452e0'] : ['#dff6ff', '#5fb4e6'];
    const prism = (cx, cy, L, W, rot) => {
      x.save();
      x.translate(cx, cy);
      x.rotate(rot);
      polyP(x, [[0, -L], [W, -L * 0.55], [W, L * 0.5], [0, L], [-W, L * 0.5], [-W, -L * 0.55]], mid);
      polyP(x, [[0, -L], [0, L], [-W, L * 0.5], [-W, -L * 0.55]], rgba(hi, 0.95), 0);
      lineP(x, [[0, -L], [0, L]], rgba('#ffffff', 0.9), 0.025);
      x.restore();
    };
    prism(-0.3, 0.3, 0.32, 0.11, -0.55);
    prism(0.3, 0.32, 0.28, 0.1, 0.6);
    prism(0, 0, 0.82, 0.21, 0);
  },
];
// a hornet hive (a forest's) hung off a branch: a paper teardrop banded in its rings, its way in dark
const HIVE = [
  1.1,
  1.6,
  0.55,
  0.75,
  (x, P) => {
    const paper = mixHex('#b89a6a', P.near, 0.2),
      dark = mixHex('#6a5034', P.near, 0.2),
      leaf = mixHex('#3f8a2a', P.near, 0.25);
    lineP(x, [[-0.4, -0.66], [0.45, -0.7]], '#3a2616', 0.07);
    for (const [lx, ly, r] of [[0.28, -0.6, 0.5], [-0.3, -0.76, -0.4], [0.05, -0.78, 0.1]]) {
      x.beginPath();
      x.ellipse(lx, ly, 0.12, 0.05, r, 0, TAU);
      x.fillStyle = leaf;
      x.fill();
      x.lineWidth = 0.025;
      x.stroke();
    }
    lineP(x, [[0, -0.68], [0, -0.55]], '#3a2616', 0.05);
    const body = () => {
      x.beginPath();
      x.moveTo(0, -0.58);
      x.bezierCurveTo(0.42, -0.5, 0.44, 0.2, 0, 0.52);
      x.bezierCurveTo(-0.44, 0.2, -0.42, -0.5, 0, -0.58);
    };
    body();
    x.fillStyle = paper;
    x.fill();
    x.save();
    body();
    x.clip();
    x.fillStyle = dark;
    for (let i = 0; i < 6; i++) x.fillRect(-0.5, -0.48 + i * 0.18, 1, 0.06);
    x.restore();
    body();
    x.lineWidth = 0.045;
    x.strokeStyle = EDGE;
    x.stroke();
    x.beginPath();
    x.ellipse(-0.08, 0.28, 0.09, 0.07, 0, 0, TAU);
    x.fillStyle = EDGE;
    x.fill();
  },
];
// the flyers, each its own bird (or a gargoyle off a castle, a firebird off the lava): colours and build
const FLYERS = {
  vulture: { body: '#4a3426', wing: '#3e2b1f', tip: '#1e1410', head: '#d88a78', beak: '#e8c46a', ruff: '#ece4d4', flap: 7 },
  raven: { body: '#1a1a26', wing: '#15151f', tip: '#2e2e48', head: '#1a1a26', beak: '#34343c', flap: 10 },
  gargoyle: { body: '#706d66', wing: '#5a5751', tip: '#3d3a36', head: '#706d66', beak: '#4d4a45', horns: true, stone: true, flap: 5 },
  firebird: { body: '#e8501e', wing: '#ff7a1a', tip: '#ffd23a', head: '#ff9a2a', beak: '#ffe08a', fire: true, flap: 8 },
  eagle: { body: '#5a3a1e', wing: '#4a2e18', tip: '#24160c', head: '#f4f0e6', beak: '#f2c23a', flap: 6 },
  // (the marabou of a winter yard, "Марабу": a dark stork with a bald pink head, a white ruff and a huge pale bill)
  marabou: { body: '#2a2a30', wing: '#18181c', tip: '#d8d8d8', head: '#e88a7a', beak: '#c8b890', ruff: '#ece8e0', flap: 5 },
  // (the favourites' worlds': a gull over the sea of the empty Earth; a cartoon pterodactyl over the jungle delta, leathery
  // and toothless, its crest red)
  seagull: { body: '#f4f4f0', wing: '#c8ccd2', tip: '#2a2a30', head: '#ffffff', beak: '#f2c23a', flap: 8 },
  ptero: { body: '#7a5a8a', wing: '#9a6aa8', tip: '#c83a3a', head: '#7a5a8a', beak: '#e8c890', horns: true, flap: 4 },
};
const FLYER_BODY = {},
  FLYER_WING = {};
const flyerBody = kind =>
  (FLYER_BODY[kind] ??= [
    1.6,
    0.9,
    0.75,
    0.45,
    x => {
      const c = FLYERS[kind];
      // (its tail; a gargoyle's long with a barb)
      if (c.stone) {
        lineP(x, [[0.3, 0.05], [0.62, 0.18], [0.78, 0.06]], EDGE, 0.08);
        lineP(x, [[0.3, 0.05], [0.62, 0.18], [0.78, 0.06]], c.body, 0.04);
        polyP(x, [[0.78, 0.0], [0.88, 0.06], [0.76, 0.12]], c.body, 0.03);
      } else polyP(x, [[0.3, -0.02], [0.72, -0.1], [0.76, 0.06], [0.7, 0.14], [0.3, 0.1]], c.fire ? '#ffb22a' : c.wing);
      // (its talons, forward to strike)
      lineP(x, [[-0.02, 0.14], [-0.14, 0.32], [-0.24, 0.3]], EDGE, 0.04);
      lineP(x, [[0.1, 0.14], [0.0, 0.33], [-0.1, 0.32]], EDGE, 0.04);
      x.beginPath();
      x.ellipse(0.05, 0.02, 0.38, 0.17, -0.08, 0, TAU);
      x.fillStyle = c.body;
      x.fill();
      x.lineWidth = 0.045;
      x.stroke();
      if (c.ruff) {
        x.beginPath();
        x.ellipse(-0.28, -0.04, 0.12, 0.1, 0, 0, TAU);
        x.fillStyle = c.ruff;
        x.fill();
        x.stroke();
      }
      // (its head, its hooked beak, its eye a dark socket lit live)
      discP(x, -0.4, -0.1, c.ruff ? 0.11 : 0.13, c.head);
      polyP(x, [[-0.5, -0.14], [-0.66, -0.08], [-0.62, -0.02], [-0.52, -0.04]], c.beak, 0.03);
      if (c.horns) {
        polyP(x, [[-0.42, -0.2], [-0.36, -0.36], [-0.32, -0.2]], c.body, 0.03);
        polyP(x, [[-0.34, -0.2], [-0.24, -0.32], [-0.26, -0.18]], c.body, 0.03);
      }
      discP(x, -0.43, -0.12, 0.035, EDGE, 0);
      if (c.stone) {
        lineP(x, [[-0.1, -0.08], [0.0, 0.02], [-0.04, 0.12]], rgba('#000000', 0.45), 0.02);
        lineP(x, [[0.2, -0.1], [0.14, 0.04]], rgba('#000000', 0.45), 0.02);
      }
      if (c.fire) {
        x.fillStyle = rgba('#fff0a0', 0.6);
        x.beginPath();
        x.ellipse(0.0, 0.0, 0.22, 0.08, -0.08, 0, TAU);
        x.fill();
      }
    },
  ]);
// (a wing pointing straight back from its shoulder at the origin: flapped by turning it)
const flyerWing = kind =>
  (FLYER_WING[kind] ??= [
    1.2,
    0.7,
    0.1,
    0.2,
    x => {
      const c = FLYERS[kind];
      if (c.stone) {
        // (a bat's wing of stone: its bones and the membrane between them scalloped)
        x.beginPath();
        x.moveTo(0, 0);
        x.lineTo(0.95, -0.08);
        x.quadraticCurveTo(0.8, 0.14, 0.72, 0.36);
        x.quadraticCurveTo(0.55, 0.2, 0.45, 0.4);
        x.quadraticCurveTo(0.3, 0.22, 0.15, 0.3);
        x.closePath();
        x.fillStyle = c.wing;
        x.fill();
        x.lineWidth = 0.04;
        x.stroke();
        for (const [ex, ey] of [[0.72, 0.36], [0.45, 0.4]]) lineP(x, [[0.05, 0], [ex, ey]], EDGE, 0.025);
        return;
      }
      x.beginPath();
      x.moveTo(0, -0.04);
      x.quadraticCurveTo(0.5, -0.14, 0.9, -0.06);
      // (its primaries fingered at the tip)
      for (let i = 0; i < 4; i++) {
        const fx = 0.9 - i * 0.1;
        x.lineTo(fx + 0.12, 0.02 + i * 0.07);
        x.lineTo(fx - 0.02, 0.06 + i * 0.07);
      }
      x.quadraticCurveTo(0.35, 0.32, 0, 0.12);
      x.closePath();
      x.fillStyle = c.wing;
      x.fill();
      x.lineWidth = 0.04;
      x.strokeStyle = EDGE;
      x.stroke();
      x.fillStyle = c.tip;
      x.beginPath();
      x.moveTo(0.62, -0.1);
      x.quadraticCurveTo(0.8, -0.1, 0.9, -0.06);
      x.lineTo(0.62, 0.28);
      x.closePath();
      x.fill();
      x.strokeStyle = rgba('#ffffff', c.fire ? 0.5 : 0.15);
      x.lineWidth = 0.02;
      for (let i = 1; i < 4; i++) lineP(x, [[0.1, 0.02 + i * 0.02], [0.3 + i * 0.12, 0.04 + i * 0.06]], x.strokeStyle, 0.02);
    },
  ]);
// a jellyfish (the deep's): its bell of light, scalloped, its insides glowing
const JELLY = [
  1.3,
  0.8,
  0.65,
  0.5,
  (x, P) => {
    const col = mixHex('#ff7ad8', P.line, 0.25),
      gr = x.createRadialGradient(0, -0.1, 0.03, 0, -0.05, 0.5);
    gr.addColorStop(0, rgba('#ffffff', 0.9));
    gr.addColorStop(0.4, rgba(col, 0.75));
    gr.addColorStop(1, rgba(col, 0.45));
    x.beginPath();
    x.moveTo(-0.52, 0.08);
    x.bezierCurveTo(-0.55, -0.42, 0.55, -0.42, 0.52, 0.08);
    for (let i = 0; i < 6; i++) {
      const x0 = 0.52 - (i * 1.04) / 6;
      x.quadraticCurveTo(x0 - 0.087, 0.2, x0 - 0.173, 0.08);
    }
    x.closePath();
    x.fillStyle = gr;
    x.fill();
    x.lineWidth = 0.04;
    x.strokeStyle = EDGE;
    x.stroke();
    x.strokeStyle = rgba('#ffffff', 0.55);
    x.lineWidth = 0.025;
    for (let i = 0; i < 4; i++) {
      x.beginPath();
      x.arc(-0.24 + i * 0.16, -0.02, 0.07, Math.PI, TAU);
      x.stroke();
    }
  },
];
// an anglerfish (the deep's): a great head, its jaws open on its teeth, a small eye, a tail; its lure drawn live
const ANGLER = [
  1.9,
  1.2,
  0.85,
  0.6,
  (x, P) => {
    const body = mixHex('#2c2244', P.near, 0.3),
      belly = mixHex('#5a4a78', P.near, 0.3);
    polyP(x, [[0.58, 0.0], [0.9, -0.28], [0.84, 0.0], [0.9, 0.28]], body);
    polyP(x, [[-0.1, -0.44], [0.0, -0.62], [0.12, -0.42], [0.22, -0.56], [0.3, -0.34]], body, 0.035);
    x.beginPath();
    x.moveTo(-0.78, -0.16);
    x.quadraticCurveTo(-0.5, -0.56, -0.1, -0.44);
    x.quadraticCurveTo(0.35, -0.32, 0.62, 0.0);
    x.quadraticCurveTo(0.4, 0.3, -0.1, 0.36);
    x.quadraticCurveTo(-0.5, 0.46, -0.82, 0.16);
    x.lineTo(-0.42, 0.02);
    x.closePath();
    x.fillStyle = body;
    x.fill();
    x.lineWidth = 0.045;
    x.strokeStyle = EDGE;
    x.stroke();
    x.fillStyle = belly;
    x.beginPath();
    x.ellipse(-0.1, 0.22, 0.42, 0.1, -0.1, 0, TAU);
    x.fill();
    // (its maw, its teeth)
    polyP(x, [[-0.78, -0.16], [-0.42, 0.02], [-0.82, 0.16]], '#3a0a16', 0.03);
    x.fillStyle = '#f4f0e6';
    for (let i = 0; i < 4; i++) {
      const u = i / 4;
      polyP(x, [[lerp(-0.76, -0.46, u), lerp(-0.15, 0.0, u)], [lerp(-0.72, -0.43, u), lerp(-0.13, 0.01, u)], [lerp(-0.7, -0.45, u) - 0.02, lerp(-0.04, 0.06, u)]], '#f4f0e6', 0);
      polyP(x, [[lerp(-0.8, -0.46, u), lerp(0.15, 0.03, u)], [lerp(-0.75, -0.43, u), lerp(0.13, 0.02, u)], [lerp(-0.74, -0.45, u) - 0.02, lerp(0.05, -0.02, u)]], '#f4f0e6', 0);
    }
    polyP(x, [[0.05, 0.1], [0.3, 0.22], [0.1, 0.26]], belly, 0.03);
    discP(x, -0.36, -0.22, 0.075, '#f4f0e6', 0.03);
    discP(x, -0.38, -0.22, 0.035, EDGE, 0);
    x.fillStyle = P.line;
    for (const [sx, sy] of [[0.0, -0.2], [0.18, -0.12], [0.34, -0.04], [0.12, 0.05]]) discP(x, sx, sy, 0.025, P.line, 0);
  },
];

// ---- each threat: how it arrives, its sight, how it is drawn, alive and taken out, and how it fires
// ---- ATL's threats (world/artists.js; props.js THEMES of its pack's places), cartoon, nothing of real harm in them
// a flying boombox ("Радио Апокалипсис", "66.6 FM"): chrome, two speakers, an amber dial, a handle, rotors under it
const JAMMER = [
  1.8,
  1.3,
  0.9,
  0.6,
  (x, P) => {
    const chrome = mixHex('#9aa3ad', P.near, 0.15),
      dark = mixHex('#1a1c20', P.near, 0.1);
    lineP(x, [[-0.45, -0.38], [-0.35, -0.55], [0.35, -0.55], [0.45, -0.38]], chrome, 0.08);
    rr(x, -0.78, -0.4, 1.56, 0.78, 0.1, dark);
    rr(x, -0.7, -0.33, 1.4, 0.14, 0.03, chrome, 0.03);
    for (const cx of [-0.42, 0.42]) {
      discP(x, cx, 0.08, 0.26, chrome, 0.04);
      discP(x, cx, 0.08, 0.2, '#0a0a0c', 0);
      discP(x, cx, 0.08, 0.07, '#2a2a30', 0);
    }
    rr(x, -0.13, -0.08, 0.26, 0.16, 0.02, '#ffb040', 0.03);
    x.fillStyle = '#ff3a2a';
    x.fillRect(-0.02, -0.1, 0.03, 0.2);
    // (its legs to the rotors)
    for (const s of [-0.62, 0.62]) lineP(x, [[s, 0.36], [s * 1.25, 0.5]], chrome, 0.05);
  },
];
// a puff of red smoke with two yellow eyes ("Behemoth"; no horns, no face, only the eyes): for the cursor's hand
const SHADOW = [
  1.6,
  1.4,
  0.8,
  0.7,
  x => {
    for (const [cx, cy, r] of [[-0.25, 0.1, 0.4], [0.25, 0.05, 0.42], [0, -0.25, 0.42], [0, 0.25, 0.38]]) discP(x, cx, cy, r, '#a8141c', 0.05);
    for (const s of [-0.16, 0.16]) {
      x.beginPath();
      x.ellipse(s, -0.08, 0.1, 0.06, s * 1.5, 0, TAU);
      x.fillStyle = '#ffe23a';
      x.fill();
    }
  },
];
// a spirit drum ("Шаман"): a frame drum of wood with jingles, a spiral eye painted on its skin (made up, no symbol)
const DRUM = [
  1.4,
  1.4,
  0.7,
  0.7,
  (x, P) => {
    const wood = mixHex('#8a5a2a', P.near, 0.15),
      skin = mixHex('#e8d8b0', P.near, 0.1);
    discP(x, 0, 0, 0.58, wood, 0.05);
    discP(x, 0, 0, 0.48, skin, 0.03);
    x.strokeStyle = mixHex('#c81e1e', P.line, 0.3);
    x.lineWidth = 0.05;
    x.beginPath();
    for (let a = 0; a < TAU * 2.2; a += 0.2) {
      const r = 0.04 + a * 0.028;
      x.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.9);
    }
    x.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      discP(x, Math.cos(a) * 0.53, Math.sin(a) * 0.53, 0.06, '#e0b040', 0.025);
    }
  },
];
// a kite that is a cartoon skull on two crossed bones, a piñata ("Кости", "#Fckswg х Trillogy"): it pops in sweets
const TOTEM = [
  1.6,
  1.8,
  0.8,
  0.8,
  (x, P) => {
    const bone = '#f0ece4';
    lineP(x, [[-0.6, -0.6], [0.6, 0.6]], EDGE, 0.16);
    lineP(x, [[0.6, -0.6], [-0.6, 0.6]], EDGE, 0.16);
    lineP(x, [[-0.6, -0.6], [0.6, 0.6]], bone, 0.09);
    lineP(x, [[0.6, -0.6], [-0.6, 0.6]], bone, 0.09);
    for (const [a, b] of [[-0.6, -0.6], [0.6, 0.6], [0.6, -0.6], [-0.6, 0.6]]) discP(x, a, b, 0.09, bone, 0.04);
    polyP(x, [[0, -0.85], [0.55, -0.1], [0, 0.75], [-0.55, -0.1]], rgba(mixHex('#ff2fd0', P.line, 0.3), 0.85), 0.05);
    x.beginPath();
    x.arc(0, -0.12, 0.36, Math.PI * 0.85, Math.PI * 2.15);
    x.lineTo(0.2, 0.32);
    x.lineTo(-0.2, 0.32);
    x.closePath();
    x.fillStyle = bone;
    x.fill();
    x.lineWidth = 0.05;
    x.stroke();
    x.fillStyle = EDGE;
    for (const s of [-0.14, 0.14]) {
      x.beginPath();
      x.ellipse(s, -0.1, 0.1, 0.12, 0, 0, TAU);
      x.fill();
    }
    // (its grin)
    x.fillRect(-0.14, 0.18, 0.28, 0.035);
    for (let i = -1; i <= 1; i++) x.fillRect(i * 0.09 - 0.012, 0.12, 0.024, 0.14);
  },
];
// a skull made of an equaliser's bars ("Ящик"): for the cursor's hand (drawn live while it plays)
const EQ_N = 13;
const eqProfile = q => {
  // (the skull's top and bottom at q, -1..1 across it: a dome, cheeks, a jaw; and whether the bar is an eye hole)
  const a = Math.abs(q);
  return { top: 0.62 * Math.sqrt(Math.max(0, 1 - q * q)) + 0.08, bot: a < 0.55 ? 0.5 : 0.32 - 0.2 * (a - 0.55), eye: Math.abs(a - 0.4) < 0.17 };
};
const EQSKULL = [
  1.5,
  1.5,
  0.75,
  0.7,
  (x, P) => {
    const col = mixHex('#9a7dff', P.line, 0.2);
    for (let i = 0; i < EQ_N; i++) {
      const q = (i / (EQ_N - 1)) * 2 - 1,
        { top, bot, eye } = eqProfile(q),
        bx = q * 0.6 - 0.035;
      x.fillStyle = col;
      if (eye) {
        x.fillRect(bx, -top, 0.07, top - 0.22);
        x.fillRect(bx, 0.02, 0.07, bot - 0.02);
      } else x.fillRect(bx, -top, 0.07, top + bot);
    }
  },
];
// ---- the favourites' threats (props.js THEMES of anthill, fujisan, lastman, compost), cartoon and kind, nothing of
// real harm in them
// a fire salamander ("Архитектор": it eats the colony) curled on a leaf it rides like a raft: black, its back spotted
// orange and yellow, a round friendly head
const SALAMANDER = [
  2.2,
  1.6,
  1.1,
  0.8,
  (x, P) => {
    const leaf = mixHex('#5aa83a', P.near, 0.15);
    x.beginPath();
    x.moveTo(-1.0, 0.45);
    x.quadraticCurveTo(0, 0.05, 1.0, 0.4);
    x.quadraticCurveTo(0, 0.85, -1.0, 0.45);
    x.fillStyle = leaf;
    x.fill();
    x.lineWidth = 0.07;
    x.stroke();
    lineP(x, [[-0.9, 0.46], [0.9, 0.42]], rgba('#d8ffb0', 0.6), 0.04);
    // (its body and curled tail)
    lineP(x, [[-0.75, 0.25], [-0.85, 0.0], [-0.65, -0.15], [-0.5, 0.0]], EDGE, 0.26);
    lineP(x, [[-0.75, 0.25], [-0.85, 0.0], [-0.65, -0.15], [-0.5, 0.0]], '#1a1a20', 0.16);
    rr(x, -0.6, -0.02, 1.1, 0.34, 0.17, '#1a1a20', 0.08);
    for (const lx of [-0.4, 0.3]) {
      lineP(x, [[lx, 0.25], [lx - 0.1, 0.38]], EDGE, 0.12);
      lineP(x, [[lx + 0.12, 0.25], [lx + 0.22, 0.38]], EDGE, 0.12);
    }
    discP(x, 0.6, 0.05, 0.27, '#1a1a20', 0.08);
    for (const [cx, cy, r] of [[-0.4, 0.08, 0.07], [-0.15, 0.04, 0.08], [0.12, 0.1, 0.07], [0.3, 0.02, 0.06], [0.55, -0.08, 0.07], [-0.72, -0.05, 0.05]]) discP(x, cx, cy, r, '#ffb020', 0);
    discP(x, 0.7, -0.02, 0.08, '#fff8e0', 0.03);
    discP(x, 0.72, -0.02, 0.04, EDGE, 0);
    lineP(x, [[0.66, 0.16], [0.82, 0.14]], EDGE, 0.03);
  },
];
// a soldier ant on the wing ("Архитектор": the clatter of a thousand mandibles): a helmet of a head, great mandibles,
// glossy beads of chitin (its wings drawn live)
const SOLDIERANT = [
  2.0,
  1.4,
  1.0,
  0.7,
  (x, P) => {
    const chitin = mixHex('#6a2a10', P.near, 0.1);
    for (const lx of [-0.3, -0.05, 0.2]) lineP(x, [[lx, 0.1], [lx - 0.1, 0.35], [lx - 0.15, 0.5]], EDGE, 0.06);
    discP(x, -0.6, 0.05, 0.3, chitin, 0.07);
    discP(x, -0.15, 0.05, 0.16, chitin, 0.07);
    discP(x, 0.4, -0.02, 0.3, chitin, 0.07);
    x.fillStyle = rgba('#ffd8a0', 0.45);
    x.beginPath();
    x.ellipse(0.35, -0.15, 0.12, 0.06, -0.3, 0, TAU);
    x.fill();
    discP(x, 0.5, -0.08, 0.07, '#ffe080', 0.03);
    lineP(x, [[0.38, -0.28], [0.55, -0.6], [0.8, -0.62]], EDGE, 0.05);
    lineP(x, [[0.48, -0.25], [0.75, -0.45], [0.95, -0.4]], EDGE, 0.05);
  },
];
// a tentacle up out of the deep ("Фудзи": the one called up from below, cute, not scary): violet, rows of pale suckers
// (drawn live, curling)
// an echo-zeppelin ("Фудзи"): a fat little airship with a fin, a gondola and round windows
const BLIMP = [
  2.4,
  1.4,
  1.2,
  0.6,
  (x, P) => {
    const body = mixHex('#e8b8d8', P.near, 0.1);
    polyP(x, [[-0.85, 0], [-1.15, -0.4], [-1.05, 0], [-1.15, 0.4]], mixHex(body, '#5a3a5a', 0.35), 0.06);
    x.beginPath();
    x.ellipse(0, 0, 0.95, 0.45, 0, 0, TAU);
    x.fillStyle = body;
    x.fill();
    x.lineWidth = 0.1;
    x.stroke();
    lineP(x, [[-0.6, -0.33], [-0.6, 0.33]], rgba('#5a3a5a', 0.4), 0.04);
    lineP(x, [[0, -0.45], [0, 0.45]], rgba('#5a3a5a', 0.4), 0.04);
    lineP(x, [[0.6, -0.33], [0.6, 0.33]], rgba('#5a3a5a', 0.4), 0.04);
    rr(x, -0.3, 0.42, 0.6, 0.22, 0.06, '#5a3a5a', 0.06);
    for (const wx of [-0.18, 0, 0.18]) discP(x, wx, 0.53, 0.05, '#ffd8a0', 0);
    x.fillStyle = rgba('#ffffff', 0.35);
    x.beginPath();
    x.ellipse(0.2, -0.25, 0.4, 0.08, 0, 0, TAU);
    x.fill();
  },
];
// a dragonfly ("Последний человек на Земле": a summer's day over the fields): a long teal body, big round eyes (its four
// wings drawn live, shimmering)
const DRAGONFLY = [
  2.2,
  0.8,
  1.1,
  0.4,
  x => {
    lineP(x, [[-1.0, 0.05], [0.3, 0]], EDGE, 0.16);
    lineP(x, [[-1.0, 0.05], [0.3, 0]], '#2ab8b0', 0.09);
    for (let k = 0; k < 6; k++) lineP(x, [[-0.85 + k * 0.17, -0.04], [-0.85 + k * 0.17, 0.08]], '#1a6a6a', 0.03);
    discP(x, 0.42, 0, 0.17, '#2ab8b0', 0.06);
    for (const dy of [-0.08, 0.08]) discP(x, 0.6, dy, 0.12, '#5ae0ff', 0.04);
    discP(x, 0.62, -0.1, 0.04, '#ffffff', 0);
  },
];
// a cartoon meteor ("Удобрением": what fell out of the sky): a lumpy rock, its craters, a crust of embers
const METEOR = [
  1.6,
  1.6,
  0.8,
  0.8,
  x => {
    polyP(x, [[-0.5, -0.2], [-0.25, -0.5], [0.2, -0.5], [0.5, -0.15], [0.45, 0.3], [0.1, 0.5], [-0.35, 0.42], [-0.55, 0.12]], '#5a4a4a', 0.09);
    for (const [cx, cy, r] of [[-0.18, -0.15, 0.12], [0.2, 0.1, 0.1], [-0.1, 0.25, 0.07]]) discP(x, cx, cy, r, '#3a2e2e', 0.03);
    lineP(x, [[0.3, -0.35], [0.45, 0.0], [0.3, 0.35]], rgba('#ff7a2a', 0.85), 0.07);
  },
];
// a rhinoceros beetle with a ball of soil it rolls ("Удобрением": the slow dance of the bugs): a glossy shell, a horn
const BEETLE = [
  2.0,
  1.6,
  1.0,
  0.8,
  (x, P) => {
    const shell = mixHex('#1a4a3a', P.near, 0.1);
    for (const lx of [-0.25, 0, 0.25]) lineP(x, [[lx, 0.2], [lx - 0.1, 0.45], [lx - 0.02, 0.6]], EDGE, 0.07);
    x.beginPath();
    x.ellipse(-0.1, 0, 0.55, 0.4, 0, 0, TAU);
    x.fillStyle = shell;
    x.fill();
    x.lineWidth = 0.08;
    x.stroke();
    lineP(x, [[-0.1, -0.4], [-0.1, 0.38]], EDGE, 0.04);
    x.fillStyle = rgba('#9affd0', 0.35);
    x.beginPath();
    x.ellipse(-0.3, -0.18, 0.18, 0.08, -0.4, 0, TAU);
    x.fill();
    discP(x, 0.5, 0.05, 0.2, shell, 0.07);
    polyP(x, [[0.55, -0.08], [0.85, -0.55], [0.95, -0.5], [0.72, 0.0]], shell, 0.06);
    discP(x, 0.58, 0.0, 0.05, '#ffe080', 0);
  },
];
// a rusty mini-rocket wobbling in ("Фудзи": on a rusty rocket): a stubby body of rusted plates, a round window, fins
const MINIROCKET = [
  1.4,
  2.0,
  0.7,
  1.0,
  (x, P) => {
    const rust = mixHex('#b0582a', P.near, 0.1);
    for (const s of [-1, 1]) polyP(x, [[s * 0.28, 0.3], [s * 0.55, 0.7], [s * 0.28, 0.6]], '#7a3a1a', 0.06);
    x.beginPath();
    x.moveTo(-0.3, 0.6);
    x.lineTo(-0.3, -0.3);
    x.quadraticCurveTo(0, -0.95, 0.3, -0.3);
    x.lineTo(0.3, 0.6);
    x.closePath();
    x.fillStyle = rust;
    x.fill();
    x.lineWidth = 0.09;
    x.stroke();
    x.fillStyle = rgba('#5a2a10', 0.6);
    for (let i = 0; i < 6; i++) x.fillRect(-0.22 + hash(i, 7) * 0.36, -0.2 + hash(i, 8) * 0.7, 0.1, 0.07);
    discP(x, 0, -0.15, 0.13, '#2a1a2a', 0.05);
    discP(x, -0.03, -0.18, 0.05, '#bfe8ff', 0);
    lineP(x, [[-0.3, 0.25], [0.3, 0.25]], '#5a2a10', 0.05);
  },
];
// a runaway hubcap ("Под небом салатовым": the red car's), chrome, spokes, the sun glinting off it
const HUBCAP = [
  1.4,
  1.4,
  0.7,
  0.7,
  x => {
    discP(x, 0, 0, 0.6, '#c8ccd2', 0.1);
    discP(x, 0, 0, 0.45, '#e8ecf0', 0.04);
    for (let k = 0; k < 6; k++) {
      const a = (k * TAU) / 6;
      lineP(x, [[Math.cos(a) * 0.12, Math.sin(a) * 0.12], [Math.cos(a) * 0.42, Math.sin(a) * 0.42]], '#8a9098', 0.08);
    }
    discP(x, 0, 0, 0.14, '#e8302a', 0.05);
    x.fillStyle = rgba('#ffffff', 0.6);
    x.beginPath();
    x.ellipse(-0.2, -0.25, 0.15, 0.06, -0.6, 0, TAU);
    x.fill();
  },
];
// a snow-walker ("Подснежник": the winter going away): a grumpy little snowman, a bucket hat, coal eyes, stick arms
const SNOWWALKER = [
  1.6,
  2.0,
  0.8,
  1.0,
  x => {
    discP(x, 0, 0.45, 0.45, '#f4f6fa', 0.08);
    discP(x, 0, -0.18, 0.32, '#f4f6fa', 0.08);
    for (const s of [-1, 1]) lineP(x, [[s * 0.4, 0.3], [s * 0.7, 0.05], [s * 0.78, -0.08]], '#5a3a1a', 0.05);
    rr(x, -0.22, -0.68, 0.44, 0.24, 0.04, '#8a8a90', 0.06);
    lineP(x, [[-0.3, -0.45], [0.3, -0.45]], EDGE, 0.06);
    for (const s of [-0.11, 0.11]) discP(x, s, -0.22, 0.045, EDGE, 0);
    lineP(x, [[-0.16, -0.32], [-0.05, -0.29]], EDGE, 0.03);
    lineP(x, [[0.16, -0.32], [0.05, -0.29]], EDGE, 0.03);
    polyP(x, [[0, -0.15], [0.25, -0.1], [0, -0.08]], '#ff8a2a', 0.03);
    for (const y of [0.3, 0.5]) discP(x, 0, y, 0.04, EDGE, 0);
  },
];
const THREATS = {
  drone: {
    halo: 1.3,
    appear: 'fly',
    sight: 'laser',
    draw(f, o, s) {
      const { g } = f,
        m = s.m,
        sp = spr(s, 'drone', DRONE);
      if (!s.alive) {
        shatter(g, sp, s.X, s.Y, m, s.hitU, 3, 2, s.seed, 0.3);
        smoke(g, s.X + s.hitU * 1.5 * m, s.Y + 2 * s.hitU * s.hitU * m, s.hitU, 6, 1.0 * m);
        return;
      }
      // (hovering on the beat: down and up over two beats, each its own way through it; its rotors spinning up as it
      // climbs (the thrust its lift takes: g and the climb's acceleration, integrated into the blades' turn), its body
      // tipping with its rise and fall)
      const L = f.L,
        w = Math.PI / L.A.beat,
        ph = w * (s.t - (L.A.beats?.[0] ?? 0)) + o.v * 4,
        rot = s.tilt + 0.06 * Math.sin(s.t * 2 + o.v * 3) - 0.12 * s.aim + 0.05 * Math.cos(ph),
        bob = 0.12 * m * Math.sin(ph),
        spin = 47 * (s.t - (0.12 * w * Math.cos(ph)) / 9.8),
        Y = s.Y + bob;
      g.save();
      g.translate(s.X, Y);
      g.rotate(rot);
      // (its rotors a blur, a bright blade catching the light)
      for (const sx of [-0.7, 0.7]) {
        g.fillStyle = rgba('#ffffff', 0.2 * s.a);
        g.fillRect((sx - 0.42) * m, -0.39 * m, 0.84 * m, 0.04 * m);
        const bw = 0.84 * Math.abs(Math.sin(spin + sx));
        g.fillStyle = rgba('#ffffff', 0.6 * s.a);
        g.fillRect((sx - bw / 2) * m, -0.4 * m, bw * m, 0.05 * m);
      }
      put(g, s, sp, 0, 0);
      glowDot(g, -0.2 * m, -0.02 * m, (0.3 + 0.2 * s.k + 0.3 * s.aim) * m, SIGHT, (0.5 + 0.5 * s.k) * s.a);
      glowDot(g, -0.2 * m, -0.02 * m, 0.08 * m, '#ffffff', s.a);
      glowDot(g, 0.46 * m, -0.04 * m, 0.16 * m, s.P.line, (0.4 + 0.6 * s.b) * s.a);
      g.restore();
      [s.mx, s.my] = turn(s.X, Y, m, rot, -0.66, 0.2);
    },
    fire: (f, s) => FIRES.tracers(f, s),
  },
  sentry: {
    halo: 1.2,
    appear: 'glitch',
    sight: 'laser',
    draw(f, o, s) {
      const { g } = f,
        m = s.m,
        sp = spr(s, 'sentry', SENTRY);
      if (!s.alive) {
        shatter(g, sp, s.X, s.Y, m, s.hitU, 3, 3, s.seed);
        shock(g, s.X, s.Y, s.hitU / 0.4, 2.2 * m, s.P.line);
        return;
      }
      const Y = s.Y + 0.1 * m * Math.sin(s.t * 2.2 + o.v * 5),
        jet = jetOf(f, s.P.line);
      // (its thrusters out to the sides and down, breathing with the bass)
      for (const sx of [-1, 1]) blit(g, jet, s.X + sx * 0.6 * m, Y, m, sx * 0.9, 1, (0.6 + 0.7 * f.mf.bass) * s.a);
      put(g, s, sp, s.X, Y);
      // (a ring of light round it, turning)
      g.strokeStyle = rgba(s.P.line, (0.35 + 0.4 * s.k) * s.a);
      g.lineWidth = Math.max(1, 0.03 * m);
      g.beginPath();
      g.ellipse(s.X, Y, 0.68 * m, 0.14 * m, 0.25 * Math.sin(s.t * 1.3), 0, TAU);
      g.stroke();
      // (its eye, looking his way)
      const an = Math.atan2(s.CY - Y, s.CX - s.X),
        ex = s.X - 0.18 * m + Math.cos(an) * 0.06 * m,
        ey = Y - 0.04 * m + Math.sin(an) * 0.04 * m;
      glowDot(g, ex, ey, (0.28 + 0.15 * s.k + 0.25 * s.aim) * m, SIGHT, (0.6 + 0.4 * s.k) * s.a);
      glowDot(g, ex, ey, 0.07 * m, '#ffffff', s.a);
      s.mx = ex;
      s.my = ey;
    },
    fire: (f, s) => FIRES.beam(f, s, SIGHT),
  },
  gunner: {
    appear: 'glitch',
    sight: 'laser',
    draw(f, o, s) {
      // (on a hover platform over the road, high over his head, rifle up at him; hit, blown off backwards and down,
      // its platform broken up after it)
      const { g, v } = f,
        m = s.m,
        k = 0.85,
        hit = !s.alive,
        bob = hit ? 0 : 0.1 * Math.sin(s.t * 2.6 + o.v * 5),
        top = o.y + 2.25 + bob,
        PX = v.sx(o.tx) + s.dx * m,
        PY = v.sy(top),
        sp = spr(s, 'platform', PLATFORM);
      if (hit) shatter(g, sp, PX, PY, m, s.hitU, 3, 1, s.seed, 0.2);
      else {
        const jet = jetOf(f, s.P.win[2]);
        for (const sx of [-0.36, 0.36]) blit(g, jet, PX + sx * m, PY + 0.2 * m, m, 0, 1, (0.5 + 0.4 * s.k) * s.a);
        put(g, s, sp, PX, PY, s.gl > 0.02 ? 0 : 0.05 * Math.sin(s.t * 2.6 + o.v * 5));
      }
      const drop = hit ? 4.9 * s.hitU * s.hitU : 0,
        // (alive: breathing, its rifle on him; firing, the clip's recoil under that)
        J = hit
          ? clonePose(f, 'flying_back_death', 6 + s.hitU * 66, o.tx + 1.2 * ease(s.hitU / 0.7), top + 0.8 * Math.sin(Math.PI * clamp01(s.hitU / 0.6)) - drop, k)
          : aimAt(f, clonePose(f, 'firing_rifle', s.shot >= 0 && s.shot < 0.6 ? s.shot * 60 : 2, o.tx, top, k, true), s.seed),
        a = (hit ? clamp01(1 - (s.hitU - 0.8) / 0.3) : 1) * (s.app < 1 ? clamp01((s.app - 0.3) / 0.3) * s.a : 1);
      if (a > 0) {
        drawClone(f, J, a);
        // (hit: its rifle out of its hands, flying on its own)
        if (hit) droppedRifle(f, o, () => aimAt(f, clonePose(f, 'firing_rifle', 2, o.tx, o.y + 2.25, k, true, -1, 1), s.seed), s.hitU, a);
        else {
          const r = rifle(f, J, a);
          s.mx = v.sx(r.tip[0]);
          s.my = v.sy(r.tip[1]);
        }
      }
    },
    fire: (f, s) => FIRES.tracers(f, s),
  },
  field: {
    appear: 'glitch',
    sight: 'laser',
    draw(f, o, s) {
      // (an emitter hung over the road, a curtain of force from it down to the roof across his way, humming on the
      // beat; hit, the emitter bursts and the curtain falls in on itself)
      const { g } = f,
        m = s.m,
        X = s.X,
        Y = s.Y,
        sp = spr(s, 'emitter', EMITTER),
        fall = s.alive ? 0 : ease(s.hitU / 0.3),
        hum = 0.6 + 0.4 * s.b,
        unroll = clamp01((s.app - 0.35) / 0.65);
      if (s.alive) cable(g, X, Y - 0.34 * m, m, '#15151b', 0.03, 0.35);
      if (fall < 1 && unroll > 0) {
        const top = Y + 0.3 * m,
          h = (s.Yr - top) * (1 - fall) * unroll;
        blit(g, spr(s, 'curtain', CURTAIN), X, top + h, m * 0.75, 0, 1, (h / m / 0.75) * (0.85 + 0.15 * hum));
        g.strokeStyle = rgba('#ffd0d4', 0.7 * hum);
        g.lineWidth = Math.max(1, 0.03 * m);
        for (let q = 0; q < 2; q++) {
          g.beginPath();
          for (let yy = 0; yy <= 1.001; yy += 0.1) g.lineTo(X + Math.sin(yy * 9 + s.t * 11 + q * 2.1) * 0.13 * m, top + h * yy);
          g.stroke();
        }
        glowDot(g, X, top + h, 0.7 * m, SIGHT, 0.55 * hum * (1 - fall));
        glowDot(g, X, top, 0.4 * m, '#ffffff', 0.5 * hum * (1 - fall));
      }
      if (s.alive) {
        glowDot(g, X, Y, 0.95 * m, SIGHT, (0.35 + 0.35 * s.k) * s.a);
        put(g, s, sp, X, Y);
        glowDot(g, X, Y + 0.24 * m, (0.14 + 0.06 * s.k) * m, '#ffd0d4', s.a);
      } else shatter(g, sp, X, Y, m, s.hitU, 3, 2, s.seed);
      s.mx = X;
      s.my = Y + 0.24 * m;
      s.from = [X, lerp(Y, s.Yr, 0.55)];
    },
    fire: (f, s) => FIRES.bolt(f, s, '#ff8a9a', s.from),
  },
  eye: {
    halo: 1.2,
    appear: 'drop',
    sight: 'cone',
    draw(f, o, s) {
      // (hung on its cable, its head turning to watch him (scanning till it takes aim); hit, its lens bursts, the
      // cable snaps and the camera drops in pieces)
      const { g } = f,
        m = s.m,
        PX = s.X,
        PY = s.Y - 0.22 * m,
        mount = spr(s, 'eyemount', EYE_MOUNT),
        head = spr(s, 'eyehead', EYE_HEAD);
      if (!s.alive) {
        const u = s.hitU;
        // (the cable snapped: its end whipping up out of sight)
        cable(g, PX, PY - (0.5 + 9 * u * u) * m, m, '#15151b', 0.035);
        shatter(g, head, PX, PY, m, u, 3, 2, s.seed, s.rot0 ?? 0);
        shatter(g, mount, PX, PY, m, u * 0.8, 1, 2, s.seed + 1);
        burst(g, PX - 0.6 * m, PY + 0.2 * m, u / 0.5, '#e8f4ff', 14, 1.2 * m, 2);
        streaks(g, PX, PY - 0.3 * m, u / 0.4, HOT, 8, 1.0 * m);
        return;
      }
      cable(g, PX, PY - 0.5 * m, m, '#15151b', 0.035);
      put(g, s, mount, PX, PY);
      const want = Math.max(-0.9, Math.min(0.6, Math.atan2(s.CY - PY, s.CX - PX) - Math.PI + (s.CX > PX ? 2 * Math.PI : 0))),
        scan = 0.35 * Math.sin(s.t * 1.4 + o.v * 6),
        rot = lerp(scan, want, ease(s.aim * 1.6)) + 0.04 * Math.sin(s.t * 3) * (1 - s.aim);
      put(g, s, head, PX, PY, rot);
      const [lx, ly] = turn(PX, PY, m, rot, -0.7, 0.25);
      glowDot(g, lx, ly, (0.3 + 0.15 * s.k + 0.3 * s.aim) * m, SIGHT, (0.55 + 0.45 * s.k) * s.a);
      g.fillStyle = rgba(SIGHT, s.a);
      g.beginPath();
      g.arc(lx, ly, (0.09 + 0.03 * s.b) * m, 0, TAU);
      g.fill();
      g.fillStyle = rgba(EDGE, s.a);
      g.beginPath();
      g.arc(lx, ly, (0.045 - 0.015 * s.b) * m, 0, TAU);
      g.fill();
      glowDot(g, lx - 0.04 * m, ly - 0.04 * m, 0.04 * m, '#ffffff', s.a);
      s.mx = lx;
      s.my = ly;
      s.rot0 = rot;
    },
    fire: (f, s) => FIRES.beam(f, s, SIGHT),
  },
  crane: {
    halo: 1.2,
    appear: 'drop',
    sight: 'laser',
    draw(f, o, s) {
      // (lowered on a crane's cables: its hook block, the rocket turret hung off it turning to him; hit, the turret
      // tears off the hook and falls burning, the hook jerking up on its cables)
      const { g } = f,
        m = s.m,
        hook = spr(s, 'hook', HOOK),
        tur = spr(s, 'turret', TURRET),
        u = s.hitU,
        jerk = s.alive ? 0 : -0.5 * Math.sin(Math.min(Math.PI, u * 7)) * Math.exp(-u * 2),
        HX = s.X,
        HY = s.Y - 0.32 * m + jerk * m;
      cable(g, HX, HY - 0.85 * m, m, '#15151b', 0.035, 0.1);
      put(g, s, hook, HX, HY);
      glowDot(g, HX, HY - 0.8 * m, 0.2 * m, '#ff9a2a', (0.3 + 0.6 * s.b) * s.a);
      if (!s.alive) {
        const tx = s.X + 0.9 * u * m,
          ty = s.Y - 0.32 * m + 4.9 * u * u * m;
        if (u < 1) blit(g, tur, tx, ty, m, (s.rot0 ?? 0) + u * 6);
        smoke(g, tx, ty, u, 6, 1.1 * m);
        flash(g, s.X, s.Y, u / 0.45, 2.0 * m, '#ffb347');
        burst(g, s.X, s.Y, u / 0.6, '#ff8a3d', 16, 1.5 * m);
        return;
      }
      const want = Math.max(-0.5, Math.min(0.4, Math.atan2(s.CY - HY, s.CX - HX) - Math.PI + (s.CX > HX ? 2 * Math.PI : 0) + 0.3)),
        rot = lerp(0.05 * Math.sin(s.t * 1.6), want, ease(s.aim * 1.5));
      put(g, s, tur, HX, HY, rot);
      const [mx, my] = turn(HX, HY, m, rot, -0.86, 0.2);
      glowDot(g, mx, my, (0.15 + 0.25 * s.charge + 0.1 * s.k) * m, '#ff8a3d', (0.5 + 0.5 * s.k) * s.a);
      s.mx = mx;
      s.my = my;
      s.rot0 = rot;
    },
    fire: (f, s) => FIRES.rocket(f, s),
  },
  speaker: {
    appear: 'drop',
    sight: 'rings',
    draw(f, o, s) {
      // (hung on its chains, its cones pumping on the kick, its lights on the beat; hit, it bursts apart with a crack
      // of sound)
      const { g } = f,
        m = s.m,
        sp = spr(s, 'speaker', SPEAKER),
        col = mixHex('#ff3bd4', s.P.line, 0.3);
      if (!s.alive) {
        shatter(g, sp, s.X, s.Y, m, s.hitU, 2, 3, s.seed);
        shock(g, s.X, s.Y, s.hitU / 0.35, 2.4 * m, '#ffffff', 0.08);
        shock(g, s.X, s.Y, (s.hitU - 0.08) / 0.4, 3 * m, col);
        return;
      }
      const sw = 0.03 * Math.sin(s.t * 1.7 + o.v * 4);
      cable(g, s.X, s.Y - 0.88 * m, m, '#15151b', 0.03, 0.45);
      glowDot(g, s.X - 0.1 * m, s.Y, 1.4 * m, col, (0.15 + 0.35 * s.k) * s.a);
      put(g, s, sp, s.X, s.Y, sw);
      // (its cones: pushed out on the kick)
      g.fillStyle = rgba(mixHex('#ffffff', col, 0.3), s.a);
      for (let i = 0; i < 3; i++)
        for (const cx of [-0.2, 0.17]) {
          const [x, y] = turn(s.X, s.Y, m, sw, cx - 0.07 * i * i, -0.54 + i * 0.5);
          g.beginPath();
          g.arc(x, y, (0.05 + 0.07 * s.k) * m * s.sc, 0, TAU);
          g.fill();
        }
      for (let i = 0; i < 3; i++) {
        const [x, y] = turn(s.X, s.Y, m, sw, -0.07 * i * i, -0.32 + i * 0.5);
        glowDot(g, x, y, 0.3 * m, i === 1 ? col : s.P.line, (0.3 + 0.6 * s.b) * s.a);
      }
      [s.mx, s.my] = turn(s.X, s.Y, m, sw, -0.45, 0);
    },
    fire: (f, s) => FIRES.rings(f, s, mixHex('#ff3bd4', s.P.line, 0.3)),
  },
  lantern: {
    appear: 'drop',
    sight: 'wave',
    draw(f, o, s) {
      // (hung on its string (paper) or its chain (iron), swinging, a flame alive inside it; hit, it bursts and its
      // flame goes up in smoke (or the paper in embers))
      const { g } = f,
        m = s.m,
        iron = s.mat === 'iron' || s.mat === 'stone',
        sp = spr(s, iron ? 'lantern_iron' : 'lantern_paper', iron ? LANTERN_IRON : LANTERN_PAPER),
        fl = iron ? flameOf(f, '#8a3dff', '#e0b0ff') : flameOf(f, '#ff7a1a', '#ffd060'),
        glow = iron ? '#b06bff' : '#ffb347',
        HX = s.X,
        HY = s.Y - 0.62 * m;
      if (!s.alive) {
        const u = s.hitU;
        cable(g, HX, HY - (0.2 + 6 * u * u) * m, m, iron ? '#1c1a22' : '#7a1a14', 0.03);
        shatter(g, sp, s.X, s.Y, m, u, 2, 3, s.seed);
        if (u < 0.5) blit(g, fl, s.X, s.Y + 0.1 * m - u * 2 * m, m, 0, 0.5 * (1 - u * 2), 0.5 * (1 + u));
        if (iron) smoke(g, s.X, s.Y, u, 6, 1.0 * m, '#3a2a4a');
        else feathers(g, s.X, s.Y, u, 10, 1.4 * m, '#ff8a3d');
        burst(g, s.X, s.Y, u / 0.5, glow, 14, 1.3 * m);
        return;
      }
      const sw = 0.12 * Math.sin(s.t * 2.2 + o.v * 5) + 0.06 * s.k;
      cable(g, HX, HY, m, iron ? '#1c1a22' : '#7a1a14', iron ? 0.04 : 0.025);
      const [cx, cy] = turn(HX, HY, m, sw, 0, 0.62);
      glowDot(g, cx, cy, (1.0 + 0.25 * s.k) * m, glow, (0.3 + 0.35 * s.k) * s.a);
      put(g, s, sp, cx, cy, sw);
      const fs = 0.4 + 0.05 * Math.sin(s.t * 13 + o.v * 9) + 0.08 * s.charge;
      blit(g, fl, cx, cy + 0.12 * m, m, sw, fs * s.sc, fs * (1 + 0.15 * s.k) * s.sc);
      if (!iron) glowDot(g, cx, cy, 0.42 * m, '#ffcf6a', (0.25 + 0.25 * s.k) * s.a);
      s.mx = cx;
      s.my = cy;
    },
    fire: (f, s) => (s.mat === 'iron' || s.mat === 'stone' ? FIRES.orb(f, s, '#b06bff', 'hex') : FIRES.orb(f, s, '#ffb347', 'firework')),
  },
  wisp: {
    appear: 'fade',
    sight: 'wave',
    draw(f, o, s) {
      // (a ghost: drifting, swaying, glowing; its eyes lit red as it takes aim; hit, it shrieks apart into mist)
      const { g } = f,
        m = s.m,
        sp = spr(s, 'ghost', GHOST),
        aura = '#7dffb2';
      if (!s.alive) {
        const u = s.hitU;
        if (u < 0.5) {
          const ga = g.globalAlpha;
          g.globalAlpha = ga * (1 - u * 2);
          blit(g, sp, s.X, s.Y - u * m, m, u * 2, 1 + u * 1.5, 1 + u * 1.5);
          g.globalAlpha = ga;
        }
        smoke(g, s.X, s.Y, u, 7, 1.3 * m, '#c8ffe4');
        burst(g, s.X, s.Y, u / 0.7, aura, 16, 1.6 * m);
        shock(g, s.X, s.Y, u / 0.4, 1.8 * m, aura);
        return;
      }
      const X = s.X + 0.12 * m * Math.sin(s.t * 1.3 + o.v * 3),
        Y = s.Y + 0.14 * m * Math.sin(s.t * 2.1 + o.v * 5),
        sw = 0.08 * Math.sin(s.t * 2 + o.v);
      if (s.app < 1) smoke(g, s.X, s.Y + 0.3 * m, s.app, 5, 1.2 * m, '#c8ffe4');
      // (a trail of mist behind it)
      for (let i = 1; i <= 3; i++) glowDot(g, X + i * 0.22 * m, Y + (0.3 + 0.08 * i) * m + Math.sin(s.t * 3 + i) * 0.05 * m, (0.3 - 0.05 * i) * m, aura, 0.25 * s.a);
      glowDot(g, X, Y, (1.1 + 0.2 * s.k) * m, aura, (0.25 + 0.3 * s.k) * s.a);
      put(g, s, sp, X, Y, sw);
      for (const ex of [-0.16, 0.08]) {
        const [x, y] = turn(X, Y, m, sw, ex, -0.18);
        glowDot(g, x, y, (0.12 + 0.12 * s.aim) * m, s.aim > 0 ? SIGHT : aura, (0.6 + 0.4 * s.b) * s.a);
      }
      [s.mx, s.my] = turn(X, Y, m, sw, -0.55, 0.18);
    },
    fire: (f, s) => FIRES.orb(f, s, '#7dffb2', 'hex'),
  },
  spirit: {
    appear: 'grow',
    sight: 'laser',
    draw(f, o, s) {
      // (a spirit of the lava: flames for a body, flickering, embers rising off it, its eyes slits of white heat; hit,
      // it is snuffed out in a gust of smoke and sparks)
      const { g } = f,
        m = s.m,
        outer = flameOf(f, '#ff3a12', '#ffa21a'),
        inner = flameOf(f, '#ffb21a', '#fff0a0');
      let sc = s.sc,
        X = s.X,
        Y = s.Y + 0.1 * m * Math.sin(s.t * 2.4 + o.v * 5);
      if (!s.alive) {
        const u = s.hitU;
        sc = Math.max(0, 1 - u * 2.5);
        smoke(g, X, Y, u, 8, 1.4 * m);
        burst(g, X, Y, u / 0.6, '#ffb21a', 18, 1.8 * m);
        flash(g, X, Y, u / 0.4, 1.8 * m, '#ff8a3d');
        if (sc <= 0) return;
      }
      glowDot(g, X, Y, (1.4 + 0.3 * s.k) * m * sc, '#ff6a1a', (0.4 + 0.35 * s.k) * s.a);
      const fl = Math.sin(s.t * 17 + o.v * 7),
        ga = g.globalAlpha;
      g.globalAlpha = ga * s.a;
      blit(g, outer, X, Y + 0.55 * m * sc, m, 0.05 * fl, 1.25 * sc * (1 + 0.05 * fl), 1.3 * sc * (1 + 0.12 * s.k));
      blit(g, inner, X + 0.04 * m, Y + 0.45 * m * sc, m, -0.08 * fl, 0.85 * sc, 0.9 * sc * (1 + 0.15 * s.k));
      // (its embers rising)
      g.fillStyle = rgba('#ffd060', 0.9);
      for (let i = 0; i < 6; i++) {
        const u = (s.t * 0.8 + hash(i, s.seed)) % 1,
          ex = X + (hash(i, 3) - 0.5) * 0.9 * m + Math.sin(u * 8 + i) * 0.1 * m,
          ey = Y + 0.3 * m - u * 1.6 * m,
          r = 0.04 * m * (1 - u);
        g.fillRect(ex - r, ey - r, 2 * r, 2 * r);
      }
      // (its face: two slits of white heat under a scowl, a mouth)
      g.fillStyle = EDGE;
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.moveTo(X + (sx * 0.06 - 0.05) * m * sc, Y - 0.12 * m * sc);
        g.lineTo(X + (sx * 0.24 - 0.05) * m * sc, Y - (0.2 - 0.0) * m * sc);
        g.lineTo(X + (sx * 0.22 - 0.05) * m * sc, Y - 0.04 * m * sc);
        g.closePath();
        g.fill();
      }
      g.beginPath();
      g.ellipse(X - 0.05 * m * sc, Y + 0.12 * m * sc, 0.12 * m * sc, (0.04 + 0.04 * s.k) * m * sc, 0, 0, TAU);
      g.fill();
      for (const sx of [-1, 1]) glowDot(g, X + (sx * 0.15 - 0.05) * m * sc, Y - 0.11 * m * sc, 0.07 * m * sc, s.aim > 0 ? '#ffffff' : '#fff0a0', 0.9);
      g.globalAlpha = ga;
      s.mx = X - 0.05 * m;
      s.my = Y + 0.12 * m;
    },
    fire: (f, s) => FIRES.orb(f, s, '#ff7a1a', 'fire'),
  },
  shard: {
    appear: 'grow',
    sight: 'laser',
    draw(f, o, s) {
      // (a great crystal floating, turning slowly, shards circling it, its heart lit on the kick; hit, it shatters)
      const { g } = f,
        m = s.m,
        sp = spr(s, 'shard', SHARD),
        col = s.mat === 'crystal' ? '#c48aff' : '#8fe4ff';
      if (!s.alive) {
        shatter(g, sp, s.X, s.Y, m, s.hitU, 3, 3, s.seed);
        flash(g, s.X, s.Y, s.hitU / 0.4, 2 * m, col);
        streaks(g, s.X, s.Y, s.hitU / 0.5, '#ffffff', 12, 2.2 * m);
        return;
      }
      const Y = s.Y + 0.1 * m * Math.sin(s.t * 1.8 + o.v * 5),
        spin = 0.88 + 0.12 * Math.cos(s.t * 1.5 + o.v);
      glowDot(g, s.X, Y, (1.3 + 0.3 * s.k) * m, col, (0.3 + 0.35 * s.k) * s.a);
      if (s.app < 1) put(g, s, sp, s.X, Y + 0.95 * m * (1 - s.sc), 0, spin, 1);
      else put(g, s, sp, s.X, Y, 0, spin, 1);
      glowDot(g, s.X, Y, (0.35 + 0.15 * s.k + 0.3 * s.charge) * m, '#ffffff', (0.5 + 0.4 * s.k) * s.a);
      // (its shards circling)
      g.fillStyle = rgba(mixHex(col, '#ffffff', 0.4), s.a);
      for (let i = 0; i < 3; i++) {
        const an = s.t * 1.8 + (i * TAU) / 3,
          x = s.X + Math.cos(an) * 0.62 * m,
          y = Y + Math.sin(an) * 0.18 * m,
          r = 0.1 * m * (0.8 + 0.2 * Math.sin(an));
        g.beginPath();
        g.moveTo(x, y - r * 1.4);
        g.lineTo(x + r * 0.6, y);
        g.lineTo(x, y + r * 1.4);
        g.lineTo(x - r * 0.6, y);
        g.closePath();
        g.fill();
      }
      s.mx = s.X - 0.1 * m;
      s.my = Y - 0.1 * m;
    },
    fire(f, s) {
      const col = s.mat === 'crystal' ? '#c48aff' : '#8fe4ff';
      FIRES.bolt(f, s, col);
      // (and three shards of it flying with it)
      const { g } = f,
        m = s.m;
      for (let i = 0; i < 3; i++) {
        const u = clamp01(s.shot / 0.12 - i * 0.25);
        if (u <= 0 || u >= 1) continue;
        const [x, y] = arc(s.mx, s.my, s.CX, s.CY, u, (0.2 + 0.2 * i) * m);
        glowDot(g, x, y, 0.3 * m, col, 0.9);
        glowDot(g, x, y, 0.1 * m, '#ffffff', 1);
      }
    },
  },
  hive: {
    appear: 'drop',
    sight: 'dots',
    draw(f, o, s) {
      // (hung off its branch on a vine, swinging, its hornets circling it (more as it takes aim); hit, it splits and
      // its hornets scatter)
      const { g } = f,
        m = s.m,
        sp = spr(s, 'hive', HIVE),
        HX = s.X,
        HY = s.Y - 0.7 * m;
      if (!s.alive) {
        const u = s.hitU;
        cable(g, HX, HY - 0.05 * m, m, '#3a2616', 0.05);
        shatter(g, sp, s.X, s.Y, m, u, 2, 2, s.seed);
        feathers(g, s.X, s.Y, u, 8, 1.2 * m, '#b89a6a');
        for (let i = 0; i < 10; i++) {
          const an = i * 2.4,
            d = (0.3 + 2.2 * u) * m;
          hornet(g, s.X + Math.cos(an) * d, s.Y + Math.sin(an) * d * 0.6 + 2.5 * u * u * m, m, s.t + i, 1 - u);
        }
        return;
      }
      cable(g, HX, HY, m, '#3a2616', 0.05);
      const sw = 0.06 * Math.sin(s.t * 1.8 + o.v * 4) + 0.03 * s.k;
      put(g, s, sp, HX, HY + 0.7 * m, sw);
      const n = 4 + Math.round(5 * s.aim),
        [ex, ey] = [s.X - 0.08 * m, s.Y + 0.28 * m];
      for (let i = 0; i < n; i++) {
        const an = s.t * (3 + hash(i, 2)) + i * 1.9,
          r = (0.45 + 0.25 * hash(i, 5)) * m * (1 - 0.4 * s.aim);
        hornet(g, ex + Math.cos(an) * r, ey + Math.sin(an) * r * 0.55 - 0.15 * m, m, s.t + i, s.a);
      }
      s.mx = ex;
      s.my = ey;
    },
    fire: (f, s) => FIRES.swarm(f, s),
  },
  jelly: {
    appear: 'rise',
    sight: 'wave',
    draw(f, o, s) {
      // (drifting in the deep, its bell pulsing on the kick, its tentacles trailing; hit, its bell bursts in a spray
      // of light and bubbles, its tentacles sinking)
      const { g } = f,
        m = s.m,
        sp = spr(s, 'jelly', JELLY),
        col = mixHex('#ff7ad8', s.P.line, 0.25),
        dead = !s.alive,
        u = s.hitU,
        X = s.X,
        Y = s.Y + 0.15 * m * Math.sin(s.t * 1.6 + o.v * 5) + (dead ? 1.2 * u * u * m : 0),
        a = s.a * (dead ? clamp01(1 - u / 0.8) : 1),
        pulse = s.k;
      if (a <= 0 && dead) {
        bubbles(g, s.X, s.Y, u, 10, 1.4 * m, s.seed);
        return;
      }
      glowDot(g, X, Y, (1.2 + 0.3 * pulse) * m, col, (0.3 + 0.4 * pulse) * a);
      // (its tentacles)
      g.strokeStyle = rgba(mixHex(col, '#ffffff', 0.3), 0.75 * a);
      g.lineWidth = Math.max(1, 0.03 * m);
      for (let i = 0; i < 7; i++) {
        const x0 = X + (-0.4 + (i * 0.8) / 6) * m;
        g.beginPath();
        g.moveTo(x0, Y + 0.1 * m);
        for (let j = 1; j <= 5; j++) g.lineTo(x0 + Math.sin(s.t * 3 + j * 0.8 + i) * 0.07 * m * j * 0.3 + j * 0.03 * m, Y + (0.1 + j * 0.15) * m);
        g.stroke();
      }
      g.strokeStyle = rgba(col, 0.85 * a);
      g.lineWidth = Math.max(1, 0.08 * m);
      for (const sx of [-0.1, 0.1]) {
        g.beginPath();
        g.moveTo(X + sx * m, Y + 0.12 * m);
        for (let j = 1; j <= 4; j++) g.lineTo(X + sx * m + Math.sin(s.t * 2.4 + j + sx * 9) * 0.08 * m, Y + (0.12 + j * 0.12) * m);
        g.stroke();
      }
      const ga = g.globalAlpha;
      g.globalAlpha = ga * a;
      if (dead) shatter(g, sp, X, Y, m, u, 3, 2, s.seed);
      else blit(g, sp, X, Y, m, 0, (1 + 0.1 * pulse) * s.sc, (1 - 0.1 * pulse) * s.sc);
      g.globalAlpha = ga;
      if (dead) {
        burst(g, s.X, s.Y, u / 0.6, col, 16, 1.6 * m);
        bubbles(g, s.X, s.Y, u, 10, 1.4 * m, s.seed);
        return;
      }
      glowDot(g, X, Y - 0.1 * m, (0.3 + 0.2 * pulse + 0.3 * s.charge) * m, '#ffffff', 0.6 * a);
      s.mx = X;
      s.my = Y + 0.7 * m;
    },
    fire(f, s) {
      FIRES.bolt(f, s, '#7af0ff');
      FIRES.bolt(f, { ...s, t: s.t + 0.37 }, '#7af0ff', [s.mx - 0.25 * s.m, s.my]);
    },
  },
  angler: {
    appear: 'swim',
    sight: 'laser',
    draw(f, o, s) {
      // (gliding in the deep, its tail swaying, its lure bobbing on its stalk; hit, it breaks up in a cloud of bubbles,
      // its lure sinking dark)
      const { g } = f,
        m = s.m,
        sp = spr(s, 'angler', ANGLER),
        X = s.X,
        Y = s.Y + 0.12 * m * Math.sin(s.t * 1.4 + o.v * 5),
        rot = 0.05 * Math.sin(s.t * 2.2 + o.v);
      if (!s.alive) {
        shatter(g, sp, X, Y, m, s.hitU, 3, 2, s.seed);
        bubbles(g, X, Y, s.hitU, 14, 1.8 * m, s.seed);
        glowDot(g, X - 0.9 * m, Y - 0.8 * m + 3 * s.hitU * s.hitU * m, 0.3 * m, '#bff8ff', clamp01(1 - s.hitU));
        return;
      }
      put(g, s, sp, X, Y, rot);
      const [sx, sy] = turn(X, Y, m, rot, -0.3, -0.42),
        lx = X - (0.95 + 0.06 * Math.sin(s.t * 2.6)) * m,
        ly = Y - (0.78 + 0.08 * Math.sin(s.t * 3.1)) * m;
      g.strokeStyle = rgba(EDGE, s.a);
      g.lineWidth = Math.max(1, 0.04 * m);
      g.beginPath();
      g.moveTo(sx, sy);
      g.quadraticCurveTo(sx - 0.2 * m, ly - 0.35 * m, lx, ly);
      g.stroke();
      glowDot(g, lx, ly, (0.45 + 0.2 * s.k + 0.3 * s.aim) * m, '#9ff6ff', (0.6 + 0.4 * s.k) * s.a);
      glowDot(g, lx, ly, 0.1 * m, '#ffffff', s.a);
      s.mx = lx;
      s.my = ly;
    },
    fire: (f, s) => FIRES.beam(f, s, '#9ff6ff'),
  },
  sniper: {
    appear: 'paste',
    sight: 'glint',
    draw(f, o, s) {
      // (a clone with a long rifle on a rooftop past the road (its world's stand), lying in wait, its scope glinting;
      // hit, knocked back off its rooftop and down)
      const { g, v } = f,
        m = s.m,
        k = 0.8,
        top = o.y + o.ty - 1.0 * k,
        X = threatX(f.L, o, s.t),
        u = s.hitU,
        sx = v.sx(X),
        sy = v.sy(top);
      stand(f, theme(f).stand, sx, sy, 2.0 * k * v.ppm, s.Yr, clamp01(s.since / 0.15) * (s.shot > 0.5 ? clamp01(1 - (s.shot - 0.5) / 0.4) : 1));
      if (s.since < 0.35) {
        flash(g, sx, sy - 0.9 * k * m, s.since / 0.35, 1.4 * k * m, '#ffffff');
        shock(g, sx, sy - 0.8 * k * m, s.since / 0.2, 1.6 * k * m, SIGHT);
      }
      let J;
      if (!s.alive) {
        J = clonePose(f, 'falling_back_death', 6 + u * 78, X, top, k);
        // (off its rooftop and down, falling as the gunner and he do)
        const dx = 1.1 * k * ease(u / 0.8),
          dy = u > 0.5 ? -10 * (u - 0.5) ** 2 : 0;
        for (let i = 0; i < J.length; i += 2) ((J[i] += dx), (J[i + 1] += dy));
        burst(g, sx, sy, u / 0.6, mixHex(f.T.far, '#ffffff', 0.5), 10, 1.0 * m, 4);
      } else J = aimAt(f, clonePose(f, 'firing_rifle', s.shot >= 0 && s.shot < 0.6 ? s.shot * 60 : 2, X, top, k, true), s.seed);
      // (its shot fired, it is taken back, flickering out with its rooftop: nothing left standing for him to run up to)
      const gone = s.shot > 0.5 ? clamp01((s.shot - 0.5) / 0.4) : 0,
        a = (s.alive ? 1 : clamp01(1 - (u - 0.75) / 0.3)) * clamp01(s.since / 0.12) * (s.since < 0.3 && Math.floor(s.since * 40) % 3 === 1 ? 0.35 : 1) * (1 - gone) * (gone > 0 && Math.floor(s.t * 30) % 2 ? 0.5 : 1);
      if (a <= 0) return;
      drawClone(f, J, a);
      // (hit: its rifle out of its hands, flying on its own)
      if (!s.alive) return droppedRifle(f, o, () => aimAt(f, clonePose(f, 'firing_rifle', 2, threatX(f.L, o, f.t - u), top, k, true, -1, 1), s.seed), u, a, 0.35);
      const r = rifle(f, J, a, 0.35);
      s.mx = v.sx(r.tip[0]);
      s.my = v.sy(r.tip[1]);
      s.gx = v.sx(r.scope[0]);
      s.gy = v.sy(r.scope[1]);
    },
    fire: (f, s) => FIRES.snipe(f, s),
  },
  jammer: {
    halo: 1.3,
    appear: 'drop',
    sight: 'wave',
    draw(f, o, s) {
      // (lowered on its aerial, rotors spinning under it, its cones pushed by the bass, its dial's needle on the beat;
      // hit, its lid flies off and it bursts in flowers and notes)
      const { g } = f,
        m = s.m,
        sp = spr(s, 'jammer', JAMMER),
        teal = '#2fb7b0',
        pink = '#d0328c';
      if (!s.alive) {
        const u = s.hitU;
        shatter(g, sp, s.X, s.Y, m, u, 3, 2, s.seed, 0.2);
        burst(g, s.X, s.Y, u / 0.8, pink, 12, 1.8 * m, 4);
        burst(g, s.X, s.Y, u / 0.7, teal, 10, 1.5 * m, 8);
        burst(g, s.X, s.Y, u / 0.6, '#ffb040', 8, 1.2 * m, 2);
        return;
      }
      const bob = 0.1 * m * Math.sin(s.t * 3 + o.v * 4),
        rot = s.tilt + 0.05 * Math.sin(s.t * 2 + o.v * 3),
        Y = s.Y + bob;
      g.strokeStyle = '#9aa3ad';
      g.lineWidth = Math.max(1, 0.03 * m);
      g.beginPath();
      g.moveTo(s.X + 0.6 * m, Y - 0.38 * m);
      g.lineTo(s.X + 0.9 * m, Y - 30 * m);
      g.stroke();
      g.save();
      g.translate(s.X, Y);
      g.rotate(rot);
      for (const sx of [-0.78, 0.78]) {
        const w = 0.6 * Math.abs(Math.sin(s.t * 47 + sx));
        g.fillStyle = rgba('#ffffff', 0.55 * s.a);
        g.fillRect((sx - w / 2) * m, 0.5 * m, w * m, 0.04 * m);
      }
      put(g, s, sp, 0, 0);
      g.fillStyle = rgba('#3a3a42', s.a);
      for (const cx of [-0.42, 0.42]) {
        g.beginPath();
        g.arc(cx * m, 0.08 * m, (0.07 + 0.08 * s.k) * m * s.sc, 0, TAU);
        g.fill();
      }
      glowDot(g, 0, 0, (0.25 + 0.2 * s.b) * m, '#ffb040', (0.4 + 0.4 * s.b) * s.a);
      g.restore();
      [s.mx, s.my] = turn(s.X, Y, m, rot, -0.42, 0.08);
    },
    fire: (f, s) => FIRES.bolt(f, s, '#2fb7b0'),
  },
  shadow: {
    appear: 'fade',
    sight: 'laser',
    draw(f, o, s) {
      // (a cloud of red smoke rolling on itself, swelling with the kick, two yellow eyes in it narrowing as it takes aim;
      // hit, it blows apart in a puff and its eyes blink out)
      const { g } = f,
        m = s.m,
        red = '#c8141e';
      if (!s.alive) {
        const u = s.hitU;
        smoke(g, s.X, s.Y, u, 8, 1.6 * m, '#a8141c');
        shock(g, s.X, s.Y, u / 0.4, 2 * m, '#ffe23a');
        if (u < 0.25) for (const e of [-0.16, 0.16]) glowDot(g, s.X + e * m, s.Y - 0.08 * m, 0.12 * m * (1 - u * 4), '#ffe23a', 1);
        return;
      }
      const sw = 1 + 0.12 * s.k;
      for (let i = 0; i < 7; i++) {
        const an = s.t * (0.6 + 0.2 * (i % 3)) + i * 0.9,
          r = (0.25 + 0.15 * hash(i, 3)) * m;
        glowDot(g, s.X + Math.cos(an) * r, s.Y + Math.sin(an) * r * 0.7, (0.55 + 0.2 * hash(i, 4)) * m * sw * s.sc, i % 2 ? red : '#5a0a10', 0.8 * s.a);
      }
      glowDot(g, s.X, s.Y, 1.2 * m * sw * s.sc, red, 0.35 * s.a);
      const narrow = 1 - 0.6 * s.aim;
      g.fillStyle = rgba('#ffe23a', s.a);
      for (const e of [-0.16, 0.16]) {
        g.beginPath();
        g.ellipse(s.X + e * m, s.Y - 0.08 * m, 0.11 * m * s.sc, 0.07 * m * narrow * s.sc, e * 1.5, 0, TAU);
        g.fill();
        glowDot(g, s.X + e * m, s.Y - 0.08 * m, 0.2 * m, '#ffe23a', (0.4 + 0.4 * s.k) * s.a);
      }
      s.mx = s.X;
      s.my = s.Y - 0.08 * m;
    },
    fire: (f, s) => FIRES.orb(f, s, '#ff3a2a', 'fire'),
  },
  drum: {
    appear: 'fade',
    sight: 'rings',
    draw(f, o, s) {
      // (a frame drum hovering, tilting, beating itself on the kick (its skin dents and booms), its ribbons trailing;
      // hit, it booms a star, its ribbons fly off and it sails away like a frisbee)
      const { g } = f,
        m = s.m,
        sp = spr(s, 'drum', DRUM),
        ribs = ['#3dff6a', '#ff2fd0', '#ffd23a'];
      let X = s.X,
        Y = s.Y + 0.12 * m * Math.sin(s.t * 2 + o.v * 4),
        sy = 0.92 + 0.08 * Math.sin(s.t * 1.3),
        rot = 0.1 * Math.sin(s.t * 1.7 + o.v);
      if (!s.alive) {
        const u = s.hitU;
        X += 7 * u * m;
        Y -= 3 * u * m - 2 * u * u * m;
        rot += u * 18;
        sy = 0.4 + 0.6 * Math.abs(Math.cos(u * 9));
        burst(g, s.X, s.Y, u / 0.5, '#ffd23a', 12, 1.6 * m, 3);
        shock(g, s.X, s.Y, u / 0.35, 1.8 * m, '#ffffff');
        for (let i = 0; i < 3; i++) {
          g.strokeStyle = rgba(ribs[i], 1 - u);
          g.lineWidth = Math.max(1, 0.04 * m);
          g.beginPath();
          g.moveTo(s.X - (0.3 - i * 0.3) * m - u * 2 * m, s.Y + (0.6 + u * 2) * m);
          g.quadraticCurveTo(s.X - u * 3 * m, s.Y + (1 + 3 * u) * m, s.X - (0.5 + i * 0.4 + u * 4) * m, s.Y + (1.6 + 4 * u * u) * m);
          g.stroke();
        }
        if (u > 0.9) return;
      } else {
        // (its ribbons under it, waving)
        for (let i = 0; i < 3; i++) {
          g.strokeStyle = rgba(ribs[i], 0.9 * s.a);
          g.lineWidth = Math.max(1, 0.04 * m);
          g.beginPath();
          const x0 = X + (i - 1) * 0.25 * m,
            y0 = Y + 0.55 * m;
          g.moveTo(x0, y0);
          for (let k = 1; k <= 5; k++) g.lineTo(x0 + k * 0.08 * m + Math.sin(s.t * 5 + k + i) * 0.08 * m, y0 + k * 0.2 * m);
          g.stroke();
        }
      }
      put(g, s, sp, X, Y, rot, 1, sy * (1 - 0.06 * s.k));
      if (s.alive) {
        glowDot(g, X, Y, (0.4 + 0.5 * s.k) * m, '#ffd23a', (0.2 + 0.6 * s.k) * s.a);
        s.mx = X;
        s.my = Y;
      }
    },
    fire: (f, s) => FIRES.rings(f, s, '#ffd23a'),
  },
  totem: {
    appear: 'fly',
    sight: 'dots',
    draw(f, o, s) {
      // (a skull kite on two crossed bones, swaying on its string, its tail of ribbons; hit, it pops like a piñata in
      // sweets and confetti)
      const { g } = f,
        m = s.m,
        sp = spr(s, 'totem', TOTEM),
        rot = s.tilt + 0.15 * Math.sin(s.t * 1.6 + o.v * 3),
        X = s.X + 0.15 * m * Math.sin(s.t * 1.1),
        Y = s.Y + 0.1 * m * Math.sin(s.t * 2.2 + o.v);
      if (!s.alive) {
        const u = s.hitU;
        shatter(g, sp, X, Y, m, u, 2, 2, s.seed);
        for (const [c, sd] of [['#ff2fd0', 1], ['#ffd23a', 2], ['#3dff6a', 3], ['#5ae0ff', 4]]) burst(g, X, Y, u / 0.9, c, 10, 2.2 * m, sd);
        flash(g, X, Y, u / 0.3, 1.4 * m, '#ffe14d');
        return;
      }
      // (its string down out of sight, its tail)
      g.strokeStyle = rgba('#e8e4dc', 0.6 * s.a);
      g.lineWidth = Math.max(1, 0.02 * m);
      g.beginPath();
      g.moveTo(X, Y + 0.6 * m);
      g.quadraticCurveTo(X + 1.5 * m, Y + 3 * m, X + 1 * m, Y + 12 * m);
      g.stroke();
      for (let i = 0; i < 4; i++) {
        const tx = X + 0.1 * m + i * 0.2 * m + Math.sin(s.t * 4 + i) * 0.1 * m,
          ty = Y + (0.85 + i * 0.28) * m;
        glowDot(g, tx, ty, 0.1 * m, ['#ff2fd0', '#ffd23a', '#3dff6a', '#5ae0ff'][i], s.a);
      }
      put(g, s, sp, X, Y, rot);
      for (const e of [-0.14, 0.14]) {
        const [ex, ey] = turn(X, Y, m, rot, e, -0.1);
        glowDot(g, ex, ey, (0.08 + 0.1 * s.aim + 0.05 * s.k) * m, s.aim > 0 ? SIGHT : '#3dff6a', s.a);
      }
      [s.mx, s.my] = turn(X, Y, m, rot, 0, 0.2);
    },
    fire: (f, s) => FIRES.orb(f, s, '#ffe14d', 'firework'),
  },
  eqskull: {
    appear: 'glitch',
    sight: 'laser',
    draw(f, o, s) {
      // (a skull of an equaliser's bars, each bar jumping with the bass, its eye holes lit; hit, its bars drop out one by
      // one to nothing)
      const { g } = f,
        m = s.m,
        col = mixHex('#9a7dff', s.P.line, 0.2),
        pale = '#e0d8ff';
      glowDot(g, s.X, s.Y, 1.3 * m, col, (0.25 + 0.3 * s.k) * s.a);
      const bw = 0.07 * m * s.sc,
        ga = g.globalAlpha;
      g.globalAlpha = ga * s.a;
      for (let i = 0; i < EQ_N; i++) {
        const q = (i / (EQ_N - 1)) * 2 - 1,
          { top, bot, eye } = eqProfile(q),
          gone = s.alive ? 0 : clamp01((s.hitU - i * 0.04) / 0.3),
          jump = 1 + (0.15 + 0.35 * f.mf.bass) * Math.abs(Math.sin(s.t * 9 + i * 1.3)) * (s.alive ? 1 : 0),
          x = s.X + q * 0.6 * m * s.sc - bw / 2 + (s.gl > 0 ? (hash(i, Math.floor(s.t * 30)) - 0.5) * s.gl * 0.5 * m : 0),
          t0 = top * jump * (1 - gone),
          b0 = bot * (1 - gone);
        if (t0 + b0 <= 0.01) continue;
        g.fillStyle = i % 2 ? col : pale;
        if (eye) {
          g.fillRect(x, s.Y - t0 * m * s.sc, bw, Math.max(0, t0 - 0.22) * m * s.sc);
          g.fillRect(x, s.Y + 0.02 * m * s.sc, bw, Math.max(0, b0 - 0.02) * m * s.sc);
        } else g.fillRect(x, s.Y - t0 * m * s.sc, bw, (t0 + b0) * m * s.sc + gone * 2 * m);
      }
      g.globalAlpha = ga;
      if (!s.alive) return shock(g, s.X, s.Y, s.hitU / 0.4, 1.6 * m, col);
      for (const e of [-0.4, 0.4]) glowDot(g, s.X + e * 0.6 * m, s.Y - 0.1 * m, (0.12 + 0.12 * s.aim) * m, s.aim > 0 ? SIGHT : pale, s.a);
      s.mx = s.X;
      s.my = s.Y - 0.1 * m;
    },
    fire: (f, s) => FIRES.beam(f, s, '#9a7dff'),
  },
  // ---- the favourites' worlds' threats (props.js THEMES), cartoon, nothing of real harm in them
  magnifier: {
    halo: 1.3,
    appear: 'fade',
    sight: 'cone',
    draw(f, o, s) {
      // (a magnifying glass in the sky ("Урожай": the sun burns like a child with a lens), turned to catch the sun, a
      // hot dot of light under it creeping onto him as it takes aim; hit, its glass cracks and falls in pieces)
      const { g } = f,
        m = s.m,
        rot = -0.5 + 0.1 * Math.sin(s.t * 1.2 + o.v * 3),
        R = 0.62 * m * s.sc,
        X = s.X + 0.12 * m * Math.sin(s.t * 0.9),
        Y = s.Y + 0.1 * m * Math.sin(s.t * 1.7 + o.v);
      const [hx, hy] = turn(X, Y, m, rot, 0, 1.25);
      g.strokeStyle = rgba('#5a3a1a', s.a);
      g.lineWidth = Math.max(2, 0.16 * m);
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(...turn(X, Y, m, rot, 0, 0.62));
      g.lineTo(hx, hy);
      g.stroke();
      g.lineCap = 'butt';
      if (!s.alive) {
        const u = s.hitU;
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * TAU + s.seed,
            d = (0.3 + 3 * u) * m;
          g.fillStyle = rgba('#d8f0ff', (1 - u) * 0.8);
          g.beginPath();
          g.moveTo(X + Math.cos(a) * d, Y + Math.sin(a) * d + 4 * u * u * m);
          g.lineTo(X + Math.cos(a + 0.3) * (d + 0.3 * m), Y + Math.sin(a + 0.3) * (d + 0.3 * m) + 4 * u * u * m);
          g.lineTo(X + Math.cos(a + 0.6) * d, Y + Math.sin(a + 0.6) * d + 4 * u * u * m);
          g.fill();
        }
        shock(g, X, Y, u / 0.35, 1.5 * m, '#ffffff');
        return;
      }
      g.fillStyle = rgba('#d8f0ff', 0.45 * s.a);
      g.beginPath();
      g.arc(X, Y, R, 0, TAU);
      g.fill();
      g.strokeStyle = rgba('#3a2a1a', s.a);
      g.lineWidth = Math.max(2, 0.14 * m);
      g.stroke();
      g.strokeStyle = rgba('#c8a040', s.a);
      g.lineWidth = Math.max(1, 0.07 * m);
      g.stroke();
      g.fillStyle = rgba('#ffffff', 0.6 * s.a);
      g.beginPath();
      g.ellipse(X - R * 0.35, Y - R * 0.35, R * 0.25, R * 0.1, -0.7, 0, TAU);
      g.fill();
      // (the sun's light gathered in it, brighter as it takes aim and on the kick)
      glowDot(g, X, Y, R * (0.6 + 0.5 * s.aim), '#ffd23a', (0.3 + 0.5 * s.aim + 0.2 * s.k) * s.a);
      if (s.aim > 0) glowDot(g, s.CX, s.CY, (0.2 + 0.25 * s.aim) * m, '#fff0a0', s.aim * 0.9);
      s.mx = X;
      s.my = Y;
    },
    fire: (f, s) => FIRES.beam(f, s, '#ffd23a'),
  },
  salamander: {
    appear: 'rise',
    sight: 'wave',
    draw(f, o, s) {
      // (riding its leaf like a raft on the air, its tail curling, its spots glowing on the kick, a little flame
      // flickering at its mouth as it takes aim; hit, it flips off its leaf and tumbles away, the leaf fluttering off)
      const { g } = f,
        m = s.m,
        sp = spr(s, 'salamander', SALAMANDER),
        bob = 0.12 * m * Math.sin(s.t * 2.1 + o.v * 4);
      let X = s.X,
        Y = s.Y + bob,
        rot = 0.08 * Math.sin(s.t * 1.4 + o.v);
      if (!s.alive) {
        const u = s.hitU;
        X += 2.5 * u * m;
        Y += 5 * u * u * m - 1.5 * u * m;
        rot += u * 9;
        smoke(g, s.X, s.Y, u, 4, 0.9 * m);
        burst(g, s.X, s.Y, u / 0.5, '#ffb020', 10, 1.4 * m, 5);
        if (u > 0.9) return;
      }
      glowDot(g, X, Y, (0.9 + 0.3 * s.k) * m, '#ff8a2a', (0.15 + 0.3 * s.k) * s.a);
      put(g, s, sp, X, Y, rot);
      if (!s.alive) return;
      const [mx, my] = turn(X, Y, m, rot, 0.85, 0.08),
        fl = 0.1 + 0.25 * s.aim + 0.1 * Math.sin(s.t * 30);
      glowDot(g, mx, my, fl * m, '#ffd23a', 0.9 * s.a);
      glowDot(g, mx, my, fl * 0.5 * m, '#ffffff', s.a);
      s.mx = mx;
      s.my = my;
    },
    fire: (f, s) => FIRES.orb(f, s, '#ff8a2a', 'fire'),
  },
  soldierant: {
    halo: 1.2,
    appear: 'fly',
    sight: 'rings',
    draw(f, o, s) {
      // (on the wing, buzzing, its mandibles clacking on the kick; hit, it spins down, its wings a blur)
      const { g } = f,
        m = s.m,
        sp = spr(s, 'soldierant', SOLDIERANT);
      let X = s.X + 0.2 * m * Math.sin(s.t * 1.6 + o.v * 4),
        Y = s.Y + 0.15 * m * Math.sin(s.t * 3.1 + o.v),
        rot = s.tilt + 0.06 * Math.sin(s.t * 2);
      if (!s.alive) {
        const u = s.hitU;
        X += 1.5 * u * m;
        Y += 5 * u * u * m;
        rot += u * 12;
        burst(g, s.X, s.Y, u / 0.5, '#ffc23a', 10, 1.3 * m, 6);
        if (u > 0.9) return;
      }
      // (two pairs of wings, a flicker over its back)
      for (const [dx, len] of [[-0.25, 0.9], [0.0, 0.75]]) {
        const fl = Math.abs(Math.sin(s.t * 55 + dx * 9));
        const [wx, wy] = turn(X, Y, m, rot, dx, -0.2);
        g.fillStyle = rgba('#e8f4ff', 0.45 * s.a);
        g.beginPath();
        g.ellipse(wx - 0.2 * m, wy - 0.3 * m * fl, len * 0.5 * m, 0.16 * m, -0.4, 0, TAU);
        g.fill();
      }
      put(g, s, sp, X, Y, rot);
      if (!s.alive) return;
      // (its mandibles: two hooks at its head, closing on the kick)
      const [hx, hy] = turn(X, Y, m, rot, 0.68, 0.06),
        c = 0.15 + 0.35 * (1 - s.k);
      g.strokeStyle = rgba('#2a0a04', s.a);
      g.lineWidth = Math.max(2, 0.08 * m);
      g.lineCap = 'round';
      for (const sd of [-1, 1]) {
        g.beginPath();
        g.moveTo(hx, hy + sd * 0.05 * m);
        g.quadraticCurveTo(hx + 0.3 * m, hy + sd * (0.1 + c) * m, hx + 0.38 * m, hy + sd * 0.04 * m);
        g.stroke();
      }
      g.lineCap = 'butt';
      s.mx = hx + 0.3 * m;
      s.my = hy;
    },
    fire: (f, s) => FIRES.rings(f, s, '#ffc23a'),
  },
  tentacle: {
    appear: 'rise',
    sight: 'wave',
    draw(f, o, s) {
      // (a violet tentacle up out of a vent far below, curling toward him, its pale suckers in a row, its tip
      // coiling tighter as it takes aim; hit, it recoils back down into the deep with a splash of bubbles)
      const { g } = f,
        m = s.m,
        down = s.alive ? 0 : ease(clamp01(s.hitU / 0.5)) * 8 * m,
        X0 = s.X - 0.6 * m,
        Y0 = s.Y + 9 * m,
        pts = [];
      for (let i = 0; i <= 14; i++) {
        const u = i / 14,
          w = Math.sin(u * 5 - s.t * 2.5 + o.v * 3) * 0.5 * m * u,
          curl = u > 0.75 ? (u - 0.75) * 4 : 0,
          a = curl * (2.2 + 1.5 * s.aim);
        pts.push([lerp(X0, s.X, u) + w + Math.sin(a) * 0.5 * m * curl, lerp(Y0, s.Y, u) + down - (1 - Math.cos(a)) * 0.4 * m * curl]);
      }
      const ga = g.globalAlpha;
      g.globalAlpha = ga * s.a;
      for (const [col, k] of [[EDGE, 1.25], ['#8a4ac8', 1]]) {
        for (let i = 0; i < pts.length - 1; i++) {
          g.strokeStyle = col;
          g.lineWidth = Math.max(2, (0.42 - 0.3 * (i / 14)) * m * k * s.sc);
          g.lineCap = 'round';
          g.beginPath();
          g.moveTo(...pts[i]);
          g.lineTo(...pts[i + 1]);
          g.stroke();
        }
      }
      g.fillStyle = '#e8c8f8';
      for (let i = 2; i < pts.length - 1; i += 2) {
        g.beginPath();
        g.arc(pts[i][0] + 0.08 * m, pts[i][1], (0.08 - 0.004 * i) * m, 0, TAU);
        g.fill();
      }
      g.lineCap = 'butt';
      g.globalAlpha = ga;
      const [tx, ty] = pts[pts.length - 1];
      if (!s.alive) {
        bubbles(g, s.X, s.Y + down * 0.5, s.hitU, 10, 1.4 * m);
        return;
      }
      glowDot(g, tx, ty, (0.3 + 0.3 * s.k) * m, '#d8a0ff', (0.3 + 0.4 * s.aim) * s.a);
      s.mx = tx;
      s.my = ty;
    },
    fire: (f, s) => FIRES.orb(f, s, '#6a3aa0', 'hex'),
  },
  minirocket: {
    halo: 1.2,
    appear: 'fly',
    sight: 'dots',
    draw(f, o, s) {
      // (a rusty little rocket wobbling in the air on a sputtering flame, puffs of smoke behind it; hit, its nose pops
      // off and it spins away trailing smoke)
      const { g } = f,
        m = s.m,
        sp = spr(s, 'minirocket', MINIROCKET);
      let X = s.X + 0.15 * m * Math.sin(s.t * 2.7 + o.v * 4),
        Y = s.Y + 0.1 * m * Math.sin(s.t * 4.3),
        rot = s.tilt + 0.25 + 0.15 * Math.sin(s.t * 3.3 + o.v);
      if (!s.alive) {
        const u = s.hitU;
        X -= 2 * u * m;
        Y -= 3 * u * m - 6 * u * u * m;
        rot += u * 14;
        smoke(g, s.X, s.Y, u, 6, 1.2 * m);
        flash(g, s.X, s.Y, u / 0.3, 1.2 * m, '#ffb040');
        if (u > 0.9) return;
      }
      const [fx, fy] = turn(X, Y, m, rot, 0, 0.75),
        fl = 0.3 + 0.2 * Math.sin(s.t * 40) + 0.2 * s.k;
      glowDot(g, fx, fy, fl * m, '#ffb040', s.a);
      glowDot(g, fx, fy, fl * 0.4 * m, '#ffffff', s.a);
      for (let k = 0; k < 3; k++) {
        const u = (s.t * 1.5 + k / 3) % 1;
        glowDot(g, fx + u * 0.3 * m, fy + u * 1.4 * m, (0.15 + 0.3 * u) * m, '#8a8088', (1 - u) * 0.4 * s.a);
      }
      put(g, s, sp, X, Y, rot);
      if (!s.alive) return;
      [s.mx, s.my] = turn(X, Y, m, rot, 0, -0.75);
    },
    fire: (f, s) => FIRES.orb(f, s, '#ffb040', 'fire'),
  },
  blimp: {
    halo: 1.4,
    appear: 'drop',
    sight: 'rings',
    draw(f, o, s) {
      // (the echo-zeppelin puffing up with the bass, rings of its echo going out on the beat; hit, it lets its air out
      // and zig-zags away like a balloon)
      const { g } = f,
        m = s.m,
        sp = spr(s, 'blimp', BLIMP);
      let X = s.X + 0.1 * m * Math.sin(s.t * 0.9 + o.v * 4),
        Y = s.Y + 0.12 * m * Math.sin(s.t * 1.6),
        sx = 1 + 0.06 * f.mf.bass + 0.06 * s.k,
        sy = sx,
        rot = 0.05 * Math.sin(s.t * 1.2);
      if (!s.alive) {
        const u = s.hitU;
        X += (3 * u + 0.6 * Math.sin(u * 30) * u) * m;
        Y -= 4 * u * m;
        rot += Math.sin(u * 25) * 0.6;
        sx = sy = Math.max(0.3, 1 - 0.7 * u);
        if (u > 0.95) return;
      } else {
        for (let k = 0; k < 2; k++) {
          const q = (s.b + k) / 2;
          g.strokeStyle = rgba('#ff9ad0', 0.5 * (1 - q) * s.a);
          g.lineWidth = Math.max(1, 0.05 * m);
          g.beginPath();
          g.ellipse(X, Y, (1 + 1.5 * q) * m, (0.5 + 0.8 * q) * m, 0, 0, TAU);
          g.stroke();
        }
      }
      put(g, s, sp, X, Y, rot, sx, sy);
      if (!s.alive) return;
      [s.mx, s.my] = turn(X, Y, m, rot, 0, 0.53);
    },
    fire: (f, s) => FIRES.rings(f, s, '#ff9ad0'),
  },
  hubcap: {
    appear: 'fly',
    sight: 'dots',
    draw(f, o, s) {
      // (a hubcap off the red car, bowling along the air on its edge, spinning, the sun flashing off it on the beat;
      // hit, it clangs off spinning flat)
      const { g } = f,
        m = s.m,
        sp = spr(s, 'hubcap', HUBCAP);
      let X = s.X,
        Y = s.Y + 0.15 * m * Math.abs(Math.sin(s.t * 3 + o.v)),
        rot = -s.t * 6,
        sx = 0.75 + 0.25 * Math.cos(s.t * 1.3);
      if (!s.alive) {
        const u = s.hitU;
        X += 4 * u * m;
        Y -= 3 * u * m - 5 * u * u * m;
        rot -= u * 20;
        sx = Math.abs(Math.cos(u * 12));
        streaks(g, s.X, s.Y, u / 0.4, '#ffffff', 8, 1.2 * m);
        if (u > 0.9) return;
      }
      put(g, s, sp, X, Y, rot, sx, 1);
      if (!s.alive) return;
      glowDot(g, X - 0.2 * m, Y - 0.25 * m, (0.2 + 0.4 * s.b) * m, '#ffffff', 0.8 * s.a);
      s.mx = X;
      s.my = Y;
    },
    fire: (f, s) => FIRES.bolt(f, s, '#fff0a0'),
  },
  dragonfly: {
    halo: 1.1,
    appear: 'fly',
    sight: 'dots',
    draw(f, o, s) {
      // (hovering in darts, its four wings a shimmer, its eyes catching the light; hit, it spirals off)
      const { g } = f,
        m = s.m,
        sp = spr(s, 'dragonfly', DRAGONFLY),
        dart = Math.floor(s.t * 1.5 + o.v * 7);
      let X = s.X + (hash(dart, 3) - 0.5) * 0.5 * m,
        Y = s.Y + (hash(dart, 4) - 0.5) * 0.35 * m,
        rot = s.tilt + 0.1 * Math.sin(s.t * 2);
      if (!s.alive) {
        const u = s.hitU;
        X += Math.cos(u * 12) * u * 2 * m + 2 * u * m;
        Y += Math.sin(u * 12) * u * m + 3 * u * u * m;
        rot += u * 10;
        if (u > 0.9) return;
      }
      for (const [dx, sd] of [[-0.05, 1], [0.12, 1], [-0.05, -1], [0.12, -1]]) {
        const fl = 0.6 + 0.4 * Math.sin(s.t * 60 + dx * 20 + sd);
        const [wx, wy] = turn(X, Y, m, rot, dx, -0.05);
        g.fillStyle = rgba('#d8f8ff', 0.4 * s.a);
        g.beginPath();
        g.ellipse(wx + (sd > 0 ? -0.35 : 0.35) * m * 0.3, wy - 0.35 * m * fl, 0.55 * m, 0.12 * m, sd > 0 ? -0.3 : 0.3, 0, TAU);
        g.fill();
        g.strokeStyle = rgba('#5ae0ff', 0.4 * s.a);
        g.lineWidth = Math.max(1, 0.02 * m);
        g.stroke();
      }
      put(g, s, sp, X, Y, rot);
      if (!s.alive) return;
      [s.mx, s.my] = turn(X, Y, m, rot, 0.6, 0);
    },
    fire: (f, s) => FIRES.bolt(f, s, '#5ae0ff'),
  },
  snowwalker: {
    appear: 'grow',
    sight: 'wave',
    draw(f, o, s) {
      // (a grumpy little snowman hopping in the air on the beat, its stick arms waving, a cold breath round it; hit,
      // it melts into a puddle of drops and a snowdrop pops up out of it)
      const { g } = f,
        m = s.m,
        sp = spr(s, 'snowwalker', SNOWWALKER),
        hop = 0.15 * m * (1 - s.b);
      if (!s.alive) {
        const u = s.hitU,
          melt = clamp01(u / 0.6);
        put(g, s, sp, s.X, s.Y + melt * 0.6 * m, 0, 1 + 0.4 * melt, Math.max(0.05, 1 - melt));
        for (let k = 0; k < 8; k++) glowDot(g, s.X + (hash(k, 3) - 0.5) * 1.5 * m, s.Y + (0.5 + 3 * u * u * hash(k, 4)) * m, 0.08 * m, '#bfe8ff', 1 - u);
        if (u > 0.4) {
          const k = clamp01((u - 0.4) / 0.4);
          g.strokeStyle = '#3aa83a';
          g.lineWidth = Math.max(1, 0.05 * m);
          g.beginPath();
          g.moveTo(s.X, s.Y + 0.9 * m);
          g.quadraticCurveTo(s.X + 0.1 * m, s.Y + (0.9 - 0.6 * k) * m, s.X + 0.25 * m, s.Y + (0.9 - 0.5 * k) * m);
          g.stroke();
          glowDot(g, s.X + 0.25 * m, s.Y + (0.95 - 0.5 * k) * m, 0.12 * m * k, '#ffffff', 1);
        }
        return;
      }
      glowDot(g, s.X, s.Y, 1.1 * m, '#d8f0ff', (0.2 + 0.2 * s.k) * s.a);
      put(g, s, sp, s.X, s.Y - hop, 0.05 * Math.sin(s.t * 3));
      s.mx = s.X + 0.2 * m;
      s.my = s.Y - hop - 0.2 * m;
    },
    fire: (f, s) => FIRES.orb(f, s, '#bfe8ff', 'fire'),
  },
  ophan: {
    halo: 1.6,
    appear: 'grow',
    sight: 'laser',
    draw(f, o, s) {
      // (an ophan, a wheel within wheels (ATL's "Ангелы"; no symbol of faith on it): unfolding its rings as it comes,
      // every eye on them turning to him, a beam gathering in its fire as it takes aim; hit, its rings scatter spinning
      // away and its eyes shut)
      const { g } = f,
        m = s.m,
        R = 0.75 * m * s.sc;
      if (!s.alive) {
        const u = s.hitU;
        for (let k = 0; k < 3; k++) {
          const an = s.seed + k * 2.1,
            x = s.X + Math.cos(an) * u * 4 * m,
            y = s.Y + Math.sin(an) * u * 3 * m + 3 * u * u * m;
          g.strokeStyle = rgba('#ffd060', 1 - u);
          g.lineWidth = Math.max(1.5, 0.07 * m);
          g.beginPath();
          g.ellipse(x, y, R * (0.9 - 0.1 * k), R * 0.3 * Math.abs(Math.cos(u * 20 + k)) + 1, an + u * 10, 0, Math.PI * 2);
          g.stroke();
        }
        shock(g, s.X, s.Y, u / 0.4, 2 * m, '#fff4d0');
        return;
      }
      ophanWheel(f, s.X, s.Y, R, s.t * (0.8 + 1.5 * s.aim), s.CX, s.CY, s.a, 0.6 + 0.6 * s.aim);
      if (s.aim > 0) glowDot(g, s.X, s.Y, (0.2 + 0.4 * s.aim) * m, '#ffffff', s.aim);
      s.mx = s.X;
      s.my = s.Y;
    },
    fire: (f, s) => FIRES.beam(f, s, '#fff0c0'),
  },
  crocodile: {
    appear: 'rise',
    sight: 'wave',
    draw(f, o, s) {
      // (a crocodile's head up out of the swamp below ("Крокодил"), its long snout, its jaws opening wider as it takes
      // aim and snapping on the kick, its eyes on top; hit, it squeezes its eyes shut and sinks back with a splash)
      const { g } = f,
        m = s.m,
        sink = s.alive ? 0 : ease(clamp01(s.hitU / 0.5)) * 6 * m,
        X = s.X + 0.1 * m * Math.sin(s.t * 1.2 + o.v),
        Y = s.Y + sink + 0.08 * m * Math.sin(s.t * 2),
        gape = s.alive ? (0.1 + 0.5 * s.aim) * (1 - 0.6 * s.k) : 0.05,
        green = mixHex('#3a7a34', s.P.near, 0.1),
        dark = mixHex('#2a5a2a', s.P.near, 0.1);
      const ga = g.globalAlpha;
      g.globalAlpha = ga * s.a * (s.alive ? 1 : clamp01(1 - (s.hitU - 0.4) / 0.4));
      // (its neck down out of sight, then the lower and upper jaws, turned toward him)
      g.fillStyle = dark;
      g.strokeStyle = EDGE;
      g.lineWidth = Math.max(1, 0.06 * m);
      g.beginPath();
      g.moveTo(X + 0.2 * m, Y + 6 * m);
      g.lineTo(X + 0.25 * m, Y + 0.2 * m);
      g.lineTo(X + 0.9 * m, Y + 0.3 * m);
      g.lineTo(X + 1.0 * m, Y + 6 * m);
      g.fill();
      g.stroke();
      for (const [sd, col] of [[1, dark], [-1, green]]) {
        const a = sd * gape;
        g.save();
        g.translate(X + 0.7 * m, Y);
        g.rotate(-a);
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(0, -0.25 * m * (sd < 0 ? 1 : 0));
        g.lineTo(-1.9 * m, -0.05 * m * sd);
        g.quadraticCurveTo(-2.05 * m, 0.08 * m * sd, -1.8 * m, 0.18 * m * sd);
        g.lineTo(0, 0.3 * m * sd);
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = '#f4f0dc';
        for (let k = 0; k < 6; k++) {
          const x = -1.7 * m + k * 0.28 * m;
          g.beginPath();
          g.moveTo(x, 0.02 * m * sd);
          g.lineTo(x + 0.07 * m, 0.14 * m * sd);
          g.lineTo(x + 0.14 * m, 0.02 * m * sd);
          g.fill();
        }
        g.restore();
      }
      // (its eyes on top of its head)
      const eyeY = Y - 0.35 * m;
      g.fillStyle = green;
      g.beginPath();
      g.arc(X + 0.55 * m, eyeY, 0.22 * m, Math.PI, TAU);
      g.fill();
      g.stroke();
      if (s.alive) {
        g.fillStyle = '#ffd23a';
        g.beginPath();
        g.ellipse(X + 0.5 * m, eyeY - 0.05 * m, 0.1 * m, 0.08 * m, 0, 0, TAU);
        g.fill();
        g.fillStyle = s.aim > 0 ? SIGHT : EDGE;
        g.fillRect(X + 0.48 * m, eyeY - 0.12 * m, 0.04 * m, 0.14 * m);
      } else {
        g.strokeStyle = EDGE;
        g.beginPath();
        g.moveTo(X + 0.4 * m, eyeY - 0.05 * m);
        g.lineTo(X + 0.6 * m, eyeY - 0.02 * m);
        g.stroke();
      }
      g.globalAlpha = ga;
      if (!s.alive) {
        bubbles(g, s.X, s.Y + 1.2 * m, s.hitU, 10, 1.5 * m);
        burst(g, s.X, s.Y + 1.5 * m, s.hitU / 0.5, '#8ae0e8', 12, 1.6 * m, 4);
        return;
      }
      s.mx = X - 1.2 * m;
      s.my = Y;
    },
    fire: (f, s) => FIRES.rings(f, s, '#4ae0d0'),
  },
  meteor: {
    halo: 1.2,
    appear: 'fly',
    sight: 'dots',
    draw(f, o, s) {
      // (a cartoon meteor hanging in the air on its tail of fire ("Удобрением": what fell out of the sky), its crust
      // glowing on the kick; hit, it cracks open and a green sprout pops out of it in a puff of leaves)
      const { g } = f,
        m = s.m,
        sp = spr(s, 'meteor', METEOR),
        X = s.X + 0.1 * m * Math.sin(s.t * 2.3 + o.v * 4),
        Y = s.Y + 0.1 * m * Math.sin(s.t * 3.1),
        rot = s.t * 0.8;
      if (!s.alive) {
        const u = s.hitU;
        shatter(g, sp, X, Y, m, u, 2, 2, s.seed, rot);
        burst(g, X, Y, u / 0.6, '#5ae04a', 12, 1.8 * m, 3);
        burst(g, X, Y, u / 0.5, '#ff8ad0', 6, 1.2 * m, 5);
        return;
      }
      for (let k = 6; k >= 1; k--) {
        const q = k / 6;
        glowDot(g, X + q * 1.4 * m, Y - q * 1.0 * m, (0.55 - 0.3 * q) * m, k % 2 ? '#ff8a2a' : '#ffd23a', (1 - q) * 0.8 * s.a);
      }
      glowDot(g, X, Y, (0.9 + 0.3 * s.k) * m, '#ff7a2a', (0.35 + 0.3 * s.k) * s.a);
      put(g, s, sp, X, Y, rot);
      s.mx = X;
      s.my = Y;
    },
    fire: (f, s) => FIRES.orb(f, s, '#ff8a2a', 'fire'),
  },
  beetle: {
    halo: 1.2,
    appear: 'fly',
    sight: 'dots',
    draw(f, o, s) {
      // (a rhinoceros beetle droning in the air, its shell split and its wings buzzing, a ball of soil in its legs; hit,
      // its ball bursts in flowers and it tumbles off)
      const { g } = f,
        m = s.m,
        sp = spr(s, 'beetle', BEETLE);
      let X = s.X + 0.15 * m * Math.sin(s.t * 1.3 + o.v * 4),
        Y = s.Y + 0.12 * m * Math.sin(s.t * 2.6 + o.v),
        rot = s.tilt;
      if (!s.alive) {
        const u = s.hitU;
        for (const [c, sd] of [['#ff8ad0', 1], ['#fff0a0', 2], ['#5ae04a', 3]]) burst(g, s.X, s.Y + 0.6 * m, u / 0.7, c, 9, 1.8 * m, sd);
        X += 2 * u * m;
        Y += 5 * u * u * m;
        rot += u * 10;
        if (u > 0.9) return;
      } else {
        g.fillStyle = mixHex('#6a4a2a', s.P.near, 0.1);
        g.beginPath();
        g.arc(X - 0.05 * m, Y + 0.6 * m, 0.32 * m * (1 + 0.05 * s.k), 0, TAU);
        g.fill();
        g.strokeStyle = EDGE;
        g.lineWidth = Math.max(1, 0.05 * m);
        g.stroke();
      }
      const fl = Math.abs(Math.sin(s.t * 50));
      for (const sd of [-1, 1]) {
        g.fillStyle = rgba('#e8f4ff', 0.4 * s.a);
        g.beginPath();
        g.ellipse(X - 0.35 * m, Y - (0.3 + 0.25 * fl) * m, 0.6 * m, 0.15 * m, sd * 0.3 - 0.3, 0, TAU);
        g.fill();
      }
      put(g, s, sp, X, Y, rot);
      if (!s.alive) return;
      [s.mx, s.my] = turn(X, Y, m, rot, 0.85, -0.5);
    },
    fire: (f, s) => FIRES.orb(f, s, '#8a5a2a', 'fire'),
  },
};
// the flyers: a body and two wings flapping (the downstroke on the beat), its eyes lit; it fires by diving at him,
// talons first, and away; hit, feathers fly and it tumbles down (a gargoyle breaks in pieces, a firebird goes up in
// sparks)
for (const kind of Object.keys(FLYERS))
  THREATS[kind] = {
    appear: 'fly',
    sight: 'dots',
    draw(f, o, s) {
      const { g } = f,
        m = s.m,
        c = FLYERS[kind],
        body = spr(s, 'fly_' + kind, flyerBody(kind)),
        wing = spr(s, 'wing_' + kind, flyerWing(kind));
      let X = s.X + 0.25 * m * Math.sin(s.t * 1.1 + o.v * 4),
        Y = s.Y + 0.18 * m * Math.sin(s.t * 2.3 + o.v * 5),
        rot = s.tilt,
        flap = -0.25 - 0.85 * Math.sin(s.t * c.flap + o.v * 7 + 2 * s.b),
        a = s.a;
      s.mx = X - 0.4 * m;
      s.my = Y + 0.1 * m;
      if (!s.alive) {
        const u = s.hitU;
        if (c.stone) {
          shatter(g, body, X, Y, m, u, 3, 2, s.seed);
          shatter(g, wing, X, Y - 0.08 * m, m, u, 2, 1, s.seed + 3, -0.6);
          smoke(g, X, Y, u, 5, 1.0 * m, '#8a867e');
          return;
        }
        if (c.fire) {
          smoke(g, X, Y, u, 6, 1.2 * m);
          burst(g, X, Y, u / 0.7, '#ffb21a', 20, 2 * m);
          flash(g, X, Y, u / 0.4, 1.6 * m, '#ff8a3d');
          if (u > 0.25) return;
        }
        feathers(g, X, Y, u, 12, 1.6 * m, c.wing);
        X += 0.6 * u * m;
        Y += 4.9 * u * u * m;
        rot = u * 5;
        flap = 0.5;
        a *= clamp01(1 - (u - 0.8) / 0.3);
        if (a <= 0) return;
      } else if (s.shot >= 0) {
        // (its dive: down at his chest, talons first, then away up and out of sight)
        const sh = s.shot,
          d1 = clamp01(sh / 0.13),
          d2 = clamp01((sh - 0.13) / 0.5);
        if (d2 >= 1) return;
        if (d1 < 1) {
          [X, Y] = arc(X, Y, s.CX + 0.3 * m, s.CY - 0.2 * m, ease(d1), -0.6 * m);
          rot = -0.6 * d1;
          flap = -1.1;
        } else {
          X = lerp(s.CX + 0.3 * m, s.CX + 4 * m, d2);
          Y = lerp(s.CY - 0.2 * m, s.CY - 5 * m, d2 * d2);
          rot = 0.5;
          a *= 1 - d2;
          // (its talons' slashes across him)
          if (sh < 0.4) {
            g.strokeStyle = rgba('#ffffff', 1 - (sh - 0.13) / 0.27);
            g.lineWidth = Math.max(1.5, 0.05 * m);
            g.beginPath();
            for (let i = 0; i < 3; i++) {
              g.moveTo(s.CX - 0.25 * m + i * 0.12 * m, s.CY - 0.35 * m);
              g.quadraticCurveTo(s.CX - 0.05 * m + i * 0.12 * m, s.CY, s.CX - 0.2 * m + i * 0.12 * m, s.CY + 0.35 * m);
            }
            g.stroke();
          }
          impact(f, s, sh - 0.13, SIGHT, 0.8);
        }
      }
      const ga = g.globalAlpha;
      g.globalAlpha = ga * a;
      if (c.fire) glowDot(g, X, Y, (1.3 + 0.3 * s.k) * m, '#ff6a1a', 0.45 + 0.3 * s.k);
      const [shx, shy] = turn(X, Y, m, rot, 0.02, -0.08);
      blit(g, wing, shx + 0.05 * m, shy - 0.03 * m, m, rot + flap * 0.85 - 0.15, s.sc * 0.92, s.sc * 0.92);
      blit(g, body, X, Y, m, rot, s.sc, s.sc);
      blit(g, wing, shx, shy, m, rot + flap, s.sc, s.sc);
      g.globalAlpha = ga;
      if (s.alive) {
        const [ex, ey] = turn(X, Y, m, rot, -0.43, -0.12);
        glowDot(g, ex, ey, (0.1 + 0.12 * s.aim + 0.05 * s.k) * m, s.aim > 0 ? SIGHT : c.fire ? '#fff0a0' : '#ffd23a', a);
        if (c.fire) {
          g.fillStyle = rgba('#ffd060', 0.9 * a);
          for (let i = 0; i < 5; i++) {
            const u = (s.t * 1.5 + hash(i, 4)) % 1,
              r = 0.05 * m * (1 - u);
            g.fillRect(X + (0.5 + u * 0.8) * m - r, Y + (hash(i, 9) - 0.5) * 0.4 * m + u * 0.3 * m - r, 2 * r, 2 * r);
          }
        }
      }
    },
    fire: () => {},
  };

// a threat: drawn as it arrives, aims, fires or is taken out (the table above), its sight, its charge, its shot
function target(f, o) {
  const d = THREATS[o.aim] ?? THREATS.drone,
    s = stateOf(f, o),
    { g } = f;
  if (s.hitU > 1.6 || s.shot > 2.5) return s;
  arrive(s, d.appear);
  s.X += s.dx * s.m;
  s.Y += s.dy * s.m;
  s.mx = s.X;
  s.my = s.Y;
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  // (a machine's halo in the place's light behind it: dark metal stands out on a dark sky)
  if (d.halo && s.alive) glowDot(g, s.X, s.Y, d.halo * s.m, s.P.line, (0.28 + 0.22 * s.k) * s.a);
  d.draw(f, o, s);
  g.restore();
  if (!s.alive) {
    // (taken out: a flash and a ring where it was hit, its sparks)
    flash(g, s.X, s.Y, s.hitU / 0.35, 1.8 * s.m, HOT);
    streaks(g, s.X, s.Y, s.hitU / 0.45, '#ffffff', 12, 2.0 * s.m, s.seed);
    return s;
  }
  g.save();
  g.lineCap = 'round';
  // (its aim: from two beats before the press, flashing on each half beat of the count down to it (each flash starts on
  // a half beat, so the flashes are the press's own grid), solid only from the press's beat on: a sight that went solid
  // before it read as the moment to throw, a slow song's half beat too early)
  if (s.aim > 0) {
    const hb = f.L.A.beat / 2,
      left = (1 - s.aim) * 4 * hb,
      on = left < 0.02 || (left / hb) % 1 > 0.7;
    SIGHTS[d.sight](f, s, on);
    lockOn(f, s);
    // (its weapon warming up as it aims: a glow where it fires from, growing to the beat: take it out before it fires)
    glowDot(g, s.mx, s.my, (0.25 + 0.45 * s.aim) * s.m, SIGHT, (0.25 + 0.5 * s.aim) * (0.7 + 0.3 * s.b));
  }
  // (not taken out: it charges up, a glow growing where it fires from, the moment its throw did not come)
  if (s.charge > 0) {
    glowDot(g, s.mx, s.my, (0.4 + 0.7 * s.charge) * s.m, SIGHT, 0.8 * s.charge);
    glowDot(g, s.mx, s.my, (0.12 + 0.2 * s.charge) * s.m, '#ffffff', s.charge);
  }
  if (s.shot >= 0 && s.shot < 0.9) d.fire(f, s);
  g.restore();
  return s;
}
function throwAt(f, o) {
  const { g, v, t, run, L } = f,
    m = v.ppm,
    beat = L.A.beat,
    s = target(f, o),
    hitU = s.hitU;
  // (where it is hit: where it is when the throw reaches it)
  const hx0 = threatX(L, o, o.ti),
    TX = v.sx(hx0),
    TY = v.sy(o.y + o.ty);
  // (aimed: from the moment it is in his hands, a reticle on the target closing to the throw's beat; its note ahead of
  // him, where he is when he throws)
  const mine = run.carry?.o?.pid === o.pid;
  if (!o.res && mine) {
    const u = clamp01(1 - (o.t - t) / (4 * beat)),
      R = (0.55 + 0.9 * (1 - u)) * m;
    g.strokeStyle = rgba(KICK, 0.5 + 0.5 * u);
    g.lineWidth = Math.max(1.5, 0.05 * m);
    g.beginPath();
    g.arc(s.X, s.Y, R, 0, TAU);
    for (let q = 0; q < 4; q++) {
      const a = (q * Math.PI) / 2 + t * 2;
      g.moveTo(s.X + Math.cos(a) * (R - 0.18 * m), s.Y + Math.sin(a) * (R - 0.18 * m));
      g.lineTo(s.X + Math.cos(a) * (R + 0.18 * m), s.Y + Math.sin(a) * (R + 0.18 * m));
    }
    g.stroke();
    mark(f, o, v.sx(o.x), v.sy(o.y + 2.5));
    // (the throw's arc from his hand to it, dotted, from a beat and a half before: where and when to let go)
    const due = clamp01(1 - (o.t - t) / (1.5 * beat));
    if (due > 0 && run.J) {
      const hx = v.sx(run.J[JI.haR * 2]),
        hy = v.sy(run.J[JI.haR * 2 + 1]),
        p = w => arc(hx, hy, s.X, s.Y, w, 0.9 * m);
      dotted(g, p, 0.08, 12, KICK, Math.max(1.5, 0.045 * m) * (1 + 0.35 * f.mf.beat), Math.min(1, due * 2) * (0.6 + 0.4 * f.mf.beat), t);
    }
  }
  // (thrown: from his hand to it over half a beat, turning, a trail of the throw's colour; it bursts on it)
  if (o.res === 'ok') {
    const hx = o.relX ?? L.xAt(o.tc) + 0.4,
      hy = o.relY ?? o.y + 1.8,
      fly = w => [lerp(hx, hx0, w), lerp(hy, o.y + o.ty, w) + 0.9 * 4 * w * (1 - w)];
    if (t >= o.tc && t < o.ti) {
      const u = (t - o.tc) / (o.ti - o.tc);
      trail(f, fly, u, 0.3, KICK, 0.3 * m, 8);
      trail(f, fly, u, 0.1, '#ffffff', 0.14 * m, 3);
      const [px, py] = fly(u);
      thing(f, o.item, v.sx(px), v.sy(py), 0.22 * m, u * 14);
    }
    burst(g, TX, TY, hitU / 0.6, '#ffffff', 16, 1.6 * m);
    burst(g, TX, TY, (hitU / 0.6) * 0.8, f.T.win[2], 10, 1.0 * m, 3);
    shock(g, TX, TY, hitU / 0.3, 1.6 * m, KICK);
  }
  // (missed: dropped from his hands, falling to the roof and breaking)
  if (o.dropT !== undefined && o.res === 'hit') {
    const d = t - o.dropT,
      x = L.xAt(o.dropT) + 0.35,
      y = Math.max(o.y + 0.1, o.y + 1.3 - 4.9 * d * d);
    if (d < 1.2) {
      if (y > o.y + 0.11 || d < 0.6) thing(f, o.item, v.sx(x), v.sy(y), 0.2 * m, d * 6);
      const land = Math.sqrt(1.2 / 4.9);
      burst(g, v.sx(x), v.sy(o.y + 0.1), (d - land) / 0.4, '#ffffff', 10, 0.6 * m);
    }
  }
}

// the props among the obstacles (obstacles.js), each in its stretch's frame
export function drawProp(f, o) {
  if (o.type === 'bat') return bat(f, o);
  if (o.type === 'pick') return pick(f, o);
  if (o.type === 'throw') return throwAt(f, o);
}
// a prop in the cursor's hand, its foot at screen (X, Y): a thing on its spot; a threat, small, being brought (a sniper
// or a gunner: its sight)
export function heldProp(f, o, X, Y) {
  const m = f.v.ppm,
    g = f.g;
  if (o.type === 'pick') {
    spot(f, X, Y, 0.5);
    thing(f, o.item, X, Y - 0.16 * m, 0.2 * m, 0.2);
    return;
  }
  const P = palOf(f.T),
    mat = theme(f).mat,
    res = resOf(f.v),
    k = 0.55 * m,
    Y0 = Y - 0.5 * m,
    one = ICONS[o.aim];
  glowDot(g, X, Y0, 1.0 * m, SIGHT, 0.35 + 0.25 * f.mf.beat);
  if (one) for (const [id, def, dx, dy] of one(mat)) blit(g, sprite(id, def, P, mat, res), X + dx * k, Y0 + dy * k, k);
  else {
    g.strokeStyle = rgba(SIGHT, 0.9);
    g.lineWidth = Math.max(1.5, 0.05 * m);
    g.beginPath();
    g.arc(X, Y0, 0.3 * m, 0, TAU);
    g.moveTo(X - 0.45 * m, Y0);
    g.lineTo(X + 0.45 * m, Y0);
    g.moveTo(X, Y0 - 0.45 * m);
    g.lineTo(X, Y0 + 0.45 * m);
    g.stroke();
  }
}
// (what a threat looks like small in the cursor's hand: its sprites and where they go, in its metres)
const ICONS = {
  drone: () => [['drone', DRONE, 0, 0]],
  sentry: () => [['sentry', SENTRY, 0, 0]],
  field: () => [['emitter', EMITTER, 0, 0]],
  eye: () => [['eyemount', EYE_MOUNT, 0, -0.2], ['eyehead', EYE_HEAD, 0, -0.2]],
  crane: () => [['hook', HOOK, 0, -0.3], ['turret', TURRET, 0, -0.3]],
  speaker: () => [['speaker', SPEAKER, 0, 0]],
  lantern: mat => [mat === 'iron' || mat === 'stone' ? ['lantern_iron', LANTERN_IRON, 0, 0] : ['lantern_paper', LANTERN_PAPER, 0, 0]],
  wisp: () => [['ghost', GHOST, 0, 0]],
  shard: () => [['shard', SHARD, 0, 0]],
  hive: () => [['hive', HIVE, 0, 0]],
  jelly: () => [['jelly', JELLY, 0, 0]],
  angler: () => [['angler', ANGLER, 0, 0]],
  gunner: () => [['platform', PLATFORM, 0, 0.4]],
  jammer: () => [['jammer', JAMMER, 0, 0]],
  shadow: () => [['shadow', SHADOW, 0, 0]],
  drum: () => [['drum', DRUM, 0, 0]],
  totem: () => [['totem', TOTEM, 0, 0]],
  eqskull: () => [['eqskull', EQSKULL, 0, 0]],
  salamander: () => [['salamander', SALAMANDER, 0, 0]],
  soldierant: () => [['soldierant', SOLDIERANT, 0, 0]],
  minirocket: () => [['minirocket', MINIROCKET, 0, 0]],
  blimp: () => [['blimp', BLIMP, 0, 0]],
  hubcap: () => [['hubcap', HUBCAP, 0, 0]],
  dragonfly: () => [['dragonfly', DRAGONFLY, 0, 0]],
  snowwalker: () => [['snowwalker', SNOWWALKER, 0, 0]],
  beetle: () => [['beetle', BEETLE, 0, 0]],
  meteor: () => [['meteor', METEOR, 0, 0]],
};
for (const kind of Object.keys(FLYERS)) ICONS[kind] = () => [['wing_' + kind, flyerWing(kind), 0.02, -0.12], ['fly_' + kind, flyerBody(kind), 0, 0]];

// the sprites a level's props will need, made as it loads (renderer.js, its first frame drawn out of sight): each
// threat's, each thing's, each stand's, in the palette each will be seen in (the song's at its moment, and its drop's),
// and the glows they use; so none is painted while it plays
export function warmProps(f) {
  const { L, R, v } = f;
  const res = resOf(v),
    scratch = Object.assign(document.createElement('canvas'), { width: 4, height: 4 }).getContext('2d');
  for (const c of [SIGHT, HOT, KICK, SMOKE, '#ffffff', '#ff8a3d', '#ffb347', '#ffe14d', '#ff3b52', '#77737a', '#c8ffe4', '#3a2a4a', '#7dffb2', '#9ff6ff', '#7af0ff', '#ffd23a', '#ff6a1a', '#ffb21a', '#ffd0d4', '#b06bff', '#ff7a1a', '#8fe4ff', '#c48aff', '#e8f4ff', '#bff8ff', '#ff5ad0', '#5ae0ff', '#ffcf6a', '#fff0a0', '#ff9a2a', '#8a867e', '#2fb7b0', '#d0328c', '#ffb040', '#c8141e', '#5a0a10', '#a8141c', '#ffe23a', '#3dff6a', '#ff2fd0', '#9a7dff', '#e0d8ff', '#e8f0ff', '#ffe14d', '#ffd23a', '#5ae0ff', MOVE_COLOUR.slide])
    glowDot(scratch, 0, 0, 1, c, 1);
  const seen = new Set();
  for (const o of L.obs) {
    if (o.type !== 'bat' && o.type !== 'pick' && o.type !== 'throw') continue;
    const place = L.placeAt?.(o.t) ?? L.place,
      th = themeOf(place, PLACE_TAGS[place]),
      lk = R?.looks?.[place] ?? R?.look;
    for (const drop of [false, true]) {
      const T = lk?.palAt ? lk.palAt(o.t, drop) : f.T,
        P = palOf(T),
        key = `${o.type}|${o.aim ?? ''}|${o.item ?? o.fly}|${th.mat}|${P.key}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const ff = { ...f, T, place };
      thingSprite(ff, o.type === 'bat' ? o.fly : o.item);
      for (const c of [T.line, T.win[2]]) glowDot(scratch, 0, 0, 1, c, 1);
      if (o.type === 'bat') sprite('stand:' + th.stand, STANDS[th.stand] ?? STANDS.board, P, '', Math.max(24, Math.round(res * 0.75)));
      if (o.type === 'pick') sprite('pickbeam', PICKBEAM, P, '', Math.max(16, Math.round(res * 0.25)));
      if (o.type !== 'throw') continue;
      for (const [id, def] of ICONS[o.aim]?.(th.mat) ?? []) sprite(id, def, P, th.mat, res);
      if (o.aim === 'field') sprite('curtain', CURTAIN, P, th.mat, res);
      if (o.aim === 'sniper') sprite('stand:' + th.stand, STANDS[th.stand] ?? STANDS.board, P, '', Math.max(24, Math.round(res * 0.75)));
      if (o.aim === 'lantern') th.mat === 'iron' || th.mat === 'stone' ? flameOf(ff, '#8a3dff', '#e0b0ff') : flameOf(ff, '#ff7a1a', '#ffd060');
      if (o.aim === 'spirit') (flameOf(ff, '#ff3a12', '#ffa21a'), flameOf(ff, '#ffb21a', '#fff0a0'));
      if (o.aim === 'gunner' || o.aim === 'sentry') jetOf(ff, o.aim === 'gunner' ? T.win[2] : T.line);
      // (an ophan's eyes, at every size it unfolds through)
      if (o.aim === 'ophan') warmEyes(2, 0.1 * (f.v.ppm0 ?? f.v.ppm) * 1.3);
    }
  }
}

// ---- in his hands (drawn over him, in his frame): the bat lit up for a swing (fading in over the beat before a
// thrown thing comes down, so he is seen ready), its smear through the contact; what he carries
export function drawHeld(f) {
  const { g, v, run: R, t, L } = f;
  const J = R.J;
  if (!J || R.mode !== 'run') return;
  const m = v.ppm,
    hx = (J[JI.haL * 2] + J[JI.haR * 2]) / 2,
    hy = (J[JI.haL * 2 + 1] + J[JI.haR * 2 + 1]) / 2,
    st = R.strike?.take === PROP_TAKES.bat ? R.strike : null,
    due = L.obs.find(o => o.type === 'bat' && !o.res && o.seg === f.heroSeg && o.t - t < L.A.beat && o.t - t > -0.2);
  if (st || due) {
    const a = st ? Math.min(1, (st.t0 + st.dur - t) / 0.15) : clamp01(1 - (due.t - t) / L.A.beat) * 0.55,
      // (the swing: from up over his back shoulder, ready, round to level ahead of him on the contact, on through and
      // down past his front)
      th = !st ? 2.1 : t < st.contact ? lerp(2.2, 0.12, ease((t - st.t0) / Math.max(0.05, st.contact - st.t0))) : lerp(0.12, -2.3, ease((t - st.contact) / 0.3)),
      dx = Math.cos(th),
      dy = Math.sin(th);
    g.save();
    g.lineCap = 'round';
    g.globalAlpha *= Math.max(0, a);
    glowDot(g, v.sx(hx + dx * 0.55), v.sy(hy + dy * 0.55), 0.7 * m, KICK, 0.5);
    for (const [col, w] of [[KICK, 0.12], ['#ffffff', 0.045]]) {
      g.strokeStyle = col;
      g.lineWidth = w * m;
      g.beginPath();
      g.moveTo(v.sx(hx - dx * 0.1), v.sy(hy - dy * 0.1));
      g.lineTo(v.sx(hx + dx * 0.95), v.sy(hy + dy * 0.95));
      g.stroke();
    }
    g.restore();
    // (the swing's smear through the contact)
    const u = st ? (t - (st.contact - 0.1)) / 0.3 : -1;
    if (u > 0 && u < 1) {
      g.save();
      g.strokeStyle = rgba('#fff3b0', 0.55 * (1 - u));
      g.lineWidth = 0.45 * m;
      g.beginPath();
      g.arc(v.sx(hx), v.sy(hy), 0.6 * m, -2.0, 0.3);
      g.stroke();
      g.restore();
    }
  }
  // (what he carries: in his right hand as he picks it up and as he throws it, in both before his chest between)
  const c = R.carry,
    p = R.pickup,
    th = R.strike?.take === PROP_TAKES.throw ? R.strike : null;
  let it = null,
    one = false;
  // (not yet while his hand is still on its way down to it: it is on the roof till then)
  if (c && !(th && t >= th.contact) && !(p?.o === c.o && t - p.t0 < 0.12)) ((it = c.o.item), (one = !!th || (p && t - p.t0 < 0.5)));
  else if (p && p.o.res === 'ok' && t - p.t0 >= 0.12 && !th) ((it = p.o.item), (one = true));
  // (thrown: where it leaves his hand, for its flight)
  if (th?.o && t < th.contact) ((th.o.relX = J[JI.haR * 2]), (th.o.relY = J[JI.haR * 2 + 1]));
  if (!it) return;
  const X = one ? J[JI.haR * 2] + 0.03 : hx + 0.06,
    Y = one ? J[JI.haR * 2 + 1] : hy + 0.05;
  // (glowing up in his hands as its throw's beat comes: the moment to let it go)
  const tq = c && L.obs.find(q => q.type === 'throw' && q.pid === c.o.pid && !q.res),
    soon = tq ? clamp01(1 - (tq.t - t) / (2 * L.A.beat)) : 0;
  if (soon > 0) {
    glowDot(g, v.sx(X), v.sy(Y), (0.3 + 0.45 * soon) * m, KICK, (0.3 + 0.6 * soon) * (0.7 + 0.3 * f.mf.beat));
    shock(g, v.sx(X), v.sy(Y), 1 - f.mf.beat, (0.3 + 0.4 * soon) * m, KICK, 0.12);
  }
  thing(f, it, v.sx(X), v.sy(Y), 0.18 * m, one ? 0.6 : 0);
}
