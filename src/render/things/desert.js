// The desert's obstacles: cacti, boulders and rusty drums to jump, a wooden sign, washing on a line and a rib cage of
// old bones hung on ropes to slide under, an adobe wall and a plank fence to kick through, a rope to swing on, ledges of rock and
// sandstone.
import { mulberry } from '../../rng.js';
import { rgba } from '../util.js';
import { courses, hanging } from './kit.js';

export default {
  cactus(k, o) {
    k.round(-0.08, 0, 0.16, o.h + 0.25, 0.08, '#3f7a3a');
    k.round(-0.28, o.h * 0.35, 0.12, o.h * 0.5, 0.06, '#3f7a3a');
    k.round(0.16, o.h * 0.5, 0.12, o.h * 0.45, 0.06, '#3f7a3a');
    k.plain();
    k.disc(0, o.h + 0.27, 0.05, rgba('#ff5ea8', 0.5 + 0.5 * k.mf.kick));
  },
  boulder(k, o) {
    k.round(-0.35, 0, 0.7, o.h, o.h * 0.45, '#b07a52');
    k.plain();
    k.line(-0.25, o.h * 0.3, 0.25, o.h * 0.35, 0.02, '#8a5a3a');
    k.line(-0.2, o.h * 0.65, 0.2, o.h * 0.62, 0.02, rgba(k.T.jump, 0.4 + 0.6 * k.mf.kick));
  },
  drum(k, o) {
    k.round(-0.25, 0, 0.5, o.h, 0.06, '#8a4a2a');
    k.plain();
    for (const y of [0.12, o.h - 0.12]) k.box(-0.25, y - 0.025, 0.5, 0.05, '#4a2a18');
    k.disc(0, o.h * 0.55, 0.07, rgba('#ffe14d', 0.5 + 0.5 * k.mf.kick));
  },
  woodsign(k) {
    hanging(k, 1.5, 0.6, '#6a4a2a', 0.03);
    k.box(-0.55, 1.05, 1.1, 0.45, '#9a6a3a', k.accent, 0.03);
    k.plain();
    k.line(-0.4, 1.3, 0.3, 1.3, 0.04, rgba('#2a1a0a', 0.8));
    k.poly([[0.3, 1.38], [0.45, 1.3], [0.3, 1.22]], rgba('#2a1a0a', 0.8));
  },
  // washing on a line, flapping with the bass
  cloth(k) {
    hanging(k, 1.58, 1.4, '#8a6a42', 0.025);
    k.plain();
    k.line(-0.9, 1.6, 0.9, 1.55, 0.03, '#ddd');
    k.glow();
    ['#e05a4a', '#f2e3c6', '#4a8ac8'].forEach((c, i) => {
      const x = -0.6 + i * 0.45,
        sw = 0.08 * Math.sin(k.t * 4 + i) * (0.5 + k.mf.bass);
      k.poly([[x, 1.58], [x + 0.35, 1.57], [x + 0.35 + sw, 1.05], [x + sw, 1.07]], c);
    });
  },
  bones(k) {
    hanging(k, 1.53, 1.1, '#6a5a4a', 0.025);
    k.plain();
    k.line(-0.7, 1.55, 0.7, 1.5, 0.08, '#e8dcc0');
    k.glow();
    for (let i = 0; i < 5; i++) {
      const x = -0.6 + i * 0.3;
      k.line(x, 1.52, x + 0.08, 1.05 + 0.05 * k.mf.kick, 0.04, '#e8dcc0');
    }
  },
  adobe(k, o) {
    const rr = mulberry(Math.round(o.t * 1000));
    courses(k, o, 12, 0.42, () => (rr() < 0.5 ? '#c98a5a' : '#b5784a'));
  },
  fence(k, o) {
    k.plain();
    const n = Math.ceil(7 * k.u);
    for (let i = 0; i < n; i++) k.box(-0.15, i * (o.h / 7), 0.3, o.h / 7 - 0.03, i % 2 ? '#8a5a32' : '#a06a3c');
    k.glow();
    k.frame(-0.15, 0, 0.3, (o.h * n) / 7, k.accent, 0.03);
  },
  rope(k) {
    hanging(k, 2.12, 0.9, '#8a6a42', 0.03);
    k.line(-0.7, 2.1, 0.7, 2.08, 0.06, '#c8a06a');
    for (let i = -2; i <= 2; i++) k.disc(i * 0.28, 2.09, 0.04, rgba(k.T.hold, 0.4 + 0.6 * k.mf.hat * 2));
  },
  rockledge(k) {
    k.poly([[-0.64, 0], [-0.5, 0.4], [0.1, 0.48], [0.6, 0.35], [0.64, 0]], '#7a5a4a');
    k.plain();
    k.line(-0.4, 0.3, 0.3, 0.38, 0.03, rgba(k.T.jump, 0.4 + 0.6 * k.mf.kick));
  },
  sandledge(k) {
    k.box(-0.64, 0, 1.28, 0.42, '#c98a52', k.accent, 0.03);
    k.plain();
    for (let i = 0; i < 3; i++) k.box(-0.64, 0.08 + i * 0.12, 1.28, 0.04, i % 2 ? '#a86a3a' : '#e0a870');
  },
};
