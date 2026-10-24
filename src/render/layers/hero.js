// The hero, the video's look: a black stick with a white edge, a ball head, red eyes (wide while he falls, crosses
// when he is dead), red when he is hit; on a hard snare in a glitchy world a red and a cyan ghost.
import { BONES, JI } from '../../lib/skeleton.js';
import { glowDot, onScreen, rgba, unmirror } from '../util.js';
import { shieldOn } from './obstacles.js';
import { goldNear } from '../../anim.js';
import { entry, line } from '../../lines.js';

const hash = x => (((Math.sin(x * 12.9898) * 43758.5453) % 1) + 1) % 1;
// the marks he leaves on the roofs (Vlambeer: nothing vanishes without a trace): a dent where he lands, a streak where
// he slides, fading over three seconds; kept per run
const MARKS = new WeakMap();
function marks(f) {
  const { g, v, run: R, t } = f;
  if (!MARKS.has(R)) MARKS.set(R, { list: [], land: null, slideX: null });
  const M = MARKS.get(R),
    J = R.J,
    landAt = Math.max(R.landing?.t0 ?? -9, R.landT ?? -9);
  if (R.mode === 'run' && J && landAt > -9 && landAt !== M.land && t - landAt < 0.1) {
    M.land = landAt;
    M.list.push({ k: 'dent', t, x: (J[JI.ftL * 2] + J[JI.ftR * 2]) / 2, y: R.y });
  }
  if (R.slide && R.mode === 'run' && J) {
    const x = J[0];
    if (M.slideX === null || Math.abs(x - M.slideX) > 0.25) M.list.push({ k: 'streak', t, x, x0: M.slideX ?? x - 0.25, y: R.y }), (M.slideX = x);
  } else M.slideX = null;
  while (M.list.length && t - M.list[0].t > 3) M.list.shift();
  if (M.list.length > 80) M.list.splice(0, M.list.length - 80);
  g.save();
  g.lineCap = 'round';
  for (const k of M.list) {
    const a = Math.max(0, 1 - (t - k.t) / 3) * 0.6;
    g.strokeStyle = `rgba(0,0,0,${a})`;
    g.lineWidth = 0.05 * v.ppm;
    g.beginPath();
    if (k.k === 'dent') {
      // (a crack each way from where he came down)
      for (const [dx, dy] of [[-0.35, 0.02], [-0.15, -0.02], [0.2, 0.03], [0.4, -0.01]]) {
        g.moveTo(v.sx(k.x), v.sy(k.y));
        g.lineTo(v.sx(k.x + dx), v.sy(k.y + dy));
      }
    } else {
      g.moveTo(v.sx(k.x0), v.sy(k.y + 0.01));
      g.lineTo(v.sx(k.x), v.sy(k.y + 0.01));
    }
    g.stroke();
  }
  g.restore();
}
// the act starting within `w` of t whose mode differs from the one before it (a change of vehicle: the ring and the pop)
function modeStart(L, t, w) {
  const acts = L.acts ?? [];
  for (let i = 1; i < acts.length; i++) if (t - acts[i].t0 >= 0 && t - acts[i].t0 < w && acts[i].mode !== acts[i - 1].mode) return acts[i];
  return null;
}
// his body for a death: flattened by what hit him (a pancake under a ceiling or a block, thin against a wall: Henry
// Stickmin's fails). (Top-tier tricks that took the body apart read as a break: not done.)
function bodyFor(f, J) {
  const { run: R, t } = f;
  if (R.mode === 'dead' && R.killer) {
    const tau = t - R.deadT,
      flat = R.killer === 'slide' || R.killer === 'smash' || R.killer === 'foe' ? 'y' : R.killer === 'jump' ? 'x' : null;
    if (!flat || tau < 0) return { J };
    const k = Math.max(0.28, 1 - tau * 6) + 0.06 * Math.exp(-tau * 4) * Math.sin(tau * 40),
      out = Float32Array.from(J),
      base = Math.min(...Array.from(J).filter((_, i) => i % 2)),
      cx = J[0];
    for (let i = 0; i < out.length; i += 2) {
      if (flat === 'y') {
        out[i + 1] = base + (J[i + 1] - base) * k;
        out[i] = cx + (J[i] - cx) * (1 + (1 - k) * 0.8);
      } else out[i] = cx + 0.3 + (J[i] - cx - 0.3) * k;
    }
    return { J: out };
  }
  return { J };
}

export function stick(f, J, layers, dx = 0) {
  const { g, v } = f;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const [col, w] of layers) {
    g.strokeStyle = col;
    g.lineWidth = w * v.ppm;
    g.beginPath();
    for (const [a, c] of BONES) {
      if (c === JI.head) continue;
      g.moveTo(v.sx(J[a * 2]) + dx, v.sy(J[a * 2 + 1]));
      g.lineTo(v.sx(J[c * 2]) + dx, v.sy(J[c * 2 + 1]));
    }
    g.stroke();
  }
}

// speed lines down past him as he rises (a comic's flight: the lines say the speed the pose cannot), each its own
// length and pace, brighter and longer on the kick
function speedLines(f, J) {
  const { g, v, t, mf } = f,
    X = v.sx(J[0]),
    Y = v.sy(J[1]),
    m = v.ppm;
  g.save();
  g.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const h = ((i * 0.618) % 1) - 0.5,
      ph = (t * (1.8 + 0.6 * ((i * 0.37) % 1)) + i * 0.29) % 1,
      x = X + h * 0.9 * m,
      y0 = Y + (0.3 + ph * 1.6) * m,
      len = (0.5 + 0.6 * ((i * 0.53) % 1)) * (1 + 0.8 * mf.kick) * m;
    g.strokeStyle = `rgba(255,255,255,${(0.75 - 0.55 * ph) * (0.7 + 0.3 * mf.kick)})`;
    g.lineWidth = (1.2 + 1.2 * ((i * 0.71) % 1)) * v.dpr;
    g.beginPath();
    g.moveTo(x, y0);
    g.lineTo(x, y0 + len);
    g.stroke();
  }
  g.restore();
}

export function drawHero(f) {
  const { g, v, run: R, t, mf } = f;
  if (!R.J) return;
  // (come apart in a climb: nothing of him left but his pieces, particles.js)
  if (R.mode === 'dead' && R.shattered !== undefined && t > R.shattered + 0.05) return;
  marks(f);
  // (his words drawn after a lens over the whole world, where they stay readable: f.label)
  here(f, () => chalk(f));
  const B = bodyFor(f, R.J),
    J = B.J;
  // (where his head is on the screen: a held move's note rides over it, layers/hints.js)
  if (f.spots) f.spots.hero = onScreen(g, v.sx(J[JI.head * 2]), v.sy(J[JI.head * 2 + 1]));
  if (f.paused > 0.25) knock(f);
  if (R.mode === 'run') here(f, () => says(f, J));
  // (a storm's shield round him, behind him)
  shieldOn(f, J, !R.respawn);
  // (going up a shaft: speed lines streaming down past him from his feet, longer on the kick)
  if (R.mode === 'shaft' && R.shaft === 'rise' && !R.climbPose) speedLines(f, J);
  // (put back after a gap: the simulation rebuilds him bone by bone, the hips first and the hands and feet last, each
  // bone landing split red and cyan, over a quarter of a second)
  const back = t - (R.respawnT ?? -9);
  if (back >= 0 && back < 0.25 && R.mode !== 'dead') {
    const sub = BONES.filter((_, i) => back > (i / BONES.length) * 0.18),
      o = (0.25 - back) * 0.5 * v.ppm;
    for (const [col, dx] of [['rgba(41,231,255,0.7)', -o], ['rgba(255,43,58,0.7)', o]]) {
      g.strokeStyle = col;
      g.lineWidth = 0.12 * v.ppm;
      g.lineCap = 'round';
      g.beginPath();
      for (const [a, c] of sub) {
        if (c === JI.head) continue;
        g.moveTo(v.sx(J[a * 2]) + dx, v.sy(J[a * 2 + 1]));
        g.lineTo(v.sx(J[c * 2]) + dx, v.sy(J[c * 2 + 1]));
      }
      g.stroke();
    }
    if (back < 0.18) return;
  }
  const m = v.ppm,
    dead = R.mode === 'dead',
    hit = t - R.hitT < 0.3 && !dead,
    edge = hit ? '#ff2040' : '#ffffff';
  if (f.look.glitch && mf.snare > 0.5 && !dead) {
    const o = (0.04 + 0.08 * mf.snare) * m;
    stick(f, J, [['rgba(41,231,255,0.45)', 0.13]], -o);
    stick(f, J, [['rgba(255,43,58,0.45)', 0.13]], o);
  }
  // (a drop's first beats: his last poses left behind him as coloured afterimages, Hi-Fi Rush's trails)
  if (!dead && mf.drop > 0.4 && R.trail?.length > 20) {
    g.save();
    for (const [i, col] of [[20, '#29e7ff'], [12, '#ff4fd8'], [6, '#ffd84a']]) {
      g.globalAlpha = (mf.drop - 0.4) * (0.9 - i / 30);
      stick(f, R.trail[i], [[col, 0.1]]);
    }
    g.restore();
  }
  // (a fast hand or foot smeared back along where it just was: a smear frame, the blow's speed in the picture)
  if (!dead && R.trail?.length > 5) smears(f, R.trail);
  // flying (gliding, or up a shaft): a cape off his shoulders, streaming back on the air (the animator's rope)
  if (!dead && R.cape) cape(f, R.cape);
  // riding (modes.js): the hoverboard under his feet, its jets flaring on the kick (the animator puts it there)
  if (!dead && R.board && !R.hold2 && !R.swing && !R.fly) board(f, R.board);
  // the flow on him: a glow of its tier's colour from the second tier, gold in the overdrive
  const aura = R.od ? '#ffd84a' : R.tier >= 2 ? (R.tier >= 3 ? '#ff4fd8' : f.T.jump) : null;
  if (aura && !dead) {
    g.save();
    g.globalAlpha = 0.35 + 0.35 * mf.beat;
    stick(f, J, [[rgba(aura, 0.3), 0.55], [aura, 0.3]]);
    g.restore();
  }
  // (a golden beat: a gold silhouette of him runs ahead to where he will strike the pose, and gold sparks circle him on it)
  const gold = goldNear(R.L.A, t + R.L.A.beat * 0.6, R.L.A.beat * 0.6),
    goldOn = goldNear(R.L.A, t, 0.3) !== null && R.anim?.face === 'front';
  if (gold !== null && !dead && R.mode === 'run' && gold > t) {
    const ahead = R.L.vAt(t) * (gold - t);
    g.save();
    g.globalAlpha = 0.35 * (1 - (gold - t) / (R.L.A.beat * 1.2));
    stick(f, J, [['#ffd84a', 0.1]], ahead * m);
    g.restore();
  }
  if (goldOn && !dead) {
    const cx0 = v.sx(J[2]),
      cy0 = v.sy(J[3]);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + t * 4,
        rr = (0.9 + 0.15 * Math.sin(t * 9 + i)) * m;
      glowDot(g, cx0 + Math.cos(a) * rr, cy0 + Math.sin(a) * rr * 1.2, 0.12 * m, '#ffd84a', 0.8);
    }
  }
  // (a change of vehicle: a ring bursting out of him on its beat)
  const ms = !dead && modeStart(R.L, t, 0.3);
  if (ms) {
    const u = (t - ms.t0) / 0.3;
    g.strokeStyle = `rgba(255,255,255,${0.8 * (1 - u)})`;
    g.lineWidth = (0.12 * (1 - u) + 0.02) * m;
    g.beginPath();
    g.arc(v.sx(J[2]), v.sy(J[3]), (0.4 + 2.6 * u) * m, 0, Math.PI * 2);
    g.stroke();
  }
  // (sliding: sparks off a hand dragged along the roof, only while it touches it: not through a roll's flight)
  const lowHand = J[JI.haL * 2 + 1] < J[JI.haR * 2 + 1] ? JI.haL : JI.haR;
  if (R.slide && !dead && R.mode === 'run' && J[lowHand * 2 + 1] - R.y < 0.14) {
    const hand = lowHand,
      hx0 = J[hand * 2],
      hy0 = Math.max(R.y + 0.03, J[hand * 2 + 1] - 0.1);
    g.strokeStyle = '#ffb347';
    g.lineWidth = 0.03 * m;
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const r1 = hash(Math.floor(t * 30) + i),
        len = 0.2 + 0.4 * r1;
      g.moveTo(v.sx(hx0), v.sy(hy0));
      g.lineTo(v.sx(hx0 - len), v.sy(hy0 + 0.05 + 0.3 * r1 * r1));
    }
    g.stroke();
  }
  stick(f, J, [
      [edge, 0.16],
      ['#000000', 0.085],
    ]);
  const nx = v.sx(J[JI.neck * 2]),
    ny = v.sy(J[JI.neck * 2 + 1]),
    hx = v.sx(J[JI.head * 2]),
    hy = v.sy(J[JI.head * 2 + 1]),
    d = Math.hypot(hx - nx, hy - ny) || 1,
    r = 0.15 * m,
    cx = nx + ((hx - nx) / d) * (d + r * 0.3),
    cy = ny + ((hy - ny) / d) * (d + r * 0.3);
  g.fillStyle = '#000';
  g.strokeStyle = edge;
  g.lineWidth = 0.04 * m;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  // (the eyes where his face is: turned all the way round with his head, through a flip or a roll; and looking where he
  // goes: straight ahead, or at the next thing in his way or the clone coming at him, as far as the eyes can turn in the
  // head; looking out at the player: the eyes come round to the middle of the face; glaring: narrowed)
  // (the cursor slamming something down right by him: a flinch, the eyes wide; late at night (the device's clock) and
  // the song calm: drowsy, half shut)
  const cur = !dead && R.mode === 'run' ? f.plan?.at(t) : null,
    curW = cur && stageToWorld(f, cur.p),
    near = curW && Math.hypot(curW[0] - J[2], curW[1] - J[3]) < 3.2,
    hour = new Date().getHours(),
    face = dead ? null : (R.anim?.face ?? (near && cur.press > 0.55 ? 'scared' : hour >= 1 && hour < 6 && mf.amp < 0.5 && !/probe|bot/.test(location.search) ? 'sleepy' : null)),
    frontal = face === 'front' || face === 'wink' || (R.victory && t - R.victory.t0 > 1.2 && entry('chalk', seedOf(R), R.memory?.runs ?? 0)?.look),
    // (a clone behind him: the eyes slid back toward the back of his head, a wary side-glance)
    wary = R.mode === 'run' && !dead ? (R.anim?.glance ?? 0) : 0,
    // (down a shaft he looks out at the player; climbing, at the beam he goes for, as on a run)
    shafted = R.mode === 'shaft' && !R.climbPose,
    fx = shafted || frontal ? (frontal ? -0.02 : 0.15) : 0.45 - 0.55 * wary,
    head = shafted || frontal ? 0 : Math.atan2(hx - nx, ny - hy),
    // (and the cursor, carrying something near him: he keeps an eye on it)
    // (climbing: at the beam he goes for next, run.js climbLook)
    // (flying up a shaft: at the next thing coming down at him, else straight up)
    look = R.mode === 'shaft' && R.climbPose?.look && !dead ? climbEye(f, R) : shafted && R.shaft === 'rise' && !dead ? riseEye(f, R, cx, cy) : R.mode === 'run' && !dead && !frontal && wary < 0.3 ? (cur?.act && near ? [v.sx(curW[0]), v.sy(curW[1])] : lookAt(f)) : null,
    gaze = look ? Math.atan2(look[1] - cy, look[0] - cx) : 0,
    // (climbing, each pose turned to face its wall (anim.js): his face is the way his toes point, and the eyes look up
    // or down from there, never round to the back of his head (the beam he leaps for next may be on the other wall,
    // behind him), nor over its top (his head already thrown back to the beam above))
    climbing = R.mode === 'shaft' && !!R.climbPose && !dead,
    sg = climbing ? (v.sx(J[JI.toL * 2]) - v.sx(J[JI.ftL * 2]) + v.sx(J[JI.toR * 2]) - v.sx(J[JI.ftR * 2]) < 0 ? -1 : 1) : 1,
    tilt = climbing ? Math.max(-0.6, Math.min(0.6, Math.atan2(Math.sin(gaze), sg * Math.cos(gaze)))) : shafted || frontal ? 0 : head + Math.max(-0.8, Math.min(0.8, wrapA(gaze - head))),
    ct = Math.cos(tilt),
    stl = Math.sin(tilt),
    eye = (ox, oy) => [cx + sg * r * (ox * ct - oy * stl), cy + r * (ox * stl + oy * ct)],
    // (facing out of a shaft his eyes slide in his face toward what he looks at, his head staying still)
    gx = shafted && look ? 0.34 * Math.cos(gaze) - 0.12 : 0,
    gy = shafted && look ? 0.26 * Math.sin(gaze) : 0,
    E = [eye(fx - 0.35 + gx, -0.15 + gy), eye(fx + 0.3 + gx, -0.15 + gy)],
    ey = (E[0][1] + E[1][1]) / 2,
    eyes = E.map(p => p[0]);
  if (dead && t - R.deadT > 0.2) {
    g.strokeStyle = '#ff2030';
    g.lineWidth = 0.025 * m;
    g.beginPath();
    for (const ex of eyes) {
      g.moveTo(ex - r * 0.15, ey - r * 0.15);
      g.lineTo(ex + r * 0.15, ey + r * 0.15);
      g.moveTo(ex + r * 0.15, ey - r * 0.15);
      g.lineTo(ex - r * 0.15, ey + r * 0.15);
    }
    g.stroke();
    return;
  }
  const big = (R.mode === 'shaft' && !R.climbPose) || frontal ? 1.35 : face === 'scared' ? 1.45 : 1,
    squint = face === 'angry' || face === 'annoyed' ? 0.45 : face === 'sleepy' ? 0.3 : 1 - 0.35 * wary,
    // (gold on a golden beat and through the overdrive, pink at the streak's top tier)
    col = goldOn || R.od ? '#ffd84a' : R.tier >= 3 ? '#ff4fd8' : '#ff1a2e';
  for (const [ex, eY] of E) glowDot(g, ex, eY, r * (0.5 + 0.6 * mf.kick), col, 0.8 * f.glow);
  g.fillStyle = col;
  g.beginPath();
  for (const [i, [ex, eY]] of E.entries()) {
    // (a wink: the second eye shut to a line)
    if (face === 'wink' && i === 1) continue;
    g.moveTo(ex + r * 0.17 * big * ct, eY + r * 0.17 * big * stl);
    g.ellipse(ex, eY, r * 0.17 * big, r * 0.11 * big * (face === 'scared' ? 1.5 : squint), tilt + (face === 'angry' || face === 'annoyed' ? (ex < cx ? 0.35 : -0.35) : 0), 0, Math.PI * 2);
  }
  g.fill();
  if (face === 'wink') {
    g.strokeStyle = col;
    g.lineWidth = 0.03 * m;
    g.beginPath();
    g.moveTo(E[1][0] - r * 0.18, E[1][1]);
    g.lineTo(E[1][0] + r * 0.18, E[1][1] - r * 0.05);
    g.stroke();
  }
  g.shadowBlur = 0;
}

// words of his drawn after the lens (f.label), placed as they would have been here: his stretch's view (inSeg moves the
// camera onto the stretch's own distances while he is drawn; by the time labels are drawn it is back on the stage)
function here(f, fn) {
  const v = f.v,
    x = v.x;
  f.label(() => {
    const keep = v.x;
    v.x = x;
    fn();
    v.x = keep;
  });
}
// stage (the cursor's coordinates) to the hero's stretch (world: what he is drawn in)
function stageToWorld(f, p) {
  const st = f.heroSeg?.st;
  return p && st ? [st.d0 + (p[0] - st.ox) / st.dir, p[1]] : p;
}
// the win: on the roof by him, in chalk, his last word to the system (or to the player: lines.js), a letter at a time,
// in two lines
const seedOf = R => R.L.A.seed ?? 0;
function chalk(f) {
  const { g, v, run: R, t } = f;
  if (!R.victory || !R.J) return;
  const words = line('chalk', seedOf(R), R.memory?.runs ?? 0).split(' '),
    half = Math.ceil(words.length / 2),
    lines = words.length > 2 ? [words.slice(0, half).join(' '), words.slice(half).join(' ')] : [words.join(' ')],
    total = lines.join('').length;
  let n = Math.floor(Math.min(total, (t - R.victory.t0 - 0.4) * 14));
  if (n <= 0) return;
  g.save();
  g.font = `bold ${0.3 * v.ppm}px Helvetica, Arial, sans-serif`;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.lineWidth = 0.06 * v.ppm;
  g.strokeStyle = 'rgba(0,0,0,0.75)';
  g.fillStyle = 'rgba(255,255,255,0.95)';
  // (written on the roof's face just ahead of him, two lines, a little shaky; turned back round on a stretch drawn mirrored,
  // so it reads)
  g.translate(v.sx(R.J[0] + 1.6), v.sy(R.y - 0.3));
  unmirror(g, 0, 0);
  for (const [k, line] of lines.entries()) {
    const W = g.measureText(line).width;
    for (let i = 0; i < line.length && n > 0; i++, n--) {
      const x = -W / 2 + g.measureText(line.slice(0, i)).width,
        y = k * 0.38 * v.ppm + (hash(i * 3.1 + k) - 0.5) * 0.04 * v.ppm;
      g.strokeText(line[i], x, y);
      g.fillText(line[i], x, y);
    }
  }
  g.restore();
}
// what he says himself: a sign held up as another try starts (which try; past nine, "again? really?"), and "not this
// time" as he comes to the place he died last time
function says(f, J) {
  const { g, v, run: R, t } = f,
    mem = R.memory,
    beat = R.L.A.beat;
  if (!mem) return;
  let text = null,
    age = 0;
  if (mem.runs > 0 && t > 0.6 && t < 2.4) (text = mem.runs + 1 >= 10 ? line('retryMany') : line('retry', 0, 0, { n: mem.runs + 1 })), (age = t - 0.6);
  const d = mem.deaths.find(x => x - t > 0 && x - t < 2.5 * beat);
  if (d !== undefined) (text = line('notThisTime')), (age = t - (d - 2.5 * beat));
  if (!text) return;
  const m = v.ppm,
    s = Math.min(1, age / 0.1);
  g.save();
  g.translate(v.sx(J[JI.head * 2]), v.sy(J[JI.head * 2 + 1] + 0.75));
  unmirror(g, 0, 0);
  g.scale(s, s);
  g.font = `bold ${0.3 * m}px Helvetica, Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const w = g.measureText(text).width + 0.3 * m;
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#000';
  g.lineWidth = 0.04 * m;
  g.beginPath();
  g.roundRect(-w / 2, -0.24 * m, w, 0.48 * m, 0.1 * m);
  g.fill();
  g.stroke();
  g.fillStyle = '#111';
  g.fillText(text, 0, 0);
  g.restore();
}
// paused: he knocks on the glass from inside, a knock every 0.6 s of real time, each leaving a print of his fist on it;
// after six seconds the glass cracks
function knock(f) {
  const { g, v } = f,
    p = f.paused,
    m = v.ppm;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  const cx = v.W * 0.5,
    cy = v.H * 0.45,
    n = Math.min(8, Math.floor(p / 0.6) + 1);
  for (let i = 0; i < n; i++) {
    const x = cx + (hash(i * 7.7) - 0.5) * v.W * 0.4,
      y = cy + (hash(i * 3.3) - 0.5) * v.H * 0.25,
      fresh = i === n - 1 ? Math.max(0, 1 - ((p % 0.6) / 0.6) * 3) : 0,
      k = 1 + fresh * 0.2;
    g.fillStyle = `rgba(255,255,255,${0.12 + 0.3 * fresh})`;
    for (const [dx, dy, rr] of [[0, 0, 0.32], [-0.22, -0.28, 0.1], [-0.07, -0.33, 0.1], [0.08, -0.33, 0.1], [0.22, -0.28, 0.1]]) {
      g.beginPath();
      g.arc(x + dx * m * k, y + dy * m * k, rr * m * k, 0, Math.PI * 2);
      g.fill();
    }
  }
  // (and written on the glass with a finger, one line after another)
  const said = [[1.5, 0], [5, 1], [10, 2]].filter(([at]) => p > at);
  g.font = `bold ${0.5 * m}px 'Comic Sans MS', 'Marker Felt', Helvetica, sans-serif`;
  g.textAlign = 'center';
  g.fillStyle = 'rgba(255,255,255,0.55)';
  for (const [k, [, i]] of said.entries()) g.fillText(line('glass', 0, i), cx, cy - v.H * 0.2 + k * 0.7 * m);
  if (p > 6) {
    g.strokeStyle = 'rgba(255,255,255,0.7)';
    g.lineWidth = 1.5 * v.dpr;
    g.beginPath();
    for (let i = 0; i < 9; i++) {
      let x = cx,
        y = cy,
        a = (i / 9) * Math.PI * 2 + hash(i);
      g.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        a += (hash(i * 11 + j) - 0.5) * 0.8;
        x += Math.cos(a) * m * (0.4 + hash(i + j));
        y += Math.sin(a) * m * (0.4 + hash(i - j));
        g.lineTo(x, y);
      }
    }
    g.stroke();
  }
  g.restore();
}
const wrapA = a => a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));
// where his eyes go climbing, on the screen as he is drawn (a shaft facing -x draws him turned about himself, so the
// point turns about him too)
function climbEye(f, R) {
  const { v, t, heroSeg } = f,
    [x, y] = R.climbPose.look,
    hx = R.heroX(t),
    turned = heroSeg && R.L.vertical(heroSeg) && (heroSeg.face ?? 1) < 0;
  return [v.sx(turned ? 2 * hx - x : x), v.sy(y)];
}
// where his eyes go flying up a shaft (screen): the next hazard coming down at him within two beats, the one in his lane
// or else the nearest closed lane to his; else straight up (a zone or nothing: the open shaft ahead). A shaft facing -x
// draws him turned about himself, so the point turns about him too, as climbing
function riseEye(f, R, cx, cy) {
  const { v, t, heroSeg } = f,
    s = heroSeg,
    beat = R.L.A.beat,
    o = s && R.L.obs?.find(q => q.seg === s && (q.type === 'lane' || q.type === 'gate') && !q.res && q.t > t - 0.05 && q.t < t + 2 * beat && q.y > R.y + 0.4);
  if (!o) return [cx, cy - 100];
  const lanes = o.lanes ?? [1],
    l = lanes.reduce((a, b) => (Math.abs(b - R.lane) < Math.abs(a - R.lane) ? b : a), lanes[0]),
    x = R.laneXOf(s, l),
    hx = R.heroX(t),
    turned = R.L.vertical(s) && (s.face ?? 1) < 0;
  return [v.sx(turned ? 2 * hx - x : x), v.sy(o.y)];
}
// what he looks at (screen): the next thing in his way or clone coming at him, within a beat and a half, at its top or
// its chest; else nothing (straight ahead)
function lookAt(f) {
  const { run: R, t, v } = f,
    beat = R.L.A.beat,
    o = R.L.obs?.find(q => q.t > t - 0.05 && q.t < t + 1.5 * beat && !q.res && q.type !== 'ring' && q.type !== 'lane' && q.type !== 'gate' && q.type !== 'foeback');
  if (!o) return null;
  const x = o.thingX ?? (o.type === 'long' || o.type === 'hold' || o.type === 'glide' || o.type === 'zip' || o.type === 'dash' ? o.x0 : o.x),
    y = (o.y ?? R.y) + (o.type === 'slide' || o.type === 'long' ? 1.0 : o.type === 'foe' || o.type === 'chord' ? 1.3 : (o.h ?? 1.2));
  return x === undefined ? null : [v.sx(x), v.sy(y)];
}

// a cape from his neck along the animator's rope, wide at the hem, rippling (red, edged white like him)
function cape(f, P) {
  const { g, v } = f,
    m = v.ppm,
    n = P.length,
    S = P.map(([x, y]) => [v.sx(x), v.sy(y)]),
    side = s => {
      const out = [];
      for (let i = 0; i < n; i++) {
        const [ax, ay] = S[Math.max(0, i - 1)],
          [bx, by] = S[Math.min(n - 1, i + 1)],
          d = Math.hypot(bx - ax, by - ay) || 1,
          w = (0.06 + 0.26 * (i / (n - 1))) * m * s;
        out.push([S[i][0] - ((by - ay) / d) * w, S[i][1] + ((bx - ax) / d) * w]);
      }
      return out;
    };
  g.beginPath();
  for (const p of side(1)) g.lineTo(...p);
  for (const p of side(-1).reverse()) g.lineTo(...p);
  g.closePath();
  g.fillStyle = '#c4001a';
  g.fill();
  g.strokeStyle = '#ffffff';
  g.lineWidth = 0.03 * m;
  g.stroke();
}

// the hands and feet smeared back over the last few steps when they move fast (a strike, a kick, a flip)
function smears(f, T) {
  const { g, v } = f;
  g.save();
  g.lineCap = 'round';
  for (const j of [JI.haL, JI.haR, JI.toL, JI.toR]) {
    const sp = Math.hypot(T[0][j * 2] - T[3][j * 2], T[0][j * 2 + 1] - T[3][j * 2 + 1]) / (3 / 120);
    if (sp < 7) continue;
    const a = Math.min(0.7, (sp - 7) / 10);
    for (let i = 0; i < 5; i++) {
      g.strokeStyle = `rgba(255,255,255,${a * (1 - i / 5)})`;
      g.lineWidth = 0.13 * (1 - i / 6) * v.ppm;
      g.beginPath();
      g.moveTo(v.sx(T[i][j * 2]), v.sy(T[i][j * 2 + 1]));
      g.lineTo(v.sx(T[i + 1][j * 2]), v.sy(T[i + 1][j * 2 + 1]));
      g.stroke();
    }
  }
  g.restore();
}

// a hoverboard under his feet where the animator has it: tipped with it (nose up kicked, down to land), turning over in
// a flip (seen side on, a flip is the board thinning to its edge and back), its underside glowing and jets streaming behind
function board(f, b) {
  const { g, v, mf, T } = f,
    m = v.ppm,
    // (popping into being under his feet as the ride starts)
    ms = modeStart(f.run.L, f.t, 0.15),
    pop = ms?.mode === 'ride' ? Math.min(1, (f.t - ms.t0) / 0.12) : 1;
  g.save();
  g.translate(v.sx(b.x), v.sy(b.y) + 0.06 * m);
  g.rotate(-b.a);
  g.scale(pop * (1 + 0.3 * (1 - pop)), pop);
  // (spun flat under him, a shove-it or a powerslide: seen side on, it shortens to its end and back)
  const cy = Math.cos(b.yaw || 0);
  g.scale(Math.sign(cy || 1) * Math.max(0.12, Math.abs(cy)), 1);
  g.scale(1, Math.cos(b.flip || 0) || 0.08);
  // (sparks off its edge, slung sideways and grinding on the air)
  if (b.sparks)
    for (let i = 0; i < 9; i++) {
      const u = (f.t * 4 + i * 0.37) % 1,
        sx = -0.5 * m - u * 1.4 * m,
        sy = 0.08 * m - Math.sin(u * Math.PI) * 0.4 * m * (0.5 + ((i * 0.61) % 1));
      g.fillStyle = `rgba(255,${180 + ((i * 40) % 75)},80,${1 - u})`;
      g.fillRect(sx, sy, 0.05 * m, 0.05 * m);
    }
  glowDot(g, 0, 0.12 * m, (0.8 + 0.4 * mf.kick) * m, T.line, 0.5 + 0.4 * mf.kick);
  g.fillStyle = '#0d0f14';
  g.strokeStyle = '#ffffff';
  g.lineWidth = 0.03 * m;
  g.beginPath();
  g.roundRect(-0.6 * m, -0.04 * m, 1.2 * m, 0.11 * m, 0.05 * m);
  g.fill();
  g.stroke();
  g.fillStyle = T.line;
  g.fillRect(-0.5 * m, 0.05 * m, 1.0 * m, 0.03 * m);
  // (the jets: two flames streaming back)
  for (const y of [0.0, 0.05]) {
    const len = (0.4 + 0.5 * mf.kick + 0.1 * (1 + Math.sin(f.t * 61 + y * 40))) * m;
    g.fillStyle = rgba(T.line, 0.7);
    g.beginPath();
    g.moveTo(-0.6 * m, y * m - 0.03 * m);
    g.lineTo(-0.6 * m - len, y * m);
    g.lineTo(-0.6 * m, y * m + 0.03 * m);
    g.fill();
  }
  g.restore();
}

// the ghost raced (his best run, or a friend's from a link: main.js): him in faint cyan, no face
export function drawGhost(f, J) {
  const { g, v } = f;
  g.save();
  g.globalAlpha *= 0.45;
  stick(f, J, [['#5ee7ff', 0.11]]);
  const hx = v.sx(J[JI.head * 2]),
    hy = v.sy(J[JI.head * 2 + 1]);
  g.strokeStyle = '#5ee7ff';
  g.lineWidth = 0.04 * v.ppm;
  g.beginPath();
  g.arc(hx, hy, 0.15 * v.ppm, 0, Math.PI * 2);
  g.stroke();
  g.restore();
}
