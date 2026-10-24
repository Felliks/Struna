// (a pack of parts: see registry.js)
// ATL's clones' outfits (world/artists.js), drawn over the white clone in its head's frame (x forward, y down the neck,
// a unit a head's radius) and along its bones, each with a black edge so it reads small, none hiding the body:
//   goggles    a hood and round brass goggles ("Искра", "Пчелки"), their lenses glinting on the beat
//   skullhood  a hood printed with a skeleton's ribs and a skull mask ("Кости")
//   thirdeye   a third eye painted on the brow ("C4"), opening wide and lit as the clone winds up (on the kick)
//   crowcrown  a crown of crow feathers and a red ribbon ("Вороний грай")
//   puffer     a puffer jacket and a bucket hat (the crowd of "Священный рейв" and the winter yards)
import { registerPart } from '../../registry.js';
import { JI } from '../../../lib/skeleton.js';
import { glowDot, rgba } from '../../../render/util.js';

const INK = '#000000';
function mixHex(a, b, u) {
  const p = parseInt(a.slice(1), 16),
    q = parseInt(b.slice(1), 16),
    c = sh => Math.round(((p >> sh) & 255) * (1 - u) + ((q >> sh) & 255) * u);
  return '#' + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1);
}
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
const P = (f, J, i) => [f.v.sx(J[i * 2]), f.v.sy(J[i * 2 + 1])];
// a band along the torso, from the neck down a share `to` toward the hips, w px wide each side
function torsoBand(f, J, to, w, fill) {
  const { g } = f,
    nk = P(f, J, JI.neck),
    hp = P(f, J, JI.hips),
    d = Math.hypot(nk[0] - hp[0], nk[1] - hp[1]) || 1,
    nx = -(nk[1] - hp[1]) / d,
    ny = (nk[0] - hp[0]) / d,
    e = [nk[0] + (hp[0] - nk[0]) * to, nk[1] + (hp[1] - nk[1]) * to];
  g.beginPath();
  g.moveTo(nk[0] + nx * w, nk[1] + ny * w);
  g.lineTo(e[0] + nx * w, e[1] + ny * w);
  g.lineTo(e[0] - nx * w, e[1] - ny * w);
  g.lineTo(nk[0] - nx * w, nk[1] - ny * w);
  g.closePath();
  ink(g, fill, Math.max(1, w * 0.12));
  return { nk, hp, nx, ny };
}
// a hood over the crown and the back of the head, open at the face
function hood(g, cloth) {
  g.beginPath();
  g.moveTo(1.0, 0.9);
  g.bezierCurveTo(1.45, -0.3, 0.9, -1.35, -0.05, -1.4);
  g.quadraticCurveTo(-1.3, -1.35, -1.45, -0.2);
  g.quadraticCurveTo(-1.45, 1.0, -0.5, 1.45);
  g.lineTo(0.55, 1.3);
  g.closePath();
  ink(g, cloth, 0.24);
}

registerPart({
  pack: 'atl',
  id: 'goggles',
  slot: 'clone',
  media: ['air'],
  tags: ['province', 'industrial', 'radio'],
  mood: [0.55, 0.35, 0.55],
  draw(f, p) {
    const { mf, T } = f;
    onHead(f, p, g => {
      hood(g, mixHex('#2a2a30', T.near, 0.3));
      g.beginPath();
      g.ellipse(0.45, 0.0, 0.62, 0.78, 0.15, 0, Math.PI * 2);
      g.fillStyle = '#e8e4dc';
      g.fill();
      // (the strap and the two round brass lenses)
      g.strokeStyle = '#3a2a1a';
      g.lineWidth = 0.22;
      g.beginPath();
      g.moveTo(-1.2, -0.3);
      g.lineTo(0.1, -0.25);
      g.stroke();
      for (const x of [0.25, 0.85]) {
        g.beginPath();
        g.arc(x, -0.22, 0.3, 0, Math.PI * 2);
        ink(g, '#b08a3a', 0.12);
        g.beginPath();
        g.arc(x, -0.22, 0.2, 0, Math.PI * 2);
        g.fillStyle = '#1a2a2a';
        g.fill();
        glowDot(g, x - 0.06, -0.3, 0.35 + 0.3 * mf.beat, '#ffffff', 0.4 + 0.5 * mf.beat);
      }
    });
  },
});

registerPart({
  pack: 'atl',
  id: 'skullhood',
  slot: 'clone',
  media: ['air'],
  tags: ['gothic', 'party', 'occult', 'dark'],
  mood: [0.7, 0.35, 0.65],
  draw(f, p) {
    const { g, mf, T } = f,
      J = p.J,
      w = p.r * 0.75,
      { nk, hp, nx, ny } = torsoBand(f, J, 0.95, w, mixHex('#141418', T.near, 0.2));
    // (the ribs printed down the front: white bars across the hoodie's chest, the spine down it)
    g.strokeStyle = '#f0ece4';
    g.lineWidth = Math.max(1, p.r * 0.14);
    g.beginPath();
    for (let k = 1; k <= 4; k++) {
      const u = 0.12 + k * 0.13,
        x = nk[0] + (hp[0] - nk[0]) * u,
        y = nk[1] + (hp[1] - nk[1]) * u,
        ww = w * (0.85 - 0.08 * k);
      g.moveTo(x + nx * ww, y + ny * ww);
      g.lineTo(x - nx * ww, y - ny * ww);
    }
    g.moveTo(...nk);
    g.lineTo(nk[0] + (hp[0] - nk[0]) * 0.75, nk[1] + (hp[1] - nk[1]) * 0.75);
    g.stroke();
    onHead(f, p, g => {
      hood(g, mixHex('#141418', T.near, 0.2));
      // (the skull mask: a pale face, dark sockets lit red on the kick, a row of teeth)
      g.beginPath();
      g.ellipse(0.45, 0.05, 0.62, 0.78, 0.15, 0, Math.PI * 2);
      ink(g, '#f0ece4', 0.14);
      g.fillStyle = '#0a0a0c';
      for (const x of [0.2, 0.72]) {
        g.beginPath();
        g.ellipse(x, -0.15, 0.2, 0.22, 0, 0, Math.PI * 2);
        g.fill();
        glowDot(g, x, -0.15, 0.25 + 0.25 * mf.kick, '#ff2a2a', 0.3 + 0.6 * mf.kick);
      }
      g.fillRect(0.3, 0.42, 0.42, 0.06);
      for (let i = 0; i < 4; i++) g.fillRect(0.3 + i * 0.12, 0.36, 0.03, 0.2);
    });
  },
});

registerPart({
  pack: 'atl',
  id: 'thirdeye',
  slot: 'clone',
  media: ['air', 'space'],
  tags: ['occult', 'acid', 'folk'],
  mood: [0.65, 0.35, 0.55],
  draw(f, p) {
    const { mf, T } = f,
      open = 0.35 + 0.65 * mf.kick,
      col = mixHex('#3dff6a', T.line, 0.3);
    onHead(f, p, g => {
      g.save();
      g.translate(0.45, -0.62);
      glowDot(g, 0, 0, 0.5 + 0.6 * mf.kick, col, 0.4 + 0.5 * mf.kick);
      g.beginPath();
      g.moveTo(-0.38, 0);
      g.quadraticCurveTo(0, -0.36 * open, 0.38, 0);
      g.quadraticCurveTo(0, 0.36 * open, -0.38, 0);
      ink(g, '#f4f0e8', 0.1);
      g.beginPath();
      g.arc(0, 0, 0.14 * Math.max(0.4, open), 0, Math.PI * 2);
      g.fillStyle = col;
      g.fill();
      g.beginPath();
      g.arc(0, 0, 0.06, 0, Math.PI * 2);
      g.fillStyle = INK;
      g.fill();
      // (painted rays round it)
      g.strokeStyle = rgba(col, 0.8);
      g.lineWidth = 0.06;
      g.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI * (0.15 + i * 0.175);
        g.moveTo(Math.cos(a) * 0.45, Math.sin(a) * 0.32);
        g.lineTo(Math.cos(a) * 0.62, Math.sin(a) * 0.48);
      }
      g.stroke();
      g.restore();
    });
  },
});

registerPart({
  pack: 'atl',
  id: 'crowcrown',
  slot: 'clone',
  media: ['air'],
  tags: ['folk', 'occult', 'gothic', 'nature', 'dark'],
  mood: [0.5, 0.3, 0.5],
  draw(f, p) {
    const { mf } = f;
    onHead(f, p, g => {
      // (a red ribbon round the brow, its ends flying back)
      g.beginPath();
      g.moveTo(1.0, -0.45);
      g.quadraticCurveTo(0, -0.75, -1.0, -0.45);
      g.lineTo(-1.6, -0.1 + 0.2 * mf.beat);
      g.lineTo(-1.5, 0.15 + 0.2 * mf.beat);
      g.lineTo(-0.95, -0.25);
      g.quadraticCurveTo(0, -0.5, 1.0, -0.25);
      g.closePath();
      ink(g, '#c81e1e', 0.1);
      // (the feathers up from it, fanned, lifting on the beat)
      for (let k = -3; k <= 3; k++) {
        const a = -Math.PI / 2 + k * 0.32,
          L = 1.0 - 0.1 * Math.abs(k) + 0.15 * mf.beat,
          bx = Math.cos(a) * 0.8,
          by = Math.sin(a) * 0.8 - 0.1;
        g.beginPath();
        g.moveTo(bx - 0.1, by);
        g.quadraticCurveTo(bx + Math.cos(a) * L * 0.5 - 0.15, by + Math.sin(a) * L * 0.5, bx + Math.cos(a) * L, by + Math.sin(a) * L);
        g.quadraticCurveTo(bx + Math.cos(a) * L * 0.5 + 0.15, by + Math.sin(a) * L * 0.5, bx + 0.1, by);
        ink(g, '#16161c', 0.08);
      }
    });
  },
});

registerPart({
  pack: 'atl',
  id: 'puffer',
  slot: 'clone',
  media: ['air'],
  tags: ['province', 'party', 'cold', 'urban'],
  mood: [0.6, 0.45, 0.45],
  draw(f, p) {
    const { g, mf, T } = f,
      J = p.J,
      w = p.r * 0.95,
      coat = mixHex('#1a1a20', T.near, 0.2),
      { nk, hp, nx, ny } = torsoBand(f, J, 0.85, w, coat);
    // (its quilted bands, a lit stripe on the kick)
    g.strokeStyle = rgba('#ffffff', 0.22);
    g.lineWidth = Math.max(1, p.r * 0.1);
    g.beginPath();
    for (let k = 1; k <= 3; k++) {
      const u = k * 0.22,
        x = nk[0] + (hp[0] - nk[0]) * u,
        y = nk[1] + (hp[1] - nk[1]) * u;
      g.moveTo(x + nx * w, y + ny * w);
      g.lineTo(x - nx * w, y - ny * w);
    }
    g.stroke();
    g.strokeStyle = rgba(T.line, 0.4 + 0.5 * mf.kick);
    g.beginPath();
    g.moveTo(...nk);
    g.lineTo(nk[0] + (hp[0] - nk[0]) * 0.85, nk[1] + (hp[1] - nk[1]) * 0.85);
    g.stroke();
    onHead(f, p, g => {
      // (a bucket hat: a crown and a sloping brim, a band of red)
      g.beginPath();
      g.moveTo(-0.95, -0.55);
      g.quadraticCurveTo(-0.85, -1.45, 0.25, -1.45);
      g.quadraticCurveTo(1.1, -1.4, 1.0, -0.55);
      g.closePath();
      ink(g, '#2a2a30', 0.18);
      g.beginPath();
      g.moveTo(-1.45, -0.3);
      g.lineTo(1.5, -0.3);
      g.lineTo(1.0, -0.62);
      g.lineTo(-0.95, -0.62);
      g.closePath();
      ink(g, '#3a3a42', 0.16);
      g.fillStyle = '#c81e1e';
      g.fillRect(-0.92, -0.78, 1.9, 0.16);
    });
  },
});
