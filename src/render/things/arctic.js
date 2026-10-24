// The arctic's obstacles: a block of ice, a sled and a fuel drum to jump; icicles, a frozen arch and a snow cornice to
// slide under; a wall of ice and a wall of packed snow to kick through; an ice axe's rope to swing on; ledges of ice
// shelf and snow.
import { mulberry } from '../../rng.js';
import { rgba } from '../util.js';
import { courses, hanging, ledge } from './kit.js';

export default {
  // a block of ice, light caught inside it on the kick
  iceblock(k, o) {
    k.box(-0.34, 0, 0.68, o.h, rgba('#bfe8ff', 0.85), k.accent, 0.035);
    k.plain();
    k.line(-0.2, o.h * 0.2, 0.15, o.h * 0.8, 0.02, rgba('#ffffff', 0.5 + 0.5 * k.mf.kick));
  },
  sled(k, o) {
    k.box(-0.4, o.h * 0.3, 0.8, o.h * 0.5, '#b0302a', k.accent, 0.03);
    k.plain();
    k.line(-0.45, 0.05, 0.45, 0.05, 0.04, '#9aa0a8');
    k.line(0.45, 0.05, 0.5, 0.2, 0.04, '#9aa0a8');
    k.box(-0.3, o.h * 0.8, 0.6, o.h * 0.2, '#e8e0d0');
  },
  fueldrum(k, o) {
    k.round(-0.25, 0, 0.5, o.h, 0.06, '#c88a2a');
    k.plain();
    for (const y of [0.12, o.h - 0.12]) k.box(-0.25, y - 0.025, 0.5, 0.05, '#6a4a18');
    k.disc(0, o.h * 0.55, 0.07, rgba(k.T.jump, 0.5 + 0.5 * k.mf.kick));
  },
  // icicles down from an overhang, their tips just over his head, dripping light on the hats
  icicles(k) {
    k.box(-0.75, 1.5, 1.5, 0.2, '#dff4ff', k.accent, 0.02);
    k.plain();
    for (let i = 0; i < 8; i++) {
      const x = -0.65 + i * 0.185,
        tip = 1.05 + 0.15 * ((i * 7) % 3) / 2;
      k.poly([[x - 0.06, 1.5], [x + 0.06, 1.5], [x, tip]], rgba('#bfe8ff', 0.9));
      k.disc(x, tip - 0.05 - ((k.t * 2 + i * 0.3) % 1) * 0.2, 0.02, rgba('#ffffff', 0.4 + k.mf.hat));
    }
  },
  frozenarch(k) {
    k.plain();
    k.box(-0.8, 1.15, 1.6, 0.35, rgba('#9ad8ff', 0.9), k.accent, 0.03);
    k.glow();
    k.line(-0.6, 1.3, 0.6, 1.3, 0.03, rgba('#ffffff', 0.4 + 0.4 * k.mf.beat));
  },
  cornice(k) {
    k.plain();
    k.poly([[-0.8, 1.7], [0.8, 1.7], [0.6, 1.05], [0.2, 1.15], [-0.3, 1.05], [-0.7, 1.2]], '#f2f8ff');
    k.glow();
    k.line(-0.7, 1.08, 0.6, 1.08, 0.03, rgba(k.accent, 0.6 + 0.4 * k.mf.kick));
  },
  icewall(k, o) {
    k.box(-0.15, 0, 0.3, o.h, rgba('#9fe0ff', 0.35 + 0.2 * k.mf.kick), k.accent, 0.03);
    k.plain();
    for (let i = 0; i < 3; i++) k.line(-0.12, o.h * (0.2 + i * 0.3), 0.12, o.h * (0.3 + i * 0.3), 0.02, 'rgba(255,255,255,0.6)');
  },
  snowwall(k, o) {
    const rr = mulberry(Math.round(o.t * 1000));
    courses(k, o, 9, 0.44, () => (rr() < 0.5 ? '#eef4fa' : '#d8e4ee'));
  },
  icerope(k) {
    hanging(k, 2.12, 0.9, '#c8b88a', 0.03);
    k.box(-0.7, 2.05, 1.4, 0.08, '#c8b88a', rgba(k.T.hold, 0.9), 0.025);
  },
  iceledge: ledge('#9ad8ff', true),
  snowledge: ledge('#e8f0f8'),
};
