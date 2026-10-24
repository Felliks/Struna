// The song's clock. The audio clock is the only source of song time: every frame reads it (never adds up frame
// times), inputs are stamped with their own event time and mapped onto the heard audio (getOutputTimestamp, or the
// reported output latency where it is missing), and the player's calibration offset is applied at the input boundary.
import { bufferOf, momentOf, renderZone, songOf, zoneOf, zoneSpan } from './stretch.js';

// a second of silence as a WAV, looped in a media element: the page counted as playing media (an older iPhone then plays
// its web audio with the switch on silent)
function silentMedia() {
  const n = 8000,
    b = new DataView(new ArrayBuffer(44 + n));
  const str = (o, x) => [...x].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  b.setUint32(4, 36 + n, true);
  str(8, 'WAVEfmt ');
  b.setUint32(16, 16, true);
  b.setUint16(20, 1, true);
  b.setUint16(22, 1, true);
  b.setUint32(24, 8000, true);
  b.setUint32(28, 8000, true);
  b.setUint16(32, 1, true);
  b.setUint16(34, 8, true);
  str(36, 'data');
  b.setUint32(40, n, true);
  for (let i = 0; i < n; i++) b.setUint8(44 + i, 128);
  const a = new Audio(URL.createObjectURL(new Blob([b.buffer], { type: 'audio/wav' })));
  a.loop = true;
  a.setAttribute('playsinline', '');
  a.play().catch(() => {});
}
// the master limiter's look-ahead (the compressor's pre-delay in Chromium, Firefox and WebKit): what is heard is that
// much behind what the output timestamp says
const LOOK = 0.006,
  // the song's own audio is scheduled a block at a time (seconds of song), each when it comes within AHEAD seconds of the
  // audio clock: so a slowed stretch made after the song started can still be put in its place, and a song still coming
  // (stream.js) is played as far as it has come
  BLOCK = 3,
  AHEAD = 2.5;
const zoneKey = z => `${z.pa.toFixed(4)}:${z.pb.toFixed(4)}:${z.ts.map(m => momentOf(m).map(v => v.toFixed(3)).join('/')).join(',')}`;
// the worker that renders the slowed stretches (stretch-worker.js), made on the first; null where none can run
let worker, asked = 0;
const answers = new Map();
function stretcher() {
  if (worker === undefined)
    try {
      worker = new Worker(new URL('./stretch-worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data }) => (answers.get(data.id)?.(data.r), answers.delete(data.id));
      worker.onerror = () => {
        worker = null;
        for (const f of answers.values()) f(undefined);
        answers.clear();
      };
    } catch {
      worker = null;
    }
  return worker;
}
export class Song {
  constructor() {
    this.ctx = null;
    // the song's own audio: the whole of it decoded (buf), or a song still coming (feed: stream.js); `lead` the seconds
    // its buffer runs ahead of the song's time (a decoder that keeps the priming another trims: known.js)
    this.buf = null;
    this.feed = null;
    this.lead = 0;
    this.src = null;
    this.startAt = 0;
    this.offset = 0;
    this.playing = false;
    // held: the song ran out of what has come (a stalled download) and waits for more; onHold(on) tells the shell
    this.held = false;
    this.onHold = null;
    // the player's audio offset (seconds) and the music's volume, set by the shell from the settings
    this.calib = 0;
    this.volume = 1;
    // the song's speed (a modifier's: mods.js); song time runs that much faster than the audio clock
    this.rate = 1;
    // the stretches of the song played slowed (the coach's slow motion: stretch.js): those asked for (slow()), and those
    // in the song as it is scheduled from the last play(); and that timeline: pieces, each { c0: the audio clock where
    // it starts, p0: the song time there, z: its zone (slowed; `at` where it is started, `off` into its buffer) or null
    // (the song's own buffer at `rate`) }
    this.want = [];
    this.zones = [];
    this.tl = [];
    this.nodes = [];
  }
  // the song's own audio to play: a decoded song, or one coming (its feed), with `lead`
  use({ buf = null, feed = null, lead = 0 }) {
    this.unfeed?.();
    this.unfeed = null;
    this.buf = buf;
    this.feed = buf ? null : feed;
    this.lead = lead;
    if (this.feed) this.unfeed = this.feed.on(() => (this.renderReady(), this.pump()));
  }
  // its buffer now and the song time it is sure up to
  own() {
    const f = this.feed;
    if (!f) return { buffer: this.buf, end: Infinity };
    return { buffer: f.buf, end: f.full ? Infinity : f.buf ? f.valid - this.lead : 0 };
  }
  // the song slowed round these moments (stretch.js zones), pitch kept; [] for none. Each rendered off the page (a
  // worker) as soon as the song has come that far, and kept for the song it was made of (a retry, or the song played
  // again, finds it made; the shell asks while the song loads). One made after the song started is put in its place if
  // it is still ahead of what is scheduled; one not made in time is played at speed
  slow(zones) {
    const of = this.feed ?? this.buf;
    if (this._zc?.of !== of) this._zc = { of, made: new Map(), busy: new Set() };
    this.want = zones;
    this.renderReady();
    return this.want;
  }
  renderReady() {
    const zc = this._zc,
      ctx = this.ctx,
      { buffer, end } = this.own();
    if (!zc || !ctx || !buffer || zc.of !== (this.feed ?? this.buf)) return;
    for (const z of this.want) {
      const k = zoneKey(z);
      if (zc.made.has(k) || zc.busy.has(k) || z.pb + 1.2 > end) continue;
      zc.busy.add(k);
      this.render(buffer, z)
        .catch(e => (console.warn('stretch:', e.message), null))
        .then(r => {
        zc.busy.delete(k);
        zc.made.set(k, r);
        if (r && this._zc === zc) this.insert(r, k);
      });
    }
  }
  // one stretch rendered from `buffer`: in the worker, or here where there is none
  async render(buffer, z) {
    const sr = buffer.sampleRate,
      shift = this.lead,
      zb = { pa: z.pa + shift, pb: z.pb + shift, ts: z.ts.map(m => [momentOf(m)[0] + shift, momentOf(m)[1]]), beat: z.beat, rate: z.rate },
      w = z.beat ? stretcher() : null;
    if (!w) {
      if (shift) return null;
      return renderZone(this.ctx, buffer, z);
    }
    const [a, b] = zoneSpan(zb, sr),
      from = Math.max(0, a),
      to = Math.min(buffer.length, b),
      src = Array.from({ length: Math.min(2, buffer.numberOfChannels) }, (_, c) => buffer.getChannelData(c).slice(from, to)),
      id = ++asked,
      r = await new Promise(res => {
        answers.set(id, res);
        w.postMessage({ id, src, sr, base: from, z: zb }, src.map(x => x.buffer));
      });
    // (the worker lost: made here after all)
    if (r === undefined) return shift ? null : renderZone(this.ctx, buffer, z);
    return r && zoneOf(this.ctx, z, r, sr, shift);
  }
  // the zones asked for that are made, in order (for the song as played from here)
  madeZones() {
    const made = this._zc?.made;
    return made ? this.want.map(z => made.get(zoneKey(z))).filter(Boolean) : [];
  }
  // a stretch made while the song plays: into the timeline if all of it is still ahead of what is scheduled (the
  // timeline up to the front is the same with it, the front's piece now ending where it starts)
  insert(z, k) {
    const f = this.front;
    if (!this.playing || this.dead || !f || f.k >= this.tl.length || !this.want.some(w => zoneKey(w) === k)) return;
    if (z.pa < f.p + 0.05 || this.zones.some(q => q.pb > z.pa && q.pa < z.pb)) return;
    this.zones = [...this.zones, z].sort((a, b) => a.pa - b.pa);
    this.plan();
  }
  // the audio started (on a tap: a browser plays nothing before one). An iPhone with its switch on silent mutes a page's
  // web audio as it would a game's beeps, unless the page says it plays media (Safari 17's audio session: 'playback');
  // an older one is told the same by a silent media element playing (its playback category wins for the page)
  ensure() {
    if (!this.ctx) {
      try {
        if (navigator.audioSession) navigator.audioSession.type = 'playback';
        else silentMedia();
      } catch {}
      // ('balanced', not 'interactive': the smallest buffer ran dry when a frame stalled (a garbage collection, a lens
      // on the graphics card), and an underrun is heard as the music stuttering, repeating a scrap; the bigger buffer's
      // delay is in outputLatency + baseLatency, which the song's clock takes off)
      this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'balanced' });
    }
    // (suspended, or 'interrupted' on an iPhone after a call or the lock screen)
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    return this.ctx;
  }
  async decode(arrayBuffer) {
    const ctx = this.ensure();
    this.buf = await ctx.decodeAudioData(arrayBuffer);
    return this.buf;
  }
  // what is heard, as a stream (the song and the game's sounds), for the run's video (record.js)
  tap() {
    const ctx = this.ctx;
    if (!ctx?.createMediaStreamDestination) return null;
    if (!this._tap || this._tap.context !== ctx) this._tap = ctx.createMediaStreamDestination();
    return this._tap;
  }
  lat() {
    const c = this.ctx;
    return (c?.outputLatency || 0) + (c?.baseLatency || 0);
  }
  // the master bus everything heard goes through (the song, the game's sounds, the previews, the metronome): a limiter
  // before the speakers. A loud song is mastered to 0 dB and over (Grim Reaper's peaks reach +1 dB), so the sounds on
  // top of it, or the flow's bass shelf, pushed the sum past full scale and the output clipped: heard as the music
  // rasping and crackling on every drop. The limiter holds the peaks under full scale instead; its look-ahead (6 ms in
  // every browser's compressor) is taken off the song's clock (LOOK)
  master() {
    const ctx = this.ensure();
    if (this._master?.context !== ctx) {
      const m = ctx.createDynamicsCompressor();
      m.threshold.value = -1.5;
      m.knee.value = 0;
      m.ratio.value = 20;
      m.attack.value = 0.002;
      m.release.value = 0.12;
      m.connect(ctx.destination);
      const tap = this.tap();
      if (tap) m.connect(tap);
      this._master = m;
    }
    return this._master;
  }
  // play from `from` seconds of the song, starting a moment from now: the song's own buffer, and each slowed stretch
  // ahead its own buffer, one after another on the audio clock (each piece starting on the sample the one before ends),
  // scheduled a block at a time as they come near (pump)
  play(from = 0, delay = 0.12) {
    const ctx = this.ensure();
    this.stop();
    this.gain = ctx.createGain();
    this.gain.gain.value = this.volume;
    // the song's own chain, so the run can play it: a low-pass (a miss muffles it), a bass shelf (the flow's streak), a
    // trim (the shelf's boost taken back off the whole, so the bass is felt without the peaks growing), a duck (a hit
    // punches through it). (No reverb or echo of the song into itself: their tails read as the music repeating.)
    this.lp = ctx.createBiquadFilter();
    this.lp.type = 'lowpass';
    this.lp.frequency.value = 20000;
    this.lp.Q.value = 0.8;
    this.shelf = Object.assign(ctx.createBiquadFilter(), { type: 'lowshelf' });
    this.shelf.frequency.value = 110;
    this.shelf.gain.value = 0;
    this.trim = ctx.createGain();
    this.duckG = ctx.createGain();
    this._flow = null;
    this.lp.connect(this.shelf).connect(this.trim).connect(this.duckG).connect(this.gain).connect(this.master());
    // (on the sample grid, so the blocks of the song's own buffer meet sample for sample)
    const sr = ctx.sampleRate;
    from = Math.round(from * sr) / sr;
    this.startAt = Math.ceil((ctx.currentTime + delay) * sr) / sr;
    this.offset = from;
    this.zones = this.madeZones();
    this.plan();
    this.front = { k: 0, p: from, c: this.startAt };
    this.playing = true;
    this.dead = false;
    if (this.feed) this.feed.pos = () => (this.playing ? this.now() : 0);
    this.pump();
    this.timer = setInterval(() => this.pump(), 100);
  }
  // the timeline from the last play()'s start, with the zones in it
  plan() {
    const R = this.rate,
      tl = [];
    let c = this.startAt,
      p = this.offset;
    for (const z of this.zones) {
      if (z.pb <= p) continue;
      if (p < z.pa) {
        tl.push({ c0: c, p0: p, z: null });
        c += (z.pa - p) / R;
        p = z.pa;
      }
      const off = bufferOf(z, p);
      tl.push({ c0: c - off / R, p0: z.pa, z, at: c, off });
      c += (z.len - off) / R;
      p = z.pb;
    }
    tl.push({ c0: c, p0: p, z: null });
    this.tl = tl;
  }
  // a piece of audio on the clock: `buffer` from `off` seconds, `dur` of it (to its end if not given), at audio time `at`
  node(buffer, at, off, dur) {
    const n = this.ctx.createBufferSource();
    n.buffer = buffer;
    n.playbackRate.value = this.rate;
    n.connect(this.lp);
    if (dur === undefined) n.start(at, off);
    else n.start(at, off, dur);
    n.at = at;
    n.onended = () => (this.nodes = this.nodes.filter(q => q !== n));
    this.nodes.push(n);
    this.src ??= n;
    return n;
  }
  // what comes within AHEAD seconds scheduled: each slowed stretch whole, the song's own buffer a block at a time as far
  // as it has come; a song that has run out of what has come is held (the shell suspends the clock) until more has
  pump() {
    if (!this.playing || this.dead) return;
    const ctx = this.ctx,
      R = this.rate,
      tl = this.tl,
      sr = ctx.sampleRate,
      until = ctx.currentTime + AHEAD;
    let f = this.front,
      short = false;
    while (f.c < until && f.k < tl.length) {
      const q = tl[f.k];
      if (q.z) {
        this.node(q.z.buffer, q.at, q.off);
        f = { k: f.k + 1, p: q.z.pb, c: q.at + (q.z.len - q.off) / R };
        continue;
      }
      const p1 = tl[f.k + 1]?.p0 ?? Infinity,
        { buffer, end } = this.own();
      if (!buffer) {
        short = true;
        break;
      }
      const last = buffer.duration - this.lead,
        q1 = Math.min(p1, f.p + BLOCK, Math.floor(Math.min(end, last) * sr) / sr);
      if (q1 <= f.p + 1e-6) {
        // (the song's end, or what has come so far)
        if (end === Infinity && p1 === Infinity) f = { ...f, k: tl.length };
        else short = true;
        break;
      }
      // (a buffer that starts later than the song's time (lead < 0): its first moment waits for it)
      let at = f.c,
        off = f.p + this.lead,
        dur = q1 - f.p;
      if (off < 0) ((at -= off / R), (dur += off), (off = 0));
      if (dur > 0) this.node(buffer, at, off, dur);
      f = { k: q1 >= p1 ? f.k + 1 : f.k, p: q1, c: f.c + (q1 - f.p) / R };
    }
    this.front = f;
    // (held a moment before what is scheduled runs out; let go when a few seconds more have come)
    if (short && !this.held && f.c - ctx.currentTime < 0.6) this.hold(true);
    else if (this.held && !short && (f.k >= tl.length || this.own().end - f.p > 3)) this.hold(false);
  }
  hold(on) {
    this.held = on;
    this.onHold?.(on);
  }
  // the song time played at audio-clock time h (on the timeline), and the audio-clock time song time t is played at
  songAt(h) {
    const tl = this.tl;
    let i = tl.length - 1;
    while (i > 0 && tl[i].c0 > h) i--;
    const q = tl[i];
    if (!q) return 0;
    return q.z ? songOf(q.z, (h - q.c0) * this.rate) : q.p0 + (h - q.c0) * this.rate;
  }
  ctxAt(t) {
    const tl = this.tl;
    let i = tl.length - 1;
    while (i > 0 && tl[i].p0 > t) i--;
    const q = tl[i];
    if (!q) return 0;
    return q.c0 + (q.z ? bufferOf(q.z, t) : t - q.p0) / this.rate;
  }
  // how fast the song runs at song time t, 1 its own speed (the slowed stretches slower)
  slowAt(t) {
    for (const z of this.zones) if (t > z.pa && t < z.pb) return z.rateAt(t);
    return 1;
  }
  // ---- the song played by the run (what rhythm games do to the music: Bit.Trip, Hi-Fi Rush)
  // a miss: the song goes under water for a moment (a low-pass down to 400 Hz and back over `back` s)
  muffle(back = 0.5) {
    if (!this.lp) return;
    const t = this.ctx.currentTime,
      f = this.lp.frequency;
    f.cancelScheduledValues(t);
    f.setValueAtTime(f.value, t);
    f.exponentialRampToValueAtTime(400, t + 0.04);
    f.exponentialRampToValueAtTime(20000, t + 0.04 + back);
  }
  // a hit landed: the song ducks under it for a moment, so it punches through
  duck() {
    if (!this.duckG) return;
    const t = this.ctx.currentTime,
      g = this.duckG.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0.6, t + 0.005);
    g.linearRampToValueAtTime(1, t + 0.13);
  }
  // a big moment: once the song was thrown into a reverb for a beat; its 2 s tail of the song under the song read as the
  // music repeating, so it is gone (the song is never laid over itself)
  throwVerb() {}
  // the streak in the song: the bass shelf by the flow's tier (0-3) and the overdrive, its boost taken off the whole
  // by half (the limiter holds the rest)
  flow(beat, tier, od) {
    if (!this.shelf) return;
    const bass = od ? 5 : tier >= 3 ? 3 : 0;
    if (this._flow === bass) return;
    this._flow = bass;
    const t = this.ctx.currentTime;
    this.shelf.gain.setTargetAtTime(bass, t, 0.15);
    this.trim.gain.setTargetAtTime(10 ** (-bass / 40), t, 0.15);
  }
  // the inhale before a drop: the song's highs drawn down over the last beat (at ctx time `at`, `dur` long) and let
  // back in all at once on the drop
  inhale(at, dur) {
    if (!this.lp) return;
    const f = this.lp.frequency;
    f.setValueAtTime(20000, at);
    f.exponentialRampToValueAtTime(900, at + dur * 0.95);
    f.setValueAtTime(20000, at + dur);
  }
  // death: the tape stops (the song slows down to nothing, muffling as it goes): nothing more scheduled; the song from
  // where it is now played on by one source of its own (the blocks after it would start on the clock as if it ran on)
  tapeStop(sec = 0.7) {
    if (!this.src) return;
    const t = this.ctx.currentTime + 0.01,
      tl = this.tl;
    this.dead = true;
    clearInterval(this.timer);
    let i = tl.length - 1;
    while (i > 0 && tl[i].c0 > t) i--;
    const q = tl[i],
      buffer = q?.z ? q.z.buffer : this.own().buffer,
      off = q?.z ? (t - q.c0) * this.rate : this.songAt(t) + this.lead;
    for (const n of this.nodes)
      try {
        n.stop(t);
      } catch {}
    if (buffer && off >= 0 && off < buffer.duration) {
      const n = this.node(buffer, t, off);
      n.playbackRate.setValueAtTime(this.rate, t);
      n.playbackRate.exponentialRampToValueAtTime(0.05, t + sec);
    }
    this.lp.frequency.cancelScheduledValues(t);
    this.lp.frequency.setValueAtTime(this.lp.frequency.value, t);
    this.lp.frequency.exponentialRampToValueAtTime(200, t + sec);
  }
  // resolves when the slowed stretches asked for that start before song time `t` are made (or could not be), or after
  // `ms` (the shell, before the song starts: the first blocks are scheduled at once)
  async made(t, ms) {
    const end = performance.now() + ms,
      zc = this._zc,
      first = this.want.filter(z => z.pa < t);
    // (a song still coming decoded as far as they need, if that much has come)
    if (first.length && this.feed && !this.feed.full) this.feed.until(Math.max(...first.map(z => z.pb + 1.25)) + this.lead).catch(() => {});
    while (zc && performance.now() < end && first.some(z => !zc.made.has(zoneKey(z)))) await new Promise(r => setTimeout(r, 30));
  }
  fade(sec = 0.6) {
    if (!this.gain) return;
    const t = this.ctx.currentTime;
    this.gain.gain.setValueAtTime(this.gain.gain.value, t);
    this.gain.gain.linearRampToValueAtTime(0.0001, t + sec);
  }
  stop() {
    clearInterval(this.timer);
    for (const n of this.nodes)
      try {
        n.stop();
      } catch {}
    this.nodes = [];
    // (its chain let go: left connected, every song played on the page was still processed on every block)
    this.gain?.disconnect();
    this.src = null;
    this.playing = false;
    this.held = false;
  }
  // the song time the player hears now
  now() {
    if (!this.ctx) return 0;
    const ts = this.ctx.getOutputTimestamp?.();
    let heard;
    if (ts && ts.contextTime > 0 && ts.performanceTime > 0) heard = ts.contextTime + (performance.now() - ts.performanceTime) / 1000 - LOOK;
    else heard = this.ctx.currentTime - this.lat() - LOOK;
    return this.songAt(heard);
  }
  // the audio-clock time at which song time `t` is played (a sound scheduled then is heard with that moment of the song)
  ctxTimeOf(t) {
    return this.ctxAt(t);
  }
  // the song time of an input event (its timeStamp, in performance.now() time), with the player's calibration: the song
  // heard at that moment (slowed or not)
  at(tPerf) {
    if (!this.ctx) return -this.calib;
    return this.songAt(this.heardAt(tPerf)) - this.calib;
  }
  setCalib(ms) {
    this.calib = ms / 1000;
  }
  // the heard audio time (on the context's clock) of a performance.now() moment: what was coming out of the speakers
  heardAt(tPerf) {
    const ts = this.ctx.getOutputTimestamp?.();
    if (ts && ts.contextTime > 0 && ts.performanceTime > 0) return ts.contextTime + (tPerf - ts.performanceTime) / 1000 - LOOK;
    return this.ctx.currentTime - this.lat() - (performance.now() - tPerf) / 1000 - LOOK;
  }
}
