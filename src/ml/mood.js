// The optional neural mood (Essentia.js MusiCNN classifiers, ml/mood-worker.js): how happy, sad, aggressive and relaxed
// the song sounds, 0..1 each, refining the formulas' profile (profile.js). Off by default: the models are licensed for
// non-commercial use only (CC BY-NC-SA 4.0). The answer is kept per song on the device, so a song always gets the
// same one and the same world. ?ml=1 turns it on for a try.
export const ML_ENABLED = new URLSearchParams(location.search).has('ml');
const BASE = new URL('../../models', import.meta.url).href,
  TIMEOUT = 40000;

const key = seed => `sim.ml.${seed}`;
export function cachedMood(seed) {
  try {
    return JSON.parse(localStorage.getItem(key(seed)));
  } catch {
    return null;
  }
}

// the mood of an AudioBuffer (resampled to 16 kHz mono for the models), cached by the song's seed; null if it fails or
// takes too long (the song is then played on the formulas alone)
export async function neuralMood(buffer, seed) {
  const hit = cachedMood(seed);
  if (hit) return hit;
  const len = Math.ceil(buffer.duration * 16000),
    off = new OfflineAudioContext(1, len, 16000),
    src = off.createBufferSource();
  src.buffer = buffer;
  src.connect(off.destination);
  src.start();
  // (three 15 s excerpts, at a quarter, half and three quarters of the song: the mood without the whole song's cost)
  const all = (await off.startRendering()).getChannelData(0),
    span = 15 * 16000,
    parts = [0.25, 0.5, 0.75].map(u => all.subarray(Math.max(0, Math.floor(u * all.length - span / 2)), Math.min(all.length, Math.floor(u * all.length + span / 2)))),
    audio = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  parts.reduce((o, p) => (audio.set(p, o), o + p.length), 0);
  const worker = new Worker(new URL('./mood-worker.js', import.meta.url), { type: 'module' });
  const mood = await new Promise(res => {
    const t = setTimeout(() => res(null), TIMEOUT);
    worker.onmessage = ({ data }) => {
      clearTimeout(t);
      res(data.mood ?? null);
    };
    worker.onerror = () => res(null);
    worker.postMessage({ audio, base: BASE }, [audio.buffer]);
  });
  worker.terminate();
  if (mood)
    try {
      localStorage.setItem(key(seed), JSON.stringify(mood));
    } catch {}
  return mood;
}
