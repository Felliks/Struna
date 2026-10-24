// The synthwave road: a striped sun breathing with the bass (a grid moon by night), wireframe mountains whose lines
// flare on the kick; landmarks by the song (palms swaying with the bass, a neon pyramid, a wireframe skyline); a road
// of grid lines scrolling under him, its rows lighting up on the beat, more of them as the song grows.
import { hash, rgba } from '../util.js';
import { celestial, cells, edge, landmark, row, slab, tint } from './kit.js';
import { lean } from '../physics.js';

export const LANDMARKS = {
  palms(f) {
    const { g, v, T, t } = f;
    landmark(f, 0.35, 6, 0.55, 1, (X, base, i) => {
      const m = v.ppm,
        h = 3.2 * m,
        // (each crown swaying on its own and leant by the world's wind, the bass's swell in it: physics.js)
        sway = (Math.sin(t * 1.3 + i) * 0.1 + 0.2 * lean(f, i * 6)) * m;
      g.strokeStyle = T.near;
      g.lineWidth = 0.15 * m;
      g.beginPath();
      g.moveTo(X, base);
      g.quadraticCurveTo(X + 0.3 * m, base - h / 2, X + sway, base - h);
      g.stroke();
      g.lineWidth = 0.08 * m;
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k - 2) * 0.55;
        g.beginPath();
        g.moveTo(X + sway, base - h);
        g.quadraticCurveTo(X + sway + Math.cos(a) * 0.8 * m, base - h + Math.sin(a) * 0.5 * m, X + sway + Math.cos(a) * 1.4 * m, base - h + 0.5 * m);
        g.stroke();
      }
    });
  },
  pyramid(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.07, 50, 0.7, 2, (X, base) => {
      const m = v.ppm;
      g.fillStyle = T.far;
      g.beginPath();
      g.moveTo(X - 5 * m, base);
      g.lineTo(X, base - 6 * m);
      g.lineTo(X + 5 * m, base);
      g.fill();
      g.strokeStyle = rgba(T.line, 0.4 + 0.6 * mf.kick * mf.amp);
      g.lineWidth = (1.5 + 2 * mf.kick) * v.dpr;
      g.stroke();
    });
  },
  skyline(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.1, 3, 0.8, 3, (X, base, i) => {
      const m = v.ppm,
        h = (2 + hash(i, 4) * 5) * m;
      g.strokeStyle = rgba(T.hold, 0.2 + 0.4 * mf.stage + 0.3 * mf.beat);
      g.lineWidth = v.dpr;
      g.strokeRect(X, base - h, 1.8 * m, h);
    });
  },
};

// (a row of wireframe mountains: filled triangles, their rims and contour lines flaring on the kick)
function mountains(f, par, hmul, col) {
  const { g, v, mf, T } = f,
    r = row(f, par);
  cells(r, 4, (i, X, u) => {
    const h = (2.5 + u * 5) * hmul * v.ppm,
      w = 4 * v.ppm;
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(X - w * 0.3, r.base);
    g.lineTo(X + w * 0.5, r.base - h);
    g.lineTo(X + w * 1.3, r.base);
    g.closePath();
    g.fill();
    g.strokeStyle = rgba(T.hold, 0.2 + 0.6 * mf.kick * (par > 0.2 ? 1 : 0.6) * (0.4 + 0.6 * mf.stage));
    g.lineWidth = v.dpr * (1 + mf.kick);
    g.stroke();
    for (let k = 1; k < 4; k++) {
      const yy = r.base - (h * k) / 4;
      g.beginPath();
      g.moveTo(X - w * 0.3 + (w * 0.8 * k) / 4, yy);
      g.lineTo(X + w * 1.3 - (w * 0.8 * k) / 4, yy);
      g.stroke();
    }
  });
  return r;
}

// (the far range: tall pale wireframe peaks)
function far(f) {
  return mountains(f, 0.12, 1, f.T.far);
}

// (the near range: lower darker peaks whose lines flare harder on the kick)
function near(f) {
  return mountains(f, 0.3, 0.6, f.T.near);
}

export default {
  sky(f) {
    const { mf, T } = f;
    celestial(f, (g, X, Y, r, moon) => {
      const sg = g.createLinearGradient(0, Y - r, 0, Y + r);
      sg.addColorStop(0, moon ? '#d8e4ff' : T.jump);
      sg.addColorStop(1, moon ? T.slide : T.hold);
      g.fillStyle = sg;
      g.beginPath();
      g.arc(X, Y, r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = T.sky[1];
      for (let i = 0; i < 6; i++) g.fillRect(X - r, Y + r * (0.05 + i * 0.16), r * 2, r * (0.03 + i * 0.022) * (1 + mf.bass));
    });
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
      s = slab(f, a, b, y, tint(f, '#0b0218'), rgba(T.hold, 0.12));
    if (!s) return;
    const rows = 2 + Math.round(4 * mf.stage),
      row0 = Math.floor(t / L.A.beat) % 6;
    for (let k = 0; k < 6; k++) {
      const Y = s.Y + (0.35 + k * k * 0.12) * v.ppm,
        lit = k === row0 && k < rows;
      g.fillStyle = rgba(lit ? T.line : T.hold, lit ? 0.5 + 0.5 * mf.beat : 0.2);
      g.fillRect(s.X0, Y, s.X1 - s.X0, v.dpr * (lit ? 3 : 1.5));
    }
    g.strokeStyle = rgba(T.hold, 0.35);
    g.lineWidth = v.dpr * 1.5;
    g.beginPath();
    for (let x = Math.ceil(s.a / 0.8) * 0.8; x < s.b; x += 0.8) {
      g.moveTo(v.sx(x), s.Y);
      g.lineTo(v.sx(x + (x - v.x - v.vw / 2) * 0.6), s.Y + 4 * v.ppm);
    }
    g.stroke();
    edge(f, s, T.hold);
  },
};
