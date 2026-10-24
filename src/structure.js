// The song's parts by what they sound like, not only how loud they are: a guitar solo is often no louder than the verse
// before it, but it sounds nothing like it. From the bands and the chroma of each frame (analyze.js) and the two parts
// of the sound (hpss.js):
//   - each beat described twice: its timbre (the shape of its spectrum: a DCT of its log band energies, an MFCC-like
//     vector) and its harmony (its chroma)
//   - each pair of beats compared (a self-similarity matrix), and a checkerboard kernel slid along its diagonal (Foote
//     2000): where the beats before and the beats after are each alike but unlike each other, the novelty peaks, a new
//     part begins. Its boundaries snapped to the bar lines
//   - each part then read: is the tune or the drums carrying it (`lead`: the harmonic part's share and how many notes it
//     starts against the drums'), and is it a solo (a part carried by the tune that sounds the least like the rest of the
//     song, between four and sixteen bars, after the first; two in a song at most)
const KERNEL = 8,
  NC = 12;

// The song's sections by loudness, each bar named (bars: { e, the bar's mean loudness }; sets en, sm, kind, dropStart):
//   en     the bar's loudness against the song's own range (its 15th to 90th percentile bar, 0..1)
//   sm     en smoothed over its neighbours (how intense the bar is, profile.js intensityOf)
//   drop   a loud part entered from a quieter one: where the four bars from a bar on are much louder than the four before
//          it (the contrast's peak, nine bars wide), on the first bar of the rise that is already near the loud part's
//          level (a pickup or a ramp before it is still the build). Not where the loud part merely reaches the song's
//          loudest (a lift inside a drop, or a song with a louder last chorus): a drop is found by its rise, not by an
//          absolute level, so the first drop of a song that gets louder still is on its downbeat, not phrases late
//          (it was: the smoothing and an absolute threshold of the song's loud tier put drops a phrase or more after
//          the music dropped). A drop lasts while its bars stay near its level (a bar under it with the four from it
//          under it too ends it: a stop of a bar or two inside it does not)
//   build  the bars (four at most) leading into a drop, after the bar a drop before it ended on
//   calm, verse  the rest, by their smoothed loudness
const PRE = 4;
export function songSections(bars) {
  const n = bars.length;
  if (!n) return bars;
  const es = bars.map(b => b.e).sort((a, b) => a - b),
    q = p => es[Math.floor(p * (es.length - 1))] ?? 0,
    eLo = q(0.15),
    eHi = q(0.9);
  for (const b of bars) b.en = Math.max(0, Math.min(1, (b.e - eLo) / (eHi - eLo || 1)));
  bars.forEach((b, i) => (b.sm = (bars[i - 1]?.en ?? b.en) * 0.25 + b.en * 0.5 + (bars[i + 1]?.en ?? b.en) * 0.25));
  const en = bars.map(b => b.en),
    avg = (i0, i1) => {
      i0 = Math.max(0, i0);
      i1 = Math.min(n, i1);
      let s = 0;
      for (let i = i0; i < i1; i++) s += en[i];
      return i1 > i0 ? s / (i1 - i0) : 0;
    },
    pre = i => avg(i - PRE, i),
    post = i => avg(i, i + PRE),
    rise = i => (i > 0 ? post(i) - pre(i) : 0);
  // (the rises: the contrast's peaks, the earliest of equal ones, into a loud part)
  const peaks = [];
  for (let i = 1; i < n - 1; i++) {
    const c = rise(i);
    if (c < 0.15 || post(i) < 0.5) continue;
    let top = true;
    for (let j = Math.max(1, i - PRE); j <= Math.min(n - 1, i + PRE) && top; j++) if (j !== i && (rise(j) > c || (rise(j) === c && j < i))) top = false;
    if (top) peaks.push(i);
  }
  // (each in turn: out of a drop, a drop begins on a strong rise, or on a gentler one that reaches the song's loud tier
  // (a loud part crept back to); inside one, only on a leap or a rise out of a stop: a lift inside a drop is the drop.
  // A drop on until the four bars from one are well under its own level (a bar or two of a stop inside it is still the
  // drop), or the next drop, ending on a bar near its level)
  const kind = new Array(n).fill(null),
    starts = [],
    lay = s => {
      // (its level: its first eight bars', the song's loud tier at most)
      const lvl = Math.max(0.4, Math.min(0.75, avg(s, s + 2 * PRE)) - 0.2);
      let j = s + 1;
      while (j < n && !(en[j] < lvl && post(j) < lvl)) j++;
      while (j - 1 > s && en[j - 1] < lvl) j--;
      for (let k = s; k < j; k++) kind[k] = 'drop';
      return j;
    };
  // (the song's first bars, when it opens loud)
  let end = post(0) >= 0.5 && avg(0, 2) >= 0.45 && !peaks.some(i => i < PRE) ? lay(0) : 0;
  for (const i of peaks) {
    const c = rise(i),
      inDrop = i < end;
    if (inDrop ? pre(i) > 0.55 && c < 0.45 : c < 0.3 && post(i) < 0.75) continue;
    // (back to the rise's first bar already near the loud part's level: a bar 70 % of the way up from before to after;
    // a pickup or a ramp before it is the build)
    const thr = pre(i) + 0.7 * c;
    let k = i;
    while (k - 1 > (starts.at(-1) ?? 0) && k > i - PRE && en[k - 1] >= thr) k--;
    if (k <= (starts.at(-1) ?? -1)) continue;
    // (a drop cut short by the next: its last bars under its level are no longer the drop)
    for (let j = k; j < n && kind[j] === 'drop'; j++) kind[j] = null;
    for (let j = k - 1; j >= 0 && kind[j] === 'drop' && en[j] < 0.4; j--) kind[j] = null;
    starts.push(k);
    end = lay(k);
    bars[k].dropStart = true;
  }
  bars.forEach((b, i) => (b.kind = kind[i] ?? (b.sm < 0.32 ? 'calm' : 'verse')));
  // (the bars leading into each drop: four at most, after the bar the drop before it ended on)
  for (const s of starts)
    for (let k = s - 1; k >= Math.max(0, s - PRE) && bars[k].kind !== 'drop' && bars[k - 1]?.kind !== 'drop'; k--) bars[k].kind = 'build';
  return bars;
}

// a drop that hits after a silence starts on the hit (once per analysis, before the level is built from it: the same
// for a song analysed here and one known ahead, whose curves are kept). The loudness of whole bars puts a drop on the
// first bar that is loud all through, so a drop that comes out of a stop with a hit and leaves space after it (a
// dubstep drop: Antagonist's at 33.9, a bar before its first full bar) came a bar late. Moved back a bar or two only to
// a bar whose first beat hits the bass hard after two bars with next to no bass in them: a build with its kicks and
// pickups in it (Cannibal's, its drop on the leap at 22.5) keeps the drop where the loudness leaps
export function refineDrops(A) {
  if (A.dropsRefined) return A;
  A.dropsRefined = true;
  const { bars, beat, fps } = A,
    low = A.env?.low;
  if (!low || !bars?.length) return A;
  const mean = (a, b) => {
    let s = 0,
      k = 0;
    for (let i = Math.max(0, Math.floor(a * fps)); i < Math.min(low.length, Math.floor(b * fps)); i++) (s += low[i]), k++;
    return k ? s / k : 0;
  };
  for (let i = 2; i < bars.length; i++) {
    if (!bars[i].dropStart) continue;
    for (const j of [i - 1, i - 2]) {
      if (j < 2 || bars[j].kind === 'drop' || bars[j - 1].kind === 'drop') continue;
      const hit = mean(bars[j].t0, bars[j].t0 + beat),
        before = mean(bars[j - 2].t0, bars[j].t0);
      if (hit < 0.25 || before > 0.03) continue;
      bars[i].dropStart = false;
      bars[j].dropStart = true;
      for (let k = j; k < i; k++) bars[k].kind = 'drop';
      break;
    }
  }
  return A;
}

// a DCT-II of a vector, coefficients 1..NC (the first, the loudness, left out: the timbre is the shape)
function shape(v) {
  const n = v.length,
    out = new Float32Array(NC);
  for (let c = 1; c <= NC; c++) {
    let s = 0;
    for (let k = 0; k < n; k++) s += v[k] * Math.cos((Math.PI * c * (k + 0.5)) / n);
    out[c - 1] = s;
  }
  return out;
}
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const unit = v => {
  const l = Math.hypot(...v) || 1;
  return v.map(x => x / l);
};

// the novelty along the beats of one self-similarity (features: one unit vector a beat)
function novelty(F) {
  const n = F.length,
    out = new Float32Array(n),
    g = k => Math.exp(-0.5 * (k / (KERNEL * 0.5)) ** 2);
  for (let i = KERNEL; i < n - KERNEL; i++) {
    let s = 0;
    for (let a = -KERNEL; a < KERNEL; a++)
      for (let b = -KERNEL; b < KERNEL; b++) {
        const same = a < 0 === b < 0 ? 1 : -1;
        s += same * g(a + 0.5) * g(b + 0.5) * dot(F[i + a], F[i + b]);
      }
    out[i] = Math.max(0, s);
  }
  return out;
}

// S: band magnitudes (nf x NB), C: chroma (nf x 12), H, P: the harmonic and percussive parts (nf x NB); lead and drum
// onsets; the beats and the bars. Returns the parts: { b0, b1 (bar indices, b1 past the last), t0, t1, lead, solo, novelty }
export function songParts({ S, C, H, P, nf, NB, fps, beats, bars, onsets }) {
  if (bars.length < 8) return [{ b0: 0, b1: bars.length, t0: 0, t1: Infinity, lead: 'drums', solo: false, novelty: 0 }];
  const nb = beats.length,
    T = [],
    K = [];
  // each beat's timbre and harmony
  for (let j = 0; j < nb; j++) {
    const i0 = Math.max(0, Math.floor(beats[j] * fps)),
      i1 = Math.min(nf, Math.max(i0 + 1, Math.floor((beats[j + 1] ?? beats[j] + 0.5) * fps))),
      band = new Float32Array(NB),
      ch = new Float32Array(12);
    for (let i = i0; i < i1; i++) {
      for (let b = 0; b < NB; b++) band[b] += S[i * NB + b];
      for (let c = 0; c < 12; c++) ch[c] += C[i * 12 + c];
    }
    T.push(shape(band.map(v => Math.log(1e-6 + v / (i1 - i0)))));
    K.push(unit([...ch]));
  }
  // (the timbre standardised over the song, then each beat's made a unit vector)
  const mu = new Float32Array(NC),
    sd = new Float32Array(NC);
  for (const t of T) t.forEach((v, c) => (mu[c] += v / nb));
  for (const t of T) t.forEach((v, c) => (sd[c] += (v - mu[c]) ** 2 / nb));
  const Tz = T.map(t => [...t].map((v, c) => (v - mu[c]) / (Math.sqrt(sd[c]) || 1))),
    Tu = Tz.map(unit);
  const nT = novelty(Tu),
    nK = novelty(K),
    mx = a => Math.max(1e-9, ...a),
    nov = Float32Array.from(nT, (v, j) => 0.6 * (v / mx(nT)) + 0.4 * (nK[j] / mx(nK)));
  // the peaks: a local maximum over two bars either side, well above the song's usual, snapped to the nearest bar line
  const mean = nov.reduce((s, v) => s + v, 0) / nb,
    sdv = Math.sqrt(nov.reduce((s, v) => s + (v - mean) ** 2, 0) / nb),
    cuts = new Map();
  for (let j = KERNEL; j < nb - KERNEL; j++) {
    if (nov[j] < mean + 1.3 * sdv) continue;
    let top = true;
    for (let k = j - KERNEL; k <= j + KERNEL && top; k++) if (nov[k] > nov[j]) top = false;
    if (!top) continue;
    const t = beats[j],
      bi = bars.reduce((m, b, i) => (Math.abs(b.t0 - t) < Math.abs(bars[m].t0 - t) ? i : m), 0);
    if (bi > 0) cuts.set(bi, Math.max(cuts.get(bi) ?? 0, nov[j]));
  }
  // (a part four bars long at least: a cut closer than that to the one kept before gives way)
  const edges = [0];
  for (const b of [...cuts.keys()].sort((a, c) => a - c)) if (b - edges.at(-1) >= 4 && bars.length - b >= 4) edges.push(b);
  edges.push(bars.length);
  // each part read
  const Etot = (M, t0, t1) => {
      let s = 0;
      for (let i = Math.floor(t0 * fps); i < Math.min(nf, Math.floor(t1 * fps)); i++) for (let b = 0; b < NB; b++) s += M[i * NB + b];
      return s;
    },
    count = (band, t0, t1) => onsets.filter(o => o.band === band && o.t >= t0 && o.t < t1).length;
  const parts = [];
  for (let k = 0; k + 1 < edges.length; k++) {
    const b0 = edges[k],
      b1 = edges[k + 1],
      t0 = bars[b0].t0,
      t1 = bars[b1 - 1].t1,
      h = Etot(H, t0, t1),
      p = Etot(P, t0, t1),
      tune = count('lead', t0, t1),
      drums = count('low', t0, t1) + count('mid', t0, t1),
      // (how unlike the song this part sounds: its mean timbre away from the song's mean)
      j0 = beats.findIndex(t => t >= t0),
      j1 = beats.findIndex(t => t >= t1),
      seg = Tz.slice(Math.max(0, j0), j1 < 0 ? nb : j1),
      away = seg.length ? Math.hypot(...Array.from({ length: NC }, (_, c) => seg.reduce((s, t) => s + t[c], 0) / seg.length)) : 0;
    parts.push({ b0, b1, t0: k ? t0 : 0, t1, share: h / (h + p || 1), tune, drums, away, novelty: k ? (cuts.get(b0) ?? 0) : 0 });
  }
  const shares = parts.map(q => q.share).sort((a, b) => a - b),
    medShare = shares[shares.length >> 1],
    aways = parts.map(q => q.away).sort((a, b) => a - b),
    farAway = aways[Math.floor(aways.length * 0.7)] ?? Infinity;
  let solos = 0;
  for (const q of parts) {
    q.lead = q.share > medShare * 1.1 && q.tune >= q.drums * 0.6 ? 'melody' : 'drums';
    const len = q.b1 - q.b0;
    q.solo = q.b0 >= 8 && q.lead === 'melody' && q.away >= farAway && len >= 4 && len <= 16 && q.tune >= len * 4;
  }
  // (a solo running on into the next part is one solo; two in a song at most)
  const out = [];
  for (const q of parts) {
    const last = out.at(-1);
    if (last && last.solo && q.solo && q.b1 - last.b0 <= 16) Object.assign(last, { b1: q.b1, t1: q.t1 });
    else out.push(q);
  }
  for (const q of out) if (q.solo && ++solos > 2) q.solo = false;
  return out.map(({ b0, b1, t0, t1, lead, solo, novelty }) => ({ b0, b1, t0, t1, lead, solo, novelty }));
}
