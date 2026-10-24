// The station's obstacles: cargo, gas canisters and a console to jump, a drone, an energy beam and a duct to slide
// under, a force field and an airlock door to kick through, a grab rail to swing on, ledges of panels and solar wings.
import { rgba } from '../util.js';
import { hanging, ledge } from './kit.js';

export default {
  cargo(k, o) {
    k.box(-0.32, 0, 0.64, o.h, '#3a4a5e', k.accent, 0.03);
    k.plain();
    k.box(-0.32, o.h * 0.4, 0.64, 0.05, '#f2c230');
    k.disc(0.2, o.h * 0.75, 0.04, rgba('#ff3b4f', 0.3 + 0.7 * k.mf.beat));
  },
  canister(k, o) {
    for (const x of [-0.2, 0.12]) k.round(x - 0.1, 0, 0.2, o.h, 0.09, '#c9ccd2');
    k.plain();
    for (const x of [-0.2, 0.12]) k.box(x - 0.1, o.h * 0.6, 0.2, 0.06, rgba(k.T.slide, 0.4 + 0.6 * k.mf.kick));
  },
  console(k, o) {
    k.poly([[-0.32, 0], [-0.32, o.h * 0.7], [0.32, o.h], [0.32, 0]], '#2a3346');
    k.plain();
    for (let i = 0; i < 4; i++) k.box(-0.24 + i * 0.13, o.h * 0.72 + i * 0.045, 0.08, 0.05, rgba(k.T.win[i % 3], 0.3 + 0.7 * (i / 4 < k.mf.stage ? k.mf.hat * 3 : 0.2)));
  },
  drone(k) {
    const y = 1.2 + 0.05 * k.mf.beat;
    k.plain();
    k.line(-0.5, y + 0.12, 0.5, y + 0.12, 0.03, '#888');
    k.glow(1.5);
    k.round(-0.3, y - 0.05, 0.6, 0.2, 0.08, '#2a3346');
    k.disc(0, y + 0.03, 0.06, rgba('#ff3b4f', 0.5 + 0.5 * k.mf.kick));
    k.plain();
    for (const x of [-0.5, 0.5]) k.line(x - 0.15 * Math.cos(k.t * 40), y + 0.16, x + 0.15 * Math.cos(k.t * 40), y + 0.16, 0.02, rgba('#ffffff', 0.4 + k.mf.hat));
  },
  beam(k) {
    k.plain();
    k.box(-0.65, 1.0, 0.12, 0.35, '#2a3346');
    k.box(0.53, 1.0, 0.12, 0.35, '#2a3346');
    k.glow(2);
    k.box(-0.53, 1.12 - 0.04 * k.mf.bass, 1.06, 0.12 + 0.08 * k.mf.bass, rgba(k.T.slide, 0.5 + 0.4 * k.mf.kick));
  },
  duct(k) {
    k.plain();
    k.box(-0.75, 1.05, 1.5, 0.35, '#3a4560', k.accent, 0.025);
    for (let x = -0.6; x < 0.7; x += 0.3) k.line(x, 1.1, x, 1.35, 0.015, '#1a2133');
    k.disc(0.6, 1.22, 0.05, rgba(k.T.slide, 0.4 + 0.6 * k.mf.beat));
  },
  field(k, o) {
    k.plain();
    k.box(-0.18, 0, 0.06, o.h, '#2a2f3a');
    k.box(0.12, 0, 0.06, o.h, '#2a2f3a');
    k.glow(1.5);
    k.box(-0.12, 0, 0.24, o.h, rgba(k.T.slide, 0.18 + 0.25 * k.mf.kick));
    for (let y = 0.1; y < o.h; y += 0.25) k.line(-0.12, y + 0.05 * Math.sin(k.t * 8 + y * 6 + k.mf.hat * 6), 0.12, y, 0.015, rgba(k.T.slide, 0.7));
  },
  airlock(k, o) {
    k.box(-0.18, 0, 0.36, o.h, '#4a5468', k.accent, 0.03);
    k.plain();
    for (let y = 0.3; y < o.h; y += 0.4) k.line(-0.18, y, 0.18, y + 0.2, 0.04, '#f2c230');
    k.disc(0, o.h * 0.8, 0.07, rgba('#ff3b4f', 0.4 + 0.6 * k.mf.beat));
  },
  handle(k) {
    hanging(k, 2.35, 1.2, '#3a4560', 0.05);
    k.plain();
    k.box(-0.75, 2.25, 1.5, 0.1, '#3a4560');
    k.glow(1.5);
    for (const x of [-0.6, 0.6]) k.line(x, 2.25, x, 2.1, 0.04, '#c9ccd2');
    k.line(-0.6, 2.1, 0.6, 2.1, 0.05, rgba(k.T.hold, 0.9));
  },
  panel: ledge('#2a3346'),
  solar(k) {
    k.box(-0.64, 0, 1.28, 0.3, '#1a2a5a', k.accent, 0.03);
    k.plain();
    for (let x = -0.56; x < 0.64; x += 0.16) k.line(x, 0.02, x, 0.28, 0.01, rgba(k.T.slide, 0.3 + 0.5 * k.mf.hat * 2));
  },
};
