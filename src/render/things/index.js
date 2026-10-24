// The obstacles' looks: every place's own set (render/things/<place>.js), one registry by skin, and drawThing. A new
// look is an entry in its place's file and in its place's skins (places.js).
import { glowDot, rgba } from '../util.js';
import city from './city.js';
import synth from './synth.js';
import forest from './forest.js';
import desert from './desert.js';
import station from './station.js';
import factory from './factory.js';
import rave from './rave.js';
import volcano from './volcano.js';
import ocean from './ocean.js';
import arctic from './arctic.js';
import wasteland from './wasteland.js';
import mall from './mall.js';
import moon from './moon.js';
import kowloon from './kowloon.js';
import bazaar from './bazaar.js';
import skies from './skies.js';
import castle from './castle.js';
import casino from './casino.js';
import arena from './arena.js';
import graveyard from './graveyard.js';
import tokyo from './tokyo.js';
import circuit from './circuit.js';
import apocradio from './apocradio.js';
import holyrave from './holyrave.js';
import blacksnow from './blacksnow.js';
import anthill from './anthill.js';
import fujisan from './fujisan.js';
import lastman from './lastman.js';
import compost from './compost.js';
import crocsky from './crocsky.js';
import { DANGER, HAZARDS } from './hazards.js';
import ai from './ai.js';

// the spring the cursor slams down before a launch up a shaft (every place has one)
const pad = (k, o) => {
  k.box(-0.5, 0, 1.0, 0.08, '#2a2f3a');
  for (let i = 0; i < 4; i++) k.line(-0.4 + i * 0.27, 0.08, -0.27 + i * 0.27, o.h, 0.03, '#c9ccd2');
  k.glow(2);
  k.box(-0.5, o.h, 1.0, 0.06, rgba(k.T.hold, 0.6 + 0.4 * k.mf.kick));
};

const CEILING = { city: '#59606e', synth: '#3a1660', forest: '#5a3a22', desert: '#b08850', station: '#5a6478', factory: '#6a5048', rave: '#3a3c48', volcano: '#3a2420', ocean: '#2a5a5a', arctic: '#cfe8f8', circuit: '#1d4a34', tokyo: '#5a2228', graveyard: '#3a3440', arena: '#4a4e5a', casino: '#8a6a20', castle: '#4a4652', skies: '#c8ccd8', bazaar: '#7a1c22', kowloon: '#4a3a44', moon: '#8a8a90', mall: '#c8a0d8', wasteland: '#6a4a32', blacksnow: '#5a5a5e', holyrave: '#2a2440', apocradio: '#5a3a26', anthill: '#8a4a22', fujisan: '#3a3440', lastman: '#6a6a64', compost: '#4a3420', crocsky: '#5a3a1e' };
// a long ceiling to slide under and hold (every place's, in its own colours): a steel girder hung on paired cables with
// clamps, an I-beam (a lit top flange, a web of a truss with the dark seen through it, rivets, a bottom flange), a
// strip of light along its underside beating with the kick and lights running along it on the beat, down-arrows under
// it; built along as far as the brush has got
const ceiling = (k, o) => {
  const len = Math.max(0.5, o.x1 - o.x0) * k.u,
    x0 = -(o.x1 - o.x0) / 2,
    x1 = x0 + len,
    col = CEILING[k.place] ?? '#555',
    y0 = 1.0,
    y1 = 1.62;
  k.plain();
  // the cables: two strands to each clamp, a clamp on the top flange; spread evenly over the whole girder, one 0.4 m in
  // from each end and the rest between at about 2.2 m (those over what is painted so far drawn)
  const full = Math.max(0.5, o.x1 - o.x0),
    nc = Math.max(2, Math.round((full - 0.8) / 2.2) + 1),
    clamps = Array.from({ length: nc }, (_, i) => x0 + 0.4 + ((full - 0.8) * i) / (nc - 1));
  for (const x of clamps) {
    if (x > x1 - 0.2) break;
    k.line(x - 0.12, y1, x - 0.05, k.sky, 0.03, '#9aa0a8');
    k.line(x + 0.12, y1, x + 0.05, k.sky, 0.03, '#9aa0a8');
    k.box(x - 0.2, y1, 0.4, 0.1, '#2a2d34', rgba(k.accent, 0.5), 0.02);
  }
  k.glow();
  // the girder: the web behind, dark; the truss in it; the flanges over and under
  k.box(x0, y0 + 0.12, len, y1 - y0 - 0.24, rgba('#000000', 0.55));
  for (let x = x0, i = 0; x < x1 - 0.05; x += 0.38, i++) {
    const xb = Math.min(x1, x + 0.38);
    k.line(x, i % 2 ? y0 + 0.12 : y1 - 0.12, xb, i % 2 ? y1 - 0.12 : y0 + 0.12, 0.05, col);
  }
  k.box(x0, y1 - 0.12, len, 0.12, col, rgba('#ffffff', 0.25), 0.02);
  k.box(x0, y0, len, 0.12, col, k.accent, 0.03);
  k.plain();
  k.box(x0, y1 - 0.04, len, 0.03, rgba('#ffffff', 0.18));
  // (rivets along both flanges)
  for (let x = x0 + 0.15; x < x1 - 0.1; x += 0.3) {
    k.disc(x, y1 - 0.06, 0.018, rgba('#ffffff', 0.35));
    k.disc(x, y0 + 0.06, 0.018, rgba('#ffffff', 0.25));
  }
  // its end caps
  for (const x of [x0, x1 - 0.06]) k.box(x, y0, 0.06, y1 - y0, col, k.accent, 0.02);
  // the lit strip under it, beating with the kick, and the lights running along it on the beat
  k.box(x0, y0 - 0.05, len, 0.05, rgba(k.accent, 0.55 + 0.45 * k.mf.kick));
  for (let x = x0 + 0.2; x < x1 - 0.1; x += 0.6) {
    const on = Math.max(0, Math.sin(k.t * 9 - x * 1.4)) * (0.4 + 0.6 * k.mf.beat);
    k.box(x - 0.12, y0 - 0.05, 0.24, 0.05, rgba('#ffffff', 0.9 * on));
  }
  for (let x = x0 + 0.4; x < x1 - 0.2; x += 0.8) {
    const on = 0.25 + 0.75 * Math.max(0, Math.sin(k.t * 8 - x * 1.2)) * (0.4 + 0.6 * k.mf.beat);
    k.poly([[x - 0.12, 0.82], [x + 0.12, 0.82], [x, 0.65]], rgba(k.accent, on));
  }
};

// a line to ride (what the cursor carries in for one): a length of cable with its two clamps
const line = k => {
  k.line(-0.9, 2.5, 0.9, 2.5, 0.04, '#d9dde3');
  for (const x of [-0.9, 0.9]) k.box(x - 0.08, 2.42, 0.16, 0.16, '#20242c', k.accent, 0.02);
};

// a rail to grind (what the cursor carries in for one): a bar on two posts
const rail = k => {
  k.line(-0.9, 0.3, 0.9, 0.3, 0.07, '#d9dde3');
  for (const x of [-0.8, 0.8]) k.box(x - 0.06, 0, 0.12, 0.3, '#1a1d24', k.accent, 0.02);
};

export const SKINS = { ...city, ...synth, ...forest, ...desert, ...station, ...factory, ...rave, ...volcano, ...ocean, ...arctic, ...circuit, ...tokyo, ...graveyard, ...arena, ...casino, ...castle, ...skies, ...bazaar, ...kowloon, ...moon, ...mall, ...wasteland, ...blacksnow, ...holyrave, ...apocradio, ...anthill, ...fujisan, ...lastman, ...compost, ...crocsky, ...HAZARDS, ...ai, pad, ceiling, line, rail };

// what every obstacle says whatever its place, so it reads at a glance (Subway Surfers' rule: what it closes off tells
// the move; the colour family tells it again): a thing to jump stands on the roof with its top lit warm and up-arrows
// over it; a thing to slide under hangs with clear air under it, its underside lit cold and down-arrows under it; a
// pane is red-framed from the roof to over his head
// what a thing to slide under hangs from: an open truss of its place's colour from over it on up out of sight (the top
// of the screen, however tall or turned: k.sky), the world seen through it and the thing's own look under it, taller
// than any jump (he clears 1.5 m: his head goes to 3.3 m: nothing to jump over, the only way is under); its chords lit
// cold, a light running down each to the gap on the beat. A long ceiling hangs from its own cables (the ceiling look)
// the things to slide under that hang from their own mount (a rod, a cable, a vine, a chain up out of sight) or float
// (a balloon, an airship's gondola under its envelope): no truss over them, or the two read as one odd pillar, or a
// balloon run through by a girder
const SELF_HUNG = new Set(['arCam', 'gtPortcullis', 'scaffold', 'hook', 'saw', 'vine', 'vinearch', 'gvGarland', 'kwWires', 'mlBridge', 'moArm', 'moTube', 'jelly', 'neonbar', 'ring', 'tkLanterns', 'wsChains', 'skBalloon', 'skGondola', 'bsHook', 'fjKoi']);
// (returns whether the truss carries it: then the skin's own cables up out of sight are left out, one mount, not a
// truss with two cables beside it)
function curtain(f, o, k) {
  if (o.type !== 'slide' || SELF_HUNG.has(o.skin)) return false;
  const col = CEILING[k.place] ?? '#555',
    y0 = 1.4,
    sky = k.sky,
    c0 = -0.42,
    c1 = 0.42;
  // (an outline pass: the chords' dark ring only; the thing's own colour ring is for the thing)
  if (f.sil && f.sil !== '#000000') return true;
  k.plain();
  for (const x of [c0, c1]) k.line(x, y0, x, sky, 0.08, col);
  k.line(c0 - 0.06, y0, c1 + 0.06, y0, 0.1, col);
  if (f.sil) return true;
  for (let y = y0, i = 0; y < sky; y += 0.75, i++) k.line(i % 2 ? c1 : c0, y, i % 2 ? c0 : c1, y + 0.75, 0.035, col);
  for (const x of [c0, c1]) {
    k.line(x, y0, x, Math.min(sky, y0 + 6), 0.035, rgba(k.accent, 0.4 + 0.4 * f.mf.beat));
    const y = y0 + 3 - ((k.t * 1.5 + (x > 0 ? 0.5 : 0)) % 1) * 3;
    k.line(x, y + 0.5, x, y, 0.05, rgba(k.accent, 0.5 + 0.5 * f.mf.kick));
  }
  return true;
}
// the obstacles move with the music, each with its own instrument (the charting rule: a kick makes a jump, a snare a
// slide, so the thing shows the sound it stands for), and are where they must be when he gets there: a thing to jump
// pops up out of the roof on each kick and sinks back, all the way up from a moment before he reaches it; a thing to
// slide under hangs high, slams down on each snare, all the way down while he goes under it. Returns [rise 0..1, drop m].
function motion(f, o) {
  // (by the act: still in the intro while it is learned, half in a verse, all of it in a build, a drop, a break)
  const { t, mf } = f,
    pass = o.passT ?? o.t,
    near = t > pass - 0.3,
    amt = { intro: 0, verse: 0.5 }[f.look?.act?.kind] ?? 1;
  if (o.type === 'jump') return [near || o.res ? 1 : 1 - amt * 0.6 * (1 - Math.max(mf.kick, 0.3 * mf.beat)), 0];
  if (o.type === 'slide') return [1, near || o.res ? 0 : amt * 0.35 * (1 - Math.max(mf.snare ?? 0, 0.3 * mf.beat))];
  return [1, 0];
}
// a soft shadow of the dark behind every obstacle, so it stands off any background however busy or bright
function halo(f, o) {
  if (o.type === 'pad') return;
  // (on the obstacles' own layer the dark rim does this, and a halo would only blur it)
  if (f.rim && o.type !== 'lane' && o.type !== 'gate') return;
  // (a hazard in a shaft: a red heat around it, throbbing faster as it comes, no dark behind it to read as solid)
  if (o.type === 'lane' || o.type === 'gate') {
    const { g, v, mf, t } = f,
      m = v.ppm,
      r = 1.0 * m,
      ga = g.globalAlpha;
    // (its heat's strength on the alpha: the sprite is the gradient at full strength)
    g.globalAlpha = ga * Math.min(1, Math.max(0, 0.3 + 0.25 * mf.beat + 0.1 * Math.sin(t * 18)));
    g.drawImage(haloSprite(DANGER, 1), -r, -0.3 * m - r, r * 2, r * 2);
    g.globalAlpha = ga;
    return;
  }
  const { g, v } = f,
    m = v.ppm,
    cy = (o.type === 'slide' || o.type === 'long' ? 1.3 : o.type === 'lane' ? 0.25 : (o.h ?? 0.8) / 2) * m,
    r = (o.type === 'long' ? Math.max(1, (o.x1 - o.x0) / 2) : o.type === 'smash' || o.type === 'foe' ? 1.5 : 1.1) * m;
  g.drawImage(haloSprite('#000000', 0.42), -r, -cy - r, r * 2, r * 2);
}
// a halo's radial gradient (col at alpha a in the middle to clear at the rim) drawn once into a sprite and stamped: a
// gradient made for every thing every frame was most of the frame's gradients
const HALOS = new Map();
function haloSprite(col, a) {
  const key = col + a;
  let c = HALOS.get(key);
  if (!c) {
    c = Object.assign(document.createElement('canvas'), { width: 128, height: 128 });
    const x = c.getContext('2d'),
      gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, rgba(col, a));
    gr.addColorStop(1, rgba(col, 0));
    x.fillStyle = gr;
    x.fillRect(0, 0, 128, 128);
    HALOS.set(key, c);
  }
  return c;
}
function affordance(f, o, k) {
  if (o.res || o.type === 'pad') return;
  const b = 0.35 + 0.65 * f.mf.beat;
  if (o.type === 'jump') {
    k.plain();
    for (const dy of [0.25, 0.5]) k.poly([[-0.14, o.h + dy], [0.14, o.h + dy], [0, o.h + dy + 0.16]], rgba(k.accent, b * (dy < 0.3 ? 1 : 0.55)));
  } else if (o.type === 'slide') {
    k.plain();
    // (the clear air under it, faintly cold, so the gap reads as a way through)
    k.box(-0.55, -k.lift, 1.1, 0.95 + k.lift, rgba(k.accent, 0.07 + 0.08 * f.mf.beat));
    k.box(-0.6, 1.0, 1.2, 0.05, rgba(k.accent, 0.7 + 0.3 * f.mf.kick));
    for (const dy of [0.12, 0.38]) k.poly([[-0.14, 0.95 - dy], [0.14, 0.95 - dy], [0, 0.79 - dy]], rgba(k.accent, b * (dy < 0.3 ? 1 : 0.55)));
  }
}
// draw obstacle `o` with its base centre at screen (X, Y); sq squashes it (1 = none), u = how much of it is painted
// (on a full-quality frame it is outlined first: its own shapes in black, a little off to each side, no blur and no
// offscreen canvas: an outline at the cost of a few more small shapes)
// (two rings of it: black outside, then the action's colour, so it reads as neon on a dark place and as cut out on a
// bright one; a dark thing on dark ground was lost at speed)
export function drawThing(f, o, X, Y, opt = {}) {
  // (what is in his way must read on any background, at any quality: a halo of its colour behind it, a black ring
  // round it and a ring of its colour inside that, and a wash of its colour over it; at the low quality the rings are
  // drawn from four offsets instead of eight)
  // (each pass is the frame record with its outline colour and ring set on it for the pass and put back after, and one
  // look (k) for them all: a copy of the record and a new look for each of eighteen passes was a frame's garbage)
  const sil = f.sil,
    ring = f.ring,
    wash = f.wash,
    P = { k: null, sky: null };
  try {
    if (!sil) {
      const T = f.T,
        accent = ACCENT(T)[o.type] ?? T.jump,
        dirs = f.glow ? DIRS8 : DIRS4,
        R = { dx: 0, dy: 0, e: 0, first: false };
      // (each ring as wide as a few centimetres of it, never wider than a few pixels: a phone's small metre does not
      // turn a chain into a fat tube)
      for (const [d, cm, col] of [[5, 0.05, '#000000'], [2.5, 0.025, accent]]) {
        const e = Math.max(1, Math.min(d * f.v.dpr, cm * f.v.ppm));
        f.sil = col;
        f.ring = R;
        for (let i = 0; i < dirs.length; i++) {
          R.dx = dirs[i][0] * e;
          R.dy = dirs[i][1] * e;
          R.e = e;
          R.first = i === 0;
          one(f, o, X, Y, opt, P);
        }
      }
      f.sil = sil;
      f.ring = ring;
    }
    one(f, o, X, Y, opt, P);
    // (and a faint wash of its colour over it, lifting a dark look off a dark place; a wall and a hazard keep their own
    // colours, their rings say what they are)
    if (!sil && !UNWASHED.has(o.type)) {
      const ga = f.g.globalAlpha;
      f.g.globalAlpha = ga * (0.12 + 0.1 * f.mf.beat);
      f.sil = ACCENT(f.T)[o.type] ?? f.T.jump;
      f.wash = true;
      one(f, o, X, Y, opt, P);
      f.g.globalAlpha = ga;
    }
  } finally {
    f.sil = sil;
    f.ring = ring;
    f.wash = wash;
  }
}
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7]],
  DIRS4 = DIRS8.slice(0, 4);
const UNWASHED = new Set(['smash', 'dash', 'lane', 'gate']);
// (a see-through fill: an outline pass leaves it open, so glass stays glass)
// (each colour's answer kept: it is asked for every shape of every pass)
const SEE = new Map();
const seeThrough = c => {
  let r = SEE.get(c);
  if (r === undefined) {
    r = typeof c === 'string' && /^rgba\(/.test(c) && +c.slice(c.lastIndexOf(',') + 1, -1) < 0.5;
    if (SEE.size >= 4096) SEE.clear();
    SEE.set(c, r);
  }
  return r;
};
const ACCENT = T => ({ slide: T.slide, long: T.slide, grab: T.hold, zip: T.hold, smash: '#ff4f5c', dash: '#ff4f5c', lane: DANGER, gate: DANGER });
// how high over a thing's base (in its own metres, up) the screen goes: what hangs is drawn up to there, so it never
// ends in the air on a tall or turned screen (at least 9 m; at most 30, out of any sight)
function skyOver(g, m) {
  const inv = g.getTransform().inverse(),
    { width: W, height: H } = g.canvas;
  let up = 9;
  for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]]) up = Math.max(up, -inv.transformPoint({ x, y }).y / m + 0.5);
  return Math.min(30, up);
}
// the helpers a skin draws with (k), for every pass of one thing: S says the pass's outline colour (C: every colour
// that one) and ring (R: every shape moved by its offset (dx, dy px, through the look's scale k.sc); a line thinner
// than the ring is drawn once instead, in place and wider by the ring, or eight copies of it read as |||)
function look(f, o, m, u, S) {
  const { g, mf, T, t } = f,
    accent = ACCENT(T)[o.type] ?? T.jump;
  // (the skins' glow calls: a no-op now; the obstacle's glow is one sprite behind it, below: no blurred shadows)
  const glow = () => {},
    C = c => S.C ?? c,
    ox = () => (S.R ? S.R.dx / k.sc : 0),
    oy = () => (S.R ? S.R.dy / k.sc : 0),
    thin = w => S.R && w * m < S.R.e * 2,
    stroke = w => {
      const R = S.R;
      if (!R || !thin(w)) return ((g.lineWidth = w * m), true);
      if (!R.first) return false;
      g.lineWidth = w * m + (R.e * 2) / k.sc;
      return true;
    };
  const k = {
    sc: o.mini ?? 1,
    T,
    mf,
    place: f.place,
    t,
    // (the song's beats since its first, for what moves steadily with the music: hazards.js)
    beats: f.L ? (t - (f.L.A.beats?.[0] ?? 0)) / f.L.A.beat : t * 2,
    u,
    accent,
    spin: t * 9 + mf.hat * 3,
    glow,
    plain: () => (g.shadowBlur = 0),
    box(x, y, w, h, fill, stroke, lw = 0.03) {
      if (!(S.R && seeThrough(fill))) {
        g.fillStyle = C(fill);
        g.fillRect(x * m + ox(), -(y + h) * m + oy(), w * m, h * m);
      }
      if (stroke) k.frame(x, y, w, h, stroke, lw);
    },
    frame(x, y, w, h, col, lw) {
      const thinned = thin(lw);
      if (!stroke(lw)) return;
      g.strokeStyle = C(col);
      g.strokeRect(x * m + (thinned ? 0 : ox()), -(y + h) * m + (thinned ? 0 : oy()), w * m, h * m);
    },
    round(x, y, w, h, r, fill) {
      if (S.R && seeThrough(fill)) return;
      g.fillStyle = C(fill);
      g.beginPath();
      g.roundRect(x * m + ox(), -(y + h) * m + oy(), w * m, h * m, r * m);
      g.fill();
    },
    line(x0, y0, x1, y1, w, col) {
      // (hung on the truss: its own cables up out of sight are not drawn)
      if (k.trussed && Math.max(y0, y1) >= k.sky - 1e-6) return;
      const dx = thin(w) ? 0 : ox(),
        dy = thin(w) ? 0 : oy();
      if (!stroke(w)) return;
      g.strokeStyle = C(col);
      g.beginPath();
      g.moveTo(x0 * m + dx, -y0 * m + dy);
      g.lineTo(x1 * m + dx, -y1 * m + dy);
      g.stroke();
    },
    disc(x, y, r, fill) {
      if (S.R && seeThrough(fill)) return;
      g.fillStyle = C(fill);
      g.beginPath();
      g.arc(x * m + ox(), -y * m + oy(), r * m, 0, Math.PI * 2);
      g.fill();
    },
    poly(pts, fill) {
      if (S.R && seeThrough(fill)) return;
      g.fillStyle = C(fill);
      g.beginPath();
      const dx = ox(),
        dy = oy();
      for (let i = 0; i < pts.length; i++) {
        const P = pts[i];
        if (i) g.lineTo(P[0] * m + dx, -P[1] * m + dy);
        else g.moveTo(P[0] * m + dx, -P[1] * m + dy);
      }
      g.closePath();
      g.fill();
    },
  };
  return k;
}
// one pass of a thing (f.sil: every colour that one, an outline pass moved by its ring f.ring, or the wash); P: what the
// passes of one thing share (its look k, made on the first; how high the screen goes over it, the same for all)
function one(f, o, X, Y, { sq = 1, u = 1, skin = o.skin } = {}, P = { k: null, sky: null }) {
  const { g, v, mf, T } = f,
    m = v.ppm,
    accent = ACCENT(T)[o.type] ?? T.jump;
  // (the pass's outline colour and ring, read by the look's helpers through S)
  const S = (P.S ??= { C: null, R: null });
  S.C = f.sil ? f.sil : null;
  S.R = f.ring ?? null;
  const k = (P.k ??= look(f, o, m, u, S));
  k.sc = o.mini ?? 1;
  g.save();
  g.translate(X, Y);
  g.scale(2 - sq, sq);
  // (a part played mini: what hangs over him as small as he is, from its base: level.js)
  if (o.mini) g.scale(o.mini, o.mini);
  g.lineCap = 'butt';
  // (a thing to jump is drawn as its look was made, about half a metre tall, and scaled up whole to its height: big
  // things, a big jump)
  if (!f.sil) halo(f, o);
  // its glow of its action's colour, swelling on the kick
  if (!f.sil && o.type !== 'pad') glowDot(g, 0, -(o.type === 'slide' || o.type === 'long' ? 1.2 : (o.h ?? 0.8) / 2) * m, (0.95 + 0.4 * mf.kick) * m, accent, 0.3 + 0.3 * mf.kick);
  // (moving with the music: risen out of the roof, the roof's edge hiding the rest; or hung higher)
  const [rise, drop] = motion(f, o),
    lift = o.type === 'slide' || o.type === 'long' ? 0.3 + drop : 0;
  if (rise < 1) {
    g.beginPath();
    g.rect(-4 * m, -12 * m, 8 * m, 12 * m);
    g.clip();
    g.translate(0, (1 - rise) * (o.h ?? 0.5) * m);
  }
  if (lift) g.translate(0, -lift * m);
  k.lift = lift;
  // (the same for every pass of it: its transform is)
  k.sky = P.sky ??= skyOver(g, m);
  k.trussed = false;
  k.trussed = curtain(f, o, k);
  // (a hazard in a shaft drawn a quarter bigger: it fills his lane)
  const sc = o.type === 'jump' ? o.h / 0.5 : o.type === 'lane' || o.type === 'gate' ? 1.25 : 1;
  if (sc !== 1) g.scale(sc, sc);
  k.sc = sc * (o.mini ?? 1);
  (SKINS[skin] ?? SKINS.crate)(k, o.type === 'jump' ? (P.half ??= { ...o, h: 0.5 }) : o);
  if (sc !== 1) g.scale(1 / sc, 1 / sc);
  if (!f.sil) affordance(f, o, k);
  g.restore();
}
