// The wasteland's obstacles: a stack of tyres, a burning oil barrel and a wrecked car's engine block to jump; a rusted
// road sign, a torn-off wing and a curtain of chains and hubcaps to slide under; a sheet of corrugated iron and a
// plank barricade to kick through; a rusted girder to swing on; ledges of car roofs and crates; and its hazards, in rust
// and fire.
import { mulberry } from '../../rng.js';
import { rgba } from '../util.js';
import { courses, hanging, ledge } from './kit.js';
import { firejet, gears, grapnel, mine, saw, spikes } from './hazards.js';

const RUST = '#8a4a2a',
  DARK = '#3a2a20',
  FIRE = '#ff8a2a',
  HOT = '#ffe08a';

export default {
  // tyres stacked, the top one bouncing on the kick
  wsTyres(k, o) {
    const n = 3,
      th = o.h / n;
    for (let i = 0; i < n; i++) {
      const y = i * th + (i === n - 1 ? 0.02 * k.mf.kick : 0),
        w = 0.62 - (i % 2) * 0.06;
      k.round(-w / 2, y, w, th - 0.008, th / 2, '#1e1a18');
      k.plain();
      k.round(-w / 2 + 0.05, y + th * 0.3, w - 0.1, th * 0.4, th * 0.2, '#3a322c');
      for (let j = 0; j < 5; j++) k.box(-w / 2 + 0.08 + j * ((w - 0.2) / 4), y + th * 0.08, 0.03, th * 0.18, '#0a0806');
    }
    k.box(-0.24, o.h - 0.03 + 0.02 * k.mf.kick, 0.48, 0.03, k.accent);
  },
  // an oil drum burning, its fire flaring on the kick
  wsBarrel(k, o) {
    k.round(-0.22, 0, 0.44, o.h * 0.8, 0.04, RUST);
    k.plain();
    for (const y of [0.2, 0.5]) k.box(-0.22, y * o.h, 0.44, 0.03, DARK);
    k.box(-0.22, o.h * 0.8 - 0.03, 0.44, 0.03, k.accent);
    const h = o.h * (0.12 + 0.08 * k.mf.kick);
    for (let i = 0; i < 3; i++) {
      const x = -0.12 + i * 0.12,
        hh = h * (0.6 + 0.4 * Math.abs(Math.sin(k.t * 9 + i * 2)));
      k.poly(
        [
          [x - 0.07, o.h * 0.8],
          [x + 0.07, o.h * 0.8],
          [x, o.h * 0.8 + hh],
        ],
        rgba(i === 1 ? HOT : FIRE, 0.7 + 0.3 * k.mf.kick),
      );
    }
  },
  // a wrecked car's engine block, its exhaust sparking on the hats
  wsEngine(k, o) {
    k.box(-0.36, 0, 0.72, o.h * 0.65, '#4a3a30', k.accent, 0.03);
    k.plain();
    for (let i = 0; i < 4; i++) k.box(-0.3 + i * 0.16, o.h * 0.65, 0.1, o.h * 0.2, '#5a4a3a');
    k.disc(-0.18, o.h * 0.3, 0.08, '#2a201a');
    k.disc(0.18, o.h * 0.3, 0.08, '#2a201a');
    k.line(0.36, o.h * 0.4, 0.46, o.h * 0.9, 0.04, RUST);
    k.disc(0.46, o.h * 0.92, 0.03, rgba(HOT, 0.2 + 0.8 * Math.min(1, k.mf.hat * 2.5)));
  },
  // a road sign shot full of holes, hung on chains, creaking with the bass
  wsSign(k) {
    hanging(k, 1.5, 0.6, '#6a5a4a', 0.03);
    const sw = 0.03 * Math.sin(k.t * 2) * (0.5 + k.mf.bass);
    k.poly(
      [
        [-0.5, 1.05],
        [0.55, 1.05 + sw],
        [0.5, 1.5 + sw],
        [-0.55, 1.5],
      ],
      '#c89a3a',
    );
    k.plain();
    k.poly(
      [
        [-0.42, 1.12],
        [0.47, 1.12 + sw],
        [0.43, 1.43 + sw],
        [-0.46, 1.43],
      ],
      '#2a2018',
    );
    for (let i = 0; i < 5; i++)
      k.disc(-0.35 + i * 0.17, 1.2 + (i % 2) * 0.15, 0.025, rgba(k.T.slide, 0.4 + 0.6 * k.mf.snare));
  },
  // a torn-off aircraft wing slung across, its nav light on the beat
  wsWing(k) {
    hanging(k, 1.45, 1.2, '#6a5a4a', 0.03);
    k.poly(
      [
        [-0.85, 1.05],
        [0.75, 1.1],
        [0.9, 1.3],
        [-0.7, 1.45],
      ],
      '#9aa0a8',
    );
    k.plain();
    for (let x = -0.6; x < 0.7; x += 0.3) k.line(x, 1.08, x + 0.05, 1.4, 0.015, '#5a6068');
    k.box(-0.85, 1.05, 1.6, 0.03, k.accent);
    k.disc(0.85, 1.22, 0.05, rgba('#ff3b2a', 0.3 + 0.7 * k.mf.beat));
  },
  // a curtain of chains with hubcaps on them, swinging with the bass
  wsChains(k) {
    k.plain();
    k.line(-0.75, 1.6, 0.75, 1.6, 0.06, '#5a4a3a');
    k.line(-0.6, 1.6, -0.5, k.sky, 0.03, '#6a5a4a');
    k.line(0.6, 1.6, 0.5, k.sky, 0.03, '#6a5a4a');
    for (let i = 0; i < 5; i++) {
      const x = -0.6 + i * 0.3,
        sw = 0.06 * Math.sin(k.t * 3 + i) * (0.4 + k.mf.bass);
      k.line(x, 1.6, x + sw, 1.2, 0.025, '#8a7a6a');
      k.disc(x + sw, 1.15, 0.09, '#b0b4b8');
      k.disc(x + sw, 1.15, 0.03, rgba(k.T.slide, 0.5 + 0.5 * k.mf.kick));
    }
  },
  // a sheet of corrugated iron on two posts
  wsSheet(k, o) {
    k.box(-0.16, 0, 0.32, o.h, '#7a5038', k.accent, 0.03);
    k.plain();
    for (let x = -0.12; x < 0.16; x += 0.08) k.line(x, 0.04, x, o.h - 0.04, 0.025, '#5a3a28');
    for (let i = 0; i < 6; i++)
      k.disc(-0.08 + (i % 2) * 0.16, o.h * (0.15 + i * 0.14), 0.02, rgba(HOT, 0.3 + 0.5 * k.mf.kick));
  },
  // a barricade of planks, nailed up as far as the brush has got
  wsPlanks(k, o) {
    const rr = mulberry(Math.round(o.t * 1000));
    courses(k, o, 8, 0.42, () => (rr() < 0.5 ? '#7a5a3a' : '#5a4028'), false);
  },
  // a rusted girder on chains, its rivets lit on the beat
  wsGirder(k) {
    hanging(k, 2.12, 0.9, '#6a5a4a', 0.03);
    k.box(-0.7, 2.05, 1.4, 0.09, RUST, rgba(k.T.hold, 0.9), 0.025);
    for (let i = 0; i < 4; i++) k.disc(-0.5 + i * 0.33, 2.095, 0.025, rgba(k.T.hold, 0.4 + 0.6 * k.mf.beat));
  },
  wsRoofLedge: ledge(RUST),
  wsCrateLedge: ledge('#5a4028'),
  wsSaw: saw(DARK, '#d0b090'),
  wsSpikes: spikes('#6a4030', '#c9a070'),
  wsHubmine: mine('#4a3a30', '#b0a090'),
  wsFlamer: firejet(DARK, FIRE),
  wsHarpoon: grapnel('#5a4a3a', '#a08060'),
  wsGrinder: gears('#6a4030', '#c08040'),
};
