// The coach's slowed stretches rendered off the page's thread (stretch.js; audio.js asks): a stretch takes a phone a
// hundred milliseconds and more, which on the page would be frames lost while the song plays. Sent the song's samples
// round the stretch and its moments, it answers with the stretch's samples and its map.
import { rateOf, stretchZone } from './stretch.js';

self.onmessage = ({ data: { id, src, sr, base, z } }) => {
  let r = null;
  try {
    r = stretchZone(src, sr, { ...z, rateAt: rateOf(z.ts, z.beat, z.rate) }, base);
  } catch (e) {
    console.warn('stretch:', e.message);
  }
  self.postMessage({ id, r }, r ? r.out.map(o => o.buffer) : []);
};
