// (a pack of parts: see registry.js)
// ATL's performers (world/artists.js): the singer's captured dance far off in the sky (layers/performer.js gives the
// joints J, the mapping P, the scale s, the alpha a, the colour col), drawn as
//   inkbrush   torn strokes of a red dry brush (his lettering's), each bone repainted on the kick, a spatter on a drop:
//              in a black and white world the one red
//   acidbones  three echoes of a toxic green skeleton with yellow eyes ("Адренохром"), each half a beat behind the last
//              and caught up on the beat
//   shaman     a dark figure in a cloak of ribbons with a crown of crow feathers, a drum-ring in its hand flashing on
//              the kick, its ribbons trailing its hands (no headdress of any real people)
//   ether      the body as a picture on a lost channel: scanlines, split into red, green and blue on the snare
import { registerPart } from '../../registry.js';
import { BONES, JI, NB } from '../../../lib/skeleton.js';
import { glowDot, hash, rgba } from '../../../render/util.js';

const TAU = Math.PI * 2;
const headAt = p => {
  const [hx, hy] = p.P(JI.head);
  return [hx, hy - 0.08 * p.s];
};
function bonesPath(g, P, dx = 0, dy = 0) {
  g.beginPath();
  for (const [p, q] of BONES) {
    const [x0, y0] = P(p),
      [x1, y1] = P(q);
    g.moveTo(x0 + dx, y0 + dy);
    g.lineTo(x1 + dx, y1 + dy);
  }
}
const beatOf = f => {
  const b = f.t / f.L.A.beat;
  return [b - Math.floor(b), Math.floor(b)];
};

registerPart({
  pack: 'atl',
  id: 'inkbrush',
  slot: 'performer',
  media: ['air'],
  tags: ['province', 'party', 'urban', 'cold'],
  mood: [0.6, 0.25, 0.6],
  draw(f, p) {
    const { g, mf } = f,
      { P, s, a } = p,
      [, n] = beatOf(f),
      red = '#d4202a';
    g.save();
    g.lineCap = 'round';
    // (each bone three dry strokes, wobbling off its line by the beat's count: repainted every beat)
    for (let b = 0; b < NB; b++) {
      const [p0, p1] = BONES[b],
        [x0, y0] = P(p0),
        [x1, y1] = P(p1);
      for (let k = 0; k < 3; k++) {
        const j = (hash(b * 3 + k, n) - 0.5) * 0.05 * s,
          w = (k ? 0.035 : 0.075) * s * (1 + 0.3 * mf.kick);
        g.strokeStyle = rgba(k === 2 ? '#f4f0e8' : red, a * (k ? 0.6 : 0.95));
        g.lineWidth = w;
        g.beginPath();
        g.moveTo(x0 + j, y0 - j);
        g.quadraticCurveTo((x0 + x1) / 2 + j * 2, (y0 + y1) / 2 + j, x1 - j, y1 + j);
        g.stroke();
      }
    }
    const [hx, hy] = headAt(p);
    g.fillStyle = rgba(red, a);
    g.beginPath();
    for (let i = 0; i < 12; i++) {
      const an = (i / 12) * TAU,
        r = 0.15 * s * (0.85 + 0.3 * hash(i, n));
      g.lineTo(hx + Math.cos(an) * r, hy + Math.sin(an) * r);
    }
    g.fill();
    // (a spatter flung off on a drop's kicks)
    if (mf.drop > 0 && mf.kick > 0.2)
      for (let i = 0; i < 14; i++) {
        const an = hash(i, n + 7) * TAU,
          d = (0.3 + 0.9 * hash(i, n + 9)) * s * mf.kick;
        g.fillRect(hx + Math.cos(an) * d, hy + 0.5 * s + Math.sin(an) * d, 0.03 * s, 0.03 * s);
      }
    p.hat(hx, hy, rgba(red, a));
    g.restore();
  },
});

registerPart({
  pack: 'atl',
  id: 'acidbones',
  slot: 'performer',
  media: ['air', 'space'],
  tags: ['acid', 'party', 'occult', 'neon'],
  mood: [0.8, 0.45, 0.65],
  draw(f, p) {
    const { g, mf } = f,
      { P, s, a } = p,
      [u] = beatOf(f),
      green = '#3aff3a',
      eyes = '#ffe23a';
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    // (the echoes: behind, smaller, fainter, falling behind through the beat and caught up on it)
    for (let e = 2; e >= 0; e--) {
      const lag = e * (0.25 + 0.5 * u) * 0.35 * s,
        al = a * (e ? 0.35 / e : 1);
      for (const [w, k] of [
        [0.11, 0.18],
        [0.03, 0.9],
      ]) {
        g.strokeStyle = rgba(green, al * k);
        g.lineWidth = w * s;
        bonesPath(g, P, lag, -lag * 0.3);
        g.stroke();
      }
      // (ribs across the chest)
      const [cx, cy] = P(JI.chest),
        [nx, ny] = P(JI.neck);
      g.strokeStyle = rgba(green, al * 0.8);
      g.lineWidth = 0.02 * s;
      g.beginPath();
      for (let r = 1; r <= 3; r++) {
        const q = r / 4,
          x = cx + (nx - cx) * q + lag,
          y = cy + (ny - cy) * q - lag * 0.3;
        g.moveTo(x - 0.12 * s, y + 0.03 * s);
        g.quadraticCurveTo(x, y - 0.04 * s, x + 0.12 * s, y + 0.03 * s);
      }
      g.stroke();
      const [hx, hy] = headAt(p);
      g.strokeStyle = rgba(green, al);
      g.lineWidth = 0.03 * s;
      g.beginPath();
      g.arc(hx + lag, hy - lag * 0.3, 0.13 * s, 0, TAU);
      g.stroke();
      for (const d of [-0.05, 0.05]) glowDot(g, hx + lag + d * s, hy - lag * 0.3, (0.05 + 0.04 * mf.kick) * s, eyes, al);
    }
    const [hx, hy] = headAt(p);
    p.hat(hx, hy, rgba(green, a));
    g.restore();
  },
});

registerPart({
  pack: 'atl',
  id: 'shaman',
  slot: 'performer',
  media: ['air'],
  tags: ['folk', 'occult', 'acid', 'nature'],
  mood: [0.65, 0.35, 0.55],
  draw(f, p) {
    const { g, mf, t, T } = f,
      { P, s, a } = p,
      dark = '#0a0a10',
      rib = [T.line, T.hold, '#3dff6a', '#ff2fd0'];
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // (a halo of the sky's light behind it so a dark figure reads)
    const [cx, cy] = P(JI.chest);
    glowDot(g, cx, cy, 1.0 * s, T.line, a * (0.35 + 0.25 * mf.kick));
    // (the body dark and thick, a cloak flaring from the shoulders to the knees)
    g.strokeStyle = rgba(dark, a);
    g.lineWidth = 0.14 * s;
    bonesPath(g, P);
    g.stroke();
    const [sl, sr, kl, kr] = [JI.shL, JI.shR, JI.knL, JI.knR].map(j => P(j));
    g.fillStyle = rgba(dark, a * 0.9);
    g.beginPath();
    g.moveTo(...sl);
    g.lineTo(...sr);
    g.lineTo(kr[0] + 0.15 * s, kr[1]);
    g.lineTo(kl[0] - 0.15 * s, kl[1]);
    g.fill();
    // (ribbons off its arms, trailing in waves)
    for (const [i, h] of [
      [JI.elL, JI.haL],
      [JI.elR, JI.haR],
    ]) {
      const [x0] = P(i),
        [x1, y1] = P(h);
      for (let k = 0; k < 3; k++) {
        g.strokeStyle = rgba(rib[(k + i) % 4], a * 0.85);
        g.lineWidth = 0.025 * s;
        g.beginPath();
        g.moveTo(x1, y1);
        for (let q = 1; q <= 6; q++) g.lineTo(x1 + q * 0.07 * s + (x1 - x0) * 0.1 * q, y1 + Math.sin(t * 6 + q + k) * 0.05 * s * q * 0.4 + k * 0.03 * s);
        g.stroke();
      }
    }
    // (the drum-ring in its right hand: a hoop flashing on the kick)
    const [dx, dy] = P(JI.haR);
    g.strokeStyle = rgba('#f4e0a0', a);
    g.lineWidth = 0.035 * s;
    g.beginPath();
    g.ellipse(dx, dy, 0.17 * s, 0.2 * s, 0.3, 0, TAU);
    g.stroke();
    glowDot(g, dx, dy, (0.25 + 0.35 * mf.kick) * s, '#f4e0a0', a * (0.3 + 0.7 * mf.kick));
    // (the head and its crown of crow feathers)
    const [hx, hy] = headAt(p);
    g.fillStyle = rgba(dark, a);
    g.beginPath();
    g.arc(hx, hy, 0.13 * s, 0, TAU);
    g.fill();
    for (let k = -3; k <= 3; k++) {
      const an = -Math.PI / 2 + k * 0.28,
        L = (0.26 - 0.03 * Math.abs(k)) * s * (1 + 0.15 * mf.beat);
      g.beginPath();
      g.moveTo(hx + Math.cos(an - 0.12) * 0.1 * s, hy + Math.sin(an - 0.12) * 0.1 * s);
      g.lineTo(hx + Math.cos(an) * (0.1 * s + L), hy + Math.sin(an) * (0.1 * s + L));
      g.lineTo(hx + Math.cos(an + 0.12) * 0.1 * s, hy + Math.sin(an + 0.12) * 0.1 * s);
      g.fill();
    }
    for (const d of [-0.045, 0.045]) glowDot(g, hx + d * s, hy, 0.04 * s, T.line, a);
    g.restore();
  },
});

registerPart({
  pack: 'atl',
  id: 'ether',
  slot: 'performer',
  media: ['air', 'space'],
  tags: ['radio', 'tech', 'industrial'],
  mood: [0.7, 0.35, 0.65],
  draw(f, p) {
    const { g, v, mf, t } = f,
      { P, s, a, col } = p,
      split = (0.02 + 0.06 * mf.snare) * s,
      fr = Math.floor(t * 15);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'butt';
    // (the body three times, in red, green and blue, pulled apart on the snare)
    for (const [c, dx] of [
      ['#ff2a4a', -split],
      ['#2aff8a', 0],
      ['#3a6aff', split],
    ]) {
      g.strokeStyle = rgba(c, a * 0.55);
      g.lineWidth = 0.12 * s;
      bonesPath(g, P, dx + (hash(fr, 3) - 0.5) * 0.02 * s, 0);
      g.stroke();
    }
    // (the scanlines over it: dark lines through the body every few pixels, one band torn sideways)
    const [hx, hy] = headAt(p),
      top = hy - 0.25 * s,
      bot = p.floor,
      tear = top + hash(fr, 5) * (bot - top);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = rgba('#000000', 0.35 * a);
    for (let y = top; y < bot; y += 4 * v.dpr) g.fillRect(p.cx - 0.9 * s, y, 1.8 * s, 1.5 * v.dpr);
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = rgba(col, a * 0.5 * (0.4 + mf.snare));
    g.fillRect(p.cx - 0.6 * s + (hash(fr, 6) - 0.5) * 0.3 * s, tear, 1.2 * s, 6 * v.dpr);
    glowDot(g, hx, hy, 0.2 * s, col, a);
    p.hat(hx, hy, rgba(col, a));
    g.restore();
  },
});
