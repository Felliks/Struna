// The AI cursor's plan: what it does for each obstacle and when, made once per run, then read as a pure function of
// song time (so it glides, as in the parkour video: it never jumps from place to place).
//   carry   it flies over the obstacle's place holding it, hovers (bouncing it on the beat, the place blinking), and
//           slams it down two beats before he goes past it (one at least): the slam is the call, his move the answer
//   paint   a tall wall, painted in with a brush, stroke by stroke from the roof up
//   select  a gap: a marquee dragged over the roof, deleted on the beat
//   delete  the same for the roof under him before a fall
//   carry   (again) the spring he is launched up a shaft from, slammed down a beat before he steps on it
//   paste   a ledge in his lane in a shaft, pasted in with a flash well before he gets there (one lane of three, so
//           seeing where it goes is enough to get out of its way)
// Actions never overlap: each starts when the last has ended, at most two beats before its own beat. The plan is in
// distance (the run's), its points on stage (stage.js), so the cursor glides on from one stretch to the next.
import { BEAM, KINDS, beamAt } from '../kinds.js';
import { ALT } from '../run.js';
import { onStage } from './stage.js';
import { foeX } from './layers/clones.js';
import { threatX, throwerX } from '../props.js';
import { beatBump, clamp, lerp, smooth } from './util.js';

// how far the camera pulls back over a ladder of islands on a phone held upright (renderer.js), so the next island is
// in view before the leap for it
export const LADDER_ZOOM = 0.8;

// how tall a thing the cursor carries stands (an obstacle by its kind, anything else by its own height)
// (a part played mini scales what hangs over him: level.js)
export const topOf = o => (KINDS[o.type]?.top(o) ?? o.h) * (o.mini ?? 1);

const AFTER = 0.12,
  // (how long it takes to swing over to him when it takes him by the scruff or lets him go)
  BLEND = 0.2;

// how far along a move from `from` to `to` the cursor is at t, a hand's aimed move (Flash & Hogan's minimum jerk, its
// speed peaking early, Fitts: a short hop takes less time): it still arrives on its beat at t1, setting off later the
// shorter the move; a long one overshoots a little and settles back onto its mark
function reach(t0, t1, t, from, to) {
  const D = Math.hypot(to[0] - from[0], to[1] - from[1]),
    T = Math.min(t1 - t0, 0.14 + 0.1 * Math.log2(1 + D / 0.4)),
    u = clamp((t - (t1 - T)) / (T || 1e-6), 0, 1),
    w = 1 - (1 - u) ** 1.4,
    over = clamp((D - 1.5) * 0.015, 0, 0.06);
  return w * w * w * (10 - 15 * w + 6 * w * w) + over * Math.sin(Math.PI * clamp((u - 0.55) / 0.45, 0, 1)) ** 2;
}

export class CursorPlan {
  // view: { vw, lead } of the camera that will show it
  constructor(run, view) {
    this.run = run;
    this.L = run.L;
    this.view = { vw: view.vw, vh: view.vh, lead: view.lead };
    this.placed = new Map();
    this.pads = new Map();
    // (a fork's two routes: each thing of the easy one and its twin on the hard one (level.js forks: the same thing at
    // the same moment, doubled into a chord); the cursor brings the easy one, and the hard one if that route is taken)
    this.twins = new Map();
    for (const h of this.L.obs) {
      if (h.hard === undefined) continue;
      const e = this.L.obs.find(q => q.easy === h.hard && q.t === h.t);
      if (e) (this.twins.set(e, h), this.twins.set(h, e));
    }
    this.acts = this.build();
    for (const a of this.acts) {
      a.from = this.aim(a.t0 - 1e-4).p;
      a.end = this.spot(a);
    }
  }
  // when an obstacle stands in the world (the cursor has put it there); before that it is only in its hand
  // (a fork's hard route: from when the cursor puts its easy twin down, as that is what it puts down once the route is
  // taken (taken()), not popping in later in the place left empty)
  placeT(o) {
    return this.placed.get(o) ?? (o.hard !== undefined && this.twins.has(o) ? this.placed.get(this.twins.get(o)) : undefined) ?? o.t - 0.6;
  }
  // what the cursor has in its hand for o: o, or once a fork's hard route is taken, its twin on that route (the easy one
  // is gone from the world then: carried and slammed down, it would vanish as it landed)
  taken(o) {
    return o.easy !== undefined && this.run.routes?.[o.easy] === 'hard' ? (this.twins.get(o) ?? o) : o;
  }
  // the spring for a launch up shaft s
  padOf(s) {
    if (!this.pads.has(s)) this.pads.set(s, { type: 'pad', skin: 'pad', x: s.x, y: s.y0, h: 0.35, t: s.t0, seg: this.L.segs[this.L.segs.indexOf(s) - 1] ?? s });
    return this.pads.get(s);
  }
  build() {
    const L = this.L,
      beat = L.A.beat,
      items = [];
    for (const o of L.obs) {
      // (an echo bar is played from memory: the cursor does not draw it; a fork's hard route pops in if taken)
      if (o.echo || o.hard !== undefined) continue;
      // (a climb's beams: pasted into the sky over its place (ctrl+V), falling free from that moment (kinds.js beamAt),
      // one a beat, the act a beat long; the road's edge is no thing: its note is there all along)
      if (o.type === 'tic') {
        if (o.floor) this.placed.set(o, o.t - 20);
        // (the first beam pasted two beats earlier, hung in the sky over its place till it is let go: seen coming, a hold
        // to make for, before the leap off the road at it)
        else items.push({ o, kind: 'paste', ts: o.t - BEAM.T - (o.k === 1 ? 2 * L.A.beat : 0), span: 0.9 * L.A.beat });
        continue;
      }
      // (an island stretch is cut out at once, by its first leap's marquee: the others are there from that moment, below)
      if (o.type === 'hold' && o.isle !== undefined && o.k > 0) continue;
      // (a ladder of islands: the road ahead cut away by the cursor (a marquee over it, deleted), its first island
      // sinking to its height, two beats and more before the first leap, once the edge is in view; each island after it
      // pasted in ahead of him once he is down on the one before, and in view (the camera widened over a ladder,
      // renderer.js), in time to read it before he leaps for it; a leap's note there from when the island it is off is)
      if (o.type === 'leap' || o.type === 'roll') {
        const is = L.isles[o.isle],
          u = o.air / 2;
        if (o.type === 'leap' && o.k === 0) items.push({ o, kind: 'select', ts: Math.min(o.t - 2 * u, Math.max(this.visibleT(o.edge) + 0.04, o.t - 4 * u)) });
        else if (o.type === 'roll' && o.k > 0) {
          const lp = is.leaps[o.k],
            x = is.pieces[o.k].x0 + 1;
          items.push({ o, kind: 'paste', ts: Math.min(lp.t - Math.max(0.7, u), Math.max(is.rolls[o.k - 1].t + 0.25 * u, this.visibleT(x, LADDER_ZOOM) + 0.04)), span: 0.8 * u });
        }
        continue;
      }
      // (a thrower (level.js props): copied off him and pasted on its rooftop a moment before it winds up)
      if (o.type === 'bat') {
        items.push({ o, kind: 'clone', ts: o.tr - 1.5 * beat });
        continue;
      }
      const kind = KINDS[o.type].cursor(o);
      if (kind === 'paste') {
        items.push({ o, kind, ts: this.pasteT(o) });
        continue;
      }
      // two beats before its press (more if that is too little to read it: 0.7 s for a chill song, 0.45 s for a hard
      // one, the reaction times rhythm games give), fewer only while it is not yet in view; a clone from behind four
      // (it comes from where he is not looking, the edge behind him a phone held upright barely shows)
      const v = this.visibleT(o.type === 'hold' || o.type === 'long' || o.type === 'glide' || o.type === 'zip' || o.type === 'dash' ? o.x0 : o.type === 'grab' ? o.barX - 0.6 : o.type === 'throw' ? o.tx - 1 : o.x - 0.4),
        latest = o.press - 0.12,
        read = 0.7 - 0.25 * L.profile.arousal,
        kMin = Math.ceil(read / (beat / 2));
      let k = Math.max(o.type === 'foeback' ? 8 : 4, kMin);
      while (k > kMin && o.t - (k * beat) / 2 < v + 0.04) k--;
      const ts = Math.min(latest, Math.max(o.t - (k * beat) / 2, v + 0.04));
      items.push({ o, kind, ts });
    }
    for (const s of L.segs)
      if (s.kind === 'fall') items.push({ s, kind: 'delete', ts: s.t0 });
      else if (s.kind === 'rise' && !s.climb) items.push({ o: this.padOf(s), kind: 'carry', ts: Math.max(this.visibleT(s.x - 0.5) + 0.04, s.t0 - beat) });
    items.sort((a, b) => a.ts - b.ts);
    const acts = [];
    let free = -1;
    for (const it of items) {
      if (it.o) this.placed.set(it.o, it.ts);
      const span = it.span ?? { carry: 2, paint: 1.8, select: 1.6, delete: 1.6, paste: 1.2, clone: 2 }[it.kind] * beat,
        t0 = Math.max(free + 0.04, it.ts - span);
      // no time for it: the obstacle pops in on its beat without the cursor
      if (it.ts - t0 < 0.12) continue;
      acts.push({ ...it, t0 });
      free = it.ts + (it.kind === 'carry' ? 0.06 : 0.1);
    }
    // (an island stretch's leaps are there with it: its islands are cut out at once)
    for (const is of L.isles ?? []) for (const o of is.gaps) if (o !== is.head) this.placed.set(o, this.placeT(is.head));
    // (a ladder: its first island there with the cut, each leap's note with the island it is off)
    for (const is of L.isles ?? [])
      if (is.ladder) {
        this.placed.set(is.rolls[0], this.placeT(is.head));
        for (const [k, o] of is.leaps.entries()) if (k) this.placed.set(o, this.placeT(is.rolls[k - 1]));
      }
    return acts;
  }
  // when to paste a ledge in a shaft: as soon as its place is in view ahead of him (the shaft camera keeps him near the
  // top falling, near the bottom flying up), at most 1.2 s and at least 0.6 s before he gets there
  pasteT(o) {
    // (a ring of a flight: as a thing on a run is put down, two beats ahead, once its place is in view)
    if (o.type === 'ring') return Math.max(this.visibleT(o.x) + 0.04, o.t - 2 * this.L.A.beat);
    const s = o.seg,
      ahead = this.view.vh * 0.8 - 0.8,
      y = this.run.shaftY(s, o.t);
    let t = o.t - 0.6;
    while (t > o.t - 1.2 && t > s.t0 && Math.abs(this.run.shaftY(s, t - 0.02) - y) < ahead) t -= 0.02;
    return t;
  }
  // the first moment x is on screen (the run camera rides the hero `lead` in from the left; `zoom` under 1 when it is
  // widened, a phone held upright over a ladder)
  visibleT(x, zoom = 1) {
    const { xAt, A } = this.L,
      z = this.view.vw < this.view.vh ? zoom : 1,
      vw = this.view.vw / z,
      lead = this.view.lead / z;
    let lo = -2,
      hi = A.dur + 2;
    for (let i = 0; i < 40; i++) {
      const m = (lo + hi) / 2;
      if (xAt(Math.max(0, m)) - lead + vw - 0.45 >= x) hi = m;
      else lo = m;
    }
    return hi;
  }
  // the stretch the roof before shaft s is
  before(s) {
    return this.L.segs[this.L.segs.indexOf(s) - 1] ?? s;
  }
  // the point it finishes each action at (on stage)
  spot(a) {
    const o = a.o;
    if (o?.type === 'ring') return [onStage(o.seg, o.x), o.y + ALT[o.lane] + 0.3];
    // (a beam: pasted where it is let go, at its middle)
    if (o?.type === 'tic') {
      const B = beamAt(o, o.t - BEAM.T);
      return [onStage(o.seg, B.x), B.y];
    }
    // (an island of a ladder: pasted where he will touch down on it)
    if (a.kind === 'paste' && o?.type === 'roll') return [onStage(o.seg, o.x), o.y + 0.3];
    if (a.kind === 'paste') return [onStage(o.seg, this.run.laneXOf(o.seg, o.type === 'gate' ? o.free : (o.lanes?.[0] ?? 1))), o.y + 0.5];
    if (a.kind === 'delete') return [onStage(this.before(a.s), a.s.x + 2.35), a.s.y0 - 1.0];
    if (a.kind === 'select') return [onStage(o.seg, o.selX1 ?? o.x1), (o.yFrom ?? o.y) - 1.0];
    if (o.type === 'long') return [onStage(o.seg, o.x1), o.y + 1.35];
    // (a beam: held by its top where it is let go)
    if (o.type === 'tic') {
      const B = beamAt(o, o.t - BEAM.T),
        h = B.look.len / 2;
      return [onStage(o.seg, B.x - Math.sin(B.rot) * h), B.y + Math.cos(B.rot) * h];
    }
    if (o.type === 'foe' || o.type === 'foeback') return [onStage(o.seg, foeX(this.L, o, a.ts)), o.y + 2.1];
    // (a thrower on its rooftop; a throw's target where it stands)
    if (o.type === 'bat') return [onStage(o.seg, throwerX(this.L, o, a.ts)), o.y + o.th + 2.1];
    if (o.type === 'throw') return [onStage(o.seg, threatX(this.L, o, a.ts)), o.y + o.ty + 0.9];
    return [onStage(o.seg, o.x), o.y + topOf(o) + 0.12];
  }
  // idle: up and ahead of him, bobbing on the beat, and while a voice sings, riding its melody (up as it goes up: the
  // AI singing along, its trail drawing the tune)
  idle(t) {
    const L = this.L,
      s = L.segAt(Math.max(0, t)),
      A = L.A,
      i = Math.max(0, Math.min((A.env.voice?.length ?? 1) - 1, Math.floor(t * A.fps))),
      sing = A.env.voice ? A.env.voice[i] * (A.env.pitch[i] - 0.45) * 2.4 : 0,
      b = beatBump(t, L.A.beats[0] ?? 0, L.A.beat) + sing;
    // (a climb: up where it lets the beams go, over the middle, ready with the next)
    if (s.climb) return [onStage(s, s.x + 0.6 * Math.sin(t * 1.3)), s.y0 + (s.y1 - s.y0) * Math.min(1, Math.max(0, (t - s.t0) / (s.t1 - s.t0))) + 7.5 + 0.15 * b];
    if (L.vertical(s)) return [onStage(s, s.x + 1.9 + 0.3 * Math.sin(t * 0.9)), this.run.shaftY(s, t) + (s.kind === 'rise' ? 2.8 : 1.6) + 0.1 * b];
    // (a cursor chase, modes.js: it runs from him, low and just ahead, skittering on the beat)
    if (L.modeAt?.(t) === 'cursorchase') return [onStage(s, L.xAt(Math.max(0, t)) + 2.6 + 0.4 * Math.sin(t * 3)), s.y0 + 0.5 + 0.35 * b];
    return [onStage(s, L.xAt(Math.max(0, t)) + this.view.vw * 0.55 + 0.3 * Math.sin(t * 0.7)), s.y0 + 3.3 + 0.25 * Math.sin(t * 1.1) + 0.12 * b];
  }
  // how far the brush has got on a painted wall (0..1)
  paintU(o, t) {
    const a = this.acts.find(q => q.o === o);
    if (!a) return 1;
    const tb = a.t0 + Math.min(0.35, (a.ts - a.t0) * 0.35);
    return clamp((t - tb) / (a.ts - tb), 0, 1);
  }
  // the cursor at t, as drawn: where its plan has it, but taking him by the scruff or letting him go (or put back with
  // him) it swings over from where it was, never jumping there
  at(t) {
    const c = this.aim(t),
      sw = this.swing,
      key = !!c.scruff;
    // (a frame back in time, or far on: a seek, nothing to swing from)
    if (!sw || t < sw.t - 0.05 || t > sw.t + 0.5) this.swing = { key, t, p: c.p, off: null, t0: t };
    else {
      if (key !== sw.key) Object.assign(sw, { key, off: [sw.p[0] - c.p[0], sw.p[1] - c.p[1]], t0: t });
      // (the gap to where it was eased out, while it follows its new mark)
      const u = sw.off ? smooth(sw.t0, sw.t0 + BLEND, t) : 1;
      if (u < 1) c.p = [c.p[0] + sw.off[0] * (1 - u), c.p[1] + sw.off[1] * (1 - u)];
      Object.assign(sw, { t, p: c.p });
    }
    return c;
  }
  // the cursor at t by its plan: { p: [x, y] its tip in the world, tool, press 0..1, held: {o, appear}, box, act }
  aim(t) {
    // (a climb he has fallen off: it has him, by the scruff, carrying him to his next mark)
    const cp = this.run.climbPose,
      cs = cp?.carry ? this.L.segAt(t) : null;
    if (cs?.climbPts) return { p: [onStage(cs, cp.x), cp.y + 2.45], tool: 'hand', press: 0.7, scruff: true };
    // (fallen in a gap: it has him the same way, carrying him over it)
    // (or tucked too soon in a leap and short of the island: the same, putting him on it)
    if (this.run.short?.c && t - this.run.short.c.t0 > 0.1) return { p: [onStage(this.L.segAt(t), this.run.heroX(t)), this.run.y + 2.45], tool: 'hand', press: 0.7, scruff: true };
    const rs = this.run.respawn;
    if (rs && t - rs.t0 > 0.2) return { p: [onStage(this.L.segAt(t), this.run.heroX(t)), this.run.y + 2.45], tool: 'hand', press: 0.7, scruff: true };
    const F = this.L.finale;
    if (F && t >= F.t0 - 0.6) return this.gloat(F, t);
    let a = null,
      prev = null;
    for (const q of this.acts) {
      if (q.t0 > t) break;
      if (t <= q.ts + AFTER) a = q;
      else prev = q;
    }
    let press = 0;
    for (const q of this.acts) if (t >= q.ts && t < q.ts + 0.35) press = Math.max(press, 1 - (t - q.ts) / 0.35);
    if (!a) {
      const idle = this.idle(t);
      if (!prev?.end) return { p: idle, tool: 'arrow', press };
      const u = reach(prev.ts + AFTER, prev.ts + 0.7, t, prev.end, idle);
      return { p: [lerp(prev.end[0], idle[0], u), lerp(prev.end[1], idle[1], u)], tool: 'arrow', press };
    }
    return { ...this.work(a, t), press, act: a };
  }
  // the finale: it comes down in front of him where his flying knee will be, bobbing and laughing on the beat, until it
  // is smashed (gone)
  gloat(F, t) {
    const L = this.L,
      s = L.segAt(F.hit),
      A = L.A,
      at = [onStage(s, L.xAt(F.hit) + 0.6), s.y0 + 3.0],
      from = this.idle(F.t0 - 0.6),
      u = smooth(F.t0 - 0.6, F.t0, t),
      b = beatBump(t, A.beats[0] ?? 0, A.beat);
    // (deleting the world it stays, pressing; an ascension or a sunrise it is gone before)
    const gone = F.kind === 'ascend' || F.kind === 'dawn' ? t >= F.t0 : F.kind === 'delete' ? false : t >= F.hit;
    return { p: [lerp(from[0], at[0], u), lerp(from[1], at[1], u) + 0.25 * b], tool: 'arrow', press: F.kind === 'delete' && t >= F.hit ? 1 : b * 0.6, taunt: F.kind !== 'delete' || t < F.hit, gone };
  }
  work(a, t) {
    const [tx, ty] = a.end ?? this.spot(a),
      from = a.from ?? [tx, ty + 1],
      d = a.ts - a.t0,
      o = a.o,
      A = this.L.A;
    if (a.kind === 'carry') {
      // fly over its place holding it (an arc), hover (bouncing it on the beat), slam
      const hover = [tx, ty + (topOf(o) > 1.2 ? 0.7 : 1.1)],
        ta = a.t0 + Math.min(0.5, d * 0.5),
        tdrop = a.ts - Math.min(0.1, d * 0.3);
      let p;
      if (t < ta) {
        const u = reach(a.t0, ta, t, from, hover);
        p = [lerp(from[0], hover[0], u), lerp(from[1], hover[1], u) + Math.sin(Math.min(1, u) * Math.PI) * 0.35];
      } else if (t < tdrop) p = [hover[0], hover[1] + 0.08 * beatBump(t, A.beats[0] ?? 0, A.beat)];
      else {
        const u = clamp((t - tdrop) / (a.ts - tdrop), 0, 1);
        p = [hover[0], lerp(hover[1], ty, u * u)];
      }
      const holding = t < a.ts;
      return { p, tool: holding ? 'hand' : 'arrow', held: holding ? { o: this.taken(o), appear: smooth(a.t0, a.t0 + 0.12, t) } : null };
    }
    if (a.kind === 'clone') {
      // copy and paste him: a marquee dragged round him (ctrl+C), then over to where the copy goes, a click (ctrl+V)
      const L = this.L,
        s = L.segAt(t),
        hx = onStage(s, L.xAt(t)),
        hy = s.y0,
        tb = a.t0 + Math.min(0.45, d * 0.45);
      if (t < tb) {
        const c0 = [hx - 0.6, hy + 2.1],
          u = reach(a.t0, a.t0 + (tb - a.t0) * 0.4, t, from, c0),
          w = smooth(a.t0 + (tb - a.t0) * 0.4, tb, t),
          c1 = [hx + 0.6, hy - 0.05];
        const p = w > 0 ? [lerp(c0[0], c1[0], w), lerp(c0[1], c1[1], w)] : [lerp(from[0], c0[0], u), lerp(from[1], c0[1], u)];
        return { p, tool: 'arrow', box: w > 0 ? { x0: c0[0], y0: c0[1], x1: p[0], y1: p[1] } : null };
      }
      const u = reach(tb, a.ts - 0.04, t, [hx + 0.6, hy], [tx, ty]);
      return { p: [lerp(hx + 0.6, tx, u), lerp(hy, ty, u) + Math.sin(Math.min(1, u) * Math.PI) * 0.8], tool: 'arrow', copy: t < a.ts };
    }
    if (a.kind === 'paint' && o.type === 'long') {
      // a long ceiling: to its near end, then one sweep along it, the brush wagging on the beat
      const tb = a.t0 + Math.min(0.3, d * 0.3),
        x0 = onStage(o.seg, o.x0),
        x1 = onStage(o.seg, o.x1),
        y = o.y + 1.35;
      if (t < tb) {
        const u = reach(a.t0, tb, t, from, [x0, y]);
        return { p: [lerp(from[0], x0, u), lerp(from[1], y, u)], tool: 'brush' };
      }
      const u = clamp((t - tb) / (a.ts - tb), 0, 1);
      return { p: [lerp(x0, x1, u), y + 0.15 * Math.sin(u * 20)], tool: t < a.ts + 0.05 ? 'brush' : 'arrow' };
    }
    if (a.kind === 'paint') {
      // to the wall's foot, then strokes across it, rising
      const tb = a.t0 + Math.min(0.35, d * 0.35),
        w = o.type === 'smash' ? 0.3 : 0.5,
        x0 = onStage(o.seg, o.x) - w / 2;
      if (t < tb) {
        const u = reach(a.t0, tb, t, from, [x0, o.y + 0.05]);
        return { p: [lerp(from[0], x0, u), lerp(from[1], o.y + 0.05, u)], tool: 'brush' };
      }
      const u = clamp((t - tb) / (a.ts - tb), 0, 1),
        z = Math.abs(((u * 7) % 2) - 1);
      // (strokes across, course by course, rising)
      return { p: [x0 + w * z, o.y + 0.05 + o.h * u], tool: t < a.ts + 0.05 ? 'brush' : 'arrow' };
    }
    if (a.kind === 'select' || a.kind === 'delete') {
      // to the near corner, the drag to the far one, the press (delete)
      const [cx0, cy0] = a.kind === 'select' ? [onStage(o.seg, o.x0), (o.yFrom ?? o.y) + 0.45] : [onStage(this.before(a.s), a.s.x - 2.35), a.s.y0 + 0.45],
        tb = a.t0 + Math.min(0.3, d * 0.35);
      if (t < tb) {
        const u = reach(a.t0, tb, t, from, [cx0, cy0]);
        return { p: [lerp(from[0], cx0, u), lerp(from[1], cy0, u)], tool: 'arrow' };
      }
      const u = reach(tb, a.ts - 0.04, t, [cx0, cy0], [tx, ty]),
        p = [lerp(cx0, tx, u), lerp(cy0, ty, u)];
      return { p, tool: 'arrow', box: t < a.ts ? { x0: cx0, y0: cy0, x1: p[0], y1: p[1], kill: a.kind === 'delete' } : null };
    }
    // paste: an arc to the lane
    const u = reach(a.t0, a.ts - 0.05, t, from, [tx, ty]);
    return { p: [lerp(from[0], tx, u), lerp(from[1], ty, u) + Math.sin(Math.min(1, u) * Math.PI) * 0.6], tool: 'arrow' };
  }
}
