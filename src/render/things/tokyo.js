// Tokyo's obstacles: a vending machine, a stone lantern and a stack of sake barrels to jump, a string of paper
// lanterns, a noren curtain and a neon sign to slide under, a shoji screen and a wall of roof tiles to kick through, a
// torii's red beam to swing on, ledges of lacquered wood and stone; and the street's hazards in a shaft.
import { mulberry } from '../../rng.js';
import { rgba } from '../util.js';
import { courses, hanging, ledge } from './kit.js';
import { fan, neonsign, saw, shards, spikes, zapper } from './hazards.js';

const RED = '#c8282f',
  PAPER = '#ffb45a',
  PINK = '#ff8ab8';

export default {
  // a vending machine: its lit window, bottles in rows, its buttons blinking on the hats
  tkVend(k, o) {
    k.box(-0.3, 0, 0.6, o.h, '#d8dce4', k.accent, 0.03);
    k.plain();
    k.box(-0.25, o.h * 0.45, 0.5, o.h * 0.48, rgba('#bfe8ff', 0.5 + 0.4 * k.mf.kick));
    for (let c = 0; c < 4; c++) k.box(-0.21 + c * 0.11, o.h * 0.55, 0.06, o.h * 0.14, [RED, '#2a7ad8', PAPER, '#3ab05a'][c]);
    for (let c = 0; c < 4; c++) k.disc(-0.18 + c * 0.11, o.h * 0.38, 0.018, rgba(k.T.jump, 0.3 + 0.7 * k.mf.hat * 2.5));
    k.box(-0.2, o.h * 0.08, 0.4, 0.07, '#2a2f3a');
  },
  // a stone lantern: its base, its light box lit on the beat, its roof
  tkStone(k, o) {
    k.box(-0.24, 0, 0.48, o.h * 0.15, '#6a6a70', k.accent, 0.025);
    k.box(-0.07, o.h * 0.15, 0.14, o.h * 0.3, '#7a7a80');
    k.box(-0.18, o.h * 0.45, 0.36, o.h * 0.28, '#6a6a70');
    k.plain();
    k.box(-0.1, o.h * 0.5, 0.2, o.h * 0.18, rgba(PAPER, 0.4 + 0.6 * k.mf.beat));
    k.poly([[-0.32, o.h * 0.73], [0.32, o.h * 0.73], [0.08, o.h * 0.92], [-0.08, o.h * 0.92]], '#5a5a60');
    k.disc(0, o.h * 0.95, 0.04, '#5a5a60');
  },
  // sake barrels stacked, bound in straw, their red marks lit on the kick
  tkBarrels(k, o) {
    for (const [x, y, r] of [[-0.17, 0, 0.17], [0.17, 0, 0.17], [0, o.h * 0.55, 0.16]]) {
      k.round(x - r, y, r * 2, o.h * 0.45, 0.04, '#e8dcc0');
      k.plain();
      k.box(x - r, y + o.h * 0.05, r * 2, 0.03, '#8a6a40');
      k.box(x - r, y + o.h * 0.37, r * 2, 0.03, '#8a6a40');
      k.disc(x, y + o.h * 0.22, 0.05, rgba(RED, 0.5 + 0.5 * k.mf.kick));
    }
  },
  // a string of paper lanterns across the way, swinging on the beat
  tkLanterns(k) {
    k.plain();
    k.line(-0.75, 1.55, -0.7, k.sky, 0.03, '#3a2a20');
    k.line(0.75, 1.55, 0.7, k.sky, 0.03, '#3a2a20');
    k.line(-0.75, 1.55, 0.75, 1.55, 0.025, '#3a2a20');
    k.glow();
    const sw = Math.sin(k.t * 4) * (0.03 + 0.06 * k.mf.beat);
    for (const x of [-0.45, 0, 0.45]) {
      k.line(x, 1.55, x + sw, 1.42, 0.015, '#3a2a20');
      k.round(x + sw - 0.13, 1.08, 0.26, 0.34, 0.12, x ? RED : PAPER);
      k.plain();
      k.box(x + sw - 0.09, 1.07, 0.18, 0.03, '#1a1014');
      k.box(x + sw - 0.09, 1.4, 0.18, 0.03, '#1a1014');
      k.disc(x + sw, 1.25, 0.06, rgba('#fff0c0', 0.3 + 0.6 * k.mf.beat));
    }
  },
  // a noren: a split cloth hung from a rod, its flaps stirring on the hats
  tkNoren(k) {
    hanging(k, 1.7, 1.1, '#3a2a20');
    k.box(-0.62, 1.66, 1.24, 0.05, '#3a2a20');
    k.plain();
    for (let i = 0; i < 4; i++) {
      const x = -0.6 + i * 0.3,
        d = 0.03 * Math.sin(k.t * 6 + i) * (1 + 3 * k.mf.hat);
      k.poly([[x + 0.01, 1.66], [x + 0.29, 1.66], [x + 0.29 + d, 1.08], [x + 0.01 + d, 1.08]], i % 2 ? '#1a2a5a' : '#22336a');
    }
    k.disc(0, 1.4, 0.12, rgba('#f4f0ff', 0.4 + 0.5 * k.mf.kick));
  },
  // a neon sign hung across: a dark board, glyph strokes flickering on the kick
  tkSign(k) {
    hanging(k, 1.5, 0.7);
    k.box(-0.6, 1.08, 1.2, 0.42, '#14101a', k.accent, 0.03);
    k.plain();
    const fl = Math.sin(k.t * 29) + Math.sin(k.t * 13.7) > 1.6 ? 0.15 : 0.4 + 0.6 * k.mf.kick,
      col = rgba(PINK, fl);
    for (let i = 0; i < 4; i++) {
      const x = -0.42 + i * 0.28;
      k.line(x - 0.08, 1.38 - (i % 2) * 0.05, x + 0.08, 1.38 - (i % 2) * 0.05, 0.025, col);
      k.line(x + (i % 3 === 0 ? -0.04 : 0.03), 1.4, x + (i % 3 === 0 ? -0.04 : 0.03), 1.16, 0.025, col);
      if (i % 2) k.line(x - 0.08, 1.18, x + 0.07, 1.28, 0.025, col);
    }
  },
  // a shoji screen: a lattice of wood and paper, lit from behind on the kick, built cell by cell as it is painted
  tkShoji(k, o) {
    k.plain();
    const rows = 10,
      h = o.h / rows,
      done = Math.ceil(rows * k.u);
    for (let r = 0; r < done; r++) k.box(-0.18, r * h, 0.36, h, rgba('#fff4dc', 0.75 + 0.2 * k.mf.kick));
    for (let r = 0; r <= done; r++) k.line(-0.18, r * h, 0.18, r * h, 0.025, '#4a2e1a');
    for (const x of [-0.18, 0, 0.18]) k.line(x, 0, x, done * h, 0.03, '#4a2e1a');
    k.glow();
    k.frame(-0.18, 0, 0.36, done * h, rgba('#ff2b3a', 0.6 + 0.4 * k.mf.kick), 0.04);
  },
  // a wall of roof tiles, course on course
  tkTiles(k, o) {
    const rr = mulberry(Math.round(o.t * 1000));
    courses(k, o, 12, 0.4, () => (rr() < 0.5 ? '#3a3e4a' : '#2e323c'));
  },
  // a torii's red beam to swing on, its gold cap lit on the kick
  tkTorii(k) {
    hanging(k, 2.14, 0.9, '#3a2a20');
    k.box(-0.75, 2.05, 1.5, 0.1, RED, rgba(k.T.hold, 0.9), 0.025);
    k.box(-0.85, 2.15, 1.7, 0.06, '#1a1014');
    k.plain();
    k.box(-0.1, 2.05, 0.2, 0.1, rgba('#ffd84a', 0.4 + 0.6 * k.mf.kick));
  },
  tkWoodledge: ledge(RED),
  tkStoneledge: ledge('#5a5a60'),
  tkneon: neonsign('#14101a', '#ff4fa0'),
  tksaw: saw('#2a1014', '#ffd6e8'),
  tkspikes: spikes('#3a1a1a', PINK),
  tkpetals: shards('#d4407a', '#ffd6e8'),
  tkzap: zapper('#2a1424', '#ff4fa0'),
  tkfan: fan('#2a1a24', '#e8dcc0'),
};
