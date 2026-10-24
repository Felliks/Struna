// What a song draws for the first time is made while it loads, not on the frame it first shows (a first act of a
// kind, a lens, a boss card, a lid burst on a drop each cost their first frame tens of milliseconds: new canvases,
// gradients, fonts, glyphs, code run for the first time). Two parts:
// - warmRun: from the run's first frame (drawn out of sight while it loads, renderer.prewarm), what is known to be
//   needed: the source's glyphs (a secret), the cards' big words, each lid's pieces cut;
// - rehearse: the song's moments that first draw something new (moments) each drawn out of sight on a run of its own
//   that is never played, then the renderer put back as it was.
import { warmKana } from './util.js';
import { prepHatch } from './shafts/index.js';
import { warmCards } from './layers/character.js';
import { forgetSaid } from './layers/system.js';

// what the run will need made before it starts, from its first frame f: the source's glyphs (a secret), the cards' big
// words, each lid's pieces cut at the moment it is burst (its music and colours then, in its place)
export function warmRun(R, f) {
  const L = f.L;
  try {
    if (L.secret?.kind === 'source') warmKana(['#5dff8f', '#d8ffe4', '#50ff8c']);
    warmCards(f);
    // (at the camera's own scale, not pulled back for a climb: the scale it bursts at)
    const v = { ...f.v, ppm: f.v.ppm0 ?? f.v.ppm };
    for (const o of L.obs) {
      if (o.type !== 'hatch') continue;
      const place = L.placeAt?.(o.t) ?? L.place,
        lk = R.looks[place] ?? R.look;
      prepHatch({ ...f, v, t: o.t, mf: R.fx(o.t), T: lk.palAt(o.t, true), place }, o);
    }
  } catch (e) {
    console.error('warmRun:', e);
  }
}

// the moments of a song that first draw something new: each act's start, each kind of stretch, a flight, the islands,
// the boss, the secret, the finale, the second place, each of its lenses, a freestyle window, each cursor tool, and each
// kind of thing in his way where none of those shows one (sorted song times)
export function moments(L, look) {
  const beat = L.A.beat,
    out = new Map(),
    at = (key, t) => t >= 0 && t < L.A.dur && !out.has(key) && out.set(key, t);
  for (const a of L.acts ?? []) at(`act:${a.mode}`, a.t0 + beat);
  for (const s of L.segs) at(`seg:${s.kind}:${!!s.climb}:${!!s.step}:${!!s.ledge}`, s.t0 + Math.min(beat, (s.t1 - s.t0) / 2));
  for (const s of L.segs) if (s.place !== L.place) at(`place:${s.place}`, s.t0 + beat);
  for (const w of L.flights ?? []) at('flight', w.t0 + beat);
  for (const q of L.isles ?? []) at(q.stairs ? 'stairs' : 'isle', q.t0 + 0.5 * beat);
  if (L.boss) (at('boss', L.boss.t0 + 0.5), at('boss2', L.boss.t0 + 3.5));
  if (L.secret) at('secret', L.secret.t0 + beat);
  if (L.finale) (at('finale', L.finale.t0 + beat), at('finale2', L.finale.hit));
  for (const q of L.free ?? []) at('free', q[0] + 0.25);
  for (const q of L.tools ?? []) at(`tool:${q.tool}`, q.t0 + 0.5);
  // (each kind of thing in his way, coming, where no moment above shows one already)
  const near = t => [...out.values()].some(u => u >= t && u - t < 3 * beat);
  for (const o of L.obs) if (!out.has(`obs:${o.type}`) && !near(o.t - 2 * beat)) at(`obs:${o.type}`, o.t - 2 * beat);
  // (the lenses: the first moment each is on, a beat into its drop)
  const list = look?.lenses ?? [look?.lens];
  for (let t = 0; t < L.A.dur; t += beat) {
    const s = L.lensSlot?.(t);
    if (s && s.kind !== 'pre' && s.since >= beat) at(`lens:${list[s.k % list.length]}`, t);
  }
  return [...out.values()].sort((a, b) => a - b);
}

// the song rehearsed while it loads (main.js start, during the diagnosis): its moments each drawn twice (a frame and the
// next), out of sight, on `run`, a Run of the level that is never stepped (only placed: his height and mode at each
// moment, what he has passed marked beaten), the overdrive on at the first drop and the source's inside shown if the
// song has one. Then the renderer's own state is put back and reset, the level's things unmarked (the Run that plays
// clears them anyway) and the system's lines' decisions forgotten, so the run that plays starts as if nothing had been
// drawn. Yields every few moments so the page stays live. Returns how many moments it drew. `enough()` true stops it
// early: the song's moments are rehearsed in order, so a slow device that has not done them all by the time the song is
// ready to play has done the first (the rest drawn for the first time as they come, as before there was a rehearsal)
export async function rehearse(R, run, yieldEvery = 2, enough = null) {
  const L = run.L,
    keep = { caught: R.caught, lastKick: R.lastKick, lastDown: R.lastDown, fc: R.fc, fcT: R.fcT, lensName: R.lensName, holdUntil: R.holdUntil },
    drop = L.acts?.find(a => a.kind === 'drop');
  // (the level taken on first (its look, its camera's reach: renderer.ensure), and the view kept as it is then)
  R.reset();
  R.ensure(run);
  const view = { ...R.view };
  let n = 0;
  try {
    const list = moments(L, R.look).map(t => ({ t }));
    // (the overdrive on at the first drop; inside the source, a secret, at its door)
    if (drop) list.push({ t: drop.t0 + L.A.beat, od: true });
    if (L.secret?.kind === 'source') list.push({ t: L.secret.door + 0.1, source: true });
    for (const { t, od, source } of list) {
      if (enough?.()) break;
      const s = L.segAt(t);
      Object.assign(run, { y: L.vertical(s) ? run.shaftY(s, t) : s.y0, mode: L.vertical(s) ? 'shaft' : 'run', od: od ? { t0: t - 1, t1: t + 8 } : null, source: source ? { t0: t - 1, t1: t + 1 } : null });
      for (const o of L.obs) if (o.t < t - 0.05) ((o.res = 'ok'), (o.okT = o.t));
      R.view.ready = false;
      R.lastT = null;
      try {
        R.draw(run, t);
        R.draw(run, t + 1 / 60);
      } catch (e) {
        console.error('rehearse:', t, e);
      }
      if (++n % yieldEvery === 0) await new Promise(r => setTimeout(r, 0));
    }
  } finally {
    for (const o of L.obs) (delete o.res, delete o.okT);
    forgetSaid();
    // (the screen resized meanwhile (going full screen as the song loads, a phone turned): the view put back is the old
    // screen's, over a canvas already the new one's, so it is made again for the screen as it is now; else the whole
    // song is drawn into the old size, the rest of the canvas never drawn again)
    const resized = R.view.W !== view.W || R.view.H !== view.H || R.view.dpr !== view.dpr;
    Object.assign(R.view, view);
    if (resized) R.resize();
    Object.assign(R, keep);
    R.reset();
  }
  return n;
}
