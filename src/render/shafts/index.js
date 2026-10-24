// What a shaft and a flight look like in each place (the obstacles' layer and the roofs' call these): the world he
// falls or flies past (walls.js), the gates and the storms in his way (storms.js), the plate or lid he lands through on
// a drop (lids.js), the rings and the things flying by in a flight (flight.js). Each place has its own of each, and a
// song picks one of its place's variants by its seed, so two songs in one place still differ.
// What reads stays the same everywhere: what hurts is red and sharp, the way through is gold, the key's colour is the
// key's (Celeste's spikes and crystal, Just Shapes & Beats' pink). What changes is the material, the shape, the motion.
// Each sound moves its own part: the kick strikes and flashes, the snare slams, the hats crackle, the bass sways, the
// voice glows.
import { hash, rgba } from '../util.js';
import { WALLS } from './walls.js';
import { GATES, ZONES } from './storms.js';
import { LIDS, impact, prepLid } from './lids.js';
import { FLYBYS, RINGS } from './flight.js';

export const SHAFT = {
  city: { walls: ['facade', 'glass', 'billboards'], gate: 'laser', zone: 'wires', lid: 'skylight', plate: 'tiles', ring: 'neon', fly: 'drones' },
  synth: { walls: ['grid', 'tunnel', 'prisms'], gate: 'laser', zone: 'glitch', lid: 'neonpane', plate: 'neonpane', ring: 'neon', fly: 'shapes' },
  forest: { walls: ['cliff', 'waterfall', 'trunk'], gate: 'web', zone: 'swarm', lid: 'branches', plate: 'branches', ring: 'fireflies', fly: 'birds' },
  desert: { walls: ['canyon', 'ruins', 'dunes'], gate: 'bones', zone: 'sand', lid: 'planks', plate: 'planks', ring: 'sun', fly: 'vultures' },
  station: { walls: ['reactor', 'hull', 'window'], gate: 'doors', zone: 'radiation', lid: 'airlock', plate: 'airlock', ring: 'holo', fly: 'debris' },
  factory: { walls: ['elevator', 'furnace', 'pipes'], gate: 'doors', zone: 'steam', lid: 'grate', plate: 'grate', ring: 'gear', fly: 'sparks' },
  rave: { walls: ['speakers', 'lasers', 'crowd'], gate: 'laser', zone: 'strobe', lid: 'grille', plate: 'grille', ring: 'laser', fly: 'confetti' },
  volcano: { walls: ['lavafall', 'basalt', 'skulls'], gate: 'lava', zone: 'fire', lid: 'crust', plate: 'crust', ring: 'ember', fly: 'bats' },
  ocean: { walls: ['reef', 'kelp', 'wreck'], gate: 'net', zone: 'whirl', lid: 'shell', plate: 'shell', ring: 'bubble', fly: 'fish' },
  arctic: { walls: ['crevasse', 'icefall', 'aurora'], gate: 'ice', zone: 'blizzard', lid: 'ice', plate: 'ice', ring: 'aurora', fly: 'snowbirds' },
  circuit: { walls: ['grid', 'reactor', 'tunnel'], gate: 'laser', zone: 'glitch', lid: 'grate', plate: 'neonpane', ring: 'holo', fly: 'shapes' },
  tokyo: { walls: ['billboards', 'facade', 'glass'], gate: 'laser', zone: 'wires', lid: 'planks', plate: 'tiles', ring: 'neon', fly: 'confetti' },
  graveyard: { walls: ['cliff', 'ruins', 'skulls'], gate: 'bones', zone: 'swarm', lid: 'planks', plate: 'planks', ring: 'ember', fly: 'bats' },
  arena: { walls: ['crowd', 'speakers', 'billboards'], gate: 'laser', zone: 'strobe', lid: 'grille', plate: 'tiles', ring: 'neon', fly: 'confetti' },
  casino: { walls: ['billboards', 'lasers', 'glass'], gate: 'laser', zone: 'strobe', lid: 'neonpane', plate: 'tiles', ring: 'neon', fly: 'confetti' },
  castle: { walls: ['ruins', 'cliff', 'skulls'], gate: 'doors', zone: 'swarm', lid: 'tiles', plate: 'tiles', ring: 'ember', fly: 'bats' },
  skies: { walls: ['waterfall', 'cliff', 'ruins'], gate: 'net', zone: 'whirl', lid: 'planks', plate: 'tiles', ring: 'sun', fly: 'birds' },
  bazaar: { walls: ['billboards', 'facade', 'crowd'], gate: 'doors', zone: 'steam', lid: 'tiles', plate: 'planks', ring: 'ember', fly: 'confetti' },
  kowloon: { walls: ['facade', 'billboards', 'pipes'], gate: 'laser', zone: 'wires', lid: 'grate', plate: 'tiles', ring: 'neon', fly: 'drones' },
  moon: { walls: ['hull', 'window', 'reactor'], gate: 'doors', zone: 'radiation', lid: 'airlock', plate: 'airlock', ring: 'holo', fly: 'debris' },
  mall: { walls: ['glass', 'billboards', 'tunnel'], gate: 'laser', zone: 'glitch', lid: 'skylight', plate: 'tiles', ring: 'neon', fly: 'shapes' },
  wasteland: { walls: ['ruins', 'canyon', 'pipes'], gate: 'bones', zone: 'sand', lid: 'planks', plate: 'grate', ring: 'ember', fly: 'vultures' },
  blacksnow: { walls: ['crevasse', 'icefall', 'aurora'], gate: 'doors', zone: 'blizzard', lid: 'ice', plate: 'tiles', ring: 'ember', fly: 'snowbirds' },
  holyrave: { walls: ['cliff', 'lasers', 'prisms'], gate: 'laser', zone: 'strobe', lid: 'tiles', plate: 'tiles', ring: 'laser', fly: 'confetti' },
  apocradio: { walls: ['grid', 'tunnel', 'prisms'], gate: 'doors', zone: 'wires', lid: 'grate', plate: 'grate', ring: 'ember', fly: 'sparks' },
  anthill: { walls: ['canyon', 'trunk', 'ruins'], gate: 'web', zone: 'swarm', lid: 'branches', plate: 'planks', ring: 'sun', fly: 'birds' },
  fujisan: { walls: ['cliff', 'waterfall', 'icefall'], gate: 'net', zone: 'whirl', lid: 'ice', plate: 'tiles', ring: 'sun', fly: 'birds' },
  lastman: { walls: ['cliff', 'waterfall', 'trunk'], gate: 'net', zone: 'whirl', lid: 'planks', plate: 'planks', ring: 'sun', fly: 'birds' },
  crocsky: { walls: ['trunk', 'waterfall', 'kelp'], gate: 'web', zone: 'swarm', lid: 'branches', plate: 'branches', ring: 'fireflies', fly: 'birds' },
  compost: { walls: ['trunk', 'canyon', 'kelp'], gate: 'web', zone: 'swarm', lid: 'branches', plate: 'branches', ring: 'ember', fly: 'confetti' },
};
const of = f => SHAFT[f.place] ?? SHAFT.city;
// (each look drawn in a state of its own: a composite mode, a clip or an alpha it leaves set never reaches the rest)
// (and a look that throws is left out of the frame, once reported: scenery never stops the game)
let reported = false;
const isolated = (f, draw) => {
  const a = f.g.globalAlpha;
  f.g.save();
  try {
    draw();
  } catch (e) {
    if (!reported) console.error('shaft look:', e);
    reported = true;
  }
  f.g.restore();
  f.g.globalAlpha = a;
};

// the shaft's ordinal among the song's shafts (0 the first), and how deep it goes: a later shaft is further down (or up)
export function shaftIndex(L, s) {
  return L.segs.filter(q => L.vertical(q) && q.t0 <= s.t0).length - 1;
}
// a shaft's look: which of its place's walls (by the song's seed and the shaft: the same song, the same shafts), how deep
export function shaftLook(f, s) {
  const P = SHAFT[s.place] ?? of(f),
    i = shaftIndex(f.L, s),
    seed = f.L.A.seed ?? 1;
  return { wall: P.walls[Math.floor(hash(seed % 100000, 31 + i) * P.walls.length)], variant: hash(seed % 100000, 57 + i), depth: i, place: s.place };
}

// how a shaft is built: a chute hung from the level above (its top flush with that roof), its two walls IN to OUT m out
// either side, ending GAP m over the roof below so the run under it goes on, its ends lit; it is there in the world
// before he reaches it and after he has left it, not only while he is in it
export const CHUTE = { IN: 2.6, OUT: 7.4, GAP: 4.6 };
export function chuteSpan(s) {
  return { lo: Math.min(s.y0, s.y1) + CHUTE.GAP, hi: Math.max(s.y0, s.y1) };
}
// the world round a shaft (drawn behind its air), inside its chute's two walls
export function drawWalls(f, s, speed) {
  // (a climb's walls closer in, so a push across them is a jump, not a flight: run.js climbs at WALL from the middle)
  // (a climb's walls stand on the roof below: he runs at the one in front and up it; the one behind him has a way in
  // through its foot, as a shaft's chute has under it)
  const { g, v, T, mf, L } = f,
    { lo: hung, hi } = chuteSpan(s),
    into = L.segs[L.segs.indexOf(s) - 1]?.dir ?? 1,
    loOf = d => (s.climb && d === into ? Math.min(s.y0, s.y1) : hung),
    lo = Math.min(loOf(-1), loOf(1)),
    inset = s.climb ? Math.max(0, CHUTE.IN - (s.wall ?? 1.6) - 0.3) : 0,
    IN = CHUTE.IN - inset,
    OUT = CHUTE.OUT - inset;
  if (hi <= lo || s.x + OUT < v.x || s.x - OUT > v.x + v.vw || hi < v.y || lo > v.y + v.vh) return;
  const look = shaftLook(f, s),
    Y0 = v.sy(hi);
  isolated(f, () => {
    g.beginPath();
    for (const d of [-1, 1]) {
      const a = v.sx(s.x + d * IN),
        b = v.sx(s.x + d * OUT);
      g.rect(Math.min(a, b), Y0, Math.abs(b - a), v.sy(loOf(d)) - Y0);
    }
    g.clip();
    WALLS[look.wall]?.(f, s, { ...look, speed, inset });
  });
  // (its ends lit: the inner edges, the outer edges, and the bottom ends over the roof below)
  g.save();
  g.fillStyle = rgba(T.line, 0.45 + 0.4 * mf.kick);
  for (const d of [-1, 1])
    for (const x of [IN, OUT]) {
      const X = v.sx(s.x + d * x);
      g.fillRect(X - 1.5 * v.dpr, Y0, 3 * v.dpr, v.sy(loOf(d)) - Y0);
    }
  for (const d of [-1, 1]) {
    // (a wall standing on the roof needs no end lit over it)
    if (loOf(d) <= Math.min(s.y0, s.y1) + 0.01) continue;
    const a = v.sx(s.x + d * IN),
      b = v.sx(s.x + d * OUT),
      Yb = v.sy(loOf(d));
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(Math.min(a, b), Yb - 0.35 * v.ppm, Math.abs(b - a), 0.35 * v.ppm);
    g.fillStyle = rgba(T.line, 0.7 + 0.3 * mf.kick);
    g.fillRect(Math.min(a, b), Yb - 0.06 * v.ppm, Math.abs(b - a), 0.06 * v.ppm);
  }
  g.restore();
}
// a gate's wall across the lanes it closes (spans: [x0, x1] in metres each), at screen height Y
export function drawGate(f, o, spans, Y) {
  isolated(f, () => GATES[of(f).gate]?.(f, o, spans, Y));
}
// a storm's look inside its stretch of shaft (box: X0, X1, Y0, Y1 on screen; lo, hi in metres; rr: a frame's random)
export function drawZone(f, o, box, rr) {
  (ZONES[of(f).zone] ?? ZONES.wires)(f, o, box, rr);
}
// the spot he slams down into (up false) or the lid he bursts up through (up true), at its base (X, Y) on screen
export function drawLid(f, o, X, Y, up) {
  const P = of(f);
  // (landing from above, a target to slam into and the crater it leaves; from below, the place's lid to burst through)
  isolated(f, () => (up ? LIDS[P.lid]?.(f, o, X, Y, up) : impact(f, o, X, Y)));
}
// a lid's pieces cut before it is burst (f: a frame at its moment, in its place), lids.js prepLid
export function prepHatch(f, o) {
  prepLid(f, o, 0, 0, of(f).lid);
}
// a flight's ring at (X, Y) of radius r (passed: 0..1 burst as he goes through; hit: he missed it)
export function drawRing(f, o, X, Y, r, passed, hit) {
  isolated(f, () => (RINGS[of(f).ring] ?? RINGS.neon)(f, o, X, Y, r, passed, hit));
}
// the things flying by in a flight (w: the flight)
export function drawFlyby(f, w) {
  isolated(f, () => FLYBYS[of(f).fly]?.(f, w));
}
