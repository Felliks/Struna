// The song heard by two small networks, off the main thread (ONNX Runtime on WebAssembly, one thread each):
//   beats  BeatNet (Heydari et al. 2021, CC BY 4.0; the browser port by J. Gorset, MIT): where the beats and the bars'
//          first beats are
//   pitch  Basic Pitch (Spotify 2022, Apache-2.0): which notes sound in each frame and where they start, for a run of
//          its 2 s windows (the song is split between several workers)
//   voice  Spleeter's vocals net (Deezer 2019, MIT; as exported by sherpa-onnx) takes the voice out of the stereo song,
//          and SwiftF0 (Nieradzik 2025, MIT) says how high it sings and whether it sings, every 16 ms
import * as ort from '../../vendor/ml/ort/ort.wasm.min.mjs';
import { createBeatNet } from '../../vendor/ml/beatnet/index.js';
import FFT from '../../vendor/ml/beatnet/fft.js';

const ML = new URL('../../vendor/ml/', import.meta.url).href;
ort.env.wasm.wasmPaths = `${ML}ort/`;
ort.env.wasm.numThreads = 1;

// Basic Pitch's window: 2 s at 22050 Hz less one hop; 172 frames out of it, the 15 at each edge overlapping the next
const BP = { N: 43844, FRAMES: 172, EDGE: 15 };

// Spleeter's spectrogram: 4096-point frames every 1024 samples at 44.1 kHz (Hann, not centred), its lowest 1024 bins,
// 512 frames to a pass; the voice resynthesised only below 7.5 kHz (SwiftF0 hears 16 kHz audio)
const SN = 4096,
  SH = 1024,
  SPLIT = 512,
  KEEP_BINS = Math.round((7500 * SN) / 44100),
  HANN = Float32Array.from({ length: SN }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / SN));
// SwiftF0: 16 kHz, a frame every 256 samples, passes of 1875 frames with 11 frames before and 10 after for context;
// a frame whose audio peaks below 1e-3 is silence (the net would hear random voices in it)
const F0 = { SR: 16000, HOP: 256, WIN: 1875, LEFT: 11, AHEAD: 10, SILENCE: 1e-3 };

// the stereo song's spectra (each frame's complex bins), frame by frame
function spectra(x, fft) {
  const n = Math.max(0, 1 + Math.floor((x.length - SN) / SH)),
    re = new Float32Array(n * (SN / 2 + 1)),
    im = new Float32Array(n * (SN / 2 + 1)),
    inp = new Float64Array(SN),
    out = fft.createComplexArray();
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < SN; k++) inp[k] = x[i * SH + k] * HANN[k];
    fft.realTransform(out, inp);
    for (let b = 0; b <= SN / 2; b++) {
      re[i * (SN / 2 + 1) + b] = out[2 * b];
      im[i * (SN / 2 + 1) + b] = out[2 * b + 1];
    }
  }
  return { n, re, im };
}

// the voice of a stretch of the song, mono at 44.1 kHz: both channels' spectra, Spleeter's estimate of the voice made a
// soft mask on the mix, the masked frames added back together
async function voice(L, R, say) {
  const fft = new FFT(SN),
    B = SN / 2 + 1,
    a = spectra(L, fft),
    b = spectra(R, fft),
    n = a.n,
    passes = Math.ceil(n / SPLIT),
    sp = await ort.InferenceSession.create(`${ML}spleeter/vocals.fp16.onnx`, { executionProviders: ['wasm'] }),
    mask = new Float32Array(n * KEEP_BINS);
  for (let p = 0; p < passes; p++) {
    const x = new Float32Array(2 * SPLIT * 1024);
    for (let c = 0; c < 2; c++) {
      const s = c ? b : a;
      for (let f = 0; f < SPLIT && p * SPLIT + f < n; f++)
        for (let k = 0; k < 1024; k++) {
          const j = (p * SPLIT + f) * B + k;
          x[(c * SPLIT + f) * 1024 + k] = Math.hypot(s.re[j], s.im[j]);
        }
    }
    const y = (await sp.run({ x: new ort.Tensor('float32', x, [2, 1, SPLIT, 1024]) })).y.data;
    for (let f = 0; f < SPLIT && p * SPLIT + f < n; f++)
      for (let k = 0; k < KEEP_BINS; k++) {
        const i0 = f * 1024 + k,
          i1 = (SPLIT + f) * 1024 + k;
        mask[(p * SPLIT + f) * KEEP_BINS + k] = Math.min(1, (y[i0] + y[i1]) / (x[i0] + x[i1] + 1e-8));
      }
    say((p + 1) / passes);
  }
  await sp.release();
  const len = L.length,
    v = new Float32Array(len),
    wsum = new Float32Array(len),
    buf = new Float64Array(2 * SN),
    out = fft.createComplexArray();
  for (let i = 0; i < n; i++) {
    buf.fill(0);
    for (let k = 0; k < KEEP_BINS; k++) {
      const j = i * B + k,
        m = mask[i * KEEP_BINS + k] / 2;
      buf[2 * k] = (a.re[j] + b.re[j]) * m;
      buf[2 * k + 1] = (a.im[j] + b.im[j]) * m;
    }
    fft.completeSpectrum(buf);
    fft.inverseTransform(out, buf);
    for (let k = 0; k < SN; k++) {
      v[i * SH + k] += out[2 * k] * HANN[k];
      wsum[i * SH + k] += HANN[k] * HANN[k];
    }
  }
  for (let i = 0; i < len; i++) v[i] /= Math.max(wsum[i], 1e-3);
  return v;
}

// how high the voice sings and whether it sings, every 16 ms: the voice (44.1 kHz) to 16 kHz (it is below 7.5 kHz
// already: straight interpolation is enough), SwiftF0 over it in passes with their context
async function pitchOf(v) {
  const len = v.length,
    n16 = Math.floor((len * F0.SR) / 44100),
    v16 = new Float32Array(n16);
  for (let i = 0; i < n16; i++) {
    const u = (i * 44100) / F0.SR,
      k = Math.floor(u);
    v16[i] = (v[k] ?? 0) + ((v[k + 1] ?? 0) - (v[k] ?? 0)) * (u - k);
  }
  const f0 = await ort.InferenceSession.create(`${ML}swift-f0/swift-f0.onnx`, { executionProviders: ['wasm'] }),
    nf = Math.max(1, Math.floor(n16 / F0.HOP)),
    hz = new Float32Array(nf),
    conf = new Float32Array(nf),
    scalar = x => new ort.Tensor('float32', new Float32Array([x]), []);
  for (let s = 0; s < nf; s += F0.WIN) {
    const e = Math.min(s + F0.WIN, nf),
      l = Math.max(0, s - F0.LEFT),
      w = v16.slice(l * F0.HOP, e < nf ? (e + F0.AHEAD) * F0.HOP : n16),
      o = await f0.run({ audio: new ort.Tensor('float32', w, [1, w.length]), fmin: scalar(65), fmax: scalar(1200) });
    hz.set(o.pitch.data.subarray(s - l, e - l), s);
    conf.set(o.confidence.data.subarray(s - l, e - l), s);
  }
  await f0.release();
  for (let i = 0; i < nf; i++) {
    let pk = 0;
    for (let k = i * F0.HOP; k < (i + 1) * F0.HOP && k < n16; k++) pk = Math.max(pk, Math.abs(v16[k]));
    if (pk < F0.SILENCE) conf[i] = 0;
  }
  return { hz, conf, period: F0.HOP / F0.SR };
}

self.onmessage = async ({ data }) => {
  try {
    if (data.job === 'voice') {
      const v = await voice(data.L, data.R, p => self.postMessage({ progress: p }));
      self.postMessage({ v }, [v.buffer]);
    } else if (data.job === 'f0') {
      const r = await pitchOf(data.v);
      self.postMessage(r, [r.hz.buffer, r.conf.buffer]);
    } else if (data.job === 'beats') {
      const tracker = await createBeatNet({ modelUrl: `${ML}beatnet/beatnet.onnx` });
      const { beats, downbeats } = await tracker.analyze(data.x);
      await tracker.dispose();
      self.postMessage({ beats, downbeats });
    } else {
      const s = await ort.InferenceSession.create(`${ML}basic-pitch/nmp.onnx`, { executionProviders: ['wasm'] }),
        { x, hop, count } = data,
        keep = BP.FRAMES - 2 * BP.EDGE,
        frames = new Float32Array(count * keep * 88),
        onsets = new Float32Array(count * keep * 88);
      for (let w = 0; w < count; w++) {
        const win = new Float32Array(BP.N);
        win.set(x.subarray(w * hop, w * hop + BP.N));
        const o = await s.run({ 'serving_default_input_2:0': new ort.Tensor('float32', win, [1, BP.N, 1]) });
        frames.set(o['StatefulPartitionedCall:1'].data.subarray(BP.EDGE * 88, (BP.FRAMES - BP.EDGE) * 88), w * keep * 88);
        onsets.set(o['StatefulPartitionedCall:2'].data.subarray(BP.EDGE * 88, (BP.FRAMES - BP.EDGE) * 88), w * keep * 88);
        self.postMessage({ progress: (w + 1) / count });
      }
      await s.release();
      self.postMessage({ frames, onsets }, [frames.buffer, onsets.buffer]);
    }
  } catch (e) {
    self.postMessage({ error: String(e?.message ?? e) });
  }
};
