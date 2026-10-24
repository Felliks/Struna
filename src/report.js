// Bug reports (after the World project's): B / F8 or the BUG button freezes the game (the song's clock is suspended, so
// the run stands still), takes the frame exactly as shown, and asks what is wrong. The server (tools/serve.mjs,
// POST /api/report) writes a folder under game/.cache/reports/ with report.md (an LLM-ready summary), report.json (all
// of it) and screenshot.jpg, and the report.md path is copied to the clipboard, to paste into a chat with the AI.
// Without the server the report downloads as a file. Nothing leaves the browser until it is sent.

import { tr } from './i18n.js';

// what the session has seen: errors, console warnings, the frame times
export class SessionLog {
  constructor() {
    this.start = performance.now();
    this.entries = [];
    this.frames = [];
    addEventListener('error', e => this.add('error', { message: e.message, at: `${e.filename?.split('/').pop()}:${e.lineno}`, stack: e.error?.stack?.slice(0, 800) }));
    addEventListener('unhandledrejection', e => this.add('rejection', { message: String(e.reason), stack: e.reason?.stack?.slice(0, 800) }));
    for (const level of ['warn', 'error']) {
      const original = console[level].bind(console);
      console[level] = (...args) => {
        this.add(`console.${level}`, { message: args.map(String).join(' ').slice(0, 400) });
        original(...args);
      };
    }
  }
  add(type, data = {}) {
    const last = this.entries.at(-1),
      text = JSON.stringify(data);
    if (last && last.type === type && last.text === text) return void (last.count = (last.count ?? 1) + 1);
    this.entries.push({ t: ((performance.now() - this.start) / 1000).toFixed(1), type, data, text });
    if (this.entries.length > 300) this.entries.shift();
  }
  frame(ms) {
    this.frames.push(ms);
    if (this.frames.length > 600) this.frames.shift();
  }
  fps() {
    const f = [...this.frames].sort((a, b) => a - b);
    if (!f.length) return null;
    const p = q => +f[Math.min(f.length - 1, Math.floor(q * f.length))].toFixed(1);
    return { p50: +(1000 / p(0.5)).toFixed(0), p50ms: p(0.5), p95ms: p(0.95), worstMs: p(1), slowOver33: f.filter(x => x > 33).length };
  }
  export() {
    return this.entries.map(({ t, type, data, count }) => ({ t, type, data, count }));
  }
}

const r2 = v => (Number.isFinite(v) ? +v.toFixed(2) : v);
// what the game is doing now: the song, the moment, the act and its mode, him, what is round him, the cursor
export function gameSnapshot({ run, level, R, current, settings, simT }) {
  if (!run || !level) return { screen: [...document.querySelectorAll('.screen')].find(s => !s.hidden)?.id ?? null };
  const t = simT,
    L = level,
    s = L.segAt(Math.max(0, t)),
    act = L.acts?.find(a => t >= a.t0 && t < a.t1),
    bar = L.A.bars.find(b => t >= b.t0 && t < b.t1),
    near = L.obs
      .filter(o => Math.abs(o.t - t) < 2.5)
      .map(o => ({ type: o.type + (o.keys ? '+' + o.keys.join('') : ''), t: r2(o.t), inBeats: r2((o.t - t) / L.A.beat), skin: o.skin, x: r2(o.x), y: r2(o.y), h: r2(o.h), res: o.res ?? null, grade: o.grade ?? null, lane: o.lane ?? o.free, star: o.star ?? null }));
  return {
    song: { title: current?.title, artist: current?.artist, bpm: r2(L.A.bpm), dur: r2(L.A.dur), difficulty: settings.get('difficulty'), place: L.place, place2: L.rewriteT < Infinity ? L.place2 : null, style: L.profile?.style },
    moment: { t: r2(t), segment: { kind: s.kind, t0: r2(s.t0), t1: r2(s.t1), dir: s.dir ?? s.face, place: s.place }, act: act ? { kind: act.kind, mode: act.mode, t0: r2(act.t0), t1: r2(act.t1) } : null, bar: bar ? { kind: bar.kind, intensity: r2(bar.intensity) } : null, freestyle: !!L.free?.some(w => t >= w[0] && t < w[1]) },
    hero: {
      mode: run.mode,
      x: r2(run.heroX(Math.max(0, t))),
      y: r2(run.y),
      vy: r2(run.vy),
      lane: run.lane,
      alt: run.fly ? run.alt : undefined,
      anim: run.anim?.key,
      jump: run.jump && { take: run.jump.take?.[0], clumsy: run.jump.clumsy, since: r2(t - run.jump.t0) },
      slide: run.slide && { take: run.slide.take?.[0], since: r2(t - run.slide.t0) },
      strike: run.strike && { take: run.strike.take?.[0], back: run.strike.back, since: r2(t - run.strike.t0) },
      hold: run.hold2 && { kind: run.hold2.kind, since: r2(t - run.hold2.t0) },
      held: run.held,
      hp: run.hp,
      score: run.score,
      combo: run.combo,
      tier: run.tier,
      overdrive: run.od ? r2(run.od.t1 - t) : null,
      sync: r2(run.sync),
    },
    near,
    cursor: (() => {
      const c = R.plan?.at(t);
      return c ? { tool: c.tool, act: c.act ? { kind: c.act.kind, type: c.act.o?.type, at: r2(c.act.ts) } : null, gone: !!c.gone } : null;
    })(),
    look: R.look ? { time: R.look.time, weather: R.look.weather, landmarks: R.look.landmarks, quality: R.quality, resolution: R.view.dpr } : null,
    recent: run.fx.slice(-30).map(e => ({ k: e.k, t: r2(e.t), g: e.g, side: e.side, type: e.o?.type })),
    presses: run.presses.slice(-20).map(p => ({ a: p.a, t: r2(p.t) })),
  };
}

// the dialog: the screenshot taken as it opened, what went wrong, send
export function reportDialog({ send }) {
  const el = document.createElement('div');
  el.className = 'report';
  el.hidden = true;
  el.innerHTML = `
    <form class="report-card" role="dialog" aria-label="${tr('Report a bug')}">
      <header><b>${tr('Report a bug')}</b><button type="button" data-close aria-label="${tr('Close')}">×</button></header>
      <canvas data-shot></canvas>
      <small>${tr('Click the screenshot to circle where the bug is (again nearby to remove the circle).')}</small>
      <textarea data-text rows="4" placeholder="${tr('What is wrong? What did you expect to see? What were you doing before it?')}"></textarea>
      <small>${tr("The screenshot, the game's state, every press since the track started (to replay it) and the log will be sent. The report's path gets copied: paste it into a chat with the AI.")}</small>
      <button type="submit" class="btn main" data-send>${tr('Send')}</button>
      <output data-result></output>
    </form>`;
  document.body.append(el);
  const q = s => el.querySelector(s),
    text = q('[data-text]'),
    shot = q('[data-shot]'),
    result = q('[data-result]'),
    btn = q('[data-send]');
  let onClose = null,
    image = null,
    marks = [];
  // the screenshot with the player's marks on it (red rings where they clicked)
  const paint = () => {
    const g = shot.getContext('2d');
    if (!image) return;
    g.drawImage(image, 0, 0);
    g.lineWidth = Math.max(4, shot.width / 200);
    for (const [x, y] of marks) {
      g.strokeStyle = '#ff1a2e';
      g.beginPath();
      g.arc(x * shot.width, y * shot.height, shot.width / 18, 0, Math.PI * 2);
      g.stroke();
    }
  };
  shot.addEventListener('pointerdown', e => {
    const r = shot.getBoundingClientRect(),
      x = (e.clientX - r.left) / r.width,
      y = (e.clientY - r.top) / r.height,
      i = marks.findIndex(([mx, my]) => Math.hypot(mx - x, (my - y) * (r.height / r.width)) < 0.05);
    if (i >= 0) marks.splice(i, 1);
    else marks.push([x, y]);
    paint();
  });
  const close = () => {
    if (el.hidden) return;
    el.hidden = true;
    onClose?.();
  };
  q('[data-close]').addEventListener('click', close);
  el.addEventListener('pointerdown', e => e.target === el && close());
  // (typing in it is not playing)
  text.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.code === 'Escape') close();
  });
  q('form').addEventListener('submit', async e => {
    e.preventDefault();
    btn.disabled = true;
    result.textContent = tr('Sending…');
    try {
      const r = await send(text.value, image ? shot.toDataURL('image/jpeg', 0.85) : null, marks);
      result.textContent = r.file ? tr('Saved: {file}', { file: r.file }) + tr(r.copied ? ' · path copied' : ' · copy the path from here') : tr(r.downloaded ? 'The server is unavailable: the report was downloaded as a file' : 'Could not save');
      if (r.file && r.copied) setTimeout(close, 2500);
    } catch (err) {
      result.textContent = tr('Error: {message}', { message: err.message });
    } finally {
      btn.disabled = false;
    }
  });
  return {
    close,
    get isOpen() {
      return !el.hidden;
    },
    open(screenshot, closed) {
      onClose = closed;
      shot.hidden = !screenshot;
      image = null;
      marks = [];
      if (screenshot) {
        const im = new Image();
        im.onload = () => {
          shot.width = im.width;
          shot.height = im.height;
          image = im;
          paint();
        };
        im.src = screenshot;
      }
      text.value = '';
      result.textContent = '';
      el.hidden = false;
      setTimeout(() => text.focus(), 0);
    },
  };
}

// a report sent: to the server, the path copied; without it, downloaded as a file
export async function sendReport(body) {
  let file = null;
  try {
    const r = await fetch('api/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
    if (r.ok) ({ file } = await r.json());
  } catch {}
  let copied = false;
  if (file)
    copied = await navigator.clipboard
      ?.writeText(`${tr('Bug report: {file}', { file })}${body.description ? `\n${body.description}` : ''}`)
      .then(() => true)
      .catch(() => false);
  if (!file) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' })),
      a = Object.assign(document.createElement('a'), { href: url, download: `beat-run-report-${body.id}.json` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return { file, copied: !!copied, downloaded: !file };
}
