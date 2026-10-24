// (a pack of parts: see registry.js)
// The parts of the worlds of ATL's favourite songs (render/places/anthill, fujisan, lastman, compost; world/artists.js),
// kept to the pack's songs (compose.js) but for a strong match of mood:
//   weather    motes ("Архитектор": orchid pollen and specks of gold drifting up through the sun, a puff of it on the
//              kick), velvetdust ("Фудзи": a slow fall of violet stardust out of the velvet, wisps of steam drifting
//              across, lead-grey rings of smoke floating up on the beat), fluff ("Последний человек на Земле": dandelion fluff floating on a warm wind, glints of the sun
//              in it on the beat), ashrain ("Удобрением": flakes of ash drifting down while the land smoulders, turned to
//              rain and green specks rising in a drop)
//   performer  haring (a petroglyph dancer of bold flat colour, Keith Haring's way, its colour turning on the beat, two
//              more of it in a drop: "Под небом салатовым"), chitin (a six-legged dancer in a shiny jacket of chitin, all six legs stomping on the kick: "Таракан"), velvet (the body a cut-out of the starry night, a purple rim of the dawn round it), furcoat
//              (a huge fur coat and dark glasses on the hottest day), sprouts (vines growing along its bones, leaves
//              opening on the kick, flowers on a drop)
//   clone      anthelm (a helmet of chitin with two feelers bobbing), snailshell (a spiral shell on its back and eyestalks
//              on its head), shades (dark glasses and a golden crown: emperors of the empty planet), leafhat (a sprout on
//              its head, a cape of leaves)
import { registerPart } from '../../registry.js';
import { BONES, JI, JN } from '../../../lib/skeleton.js';
import { glowDot, hash, rgba } from '../../../render/util.js';
import { cam, clock, share } from '../weather/kit.js';

const TAU = Math.PI * 2,
  INK = '#000000';
const wrap = (x, m) => ((x % m) + m) % m;
// (the butterflies' wings)
const WINGS = ['#ffd23a', '#ff8ad0', '#5ad8ff', '#ffffff'];
const PACK = { pack: 'atl' };

// ---- weathers
registerPart({
  ...PACK,
  id: 'motes',
  slot: 'weather',
  media: ['air'],
  tags: ['insect', 'nature', 'warm', 'build', 'day'],
  front(f, k) {
    const { g, v, t } = f,
      c = clock(f),
      C = cam(f),
      n = 24 + 40 * k;
    for (let i = 0; i < Math.ceil(n); i++) {
      // (a puff on the kick: they rise the further for the kicks' distance, never jump; passed by the camera at their
      // depth)
      const par = 0.45 + 0.55 * hash(i, 304),
        x = wrap(hash(i, 301) * v.W + Math.sin(t * 0.5 + i) * 20 * v.dpr + t * 6 * v.dpr + (0.3 * c.run * C.m + C.x) * par, v.W),
        y = wrap(hash(i, 302) * v.H - (10 + 14 * hash(i, 303)) * (t + c.kickRun) * v.dpr + C.y * par, v.H),
        r = (1 + 2.2 * hash(i, 304)) * v.dpr;
      glowDot(g, x, y, r * (2 + c.kick), i % 4 ? '#ffd870' : '#f6b8e8', 0.55 * share(i, n));
    }
  },
});
registerPart({
  ...PACK,
  id: 'velvetdust',
  slot: 'weather',
  media: ['air', 'space'],
  tags: ['mountain', 'fantasy', 'mild', 'night'],
  front(f, k) {
    const { g, v, t, mf } = f,
      C = cam(f),
      // (as many as the weather's strength, fractional: a fixed set of 70, the first n of them whole, the next fading in,
      // never a mote popping in or out as the song grows and calms; kit.js share)
      n = 30 + 40 * k,
      a0 = g.globalAlpha;
    // (in two colours and three brightnesses, a style each: the twinkle of each mote picks which)
    for (let b = 0; b < 6; b++) {
      g.fillStyle = rgba(b % 2 ? '#e0c8ff' : '#ffc0d8', 0.35 + 0.45 * ((Math.floor(b / 2) + 0.5) / 3) * (0.6 + 0.4 * mf.hat));
      for (let i = 0; i < Math.ceil(n); i++) {
        const tw = 0.5 + 0.5 * Math.sin(t * 4 + i * 1.7);
        if ((i % 3 ? 1 : 0) !== b % 2 || Math.min(2, Math.floor(tw * 3)) !== Math.floor(b / 2)) continue;
        // (passed by the camera at its depth, as the other weathers are)
        const par = 0.45 + 0.55 * hash(i, 315),
          x = wrap(hash(i, 311) * v.W - t * (4 + 6 * hash(i, 312)) * v.dpr + C.x * par, v.W),
          y = wrap(hash(i, 313) * v.H + t * (8 + 10 * hash(i, 314)) * v.dpr + C.y * par, v.H),
          s = (1 + 1.5 * hash(i, 315)) * v.dpr;
        g.globalAlpha = a0 * share(i, n);
        g.fillRect(x - s, y - s * 0.2, s * 2, s * 0.4);
        g.fillRect(x - s * 0.2, y - s, s * 0.4, s * 2);
      }
    }
    g.globalAlpha = a0;
    // (lead-grey rings of smoke floating up and dissolving ("Петля"), a new one swelling on each beat)
    const bt = t / f.L.A.beat;
    g.lineWidth = Math.max(1, 2 * v.dpr);
    for (let i = 0; i < 4; i++) {
      const q = (bt / 4 + i / 4) % 1,
        x = v.W * (0.15 + 0.7 * hash(Math.floor(bt / 4 + i / 4) * 4 + i, 318)),
        y = v.H * (0.75 - 0.6 * q),
        r = (10 + 30 * q) * v.dpr * (1 + 0.2 * mf.beat);
      g.strokeStyle = rgba('#8a8098', 0.35 * (1 - q));
      g.beginPath();
      g.ellipse(x, y, r, r * 0.35, 0, 0, TAU);
      g.stroke();
    }
    // (wisps of steam drifting across low)
    for (let i = 0; i < 3; i++) {
      const w = v.W * 0.5,
        x = wrap(hash(i, 316) * v.W + t * 12 * v.dpr, v.W + w) - w / 2,
        y = v.H * (0.55 + 0.25 * hash(i, 317));
      glowDot(g, x, y, w * 0.25, '#e8dcff', 0.06 + 0.04 * mf.bass);
    }
  },
});
registerPart({
  ...PACK,
  id: 'fluff',
  slot: 'weather',
  media: ['air'],
  tags: ['summer', 'nature', 'warm', 'coast', 'day', 'bright'],
  front(f, k) {
    const { g, v, t, mf } = f,
      C = cam(f),
      // (as many as the weather's strength, fractional: a fixed set of 36, the first n whole, the next fading in; kit.js
      // share)
      n = 14 + 22 * k,
      // (where seed i is: carried on the warm wind, passed by the camera at its depth)
      at = i => {
        const par = 0.45 + 0.55 * hash(i, 324);
        return [wrap(hash(i, 321) * v.W + t * (18 + 16 * hash(i, 322)) * v.dpr + C.x * par, v.W), wrap(hash(i, 323) * v.H + Math.sin(t * 0.8 + i) * 18 * v.dpr - t * 4 * v.dpr + C.y * par, v.H)];
      };
    // (dandelion seeds: a stalk and a ring of fine threads each, the whole ones in one path, the one fading in on its own;
    // a glint on the beat)
    g.lineWidth = Math.max(1, 0.8 * v.dpr);
    g.strokeStyle = 'rgba(255,255,255,0.75)';
    const seed = i => {
      const [x, y] = at(i),
        r = (3 + 4 * hash(i, 324)) * v.dpr,
        a = t * 0.5 + i;
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a + 1.6) * r * 1.4, y + Math.sin(a + 1.6) * r * 1.4);
      for (let q = 0; q < 8; q++) {
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a + (q * TAU) / 8) * r, y + Math.sin(a + (q * TAU) / 8) * r);
      }
    };
    g.beginPath();
    for (let i = 0; i < Math.floor(n); i++) seed(i);
    g.stroke();
    const a0 = g.globalAlpha;
    if (n > Math.floor(n)) {
      g.globalAlpha = a0 * share(Math.floor(n), n);
      g.beginPath();
      seed(Math.floor(n));
      g.stroke();
      g.globalAlpha = a0;
    }
    if (mf.beat > 0.02)
      for (let i = 0; i < Math.ceil(n); i += 5) {
        const [x, y] = at(i);
        glowDot(g, x, y, (3 + 4 * hash(i, 324)) * v.dpr * (0.8 + 1.5 * mf.beat), '#fff4c0', 0.5 * mf.beat * share(i, n));
      }
    // (butterflies fluttering through, their wings clapping on the beat)
    for (let i = 0; i < 4; i++) {
      const x = wrap(hash(i, 325) * v.W + t * (30 + 10 * i) * v.dpr, v.W),
        y = v.H * (0.3 + 0.4 * hash(i, 326)) + Math.sin(t * 2 + i) * 20 * v.dpr,
        w = (5 + 2 * i % 3) * v.dpr * (0.3 + 0.7 * Math.abs(Math.sin(t * 9 + i))),
        col = WINGS[i];
      g.fillStyle = col;
      g.beginPath();
      for (let sd = -1; sd <= 1; sd += 2) {
        g.moveTo(x + sd * w * 0.6 + w * 0.6, y);
        g.ellipse(x + sd * w * 0.6, y, w * 0.6, 5 * v.dpr, sd * 0.4, 0, TAU);
      }
      g.fill();
    }
  },
});
registerPart({
  ...PACK,
  id: 'ashrain',
  slot: 'weather',
  media: ['air'],
  tags: ['garden', 'ember', 'nature', 'warm'],
  front(f, k) {
    const { g, v, t, mf } = f,
      drop = f.look.sceneAt?.(t)?.kind === 'drop';
    if (drop) {
      // (the rain the leaves applaud, slanting, and green specks rising through it)
      g.strokeStyle = 'rgba(200,230,255,0.4)';
      g.lineWidth = Math.max(1, 1.2 * v.dpr);
      g.beginPath();
      for (let i = 0; i < 50 + 40 * k; i++) {
        const x = wrap(hash(i, 331) * v.W + t * 90 * v.dpr, v.W),
          y = wrap(hash(i, 332) * v.H + t * v.H * (1.4 + 0.5 * hash(i, 333)), v.H);
        g.moveTo(x, y);
        g.lineTo(x - 5 * v.dpr, y + 18 * v.dpr);
      }
      g.stroke();
      for (let i = 0; i < 18; i++) {
        const x = wrap(hash(i, 334) * v.W + Math.sin(t + i) * 10 * v.dpr, v.W),
          y = wrap(hash(i, 335) * v.H - t * 40 * v.dpr, v.H);
        glowDot(g, x, y, (2 + 3 * mf.kick) * v.dpr, '#7aff5a', 0.6);
      }
      return;
    }
    for (let i = 0; i < 30 + 30 * k; i++) {
      const x = wrap(hash(i, 336) * v.W + t * 8 * v.dpr + Math.sin(t * 0.7 + i) * 14 * v.dpr, v.W),
        y = wrap(hash(i, 337) * v.H + t * (14 + 12 * hash(i, 338)) * v.dpr, v.H),
        s = (1.5 + 2 * hash(i, 339)) * v.dpr;
      g.fillStyle = i % 9 === 0 ? rgba('#ff7a2a', 0.5 + 0.4 * mf.kick) : i % 2 ? 'rgba(240,244,250,0.75)' : 'rgba(150,140,140,0.55)';
      g.fillRect(x - s, y - s * 0.5, s * 2, s);
    }
  },
});

// ---- performers
const headAt = p => {
  const [hx, hy] = p.P(JI.head);
  return [hx, hy - 0.08 * p.s];
};
function bonesPath(g, P) {
  g.beginPath();
  for (const [p, q] of BONES) {
    const [x0, y0] = P(p),
      [x1, y1] = P(q);
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
  }
}
registerPart({
  ...PACK,
  id: 'chitin',
  slot: 'performer',
  media: ['air'],
  tags: ['insect', 'build', 'warm'],
  mood: [0.8, 0.4, 0.75],
  draw(f, p) {
    const { g, mf, t } = f,
      { P, s, a } = p,
      shell = '#5a2410',
      drop = f.look.sceneAt?.(t)?.kind === 'drop';
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const [cx, cy] = P(JI.chest),
      [hx0, hy0] = P(JI.hips);
    glowDot(g, cx, cy, 1.1 * s, '#ffc23a', a * (0.25 + 0.2 * mf.kick));
    // (a cockroach god in a shiny jacket ("Таракан"): limbs of dark chitin with an amber shine, and a third pair of legs
    // out of its middle, mirroring its knees, all six stomping on the kick (a gabber stomp in a drop))
    const legs = [
      [JI.hiL, JI.knL, JI.ftL],
      [JI.hiR, JI.knR, JI.ftR],
    ];
    const mid = [(cx + hx0) / 2, (cy + hy0) / 2],
      stomp = (drop ? 0.12 : 0.05) * mf.kick * s;
    g.strokeStyle = rgba('#140804', a);
    g.lineWidth = 0.13 * s;
    bonesPath(g, P);
    g.stroke();
    g.beginPath();
    for (const [, kn, ft] of legs) {
      const [kx, ky] = P(kn),
        [fx, fy] = P(ft);
      g.moveTo(...mid);
      g.lineTo(mid[0] + (kx - hx0) * 1.1, mid[1] + (ky - hy0) * 0.6 - stomp);
      g.lineTo(mid[0] + (fx - hx0) * 1.15, mid[1] + (fy - hy0) * 0.75 + stomp);
    }
    g.stroke();
    g.strokeStyle = rgba('#c8783a', a * 0.8);
    g.lineWidth = 0.04 * s;
    bonesPath(g, P);
    g.stroke();
    // (its jacket: the two halves of a glossy shell over its back, parted a little on the beat)
    const open = 0.04 * s * mf.beat,
      ang = Math.atan2(hy0 - cy, hx0 - cx);
    for (const sd of [-1, 1]) {
      g.fillStyle = rgba(shell, a);
      g.beginPath();
      g.ellipse((cx + hx0) / 2 + Math.cos(ang + Math.PI / 2) * sd * (0.05 * s + open), (cy + hy0) / 2 + Math.sin(ang + Math.PI / 2) * sd * (0.05 * s + open), 0.3 * s, 0.11 * s, ang, 0, TAU);
      g.fill();
      g.strokeStyle = rgba('#140804', a);
      g.lineWidth = 0.02 * s;
      g.stroke();
    }
    glowDot(g, cx - 0.04 * s, cy + 0.04 * s, 0.12 * s, '#ffe0a0', a * 0.6);
    const [hx, hy] = headAt(p);
    g.fillStyle = rgba(shell, a);
    g.beginPath();
    g.arc(hx, hy, 0.13 * s, 0, TAU);
    g.fill();
    g.strokeStyle = rgba('#140804', a);
    g.lineWidth = 0.025 * s;
    g.beginPath();
    for (const sd of [-1, 1]) {
      g.moveTo(hx + sd * 0.04 * s, hy - 0.1 * s);
      g.quadraticCurveTo(hx + sd * 0.2 * s, hy - 0.45 * s, hx + sd * (0.35 + 0.05 * Math.sin(t * 6 + sd)) * s, hy - (0.5 + 0.08 * mf.beat) * s);
    }
    g.stroke();
    for (const sd of [-0.05, 0.05]) glowDot(g, hx + sd * s, hy, 0.035 * s, '#ffc23a', a);
    g.restore();
  },
});
registerPart({
  ...PACK,
  id: 'velvet',
  slot: 'performer',
  media: ['air', 'space'],
  tags: ['mountain', 'fantasy', 'mild', 'night'],
  mood: [0.65, 0.6, 0.5],
  draw(f, p) {
    const { g, mf, t } = f,
      { P, s, a } = p;
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // (a rim of the dawn's purple and peach round a body of the night, stars twinkling in it)
    g.strokeStyle = rgba('#ff9ad0', a * 0.8);
    g.lineWidth = 0.19 * s;
    bonesPath(g, P);
    g.stroke();
    g.strokeStyle = rgba('#0c0818', a);
    g.lineWidth = 0.14 * s;
    bonesPath(g, P);
    g.stroke();
    const [hx, hy] = headAt(p);
    g.fillStyle = rgba('#ff9ad0', a * 0.8);
    g.beginPath();
    g.arc(hx, hy, 0.16 * s, 0, TAU);
    g.fill();
    g.fillStyle = rgba('#0c0818', a);
    g.beginPath();
    g.arc(hx, hy, 0.13 * s, 0, TAU);
    g.fill();
    for (let b = 0; b < BONES.length; b++) {
      const [x0, y0] = P(BONES[b][0]),
        [x1, y1] = P(BONES[b][1]);
      for (let k = 0; k < 2; k++) {
        const u = hash(b, k + 3),
          tw = 0.5 + 0.5 * Math.sin(t * 3 + b * 2 + k * 5);
        g.fillStyle = rgba('#ffffff', a * (0.4 + 0.6 * tw) * (0.6 + 0.4 * mf.hat));
        g.fillRect(x0 + (x1 - x0) * u - 0.012 * s, y0 + (y1 - y0) * u - 0.012 * s, 0.024 * s, 0.024 * s);
      }
    }
    glowDot(g, hx + 0.04 * s, hy - 0.03 * s, (0.03 + 0.05 * mf.kick) * s, '#ffffff', a);
    // (a snail's: a great spiral shell glowing on its back, spinning on a drop, two eyestalks on its head)
    const [cx, cy] = P(JI.chest),
      [px, py] = P(JI.hips),
      R = 0.32 * s,
      sx = (cx + px) / 2 - 0.22 * s,
      sy = (cy + py) / 2 - 0.05 * s,
      spin = t * (f.look.sceneAt?.(t)?.kind === 'drop' ? 3 : 0.4);
    glowDot(g, sx, sy, R * 1.6, '#ffb08a', a * (0.25 + 0.35 * mf.beat));
    g.fillStyle = rgba('#d890d0', a * 0.9);
    g.beginPath();
    g.arc(sx, sy, R, 0, TAU);
    g.fill();
    g.strokeStyle = rgba('#fff0ff', a * 0.8);
    g.lineWidth = 0.025 * s;
    g.beginPath();
    for (let q = 0; q < TAU * 2.6; q += 0.25) {
      const rr = R * (1 - q / (TAU * 2.8));
      g.lineTo(sx + Math.cos(q + spin) * rr, sy + Math.sin(q + spin) * rr);
    }
    g.stroke();
    g.strokeStyle = rgba('#ff9ad0', a);
    g.lineWidth = 0.025 * s;
    g.beginPath();
    for (const d of [-0.05, 0.06]) {
      g.moveTo(hx + d * s, hy - 0.1 * s);
      g.lineTo(hx + d * 2.5 * s, hy - (0.38 + 0.04 * Math.sin(t * 4 + d * 40)) * s);
    }
    g.stroke();
    for (const d of [-0.05, 0.06]) glowDot(g, hx + d * 2.5 * s, hy - (0.38 + 0.04 * Math.sin(t * 4 + d * 40)) * s, 0.04 * s, '#fff0ff', a);
    g.restore();
  },
});
registerPart({
  ...PACK,
  id: 'furcoat',
  slot: 'performer',
  media: ['air'],
  tags: ['summer', 'warm', 'party', 'bright'],
  mood: [0.6, 0.65, 0.45],
  draw(f, p) {
    const { g, mf } = f,
      { P, s, a } = p,
      fur = '#e8d0a8';
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // (its legs in white trousers, then the coat over its body and arms: fat strokes of fur, its fluff shaking on the
    // kick)
    g.strokeStyle = rgba('#f4f0e8', a);
    g.lineWidth = 0.1 * s;
    g.beginPath();
    for (const [p0, p1] of BONES.filter(([q]) => /^(hi|kn|ft)/.test(JN[q]))) {
      const [x0, y0] = P(p0),
        [x1, y1] = P(p1);
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
    }
    g.stroke();
    const [sl, sr, hp] = [JI.shL, JI.shR, JI.hips].map(j => P(j));
    g.fillStyle = rgba(fur, a);
    g.beginPath();
    g.moveTo(sl[0] - 0.12 * s, sl[1]);
    g.lineTo(sr[0] + 0.12 * s, sr[1]);
    g.lineTo(hp[0] + 0.32 * s, hp[1] + 0.35 * s);
    g.lineTo(hp[0] - 0.32 * s, hp[1] + 0.35 * s);
    g.fill();
    g.strokeStyle = rgba(fur, a);
    g.lineWidth = 0.2 * s;
    g.beginPath();
    for (const [p0, p1] of BONES.filter(([q, r]) => /^(sh|el)/.test(JN[q]) && /^(el|ha)/.test(JN[r]))) {
      const [x0, y0] = P(p0),
        [x1, y1] = P(p1);
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
    }
    g.stroke();
    g.fillStyle = rgba('#fff0d0', a);
    for (let k = 0; k < 10; k++) {
      const u = hash(k, 7),
        x = sl[0] + (sr[0] - sl[0]) * hash(k, 8) + (hp[0] - sl[0]) * u * 0.3,
        y = sl[1] + (hp[1] + 0.35 * s - sl[1]) * u;
      g.beginPath();
      g.arc(x, y + 0.02 * s * mf.kick, 0.05 * s, 0, TAU);
      g.fill();
    }
    const [hx, hy] = headAt(p);
    g.fillStyle = rgba('#f0d8c0', a);
    g.beginPath();
    g.arc(hx, hy, 0.13 * s, 0, TAU);
    g.fill();
    // (dark glasses, the sun glinting off them on the beat)
    g.fillStyle = rgba('#141418', a);
    g.fillRect(hx - 0.13 * s, hy - 0.04 * s, 0.26 * s, 0.07 * s);
    glowDot(g, hx + 0.06 * s, hy - 0.02 * s, (0.03 + 0.06 * mf.beat) * s, '#ffffff', a);
    p.hat(hx, hy, rgba('#f0c050', a));
    g.restore();
  },
});
registerPart({
  ...PACK,
  id: 'sprouts',
  slot: 'performer',
  media: ['air'],
  tags: ['garden', 'nature', 'ember'],
  mood: [0.55, 0.45, 0.35],
  draw(f, p) {
    const { g, mf, t } = f,
      { P, s, a } = p,
      drop = f.look.sceneAt?.(t)?.kind === 'drop';
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // (dark soil for a body, a vine winding along each bone, a leaf off it opening on the kick, a flower in a drop)
    g.strokeStyle = rgba('#2a1a12', a);
    g.lineWidth = 0.12 * s;
    bonesPath(g, P);
    g.stroke();
    for (let b = 0; b < BONES.length; b++) {
      const [x0, y0] = P(BONES[b][0]),
        [x1, y1] = P(BONES[b][1]),
        dx = x1 - x0,
        dy = y1 - y0,
        L = Math.hypot(dx, dy) || 1,
        nx = -dy / L,
        ny = dx / L;
      g.strokeStyle = rgba('#4ae04a', a);
      g.lineWidth = 0.025 * s;
      g.beginPath();
      for (let q = 0; q <= 8; q++) {
        const u = q / 8,
          w = Math.sin(u * TAU * 1.5 + t * 2 + b) * 0.05 * s;
        g.lineTo(x0 + dx * u + nx * w, y0 + dy * u + ny * w);
      }
      g.stroke();
      const lx = x0 + dx * 0.5,
        ly = y0 + dy * 0.5,
        open = 0.05 + 0.08 * mf.kick;
      g.fillStyle = rgba('#5ae04a', a);
      g.beginPath();
      g.ellipse(lx + nx * open * s, ly + ny * open * s, 0.06 * s, 0.03 * s, Math.atan2(ny, nx), 0, TAU);
      g.fill();
      if (drop && b % 2 === 0) glowDot(g, x1, y1, (0.05 + 0.05 * mf.beat) * s, b % 4 ? '#ff8ad0' : '#fff0a0', a);
    }
    const [hx, hy] = headAt(p);
    g.fillStyle = rgba('#2a1a12', a);
    g.beginPath();
    g.arc(hx, hy, 0.13 * s, 0, TAU);
    g.fill();
    // (a sprout on its head, its two leaves clapping on the beat in a drop)
    g.strokeStyle = rgba('#4ae04a', a);
    g.lineWidth = 0.03 * s;
    g.beginPath();
    g.moveTo(hx, hy - 0.12 * s);
    g.lineTo(hx, hy - 0.3 * s);
    g.stroke();
    const clap = drop ? mf.beat : 0;
    g.fillStyle = rgba('#5ae04a', a);
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.ellipse(hx + sd * (0.09 - 0.06 * clap) * s, hy - 0.32 * s, 0.09 * s, 0.04 * s, sd * (0.4 - 0.9 * clap), 0, TAU);
      g.fill();
    }
    g.restore();
  },
});

registerPart({
  ...PACK,
  id: 'haring',
  slot: 'performer',
  media: ['air'],
  tags: ['summer', 'warm', 'party', 'bright'],
  mood: [0.65, 0.7, 0.45],
  draw(f, p) {
    const { g, mf, t } = f,
      { P, s, a } = p,
      n = Math.floor(t / f.L.A.beat),
      cols = ['#e8302a', '#2a6ae8', '#ffd23a', '#2ab83a'],
      drop = f.look.sceneAt?.(t)?.kind === 'drop';
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // (a petroglyph dancer of bold flat colour with a black outline (Keith Haring's way), its colour turning on the beat,
    // motion ticks flicking off it on the kick; in a drop two more of it dancing beside it)
    const one = (dx, col, al) => {
      const Q = j => {
        const [x, y] = P(j);
        return [x + dx, y];
      };
      for (const [c, w] of [['#000000', 0.2], [col, 0.13]]) {
        g.strokeStyle = rgba(c, al);
        g.lineWidth = w * s;
        bonesPath(g, Q);
        g.stroke();
      }
      const [hx, hy] = Q(JI.head);
      g.fillStyle = rgba('#000000', al);
      g.beginPath();
      g.arc(hx, hy - 0.08 * s, 0.17 * s, 0, TAU);
      g.fill();
      g.fillStyle = rgba(col, al);
      g.beginPath();
      g.arc(hx, hy - 0.08 * s, 0.12 * s, 0, TAU);
      g.fill();
      g.strokeStyle = rgba('#000000', al * (0.4 + 0.6 * mf.kick));
      g.lineWidth = 0.035 * s;
      g.beginPath();
      for (const j of [JI.head, JI.haL, JI.haR]) {
        const [x, y] = Q(j);
        for (let k = 0; k < 3; k++) {
          const an = -Math.PI / 2 + (k - 1) * 0.6 + (j === JI.haL ? -0.9 : j === JI.haR ? 0.9 : 0);
          g.moveTo(x + Math.cos(an) * 0.24 * s, y + Math.sin(an) * 0.24 * s - (j === JI.head ? 0.08 * s : 0));
          g.lineTo(x + Math.cos(an) * 0.36 * s, y + Math.sin(an) * 0.36 * s - (j === JI.head ? 0.08 * s : 0));
        }
      }
      g.stroke();
    };
    if (drop) {
      one(-0.9 * s, cols[(n + 1) % 4], a * 0.85);
      one(0.9 * s, cols[(n + 2) % 4], a * 0.85);
    }
    one(0, cols[n % 4], a);
    g.restore();
  },
});

// ---- clones' outfits (drawn in the head's frame: x forward, y down the neck, a unit a head's radius)
function onHead(f, p, draw) {
  const { g, v } = f,
    J = p.J,
    nx = v.sx(J[JI.neck * 2]),
    ny = v.sy(J[JI.neck * 2 + 1]);
  let a = Math.atan2(p.cx - nx, -(p.cy - ny));
  a = Math.abs(a) < Math.PI / 2 ? a * 0.5 : Math.sign(a) * Math.PI + (a - Math.sign(a) * Math.PI) * 0.5;
  g.save();
  g.translate(p.cx, p.cy);
  g.rotate(a);
  g.scale(p.face * p.r, p.r);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  draw(g);
  g.restore();
}
function ink(g, fill, lw) {
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = lw;
  g.stroke();
}
registerPart({
  ...PACK,
  id: 'anthelm',
  slot: 'clone',
  media: ['air'],
  tags: ['insect', 'build', 'warm'],
  mood: [0.8, 0.35, 0.8],
  draw(f, p) {
    const { mf, t } = f;
    onHead(f, p, g => {
      // (a glossy dome of chitin over the crown, a shine on it, two feelers out of it bobbing on the beat)
      g.beginPath();
      g.arc(0, -0.1, 1.15, Math.PI * 1.02, Math.PI * 1.98);
      g.quadraticCurveTo(1.25, 0.25, 0.9, 0.3);
      g.lineTo(-1.1, 0.25);
      g.closePath();
      ink(g, '#5a2a10', 0.16);
      g.beginPath();
      g.ellipse(-0.3, -0.75, 0.35, 0.14, -0.3, 0, TAU);
      g.fillStyle = 'rgba(255,220,160,0.55)';
      g.fill();
      for (const [x, s] of [[0.2, 1], [-0.35, -0.6]]) {
        const bob = 0.25 * Math.sin(t * 6 + x * 5) + 0.3 * mf.beat;
        g.beginPath();
        g.moveTo(x, -1.1);
        g.quadraticCurveTo(x + 0.4 * s, -2.0, x + 1.0 * s, -2.1 - bob);
        g.strokeStyle = INK;
        g.lineWidth = 0.28;
        g.stroke();
        g.strokeStyle = '#5a2a10';
        g.lineWidth = 0.14;
        g.stroke();
        g.beginPath();
        g.arc(x + 1.0 * s, -2.1 - bob, 0.18, 0, TAU);
        ink(g, '#ffc23a', 0.08);
      }
    });
  },
});
registerPart({
  ...PACK,
  id: 'snailshell',
  slot: 'clone',
  media: ['air'],
  tags: ['mountain', 'fantasy', 'mild'],
  mood: [0.6, 0.6, 0.5],
  draw(f, p) {
    const { g, mf, v, t } = f,
      J = p.J,
      nk = [v.sx(J[JI.neck * 2]), v.sy(J[JI.neck * 2 + 1])],
      hp = [v.sx(J[JI.hips * 2]), v.sy(J[JI.hips * 2 + 1])],
      R = p.r * 1.25,
      cx = (nk[0] + hp[0]) / 2 - p.face * p.r * 0.9,
      cy = (nk[1] + hp[1]) / 2;
    // (a spiral shell on its back, pink and violet, its whorl lit on the beat)
    g.beginPath();
    g.arc(cx, cy, R, 0, TAU);
    ink(g, '#d890d0', Math.max(1, p.r * 0.14));
    g.strokeStyle = 'rgba(60,20,60,0.7)';
    g.lineWidth = Math.max(1, p.r * 0.12);
    g.beginPath();
    for (let a = 0; a < TAU * 2.4; a += 0.3) {
      const rr = R * (1 - a / (TAU * 2.7));
      g.lineTo(cx + Math.cos(a) * rr * p.face, cy + Math.sin(a) * rr);
    }
    g.stroke();
    glowDot(g, cx, cy, R * (0.4 + 0.3 * mf.beat), '#ffb08a', 0.3 + 0.4 * mf.beat);
    onHead(f, p, g => {
      // (two eyestalks up off its brow, bobbing)
      for (const x of [0.3, 0.75]) {
        const bob = 0.2 * Math.sin(t * 5 + x * 7);
        g.beginPath();
        g.moveTo(x, -0.8);
        g.lineTo(x + 0.2, -1.8 - bob);
        g.strokeStyle = INK;
        g.lineWidth = 0.3;
        g.stroke();
        g.strokeStyle = '#c8b8d8';
        g.lineWidth = 0.16;
        g.stroke();
        g.beginPath();
        g.arc(x + 0.2, -1.9 - bob, 0.22, 0, TAU);
        ink(g, '#f4f0ff', 0.08);
      }
    });
  },
});
registerPart({
  ...PACK,
  id: 'shades',
  slot: 'clone',
  media: ['air'],
  tags: ['summer', 'warm', 'party', 'bright'],
  mood: [0.6, 0.65, 0.45],
  draw(f, p) {
    const { mf } = f;
    onHead(f, p, g => {
      // (a little golden crown on the crown of its head, its points glinting on the beat)
      g.beginPath();
      g.moveTo(-0.65, -0.75);
      for (let k = 0; k <= 4; k++) g.lineTo(-0.65 + k * 0.33, k % 2 ? -1.05 : -1.55);
      g.lineTo(0.7, -0.75);
      g.closePath();
      ink(g, '#f0c050', 0.12);
      for (const k of [0, 2, 4]) glowDot(g, -0.65 + k * 0.33, -1.55, 0.2 + 0.25 * mf.beat, '#fff4c0', 0.5 + 0.5 * mf.beat);
      // (dark glasses over its eyes)
      g.beginPath();
      g.moveTo(-0.1, -0.35);
      g.lineTo(1.1, -0.35);
      g.lineTo(1.0, 0.05);
      g.lineTo(0.62, 0.05);
      g.lineTo(0.5, -0.12);
      g.lineTo(0.38, 0.05);
      g.lineTo(0.0, 0.05);
      g.closePath();
      ink(g, '#141418', 0.1);
      g.beginPath();
      g.moveTo(0.1, -0.25);
      g.lineTo(0.3, -0.25);
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.lineWidth = 0.08;
      g.stroke();
    });
  },
});
registerPart({
  ...PACK,
  id: 'leafhat',
  slot: 'clone',
  media: ['air'],
  tags: ['garden', 'nature', 'ember'],
  mood: [0.5, 0.45, 0.35],
  draw(f, p) {
    const { g, mf, v, t } = f,
      J = p.J,
      nk = [v.sx(J[JI.neck * 2]), v.sy(J[JI.neck * 2 + 1])],
      hp = [v.sx(J[JI.hips * 2]), v.sy(J[JI.hips * 2 + 1])],
      drop = f.look.sceneAt?.(t)?.kind === 'drop';
    // (a cape of three big leaves off its shoulders)
    for (let k = 0; k < 3; k++) {
      const u = 0.25 + k * 0.25,
        x = nk[0] + (hp[0] - nk[0]) * u - p.face * p.r * 0.5,
        y = nk[1] + (hp[1] - nk[1]) * u;
      g.beginPath();
      g.ellipse(x, y, p.r * 0.9, p.r * 0.45, -p.face * 0.6, 0, TAU);
      ink(g, k % 2 ? '#2ab83a' : '#5ae04a', Math.max(1, p.r * 0.1));
    }
    onHead(f, p, g => {
      // (a sprout up off its crown, its two leaves clapping on the beat in a drop, a bud opening in it)
      const clap = drop ? mf.beat : 0;
      g.beginPath();
      g.moveTo(0, -0.9);
      g.lineTo(0.05, -1.9);
      g.strokeStyle = INK;
      g.lineWidth = 0.3;
      g.stroke();
      g.strokeStyle = '#3aa83a';
      g.lineWidth = 0.16;
      g.stroke();
      for (const s of [-1, 1]) {
        g.beginPath();
        g.ellipse(0.05 + s * (0.55 - 0.35 * clap), -1.95, 0.55, 0.25, s * (0.5 - 1.1 * clap), 0, TAU);
        ink(g, '#5ae04a', 0.1);
      }
      if (drop) {
        g.beginPath();
        g.arc(0.05, -2.15, 0.2 + 0.1 * mf.beat, 0, TAU);
        ink(g, '#ff8ad0', 0.08);
      }
    });
  },
});

// ---- the swallowed sky's (render/places/crocsky.js: "Крокодил", "Марабу", "Шаман", "Водяной")
//   weather    mushroomrain (fat warm drops of a mushroom rain, fireflies and spores drifting up through it, a splash of
//              light off the drops on the kick)
//   performer  drummer (a figure with a big round drum, the drum flashing on the kick, a crown of feathers, a necklace of
//              crocodile's teeth; no skulls)
//   clone      crochood (a crocodile's hood over its head, its snout and teeth out over its brow, eyes on top)
registerPart({
  ...PACK,
  id: 'mushroomrain',
  slot: 'weather',
  media: ['air'],
  tags: ['jungle', 'nature', 'folk', 'warm'],
  front(f, k) {
    const { g, v, t, mf } = f;
    g.strokeStyle = 'rgba(200,250,240,0.45)';
    g.lineWidth = Math.max(1.5, 2.2 * v.dpr);
    g.beginPath();
    for (let i = 0; i < 26 + 20 * k; i++) {
      const x = wrap(hash(i, 341) * v.W + t * 20 * v.dpr, v.W),
        y = wrap(hash(i, 342) * v.H + t * v.H * (0.7 + 0.3 * hash(i, 343)), v.H);
      g.moveTo(x, y);
      g.lineTo(x - 2 * v.dpr, y + 12 * v.dpr);
    }
    g.stroke();
    for (let i = 0; i < 16; i++) {
      const x = wrap(hash(i, 344) * v.W + Math.sin(t * 0.7 + i) * 24 * v.dpr, v.W),
        y = wrap(hash(i, 345) * v.H - t * 12 * v.dpr, v.H);
      glowDot(g, x, y, (2.5 + 2 * mf.kick) * v.dpr, i % 3 ? '#e8ff8a' : '#ffb0d8', 0.5 + 0.4 * Math.sin(t * 3 + i));
    }
  },
});
registerPart({
  ...PACK,
  id: 'drummer',
  slot: 'performer',
  media: ['air'],
  tags: ['jungle', 'folk', 'nature'],
  mood: [0.7, 0.45, 0.6],
  draw(f, p) {
    const { g, mf, T } = f,
      { P, s, a } = p,
      dark = '#14100c';
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const [cx, cy] = P(JI.chest);
    glowDot(g, cx, cy, 1.0 * s, T.line, a * (0.3 + 0.25 * mf.kick));
    g.strokeStyle = rgba(dark, a);
    g.lineWidth = 0.13 * s;
    bonesPath(g, P);
    g.stroke();
    // (a necklace of crocodile's teeth across its chest)
    const [sl, sr] = [JI.shL, JI.shR].map(j => P(j));
    g.fillStyle = rgba('#f4f0dc', a);
    for (let k = 0; k < 7; k++) {
      const u = (k + 0.5) / 7,
        x = sl[0] + (sr[0] - sl[0]) * u,
        y = sl[1] + (sr[1] - sl[1]) * u + Math.sin(u * Math.PI) * 0.12 * s;
      g.beginPath();
      g.moveTo(x - 0.025 * s, y);
      g.lineTo(x, y + 0.08 * s);
      g.lineTo(x + 0.025 * s, y);
      g.fill();
    }
    // (the drum in its left hand, its skin flashing on the kick; its right hand the beater)
    const [dx, dy] = P(JI.haL);
    g.fillStyle = rgba('#8a5a2a', a);
    g.beginPath();
    g.arc(dx, dy, 0.26 * s, 0, TAU);
    g.fill();
    g.fillStyle = rgba('#f0e0b8', a);
    g.beginPath();
    g.arc(dx, dy, 0.21 * s * (1 - 0.06 * mf.kick), 0, TAU);
    g.fill();
    glowDot(g, dx, dy, (0.3 + 0.4 * mf.kick) * s, '#ffd060', a * (0.2 + 0.8 * mf.kick));
    // (its head and its crown of feathers, spread on the beat)
    const [hx, hy] = headAt(p);
    g.fillStyle = rgba(dark, a);
    g.beginPath();
    g.arc(hx, hy, 0.13 * s, 0, TAU);
    g.fill();
    const fc = ['#e8302a', '#ffd23a', '#2ab8b0', '#ffffff'];
    for (let k = -3; k <= 3; k++) {
      const an = -Math.PI / 2 + k * (0.24 + 0.06 * mf.beat),
        L = (0.3 - 0.03 * Math.abs(k)) * s;
      g.strokeStyle = rgba(fc[(k + 3) % 4], a);
      g.lineWidth = 0.05 * s;
      g.beginPath();
      g.moveTo(hx + Math.cos(an) * 0.12 * s, hy + Math.sin(an) * 0.12 * s);
      g.lineTo(hx + Math.cos(an) * (0.12 * s + L), hy + Math.sin(an) * (0.12 * s + L));
      g.stroke();
    }
    g.restore();
  },
});
registerPart({
  ...PACK,
  id: 'crochood',
  slot: 'clone',
  media: ['air'],
  tags: ['jungle', 'folk', 'nature'],
  mood: [0.7, 0.45, 0.6],
  draw(f, p) {
    const { mf } = f;
    onHead(f, p, g => {
      // (a crocodile's head worn as a hood: its snout out over the brow, a row of teeth under it, two eyes on top
      // lit on the beat)
      g.beginPath();
      g.moveTo(-1.3, 0.6);
      g.quadraticCurveTo(-1.4, -1.2, 0, -1.25);
      g.lineTo(2.1, -0.75);
      g.quadraticCurveTo(2.3, -0.45, 2.0, -0.35);
      g.lineTo(0.2, -0.45);
      g.quadraticCurveTo(-0.6, -0.1, -0.7, 0.9);
      g.closePath();
      ink(g, '#3a7a34', 0.14);
      g.fillStyle = '#f4f0dc';
      for (let k = 0; k < 5; k++) {
        const x = 0.4 + k * 0.33;
        g.beginPath();
        g.moveTo(x, -0.43);
        g.lineTo(x + 0.08, -0.2);
        g.lineTo(x + 0.16, -0.43);
        g.fill();
      }
      for (const x of [-0.1, 0.45]) {
        g.beginPath();
        g.arc(x, -1.25, 0.24, Math.PI, Math.PI * 2);
        ink(g, '#3a7a34', 0.1);
        glowDot(g, x, -1.33, 0.2 + 0.2 * mf.beat, '#ffd23a', 0.7 + 0.3 * mf.beat);
      }
    });
  },
});
