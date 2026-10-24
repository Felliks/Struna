// The phone in the hand (navigator.vibrate: Android's browsers; an iPhone's Safari has none, Firefox switched it off).
// Two layers, after Android's "less is more" and Meta Haptics Studio's transients over a quiet continuous layer:
// - the player's own: a crisp click on each press that lands (a perfect one firmer, a good one thinner), a double thud
//   on a hit, a longer one on death, blows to a boss, the overdrive let loose;
// - the music's: a swell on a drop's first beat, and in the song's strongest stretches (a drop) a short pulse on each
//   kick, its length by the bass under it (12 / 20 / 30 ms: the web gives no strength, only how long), at most four a
//   second; a hold (a slide, a grind, a glide, a dash, a zip) a light tick on each quarter beat.
// A call cancels the one before, so they go by priority (a hit over a press over the music); the motor is kept on at
// most a quarter of any two seconds. A kick is scheduled ahead on the song's clock, less the motor's spin-up (~25 ms),
// so the hand feels it with the ear. 'full', 'low' (shorter, no music layer) or 'off' (settings).
const LEAD = 0.025;
const PRESS = { perfect: [14], great: [11], good: [9] };

export class Haptics {
  constructor() {
    this.ok = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function' && !/Firefox\//.test(navigator.userAgent);
    this.level = 'full';
    this.until = 0;
    this.prio = 0;
    // the motor's on-times in the last two seconds: [start ms, length ms]
    this.on = [];
    this.reset();
  }
  reset() {
    this.fxAt = 0;
    this.kickAt = -9;
    this.dropAt = -9;
    this.tickAt = -9;
    this.timer && clearTimeout(this.timer);
    this.timer = 0;
  }
  stop() {
    this.reset();
    if (this.ok) navigator.vibrate(0);
  }
  // play a pattern [on, off, on, ...] (ms) at a priority (0 a hold's tick, 1 the music, 2 a press, 3 a boss, 4 a hit)
  fire(pattern, prio) {
    if (!this.ok || this.level === 'off') return;
    const now = performance.now();
    if (now < this.until && prio < this.prio) return;
    const p = this.level === 'low' ? pattern.map((x, i) => (i % 2 ? x : Math.max(8, Math.round(x * 0.6)))) : pattern,
      onMs = p.reduce((s, x, i) => s + (i % 2 ? 0 : x), 0);
    // (the music and the ticks give way when the motor has been on a lot: never a constant buzz)
    this.on = this.on.filter(q => q[0] > now - 2000);
    if (prio < 2 && this.on.reduce((s, q) => s + q[1], 0) + onMs > 500) return;
    try {
      navigator.vibrate(p);
    } catch {}
    this.on.push([now, onMs]);
    this.until = now + p.reduce((s, x) => s + x, 0);
    this.prio = prio;
  }
  // a frame of the run: its new events, and the music at song time t (mf: fx.js; fxAt: the music a moment ahead)
  frame(run, t, mf, ahead) {
    if (!this.ok || this.level === 'off') return;
    this.fxAt = Math.min(this.fxAt, run.fx.length);
    for (; this.fxAt < run.fx.length; this.fxAt++) {
      const e = run.fx[this.fxAt];
      if (e.k === 'grade') this.fire(PRESS[e.g] ?? [9], 2);
      else if (e.k === 'hit') this.fire([40, 30, 70], 4);
      else if (e.k === 'dead') this.fire([60, 40, 120], 4);
      else if (e.k === 'bossdmg') this.fire([30], 3);
      else if (e.k === 'bossdown') this.fire([50, 30, 50, 30, 90], 3);
      else if (e.k === 'overdrive') this.fire([20, 40, 20, 40, 40], 3);
    }
    if (this.level !== 'full' || run.mode === 'dead' || run.over) return;
    // a drop's first beat: a swell and its fall
    if (mf.dropT > this.dropAt && t - mf.dropT < 0.05 && t >= mf.dropT) {
      this.dropAt = mf.dropT;
      this.fire([60, 40, 20, 40, 20], 1);
    }
    // a kick in a drop: scheduled for when it is heard (the next one, if it is within a frame or two)
    if (mf.amp >= 1 && ahead && ahead.kickT > t && ahead.kickT !== this.kickAt && ahead.kickT - this.kickAt > 0.25) {
      this.kickAt = ahead.kickT;
      const len = ahead.bass > 0.75 ? 30 : ahead.bass > 0.45 ? 20 : 12,
        wait = Math.max(0, (ahead.kickT - t - LEAD) * 1000);
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.fire([len], 1), wait);
    }
    // a hold: a light tick each quarter beat
    const holding = run.hold2 || run.slide?.hold;
    if (holding) {
      const q = run.L.A.beat / 4;
      if (t - this.tickAt >= q) {
        this.tickAt = t;
        this.fire([10], 0);
      }
    }
  }
}
