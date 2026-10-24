// More weathers: an aurora, meteors, sakura petals, ash, autumn leaves, a storm, a digital glitch rain, pollen. Each
// grows with the world's stage (k) and moves with the music; what falls in front of the world stays light, small and
// sparse so the obstacles always read through it, and what is big (the aurora, the lightning) lives behind the world.
import { registerPart } from '../../registry.js';
import { cam, clock, fall, share } from './kit.js';
import { hash, rgba, clamp } from '../../../render/util.js';
import { at, fieldOf } from '../../../render/physics.js';

const TAU = Math.PI * 2;
// how strong the weather is behind the world (the same growth the front gets from weatherFront)
// (the field's, physics.js; the quality's cut eased, layers/weather.js)
const strength = f => (fieldOf(f) ? at(fieldOf(f), 'K', f.t) : clamp((f.mf.stage - 0.15) / 0.75, 0, 1)) * (0.4 + 0.6 * (f.R?.wq ?? f.glow ?? 1));
const wrap = (x, m) => ((x % m) + m) % m;

// aurora: three curtains of light high in the sky, their hems rippling, their rays swaying with the voice and
// brightening on the bass (a ribbon of colour, then thin vertical rays added over it)
registerPart({
  id: 'aurora',
  slot: 'weather',
  media: ['air'],
  tags: ['cold', 'fantasy', 'nature'],
  back(f) {
    const { g, v, t, mf, T } = f,
      k = strength(f),
      cols = [T.line, T.hold, T.win[1]],
      step = 3 * v.dpr,
      sway = 0.6 + 0.8 * mf.voice,
      // (the curtains ripple faster with the bass: the distance rippled, so a beat of bass never jumps them)
      c = clock(f);
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let cu = 0; cu < 3; cu++) {
      const base = v.H * (0.24 + 0.06 * cu),
        tall = v.H * (0.2 + 0.04 * cu) * (0.85 + 0.3 * k),
        amp = v.H * 0.04 * sway,
        ph = cu * 1.9,
        ripple = (0.25 + 0.1 * cu) * t + 0.3 * c.bassRun,
        hem = x => base + amp * Math.sin(x / v.W * 5.5 + ripple + ph) + amp * 0.5 * Math.sin(x / v.W * 13 - ripple * 1.7 + ph * 2),
        a = (0.32 + 0.2 * k + 0.2 * c.bass) * (cu === 2 ? 0.7 : 1) * (0.55 + 0.45 * (f.look?.night ?? 0.5)),
        gr = g.createLinearGradient(0, base - amp * 1.5, 0, base + tall + amp);
      gr.addColorStop(0, rgba(cols[cu], 0));
      gr.addColorStop(0.35, rgba(cols[cu], a * 0.5));
      gr.addColorStop(0.8, rgba(cols[cu], a));
      gr.addColorStop(1, rgba(cols[cu], 0));
      // (the ribbon: a hem below, its top fading up into the sky)
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(0, hem(0) - tall);
      for (let x = 0; x <= v.W + step; x += step * 6) g.lineTo(x, hem(x) - tall * (0.75 + 0.25 * Math.sin(x / v.W * 3 + t * 0.2 + cu)));
      for (let x = v.W + step; x >= 0; x -= step * 6) g.lineTo(x, hem(x) + tall * 0.12);
      g.closePath();
      g.fill();
      // (the rays: thin threads hanging from the ribbon, some longer, some brighter, flickering along it)
      g.strokeStyle = gr;
      g.lineWidth = 2 * v.dpr;
      g.beginPath();
      for (let x = 0, i = 0; x <= v.W; x += step, i++) {
        const h = hash(i, 31 + cu),
          on = 0.5 + 0.5 * Math.sin(t * (0.8 + h) + h * 20 - x / v.W * 4);
        if (on < 0.45) continue;
        const y = hem(x);
        g.moveTo(x, y - tall * (0.5 + 0.5 * h) * on);
        g.lineTo(x, y + tall * 0.1);
      }
      g.stroke();
    }
    g.restore();
  },
});

// meteors: shooting stars streaking down across the upper sky, a new one thrown on each kick (more of them on the
// drops), each a bright head with a tail fading behind it
registerPart({
  id: 'meteors',
  slot: 'weather',
  media: ['air', 'space'],
  tags: ['future', 'fantasy'],
  back(f) {
    const { g, v, t, mf, T } = f,
      k = strength(f),
      dir = [-Math.cos(0.5), Math.sin(0.5)];
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    // (vis: how much of it shows, a slot fading in or out with the weather's strength, never popping)
    const streak = (seed, age, life, size, vis = 1) => {
      if (age < 0 || age > life || vis <= 0) return;
      const u = age / life,
        x0 = v.W * (0.25 + 0.85 * hash(seed, 1)),
        y0 = v.H * 0.3 * hash(seed, 2) - v.H * 0.04,
        run = v.W * (0.35 + 0.3 * hash(seed, 3)),
        hx = x0 + dir[0] * run * u,
        hy = y0 + dir[1] * run * u,
        len = run * 0.45 * size * Math.min(1, u * 3),
        tx = hx - dir[0] * len,
        ty = hy - dir[1] * len,
        fade = (u < 0.8 ? 1 : (1 - u) / 0.2) * vis,
        col = hash(seed, 4) < 0.5 ? T.win[2] : T.line,
        gr = g.createLinearGradient(tx, ty, hx, hy);
      gr.addColorStop(0, rgba(col, 0));
      gr.addColorStop(0.6, rgba(col, 0.5 * fade));
      gr.addColorStop(1, `rgba(255,255,255,${0.9 * fade})`);
      g.strokeStyle = gr;
      g.lineWidth = 2.6 * size * v.dpr;
      g.beginPath();
      g.moveTo(tx, ty);
      g.lineTo(hx, hy);
      g.stroke();
      g.fillStyle = `rgba(255,255,255,${0.12 * fade})`;
      g.beginPath();
      g.arc(hx, hy, 7 * size * v.dpr, 0, TAU);
      g.fill();
    };
    // (the steady ones: a fixed set of slots, each on its own slow cycle, as many showing as the weather's strength
    // (fractional: the last fading, kit.js share))
    const n = 3 + 4 * k;
    for (let i = 0; i < 7; i++) {
      if (share(i, n) <= 0) continue;
      const per = 2.2 + 2.5 * hash(i, 9),
        tt = t + per * hash(i, 8),
        m = Math.floor(tt / per);
      if (hash(m, i + 50) < 0.25) continue;
      streak(i * 997 + m, tt - m * per, 1.1 + 0.6 * hash(m, i), 0.7 + 0.4 * hash(i, 5), share(i, n));
    }
    // (the thrown ones: on the beats, now and then in a verse, on most beats once the song has grown, a shower of two
    // on every beat of a drop; the last few beats' still finishing their runs)
    const bs = f.L?.A?.beats ?? [];
    let lo = 0,
      hi = bs.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (bs[mid] <= t) lo = mid + 1;
      else hi = mid;
    }
    // (each thrown as its beat had it: the weather's strength and the music's loudness then, so one in flight never
    // pops out as the song calms)
    const F = fieldOf(f);
    for (let b = lo - 1; b >= Math.max(0, lo - 3); b--) {
      const q = f.R?.fx?.(bs[b] + 0.03),
        hard = q ? q.amp >= 1 || q.drop > 0 : mf.amp >= 1 || mf.drop > 0,
        kb = F ? at(F, 'K', bs[b]) * (0.4 + 0.6 * (f.R?.wq ?? f.glow ?? 1)) : k;
      if (!hard && hash(b, 77) > 0.15 + 0.5 * kb) continue;
      for (let j = 0; j < (hard ? 2 : 1); j++) streak(b * 13 + j, t - bs[b] - j * 0.09, 0.9 + 0.3 * j, 1.15 - 0.3 * j);
    }
    g.restore();
  },
});

// petals: sakura petals tumbling down, each a notched petal turning over as it falls (pale as it faces us, its deep
// pink root showing as it turns edge-on), a gust on each snare throwing them sideways
registerPart({
  id: 'petals',
  slot: 'weather',
  media: ['air'],
  tags: ['ancient', 'nature', 'fantasy'],
  front(f, k) {
    const { g, v, t } = f,
      c = clock(f),
      C = cam(f),
      n = 16 + 30 * k,
      m = 30 * v.dpr,
      a0 = g.globalAlpha;
    for (let i = 0; i < Math.ceil(n); i++) {
      const h = hash(i, 41),
        near = hash(i, 42),
        sz = (4 + 6 * near) * v.dpr,
        par = 0.45 + 0.55 * near,
        // (falling and blown on faster as the world grows: the distances the field says; the snares' gusts are the
        // world's wind's, physics.js, so they push and the petals drift on, never snap back)
        y = wrap(hash(i, 44) * v.H + (28 + 30 * near) * (t + 0.3 * c.P) * v.dpr + C.y * par + Math.sin(t * 1.3 + h * 7) * 8 * v.dpr, v.H + 2 * m) - m,
        x = wrap(hash(i, 45) * v.W + c.dir * (20 * t + 30 * c.P) * (0.6 + near) * v.dpr + (c.run * C.m * 0.8 + C.x) * par + Math.sin(t * 0.9 + h * 9) * 30 * v.dpr, v.W + 2 * m) - m,
        turn = Math.cos(t * (1.2 + 2.2 * hash(i, 46)) + h * 9),
        flat = 0.2 + 0.8 * Math.abs(turn),
        rot = Math.sin(t * 0.7 + h * 5) * 1.3 + h * 6,
        a = 0.55 + 0.35 * near;
      g.globalAlpha = a0 * share(i, n);
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      g.scale(1, flat);
      g.fillStyle = turn > 0 ? `rgba(255,214,228,${a})` : `rgba(255,178,204,${a})`;
      g.beginPath();
      g.moveTo(-sz, 0);
      g.quadraticCurveTo(-sz * 0.1, -sz * 0.75, sz, -sz * 0.28);
      g.lineTo(sz * 0.72, 0);
      g.lineTo(sz, sz * 0.28);
      g.quadraticCurveTo(-sz * 0.1, sz * 0.75, -sz, 0);
      g.fill();
      // (its root, a deeper pink)
      g.fillStyle = `rgba(226,92,140,${a * 0.8})`;
      g.beginPath();
      g.ellipse(-sz * 0.55, 0, sz * 0.45, sz * 0.22, 0, 0, TAU);
      g.fill();
      g.restore();
    }
    g.globalAlpha = a0;
  },
});

// ash: grey flakes drifting down slow and crooked, and low over the ground the red glow of what still burns, a few
// embers lifting off it on the hats
registerPart({
  id: 'ash',
  slot: 'weather',
  media: ['air'],
  tags: ['hot', 'industrial', 'gothic'],
  front(f, k) {
    const { g, v, t, mf } = f,
      c = clock(f),
      C = cam(f),
      a0 = g.globalAlpha,
      glow = g.createLinearGradient(0, v.H * 0.72, 0, v.H);
    glow.addColorStop(0, 'rgba(255,60,20,0)');
    glow.addColorStop(1, `rgba(255,70,25,${0.08 + 0.1 * k + 0.08 * c.bass})`);
    g.fillStyle = glow;
    g.fillRect(0, v.H * 0.72, v.W, v.H * 0.28);
    const n = 30 + 50 * k;
    for (let i = 0; i < Math.ceil(n); i++) {
      const h = hash(i, 61),
        sz = (2.2 + 3 * hash(i, 62)) * v.dpr,
        par = 0.45 + 0.55 * hash(i, 62),
        y = wrap(hash(i, 63) * v.H + t * (18 + 22 * h) * v.dpr + C.y * par, v.H),
        x = wrap(hash(i, 64) * v.W + c.dir * (10 * t + 20 * c.P) * v.dpr + (0.6 * c.run * C.m + C.x) * par + Math.sin(t * 0.6 + h * 11) * 22 * v.dpr, v.W),
        rot = t * (0.6 + h) + h * 7,
        // (most flakes pale ash, some charred dark: one or the other reads on any sky)
        cc = hash(i, 65) < 0.7 ? 170 + Math.round(60 * hash(i, 60)) : 45 + Math.round(30 * hash(i, 60));
      g.fillStyle = `rgba(${cc},${cc - 4},${cc - 8},${(0.55 + 0.3 * h) * share(i, n)})`;
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      g.beginPath();
      g.moveTo(-sz, -sz * 0.4);
      g.lineTo(sz * 0.6, -sz * 0.7);
      g.lineTo(sz, sz * 0.3);
      g.lineTo(-sz * 0.4, sz * 0.6);
      g.closePath();
      g.fill();
      g.restore();
    }
    // (the embers: rising out of the glow, flaring on the hats, dying as they climb)
    const e = 8 + 16 * k;
    for (let i = 0; i < Math.ceil(e); i++) {
      const h = hash(i, 66),
        life = v.H * 0.4,
        up = wrap(hash(i, 67) * life + t * (35 + 30 * h) * v.dpr, life),
        x = wrap(hash(i, 68) * v.W + Math.sin(t * 1.3 + h * 9) * 14 * v.dpr + (0.3 * c.run * C.m + C.x) * 0.8, v.W),
        y = v.H - up,
        a = share(i, e) * (1 - up / life) * (0.5 + Math.min(0.5, mf.hat * 2 * hash(i, 69)));
      g.fillStyle = `rgba(255,${140 + Math.round(80 * h)},60,${a})`;
      g.fillRect(x, y, 2 * v.dpr, 2 * v.dpr);
    }
    g.globalAlpha = a0;
  },
});

// leaves: autumn leaves fluttering across, rocking as they fall, the bass's wind pushing them on
registerPart({
  id: 'leaves',
  slot: 'weather',
  media: ['air'],
  tags: ['nature', 'gothic', 'ancient'],
  front(f, k) {
    const { g, v, t } = f,
      c = clock(f),
      C = cam(f),
      n = 10 + 16 * k,
      cols = ['#d2581e', '#e8a02c', '#a8361a', '#c9a23a', '#8e4a1c'],
      a0 = g.globalAlpha;
    for (let i = 0; i < Math.ceil(n); i++) {
      const h = hash(i, 71),
        sz = (6 + 6 * hash(i, 72)) * v.dpr,
        par = 0.45 + 0.55 * hash(i, 72),
        // (blown on by the world's wind, the bass's swell in it: physics.js; faster as the world grows, by the field)
        y = wrap(hash(i, 73) * v.H + t * (22 + 20 * h) * v.dpr + C.y * par + Math.sin(t * 2 + h * 9) * 10 * v.dpr, v.H + 40 * v.dpr) - 20 * v.dpr,
        x = wrap(hash(i, 74) * v.W + c.dir * (45 * t + 50 * c.P) * v.dpr + (c.run * C.m * (0.6 + h) + C.x) * par, v.W + 40 * v.dpr) - 20 * v.dpr,
        rock = Math.sin(t * (1.6 + h) + h * 12),
        turn = Math.cos(t * (0.9 + h * 0.8) + h * 5),
        col = cols[Math.floor(hash(i, 75) * cols.length)];
      g.globalAlpha = a0 * share(i, n);
      g.save();
      g.translate(x, y);
      g.rotate(rock * 0.9 + h * 6);
      g.scale(1, 0.3 + 0.7 * Math.abs(turn));
      g.fillStyle = rgba(col, 0.92);
      g.beginPath();
      g.moveTo(-sz, 0);
      g.bezierCurveTo(-sz * 0.6, -sz * 0.9, sz * 0.4, -sz * 0.8, sz, 0);
      g.bezierCurveTo(sz * 0.4, sz * 0.8, -sz * 0.6, sz * 0.9, -sz, 0);
      g.fill();
      // (its midrib and stem)
      g.strokeStyle = 'rgba(60,25,10,0.5)';
      g.lineWidth = 0.8 * v.dpr;
      g.beginPath();
      g.moveTo(-sz * 1.35, 0);
      g.lineTo(sz * 0.8, 0);
      // (two pairs of side veins)
      for (const q of [-0.4, 0.15]) {
        g.moveTo(sz * q, 0);
        g.lineTo(sz * (q + 0.35), -sz * 0.35);
        g.moveTo(sz * q, 0);
        g.lineTo(sz * (q + 0.35), sz * 0.35);
      }
      g.stroke();
      g.restore();
    }
    g.globalAlpha = a0;
  },
});

// storm: a heavy slanted rain in two sheets, and behind the world lightning: a branching bolt across the sky with a
// brief flash of the sky on the drop's downbeats and the hard snares (behind the world, so it never blinds)
const bolt = (x, y, len, ang, seed, depth, w, pts) => {
  let px = x,
    py = y;
  const segs = 7 + Math.floor(hash(seed, 1) * 5),
    sl = len / segs;
  pts.push([px, py, true, w]);
  for (let s = 0; s < segs; s++) {
    const a = ang + (hash(seed, s + 10) - 0.5) * 1.1;
    px += Math.sin(a) * sl;
    py += Math.cos(a) * sl;
    pts.push([px, py, false, w]);
    if (depth > 0 && hash(seed, s + 40) < 0.16) {
      bolt(px, py, len * 0.32, ang + (hash(seed, s + 60) < 0.5 ? -0.7 : 0.7), seed * 3 + s, depth - 1, w * 0.55, pts);
      pts.push([px, py, true, w]);
    }
  }
};
registerPart({
  id: 'storm',
  slot: 'weather',
  media: ['air'],
  tags: ['gothic', 'urban', 'industrial'],
  back(f) {
    const { g, v, t, mf, T } = f,
      k = strength(f),
      dT = mf.dropT ?? -9,
      sT = mf.snareT ?? -9,
      // (a strike: on a drop's first beat, or a loud snare once the storm has grown, not more than one a second)
      strikeT = t - dT < 0.5 ? dT : k > 0.3 && mf.snare > 0.5 && hash(Math.round(sT * 10), 7) < 0.35 + 0.4 * k ? sT : -9,
      age = t - strikeT;
    if (age < 0 || age > 0.35) return;
    const seed = Math.round(strikeT * 100),
      u = age / 0.35,
      // (a double flicker, the way lightning does)
      fl = (age < 0.06 ? 1 : age < 0.1 ? 0.3 : age < 0.16 ? 0.8 : 1 - u) * (1 - u * 0.5),
      sky = g.createLinearGradient(0, 0, 0, v.H * 0.7);
    sky.addColorStop(0, `rgba(220,230,255,${0.22 * fl})`);
    sky.addColorStop(1, 'rgba(220,230,255,0)');
    g.fillStyle = sky;
    g.fillRect(0, 0, v.W, v.H * 0.7);
    const pts = [];
    bolt(v.W * (0.15 + 0.7 * hash(seed, 2)), -10, v.H * (0.55 + 0.2 * hash(seed, 3)), (hash(seed, 4) - 0.5) * 0.6, seed, 2, 1, pts);
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const [lw, col] of [[7, rgba(T.line, 0.25 * fl)], [2.2, `rgba(255,255,255,${0.95 * fl})`]]) {
      g.strokeStyle = col;
      g.beginPath();
      for (const [x, y, mv] of pts) mv ? g.moveTo(x, y) : g.lineTo(x, y);
      g.lineWidth = lw * v.dpr;
      g.stroke();
    }
    g.restore();
  },
  front(f, k) {
    const { T } = f;
    fall(f, 60 + 120 * k, [2.2, 1], [5, 4], 22, 1.1, rgba(T.win[1], 0.26 + 0.14 * clock(f).bass), 51, 0.55);
    fall(f, 30 + 60 * k, [2.8, 1], [6, 4], 34, 1.4, 'rgba(215,228,255,0.2)', 53, 1);
  },
});

// glitch: a digital rain of glyph columns falling down the screen's edges (never over the middle, where the run is),
// and on a snare a few torn scanlines slipping sideways in the palette's split colours
const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ0123456789ABCDEF<>/=*+';
registerPart({
  id: 'glitch',
  slot: 'weather',
  // (it suits many worlds: a lower weight keeps it from being the weather of every tech song)
  weight: 0.6,
  media: ['air', 'space'],
  tags: ['tech', 'neon', 'future'],
  front(f, k) {
    const { g, v, t, mf, T } = f,
      fs = Math.round(16 * v.dpr),
      c = clock(f),
      cols = 5 + 7 * k,
      trail = 12,
      a0 = g.globalAlpha;
    g.save();
    g.font = `bold ${fs}px monospace`;
    g.textAlign = 'center';
    for (let cn = 0; cn < Math.ceil(cols); cn++) {
      const h = hash(cn, 81),
        side = cn % 2 ? 1 : 0,
        // (the column's place: inside the outer fifth of the screen on its side)
        x = side ? v.W * (1 - 0.2 * hash(cn, 82)) - fs * 0.5 : v.W * 0.2 * hash(cn, 82) + fs * 0.5,
        // (faster with the bass: the distance it has run, so the column never jumps on a swell)
        span = v.H + trail * fs * 1.2,
        head = wrap(hash(cn, 83) * span + (5 + 6 * h) * fs * (t + 0.6 * c.bassRun), span),
        tick = Math.floor(t * (6 + 6 * h)),
        top = head - trail * fs * 1.15,
        shade = g.createLinearGradient(0, top, 0, head + fs);
      // (a dim slot behind the column, so its glyphs read on a pale sky too)
      shade.addColorStop(0, 'rgba(0,8,6,0)');
      shade.addColorStop(1, 'rgba(0,8,6,0.3)');
      g.fillStyle = shade;
      g.fillRect(x - fs * 0.6, top, fs * 1.2, head + fs - top);
      for (let j = 0; j < trail; j++) {
        const y = head - j * fs * 1.15;
        if (y < -fs || y > v.H + fs) continue;
        const ch = GLYPHS[Math.floor(hash(cn * 31 + Math.floor(y / fs), tick + (j === 0 ? 0 : Math.floor(tick / 3))) * GLYPHS.length)],
          a = (1 - j / trail) ** 0.7 * (0.7 + 0.3 * mf.hat);
        // (the head: a white glyph in a small glow of the column's colour)
        if (j === 0) {
          g.fillStyle = rgba(T.line, 0.25 + 0.2 * mf.hat);
          g.fillRect(x - fs * 0.6, y - fs * 0.95, fs * 1.2, fs * 1.2);
        }
        g.globalAlpha = a0 * share(cn, cols);
        g.fillStyle = j === 0 ? 'rgba(240,255,248,0.95)' : rgba(T.line, a);
        g.fillText(ch, x, y);
      }
      g.globalAlpha = a0;
    }
    g.restore();
    // (the tears: on a snare, a few thin bars across, shifted apart in two colours, gone in a fraction of a second)
    const age = t - (mf.snareT ?? -9);
    if (age >= 0 && age < 0.12 && k > 0.15) {
      const seed = Math.round((mf.snareT ?? 0) * 100),
        a = (1 - age / 0.12) * 0.35;
      for (let i = 0; i < 2 + Math.round(2 * k); i++) {
        const y = v.H * hash(seed, i + 1),
          hh = (1 + 3 * hash(seed, i + 9)) * v.dpr,
          off = (hash(seed, i + 20) - 0.5) * 30 * v.dpr,
          x0 = v.W * hash(seed, i + 30) * 0.5,
          w = v.W * (0.3 + 0.5 * hash(seed, i + 40));
        g.fillStyle = rgba(T.line, a);
        g.fillRect(x0 + off, y, w, hh);
        g.fillStyle = rgba(T.win[0], a * 0.8);
        g.fillRect(x0 - off, y + hh, w, hh);
      }
    }
  },
});

// pollen: glowing motes floating up through a soft slant of light, swelling and brightening with the voice
registerPart({
  id: 'pollen',
  slot: 'weather',
  media: ['air'],
  tags: ['nature', 'mild'],
  front(f, k) {
    const { g, v, t, mf, T } = f,
      voice = mf.voice ?? 0,
      shaft = g.createLinearGradient(0, 0, v.W * 0.6, v.H);
    shaft.addColorStop(0, rgba(T.win[2], 0.08 + 0.08 * voice));
    shaft.addColorStop(0.5, rgba(T.win[2], 0.02));
    shaft.addColorStop(1, rgba(T.win[2], 0));
    g.fillStyle = shaft;
    g.fillRect(0, 0, v.W, v.H);
    g.save();
    g.globalCompositeOperation = 'lighter';
    const n = 18 + 30 * k,
      c = clock(f),
      C = cam(f);
    for (let i = 0; i < Math.ceil(n); i++) {
      const h = hash(i, 91),
        par = 0.45 + 0.55 * hash(i, 94),
        // (floating in the air at their depth: passed by the camera, carried a little by the wind)
        y = wrap(hash(i, 92) * v.H - t * (8 + 14 * h) * v.dpr + C.y * par, v.H),
        x = wrap(hash(i, 93) * v.W + Math.sin(t * 0.5 + h * 13) * 30 * v.dpr + (0.3 * c.run * C.m + C.x) * par, v.W),
        tw = 0.5 + 0.5 * Math.sin(t * (1 + 2 * h) + h * 20),
        r = (1.6 + 1.8 * hash(i, 94)) * v.dpr * (1 + 0.7 * voice),
        col = hash(i, 95) < 0.5 ? T.win[1] : T.win[0];
      g.globalAlpha = share(i, n);
      g.fillStyle = rgba(col, (0.1 + 0.12 * voice) * (0.5 + tw));
      g.beginPath();
      g.arc(x, y, r * 2.4, 0, TAU);
      g.fill();
      g.fillStyle = rgba(col, (0.55 + 0.4 * voice) * (0.4 + 0.6 * tw));
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
    }
    g.restore();
  },
});
