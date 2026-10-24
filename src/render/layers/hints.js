// The hints: every press in the song shown where it happens, all in one look (notes.js), without a word (a child of
// seven does not read it in time):
// - each thing the cursor has put in his way carries a note where it is (obstacles.js says where): over a box, over a
//   beam, over a clone walking in (and with it), on the box a clone stands at (two at once: on the thing that stands
//   still), on his way where a boss's fist will land;
// - far off a note is small and quiet; the next two grow to full size over their last two beats, a ring closing on
//   each exactly on its beat (Thumper: the nearer, the brighter), so a busy drop is never a heap of marks;
// - a held move's note carries a ring of its beats; pressed, the note rides over his head, a piece going out each beat,
//   a flash when it may be let go, broken if let go too early;
// - a move known on this device (hints.js) keeps its note, smaller and without its disc; never dropped;
// - a thing still off the screen shows its note pinned to that edge; one coming from behind lights that edge too;
// - a move not yet known gets a small sign of how it is played beside its note (its key pressed on the beat, or a
//   finger swiping it), fading as it is played right, back after two misses (the coach's lighter hint, after the
//   card: layers/coach.js); in the lesson (every hint shown) it fades with the run's own clean ones of it.
import { Learning, lessonOf, noteOf } from '../../hints.js';
import { drawMini } from './coach.js';
import { drawBroken, drawHeld, drawKnown, drawNote, halfWidth } from '../notes.js';
import { screenSwap } from './modes.js';

const clamp01 = x => Math.max(0, Math.min(1, x));
const learning = new Learning();

// the grades of the run so far teach the moves (each judged thing once); this run's own clean ones running, per move
let seenRun = null,
  seenFx = 0;
const streak = new Map();
function learn(run) {
  if (seenRun !== run) ((seenRun = run), (seenFx = 0), streak.clear());
  seenFx = Math.min(seenFx, run.fx.length);
  for (; seenFx < run.fx.length; seenFx++) {
    const e = run.fx[seenFx];
    // (a prop missed, a whiff, is a miss to learn from too, though it costs no life)
    if (e.o && (e.k === 'grade' || e.k === 'hit' || e.k === 'whiff')) {
      const k = lessonOf(e.o);
      learning.record(k, e.k === 'grade');
      streak.set(k, e.k === 'grade' ? (streak.get(k) ?? 0) + 1 : 0);
    }
  }
}
// how much of the small sign a move not yet known still gets: none once right three times running
const miniOf = (f, lesson) => 1 - Math.min(3, f.hints === 'always' ? (streak.get(lesson) ?? 0) : learning.ok(lesson)) / 3;

// the things with a note this frame, each { o, at, note, phase }: 'coming' from the cursor putting it down to a moment
// after its press; a held one then 'held' to the end of its hold, or 'broken' a moment if let go too early
function noted(f) {
  const { run, L, t, plan, marks } = f,
    out = [];
  // (a thing coming needs its place this frame; one being held rides with him, wherever its thing is drawn)
  for (const o of L.obs) {
    if (o.t > t + 6) break;
    const at = marks.get(o) ?? null,
      note = (at || o.dur) && t >= plan.placeT(o) ? noteOf(o, run, screenSwap(L, o.t)) : null;
    if (!note) continue;
    if (!note.held) {
      if (at && !o.res && t < o.t + 0.25) out.push({ o, at, note, phase: 'coming' });
      continue;
    }
    if (o.res === 'hit') {
      if (o.hitT >= o.t - 0.1 && t - o.hitT < 0.5) out.push({ o, at, note, phase: 'broken' });
    } else if (t < o.t) at && out.push({ o, at, note, phase: 'coming' });
    else if (t < o.t + o.dur + 0.3) out.push({ o, at, note, phase: 'held' });
  }
  return out;
}

// where a note may stand: inside the screen, below the safe area and the HUD's band (health, score, streak); which
// edge it is pinned to
function pin(f, [x, y], hw, R) {
  const { v } = f,
    top = ((f.safe?.t ?? 0) + 56) * v.dpr + R,
    mx = hw + R * 0.3,
    edge = x < mx ? 'left' : x > v.W - mx ? 'right' : y < top ? 'top' : y > v.H - R * 1.3 ? 'bottom' : null;
  return { x: Math.min(v.W - mx, Math.max(mx, x)), y: Math.min(v.H - R * 1.3, Math.max(top, y)), edge };
}
// the edge a thing from behind comes in at, lit in its colour on the beat
function lightEdge(f, edge, colour, a) {
  const { g, v } = f,
    w = edge === 'left' || edge === 'right' ? v.W * 0.1 : v.H * 0.1,
    gr =
      edge === 'left'
        ? g.createLinearGradient(0, 0, w, 0)
        : edge === 'right'
          ? g.createLinearGradient(v.W, 0, v.W - w, 0)
          : edge === 'top'
            ? g.createLinearGradient(0, 0, 0, w)
            : g.createLinearGradient(0, v.H, 0, v.H - w);
  gr.addColorStop(0, colour);
  gr.addColorStop(1, 'transparent');
  g.save();
  g.globalAlpha = a;
  g.fillStyle = gr;
  g.fillRect(0, 0, v.W, v.H);
  g.restore();
}

const beatsOf = (o, beat) => Math.max(1, Math.round(o.dur / beat));

function drawComing(f, list, R) {
  const { g, t, L, mf } = f,
    beat = L.A.beat,
    // (the buttons are pressed as keys are: their keys shown, not a swipe)
    touch = !!f.touch && f.controls !== 'buttons',
    run = (((t / beat) % 1) + 1) % 1,
    next = [...list].sort((a, b) => a.o.t - b.o.t);
  // (the far ones first, so the nearest is drawn on top)
  for (const n of [...list].sort((a, b) => b.o.t - a.o.t)) {
    const { o, note } = n,
      rank = next.indexOf(n),
      grow = rank < 2 ? clamp01(1 - (o.t - t) / (2 * beat)) : 0,
      known = f.hints === 'auto' && learning.known(note.lesson),
      r = R * (0.6 + ((known ? 0.85 : 1) - 0.6) * grow),
      at = pin(f, n.at, halfWidth(r, note, touch), R);
    if (at.edge && note.behind)
      lightEdge(f, at.edge, note.items[0].colour, (0.25 + 0.45 * grow) * (0.6 + 0.4 * mf.beat));
    const opts = {
      u: grow > 0 ? 1 - (o.t - t) / (2 * beat) : -1,
      flash: grow > 0 ? clamp01(1 - Math.abs(o.t - t) / 0.09) : 0,
      touch,
      run,
      beats: note.held ? beatsOf(o, beat) : 0,
    };
    g.save();
    g.globalAlpha = Math.max(0.75, clamp01(grow * 2.5));
    (known ? drawKnown : drawNote)(g, at.x, at.y, r, note, opts);
    // (the next one's small sign, over its note; never over the coach's own card's thing)
    if (rank === 0 && grow > 0 && f.teach?.card?.o !== o) drawMini(g, at.x, at.y - r * 2.3, R, note, touch, (t - o.t) / beat, miniOf(f, note.lesson) * clamp01(grow * 2));
    g.restore();
  }
}

// a held move's note riding over his head (moved there from its thing over a tenth of a second as it is pressed)
function drawRiding(f, list, R) {
  const { g, t, L, mf } = f,
    head = f.spots?.hero;
  if (!head) return;
  for (const { o, at, note, phase } of list) {
    const over = [head[0], head[1] - R * 2.4],
      k = phase === 'broken' || !at ? 1 : clamp01((t - o.t) / 0.12),
      from = at ?? over,
      p = pin(f, [from[0] + (over[0] - from[0]) * k, from[1] + (over[1] - from[1]) * k], R, R);
    if (phase === 'broken') {
      drawBroken(g, p.x, p.y, R, note, clamp01((t - o.hitT) / 0.5));
      continue;
    }
    const end = o.t + o.dur;
    drawHeld(g, p.x, p.y, R, note, {
      beats: beatsOf(o, L.A.beat),
      left: clamp01((end - t) / o.dur),
      beat: mf.beat,
      flash: t > end ? clamp01(1 - (t - end) / 0.3) : 0,
      touch: !!f.touch && f.controls !== 'buttons',
    });
  }
}

export function drawHints(f) {
  const { g, v, run } = f;
  if (run.mode === 'dead' || run.over || f.hints === 'off' || !f.marks) return;
  learn(run);
  // (a note's radius: about 3.4 % of the screen's short side, 15 to 24 CSS px, a little bigger under a finger)
  const R = Math.max(15, Math.min(24, (0.034 * Math.min(v.W, v.H)) / v.dpr)) * v.dpr * (f.touch ? 1.15 : 1);
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  const list = noted(f);
  drawComing(
    f,
    list.filter(n => n.phase === 'coming'),
    R,
  );
  drawRiding(
    f,
    list.filter(n => n.phase !== 'coming'),
    R,
  );
  g.restore();
}
