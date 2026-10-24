// The song's acts: its sections as the world's chapters. The place stays the same the whole song, but each act dresses
// it anew (look.js: its own palette, time of day, weather, landmarks; level.js: its own obstacles of the place), the
// way Sayonara Wild Hearts or Tetris Effect turn the scene over at a chorus. A new act begins on a drop's first bar, on
// the first bar after a drop (the breakdown), where the song starts to sound different (analyze.js parts: a new timbre
// or harmony, eight bars into an act at least), on a solo's first bar and the first after it, and every 16 bars of a
// long stretch without any of those (on a phrase line, as the song is felt); an act under four bars long joins the one
// before.
export function songActs(A) {
  const bars = A.bars;
  if (!bars.length) return [{ t0: 0, t1: A.dur, kind: 'verse', i: 0 }];
  const starts = [{ b: 0, kind: bars[0].kind === 'drop' ? 'drop' : 'intro' }],
    // (the parts by sound: where each begins, and the solos' bars)
    partAt = new Map((A.parts ?? []).map(q => [q.b0, q])),
    soloEnd = new Set((A.parts ?? []).filter(q => q.solo).map(q => q.b1)),
    byLoudness = b => (b.kind === 'drop' ? 'drop' : b.kind === 'calm' ? 'break' : 'verse');
  // (a phrase: 16 bars as the song is felt, so a song heard at half its pace (analyze.js feel) turns over every 8 of its
  // bars, as often in seconds as the same song heard at its pace)
  const phrase = 16 / (A.feel ?? 1);
  let since = 0;
  for (let i = 1; i < bars.length; i++) {
    const b = bars[i],
      prev = bars[i - 1],
      part = partAt.get(i);
    since++;
    let kind = null,
      sound = false;
    if (part?.solo) kind = 'solo';
    else if (b.dropStart) kind = 'drop';
    else if (soloEnd.has(i)) kind = byLoudness(b);
    else if (prev.kind === 'drop' && b.kind !== 'drop') kind = b.kind === 'calm' ? 'break' : 'verse';
    else if (part && since >= 8 && b.kind !== 'drop') [kind, sound] = [byLoudness(b), true];
    else if (since >= phrase && (b.i - (A.bar0 ?? 0)) % phrase === 0) kind = byLoudness(b);
    if (!kind) continue;
    if (since < 4 && kind !== 'drop' && kind !== 'solo') continue;
    // (a drop or a solo always opens its act: a short act before it gives way)
    if (since < 4 && starts.length > 1) starts.pop();
    starts.push({ b: i, kind, sound });
    since = 0;
  }
  // (`sound`: an act begun only because the song sounds different there: a new look, its kind of play kept)
  return starts.map((s, i) => ({
    i,
    kind: s.kind,
    sound: !!s.sound,
    t0: i ? bars[s.b].t0 : 0,
    t1: starts[i + 1] ? bars[starts[i + 1].b].t0 : A.dur + 60,
  }));
}
// the act at song time t
export const actAt = (acts, t) => {
  let i = 0;
  while (i + 1 < acts.length && acts[i + 1].t0 <= t) i++;
  return acts[i];
};
