// (a pack of parts: see registry.js) Twenty landmarks of the pack's own: big far-off silhouettes, each one a thing of
// its own (an arcology, a ring over the horizon, a sky jellyfish, a colossal hand), seen now and then along the way,
// drawn in the song's palette, their lights and moving bits playing the song.
import { registerPart } from '../../registry.js';
import { landmark, glow } from '../../../render/places/kit.js';
import { hash, rgba } from '../../../render/util.js';

const TAU = Math.PI * 2;
// two hex colours mixed, as hex (so rgba() can take it)
function mix(a, b, u) {
  const p = parseInt(a.slice(1), 16),
    q = parseInt(b.slice(1), 16),
    c = s => Math.round(((p >> s) & 255) * (1 - u) + ((q >> s) & 255) * u);
  return '#' + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1);
}
// the tones of a far silhouette: its body, its lit side (toward the horizon's haze), its shadow side
function tones(T) {
  return { body: T.far, lit: mix(T.far, T.sky[2], 0.3), dark: mix(T.far, '#000000', 0.3) };
}
// a closed polygon from flat [x, y, x, y, ...] screen points
function poly(g, p) {
  g.beginPath();
  g.moveTo(p[0], p[1]);
  for (let k = 2; k < p.length; k += 2) g.lineTo(p[k], p[k + 1]);
  g.closePath();
  g.fill();
}
// where the song is in beats (a phase to swing, chase and tick by)
const beats = f => f.t / f.L.A.beat;
// a soft glow that adds light (for beams and lit cores)
function addGlow(g, X, Y, r, col, a) {
  g.globalCompositeOperation = 'lighter';
  glow(g, X, Y, r, col, a);
  g.globalCompositeOperation = 'source-over';
}

const MARKS = [
  // an arcology: a stepped megastructure of five tiers, each tier's windows in rows, lights running along its ledges
  // with the hats, sky bridges between its two cores, a spire whose beacon flares on the downbeat
  {
    id: 'megatower',
    tags: ['urban', 'future', 'tech', 'neon'],
    mood: [0.6, 0.5, 0.5],
    draw(f) {
      const { g, v, mf, T, t } = f,
        c = tones(T);
      landmark(f, 0.14, 35, 0.7, 221, (X, base, i) => {
        const m = v.ppm * 0.25;
        let y = base,
          w = 11;
        const tiers = [3.2, 3, 2.8, 2.6, 2.4];
        tiers.forEach((h, k) => {
          const top = y - h * m;
          g.fillStyle = c.body;
          g.fillRect(X - (w / 2) * m, top, w * m, h * m);
          // (its shadow side and its lit ledge)
          g.fillStyle = c.dark;
          g.fillRect(X + (w / 2 - w * 0.22) * m, top, w * 0.22 * m, h * m);
          g.fillStyle = c.lit;
          g.fillRect(X - (w / 2 + 0.3) * m, top - 0.18 * m, (w + 0.6) * m, 0.18 * m);
          // windows: rows of cells, more of them lit as the song grows, a row lit on the beat
          const cols = Math.floor(w / 0.45),
            row = Math.floor(beats(f)) % 4;
          for (let r = 0; r < 4; r++)
            for (let q = 0; q < cols; q++) {
              const h2 = hash(q + k * 97 + i * 13, r + 7);
              const on = h2 < 0.15 + 0.35 * mf.stage || (r === row && h2 < 0.5 + 0.3 * mf.bass);
              if (!on) continue;
              g.fillStyle = rgba(T.win[Math.floor(h2 * 9) % 3], 0.35 + 0.4 * mf.beat);
              g.fillRect(X + (-w / 2 + 0.15 + q * 0.45) * m, top + (0.4 + r * 0.62) * m, 0.24 * m, 0.3 * m);
            }
          // running lights along the ledge, chasing the way the song runs
          for (let q = 0; q < 6; q++) {
            const u = (t * (0.25 + 0.05 * k) + q / 6 + k * 0.13) % 1,
              lx = X + (-w / 2 + u * w) * m;
            glow(g, lx, top - 0.1 * m, (0.25 + 0.35 * mf.hat) * m, T.line, 0.5 + 0.5 * mf.hat);
          }
          y = top - 0.18 * m;
          w *= 0.78;
        });
        // two cores past the top tier and a sky bridge between them
        g.fillStyle = c.body;
        g.fillRect(X - 2.4 * m, y - 4 * m, 1.2 * m, 4 * m);
        g.fillRect(X + 1.2 * m, y - 5.5 * m, 1.2 * m, 5.5 * m);
        g.fillRect(X - 1.6 * m, y - 3.2 * m, 3.2 * m, 0.35 * m);
        g.fillStyle = rgba(T.win[1], 0.4 + 0.5 * mf.voice);
        g.fillRect(X - 1.2 * m, y - 3.1 * m, 2.4 * m, 0.12 * m);
        // the spire and its beacon
        g.fillStyle = c.body;
        poly(g, [X + 1.4 * m, y - 5.5 * m, X + 1.8 * m, y - 8 * m, X + 2.2 * m, y - 5.5 * m]);
        glow(g, X + 1.8 * m, y - 8 * m, (0.6 + 1.6 * mf.down) * m, T.line, 0.4 + 0.6 * mf.down);
        glow(g, X - 1.8 * m, y - 4 * m, (0.3 + 0.5 * mf.beat) * m, '#ff3b4f', 0.3 + 0.6 * mf.beat);
      });
    },
  },
  // a ring world's arc: a colossal band rising out of the horizon and arching over the sky, its inner face lit in
  // panels that chase around it on the beat, a glint travelling its rim with the bass
  {
    id: 'ringworld',
    media: ['air', 'space'],
    tags: ['future', 'tech', 'cold'],
    mood: [0.4, 0.6, 0.3],
    draw(f) {
      const { g, v, mf, T, t } = f,
        c = tones(T);
      landmark(f, 0.13, 36, 0.65, 211, (X, base, i) => {
        const m = v.ppm * 0.5,
          cx = X,
          cy = base + 2 * m,
          rx = 26 * m,
          ry = 10.2 * m,
          tilt = -0.12;
        // (the band: its far inner face lit, the near rim dark)
        g.save();
        g.translate(cx, cy);
        g.rotate(tilt);
        g.lineCap = 'butt';
        g.strokeStyle = rgba(c.lit, 0.85);
        g.lineWidth = 1.6 * m;
        g.beginPath();
        g.ellipse(0, 0, rx, ry, 0, Math.PI, TAU);
        g.stroke();
        // its panels: dark and lit alternately, a wave of light running round them on the beat
        const n = 28,
          run = beats(f) * 2;
        for (let k = 0; k < n; k++) {
          const a0 = Math.PI + (k / n) * Math.PI,
            a1 = a0 + (Math.PI / n) * 0.8,
            d = Math.abs(((k - run) % n) + n) % n,
            lit = Math.max(0, 1 - d / 4);
          g.strokeStyle = rgba(k % 2 ? T.win[0] : T.win[2], 0.18 + 0.2 * mf.stage + 0.5 * lit * (0.4 + 0.6 * mf.beat));
          g.lineWidth = 0.8 * m;
          g.beginPath();
          g.ellipse(0, 0, rx - 0.15 * m, ry - 0.15 * m, 0, a0, a1);
          g.stroke();
        }
        // the outer rim, a hard dark wall
        g.strokeStyle = c.dark;
        g.lineWidth = 0.45 * m;
        g.beginPath();
        g.ellipse(0, 0, rx + 0.9 * m, ry + 0.9 * m, 0, Math.PI, TAU);
        g.stroke();
        // the glint running round the rim
        const ga = Math.PI + ((t * 0.08 + hash(i, 3)) % 1) * Math.PI;
        g.restore();
        const gx = cx + Math.cos(ga) * (rx + 0.9 * m) * Math.cos(tilt) - Math.sin(ga) * (ry + 0.9 * m) * Math.sin(tilt),
          gy = cy + Math.cos(ga) * (rx + 0.9 * m) * Math.sin(tilt) + Math.sin(ga) * (ry + 0.9 * m) * Math.cos(tilt);
        addGlow(g, gx, gy, (1 + 2 * mf.bass) * m, '#ffffff', 0.3 + 0.5 * mf.bass);
        // its two great feet where it comes out of the ground, a light at each
        for (const s of [-1, 1]) {
          const fx = cx + s * rx * Math.cos(tilt) + (s > 0 ? 0 : 0),
            fy = cy + s * rx * Math.sin(tilt);
          g.fillStyle = c.body;
          poly(g, [
            fx - 2 * m,
            base + 0.2 * m,
            fx - 0.7 * m,
            fy - 3 * m,
            fx + 0.7 * m,
            fy - 3 * m,
            fx + 2 * m,
            base + 0.2 * m,
          ]);
          glow(g, fx, fy - 3 * m, (0.5 + 0.8 * mf.kick) * m, T.line, 0.4 + 0.5 * mf.kick);
        }
      });
    },
  },
  // a black monolith: a slab of night standing on the plain, a seam of light down its face pulsing with the bass,
  // shards orbiting it, and on the downbeat a ring of light spreading over the ground at its foot
  {
    id: 'monolith',
    media: ['air', 'space'],
    tags: ['future', 'ancient', 'cold'],
    mood: [0.3, 0.3, 0.6],
    draw(f) {
      const { g, v, mf, T, t } = f;
      landmark(f, 0.17, 28, 0.7, 383, (X, base, i) => {
        const m = v.ppm * 0.48,
          w = 3.2 * m,
          h = 11 * m,
          top = base - h;
        // (its aura first, behind it)
        addGlow(g, X, base - h * 0.55, (5 + 3 * mf.bass) * m, T.line, 0.22 + 0.25 * mf.bass);
        const gr = g.createLinearGradient(X - w / 2, 0, X + w / 2, 0);
        gr.addColorStop(0, '#0a0a10');
        gr.addColorStop(0.45, '#16161f');
        gr.addColorStop(1, '#040406');
        g.fillStyle = gr;
        g.fillRect(X - w / 2, top, w, h);
        // a sheen of the sky sliding down it
        const sy = top + ((t * 0.12) % 1) * h;
        g.fillStyle = rgba(T.sky[2], 0.12);
        g.fillRect(X - w / 2, sy, w, 0.6 * m);
        g.fillStyle = rgba(T.sky[2], 0.3);
        g.fillRect(X - w / 2, top, w, 0.06 * m);
        // (its edges catching the sky on one side and the seam's light on the other, so it reads on a dark night)
        g.fillStyle = rgba(T.sky[2], 0.4);
        g.fillRect(X - w / 2, top, 0.07 * m, h);
        g.fillStyle = rgba(T.line, 0.3 + 0.4 * mf.bass);
        g.fillRect(X + w / 2 - 0.07 * m, top, 0.07 * m, h);
        // the seam: a thin bright line with a soft band about it, broken where the song has not reached
        const a = 0.6 + 0.4 * mf.bass,
          len = h * (0.72 + 0.28 * mf.stage);
        g.fillStyle = rgba(T.line, 0.25 * a);
        g.fillRect(X - 0.5 * m, base - len, 1 * m, len);
        g.fillStyle = rgba(T.line, 0.35 * a);
        g.fillRect(X - 0.18 * m, base - len, 0.36 * m, len);
        g.fillStyle = rgba(T.line, a);
        g.fillRect(X - 0.05 * m, base - len, 0.1 * m, len);
        g.fillStyle = rgba('#ffffff', 0.6 * a);
        g.fillRect(X - 0.02 * m, base - len, 0.04 * m, len);
        // the ring over the ground on the downbeat
        g.strokeStyle = rgba(T.line, 0.6 * mf.down);
        g.lineWidth = 0.08 * m;
        g.beginPath();
        g.ellipse(X, base, (2 + 6 * (1 - mf.down)) * m, (0.3 + 0.8 * (1 - mf.down)) * m, 0, 0, TAU);
        g.stroke();
        // shards orbiting, closer on the kick
        for (let k = 0; k < 7; k++) {
          const a0 = t * (0.3 + 0.1 * hash(k, i)) + (k * TAU) / 7,
            r = (2.6 + 1.2 * hash(k, 9) - 0.6 * mf.kick) * m,
            sx = X + Math.cos(a0) * r,
            sy2 = base - h * (0.3 + 0.6 * hash(k, 5)) + Math.sin(a0) * 0.6 * m,
            s = (0.12 + 0.18 * hash(k, 2)) * m;
          if (Math.sin(a0) < 0 && Math.abs(sx - X) < w / 2) continue;
          g.fillStyle = '#0c0c12';
          poly(g, [sx, sy2 - s * 2, sx + s, sy2, sx, sy2 + s, sx - s, sy2]);
          g.fillStyle = rgba(T.line, 0.4 + 0.5 * mf.hat);
          g.fillRect(sx - s * 0.1, sy2 - s * 2, s * 0.2, s * 3);
        }
      });
    },
  },
  // an inverted pyramid hovering high over the plain: two faces in light and shade, glowing edges, a ring of lights
  // round its rim chasing on the beat; on a drop a beam falls from its point to the ground
  {
    id: 'pyramidship',
    media: ['air', 'space'],
    tags: ['future', 'ancient', 'tech', 'hot'],
    mood: [0.7, 0.4, 0.7],
    draw(f) {
      const { g, v, mf, T, t } = f,
        c = {
          lit: mix(mix(T.far, T.sky[2], 0.25), T.line, 0.3),
          body: mix(T.far, T.sky[2], 0.08),
          dark: mix(T.far, '#000000', 0.3),
        };
      landmark(f, 0.152, 32, 0.7, 224, (X, base, i) => {
        const m = v.ppm * 0.5,
          bob = Math.sin(t * 0.6 + i) * 0.4 * m,
          ty = base - 9.6 * m + bob,
          tip = ty + 6 * m,
          w = 4.8 * m;
        // the beam on a drop (and a flicker of it on the kick in a build)
        const beam = Math.min(1, mf.drop * (0.6 + 0.4 * mf.kick) + 0.35 * mf.build * mf.kick);
        if (beam > 0.02) {
          g.globalCompositeOperation = 'lighter';
          const gr = g.createLinearGradient(0, tip, 0, base);
          gr.addColorStop(0, rgba(T.line, 0.7 * beam));
          gr.addColorStop(1, rgba(T.line, 0.25 * beam));
          g.fillStyle = gr;
          poly(g, [X - 0.2 * m, tip, X + 0.2 * m, tip, X + 2.6 * m, base, X - 2.6 * m, base]);
          g.fillStyle = rgba('#ffffff', 0.5 * beam);
          g.fillRect(X - 0.06 * m, tip, 0.12 * m, base - tip);
          g.globalCompositeOperation = 'source-over';
          glow(g, X, base, 4 * m, T.line, 0.5 * beam);
        }
        // its underside glow
        addGlow(g, X, tip, (1.5 + 2 * mf.bass) * m, T.line, 0.3 + 0.4 * mf.bass);
        // the top face seen edge-on, two faces below
        g.fillStyle = c.lit;
        poly(g, [X - w, ty, X - w * 0.2, ty - 0.9 * m, X + w, ty, X, tip]);
        g.fillStyle = c.body;
        poly(g, [X - w, ty, X + w * 0.15, ty + 0.5 * m, X, tip]);
        g.fillStyle = c.dark;
        poly(g, [X + w * 0.15, ty + 0.5 * m, X + w, ty, X, tip]);
        // hieroglyph bands across its faces
        g.fillStyle = rgba(T.win[0], 0.2 + 0.4 * mf.voice);
        for (let k = 1; k < 5; k++) {
          const u = k / 5,
            y = ty + (tip - ty) * u,
            hw = w * (1 - u) * 0.9;
          for (let q = -4; q <= 4; q++)
            if (hash(q + k * 11, i) < 0.6) g.fillRect(X + (q / 4.5) * hw - 0.08 * m, y, 0.16 * m, 0.12 * m);
        }
        // its glowing edges
        g.strokeStyle = rgba(T.line, 0.5 + 0.5 * mf.beat);
        g.lineWidth = 0.07 * m;
        g.beginPath();
        g.moveTo(X - w, ty);
        g.lineTo(X, tip);
        g.lineTo(X + w, ty);
        g.moveTo(X + w * 0.15, ty + 0.5 * m);
        g.lineTo(X, tip);
        g.stroke();
        // the ring of lights round the rim
        for (let k = 0; k < 12; k++) {
          const u = (k + 0.5) / 12,
            lx = X - w + u * 2 * w,
            ly = ty + (u < 0.575 ? (u / 0.575) * 0.5 : ((1 - u) / 0.425) * 0.5) * m,
            on = Math.floor(beats(f) * 2) % 12 === k ? 1 : 0;
          glow(g, lx, ly, (0.25 + 0.45 * on) * m, T.win[k % 3], 0.4 + 0.5 * on + 0.3 * mf.hat);
        }
        // the cap: a small bright pyramidion on top
        glow(g, X - w * 0.2, ty - 0.9 * m, (0.4 + 1 * mf.down) * m, '#ffffff', 0.4 + 0.5 * mf.down);
      });
    },
  },
  // a domed basilica: a long nave, a great ribbed dome on a drum with a lantern, two bell towers; its stained glass
  // (a rose window, rows of tall arched windows) glows with the voice
  {
    id: 'basilica',
    tags: ['ancient', 'gothic', 'mild', 'warm'],
    mood: [0.35, 0.6, 0.3],
    draw(f) {
      const { g, v, mf, T } = f,
        c = tones(T),
        GLASS = ['#3a6cff', '#ff3b5c', '#ffc23a', '#2fd28a'].map(x => mix(x, T.win[0], 0.25));
      landmark(f, 0.136, 36, 0.7, 965, (X, base, i) => {
        const m = v.ppm * 0.37,
          glass = 0.25 + 0.55 * mf.voice + 0.2 * mf.bass;
        // the nave and the aisles
        g.fillStyle = c.body;
        g.fillRect(X - 7 * m, base - 4 * m, 14 * m, 4 * m);
        poly(g, [
          X - 7.3 * m,
          base - 4 * m,
          X - 4.5 * m,
          base - 5.6 * m,
          X + 4.5 * m,
          base - 5.6 * m,
          X + 7.3 * m,
          base - 4 * m,
        ]);
        // the drum and the dome
        g.fillRect(X - 3.2 * m, base - 8 * m, 6.4 * m, 3 * m);
        g.beginPath();
        g.ellipse(X, base - 8 * m, 3.4 * m, 4 * m, 0, Math.PI, TAU);
        g.fill();
        g.fillStyle = c.lit;
        g.beginPath();
        g.ellipse(X - 0.6 * m, base - 8 * m, 2.4 * m, 3.8 * m, 0, Math.PI * 1.05, Math.PI * 1.45);
        g.lineTo(X - 0.6 * m, base - 8 * m);
        g.fill();
        // (its ribs)
        g.strokeStyle = c.dark;
        g.lineWidth = 0.08 * m;
        g.beginPath();
        for (let k = -3; k <= 3; k++) {
          g.moveTo(X + k * 1.05 * m, base - 8 * m);
          g.quadraticCurveTo(X + k * 0.75 * m, base - 11 * m, X, base - 12 * m);
        }
        g.stroke();
        // the lantern and the cross
        g.fillStyle = c.body;
        g.fillRect(X - 0.45 * m, base - 13.2 * m, 0.9 * m, 1.4 * m);
        g.fillRect(X - 0.05 * m, base - 14.6 * m, 0.1 * m, 1.4 * m);
        g.fillRect(X - 0.35 * m, base - 14.2 * m, 0.7 * m, 0.1 * m);
        glow(g, X, base - 12.6 * m, (0.6 + 0.8 * mf.voice) * m, T.win[1], 0.3 + 0.5 * glass);
        // the drum's windows
        for (let k = -3; k <= 3; k++) {
          g.fillStyle = rgba(GLASS[(k + 9) % 4], glass);
          g.fillRect(X + k * 0.85 * m - 0.18 * m, base - 7.6 * m, 0.36 * m, 1.6 * m);
        }
        // two bell towers with spires
        for (const s of [-1, 1]) {
          const tx = X + s * 6.2 * m;
          g.fillStyle = c.body;
          g.fillRect(tx - 1 * m, base - 10 * m, 2 * m, 10 * m);
          poly(g, [tx - 1.2 * m, base - 10 * m, tx, base - 13 * m, tx + 1.2 * m, base - 10 * m]);
          g.fillStyle = rgba('#000000', 0.5);
          g.fillRect(tx - 0.5 * m, base - 9.4 * m, 1 * m, 1.4 * m);
          glow(g, tx, base - 8.6 * m, (0.3 + 0.7 * mf.down) * m, T.win[2], 0.3 + 0.6 * mf.down);
        }
        // the rose window over the door
        const R = 1.1 * m,
          ry = base - 2.6 * m;
        glow(g, X, ry, R * 2.4, GLASS[0], 0.1 + 0.3 * glass);
        for (let p = 0; p < 12; p++) {
          g.fillStyle = rgba(GLASS[p % 4], glass);
          g.beginPath();
          g.moveTo(X, ry);
          g.arc(X, ry, R, (p * TAU) / 12, ((p + 1) * TAU) / 12);
          g.fill();
        }
        g.strokeStyle = rgba('#05040a', 0.85);
        g.lineWidth = 0.08 * m;
        g.beginPath();
        g.arc(X, ry, R, 0, TAU);
        for (let p = 0; p < 12; p++) {
          g.moveTo(X, ry);
          g.lineTo(X + Math.cos((p * TAU) / 12) * R, ry + Math.sin((p * TAU) / 12) * R);
        }
        g.stroke();
        // the aisles' tall arched windows, lit one after another along the nave with the beat
        const lit = Math.floor(beats(f)) % 8;
        for (let k = 0; k < 8; k++) {
          const wx = X + (k < 4 ? -4.6 + k * 0.7 : 2.5 + (k - 4) * 0.7) * m,
            a = glass * (k === lit ? 1.4 : 0.8);
          g.fillStyle = rgba(GLASS[(((k + i) % 4) + 4) % 4], a);
          g.beginPath();
          g.moveTo(wx, base - 1 * m);
          g.lineTo(wx, base - 2.6 * m);
          g.arc(wx + 0.2 * m, base - 2.6 * m, 0.2 * m, Math.PI, TAU);
          g.lineTo(wx + 0.4 * m, base - 1 * m);
          g.fill();
        }
      });
    },
  },
  // a giant's skull half sunk in the plain: its dome cracked, its sockets glowing deep with the bass, a flare in
  // them on the kick, its teeth along the ground
  {
    id: 'giantskull',
    tags: ['fantasy', 'gothic', 'hot', 'ancient'],
    mood: [0.6, 0.2, 0.8],
    draw(f) {
      const { g, v, mf, T, t } = f,
        c = tones(T),
        bone = mix(mix(T.far, T.sky[2], 0.4), '#e8dcc4', 0.3);
      landmark(f, 0.164, 30, 0.7, 446, (X, base, i) => {
        const m = v.ppm * 0.43,
          cy = base - 4.5 * m;
        // the cranium: a great dome, the cheekbones, the jaw under the ground
        g.fillStyle = bone;
        g.beginPath();
        g.ellipse(X, cy - 1.2 * m, 6.4 * m, 6.8 * m, 0, Math.PI * 0.92, Math.PI * 2.08);
        g.fill();
        poly(g, [
          X - 6.2 * m,
          cy,
          X - 5.4 * m,
          cy + 3 * m,
          X - 3.2 * m,
          base,
          X + 3.2 * m,
          base,
          X + 5.4 * m,
          cy + 3 * m,
          X + 6.2 * m,
          cy,
        ]);
        // (its shading: the dark side, the lit dome)
        g.fillStyle = rgba('#000000', 0.25);
        g.beginPath();
        g.ellipse(X + 1.6 * m, cy - 1.2 * m, 4.8 * m, 6.6 * m, 0, -Math.PI * 0.5, Math.PI * 0.4);
        g.fill();
        g.fillStyle = rgba(c.lit, 0.4);
        g.beginPath();
        g.ellipse(X - 2 * m, cy - 5 * m, 2.6 * m, 1.6 * m, -0.4, 0, TAU);
        g.fill();
        // its cracks
        g.strokeStyle = rgba('#000000', 0.55);
        g.lineWidth = 0.1 * m;
        g.beginPath();
        g.moveTo(X + 0.5 * m, cy - 8 * m);
        g.lineTo(X + 1.1 * m, cy - 6.2 * m);
        g.lineTo(X + 0.6 * m, cy - 5.2 * m);
        g.lineTo(X + 1.5 * m, cy - 3.8 * m);
        g.moveTo(X + 1.1 * m, cy - 6.2 * m);
        g.lineTo(X + 2.4 * m, cy - 6.8 * m);
        g.moveTo(X - 4 * m, cy - 5 * m);
        g.lineTo(X - 3.2 * m, cy - 3.4 * m);
        g.stroke();
        // the sockets: black, with a fire deep in each
        const fire = 0.35 + 0.5 * mf.bass + 0.3 * mf.kick,
          hot = mix(T.win[2], '#ff4020', 0.4);
        for (const s of [-1, 1]) {
          const ex = X + s * 2.4 * m,
            ey = cy - 1 * m;
          g.fillStyle = '#060404';
          g.beginPath();
          g.ellipse(ex, ey, 1.6 * m, 1.35 * m, s * 0.25, 0, TAU);
          g.fill();
          addGlow(g, ex, ey, (2.2 + 1.8 * mf.bass) * m, hot, 0.25 + 0.4 * fire);
          glow(g, ex, ey + 0.2 * m, (0.45 + 0.4 * mf.kick) * m, '#fff1c8', 0.4 + 0.6 * fire);
        }
        // the nose
        g.fillStyle = '#060404';
        poly(g, [X, cy + 0.5 * m, X - 0.7 * m, cy + 2.3 * m, X + 0.7 * m, cy + 2.3 * m]);
        // its teeth at the ground, a few missing
        for (let k = -5; k <= 5; k++) {
          if (hash(k, i + 4) < 0.15) continue;
          const tx = X + k * 0.52 * m;
          g.fillStyle = bone;
          g.fillRect(tx - 0.22 * m, cy + 2.9 * m, 0.44 * m, base - cy - 2.9 * m + 0.1 * m);
          g.fillStyle = rgba('#000000', 0.4);
          g.fillRect(tx + 0.2 * m, cy + 2.9 * m, 0.06 * m, base - cy - 2.9 * m);
        }
        // smoke curling out of the sockets
        for (let k = 0; k < 5; k++) {
          const u = (t * 0.15 + k / 5) % 1;
          g.fillStyle = rgba(T.sky[2], 0.12 * (1 - u));
          g.beginPath();
          g.arc(
            X + (k % 2 ? 2.4 : -2.4) * m + Math.sin(u * 6 + k) * 0.8 * m,
            cy - 2 * m - u * 7 * m,
            (0.6 + 1.6 * u) * m,
            0,
            TAU,
          );
          g.fill();
        }
      });
    },
  },
  // a jellyfish as big as a hill drifting in the sky: a glowing bell that squeezes on the kick, frilled arms and long
  // tentacles swaying with the bass, lights pulsing down them
  {
    id: 'jellyfish',
    media: ['air', 'water'],
    tags: ['nature', 'fantasy', 'cold', 'neon'],
    mood: [0.3, 0.6, 0.2],
    draw(f) {
      const { g, v, mf, T, t } = f,
        jc = mix(T.line, T.sky[2], 0.3);
      landmark(f, 0.148, 32, 0.65, 307, (X0, base, i) => {
        const m = v.ppm * 0.5,
          X = X0 + Math.sin(t * 0.15 + i) * 1.5 * m,
          by = base - 7 * m + Math.sin(t * 0.4 + i) * 0.6 * m,
          sq = mf.kick * 0.18,
          rw = 4.2 * m * (1 - sq * 0.5),
          rh = 3.6 * m * (1 + sq);
        // the tentacles first (behind the bell), each a long wave whose swing follows the bass
        g.lineCap = 'round';
        for (let k = 0; k < 12; k++) {
          const sx = X + ((k - 5.5) / 5.5) * rw * 0.85,
            len = (5 + 3 * hash(k, i)) * m,
            ph = t * 1.4 + k * 0.7;
          g.strokeStyle = rgba(jc, 0.25 + 0.2 * mf.bass);
          g.lineWidth = (0.06 + 0.06 * hash(k, 2)) * m;
          g.beginPath();
          g.moveTo(sx, by);
          for (let s = 1; s <= 10; s++) {
            const u = s / 10,
              sw = Math.sin(ph - u * 4) * (0.4 + 1.6 * mf.bass + 0.4) * u * m;
            g.lineTo(sx + sw + u * 0.6 * m, by + u * len);
          }
          g.stroke();
          // a light running down it
          const u = (t * 0.5 + hash(k, 5)) % 1;
          glow(
            g,
            sx + Math.sin(ph - u * 4) * (0.8 + 1.6 * mf.bass) * u * m + u * 0.6 * m,
            by + u * len,
            0.3 * m,
            T.win[k % 3],
            0.6 * (1 - u) + 0.3 * mf.hat,
          );
        }
        // the frilled oral arms, thick and short
        for (let k = 0; k < 4; k++) {
          const sx = X + (k - 1.5) * 0.7 * m;
          g.strokeStyle = rgba(T.win[0], 0.35);
          g.lineWidth = 0.35 * m;
          g.beginPath();
          g.moveTo(sx, by);
          for (let s = 1; s <= 8; s++) {
            const u = s / 8;
            g.lineTo(sx + Math.sin(t * 1.1 + k + u * 5) * (0.4 + 0.8 * mf.bass) * m, by + u * 3.5 * m);
          }
          g.stroke();
        }
        // the bell: a translucent dome, brighter at its rim, its inner glow on the beat
        addGlow(g, X, by - rh * 0.4, rw * 1.8, jc, 0.15 + 0.25 * mf.beat);
        const gr = g.createRadialGradient(X, by - rh * 0.6, 0, X, by - rh * 0.3, rw);
        gr.addColorStop(0, rgba('#ffffff', 0.35 + 0.3 * mf.beat));
        gr.addColorStop(0.5, rgba(jc, 0.35));
        gr.addColorStop(1, rgba(jc, 0.6));
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(X - rw, by);
        g.bezierCurveTo(X - rw, by - rh * 1.35, X + rw, by - rh * 1.35, X + rw, by);
        // (its scalloped rim)
        for (let k = 8; k > 0; k--)
          g.quadraticCurveTo(X - rw + ((k - 0.5) / 8) * 2 * rw, by + 0.5 * m, X - rw + ((k - 1) / 8) * 2 * rw, by);
        g.fill();
        // (the sheen along the top of the bell, the light through its skin)
        g.strokeStyle = rgba(mix(jc, '#ffffff', 0.6), 0.35 + 0.35 * mf.beat);
        g.lineWidth = 0.14 * m;
        g.beginPath();
        g.moveTo(X - rw * 0.92, by - rh * 0.25);
        g.bezierCurveTo(X - rw * 0.9, by - rh * 1.25, X + rw * 0.9, by - rh * 1.25, X + rw * 0.92, by - rh * 0.25);
        g.stroke();
        // its four gonads glowing through the bell: a clover of soft loops turning slowly, brighter with the voice
        const gc = mix(T.win[1], jc, 0.35);
        addGlow(g, X, by - rh * 0.5, 2.2 * m, gc, 0.2 + 0.35 * mf.voice);
        g.strokeStyle = rgba(gc, 0.35 + 0.45 * mf.voice);
        g.lineWidth = 0.12 * m;
        for (let k = 0; k < 4; k++) {
          const a = (k * TAU) / 4 + t * 0.2;
          g.beginPath();
          g.ellipse(
            X + Math.cos(a) * 1.1 * m,
            by - rh * 0.5 + Math.sin(a) * 0.35 * m,
            0.75 * m,
            0.32 * m,
            a,
            0,
            TAU,
          );
          g.stroke();
        }
        const lead = Math.floor(beats(f) * 2) % 9;
        for (let k = 0; k < 9; k++)
          glow(
            g,
            X - rw + (k / 8) * 2 * rw,
            by + 0.1 * m,
            (0.2 + (k === lead ? 0.5 : 0)) * m,
            '#ffffff',
            0.4 + (k === lead ? 0.5 : 0),
          );
      });
    },
  },
  // a portal: a ring of carved stones standing on a stepped dais, its runes lighting one by one on the hats, a core of
  // light swirling inside it, spinning faster and brighter on a drop
  {
    id: 'portal',
    tags: ['fantasy', 'ancient', 'future', 'neon'],
    mood: [0.6, 0.5, 0.5],
    draw(f) {
      const { g, v, mf, T, t } = f,
        c = tones(T);
      landmark(f, 0.168, 32, 0.7, 328, (X, base, i) => {
        const m = v.ppm * 0.38,
          cy = base - 7.6 * m,
          R = 5 * m;
        // the core: a disc of light and spiral arms turning
        const gr = g.createRadialGradient(X, cy, 0, X, cy, R);
        gr.addColorStop(0, rgba('#ffffff', 0.7 + 0.3 * mf.kick));
        gr.addColorStop(0.3, rgba(T.line, 0.55 + 0.3 * mf.bass));
        gr.addColorStop(1, rgba(T.win[0], 0.15));
        g.fillStyle = gr;
        g.beginPath();
        g.arc(X, cy, R, 0, TAU);
        g.fill();
        const spin = t * (0.8 + 1.6 * mf.drop);
        g.lineCap = 'round';
        for (let k = 0; k < 5; k++) {
          g.strokeStyle = rgba(k % 2 ? '#ffffff' : T.win[1], 0.35 + 0.3 * mf.beat);
          g.lineWidth = (0.12 + 0.1 * (k % 2)) * m;
          g.beginPath();
          for (let s = 0; s <= 24; s++) {
            const u = s / 24,
              a = spin + (k * TAU) / 5 + u * 4,
              r = u * R * 0.95;
            if (s) g.lineTo(X + Math.cos(a) * r, cy + Math.sin(a) * r);
            else g.moveTo(X, cy);
          }
          g.stroke();
        }
        addGlow(g, X, cy, R * 1.8, T.line, 0.15 + 0.3 * mf.bass + 0.3 * mf.drop);
        // the stone ring: blocks with gaps between them
        const n = 16;
        for (let k = 0; k < n; k++) {
          const a0 = (k / n) * TAU + 0.02,
            a1 = ((k + 1) / n) * TAU - 0.02;
          g.fillStyle = k % 2 ? c.body : c.lit;
          g.beginPath();
          g.arc(X, cy, R + 1.3 * m, a0, a1);
          g.arc(X, cy, R, a1, a0, true);
          g.closePath();
          g.fill();
          // a rune on each block, lit in turn
          const ra = (a0 + a1) / 2,
            on = Math.floor(beats(f) * 2) % n === k || hash(k, i) < 0.3 * mf.stage;
          g.fillStyle = rgba(T.line, on ? 0.6 + 0.4 * mf.hat : 0.12);
          g.save();
          g.translate(X + Math.cos(ra) * (R + 0.65 * m), cy + Math.sin(ra) * (R + 0.65 * m));
          g.rotate(ra);
          g.fillRect(-0.25 * m, -0.05 * m, 0.5 * m, 0.1 * m);
          g.fillRect(-0.05 * m, -0.3 * m, 0.1 * m, 0.4 * m);
          g.restore();
        }
        // the keystone and the dais
        g.fillStyle = c.dark;
        poly(g, [
          X - 0.9 * m,
          cy - R - 1.6 * m,
          X + 0.9 * m,
          cy - R - 1.6 * m,
          X + 0.6 * m,
          cy - R + 0.2 * m,
          X - 0.6 * m,
          cy - R + 0.2 * m,
        ]);
        glow(g, X, cy - R - 0.7 * m, (0.4 + 0.8 * mf.down) * m, T.win[2], 0.5 + 0.5 * mf.down);
        for (let k = 0; k < 3; k++) {
          g.fillStyle = k % 2 ? c.dark : c.body;
          g.fillRect(X - (4 + k * 1.6) * m, base - (3 - k) * 0.9 * m, (8 + k * 3.2) * m, 0.9 * m);
        }
        // two pillars with braziers
        for (const s of [-1, 1]) {
          const px = X + s * 8.2 * m;
          g.fillStyle = c.body;
          g.fillRect(px - 0.4 * m, base - 5 * m, 0.8 * m, 5 * m);
          g.fillRect(px - 0.6 * m, base - 5.2 * m, 1.2 * m, 0.3 * m);
          glow(g, px, base - 5.6 * m, (0.6 + 0.6 * mf.kick) * m, T.win[2], 0.5 + 0.4 * mf.kick);
        }
      });
    },
  },
  // a tower of stacked LED billboards on a steel frame: screens of different sizes jutting out each way, each playing
  // its own show (an equaliser, stripes, a pulse), all flashing on the kick
  {
    id: 'billboardtower',
    tags: ['urban', 'neon', 'party', 'modern'],
    mood: [0.8, 0.7, 0.6],
    draw(f) {
      const { g, v, mf, T, t } = f,
        c = tones(T);
      landmark(f, 0.19, 27, 0.7, 369, (X, base, i) => {
        const m = v.ppm * 0.29;
        // the frame: two legs and cross-bracing
        g.fillStyle = c.dark;
        g.fillRect(X - 1.2 * m, base - 16 * m, 0.3 * m, 16 * m);
        g.fillRect(X + 0.9 * m, base - 16 * m, 0.3 * m, 16 * m);
        g.strokeStyle = c.dark;
        g.lineWidth = 0.08 * m;
        g.beginPath();
        for (let y = 0; y < 16; y += 1.4) {
          g.moveTo(X - 1.1 * m, base - y * m);
          g.lineTo(X + 1.1 * m, base - (y + 1.4) * m);
          g.moveTo(X + 1.1 * m, base - y * m);
          g.lineTo(X - 1.1 * m, base - (y + 1.4) * m);
        }
        g.stroke();
        let y = base - 2.5 * m;
        const cols = [T.win[0], T.line, T.win[2], T.win[1], T.line, T.win[0]];
        for (let k = 0; k < 6; k++) {
          const h = (1.4 + 1 * hash(k, i + 1)) * m,
            w = (3.5 + 3 * hash(k, i + 2)) * m,
            off = (hash(k, i + 3) - 0.5) * 3 * m,
            x0 = X + off - w / 2,
            col = cols[k],
            flash = mf.kick * (k % 2 ? 1 : 0.6),
            kind = (((k + i) % 4) + 4) % 4;
          y -= h + 0.35 * m;
          // the bezel, then the screen
          g.fillStyle = '#0a0a0e';
          g.fillRect(x0 - 0.12 * m, y - 0.12 * m, w + 0.24 * m, h + 0.24 * m);
          g.fillStyle = rgba(col, 0.25 + 0.25 * flash);
          g.fillRect(x0, y, w, h);
          g.fillStyle = rgba(col, 0.6 + 0.4 * flash);
          if (kind === 0) {
            // (an equaliser)
            const n = Math.floor(w / (0.32 * m));
            for (let q = 0; q < n; q++) {
              const lv =
                0.15 +
                0.85 *
                  Math.abs(Math.sin(t * 3 + q * 1.3)) *
                  (0.3 + 0.7 * (q < n / 3 ? mf.bass : q < (2 * n) / 3 ? mf.snare : mf.hat));
              g.fillRect(x0 + q * 0.32 * m + 0.04 * m, y + h * (1 - lv), 0.24 * m, h * lv);
            }
          } else if (kind === 1) {
            // (stripes sliding with the beat)
            const sh = (beats(f) % 1) * 0.8 * m;
            for (let sx = -0.8 * m + sh; sx < w; sx += 0.8 * m)
              g.fillRect(x0 + Math.max(0, sx), y, Math.min(0.4 * m, w - Math.max(0, sx)), h);
          } else if (kind === 2) {
            // (a ring pulsing out from the middle)
            g.strokeStyle = rgba('#ffffff', 0.5 + 0.5 * mf.beat);
            g.lineWidth = 0.12 * m;
            g.beginPath();
            g.ellipse(
              x0 + w / 2,
              y + h / 2,
              Math.max(0.1, (w / 2) * (1 - mf.beat * 0.7)),
              Math.max(0.1, (h / 2.4) * (1 - mf.beat * 0.7)),
              0,
              0,
              TAU,
            );
            g.stroke();
          } else {
            // (a word-like row of blocks crawling)
            for (let q = 0; q < 12; q++) {
              const bx = ((((q * 0.7 * m - t * 2 * m) % (w + 2 * m)) + w + 2 * m) % (w + 2 * m)) - m;
              if (hash(q, k) < 0.75 && bx > 0 && bx < w - 0.5 * m) g.fillRect(x0 + bx, y + h * 0.3, 0.5 * m, h * 0.4);
            }
          }
          // the screen's light spilling round it
          glow(g, x0 + w / 2, y + h / 2, w * 0.8, col, 0.1 + 0.3 * flash);
        }
        // its top: a crown mast with a strobe on the downbeat
        g.fillStyle = c.dark;
        g.fillRect(X - 0.05 * m, y - 3 * m, 0.1 * m, 3 * m);
        addGlow(g, X, y - 3 * m, (0.4 + 2 * mf.down) * m, '#ffffff', 0.3 + 0.7 * mf.down);
      });
    },
  },
  // a space elevator: a ground station of domes and a great anchor, a cable rising out of sight, climbers riding up it,
  // beacons on the cable running upward on the beat
  {
    id: 'spaceelevator',
    media: ['air', 'space'],
    tags: ['future', 'tech', 'industrial', 'cold'],
    mood: [0.4, 0.6, 0.4],
    draw(f) {
      const { g, v, mf, T, t } = f,
        c = tones(T);
      landmark(f, 0.138, 32, 0.65, 246, (X, base, i) => {
        const m = v.ppm * 0.75,
          top = -v.H * 0.2,
          foot = base - 4.2 * m,
          H = foot - top;
        // the cable: a glowing band breathing with the bass, two dark ribbons with a bright thread between
        const band = g.createLinearGradient(X - 1.2 * m, 0, X + 1.2 * m, 0);
        band.addColorStop(0, rgba(T.line, 0));
        band.addColorStop(0.5, rgba(T.line, 0.2 + 0.3 * mf.bass));
        band.addColorStop(1, rgba(T.line, 0));
        g.fillStyle = band;
        g.fillRect(X - 1.2 * m, top, 2.4 * m, H);
        g.fillStyle = c.dark;
        g.fillRect(X - 0.3 * m, top, 0.14 * m, H);
        g.fillRect(X + 0.16 * m, top, 0.14 * m, H);
        g.fillStyle = rgba('#ffffff', 0.35 + 0.4 * mf.bass);
        g.fillRect(X - 0.025 * m, top, 0.05 * m, H);
        // beacons up the cable, a wave of them climbing on the beat
        const run = beats(f) % 1;
        for (let k = 0; k < 14; k++) {
          const u = k / 14,
            y = foot - u * H,
            d = Math.abs(u - run);
          glow(g, X, y, (0.2 + 0.4 * Math.max(0, 1 - d * 8)) * m, T.line, 0.3 + 0.7 * Math.max(0, 1 - d * 8));
        }
        // climbers: pods with lit windows riding up, faster in a drop
        for (let k = 0; k < 4; k++) {
          const u = (t * (0.025 + 0.02 * mf.drop) + k / 4 + hash(i, k)) % 1,
            y = foot - u * u * H,
            s = 1.3 - 0.7 * u;
          g.fillStyle = c.body;
          g.fillRect(X - 0.8 * s * m, y - 1.2 * s * m, 1.6 * s * m, 1.2 * s * m);
          g.fillStyle = c.lit;
          g.fillRect(X - 1 * s * m, y - 1.3 * s * m, 2 * s * m, 0.15 * s * m);
          for (let q = 0; q < 3; q++) {
            g.fillStyle = rgba(T.win[q], 0.5 + 0.4 * mf.hat);
            g.fillRect(X + (-0.6 + q * 0.45) * s * m, y - 0.85 * s * m, 0.3 * s * m, 0.3 * s * m);
          }
          glow(g, X, y, 0.8 * s * m, T.win[1], 0.3 + 0.3 * mf.kick);
        }
        // the station: a broad platform, domes, tethers, and the anchor's glowing ring
        g.fillStyle = c.body;
        poly(g, [X - 7 * m, base, X - 5 * m, base - 2.2 * m, X + 5 * m, base - 2.2 * m, X + 7 * m, base]);
        g.fillRect(X - 1.6 * m, base - 4.2 * m, 3.2 * m, 2.2 * m);
        for (const [dx, r] of [
          [-3.6, 1.2],
          [3.4, 1.5],
          [-5.6, 0.7],
        ]) {
          g.beginPath();
          g.arc(X + dx * m, base - 2.2 * m, r * m, Math.PI, TAU);
          g.fill();
          glow(g, X + dx * m, base - 2.2 * m - r * 0.6 * m, 0.25 * m, T.win[0], 0.6);
        }
        g.strokeStyle = c.dark;
        g.lineWidth = 0.08 * m;
        g.beginPath();
        for (const s of [-1, 1]) {
          g.moveTo(X, foot - 4 * m);
          g.lineTo(X + s * 5 * m, base - 2.2 * m);
        }
        g.stroke();
        g.strokeStyle = rgba(T.line, 0.4 + 0.6 * mf.kick);
        g.lineWidth = 0.12 * m;
        g.beginPath();
        g.ellipse(X, foot, (1.8 + 0.4 * mf.kick) * m, 0.4 * m, 0, 0, TAU);
        g.stroke();
        for (let k = 0; k < 7; k++) {
          g.fillStyle = rgba(T.win[k % 3], hash(k, i) < 0.4 + 0.5 * mf.stage ? 0.7 : 0.15);
          g.fillRect(X + (-4.6 + k * 1.4) * m, base - 1.3 * m, 0.5 * m, 0.3 * m);
        }
      });
    },
  },
  // a volcano island across the water: its cone, lava running down its gullies and glowing with the bass, its crater
  // spitting embers on the kick and blowing a fountain on a drop, a plume of smoke leaning off it
  {
    id: 'volcanoisle',
    tags: ['nature', 'hot', 'fantasy'],
    mood: [0.75, 0.3, 0.8],
    draw(f) {
      const { g, v, mf, T, t } = f,
        c = tones(T),
        lava = mix('#ff5a1a', T.win[2], 0.3),
        hot = '#ffd27a';
      landmark(f, 0.134, 34, 0.7, 276, (X, base, i) => {
        const m = v.ppm * 0.6,
          cy = base - 9 * m;
        // the plume: puffs rising and leaning away
        for (let k = 0; k < 9; k++) {
          const u = (t * 0.06 + k / 9) % 1;
          g.fillStyle = rgba(mix(T.far, T.sky[2], 0.5), 0.35 * (1 - u));
          g.beginPath();
          g.arc(X + u * 7 * m + Math.sin(k) * m, cy - u * 9 * m, (1 + 2.5 * u) * m, 0, TAU);
          g.fill();
        }
        // the glow of the crater on the smoke
        addGlow(g, X, cy - 1 * m, (4 + 3 * mf.bass) * m, lava, 0.3 + 0.4 * mf.bass + 0.3 * mf.drop);
        // the cone, with its lit and shaded slopes
        g.fillStyle = c.body;
        g.beginPath();
        g.moveTo(X - 13 * m, base);
        g.quadraticCurveTo(X - 5 * m, base - 4 * m, X - 1.4 * m, cy);
        g.lineTo(X + 1.4 * m, cy);
        g.quadraticCurveTo(X + 5 * m, base - 4 * m, X + 13 * m, base);
        g.fill();
        g.fillStyle = c.dark;
        g.beginPath();
        g.moveTo(X + 0.6 * m, cy + 0.3 * m);
        g.lineTo(X + 1.4 * m, cy);
        g.quadraticCurveTo(X + 5 * m, base - 4 * m, X + 13 * m, base);
        g.lineTo(X + 4 * m, base);
        g.fill();
        // lava gullies: rivers down the slope, their light running down on the beat
        const pulse = 0.35 + 0.55 * mf.bass;
        g.lineCap = 'round';
        for (let k = 0; k < 5; k++) {
          const sx = X + (k - 2) * 0.55 * m,
            ex = X + (k - 2) * (2 + hash(k, i) * 1.5) * m,
            ey = base - (1 + hash(k, 3) * 2.5) * m;
          g.strokeStyle = rgba(lava, pulse);
          g.lineWidth = (0.18 + 0.1 * hash(k, 4)) * m;
          g.beginPath();
          g.moveTo(sx, cy);
          g.quadraticCurveTo(sx + (ex - sx) * 0.3 + Math.sin(k * 3) * m, (cy + ey) / 2, ex, ey);
          g.stroke();
          const u = (beats(f) * 0.5 + k / 5) % 1;
          glow(g, sx + (ex - sx) * u, cy + (ey - cy) * u, 0.5 * m, hot, 0.5 * (1 - u));
        }
        // the crater's lip
        g.fillStyle = rgba(hot, 0.6 + 0.4 * mf.kick);
        g.beginPath();
        g.ellipse(X, cy, 1.4 * m, 0.25 * m, 0, 0, TAU);
        g.fill();
        // embers and on a drop a fountain of them
        const n = 10 + Math.round(16 * mf.drop);
        for (let k = 0; k < n; k++) {
          const u = (t * (0.5 + hash(k, 7) * 0.5) + hash(k, i)) % 1,
            vx = (hash(k, 9) - 0.5) * (4 + 4 * mf.drop),
            y = cy - u * (5 + 6 * mf.drop + 3 * mf.kick) * m + u * u * 5 * m;
          g.fillStyle = rgba(k % 3 ? lava : hot, (1 - u) * (0.5 + 0.5 * mf.kick));
          g.fillRect(X + vx * u * m, y, 0.15 * m, 0.15 * m);
        }
        // the sea at its foot, a strip of reflected lava trembling
        g.fillStyle = rgba(mix(T.far, '#000000', 0.2), 0.9);
        g.fillRect(X - 15 * m, base - 0.3 * m, 30 * m, 0.6 * m);
        for (let k = 0; k < 6; k++) {
          const w = (2.5 - k * 0.35) * m;
          g.fillStyle = rgba(lava, (0.4 - k * 0.05) * pulse);
          g.fillRect(X - w / 2 + Math.sin(t * 3 + k) * 0.3 * m, base - 0.25 * m + k * 0.09 * m, w, 0.05 * m);
        }
      });
    },
  },
  // an array of stadium floodlight masts: lattice poles with banks of lamps, their beams sweeping the sky in time,
  // every bank flashing on the kick
  {
    id: 'stadiumlights',
    tags: ['urban', 'modern', 'party'],
    mood: [0.8, 0.7, 0.5],
    draw(f) {
      const { g, v, mf, T } = f,
        c = tones(T);
      landmark(f, 0.15, 32, 0.7, 215, (X, base, i) => {
        const m = v.ppm * 0.36,
          bt = beats(f);
        // the stands' rim between them
        g.fillStyle = c.body;
        poly(g, [X - 12 * m, base, X - 10 * m, base - 3 * m, X + 10 * m, base - 3 * m, X + 12 * m, base]);
        g.fillStyle = rgba(T.win[0], 0.25 + 0.3 * mf.amp);
        g.fillRect(X - 10 * m, base - 3 * m, 20 * m, 0.15 * m);
        for (let k = 0; k < 40; k++) {
          if (hash(k, i) > 0.3 + 0.4 * mf.beat) continue;
          g.fillStyle = rgba(T.win[k % 3], 0.6);
          g.fillRect(X + (-10 + k * 0.5) * m, base - (1.5 + hash(k, 3)) * m, 0.08 * m, 0.08 * m);
        }
        for (let k = 0; k < 5; k++) {
          const px = X + (k - 2) * 4.6 * m,
            h = (12 + (k % 2) * 1.5) * m,
            top = base - h,
            sweep = Math.sin(bt * Math.PI * 0.5 + k * 0.9) * 0.6 + (k - 2) * 0.12;
          // the beam
          g.globalCompositeOperation = 'lighter';
          const L = 22 * m,
            ex = px + Math.sin(sweep) * L,
            ey = top - Math.cos(sweep) * L,
            nx = Math.cos(sweep) * 1.6 * m,
            ny = Math.sin(sweep) * 1.6 * m,
            gr = g.createLinearGradient(px, top, ex, ey);
          gr.addColorStop(0, rgba(T.win[2], 0.35 + 0.35 * mf.kick));
          gr.addColorStop(1, rgba(T.win[2], 0));
          g.fillStyle = gr;
          poly(g, [px - 0.5 * m, top, px + 0.5 * m, top, ex + nx, ey + ny, ex - nx, ey - ny]);
          g.globalCompositeOperation = 'source-over';
          // the mast: a tapering lattice
          g.fillStyle = c.dark;
          poly(g, [px - 0.5 * m, base - 3 * m, px - 0.12 * m, top, px + 0.12 * m, top, px + 0.5 * m, base - 3 * m]);
          g.strokeStyle = c.body;
          g.lineWidth = 0.05 * m;
          g.beginPath();
          for (let y = 0; y < h - 3 * m; y += 0.9 * m) {
            const w0 = 0.5 - (0.38 * y) / (h - 3 * m),
              w1 = 0.5 - (0.38 * (y + 0.9 * m)) / (h - 3 * m);
            g.moveTo(px - w0 * m, base - 3 * m - y);
            g.lineTo(px + w1 * m, base - 3 * m - y - 0.9 * m);
          }
          g.stroke();
          // the bank of lamps, a grid on a frame, flashing on the kick
          g.fillStyle = c.dark;
          g.fillRect(px - 1.4 * m, top - 1.4 * m, 2.8 * m, 1.6 * m);
          for (let r = 0; r < 3; r++)
            for (let q = 0; q < 5; q++) {
              const on = 0.5 + 0.5 * mf.kick;
              g.fillStyle = rgba('#fffbe8', on);
              g.fillRect(px + (-1.25 + q * 0.52) * m, top + (-1.25 + r * 0.5) * m, 0.38 * m, 0.36 * m);
            }
          addGlow(g, px, top - 0.6 * m, (2 + 2.5 * mf.kick) * m, T.win[2], 0.25 + 0.5 * mf.kick);
        }
      });
    },
  },
  // a spire of giant crystals: hexagonal prisms leaning out of a crag, each with a lit face and a dark one and a core
  // of light; glints race up their edges on the hats and the whole cluster shines on the downbeat
  {
    id: 'crystalspire',
    tags: ['fantasy', 'nature', 'cold', 'neon'],
    mood: [0.5, 0.7, 0.4],
    draw(f) {
      const { g, v, mf, T, t } = f,
        c = tones(T),
        ice = mix(mix(T.line, T.far, 0.3), T.sky[2], 0.3),
        deep = mix(T.line, T.far, 0.72);
      landmark(f, 0.172, 30, 0.7, 233, (X, base, i) => {
        const m = v.ppm * 0.3;
        addGlow(g, X, base - 7 * m, (7 + 3 * mf.down) * m, T.line, 0.12 + 0.3 * mf.down);
        // the crag they grow from
        g.fillStyle = c.body;
        poly(g, [
          X - 8 * m,
          base,
          X - 5 * m,
          base - 2.2 * m,
          X - 1.5 * m,
          base - 3 * m,
          X + 2.5 * m,
          base - 2.6 * m,
          X + 6 * m,
          base - 1.4 * m,
          X + 8.5 * m,
          base,
        ]);
        // the crystals, back ones first
        const XT = [
          [-3.6, 7, -0.35, 1],
          [3.4, 8, 0.3, 1.1],
          [-1.2, 9, -0.12, 1.3],
          [1.6, 10.5, 0.08, 1.5],
          [-0.2, 12.5, -0.02, 1.8],
          [4.8, 5, 0.6, 0.8],
          [-5, 4.5, -0.7, 0.75],
        ];
        XT.forEach(([dx, h, lean, w], k) => {
          g.save();
          g.translate(X + dx * m, base - 2.4 * m);
          g.rotate(lean);
          const H = h * m,
            W = w * m;
          // (the left face lit, the right in shade, the point)
          g.fillStyle = rgba(ice, 0.85);
          poly(g, [-W, 0, -W, -H, 0, -H - W * 1.4, 0, 0]);
          g.fillStyle = rgba(deep, 0.95);
          poly(g, [0, 0, 0, -H - W * 1.4, W, -H, W, 0]);
          // the core of light inside, beating with the bass
          const gr = g.createLinearGradient(0, 0, 0, -H);
          gr.addColorStop(0, rgba('#ffffff', 0));
          gr.addColorStop(0.6, rgba('#ffffff', 0.25 + 0.35 * mf.bass));
          gr.addColorStop(1, rgba('#ffffff', 0));
          g.fillStyle = gr;
          g.fillRect(-W * 0.3, -H, W * 0.6, H);
          // the edges
          g.strokeStyle = rgba('#ffffff', 0.35 + 0.3 * mf.beat);
          g.lineWidth = 0.05 * m;
          g.beginPath();
          g.moveTo(-W, 0);
          g.lineTo(-W, -H);
          g.lineTo(0, -H - W * 1.4);
          g.lineTo(W, -H);
          g.moveTo(0, 0);
          g.lineTo(0, -H - W * 1.4);
          g.stroke();
          // a glint racing up the middle edge on the hats
          const u = (t * 0.7 + hash(k, i)) % 1;
          glow(g, 0, -u * (H + W * 1.4), (0.25 + 0.6 * mf.hat) * m, '#ffffff', 0.3 + 0.7 * mf.hat);
          g.restore();
        });
        // rays thrown off the top on the hats: thin lines fanning out
        g.globalCompositeOperation = 'lighter';
        g.strokeStyle = rgba(ice, 0.15 + 0.4 * mf.hat);
        g.lineWidth = 0.06 * m;
        g.beginPath();
        const tx = X - 0.2 * m,
          ty = base - 2.4 * m - 12.5 * m - 1.8 * 1.4 * m;
        for (let k = 0; k < 7; k++) {
          const a = -Math.PI / 2 + (k - 3) * 0.32 + Math.sin(t * 0.5) * 0.08;
          g.moveTo(tx, ty);
          g.lineTo(tx + Math.cos(a) * 5 * m, ty + Math.sin(a) * 5 * m);
        }
        g.stroke();
        g.globalCompositeOperation = 'source-over';
        glow(g, tx, ty, (0.5 + 1.2 * mf.hat) * m, '#ffffff', 0.5 + 0.5 * mf.hat);
      });
    },
  },
  // a tall pagoda of six tiers, each with upswept eaves and lit rooms, lanterns hanging from the eave tips and
  // swinging on the beat, a ringed spire on top
  {
    id: 'pagodatower',
    tags: ['ancient', 'fantasy', 'mild', 'warm'],
    mood: [0.4, 0.7, 0.3],
    draw(f) {
      const { g, v, mf, T } = f,
        c = tones(T),
        lantern = mix('#ff4a2a', T.win[2], 0.3);
      landmark(f, 0.156, 32, 0.7, 294, (X, base, i) => {
        const m = v.ppm * 0.31,
          sw = Math.sin(beats(f) * Math.PI) * 0.35;
        // the plinth
        g.fillStyle = c.body;
        g.fillRect(X - 4.5 * m, base - 0.8 * m, 9 * m, 0.8 * m);
        let y = base - 0.8 * m,
          w = 3.4;
        for (let k = 0; k < 6; k++) {
          const h = (1.7 - k * 0.1) * m,
            ew = w + 1.6;
          // the room and its lit windows
          g.fillStyle = c.body;
          g.fillRect(X - w * m * 0.5, y - h, w * m, h);
          const n = Math.max(2, Math.round(w / 0.7));
          for (let q = 0; q < n; q++) {
            const on = hash(q + k * 9, i) < 0.4 + 0.5 * mf.stage;
            g.fillStyle = rgba(T.win[(q + k) % 3], on ? 0.45 + 0.35 * mf.voice : 0.1);
            g.fillRect(
              X + (-w / 2 + 0.2 + (q * (w - 0.4)) / n) * m,
              y - h * 0.75,
              ((w - 0.4) / n - 0.15) * m,
              h * 0.45,
            );
          }
          // the eave: a heavy curved roof, its tips swept up, its underside catching the rooms' light
          const ey = y - h,
            L0 = X - (ew * 0.5 + 0.6) * m,
            R0 = X + (ew * 0.5 + 0.6) * m;
          g.fillStyle = c.dark;
          g.beginPath();
          g.moveTo(L0, ey - 0.75 * m);
          g.quadraticCurveTo(X - w * 0.5 * m, ey + 0.15 * m, X - w * 0.3 * m, ey + 0.1 * m);
          g.lineTo(X + w * 0.3 * m, ey + 0.1 * m);
          g.quadraticCurveTo(X + w * 0.5 * m, ey + 0.15 * m, R0, ey - 0.75 * m);
          g.quadraticCurveTo(X + w * 0.45 * m, ey - 0.55 * m, X + w * 0.25 * m, ey - 1.15 * m);
          g.lineTo(X - w * 0.25 * m, ey - 1.15 * m);
          g.quadraticCurveTo(X - w * 0.45 * m, ey - 0.55 * m, L0, ey - 0.75 * m);
          g.fill();
          g.strokeStyle = rgba(T.win[2], 0.25 + 0.3 * mf.beat);
          g.lineWidth = 0.08 * m;
          g.beginPath();
          g.moveTo(L0, ey - 0.75 * m);
          g.quadraticCurveTo(X - w * 0.5 * m, ey + 0.15 * m, X - w * 0.3 * m, ey + 0.1 * m);
          g.lineTo(X + w * 0.3 * m, ey + 0.1 * m);
          g.quadraticCurveTo(X + w * 0.5 * m, ey + 0.15 * m, R0, ey - 0.75 * m);
          g.stroke();
          // a lantern from each tip, swinging
          for (const s of [-1, 1]) {
            const hx = X + s * (ew * 0.5 + 0.5) * m,
              hy = ey - 0.65 * m,
              a = sw * (k % 2 ? 1 : -1),
              lx = hx + Math.sin(a) * 0.8 * m,
              ly = hy + Math.cos(a) * 0.8 * m;
            g.strokeStyle = c.dark;
            g.lineWidth = 0.04 * m;
            g.beginPath();
            g.moveTo(hx, hy);
            g.lineTo(lx, ly);
            g.stroke();
            glow(g, lx, ly + 0.15 * m, (0.45 + 0.35 * mf.beat) * m, lantern, 0.4 + 0.4 * mf.beat);
            g.fillStyle = rgba(lantern, 0.95);
            g.beginPath();
            g.ellipse(lx, ly + 0.15 * m, 0.13 * m, 0.18 * m, 0, 0, TAU);
            g.fill();
          }
          y = ey - 1.1 * m;
          w *= 0.85;
        }
        // the spire with its rings
        g.fillStyle = c.dark;
        g.fillRect(X - 0.07 * m, y - 3.5 * m, 0.14 * m, 3.5 * m);
        for (let k = 0; k < 6; k++)
          g.fillRect(X - (0.4 - k * 0.04) * m, y - (0.5 + k * 0.45) * m, (0.8 - k * 0.08) * m, 0.1 * m);
        glow(g, X, y - 3.6 * m, (0.4 + 0.9 * mf.down) * m, T.win[1], 0.5 + 0.5 * mf.down);
      });
    },
  },
  // a radio mast: a tall tapering lattice held by guy wires, red lights up it blinking on the beat, a beacon at the
  // top, and rings of radio waves rolling off it on the kick
  {
    id: 'radiotower',
    tags: ['industrial', 'modern', 'tech', 'urban'],
    mood: [0.5, 0.4, 0.6],
    draw(f) {
      const { g, v, mf, T } = f,
        c = tones(T);
      landmark(f, 0.184, 26, 0.7, 535, (X, base, i) => {
        const m = v.ppm * 0.31,
          H = 17 * m,
          top = base - H,
          wAt = y => (0.15 + (0.95 * (base - y)) / H) * m;
        // the waves: three arcs leaving the top, the newest on the kick
        for (let k = 0; k < 3; k++) {
          const u = (beats(f) + k / 3) % 1,
            r = (1 + u * 9) * m;
          g.strokeStyle = rgba(T.line, (1 - u) * (0.25 + 0.4 * mf.kick));
          g.lineWidth = 0.1 * m;
          g.beginPath();
          g.arc(X, top, r, -Math.PI * 0.85, -Math.PI * 0.15);
          g.stroke();
        }
        // the guy wires
        g.strokeStyle = rgba(c.dark, 0.7);
        g.lineWidth = Math.max(1, 0.03 * m);
        g.beginPath();
        for (const s of [-1, 1])
          for (const u of [0.3, 0.6, 0.9]) {
            g.moveTo(X, base - H * u);
            g.lineTo(X + s * (3 + u * 6) * m, base);
          }
        g.stroke();
        // the lattice: two legs, cross braces
        g.strokeStyle = c.body;
        g.lineWidth = 0.32 * m;
        g.beginPath();
        g.moveTo(X - 1.1 * m, base);
        g.lineTo(X - 0.15 * m, top);
        g.moveTo(X + 1.1 * m, base);
        g.lineTo(X + 0.15 * m, top);
        g.stroke();
        g.lineWidth = 0.12 * m;
        g.beginPath();
        for (let y = base, s = 1; y > top + 0.6 * m; y -= 0.8 * m, s = -s) {
          g.moveTo(X - s * (wAt(y) - 0.15 * m), y);
          g.lineTo(X + s * (wAt(y - 0.8 * m) - 0.15 * m), y - 0.8 * m);
        }
        g.stroke();
        // the platforms and their dishes
        for (const u of [0.45, 0.75]) {
          const y = base - H * u;
          g.fillStyle = c.body;
          g.fillRect(X - wAt(y) - 0.4 * m, y, (wAt(y) + 0.4 * m) * 2, 0.15 * m);
          g.beginPath();
          g.ellipse(X + wAt(y) + 0.3 * m, y - 0.5 * m, 0.25 * m, 0.55 * m, 0, 0, TAU);
          g.fill();
        }
        g.fillRect(X - 0.04 * m, top - 2 * m, 0.08 * m, 2 * m);
        // red lights up the mast, alternating rows blinking on the beat
        const odd = Math.floor(beats(f)) % 2;
        for (let k = 1; k <= 6; k++) {
          const y = base - (H * k) / 6.5,
            on = (k % 2 === odd ? 1 : 0.2) * (0.5 + 0.5 * mf.beat);
          for (const s of [-1, 1]) glow(g, X + s * wAt(y) * 0.9, y, (0.25 + 0.3 * on) * m, '#ff2a3a', 0.25 + 0.7 * on);
        }
        addGlow(g, X, top - 2 * m, (0.6 + 1.6 * mf.down) * m, '#ff2a3a', 0.5 + 0.5 * mf.down);
      });
    },
  },
  // a colossal gate: two pillars, a tie beam and an upswept lintel; between the pillars a sheet of energy rippling,
  // scan lines running down it, flaring on a drop
  {
    id: 'gate',
    tags: ['fantasy', 'ancient', 'future', 'neon'],
    mood: [0.6, 0.5, 0.6],
    draw(f) {
      const { g, v, mf, T, t } = f,
        c = tones(T),
        lac = mix('#c8281e', T.far, 0.45);
      landmark(f, 0.132, 36, 0.7, 396, (X, base, i) => {
        const m = v.ppm * 0.42,
          hw = 5 * m,
          top = base - 12 * m;
        // the field between the pillars
        const e = 0.3 + 0.3 * mf.bass + 0.4 * mf.drop,
          gr = g.createLinearGradient(X - hw, 0, X + hw, 0);
        gr.addColorStop(0, rgba(T.line, 0.6 * e));
        gr.addColorStop(0.5, rgba(T.line, 0.15 * e));
        gr.addColorStop(1, rgba(T.line, 0.6 * e));
        g.fillStyle = gr;
        g.fillRect(X - hw, top + 1.6 * m, hw * 2, base - top - 1.6 * m);
        g.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 9; k++) {
          const u = (t * 0.25 + k / 9) % 1,
            y = top + 1.6 * m + u * (base - top - 1.6 * m);
          g.fillStyle = rgba('#ffffff', 0.12 + 0.25 * mf.hat);
          g.fillRect(X - hw, y, hw * 2, 0.06 * m);
        }
        // ripples spreading from the middle on the kick
        g.strokeStyle = rgba(T.line, 0.5 * mf.kick + 0.2 * mf.drop);
        g.lineWidth = 0.1 * m;
        for (let k = 0; k < 2; k++) {
          const r = (0.5 + (1 - mf.kick) * 3 + k * 1.5) * m;
          g.beginPath();
          g.ellipse(X, base - 5.5 * m, Math.min(hw, r), r * 1.4, 0, 0, TAU);
          g.stroke();
        }
        g.globalCompositeOperation = 'source-over';
        addGlow(g, X, base - 6 * m, 7 * m, T.line, 0.1 + 0.3 * e);
        // the pillars
        for (const s of [-1, 1]) {
          const px = X + s * (hw + 0.5 * m);
          g.fillStyle = lac;
          poly(g, [px - 0.55 * m, base, px - 0.45 * m, top, px + 0.45 * m, top, px + 0.55 * m, base]);
          g.fillStyle = rgba('#000000', 0.3);
          g.fillRect(px + 0.1 * s * m, top, 0.35 * m, base - top);
          g.fillStyle = c.dark;
          g.fillRect(px - 0.75 * m, base - 0.9 * m, 1.5 * m, 0.9 * m);
          // glyphs down each pillar, lit in turn on the beat
          for (let k = 0; k < 8; k++) {
            const on = Math.floor(beats(f)) % 8 === k;
            g.fillStyle = rgba(T.line, on ? 0.9 : 0.2 + 0.2 * mf.stage);
            g.fillRect(px - 0.12 * m, top + (2.6 + k * 1.05) * m, 0.24 * m, 0.5 * m);
          }
        }
        // the tie beam and the lintel with its swept-up ends
        g.fillStyle = lac;
        g.fillRect(X - hw - 1.6 * m, top + 1.5 * m, hw * 2 + 3.2 * m, 0.6 * m);
        g.fillStyle = c.dark;
        g.beginPath();
        g.moveTo(X - hw - 2.8 * m, top - 0.9 * m);
        g.quadraticCurveTo(X, top + 0.3 * m, X + hw + 2.8 * m, top - 0.9 * m);
        g.lineTo(X + hw + 2.4 * m, top + 0.2 * m);
        g.quadraticCurveTo(X, top + 0.9 * m, X - hw - 2.4 * m, top + 0.2 * m);
        g.fill();
        g.fillStyle = lac;
        g.fillRect(X - 0.4 * m, top + 0.3 * m, 0.8 * m, 1.3 * m);
        glow(g, X, top + 0.9 * m, (0.5 + 1 * mf.down) * m, T.win[1], 0.4 + 0.6 * mf.down);
      });
    },
  },
  // a clock tower: a tall square shaft, a great lit face whose minute hand ticks a step on every beat and the hour
  // hand on every bar, a belfry and a spire; the face flashes on the downbeat
  {
    id: 'clocktower',
    tags: ['gothic', 'urban', 'ancient', 'mild'],
    mood: [0.5, 0.5, 0.4],
    draw(f) {
      const { g, v, mf, T } = f,
        c = tones(T);
      landmark(f, 0.176, 30, 0.7, 217, (X, base, i) => {
        const m = v.ppm * 0.27,
          w = 3.6 * m,
          top = base - 13 * m,
          cy = top + 2.2 * m,
          R = 1.45 * m,
          bt = beats(f);
        // the shaft with its buttressed foot and its slit windows
        g.fillStyle = c.body;
        g.fillRect(X - w / 2, top, w, 13 * m);
        poly(g, [
          X - w / 2 - 0.8 * m,
          base,
          X - w / 2,
          base - 3 * m,
          X + w / 2,
          base - 3 * m,
          X + w / 2 + 0.8 * m,
          base,
        ]);
        g.fillStyle = c.dark;
        g.fillRect(X + w / 2 - 0.6 * m, top, 0.6 * m, 13 * m);
        for (let k = 0; k < 4; k++) {
          g.fillStyle = rgba(T.win[k % 3], hash(k, i) < 0.3 + 0.6 * mf.stage ? 0.45 + 0.3 * mf.voice : 0.12);
          g.fillRect(X - 0.15 * m, top + (5 + k * 1.8) * m, 0.3 * m, 0.9 * m);
        }
        // the cornice, the belfry and the spire with its pinnacles
        g.fillStyle = c.lit;
        g.fillRect(X - w / 2 - 0.3 * m, top - 0.3 * m, w + 0.6 * m, 0.3 * m);
        g.fillStyle = c.body;
        g.fillRect(X - w / 2 + 0.3 * m, top - 2.6 * m, w - 0.6 * m, 2.3 * m);
        g.fillStyle = rgba('#000000', 0.5);
        for (const s of [-1, 1]) g.fillRect(X + s * 0.7 * m - 0.35 * m, top - 2.2 * m, 0.7 * m, 1.5 * m);
        glow(g, X, top - 1.5 * m, (0.6 + 1 * mf.down) * m, T.win[2], 0.2 + 0.5 * mf.down);
        g.fillStyle = c.body;
        poly(g, [X - w / 2 + 0.1 * m, top - 2.6 * m, X, top - 7 * m, X + w / 2 - 0.1 * m, top - 2.6 * m]);
        for (const s of [-1, 1])
          poly(g, [
            X + s * (w / 2) - 0.3 * m,
            top - 0.3 * m,
            X + s * (w / 2),
            top - 2.2 * m,
            X + s * (w / 2) + 0.3 * m,
            top - 0.3 * m,
          ]);
        g.fillRect(X - 0.04 * m, top - 8 * m, 0.08 * m, 1.2 * m);
        // the face: lit from behind, flashing on the downbeat
        addGlow(g, X, cy, R * 2.6, T.win[1], 0.2 + 0.4 * mf.down + 0.15 * mf.voice);
        g.fillStyle = rgba(mix(T.win[1], '#ffffff', 0.5), 0.75 + 0.25 * mf.down);
        g.beginPath();
        g.arc(X, cy, R, 0, TAU);
        g.fill();
        g.strokeStyle = c.dark;
        g.lineWidth = 0.14 * m;
        g.stroke();
        // its twelve marks
        g.lineWidth = 0.07 * m;
        g.beginPath();
        for (let k = 0; k < 12; k++) {
          const a = (k * TAU) / 12,
            r0 = k % 3 ? 0.82 : 0.7;
          g.moveTo(X + Math.cos(a) * R * r0, cy + Math.sin(a) * R * r0);
          g.lineTo(X + Math.cos(a) * R * 0.94, cy + Math.sin(a) * R * 0.94);
        }
        g.stroke();
        // the hands: the minute a tick per beat (with a little kick past it), the hour a tick per bar
        const tick = Math.floor(bt),
          kick = Math.max(0, 1 - (bt - tick) * 6) * 0.04,
          am = ((tick + kick) * TAU) / 60 - Math.PI / 2,
          ah = ((Math.floor(bt / 4) + 2) * TAU) / 48 - Math.PI / 2;
        g.lineCap = 'round';
        g.strokeStyle = '#120e0c';
        g.lineWidth = 0.16 * m;
        g.beginPath();
        g.moveTo(X, cy);
        g.lineTo(X + Math.cos(ah) * R * 0.55, cy + Math.sin(ah) * R * 0.55);
        g.stroke();
        g.lineWidth = 0.09 * m;
        g.beginPath();
        g.moveTo(X, cy);
        g.lineTo(X + Math.cos(am) * R * 0.85, cy + Math.sin(am) * R * 0.85);
        g.stroke();
        g.fillStyle = '#120e0c';
        g.beginPath();
        g.arc(X, cy, 0.12 * m, 0, TAU);
        g.fill();
      });
    },
  },
  // a village up in great trees: broad trunks and crowns, houses on platforms with lit windows, rope bridges sagging
  // between them hung with lanterns that swing on the beat, fireflies about the crowns on the hats
  {
    id: 'treehouse',
    tags: ['nature', 'fantasy', 'warm', 'mild'],
    mood: [0.35, 0.75, 0.2],
    draw(f) {
      const { g, v, mf, T, t } = f,
        c = tones(T),
        leaf = mix(mix(T.far, T.sky[2], 0.35), '#3a8a4a', 0.38),
        leafLit = mix(mix(T.far, T.sky[2], 0.55), '#82d070', 0.42);
      landmark(f, 0.16, 32, 0.7, 218, (X, base, i) => {
        const m = v.ppm * 0.27,
          trees = [
            [-6.5, 11, 1],
            [0, 14, 1.3],
            [6.5, 10, 0.9],
          ],
          sw = Math.sin(beats(f) * Math.PI) * 0.3,
          decks = [];
        trees.forEach(([dx, h, s], k) => {
          const tx = X + dx * m;
          // the crowns first, behind every house
          g.fillStyle = leaf;
          for (let q = 0; q < 6; q++) {
            const a = (q / 6) * Math.PI + Math.PI,
              r = (2.2 + 0.8 * hash(q, k + i)) * s * m;
            g.beginPath();
            g.arc(tx + Math.cos(a) * 1.8 * s * m, base - h * m + Math.sin(a) * 1.4 * s * m, r, 0, TAU);
            g.fill();
          }
          g.fillStyle = leafLit;
          for (let q = 0; q < 3; q++) {
            g.beginPath();
            g.arc(
              tx + (-1.6 + q * 0.9) * s * m,
              base - (h + (1.3 + 0.5 * (q % 2)) * s) * m,
              (1.2 - 0.2 * q) * s * m,
              0,
              TAU,
            );
            g.fill();
          }
        });
        trees.forEach(([dx, h, s], k) => {
          const tx = X + dx * m;
          // the trunk with its root flare
          g.fillStyle = c.dark;
          poly(g, [
            tx - 1.3 * s * m,
            base,
            tx - 0.45 * s * m,
            base - 2 * m,
            tx - 0.35 * s * m,
            base - h * m,
            tx + 0.35 * s * m,
            base - h * m,
            tx + 0.45 * s * m,
            base - 2 * m,
            tx + 1.3 * s * m,
            base,
          ]);
          // the house: a platform, walls, a pitched roof, lit windows
          const dy = base - h * 0.66 * m;
          decks.push([tx, dy]);
          g.fillStyle = c.body;
          g.fillRect(tx - 2 * s * m, dy, 4 * s * m, 0.25 * m);
          g.fillRect(tx - 1.4 * s * m, dy - 1.6 * s * m, 2.8 * s * m, 1.6 * s * m);
          poly(g, [tx - 1.8 * s * m, dy - 1.6 * s * m, tx, dy - 2.8 * s * m, tx + 1.8 * s * m, dy - 1.6 * s * m]);
          for (let q = 0; q < 2; q++) {
            g.fillStyle = rgba(T.win[(q + k) % 3], 0.55 + 0.35 * mf.voice);
            g.fillRect(tx + (-0.9 + q * 1.1) * s * m, dy - 1.15 * s * m, 0.6 * s * m, 0.6 * s * m);
          }
          // the ladder down
          g.strokeStyle = c.dark;
          g.lineWidth = 0.05 * m;
          g.beginPath();
          g.moveTo(tx + 1.6 * s * m, dy);
          g.lineTo(tx + 1.6 * s * m, base);
          g.stroke();
          // a little house higher up in the biggest
          if (k === 1) {
            const hy = base - h * 0.85 * m;
            g.fillStyle = c.body;
            g.fillRect(tx - 0.9 * m, hy, 1.8 * m, 0.2 * m);
            g.fillRect(tx - 0.6 * m, hy - 1 * m, 1.2 * m, 1 * m);
            poly(g, [tx - 0.9 * m, hy - 1 * m, tx, hy - 1.8 * m, tx + 0.9 * m, hy - 1 * m]);
            g.fillStyle = rgba(T.win[1], 0.6 + 0.4 * mf.beat);
            g.fillRect(tx - 0.2 * m, hy - 0.7 * m, 0.4 * m, 0.4 * m);
          }
        });
        // the rope bridges, sagging, hung with lanterns
        for (let k = 0; k < decks.length - 1; k++) {
          const [ax, ay] = decks[k],
            [bx, by] = decks[k + 1],
            sag = 1.4 * m,
            pt = u => [ax + (bx - ax) * u, ay + (by - ay) * u + Math.sin(u * Math.PI) * sag];
          g.strokeStyle = c.dark;
          g.lineWidth = 0.07 * m;
          g.beginPath();
          for (let s = 0; s <= 12; s++) {
            const [x, y] = pt(s / 12);
            if (s) g.lineTo(x, y);
            else g.moveTo(x, y);
          }
          g.stroke();
          for (let s = 1; s < 6; s++) {
            const [x, y] = pt(s / 6),
              a = sw * (s % 2 ? 1 : -1),
              lx = x + Math.sin(a) * 0.5 * m,
              ly = y + Math.cos(a) * 0.5 * m;
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(lx, ly);
            g.stroke();
            glow(g, lx, ly, (0.35 + 0.3 * mf.beat) * m, T.win[s % 3], 0.5 + 0.4 * mf.beat);
          }
        }
        // fireflies round the crowns
        for (let k = 0; k < 14; k++) {
          const a = t * (0.3 + 0.3 * hash(k, 3)) + k,
            fx = X + (hash(k, i) - 0.5) * 16 * m + Math.cos(a) * m,
            fy = base - (8 + 7 * hash(k, 5)) * m + Math.sin(a * 1.3) * m;
          glow(g, fx, fy, 0.2 * m, T.win[1], 0.2 + 0.7 * mf.hat * hash(k, 9));
        }
      });
    },
  },
  // a cliff of many waterfalls: a wall of rock over a terrace, falls pouring off its brow and on down the terrace in
  // threads of foam that step down a notch on every beat, mist boiling at their feet with the bass, a rainbow on the
  // voice
  {
    id: 'cascades',
    tags: ['nature', 'mild', 'cold'],
    mood: [0.4, 0.7, 0.3],
    draw(f) {
      const { g, v, mf, T, t } = f,
        c = tones(T),
        water = mix(mix(T.sky[2], T.line, 0.25), '#e4f6ff', 0.3);
      landmark(f, 0.142, 32, 0.7, 352, (X, base, i) => {
        const m = v.ppm * 0.5,
          W = 12,
          rim = x => base - (8 + 1.1 * Math.sin(x * 0.33 + i) + 0.5 * Math.sin(x * 1.1 + i * 2)) * m,
          ter = base - 3.6 * m,
          bt = beats(f),
          step = Math.floor(bt) + Math.min(1, (bt % 1) * 4);
        // a fall from y0 to y1 at Xk, w wide: a sheet of water, three threads of foam stepping down on the beat
        const fall = (Xk, y0, y1, w, k) => {
          // (its glow on the rock behind it)
          const halo = g.createLinearGradient(Xk - w * 1.4, 0, Xk + w * 1.4, 0);
          halo.addColorStop(0, rgba(water, 0));
          halo.addColorStop(0.5, rgba(water, 0.25 + 0.2 * mf.bass));
          halo.addColorStop(1, rgba(water, 0));
          g.fillStyle = halo;
          g.fillRect(Xk - w * 1.4, y0, w * 2.8, y1 - y0);
          const gr = g.createLinearGradient(0, y0, 0, y1);
          gr.addColorStop(0, rgba(water, 0.6));
          gr.addColorStop(1, rgba(water, 0.85));
          g.fillStyle = gr;
          g.beginPath();
          g.moveTo(Xk - w / 2, y0);
          g.quadraticCurveTo(Xk - w * 0.45, y0 + 0.6 * m, Xk - w * 0.55, y0 + 1.2 * m);
          g.lineTo(Xk - w * 0.7, y1);
          g.lineTo(Xk + w * 0.7, y1);
          g.lineTo(Xk + w * 0.55, y0 + 1.2 * m);
          g.quadraticCurveTo(Xk + w * 0.45, y0 + 0.6 * m, Xk + w / 2, y0);
          g.fill();
          // (threads of darker water and of white foam, sliding down a notch on each beat)
          for (let q = 0; q < 5; q++) {
            const lx = Xk + (q / 4 - 0.5) * w * 0.9,
              seg = (1.2 + 0.8 * hash(k * 5 + q, 4)) * m,
              off = ((step * 0.5 * m + hash(k * 5 + q, 2) * seg) % seg) - seg;
            g.fillStyle = q % 2 ? rgba(mix(water, T.far, 0.4), 0.5) : rgba(mix(water, '#ffffff', 0.6), 0.4 + 0.45 * mf.beat);
            for (let y = y0 + off; y < y1; y += seg) {
              const a = Math.max(y0, y),
                b2 = Math.min(y1, y + seg * 0.7);
              if (b2 > a) g.fillRect(lx - 0.05 * m, a, 0.1 * m, b2 - a);
            }
          }
          // (the lip where it pours over)
          g.fillStyle = rgba(mix(water, '#ffffff', 0.6), 0.75);
          g.fillRect(Xk - w * 0.55, y0 - 0.06 * m, w * 1.1, 0.16 * m);
          // (the spray at its foot)
          for (let q = 0; q < 3; q++) {
            g.fillStyle = rgba(mix(water, '#ffffff', 0.4), 0.25 + 0.3 * mf.kick);
            g.beginPath();
            g.arc(Xk + (q - 1) * w * 0.5, y1 - 0.2 * m, (0.35 + 0.25 * mf.kick) * w, Math.PI, TAU);
            g.fill();
          }
        };
        // the upper cliff, its ledges and the green on its brow
        g.fillStyle = c.body;
        g.beginPath();
        g.moveTo(X - (W + 3) * m, base);
        g.lineTo(X - (W + 1) * m, rim(-W));
        for (let x = -W; x <= W; x += 0.5) g.lineTo(X + x * m, rim(x));
        g.lineTo(X + (W + 3) * m, base);
        g.fill();
        g.fillStyle = c.dark;
        for (let k = 0; k < 5; k++)
          g.fillRect(X + (hash(k, i) - 0.5) * 18 * m, ter - (1 + k * 0.7) * m, (2 + 3 * hash(k, 3)) * m, 0.2 * m);
        g.fillStyle = mix(T.far, '#2a6a38', 0.3);
        g.beginPath();
        g.moveTo(X - (W + 1) * m, rim(-W));
        for (let x = -W; x <= W; x += 0.5) g.lineTo(X + x * m, rim(x) - 0.3 * m);
        for (let x = W; x >= -W; x -= 0.5) g.lineTo(X + x * m, rim(x) + 0.2 * m);
        g.fill();
        // the upper falls
        const F = [-9, -6.2, -3.4, -0.8, 1.8, 4.6, 7.4, 10];
        F.forEach((x, k) => fall(X + x * m, rim(x) + 0.05 * m, ter, (1.2 + 1 * hash(k, i + 7)) * m, k));
        // the terrace: its lit edge, its darker face
        g.fillStyle = c.dark;
        poly(g, [X - (W + 4) * m, base, X - (W + 2) * m, ter, X + (W + 2) * m, ter, X + (W + 4) * m, base]);
        g.fillStyle = rgba(c.lit, 0.9);
        g.fillRect(X - (W + 2) * m, ter - 0.12 * m, (2 * W + 4) * m, 0.2 * m);
        // the lower falls, fewer and wider, fed by the pools on the terrace
        [-7.6, -2.1, 3.2, 8.7].forEach((x, k) =>
          fall(X + x * m, ter + 0.05 * m, base, (1.4 + 1 * hash(k, i + 9)) * m, k + 20),
        );
        for (let k = 0; k < 6; k++) {
          const u = (t * 0.25 + k / 6) % 1;
          g.fillStyle = rgba(water, 0.25 * (1 - u));
          g.beginPath();
          g.arc(X + (k - 2.5) * 4 * m, ter - u * 1.6 * m, (0.8 + 1.2 * u) * m, 0, TAU);
          g.fill();
        }
        // the mist at the foot
        for (let k = 0; k < 9; k++) {
          const u = (t * 0.2 + k / 9) % 1;
          g.fillStyle = rgba(water, (0.25 + 0.25 * mf.bass) * (1 - u));
          g.beginPath();
          g.arc(
            X + (k - 4) * 2.8 * m + Math.sin(t + k) * 0.5 * m,
            base - u * 2.5 * m,
            (1.2 + 1.5 * u + 0.6 * mf.bass) * m,
            0,
            TAU,
          );
          g.fill();
        }
        // a rainbow in the spray, there with the voice
        if (mf.voice > 0.05) {
          const cols = ['#ff4a4a', '#ffb23a', '#fff15a', '#4adc6a', '#4a8cff', '#9a5aff'];
          g.lineWidth = 0.18 * m;
          cols.forEach((col, k) => {
            g.strokeStyle = rgba(col, 0.25 * mf.voice);
            g.beginPath();
            g.arc(X + 2 * m, base, (6 - k * 0.18) * m, Math.PI * 1.1, Math.PI * 1.9);
            g.stroke();
          });
        }
      });
    },
  },
  // a colossal hand rising out of the ground: a forearm, a palm open to the sky, five jointed fingers that twitch
  // with the snare, its joints glowing seams that flare on the kick
  {
    id: 'hand',
    tags: ['fantasy', 'future', 'ancient'],
    mood: [0.6, 0.3, 0.7],
    draw(f) {
      const { g, v, mf, T, t } = f,
        c = { body: mix(T.far, T.sky[2], 0.18), lit: mix(T.far, T.sky[2], 0.42), dark: mix(T.far, '#000000', 0.25) };
      landmark(f, 0.158, 33, 0.7, 360, (X, base, i) => {
        const m = v.ppm * 0.45,
          wy = base - 6 * m,
          px = X,
          py = wy - 2.6 * m;
        // the rubble and dust where it broke through
        g.fillStyle = c.dark;
        for (let k = -6; k <= 6; k++) {
          const s = (0.6 + 0.8 * hash(k, i)) * m;
          poly(g, [X + k * 0.9 * m - s, base, X + k * 0.9 * m, base - s * 1.2, X + k * 0.9 * m + s, base]);
        }
        // the forearm with its plates
        g.fillStyle = c.body;
        poly(g, [X - 2.4 * m, base, X - 2 * m, wy, X + 2 * m, wy, X + 2.6 * m, base]);
        g.fillStyle = c.dark;
        poly(g, [X + 0.8 * m, base, X + 0.9 * m, wy, X + 2 * m, wy, X + 2.6 * m, base]);
        g.strokeStyle = rgba(T.line, 0.25 + 0.6 * mf.kick);
        g.lineWidth = 0.08 * m;
        g.beginPath();
        for (const u of [0.3, 0.65]) {
          g.moveTo(X - 2.3 * m, base - (base - wy) * u);
          g.lineTo(X + 2.5 * m, base - (base - wy) * u);
        }
        g.stroke();
        // the palm
        g.fillStyle = c.body;
        poly(g, [px - 2.4 * m, wy, px - 2.7 * m, py, px + 2.6 * m, py - 0.2 * m, px + 2.3 * m, wy]);
        g.fillStyle = c.lit;
        poly(g, [px - 2.7 * m, py, px - 0.6 * m, py - 0.1 * m, px - 1.2 * m, wy, px - 2.4 * m, wy]);
        // the palm's core glowing with the bass: a ring of runes carved in it, its eye of light
        const cy = (wy + py) / 2;
        addGlow(g, px, cy, (1.6 + 1.6 * mf.bass) * m, T.line, 0.3 + 0.5 * mf.bass);
        g.strokeStyle = rgba(T.line, 0.45 + 0.5 * mf.bass);
        g.lineWidth = 0.1 * m;
        g.beginPath();
        g.arc(px, cy, 1 * m, 0, TAU);
        g.stroke();
        for (let k = 0; k < 8; k++) {
          const a = (k * TAU) / 8 + t * 0.3;
          g.fillStyle = rgba(T.line, Math.floor(beats(f)) % 8 === k ? 1 : 0.4);
          g.fillRect(px + Math.cos(a) * 1.3 * m - 0.08 * m, cy + Math.sin(a) * 1.3 * m - 0.08 * m, 0.16 * m, 0.16 * m);
        }
        glow(g, px, cy, (0.4 + 0.4 * mf.kick) * m, '#ffffff', 0.6 + 0.4 * mf.kick);
        // the fingers: segments from a knuckle, curling a little in on the snare, each its own way
        const FING = [
          [-2.1, 2.6, -0.18, 0.62],
          [-0.75, 3.2, -0.05, 0.58],
          [0.65, 3.0, 0.05, 0.56],
          [1.95, 2.4, 0.16, 0.5],
        ];
        const seg = (x, y, a, len, w) => {
          const ex = x + Math.sin(a) * len,
            ey = y - Math.cos(a) * len,
            nx = Math.cos(a) * w,
            ny = Math.sin(a) * w;
          g.fillStyle = c.body;
          poly(g, [x - nx, y - ny, x + nx, y + ny, ex + nx * 0.92, ey + ny * 0.92, ex - nx * 0.92, ey - ny * 0.92]);
          g.fillStyle = c.dark;
          poly(g, [x, y, x + nx, y + ny, ex + nx * 0.92, ey + ny * 0.92, ex, ey]);
          glow(g, x, y, w * 1.4, T.line, 0.3 + 0.6 * mf.kick);
          return [ex, ey];
        };
        FING.forEach(([dx, len, a0, w], k) => {
          const tw = mf.snare * (0.25 + 0.2 * hash(k, i)) + 0.05 * Math.sin(t * 1.3 + k);
          let x = px + dx * m,
            y = py - 0.1 * m,
            a = a0;
          for (let s = 0; s < 3; s++) {
            const l = len * [0.42, 0.33, 0.25][s] * m;
            [x, y] = seg(x, y, a, l, w * (1 - s * 0.12) * 0.5 * m);
            a += (dx < 0 ? -1 : 1) * 0.02 + tw * (s + 1) * 0.35 * (k % 2 ? 1 : 0.8);
          }
          // a nail light at each tip, flashing on the snare
          glow(g, x, y, (0.2 + 0.5 * mf.snare) * m, T.win[1], 0.4 + 0.6 * mf.snare);
        });
        // the thumb, out to the side
        {
          let x = px - 2.5 * m,
            y = wy - 0.8 * m,
            a = -1.05 + mf.snare * 0.35;
          for (let s = 0; s < 2; s++) {
            [x, y] = seg(x, y, a, (1.3 - s * 0.3) * m, (0.36 - s * 0.04) * m);
            a += 0.35 + mf.snare * 0.2;
          }
        }
        // dust falling off it
        for (let k = 0; k < 10; k++) {
          const u = (t * 0.25 + hash(k, i)) % 1;
          g.fillStyle = rgba(T.sky[2], 0.4 * (1 - u));
          g.fillRect(X + (hash(k, 3) - 0.5) * 6 * m, py + u * (base - py), 0.1 * m, 0.1 * m);
        }
      });
    },
  },
];

for (const p of MARKS) registerPart({ slot: 'mark', media: ['air'], ...p });
