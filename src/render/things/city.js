// The city's obstacles: rooftop units and crates to jump, scaffolding, a hanging sign and a shop shutter to slide
// under, a shop window and a brick wall to kick through, a crane's bar to swing on, ledges of AC units and signs.
import { mulberry } from '../../rng.js';
import { rgba } from '../util.js';
import { courses, fanBox, hanging, ledge } from './kit.js';

export default {
  ac: fanBox('#c9ccd2'),
  vent: fanBox('#2a3a52'),
  crate(k, o) {
    k.box(-0.3, 0, 0.6, o.h, '#6a4426', k.accent, 0.035);
    k.plain();
    k.line(-0.3, 0, 0.3, o.h, 0.035, '#3a2412');
    k.line(-0.3, o.h, 0.3, 0, 0.035, '#3a2412');
  },
  // a scaffold's pipes across, its warning lamp on the kick
  scaffold(k) {
    k.plain();
    k.line(-0.6, 1.05, -0.6, k.sky, 0.04, '#9aa0a8');
    k.line(0.6, 1.05, 0.6, k.sky, 0.04, '#9aa0a8');
    k.glow();
    k.box(-0.65, 1.05, 1.3, 0.1, '#c9c9c9', k.accent, 0.02);
    k.line(-0.6, 1.15, 0.6, 1.7, 0.03, '#9aa0a8');
    k.disc(0.5, 1.1, 0.05, rgba('#ffb21e', 0.4 + 0.6 * k.mf.kick));
  },
  sign(k) {
    hanging(k, 1.45, 0.6);
    k.box(-0.55, 1.05, 1.1, 0.42, '#14202e', k.accent, 0.03);
    k.plain();
    for (let i = 0; i < 3; i++) k.box(-0.42 + i * 0.3, 1.19, 0.22, 0.14, rgba(k.T.slide, 0.5 + 0.5 * k.mf.kick));
  },
  shutter(k) {
    k.plain();
    k.box(-0.5, 1.05, 1.0, 8, '#7c858c', '#3a4248', 0.02);
    for (let y = 1.15; y < 6; y += 0.12) k.line(-0.5, y, 0.5, y, 0.012, '#4a5258');
    k.box(-0.5, 1.05, 1.0, 0.06, rgba('#ff4f5c', 0.6 + 0.4 * k.mf.kick));
  },
  // a shop window, its glints sliding on the hats
  glass(k, o) {
    k.box(-0.14, 0, 0.28, o.h, rgba('#9fe8ff', 0.22 + 0.2 * k.mf.kick), k.accent, 0.03);
    k.plain();
    const g = (k.t * 0.8 + k.mf.hat) % 1;
    k.line(-0.1, o.h * g, 0.1, o.h * g + 0.25, 0.025, 'rgba(255,255,255,0.7)');
    k.box(-0.18, 0, 0.36, 0.08, '#2a2f3a');
    k.box(-0.18, o.h - 0.06, 0.36, 0.06, '#2a2f3a');
  },
  bricks(k, o) {
    const rr = mulberry(Math.round(o.t * 1000));
    courses(k, o, 14, 0.4, () => (rr() < 0.5 ? '#b5523a' : '#9a4430'));
  },
  crane(k) {
    hanging(k, 2.12, 0.9);
    k.box(-0.7, 2.05, 1.4, 0.09, '#d0d0d0', rgba(k.T.hold, 0.9), 0.025);
    k.box(-0.7, 2.14, 0.14, 0.08, rgba('#ffb21e', 0.4 + 0.6 * k.mf.kick));
  },
  acledge: ledge('#c9ccd2'),
  signledge: ledge('#14202e'),
};
