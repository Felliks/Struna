// The skies: a city in the clouds. Sun rays fanning down brighter as the voice sings, banks of cloud far off breathing
// with the bass, floating islands at two depths with waterfalls pouring off their lips into the void (a step on every
// beat), windmills on the near ones turning on the hats, houses lit on the kick, birds flapping across on the hats;
// landmarks by the song (a floating temple glowing inside on the downbeat, airships whose running lights flash on the
// kick, hot-air balloons bobbing on the beat); underfoot a stone island under a top of cloud swelling on the kick.
import { hash, rgba } from '../util.js';
import { celestial, cells, edge, flat, glow, landmark, row, slab, tint } from './kit.js';

const TAU = Math.PI * 2;
// a cloud's puffs: [dx, dy, r] in its own size
const PUFF = [[0, 0, 1.2], [1.3, 0.2, 0.9], [-1.2, 0.3, 0.8], [0.5, -0.6, 0.9], [2.2, 0.5, 0.6], [-2, 0.5, 0.5]];

function puffs(g, X, Y, s) {
  g.beginPath();
  for (const [dx, dy, r] of PUFF) {
    g.moveTo(X + dx * s + r * s, Y + dy * s);
    g.arc(X + dx * s, Y + dy * s, r * s, 0, TAU);
  }
  g.fill();
}
// a row of cloud banks at parallax par, `lift` m over its horizon, breathing with the bass
function clouds(f, par, lift, a) {
  const { g, v, mf, T, t } = f,
    r = row(f, par),
    m = v.ppm;
  g.fillStyle = tint(f, '#ffffff', T.far, 0.35);
  g.globalAlpha = a;
  cells(r, 5, (i, X, u) => {
    const s = (0.8 + 0.6 * u) * (1 + 0.12 * mf.bass) * m;
    puffs(g, X + Math.sin(t * 0.2 + i) * 0.4 * m, r.base - (lift + 2 * u) * m, s);
  });
  g.globalAlpha = 1;
}
// a floating island: its flat top w wide from screen (X, top), its rock tapering d deep under it, turf along the top
function island(g, X, top, w, d, rock, turf, i) {
  g.fillStyle = rock;
  g.beginPath();
  g.moveTo(X, top);
  for (let k = 1; k < 6; k++) g.lineTo(X + (k / 6) * w, top + d * Math.sin((Math.PI * k) / 6) ** 0.8 * (0.6 + 0.4 * hash(i, k)));
  g.lineTo(X + w, top);
  g.fill();
  g.fillStyle = turf;
  g.fillRect(X - 0.02 * w, top - 0.04 * d, w * 1.04, 0.1 * d);
}
// water pouring off a lip at (X, top) down into the void, its streaks stepping down on the beat
function fall(g, X, top, bottom, w, step, mf) {
  const h = bottom - top,
    gr = g.createLinearGradient(0, top, 0, bottom);
  gr.addColorStop(0, rgba('#e8f8ff', 0.5 + 0.25 * mf.bass));
  gr.addColorStop(1, rgba('#e8f8ff', 0));
  g.fillStyle = gr;
  g.fillRect(X - w / 2, top, w, h);
  g.fillStyle = rgba('#ffffff', 0.3 + 0.5 * mf.kick);
  for (let k = 0; k < 4; k++) g.fillRect(X - w * 0.35 + k * w * 0.2, top + ((step + k * 0.27) % 1) * h * 0.8, w * 0.1, h * 0.14);
}
// a windmill on an island: its tower, four sails turning on the hats
function windmill(g, X, Y, m, col, ang) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(X - 0.4 * m, Y);
  g.lineTo(X - 0.25 * m, Y - 1.8 * m);
  g.lineTo(X + 0.25 * m, Y - 1.8 * m);
  g.lineTo(X + 0.4 * m, Y);
  g.fill();
  g.strokeStyle = col;
  g.lineWidth = 0.12 * m;
  g.beginPath();
  for (let k = 0; k < 4; k++) {
    const a = ang + (k * TAU) / 4;
    g.moveTo(X, Y - 1.7 * m);
    g.lineTo(X + Math.cos(a) * 1.3 * m, Y - 1.7 * m + Math.sin(a) * 1.3 * m);
  }
  g.stroke();
}
function islands(f, par, hmul, rock, near) {
  const { g, v, mf, T, t, L } = f,
    r = row(f, par),
    m = v.ppm,
    step = (t / L.A.beat) % 1,
    turf = tint(f, '#7ad08a', T.far, 0.5);
  cells(r, 7, (i, X, u, seen) => {
    // (more islands as the song grows)
    // (decided by the world's stage as it came into view: kit.js stageSeen, never popping in in sight)
    if (u > 0.45 + 0.45 * seen()) return;
    const w = (2.5 + 3 * hash(i, 11 + par * 10)) * hmul * m,
      top = r.base - (3 + 5 * hash(i, 5 + par * 10)) * hmul * m + Math.sin(t * 0.7 + i) * 0.15 * m,
      d = w * 0.6;
    island(g, X, top, w, d, rock, turf, i);
    if (hash(i, 9) < 0.6) fall(g, X + w * (0.2 + 0.5 * hash(i, 13)), top, r.base + 3 * m, 0.45 * hmul * m, step, mf);
    if (near && hash(i, 17) < 0.6) windmill(g, X + w * 0.7, top, m * hmul, rock, t * 1.2 + mf.hat * 1.5 + i);
    // houses on the top, their windows lit on the kick (more of them as the song grows)
    for (let k = 0; k < 3; k++) {
      if (hash(i, 21 + k) > 0.5) continue;
      const hx = X + w * (0.1 + k * 0.18),
        hw = 0.7 * hmul * m;
      g.fillStyle = rock;
      g.fillRect(hx, top - hw, hw, hw);
      g.beginPath();
      g.moveTo(hx - 0.1 * hw, top - hw);
      g.lineTo(hx + hw / 2, top - hw * 1.6);
      g.lineTo(hx + hw * 1.1, top - hw);
      g.fill();
      g.fillStyle = rgba(T.win[k % 3], 0.2 + 0.5 * mf.kick * mf.amp + 0.3 * mf.stage);
      g.fillRect(hx + hw * 0.3, top - hw * 0.7, hw * 0.4, hw * 0.35);
    }
  });
}
// a flock flying across, wings flapping on the hats
function birds(f) {
  // (across the screen, not in a row's frame)
  flat(f);
  const { g, v, mf, t, T } = f,
    m = v.ppm,
    flap = (0.1 + 0.25 * Math.min(1, mf.hat * 2.5)) * m;
  g.strokeStyle = T.near;
  g.lineWidth = 1.5 * v.dpr;
  g.beginPath();
  for (let i = 0; i < 9; i++) {
    const lead = ((t * 0.9 * m + hash(Math.floor(i / 5), 3) * v.W) % (v.W * 1.5)) - 0.25 * v.W,
      k = i % 5,
      X = lead - (k >> 1) * 0.6 * m,
      Y = v.H * (0.2 + 0.25 * hash(Math.floor(i / 5), 5)) + (k % 2 ? 1 : -1) * (k >> 1) * 0.35 * m,
      w = flap * Math.sin(t * 9 + i);
    g.moveTo(X - 0.3 * m, Y - w);
    g.lineTo(X, Y);
    g.lineTo(X + 0.3 * m, Y - w);
  }
  g.stroke();
}

export const LANDMARKS = {
  // a temple on a great floating rock: its dome and columns, lit inside on the downbeat, a beam up from it on the drop
  temple(f) {
    const { g, v, mf, T, t } = f;
    landmark(f, 0.07, 60, 0.75, 1, (X, base, i) => {
      const m = v.ppm,
        top = base - 9 * m + Math.sin(t * 0.4) * 0.3 * m;
      if (mf.drop > 0.05) {
        g.fillStyle = rgba(T.win[2], 0.25 * mf.drop);
        g.fillRect(X - 0.8 * m, 0, 1.6 * m, top - 4 * m);
      }
      island(g, X - 5 * m, top, 10 * m, 6 * m, T.far, tint(f, '#7ad08a', T.far, 0.5), i);
      glow(g, X, top - 2 * m, 4 * m, T.win[0], 0.15 + 0.5 * mf.down);
      g.fillStyle = T.far;
      g.fillRect(X - 3 * m, top - 0.5 * m, 6 * m, 0.5 * m);
      for (let k = 0; k < 6; k++) g.fillRect(X - 2.7 * m + k * 1.04 * m, top - 3 * m, 0.35 * m, 2.6 * m);
      g.fillRect(X - 3.2 * m, top - 3.4 * m, 6.4 * m, 0.45 * m);
      g.beginPath();
      g.arc(X, top - 3.4 * m, 2.2 * m, Math.PI, 0);
      g.fill();
      glow(g, X, top - 5.8 * m, (0.4 + 0.5 * mf.kick) * m, T.win[1], 0.4 + 0.5 * mf.beat);
    });
  },
  // airships drifting by, their envelopes swelling with the bass, running lights flashing on the kick
  airships(f) {
    const { g, v, mf, T, t } = f;
    landmark(f, 0.18, 30, 0.6, 2, (X0, base, i) => {
      const m = v.ppm,
        X = X0 + Math.sin(t * 0.25 + i) * 1.5 * m,
        Y = base - (7 + 3 * hash(i, 4)) * m + Math.sin(t * 0.6 + i) * 0.3 * m,
        sw = 1 + 0.04 * mf.bass;
      g.fillStyle = T.far;
      g.beginPath();
      g.ellipse(X, Y, 3.2 * m * sw, 1.1 * m * sw, 0, 0, TAU);
      g.fill();
      g.beginPath();
      g.moveTo(X - 2.8 * m, Y);
      g.lineTo(X - 3.9 * m, Y - 1.2 * m);
      g.lineTo(X - 3.9 * m, Y + 1.2 * m);
      g.fill();
      g.fillRect(X - 1 * m, Y + 1 * m, 2 * m, 0.5 * m);
      g.fillStyle = rgba(T.win[0], 0.3 + 0.4 * mf.stage);
      for (let k = 0; k < 4; k++) g.fillRect(X - 0.85 * m + k * 0.45 * m, Y + 1.12 * m, 0.25 * m, 0.22 * m);
      glow(g, X + 3.1 * m, Y, (0.25 + 0.4 * mf.kick) * m, '#ff3b4f', 0.4 + 0.6 * mf.kick);
      glow(g, X - 3.8 * m, Y - 1.2 * m, (0.2 + 0.3 * mf.kick) * m, '#4aff8a', 0.3 + 0.6 * mf.kick);
    });
  },
  // hot-air balloons bobbing on the beat, their burners flaring on the kick
  balloons(f) {
    const { g, v, mf, T, t } = f;
    landmark(f, 0.24, 11, 0.7, 3, (X, base, i) => {
      const m = v.ppm,
        Y = base - (5 + 4 * hash(i, 6)) * m - mf.beat * 0.3 * m + Math.sin(t * 0.8 + i) * 0.2 * m,
        r = (1 + 0.4 * hash(i, 8)) * m,
        cols = [T.win[((i % 3) + 3) % 3], tint(f, '#ff5a4a', T.far, 0.3)];
      for (let k = 0; k < 4; k++) {
        g.fillStyle = cols[k % 2];
        g.beginPath();
        g.ellipse(X, Y, r * (1 - k * 0.25), r * 1.1, 0, 0, TAU);
        g.fill();
      }
      g.fillStyle = cols[0];
      g.beginPath();
      g.moveTo(X - r * 0.8, Y + r * 0.6);
      g.lineTo(X - r * 0.25, Y + r * 1.6);
      g.lineTo(X + r * 0.25, Y + r * 1.6);
      g.lineTo(X + r * 0.8, Y + r * 0.6);
      g.fill();
      glow(g, X, Y + r * 1.65, (0.15 + 0.35 * mf.kick) * m, '#ffb347', 0.3 + 0.7 * mf.kick);
      g.fillStyle = T.far;
      g.fillRect(X - r * 0.22, Y + r * 1.75, r * 0.44, r * 0.3);
    });
  },
};

// the far rows: the far cloud bank, the far islands
function far(f) {
  clouds(f, 0.04, 2, 0.55);
  islands(f, 0.14, 0.7, f.T.far, false);
}
// the near rows: the nearer clouds, the near islands, the flock
function near(f) {
  clouds(f, 0.28, -1, 0.7);
  islands(f, 0.42, 1, f.T.near, true);
  birds(f);
}

export default {
  sky(f) {
    const { g, v, mf, t } = f;
    celestial(f);
    // sun rays fanning down from high up, wider and brighter as the voice sings and the song grows
    g.save();
    g.globalCompositeOperation = 'lighter';
    const ox = v.W * 0.78,
      oy = -v.H * 0.1,
      len = v.H * 1.6;
    for (let k = 0; k < 7; k++) {
      const a = Math.PI * (0.55 + k * 0.065) + 0.02 * Math.sin(t * 0.3 + k),
        sp = 0.016 + 0.014 * mf.voice;
      g.fillStyle = rgba('#fff6d8', (0.03 + 0.07 * mf.voice + 0.03 * mf.stage) * (0.6 + 0.4 * Math.sin(k * 2.1 + t * 0.5)));
      g.beginPath();
      g.moveTo(ox, oy);
      g.lineTo(ox + Math.cos(a - sp) * len, oy + Math.sin(a - sp) * len);
      g.lineTo(ox + Math.cos(a + sp) * len, oy + Math.sin(a + sp) * len);
      g.fill();
    }
    g.restore();
  },
  back(f) {
    // (the landmarks between the far cloud bank and the far islands, as made)
    clouds(f, 0.04, 2, 0.55);
    for (const l of f.look.landmarks) LANDMARKS[l]?.(f);
    islands(f, 0.14, 0.7, f.T.far, false);
    near(f);
  },
  far,
  near,
  ground(f, a, b, y) {
    const { g, v, mf, T } = f,
      s = slab(f, a, b, y, tint(f, '#6a6a7a', T.near, 0.45), tint(f, '#f4f8ff', T.far, 0.15));
    if (!s) return;
    const m = v.ppm;
    // the island's strata under the cloud
    g.fillStyle = 'rgba(0,0,0,0.18)';
    for (const d of [0.9, 1.7, 2.6]) g.fillRect(s.X0, s.Y + d * m, s.X1 - s.X0, 0.05 * m);
    // crystals in the rock, lit on the bass and more of them as the song grows
    for (let k = Math.floor(s.a / 0.9); k < s.b / 0.9; k++) {
      const u = hash(k, 61);
      if (u > 0.15 + 0.25 * mf.stage) continue;
      const X = v.sx(k * 0.9 + 0.45),
        Y = s.Y + (0.6 + 2.5 * hash(k, 62)) * m;
      g.fillStyle = rgba(T.win[((k % 3) + 3) % 3], 0.3 + 0.6 * mf.bass);
      g.beginPath();
      g.moveTo(X, Y - 0.18 * m);
      g.lineTo(X + 0.09 * m, Y);
      g.lineTo(X, Y + 0.18 * m);
      g.lineTo(X - 0.09 * m, Y);
      g.fill();
    }
    // the cloud top: puffs along it, swelling on the kick
    g.fillStyle = tint(f, '#ffffff', T.far, 0.12);
    g.beginPath();
    for (let k = Math.floor(s.a / 0.35); k < s.b / 0.35; k++) {
      const x = k * 0.35 + 0.17,
        r = (0.08 + 0.07 * hash(k, 23)) * (1 + 0.3 * mf.kick) * m;
      if (x < s.a || x > s.b) continue;
      g.moveTo(v.sx(x) + r, s.Y + 0.1 * m);
      g.arc(v.sx(x), s.Y + 0.1 * m, r, 0, TAU);
    }
    g.fill();
    edge(f, s, '#e8f6ff');
  },
};
