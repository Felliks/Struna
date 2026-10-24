// The song split in two by what kind of sound it is (harmonic-percussive separation: FitzGerald 2010, with Driedger,
// Müller and Disch's margin, 2014), so the drums and the tune are read apart:
//   - a spectrogram in a few dozen log-spaced bands (bands, add): cheap, and enough to tell a kick from a voice
//   - a sound that holds its pitch is a line along time in it (a voice, a pad, a lead): smoothed along time (a running
//     median) it stays; a hit is a line across the bands at one moment (a kick, a snare, a hat): smoothed across the
//     bands it stays. Each band at each moment goes to the side that kept it clearly more (the margin: by BETA), the
//     rest to neither, so hats and noise do not leak into the tune
//   - the onset curves (flux): how sharply each part rises, in a range of bands: the drums' kick, snare and hats from
//     the percussive part; the tune's notes from the harmonic part
// A song analysed in the browser: all of it a few hundred milliseconds in a worker-free loop (the medians are of 17
// and 9 values).
const BETA = 2;

// the bands: NB log-spaced from F0 to F1 Hz, each FFT bin's band (-1: outside), and each band's centre
export function bandsOf(N, SR, NB = 48, F0 = 40, F1 = 11000) {
  const of = new Int16Array(N / 2).fill(-1),
    centre = new Float32Array(NB),
    l0 = Math.log(F0),
    l1 = Math.log(F1);
  for (let k = 1; k < N / 2; k++) {
    const f = (k * SR) / N;
    if (f >= F0 && f < F1) of[k] = Math.min(NB - 1, Math.floor(((Math.log(f) - l0) / (l1 - l0)) * NB));
  }
  for (let b = 0; b < NB; b++) centre[b] = Math.exp(l0 + ((b + 0.5) / NB) * (l1 - l0));
  return { of, centre, NB };
}

// the median of the first n values of a scratch array (n small: an insertion sort)
function median(a, n) {
  for (let i = 1; i < n; i++) {
    const v = a[i];
    let j = i - 1;
    for (; j >= 0 && a[j] > v; j--) a[j + 1] = a[j];
    a[j + 1] = v;
  }
  return n % 2 ? a[n >> 1] : (a[(n >> 1) - 1] + a[n >> 1]) / 2;
}

// S: band magnitudes, frame by frame (nf x NB). Returns the harmonic and the percussive parts (same shape), each band
// at each frame wholly in one, the other or neither
export function hpss(S, nf, NB, { along = 17, across = 9 } = {}) {
  const H = new Float32Array(nf * NB),
    P = new Float32Array(nf * NB),
    tmp = new Float32Array(Math.max(along, across)),
    ht = along >> 1,
    hb = across >> 1;
  for (let i = 0; i < nf; i++)
    for (let b = 0; b < NB; b++) {
      let n = 0;
      for (let k = Math.max(0, i - ht); k <= Math.min(nf - 1, i + ht); k++) tmp[n++] = S[k * NB + b];
      const h = median(tmp, n);
      n = 0;
      for (let c = Math.max(0, b - hb); c <= Math.min(NB - 1, b + hb); c++) tmp[n++] = S[i * NB + c];
      const p = median(tmp, n),
        v = S[i * NB + b];
      if (h > BETA * p) H[i * NB + b] = v;
      else if (p > BETA * h) P[i * NB + b] = v;
    }
  return { H, P };
}

// how sharply a part rises at each frame in the bands whose centres are in [f0, f1) Hz (log-compressed flux)
export function flux(M, nf, bands, f0, f1, gamma = 10) {
  const { centre, NB } = bands,
    out = new Float32Array(nf),
    lo = centre.findIndex(c => c >= f0),
    hi = centre.findIndex(c => c >= f1);
  const b0 = lo < 0 ? NB : lo,
    b1 = hi < 0 ? NB : hi;
  for (let i = 1; i < nf; i++) {
    let s = 0;
    for (let b = b0; b < b1; b++) s += Math.max(0, Math.log1p(gamma * M[i * NB + b]) - Math.log1p(gamma * M[(i - 1) * NB + b]));
    out[i] = s;
  }
  return out;
}

// how loud a part is at each frame (all its bands)
export function energy(M, nf, NB) {
  const out = new Float32Array(nf);
  for (let i = 0; i < nf; i++) {
    let s = 0;
    for (let b = 0; b < NB; b++) s += M[i * NB + b];
    out[i] = s;
  }
  return out;
}
