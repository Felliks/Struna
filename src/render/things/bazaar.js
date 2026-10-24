// The bazaar's obstacles: a glazed jar, a stack of fruit crates and a festival drum to jump; a string of lanterns, a
// stall's awning and a hanging shop board to slide under; a paper screen and a red brick wall to kick through; a
// bamboo pole to swing on; ledges of a stall's counter and roof tiles; and the market's hazards in a shaft.
import { mulberry } from '../../rng.js';
import { rgba } from '../util.js';
import { courses, hanging, ledge } from './kit.js';
import { firejet, jaws, mine, neonsign, saw, spikes } from './hazards.js';

const RED = '#d8283a',
  GOLD = '#ffcf6a';

export default {
  // a glazed jar, its blue band catching light on the kick
  bzJar(k, o) {
    k.round(-0.28, 0, 0.56, o.h * 0.85, 0.2, '#e8e0d0');
    k.plain();
    k.box(-0.15, o.h * 0.85, 0.3, o.h * 0.15, '#d8d0c0');
    k.box(-0.28, o.h * 0.38, 0.56, o.h * 0.14, '#2a5ab0');
    k.disc(0, o.h * 0.45, 0.05, rgba(k.T.jump, 0.4 + 0.6 * k.mf.kick));
  },
  // two fruit crates stacked, their oranges glowing on the kick
  bzCrates(k, o) {
    k.box(-0.34, 0, 0.68, o.h * 0.5, '#8a5a32', k.accent, 0.03);
    k.box(-0.26, o.h * 0.5, 0.52, o.h * 0.38, '#7a4a28', k.accent, 0.03);
    k.plain();
    for (const x of [-0.16, 0, 0.16]) k.disc(x, o.h * 0.86, 0.07, rgba('#ff9a2a', 0.7 + 0.3 * k.mf.kick));
    k.line(-0.34, o.h * 0.25, 0.34, o.h * 0.25, 0.025, '#4a2a14');
  },
  // a festival drum on its stand, its skin flashing on the kick
  bzDrum(k, o) {
    k.plain();
    for (const x of [-0.3, 0.3]) k.line(x * 0.7, 0, x, o.h * 0.6, 0.04, '#4a2a14');
    k.glow();
    k.round(-0.32, o.h * 0.2, 0.64, o.h * 0.8, 0.12, RED);
    k.plain();
    k.disc(0, o.h * 0.6, 0.18, rgba('#f4e8d0', 0.6 + 0.4 * k.mf.kick));
    for (const y of [o.h * 0.25, o.h * 0.92]) for (let i = 0; i < 4; i++) k.disc(-0.24 + i * 0.16, y, 0.02, GOLD);
  },
  // a string of red lanterns just over his head, blinking on the hats
  bzLanterns(k) {
    hanging(k, 1.6, 1.1, '#3a2a20');
    k.line(-0.75, 1.6, 0.75, 1.6, 0.03, '#3a2a20');
    k.plain();
    for (let i = 0; i < 4; i++) {
      const x = -0.5 + i * 0.33,
        on = i % 2 ? Math.min(1, k.mf.hat * 2.5) : 0.4 + 0.6 * k.mf.beat;
      k.line(x, 1.6, x, 1.45, 0.015, '#3a2a20');
      k.round(x - 0.13, 1.1, 0.26, 0.34, 0.12, rgba(RED, 0.6 + 0.4 * on));
      k.box(x - 0.07, 1.42, 0.14, 0.04, GOLD);
      k.box(x - 0.07, 1.06, 0.14, 0.04, GOLD);
      k.disc(x, 1.27, 0.05, rgba('#fff3a0', 0.3 + 0.7 * on));
    }
  },
  // a stall's striped awning, its fringe swinging with the bass, a tassel lit on the snare
  bzAwning(k) {
    k.plain();
    k.poly([[-0.8, 1.9], [0.8, 1.9], [0.85, 1.25], [-0.85, 1.25]], '#f0e6d0');
    for (let i = 0; i < 4; i++) k.poly([[-0.8 + i * 0.4, 1.9], [-0.6 + i * 0.4, 1.9], [-0.62 + i * 0.425, 1.25], [-0.85 + i * 0.425, 1.25]], RED);
    k.glow();
    for (let i = 0; i < 8; i++) {
      const x = -0.75 + i * 0.214,
        sw = 0.03 * Math.sin(k.t * 5 + i) * (0.4 + k.mf.bass);
      k.poly([[x - 0.1, 1.25], [x + 0.1, 1.25], [x + sw, 1.1]], i % 2 ? RED : '#f0e6d0');
    }
    k.plain();
    k.disc(0.85, 1.1, 0.05, rgba(GOLD, 0.4 + 0.6 * (k.mf.snare ?? 0)));
  },
  // a shop board hung across on chains, its gold border and seal lit on the kick (no words on it)
  bzBoard(k) {
    hanging(k, 1.55, 0.6, '#9aa0a8');
    k.box(-0.6, 1.08, 1.2, 0.47, '#1a0c0c', k.accent, 0.03);
    k.plain();
    k.frame(-0.52, 1.14, 1.04, 0.35, rgba(GOLD, 0.5 + 0.5 * k.mf.kick), 0.025);
    k.disc(0, 1.315, 0.1, rgba(RED, 0.6 + 0.4 * k.mf.beat));
    for (const x of [-0.32, 0.32]) k.box(x - 0.04, 1.2, 0.08, 0.23, rgba(k.T.slide, 0.4 + 0.5 * k.mf.kick));
  },
  // a paper screen in its lattice, painted in panel by panel, lamplight behind it on the kick
  bzScreen(k, o) {
    k.plain();
    const n = Math.ceil(8 * k.u),
      ph = o.h / 8;
    for (let i = 0; i < n; i++) {
      k.box(-0.18, i * ph, 0.36, ph, rgba('#f4e4c0', 0.75 + 0.25 * k.mf.kick));
      k.frame(-0.18, i * ph, 0.36, ph, '#5a2a14', 0.03);
      k.line(0, i * ph, 0, (i + 1) * ph, 0.02, '#5a2a14');
    }
  },
  bzBricks(k, o) {
    const rr = mulberry(Math.round(o.t * 1000));
    courses(k, o, 14, 0.4, () => (rr() < 0.5 ? '#a8282a' : '#8a2022'));
  },
  // a bamboo pole hung on ropes, its knots and its two lanterns lit on the kick
  bzPole(k) {
    hanging(k, 2.12, 0.9, '#c8a86a', 0.03);
    k.box(-0.7, 2.05, 1.4, 0.08, '#b8a050', rgba(k.T.hold, 0.9), 0.025);
    k.plain();
    for (const x of [-0.35, 0, 0.35]) k.box(x - 0.015, 2.05, 0.03, 0.08, '#6a5a20');
    for (const x of [-0.6, 0.6]) k.disc(x, 1.95, 0.07, rgba(RED, 0.5 + 0.5 * k.mf.kick));
  },
  bzCounterledge: ledge('#8a2a1a'),
  bzTileledge: ledge('#2a3a40'),
  // the market's hazards: a cleaver saw, a spiked firecracker bomb, a lion-dance head's jaws, a wok's fire, a sign
  // gone wild, a beam of spikes
  bzCleaver: saw('#3a1a14', '#e8e0d0'),
  bzCracker: mine('#a01822', GOLD),
  bzLion: jaws(RED, GOLD, { eyes: true }),
  bzWok: firejet('#2a1a14', '#ff7a2a'),
  bzNeon: neonsign('#1a0a0a', '#ff3b4f', '#ffe8c0'),
  bzSpikes: spikes('#5a1a14', GOLD),
};
