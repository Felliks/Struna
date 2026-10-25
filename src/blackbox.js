// The black box (the game's flight recorder): always on, cheap, the last 20 s of play kept in rings, so a bug report (B)
// says what stalled, when and why, and what the music did, without a profiler. After the practice of Chrome's Long
// Animation Frames, Web Audio's output timestamps and playback stats, and game telemetry rings:
// - each frame: its gap since the last (rAF), the script's time in it, the dearest layers drawn, the run's moment (song
//   time, mode, lens, the drawing's resolution) and what happened in it (the run's fx);
// - long animation frames (Chromium): which script held the frame and for how long;
// - the JS heap once a second (a drop near a slow frame: a garbage collection);
// - the page hidden or blurred (a throttled tab is not a stutter);
// - the music: the audio context's states, every start, stop and tape stop of the song, its clock against the page's
//   (a jump or a stall: a dropout), the output latency, and underruns where the browser counts them;
// - P marks "it starts here" (a player presses B some seconds after a stutter begins).
const N = 1200,
  NONE = Object.freeze([]);

export class BlackBox {
  constructor(song) {
    this.song = song;
    this.frames = [];
    this.fi = 0;
    this.loaf = [];
    this.events = [];
    this.audio = [];
    this.heap = [];
    this.acc = {};
    this.marks = [];
    this.gpu = gpuName();
    try {
      if (PerformanceObserver.supportedEntryTypes?.includes('long-animation-frame'))
        new PerformanceObserver(l => {
          for (const e of l.getEntries()) this.loaf.push(slim(e)), this.loaf.length > 80 && this.loaf.shift();
        }).observe({ type: 'long-animation-frame', buffered: true });
    } catch {}
    document.addEventListener('visibilitychange', () => this.event(document.hidden ? 'tab hidden' : 'tab shown'));
    addEventListener('blur', () => this.event('window blurred'));
    addEventListener('focus', () => this.event('window focused'));
    addEventListener('keydown', e => e.code === 'KeyP' && !e.repeat && this.mark('P: it starts here'));
    setInterval(() => this.tick(), 500);
    this.hook(song);
  }
  // a moment worth knowing, with the song's time when there is one
  event(what, extra = {}) {
    this.events.push({ at: +(performance.now() / 1000).toFixed(2), song: this.songT(), what, ...extra });
    if (this.events.length > 300) this.events.shift();
  }
  mark(what) {
    this.marks.push({ at: +(performance.now() / 1000).toFixed(2), song: this.songT(), what });
    this.event(what);
  }
  songT() {
    try {
      return this.song.src ? +this.song.now().toFixed(2) : null;
    } catch {
      return null;
    }
  }
  // the song's own moves, logged as they are made
  hook(song) {
    for (const name of ['play', 'stop', 'tapeStop', 'muffle', 'duck', 'inhale', 'fade', 'throwVerb']) {
      const f = song[name]?.bind(song);
      if (!f) continue;
      song[name] = (...a) => {
        this.event(`song.${name}`, { args: a.map(x => (typeof x === 'number' ? +x.toFixed(2) : x)) });
        const r = f(...a);
        if (name === 'play' && song.ctx && !song.ctx.__bb) {
          song.ctx.__bb = true;
          song.ctx.addEventListener('statechange', () => this.event(`audio ${song.ctx.state}`));
          this.event('audio context', { rate: song.ctx.sampleRate, base: song.ctx.baseLatency, out: song.ctx.outputLatency });
        }
        return r;
      };
    }
  }
  // the renderer's layers timed (each one's ms summed over the frame)
  wrap(R) {
    const acc = this.acc,
      timed = (list, side) =>
        list.map((l, i) => {
          const name = `${side}:${l.name || i}`,
            w = f => {
              const t = performance.now();
              l(f);
              acc[name] = (acc[name] ?? 0) + performance.now() - t;
            };
          if (R.behind?.has(l)) R.behind.add(w);
          if (R.acting?.has(l)) R.acting.add(w);
          if (R.plainOut?.has(l)) R.plainOut.add(w);
          return w;
        });
    R.world = timed(R.world, 'world');
    R.screen = timed(R.screen, 'screen');
  }
  // one frame: its gap, the script's time, the moment (kept raw in a ring, rounded on export; the dearest layers named
  // only for a slow frame: sorting and naming them every frame cost a frame's garbage)
  frame(gap, js, run, R) {
    let layers = NONE;
    if (gap > 20 || js > 12) {
      layers = Object.entries(this.acc)
        .filter(([, v]) => v > 0.8)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([k, v]) => `${k} ${v.toFixed(1)}`);
    }
    for (const k in this.acc) this.acc[k] = 0;
    const nfx = run?.fx.length ?? 0;
    this.frames[this.fi++ % N] = {
      at: performance.now() / 1000,
      song: run ? run.t : null,
      gap,
      js,
      layers,
      mode: run?.mode,
      lens: R.lensName ?? null,
      res: R.view?.W ?? null,
      fx: run && nfx > (this.nfx ?? 0) ? run.fx.slice(this.nfx ?? 0).map(e => e.k) : NONE,
    };
    this.nfx = nfx;
  }
  // the ring's frames, oldest first, rounded
  ordered() {
    const F = this.frames,
      n = F.length,
      out = n < N ? F : [...F.slice(this.fi % N), ...F.slice(0, this.fi % N)];
    return out.map(f => ({ ...f, at: +f.at.toFixed(3), song: f.song === null ? null : +f.song.toFixed(2), gap: +f.gap.toFixed(1), js: +f.js.toFixed(1) }));
  }
  // twice a second: the heap, the audio clock against the page's, underruns
  tick() {
    const m = performance.memory;
    if (m) this.heap.push({ at: +(performance.now() / 1000).toFixed(1), mb: +(m.usedJSHeapSize / 1e6).toFixed(1) }), this.heap.length > 60 && this.heap.shift();
    const ctx = this.song.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const ts = ctx.getOutputTimestamp?.(),
      st = ctx.playbackStats;
    if (!ts?.performanceTime) return;
    const off = ts.performanceTime - ts.contextTime * 1000,
      prev = this.audio.at(-1);
    this.audio.push({ at: +(performance.now() / 1000).toFixed(1), drift: prev ? +(off - prev.off0).toFixed(1) : 0, off0: off, out: ctx.outputLatency ?? null, under: st?.underrunEvents ?? null });
    if (prev && Math.abs(off - prev.off0) > 25) this.event('audio clock jumped', { ms: +(off - prev.off0).toFixed(1) });
    if (prev && st && prev.under !== null && st.underrunEvents > prev.under) this.event('audio underrun', { n: st.underrunEvents - prev.under });
    if (this.audio.length > 60) this.audio.shift();
  }
  // all of it, with a summary first: the worst frames, each with its likely cause, and the music's story
  export() {
    const F = this.ordered(),
      gaps = F.map(f => f.gap).sort((a, b) => a - b),
      q = p => gaps[Math.min(gaps.length - 1, Math.floor(p * gaps.length))] ?? null,
      near = (f, w) => this.loaf.filter(e => Math.abs(e.at - f.at) < w),
      cause = f => {
        const lo = near(f, 0.15)[0];
        if (this.events.some(e => /hidden|blurred/.test(e.what) && Math.abs(e.at - f.at) < 1)) return 'вкладка в фоне';
        if (lo?.scripts?.length) return `скрипт: ${lo.scripts.map(s => `${s.fn || s.invoker} ${s.dur}мс`).join(', ')}`;
        if (f.js > f.gap * 0.6) return `свой JS ${f.js} мс (${f.layers.join(', ') || 'шаг игры'})`;
        const h = this.heap.find(x => Math.abs(x.at - f.at) < 1.1);
        const h0 = this.heap[this.heap.indexOf(h) - 1];
        if (h && h0 && h0.mb - h.mb > 5) return `сборка мусора (куча ${h0.mb}→${h.mb} МБ)`;
        return `видеокарта/композитор (JS ${f.js} мс из ${f.gap})`;
      },
      worst = [...F]
        .sort((a, b) => b.gap - a.gap)
        .slice(0, 12)
        .map(f => ({ ...f, cause: cause(f) }));
    return {
      gpu: this.gpu,
      dpr: devicePixelRatio,
      cores: navigator.hardwareConcurrency ?? null,
      memoryGB: navigator.deviceMemory ?? null,
      frames: { n: F.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), over33: gaps.filter(g => g > 33).length, over50: gaps.filter(g => g > 50).length },
      worst,
      marks: this.marks,
      events: this.events.slice(-80),
      audio: this.audio.map(({ off0, ...a }) => a),
      heap: this.heap,
      loaf: this.loaf.slice(-30),
      // (the last five seconds frame by frame, for the curious)
      tail: F.slice(-300),
    };
  }
}
// the graphics card's name, where the browser says it
function gpuName() {
  try {
    const gl = document.createElement('canvas').getContext('webgl'),
      x = gl?.getExtension('WEBGL_debug_renderer_info');
    return x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : (gl?.getParameter(gl.RENDERER) ?? null);
  } catch {
    return null;
  }
}
// a long animation frame, kept short
function slim(e) {
  return {
    at: +((e.startTime + e.duration) / 1000).toFixed(3),
    dur: Math.round(e.duration),
    blocking: Math.round(e.blockingDuration ?? 0),
    render: Math.round(e.renderStart ? e.startTime + e.duration - e.renderStart : 0),
    scripts: [...(e.scripts ?? [])]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 3)
      .map(s => ({ dur: Math.round(s.duration), fn: s.sourceFunctionName || '', src: (s.sourceURL || '').split('/').pop() + (s.sourceCharPosition >= 0 ? ':' + s.sourceCharPosition : ''), invoker: s.invoker, layout: Math.round(s.forcedStyleAndLayoutDuration ?? 0) })),
  };
}
