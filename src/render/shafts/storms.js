// The things across a shaft: a gate's wall (all lanes but the one way through) and a storm's stretch (held through).
//   GATES[name](f, o, spans, Y): spans [x0, x1] in metres of the lanes it closes, Y its height on screen
//   ZONES[name](f, o, box, rr): box { X0, X1, Y0, Y1 } on screen, { lo, hi } in metres; rr() a random for this frame
// Both say danger before anything is explained: red-hot, sharp, crackling, nothing flat to stand on; the gold ring in
// the free lane (drawn by the caller) is the one good thing. Each sound moves its own part: the hats crackle, the kick
// flashes and bursts, the snare slams and strikes, the bass sways, a build or a drop turns the whole thing up.
// Drawn in batches (one path per material) so a gate or a storm stays within a couple of hundred draw calls on a phone.
import { glowDot, hash, mixHex, rgba } from '../util.js';
import { DANGER } from '../things/hazards.js';

const TAU = Math.PI * 2;
// a frame's tick (24 a second) for flickers that must be the same on every replay of the frame
const tick = f => Math.floor(f.t * 24);
// the screen span [left, right] of a span in metres, whichever way the frame runs
const px = (v, [a, b]) => {
  const A = v.sx(a),
    B = v.sx(b);
  return A < B ? [A, B] : [B, A];
};
// how hard the song is pushing now: 1 at rest, up to ~1.8 on a drop
const push = mf => 1 + 0.5 * (mf.drop || 0) + 0.3 * (mf.build || 0);
// a jagged bolt from (x0, y0) to (x1, y1) in n steps, its kinks up to amp across, added to the current path
function bolt(g, x0, y0, x1, y1, n, amp, rnd) {
  const dx = x1 - x0,
    dy = y1 - y0,
    l = Math.hypot(dx, dy) || 1,
    nx = -dy / l,
    ny = dx / l;
  g.moveTo(x0, y0);
  for (let i = 1; i < n; i++) {
    const u = i / n,
      k = (rnd() - 0.5) * 2 * amp;
    g.lineTo(x0 + dx * u + nx * k, y0 + dy * u + ny * k);
  }
  g.lineTo(x1, y1);
}
// keep a storm inside its stretch (the caller restores the context after it)
function inside(g, { X0, X1, Y0, Y1 }) {
  g.beginPath();
  g.rect(X0, Y0, X1 - X0, Y1 - Y0);
  g.clip();
}
// a deterministic random from a seed, for a gate (which has no rr of its own)
function rand(seed) {
  let i = 0;
  return () => hash(seed, i++);
}
// a stroke of the current path in three passes: a wide halo, a coloured core, a white-hot thread
function hot(g, w, col, a, halo = 0.25) {
  g.strokeStyle = rgba(col, halo * a);
  g.lineWidth = w * 3;
  g.stroke();
  g.strokeStyle = rgba(col, 0.9 * a);
  g.lineWidth = w;
  g.stroke();
  g.strokeStyle = rgba('#ffffff', 0.85 * a);
  g.lineWidth = w * 0.35;
  g.stroke();
}

// the materials of the doors, by place (the station's white hull, the factory's rusted iron)
const DOOR = {
  station: { body: '#5c6678', panel: '#3a4252', edge: '#aab6c8', light: true },
  factory: { body: '#5a4236', panel: '#3a2a22', edge: '#9a8670', light: false },
};

export const GATES = {
  // laser fences: spiked emitter pylons at each closed lane's edges and three red beams between them, flickering on the
  // hats, flaring on the kick; later in the song a beam scans up and down across them; hit, the beams snap and spit
  laser(f, o, spans, Y) {
    const { g, v, mf, t, T } = f,
      m = v.ppm,
      tier = o.tier ?? 0,
      hit = o.res === 'hit',
      since = Math.max(0, t - o.t),
      fr = tick(f),
      halo = mixHex(DANGER, T.line, 0.3),
      posts = new Set();
    for (const s of spans) for (const x of px(v, s)) posts.add(Math.round(x));
    // the pylons: dark spiked posts, a red lens at each beam's height and a red spike on top
    g.fillStyle = T.near;
    g.beginPath();
    for (const X of posts) {
      g.moveTo(X, Y - 1.05 * m);
      g.lineTo(X + 0.14 * m, Y - 0.82 * m);
      g.lineTo(X + 0.1 * m, Y + 0.08 * m);
      g.lineTo(X, Y + 0.24 * m);
      g.lineTo(X - 0.1 * m, Y + 0.08 * m);
      g.lineTo(X - 0.14 * m, Y - 0.82 * m);
      g.closePath();
    }
    g.fill();
    g.strokeStyle = rgba(DANGER, 0.55 + 0.45 * mf.kick);
    g.lineWidth = 0.03 * m;
    g.stroke();
    g.fillStyle = rgba(DANGER, 0.7 + 0.3 * mf.beat);
    g.beginPath();
    for (const X of posts) {
      for (const h of [0.12, 0.38, 0.64]) g.rect(X - 0.04 * m, Y - (h + 0.04) * m, 0.08 * m, 0.08 * m);
      g.moveTo(X, Y - 1.12 * m);
      g.lineTo(X + 0.06 * m, Y - 0.92 * m);
      g.lineTo(X - 0.06 * m, Y - 0.92 * m);
    }
    g.fill();
    g.globalCompositeOperation = 'lighter';
    // the beams, each flickering out for a tick now and then on the hats, all of them fat on the kick
    const rnd = rand(fr * 7 + 3);
    g.beginPath();
    spans.forEach((s, j) => {
      const [A, B] = px(v, s);
      [0.12, 0.38, 0.64].forEach((h, i) => {
        if (hash(fr, i * 5 + j * 17) < 0.35 * mf.hat) return;
        const y = Y - h * m;
        if (hit && since < 0.6) {
          // (snapped: each half whipping loose from its emitter)
          const cut = A + (B - A) * (0.3 + 0.4 * hash(i, j + 9)),
            droop = since * 0.8 * m;
          g.moveTo(A, y);
          g.lineTo(cut - 0.1 * m, y + droop);
          g.moveTo(cut + 0.1 * m, y + droop * 0.7);
          g.lineTo(B, y);
        } else bolt(g, A, y, B, y, 6, 0.012 * m * (1 + 3 * mf.hat), rnd);
      });
    });
    hot(g, (0.06 + 0.05 * mf.kick) * m, DANGER, 1, 0.3);
    // the field the beams hold between them: a red shimmer over the whole closed lane, criss-crossed
    g.fillStyle = rgba(DANGER, hit ? 0 : 0.1 + 0.12 * mf.kick + 0.05 * Math.sin(t * 40));
    g.beginPath();
    for (const s of spans) {
      const [A, B] = px(v, s);
      g.rect(A, Y - 0.64 * m, B - A, 0.52 * m);
    }
    g.fill();
    if (!hit) {
      g.beginPath();
      for (const s of spans) {
        const [A, B] = px(v, s),
          n = 4;
        for (let i = 0; i < n; i++) {
          const a = A + ((B - A) * i) / n,
            b = A + ((B - A) * (i + 1)) / n,
            [h1, h2] = i % 2 ? [0.12, 0.64] : [0.64, 0.12];
          g.moveTo(a, Y - h1 * m);
          g.lineTo(b, Y - h2 * m);
        }
      }
      hot(g, 0.02 * m, DANGER, 0.5 + 0.3 * mf.hat, 0.2);
    }
    // the scanning beams later in the song: one (two at the top tier) sweeping up and down across the closed lanes
    if (tier >= 1 && !hit) {
      g.beginPath();
      for (let k = 0; k < tier; k++) {
        const ph = t * (2.4 + k) + k * Math.PI,
          h1 = 0.45 + 0.42 * Math.sin(ph),
          h2 = 0.45 - 0.42 * Math.sin(ph + 0.8);
        for (const s of spans) {
          const [A, B] = px(v, s);
          g.moveTo(A, Y - h1 * m);
          g.lineTo(B, Y - h2 * m);
        }
      }
      hot(g, 0.025 * m, DANGER, 0.8 + 0.2 * mf.beat);
    }
    // the emitters' flare on the kick, and a spray of sparks off them on the hats
    for (const X of posts) {
      glowDot(g, X, Y - 0.38 * m, (0.35 + 0.45 * mf.kick) * m, halo, (0.3 + 0.6 * mf.kick) * f.glow);
      glowDot(g, X, Y - 1.0 * m, 0.22 * m, DANGER, (0.4 + 0.5 * mf.beat) * f.glow);
    }
    g.strokeStyle = rgba('#ffd6d0', 0.9);
    g.lineWidth = 0.015 * m;
    g.beginPath();
    const n = Math.round(posts.size * (2 + 6 * mf.hat + (hit && since < 0.6 ? 8 : 0)));
    const sp = [...posts];
    for (let i = 0; i < n; i++) {
      const X = sp[i % sp.length],
        y = Y - [0.12, 0.38, 0.64][i % 3] * m,
        a = hash(fr, i * 3) * TAU,
        r = (0.06 + 0.2 * hash(fr, i * 3 + 1)) * m;
      g.moveTo(X + Math.cos(a) * 0.05 * m, y + Math.sin(a) * 0.05 * m);
      g.lineTo(X + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    g.stroke();
  },

  // a spider's web strung between thorny branches over each closed lane, quivering with the bass, red dew on it like
  // blood, and its spider waiting at the hub, red hourglass and eyes; hit, the web tears and hangs in rags
  web(f, o, spans, Y) {
    const { g, v, mf, t, T } = f,
      m = v.ppm,
      tier = o.tier ?? 0,
      hit = o.res === 'hit',
      wob = (0.025 + 0.05 * mf.bass + 0.015 * tier) * m;
    // the branches the webs hang on: twisted, thorned, dark wood
    g.fillStyle = mixHex(T.near, '#3a2a18', 0.5);
    g.beginPath();
    const ends = new Set();
    for (const s of spans) for (const x of px(v, s)) ends.add(Math.round(x));
    for (const X of ends) {
      g.moveTo(X - 0.07 * m, Y + 0.2 * m);
      g.quadraticCurveTo(X - 0.12 * m, Y - 0.45 * m, X - 0.03 * m, Y - 1.05 * m);
      g.lineTo(X + 0.05 * m, Y - 0.98 * m);
      g.quadraticCurveTo(X - 0.01 * m, Y - 0.45 * m, X + 0.07 * m, Y + 0.2 * m);
      // (its thorns, hooked out both ways)
      for (let i = 0; i < 5; i++) {
        const y = Y + (0.05 - i * 0.22) * m,
          d = i % 2 ? 1 : -1;
        g.moveTo(X, y);
        g.lineTo(X + d * 0.2 * m, y - 0.1 * m);
        g.lineTo(X, y - 0.06 * m);
      }
    }
    g.fill();
    // the webs: spokes from the hub to the frame, a spiral round them, all of it trembling
    const spoke = 12,
      rings = 6;
    g.beginPath();
    const dew = [],
      tips = [];
    spans.forEach((s, j) => {
      const [A, B] = px(v, s),
        cx = (A + B) / 2,
        cy = Y - 0.42 * m,
        rx = (B - A) / 2,
        ry = 0.55 * m,
        P = (i, r) => {
          const a = (i / spoke) * TAU + j,
            q = Math.sin(t * 19 + i * 1.7 + r * 4 + j) * wob * r;
          return [cx + Math.cos(a) * rx * r + q, cy + Math.sin(a) * ry * r + q * 0.6];
        };
      for (let i = 0; i < spoke; i++) {
        if (hit && hash(i, j + 3) < 0.5) continue;
        const [x, y] = P(i, 1);
        g.moveTo(cx, cy);
        g.lineTo(x, y);
        tips.push([x, y]);
      }
      for (let r = 1; r <= rings; r++) {
        const u = 0.15 + (0.85 * r) / rings;
        for (let i = 0; i <= spoke; i++) {
          const [x, y] = P(i % spoke, u),
            [x2, y2] = P((i + 1) % spoke, u),
            // (the strand between two spokes sags in towards the hub)
            mx = (x + x2) / 2 + (cx - (x + x2) / 2) * 0.08,
            my = (y + y2) / 2 + (cy - (y + y2) / 2) * 0.08;
          if (hit && hash(i + r * 13, j) < 0.45) continue;
          g.moveTo(x, y);
          g.quadraticCurveTo(mx, my, x2, y2);
          if ((i + r) % 3 === 0) dew.push([mx, my]);
        }
      }
    });
    g.strokeStyle = rgba('#eef4e0', 0.75);
    g.lineWidth = 0.018 * m;
    g.stroke();
    g.strokeStyle = rgba(DANGER, 0.25 + 0.4 * mf.kick);
    g.lineWidth = 0.05 * m;
    g.stroke();
    // its dew, red and swelling on the kick, and a barb at every spoke's end
    g.fillStyle = rgba(DANGER, 0.85);
    g.beginPath();
    for (const [x, y] of dew) {
      g.moveTo(x + 0.03 * m, y);
      g.arc(x, y, (0.022 + 0.018 * mf.kick) * m, 0, TAU);
    }
    for (const [x, y] of tips) {
      g.moveTo(x - 0.03 * m, y);
      g.lineTo(x, y - 0.09 * m);
      g.lineTo(x + 0.03 * m, y);
    }
    g.fill();
    // the spider at each hub (gone off it once the web is torn), twitching on the snare
    if (hit) return;
    spans.forEach((s, j) => {
      const [A, B] = px(v, s),
        cx = (A + B) / 2 + Math.sin(t * 3 + j) * 0.05 * m,
        cy = Y - 0.42 * m - mf.snare * 0.06 * m,
        r = 0.13 * m;
      g.strokeStyle = '#140c08';
      g.lineWidth = 0.03 * m;
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const d = i < 4 ? -1 : 1,
          k = i % 4,
          a = -0.9 + k * 0.6 + Math.sin(t * 8 + i) * 0.1 * (1 + mf.snare * 3),
          kx = cx + d * Math.cos(a) * r * 2,
          ky = cy + Math.sin(a) * r * 1.6 - 0.08 * m;
        g.moveTo(cx, cy);
        g.lineTo(kx, ky);
        g.lineTo(kx + d * Math.cos(a) * r * 1.2, ky + r * 1.4);
      }
      g.stroke();
      g.fillStyle = '#1a100a';
      g.beginPath();
      g.ellipse(cx, cy + r * 0.5, r * 0.9, r * 1.15, 0, 0, TAU);
      g.moveTo(cx + r * 0.6, cy - r * 0.6);
      g.arc(cx, cy - r * 0.6, r * 0.6, 0, TAU);
      g.fill();
      g.fillStyle = rgba(DANGER, 0.8 + 0.2 * mf.beat);
      g.beginPath();
      g.moveTo(cx - r * 0.4, cy + r * 0.05);
      g.lineTo(cx + r * 0.4, cy + r * 0.05);
      g.lineTo(cx - r * 0.4, cy + r * 1.05);
      g.lineTo(cx + r * 0.4, cy + r * 1.05);
      g.closePath();
      for (const e of [-0.25, 0.25]) {
        g.moveTo(cx + (e + 0.12) * r, cy - r * 0.75);
        g.arc(cx + e * r, cy - r * 0.75, 0.12 * r, 0, TAU);
      }
      g.fill();
      glowDot(g, cx, cy - r * 0.75, r * 1.2, DANGER, (0.3 + 0.5 * mf.kick) * f.glow);
    });
  },

  // a fence of ribs over each closed lane: a spine of bone with ribs curving up to sharp blood-dipped points and short
  // ones down, a horned skull at each end, its sockets burning on the kick; the snare rattles it all; hit, ribs snap
  bones(f, o, spans, Y) {
    const { g, v, mf, t } = f,
      m = v.ppm,
      hit = o.res === 'hit',
      since = Math.max(0, t - o.t),
      rat = (0.03 + 0.05 * (o.tier ?? 0)) * mf.snare * m,
      bone = '#efe3c4',
      shade = '#7a5a34',
      fr = tick(f);
    // the ribs (and the spines they grow from), one path, a bone colour over its dark edge
    g.beginPath();
    const tipsUp = [];
    spans.forEach((s, j) => {
      const [A, B] = px(v, s),
        n = Math.max(3, Math.round((B - A) / (0.2 * m)));
      // (the spine: a knobbed bar)
      g.moveTo(A, Y - 0.12 * m);
      g.quadraticCurveTo((A + B) / 2, Y - 0.2 * m, B, Y - 0.12 * m);
      g.lineTo(B, Y - 0.02 * m);
      g.quadraticCurveTo((A + B) / 2, Y - 0.08 * m, A, Y - 0.02 * m);
      g.closePath();
      for (let i = 0; i < n; i++) {
        const x = A + ((i + 0.5) * (B - A)) / n + (hash(fr, i + j * 31) - 0.5) * rat,
          lean = (i - (n - 1) / 2) * 0.03 * m + Math.sin(t * 2 + i) * 0.01 * m,
          broken = hit && hash(i, j + 1) < 0.5,
          up = (broken ? 0.35 : 0.72 + 0.12 * hash(i, j + 7)) * m,
          w = 0.035 * m,
          yb = Y - 0.12 * m,
          tx = x + lean + (broken ? since * 0.4 * m : 0),
          ty = yb - up;
        g.moveTo(x - w, yb);
        g.quadraticCurveTo(x - w * 2.5 + lean * 0.3, yb - up * 0.55, tx, ty);
        g.quadraticCurveTo(x + w * 1.2 + lean * 0.3, yb - up * 0.5, x + w, yb);
        g.closePath();
        if (!broken) tipsUp.push([tx, ty]);
        // (the short ones under it, pointing down)
        if (i % 2 === 0) {
          g.moveTo(x - w * 0.8, Y - 0.02 * m);
          g.lineTo(x + lean * 0.3, Y + 0.18 * m);
          g.lineTo(x + w * 0.8, Y - 0.02 * m);
        }
      }
    });
    g.fillStyle = bone;
    g.fill();
    g.strokeStyle = shade;
    g.lineWidth = 0.018 * m;
    g.stroke();
    // the blood-red points, glowing hotter on the beat
    g.fillStyle = rgba(DANGER, 0.75 + 0.25 * mf.beat);
    g.beginPath();
    for (const [x, y] of tipsUp) {
      g.moveTo(x, y);
      g.lineTo(x - 0.03 * m, y + 0.12 * m);
      g.lineTo(x + 0.03 * m, y + 0.12 * m);
    }
    g.fill();
    // the horned skulls at the ends of each run of ribs
    const ends = new Set();
    for (const s of spans) for (const x of px(v, s)) ends.add(Math.round(x));
    g.beginPath();
    for (const X of ends) {
      const y = Y - 0.42 * m + Math.sin(t * 9 + X) * rat;
      g.moveTo(X - 0.12 * m, y - 0.05 * m);
      g.quadraticCurveTo(X, y - 0.24 * m, X + 0.12 * m, y - 0.05 * m);
      g.quadraticCurveTo(X + 0.08 * m, y + 0.14 * m, X + 0.04 * m, y + 0.24 * m);
      g.lineTo(X - 0.04 * m, y + 0.24 * m);
      g.quadraticCurveTo(X - 0.08 * m, y + 0.14 * m, X - 0.12 * m, y - 0.05 * m);
      for (const d of [-1, 1]) {
        g.moveTo(X + d * 0.1 * m, y - 0.1 * m);
        g.quadraticCurveTo(X + d * 0.32 * m, y - 0.08 * m, X + d * 0.3 * m, y - 0.38 * m);
        g.quadraticCurveTo(X + d * 0.24 * m, y - 0.14 * m, X + d * 0.08 * m, y - 0.02 * m);
      }
    }
    g.fillStyle = bone;
    g.fill();
    g.stroke();
    g.fillStyle = '#1a0e08';
    g.beginPath();
    for (const X of ends) {
      const y = Y - 0.42 * m + Math.sin(t * 9 + X) * rat;
      for (const d of [-1, 1]) {
        g.moveTo(X + d * 0.02 * m, y - 0.02 * m);
        g.lineTo(X + d * 0.09 * m, y - 0.05 * m);
        g.lineTo(X + d * 0.05 * m, y + 0.06 * m);
      }
    }
    g.fill();
    for (const X of ends) {
      const y = Y - 0.42 * m + Math.sin(t * 9 + X) * rat;
      for (const d of [-1, 1]) glowDot(g, X + d * 0.05 * m, y, (0.07 + 0.08 * mf.kick) * m, DANGER, 0.7 + 0.3 * mf.kick);
    }
  },

  // blast doors over each closed lane, their two halves meeting in a seam of interlocking teeth, red-and-black hazard
  // stripes on their edges, a red beacon turning on top: between snares they shudder open a crack (red light through
  // it), on the snare they slam shut with a burst of sparks; hit, they buckle
  doors(f, o, spans, Y) {
    const { g, v, mf, t, T } = f,
      m = v.ppm,
      M = DOOR[f.place] ?? DOOR.station,
      hit = o.res === 'hit',
      since = Math.max(0, t - o.t),
      fr = tick(f),
      tier = o.tier ?? 0,
      gap = (0.03 + 0.04 * tier) * m * (1 - mf.snare) * (0.5 + 0.5 * Math.abs(Math.sin(t * 7))),
      top = Y - 0.9 * m,
      bot = Y + 0.12 * m,
      jolt = mf.snare * 0.03 * m,
      teeth = 5;
    for (const [j, s] of spans.entries()) {
      const [A, B] = px(v, s),
        cx = (A + B) / 2,
        buckle = hit ? Math.min(1, since * 6) * 0.08 : 0;
      // the red light behind the crack
      g.fillStyle = rgba(DANGER, 0.6 + 0.4 * mf.kick);
      g.fillRect(cx - 0.12 * m, top, 0.24 * m, bot - top);
      for (const d of [-1, 1]) {
        g.save();
        g.translate(d < 0 ? A : B, bot);
        g.rotate(d * buckle);
        g.translate(-(d < 0 ? A : B), -bot + jolt * (d < 0 ? 1 : -1));
        const edge = cx + (d * gap) / 2,
          outer = d < 0 ? A : B,
          th = (bot - top) / teeth;
        // the half: a heavy slab, its leading edge cut in teeth that lock into the other half's
        g.beginPath();
        g.moveTo(outer, top);
        for (let i = 0; i <= teeth; i++) {
          const y = top + i * th,
            k = (i % 2 ? 1 : -1) * d;
          g.lineTo(edge + k * 0.06 * m, y);
          if (i < teeth) g.lineTo(edge - k * 0.06 * m, y + th / 2);
        }
        g.lineTo(outer, bot);
        g.closePath();
        g.fillStyle = M.body;
        g.fill();
        g.strokeStyle = M.edge;
        g.lineWidth = 0.02 * m;
        g.stroke();
        g.clip();
        // the panels and their rivets (or the station's light strip)
        g.fillStyle = M.panel;
        const pw = Math.abs(outer - cx) - 0.32 * m;
        if (pw > 0.05 * m) {
          const px0 = d < 0 ? A + 0.06 * m : cx + 0.26 * m;
          g.fillRect(px0, top + 0.1 * m, pw, 0.34 * m);
          g.fillRect(px0, top + 0.52 * m, pw, 0.34 * m);
          if (M.light) {
            g.fillStyle = rgba(T.line, 0.35 + 0.4 * mf.beat);
            g.fillRect(px0, top + 0.47 * m, pw, 0.03 * m);
          } else {
            g.fillStyle = M.edge;
            g.beginPath();
            for (let i = 0; i < 4; i++)
              for (const h of [0.06, 0.48, 0.9]) {
                const rx = px0 + ((i + 0.5) * pw) / 4;
                g.moveTo(rx + 0.02 * m, top + h * m);
                g.arc(rx, top + h * m, 0.02 * m, 0, TAU);
              }
            g.fill();
          }
        }
        // the hazard stripes on its leading edge, red and black, sliding
        const sx0 = Math.min(cx, cx + d * 0.22 * m),
          off = (t * 0.6 * m) % (0.16 * m);
        g.beginPath();
        g.rect(sx0, top, 0.22 * m, bot - top);
        g.clip();
        g.fillStyle = '#120a0a';
        g.fillRect(sx0, top, 0.22 * m, bot - top);
        g.fillStyle = rgba(DANGER, 0.85 + 0.15 * mf.beat);
        g.beginPath();
        for (let x = sx0 - (bot - top) - 0.16 * m; x < sx0 + 0.22 * m; x += 0.16 * m) {
          g.moveTo(x + off, bot);
          g.lineTo(x + off + 0.08 * m, bot);
          g.lineTo(x + off + 0.08 * m + (bot - top), top);
          g.lineTo(x + off + (bot - top), top);
        }
        g.fill();
        g.restore();
      }
      // the frame round them: a jagged lintel of spikes above (nothing to stand on) and spikes under
      g.fillStyle = T.near;
      g.beginPath();
      for (let x = A; x < B - 0.01 * m; x += 0.15 * m) {
        g.moveTo(x, top + 0.02 * m);
        g.lineTo(x + 0.075 * m, top - 0.16 * m);
        g.lineTo(Math.min(B, x + 0.15 * m), top + 0.02 * m);
        g.moveTo(x, bot - 0.02 * m);
        g.lineTo(x + 0.075 * m, bot + 0.12 * m);
        g.lineTo(Math.min(B, x + 0.15 * m), bot - 0.02 * m);
      }
      g.fill();
      g.strokeStyle = rgba(DANGER, 0.5 + 0.5 * mf.kick);
      g.lineWidth = 0.015 * m;
      g.stroke();
      // the beacon, its beam turning
      const a = t * 6 + j;
      g.fillStyle = DANGER;
      g.beginPath();
      g.arc(cx, top - 0.1 * m, 0.07 * m, Math.PI, 0);
      g.fill();
      g.globalCompositeOperation = 'lighter';
      glowDot(g, cx + Math.cos(a) * 0.3 * m, top - 0.12 * m, (0.25 + 0.2 * Math.max(0, Math.sin(a))) * m, DANGER, 0.7 * f.glow);
      // the slam's sparks flying out of the seam
      if (mf.snare > 0.2 || (hit && since < 0.5)) {
        const rnd = rand(fr * 13 + j),
          n = Math.round(10 * Math.max(mf.snare, hit ? 1 - since * 2 : 0));
        g.strokeStyle = rgba('#ffd2b0', 0.9);
        g.lineWidth = 0.02 * m;
        g.beginPath();
        for (let i = 0; i < n; i++) {
          const y = top + rnd() * (bot - top),
            ang = (rnd() - 0.5) * 1.6 + (rnd() < 0.5 ? Math.PI : 0),
            r = (0.1 + 0.3 * rnd()) * m;
          g.moveTo(cx, y);
          g.lineTo(cx + Math.cos(ang) * r, y + Math.sin(ang) * r);
        }
        g.stroke();
        glowDot(g, cx, (top + bot) / 2, 0.6 * m, '#ff6a4a', mf.snare * 0.7 * f.glow);
      }
      g.globalCompositeOperation = 'source-over';
    }
  },

  // a curtain of lava pouring from a spiked obsidian lintel over each closed lane: flowing streaks, a cooler crust
  // drifting down it, drips falling off its ragged hem; it swells bright on the kick, bubbles burst on the hats
  lava(f, o, spans, Y) {
    const { g, v, mf, t } = f,
      m = v.ppm,
      hit = o.res === 'hit',
      since = Math.max(0, t - o.t),
      fr = tick(f),
      top = Y - 0.78 * m,
      heat = 0.75 + 0.25 * mf.kick,
      hem = (x, k) => Y + (0.06 + 0.04 * Math.sin(x / m * 9 + t * 5 + k) + 0.05 * mf.kick) * m;
    // the sheet, one gradient for all of it: dark red at the lip, orange, a yellow-white glow at the bottom
    const gr = g.createLinearGradient(0, top, 0, Y + 0.15 * m);
    gr.addColorStop(0, '#7a0a10');
    gr.addColorStop(0.35, mixHex('#d8201a', '#ff5a1a', mf.kick));
    gr.addColorStop(0.8, '#ff8a1a');
    gr.addColorStop(1, '#ffd08a');
    g.fillStyle = gr;
    g.beginPath();
    spans.forEach((s, j) => {
      const [A, B] = px(v, s);
      g.moveTo(A, top);
      g.lineTo(B, top);
      for (let x = B; x >= A; x -= 0.12 * m) {
        const tongue = hash(Math.round(x / (0.12 * m)), j) < 0.3 ? 0.08 * m * (1 + Math.sin(t * 3 + x)) : 0;
        g.lineTo(x, hem(x, j) + tongue + (hit ? since * 0.5 * m : 0));
      }
      g.lineTo(A, hem(A, j));
      g.closePath();
    });
    g.globalAlpha = heat;
    g.fill();
    g.globalAlpha = 1;
    // the flow: bright streaks running down it, and the dark crust floating on it
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rgba('#ffc06a', 0.5 + 0.4 * mf.kick);
    g.lineWidth = 0.025 * m;
    g.beginPath();
    const crust = [];
    spans.forEach((s, j) => {
      const [A, B] = px(v, s),
        n = Math.round((B - A) / (0.11 * m));
      for (let i = 0; i < n; i++) {
        const x = A + ((i + 0.5) * (B - A)) / n,
          ph = (t * (1.4 + hash(i, j) * 0.8) + hash(i, j + 5)) % 1,
          y = top + ph * (Y - top),
          l = (0.12 + 0.18 * hash(i, j + 9)) * m;
        g.moveTo(x + Math.sin(y / m * 6) * 0.02 * m, y);
        g.lineTo(x, Math.min(Y, y + l));
        if (i % 3 === 1) crust.push([x, top + ((ph + 0.5) % 1) * (Y - top - 0.1 * m), i]);
      }
    });
    g.stroke();
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = rgba('#2a0c08', 0.75);
    g.beginPath();
    for (const [x, y, i] of crust) {
      const r = (0.04 + 0.03 * hash(i, 2)) * m;
      g.moveTo(x - r, y);
      g.lineTo(x - r * 0.3, y - r * 0.8);
      g.lineTo(x + r, y - r * 0.2);
      g.lineTo(x + r * 0.4, y + r * 0.7);
    }
    g.fill();
    // the lintel it pours from: obsidian, spiked above and below, its cracks glowing
    g.fillStyle = '#16080c';
    g.beginPath();
    for (const s of spans) {
      const [A, B] = px(v, s);
      g.moveTo(A - 0.04 * m, top + 0.05 * m);
      for (let x = A; x <= B; x += 0.13 * m) {
        g.lineTo(x + 0.03 * m, top - (0.14 + 0.1 * hash(Math.round(x), 4)) * m);
        g.lineTo(x + 0.065 * m, top - 0.04 * m);
      }
      g.lineTo(B + 0.04 * m, top - 0.04 * m);
      g.lineTo(B + 0.04 * m, top + 0.05 * m);
      for (let x = B; x >= A; x -= 0.18 * m) {
        g.lineTo(x - 0.05 * m, top + 0.16 * m);
        g.lineTo(x - 0.09 * m, top + 0.05 * m);
      }
      g.closePath();
    }
    g.fill();
    g.strokeStyle = rgba(DANGER, 0.6 + 0.4 * mf.kick);
    g.lineWidth = 0.018 * m;
    g.stroke();
    // the drips falling off the hem, stretching as they go, and the bubbles bursting on it
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = '#ff7a2a';
    g.beginPath();
    spans.forEach((s, j) => {
      const [A, B] = px(v, s);
      for (let i = 0; i < 6; i++) {
        const x = A + (B - A) * hash(i, j + 21),
          ph = (t * (0.9 + 0.5 * hash(i, j)) + hash(i, j + 2)) % 1,
          y = hem(x, j) + ph * ph * 0.5 * m,
          r = (0.03 + 0.02 * mf.kick) * m * (1 - ph * 0.5);
        g.moveTo(x + r, y);
        g.arc(x, y, r, 0, Math.PI);
        g.lineTo(x, y - r * (2 + 4 * ph));
        g.closePath();
      }
      for (let i = 0; i < Math.round(1 + 5 * mf.hat); i++) {
        const x = A + (B - A) * hash(fr, i + j * 9),
          y = top + (Y - top) * hash(fr + 1, i + j * 9),
          r = (0.02 + 0.04 * hash(fr + 2, i)) * m;
        g.moveTo(x + r, y);
        g.arc(x, y, r, 0, TAU);
      }
    });
    g.fill();
    for (const s of spans) {
      const [A, B] = px(v, s);
      glowDot(g, (A + B) / 2, Y, (B - A) * 0.6, '#ff4a1a', (0.25 + 0.45 * mf.kick) * f.glow);
    }
    g.globalCompositeOperation = 'source-over';
  },

  // a fishing net stretched over each closed lane between red buoys, its mesh billowing with the bass, barbed hooks
  // hanging from its knots and a red sea mine snared in it; bubbles stream off it on the hats; hit, it tears open
  net(f, o, spans, Y) {
    const { g, v, mf, t } = f,
      m = v.ppm,
      hit = o.res === 'hit',
      since = Math.max(0, t - o.t),
      fr = tick(f),
      top = Y - 0.85 * m,
      bot = Y + 0.1 * m,
      cell = 0.2 * m,
      sway = (0.03 + 0.07 * mf.bass + 0.02 * (o.tier ?? 0)) * m,
      // (a point of the mesh, pushed out in a slow billow and a fast shiver)
      P = (x, y, A, B) => {
        const u = (x - A) / (B - A || 1),
          b = Math.sin(u * Math.PI) * Math.sin(t * 3 + y / m * 4) * sway;
        return [x + b * 0.3, y + b + Math.sin(t * 17 + x / m * 9) * 0.006 * m];
      };
    for (const [j, s] of spans.entries()) {
      const [A, B] = px(v, s);
      g.save();
      g.beginPath();
      g.rect(A, top - 0.1 * m, B - A, bot - top + 0.2 * m);
      g.clip();
      // the mesh: lines both ways on the diagonal, each in short bent steps
      g.beginPath();
      const knots = [],
        span = bot - top,
        holeX = (A + B) / 2,
        holeY = Y - 0.4 * m,
        holeR = hit ? Math.min(1, since * 4) * 0.5 * m : 0;
      for (const d of [1, -1]) {
        for (let k = -span; k < B - A + span; k += cell) {
          let pen = false;
          for (let i = 0; i <= 8; i++) {
            const y = top + (span * i) / 8,
              x = A + k + d * (y - top),
              [qx, qy] = P(x, y, A, B);
            if (holeR && Math.hypot(qx - holeX, qy - holeY) < holeR) {
              pen = false;
              continue;
            }
            pen ? g.lineTo(qx, qy) : g.moveTo(qx, qy);
            pen = true;
            if (d > 0 && i % 2 === 0 && x > A && x < B && hash(Math.round(k), i + j) < 0.2) knots.push([qx, qy]);
          }
        }
      }
      g.strokeStyle = '#2a2418';
      g.lineWidth = 0.035 * m;
      g.stroke();
      g.strokeStyle = '#c8b48a';
      g.lineWidth = 0.016 * m;
      g.stroke();
      // the hooks hanging off its knots, steel with red barbs, swinging
      g.strokeStyle = '#b8c4c8';
      g.lineWidth = 0.018 * m;
      g.beginPath();
      const barbs = [];
      for (const [x, y] of knots.slice(0, 7)) {
        const sw = Math.sin(t * 4 + x) * 0.03 * m,
          ex = x + sw,
          ey = y + 0.14 * m;
        g.moveTo(x, y);
        g.lineTo(ex, ey);
        g.arc(ex - 0.04 * m, ey, 0.04 * m, 0, Math.PI * 0.9);
        barbs.push([ex - 0.08 * m, ey]);
      }
      g.stroke();
      g.fillStyle = DANGER;
      g.beginPath();
      for (const [x, y] of barbs) {
        g.moveTo(x - 0.015 * m, y);
        g.lineTo(x, y - 0.07 * m);
        g.lineTo(x + 0.02 * m, y);
      }
      g.fill();
      g.restore();
      // the head rope and foot rope, thick, the head rope's floats red and pulsing on the kick
      g.strokeStyle = '#3a2e1c';
      g.lineWidth = 0.05 * m;
      g.beginPath();
      for (const y of [top, bot]) {
        g.moveTo(A, y);
        for (let i = 1; i <= 6; i++) {
          const [qx, qy] = P(A + ((B - A) * i) / 6, y, A, B);
          g.lineTo(qx, qy);
        }
      }
      g.stroke();
      g.fillStyle = rgba(DANGER, 0.85 + 0.15 * mf.kick);
      g.beginPath();
      for (let i = 0; i < 4; i++) {
        const [qx, qy] = P(A + ((B - A) * (i + 0.5)) / 4, top, A, B),
          r = (0.06 + 0.02 * mf.kick) * m;
        g.ellipse(qx, qy, r * 1.4, r, 0, 0, TAU);
        g.moveTo(qx + r * 1.4, qy);
      }
      g.fill();
      // the mine caught in it: a dark ball, its spikes red-tipped, blinking on the beat
      if (!hit) {
        const [mx, my] = P(A + (B - A) * (0.3 + 0.4 * hash(j, 77)), Y - 0.35 * m, A, B),
          r = 0.13 * m;
        g.fillStyle = '#1c262c';
        g.beginPath();
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * TAU + t * 0.6;
          g.moveTo(mx + Math.cos(a - 0.15) * r, my + Math.sin(a - 0.15) * r);
          g.lineTo(mx + Math.cos(a) * r * 1.7, my + Math.sin(a) * r * 1.7);
          g.lineTo(mx + Math.cos(a + 0.15) * r, my + Math.sin(a + 0.15) * r);
        }
        g.moveTo(mx + r, my);
        g.arc(mx, my, r, 0, TAU);
        g.fill();
        glowDot(g, mx, my, (0.12 + 0.15 * mf.kick) * m, DANGER, 0.6 + 0.4 * mf.beat);
      }
    }
    // the bubbles streaming up off it on the hats
    g.strokeStyle = rgba('#e0f4ff', 0.6);
    g.lineWidth = 0.012 * m;
    g.beginPath();
    spans.forEach((s, j) => {
      const [A, B] = px(v, s);
      for (let i = 0; i < Math.round(2 + 8 * mf.hat); i++) {
        const x = A + (B - A) * hash(i, j + 40),
          ph = (t * 0.8 + hash(i, j + 41)) % 1,
          y = bot - ph * (bot - top + 0.3 * m),
          r = (0.015 + 0.03 * hash(fr % 8, i)) * m;
        g.moveTo(x + r + Math.sin(t * 6 + i) * 0.03 * m, y);
        g.arc(x + Math.sin(t * 6 + i) * 0.03 * m, y, r, 0, TAU);
      }
    });
    g.stroke();
  },

  // a wall of ice shards over each closed lane, jagged crystals spiking up and down from a frozen band, frost in them
  // and red cracks through them burning on the kick, glints crackling on the hats; hit, it shatters into flying shards
  ice(f, o, spans, Y) {
    const { g, v, mf, t } = f,
      m = v.ppm,
      hit = o.res === 'hit',
      since = Math.max(0, t - o.t),
      fr = tick(f),
      mid = Y - 0.33 * m,
      fly = hit ? since : 0;
    const shards = [];
    spans.forEach((s, j) => {
      const [A, B] = px(v, s),
        n = Math.max(4, Math.round((B - A) / (0.17 * m)));
      for (let i = 0; i < n; i++) {
        const x = A + ((i + 0.5) * (B - A)) / n,
          h1 = hash(i, j * 7 + 1),
          up = (0.4 + 0.2 * h1 + (i % 2 ? 0 : 0.08)) * m,
          dn = (0.32 + 0.12 * hash(i, j + 3)) * m,
          lean = (hash(i, j + 5) - 0.5) * 0.18 * m,
          w = (0.1 + 0.05 * hash(i, j + 9)) * m,
          // (when shattered: thrown out from the middle, spinning, falling)
          dx = fly * (x - (A + B) / 2) * 3,
          dy = fly * fly * 3 * m - fly * 1.2 * m;
        shards.push([x + dx, mid + dy, w, -up, lean, i + j * 50]);
        shards.push([x + dx * 1.2, mid + dy * 0.8, w * 0.8, dn, -lean * 0.6, i + j * 50 + 25]);
      }
    });
    // the crystals, pale and see-through, a white edge on their lit side
    g.beginPath();
    for (const [x, y, w, h, lean] of shards) {
      g.moveTo(x - w / 2, y);
      g.lineTo(x - w * 0.2 + lean * 0.5, y + h * 0.6);
      g.lineTo(x + lean, y + h);
      g.lineTo(x + w / 2, y);
      g.closePath();
    }
    g.fillStyle = rgba('#bfe0f4', 0.55);
    g.fill();
    g.strokeStyle = rgba('#ffffff', 0.85);
    g.lineWidth = 0.014 * m;
    g.stroke();
    // a darker facet down each, for their depth
    g.fillStyle = rgba('#3a6a8a', 0.45);
    g.beginPath();
    for (const [x, y, w, h, lean] of shards) {
      g.moveTo(x, y);
      g.lineTo(x + lean, y + h);
      g.lineTo(x + w / 2, y);
    }
    g.fill();
    // the frozen band they grow from (not flat: ragged on both sides)
    if (!hit) {
      g.fillStyle = '#e8f6ff';
      g.beginPath();
      for (const s of spans) {
        const [A, B] = px(v, s);
        g.moveTo(A, mid);
        for (let x = A; x <= B; x += 0.08 * m) g.lineTo(x, mid - (0.03 + 0.04 * hash(Math.round(x), 1)) * m);
        for (let x = B; x >= A; x -= 0.08 * m) g.lineTo(x, mid + (0.03 + 0.04 * hash(Math.round(x), 2)) * m);
        g.closePath();
      }
      g.fill();
    }
    // the red cracks through it, branching, burning on the kick
    g.globalCompositeOperation = 'lighter';
    g.beginPath();
    for (const [x, y, w, h, lean, k] of shards) {
      if (k % 3) continue;
      const rnd = rand(k * 11 + 5);
      bolt(g, x, y, x + lean * 0.7, y + h * 0.7, 4, w * 0.25, rnd);
    }
    hot(g, 0.03 * m, DANGER, 0.7 + 0.3 * mf.kick, 0.4);
    // the shards' points, red-hot like the spikes they are
    g.fillStyle = rgba(DANGER, 0.85 + 0.15 * mf.beat);
    g.beginPath();
    for (const [x, y, , h, lean] of shards) {
      const tx = x + lean,
        ty = y + h,
        d = Math.sign(h) * 0.13 * m;
      g.moveTo(tx, ty);
      g.lineTo(tx - lean * 0.13 - 0.025 * m, ty - d);
      g.lineTo(tx - lean * 0.13 + 0.025 * m, ty - d);
    }
    g.fill();
    // the glints and the frost in the air round it
    g.strokeStyle = rgba('#ffffff', 0.9);
    g.lineWidth = 0.012 * m;
    g.beginPath();
    for (let i = 0; i < Math.round(2 + 8 * mf.hat); i++) {
      const [x, y, , h] = shards[Math.floor(hash(fr, i) * shards.length)],
        gy = y + h * 0.8,
        r = (0.04 + 0.05 * hash(fr, i + 50)) * m;
      g.moveTo(x - r, gy);
      g.lineTo(x + r, gy);
      g.moveTo(x, gy - r);
      g.lineTo(x, gy + r);
    }
    g.stroke();
    for (const s of spans) {
      const [A, B] = px(v, s);
      glowDot(g, (A + B) / 2, mid, (B - A) * 0.55, DANGER, (0.15 + 0.35 * mf.kick) * f.glow);
      glowDot(g, (A + B) / 2, mid, (B - A) * 0.45, '#dff2ff', 0.18 * f.glow);
    }
    g.globalCompositeOperation = 'source-over';
  },
};

export const ZONES = {
  // live power cables strung wall to wall, sagging and swinging with the bass, a red-hot line along each burning on the
  // kick; sparks crackle along them on the hats, the snare throws arcs from cable to cable, and a severed cable whips
  // about spitting fire
  wires(f, o, box, rr) {
    const { g, v, mf, t, T } = f,
      m = v.ppm,
      { X0, X1, lo, hi } = box,
      p = push(mf),
      cables = [];
    inside(g, box);
    for (let y = lo + 0.35, k = 0; y < hi; y += 0.95, k++) cables.push([y, k]);
    // a cable's point at u (0..1) across the shaft
    const C = ([y, k], u) => {
      const sag = (0.3 + Math.sin(t * 1.7 + k * 1.3) * (0.06 + 0.12 * mf.bass)) * m;
      return [X0 + (X1 - X0) * u + Math.sin(t * 2.3 + k) * 0.05 * m * mf.bass, v.sy(y) + sag * (1 - (2 * u - 1) ** 2)];
    };
    // the cables: dark and thick, a red-hot line in each, a white flash down them on the kick
    g.beginPath();
    for (const c of cables)
      for (let i = 0; i <= 12; i++) {
        const [x, y] = C(c, i / 12);
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
    g.strokeStyle = '#0c0a10';
    g.lineWidth = 0.13 * m;
    g.stroke();
    g.globalCompositeOperation = 'lighter';
    hot(g, 0.04 * m, DANGER, (0.55 + 0.45 * mf.kick) * Math.min(1, p), 0.35);
    // the clamps on the walls they hang from, a red lamp on each
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = T.near;
    g.beginPath();
    for (const c of cables)
      for (const u of [0, 1]) {
        const [x, y] = C(c, u);
        g.rect(x - 0.1 * m, y - 0.12 * m, 0.2 * m, 0.24 * m);
      }
    g.fill();
    g.globalCompositeOperation = 'lighter';
    for (const c of cables)
      for (const u of [0, 1]) {
        const [x, y] = C(c, u);
        glowDot(g, x, y, (0.15 + 0.25 * mf.kick) * m, DANGER, 0.8);
      }
    // the arcs between the cables on the snare (and now and then anyway), and the old crackle wall to wall
    g.beginPath();
    const arcs = Math.round((1 + 4 * mf.snare + 2 * (mf.drop || 0)) * Math.max(1, cables.length / 3));
    for (let i = 0; i < arcs && cables.length > 1; i++) {
      const k = Math.floor(rr() * (cables.length - 1)),
        u = 0.1 + 0.8 * rr(),
        [xa, ya] = C(cables[k], u),
        [xb, yb] = C(cables[k + 1], u + (rr() - 0.5) * 0.2);
      bolt(g, xa, ya, xb, yb, 8, 0.12 * m, rr);
    }
    for (const c of cables) {
      if (rr() > 0.25 + 0.6 * mf.hat) continue;
      const [xa, ya] = C(c, 0),
        [xb, yb] = C(c, 1);
      bolt(g, xa, ya - 0.1 * m, xb, yb - 0.1 * m, 12, 0.1 * m, rr);
    }
    hot(g, 0.03 * m * p, DANGER, 0.9);
    // the sparks crackling along them on the hats
    g.strokeStyle = rgba('#ffe0d0', 0.95);
    g.lineWidth = 0.015 * m;
    g.beginPath();
    const sparks = Math.round((4 + 22 * mf.hat) * p);
    for (let i = 0; i < sparks; i++) {
      const [x, y] = C(cables[Math.floor(rr() * cables.length)], rr()),
        a = rr() * TAU,
        r = (0.05 + 0.25 * rr()) * m;
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r + 0.05 * m);
      if (i < 6) glowDot(g, x, y, 0.2 * m, '#ff6a7a', 0.6 * f.glow);
    }
    g.stroke();
    // the severed cable: hanging from a wall, whipping with the bass, fire spitting from its end
    if (cables.length) {
      g.globalCompositeOperation = 'source-over';
      const side = hash(Math.round(o.t * 10), 3) < 0.5 ? 0 : 1,
        [ax, ay] = C(cables[Math.floor(cables.length / 2)], side),
        sw = Math.sin(t * (3 + 3 * mf.bass)) * (0.6 + 0.6 * mf.bass),
        ex = ax + (side ? -1 : 1) * (0.8 + 0.4 * Math.cos(sw)) * m,
        ey = ay + (1.2 + 0.5 * Math.sin(sw)) * m;
      g.strokeStyle = '#0c0a10';
      g.lineWidth = 0.08 * m;
      g.beginPath();
      g.moveTo(ax, ay);
      g.quadraticCurveTo(ax + (ex - ax) * 0.2, ey, ex, ey);
      g.stroke();
      g.globalCompositeOperation = 'lighter';
      glowDot(g, ex, ey, (0.3 + 0.4 * mf.kick + 0.3 * rr()) * m, '#ff6a4a', 1);
      g.strokeStyle = rgba('#ffd0b0', 0.9);
      g.lineWidth = 0.015 * m;
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = rr() * TAU,
          r = (0.1 + 0.4 * rr()) * m;
        g.moveTo(ex, ey);
        g.lineTo(ex + Math.cos(a) * r, ey + Math.abs(Math.sin(a)) * r);
      }
      g.stroke();
    }
  },

  // the picture breaking up: scanlines rolling with the bass, bands of the stretch torn sideways in red and magenta
  // (each drawn twice, split like bad RGB), dead pixels sputtering on the hats, the kick tearing bright bars right across,
  // the snare dropping corrupted blocks and broken warning glyphs
  glitch(f, o, box, rr) {
    const { g, v, mf, t } = f,
      m = v.ppm,
      { X0, X1, lo, hi } = box,
      W = X1 - X0,
      p = push(mf),
      fr = tick(f),
      MAG = '#ff3df0';
    inside(g, box);
    g.globalCompositeOperation = 'lighter';
    // the scanlines, wavering with the bass
    g.strokeStyle = rgba(DANGER, 0.22);
    g.lineWidth = 0.025 * m;
    g.beginPath();
    for (let y = lo; y < hi; y += 0.14) {
      const Y = v.sy(y),
        sh = Math.sin(y * 3 + t * 6) * 0.15 * m * mf.bass;
      g.moveTo(X0 + sh, Y);
      g.lineTo(X1 + sh, Y);
    }
    g.stroke();
    // the torn bands: red and magenta copies of a bar, slid apart
    const bands = Math.round((hi - lo) * (1.6 + 1.2 * p));
    for (const [col, dx] of [[DANGER, -1], [MAG, 1]]) {
      g.fillStyle = rgba(col, 0.45 + 0.3 * mf.beat);
      g.beginPath();
      for (let i = 0; i < bands; i++) {
        const y = lo + (hi - lo) * hash(fr >> 1, i),
          h = (0.05 + 0.25 * hash(fr >> 1, i + 99)) * m,
          x = X0 + W * hash(fr >> 2, i + 7) * 0.7,
          w = W * (0.15 + 0.5 * hash(fr >> 2, i + 3)),
          split = dx * (0.04 + 0.12 * mf.kick) * m;
        g.rect(x + split, v.sy(y), Math.min(w, X1 - x), h);
      }
      g.fill();
    }
    // the dead pixels on the hats
    g.fillStyle = rgba('#ffffff', 0.9);
    g.beginPath();
    const dots = Math.round((10 + 50 * mf.hat) * p);
    for (let i = 0; i < dots; i++) {
      const s = (0.05 + 0.1 * rr()) * m;
      g.rect(X0 + rr() * W, v.sy(lo + rr() * (hi - lo)), s, s);
    }
    g.fill();
    g.fillStyle = rgba(DANGER, 0.9);
    g.beginPath();
    for (let i = 0; i < dots; i++) {
      const s = (0.08 + 0.14 * rr()) * m;
      g.rect(X0 + rr() * W, v.sy(lo + rr() * (hi - lo)), s, s);
    }
    g.fill();
    // the kick's tears: thin bright bars across the whole shaft
    if (mf.kick > 0.1) {
      g.fillStyle = rgba('#ffffff', 0.7 * mf.kick);
      g.beginPath();
      for (let i = 0; i < 3; i++) g.rect(X0, v.sy(lo + (hi - lo) * hash(fr, i + 300)), W, (0.03 + 0.05 * rr()) * m);
      g.fill();
    }
    // a corrupted waveform zigzagging wall to wall, shifted by the bass
    g.beginPath();
    for (let k = 0; k < 3; k++) {
      const y = lo + ((hi - lo) * (k + 0.5)) / 3;
      for (let i = 0; i <= 24; i++) {
        const x = X0 + (W * i) / 24,
          a = (i % 2 ? 1 : -1) * (0.1 + 0.25 * hash(fr >> 1, i + k * 40) + 0.3 * mf.bass) * m;
        i ? g.lineTo(x, v.sy(y) + a) : g.moveTo(x, v.sy(y) + a);
      }
    }
    hot(g, 0.02 * m, DANGER, 0.85, 0.3);
    // the snare's corrupted blocks: big slabs of striped red with a warning glyph burnt in them
    const blocks = Math.round(1 + 3 * mf.snare * p + (o.tier ?? 0));
    g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < blocks; i++) {
      const bw = (0.5 + 0.9 * hash(fr >> 2, i + 500)) * m,
        bh = (0.3 + 0.6 * hash(fr >> 2, i + 501)) * m,
        x = X0 + (W - bw) * hash(fr >> 2, i + 502),
        Y = v.sy(lo + (hi - lo) * hash(fr >> 2, i + 503));
      g.fillStyle = rgba('#20040c', 0.75);
      g.fillRect(x, Y, bw, bh);
      g.fillStyle = rgba(i % 2 ? MAG : DANGER, 0.8);
      for (let y = 0; y < bh; y += 0.08 * m) g.fillRect(x + (hash(fr, i * 9 + y) - 0.5) * 0.1 * m, Y + y, bw, 0.035 * m);
      const cx = x + bw / 2,
        cy = Y + bh / 2,
        r = Math.min(bw, bh) * 0.35;
      g.strokeStyle = '#ffffff';
      g.lineWidth = 0.035 * m;
      g.beginPath();
      g.moveTo(cx, cy - r);
      g.lineTo(cx + r, cy + r * 0.8);
      g.lineTo(cx - r, cy + r * 0.8);
      g.closePath();
      g.moveTo(cx, cy - r * 0.3);
      g.lineTo(cx, cy + r * 0.3);
      g.moveTo(cx, cy + r * 0.5);
      g.lineTo(cx, cy + r * 0.6);
      g.stroke();
    }
  },

  // a hornet swarm: dark wasps with red-hot abdomens and stingers wheeling round the shaft in clouds, their wings a blur
  // shimmering on the hats; the bass sways the clouds, the kick bursts them outwards, the snare sends some diving in
  // streaks
  swarm(f, o, box, rr) {
    const { g, v, mf, t } = f,
      m = v.ppm,
      { X0, X1, lo, hi } = box,
      W = X1 - X0,
      cx = (X0 + X1) / 2,
      p = push(mf),
      n = Math.min(80, Math.round((hi - lo) * (8 + 2 * (o.tier ?? 0)) * p)),
      bees = [];
    inside(g, box);
    for (let i = 0; i < n; i++) {
      const h1 = hash(i, 1),
        h2 = hash(i, 2),
        sp = 1.2 + 1.5 * hash(i, 3),
        a = t * sp + h1 * TAU,
        burst = 1 + 0.5 * mf.kick,
        x = cx + Math.sin(a) * W * 0.42 * burst * (0.6 + 0.4 * h2) + Math.sin(t * 1.3 + i) * 0.4 * m * mf.bass,
        y = v.sy(lo + (hi - lo) * hash(i, 4) + Math.cos(a * 1.3) * 0.5 * burst),
        // (heading along its path)
        vx = Math.cos(a) * W * 0.42 * sp,
        vy = -Math.sin(a * 1.3) * 0.65 * m * sp,
        ang = Math.atan2(vy, vx),
        dive = mf.snare > 0.3 && i % 5 === 0;
      bees.push([x, y, ang, dive, (0.13 + 0.06 * h2) * m]);
    }
    // the dark cloud they make and their streaks behind them
    for (let i = 0; i < 6 && f.glow; i++)
      glowDot(g, cx + Math.sin(t + i) * W * 0.3, v.sy(lo + ((hi - lo) * (i + 0.5)) / 6), 1.2 * m, '#1a0606', 0.5);
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rgba(DANGER, 0.35);
    g.lineWidth = 0.025 * m;
    g.beginPath();
    for (const [x, y, ang, dive, s] of bees) {
      const l = s * (dive ? 9 : 3);
      g.moveTo(x, y);
      g.lineTo(x - Math.cos(ang) * l, y - Math.sin(ang) * l);
    }
    g.stroke();
    // their wings, a pale blur beating on the hats
    g.fillStyle = rgba('#e8e0ff', 0.25 + 0.4 * mf.hat);
    g.beginPath();
    for (const [x, y, ang, , s] of bees) {
      const fl = Math.sin(t * 90 + x) * 0.4;
      for (const d of [-1, 1]) {
        const wa = ang + d * (1.6 + fl),
          wx = x + Math.cos(wa) * s * 0.9,
          wy = y + Math.sin(wa) * s * 0.9;
        g.moveTo(wx + s * 0.8, wy);
        g.ellipse(wx, wy, s * 0.8, s * 0.35, wa, 0, TAU);
      }
    }
    g.fill();
    g.globalCompositeOperation = 'source-over';
    // their bodies, dark, and their red-hot abdomens and stingers
    g.fillStyle = '#120c06';
    g.beginPath();
    for (const [x, y, ang, , s] of bees) {
      g.moveTo(x + Math.cos(ang) * s, y + Math.sin(ang) * s);
      g.ellipse(x, y, s, s * 0.45, ang, 0, TAU);
    }
    g.fill();
    g.fillStyle = rgba(DANGER, 0.85 + 0.15 * mf.beat);
    g.beginPath();
    for (const [x, y, ang, , s] of bees) {
      const bx = x - Math.cos(ang) * s * 0.55,
        by = y - Math.sin(ang) * s * 0.55,
        nx = -Math.sin(ang) * s * 0.3,
        ny = Math.cos(ang) * s * 0.3;
      g.moveTo(bx + nx, by + ny);
      g.lineTo(x - Math.cos(ang) * s * 1.7, y - Math.sin(ang) * s * 1.7);
      g.lineTo(bx - nx, by - ny);
      g.closePath();
    }
    g.fill();
    // the swarm's buzz: a crackle of red specks on the hats
    g.fillStyle = rgba('#ff9a8a', 0.9);
    g.beginPath();
    for (let i = 0; i < Math.round(6 + 24 * mf.hat); i++) g.rect(X0 + rr() * W, v.sy(lo + rr() * (hi - lo)), 0.03 * m, 0.03 * m);
    g.fill();
  },

  // a sandstorm: a haze of dust, streaks of sand driven slantwise by the wind (its slant swinging with the bass), dust
  // clouds rolling through, bone splinters and thorned tumbleweeds tumbling across, red-hot grit sparking on the hats;
  // the kick blows a gust through, the snare hurls a thorn ball
  sand(f, o, box, rr) {
    const { g, v, mf, t } = f,
      m = v.ppm,
      { X0, X1, Y0, Y1, lo, hi } = box,
      W = X1 - X0,
      p = push(mf),
      fr = tick(f),
      wind = 0.3 + 0.25 * Math.sin(t * 0.8) + 0.25 * mf.bass,
      gust = 1 + 1.5 * mf.kick;
    inside(g, box);
    g.fillStyle = rgba('#c89a58', 0.3 + 0.15 * mf.kick);
    g.fillRect(X0, Y0, W, Y1 - Y0);
    // the dust clouds rolling across
    for (let i = 0; i < 8 && f.glow; i++) {
      const x = X0 + ((((hash(i, 1) + t * (0.15 + 0.1 * hash(i, 2)) * gust) % 1) + 1) % 1) * W,
        y = v.sy(lo + (hi - lo) * hash(i, 3));
      glowDot(g, x, y, (1 + 0.6 * hash(i, 4)) * m, '#d8b070', 0.35);
    }
    // the streaks, light and dark, all slanting with the wind
    const n = Math.round((hi - lo) * 12 * p);
    for (const [col, a, k0] of [['#f4dcaa', 0.75, 0], ['#7a5428', 0.6, 1]]) {
      g.strokeStyle = rgba(col, a);
      g.lineWidth = (k0 ? 0.03 : 0.02) * m;
      g.beginPath();
      for (let i = k0; i < n; i += 2) {
        const sp = (2.5 + 2 * hash(i, 5)) * gust,
          x = X0 + ((((hash(i, 6) + t * sp * 0.25) % 1) + 1) % 1) * W,
          y = v.sy(lo + (hi - lo) * hash(i, 7)),
          l = (0.3 + 0.5 * hash(i, 8)) * m * gust;
        g.moveTo(x, y);
        g.lineTo(x - l, y - l * wind);
      }
      g.stroke();
    }
    // the bone splinters tumbling through
    g.fillStyle = '#efe3c4';
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const x = X0 + ((((hash(i, 11) + t * (0.35 + 0.2 * hash(i, 12)) * gust) % 1) + 1) % 1) * W,
        y = v.sy(lo + (hi - lo) * hash(i, 13)) + Math.sin(t * 3 + i) * 0.2 * m,
        a = t * (4 + 4 * hash(i, 14)) + i,
        r = (0.08 + 0.08 * hash(i, 15)) * m;
      g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      g.lineTo(x + Math.cos(a + 2.8) * r * 0.4, y + Math.sin(a + 2.8) * r * 0.4);
      g.lineTo(x - Math.cos(a) * r, y - Math.sin(a) * r);
      g.lineTo(x + Math.cos(a - 0.4) * r * 0.4, y + Math.sin(a - 0.4) * r * 0.4);
    }
    g.fill();
    // the tumbleweeds, thorned, red at the points (one more hurled through on the snare)
    const weeds = Math.max(1, Math.round((hi - lo) / 3)) + (mf.snare > 0.3 ? 1 : 0);
    g.strokeStyle = '#4a3418';
    g.lineWidth = 0.025 * m;
    g.beginPath();
    const thorns = [];
    for (let i = 0; i < weeds; i++) {
      const x = X0 + ((((hash(i, 21) + t * 0.3 * gust) % 1) + 1) % 1) * W,
        y = v.sy(lo + (hi - lo) * hash(i, 22)) + Math.abs(Math.sin(t * 4 + i)) * -0.3 * m,
        r = 0.3 * m,
        a = -t * 6 + i;
      for (let k = 0; k < 7; k++) {
        const b = a + k * 0.9;
        g.moveTo(x + Math.cos(b) * r, y + Math.sin(b) * r);
        g.quadraticCurveTo(x, y, x + Math.cos(b + 2.4) * r, y + Math.sin(b + 2.4) * r);
        thorns.push([x + Math.cos(b) * r, y + Math.sin(b) * r, b]);
      }
    }
    g.stroke();
    g.fillStyle = DANGER;
    g.beginPath();
    for (const [x, y, b] of thorns) {
      g.moveTo(x - Math.sin(b) * 0.03 * m, y + Math.cos(b) * 0.03 * m);
      g.lineTo(x + Math.cos(b) * 0.12 * m, y + Math.sin(b) * 0.12 * m);
      g.lineTo(x + Math.sin(b) * 0.03 * m, y - Math.cos(b) * 0.03 * m);
    }
    g.fill();
    // the red-hot grit, sparking on the hats
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rgba('#ff5a4a', 0.9);
    g.lineWidth = 0.025 * m;
    g.beginPath();
    for (let i = 0; i < Math.round((8 + 30 * mf.hat) * p); i++) {
      const x = X0 + rr() * W,
        y = v.sy(lo + rr() * (hi - lo)),
        l = 0.12 * m;
      g.moveTo(x, y);
      g.lineTo(x - l, y - l * wind);
    }
    g.stroke();
    if (mf.kick > 0.2 && f.glow) glowDot(g, X0 + W * hash(fr >> 3, 1), v.sy((lo + hi) / 2), W * 0.6, '#ffb070', 0.3 * mf.kick);
  },

  // a radiation leak: warning trefoils turning in the air, pulsing on the beat, shockwaves ringing out of them on the
  // kick; particle tracks shooting through on the hats (red and a sick green), a glowing dust drifting, and the snare
  // striking a hard red flash of rays through the stretch
  radiation(f, o, box, rr) {
    const { g, v, mf, t } = f,
      m = v.ppm,
      { X0, X1, lo, hi } = box,
      W = X1 - X0,
      cx = (X0 + X1) / 2,
      p = push(mf),
      TOX = '#a6ff3a',
      signs = [];
    inside(g, box);
    for (let y = lo + 0.7, i = 0; y < hi; y += 1.6, i++) {
      const sx = cx + (i % 2 ? 1 : -1) * W * 0.28 + Math.sin(t * 0.7 + i) * 0.2 * m;
      signs.push([sx, v.sy(y), t * (0.8 + 0.4 * (i % 2)) * (i % 2 ? 1 : -1), i]);
    }
    g.globalCompositeOperation = 'lighter';
    // the shockwaves: rings expanding from each sign, a new one each beat, a hard one on the kick
    const ph = (t / (f.L?.A?.beat || 0.5)) % 1;
    g.beginPath();
    for (const [x, y] of signs)
      for (const u of [ph, (ph + 0.5) % 1]) {
        const r = (0.3 + 1.8 * u) * m;
        g.moveTo(x + r, y);
        g.arc(x, y, r, 0, TAU);
      }
    g.strokeStyle = rgba(DANGER, 0.25 + 0.4 * mf.kick);
    g.lineWidth = (0.03 + 0.05 * mf.kick) * m;
    g.stroke();
    // the glowing dust drifting, green and red
    for (const [col, k0] of [[TOX, 0], [DANGER, 1]]) {
      g.fillStyle = rgba(col, 0.75);
      g.beginPath();
      for (let i = k0; i < (hi - lo) * 10; i += 2) {
        const x = X0 + W * hash(i, 31) + Math.sin(t * 1.5 + i) * 0.2 * m,
          y = v.sy(lo + ((((hash(i, 32) + t * 0.08) % 1) + 1) % 1) * (hi - lo)),
          r = (0.02 + 0.03 * hash(i, 33)) * m * (1 + mf.beat);
        g.moveTo(x + r, y);
        g.arc(x, y, r, 0, TAU);
      }
      g.fill();
    }
    // the particle tracks on the hats: straight, thin, bright at their heads
    const tracks = Math.round((10 + 20 * mf.hat) * p);
    for (const [col, k0] of [[TOX, 0], ['#ff6a7a', 1]]) {
      g.strokeStyle = rgba(col, 0.85);
      g.lineWidth = 0.018 * m;
      g.beginPath();
      for (let i = k0; i < tracks; i += 2) {
        const x = X0 + rr() * W,
          y = v.sy(lo + rr() * (hi - lo)),
          a = rr() * TAU,
          l = (0.4 + 1.2 * rr()) * m;
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        // (a kink where it scatters)
        g.lineTo(x + Math.cos(a) * l + Math.cos(a + 1) * l * 0.3, y + Math.sin(a) * l + Math.sin(a + 1) * l * 0.3);
      }
      g.stroke();
    }
    // the snare's strike: rays fanning out from a sign, hard red
    if (mf.snare > 0.15 && signs.length) {
      const [x, y] = signs[Math.floor(rr() * signs.length)];
      g.beginPath();
      for (let i = 0; i < 9; i++) {
        const a = rr() * TAU,
          l = (1.5 + 2 * rr()) * m;
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      }
      hot(g, 0.04 * m * mf.snare, DANGER, 1);
      glowDot(g, x, y, 1.5 * m, DANGER, mf.snare * 0.8);
    }
    // the trefoils: a yellow-free warning, red blades on a black disc, turning, swelling on the kick
    g.globalCompositeOperation = 'source-over';
    for (const [x, y] of signs) glowDot(g, x, y, (0.9 + 0.4 * mf.kick) * m, DANGER, (0.4 + 0.4 * mf.beat) * f.glow);
    g.fillStyle = '#100608';
    g.beginPath();
    for (const [x, y, , i] of signs) {
      const r = (0.55 + 0.08 * mf.kick + 0.04 * Math.sin(t * 3 + i)) * m;
      g.moveTo(x + r, y);
      g.arc(x, y, r, 0, TAU);
    }
    g.fill();
    // (a dashed warning ring round each, turning the other way)
    g.strokeStyle = rgba(DANGER, 0.9);
    g.lineWidth = 0.05 * m;
    g.beginPath();
    for (const [x, y, a] of signs)
      for (let k = 0; k < 8; k++) {
        const b = -a * 0.7 + (k * TAU) / 8;
        g.moveTo(x + Math.cos(b) * 0.68 * m, y + Math.sin(b) * 0.68 * m);
        g.arc(x, y, 0.68 * m, b, b + 0.45);
      }
    g.stroke();
    g.fillStyle = rgba(DANGER, 0.85 + 0.15 * mf.beat);
    g.beginPath();
    for (const [x, y, a, i] of signs) {
      const r = (0.48 + 0.08 * mf.kick + 0.04 * Math.sin(t * 3 + i)) * m;
      for (let k = 0; k < 3; k++) {
        const b = a + (k * TAU) / 3;
        g.moveTo(x + Math.cos(b - 0.5) * r * 0.22, y + Math.sin(b - 0.5) * r * 0.22);
        g.arc(x, y, r, b - 0.5, b + 0.5);
        g.arc(x, y, r * 0.22, b + 0.5, b - 0.5, true);
      }
      g.moveTo(x + r * 0.13, y);
      g.arc(x, y, r * 0.13, 0, TAU);
    }
    g.fill();
  },

  // scalding steam: pipes up both walls with red valve wheels and gauges, nozzles blasting jets across the shaft (a
  // red-hot throat, a white plume billowing out), a jet blasting on each snare, the kick bursting them all, the bass
  // swaying the plumes up, drops hissing on the hats
  steam(f, o, box, rr) {
    const { g, v, mf, t, T } = f,
      m = v.ppm,
      { X0, X1, Y0, Y1, lo, hi } = box,
      W = X1 - X0,
      p = push(mf),
      fr = tick(f),
      jets = [];
    inside(g, box);
    for (let y = lo + 0.4, i = 0; y < hi; y += 1.1, i++) jets.push([i % 2, v.sy(y), i]);
    // the pipes up the walls, flanged
    g.fillStyle = mixHex(T.near, '#4a3a30', 0.5);
    g.fillRect(X0, Y0, 0.25 * m, Y1 - Y0);
    g.fillRect(X1 - 0.25 * m, Y0, 0.25 * m, Y1 - Y0);
    g.fillStyle = '#2a201a';
    g.beginPath();
    for (let y = Y0; y < Y1; y += 0.7 * m) {
      g.rect(X0 - 0.03 * m, y, 0.31 * m, 0.08 * m);
      g.rect(X1 - 0.28 * m, y, 0.31 * m, 0.08 * m);
    }
    g.fill();
    // each jet: its length pulsing, full on its snare, all of them on the kick
    const blast = ([side, , i]) =>
      Math.min(1.1, (0.45 + 0.25 * Math.sin(t * 5 + i * 2)) * p + 0.6 * mf.kick + (i % 3 === Math.floor(t * 2) % 3 ? mf.snare : 0));
    g.globalCompositeOperation = 'lighter';
    for (const j of jets) {
      const [side, Y, i] = j,
        d = side ? -1 : 1,
        x0 = side ? X1 - 0.3 * m : X0 + 0.3 * m,
        L = blast(j) * W * 0.95;
      // (the plume: puffs spreading and rising along the jet, rolling outwards)
      for (let k = 0; k < 12; k++) {
        const u = ((k + ((t * 3 + i * 0.37) % 1)) / 12) ** 1.2,
          x = x0 + d * L * u,
          y = Y - u * u * (0.4 + 0.6 * mf.bass) * m + Math.sin(t * 4 + k + i) * 0.08 * m * u,
          r = (0.2 + 0.9 * u) * m * (0.6 + 0.5 * Math.min(1, blast(j)));
        glowDot(g, x, y, r, '#e8eef0', 0.5 * (1 - u * 0.5));
      }
      // (the scalding throat: red-hot at the nozzle)
      glowDot(g, x0 + d * 0.3 * m, Y, (0.35 + 0.3 * blast(j)) * m, DANGER, 0.85);
      glowDot(g, x0 + d * 0.15 * m, Y, 0.18 * m, '#ffffff', 0.6 * blast(j));
    }
    // the jets' cores: hard white streaks of pressure
    g.strokeStyle = rgba('#ffffff', 0.55);
    g.lineWidth = 0.03 * m;
    g.beginPath();
    for (const j of jets) {
      const [side, Y, i] = j,
        d = side ? -1 : 1,
        x0 = side ? X1 - 0.3 * m : X0 + 0.3 * m,
        L = blast(j) * W * 0.6;
      for (let k = 0; k < 4; k++) {
        const s = (hash(fr, i * 7 + k) - 0.5) * 0.25 * m,
          a = ((t * 4 + k * 0.25) % 1) * L;
        g.moveTo(x0 + d * a, Y + s * (a / L));
        g.lineTo(x0 + d * Math.min(L, a + 0.4 * m), Y + s * 1.3 * (a / L));
      }
    }
    g.stroke();
    // the hissing drops on the hats
    g.fillStyle = rgba('#ffd8d0', 0.9);
    g.beginPath();
    for (let i = 0; i < Math.round((6 + 30 * mf.hat) * p); i++) {
      const x = X0 + rr() * W,
        y = v.sy(lo + rr() * (hi - lo));
      g.rect(x, y, 0.035 * m, 0.035 * m);
    }
    g.fill();
    // the nozzles, the valve wheels and gauges by them (red, the needles shaking in the red)
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#1a1410';
    g.beginPath();
    for (const [side, Y] of jets) {
      const x = side ? X1 - 0.25 * m : X0 + 0.25 * m,
        d = side ? -1 : 1;
      g.moveTo(x, Y - 0.12 * m);
      g.lineTo(x + d * 0.22 * m, Y - 0.07 * m);
      g.lineTo(x + d * 0.22 * m, Y + 0.07 * m);
      g.lineTo(x, Y + 0.12 * m);
    }
    g.fill();
    g.strokeStyle = DANGER;
    g.lineWidth = 0.035 * m;
    g.beginPath();
    for (const [side, Y, i] of jets) {
      const x = side ? X1 - 0.12 * m : X0 + 0.12 * m,
        y = Y - 0.35 * m,
        a = t * 2 + i;
      g.moveTo(x + 0.11 * m, y);
      g.arc(x, y, 0.11 * m, 0, TAU);
      for (let k = 0; k < 3; k++) {
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a + (k * TAU) / 3) * 0.11 * m, y + Math.sin(a + (k * TAU) / 3) * 0.11 * m);
      }
    }
    g.stroke();
    g.fillStyle = '#f0e8e0';
    g.beginPath();
    for (const [side, Y] of jets) {
      const x = side ? X1 - 0.12 * m : X0 + 0.12 * m;
      g.moveTo(x + 0.08 * m, Y + 0.32 * m);
      g.arc(x, Y + 0.32 * m, 0.08 * m, 0, TAU);
    }
    g.fill();
    g.strokeStyle = DANGER;
    g.lineWidth = 0.02 * m;
    g.beginPath();
    for (const j of jets) {
      const [side, Y] = j,
        x = side ? X1 - 0.12 * m : X0 + 0.12 * m,
        a = -Math.PI * 0.9 + Math.PI * 0.8 * Math.min(1, blast(j)) + (rr() - 0.5) * 0.2;
      g.moveTo(x, Y + 0.32 * m);
      g.lineTo(x + Math.cos(a) * 0.07 * m, Y + 0.32 * m + Math.sin(a) * 0.07 * m);
    }
    g.stroke();
  },

  // the strobe: speaker stacks on the walls, their cones pumping on the kick, laser fans sweeping across from them with
  // the bass, the snare crossing two beams in an X, the whole stretch flashing white on the kick and on hat-ticks,
  // glitter spraying through
  strobe(f, o, box, rr) {
    const { g, v, mf, t, T } = f,
      m = v.ppm,
      { X0, X1, Y0, Y1, lo, hi } = box,
      W = X1 - X0,
      p = push(mf),
      fr = tick(f),
      MAG = '#ff3df0';
    inside(g, box);
    // the flash: white on the kick, red on the odd ticks of the hats
    g.globalCompositeOperation = 'lighter';
    if (mf.kick > 0.05) {
      g.fillStyle = rgba('#ffffff', Math.min(0.28, 0.22 * mf.kick * p));
      g.fillRect(X0, Y0, W, Y1 - Y0);
    }
    if (hash(fr, 1) < 0.6 * mf.hat) {
      g.fillStyle = rgba(DANGER, 0.25);
      g.fillRect(X0, Y0, W, Y1 - Y0);
    }
    // the laser fans from the walls, sweeping with the bass
    const fans = [];
    for (let y = lo + 0.6, i = 0; y < hi; y += 1.6, i++) fans.push([i % 2 ? X1 : X0, v.sy(y), i]);
    for (const [col, k0] of [[DANGER, 0], [MAG, 1]]) {
      g.beginPath();
      for (const [x, y, i] of fans) {
        if (i % 2 !== k0 && fans.length > 1) continue;
        const d = x === X0 ? 1 : -1,
          sw = Math.sin(t * (1.2 + mf.bass) + i) * 0.5;
        for (let k = 0; k < 7; k++) {
          const a = sw + (k - 3) * 0.14;
          g.moveTo(x, y);
          g.lineTo(x + d * Math.cos(a) * W * 1.1, y + Math.sin(a) * W * 1.1);
        }
      }
      hot(g, 0.018 * m, col, 0.75 + 0.25 * mf.beat, 0.25);
    }
    // the snare's X: two big beams crossing the whole stretch
    if (mf.snare > 0.1) {
      g.beginPath();
      g.moveTo(X0, Y0);
      g.lineTo(X1, Y1);
      g.moveTo(X1, Y0);
      g.lineTo(X0, Y1);
      hot(g, 0.06 * m * mf.snare, DANGER, 1, 0.3);
    }
    // the glitter on the hats, red and white
    for (const [col, k0] of [['#ffffff', 0], [DANGER, 1]]) {
      g.fillStyle = rgba(col, 0.95);
      g.beginPath();
      for (let i = k0; i < Math.round((16 + 40 * mf.hat) * p); i += 2) {
        const x = X0 + rr() * W,
          y = v.sy(lo + rr() * (hi - lo)),
          s = (0.03 + 0.05 * rr()) * m;
        g.moveTo(x, y - s);
        g.lineTo(x + s * 0.4, y);
        g.lineTo(x, y + s);
        g.lineTo(x - s * 0.4, y);
      }
      g.fill();
    }
    // the speakers on the walls, cones pumping on the kick
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = mixHex(T.near, '#0a0a10', 0.5);
    g.fillRect(X0 - 0.1 * m, Y0, 0.55 * m, Y1 - Y0);
    g.fillRect(X1 - 0.45 * m, Y0, 0.55 * m, Y1 - Y0);
    g.strokeStyle = rgba(DANGER, 0.6 + 0.4 * mf.kick);
    g.lineWidth = 0.03 * m;
    g.fillStyle = '#05050a';
    g.beginPath();
    for (let y = lo + 0.3; y < hi; y += 0.7)
      for (const x of [X0 + 0.18 * m, X1 - 0.18 * m]) {
        const r = (0.2 + 0.03 * mf.kick) * m;
        g.moveTo(x + r, v.sy(y));
        g.arc(x, v.sy(y), r, 0, TAU);
        g.moveTo(x + r * 0.35, v.sy(y));
        g.arc(x, v.sy(y), r * 0.35, 0, TAU);
      }
    g.fill();
    g.stroke();
    for (const [x, y] of fans) glowDot(g, x, y, (0.4 + 0.4 * mf.kick) * m, DANGER, 0.9 * f.glow);
  },

  // a wall of fire: flame tongues licking up in three heats (dark red, orange, a hot core), swaying with the bass;
  // embers flying up on the hats, fireballs bursting on the kick, a jet of flame roaring across on the snare, smoke
  fire(f, o, box, rr) {
    const { g, v, mf, t } = f,
      m = v.ppm,
      { X0, X1, lo, hi } = box,
      W = X1 - X0,
      p = push(mf),
      fr = tick(f),
      flames = [];
    inside(g, box);
    // (scattered, not in rows: each its own size, its own flicker, licking up and dying back on its own cycle)
    const n = Math.min(80, Math.round((hi - lo) * 13));
    for (let k = 0; k < n; k++) {
      const life = (t * (0.9 + 0.6 * hash(k, 4)) + hash(k, 5)) % 1,
        x = X0 + W * (0.02 + 0.96 * hash(k, 1)),
        y = v.sy(lo + (hi - lo) * (0.05 + 0.95 * hash(k, 6)) + life * 0.3),
        fl = (0.35 + 0.65 * Math.sin(life * Math.PI)) * (0.85 + 0.25 * Math.sin(t * 13 + k * 2.1)) + 0.15 * hash(fr, k),
        big = 0.5 + 0.9 * hash(k, 2) ** 2,
        h = (0.75 + 0.3 * mf.kick) * m * fl * big * p,
        w = (0.2 + 0.08 * hash(k, 3)) * m * big,
        lean = (Math.sin(t * 2 + k) * 0.15 + mf.bass * 0.3 * Math.sin(t * 3 + k * 0.2)) * m;
      flames.push([x, y, w, h, lean]);
    }
    flames.sort((a, b) => a[1] - b[1]);
    // the heat under it all: a glow along the stretch, brighter on the kick
    for (let i = 0; i < 4 && f.glow; i++)
      glowDot(g, X0 + W * (0.2 + 0.2 * i), v.sy(lo + ((i + 0.5) * (hi - lo)) / 4), W * 0.5, '#ff3a14', 0.25 + 0.25 * mf.kick);
    // the smoke over it
    for (let i = 0; i < 5 && f.glow; i++)
      glowDot(g, X0 + W * hash(i, 9), v.sy(lo + ((((hash(i, 8) + t * 0.15) % 1) + 1) % 1) * (hi - lo)), 1.1 * m, '#140808', 0.6);
    // the three heats, each a path of teardrop tongues, smaller and hotter inside
    g.globalCompositeOperation = 'lighter';
    for (const [col, s, a] of [['#b8101a', 1, 0.8], ['#ff5a14', 0.7, 0.75], ['#ffcf7a', 0.38, 0.8]]) {
      g.fillStyle = rgba(col, a);
      g.beginPath();
      for (const [x, y, w, h, lean] of flames) {
        const ww = w * s,
          hh = h * s;
        // (a tongue with a second, smaller one flicking off its side)
        g.moveTo(x - ww, y);
        g.quadraticCurveTo(x - ww * 1.1, y - hh * 0.45, x + lean * s, y - hh);
        g.quadraticCurveTo(x + ww * 0.4, y - hh * 0.55, x + ww * 0.9 - lean * 0.3, y - hh * 0.62);
        g.quadraticCurveTo(x + ww * 0.6, y - hh * 0.3, x + ww, y);
        g.quadraticCurveTo(x, y + ww * 0.8, x - ww, y);
      }
      g.fill();
    }
    // the embers flying up on the hats
    g.fillStyle = rgba('#ffb060', 0.95);
    g.beginPath();
    for (let i = 0; i < Math.round((12 + 30 * mf.hat) * p); i++) {
      const x = X0 + W * hash(i, 41) + Math.sin(t * 3 + i) * 0.2 * m,
        y = v.sy(lo + ((((hash(i, 42) + t * (0.2 + 0.2 * hash(i, 43))) % 1) + 1) % 1) * (hi - lo)),
        s = (0.025 + 0.03 * hash(fr, i)) * m;
      g.rect(x, y, s, s);
    }
    g.fill();
    // the kick's fireballs: round bursts with a ring of heat
    const balls = Math.round(1 + 3 * mf.kick);
    for (let i = 0; i < balls && mf.kick > 0.1; i++) {
      const x = X0 + W * hash(fr >> 3, i + 60),
        y = v.sy(lo + (hi - lo) * hash(fr >> 3, i + 61));
      glowDot(g, x, y, (0.6 + 0.8 * mf.kick) * m, '#ff6a1a', mf.kick);
      glowDot(g, x, y, 0.35 * m, '#fff0c0', mf.kick);
    }
    // the snare's jet: a roar of flame from one wall across the stretch
    if (mf.snare > 0.15) {
      const side = (fr >> 4) % 2,
        y = v.sy(lo + (hi - lo) * hash(fr >> 4, 70)),
        x0 = side ? X1 : X0,
        d = side ? -1 : 1;
      for (let k = 0; k < 8; k++) {
        const u = k / 7;
        glowDot(g, x0 + d * u * W * mf.snare, y - u * u * 0.4 * m, (0.25 + 0.5 * u) * m, k < 3 ? '#ffcf7a' : DANGER, mf.snare);
      }
    }
  },

  // a whirlpool current: rings of foam spinning round the shaft, faster with the bass, bubbles spiralling in on the
  // hats, stinging jellyfish swept round it trailing red tentacles, a shock ring on the kick, a lash of current on the
  // snare
  whirl(f, o, box, rr) {
    const { g, v, mf, t } = f,
      m = v.ppm,
      { X0, X1, Y0, Y1, lo, hi } = box,
      W = X1 - X0,
      cx = (X0 + X1) / 2,
      p = push(mf),
      spin = t * (1.6 + 1.2 * mf.bass) * p,
      rx = W * 0.47;
    inside(g, box);
    g.fillStyle = rgba('#04202c', 0.4);
    g.fillRect(X0, Y0, W, Y1 - Y0);
    // the current: tilted rings of foam (the vortex seen from its side), broken into arcs that spin round
    g.globalCompositeOperation = 'lighter';
    for (const [col, a, w, k0] of [['#2a8a9a', 0.5, 0.07, 0], ['#e8fbff', 0.75, 0.025, 1]]) {
      g.strokeStyle = rgba(col, a);
      g.lineWidth = w * m;
      g.beginPath();
      for (let y = lo + 0.2, i = 0; y < hi; y += 0.45, i++) {
        const Y = v.sy(y),
          r = rx * (0.75 + 0.25 * Math.sin(y * 1.3 + t)),
          ry = 0.22 * m;
        for (let k = 0; k < 3; k++) {
          const a0 = spin * (i % 2 ? 1.1 : 1) + k * 2.1 + i + k0 * 0.4,
            span = 0.9 + 0.5 * hash(i, k);
          g.moveTo(cx + Math.cos(a0) * r, Y + Math.sin(a0) * ry);
          g.ellipse(cx, Y, r, ry, 0, a0, a0 + span);
        }
      }
      g.stroke();
    }
    // the funnel's red-hot heart, twisting down the middle, and the snare's lash: a bright spiral of current
    {
      g.beginPath();
      for (let i = 0; i <= 40; i++) {
        const u = i / 40,
          a = spin * 3 + u * 22,
          x = cx + Math.cos(a) * (0.12 + 0.1 * mf.bass) * m,
          y = v.sy(lo + u * (hi - lo));
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      hot(g, 0.04 * m, DANGER, 0.6 + 0.4 * mf.kick, 0.35);
    }
    if (mf.snare > 0.15) {
      g.beginPath();
      for (let i = 0; i <= 40; i++) {
        const u = i / 40,
          a = spin * 2 + u * 14;
        const x = cx + Math.cos(a) * rx * 0.9,
          y = v.sy(lo + u * (hi - lo)) + Math.sin(a) * 0.22 * m;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      hot(g, 0.03 * m * mf.snare, DANGER, 1, 0.3);
    }
    // the kick's shock ring
    if (mf.kick > 0.1) {
      g.strokeStyle = rgba('#ffffff', 0.6 * mf.kick);
      g.lineWidth = 0.05 * m;
      g.beginPath();
      const y = v.sy((lo + hi) / 2),
        s = 1.4 - mf.kick;
      g.ellipse(cx, y, rx * s, 0.4 * m * s * 2, 0, 0, TAU);
      g.stroke();
    }
    // the bubbles spiralling in, more on the hats
    g.strokeStyle = rgba('#dff6ff', 0.7);
    g.lineWidth = 0.014 * m;
    g.beginPath();
    for (let i = 0; i < Math.round((hi - lo) * (4 + 8 * mf.hat)); i++) {
      const a = spin * 1.4 + hash(i, 51) * TAU,
        rr2 = rx * (0.3 + 0.7 * hash(i, 52)),
        x = cx + Math.cos(a) * rr2,
        y = v.sy(lo + (hi - lo) * hash(i, 53)) + Math.sin(a) * 0.2 * m,
        r = (0.02 + 0.035 * hash(i, 54)) * m;
      g.moveTo(x + r, y);
      g.arc(x, y, r, 0, TAU);
    }
    g.stroke();
    // the jellyfish swept round: a pale dome, red stinging tentacles trailing behind
    g.globalCompositeOperation = 'source-over';
    const jel = [];
    for (let i = 0; i < Math.max(2, Math.round((hi - lo) / 1.2)); i++) {
      const a = spin * 0.9 + hash(i, 61) * TAU,
        x = cx + Math.cos(a) * rx * 0.75,
        y = v.sy(lo + (hi - lo) * hash(i, 62)) + Math.sin(a) * 0.22 * m,
        // (front of the vortex or behind it)
        front = Math.sin(a) > 0,
        s = (0.18 + 0.06 * hash(i, 63)) * m * (front ? 1 : 0.75);
      jel.push([x, y, s, -Math.sin(a), front, i]);
    }
    g.strokeStyle = rgba(DANGER, 0.85);
    g.lineWidth = 0.02 * m;
    g.beginPath();
    for (const [x, y, s, d, , i] of jel)
      for (let k = 0; k < 5; k++) {
        const tx = x + (k - 2) * s * 0.3;
        g.moveTo(tx, y);
        for (let q = 1; q <= 4; q++)
          g.lineTo(tx - d * q * s * 0.5 + Math.sin(t * 6 + q + k + i) * s * 0.15, y + q * s * 0.35);
      }
    g.stroke();
    g.fillStyle = rgba('#f4d8ff', 0.6);
    g.beginPath();
    for (const [x, y, s] of jel) {
      const pulse = 1 + 0.15 * mf.beat;
      g.moveTo(x - s * pulse, y);
      g.quadraticCurveTo(x - s, y - s * 1.3 * pulse, x, y - s * 1.2 * pulse);
      g.quadraticCurveTo(x + s, y - s * 1.3 * pulse, x + s * pulse, y);
      g.closePath();
    }
    g.fill();
    for (const [x, y, s] of jel) glowDot(g, x, y - s * 0.5, s * 1.5, DANGER, (0.35 + 0.4 * mf.kick) * f.glow);
  },

  // a blizzard: a haze of snow, streaks of it driven slantwise (the slant swaying with the bass), whirling flakes, icy
  // fog rolling through on the kick, red-edged ice shards spinning past, the snare loosing a volley of icicles, and
  // the walls fringed with icicles pointing in
  blizzard(f, o, box, rr) {
    const { g, v, mf, t } = f,
      m = v.ppm,
      { X0, X1, Y0, Y1, lo, hi } = box,
      W = X1 - X0,
      p = push(mf),
      fr = tick(f),
      wind = -0.35 + 0.3 * Math.sin(t * 0.9) - 0.3 * mf.bass,
      gust = 1 + 1.4 * mf.kick;
    inside(g, box);
    g.fillStyle = rgba('#dde8f4', 0.18 + 0.12 * mf.kick);
    g.fillRect(X0, Y0, W, Y1 - Y0);
    // the fog rolling through
    for (let i = 0; i < 7 && f.glow; i++) {
      const x = X0 + ((((hash(i, 1) - t * (0.12 + 0.1 * hash(i, 2)) * gust) % 1) + 1) % 1) * W,
        y = v.sy(lo + (hi - lo) * hash(i, 3));
      glowDot(g, x, y, (1 + 0.5 * hash(i, 4)) * m, '#eef6ff', 0.3 + 0.3 * mf.kick);
    }
    // the streaks of snow, driven by the wind
    g.strokeStyle = rgba('#ffffff', 0.7);
    g.lineWidth = 0.022 * m;
    g.beginPath();
    for (let i = 0; i < Math.round((hi - lo) * 14 * p); i++) {
      const sp = (3 + 2 * hash(i, 5)) * gust,
        x = X0 + ((((hash(i, 6) - t * sp * 0.22) % 1) + 1) % 1) * W,
        y = v.sy(lo + (hi - lo) * hash(i, 7)),
        l = (0.25 + 0.45 * hash(i, 8)) * m * gust;
      g.moveTo(x, y);
      g.lineTo(x + l, y + l * wind);
    }
    g.stroke();
    // the flakes whirling, sparkling on the hats
    g.fillStyle = rgba('#ffffff', 0.9);
    g.beginPath();
    for (let i = 0; i < Math.round((hi - lo) * (8 + 10 * mf.hat)); i++) {
      const x = X0 + W * ((((hash(i, 21) - t * 0.3 * gust) % 1) + 1) % 1) + Math.sin(t * 4 + i) * 0.15 * m,
        y = v.sy(lo + (hi - lo) * hash(i, 22)) + Math.cos(t * 3 + i) * 0.15 * m,
        s = (0.03 + 0.03 * hash(fr, i) * (1 + mf.hat)) * m;
      g.moveTo(x + s, y);
      g.arc(x, y, s, 0, TAU);
    }
    g.fill();
    // the ice shards spinning past, red-edged (and the icicles of the snare's volley, flying flat across)
    const shards = [];
    for (let i = 0; i < Math.round((hi - lo) * 1.5); i++) {
      const x = X0 + ((((hash(i, 31) - t * (0.25 + 0.15 * hash(i, 32)) * gust) % 1) + 1) % 1) * W,
        y = v.sy(lo + (hi - lo) * hash(i, 33)),
        a = t * (3 + 3 * hash(i, 34)) + i;
      shards.push([x, y, a, (0.12 + 0.1 * hash(i, 35)) * m]);
    }
    if (mf.snare > 0.15) {
      const y0 = lo + (hi - lo) * hash(fr >> 4, 90),
        u = 1 - mf.snare;
      for (let k = 0; k < 6; k++) shards.push([X1 - u * W * 1.2 - k * 0.15 * m, v.sy(y0 + k * 0.35), Math.PI + wind, 0.35 * m]);
    }
    g.fillStyle = rgba('#d8eeff', 0.9);
    g.beginPath();
    for (const [x, y, a, r] of shards) {
      g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      g.lineTo(x + Math.cos(a + 2.6) * r * 0.3, y + Math.sin(a + 2.6) * r * 0.3);
      g.lineTo(x - Math.cos(a) * r * 0.6, y - Math.sin(a) * r * 0.6);
      g.lineTo(x + Math.cos(a - 2.6) * r * 0.3, y + Math.sin(a - 2.6) * r * 0.3);
      g.closePath();
    }
    g.fill();
    g.strokeStyle = rgba(DANGER, 0.75 + 0.25 * mf.beat);
    g.lineWidth = 0.02 * m;
    g.stroke();
    // the walls' icicles, pointing into the shaft, their tips red
    g.fillStyle = '#e8f6ff';
    g.beginPath();
    const tips = [];
    for (let y = lo; y < hi; y += 0.3) {
      for (const [x, d] of [[X0, 1], [X1, -1]]) {
        const l = (0.25 + 0.35 * hash(Math.round(y * 10), d + 5)) * m,
          Y = v.sy(y);
        g.moveTo(x, Y - 0.1 * m);
        g.lineTo(x + d * l, Y + 0.03 * m);
        g.lineTo(x, Y + 0.12 * m);
        tips.push([x + d * l, Y + 0.03 * m]);
      }
    }
    g.fill();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = rgba(DANGER, 0.8 + 0.2 * mf.kick);
    g.beginPath();
    for (const [x, y] of tips) {
      g.moveTo(x + 0.03 * m, y);
      g.arc(x, y, (0.025 + 0.015 * mf.kick) * m, 0, TAU);
    }
    g.fill();
  },
};
