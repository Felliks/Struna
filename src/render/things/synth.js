// The synthwave road's obstacles, all neon: pyramids, blocks and gates to jump, a laser, an arch and a ring of light
// to slide under, a hologram panel and a grid wall to kick through, a neon bar to swing on, neon and prism ledges.
import { rgba } from '../util.js';
import { courses, ledge } from './kit.js';

const neonLine = (k, x0, y0, x1, y1, w = 0.04) => k.line(x0, y0, x1, y1, w + 0.02 * k.mf.kick, k.accent);

export default {
  cone(k, o) {
    k.poly([[-0.3, 0], [0, o.h + 0.1], [0.3, 0]], rgba(k.T.jump, 0.25 + 0.3 * k.mf.kick));
    neonLine(k, -0.3, 0, 0, o.h + 0.1, 0.03);
    neonLine(k, 0, o.h + 0.1, 0.3, 0, 0.03);
  },
  block(k, o) {
    k.box(-0.3, 0, 0.6, o.h, rgba(k.T.jump, 0.25 + 0.3 * k.mf.kick), k.T.jump, 0.04);
  },
  gate(k, o) {
    neonLine(k, -0.3, 0, -0.3, o.h);
    neonLine(k, 0.3, 0, 0.3, o.h);
    neonLine(k, -0.38, o.h, 0.38, o.h, 0.06);
  },
  laser(k) {
    k.plain();
    k.box(-0.55, 1.0, 0.1, 0.6, '#2a2f3a');
    k.box(0.45, 1.0, 0.1, 0.6, '#2a2f3a');
    k.glow(2);
    k.line(-0.5, 1.15, 0.5, 1.15, 0.05 + 0.03 * Math.sin(k.t * 40) + 0.04 * k.mf.hat, k.T.slide);
  },
  arch(k) {
    k.glow(1.5);
    neonLine(k, -0.6, 0.85, -0.6, 1.1);
    neonLine(k, 0.6, 0.85, 0.6, 1.1);
    for (let i = 0; i < 6; i++) {
      const a0 = Math.PI - (i * Math.PI) / 6,
        a1 = Math.PI - ((i + 1) * Math.PI) / 6;
      k.line(Math.cos(a0) * 0.6, 1.1 + Math.sin(a0) * 0.35, Math.cos(a1) * 0.6, 1.1 + Math.sin(a1) * 0.35, 0.05, k.T.slide);
    }
  },
  // a ring of light hanging at head height, spinning with the hats
  ring(k) {
    k.plain();
    k.line(0, 1.6, 0, k.sky, 0.02, rgba(k.T.slide, 0.5));
    k.glow(2);
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI * 2 + k.spin * 0.3;
      pts.push([Math.cos(a) * 0.55, 1.3 + Math.sin(a) * 0.25]);
    }
    for (let i = 0; i < 16; i++) k.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 0.04, k.T.slide);
  },
  holo(k, o) {
    k.plain();
    k.box(-0.16, 0, 0.32, 0.1, '#2a2f3a');
    k.glow(1.5);
    k.box(-0.14, 0.1, 0.28, o.h - 0.1, rgba(k.T.hold, 0.15 + 0.25 * k.mf.kick));
    for (let y = 0.2; y < o.h; y += 0.15) k.line(-0.14, y, 0.14, y, 0.01, rgba(k.T.hold, 0.4 + 0.5 * (Math.sin(k.t * 10 + y * 8) > 0 ? k.mf.hat * 3 : 0)));
  },
  neonwall(k, o) {
    courses(k, o, 10, 0.36, (r, c) => rgba(k.T.hold, (r + c) % 2 ? 0.35 : 0.15 + 0.4 * k.mf.kick), false);
  },
  neonbar(k) {
    k.plain();
    k.line(-0.55, 2.12, -0.4, k.sky, 0.02, rgba(k.T.hold, 0.6));
    k.line(0.55, 2.12, 0.4, k.sky, 0.02, rgba(k.T.hold, 0.6));
    k.glow(2);
    k.line(-0.7, 2.1, 0.7, 2.1, 0.06 + 0.03 * k.mf.kick, k.T.hold);
  },
  neon: ledge('#1a0630', true),
  prism(k) {
    k.glow(1.5);
    k.poly([[-0.64, 0], [0, 0.48], [0.64, 0]], rgba(k.T.slide, 0.2 + 0.3 * k.mf.kick));
    neonLine(k, -0.64, 0, 0, 0.48, 0.03);
    neonLine(k, 0, 0.48, 0.64, 0, 0.03);
  },
};
