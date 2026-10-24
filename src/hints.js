// What a thing asks the player to press, as the hints show it (render/layers/hints.js draws it, main.js's lesson waits
// for it): the moves in their colours, each pointing the way it is pressed on the screen (a mirrored world kicks to
// the left, a world turned over jumps down), whether it is held, whether it may be left (a fork), whether it comes
// from behind; and how well each move is known on this device (a known move's note is drawn smaller, never dropped).
import { KINDS } from './kinds.js';

// one colour per move, everywhere (Muse Dash's: the art changes from place to place, the code never does)
export const MOVE_COLOUR = { jump: '#ffd84a', slide: '#5ee7ff', kick: '#ff8a3d', grab: '#c27bff' };
const MOVE = { jump: 'jump', slide: 'slide', right: 'kick', left: 'grab' },
  DIR = { jump: 'up', slide: 'down', right: 'right', left: 'left' };

// the actions a thing wants pressed (its press may depend on where he is: a lane, a flight's height)
export function actsOf(o, run) {
  const k = KINDS[o.type].action;
  if (k === 'chord') return o.keys;
  if (k === 'zone') return [o.key];
  if (k === 'lane') return o.free === undefined || o.free === run.lane ? [] : [o.free > run.lane ? 'right' : 'left'];
  if (k === 'alt') return o.lane === run.alt ? [] : [o.lane > run.alt ? 'jump' : 'slide'];
  return [k];
}
// a thing held through (a long ceiling, a rail, a line, a glide, a corridor, a shaft's force field); a gap's long jump
// and a crane's swing are one press
export const isHeld = o => !!o.dur && o.type !== 'hold' && o.type !== 'grab';
// the move a thing teaches, each learnt by itself (a rail is not a long ceiling, a boss's fist is not a pane)
export const lessonOf = o =>
  o.type === 'chord'
    ? `chord:${o.keys.join('+')}`
    : o.type === 'zone'
      ? `zone:${o.key}`
      : ['fist', 'bit', 'fork'].includes(o.skin)
        ? o.skin
        : o.type;
// the things he hangs from (reached up for)
const HANGS = new Set(['grab', 'zip']);
// a shaft's lanes get no note: the red-hot ledges and the lit free lane say where to be
const UNMARKED = new Set(['lane', 'gate']);

// the note a thing gets, or null; `swap` maps an action to the one it is on the screen now (modes.js screenSwap)
export function noteOf(o, run, swap = {}) {
  if (UNMARKED.has(o.type) || o.echo) return null;
  const acts = actsOf(o, run);
  if (!acts.length) return null;
  return {
    // (what hangs is reached up for: its own colour, the way of a jump)
    items: acts.map(a => ({ colour: HANGS.has(o.type) ? MOVE_COLOUR.grab : MOVE_COLOUR[MOVE[a]], dir: DIR[swap[a] ?? a] })),
    held: isHeld(o),
    optional: o.skin === 'fork',
    behind: o.type === 'foeback',
    lesson: lessonOf(o),
  };
}

// how well each move is known: right three times running and it is known, two misses running and it is not
export class Learning {
  constructor(key = 'sim.learn.2') {
    this.key = key;
    try {
      this.moves = JSON.parse(localStorage.getItem(key)) ?? {};
    } catch {
      this.moves = {};
    }
  }
  known(lesson) {
    return (this.moves[lesson]?.ok ?? 0) >= 3;
  }
  // its clean ones running
  ok(lesson) {
    return this.moves[lesson]?.ok ?? 0;
  }
  record(lesson, clean) {
    const m = (this.moves[lesson] ??= { ok: 0, miss: 0 });
    if (clean) Object.assign(m, { ok: m.ok + 1, miss: 0 });
    else if (++m.miss >= 2) m.ok = 0;
    try {
      localStorage.setItem(this.key, JSON.stringify(this.moves));
    } catch {}
  }
}
