// The bot (tests, ?bot=1): presses each obstacle's action on its press moment (kinds.js), takes each fall's lane a
// little before it matters, lets go of each hold as its note ends. `offset` presses that much late (or early, negative): how forgiving the timing is.
// Returns the actions a player would have pressed this step.
import { KINDS } from './kinds.js';

// the actions that beat a thing (a chord's, a diagonal's two keys at once), and how long they are held after (a hold's
// note; a gap's long jump and a crane's swing are one press): what the bot presses, and the coach when it helps him over
export const pressesOf = o => (o.keys ? [...o.keys] : [o.type === 'zone' ? o.key : KINDS[o.type].action]);
export const heldFor = o => (o.dur && o.type !== 'hold' && o.type !== 'grab' ? o.dur : 0);

export class Bot {
  constructor(level, { offset = 0 } = {}) {
    this.level = level;
    this.offset = offset;
    this.done = new Set();
    this.releases = [];
    // (a test of the freestyle, window.__FREE: strings of its moves on the free beats)
    this.free = !!globalThis.__FREE || !!globalThis.__MASH;
    this.fk = 0;
    this.rest = 0;
    this.lastBeat = -1;
  }
  // on each beat with nothing near and him free of his last move, the next press of a string (every way in turn);
  // after five, two beats of nothing, so the string lands
  freestyle(run, t, ev) {
    const L = this.level,
      beat = L.A.beat,
      b = L.A.beats.findLast(q => q <= t);
    if (b === undefined || b <= this.lastBeat) return;
    this.lastBeat = b;
    if (run.mode !== 'run' || run.fly || run.swing || run.hold2) return;
    // (a test of a player who keeps on freestyling through everything, window.__MASH: that key on every beat)
    if (globalThis.__MASH) {
      if (!L.obs.some(o => !o.res && Math.abs(o.t - b) < 0.2)) ev.push({ a: globalThis.__MASH, t: b });
      return;
    }
    if (this.rest > 0) return void this.rest--;
    const busy = run.jump || run.slide || run.strike || (run.brk && b < run.brk.t1 - 0.05) || (run.dance && b < run.dance.t0 + 2 * beat - 0.05);
    if (busy || L.obs.some(o => !o.res && o.t > b - 0.5 * beat && o.t < b + 2.5 * beat && o.type !== 'lane')) return;
    const keys = ['jump', 'slide', 'right', 'left', 'slide', 'jump', 'right', 'slide'];
    ev.push({ a: keys[this.fk % keys.length], t: b });
    if (++this.fk % 5 === 0) this.rest = 2;
  }
  step(run, t) {
    const ev = [],
      obs = this.level.obs;
    for (const o of obs) {
      if (o.type === 'lane' || o.type === 'gate' || o.type === 'ring') continue;
      // (an obstacle's own lateness, for a test of how forgiving it is)
      const at = o.t + this.offset + (o.botOff ?? 0);
      if (this.done.has(o) || at > t) continue;
      this.done.add(o);
      // (a chord: both its keys)
      if (o.keys) {
        for (const k of pressesOf(o)) ev.push({ a: k, t: at });
        continue;
      }
      const a = pressesOf(o)[0];
      ev.push({ a, t: at });
      // (a hold: let go as the note ends)
      if (heldFor(o)) this.releases.push([at + heldFor(o), a]), this.releases.sort((p, q) => p[0] - q[0]);
    }
    while (this.releases.length && this.releases[0][0] <= t) {
      const [rt, of] = this.releases.shift();
      ev.push({ a: 'release', t: rt, of });
    }
    if (this.free) this.freestyle(run, t, ev);
    // the overdrive let loose when full, or half full on a drop
    if (!run.od && (run.sync >= 1 || (run.sync >= 0.5 && this.level.A.bars.some(b => b.dropStart && Math.abs(b.t0 - t) < 0.02)))) ev.push({ a: 'sync', t });
    // (a flight: up or down to the next ring's height, a little before it)
    const ring = obs.find(o => o.type === 'ring' && o.t > t && o.t - t < 0.4 && run.alt !== o.lane);
    if (ring && !this.done.has(ring)) {
      this.done.add(ring);
      ev.push({ a: ring.lane > run.alt ? 'jump' : 'slide', t });
    }
    const lane = obs.find(o => (o.type === 'lane' || o.type === 'gate') && o.t > t && o.t - t < 0.35 && run.lane !== o.free);
    if (lane) ev.push({ a: lane.free > run.lane ? 'right' : 'left', t });
    return ev;
  }
}
