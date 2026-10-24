// The player's input as timed gestures. A press: { acts: [action...], t: song time, alts?: [[action...]...], abs?, touch? }
// (an action: 'jump' | 'slide' | 'left' | 'right'; two at once is a chord), the overdrive { a: 'sync', t }, and
// { a: 'release', of: [action...], t } when it is let go (the key up, the finger lifted after its swipe): a hold's end.
// The shell (main.js) turns them into the run's actions: it swaps them for the way he runs and the way the world is
// turned (screen directions), keeps `abs` ones as they are (a tap means its action whichever way the world is), and
// picks among `alts` the one the obstacle at hand wants (a touch gesture is never exact). Active only while a run is
// being played (`enabled`).
//
// Touch, two schemes (`scheme`: settings 'controls', 'auto' = by how the phone is held):
// - one finger ('swipe', a phone held upright, one thumb): tap = jump; a swipe up = jump, down = slide, towards him
//   = kick, back = kick behind; up also reaches for what hangs; a diagonal = both (up and towards him: a jump and a kick at once); the finger
//   kept down after it = held (a slide, a glide, a dash, a grind, a zip). A second finger while the first is down =
//   the overdrive.
// - two thumbs ('zones', a phone held sideways): the left half's tap = jump, the right half's tap = a kick ahead; swipes
//   on either half as above; each thumb its own gesture, so a chord is both thumbs at once (Muse Dash's two zones).
// - buttons ('buttons', ui/pads.js: four big pads at the bottom, two under each thumb): a pad is pressed the way it
//   points on the screen, as an arrow key is, held while the finger stays on it; two pads at once, a chord. A finger
//   off the pads plays the one-finger scheme.
// A swipe's direction is read by its angle in eight sectors (the diagonals' wider: they are what the thumb gets wrong);
// one near a sector's edge also offers the neighbour, for the shell to choose. The gesture is stamped with the moment
// the finger landed (event.timeStamp, mapped onto the heard audio), so deciding it a moment later costs no timing; a
// finger kept still past DECIDE (or lifted before) is a tap. Where he moves between heights or lanes (a flight, a
// shaft: `stepping` says which way, 'v' or 'h'), the finger is followed after its swipe: every STEP further along that
// way is one more step (back the other way, a step back), so he goes where the finger goes. A mouse plays the
// one-finger scheme.
// Keys (by physical key, e.code): Space / ArrowUp / W jump, ArrowDown / S slide, ArrowRight / D kick (falling: lane
// right), ArrowLeft / A kick behind (falling: lane left); up also reaches for a bar or a line, Enter / Shift / E overdrive. Held keys are forgotten when the window
// loses focus.
// (CSS pixels per millimetre: a swipe is a distance on the glass, not in pixels)
const MM = 96 / 25.4,
  MOVE = Math.max(16, 4.5 * MM),
  DECIDE = 0.08,
  // (a flight's heights, a shaft's lanes: one swipe is one step, Subway Surfers'; a finger kept moving on after it, slowly
  // and on purpose (a flick is over in FLICK s), steps on every STEP more)
  STEP = 18 * MM,
  FLICK = 0.16,
  // the sectors (degrees from the nearest axis): within AXIS an axis, beyond it a diagonal; within EDGE of the border
  // the neighbour is offered too
  AXIS = 25,
  EDGE = 12;
const KEYS = {
  Space: 'jump',
  ArrowUp: 'jump',
  KeyW: 'jump',
  ArrowDown: 'slide',
  KeyS: 'slide',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  // the overdrive (Guitar Hero's star power, let loose)
  Enter: 'sync',
  ShiftLeft: 'sync',
  ShiftRight: 'sync',
  KeyE: 'sync',
};
// a swipe's actions by its screen direction (y up)
const vert = dy => (dy > 0 ? 'jump' : 'slide'),
  side = dx => (dx > 0 ? 'right' : 'left');
export function swipe(dx, dy) {
  const ax = Math.abs(dx),
    ay = Math.abs(dy),
    // degrees from the horizontal, 0..90
    deg = (Math.atan2(ay, ax) * 180) / Math.PI,
    h = [side(dx)],
    v = [vert(dy)],
    d = [vert(dy), side(dx)];
  if (deg < AXIS) return { acts: h, alts: deg > AXIS - EDGE ? [d] : [] };
  if (deg > 90 - AXIS) return { acts: v, alts: deg < 90 - AXIS + EDGE ? [d] : [] };
  return { acts: d, alts: deg < AXIS + EDGE ? [h] : deg > 90 - AXIS - EDGE ? [v] : [] };
}

export class Input {
  constructor(el, song, scheme = () => 'swipe', stepping = () => null, free = () => false, pads = null) {
    this.song = song;
    this.pads = pads;
    this.scheme = scheme;
    this.stepping = stepping;
    // (where a second finger is a gesture of its own, not the overdrive: a climb, swipe after swipe on the beat, the last
    // thumb often still on the glass as the next comes down)
    this.free = free;
    this.events = [];
    // the fingers down: pointerId -> its gesture
    this.ps = new Map();
    this.held = new Set();
    this.enabled = false;
    // what played last: a finger (the hints show gestures) or keys
    this.touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    const stamp = e => this.song.at(e.timeStamp);
    el.addEventListener('pointerdown', e => this.press(e, stamp(e)), { passive: false });
    el.addEventListener('pointermove', e => this.move(e), { passive: false });
    el.addEventListener('pointerup', e => this.lift(e, stamp(e)));
    el.addEventListener('pointercancel', e => this.lift(e, stamp(e)));
    // (iOS: a finger's touchstart not taken shows the loupe and lets an edge swipe go back a page)
    el.addEventListener('touchstart', e => this.enabled && e.preventDefault(), { passive: false });
    addEventListener('keydown', e => this.key(e, true, stamp(e)));
    addEventListener('keyup', e => this.key(e, false, stamp(e)));
    addEventListener('blur', () => this.forget());
    document.addEventListener('visibilitychange', () => document.hidden && this.forget());
  }
  // the overdrive's button (a finger's: main.js), stamped like a press
  overdrive(e) {
    e.preventDefault();
    e.stopPropagation();
    this.touch = true;
    this.push({ a: 'sync', t: this.song.at(e.timeStamp) });
  }
  forget() {
    for (const p of this.ps.values()) if (p.pad) this.pads.lit(p.pad, false);
    this.ps.clear();
    this.held.clear();
  }
  push(e) {
    if (this.enabled) this.events.push(e);
  }
  press(e, t) {
    if (!this.enabled) return;
    e.preventDefault();
    if (e.pointerType === 'touch' || e.pointerType === 'pen') this.touch = true;
    const scheme = this.scheme(),
      zones = e.pointerType !== 'mouse' && scheme === 'zones',
      pad = scheme === 'buttons' ? this.pads?.at(e.clientX, e.clientY) : null;
    // (one finger: a second one down meanwhile is the overdrive; two thumbs or the pads: each its own, two at most)
    if (this.ps.size && (!(zones || scheme === 'buttons' || this.free()) || this.ps.size >= 2)) return this.push({ a: 'sync', t });
    try {
      e.target.setPointerCapture?.(e.pointerId);
    } catch {}
    // (a pad: its way at once, nothing to wait for, as a key)
    if (pad) {
      const p = { t, pad };
      this.ps.set(e.pointerId, p);
      this.pads.lit(pad, true);
      return this.decide(p, { acts: [pad], touch: e.pointerType !== 'mouse' });
    }
    const right = e.clientX > innerWidth / 2;
    this.ps.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      t,
      tp: performance.now(),
      g: null,
      touch: e.pointerType !== 'mouse',
      tap: zones && right ? 'right' : 'jump',
    });
  }
  move(e) {
    const p = this.ps.get(e.pointerId);
    if (!p) return;
    // (the whole way the finger went this frame, not just its last point: a fast flick's angle)
    const last = e.getCoalescedEvents?.().at(-1) ?? e;
    if (p.g) return this.follow(p, last, e);
    const dx = last.clientX - p.x,
      dy = p.y - last.clientY;
    if (Math.hypot(dx, dy) >= MOVE) {
      this.decide(p, { ...swipe(dx, dy), touch: p.touch });
      // (where and when it was decided: the steps after it are counted from there)
      p.ax = last.clientX;
      p.ay = last.clientY;
      p.td = performance.now();
    }
  }
  // a swipe followed on (a flight's heights, a shaft's lanes): a step more each STEP the finger goes on that way
  follow(p, last, e) {
    const way = this.stepping();
    if (!way || p.ax === undefined || p.g.acts.length !== 1) return;
    const v = way === 'v',
      d = v ? p.ay - last.clientY : last.clientX - p.ax;
    // (the flick that made the swipe still running on: its own momentum, not a second step; its distance spent)
    if ((performance.now() - p.td) / 1000 < FLICK) {
      p.ax = last.clientX;
      p.ay = last.clientY;
      return;
    }
    if (Math.abs(d) < STEP) return;
    const k = Math.sign(d);
    if (v) p.ay -= k * STEP;
    else p.ax += k * STEP;
    const act = v ? (k > 0 ? 'jump' : 'slide') : k > 0 ? 'right' : 'left';
    this.push({ acts: [act], touch: p.touch, t: this.song.at(e.timeStamp) });
  }
  lift(e, t) {
    const p = this.ps.get(e.pointerId);
    if (!p) return;
    this.ps.delete(e.pointerId);
    if (p.pad) this.pads.lit(p.pad, false);
    // (a tap let go before it was decided: decided now, and let go at once, so nothing stays held)
    if (!p.g) this.tapOf(p);
    this.push({ a: 'release', of: p.g.acts, abs: p.g.abs, t });
  }
  // a finger kept still (or lifted first): its tap, which means the same whichever way the world is turned
  tapOf(p) {
    this.decide(p, { acts: [p.tap], abs: true, touch: p.touch });
  }
  decide(p, g) {
    g.t = p.t;
    p.g = g;
    this.push(g);
  }
  key(e, isDown, t) {
    const a = KEYS[e.code];
    if (!a || !this.enabled) return;
    e.preventDefault();
    this.touch = false;
    if (isDown) {
      if (e.repeat || this.held.has(e.code)) return;
      this.held.add(e.code);
      this.push(a === 'sync' ? { a, t } : { acts: [a], t });
    } else {
      this.held.delete(e.code);
      if (a !== 'sync' && ![...this.held].some(c => KEYS[c] === a)) this.push({ a: 'release', of: [a], t });
    }
  }
  // the gestures since the last call; a finger still in place past the decide time is a tap
  take() {
    const now = performance.now();
    for (const p of this.ps.values()) if (!p.g && (now - p.tp) / 1000 > DECIDE) this.tapOf(p);
    const out = this.events;
    this.events = [];
    return out;
  }
}
