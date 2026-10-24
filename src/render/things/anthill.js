// The Anthill's obstacles (places/anthill.js), at an ant's height in gold and orchid: a grain of wheat as big as a
// boulder, a block of clay the ants are building with (its plan glowing blue on it) and a spool of spider silk to jump;
// a straw carried across overhead by two ants, an arch of clay with its doorway lit and a hanging root to slide under; a
// wall of wax comb (its cells lit gold, breaking as glass) and a wall of clay courses to kick through; a twig to swing on;
// and its hazards in chitin, amber and thorn: mandibles snapping, a saw of beetle shell, pine needles, a beam of the
// plan's blue light, a beetle's wings beating, a drip of resin.
import { mulberry } from '../../rng.js';
import { rgba } from '../util.js';
import { courses, hanging } from './kit.js';
import { fan, jaws, laserpair, lavablob, saw, spikes } from './hazards.js';

const GOLD = '#ffc23a',
  CLAY = '#b0602a',
  CLAY2 = '#8a4a20',
  CHITIN = '#2a140a',
  STRAW = '#e8c070',
  PLAN = '#5ad8ff',
  ORCHID = '#e05ac8';

export default {
  // a grain of wheat, golden, its crease down it, lit along its top on the kick
  ahGrain(k, o) {
    const h = o.h;
    k.round(-0.34, 0, 0.68, h * 0.95, 0.3, '#d8a040', k.accent, 0.03);
    k.plain();
    k.line(0, h * 0.1, 0.02, h * 0.85, 0.035, '#a06a20');
    k.round(-0.22, h * 0.55, 0.12, h * 0.3, 0.06, rgba('#fff0c0', 0.5));
    k.line(0.1, h * 0.92, 0.2, h * 1.05, 0.02, '#c89040');
    k.box(-0.24, h * 0.9, 0.48, 0.03, rgba(k.accent, 0.6 + 0.4 * k.mf.kick));
  },
  // a block of clay set for building, its plan drawn on it in glowing blue lines (pulsing on the beat)
  ahBlock(k, o) {
    const h = o.h;
    k.box(-0.36, 0, 0.72, h, CLAY, k.accent, 0.03);
    k.plain();
    k.box(-0.36, h * 0.48, 0.72, 0.03, CLAY2);
    const a = 0.45 + 0.5 * k.mf.beat;
    k.frame(-0.24, h * 0.15, 0.48, h * 0.7, rgba(PLAN, a), 0.02);
    k.line(-0.24, h * 0.15, 0.24, h * 0.85, 0.015, rgba(PLAN, a));
    k.line(-0.24, h * 0.85, 0.24, h * 0.15, 0.015, rgba(PLAN, a));
    k.box(-0.34, h * 0.94, 0.68, 0.05, rgba(k.accent, 0.5 + 0.5 * k.mf.kick));
  },
  // a spool of spider silk, its thread glinting on the hats
  ahSpool(k, o) {
    const h = o.h;
    k.box(-0.36, 0, 0.72, 0.1, '#6a3a1a', k.accent, 0.03);
    k.box(-0.36, h - 0.1, 0.72, 0.1, '#6a3a1a', k.accent, 0.03);
    k.plain();
    k.box(-0.28, 0.1, 0.56, h - 0.2, '#e8e4dc');
    for (let i = 1; i < 6; i++) k.line(-0.28, 0.1 + ((h - 0.2) * i) / 6, 0.28, 0.12 + ((h - 0.2) * i) / 6, 0.012, rgba('#a8a4a0', 0.6 + 0.4 * k.mf.hat));
    k.line(0.28, h * 0.5, 0.5, 0.02, 0.012, '#e8e4dc');
    k.box(-0.34, h - 0.05, 0.68, 0.04, rgba(k.accent, 0.5 + 0.5 * k.mf.kick));
  },
  // a straw hung across on two threads of silk, an ant walking along it with a leaf, stepping on the beat
  ahBeam(k) {
    const step = Math.sin(k.t * 9) * 0.03,
      x = -0.6 + ((k.t * 0.25) % 1.2);
    hanging(k, 1.34, 1.5, '#e8e4dc', 0.015);
    k.round(-0.95, 1.08, 1.9, 0.26, 0.12, STRAW, k.accent, 0.03);
    k.plain();
    for (const q of [-0.45, 0.15, 0.6]) k.line(q, 1.08, q + 0.04, 1.34, 0.02, '#a07a30');
    k.disc(x - 0.12, 1.45 + step, 0.08, CHITIN);
    k.disc(x + 0.01, 1.46, 0.05, CHITIN);
    k.disc(x + 0.12, 1.47 + step, 0.06, CHITIN);
    for (const d of [-0.1, 0, 0.1]) k.line(x + d, 1.45, x + d + step * 3, 1.34, 0.015, CHITIN);
    k.line(x + 0.16, 1.5, x + 0.26, 1.62, 0.01, CHITIN);
    k.poly([[x - 0.25, 1.52], [x + 0.05, 1.7], [x + 0.1, 1.55]], '#5aa83a');
    k.box(-0.9, 1.06, 1.8, 0.03, rgba(k.accent, 0.5 + 0.5 * k.mf.kick));
  },
  // an arch of clay over the way, its doorway's edge lit gold
  ahArch(k) {
    hanging(k, 1.8, 1.3, '#6a3a1a', 0.03);
    k.round(-0.85, 1.1, 1.7, 0.75, 0.2, CLAY, k.accent, 0.03);
    k.plain();
    for (const x of [-0.5, 0, 0.5]) k.disc(x, 1.45, 0.12, rgba(GOLD, 0.45 + 0.5 * k.mf.beat));
    k.box(-0.8, 1.1, 1.6, 0.04, rgba(k.accent, 0.5 + 0.5 * k.mf.kick));
  },
  // a root hung across from above, hairy, swaying on the bass
  ahRoot(k) {
    const sw = 0.04 * Math.sin(k.t * 1.7) * (0.5 + k.mf.bass);
    hanging(k, 1.6, 1.4, '#8a6a4a', 0.04);
    k.line(-0.9, 1.5, 0.9, 1.35 + sw, 0.14, '#a07a4a');
    k.plain();
    for (let i = 0; i < 8; i++) {
      const x = -0.8 + i * 0.22;
      k.line(x, 1.43, x + 0.05 + sw, 1.16 + 0.05 * (i % 3), 0.015, '#c8a070');
    }
    k.box(-0.85, 1.12, 1.7, 0.03, rgba(k.accent, 0.4 + 0.6 * k.mf.kick));
  },
  // a wall of wax comb, its cells lit gold on the beat; kicked through, it breaks as glass
  ahComb(k, o) {
    k.box(-0.18, 0, 0.36, o.h, rgba('#e8a830', 0.7), k.accent, 0.03);
    k.plain();
    for (let r = 0; r < 6; r++)
      for (let c = 0; c < 2; c++) {
        const x = -0.09 + c * 0.18 + (r % 2 ? 0.045 : -0.045),
          y = o.h * (0.1 + r * 0.15);
        k.disc(x, y, 0.07, rgba((r + c) % 3 ? '#ffd870' : GOLD, 0.55 + 0.4 * k.mf.beat));
      }
  },
  // a wall of clay courses, laid as far as the brush has got, a course of orchid-pink clay now and then
  ahClay(k, o) {
    const rr = mulberry(Math.round(o.t * 1000));
    courses(k, o, 8, 0.42, () => (rr() < 0.12 ? ORCHID : rr() < 0.5 ? CLAY : '#c8783a'));
  },
  // a twig to swing on, hung on two silk threads, a leaf on it
  ahTwig(k) {
    hanging(k, 2.14, 0.9, '#e8e4dc', 0.02);
    k.round(-0.72, 2.04, 1.44, 0.11, 0.05, '#7a4a22');
    k.frame(-0.72, 2.04, 1.44, 0.11, rgba(k.T.hold, 0.9), 0.025);
    k.plain();
    k.poly([[0.3, 2.15], [0.55, 2.35], [0.62, 2.18]], '#5aa83a');
    for (const x of [-0.45, 0, 0.45]) k.box(x - 0.04, 2.02, 0.08, 0.15, rgba(k.T.hold, 0.4 + 0.6 * k.mf.beat));
  },
  ahJaws: jaws(CHITIN, '#e8c070'),
  ahSaw: saw('#3a1a0a', '#e8a830'),
  ahNeedles: spikes('#5a3a1a', '#a8c060'),
  ahLaser: laserpair('#3a1a0a', PLAN),
  ahWings: fan(CHITIN, '#d8ecf4'),
  ahResin: lavablob('#6a3a0a', '#ffb030'),
};
