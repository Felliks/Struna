// (a pack of parts: see registry.js)
// Twenty landmarks of the pack's own, each a big far-off silhouette in the song's palette, seen now and then along the
// way, its lights and its moving bits playing the song: a lighthouse, a ferris wheel, a colossus, a rocket on its pad,
// a wind farm, a dam, a mech, a crashed saucer, a giant's skeleton, floating obelisks, a suspension bridge, an
// observatory, an oil rig, a golden stupa, an aqueduct, totem poles, a zeppelin, a world tree, a dish array and a
// ziggurat. Each is drawn at a scale of its own (its `m`: a metre of it, far off), so the whole of it stands in the
// nine metres of a landscape screen's height above the far rows.
import { registerPart } from '../../registry.js';
import { glow, landmark, tint } from '../../../render/places/kit.js';
import { hash, mixHex, rgba } from '../../../render/util.js';

const TAU = Math.PI * 2;

// a landmark of the pack (kit.js landmark), standing a little up from the far horizon so its foot is not lost behind
// the ground (on a phone held upright the horizon row sits far below the run's floor: there it stands up to the
// floor's height, a fifth of the screen up, so it is not hidden behind the ground)
const LIFT = 1.6;
function mark(f, par, every, chance, salt, draw) {
  const up = Math.max(LIFT * f.v.ppm, 0.22 * f.v.H);
  landmark(f, par, every, chance, salt, (X, base, i) => draw(X, base - up, i));
}

// the song's beat: its count so far and how far into this one (0..1)
function beatOf(f) {
  const b = f.t / f.L.A.beat;
  return { n: Math.floor(b), u: b - Math.floor(b), b };
}
// a step on each beat: n, then most of the way to n + 1 quickly, eased (things that turn a notch on the beat)
function notch(f, quick = 3) {
  const { n, u } = beatOf(f),
    k = Math.min(1, u * quick);
  return n + k * k * (3 - 2 * k);
}
// the far silhouette's shades: its body (the far rows' colour pulled a little toward the horizon, so it stands
// behind them), a side in shadow, a rim catching the horizon's light
function shades(f) {
  const { T } = f,
    body = mixHex(T.far, T.sky[2], 0.32);
  return { body, dark: mixHex(body, T.near, 0.3), rim: mixHex(T.far, T.sky[2], 0.55) };
}
// additive light (beams, flares): drawn inside, then the canvas back as it was
function light(g, draw) {
  g.save();
  g.globalCompositeOperation = 'lighter';
  draw();
  g.restore();
}
// a lattice girder from (x0, y0) to (x1, y1), w wide, its X-bracing every `step` px
function lattice(g, x0, y0, x1, y1, w, step, lw) {
  const dx = x1 - x0,
    dy = y1 - y0,
    len = Math.hypot(dx, dy),
    nx = (-dy / len) * (w / 2),
    ny = (dx / len) * (w / 2),
    n = Math.max(1, Math.round(len / step));
  g.lineWidth = lw;
  g.beginPath();
  g.moveTo(x0 + nx, y0 + ny);
  g.lineTo(x1 + nx, y1 + ny);
  g.moveTo(x0 - nx, y0 - ny);
  g.lineTo(x1 - nx, y1 - ny);
  for (let k = 0; k < n; k++) {
    const a = k / n,
      b = (k + 1) / n;
    g.moveTo(x0 + dx * a + nx, y0 + dy * a + ny);
    g.lineTo(x0 + dx * b - nx, y0 + dy * b - ny);
    g.moveTo(x0 + dx * a - nx, y0 + dy * a - ny);
    g.lineTo(x0 + dx * b + nx, y0 + dy * b + ny);
  }
  g.stroke();
}
// a closed polygon of [x, y] points in metres about (X, base), y up
function poly(g, X, base, m, pts) {
  g.beginPath();
  pts.forEach(([x, y], k) => (k ? g.lineTo(X + x * m, base - y * m) : g.moveTo(X + x * m, base - y * m)));
  g.closePath();
  g.fill();
}
// a cone of light from (X, Y) at angle a (0: up, clockwise), `len` long, `half` its half-angle, fading out
function beam(g, X, Y, a, len, half, col, alpha) {
  const ex = X + Math.sin(a) * len,
    ey = Y - Math.cos(a) * len,
    gr = g.createLinearGradient(X, Y, ex, ey);
  gr.addColorStop(0, rgba(col, alpha));
  gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(X, Y);
  g.lineTo(X + Math.sin(a - half) * len, Y - Math.cos(a - half) * len);
  g.lineTo(X + Math.sin(a + half) * len, Y - Math.cos(a + half) * len);
  g.closePath();
  g.fill();
}

const MARKS = [
  // a lighthouse on its crag: a striped tower, its lantern turning a beam round over the sea of the background (wide
  // as it swings toward us, a flash on every downbeat), its gallery's lamps on the hats
  {
    id: 'lighthouse',
    tags: ['nature', 'ancient', 'cold'],
    mood: [0.4, 0.5, 0.3],
    draw(f) {
      const { g, v, mf, T, t } = f,
        s = shades(f);
      mark(f, 0.16, 28, 0.7, 121, (X, base, i) => {
        const m = v.ppm * 0.25;
        // (the crag: a jagged rock it stands on)
        g.fillStyle = s.dark;
        poly(g, X, base, m, [[-9, 0], [-7, 2.2], [-4.5, 3.4], [-2.4, 4.2], [2, 4.4], [3.6, 3.2], [6, 2.4], [8.5, 0]]);
        g.fillStyle = s.body;
        poly(g, X, base, m, [[-1.5, 4.2], [-1, 13.6], [1, 13.6], [1.5, 4.2]]);
        // its stripes: bands of the rim's light round the tower, narrowing up it
        g.fillStyle = s.rim;
        for (let k = 0; k < 3; k++) {
          const y0 = 5.2 + k * 2.9,
            y1 = y0 + 1.3,
            w0 = 1.5 - (y0 - 4.2) * 0.053,
            w1 = 1.5 - (y1 - 4.2) * 0.053;
          poly(g, X, base, m, [[-w0, y0], [-w1, y1], [w1, y1], [w0, y0]]);
        }
        // a window up it on each band, lit on the beat
        for (let k = 0; k < 4; k++) {
          g.fillStyle = rgba(T.win[k % 3], 0.35 + 0.5 * (hash(k + beatOf(f).n, 5 + i) < 0.5 ? mf.beat : 0.2));
          g.fillRect(X - 0.15 * m, base - (6 + k * 2.2) * m, 0.3 * m, 0.5 * m);
        }
        // the gallery and its railing, the lantern room, the dome
        g.fillStyle = s.body;
        g.fillRect(X - 1.6 * m, base - 14 * m, 3.2 * m, 0.4 * m);
        g.fillRect(X - 1.6 * m, base - 14.7 * m, 0.08 * m, 0.7 * m);
        g.fillRect(X + 1.52 * m, base - 14.7 * m, 0.08 * m, 0.7 * m);
        g.fillRect(X - 1.6 * m, base - 14.75 * m, 3.2 * m, 0.08 * m);
        const lamp = 0.5 + 0.25 * mf.beat + 0.25 * mf.down;
        g.fillStyle = rgba(T.win[0], lamp);
        g.fillRect(X - 0.8 * m, base - 16 * m, 1.6 * m, 2 * m);
        g.fillStyle = s.body;
        for (const dx of [-0.8, -0.05, 0.7]) g.fillRect(X + dx * m, base - 16 * m, 0.1 * m, 2 * m);
        g.beginPath();
        g.moveTo(X - 1.05 * m, base - 16 * m);
        g.quadraticCurveTo(X, base - 17.6 * m, X + 1.05 * m, base - 16 * m);
        g.fill();
        g.fillRect(X - 0.04 * m, base - 18.2 * m, 0.08 * m, 0.8 * m);
        // the beam: the lantern's light turning round, seen side-on as a long blade wide when it points at us
        const ly = base - 15 * m,
          a = t * 1.3 + i,
          c = Math.cos(a),
          sd = Math.sin(a) >= 0 ? 1 : -1,
          len = (22 + 10 * mf.down) * m,
          wide = (0.15 + 0.85 * Math.abs(c)) * (0.8 + 0.6 * mf.down);
        light(g, () => {
          for (const dir of [sd, -sd]) {
            const reach = len * (0.25 + 0.75 * Math.sqrt(1 - c * c)) * (dir === sd ? 1 : 0.35),
              gr = g.createLinearGradient(X, ly, X + dir * reach, ly);
            gr.addColorStop(0, rgba(T.win[0], 0.3 + 0.25 * mf.down));
            gr.addColorStop(1, rgba(T.win[0], 0));
            g.fillStyle = gr;
            g.beginPath();
            g.moveTo(X, ly - 0.4 * m);
            g.lineTo(X + dir * reach, ly - (0.4 + 3 * wide) * m);
            g.lineTo(X + dir * reach, ly + (0.4 + 3 * wide) * m);
            g.lineTo(X, ly + 0.4 * m);
            g.fill();
          }
          glow(g, X, ly, (2 + 2.5 * Math.abs(c) + 3 * mf.down) * m, T.win[0], 0.22 + 0.35 * mf.down);
        });
      });
    },
  },
  // a ferris wheel: its rim of bulbs turning slowly, a step on each beat, cabins swinging under it lit on the hats, the
  // hub flaring on the kick
  {
    id: 'ferris',
    tags: ['urban', 'party', 'modern', 'warm'],
    mood: [0.55, 0.8, 0.2],
    draw(f) {
      const { g, v, mf, T } = f,
        s = shades(f),
        turn = notch(f, 2.5) * 0.06;
      mark(f, 0.17, 28, 0.7, 242, (X, base, i) => {
        const m = v.ppm * 0.26,
          R = 7.5 * m,
          cy = base - 9.5 * m,
          N = 16,
          rot = turn + i;
        // the A-frame legs and their base house
        g.strokeStyle = s.body;
        g.lineCap = 'round';
        g.lineWidth = 0.45 * m;
        g.beginPath();
        g.moveTo(X - 4.5 * m, base);
        g.lineTo(X, cy);
        g.lineTo(X + 4.5 * m, base);
        g.moveTo(X - 3.2 * m, base);
        g.lineTo(X, cy);
        g.lineTo(X + 3.2 * m, base);
        g.stroke();
        g.fillStyle = s.dark;
        g.fillRect(X - 5 * m, base - 1.4 * m, 10 * m, 1.4 * m);
        for (let k = 0; k < 6; k++) {
          g.fillStyle = rgba(T.win[k % 3], 0.4 + 0.4 * mf.beat);
          g.fillRect(X + (-4.4 + k * 1.5) * m, base - 1 * m, 0.7 * m, 0.5 * m);
        }
        // the wheel: two rims, spokes, a lattice between the rims
        g.strokeStyle = s.body;
        g.lineWidth = 0.18 * m;
        g.beginPath();
        g.arc(X, cy, R, 0, TAU);
        g.moveTo(X + R * 0.86, cy);
        g.arc(X, cy, R * 0.86, 0, TAU);
        for (let k = 0; k < N; k++) {
          const a = rot + (k / N) * TAU;
          g.moveTo(X, cy);
          g.lineTo(X + Math.cos(a) * R, cy + Math.sin(a) * R);
          g.moveTo(X + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.86);
          g.lineTo(X + Math.cos(a + TAU / N) * R, cy + Math.sin(a + TAU / N) * R);
        }
        g.stroke();
        // the bulbs along the rim, chasing round on the beat
        const chase = beatOf(f).n;
        for (let k = 0; k < N * 2; k++) {
          const a = rot + (k / (N * 2)) * TAU,
            on = (k + chase) % 4 === 0;
          g.fillStyle = rgba(T.win[(k >> 1) % 3], on ? 0.95 : 0.35 + 0.3 * mf.bass);
          g.fillRect(X + Math.cos(a) * R - 0.1 * m, cy + Math.sin(a) * R - 0.1 * m, 0.2 * m, 0.2 * m);
        }
        // the cabins, hanging from the rim, swaying a little after each step
        const sway = Math.sin(beatOf(f).u * Math.PI * 2) * 0.12 * (1 - beatOf(f).u);
        for (let k = 0; k < N; k++) {
          const a = rot + (k / N) * TAU,
            px = X + Math.cos(a) * R,
            py = cy + Math.sin(a) * R;
          g.save();
          g.translate(px, py);
          g.rotate(sway);
          g.fillStyle = s.body;
          g.fillRect(-0.04 * m, 0, 0.08 * m, 0.4 * m);
          g.fillRect(-0.55 * m, 0.4 * m, 1.1 * m, 0.9 * m);
          const lit = hash(k + Math.floor(f.t * 8), 17 + i) < 0.25 + 1.4 * mf.hat;
          g.fillStyle = rgba(T.win[k % 3], lit ? 0.95 : 0.3);
          g.fillRect(-0.4 * m, 0.52 * m, 0.8 * m, 0.45 * m);
          g.restore();
        }
        g.fillStyle = s.body;
        g.beginPath();
        g.arc(X, cy, 0.7 * m, 0, TAU);
        g.fill();
        light(g, () => glow(g, X, cy, (1.4 + 2.5 * mf.kick) * m, T.line, 0.3 + 0.6 * mf.kick));
        g.lineCap = 'butt';
      });
    },
  },
  // a colossus: a robed giant on its pedestal, one arm raising a torch whose flame leaps on the kick, a crown of rays, its
  // eyes lit by the voice, the doorway in its pedestal glowing on the downbeat
  {
    id: 'colossus',
    tags: ['ancient', 'fantasy', 'mild'],
    mood: [0.6, 0.55, 0.5],
    draw(f) {
      const { g, v, mf, T, t } = f,
        s = shades(f);
      mark(f, 0.14, 30, 0.7, 103, (X, base, i) => {
        const m = v.ppm * 0.235;
        // the pedestal: a stepped plinth, its door and window slits
        g.fillStyle = s.dark;
        poly(g, X, base, m, [[-5, 0], [-5, 1], [-4.2, 1], [-4.2, 4.2], [-3.4, 4.2], [-3.4, 4.8], [3.4, 4.8], [3.4, 4.2], [4.2, 4.2], [4.2, 1], [5, 1], [5, 0]]);
        g.fillStyle = rgba(T.win[0], 0.3 + 0.6 * mf.down);
        g.beginPath();
        g.moveTo(X - 0.7 * m, base - 1 * m);
        g.lineTo(X - 0.7 * m, base - 2.6 * m);
        g.arc(X, base - 2.6 * m, 0.7 * m, Math.PI, 0);
        g.lineTo(X + 0.7 * m, base - 1 * m);
        g.fill();
        for (const dx of [-2.8, -1.9, 1.9, 2.8]) {
          g.fillStyle = rgba(T.win[1], 0.25 + 0.4 * mf.beat);
          g.fillRect(X + dx * m - 0.12 * m, base - 3.6 * m, 0.24 * m, 1 * m);
        }
        // the figure: the robe falling in folds, the torso, the raised arm and the lowered one holding a tablet
        g.fillStyle = s.body;
        poly(g, X, base, m, [[-2.6, 4.8], [-2.1, 8], [-1.8, 11], [-1.4, 13.2], [-0.5, 13.8], [0.5, 13.8], [1.5, 13.2], [1.9, 11], [2.3, 8], [2.9, 4.8]]);
        // (the raised right arm, up to the torch)
        poly(g, X, base, m, [[1.1, 13.4], [1.9, 13.1], [2.6, 16.2], [2.95, 18.4], [2.35, 18.5], [1.95, 16.4]]);
        // (the lowered left arm holding a tablet)
        poly(g, X, base, m, [[-1.4, 13.2], [-2.1, 12.6], [-2.5, 10.4], [-1.9, 10.2], [-1.4, 11.8]]);
        g.fillStyle = s.dark;
        poly(g, X, base, m, [[-3.1, 9.4], [-1.7, 9.4], [-1.6, 11.6], [-3.0, 11.6]]);
        // the folds: lines of the rim's light down the robe
        g.strokeStyle = s.rim;
        g.lineWidth = 0.08 * m;
        g.beginPath();
        for (const dx of [-1.6, -0.6, 0.4, 1.4]) {
          g.moveTo(X + dx * 0.7 * m, base - 12.6 * m);
          g.quadraticCurveTo(X + (dx + 0.4) * m, base - 8.5 * m, X + dx * 1.3 * m, base - 4.9 * m);
        }
        g.stroke();
        // the head and its crown of rays
        g.fillStyle = s.body;
        g.fillRect(X - 0.3 * m, base - 14.5 * m, 0.6 * m, 0.8 * m);
        g.beginPath();
        g.ellipse(X, base - 15.2 * m, 0.7 * m, 0.85 * m, 0, 0, TAU);
        g.fill();
        for (let k = 0; k < 7; k++) {
          const a = -Math.PI / 2 + (k - 3) * 0.32,
            cx = X + Math.cos(a) * 0.7 * m,
            cyy = base - 15.6 * m + Math.sin(a) * 0.7 * m;
          g.beginPath();
          g.moveTo(cx - Math.sin(a) * 0.14 * m, cyy + Math.cos(a) * 0.14 * m);
          g.lineTo(cx + Math.cos(a) * 1.1 * m, cyy + Math.sin(a) * 1.1 * m);
          g.lineTo(cx + Math.sin(a) * 0.14 * m, cyy - Math.cos(a) * 0.14 * m);
          g.fill();
        }
        // its eyes, by the voice
        const eye = 0.2 + 0.8 * mf.voice;
        light(g, () => {
          for (const dx of [-0.25, 0.25]) glow(g, X + dx * m, base - 15.25 * m, (0.12 + 0.18 * mf.voice) * m, T.line, eye);
        });
        // the torch: its cup and a flame leaping on the kick, licking about
        const tx = X + 2.65 * m,
          ty = base - 18.6 * m;
        g.fillStyle = s.body;
        poly(g, tx, ty, m, [[-0.55, 0.15], [0.55, 0.15], [0.3, -0.5], [-0.3, -0.5]]);
        const fh = (1.4 + 1.6 * mf.kick + 0.6 * mf.drop) * m,
          lick = Math.sin(t * 9 + i) * 0.25 * m;
        light(g, () => {
          glow(g, tx, ty - fh * 0.4, fh * 1.6, T.win[0], 0.35 + 0.4 * mf.kick);
          for (const [w, col, k] of [[0.6, T.win[0], 1], [0.35, T.win[2], 0.7], [0.18, '#ffffff', 0.45]]) {
            g.fillStyle = rgba(col, 0.85);
            g.beginPath();
            g.moveTo(tx - w * m, ty - 0.15 * m);
            g.quadraticCurveTo(tx - w * m, ty - fh * 0.5 * k, tx + lick * k, ty - fh * k);
            g.quadraticCurveTo(tx + w * m, ty - fh * 0.5 * k, tx + w * m, ty - 0.15 * m);
            g.fill();
          }
        });
      });
    },
  },
  // a rocket on its pad: the launch tower's lattice with its arms, the rocket and two boosters, steam pouring off it
  // with the bass, the tower's lights running up it on the kick, searchlights crossing on it, the engines lit on drops
  {
    id: 'rocket',
    media: ['air', 'space'],
    tags: ['tech', 'future', 'modern'],
    mood: [0.7, 0.6, 0.5],
    draw(f) {
      const { g, v, mf, T, t } = f,
        s = shades(f);
      mark(f, 0.16, 30, 0.7, 124, (X, base, i) => {
        const m = v.ppm * 0.235,
          rx = X + 1.6 * m;
        // the searchlights from the ground, swinging across the rocket
        light(g, () => {
          for (const sd of [-1, 1]) {
            const a = sd * (0.35 + 0.18 * Math.sin(t * 0.9 + sd + i));
            beam(g, rx - sd * 7 * m, base, a, 22 * m, 0.05, T.win[1], 0.18 + 0.15 * mf.beat);
          }
        });
        // the pad
        g.fillStyle = s.dark;
        poly(g, X, base, m, [[-6, 0], [-5, 1.2], [6, 1.2], [7, 0]]);
        // the tower: a lattice up past the nose, its arms reaching to the rocket
        g.strokeStyle = s.body;
        lattice(g, X - 2.2 * m, base - 1.2 * m, X - 2.2 * m, base - 17 * m, 1.6 * m, 1.2 * m, 0.12 * m);
        g.fillStyle = s.body;
        g.fillRect(X - 3.1 * m, base - 17.4 * m, 1.8 * m, 0.5 * m);
        g.fillRect(X - 2.25 * m, base - 19 * m, 0.1 * m, 1.6 * m);
        for (const y of [5, 9, 13]) g.fillRect(X - 1.4 * m, base - y * m, 2.2 * m, 0.25 * m);
        // the boosters, the core with its bands, the nose and the fins
        for (const dx of [-0.6, 3.8]) {
          poly(g, X, base, m, [[dx - 0.6, 1.6], [dx - 0.6, 8], [dx, 9.3], [dx + 0.6, 8], [dx + 0.6, 1.6]]);
        }
        poly(g, X, base, m, [[0.5, 1.4], [0.5, 13.2], [1.6, 16.8], [2.7, 13.2], [2.7, 1.4]]);
        poly(g, X, base, m, [[0.5, 1.4], [-0.3, 1.2], [0.5, 3.4]]);
        poly(g, X, base, m, [[2.7, 1.4], [3.5, 1.2], [2.7, 3.4]]);
        g.fillStyle = s.rim;
        g.fillRect(rx - 1.1 * m, base - 13.2 * m, 0.4 * m, 11.8 * m);
        for (const y of [4.5, 9.5, 12.8]) g.fillRect(rx - 1.1 * m, base - y * m, 2.2 * m, 0.18 * m);
        g.fillStyle = s.dark;
        g.fillRect(rx - 0.6 * m, base - 11.5 * m, 1.2 * m, 0.5 * m);
        // the tower's lights: a chain of reds running up on the kick
        const run = (t * 2) % 1;
        for (let k = 0; k < 7; k++) {
          const y = base - (2 + k * 2.3) * m,
            on = Math.abs(k / 7 - run) < 0.15 || mf.kick > 0.6;
          glow(g, X - 2.95 * m, y, (0.25 + 0.3 * mf.kick) * m, '#ff4050', on ? 0.9 : 0.25);
        }
        glow(g, X - 2.2 * m, base - 19 * m, (0.4 + 0.6 * mf.beat) * m, '#ff4050', 0.5 + 0.5 * mf.beat);
        // the engines: a glow under the pad on the drops
        light(g, () => glow(g, rx, base - 0.8 * m, (2 + 5 * mf.drop + 1.5 * mf.kick) * m, T.win[0], 0.15 + 0.6 * mf.drop));
        // steam: puffs rolling off both sides of the pad, swelling with the bass
        for (let k = 0; k < 14; k++) {
          const u = (t * 0.25 + hash(k, 104)) % 1,
            sd = k % 2 ? 1 : -1,
            px = rx + sd * (1.5 + u * 9) * m,
            py = base - (0.8 + u * u * 3 + hash(k, 7) * 1.2) * m,
            r = (0.8 + u * 2.4) * (0.8 + 0.6 * mf.bass) * m;
          g.fillStyle = rgba(mixHex(T.sky[2], '#ffffff', 0.4), (1 - u) * (0.25 + 0.25 * mf.bass));
          g.beginPath();
          g.arc(px, py, r, 0, TAU);
          g.fill();
        }
      });
    },
  },
  // a wind farm on a ridge: three great turbines, their blades turning a third on each beat and faster as the bass
  // swells, red lights on the nacelles blinking on the kick
  {
    id: 'windfarm',
    tags: ['modern', 'nature', 'tech', 'cold'],
    mood: [0.35, 0.6, 0.2],
    draw(f) {
      const { g, v, mf, T } = f,
        s = shades(f),
        turn = notch(f, 2) * (TAU / 6);
      mark(f, 0.18, 32, 0.7, 125, (X, base, i) => {
        const m = v.ppm * 0.21;
        // the ridge
        g.fillStyle = s.dark;
        g.beginPath();
        g.moveTo(X - 14 * m, base);
        g.quadraticCurveTo(X - 6 * m, base - 3.4 * m, X, base - 3 * m);
        g.quadraticCurveTo(X + 7 * m, base - 2.6 * m, X + 14 * m, base);
        g.fill();
        for (const [dx, h, sc] of [[-8, 11, 0.85], [0, 13, 1], [8, 10, 0.8]]) {
          const tx = X + dx * m,
            gy = base - (3 - Math.abs(dx) * 0.12) * m,
            hy = gy - h * m,
            L = 5.6 * sc * m;
          // the mast, tapering up, a rim of light down one side
          g.fillStyle = s.body;
          poly(g, tx, gy, m, [[-0.5 * sc, 0], [-0.22 * sc, h], [0.22 * sc, h], [0.5 * sc, 0]]);
          g.fillStyle = s.rim;
          poly(g, tx, gy, m, [[0.28 * sc, 0], [0.1 * sc, h], [0.22 * sc, h], [0.5 * sc, 0]]);
          // the nacelle and the hub
          g.fillStyle = s.body;
          g.fillRect(tx - 0.9 * sc * m, hy - 0.35 * sc * m, 1.5 * sc * m, 0.7 * sc * m);
          // the blades: long tapering blades about the hub
          const a0 = turn + hash(i, dx + 30) * TAU;
          for (let k = 0; k < 3; k++) {
            const a = a0 + (k * TAU) / 3,
              ca = Math.cos(a),
              sa = Math.sin(a);
            g.beginPath();
            g.moveTo(tx + 0.6 * sc * m - sa * 0.36 * sc * m, hy + ca * 0.36 * sc * m);
            g.quadraticCurveTo(tx + 0.6 * sc * m + ca * L * 0.3 - sa * 0.55 * sc * m, hy + sa * L * 0.3 + ca * 0.55 * sc * m, tx + 0.6 * sc * m + ca * L, hy + sa * L);
            g.lineTo(tx + 0.6 * sc * m + sa * 0.2 * sc * m, hy - ca * 0.2 * sc * m);
            g.fill();
          }
          g.beginPath();
          g.arc(tx + 0.6 * sc * m, hy, 0.32 * sc * m, 0, TAU);
          g.fill();
          glow(g, tx - 0.3 * sc * m, hy - 0.5 * sc * m, (0.3 + 0.5 * mf.kick) * m, '#ff3b4f', 0.35 + 0.65 * mf.kick);
          // a glint on the hub with the bass
          light(g, () => glow(g, tx + 0.6 * sc * m, hy, (0.4 + 0.6 * mf.bass) * sc * m, T.line, 0.15 + 0.35 * mf.bass));
        }
      });
    },
  },
  // a dam: a great curved wall between two cliffs, its spillways pouring sheets of water that step down on each beat,
  // spray at its foot lit by the bass, a road of lamps along its crest, the control tower's windows on the hats
  {
    id: 'dam',
    tags: ['industrial', 'modern', 'nature', 'cold'],
    mood: [0.5, 0.45, 0.6],
    draw(f) {
      const { g, v, mf, T } = f,
        s = shades(f),
        { n, u } = beatOf(f);
      mark(f, 0.14, 38, 0.65, 226, (X, base, i) => {
        const m = v.ppm * 0.3,
          top = base - 11 * m;
        // the cliffs it is wedged between
        g.fillStyle = s.dark;
        poly(g, X, base, m, [[-18, 0], [-17, 8], [-15.5, 12.5], [-13.5, 14.2], [-12, 13], [-11, 0]]);
        poly(g, X, base, m, [[11, 0], [12, 12.8], [13.6, 15], [15.2, 13], [17.4, 9], [18.5, 0]]);
        // the wall: wider at its foot, ribbed, its face in courses
        g.fillStyle = s.body;
        poly(g, X, base, m, [[-12.5, 0], [-11.6, 11], [11.6, 11], [12.5, 0]]);
        g.strokeStyle = s.dark;
        g.lineWidth = 0.08 * m;
        g.beginPath();
        for (let k = 1; k < 6; k++) {
          const y = base - k * 1.85 * m;
          g.moveTo(X - (12.5 - k * 0.15) * m, y);
          g.lineTo(X + (12.5 - k * 0.15) * m, y);
        }
        g.stroke();
        g.fillStyle = s.rim;
        for (let k = -5; k <= 5; k++) g.fillRect(X + k * 2.1 * m - 0.12 * m, top, 0.24 * m, 11 * m);
        // the crest: a parapet and its lamps
        g.fillStyle = s.dark;
        g.fillRect(X - 12 * m, top - 0.7 * m, 24 * m, 0.7 * m);
        for (let k = 0; k < 12; k++) glow(g, X + (-11 + k * 2) * m, top - 1 * m, 0.35 * m, T.win[k % 2], 0.4 + 0.4 * mf.beat);
        // the control tower on the crest
        g.fillStyle = s.body;
        g.fillRect(X + 5 * m, top - 4 * m, 2.4 * m, 3.4 * m);
        g.fillRect(X + 4.7 * m, top - 4.3 * m, 3 * m, 0.35 * m);
        for (let r = 0; r < 2; r++)
          for (let c = 0; c < 3; c++) {
            const lit = hash(r * 3 + c + Math.floor(f.t * 6), 106 + i) < 0.3 + 1.2 * mf.hat;
            g.fillStyle = rgba(T.win[(r + c) % 3], lit ? 0.9 : 0.3);
            g.fillRect(X + (5.3 + c * 0.7) * m, top - (3.5 - r * 1.2) * m, 0.4 * m, 0.6 * m);
          }
        // the spillways: sheets of water down three chutes, streaks stepping down a notch each beat
        const step = (n % 4) + Math.min(1, u * 4);
        for (const cx of [-6, -1.5, 3]) {
          const x0 = X + cx * m,
            w = 2.2 * m,
            gr = g.createLinearGradient(0, top, 0, base);
          gr.addColorStop(0, rgba(mixHex(T.sky[2], '#ffffff', 0.5), 0.55));
          gr.addColorStop(1, rgba(mixHex(T.sky[2], '#ffffff', 0.7), 0.85));
          g.fillStyle = gr;
          g.fillRect(x0, top, w, 11 * m);
          for (let k = 0; k < 9; k++) {
            const y = (((k / 9 + step / 4 + hash(k, cx + 9) * 0.2) % 1) ** 1.4) * 10.6;
            g.fillStyle = rgba('#ffffff', 0.5 + 0.4 * mf.beat);
            g.fillRect(x0 + hash(k, cx + 3) * w * 0.8, top + y * m, 0.12 * m, (0.6 + y * 0.12) * m);
          }
        }
        // the spray at its foot, lit by the bass
        light(g, () => {
          for (const cx of [-4.9, -0.4, 4.1]) glow(g, X + cx * m, base - 0.6 * m, (2.4 + 2 * mf.bass) * m, mixHex(T.sky[2], '#ffffff', 0.5), 0.25 + 0.35 * mf.bass);
        });
      });
    },
  },
  // a giant mech walking in the distance: a hunched hull on two bent legs taking a stride every two beats, a cannon on
  // each arm, its visor's slit glowing and scanning, flaring on the kick, a beacon on its antenna on the hats
  {
    id: 'mech',
    tags: ['future', 'tech', 'industrial'],
    mood: [0.8, 0.35, 0.85],
    draw(f) {
      const { g, v, mf, T, t } = f,
        s = shades(f),
        { b } = beatOf(f);
      mark(f, 0.16, 29, 0.7, 167, (X, base, i) => {
        const m = v.ppm * 0.27,
          ph = (b / 2) * Math.PI + i,
          bob = Math.abs(Math.sin(ph)) * 0.5,
          hipY = base - (9.4 - bob) * m;
        // the legs: thigh back to a knee, a shin forward to an ankle, a splayed foot; the two in turn
        g.lineCap = 'round';
        for (const sd of [1, -1]) {
          const sw = Math.sin(ph) * sd,
            hx = X + sd * 1.1 * m,
            footX = hx + sw * 2.2 * m,
            footY = base - Math.max(0, -Math.cos(ph) * sd) * 0.8 * m,
            kx = (hx + footX) / 2 + 2.2 * m,
            ky = (hipY + footY) / 2,
            col = sd > 0 ? s.body : s.dark;
          g.strokeStyle = col;
          g.lineWidth = 1.1 * m;
          g.beginPath();
          g.moveTo(hx, hipY);
          g.lineTo(kx, ky);
          g.stroke();
          g.lineWidth = 0.8 * m;
          g.beginPath();
          g.moveTo(kx, ky);
          g.lineTo(footX, footY - 0.6 * m);
          g.stroke();
          g.fillStyle = col;
          poly(g, footX, footY, m, [[-1.6, 0], [-1, 0.8], [1, 0.8], [1.9, 0]]);
          g.beginPath();
          g.arc(kx, ky, 0.7 * m, 0, TAU);
          g.fill();
        }
        // the hull: a wedge leaning forward, armour plates, the cockpit at its front
        const hy = hipY,
          hull = [[-3.6, 0.2], [-4, 2.6], [-2.4, 4.6], [2.8, 4.4], [4.8, 2.6], [4.2, 0.6], [2, -0.6], [-2.2, -0.6]];
        g.fillStyle = s.body;
        poly(g, X, hy + 0, m, hull.map(([x, y]) => [x, y]));
        g.fillStyle = s.rim;
        poly(g, X, hy, m, [[-2.4, 4.6], [2.8, 4.4], [3.2, 3.9], [-2.6, 4.1]]);
        g.strokeStyle = s.dark;
        g.lineWidth = 0.1 * m;
        g.beginPath();
        g.moveTo(X - 1 * m, hy + 0.6 * m);
        g.lineTo(X - 0.6 * m, hy - 4.4 * m);
        g.moveTo(X + 1.8 * m, hy + 0.4 * m);
        g.lineTo(X + 2.2 * m, hy - 4.3 * m);
        g.stroke();
        // a band of the rim's light along its flank, and a row of lit ports in it, running back on the beat
        g.fillStyle = s.rim;
        poly(g, X, hy, m, [[-3.8, 1.5], [4.5, 1.6], [4.6, 1.2], [-3.7, 1.1]]);
        const run = beatOf(f).n;
        for (let k = 0; k < 6; k++) {
          const on = (k + run) % 3 === 0;
          g.fillStyle = rgba(T.win[k % 3], on ? 0.9 : 0.35 + 0.3 * mf.bass);
          g.fillRect(X + (-3 + k * 1.1) * m, hy - 0.95 * m, 0.45 * m, 0.4 * m);
        }
        // its hip joints, glowing on the kick
        light(g, () => {
          for (const sd of [1, -1]) glow(g, X + sd * 1.1 * m, hipY, (0.5 + 0.6 * mf.kick) * m, T.line, 0.3 + 0.5 * mf.kick);
        });
        // the arms: a shoulder, a cannon pointing ahead, its muzzle flashing on the snare
        for (const [sd, col] of [[-1, s.dark], [1, s.body]]) {
          const sx = X + sd * 0.6 * m + 0.4 * m,
            sy = hy - 2.6 * m;
          g.fillStyle = col;
          g.beginPath();
          g.arc(sx - sd * 3.4 * m, sy, 1 * m, 0, TAU);
          g.fill();
          g.fillRect(sx - sd * 3.4 * m - 0.4 * m, sy, 0.8 * m, 2.4 * m);
          g.fillRect(sx - sd * 3.4 * m - 0.2 * m, sy + 2 * m, 4.6 * m, 0.9 * m);
          g.fillRect(sx - sd * 3.4 * m + 4.2 * m, sy + 2.15 * m, 1.6 * m, 0.55 * m);
          if (sd > 0) light(g, () => glow(g, sx - sd * 3.4 * m + 6 * m, sy + 2.4 * m, (0.4 + 1.6 * mf.snare) * m, T.win[0], 0.8 * mf.snare));
        }
        // the antenna and its beacon
        g.fillStyle = s.body;
        g.fillRect(X - 2.3 * m, hy - 7.2 * m, 0.1 * m, 2.8 * m);
        glow(g, X - 2.25 * m, hy - 7.2 * m, (0.3 + 0.4 * mf.hat) * m, '#ff3b4f', 0.4 + 1.2 * mf.hat);
        // the visor: a slit across the cockpit, its scan running along it, flaring on the kick
        const vx = X + 2.2 * m,
          vy = hy - 2.4 * m,
          scan = (Math.sin(t * 2.4) * 0.5 + 0.5) * 2.2 * m;
        g.fillStyle = rgba(T.line, 0.55 + 0.45 * mf.kick);
        poly(g, vx, vy, m, [[0, 0.3], [2.3, 0.15], [2.4, -0.25], [0, -0.2]]);
        light(g, () => {
          glow(g, vx + scan, vy, (0.8 + 1.8 * mf.kick) * m, T.line, 0.5 + 0.5 * mf.kick);
          beam(g, vx + 2.4 * m, vy, Math.PI / 2 + 0.25 + Math.sin(t * 0.8) * 0.15, 14 * m, 0.08, T.line, 0.12 + 0.2 * mf.kick);
        });
        g.lineCap = 'butt';
      });
    },
  },
  // a crashed saucer: tilted into the ground at the end of the furrow it ploughed, its dome glowing, its rim lights
  // chasing round on the beat, sparks spitting from the wound on the snare, smoke rising
  {
    id: 'ufo',
    media: ['air', 'space'],
    tags: ['future', 'tech', 'neon'],
    mood: [0.6, 0.45, 0.55],
    draw(f) {
      const { g, v, mf, T, t } = f,
        s = shades(f),
        { n } = beatOf(f);
      mark(f, 0.16, 36, 0.65, 188, (X, base, i) => {
        const m = v.ppm * 0.43,
          cx = X,
          cy = base - 3.4 * m,
          tilt = -0.42;
        // the smoke: puffs rising from it, leaning in the wind
        for (let k = 0; k < 9; k++) {
          const u = (t * 0.18 + hash(k, 108)) % 1;
          g.fillStyle = rgba(mixHex(T.far, T.sky[2], 0.6), (1 - u) * 0.22);
          g.beginPath();
          g.arc(cx + (1 + u * 6 + hash(k, 3) * 2) * m, cy - (2 + u * 10) * m, (0.8 + u * 2.6) * m, 0, TAU);
          g.fill();
        }
        // a glow from under its rim where it sank in
        light(g, () => glow(g, cx - 2 * m, base - 0.8 * m, (5 + 3 * mf.bass) * m, T.line, 0.2 + 0.3 * mf.bass));
        g.save();
        g.translate(cx, cy);
        g.rotate(tilt);
        // the dome, glass glowing from within
        const dg = g.createRadialGradient(0, -1.8 * m, 0, 0, -1.4 * m, 3 * m);
        dg.addColorStop(0, rgba(T.line, 0.6 + 0.3 * mf.voice));
        dg.addColorStop(1, rgba(T.far, 0.9));
        g.fillStyle = dg;
        g.beginPath();
        g.ellipse(0, -0.9 * m, 3 * m, 2.4 * m, 0, Math.PI, 0);
        g.fill();
        // the disc: an upper and a lower curve, a rim band
        g.fillStyle = s.body;
        g.beginPath();
        g.ellipse(0, 0, 8.5 * m, 1.7 * m, 0, 0, TAU);
        g.fill();
        g.fillStyle = s.rim;
        g.beginPath();
        g.ellipse(0, -0.2 * m, 8.2 * m, 1.1 * m, 0, Math.PI, 0);
        g.fill();
        g.fillStyle = s.body;
        g.beginPath();
        g.ellipse(0, -0.1 * m, 7.2 * m, 0.95 * m, 0, Math.PI, 0);
        g.fill();
        g.fillStyle = s.dark;
        g.beginPath();
        g.ellipse(0, 0.6 * m, 5 * m, 1.3 * m, 0, 0, Math.PI);
        g.fill();
        g.strokeStyle = rgba(T.line, 0.3 + 0.4 * mf.beat);
        g.lineWidth = 0.12 * m;
        g.beginPath();
        g.ellipse(0, 0, 8.5 * m, 1.7 * m, 0, Math.PI * 1.05, Math.PI * 1.95);
        g.stroke();
        // the rim lights, chasing round on the beat, a few dead
        for (let k = 0; k < 14; k++) {
          const a = Math.PI * (k / 13),
            lx = -Math.cos(a) * 7.9 * m,
            ly = Math.sin(a) * 1.2 * m * 0.35 + 0.2 * m,
            dead = hash(k, 108 + i) < 0.2,
            on = (k + n) % 3 === 0;
          if (!dead) glow(g, lx, ly, (on ? 0.7 : 0.4) * m, T.win[k % 3], on ? 0.95 : 0.5);
        }
        g.restore();
        // the earth heaped over its lower side, and the furrow behind it
        g.fillStyle = s.dark;
        g.beginPath();
        g.moveTo(X - 9 * m, base);
        g.quadraticCurveTo(X - 6.5 * m, base - 2.6 * m, X - 4 * m, base - 1.4 * m);
        g.quadraticCurveTo(X - 1 * m, base - 0.4 * m, X + 2 * m, base - 0.5 * m);
        g.lineTo(X + 16 * m, base - 0.25 * m);
        g.lineTo(X + 16 * m, base);
        g.fill();
        // sparks from the wound on the snare
        for (let k = 0; k < 8; k++) {
          const u = hash(k, n + 31),
            r = (0.6 + u * 2.6) * mf.snare * m,
            a = -Math.PI / 2 + (hash(k, n + 5) - 0.5) * 2;
          g.fillStyle = rgba(T.win[0], mf.snare);
          g.fillRect(X + 4 * m + Math.cos(a) * r, base - 5.5 * m + Math.sin(a) * r, 0.15 * m, 0.15 * m);
        }
      });
    },
  },
  // a giant's skeleton: a whale's bones lying on the plain, its spine arching, its ribs curving up over it, its skull
  // with the jaw fallen open; lights of the things that live in it pulsing with the bass, flickering on the hats
  {
    id: 'skeleton',
    tags: ['nature', 'ancient', 'hot', 'gothic'],
    mood: [0.35, 0.3, 0.55],
    draw(f) {
      const { g, v, mf, T, t } = f,
        s = shades(f),
        bone = mixHex(T.far, T.sky[2], 0.55),
        boneD = mixHex(T.far, T.sky[2], 0.25);
      mark(f, 0.15, 38, 0.65, 129, (X, base, i) => {
        const m = v.ppm * 0.42,
          // the spine: a curve from the skull (left) to the tail (right), its points along it
          sp = k => {
            const u = k / 22,
              x = -10 + u * 22,
              y = 2.6 + 5.6 * Math.sin(Math.min(1, u * 1.15) * Math.PI) ** 0.9;
            return [X + x * m, base - y * m];
          };
        // the sand drifted against it
        g.fillStyle = s.dark;
        g.beginPath();
        g.moveTo(X - 15 * m, base);
        g.quadraticCurveTo(X - 6 * m, base - 1.6 * m, X + 2 * m, base - 0.9 * m);
        g.quadraticCurveTo(X + 10 * m, base - 0.4 * m, X + 15 * m, base);
        g.fill();
        // the ribs: pairs of curves from the spine down, the far ones darker
        g.lineCap = 'round';
        for (const far of [1, 0]) {
          g.strokeStyle = far ? boneD : bone;
          g.lineWidth = (far ? 0.28 : 0.38) * m;
          g.beginPath();
          for (let k = 3; k < 15; k++) {
            const [px, py] = sp(k),
              h = base - py,
              sd = far ? 0.55 : 1,
              reach = (2.6 + 1.4 * Math.sin((k / 15) * Math.PI)) * m * sd;
            g.moveTo(px, py);
            g.bezierCurveTo(px - reach * 1.3, py + h * 0.1, px - reach * 1.1, base - 0.3 * m, px - reach * 0.2 + (far ? 0.9 : 0) * m, base - 0.2 * m);
          }
          g.stroke();
        }
        // the spine itself, vertebrae as knobs along it
        g.strokeStyle = bone;
        g.lineWidth = 0.45 * m;
        g.beginPath();
        for (let k = 0; k <= 22; k++) {
          const [px, py] = sp(k);
          k ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.stroke();
        g.fillStyle = bone;
        for (let k = 1; k <= 22; k++) {
          const [px, py] = sp(k),
            r = (0.42 - k * 0.012) * m;
          g.fillRect(px - r * 0.5, py - r * 1.8, r, r * 1.8);
        }
        // the skull: a long head, its eye socket, the jaw fallen open to the ground
        const [hx, hy] = sp(0);
        g.beginPath();
        g.moveTo(hx + 0.8 * m, hy - 1 * m);
        g.quadraticCurveTo(hx - 3.2 * m, hy - 3 * m, hx - 8 * m, hy - 0.4 * m);
        g.lineTo(hx - 7.6 * m, hy + 0.6 * m);
        g.quadraticCurveTo(hx - 3 * m, hy - 0.2 * m, hx + 0.8 * m, hy + 1 * m);
        g.fill();
        // (the ridge of its snout, in the rim's light)
        g.strokeStyle = mixHex(bone, '#ffffff', 0.2);
        g.lineWidth = 0.12 * m;
        g.beginPath();
        g.moveTo(hx - 0.4 * m, hy - 1.5 * m);
        g.quadraticCurveTo(hx - 3.4 * m, hy - 2.7 * m, hx - 7.6 * m, hy - 0.5 * m);
        g.stroke();
        g.strokeStyle = bone;
        g.lineWidth = 0.4 * m;
        g.beginPath();
        g.moveTo(hx + 0.2 * m, hy + 0.9 * m);
        g.quadraticCurveTo(hx - 3.5 * m, base - 0.9 * m, hx - 7.8 * m, base - 0.3 * m);
        g.stroke();
        g.fillStyle = s.dark;
        g.beginPath();
        g.arc(hx - 1.2 * m, hy - 0.5 * m, 0.5 * m, 0, TAU);
        g.fill();
        // the lights living in it: lanterns hung in its ribs, pulsing with the bass and flickering on the hats, and
        // a glow in its eye socket
        light(g, () => {
          for (let k = 0; k < 10; k++) {
            const [px, py] = sp(4 + k),
              y = py + (base - py) * (0.35 + 0.4 * hash(k, 109 + i)),
              fl = hash(k + Math.floor(t * 10), 9) < 0.3 + mf.hat * 1.4 ? 1 : 0.5;
            glow(g, px - 1.2 * m, y, (0.35 + 0.3 * mf.bass) * m, T.win[k % 3], (0.35 + 0.5 * mf.bass) * fl);
          }
          glow(g, hx - 1.2 * m, hy - 0.5 * m, (0.5 + 0.5 * mf.kick) * m, T.line, 0.4 + 0.6 * mf.kick);
        });
        g.lineCap = 'butt';
      });
    },
  },
  // floating obelisks: five black monoliths hanging over a ring of stones, bobbing slowly on their own, their glyphs
  // lighting one after another on the hats, a ring of light pulsing under each on the kick
  {
    id: 'obelisks',
    media: ['air', 'space'],
    tags: ['ancient', 'fantasy', 'future'],
    mood: [0.45, 0.4, 0.5],
    draw(f) {
      const { g, v, mf, T, t } = f,
        s = shades(f),
        tick = Math.floor(t * 8);
      mark(f, 0.17, 27, 0.7, 110, (X, base, i) => {
        const m = v.ppm * 0.23;
        // the ring of standing stones they float over
        g.fillStyle = s.dark;
        g.fillRect(X - 13 * m, base - 0.6 * m, 26 * m, 0.6 * m);
        for (let k = 0; k < 9; k++) {
          const x = X + (-12 + k * 3) * m,
            h = (1 + 1.2 * hash(k, 110 + i)) * m;
          g.fillRect(x - 0.35 * m, base - h, 0.7 * m, h);
        }
        for (let k = 0; k < 5; k++) {
          const dx = (k - 2) * 4.6 + (hash(k, 11 + i) - 0.5) * 1.5,
            h = 6 + 5 * hash(k, 23 + i) + (k === 2 ? 3 : 0),
            w = 0.9 + 0.4 * hash(k, 41),
            lift = 2 + 2.4 * hash(k, 7 + i) + Math.sin(t * 0.7 + k * 1.7) * 0.5,
            x = X + dx * m,
            y0 = base - lift * m,
            lean = (hash(k, 3) - 0.5) * 0.12;
          // the light under it, in a ring on the ground, on the kick
          light(g, () => {
            glow(g, x, base - 0.5 * m, (2 + 1.5 * mf.kick) * m, T.line, 0.15 + 0.4 * mf.kick);
            glow(g, x, y0 + 0.3 * m, (1 + 1.2 * mf.kick) * m, T.line, 0.25 + 0.5 * mf.kick);
          });
          g.save();
          g.translate(x, y0);
          g.rotate(lean);
          // its two faces, the lit and the dark, and its pyramidion tip
          g.fillStyle = s.body;
          poly(g, 0, 0, m, [[-w, 0], [-w * 0.8, h], [0, h + w * 1.3], [w * 0.15, h], [w * 0.2, 0]]);
          g.fillStyle = s.dark;
          poly(g, 0, 0, m, [[w * 0.2, 0], [w * 0.15, h], [0, h + w * 1.3], [w * 0.7, h], [w * 0.9, 0]]);
          g.fillStyle = s.rim;
          g.fillRect(-w * m, -h * m, 0.08 * m, h * m);
          // the glyphs down its face, lighting one after another on the hats
          const rows = Math.floor(h / 0.9);
          for (let r = 0; r < rows; r++) {
            const on = (r + tick + k * 3) % rows < 2 + Math.round(mf.hat * 6),
              gw = (0.2 + 0.5 * hash(r, k + 50)) * w;
            g.fillStyle = rgba(T.line, on ? 0.95 : 0.15);
            g.fillRect(-w * 0.55 * m, -(0.6 + r * 0.9) * m, gw * m, 0.18 * m);
            if (hash(r, k + 60) < 0.5) g.fillRect((-w * 0.55 + gw + 0.1) * m, -(0.75 + r * 0.9) * m, 0.14 * m, 0.4 * m);
          }
          g.restore();
          // a few stones hanging under it, drifting
          for (let q = 0; q < 3; q++) {
            const qy = base - (0.9 + q * 0.7 + Math.sin(t + q + k) * 0.3) * m;
            g.fillStyle = s.dark;
            g.fillRect(x + (q - 1) * 0.6 * m, qy, 0.3 * m, 0.25 * m);
          }
        }
      });
    },
  },
  // a suspension bridge: two great towers, the main cables hanging between them and down to their anchors, the
  // hangers, cars' headlights and tail lights streaming across its deck, the towers' red lights on the kick
  {
    id: 'suspension',
    tags: ['urban', 'modern', 'industrial', 'mild'],
    mood: [0.45, 0.6, 0.35],
    draw(f) {
      const { g, v, mf, T, t } = f,
        s = shades(f);
      mark(f, 0.17, 42, 0.7, 133, (X, base, i) => {
        const m = v.ppm * 0.27,
          deck = base - 5 * m,
          tw = 9,
          th = 16,
          cab = x => {
            // (the main cable's height in metres at x: sagging between the towers, falling to the anchors outside)
            const ax = Math.abs(x);
            if (ax <= tw) return th - 0.6 - (1 - (x / tw) ** 2) * (th - 6.5);
            return 6 + (th - 0.6 - 6) * (1 - (ax - tw) / 9) ** 1.4;
          };
        // the water's sheen under it
        g.fillStyle = rgba(T.line, 0.08 + 0.1 * mf.bass);
        g.fillRect(X - 22 * m, base - 0.4 * m, 44 * m, 0.4 * m);
        // the deck and its truss
        g.fillStyle = s.body;
        g.fillRect(X - 22 * m, deck, 44 * m, 0.7 * m);
        g.strokeStyle = s.dark;
        lattice(g, X - 22 * m, deck + 1.1 * m, X + 22 * m, deck + 1.1 * m, 0.8 * m, 1.2 * m, 0.07 * m);
        // the hangers from the cable down to the deck
        g.strokeStyle = s.rim;
        g.lineWidth = 0.05 * m;
        g.beginPath();
        for (let x = -17.5; x <= 17.5; x += 0.9) {
          g.moveTo(X + x * m, base - cab(x) * m);
          g.lineTo(X + x * m, deck);
        }
        g.stroke();
        // the main cable
        g.strokeStyle = s.body;
        g.lineWidth = 0.22 * m;
        g.beginPath();
        for (let x = -18; x <= 18; x += 0.5) {
          const y = base - cab(x) * m;
          x === -18 ? g.moveTo(X + x * m, y) : g.lineTo(X + x * m, y);
        }
        g.stroke();
        // the towers: two legs, crossbeams, an arched portal over the deck, piers into the water
        for (const sd of [-1, 1]) {
          const tx = X + sd * tw * m;
          g.fillStyle = s.body;
          g.fillRect(tx - 1 * m, base - th * m, 0.55 * m, th * m);
          g.fillRect(tx + 0.45 * m, base - th * m, 0.55 * m, th * m);
          for (const y of [th - 0.4, th - 5, 6.6]) g.fillRect(tx - 1 * m, base - y * m, 2 * m, 0.5 * m);
          g.fillStyle = s.dark;
          g.fillRect(tx - 1.4 * m, base - 1.4 * m, 2.8 * m, 1.4 * m);
          g.fillStyle = s.rim;
          g.fillRect(tx + 0.85 * m, base - th * m, 0.15 * m, th * m);
          glow(g, tx, base - (th + 0.3) * m, (0.35 + 0.6 * mf.kick) * m, '#ff3b4f', 0.4 + 0.6 * mf.kick);
          glow(g, tx, base - (th - 5.4) * m, (0.25 + 0.4 * mf.kick) * m, '#ff3b4f', 0.3 + 0.5 * mf.kick);
        }
        // the deck's lamps on the beat, and the traffic: white heads one way, red tails the other
        for (let k = 0; k < 22; k++) glow(g, X + (-21 + k * 2) * m, deck - 0.7 * m, 0.3 * m, T.win[0], 0.35 + 0.35 * mf.beat);
        for (let k = 0; k < 10; k++) {
          const dir = k % 2 ? 1 : -1,
            u = (t * (0.05 + 0.03 * hash(k, 111)) * dir + hash(k, 3 + i) + 10) % 1,
            x = X + (-22 + u * 44) * m;
          g.fillStyle = dir > 0 ? rgba('#ffffff', 0.9) : rgba('#ff3b4f', 0.9);
          g.fillRect(x, deck - 0.22 * m, 0.35 * m, 0.16 * m);
          if (dir > 0) light(g, () => glow(g, x + 0.5 * m, deck - 0.15 * m, 0.7 * m, T.win[0], 0.4));
        }
      });
    },
  },
  // an observatory on its peak: a great dome turning, its slit sliding round with it a notch each bar, the telescope
  // poking out of it, a guide laser shooting up into the sky from it on the downbeat, a little dome beside it
  {
    id: 'observatory',
    tags: ['tech', 'modern', 'cold', 'nature'],
    mood: [0.3, 0.6, 0.25],
    draw(f) {
      const { g, v, mf, T, t, L } = f,
        s = shades(f),
        bar = Math.floor(t / (L.A.beat * 4)) + Math.min(1, ((t / (L.A.beat * 4)) % 1) * 3);
      mark(f, 0.14, 34, 0.65, 412, (X, base, i) => {
        const m = v.ppm * 0.31,
          R = 4.2 * m,
          cy = base - 9 * m;
        // the peak and the road up it
        g.fillStyle = s.dark;
        poly(g, X, base, m, [[-16, 0], [-9, 4], [-6, 6.4], [-3.5, 7.4], [4.5, 7.4], [7, 6], [10.5, 3.2], [16, 0]]);
        g.strokeStyle = rgba(T.win[0], 0.25 + 0.25 * mf.beat);
        g.lineWidth = 0.08 * m;
        g.beginPath();
        g.moveTo(X - 13 * m, base - 1 * m);
        g.lineTo(X - 2 * m, base - 4 * m);
        g.lineTo(X - 9 * m, base - 5.6 * m);
        g.lineTo(X - 3.6 * m, base - 7.3 * m);
        g.stroke();
        // the laser: a thin line into the sky from the slit, on the downbeat and in the drops
        const az = Math.sin((bar * Math.PI) / 5 + i) * 0.6,
          slitX = X + Math.sin(az) * R * 0.8,
          las = Math.max(mf.down, mf.drop);
        if (las > 0.05)
          light(g, () => {
            g.strokeStyle = rgba(T.line, 0.25 + 0.7 * las);
            g.lineWidth = (0.06 + 0.12 * las) * m;
            g.beginPath();
            g.moveTo(slitX, cy - R * 0.7);
            g.lineTo(slitX + Math.sin(az * 0.6) * 30 * m, cy - 60 * m);
            g.stroke();
            glow(g, slitX + Math.sin(az * 0.6) * 18 * m, cy - 36 * m, (0.6 + 1.2 * las) * m, T.line, 0.5 * las);
          });
        // the building under the dome, its windows
        g.fillStyle = s.body;
        g.fillRect(X - 4.6 * m, cy, 9.2 * m, 1.6 * m);
        for (let k = 0; k < 7; k++) {
          const lit = hash(k + Math.floor(t * 4), 112 + i) < 0.4 + mf.hat;
          g.fillStyle = rgba(T.win[k % 3], lit ? 0.85 : 0.25);
          g.fillRect(X + (-4 + k * 1.2) * m, cy + 0.5 * m, 0.5 * m, 0.6 * m);
        }
        // the telescope out of the slit, pointing where the slit is, and a glow inside
        light(g, () => glow(g, slitX, cy - R * 0.5, (1.5 + 1.2 * mf.bass) * m, T.win[0], 0.3 + 0.3 * mf.bass));
        // the dome: a half-ball shaded from its lit side, its ribs, the slit
        const dg = g.createLinearGradient(X - R, 0, X + R, 0);
        dg.addColorStop(0, s.rim);
        dg.addColorStop(0.5, s.body);
        dg.addColorStop(1, s.dark);
        g.fillStyle = dg;
        g.beginPath();
        g.arc(X, cy, R, Math.PI, 0);
        g.fill();
        g.strokeStyle = s.dark;
        g.lineWidth = 0.06 * m;
        g.beginPath();
        for (let k = 1; k < 4; k++) {
          g.moveTo(X - R * Math.cos((k * Math.PI) / 8), cy - R * Math.sin((k * Math.PI) / 8));
          g.lineTo(X + R * Math.cos((k * Math.PI) / 8), cy - R * Math.sin((k * Math.PI) / 8));
        }
        g.stroke();
        const sw = Math.max(0.15, Math.cos(az)) * 0.7 * m;
        g.fillStyle = rgba(T.win[0], 0.5 + 0.3 * mf.bass);
        g.beginPath();
        g.moveTo(slitX - sw, cy);
        g.lineTo(slitX - sw * 0.6, cy - R * Math.cos(Math.abs(az) * 0.8) * 0.98);
        g.lineTo(slitX + sw * 0.6, cy - R * Math.cos(Math.abs(az) * 0.8) * 0.98);
        g.lineTo(slitX + sw, cy);
        g.fill();
        g.strokeStyle = s.body;
        g.lineWidth = 0.55 * m;
        g.beginPath();
        g.moveTo(slitX, cy - R * 0.45);
        g.lineTo(slitX + Math.sin(az * 0.6) * 4 * m, cy - R * 0.45 - 3.6 * m);
        g.stroke();
        // the little dome beside it
        g.fillStyle = s.body;
        g.fillRect(X + 5.2 * m, base - 8.4 * m, 2.6 * m, 1 * m);
        g.beginPath();
        g.arc(X + 6.5 * m, base - 8.4 * m, 1.3 * m, Math.PI, 0);
        g.fill();
        glow(g, X + 6.5 * m, base - 9.8 * m, (0.25 + 0.4 * mf.kick) * m, '#ff3b4f', 0.4 + 0.6 * mf.kick);
      });
    },
  },
  // an oil rig standing in the haze on its four legs: decks of pipes and lit windows, a derrick, a crane, a helipad, a
  // flare boom out to one side burning, flaring huge on the kick
  {
    id: 'oilrig',
    tags: ['industrial', 'modern', 'hot'],
    mood: [0.6, 0.35, 0.7],
    draw(f) {
      const { g, v, mf, T, t } = f,
        s = shades(f);
      mark(f, 0.16, 31, 0.7, 138, (X, base, i) => {
        const m = v.ppm * 0.23,
          d1 = base - 6 * m,
          d2 = base - 8.2 * m;
        // the legs, braced, into the haze
        g.strokeStyle = s.body;
        for (const dx of [-5, 4]) lattice(g, X + dx * m, base, X + (dx + 0.4) * m, d1, 1.4 * m, 1.3 * m, 0.14 * m);
        g.fillStyle = s.body;
        for (const dx of [-5.4, -4.2, 3.6, 4.8]) g.fillRect(X + dx * m, d1, 0.3 * m, 6 * m);
        // the decks: two floors of modules, pipes along them, windows
        g.fillRect(X - 8 * m, d1 - 0.5 * m, 15 * m, 0.5 * m);
        g.fillRect(X - 7 * m, d2, 7 * m, 2.2 * m);
        g.fillRect(X + 0.5 * m, d2 + 0.8 * m, 5.5 * m, 1.4 * m);
        g.fillStyle = s.dark;
        g.fillRect(X - 7.6 * m, d2 - 2 * m, 4 * m, 2 * m);
        for (let r = 0; r < 3; r++)
          for (let c = 0; c < 9; c++) {
            if (hash(r * 9 + c, 113) < 0.3) continue;
            const lit = hash(r * 9 + c + Math.floor(t * 5), 9 + i) < 0.4 + mf.hat;
            g.fillStyle = rgba(T.win[(r + c) % 3], lit ? 0.85 : 0.3);
            const x = c < 5 ? X + (-6.6 + c * 1.3) * m : X + (0.9 + (c - 5) * 1.3) * m,
              y = c < 5 ? d2 + (0.3 + r * 0.6) * m : d2 + (1 + Math.min(r, 1) * 0.6) * m;
            g.fillRect(x, y - (r === 2 && c < 5 ? 2.2 * m : 0), 0.6 * m, 0.3 * m);
          }
        // the helipad on its cantilever
        g.fillStyle = s.body;
        poly(g, X, base, m, [[-7.6, 10.2], [-11.5, 10.6], [-11.5, 10.9], [-7.6, 10.9]]);
        g.strokeStyle = s.body;
        lattice(g, X - 11 * m, base - 10.5 * m, X - 7.6 * m, base - 8.5 * m, 0.4 * m, 0.8 * m, 0.08 * m);
        for (let k = 0; k < 5; k++) glow(g, X + (-11.3 + k * 0.9) * m, base - 11 * m, 0.2 * m, '#7dff9a', 0.4 + 0.5 * mf.beat);
        // the derrick: a tall tapering lattice, a light at its crown
        g.strokeStyle = s.body;
        lattice(g, X - 3.6 * m, d2, X - 2.2 * m, base - 19 * m, 1.8 * m, 1.2 * m, 0.1 * m);
        lattice(g, X - 1 * m, d2, X - 2.2 * m, base - 19 * m, 0.4 * m, 1.2 * m, 0.1 * m);
        glow(g, X - 2.2 * m, base - 19.2 * m, (0.35 + 0.5 * mf.beat) * m, '#ff3b4f', 0.5 + 0.5 * mf.beat);
        // the crane: its boom slewing slowly
        const ca = -0.9 + Math.sin(t * 0.25 + i) * 0.25;
        g.strokeStyle = s.body;
        lattice(g, X + 3 * m, d2 + 0.8 * m, X + 3 * m + Math.cos(ca) * 8 * m, d2 + 0.8 * m + Math.sin(ca) * 8 * m, 0.45 * m, 0.7 * m, 0.08 * m);
        g.fillRect(X + 2.4 * m, d2 - 0.6 * m, 1.2 * m, 1.4 * m);
        // the flare boom, out from the deck's corner, and its flame: burning always, flaring on the kick
        const bx = X + 7 * m,
          by = d1 - 0.3 * m,
          fx = bx + 6 * m,
          fy = by - 6 * m;
        g.strokeStyle = s.body;
        lattice(g, bx, by, fx, fy, 0.5 * m, 0.8 * m, 0.08 * m);
        const fh = (2 + 4 * mf.kick + 2 * mf.drop) * m,
          lick = Math.sin(t * 11 + i) * 0.4 * m;
        light(g, () => {
          glow(g, fx, fy - fh * 0.4, fh * 1.1, T.win[0], 0.25 + 0.35 * mf.kick);
          for (const [w, col, k] of [[0.8, T.win[0], 1], [0.45, T.win[2], 0.7], [0.2, '#ffffff', 0.4]]) {
            g.fillStyle = rgba(col, 0.85);
            g.beginPath();
            g.moveTo(fx - w * m, fy);
            g.quadraticCurveTo(fx - w * m, fy - fh * 0.5 * k, fx + 0.8 * m * k + lick, fy - fh * k);
            g.quadraticCurveTo(fx + w * m, fy - fh * 0.5 * k, fx + w * m, fy);
            g.fill();
          }
          // (its light on the water under it)
          glow(g, fx, base - 0.3 * m, (3 + 3 * mf.kick) * m, T.win[0], 0.15 + 0.25 * mf.kick);
        });
      });
    },
  },
  // a golden stupa: white terraces, a great bell-shaped dome gilded and gleaming on the downbeat, its spire of rings,
  // the painted eyes on its tower; strings of prayer flags from its spire to the ground fluttering, harder on the hats
  {
    id: 'stupa',
    tags: ['ancient', 'warm', 'fantasy', 'mild'],
    mood: [0.3, 0.75, 0.2],
    draw(f) {
      const { g, v, mf, T, t } = f,
        s = shades(f),
        gold = mixHex(tint(f, '#e0a83a', T.far, 0.5), T.sky[2], 0.25),
        goldL = mixHex(gold, '#fff4c8', 0.25),
        FLAGS = ['#3a6cd8', '#f2f2f2', '#d8423a', '#3aa858', '#e8c83a'].map(c => mixHex(c, T.far, 0.55));
      mark(f, 0.15, 30, 0.7, 115, (X, base) => {
        const m = v.ppm * 0.25,
          tipY = base - 17 * m;
        // the prayer flags: strings from the spire out to the ground on both sides, little flags fluttering on them
        for (const sd of [-1, 1])
          for (const [reach, drop] of [[12, 3.6], [8.5, 4.4]]) {
            const ex = X + sd * reach * m,
              ey = base - drop * m,
              sx = X,
              sy = tipY + 2.2 * m,
              mx = (sx + ex) / 2,
              my = Math.max(sy, ey) - 1.5 * m + (sy - ey) * -0.25;
            g.strokeStyle = rgba(T.far, 0.8);
            g.lineWidth = 0.04 * m;
            g.beginPath();
            g.moveTo(sx, sy);
            g.quadraticCurveTo(mx, my, ex, ey);
            g.stroke();
            for (let k = 1; k < 18; k++) {
              const u = k / 18,
                px = (1 - u) ** 2 * sx + 2 * (1 - u) * u * mx + u * u * ex,
                py = (1 - u) ** 2 * sy + 2 * (1 - u) * u * my + u * u * ey,
                fl = Math.sin(t * 5 + k * 0.9 + sd) * (0.2 + 0.5 * mf.hat * 2);
              g.fillStyle = FLAGS[k % 5];
              g.beginPath();
              g.moveTo(px - 0.25 * m, py);
              g.lineTo(px + 0.25 * m, py);
              g.lineTo(px + (0.25 + fl * 0.3) * m, py + 0.55 * m);
              g.lineTo(px + (-0.25 + fl * 0.3) * m, py + 0.55 * m);
              g.fill();
            }
          }
        // the terraces
        const white = mixHex(T.far, T.sky[2], 0.3);
        g.fillStyle = white;
        poly(g, X, base, m, [[-8.5, 0], [-8.5, 1.2], [-7.2, 1.2], [-7.2, 2.4], [-6, 2.4], [-6, 3.5], [6, 3.5], [6, 2.4], [7.2, 2.4], [7.2, 1.2], [8.5, 1.2], [8.5, 0]]);
        g.fillStyle = s.dark;
        g.fillRect(X - 0.7 * m, base - 3.5 * m, 1.4 * m, 3.5 * m);
        for (let k = 0; k < 12; k++) glow(g, X + (-7.7 + k * 1.4) * m, base - 0.6 * m, 0.25 * m, T.win[0], 0.35 + 0.4 * mf.beat);
        // the dome: a bell of gold, lit from one side, a gleam sliding over it on the downbeat
        const dg = g.createLinearGradient(X - 5 * m, 0, X + 5 * m, 0);
        dg.addColorStop(0, goldL);
        dg.addColorStop(0.45, gold);
        dg.addColorStop(1, mixHex(gold, T.near, 0.5));
        g.fillStyle = dg;
        g.beginPath();
        g.moveTo(X - 5.2 * m, base - 3.5 * m);
        g.bezierCurveTo(X - 5.4 * m, base - 7.5 * m, X - 2.8 * m, base - 9 * m, X, base - 9 * m);
        g.bezierCurveTo(X + 2.8 * m, base - 9 * m, X + 5.4 * m, base - 7.5 * m, X + 5.2 * m, base - 3.5 * m);
        g.fill();
        light(g, () => glow(g, X - 2 * m, base - 7 * m, (2 + 3 * mf.down) * m, '#fff4c8', 0.15 + 0.5 * mf.down));
        // the harmika (its square tower) with the painted eyes
        g.fillStyle = gold;
        g.fillRect(X - 1.4 * m, base - 10.8 * m, 2.8 * m, 1.8 * m);
        g.fillStyle = mixHex(gold, T.near, 0.4);
        g.fillRect(X - 1.7 * m, base - 11.1 * m, 3.4 * m, 0.35 * m);
        g.fillStyle = rgba('#0b0b18', 0.85);
        for (const dx of [-0.6, 0.6]) {
          g.beginPath();
          g.ellipse(X + dx * m, base - 10 * m, 0.38 * m, 0.16 * m, 0, 0, TAU);
          g.fill();
        }
        g.fillStyle = rgba(T.line, 0.4 + 0.6 * mf.voice);
        for (const dx of [-0.6, 0.6]) g.fillRect(X + dx * m - 0.08 * m, base - 10.1 * m, 0.16 * m, 0.16 * m);
        // the spire of thirteen rings, narrowing, a parasol and a jewel at the tip on the kick
        g.fillStyle = gold;
        for (let k = 0; k < 13; k++) {
          const w = (1.1 - k * 0.07) * m,
            y = base - (11.1 + k * 0.42) * m;
          g.fillRect(X - w, y - 0.32 * m, w * 2, 0.32 * m);
        }
        g.beginPath();
        g.moveTo(X - 0.9 * m, tipY + 0.9 * m);
        g.quadraticCurveTo(X, tipY, X + 0.9 * m, tipY + 0.9 * m);
        g.fill();
        g.fillRect(X - 0.06 * m, tipY - 0.8 * m, 0.12 * m, 0.9 * m);
        light(g, () => glow(g, X, tipY - 0.9 * m, (0.5 + 1.2 * mf.kick) * m, '#fff4c8', 0.5 + 0.5 * mf.kick));
      });
    },
  },
  // a Roman aqueduct striding across the land on two tiers of arches, broken at one end where its channel pours out in
  // a waterfall, glints running along its water on the hats, the arches lit from under on the beat
  {
    id: 'aqueduct',
    tags: ['ancient', 'warm', 'mild', 'nature'],
    mood: [0.35, 0.6, 0.3],
    draw(f) {
      const { g, v, mf, T, t } = f,
        s = shades(f),
        tick = Math.floor(t * 10);
      mark(f, 0.18, 36, 0.7, 118, (X, base, i) => {
        const m = v.ppm * 0.34,
          span = 3.2,
          n = 8,
          top = 11;
        // the arches lit from under on the beat: a glow behind each lower arch
        for (let k = 0; k < n; k++) glow(g, X + (-((n - 1) * span) / 2 + k * span) * m, base - 2.5 * m, 2.4 * m, T.win[k % 3], 0.1 + 0.3 * mf.beat);
        // the masonry: piers and two tiers of arches, the upper tier smaller, cut out of a slab (even-odd)
        g.fillStyle = s.body;
        g.beginPath();
        g.moveTo(X + (-(n * span) / 2) * m, base);
        g.lineTo(X + (-(n * span) / 2) * m, base - top * m);
        g.lineTo(X + ((n * span) / 2 - 1.2) * m, base - top * m);
        g.lineTo(X + ((n * span) / 2 - 1.8) * m, base - (top - 1.3) * m);
        g.lineTo(X + ((n * span) / 2 - 1.2) * m, base - (top - 2.4) * m);
        g.lineTo(X + ((n * span) / 2) * m, base - (top - 3) * m);
        g.lineTo(X + ((n * span) / 2) * m, base);
        g.closePath();
        for (let k = 0; k < n; k++) {
          const cx = X + (-(n * span) / 2 + span / 2 + k * span) * m,
            hw = span * 0.36 * m;
          g.moveTo(cx - hw, base);
          g.lineTo(cx - hw, base - 4.6 * m);
          g.arc(cx, base - 4.6 * m, hw, Math.PI, 0);
          g.lineTo(cx + hw, base);
          g.closePath();
          if (k < n - 1)
            for (const q of [-0.25, 0.25]) {
              const ux = cx + q * span * m,
                uw = span * 0.17 * m;
              g.moveTo(ux - uw, base - 7 * m);
              g.lineTo(ux - uw, base - 8.6 * m);
              g.arc(ux, base - 8.6 * m, uw, Math.PI, 0);
              g.lineTo(ux + uw, base - 7 * m);
              g.closePath();
            }
        }
        g.fill('evenodd');
        // the string courses and the rim along the top
        g.fillStyle = s.rim;
        g.fillRect(X - (n * span * m) / 2, base - 6.9 * m, (n * span - 0.6) * m, 0.3 * m);
        g.fillRect(X - (n * span * m) / 2, base - (top - 0.6) * m, (n * span - 1.4) * m, 0.2 * m);
        // the water in its channel along the top, glints running along it
        const wc = mixHex(T.sky[2], '#ffffff', 0.4);
        g.fillStyle = rgba(wc, 0.6);
        g.fillRect(X - (n * span * m) / 2, base - top * m - 0.25 * m, (n * span - 1.2) * m, 0.25 * m);
        for (let k = 0; k < 14; k++) {
          const u = (k / 14 + t * 0.06 + hash(k, 115) * 0.05) % 1,
            on = (k + tick) % 5 < 1 + mf.hat * 4;
          g.fillStyle = rgba('#ffffff', on ? 0.95 : 0.35);
          g.fillRect(X + (-(n * span) / 2 + u * (n * span - 1.4)) * m, base - top * m - 0.22 * m, 0.4 * m, 0.1 * m);
        }
        // the waterfall pouring out of the broken end: a sheet falling, streaks down it, spray at its foot on the bass
        const fx = X + ((n * span) / 2 - 1.2) * m,
          fy = base - top * m,
          gr = g.createLinearGradient(0, fy, 0, base);
        gr.addColorStop(0, rgba(wc, 0.75));
        gr.addColorStop(1, rgba(wc, 0.4));
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(fx, fy - 0.25 * m);
        g.quadraticCurveTo(fx + 1.4 * m, fy, fx + 1.8 * m, base);
        g.lineTo(fx + 0.9 * m, base);
        g.quadraticCurveTo(fx + 0.6 * m, fy + 1 * m, fx, fy);
        g.fill();
        for (let k = 0; k < 6; k++) {
          const u = (t * 0.8 + hash(k, 5 + i)) % 1,
            yy = fy + u * (base - fy);
          g.fillStyle = rgba('#ffffff', 0.7 * (1 - u * 0.5));
          g.fillRect(fx + (0.5 + 1.2 * Math.sqrt(u)) * m + hash(k, 2) * 0.3 * m, yy, 0.1 * m, 0.8 * m);
        }
        light(g, () => glow(g, fx + 1.4 * m, base - 0.4 * m, (1.5 + 2 * mf.bass) * m, wc, 0.25 + 0.35 * mf.bass));
        // cypresses at its feet
        g.fillStyle = s.dark;
        for (const dx of [-15, -13.8, 14.6]) {
          const h = 4 + hash(dx + 20, 3) * 2;
          g.beginPath();
          g.ellipse(X + dx * m, base - (h / 2) * m, 0.55 * m, (h / 2) * m, 0, 0, TAU);
          g.fill();
        }
      });
    },
  },
  // totem poles: three giant carved poles of stacked faces (beaks, brows, mouths), wings spread on the tallest, the
  // faces' eyes lit in turn on the kick, all of them blazing on the drops
  {
    id: 'totems',
    tags: ['ancient', 'nature', 'fantasy', 'cold'],
    mood: [0.55, 0.45, 0.55],
    draw(f) {
      const { g, v, mf, T } = f,
        s = shades(f),
        { n } = beatOf(f);
      mark(f, 0.18, 27, 0.7, 236, (X, base, i) => {
        const m = v.ppm * 0.28;
        let face = 0;
        for (const [dx, H, w] of [[-5, 10, 1.3], [0, 14, 1.6], [5.4, 11.5, 1.35]]) {
          const px = X + dx * m,
            seg = 2.3,
            k = Math.floor(H / seg);
          g.fillStyle = s.body;
          g.fillRect(px - w * m, base - H * m, w * 2 * m, H * m);
          g.fillStyle = s.rim;
          g.fillRect(px - w * m, base - H * m, 0.15 * m, H * m);
          for (let q = 0; q < k; q++) {
            const y = base - (q + 0.5) * seg * m,
              kind = Math.floor(hash(q, dx + 116 + i) * 3);
            face++;
            // the carving: a brow ridge, a nose or a beak, a mouth
            g.fillStyle = s.rim;
            g.fillRect(px - w * m, y - 1.15 * m, w * 2 * m, 0.12 * m);
            g.fillStyle = s.dark;
            g.fillRect(px - w * 0.85 * m, y - 0.75 * m, w * 1.7 * m, 0.22 * m);
            g.fillStyle = s.body;
            if (kind === 0) poly(g, px, y, m, [[-0.25, 0.3], [0, 0.4], [w + 0.9, -0.2], [0.25, -0.5]]);
            else if (kind === 1) poly(g, px, y, m, [[-0.3, 0.3], [0.3, 0.3], [0.45, -0.3], [-0.45, -0.3]]);
            else {
              g.fillRect(px - (w + 0.5) * m, y - 0.9 * m, 0.5 * m, 1.2 * m);
              g.fillRect(px + w * m, y - 0.9 * m, 0.5 * m, 1.2 * m);
            }
            g.fillStyle = s.dark;
            g.fillRect(px - w * 0.6 * m, y + 0.55 * m, w * 1.2 * m, 0.3 * m);
            g.fillStyle = s.rim;
            for (let tt = 0; tt < 4; tt++) g.fillRect(px + (-w * 0.5 + tt * w * 0.3) * m, y + 0.55 * m, 0.08 * m, 0.3 * m);
            // its eyes: lit in turn up the poles on the kick
            const on = (face + n) % 4 === 0,
              a = 0.45 + (on ? 0.5 * Math.max(mf.kick, 0.5) : 0) + 0.5 * mf.drop,
              col = on ? T.line : T.win[0];
            light(g, () => {
              for (const ex of [-0.45, 0.45]) glow(g, px + ex * w * m, y - 0.5 * m, (0.2 + (on ? 0.2 * mf.kick : 0) + 0.15 * mf.drop) * m, col, a);
            });
          }
          // the top: wings spread on the tallest, a head with ears on the others
          g.fillStyle = s.body;
          if (H > 13) {
            const flap = 0.4 * mf.down;
            for (const sd of [-1, 1])
              poly(g, px, base - H * m, m, [[sd * w, 0], [sd * (w + 4.5), 1.8 + flap * 2], [sd * (w + 4), 1 + flap], [sd * (w + 3.4), 1.2 + flap], [sd * (w + 3), 0.4 + flap * 0.5], [sd * (w + 2.2), 0.6], [sd * (w + 1.6), -0.6], [sd * w, -1.2]]);
            poly(g, px, base - H * m, m, [[-w * 0.8, 0], [-w * 0.6, 1.4], [0, 1.9], [w * 0.6, 1.4], [w * 1.9, 0.6], [w * 0.8, 0]]);
          } else {
            poly(g, px, base - H * m, m, [[-w, 0], [-w, 0.9], [-w * 0.6, 1.6], [-w * 0.3, 0.9], [w * 0.3, 0.9], [w * 0.6, 1.6], [w, 0.9], [w, 0]]);
          }
        }
      });
    },
  },
  // a zeppelin: a huge ribbed airship drifting high, its gondola's windows lit, its fins, its propellers spinning, and
  // two searchlights under it sweeping the ground, swinging on the beat; its hull lit on the drops
  {
    id: 'zeppelin',
    tags: ['modern', 'fantasy', 'urban', 'mild'],
    mood: [0.45, 0.55, 0.35],
    draw(f) {
      const { g, v, mf, T, t } = f,
        s = shades(f),
        { b } = beatOf(f);
      mark(f, 0.12, 33, 0.7, 157, (X, base, i) => {
        const m = v.ppm * 0.29,
          cx = X + Math.sin(t * 0.1 + i) * 2 * m,
          cy = base - (13 + Math.sin(t * 0.4 + i) * 0.6) * m,
          L = 11 * m,
          Hh = 3 * m;
        // the searchlights, under the gondola, sweeping the ground
        light(g, () => {
          for (const sd of [-1, 1]) {
            const a = Math.PI + sd * (0.35 + 0.25 * Math.sin(b * Math.PI * 0.5 + sd));
            beam(g, cx + sd * 1.2 * m, cy + Hh + 1.2 * m, a, 18 * m, 0.09, T.win[0], 0.2 + 0.2 * mf.beat);
          }
        });
        // the fins
        g.fillStyle = s.dark;
        poly(g, cx, cy, m, [[-8, 0.2], [-11.8, 3.6], [-12, 3.4], [-11.2, 0]]);
        poly(g, cx, cy, m, [[-8, -0.2], [-11.8, -3.6], [-12, -3.4], [-11.2, 0]]);
        // the hull: a long envelope, shaded top to bottom, its rib lines
        const hg = g.createLinearGradient(0, cy - Hh, 0, cy + Hh);
        hg.addColorStop(0, s.rim);
        hg.addColorStop(0.5, s.body);
        hg.addColorStop(1, s.dark);
        g.fillStyle = hg;
        g.beginPath();
        g.moveTo(cx - L, cy);
        g.bezierCurveTo(cx - L * 0.7, cy - Hh * 1.05, cx + L * 0.55, cy - Hh * 1.05, cx + L, cy);
        g.bezierCurveTo(cx + L * 0.55, cy + Hh * 1.05, cx - L * 0.7, cy + Hh * 1.05, cx - L, cy);
        g.fill();
        g.strokeStyle = rgba(T.near, 0.35);
        g.lineWidth = 0.06 * m;
        g.beginPath();
        for (let k = -4; k <= 4; k++) {
          const x = cx + k * 2.1 * m,
            hh = Hh * Math.sqrt(Math.max(0, 1 - (k / 5.2) ** 2));
          g.moveTo(x, cy - hh);
          g.quadraticCurveTo(x + 0.35 * m, cy, x, cy + hh);
        }
        g.moveTo(cx - L * 0.95, cy);
        g.lineTo(cx + L * 0.95, cy);
        g.stroke();
        // its lights along the hull: a chase on the beat, and the hull lit on the drops
        for (let k = 0; k < 12; k++) {
          const x = cx + (-9 + k * 1.6) * m,
            on = (k + Math.floor(b)) % 4 === 0;
          g.fillStyle = rgba(T.win[k % 3], on ? 0.95 : 0.3 + 0.5 * mf.drop);
          g.fillRect(x, cy + Hh * 0.55, 0.3 * m, 0.2 * m);
        }
        light(g, () => glow(g, cx, cy, (6 + 4 * mf.drop) * m, T.line, 0.25 * mf.drop));
        // the gondola under it, its windows, and the engine pods with their propellers spinning
        g.fillStyle = s.body;
        poly(g, cx, cy, m, [[-2.6, -Hh / m + 0.2], [-2.2, -Hh / m - 1.3], [2.4, -Hh / m - 1.3], [3, -Hh / m + 0.2]]);
        for (let k = 0; k < 6; k++) {
          g.fillStyle = rgba(T.win[k % 3], 0.5 + 0.4 * mf.bass);
          g.fillRect(cx + (-2 + k * 0.75) * m, cy + Hh + 0.3 * m, 0.45 * m, 0.4 * m);
        }
        for (const px of [-4.5, 4]) {
          const ex = cx + px * m,
            ey = cy + Hh * 0.95;
          g.fillStyle = s.body;
          g.fillRect(ex - 0.9 * m, ey - 0.25 * m, 1.8 * m, 0.55 * m);
          const blade = Math.abs(Math.sin(t * 14 + px)) * 0.9 * m;
          g.fillStyle = rgba(T.far, 0.8);
          g.fillRect(ex - 1.05 * m, ey - blade, 0.12 * m, blade * 2);
        }
        glow(g, cx + L, cy, (0.3 + 0.4 * mf.kick) * m, '#ff3b4f', 0.5 + 0.5 * mf.kick);
        glow(g, cx - 11.8 * m, cy - 3.5 * m, (0.25 + 0.3 * mf.hat) * m, '#7dff9a', 0.4 + 0.6 * mf.hat);
      });
    },
  },
  // a world tree: a colossal trunk rising out of its roots, branches spreading into a crown, strings of lanterns
  // hanging from them swaying, glowing veins of sap climbing the trunk with the bass, fireflies on the hats
  {
    id: 'worldtree',
    tags: ['fantasy', 'nature', 'ancient', 'mild'],
    mood: [0.35, 0.65, 0.25],
    draw(f) {
      const { g, v, mf, T, t } = f,
        s = shades(f);
      mark(f, 0.12, 32, 0.65, 139, (X, base, i) => {
        const m = v.ppm * 0.18,
          crownY = base - 15 * m;
        // the trunk and its roots, and the branches up into the crown
        g.fillStyle = s.body;
        g.beginPath();
        g.moveTo(X - 9 * m, base);
        g.quadraticCurveTo(X - 4 * m, base - 0.6 * m, X - 2.4 * m, base - 3.5 * m);
        g.quadraticCurveTo(X - 1.7 * m, base - 9 * m, X - 2.6 * m, crownY + 2 * m);
        g.lineTo(X + 2.6 * m, crownY + 2 * m);
        g.quadraticCurveTo(X + 1.8 * m, base - 9 * m, X + 2.6 * m, base - 3.5 * m);
        g.quadraticCurveTo(X + 4.5 * m, base - 0.6 * m, X + 10 * m, base);
        g.fill();
        g.strokeStyle = s.body;
        g.lineCap = 'round';
        const br = [[-2, 13, -10, 14.5, 1.1], [-1, 14, -6, 18, 0.9], [1.5, 14, 7, 18.5, 0.9], [2, 13, 11, 14.8, 1.1], [0, 15, 1, 20, 0.8], [-1.5, 11.5, -12.5, 11.6, 0.7], [1.8, 11.5, 13, 11.8, 0.7]];
        for (const [x0, y0, x1, y1, w] of br) {
          g.lineWidth = w * m;
          g.beginPath();
          g.moveTo(X + x0 * m, base - y0 * m);
          g.quadraticCurveTo(X + ((x0 + x1) / 2) * m, base - (Math.max(y0, y1) + 0.8) * m, X + x1 * m, base - y1 * m);
          g.stroke();
        }
        // the crown: a cloud of leaves at the end of each branch, apart from the next so the boughs show between them,
        // each lit along its top by the sky and breathing a little with the bass
        const puff = 1 + 0.04 * mf.bass;
        for (const pass of [0, 1])
          br.forEach(([, , x1, y1], k) => {
            for (let q = 0; q < 4; q++) {
              const bx = X + (x1 + (hash(k * 4 + q, 31) - 0.5) * 4.4) * m,
                by = base - (y1 + 0.6 + (hash(k * 4 + q, 37) - 0.3) * 2.6) * m,
                r = (1.5 + 1.1 * hash(k * 4 + q, 41)) * m * puff;
              if (pass === 0) {
                g.fillStyle = s.dark;
                g.beginPath();
                g.arc(bx + 0.35 * m, by + 0.3 * m, r, 0, TAU);
                g.fill();
              } else {
                g.fillStyle = s.body;
                g.beginPath();
                g.arc(bx, by, r * 0.88, 0, TAU);
                g.fill();
                g.strokeStyle = s.rim;
                g.lineWidth = 0.18 * m;
                g.beginPath();
                g.arc(bx, by, r * 0.8, Math.PI * 1.05, Math.PI * 1.7);
                g.stroke();
              }
            }
          });
        // the sap: veins of light up the trunk, climbing with the bass
        light(g, () => {
          const up = Math.max(0.05, Math.min(0.95, 0.25 + 0.75 * mf.bass));
          for (const dx of [-0.9, 0.2, 1.1]) {
            const gr = g.createLinearGradient(0, base, 0, crownY);
            gr.addColorStop(0, rgba(T.line, 0.7));
            gr.addColorStop(up, rgba(T.line, 0.25));
            gr.addColorStop(Math.min(1, up + 0.05), rgba(T.line, 0));
            g.strokeStyle = gr;
            g.lineWidth = 0.14 * m;
            g.beginPath();
            g.moveTo(X + dx * 2 * m, base - 0.5 * m);
            g.bezierCurveTo(X + dx * 0.4 * m, base - 6 * m, X + dx * 1.6 * m, base - 10 * m, X + dx * m, crownY + 2 * m);
            g.stroke();
          }
          glow(g, X, base - 2 * m, (3 + 2 * mf.bass) * m, T.line, 0.15 + 0.3 * mf.bass);
        });
        // the lanterns: strings hanging from the branches, swaying, lit warm
        for (let k = 0; k < 14; k++) {
          const [x0, y0, x1, y1] = br[k % br.length],
            u = 0.35 + 0.55 * hash(k, 118 + i),
            ax = X + (x0 + (x1 - x0) * u) * m,
            ay = base - (y0 + (y1 - y0) * u + 0.6) * m,
            len = (1.5 + 3 * hash(k, 3)) * m,
            sw = Math.sin(t * 1.3 + k) * 0.12,
            lx = ax + Math.sin(sw) * len,
            ly = ay + Math.cos(sw) * len;
          g.strokeStyle = rgba(T.near, 0.7);
          g.lineWidth = 0.04 * m;
          g.beginPath();
          g.moveTo(ax, ay);
          g.lineTo(lx, ly);
          g.stroke();
          light(g, () => glow(g, lx, ly, (0.45 + 0.4 * mf.beat) * m, T.win[k % 3], 0.6 + 0.35 * mf.beat));
          g.fillStyle = rgba(T.win[k % 3], 0.95);
          g.fillRect(lx - 0.12 * m, ly - 0.15 * m, 0.24 * m, 0.3 * m);
        }
        // fireflies round the crown, more of them on the hats
        for (let k = 0; k < 18; k++) {
          const on = hash(k + Math.floor(t * 6), 77 + i) < 0.3 + mf.hat * 1.5;
          if (!on) continue;
          const fx = X + (hash(k, 4) - 0.5) * 26 * m + Math.sin(t + k) * 0.6 * m,
            fy = base - (6 + hash(k, 8) * 14) * m + Math.cos(t * 0.8 + k) * 0.5 * m;
          glow(g, fx, fy, 0.35 * m, T.win[1], 0.8);
        }
        g.lineCap = 'butt';
      });
    },
  },
  // a field of radio dishes: five great dishes of falling size, all re-aiming together on each bar, the receivers at
  // their focus blinking on the hats, rings of signal rising off the biggest on the kick
  {
    id: 'dishes',
    media: ['air', 'space'],
    tags: ['tech', 'future', 'modern', 'cold'],
    mood: [0.35, 0.5, 0.4],
    draw(f) {
      const { g, v, mf, T, t, L } = f,
        s = shades(f),
        bar = Math.floor(t / (L.A.beat * 4)) + Math.min(1, ((t / (L.A.beat * 4)) % 1) * 2.5),
        { u } = beatOf(f);
      mark(f, 0.17, 38, 0.7, 159, (X, base, i) => {
        const m = v.ppm * 0.34;
        g.fillStyle = s.dark;
        g.fillRect(X - 16 * m, base - 0.5 * m, 32 * m, 0.5 * m);
        for (const [dx, sc] of [[-11, 0.55], [-6.5, 0.7], [0, 1], [7, 0.75], [12, 0.5]]) {
          const px = X + dx * m,
            R = 5 * sc * m,
            mh = 6 * sc * m,
            hub = base - mh,
            aim = -0.5 + 0.35 * Math.sin(bar * 1.3 + i) + dx * 0.01;
          // the mount: a pedestal and a yoke
          g.fillStyle = s.body;
          poly(g, px, base, m, [[-1.4 * sc, 0], [-0.6 * sc, mh / m], [0.6 * sc, mh / m], [1.4 * sc, 0]]);
          g.fillRect(px - 0.8 * sc * m, hub - 0.4 * sc * m, 1.6 * sc * m, 0.8 * sc * m);
          // the dish: its bowl seen edge-ish (an ellipse pointing at aim), the inside lit by the rim's light
          g.save();
          g.translate(px, hub - 0.3 * sc * m);
          g.rotate(aim);
          // (the back of its shell under it, then the whole lit face of the bowl over that)
          g.fillStyle = s.body;
          g.beginPath();
          g.ellipse(0, -R * 0.15, R, R * 0.5, 0, 0, Math.PI);
          g.quadraticCurveTo(0, R * 0.75, -R, -R * 0.15);
          g.fill();
          g.fillStyle = mixHex(s.rim, T.sky[2], 0.25);
          g.beginPath();
          g.ellipse(0, -R * 0.15, R, R * 0.5, 0, 0, TAU);
          g.fill();
          // its ribs on the inside
          g.strokeStyle = rgba(T.far, 0.7);
          g.lineWidth = 0.05 * m;
          g.beginPath();
          for (let k = -2; k <= 2; k++) {
            g.moveTo(k * R * 0.38, -R * 0.15 - R * 0.48 * Math.sqrt(1 - (k * 0.38) ** 2));
            g.lineTo(0, -R * 0.15);
            g.lineTo(k * R * 0.38, -R * 0.15 + R * 0.48 * Math.sqrt(1 - (k * 0.38) ** 2));
          }
          g.stroke();
          // (its lip, catching the light on the kick)
          g.strokeStyle = rgba(T.line, 0.25 + 0.5 * mf.kick);
          g.lineWidth = (0.08 + 0.06 * mf.kick) * m;
          g.beginPath();
          g.ellipse(0, -R * 0.15, R, R * 0.5, 0, 0, TAU);
          g.stroke();
          // the feed: a tripod up to the receiver at its focus
          g.strokeStyle = s.body;
          g.lineWidth = 0.1 * sc * m;
          g.beginPath();
          g.moveTo(-R * 0.8, -R * 0.15);
          g.lineTo(0, -R * 0.95);
          g.lineTo(R * 0.8, -R * 0.15);
          g.moveTo(0, -R * 0.15);
          g.lineTo(0, -R * 0.95);
          g.stroke();
          const lit = hash(Math.floor(t * 8) + dx, 119) < 0.3 + mf.hat * 1.5;
          glow(g, 0, -R * 0.98, (0.3 + 0.5 * sc) * m, T.line, lit ? 0.95 : 0.35);
          g.fillStyle = s.body;
          g.fillRect(-0.25 * sc * m, -R * 1.05, 0.5 * sc * m, 0.3 * sc * m);
          // the signal: rings going up off the biggest one, one per beat, bright on the kick
          if (sc === 1)
            light(g, () => {
              for (let q = 0; q < 3; q++) {
                const age = (q + u) / 3,
                  rr = (1 + age * 7) * m;
                g.strokeStyle = rgba(T.line, (1 - age) * (0.3 + 0.6 * mf.kick));
                g.lineWidth = (0.08 + 0.1 * mf.kick) * m;
                g.beginPath();
                g.arc(0, -R * 0.98, rr, -Math.PI * 0.85, -Math.PI * 0.15);
                g.stroke();
              }
            });
          g.restore();
        }
      });
    },
  },
  // a ziggurat: a stepped temple of six terraces, a stair up its face, a shrine on top; torches along its terraces
  // flickering on the hats, lights running up its stair on the beat, and a beam of light from the shrine into the sky
  // on the drops (a faint one on each downbeat)
  {
    id: 'ziggurat',
    tags: ['ancient', 'hot', 'fantasy', 'warm'],
    mood: [0.65, 0.5, 0.6],
    draw(f) {
      const { g, v, mf, T, t } = f,
        s = shades(f),
        { n, u } = beatOf(f);
      mark(f, 0.13, 32, 0.7, 140, (X, base, i) => {
        const m = v.ppm * 0.29,
          tiers = 6,
          th = 2,
          topY = base - tiers * th * m - 2.6 * m,
          pow = Math.max(mf.drop, 0.35 * mf.down);
        // the beam into the sky, behind it all
        if (pow > 0.03)
          light(g, () => {
            const w = (0.8 + 2.2 * pow) * m,
              gr = g.createLinearGradient(0, topY, 0, 0);
            gr.addColorStop(0, rgba(T.line, 0.85 * pow));
            gr.addColorStop(1, rgba(T.line, 0.15 * pow));
            g.fillStyle = gr;
            g.beginPath();
            g.moveTo(X - w * 0.5, topY);
            g.lineTo(X - w * 1.6, -v.H);
            g.lineTo(X + w * 1.6, -v.H);
            g.lineTo(X + w * 0.5, topY);
            g.fill();
            glow(g, X, topY, (3 + 4 * pow) * m, T.line, 0.6 * pow);
          });
        // the terraces: each smaller than the one below, a lit rim along each top, a darker side face
        for (let k = 0; k < tiers; k++) {
          const w = (14 - k * 2.1) * m,
            y = base - (k + 1) * th * m;
          g.fillStyle = s.body;
          g.fillRect(X - w, y, w * 2, th * m);
          g.fillStyle = s.dark;
          g.fillRect(X + w - 1.2 * m, y, 1.2 * m, th * m);
          g.fillStyle = s.rim;
          g.fillRect(X - w, y, w * 2 - 1.2 * m, 0.15 * m);
          // the recesses down each terrace's face
          g.fillStyle = s.dark;
          for (let q = -w / m + 1.2; q < w / m - 2; q += 1.6) g.fillRect(X + q * m, y + 0.5 * m, 0.25 * m, (th - 0.6) * m);
          // the torches at the corners, flickering on the hats
          for (const sd of [-1, 1]) {
            const fl = hash(k * 2 + (sd > 0) + Math.floor(t * 9), 120 + i) < 0.4 + mf.hat * 1.5 ? 1 : 0.55;
            glow(g, X + sd * (w - 0.5 * m), y - 0.4 * m, (0.5 + 0.4 * mf.hat) * m, T.win[0], 0.7 * fl);
          }
        }
        // the stair up its face, lights running up it on the beat
        g.fillStyle = s.dark;
        poly(g, X, base, m, [[-2.2, 0], [-1.2, tiers * th], [1.2, tiers * th], [2.2, 0]]);
        g.fillStyle = s.rim;
        for (let k = 0; k < tiers * 4; k++) {
          const y = (k + 0.5) * (th / 4),
            w = 2.2 - (y / (tiers * th)) * 1;
          g.fillRect(X - w * m, base - y * m, w * 2 * m, 0.06 * m);
        }
        const up = ((n % 2) + u) / 2;
        for (const sd of [-1, 1]) glow(g, X + sd * (2.2 - up) * m, base - up * tiers * th * m, (0.4 + 0.5 * mf.beat) * m, T.win[1], 0.4 + 0.6 * mf.beat);
        // the shrine on top: a block with a doorway glowing, horns at its corners
        g.fillStyle = s.body;
        g.fillRect(X - 2.4 * m, topY, 4.8 * m, 2.6 * m);
        poly(g, X, topY, m, [[-2.6, 0], [-3, 0.8], [-2.2, 0], [2.2, 0], [3, 0.8], [2.6, 0]]);
        g.fillStyle = rgba(T.win[0], 0.4 + 0.5 * Math.max(mf.kick, pow));
        g.fillRect(X - 0.6 * m, topY + 0.8 * m, 1.2 * m, 1.8 * m);
      });
    },
  },
];

for (const mk of MARKS) registerPart({ slot: 'mark', media: ['air'], ...mk });
