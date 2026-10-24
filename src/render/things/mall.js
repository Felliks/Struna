// The mall's obstacles: a marble bust on its plinth, a potted palm and a fountain basin to jump; a neon shape, a
// pastel banner and a skybridge's underside to slide under; a shop window and a marble column to kick through; a brass
// handrail to swing on; ledges of marble and planters; and its hazards, in pastel neon and chrome.
import { mulberry } from '../../rng.js';
import { rgba } from '../util.js';
import { courses, hanging, ledge } from './kit.js';
import { discoball, fan, glassburst, neonsign, shards, zapper } from './hazards.js';

const PINK = '#ff9ad5',
  TEAL = '#5ae0d0',
  LILAC = '#b89aff',
  MARBLE = '#ece4ee';

export default {
  // a marble bust on a plinth, its eyes glinting on the hats
  mlBust(k, o) {
    k.box(-0.24, 0, 0.48, o.h * 0.45, MARBLE, k.accent, 0.03);
    k.plain();
    k.box(-0.28, o.h * 0.45, 0.56, 0.04, '#cfc4d6');
    k.poly(
      [
        [-0.22, o.h * 0.49],
        [0.22, o.h * 0.49],
        [0.14, o.h * 0.64],
        [-0.14, o.h * 0.64],
      ],
      MARBLE,
    );
    k.box(-0.04, o.h * 0.64, 0.08, 0.05, '#d8ccdc');
    k.round(-0.09, o.h * 0.69, 0.18, o.h - o.h * 0.69, 0.08, MARBLE);
    for (const x of [-0.035, 0.035])
      k.disc(x, o.h * 0.86, 0.012 + 0.012 * k.mf.hat * 2, rgba(TEAL, 0.4 + 0.6 * Math.min(1, k.mf.hat * 2.5)));
  },
  // a potted palm, its fronds swaying with the bass
  mlPlanter(k, o) {
    k.box(-0.2, 0, 0.4, o.h * 0.4, PINK, k.accent, 0.03);
    k.plain();
    k.box(-0.22, o.h * 0.36, 0.44, 0.04, TEAL);
    const sw = 0.04 * Math.sin(k.t * 2) * (0.5 + k.mf.bass);
    k.line(0, o.h * 0.4, sw, o.h * 0.8, 0.04, '#6a5a3a');
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.15 + i * 0.175);
      k.line(sw, o.h * 0.8, sw + Math.cos(a) * 0.26, o.h * 0.8 + Math.sin(a) * 0.14 - 0.06, 0.035, '#3aa88a');
    }
  },
  // a fountain basin, its jet leaping on the kick
  mlBasin(k, o) {
    k.box(-0.36, 0, 0.72, o.h * 0.5, MARBLE, k.accent, 0.03);
    k.plain();
    k.box(-0.32, o.h * 0.42, 0.64, 0.05, rgba(TEAL, 0.6 + 0.3 * k.mf.bass));
    k.box(-0.03, o.h * 0.5, 0.06, o.h * 0.3, '#d8ccdc');
    const j = o.h * (0.85 + 0.15 * k.mf.kick);
    k.line(0, o.h * 0.8, -0.14, Math.min(o.h, j), 0.025, rgba('#c8fff4', 0.5 + 0.5 * k.mf.kick));
    k.line(0, o.h * 0.8, 0.14, Math.min(o.h, j), 0.025, rgba('#c8fff4', 0.5 + 0.5 * k.mf.kick));
  },
  // an abstract neon shape hung on wires: a ring and a triangle, lit on the snare
  mlNeon(k) {
    hanging(k, 1.5, 0.7, '#9aa0a8', 0.02);
    k.box(-0.55, 1.05, 1.1, 0.45, '#1a1230', k.accent, 0.03);
    k.plain();
    const e = 0.4 + 0.6 * k.mf.snare;
    k.disc(-0.22, 1.27, 0.14, rgba(PINK, e));
    k.disc(-0.22, 1.27, 0.09, '#1a1230');
    k.poly(
      [
        [0.05, 1.12],
        [0.4, 1.12],
        [0.22, 1.42],
      ],
      rgba(TEAL, e),
    );
  },
  // a pastel banner in stripes and zigzags, rippling with the bass
  mlBanner(k) {
    hanging(k, 1.6, 1.0, '#9aa0a8', 0.02);
    k.box(-0.6, 1.25, 1.2, 0.35, LILAC, k.accent, 0.03);
    k.plain();
    for (let i = 0; i < 6; i++) {
      const x = -0.6 + i * 0.2,
        d = 0.03 * Math.sin(k.t * 5 + i) * (0.5 + k.mf.bass);
      k.poly(
        [
          [x, 1.25],
          [x + 0.2, 1.25],
          [x + 0.1, 1.08 + d],
        ],
        i % 2 ? PINK : TEAL,
      );
    }
    k.box(-0.6, 1.4, 1.2, 0.05, rgba('#ffffff', 0.4 + 0.5 * k.mf.kick));
  },
  // a skybridge's underside: a glass rail over a pink fascia, its downlights running on the beat
  mlBridge(k) {
    k.plain();
    k.box(-0.8, 1.05, 1.6, 0.3, PINK, k.accent, 0.03);
    k.box(-0.8, 1.35, 1.6, 0.5, rgba('#c8fff4', 0.25));
    k.line(-0.8, 1.85, 0.8, 1.85, 0.04, '#d9dde3');
    for (let x = -0.7; x <= 0.7; x += 0.35) k.line(x, 1.35, x, 1.85, 0.02, '#d9dde3');
    k.line(-0.8, 1.85, -0.8, k.sky, 0.05, '#9aa0a8');
    k.line(0.8, 1.85, 0.8, k.sky, 0.05, '#9aa0a8');
    for (let i = 0; i < 4; i++)
      k.disc(-0.6 + i * 0.4, 1.08, 0.05, rgba('#fff3d0', Math.floor(k.t * 4) % 4 === i ? 1 : 0.3));
  },
  // a shop window, a neon ring behind it, its glint sliding on the hats
  mlPane(k, o) {
    k.box(-0.14, 0, 0.28, o.h, rgba('#c8fff4', 0.22 + 0.2 * k.mf.kick), k.accent, 0.03);
    k.plain();
    k.disc(0, o.h * 0.6, 0.09, rgba(PINK, 0.3 + 0.4 * k.mf.beat));
    const g = (k.t * 0.8 + k.mf.hat) % 1;
    k.line(-0.1, o.h * g, 0.1, o.h * g + 0.25, 0.025, 'rgba(255,255,255,0.7)');
    k.box(-0.18, 0, 0.36, 0.08, '#d8ccdc');
    k.box(-0.18, o.h - 0.06, 0.36, 0.06, '#d8ccdc');
  },
  // a marble column built up drum by drum
  mlColumn(k, o) {
    const rr = mulberry(Math.round(o.t * 1000));
    courses(k, o, 10, 0.4, () => (rr() < 0.5 ? MARBLE : '#d6cadc'), false);
  },
  // a brass handrail hung on cables, its studs lit on the beat
  mlRail(k) {
    hanging(k, 2.12, 0.9, '#9aa0a8', 0.025);
    k.box(-0.7, 2.05, 1.4, 0.09, '#e8c878', rgba(k.T.hold, 0.9), 0.025);
    for (let i = 0; i < 3; i++) k.disc(-0.45 + i * 0.45, 2.0, 0.05, rgba(i % 2 ? TEAL : PINK, 0.4 + 0.6 * k.mf.beat));
  },
  mlMarbleLedge: ledge(MARBLE),
  mlPlanterLedge: ledge(PINK, true),
  mlZap: zapper('#3a2a5a', TEAL),
  mlNeonSign: neonsign('#1a1230', PINK, '#c8fff4'),
  mlShatter: glassburst('#d8ccdc', '#c8fff4'),
  mlFan: fan('#d8ccdc', PINK),
  mlDisco: discoball('#f0e8ff', TEAL),
  mlPrism: shards(LILAC, '#ffe0f4'),
};
