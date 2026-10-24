// (a pack of parts: see registry.js)
// The clones' outfits: each drawn over the white clone (layers/clones.js drawClone), round its head in the head's own
// frame (x forward the way it faces, y down the neck, one unit a head radius: it tilts and flips with the clone) and
// along its bones in screen pixels. Every piece has a black edge so it reads small on any sky, and none hides the white
// body it is to be kicked in. Each answers the music: lights flare on the kick, sparkle on the hat.
import { registerPart } from '../../registry.js';
import { JI } from '../../../lib/skeleton.js';
import { glowDot, rgba } from '../../../render/util.js';

// two hex colours mixed, as a hex colour (util's mixHex gives rgb(), which rgba() and a second mix cannot take)
function mixHex(a, b, u) {
  const p = parseInt(a.slice(1), 16),
    q = parseInt(b.slice(1), 16),
    c = sh => Math.round(((p >> sh) & 255) * (1 - u) + ((q >> sh) & 255) * u);
  return '#' + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1);
}

const INK = '#000000';
// the head's frame: origin at the head's centre, rotated so -y runs out of the neck through the head, x forward
function headFrame(f, p) {
  const { g, v } = f,
    J = p.J,
    nx = v.sx(J[JI.neck * 2]),
    ny = v.sy(J[JI.neck * 2 + 1]);
  // (half the neck's lean: a running clone pitches its head forward, and a hat tipped as far would look knocked off;
  // upside down in a ceiling act it leans about the other way up)
  let a = Math.atan2(p.cx - nx, -(p.cy - ny));
  a = Math.abs(a) < Math.PI / 2 ? a * 0.5 : Math.sign(a) * Math.PI + (a - Math.sign(a) * Math.PI) * 0.5;
  g.translate(p.cx, p.cy);
  g.rotate(a);
  g.scale(p.face * p.r, p.r);
}
// something drawn in the head's frame, the context saved round it
function onHead(f, p, draw) {
  f.g.save();
  headFrame(f, p);
  f.g.lineJoin = 'round';
  f.g.lineCap = 'round';
  draw(f.g);
  f.g.restore();
}
// a joint on screen
const P = (f, J, i) => [f.v.sx(J[i * 2]), f.v.sy(J[i * 2 + 1])];
// a filled shape with the black edge (lw in the current units)
function ink(g, fill, lw) {
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = lw;
  g.stroke();
}
// a line along points on screen: black under, colour over
function strip(g, pts, col, w, edge = 0.5) {
  for (const [c, lw] of [
    [INK, w + edge * 2],
    [col, w],
  ]) {
    g.strokeStyle = c;
    g.lineWidth = lw;
    g.beginPath();
    g.moveTo(...pts[0]);
    for (let i = 1; i < pts.length; i++) g.lineTo(...pts[i]);
    g.stroke();
  }
}
// a point a share u of the way from a to b
const at = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
// glowing eyes in the head's frame (drawn over its own white eyes: a mask or hood hides them)
function eyes(g, col, k, xs = [0.18, 0.62], y = -0.12, w = 0.2, h = 0.11) {
  glowDot(g, 0.4, y, 0.9 + 0.9 * k, col, 0.55 + 0.4 * k);
  g.fillStyle = col;
  for (const x of xs) {
    g.beginPath();
    g.ellipse(x, y, w, h * (1 + 0.6 * k), 0, 0, Math.PI * 2);
    g.fill();
  }
}
// the torso's shoulders and hips on screen, and its sideways unit (across the chest)
function torso(f, J) {
  const nk = P(f, J, JI.neck),
    hp = P(f, J, JI.hips),
    ch = P(f, J, JI.chest),
    d = Math.hypot(nk[0] - hp[0], nk[1] - hp[1]) || 1;
  return { nk, hp, ch, ux: (nk[0] - hp[0]) / d, uy: (nk[1] - hp[1]) / d, len: d };
}

// visor: a sci-fi helmet, a dome with a fin, a glowing visor strip across the eyes that sweeps on the hat
registerPart({
  id: 'visor',
  slot: 'clone',
  media: ['air', 'space'],
  tags: ['future', 'tech'],
  mood: [0.6, 0.5, 0.6],
  draw(f, p) {
    const { mf, T } = f,
      col = mixHex('#40f0ff', T.line, 0.3);
    onHead(f, p, g => {
      // (the shell: over the crown and down the back, open at the face)
      g.beginPath();
      g.moveTo(1.15, -0.05);
      g.bezierCurveTo(1.25, -1.2, -0.6, -1.55, -1.18, -0.5);
      g.lineTo(-1.15, 0.75);
      g.lineTo(-0.2, 0.9);
      g.lineTo(0.3, 0.45);
      g.lineTo(1.12, 0.38);
      g.closePath();
      ink(g, '#dfe6ee', 0.26);
      // (a dark panel line and the fin on top)
      g.beginPath();
      g.moveTo(-0.35, -1.18);
      g.lineTo(-0.9, -1.65);
      g.lineTo(0.15, -1.25);
      g.closePath();
      ink(g, '#2a3442', 0.2);
      g.strokeStyle = '#7d8a99';
      g.lineWidth = 0.12;
      g.beginPath();
      g.moveTo(-1.1, 0.25);
      g.lineTo(-0.3, 0.35);
      g.stroke();
      // (the visor strip: dark glass, its light flaring on the kick and a bright scan running across on the hat)
      g.beginPath();
      g.roundRect(-0.2, -0.38, 1.45, 0.48, 0.2);
      ink(g, '#0b1620', 0.22);
      glowDot(g, 0.6, -0.14, 1.2 + 1.2 * mf.kick, col, 0.5 + 0.5 * mf.kick);
      g.fillStyle = col;
      g.fillRect(-0.08, -0.22, 1.2, 0.16 + 0.1 * mf.kick);
      const sx = -0.1 + 1.2 * ((f.t * 2.2) % 1);
      g.fillStyle = rgba('#ffffff', 0.5 + 0.5 * mf.hat);
      g.fillRect(sx, -0.3, 0.14, 0.32);
    });
  },
});

// hood: a dark monk's hood over the head and shoulders, two eyes burning inside on the kick
registerPart({
  id: 'hood',
  slot: 'clone',
  media: ['air'],
  tags: ['gothic', 'ancient'],
  mood: [0.4, 0.25, 0.6],
  draw(f, p) {
    const { mf, T } = f,
      col = mixHex('#ff3b2e', T.win[0], 0.25),
      cloth = mixHex('#1c1626', T.near, 0.3);
    onHead(f, p, g => {
      // (the hood: a pointed cowl, its point flapping back a little with the beat)
      const tip = -0.25 * mf.beat;
      g.translate(-0.1, 0.05);
      g.scale(1.18, 1.18);
      g.beginPath();
      g.moveTo(1.05, 0.95);
      g.bezierCurveTo(1.55, -0.2, 1.0, -1.35, 0.0, -1.45);
      g.quadraticCurveTo(-1.2, -1.45, -1.9 + tip, -1.05);
      g.quadraticCurveTo(-1.45, -0.5, -1.4, 0.4);
      g.quadraticCurveTo(-1.25, 1.3, -0.4, 1.55);
      g.lineTo(0.55, 1.35);
      g.closePath();
      ink(g, cloth, 0.26);
      // (a pale lit edge just inside the black one, so the cowl's shape reads on a dark sky)
      g.strokeStyle = rgba(mixHex('#b9a8e0', T.line, 0.3), 0.6);
      g.lineWidth = 0.09;
      g.stroke();
      // (the dark opening where the face is)
      g.beginPath();
      g.ellipse(0.45, 0.0, 0.65, 0.82, 0.15, 0, Math.PI * 2);
      g.fillStyle = '#000000';
      g.fill();
      // (a fold line and a pale rim, so the cowl reads on a dark sky)
      g.strokeStyle = rgba('#ffffff', 0.35);
      g.lineWidth = 0.1;
      g.beginPath();
      g.moveTo(-0.15, -1.2);
      g.quadraticCurveTo(-0.6, -0.2, -0.45, 1.2);
      g.stroke();
      g.strokeStyle = mixHex('#9b8cc0', T.line, 0.3);
      g.lineWidth = 0.1;
      g.beginPath();
      g.ellipse(0.45, 0.0, 0.72, 0.89, 0.15, -1.9, 1.4);
      g.stroke();
      eyes(g, col, mf.kick, [0.25, 0.75], -0.1, 0.17, 0.08);
    });
  },
});

// mohawk: a tall spiky neon crest, the spikes jumping on the hat, its colour running along on the kick
registerPart({
  id: 'mohawk',
  slot: 'clone',
  media: ['air'],
  tags: ['neon', 'party', 'urban'],
  mood: [0.85, 0.6, 0.75],
  draw(f, p) {
    const { mf, T } = f,
      A = mixHex('#ff2bd6', T.hold, 0.2),
      B = mixHex('#2bffd5', T.line, 0.2);
    onHead(f, p, g => {
      // (five spikes along the crown, from the brow to the nape)
      const n = 5,
        pts = [];
      for (let i = 0; i <= n; i++) {
        const a = -0.15 - (i / n) * 2.5;
        pts.push([Math.cos(a), Math.sin(a)]);
      }
      g.beginPath();
      g.moveTo(pts[0][0] * 0.95, pts[0][1] * 0.95);
      for (let i = 0; i < n; i++) {
        const a0 = pts[i],
          a1 = pts[i + 1],
          am = [(a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2],
          dl = Math.hypot(am[0], am[1]),
          // (each spike its own length, jumping with the hat)
          h = 1.75 + 0.35 * Math.sin(i * 2.1) + 0.45 * mf.hat * ((i % 2) * 2 - 1) * 0.6 + 0.3 * mf.kick;
        g.lineTo((am[0] / dl) * h - 0.15 * (i / n), (am[1] / dl) * h);
        g.lineTo(a1[0] * 0.95, a1[1] * 0.95);
      }
      g.closePath();
      const gr = g.createLinearGradient(1, -1, -1, -1);
      gr.addColorStop(0, A);
      gr.addColorStop(1, B);
      ink(g, gr, 0.24);
      glowDot(g, 0, -1.4, 1.4 + 1.2 * mf.kick, A, 0.35 + 0.5 * mf.kick);
      // (shaved stripes on the side of the head, and a ring in the ear)
      g.strokeStyle = '#000000';
      g.lineWidth = 0.1;
      for (const y of [-0.35, -0.12]) {
        g.beginPath();
        g.moveTo(-0.75, y);
        g.lineTo(-0.2, y);
        g.stroke();
      }
      g.strokeStyle = '#ffd34a';
      g.lineWidth = 0.13;
      g.beginPath();
      g.arc(-0.1, 0.45, 0.17, 0, Math.PI * 2);
      g.stroke();
    });
  },
});

// gasmask: a rubber gas mask with round goggles and a filter can on each cheek, the goggles misting on the kick
registerPart({
  id: 'gasmask',
  slot: 'clone',
  media: ['air'],
  tags: ['industrial', 'hot'],
  mood: [0.6, 0.3, 0.8],
  draw(f, p) {
    const { mf, T } = f,
      col = mixHex('#ffb43a', T.win[0], 0.3),
      rub = mixHex('#7d8c5e', T.near, 0.1);
    onHead(f, p, g => {
      // (the strap round the back of the head)
      g.strokeStyle = INK;
      g.lineWidth = 0.42;
      g.beginPath();
      g.moveTo(0.2, -0.45);
      g.lineTo(-1.0, -0.2);
      g.moveTo(0.2, 0.3);
      g.lineTo(-0.95, 0.35);
      g.stroke();
      g.strokeStyle = '#5b5446';
      g.lineWidth = 0.2;
      g.stroke();
      // (the mask over the face)
      g.beginPath();
      g.moveTo(-0.05, -0.75);
      g.quadraticCurveTo(1.1, -0.85, 1.2, -0.05);
      g.quadraticCurveTo(1.25, 0.75, 0.55, 0.95);
      g.quadraticCurveTo(0.0, 0.95, -0.05, 0.3);
      g.closePath();
      ink(g, rub, 0.24);
      // (the filter: a can on the snout, ribbed, swinging down a little on the beat)
      g.save();
      g.translate(0.95, 0.6);
      g.rotate(0.6 + 0.12 * mf.beat);
      g.beginPath();
      g.roundRect(-0.32, -0.05, 0.64, 0.82, 0.12);
      ink(g, '#9a8e6a', 0.2);
      g.strokeStyle = INK;
      g.lineWidth = 0.08;
      for (const y of [0.25, 0.45, 0.65]) {
        g.beginPath();
        g.moveTo(-0.3, y);
        g.lineTo(0.3, y);
        g.stroke();
      }
      g.restore();
      // (the goggles: two round glasses glowing with the kick)
      for (const x of [0.25, 0.9]) {
        g.beginPath();
        g.arc(x, -0.22, 0.33, 0, Math.PI * 2);
        ink(g, '#c9c2a8', 0.18);
        g.beginPath();
        g.arc(x, -0.22, 0.21, 0, Math.PI * 2);
        g.fillStyle = rgba(col, 0.55 + 0.45 * mf.kick);
        g.fill();
      }
      glowDot(g, 0.6, -0.22, 0.9 + 0.8 * mf.kick, col, 0.3 + 0.5 * mf.kick);
    });
  },
});

// hardhat: a yellow hard hat with a lamp, and hi-vis stripes across the chest and down the legs that flash on the hat
registerPart({
  id: 'hardhat',
  slot: 'clone',
  media: ['air'],
  tags: ['industrial', 'modern'],
  mood: [0.5, 0.55, 0.6],
  draw(f, p) {
    const { g, mf } = f,
      J = p.J,
      vest = '#ff7a1a',
      flash = rgba('#e8ff3a', 0.75 + 0.25 * mf.hat),
      { nk, hp, ux, uy } = torso(f, J),
      w = 0.11 * p.m;
    g.save();
    g.lineCap = 'butt';
    // (the vest down the torso, under its two reflective bands)
    strip(g, [at(hp, nk, 0.1), at(hp, nk, 0.86)], vest, w, 0.04 * p.m);
    for (const u of [0.35, 0.62]) {
      const c = at(hp, nk, u),
        s = 0.11 * p.m;
      strip(g, [[c[0] - ux * s * 0.4, c[1] - uy * s * 0.4], [c[0] + ux * s * 0.4, c[1] + uy * s * 0.4]], flash, w * 1.15, 0.03 * p.m);
    }
    // (a reflective band round each shin)
    for (const [a, b] of [
      [JI.knL, JI.ftL],
      [JI.knR, JI.ftR],
    ]) {
      const A = P(f, J, a),
        B = P(f, J, b);
      strip(g, [at(A, B, 0.45), at(A, B, 0.62)], flash, 0.1 * p.m, 0.03 * p.m);
    }
    g.restore();
    onHead(f, p, g => {
      // (the hat: a dome with a ridge, a brim all round, a lamp at the front)
      g.beginPath();
      g.moveTo(-1.05, -0.2);
      g.bezierCurveTo(-1.05, -1.5, 1.05, -1.5, 1.05, -0.2);
      g.closePath();
      ink(g, '#ffcc1a', 0.24);
      g.strokeStyle = '#c98a00';
      g.lineWidth = 0.16;
      g.beginPath();
      g.moveTo(-0.1, -1.15);
      g.quadraticCurveTo(0.35, -0.75, 0.3, -0.25);
      g.stroke();
      g.beginPath();
      g.roundRect(-1.3, -0.32, 2.85, 0.28, 0.12);
      ink(g, '#ffcc1a', 0.22);
      g.beginPath();
      g.roundRect(0.7, -0.9, 0.38, 0.36, 0.08);
      ink(g, '#3a3a3a', 0.16);
      glowDot(g, 1.1, -0.72, 1.0 + 1.6 * mf.kick, '#fff3b0', 0.5 + 0.5 * mf.kick);
      g.fillStyle = '#fffbe0';
      g.beginPath();
      g.arc(1.05, -0.72, 0.12, 0, Math.PI * 2);
      g.fill();
    });
  },
});

// horns: curled red devil horns and a pointed tail that lashes on the beat, the horns' tips glowing on the kick
registerPart({
  id: 'horns',
  slot: 'clone',
  media: ['air'],
  tags: ['gothic', 'hot'],
  mood: [0.8, 0.3, 0.8],
  draw(f, p) {
    const { g, mf, T, t } = f,
      J = p.J,
      red = mixHex('#e0142a', T.hold, 0.15),
      hp = P(f, J, JI.hips),
      m = p.m,
      // (back is away from where it faces; the tail swings with the beat)
      bx = -p.face,
      sw = Math.sin(t * 6) * 0.15 + 0.25 * mf.beat;
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      pts.push([hp[0] + bx * m * (0.1 + 0.55 * u), hp[1] + m * (0.02 - 0.5 * u * u + Math.sin(u * 3 + t * 5) * 0.08 * u - sw * u)]);
    }
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    strip(g, pts, red, 0.055 * m, 0.03 * m);
    // (the spade at the tail's tip)
    const [ex, ey] = pts[8],
      [qx, qy] = pts[7],
      a = Math.atan2(ey - qy, ex - qx);
    g.translate(ex, ey);
    g.rotate(a);
    g.beginPath();
    g.moveTo(0.16 * m, 0);
    g.lineTo(-0.02 * m, -0.1 * m);
    g.lineTo(0.02 * m, 0);
    g.lineTo(-0.02 * m, 0.1 * m);
    g.closePath();
    ink(g, red, 0.025 * m);
    g.restore();
    onHead(f, p, g => {
      // (two horns curling up and out from the brow, the far one smaller and darker)
      for (const [x, s, c] of [
        [-0.5, 1.1, mixHex(red, '#000000', 0.35)],
        [0.35, 1.35, red],
      ]) {
        g.save();
        g.translate(x, -0.8);
        g.scale(s, s);
        g.beginPath();
        g.moveTo(-0.32, 0.2);
        g.quadraticCurveTo(-0.35, -0.6, 0.35, -1.25);
        g.quadraticCurveTo(0.0, -0.55, 0.3, 0.1);
        g.closePath();
        ink(g, c, 0.22);
        g.restore();
      }
      glowDot(g, 0.8, -2.45, 0.8 + 1.2 * mf.kick, '#ff6a2a', 0.3 + 0.6 * mf.kick);
      // (a sly red pupil in each eye)
      eyes(g, '#ff2a2a', mf.kick, [0.18, 0.62], -0.12, 0.12, 0.09);
    });
  },
});

// crown: a little gold crown tipped to one side, jewels twinkling on the hat, bouncing up off the head on the kick
registerPart({
  id: 'crown',
  slot: 'clone',
  media: ['air', 'space'],
  tags: ['party', 'fantasy'],
  mood: [0.65, 0.85, 0.4],
  draw(f, p) {
    const { mf, T } = f,
      gold = '#ffc928',
      jewel = [mixHex('#ff2b6a', T.hold, 0.2), mixHex('#2bc7ff', T.line, 0.2), '#3aff7a'];
    onHead(f, p, g => {
      g.translate(-0.05, -1.05 - 0.3 * mf.kick);
      g.rotate(-0.22);
      g.scale(1.35, 1.35);
      // (the band and five points, a ball on each)
      g.beginPath();
      g.moveTo(-0.85, 0.3);
      g.lineTo(-0.95, -0.55);
      g.lineTo(-0.5, -0.15);
      g.lineTo(-0.25, -0.75);
      g.lineTo(0.0, -0.18);
      g.lineTo(0.25, -0.75);
      g.lineTo(0.5, -0.15);
      g.lineTo(0.95, -0.55);
      g.lineTo(0.85, 0.3);
      g.closePath();
      ink(g, gold, 0.22);
      g.fillStyle = '#b07a00';
      g.fillRect(-0.85, 0.05, 1.7, 0.12);
      for (const x of [-0.95, -0.25, 0.25, 0.95]) {
        g.beginPath();
        g.arc(x, x * x > 0.5 ? -0.6 : -0.8, 0.13, 0, Math.PI * 2);
        ink(g, '#fff0a8', 0.1);
      }
      for (let i = 0; i < 3; i++) {
        const x = -0.5 + i * 0.5;
        g.beginPath();
        g.arc(x, 0.02, 0.14, 0, Math.PI * 2);
        ink(g, jewel[i], 0.08);
      }
      // (a twinkle on the hat, hopping from point to point on each beat)
      const k = Math.floor(f.t / (f.L?.A?.beat || 0.5)) % 4,
        x = [-0.95, -0.25, 0.25, 0.95][k];
      glowDot(g, x, -0.7, 0.7 + 1.2 * mf.hat, '#fff6c0', 0.4 + 0.6 * mf.hat);
    });
  },
});

// antlers: branching antlers with leaves on the tines, the leaves fluttering on the hat, a green glow on the kick
registerPart({
  id: 'antlers',
  slot: 'clone',
  media: ['air'],
  tags: ['nature', 'ancient'],
  mood: [0.35, 0.6, 0.35],
  draw(f, p) {
    const { mf, T, t } = f,
      bone = '#d9b98a',
      leaf = mixHex('#46d65a', T.line, 0.15);
    onHead(f, p, g => {
      // (an antler: a beam curving out and up, three tines rising off it, a leaf on each; dir: forward or back)
      const antler = (x, s, dir, dark) => {
        g.save();
        g.translate(x, -0.8);
        g.scale(s * dir, s);
        const beam = [
            [0, 0],
            [0.3, -0.7],
            [0.9, -1.3],
            [1.6, -1.6],
          ],
          tines = [
            [[0.25, -0.6], [-0.05, -1.4]],
            [[0.75, -1.2], [0.6, -2.05]],
            [[1.25, -1.47], [1.4, -2.25]],
          ];
        for (const [c, lw] of [
          [INK, 0.52],
          [dark ? mixHex(bone, '#000000', 0.3) : bone, 0.28],
        ]) {
          g.strokeStyle = c;
          g.lineWidth = lw;
          g.beginPath();
          g.moveTo(...beam[0]);
          for (const q of beam.slice(1)) g.lineTo(...q);
          for (const [a, b] of tines) {
            g.moveTo(...a);
            g.lineTo(...b);
          }
          g.stroke();
        }
        // (leaves on the tips, fluttering on the hat)
        [...tines.map(([, b]) => b), beam[3]].forEach((b, i) => {
          g.save();
          g.translate(...b);
          g.rotate(-1.2 + 0.5 * i + 0.35 * Math.sin(t * 7 + i) * (0.4 + mf.hat));
          g.beginPath();
          g.ellipse(0.3, 0, 0.34, 0.16, 0, 0, Math.PI * 2);
          ink(g, dark ? mixHex(leaf, '#000000', 0.3) : leaf, 0.12);
          g.restore();
        });
        g.restore();
      };
      antler(-0.3, 0.85, -1, true);
      antler(0.2, 1.0, 1, false);
      glowDot(g, 0, -1.8, 1.3 + 1.2 * mf.kick, leaf, 0.2 + 0.5 * mf.kick);
    });
  },
});

// oni: a red oni mask over the face, fangs, gold eyes and two horns, its eyes blazing on the kick
registerPart({
  id: 'oni',
  slot: 'clone',
  media: ['air'],
  tags: ['ancient', 'neon'],
  mood: [0.75, 0.3, 0.85],
  draw(f, p) {
    const { mf, T } = f,
      red = mixHex('#d8162a', T.hold, 0.1),
      gold = '#ffd23a';
    onHead(f, p, g => {
      // (two short thick horns from the mask's brow)
      for (const [x, s] of [
        [-0.05, 0.8],
        [0.75, 1],
      ]) {
        g.beginPath();
        g.moveTo(x - 0.22 * s, -0.75);
        g.quadraticCurveTo(x - 0.05 * s, -1.4 * s, x + 0.25 * s, -1.6 * s);
        g.quadraticCurveTo(x + 0.15 * s, -1.1, x + 0.22 * s, -0.75);
        g.closePath();
        ink(g, gold, 0.18);
      }
      // (the mask: the face's half, a heavy brow, a wide jaw)
      g.beginPath();
      g.moveTo(-0.25, -0.95);
      g.quadraticCurveTo(0.9, -1.15, 1.25, -0.35);
      g.lineTo(1.3, 0.35);
      g.quadraticCurveTo(1.1, 1.15, 0.2, 1.05);
      g.quadraticCurveTo(-0.3, 0.6, -0.25, -0.95);
      g.closePath();
      ink(g, red, 0.24);
      // (the scowling brow)
      g.strokeStyle = INK;
      g.lineWidth = 0.2;
      g.beginPath();
      g.moveTo(0.05, -0.55);
      g.lineTo(0.5, -0.32);
      g.lineTo(1.1, -0.6);
      g.stroke();
      // (the mouth: a black grin with fangs, opening on the kick)
      const o = 0.12 + 0.18 * mf.kick;
      g.beginPath();
      g.moveTo(0.15, 0.4);
      g.quadraticCurveTo(0.7, 0.55 + o, 1.2, 0.35);
      g.quadraticCurveTo(0.7, 0.3 + 2 * o, 0.15, 0.4);
      g.fillStyle = INK;
      g.fill();
      g.fillStyle = '#ffffff';
      for (const [x, d] of [
        [0.35, 1],
        [0.95, 1],
      ]) {
        g.beginPath();
        g.moveTo(x - 0.09, 0.44);
        g.lineTo(x, 0.44 + 0.3 * d);
        g.lineTo(x + 0.09, 0.44);
        g.closePath();
        g.fill();
      }
      eyes(g, gold, mf.kick, [0.3, 0.85], -0.18, 0.17, 0.1);
    });
  },
});

// headphones: big over-ear headphones with a band, a cable glowing down to the hip, the cups pulsing on the kick
registerPart({
  id: 'headphones',
  slot: 'clone',
  media: ['air', 'space'],
  tags: ['party', 'modern'],
  mood: [0.7, 0.75, 0.5],
  draw(f, p) {
    const { g, mf, T, t } = f,
      J = p.J,
      col = mixHex('#ff3ad0', T.line, 0.35),
      m = p.m,
      hp = P(f, J, JI.hips),
      ch = P(f, J, JI.chest);
    // (the cable: from behind the head to a player at the hip, a pulse of light running down it on every beat)
    const ear = [p.cx - p.face * p.r * 0.2, p.cy + p.r * 0.6],
      mid = [(ch[0] - p.face * 0.12 * m + ear[0]) / 2 - p.face * 0.1 * m, ch[1]],
      end = [hp[0] - p.face * 0.08 * m, hp[1]];
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    strip(g, [ear, mid, end], col, 0.03 * m, 0.02 * m);
    const u = (t / (f.L?.A?.beat || 0.5)) % 1,
      q = u < 0.5 ? at(ear, mid, u * 2) : at(mid, end, u * 2 - 1);
    glowDot(g, q[0], q[1], 0.07 * m, '#ffffff', 0.9);
    g.beginPath();
    g.roundRect(end[0] - 0.06 * m, end[1] - 0.09 * m, 0.12 * m, 0.18 * m, 0.02 * m);
    ink(g, '#22222a', 0.02 * m);
    g.restore();
    onHead(f, p, g => {
      // (the band over the crown)
      for (const [c, lw] of [
        [INK, 0.6],
        ['#3a3a48', 0.34],
        [mixHex(col, '#ffffff', 0.25), 0.12],
      ]) {
        g.strokeStyle = c;
        g.lineWidth = lw;
        g.beginPath();
        g.arc(0, 0, 1.2, Math.PI * 1.05, Math.PI * 1.95);
        g.stroke();
      }
      // (the cup on the near ear: big, its ring lit with the kick)
      const s = 1 + 0.12 * mf.kick;
      g.save();
      g.translate(-0.15, 0.05);
      g.scale(s, s);
      g.beginPath();
      g.roundRect(-0.48, -0.62, 0.96, 1.24, 0.42);
      ink(g, '#3a3a48', 0.24);
      g.beginPath();
      g.roundRect(-0.3, -0.42, 0.6, 0.84, 0.28);
      g.fillStyle = col;
      g.fill();
      g.fillStyle = rgba('#ffffff', 0.3 + 0.6 * mf.kick);
      g.beginPath();
      g.arc(0, 0, 0.14, 0, Math.PI * 2);
      g.fill();
      g.restore();
      glowDot(g, -0.15, 0.05, 1.0 + 1.3 * mf.kick, col, 0.35 + 0.55 * mf.kick);
    });
  },
});

// astronaut: a glass bubble helmet with a bright reflection and a collar ring, a white pack on the back, a beacon on
// the collar blinking on the hat
registerPart({
  id: 'astronaut',
  slot: 'clone',
  media: ['air', 'space'],
  tags: ['future', 'cold'],
  mood: [0.4, 0.6, 0.35],
  draw(f, p) {
    const { g, mf, T } = f,
      J = p.J,
      m = p.m,
      { nk, hp, ux, uy } = torso(f, J);
    // (the life-support pack on the back: a box beside the torso, behind it)
    const c = at(hp, nk, 0.62),
      bx = -p.face * 0.1 * m;
    g.save();
    g.translate(c[0] + bx, c[1]);
    g.rotate(Math.atan2(uy, ux) + Math.PI / 2);
    g.beginPath();
    g.roundRect(-0.09 * m, -0.2 * m, 0.18 * m, 0.4 * m, 0.04 * m);
    ink(g, '#e8ecf2', 0.025 * m);
    g.fillStyle = '#c23a3a';
    g.fillRect(-0.04 * m, -0.12 * m, 0.08 * m, 0.05 * m);
    g.restore();
    onHead(f, p, g => {
      // (the collar ring under the bubble)
      g.beginPath();
      g.roundRect(-1.05, 0.95, 2.1, 0.42, 0.18);
      ink(g, '#d9dee6', 0.22);
      // (the bubble: tinted glass, the head seen through it, a soft rim of the sky's light)
      g.beginPath();
      g.arc(0.05, -0.05, 1.55, 0, Math.PI * 2);
      g.fillStyle = rgba(mixHex('#9fdcff', T.sky[2], 0.3), 0.22);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 0.3;
      g.stroke();
      g.strokeStyle = rgba('#ffffff', 0.85);
      g.lineWidth = 0.13;
      g.stroke();
      // (the reflection: a curved window of light across the glass, brighter on the kick)
      g.beginPath();
      g.arc(0.05, -0.05, 1.22, -2.5, -1.45);
      g.strokeStyle = rgba('#ffffff', 0.7 + 0.3 * mf.kick);
      g.lineWidth = 0.22;
      g.stroke();
      g.beginPath();
      g.arc(-0.62, -0.92, 0.11, 0, Math.PI * 2);
      g.fillStyle = '#ffffff';
      g.fill();
      // (the beacon on the collar)
      glowDot(g, 0.8, 1.15, 0.7 + 1.0 * mf.hat, '#ff4040', 0.4 + 0.6 * mf.hat);
      g.beginPath();
      g.arc(0.8, 1.15, 0.13, 0, Math.PI * 2);
      g.fillStyle = mf.hat > 0.3 ? '#ffd0d0' : '#ff4040';
      g.fill();
    });
  },
});

// diver: a brass diving helmet, a round porthole at the face with a grille, bolts round the collar, a bubble trail
// rising from the valve on the beat
registerPart({
  id: 'diver',
  slot: 'clone',
  media: ['water'],
  tags: ['nature', 'ancient'],
  mood: [0.35, 0.5, 0.55],
  draw(f, p) {
    const { mf, T, t } = f,
      brass = '#d49a3a',
      dark = '#8a5a1a';
    onHead(f, p, g => {
      // (the collar plate)
      g.beginPath();
      g.moveTo(-1.35, 1.0);
      g.quadraticCurveTo(0, 0.6, 1.35, 1.0);
      g.lineTo(1.2, 1.45);
      g.quadraticCurveTo(0, 1.2, -1.2, 1.45);
      g.closePath();
      ink(g, dark, 0.22);
      // (the dome)
      g.beginPath();
      g.arc(0, -0.05, 1.32, 0, Math.PI * 2);
      const gr = g.createRadialGradient(-0.4, -0.6, 0.1, 0, 0, 1.4);
      gr.addColorStop(0, '#ffe2a0');
      gr.addColorStop(0.5, brass);
      gr.addColorStop(1, dark);
      ink(g, gr, 0.26);
      // (bolts round the collar)
      g.fillStyle = '#ffe8b0';
      for (const x of [-0.85, -0.3, 0.3, 0.85]) {
        g.beginPath();
        g.arc(x, 1.12 - 0.02 * x * x, 0.09, 0, Math.PI * 2);
        g.fill();
      }
      // (the valve on the back of the dome)
      g.beginPath();
      g.roundRect(-1.6, -0.7, 0.42, 0.3, 0.08);
      ink(g, brass, 0.14);
      // (the porthole at the face: a ring, glass, the eyes looking out through a cross grille)
      g.beginPath();
      g.arc(0.45, -0.05, 0.68, 0, Math.PI * 2);
      ink(g, '#ffd27a', 0.22);
      g.beginPath();
      g.arc(0.45, -0.05, 0.5, 0, Math.PI * 2);
      g.fillStyle = rgba(mixHex('#3fc6d8', T.sky[1], 0.3), 0.85);
      g.fill();
      eyes(g, '#e8fbff', mf.kick, [0.3, 0.62], -0.08, 0.1, 0.08);
      g.strokeStyle = dark;
      g.lineWidth = 0.1;
      g.beginPath();
      g.moveTo(-0.05, -0.05);
      g.lineTo(0.95, -0.05);
      g.moveTo(0.45, -0.55);
      g.lineTo(0.45, 0.45);
      g.stroke();
      g.beginPath();
      g.arc(0.25, -0.3, 0.12, 0, Math.PI * 2);
      g.fillStyle = rgba('#ffffff', 0.6 + 0.4 * mf.kick);
      g.fill();
      // (bubbles rising from the valve, a fresh one every beat)
      const B = f.L?.A?.beat || 0.5;
      for (let i = 0; i < 3; i++) {
        const u = ((t / B + i / 3) % 1),
          x = -1.4 + 0.25 * Math.sin(u * 9 + i),
          y = -0.9 - u * 2.6,
          rr = 0.12 + 0.12 * u;
        g.globalAlpha = 1 - u;
        g.beginPath();
        g.arc(x, y, rr, 0, Math.PI * 2);
        g.strokeStyle = '#ffffff';
        g.lineWidth = 0.08;
        g.stroke();
        g.globalAlpha = 1;
      }
    });
  },
});

// cyber: glowing circuit lines along the limbs with nodes at the joints, a pulse running down them on the kick, LED
// eyes in a dark band
registerPart({
  id: 'cyber',
  slot: 'clone',
  media: ['air', 'space'],
  tags: ['tech', 'neon', 'future'],
  mood: [0.75, 0.5, 0.7],
  draw(f, p) {
    const { g, mf, T, t } = f,
      J = p.J,
      m = p.m,
      col = mixHex('#2bf0ff', T.line, 0.3),
      hot = mixHex('#ff2bd0', T.hold, 0.2);
    // (a thin lit trace down each limb and the spine, a node at each joint)
    const chains = [
      [JI.neck, JI.chest, JI.hips],
      [JI.shL, JI.elL, JI.haL],
      [JI.shR, JI.elR, JI.haR],
      [JI.hiL, JI.knL, JI.ftL],
      [JI.hiR, JI.knR, JI.ftR],
    ];
    g.save();
    g.lineCap = 'round';
    g.strokeStyle = rgba(col, 0.75 + 0.25 * mf.kick);
    g.lineWidth = Math.max(1, 0.025 * m);
    g.beginPath();
    for (const c of chains) {
      const pts = c.map(i => P(f, J, i));
      g.moveTo(...pts[0]);
      for (const q of pts.slice(1)) g.lineTo(...q);
    }
    g.stroke();
    // (the pulse: a bright bead running down each trace, a beat from top to tip)
    const u = (t / (f.L?.A?.beat || 0.5)) % 1;
    for (const c of chains) {
      const pts = c.map(i => P(f, J, i)),
        k = u * (pts.length - 1),
        i = Math.min(pts.length - 2, Math.floor(k)),
        q = at(pts[i], pts[i + 1], k - i);
      glowDot(g, q[0], q[1], (0.1 + 0.08 * mf.kick) * m, col, 0.8);
      for (const n of pts) {
        g.beginPath();
        g.rect(n[0] - 0.025 * m, n[1] - 0.025 * m, 0.05 * m, 0.05 * m);
        g.fillStyle = mf.hat > 0.4 ? '#ffffff' : col;
        g.fill();
      }
    }
    g.restore();
    onHead(f, p, g => {
      // (a dark band across the eyes, two LEDs in it, a trace over the skull)
      g.beginPath();
      g.roundRect(-0.35, -0.42, 1.5, 0.48, 0.12);
      ink(g, '#0a0d14', 0.18);
      eyes(g, hot, mf.kick, [0.25, 0.75], -0.18, 0.16, 0.08);
      g.strokeStyle = col;
      g.lineWidth = 0.12;
      g.beginPath();
      g.moveTo(-0.35, -0.2);
      g.lineTo(-0.7, -0.2);
      g.lineTo(-0.7, -0.7);
      g.lineTo(-0.2, -0.95);
      g.stroke();
      g.fillStyle = col;
      g.fillRect(-0.3, -1.03, 0.16, 0.16);
      // (an antenna stub with a blinking tip on the hat)
      g.strokeStyle = INK;
      g.lineWidth = 0.14;
      g.beginPath();
      g.moveTo(-0.5, -0.85);
      g.lineTo(-0.85, -1.55);
      g.stroke();
      glowDot(g, -0.85, -1.55, 0.5 + 0.7 * mf.hat, hot, 0.5 + 0.5 * mf.hat);
    });
  },
});

// samurai: a black kabuto with a gold crest and flared neck guard, lacquered shoulder plates, the crest flashing on
// the kick
registerPart({
  id: 'samurai',
  slot: 'clone',
  media: ['air'],
  tags: ['ancient', 'warm'],
  mood: [0.6, 0.45, 0.8],
  draw(f, p) {
    const { g, mf, T } = f,
      J = p.J,
      m = p.m,
      lac = mixHex('#a01822', T.near, 0.15),
      shine = mixHex('#b4bcd4', T.line, 0.25),
      gold = '#ffcc33';
    // (the shoulder plates: stacked lacquered lames hanging off each shoulder)
    g.save();
    g.lineJoin = 'round';
    for (const [s, e] of [
      [JI.shL, JI.elL],
      [JI.shR, JI.elR],
    ]) {
      const A = P(f, J, s),
        B = P(f, J, e),
        a = Math.atan2(B[1] - A[1], B[0] - A[0]);
      g.save();
      g.translate(...A);
      g.rotate(a);
      for (let i = 0; i < 2; i++) {
        g.beginPath();
        g.roundRect(0.03 * m + i * 0.08 * m, -0.085 * m, 0.1 * m, 0.17 * m, 0.02 * m);
        ink(g, i % 2 ? mixHex(lac, '#000000', 0.25) : lac, 0.02 * m);
      }
      g.fillStyle = gold;
      g.fillRect(0.06 * m, -0.085 * m, 0.018 * m, 0.17 * m);
      g.restore();
    }
    g.restore();
    onHead(f, p, g => {
      // (the neck guard: flared lames fanning down the back and sides)
      g.beginPath();
      g.moveTo(-0.95, -0.3);
      g.lineTo(-1.75, 0.65);
      g.lineTo(-0.9, 1.0);
      g.lineTo(0.0, 0.5);
      g.lineTo(0.0, -0.1);
      g.closePath();
      ink(g, '#24242c', 0.22);
      g.strokeStyle = shine;
      g.lineWidth = 0.08;
      g.stroke();
      g.strokeStyle = lac;
      g.lineWidth = 0.1;
      for (const u of [0.35, 0.65]) {
        g.beginPath();
        g.moveTo(-0.95 - 0.8 * u, -0.3 + 0.95 * u);
        g.lineTo(-0.05, -0.1 + 0.6 * u);
        g.stroke();
      }
      // (the bowl)
      g.beginPath();
      g.moveTo(-1.1, -0.15);
      g.bezierCurveTo(-1.15, -1.45, 1.15, -1.45, 1.1, -0.15);
      g.closePath();
      ink(g, '#24242c', 0.24);
      // (the lacquer's rim: a lit edge just inside the black one, so the black helmet reads on a dark sky)
      g.strokeStyle = shine;
      g.lineWidth = 0.09;
      g.stroke();
      // (and the gloss: a bright streak across the dome's front)
      g.strokeStyle = rgba('#ffffff', 0.6 + 0.3 * mf.hat);
      g.lineWidth = 0.13;
      g.beginPath();
      g.arc(0, -0.25, 0.85, -Math.PI * 0.42, -Math.PI * 0.2);
      g.stroke();
      g.strokeStyle = '#6c6c7c';
      g.lineWidth = 0.08;
      for (const x of [-0.5, 0, 0.5]) {
        g.beginPath();
        g.moveTo(x * 1.6, -0.2);
        g.quadraticCurveTo(x * 0.9, -0.95, 0, -1.12);
        g.stroke();
      }
      // (the brim over the eyes)
      g.beginPath();
      g.moveTo(-0.6, -0.3);
      g.lineTo(1.55, -0.38);
      g.lineTo(1.3, -0.1);
      g.lineTo(-0.6, -0.05);
      g.closePath();
      ink(g, '#24242c', 0.18);
      g.strokeStyle = shine;
      g.lineWidth = 0.07;
      g.stroke();
      // (the gold crest: two horns sweeping up and out from the front)
      g.beginPath();
      g.moveTo(0.55, -0.85);
      g.quadraticCurveTo(1.6, -1.3, 1.75, -2.25);
      g.quadraticCurveTo(1.25, -1.35, 0.4, -1.1);
      g.quadraticCurveTo(-0.2, -1.6, -0.25, -2.35);
      g.quadraticCurveTo(-0.55, -1.3, 0.3, -0.75);
      g.closePath();
      ink(g, gold, 0.2);
      g.beginPath();
      g.arc(0.5, -0.88, 0.2, 0, Math.PI * 2);
      ink(g, lac, 0.12);
      glowDot(g, 0.6, -1.4, 0.9 + 1.3 * mf.kick, '#ffe08a', 0.25 + 0.6 * mf.kick);
    });
  },
});
