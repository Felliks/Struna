// The picture's answer to a big blow (anim-release-plan, stage 5), over the run's picture and never in its clock: the
// music, the score and the HUD run on through all of it.
//
// Hit-stop: a clone knocked out, a pane or a door kicked through, the boss's fist kicked back, the boss down, a
// finisher: the world's picture (him, the clones, the sparks, the camera) held still for two to five frames at 60 fps,
// longer the bigger the blow, then on at the song's real time (the small jump is the point: Street Fighter's hit-stop,
// Hi-Fi Rush's). Only ever shorter than the time to the next press, so it never takes a moment of reading from what
// comes next. A time remap of the picture: the first frame drawn in the hold keeps the picture (the world as it was at
// the blow), the next frames in it lay that picture back instead of the world they drew; the run itself never stops.
//
// The impact frame: on the biggest (a finisher, the boss down) one frame (25 ms) of anime's impact frame: the world
// gone flat black, him a white silhouette, white lines bursting from where the blow lands (the boss down the reverse:
// white, him black). A full flash, so it goes through the post layer's limiter (no more than three a second, none
// with reduced motion; WCAG 2.3.1).
//
// His keyline: the drop's burst and flash, its blasts and the glitch's torn blocks can bury him; through them he is
// drawn once more over everything (his own look: a white edge round a black stick) on a soft dark halo that dims what
// is round him, so the player always sees where he is and what he does.
import { BONES, JI } from '../../lib/skeleton.js';
import { mulberry } from '../../rng.js';
import { smooth } from '../util.js';

// how long each blow holds the picture (s; frames at 60 fps) and whether it is one of the biggest (an impact frame)
const F = 1 / 60;
function stopFor(e, run) {
  if (e.k === 'finisher') return { hold: 5 * F, big: true };
  if (e.k === 'bossdown') return { hold: 5 * F, big: true, white: true };
  if (e.k === 'bossdmg') return { hold: 4 * F };
  // (a pane or a door kicked through; not the panes of a dash, broken one after another as he runs through them)
  if (e.k === 'smash' && !e.dash) return { hold: 3 * F };
  // (a clone knocked out: a frame more at the streak's top tiers and in the overdrive; a boss's fist or a piece of the
  // cursor knocked back is the boss's own blow, above)
  if (e.k === 'ko' && e.o?.skin !== 'fist' && e.o?.skin !== 'bit') return { hold: (run.tier >= 2 || run.od ? 3 : 2) * F };
  // (a lid burst up through on a drop)
  if (e.k === 'shatter' && e.lid) return { hold: 2 * F };
  return null;
}
// the next moment after te that wants a press (the level's obstacles are in time order)
function nextPress(L, te) {
  for (const o of L.obs) if (o.t > te + 0.02) return o.t;
  return Infinity;
}

export class HitStop {
  constructor(reduced) {
    this.reduced = reduced;
    this.list = [];
    this.held = null;
  }
  reset() {
    this.list = [];
    this.held = null;
  }
  // a blow (an event of the run's, run.fx, or the renderer's own finisher): kept if it holds the picture
  add(e, run) {
    const s = stopFor(e, run);
    if (!s) return;
    // (never into the next press's reading: at least a fifth of a second of it left in motion before the press)
    const room = nextPress(run.L, e.t) - e.t - 0.2,
      hold = Math.min(s.hold, room);
    // (less than a frame and a half is no hold; the impact frame stays, it is a flash, not a stop)
    this.list.push({ te: e.t, hold: hold >= 1.5 * F ? hold : 0, big: !!s.big, white: !!s.white, k: e.k });
    if (this.list.length > 8) this.list.shift();
  }
  // the hold over t: the latest blow at or before t still holding (the effects setting shortens it, none at 0 or with
  // reduced motion)
  at(t, effects) {
    if (this.reduced || effects <= 0) return null;
    const k = Math.min(1, effects / 0.6);
    for (let i = this.list.length - 1; i >= 0; i--) {
      const s = this.list[i];
      if (s.te > t) continue;
      return s.hold > 0 && t - s.te < s.hold * k - 0.002 ? s : null;
    }
    return null;
  }
  // the world's picture just drawn (after the world's layers and the mirror, before the screen's effects): the first
  // frame of a hold keeps it, the next lay it back. Returns whether this frame is held
  apply(f) {
    const s = this.at(f.t, f.effects),
      c = f.g.canvas;
    if (!s) return (this.held = null), false;
    const b = (this.buf ??= document.createElement('canvas'));
    if (this.held !== s || b.width !== c.width || b.height !== c.height) {
      if (b.width !== c.width || b.height !== c.height) Object.assign(b, { width: c.width, height: c.height });
      const x = b.getContext('2d');
      x.globalCompositeOperation = 'copy';
      x.drawImage(c, 0, 0);
      this.held = s;
      // (and where he was on the screen then: his keyline and the hints over his head stay on the held picture)
      s.spots = { hero: f.spots.hero, pose: f.spots.pose };
      return false;
    }
    const g = f.g;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'copy';
    g.drawImage(b, 0, 0);
    g.restore();
    f.spots.hero = s.spots.hero;
    f.spots.pose = s.spots.pose;
    // (the frame's copy of the picture taken again: the effects over it lay the held picture back, not the one drawn)
    f.snapStale();
    return true;
  }
  // the impact frame over t, if any: one of the biggest blows within 25 ms of it
  impact(t) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const s = this.list[i];
      if (s.te > t) continue;
      return s.big && t - s.te < 0.025 ? s : null;
    }
    return null;
  }
}

// his bones on the screen (f.spots.pose, hero.js) stroked in one path
function bones(g, P) {
  g.beginPath();
  for (const [a, c] of BONES) {
    if (c === JI.head) continue;
    g.moveTo(P[a * 2], P[a * 2 + 1]);
    g.lineTo(P[c * 2], P[c * 2 + 1]);
  }
}

// the impact frame (on the screen, after the screen's effects, before the HUD)
export function drawImpact(f, stop, post) {
  const s = stop.impact(f.t);
  if (!s || (f.effects ?? 1) <= 0 || !post.allowed(s.te)) return;
  const { g, v } = f,
    W = v.W,
    H = v.H,
    p = f.spots.pose,
    ink = s.white ? '#000000' : '#ffffff',
    paper = s.white ? '#ffffff' : '#000000';
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = paper;
  g.fillRect(0, 0, W, H);
  // (where the blow lands: the end of the limb furthest ahead of his hips, the way he faces; the middle of the screen
  // if he is not drawn)
  let [x, y] = [W / 2, H / 2];
  if (p) {
    const P = p.P,
      dir = Math.sign(P[JI.chest * 2] - P[0] + (P[JI.head * 2] - P[0]) * 0.5) || 1;
    let best = -Infinity;
    for (const j of [JI.haL, JI.haR, JI.toL, JI.toR, JI.knL, JI.knR]) {
      const d = (P[j * 2] - P[0]) * dir;
      if (d > best) ((best = d), (x = P[j * 2]), (y = P[j * 2 + 1]));
    }
  }
  // (lines bursting out from it to the screen's edges, each a thin wedge, seeded by the blow)
  const rr = mulberry(Math.round(s.te * 1000) + 7),
    R = Math.hypot(W, H),
    m = p?.s ?? v.ppm;
  g.fillStyle = ink;
  g.beginPath();
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2 + rr() * 0.12,
      w = (0.004 + 0.012 * rr()) * Math.PI,
      r0 = (0.5 + 1.2 * rr()) * m;
    g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
    g.lineTo(x + Math.cos(a - w) * R, y + Math.sin(a - w) * R);
    g.lineTo(x + Math.cos(a + w) * R, y + Math.sin(a + w) * R);
    g.closePath();
  }
  g.fill();
  // (a jagged star where it lands)
  g.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2,
      r = (i % 2 ? 0.18 : 0.42 + 0.2 * rr()) * m;
    g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  // (him, flat: a silhouette in the ink, the paper round it so he stands out of the lines)
  if (p) {
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const [col, w] of [
      [paper, 0.34],
      [ink, 0.17],
    ]) {
      g.strokeStyle = col;
      g.lineWidth = w * p.s;
      bones(g, p.P);
      g.stroke();
      g.fillStyle = col;
      g.beginPath();
      g.arc(p.head[0], p.head[1], p.head[2] + ((w - 0.17) / 2) * p.s, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.restore();
}

// how buried he is under the heavy effects (0..1): the drop's first half second and more (its burst, its flash, the
// glitch tearing the picture), the rest of a drop's first bar a little, a hit or a respawn (the glitch's heavy moments)
function cover(f) {
  const { t, mf, run: R } = f,
    since = t - mf.dropT,
    drop = since >= 0 && since < 0.9 ? 1 - smooth(0.5, 0.9, since) : 0,
    heavy = Math.max(R.mode !== 'dead' ? 1 - (t - R.hitT) / 0.3 : 0, 1 - (t - (R.respawnT ?? -9)) / 0.35, 0);
  return Math.min(1, Math.max(drop, 0.5 * (mf.drop ?? 0), heavy));
}
// his keyline over everything (on the screen, after the screen's effects)
export function drawKeyline(f) {
  const p = f.spots.pose,
    u = p ? cover(f) : 0;
  if (u < 0.03) return;
  const { g } = f,
    P = p.P,
    s = p.s;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  // (a soft dark halo round his body: what is drawn round him dimmed, so his white edge reads on any blast)
  const cx = (P[0] + P[JI.neck * 2]) / 2,
    cy = (P[1] + P[JI.neck * 2 + 1]) / 2,
    hr = 1.5 * s,
    gr = g.createRadialGradient(cx, cy, 0.2 * s, cx, cy, hr);
  gr.addColorStop(0, `rgba(0,0,0,${0.5 * u})`);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(cx - hr, cy - hr, 2 * hr, 2 * hr);
  // (him in his own look: a dark rim, his white (red, hit) edge, the black stick; his head the same)
  g.globalAlpha = Math.min(1, 1.2 * u);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const [col, w] of [
    ['rgba(0,0,0,0.7)', 0.24],
    [p.edge, 0.16],
    ['#000000', 0.085],
  ]) {
    g.strokeStyle = col;
    g.lineWidth = w * s;
    bones(g, P);
    g.stroke();
  }
  const [hx, hy, r] = p.head;
  g.fillStyle = '#000';
  g.strokeStyle = p.edge;
  g.lineWidth = 0.04 * s;
  g.beginPath();
  g.arc(hx, hy, r, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  // (his eyes, two red dots, so he still looks where he goes)
  if (p.eyes) {
    g.fillStyle = p.eyeCol;
    g.beginPath();
    for (const [ex, ey] of p.eyes) {
      g.moveTo(ex + 0.17 * r, ey);
      g.arc(ex, ey, 0.17 * r, 0, Math.PI * 2);
    }
    g.fill();
  }
  g.restore();
}
