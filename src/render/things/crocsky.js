// The Swallowed Sky's obstacles (places/crocsky.js), jungle and swamp: a mossy log, a fly agaric and a stone frog to
// jump; a hanging scroll of papyrus (painted only with waves, no writing), a mangrove's root arch and a curtain of vines
// to slide under; a wall of tied reeds (painted in) and the glass of an aquarium (glass: "we'll smash this aquarium")
// to kick through; a branch to swing on; and its hazards: a crocodile's jaws snapping, thorns, a puffball, a hornets'
// nest, a vine knot, a saw of turtle shell.
import { mulberry } from '../../rng.js';
import { rgba } from '../util.js';
import { courses, hanging } from './kit.js';
import { hornetnest, jaws, mine, saw, spikes, vineknot } from './hazards.js';

const MOSS = '#3a8a3a',
  WOOD = '#5a3a1e',
  AGARIC = '#e8202a',
  CROC = '#2a5a2a',
  PAP = '#e8d8a0',
  AQUA = '#4ae0d0';

export default {
  // a mossy log on its side, a fern out of it
  crLog(k, o) {
    const h = o.h;
    k.round(-0.4, 0, 0.8, h * 0.8, 0.2, WOOD, k.accent, 0.03);
    k.plain();
    k.disc(0.3, h * 0.4, h * 0.3, '#8a6a3a');
    k.disc(0.3, h * 0.4, h * 0.15, '#6a4a28');
    k.round(-0.4, h * 0.65, 0.6, h * 0.2, 0.08, MOSS);
    k.line(-0.15, h * 0.8, -0.3, h * 1.1, 0.025, MOSS);
    k.line(-0.15, h * 0.8, 0.0, h * 1.12, 0.025, MOSS);
    k.box(-0.36, h * 0.78, 0.6, 0.03, rgba(k.accent, 0.5 + 0.5 * k.mf.kick));
  },
  // a fly agaric, its spots pulsing on the beat
  crAgaric(k, o) {
    const h = o.h;
    k.round(-0.1, 0, 0.2, h * 0.6, 0.06, '#f4ecd8', k.accent, 0.03);
    k.plain();
    k.poly([[-0.42, h * 0.55], [-0.3, h * 0.85], [0, h], [0.3, h * 0.85], [0.42, h * 0.55]], AGARIC);
    for (const [x, y] of [[-0.2, 0.7], [0.05, 0.86], [0.24, 0.68]]) k.disc(x, h * y, 0.04 + 0.015 * k.mf.beat, '#ffffff');
    k.box(-0.36, h * 0.53, 0.72, 0.03, rgba(k.accent, 0.5 + 0.5 * k.mf.kick));
  },
  // a stone frog sitting, moss on its back, its eyes lit on the beat
  crFrog(k, o) {
    const h = o.h;
    k.round(-0.38, 0, 0.76, h * 0.7, 0.25, '#6a7a6a', k.accent, 0.03);
    k.plain();
    for (const x of [-0.18, 0.18]) {
      k.disc(x, h * 0.75, 0.12, '#6a7a6a');
      k.disc(x, h * 0.77, 0.06, rgba('#ffd23a', 0.5 + 0.5 * k.mf.beat));
    }
    k.line(-0.18, h * 0.35, 0.18, h * 0.35, 0.025, '#3a4a3a');
    k.round(-0.3, h * 0.55, 0.3, h * 0.12, 0.05, MOSS);
  },
  // a scroll of papyrus hung across, painted only with waves and a reed (no writing), curling at its ends
  crScroll(k) {
    hanging(k, 1.75, 1.5, '#8a6a3a', 0.025);
    k.box(-0.9, 1.1, 1.8, 0.62, PAP, k.accent, 0.03);
    k.plain();
    k.round(-0.98, 1.08, 0.12, 0.66, 0.05, '#c8b070');
    k.round(0.86, 1.08, 0.12, 0.66, 0.05, '#c8b070');
    for (let i = 0; i < 3; i++) {
      const y = 1.25 + i * 0.12,
        w = 0.02 * Math.sin(k.t * 2 + i);
      for (let q = 0; q < 6; q++) k.line(-0.75 + q * 0.25, y + w, -0.62 + q * 0.25, y + 0.05 + w, 0.02, rgba('#2a6a8a', 0.8));
    }
    k.line(0.5, 1.2, 0.55, 1.62, 0.02, '#3a7a2a');
    k.box(-0.85, 1.1, 1.7, 0.03, rgba(k.accent, 0.4 + 0.6 * k.mf.kick));
  },
  // a mangrove's root hung across in an arch from the canopy, moss on it
  crRoot(k) {
    hanging(k, 1.7, 1.6, WOOD, 0.05);
    k.plain();
    k.line(-0.95, 1.7, -0.5, 1.2, 0.1, WOOD);
    k.line(-0.5, 1.2, 0.5, 1.2, 0.1, WOOD);
    k.line(0.5, 1.2, 0.95, 1.7, 0.1, WOOD);
    for (const x of [-0.5, 0, 0.45]) k.disc(x, 1.27 + 0.02 * k.mf.kick, 0.1, MOSS);
    k.box(-0.8, 1.1, 1.6, 0.03, rgba(k.accent, 0.4 + 0.6 * k.mf.kick));
  },
  // a curtain of vines across, flowers on them opening on the kick
  crVines(k) {
    hanging(k, 1.8, 1.6, MOSS, 0.03);
    k.plain();
    k.line(-0.95, 1.8, 0.95, 1.8, 0.06, WOOD);
    for (let i = 0; i < 9; i++) {
      const x = -0.85 + i * 0.21,
        sw = 0.03 * Math.sin(k.t * 1.6 + i),
        y = 1.15 + 0.08 * (i % 3);
      k.line(x, 1.8, x + sw, y, 0.025, MOSS);
      if (i % 2) k.disc(x + sw, y + 0.05, 0.03 + 0.03 * k.mf.kick, '#ff8ad0');
    }
    k.box(-0.85, 1.1, 1.7, 0.03, rgba(k.accent, 0.4 + 0.6 * k.mf.kick));
  },
  // a wall of reeds tied in bundles, painted in
  crReeds(k, o) {
    const rr = mulberry(Math.round(o.t * 1000));
    courses(k, o, 8, 0.42, () => (rr() < 0.5 ? '#c8a860' : '#a88a48'), false);
  },
  // the glass of an aquarium, water and a little fish in it: breaks as glass
  crAquarium(k, o) {
    k.box(-0.18, 0, 0.36, o.h, rgba('#8ae0e8', 0.5), k.accent, 0.03);
    k.plain();
    k.box(-0.16, o.h * 0.8, 0.32, 0.03, rgba('#ffffff', 0.6));
    const fy = o.h * (0.4 + 0.1 * Math.sin(k.t * 2));
    k.disc(0, fy, 0.05, '#ff8a2a');
    k.poly([[-0.04, fy], [-0.1, fy + 0.04], [-0.1, fy - 0.04]], '#ff8a2a');
    k.disc(0.05, o.h * 0.6 + ((k.t * 0.3) % 0.2), 0.015, rgba('#ffffff', 0.7));
  },
  // a branch to swing on, moss along it
  crBranch(k) {
    hanging(k, 2.14, 0.9, MOSS, 0.03);
    k.round(-0.72, 2.04, 1.44, 0.11, 0.05, WOOD);
    k.frame(-0.72, 2.04, 1.44, 0.11, rgba(k.T.hold, 0.9), 0.025);
    k.plain();
    k.box(-0.6, 2.13, 1.1, 0.04, MOSS);
    for (const x of [-0.45, 0, 0.45]) k.box(x - 0.04, 2.02, 0.08, 0.15, rgba(k.T.hold, 0.4 + 0.6 * k.mf.beat));
  },
  crJaws: jaws(CROC, '#f4f0dc'),
  crThorns: spikes('#3a2a1a', '#9ae04a'),
  crSpore: mine('#c8a070', '#f0e0b0'),
  crHornets: hornetnest('#8a6a3a', '#e8c040'),
  crVine: vineknot('#2a6a2a', '#c8ff6a'),
  crSaw: saw('#3a4a2a', AQUA),
};
