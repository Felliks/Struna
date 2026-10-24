// The orbital station: a ringed planet in the song's colours whose ring pulses with the bass, modules and antennas
// with lamps on the beat; landmarks by the song (a dish turning toward the beat, a habitat ring, drifting asteroids);
// a metal deck with a light strip running along it on the beat(The stars are the weather's.)
import { hash, rgba } from '../util.js';
import { cells, edge, glow, landmark, row, slab, tint } from './kit.js';

export const LANDMARKS = {
  dish(f) {
    const { g, v, mf, T, t } = f;
    landmark(f, 0.2, 20, 0.6, 1, (X, base) => {
      const m = v.ppm,
        a = -0.6 + 0.3 * Math.sin(t * 0.5) + 0.15 * mf.beat;
      g.fillStyle = tint(f, '#2a3346');
      g.fillRect(X - 0.1 * m, base - 3 * m, 0.2 * m, 3 * m);
      g.save();
      g.translate(X, base - 3 * m);
      g.rotate(a);
      g.beginPath();
      g.ellipse(0, 0, 1.4 * m, 0.5 * m, 0, 0, Math.PI);
      g.fill();
      g.restore();
      glow(g, X, base - 3 * m, 0.4 * m, T.slide, 0.3 + 0.6 * mf.kick);
    });
  },
  ring(f) {
    const { g, v, mf, T, t } = f;
    landmark(f, 0.05, 60, 0.8, 2, (X, base) => {
      const m = v.ppm;
      g.strokeStyle = tint(f, '#3a4560', T.far);
      g.lineWidth = 0.6 * m;
      g.beginPath();
      g.ellipse(X, base - 7 * m, 6 * m, 2 * m, 0.2, 0, Math.PI * 2);
      g.stroke();
      for (let k = 0; k < 8; k++) {
        const a = t * 0.2 + (k * Math.PI) / 4;
        glow(g, X + Math.cos(a) * 6 * m, base - 7 * m + Math.sin(a) * 2 * m, 0.25 * m, T.win[k % 3], k / 8 < mf.stage ? 0.4 + 0.5 * mf.hat * 2 : 0.1);
      }
    });
  },
  asteroids(f) {
    const { g, v, t, T } = f;
    landmark(f, 0.06, 8, 0.5, 3, (X, base, i) => {
      const m = v.ppm,
        y = base - (5 + hash(i, 9) * 6) * m + Math.sin(t * 0.4 + i) * 0.3 * m;
      g.fillStyle = T.far;
      g.beginPath();
      g.ellipse(X, y, (0.4 + hash(i, 2)) * m, (0.3 + hash(i, 3) * 0.6) * m, i, 0, Math.PI * 2);
      g.fill();
    });
  },
};

// (the station's only row, so it is the far one: modules with antennas, their lamps on the beat)
function far(f) {
  const { g, v, mf, T } = f,
    r = row(f, 0.3);
  cells(r, 3.5, (i, X, u) => {
    if (u > 0.4 + 0.4 * f.look.density) return;
    const h = (1.5 + u * 3) * v.ppm,
      w = (1.2 + u) * v.ppm;
    g.fillStyle = tint(f, '#121a2c');
    g.fillRect(X, r.base - h, w, h);
    g.fillStyle = tint(f, '#1c2840');
    g.fillRect(X - 0.2 * v.ppm, r.base - h * 0.6, w + 0.4 * v.ppm, 0.15 * v.ppm);
    // the antenna and its lamp on the beat
    g.fillRect(X + w / 2, r.base - h - 1.2 * v.ppm, 2 * v.dpr, 1.2 * v.ppm);
    glow(g, X + w / 2, r.base - h - 1.2 * v.ppm, 0.3 * v.ppm, '#ff3b4f', 0.3 + 0.7 * mf.beat);
    for (let k = 0; k < 3; k++) {
      g.fillStyle = rgba(T.win[k % 3], hash(i, k) < 0.5 ? 0.3 + 0.7 * mf.kick : 0.15);
      g.fillRect(X + w * 0.2, r.base - h * (0.3 + k * 0.2), w * 0.6, 0.08 * v.ppm);
    }
  });
}

// (no nearer row of its own: the deck is all there is in front of the modules)
function near() {}

export default {
  sky(f) {
    const { g, v, mf, T } = f,
      X = v.W * 0.7,
      Y = v.H * 0.3,
      r = v.ppm * 1.4;
    glow(g, X, Y, r * 2.2, T.slide, 0.25);
    g.fillStyle = T.far;
    g.beginPath();
    g.arc(X, Y, r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = rgba(T.slide, 0.4 + 0.5 * mf.bass);
    g.lineWidth = (2 + 4 * mf.bass) * v.dpr;
    g.beginPath();
    g.ellipse(X, Y, r * 1.8, r * 0.4, -0.3, 0, Math.PI * 2);
    g.stroke();
  },
  far,
  near,
  back(f) {
    for (const l of f.look.landmarks) LANDMARKS[l]?.(f);
    far(f);
    near(f);
  },
  ground(f, a, b, y) {
    const { g, v, mf, T, t, L } = f,
      s = slab(f, a, b, y, tint(f, '#1a2133'), tint(f, '#3a4560', f.T.far, 0.3));
    if (!s) return;
    // deck plates, and a light strip whose dots run along on the beat
    g.strokeStyle = 'rgba(0,0,0,0.5)';
    g.lineWidth = v.dpr;
    g.beginPath();
    for (let x = Math.ceil(s.a / 1.2) * 1.2; x < s.b; x += 1.2) {
      g.moveTo(v.sx(x), s.Y);
      g.lineTo(v.sx(x), s.Y + 3 * v.ppm);
    }
    g.stroke();
    const step = Math.floor((t / L.A.beat) * 2) % 4;
    for (let x = Math.ceil(s.a / 0.4) * 0.4, k = Math.ceil(s.a / 0.4); x < s.b; x += 0.4, k++) {
      const on = ((k % 4) + 4) % 4 === step;
      g.fillStyle = rgba(T.slide, on ? 0.6 + 0.4 * mf.beat : 0.15);
      g.fillRect(v.sx(x), s.Y + 0.45 * v.ppm, 0.15 * v.ppm, 0.08 * v.ppm);
    }
    edge(f, s, T.slide);
  },
};
