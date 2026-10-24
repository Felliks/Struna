// The song as the world's pulse, the game's MUSIC_FX (engine/sim/plan/music.js): kick, snare, hat (impulses with an
// instant attack and a smooth release, as loud as the onset was), bass (a longer swell), beat and downbeat, build (0->1
// through the bars before a drop), drop (1 on a drop, fading over a bar), stage (the world's state: the bars'
// absolute intensity, eased from bar to bar, and never below what the song has grown to: grow, a step up with each
// drop, kept), voice and pitch (the melody: how present a
// voice or a lead is, how high it sings). A pure function of song time.
const lastIdx = (list, t) => {
  let lo = 0,
    hi = list.length - 1,
    r = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (list[m] <= t) {
      r = m;
      lo = m + 1;
    } else hi = m - 1;
  }
  return r;
};

export function makeFX(A, segs, finale = null) {
  const band = name => {
    const os = A.onsets.filter(o => o.band === name),
      top = Math.max(1e-6, ...os.map(o => o.s));
    return { t: os.map(o => o.t), s: os.map(o => Math.min(1, (o.s / top) * 1.6)) };
  };
  const K = band('low'),
    S = band('mid'),
    Hh = band('high'),
    // (the world's pulse on the beat as it is felt: a song heard at half its pace pulses on its half beats too)
    pulses = (A.feel ?? 1) > 1 ? A.beats.flatMap(t => [t, t + A.beat / 2]) : A.beats,
    beats = A.beats,
    downs = beats.filter((_, i) => i >= (A.bar0 ?? 0) && (i - (A.bar0 ?? 0)) % 4 === 0),
    drops = A.bars.filter(b => b.dropStart).map(b => b.t0),
    // the run starts after a fall are drops too: he lands on them
    lands = segs.filter((s, i) => s.kind === 'run' && i > 0).map(s => s.t0),
    // (and the finale's smash)
    allDrops = [...new Set([...drops, ...lands, ...(finale ? [finale.hit] : [])])].sort((a, b) => a - b),
    bar = A.beat * 4;
  const imp = (B, t, rel) => {
    const i = lastIdx(B.t, t);
    return i < 0 ? 0 : B.s[i] * Math.exp(-(t - B.t[i]) / rel);
  };
  const env = (list, t, rel) => {
    const i = lastIdx(list, t);
    return i < 0 ? 0 : Math.exp(-(t - list[i]) / rel);
  };
  const fps = A.fps,
    low = A.env.low,
    // (eased across a beat either side of each bar line)
    stageAt = t => {
      const i = A.bars.findIndex(b => t < b.t1);
      if (i < 0) return A.bars.at(-1)?.intensity ?? 0.3;
      const b = A.bars[i],
        prev = A.bars[i - 1] ?? b,
        u = Math.max(0, Math.min(1, (t - b.t0 + A.beat) / (2 * A.beat)));
      return (prev.intensity ?? 0.3) + ((b.intensity ?? 0.3) - (prev.intensity ?? 0.3)) * u * u * (3 - 2 * u);
    };
  // how far the world has grown: a step up with each drop (eased in over a bar) and a little with the song's progress,
  // kept (the world never shrinks back after a drop); all the way at the finale's smash
  const grow = t => {
    if (finale && t >= finale.hit) return 1;
    let n = 0;
    for (const d of drops) n += Math.max(0, Math.min(1, (t - d) / bar));
    return Math.min(1, 0.15 * (t / A.dur) + (0.85 * n) / Math.max(1, drops.length));
  };
  return t => {
    const f = Math.max(0, Math.min(low.length - 1, t * fps)),
      i = Math.floor(f),
      d = lastIdx(allDrops, t),
      bi = A.bars.findIndex(b => t >= b.t0 && t < b.t1),
      b = A.bars[bi],
      next = A.bars.slice(bi + 1, bi + 5).find(q => q.dropStart);
    // a build: the bars before a drop, rising
    let build = 0;
    if (b && next && b.kind !== 'drop') build = Math.max(0, Math.min(1, 1 - (next.t0 - t) / (bar * 4)));
    return {
      kick: imp(K, t, 0.09),
      kickT: (() => {
        const i = lastIdx(K.t, t);
        return i < 0 ? -9 : K.t[i];
      })(),
      snare: imp(S, t, 0.12),
      snareT: (() => {
        const i = lastIdx(S.t, t);
        return i < 0 ? -9 : S.t[i];
      })(),
      hat: imp(Hh, t, 0.05),
      bass: low[i] + (low[Math.min(low.length - 1, i + 1)] - low[i]) * (f - i),
      beat: env(pulses, t, (A.beat / (A.feel ?? 1)) * 0.4),
      down: env(downs, t, 0.28),
      drop: d < 0 || t - allDrops[d] > bar ? 0 : 1 - (t - allDrops[d]) / bar,
      dropT: d < 0 ? -9 : allDrops[d],
      build,
      // seconds to the next drop's first beat (the inhale before it)
      toDrop: next && b && b.kind !== 'drop' ? next.t0 - t : 9,
      amp: b ? { calm: 0.35, verse: 0.6, build: 0.8, drop: 1 }[b.kind] ?? 0.6 : 0.4,
      grow: grow(t),
      // (the world's state: the bar's intensity, but never below what the song has grown to)
      stage: Math.max(stageAt(t), 0.15 + 0.7 * grow(t)),
      // the voice (or the lead) flowing, and how high its melody is, 0..1
      voice: A.env.voice ? A.env.voice[i] : 0,
      pitch: A.env.pitch ? A.env.pitch[i] : 0.5,
    };
  };
}
