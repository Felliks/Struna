// The coach's card (main.js coachStep decides what it is on): the move a new thing wants, shown big beside him while
// the song slows round it, without a word (a child of seven reads none in time):
// - on a computer, the key: a keycap with the move's arrow, in the move's colour; two keys side by side with a plus for
//   two at once; on a phone (the last thing played was a finger), the gesture: a finger swiping the way of the move on a
//   pad of glass, its trail behind it; two moves at once one swipe on their diagonal, as the notes show it;
// - counted in on the beats before it: three pips lit one a beat (a tick each on the audio clock, main.js), the
//   move shown once, faint, on the second (show, then do: Rhythm Heaven's practice, Patapon's call), and made on its
//   beat as a ring closes onto it (the notes' ring, osu!'s approach circle); a held move held, its beats going round;
// - the world dims at its edges as the song slows (a vignette made once, laid over scaled);
// - pressed on time: a burst in its colour, the card thrown off; too early or the wrong move: the card shakes (not yet);
//   not made: the cursor's pointer clicks it for him (he is helped over, on the beat);
// - the card beats with the music (each beat, harder on a kick).
// No gradient or allocation per frame: paths, a few reused numbers, the vignette's canvas made once (warmCoach).
import { isHeld, noteOf } from '../../hints.js';
import { arrow } from '../notes.js';
import { screenSwap } from './modes.js';
import { slowAmount } from '../../stretch.js';

const ANGLE = { up: -Math.PI / 2, down: Math.PI / 2, right: 0, left: Math.PI };
const INK = '#05070f';
const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const ease = u => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - (1 - u) * (1 - u) * (1 - u));

// the vignette: dark edges, a clear middle, made once at 256 px and laid over the screen scaled
let vignette = null;
export function warmCoach() {
  if (vignette || typeof document === 'undefined') return;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d'),
    gr = x.createRadialGradient(128, 128, 40, 128, 128, 182);
  gr.addColorStop(0, 'rgba(3,4,12,0)');
  gr.addColorStop(0.55, 'rgba(3,4,12,0.35)');
  gr.addColorStop(1, 'rgba(3,4,12,0.92)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 256, 256);
  vignette = c;
}

// where the card stands (kept from frame to frame, eased after what it is beside)
const pos = { o: null, x: 0, y: 0 };

// a keycap at (x, y), half its width s: its top pressed down by `press` (0..1), lit by `lit`
function keycap(g, x, y, s, dir, colour, press, lit) {
  const depth = s * 0.22,
    d = depth * (1 - press),
    rr = s * 0.3;
  g.beginPath();
  g.roundRect(x - s, y - s + depth * 0.5, s * 2, s * 2, rr);
  g.fillStyle = INK;
  g.fill();
  g.lineWidth = s * 0.08;
  g.strokeStyle = colour;
  g.globalAlpha *= 0.7;
  g.stroke();
  g.globalAlpha /= 0.7;
  g.beginPath();
  g.roundRect(x - s * 0.9, y - s * 0.9 - d + depth * 0.5, s * 1.8, s * 1.7, rr * 0.85);
  g.fillStyle = lit > 0 ? `rgba(${40 + 150 * lit | 0},${48 + 150 * lit | 0},${70 + 140 * lit | 0},1)` : '#1c2438';
  g.fill();
  g.lineWidth = s * 0.1;
  g.strokeStyle = colour;
  g.stroke();
  arrow(g, x, y - d + depth * 0.5 - s * 0.05, s * 0.56, ANGLE[dir], colour);
}
// a finger from below the glass, its tip at (x, y), r the tip's radius; `down` 0..1 pressed onto the glass
function finger(g, x, y, r, down) {
  g.save();
  g.translate(x, y);
  // (the finger comes up from below and a little to the right, as a thumb does)
  g.rotate(0.45);
  const k = 1 - 0.12 * down;
  // (pressed onto the glass: a ring of light round the tip)
  if (down > 0) {
    g.beginPath();
    g.arc(0, 0, r * 1.45, 0, Math.PI * 2);
    g.fillStyle = 'rgba(255,255,255,0.22)';
    g.fill();
  }
  // (the hand below it, the finger and the knuckles of the others curled)
  g.beginPath();
  g.roundRect(-r * 1.1 * k, r * 2.6, r * 3.3 * k, r * 3.2, r * 1.2);
  g.roundRect(-r * k, -r * 0.1, r * 2 * k, r * 4.6, r);
  g.fillStyle = '#f4dccb';
  g.fill();
  g.lineWidth = r * 0.24;
  g.strokeStyle = INK;
  g.stroke();
  g.beginPath();
  g.roundRect(-r * k, -r * 0.1, r * 2 * k, r * 4.6, r);
  g.fill();
  // (its nail)
  g.beginPath();
  g.roundRect(-r * 0.55 * k, r * 0.1, r * 1.1 * k, r * 1.15, r * 0.5);
  g.fillStyle = '#fff';
  g.fill();
  g.restore();
}
// the game's cursor (the arrow pointer that draws the world), at its tip (x, y), size s
function pointer(g, x, y, s) {
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x, y + s * 1.5);
  g.lineTo(x + s * 0.38, y + s * 1.12);
  g.lineTo(x + s * 0.66, y + s * 1.7);
  g.lineTo(x + s * 0.9, y + s * 1.58);
  g.lineTo(x + s * 0.62, y + s * 1.02);
  g.lineTo(x + s * 1.1, y + s * 1.02);
  g.closePath();
  g.lineJoin = 'round';
  g.lineWidth = s * 0.16;
  g.strokeStyle = INK;
  g.stroke();
  g.fillStyle = '#fff';
  g.fill();
}
// a press's shape over a beat: down fast, held a moment, back up (0..1), `u` beats from the press
const tap = u => (u < -0.08 ? 0 : u < 0 ? (u + 0.08) / 0.08 : u < 0.15 ? 1 : u < 0.5 ? 1 - (u - 0.15) / 0.35 : 0);

// the move shown: keys (keyboard) or a swipe (touch). `show` 0..1 how far the gesture is (the press's shape), `ghost`
// drawn faint (the demonstration), `held` 0..1 of a hold's beats gone round (-1 none)
function gesture(g, x, y, U, note, touch, show, swipeU, lit, held, beats) {
  const it = note.items;
  if (!touch) {
    if (it.length === 1) keycap(g, x, y, U, it[0].dir, it[0].colour, show, lit);
    else {
      keycap(g, x - U * 1.35, y, U * 0.86, it[0].dir, it[0].colour, show, lit);
      keycap(g, x + U * 1.35, y, U * 0.86, it[1].dir, it[1].colour, show, lit);
      g.fillStyle = '#fff';
      g.fillRect(x - U * 0.22, y - U * 0.06, U * 0.44, U * 0.12);
      g.fillRect(x - U * 0.06, y - U * 0.22, U * 0.12, U * 0.44);
    }
    if (held >= 0) ring(g, x, y + U * 0.1, U * (it.length > 1 ? 2.6 : 1.55), beats, held, it[0].colour);
    return;
  }
  // (a swipe: two different ways at once is one swipe on their diagonal)
  const two = it.length > 1 && it[0].dir !== it[1].dir,
    a = two ? Math.atan2(Math.sin(ANGLE[it[0].dir]) + Math.sin(ANGLE[it[1].dir]), Math.cos(ANGLE[it[0].dir]) + Math.cos(ANGLE[it[1].dir])) : ANGLE[it[0].dir],
    L = U * 1.6,
    ca = Math.cos(a),
    sa = Math.sin(a),
    x0 = x - ca * L,
    y0 = y - sa * L,
    q = ease(swipeU),
    fx = x0 + ca * 2 * L * q,
    fy = y0 + sa * 2 * L * q,
    colour = it[0].colour,
    colour2 = (two ? it[1] : it[0]).colour;
  // (the way to go, three chevrons lit as the finger passes them; the trail behind it)
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    const u = (i + 1) / 4,
      cx = x0 + ca * 2 * L * u,
      cy = y0 + sa * 2 * L * u,
      on = q >= u ? 1 : 0.3;
    g.save();
    g.translate(cx, cy);
    g.rotate(a);
    g.beginPath();
    g.moveTo(-U * 0.2, -U * 0.36);
    g.lineTo(U * 0.12, 0);
    g.lineTo(-U * 0.2, U * 0.36);
    g.lineWidth = U * 0.26;
    g.strokeStyle = INK;
    g.stroke();
    g.lineWidth = U * 0.14;
    g.strokeStyle = i < 1 ? colour : colour2;
    g.globalAlpha *= on;
    g.stroke();
    g.restore();
  }
  if (q > 0 && show > 0) {
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(fx, fy);
    g.lineWidth = U * 0.5;
    g.strokeStyle = colour;
    g.globalAlpha *= 0.4 * show;
    g.stroke();
    g.globalAlpha /= 0.4 * show;
  }
  // (where the finger came down: a ring spreading on the glass)
  if (show > 0 && swipeU < 0.6) {
    g.beginPath();
    g.arc(x0, y0, U * (0.4 + swipeU), 0, Math.PI * 2);
    g.lineWidth = U * 0.08;
    g.strokeStyle = '#fff';
    g.globalAlpha *= 0.6 * (1 - swipeU / 0.6);
    g.stroke();
    g.globalAlpha /= 0.6 * (1 - swipeU / 0.6) || 1;
  }
  if (held >= 0) ring(g, fx, fy, U * 0.95, beats, held, colour);
  finger(g, show > 0 ? fx : x0, show > 0 ? fy : y0, U * 0.46, show);
}
// a held move's beats, round its key or finger: n pieces, the first `lit` (a fraction) still to hold
function ring(g, x, y, R, n, lit, colour) {
  const step = (Math.PI * 2) / n,
    gap = Math.min(0.5, step * 0.25);
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + i * step + gap / 2;
    g.beginPath();
    g.arc(x, y, R, a0, a0 + step - gap);
    g.lineWidth = R * 0.16;
    g.strokeStyle = INK;
    g.stroke();
    g.lineWidth = R * 0.09;
    g.strokeStyle = colour;
    const was = g.globalAlpha;
    g.globalAlpha = was * (0.25 + 0.75 * clamp01(lit - i));
    g.stroke();
    g.globalAlpha = was;
  }
}

export function drawCoach(f) {
  const { g, v, run, L, t, teach, mf } = f,
    card = teach?.card;
  if (!card || run.mode === 'dead' || run.over || !f.marks) return;
  const o = card.o,
    beat = L.A.beat,
    u = (t - o.t) / beat,
    st = card.st,
    note = noteOf(o, run, screenSwap(L, o.t));
  if (!note) return;
  // (a note's radius, as the hints work it out; the card's unit a little over it)
  const R = Math.max(15, Math.min(24, (0.034 * Math.min(v.W, v.H)) / v.dpr)) * v.dpr * (f.touch ? 1.15 : 1),
    U = R * (card.full ? (f.touch ? 1.3 : 1.7) : f.touch ? 1.05 : 1.35),
    slow = card.full ? slowAmount(o.t, beat, t, card.from) : 0;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  // the world dimmed at its edges as it slows
  if (slow > 0 && vignette) {
    g.globalAlpha = 0.8 * slow;
    g.drawImage(vignette, 0, 0, v.W, v.H);
    g.globalAlpha = 1;
  }
  // its place: over between him and the thing (once the cursor has put it down), clear of both, eased there
  const head = f.spots?.hero,
    at = f.marks.get(o);
  if (!head) return g.restore();
  const ahead = (L.segAt(Math.max(0, t)).dir ?? 1) * (f.flip ?? 1) >= 0 ? 1 : -1,
    tx = at ? (head[0] + at[0]) / 2 : head[0] + ahead * v.W * 0.12,
    ty = Math.min(head[1], at?.[1] ?? head[1]) - U * (f.touch ? 5.4 : 4) - R * 1.2,
    top = ((f.safe?.t ?? 0) + 64) * v.dpr + U * 2,
    halfW = U * (f.touch ? 2.8 : note.items.length > 1 ? 2.6 : 1.6),
    // (no room over him (the camera pulled back, him or the thing high on the screen): beside him, behind him where
    // nothing comes from (ahead if there is no room behind))
    high = ty < top,
    behind = head[0] - ahead * (halfW + U * 2.4),
    side = behind - halfW > U * 0.4 && behind + halfW < v.W - U * 0.4 ? behind : head[0] + ahead * (halfW + U * 2.4),
    cx = Math.min(v.W - halfW - U * 0.9, Math.max(halfW + U * 0.9, high ? side : tx)),
    cy = Math.min(v.H - U * 3, Math.max(top, high ? head[1] - U : ty));
  if (pos.o !== o) Object.assign(pos, { o, x: cx, y: cy });
  else {
    const k = 1 - Math.exp(-10 * Math.max(0, f.dt));
    pos.x += (cx - pos.x) * k;
    pos.y += (cy - pos.y) * k;
  }
  // (in over half a beat from four beats before; out over a beat after, thrown off on a clean press)
  const done = o.res === 'ok' && st.on && !st.helped,
    fade = u < -3.5 ? clamp01((u + 4) / 0.5) : u > 0.25 ? clamp01(1 - (u - 0.25) / 0.85) : 1;
  if (fade <= 0) return g.restore();
  // (it shakes when pressed too early or the wrong way: not yet)
  const sk = t - teach.shake,
    shake = sk >= 0 && sk < 0.4 ? Math.sin(sk * 70) * U * 0.28 * (1 - sk / 0.4) : 0,
    pop = done ? 1 + 0.25 * ease(clamp01(u / 0.6)) : 1,
    beatK = 1 + 0.045 * (mf?.beat ?? 0) + 0.03 * (mf?.kick ?? 0),
    x = pos.x + shake,
    y = pos.y - (done ? U * 1.2 * ease(clamp01(u / 0.8)) : 0),
    colour = note.items[0].colour,
    // (the buttons are pressed as keys are: their keys shown, not a swipe)
    touch = !!f.touch && f.controls !== 'buttons',
    held = isHeld(o),
    beats = held ? Math.max(1, Math.round(o.dur / beat)) : 0;
  g.globalAlpha = fade;
  g.translate(x, y);
  g.scale(pop * beatK, pop * beatK);
  g.translate(-x, -y);
  // (the pad of glass under it all: dark, edged in the move's colour)
  const pw = halfW + U * 0.5,
    ph = U * (touch ? 2.4 : 1.9);
  g.beginPath();
  g.roundRect(x - pw, y - ph - (card.full ? U * 0.9 : 0), pw * 2, ph * 2 + (card.full ? U * 0.9 : 0), U * 0.6);
  g.fillStyle = 'rgba(5,7,15,0.72)';
  g.fill();
  g.lineWidth = U * 0.09;
  g.strokeStyle = colour;
  g.stroke();
  // the move: shown faint on the second beat before (the demonstration), made on its beat (the press's shape round
  // it); a held one stays down through its beats
  const holding = held && u >= 0 && u * beat < o.dur,
    demo = card.full ? tap(u + 2) : 0,
    // (a finger: on the glass from a fifth of a beat before the beat, its stroke over by a tenth after: the gesture
    // lands on the beat)
    real = u > -0.2 && u < 0.6,
    shown = card.full && u > -2.2 && u < -1.4,
    swipeU = holding ? 1 : real ? clamp01((u + 0.2) / 0.3) : shown ? clamp01((u + 2.2) / 0.3) : 0,
    show = touch ? (holding || real || shown ? 1 : 0) : holding ? 1 : Math.max(tap(u), demo * 0.8),
    lit = u >= -0.05 && u < 0.4 ? 1 - u / 0.4 : 0,
    left = held && u >= 0 ? clamp01(1 - (u * beat) / o.dur) * beats : held ? beats : -1;
  const ghost = u < -1 && (touch ? shown : demo > 0) ? 0.55 : 1;
  g.globalAlpha = fade * ghost;
  gesture(g, x, y, U, note, touch, show, swipeU, lit, held ? left : -1, beats);
  g.globalAlpha = fade;
  // the ring closing onto it over the last two beats (it lands on the beat)
  if (u > -2 && u < 0.05) {
    const k = 1 + (-u / 2) * 1.2,
      w = pw * k,
      h = ph * k;
    g.beginPath();
    g.roundRect(x - w, y - h, w * 2, h * 2, U * 0.6 * k);
    g.lineWidth = U * 0.14;
    g.strokeStyle = '#fff';
    g.globalAlpha = fade * clamp01((u + 2) * 0.8);
    g.stroke();
    g.globalAlpha = fade;
  }
  // the count in: three pips, lit one a beat (three, two, one), the move on the fourth
  if (card.full) {
    const py = y - ph - U * 0.42;
    for (let k = 0; k < 3; k++) {
      const on = u + 3 - k,
        pk = on >= 0 ? 1 + 0.6 * clamp01(1 - on / 0.3) : 1,
        px = x + (k - 1) * U * 0.9;
      g.beginPath();
      g.arc(px, py, U * 0.17 * pk, 0, Math.PI * 2);
      g.fillStyle = on >= 0 ? colour : 'rgba(255,255,255,0.22)';
      g.fill();
      g.lineWidth = U * 0.06;
      g.strokeStyle = INK;
      g.stroke();
    }
  }
  // pressed on time: a burst in its colour
  if (done && u < 0.9) {
    const k = ease(clamp01(u / 0.7));
    g.beginPath();
    g.arc(x, y, U * (1.4 + 2.6 * k), 0, Math.PI * 2);
    g.lineWidth = U * 0.3 * (1 - k);
    g.strokeStyle = colour;
    g.globalAlpha = fade * (1 - k);
    g.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3,
        r0 = U * (1.6 + 2.2 * k),
        r1 = r0 + U * 0.7 * (1 - k);
      g.beginPath();
      g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
      g.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      g.lineWidth = U * 0.16;
      g.stroke();
    }
    g.globalAlpha = fade;
  }
  // not made: the cursor's pointer comes in and clicks it for him, on the beat
  if (st.helped && u > -0.1 && u < 1.2) {
    const k = clamp01((u + 0.1) / 0.25),
      click = u > 0.12 && u < 0.4 ? 0.85 : 1;
    pointer(g, x + U * 0.3 + U * 2.4 * (1 - ease(k)), y + U * 0.1 + U * 1.6 * (1 - ease(k)), U * 0.9 * click);
  }
  g.restore();
}

// a small sign of the move beside a note not yet known (layers/hints.js): its key pressed on the note's beat, or a
// finger swiping it; `alpha` fades as the move is played right
export function drawMini(g, x, y, R, note, touch, u, alpha) {
  if (alpha <= 0.02) return;
  g.save();
  g.globalAlpha *= alpha;
  const press = tap(u),
    U = R * 0.5;
  if (!touch) {
    const it = note.items;
    if (it.length === 1) keycap(g, x, y, U, it[0].dir, it[0].colour, press, press);
    else {
      keycap(g, x - U * 1.15, y, U * 0.85, it[0].dir, it[0].colour, press, press);
      keycap(g, x + U * 1.15, y, U * 0.85, it[1].dir, it[1].colour, press, press);
    }
  } else {
    // (the swipe made over the last half beat before the beat, again and again)
    const ph = ((u % 1) + 1) % 1,
      s = ph > 0.45 ? clamp01((ph - 0.45) / 0.4) : 0;
    gesture(g, x, y, U * 0.85, note, true, s > 0 ? 1 : 0, s, 0, -1, 0);
  }
  g.restore();
}
