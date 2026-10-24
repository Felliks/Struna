// The song heard by networks (ml/listen-worker.js), not only by our formulas: BeatNet finds the beats and the bars'
// first beats far more surely than an autocorrelation (ours sat half a beat off on a third of the songs), Basic Pitch
// finds the notes. Both run in workers while analyze.js reads the song, Basic Pitch split across several. The answer is
// kept on the device per song (a song always gets the same one); null if the networks cannot run or take too long, and
// the song is then read by the formulas alone.
import { fnv } from '../rng.js';

const SR = 22050,
  // Basic Pitch's window (2 s less one hop), its 172 frames less the overlap trimmed at each edge, its frame rate
  N = 43844,
  EDGE = 15,
  KEPT = 172 - 2 * EDGE,
  FPS = SR / 256,
  HOP = N - 2 * EDGE * 256,
  TIMEOUT = 150000,
  VERSION = 3,
  KEEP = 24;

// a key for the song from its own samples: the loudness of each half second, coarsely (decoders that differ a little agree)
function keyOf(x) {
  const n = Math.floor(SR / 2),
    r = [];
  for (let i = 0; i + n <= x.length; i += n) {
    let e = 0;
    for (let k = i; k < i + n; k += 8) e += x[k] * x[k];
    r.push(Math.sqrt(e / (n / 8)));
  }
  const top = [...r].sort((a, b) => a - b)[Math.floor(r.length * 0.98)] || 1;
  return `${VERSION}-${fnv(r.map(v => Math.min(7, Math.floor((v / top) * 6))).join('') + '|' + Math.round(x.length / SR))}`;
}
function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}
// (the newest few songs kept: the oldest given up when there are more)
function save(key, v) {
  try {
    const idx = (load('sim.listen.index') ?? []).filter(k => k !== key);
    idx.push(key);
    while (idx.length > KEEP) localStorage.removeItem(idx.shift());
    localStorage.setItem(key, JSON.stringify(v));
    localStorage.setItem('sim.listen.index', JSON.stringify(idx));
  } catch {}
}

const worker = () => new Worker(new URL('./listen-worker.js', import.meta.url), { type: 'module' });
function ask(w, msg, transfer, onProgress) {
  return new Promise((res, rej) => {
    w.onmessage = ({ data }) => {
      if (data.progress !== undefined) return onProgress?.(data.progress);
      data.error ? rej(new Error(data.error)) : res(data);
    };
    w.onerror = e => rej(new Error(e.message || 'worker failed'));
    w.postMessage(msg, transfer);
  });
}

// the tune's line from Basic Pitch's activations: in each frame the highest note sounding in a voice's or a lead's range
// (G3..C6, the skyline), held while it bends by a semitone; a note ends when the line goes quiet or leaps, and a new one
// starts on the same pitch where its onset peaks again (a voice repeating a note: each syllable its own note)
const LO = 55 - 21,
  HI = 84 - 21,
  ON = 0.35,
  MINLEN = 4;
function lineOf(F, O, n, timeOf) {
  const out = [],
    top = new Int16Array(n).fill(-1);
  for (let i = 0; i < n; i++)
    for (let p = HI; p >= LO; p--)
      if (F[i * 88 + p] >= ON) {
        top[i] = p;
        break;
      }
  let cur = null,
    gap = 0;
  const end = i => {
    if (cur && i - cur.i0 >= MINLEN) out.push([+timeOf(cur.i0).toFixed(3), +(timeOf(i) - timeOf(cur.i0)).toFixed(3), cur.p + 21, +(cur.a / (i - cur.i0)).toFixed(2)]);
    cur = null;
  };
  for (let i = 0; i < n; i++) {
    const p = top[i];
    if (p < 0) {
      if (cur && ++gap > 2) end(i - gap + 1);
      continue;
    }
    gap = 0;
    const o = O[i * 88 + p],
      again = cur && Math.abs(p - cur.p) <= 1 && i - cur.i0 > 6 && o > 0.5 && o >= O[(i - 1) * 88 + p] && o >= O[(i + 1) * 88 + p];
    if (cur && (Math.abs(p - cur.p) > 1 || again)) end(i);
    if (!cur) cur = { i0: i, p, a: 0 };
    cur.a += F[i * 88 + p];
  }
  end(n);
  return out;
}

// the tune's notes: Basic Pitch's windows split between `k` workers, its frames joined, the line read out of them
async function notesOf(x, k, onProgress) {
  const pad = new Float32Array(EDGE * 256 + x.length);
  pad.set(x, EDGE * 256);
  const windows = Math.ceil(pad.length / HOP),
    per = Math.ceil(windows / k),
    n = Math.ceil(windows / per),
    done = new Float32Array(n),
    jobs = [];
  for (let j = 0; j < n; j++) {
    const first = j * per,
      count = Math.min(per, windows - first),
      slice = new Float32Array(count * HOP + N);
    slice.set(pad.subarray(first * HOP, Math.min(pad.length, first * HOP + slice.length)));
    const w = worker();
    jobs.push(
      ask(w, { job: 'pitch', x: slice, hop: HOP, count }, [slice.buffer], p => {
        done[j] = p;
        onProgress(done.reduce((s, v) => s + v, 0) / n);
      }).finally(() => w.terminate()),
    );
  }
  const parts = await Promise.all(jobs),
    len = parts.reduce((s, p) => s + p.frames.length, 0),
    F = new Float32Array(len),
    O = new Float32Array(len);
  parts.reduce((o, p) => (F.set(p.frames, o), O.set(p.onsets, o), o + p.frames.length), 0);
  // (each window keeps KEPT frames but moves HOP samples on: a frame's time from its window and its place in it)
  const nf = Math.min(len / 88, Math.ceil((x.length / SR) * FPS)),
    timeOf = i => (Math.floor(i / KEPT) * HOP + (i % KEPT) * 256) / SR;
  return lineOf(F, O, nf, timeOf);
}

// the voice taken out of the song and its pitch (the worker's `voice` job), kept compact: a frame every 16 ms, its pitch
// as a MIDI note to a tenth where SwiftF0 is sure it sings (confidence 0.5 and over), 0 where it does not
async function voiceOf(buffer, k, onProgress) {
  const L = buffer.getChannelData(0),
    R = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : L,
    // (the song cut into k stretches of whole frames, each with 4 frames more at both ends, so every sample kept is
    // covered by the frames of its own stretch; the stretches' voices joined)
    SH = 1024,
    SN = 4096,
    frames = Math.max(1, 1 + Math.floor((L.length - SN) / SH)),
    per = Math.ceil(frames / k),
    done = new Float32Array(k),
    v = new Float32Array(L.length);
  await Promise.all(
    Array.from({ length: k }, async (_, j) => {
      const f0 = j * per,
        f1 = Math.min(frames, f0 + per);
      if (f0 >= f1) return (done[j] = 1);
      const a = Math.max(0, f0 - 4) * SH,
        b = Math.min(L.length, (Math.min(frames, f1 + 4) - 1) * SH + SN),
        cl = L.slice(a, b),
        cr = R.slice(a, b),
        w = worker(),
        r = await ask(w, { job: 'voice', L: cl, R: cr }, [cl.buffer, cr.buffer], p => ((done[j] = p), onProgress((0.9 * done.reduce((s, x) => s + x, 0)) / k))).finally(() => w.terminate()),
        s0 = j ? f0 * SH : 0,
        s1 = f1 === frames ? L.length : f1 * SH;
      v.set(r.v.subarray(s0 - a, s1 - a), s0);
    }),
  );
  const w = worker(),
    r = await ask(w, { job: 'f0', v }, [v.buffer]).finally(() => w.terminate());
  onProgress(1);
  return { period: r.period, midi: Array.from(r.hz, (h, i) => (r.conf[i] >= 0.5 && h > 0 ? Math.round((12 * Math.log2(h / 440) + 69) * 10) / 10 : 0)) };
}
// (taking the voice out is heavy: a computer does it for any song; a phone only reads it for the game's own songs,
// worked out ahead, and plays a song of its own on the tune's line alone)
const strong = () => typeof matchMedia !== 'undefined' && !matchMedia('(pointer: coarse)').matches && (navigator.deviceMemory ?? 8) >= 4;

// x: the song as mono samples at 22050 Hz, buffer: the song itself at 44.1 kHz. Resolves to { beats, downbeats, notes:
// the tune's line [[t, dur, midi, amp]...], voice: { period, midi } or null } or null; a song analysed ahead
// (tools/heard.mjs) is read from data/heard/ instead
export async function listen(x, buffer, onProgress = () => {}) {
  // (?noml: the formulas alone, to compare)
  if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined' || new URLSearchParams(location.search).has('noml')) return null;
  const key = keyOf(x),
    hit = load(`sim.listen.${key}`);
  if (hit) return (onProgress(1), hit);
  const shipped = await fetch(new URL(`../../data/heard/${key}.json`, import.meta.url)).then(r => (r.ok ? r.json() : null)).catch(() => null);
  if (shipped) return (save(`sim.listen.${key}`, shipped), onProgress(1), shipped);
  // (one worker for the beats, the rest of the cores but one for the notes, three at most)
  const k = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 2) - 2)),
    withVoice = buffer && strong(),
    prog = [0, 0, withVoice ? 0 : 1],
    tell = () => onProgress(withVoice ? prog[0] * 0.1 + prog[1] * 0.3 + prog[2] * 0.6 : prog[0] * 0.2 + prog[1] * 0.8),
    bw = worker(),
    beats = ask(bw, { job: 'beats', x: x.slice() }).finally(() => bw.terminate()).then(r => ((prog[0] = 1), tell(), r)),
    notes = notesOf(x, k, p => ((prog[1] = p), tell())),
    // (a voice that cannot be taken out is no reason to lose the rest)
    voice = withVoice ? voiceOf(buffer, k, p => ((prog[2] = p), tell())).catch(e => (console.warn('listen voice:', e.message), null)) : null;
  let timer;
  const out = await Promise.race([
    Promise.all([beats, notes, voice]).then(([b, notes, voice]) => ({ beats: b.beats.map(t => +t.toFixed(3)), downbeats: b.downbeats.map(t => +t.toFixed(3)), notes, voice })),
    new Promise(res => (timer = setTimeout(() => res(null), TIMEOUT))),
  ]).catch(e => (console.warn('listen:', e.message), null));
  clearTimeout(timer);
  if (out) save(`sim.listen.${key}`, out);
  return out;
}

// one constant grid through the network's beats (the level is built on one): the period and phase that put most of its
// beats nearest a grid line, searched round the median interval; the bar's first beat where most of its downbeats fall
export function gridOf(ml, dur) {
  const B = ml.beats;
  if (B.length < 16) return null;
  // (the network's frames are 20 ms: its intervals come in steps of that, so the period is the mean of the intervals
  // near their median, not the median itself; skipped and doubled beats left out)
  const ibi = B.slice(1).map((b, i) => b - B[i]).sort((a, b) => a - b),
    med = ibi[ibi.length >> 1],
    near = ibi.filter(v => Math.abs(v - med) < med * 0.1),
    p0 = near.reduce((s, v) => s + v, 0) / near.length,
    score = (p, ph) => {
      let s = 0;
      for (const t of B) {
        const d = Math.abs(t - ph - Math.round((t - ph) / p) * p);
        if (d < 0.05) s += 1 - d / 0.05;
      }
      return s;
    };
  let best = -1,
    beat = p0,
    phase = 0;
  for (let r = -0.025; r <= 0.025; r += 0.0002) {
    const p = p0 * (1 + r);
    for (let ph = 0; ph < p; ph += 0.005) {
      const s = score(p, ph);
      if (s > best) [best, beat, phase] = [s, p, ph];
    }
  }
  for (let ph = phase - 0.005; ph <= phase + 0.005; ph += 0.0005) {
    const s = score(beat, ph);
    if (s > best) [best, phase] = [s, ph];
  }
  // (then a straight line through the beats that sit near the grid: the search's steps are too coarse for a whole song,
  // a step of its period is ~70 ms by the end of one)
  const fit = B.map(t => [Math.round((t - phase) / beat), t]).filter(([i, t]) => Math.abs(t - phase - i * beat) < 0.06);
  if (fit.length > 16) {
    const n = fit.length,
      mi = fit.reduce((s, f) => s + f[0], 0) / n,
      mt = fit.reduce((s, f) => s + f[1], 0) / n;
    let sit = 0,
      sii = 0;
    for (const [i, t] of fit) {
      sit += (i - mi) * (t - mt);
      sii += (i - mi) ** 2;
    }
    beat = sit / sii;
    phase = mt - mi * beat;
  }
  phase = ((phase % beat) + beat) % beat;
  const beats = [];
  for (let t = phase; t < dur - 0.05; t += beat) beats.push(t);
  // (how many of its beats the grid holds: a network that flipped to the off-beat for a while fits no one grid)
  const coherence = B.filter(t => Math.abs(t - phase - Math.round((t - phase) / beat) * beat) < 0.05).length / B.length;
  return { beat, beats, bar0: barOf(ml, beats, beat) ?? 0, coherence };
}

// the bar's first beat on a grid: the beat (of four) most of the network's downbeats fall on; null if they do not agree
export function barOf(ml, beats, beat) {
  const votes = [0, 0, 0, 0];
  for (const d of ml.downbeats) {
    const i = Math.round((d - beats[0]) / beat);
    if (i >= 0 && Math.abs(d - beats[0] - i * beat) < 0.07) votes[i % 4]++;
  }
  const top = Math.max(...votes);
  return top >= 0.4 * votes.reduce((s, v) => s + v, 0) && top > 0 ? votes.indexOf(top) : null;
}

// the tune: its notes (Basic Pitch's line: where they start is sharp, a voice's pitch track starts late on a consonant)
// and how high it is at a moment, 0..1 against the song's own range: the voice's pitch where SwiftF0 hears it sing,
// else the line's note sounding then, else null (held where it was). `sung`: a twelfth of the song sung at least
export function melodyOf(ml) {
  const line = ml.notes,
    range = ps => {
      const s = [...ps].sort((a, b) => a - b),
        lo = s[Math.floor(s.length * 0.1)] ?? 60,
        hi = s[Math.floor(s.length * 0.9)] ?? 72;
      return m => Math.max(0, Math.min(1, (m - lo) / (hi - lo || 1)));
    },
    V = ml.voice,
    sungs = V ? V.midi.filter(m => m) : [],
    sung = sungs.length >= (V?.midi.length ?? 1) / 12,
    ofVoice = range(sungs),
    ofLine = range(line.map(n => n[2]));
  let j = 0;
  // (asked in time order, as analyze.js walks its frames)
  const heightAt = t => {
    const m = sung ? V.midi[Math.floor(t / V.period)] : 0;
    if (m) return ofVoice(m);
    while (j + 1 < line.length && line[j + 1][0] <= t) j++;
    const n = line[j];
    return n && n[0] <= t && t < n[0] + n[1] + 0.25 ? ofLine(n[2]) : null;
  };
  return { line, sung, heightAt, sungAt: t => (sung && V.midi[Math.floor(t / V.period)] ? 1 : 0) };
}
