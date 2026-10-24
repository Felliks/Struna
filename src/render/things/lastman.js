// The Last Man's obstacles (places/lastman.js), sunny and green: an armchair standing alone in the field (the emperor's,
// a fur thrown over it), a red muscle car's bonnet in the grass and an old television with a flower growing out of it to
// jump; a garland of vines and a branch of an apple tree to slide under; a window in its
// frame with ivy on it (glass) and a wall of mossy bricks to kick through; a pipe grown over to swing on; and its
// hazards in green and gold: a saw of a hubcap, thorns, a dandelion ball, a bees' nest, a vine knot, a sunlit pane.
import { mulberry } from '../../rng.js';
import { rgba } from '../util.js';
import { courses, hanging } from './kit.js';
import { glassburst, hornetnest, mine, saw, spikes, vineknot } from './hazards.js';

const GREEN = '#5ab83a',
  LEAF = '#7ad04a',
  FUR = '#e8d8c0',
  RED = '#e8302a',
  GOLD = '#f0c050';

export default {
  // an armchair alone in the field, red velvet, a fur thrown over its back (its fluff shaking on the kick)
  lmChair(k, o) {
    const h = o.h;
    k.box(-0.36, 0, 0.08, h * 0.45, '#5a3a1a');
    k.box(0.28, 0, 0.08, h * 0.45, '#5a3a1a');
    k.round(-0.4, h * 0.3, 0.8, h * 0.25, 0.06, '#b02030', k.accent, 0.03);
    k.round(-0.4, h * 0.5, 0.2, h * 0.5, 0.08, '#b02030');
    k.plain();
    k.round(-0.42, h * 0.62 + 0.02 * k.mf.kick, 0.34, h * 0.42, 0.12, FUR);
    k.disc(-0.25, h * 1.02 + 0.02 * k.mf.kick, 0.08, FUR);
    k.box(-0.36, h * 0.53, 0.72, 0.03, rgba(k.accent, 0.5 + 0.5 * k.mf.kick));
  },
  // the bonnet of a red muscle car standing up out of the grass, its chrome grille, its headlights lit on the beat
  lmCar(k, o) {
    const h = o.h;
    k.round(-0.4, 0, 0.8, h * 0.85, 0.08, RED, k.accent, 0.03);
    k.plain();
    k.box(-0.3, h * 0.2, 0.6, h * 0.25, '#c8ccd0');
    for (let i = 0; i < 4; i++) k.box(-0.28 + i * 0.15, h * 0.22, 0.1, h * 0.2, '#5a5e64');
    for (const x of [-0.28, 0.28]) k.disc(x, h * 0.6, 0.08, rgba('#fff4c0', 0.5 + 0.5 * k.mf.beat));
    for (let i = 0; i < 5; i++) k.line(-0.4 + i * 0.2, 0, -0.38 + i * 0.2, 0.15, 0.03, GREEN);
    k.box(-0.36, h * 0.82, 0.72, 0.03, rgba(k.accent, 0.5 + 0.5 * k.mf.kick));
  },
  // an old television in the grass, a flower grown out of its screen, nodding on the beat
  lmTV(k, o) {
    const h = o.h;
    k.round(-0.36, 0, 0.72, h * 0.8, 0.06, '#8a6a4a', k.accent, 0.03);
    k.plain();
    k.round(-0.27, h * 0.12, 0.42, h * 0.55, 0.05, '#3a4a3a');
    k.disc(0.24, h * 0.55, 0.035, '#2a2a2a');
    k.disc(0.24, h * 0.35, 0.035, '#2a2a2a');
    const nod = 0.04 * k.mf.beat;
    k.line(-0.06, h * 0.4, -0.06 + nod, h * 1.05, 0.025, GREEN);
    k.poly([[-0.06, h * 0.6], [0.08, h * 0.7], [-0.04, h * 0.66]], LEAF);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      k.disc(-0.06 + nod + Math.cos(a) * 0.07, h * 1.08 + Math.sin(a) * 0.07, 0.05, '#fff4a0');
    }
    k.disc(-0.06 + nod, h * 1.08, 0.04, '#ff9a2a');
  },
  // a garland of vines hung across, leaves on it, flowers opening on the kick
  lmVines(k) {
    hanging(k, 1.7, 1.5, '#4a8a2a', 0.03);
    k.plain();
    k.line(-0.95, 1.7, 0, 1.38, 0.05, '#3a7a2a');
    k.line(0, 1.38, 0.95, 1.7, 0.05, '#3a7a2a');
    for (let i = 0; i < 9; i++) {
      const x = -0.85 + i * 0.21,
        y = 1.38 + Math.abs(x) * 0.33;
      k.poly([[x, y], [x + 0.1, y - 0.12], [x + 0.03, y - 0.15]], LEAF);
      if (i % 2) k.disc(x, y - 0.06, 0.03 + 0.03 * k.mf.kick, '#ff8ad0');
    }
    k.box(-0.8, 1.12, 1.6, 0.03, rgba(k.accent, 0.4 + 0.6 * k.mf.kick));
  },
  // a branch of an apple tree hung across, apples on it bobbing on the bass
  lmBranch(k) {
    hanging(k, 1.6, 1.4, '#5a3a1a', 0.025);
    k.line(-0.95, 1.55, 0.95, 1.45, 0.09, '#5a3a1a');
    k.plain();
    for (let i = 0; i < 8; i++) {
      const x = -0.8 + i * 0.23,
        y = 1.48 - (i % 2) * 0.08;
      k.poly([[x, y], [x + 0.12, y - 0.05], [x + 0.05, y - 0.13]], GREEN);
      if (i % 3 === 1) k.disc(x + 0.05, y - 0.2 - 0.02 * k.mf.bass, 0.07, RED);
    }
    k.box(-0.85, 1.12, 1.7, 0.03, rgba(k.accent, 0.4 + 0.6 * k.mf.kick));
  },
  // a window in its frame standing in the field, ivy over it, the sky in its glass: breaks as glass
  lmWindow(k, o) {
    k.box(-0.18, 0, 0.36, o.h, rgba('#bfe4ff', 0.55), k.accent, 0.03);
    k.plain();
    k.box(-0.18, o.h * 0.5, 0.36, 0.03, '#f0ece4');
    k.box(-0.015, 0, 0.03, o.h, '#f0ece4');
    k.line(-0.12, o.h * 0.9, 0.1, o.h * 0.6, 0.02, rgba('#ffffff', 0.6));
    for (let i = 0; i < 4; i++) k.poly([[-0.18, o.h * (0.2 + i * 0.2)], [-0.06, o.h * (0.25 + i * 0.2)], [-0.14, o.h * (0.3 + i * 0.2)]], GREEN);
  },
  // a wall of old bricks under moss, laid as far as the brush has got
  lmWall(k, o) {
    const rr = mulberry(Math.round(o.t * 1000));
    courses(k, o, 8, 0.42, () => (rr() < 0.3 ? '#6aa83a' : rr() < 0.6 ? '#b0684a' : '#c88060'));
  },
  // an old pipe grown over with ivy to swing on
  lmPipe(k) {
    hanging(k, 2.14, 0.9, '#4a8a2a', 0.03);
    k.round(-0.72, 2.04, 1.44, 0.11, 0.05, '#8a8a8a');
    k.frame(-0.72, 2.04, 1.44, 0.11, rgba(k.T.hold, 0.9), 0.025);
    k.plain();
    for (let i = 0; i < 6; i++) k.poly([[-0.6 + i * 0.24, 2.13], [-0.5 + i * 0.24, 2.24], [-0.44 + i * 0.24, 2.12]], LEAF);
    for (const x of [-0.45, 0, 0.45]) k.box(x - 0.04, 2.02, 0.08, 0.15, rgba(k.T.hold, 0.4 + 0.6 * k.mf.beat));
  },
  lmSaw: saw('#5a5e64', '#e8ecf0'),
  lmThorns: spikes('#3a6a2a', '#d8f0a0'),
  lmSpore: mine('#e8e4d0', '#ffffff'),
  lmBees: hornetnest('#c89a4a', GOLD),
  lmVine: vineknot('#3a7a2a', '#d8ff7a'),
  lmGlass: glassburst('#e8e4dc', '#bfe4ff'),
};
