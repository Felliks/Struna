// The mall: an eighties vaporwave megamall, its pastel floors in tiers far off whose neon rails pulse on the kick, shop
// fronts with abstract neon shapes each lit by its own sound, potted palms swaying with the bass and marble busts whose
// eyes glint on the hats; landmarks by the song (a skylight dome lit ring by ring on the beat, escalators whose steps
// ride up with the tempo, a fountain whose jets leap on the kick); a checkerboard floor whose tiles light up on the beat.
import { clamp, hash, rgba } from '../util.js';
import { celestial, cells, edge, glow, landmark, row, slab, tint } from './kit.js';

const PINK = '#ff9ad5',
  TEAL = '#5ae0d0',
  LILAC = '#b89aff',
  MARBLE = '#ece4ee',
  SPRAY = '#c8fff4',
  // (how high the near gallery's floor stands over the row's base, so it is seen over the roof he runs on)
  GALLERY = 3.2;

export const LANDMARKS = {
  // the skylight dome on its drum: glass ribs, its rings lit one a beat, a lantern on top flaring on the kick
  dome(f) {
    const { g, v, mf, T, t, L } = f,
      lit = Math.floor(t / L.A.beat) % 4;
    landmark(f, 0.06, 55, 0.75, 1, (X, base) => {
      const m = v.ppm,
        top = base - 6.5 * m;
      g.fillStyle = tint(f, LILAC, T.far, 0.7);
      g.fillRect(X - 5.5 * m, top, 11 * m, 6.5 * m);
      g.fillStyle = rgba(PINK, 0.2 + 0.5 * mf.kick);
      g.fillRect(X - 5.5 * m, top, 11 * m, 0.12 * m);
      g.fillStyle = rgba(TEAL, 0.14 + 0.1 * mf.bass);
      g.beginPath();
      g.ellipse(X, top, 5 * m, 4 * m, 0, Math.PI, 0);
      g.fill();
      // (its glass in four bands, one lit a beat)
      g.save();
      g.clip();
      g.fillStyle = rgba(PINK, 0.25 + 0.5 * mf.beat);
      g.fillRect(X - 5 * m, top - (lit + 1) * m, 10 * m, m);
      g.restore();
      g.strokeStyle = rgba(MARBLE, 0.5);
      g.lineWidth = 1.5 * v.dpr;
      g.beginPath();
      for (let k = 1; k < 5; k++) g.ellipse(X, top, (5 * m * k) / 5, 4 * m, 0, Math.PI, 0);
      g.stroke();
      g.fillStyle = T.far;
      g.fillRect(X - 0.4 * m, top - 4.8 * m, 0.8 * m, 0.9 * m);
      glow(g, X, top - 4.4 * m, (0.6 + 1.2 * mf.kick) * m, PINK, 0.3 + 0.6 * mf.kick * mf.amp);
    });
  },
  // escalators crossing between floors, their steps riding up a step a beat, the handrails lit on the hats
  escalators(f) {
    const { g, v, mf, T, t, L } = f,
      ph = (t / L.A.beat) % 1;
    landmark(f, 0.2, 22, 0.6, 2, (X, base) => {
      const m = v.ppm;
      for (const [dir, b0] of [
        [1, 0],
        [-1, 4.5],
      ]) {
        const x0 = X - dir * 3 * m,
          y0 = base - b0 * m,
          x1 = X + dir * 3 * m,
          y1 = y0 - 4.5 * m;
        g.fillStyle = T.far;
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.lineTo(x1, y1 + 0.8 * m);
        g.lineTo(x0, y0 + 0.8 * m);
        g.fill();
        for (let j = 0; j < 12; j++) {
          const u = (j + ph) / 12;
          g.fillStyle = rgba(T.win[j % 3], 0.25 + 0.45 * mf.beat);
          g.fillRect(x0 + (x1 - x0) * u - 0.12 * m, y0 + (y1 - y0) * u - 0.1 * m, 0.24 * m, 0.08 * m);
        }
        g.strokeStyle = rgba(dir > 0 ? PINK : TEAL, 0.35 + 0.6 * clamp(mf.hat * 2.5, 0, 1));
        g.lineWidth = 2 * v.dpr;
        g.beginPath();
        g.moveTo(x0, y0 - 0.9 * m);
        g.lineTo(x1, y1 - 0.9 * m);
        g.stroke();
      }
    });
  },
  // a fountain on the gallery: a marble basin and bowl, its jets leaping on the kick and swelling with the bass, spray
  // glittering (drawn over the gallery, so it stands on its floor)
  fountain(f) {
    const { g, v, mf, T, t } = f;
    landmark(f, 0.45, 16, 0.55, 3, (X, floor) => {
      const m = v.ppm,
        base = floor - GALLERY * m,
        h = (1 + 2.5 * mf.kick * mf.amp + 0.8 * mf.bass) * m;
      glow(g, X, base - 1.2 * m, (1.5 + mf.bass) * m, TEAL, 0.15 + 0.3 * mf.bass);
      g.strokeStyle = rgba(SPRAY, 0.45 + 0.45 * mf.kick);
      g.lineWidth = 2.5 * v.dpr;
      g.beginPath();
      for (let k = -2; k <= 2; k++) {
        g.moveTo(X, base - 1.5 * m);
        g.quadraticCurveTo(
          X + k * 0.5 * m,
          base - 1.5 * m - h * (1.2 - Math.abs(k) * 0.2),
          X + k * 1.1 * m,
          base - 0.7 * m,
        );
      }
      g.stroke();
      for (let k = 0; k < 8; k++) {
        const u = hash(k, Math.floor(t * 12));
        g.fillStyle = rgba('#ffffff', clamp(mf.hat * 2.5, 0, 1) * u);
        g.fillRect(X + (u - 0.5) * 2.4 * m, base - 0.8 * m - hash(k, 3) * h, 2 * v.dpr, 2 * v.dpr);
      }
      g.fillStyle = tint(f, MARBLE, T.far, 0.5);
      g.fillRect(X - 0.1 * m, base - 1.5 * m, 0.2 * m, 1 * m);
      g.beginPath();
      g.ellipse(X, base - 1.5 * m, 0.6 * m, 0.15 * m, 0, 0, Math.PI);
      g.fill();
      g.fillRect(X - 1.6 * m, base - 0.7 * m, 3.2 * m, 0.7 * m);
      g.fillStyle = rgba(SPRAY, 0.3 + 0.3 * mf.bass);
      g.fillRect(X - 1.5 * m, base - 0.7 * m, 3 * m, 0.08 * m);
    });
  },
};

// the mall's floors in tiers far off, a neon rail along each balcony beating on the kick (more of them as the song grows)
function tiers(f) {
  const { g, v, mf, T } = f,
    r = row(f, 0.12);
  cells(r, 6, (i, X, u) => {
    const floors = 2 + Math.floor(u * 2),
      w = 6 * v.ppm;
    g.fillStyle = T.far;
    g.fillRect(X, r.base - floors * 2.4 * v.ppm, w * 0.95, floors * 2.4 * v.ppm);
    for (let k = 0; k < floors; k++) {
      const Y = r.base - (k + 1) * 2.4 * v.ppm,
        on = hash(i, k + 9) < 0.35 + 0.6 * mf.stage;
      g.fillStyle = rgba(k % 2 ? TEAL : PINK, on ? 0.25 + 0.65 * mf.kick : 0.12);
      g.fillRect(X, Y + 0.5 * v.ppm, w * 0.95, 0.1 * v.ppm);
      g.fillStyle = rgba(T.win[(((i + k) % 3) + 3) % 3], 0.1 + 0.15 * mf.beat);
      for (let s = 0; s < 4; s++) g.fillRect(X + (s * 1.45 + 0.25) * v.ppm, Y + 0.9 * v.ppm, 1.0 * v.ppm, 1.2 * v.ppm);
    }
  });
}
// shop fronts, each with a neon shape of its own lit by its own sound: a ring on the kick, a triangle on the snare, a
// zigzag on the hats, a wave on the bass
function shops(f) {
  const { g, v, mf, T, t } = f,
    r = row(f, 0.3),
    m = v.ppm;
  cells(r, 5, (i, X, u) => {
    if (u > 0.8) return;
    const top = r.base - 6.4 * m,
      kind = Math.floor(u * 5) % 4,
      e = clamp([mf.kick, mf.snare, mf.hat * 2.5, mf.bass][kind], 0, 1),
      col = [PINK, TEAL, LILAC, '#ffe08a'][(kind + i) & 3];
    // (a fascia over a glass front between two pillars: the floors far off seen through it)
    g.fillStyle = T.far;
    g.fillRect(X, top, 3.6 * m, 1.3 * m);
    g.fillRect(X, top, 0.25 * m, 6.4 * m);
    g.fillRect(X + 3.35 * m, top, 0.25 * m, 6.4 * m);
    for (let s = 0; s < 5; s++) {
      g.fillStyle = s % 2 ? rgba(col, 0.6) : rgba(MARBLE, 0.5);
      g.fillRect(X + 0.25 * m + s * 0.62 * m, top + 1.3 * m, 0.62 * m, 0.26 * m);
    }
    g.fillStyle = rgba(col, 0.08 + 0.14 * e);
    g.fillRect(X + 0.25 * m, top + 1.56 * m, 3.1 * m, 4.84 * m);
    const cx = X + 1.8 * m,
      cy = top + 0.65 * m;
    g.strokeStyle = rgba(col, 0.3 + 0.7 * e);
    g.lineWidth = (2 + 2 * e) * v.dpr;
    g.beginPath();
    if (kind === 0) g.arc(cx, cy, (0.4 + 0.08 * e) * m, 0, Math.PI * 2);
    else if (kind === 1) {
      g.moveTo(cx - 0.5 * m, cy + 0.42 * m);
      g.lineTo(cx, cy - 0.42 * m);
      g.lineTo(cx + 0.5 * m, cy + 0.42 * m);
      g.closePath();
    } else
      for (let k = 0; k <= 8; k++) {
        const x = cx + (k / 8 - 0.5) * 1.4 * m,
          y = kind === 2 ? cy + (k % 2 ? -0.25 : 0.25) * m : cy + Math.sin(k * 0.9 + t * 4) * (0.1 + 0.25 * e) * m;
        k ? g.lineTo(x, y) : g.moveTo(x, y);
      }
    g.stroke();
  });
}
// the hall nearest: a gallery's marble balustrade, its rail lit on the kick, with potted palms on it swaying with the
// bass and marble busts on plinths whose eyes glint on the hats
function decor(f) {
  const { g, v, mf, T, t } = f,
    r = row(f, 0.45),
    m = v.ppm,
    stone = tint(f, MARBLE, T.near, 0.35),
    hat = clamp(mf.hat * 2.5, 0, 1),
    base = r.base - GALLERY * m;
  g.fillStyle = T.near;
  g.fillRect(r.L, base, r.R - r.L, GALLERY * m + v.H);
  g.fillStyle = stone;
  g.fillRect(r.L, base - 0.9 * m, r.R - r.L, 0.12 * m);
  g.fillRect(r.L, base - 0.1 * m, r.R - r.L, 0.1 * m);
  cells(r, 0.4, (i, X) => g.fillRect(X + 0.12 * m, base - 0.8 * m, 0.14 * m, 0.7 * m));
  g.fillStyle = rgba(TEAL, 0.25 + 0.6 * mf.kick * mf.amp);
  g.fillRect(r.L, base - 0.95 * m, r.R - r.L, 0.05 * m);
  // (and its fascia's lights below, chasing on the beat)
  const lit = Math.floor(t / f.L.A.beat) % 6;
  cells(r, 1.2, (i, X) => {
    g.fillStyle = rgba(
      ((i % 6) + 6) % 6 === lit ? PINK : LILAC,
      ((i % 6) + 6) % 6 === lit ? 0.5 + 0.5 * mf.beat : 0.15,
    );
    g.fillRect(X + 0.3 * m, base + 0.35 * m, 0.6 * m, 0.08 * m);
  });
  cells(r, 3.5, (i, X, u) => {
    if (u < 0.3) {
      const sway = Math.sin(t * 1.4 + i) * (0.08 + 0.3 * mf.bass) * m,
        h = 3.4 * m;
      g.fillStyle = stone;
      g.fillRect(X - 0.5 * m, base - 1.0 * m, 1.0 * m, 1.0 * m);
      g.fillStyle = rgba(PINK, 0.3 + 0.4 * mf.beat);
      g.fillRect(X - 0.5 * m, base - 1.0 * m, 1.0 * m, 0.08 * m);
      g.strokeStyle = tint(f, '#7a5a6a', T.near, 0.4);
      g.lineWidth = 0.14 * m;
      g.beginPath();
      g.moveTo(X, base - 1.0 * m);
      g.quadraticCurveTo(X + 0.2 * m, base - h / 2, X + sway, base - h);
      g.stroke();
      g.strokeStyle = tint(f, '#3aa88a', T.near, 0.35);
      g.lineWidth = 0.1 * m;
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + (k - 2.5) * 0.6;
        g.beginPath();
        g.moveTo(X + sway, base - h);
        g.quadraticCurveTo(
          X + sway + Math.cos(a) * 0.9 * m,
          base - h + Math.sin(a) * 0.6 * m,
          X + sway + Math.cos(a) * 1.6 * m,
          base - h + 0.7 * m,
        );
        g.stroke();
      }
    } else if (u < 0.65) {
      // (a plinth column, the bust on it at eye height)
      const b = base - 1.3 * m;
      g.fillStyle = stone;
      g.fillRect(X - 0.3 * m, b, 0.6 * m, 1.3 * m);
      g.fillRect(X - 0.4 * m, b, 0.8 * m, 0.12 * m);
      g.fillRect(X - 0.4 * m, base - 0.15 * m, 0.8 * m, 0.15 * m);
      g.beginPath();
      g.ellipse(X, b - 0.15 * m, 0.5 * m, 0.25 * m, 0, Math.PI, 0);
      g.fill();
      g.fillRect(X - 0.1 * m, b - 0.5 * m, 0.2 * m, 0.38 * m);
      g.beginPath();
      g.ellipse(X, b - 0.78 * m, 0.22 * m, 0.3 * m, 0, 0, Math.PI * 2);
      g.fill();
      for (const ex of [-0.08, 0.08]) {
        g.fillStyle = rgba('#ffffff', 0.15 + 0.85 * hat);
        g.fillRect(X + ex * m - 1.5 * v.dpr, b - 0.82 * m - 1.5 * v.dpr, 3 * v.dpr, 3 * v.dpr);
        if (hat > 0.2) glow(g, X + ex * m, b - 0.82 * m, 0.2 * m, TEAL, hat);
      }
    }
  });
}

// the far rows: the floors in tiers far off
function far(f) {
  tiers(f);
}
// the near rows: the shop fronts, the gallery's decor
function near(f) {
  shops(f);
  decor(f);
}
// what stands after the near rows: the fountain (when the place has it) in front of the shops
function after(f) {
  if (f.look.landmarks.includes('fountain')) LANDMARKS.fountain(f);
}

export default {
  // (its landmarks drawn over its rows, by after(): a world does not draw them again as its own)
  late: ['fountain'],
  sky(f) {
    const { mf, T } = f;
    // a pastel sun seen through the skylight's mullions
    celestial(f, (g, X, Y, r, moon) => {
      const sg = g.createLinearGradient(0, Y - r, 0, Y + r);
      sg.addColorStop(0, moon ? '#f4eaff' : '#ffe0f0');
      sg.addColorStop(1, moon ? LILAC : PINK);
      g.fillStyle = sg;
      g.beginPath();
      g.arc(X, Y, r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = T.sky[1];
      for (let k = -2; k <= 2; k++) g.fillRect(X + k * r * 0.45 - r * 0.02, Y - r, r * 0.04 * (1 + mf.bass), r * 2);
      g.fillRect(X - r, Y - r * 0.02, r * 2, r * 0.04 * (1 + mf.bass));
    });
  },
  back(f) {
    for (const l of f.look.landmarks) if (l !== 'fountain') LANDMARKS[l]?.(f);
    far(f);
    near(f);
    after(f);
  },
  far,
  near,
  after,
  ground(f, a, b, y) {
    const { g, v, mf, t, L } = f,
      s = slab(f, a, b, y, tint(f, '#2a1e3a'), rgba(PINK, 0.3));
    if (!s) return;
    const lit = Math.floor(t / L.A.beat),
      light = tint(f, MARBLE, f.T.near, 0.25),
      dark = tint(f, '#3a2a52', f.T.near, 0.3);
    // checkerboard tiles, a diagonal of them lit on each beat
    for (let k = Math.floor(s.a / 0.5); k < s.b / 0.5; k++)
      for (let r = 0; r < 4; r++) {
        const on = (k + r + lit) % 9 === 0;
        g.fillStyle = on ? rgba(r % 2 ? TEAL : PINK, 0.45 + 0.5 * mf.beat) : (k + r) % 2 ? light : dark;
        g.fillRect(v.sx(k * 0.5), s.Y + (0.22 + r * 0.5) * v.ppm, 0.5 * v.ppm + 1, 0.5 * v.ppm);
      }
    // a neon baseboard under the tiles, beating on the kick
    g.fillStyle = rgba(TEAL, 0.3 + 0.6 * mf.kick);
    g.fillRect(s.X0, s.Y + 2.3 * v.ppm, s.X1 - s.X0, 0.08 * v.ppm);
    edge(f, s, PINK);
  },
};
