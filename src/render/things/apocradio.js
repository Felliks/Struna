// Radio Apocalypse's obstacles (places/apocradio.js), in chrome, rust, amber and teal: a boombox with flowers out of a
// speaker, a valve radiogram and an oil drum with an aerial on it to jump; wires strung with bulbs, a loudspeaker's horn
// on its bracket and a tuning dial hung across to slide under; a wall of old television sets showing snow and a sheet
// of rusty tin to kick through; a mast's crossbar to swing on; and its hazards: a dish with a saw's teeth, a ball of
// static, a coil throwing sparks, a swinging needle, sparks and a howl of feedback off a speaker.
import { rgba } from '../util.js';
import { hanging } from './kit.js';
import { mine, plasmaorb, saw, spikes, speakerspit, zapper } from './hazards.js';

const CHROME = '#9aa3ad',
  RUST = '#6a4028',
  AMBER = '#ffb040',
  TEAL = '#2fb7b0',
  MAGENTA = '#d0328c',
  DARK = '#16181c';

export default {
  // a boombox, its two cones pushed by the bass, flowers out of one
  rdBoombox(k, o) {
    const h = o.h;
    k.box(-0.36, 0, 0.72, h * 0.72, DARK, k.accent, 0.03);
    k.plain();
    k.line(-0.24, h * 0.72, -0.2, h * 0.9, 0.035, CHROME);
    k.line(0.24, h * 0.72, 0.2, h * 0.9, 0.035, CHROME);
    k.line(-0.2, h * 0.9, 0.2, h * 0.9, 0.035, CHROME);
    for (const x of [-0.19, 0.19]) {
      k.disc(x, h * 0.34, 0.14, CHROME);
      k.disc(x, h * 0.34, 0.11 * (1 + 0.12 * k.mf.bass), '#08080a');
    }
    k.box(-0.08, h * 0.52, 0.16, 0.06, rgba(AMBER, 0.6 + 0.4 * k.mf.beat));
    for (let i = 0; i < 3; i++) k.disc(0.15 + (i - 1) * 0.08, h * 0.5 + 0.06 * i, 0.04, i % 2 ? TEAL : MAGENTA);
  },
  // a valve radiogram, its dial glowing amber, its valves on the kick
  rdRadiola(k, o) {
    const h = o.h;
    k.round(-0.34, 0, 0.68, h * 0.9, 0.06, '#5a3a22');
    k.plain();
    k.box(-0.28, h * 0.5, 0.56, h * 0.25, rgba(AMBER, 0.45 + 0.35 * k.mf.beat));
    for (let x = -0.24; x < 0.26; x += 0.06) k.box(x, h * 0.52, 0.01, h * 0.08, '#3a2010');
    k.box(-0.28, h * 0.1, 0.56, h * 0.32, '#3a2616');
    for (const x of [-0.1, 0, 0.1]) k.disc(x, h * 0.88, 0.035, rgba('#ff8a3a', 0.4 + 0.6 * k.mf.kick));
  },
  // an oil drum with an aerial welded on, its light on the beat
  rdDrum(k, o) {
    const h = o.h;
    k.round(-0.24, 0, 0.48, h * 0.85, 0.04, RUST);
    k.plain();
    for (const y of [0.25, 0.6]) k.box(-0.24, h * y, 0.48, 0.03, '#3a2416');
    k.line(0.1, h * 0.85, 0.2, h * 1.3, 0.025, CHROME);
    k.line(0.12, h * 1.05, 0.28, h * 1.05, 0.02, CHROME);
    k.disc(0.2, h * 1.32, 0.03, rgba('#ff3a2a', 0.4 + 0.6 * k.mf.beat));
    k.box(-0.22, h * 0.82, 0.44, 0.03, k.accent);
  },
  // wires strung across with bulbs on them, the bulbs lit in turn on the hats
  rdWires(k) {
    k.plain();
    k.line(-0.85, 1.6, -0.7, k.sky, 0.03, CHROME);
    k.line(0.85, 1.6, 0.7, k.sky, 0.03, CHROME);
    for (const d of [0, 0.12]) k.line(-0.85, 1.6 - d, 0.85, 1.55 - d, 0.02, '#2a2a2e');
    const n = Math.floor(k.t * 8);
    for (let i = 0; i < 7; i++) {
      const x = -0.72 + i * 0.24,
        y = 1.45 - 0.12 * Math.sin(((i + 0.5) / 7) * Math.PI);
      k.line(x, y + 0.1, x, y, 0.015, '#2a2a2e');
      k.disc(x, y - 0.04, 0.05, rgba([AMBER, TEAL, MAGENTA][i % 3], (i + n) % 3 === 0 ? 1 : 0.35 + 0.4 * k.mf.hat));
    }
    k.box(-0.8, 1.08, 1.6, 0.03, rgba(k.T.slide, 0.4 + 0.6 * k.mf.kick));
  },
  // a loudspeaker's horn on its bracket, blaring on the kick
  rdHorn(k) {
    hanging(k, 1.5, 0.6, CHROME, 0.025);
    k.box(-0.7, 1.35, 0.9, 0.08, '#3a3a40');
    k.poly([[0.0, 1.28], [0.7, 1.08], [0.7, 1.6], [0.0, 1.42]], '#c9ccd2');
    k.plain();
    k.poly([[0.62, 1.12], [0.7, 1.08], [0.7, 1.6], [0.62, 1.56]], '#5a5e66');
    k.disc(0.68, 1.34, 0.08 + 0.08 * k.mf.kick, rgba(k.T.slide, 0.4 + 0.5 * k.mf.kick));
    k.box(-0.7, 1.05, 1.4, 0.03, rgba(k.T.slide, 0.5 + 0.5 * k.mf.kick));
  },
  // a tuning dial hung across, its needle jumping to a station on the beat
  rdDial(k) {
    hanging(k, 1.5, 1.1, CHROME, 0.02);
    k.box(-0.75, 1.08, 1.5, 0.42, '#1c1e22', k.accent, 0.03);
    k.plain();
    k.box(-0.68, 1.18, 1.36, 0.22, rgba(AMBER, 0.35 + 0.25 * k.mf.beat));
    for (let i = 0; i <= 12; i++) k.box(-0.66 + i * 0.11, 1.2, 0.012, i % 3 ? 0.06 : 0.12, '#3a2010');
    const nx = -0.6 + 1.2 * ((Math.floor(k.t / 0.5) * 0.37) % 1);
    k.box(nx - 0.012, 1.14, 0.025, 0.32, '#ff3a2a');
  },
  // a stack of old television sets, their screens snow: kicked through, it breaks as glass
  rdTVwall(k, o) {
    const h = o.h,
      n = 3;
    for (let i = 0; i < n; i++) {
      const y = (i * h) / n;
      k.box(-0.17, y + 0.01, 0.34, h / n - 0.02, '#3a3a40', k.accent, 0.025);
      k.plain();
      k.box(-0.13, y + 0.05, 0.26, h / n - 0.1, rgba('#c8d8d8', 0.35 + 0.25 * Math.abs(Math.sin(k.t * 13 + i * 2))));
      for (let j = 0; j < 4; j++) k.box(-0.12, y + 0.07 + j * ((h / n - 0.14) / 4), 0.24, 0.01, rgba('#ffffff', 0.4));
    }
  },
  // a sheet of rusty tin on two posts, a bolt of teal on the kick
  rdSheet(k, o) {
    k.box(-0.16, 0, 0.32, o.h, '#7a5038', k.accent, 0.03);
    k.plain();
    for (let x = -0.12; x < 0.16; x += 0.08) k.line(x, 0.04, x, o.h - 0.04, 0.02, '#5a3a28');
    k.line(-0.1, o.h * 0.7, 0.1, o.h * 0.4, 0.03, rgba(TEAL, 0.3 + 0.7 * k.mf.kick));
  },
  // a mast's crossbar on its guys, red lights on it on the beat
  rdMast(k) {
    hanging(k, 2.12, 0.9, CHROME, 0.03);
    k.box(-0.7, 2.05, 1.4, 0.09, '#5a5e66', rgba(k.T.hold, 0.9), 0.025);
    for (const x of [-0.6, 0.6]) k.disc(x, 2.2, 0.05, rgba('#ff3a2a', 0.4 + 0.6 * k.mf.beat));
  },
  rdDishSaw: saw('#3a3a40', '#c9ccd2'),
  rdStatic: plasmaorb('#1c1e22', '#9ff6ff'),
  rdTesla: zapper('#2a2c30', '#2fb7b0'),
  rdNeedle: spikes('#3a2a20', '#ffb040'),
  rdSpark: mine('#4a3020', '#ffb040'),
  rdFeedback: speakerspit('#16181c', '#d0328c'),
};
