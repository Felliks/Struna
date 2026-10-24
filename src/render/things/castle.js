// The castle's obstacles: a gargoyle, a stone coffin and a candelabra to jump; a raised portcullis, an iron chandelier
// and a hanging banner to slide under; a stained glass window and a stone wall to kick through; an iron bar on chains to
// swing on; ledges of stone and glass; hazards of maces, iron spikes, a pendulum blade, a torch's jet, a chained hook
// and a ghostly wisp.
import { mulberry } from '../../rng.js';
import { rgba } from '../util.js';
import { courses, hanging, ledge } from './kit.js';
import { firejet, grapnel, mine, plasmaorb, saw, spikes } from './hazards.js';

const STONE = '#5a5560',
  IRON = '#3a3640',
  FIRE = '#ffb347',
  GLASS = ['#c8102e', '#2a5ad8', '#e8b020', '#3aa060'];

export default {
  // a gargoyle crouched on its plinth: wings folded, horns, its eyes lit on the kick
  gtGargoyle(k, o) {
    const h = o.h;
    k.box(-0.32, 0, 0.64, h * 0.25, '#3a3640', k.accent, 0.03);
    k.poly([[-0.3, h * 0.25], [-0.38, h * 0.75], [-0.18, h * 0.6], [-0.12, h * 0.9], [0.12, h * 0.9], [0.18, h * 0.6], [0.38, h * 0.75], [0.3, h * 0.25]], STONE);
    k.plain();
    k.poly([[-0.12, h * 0.9], [-0.18, h], [-0.05, h * 0.9]], STONE);
    k.poly([[0.12, h * 0.9], [0.18, h], [0.05, h * 0.9]], STONE);
    for (const x of [-0.06, 0.06]) k.disc(x, h * 0.8, 0.03, rgba('#ff2b3a', 0.5 + 0.5 * k.mf.kick));
  },
  // a stone coffin, its lid ajar and lifting on the kick, a glow from inside
  gtCoffin(k, o) {
    const h = o.h,
      lift = 0.04 * k.mf.kick;
    k.poly([[-0.4, 0], [0.4, 0], [0.36, h * 0.8], [-0.36, h * 0.8]], '#4a4450');
    k.plain();
    k.box(-0.34, h * 0.8, 0.68, lift + 0.01, rgba('#8affc8', 0.4 + 0.6 * k.mf.kick));
    k.poly([[-0.4, h * 0.8 + lift], [0.4, h * 0.8 + lift], [0.36, h + lift], [-0.36, h + lift]], STONE);
    k.line(0, h * 0.84 + lift, 0, h * 0.97 + lift, 0.03, rgba(k.T.jump, 0.6));
    k.line(-0.06, h * 0.92 + lift, 0.06, h * 0.92 + lift, 0.03, rgba(k.T.jump, 0.6));
  },
  // an iron candelabra on a stone step, its flames flickering on the hats
  gtCandelabra(k, o) {
    const h = o.h;
    k.box(-0.35, 0, 0.7, h * 0.2, STONE, k.accent, 0.03);
    k.plain();
    k.line(0, h * 0.2, 0, h * 0.75, 0.04, IRON);
    k.line(-0.28, h * 0.6, 0.28, h * 0.6, 0.03, IRON);
    for (const x of [-0.28, 0, 0.28]) {
      const y = x ? h * 0.6 : h * 0.75,
        fl = 0.05 + 0.04 * Math.min(1, k.mf.hat * 2.5 + 0.3 * Math.sin(k.t * 21 + x * 9));
      k.box(x - 0.03, y, 0.06, 0.1, '#e8dcc0');
      k.poly([[x - 0.03, y + 0.1], [x + 0.03, y + 0.1], [x, y + 0.1 + fl * 2]], rgba(FIRE, 0.9));
    }
  },
  // a portcullis raised over the way: an iron grid up out of sight, its spiked bottom shuddering on the snare
  gtPortcullis(k) {
    const d = 0.03 * k.mf.snare;
    k.plain();
    for (let x = -0.6; x <= 0.61; x += 0.2) k.line(x, 1.2 + d, x, k.sky, 0.05, IRON);
    for (let y = 1.4; y < 4; y += 0.35) k.line(-0.65, y + d, 0.65, y + d, 0.05, IRON);
    k.glow();
    k.box(-0.65, 1.2 + d, 1.3, 0.08, IRON, k.accent, 0.02);
    k.plain();
    for (let x = -0.6; x <= 0.61; x += 0.2) k.poly([[x - 0.04, 1.2 + d], [x + 0.04, 1.2 + d], [x, 1.07 + d]], '#9aa0a8');
  },
  // an iron ring chandelier hung low, swinging, its candles flickering on the hats
  gtChandelier(k) {
    const sw = 0.08 * Math.sin(k.t * 2.5);
    hanging(k, 1.5, 0.4, IRON, 0.03);
    k.box(-0.65 + sw, 1.15, 1.3, 0.08, IRON, k.accent, 0.02);
    k.plain();
    k.line(-0.5 + sw, 1.23, 0, 1.6, 0.025, IRON);
    k.line(0.5 + sw, 1.23, 0, 1.6, 0.025, IRON);
    for (let i = 0; i < 6; i++) {
      const x = -0.55 + i * 0.22 + sw,
        fl = Math.min(1, 0.4 + k.mf.hat * 2.5 + 0.3 * Math.sin(k.t * 19 + i * 2));
      k.box(x - 0.025, 1.23, 0.05, 0.1, '#e8dcc0');
      k.disc(x, 1.38, 0.03 + 0.02 * fl, rgba(FIRE, 0.6 + 0.4 * fl));
    }
    k.box(-0.6, 1.05, 1.2, 0.04, rgba(k.T.slide, 0.4 + 0.5 * k.mf.kick));
  },
  // a long banner hung from a pole, its crest lit on the beat, its tail waving
  gtBanner(k) {
    hanging(k, 2.0, 1.1, IRON, 0.025);
    k.box(-0.7, 1.95, 1.4, 0.06, IRON);
    const w = 0.05 * Math.sin(k.t * 4);
    k.poly([[-0.6, 1.95], [0.6, 1.95], [0.6 + w, 1.2], [0, 1.05], [-0.6 + w, 1.2]], '#6a0e1e');
    k.plain();
    k.poly([[-0.2, 1.75], [0.2, 1.75], [0.2, 1.5], [0, 1.35], [-0.2, 1.5]], rgba(k.T.slide, 0.4 + 0.5 * k.mf.beat));
    k.box(-0.6, 1.88, 1.2, 0.03, rgba('#e8b020', 0.8));
  },
  // a stained glass window in a stone frame, its panes glowing with the bass
  gtGlass(k, o) {
    k.box(-0.15, 0, 0.3, o.h, rgba('#2a5ad8', 0.2 + 0.15 * k.mf.kick), k.accent, 0.03);
    k.plain();
    for (let i = 0; i < 6; i++) k.box(-0.11, 0.1 + i * ((o.h - 0.2) / 6), 0.22, (o.h - 0.2) / 6 - 0.03, rgba(GLASS[i % 4], 0.25 + 0.35 * k.mf.bass));
    k.poly([[-0.18, o.h], [0, o.h + 0.18], [0.18, o.h]], STONE);
    k.box(-0.18, 0, 0.36, 0.08, STONE);
  },
  // a castle wall, painted in block by block
  gtStonewall(k, o) {
    const rr = mulberry(Math.round(o.t * 1000));
    courses(k, o, 12, 0.44, () => (rr() < 0.5 ? '#5a5560' : '#4a4652'));
  },
  // an iron bar on chains, its rings lit on the beat
  gtChainbar(k) {
    hanging(k, 2.12, 0.9, IRON, 0.035);
    k.box(-0.7, 2.05, 1.4, 0.09, '#5a5660', rgba(k.T.hold, 0.9), 0.025);
    for (const x of [-0.56, 0.56]) k.disc(x, 2.1, 0.06, rgba(FIRE, 0.3 + 0.6 * k.mf.beat));
  },
  gtStoneledge: ledge(STONE),
  gtGlassledge: ledge('#2a1a3a', true),
  gtMace: mine('#2a2a30', '#9aa0a8'),
  gtSpikes: spikes('#3a3438', '#c9ccd2'),
  gtBlade: saw('#2a2228', '#d9dde3'),
  gtTorch: firejet('#2a2228', FIRE),
  gtChain: grapnel(IRON, '#9aa0a8'),
  gtWisp: plasmaorb('#1a1a2a', '#8affc8'),
};
