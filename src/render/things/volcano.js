// The volcano's obstacles: a lava rock, a pile of skulls and an obsidian spike to jump; chains with a brazier, a
// demon's jaw and a curtain of falling embers to slide under; an obsidian wall and a bone gate to kick through; a chain
// to swing on; ledges of magma rock and basalt.
import { mulberry } from '../../rng.js';
import { rgba } from '../util.js';
import { courses, hanging, ledge } from './kit.js';

export default {
  // a lump of cooling lava: a crust of uneven faces, cracks branching from its heart and glowing on the kick, embers
  // in them (cracks, not one line: a single bent one read as a crooked arrow)
  lavarock(k, o) {
    const h = o.h,
      glow = rgba('#ff6a2a', 0.45 + 0.55 * k.mf.kick);
    k.poly([[-0.4, 0], [-0.42, h * 0.35], [-0.3, h * 0.75], [-0.08, h], [0.16, h * 0.92], [0.34, h * 0.68], [0.42, h * 0.3], [0.38, 0]], '#2a1a16');
    k.plain();
    for (const [x0, y0, x1, y1] of [[0, h * 0.45, -0.24, h * 0.72], [0, h * 0.45, 0.26, h * 0.6], [0, h * 0.45, -0.06, h * 0.1], [0.13, h * 0.53, 0.2, h * 0.86]]) k.line(x0, y0, x1, y1, 0.035, glow);
    k.disc(0, h * 0.45, 0.06, glow);
  },
  skulls(k, o) {
    for (const [x, y, r] of [[-0.2, 0.14, 0.15], [0.18, 0.14, 0.15], [0, 0.38, 0.15]]) k.disc(x, y * (o.h / 0.5), r * (o.h / 0.5), '#d9ccb0');
    k.plain();
    for (const [x, y] of [[-0.2, 0.14], [0.18, 0.14], [0, 0.38]]) {
      k.disc(x - 0.05, y * (o.h / 0.5) + 0.02, 0.035, rgba('#ff3b1f', 0.5 + 0.5 * k.mf.kick));
      k.disc(x + 0.05, y * (o.h / 0.5) + 0.02, 0.035, rgba('#ff3b1f', 0.5 + 0.5 * k.mf.kick));
    }
  },
  spike(k, o) {
    k.poly([[-0.35, 0], [-0.05, o.h], [0.1, o.h * 0.8], [0.35, 0]], '#14101a');
    k.plain();
    k.line(-0.05, o.h, 0.35, 0, 0.025, rgba('#b06aff', 0.4 + 0.5 * k.mf.beat));
  },
  // chains down from out of sight, a brazier hung low on them, burning brighter on the beat
  brazier(k) {
    hanging(k, 1.4, 0.7, '#4a4040', 0.03);
    k.poly([[-0.4, 1.4], [0.4, 1.4], [0.25, 1.05], [-0.25, 1.05]], '#3a3030');
    k.plain();
    for (let i = 0; i < 5; i++) k.disc(-0.25 + i * 0.12, 1.45 + 0.1 * Math.sin(k.t * 12 + i) + 0.1 * k.mf.beat, 0.07, rgba(i % 2 ? '#ffb347' : '#ff5a1f', 0.8));
  },
  // a demon's jaw hung over the way, teeth down, eyes lit on the kick
  jaw(k) {
    hanging(k, 1.6, 1.0, '#4a4040', 0.03);
    k.poly([[-0.7, 1.6], [0.7, 1.6], [0.6, 1.2], [-0.6, 1.2]], '#2a1616');
    k.plain();
    for (let i = 0; i < 6; i++) k.poly([[-0.55 + i * 0.22, 1.2], [-0.45 + i * 0.22, 1.2], [-0.5 + i * 0.22, 1.05]], '#e8dcc0');
    k.disc(-0.3, 1.45, 0.06, rgba('#ff3b1f', 0.5 + 0.5 * k.mf.kick));
    k.disc(0.3, 1.45, 0.06, rgba('#ff3b1f', 0.5 + 0.5 * k.mf.kick));
  },
  // a curtain of embers falling from a ledge above, stopping just over his head
  embers(k) {
    k.box(-0.7, 1.55, 1.4, 0.15, '#2a1a16', k.accent, 0.02);
    k.plain();
    for (let i = 0; i < 14; i++) {
      const x = -0.65 + (i % 7) * 0.2 + (i > 6 ? 0.1 : 0),
        y = 1.55 - ((k.t * 1.5 + i * 0.37) % 1) * 0.45;
      k.disc(x, y, 0.035, rgba(i % 2 ? '#ffb347' : '#ff5a1f', 0.6 + 0.4 * k.mf.hat * 2));
    }
  },
  obsidian(k, o) {
    const rr = mulberry(Math.round(o.t * 1000));
    courses(k, o, 10, 0.42, () => (rr() < 0.5 ? '#1a1424' : '#251a30'));
  },
  bonegate(k, o) {
    k.plain();
    const n = Math.ceil(8 * k.u);
    for (let i = 0; i < n; i++) k.box(-0.16, i * (o.h / 8), 0.32, o.h / 8 - 0.04, i % 2 ? '#d9ccb0' : '#bfb090');
    k.glow();
    k.frame(-0.16, 0, 0.32, (o.h * n) / 8, k.accent, 0.03);
  },
  chain(k) {
    hanging(k, 2.12, 0.9, '#4a4040', 0.035);
    k.box(-0.7, 2.05, 1.4, 0.09, '#6a6060', rgba(k.T.hold, 0.9), 0.025);
  },
  magmaledge: ledge('#2a1a16', true),
  basaltledge: ledge('#1a1a20'),
};
