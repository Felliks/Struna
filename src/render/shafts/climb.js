// A climb's holds (the tic-tac up a shaft's two walls): what his hands and feet push off at each mark, in the place's
// own things, two or three kinds a place (a song takes one by its seed, and its other for every third push). Each is
// fn(g, X, Y, m, side, lit, T, mf): (X, Y) the mark on screen (his feet), m px a metre, side the wall's side (-1 left,
// +1 right: the hold sticks out from it towards the middle), lit 0..1 its beat, T the palette, mf the music.
import { rgba } from '../util.js';

const box = (g, x, y, w, h, fill) => ((g.fillStyle = fill), g.fillRect(x, y, w, h));
// a slab sticking out of the wall at the mark, its top lit on its beat
function ledge(g, X, Y, m, side, lit, body, edge, depth = 0.45, th = 0.14) {
  const x0 = side > 0 ? X - depth * m : X;
  box(g, x0, Y - 0.02 * m, depth * m, th * m, body);
  box(g, x0, Y - 0.05 * m, depth * m, 0.05 * m, rgba(edge, 0.5 + 0.5 * lit));
}

export const HOLDS = {
  // the city: an air conditioner's box on the wall (its fan turning), a window's sill, a fire escape's rung
  ac(g, X, Y, m, side, lit, T, mf) {
    const x0 = side > 0 ? X - 0.55 * m : X;
    box(g, x0, Y - 0.05 * m, 0.55 * m, 0.42 * m, '#59606e');
    g.strokeStyle = rgba('#d9dde3', 0.8);
    g.lineWidth = 0.03 * m;
    const cx = x0 + 0.27 * m,
      cy = Y + 0.16 * m,
      a = mf.hat * 3 + lit * 4;
    g.beginPath();
    for (let i = 0; i < 3; i++) {
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a + (i * 2 * Math.PI) / 3) * 0.13 * m, cy + Math.sin(a + (i * 2 * Math.PI) / 3) * 0.13 * m);
    }
    g.stroke();
    box(g, x0, Y - 0.08 * m, 0.55 * m, 0.05 * m, rgba(T.line, 0.5 + 0.5 * lit));
  },
  sill(g, X, Y, m, side, lit, T) {
    ledge(g, X, Y, m, side, lit, '#3b4048', T.line, 0.4);
    box(g, side > 0 ? X - 0.05 * m : X, Y - 1.4 * m, 0.05 * m, 1.35 * m, rgba(T.win?.[0] ?? '#ffd27a', 0.25 + 0.6 * lit));
  },
  rung(g, X, Y, m, side, lit, T) {
    g.strokeStyle = rgba('#9aa0a8', 0.9);
    g.lineWidth = 0.05 * m;
    const x1 = X - side * 0.4 * m;
    g.beginPath();
    g.moveTo(X, Y + 0.1 * m);
    g.lineTo(x1, Y + 0.1 * m);
    g.lineTo(x1, Y - 0.25 * m);
    g.moveTo(X, Y - 0.25 * m);
    g.lineTo(x1, Y - 0.25 * m);
    g.stroke();
    box(g, Math.min(X, x1), Y - 0.27 * m, 0.4 * m, 0.04 * m, rgba(T.line, 0.4 + 0.6 * lit));
  },
  // synthwave: a neon pad that lights up on its beat, a hologram's panel
  neon(g, X, Y, m, side, lit, T) {
    const x0 = side > 0 ? X - 0.5 * m : X;
    box(g, x0, Y - 0.06 * m, 0.5 * m, 0.12 * m, rgba('#ff3df0', 0.35 + 0.65 * lit));
    box(g, x0, Y + 0.06 * m, 0.5 * m, 0.04 * m, rgba('#29e7ff', 0.6));
  },
  holo(g, X, Y, m, side, lit, T, mf) {
    const x0 = side > 0 ? X - 0.6 * m : X;
    g.strokeStyle = rgba('#29e7ff', 0.5 + 0.5 * lit);
    g.lineWidth = 0.025 * m;
    g.strokeRect(x0, Y - 0.35 * m, 0.6 * m, 0.33 * m);
    for (let k = 0; k < 4; k++) box(g, x0, Y - (0.3 - k * 0.08) * m, 0.6 * m, 0.012 * m, rgba('#29e7ff', 0.25 + 0.3 * mf.hat));
    box(g, x0, Y - 0.04 * m, 0.6 * m, 0.06 * m, rgba('#29e7ff', 0.4 + 0.6 * lit));
  },
  // the forest: a bracket fungus on the trunk, a mossy rock, a knot of vines
  fungus(g, X, Y, m, side, lit) {
    g.fillStyle = '#c99a5a';
    g.beginPath();
    g.ellipse(X, Y, 0.42 * m, 0.14 * m, 0, side > 0 ? Math.PI / 2 : -Math.PI / 2, side > 0 ? (3 * Math.PI) / 2 : Math.PI / 2);
    g.fill();
    g.fillStyle = rgba('#d6ff8a', 0.25 + 0.6 * lit);
    g.beginPath();
    g.ellipse(X, Y - 0.04 * m, 0.38 * m, 0.05 * m, 0, 0, Math.PI * 2);
    g.fill();
  },
  rock(g, X, Y, m, side, lit) {
    g.fillStyle = '#5a5a52';
    g.beginPath();
    g.ellipse(X - side * 0.2 * m, Y + 0.08 * m, 0.3 * m, 0.2 * m, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = rgba('#7ab04a', 0.6 + 0.4 * lit);
    g.beginPath();
    g.ellipse(X - side * 0.2 * m, Y - 0.06 * m, 0.28 * m, 0.08 * m, 0, 0, Math.PI * 2);
    g.fill();
  },
  vines(g, X, Y, m, side, lit) {
    g.strokeStyle = '#4a7a2a';
    g.lineWidth = 0.05 * m;
    g.beginPath();
    for (let k = 0; k < 3; k++) {
      g.moveTo(X, Y - 0.9 * m + k * 0.2 * m);
      g.quadraticCurveTo(X - side * 0.35 * m, Y - 0.2 * m + k * 0.1 * m, X, Y + 0.3 * m);
    }
    g.stroke();
    g.fillStyle = rgba('#b6ff6a', 0.4 + 0.6 * lit);
    g.beginPath();
    g.arc(X - side * 0.25 * m, Y - 0.1 * m, 0.08 * m, 0, Math.PI * 2);
    g.fill();
  },
  // the desert: a slot canyon's step, a temple column's capital
  step(g, X, Y, m, side, lit) {
    ledge(g, X, Y, m, side, lit, '#b07a48', '#ffd27a', 0.5, 0.22);
    box(g, side > 0 ? X - 0.5 * m : X, Y + 0.08 * m, 0.5 * m, 0.04 * m, '#8a5a32');
  },
  capital(g, X, Y, m, side, lit) {
    const x0 = side > 0 ? X - 0.55 * m : X;
    box(g, x0, Y - 0.04 * m, 0.55 * m, 0.16 * m, '#d8c49a');
    box(g, x0 + 0.08 * m, Y + 0.12 * m, 0.39 * m, 0.12 * m, '#b8a47a');
    box(g, x0, Y - 0.07 * m, 0.55 * m, 0.04 * m, rgba('#ffe9a0', 0.4 + 0.6 * lit));
  },
  // the station: a handle, a magnetic pad (its rings pulsing)
  handle(g, X, Y, m, side, lit) {
    g.strokeStyle = rgba('#c9d2e0', 0.9);
    g.lineWidth = 0.06 * m;
    g.beginPath();
    g.moveTo(X, Y - 0.3 * m);
    g.lineTo(X - side * 0.3 * m, Y - 0.3 * m);
    g.lineTo(X - side * 0.3 * m, Y + 0.05 * m);
    g.lineTo(X, Y + 0.05 * m);
    g.stroke();
    box(g, X - (side > 0 ? 0.3 : 0) * m, Y - 0.33 * m, 0.3 * m, 0.04 * m, rgba('#5ad1ff', 0.3 + 0.7 * lit));
  },
  magpad(g, X, Y, m, side, lit, T, mf) {
    const cx = X - side * 0.05 * m;
    g.fillStyle = '#3a4458';
    g.fillRect(cx - (side > 0 ? 0.12 : 0) * m, Y - 0.4 * m, 0.12 * m, 0.55 * m);
    g.strokeStyle = rgba('#5ad1ff', 0.3 + 0.6 * lit);
    g.lineWidth = 0.025 * m;
    for (let k = 1; k <= 2; k++) {
      g.beginPath();
      g.ellipse(cx, Y - 0.12 * m, (0.12 + 0.1 * k + 0.05 * mf.bass) * m, (0.25 + 0.1 * k) * m, 0, 0, Math.PI * 2);
      g.stroke();
    }
  },
  // the factory: a valve's wheel on a pipe, a steel bracket
  valve(g, X, Y, m, side, lit, T, mf) {
    const cx = X - side * 0.25 * m,
      cy = Y - 0.15 * m;
    box(g, side > 0 ? X - 0.25 * m : X, cy - 0.05 * m, 0.25 * m, 0.1 * m, '#6a5048');
    g.strokeStyle = rgba('#c0392b', 0.9);
    g.lineWidth = 0.05 * m;
    g.beginPath();
    g.arc(cx, cy, 0.2 * m, 0, Math.PI * 2);
    const a = mf.kick * 0.6;
    for (let i = 0; i < 4; i++) {
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a + (i * Math.PI) / 2) * 0.2 * m, cy + Math.sin(a + (i * Math.PI) / 2) * 0.2 * m);
    }
    g.stroke();
    g.fillStyle = rgba('#ffb347', 0.3 + 0.7 * lit);
    g.beginPath();
    g.arc(cx, cy, 0.06 * m, 0, Math.PI * 2);
    g.fill();
  },
  bracket(g, X, Y, m, side, lit) {
    ledge(g, X, Y, m, side, lit, '#4a3a30', '#ffb347', 0.45, 0.1);
    g.strokeStyle = '#4a3a30';
    g.lineWidth = 0.05 * m;
    g.beginPath();
    g.moveTo(X, Y + 0.4 * m);
    g.lineTo(X - side * 0.42 * m, Y + 0.05 * m);
    g.stroke();
  },
  // the rave: a speaker stack's corner (its cone pumping), a lighting truss
  speaker(g, X, Y, m, side, lit, T, mf) {
    const x0 = side > 0 ? X - 0.5 * m : X;
    box(g, x0, Y - 0.04 * m, 0.5 * m, 0.5 * m, '#14141c');
    g.fillStyle = '#2a2a38';
    g.beginPath();
    g.arc(x0 + 0.25 * m, Y + 0.22 * m, (0.16 + 0.04 * mf.kick) * m, 0, Math.PI * 2);
    g.fill();
    box(g, x0, Y - 0.07 * m, 0.5 * m, 0.04 * m, rgba('#ffe14a', 0.4 + 0.6 * lit));
  },
  truss(g, X, Y, m, side, lit, T) {
    const x1 = X - side * 0.5 * m;
    g.strokeStyle = '#9aa0a8';
    g.lineWidth = 0.03 * m;
    g.strokeRect(Math.min(X, x1), Y - 0.04 * m, 0.5 * m, 0.16 * m);
    g.beginPath();
    for (let k = 0; k < 4; k++) {
      g.moveTo(Math.min(X, x1) + k * 0.125 * m, Y - 0.04 * m);
      g.lineTo(Math.min(X, x1) + (k + 1) * 0.125 * m, Y + 0.12 * m);
    }
    g.stroke();
    g.fillStyle = rgba(T.line, 0.4 + 0.6 * lit);
    g.beginPath();
    g.arc(x1, Y + 0.18 * m, 0.07 * m, 0, Math.PI * 2);
    g.fill();
  },
  // the volcano: a basalt column's end, an obsidian shard
  basalt(g, X, Y, m, side, lit) {
    const x0 = side > 0 ? X - 0.5 * m : X;
    g.fillStyle = '#2a1814';
    g.beginPath();
    g.moveTo(x0, Y);
    g.lineTo(x0 + 0.5 * m, Y);
    g.lineTo(x0 + 0.42 * m, Y + 0.3 * m);
    g.lineTo(x0 + 0.08 * m, Y + 0.3 * m);
    g.fill();
    box(g, x0, Y - 0.04 * m, 0.5 * m, 0.05 * m, rgba('#ff7a2a', 0.4 + 0.6 * lit));
  },
  obsidian(g, X, Y, m, side, lit) {
    g.fillStyle = '#1a0c14';
    g.beginPath();
    g.moveTo(X, Y - 0.1 * m);
    g.lineTo(X - side * 0.5 * m, Y);
    g.lineTo(X, Y + 0.25 * m);
    g.fill();
    g.strokeStyle = rgba('#ff7a2a', 0.4 + 0.6 * lit);
    g.lineWidth = 0.025 * m;
    g.stroke();
  },
  // the ocean: a shelf of coral, a sunken ship's porthole rim
  coral(g, X, Y, m, side, lit) {
    g.fillStyle = '#ff9ab0';
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.arc(X - side * (0.1 + k * 0.1) * m, Y + (k % 2) * 0.04 * m, (0.1 - k * 0.012) * m, 0, Math.PI * 2);
      g.fill();
    }
    box(g, side > 0 ? X - 0.45 * m : X, Y - 0.06 * m, 0.45 * m, 0.04 * m, rgba('#8af0ff', 0.3 + 0.7 * lit));
  },
  porthole(g, X, Y, m, side, lit) {
    const cx = X - side * 0.22 * m;
    g.strokeStyle = '#8a6a40';
    g.lineWidth = 0.08 * m;
    g.beginPath();
    g.arc(cx, Y - 0.25 * m, 0.24 * m, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = rgba('#8af0ff', 0.2 + 0.6 * lit);
    g.beginPath();
    g.arc(cx, Y - 0.25 * m, 0.17 * m, 0, Math.PI * 2);
    g.fill();
  },
  // the arctic: an ice hold (an axe's notch in it), a fringe of icicles
  ice(g, X, Y, m, side, lit) {
    ledge(g, X, Y, m, side, lit, '#9ad4f0', '#ffffff', 0.4, 0.16);
    g.strokeStyle = 'rgba(255,255,255,0.7)';
    g.lineWidth = 0.02 * m;
    g.beginPath();
    g.moveTo(X - side * 0.1 * m, Y);
    g.lineTo(X - side * 0.2 * m, Y + 0.14 * m);
    g.stroke();
  },
  icicles(g, X, Y, m, side, lit) {
    ledge(g, X, Y, m, side, lit, '#cfe8f8', '#ffffff', 0.45, 0.08);
    g.fillStyle = rgba('#e8fbff', 0.7 + 0.3 * lit);
    for (let k = 0; k < 4; k++) {
      const x = X - side * (0.06 + k * 0.11) * m;
      g.beginPath();
      g.moveTo(x - 0.03 * m, Y + 0.06 * m);
      g.lineTo(x + 0.03 * m, Y + 0.06 * m);
      g.lineTo(x, Y + (0.2 + (k % 2) * 0.12) * m);
      g.fill();
    }
  },
};

// each place's holds, and the trace a push leaves (particles.js 'chalk' by its `trace`)
export const CLIMB = {
  city: { holds: ['ac', 'sill', 'rung'], trace: 'chalk' },
  synth: { holds: ['neon', 'holo'], trace: 'neon' },
  forest: { holds: ['fungus', 'rock', 'vines'], trace: 'leaves' },
  desert: { holds: ['step', 'capital'], trace: 'sand' },
  station: { holds: ['handle', 'magpad'], trace: 'sparks' },
  factory: { holds: ['valve', 'bracket'], trace: 'sparks' },
  rave: { holds: ['speaker', 'truss'], trace: 'neon' },
  volcano: { holds: ['basalt', 'obsidian'], trace: 'embers' },
  ocean: { holds: ['coral', 'porthole'], trace: 'bubbles' },
  arctic: { holds: ['ice', 'icicles'], trace: 'ice' },
  wasteland: { holds: ['bracket', 'step'], trace: 'sand' },
  mall: { holds: ['sill', 'neon'], trace: 'neon' },
  moon: { holds: ['handle', 'magpad'], trace: 'chalk' },
  kowloon: { holds: ['ac', 'rung'], trace: 'sparks' },
  bazaar: { holds: ['sill', 'neon'], trace: 'embers' },
  skies: { holds: ['rock', 'capital'], trace: 'chalk' },
  castle: { holds: ['step', 'capital'], trace: 'chalk' },
  casino: { holds: ['neon', 'holo'], trace: 'neon' },
  arena: { holds: ['truss', 'rung'], trace: 'chalk' },
  graveyard: { holds: ['capital', 'rock'], trace: 'leaves' },
  tokyo: { holds: ['step', 'neon'], trace: 'neon' },
  circuit: { holds: ['magpad', 'bracket'], trace: 'neon' },
  blacksnow: { holds: ['sill', 'bracket'], trace: 'ice' },
  holyrave: { holds: ['speaker', 'neon'], trace: 'neon' },
  apocradio: { holds: ['bracket', 'rung'], trace: 'sparks' },
  anthill: { holds: ['step', 'fungus'], trace: 'sand' },
  fujisan: { holds: ['rock', 'ice'], trace: 'ice' },
  lastman: { holds: ['vines', 'sill'], trace: 'leaves' },
  compost: { holds: ['fungus', 'vines'], trace: 'leaves' },
  crocsky: { holds: ['vines', 'rock'], trace: 'leaves' },
};
// the hold at a climb's push: the song's own kind of its place's, and its next one every third push
export function holdOf(place, seed, k) {
  const H = (CLIMB[place] ?? CLIMB.city).holds,
    first = (seed >>> 3) % H.length;
  return H[(first + (k % 3 === 2 ? 1 : 0)) % H.length];
}

// A climb's dropped things (the cursor drops them from above, one after another, from either side; he leaps up them
// as they fall): one kind a place, each about 1.4 m across and 0.9 m deep, drawn hanging from its top at (X, Y), its top
// face lit (that is where he lands), a glow under it on the kick; `spin` a little tumble as it falls.
const solid = (g, X, Y, m, w, h, body, top, rim) => {
  g.fillStyle = body;
  g.fillRect(X - (w / 2) * m, Y, w * m, h * m);
  g.fillStyle = top;
  g.fillRect(X - (w / 2) * m, Y - 0.04 * m, w * m, 0.1 * m);
  g.strokeStyle = rim;
  g.lineWidth = 0.04 * m;
  g.strokeRect(X - (w / 2) * m, Y, w * m, h * m);
};
export const DROPS = {
  // an air conditioner unit, its fan turning with the hats
  city(g, X, Y, m, lit, T, mf) {
    solid(g, X, Y, m, 1.4, 0.8, '#59606e', rgba(T.line, 0.6 + 0.4 * lit), '#2a2f3a');
    g.strokeStyle = 'rgba(220,225,232,0.8)';
    g.lineWidth = 0.04 * m;
    const cx = X - 0.25 * m,
      cy = Y + 0.4 * m,
      a = mf.hat * 3 + lit * 3;
    g.beginPath();
    g.arc(cx, cy, 0.26 * m, 0, Math.PI * 2);
    for (let i = 0; i < 3; i++) {
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a + (i * 2 * Math.PI) / 3) * 0.24 * m, cy + Math.sin(a + (i * 2 * Math.PI) / 3) * 0.24 * m);
    }
    g.stroke();
    for (let k = 0; k < 4; k++) g.fillRect(X + (0.18 + k * 0.1) * m, Y + 0.18 * m, 0.04 * m, 0.45 * m);
  },
  // a neon cube, its edges flashing on the kick
  synth(g, X, Y, m, lit, T, mf) {
    solid(g, X, Y, m, 1.2, 1.0, '#1a0a30', rgba('#29e7ff', 0.6 + 0.4 * lit), rgba('#ff3df0', 0.6 + 0.4 * mf.kick));
    g.strokeStyle = rgba('#29e7ff', 0.4 + 0.4 * mf.beat);
    g.lineWidth = 0.03 * m;
    g.strokeRect(X - 0.4 * m, Y + 0.2 * m, 0.8 * m, 0.6 * m);
  },
  // a boulder, moss on top
  forest(g, X, Y, m, lit) {
    g.fillStyle = '#5a5a52';
    g.beginPath();
    g.ellipse(X, Y + 0.45 * m, 0.72 * m, 0.5 * m, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = rgba('#7ab04a', 0.7 + 0.3 * lit);
    g.beginPath();
    g.ellipse(X, Y + 0.05 * m, 0.6 * m, 0.12 * m, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 0.03 * m;
    g.beginPath();
    g.moveTo(X - 0.3 * m, Y + 0.3 * m);
    g.lineTo(X + 0.1 * m, Y + 0.6 * m);
    g.stroke();
  },
  // a barrel, hooped
  desert(g, X, Y, m, lit) {
    solid(g, X, Y, m, 1.0, 1.0, '#8a5a32', rgba('#ffd27a', 0.5 + 0.5 * lit), '#5a3a22');
    g.fillStyle = '#3b2a1a';
    for (const k of [0.2, 0.75]) g.fillRect(X - 0.5 * m, Y + k * m, 1.0 * m, 0.07 * m);
  },
  // a cargo container, striped
  station(g, X, Y, m, lit, T, mf) {
    solid(g, X, Y, m, 1.5, 0.85, '#c9d2e0', rgba('#5ad1ff', 0.5 + 0.5 * lit), '#5a6478');
    g.fillStyle = rgba('#5ad1ff', 0.3 + 0.5 * mf.kick);
    for (let k = 0; k < 5; k++) g.fillRect(X - 0.65 * m + k * 0.3 * m, Y + 0.25 * m, 0.12 * m, 0.4 * m);
  },
  // a steel crate, riveted, warning stripes
  factory(g, X, Y, m, lit) {
    solid(g, X, Y, m, 1.3, 0.9, '#6a5048', rgba('#ffb347', 0.5 + 0.5 * lit), '#2a1f1a');
    g.fillStyle = '#ffd34a';
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.moveTo(X - 0.65 * m + k * 0.35 * m, Y + 0.9 * m);
      g.lineTo(X - 0.48 * m + k * 0.35 * m, Y + 0.72 * m);
      g.lineTo(X - 0.38 * m + k * 0.35 * m, Y + 0.72 * m);
      g.lineTo(X - 0.55 * m + k * 0.35 * m, Y + 0.9 * m);
      g.fill();
    }
  },
  // a speaker, its cone pumping on the kick
  rave(g, X, Y, m, lit, T, mf) {
    solid(g, X, Y, m, 1.1, 1.1, '#14141c', rgba('#ffe14a', 0.5 + 0.5 * lit), '#2a2a38');
    g.fillStyle = '#2a2a38';
    g.beginPath();
    g.arc(X, Y + 0.6 * m, (0.32 + 0.06 * mf.kick) * m, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = rgba(T.line, 0.5 + 0.5 * mf.kick);
    g.beginPath();
    g.arc(X, Y + 0.6 * m, 0.1 * m, 0, Math.PI * 2);
    g.fill();
  },
  // a lump of cooling lava, cracks glowing
  volcano(g, X, Y, m, lit, T, mf) {
    g.fillStyle = '#2a1814';
    g.beginPath();
    g.moveTo(X - 0.7 * m, Y);
    g.lineTo(X + 0.7 * m, Y);
    g.lineTo(X + 0.5 * m, Y + 0.9 * m);
    g.lineTo(X - 0.55 * m, Y + 0.8 * m);
    g.fill();
    g.strokeStyle = rgba('#ff7a2a', 0.5 + 0.5 * Math.max(lit, mf.kick));
    g.lineWidth = 0.05 * m;
    g.beginPath();
    g.moveTo(X - 0.4 * m, Y + 0.1 * m);
    g.lineTo(X - 0.1 * m, Y + 0.45 * m);
    g.lineTo(X + 0.3 * m, Y + 0.7 * m);
    g.moveTo(X + 0.2 * m, Y + 0.05 * m);
    g.lineTo(X + 0.05 * m, Y + 0.35 * m);
    g.stroke();
  },
  // a treasure chest, gold glinting
  ocean(g, X, Y, m, lit, T, mf) {
    solid(g, X, Y, m, 1.3, 0.85, '#6a4426', rgba('#ffd84a', 0.4 + 0.4 * lit), '#3a2414');
    g.fillStyle = rgba('#ffd84a', 0.6 + 0.4 * mf.beat);
    g.fillRect(X - 0.1 * m, Y + 0.25 * m, 0.2 * m, 0.25 * m);
    g.fillStyle = '#3a2414';
    for (const k of [-0.45, 0.4]) g.fillRect(X + k * m, Y, 0.08 * m, 0.85 * m);
  },
  // a block of ice, frost on top
  arctic(g, X, Y, m, lit) {
    solid(g, X, Y, m, 1.3, 0.9, 'rgba(154,212,240,0.85)', rgba('#ffffff', 0.7 + 0.3 * lit), '#cfe8f8');
    g.strokeStyle = 'rgba(255,255,255,0.6)';
    g.lineWidth = 0.025 * m;
    g.beginPath();
    g.moveTo(X - 0.4 * m, Y + 0.2 * m);
    g.lineTo(X - 0.15 * m, Y + 0.6 * m);
    g.moveTo(X + 0.3 * m, Y + 0.15 * m);
    g.lineTo(X + 0.4 * m, Y + 0.45 * m);
    g.stroke();
  },
};
// what a dropped thing bursts into: its place's two colours
export const DROP_BITS = {
  city: ['#59606e', '#d9dde3'],
  synth: ['#29e7ff', '#ff3df0'],
  forest: ['#5a5a52', '#7ab04a'],
  desert: ['#8a5a32', '#ffd27a'],
  station: ['#c9d2e0', '#5ad1ff'],
  factory: ['#6a5048', '#ffd34a'],
  rave: ['#14141c', '#ffe14a'],
  volcano: ['#2a1814', '#ff7a2a'],
  ocean: ['#6a4426', '#ffd84a'],
  arctic: ['#9ad4f0', '#ffffff'],
  circuit: ['#0e3a24', '#4aff8a'],
};

// A climb's falling beams and wall slabs (kinds.js beamAt): each place's, drawn standing on end about its middle, len
// tall and w thick (metres, m px a metre), turned by its lean; `lit` its beat (the side he kicks lights up), mf the music
// (three of each place's, by the beam: its look, kinds.js beamLook)
const BEAMS = {
  city: [
    { body: '#6a707c', edge: '#2a2f3a', mark: 'windows', glow: '#ffd27a' },
    { body: '#3b4048', edge: '#1a1d24', mark: 'rivets', glow: '#ff8a3d' },
    { body: '#2a2f3a', edge: '#ff3df0', mark: 'leds', glow: '#29e7ff' },
  ],
  synth: [
    { body: '#1a0a30', edge: '#ff3df0', mark: 'neon', glow: '#29e7ff' },
    { body: '#0a0a20', edge: '#29e7ff', mark: 'leds', glow: '#ff3df0' },
    { body: '#2a0a40', edge: '#ffd84a', mark: 'neon', glow: '#ff3df0' },
  ],
  forest: [
    { body: '#6a4a2a', edge: '#3a2814', mark: 'rings', glow: '#b6ff6a' },
    { body: '#5a5a52', edge: '#2a2a24', mark: 'cracks', glow: '#7ab04a' },
    { body: '#4a3a22', edge: '#2a2014', mark: 'planks', glow: '#b6ff6a' },
  ],
  desert: [
    { body: '#c99a5a', edge: '#8a5a32', mark: 'bricks', glow: '#ffd27a' },
    { body: '#8a5a32', edge: '#5a3a22', mark: 'planks', glow: '#ffd27a' },
    { body: '#d8c49a', edge: '#a08a60', mark: 'rings', glow: '#ffe9a0' },
  ],
  station: [
    { body: '#c9d2e0', edge: '#5a6478', mark: 'rivets', glow: '#5ad1ff' },
    { body: '#3a4458', edge: '#1a2030', mark: 'leds', glow: '#5ad1ff' },
    { body: '#e8ecf2', edge: '#ff8a3d', mark: 'stripes', glow: '#ff8a3d' },
  ],
  factory: [
    { body: '#6a5048', edge: '#2a1f1a', mark: 'stripes', glow: '#ffb347' },
    { body: '#4a3a30', edge: '#1a1410', mark: 'rivets', glow: '#ff8a3d' },
    { body: '#7a6a5a', edge: '#3a3028', mark: 'planks', glow: '#ffb347' },
  ],
  rave: [
    { body: '#14141c', edge: '#2a2a38', mark: 'leds', glow: '#ffe14a' },
    { body: '#1a1a24', edge: '#ff3df0', mark: 'neon', glow: '#ff3df0' },
    { body: '#2a2a38', edge: '#9aa0a8', mark: 'rivets', glow: '#29e7ff' },
  ],
  volcano: [
    { body: '#2a1814', edge: '#1a0c0a', mark: 'cracks', glow: '#ff7a2a' },
    { body: '#1a0c14', edge: '#ff3b2a', mark: 'cracks', glow: '#ffb347' },
    { body: '#3a2420', edge: '#1a0c0a', mark: 'bricks', glow: '#ff7a2a' },
  ],
  ocean: [
    { body: '#6a4426', edge: '#3a2414', mark: 'planks', glow: '#8af0ff' },
    { body: '#2a5a52', edge: '#1a3a34', mark: 'rings', glow: '#ff9ab0' },
    { body: '#8a6a40', edge: '#4a3a20', mark: 'rivets', glow: '#ffd84a' },
  ],
  arctic: [
    { body: 'rgba(154,212,240,0.9)', edge: '#ffffff', mark: 'frost', glow: '#ffffff' },
    { body: 'rgba(207,232,248,0.92)', edge: '#9ad4f0', mark: 'cracks', glow: '#5ad1ff' },
    { body: '#5a7a96', edge: '#e8fbff', mark: 'stripes', glow: '#ffffff' },
  ],
  circuit: [
    { body: '#0e3a24', edge: '#d8b25a', mark: 'leds', glow: '#4aff8a' },
    { body: '#16181e', edge: '#29e7ff', mark: 'rivets', glow: '#29e7ff' },
    { body: '#2a4a8a', edge: '#16181e', mark: 'stripes', glow: '#ffd84a' },
  ],
  tokyo: [
    { body: '#c8282f', edge: '#5a1014', mark: 'planks', glow: '#ffb45a' },
    { body: '#14101a', edge: '#ff4fa0', mark: 'neon', glow: '#ff4fa0' },
    { body: '#6a6a70', edge: '#3a3a40', mark: 'cracks', glow: '#ffb7d0' },
  ],
  graveyard: [
    { body: '#5a5a62', edge: '#2a2a30', mark: 'cracks', glow: '#7dffb0' },
    { body: '#4a2e1c', edge: '#2a1a10', mark: 'planks', glow: '#ff8a2a' },
    { body: '#3a3a44', edge: '#1a1a20', mark: 'bricks', glow: '#ffd27a' },
  ],
  arena: [
    { body: '#3b4048', edge: '#1a1d24', mark: 'rivets', glow: '#f4f8ff' },
    { body: '#14161e', edge: '#29e7ff', mark: 'leds', glow: '#ffd84a' },
    { body: '#e8ecf2', edge: '#e04a2a', mark: 'stripes', glow: '#ff3df0' },
  ],
  casino: [
    { body: '#7a0e22', edge: '#ffd34a', mark: 'leds', glow: '#fff1b8' },
    { body: '#14080e', edge: '#ff3df0', mark: 'neon', glow: '#ff3df0' },
    { body: '#8a6a20', edge: '#3a2a08', mark: 'rivets', glow: '#ffd34a' },
  ],
  castle: [
    { body: '#5a5560', edge: '#2a2630', mark: 'bricks', glow: '#ffb347' },
    { body: '#3a3640', edge: '#1a1820', mark: 'rivets', glow: '#ff7a2a' },
    { body: '#4a3a2a', edge: '#2a2014', mark: 'planks', glow: '#ffb347' },
  ],
  skies: [
    { body: '#d8d0c0', edge: '#8a8270', mark: 'bricks', glow: '#ffe9a0' },
    { body: '#8a6a40', edge: '#4a3a20', mark: 'planks', glow: '#9ad4ff' },
    { body: '#6a6a7a', edge: '#3a3a48', mark: 'cracks', glow: '#7ad0ff' },
  ],
  bazaar: [
    { body: '#a8282a', edge: '#5a1014', mark: 'planks', glow: '#ffcf6a' },
    { body: '#2a1a14', edge: '#ffcf6a', mark: 'neon', glow: '#ff3b4f' },
    { body: '#8a6a52', edge: '#4a3a2a', mark: 'bricks', glow: '#ff9a2a' },
  ],
  kowloon: [
    { body: '#4a3a3a', edge: '#1a1414', mark: 'windows', glow: '#ffd27a' },
    { body: '#2a2430', edge: '#ff4fd8', mark: 'neon', glow: '#29ffd0' },
    { body: '#5a4a40', edge: '#2a1f1a', mark: 'rivets', glow: '#ff8a3d' },
  ],
  moon: [
    { body: '#d8d8dc', edge: '#6a6a70', mark: 'stripes', glow: '#ffb347' },
    { body: '#8a8a90', edge: '#3a3a40', mark: 'cracks', glow: '#9ad4ff' },
    { body: '#c9c4b8', edge: '#5a5a60', mark: 'rivets', glow: '#5ad1ff' },
  ],
  mall: [
    { body: '#ece4ee', edge: '#b8a8c4', mark: 'cracks', glow: '#ff9ad5' },
    { body: '#3a2a5a', edge: '#5ae0d0', mark: 'neon', glow: '#ff9ad5' },
    { body: '#ff9ad5', edge: '#c86aa8', mark: 'windows', glow: '#5ae0d0' },
  ],
  wasteland: [
    { body: '#8a4a2a', edge: '#3a2014', mark: 'rivets', glow: '#ff8a2a' },
    { body: '#7a5038', edge: '#3a2a20', mark: 'stripes', glow: '#ffe08a' },
    { body: '#5a4028', edge: '#2a1a10', mark: 'planks', glow: '#ff8a2a' },
  ],
  blacksnow: [
    { body: '#6a6a6e', edge: '#2a2a2c', mark: 'windows', glow: '#e8e6e0' },
    { body: '#3a3a3e', edge: '#c81e1e', mark: 'stripes', glow: '#c81e1e' },
    { body: '#8a8884', edge: '#3a3a3c', mark: 'rivets', glow: '#f0eee8' },
  ],
  holyrave: [
    { body: '#14101e', edge: '#3dff6a', mark: 'neon', glow: '#3dff6a' },
    { body: '#1a0e24', edge: '#ff2fd0', mark: 'leds', glow: '#ff2fd0' },
    { body: '#3a3c48', edge: '#6a2cff', mark: 'rivets', glow: '#9dff3a' },
  ],
  apocradio: [
    { body: '#5a3a26', edge: '#2a1a10', mark: 'rivets', glow: '#ffb040' },
    { body: '#2a3a3c', edge: '#2fb7b0', mark: 'leds', glow: '#2fb7b0' },
    { body: '#4a3a30', edge: '#d0328c', mark: 'stripes', glow: '#ffb040' },
  ],
  anthill: [
    { body: '#8a4a22', edge: '#3a1a0a', mark: 'planks', glow: '#ffc23a' },
    { body: '#c88a3a', edge: '#5a2a10', mark: 'stripes', glow: '#5ad8ff' },
    { body: '#6a3a1a', edge: '#2a140a', mark: 'rivets', glow: '#ffc23a' },
  ],
  fujisan: [
    { body: '#3a3440', edge: '#14101a', mark: 'rivets', glow: '#ff7aa8' },
    { body: '#e8e4ec', edge: '#8a8aa0', mark: 'stripes', glow: '#ffd27a' },
    { body: '#5a2a2a', edge: '#2a1010', mark: 'planks', glow: '#ff7aa8' },
  ],
  lastman: [
    { body: '#6a6a64', edge: '#2a3a20', mark: 'windows', glow: '#d8ff7a' },
    { body: '#5a4a3a', edge: '#2a3a1a', mark: 'planks', glow: '#ffe8a0' },
    { body: '#4a5a4a', edge: '#1a2a14', mark: 'rivets', glow: '#d8ff7a' },
  ],
  crocsky: [
    { body: '#5a3a1e', edge: '#2a1a0a', mark: 'planks', glow: '#4ae0d0' },
    { body: '#2a5a2a', edge: '#1a2a14', mark: 'stripes', glow: '#ffd23a' },
    { body: '#a08a5a', edge: '#3a2a1a', mark: 'windows', glow: '#ffe080' },
  ],
  compost: [
    { body: '#5a3a1e', edge: '#2a1a0a', mark: 'planks', glow: '#9aff5a' },
    { body: '#3a5a1a', edge: '#1a2a0a', mark: 'stripes', glow: '#ffd84a' },
    { body: '#6a4a2a', edge: '#2a1a10', mark: 'rivets', glow: '#ff9ad0' },
  ],
};
export function drawBeam(g, place, X, Y, rot, m, len, w, lit, mf, side, kind = 0) {
  const B = (BEAMS[place] ?? BEAMS.city)[kind % 3],
    hl = (len / 2) * m,
    hw = (w / 2) * m;
  g.save();
  g.translate(X, Y);
  g.rotate(-rot);
  g.fillStyle = B.body;
  g.fillRect(-hw, -hl, 2 * hw, 2 * hl);
  g.strokeStyle = B.edge;
  g.lineWidth = 0.05 * m;
  g.strokeRect(-hw, -hl, 2 * hw, 2 * hl);
  const glow = a => rgba(B.glow, a);
  if (B.mark === 'windows')
    for (let y = -hl + 0.25 * m; y < hl - 0.2 * m; y += 0.45 * m) {
      g.fillStyle = glow(0.25 + 0.6 * (Math.sin(y * 3.1) > 0 ? mf.kick : 0.2));
      g.fillRect(-hw * 0.55, y, hw * 1.1, 0.22 * m);
    }
  else if (B.mark === 'neon') {
    g.fillStyle = glow(0.5 + 0.5 * mf.kick);
    g.fillRect(-hw * 0.2, -hl * 0.9, hw * 0.4, hl * 1.8);
  } else if (B.mark === 'rings') {
    g.strokeStyle = 'rgba(0,0,0,0.3)';
    g.lineWidth = 0.025 * m;
    for (let y = -hl + 0.4 * m; y < hl; y += 0.55 * m) {
      g.beginPath();
      g.moveTo(-hw, y);
      g.quadraticCurveTo(0, y + 0.1 * m, hw, y);
      g.stroke();
    }
    g.fillStyle = glow(0.5);
    g.fillRect(-hw, -hl, 2 * hw, 0.12 * m);
  } else if (B.mark === 'bricks') {
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.lineWidth = 0.02 * m;
    for (let y = -hl; y < hl; y += 0.25 * m) {
      g.beginPath();
      g.moveTo(-hw, y);
      g.lineTo(hw, y);
      g.stroke();
    }
  } else if (B.mark === 'rivets') {
    g.fillStyle = glow(0.4 + 0.6 * mf.kick);
    for (let y = -hl + 0.3 * m; y < hl; y += 0.5 * m) g.fillRect(-hw * 0.15, y, hw * 0.3, 0.1 * m);
  } else if (B.mark === 'stripes') {
    g.fillStyle = '#ffd34a';
    for (let y = -hl; y < -hl + 0.6 * m; y += 0.2 * m) g.fillRect(-hw, y, 2 * hw, 0.1 * m);
    for (let y = hl - 0.6 * m; y < hl; y += 0.2 * m) g.fillRect(-hw, y, 2 * hw, 0.1 * m);
  } else if (B.mark === 'leds')
    for (let y = -hl + 0.2 * m; y < hl; y += 0.3 * m) {
      g.fillStyle = glow(0.2 + 0.8 * (((y / m) * 3 + mf.beat * 4) % 1 > 0.5 ? mf.kick : 0.1));
      g.fillRect(-hw * 0.6, y, hw * 1.2, 0.12 * m);
    }
  else if (B.mark === 'cracks') {
    g.strokeStyle = glow(0.5 + 0.5 * Math.max(lit, mf.kick));
    g.lineWidth = 0.04 * m;
    g.beginPath();
    g.moveTo(-hw * 0.4, -hl * 0.8);
    g.lineTo(hw * 0.3, -hl * 0.2);
    g.lineTo(-hw * 0.2, hl * 0.4);
    g.lineTo(hw * 0.3, hl * 0.85);
    g.stroke();
  } else if (B.mark === 'planks') {
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 0.025 * m;
    g.beginPath();
    g.moveTo(0, -hl);
    g.lineTo(0, hl);
    g.stroke();
  } else if (B.mark === 'frost') {
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(-hw, -hl, hw * 0.5, 2 * hl);
  }
  // (the side he kicks: lit gold on its beat)
  g.fillStyle = rgba('#ffd84a', 0.25 + 0.75 * lit);
  g.fillRect(side > 0 ? -hw - 0.04 * m : hw - 0.04 * m, -hl * 0.3, 0.08 * m, hl * 0.9);
  g.restore();
}
