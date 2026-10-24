// The song's profile: how it feels, from absolute measures (not against itself, so a chill song stays chill at its
// loudest). Research behind the weights:
//   - arousal rises with loudness, tempo and the density of events; brightness counts for little (Yang's review of
//     music emotion recognition; Eerola, ISMIR 2009)
//   - valence follows major vs minor and brightness; in a minor key a faster tempo raises arousal, not valence
//     (Schubert 1999)
//   - hard electronic music: sub-bass held under the drops (808s, wobbles), the bass modulated at sub-beat rates (a
//     wobble is an LFO at 1/4-1/16 notes on the bass), noisy distorted mids (spectral flatness), the snare on beat 3
//     (half time), the top ducking after each kick (sidechain pumping)
// Low-level features explain half of how music feels at best, so these are leanings, not labels.
const c01 = v => Math.max(0, Math.min(1, v));
const mean = (a, i0 = 0, i1 = a.length) => {
  // (a song that stops dead has its last bar run past the end of the measures)
  i1 = Math.min(i1, a.length);
  let s = 0;
  for (let i = i0; i < i1; i++) s += a[i];
  return s / Math.max(1, i1 - i0);
};

// the raw measures, from an analysis (analyze.js); a song known ahead brings them made (known.js: its raw curves are left
// out of its file)
export function features(A) {
  // (a song known ahead from before the off-beat measure was made: it is worked out from its onsets, which it keeps)
  if (A.feats) return { ...A.feats, off: A.feats.off ?? offOf(A) };
  const { raw, fps, beat, bars, onsets, beats, bar0 } = A,
    loudBars = bars.filter(b => b.kind === 'drop' || b.kind === 'build'),
    span = list => list.map(b => [Math.floor(b.t0 * fps), Math.floor(b.t1 * fps)]),
    over = (arr, spans) => (spans.length ? spans.reduce((s, [a, b]) => s + mean(arr, a, b), 0) / spans.length : mean(arr)),
    loud = span(loudBars.length ? loudBars : bars);
  // loudness: the RMS of the loud sections, in dBFS
  const db = 20 * Math.log10(over(raw.rms, loud) + 1e-9);
  // the bass held between kicks (sustain) and how much it moves at 1/2-1/8 of a beat (wobble), in the loud sections
  let sustain = 0,
    wobble = 0;
  for (const [a, b] of loud) {
    const seg = raw.low.subarray(a, b),
      m = mean(seg),
      mx = Math.max(...seg, 1e-9);
    sustain += m / mx;
    const dev = Float32Array.from(seg, v => v - m),
      ac = lag => {
        let s = 0,
          z = 0;
        for (let i = 0; i + lag < dev.length; i++) {
          s += dev[i] * dev[i + lag];
          z += dev[i] * dev[i];
        }
        return z ? s / z : 0;
      };
    // (periodicity at sub-beat lags beyond what the kick on every beat gives)
    const sub = Math.max(...[2, 4, 8].map(d => ac(Math.round((beat / d) * fps)))),
      onBeat = ac(Math.round(beat * fps));
    wobble += Math.max(0, sub - 0.5 * Math.max(0, onBeat));
  }
  sustain /= Math.max(1, loud.length);
  wobble /= Math.max(1, loud.length);
  // half time: the snare's strength on beat 3 against beats 2 and 4
  let s3 = 0,
    s24 = 0;
  for (const o of onsets) {
    if (o.band !== 'mid') continue;
    const k = Math.round((o.t - (beats[bar0] ?? 0)) / beat),
      pos = ((k % 4) + 4) % 4;
    if (Math.abs(o.t - ((beats[bar0] ?? 0) + k * beat)) > 0.06) continue;
    if (pos === 2) s3 += o.s;
    else if (pos === 1 || pos === 3) s24 += o.s / 2;
  }
  // sidechain: the top a short moment after each kick against half a beat later
  let duck = 0,
    nk = 0;
  for (const o of onsets) {
    if (o.band !== 'low') continue;
    const i = Math.floor((o.t + 0.06) * fps),
      j = Math.floor((o.t + beat / 2) * fps);
    if (j >= raw.cent.length) break;
    duck += A.env.high[i] / (A.env.high[j] + 0.05);
    nk++;
  }
  return {
    db,
    bpm: 60 / beat,
    onRate: onsets.length / A.dur,
    sub: over(raw.sub, loud),
    flat: over(raw.flat, loud),
    bright: over(raw.cent, loud),
    sustain,
    wobble,
    halfTime: s3 / (s3 + s24 + 1e-9),
    duck: nk ? duck / nk : 1,
    minor: A.mood.minor,
    off: offOf(A),
  };
}
// the drums between the beats against on them: the kick and the snare (the low and the middle bands) half a beat off the
// detected grid against on it (Beat Critic, ISMIR 2010: the sub-beat's alternation tells a tempo read at half its rate).
// A song read at half its pace has its real beats there, as strong as on the grid; a song at its own pace has only a
// passing kick or a ghost note there
function offOf(A) {
  const { onsets, beat, beats } = A,
    b0 = beats?.[0] ?? 0;
  let on = 0,
    off = 0;
  for (const o of onsets) {
    if (o.band !== 'low' && o.band !== 'mid') continue;
    const u = (o.t - b0) / beat,
      d = Math.abs(u - Math.round(u)) * beat,
      h = Math.abs(u - Math.floor(u) - 0.5) * beat;
    if (d < 0.05) on += o.s;
    else if (h < 0.05) off += o.s;
  }
  return off / (on + 1e-9);
}

// how many of the song's detected beats make one beat as it is felt: 2 for a song heard at half its pace (a drum & bass
// at 172 a minute is read as 86, a beat tracker's octave error: both pulses are in it), 1 otherwise. Half a fast tempo
// or a half-time beat is told by its snare: on the third beat of the bar (Wikipedia, Half-time (music): the backbeat
// moved from beats two and four to three), under 95 a minute, with drums busy enough to run (9 onsets a second at
// least: a slow song with a lazy snare on three stays slow). Rhythm games keep such a song's notes on its playable grid
// and play its pace by speed and feel (Audiosurf, Melody's Escape: the run's speed from the music's intensity, not its
// tempo), so the presses stay on the detected grid and only the pace felt (speed, the world's pulse, how often a long
// part turns over) takes the felt tempo. A fast song read at half its pace with no half-time snare (metalcore at 185
// read as 92: Kingslayer; trap at 160 read as 80) is told by its drums between the beats instead (`off`, Beat Critic):
// the kick and the snare as strong half a beat off the grid as on it, the song loud, the snare not on three (a slow
// song's half-time groove, future bass at 97, puts its snare there and has its drums on the grid). Drums between the
// beats stronger than on them in a loud song are its real beats whatever the snare does (drum & bass at 174 read as 87:
// Crush, its backbeat landing on the grid's third beat)
export const feltOf = F =>
  (F.bpm < 95 && F.halfTime > 0.55 && F.onRate >= 9) || (F.bpm < 100 && F.off >= 0.95 && F.halfTime < 0.6 && F.db > -13) || (F.bpm < 100 && F.off >= 1.1 && F.db > -11) ? 2 : 1;

// a bar's intensity, 0..1 on an absolute scale: the bar's place in the song's own range, inside a band set by how
// aroused the song is (a chill song's drop is still gentle, a hard song's verse is not quiet)
export const intensityOf = (P, bar) => {
  const lo = 0.1 + 0.3 * P.arousal,
    hi = 0.35 + 0.65 * P.arousal;
  return lo + (hi - lo) * Math.max(0, Math.min(1, bar.sm));
};

// how the song feels, 0..1 each, and the style it reads as; `ml` (optional, ml/mood.js) is the neural mood, blended in
// half and half where it speaks to the same thing
export function profile(A, ml = null) {
  const F = features(A),
    // (a tempo near 70 often feels like 140: half-time songs count at double for drive)
    tempo = F.bpm * feltOf(F),
    loud = c01((F.db + 22) / 14),
    pace = c01((tempo - 70) / 90),
    dense = c01((F.onRate - 4) / 10),
    arousal = c01(0.4 * loud + 0.25 * pace + 0.2 * dense + 0.15 * c01(F.sub / 0.25)),
    major = 1 - F.minor,
    brightness = c01((F.bright - 900) / 2200),
    valence = c01(0.55 * major + 0.3 * brightness + 0.15 * major * pace),
    hardness = c01((0.25 * c01(F.sustain / 0.6) + 0.2 * c01(F.wobble / 0.5) + 0.2 * c01(F.sub / 0.3) + 0.15 * c01((F.flat - 0.15) / 0.35) + 0.1 * c01((F.duck - 1) / 1.5) + 0.1 * c01((F.halfTime - 0.4) / 0.4)) * (0.4 + 0.6 * arousal)),
    chill = c01((1 - arousal) * 1.3 - hardness * 0.5);
  if (ml) return classify({
    arousal: c01(0.5 * arousal + 0.5 * (0.6 * ml.aggressive + 0.2 * ml.happy + 0.2 * (1 - ml.relaxed))),
    valence: c01(0.5 * valence + 0.5 * (0.7 * ml.happy + 0.3 * (1 - ml.sad))),
    hardness: c01(0.6 * hardness + 0.4 * ml.aggressive),
    chill: c01(0.5 * chill + 0.5 * ml.relaxed * (1 - ml.aggressive)),
    F,
    ml,
  });
  return classify({ arousal, valence, hardness, chill, F });
}
// the style a profile reads as (it picks the place and the look)
function classify(p) {
  const { arousal, valence, hardness, chill } = p;
  const style = hardness > 0.55 && arousal > 0.55 ? 'hard' : chill > 0.55 ? 'chill' : arousal > 0.7 && valence > 0.5 ? 'epic' : valence > 0.55 ? 'bright' : 'dark';
  return { ...p, style };
}
