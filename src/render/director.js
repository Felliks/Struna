// The director: how each moment of the song is shot, a pure function of song time (the same song is always shot the
// same way). Sayonara Wild Hearts and Rez change the shot with the music's sections; so here:
//   - the framing by section: wide and still in a breakdown, a little close in a verse, close in a drop with a dutch
//     tilt that sways one way then the other every two bars (wider for the boss), creeping in through a build; eased
//     over a bar either side of each change
//   - the held breath: through the empty bar before a drop (level.js) the camera closes in on him
//   - the inhale before a drop: over its last beat the world slows to a crawl (weather, sky, everything behind him:
//     `tv`, the world's own clock) while the song's highs are drawn down (audio.js inhale), and lets go on the drop
//   - the swoop on a drop: its first beat starts close on him, tilted, and pulls out
//   - the build: until the first drop the place is still being rendered, a grid of the simulation with the world
//     coming through it (layers/build.js)
import { smooth } from './util.js';

export function makeDirector(L, look) {
  const A = L.A,
    beat = A.beat,
    bar = 4 * beat,
    acts = look.scenes,
    drops = A.bars.filter(b => b.dropStart).map(b => b.t0),
    builds = A.bars.filter(b => b.kind === 'build'),
    firstDrop = drops[0] ?? A.dur * 0.3,
    FRAME = { drop: 1.06, break: 0.9, verse: 1.03, intro: 1 },
    rw = L.rewriteT ?? Infinity;
  // the world's clock: song time, less what each inhale before a drop has held back (it runs at a fifth of the speed)
  const tv = t => {
    let held = 0;
    for (const d of drops) held += 0.8 * Math.max(0, Math.min(beat, t - (d - beat)));
    return t - held;
  };
  // (the builds as runs of bars: the creep in rises over the whole run, not bar by bar)
  const runs = [];
  for (const b of builds) {
    const last = runs.at(-1);
    if (last && Math.abs(b.t0 - last.t1) < 0.05) last.t1 = b.t1;
    else runs.push({ t0: b.t0, t1: b.t1 });
  }
  // (an act's weight in the shot: in over the half bar either side of its start, out over the half bar either side of
  // the next one's, so two acts' framings and tilts always cross-fade, never step)
  const weight = (j, t) => smooth(acts[j].t0 - bar / 2, acts[j].t0 + bar / 2, t) * (j + 1 < acts.length ? 1 - smooth(acts[j + 1].t0 - bar / 2, acts[j + 1].t0 + bar / 2, t) : 1);
  // (a drop: the world swaying, one way then the other every two bars; the boss's drop more: the camera is the cursor's,
  // and it is enjoying itself)
  const leanOf = (j, t) => {
    const a = acts[j];
    if (a.kind !== 'drop') return 0;
    const boss = L.modeAt?.(a.t0 + 0.01) === 'boss';
    return (j % 2 ? 1 : -1) * 0.02 + (boss ? 0.06 : 0.035) * Math.sin((Math.PI * (t - a.t0)) / (2 * bar));
  };
  return t => {
    let i = 0;
    while (i + 1 < acts.length && acts[i + 1].t0 <= t) i++;
    let base = 0,
      lean = 0,
      wsum = 0;
    for (let j = Math.max(0, i - 1); j <= Math.min(acts.length - 1, i + 1); j++) {
      const w = j === 0 ? (j + 1 < acts.length ? 1 - smooth(acts[1].t0 - bar / 2, acts[1].t0 + bar / 2, t) : 1) : weight(j, t);
      base += (FRAME[acts[j].kind] ?? 1) * w;
      lean += leanOf(j, t) * w;
      wsum += w;
    }
    // (before the first act's start, the intro's framing)
    base += (1 - Math.min(1, wsum)) * FRAME.intro;
    // (creeping in through a build, and let go over a moment after it, not in a frame)
    let creep = 0;
    for (const r of runs) {
      if (t >= r.t0 && t < r.t1) creep = Math.max(creep, 0.05 * smooth(r.t0, r.t1, t));
      else if (t >= r.t1 && t < r.t1 + 0.6) creep = Math.max(creep, 0.05 * Math.exp(-(t - r.t1) / 0.08));
    }
    // (the swoop: the drop's first beat, from close and tilted, out; taken up over 50 ms from where the held breath had
    // the camera, so the drop's frame punches without a jump)
    const d = drops.find(q => t >= q && t < q + beat),
      at = d === undefined ? 0 : 1 - Math.exp(-(t - d) / 0.05),
      sw = d === undefined ? 0 : (1 - (t - d) / beat) ** 2,
      dj = d === undefined ? 0 : acts.findLastIndex(a => a.t0 <= d + 0.01),
      // (the bar before a drop, left empty (level.js): the camera closing in on him through it, held breath, let go as
      // the swoop takes over)
      nd = drops.find(q => t >= q - bar && t < q),
      hold = nd !== undefined ? smooth(nd - bar, nd, t) * 0.1 : d !== undefined ? 0.1 * (1 - at) : 0;
    return {
      zoom: base,
      // (what of the shot is the camera moving: the effects setting and reduced motion take it away, renderer.js)
      move: creep + 0.22 * sw * at + hold,
      rot: lean + 0.06 * sw * at * (dj % 2 ? 1 : -1),
      tv: tv(t),
      inhale: drops.some(q => t >= q - beat && t < q),
      // (and when the song is rewritten into another place: the old one dissolves into the grid over the bar before, the
      // new one is written in over two bars after)
      build: Math.min(smooth(firstDrop * 0.05, firstDrop, t), t < rw ? 1 - smooth(rw - bar, rw, t) : smooth(rw, rw + 2 * bar, t)),
    };
  };
}
