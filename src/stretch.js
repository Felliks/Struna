// The song slowed without its pitch dropping (the coach's slow motion, main.js): a stretch of the song played at a rate
// that eases down and back up again, rendered ahead of time into a buffer of its own by WSOLA (waveform-similarity
// overlap-add, Verhelst & Roelands 1993): frames of about 46 ms, Hann-windowed, laid half a frame apart, each read from
// where the song has got to (the rate integrated), nudged by up to 8 ms to where it best continues the frame before (so
// the waveforms line up, no phasing). A buffer source would slow it as a tape does (AudioBufferSourceNode.playbackRate
// is a resampler: an octave down at half speed); the media element's preservesPitch cannot be clocked to the sample.
// The stretch starts and ends at the rate of 1 with its frames read straight on (no nudge), so it joins the song's own
// buffer sample for sample at both ends (Hann windows half a frame apart sum to one). With each one comes its map:
// the song time heard at each moment of the buffer, so the run's clock (audio.js) is the song's time all through.

const smooth = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

// how slow the song is (0 not at all, 1 the slowest) round each moment the coach teaches at, in beats from it: eased in
// over the two beats from five before, held to half a beat after, eased out by two after
// (`from`, in beats, less where something else to answer comes before it: the song slows only once the taught thing is
// the next to answer (the ease in over two beats, or less with less room), never for a move he cannot make yet)
export const SLOW = { from: 5, full: 3, hold: 0.5, to: 2 };
export function slowAmount(T, beat, t, from = SLOW.from) {
  const u = (t - T) / beat,
    ease = Math.min(SLOW.from - SLOW.full, from / 2),
    full = from - ease;
  if (u <= -from || u >= SLOW.to) return 0;
  if (u < -full) return smooth((u + from) / ease);
  if (u <= SLOW.hold) return 1;
  return 1 - smooth((u - SLOW.hold) / (SLOW.to - SLOW.hold));
}
// a moment to slow for: a time, or [time, from] (from in beats)
export const momentOf = m => (Array.isArray(m) ? m : [m, SLOW.from]);
// the stretches of song to slow for moments `ts` (song seconds): one per run of moments close enough to overlap, each
// with a little at the rate of 1 at either end (where the stretch joins the song); `rate` at the slowest
export function slowZones(ts, beat, rate, dur) {
  const pad = 0.25,
    zones = [];
  for (const m of [...ts].sort((a, b) => momentOf(a)[0] - momentOf(b)[0])) {
    const [T, from] = momentOf(m),
      a = T - from * beat - pad,
      b = T + SLOW.to * beat + pad;
    // (too near the song's start to ease in, or past its end: not slowed)
    if (a < 0.2 || b > dur - 0.5) continue;
    const last = zones.at(-1);
    if (last && a < last.pb) {
      last.pb = b;
      last.ts.push(m);
    } else zones.push({ pa: a, pb: b, ts: [m] });
  }
  for (const z of zones) Object.assign(z, { beat, rate, rateAt: rateOf(z.ts, beat, rate) });
  return zones;
}
// a zone's rate at song time t, from its moments (a function of plain numbers, so a worker can make it again)
export const rateOf = (ts, beat, rate) => t => 1 - (1 - rate) * Math.max(0, ...ts.map(m => slowAmount(momentOf(m)[0], beat, t, momentOf(m)[1])));

// one zone rendered: `buf` the song, z.pa..z.pb its stretch (song seconds), z.rateAt(t) its rate at song time t.
// Returns the zone with `buffer` (an AudioBuffer from `ctx`), `len` (its seconds) and the map (`mo` buffer seconds,
// `mi` song seconds, increasing together)
export function renderZone(ctx, buf, z) {
  const src = Array.from({ length: Math.min(2, buf.numberOfChannels) }, (_, c) => buf.getChannelData(c)),
    r = stretchZone(src, buf.sampleRate, z);
  return r && zoneOf(ctx, z, r, buf.sampleRate);
}
// the samples a zone is made of (a worker is sent only these): from, to (sample indices of the song)
export function zoneSpan(z, sr) {
  const N = 2 ** Math.round(Math.log2(0.046 * sr)),
    tol = Math.round(0.008 * sr);
  return [Math.round(z.pa * sr) - N - tol, Math.round(z.pb * sr) + Math.round(0.8 * sr) + 2 * N + tol];
}
// the rendered zone as the song plays it: its buffer made on `ctx`, its map in song seconds (`shift` taken off: the
// song's own audio may start that much later in its buffer than the song's time, audio.js lead)
export function zoneOf(ctx, z, r, sr, shift = 0) {
  const buffer = ctx.createBuffer(r.out.length, r.len, sr);
  r.out.forEach((o, c) => buffer.copyToChannel(o, c));
  return { ...z, pb: r.join / sr - shift, buffer, len: r.len / sr, mo: r.mo, mi: shift ? r.mi.map(v => v - shift) : r.mi };
}
// the stretch itself, on plain samples: `src` the song's channels from sample `base` on (the whole song: 0). Returns
// { out: its channels, len: its samples, mo, mi: its map, join: the song's sample where it joins it again } or null
// (the song too short round it)
export function stretchZone(src, sr, z, base = 0) {
  const N = 2 ** Math.round(Math.log2(0.046 * sr)),
    H = N / 2,
    tol = Math.round(0.008 * sr),
    chans = src.length,
    total = base + src[0].length,
    pa = Math.round(z.pa * sr),
    pb = Math.round(z.pb * sr),
    w = new Float32Array(N);
  for (let j = 0; j < N; j++) w[j] = 0.5 - 0.5 * Math.cos((2 * Math.PI * j) / N);
  // (the frames: read where the song has got to, p, at the rate there; the first at the rate of 1 a whole frame before
  // pa, so the stretch is whole (two frames overlapping) from where it starts)
  const p0 = pa - N,
    // (room past pb: back at the rate of 1 the reading walks back onto the song's own beat a little each frame, so the
    // stretch may run on past pb before it is read straight on)
    room = Math.round(0.8 * sr);
  if (p0 - tol < base || pb + room + 2 * N + tol > total) return null;
  // (the output as long as the slowest rate could make it, trimmed below)
  let slowest = 1;
  for (let t = z.pa; t < z.pb; t += 0.01) slowest = Math.min(slowest, z.rateAt(t));
  const cap = Math.ceil((pb + room - p0 + 2 * N) / slowest) + 2 * N,
    out = Array.from({ length: chans }, () => new Float32Array(cap)),
    // (the song in mono over the stretch, to match waveforms on)
    m0 = p0 - tol,
    mono = new Float32Array(pb + room + 2 * N + tol - m0);
  for (let i = 0; i < mono.length; i++) {
    let s = 0;
    for (let c = 0; c < chans; c++) s += src[c][m0 - base + i];
    mono[i] = s;
  }
  const mo = [],
    mi = [];
  // how well the frame read from `a` continues the one before (whose natural continuation reads from `nat`): the
  // correlation over the half frame they overlap, normalised by the candidate's energy; every `st`-th sample
  const score = (a, nat, st) => {
    let xy = 0,
      yy = 1e-9;
    for (let j = 0; j < H; j += st) {
      const x = mono[nat - m0 + j],
        y = mono[a - m0 + j];
      xy += x * y;
      yy += y * y;
    }
    return xy / Math.sqrt(yy);
  };
  let p = p0,
    prev = -1,
    straight = 0,
    end = -1,
    join = pb;
  for (let k = 0; ; k++) {
    const o = k * H;
    if (o + N > cap || p > pb + room) return null;
    const r = z.rateAt((p + H) / sr),
      nominal = Math.round(p);
    let a = nominal;
    if (prev >= 0 && r < 0.9999) {
      // (slowed: nudged to where it best continues the frame before, coarse every 8th sample over the whole tolerance,
      // then fine round the best)
      const nat = prev + H;
      let best = 0,
        bs = -Infinity;
      for (let d = -tol; d <= tol; d += 8) {
        const s = score(nominal + d, nat, 8);
        if (s > bs) ((bs = s), (best = d));
      }
      const c0 = best;
      bs = -Infinity;
      for (let d = c0 - 7; d <= c0 + 7; d++) {
        if (d < -tol || d > tol) continue;
        const s = score(nominal + d, nat, 2);
        if (s > bs) ((bs = s), (best = d));
      }
      a = nominal + best;
    } else if (prev >= 0) {
      // (back at the rate of 1: on from the frame before, walked back onto the song's own place 32 samples a frame (a
      // 3 % drift for a moment, unheard), never a jump)
      a = prev + H + Math.max(-32, Math.min(32, nominal - prev - H));
    }
    for (let c = 0; c < chans; c++) {
      const S = src[c],
        O = out[c];
      for (let j = 0; j < N; j++) O[o + j] += S[a - base + j] * w[j];
    }
    mo.push(o + H);
    mi.push(p + H);
    straight = a === nominal && r >= 0.9999 ? straight + 1 : 0;
    prev = a;
    // (the end: read straight on for two frames running at the rate of 1, past pb; the buffer ends at this frame's
    // start, which the two overlapping frames make whole, and the song's own buffer goes on from there)
    if (straight >= 2 && a >= pb) {
      end = o;
      join = a;
      break;
    }
    p += H * r;
  }
  const start = N,
    len = end - start;
  if (len <= 0) return null;
  // (the map from the buffer's seconds to the song's, its ends exact)
  const MO = [0],
    MI = [z.pa];
  for (let i = 0; i < mo.length; i++) {
    const bo = (mo[i] - start) / sr;
    if (bo > 0 && bo < len / sr) MO.push(bo), MI.push(mi[i] / sr);
  }
  MO.push(len / sr);
  MI.push(join / sr);
  return { out: out.map(o => o.slice(start, end)), len, mo: Float64Array.from(MO), mi: Float64Array.from(MI), join };
}

// along a zone's map: the song time at buffer time u, and the buffer time of song time t (both clamped to the zone)
function along(xs, ys, x) {
  if (x <= xs[0]) return ys[0];
  const n = xs.length;
  if (x >= xs[n - 1]) return ys[n - 1];
  let lo = 0,
    hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid;
    else hi = mid;
  }
  return ys[lo] + ((ys[hi] - ys[lo]) * (x - xs[lo])) / (xs[hi] - xs[lo]);
}
export const songOf = (z, u) => along(z.mo, z.mi, u);
export const bufferOf = (z, t) => along(z.mi, z.mo, t);
