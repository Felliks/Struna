// The world round a shaft, one look per entry of SHAFT's walls (index.js): what he falls or flies past.
// Each is fn(f, s, look): f the frame, s the shaft (s.x its centre, s.y0 / s.y1 where it starts and ends, s.kind
// 'fall' or 'rise'), look { wall, variant 0..1, depth (the song's shaft ordinal), speed (m/s he passes at) }.
// Everything stays out of his corridor (s.x ± 2.4 m, where the hazards and the rings are) but for faint depth, sits
// still in the world so it streams past at his speed, and plays the song: the kick strikes, the snare slams, the hats
// crackle, the bass sways, the voice glows, a build and a drop turn it all up.
import { LANE } from '../../run.js';
import { clamp, glowDot, hash, rgba } from '../util.js';

const TAU = Math.PI * 2,
  // the corridor's half width and where a wall may begin
  EDGE = LANE * 1.75;

// a hex colour between a and b (u 0..1), still a hex so rgba() takes it
function mix(a, b, u) {
  const p = parseInt(a.slice(1), 16),
    q = parseInt(b.slice(1), 16),
    ch = k => Math.round(((p >> k) & 255) * (1 - u) + ((q >> k) & 255) * u),
    hx = n => n.toString(16).padStart(2, '0');
  return '#' + hx(ch(16)) + hx(ch(8)) + hx(ch(0));
}
// a colour at alpha a, the alpha in sixteenths so shapes of one look share a fill
const al = (hex, a) => rgba(hex, Math.round(clamp(a, 0, 1) * 16) / 16);
// a modulo that stays positive for the cells below y 0
const mod = (a, n) => ((a % n) + n) % n;
const pick = (list, u) => list[Math.floor(clamp(u, 0, 0.999) * list.length)];

// the path of a batch's shapes: 0 a rect (x y w h), 1 a circle (x y r), 2 a polygon or polyline (n, then n points)
function trace(g, a, close) {
  for (let i = 0; i < a.length; ) {
    const op = a[i++];
    if (op === 0) {
      g.rect(a[i], a[i + 1], a[i + 2], a[i + 3]);
      i += 4;
    } else if (op === 1) {
      g.moveTo(a[i] + a[i + 2], a[i + 1]);
      g.arc(a[i], a[i + 1], Math.max(0.1, a[i + 2]), 0, TAU);
      i += 3;
    } else {
      const n = a[i++];
      g.moveTo(a[i], a[i + 1]);
      for (let k = 1; k < n; k++) g.lineTo(a[i + 2 * k], a[i + 2 * k + 1]);
      if (close) g.closePath();
      i += 2 * n;
    }
  }
}
// shapes gathered by their style and drawn with one fill (or stroke) per style: a wall of hundreds of windows is a
// handful of draw calls. z(n) sets the layer what follows goes on (higher over lower; within a layer fills go under
// lines), since shapes of one style are drawn together whatever order they came in
// (a line's style and width as one key, made once per pair: a string built for every line of every frame was garbage)
const KEYS = new Map();
const lineKey = (st, w) => {
  const lw = Math.max(1, Math.round(w * 2) / 2);
  let m = KEYS.get(st);
  if (!m) {
    if (KEYS.size >= 2048) KEYS.clear();
    KEYS.set(st, (m = new Map()));
  }
  let k = m.get(lw);
  if (k === undefined) m.set(lw, (k = st + '|' + lw));
  return k;
};
// (n world points (x y pairs in pts) onto a batch's list, through the frame's X and Y)
const pushPts = (a, pts, X, Y) => {
  a.push(2, pts.length / 2);
  for (let i = 0; i < pts.length; i += 2) a.push(X(pts[i]), Y(pts[i + 1]));
};
function batch(g) {
  const layers = new Map();
  let z = 0;
  const at = (kind, k) => {
    let L = layers.get(z);
    if (!L) layers.set(z, (L = { fills: new Map(), lines: new Map() }));
    const map = L[kind];
    let a = map.get(k);
    if (!a) map.set(k, (a = []));
    return a;
  };
  return {
    z(n) {
      z = n;
    },
    rect(st, x, y, w, h) {
      at('fills', st).push(0, x, y, w, h);
    },
    dot(st, x, y, r) {
      at('fills', st).push(1, x, y, r);
    },
    poly(st, p) {
      const a = at('fills', st);
      a.push(2, p.length / 2);
      for (let i = 0; i < p.length; i++) a.push(p[i]);
    },
    line(st, w, p) {
      const a = at('lines', lineKey(st, w));
      a.push(2, p.length / 2);
      for (let i = 0; i < p.length; i++) a.push(p[i]);
    },
    // (a polygon or a polyline of world points, put through X and Y as it goes on: no list of its screen points made)
    polyAt(st, pts, X, Y) {
      pushPts(at('fills', st), pts, X, Y);
    },
    lineAt(st, w, pts, X, Y) {
      pushPts(at('lines', lineKey(st, w)), pts, X, Y);
    },
    ring(st, w, x, y, r) {
      at('lines', lineKey(st, w)).push(1, x, y, r);
    },
    flush() {
      for (const n of [...layers.keys()].sort((p, q) => p - q)) {
        const L = layers.get(n);
        for (const [st, a] of L.fills) {
          g.fillStyle = st;
          g.beginPath();
          trace(g, a, true);
          g.fill();
        }
        for (const [k, a] of L.lines) {
          const i = k.lastIndexOf('|');
          g.strokeStyle = k.slice(0, i);
          g.lineWidth = +k.slice(i + 1);
          g.beginPath();
          trace(g, a, false);
          g.stroke();
        }
      }
      layers.clear();
      z = 0;
    },
  };
}

// a wall's frame: what is on screen of the shaft (clipped to it), and the tools to draw there in world metres; null
// when none of it is on screen
function open(f, s, look) {
  const { g, v, mf } = f,
    lo = Math.min(s.y0, s.y1),
    hi = Math.max(s.y0, s.y1),
    ya = Math.max(lo, v.y - 3),
    yb = Math.min(hi, v.y + v.vh + 3);
  if (yb <= ya) return null;
  g.save();
  g.beginPath();
  g.rect(-v.W, v.sy(hi), v.W * 3, v.sy(lo) - v.sy(hi));
  g.clip();
  const m = v.ppm,
    xl = v.x - 4,
    xr = v.x + v.vw + 4,
    vr = look.variant ?? 0,
    key = Math.floor(vr * 100000),
    vc = v.y + v.vh / 2,
    b = batch(g),
    X = x => v.sx(x),
    Y = y => v.sy(y),
    c = {
      g,
      v,
      mf,
      T: f.T,
      m,
      s,
      look,
      b,
      X,
      Y,
      lo,
      hi,
      ya,
      yb,
      xl,
      xr,
      vr,
      // two more numbers of the variant's own (so palette, layout and density do not all move together)
      v2: hash(key, 11),
      v3: hash(key, 23),
      cx: s.x,
      dk: clamp((look.depth ?? 0) / 4, 0, 1),
      // the way he travels through the world (y): -1 down a fall, +1 up a rise
      dir: s.kind === 'rise' ? 1 : -1,
      // how hard the song is pushing now
      hot: clamp(mf.drop + 0.6 * mf.build + 0.3 * mf.stage, 0, 1.5),
      beatN: Math.floor(f.t / (f.L?.A?.beat || 0.5)),
      // a streak's length in px as long as he is fast
      sl: Math.min(3.5, 0.07 * (look.speed ?? 0)) * m,
      glow: f.glow ? 1 : 0,
      t: f.t,
      // a random for this frame (changes 24 times a second)
      rr: k => hash(Math.floor(f.t * 24), k),
      // world x of a point d metres out from the centre on side sgn (a climb's walls stand closer in: look.inset)
      at: (sgn, d) => s.x + sgn * (d - (look.inset ?? 0)),
      // how far out the screen's edge is on side sgn
      reach: sgn => (sgn < 0 ? s.x - xl : xr - s.x) + (look.inset ?? 0),
      // a rect between two world corners
      rect(st, x0, y0, x1, y1) {
        const A = X(x0),
          B = X(x1),
          C = Y(y0),
          D = Y(y1);
        b.rect(st, Math.min(A, B), Math.min(C, D), Math.abs(B - A), Math.abs(D - C));
      },
      // a polygon of world points
      poly(st, pts) {
        b.polyAt(st, pts, X, Y);
      },
      // a polyline of world points, w px wide
      line(st, w, pts) {
        b.lineAt(st, w, pts, X, Y);
      },
      // a side's wall body from d0 out to the screen's edge, over what is on screen
      body(st, sgn, d0) {
        c.rect(st, c.at(sgn, d0), ya, sgn < 0 ? xl : xr, yb);
      },
      // cells of `step` metres over the shaft on screen: fn(k, y) with k the stable index
      each(step, fn, pad = 0) {
        for (let k = Math.floor((ya - pad) / step); k * step < yb + pad; k++) fn(k, k * step);
      },
      // cells of a layer behind at parallax par (0 still on screen, 1 with the world): fn(k, y) with y where it is
      // now in world metres
      layer(par, step, fn) {
        const sh = vc * (1 - par);
        for (let k = Math.floor((v.y - sh) / step) - 1; k * step + sh < v.y + v.vh + step; k++) fn(k, k * step + sh);
      },
      sides(fn) {
        b.z(0);
        fn(-1);
        b.z(0);
        fn(1);
      },
      // a soft glow at world (x, y), r metres, only on full quality
      halo(x, y, r, col, a) {
        if (c.glow) glowDot(g, X(x), Y(y), r * m, col, a);
      },
      z(n) {
        b.z(n);
      },
      done() {
        b.flush();
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = 1;
        g.restore();
      },
    };
  return c;
}
// a smooth 1-D noise from per-metre hashes, -1..1
function noise(y, salt) {
  const k = Math.floor(y),
    u = y - k,
    w = u * u * (3 - 2 * u);
  return (hash(k, salt) * (1 - w) + hash(k + 1, salt) * w) * 2 - 1;
}
// a jagged inner edge for rock and ice: points down a side from ya to yb at d0 plus the noise, closed to the screen edge
function cragPts(c, sgn, d0, amp, salt, step = 0.6) {
  const p = [];
  for (let y = Math.floor(c.ya / step) * step; y <= c.yb + step; y += step) p.push(c.at(sgn, d0 + amp * noise(y * 0.7, salt) + 0.25 * amp * noise(y * 2.3, salt + 1)), y);
  const out = sgn < 0 ? c.xl : c.xr,
    last = p[p.length - 1];
  p.push(out, last, out, p[1]);
  return p;
}

export const WALLS = {
  // CITY: a tower's face, storey after storey with setbacks; its windows lit by the kick, a whole floor on the bass,
  // crackling on the hats, its ledges flashing on the kick and the corner on the snare; deeper shafts go down into
  // darker storeys
  facade(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { mf, T, vr, v2, dk, m } = c,
      body = mix(T.near, '#000000', 0.1 + 0.45 * dk),
      trim = mix(T.far, '#ffffff', 0.06),
      cw = 0.55 + 0.3 * v2,
      rh = 0.8,
      floor = 3.2,
      wins = pick([T.win, [T.win[2], T.win[0], T.line], [T.line, T.win[1], '#ffffff']], vr),
      litFloor = c.beatN % 4;
    c.sides(sgn => {
      c.each(floor, k => {
        const d0 = EDGE + 0.15 + 0.9 * hash(k, sgn + 3) * (0.4 + v2);
        c.rect(body, c.at(sgn, d0), k * floor, sgn < 0 ? c.xl : c.xr, (k + 1) * floor);
        c.rect(trim, c.at(sgn, d0 - 0.12), k * floor, sgn < 0 ? c.xl : c.xr, k * floor + 0.22);
        c.rect(al(T.line, 0.15 + 0.6 * mf.kick + 0.3 * c.hot), c.at(sgn, d0 - 0.12), k * floor + 0.22, sgn < 0 ? c.xl : c.xr, k * floor + 0.27);
        c.rect(al(T.line, 0.2 + 0.7 * mf.snare), c.at(sgn, d0), k * floor + 0.3, c.at(sgn, d0 + 0.07), (k + 1) * floor);
      });
    });
    c.b.flush();
    c.sides(sgn => {
      const reach = c.reach(sgn);
      c.each(rh, (k, y) => {
        const fl = Math.floor(y / floor),
          d0 = EDGE + 0.15 + 0.9 * hash(fl, sgn + 3) * (0.4 + v2);
        if (y - fl * floor < 0.4) return;
        for (let i = 0; d0 + 0.35 + i * cw < reach; i++) {
          const x = c.at(sgn, d0 + 0.35 + i * cw),
            h = hash(k * 13 + (sgn > 0 ? 7001 : 0), i),
            col = wins[Math.floor(h * 30) % 3];
          let a = h < 0.1 + 0.28 * mf.stage - 0.08 * dk ? 0.55 : 0.06;
          if (hash(k, i * 3 + 1) < 0.35 * mf.kick) a = 1;
          if (mod(fl, 4) === litFloor && h < 0.6) a = Math.max(a, 0.2 + 0.7 * mf.bass);
          if (c.rr(k * 31 + i * 7 + sgn) < 0.02 + 0.25 * mf.hat) a = Math.max(a, 0.9);
          c.z(0);
          c.rect(al(col, a * (0.6 + 0.4 * (1 - dk))), x - (sgn * cw * 0.28), y + 0.12, x + sgn * cw * 0.28, y + rh - 0.12);
        }
      });
      // an air conditioner or a sign on each storey's face
      c.each(floor, k => {
        const d = EDGE + 1.6 + 5 * hash(k, sgn + 9);
        c.z(1);
        c.rect('#14161a', c.at(sgn, d), k * floor + 0.4, c.at(sgn, d + 0.7), k * floor + 0.9);
        c.z(2);
        c.rect(al(T.win[mod(k, 3)], 0.3 + 0.5 * mf.hat), c.at(sgn, d + 0.1), k * floor + 0.55, c.at(sgn, d + 0.6), k * floor + 0.6);
      });
    });
    c.b.flush();
    // the drop: every window down the face lights in a wave
    if (mf.drop > 0.05) {
      c.g.globalAlpha = mf.drop * 0.25;
      c.g.fillStyle = T.win[0];
      c.sides(sgn => c.rect(T.win[0], c.at(sgn, EDGE + 0.4), c.ya, sgn < 0 ? c.xl : c.xr, c.yb));
      c.b.flush();
      c.g.globalAlpha = 1;
    }
    void m;
    c.done();
  },
  // CITY: a glass skyscraper's curtain wall: the sky's colour reflected down it, mullions and transoms, sheens sliding
  // with the bass, a row of panes flashing on the kick, a glint sweeping on the snare, offices lit behind some panes
  glass(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { g, v, mf, T, vr, v2, dk, m } = c,
      tintc = pick(['#5ad1ff', '#ff8fd0', '#7dffb0', '#ffb070'], vr),
      pw = 1.2 + 0.6 * v2,
      ph = 1.8,
      d0 = EDGE + 0.2 + 0.5 * c.v3;
    // the reflection: one gradient down the screen for both sides
    const gr = g.createLinearGradient(0, 0, 0, v.H);
    gr.addColorStop(0, mix(mix(T.far, tintc, 0.3), '#000000', 0.3 + 0.2 * dk));
    gr.addColorStop(0.5 + 0.2 * Math.sin(c.t * 0.3), mix(T.near, tintc, 0.12 + 0.15 * mf.bass));
    gr.addColorStop(1, mix(mix(T.near, tintc, 0.08), '#000000', 0.4 + 0.3 * dk));
    c.sides(sgn => c.body(gr, sgn, d0));
    c.b.flush();
    c.sides(sgn => {
      const reach = c.reach(sgn);
      // offices behind the glass and the kick's row
      c.each(ph, (k, y) => {
        for (let i = 0; d0 + i * pw < reach; i++) {
          const h = hash(k * 17 + (sgn > 0 ? 3001 : 0), i),
            x0 = c.at(sgn, d0 + i * pw),
            x1 = c.at(sgn, d0 + (i + 1) * pw);
          if (h < 0.18 + 0.2 * mf.stage) c.rect(al(T.win[Math.floor(h * 9) % 3], 0.12 + 0.15 * mf.voice), x0, y + 0.2, x1, y + ph * 0.55);
          if ((k + c.beatN) % 5 === 0) c.rect(al(tintc, 0.08 + 0.45 * mf.kick), x0, y, x1, y + ph);
          if (c.rr(k * 41 + i) < 0.15 * mf.hat) c.rect(al('#ffffff', 0.5), x0, y + ph - 0.12, x1, y + ph - 0.06);
        }
        c.line(al('#000000', 0.55), 0.09 * m, [c.at(sgn, d0), y, sgn < 0 ? c.xl : c.xr, y]);
      });
      for (let i = 0; d0 + i * pw < reach; i++) c.rect(al('#05070a', 0.6), c.at(sgn, d0 + i * pw - 0.04), c.ya, c.at(sgn, d0 + i * pw + 0.04), c.yb);
      // the tower across reflected in the glass: its windows sliding past at half his speed
      c.layer(0.5, 0.9, (k, y) => {
        for (let i = 0; d0 + 0.3 + i * 0.7 < reach; i++) {
          const h = hash(k * 7 + i, sgn + 90);
          if (h > 0.22 + 0.15 * mf.stage) continue;
          const x = c.at(sgn, d0 + 0.3 + i * 0.7);
          c.rect(al(T.win[Math.floor(h * 13) % 3], 0.1 + 0.25 * (h < 0.08 ? mf.kick : 0.3)), x, y, x + sgn * 0.35, y + 0.45);
        }
      });
      // sheens: tilted bright bands fixed on the glass, sliding a little with the bass
      c.each(7, (k, y) => {
        const yy = y + 3 * hash(k, sgn + 2) + mf.bass * 0.6,
          d = d0 + 1 + 4 * hash(k, sgn + 5),
          w = 0.5 + 1.2 * hash(k, 8);
        c.poly(al('#ffffff', 0.05 + 0.1 * mf.voice + 0.08 * c.hot), [c.at(sgn, d), yy, c.at(sgn, d + w), yy, c.at(sgn, d + w + 2), yy + 3, c.at(sgn, d + 2), yy + 3]);
      });
      // the snare's glint: a bright stroke running down the corner
      c.rect(al('#ffffff', 0.25 + 0.75 * mf.snare), c.at(sgn, d0), c.ya, c.at(sgn, d0 + 0.06), c.yb);
      if (c.sl > 4) c.each(1.3, (k, y) => {
        if (hash(k, sgn + 40) > 0.35) return;
        const x = c.at(sgn, d0 + 0.4 + 7 * hash(k, sgn + 41));
        c.b.rect(al(tintc, 0.18), c.X(x), c.Y(y), v.dpr * 2, c.sl);
      });
    });
    c.done();
  },
  // CITY: a canyon of billboards and neon signs bolted to scaffolding: boards flashing on the kick or the snare, a
  // vertical sign's characters chasing the beat, equalizer boards playing the bands, tickers crawling on the hats
  billboards(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { mf, T, vr, v2, dk, m } = c,
      cols = [T.win[0], T.win[1], T.line, pick(['#3dfff0', '#ff6ad5', '#8a7dff', '#7dff6a'], vr), pick(['#ff9a3d', '#3d9aff', '#d06aff'], v2)],
      steel = mix(T.near, '#000000', 0.35 + 0.3 * dk),
      d0 = EDGE + 0.2;
    c.sides(sgn => {
      c.body(steel, sgn, d0 + 0.3);
      // the scaffold's lattice
      c.each(2.4, (k, y) => {
        c.line(al(T.far, 0.9), 0.06 * m, [c.at(sgn, d0 + 0.3), y, c.at(sgn, c.reach(sgn)), y]);
        for (let d = d0 + 0.3; d < c.reach(sgn); d += 2.4) c.line(al(T.far, 0.7), 0.04 * m, [c.at(sgn, d), y, c.at(sgn, d + 2.4), y + 2.4]);
      });
    });
    c.b.flush();
    c.sides(sgn => {
      c.each(3, (k, y) => {
        const h = hash(k, sgn + 70),
          d = d0 + 0.4 + 0.8 * hash(k, sgn + 71),
          w = 2.2 + 3 * hash(k, sgn + 72),
          hh = 1.6 + 0.9 * hash(k, sgn + 73),
          col = cols[Math.floor(h * 50) % cols.length],
          kind = Math.floor(h * 4),
          y0 = y + 0.3,
          x0 = c.at(sgn, d),
          x1 = c.at(sgn, d + w);
        const e = kind === 0 ? mf.kick : kind === 1 ? mf.snare : kind === 2 ? mf.beat : mf.bass;
        c.z(0);
        c.rect(al(col, 0.22 + 0.6 * e + 0.2 * c.hot), x0, y0, x1, y0 + hh);
        c.z(1);
        c.rect(al('#000000', 0.45), c.at(sgn, d + 0.12), y0 + 0.12, c.at(sgn, d + w - 0.12), y0 + hh - 0.12);
        c.z(2);
        if (kind === 0) {
          // an equalizer board
          const bands = [mf.kick, mf.snare, mf.hat * 2.5, mf.bass, mf.voice, mf.beat];
          bands.forEach((val, bi) => {
            const bw = (w - 0.4) / 6,
              hv = (0.15 + 0.85 * clamp(val, 0, 1)) * (hh - 0.4);
            c.rect(al(cols[bi % cols.length], 0.85), c.at(sgn, d + 0.2 + bi * bw), y0 + 0.2, c.at(sgn, d + 0.2 + (bi + 0.7) * bw), y0 + 0.2 + hv);
          });
        } else if (kind === 1) {
          // a face: two eyes that blink on the snare
          const r = 0.18 * (1 - 0.8 * mf.snare);
          c.rect(al(col, 0.95), c.at(sgn, d + w * 0.35 - 0.2), y0 + hh * 0.5 - r, c.at(sgn, d + w * 0.35 + 0.2), y0 + hh * 0.5 + r);
          c.rect(al(col, 0.95), c.at(sgn, d + w * 0.65 - 0.2), y0 + hh * 0.5 - r, c.at(sgn, d + w * 0.65 + 0.2), y0 + hh * 0.5 + r);
        } else {
          // a ticker crawling along on the hats
          for (let j = 0; j < 10; j++) {
            const u = (j / 10 + c.t * 0.25 * sgn + 10) % 1;
            if (hash(j + Math.floor(c.t * 4), k) < 0.4) continue;
            c.rect(al(col, 0.5 + 0.5 * mf.hat * 2), c.at(sgn, d + 0.2 + u * (w - 0.5)), y0 + hh * 0.42, c.at(sgn, d + 0.38 + u * (w - 0.5)), y0 + hh * 0.58);
          }
        }
      });
      // a vertical sign: its blocks lit in a chase down the way he goes
      c.each(9, (k, y) => {
        const d = d0 + 5.5 + 2 * hash(k, sgn + 80),
          col = cols[mod(k + 3, cols.length)];
        c.z(3);
        c.rect(al('#0b0b10', 0.95), c.at(sgn, d), y, c.at(sgn, d + 0.8), y + 6);
        for (let j = 0; j < 6; j++) {
          c.z(4);
          const on = (j * -c.dir + c.beatN + 60) % 6 === 0;
          c.rect(al(col, on ? 0.95 : 0.25 + 0.3 * mf.voice), c.at(sgn, d + 0.15), y + 0.2 + j * 0.95, c.at(sgn, d + 0.65), y + 0.95 + j * 0.95);
        }
      });
    });
    c.done();
  },

  // SYNTH: walls of wireframe grid: rows lit in a chase on the beat, the verticals bending on the bass, nodes sparking on
  // the hats, a band of rows tearing sideways on the snare
  grid(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { g, mf, vr, v2, dk, m } = c,
      [ca, cb] = pick([['#ff3df0', '#29e7ff'], ['#ff8a3d', '#b04dff'], ['#3dffa8', '#3d7dff'], ['#ffe66a', '#ff3d8a']], vr),
      step = 0.8 + 0.6 * v2,
      d0 = EDGE + 0.2;
    c.sides(sgn => c.body(mix('#0a0418', '#000000', 0.5 * dk), sgn, d0));
    c.b.flush();
    g.globalCompositeOperation = 'lighter';
    c.sides(sgn => {
      const reach = c.reach(sgn),
        tear = mf.snare > 0.3 ? Math.floor(c.rr(5) * 12) : -99;
      c.each(step, k => {
        const y = k * step,
          lit = (k * -c.dir + c.beatN * 2 + 400) % 8 < 1,
          dx = Math.abs(k % 12 - tear) < 2 ? sgn * mf.snare * 0.8 : 0;
        c.line(al(ca, (lit ? 0.9 : 0.3) * (0.6 + 0.4 * mf.kick) + 0.2 * c.hot), lit ? 0.07 * m : 0.035 * m, [c.at(sgn, d0) + dx, y, c.at(sgn, reach) + dx, y]);
      });
      // verticals spaced wider outward, as if the wall turned away
      for (let i = 0, d = d0; d < reach; i++, d = d0 + 0.7 * i ** 1.3) {
        const p = [];
        for (let y = Math.floor(c.ya) - 1; y <= c.yb + 1; y += 1) p.push(c.at(sgn, d + 0.35 * mf.bass * Math.sin(y * 0.6 + c.t * 3 + i)), y);
        c.line(al(cb, 0.35 + 0.4 * mf.kick), (i === 0 ? 0.08 : 0.035) * m, p);
      }
      // nodes sparking on the hats
      for (let j = 0; j < 10; j++) {
        if (c.rr(j * 7 + sgn) > 0.2 + 1.5 * mf.hat) continue;
        const y = (Math.floor(c.ya / step) + Math.floor(c.rr(j * 3 + sgn + 1) * (c.yb - c.ya) / step)) * step,
          d = d0 + 0.7 * Math.floor(c.rr(j * 5 + sgn) * 7) ** 1.3;
        c.b.dot(al('#ffffff', 0.9), c.X(c.at(sgn, d)), c.Y(y), 0.08 * m);
      }
    });
    c.b.flush();
    // faint horizon lines across the corridor, depth only
    c.each(step * 4, (k, y) => c.line(al(ca, 0.05 + 0.06 * mf.beat), 1, [c.at(-1, d0), y, c.at(1, d0), y]));
    c.done();
  },
  // SYNTH: a neon tunnel seen from its side: chevron rings pointing the way he goes, one lit after another on the beat,
  // all of them on the kick, smaller rings deeper behind, dots running round them on the hats
  tunnel(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { g, mf, vr, v2, m } = c,
      cols = pick([['#ff3df0', '#7d5dff'], ['#29e7ff', '#3d7dff'], ['#ff8a3d', '#ff3d8a'], ['#9dff3d', '#29e7ff']], vr),
      gap = 2.4 + 1.6 * v2,
      d0 = EDGE + 0.25,
      tip = 0.9 * -c.dir;
    c.sides(sgn => c.body('#06030f', sgn, d0 - 0.1));
    c.b.flush();
    g.globalCompositeOperation = 'lighter';
    // the far rings, half as wide, sliding slower behind
    c.layer(0.6, gap, (k, y) => {
      c.sides(sgn => c.line(al(cols[1], 0.15 + 0.15 * mf.bass), 0.04 * m, [c.at(sgn, c.reach(sgn)), y, c.at(sgn, d0 + 2.2), y, c.at(sgn, d0 + 1.2), y + tip * 0.5]));
    });
    c.each(gap, k => {
      const y = k * gap,
        on = (k * -c.dir + c.beatN + 800) % 4 === 0,
        a = (on ? 0.95 : 0.3) * (0.55 + 0.45 * mf.kick) + 0.25 * c.hot,
        col = cols[k & 1];
      c.sides(sgn => {
        const reach = c.reach(sgn);
        c.line(al(col, a), (on ? 0.12 : 0.06) * m * (1 + 0.5 * mf.kick), [c.at(sgn, reach), y, c.at(sgn, d0 + 0.8), y, c.at(sgn, d0), y + tip, c.at(sgn, d0 + 0.8), y + 2 * tip]);
        // dots running round the ring on the hats
        const u = (c.t * 0.8 + k * 0.37) % 1;
        c.b.dot(al('#ffffff', 0.4 + 0.6 * mf.hat * 2), c.X(c.at(sgn, d0 + 0.8 + u * (reach - d0))), c.Y(y), 0.07 * m);
      });
      // the ring's span across the corridor, very faint
      c.line(al(col, 0.05 + 0.08 * (on ? mf.beat : 0)), 1, [c.at(-1, d0 + 0.8), y + 2 * tip, c.at(1, d0 + 0.8), y + 2 * tip]);
    });
    c.b.flush();
    // the speed: streaks along the walls
    c.sides(sgn => c.each(0.7, (k, y) => {
      if (hash(k, sgn + 90) > 0.4) return;
      c.b.rect(al(cols[0], 0.25), c.X(c.at(sgn, d0 + 0.5 + 8 * hash(k, sgn + 91))), c.Y(y), c.v.dpr * 2, c.sl + 0.2 * m);
    }));
    c.done();
  },
  // SYNTH: open synth sky full of floating neon prisms at two depths, turning slowly, swinging on the bass, edges flaring
  // on the kick, their corners sparking on the hats and a glow behind the big ones on the voice
  prisms(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { g, mf, vr, v2, m } = c,
      n = 3 + Math.floor(vr * 3),
      cols = pick([['#ff3df0', '#29e7ff', '#ffe66a'], ['#7d5dff', '#3dffa8', '#ff8a3d'], ['#29e7ff', '#ffffff', '#ff6ad5']], v2),
      shape = (x, y, r, a0) => {
        const p = [];
        for (let i = 0; i < n; i++) p.push(x + r * Math.cos(a0 + (i * TAU) / n), y + r * Math.sin(a0 + (i * TAU) / n));
        return p;
      };
    g.globalCompositeOperation = 'lighter';
    for (const [par, step, big] of [[0.3, 1.3, 0.4], [0.6, 1.8, 0.65], [1, 2.4, 1]]) {
      c.layer(par, step, (k, y) => {
        c.sides(sgn => {
          const h = hash(k, sgn * 7 + par * 10),
            d = EDGE + 0.6 + (big + h * 6) * 1.0,
            r = (0.35 + 0.8 * hash(k, sgn + 3)) * big,
            col = cols[Math.floor(h * 30) % 3],
            spin = (hash(k, 4) < 0.5 ? 1 : -1) * (c.t * 0.4 + mf.bass * 0.5) + h * 6,
            x = c.at(sgn, d),
            yy = y + step * hash(k, sgn + 9),
            p = shape(x, yy, r, spin);
          if (big === 1 && h < 0.4) c.halo(x, yy, r * 2.5, col, 0.15 + 0.4 * mf.voice);
          c.poly(al(col, 0.08 + 0.1 * mf.bass), p);
          c.line(al(col, (0.35 + 0.6 * (h < 0.5 ? mf.kick : mf.snare)) * big + 0.2 * c.hot), 0.05 * m * big, [...p, p[0], p[1]]);
          if (c.rr(k * 3 + sgn) < 0.1 + mf.hat) c.b.dot(al('#ffffff', 0.9), c.X(p[0]), c.Y(p[1]), 0.06 * m);
        });
      });
    }
    c.b.flush();
    c.done();
  },

  // FOREST: two cliff faces of layered rock, mossy ledges, roots swinging on the bass, ferns, pebbles knocked loose on
  // the kick, fireflies glowing with the voice and twinkling on the hats
  cliff(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { mf, T, vr, v2, dk, m } = c,
      rock = mix(pick(['#4a4038', '#2d3a34', '#3c3a4a'], vr), T.near, 0.35 + 0.3 * dk),
      dark = mix(rock, '#000000', 0.35),
      moss = pick(['#4f8a3a', '#3a8a6a', '#7a8a3a'], v2);
    c.sides(sgn => {
      c.poly(rock, cragPts(c, sgn, EDGE + 0.6 + 0.5 * v2, 0.8, sgn + 3));
    });
    c.b.flush();
    c.sides(sgn => {
      const reach = c.reach(sgn);
      // strata cracks
      c.each(1.3, (k, y) => {
        const d = EDGE + 1 + 1.5 * hash(k, sgn);
        c.line(dark, 0.06 * m, [c.at(sgn, d), y, c.at(sgn, d + 2), y + 0.3 * (hash(k, 4) - 0.5), c.at(sgn, reach), y + 0.2]);
      });
      // ledges with moss, a root hanging from each, ferns
      c.each(2.6, (k, y) => {
        const d = EDGE + 0.6 + 0.5 * v2 + 0.8 * noise(y * 0.7, sgn + 3),
          x = c.at(sgn, d);
        c.poly(al(moss, 0.85), [x, y, c.at(sgn, d + 1.4), y, c.at(sgn, d + 1.2), y + 0.25, x, y + 0.15]);
        const sway = 0.25 * Math.sin(c.t * 1.5 + k) + 0.3 * mf.bass * Math.sin(c.t * 4 + k);
        c.line(al('#2a2016', 0.9), 0.04 * m, [c.at(sgn, d + 0.3), y, c.at(sgn, d + 0.2) - sgn * sway * 0.5, y - 0.8, c.at(sgn, d + 0.1) - sgn * sway, y - 1.5]);
        for (let j = 0; j < 3; j++) c.line(al(moss, 0.7), 0.03 * m, [c.at(sgn, d + 0.8 + j * 0.2), y + 0.2, c.at(sgn, d + 0.5 + j * 0.35), y + 0.6 + 0.1 * mf.bass]);
        if (hash(k, sgn + 30) < mf.kick * 0.7) c.rect(al('#9a8a78', 0.8), c.at(sgn, d + 0.1), y - 0.4 - mf.kick, c.at(sgn, d + 0.25), y - 0.25 - mf.kick);
      });
      // fireflies hovering off the rock
      c.each(1.1, (k, y) => {
        if (hash(k, sgn + 50) > 0.45) return;
        const x = c.at(sgn, EDGE + 1 + 6 * hash(k, sgn + 51)) + 0.3 * Math.sin(c.t * 1.3 + k),
          yy = y + 0.4 * Math.cos(c.t + k),
          a = 0.35 + 0.5 * mf.voice + (c.rr(k + sgn) < mf.hat * 1.5 ? 0.4 : 0);
        c.halo(x, yy, 0.35, '#c8ff6a', a * 0.7);
        c.b.dot(al('#e8ff9a', a), c.X(x), c.Y(yy), 0.04 * m);
      });
    });
    c.done();
  },
  // FOREST: a waterfall pouring down one side past him, its streaks falling faster than he does, foam bursting on the
  // kick and spray sparkling on the hats, mist breathing on the bass; wet mossy rock on the other side
  waterfall(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { mf, T, vr, v2, dk, m } = c,
      ws = vr < 0.5 ? -1 : 1,
      water = mix(pick(['#3ac8d8', '#6aa8ff', '#9ad8c8'], v2), T.near, 0.25 + 0.3 * dk),
      rock = mix('#2a3430', T.near, 0.4),
      d0 = EDGE + 0.4,
      w = 3.2 + 1.5 * c.v3 + 0.3 * mf.bass;
    c.sides(sgn => c.poly(rock, cragPts(c, sgn, sgn === ws ? d0 + w : d0 + 0.3, 0.6, sgn + 11)));
    c.b.flush();
    // the sheet of water
    c.rect(al(water, 0.55), c.at(ws, d0), c.ya, c.at(ws, d0 + w), c.yb);
    c.rect(al('#ffffff', 0.08 + 0.15 * mf.bass), c.at(ws, d0), c.ya, c.at(ws, d0 + 0.25), c.yb);
    const fallV = 9;
    for (let i = 0; i < 26; i++) {
      const d = d0 + (w * (i + 0.5)) / 26,
        ph = hash(i, 3) * 40,
        len = 1.2 + 1.5 * hash(i, 4);
      // each column's streaks fall with the water (world y moves down at fallV)
      for (let y0 = Math.floor((c.ya + c.t * fallV + ph) / 3) * 3; y0 - c.t * fallV - ph < c.yb; y0 += 3) {
        const y = y0 - c.t * fallV - ph;
        c.line(al(i % 3 ? '#e8ffff' : water, 0.35 + 0.3 * hash(i, y0)), 0.05 * m, [c.at(ws, d), y, c.at(ws, d), y + len]);
      }
    }
    c.b.flush();
    // foam on the kick, spray on the hats, mist at the edge
    c.each(1.6, (k, y) => {
      c.halo(c.at(ws, d0 - 0.2), y, 1.2 + 0.8 * mf.bass, '#e8ffff', 0.08 + 0.12 * mf.bass);
      if (hash(k, 9) < 0.3 + mf.kick) c.b.dot(al('#ffffff', 0.25 + 0.7 * mf.kick), c.X(c.at(ws, d0 + w * hash(k, 10))), c.Y(y), (0.12 + 0.25 * mf.kick) * m);
      if (c.rr(k) < mf.hat * 2) c.b.dot(al('#ffffff', 0.9), c.X(c.at(ws, d0 - 0.3 - 0.5 * c.rr(k + 1))), c.Y(y + c.rr(k + 2)), 0.04 * m);
    });
    // moss and a trickle on the dry side
    c.each(2.2, (k, y) => {
      const d = d0 + 0.3 + 0.6 * noise(y * 0.7, -ws + 11);
      c.poly(al('#3f7a3a', 0.85), [c.at(-ws, d), y, c.at(-ws, d + 1.1), y, c.at(-ws, d + 0.9), y + 0.2]);
      if (hash(k, 77) < 0.3) c.line(al(water, 0.5 + 0.3 * mf.snare), 0.04 * m, [c.at(-ws, d + 0.2), y, c.at(-ws, d + 0.2), y - 2]);
    });
    void T;
    c.done();
  },
  // FOREST: a giant tree's trunk each side, bark ridges, branches going off with leaves swinging on the bass, glowing
  // shelf mushrooms lighting on the kick, an owl's eyes blinking open on the snare, vines hanging
  trunk(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { mf, T, vr, v2, dk, m } = c,
      bark = mix(pick(['#4a3424', '#3a3a2c', '#523a30'], vr), T.near, 0.3 + 0.35 * dk),
      ridge = mix(bark, '#000000', 0.45),
      shroom = pick(['#6afff0', '#c86aff', '#9aff6a', '#ff9a6a'], v2),
      leaf = mix('#2f6a34', T.near, 0.3),
      d0 = EDGE + 0.3 + 0.5 * c.v3;
    c.sides(sgn => c.poly(bark, cragPts(c, sgn, d0 + 0.3, 0.25, sgn + 21, 1)));
    c.b.flush();
    c.sides(sgn => {
      const reach = c.reach(sgn);
      // ridges down the bark, wandering
      for (let i = 0; d0 + 0.6 + i * 0.7 < reach; i++) {
        const p = [];
        for (let y = Math.floor(c.ya) - 1; y <= c.yb + 1; y += 1) p.push(c.at(sgn, d0 + 0.6 + i * 0.7 + 0.15 * noise(y * 0.5 + i * 3, 5)), y);
        c.line(ridge, 0.06 * m, p);
      }
      // branches going out and up, leaves on them
      c.each(4.5, (k, y) => {
        if (hash(k, sgn + 2) < 0.3) return;
        const d = d0 + 1.5 + 3 * hash(k, sgn + 3),
          sw = 0.2 * Math.sin(c.t * 1.2 + k) + 0.25 * mf.bass;
        c.line(ridge, 0.18 * m, [c.at(sgn, d), y, c.at(sgn, d + 1.5), y + 0.9, c.at(sgn, d + 3), y + 1.4 + sw]);
        for (let j = 0; j < 4; j++) c.b.dot(al(leaf, 0.9), c.X(c.at(sgn, d + 1.6 + j * 0.5)), c.Y(y + 1.2 + sw * (j / 3) + 0.3 * hash(k, j)), (0.35 + 0.2 * hash(j, k)) * m);
      });
      // shelf mushrooms up the inner edge
      c.each(1.7, (k, y) => {
        if (hash(k, sgn + 9) < 0.35) return;
        const x = c.at(sgn, d0 + 0.3 + 0.3 * hash(k, sgn + 10)),
          on = (k + c.beatN) % 3 === 0 ? mf.kick : 0.2 * mf.kick,
          r = 0.18 + 0.15 * hash(k, 11);
        c.halo(x, y, 0.8, shroom, 0.12 + 0.5 * on);
        c.poly(al(shroom, 0.35 + 0.6 * on + 0.2 * c.hot), [x, y, c.at(sgn, d0 + 0.3 + 0.3 * hash(k, sgn + 10) - r * 2), y, x - sgn * r * m * 0, y + r]);
      });
      // an owl in a knothole, its eyes open on the snare
      c.each(8, (k, y) => {
        const d = d0 + 2.5 + 2 * hash(k, sgn + 40),
          yy = y + 4 * hash(k, sgn + 41);
        c.b.dot('#120c08', c.X(c.at(sgn, d)), c.Y(yy), 0.4 * m);
        const e = 0.25 + 0.75 * mf.snare;
        c.rect(al('#ffe9a0', 0.3 + 0.7 * mf.snare), c.at(sgn, d - 0.18), yy - 0.03 * e, c.at(sgn, d - 0.06), yy + 0.06 * e);
        c.rect(al('#ffe9a0', 0.3 + 0.7 * mf.snare), c.at(sgn, d + 0.06), yy - 0.03 * e, c.at(sgn, d + 0.18), yy + 0.06 * e);
      });
      // vines off the inner edge
      c.each(3.1, (k, y) => {
        const sw = 0.2 * Math.sin(c.t * 2 + k * 2) + 0.2 * mf.bass;
        c.line(al('#4f8a3a', 0.8), 0.035 * m, [c.at(sgn, d0 + 0.3), y, c.at(sgn, d0 + 0.1 - sw), y - 1, c.at(sgn, d0 - 0.1 - sw), y - 1.8]);
      });
    });
    c.done();
  },

  // DESERT: a slot canyon's banded sandstone, its walls waving in and out, heat shimmering them on the bass, a shaft of
  // sun down it glowing with the voice, dust puffing off the ledges on the kick and grains trickling on the hats
  canyon(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { mf, T, vr, v2, dk, m } = c,
      bands = pick([['#c4683a', '#d98a4e', '#a8502e', '#e0a066', '#8a4a30'], ['#b0705a', '#d8a080', '#8a5048', '#c88a6a', '#704038'], ['#c89a5a', '#e0c08a', '#a07040', '#d8a868', '#80583a']], vr).map(h => mix(mix(h, T.near, 0.25), '#140a10', 0.3 + 0.4 * dk)),
      bh = 0.7 + 0.5 * v2,
      edgeAt = (sgn, y) => EDGE + 0.9 + 0.7 * Math.sin(y * 0.33 + sgn * 2 + vr * 9) + 0.3 * Math.sin(y * 1.1 + sgn) + 0.12 * mf.bass * Math.sin(y * 3 + c.t * 8);
    c.sides(sgn => {
      const out = sgn < 0 ? c.xl : c.xr;
      c.each(bh, (k, y) => {
        const yb = y + bh;
        c.poly(bands[mod(k, 5)], [c.at(sgn, edgeAt(sgn, y)), y, c.at(sgn, edgeAt(sgn, (y + yb) / 2) - 0.1 * hash(k, 3)), (y + yb) / 2, c.at(sgn, edgeAt(sgn, yb)), yb, out, yb, out, y]);
      });
    });
    c.b.flush();
    c.sides(sgn => {
      // the lit lip of each wave and dust off it on the kick
      c.each(bh, (k, y) => {
        c.line(al('#ffe0b0', 0.08 + 0.2 * mf.voice + 0.2 * mf.kick), 0.04 * m, [c.at(sgn, edgeAt(sgn, y)), y, c.at(sgn, edgeAt(sgn, y) + 1.5), y + 0.05]);
        if (hash(k, sgn + 4) < 0.25 && mf.kick > 0.2) c.halo(c.at(sgn, edgeAt(sgn, y) - 0.2), y, 0.6 + mf.kick, '#e8c090', 0.3 * mf.kick);
        if (c.rr(k * 5 + sgn) < mf.hat * 1.2) c.line(al('#f0d0a0', 0.7), 0.03 * m, [c.at(sgn, edgeAt(sgn, y) - 0.05), y, c.at(sgn, edgeAt(sgn, y) - 0.05), y - 0.5]);
      });
    });
    // the shaft of sun slanting down across, faint over the corridor
    c.layer(0.3, 18, (k, y) => {
      c.poly(al('#ffe8c0', 0.04 + 0.1 * mf.voice + 0.05 * c.hot), [c.at(-1, 9), y + 6, c.at(-1, 6), y + 6, c.at(1, 9), y - 6, c.at(1, 12), y - 6]);
    });
    void T;
    c.done();
  },
  // DESERT: a buried temple's walls: courses of sandstone blocks, carved columns, rows of glyphs lighting one after
  // another on the beat, torches flaring on the hats, the statues' eyes glowing with the voice
  ruins(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { mf, T, vr, v2, dk, m } = c,
      stone = mix(pick(['#b08a5a', '#9a8070', '#a89878'], vr), T.near, 0.35 + 0.35 * dk),
      joint = mix(stone, '#000000', 0.4),
      glyph = pick(['#3dffe0', '#5a8aff', '#5aff8a', '#ff8a5a'], v2),
      d0 = EDGE + 0.3;
    c.sides(sgn => c.body(stone, sgn, d0));
    c.b.flush();
    c.sides(sgn => {
      const reach = c.reach(sgn),
        out = sgn < 0 ? c.xl : c.xr;
      // courses of blocks
      c.each(0.6, (k, y) => {
        c.line(joint, 0.04 * m, [c.at(sgn, d0), y, out, y]);
        for (let d = d0 + (k & 1 ? 0.6 : 0); d < reach; d += 1.2) c.line(joint, 0.03 * m, [c.at(sgn, d), y, c.at(sgn, d), y + 0.6]);
      });
      c.z(1);
      // a column at the inner edge with its capital every 6 m
      c.rect(mix(stone, '#ffffff', 0.08), c.at(sgn, d0), c.ya, c.at(sgn, d0 + 0.9), c.yb);
      for (let j = 1; j < 4; j++) c.rect(al(joint, 0.6), c.at(sgn, d0 + j * 0.22), c.ya, c.at(sgn, d0 + j * 0.22 + 0.04), c.yb);
      c.each(6, (k, y) => {
        c.z(2);
        c.rect(mix(stone, '#ffffff', 0.12), c.at(sgn, d0 - 0.1), y, c.at(sgn, d0 + 1.1), y + 0.35);
        // a torch on the column, its flame flickering on the hats
        const fx = c.at(sgn, d0 + 1.3),
          fl = 0.3 + 0.25 * c.rr(k * 3 + sgn) * (0.5 + mf.hat * 2);
        c.rect('#2a1a10', fx - 0.05, y + 2.2, fx + 0.05, y + 2.8);
        c.halo(fx, y + 3, 1.3, '#ff9a3d', 0.25 + 0.4 * mf.hat + 0.2 * mf.kick);
        c.z(3);
        c.poly(al('#ffb04a', 0.9), [fx - 0.13, y + 2.8, fx + 0.13, y + 2.8, fx + 0.03 * Math.sin(c.t * 20), y + 2.8 + fl]);
        c.poly(al('#fff0b0', 0.9), [fx - 0.06, y + 2.8, fx + 0.06, y + 2.8, fx, y + 2.8 + fl * 0.5]);
      });
      // glyph panels: rows of carved signs lit in turn on the beat
      c.each(3, (k, y) => {
        if (hash(k, sgn + 60) < 0.3) return;
        const d = d0 + 2 + 2.5 * hash(k, sgn + 61),
          row = (k * -c.dir + c.beatN + 300) % 3 === 0;
        c.z(1);
        c.rect(al('#000000', 0.25), c.at(sgn, d - 0.1), y + 0.4, c.at(sgn, d + 2.5), y + 2.2);
        c.z(2);
        for (let j = 0; j < 8; j++) {
          const gx = d + (j % 4) * 0.6,
            gy = y + 0.6 + Math.floor(j / 4) * 0.8,
            h = hash(k * 8 + j, sgn),
            a = row ? 0.5 + 0.5 * mf.kick : 0.12 + 0.2 * mf.voice;
          if (h < 0.33) c.b.ring(al(glyph, a), 0.04 * m, c.X(c.at(sgn, gx + 0.2)), c.Y(gy + 0.25), 0.18 * m);
          else if (h < 0.66) c.line(al(glyph, a), 0.05 * m, [c.at(sgn, gx), gy, c.at(sgn, gx + 0.2), gy + 0.5, c.at(sgn, gx + 0.4), gy]);
          else c.line(al(glyph, a), 0.05 * m, [c.at(sgn, gx), gy + 0.5, c.at(sgn, gx + 0.4), gy + 0.5, c.at(sgn, gx + 0.2), gy + 0.5, c.at(sgn, gx + 0.2), gy]);
        }
      });
      // a statue's face far out, its eyes on the voice
      c.each(11, (k, y) => {
        const d = d0 + 5.5,
          yy = y + 5;
        c.z(1);
        c.poly(al(joint, 0.7), [c.at(sgn, d), yy - 1.5, c.at(sgn, d + 2), yy - 1.5, c.at(sgn, d + 2.2), yy + 1.2, c.at(sgn, d + 1), yy + 1.8, c.at(sgn, d - 0.2), yy + 1.2]);
        c.z(2);
        for (const e of [0.6, 1.4]) c.b.dot(al(glyph, 0.2 + 0.8 * mf.voice + 0.3 * c.hot), c.X(c.at(sgn, d + e)), c.Y(yy + 0.5), 0.12 * m);
      });
    });
    c.done();
  },
  // DESERT: open air between dune ledges: soft lobes of sand with lit crests, sandfalls pouring off their lips, wind
  // streaks combing across on the bass, sparkles on the hats, the lobes' crests flashing on the kick
  dunes(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { mf, T, vr, v2, dk, m } = c,
      night = vr > 0.75,
      sand = mix(night ? '#4a5a8a' : pick(['#e0b07a', '#d89060'], v2), T.near, 0.3 + 0.35 * dk),
      shade = mix(sand, '#000000', 0.3),
      crest = night ? '#bcd0ff' : '#fff0c8',
      gap = 3.5 + 1.5 * v2;
    c.sides(sgn => {
      const out = sgn < 0 ? c.xl : c.xr;
      c.each(gap, (k, y) => {
        const d = EDGE + 0.5 + 1.2 * hash(k, sgn + 3),
          p = [];
        for (let j = 0; j <= 8; j++) {
          const u = j / 8;
          p.push(c.at(sgn, d + 1.8 * (1 - u) ** 2), y + u * gap);
        }
        p.push(c.at(sgn, d + 0.6), y + gap + 0.15);
        p.push(out, y + gap + 0.15, out, y);
        c.poly(k & 1 ? sand : shade, p);
      });
    });
    c.b.flush();
    c.sides(sgn => {
      c.each(gap, (k, y) => {
        const d = EDGE + 0.5 + 1.2 * hash(k, sgn + 3),
          top = y + gap;
        c.line(al(crest, 0.3 + 0.6 * mf.kick * (k % 2) + 0.2 * c.hot), 0.05 * m, [c.at(sgn, d + 1.2), top, c.at(sgn, d + 4), top - 0.2, c.at(sgn, d + 8), top]);
        // wind ripples down the lobe
        for (let r = 1; r < 4; r++) {
          const ry = y + (r * gap) / 4,
            rd = d + 1.8 * (1 - r / 4) ** 2 + 0.3;
          c.line(al(r & 1 ? crest : '#000000', 0.12 + 0.1 * mf.bass), 0.035 * m, [c.at(sgn, rd), ry, c.at(sgn, rd + 2), ry + 0.25, c.at(sgn, rd + 4), ry - 0.1, c.at(sgn, rd + 7), ry + 0.15]);
        }
        // a sandfall pouring off the lip
        if (hash(k, sgn + 7) < 0.6) {
          const sx = c.at(sgn, d + 0.2 + 0.4 * hash(k, 8));
          c.rect(al(crest, 0.25), sx - 0.06, y - 1.5, sx + 0.06, top);
          for (let j = 0; j < 4; j++) {
            const yy = top - ((c.t * 6 + j * 1.3 + k) % 5);
            c.rect(al(crest, 0.5), sx - 0.04, yy, sx + 0.04, yy + 0.5);
          }
        }
        if (c.rr(k + sgn * 9) < mf.hat * 2) c.b.dot(al('#ffffff', 0.9), c.X(c.at(sgn, d + 2 + 4 * c.rr(k + 1))), c.Y(y + gap * c.rr(k + 2)), 0.05 * m);
      });
      // wind streaks combing outward on the bass
      c.each(1.2, (k, y) => {
        if (hash(k, sgn + 30) > 0.4) return;
        const u = (c.t * (0.4 + mf.bass) + hash(k, 31)) % 1,
          d = EDGE + 1 + u * 8;
        c.line(al(crest, 0.15 + 0.35 * mf.bass), 0.03 * m, [c.at(sgn, d), y, c.at(sgn, d + 1.2 + mf.bass), y + 0.1]);
      });
    });
    c.done();
  },

  // STATION: a reactor's core walls: coolant tubes glowing with the bass, energy packets racing along them, clamp rings
  // slamming bright on the snare, arcs crackling between them on the hats, the whole core flashing on the kick
  reactor(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { g, mf, T, vr, v2, dk, m } = c,
      core = pick(['#3dffe0', '#7dff5a', '#a66aff', '#5ab0ff'], vr),
      metal = mix('#1a2028', T.near, 0.3 + 0.3 * dk),
      d0 = EDGE + 0.3,
      tubes = [0.5, 2.2 + 0.6 * v2, 4.6 + v2];
    c.sides(sgn => c.body(metal, sgn, d0));
    c.b.flush();
    c.sides(sgn => {
      for (const [i, d] of tubes.entries()) {
        const w = i === 1 ? 1.1 : 0.7;
        c.rect('#0b0f14', c.at(sgn, d0 + d - 0.12), c.ya, c.at(sgn, d0 + d + w + 0.12), c.yb);
        c.rect(al(core, 0.2 + 0.35 * mf.bass + 0.3 * mf.kick + 0.15 * c.hot), c.at(sgn, d0 + d), c.ya, c.at(sgn, d0 + d + w), c.yb);
        c.rect(al('#ffffff', 0.25 + 0.5 * mf.kick), c.at(sgn, d0 + d + w * 0.42), c.ya, c.at(sgn, d0 + d + w * 0.58), c.yb);
      }
    });
    c.b.flush();
    g.globalCompositeOperation = 'lighter';
    c.sides(sgn => {
      // packets racing against his way
      for (const [i, d] of tubes.entries()) {
        const w = i === 1 ? 1.1 : 0.7;
        const off = -c.t * 14 * c.dir + i * 3;
        for (let y0 = Math.floor((c.ya - off) / 4) * 4; y0 + off < c.yb + 4; y0 += 4) {
          const y = y0 + off;
          c.rect(al('#ffffff', 0.25 + 0.45 * mf.beat), c.at(sgn, d0 + d + w * 0.2), y, c.at(sgn, d0 + d + w * 0.8), y + 0.4 + (0.3 * c.sl) / m);
        }
      }
      // clamp rings
      c.each(2.4, (k, y) => {
        c.rect(al('#6a7a8a', 0.3 + 0.5 * mf.snare), c.at(sgn, d0), y, sgn < 0 ? c.xl : c.xr, y + 0.18);
        if (c.rr(k * 3 + sgn) < mf.hat * 1.5) {
          const d = d0 + 1 + 4 * c.rr(k + 7);
          c.line(al(core, 0.9), 0.03 * m, [c.at(sgn, d), y + 0.25, c.at(sgn, d + 0.3), y + 0.9, c.at(sgn, d - 0.2), y + 1.4, c.at(sgn, d + 0.2), y + 2.4]);
        }
      });
      c.each(3.3, (k, y) => c.halo(c.at(sgn, d0 + tubes[1] + 0.55), y, 1.6, core, 0.15 + 0.35 * mf.bass));
      // the inner edge's hazard ladder of lights chasing the beat
      c.each(0.8, k => {
        const on = (k * -c.dir + c.beatN * 2 + 900) % 6 === 0;
        c.rect(al(on ? '#ffffff' : core, on ? 0.9 : 0.3), c.at(sgn, d0 + 0.05), k * 0.8, c.at(sgn, d0 + 0.2), k * 0.8 + 0.4);
      });
    });
    c.done();
  },
  // STATION: the hull's inside: plates and seams, riveted frames, conduits, status lights blinking on the kick, vents
  // puffing on the snare, a hazard band at the inner edge, deeper decks colder
  hull(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { mf, T, vr, v2, dk, m } = c,
      plate = mix(pick(['#3a4450', '#4a4a52', '#38463e'], vr), T.near, 0.25 + 0.4 * dk),
      seam = mix(plate, '#000000', 0.5),
      lite = mix(plate, '#ffffff', 0.08),
      led = pick([['#5affc8', '#5ac8ff'], ['#ffb05a', '#5affc8'], ['#c87dff', '#5ac8ff']], v2),
      pw = 1.6,
      ph = 1.2,
      d0 = EDGE + 0.3;
    c.sides(sgn => c.body(plate, sgn, d0));
    c.b.flush();
    c.sides(sgn => {
      const reach = c.reach(sgn),
        out = sgn < 0 ? c.xl : c.xr;
      c.each(ph, (k, y) => {
        c.line(seam, 0.05 * m, [c.at(sgn, d0), y, out, y]);
        for (let i = 0; d0 + i * pw < reach; i++) {
          const x = c.at(sgn, d0 + i * pw + (k & 1 ? pw / 2 : 0));
          c.line(seam, 0.04 * m, [x, y, x, y + ph]);
          if (hash(k * 9 + i, sgn) < 0.25) c.rect(lite, x + sgn * 0.1, y + 0.1, x + sgn * (pw - 0.1), y + ph - 0.1);
        }
      });
      c.z(1);
      // a conduit pair with brackets
      c.rect('#1a1e24', c.at(sgn, d0 + 3.2), c.ya, c.at(sgn, d0 + 3.6), c.yb);
      c.rect('#20262e', c.at(sgn, d0 + 3.75), c.ya, c.at(sgn, d0 + 3.95), c.yb);
      c.z(2);
      c.each(1.5, (k, y) => c.rect('#5a6470', c.at(sgn, d0 + 3.1), y, c.at(sgn, d0 + 4.05), y + 0.12));
      // status lights in rows of 6
      c.each(2.4, (k, y) => {
        const d = d0 + 1;
        for (let j = 0; j < 6; j++) {
          const on = hash(k * 6 + j, sgn + Math.floor(c.t * 2)) < 0.3 + 0.6 * mf.kick;
          c.rect(al(led[j % 2], on ? 0.95 : 0.15), c.at(sgn, d + j * 0.28), y + 0.5, c.at(sgn, d + j * 0.28 + 0.16), y + 0.6);
        }
      });
      // vents puffing on the snare
      c.each(5, (k, y) => {
        const d = d0 + 5 + 2 * hash(k, sgn);
        for (let j = 0; j < 4; j++) c.rect('#0e1216', c.at(sgn, d), y + 1 + j * 0.2, c.at(sgn, d + 1.2), y + 1.1 + j * 0.2);
        if (mf.snare > 0.1) c.halo(c.at(sgn, d + 0.6), y + 1.4, 0.8 + 1.5 * mf.snare, '#dfe8f0', 0.5 * mf.snare);
      });
      c.z(3);
      // the hazard band at the inner edge
      c.rect('#14161a', c.at(sgn, d0), c.ya, c.at(sgn, d0 + 0.35), c.yb);
      c.z(4);
      c.each(0.6, (k, y) => c.poly(al(led[0], 0.35 + 0.4 * mf.beat), [c.at(sgn, d0), y, c.at(sgn, d0 + 0.35), y + 0.25, c.at(sgn, d0 + 0.35), y + 0.45, c.at(sgn, d0), y + 0.2]));
    });
    c.done();
  },
  // STATION: windows out into space: struts and frames round big panes, stars drifting slow behind, a ringed planet
  // swelling with the voice, a nebula breathing on the bass, the frames' running lights chasing the beat
  window(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { mf, T, vr, v2, dk, m } = c,
      frame = mix('#2a3038', T.near, 0.3 + 0.3 * dk),
      neb = pick(['#7d4dff', '#ff4da6', '#2ad8ff', '#4dff9a'], vr),
      planet = pick(['#d8885a', '#5aa8d8', '#a8d88a', '#c8a0e8'], v2),
      d0 = EDGE + 0.5,
      pane = 3.4;
    c.sides(sgn => c.body('#02030a', sgn, d0));
    c.b.flush();
    // the nebula and the planet far off, almost still on screen (drifting a little as he passes), each on its side
    const vc = c.v.y + c.v.vh / 2,
      drift = -0.06 * (vc - (c.lo + c.hi) / 2),
      ps = c.v3 < 0.5 ? -1 : 1;
    c.halo(c.at(-ps, 6.5), vc + 2.5 + drift, 6 + 1.5 * mf.bass, neb, 0.25 + 0.3 * mf.bass);
    c.halo(c.at(-ps, 8), vc - 3 + drift * 1.3, 4 + mf.bass, neb, 0.15 + 0.2 * mf.bass);
    const px = c.at(ps, 6.8),
      py = vc + 1.2 + drift,
      r = 1.9 * (1 + 0.04 * mf.voice);
    c.halo(px, py, r * 2, planet, 0.25 + 0.4 * mf.voice);
    c.b.dot(planet, c.X(px), c.Y(py), r * m);
    c.b.dot(al('#000000', 0.4), c.X(px - ps * 0.6), c.Y(py - 0.4), r * 0.92 * m);
    c.b.flush();
    c.g.strokeStyle = al('#e8e0d0', 0.45 + 0.3 * mf.voice);
    c.g.lineWidth = 0.08 * m;
    c.g.beginPath();
    c.g.ellipse(c.X(px), c.Y(py), r * 1.9 * m, r * 0.38 * m, -0.3 * ps, 0, TAU);
    c.g.stroke();
    // the stars, slow
    c.layer(0.15, 0.3, (k, y) => {
      c.sides(sgn => {
        const h = hash(k, sgn + 5);
        c.b.rect(al('#ffffff', 0.3 + 0.6 * h * (c.rr(k + sgn) < mf.hat ? 1.5 : 1)), c.X(c.at(sgn, d0 + 8 * hash(k, sgn + 6))), c.Y(y), (1 + (h > 0.85 ? 1 : 0)) * c.v.dpr, (1 + (h > 0.85 ? 1 : 0)) * c.v.dpr + c.sl * 0.15);
      });
    });
    c.b.flush();
    c.sides(sgn => {
      const reach = c.reach(sgn),
        out = sgn < 0 ? c.xl : c.xr;
      // the inner frame and the bulkhead between panes
      c.rect(frame, c.at(sgn, d0 - 0.2), c.ya, c.at(sgn, d0 + 0.5), c.yb);
      c.each(pane, (k, y) => {
        c.z(0);
        c.rect(frame, c.at(sgn, d0), y, out, y + 0.45);
        for (let d = d0 + 3.2; d < reach; d += 3.2) c.rect(frame, c.at(sgn, d), y, c.at(sgn, d + 0.25), y + pane);
        c.z(1);
        // running lights along the bulkhead, chasing the beat
        for (let j = 0; j < 8; j++) {
          const on = (j + c.beatN + k) % 4 === 0;
          c.rect(al(on ? '#ffffff' : neb, on ? 0.9 * (0.5 + 0.5 * mf.kick) : 0.25), c.at(sgn, d0 + 0.6 + j * 1.1), y + 0.18, c.at(sgn, d0 + 0.85 + j * 1.1), y + 0.27);
        }
        c.line(al('#ffffff', 0.06 + 0.1 * mf.voice), 0.05 * m, [c.at(sgn, d0 + 0.7), y + 0.6, c.at(sgn, d0 + 2), y + pane - 0.3]);
      });
      c.z(2);
      c.rect(al(neb, 0.4 + 0.5 * mf.snare), c.at(sgn, d0 + 0.45), c.ya, c.at(sgn, d0 + 0.5), c.yb);
    });
    c.done();
  },

  // FACTORY: an open elevator shaft: girders braced in X, a counterweight sliding the other way on its cables, landings
  // with a lamp that strikes on the kick, the cage rattling on the snare
  elevator(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { mf, T, vr, v2, dk, m } = c,
      paint = mix(pick(['#c86a28', '#2a8a8a', '#5a6a8a', '#8a8a3a'], vr), T.near, 0.3 + 0.35 * dk),
      back = mix(T.near, '#000000', 0.5 + 0.3 * dk),
      shake = (c.rr(1) - 0.5) * 0.12 * mf.snare,
      d0 = EDGE + 0.3,
      rail2 = d0 + 2.6 + 0.8 * v2;
    c.sides(sgn => c.body(back, sgn, d0));
    c.b.flush();
    // the far lattice behind, slower
    c.layer(0.55, 2, (k, y) => {
      c.sides(sgn => c.line(al(T.far, 0.6), 0.03 * m, [c.at(sgn, d0 + 1), y, c.at(sgn, c.reach(sgn)), y + 2]));
    });
    c.sides(sgn => {
      const x0 = c.at(sgn, d0) + shake,
        x1 = c.at(sgn, rail2) + shake,
        out = sgn < 0 ? c.xl : c.xr;
      c.rect(paint, x0, c.ya, x0 + sgn * 0.3, c.yb);
      c.rect(paint, x1, c.ya, x1 + sgn * 0.3, c.yb);
      c.each(2, (k, y) => {
        c.line(paint, 0.07 * m, [x0, y, x1, y + 2]);
        c.line(paint, 0.07 * m, [x1, y, x0, y + 2]);
        c.rect(mix(paint, '#000000', 0.3), x0, y - 0.06, x1 + sgn * 0.3, y + 0.06);
      });
      // cables and a counterweight sliding opposite to him
      const cw = c.at(sgn, rail2 + 1.4),
        wy = c.v.y + c.v.vh * (0.5 + 0.35 * Math.sin(c.t * 0.9 + sgn));
      c.line(al('#c8ccd0', 0.6), 0.03 * m, [cw - 0.2, c.ya, cw - 0.2, c.yb]);
      c.line(al('#c8ccd0', 0.6), 0.03 * m, [cw + 0.2, c.ya, cw + 0.2, c.yb]);
      c.z(1);
      c.rect('#2a2c30', cw - 0.5, wy - 1.2, cw + 0.5, wy + 1.2);
      c.rect(al('#e8e0c0', 0.5), cw - 0.5, wy + 0.9, cw + 0.5, wy + 1.0);
      c.z(2);
      // landings with a lamp and a stripe
      c.each(6, (k, y) => {
        c.z(2);
        c.rect(mix(paint, '#ffffff', 0.1), x0, y, out, y + 0.35);
        c.z(3);
        for (let j = 0; j < 6; j++) c.poly(al('#101010', 0.8), [c.at(sgn, d0 + j * 0.5), y, c.at(sgn, d0 + j * 0.5 + 0.25), y, c.at(sgn, d0 + j * 0.5 + 0.45), y + 0.35, c.at(sgn, d0 + j * 0.5 + 0.2), y + 0.35]);
        const lx = c.at(sgn, rail2 - 0.6),
          on = (k + c.beatN) % 2 === 0 ? mf.kick : 0.3 * mf.kick;
        c.halo(lx, y - 0.3, 1.2 + on, '#ffd8a0', 0.15 + 0.6 * on);
        c.z(4);
        c.b.dot(al('#fff0d0', 0.4 + 0.6 * on), c.X(lx), c.Y(y - 0.2), 0.12 * m);
      });
    });
    c.done();
  },
  // FACTORY: furnace walls of soot-black brick, furnace mouths breathing with the bass and flaring on the kick, molten
  // drips sliding from their lips, sparks rising on the hats
  furnace(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { mf, T, vr, v2, dk, m } = c,
      heat = pick([['#ff7a1a', '#ffd08a'], ['#5ac8ff', '#e8f8ff'], ['#8aff3a', '#e8ffb0'], ['#b06aff', '#f0d8ff']], vr),
      brick = mix(pick(['#3a2420', '#2c2a28', '#3a2a30'], v2), T.near, 0.3 + 0.3 * dk),
      mortar = mix(brick, '#000000', 0.5),
      d0 = EDGE + 0.3,
      gap = 4.5 + 1.5 * c.v3;
    c.sides(sgn => c.body(brick, sgn, d0));
    c.b.flush();
    c.sides(sgn => {
      const reach = c.reach(sgn),
        out = sgn < 0 ? c.xl : c.xr;
      c.each(0.35, (k, y) => {
        c.line(mortar, 0.04 * m, [c.at(sgn, d0), y, out, y]);
        for (let d = d0 + (k & 1 ? 0.35 : 0); d < reach; d += 0.7) c.line(mortar, 0.03 * m, [c.at(sgn, d), y, c.at(sgn, d), y + 0.35]);
      });
    });
    c.b.flush();
    c.sides(sgn => {
      c.each(gap, (k, y) => {
        const d = d0 + 0.8 + 2.5 * hash(k, sgn + 4),
          w = 1.8,
          h = 1.6,
          y0 = y + 1,
          e = clamp(0.3 + 0.35 * mf.bass + 0.5 * mf.kick + 0.25 * c.hot, 0, 1),
          p = [c.at(sgn, d), y0];
        for (let j = 0; j <= 6; j++) p.push(c.at(sgn, d + w / 2 - (w / 2) * Math.cos((j / 6) * Math.PI)), y0 + h + 0.5 * Math.sin((j / 6) * Math.PI));
        p.push(c.at(sgn, d + w), y0);
        c.halo(c.at(sgn, d + w / 2), y0 + h / 2, 2.2 + 1.2 * mf.kick, heat[0], 0.25 * e);
        c.z(1);
        // the mouth's sooty rim, its hot inside, the coals, flames licking up, the grate's bars
        const rim = [c.at(sgn, d - 0.2), y0 - 0.2];
        for (let j = 0; j <= 6; j++) rim.push(c.at(sgn, d + w / 2 - (w / 2 + 0.2) * Math.cos((j / 6) * Math.PI)), y0 + h + 0.7 * Math.sin((j / 6) * Math.PI));
        rim.push(c.at(sgn, d + w + 0.2), y0 - 0.2);
        c.poly('#0a0605', rim);
        c.z(2);
        c.poly(al(heat[0], 0.15 + 0.35 * e), p);
        c.z(3);
        c.rect(al(heat[1], 0.4 + 0.5 * e), c.at(sgn, d + 0.1), y0, c.at(sgn, d + w - 0.1), y0 + 0.3);
        for (let j = 0; j < 4; j++) {
          const fx = d + 0.25 + j * 0.42,
            fh = (0.3 + 0.4 * c.rr(k * 4 + j + sgn * 30)) * (0.4 + 0.6 * e) * h,
            sway = 0.06 * Math.sin(c.t * 9 + j * 2);
          c.poly(al(heat[0], 0.35 + 0.35 * e), [c.at(sgn, fx - 0.2), y0 + 0.3, c.at(sgn, fx + 0.2), y0 + 0.3, c.at(sgn, fx + 0.17 + sway), y0 + 0.3 + fh * 0.5, c.at(sgn, fx + sway * 2), y0 + 0.3 + fh, c.at(sgn, fx - 0.17 + sway), y0 + 0.3 + fh * 0.5]);
        }
        c.z(4);
        for (let j = 1; j < 5; j++) c.line('#1a1210', 0.06 * m, [c.at(sgn, d + (j * w) / 5), y0, c.at(sgn, d + (j * w) / 5), y0 + h + 0.3]);
        // a drip sliding down from the lip
        const dy = (c.t * 0.8 + hash(k, 5)) % 1;
        c.rect(al(heat[1], 0.85), c.at(sgn, d + 0.6), y0 - 0.25 - dy * 2.5, c.at(sgn, d + 0.72), y0 - dy * 2.5);
        c.z(5);
        // sparks rising
        for (let j = 0; j < 5; j++) if (c.rr(k * 5 + j + sgn * 50) < 0.15 + 0.8 * mf.hat) c.b.rect(al(heat[1], 0.9), c.X(c.at(sgn, d + w * c.rr(j + k))), c.Y(y0 + h + 2 * c.rr(j + k + 1)), 2 * c.v.dpr, 2 * c.v.dpr);
      });
      c.z(1);
      // the wall's hot inner edge
      c.rect(al(heat[0], 0.15 + 0.35 * mf.snare), c.at(sgn, d0), c.ya, c.at(sgn, d0 + 0.1), c.yb);
    });
    c.done();
  },
  // FACTORY: a wall of pipes: risers of every width and finish, manifolds across with flanges, valve wheels, gauges whose
  // needles swing with the bass, steam bursting on the snare, light pulsing along one pipe on the beat
  pipes(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { mf, T, vr, v2, dk, m } = c,
      finishes = pick([['#b0683a', '#8a8f96', '#3a6a5a'], ['#6a7a8a', '#9a4a3a', '#5a5a62'], ['#c89a4a', '#4a5a7a', '#7a7a7a']], vr).map(h => mix(h, T.near, 0.35 + 0.3 * dk)),
      flow = pick(['#5affd8', '#ff8a3d', '#c87dff'], v2),
      back = mix(T.near, '#000000', 0.55),
      d0 = EDGE + 0.3;
    c.sides(sgn => c.body(back, sgn, d0));
    c.b.flush();
    c.sides(sgn => {
      const reach = c.reach(sgn),
        list = [];
      for (let i = 0, d = d0; d < reach; i++) {
        const w = 0.2 + 0.45 * hash(i, sgn + 3);
        list.push([d, w, finishes[i % 3]]);
        d += w + 0.15 + 0.4 * hash(i, sgn + 4);
      }
      for (const [d, w, col] of list) {
        c.z(0);
        c.rect(col, c.at(sgn, d), c.ya, c.at(sgn, d + w), c.yb);
        c.z(1);
        c.rect(al('#ffffff', 0.15), c.at(sgn, d + w * 0.2), c.ya, c.at(sgn, d + w * 0.35), c.yb);
        c.rect(al('#000000', 0.3), c.at(sgn, d + w * 0.75), c.ya, c.at(sgn, d + w), c.yb);
      }
      c.z(2);
      // the flowing one (none when no pipe fits in what is on screen of this side)
      if (!list.length) return;
      const [fd, fw] = list[1] ?? list[0];
      c.rect(al(flow, 0.2 + 0.3 * mf.bass), c.at(sgn, fd), c.ya, c.at(sgn, fd + fw), c.yb);
      c.each(1.5, (k, y) => {
        c.z(3);
        if ((k * -c.dir + c.beatN + 500) % 4 === 0) c.rect(al(flow, 0.6 + 0.4 * mf.beat), c.at(sgn, fd), y, c.at(sgn, fd + fw), y + 1.2);
      });
      // manifolds with flanges
      c.each(4, (k, y) => {
        const yy = y + 1.5 * hash(k, sgn + 9);
        c.z(4);
        c.rect(finishes[(k & 1) + 1], c.at(sgn, d0), yy, sgn < 0 ? c.xl : c.xr, yy + 0.35);
        c.z(5);
        c.rect(al('#000000', 0.35), c.at(sgn, d0), yy, sgn < 0 ? c.xl : c.xr, yy + 0.08);
        for (const [d, w] of list) c.rect(mix(finishes[0], '#000000', 0.3), c.at(sgn, d - 0.05), yy - 0.1, c.at(sgn, d + w + 0.05), yy + 0.45);
        // a valve wheel and a gauge
        const vx = c.at(sgn, d0 + 1 + 3 * hash(k, sgn + 10)),
          gx = c.at(sgn, d0 + 4.5 + 2 * hash(k, sgn + 11)),
          rot = c.t * 0.5 + k;
        c.z(6);
        c.b.ring(al('#c8c0b0', 0.85), 0.06 * m, c.X(vx), c.Y(yy + 0.9), 0.35 * m);
        c.line(al('#c8c0b0', 0.85), 0.05 * m, [vx + 0.35 * Math.cos(rot), yy + 0.9 + 0.35 * Math.sin(rot), vx - 0.35 * Math.cos(rot), yy + 0.9 - 0.35 * Math.sin(rot)]);
        c.b.dot('#e8e4d8', c.X(gx), c.Y(yy + 0.9), 0.3 * m);
        const na = Math.PI * (0.8 - 0.7 * mf.bass - 0.3 * mf.kick);
        c.line('#202020', 0.04 * m, [gx, yy + 0.9, gx + 0.25 * Math.cos(na), yy + 0.9 + 0.25 * Math.sin(na)]);
        if (mf.snare > 0.15 && hash(k, sgn + 12) < 0.6) c.halo(c.at(sgn, d0 + 2.5 + 3 * hash(k, 13)), yy + 0.5, 1 + 2 * mf.snare, '#f0f4f8', 0.55 * mf.snare);
      });
    });
    c.done();
  },

  // RAVE: stacks of speaker cabinets: woofers pumping on the kick, tweeters on the hats, a level meter on every cab
  // reading the bands, the grilles' rims lit in the song's colour
  speakers(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { mf, T, vr, v2, dk, m } = c,
      rim = pick([T.line, '#29e7ff', '#ff3df0', '#9dff3d'], vr),
      cab = mix('#141418', T.near, 0.2 + 0.2 * dk),
      sz = 1.5 + 0.4 * v2,
      d0 = EDGE + 0.3,
      bands = [mf.kick, mf.bass, mf.snare, mf.voice, mf.hat * 2.5];
    c.sides(sgn => c.body('#050507', sgn, d0));
    c.b.flush();
    c.sides(sgn => {
      const reach = c.reach(sgn);
      c.each(sz, (k, y) => {
        for (let i = 0; d0 + i * sz < reach; i++) {
          const d = d0 + i * sz + (k & 1 ? sz * 0.5 * (v2 > 0.5 ? 1 : 0) : 0),
            x = c.at(sgn, d + sz / 2),
            big = hash(k * 7 + i, sgn) < 0.7;
          c.z(0);
          c.rect(cab, c.at(sgn, d + 0.05), y + 0.05, c.at(sgn, d + sz - 0.05), y + sz - 0.05);
          c.z(1);
          if (big) {
            const r = sz * 0.3 * (1 + 0.15 * mf.kick);
            c.b.dot('#202026', c.X(x), c.Y(y + sz * 0.45), r * m);
            c.b.ring(al(rim, 0.35 + 0.6 * mf.kick + 0.2 * c.hot), 0.05 * m, c.X(x), c.Y(y + sz * 0.45), r * m);
            c.b.dot(al('#3a3a44', 1), c.X(x), c.Y(y + sz * 0.45), r * 0.3 * m);
          } else {
            for (const ty of [0.3, 0.6]) {
              c.b.dot('#202026', c.X(x), c.Y(y + sz * ty), sz * 0.13 * m);
              c.b.ring(al(rim, 0.3 + 0.7 * mf.hat * 2), 0.04 * m, c.X(x), c.Y(y + sz * ty), sz * 0.13 * m);
            }
          }
          c.z(3);
          // the level meter
          const lv = clamp(bands[mod(i + k, 5)], 0, 1);
          c.rect(al(rim, 0.25), c.at(sgn, d + 0.2), y + sz - 0.22, c.at(sgn, d + sz - 0.2), y + sz - 0.14);
          c.z(4);
          c.rect(al('#ffffff', 0.4 + 0.5 * lv), c.at(sgn, d + 0.2), y + sz - 0.22, c.at(sgn, d + 0.2 + (sz - 0.4) * lv), y + sz - 0.14);
        }
      });
      c.z(4);
      c.rect(al(rim, 0.25 + 0.6 * mf.snare), c.at(sgn, d0), c.ya, c.at(sgn, d0 + 0.06), c.yb);
    });
    // the air shaking off them on the kick
    if (mf.kick > 0.3) c.sides(sgn => c.each(sz * 2, (k, y) => c.halo(c.at(sgn, d0 + sz), y, sz * 1.5, rim, 0.15 * mf.kick)));
    c.done();
  },
  // RAVE: trusses up both walls with laser emitters fanning beams across the dark, sweeping on the bass, brighter on the
  // kick, changing colour on the snare, the haze sparkling on the hats; over the corridor the beams are only a haze
  lasers(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { g, mf, vr, v2, m } = c,
      cols = pick([['#29e7ff', '#ff3df0', '#9dff3d'], ['#3dff6a', '#3d9aff', '#ffffff'], ['#ff3df0', '#7d5dff', '#29e7ff']], vr),
      d0 = EDGE + 0.4,
      gap = 3 + 1.5 * v2,
      col0 = Math.floor(c.beatN / 2);
    c.sides(sgn => c.body('#030208', sgn, d0 + 0.6));
    c.b.flush();
    c.sides(sgn => {
      const x0 = c.at(sgn, d0 + 0.6),
        x1 = c.at(sgn, d0 + 1.2);
      c.rect('#2a2a34', x0, c.ya, x0 + sgn * 0.08, c.yb);
      c.rect('#2a2a34', x1, c.ya, x1 + sgn * 0.08, c.yb);
      c.each(0.6, (k, y) => c.line(al('#3a3a48', 0.9), 0.03 * m, [x0, y, x1, y + 0.6]));
    });
    c.b.flush();
    g.globalCompositeOperation = 'lighter';
    c.sides(sgn => {
      const reach = c.reach(sgn);
      c.each(gap, (k, y) => {
        const ex = c.at(sgn, d0 + 0.9),
          col = cols[mod(k + col0 + (sgn > 0 ? 1 : 0), 3)],
          base = Math.atan2(0, sgn),
          sweep = 0.6 * Math.sin(c.t * 1.1 + k * 1.7) + 0.5 * mf.bass * Math.sin(c.t * 3 + k),
          a = 0.12 + 0.45 * mf.kick + 0.25 * c.hot;
        c.halo(ex, y, 0.6, col, 0.4 + 0.5 * mf.kick);
        c.b.dot(al('#ffffff', 0.8), c.X(ex), c.Y(y), 0.08 * m);
        // the fan outward along the wall
        for (let j = 0; j < 5; j++) {
          const an = base + sgn * (sweep + (j - 2) * (0.18 + 0.15 * mf.snare)) * 0.9,
            len = reach;
          c.line(al(col, a), 0.025 * m, [ex, y, ex - Math.cos(an) * len * -1, y + Math.sin(an) * len * 0.9]);
        }
        // one long beam across the shaft, a haze over the corridor
        if (hash(k, sgn + 3) < 0.4) {
          const an = 0.35 * Math.sin(c.t * 0.7 + k);
          c.line(al(col, 0.05 + 0.08 * mf.kick), 0.02 * m, [ex, y, c.at(-sgn, reach), y + Math.tan(an) * 2 * reach]);
        }
      });
      // the haze sparkling
      for (let j = 0; j < 14; j++) {
        if (c.rr(j + sgn * 30) > 0.2 + mf.hat * 1.5) continue;
        c.b.dot(al(cols[j % 3], 0.7), c.X(c.at(sgn, d0 + 1.5 + 7 * c.rr(j + 1))), c.Y(c.ya + (c.yb - c.ya) * c.rr(j + 2)), 0.05 * m);
      }
    });
    c.done();
  },
  // RAVE: tiers of balconies packed with a crowd jumping on the kick, arms up as the song grows and all of them on the
  // drop, phone lights popping on the hats, glowsticks swinging with the bass, a wash of colour behind each tier
  crowd(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { mf, T, vr, v2, dk, m } = c,
      wash = pick(['#ff3df0', '#29e7ff', '#7d5dff', '#ff8a3d'], vr),
      sticks = pick([['#9dff3d', '#29e7ff'], ['#ff3df0', '#ffffff'], ['#3dffe0', '#c87dff']], v2),
      body = mix('#08080c', T.near, 0.2),
      tier = 2.4,
      d0 = EDGE + 0.4,
      armsUp = clamp(0.2 + 0.6 * mf.stage + mf.drop, 0, 1);
    c.sides(sgn => c.body(mix('#0a0612', '#000000', 0.4 * dk), sgn, d0));
    c.b.flush();
    c.sides(sgn => {
      const reach = c.reach(sgn),
        out = sgn < 0 ? c.xl : c.xr;
      c.each(tier, (k, y) => {
        c.z(0);
        // the wash behind the tier
        c.rect(al(wash, 0.1 + 0.25 * ((k + c.beatN) % 3 === 0 ? mf.beat : 0.2) + 0.15 * c.hot), c.at(sgn, d0), y + 0.3, out, y + tier);
        c.z(1);
        // the balcony's slab and rail
        c.rect('#16141c', c.at(sgn, d0), y, out, y + 0.3);
        c.rect(al(wash, 0.4 + 0.5 * mf.snare), c.at(sgn, d0), y + 0.8, out, y + 0.84);
        c.z(2);
        for (let i = 0; d0 + 0.4 + i * 0.55 < reach; i++) {
          const h = hash(k * 31 + i, sgn + 5),
            x = c.at(sgn, d0 + 0.4 + i * 0.55 + 0.15 * h),
            jump = 0.12 * mf.kick * (h < 0.7 ? 1 : 0) + 0.04 * Math.sin(c.t * 6 + i),
            by = y + 0.3 + jump;
          c.rect(body, x - 0.16, by, x + 0.16, by + 0.75);
          c.b.dot(body, c.X(x), c.Y(by + 0.95), 0.15 * m);
          if (h < armsUp) {
            const sw = 0.25 * Math.sin(c.t * 4 + i) * (0.3 + mf.bass);
            c.line(body, 0.07 * m, [x - 0.12, by + 0.7, x - 0.3 + sw, by + 1.4]);
            c.line(body, 0.07 * m, [x + 0.12, by + 0.7, x + 0.3 + sw, by + 1.4]);
            if (h < 0.25) c.line(al(sticks[i % 2], 0.85), 0.06 * m, [x + 0.3 + sw, by + 1.4, x + 0.45 + sw * 1.6, by + 1.75]);
            else if (c.rr(k * 7 + i + sgn) < mf.hat * 0.8) c.rect(al('#ffffff', 0.95), x - 0.36 + sw, by + 1.35, x - 0.24 + sw, by + 1.55);
          }
        }
      });
    });
    c.done();
  },

  // VOLCANO: dark rock with lava pouring down it, the falls glowing and flowing faster than he falls, widening on the
  // bass, flashing on the kick, crust plates riding them, embers spitting on the hats
  lavafall(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { mf, T, vr, v2, dk } = c,
      lava = pick([['#ff6a1a', '#ffc04a'], ['#ff5a14', '#ffa03a'], ['#ff8a2a', '#fff07a']], vr),
      rock = mix('#1c1414', T.near, 0.3 + 0.2 * dk),
      d0 = EDGE + 0.5,
      falls = [0.4 + 0.5 * v2, 3.2 + v2, 6.2];
    c.sides(sgn => c.poly(rock, cragPts(c, sgn, d0, 0.5, sgn + 31)));
    c.b.flush();
    c.sides(sgn => {
      for (const [i, d] of falls.entries()) {
        c.z(0);
        if (i === 2 && hash(sgn, 4) < 0.5) continue;
        const w = (0.6 + 0.5 * hash(i, sgn + 5)) * (1 + 0.2 * mf.bass),
          x = c.at(sgn, d0 + d);
        c.each(4, (k, y) => c.halo(x, y + 2, 1.6 + w, lava[0], 0.18 + 0.2 * mf.bass + 0.15 * c.hot));
        c.rect(al(lava[0], 0.75 + 0.25 * mf.kick), x - w / 2, c.ya, x + w / 2, c.yb);
        c.z(1);
        c.rect(al(lava[1], 0.5 + 0.5 * mf.kick), x - w / 5, c.ya, x + w / 5, c.yb);
        c.z(2);
        // the flow: bright streaks sliding down
        for (let y0 = Math.floor((c.ya + c.t * 5) / 1.4) * 1.4; y0 - c.t * 5 < c.yb; y0 += 1.4) {
          const y = y0 - c.t * 5,
            h = hash(Math.round(y0 * 10), i + sgn * 7);
          c.rect(al(h < 0.5 ? '#fff4c0' : '#2a1008', h < 0.5 ? 0.6 : 0.7), x - w / 2 + w * h * 0.7, y, x - w / 2 + w * h * 0.7 + 0.12, y + 0.5 + h);
        }
      }
      c.z(3);
      // embers spitting off on the hats
      for (let j = 0; j < 12; j++) {
        if (c.rr(j + sgn * 20) > 0.15 + mf.hat * 1.4) continue;
        c.b.rect(al(lava[1], 0.95), c.X(c.at(sgn, d0 + 7 * c.rr(j + 1))), c.Y(c.ya + (c.yb - c.ya) * c.rr(j + 2)), 2.5 * c.v.dpr, 2.5 * c.v.dpr);
      }
      c.rect(al(lava[0], 0.15 + 0.4 * mf.snare), c.at(sgn, d0 - 0.4), c.ya, c.at(sgn, d0 - 0.3), c.yb);
    });
    c.done();
  },
  // VOLCANO: a cliff of hexagonal basalt columns stepped at their tops, magma glowing in the cracks between them and
  // pulsing with the bass, the cracks lighting in a run on the kick, steam venting on the snare
  basalt(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { mf, T, vr, v2, dk, m } = c,
      stone = mix(pick(['#2a2c34', '#2a2234', '#30302c'], vr), T.near, 0.25 + 0.3 * dk),
      lit = mix(stone, '#ffffff', 0.18),
      shades = [stone, mix(stone, '#ffffff', 0.07), mix(stone, '#000000', 0.2)],
      magma = pick(['#ff7a2a', '#ff5a3a', '#c86aff'], v2),
      cw = 0.85,
      d0 = EDGE + 0.4;
    c.sides(sgn => c.body(mix(stone, '#000000', 0.4), sgn, d0));
    c.b.flush();
    c.sides(sgn => {
      const reach = c.reach(sgn);
      for (let i = 0; d0 + i * cw < reach; i++) {
        const d = d0 + i * cw,
          seg = 3 + 4 * hash(i, sgn + 3);
        // each column broken into stacked lengths, a cap face where each ends
        c.each(seg, (k, y) => {
          c.z(0);
          const off = 0.6 * hash(i * 5 + k, sgn),
            y0 = y + off;
          c.poly(shades[mod(i + (sgn > 0 ? 1 : 0), 3)], [c.at(sgn, d + 0.05), y0, c.at(sgn, d + cw - 0.05), y0, c.at(sgn, d + cw - 0.05), y0 + seg - 0.12, c.at(sgn, d + cw / 2), y0 + seg, c.at(sgn, d + 0.05), y0 + seg - 0.12]);
          c.z(1);
          c.poly(lit, [c.at(sgn, d + 0.05), y0 + seg - 0.12, c.at(sgn, d + cw / 2), y0 + seg, c.at(sgn, d + cw - 0.05), y0 + seg - 0.12, c.at(sgn, d + cw / 2), y0 + seg - 0.3]);
        });
        c.z(2);
        // the crack beside it
        const run = (i + c.beatN) % 5 === 0 ? mf.kick : 0;
        c.rect(al(magma, 0.12 + 0.4 * mf.bass * hash(i, 9) + 0.8 * run + 0.15 * c.hot), c.at(sgn, d - 0.03), c.ya, c.at(sgn, d + 0.04), c.yb);
      }
      c.each(5, (k, y) => {
        if (mf.snare > 0.15 && hash(k, sgn + 5) < 0.6) c.halo(c.at(sgn, d0 + 1 + 4 * hash(k, sgn + 6)), y, 1 + 2 * mf.snare, '#e8e8f0', 0.5 * mf.snare);
        c.halo(c.at(sgn, d0 + 2 + 3 * hash(k, sgn + 7)), y + 2, 1.4, magma, 0.1 + 0.25 * mf.bass);
      });
    });
    void m;
    c.done();
  },
  // VOLCANO: a black rock wall set with skulls and bones, their sockets glowing in turn on the beat and all of them with
  // the voice, ghost flames in niches flickering on the hats, the jaws dropping on the snare
  skulls(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { mf, T, vr, v2, dk, m } = c,
      eye = pick(['#7dff6a', '#c86aff', '#3dffe0', '#ff9a3d'], vr),
      bone = mix('#b8ab90', T.near, 0.45 + 0.3 * dk),
      rock = mix('#16121a', T.near, 0.25),
      d0 = EDGE + 0.4,
      cell = 1.1 - 0.2 * v2;
    c.sides(sgn => c.poly(rock, cragPts(c, sgn, d0, 0.35, sgn + 41)));
    c.b.flush();
    c.sides(sgn => {
      const reach = c.reach(sgn);
      c.each(cell, (k, y) => {
        for (let i = 0; d0 + 0.6 + i * cell < reach; i++) {
          const h = hash(k * 19 + i, sgn + 3);
          if (h > 0.55) {
            if (h > 0.85) c.line(al(bone, 0.7), 0.08 * m, [c.at(sgn, d0 + 0.3 + i * cell), y + 0.2, c.at(sgn, d0 + 0.9 + i * cell), y + 0.8]);
            continue;
          }
          const x = c.at(sgn, d0 + 0.6 + i * cell + 0.15 * (h - 0.25)),
            r = cell * (0.32 + 0.1 * hash(i, k)),
            yy = y + cell * 0.55,
            on = (i + k * 3 + c.beatN) % 7 === 0 ? mf.kick : 0,
            jaw = 0.08 * mf.snare;
          c.z(1);
          c.b.dot(bone, c.X(x), c.Y(yy), r * m);
          c.rect(bone, x - r * 0.55, yy - r * 1.1 - jaw, x + r * 0.55, yy - r * 0.55 - jaw);
          c.z(2);
          const ea = clamp(0.15 + 0.6 * mf.voice + on + 0.2 * c.hot, 0, 1);
          for (const ex of [-0.38, 0.38]) c.b.dot(al(ea > 0.4 ? eye : '#000000', ea > 0.4 ? ea : 0.85), c.X(x + ex * r), c.Y(yy - 0.05 * r), r * 0.28 * m);
          if (on > 0.3) c.halo(x, yy, r * 3, eye, 0.3 * on);
        }
      });
      // ghost flames in niches
      c.each(4.2, (k, y) => {
        const fx = c.at(sgn, d0 + 1.5 + 4 * hash(k, sgn + 9)),
          fl = 0.4 + 0.3 * c.rr(k + sgn * 4) * (0.4 + 2 * mf.hat);
        c.z(0);
        c.rect('#060408', fx - 0.4, y, fx + 0.4, y + 1.1);
        c.halo(fx, y + 0.4, 1, eye, 0.25 + 0.3 * mf.hat);
        c.z(3);
        c.poly(al(eye, 0.85), [fx - 0.15, y + 0.1, fx + 0.15, y + 0.1, fx + 0.05 * Math.sin(c.t * 17 + k), y + 0.1 + fl]);
      });
    });
    c.done();
  },

  // OCEAN: a coral reef down both walls: branching corals, brain corals, sea fans and anemones whose tentacles sway with
  // the bass, polyps lighting on the kick, bubbles rising, caustic light rippling with the voice
  reef(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { mf, T, vr, dk, m } = c,
      cols = pick([['#ff6ab0', '#ff9a5a', '#7dffe0'], ['#c86aff', '#5ad8ff', '#ffd07a'], ['#ff7a6a', '#6affa8', '#9a8aff']], vr).map(h => mix(h, T.near, 0.25 + 0.35 * dk)),
      rock = mix('#1a2a3a', T.near, 0.35),
      d0 = EDGE + 0.6;
    c.sides(sgn => c.poly(rock, cragPts(c, sgn, d0 + 0.4, 0.5, sgn + 51)));
    c.b.flush();
    c.sides(sgn => {
      c.each(1.6, (k, y) => {
        const h = hash(k, sgn + 3),
          d = d0 + 0.2 + 0.5 * noise(y * 0.7, sgn + 51) + 0.6 * hash(k, sgn + 4),
          x = c.at(sgn, d),
          col = cols[Math.floor(h * 30) % 3],
          sw = 0.15 * Math.sin(c.t * 1.6 + k) + 0.25 * mf.bass * Math.sin(c.t * 5 + k);
        const kind = Math.floor(hash(k, sgn + 5) * 4);
        if (kind === 0) {
          // branching coral
          c.line(al(col, 0.9), 0.1 * m, [x, y, x - sgn * 0.6, y + 0.6, x - sgn * 0.7 + sw, y + 1.3]);
          c.line(al(col, 0.9), 0.08 * m, [x - sgn * 0.6, y + 0.6, x - sgn * 0.2 + sw, y + 1.1]);
          c.b.dot(al('#ffffff', 0.3 + 0.7 * mf.kick), c.X(x - sgn * 0.7 + sw), c.Y(y + 1.3), 0.06 * m);
        } else if (kind === 1) {
          // brain coral
          c.b.dot(al(col, 0.9), c.X(x + sgn * 0.3), c.Y(y + 0.4), 0.55 * m);
          c.b.ring(al(mix(col, '#000000', 0.4), 1), 0.04 * m, c.X(x + sgn * 0.3), c.Y(y + 0.4), 0.3 * m);
        } else if (kind === 2) {
          // a sea fan
          for (let j = 0; j < 6; j++) c.line(al(col, 0.75), 0.03 * m, [x, y, x - sgn * Math.cos(0.3 + j * 0.25) * 1.1 + sw, y + Math.sin(0.3 + j * 0.25) * 1.3]);
        } else {
          // an anemone
          for (let j = 0; j < 7; j++) c.line(al(col, 0.85), 0.05 * m, [x - sgn * 0.1, y, x - sgn * (0.1 + 0.08 * (j - 3) + sw * (0.5 + j / 7)), y + 0.5 + 0.08 * Math.abs(j - 3)]);
        }
        if ((k + c.beatN) % 4 === 0) c.halo(x, y + 0.6, 0.9, col, 0.4 * mf.kick);
      });
      // more coral out on the rock, dimmer
      c.each(2.3, (k, y) => c.b.dot(al(cols[mod(k, 3)], 0.35), c.X(c.at(sgn, d0 + 2 + 5 * hash(k, sgn + 6))), c.Y(y), (0.3 + 0.4 * hash(k, 7)) * m));
      // bubbles rising
      for (let j = 0; j < 8; j++) {
        const by = c.ya + ((c.t * 1.5 + hash(j, sgn) * 20) % (c.yb - c.ya + 1)),
          bx = c.at(sgn, d0 + 0.5 + 6 * hash(j, sgn + 1)) + 0.1 * Math.sin(c.t * 3 + j);
        c.b.ring(al('#e8ffff', 0.45 + 0.4 * mf.hat), 0.03 * m, c.X(bx), c.Y(by), (0.06 + 0.06 * hash(j, 2)) * m);
      }
    });
    // caustics over everything, faint
    c.each(2.5, (k, y) => {
      const p = [];
      for (let x = -10; x <= 10; x += 2) p.push(c.cx + x, y + 0.3 * Math.sin(x * 0.8 + c.t * 2 + k));
      c.line(al('#bff8ff', 0.04 + 0.08 * mf.voice), 0.04 * m, p);
    });
    c.done();
  },
  // OCEAN: open water in a kelp forest: god rays slanting down, kelp strands rising and swaying with the bass, a school
  // of fish turning on the kick, glowing plankton winking on the hats
  kelp(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { mf, T, vr, v2, dk, m } = c,
      kelpc = mix(pick(['#4a7a2a', '#6a6a2a', '#2a6a4a'], vr), T.near, 0.25 + 0.4 * dk),
      fish = pick(['#c8e8ff', '#ffb07a', '#9affd8'], v2),
      plank = pick(['#5affe8', '#7d9aff'], c.v3),
      n = 5 + Math.floor(3 * v2);
    // god rays, slow, faint over the corridor
    c.layer(0.2, 7, (k, y) => {
      const x = c.cx - 8 + 16 * hash(k, 3);
      c.poly(al('#c8f0ff', 0.03 + 0.07 * mf.voice + 0.04 * c.hot), [x, y + 10, x + 0.8, y + 10, x + 3.8, y - 6, x + 2, y - 6]);
    });
    c.sides(sgn => {
      for (let i = 0; i < n; i++) {
        const d = EDGE + 0.6 + (i * 7.5) / n + 0.6 * hash(i, sgn),
          p = [],
          q = [];
        for (let y = Math.floor(c.ya) - 1; y <= c.yb + 1; y += 0.7) {
          const sw = (0.35 + 0.3 * mf.bass) * Math.sin(y * 0.35 + c.t * 1.2 + i) + 0.15 * mf.bass * Math.sin(y * 1.3 + c.t * 4);
          p.push(c.at(sgn, d + sw), y);
          q.push(c.at(sgn, d + sw + 0.05), y);
        }
        c.line(al(kelpc, i % 2 ? 0.95 : 0.6), (0.08 + 0.05 * (i % 2)) * m, p);
        // the blades along it
        c.each(1.1, (k, y) => {
          const sw = (0.35 + 0.3 * mf.bass) * Math.sin(y * 0.35 + c.t * 1.2 + i),
            side = k & 1 ? 1 : -1,
            x = c.at(sgn, d + sw);
          c.poly(al(kelpc, i % 2 ? 0.9 : 0.55), [x, y, x + side * 0.6, y + 0.35 + 0.1 * Math.sin(c.t * 2 + k), x + side * 0.1, y + 0.55]);
        });
      }
      // plankton winking
      for (let j = 0; j < 14; j++) {
        if (c.rr(j + sgn * 40) > 0.25 + mf.hat * 1.5) continue;
        c.b.dot(al(plank, 0.9), c.X(c.at(sgn, EDGE + 0.8 + 7 * c.rr(j + 1))), c.Y(c.ya + (c.yb - c.ya) * c.rr(j + 2)), 0.05 * m);
      }
    });
    c.b.flush();
    // a school of fish crossing the wall, turning on the kick
    c.each(6, (k, y) => {
      const sgn = hash(k, 5) < 0.5 ? -1 : 1,
        go = (c.t * 0.6 + hash(k, 6)) % 1,
        turn = mf.kick > 0.5 ? -1 : 1;
      for (let j = 0; j < 9; j++) {
        const x = c.at(sgn, EDGE + 1 + go * 7 + (j % 3) * 0.4),
          yy = y + 1 + Math.floor(j / 3) * 0.3 + 0.1 * Math.sin(c.t * 5 + j),
          dirx = sgn * turn;
        c.poly(al(fish, 0.75), [x + dirx * 0.2, yy, x - dirx * 0.15, yy + 0.08, x - dirx * 0.15, yy - 0.08]);
      }
    });
    c.done();
  },
  // OCEAN: a sunken ship's hull down the walls: planks and ribs, portholes lit from inside on the kick, chains swaying on
  // the bass, barnacles, glints off the wreck on the hats; one side the hull, the other the stern's broken timbers
  wreck(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { mf, T, vr, v2, dk, m } = c,
      wood = mix(pick(['#3a2a20', '#2a2a26', '#3a2420'], v2), T.near, 0.35 + 0.35 * dk),
      seam = mix(wood, '#000000', 0.5),
      glowc = pick(['#5affe8', '#7dc8ff', '#c8ff7d'], c.v3),
      hs = vr < 0.5 ? -1 : 1,
      d0 = EDGE + 0.5;
    c.sides(sgn => {
      if (sgn === hs) c.body(wood, sgn, d0);
      else c.poly(mix('#1a2830', T.near, 0.3), cragPts(c, sgn, d0 + 0.6, 0.7, 61));
    });
    c.b.flush();
    const reach = c.reach(hs),
      out = hs < 0 ? c.xl : c.xr;
    // planks and ribs
    c.each(0.45, (k, y) => c.line(seam, 0.04 * m, [c.at(hs, d0), y, out, y]));
    c.z(1);
    c.each(3.5, (k, y) => c.rect(mix(wood, '#000000', 0.25), c.at(hs, d0), y, out, y + 0.4));
    c.z(2);
    // portholes
    c.each(3.5, (k, y) => {
      for (let i = 0; d0 + 1.4 + i * 2.2 < reach; i++) {
        const x = c.at(hs, d0 + 1.4 + i * 2.2),
          yy = y + 1.9,
          on = hash(k * 5 + i, 3) < 0.25 + 0.5 * mf.kick ? 1 : 0;
        c.b.dot('#7a5a40', c.X(x), c.Y(yy), 0.5 * m);
        c.b.dot(on ? al(glowc, 0.5 + 0.5 * mf.kick) : '#060a0e', c.X(x), c.Y(yy), 0.38 * m);
        if (on) c.halo(x, yy, 1.2, glowc, 0.2 + 0.3 * mf.kick);
      }
      // barnacles
      for (let j = 0; j < 5; j++) c.b.dot(al('#9aa8a0', 0.6), c.X(c.at(hs, d0 + 0.3 + 6 * hash(k * 5 + j, 7))), c.Y(y + 3.4 * hash(k, j)), 0.06 * m);
    });
    // a hole stove into the hull
    c.each(9, (k, y) => {
      c.z(1);
      const d = d0 + 3 + 2 * hash(k, 9);
      c.poly('#04070a', [c.at(hs, d), y + 2, c.at(hs, d + 1), y + 1.4, c.at(hs, d + 2.2), y + 2.2, c.at(hs, d + 1.6), y + 3.4, c.at(hs, d + 0.4), y + 3.1]);
    });
    c.z(2);
    // the broken stern on the other side: timbers sticking out
    c.each(2.8, (k, y) => {
      const d = d0 + 0.8 + 0.7 * noise(y * 0.7, 61),
        an = 0.3 + 0.4 * hash(k, 3);
      c.line(wood, 0.18 * m, [c.at(-hs, d - 0.4), y, c.at(-hs, d + 3), y + Math.tan(an) * 3]);
    });
    c.z(4);
    // chains swaying from above
    c.sides(sgn => {
      c.z(4);
      const cx0 = c.at(sgn, d0 + 1),
        sw = 0.3 * Math.sin(c.t * 0.9 + sgn) + 0.3 * mf.bass;
      c.each(0.35, (k, y) => c.b.ring(al('#5a6068', 0.9), 0.04 * m, c.X(cx0 - sgn * sw * Math.sin(y * 0.1)), c.Y(y), 0.1 * m));
    });
    // glints on the hats
    for (let j = 0; j < 6; j++) if (c.rr(j) < mf.hat * 1.5) c.b.dot(al('#e8ffff', 0.95), c.X(c.at(hs, d0 + 0.5 + 5 * c.rr(j + 1))), c.Y(c.ya + (c.yb - c.ya) * c.rr(j + 2)), 0.05 * m);
    c.rect(al(glowc, 0.12 + 0.35 * mf.snare), c.at(hs, d0), c.ya, c.at(hs, d0 + 0.08), c.yb);
    c.done();
  },

  // ARCTIC: a crevasse of blue ice: layered walls, cracks in it glowing on the kick, icicles hanging off the ledges and
  // shivering on the snare, frost sparkling on the hats, bluer and darker the deeper the shaft
  crevasse(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { mf, T, vr, v2, dk, m } = c,
      ice = mix(pick(['#5a9ac8', '#4a7ab8', '#6ab8c8'], vr), '#081830', 0.2 + 0.5 * dk),
      layer = mix(ice, '#ffffff', 0.25),
      crack = pick(['#8af0ff', '#b0a0ff', '#8affd0'], v2),
      d0 = EDGE + 0.5;
    c.sides(sgn => c.poly(ice, cragPts(c, sgn, d0, 0.7, sgn + 71, 0.5)));
    c.b.flush();
    c.sides(sgn => {
      const out = sgn < 0 ? c.xl : c.xr;
      // the layers
      c.each(0.9, (k, y) => {
        const d = d0 + 0.7 * noise(y * 0.7, sgn + 71) + 0.3;
        c.line(al(k & 1 ? layer : '#0a2038', 0.35), (0.04 + 0.05 * hash(k, 3)) * m, [c.at(sgn, d), y, c.at(sgn, d + 3), y + 0.2 * noise(y, 4), out, y]);
      });
      // cracks lighting on the kick
      c.each(3.2, (k, y) => {
        const d = d0 + 1.5 + 3 * hash(k, sgn + 5),
          on = (k + c.beatN) % 3 === 0 ? mf.kick : 0.2 * mf.kick,
          p = [];
        for (let j = 0; j < 5; j++) p.push(c.at(sgn, d + 0.4 * (hash(k * 5 + j, 6) - 0.5) + j * 0.3), y + j * 0.6);
        c.line(al(crack, 0.25 + 0.75 * on + 0.15 * c.hot), 0.05 * m, p);
        if (on > 0.3) c.halo(c.at(sgn, d + 0.6), y + 1.2, 1.5, crack, 0.35 * on);
      });
      // icicles off the ledges
      c.each(1.8, (k, y) => {
        const d = d0 + 0.7 * noise(y * 0.7, sgn + 71),
          shiver = 0.05 * mf.snare * Math.sin(c.t * 60 + k);
        for (let j = 0; j < 3; j++) {
          const x = c.at(sgn, d + 0.1 + j * 0.25) + shiver,
            len = 0.4 + 0.6 * hash(k * 3 + j, sgn);
          c.poly(al('#e8f8ff', 0.75), [x - 0.07, y, x + 0.07, y, x, y - len]);
        }
      });
      for (let j = 0; j < 10; j++) if (c.rr(j + sgn * 9) < 0.1 + mf.hat * 1.5) c.b.dot(al('#ffffff', 0.95), c.X(c.at(sgn, d0 + 0.5 + 6 * c.rr(j + 1))), c.Y(c.ya + (c.yb - c.ya) * c.rr(j + 2)), 0.05 * m);
    });
    void T;
    c.done();
  },
  // ARCTIC: a frozen waterfall: columns of ice bulging down each wall, lit from inside and pulsing with the bass,
  // highlights running down them on the beat, frost sparkling on the hats, snow drifting past
  icefall(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { mf, T, vr, v2, dk, m } = c,
      ice = pick(['#a8e0f0', '#c0d0ff', '#b0f0e0'], vr),
      inner = pick(['#3ac8ff', '#7a8aff', '#3affc8'], v2),
      back = mix('#0a1a2a', T.near, 0.3 + 0.3 * dk),
      d0 = EDGE + 0.4;
    c.sides(sgn => c.body(back, sgn, d0));
    c.b.flush();
    c.sides(sgn => {
      const reach = c.reach(sgn);
      for (let i = 0, d = d0; d < reach; i++) {
        const w = 0.7 + 0.9 * hash(i, sgn + 3),
          L = [],
          R = [],
          hl = [];
        for (let y = Math.floor(c.ya / 0.5) * 0.5 - 0.5; y <= c.yb + 0.5; y += 0.5) {
          const a = 0.18 * noise(y * 1.2, i * 3 + sgn),
            bb = 0.18 * noise(y * 1.1, i * 3 + sgn + 1);
          L.push(c.at(sgn, d + a), y);
          R.push(c.at(sgn, d + w + bb), y);
          hl.push(c.at(sgn, d + a + 0.14), y);
        }
        for (let j = R.length - 2; j >= 0; j -= 2) L.push(R[j], R[j + 1]);
        c.z(0);
        c.poly(al(inner, 0.14 + 0.25 * mf.bass + 0.15 * c.hot), L);
        c.z(1);
        c.poly(al(ice, 0.3 + 0.1 * (i % 2)), L);
        c.line(al('#ffffff', 0.25 + 0.35 * mf.voice), 0.04 * m, hl);
        // icicle tips where the flow froze in a drip
        c.each(2.2, (k, y) => {
          if (hash(k, i * 5 + sgn) > 0.45) return;
          const x = c.at(sgn, d + w * (0.25 + 0.5 * hash(k, i)));
          c.poly(al(ice, 0.75), [x - 0.12, y, x + 0.12, y, x, y - 0.6 - 0.5 * hash(k, i + 2)]);
        });
        c.z(2);
        // a highlight running down on the beat
        const hy = c.v.y + c.v.vh * (1 - ((c.t / (f.L?.A?.beat || 0.5) + i * 0.3) % 1)),
          x = c.at(sgn, d + w * 0.3);
        c.rect(al('#ffffff', 0.3 + 0.5 * mf.beat), x, hy, x + sgn * 0.08, hy + 1.5);
        d += w + 0.15 + 0.2 * hash(i, 7);
      }
      for (let j = 0; j < 10; j++) if (c.rr(j + sgn * 9) < 0.1 + mf.hat * 1.5) c.b.dot(al('#ffffff', 0.95), c.X(c.at(sgn, d0 + 0.3 + 7 * c.rr(j + 1))), c.Y(c.ya + (c.yb - c.ya) * c.rr(j + 2)), 0.06 * m);
      c.z(3);
      c.rect(al('#ffffff', 0.3 + 0.6 * mf.snare), c.at(sgn, d0), c.ya, c.at(sgn, d0 + 0.06), c.yb);
    });
    c.b.flush();
    // snow drifting past, across the whole shaft but faint over the corridor
    c.layer(0.7, 0.5, (k, y) => {
      const x = c.cx - 10 + 20 * hash(k, 13) + 0.4 * Math.sin(c.t + k),
        inLane = Math.abs(x - c.cx) < EDGE;
      c.b.rect(al('#ffffff', inLane ? 0.15 : 0.6), c.X(x), c.Y(y), 2 * c.v.dpr, 2 * c.v.dpr + c.sl * 0.3);
    });
    c.done();
  },
  // ARCTIC: open polar night: aurora curtains rippling far behind with the voice and the bass, snowy cliffs with pines
  // along both sides, stars, the pines' snow shaking off on the kick
  aurora(f, s, look) {
    const c = open(f, s, look);
    if (!c) return;
    const { g, mf, T, vr, v2, dk } = c,
      cols = pick([['#4affa0', '#a06aff'], ['#4ae8ff', '#ff6ad8'], ['#9aff4a', '#4a9aff']], vr),
      snow = mix('#d8e4f0', T.near, 0.35 + 0.3 * dk),
      cliff = mix('#1a2434', T.near, 0.3),
      // the cliffs stand well back: the sky between is the aurora's
      cd = EDGE + 2.4 + 1.6 * v2;
    // the stars
    c.layer(0.1, 0.5, (k, y) => {
      const x = c.cx - 11 + 22 * hash(k, 3);
      c.b.rect(al('#ffffff', 0.25 + 0.5 * hash(k, 4) + (c.rr(k) < mf.hat ? 0.3 : 0)), c.X(x), c.Y(y), c.v.dpr * 1.5, c.v.dpr * 1.5);
    });
    c.b.flush();
    // the curtains: thin strands hanging from a ribbon that waves along slowly, longer and brighter with the voice and
    // the bass, faint over the corridor
    g.globalCompositeOperation = 'lighter';
    c.layer(0.15, 6, (k, y) => {
      for (let x = c.cx - 11; x < c.cx + 11; x += 0.22) {
        const wv = Math.sin(x * 0.7 + c.t * 1.1 + k) * 0.5 + 0.5,
          top = y + 4 + 1.4 * Math.sin(x * 0.28 + c.t * 0.5 + k * 2),
          h = (2.5 + 4 * wv) * (0.7 + 0.3 * mf.voice + 0.3 * mf.bass),
          near = Math.abs(x - c.cx) < EDGE ? 0.35 : 1,
          a = (0.14 + 0.36 * wv + 0.15 * c.hot) * near;
        c.line(al(cols[0], a), 2 * c.v.dpr, [x, top - h, x, top - 0.4]);
        c.line(al(cols[1], a * 0.8), 2 * c.v.dpr, [x, top - 0.4, x, top + 0.3 * wv]);
      }
    });
    c.b.flush();
    g.globalCompositeOperation = 'source-over';
    // the cliffs with their snow and pines
    c.sides(sgn => {
      c.poly(cliff, cragPts(c, sgn, cd, 0.6, sgn + 81));
    });
    c.b.flush();
    c.sides(sgn => {
      c.each(3, (k, y) => {
        c.z(0);
        const d = cd + 0.6 * noise(y * 0.7, sgn + 81);
        c.poly(snow, [c.at(sgn, d - 0.1), y, c.at(sgn, d + 4), y - 0.1, c.at(sgn, d + 4), y + 0.25, c.at(sgn, d + 0.3), y + 0.2]);
        c.z(1);
        // pines on the ledge
        for (let j = 0; j < 3; j++) {
          if (hash(k * 3 + j, sgn) < 0.35) continue;
          const px = c.at(sgn, d + 0.8 + j * 1.1),
            ph = 1 + 0.8 * hash(k, j + 4),
            shk = 0.05 * mf.kick * Math.sin(c.t * 40 + j);
          c.poly('#0a1418', [px - 0.4 + shk, y + 0.2, px + 0.4 + shk, y + 0.2, px + shk, y + 0.2 + ph]);
          c.poly(al(snow, 0.7 - 0.5 * mf.kick), [px - 0.2 + shk, y + 0.2 + ph * 0.5, px + 0.2 + shk, y + 0.2 + ph * 0.5, px + shk, y + 0.2 + ph]);
        }
        if (mf.kick > 0.4) c.halo(c.at(sgn, d + 1.5), y + 1, 1, '#ffffff', 0.2 * mf.kick);
      });
    });
    c.done();
  },
};
