// The graveyard's obstacles: a crooked tombstone, a jack-o'-lantern and a coffin to jump; a dead bough with a lantern,
// a cobweb and a garland of paper lanterns to slide under; a cemetery's iron gate and a mossy stone wall to kick
// through; a rusty bar on chains to swing on; a ledge of a grave slab; and the shaft's hazards (a chomping pumpkin, iron
// fence spikes, a will-o'-the-wisp, a spirit vortex, a reaper's blades, a spiked pumpkin).
import { rgba } from '../util.js';
import { courses, hanging, ledge } from './kit.js';
import { jaws, mine, plasmaorb, saw, spikes, vortex } from './hazards.js';

const PUMPKIN = '#e0701a';

export default {
  // a leaning tombstone, a cross cut in it, a candle on top flickering on the hats
  gvTomb(k, o) {
    k.poly([[-0.24, 0], [-0.28, o.h * 0.7], [-0.1, o.h * 0.95], [0.12, o.h], [0.3, o.h * 0.78], [0.26, 0]], '#6a6a74');
    k.plain();
    k.box(-0.03, o.h * 0.35, 0.06, o.h * 0.42, '#3a3a44');
    k.box(-0.12, o.h * 0.6, 0.24, 0.05, '#3a3a44');
    k.box(-0.28, 0, 0.56, 0.05, '#4a5a3a');
    k.box(0.15, o.h * 0.74, 0.04, 0.07, '#e8e0c8');
    k.disc(0.17, o.h * 0.74 + 0.1, 0.02 + 0.01 * k.mf.hat, rgba('#ffd27a', 0.6 + 0.4 * k.mf.hat * 2));
  },
  // a jack-o'-lantern, its face lit on the kick
  gvPumpkin(k, o) {
    k.round(-0.32, 0, 0.64, o.h * 0.9, o.h * 0.4, PUMPKIN);
    k.plain();
    for (const x of [-0.16, 0.16]) k.round(x - 0.04, 0.02, 0.08, o.h * 0.86, 0.04, '#b4521a');
    k.box(-0.03, o.h * 0.88, 0.06, o.h * 0.12, '#3a5a1a');
    const lit = rgba(k.T.jump, 0.35 + 0.65 * k.mf.kick);
    k.poly([[-0.2, o.h * 0.55], [-0.06, o.h * 0.55], [-0.13, o.h * 0.72]], lit);
    k.poly([[0.06, o.h * 0.55], [0.2, o.h * 0.55], [0.13, o.h * 0.72]], lit);
    k.poly([[-0.2, o.h * 0.3], [0.2, o.h * 0.3], [0.12, o.h * 0.18], [0, o.h * 0.26], [-0.12, o.h * 0.18]], lit);
  },
  // a coffin on its side, its lid rattling on the snare
  gvCoffin(k, o) {
    k.poly([[-0.42, o.h * 0.2], [-0.28, 0], [0.36, 0], [0.42, o.h * 0.35], [0.36, o.h * 0.8], [-0.28, o.h * 0.8]], '#4a2e1c');
    k.plain();
    const j = 0.03 * k.mf.snare;
    k.poly([[-0.4, o.h * 0.8 + j], [0.36, o.h * 0.8 + j], [0.3, o.h + j], [-0.24, o.h + j]], '#5a3a24');
    k.box(-0.02, o.h * 0.25, 0.04, o.h * 0.4, rgba(k.T.jump, 0.5 + 0.5 * k.mf.kick));
    k.box(-0.1, o.h * 0.5, 0.2, 0.04, rgba(k.T.jump, 0.5 + 0.5 * k.mf.kick));
  },
  // a dead bough across, a crow on it, a lantern hung under it swinging with the bass
  gvBough(k) {
    k.plain();
    k.line(-0.75, 1.55, 0.75, 1.45, 0.12, '#2a1e18');
    k.line(-0.3, 1.52, -0.5, 1.75, 0.05, '#2a1e18');
    k.line(0.35, 1.47, 0.6, 1.7, 0.04, '#2a1e18');
    const sw = 0.06 * Math.sin(k.t * 2) * (0.5 + k.mf.bass);
    k.line(0.1, 1.48, 0.1 + sw, 1.3, 0.015, '#5a5a5a');
    k.box(0.02 + sw, 1.07, 0.16, 0.23, '#2a2a30', k.accent, 0.02);
    k.box(0.05 + sw, 1.11, 0.1, 0.15, rgba(k.T.slide, 0.5 + 0.5 * k.mf.kick));
    k.poly([[-0.45, 1.56], [-0.25, 1.58], [-0.3, 1.72], [-0.42, 1.68]], '#0a080c');
  },
  // a cobweb hung across, its spider dropping on the snare (never below the gap)
  gvWeb(k) {
    hanging(k, 1.7, 1.0, '#5a5a5a', 0.02);
    k.plain();
    const c = [0, 1.45],
      col = rgba('#e8f0ff', 0.6);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      k.line(c[0], c[1], c[0] + Math.cos(a) * 0.62, c[1] + Math.sin(a) * 0.36, 0.012, col);
    }
    for (const r of [0.15, 0.3, 0.45, 0.6])
      for (let i = 0; i < 8; i++) {
        const a0 = (i / 8) * Math.PI * 2,
          a1 = ((i + 1) / 8) * Math.PI * 2;
        k.line(Math.cos(a0) * r, 1.45 + Math.sin(a0) * r * 0.58, Math.cos(a1) * r, 1.45 + Math.sin(a1) * r * 0.58, 0.01, col);
      }
    const drop = 1.35 - 0.15 * k.mf.snare;
    k.line(0.25, 1.45, 0.25, drop, 0.01, col);
    k.disc(0.25, drop - 0.06, 0.06, '#0a080c');
    k.disc(0.25, drop - 0.06, 0.02, rgba(k.T.slide, 0.6 + 0.4 * k.mf.kick));
  },
  // a garland of paper lanterns sagging across, lit in turn on the beat
  gvGarland(k) {
    k.plain();
    k.line(-0.75, 1.65, -0.75, k.sky, 0.04, '#3a3a40');
    k.line(0.75, 1.65, 0.75, k.sky, 0.04, '#3a3a40');
    k.glow();
    const n = 5;
    for (let i = 0; i < n; i++) {
      const x = -0.6 + (i * 1.2) / (n - 1),
        y = 1.62 - 0.25 * (1 - (x / 0.75) ** 2);
      if (i) k.line(x - 1.2 / (n - 1), 1.62 - 0.25 * (1 - ((x - 1.2 / (n - 1)) / 0.75) ** 2), x, y, 0.015, '#3a3a40');
      const on = Math.floor(k.t * 4) % n === i ? 1 : 0.3;
      k.round(x - 0.09, y - 0.26, 0.18, 0.24, 0.08, i % 2 ? PUMPKIN : '#8a4aff');
      k.disc(x, y - 0.14, 0.05, rgba(k.T.slide, on * (0.5 + 0.5 * k.mf.kick)));
    }
  },
  // a cemetery's wrought-iron gate: bars with spear tips, a scroll, a lantern on the kick
  gvGate(k, o) {
    k.box(-0.2, 0, 0.4, 0.06, '#1a1a20');
    k.box(-0.2, o.h - 0.1, 0.4, 0.05, '#2a2a30');
    k.plain();
    for (const x of [-0.15, -0.05, 0.05, 0.15]) {
      k.line(x, 0, x, o.h - 0.05, 0.03, '#2a2a30');
      k.poly([[x - 0.035, o.h - 0.05], [x + 0.035, o.h - 0.05], [x, o.h + 0.06]], '#3a3a44');
    }
    k.box(-0.2, o.h * 0.5, 0.4, 0.04, '#2a2a30');
    k.disc(0, o.h * 0.5 + 0.02, 0.07, rgba('#ffd27a', 0.3 + 0.7 * k.mf.kick));
  },
  // a mossy graveyard wall, laid course by course
  gvWall(k, o) {
    courses(k, o, 12, 0.42, (r, c) => ((r + c) % 3 ? '#5a5a62' : '#4a5a42'));
  },
  // a rusty bar hung on chains, its lanterns lit on the beat
  gvBar(k) {
    hanging(k, 2.12, 0.9, '#4a4040', 0.03);
    k.box(-0.7, 2.05, 1.4, 0.09, '#5a4a40', rgba(k.T.hold, 0.9), 0.025);
    for (const x of [-0.6, 0.6]) k.disc(x, 1.95, 0.06, rgba('#ffd27a', 0.4 + 0.6 * k.mf.beat));
  },
  gvSlab: ledge('#4a4a52'),
  gvChomp: jaws(PUMPKIN, '#ffd27a', { eyes: true }),
  gvFence: spikes('#2a2a30', '#9aa0a8'),
  gvWisp: plasmaorb('#1a2a20', '#7dffb0'),
  gvSpirit: vortex('#7dffb0', '#e8fff0'),
  gvScythe: saw('#2a2a30', '#c9ccd2'),
  gvBurr: mine('#3a1a0a', '#ff8a2a'),
};
