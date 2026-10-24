// The Moon's obstacles: a boulder, a little probe on its legs and a rack of oxygen tanks to jump; a robot arm, a solar
// wing and a pressurised walkway tube to slide under; a habitat's window and a wall of regolith bags to kick through;
// a crane boom to swing on; a ledge of hull panels; and its hazards in grey steel, gold foil and dust.
import { mulberry } from '../../rng.js';
import { rgba } from '../util.js';
import { courses, hanging, ledge } from './kit.js';
import { laserpair, mine, plasmaorb, satellite, shards, vortex } from './hazards.js';

export default {
  // a boulder of grey rock, pocked, a vein in it glinting on the kick
  moRock(k, o) {
    k.round(-0.34, 0, 0.68, o.h, o.h * 0.4, '#7a7a80');
    k.plain();
    k.disc(-0.12, o.h * 0.6, 0.07, '#5a5a60');
    k.disc(0.15, o.h * 0.3, 0.05, '#5a5a60');
    k.line(-0.2, o.h * 0.2, 0.22, o.h * 0.7, 0.02, rgba(k.T.jump, 0.4 + 0.6 * k.mf.kick));
  },
  // a probe on three legs, gold-foiled, its lamp on the beat and its dish nodding with the bass
  moProbe(k, o) {
    k.plain();
    k.line(-0.3, 0, -0.15, o.h * 0.4, 0.03, '#c9ccd2');
    k.line(0.3, 0, 0.15, o.h * 0.4, 0.03, '#c9ccd2');
    k.line(0, 0, 0, o.h * 0.4, 0.03, '#c9ccd2');
    k.glow();
    k.box(-0.22, o.h * 0.4, 0.44, o.h * 0.4, '#c8a040', k.accent, 0.025);
    k.plain();
    k.line(0, o.h * 0.8, 0.12, o.h * (0.82 + 0.04 * k.mf.bass), 0.02, '#c9ccd2');
    k.disc(0.12, o.h * (0.82 + 0.04 * k.mf.bass), 0.06, '#e8e8f0');
    k.disc(-0.12, o.h * 0.6, 0.04, rgba('#ff3b4f', 0.4 + 0.6 * k.mf.beat));
  },
  // oxygen tanks racked on their sides, their gauges lit on the kick
  moO2(k, o) {
    k.box(-0.34, 0, 0.68, 0.05, '#3a3a40');
    const h = o.h / 3;
    for (let i = 0; i < 3; i++) k.round(-0.32 + (i % 2) * 0.04, i * h, 0.62, h - 0.02, h * 0.45, i % 2 ? '#e8e8f0' : '#d8a040');
    k.plain();
    for (let i = 0; i < 3; i++) k.disc(0.22, i * h + h / 2, 0.035, rgba(k.T.jump, 0.4 + 0.6 * k.mf.kick));
  },
  // a robot arm reaching down from above, its claw opening on the snare
  moArm(k) {
    k.plain();
    k.line(0.3, k.sky, 0.3, 1.8, 0.09, '#c9ccd2');
    k.line(0.3, 1.8, -0.2, 1.35, 0.08, '#c9ccd2');
    k.glow();
    k.disc(0.3, 1.8, 0.08, '#59606e');
    k.disc(-0.2, 1.35, 0.07, '#59606e');
    k.plain();
    const open = 0.08 + 0.12 * (k.mf.snare ?? 0);
    k.line(-0.2, 1.35, -0.2 - open, 1.1, 0.04, '#e8e8f0');
    k.line(-0.2, 1.35, -0.2 + open, 1.1, 0.04, '#e8e8f0');
    k.disc(-0.2, 1.35, 0.03, rgba(k.T.slide, 0.4 + 0.6 * k.mf.kick));
  },
  // a solar wing hung across, its cells catching the light on the hats
  moSolar(k) {
    hanging(k, 1.4, 1.2, '#9aa0a8', 0.025);
    k.box(-0.75, 1.08, 1.5, 0.3, '#1a2a5a', k.accent, 0.03);
    k.plain();
    for (let x = -0.66; x < 0.75; x += 0.18) k.line(x, 1.1, x, 1.36, 0.01, rgba(k.T.slide, 0.25 + 0.6 * Math.min(1, k.mf.hat * 2.5)));
    k.line(-0.75, 1.23, 0.75, 1.23, 0.01, rgba('#ffffff', 0.3));
  },
  // a pressurised walkway tube on struts, its windows lit on the kick
  moTube(k) {
    k.plain();
    for (const x of [-0.65, 0.65]) k.line(x, 1.5, x, k.sky, 0.06, '#9aa0a8');
    k.glow();
    k.round(-0.8, 1.08, 1.6, 0.42, 0.21, '#d8d8dc');
    k.plain();
    for (const x of [-0.5, -0.1, 0.3]) k.round(x, 1.22, 0.22, 0.14, 0.05, rgba(k.T.win[0], 0.3 + 0.7 * k.mf.kick));
    k.box(-0.8, 1.08, 1.6, 0.04, rgba(k.T.slide, 0.5 + 0.5 * k.mf.beat));
  },
  // a habitat's window: thick glass, the base's light in it, a glint sliding on the hats
  moVisor(k, o) {
    k.box(-0.15, 0, 0.3, o.h, rgba('#ffd27a', 0.16 + 0.22 * k.mf.kick), k.accent, 0.03);
    k.plain();
    const s = (k.t * 0.6 + k.mf.hat) % 1;
    k.line(-0.11, o.h * s, 0.11, o.h * s + 0.3, 0.025, 'rgba(255,255,255,0.7)');
    k.box(-0.19, 0, 0.38, 0.1, '#c9ccd2');
    k.box(-0.19, o.h - 0.08, 0.38, 0.08, '#c9ccd2');
  },
  // a wall of regolith bags, laid course by course
  moSandbags(k, o) {
    const rr = mulberry(Math.round(o.t * 1000) + 13);
    courses(k, o, 10, 0.42, () => (rr() < 0.5 ? '#8a8a90' : '#a8a8ae'));
  },
  // a crane's boom to swing on, its tip lamp on the kick
  moBoom(k) {
    hanging(k, 2.12, 0.9, '#9aa0a8', 0.025);
    k.box(-0.7, 2.05, 1.4, 0.09, '#e8e8f0', rgba(k.T.hold, 0.9), 0.025);
    k.plain();
    for (let x = -0.6; x < 0.6; x += 0.3) k.box(x, 2.05, 0.15, 0.09, '#c8a040');
    k.disc(0.7, 2.1, 0.05, rgba('#ff3b4f', 0.4 + 0.6 * k.mf.kick));
  },
  moPanelLedge: ledge('#8a8a90'),
  moMine: mine('#4a4a52', '#c9ccd2'),
  moSat: satellite('#8a8a90', '#c8a040'),
  moOrb: plasmaorb('#3a3a44', '#ffe08a'),
  moShards: shards('#6a6a70', '#e8e8f0'),
  moLaser: laserpair('#5a5a60', '#ff6a3d'),
  moDevil: vortex('#a89a8a', '#e8e0d0'),
};
