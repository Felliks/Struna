// The arena: a stadium at its big night. The bowl's roof far off, floodlight towers striking on the kick, tiered stands
// packed with a crowd doing the wave in time (round once every two bars, jumping on the kick, more arms up as the song
// grows), camera flashes sparkling on the hats, flags along the rim waving with the bass, fireworks and confetti on the
// drops; landmarks by the song (a giant scoreboard playing the song's bands, a jumbotron hung over the field, goal posts
// with their nets); the pitch underfoot, mowed in stripes, its lines and ad boards chasing the beat.
import { clamp, hash, mixHex, rgba } from '../util.js';
import { celestial, cells, edge, flat, glow, landmark, row, slab, tint } from './kit.js';

const FLOOD = '#f4f8ff',
  TURF = '#1e5a2a';

export const LANDMARKS = {
  // a giant scoreboard on legs: its screen an equalizer of the song's bands, its frame lit on the beat
  scoreboard(f) {
    const { g, v, mf, T, t } = f;
    landmark(f, 0.07, 55, 0.8, 1, (X, base) => {
      const m = v.ppm,
        top = base - 12 * m,
        bands = [mf.kick, mf.bass, mf.snare, mf.voice, mf.hat * 2.5, mf.beat];
      g.fillStyle = T.far;
      for (const lx of [-4, 4]) g.fillRect(X + lx * m - 0.3 * m, top, 0.6 * m, 12 * m);
      g.fillRect(X - 6 * m, top - 0.5 * m, 12 * m, 5 * m);
      g.fillStyle = '#05060a';
      g.fillRect(X - 5.6 * m, top - 0.1 * m, 11.2 * m, 4.2 * m);
      for (let b = 0; b < 12; b++) {
        const e = clamp(bands[b % 6] * (0.6 + 0.6 * mf.stage) + 0.06 * Math.sin(t * 4 + b), 0, 1);
        g.fillStyle = rgba(T.win[b % 3], 0.35 + 0.6 * e);
        g.fillRect(X - 5.4 * m + b * 0.9 * m, top + (4 - 3.8 * e) * m, 0.6 * m, 3.8 * e * m);
      }
      g.strokeStyle = rgba(T.line, 0.4 + 0.6 * mf.beat);
      g.lineWidth = 0.12 * m;
      g.strokeRect(X - 5.6 * m, top - 0.1 * m, 11.2 * m, 4.2 * m);
    });
  },
  // a jumbotron hung over the field on cables: four faces, a ring of LEDs running round on the beat, a pulse on the kick
  jumbotron(f) {
    const { g, v, mf, T, t, L } = f;
    landmark(f, 0.1, 42, 0.75, 2, (X, base) => {
      const m = v.ppm,
        Y = base - 11 * m;
      g.strokeStyle = rgba(T.far, 0.9);
      g.lineWidth = 0.06 * m;
      g.beginPath();
      for (const s of [-1, 1]) {
        g.moveTo(X + s * 1.6 * m, Y - 1.6 * m);
        g.lineTo(X + s * 6 * m, 0);
      }
      g.stroke();
      g.fillStyle = T.far;
      g.fillRect(X - 2.6 * m, Y - 1.8 * m, 5.2 * m, 3.6 * m);
      g.fillStyle = '#05060a';
      for (const s of [-1, 1]) g.fillRect(X + (s < 0 ? -2.4 : 0.1) * m, Y - 1.5 * m, 2.3 * m, 2.6 * m);
      for (const s of [-1, 1]) glow(g, X + s * 1.25 * m, Y - 0.2 * m, (0.6 + 1.2 * mf.kick) * m, T.win[s < 0 ? 0 : 1], 0.4 + 0.6 * mf.kick);
      const run = Math.floor((t / L.A.beat) * 2);
      for (let k = 0; k < 16; k++) {
        g.fillStyle = rgba(k % 4 === run % 4 ? T.hold : T.line, k % 4 === run % 4 ? 0.9 : 0.25);
        g.fillRect(X - 2.6 * m + k * 0.325 * m, Y + 1.5 * m, 0.2 * m, 0.15 * m);
      }
    });
  },
  // goal posts with their nets, a corner flag beside each waving with the bass
  goalposts(f) {
    const { g, v, mf, t } = f;
    landmark(f, 0.35, 24, 0.6, 3, (X, base) => {
      const m = v.ppm;
      g.strokeStyle = rgba('#ffffff', 0.15);
      g.lineWidth = v.dpr;
      g.beginPath();
      for (let k = 0; k <= 8; k++) {
        g.moveTo(X - 3.6 * m + k * 0.9 * m, base - 2.4 * m);
        g.lineTo(X - 3 * m + k * 0.75 * m, base);
      }
      g.stroke();
      g.strokeStyle = rgba(FLOOD, 0.7 + 0.3 * mf.kick);
      g.lineWidth = 0.14 * m;
      g.beginPath();
      g.moveTo(X - 3.6 * m, base);
      g.lineTo(X - 3.6 * m, base - 2.4 * m);
      g.lineTo(X + 3.6 * m, base - 2.4 * m);
      g.lineTo(X + 3.6 * m, base);
      g.stroke();
      for (const s of [-1, 1]) {
        const fx = X + s * 6 * m,
          wave = Math.sin(t * 6 + s) * (0.1 + 0.25 * mf.bass) * m;
        g.fillStyle = '#e8e8e8';
        g.fillRect(fx, base - 1.6 * m, 0.06 * m, 1.6 * m);
        g.fillStyle = '#ffd84a';
        g.beginPath();
        g.moveTo(fx + 0.06 * m, base - 1.6 * m);
        g.lineTo(fx + 0.6 * m, base - 1.4 * m + wave);
        g.lineTo(fx + 0.06 * m, base - 1.2 * m);
        g.fill();
      }
    });
  },
};

// the floodlight towers: a mast, a grid of lamps striking white on the kick, their beams down onto the pitch
function floods(f) {
  const { g, v, mf, T } = f,
    r = row(f, 0.12),
    m = v.ppm;
  cells(r, 26, (i, X) => {
    const top = r.base - 14 * m,
      hit = mf.kick * (0.5 + 0.5 * mf.amp) + 0.15 * mf.stage;
    g.fillStyle = T.far;
    g.fillRect(X - 0.2 * m, top, 0.4 * m, 14 * m);
    g.fillRect(X - 1.6 * m, top - 1.2 * m, 3.2 * m, 1.4 * m);
    g.fillStyle = rgba(FLOOD, 0.3 + 0.7 * hit);
    for (let c = 0; c < 4; c++)
      for (let k = 0; k < 2; k++) g.fillRect(X - 1.45 * m + c * 0.75 * m, top - 1.05 * m + k * 0.6 * m, 0.55 * m, 0.45 * m);
    glow(g, X, top - 0.5 * m, (2 + 4 * hit) * m, FLOOD, 0.2 + 0.5 * hit);
    g.save();
    g.globalCompositeOperation = 'lighter';
    const gr = g.createLinearGradient(0, top, 0, v.H);
    gr.addColorStop(0, rgba(FLOOD, 0.08 + 0.18 * hit));
    gr.addColorStop(1, rgba(FLOOD, 0));
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(X - 1.4 * m, top);
    g.lineTo(X + 1.4 * m, top);
    g.lineTo(X + (hash(i, 3) < 0.5 ? 9 : -3) * m, v.H);
    g.lineTo(X + (hash(i, 3) < 0.5 ? 3 : -9) * m, v.H);
    g.fill();
    g.restore();
  });
}
// the stands: tiers of seats packed with the crowd, the wave rolling round in time, flashes on the hats, flags on top
function stands(f) {
  const { g, v, mf, T, t, L } = f,
    r = row(f, 0.4),
    m = v.ppm,
    seat = tint(f, '#1a1c26', T.near, 0.45),
    body = tint(f, '#0a0b12', T.near, 0.25),
    crest = ((t / (L.A.beat * 8)) % 1) * v.W * 1.6 - v.W * 0.3,
    tiers = 4;
  g.fillStyle = seat;
  g.fillRect(r.L, r.base - tiers * 1.2 * m - 0.6 * m, r.R - r.L, v.H);
  for (let k = tiers - 1; k >= 0; k--) {
    const by = r.base - k * 1.2 * m;
    g.fillStyle = rgba('#000000', 0.25);
    g.fillRect(r.L, by - 0.12 * m, r.R - r.L, 0.12 * m);
    g.fillStyle = body;
    g.strokeStyle = body;
    g.lineWidth = 0.07 * m;
    cells(r, 0.42, (i, X, u) => {
      const d = (X - crest + k * 0.6 * m) / (2.2 * m),
        up = Math.exp(-d * d),
        jump = mf.kick * (0.08 + 0.12 * hash(i, k + 4)) * m * mf.amp,
        Y = by - 0.25 * m - jump - up * 0.45 * m;
      g.fillStyle = body;
      g.fillRect(X - 0.14 * m, Y - 0.1 * m, 0.28 * m, 0.6 * m);
      g.beginPath();
      g.arc(X, Y - 0.25 * m, 0.14 * m, 0, Math.PI * 2);
      g.fill();
      if (up > 0.3 || hash(i, k + 9) < 0.1 + 0.4 * mf.stage * mf.beat) {
        g.beginPath();
        g.moveTo(X - 0.1 * m, Y);
        g.lineTo(X - 0.2 * m, Y - (0.5 + 0.25 * up) * m);
        g.moveTo(X + 0.1 * m, Y);
        g.lineTo(X + 0.2 * m, Y - (0.5 + 0.25 * up) * m);
        g.stroke();
      }
      // (a camera flash, now and then on a hat)
      if (hash(i * 7 + k, Math.floor(t * 12)) < 0.04 * Math.min(1, mf.hat * 3) * (0.4 + mf.stage)) glow(g, X + 0.1 * m, Y - 0.2 * m, 0.35 * m, '#ffffff', 0.9);
      // (a scarf held up on the downbeat, in the song's colours)
      if (u < 0.08) {
        g.fillStyle = rgba(T.win[((i % 3) + 3) % 3], 0.5 + 0.4 * mf.down);
        g.fillRect(X - 0.25 * m, Y - 0.6 * m - up * 0.2 * m, 0.5 * m, 0.1 * m);
      }
    });
  }
  // the rim of the roof over the stands, flags along it waving with the bass
  const rim = r.base - tiers * 1.2 * m - 0.6 * m;
  g.fillStyle = T.far;
  g.fillRect(r.L, rim - 0.4 * m, r.R - r.L, 0.4 * m);
  cells(r, 3.2, (i, X, u) => {
    const wave = Math.sin(t * 5 + i) * (0.1 + 0.3 * mf.bass) * m;
    g.fillStyle = '#d0d0d8';
    g.fillRect(X, rim - 2.2 * m, 0.05 * m, 1.8 * m);
    g.fillStyle = [T.hold, T.slide, T.jump][Math.floor(u * 3)];
    g.beginPath();
    g.moveTo(X + 0.05 * m, rim - 2.2 * m);
    g.quadraticCurveTo(X + 0.5 * m, rim - 2.2 * m + wave, X + 1 * m, rim - 2 * m + wave * 0.5);
    g.lineTo(X + 1 * m, rim - 1.5 * m + wave * 0.5);
    g.quadraticCurveTo(X + 0.5 * m, rim - 1.7 * m + wave, X + 0.05 * m, rim - 1.6 * m);
    g.fill();
  });
}
// fireworks bursting over the bowl and confetti falling on the drops
function fireworks(f) {
  // (across the screen, not in a row's frame)
  flat(f);
  const { g, v, mf, T, t } = f;
  if (mf.drop < 0.05) return;
  const m = v.ppm;
  for (let b = 0; b < 3 + Math.round(3 * mf.stage); b++) {
    const ph = (t * 0.7 + hash(b, 11)) % 1,
      X = v.W * (0.1 + 0.8 * hash(b, Math.floor(t * 0.7 + hash(b, 11)))),
      Y = v.H * (0.15 + 0.25 * hash(b, 23)),
      R = (1 + 4 * ph) * m,
      col = T.win[b % 3];
    g.fillStyle = rgba(col, mf.drop * (1 - ph));
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      g.fillRect(X + Math.cos(a) * R, Y + Math.sin(a) * R + ph * ph * m, 0.12 * m, 0.12 * m);
    }
  }
  for (let k = 0; k < 60 * mf.drop; k++) {
    const u = hash(k, 31),
      X = (u * v.W + Math.sin(t * 2 + k) * 0.4 * m) % v.W,
      Y = ((t * (0.12 + 0.1 * hash(k, 5)) + hash(k, 7)) % 1) * v.H;
    g.fillStyle = rgba([T.hold, T.slide, T.jump, '#ffffff'][k % 4], 0.8 * mf.drop);
    g.fillRect(X, Y, 0.12 * m, (0.06 + 0.06 * Math.abs(Math.sin(t * 9 + k))) * m);
  }
}

// the bowl's far roof, a dark arc across the sky
function roof(f) {
  const { g, v, T } = f,
    // (spanning the screen as made: kept at its size, kit.js row)
    bowl = row(f, 0.05, 1);
  g.fillStyle = tint(f, '#10121a', T.far, 0.6);
  g.beginPath();
  g.moveTo(0, bowl.base - 7 * v.ppm);
  g.quadraticCurveTo(v.W / 2, bowl.base - 11 * v.ppm, v.W, bowl.base - 7 * v.ppm);
  g.lineTo(v.W, v.H);
  g.lineTo(0, v.H);
  g.fill();
}

// stadiums far off, seen from outside across the city at their big night: each bowl's shell ribbed and banded with its
// lit concourses, an LED ribbon round it chasing a block of colour on the beat, its roof a ring with the pitch's light
// pouring up out of the open middle (a dome of light over it swelling on the kick), floodlight banks on the rim striking
// white on the kick and, on the drops, searchlights sweeping the sky from it; a low band of the town between them
function bowls(f) {
  const { g, v, mf, T, t, L } = f,
    r = row(f, 0.1),
    m = v.ppm,
    B = r.base,
    body = mixHex(T.far, T.sky[2], 0.12),
    shade = mixHex(T.far, T.near, 0.35),
    rib = mixHex(T.far, T.sky[2], 0.3),
    hit = mf.kick * (0.5 + 0.5 * mf.amp) + 0.15 * mf.stage,
    chase = (t / L.A.beat) * 1.5;
  // (the town between them: a low band with its street lamps)
  g.fillStyle = shade;
  g.fillRect(r.L, B - 0.9 * m, r.R - r.L, v.H);
  cells(r, 1.3, (i, X, u) => {
    if (u < 0.5) return;
    g.fillStyle = rgba(T.win[((i % 3) + 3) % 3], 0.25 + 0.35 * mf.hat * u);
    g.fillRect(X, B - (0.5 + 0.3 * u) * m, 0.12 * m, 0.08 * m);
  });
  // (a bowl far off drawn smaller than his metre, and wider than tall)
  const M = m * 0.6;
  cells(r, 18, (i, X, u) => {
    const hw = (6 + 2 * u) * M,
      cx = X + 9 * m,
      top = B - (6.5 + 1.5 * hash(i, 5)) * M,
      ry = 1.0 * M;
    // the dome of light over it, from the pitch inside, swelling on the kick
    g.save();
    g.globalCompositeOperation = 'lighter';
    const dome = g.createRadialGradient(cx, top, 0, cx, top, hw * 1.25);
    dome.addColorStop(0, rgba(FLOOD, 0.1 + 0.25 * hit));
    dome.addColorStop(0.45, rgba(T.win[0], 0.05 + 0.1 * hit));
    dome.addColorStop(1, rgba(T.win[0], 0));
    g.fillStyle = dome;
    g.fillRect(cx - hw * 1.25, top - hw * 1.25, hw * 2.5, hw * 1.25);
    // (on the drops two searchlights sweeping the sky from the rim, crossing and parting with the bar)
    if (mf.drop > 0.05)
      for (const s of [-1, 1]) {
        const a = -Math.PI / 2 + s * (0.25 + 0.35 * Math.sin(t * 0.9 + i + s)),
          len = 14 * m,
          bx = cx + s * hw * 0.6,
          by = top,
          ex = bx + Math.cos(a) * len,
          ey = by + Math.sin(a) * len,
          nx = -Math.sin(a) * 0.9 * m,
          ny = Math.cos(a) * 0.9 * m,
          gr = g.createLinearGradient(bx, by, ex, ey);
        gr.addColorStop(0, rgba(FLOOD, 0.3 * mf.drop));
        gr.addColorStop(1, rgba(FLOOD, 0));
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(bx, by);
        g.lineTo(ex + nx, ey + ny);
        g.lineTo(ex - nx, ey - ny);
        g.fill();
      }
    g.restore();
    // the shell: a bowl swelling out from its foot to the roof's ring
    g.fillStyle = body;
    g.beginPath();
    g.moveTo(cx - hw * 0.9, B);
    g.quadraticCurveTo(cx - hw * 1.06, (B + top) / 2, cx - hw, top);
    g.lineTo(cx + hw, top);
    g.quadraticCurveTo(cx + hw * 1.06, (B + top) / 2, cx + hw * 0.9, B);
    g.closePath();
    g.fill();
    // its ribs, and its concourses: bands of lit windows flickering on the hats, more of them lit as the song grows
    g.fillStyle = rib;
    for (let x = -0.9; x <= 0.91; x += 0.15) g.fillRect(cx + x * hw - 0.04 * M, top + 0.3 * M, 0.08 * M, B - top - 0.3 * M);
    for (let k = 0; k < 4; k++) {
      const y = top + (1.0 + k * 1.3) * M;
      g.fillStyle = rgba('#000000', 0.3);
      g.fillRect(cx - hw * 0.95, y - 0.1 * M, hw * 1.9, 0.5 * M);
      for (let x = -0.92; x < 0.92; x += 0.075) {
        const hv = hash(i * 97 + Math.round(x * 100), k + 3);
        if (hv > 0.35 + 0.4 * mf.stage) continue;
        g.fillStyle = rgba(T.win[Math.floor(hv * 30) % 3], clamp(hv < 0.15 ? 0.3 + mf.hat * 2 : 0.3 + 0.3 * mf.stage, 0, 1) * 0.8);
        g.fillRect(cx + x * hw, y, 0.22 * M, 0.25 * M);
      }
    }
    // the LED ribbon round it, a block of colour chasing along it on the beat
    const ly = top + 0.35 * M;
    g.fillStyle = '#05060a';
    g.fillRect(cx - hw, ly, hw * 2, 0.4 * M);
    for (let k = 0; k < 12; k++) {
      const on = Math.max(0, 1 - Math.abs((((chase - k * 0.3) % 3) + 3) % 3 - 1.5));
      g.fillStyle = rgba(T.win[k % 3], 0.2 + 0.7 * on * (0.5 + 0.5 * mf.amp));
      g.fillRect(cx - hw + ((k + 0.08) * hw * 2) / 12, ly + 0.07 * M, (hw * 2 * 0.84) / 12, 0.26 * M);
    }
    // the roof: a ring, the pitch's light pouring up out of its open middle, its rim lit
    g.fillStyle = shade;
    g.beginPath();
    g.ellipse(cx, top, hw * 1.02, ry, 0, Math.PI, Math.PI * 2);
    g.lineTo(cx + hw, top);
    g.fill();
    g.fillStyle = rgba(mixHex(FLOOD, T.win[0], 0.3), 0.3 + 0.45 * hit);
    g.beginPath();
    g.ellipse(cx, top - 0.15 * M, hw * 0.62, ry * 0.45, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = rgba(FLOOD, 0.35 + 0.5 * hit);
    g.lineWidth = Math.max(1, 0.07 * M);
    g.beginPath();
    g.ellipse(cx, top, hw * 1.02, ry, 0, Math.PI, Math.PI * 2);
    g.stroke();
    // the floodlight banks on the rim: masts with their grids of lamps striking white on the kick
    for (const s of [-0.78, -0.3, 0.3, 0.78]) {
      const mx = cx + s * hw,
        my = top - ry * Math.sqrt(1 - s * s) * 0.9,
        mt = my - 1.8 * M;
      g.fillStyle = shade;
      g.fillRect(mx - 0.06 * M, mt, 0.12 * M, my - mt);
      g.fillRect(mx - 0.6 * M, mt - 0.5 * M, 1.2 * M, 0.55 * M);
      g.fillStyle = rgba(FLOOD, 0.35 + 0.65 * hit);
      for (let c = 0; c < 3; c++) g.fillRect(mx - 0.52 * M + c * 0.36 * M, mt - 0.43 * M, 0.28 * M, 0.4 * M);
      glow(g, mx, mt - 0.2 * M, (0.8 + 1.6 * hit) * M, FLOOD, 0.15 + 0.4 * hit);
    }
  });
}

// the roof's edge over the bowl from inside: a lit lip along its arc and the lamps under it, striking on the kick in a
// wave round the bowl with the beat
function rim(f) {
  const { g, v, mf, t, L } = f,
    // (spanning the screen as made: kept at its size, kit.js row)
    bowl = row(f, 0.05, 1),
    m = v.ppm,
    y = X => bowl.base - 7 * m - 4 * m * (1 - ((2 * X) / v.W - 1) ** 2) * 0.5,
    wave = (t / L.A.beat) % 8;
  g.strokeStyle = rgba(FLOOD, 0.3 + 0.4 * mf.kick);
  g.lineWidth = Math.max(1, 0.08 * m);
  g.beginPath();
  g.moveTo(0, bowl.base - 7 * m);
  g.quadraticCurveTo(v.W / 2, bowl.base - 11 * m, v.W, bowl.base - 7 * m);
  g.stroke();
  for (let k = 0; k <= 24; k++) {
    const X = (k / 24) * v.W,
      on = Math.max(0, 1 - Math.abs(((k / 3 - wave) % 8 + 8) % 8 - 1));
    g.fillStyle = rgba(FLOOD, 0.25 + 0.5 * mf.kick * 0.5 + 0.5 * on);
    g.fillRect(X - 0.12 * m, y(X) + 0.25 * m, 0.24 * m, 0.12 * m);
  }
}

// the far rows: in its own world the bowl's roof and the floodlight towers before it (he runs inside the stadium);
// in another's, stadiums far off across the town
function far(f) {
  if (f.look?.place === 'arena') {
    roof(f);
    rim(f);
    floods(f);
    return;
  }
  bowls(f);
}

// the near rows: the stands
function near(f) {
  stands(f);
}

// over the rows: the fireworks over the bowl on the drops, then the goalposts (a landmark in front of the stands)
function after(f) {
  fireworks(f);
  if (f.look.landmarks.includes('goalposts')) LANDMARKS.goalposts(f);
}

export default {
  // (its landmarks drawn over its rows, by after(): a world does not draw them again as its own)
  late: ['goalposts'],
  sky(f) {
    celestial(f);
  },
  back(f) {
    // (the far rows' roof goes behind the landmarks and their floodlights in front, as made)
    roof(f);
    for (const l of f.look.landmarks) if (l !== 'goalposts') LANDMARKS[l]?.(f);
    floods(f);
    near(f);
    after(f);
  },
  far,
  near,
  after,
  ground(f, a, b, y) {
    const { g, v, mf, T, t, L } = f,
      s = slab(f, a, b, y, tint(f, '#14161e'), tint(f, TURF, T.far, 0.25));
    if (!s) return;
    const m = v.ppm;
    // the turf on top, mowed in stripes, a white line every 5 m flashing on the kick
    for (let k = Math.floor(s.a / 1.5); k < s.b / 1.5; k++) {
      g.fillStyle = rgba(k % 2 ? '#2e7a3a' : '#246a30', 0.55);
      g.fillRect(v.sx(k * 1.5), s.Y, 1.5 * m, 0.22 * m);
    }
    for (let k = Math.ceil(s.a / 5); k < s.b / 5; k++) {
      g.fillStyle = rgba('#ffffff', 0.5 + 0.5 * mf.kick);
      g.fillRect(v.sx(k * 5) - 0.04 * m, s.Y, 0.08 * m, 0.22 * m);
    }
    // the ad boards in the face below it: LED panels chasing a block of colour along on the beat
    const chase = (t / L.A.beat) * 1.5;
    for (let k = Math.floor(s.a / 2); k < s.b / 2; k++) {
      const on = Math.max(0, 1 - Math.abs((((chase - k * 0.35) % 3) + 3) % 3 - 1.5));
      g.fillStyle = '#05060a';
      g.fillRect(v.sx(k * 2) + 0.05 * m, s.Y + 0.35 * m, 1.9 * m, 0.7 * m);
      g.fillStyle = rgba(T.win[((k % 3) + 3) % 3], 0.15 + 0.7 * on * (0.5 + 0.5 * mf.amp));
      g.fillRect(v.sx(k * 2) + 0.15 * m, s.Y + 0.45 * m, 1.7 * m, 0.5 * m);
      g.fillStyle = rgba('#ffffff', 0.25 + 0.6 * mf.snare * on);
      for (let j = 0; j < 4; j++) g.fillRect(v.sx(k * 2) + (0.3 + j * 0.4) * m, s.Y + 0.6 * m, 0.25 * m, 0.2 * m);
    }
    edge(f, s, FLOOD);
  },
};
