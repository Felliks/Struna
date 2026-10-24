// The casino's obstacles: a slot machine, a stack of poker chips and a pair of dice to jump; a marquee sign, a crystal
// chandelier and a roulette wheel hung overhead to slide under; a glass door and a wall of chips to kick through; a gold
// bar to swing on; ledges of slot cabinets and gold; hazards of chip saws, dice, neon, sparks, roulette gears and glass.
import { mulberry } from '../../rng.js';
import { rgba } from '../util.js';
import { courses, hanging, ledge } from './kit.js';
import { gears, glassburst, glitchcube, neonsign, saw, zapper } from './hazards.js';

const GOLD = '#ffd34a',
  BULB = '#fff1b8',
  RED = '#d81e3c';

export default {
  // a slot machine: its cabinet, three reels rolling (three of a kind on the kick), its lever, a lamp on top on the beat
  csSlot(k, o) {
    k.box(-0.3, 0, 0.6, o.h * 0.92, '#7a0e22', k.accent, 0.03);
    k.plain();
    k.box(-0.24, o.h * 0.42, 0.48, o.h * 0.3, '#14080e');
    for (let i = 0; i < 3; i++) {
      const sym = k.mf.kick > 0.5 ? 0 : Math.floor(k.t * (7 + i * 3) + i) % 3;
      k.disc(-0.16 + i * 0.16, o.h * 0.57, 0.05, [GOLD, '#ff4f5c', k.T.jump][sym]);
    }
    k.box(-0.3, o.h * 0.3, 0.6, 0.03, rgba(GOLD, 0.6));
    k.line(0.3, o.h * 0.55, 0.38, o.h * 0.8, 0.025, '#c9ccd2');
    k.disc(0.38, o.h * 0.82, 0.04, '#ff2b4a');
    k.round(-0.12, o.h * 0.92, 0.24, o.h * 0.08, 0.04, rgba(k.T.jump, 0.5 + 0.5 * k.mf.beat));
  },
  // a stack of poker chips, each chip's edge striped, the top one flipping on the hats
  csChips(k, o) {
    const n = 7,
      ch = o.h / n;
    for (let i = 0; i < n - 1; i++) {
      const col = [RED, '#1a1a24', '#2a6ad8'][i % 3];
      k.round(-0.26 + (i % 2) * 0.02, i * ch, 0.5, ch - 0.01, 0.02, col);
      k.plain();
      for (let s = 0; s < 4; s++) k.box(-0.22 + s * 0.13 + (i % 2) * 0.02, i * ch + ch * 0.3, 0.05, ch * 0.4, '#f0f0e8');
    }
    const flip = Math.abs(Math.cos(k.t * 3 + k.mf.hat * 6));
    k.round(-0.25 * flip, (n - 1) * ch, 0.5 * flip, ch, 0.02, rgba(GOLD, 0.7 + 0.3 * k.mf.kick));
  },
  // a pair of dice tumbled together, their pips lit on the beat
  csDice(k, o) {
    const s = o.h * 0.62,
      pip = rgba('#14080e', 0.9),
      lit = rgba(k.T.jump, 0.6 + 0.4 * k.mf.beat);
    k.round(-0.36, 0, s, s, 0.05, '#f2f0ea');
    k.poly([[0.0, 0], [0.36, 0.05], [0.32, o.h], [-0.06, o.h * 0.94]], '#e6e2d8');
    k.plain();
    for (const [x, y] of [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75], [0.25, 0.75], [0.75, 0.25]]) k.disc(-0.36 + x * s, y * s, 0.035, pip);
    for (const [x, y] of [[0.05, 0.3], [0.25, 0.7]]) k.disc(x, y * o.h, 0.04, lit);
  },
  // a marquee sign hung across, its bulbs chasing round it, its panel flashing on the kick
  csMarquee(k) {
    hanging(k, 1.6, 1.0, '#9a8a5a', 0.025);
    k.box(-0.7, 1.05, 1.4, 0.55, rgba('#ff2b4a', 0.45 + 0.5 * k.mf.kick), k.accent, 0.03);
    k.plain();
    const step = Math.floor(k.t * 8);
    for (let i = 0; i < 12; i++) {
      const on = (i + step) % 3 === 0,
        col = rgba(on ? BULB : GOLD, on ? 0.95 : 0.3);
      k.disc(-0.65 + i * 0.118, 1.55, 0.03, col);
      k.disc(-0.65 + i * 0.118, 1.1, 0.03, col);
    }
    k.box(-0.5, 1.2, 1.0, 0.25, rgba(k.T.slide, 0.25 + 0.4 * k.mf.snare));
  },
  // a crystal chandelier swinging low on the beat, its candles flickering on the hats, drops of crystal under it
  csChandelier(k) {
    const sw = 0.06 * Math.sin(k.t * 3);
    hanging(k, 1.75, 0.3, '#c9a050', 0.03);
    k.poly([[-0.6 + sw, 1.45], [0.6 + sw, 1.45], [0.25 + sw, 1.75], [-0.25 + sw, 1.75]], '#c9a050');
    k.plain();
    for (let i = 0; i < 7; i++) {
      const x = -0.54 + i * 0.18 + sw;
      k.line(x, 1.45, x, 1.12 + 0.05 * (i % 2), 0.012, rgba('#e8f4ff', 0.7));
      k.disc(x, 1.1 + 0.05 * (i % 2), 0.035, rgba('#e8f4ff', 0.5 + 0.5 * k.mf.beat));
      k.disc(x, 1.52, 0.03, rgba(BULB, 0.5 + 0.5 * Math.min(1, k.mf.hat * 2.5 + 0.3 * Math.sin(k.t * 20 + i))));
    }
  },
  // a roulette wheel hung on its edge, spinning with the hats, its ball riding the rim
  csRoulette(k) {
    hanging(k, 1.95, 0.5, '#9a8a5a', 0.025);
    k.disc(0, 1.5, 0.45, '#5a2a14');
    k.plain();
    for (let i = 0; i < 18; i++) {
      const a = k.spin * 0.5 + (i * Math.PI) / 9;
      k.line(Math.cos(a) * 0.22, 1.5 + Math.sin(a) * 0.22, Math.cos(a) * 0.4, 1.5 + Math.sin(a) * 0.4, 0.07, i % 9 === 0 ? '#2a9a4a' : i % 2 ? RED : '#14080e');
    }
    k.disc(0, 1.5, 0.2, GOLD);
    k.disc(0, 1.5, 0.06, '#7a5a20');
    const b = -k.t * 4;
    k.disc(Math.cos(b) * 0.42, 1.5 + Math.sin(b) * 0.42, 0.04, rgba('#ffffff', 0.9));
    k.box(-0.45, 1.05, 0.9, 0.04, rgba(k.T.slide, 0.5 + 0.5 * k.mf.kick));
  },
  // a casino's glass door, gold-framed, its glints sliding on the hats
  csGlassdoor(k, o) {
    k.box(-0.15, 0, 0.3, o.h, rgba('#ffe9b0', 0.2 + 0.2 * k.mf.kick), k.accent, 0.03);
    k.plain();
    const gl = (k.t * 0.8 + k.mf.hat) % 1;
    k.line(-0.1, o.h * gl, 0.1, o.h * gl + 0.25, 0.025, 'rgba(255,255,255,0.7)');
    k.box(-0.18, 0, 0.36, 0.08, GOLD);
    k.box(-0.18, o.h - 0.06, 0.36, 0.06, GOLD);
    k.box(0.06, o.h * 0.45, 0.04, 0.3, '#c9a050');
  },
  // a wall of stacked chips, painted in course by course
  csChipwall(k, o) {
    const rr = mulberry(Math.round(o.t * 1000));
    courses(k, o, 16, 0.42, () => [RED, '#1a1a24', '#2a6ad8', '#e8e4d8'][Math.floor(rr() * 4)], false);
  },
  // a gold bar on chains, its bulbs on the beat
  csBar(k) {
    hanging(k, 2.12, 0.9, '#c9a050', 0.025);
    k.box(-0.7, 2.05, 1.4, 0.09, GOLD, rgba(k.T.hold, 0.9), 0.025);
    for (let i = 0; i < 4; i++) k.disc(-0.5 + i * 0.33, 2.0, 0.04, rgba(BULB, (Math.floor(k.t * 8) + i) % 2 ? 0.3 : 0.6 + 0.4 * k.mf.beat));
  },
  csSlotledge: ledge('#7a0e22', true),
  csGoldledge: ledge('#8a6a20'),
  csChipsaw: saw('#2a0a14', GOLD),
  csDicecube: glitchcube('#e8e4d8', '#ff2b4a'),
  csNeon: neonsign('#1a0a14', '#ff3df0'),
  csZap: zapper('#3a0a1a', GOLD),
  csWheel: gears('#2a0a14', GOLD),
  csGlass: glassburst('#8a6a20', '#ffe9b0'),
};
