// Black Snow's obstacles (places/blacksnow.js), in black and white and one red: a kettlebell cast as a grinning
// cartoon skull (the cover of "Тяжесть"), a little radio frozen in a block of ice and an oil drum frozen over to jump; a
// pipe hung with icicles, a hook with its crate and a string of bird skulls to slide under; a wall of white tiles (the
// shine of a tiled floor in the song) and a pane of black ice to kick through; a pipe to swing on; and its hazards in
// grey steel, ice and a drip of black oil with a red-hot heart.
import { mulberry } from '../../rng.js';
import { rgba } from '../util.js';
import { courses, hanging } from './kit.js';
import { fan, icefangs, lavablob, saw, spikes, zapper } from './hazards.js';

const RED = '#c81e1e',
  INK = '#141416',
  STEEL = '#5a5a5e',
  PALE = '#d8d6d0',
  SNOW = '#eeece6',
  ICE = '#cfd6dc';

export default {
  // a kettlebell, its bell a cartoon skull grinning, its eyes lit red on the kick
  bsKettle(k, o) {
    const h = o.h;
    k.box(-0.22, h * 0.72, 0.07, h * 0.24, INK);
    k.box(0.15, h * 0.72, 0.07, h * 0.24, INK);
    k.box(-0.22, h * 0.9, 0.44, 0.08, INK);
    k.round(-0.3, 0, 0.6, h * 0.76, 0.26, '#26262a');
    k.plain();
    k.disc(-0.11, h * 0.44, 0.075, '#08080a');
    k.disc(0.11, h * 0.44, 0.075, '#08080a');
    k.disc(-0.11, h * 0.44, 0.03 + 0.02 * k.mf.kick, rgba(RED, 0.5 + 0.5 * k.mf.kick));
    k.disc(0.11, h * 0.44, 0.03 + 0.02 * k.mf.kick, rgba(RED, 0.5 + 0.5 * k.mf.kick));
    k.poly([[-0.03, h * 0.34], [0.03, h * 0.34], [0, h * 0.28]], '#08080a');
    for (let i = 0; i < 4; i++) k.box(-0.13 + i * 0.07, h * 0.12, 0.05, 0.08, PALE);
    k.box(-0.2, h * 0.7, 0.4, 0.03, k.accent);
  },
  // a little radio frozen into a block of ice, its dial still glowing, its needle on the beat
  bsTyre(k, o) {
    const h = o.h;
    k.box(-0.36, 0, 0.72, h, rgba(ICE, 0.55), k.accent, 0.03);
    k.plain();
    k.box(-0.24, h * 0.2, 0.48, h * 0.5, '#2a2a2e');
    k.disc(-0.1, h * 0.42, 0.09, '#141416');
    k.box(0.04, h * 0.5, 0.14, h * 0.12, rgba('#f0e8d0', 0.6 + 0.3 * k.mf.beat));
    k.box(0.05 + 0.1 * ((Math.floor(k.t / 0.5) * 0.37) % 1), h * 0.48, 0.015, h * 0.16, RED);
    k.line(0.18, h * 0.7, 0.3, h * 0.95, 0.02, STEEL);
    k.box(-0.36, h * 0.92, 0.72, 0.08, SNOW);
  },
  // an oil drum frozen over: snow on its lid, icicles off its rim, its band red
  bsBarrel(k, o) {
    const h = o.h;
    k.round(-0.24, 0, 0.48, h * 0.9, 0.04, STEEL);
    k.plain();
    for (const y of [0.25, 0.6]) k.box(-0.24, h * y, 0.48, 0.035, y < 0.4 ? RED : INK);
    k.round(-0.27, h * 0.88, 0.54, 0.09, 0.04, SNOW);
    for (let i = 0; i < 5; i++) k.poly([[-0.2 + i * 0.1, h * 0.88], [-0.16 + i * 0.1, h * 0.88], [-0.18 + i * 0.1, h * (0.78 - 0.05 * (i % 2))]], ICE);
    k.box(-0.22, h * 0.86, 0.44, 0.03, k.accent);
  },
  // a heating pipe hung across in its lagging, icicles off it trembling on the hats
  bsPipe(k) {
    hanging(k, 1.5, 1.1, STEEL, 0.025);
    k.round(-0.8, 1.2, 1.6, 0.3, 0.14, '#8a8884');
    k.plain();
    for (let x = -0.7; x < 0.8; x += 0.25) k.box(x, 1.2, 0.03, 0.3, '#5a5856');
    k.box(-0.82, 1.4, 1.64, 0.06, SNOW);
    for (let i = 0; i < 7; i++) {
      const x = -0.66 + i * 0.22,
        l = 0.12 + 0.08 * ((i * 7) % 3) + 0.02 * k.mf.hat;
      k.poly([[x - 0.04, 1.2], [x + 0.04, 1.2], [x, 1.2 - l]], ICE);
    }
    k.box(-0.8, 1.18, 1.6, 0.03, rgba(k.accent, 0.5 + 0.5 * k.mf.kick));
  },
  // a conveyor's hook on its trolley, a crate on it swinging with the bass
  bsHook(k) {
    const sw = 0.04 * Math.sin(k.t * 2.2) * (0.5 + k.mf.bass);
    k.plain();
    k.line(-0.9, 1.9, 0.9, 1.9, 0.08, INK);
    k.line(0, 1.9, sw * 3, 1.55, 0.03, STEEL);
    k.line(-0.85, 1.9, -0.7, k.sky, 0.03, STEEL);
    k.line(0.85, 1.9, 0.7, k.sky, 0.03, STEEL);
    k.box(-0.5 + sw, 1.08, 1.0, 0.45, '#6a6864', k.accent, 0.03);
    k.plain();
    k.line(-0.5 + sw, 1.08, 0.5 + sw, 1.53, 0.03, '#4a4846');
    k.line(-0.5 + sw, 1.53, 0.5 + sw, 1.08, 0.03, '#4a4846');
    k.box(-0.15 + sw, 1.26, 0.3, 0.1, rgba(RED, 0.6 + 0.4 * k.mf.beat));
  },
  // a string of bird skulls hung across on a cord, their long bills down, their sockets lit red on the snare
  bsLine(k) {
    hanging(k, 1.7, 1.4, INK, 0.02);
    k.plain();
    k.line(-0.85, 1.72, 0.85, 1.66, 0.025, PALE);
    for (let i = 0; i < 4; i++) {
      const x = -0.6 + i * 0.4,
        sw = 0.03 * Math.sin(k.t * 3 + i) * (0.4 + k.mf.bass);
      k.line(x, 1.7, x + sw, 1.5, 0.015, PALE);
      k.disc(x + sw, 1.42, 0.1, PALE);
      k.poly([[x + sw - 0.04, 1.36], [x + sw + 0.04, 1.36], [x + sw + 0.01, 1.1]], PALE);
      k.disc(x + sw - 0.03, 1.44, 0.03, rgba(RED, 0.5 + 0.5 * k.mf.snare));
    }
    k.box(-0.8, 1.06, 1.6, 0.03, rgba(k.accent, 0.4 + 0.6 * k.mf.kick));
  },
  // a wall of white tiles, laid course by course as far as the brush has got, a red tile here and there
  bsKafel(k, o) {
    const rr = mulberry(Math.round(o.t * 1000));
    courses(k, o, 9, 0.4, () => (rr() < 0.1 ? RED : rr() < 0.5 ? '#ecebe6' : '#d6d4ce'), false);
  },
  // a pane of black ice standing up out of the floe, a red crack through it: kicked through, it breaks as glass
  bsGate(k, o) {
    k.box(-0.17, 0, 0.34, o.h, rgba('#1a1a20', 0.75), k.accent, 0.03);
    k.plain();
    k.line(-0.1, o.h * 0.9, 0.12, o.h * 0.15, 0.02, rgba('#ffffff', 0.35));
    k.line(-0.12, o.h * 0.3, 0.02, o.h * 0.5, 0.025, rgba(RED, 0.5 + 0.5 * k.mf.kick));
    k.line(0.02, o.h * 0.5, 0.1, o.h * 0.68, 0.025, rgba(RED, 0.5 + 0.5 * k.mf.kick));
    k.box(-0.19, o.h - 0.08, 0.38, 0.08, SNOW);
  },
  // a pipe on its chains to swing on, snow along its top, its clamps lit on the beat
  bsPipeBar(k) {
    hanging(k, 2.14, 0.9, STEEL, 0.03);
    k.round(-0.72, 2.04, 1.44, 0.11, 0.05, '#8a8884');
    k.frame(-0.72, 2.04, 1.44, 0.11, rgba(k.T.hold, 0.9), 0.025);
    k.plain();
    k.box(-0.7, 2.13, 1.4, 0.04, SNOW);
    for (const x of [-0.45, 0, 0.45]) k.box(x - 0.04, 2.02, 0.08, 0.15, rgba(k.T.hold, 0.4 + 0.6 * k.mf.beat));
  },
  bsSaw: saw('#2a2a2e', '#e8e6e0'),
  bsIcicle: icefangs('#9aa2a8', '#ffffff'),
  bsCable: zapper('#2a2a2e', '#ff6a5a'),
  bsSpikes: spikes('#3a3a3e', '#d8d6d0'),
  bsFan: fan('#2a2a2e', '#c8c6c0'),
  bsMazut: lavablob('#0a0a0c', RED),
};
