// The hints' marks, drawn in the screen's pixels (layers/hints.js decides which, where and how big):
// - a note: a round mark in its move's colour with the way to press it inside (an arrow with keys, three chevrons
//   running the way to swipe on a touch screen); two moves at once a pill of both with a plus, or on a touch screen one
//   note swiped along the diagonal of both (one gesture makes them); a ring closing on it exactly on its beat (osu!'s
//   approach circle), a flash on the beat; a thing that may be left (a fork) a dashed, hollow note with no ring;
// - a known move's note: the sign alone, no disc, with its ring;
// - a held move: round its note a ring cut in one piece per beat to hold (how long, read before it); once pressed the
//   note rides over him, its sign pressed in, beating, a piece going out each beat, a white flash when it may be let go;
//   let go too early it breaks and falls.
const ANGLE = { up: -Math.PI / 2, down: Math.PI / 2, right: 0, left: Math.PI };
const INK = '#05070f';

export function arrow(g, x, y, r, angle, colour) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.beginPath();
  g.moveTo(r, 0);
  g.lineTo(0, -r * 0.85);
  g.lineTo(0, -r * 0.38);
  g.lineTo(-r * 0.9, -r * 0.38);
  g.lineTo(-r * 0.9, r * 0.38);
  g.lineTo(0, r * 0.38);
  g.lineTo(0, r * 0.85);
  g.closePath();
  g.lineJoin = 'round';
  g.lineWidth = r * 0.28;
  g.strokeStyle = INK;
  g.stroke();
  g.fillStyle = colour;
  g.fill();
  g.restore();
}
// three chevrons lit one after another towards the swipe, over the beat (`run`: 0..1); two colours for two moves
function chevrons(g, x, y, r, angle, colours, run) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    const cx = (i - 1) * r * 0.42,
      lit = Math.max(0, 1 - Math.abs(run * 3 - i - 0.5) * 0.8);
    g.beginPath();
    g.moveTo(cx - r * 0.2, -r * 0.42);
    g.lineTo(cx + r * 0.2, 0);
    g.lineTo(cx - r * 0.2, r * 0.42);
    g.lineWidth = r * 0.3;
    g.strokeStyle = INK;
    g.stroke();
    g.lineWidth = r * 0.17;
    g.strokeStyle = colours[Math.min(colours.length - 1, Math.round((i / 2) * (colours.length - 1)))];
    g.globalAlpha *= 0.35 + 0.65 * Math.max(lit, i / 3);
    g.stroke();
    g.globalAlpha /= 0.35 + 0.65 * Math.max(lit, i / 3);
  }
  g.restore();
}
// (a touch screen answers two different moves with one diagonal swipe)
const diagonal = (note, touch) => touch && note.items.length > 1 && note.items[0].dir !== note.items[1].dir;
const sumAngle = items =>
  Math.atan2(
    items.reduce((s, i) => s + Math.sin(ANGLE[i.dir]), 0),
    items.reduce((s, i) => s + Math.cos(ANGLE[i.dir]), 0),
  );
// a mid colour between two (the middle chevron of a diagonal)
function mix(a, b) {
  const rgb = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const A = rgb(a),
    B = rgb(b);
  return `rgb(${A.map((v, i) => (v + B[i]) >> 1).join(',')})`;
}

function sign(g, x, y, s, item, touch, run) {
  if (touch) chevrons(g, x, y, s * 1.25, ANGLE[item.dir], [item.colour], run);
  else arrow(g, x, y, s, ANGLE[item.dir], item.colour);
}
// the signs inside a note of radius r
function signs(g, x, y, r, note, touch, run) {
  const it = note.items;
  if (diagonal(note, touch))
    return chevrons(
      g,
      x,
      y,
      r * 0.95,
      sumAngle(it),
      [it[0].colour, mix(it[0].colour, it[1].colour), it[1].colour],
      run,
    );
  if (it.length === 1) return sign(g, x, y, r * 0.66, it[0], touch, run);
  sign(g, x - r * 1.15, y, r * 0.62, it[0], touch, run);
  sign(g, x + r * 1.15, y, r * 0.62, it[1], touch, run);
  // (a plus between two different moves; two steps the same way read as two arrows)
  if (it[0].dir !== it[1].dir || it[0].colour !== it[1].colour) {
    // (drawn, not written: the note grows as it comes, and text at a new size every frame is drawn afresh)
    g.fillStyle = '#fff';
    g.fillRect(x - r * 0.26, y - r * 0.07, r * 0.52, r * 0.14);
    g.fillRect(x - r * 0.07, y - r * 0.26, r * 0.14, r * 0.52);
  }
}
// half the width of a note of radius r (a pill is wider)
export const halfWidth = (r, note, touch) => (note.items.length > 1 && !diagonal(note, touch) ? r * 2.15 : r);

// u: how far the approach is (1 on the beat, the ring from 1.9 r down onto the note); flash: 0..1; run: the beat's phase
export function drawNote(g, x, y, r, note, { u = -1, flash = 0, touch = false, run = 0, beats = 0 } = {}) {
  const hw = halfWidth(r, note, touch),
    hollow = note.optional;
  g.save();
  g.beginPath();
  g.roundRect(x - hw, y - r, hw * 2, r * 2, r);
  g.fillStyle = hollow ? 'rgba(5,7,15,0.35)' : 'rgba(5,7,15,0.82)';
  g.fill();
  if (hollow) g.setLineDash([r * 0.32, r * 0.24]);
  g.lineWidth = r * 0.14;
  g.strokeStyle = note.items[0].colour;
  g.stroke();
  g.setLineDash([]);
  if (hollow) g.globalAlpha *= 0.75;
  signs(g, x, y, r, note, touch, run);
  if (beats) pieces(g, x, y, r, beats, beats, note.items[0].colour);
  if (hollow) {
    g.restore();
    return;
  }
  if (u > -0.05 && u < 1) {
    const k = 1 + (1 - u) * 0.9,
      w = hw + r * (k - 1);
    g.beginPath();
    g.roundRect(x - w, y - r * k, w * 2, r * k * 2, r * k);
    g.globalAlpha = Math.min(1, Math.max(0, u * 1.6)) * g.globalAlpha;
    g.lineWidth = r * 0.12;
    g.strokeStyle = '#fff';
    g.stroke();
  }
  if (flash > 0) {
    g.globalAlpha = flash * 0.55;
    g.beginPath();
    g.arc(x, y, r * 1.2, 0, Math.PI * 2);
    g.fillStyle = '#fff';
    g.fill();
  }
  g.restore();
}
// a known move: its sign(s) alone, outlined dark to stand on any world, and its ring
export function drawKnown(g, x, y, r, note, { u = -1, touch = false, run = 0, beats = 0 } = {}) {
  g.save();
  const it = note.items,
    pair = it.length > 1 && !diagonal(note, touch);
  if (diagonal(note, touch))
    chevrons(g, x, y, r * 1.05, sumAngle(it), [it[0].colour, mix(it[0].colour, it[1].colour), it[1].colour], run);
  else if (pair) {
    sign(g, x - r * 0.8, y, r * 0.7, it[0], touch, run);
    sign(g, x + r * 0.8, y, r * 0.7, it[1], touch, run);
  } else sign(g, x, y, r * 0.8, it[0], touch, run);
  if (beats) pieces(g, x, y, r, beats, beats, it[0].colour);
  if (!note.optional && u > -0.05 && u < 1) {
    g.globalAlpha *= Math.min(1, Math.max(0, u * 1.6));
    g.lineWidth = r * 0.1;
    g.strokeStyle = it[0].colour;
    g.beginPath();
    // (round one sign; long round two side by side, closing onto them, never onto their middle)
    const k = 1 + (1 - u) * 0.9,
      w = (pair ? r * 1.6 : r) + r * (k - 1);
    g.roundRect(x - w, y - r * k, w * 2, r * k * 2, r * k);
    g.stroke();
  }
  g.restore();
}

// the ring of a held move's beats: n pieces round the note, the first `lit` of them on (a fraction: the one going out)
function pieces(g, x, y, r, n, lit, colour) {
  const step = (Math.PI * 2) / n,
    gap = Math.min(0.5, step * 0.25),
    R = r * 1.34;
  g.save();
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + i * step + gap / 2,
      a1 = a0 + step - gap,
      on = Math.max(0, Math.min(1, lit - i));
    g.beginPath();
    g.arc(x, y, R, a0, a1);
    g.globalAlpha = 0.6;
    g.lineWidth = r * 0.26;
    g.strokeStyle = INK;
    g.stroke();
    g.globalAlpha = 0.2 + 0.8 * on;
    g.lineWidth = r * 0.15;
    g.strokeStyle = colour;
    g.stroke();
  }
  g.restore();
}
// a held move being held: its note (over him) beating, its sign pressed in, `left` of its `beats` still to hold (0..1);
// a white flash as the last piece goes out (`flash` 0..1)
export function drawHeld(g, x, y, r, note, { beats, left, beat = 0, flash = 0, touch = false }) {
  const k = 1 + 0.08 * beat;
  g.save();
  g.beginPath();
  g.arc(x, y, r * k, 0, Math.PI * 2);
  g.fillStyle = 'rgba(5,7,15,0.82)';
  g.fill();
  g.lineWidth = r * 0.14;
  g.strokeStyle = note.items[0].colour;
  g.stroke();
  // (pressed in: the sign a little smaller and lit; a swipe's chevrons held still, all on)
  signs(g, x, y, r * k * 0.88, note, touch, 1);
  pieces(g, x, y, r * k, beats, left * beats, note.items[0].colour);
  if (flash > 0) {
    g.globalAlpha = flash * 0.7;
    g.beginPath();
    g.arc(x, y, r * (1.2 + 0.5 * (1 - flash)), 0, Math.PI * 2);
    g.fillStyle = '#fff';
    g.fill();
  }
  g.restore();
}
// a held move let go too early: its note cracked in two, the halves falling apart (`u` 0..1 over the fall)
export function drawBroken(g, x, y, r, note, u) {
  g.save();
  g.globalAlpha = 1 - u;
  for (const side of [-1, 1]) {
    g.save();
    g.translate(x + side * r * 0.5 * u, y + r * 3 * u * u);
    g.rotate(side * 0.6 * u);
    g.beginPath();
    g.arc(0, 0, r, side < 0 ? Math.PI / 2 : -Math.PI / 2, side < 0 ? (Math.PI * 3) / 2 : Math.PI / 2);
    g.closePath();
    g.fillStyle = 'rgba(5,7,15,0.82)';
    g.fill();
    g.lineWidth = r * 0.14;
    g.strokeStyle = '#ff3b5c';
    g.stroke();
    g.restore();
  }
  g.restore();
}
