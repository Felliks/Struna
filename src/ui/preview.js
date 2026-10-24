// A song heard before it is played (the songs screen: select.js): one at a time, from 40 % in (most often its chorus,
// osu!'s preview point when a song has none), faded in, faded out when another is picked (the newest pick always wins),
// started a moment after the pick (a quick run through the list does not load every song), looped. Routed through the
// game's audio (audio.js) with an analyser on it, so what shows it can move to it (`level()`: its loudness now, `bands()`:
// its spectrum).
const FADE = 0.35,
  WAIT = 0.25;

export class Preview {
  constructor(song) {
    this.song = song;
    this.el = null;
    this.url = null;
    this.timer = 0;
    this.listeners = new Set();
  }
  // the audio element and its path into the game's audio: made once, on a pick (a tap: the browser lets sound start)
  ensure() {
    if (this.el) return;
    const ctx = this.song.ensure(),
      el = (this.el = new Audio());
    el.crossOrigin = 'anonymous';
    el.loop = true;
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.7;
    ctx.createMediaElementSource(el).connect(this.gain).connect(this.analyser).connect(this.song.master());
    this.data = new Uint8Array(this.analyser.frequencyBinCount);
    el.addEventListener('playing', () => this.emit(true));
    el.addEventListener('pause', () => this.emit(false));
  }
  emit(on) {
    for (const f of this.listeners) f(on ? this.url : null);
  }
  // `f(url)` when a preview starts playing, `f(null)` when it stops
  onChange(f) {
    this.listeners.add(f);
  }
  // hear `url` (a song's audio); `volume` the music's setting
  play(url, volume = 1) {
    if (url === this.url && this.el && !this.el.paused) return;
    this.ensure();
    this.url = url;
    clearTimeout(this.timer);
    const ctx = this.song.ctx,
      g = this.gain.gain,
      now = ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setTargetAtTime(0, now, FADE / 4);
    this.timer = setTimeout(() => {
      if (this.url !== url) return;
      const el = this.el;
      el.src = url;
      el.addEventListener(
        'loadedmetadata',
        () => {
          if (this.url !== url) return;
          if (Number.isFinite(el.duration)) el.currentTime = el.duration * 0.4;
          el.play().catch(() => {});
          const t = ctx.currentTime;
          g.cancelScheduledValues(t);
          g.setValueAtTime(0, t);
          g.linearRampToValueAtTime(0.85 * volume, t + FADE);
        },
        { once: true },
      );
    }, WAIT * 1000);
  }
  // silence (faded out), the song let go
  stop() {
    clearTimeout(this.timer);
    this.url = null;
    if (!this.el) return;
    const ctx = this.song.ctx,
      g = this.gain.gain,
      t = ctx.currentTime,
      el = this.el;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0, t + FADE / 2);
    setTimeout(() => this.url === null && (el.pause(), el.removeAttribute('src'), el.load()), (FADE / 2) * 1000 + 30);
  }
  get playing() {
    return !!this.el && !this.el.paused && !!this.url;
  }
  // the spectrum now (0..255 per band, low to high), or null when silent
  bands() {
    if (!this.playing) return null;
    this.analyser.getByteFrequencyData(this.data);
    return this.data;
  }
  // its loudness now, 0..1, weighted to the low end (the kick and the bass: what a picture should jump to)
  level() {
    const d = this.bands();
    if (!d) return 0;
    let s = 0;
    for (let i = 1; i < 24; i++) s += d[i];
    return s / (23 * 255);
  }
}
