// The look of the acts' modes (modes.js) that are not the hero's own (his flight, his board and his back kicks are his):
//   blackout   the lights go out over the world behind him (only the roof's edges, him and what is in his way, which
//              flashes up on its beat)
//   chaser     in the builds: the simulation's dark coming after him from behind, a wall of static with a maw and red
//              eyes, closer as the build rises and with each miss, torn apart on the drop
//   boss       the last drop: the cursor grown huge in the sky, slamming down on the kicks
//   fore       from the second drop on: silhouettes of the place going by in front of everything, fast
//   mirror     a twin world hanging upside down over his (a copy of the picture, flipped and faint)
import { onStage } from '../stage.js';
import { mulberry } from '../../rng.js';
import { clamp, glowDot, hash, rgba, smooth } from '../util.js';

const actOf = (L, t) => L.acts?.find(a => t >= a.t0 && t < a.t1);
// how far into a mode's act t is: 0..1 eased in over a beat and out over a beat (0 outside it)
// how the player's directions are turned at song time t: running the other way across the screen, or mirrored, left and
// right swap (the kick is always the way he runs); upside down, up and down. An action -> its screen direction (and back:
// it is its own inverse). The input (main.js) and the hints of what to press (hints.js, render/layers/hints.js) both go by it.
export function screenSwap(L, t) {
  const s = L.segAt(Math.max(0, t)),
    lr = (s.kind === 'run' && s.dir < 0) !== modeAmount(L, t, 'mirror') > 0.5,
    ud = modeAmount(L, t, 'ceiling') > 0.5;
  return { ...(lr ? { left: 'right', right: 'left' } : {}), ...(ud ? { jump: 'slide', slide: 'jump' } : {}) };
}
export function modeAmount(L, t, mode) {
  // (the modifiers: blind is a blackout and upside down a ceiling, all song long)
  if ((mode === 'blackout' && L.mods?.includes('blind')) || (mode === 'ceiling' && L.mods?.includes('upside'))) return 1;
  const a = actOf(L, t);
  if (!a || a.mode !== mode) return 0;
  const b = L.A.beat,
    // (the world turned back the right way for the finale)
    end = (mode === 'ceiling' || mode === 'mirror') && L.finale ? 1 - smooth(L.finale.t0 - b, L.finale.t0, t) : 1;
  return Math.min(smooth(a.t0, a.t0 + b, t), 1 - smooth(a.t1 - b, a.t1, t)) * end;
}

export function drawBlackout(f) {
  const { g, v, L, t, mf } = f,
    u = modeAmount(L, t, 'blackout');
  if (u <= 0) return;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  // (a flicker of the lights on the downbeat: the world glimpsed)
  g.fillStyle = `rgba(0,0,0,${u * (0.9 - 0.35 * mf.down)})`;
  g.fillRect(0, 0, v.W, v.H);
  // (his eyes' light on the few metres ahead of him: obstacles.js shows what is in it)
  const R = f.run,
    dir = f.heroSeg.st?.dir ?? 1,
    X = v.sx(onStage(f.heroSeg, R.heroX(Math.max(0, t)) + 2.5 * dir)),
    Y = v.sy(R.y + 1),
    gr = g.createRadialGradient(X, Y, 0, X, Y, 3.2 * v.ppm);
  gr.addColorStop(0, `rgba(255,40,60,${0.22 * u})`);
  gr.addColorStop(1, 'rgba(255,40,60,0)');
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = gr;
  g.fillRect(X - 3.2 * v.ppm, Y - 3.2 * v.ppm, 6.4 * v.ppm, 6.4 * v.ppm);
  g.restore();
}

// in a blackout what is in his way is dim but for its beat
export const blackoutAlpha = f => {
  const u = modeAmount(f.L, f.t, 'blackout');
  return u > 0 ? 1 - u * (0.75 - 0.75 * f.mf.beat) : 1;
};

export function drawChaser(f) {
  const { g, v, L, t, mf, run: R, heroSeg } = f;
  if (!L.chase || R.mode === 'dead') return;
  const b = L.A.bars.find(q => t >= q.t0 && t < q.t1 + L.A.beat * 2),
    into = b && b.kind === 'build' ? 1 : 0,
    // (the build's bars run up to the drop; on the drop's first beats it is torn apart)
    drop = mf.dropT > 0 && t - mf.dropT < 0.6 ? 1 - (t - mf.dropT) / 0.6 : 0;
  if (!into && drop <= 0) return;
  const rise = mf.build,
    misses = R.L.obs.filter(o => o.res === 'hit' && o.hitT > t - 6).length,
    near = clamp(0.25 + 0.55 * rise + 0.15 * misses, 0, 1),
    W = v.W,
    H = v.H,
    back = (heroSeg?.st?.dir ?? 1) > 0,
    edge = W * (-0.1 + 0.28 * near) * (into ? 1 : drop),
    rr = mulberry(Math.floor(t * 20));
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (!back) {
    g.translate(W, 0);
    g.scale(-1, 1);
  }
  // the wall of static: columns of dark, jagged at its front, pulsing on the kick
  for (let y = 0; y < H; y += 8 * v.dpr) {
    const jag = (hash(Math.floor(y / (8 * v.dpr)), Math.floor(t * 12)) - 0.5) * 40 * v.dpr + Math.sin(y * 0.02 + t * 6) * 20 * v.dpr,
      x = edge + jag + mf.kick * 15 * v.dpr;
    g.fillStyle = `rgba(6,4,10,${0.92 * (into || drop)})`;
    g.fillRect(0, y, Math.max(0, x), 8 * v.dpr);
    if (rr() < 0.3) {
      g.fillStyle = rgba(rr() < 0.5 ? '#ff2b3a' : '#29e7ff', 0.5 * (into || drop));
      g.fillRect(x - 6 * v.dpr, y, 6 * v.dpr, 8 * v.dpr);
    }
  }
  // its face, at the wall's front, looking at him: no eyeballs, no pupils: two slanted slits of red light cut into the
  // dark (a white-hot core, narrowing to a squint on every other downbeat), and a torn mouth across under them, lit red
  // from inside, ragged fangs of uneven length, opening with the bass and snapping on the kick
  const al = into || drop,
    // (sized by the screen's short side: on a tall phone it would be as wide as the screen, over what is in his way)
    FR = Math.min(H, W) * 0.13,
    fx = Math.max(FR * 1.1, edge - FR * 0.9),
    fy = H * 0.4 + Math.sin(t * 1.3) * FR * 0.08,
    bar = 4 * L.A.beat,
    phase = (t - (L.A.beats[0] ?? 0)) % (2 * bar),
    squint = Math.max(phase < 0.14 ? 1 - Math.abs(phase - 0.07) / 0.07 : 0, hash(Math.floor(t * 3), 9) < 0.06 ? 1 : 0),
    flick = 0.85 + 0.15 * hash(Math.floor(t * 30), 4);
  glowDot(g, fx, fy, FR * 2.4, '#ff1a2e', 0.2 * al);
  // (a slit: a blade-shaped sliver, sharp at both ends, its inner end lower: a scowl)
  const slit = (side, w, hgt) => {
    g.beginPath();
    g.moveTo(-side * w * 0.55, hgt * 0.9);
    g.quadraticCurveTo(0, -hgt * 1.3, side * w * 0.5, -hgt * 0.7);
    g.quadraticCurveTo(0, hgt * 0.6, -side * w * 0.55, hgt * 0.9);
    g.fill();
  };
  for (const side of [-1, 1]) {
    const ex = fx + side * FR * 0.4,
      ey = fy - FR * 0.2,
      open = (1 - 0.8 * squint) * (1 + 0.25 * mf.kick);
    g.save();
    g.translate(ex, ey);
    g.rotate(side * 0.22);
    glowDot(g, 0, 0, FR * 0.5, '#ff1a2e', (0.55 + 0.45 * mf.kick) * al * flick);
    g.fillStyle = `rgba(200,0,20,${al})`;
    slit(side, FR * 0.62, FR * 0.13 * open);
    g.fillStyle = `rgba(255,60,50,${al * flick})`;
    slit(side, FR * 0.5, FR * 0.08 * open);
    g.fillStyle = `rgba(255,200,170,${al * flick * (0.6 + 0.4 * mf.kick)})`;
    slit(side, FR * 0.3, FR * 0.03 * open);
    g.restore();
  }
  const mw = FR * 1.2,
    my = fy + FR * 0.42,
    open = FR * (0.1 + 0.32 * mf.bass + 0.2 * mf.kick),
    n = 11,
    lip = (u, up) => my + (up ? -open * 0.5 : open * 1.4) * Math.sin(u * Math.PI) ** 0.7 + (up ? -1 : 1) * FR * 0.03 * Math.sin(u * 17 + t * 3);
  // the mouth: a ragged rift, red-hot deep inside
  g.beginPath();
  for (let k = 0; k <= 16; k++) g.lineTo(fx - mw / 2 + (k / 16) * mw, lip(k / 16, true));
  for (let k = 16; k >= 0; k--) g.lineTo(fx - mw / 2 + (k / 16) * mw, lip(k / 16, false));
  g.fillStyle = `rgba(20,0,4,${al})`;
  g.fill();
  glowDot(g, fx, my + open * 0.4, FR * 0.55, '#ff2b10', (0.35 + 0.5 * mf.bass) * al);
  // the fangs: dirty bone lit red from below, each its own length, the long ones at the corners
  for (let k = 0; k < n; k++) {
    const u0 = k / n,
      u1 = (k + 1) / n,
      um = (u0 + u1) / 2,
      x0 = fx - mw / 2 + u0 * mw,
      x1 = fx - mw / 2 + u1 * mw,
      xm = (x0 + x1) / 2 + (hash(k, 3) - 0.5) * (x1 - x0) * 0.5,
      edgeL = 1 + 1.2 * Math.abs(um - 0.5) * 2 * (k % 3 === 0 ? 1 : 0.4),
      tl = FR * (0.09 + 0.1 * hash(k, 7)) * edgeL,
      top = lip(um, true),
      bot = lip(um, false);
    g.fillStyle = `rgba(230,190,170,${al})`;
    g.beginPath();
    g.moveTo(x0, lip(u0, true));
    g.lineTo(x1, lip(u1, true));
    g.lineTo(xm, top + tl);
    g.fill();
    g.beginPath();
    g.moveTo(x0, lip(u0, false));
    g.lineTo(x1, lip(u1, false));
    g.lineTo(xm, bot - tl * 0.75);
    g.fill();
  }
  g.restore();
}

// how hard the boss's pointer slams on beat n: that beat's kick, in a bar as loud as its own (worked out once a beat)
const SLAMS = new WeakMap();
function slamOf(f, n) {
  const { L } = f;
  let M = SLAMS.get(L);
  if (!M) SLAMS.set(L, (M = new Map()));
  let s = M.get(n);
  if (s === undefined) {
    const tb = (L.A.beats?.[0] ?? 0) + n * L.A.beat,
      q = f.R?.fx?.(Math.max(0, tb + 0.03));
    s = q ? clamp((0.35 + 1.1 * q.kick) * (0.5 + 0.5 * q.amp), 0.3, 1) : 0.7;
    M.set(n, s);
    if (M.size > 64) M.delete(M.keys().next().value);
  }
  return s;
}

export function drawBoss(f) {
  const { g, v, L, t, mf, T } = f,
    u = modeAmount(L, t, 'boss');
  if (u <= 0) return;
  // (the music says when and how hard, its body how: on the beat it slams down, as hard as that beat's kick in a bar
  // as loud as this; through the second half of the beat before, it rises and tips back, winding up; after, it eases
  // back up, a little past where it rests, and settles)
  const bt = L.A.beat,
    nb = (t - (L.A.beats?.[0] ?? 0)) / bt,
    n = Math.floor(nb),
    p = nb - n,
    hard = slamOf(f, n + (p < 0.4 ? 0 : 1)),
    back = 1.70158,
    q = Math.min(1, p / 0.4) - 1,
    // (down: 1 at the slam; below 0, risen)
    dn = p < 0.4 ? 1 - (1 + (back + 1) * q * q * q + back * q * q) : p < 0.85 ? -0.4 * smooth(0.4, 0.85, p) : -0.4 + 1.4 * ((p - 0.85) / 0.15) ** 2,
    slam = p < 0.3 ? (1 - p / 0.3) * hard : 0,
    s = v.ppm * 3.2 * u,
    X = v.W * (0.55 + 0.12 * Math.sin(t * 0.7)),
    Y = v.H * (0.12 + 0.1 * dn * hard) + Math.sin(t * 2) * 6 * v.dpr;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  glowDot(g, X, Y + s * 0.5, s * 1.4, '#ff2b3a', 0.25 + 0.35 * mf.kick);
  g.translate(X, Y);
  g.rotate(-0.25 + 0.1 * dn * hard);
  // the pointer, huge: white with a black edge, cracked, red light through its cracks
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(0, s);
  g.lineTo(s * 0.28, s * 0.74);
  g.lineTo(s * 0.46, s * 1.08);
  g.lineTo(s * 0.6, s * 1.01);
  g.lineTo(s * 0.43, s * 0.68);
  g.lineTo(s * 0.74, s * 0.68);
  g.closePath();
  g.fillStyle = '#f4f4f4';
  g.fill();
  g.lineWidth = s * 0.04;
  g.strokeStyle = '#000';
  g.stroke();
  g.strokeStyle = rgba('#ff2b3a', 0.5 + 0.5 * mf.kick);
  g.lineWidth = s * 0.015;
  g.beginPath();
  g.moveTo(s * 0.05, s * 0.2);
  g.lineTo(s * 0.18, s * 0.45);
  g.lineTo(s * 0.1, s * 0.6);
  g.stroke();
  g.restore();
  // the slam's shockwave on the roof ahead of him
  if (slam > 0) {
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.strokeStyle = rgba(T.line, 0.6 * slam);
    g.lineWidth = 4 * v.dpr;
    g.beginPath();
    g.ellipse(X, v.H * 0.72, (1 - slam) * v.W * 0.4 + 10, (1 - slam) * 30 * v.dpr + 4, 0, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }
}

export function drawFore(f) {
  const { g, v, mf, T } = f;
  if (mf.grow < 0.5 || !f.glow) return;
  // (in the world's frame, nearer than him: zoomed, shaken, tilted and turned over with the rest of it, passing at par of
  // the camera's speed across and up and down, about the roof he rests on as the background's rows are, places/kit.js)
  const par = 1.6,
    step = 9,
    x0 = v.x * par,
    dy = (v.y - (v.rest ?? v.y)) * v.ppm * par,
    // (gone as the camera leaves the roof's height, up a shaft or down one: a shape hanging from above would come down
    // the whole screen with it, a post with no end over his climb)
    a = Math.min(1, (mf.grow - 0.5) * 4) * Math.max(0, 1 - Math.abs(dy) / (0.12 * v.H));
  if (a <= 0) return;
  g.save();
  g.fillStyle = rgba(T.near.startsWith('#') ? T.near : '#000000', 0.92 * a);
  for (let k = Math.floor(x0 / step) - 1; k < (x0 + v.vw) / step + 1; k++) {
    if (hash(k, 77) > 0.45) continue;
    const X = (k * step - x0) * v.ppm,
      w = (0.6 + 1.4 * hash(k, 3)) * v.ppm,
      top = hash(k, 5) < 0.5;
    // (from above: a hanging shape; from below: a post coming up into the bottom of the picture; each running a screen on
    // past its edge, so a tilt or a shake never shows its end)
    if (top) g.fillRect(X, dy - v.H, w, v.H * (1.08 + 0.1 * hash(k, 9)));
    else g.fillRect(X, dy + v.H * (0.9 - 0.06 * hash(k, 11)), w, v.H * 1.2);
  }
  g.restore();
}

export class Mirror {
  draw(f) {
    const { g, v, L, t, mf } = f,
      u = modeAmount(L, t, 'mirror');
    if (u <= 0) return;
    const W = v.W,
      H = v.H;
    const b = f.snap();
    // (the bottom half of his world, turned over into the top half: his twin runs upside down over him)
    g.save();
    g.setTransform(1, 0, 0, -1, 0, H * 0.5);
    g.globalAlpha = (0.4 + 0.15 * mf.beat) * u;
    g.globalCompositeOperation = 'lighter';
    g.drawImage(b, 0, H * 0.5, W, H * 0.5, 0, 0, W, H * 0.5);
    g.restore();
  }
}
