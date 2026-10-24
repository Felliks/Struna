// The computer's obstacles: a chip, a capacitor and a heat sink to jump, a ribbon cable, a fan and a hanging bus of
// data to slide under, a firewall pane and a stack of RAM to kick through, a jumper bar to swing on, ledges of board and
// a chip; and the board's hazards in a shaft.
import { rgba } from '../util.js';
import { hanging, ledge } from './kit.js';
import { fan, gears, glitchcube, laserpair, saw, zapper } from './hazards.js';

const PCB = '#0e3a24',
  GOLD = '#d8b25a';

export default {
  // a chip: its body, its pins down both sides, its dot lit on the kick
  cpuChip(k, o) {
    k.box(-0.3, 0.04, 0.6, o.h - 0.04, '#16181e', k.accent, 0.03);
    k.plain();
    for (let y = 0.08; y < o.h - 0.04; y += 0.09) {
      k.box(-0.36, y, 0.06, 0.035, GOLD);
      k.box(0.3, y, 0.06, 0.035, GOLD);
    }
    k.disc(-0.18, o.h - 0.1, 0.04, rgba(k.T.jump, 0.4 + 0.6 * k.mf.kick));
  },
  // a capacitor can on its legs, its top's cross lit on the bass
  cpuCap(k, o) {
    k.plain();
    k.line(-0.08, 0, -0.08, 0.08, 0.025, GOLD);
    k.line(0.08, 0, 0.08, 0.08, 0.025, GOLD);
    k.round(-0.22, 0.06, 0.44, o.h - 0.06, 0.06, '#2a4a8a');
    k.box(0.1, 0.08, 0.06, o.h - 0.12, rgba('#ffffff', 0.25));
    k.line(-0.14, o.h - 0.03, 0.14, o.h - 0.03, 0.03, rgba(k.T.jump, 0.4 + 0.6 * k.mf.bass));
  },
  // a heat sink: its fins, heat shimmering off them on the hats
  cpuSink(k, o) {
    k.box(-0.32, 0, 0.64, 0.08, '#9aa0a8', k.accent, 0.02);
    k.plain();
    for (let i = 0; i < 6; i++) k.box(-0.3 + i * 0.11, 0.08, 0.06, o.h - 0.08, '#c9ccd2');
    for (let i = 0; i < 3; i++) k.line(-0.2 + i * 0.2, o.h + 0.03, -0.18 + i * 0.2 + 0.03 * Math.sin(k.t * 9 + i), o.h + 0.1 + 0.1 * k.mf.hat * 2, 0.015, rgba(k.T.jump, 0.5));
  },
  // a ribbon cable sagging across from two plugs, its wires lit in turn on the beat
  cpuRibbon(k) {
    hanging(k, 1.3, 0.9, '#3a3f48');
    k.box(-0.65, 1.05, 1.3, 0.25, '#b8bcc4', k.accent, 0.02);
    k.plain();
    for (let i = 0; i < 8; i++) k.line(-0.6 + i * 0.17, 1.08, -0.6 + i * 0.17, 1.27, 0.02, rgba(i % 2 ? k.T.slide : '#7a7f88', i % 2 ? 0.3 + 0.7 * k.mf.beat : 1));
    for (const x of [-0.65, 0.5]) k.box(x, 1.05, 0.15, 0.3, '#16181e');
  },
  // a case fan hung in its frame, turning with the hats
  cpuFan(k) {
    hanging(k, 1.75, 0.6, '#3a3f48');
    k.box(-0.38, 1.05, 0.76, 0.72, '#16181e', k.accent, 0.03);
    k.plain();
    const cx = 0,
      cy = 1.41;
    k.disc(cx, cy, 0.32, '#05070a');
    for (let i = 0; i < 5; i++) {
      const a = k.spin + (i * 2 * Math.PI) / 5;
      k.line(cx, cy, cx + Math.cos(a) * 0.3, cy + Math.sin(a) * 0.3, 0.07, '#5a6070');
    }
    k.disc(cx, cy, 0.08, rgba(k.T.slide, 0.5 + 0.5 * k.mf.kick));
  },
  // a bus of data: a bar of light hung from cables, its packets running across
  cpuBus(k) {
    hanging(k, 1.25, 0.9);
    k.box(-0.7, 1.05, 1.4, 0.2, PCB, k.accent, 0.025);
    k.plain();
    for (let i = 0; i < 4; i++) {
      const x = -0.65 + ((k.t * 1.5 + i * 0.35) % 1.3);
      k.box(x, 1.11, 0.12, 0.08, rgba(k.T.slide, 0.6 + 0.4 * k.mf.beat));
    }
  },
  // a firewall: a pane of light in a frame, its grid flickering on the hats
  cpuWall(k, o) {
    k.plain();
    k.box(-0.18, 0, 0.36, 0.08, '#16181e');
    k.box(-0.18, o.h - 0.08, 0.36, 0.08, '#16181e');
    k.box(-0.14, 0.08, 0.28, o.h - 0.16, rgba('#ff5a2a', 0.2 + 0.25 * k.mf.kick), k.accent, 0.03);
    for (let y = 0.25; y < o.h - 0.1; y += 0.2) k.line(-0.14, y, 0.14, y, 0.012, rgba('#ffb08a', 0.3 + 0.6 * (Math.sin(k.t * 12 + y * 9) > 0 ? k.mf.hat * 3 : 0.1)));
  },
  // RAM sticks stacked in a rack, their chips lit on the beat
  cpuRam(k, o) {
    k.box(-0.2, 0, 0.4, o.h, '#2a2f3a', k.accent, 0.03);
    k.plain();
    for (let y = 0.1; y < o.h - 0.2; y += 0.32) {
      k.box(-0.17, y, 0.34, 0.24, PCB);
      for (let c = 0; c < 3; c++) k.box(-0.14 + c * 0.1, y + 0.05, 0.08, 0.12, rgba(c === 1 ? k.T.win[0] : '#16181e', c === 1 ? 0.3 + 0.7 * k.mf.beat : 1));
      k.box(-0.17, y, 0.34, 0.03, GOLD);
    }
  },
  // a jumper bar across two header pins
  cpuJumper(k) {
    hanging(k, 2.14, 0.9, '#3a3f48');
    k.box(-0.7, 2.05, 1.4, 0.09, GOLD, rgba(k.T.hold, 0.9), 0.025);
    for (const x of [-0.7, 0.56]) k.box(x, 2.0, 0.14, 0.2, '#16181e');
    k.plain();
    k.box(-0.1, 2.14, 0.2, 0.06, rgba(k.T.hold, 0.4 + 0.6 * k.mf.kick));
  },
  cpuBoardledge: ledge(PCB, true),
  cpuChipledge: ledge('#16181e'),
  cpusaw: saw('#16181e', '#c9ccd2'),
  cpuzap: zapper(PCB, '#4aff8a'),
  cpucube: glitchcube('#0a2418', '#4aff8a'),
  cpugears: gears('#2a2f3a', GOLD),
  cpulaser: laserpair('#16181e', '#29e7ff'),
  cpufan: fan('#16181e', '#9aa0a8'),
};
