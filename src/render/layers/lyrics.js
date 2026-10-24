// The song's words in the world (when it is known: LRCLIB's timed lyrics, fetched by main.js): the line being sung,
// written across the sky behind him word by word as it is sung (each word popping in, the last one brightest), torn
// sideways on a hard snare, fading out as the next line comes. Huge and behind everything he deals with: a part of the
// place, not a caption.
// (under a lens that breaks the world into big pixels the words could not be read: they are drawn after it instead,
// over everything, fainter: renderer f.label)
export function drawLyrics(f) {
  if (f.pixelated) f.label(() => words(f, 0.6));
  else words(f, 1);
}
// the words shown laid out in lines across the screen (kept for the next frames: LAID)
const LAID = { line: null };
function layOut(g, words, shown, maxW) {
  const rows = [[]];
  let w = 0;
  const space = g.measureText(' ').width;
  for (const word of words.slice(0, shown)) {
    const ww = g.measureText(word.toUpperCase()).width;
    if (w + ww > maxW && rows.at(-1).length) {
      rows.push([]);
      w = 0;
    }
    rows.at(-1).push([word.toUpperCase(), ww]);
    w += ww + space;
  }
  return { rows, space };
}
function words(f, fade) {
  const { g, v, t, mf, T, L } = f,
    W = L.lyrics;
  if (!W?.length || f.run.mode === 'dead') return;
  let i = -1;
  while (i + 1 < W.length && W[i + 1][0] <= t) i++;
  if (i < 0) return;
  const [t0, line] = W[i],
    t1 = W[i + 1]?.[0] ?? t0 + 6,
    words = line.split(/\s+/).filter(Boolean);
  if (!words.length || t > t1 + 0.3) return;
  // (about a word every 0.35 s, or spread over the line if it is quicker)
  const per = Math.min(0.35, (t1 - t0) / words.length),
    shown = Math.min(words.length, Math.floor((t - t0) / per) + 1),
    out = t > t1 - 0.25 ? Math.max(0, (t1 + 0.05 - t) / 0.3) : 1,
    // (laid out once per line and word shown, at the size without the kick, and swelling with the kick as a whole about
    // its middle: a font of a new size each frame and every word measured again cost a frame its time)
    size = Math.round(Math.min(v.W / 9, v.H / 7)),
    swell = 1 + 0.04 * mf.kick;
  g.save();
  g.setTransform(swell, 0, 0, swell, (1 - swell) * v.W * 0.5, (1 - swell) * v.H * 0.3);
  g.globalCompositeOperation = 'screen';
  g.font = `900 ${size}px Unbounded, 'Arial Black', sans-serif`;
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  if (LAID.line !== line || LAID.shown !== shown || LAID.size !== size || LAID.W !== v.W) Object.assign(LAID, { line, shown, size, W: v.W, ...layOut(g, words, shown, v.W * 0.86) });
  const { rows, space } = LAID;
  const lh = size * 1.05,
    top = v.H * 0.3 - ((rows.length - 1) * lh) / 2;
  let k = 0;
  rows.forEach((row, r) => {
    const total = row.reduce((s, [, ww]) => s + ww + space, -space);
    let x = (v.W - total) / 2;
    for (const [word, ww] of row) {
      const age = t - (t0 + k * per),
        pop = age < 0.12 ? 1.25 - 0.25 * (age / 0.12) : 1,
        last = k === shown - 1,
        tear = mf.snare > 0.5 && (k + Math.floor(t * 20)) % 3 === 0 ? (mf.snare - 0.5) * size * 0.5 : 0;
      // (faint, and laid on as light: a part of the sky, not a caption over it)
      g.globalAlpha = fade * out * (last ? 0.32 + 0.22 * mf.voice : 0.14 + 0.1 * mf.voice);
      g.fillStyle = last ? T.line : '#ffffff';
      g.save();
      g.translate(x + ww / 2 + tear, top + r * lh);
      g.scale(pop, pop);
      g.fillText(word, -ww / 2, 0);
      g.restore();
      x += ww + space;
      k++;
    }
  });
  g.restore();
}
