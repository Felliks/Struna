// The game's own sounds, synthesised (no files), mixed under the song. Rhythm games schedule the sound of success on
// the beat rather than play it when the input is judged (an on-demand sound is 100-150 ms late, and a sound cannot be
// moved earlier than the press that makes it), so every cue here is scheduled ahead on the audio clock for the song
// time it belongs to, and can be cancelled (he hit the thing after all).
//   slam    the cursor putting an obstacle down (the call)      land   his feet on the roof (the answer)
//   swish   a slide                                             glass  a pane kicked through
//   crack   planks kicked through                               tick   a lane taken while falling
//   delete  the roof deleted                                    hit    he hit something
//   hold    a beat held under a long ceiling                    finisher the cursor smashed at the end
//   count   the coach's count in to a new move (count3 its last)
const VOICES = {
  slam: (a, t, out) => a.thump(t, out, 95, 38, 0.16, 0.7).noise(t, out, 0.03, 2500, 0.25),
  land: (a, t, out) => a.thump(t, out, 140, 55, 0.11, 0.45).noise(t, out, 0.04, 1200, 0.18),
  swish: (a, t, out) => a.noise(t, out, 0.22, 900, 0.3, 3500),
  glass: (a, t, out) => a.noise(t, out, 0.35, 6000, 0.4).ping(t, out, 3100, 0.3, 0.12).ping(t + 0.02, out, 4700, 0.25, 0.09),
  crack: (a, t, out) => a.noise(t, out, 0.12, 700, 0.5).thump(t, out, 180, 70, 0.08, 0.35),
  tick: (a, t, out) => a.ping(t, out, 1800, 0.06, 0.15),
  delete: (a, t, out) => a.sweep(t, out, 900, 60, 0.25, 0.22),
  hit: (a, t, out) => a.sweep(t, out, 160, 40, 0.3, 0.4).noise(t, out, 0.15, 400, 0.4),
  // the cursor smashed at the end: a deep boom, glass, and the simulation glitching down
  finisher: (a, t, out) => a.thump(t, out, 120, 30, 0.6, 0.9).noise(t, out, 0.5, 5000, 0.45).sweep(t, out, 1400, 40, 0.7, 0.5).ping(t + 0.03, out, 2600, 0.5, 0.12),
  // through a gate: a bright chord going up
  through: (a, t, out) => a.ping(t, out, 1046, 0.25, 0.14).ping(t + 0.04, out, 1318, 0.25, 0.12).ping(t + 0.08, out, 1568, 0.3, 0.12),
  // a clone kicked out
  punch: (a, t, out) => a.thump(t, out, 110, 45, 0.18, 0.8).noise(t, out, 0.08, 1800, 0.45).sweep(t + 0.02, out, 700, 90, 0.2, 0.25),
  // a beat held under a long ceiling
  hold: (a, t, out) => a.ping(t, out, 1320, 0.08, 0.1),
  // a star phrase played clean: a rising arpeggio; the overdrive let loose: a riser and a chord; a thing shattered
  star: (a, t, out) => a.ping(t, out, 1046, 0.2, 0.12).ping(t + 0.05, out, 1568, 0.2, 0.12).ping(t + 0.1, out, 2093, 0.35, 0.14),
  overdrive: (a, t, out) => a.noise(t, out, 0.6, 400, 0.35, 8000).ping(t, out, 523, 0.9, 0.14).ping(t, out, 659, 0.9, 0.12).ping(t, out, 784, 0.9, 0.12).thump(t, out, 90, 30, 0.5, 0.8),
  // a freestyle string: a link (a bright tick), landed (a cymbal and a chord), fallen (a falling buzz)
  link: (a, t, out) => a.ping(t, out, 2093, 0.09, 0.1).noise(t, out, 0.03, 7000, 0.08),
  bank: (a, t, out) => a.noise(t, out, 0.5, 6000, 0.25, 9000).ping(t, out, 784, 0.4, 0.12).ping(t, out, 988, 0.4, 0.1).ping(t, out, 1175, 0.45, 0.1),
  bail: (a, t, out) => a.sweep(t, out, 600, 90, 0.35, 0.3),
  shatter: (a, t, out) => a.noise(t, out, 0.25, 3000, 0.3).ping(t, out, 2400, 0.15, 0.06),
  // the coach's count in to a new move (main.js): a soft wood tick on each of the three beats before it, the last higher
  count: (a, t, out) => a.ping(t, out, 1568, 0.06, 0.09).noise(t, out, 0.012, 5000, 0.05),
  count3: (a, t, out) => a.ping(t, out, 2093, 0.08, 0.11).noise(t, out, 0.012, 6000, 0.06),
};

export class Sfx {
  constructor(song) {
    this.song = song;
    this.pending = new Map();
    this.out = null;
    // the sounds' volume, set by the shell from the settings
    this.volume = 0.8;
  }
  // the context and the mix bus, made on the first sound (after the player's first gesture)
  bus() {
    const ctx = this.song.ctx;
    if (!ctx) return null;
    if (!this.out || this.out.context !== ctx) {
      this.out = ctx.createGain();
      this.out.gain.value = 0.7 * this.volume;
      // (through the song's limiter: a sound on top of a loud song no longer clips)
      this.out.connect(this.song.master());
      const n = ctx.sampleRate;
      this.white = ctx.createBuffer(1, n, n);
      const d = this.white.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.out;
  }
  // a cue at song time `at` (heard then); `key` lets it be cancelled
  play(name, at, key = null) {
    const out = this.bus(),
      voice = VOICES[name];
    if (!out || !voice || !this.song.playing) return;
    const ctx = out.context,
      when = this.song.ctxTimeOf(at);
    // too late to be on time: not played at all (a late sound teaches the wrong beat)
    if (when < ctx.currentTime - 0.03) return;
    const g = ctx.createGain();
    g.connect(out);
    voice(this.synth(ctx, g, key, this.pending), when, g);
    if (key) this.pending.set(key, g);
  }
  // a bell note of frequency hz at song time `at` (the obstacles' melody); `key` lets it be cancelled with its cue
  note(hz, at, key = null) {
    const out = this.bus();
    if (!out || !this.song.playing) return;
    const ctx = out.context,
      when = this.song.ctxTimeOf(at);
    if (when < ctx.currentTime - 0.03) return;
    const g = ctx.createGain();
    g.gain.value = 0.55;
    g.connect(out);
    this.notes ??= new Map();
    this.synth(ctx, g, key, this.notes).ping(when, g, hz, 0.35, 0.16).ping(when, g, hz * 2, 0.18, 0.05);
    if (key) this.notes.set(key, g);
  }
  cancel(key) {
    const g = this.pending.get(key);
    if (g) {
      g.gain.setValueAtTime(0, g.context.currentTime);
      this.pending.delete(key);
    }
  }
  clear() {
    this.notes?.clear();
    for (const k of [...this.pending.keys()]) this.cancel(k);
  }
  // the building blocks, chainable, for one cue sounding into its gain `cue`. When its last sound has ended, the cue's
  // nodes are let go (disconnected, and its key forgotten in `map`): left connected, every sound of a song stayed in the
  // audio graph and was processed on every block, the audio thread's work growing hit by hit until it ran late
  synth(ctx, cue, key, map) {
    let left = 0;
    const self = this,
      nodes = [cue],
      own = (src, ...ns) => {
        nodes.push(src, ...ns);
        left++;
        src.onended = () => {
          if (--left) return;
          for (const n of nodes) n.disconnect();
          if (key && map?.get(key) === cue) map.delete(key);
        };
      },
      env = (t, out, peak, dur) => {
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(peak, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        g.connect(out);
        return g;
      };
    const k = {
      // a pitched drop (a kick-like body)
      thump(t, out, f0, f1, dur, peak) {
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(f1, t + dur);
        const e = env(t, out, peak, dur);
        o.connect(e);
        own(o, e);
        o.start(t);
        o.stop(t + dur + 0.02);
        return k;
      },
      // filtered noise (a high-pass from f, or a band swept from f to f2)
      noise(t, out, dur, f, peak, f2) {
        const src = ctx.createBufferSource(),
          flt = ctx.createBiquadFilter();
        src.buffer = self.white;
        flt.type = f2 ? 'bandpass' : 'highpass';
        flt.frequency.setValueAtTime(f, t);
        if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t + dur);
        const e = env(t, out, peak, dur);
        src.connect(flt).connect(e);
        own(src, flt, e);
        src.start(t, Math.random() * 0.5);
        src.stop(t + dur + 0.02);
        return k;
      },
      // a bell-like sine
      ping(t, out, f, dur, peak) {
        const o = ctx.createOscillator();
        o.frequency.value = f;
        const e = env(t, out, peak, dur);
        o.connect(e);
        own(o, e);
        o.start(t);
        o.stop(t + dur + 0.02);
        return k;
      },
      // a square glitching down
      sweep(t, out, f0, f1, dur, peak) {
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(f1, t + dur);
        const e = env(t, out, peak * 0.4, dur);
        o.connect(e);
        own(o, e);
        o.start(t);
        o.stop(t + dur + 0.02);
        return k;
      },
    };
    return k;
  }
}

// the note for song time t: the song's key (analyze.js mood.key, major or minor), the degree of its scale as high as the
// voice or lead is then (env.pitch), in the octave above middle C
const SCALES = { major: [0, 2, 4, 7, 9, 12, 14, 16], minor: [0, 3, 5, 7, 10, 12, 15, 17] };
function noteOf(A, t) {
  const i = Math.max(0, Math.min((A.env.pitch?.length ?? 1) - 1, Math.floor(t * A.fps))),
    p = A.env.pitch?.[i] ?? 0.5,
    sc = (A.mood?.minor ?? 0) > 0.5 ? SCALES.minor : SCALES.major,
    deg = sc[Math.max(0, Math.min(sc.length - 1, Math.round(p * (sc.length - 1))))];
  return 523.25 * 2 ** (((A.mood?.key ?? 0) + deg) / 12);
}

// What a run and the cursor's plan should sound like, fed each frame: the run's cues (scheduled, cancelled on a hit),
// its hits, its landings after a fall, and the cursor's slams and deletes a moment before they happen.
export class Cues {
  constructor(sfx) {
    this.sfx = sfx;
    this.reset();
  }
  reset() {
    this.seen = 0;
    this.planned = new Set();
    this.sfx.clear();
  }
  update(run, plan, t) {
    for (; this.seen < run.fx.length; this.seen++) {
      const e = run.fx[this.seen];
      if (e.k === 'cue') {
        this.sfx.play(e.name, e.at, e.o);
        // (each thing beaten rings a note in the song's key, as high as the melody is then: a run of them plays a tune)
        this.sfx.note(noteOf(run.L.A, e.at), e.at, e.o);
      } else if (e.k === 'uncue') {
        this.sfx.cancel(e.o);
        this.sfx.notes?.get(e.o)?.gain.setValueAtTime(0, this.sfx.song.ctx.currentTime);
      }
      else if (e.k === 'hit' || e.k === 'dead') {
        this.sfx.play('hit', e.t);
        // (the song plays the run: a miss muffles it, death stops the tape)
        if (e.k === 'dead') this.sfx.song.tapeStop();
        else this.sfx.song.muffle();
      } else if (e.k === 'ko' || e.k === 'smash' || e.k === 'through') this.sfx.song.duck();
      else if (e.k === 'finisher') {
        this.sfx.song.duck();
        this.sfx.song.throwVerb(1.2);
      }
      else if (e.k === 'land') this.sfx.play('land', e.t);
      else if (e.k === 'starphrase') this.sfx.play('star', e.t);
      else if (e.k === 'chain') {
        this.sfx.play('star', e.t);
        this.sfx.song.throwVerb(0.6);
      }
      else if (e.k === 'shatter') this.sfx.play('shatter', e.t);
      else if (e.k === 'overdrive') {
        this.sfx.play('overdrive', e.t);
        this.sfx.song.throwVerb(0.8);
      }
      else if (e.k === 'tick') this.sfx.play('hold', e.t);
      else if (e.k === 'link' || e.k === 'bank' || e.k === 'bail') this.sfx.play(e.k, e.t);
    }
    // (the finale's smash, scheduled on its beat ahead, unless he died before it)
    const F = run.L.finale;
    if (F && !this.planned.has(F) && run.mode !== 'dead' && t > F.hit - 0.25 && t < F.hit) {
      this.planned.add(F);
      this.sfx.play('finisher', F.hit);
    }
    // (the song's flow layers, and the inhale before each drop, scheduled a moment ahead)
    this.sfx.song.flow(run.L.A.beat, run.tier, !!run.od);
    for (const b of run.L.A.bars)
      if (b.dropStart && !this.planned.has(b) && b.t0 - run.L.A.beat > t && b.t0 - run.L.A.beat < t + 0.3 && run.mode !== 'dead') {
        this.planned.add(b);
        this.sfx.song.inhale(this.sfx.song.ctxTimeOf(b.t0 - run.L.A.beat), run.L.A.beat);
      }
    if (!plan) return;
    for (const a of plan.acts)
      if (a.ts > t && a.ts < t + 0.25 && !this.planned.has(a)) {
        this.planned.add(a);
        this.sfx.play(a.kind === 'select' || a.kind === 'delete' ? 'delete' : 'slam', a.ts);
      }
  }
}
