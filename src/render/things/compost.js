// The Compost Garden's obstacles (places/compost.js), black soil, embers and juicy green: a fly agaric, an apple core
// with a sprout out of it and a tin can a seedling has taken over to jump; an earthworm arching over the way, a juicy
// leaf and a tangle of roots to slide under; a wall of soil in its layers (painted in) and a jar of compost (glass) to
// kick through; a stem to swing on; and its hazards: a flytrap's jaws snapping, thorns, a puffball, a beetle, a vine knot,
// a saw of beetle shell.
import { mulberry } from '../../rng.js';
import { rgba } from '../util.js';
import { courses, hanging } from './kit.js';
import { jaws, mine, saw, scorpion, spikes, vineknot } from './hazards.js';

const GREEN = '#5ae04a',
  JUICY = '#2ab83a',
  SOIL = '#2a1a12',
  EMBER = '#ff5a1e',
  AGARIC = '#e8202a',
  WORM = '#e88a8a';

export default {
  // a fly agaric: red with white spots, its cap bouncing on the kick
  cmMushroom(k, o) {
    const h = o.h,
      b = 0.03 * k.mf.kick;
    k.round(-0.1, 0, 0.2, h * 0.65, 0.06, '#f4ecd8', k.accent, 0.03);
    k.plain();
    k.poly([[-0.42, h * 0.6 + b], [-0.3, h * 0.85 + b], [0, h * 0.98 + b], [0.3, h * 0.85 + b], [0.42, h * 0.6 + b]], AGARIC);
    for (const [x, y] of [[-0.22, 0.72], [0.02, 0.86], [0.24, 0.7], [-0.06, 0.68]]) k.disc(x, h * y + b, 0.045, '#ffffff');
    k.box(-0.36, h * 0.58 + b, 0.72, 0.03, rgba(k.accent, 0.5 + 0.5 * k.mf.kick));
  },
  // an apple core, a sprout up out of it waving
  cmCore(k, o) {
    const h = o.h;
    k.round(-0.3, 0, 0.6, h * 0.25, 0.1, '#c8302a', k.accent, 0.03);
    k.plain();
    k.round(-0.16, h * 0.2, 0.32, h * 0.45, 0.1, '#f0e0b0');
    k.round(-0.3, h * 0.6, 0.6, h * 0.22, 0.1, '#c8302a');
    k.disc(-0.05, h * 0.42, 0.03, '#3a1a0a');
    k.disc(0.06, h * 0.36, 0.03, '#3a1a0a');
    const sw = 0.05 * Math.sin(k.t * 2);
    k.line(0, h * 0.82, sw, h * 1.05, 0.03, JUICY);
    k.poly([[sw, h * 1.05], [sw + 0.18, h * 1.12], [sw + 0.05, h * 0.98]], GREEN);
    k.poly([[sw, h * 1.05], [sw - 0.16, h * 1.14], [sw - 0.04, h * 0.98]], GREEN);
  },
  // a tin can a seedling has taken over, leaves out of its top, rust on it
  cmCan(k, o) {
    const h = o.h;
    k.round(-0.28, 0, 0.56, h * 0.85, 0.04, '#8a8a90', k.accent, 0.03);
    k.plain();
    for (let i = 0; i < 4; i++) k.box(-0.28, h * (0.15 + i * 0.2), 0.56, 0.02, '#5a5a60');
    k.disc(-0.1, h * 0.4, 0.08, rgba('#a0582a', 0.7));
    k.disc(0.12, h * 0.6, 0.06, rgba('#a0582a', 0.6));
    for (let i = 0; i < 4; i++) {
      const x = -0.18 + i * 0.12,
        sw = 0.03 * Math.sin(k.t * 3 + i) + 0.02 * k.mf.kick;
      k.poly([[x, h * 0.85], [x + 0.08 + sw, h * (1.1 + 0.05 * (i % 2))], [x + 0.1, h * 0.85]], i % 2 ? GREEN : JUICY);
    }
  },
  // an earthworm hung across in a loop from a clod of soil, its rings, a kind face, swinging on the bass
  cmWorm(k) {
    const b = 0.05 * Math.sin(k.t * 2.4) + 0.04 * k.mf.bass,
      pts = [];
    hanging(k, 1.8, 1.6, '#5a3a1a', 0.04);
    k.plain();
    k.round(-0.95, 1.72, 1.9, 0.18, 0.08, SOIL);
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI;
      pts.push([-0.8 * Math.cos(a), 1.74 - (0.52 + b) * Math.sin(a)]);
    }
    for (let i = 0; i < pts.length - 1; i++) k.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 0.2, WORM);
    for (let i = 1; i < 12; i += 2) k.disc(pts[i][0], pts[i][1], 0.04, rgba('#c86a6a', 0.8));
    k.disc(0.74, 1.62, 0.025, '#2a1010');
    k.box(-0.8, 1.06, 1.6, 0.03, rgba(k.accent, 0.4 + 0.6 * k.mf.kick));
  },
  // a juicy leaf hung across on its stalk, a raindrop rolling along it on the beat
  cmLeaf(k) {
    hanging(k, 1.6, 1.3, '#3a7a2a', 0.03);
    k.plain();
    k.poly([[-0.95, 1.4], [-0.4, 1.68], [0.4, 1.66], [0.95, 1.4], [0.4, 1.14], [-0.4, 1.16]], JUICY);
    k.line(-0.95, 1.4, 0.95, 1.4, 0.025, rgba('#c8ffa0', 0.6));
    for (const x of [-0.5, 0, 0.5]) {
      k.line(x, 1.4, x + 0.2, 1.6, 0.015, rgba('#c8ffa0', 0.5));
      k.line(x, 1.4, x + 0.2, 1.2, 0.015, rgba('#c8ffa0', 0.5));
    }
    k.disc(-0.7 + 1.4 * ((k.t * 0.5) % 1), 1.66, 0.05, rgba('#d8f4ff', 0.8));
    k.box(-0.8, 1.12, 1.6, 0.03, rgba(k.accent, 0.4 + 0.6 * k.mf.kick));
  },
  // a tangle of roots hung across from the soil above, their tips lit green
  cmRoots(k) {
    hanging(k, 1.7, 1.5, '#5a3a1a', 0.05);
    k.plain();
    k.box(-0.95, 1.6, 1.9, 0.3, SOIL);
    for (let i = 0; i < 9; i++) {
      const x = -0.85 + i * 0.21,
        sw = 0.04 * Math.sin(k.t * 1.5 + i);
      k.line(x, 1.6, x + sw, 1.18 + 0.06 * (i % 3), 0.03, '#c8a070');
      k.disc(x + sw, 1.18 + 0.06 * (i % 3), 0.03, rgba(GREEN, 0.5 + 0.5 * k.mf.beat));
    }
    k.box(-0.85, 1.12, 1.7, 0.03, rgba(k.accent, 0.4 + 0.6 * k.mf.kick));
  },
  // a wall of soil in its layers, painted in course by course, an ember and a green seam in it
  cmSoil(k, o) {
    const rr = mulberry(Math.round(o.t * 1000));
    courses(k, o, 7, 0.42, r => (rr() < 0.1 ? EMBER : rr() < 0.12 ? GREEN : r % 2 ? '#3a2418' : '#4a3020'), false);
  },
  // a jar of compost, layers in it and a sprout inside the glass: breaks as glass
  cmJar(k, o) {
    k.box(-0.18, 0, 0.36, o.h, rgba('#c8e8d8', 0.5), k.accent, 0.03);
    k.plain();
    k.box(-0.16, 0.02, 0.32, o.h * 0.25, '#3a2418');
    k.box(-0.16, o.h * 0.27, 0.32, o.h * 0.12, '#6a4a2a');
    k.line(0, o.h * 0.4, 0.03, o.h * 0.7, 0.02, JUICY);
    k.poly([[0.03, o.h * 0.7], [0.12, o.h * 0.76], [0.04, o.h * 0.64]], GREEN);
    k.box(-0.2, o.h - 0.06, 0.4, 0.06, '#8a6a4a');
  },
  // a stem to swing on, leaves along it
  cmStem(k) {
    hanging(k, 2.14, 0.9, '#3a7a2a', 0.03);
    k.round(-0.72, 2.04, 1.44, 0.11, 0.05, '#4a8a2a');
    k.frame(-0.72, 2.04, 1.44, 0.11, rgba(k.T.hold, 0.9), 0.025);
    k.plain();
    for (const x of [-0.4, 0.3]) k.poly([[x, 2.14], [x + 0.25, 2.32], [x + 0.3, 2.14]], GREEN);
    for (const x of [-0.45, 0, 0.45]) k.box(x - 0.04, 2.02, 0.08, 0.15, rgba(k.T.hold, 0.4 + 0.6 * k.mf.beat));
  },
  cmTrap: jaws('#3a8a2a', '#f0f8d0'),
  cmThorns: spikes('#3a2418', '#9ae04a'),
  cmSpore: mine('#c8a070', '#f0e0b0'),
  cmBeetle: scorpion('#1a3a2a', '#5ae04a'),
  cmVine: vineknot('#2a7a2a', '#c8ff6a'),
  cmSaw: saw(SOIL, '#c8a070'),
};
