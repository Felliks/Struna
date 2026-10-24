// The Moon (or Mars, in a red song): a black sky with the Earth hanging in it, its city lights pulsing on the kick;
// grey hills far off and crater rims nearer, dust rising slowly off them on the bass (low gravity: it drifts, never
// falls), marker beacons blinking on the hats; landmarks by the song (a base dome with its antennas, a lander on its
// legs, a rover crawling along); regolith underfoot, pocked with small craters, dust puffing up off it.
import { hash, mixHex, rgba } from '../util.js';
import { cells, edge, glow, landmark, row, slab, tint } from './kit.js';

// a red song is on Mars: the regolith, the hills and the dust go rust
const isMars = f => {
  const h = f.look.hue ?? 200;
  return h < 45 || h > 335;
};
// the plain the background stands on, raised over the horizon so it shows above his roof (metres)
const LIFT = 2.2;
const SOIL = f => (isMars(f) ? ['#7a3a24', '#a8583a', '#e8a070'] : ['#4a4a50', '#8a8a90', '#d8d8dc']);

// dust drifting up slowly from (X, Y) on the bass, a puff per cell
function dust(f, X, Y, i, col) {
  const { g, v, mf, t } = f,
    m = v.ppm;
  for (let n = 0; n < 3; n++) {
    const ph = (t * 0.18 + hash(i, n + 40)) % 1,
      a = (0.05 + 0.3 * mf.bass) * (1 - ph);
    if (a < 0.03) continue;
    g.fillStyle = rgba(col, a);
    g.beginPath();
    g.arc(X + (n - 1) * 0.5 * m + Math.sin(t * 0.5 + n + i) * 0.3 * m, Y - ph * 2.2 * m, (0.1 + 0.35 * ph) * m, 0, Math.PI * 2);
    g.fill();
  }
}

export const LANDMARKS = {
  // a base dome: its ring of windows lit on the kick, antennas with their beacons on the hats
  dome(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.14, 32, 0.85, 1, (X, b0) => {
      const m = v.ppm,
        base = b0 - LIFT * m;
      g.fillStyle = mixHex(T.far, '#c9ccd2', 0.25);
      g.beginPath();
      g.ellipse(X, base, 4 * m, 3 * m, 0, Math.PI, 0);
      g.fill();
      g.fillRect(X + 3.6 * m, base - 1.2 * m, 3 * m, 1.2 * m);
      for (let k = 0; k < 7; k++) {
        const a = Math.PI + ((k + 0.5) / 7) * Math.PI;
        g.fillStyle = rgba(T.win[k % 3], k / 7 < 0.3 + mf.stage ? 0.35 + 0.6 * mf.kick : 0.12);
        g.fillRect(X + Math.cos(a) * 3.2 * m - 0.15 * m, base + Math.sin(a) * 2.2 * m, 0.3 * m, 0.2 * m);
      }
      g.fillStyle = mixHex(T.far, '#c9ccd2', 0.25);
      for (const [ax, ah] of [[-1.2, 5.5], [0.8, 4.4], [5, 3]]) {
        g.fillRect(X + ax * m, base - ah * m, 0.08 * m, ah * m);
        glow(g, X + ax * m, base - ah * m, (0.3 + 0.3 * mf.hat) * m, '#ff3b4f', 0.25 + 0.75 * Math.min(1, mf.hat * 2.5));
      }
    });
  },
  // a lander on four legs, gold-foiled, its lamp on the beat, its engine glowing on the drop
  lander(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.2, 40, 0.8, 2, (X, b0) => {
      const m = v.ppm,
        base = b0 - LIFT * m;
      g.strokeStyle = mixHex(T.far, '#c9ccd2', 0.3);
      g.lineWidth = 0.12 * m;
      g.beginPath();
      for (const s of [-1, 1]) {
        g.moveTo(X + s * 0.9 * m, base - 2 * m);
        g.lineTo(X + s * 2 * m, base);
      }
      g.stroke();
      g.fillStyle = mixHex('#b08a2a', T.far, 0.4);
      g.fillRect(X - 1.2 * m, base - 2.6 * m, 2.4 * m, 1 * m);
      g.fillStyle = mixHex(T.far, '#d8d8dc', 0.35);
      g.beginPath();
      g.moveTo(X - 0.9 * m, base - 2.6 * m);
      g.lineTo(X - 0.6 * m, base - 3.8 * m);
      g.lineTo(X + 0.7 * m, base - 3.8 * m);
      g.lineTo(X + 0.9 * m, base - 2.6 * m);
      g.fill();
      glow(g, X + 0.5 * m, base - 3.8 * m, (0.3 + 0.4 * mf.beat) * m, T.line, 0.3 + 0.6 * mf.beat);
      glow(g, X, base - 1.4 * m, (0.8 + 1.5 * mf.drop) * m, '#ffb347', 0.1 + 0.6 * mf.drop);
    });
  },
  // a rover crawling along, its wheels turning, its headlight on the kick
  rover(f) {
    const { g, v, mf, T, t } = f;
    landmark(f, 0.34, 24, 0.8, 3, (X0, b0) => {
      const m = v.ppm,
        base = b0 - LIFT * m,
        X = X0 + (((t * 0.8) % 12) - 6) * m;
      g.fillStyle = mixHex(T.near, '#c9ccd2', 0.35);
      g.fillRect(X - 1 * m, base - 1 * m, 2 * m, 0.45 * m);
      g.fillRect(X + 0.4 * m, base - 1.8 * m, 0.06 * m, 0.8 * m);
      g.strokeStyle = '#1a1a1e';
      g.lineWidth = 0.08 * m;
      for (const wx of [-0.75, 0, 0.75]) {
        g.fillStyle = '#2a2a30';
        g.beginPath();
        g.arc(X + wx * m, base - 0.3 * m, 0.3 * m, 0, Math.PI * 2);
        g.fill();
        const a = t * 2.7;
        g.beginPath();
        g.moveTo(X + wx * m - Math.cos(a) * 0.28 * m, base - 0.3 * m - Math.sin(a) * 0.28 * m);
        g.lineTo(X + wx * m + Math.cos(a) * 0.28 * m, base - 0.3 * m + Math.sin(a) * 0.28 * m);
        g.stroke();
      }
      glow(g, X + 1.05 * m, base - 0.8 * m, (0.3 + 0.6 * mf.kick) * m, '#fff6d8', 0.3 + 0.6 * mf.kick);
      glow(g, X + 0.43 * m, base - 1.8 * m, 0.25 * m, '#ff3b4f', 0.2 + 0.8 * Math.min(1, mf.hat * 2.5));
      dust(f, X - 1.1 * m, base - 0.1 * m, 7, SOIL(f)[2]);
    });
  },
};

// the far rows: grey hills, rolling
function far(f) {
  const { g, v, T } = f,
    soil = SOIL(f);
  // far grey hills, rolling
  const h = row(f, 0.1);
  g.fillStyle = tint(f, soil[1], T.far, 0.55);
  g.beginPath();
  // (across the row's frame, its screen's edges and bottom in it: kit.js row)
  g.moveTo(h.L - v.W, h.B);
  for (let X = h.L - 20; X < h.R + 40; X += 16) {
    const x = h.x(X);
    g.lineTo(X, h.base - (LIFT + 1.2 + 0.8 * Math.sin(x * 0.12) + 0.4 * Math.sin(x * 0.31)) * v.ppm);
  }
  g.lineTo(h.R + v.W, h.B);
  g.fill();
}
// the near rows: the crater rims, dust drifting up off them, the marker beacons
function near(f) {
  const { g, v, mf, T } = f,
    soil = SOIL(f);
  // nearer crater rims, dust drifting up off them, marker beacons on the hats
  const r = row(f, 0.3),
    top = r.base - LIFT * v.ppm;
  g.fillStyle = tint(f, soil[0], T.near, 0.4);
  g.fillRect(r.L - v.W, top, r.R - r.L + 2 * v.W, r.B - top);
  cells(r, 6, (i, X, u) => {
    const w = (3 + 3 * u) * v.ppm,
      hh = (0.6 + 0.8 * hash(i, 2)) * v.ppm;
    g.fillStyle = tint(f, soil[1], T.near, 0.45);
    g.beginPath();
    g.ellipse(X, top, w / 2, hh, 0, Math.PI, 0);
    g.fill();
    // its rim lit by the Earth on one side
    g.strokeStyle = rgba(soil[2], 0.35);
    g.lineWidth = 1.5 * v.dpr;
    g.beginPath();
    g.ellipse(X, top, w / 2, hh, 0, Math.PI * 1.15, Math.PI * 1.7);
    g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath();
    g.ellipse(X, top - hh * 0.55, w * 0.35, hh * 0.25, 0, 0, Math.PI * 2);
    g.fill();
    dust(f, X, top - hh * 0.6, i, soil[2]);
    if (hash(i, 8) < 0.35) {
      g.fillStyle = tint(f, '#9aa0a8', T.near, 0.4);
      g.fillRect(X + w / 2, top - 1.4 * v.ppm, 2 * v.dpr, 1.4 * v.ppm);
      glow(g, X + w / 2, top - 1.4 * v.ppm, 0.3 * v.ppm, hash(i, 9) < 0.5 ? '#ff3b4f' : T.slide, 0.2 + 0.8 * Math.min(1, mf.hat * 2.5));
    }
  });
}
// what stands after the near rows: the rover (when the place has it), nearer than the craters
function after(f) {
  if (f.look.landmarks.includes('rover')) LANDMARKS.rover(f);
}

export default {
  // (its landmarks drawn over its rows, by after(): a world does not draw them again as its own)
  late: ['rover'],
  // a black sky whatever the hour, a few fixed stars, and the Earth (from Mars: a far blue dot)
  sky(f) {
    const { g, v, mf, T, t } = f,
      mars = isMars(f);
    g.fillStyle = rgba(mars ? '#1a0806' : '#000004', 0.78);
    g.fillRect(-v.W, -v.H, v.W * 3, v.H * 3);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = rgba('#ffffff', 0.25 + 0.5 * hash(i, 9));
      g.fillRect(hash(i, 1) * v.W, hash(i, 2) * v.H * 0.7, v.dpr * 1.5, v.dpr * 1.5);
    }
    const X = v.W * 0.72,
      Y = v.H * 0.24,
      r = v.H * (mars ? 0.012 : 0.085) * (1 + 0.04 * mf.bass);
    glow(g, X, Y, r * 2.4, '#6ab0ff', 0.25 + 0.2 * mf.kick);
    g.save();
    g.beginPath();
    g.arc(X, Y, r, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = '#2a5ab0';
    g.fillRect(X - r, Y - r, r * 2, r * 2);
    // continents turning slowly past, clouds over them
    for (let i = 0; i < 6; i++) {
      const cx = X - r + ((((hash(i, 3) + t * 0.01) % 1) + 1) % 1) * 2.6 * r - 0.3 * r,
        cy = Y + (hash(i, 4) - 0.5) * 1.4 * r;
      g.fillStyle = i % 3 ? '#4a8a4a' : '#9a8a5a';
      g.beginPath();
      g.ellipse(cx, cy, (0.25 + 0.3 * hash(i, 5)) * r, (0.15 + 0.2 * hash(i, 6)) * r, i, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(X - r, Y - 0.55 * r, 2 * r, 0.08 * r);
    g.fillRect(X - r, Y + 0.3 * r, 2 * r, 0.06 * r);
    // its night side, the cities lit on the kick
    const sh = g.createLinearGradient(X - r, 0, X + r, 0);
    sh.addColorStop(0, 'rgba(0,0,8,0.9)');
    sh.addColorStop(0.45, 'rgba(0,0,8,0.85)');
    sh.addColorStop(0.62, 'rgba(0,0,8,0)');
    g.fillStyle = sh;
    g.fillRect(X - r, Y - r, r * 2, r * 2);
    if (!mars)
      for (let i = 0; i < 24; i++) {
        g.fillStyle = rgba(T.win[i % 3], (0.25 + 0.75 * mf.kick) * (i / 24 < 0.4 + 0.6 * mf.stage ? 1 : 0.2));
        g.fillRect(X - r * (0.15 + 0.75 * hash(i, 7)), Y + (hash(i, 8) - 0.5) * 1.5 * r, 0.04 * r, 0.04 * r);
      }
    g.restore();
  },
  back(f) {
    far(f);
    // the base and the lander out on the plain; the rover nearer, after the craters
    for (const l of f.look.landmarks) if (l !== 'rover') LANDMARKS[l]?.(f);
    near(f);
    after(f);
  },
  far,
  near,
  after,
  ground(f, a, b, y) {
    const { g, v, mf, T, t } = f,
      soil = SOIL(f),
      s = slab(f, a, b, y, tint(f, soil[0], T.near, 0.3), tint(f, soil[1], T.far, 0.2));
    if (!s) return;
    // rock under the regolith, pebbles in it
    for (let k = 0; k < 4; k++) {
      g.fillStyle = tint(f, k % 2 ? soil[0] : soil[1], T.near, 0.55);
      g.fillRect(s.X0, s.Y + (0.5 + k * 0.8) * v.ppm, s.X1 - s.X0, 0.18 * v.ppm);
    }
    for (let k = Math.floor(s.a / 0.9); k < s.b / 0.9; k++) {
      const u = hash(k, 71);
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.beginPath();
      g.arc(v.sx(k * 0.9 + u * 0.6), s.Y + (0.4 + u * 3) * v.ppm, (0.05 + 0.08 * hash(k, 72)) * v.ppm, 0, Math.PI * 2);
      g.fill();
      // small craters on the top, their rims lit
      if (u < 0.3) {
        const X = v.sx(k * 0.9),
          w = (0.25 + u) * v.ppm;
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(X, s.Y + 0.02 * v.ppm, w, 0.08 * v.ppm);
        g.fillStyle = rgba(soil[2], 0.3);
        g.fillRect(X - 0.05 * v.ppm, s.Y - 0.02 * v.ppm, w + 0.1 * v.ppm, 0.03 * v.ppm);
      }
    }
    // dust puffing up off the regolith on the bass, drifting slowly
    for (let k = Math.floor(s.a / 1.6); k < s.b / 1.6; k++) if (hash(k, 73) < 0.4) dust(f, v.sx(k * 1.6 + 0.8), s.Y, k, soil[2]);
    // marker lights along the edge, blinking in turn on the hats
    const step = Math.floor(t * 4) % 3;
    for (let k = Math.ceil(s.a / 2); k < s.b / 2; k++)
      glow(g, v.sx(k * 2), s.Y + 0.3 * v.ppm, 0.12 * v.ppm, T.slide, ((k % 3) + 3) % 3 === step ? 0.4 + 0.6 * Math.min(1, mf.hat * 2.5) : 0.15);
    edge(f, s, isMars(f) ? '#ff9a5a' : '#c9d8ff');
  },
};
