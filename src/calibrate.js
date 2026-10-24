// The audio offset, measured: a metronome plays (clicks scheduled on the audio clock) and the player taps along; each
// tap is placed on the heard timeline (its event time through the output timestamp) and compared with its click. The
// offset is the median of the last taps (rhythm games calibrate by tapping to a steady beat and take the median, so a
// stray tap does not move it). Bluetooth headphones typically need 150 ms or more.
const BPM = 100,
  CLICKS = 20,
  WARMUP = 4;

export class Calibrator {
  constructor(song) {
    this.song = song;
    this.clicks = [];
    this.taps = [];
  }
  start() {
    const ctx = this.song.ensure(),
      // (through the song's limiter, as the song is: its look-ahead taken off the heard time alike)
      master = this.song.master(),
      t0 = ctx.currentTime + 0.5,
      beat = 60 / BPM;
    this.clicks = [];
    this.taps = [];
    for (let i = 0; i < CLICKS; i++) {
      const t = t0 + i * beat,
        o = ctx.createOscillator(),
        g = ctx.createGain();
      o.frequency.value = i % 4 ? 1000 : 1600;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.5, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 0.08);
      this.clicks.push(t);
    }
    this.end = t0 + CLICKS * beat;
  }
  get done() {
    return this.song.ctx.currentTime > this.end + 0.3;
  }
  // a tap at performance time tPerf; returns how many have counted
  tap(tPerf) {
    const heard = this.song.heardAt(tPerf),
      near = this.clicks.reduce((a, c) => (Math.abs(c - heard) < Math.abs(a - heard) ? c : a), Infinity),
      i = this.clicks.indexOf(near);
    if (i >= WARMUP && Math.abs(near - heard) < 0.3) this.taps.push(heard - near);
    return this.taps.length;
  }
  // the offset in ms (positive: the player hears late), or null with too few taps
  get result() {
    if (this.taps.length < 6) return null;
    const s = [...this.taps].sort((a, b) => a - b);
    return Math.round(s[Math.floor(s.length / 2)] * 1000);
  }
}
