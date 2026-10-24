// The skies' obstacles: a cloud, a floating rock and a propeller crate to jump; a hot-air balloon's basket, a line of
// pennants and an airship's gondola to slide under; a stained-glass window and a stone column to kick through; a
// balloon's trapeze bar to swing on; ledges of cloud and stone; and the sky's hazards in a shaft.
import { mulberry } from '../../rng.js';
import { rgba } from '../util.js';
import { courses, hanging, ledge } from './kit.js';
import { fan, mine, saw, shards, vortex, zapper } from './hazards.js';

export default {
  // a cloud, lit inside on the kick, its puffs swelling with the bass
  skCloud(k, o) {
    const s = 1 + 0.06 * k.mf.bass;
    for (const [x, y, r] of [[-0.22, 0.2, 0.18], [0.2, 0.2, 0.18], [0, 0.27, 0.22]]) k.disc(x, y, r * s, '#eef4ff');
    k.round(-0.4, 0, 0.8, 0.22, 0.1, '#dfe8f8');
    k.plain();
    k.disc(0, 0.22, 0.1, rgba(k.T.jump, 0.35 + 0.6 * k.mf.kick));
  },
  // a chunk of floating rock with turf on top and a trickle of water off it
  skRock(k, o) {
    k.poly([[-0.4, o.h * 0.85], [0.4, o.h * 0.85], [0.25, o.h * 0.3], [0.05, 0], [-0.2, o.h * 0.25]], '#6a6a7a');
    k.plain();
    k.box(-0.42, o.h * 0.85, 0.84, o.h * 0.15, '#5ab06a');
    k.line(0.3, o.h * 0.85, 0.3, 0.05, 0.04, rgba('#e8f8ff', 0.4 + 0.5 * k.mf.hat * 2));
    k.disc(-0.1, o.h * 0.55, 0.05, rgba(k.T.jump, 0.4 + 0.6 * k.mf.kick));
  },
  // a cargo crate with its own little propeller on top, turning with the hats
  skPropbox(k, o) {
    k.box(-0.3, 0, 0.6, o.h * 0.8, '#8a6a40', k.accent, 0.035);
    k.plain();
    k.line(-0.3, o.h * 0.4, 0.3, o.h * 0.4, 0.03, '#4a3a20');
    k.line(0, o.h * 0.8, 0, o.h * 0.92, 0.04, '#3b4048');
    const a = Math.cos(k.spin) * 0.3;
    k.line(-a, o.h * 0.92, a, o.h * 0.92, 0.045, '#d9dde3');
    k.disc(0, o.h * 0.9, 0.04, rgba(k.T.jump, 0.5 + 0.5 * k.mf.kick));
  },
  // a hot-air balloon's basket hanging just over his head, its burner flaring on the kick
  skBalloon(k) {
    k.plain();
    for (const x of [-0.4, 0.4]) k.line(x, 1.4, x * 1.6, 2.1, 0.025, '#5a4a3a');
    k.glow();
    k.round(-1.0, 2.0, 2.0, 2.4, 1.0, '#d84a3a');
    k.plain();
    k.round(-0.35, 2.0, 0.7, 2.4, 0.35, '#ffd27a');
    k.disc(0, 1.6, 0.08 + 0.06 * k.mf.kick, rgba('#ffb347', 0.5 + 0.5 * k.mf.kick));
    k.glow();
    k.box(-0.45, 1.05, 0.9, 0.35, '#8a6a40', k.accent, 0.03);
    k.plain();
    for (let i = 0; i < 4; i++) k.line(-0.45, 1.12 + i * 0.08, 0.45, 1.12 + i * 0.08, 0.012, '#5a4426');
  },
  // a line of pennants strung across, fluttering with the bass, lit on the snare
  skPennants(k) {
    hanging(k, 1.6, 1.1, '#9aa0a8');
    k.line(-0.75, 1.6, 0.75, 1.55, 0.03, '#d9dde3');
    k.plain();
    for (let i = 0; i < 6; i++) {
      const x = -0.65 + i * 0.26,
        fl = 0.04 * Math.sin(k.t * 7 + i) * (0.4 + k.mf.bass);
      k.poly([[x - 0.1, 1.58], [x + 0.1, 1.57], [x + fl, 1.08]], i % 2 ? rgba(k.T.slide, 0.6 + 0.4 * (k.mf.snare ?? 0)) : '#f0f4ff');
    }
  },
  // an airship's gondola: its hull overhead, portholes lit on the kick, a propeller turning at its stern
  skGondola(k) {
    k.plain();
    k.round(-1.1, 1.75, 2.2, 1.2, 0.6, '#c8ccd8');
    k.glow();
    for (const x of [-0.4, 0.4]) k.line(x, 1.45, x, 1.8, 0.03, '#59606e');
    k.round(-0.6, 1.05, 1.2, 0.42, 0.12, '#4a3a2a');
    k.plain();
    for (let i = 0; i < 4; i++) k.disc(-0.4 + i * 0.27, 1.27, 0.06, rgba(k.T.slide, 0.4 + 0.6 * k.mf.kick));
    const a = Math.sin(k.spin) * 0.25;
    k.line(0.66, 1.26 - a, 0.66, 1.26 + a, 0.04, '#d9dde3');
  },
  // a temple's stained-glass window, its panes glowing in turn on the beat
  skWindow(k, o) {
    k.box(-0.15, 0, 0.3, o.h, rgba('#bfe0ff', 0.25 + 0.15 * k.mf.kick), k.accent, 0.03);
    k.plain();
    const cols = ['#ff6a8a', '#ffd27a', '#7ad0ff'];
    for (let i = 0; i < 6; i++) k.box(-0.11, o.h * (0.08 + i * 0.15), 0.22, o.h * 0.11, rgba(cols[i % 3], 0.2 + 0.4 * (Math.floor(k.t * 4) % 6 === i ? k.mf.beat + 0.4 : 0.1)));
    k.box(-0.18, 0, 0.36, 0.08, '#d8d0c0');
    k.box(-0.18, o.h - 0.06, 0.36, 0.06, '#d8d0c0');
  },
  skColumn(k, o) {
    const rr = mulberry(Math.round(o.t * 1000));
    courses(k, o, 10, 0.42, () => (rr() < 0.5 ? '#e8e0d0' : '#cfc6b4'), false);
  },
  // a balloon's trapeze bar, its ends lit on the kick
  skTrapeze(k) {
    hanging(k, 2.12, 0.9, '#c8b88a', 0.03);
    k.box(-0.7, 2.05, 1.4, 0.08, '#8a6a40', rgba(k.T.hold, 0.9), 0.025);
    for (const x of [-0.7, 0.58]) k.box(x, 2.13, 0.12, 0.07, rgba('#ffd27a', 0.4 + 0.6 * k.mf.kick));
  },
  skCloudledge: ledge('#eef4ff'),
  skStoneledge: ledge('#6a6a7a'),
  // the sky's hazards: a storm saw, a thundercloud mine, lightning, a windmill's blades, a whirlwind, hail
  skSaw: saw('#5a6a8a', '#eef6ff'),
  skStorm: mine('#4a5470', '#cfe4ff'),
  skBolt: zapper('#4a5470', '#fff3a0'),
  skMill: fan('#6a5a4a', '#eef4ff'),
  skWhirl: vortex('#cfe4ff', '#ffffff'),
  skHail: shards('#9ab8e0', '#ffffff'),
};
