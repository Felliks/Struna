// The arena's obstacles: a kit bag, a stage wedge and a sideline cooler to jump; a camera rig on its wire, a banner of
// scarves and a lighting rig to slide under; an ad board's screen and a crowd barrier to kick through; a crossbar to
// swing on; a ledge of an ad board; and the shaft's hazards (a cable arc, a camera drone's blades, a smashed screen, a
// stadium fan, pyro jets, a speaker stack).
import { rgba } from '../util.js';
import { hanging, ledge } from './kit.js';
import { fan, firejet, glassburst, saw, speakerspit, zapper } from './hazards.js';

export default {
  // a kit bag, its stripe lit on the kick
  arBag(k, o) {
    k.round(-0.36, 0, 0.72, o.h * 0.8, 0.12, '#24304a');
    k.plain();
    k.box(-0.36, o.h * 0.32, 0.72, 0.08, rgba(k.T.jump, 0.5 + 0.5 * k.mf.kick));
    k.line(-0.2, o.h * 0.8, -0.1, o.h, 0.04, '#14182a');
    k.line(0.2, o.h * 0.8, 0.1, o.h, 0.04, '#14182a');
    k.line(-0.1, o.h, 0.1, o.h, 0.04, '#14182a');
  },
  // a stage wedge monitor, its grille lit on the snare
  arWedge(k, o) {
    k.poly([[-0.42, 0], [0.42, 0], [0.42, o.h * 0.55], [-0.42, o.h]], '#1a1a22');
    k.plain();
    k.poly([[-0.34, o.h * 0.12], [0.34, o.h * 0.12], [0.34, o.h * 0.5], [-0.34, o.h * 0.84]], rgba(k.T.jump, 0.25 + 0.6 * k.mf.snare));
    for (let i = 0; i < 4; i++) k.line(-0.3 + i * 0.2, o.h * 0.15, -0.3 + i * 0.2, o.h * (0.78 - i * 0.08), 0.015, '#0a0a10');
  },
  // a sideline cooler on wheels, its lid light blinking on the beat
  arCooler(k, o) {
    k.box(-0.3, 0.06, 0.6, o.h * 0.82, '#e04a2a', k.accent, 0.03);
    k.plain();
    k.box(-0.32, o.h * 0.82, 0.64, o.h * 0.16, '#f0f0f0');
    k.box(-0.3, o.h * 0.4, 0.6, 0.05, '#f0f0f0');
    for (const x of [-0.2, 0.2]) k.disc(x, 0.05, 0.05, '#1a1a1a');
    k.disc(0, o.h * 0.9, 0.04, rgba(k.T.jump, 0.4 + 0.6 * k.mf.beat));
  },
  // a spider-cam riding its wires across, its lens flashing on the hats
  arCam(k) {
    k.plain();
    k.line(-0.9, 2.2, 0, 1.5, 0.015, '#9aa0a8');
    k.line(0.9, 2.2, 0, 1.5, 0.015, '#9aa0a8');
    k.line(-0.9, 1.9, -0.9, k.sky, 0.04, '#5a5e66');
    k.line(0.9, 1.9, 0.9, k.sky, 0.04, '#5a5e66');
    k.glow();
    k.box(-0.25, 1.2, 0.5, 0.32, '#20242c', k.accent, 0.025);
    k.disc(0, 1.15, 0.1, '#0a0a10');
    k.disc(0, 1.15, 0.05, rgba(k.T.slide, 0.4 + 0.6 * Math.min(1, k.mf.hat * 3)));
    k.box(-0.35, 1.5, 0.7, 0.04, '#5a5e66');
  },
  // a banner of fans' scarves hung across, swinging with the bass
  arScarves(k) {
    hanging(k, 1.75, 1.1, '#5a5e66', 0.02);
    k.box(-0.75, 1.68, 1.5, 0.07, '#3a3c44');
    k.plain();
    const cols = [k.T.hold, k.T.slide, '#ffffff', k.T.jump];
    for (let i = 0; i < 6; i++) {
      const x = -0.65 + i * 0.26,
        sw = 0.05 * Math.sin(k.t * 3 + i) * (0.5 + k.mf.bass);
      k.poly([[x, 1.68], [x + 0.18, 1.68], [x + 0.18 + sw, 1.12], [x + 0.09 + sw, 1.07], [x + sw, 1.12]], cols[i % 4]);
      k.box(x + sw, 1.3, 0.18, 0.05, rgba('#ffffff', 0.4 + 0.5 * k.mf.kick));
    }
  },
  // a lighting rig lowered across, its par cans flashing in turn on the beat
  arRig(k) {
    hanging(k, 1.5, 1.0, '#5a5e66', 0.025);
    k.box(-0.75, 1.38, 1.5, 0.12, '#2a2c34', k.accent, 0.025);
    k.plain();
    for (let i = 0; i < 5; i++) {
      const x = -0.6 + i * 0.3,
        on = Math.floor(k.t * 5) % 5 === i ? 1 : 0.25;
      k.box(x - 0.08, 1.12, 0.16, 0.26, '#14141a');
      k.disc(x, 1.14, 0.07, rgba(i % 2 ? k.T.slide : '#f4f8ff', on * (0.5 + 0.5 * k.mf.kick)));
    }
  },
  // an LED ad board's screen standing on end: its pixels chasing on the beat
  arScreen(k, o) {
    k.box(-0.15, 0, 0.3, o.h, '#05060a', k.accent, 0.03);
    k.plain();
    for (let y = 0.1; y < o.h - 0.1; y += 0.14) {
      const on = Math.max(0, Math.sin(k.t * 8 - y * 4));
      k.box(-0.11, y, 0.22, 0.1, rgba(k.T.win[Math.floor(y * 7) % 3], 0.2 + 0.7 * on * (0.5 + 0.5 * k.mf.beat)));
    }
  },
  // a crowd barrier: a steel frame with a mesh, its stripes lit on the kick
  arBarrier(k, o) {
    k.box(-0.2, 0, 0.4, 0.08, '#3a3c44');
    k.plain();
    for (const x of [-0.18, 0.18]) k.line(x, 0, x, o.h, 0.05, '#9aa0a8');
    k.line(-0.2, o.h, 0.2, o.h, 0.06, '#9aa0a8');
    for (let y = 0.15; y < o.h; y += 0.18) k.line(-0.18, y, 0.18, y, 0.015, '#6a6e76');
    for (let y = 0.3; y < o.h - 0.2; y += 0.6) k.box(-0.18, y, 0.36, 0.08, rgba('#ffd84a', 0.4 + 0.6 * k.mf.kick));
  },
  // a crossbar on cables, lit on the beat
  arBar(k) {
    hanging(k, 2.12, 0.9, '#5a5e66', 0.025);
    k.box(-0.7, 2.05, 1.4, 0.09, '#f0f0f0', rgba(k.T.hold, 0.9), 0.025);
    for (let i = 0; i < 3; i++) k.disc(-0.45 + i * 0.45, 2.0, 0.05, rgba(k.T.hold, 0.4 + 0.6 * k.mf.beat));
  },
  arBoard: ledge('#14161e', true),
  arZap: zapper('#1a1d24', '#f4f8ff'),
  arDrone: saw('#20242c', '#e0e8ff'),
  arShatter: glassburst('#20242c', '#cfe8ff'),
  arFan: fan('#2a2c34', '#d9dde3'),
  arPyro: firejet('#2a2a30', '#ffd84a'),
  arStack: speakerspit('#14141c', '#29e7ff'),
};
