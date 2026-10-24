// The song, read in the browser: from its samples to everything the level and the world are built from.
//   frames  every 512 samples at 22050 Hz (~23 ms): loudness and the energy of the low / mid / high bands, and how
//           sharply each band rises (spectral flux, the usual onset detection function)
//   beat    the tempo by autocorrelating the onset curve (weighted toward 120 BPM), the grid's phase by where the
//           onsets pile up, the bar's first beat by where the kicks fall
//   onsets  the drums' and the tune's apart (hpss.js): the kick, the snare and the hats from the percussive part, the
//           tune's notes (`lead`) from the harmonic part; peaks of each one's flux over a running average (an adaptive
//           threshold)
//   parts   where the song changes what it sounds like (structure.js: a new timbre or harmony), whether the drums or the
//           tune carry each part, and which part is a solo
//   sections each bar's loudness against the song's own range: calm, verse, build (rising into a drop), drop
//   feel    the pace it is felt at: a song heard at half its tempo (a drum & bass read at 86) runs at double (profile.js)
//   mood    energy, tempo, brightness (spectral centroid) and minor vs major (chroma against Krumhansl's key
//           profiles); the level and the world take their look and temper from it
//   seed    a hash of the coarse loudness curve: the same song always gives the same world
import { fnv, mulberry } from './rng.js';
import { bandsOf, energy, flux as partFlux, hpss } from './hpss.js';
import { songParts, songSections } from './structure.js';
import { features, feltOf } from './profile.js';
import { barOf, gridOf, listen, melodyOf } from './ml/listen.js';

const SR = 22050,
  N = 1024,
  HOP = 512;

// in-place radix-2 FFT
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len,
      wr = Math.cos(a),
      wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1,
        ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const p = i + k,
          q = p + len / 2,
          tr = re[q] * cr - im[q] * ci,
          ti = re[q] * ci + im[q] * cr;
        re[q] = re[p] - tr;
        im[q] = im[p] - ti;
        re[p] += tr;
        im[p] += ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

// an AudioBuffer as mono samples at SR
export async function monoAt(buffer) {
  const len = Math.ceil(buffer.duration * SR),
    off = new OfflineAudioContext(1, len, SR),
    src = off.createBufferSource();
  src.buffer = buffer;
  src.connect(off.destination);
  src.start();
  return (await off.startRendering()).getChannelData(0);
}

const norm = a => {
  const s = [...a].sort((x, y) => x - y),
    lo = s[Math.floor(s.length * 0.05)],
    hi = s[Math.floor(s.length * 0.98)] || 1;
  return Float32Array.from(a, v => Math.max(0, Math.min(1.5, (v - lo) / (hi - lo || 1))));
};
const at = (arr, t, fps) => {
  const x = t * fps,
    i = Math.floor(x);
  if (i < 0 || i + 1 >= arr.length) return 0;
  return arr[i] + (arr[i + 1] - arr[i]) * (x - i);
};

export async function analyze(buffer, onProgress = () => {}) {
  const x = await monoAt(buffer);
  // (the networks listen in their workers meanwhile: half the bar is theirs, half ours)
  let ours = 0,
    theirs = 0;
  const say = () => onProgress(0.5 * ours + 0.5 * theirs),
    heard = listen(x, buffer, p => ((theirs = p), say())).then(r => ((theirs = 1), say(), r));
  const
    nf = Math.floor((x.length - N) / HOP),
    fps = SR / HOP,
    win = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  const rms = new Float32Array(nf),
    low = new Float32Array(nf),
    mid = new Float32Array(nf),
    high = new Float32Array(nf),
    fLow = new Float32Array(nf),
    fMid = new Float32Array(nf),
    fHigh = new Float32Array(nf),
    flux = new Float32Array(nf),
    cent = new Float32Array(nf),
    // (raw, unnormalised: the song's own level, for its profile)
    sub = new Float32Array(nf),
    flat = new Float32Array(nf),
    // the melody's band (300-3400 Hz, where a voice is): its energy against the frame's, and its centroid
    vox = new Float32Array(nf),
    vcent = new Float32Array(nf),
    chroma = new Float64Array(12);
  // (the spectrogram in log-spaced bands, and each frame's chroma: for the two parts of the sound and the song's parts)
  const bands = bandsOf(N, SR),
    NB = bands.NB,
    S = new Float32Array(nf * NB),
    C = new Float32Array(nf * 12);
  const re = new Float32Array(N),
    im = new Float32Array(N),
    prev = new Float32Array(N / 2),
    pc = new Int8Array(N / 2).fill(-1);
  // pitch class of each bin from 130 Hz to 2 kHz (below that the kick and the 808 drown the harmony)
  for (let k = 1; k < N / 2; k++) {
    const f = (k * SR) / N;
    if (f > 130 && f < 2000) pc[k] = ((Math.round(12 * Math.log2(f / 440)) % 12) + 12 + 9) % 12;
  }
  const V1 = Math.round((300 * N) / SR),
    V2 = Math.round((3400 * N) / SR),
    B1 = Math.round((150 * N) / SR),
    B2 = Math.round((4000 * N) / SR);
  for (let i = 0; i < nf; i++) {
    let e = 0;
    for (let k = 0; k < N; k++) {
      const s = x[i * HOP + k];
      e += s * s;
      re[k] = s * win[k];
      im[k] = 0;
    }
    rms[i] = Math.sqrt(e / N);
    fft(re, im);
    let l = 0,
      m = 0,
      h = 0,
      dl = 0,
      dm = 0,
      dh = 0,
      cw = 0,
      ct = 0,
      sb = 0,
      lgSum = 0,
      mSum = 0,
      nb = 0,
      vs = 0,
      vk = 0;
    for (let k = 1; k < N / 2; k++) {
      const mag = Math.hypot(re[k], im[k]),
        lg = Math.log1p(10 * mag),
        d = Math.max(0, lg - prev[k]);
      prev[k] = lg;
      if (k < B1) {
        l += mag;
        dl += d;
      } else if (k < B2) {
        m += mag;
        dm += d;
      } else {
        h += mag;
        dh += d;
      }
      cw += mag;
      ct += mag * k;
      // sub-bass below 65 Hz; the flatness of the mids (noise-like = distorted)
      if (k < 4) sb += mag;
      if (k >= B1 && k < B2) {
        lgSum += Math.log(mag + 1e-9);
        mSum += mag;
        nb++;
      }
      if (k >= V1 && k < V2) {
        vs += mag;
        vk += mag * k;
      }
      if (pc[k] >= 0) {
        chroma[pc[k]] += lg;
        C[i * 12 + pc[k]] += lg;
      }
      if (bands.of[k] >= 0) S[i * NB + bands.of[k]] += mag;
    }
    low[i] = l;
    mid[i] = m;
    high[i] = h;
    fLow[i] = dl;
    fMid[i] = dm / 4;
    fHigh[i] = dh / 8;
    flux[i] = dl + dm / 4 + dh / 8;
    cent[i] = cw ? ((ct / cw) * SR) / N : 0;
    sub[i] = cw ? sb / cw : 0;
    flat[i] = mSum > 0 ? Math.exp(lgSum / nb) / (mSum / nb) : 0;
    vox[i] = cw ? (vs / cw) * vs : 0;
    vcent[i] = vs ? Math.log2(((vk / vs) * SR) / N) : 0;
    if (i % 2000 === 0) {
      ours = (i / nf) * 0.8;
      say();
      await new Promise(r => setTimeout(r, 0));
    }
  }
  // a voice (or a lead): the melody band loud, tonal (flat, noise-like mids are drums and distortion), smoothed with a
  // quick attack and a slow release so it flows (~0.1 s / 0.6 s); its height: the band's centroid, smoothed more
  const voice = norm(Float32Array.from(vox, (v, i) => v * Math.max(0, 1 - 2.5 * flat[i]))),
    pitch = new Float32Array(nf);
  {
    const up = 1 - Math.exp(-1 / (0.1 * fps)),
      down = 1 - Math.exp(-1 / (0.6 * fps)),
      pk = 1 - Math.exp(-1 / (0.25 * fps)),
      ps = [...vcent].filter(v => v > 0).sort((a, b) => a - b),
      lo = ps[Math.floor(ps.length * 0.1)] ?? 8,
      hi = ps[Math.floor(ps.length * 0.9)] ?? 11;
    let e = 0,
      p = 0.5;
    for (let i = 0; i < nf; i++) {
      e += (voice[i] - e) * (voice[i] > e ? up : down);
      voice[i] = e;
      if (vcent[i] > 0) p += (Math.max(0, Math.min(1, (vcent[i] - lo) / (hi - lo || 1))) - p) * pk * Math.min(1, e * 2);
      pitch[i] = p;
    }
  }
  const env = {
    voice,
    pitch,
    rms: norm(rms),
    low: norm(low),
    mid: norm(mid),
    high: norm(high),
    flux: norm(flux),
    fLow: norm(fLow),
    fMid: norm(fMid),
    fHigh: norm(fHigh),
  };

  // ---- the grid: the network's beats when it could listen (ml/listen.js), else ours from the onset curve
  const fromFlux = () => {
    // ---- tempo: autocorrelation of the onset curve over 70-180 BPM, weighted toward 120
    const o = Float32Array.from(env.flux),
      mean = o.reduce((a, v) => a + v, 0) / nf;
    for (let i = 0; i < nf; i++) o[i] -= mean;
    let best = 0,
      bestLag = 0;
    const lagOf = bpm => (60 / bpm) * fps;
    for (let lag = Math.floor(lagOf(180)); lag <= Math.ceil(lagOf(70)); lag++) {
      let s = 0;
      for (let i = 0; i + lag < nf; i++) s += o[i] * o[i + lag];
      const bpm = (60 * fps) / lag,
        w = Math.exp(-0.5 * (Math.log2(bpm / 120) / 0.9) ** 2);
      if (s * w > best) {
        best = s * w;
        bestLag = lag;
      }
    }
    // refine the lag to a fraction of a frame (parabola through the neighbours)
    const ac = lag => {
      let s = 0;
      for (let i = 0; i + lag < nf; i++) s += o[i] * o[i + lag];
      return s;
    };
    const a0 = ac(bestLag - 1),
      a1 = ac(bestLag),
      a2 = ac(bestLag + 1),
      dl = (a0 - a2) / (2 * (a0 - 2 * a1 + a2) || 1);
    const beat0 = (bestLag + Math.max(-0.5, Math.min(0.5, dl))) / fps;
    // period and phase together: where the onsets pile up on the grid over the whole song (a 0.5 % error in the period
    // is a whole beat off by the end of a song)
    const gridScore = (b, p) => {
      let s = 0;
      for (let t = p; t < buffer.duration; t += b) s += at(env.flux, t, fps) + 0.6 * at(env.fLow, t, fps);
      return s;
    };
    let bestP = 0,
      bestS = -1,
      beat = beat0;
    for (let r = -0.012; r <= 0.012; r += 0.0005) {
      const b = beat0 * (1 + r);
      for (let p = 0; p < b; p += 0.01) {
        const sc = gridScore(b, p);
        if (sc > bestS) {
          bestS = sc;
          bestP = p;
          beat = b;
        }
      }
    }
    for (let p = bestP - 0.01; p < bestP + 0.01; p += 0.001) {
      const sc = gridScore(beat, p);
      if (sc > bestS) {
        bestS = sc;
        bestP = p;
      }
    }
    bestP = ((bestP % beat) + beat) % beat;
    const beats = [];
    for (let t = bestP; t < buffer.duration - 0.05; t += beat) beats.push(t);
    // the bar's first beat: where the kicks are strongest
    const down = [0, 1, 2, 3].map(p => beats.reduce((s, t, i) => s + (i % 4 === p ? at(env.fLow, t, fps) : 0), 0));
    return { beat, beats, bar0: down.indexOf(Math.max(...down)) };
  };
  // (the network's grid when its beats hold to one; when they do not, whichever of the two grids the kicks fall on
  // harder: the low band's onset strength at each beat, against the song's own spread of it)
  const ml = await heard,
    net = ml && gridOf(ml, buffer.duration),
    kicks = g => {
      // (the raw curve: the normalised one is clipped, and a clipped kick looks like every other)
      const m = fLow.reduce((a, v) => a + v, 0) / nf,
        sd = Math.sqrt(fLow.reduce((a, v) => a + (v - m) ** 2, 0) / nf) || 1;
      let s = 0;
      for (const t of g.beats) {
        const i = Math.round(t * fps);
        s += (Math.max(...fLow.subarray(Math.max(0, i - 2), Math.min(nf, i + 3))) - m) / sd;
      }
      return s / g.beats.length;
    };
  let grid = net && net.coherence >= 0.8 ? net : null;
  if (!grid) {
    const own = fromFlux();
    grid = net && kicks(net) > kicks(own) ? net : { ...own, bar0: (ml && barOf(ml, own.beats, own.beat)) ?? own.bar0 };
  }
  const { beat, beats } = grid;
  // (and the bar's first beat checked against where the song leaps into its loud parts: a drop, a chorus, almost always
  // lands on a bar's first beat. The beat (of four) the big rises fall on, each rise weighed by its square so the few
  // big ones speak louder than the many small; it overrules the grid's when it clearly speaks louder than it)
  let bar0 = grid.bar0;
  {
    const lvl = beats.map((t, j) => {
        let e = 0,
          c = 0;
        for (let i = Math.floor(t * fps); i < (beats[j + 1] ?? t + beat) * fps && i < nf; i++) (e += env.rms[i]), c++;
        return c ? e / c : 0;
      }),
      votes = [0, 0, 0, 0];
    for (let j = 1; j + 1 < beats.length; j++) {
      // (a rise that holds: the beat and the next both up on the beat before)
      const r = Math.min(lvl[j], lvl[j + 1]) - lvl[j - 1];
      if (r > 0.25) votes[j % 4] += r * r;
    }
    const top = votes.indexOf(Math.max(...votes));
    if (votes[top] > 1.5 * votes[bar0] && votes[top] > 0.5) bar0 = top;
  }

  // ---- the drums and the tune apart (hpss.js), and their onsets: peaks over an adaptive threshold
  const { H, P } = hpss(S, nf, NB);
  onProgress(0.9);
  await new Promise(r => setTimeout(r, 0));
  const crack = partFlux(P, nf, bands, 2000, 8000),
    perc = {
      // (the kick: the low drum; the snare: its body and its crack; the hats: the top)
      low: norm(partFlux(P, nf, bands, 40, 150)),
      mid: norm(Float32Array.from(partFlux(P, nf, bands, 150, 400), (v, i) => v + 0.5 * crack[i])),
      high: norm(partFlux(P, nf, bands, 7000, 11000)),
      // (the tune: a note starting in the harmonic part, where voices and leads are)
      lead: norm(partFlux(H, nf, bands, 200, 4000)),
    };
  // (the drums' noise up top: how much of what sounds over 5 kHz is hits (hats, snares, claps, cymbals: broad and
  // short, the percussive part) rather than notes held (a synth's or a voice's harmonics: the harmonic part); a part with
  // a drum beat in it is full of them, a pad pumping with a sidechain or a strummed guitar is not)
  {
    const h0 = bands.centre.findIndex(c => c >= 5000),
      hn = new Float32Array(nf);
    for (let i = 0; i < nf; i++) {
      let p = 0,
        h = 0;
      for (let b = h0; b < NB; b++) ((p += P[i * NB + b]), (h += H[i * NB + b]));
      hn[i] = p / (p + h + 1e-9);
    }
    env.hiss = hn;
  }
  env.harm = norm(energy(H, nf, NB));
  env.perc = norm(energy(P, nf, NB));
  const onsets = [];
  for (const [band, f] of Object.entries(perc)) {
    const w = Math.round(0.25 * fps);
    let last = -1;
    for (let i = 2; i < nf - 2; i++) {
      let s = 0,
        c = 0;
      for (let k = Math.max(0, i - w); k < Math.min(nf, i + w); k++) {
        s += f[k];
        c++;
      }
      const thr = (s / c) * 1.45 + 0.06;
      if (
        f[i] > thr &&
        f[i] >= f[i - 1] &&
        f[i] >= f[i + 1] &&
        f[i] >= f[i - 2] &&
        f[i] >= f[i + 2] &&
        i - last > 0.1 * fps
      ) {
        onsets.push({ t: i / fps, band, s: f[i] });
        last = i;
      }
    }
  }
  // (the tune from the networks when they heard it (ml/listen.js): Basic Pitch's notes for where the tune's notes start,
  // in place of the harmonic part's flux peaks; its height from the voice's pitch where a voice sings, else from those
  // notes; where a voice sings from SwiftF0's sure frames, smoothed as the band's energy was (a quick rise, a slow fall),
  // in place of the melody band's loudness, which a synth or a guitar filled as well)
  const melody = ml && (ml.notes.length >= buffer.duration / 3 || ml.voice) ? melodyOf(ml) : null;
  if (melody) {
    if (melody.line.length >= buffer.duration / 3) {
      for (let k = onsets.length - 1; k >= 0; k--) if (onsets[k].band === 'lead') onsets.splice(k, 1);
      for (const n of melody.line) onsets.push({ t: n[0], band: 'lead', s: Math.min(1.5, 0.4 + n[3]) });
    }
    const pk = 1 - Math.exp(-1 / (0.12 * fps)),
      up = 1 - Math.exp(-1 / (0.1 * fps)),
      down = 1 - Math.exp(-1 / (0.6 * fps));
    let p = 0.5,
      e = 0;
    for (let i = 0; i < nf; i++) {
      const h = melody.heightAt(i / fps);
      if (h !== null) p += (h - p) * pk;
      env.pitch[i] = p;
      if (melody.sung) {
        const on = melody.sungAt(i / fps);
        e += (on - e) * (on > e ? up : down);
        env.voice[i] = e;
      }
    }
  }
  onsets.sort((a, b) => a.t - b.t);
  // the kick drum itself, not any low hit: a kick is narrow (all sub-bass), so the percussive part above, which keeps
  // what is broad across the bands, has the strums of a guitar in its low band and not the kick. So from the whole
  // spectrum under 120 Hz: a sharp rise there (an onset) whose energy is gone again within ~0.12 s (`decay`: a kick's
  // body dies away, a bass note or a held low chord rings on), how hard it is against the song's own hardest such hits
  // (`s`, its 90th percentile 1); the islands leap only on these (level.js)
  const kickHits = [];
  {
    const b1 = bands.centre.findIndex(c => c >= 120),
      b2 = bands.centre.findIndex(c => c >= 160),
      b3 = bands.centre.findIndex(c => c >= 450),
      E = new Float32Array(nf),
      Q = new Float32Array(nf);
    for (let i = 0; i < nf; i++) {
      let e = 0,
        q = 0;
      for (let b = 0; b < b1; b++) e += S[i * NB + b];
      for (let b = b2; b < b3; b++) q += S[i * NB + b];
      E[i] = e / b1;
      Q[i] = q / (b3 - b2);
    }
    const rise = Float32Array.from(E, (e, i) => (i ? Math.max(0, Math.log1p(10 * e) - Math.log1p(10 * E[i - 1])) : 0)),
      w = Math.round(0.25 * fps),
      after = Math.max(2, Math.round(0.12 * fps));
    let last = -1;
    for (let i = 2; i < nf - after - 4; i++) {
      let m = 0,
        c = 0;
      for (let k = Math.max(0, i - w); k < Math.min(nf, i + w); k++) ((m += rise[k]), c++);
      if (rise[i] <= (m / c) * 1.45 + 0.02 || rise[i] < rise[i - 1] || rise[i] < rise[i + 1] || rise[i] < rise[i - 2] || rise[i] < rise[i + 2] || i - last <= 0.1 * fps) continue;
      let pk = E[i],
        pq = Q[i];
      for (let k = i; k <= i + 3; k++) ((pk = Math.max(pk, E[k])), (pq = Math.max(pq, Q[k])));
      let tail = 0;
      for (let k = i + after; k < i + after + 3; k++) tail += E[k] / 3;
      kickHits.push({ t: i / fps, s: rise[i], decay: tail / (pk + 1e-9), dom: pk / (pq + 1e-9) });
      last = i;
    }
    const top = kickHits.map(k => k.s).sort((a, b) => a - b)[Math.floor(kickHits.length * 0.9)] || 1;
    for (const k of kickHits) k.s = Math.min(1.5, k.s / top);
  }
  // (the voice's syllables, when the networks heard it sing: where a note of the line starts while it sings (Basic
  // Pitch's onsets are sharp) and where it starts again after a breath with no such note near; each with its pitch, which
  // way it went from the syllable before (+1 up, -1 down, 0 the same or after a long rest), the move it asks for and how
  // long it is held at that pitch. Apart from the onsets: the song's drive counts those)
  const sylls = melody?.sung ? syllables(ml.voice, melody) : [];

  // ---- bars and sections
  const bars = [];
  for (let i = bar0; i + 4 <= beats.length; i += 4) {
    const t0 = beats[i],
      t1 = beats[i + 4] ?? t0 + 4 * beat;
    let e = 0,
      c = 0,
      lo = 0,
      hi = 0;
    for (let t = t0; t < t1; t += 1 / fps) {
      e += at(env.rms, t, fps);
      lo += at(env.low, t, fps);
      hi += at(env.high, t, fps);
      c++;
    }
    bars.push({ t0, t1, i, e: e / c, low: lo / c, high: hi / c });
  }
  // (each bar named by its loudness against the song's own range: calm, verse, build, drop; a drop where the song
  // rises into a loud part, structure.js)
  songSections(bars);

  // ---- mood
  const major = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
    minor = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  const corr = (prof, key) => {
    const c = [...chroma],
      p = prof.map((_, i) => prof[(i - key + 12) % 12]),
      mc = c.reduce((a, v) => a + v, 0) / 12,
      mp = p.reduce((a, v) => a + v, 0) / 12;
    let sxy = 0,
      sx = 0,
      sy = 0;
    for (let i = 0; i < 12; i++) {
      sxy += (c[i] - mc) * (p[i] - mp);
      sx += (c[i] - mc) ** 2;
      sy += (p[i] - mp) ** 2;
    }
    return sxy / Math.sqrt(sx * sy || 1);
  };
  let bMaj = -2,
    bMin = -2,
    key = 0;
  for (let k = 0; k < 12; k++) {
    const cm = corr(major, k),
      cn = corr(minor, k);
    if (cm > bMaj) bMaj = cm;
    if (cn > bMin) {
      bMin = cn;
      key = k;
    }
  }
  const loud = rms.reduce((a, v) => a + v, 0) / nf,
    bpm = 60 / beat,
    centMean = cent.reduce((a, v) => a + v, 0) / nf;
  const mood = {
    bpm,
    energy: Math.max(0, Math.min(1, (loud - 0.05) / 0.2)),
    bright: Math.max(0, Math.min(1, (centMean - 900) / 2200)),
    minor: Math.max(0, Math.min(1, 0.5 + (bMin - bMaj) * 4)),
    drops: bars.filter(b => b.dropStart).length,
    key,
  };
  // drive: how hard it pushes (dense onsets, heavy low end, fast); masters are all loud, so loudness says little
  const c01 = v => Math.max(0, Math.min(1, v)),
    onRate = onsets.length / buffer.duration,
    lowMean = env.low.reduce((a, v) => a + v, 0) / nf;

  // ---- the seed: the coarse loudness curve, quantized so decoders that differ a little agree
  const coarse = [];
  for (let i = 0; i < nf; i += Math.round(fps / 2)) coarse.push(Math.min(7, Math.floor(env.rms[i] * 6)));
  const seed = fnv(coarse.join('') + '|' + Math.round(buffer.duration));
  onProgress(1);
  const fluxMed = [...env.flux].sort((a, b) => a - b)[Math.floor(nf / 2)];
  const raw = { rms, low, sub, flat, cent };
  // ---- the song's parts by what they sound like (structure.js)
  const parts = songParts({ S, C, H, P, nf, NB, fps, beats, bars, onsets });
  const out = {
    dur: buffer.duration,
    fps,
    env,
    raw,
    beat,
    bpm,
    beats,
    bar0,
    onsets,
    kicks: kickHits,
    vox: sylls,
    bars,
    parts,
    mood,
    seed,
    fluxMed,
    // (the tune's notes, [t, dur, midi, amp], when the network heard them)
    melody: melody?.line ?? null,
    rng: () => mulberry(seed),
  };
  // (the pace it is felt at: how many of its beats make one felt beat, profile.js feltOf; its drive by that pace)
  out.feel = feltOf(features(out));
  mood.drive = c01(c01((onRate - 7) / 5) * 0.4 + c01((lowMean - 0.2) / 0.4) * 0.4 + c01((bpm * out.feel - 85) / 60) * 0.2);
  mood.dark = c01(mood.minor * 0.55 + (1 - mood.bright) * 0.25 + (0.5 - mood.drive) * 0.3);
  mood.tense = mood.drive;
  return out;
}
export const sampleEnv = at;

// the voice's syllables (V: SwiftF0's track, a MIDI pitch every `period` s, 0 unvoiced): { t, midi, dir, high, move, held }
function syllables(V, melody) {
  const at = t => V.midi[Math.floor(t / V.period)] ?? 0,
    out = [];
  for (const n of melody.line) if (at(n[0] + 0.06)) out.push({ t: n[0], midi: n[2] });
  // (a breath of 80 ms at least, then singing: a pitch track starts a little late on a consonant)
  let off = 99;
  for (let i = 0; i < V.midi.length; i++) {
    if (!V.midi[i]) {
      off++;
      continue;
    }
    const t = Math.max(0, i * V.period - 0.03);
    if (off * V.period >= 0.08 && !out.some(o => Math.abs(o.t - t) < 0.12)) out.push({ t, midi: V.midi[Math.min(V.midi.length - 1, i + 3)] || V.midi[i] });
    off = 0;
  }
  out.sort((a, b) => a.t - b.t);
  const kept = [];
  for (const o of out) if (!kept.length || o.t - kept.at(-1).t >= 0.1) kept.push(o);
  const mid = [...kept].map(o => o.midi).sort((a, b) => a - b)[kept.length >> 1] ?? 60;
  kept.forEach((o, k) => {
    const p = kept[k - 1];
    o.dir = !p || o.t - p.t > 2 || Math.abs(o.midi - p.midi) < 1 ? 0 : Math.sign(o.midi - p.midi);
    // (its move: up where the voice goes up, down where it goes down; after a rest by how high it is against the song's
    // middle; the same note again the other move from the last, so a repeated note is not one key hammered)
    o.high = o.midi >= mid;
    o.move = o.dir > 0 ? 'jump' : o.dir < 0 ? 'slide' : !p || o.t - p.t > 2 ? (o.high ? 'jump' : 'slide') : p.move === 'jump' ? 'slide' : 'jump';
    // (held: sung on within a semitone and a half of where it began, through a vibrato and a dropped frame or two (a
    // breath is 80 ms and more), a syllable on the same pitch inside it a re-attack of the same note)
    let u = o.t + 0.06,
      miss = 0;
    while (u - o.t < 8) {
      const m = at(u);
      if (m && Math.abs(m - o.midi) < 1.5) miss = 0;
      else if ((miss += V.period) >= 0.08) break;
      u += V.period;
    }
    o.held = u - miss - o.t;
  });
  return kept;
}
