// The forest's obstacles: logs, rocks and stumps to jump, a branch, a beehive and an arch of vines to slide under, a
// wall of logs and a thorn hedge to kick through, a vine to swing on, ledges of branches and moss.
import { rgba } from '../util.js';
import { courses } from './kit.js';

export default {
  log(k, o) {
    k.round(-0.42, 0, 0.84, o.h, o.h / 2, '#5a3a20');
    k.plain();
    k.disc(0.3, o.h / 2, o.h * 0.42, '#c8935a');
    k.disc(0.3, o.h / 2, o.h * 0.22, rgba('#7dff6a', 0.3 + 0.6 * k.mf.kick));
  },
  rock(k, o) {
    k.poly([[-0.38, 0], [-0.3, o.h * 0.7], [-0.05, o.h], [0.25, o.h * 0.85], [0.38, 0]], '#4e4a52');
    k.plain();
    k.line(-0.1, o.h * 0.75, 0.15, o.h * 0.5, 0.025, rgba(k.T.jump, 0.4 + 0.6 * k.mf.kick));
  },
  stump(k, o) {
    k.box(-0.25, 0, 0.5, o.h, '#4a2e18', k.accent, 0.03);
    k.plain();
    k.box(-0.25, o.h - 0.06, 0.5, 0.06, '#b07a44');
    k.disc(0.18, o.h + 0.06, 0.07, rgba('#5ef0ff', 0.5 + k.mf.hat * 1.5));
  },
  branch(k) {
    k.plain();
    k.line(-0.7, 1.25, 0.7, 1.15, 0.12, '#3e2814');
    k.line(-0.2, 1.22, -0.35, 1.0, 0.05, '#3e2814');
    k.glow();
    for (const [x, y] of [[-0.5, 1.32], [0, 1.3], [0.5, 1.25]]) k.disc(x, y, 0.14 + 0.03 * k.mf.bass, '#2f7a3a');
  },
  // a hive hanging off a bough, its bees buzzing round it on the hats
  beehive(k) {
    k.plain();
    k.line(-0.8, 1.75, 0.8, 1.7, 0.1, '#3e2814');
    k.line(0, 1.72, 0, 1.55, 0.03, '#3e2814');
    k.glow();
    for (let i = 0; i < 4; i++) k.round(-0.25 + i * 0.03, 1.05 + i * 0.12, 0.5 - i * 0.06, 0.13, 0.06, i % 2 ? '#c99a3a' : '#e0b04a');
    k.plain();
    for (let i = 0; i < 5; i++) {
      const a = k.t * 9 + i * 1.3;
      k.disc(Math.cos(a) * (0.4 + 0.2 * k.mf.hat * 3), 1.3 + Math.sin(a * 1.3) * 0.3, 0.025, '#ffd84a');
    }
  },
  // a mossy branch hung across the way from vines out of the canopy (no posts to the ground: a gate with legs reads as
  // a wall, not a thing to slide under)
  vinearch(k) {
    k.plain();
    for (const x of [-0.55, 0.55]) k.line(x, 1.1, x * 0.9, k.sky, 0.04, '#2f5a22');
    k.glow();
    k.line(-0.6, 1.1, 0.6, 1.1, 0.1, '#2f6a2a');
    for (let i = -2; i <= 2; i++) k.line(i * 0.25, 1.1, i * 0.25 + 0.05 * Math.sin(k.t * 2 + i), 1.1 - 0.12 - 0.08 * k.mf.bass, 0.03, '#3f8a3a');
  },
  logwall(k, o) {
    courses(k, o, 9, 0.36, r => (r % 2 ? '#6a4426' : '#7a5230'), false);
  },
  // a thorn hedge, its berries glowing on the kick
  thorns(k, o) {
    k.plain();
    const n = Math.ceil(8 * k.u);
    for (let i = 0; i < n; i++) {
      const y = (i + 0.5) * (o.h / 8);
      k.disc(0, y, 0.22, i % 2 ? '#24502a' : '#2c5e30');
      k.disc(0.08 * (i % 2 ? 1 : -1), y + 0.05, 0.04, rgba('#ff3b6a', 0.4 + 0.6 * k.mf.kick));
    }
  },
  vine(k) {
    k.plain();
    k.line(-0.55, 2.12, -0.5, k.sky, 0.04, '#2f5a22');
    k.line(0.55, 2.12, 0.5, k.sky, 0.04, '#2f5a22');
    k.glow();
    k.line(-0.7, 2.1, 0.7, 2.1, 0.08, '#4a8a2e');
    for (let i = -2; i <= 2; i++) k.disc(i * 0.28, 2.02, 0.06, rgba('#d8ff6a', 0.4 + 0.6 * k.mf.hat * 2));
  },
  branchledge(k) {
    k.plain();
    k.line(-0.64, 0.2, 0.64, 0.25, 0.14, '#3e2814');
    k.glow();
    for (const x of [-0.4, 0.1, 0.5]) k.disc(x, 0.36, 0.16 + 0.03 * k.mf.bass, '#2f7a3a');
  },
  mossledge(k) {
    k.round(-0.64, 0, 1.28, 0.4, 0.15, '#4a4a42');
    k.plain();
    k.round(-0.6, 0.3, 1.2, 0.15, 0.08, '#3f7a3a');
    for (const x of [-0.3, 0.2]) k.disc(x, 0.48, 0.06, rgba('#5ef0ff', 0.4 + 0.6 * k.mf.kick));
  },
};
