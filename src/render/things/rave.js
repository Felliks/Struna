// The rave's obstacles: a speaker stack, a flight case and a stage monitor to jump; a lighting truss, a laser bar and
// an LED banner to slide under; an LED panel and a glass booth to kick through; a truss bar to swing on; ledges of
// speakers and truss.
import { rgba } from '../util.js';
import { hanging, ledge } from './kit.js';

export default {
  // a speaker, its cone pumping with the bass, its ring lit on the kick
  speaker(k, o) {
    k.box(-0.3, 0, 0.6, o.h, '#15151c', k.accent, 0.035);
    k.plain();
    const r = Math.min(0.26, o.h * 0.3) * (1 + 0.12 * k.mf.bass);
    k.disc(0, o.h * 0.42, r, '#05050a');
    k.disc(0, o.h * 0.42, r * 0.35, '#2a2a34');
    k.disc(0, o.h * 0.82, 0.07, rgba(k.T.jump, 0.5 + 0.5 * k.mf.kick));
  },
  flightcase(k, o) {
    k.box(-0.34, 0, 0.68, o.h, '#3a3c44', k.accent, 0.035);
    k.plain();
    for (const x of [-0.34, 0.26]) k.box(x, 0, 0.08, o.h, '#9aa0a8');
    k.box(-0.34, o.h * 0.5 - 0.03, 0.68, 0.06, '#9aa0a8');
    k.box(-0.08, o.h * 0.7, 0.16, 0.08, rgba(k.T.jump, 0.6 + 0.4 * k.mf.beat));
  },
  // a wedge monitor, leaning back, its grille lit on the snare
  monitor(k, o) {
    k.poly([[-0.4, 0], [0.4, 0], [0.4, o.h * 0.5], [-0.4, o.h]], '#1c1c24');
    k.plain();
    k.poly([[-0.32, o.h * 0.15], [0.32, o.h * 0.15], [0.32, o.h * 0.48], [-0.32, o.h * 0.8]], rgba(k.T.jump, 0.25 + 0.5 * k.mf.snare));
  },
  // a lighting truss hung across, its lamps flashing in turn on the beat
  truss(k) {
    hanging(k, 1.5, 1.0, '#5a5e66', 0.025);
    k.box(-0.75, 1.1, 1.5, 0.4, 'rgba(0,0,0,0)', '#9aa0a8', 0.03);
    k.plain();
    for (let x = -0.75; x < 0.75; x += 0.25) k.line(x, 1.1, x + 0.25, 1.5, 0.02, '#9aa0a8');
    for (let i = 0; i < 4; i++) k.disc(-0.55 + i * 0.37, 1.05, 0.07, rgba(k.T.win[i % 3], Math.floor(k.t * 4) % 4 === i ? 1 : 0.25));
  },
  // a laser stretched across between two emitters hung from above
  laserbar(k) {
    hanging(k, 1.25, 1.2, '#5a5e66', 0.02);
    k.box(-0.7, 1.1, 0.14, 0.2, '#2a2f3a');
    k.box(0.56, 1.1, 0.14, 0.2, '#2a2f3a');
    k.glow(2);
    k.line(-0.56, 1.18, 0.56, 1.18, 0.05 + 0.04 * k.mf.hat, k.T.slide);
  },
  // an LED banner hung low, scrolling bars to the music
  banner(k) {
    hanging(k, 1.55, 1.0, '#5a5e66', 0.02);
    k.box(-0.65, 1.05, 1.3, 0.5, '#0a0a12', k.accent, 0.03);
    k.plain();
    for (let i = 0; i < 8; i++) {
      const h = 0.08 + 0.3 * Math.abs(Math.sin(k.t * 6 + i)) * (0.4 + k.mf.kick);
      k.box(-0.58 + i * 0.15, 1.1, 0.1, h, rgba(k.T.slide, 0.8));
    }
  },
  // an LED panel standing on the deck: kicked through, it shatters into pixels
  ledpanel(k, o) {
    k.box(-0.15, 0, 0.3, o.h, '#0a0a12', k.accent, 0.03);
    k.plain();
    for (let y = 0.1; y < o.h - 0.1; y += 0.12) k.box(-0.11, y, 0.22, 0.08, rgba(k.T.win[Math.floor(y * 8) % 3], 0.3 + 0.6 * Math.abs(Math.sin(k.t * 5 + y * 3))));
  },
  // a glass booth's pane
  booth(k, o) {
    k.box(-0.14, 0, 0.28, o.h, rgba('#c8f0ff', 0.2 + 0.2 * k.mf.kick), k.accent, 0.03);
    k.plain();
    k.box(-0.18, 0, 0.36, 0.1, '#2a2a34');
    k.line(-0.1, o.h * 0.3, 0.1, o.h * 0.5, 0.02, 'rgba(255,255,255,0.7)');
  },
  trussbar(k) {
    hanging(k, 2.12, 0.9, '#5a5e66', 0.025);
    k.box(-0.7, 2.05, 1.4, 0.1, '#9aa0a8', rgba(k.T.hold, 0.9), 0.025);
    for (let i = 0; i < 3; i++) k.disc(-0.45 + i * 0.45, 2.0, 0.05, rgba(k.T.hold, 0.4 + 0.6 * k.mf.beat));
  },
  speakerledge: ledge('#15151c', true),
  trussledge: ledge('#5a5e66'),
};
