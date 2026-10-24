// What a song of the game's sounds like, worked out ahead (tools/known.mjs) and shipped with it (data/known/<id>.bin):
// its whole analysis (analyze.js) exactly as the device would make it, so the level is built the moment this small file
// is here, the song itself still on its way (stream.js): no waiting for the whole song, no decoding it at 44.1 kHz, no
// listening to it. Kept exact (every number as analyze.js made it, the curves' floats bit for bit), so a level is the
// same whichever way it was read; what nothing outside the analysis reads is left out (three of its curves; the raw
// curves, of which only their measures are read: profile.js features, made ahead).
// With it, a fingerprint of the song's first sound (its loudness each millisecond for three seconds, from the same
// decode the analysis read): the song as this device decodes it is matched against it, which says that it is the same
// recording, and how far this device's decoder puts its start from Chrome's (a decoder may keep the encoder's priming
// that another trims), so the song is played that much on and stays on its beat. Anything that does not match, and the
// song is read the slow way (main.js).
// The file: gzip of [length of the header (4 bytes)][the header: the curves' types and lengths, a line, the rest as
// JSON][the curves, each one's bytes laid out by their place in the float (most alike together: it packs smaller)].
import { mulberry } from './rng.js';
import { features } from './profile.js';

export const KNOWN = 1;
// (curves of the analysis nothing outside it reads)
const UNREAD = ['fHigh', 'harm', 'perc'];
// a song's id among those known ahead: a song of the game's by its file, an Audius one by its id
export function knownId(tr, link) {
  if (link) return /^audius:([\w-]+)$/.exec(link)?.[1] ? `a-${link.slice(7)}` : null;
  return tr?.file && !tr.file.includes('/') ? `t-${tr.file.replace(/\.[^.]+$/, '')}` : null;
}
const TYPES = { Float32Array, Float64Array, Int32Array, Uint8Array, Int8Array, Int16Array, Uint16Array, Uint32Array };
// (a typed array's bytes laid out by their place in each number, and back)
function shuffle(u8, k) {
  const n = u8.length / k,
    o = new Uint8Array(u8.length);
  for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) o[j * n + i] = u8[i * k + j];
  return o;
}
function unshuffle(u8, k) {
  const n = u8.length / k,
    o = new Uint8Array(u8.length);
  for (let j = 0; j < k; j++) for (let i = 0; i < n; i++) o[i * k + j] = u8[j * n + i];
  return o;
}
async function squeeze(u8, how) {
  return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(how)).arrayBuffer());
}
// the analysis and what goes with it ({ size, bps, fp }) as the file's bytes (the tool, in a page)
export async function pack(A, extra) {
  const bins = [],
    meta = [],
    keep = {
      ...A,
      env: Object.fromEntries(Object.entries(A.env).filter(([k]) => !UNREAD.includes(k))),
      feats: features(A),
    },
    body = JSON.stringify({ v: KNOWN, A: { ...keep, rng: undefined, raw: undefined }, ...extra }, (k, v) => {
      if (ArrayBuffer.isView(v)) {
        bins.push(shuffle(new Uint8Array(v.buffer, v.byteOffset, v.byteLength), v.BYTES_PER_ELEMENT));
        meta.push([v.constructor.name, v.length]);
        return { $b: bins.length - 1 };
      }
      if (typeof v === 'number' && (!Number.isFinite(v) || Object.is(v, -0)))
        return { $n: Object.is(v, -0) ? '-0' : String(v) };
      return v;
    }),
    head = new TextEncoder().encode(`${JSON.stringify(meta)}\n${body}`),
    at = (4 + head.length + 7) & ~7,
    size = bins.reduce((s, b) => s + ((b.length + 7) & ~7), at),
    out = new Uint8Array(size);
  new DataView(out.buffer).setUint32(0, head.length, true);
  out.set(head, 4);
  let o = at;
  for (const b of bins) {
    out.set(b, o);
    o += (b.length + 7) & ~7;
  }
  return squeeze(out, new CompressionStream('gzip'));
}
// the file's bytes back to { A, size, bps, fp }
export async function unpack(gz) {
  const u8 = await squeeze(gz, new DecompressionStream('gzip')),
    n = new DataView(u8.buffer).getUint32(0, true),
    text = new TextDecoder().decode(u8.subarray(4, 4 + n)),
    cut = text.indexOf('\n'),
    bins = JSON.parse(text.slice(0, cut));
  let o = (4 + n + 7) & ~7;
  const arrs = bins.map(([type, len]) => {
    const T = TYPES[type],
      bytes = len * T.BYTES_PER_ELEMENT,
      a = new T(unshuffle(u8.subarray(o, o + bytes), T.BYTES_PER_ELEMENT).buffer);
    o += (bytes + 7) & ~7;
    return a;
  });
  const out = JSON.parse(text.slice(cut + 1), (k, v) =>
    v && typeof v === 'object' && '$b' in v ? arrs[v.$b] : v && typeof v === 'object' && '$n' in v ? Number(v.$n) : v,
  );
  if (out.v !== KNOWN) return null;
  const A = out.A;
  A.rng = () => mulberry(A.seed);
  return out;
}
// a song's file of what is known of it, or null (none, an old browser, a network that failed)
export async function knownOf(id) {
  if (!id || typeof DecompressionStream === 'undefined') return null;
  try {
    // (first: the song's audio, coming at the same time, waits behind it, stream.js)
    const r = await fetch(new URL(`../data/known/${id}.bin`, import.meta.url), { priority: 'high' });
    return r.ok ? await unpack(new Uint8Array(await r.arrayBuffer())) : null;
  } catch (e) {
    console.warn('known:', e.message);
    return null;
  }
}

// ---- the fingerprint: the song's loudness each millisecond over three seconds of its first sound
const SPAN = 3,
  SEARCH = 0.1;
// the mean loudness of each millisecond from t0, `sec` long (before the song's start: silence), on a log scale 0..1
function loudness(buf, t0, sec) {
  const sr = buf.sampleRate,
    chans = Array.from({ length: Math.min(2, buf.numberOfChannels) }, (_, c) => buf.getChannelData(c)),
    n = Math.round(sec * 1000),
    out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.round((t0 + i / 1000) * sr),
      b = Math.round((t0 + (i + 1) / 1000) * sr);
    let s = 0;
    for (let k = Math.max(0, a); k < Math.min(b, chans[0].length); k++) for (const x of chans) s += Math.abs(x[k]);
    out[i] = Math.log1p((300 * s) / Math.max(1, (b - a) * chans.length)) / Math.log1p(300);
  }
  return out;
}
// the fingerprint of a decoded song (the tool: the 44.1 kHz decode the analysis read): where its first sound is (the
// first 50 ms a fiftieth as loud as the loudest of its first minute, less half a second), and its loudness from there
export function fingerprint(buf) {
  const sr = buf.sampleRate,
    x = buf.getChannelData(0),
    w = Math.round(0.05 * sr),
    rms = [];
  for (let i = 0; i + w <= Math.min(x.length, 60 * sr); i += w) {
    let e = 0;
    for (let k = i; k < i + w; k++) e += x[k] * x[k];
    rms.push(Math.sqrt(e / w));
  }
  const top = Math.max(...rms),
    first = Math.max(
      0,
      rms.findIndex(v => v >= top * 0.02),
    ),
    t0 = Math.max(SEARCH, first * 0.05 - 0.5);
  return { t0: +t0.toFixed(3), v: Uint8Array.from(loudness(buf, t0, SPAN), v => Math.round(v * 255)) };
}
// the seconds that the song as decoded here (`buf`, its first t0 + 3.2 s at least) is late against the fingerprint
// (0 when they agree to the millisecond, as Chrome's decoder does with itself), or null if it is not the same song
export function lagOf(fp, buf) {
  const ref = Float32Array.from(fp.v, v => v / 255),
    here = loudness(buf, fp.t0 - SEARCH, SPAN + 2 * SEARCH),
    n = ref.length,
    L = Math.round(SEARCH * 1000),
    mean = a => a.reduce((s, v) => s + v, 0) / a.length,
    mr = mean(ref);
  let sr = 0;
  for (const v of ref) sr += (v - mr) ** 2;
  const corr = new Float64Array(2 * L + 1);
  for (let d = -L; d <= L; d++) {
    const seg = here.subarray(L + d, L + d + n),
      mh = mean(seg);
    let xy = 0,
      sh = 0;
    for (let i = 0; i < n; i++) {
      xy += (ref[i] - mr) * (seg[i] - mh);
      sh += (seg[i] - mh) ** 2;
    }
    corr[d + L] = xy / Math.sqrt(sr * sh || 1);
  }
  let k = 0;
  for (let i = 1; i < corr.length; i++) if (corr[i] > corr[k]) k = i;
  if (corr[k] < 0.9) return null;
  // (the peak between the milliseconds: a parabola through it and its neighbours)
  const a = corr[k - 1] ?? corr[k],
    c = corr[k + 1] ?? corr[k],
    frac = a - 2 * corr[k] + c < 0 ? (0.5 * (a - c)) / (a - 2 * corr[k] + c) : 0,
    lag = (k - L + frac) / 1000;
  return Math.abs(lag) < 0.002 ? 0 : lag;
}
// how much of the song must be decoded to match it
export const fpNeeds = fp => fp.t0 + SPAN + SEARCH + 0.1;
