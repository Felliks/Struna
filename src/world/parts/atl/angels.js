// (a pack of parts: see registry.js)
// ATL's angels, as the oldest descriptions have them and not as winged people ("Ангелы": angels circling in the lace of
// black branches, laughing at us; "Вирши": seraphim, lend me your halo; "Чёрным снегом": angels settling over us like
// black snow; "Урожай"; world/artists.js): celestial beings, abstract and awe-struck, no symbol of any faith on them.
//   sky        ophanim (a wheel within wheels hung huge in the sky: three gold rings turning through each other at
//              their own angles, their rims covered in eyes that blink on the hats and all turn to look at him, a fire
//              in their middle; spinning faster in a drop)
//   performer  seraph (the dancer as a burning core with six wings of flame-feathers: two over its face, two over its
//              feet, two spread and beating on the kick, a corona of light round it; the wings follow its arms and legs)
// The ophan as a threat is props.js's (render/layers/props.js THREATS.ophan), drawn the same way (render/angels.js).
import { registerPart } from '../../registry.js';
import { JI } from '../../../lib/skeleton.js';
import { glowDot } from '../../../render/util.js';
import { heroAt, ophan, warmEyes } from '../../../render/angels.js';

const PACK = { pack: 'atl' };

registerPart({
  ...PACK,
  id: 'ophanim',
  slot: 'sky',
  media: ['air', 'space'],
  tags: ['angel', 'occult', 'fantasy'],
  mood: [0.7, 0.4, 0.6],
  // (its eyes, at every size they are seen at, painted while the song loads)
  warm(f) {
    const S = Math.min(f.v.W, f.v.H) * 0.2;
    warmEyes(S * 0.3 * 0.11, S * 1.05 * 0.11);
  },
  draw(f) {
    const { v, t, mf } = f,
      drop = f.look.sceneAt?.(t)?.kind === 'drop',
      R = Math.min(v.W, v.H) * 0.2 * (1 + 0.03 * mf.bass),
      X = v.W * 0.62,
      Y = v.H * 0.24,
      [tx, ty] = heroAt(f);
    ophan(f, X, Y, R, t * (drop ? 1.2 : 0.35), tx, ty, 0.95);
    // (lesser ones circling it far off, as the song's angels circle)
    for (let k = 0; k < 2; k++) {
      const an = t * 0.15 + k * Math.PI;
      ophan(f, X + Math.cos(an) * R * 2.3, Y + Math.sin(an) * R * 0.5, R * 0.3, t * 0.8 + k, tx, ty, 0.6, 0.6);
    }
  },
});

// a seraph's wing pointing right from its root at the left middle: seven flame-feathers fanned `spread` apart, each in
// three layers (orange, gold, white hot), painted once a size step (a quarter octave) and spread
const WINGS = new Map();
function wingPic(L0, spread) {
  const L = 2 ** (Math.ceil(Math.log2(Math.max(8, L0)) * 4) / 4),
    key = `${L}|${spread}`;
  let c = WINGS.get(key);
  if (c) return c;
  const H = Math.ceil(L * 2 * Math.sin(3 * spread + 0.25) + L * 0.3);
  c = Object.assign(document.createElement('canvas'), { width: Math.ceil(L * 1.05), height: H });
  const g = c.getContext('2d'),
    y0 = H / 2,
    w = L * 0.095;
  for (let k = 0; k < 7; k++) {
    const b = (k - 3) * spread,
      len = L * (1 - Math.abs(k - 3) * 0.08);
    for (const [col, sc] of [['#ff8a2a', 1], ['#ffd060', 0.75], ['#fff8e0', 0.4]]) {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, y0);
      g.quadraticCurveTo(Math.cos(b - 0.15) * len * 0.5 - Math.sin(b) * w * sc, y0 + Math.sin(b - 0.15) * len * 0.5 + Math.cos(b) * w * sc, Math.cos(b) * len * sc, y0 + Math.sin(b) * len * sc);
      g.quadraticCurveTo(Math.cos(b + 0.15) * len * 0.5 + Math.sin(b) * w * sc, y0 + Math.sin(b + 0.15) * len * 0.5 - Math.cos(b) * w * sc, 0, y0);
      g.fill();
    }
  }
  c.L = L;
  WINGS.set(key, c);
  if (WINGS.size > 24) WINGS.delete(WINGS.keys().next().value);
  return c;
}

registerPart({
  ...PACK,
  id: 'seraph',
  slot: 'performer',
  media: ['air', 'space'],
  tags: ['angel', 'occult', 'fantasy'],
  mood: [0.75, 0.4, 0.6],
  draw(f, p) {
    const { g, mf, t } = f,
      { P, s, a } = p,
      [cx, cy] = P(JI.chest),
      [hx, hy] = P(JI.head),
      [px, py] = P(JI.hips),
      beat = mf.kick;
    g.save();
    // (its corona)
    glowDot(g, cx, cy, 1.6 * s, '#ffd060', a * (0.25 + 0.25 * mf.voice + 0.15 * beat));
    // (a wing: a fan of flame-feathers from (x0, y0) toward angle an, length L, layered gold to white: painted once a
    // size step and spread (wingPic), stamped turned)
    const wing = (x0, y0, an, L, spread) => {
      const c = wingPic(L, spread),
        k = (L / c.L) * (1 + 0.04 * Math.sin(t * 7 + an));
      g.save();
      g.translate(x0, y0);
      g.rotate(an);
      g.drawImage(c, 0, -c.height * 0.5 * k, c.width * k, c.height * k);
      g.restore();
    };
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = a * 0.85;
    // (two spread and beating on the kick, following the arms)
    for (const [sh, ha] of [[JI.shL, JI.haL], [JI.shR, JI.haR]]) {
      const [x0, y0] = P(sh),
        [x1, y1] = P(ha),
        an = Math.atan2(y1 - y0, x1 - x0) - 0.4 * beat * Math.sign(x1 - x0 || 1);
      wing(x0, y0, an, 0.95 * s, 0.16);
    }
    // (two over its face, two over its feet)
    for (const sd of [-1, 1]) {
      wing(cx, cy, -Math.PI / 2 + sd * 0.45, 0.7 * s, 0.11);
      wing(px, py, Math.PI / 2 + sd * 0.45, 0.65 * s, 0.11);
    }
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    // (its burning core, where a body would be)
    glowDot(g, cx, (cy + py) / 2, 0.4 * s * (1 + 0.3 * beat), '#fff4d0', a);
    glowDot(g, hx, hy, 0.18 * s, '#ffe8a0', a * 0.7);
    g.restore();
  },
});
