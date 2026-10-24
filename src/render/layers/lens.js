// The lens: each song's simulation is rendered through its own lens (look.lens, picked per song: the same song always
// the same), so two songs differ in kind, not only in colour. A lens that keeps the colours lies over the whole world
// (pixel art, an LED wall, a VHS tape, a comic's halftone); one that takes them away lies over the background only, under
// what he has to read (a duotone, a Game Boy's greens), so the action colours always stay his.
// All of it from the frame's one copy (renderer.snapshot): no canvas is ever read back to the CPU.
import { kana } from '../util.js';

let small = null;
// the frame shrunk to `rows` pixels on its short side (a small canvas costs nothing to draw into: measured)
function shrink(src, W, H, rows) {
  const k = rows / Math.min(W, H),
    w = Math.round(W * k),
    h = Math.round(H * k);
  small ??= document.createElement('canvas');
  if (small.width !== w || small.height !== h) Object.assign(small, { width: w, height: h });
  const x = small.getContext('2d');
  x.globalCompositeOperation = 'copy';
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = 'low';
  x.drawImage(src, 0, 0, w, h);
  x.globalCompositeOperation = 'source-over';
  return x;
}
// a canvas's colours mapped onto two: its grey (luminosity) times the light one, lifted by the dark one
function twoTone(x, w, h, dark, light) {
  grey(x, w, h);
  x.globalCompositeOperation = 'multiply';
  x.fillStyle = light;
  x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'screen';
  x.fillStyle = dark;
  x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'source-over';
}
// a tile of one round cell (s px), black round it: an LED's or a halftone's
// (kept by size: the comic's page and the tone laid into what he must read ask for two sizes every frame, and one kept
// at a time made both anew each frame, two canvases and two patterns, all through a comic's drop)
const DOTS = new Map();
function cells(g, s, r) {
  const key = `${s}|${r}`;
  let d = DOTS.get(key);
  if (!d) {
    const c = Object.assign(document.createElement('canvas'), { width: s, height: s }),
      x = c.getContext('2d');
    x.fillStyle = '#000';
    x.fillRect(0, 0, s, s);
    x.globalCompositeOperation = 'destination-out';
    x.beginPath();
    x.arc(s / 2, s / 2, r, 0, Math.PI * 2);
    x.fill();
    if (DOTS.size > 8) DOTS.clear();
    DOTS.set(key, (d = { c, pat: null }));
  }
  d.pat ??= g.createPattern(d.c, 'repeat');
  return d.pat;
}

// drawn in the screen's pixels whatever the frame's transform
function screen(g, draw) {
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  draw();
  g.restore();
}

const PIXELS = {
  // pixel art: the world in big square pixels
  pixel(f, g, W, H) {
    const x = shrink(f.snap(true), W, H, 120);
    g.imageSmoothingEnabled = false;
    g.drawImage(x.canvas, 0, 0, W, H);
  },
  // an LED wall: big pixels as round lamps, black between them, the lit ones glowing a little over the gaps
  led(f, g, W, H) {
    const x = shrink(f.snap(true), W, H, 90),
      s = Math.min(W, H) / Math.min(x.canvas.width, x.canvas.height);
    g.imageSmoothingEnabled = false;
    g.drawImage(x.canvas, 0, 0, W, H);
    g.globalAlpha = 0.85;
    g.fillStyle = cells(g, Math.round(s), Math.round(s) * 0.4);
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.35 + 0.25 * f.mf.kick;
    g.globalCompositeOperation = 'lighter';
    g.imageSmoothingEnabled = true;
    g.drawImage(x.canvas, 0, 0, W, H);
  },
  // a tape: colours bleeding sideways, a little washed out and warm, the picture's rows wobbling, a tracking band
  // creeping down, PLAY in the corner
  vhs(f, g, W, H) {
    const src = f.snap(true),
      { t, v, mf } = f,
      d = v.dpr;
    // (washed out a little and warm, and a ghost of the picture a few pixels over)
    g.save();
    g.globalAlpha *= 0.3;
    grey(g, W, H);
    g.globalAlpha /= 0.3;
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = 'rgba(255,232,205,0.5)';
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha *= 0.18;
    g.drawImage(src, 3 * d, 0);
    g.restore();
    // (the rows: a few bands shifted, more on the snare)
    const n = 3 + Math.round(4 * mf.snare);
    for (let i = 0; i < n; i++) {
      const y = ((Math.sin(t * 1.7 + i * 2.1) * 0.5 + 0.5) * H) | 0,
        h = (2 + ((i * 7) % 5)) * d,
        dx = Math.sin(t * 40 + i) * (2 + 6 * mf.snare) * d;
      g.drawImage(src, 0, y, W, h, dx, y, W, h);
    }
    const band = ((t * 0.13) % 1.2) * H - 0.1 * H;
    g.fillStyle = 'rgba(255,255,255,0.06)';
    g.fillRect(0, band, W, 14 * d);
    g.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i = 0; i < 40; i++)
      g.fillRect(((i * 97.3 + t * 900) % W) | 0, band + ((i * 31) % 14) * d, (8 + (i % 5) * 6) * d, d);
    g.font = `700 ${Math.round(16 * d)}px 'Courier New', monospace`;
    g.textAlign = 'left';
    g.fillStyle = 'rgba(255,255,255,0.8)';
    const s = Math.max(0, f.t),
      tc = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}:${String(Math.floor((s % 1) * 30)).padStart(2, '0')}`;
    g.fillText(`▶ PLAY   SP   ${tc}`, 22 * d, H - 34 * d);
  },
  // a comic's page: the world inked (its edges drawn in black), halftoned, ink black between the dots, a paper warmth
  // (what he must read goes over it in flat colour with a heavy black line: lens inkAction)
  comic(f, g, W, H) {
    const d = f.v.dpr,
      E = edges(f.snap(true), W, H, 0.5, 0),
      ink = tmp(1, E.width, E.height);
    ink.fillStyle = '#fff';
    ink.fillRect(0, 0, E.width, E.height);
    ink.globalCompositeOperation = 'difference';
    ink.drawImage(E, 0, 0);
    g.save();
    g.globalCompositeOperation = 'multiply';
    g.drawImage(ink.canvas, 0, 0, W, H);
    g.restore();
    g.globalCompositeOperation = 'multiply';
    g.globalAlpha = 0.7;
    g.fillStyle = cells(g, Math.round(7 * d), 2.6 * d);
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.18;
    g.fillStyle = '#f3dcb0';
    g.globalCompositeOperation = 'overlay';
    g.fillRect(0, 0, W, H);
  },
  // two colours of the song's (the background only)
  duo(f, g, W, H) {
    const lk = f.look,
      T = f.T;
    colorize(g, W, H, lk.duo?.[0] ?? T.near, lk.duo?.[1] ?? T.line);
  },
  // a Game Boy's four greens, big pixels (the background only)
  gameboy(f, g, W, H) {
    const x = shrink(f.snap(true), W, H, 144);
    colorize(x, x.canvas.width, x.canvas.height, '#0f380f', '#c4e86a');
    g.imageSmoothingEnabled = false;
    g.drawImage(x.canvas, 0, 0, W, H);
  },
};
// ---- the lenses that re-colour the picture, all of them by the graphics card's own blending: nothing is ever read back
// to the page, no second (WebGL) context is fed the frame, and no canvas filter is used (each of those made a big screen
// wait on the card, 20-100 ms a frame on a busy picture). The picture is greyed where it is (the saturation blend, its
// program built at the start: renderer.js) and coloured by multiply and screen; edges are the picture minus itself moved
// a pixel (a difference); small canvases where the look is coarse anyway
const tmps = [];
// a scratch canvas of its own (i), w x h
function tmp(i, w, h) {
  const c = (tmps[i] ??= document.createElement('canvas'));
  if (c.width !== w || c.height !== h) Object.assign(c, { width: w, height: h });
  const x = c.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.filter = 'none';
  return x;
}
// what is on x (w x h) greyed where it is
function grey(x, w, h) {
  x.save();
  x.globalCompositeOperation = 'saturation';
  x.fillStyle = '#808080';
  x.fillRect(0, 0, w, h);
  x.restore();
}
// what is on g (W x H) greyed and coloured from `dark` (its blacks) to `light` (its whites); `lift` brightens it first
// (screen with white), `crush` darkens its darks (multiply with grey) for contrast
function colorize(g, W, H, dark, light, lift = 0, crush = 0) {
  grey(g, W, H);
  g.save();
  if (lift > 0) {
    g.globalCompositeOperation = 'screen';
    g.fillStyle = `rgba(255,255,255,${lift})`;
    g.fillRect(0, 0, W, H);
  }
  if (crush > 0) {
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = `rgba(0,0,0,${crush})`;
    g.fillRect(0, 0, W, H);
  }
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = light;
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'screen';
  g.fillStyle = dark;
  g.fillRect(0, 0, W, H);
  g.restore();
}
// the picture's edges, light on black, at a fraction k of its size (the picture minus itself a pixel over, greyed and
// brightened)
function edges(src, W, H, k = 0.5, slot = 0) {
  const w = Math.max(16, Math.round(W * k)),
    h = Math.max(16, Math.round(H * k)),
    x = tmp(slot, w, h);
  x.drawImage(src, 0, 0, w, h);
  x.globalCompositeOperation = 'difference';
  x.drawImage(src, 1.2, 1.2, w, h);
  grey(x, w, h);
  x.globalCompositeOperation = 'lighter';
  x.drawImage(x.canvas, 0, 0);
  x.drawImage(x.canvas, 0, 0);
  return x.canvas;
}
// grain: a tile of white specks, drawn once
let grainTile = null;
function grain(g) {
  if (!grainTile) {
    const c = Object.assign(document.createElement('canvas'), { width: 128, height: 128 }),
      x = c.getContext('2d');
    for (let i = 0; i < 900; i++) {
      x.fillStyle = `rgba(255,255,255,${0.2 + 0.6 * ((i * 0.6180339) % 1)})`;
      x.fillRect((i * 97.13) % 128 | 0, (i * 57.71) % 128 | 0, 1, 1);
    }
    grainTile = c;
  }
  return (grainTile.pat ??= g.createPattern(grainTile, 'repeat'));
}
// scan lines across the screen, every `step` px
// (a tile of one line, as a pattern: one fill for the whole screen; a rectangle a line was hundreds of fills a frame,
// the amber terminal's frames the slowest of all the lenses' for it)
const SCAN = new Map();
function scanlines(g, W, H, step, a) {
  const key = `${step}|${a}`;
  let p = SCAN.get(key);
  if (!p) {
    const h = Math.max(2, Math.round(step)),
      c = Object.assign(document.createElement('canvas'), { width: 4, height: h }),
      x = c.getContext('2d');
    x.fillStyle = `rgba(0,0,0,${a})`;
    x.fillRect(0, 0, 4, Math.max(1, Math.round(step / 2.5)));
    if (SCAN.size > 8) SCAN.clear();
    SCAN.set(key, (p = g.createPattern(c, 'repeat')));
  }
  g.fillStyle = p;
  g.fillRect(0, 0, W, H);
}
function vignette(g, W, H, a, col = '0,0,0') {
  const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  gr.addColorStop(0, `rgba(${col},0)`);
  gr.addColorStop(1, `rgba(${col},${a})`);
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
}
// diagonal ink lines, a tile of them (manga's hatching)
let hatchTile = null;
function hatchPat(g, d) {
  if (!hatchTile) {
    const n = Math.round(6 * d),
      c = Object.assign(document.createElement('canvas'), { width: n, height: n }),
      x = c.getContext('2d');
    x.strokeStyle = '#000';
    x.lineWidth = Math.max(1, d * 0.8);
    x.beginPath();
    x.moveTo(0, n);
    x.lineTo(n, 0);
    x.stroke();
    hatchTile = c;
  }
  return (hatchTile.pat ??= g.createPattern(hatchTile, 'repeat'));
}
const TRON = ['#00f0ff', '#ff3cdc', '#ffc828', '#50ff78'];
// a tile of characters (one cell each, a run of them varied by row), white on clear: the ASCII lens's mask
let glyphTile = null;
function glyphs(g, cell) {
  if (glyphTile?.cell !== cell) {
    const n = 8,
      c = Object.assign(document.createElement('canvas'), { width: cell * n, height: cell * n }),
      x = c.getContext('2d');
    x.fillStyle = '#fff';
    x.font = `700 ${Math.round(cell * 1.05)}px 'Courier New', monospace`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) x.fillText('#%@*+=x$'[(r * 3 + k * 5) % 8], (k + 0.5) * cell, (r + 0.5) * cell);
    glyphTile = { cell, c, pat: g.createPattern(c, 'repeat') };
  }
  return glyphTile.pat;
}

Object.assign(PIXELS, {
  // ASCII: the world in big cells, each a character in the cell's colour, on black, flicking over on the hats
  ascii(f, g, W, H) {
    const d = f.v.dpr,
      cell = Math.round(12 * d),
      cols = Math.ceil(W / cell),
      rows = Math.ceil(H / cell),
      src = f.snap(true),
      s = tmp(0, cols, rows);
    s.drawImage(src, 0, 0, cols, rows);
    s.globalCompositeOperation = 'lighter';
    s.globalAlpha = 0.6 + 0.3 * f.mf.kick;
    s.drawImage(s.canvas, 0, 0);
    s.globalAlpha = 1;
    s.globalCompositeOperation = 'source-over';
    const m = tmp(1, cols * cell, rows * cell);
    m.imageSmoothingEnabled = false;
    m.drawImage(s.canvas, 0, 0, cols * cell, rows * cell);
    m.globalCompositeOperation = 'destination-in';
    m.fillStyle = glyphs(m, cell);
    m.save();
    // (the characters shift a cell on a hat)
    if (f.mf.hat > 0.3) m.translate(cell, 0);
    m.fillRect(-cell, 0, cols * cell + cell, rows * cell);
    m.restore();
    g.fillStyle = '#05070a';
    g.fillRect(0, 0, W, H);
    g.imageSmoothingEnabled = false;
    g.drawImage(m.canvas, 0, 0);
  },
  // a thermal camera: false colour by brightness, cold purple ground, him and every light white-hot; the bass heats it
  thermal(f, g, W, H) {
    const src = f.snap(true);
    // (the hottest: the bright parts, squared twice (multiplied by themselves: only what is bright stays), yellow-white)
    const w = Math.round(W / 2),
      h = Math.round(H / 2),
      x = tmp(0, w, h);
    x.drawImage(src, 0, 0, w, h);
    grey(x, w, h);
    x.globalCompositeOperation = 'multiply';
    x.drawImage(x.canvas, 0, 0);
    x.drawImage(x.canvas, 0, 0);
    // (the world kept in the cold half of the camera's scale, ink-blue to magenta: the warm half is for what he must
    // read, drawn over it white-hot, lens inkAction; only the brightest of the world glows warm)
    x.fillStyle = '#ffb0e0';
    x.fillRect(0, 0, w, h);
    colorize(g, W, H, '#06031c', '#a03cff', 0.08);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha *= 0.45 + 0.3 * f.mf.bass;
    g.drawImage(x.canvas, 0, 0, W, H);
    g.restore();
    scanlines(g, W, H, 3 * f.v.dpr, 0.1);
  },
  // a blueprint: the world's lines white on blue paper, a grid, redrawn harder on the kick
  blueprint(f, g, W, H) {
    const E = edges(f.snap(true), W, H);
    g.fillStyle = '#12346f';
    g.fillRect(0, 0, W, H);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha *= 0.8 + 0.4 * f.mf.kick;
    g.drawImage(E, 0, 0, W, H);
    g.restore();
    const d = f.v.dpr,
      step = 24 * d;
    g.strokeStyle = 'rgba(200,225,255,0.14)';
    g.lineWidth = d;
    g.beginPath();
    for (let x = 0; x < W; x += step) (g.moveTo(x, 0), g.lineTo(x, H));
    for (let y = 0; y < H; y += step) (g.moveTo(0, y), g.lineTo(W, y));
    g.stroke();
    g.strokeStyle = `rgba(230,240,255,${0.3 + 0.5 * f.mf.snare})`;
    g.lineWidth = 2 * d;
    g.strokeRect(14 * d, 14 * d, W - 28 * d, H - 28 * d);
  },
  // night vision: green, grainy, scan lines, the bright places blooming, an infrared flash on the kick
  nightvision(f, g, W, H) {
    colorize(g, W, H, '#021806', '#8aff96', 0.25 + 0.2 * f.mf.kick);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha *= 0.16;
    g.fillStyle = grain(g);
    const o = (Math.floor(f.t * 30) * 37) % 128;
    g.translate(o, (o * 7) % 128);
    g.fillRect(-128, -128, W + 256, H + 256);
    g.restore();
    scanlines(g, W, H, 3 * f.v.dpr, 0.2);
    vignette(g, W, H, 0.85);
  },
  // the grid world (Tron): black, only the edges of everything burning in a neon that walks round the hues on the bars
  tron(f, g, W, H) {
    const E = edges(f.snap(true), W, H, 0.5, 0),
      w = E.width,
      h = E.height,
      x = tmp(1, w, h);
    x.drawImage(E, 0, 0);
    x.globalCompositeOperation = 'multiply';
    x.fillStyle = TRON[Math.floor(((f.t / f.L.A.beat / 16) % 1) * 4) % 4];
    x.fillRect(0, 0, w, h);
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.drawImage(x.canvas, 0, 0, W, H);
    // (its glow: the same, shrunk small and stretched back soft, once more)
    const gw = Math.max(8, Math.round(w / 6)),
      gh = Math.max(8, Math.round(h / 6)),
      y = tmp(2, gw, gh);
    y.imageSmoothingQuality = 'low';
    y.drawImage(x.canvas, 0, 0, gw, gh);
    g.imageSmoothingEnabled = true;
    g.globalAlpha *= 0.7 + 0.5 * f.mf.kick;
    g.drawImage(y.canvas, 0, 0, W, H);
    g.restore();
  },
  // a manga page: paper, the world's tones in ink, its lines inked black, hatching; speed lines burst on the snare
  manga(f, g, W, H) {
    const src = f.snap(true),
      E = edges(src, W, H, 0.5, 0);
    // (its tones: the picture greyed and lifted well up, on the paper; its lines: the edges, inverted, inked over it)
    const w = E.width,
      h = E.height,
      ink = tmp(1, w, h);
    ink.fillStyle = '#fff';
    ink.fillRect(0, 0, w, h);
    ink.globalCompositeOperation = 'difference';
    ink.drawImage(E, 0, 0);
    colorize(g, W, H, '#1a1612', '#f4efe2', 0.55);
    g.save();
    g.globalCompositeOperation = 'multiply';
    g.drawImage(ink.canvas, 0, 0, W, H);
    g.globalAlpha *= 0.25;
    g.fillStyle = hatchPat(g, f.v.dpr);
    g.fillRect(0, 0, W, H);
    g.restore();
    const sn = f.mf.snare;
    if (sn > 0.2) {
      g.strokeStyle = `rgba(10,10,10,${0.5 * sn})`;
      g.lineWidth = 2 * f.v.dpr;
      g.beginPath();
      for (let k = 0; k < 40; k++) {
        const a = (k / 40) * Math.PI * 2 + f.t,
          r0 = Math.min(W, H) * 0.42;
        g.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0);
        g.lineTo(W / 2 + Math.cos(a) * W, H / 2 + Math.sin(a) * W);
      }
      g.stroke();
    }
  },
  // a risograph print: two inks, pink and blue, laid a little apart (the gap jumping on the kick), on paper
  riso(f, g, W, H) {
    const src = f.snap(true),
      w = Math.round(W / 2),
      h = Math.round(H / 2),
      off = (2 + 4 * f.mf.kick) * f.v.dpr,
      ink = (slot, colour, lift) => {
        const x = tmp(slot, w, h);
        x.drawImage(src, 0, 0, w, h);
        grey(x, w, h);
        x.globalCompositeOperation = 'screen';
        x.fillStyle = `rgba(255,255,255,${lift})`;
        x.fillRect(0, 0, w, h);
        x.fillStyle = colour;
        x.fillRect(0, 0, w, h);
        return x.canvas;
      };
    g.save();
    g.fillStyle = '#f5f0e8';
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'multiply';
    g.drawImage(ink(0, '#ff48b0', 0.25), 0, 0, W, H);
    g.drawImage(ink(1, '#0078bf', 0.55), off, 0, W, H);
    g.restore();
  },
  // a fish-eye: the picture bulging out from the middle, breathing in on the kick, its edges split into colours
  fisheye(f, g, W, H) {
    const src = f.snap(true),
      k = 0.2 + 0.16 * f.mf.kick,
      n = 28;
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < n; i++) {
      const v0 = i / n,
        mid = (v0 + 0.5 / n - 0.5) * 2,
        sc = 1 + k * (1 - mid * mid),
        sy = v0 * H,
        sh = H / n,
        dw = W * sc;
      g.drawImage(
        src,
        0,
        sy,
        W,
        sh,
        (W - dw) / 2,
        H / 2 + (sy - H / 2) * (1 + k * 0.6) - 0.5,
        dw,
        sh * (1 + k * 0.6) + 1,
      );
    }
    g.globalCompositeOperation = 'screen';
    g.globalAlpha = 0.25 + 0.2 * f.mf.kick;
    const d = (3 + 5 * f.mf.kick) * f.v.dpr;
    g.drawImage(src, -d, 0, W, H);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = '#ff4060';
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    vignette(g, W, H, 0.7);
  },
  // datamosh: blocks of the picture slipping and smearing like a broken stream, torn loose on the snare
  datamosh(f, g, W, H) {
    const src = f.snap(true),
      d = f.v.dpr,
      bs = 32 * d,
      n = 6 + Math.round(30 * f.mf.snare + 10 * f.mf.kick),
      seed = Math.floor(f.t * 12);
    for (let k = 0; k < n; k++) {
      const r = q => (Math.sin((seed + k) * 12.9898 + q * 78.233) * 43758.5453) % 1,
        x = Math.floor(Math.abs(r(1)) * (W / bs)) * bs,
        y = Math.floor(Math.abs(r(2)) * (H / bs)) * bs,
        w = bs * (1 + Math.floor(Math.abs(r(3)) * 4)),
        h = bs * (1 + Math.floor(Math.abs(r(4)) * 2)),
        dx = r(5) * 60 * d * (0.4 + f.mf.snare),
        dy = r(6) * 20 * d;
      g.drawImage(src, x, y, w, h, x + dx, y + dy, w, h);
    }
    // (a smear: a row of the picture dragged on down, on the kick)
    if (f.mf.kick > 0.4) {
      const y = Math.floor(Math.abs(Math.sin(seed * 3.1)) * H);
      for (let k = 0; k < 6; k++) g.drawImage(src, 0, y, W, 2 * d, 0, y + k * 6 * d, W, 6 * d);
    }
  },
  // an amber terminal: the world in one orange on black glass, scan lines, the glass curved dark at its corners, a roll
  // bar running down on the beat
  amber(f, g, W, H) {
    colorize(g, W, H, '#140800', '#ffb020');
    // (the world dimmed: what he must read goes over it in its own warm and cold, lens inkAction)
    g.save();
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(0, 0, W, H);
    g.restore();
    scanlines(g, W, H, 3 * f.v.dpr, 0.3);
    const ph = (f.t / f.L.A.beat) % 1;
    g.fillStyle = 'rgba(255,200,90,0.08)';
    g.fillRect(0, ph * H - 30 * f.v.dpr, W, 60 * f.v.dpr);
    vignette(g, W, H, 0.9);
  },
  // a kaleidoscope (the background only): the sky and the far city mirrored round the middle in six turning wedges
  kaleido(f, g, W, H) {
    const src = f.snap(true),
      R = Math.hypot(W, H) / 2,
      spin = (f.t / f.L.A.beat) * 0.08;
    for (let k = 0; k < 6; k++) {
      g.save();
      g.translate(W / 2, H / 2);
      g.rotate(spin + (k * Math.PI) / 3);
      if (k % 2) g.scale(1, -1);
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, R, -Math.PI / 6 - 0.01, Math.PI / 6 + 0.01);
      g.closePath();
      g.clip();
      g.drawImage(src, -W / 2, -H / 2, W, H);
      g.restore();
    }
    // (a little dimmed, a busy mirror behind him: what is in his way must stand out of it)
    g.save();
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = 'rgba(70,70,90,0.35)';
    g.fillRect(0, 0, W, H);
    g.restore();
  },
  // watercolour (the background only): soft washes, colours bled into each other, the paper's tooth showing, a
  // wash spreading on each phrase of the tune
  watercolor(f, g, W, H) {
    const x = shrink(f.snap(true), W, H, 40);
    g.imageSmoothingEnabled = true;
    // (blown up from its few rows smoothed 'medium': 'high' looked the same and cost the graphics card 35 ms a frame at a
    // retina's size; put back to the picture's 'low' after, for the sprites and glows drawn on it)
    g.imageSmoothingQuality = 'medium';
    g.drawImage(x.canvas, 0, 0, W, H);
    g.imageSmoothingQuality = 'low';
    g.globalCompositeOperation = 'soft-light';
    g.globalAlpha = 0.5;
    g.fillStyle = '#f4ead8';
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'multiply';
    g.globalAlpha = 0.6;
    g.fillStyle = cells(g, Math.round(5 * f.v.dpr), 2.4 * f.v.dpr);
    g.globalAlpha = 0.08;
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
  },
});
PIXELS.matrix = (f, g, W, H) => {
  // the source code (a secret, level.js): the world in green, columns of glyphs raining down it on the beat
  const d = f.v.dpr,
    { t, mf } = f;
  twoTone(g, W, H, '#001a08', '#5dff8f');
  const cw = 18 * d,
    n = Math.ceil(W / cw);
  // (the glyphs stamped from their atlas, util.js kana: a faded one is the opaque colour under the alpha)
  const px = Math.round(15 * d),
    ga = g.globalAlpha;
  for (let i = 0; i < n; i += 2) {
    const sp = 0.4 + ((i * 37) % 11) / 11,
      y0 = ((t * sp * 0.35 + ((i * 53) % 17) / 17) % 1.3) * H;
    for (let k = 0; k < 7; k++) {
      g.globalAlpha = k ? ga * Math.min(1, (0.55 - k * 0.07) * (0.7 + 0.3 * mf.beat)) : ga;
      kana(g, (i * 7 + k * 13 + Math.floor(t * 8)) % 90, i * cw, y0 - k * 17 * d, px, k ? '#50ff8c' : '#d8ffe4');
    }
  }
  g.globalAlpha = ga;
};
// which lenses lie over the background only (a fish-eye and a datamosh too: what he must read never bulges or smears
// off where it is)
export const BACK = new Set(['duo', 'gameboy', 'kaleido', 'watercolor', 'fisheye', 'datamosh']);

// the lens at f's moment: inside the source (a secret) its own, else the song's once the song is under way (L.lensAt,
// modes.js: a song opens plain), else none
const inSource = f => f.run.source && f.t < f.run.source.t1 && f.t >= f.run.source.t0;
// (a drop: the song's lens for it (its signature on the first, a second set against it on the next, and round), cut in hard
// on the drop's first beat and held one phrase: eight bars, sixteen where the drop runs to twenty-four; let go over the
// phrase's last beat. Stronger drop by drop (Rez's layers): 85% on the first, all of it on the last. Over the two
// beats before a drop it shows through faintly, a hint of what is coming)
function lensAtNow(f) {
  if (inSource(f)) return { name: 'matrix', k: 1 };
  const lk = f.look,
    s = f.run.L?.lensSlot?.(f.t);
  if (!s || !lk) return null;
  const list = lk.lenses ?? [lk.lens],
    name = list[s.k % list.length];
  if (!name) return null;
  const beat = f.run.L.A.beat,
    // (the first drop already near full: a drop is where the world goes off, the first one too)
    grow = 0.85 + 0.15 * (s.n > 1 ? s.k / (s.n - 1) : 1);
  if (s.kind === 'pre') return { name, k: 0.35 * grow * (1 - -s.since / (2 * beat)) };
  const hold = (s.len >= 24 * 4 * beat ? 16 : 8) * 4 * beat,
    end = Math.min(s.len, hold);
  if (s.since >= end) return null;
  return { name, k: grow * Math.min(1, (end - s.since) / beat) };
}
function lensNow(f) {
  return lensAtNow(f)?.name ?? null;
}
// the lens lying over the whole world at f's moment, if any (what must stay readable is drawn after it: f.label)
export function overAll(f) {
  const L = lensNow(f);
  return !!L && !!PIXELS[L] && !BACK.has(L);
}
// whether that lens breaks the picture into big pixels (words under it cannot be read at all)
export function pixelated(f) {
  const L = lensNow(f);
  return L === 'pixel' || L === 'led' || L === 'matrix' || L === 'gameboy' || L === 'ascii';
}
// the lens over what has been drawn so far: `back` the background's pass (under the roofs, the things and him), else
// the whole world's (under the HUD)
export function lens(back) {
  return f => {
    // (inside the source, a secret: its own lens over everything)
    const now = inSource(f) && back ? null : lensAtNow(f),
      L = now?.name;
    // (for the flight recorder: the lens on now)
    if (!back) f.R && (f.R.lensName = L ?? null);
    if (!L || !PIXELS[L] || BACK.has(L) !== back || now.k <= 0.01) return;
    const { g, v } = f;
    // (laid over the picture as strong as the moment asks: the picture under it shows through the rest)
    screen(g, () => {
      g.globalAlpha = Math.min(1, now.k);
      PIXELS[L](f, g, v.W, v.H);
    });
    // (what was copied is stale now: the next effect copies afresh)
    f.snapStale();
  };
}

// ---- what he must read, over a lens over the whole world (renderer.js draws it on a canvas of its own after the lens):
// in its own colours always (the action's colours are his: warm to jump, cold to slide, red to kick or to keep clear
// of), dressed in the lens's own ink so it belongs to the picture (the gameplay layer kept out of the post effects, as
// stylised games keep their threats readable: a silhouette in the look's ink, Hi-Fi Rush's and Spider-Verse's outlines).
// Per lens:
//   ink    the outline's colour, `w` its width (screen px per dpr), drawn as the silhouette set a little to each side
//   glow   a soft halo of the silhouette in that colour (shrunk small and blown back up), how strong
//   rows   the layer itself in big pixels too, that many on the short side (the pixel lenses), its outline from them
//   split  two inks laid off its sides (a print's misregistration, a tape's colour bleed), how far
//   tone   a pattern laid into it (a comic's dots, a manga's screentone), how strong
const INK = {
  pixel: { ink: '#0b0b10', w: 2, rows: 240 },
  led: { ink: '#000000', w: 2, rows: 180, glow: ['#ffffff', 0.15] },
  vhs: { ink: '#0b0b10', w: 1.5, split: ['#ff2050', '#20c8ff', 3] },
  comic: { ink: '#0b0b10', w: 3, tone: 0.18 },
  ascii: { ink: '#7dff9a', w: 1.5, glow: ['#5dff8f', 0.18] },
  thermal: { ink: '#fff6c8', w: 2.5, glow: ['#ffd060', 0.35] },
  blueprint: { ink: '#e8f2ff', w: 2, glow: ['#9cc8ff', 0.15] },
  nightvision: { ink: '#c8ffd0', w: 1.5, glow: ['#8aff96', 0.3] },
  tron: { ink: null, w: 2, glow: [null, 0.5] },
  manga: { ink: '#0b0b10', w: 3.5, tone: 0.22 },
  riso: { ink: '#1a1a2a', w: 1.5, split: ['#ff48b0', '#0078bf', 3] },
  datamosh: { ink: '#0b0b10', w: 1.5, split: ['#ff2a3d', '#29e7ff', 2] },
  amber: { ink: '#ffcf70', w: 1.5, glow: ['#ffb020', 0.3] },
  matrix: { ink: '#b8ffc8', w: 1.5, glow: ['#5dff8f', 0.25] },
};
// the hard silhouette of what is on `src` at half size: its alpha taken to the fourth power (drawn into itself twice),
// so a solid thing stays solid and a soft glow or a haze drops out (an outline round a glow is a blot of ink)
function mask(src, W, H) {
  const w = Math.max(8, Math.round(W / 2)),
    h = Math.max(8, Math.round(H / 2)),
    x = tmp(3, w, h),
    y = tmp(7, w, h);
  x.clearRect(0, 0, w, h);
  x.drawImage(src, 0, 0, w, h);
  for (let i = 0; i < 2; i++) {
    y.globalCompositeOperation = 'copy';
    y.drawImage(x.canvas, 0, 0);
    x.globalCompositeOperation = 'destination-in';
    x.drawImage(y.canvas, 0, 0);
    x.globalCompositeOperation = 'source-over';
  }
  return x.canvas;
}
// that silhouette in one colour (slot: which scratch canvas), half size
function silhouette(slot, M, col) {
  const x = tmp(slot, M.width, M.height);
  x.clearRect(0, 0, M.width, M.height);
  x.drawImage(M, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = col;
  x.fillRect(0, 0, M.width, M.height);
  x.globalCompositeOperation = 'source-over';
  return x.canvas;
}
export function inkAction(f, g, act, name = lensNow(f)) {
  const
    st = INK[name] ?? { ink: '#0b0b10', w: 2 },
    { W, H, dpr: d } = f.v,
    mf = f.mf;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  // (the pixel lenses: the layer in big pixels too, but finer than the world's, so it reads)
  let src = act;
  if (st.rows) {
    const k = st.rows / Math.min(W, H),
      w = Math.max(8, Math.round(W * k)),
      h = Math.max(8, Math.round(H * k)),
      x = tmp(5, w, h);
    x.clearRect(0, 0, w, h);
    x.imageSmoothingEnabled = true;
    x.drawImage(act, 0, 0, w, h);
    const y = tmp(6, W, H);
    y.clearRect(0, 0, W, H);
    y.imageSmoothingEnabled = false;
    y.drawImage(x.canvas, 0, 0, W, H);
    src = y.canvas;
  }
  // (tron's neon walks round its hues with the bars, as its world's edges do)
  const ink = st.ink ?? TRON[Math.floor(((f.t / f.L.A.beat / 16) % 1) * 4) % 4];
  const M = mask(src, W, H);
  g.imageSmoothingEnabled = true;
  // the halo
  if (st.glow) {
    const gc = st.glow[0] ?? ink,
      sil = silhouette(8, M, gc),
      gw = Math.max(8, Math.round(W / 8)),
      gh = Math.max(8, Math.round(H / 8)),
      y = tmp(4, gw, gh);
    y.clearRect(0, 0, gw, gh);
    y.drawImage(sil, 0, 0, gw, gh);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = st.glow[1] * (0.8 + 0.4 * mf.kick);
    g.imageSmoothingEnabled = true;
    g.drawImage(y.canvas, -2 * d, -2 * d, W + 4 * d, H + 4 * d);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }
  // the two inks off its sides (misregistration, colour bleed), wider on the kick
  if (st.split) {
    const [a, b, off] = st.split,
      o = (off + 2 * mf.kick) * d;
    g.globalAlpha = 0.75;
    g.drawImage(silhouette(8, M, a), -o, 0, W, H);
    g.drawImage(silhouette(8, M, b), o, 0, W, H);
    g.globalAlpha = 1;
  }
  // the outline: the silhouette in the ink, a little to each side of it
  if (st.w) {
    // (eight ways round; four on a big screen, a retina's, where each is a whole screen's worth of pixels)
    const sil = silhouette(8, M, ink),
      o = st.w * d,
      ways = [
        [o, 0],
        [-o, 0],
        [0, o],
        [0, -o],
        [o * 0.7, o * 0.7],
        [-o * 0.7, o * 0.7],
        [o * 0.7, -o * 0.7],
        [-o * 0.7, -o * 0.7],
      ];
    for (const [dx, dy] of W * H > 2.5e6 ? ways.slice(0, 4) : ways) g.drawImage(sil, dx, dy, W, H);
  }
  // the layer itself, in its own colours
  if (st.tone) {
    // (a tone laid into it, only where it is: dots for a comic, hatching for a manga)
    const x = tmp(9, W, H);
    x.clearRect(0, 0, W, H);
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.globalAlpha = st.tone;
    x.fillStyle = name === 'manga' ? hatchPat(x, d) : cells(x, Math.round(6 * d), 1.8 * d);
    x.fillRect(0, 0, W, H);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    g.drawImage(x.canvas, 0, 0);
  } else g.drawImage(src, 0, 0);
  g.restore();
}

// the song's lenses run once, out of sight, as its run starts: their scratch canvases made and their pictures sent to the
// graphics card then, not on the first beat of a drop (a lens met for the first time held a frame 50-150 ms)
let warmC = null;
export function warmLenses(f, act) {
  const lk = f.look,
    names = [...new Set([...(lk?.lenses ?? []), lk?.lens])].filter(n => n && PIXELS[n]);
  if (!names.length) return;
  const { W, H } = f.v;
  warmC ??= document.createElement('canvas');
  if (warmC.width !== W || warmC.height !== H) Object.assign(warmC, { width: W, height: H });
  const x = warmC.getContext('2d');
  for (const n of names) {
    x.save();
    try {
      PIXELS[n](f, x, W, H);
      if (!BACK.has(n)) inkAction(f, x, act, n);
    } catch {
      // (a lens that cannot draw yet is simply not warmed)
    }
    x.restore();
  }
  f.snapStale();
}
