// The world growing with the song (mf.grow, a step up with each drop, kept): the sky warms toward the song's accent,
// motes of light rise through it, more and more, and from two thirds of the way a great halo turns in the sky,
// pulsing on the kick. Then the voice in the sky: while a voice (or a lead) sings, ribbons of light flow across the sky, as bright as it is
// present and as high as it sings (an aurora of the melody: vocals flow, they never punch; the visualizers' rule).
// Then the world pumps: the backdrop ducks on each kick, as a sidechained mix does.
import { hash, rgba } from '../util.js';

export function evolve(f) {
  const { g, v, mf, T, t } = f,
    k = mf.grow;
  if (k < 0.05) return;
  g.fillStyle = rgba(T.hold, 0.12 * k * (0.7 + 0.3 * mf.bass));
  g.fillRect(-v.W, -v.H, v.W * 3, v.H * 1.6);
  const n = Math.round(60 * k);
  for (let i = 0; i < n; i++) {
    const sp = 0.3 + hash(i, 3),
      X = ((hash(i, 1) * v.W * 1.2 - v.x * v.ppm * 0.08 * sp) % v.W + v.W) % v.W,
      Y = v.H - ((hash(i, 2) * v.H + t * v.ppm * 0.6 * sp) % (v.H * 1.1)),
      r = (1 + 2.5 * hash(i, 4)) * v.dpr * (1 + mf.kick * 0.6);
    g.fillStyle = rgba(T.win[i % 3], (0.25 + 0.5 * mf.hat * 2) * k);
    g.fillRect(X, Y, r, r);
  }
  if (k > 0.6) {
    const a = (k - 0.6) / 0.4,
      X = v.W * 0.5,
      Y = v.H * 0.32,
      R = Math.min(v.W, v.H) * (0.32 + 0.03 * mf.kick);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rgba(T.line, (0.12 + 0.3 * mf.kick) * a);
    g.lineWidth = v.ppm * (0.06 + 0.1 * mf.bass);
    g.setLineDash([v.ppm * 0.6, v.ppm * 0.25]);
    g.lineDashOffset = t * v.ppm * 0.8;
    g.beginPath();
    g.arc(X, Y, R, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
    g.restore();
  }
}

export function drawVoice(f) {
  const { g, v, mf, T, t } = f,
    a = Math.max(mf.voice, 0.12 * mf.grow);
  if (a < 0.04) return;
  const cy = v.H * (0.62 - 0.4 * mf.pitch),
    amp = v.ppm * (0.25 + 0.9 * a),
    drift = v.x * v.ppm * 0.05;
  g.save();
  g.globalCompositeOperation = 'lighter';
  [T.hold, T.slide, T.line].forEach((col, k) => {
    const th = v.ppm * (0.5 + 0.9 * a) * (1 - k * 0.22),
      ph = t * (0.6 + 0.25 * k) + k * 2.1,
      y = X => cy + k * v.ppm * 0.35 + Math.sin((X + drift) / (v.ppm * (2.6 + k)) + ph) * amp + Math.sin((X + drift) / (v.ppm * 1.1) - ph * 1.7) * amp * 0.25;
    const gr = g.createLinearGradient(0, cy - amp - th, 0, cy + amp + th);
    gr.addColorStop(0, rgba(col, 0));
    gr.addColorStop(0.5, rgba(col, 0.28 * a * (1 - k * 0.2)));
    gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr;
    g.beginPath();
    for (let X = -20; X <= v.W + 20; X += 24) g.lineTo(X, y(X) - th);
    for (let X = v.W + 20; X >= -20; X -= 24) g.lineTo(X, y(X) + th * 0.4);
    g.closePath();
    g.fill();
  });
  g.restore();
}

// the backdrop ducking on the kick (a hard song more), before the levels are drawn over it
export function pump(f) {
  const { g, v, mf } = f,
    d = mf.kick * (0.08 + 0.14 * (f.react ?? 0)) * mf.amp;
  if (d < 0.01) return;
  g.fillStyle = `rgba(0,0,0,${d})`;
  g.fillRect(-v.W, -v.H, v.W * 3, v.H * 3);
}

// the sky answering the drums: a bolt of light down to the horizon on each snare (somewhere new each time), on each
// kick of a loud bar a ring spreading from the horizon, on each downbeat of a drop a bar of light sweeping down the sky,
// and the horizon glowing with the bass
export function skyEvents(f) {
  const { g, v, mf, T, t } = f,
    k = Math.min(1, 0.3 + (f.react ?? 0)) * (f.effects ?? 1),
    horizon = v.H * 0.78;
  if (k < 0.05) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  const hg = g.createLinearGradient(0, horizon - v.H * 0.3, 0, horizon);
  hg.addColorStop(0, rgba(T.line, 0));
  hg.addColorStop(1, rgba(T.line, (0.08 + 0.22 * mf.bass) * k * mf.amp));
  g.fillStyle = hg;
  g.fillRect(0, horizon - v.H * 0.3, v.W, v.H * 0.3);
  const ss = t - mf.snareT;
  if (ss >= 0 && ss < 0.2 && mf.snare > 0.3) {
    const a = (1 - ss / 0.2) * k,
      x0 = v.W * (0.15 + 0.7 * hash(Math.round(mf.snareT * 100), 1));
    for (const [w, al] of [
      [0.12, 0.25],
      [0.035, 0.9],
    ]) {
      g.strokeStyle = rgba(T.win[2], al * a);
      g.lineWidth = w * v.ppm;
      g.beginPath();
      let x = x0;
      for (let y = 0; y <= horizon; y += v.H / 12) {
        g.lineTo(x, y);
        x += (hash(Math.round(mf.snareT * 100), y | 0) - 0.5) * v.ppm * 0.9;
      }
      g.stroke();
    }
  }
  const ks = t - mf.kickT;
  if (ks >= 0 && ks < 0.45 && mf.amp >= 0.8) {
    const u = ks / 0.45;
    g.strokeStyle = rgba(T.hold, (1 - u) * 0.35 * k);
    g.lineWidth = (0.05 + 0.1 * (1 - u)) * v.ppm;
    g.beginPath();
    g.ellipse(v.W / 2, horizon, v.W * (0.1 + 0.8 * u), v.H * (0.03 + 0.18 * u), 0, Math.PI, 0);
    g.stroke();
  }
  if (mf.amp >= 1 && mf.down > 0.05) {
    const y = horizon * (1 - mf.down);
    g.fillStyle = rgba(T.line, 0.18 * mf.down * k);
    g.fillRect(0, y, v.W, v.H * 0.012);
  }
  g.restore();
}
