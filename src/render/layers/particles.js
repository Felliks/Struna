// Particles (a view-only effect: the run never reads them): blood on a hit, the grade over him, landing dust, the dust
// of each slam. Spawned from the run's events and the cursor's slams, then simulated per frame, on stage (stage.js:
// `stage(t, x)` says where a stretch's distance x at time t is, and which way that stretch runs).
import { CLIMB, DROP_BITS } from '../shafts/climb.js';
import { mulberry } from '../../rng.js';
import { MATERIAL } from '../../places.js';
import { upright } from '../util.js';
import { tr } from '../../i18n.js';
import { icon } from '../icons.js';
import { WORLD_G } from '../physics.js';

// how fast each kind of thing thrown loses its speed to the air (1/s): dust and chalk at once, sparks and blood soon,
// chunks and shards hardly at all (the pixels rushing in to make him again keep theirs: they must arrive)
const DRAG = { land: 4, touch: 4, chalk: 3, crumble: 0.3, blast: 0.5, smash: 0.5, shatter: 0.6, drop: 0.5, finisher: 0.5, bossdmg: 0.6, bossdown: 0.6, delete: 0.8, pieces: 1, ko: 1.4, prop: 1.4, hit: 1.5, dead: 1.5, overdrive: 1.2, chain: 1.5, through: 2, secret: 1.5, undo: 1.5, route: 1.5, starphrase: 1.5, grade: 2, tick: 2, style: 2, link: 2, tripped: 2, respawn: 0, slide: 1.5, slam: 4, win: 2.5 };
// how much of its fall a thing keeps bouncing off the roof (the rest is lost in the knock)
const BOUNCE = { shard: 0.3, dust: 0.15 };

// the words over him, each drawn once into its own small canvas (its outline and fill) and then only stamped: a font
// set and a text stroked anew each frame is slow, and the first time a glyph the font lacks (the arrows) is drawn the
// browser searches the system's fonts for it, a long stall on the frame of a blow
const WORDS = new Map(),
  FONT = px => `900 ${px}px Unbounded, 'Arial Black', sans-serif`;
// (the words come in English and are drawn in the player's language)
function word(en, col, px) {
  const text = tr(en);
  const key = `${text}|${col}|${px}`;
  let c = WORDS.get(key);
  if (c) return c;
  const x = document.createElement('canvas').getContext('2d'),
    lw = Math.max(2, Math.round(px * 0.24));
  x.font = FONT(px);
  const w = Math.ceil(x.measureText(text).width + lw * 2 + 4),
    h = Math.ceil(px * 1.5 + lw * 2);
  Object.assign(x.canvas, { width: w, height: h });
  x.font = FONT(px);
  x.textAlign = 'center';
  x.lineJoin = 'round';
  x.strokeStyle = '#000';
  x.lineWidth = lw;
  x.fillStyle = col;
  x.strokeText(text, w / 2, px * 1.1 + lw);
  x.fillText(text, w / 2, px * 1.1 + lw);
  c = { c: x.canvas, ax: w / 2, ay: px * 1.1 + lw };
  if (WORDS.size > 120) WORDS.delete(WORDS.keys().next().value);
  WORDS.set(key, c);
  return c;
}

export class Particles {
  constructor() {
    this.list = [];
    this.stage = (t, x) => ({ x, dir: 1 });
  }
  clear() {
    this.list = [];
  }
  // the words it may show drawn before the run (the font's and the arrows' glyphs found then, not on a blow)
  warm(T) {
    this.warmPx = null;
    this.warmT = T;
  }
  // (in the colours they come in, at the size of the screen's full resolution: drawn scaled, so a step of the dynamic
  // resolution or the camera pulled back up a climb never makes them anew)
  warmUp(px) {
    for (const t of ['OVERDRIVE', 'BOSS DELETED', '×2', 'WORLD DELETED. NOT YOU.', 'ASCENDED', 'MORNING', 'SECRET: THE SOURCE', 'SECRET: THE GIANT', 'SECRET: AN ALLY', 'SECRET: THE SKY FALLS', 'SECOND WIND']) word(t, '#ffd84a', px);
    for (let n = 2; n <= 9; n++) word(`×${n}`, '#ff4fd8', px);
    word('×', '#ff3b5c', px);
    this.warmPx = px;
  }
  // (each one thrown keeps the air it is in (DRAG by what threw it) and the roof it was thrown over, if it was thrown
  // from on or above it: it falls to that roof and comes to rest there)
  burst(seed, n, make) {
    const r = mulberry(Math.round(seed * 1000)),
      drag = DRAG[this.kind] ?? 1,
      floor = this.floor;
    for (let i = 0; i < n; i++) {
      const p = make(r);
      p.drag ??= drag;
      if (floor !== undefined && floor !== null && p.y >= floor - 0.02) p.floor = floor;
      this.list.push(p);
    }
  }
  // one of the run's events; returns the camera trauma it is worth
  event(ev, T) {
    if (ev.x === undefined) return 0;
    const st = this.stage(ev.t, ev.x),
      e = { ...ev, x: st.x },
      fwd = st.dir,
      // (his run's speed on stage then (none in a shaft): what his blow, his bat, his kick or his back throws off goes on
      // with it, as a clone's sparks do (clones.js); without it a fast song's sparks off a forward kick drift back)
      base = st.y0 === null || st.y0 === undefined || !this.L?.vAt ? 0 : fwd * this.L.vAt(Math.max(0, ev.t));
    this.kind = e.k;
    // (a landing's or a touch's own ground: an island he lands on is not the stretch's roof)
    this.floor = st.y0 === null || st.y0 === undefined ? null : e.k === 'land' || e.k === 'touch' ? e.y : st.y0;
    if (e.k === 'pieces') {
      // he comes apart: shards of his outline and of his red, flung out then drifting up, and a few pixels of him
      this.burst(e.t, 60, r => ({ x: e.x + (r() - 0.5) * 0.8, y: e.y + (r() - 0.5) * 1.6, vx: (r() - 0.5) * 6, vy: 1 + r() * 4, life: 1.8 + r(), col: ['#ffe08a', '#ff3b52', '#0b0b10', '#ffffff'][Math.floor(r() * 4)], r: 0.04 + r() * 0.08, gr: -0.6, shard: true }));
      return 1;
    }
    if (e.k === 'hit' || e.k === 'dead') {
      // (a miss: a red cross over him)
      if (e.k === 'hit') this.list.push({ icon: 'cross', x: e.x, y: e.y + 2.2, vx: 0, vy: 1, life: 0.6, col: '#ff2b3a', gr: 0, size: 0.45 });
      this.burst(e.t, 18, r => ({ x: e.x, y: e.y, vx: (r() - 0.5) * 7, vy: r() * 6, life: 0.9, col: '#d0001c', r: 0.04 + r() * 0.05, gr: 1 }));
      return e.k === 'dead' ? 0.8 : 0.5;
    }
    if (e.k === 'grade') {
      // the grade as a mark over him: a gold star, a blue diamond, a white dot; early or late a wedge beside it
      const col = e.g === 'perfect' ? '#ffe14d' : e.g === 'great' ? T.slide : '#fff';
      this.list.push({ icon: { perfect: 'star', great: 'diamond', good: 'dot' }[e.g] ?? 'dot', x: e.x, y: e.y, vx: 0, vy: 1.5, life: 0.6, col, gr: 0, size: e.g === 'perfect' ? 0.5 : 0.4 });
      if (e.side) this.list.push({ icon: e.side, x: e.x + (e.side === 'early' ? -0.42 : 0.42) * fwd, y: e.y, vx: 0, vy: 1.5, life: 0.6, col: e.side === 'early' ? '#7fd4ff' : '#ff9f6b', gr: 0, size: 0.24, turn: fwd < 0 });
      if (e.g === 'perfect') this.burst(e.t, 8, r => ({ x: e.x, y: e.y - 1.2, vx: (r() - 0.5) * 6, vy: (r() - 0.2) * 5, life: 0.4, col, r: 0.03, gr: 0.3 }));
      return 0;
    }
    if (e.k === 'smash') {
      // the pane (or the planks) in pieces, flying on the way he kicked
      const col = { wood: '#a06a3c', stone: '#b5603e', metal: '#9a9aa0' }[MATERIAL[e.skin]] ?? 'rgba(190,240,255,0.9)';
      this.burst(e.t, 34, r => ({ x: e.x + fwd * (r() - 0.3) * 0.3, y: e.y + 0.2 + r() * 2.1, vx: base + fwd * (2 + r() * 7), vy: (r() - 0.3) * 5, life: 0.9, col, r: 0.025 + r() * 0.05, gr: 1, shard: true }));
      return 0.55;
    }
    if (e.k === 'finisher') {
      // the cursor smashed: its pieces (white with a black edge), the simulation's red and cyan pixels, a ring of light
      this.burst(e.t, 40, r => ({ x: e.x, y: e.y, vx: base + fwd * (1 + r() * 9) * (r() < 0.25 ? -0.5 : 1), vy: (r() - 0.35) * 9, life: 1.4, col: r() < 0.6 ? '#ffffff' : '#000000', r: 0.04 + r() * 0.08, gr: 0.8, shard: true }));
      this.burst(e.t + 1, 60, r => ({ x: e.x, y: e.y, vx: base + (r() - 0.5) * 14, vy: (r() - 0.5) * 14, life: 0.9, col: r() < 0.5 ? '#ff2b3a' : '#29e7ff', r: 0.03 + r() * 0.03, gr: 0.2 }));
      this.list.push({ ring: true, x: e.x, y: e.y, vx: 0, vy: 0, life: 0.8, col: '#ffffff', r: 0, gr: 0 });
      return 1;
    }
    if (e.k === 'respawn') {
      // put back: pixels of the simulation rushing in to make him
      this.burst(e.t, 40, r => {
        const a = r() * Math.PI * 2,
          d = 1 + r() * 1.5;
        return { x: e.x + Math.cos(a) * d, y: e.y + 1 + Math.sin(a) * d, vx: -Math.cos(a) * d * 3, vy: -Math.sin(a) * d * 3, life: 0.32, col: r() < 0.5 ? '#ff2b3a' : '#29e7ff', r: 0.035, gr: 0 };
      });
      return 0.4;
    }
    if (e.k === 'through') {
      // through a gate: a burst of gold
      this.burst(e.t, 26, r => ({ x: e.x, y: e.y, vx: (r() - 0.5) * 8, vy: (r() - 0.5) * 8, life: 0.6, col: r() < 0.7 ? '#ffd84a' : '#ffffff', r: 0.03 + r() * 0.04, gr: 0 }));
      return 0.25;
    }
    if (e.k === 'chain') {
      // a combination: a chain and how many times it pays, a ring and a fountain of the action colours
      this.list.push({ icon: 'chain', x: e.x + fwd * 2 - 0.35, y: e.y + 0.9, vx: 0, vy: 1.1, life: 1.0, col: '#ff4fd8', gr: 0, size: 0.55 });
      this.list.push({ text: `×${e.n}`, x: e.x + fwd * 2 + 0.4, y: e.y + 0.75, vx: 0, vy: 1.1, life: 1.0, col: '#ff4fd8', gr: 0 });
      this.list.push({ ring: true, x: e.x, y: e.y, vx: 0, vy: 0, life: 0.7, col: '#ff4fd8', r: 0, gr: 0 });
      this.burst(e.t, 50, r => ({ x: e.x, y: e.y, vx: (r() - 0.5) * 8, vy: 3 + r() * 7, life: 1.0, col: [T.jump, T.slide, T.hold, '#ff4f5c'][Math.floor(r() * 4)], r: 0.035 + r() * 0.04, gr: 0.9 }));
      return 0.45;
    }
    if (e.k === 'ko') {
      // a blow landing on a clone: its sparks off the contact are the clone's own (clones.js KOs, carried on with his
      // run's speed, as its hit-stop is); a fist or a piece of the cursor, standing where it was struck, here, carried on with his run's speed too
      const y = e.y + 1.15;
      if (e.o?.skin === 'fist' || e.o?.skin === 'bit') this.burst(e.t, 16, r => ({ x: e.x, y: y + (r() - 0.5) * 0.4, vx: base + (e.back ? -fwd : fwd) * (2 + r() * 8) * (r() < 0.2 ? -0.4 : 1), vy: (r() - 0.4) * 7, life: 0.35 + 0.2 * r(), col: r() < 0.7 ? '#ffffff' : T.line, r: 0.02 + r() * 0.03, gr: 0.5 }));
      return 0.35;
    }
    if (e.k === 'delete' || e.k === 'ascend' || e.k === 'dawn') {
      // the other endings' moment: the world blown to pixels round him, a fountain of light, or the first sun
      const cols = { delete: ['#ffffff', '#000000', '#ff2b3a', '#29e7ff'], ascend: ['#ffffff', '#ffd84a', T.line], dawn: ['#ffd84a', '#ffb347', '#ffffff'] }[e.k];
      this.burst(e.t, e.k === 'delete' ? 160 : 70, r => ({ x: e.x + (r() - 0.5) * (e.k === 'delete' ? 14 : 2), y: e.y + (r() - 0.6) * (e.k === 'delete' ? 6 : 2), vx: (r() - 0.5) * 6, vy: e.k === 'delete' ? (r() - 0.3) * 6 : 3 + r() * 8, life: 1.4, col: cols[Math.floor(r() * cols.length)], r: 0.04 + r() * 0.08, gr: e.k === 'delete' ? 0.2 : -0.1, shard: e.k === 'delete' }));
      this.list.push({ text: { delete: 'WORLD DELETED. NOT YOU.', ascend: 'ASCENDED', dawn: 'MORNING' }[e.k], x: e.x, y: e.y + 2, vx: 0, vy: 0.6, life: 2.2, col: '#ffd84a', gr: 0 });
      return e.k === 'delete' ? 1 : 0.4;
    }
    if (e.k === 'shield') {
      this.list.push({ ring: true, x: e.x, y: e.y, vx: 0, vy: 0, life: 0.6, col: '#5ee7ff', r: 0, gr: 0 });
      this.list.push({ icon: 'shield', x: e.x, y: e.y + 0.8, vx: 0, vy: 1, life: 0.6, col: '#5ee7ff', gr: 0, size: 0.45 });
      return 0.3;
    }
    if (e.k === 'secret') {
      // a secret found: its name in gold over him and a ring of the simulation's colours
      this.list.push({ text: { source: 'SECRET: THE SOURCE', giant: 'SECRET: THE GIANT', ally: 'SECRET: AN ALLY', meteor: 'SECRET: THE SKY FALLS', wind: 'SECOND WIND' }[e.kind], x: e.x, y: e.y + 0.6, vx: 0, vy: 0.7, life: 2, col: '#ffd84a', gr: 0 });
      this.list.push({ ring: true, x: e.x, y: e.y, vx: 0, vy: 0, life: 0.8, col: e.kind === 'source' ? '#3dff7a' : '#ffd84a', r: 0, gr: 0 });
      this.burst(e.t, 40, r => ({ x: e.x, y: e.y, vx: (r() - 0.5) * 10, vy: (r() - 0.3) * 9, life: 1, col: r() < 0.5 ? '#ffd84a' : '#3dff7a', r: 0.04, gr: 0.4, shard: true }));
      return 0.5;
    }
    if (e.k === 'undo') {
      // the cursor's undo: the simulation's pixels torn off him, its mark over him
      this.burst(e.t, 50, r => ({ x: e.x + (r() - 0.5) * 2, y: e.y + (r() - 0.5) * 2, vx: -fwd * (3 + r() * 9), vy: (r() - 0.5) * 6, life: 0.7, col: r() < 0.5 ? '#ff2b3a' : '#29e7ff', r: 0.04, gr: 0, shard: true }));
      this.list.push({ icon: 'undo', x: e.x, y: e.y + 1.2, vx: 0, vy: 0.8, life: 1.1, col: '#ff4fd8', gr: 0, size: 0.6 });
      return 0.8;
    }
    if (e.k === 'route') {
      // (the hard way: a bolt and its double points; the easy way says nothing)
      if (e.hard) this.list.push({ icon: 'bolt', x: e.x - 0.3, y: e.y, vx: 0, vy: 1.2, life: 0.9, col: '#ffd84a', gr: 0, size: 0.55 }, { text: '×2', x: e.x + 0.35, y: e.y - 0.15, vx: 0, vy: 1.2, life: 0.9, col: '#ffd84a', gr: 0 });
      if (e.hard) this.burst(e.t, 30, r => ({ x: e.x, y: e.y - 1, vx: (r() - 0.5) * 9, vy: r() * 7, life: 0.7, col: '#ffd84a', r: 0.04, gr: 0.6 }));
      return e.hard ? 0.4 : 0;
    }
    if (e.k === 'bossdmg' || e.k === 'bossdown') {
      // a blow to the boss: chips knocked off its fist, flying on along the kick and up (the fist itself is knocked back
      // whole, obstacles.js fist); the last one, the boss gone in a storm of pieces
      if (e.k === 'bossdmg') this.burst(e.t, 14, r => ({ x: e.x + fwd * 0.3, y: e.y + (r() - 0.3) * 0.5, vx: base + fwd * (3 + r() * 8), vy: 1 + r() * 6, life: 0.8, col: r() < 0.6 ? T.hold : '#ffffff', r: 0.03 + r() * 0.05, gr: 1.6, shard: true }));
      else this.burst(e.t, 120, r => ({ x: e.x + (r() - 0.5), y: e.y + r() * 6, vx: base + fwd * (r() - 0.3) * 16, vy: r() * 9, life: 1.1, col: r() < 0.6 ? T.hold : '#ffffff', r: 0.05 + r() * 0.08, gr: 0.8, shard: true }));
      if (e.k === 'bossdown') {
        this.list.push({ ring: true, x: e.x, y: e.y + 2, vx: 0, vy: 0, life: 0.9, col: '#ffd84a', r: 0, gr: 0 });
        this.list.push({ text: 'BOSS DELETED', x: e.x + fwd * 2, y: e.y + 2.5, vx: 0, vy: 1, life: 1.4, col: '#ffd84a', gr: 0 });
      }
      return e.k === 'bossdown' ? 1 : 0.5;
    }
    if (e.k === 'crumble') {
      // the roof behind him breaking off in slabs and dropping away
      this.burst(e.t, 14, r => ({ x: e.x + (r() - 0.5) * 1.6, y: e.y - r() * 0.3, vx: (r() - 0.5) * 1.5, vy: r() * 1.5, life: 1.2, col: r() < 0.6 ? T.near : T.line, r: 0.08 + r() * 0.16, gr: 1.1, shard: true }));
      return 0.12;
    }
    if (e.k === 'blast') {
      // a piece of the place ahead blown apart on the downbeat: debris of its colours and a flash
      this.burst(e.t, 30, r => ({ x: e.x, y: e.y, vx: (r() - 0.5) * 9, vy: (r() - 0.2) * 8, life: 1.0, col: r() < 0.5 ? T.far : r() < 0.7 ? T.line : '#ffffff', r: 0.05 + r() * 0.12, gr: 1, shard: true }));
      this.list.push({ ring: true, x: e.x, y: e.y, vx: 0, vy: 0, life: 0.5, col: T.line, r: 0, gr: 0 });
      return 0.2;
    }
    if (e.k === 'style') {
      // a move of his own on the beat: a spark over him (gold and bigger in a freestyle window)
      this.list.push({ icon: 'spark', x: e.x, y: e.y, vx: 0, vy: 1.4, life: 0.5, col: e.free ? '#ffd84a' : '#ffffff', gr: 0, size: e.free ? 0.5 : 0.32 });
      if (e.free) this.burst(e.t, 10, r => ({ x: e.x, y: e.y - 1, vx: (r() - 0.5) * 6, vy: r() * 4, life: 0.5, col: '#ffd84a', r: 0.03, gr: 0.4 }));
      return 0;
    }
    if (e.k === 'link') {
      // a move of a freestyle string on the beat: a burst off him in its family's colour (gold sparks in a window)
      const col = { air: '#ffd84a', brk: '#5ee7ff', kick: '#ff8a3d', dance: '#c27bff' }[e.kind] ?? '#ffffff';
      this.burst(e.t, 8 + Math.min(10, e.n * 2), r => ({ x: e.x, y: e.y - 1.2, vx: (r() - 0.5) * 5, vy: r() * 3.5, life: 0.45, col: r() < 0.3 && e.free ? '#ffd84a' : col, r: 0.03, gr: 0.5 }));
      return 0;
    }
    if (e.k === 'stray') {
      // a press for nothing, off the beat: a red cross over him, the streak gone
      this.list.push({ text: '×', x: e.x, y: e.y, vx: 0, vy: 1.2, life: 0.45, col: '#ff3b5c', gr: 0 });
      return 0;
    }
    if (e.k === 'tripped') {
      // mashed: he trips, a red ring round him and sparks off his feet; a beat with no moves
      this.list.push({ ring: true, x: e.x, y: e.y, vx: 0, vy: 0, life: 0.5, col: '#ff3b5c', r: 0, gr: 0 });
      this.burst(e.t, 14, r => ({ x: e.x, y: e.y - 1, vx: (r() - 0.5) * 5, vy: r() * 3, life: 0.5, col: '#ff3b5c', r: 0.03, gr: 0.8 }));
      return 0.2;
    }
    if (e.k === 'prop') {
      // (a prop: the bat meeting what was thrown at him, sparks flung off the contact; a throw let go, a puff off his hand)
      const bat = e.o?.type === 'bat';
      this.burst(e.t, bat ? 22 : 8, r => ({ x: e.x, y: e.y + (r() - 0.5) * 0.3, vx: base + fwd * (1 + r() * 7) * (r() < 0.3 ? -0.5 : 1), vy: (r() - 0.4) * 6, life: 0.4, col: r() < 0.6 ? '#ffffff' : T.line, r: 0.02 + r() * 0.03, gr: 0.4 }));
      return bat ? 0.35 : 0.1;
    }
    if (e.k === 'shatter') {
      // high in the flow: the thing he went over or under broken to pieces of its action's colour, thrown up and on; at
      // the top tier a ring of light too
      const col = e.up ? T.jump : T.slide;
      this.burst(e.t, 26 + 10 * e.tier, r => ({ x: e.x + (r() - 0.5) * 0.8, y: e.y + (r() - 0.5) * 0.5, vx: base + fwd * (1 + r() * 6), vy: (e.up ? -1 : 1) * r() * 4 + 2, life: 0.8, col: r() < 0.7 ? col : '#ffffff', r: 0.03 + r() * 0.06, gr: 1, shard: true }));
      if (e.tier >= 3) this.list.push({ ring: true, x: e.x, y: e.y, vx: 0, vy: 0, life: 0.5, col, r: 0, gr: 0 });
      return 0.15 + 0.1 * e.tier;
    }
    if (e.k === 'starphrase') {
      this.burst(e.t, 40, r => ({ x: e.x, y: e.y, vx: (r() - 0.5) * 10, vy: (r() - 0.3) * 9, life: 0.9, col: r() < 0.7 ? '#ffd84a' : '#ffffff', r: 0.03 + r() * 0.05, gr: 0.5 }));
      for (const k of [-1, 1]) this.list.push({ icon: 'star', x: e.x + fwd * 2.5 + k * 0.3, y: e.y + 1.4 + (k > 0 ? 0.1 : 0), vx: 0, vy: 1.2, life: 0.9, col: '#ffd84a', gr: 0, size: 0.45 });
      return 0.3;
    }
    if (e.k === 'overdrive') {
      this.burst(e.t, 80, r => {
        const a = r() * Math.PI * 2,
          v = 6 + r() * 10;
        return { x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.1, col: ['#ffd84a', T.hold, T.slide, T.jump][Math.floor(r() * 4)], r: 0.04 + r() * 0.05, gr: 0.2 };
      });
      this.list.push({ ring: true, x: e.x, y: e.y, vx: 0, vy: 0, life: 0.9, col: '#ffd84a', r: 0, gr: 0 });
      this.list.push({ text: 'OVERDRIVE', x: e.x + fwd * 3, y: e.y + 1.8, vx: 0, vy: 1, life: 1.2, col: '#ffd84a', gr: 0 });
      return 0.9;
    }
    if (e.k === 'tick') {
      // a beat held under a long ceiling: a spark of its cold colour off his back
      this.burst(e.t, 6, r => ({ x: e.x, y: e.y, vx: base - fwd * (1 + r() * 3), vy: r() * 3, life: 0.4, col: T.slide, r: 0.03, gr: 0.4 }));
      // (routine: no shake)
      return 0;
    }
    if (e.k === 'drop') {
      // a dropped thing he has left bursting apart: chunks of it flung out and tumbling down, harder on the kick
      const [c0, c1] = DROP_BITS[e.place] ?? DROP_BITS.city;
      this.burst(e.t, 26, r => ({ x: e.x + (r() - 0.5) * 1.2, y: e.y - r() * 0.8, vx: (r() - 0.5) * 7, vy: r() * 4, life: 0.9, col: r() < 0.6 ? c0 : c1, r: 0.06 + r() * 0.1, gr: 1, shard: true }));
      // (what he left bursting behind him: a knock, smaller than a blow)
      return 0.35;
    }
    if (e.k === 'chalk') {
      // a push off a wall: what the place's wall gives off under his hands and feet, out from it (shafts/climb.js): a
      // puff of chalk, a ripple of neon, leaves, sand pouring, sparks, embers rising, bubbles, chips of ice
      const tr = (CLIMB[e.place] ?? CLIMB.city).trace,
        S = {
          chalk: { n: 18, col: ['#f4f1ea', '#ffffff'], v: 2.5, vy: 1.5, gr: -0.05, life: 0.9, r: 0.05 },
          neon: { n: 16, col: [T.line, '#ff3df0', '#29e7ff'], v: 4, vy: 2, gr: 0, life: 0.5, r: 0.03 },
          leaves: { n: 12, col: ['#7ab04a', '#b6ff6a', '#4a7a2a'], v: 2, vy: 1, gr: 0.25, life: 1.4, r: 0.05 },
          sand: { n: 22, col: ['#e8d0a0', '#c99a5a'], v: 1, vy: 0, gr: 0.9, life: 1.0, r: 0.025 },
          sparks: { n: 20, col: ['#ffd27a', '#ff8a3d', '#ffffff'], v: 5, vy: 3, gr: 0.8, life: 0.45, r: 0.02 },
          embers: { n: 16, col: ['#ff7a2a', '#ffb347', '#ff3b2a'], v: 1.5, vy: 2.5, gr: -0.35, life: 1.2, r: 0.03 },
          bubbles: { n: 14, col: ['#8af0ff', '#e8fbff'], v: 1, vy: 2, gr: -0.45, life: 1.3, r: 0.04 },
          ice: { n: 18, col: ['#e8fbff', '#9ad4f0', '#ffffff'], v: 3, vy: 2, gr: 0.8, life: 0.7, r: 0.03 },
        }[tr];
      this.burst(e.t, S.n, r => ({ x: e.x, y: e.y + 0.2 + r() * 1.2, vx: -e.side * (0.4 + r() * S.v), vy: (r() - 0.3) * S.vy, life: S.life * (0.7 + 0.3 * r()), col: S.col[Math.floor(r() * S.col.length)], r: S.r * (0.7 + r() * 0.8), gr: S.gr }));
      // (a push off a wall is routine: no shake)
      return 0;
    }
    // (a touch on an island, on a kick: a ring of dust off its top, a light knock)
    if (e.k === 'touch') {
      this.burst(e.t, 14, r => ({ x: e.x + (r() - 0.5) * 0.6, y: e.y + 0.05, vx: (r() - 0.5) * 6, vy: r() * 2, life: 0.45, col: r() < 0.5 ? T.line : '#ffffff', r: 0.025 + r() * 0.03, gr: 0.6 }));
      // (routine: no shake)
      return 0;
    }
    if (e.k === 'land') {
      this.burst(e.t, 24, r => ({ x: e.x + (r() - 0.5), y: e.y + 0.05, vx: (r() - 0.5) * 8, vy: r() * 3, life: 0.7, col: T.line, r: 0.03 + r() * 0.04, gr: 0.6 }));
      // (a landing is routine: dust, no shake; the camera's shake is kept for blows, deaths and the music's drops)
      return 0;
    }
    return 0;
  }
  // sliding: sparks off the roof behind him (more, brighter, on the kick)
  trail(run, t, mf) {
    // (thrown at a rate a second, not a number a frame: the same whatever the frame rate)
    const dt = Math.max(0, Math.min(0.05, t - (this.trailT ?? t)));
    this.trailT = t;
    const count = (key, rate) => {
      const a = (this[key] ?? 0) + rate * dt,
        n = Math.floor(a);
      this[key] = a - n;
      return n;
    };
    // (the win: confetti in the song's colours, thrown up on the beat)
    const nw = run.victory && mf.beat > 0.6 ? count('winAcc', 160) : 0;
    if (nw > 0) {
      const st = this.stage(t, run.heroX(t));
      this.kind = 'win';
      this.floor = st.y0;
      this.burst(t, nw, r => ({ x: st.x + (r() - 0.5) * 4, y: run.y + 4 + r() * 2, vx: (r() - 0.5) * 3, vy: r() * 2, life: 1.6, col: ['#ff2b3a', '#29e7ff', '#ffe14d', '#ffffff'][Math.floor(r() * 4)], r: 0.03 + r() * 0.04, gr: 0.25, shard: true }));
    }
    if (!run.slide || run.mode !== 'run') return;
    const n = count('slideAcc', 70 + 140 * mf.kick);
    if (n <= 0) return;
    const st = this.stage(t, run.heroX(t));
    this.kind = 'slide';
    this.floor = st.y0;
    this.burst(t, n, r => ({ x: st.x - st.dir * 0.3, y: run.y + 0.06, vx: -st.dir * (2 + r() * 4), vy: r() * 2.2, life: 0.25 + 0.2 * r(), col: r() < 0.5 ? '#fff3b0' : '#ffb347', r: 0.018 + 0.02 * r(), gr: 0.7 }));
  }
  // a cursor action landing on its beat; returns the camera trauma it is worth
  slam(a) {
    if (a.kind === 'carry' && a.o.type === 'jump') {
      const st = this.stage(a.o.t, a.o.x),
        x = st.x;
      this.kind = 'slam';
      this.floor = st.y0;
      this.burst(a.ts, 12, r => ({ x: x + (r() - 0.5) * 0.7, y: a.o.y + 0.05, vx: (r() - 0.5) * 4, vy: r() * 2.5, life: 0.5, col: '#cfc6b8', r: 0.03 + r() * 0.03, gr: 0.5 }));
      return 0.3;
    }
    return a.kind === 'select' || a.kind === 'delete' ? 0.45 : 0;
  }
  draw(f, dt) {
    // (the run's level: its speed for what the next blows throw off)
    this.L = f.L;
    const { g, v } = f,
      m = v.ppm,
      // (the words' size at the screen's full resolution, the camera not pulled back: view.js ppmFull)
      px = Math.round(v.ppmFull * 0.3);
    if (this.warmPx !== px) this.warmUp(px);
    // (the dead ones dropped in place: no new array each frame)
    let n = 0;
    for (const p of this.list) {
      p.life0 ??= p.life;
      p.age = (p.age ?? 0) + dt;
      // (a heavy thing still falling to its roof lives till it lands there (at most 3 s), and fades on the ground, not
      // in the air)
      const aloft = p.floor !== undefined && !p.rest && p.gr >= 0.5 && p.age < 3;
      p.life = aloft ? Math.max(0.36, p.life - dt) : p.life - dt;
      if (p.life > 0) this.list[n++] = p;
    }
    this.list.length = n;
    for (const p of this.list) {
      // (the world's gravity, physics.js, and the air's drag)
      if (!p.rest) {
        p.vy -= WORLD_G * p.gr * dt;
        const k = Math.exp(-(p.drag ?? 0) * dt);
        p.vx *= k;
        p.vy *= k;
      } else p.vx *= Math.exp(-10 * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // (the roof it was thrown over: a bounce that loses most of the fall, then at rest on it, sliding to a stop)
      if (p.floor !== undefined && !p.rest && p.y < p.floor && p.vy < 0 && p.gr > 0) {
        p.y = p.floor;
        p.vy = -p.vy * (p.shard ? BOUNCE.shard : BOUNCE.dust);
        p.vx *= 0.6;
        if (p.vy < 1.2) {
          p.vy = 0;
          p.rest = true;
          p.life = Math.min(p.life, 0.4);
        }
      }
      g.globalAlpha = Math.min(1, p.life * 3);
      g.fillStyle = p.col;
      if (p.ring) {
        // (from nothing, fast at first and slowing as it spreads: a shockwave's ease out)
        const u = Math.min(1, p.age / p.life0);
        g.strokeStyle = p.col;
        g.lineWidth = m * 0.12 * p.life;
        g.beginPath();
        g.arc(v.sx(p.x), v.sy(p.y), m * 7.4 * (1 - (1 - u) ** 3), 0, Math.PI * 2);
        g.stroke();
      } else if (p.icon) {
        // (an icon: swelling in as it comes, on the beat after, in the screen's frame (upright, its wedges the screen's way))
        const X = v.sx(p.x),
          Y = v.sy(p.y),
          age = 1 - Math.min(1, p.life / 0.6),
          pop = age < 0.15 ? 0.6 + (0.4 * age) / 0.15 + 0.25 * Math.sin((Math.PI * age) / 0.15) : 1,
          a = g.globalAlpha;
        f.label(() => {
          const T = g.getTransform(),
            sx = T.a * X + T.c * Y + T.e,
            sy = T.b * X + T.d * Y + T.f;
          g.save();
          g.setTransform(1, 0, 0, 1, 0, 0);
          g.globalAlpha = a;
          icon(g, p.turn ? (p.icon === 'early' ? 'late' : 'early') : p.icon, sx, sy, m * p.size * pop * Math.abs(T.a || 1), p.col, { pulse: f.mf.beat });
          g.restore();
        });
      } else if (p.text) {
        // (drawn at its size now, Math.round(m * 0.3) px, scaled from its sprite's)
        const w = word(p.text, p.col, p.small ? Math.round(m * 0.17) : px),
          k = p.small ? 1 : Math.round(m * 0.3) / px;
        const Y = v.sy(p.y);
        f.label(() => {
          // (kept whole on the screen: a word at his side on a narrow phone would run off its edge)
          const T = g.getTransform(),
            X0 = v.sx(p.x),
            at = T.a * X0 + T.c * Y + T.e,
            half = ((w.c.width * k) / 2) * Math.abs(T.a) + 6 * v.dpr,
            to = Math.min(v.W - half, Math.max(half, at)),
            X = X0 + (to - at) / (T.a || 1);
          upright(g, f.flip, X, () => (k === 1 ? g.drawImage(w.c, X - w.ax, Y - w.ay) : g.drawImage(w.c, X - w.ax * k, Y - w.ay * k, w.c.width * k, w.c.height * k)), Y);
        });
      } else if (p.shard) {
        // a shard: a broken pixel of the simulation, not a sliver: a square block snapped to a coarse pixel grid, no
        // turning, flickering out now and then, with a red and a cyan ghost beside it, and broken down to smaller blocks
        // as it dies
        const q = Math.max(2, m * 0.05),
          X = Math.round(v.sx(p.x) / q) * q,
          Y = Math.round(v.sy(p.y) / q) * q,
          sz = Math.max(q, Math.round((p.r * m * 2.4 * Math.min(1, 0.4 + p.life)) / q) * q),
          // (its flicker on its own clock: a seed of its own taken once, a tick of its age, not of its falling speed)
          seed = (p.seed ??= (p.vx * 97 + p.vy * 31) | 0),
          tick = Math.floor(p.age * 24);
        if ((Math.imul(seed + tick, 2654435761) >>> 0) % 7 !== 0) {
          if (((seed + tick) & 3) === 0) {
            g.fillStyle = '#ff2b3a';
            g.fillRect(X - sz / 2 - q, Y - sz / 2, sz, sz);
            g.fillStyle = '#29e7ff';
            g.fillRect(X - sz / 2 + q, Y - sz / 2, sz, sz);
            g.fillStyle = p.col;
          }
          if (p.life > 0.35) g.fillRect(X - sz / 2, Y - sz / 2, sz, sz);
          else
            for (let k = 0; k < 3; k++) {
              const h = ((seed * 7 + k * 13) & 7) - 4;
              g.fillRect(X + h * q * 0.5, Y + ((k * 5 + seed) & 3) * q - q, q, q);
            }
        }
      } else {
        g.beginPath();
        g.arc(v.sx(p.x), v.sy(p.y), p.r * m, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.globalAlpha = 1;
  }
}
