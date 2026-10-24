// (a pack of parts: see registry.js)
// ATL's land (world/artists.js), lent to any world it suits: far rows, grounds and landmarks after his songs.
//   far     megaliths ("Стоунхендж": standing stones and stone heads on a ridge, lit round in turn on the beat),
//           mandrakes ("Корень мандрагоры", "Водяной": a marsh of glowing cartoon mandrake roots with leafy tufts and
//           little faces, one bobbing up on each beat, marsh lights drifting)
//   ground  kafel (white tiles, red light running along the joints on a drop), glyphstone (stone slabs carved with a
//           ring of made-up glyphs, lit on the beat: no real runes, no symbols of any faith)
//   mark    megacircle (a great ring of stones on a hill, flaring round on the beat), vodyanoy ("Водяной": a kind old
//           water spirit's head of moss and lily pads over a marsh, blinking on the kick, blowing bubbles on the bass)
import { registerPart } from '../../registry.js';
import { cells, edge, glow, landmark, row, slab, tint } from '../../../render/places/kit.js';
import { hash, mixHex, rgba } from '../../../render/util.js';

const TAU = Math.PI * 2;
const beatN = f => Math.floor(f.t / f.L.A.beat);
// a landmark standing up from the far horizon (as the pack's: a phone's horizon sits low)
function mark(f, par, every, chance, salt, draw) {
  const up = Math.max(1.6 * f.v.ppm, 0.22 * f.v.H);
  landmark(f, par, every, chance, salt, (X, base, i) => draw(X, base - up, i, up));
}

// ---- far rows
function megaliths(f) {
  const { g, v, mf, T } = f,
    r = row(f, 0.1),
    m = v.ppm,
    body = mixHex(T.far, '#5a5a60', 0.3),
    lit = beatN(f);
  // (the ridge they stand on)
  g.fillStyle = mixHex(T.far, T.near, 0.3);
  g.beginPath();
  // (from the row's left edge to its right, kit.js row)
  g.moveTo(r.L, r.base);
  for (let x = r.L; x <= r.R + (r.R - r.L) / 16; x += (r.R - r.L) / 16) g.lineTo(x, r.base - (1.2 + Math.sin((x + r.x0 * m) / (9 * m)) * 0.8) * m);
  g.lineTo(r.R + (r.R - r.L) / 16, r.base);
  g.fill();
  cells(r, 3.2, (i, X, u) => {
    const base = r.base - (1.2 + Math.sin(X / (9 * m) + r.x0 / 9) * 0.8) * m,
      on = (i % 6 === lit % 6 ? mf.beat : 0) + 0.1 * mf.kick;
    g.fillStyle = body;
    if (u < 0.22) {
      // (a stone head: a long face, a heavy brow, a nose, a hat of red stone)
      g.fillRect(X - 0.55 * m, base - 3.3 * m, 1.1 * m, 3.3 * m);
      g.fillRect(X - 0.7 * m, base - 2.5 * m, 0.15 * m, 1.3 * m);
      g.fillStyle = mixHex(body, '#000000', 0.35);
      g.fillRect(X - 0.4 * m, base - 2.5 * m, 0.8 * m, 0.14 * m);
      g.fillRect(X + 0.1 * m, base - 2.35 * m, 0.25 * m, 0.7 * m);
      g.fillStyle = rgba(T.win[1], 0.3 + 0.7 * on);
      g.fillRect(X - 0.3 * m, base - 2.3 * m, 0.25 * m, 0.08 * m);
    } else if (u < 0.6) {
      // (a trilithon: two uprights and a lintel)
      g.fillRect(X - 1.0 * m, base - 2.6 * m, 0.55 * m, 2.6 * m);
      g.fillRect(X + 0.45 * m, base - 2.6 * m, 0.55 * m, 2.6 * m);
      g.fillRect(X - 1.15 * m, base - 3.1 * m, 2.3 * m, 0.5 * m);
      glow(g, X, base - 1.2 * m, (0.6 + 0.6 * on) * m, T.line, 0.15 + 0.6 * on);
    } else {
      g.beginPath();
      g.moveTo(X - 0.35 * m, base);
      g.lineTo(X - 0.3 * m, base - (1.6 + u) * m);
      g.lineTo(X + 0.2 * m, base - (1.8 + u) * m);
      g.lineTo(X + 0.35 * m, base);
      g.fill();
    }
  });
}
function mandrakes(f) {
  const { g, v, mf, T, t } = f,
    r = row(f, 0.14),
    m = v.ppm,
    water = mixHex(T.far, '#0a2a24', 0.45),
    root = mixHex('#c8b48a', T.far, 0.35),
    leaf = mixHex('#3dff6a', T.far, 0.3),
    n = beatN(f);
  // (the marsh: a band of dark water, a glint along its top)
  g.fillStyle = water;
  g.fillRect(r.L, r.base - 1.4 * m, r.R - r.L, 3 * m);
  g.fillStyle = rgba('#9dffd6', 0.25);
  g.fillRect(r.L, r.base - 1.4 * m, r.R - r.L, 0.05 * m);
  cells(r, 2.2, (i, X, u) => {
    // (a mandrake root standing in the water: a forked body, a tuft of leaves, two dots of eyes and an "o" of a mouth,
    // glowing; one in a few bobs up out of the water on its beat)
    const up = (((i % 4) + 4) % 4 === n % 4 ? mf.beat : 0) * 0.5 * m,
      s = 0.7 + 0.6 * u,
      Y = r.base - 1.3 * m - up,
      h = 1.3 * m * s;
    glow(g, X, Y - h * 0.5, 1.1 * m * s, leaf, 0.12 + 0.2 * mf.kick);
    g.fillStyle = root;
    g.beginPath();
    g.moveTo(X - 0.35 * m * s, Y);
    g.quadraticCurveTo(X - 0.45 * m * s, Y - h * 0.8, X, Y - h);
    g.quadraticCurveTo(X + 0.45 * m * s, Y - h * 0.8, X + 0.35 * m * s, Y);
    g.lineTo(X + 0.15 * m * s, Y + 0.3 * m);
    g.lineTo(X, Y + 0.05 * m);
    g.lineTo(X - 0.15 * m * s, Y + 0.3 * m);
    g.fill();
    g.fillStyle = leaf;
    for (let k = -2; k <= 2; k++) {
      const a = -Math.PI / 2 + k * 0.35 + Math.sin(t * 2 + i + k) * 0.08;
      g.beginPath();
      g.ellipse(X + Math.cos(a) * 0.35 * m * s, Y - h + Math.sin(a) * 0.35 * m * s, 0.28 * m * s, 0.08 * m * s, a, 0, TAU);
      g.fill();
    }
    g.fillStyle = '#0a1a10';
    for (const e of [-0.1, 0.1]) {
      g.beginPath();
      g.arc(X + e * m * s, Y - h * 0.65, 0.05 * m * s, 0, TAU);
      g.fill();
    }
    g.beginPath();
    g.ellipse(X, Y - h * 0.45, 0.05 * m * s, (0.04 + 0.05 * mf.snare) * m * s, 0, 0, TAU);
    g.fill();
  });
  // (marsh lights drifting, flaring on the hats)
  for (let k = 0; k < 14; k++) {
    // (across the row's frame, kit.js row)
    const x = r.L + (((hash(k, 3) * v.W - r.x0 * m * 0.5) % (r.R - r.L)) + (r.R - r.L)) % (r.R - r.L),
      y = r.base - (1.8 + 2.5 * hash(k, 4)) * m + Math.sin(t * 1.3 + k) * 0.3 * m,
      a = 0.3 + 0.4 * Math.max(0, Math.sin(t * 2 + k * 1.7)) + (k % 3 ? 0 : mf.hat);
    glow(g, x, y, 0.25 * m, '#9dffd6', Math.min(1, a));
  }
}

// ---- grounds
function kafel(f, a, b, y) {
  const { g, v, mf } = f,
    s = slab(f, a, b, y, tint(f, '#c8c6c0', f.T.near, 0.6), '#f2f0ea');
  if (!s) return;
  const m = v.ppm,
    run = (f.t * 6) % 30;
  for (let k = Math.floor(s.a / 0.35); k < s.b / 0.35; k++) {
    const X = v.sx(k * 0.35);
    g.fillStyle = 'rgba(20,20,24,0.35)';
    g.fillRect(X, s.Y + 0.22 * m, 0.025 * m, 3 * m);
    // (red light running along the joints on a drop)
    if (mf.drop > 0 && Math.abs(((k % 30) + 30) % 30 - run) < 2) {
      g.fillStyle = rgba('#ff2a3a', 0.4 + 0.5 * mf.kick);
      g.fillRect(X, s.Y + 0.22 * m, 0.035 * m, 3 * m);
    }
  }
  g.fillStyle = 'rgba(20,20,24,0.3)';
  for (let j = 1; j < 9; j++) g.fillRect(s.X0, s.Y + 0.22 * m + j * 0.35 * m, s.X1 - s.X0, 0.025 * m);
  edge(f, s, mf.drop > 0 ? '#ff2a3a' : f.T.line);
}
function glyphStone(f, a, b, y) {
  const { g, v, mf, T } = f,
    s = slab(f, a, b, y, tint(f, '#3a3a40'), tint(f, '#6a6a70', T.far, 0.3));
  if (!s) return;
  const m = v.ppm,
    lit = beatN(f);
  for (let k = Math.floor(s.a / 1.6); k < s.b / 1.6; k++) {
    const X = v.sx(k * 1.6);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(X, s.Y + 0.22 * m, 0.04 * m, 2 * m);
    // (a ring of made-up glyphs carved in the slab: strokes and dots round a circle, lit in turn on the beat)
    const cx = X + 0.8 * m,
      cy = s.Y + 0.95 * m,
      on = k % 4 === lit % 4 ? mf.beat : 0.15;
    g.strokeStyle = rgba(T.line, 0.25 + 0.65 * on);
    g.lineWidth = Math.max(1, 0.04 * m);
    g.beginPath();
    g.arc(cx, cy, 0.5 * m, 0, TAU);
    for (let j = 0; j < 8; j++) {
      const an = (j / 8) * TAU,
        h = hash(j, k);
      g.moveTo(cx + Math.cos(an) * 0.32 * m, cy + Math.sin(an) * 0.32 * m);
      g.lineTo(cx + Math.cos(an + (h - 0.5) * 0.5) * (0.42 - 0.08 * h) * m, cy + Math.sin(an + (h - 0.5) * 0.5) * (0.42 - 0.08 * h) * m);
    }
    g.stroke();
  }
  edge(f, s);
}

// ---- landmarks
function megaCircle(f) {
  const { g, v, mf, T } = f;
  mark(f, 0.07, 44, 0.75, 41, (X, base, i, up) => {
    const m = v.ppm * 0.9,
      body = mixHex(T.far, T.sky[2], 0.25),
      n = 12,
      lit = beatN(f) % n;
    g.fillStyle = mixHex(body, T.near, 0.3);
    g.beginPath();
    g.ellipse(X, base + up * 0.4, 9 * m, 2.2 * m + up * 0.4, 0, Math.PI, TAU);
    g.fill();
    glow(g, X, base - 2 * m, 6 * m, T.line, 0.1 + 0.15 * mf.kick);
    // (the stones round the ring, the back ones higher and smaller, each flaring as the beat goes round)
    const order = [...Array(n).keys()].sort((a, b) => Math.sin((a / n) * TAU) - Math.sin((b / n) * TAU));
    for (const k of order) {
      const an = (k / n) * TAU,
        x = X + Math.cos(an) * 6 * m,
        depth = Math.sin(an),
        y = base - 0.6 * m + depth * 0.9 * m,
        sc = 0.8 + 0.2 * depth,
        h = 2.6 * m * sc,
        w = 0.8 * m * sc;
      g.fillStyle = depth < 0 ? mixHex(body, T.sky[2], 0.2) : body;
      g.fillRect(x - w / 2, y - h, w, h);
      if (k % 2 === 0) g.fillRect(x - w / 2, y - h - 0.35 * m * sc, w * 2.6, 0.35 * m * sc);
      if (k === lit) glow(g, x, y - h * 0.5, 1.2 * m, T.win[1], 0.3 + 0.6 * mf.beat);
    }
  });
}
function vodyanoy(f) {
  const { g, v, mf, T, t } = f;
  mark(f, 0.08, 48, 0.75, 43, (X, base) => {
    const m = v.ppm * 0.9,
      moss = mixHex('#3a5a2a', T.far, 0.45),
      deep = mixHex('#1a2a14', T.far, 0.4),
      Y = base - 4 * m;
    // (the marsh at his chin, reeds)
    g.fillStyle = mixHex('#1a3a3a', T.far, 0.5);
    g.beginPath();
    g.ellipse(X, base, 7 * m, 1 * m, 0, 0, TAU);
    g.fill();
    // (his head of moss: a great dome, a beard of weed hanging into the water)
    g.fillStyle = moss;
    g.beginPath();
    g.ellipse(X, Y, 3.4 * m, 3.6 * m, 0, Math.PI, TAU);
    g.lineTo(X + 3.2 * m, Y + 1.5 * m);
    for (let k = 0; k <= 10; k++) g.lineTo(X + (3.2 - k * 0.64) * m, base - (k % 2 ? 0.1 : 0.9) * m + Math.sin(t * 1.5 + k) * 0.1 * m);
    g.closePath();
    g.fill();
    // (a lily pad hat with its flower)
    g.fillStyle = mixHex('#4a8a3a', T.far, 0.35);
    g.beginPath();
    g.ellipse(X - 0.6 * m, Y - 3.5 * m, 1.8 * m, 0.4 * m, -0.1, 0, TAU);
    g.fill();
    glow(g, X - 0.2 * m, Y - 3.8 * m, 0.7 * m, '#ffb8e0', 0.5);
    // (his eyes, kind, blinking on the kick; a smile)
    const open = 1 - 0.85 * mf.kick;
    for (const s of [-1, 1]) {
      g.fillStyle = '#e8f0d8';
      g.beginPath();
      g.ellipse(X + s * 1.2 * m, Y - 0.8 * m, 0.55 * m, 0.55 * m * open, 0, 0, TAU);
      g.fill();
      g.fillStyle = deep;
      g.beginPath();
      g.arc(X + s * 1.1 * m, Y - 0.75 * m, 0.22 * m * open, 0, TAU);
      g.fill();
    }
    g.strokeStyle = deep;
    g.lineWidth = 0.15 * m;
    g.beginPath();
    g.arc(X, Y + 0.2 * m, 1 * m, 0.3, Math.PI - 0.3);
    g.stroke();
    // (bubbles up off the water on the bass)
    for (let k = 0; k < 5; k++) {
      const u = (t * 0.6 + k / 5) % 1;
      g.strokeStyle = rgba('#c8fff0', (1 - u) * (0.3 + 0.6 * mf.bass));
      g.lineWidth = Math.max(1, 0.06 * m);
      g.beginPath();
      g.arc(X + (hash(k, 7) - 0.5) * 5 * m, base - u * 4 * m, (0.15 + 0.2 * hash(k, 8)) * m, 0, TAU);
      g.stroke();
    }
  });
}

registerPart({ pack: 'atl', id: 'megaliths', slot: 'far', media: ['air'], tags: ['ancient', 'occult', 'folk', 'nature'], mood: [0.6, 0.4, 0.55], draw: megaliths });
registerPart({ pack: 'atl', id: 'mandrakes', slot: 'far', media: ['air'], tags: ['folk', 'nature', 'occult', 'acid'], mood: [0.5, 0.35, 0.45], draw: mandrakes });
registerPart({ pack: 'atl', id: 'kafel', slot: 'ground', media: ['air'], tags: ['industrial', 'province', 'cold', 'urban'], mood: [0.55, 0.25, 0.55], draw: kafel });
registerPart({ pack: 'atl', id: 'glyphstone', slot: 'ground', media: ['air'], tags: ['ancient', 'occult', 'folk'], mood: [0.6, 0.35, 0.5], draw: glyphStone });
registerPart({ pack: 'atl', id: 'megacircle', slot: 'mark', media: ['air'], tags: ['ancient', 'occult', 'folk'], mood: [0.6, 0.4, 0.55], draw: megaCircle });
registerPart({ pack: 'atl', id: 'vodyanoy', slot: 'mark', media: ['air'], tags: ['folk', 'nature', 'cold'], mood: [0.35, 0.35, 0.35], draw: vodyanoy });
