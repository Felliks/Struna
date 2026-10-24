// Kowloon's obstacles: a rooftop water tank, a diesel generator and a stack of foam boxes to jump; a hologram sign, a
// line of laundry and a knot of wires to slide under; a holo pane and a tiled flat wall to kick through; a pipe hung on
// wires to swing on; a ledge of AC units; and its hazards in rusty steel and neon.
import { mulberry } from '../../rng.js';
import { rgba } from '../util.js';
import { courses, hanging, ledge } from './kit.js';
import { fan, glitchcube, neonsign, saw, spikes, zapper } from './hazards.js';

export default {
  // a water tank on its stand, its level light on the kick
  kwTank(k, o) {
    k.box(-0.3, 0, 0.06, o.h * 0.35, '#3b3238');
    k.box(0.24, 0, 0.06, o.h * 0.35, '#3b3238');
    k.round(-0.32, o.h * 0.3, 0.64, o.h * 0.7, 0.08, '#6a5a52');
    k.plain();
    for (const y of [0.5, 0.75]) k.box(-0.32, o.h * y, 0.64, 0.03, '#3b3238');
    k.box(-0.22, o.h * 0.92, 0.44, 0.04, rgba(k.T.jump, 0.4 + 0.6 * k.mf.kick));
  },
  // a generator, its exhaust puffing on the bass and its lamp on the beat
  kwGenerator(k, o) {
    k.box(-0.34, 0, 0.68, o.h * 0.8, '#4a4038', k.accent, 0.03);
    k.plain();
    for (let x = -0.26; x < 0.1; x += 0.08) k.line(x, o.h * 0.2, x, o.h * 0.6, 0.025, '#2a2420');
    k.box(0.16, o.h * 0.8, 0.08, o.h * 0.12, '#2a2420');
    k.disc(0.2, o.h * 0.92 + 0.02 * k.mf.bass, 0.03 + 0.04 * k.mf.bass, rgba('#9aa0a8', 0.3 + 0.4 * k.mf.bass));
    k.disc(0.24, o.h * 0.5, 0.045, rgba('#ff4f5c', 0.4 + 0.6 * k.mf.beat));
  },
  // foam boxes stacked crooked, a neon strap round them on the kick
  kwFoam(k, o) {
    const h = o.h / 3;
    k.box(-0.3, 0, 0.6, h, '#e8e4dc', k.accent, 0.025);
    k.box(-0.26, h, 0.56, h, '#d8d4cc', k.accent, 0.025);
    k.box(-0.32, 2 * h, 0.58, h, '#e8e4dc', k.accent, 0.025);
    k.plain();
    k.box(-0.04, 0, 0.06, o.h, rgba('#29ffd0', 0.4 + 0.6 * k.mf.kick));
  },
  // a hologram sign hung on wires: a panel of shapes flickering on the hats
  kwHoloSign(k) {
    hanging(k, 1.55, 0.7, '#3b3238', 0.025);
    k.box(-0.6, 1.08, 1.2, 0.48, '#120c1a', k.accent, 0.03);
    k.plain();
    const on = (Math.floor(k.t * 12) % 7 ? 0.5 : 0.1) + 0.5 * k.mf.hat;
    k.disc(-0.3, 1.32, 0.13, rgba('#ff4fd8', on));
    k.poly([[0.0, 1.16], [0.16, 1.48], [0.32, 1.16]], rgba('#29ffd0', on));
    k.box(-0.55, 1.12, 1.1, 0.04, rgba(k.T.slide, 0.5 + 0.5 * k.mf.kick));
  },
  // laundry on a line, shirts flapping with the bass, a lamp clipped to it on the kick
  kwLaundry(k) {
    hanging(k, 1.7, 1.3, '#6a5a52', 0.02);
    k.plain();
    k.line(-0.8, 1.72, 0.8, 1.68, 0.025, '#c9ccd2');
    const cols = ['#c94a4a', '#e8e4dc', '#4a7ac9', '#e8c040'];
    for (let i = 0; i < 4; i++) {
      const x = -0.65 + i * 0.36,
        sw = Math.sin(k.t * 5 + i) * 0.05 * (0.3 + k.mf.bass);
      k.poly([[x, 1.7], [x + 0.26, 1.7], [x + 0.24 + sw, 1.12], [x + 0.02 + sw, 1.1]], cols[i]);
    }
    k.disc(0.75, 1.62, 0.05, rgba(k.T.slide, 0.4 + 0.6 * k.mf.kick));
  },
  // a knot of wires sagging across, a junction box sparking on the snare
  kwWires(k) {
    k.plain();
    for (const x of [-0.7, 0.7]) k.line(x, 1.3, x, k.sky, 0.05, '#3b3238');
    const sway = 0.04 * k.mf.bass * Math.sin(k.t * 4);
    for (let i = 0; i < 5; i++) {
      const lo = 1.1 + i * 0.06 + sway * (i % 2 ? 1 : -1);
      k.line(-0.7, 1.4 + i * 0.03, 0, lo, 0.045, i % 2 ? '#2a2a2e' : '#4a3a3a');
      k.line(0, lo, 0.7, 1.38 + i * 0.04, 0.045, i % 2 ? '#2a2a2e' : '#4a3a3a');
    }
    k.glow();
    k.box(-0.2, 1.12, 0.4, 0.3, '#59606e', k.accent, 0.025);
    k.plain();
    k.disc(0, 1.27, 0.07, rgba('#ffe14a', 0.3 + 0.7 * (k.mf.snare ?? 0)));
  },
  // a holo pane: a sheet of light with shapes in it, scanlines rolling on the hats
  kwHoloPane(k, o) {
    k.box(-0.15, 0, 0.3, o.h, rgba('#29ffd0', 0.18 + 0.22 * k.mf.kick), k.accent, 0.03);
    k.plain();
    const s = (k.t * 0.7 + k.mf.hat * 0.5) % 1;
    k.box(-0.15, o.h * s, 0.3, 0.06, rgba('#ffffff', 0.5));
    k.disc(0, o.h * 0.6, 0.08, rgba('#ff4fd8', 0.4 + 0.5 * k.mf.kick));
    k.box(-0.19, 0, 0.38, 0.08, '#1a1420');
    k.box(-0.19, o.h - 0.06, 0.38, 0.06, '#1a1420');
  },
  // a flat's wall of cheap tiles, laid course by course
  kwTileWall(k, o) {
    const rr = mulberry(Math.round(o.t * 1000) + 7);
    courses(k, o, 16, 0.4, () => (rr() < 0.5 ? '#9ab0a8' : '#c9d2c8'), false);
  },
  // a pipe hung on wires, its taped grip lit
  kwPipeBar(k) {
    hanging(k, 2.12, 0.9, '#3b3238', 0.025);
    k.box(-0.7, 2.05, 1.4, 0.09, '#8a7a70', rgba(k.T.hold, 0.9), 0.025);
    k.plain();
    k.box(-0.2, 2.05, 0.4, 0.09, rgba(k.T.hold, 0.5 + 0.5 * k.mf.kick));
  },
  kwAcLedge: ledge('#59606e'),
  kwSaw: saw('#2a2430', '#ffb8e0'),
  kwRazor: spikes('#3a3038', '#c9ccd2'),
  kwZap: zapper('#2a2238', '#ff4fd8'),
  kwNeon: neonsign('#120c1a', '#29ffd0'),
  kwFan: fan('#3a3440', '#b0b8c0'),
  kwGlitch: glitchcube('#1a0a28', '#ff4fd8'),
};
