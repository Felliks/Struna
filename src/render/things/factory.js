// The factory's obstacles: toxic barrels, a gearbox and a pallet to jump, a steam pipe, a crane hook and a spinning
// saw to slide under, a barred window and a boiler plate to kick through, a chain to swing on, pipe and girder ledges.
import { rgba } from '../util.js';
import { hanging, ledge } from './kit.js';

export default {
  toxic(k, o) {
    k.round(-0.25, 0, 0.5, o.h, 0.06, '#c8a020');
    k.plain();
    for (const y of [0.12, o.h - 0.12]) k.box(-0.25, y - 0.025, 0.5, 0.05, '#5a4a10');
    k.disc(0, o.h * 0.55, 0.09, rgba('#7dff3a', 0.4 + 0.6 * k.mf.kick));
  },
  gearbox(k, o) {
    k.box(-0.32, 0, 0.64, o.h, '#4a4448', k.accent, 0.03);
    k.plain();
    const r = o.h * 0.3,
      pts = [];
    for (let i = 0; i < 16; i++) {
      const a = k.spin + (i / 16) * Math.PI * 2,
        rr = i % 2 ? r : r * 0.75;
      pts.push([Math.cos(a) * rr, o.h / 2 + Math.sin(a) * rr]);
    }
    k.poly(pts, '#8a8288');
  },
  pallet(k, o) {
    k.plain();
    for (let i = 0; i < 3; i++) k.box(-0.36, i * (o.h / 3), 0.72, o.h / 3 - 0.04, i % 2 ? '#8a6a42' : '#9a7a4a');
    k.glow();
    k.frame(-0.36, 0, 0.72, o.h, k.accent, 0.025);
  },
  pipe(k) {
    k.plain();
    k.box(-0.75, 1.08, 1.5, 0.22, '#6a6266', k.accent, 0.025);
    k.box(-0.3, 1.04, 0.1, 0.3, '#4a4448');
    for (let i = 0; i < 3; i++) k.disc(0.2 + i * 0.12, 1.0 - i * 0.12 * k.mf.snare, (0.06 + i * 0.04) * (0.5 + k.mf.snare), `rgba(230,230,230,${0.5 * k.mf.snare})`);
  },
  // a crane hook swinging a little with the bass
  hook(k) {
    const sw = 0.08 * Math.sin(k.t * 2) * (0.5 + k.mf.bass);
    k.plain();
    k.line(sw * 0.2, k.sky, sw, 1.5, 0.03, '#8a8a8a');
    k.glow();
    k.box(sw - 0.25, 1.3, 0.5, 0.2, '#f2c230', k.accent, 0.02);
    k.line(sw, 1.3, sw, 1.12, 0.06, '#9a9aa0');
    k.line(sw, 1.12, sw + 0.12, 1.06, 0.06, '#9a9aa0');
  },
  // a saw on an arm, spinning at head height
  saw(k) {
    k.plain();
    k.line(0, k.sky, 0, 1.35, 0.06, '#555');
    k.glow();
    const r = 0.3,
      pts = [];
    for (let i = 0; i < 24; i++) {
      const a = k.spin * 1.5 + (i / 24) * Math.PI * 2,
        rr = i % 2 ? r : r * 0.8;
      pts.push([Math.cos(a) * rr, 1.35 + Math.sin(a) * rr]);
    }
    k.poly(pts, '#d9dde3');
    k.disc(0, 1.35, r * 0.25, '#ff2b3a');
  },
  grating(k, o) {
    k.box(-0.16, 0, 0.32, o.h, rgba('#9fe8ff', 0.15 + 0.2 * k.mf.kick), k.accent, 0.03);
    k.plain();
    for (let x = -0.12; x <= 0.12; x += 0.08) k.line(x, 0, x, o.h, 0.02, '#5a5458');
  },
  boiler(k, o) {
    k.box(-0.2, 0, 0.4, o.h, '#5a4a48', k.accent, 0.03);
    k.plain();
    for (let y = 0.25; y < o.h; y += 0.3) for (const x of [-0.13, 0.13]) k.disc(x, y, 0.025, '#2a2020');
    k.box(-0.12, o.h * 0.4, 0.24, 0.3, rgba('#ff6a2a', 0.3 + 0.6 * k.mf.bass));
  },
  chain(k) {
    hanging(k, 2.12, 0.9, '#7a7a80', 0.035);
    for (let i = -6; i <= 6; i++) k.disc(i * 0.11, 2.1, 0.045, i % 2 ? '#9a9aa0' : '#7a7a80');
    k.disc(0, 2.18, 0.05, rgba(k.T.hold, 0.5 + 0.5 * k.mf.kick));
  },
  pipeledge: ledge('#4a4448'),
  girder(k) {
    k.box(-0.64, 0, 1.28, 0.4, '#c0462a', k.accent, 0.03);
    k.plain();
    for (let x = -0.56; x < 0.6; x += 0.28) k.line(x, 0.04, x + 0.24, 0.36, 0.03, '#7a2a18');
  },
};
