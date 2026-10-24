// (a pack of parts: see registry.js)
// The singer's hologram, ten ways: the same captured dance (layers/performer.js gives each style the joints J, the
// screen mapping P, the scale s, the alpha a that already grows with the voice, the colour col, its centre cx and feet
// y floor, and hat() for the secret giant's headgear), drawn as light of a different kind. No blur anywhere: glows are
// wide faint strokes under thin bright ones, or glowDot's sprite.
import { registerPart } from '../../registry.js';
import { BONES, JI, NB } from '../../../lib/skeleton.js';
import { glowDot, hash, rgba } from '../../../render/util.js';

const TAU = Math.PI * 2;
// (a mix of two hex colours, as hex, so rgba() can take it)
function mix(a, b, u) {
  const p = parseInt(a.slice(1), 16),
    q = parseInt(b.slice(1), 16),
    c = sh => Math.round(((p >> sh) & 255) * (1 - u) + ((q >> sh) & 255) * u);
  return '#' + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1);
}
// (where the song is within its beat, 0..1, and which beat it is)
function beatAt(f) {
  const b = (f.t - (f.L.A.beats?.[0] ?? 0)) / f.L.A.beat;
  return [b - Math.floor(b), Math.floor(b)];
}
// (how thick each bone of the body is, in metres: torso, neck, head bone, arms, legs)
const THICK = BONES.map(([p, q]) => {
  if (p === JI.hips && q === JI.chest) return 0.3;
  if (q === JI.neck) return 0.12;
  if (q === JI.head) return 0.1;
  if (q === JI.shL || q === JI.shR) return 0.11;
  if (q === JI.elL || q === JI.elR) return 0.11;
  if (q === JI.haL || q === JI.haR) return 0.085;
  if (q === JI.hiL || q === JI.hiR) return 0.16;
  if (q === JI.knL || q === JI.knR) return 0.15;
  if (q === JI.ftL || q === JI.ftR) return 0.11;
  return 0.07;
});
// (the head: a little above the head joint, as layers/performer.js puts it)
const headAt = p => {
  const [hx, hy] = p.P(JI.head);
  return [hx, hy - 0.08 * p.s];
};
// (every bone as a stroke, in one path)
function bonesPath(g, P) {
  g.beginPath();
  for (const [p, q] of BONES) {
    const [x0, y0] = P(p),
      [x1, y1] = P(q);
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
  }
}

// hologram: the classic look, exactly as layers/performer.js draws it with no style
registerPart({
  id: 'hologram',
  slot: 'performer',
  media: ['air', 'space', 'water'],
  tags: ['future', 'tech', 'modern'],
  draw(f, p) {
    const { g } = f,
      { P, s, a, col } = p;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    // (its glow: a wide faint body under a thin bright one, no blur)
    for (const [w, al] of [
      [0.16, 0.25],
      [0.05, 1],
    ]) {
      g.strokeStyle = rgba(col, a * al);
      g.lineWidth = w * s;
      bonesPath(g, P);
      g.stroke();
    }
    const [hx, hy] = P(JI.head);
    glowDot(g, hx, hy - 0.08 * s, 0.25 * s, col, a);
    p.hat(hx, hy - 0.08 * s, rgba(col, a));
    g.restore();
  },
});

// neon: thick glass tubes with a white-hot core, the joints burning where the tubes meet, the gas changing colour
// from beat to beat (T.line on one, T.hold on the next) and the whole sign buzzing brighter on the kick
registerPart({
  id: 'neon',
  slot: 'performer',
  media: ['air', 'space', 'water'],
  tags: ['neon', 'urban', 'party'],
  mood: [0.75, 0.6, 0.5],
  draw(f, p) {
    const { g, mf, T } = f,
      { P, s, a } = p,
      [ph, n] = beatAt(f),
      // (the gas swaps on every beat, sliding over in the first fifth of it, in eight steps: glowDot keeps a sprite
      // for every colour it is given, so the colours it gets stay few)
      u = Math.round(Math.min(1, ph * 5) * 8) / 8,
      [c0, c1] = n % 2 ? [T.hold, T.line] : [T.line, T.hold],
      tube = mix(c0, c1, u),
      core = mix(tube, '#ffffff', 0.75),
      buzz = 0.8 + 0.35 * mf.kick;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const [w, al, c] of [
      [0.3, 0.12, tube],
      [0.13, 0.45, tube],
      [0.06, 0.8, tube],
      [0.022, 1, core],
    ]) {
      g.strokeStyle = rgba(c, a * al * buzz);
      g.lineWidth = w * s;
      bonesPath(g, P);
      g.stroke();
    }
    // (the head: a neon ring with a bright core)
    const [hx, hy] = headAt(p);
    for (const [w, al, c] of [
      [0.13, 0.4, tube],
      [0.05, 0.85, tube],
      [0.02, 1, core],
    ]) {
      g.strokeStyle = rgba(c, a * al * buzz);
      g.lineWidth = w * s;
      g.beginPath();
      g.arc(hx, hy, 0.15 * s, 0, TAU);
      g.stroke();
    }
    // (hot joints: the solder points flare on the kick)
    for (let k = 1; k < 18; k++) {
      if (k === JI.head || k === JI.toL || k === JI.toR) continue;
      const [x, y] = P(k);
      glowDot(g, x, y, (0.09 + 0.08 * mf.kick) * s, core, a * 0.8);
    }
    p.hat(hx, hy, rgba(core, a));
    g.restore();
  },
});

// particles: the body as a swarm of ~120 sparks spread along its bones (each always at the same place on its bone),
// twinkling one by one, blown out a little on every kick and drawn back together between
// (about how long each bone is, in metres, so the sparks spread evenly over the body: the long bones get more)
const LONG = BONES.map(([p, q]) => {
  if (p === JI.hips && q === JI.chest) return 0.45;
  if (q === JI.neck || q === JI.head) return 0.14;
  if (q === JI.shL || q === JI.shR) return 0.16;
  if (q === JI.hiL || q === JI.hiR) return 0.1;
  if (q === JI.knL || q === JI.knR || q === JI.ftL || q === JI.ftR) return 0.42;
  if (q === JI.toL || q === JI.toR) return 0.12;
  return 0.28;
});
const pickBone = u => {
  let w = u * LONG.reduce((x, y) => x + y, 0);
  for (let b = 0; b < NB; b++) if ((w -= LONG[b]) <= 0) return b;
  return NB - 1;
};
const SPARKS = Array.from({ length: 124 }, (_, i) => {
  // (the last twenty make the head's ring)
  if (i >= 104) return { head: true, ang: ((i - 104) / 20) * TAU, r: 0.12 + 0.04 * hash(i, 7), i };
  // (spread along the bones by their length, each at its own point across the bone's thickness)
  return { b: pickBone((i + hash(i, 1)) / 104), u: hash(i, 2), off: hash(i, 3) - 0.5, ang: hash(i, 4) * TAU, fly: 0.3 + hash(i, 5), size: hash(i, 6), i };
});
registerPart({
  id: 'particles',
  slot: 'performer',
  media: ['air', 'space', 'water'],
  tags: ['fantasy', 'nature', 'future'],
  mood: [0.5, 0.65, 0.2],
  draw(f, p) {
    const { g, mf, t, T } = f,
      { P, s, a, col } = p,
      blow = (0.12 * mf.kick + 0.06 * mf.drop) * s,
      hot = mix(col, '#ffffff', 0.6),
      [hx, hy] = headAt(p);
    g.save();
    g.globalCompositeOperation = 'lighter';
    // (a faint thread of the body under the swarm, so the dance still reads)
    g.lineCap = 'round';
    g.strokeStyle = rgba(col, a * 0.16);
    g.lineWidth = 0.09 * s;
    bonesPath(g, P);
    g.stroke();
    for (const k of SPARKS) {
      let x, y, w;
      if (k.head) {
        x = hx + Math.cos(k.ang + t * 0.8) * k.r * s;
        y = hy + Math.sin(k.ang + t * 0.8) * k.r * s;
        w = THICK[2];
      } else {
        const [p0, p1] = BONES[k.b],
          [x0, y0] = P(p0),
          [x1, y1] = P(p1),
          len = Math.hypot(x1 - x0, y1 - y0) || 1;
        w = THICK[k.b];
        x = x0 + (x1 - x0) * k.u - ((y1 - y0) / len) * k.off * w * s;
        y = y0 + (y1 - y0) * k.u + ((x1 - x0) / len) * k.off * w * s;
      }
      // (blown out along its own direction on the kick)
      x += Math.cos(k.ang) * blow * (k.fly ?? 1);
      y += Math.sin(k.ang) * blow * (k.fly ?? 1);
      const tw = 0.5 + 0.5 * Math.sin(t * (5 + 4 * hash(k.i, 9)) + k.i * 2.3),
        r = (0.016 + 0.022 * (k.size ?? 0.5)) * s * (0.6 + 0.6 * tw);
      glowDot(g, x, y, r * (k.i % 5 ? 3 : 5), k.i % 7 ? col : T.line, a * (0.45 + 0.4 * tw));
      g.fillStyle = rgba(hot, a * (0.5 + 0.5 * tw));
      g.fillRect(x - r * 0.5, y - r * 0.5, r, r);
      // (a four-pointed glint on the brightest few, on the hats)
      if (tw > 0.92 && mf.hat > 0.2) {
        g.fillRect(x - r * 2.5, y - 0.5, r * 5, 1);
        g.fillRect(x - 0.5, y - r * 2.5, 1, r * 5);
      }
    }
    p.hat(hx, hy, rgba(hot, a * 0.8));
    g.restore();
  },
});

// wireframe: a low-poly CAD body, every bone a thin hexagonal prism turning slowly about its axis, the head an
// eight-sided ball, its edges lit up on the hats and a scan line sweeping down it on every bar
registerPart({
  id: 'wireframe',
  slot: 'performer',
  media: ['air', 'space', 'water'],
  tags: ['tech', 'future', 'industrial'],
  mood: [0.6, 0.4, 0.6],
  draw(f, p) {
    const { g, mf, t, T, L } = f,
      { P, s, a, col } = p,
      lit = 0.7 + 0.3 * mf.hat,
      rot = t * 0.7,
      hex = Array.from({ length: 6 }, (_, k) => rot + (k * TAU) / 6),
      [hx, hy] = headAt(p);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineJoin = 'round';
    g.lineCap = 'round';
    // (a faint glass volume inside the mesh)
    for (let b = 0; b < NB; b++) {
      const [x0, y0] = P(BONES[b][0]),
        [x1, y1] = P(BONES[b][1]);
      g.strokeStyle = rgba(col, a * 0.1);
      g.lineWidth = THICK[b] * s;
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
    }
    g.lineWidth = Math.max(1.2, 0.016 * s);
    // (the edges along the bones and round their ends)
    g.strokeStyle = rgba(col, a * lit);
    g.beginPath();
    const verts = [];
    for (let b = 0; b < NB; b++) {
      const [p0, p1] = BONES[b],
        [x0, y0] = P(p0),
        [x1, y1] = P(p1),
        len = Math.hypot(x1 - x0, y1 - y0) || 1,
        nx = -(y1 - y0) / len,
        ny = (x1 - x0) / len,
        dx = (x1 - x0) / len,
        dy = (y1 - y0) / len,
        r = (THICK[b] * s) / 2,
        // (the end rings, seen a little from the side: a flattened hexagon)
        ring = (cx, cy) => hex.map(th => [cx + nx * r * Math.cos(th) + dx * r * 0.35 * Math.sin(th), cy + ny * r * Math.cos(th) + dy * r * 0.35 * Math.sin(th)]),
        A = ring(x0, y0),
        B = ring(x1, y1);
      for (const R of [A, B]) {
        g.moveTo(R[0][0], R[0][1]);
        for (let k = 1; k < 6; k++) g.lineTo(R[k][0], R[k][1]);
        g.closePath();
      }
      for (let k = 0; k < 6; k++) {
        // (the edges facing us only: the hidden half of the prism is not drawn, like a CAD view)
        if (Math.sin(hex[k]) < -0.2) continue;
        g.moveTo(A[k][0], A[k][1]);
        g.lineTo(B[k][0], B[k][1]);
      }
      if (b % 3 === 0) verts.push(...A);
    }
    // (the head: two octagons crossed, a low-poly ball)
    for (const sq of [1, Math.abs(Math.cos(rot))]) {
      for (let k = 0; k <= 8; k++) {
        const th = (k * TAU) / 8,
          x = hx + Math.cos(th) * 0.15 * s * sq,
          y = hy + Math.sin(th) * 0.15 * s;
        if (k) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
    }
    g.moveTo(hx - 0.15 * s, hy);
    g.lineTo(hx + 0.15 * s, hy);
    g.stroke();
    // (the vertices: little squares, bright on the hats)
    g.fillStyle = rgba(mix(col, '#ffffff', 0.6), a * lit);
    const vs = Math.max(2, 0.018 * s);
    for (const [x, y] of verts) g.fillRect(x - vs / 2, y - vs / 2, vs, vs);
    // (the scan line: down the figure once a bar, a bright band of T.line)
    const bar = (L.A.beat || 0.5) * 4,
      u = (t % bar) / bar,
      top = p.floor - 1.95 * s,
      sy = top + u * 2.1 * s;
    const gr = g.createLinearGradient(0, sy - 0.08 * s, 0, sy + 0.08 * s);
    gr.addColorStop(0, rgba(T.line, 0));
    gr.addColorStop(0.5, rgba(T.line, a * 0.35));
    gr.addColorStop(1, rgba(T.line, 0));
    g.fillStyle = gr;
    g.fillRect(p.cx - 0.9 * s, sy - 0.08 * s, 1.8 * s, 0.16 * s);
    p.hat(hx, hy, rgba(col, a));
    g.restore();
  },
});

// (the shadow's silhouette is drawn apart on this canvas, made once and grown as needed; the joints the bounds come
// from: every joint the bones join)
const SIL = { c: null },
  J_N = Math.max(...BONES.flat()) + 1;
// shadow: a huge dark silhouette standing against the sky (the sky's own top colour, darkened), a thin rim of light
// along its upper edges and two eyes that burn brighter on the kick: ominous, a god looking over the city
registerPart({
  id: 'shadow',
  slot: 'performer',
  media: ['air'],
  tags: ['gothic', 'ancient', 'cold'],
  mood: [0.65, 0.2, 0.75],
  draw(f, p) {
    const { g, mf, T } = f,
      { P, s, col } = p,
      // (a shadow wants to be seen: it stays a little firmer than a hologram between the lines, never a wall)
      a = Math.min(0.9, 0.18 + p.a),
      dark = mix(T.sky[0], '#000000', 0.6),
      rim = mix(T.line, '#ffffff', 0.3),
      [hx, hy] = headAt(p),
      bodies = (dx, dy, extra, g = f.g) => {
        g.beginPath();
        for (let b = 0; b < NB; b++) {
          const [p0, p1] = BONES[b],
            [x0, y0] = P(p0),
            [x1, y1] = P(p1);
          g.lineWidth = (THICK[b] + extra) * s;
          g.beginPath();
          g.moveTo(x0 + dx, y0 + dy);
          g.lineTo(x1 + dx, y1 + dy);
          g.stroke();
        }
        g.beginPath();
        g.arc(hx + dx, hy + dy, (0.16 + extra / 2) * s, 0, TAU);
        g.fill();
      };
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // (its presence: a wide dim haze darker than the sky round it)
    g.strokeStyle = g.fillStyle = rgba(dark, a * 0.18);
    bodies(0, 0, 0.22);
    // (the rim: the body in light, up and to the left, then the dark body over it leaves a sliver)
    // (fading towards its feet like the body over it)
    g.globalCompositeOperation = 'lighter';
    const ra = a * (0.55 + 0.3 * mf.snare),
      lit = g.createLinearGradient(0, p.floor - 2 * s, 0, p.floor);
    lit.addColorStop(0, rgba(rim, ra));
    lit.addColorStop(0.5, rgba(rim, ra * 0.8));
    lit.addColorStop(1, rgba(rim, ra * 0.15));
    g.strokeStyle = g.fillStyle = lit;
    bodies(-0.018 * s, -0.022 * s, 0.01);
    g.globalCompositeOperation = 'source-over';
    // (the body: one solid silhouette drawn apart and laid over the sky see-through, darkest at the head and thinning
    // towards its feet, so the run in front of its legs always reads; drawn straight onto the sky its overlapping
    // bones would show as darker blots at every joint)
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    for (let k = 0; k < J_N; k++) {
      const [x, y] = P(k);
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    const pad = 0.25 * s;
    x0 = Math.floor(Math.min(x0, hx) - pad);
    y0 = Math.floor(Math.min(y0, hy) - pad);
    const w = Math.ceil(Math.max(x1, hx) + pad - x0),
      h = Math.ceil(Math.max(y1, hy) + pad - y0);
    if (!SIL.c) SIL.c = document.createElement('canvas');
    if (SIL.c.width < w || SIL.c.height < h) Object.assign(SIL.c, { width: Math.max(SIL.c.width, w), height: Math.max(SIL.c.height, h) });
    const x = SIL.c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, w, h);
    x.translate(-x0, -y0);
    x.lineCap = 'round';
    x.strokeStyle = x.fillStyle = dark;
    bodies(0, 0, 0, x);
    x.globalCompositeOperation = 'destination-in';
    const fade = x.createLinearGradient(0, p.floor - 2 * s, 0, p.floor);
    fade.addColorStop(0, 'rgba(0,0,0,0.92)');
    fade.addColorStop(0.55, 'rgba(0,0,0,0.78)');
    fade.addColorStop(1, 'rgba(0,0,0,0.3)');
    x.fillStyle = fade;
    x.fillRect(x0, y0, w, h);
    g.globalAlpha *= a;
    g.drawImage(SIL.c, 0, 0, w, h, x0, y0, w, h);
    g.globalAlpha /= a;
    // (the eyes: two slits that burn)
    g.globalCompositeOperation = 'lighter';
    const eye = mix(col, '#ffffff', 0.4),
      er = (0.05 + 0.05 * mf.kick) * s;
    for (const d of [-1, 1]) {
      const ex = hx + d * 0.055 * s,
        ey = hy + 0.01 * s;
      glowDot(g, ex, ey, er * 2.4, col, a);
      g.fillStyle = rgba(eye, a);
      g.beginPath();
      g.ellipse(ex, ey, 0.032 * s, 0.011 * s, d * 0.25, 0, TAU);
      g.fill();
    }
    p.hat(hx, hy, rgba(rim, a * 0.8));
    g.restore();
  },
});

// ribbons: the hands and feet leave long ribbons of light behind them as it dances (the last half second of where
// they were, kept in a small ring here), over a thin body
const TRAIL = 22,
  ENDS = [JI.haL, JI.haR, JI.ftL, JI.ftR];
const trail = { t: -1, pts: [] };
registerPart({
  id: 'ribbons',
  slot: 'performer',
  media: ['air', 'space', 'water'],
  tags: ['party', 'fantasy', 'warm'],
  mood: [0.7, 0.75, 0.3],
  draw(f, p) {
    const { g, t, mf, T } = f,
      { P, s, a, col } = p;
    // (a new run, a seek back or a long gap starts the ribbons afresh)
    if (t < trail.t || t - trail.t > 0.3) trail.pts.length = 0;
    if (t - trail.t >= 1 / 45 || !trail.pts.length) {
      trail.pts.push(ENDS.map(k => P(k)));
      if (trail.pts.length > TRAIL) trail.pts.shift();
      trail.t = t;
    }
    const pts = trail.pts,
      n = pts.length,
      cols = [col, col, T.line, T.line];
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // (a ribbon: a strip that is widest at the limb and thins and fades into the past)
    for (let e = 0; e < ENDS.length; e++) {
      for (let i = 1; i < n; i++) {
        const u0 = (i - 1) / (n - 1),
          u1 = i / (n - 1),
          [x0, y0] = pts[i - 1][e],
          [x1, y1] = pts[i][e],
          len = Math.hypot(x1 - x0, y1 - y0) || 1,
          nx = -(y1 - y0) / len,
          ny = (x1 - x0) / len,
          w0 = (0.01 + 0.07 * u0) * s * (1 + 0.5 * mf.bass),
          w1 = (0.01 + 0.07 * u1) * s * (1 + 0.5 * mf.bass);
        g.fillStyle = rgba(cols[e], a * (0.08 + 0.5 * u1 * u1));
        g.beginPath();
        g.moveTo(x0 + nx * w0, y0 + ny * w0);
        g.lineTo(x1 + nx * w1, y1 + ny * w1);
        g.lineTo(x1 - nx * w1, y1 - ny * w1);
        g.lineTo(x0 - nx * w0, y0 - ny * w0);
        g.fill();
      }
      // (and a bright edge thread down the middle)
      g.strokeStyle = rgba(mix(cols[e], '#ffffff', 0.6), a * 0.7);
      g.lineWidth = Math.max(1, 0.01 * s);
      g.beginPath();
      for (let i = 0; i < n; i++) (i ? g.lineTo : g.moveTo).apply(g, pts[i][e]);
      g.stroke();
    }
    // (the thin body)
    for (const [w, al] of [
      [0.08, 0.2],
      [0.025, 0.9],
    ]) {
      g.strokeStyle = rgba(col, a * al);
      g.lineWidth = w * s;
      bonesPath(g, P);
      g.stroke();
    }
    const [hx, hy] = headAt(p);
    g.strokeStyle = rgba(col, a * 0.9);
    g.lineWidth = 0.025 * s;
    g.beginPath();
    g.arc(hx, hy, 0.13 * s, 0, TAU);
    g.stroke();
    for (const k of ENDS) {
      const [x, y] = P(k);
      glowDot(g, x, y, 0.12 * s, col, a * 0.7);
    }
    p.hat(hx, hy, rgba(col, a));
    g.restore();
  },
});

// xray: the dancer seen through, its skeleton glowing like a film on a light box: long bones with knobby ends, a
// spine of vertebrae, a ribcage, a pelvis and a skull with dark sockets, inside a faint ghost of the flesh; the film
// jumps brighter on the snare
registerPart({
  id: 'xray',
  slot: 'performer',
  media: ['air', 'space', 'water'],
  tags: ['gothic', 'tech', 'cold'],
  mood: [0.55, 0.3, 0.55],
  draw(f, p) {
    const { g, mf } = f,
      { P, s, col } = p,
      a = p.a * (0.85 + 0.3 * mf.snare),
      bone = mix(col, '#ffffff', 0.55),
      [hx, hy] = headAt(p),
      lw = Math.max(1, 0.014 * s);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // (the flesh: a faint ghost of the body round the bones)
    g.strokeStyle = rgba(col, a * 0.1);
    for (let b = 0; b < NB; b++) {
      const [p0, p1] = BONES[b],
        [x0, y0] = P(p0),
        [x1, y1] = P(p1);
      g.lineWidth = THICK[b] * 1.1 * s;
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
    }
    g.fillStyle = rgba(col, a * 0.1);
    g.beginPath();
    g.arc(hx, hy, 0.17 * s, 0, TAU);
    g.fill();
    g.strokeStyle = rgba(bone, a * 0.9);
    g.fillStyle = rgba(bone, a * 0.3);
    g.lineWidth = lw;
    // (the long bones: waisted shafts with two knobs at each end)
    for (let b = 0; b < NB; b++) {
      const [p0, p1] = BONES[b];
      if (b < 4 || b === 6 || b === 9 || b === 13 || p1 === JI.toL || p1 === JI.toR) continue;
      const [x0, y0] = P(p0),
        [x1, y1] = P(p1),
        len = Math.hypot(x1 - x0, y1 - y0) || 1,
        nx = -(y1 - y0) / len,
        ny = (x1 - x0) / len,
        dx = (x1 - x0) / len,
        dy = (y1 - y0) / len,
        w = 0.022 * s,
        k = 0.03 * s,
        ax = x0 + dx * k,
        ay = y0 + dy * k,
        bx = x1 - dx * k,
        by = y1 - dy * k,
        mx = (ax + bx) / 2,
        my = (ay + by) / 2;
      g.beginPath();
      g.moveTo(ax + nx * w, ay + ny * w);
      g.quadraticCurveTo(mx + nx * w * 0.45, my + ny * w * 0.45, bx + nx * w, by + ny * w);
      g.lineTo(bx - nx * w, by - ny * w);
      g.quadraticCurveTo(mx - nx * w * 0.45, my - ny * w * 0.45, ax - nx * w, ay - ny * w);
      g.closePath();
      g.fill();
      g.stroke();
      for (const [ex, ey] of [
        [ax, ay],
        [bx, by],
      ])
        for (const d of [-1, 1]) {
          g.beginPath();
          g.arc(ex + nx * w * d * 0.9, ey + ny * w * d * 0.9, w * 0.85, 0, TAU);
          g.fill();
          g.stroke();
        }
    }
    // (the collarbones and the hips' sockets: plain lines)
    g.beginPath();
    for (const [p0, p1] of [BONES[3], BONES[6]]) {
      const [x0, y0] = P(p0),
        [x1, y1] = P(p1);
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
    }
    g.stroke();
    // (the spine: vertebrae from the hips up to the neck)
    const [hpx, hpy] = P(JI.hips),
      [chx, chy] = P(JI.chest),
      [nkx, nky] = P(JI.neck);
    for (let i = 0; i <= 12; i++) {
      const u = i / 12,
        [x, y] = u < 0.6 ? [hpx + (chx - hpx) * (u / 0.6), hpy + (chy - hpy) * (u / 0.6)] : [chx + (nkx - chx) * ((u - 0.6) / 0.4), chy + (nky - chy) * ((u - 0.6) / 0.4)];
      g.beginPath();
      g.ellipse(x, y, 0.024 * s, 0.011 * s, Math.atan2(nky - hpy, nkx - hpx) + Math.PI / 2, 0, TAU);
      g.fill();
      g.stroke();
    }
    // (the ribcage: pairs of ribs curving out from the spine and down, seen from the front, shortest at the top)
    const len = Math.hypot(nkx - hpx, nky - hpy) || 1,
      ux = (nkx - hpx) / len,
      uy = (nky - hpy) / len;
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      const u = 0.42 + i * 0.11,
        x = hpx + (nkx - hpx) * u,
        y = hpy + (nky - hpy) * u,
        rw = (0.15 - 0.016 * i) * s,
        dn = 0.09 * s;
      for (const d of [-1, 1]) {
        const ox = -uy * d,
          oy = ux * d;
        g.moveTo(x, y);
        g.quadraticCurveTo(x + ox * rw * 1.1 + ux * 0.02 * s, y + oy * rw * 1.1 + uy * 0.02 * s, x + ox * rw * 0.8 - ux * dn, y + oy * rw * 0.8 - uy * dn);
      }
    }
    g.stroke();
    // (the pelvis: a bowl round the hips)
    const [lx, ly] = P(JI.hiL),
      [rx, ry] = P(JI.hiR);
    g.beginPath();
    g.moveTo(lx, ly);
    g.quadraticCurveTo(hpx - ux * 0.12 * s, hpy - uy * 0.12 * s, rx, ry);
    g.quadraticCurveTo(hpx + ux * 0.06 * s, hpy + uy * 0.06 * s, lx, ly);
    g.fill();
    g.stroke();
    // (the skull: the dome, the jaw, the sockets left dark)
    g.beginPath();
    g.arc(hx, hy - 0.01 * s, 0.13 * s, Math.PI * 0.85, Math.PI * 2.15);
    g.quadraticCurveTo(hx + 0.1 * s, hy + 0.15 * s, hx, hy + 0.16 * s);
    g.quadraticCurveTo(hx - 0.1 * s, hy + 0.15 * s, hx - 0.13 * s * Math.cos(Math.PI * 0.15), hy + 0.13 * s * Math.sin(Math.PI * 0.15) - 0.01 * s);
    g.fill();
    g.stroke();
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = rgba('#000000', a * 0.7);
    for (const d of [-1, 1]) {
      g.beginPath();
      g.ellipse(hx + d * 0.05 * s, hy + 0.02 * s, 0.035 * s, 0.03 * s, 0, 0, TAU);
      g.fill();
    }
    g.globalCompositeOperation = 'lighter';
    g.beginPath();
    for (let i = -2; i <= 2; i++) {
      g.moveTo(hx + i * 0.022 * s, hy + 0.1 * s);
      g.lineTo(hx + i * 0.022 * s, hy + 0.14 * s);
    }
    g.stroke();
    p.hat(hx, hy, rgba(bone, a));
    g.restore();
  },
});

// pixel: the dancer as an old arcade sprite, chunky cells along its bones on a coarse grid (its steps snapping cell
// by cell), a lighter shade on the cells that catch the light, scan lines through it, the grid pulsing on the kick
registerPart({
  id: 'pixel',
  slot: 'performer',
  // (the owner's least liked look, pixels and 8-bit: no longer picked for a world)
  retired: true,
  media: ['air', 'space', 'water'],
  tags: ['party', 'tech', 'urban'],
  mood: [0.65, 0.7, 0.4],
  draw(f, p) {
    const { g, mf, T } = f,
      { P, s, a, col } = p,
      c = Math.max(4, Math.round(0.065 * s)),
      cells = new Map(),
      put = (x, y, v) => {
        const k = Math.floor(x / c) * 65536 + Math.floor(y / c);
        cells.set(k, Math.max(cells.get(k) ?? 0, v));
      };
    for (let b = 0; b < NB; b++) {
      const [p0, p1] = BONES[b],
        [x0, y0] = P(p0),
        [x1, y1] = P(p1),
        n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (c * 0.5)) + 1,
        r = Math.max(c * 0.5, (THICK[b] * s) / 2.4);
      for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n,
          y = y0 + ((y1 - y0) * i) / n;
        for (let ox = -r; ox <= r; ox += c * 0.8) for (let oy = -r; oy <= r; oy += c * 0.8) if (ox * ox + oy * oy <= r * r) put(x + ox, y + oy, ox < 0 && oy < 0 ? 2 : 1);
      }
    }
    const [hx, hy] = headAt(p),
      hr = 0.15 * s;
    for (let ox = -hr; ox <= hr; ox += c * 0.8) for (let oy = -hr; oy <= hr; oy += c * 0.8) if (ox * ox + oy * oy <= hr * hr) put(hx + ox, hy + oy, ox < -hr * 0.2 && oy < -hr * 0.2 ? 2 : 1);
    g.save();
    g.globalCompositeOperation = 'lighter';
    const lite = mix(col, '#ffffff', 0.5),
      gap = mf.kick > 0.5 ? 2 : 1;
    for (const [k, v] of cells) {
      const X = Math.floor(k / 65536) * c,
        Y = (k % 65536) * c,
        row = Math.floor(Y / c);
      g.fillStyle = rgba(v === 2 ? lite : col, a * (row % 2 ? 0.7 : 1));
      g.fillRect(X, Y, c - gap, c - gap);
    }
    // (the eyes: two dark-gap cells lit in T.line)
    g.fillStyle = rgba(T.line, a);
    for (const d of [-1, 1]) g.fillRect(Math.floor((hx + d * 0.06 * s) / c) * c, Math.floor(hy / c) * c, c - gap, c - gap);
    p.hat(hx, hy, rgba(lite, a));
    g.restore();
  },
});

// mirror: a kaleidoscope pair, the dancer and its mirror image facing each other across a seam of light at its
// centre, each half see-through, the seam flashing on the downbeats
registerPart({
  id: 'mirror',
  slot: 'performer',
  media: ['air', 'space', 'water'],
  tags: ['modern', 'fantasy', 'neon'],
  mood: [0.55, 0.6, 0.35],
  draw(f, p) {
    const { g, mf, T } = f,
      { J, s, a, cx, floor, col } = p,
      off = 0.38 * s;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    for (const [d, c] of [
      [1, col],
      [-1, T.line],
    ]) {
      const Q = k => [cx + d * (off + J[k * 2] * s), floor - J[k * 2 + 1] * s];
      for (const [w, al] of [
        [0.15, 0.18],
        [0.045, 0.75],
      ]) {
        g.strokeStyle = rgba(c, a * al);
        g.lineWidth = w * s;
        bonesPath(g, Q);
        g.stroke();
      }
      const [hx, hy] = Q(JI.head);
      glowDot(g, hx, hy - 0.08 * s, 0.22 * s, c, a * 0.75);
      p.hat(hx, hy - 0.08 * s, rgba(c, a * 0.75));
    }
    // (the seam: a tall thin diamond of light between them)
    const top = floor - 2.1 * s,
      bot = floor + 0.1 * s,
      mid = (top + bot) / 2,
      w = (0.012 + 0.03 * mf.down) * s,
      gr = g.createLinearGradient(0, top, 0, bot);
    gr.addColorStop(0, rgba(T.line, 0));
    gr.addColorStop(0.5, rgba(mix(T.line, '#ffffff', 0.5), a * (0.5 + 0.5 * mf.down)));
    gr.addColorStop(1, rgba(T.line, 0));
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(cx, top);
    g.lineTo(cx + w, mid);
    g.lineTo(cx, bot);
    g.lineTo(cx - w, mid);
    g.fill();
    g.restore();
  },
});

// lightning: every bone an electric arc, jagged anew a dozen times a second, a white-hot core in a coloured glow,
// sparks at the joints, and on the snare the whole figure flashes and throws off forks
registerPart({
  id: 'lightning',
  slot: 'performer',
  media: ['air', 'space', 'water'],
  tags: ['industrial', 'hot', 'future'],
  mood: [0.85, 0.35, 0.85],
  draw(f, p) {
    const { g, mf, t } = f,
      { P, s, col } = p,
      flash = mf.snare,
      a = Math.min(1, p.a * (0.8 + 0.6 * flash)),
      seed = Math.floor(t * 12),
      core = mix(col, '#ffffff', 0.8),
      [hx, hy] = headAt(p),
      arcs = [],
      jag = (x0, y0, x1, y1, n, amp, salt) => {
        const len = Math.hypot(x1 - x0, y1 - y0) || 1,
          nx = -(y1 - y0) / len,
          ny = (x1 - x0) / len,
          pts = [[x0, y0]];
        for (let i = 1; i < n; i++) {
          const u = i / n,
            o = (hash(seed * 131 + salt, i) - 0.5) * amp * Math.sin(u * Math.PI) * 2;
          pts.push([x0 + (x1 - x0) * u + nx * o, y0 + (y1 - y0) * u + ny * o]);
        }
        pts.push([x1, y1]);
        return pts;
      };
    for (let b = 0; b < NB; b++) {
      const [p0, p1] = BONES[b],
        [x0, y0] = P(p0),
        [x1, y1] = P(p1),
        len = Math.hypot(x1 - x0, y1 - y0);
      arcs.push(jag(x0, y0, x1, y1, Math.max(2, Math.round(len / (0.06 * s))), 0.05 * s, b));
      // (a fork off the middle of a bone on the snare, or now and then)
      if (flash > 0.3 || hash(seed, b + 50) > 0.85) {
        const m = arcs[arcs.length - 1][Math.floor(arcs[arcs.length - 1].length / 2)],
          an = hash(seed, b + 90) * TAU,
          r = (0.12 + 0.2 * hash(seed, b + 70)) * s;
        arcs.push(jag(m[0], m[1], m[0] + Math.cos(an) * r, m[1] + Math.sin(an) * r, 4, 0.04 * s, b + 30));
      }
    }
    // (the head: a crackling ring of arcs)
    const ring = [];
    for (let i = 0; i <= 10; i++) {
      const th = (i / 10) * TAU,
        rr = (0.14 + 0.03 * (hash(seed, i + 200) - 0.5)) * s;
      ring.push([hx + Math.cos(th) * rr, hy + Math.sin(th) * rr]);
    }
    arcs.push(ring);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    g.lineJoin = 'miter';
    for (const [w, al, c] of [
      [0.14, 0.12 + 0.15 * flash, col],
      [0.045, 0.5, col],
      [0.014, 1, core],
    ]) {
      g.strokeStyle = rgba(c, a * al);
      g.lineWidth = Math.max(1, w * s);
      g.beginPath();
      for (const pts of arcs) {
        g.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      }
      g.stroke();
    }
    for (const k of [JI.haL, JI.haR, JI.ftL, JI.ftR, JI.elL, JI.elR, JI.knL, JI.knR]) {
      const [x, y] = P(k);
      glowDot(g, x, y, (0.06 + 0.1 * flash) * s * (0.6 + 0.8 * hash(seed, k)), core, a);
    }
    // (the flash: the whole sky round it lit for an instant)
    if (flash > 0.5) glowDot(g, p.cx, p.floor - 1 * s, 1.4 * s, col, a * 0.25 * flash);
    p.hat(hx, hy, rgba(core, a));
    g.restore();
  },
});
