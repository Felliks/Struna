// The rave: the music made a place. A wall of LEDs far behind playing the song's bands as an equalizer, trusses of
// moving heads whose beams sweep on the beat and fan out on the snare, lasers raking the haze in the drops, a crowd
// below the stage jumping on the kick (more of them, arms up, as the song grows); landmarks by the song (a DJ booth with
// its screen, speaker towers breathing with the bass, pyro jets firing on the drops); the stage deck, its LED strip
// chasing the beat, speaker grilles pumping.
import { clamp, hash, rgba } from '../util.js';
import { cells, edge, glow, landmark, row, slab, tint } from './kit.js';

export const LANDMARKS = {
  // a DJ booth on a riser: its screen showing the waveform, the DJ's hands up on the drops
  booth(f) {
    const { g, v, mf, T, t } = f;
    landmark(f, 0.12, 36, 0.8, 1, (X, base) => {
      const m = v.ppm;
      g.fillStyle = T.far;
      g.fillRect(X - 2.5 * m, base - 2.2 * m, 5 * m, 2.2 * m);
      g.fillStyle = rgba(T.hold, 0.3 + 0.5 * mf.beat);
      g.fillRect(X - 2 * m, base - 4.4 * m, 4 * m, 1.6 * m);
      g.strokeStyle = rgba(T.win[2], 0.8);
      g.lineWidth = v.dpr * 2;
      g.beginPath();
      for (let i = 0; i <= 40; i++) g.lineTo(X - 2 * m + (i / 40) * 4 * m, base - 3.6 * m + Math.sin(i * 0.9 + t * 9) * (0.2 + 0.5 * mf.bass) * m);
      g.stroke();
      g.fillStyle = T.far;
      g.beginPath();
      g.arc(X, base - 2.6 * m, 0.25 * m, 0, Math.PI * 2);
      g.fill();
      const up = mf.drop > 0.2 ? 1 : 0.3 * mf.beat;
      g.fillRect(X - 0.5 * m, base - (2.6 + 0.6 * up) * m, 0.1 * m, 0.6 * m);
      g.fillRect(X + 0.4 * m, base - (2.6 + 0.6 * up) * m, 0.1 * m, 0.6 * m);
    });
  },
  // speaker towers, their cones breathing with the bass
  speakers(f) {
    const { g, v, mf, T } = f;
    landmark(f, 0.2, 14, 0.7, 2, (X, base) => {
      const m = v.ppm;
      g.fillStyle = T.far;
      g.fillRect(X - 0.8 * m, base - 5 * m, 1.6 * m, 5 * m);
      for (let k = 0; k < 4; k++) {
        g.fillStyle = rgba('#000000', 0.5);
        g.beginPath();
        g.arc(X, base - (0.7 + k * 1.15) * m, (0.42 + 0.06 * mf.bass) * m, 0, Math.PI * 2);
        g.fill();
      }
    });
  },
  // pyro: jets of fire along the stage front, firing on the drops and on the downbeats of a drop
  pyro(f) {
    const { g, v, mf } = f;
    const fire = Math.max(mf.drop, mf.amp >= 1 ? mf.down : 0);
    if (fire < 0.05) return;
    landmark(f, 0.35, 6, 0.8, 3, (X, base) => {
      const m = v.ppm,
        h = (1.5 + 4 * fire) * m;
      const gr = g.createLinearGradient(0, base, 0, base - h);
      gr.addColorStop(0, rgba('#fff3b0', 0.9 * fire));
      gr.addColorStop(0.4, rgba('#ff9a3c', 0.7 * fire));
      gr.addColorStop(1, rgba('#ff2b3a', 0));
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(X - 0.3 * m, base);
      g.quadraticCurveTo(X, base - h * 1.2, X + 0.3 * m, base);
      g.fill();
    });
  },
};

// the equalizer wall: columns of LEDs, each a band of the song, lit as high as it plays
function ledWall(f) {
  const { g, v, mf, T, t } = f,
    r = row(f, 0.06),
    bands = [mf.kick, mf.bass, mf.snare, mf.voice, mf.hat * 2.5, mf.beat],
    cell = 0.32 * v.ppm,
    top = r.base - 9 * v.ppm;
  cells(r, 0.4, (i, X) => {
    const b = bands[((i % 6) + 6) % 6],
      lvl = clamp(b * (0.6 + 0.6 * mf.stage) + 0.08 * Math.sin(t * 3 + i), 0, 1),
      n = Math.round(lvl * 22);
    for (let k = 0; k < 22; k++) {
      const lit = k < n,
        hot = k > 16;
      g.fillStyle = lit ? rgba(hot ? T.hold : k > 10 ? T.line : T.win[((i % 3) + 3) % 3], 0.18 + 0.3 * lvl) : 'rgba(255,255,255,0.02)';
      g.fillRect(X, r.base - (k + 1) * cell, cell * 0.8, cell * 0.8);
    }
  });
  return top;
}

// moving heads on a truss: beams sweeping on the beat, fanning wide on the snare, white on the drops
function beams(f) {
  const { g, v, mf, T, t, L } = f,
    // (the truss hangs from the top of the screen as made: kept at its size, kit.js row)
    r = row(f, 0.25, 1),
    trussY = v.H * 0.12;
  g.fillStyle = tint(f, '#30343c', T.far, 0.3);
  g.fillRect(r.L, trussY - 0.15 * v.ppm, r.R - r.L, 0.3 * v.ppm);
  g.save();
  g.globalCompositeOperation = 'lighter';
  const sweep = Math.sin((t / L.A.beat) * Math.PI * 0.5),
    fan = 0.25 + 0.6 * mf.snare;
  cells(r, 3, (i, X) => {
    const a = Math.PI / 2 + sweep * 0.5 * (i % 2 ? 1 : -1) + (i % 3 - 1) * fan,
      len = v.H * 1.1,
      col = mf.drop > 0.3 ? '#ffffff' : T.win[((i % 3) + 3) % 3],
      w = (0.15 + 0.25 * mf.kick) * v.ppm;
    const gr = g.createLinearGradient(X, trussY, X + Math.cos(a) * len, trussY + Math.sin(a) * len);
    gr.addColorStop(0, rgba(col, (0.25 + 0.4 * mf.beat) * (0.5 + 0.5 * mf.amp)));
    gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(X, trussY);
    g.lineTo(X + Math.cos(a - 0.05) * len - w, trussY + Math.sin(a - 0.05) * len);
    g.lineTo(X + Math.cos(a + 0.05) * len + w, trussY + Math.sin(a + 0.05) * len);
    g.fill();
    glow(g, X, trussY, 0.3 * v.ppm, col, 0.5 + 0.5 * mf.beat);
  });
  // lasers raking the haze in a loud bar, a fan of them on each snare
  if (mf.amp >= 0.8) {
    const n = 6 + Math.round(10 * mf.stage);
    g.lineWidth = v.dpr * 1.5;
    for (let k = 0; k < n; k++) {
      const a = Math.PI * (0.15 + (0.7 * k) / n) + Math.sin(t * 2 + k) * 0.08 * (1 + mf.snare * 3);
      g.strokeStyle = rgba(k % 2 ? T.hold : T.slide, 0.25 + 0.5 * mf.snare);
      g.beginPath();
      g.moveTo(v.W / 2, v.H * 0.95);
      g.lineTo(v.W / 2 - Math.cos(a) * v.W, v.H * 0.95 - Math.sin(a) * v.H);
      g.stroke();
    }
  }
  g.restore();
}

// the crowd below the stage: heads and arms, jumping on the kick, more arms up as the song grows
function crowd(f) {
  const { g, v, mf, T } = f,
    r = row(f, 0.6),
    m = v.ppm,
    col = tint(f, '#0a0a10', T.near, 0.25);
  g.fillStyle = col;
  g.strokeStyle = col;
  g.lineWidth = 0.08 * m;
  cells(r, 0.55, (i, X, u, seen) => {
    const jump = mf.kick * (0.15 + 0.25 * hash(i, 4)) * m * (0.5 + mf.amp),
      Y = r.base + 0.3 * m - jump - u * 0.25 * m;
    g.beginPath();
    g.arc(X, Y - 1.6 * m, 0.18 * m, 0, Math.PI * 2);
    g.fill();
    g.fillRect(X - 0.2 * m, Y - 1.4 * m, 0.4 * m, 1.6 * m);
    // (decided by the world's stage as it came into view: kit.js stageSeen, never popping in in sight)
    if (hash(i, 9) < 0.25 + 0.6 * seen()) {
      g.beginPath();
      g.moveTo(X - 0.15 * m, Y - 1.35 * m);
      g.lineTo(X - 0.35 * m, Y - (2.0 + 0.2 * mf.beat) * m);
      g.moveTo(X + 0.15 * m, Y - 1.35 * m);
      g.lineTo(X + 0.35 * m, Y - (2.0 + 0.2 * mf.beat) * m);
      g.stroke();
    }
  });
}

// (the far row is the LED wall with its beams and lasers, the near row the crowd)
function far(f) {
  ledWall(f);
  beams(f);
}

export default {
  far,
  near: crowd,
  back(f) {
    far(f);
    for (const l of f.look.landmarks) LANDMARKS[l]?.(f);
    crowd(f);
  },
  ground(f, a, b, y) {
    const { g, v, mf, T, t, L } = f,
      s = slab(f, a, b, y, tint(f, '#14141c'), tint(f, '#2a2a38', T.far, 0.3));
    if (!s) return;
    // the LED strip chasing along the deck on the beat
    const chase = (t / L.A.beat) * 2;
    for (let k = Math.floor(s.a / 0.5); k < s.b / 0.5; k++) {
      const on = Math.max(0, 1 - (((chase - k * 0.25) % 2) + 2) % 2);
      g.fillStyle = rgba(T.win[((k % 3) + 3) % 3], 0.15 + 0.85 * on * (0.5 + 0.5 * mf.amp));
      g.fillRect(v.sx(k * 0.5), s.Y + 0.1 * v.ppm, 0.4 * v.ppm, 0.08 * v.ppm);
    }
    // speaker grilles in the deck's face, pumping with the bass
    for (let k = Math.floor(s.a / 1.6); k < s.b / 1.6; k++) {
      const X = v.sx(k * 1.6 + 0.8);
      g.fillStyle = '#05050a';
      g.beginPath();
      g.arc(X, s.Y + 1.0 * v.ppm, (0.42 + 0.07 * mf.bass) * v.ppm, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = rgba(T.line, 0.2 + 0.4 * mf.kick);
      g.lineWidth = v.dpr * 2;
      g.stroke();
    }
    edge(f, s, T.hold);
  },
};
