// The AI's own things, whatever the place: what it puts in his way with the tools of its desktop (character.js) and at
// a fork (level.js). An entry per skin, drawn as every look is (render/things/index.js's kit `k`).
import { PLACES } from '../../places.js';
import { rgba } from '../util.js';
import { SKINS } from './index.js';

export default {
  // an error the AI throws (its errors tool, level.js): the place's own pane to kick through, taken over by it — a
  // window's title bar across its top, its glass glitching in slices on the hats, a red cross in it blinking on the beat;
  // so it is the AI's mark in every world's own material, not one grey dialog the same everywhere
  error(k, o) {
    const own = PLACES[k.place]?.skins.smash?.[0],
      h = o?.h ?? 2.7;
    if (own && SKINS[own] && own !== 'error') SKINS[own](k, o);
    else k.box(-0.55, 0.2, 1.1, h - 0.2, '#c8ccd4', '#20242c', 0.04);
    k.plain();
    const blink = 0.6 + 0.4 * k.mf.beat,
      top = Math.min(h, 2.9);
    k.box(-0.55, top - 0.3, 1.1, 0.3, rgba('#1f3fbf', 0.9));
    k.box(0.33, top - 0.25, 0.18, 0.2, '#c8ccd4', '#20242c', 0.02);
    // (its glass glitching: slices of it shifted sideways on the hats)
    for (let i = 0; i < 3; i++) {
      const y = 0.4 + ((i * 0.37 + k.mf.hat * 0.5) % 1) * (top - 0.9),
        dx = (i % 2 ? 1 : -1) * 0.12 * k.mf.hat;
      k.box(-0.5 + dx, y, 1.0, 0.07, rgba(i % 2 ? '#ff2b4a' : '#29e7ff', 0.35));
    }
    k.disc(0, top * 0.55, 0.3, rgba('#dc1e28', blink));
    k.line(-0.15, top * 0.55 - 0.15, 0.15, top * 0.55 + 0.15, 0.07, '#fff');
    k.line(0.15, top * 0.55 - 0.15, -0.15, top * 0.55 + 0.15, 0.07, '#fff');
  },
  // a fork's gate: a gold arch over the roof, its sign a split arrow; kicked, the hard way
  fork(k) {
    const glow = 0.7 + 0.3 * k.mf.kick;
    for (const x of [-0.55, 0.45]) k.box(x, 0, 0.1, 3.4, '#b8860b', '#ffd84a', 0.03);
    k.box(-0.6, 3.4, 1.2, 0.25, '#ffd84a');
    k.box(-0.45, 0.15, 0.9, 3.2, `rgba(255,216,74,${0.18 * glow})`);
    k.line(0, 1.2, 0, 1.9, 0.08, '#fff');
    k.line(0, 1.9, -0.3, 2.4, 0.08, '#fff');
    k.line(0, 1.9, 0.3, 2.4, 0.08, '#ff4f5c');
    k.poly([[0.22, 2.48], [0.42, 2.55], [0.36, 2.3]], '#ff4f5c');
  },
};
