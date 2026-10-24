// Fujisan's obstacles (places/fujisan.js), in black cinder, snow and the dawn's pink: a boulder of cinder capped with
// snow, a little pine bent in a pot and a big drum on its stand to jump; a branch in blossom, a low cloud and a carp
// streamer on its line to slide under; a paper screen painted with a wave (wood) and a pane of the snow cap's ice
// (glass) to kick through; a pine bough to swing on; and its hazards in cinder, ice and pink: a saw of petals, icicles,
// a bolt of the mountain's lightning, obsidian spikes, a fan of pink, a drop of the crater's glow.
import { rgba } from '../util.js';
import { hanging } from './kit.js';
import { fan, icefangs, lavablob, saw, spikes, zapper } from './hazards.js';

const SNOW = '#f4f0ff',
  CINDER = '#2a2030',
  PINK = '#ff7aa8',
  BLOSSOM = '#ffc0d8',
  PINE = '#2a5a3a',
  LAC = '#a8202a';

export default {
  // a boulder of black cinder, its cap of snow, violet glints in it on the hats
  fjRock(k, o) {
    const h = o.h;
    k.poly([[-0.4, 0], [-0.34, h * 0.7], [-0.1, h], [0.22, h * 0.92], [0.4, h * 0.55], [0.38, 0]], CINDER);
    k.plain();
    k.poly([[-0.34, h * 0.72], [-0.1, h * 1.02], [0.22, h * 0.94], [0.3, h * 0.78], [0, h * 0.82]], SNOW);
    for (let i = 0; i < 4; i++) k.disc(-0.2 + i * 0.13, h * (0.2 + 0.12 * (i % 2)), 0.02, rgba('#c8a0ff', 0.4 + 0.6 * k.mf.hat));
    k.box(-0.3, h * 0.8, 0.6, 0.03, rgba(k.accent, 0.5 + 0.5 * k.mf.kick));
  },
  // a little pine bent in a pot, its tiers of needles, snow on them
  fjBonsai(k, o) {
    const h = o.h;
    k.box(-0.32, 0, 0.64, h * 0.3, '#5a3a5a', k.accent, 0.03);
    k.plain();
    k.line(0, h * 0.3, -0.1, h * 0.6, 0.06, '#4a2a1a');
    k.line(-0.1, h * 0.6, 0.12, h * 0.9, 0.05, '#4a2a1a');
    for (const [x, y, w] of [[-0.2, 0.6, 0.36], [0.12, 0.82, 0.3], [0, 1.0, 0.22]]) {
      k.round(x - w / 2, h * y - 0.06, w, 0.13, 0.06, PINE);
      k.box(x - w / 2 + 0.03, h * y + 0.05, w - 0.06, 0.03, SNOW);
    }
    k.box(-0.3, h * 0.28, 0.6, 0.03, rgba(k.accent, 0.5 + 0.5 * k.mf.kick));
  },
  // a big drum on its stand, its skin dented and booming on the kick
  fjTaiko(k, o) {
    const h = o.h,
      d = 0.03 * k.mf.kick;
    k.line(-0.3, 0, -0.18, h * 0.4, 0.04, '#3a2a1a');
    k.line(0.3, 0, 0.18, h * 0.4, 0.04, '#3a2a1a');
    k.round(-0.34, h * 0.25, 0.68, h * 0.7, 0.12, LAC, k.accent, 0.03);
    k.plain();
    k.box(-0.34, h * 0.32, 0.68, 0.035, '#1a1010');
    k.box(-0.34, h * 0.86, 0.68, 0.035, '#1a1010');
    k.disc(0, h * 0.6, 0.18 - d, rgba('#f0e0c8', 0.9));
    k.disc(0, h * 0.6, 0.08 + 0.1 * k.mf.kick, rgba(PINK, 0.3 + 0.6 * k.mf.kick));
  },
  // a branch in blossom hung across, petals falling off it on the hats
  fjBlossom(k) {
    hanging(k, 1.6, 1.4, '#4a2a2a', 0.025);
    k.line(-0.95, 1.55, 0.95, 1.4, 0.08, '#3a1a1a');
    k.plain();
    k.line(-0.3, 1.5, -0.1, 1.2, 0.04, '#3a1a1a');
    k.line(0.4, 1.43, 0.55, 1.18, 0.04, '#3a1a1a');
    for (let i = 0; i < 11; i++) {
      const x = -0.85 + i * 0.17,
        y = 1.5 - i * 0.012 - (i % 3) * 0.08;
      k.disc(x, y, 0.09, i % 2 ? BLOSSOM : '#ffe0ea');
      k.disc(x, y, 0.025, PINK);
    }
    for (let i = 0; i < 3; i++) {
      const u = (k.t * 0.8 + i / 3) % 1;
      k.disc(-0.6 + i * 0.5 + u * 0.2, 1.3 - u * 1.1, 0.03, rgba(BLOSSOM, 1 - u));
    }
    k.box(-0.85, 1.12, 1.7, 0.03, rgba(k.accent, 0.4 + 0.6 * k.mf.kick));
  },
  // a low cloud hung across the slope, heaving on the bass, its underside lit pink
  fjCloud(k) {
    const b = 0.04 * k.mf.bass;
    k.plain();
    for (const [x, y, r] of [[-0.6, 1.45, 0.3], [-0.2, 1.55, 0.38], [0.25, 1.5, 0.35], [0.65, 1.42, 0.28]]) k.disc(x, y + b, r + b, '#ece4f4');
    k.box(-0.9, 1.15, 1.8, 0.3, '#ece4f4');
    k.box(-0.9, 1.12, 1.8, 0.06, rgba(PINK, 0.5 + 0.5 * k.mf.kick));
  },
  // a carp streamer on its line, rippling in the wind
  fjKoi(k) {
    k.plain();
    k.line(-1.0, 1.85, 1.0, 1.85, 0.03, '#4a2a2a');
    k.line(-0.95, 1.85, -0.85, k.sky, 0.025, '#8a8a8a');
    k.line(0.95, 1.85, 0.85, k.sky, 0.025, '#8a8a8a');
    const rip = i => 0.04 * Math.sin(k.t * 6 - i);
    const pts = [];
    for (let i = 0; i <= 6; i++) pts.push([-0.7 + i * 0.24, 1.6 + rip(i)]);
    k.poly([...pts, ...pts.slice().reverse().map(([x, y], i) => [x, y - 0.42 + (i === 0 ? 0.2 : 0)])], '#ff6a3a');
    for (let i = 1; i < 5; i++) k.disc(-0.7 + i * 0.26, 1.42 + rip(i), 0.07, rgba('#ffd0a0', 0.8));
    k.disc(-0.6, 1.45, 0.06, '#ffffff');
    k.disc(-0.6, 1.45, 0.03, '#1a1a1a');
    k.box(-0.8, 1.12, 1.6, 0.03, rgba(k.accent, 0.4 + 0.6 * k.mf.kick));
  },
  // a paper screen in its frame, a wave painted on it (wood: painted in by the brush)
  fjScreen(k, o) {
    const h = o.h;
    k.box(-0.2, 0, 0.4, h * k.u, '#f0e8dc', k.accent, 0.03);
    k.plain();
    for (let i = 1; i < 4; i++) k.box(-0.2, (h * i) / 4, 0.4, 0.02, '#3a2a1a');
    k.box(-0.01, 0, 0.02, h * k.u, '#3a2a1a');
    if (k.u > 0.6) {
      k.disc(0.02, h * 0.45, 0.12, rgba('#3a5a9a', 0.8));
      k.disc(-0.05, h * 0.5, 0.07, '#f0e8dc');
    }
  },
  // a pane of the snow cap's ice, a pink light in it; kicked through, it breaks as glass
  fjIce(k, o) {
    k.box(-0.17, 0, 0.34, o.h, rgba('#d8e8ff', 0.6), k.accent, 0.03);
    k.plain();
    k.line(-0.1, o.h * 0.85, 0.1, o.h * 0.2, 0.02, rgba('#ffffff', 0.5));
    k.disc(0, o.h * 0.55, 0.08 + 0.05 * k.mf.kick, rgba(PINK, 0.4 + 0.5 * k.mf.kick));
    k.box(-0.19, o.h - 0.08, 0.38, 0.08, SNOW);
  },
  // a pine bough to swing on, snow along its top
  fjPine(k) {
    hanging(k, 2.14, 0.9, '#6a5a5a', 0.025);
    k.round(-0.72, 2.04, 1.44, 0.11, 0.05, '#4a2a1a');
    k.frame(-0.72, 2.04, 1.44, 0.11, rgba(k.T.hold, 0.9), 0.025);
    k.plain();
    for (const x of [-0.5, -0.1, 0.35]) k.poly([[x - 0.18, 2.12], [x + 0.18, 2.12], [x, 2.3]], PINE);
    k.box(-0.7, 2.13, 1.4, 0.04, SNOW);
    for (const x of [-0.45, 0, 0.45]) k.box(x - 0.04, 2.02, 0.08, 0.15, rgba(k.T.hold, 0.4 + 0.6 * k.mf.beat));
  },
  fjPetalSaw: saw('#3a2030', BLOSSOM),
  fjIcicles: icefangs('#b8c8e8', '#ffffff'),
  fjBolt: zapper(CINDER, '#d8b8ff'),
  fjSpikes: spikes('#1a1420', '#8a7aa0'),
  fjFan: fan(CINDER, PINK),
  fjLava: lavablob('#2a1a2a', '#ff8ab0'),
};
