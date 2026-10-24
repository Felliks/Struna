// A song's audio as it comes, so a song known ahead (known.js) plays long before the whole of it is here. Fetched as a
// stream, and decoded again from the file's first byte each time enough more has come: a decoder given the first part of
// a file gives the very samples it gives for the whole of it, up to where that part ends (the MP3's priming trimmed the
// same way, the resampling to the device's rate the same; checked sample for sample in Chrome), so each newer decode
// simply carries on from the one before, and the song's buffers can be joined anywhere before their ends with no seam.
// No MP3 frames cut and joined, no encoder delay guessed: the one decoder decides it all, as for a whole file. Decodes
// come when the bytes have doubled, or sooner when what is decoded runs short of where the song is (a slow network),
// and once all has come; the last is the whole song.
//   buf    the newest decode (an AudioBuffer at the device's rate), valid: its seconds that are sure (its end trimmed)
//   full   buf is the whole song
const GUARD = 0.25;

// the seconds of a decode that are sure: up to its last sound (a decoder may fill the end with silence), less a little
function sureOf(b) {
  let n = b.length;
  const chans = Array.from({ length: b.numberOfChannels }, (_, c) => b.getChannelData(c));
  while (n > 0 && chans.every(x => x[n - 1] === 0)) n--;
  return Math.max(0, n / b.sampleRate - GUARD);
}
// the bytes before the audio of an MP3 (an ID3v2 tag: its size, syncsafe), 0 if there is none
export function skipOf(u8) {
  if (u8.length < 10 || u8[0] !== 0x49 || u8[1] !== 0x44 || u8[2] !== 0x33) return 0;
  return (
    10 +
    ((u8[6] & 0x7f) << 21) +
    ((u8[7] & 0x7f) << 14) +
    ((u8[8] & 0x7f) << 7) +
    (u8[9] & 0x7f) +
    (u8[5] & 0x10 ? 10 : 0)
  );
}

export class Feed {
  // `size`: the file's bytes when known ahead, `bps`: its bytes per second of audio (known.js), `progress(got, total)`,
  // `alt`: where to fetch it from if `url` (or a promise of it) fails
  constructor(ctx, url, { size = 0, bps = 0, progress = () => {}, alt = null } = {}) {
    Object.assign(this, { ctx, url, total: size, bps, progress, alt });
    this.got = 0;
    this.bytes = new Uint8Array(size || 4e6);
    this.done = false;
    this.error = null;
    this.buf = null;
    this.valid = 0;
    this.full = false;
    // (the bytes of the last decode tried; one running; the seconds wanted decoded; decoding stopped (the song is read
    // the slow way after all: main.js))
    this.tried = 0;
    this.decoding = false;
    this.need = 8;
    this.still = false;
    // where the song is being played (audio.js sets it while it plays this feed), for deciding when to decode
    this.pos = () => 0;
    this.listeners = new Set();
    this.waits = [];
    this.ctl = new AbortController();
    // (how fast it comes: bytes a second since the first byte)
    this.rate = 0;
    this.t0 = 0;
  }
  start() {
    this.run().catch(e => this.fail(e));
    return this;
  }
  // fetched to its end; a connection lost on the way (a phone between networks) picked up again from the byte it got to
  // (a range asked for; a server that sends it all again has its start skipped), three times at most
  async run() {
    for (let tries = 0; ; tries++)
      try {
        await this.pull();
        break;
      } catch (e) {
        if (e.name === 'AbortError' || this.dead || tries >= 3) throw e;
        await new Promise(r => setTimeout(r, 600 * (tries + 1)));
      }
    this.done = true;
    this.total = this.got;
    this.bytes = this.bytes.subarray(0, this.got);
    this.progress(this.got, this.got);
    this.decide();
    this.emit();
  }
  async pull() {
    const from = this.got,
      ask = url => fetch(url, { signal: this.ctl.signal, ...(from && { headers: { Range: `bytes=${from}-` } }) });
    // (the address may come later: a promise of it)
    this.url = await this.url;
    let r = await ask(this.url).catch(e => (this.alt && e.name !== 'AbortError' ? null : Promise.reject(e)));
    // (a link found ahead that no longer works: the one it was found from, `alt`)
    if ((!r || !r.ok) && this.alt) r = await ask(this.alt);
    if (!r.ok) throw new Error(`audio ${r.status}`);
    let skip = from && r.status !== 206 ? from : 0;
    const len = from ? 0 : +(r.headers.get('content-length') ?? 0);
    // (a file of another size than the one known ahead: another recording, read the slow way)
    if (len && this.total && len !== this.total) this.other = true;
    if (len && len > this.bytes.length) this.grow(len);
    if (len) this.total = len;
    const take = v => {
      if (skip >= v.length) return (skip -= v.length);
      this.add(skip ? v.subarray(skip) : v);
      skip = 0;
    };
    if (!r.body) return take(new Uint8Array(await r.arrayBuffer()));
    for (const reader = r.body.getReader(); ;) {
      const { done, value } = await reader.read();
      if (done) break;
      take(value);
    }
  }
  grow(n) {
    const b = new Uint8Array(Math.max(n, this.bytes.length * 2));
    b.set(this.bytes.subarray(0, this.got));
    this.bytes = b;
  }
  add(chunk) {
    if (this.got + chunk.length > this.bytes.length) this.grow(this.got + chunk.length);
    this.bytes.set(chunk, this.got);
    if (!this.got) this.t0 = performance.now();
    this.got += chunk.length;
    // (the bytes before its audio, once its first are here)
    this.skip ??= this.got >= 10 ? skipOf(this.bytes.subarray(0, 10)) : undefined;
    const dt = (performance.now() - this.t0) / 1000;
    if (dt > 0.25) this.rate = this.got / dt;
    this.progress(this.got, this.total);
    this.decide();
  }
  // the bytes that hold the song up to `sec` seconds (an estimate from its bytes per second, a little over)
  bytesFor(sec) {
    return this.bps ? (this.skip ?? 0) + sec * this.bps * 1.04 + 16e3 : 384e3;
  }
  // whether to decode now: first when the song's first `need` seconds are here; then when the bytes have doubled, or
  // when what is decoded is running short of where the song is played (or of `need`) and more has come; and once all
  // has come
  decide() {
    if (this.decoding || this.dead || this.still || this.error) return;
    const g = this.got;
    if (g <= this.tried) return;
    const first =
        !this.buf && g >= Math.min(this.total || Infinity, Math.max(this.bytesFor(this.need), this.tried * 1.5)),
      doubled = this.buf && g >= 2 * this.tried,
      short = this.buf && this.valid - this.pos() < 15 && g >= this.bytesFor(this.valid + 8),
      wanted = this.buf && this.valid < this.need && g >= this.bytesFor(this.need);
    if (this.done || first || doubled || short || wanted) this.decode(g);
  }
  decode(n) {
    this.decoding = true;
    this.tried = n;
    this.ctx
      .decodeAudioData(this.bytes.slice(0, n).buffer)
      .then(
        b => {
          // (the whole file, if all of it had come by the time it was decoded)
          const last = this.done && n >= this.got,
            valid = last ? b.duration : sureOf(b);
          if (this.dead || (!last && valid <= this.valid)) return;
          Object.assign(this, { buf: b, valid, full: last });
          this.emit();
        },
        e => {
          // (a part too short to hold a frame is no failure; the whole song not decoding is)
          if (this.done && n >= this.got) this.fail(e);
        },
      )
      .finally(() => {
        this.decoding = false;
        this.decide();
      });
  }
  emit() {
    for (const f of this.listeners) f(this);
    this.waits = this.waits.filter(w => {
      if (this.error) w.no(this.error);
      else if (this.full || this.valid >= w.sec) w.yes(this);
      else return true;
      return false;
    });
  }
  fail(e) {
    if (this.dead) return;
    this.error = e?.name === 'AbortError' ? new Error('stopped') : e;
    this.emit();
  }
  // resolves when the song's first `sec` seconds are decoded (or all of it), rejects if it cannot be had
  until(sec) {
    this.need = sec;
    const p = new Promise((yes, no) => this.waits.push({ sec, yes, no }));
    this.emit();
    this.decide();
    return p;
  }
  // the whole file's bytes, when they have all come (decoding stopped: they are read the slow way)
  async all() {
    this.still = true;
    if (this.error) throw this.error;
    if (!this.done)
      await new Promise((yes, no) => {
        const off = this.on(f => {
          if (!f.done && !f.error) return;
          off();
          f.error ? no(f.error) : yes();
        });
      });
    return this.bytes.slice().buffer;
  }
  // `f(feed)` on each new decode
  on(f) {
    this.listeners.add(f);
    return () => this.listeners.delete(f);
  }
  abort() {
    this.ctl.abort();
    this.fail(new Error('stopped'));
    this.dead = true;
  }
}
