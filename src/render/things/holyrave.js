// Holy Rave's obstacles (places/holyrave.js), in acid neon: a bass bin with a cartoon skull drum on its grille (the
// DRUMTAPEs), a pulpit that is a speaker, and a flight case with a ring of made-up glyphs to jump; a neon halo hung on
// its wire, a pointed arch of lasers and a bar of strobes to slide under; a window of acid blots and an LED wall with
// the eye of "Лимб" to kick through; a truss hung with a halo to swing on; and its hazards: a spinning record, a
// strobe zapper, a fan of lasers, a spinning halo of teeth, a shock off a speaker, a glitching cube.
import { rgba } from '../util.js';
import { hanging } from './kit.js';
import { discoball, glitchcube, laserpair, saw, speakerspit, zapper } from './hazards.js';

const GREEN = '#3dff6a',
  PINK = '#ff2fd0',
  VIOLET = '#6a2cff',
  LIME = '#9dff3a',
  BLACK = '#0c0a14';

export default {
  // a bass bin, a cartoon skull on its grille, the skull's jaw dropping on the kick
  hrBassbin(k, o) {
    const h = o.h;
    k.box(-0.32, 0, 0.64, h, BLACK, k.accent, 0.035);
    k.plain();
    k.disc(0, h * 0.5, 0.24 * (1 + 0.1 * k.mf.bass), '#1c1a26');
    k.disc(0, h * 0.56, 0.13, '#f0ece4');
    k.box(-0.08, h * 0.4 - 0.04 * k.mf.kick, 0.16, 0.07, '#f0ece4');
    k.disc(-0.05, h * 0.58, 0.035, rgba(GREEN, 0.6 + 0.4 * k.mf.kick));
    k.disc(0.05, h * 0.58, 0.035, rgba(GREEN, 0.6 + 0.4 * k.mf.kick));
    k.box(-0.3, h * 0.92, 0.6, 0.03, rgba(PINK, 0.5 + 0.5 * k.mf.beat));
  },
  // a pulpit that is a speaker: a stand of truss and a wedge of cones, its rim lit on the beat
  hrLectern(k, o) {
    const h = o.h;
    k.box(-0.06, 0, 0.12, h * 0.6, '#3a3c48');
    k.poly([[-0.36, h * 0.55], [0.36, h * 0.55], [0.3, h], [-0.3, h]], BLACK);
    k.plain();
    for (const x of [-0.15, 0.15]) k.disc(x, h * 0.77, 0.08 * (1 + 0.15 * k.mf.bass), '#2a2638');
    k.box(-0.36, h * 0.55, 0.72, 0.03, rgba(GREEN, 0.5 + 0.5 * k.mf.beat));
    k.box(-0.3, h - 0.03, 0.6, 0.03, k.accent);
  },
  // a flight case with a ring of glyphs of light on it (made up, no symbol)
  hrCase(k, o) {
    const h = o.h;
    k.box(-0.34, 0, 0.68, h, '#2a2836', k.accent, 0.035);
    k.plain();
    for (const x of [-0.34, 0.27]) k.box(x, 0, 0.07, h, '#8a8aa0');
    k.disc(0, h * 0.5, 0.17, rgba(VIOLET, 0.5 + 0.3 * k.mf.kick));
    k.disc(0, h * 0.5, 0.12, '#2a2836');
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + k.t;
      k.box(Math.cos(a) * 0.145 - 0.015, h * 0.5 + Math.sin(a) * 0.145 - 0.015, 0.03, 0.03, rgba(LIME, 0.8));
    }
  },
  // a neon halo hung on its wire, pulsing on the kick
  hrHalo(k) {
    k.plain();
    k.line(0, 1.62, 0, k.sky, 0.02, '#8a8aa0');
    const w = 0.7 + 0.04 * k.mf.kick;
    k.poly([[-w, 1.25], [-w * 0.7, 1.45], [w * 0.7, 1.45], [w, 1.25], [w * 0.7, 1.05], [-w * 0.7, 1.05]], rgba('#ffd23a', 0.85));
    k.poly([[-w + 0.12, 1.25], [-w * 0.7 + 0.08, 1.37], [w * 0.7 - 0.08, 1.37], [w - 0.12, 1.25], [w * 0.7 - 0.08, 1.13], [-w * 0.7 + 0.08, 1.13]], rgba('#140c00', 0.9));
    k.box(-0.6, 1.02, 1.2, 0.03, rgba(k.T.slide, 0.5 + 0.5 * k.mf.kick));
  },
  // a pointed arch of lasers between two emitters hung from above
  hrLaserArch(k) {
    hanging(k, 1.75, 1.2, '#5a5e66', 0.02);
    k.box(-0.7, 1.05, 0.14, 0.7, '#1c1a26');
    k.box(0.56, 1.05, 0.14, 0.7, '#1c1a26');
    k.plain();
    const c = [GREEN, PINK, k.T.slide];
    for (let i = 0; i < 3; i++) {
      const y = 1.1 + i * 0.1;
      k.line(-0.56, y, 0, 1.7 - i * 0.04, 0.03 + 0.02 * k.mf.hat, c[i]);
      k.line(0.56, y, 0, 1.7 - i * 0.04, 0.03 + 0.02 * k.mf.hat, c[i]);
    }
    k.line(-0.56, 1.1, 0.56, 1.1, 0.05, k.T.slide);
  },
  // a bar of strobes, flashing one after another on the beat
  hrStrobebar(k) {
    hanging(k, 1.45, 1.1, '#5a5e66', 0.02);
    k.box(-0.75, 1.1, 1.5, 0.35, '#1c1a26', k.accent, 0.03);
    k.plain();
    const n = Math.floor(k.t * 8) % 5;
    for (let i = 0; i < 5; i++) k.box(-0.66 + i * 0.27, 1.16, 0.2, 0.22, rgba('#ffffff', i === n ? 0.9 : 0.15 + 0.2 * k.mf.kick));
  },
  // a pointed window of acid blots in black leading: kicked through, it breaks as glass
  hrStained(k, o) {
    const h = o.h;
    k.poly([[-0.16, 0], [0.16, 0], [0.16, h * 0.82], [0, h], [-0.16, h * 0.82]], rgba('#140c20', 0.6));
    k.plain();
    const c = [GREEN, PINK, VIOLET, LIME],
      n = Math.floor(k.t / 0.5);
    for (let i = 0; i < 6; i++) k.disc(((i % 2) - 0.5) * 0.14, h * (0.12 + i * 0.13), 0.08, rgba(c[(i + n) % 4], 0.55 + 0.3 * k.mf.kick));
    for (let y = 0.2; y < h; y += 0.3) k.box(-0.16, y, 0.32, 0.025, '#05040a');
    k.box(-0.012, 0, 0.025, h * 0.95, '#05040a');
  },
  // an LED wall with an acid eye on it, its pupil closing on the kick
  hrEyewall(k, o) {
    const h = o.h;
    k.box(-0.15, 0, 0.3, h, '#0a0812', k.accent, 0.03);
    k.plain();
    const y = h * 0.55;
    for (let r = 0; r < 4; r++) k.disc(0, y, 0.13 - r * 0.028, [GREEN, PINK, VIOLET, '#e0b040'][r]);
    k.disc(0, y, 0.025 + 0.02 * (1 - k.mf.kick), '#04140f');
    for (let yy = 0.08; yy < h - 0.05; yy += 0.1) if (Math.abs(yy - y) > 0.16) k.box(-0.11, yy, 0.22, 0.05, rgba(GREEN, 0.15 + 0.3 * Math.abs(Math.sin(k.t * 4 + yy * 5))));
  },
  // a truss hung with a halo, to swing on
  hrTrussHalo(k) {
    hanging(k, 2.12, 0.9, '#5a5e66', 0.025);
    k.box(-0.7, 2.05, 1.4, 0.1, '#9aa0a8', rgba(k.T.hold, 0.9), 0.025);
    k.plain();
    k.poly([[-0.3, 2.32], [-0.2, 2.38], [0.2, 2.38], [0.3, 2.32], [0.2, 2.26], [-0.2, 2.26]], rgba('#ffd23a', 0.5 + 0.5 * k.mf.kick));
    for (let i = 0; i < 3; i++) k.disc(-0.45 + i * 0.45, 2.0, 0.05, rgba(k.T.hold, 0.4 + 0.6 * k.mf.beat));
  },
  hrVinylSaw: saw('#0a0a10', '#ff2fd0'),
  hrStrobeZap: zapper('#1c1a26', '#ffffff'),
  hrLaserFan: laserpair('#1c1a26', '#3dff6a'),
  hrHaloSpin: discoball('#ffd23a', '#9dff3a'),
  hrBassShock: speakerspit('#0c0a14', '#ff2fd0'),
  hrGlitch: glitchcube('#1a0e2a', '#3dff6a'),
};
