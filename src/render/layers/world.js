// The world's grammar beyond its place (character.js): an anomaly of the simulation's in the song's sky, the song itself
// as the far horizon (its loudness laid out ahead as a range of hills, what is coming in it can be seen coming), and on
// the hoverboard's drops a tunnel of light rushing at the screen (a pseudo-3D rush behind the run). Behind the world's
// own backdrop; all in the screen's pixels.
import { sampleEnv } from '../../analyze.js';
import { glowDot, rgba } from '../util.js';
import { modeAmount } from './modes.js';

function screen(g, draw) {
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  draw();
  g.restore();
}

const ANOMALY = {
  // a moon too big for the sky, low on the horizon, breathing with the bass
  moon(f, g, W, H) {
    const { T, mf } = f,
      r = H * 0.55,
      x = W * 0.3,
      y = H * 0.78;
    glowDot(g, x, y, r * 1.5, T.sky[2], 0.35 + 0.2 * mf.bass);
    g.fillStyle = rgba(T.sky[2], 0.55);
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = rgba(T.far, 0.3);
    for (const [dx, dy, rr] of [[-0.3, -0.4, 0.12], [0.2, -0.2, 0.08], [0.05, -0.6, 0.06], [-0.1, 0.1, 0.1]]) {
      g.beginPath();
      g.arc(x + dx * r, y + dy * r, rr * r, 0, Math.PI * 2);
      g.fill();
    }
  },
  // a planet's ring across the sky, turning
  ring(f, g, W, H) {
    const { T, t, mf } = f;
    g.strokeStyle = rgba(T.line, 0.25 + 0.15 * mf.beat);
    g.lineWidth = H * 0.012;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.ellipse(W * 0.55, H * 0.3, W * (0.55 + i * 0.04), H * (0.09 + i * 0.012), -0.18 + 0.02 * Math.sin(t * 0.1), 0, Math.PI * 2);
      g.stroke();
    }
  },
  // the aurora: curtains of light swaying with the voice
  aurora(f, g, W, H) {
    const { t, mf, T } = f;
    g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      g.fillStyle = rgba(k === 1 ? T.hold : T.line, 0.07 + 0.08 * mf.voice);
      g.beginPath();
      g.moveTo(0, H * 0.1);
      for (let x = 0; x <= W; x += W / 24) g.lineTo(x, H * (0.15 + 0.08 * k) + Math.sin(x / W * 6 + t * (0.4 + 0.2 * k) + k) * H * 0.06);
      for (let x = W; x >= 0; x -= W / 24) g.lineTo(x, H * (0.35 + 0.08 * k) + Math.sin(x / W * 5 + t * 0.3 + k * 2) * H * 0.05);
      g.closePath();
      g.fill();
    }
  },
  // islands of rock floating in the sky, drifting
  islands(f, g, W, H) {
    const { t, T, mf } = f;
    g.fillStyle = rgba(T.far, 0.8);
    for (let i = 0; i < 5; i++) {
      const x = ((i * 0.23 + t * 0.006 * (1 + i * 0.3)) % 1.2) * W - 0.1 * W,
        y = H * (0.18 + 0.12 * ((i * 7) % 3)) + Math.sin(t * 0.5 + i) * H * 0.01 - mf.bass * H * 0.005,
        w = W * (0.05 + 0.02 * (i % 3));
      g.beginPath();
      g.moveTo(x - w, y);
      g.lineTo(x + w, y);
      g.lineTo(x + w * 0.3, y + w * 0.9);
      g.lineTo(x - w * 0.2, y + w * 0.6);
      g.closePath();
      g.fill();
      g.fillRect(x - w * 0.5, y - w * 0.25, w * 0.3, w * 0.25);
    }
  },
  // a wormhole: a spiral turning in the sky, faster on the drop
  wormhole(f, g, W, H) {
    const { t, mf, T } = f,
      x = W * 0.72,
      y = H * 0.25,
      R = H * 0.22;
    g.globalCompositeOperation = 'lighter';
    g.lineWidth = H * 0.006;
    for (let k = 0; k < 5; k++) {
      g.strokeStyle = rgba(k % 2 ? T.hold : T.line, 0.18);
      g.beginPath();
      for (let a = 0; a < Math.PI * 4; a += 0.2) {
        const rr = (R * a) / (Math.PI * 4),
          an = a + t * (0.6 + 2 * mf.drop) + (k * Math.PI * 2) / 5;
        g.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr * 0.6);
      }
      g.stroke();
    }
    glowDot(g, x, y, R * 0.3, '#ffffff', 0.4 + 0.3 * mf.kick);
  },
  // a city hanging upside down from the top of the sky
  skycity(f, g, W, H) {
    const { T } = f;
    g.fillStyle = rgba(T.far, 0.55);
    let x = 0,
      i = 0;
    while (x < W) {
      const w = W * (0.03 + 0.025 * ((i * 5) % 3)),
        h = H * (0.06 + 0.05 * ((i * 7) % 4));
      g.fillRect(x, 0, w - 2, h);
      g.fillStyle = rgba(T.win[i % 3], 0.4);
      for (let k = 0; k < 3; k++) g.fillRect(x + w * 0.3, h * (0.3 + 0.2 * k), w * 0.15, h * 0.06);
      g.fillStyle = rgba(T.far, 0.55);
      x += w;
      i++;
    }
  },
};

export function drawAnomaly(f) {
  const a = ANOMALY[f.L.ch?.anomaly];
  if (!a) return;
  screen(f.g, () => a(f, f.g, f.v.W, f.v.H));
}

// the song as the far horizon: its loudness from a little behind him to ten seconds ahead, a range of hills he runs
// towards, a line of light along their tops, and a mark where he is in it
export function drawSongWave(f) {
  const { g, v, L, t, T, mf } = f,
    env = L.A.env?.rms;
  if (!env) return;
  screen(g, () => {
    const W = v.W,
      H = v.H,
      base = H * 0.64,
      span = 10,
      n = 64;
    g.beginPath();
    g.moveTo(0, H);
    for (let i = 0; i <= n; i++) {
      const x = (i / n) * W,
        tau = t + (i / n - 0.22) * span,
        e = tau < 0 || tau > L.A.dur ? 0 : sampleEnv(env, tau, L.A.fps);
      g.lineTo(x, base - e * H * 0.24);
    }
    g.lineTo(W, H);
    g.closePath();
    g.fillStyle = rgba(T.far, 0.45);
    g.fill();
    g.strokeStyle = rgba(T.line, 0.25 + 0.3 * mf.beat);
    g.lineWidth = 2 * v.dpr;
    g.stroke();
  });
}

// the warp: a turbo act's world streaking past, lines of light flying back across the screen from ahead, thicker on
// the kicks (screen space: the way he runs on screen decides which way they fly)
export function drawWarp(f) {
  const { g, v, L, t, T, mf, heroSeg } = f,
    u = modeAmount(L, t, 'turbo');
  if (u <= 0) return;
  const dir = heroSeg?.st?.dir ?? 1;
  screen(g, () => {
    g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 26; k++) {
      const y = v.H * (((k * 0.6180339) % 1) * 0.9 + 0.03),
        sp = 1.2 + ((k * 0.37) % 1) * 1.8,
        x = (((k * 0.913 + t * sp) % 1) + 1) % 1,
        len = v.W * (0.08 + 0.12 * ((k * 0.53) % 1)) * (1 + 0.6 * mf.kick),
        X = dir > 0 ? v.W * (1 - x) : v.W * x;
      g.strokeStyle = rgba(k % 4 ? T.line : '#ffffff', u * (0.25 + 0.4 * ((k * 0.29) % 1)) * (0.7 + 0.5 * mf.amp));
      g.lineWidth = (2 + 3 * ((k * 0.71) % 1)) * v.dpr;
      g.beginPath();
      g.moveTo(X, y);
      g.lineTo(X + dir * len, y);
      g.stroke();
    }
  });
}

// the tunnel: on the hoverboard's drops, frames of light rushing out of the horizon at the screen, on the beat
export function drawTunnel(f) {
  const { g, v, L, t, T, mf } = f,
    u = modeAmount(L, t, 'ride');
  if (u <= 0) return;
  screen(g, () => {
    const W = v.W,
      H = v.H,
      cx = W * 0.5,
      cy = H * 0.42,
      speed = 0.9 + 0.6 * mf.amp;
    g.globalCompositeOperation = 'lighter';
    g.lineWidth = 2 * v.dpr;
    for (let k = 0; k < 9; k++) {
      const z = (k / 9 + t * speed * 0.25) % 1,
        s = z ** 2.2,
        w = W * 1.3 * s,
        h = H * 1.0 * s;
      g.strokeStyle = rgba(k % 3 ? T.line : T.hold, u * (0.05 + 0.3 * z) * (0.7 + 0.3 * mf.kick));
      g.strokeRect(cx - w / 2, cy - h / 2, w, h);
    }
    g.strokeStyle = rgba(T.line, 0.12 * u);
    g.beginPath();
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * W, cy + Math.sin(a) * W);
    }
    g.stroke();
  });
}
