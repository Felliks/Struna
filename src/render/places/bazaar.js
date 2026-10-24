// The bazaar: a night market. Sky lanterns rising slowly, glowing with the voice; shophouses far off under curved
// roofs, their paper windows lit on the kick and a row on the bass; strings of red lanterns sagging across, blinking on
// the hats; food stalls under striped awnings, steam puffing up off them on the kick, strings of firecrackers popping
// on the snare; landmarks by the song (a fabric dragon dancing along the melody and swaying on the bass, a gate with
// its lanterns and its plaque glowing on the downbeat, a pagoda lit tier by tier on the beat); a street of stone pavers
// with a red trim whose studs flash on the kick and lanterns' reflections shimmering on the hats.
import { hash, rgba } from '../util.js';
import { cells, celestial, edge, glow, landmark, row, slab, tint } from './kit.js';

const TAU = Math.PI * 2,
  RED = '#d8283a',
  GOLD = '#ffcf6a';

// a curved roof: its eaves w wide at screen y Y about X, turned up at the tips, h tall
function roof(g, X, Y, w, h) {
  g.beginPath();
  g.moveTo(X - 0.62 * w, Y - 0.3 * h);
  g.quadraticCurveTo(X - 0.5 * w, Y, X - 0.38 * w, Y);
  g.lineTo(X + 0.38 * w, Y);
  g.quadraticCurveTo(X + 0.5 * w, Y, X + 0.62 * w, Y - 0.3 * h);
  g.quadraticCurveTo(X + 0.2 * w, Y - 0.45 * h, X, Y - h);
  g.quadraticCurveTo(X - 0.2 * w, Y - 0.45 * h, X - 0.62 * w, Y - 0.3 * h);
  g.fill();
}
// a red lantern at (X, Y), r wide, lit a (0..1)
function lantern(f, X, Y, r, a) {
  const { g } = f;
  if (f.glow) glow(g, X, Y, r * 3, '#ff6a3a', 0.15 + 0.4 * a);
  g.fillStyle = rgba(RED, 0.55 + 0.45 * a);
  g.beginPath();
  g.ellipse(X, Y, r, r * 1.2, 0, 0, TAU);
  g.fill();
  g.fillStyle = GOLD;
  g.fillRect(X - r * 0.5, Y - r * 1.35, r, r * 0.3);
  g.fillRect(X - r * 0.5, Y + r * 1.05, r, r * 0.3);
}
// shophouses in a row, storey over storey under curved roofs, their paper windows lit on the kick and a row on the bass
function shophouses(f, par, col, hmul) {
  const { g, v, mf, T } = f,
    r = row(f, par),
    m = v.ppm;
  cells(r, 3.4, (i, X) => {
    const w = (2.4 + 0.8 * hash(i, 3 + par * 10)) * m,
      floors = 1 + Math.floor(hash(i, 5 + par * 10) * 3),
      fh = 2 * hmul * m;
    for (let k = 0; k < floors; k++) {
      const ww = w * (1 - k * 0.12),
        y0 = r.base - k * fh;
      g.fillStyle = col;
      g.fillRect(X + (w - ww) / 2, y0 - fh, ww, fh);
      roof(g, X + w / 2, y0 - fh, ww * 1.1, 0.7 * hmul * m);
      for (let c = 0; c < 3; c++) {
        const hv = hash(i * 31 + c, k + par * 100),
          lit = hv < 0.3 ? mf.kick : hv < 0.5 ? mf.bass * 0.8 : 0.15 + 0.4 * mf.stage;
        g.fillStyle = rgba(T.win[c % 3], Math.max(0.08, lit) * (0.4 + par));
        g.fillRect(X + (w - ww) / 2 + ww * (0.12 + c * 0.29), y0 - fh * 0.75, ww * 0.18, fh * 0.45);
      }
    }
  });
}
// strings of lanterns sagging across, each blinking on the hats or chasing the beat
function strings(f, par) {
  const { g, v, mf, T, t, L } = f,
    r = row(f, par),
    m = v.ppm,
    chase = Math.floor(t / L.A.beat);
  cells(r, 4, (i, X) => {
    const Y = r.base - (4.5 + hash(i, 7)) * m,
      sag = (0.6 + 0.1 * Math.sin(t * 1.3 + i) * (1 + mf.bass)) * m,
      at = u => [X + u * 4 * m, Y + 4 * u * (1 - u) * sag];
    g.strokeStyle = T.far;
    g.lineWidth = v.dpr * 1.5;
    g.beginPath();
    g.moveTo(X, Y);
    g.quadraticCurveTo(X + 2 * m, Y + 2 * sag, X + 4 * m, Y);
    g.stroke();
    for (let k = 1; k < 5; k++) {
      const [lx, ly] = at(k / 5),
        hv = hash(i * 7 + k, 13),
        a = hv < 0.4 ? Math.min(1, mf.hat * 2.5) : (chase + k) % 4 === 0 ? 0.4 + 0.6 * mf.beat : 0.15 + 0.3 * mf.stage;
      lantern(f, lx, ly + 0.25 * m, 0.22 * m, a);
    }
  });
}
// food stalls under striped awnings: steam puffing up on the kick, firecrackers hung off the corners popping on the snare
function stalls(f, par) {
  const { g, v, mf, T, t } = f,
    r = row(f, par),
    m = v.ppm,
    stripe = tint(f, RED, T.far, 0.25);
  cells(r, 3.6, (i, X, u, seen) => {
    // (decided by the world's stage as it came into view: kit.js stageSeen, never popping in in sight)
    if (u > 0.5 + 0.5 * seen()) return;
    const w = 2.8 * m,
      top = r.base - 2.3 * m;
    g.fillStyle = T.near;
    g.fillRect(X, r.base - 1 * m, w, 1 * m);
    g.fillRect(X + 0.05 * m, top, 0.1 * m, 2.3 * m);
    g.fillRect(X + w - 0.15 * m, top, 0.1 * m, 2.3 * m);
    for (let k = 0; k < 7; k++) {
      g.fillStyle = k % 2 ? T.win[2] : stripe;
      g.beginPath();
      g.moveTo(X - 0.2 * m + (k * (w + 0.4 * m)) / 7, top - 0.5 * m);
      g.lineTo(X - 0.2 * m + ((k + 1) * (w + 0.4 * m)) / 7, top - 0.5 * m);
      g.lineTo(X - 0.2 * m + ((k + 1) * (w + 0.4 * m)) / 7, top);
      g.arc(X - 0.2 * m + ((k + 0.5) * (w + 0.4 * m)) / 7, top, (w + 0.4 * m) / 14, 0, Math.PI);
      g.fill();
    }
    // the steam: puffs rising off the wok, thicker on the kick
    for (let k = 0; k < 4; k++) {
      const life = (((t * 0.5 + k * 0.25 + hash(i, 3)) % 1) + 1) % 1;
      g.fillStyle = rgba('#f4f0ea', (0.12 + 0.3 * mf.kick) * (1 - life));
      g.beginPath();
      g.arc(X + w * 0.5 + Math.sin(t * 2 + k) * 0.2 * m, r.base - (1.1 + 1.1 * life) * m, (0.2 + 0.35 * life) * m * (1 + 0.3 * mf.kick), 0, TAU);
      g.fill();
    }
    if (hash(i, 9) > 0.55) return;
    // a string of firecrackers off the awning's corner, bursts of light along it on the snare
    const fx = X + w + 0.1 * m;
    for (let k = 0; k < 8; k++) {
      g.fillStyle = k % 2 ? RED : '#a01822';
      g.fillRect(fx - 0.06 * m, top + k * 0.17 * m, 0.12 * m, 0.13 * m);
      const pop = (mf.snare ?? 0) * (hash(k + Math.floor(t * 12), i) < 0.35 ? 1 : 0);
      if (pop > 0.1) glow(g, fx, top + k * 0.17 * m, (0.2 + 0.3 * pop) * m, '#fff3a0', pop);
    }
  });
}

export const LANDMARKS = {
  // a fabric dragon on poles, dancing along the melody, its body swaying with the bass and the beat
  dragon(f) {
    const { g, v, mf, T, t } = f;
    landmark(f, 0.4, 30, 0.8, 1, (X0, base, i) => {
      const m = v.ppm,
        X = X0 + Math.sin(t * 0.4 + i) * 2 * m,
        lift = (3.6 + 1.5 * (mf.pitch ?? 0)) * m,
        amp = (0.3 + 0.6 * mf.bass + 0.3 * mf.beat) * m,
        P = k => [X - k * 0.55 * m, base - lift - Math.sin(t * 3 + k * 0.6) * amp];
      for (let k = 12; k >= 0; k--) {
        const [x, y] = P(k);
        if (k % 3 === 0) {
          g.fillStyle = T.far;
          g.fillRect(x - 0.04 * m, y, 0.08 * m, base - y);
        }
        g.fillStyle = k % 2 ? tint(f, RED, T.far, 0.2) : GOLD;
        g.beginPath();
        g.arc(x, y, (0.42 - k * 0.015) * m, 0, TAU);
        g.fill();
      }
      // its head: a snout, a mane, eyes lit with the voice
      const [hx, hy] = P(-0.8);
      g.fillStyle = RED;
      g.beginPath();
      g.moveTo(hx - 0.4 * m, hy - 0.5 * m);
      g.lineTo(hx + 0.8 * m, hy - 0.15 * m);
      g.lineTo(hx + 0.75 * m, hy + 0.25 * m);
      g.lineTo(hx - 0.4 * m, hy + 0.45 * m);
      g.fill();
      g.fillStyle = GOLD;
      g.fillRect(hx - 0.5 * m, hy - 0.75 * m, 0.25 * m, 0.4 * m);
      glow(g, hx + 0.3 * m, hy - 0.2 * m, 0.3 * m, '#fff3a0', 0.4 + 0.6 * (mf.voice ?? 0));
    });
  },
  // a market gate on four red pillars, its lanterns blinking on the hats, its plaque glowing on the downbeat
  paifang(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.16, 34, 0.7, 2, (X, base) => {
      const m = v.ppm * 1.3,
        pill = tint(f, RED, T.far, 0.55);
      g.fillStyle = pill;
      for (const dx of [-3.4, -1.6, 1.6, 3.4]) g.fillRect(X + (dx - 0.18) * m, base - (Math.abs(dx) > 2 ? 4 : 5.5) * m, 0.36 * m, 6 * m);
      g.fillStyle = T.far;
      g.fillRect(X - 4.2 * m, base - 4.3 * m, 8.4 * m, 0.4 * m);
      g.fillRect(X - 2.2 * m, base - 5.9 * m, 4.4 * m, 0.45 * m);
      roof(g, X, base - 5.9 * m, 5.2 * m, 1.1 * m);
      for (const dx of [-3.6, 3.6]) roof(g, X + dx * m, base - 4.3 * m, 2.4 * m, 0.7 * m);
      g.fillStyle = rgba(GOLD, 0.3 + 0.6 * mf.down);
      g.fillRect(X - 0.8 * m, base - 5.4 * m, 1.6 * m, 0.9 * m);
      for (const dx of [-2.5, 2.5]) lantern(f, X + dx * m, base - 3.4 * m, 0.3 * m, Math.min(1, mf.hat * 2.5));
    });
  },
  // a pagoda, its tiers lit one after another on the beat, all of them on the drop, its spire flashing on the kick
  pagoda(f) {
    const { g, v, mf, T, t, L } = f;
    const lit = Math.floor(t / L.A.beat) % 6;
    landmark(f, 0.08, 50, 0.75, 3, (X, base) => {
      const m = v.ppm;
      for (let k = 0; k < 6; k++) {
        const w = (3.4 - k * 0.42) * m,
          y = base - k * 1.7 * m;
        g.fillStyle = T.far;
        g.fillRect(X - w * 0.38, y - 1.7 * m, w * 0.76, 1.7 * m);
        roof(g, X, y - 1.5 * m, w * 1.15, 0.6 * m);
        g.fillStyle = rgba(T.win[k % 3], k === lit || mf.drop > 0.2 ? 0.5 + 0.5 * mf.beat : 0.12 + 0.2 * mf.stage);
        g.fillRect(X - w * 0.3, y - 1.2 * m, w * 0.6, 0.12 * m);
      }
      g.fillStyle = T.far;
      g.fillRect(X - 0.06 * m, base - 12.4 * m, 0.12 * m, 2.4 * m);
      glow(g, X, base - 12.4 * m, (0.3 + 0.5 * mf.kick) * m, GOLD, 0.4 + 0.6 * mf.kick);
    });
  },
};

// the far rows: the far shophouse roofs
function far(f) {
  shophouses(f, 0.14, f.T.far, 1);
}
// the near rows: the lantern strings, the near shophouses, the stalls
function near(f) {
  strings(f, 0.3);
  shophouses(f, 0.36, f.T.near, 0.8);
  stalls(f, 0.5);
}

export default {
  sky(f) {
    const { g, v, mf, t } = f,
      m = v.ppm;
    celestial(f);
    // sky lanterns rising slowly, glowing with the voice, more of them as the song grows
    for (let i = 0; i < 6 + 12 * mf.stage; i++) {
      const life = (((t * 0.015 * (0.6 + hash(i, 72)) + hash(i, 73)) % 1) + 1) % 1,
        X = (hash(i, 71) * 1.3 - 0.15) * v.W + Math.sin(t * 0.3 + i) * 0.5 * m,
        Y = v.H * (0.9 - 0.85 * life),
        r = (0.1 + 0.1 * hash(i, 74)) * m * (1 - 0.5 * life),
        a = (0.35 + 0.4 * (mf.voice ?? 0) + 0.25 * Math.min(1, mf.hat * 2)) * (1 - life);
      glow(g, X, Y, r * 4, '#ffb347', a * 0.5);
      g.fillStyle = rgba('#ffcf8a', a);
      g.fillRect(X - r, Y - r * 1.3, r * 2, r * 2.6);
    }
  },
  back(f) {
    const { T } = f,
      on = n => f.look.landmarks.includes(n) && LANDMARKS[n](f);
    // (each landmark in among the rows at its own depth: the pagoda far off, the gate over the far roofs, the dragon in
    // the street over the near roofs and behind the stalls)
    on('pagoda');
    far(f);
    on('paifang');
    strings(f, 0.3);
    shophouses(f, 0.36, T.near, 0.8);
    on('dragon');
    stalls(f, 0.5);
  },
  far,
  near,
  ground(f, a, b, y) {
    const { g, v, mf, T, t } = f,
      s = slab(f, a, b, y, tint(f, '#3a2a28', T.near, 0.4), tint(f, '#8a6a52', T.far, 0.3));
    if (!s) return;
    const m = v.ppm;
    // the pavers: courses of stone set off by half a stone
    g.fillStyle = 'rgba(0,0,0,0.3)';
    for (let r = 0; r < 4; r++) {
      const yy = s.Y + (0.22 + r * 0.45) * m;
      g.fillRect(s.X0, yy, s.X1 - s.X0, 0.035 * m);
      for (let k = Math.floor(s.a / 0.7); k < s.b / 0.7; k++) {
        const x = k * 0.7 + (r % 2) * 0.35;
        if (x > s.a && x < s.b) g.fillRect(v.sx(x), yy, 0.035 * m, 0.45 * m);
      }
    }
    // a red trim along the street's face, its gold studs flashing on the kick
    g.fillStyle = rgba(RED, 0.7);
    g.fillRect(s.X0, s.Y + 2.1 * m, s.X1 - s.X0, 0.22 * m);
    for (let k = Math.ceil(s.a / 0.5); k < s.b / 0.5; k++) {
      g.fillStyle = rgba(GOLD, 0.35 + 0.65 * mf.kick * mf.amp);
      g.fillRect(v.sx(k * 0.5) - 0.04 * m, s.Y + 2.17 * m, 0.08 * m, 0.08 * m);
    }
    // the lanterns' reflections on the wet stone, shimmering on the hats
    for (let k = Math.floor(s.a / 1.3); k < s.b / 1.3; k++) {
      if (hash(k, Math.floor(t * 6)) > 0.25 + 0.4 * mf.hat) continue;
      g.fillStyle = rgba(k % 3 ? '#ff6a3a' : T.win[0], 0.25 + 0.4 * mf.hat);
      g.fillRect(v.sx(k * 1.3 + hash(k, 5)), s.Y + 0.06 * m, 0.25 * m, 0.04 * m);
    }
    edge(f, s, GOLD);
  },
};
