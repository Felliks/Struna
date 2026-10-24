// The game's own icons, drawn in its line (a thick dark edge under a coloured stroke, so they read over any world and
// any lens): what the screen says without words. Each is a path in a unit box centred on the point (y down), drawn at
// `s` pixels, swelling on the beat (`pulse` 0..1: the music's beat envelope). Also the gestures a player makes (a finger
// tapping, swiping, held; a key pressed), animated towards the moment they are due (`u` 0..1, 1 on the press).
const TAU = Math.PI * 2;

// the paths (unit box, -0.5..0.5); `fill` ones are filled, the rest stroked
const PATHS = {
  star(g) {
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.2 : 0.5,
        a = -Math.PI / 2 + (i * Math.PI) / 5;
      g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    return 'fill';
  },
  diamond(g) {
    g.moveTo(0, -0.46);
    g.lineTo(0.34, 0);
    g.lineTo(0, 0.46);
    g.lineTo(-0.34, 0);
    g.closePath();
    return 'fill';
  },
  dot(g) {
    g.arc(0, 0, 0.2, 0, TAU);
    return 'fill';
  },
  cross(g) {
    g.moveTo(-0.32, -0.32);
    g.lineTo(0.32, 0.32);
    g.moveTo(0.32, -0.32);
    g.lineTo(-0.32, 0.32);
  },
  // early / late: a small wedge pointing back / ahead
  early(g) {
    g.moveTo(0.2, -0.26);
    g.lineTo(-0.2, 0);
    g.lineTo(0.2, 0.26);
    g.closePath();
    return 'fill';
  },
  late(g) {
    g.moveTo(-0.2, -0.26);
    g.lineTo(0.2, 0);
    g.lineTo(-0.2, 0.26);
    g.closePath();
    return 'fill';
  },
  chain(g) {
    g.roundRect(-0.48, -0.16, 0.56, 0.32, 0.16);
    g.roundRect(-0.08, -0.16, 0.56, 0.32, 0.16);
  },
  spark(g) {
    g.moveTo(0, -0.5);
    g.quadraticCurveTo(0.06, -0.06, 0.5, 0);
    g.quadraticCurveTo(0.06, 0.06, 0, 0.5);
    g.quadraticCurveTo(-0.06, 0.06, -0.5, 0);
    g.quadraticCurveTo(-0.06, -0.06, 0, -0.5);
    return 'fill';
  },
  shield(g) {
    g.moveTo(0, -0.46);
    g.lineTo(0.38, -0.3);
    g.quadraticCurveTo(0.38, 0.24, 0, 0.48);
    g.quadraticCurveTo(-0.38, 0.24, -0.38, -0.3);
    g.closePath();
  },
  heart(g) {
    g.moveTo(0, 0.42);
    g.bezierCurveTo(-0.56, 0.02, -0.4, -0.5, 0, -0.2);
    g.bezierCurveTo(0.4, -0.5, 0.56, 0.02, 0, 0.42);
    g.closePath();
    return 'fill';
  },
  bolt(g) {
    g.moveTo(0.1, -0.5);
    g.lineTo(-0.28, 0.06);
    g.lineTo(-0.02, 0.06);
    g.lineTo(-0.12, 0.5);
    g.lineTo(0.28, -0.08);
    g.lineTo(0.02, -0.08);
    g.closePath();
    return 'fill';
  },
  undo(g) {
    g.arc(0.04, 0.06, 0.3, Math.PI * 1.05, Math.PI * 2.45);
    g.moveTo(-0.38, -0.2);
    g.lineTo(-0.26, 0.08);
    g.lineTo(-0.02, -0.08);
  },
  flame(g) {
    g.moveTo(0, -0.5);
    g.bezierCurveTo(0.16, -0.22, 0.4, -0.06, 0.32, 0.2);
    g.bezierCurveTo(0.26, 0.42, 0.1, 0.5, 0, 0.5);
    g.bezierCurveTo(-0.2, 0.5, -0.34, 0.36, -0.32, 0.14);
    g.bezierCurveTo(-0.3, -0.06, -0.12, -0.12, -0.08, -0.28);
    g.bezierCurveTo(0, -0.14, 0.02, -0.06, 0.08, -0.02);
    g.bezierCurveTo(0.08, -0.2, 0.04, -0.36, 0, -0.5);
    return 'fill';
  },
  fist(g) {
    g.roundRect(-0.34, -0.26, 0.56, 0.5, 0.12);
    g.moveTo(-0.34, -0.06);
    g.lineTo(0.22, -0.06);
    g.moveTo(-0.06, -0.26);
    g.lineTo(-0.06, -0.06);
    g.moveTo(0.1, -0.26);
    g.lineTo(0.1, -0.06);
    // (and the way it goes)
    g.moveTo(0.3, 0);
    g.lineTo(0.5, 0);
    g.moveTo(0.42, -0.08);
    g.lineTo(0.5, 0);
    g.lineTo(0.42, 0.08);
  },
  scissors(g) {
    g.moveTo(-0.22 + 0.13, 0.28);
    g.arc(-0.22, 0.28, 0.13, 0, TAU);
    g.moveTo(0.22 + 0.13, 0.28);
    g.arc(0.22, 0.28, 0.13, 0, TAU);
    g.moveTo(-0.14, 0.18);
    g.lineTo(0.3, -0.46);
    g.moveTo(0.14, 0.18);
    g.lineTo(-0.3, -0.46);
  },
  rotate(g) {
    g.arc(0, 0, 0.34, -Math.PI * 0.3, Math.PI * 1.4);
    g.moveTo(0.2, -0.42);
    g.lineTo(0.22, -0.2);
    g.lineTo(0.44, -0.24);
  },
  zoom(g) {
    g.arc(-0.08, -0.08, 0.28, 0, TAU);
    g.moveTo(0.12, 0.12);
    g.lineTo(0.44, 0.44);
    g.moveTo(-0.2, -0.08);
    g.lineTo(0.04, -0.08);
    g.moveTo(-0.08, -0.2);
    g.lineTo(-0.08, 0.04);
  },
  error(g) {
    g.roundRect(-0.46, -0.36, 0.92, 0.72, 0.06);
    g.moveTo(-0.46, -0.18);
    g.lineTo(0.46, -0.18);
    g.moveTo(-0.12, -0.04);
    g.lineTo(0.12, 0.2);
    g.moveTo(0.12, -0.04);
    g.lineTo(-0.12, 0.2);
  },
  lasso(g) {
    g.ellipse(0.04, -0.14, 0.38, 0.24, -0.2, 0, TAU);
    g.moveTo(-0.24, 0.04);
    g.quadraticCurveTo(-0.3, 0.3, -0.06, 0.46);
  },
  // the marks of what to do, pointing up (turned to the way it goes on screen): a fat chevron for a jump or a
  // slide, a fist for a kick, an open hook of a hand for a grab, a ring for a hold
  chevron(g) {
    g.moveTo(-0.42, 0.18);
    g.lineTo(0, -0.26);
    g.lineTo(0.42, 0.18);
    g.lineTo(0.42, 0.38);
    g.lineTo(0, -0.04);
    g.lineTo(-0.42, 0.38);
    g.closePath();
    return 'fill';
  },
  punch(g) {
    // (a fist seen from the side, its knuckles leading upward, a burst at them)
    g.roundRect(-0.26, -0.18, 0.5, 0.56, 0.14);
    g.moveTo(-0.26, -0.02);
    g.lineTo(0.24, -0.02);
    g.moveTo(-0.26, 0.14);
    g.lineTo(0.24, 0.14);
    g.moveTo(0, -0.3);
    g.lineTo(0, -0.48);
    g.moveTo(-0.26, -0.28);
    g.lineTo(-0.38, -0.42);
    g.moveTo(0.26, -0.28);
    g.lineTo(0.38, -0.42);
  },
  hook(g) {
    g.moveTo(-0.3, 0.44);
    g.lineTo(-0.3, -0.1);
    g.quadraticCurveTo(-0.3, -0.42, 0, -0.42);
    g.quadraticCurveTo(0.3, -0.42, 0.3, -0.12);
    g.lineTo(0.3, 0.02);
    g.moveTo(-0.46, -0.46);
    g.lineTo(0.46, -0.46);
  },
  ring(g) {
    g.arc(0, 0, 0.36, 0, TAU);
  },
  // the acts: the hoverboard, the brawl, the boss, the flight, the blackout, the mirror, the ceiling, the chase
  board(g) {
    g.roundRect(-0.48, 0.02, 0.96, 0.16, 0.08);
    g.moveTo(-0.3, 0.34);
    g.lineTo(-0.1, 0.34);
    g.moveTo(0.1, 0.34);
    g.lineTo(0.3, 0.34);
    g.moveTo(-0.2, -0.36);
    g.lineTo(0.2, -0.36);
  },
  turbo(g) {
    // (two arrows ahead and the lines they leave)
    g.moveTo(-0.1, -0.3);
    g.lineTo(0.2, 0);
    g.lineTo(-0.1, 0.3);
    g.moveTo(0.14, -0.3);
    g.lineTo(0.44, 0);
    g.lineTo(0.14, 0.3);
    g.moveTo(-0.48, -0.14);
    g.lineTo(-0.2, -0.14);
    g.moveTo(-0.48, 0.14);
    g.lineTo(-0.2, 0.14);
  },
  brawl(g) {
    PATHS.fist(g);
  },
  boss(g) {
    g.moveTo(-0.42, 0.3);
    g.lineTo(-0.42, -0.26);
    g.lineTo(-0.2, 0);
    g.lineTo(0, -0.4);
    g.lineTo(0.2, 0);
    g.lineTo(0.42, -0.26);
    g.lineTo(0.42, 0.3);
    g.closePath();
  },
  fly(g) {
    g.moveTo(-0.34, 0.02);
    g.lineTo(0, -0.32);
    g.lineTo(0.34, 0.02);
    g.moveTo(-0.34, 0.36);
    g.lineTo(0, 0.02);
    g.lineTo(0.34, 0.36);
  },
  blackout(g) {
    g.moveTo(-0.46, 0);
    g.quadraticCurveTo(0, -0.42, 0.46, 0);
    g.quadraticCurveTo(0, 0.42, -0.46, 0);
    g.moveTo(0.12, 0);
    g.arc(0, 0, 0.12, 0, TAU);
    g.moveTo(-0.4, 0.4);
    g.lineTo(0.4, -0.4);
  },
  mirror(g) {
    g.moveTo(-0.08, -0.32);
    g.lineTo(-0.46, 0.3);
    g.lineTo(-0.08, 0.3);
    g.closePath();
    g.moveTo(0.08, -0.32);
    g.lineTo(0.46, 0.3);
    g.lineTo(0.08, 0.3);
    g.closePath();
  },
  ceiling(g) {
    g.moveTo(-0.32, -0.08);
    g.lineTo(0.3, -0.46);
    g.lineTo(0.3, -0.08);
    g.closePath();
    g.moveTo(-0.32, 0.08);
    g.lineTo(0.3, 0.46);
    g.lineTo(0.3, 0.08);
    g.closePath();
  },
  cursorchase(g) {
    g.moveTo(-0.3, -0.46);
    g.lineTo(-0.3, 0.3);
    g.lineTo(-0.1, 0.12);
    g.lineTo(0.06, 0.46);
    g.lineTo(0.18, 0.4);
    g.lineTo(0.02, 0.06);
    g.lineTo(0.28, 0.04);
    g.closePath();
  },
};
export const ICONS = Object.keys(PATHS);

// an icon at (x, y), `s` pixels across, in `col`; it swells by `pulse` (the beat) and fades by `alpha`
export function icon(g, name, x, y, s, col, { pulse = 0, alpha = 1, rot = 0 } = {}) {
  const P = PATHS[name];
  if (!P || alpha <= 0) return;
  const k = s * (1 + 0.14 * pulse);
  g.save();
  g.globalAlpha *= alpha;
  g.translate(x, y);
  if (rot) g.rotate(rot);
  g.scale(k, k);
  g.beginPath();
  const fill = P(g) === 'fill';
  g.lineJoin = 'round';
  g.lineCap = 'round';
  // (the dark edge first, then the colour)
  g.strokeStyle = 'rgba(0,0,0,0.75)';
  g.lineWidth = 0.24;
  g.stroke();
  g.strokeStyle = col;
  g.lineWidth = 0.11;
  if (fill) {
    g.fillStyle = col;
    g.fill();
  } else g.stroke();
  g.restore();
}

// a key cap with its letter, pressed in (`down` 0..1) and lit (`lit` 0..1)
export function keycap(g, label, x, y, s, col, { down = 0, lit = 0, alpha = 1 } = {}) {
  g.save();
  g.globalAlpha *= alpha;
  const yy = y + down * s * 0.1;
  g.fillStyle = 'rgba(0,0,0,0.6)';
  g.beginPath();
  g.roundRect(x - s / 2, y - s / 2 + s * 0.1, s, s, s * 0.18);
  g.fill();
  g.fillStyle = lit ? col : 'rgba(255,255,255,0.12)';
  g.globalAlpha *= lit ? 0.35 + 0.65 * lit : 1;
  g.beginPath();
  g.roundRect(x - s / 2, yy - s / 2, s, s, s * 0.18);
  g.fill();
  g.globalAlpha = alpha;
  g.strokeStyle = lit ? col : 'rgba(255,255,255,0.5)';
  g.lineWidth = Math.max(1, s * 0.06);
  g.stroke();
  g.fillStyle = lit ? '#000' : '#fff';
  // (the arrows drawn, not written: the game's font has none, and the first time a missing letter is written the browser
  // goes through the system's fonts for it, a stall of a frame or two)
  const ARROW = { '⇧': -Math.PI / 2, '↑': -Math.PI / 2, '↓': Math.PI / 2, '←': Math.PI, '→': 0 };
  if (label in ARROW) {
    g.translate(x, yy + s * 0.02);
    g.rotate(ARROW[label] + Math.PI / 2);
    const a = s * 0.22;
    g.beginPath();
    g.moveTo(0, -a);
    g.lineTo(a, 0);
    g.lineTo(a * 0.45, 0);
    g.lineTo(a * 0.45, a);
    g.lineTo(-a * 0.45, a);
    g.lineTo(-a * 0.45, 0);
    g.lineTo(-a, 0);
    g.closePath();
    g.fill();
    g.restore();
    return;
  }
  g.font = `900 ${Math.round(s * 0.46)}px Unbounded, 'Arial Black', sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(label, x, yy + s * 0.02);
  g.restore();
}

// a fingertip: a filled disc with a ring round it (pressed: smaller, brighter)
function tip(g, x, y, s, col, press) {
  g.fillStyle = 'rgba(0,0,0,0.5)';
  g.beginPath();
  g.arc(x, y, s * 0.36, 0, TAU);
  g.fill();
  g.fillStyle = col;
  g.globalAlpha *= 0.55 + 0.45 * press;
  g.beginPath();
  g.arc(x, y, s * (0.26 - 0.06 * press), 0, TAU);
  g.fill();
  g.strokeStyle = '#fff';
  g.lineWidth = Math.max(1.5, s * 0.06);
  g.beginPath();
  g.arc(x, y, s * 0.34, 0, TAU);
  g.stroke();
}

// a finger's gesture at (x, y), `s` pixels: a tap (dir null) or a swipe the way `dir` goes (screen, y down, a unit-ish
// vector), held when `hold` (its progress `held` 0..1 once pressed). `u`: how far into its beat before the press it is
// (0..1; past 1, after the press). The swipe's track is drawn ahead of it, the finger rests at its start bouncing on the
// beat and flicks along it in the last part of the beat, landing on the press; the press makes a ring that spreads.
export function gesture(g, x, y, s, col, { dir = null, hold = false, held = 0, u = 0, pulse = 0, alpha = 1 } = {}) {
  g.save();
  g.globalAlpha *= alpha;
  const len = s * 1.5,
    n = dir ? Math.hypot(dir[0], dir[1]) || 1 : 1,
    dx = dir ? (dir[0] / n) * len : 0,
    dy = dir ? (dir[1] / n) * len : 0,
    // (the flick: the last 40 % of the beat, eased out so it lands on the press)
    m = dir ? Math.min(1, Math.max(0, (u - 0.6) / 0.4)) : 0,
    e = 1 - (1 - m) * (1 - m),
    sx = x - dx / 2,
    sy = y - dy / 2,
    fx = sx + dx * e,
    fy = sy + dy * e;
  // the way to swipe: a fat arrow from where the finger lands to where it lifts (the arrow alone says which way)
  if (dir) arrow(g, sx, sy, sx + dx, sy + dy, s * 0.42, col, 0.55 + 0.45 * Math.max(m, pulse * 0.6));
  // (resting: a bounce on the beat; a tap comes down onto the glass through the beat)
  const press = u >= 1 ? 1 : dir ? m : Math.max(0, (u - 0.5) / 0.5),
    lift = (1 - press) * s * (dir ? 0.06 * pulse : 0.3 * (1 - u));
  // a tap: rings spreading from under the finger as it lands (the "touch here" every phone game shows)
  if (!dir && !hold)
    for (let k = 0; k < 2; k++) {
      const r = (u - 0.9 - k * 0.15) / 0.5;
      if (r <= 0 || r >= 1) continue;
      g.strokeStyle = col;
      g.globalAlpha = alpha * (1 - r) * 0.9;
      g.lineWidth = s * 0.07;
      g.beginPath();
      g.arc(fx, fy, s * (0.3 + 0.6 * r), 0, TAU);
      g.stroke();
      g.globalAlpha = alpha;
    }
  // (the ghost hand, its fingertip on the point; a soft disc under the fingertip where it meets the glass)
  tip(g, fx, fy, s * 0.7, col, press);
  hand(g, fx, fy - lift, s * 0.4 * (1 + 0.06 * pulse) * (dir ? 1 : 1.15 - 0.15 * press), col, { press });
  // held: an arc filling round the finger
  if (hold && u >= 1) {
    g.strokeStyle = col;
    g.lineWidth = s * 0.12;
    g.beginPath();
    g.arc(fx, fy, s * 0.5, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, held));
    g.stroke();
  }
  g.restore();
}
// a fat arrow from (ax, ay) to (bx, by), `w` thick, in `col` (`lit` how bright), outlined dark so it reads on anything
function arrow(g, ax, ay, bx, by, w, col, lit = 1) {
  const a = Math.atan2(by - ay, bx - ax),
    L = Math.hypot(bx - ax, by - ay),
    hl = Math.min(L * 0.5, w * 1.3),
    c = Math.cos(a),
    sn = Math.sin(a),
    P = (u, v) => [ax + c * u - sn * v, ay + sn * u + c * v];
  g.beginPath();
  for (const [u, v] of [[0, -w / 2], [L - hl, -w / 2], [L - hl, -w * 1.1], [L, 0], [L - hl, w * 1.1], [L - hl, w / 2], [0, w / 2]]) g.lineTo(...P(u, v));
  g.closePath();
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(0,0,0,0.75)';
  g.lineWidth = w * 0.4;
  g.stroke();
  g.fillStyle = col;
  g.globalAlpha *= lit;
  g.fill();
  g.globalAlpha /= lit;
}

// a ghost hand pointing, its fingertip at (x, y) (the point it touches), `s` its fingertip's size; pressed it is a
// little smaller; translucent white with an edge of `col`
export function hand(g, x, y, s, col, { press = 0, alpha = 1 } = {}) {
  g.save();
  g.globalAlpha *= alpha;
  g.translate(x, y);
  const k = s * (1 - 0.08 * press);
  g.scale(k, k);
  g.beginPath();
  // (the index finger up from the palm, the other fingers folded, the thumb to the side)
  g.roundRect(-0.32, -0.32, 0.64, 1.6, 0.32);
  g.roundRect(0.18, 0.7, 0.62, 0.5, 0.25);
  g.roundRect(0.18, 1.12, 0.6, 0.48, 0.24);
  g.roundRect(0.14, 1.5, 0.56, 0.44, 0.22);
  g.roundRect(-0.9, 0.95, 0.66, 0.42, 0.21);
  g.roundRect(-0.36, 0.7, 1.12, 1.6, 0.42);
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(0,0,0,0.7)';
  g.lineWidth = 0.32;
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.88)';
  g.fill();
  g.strokeStyle = col;
  g.lineWidth = 0.12;
  g.stroke();
  // (the fingertip lit where it touches)
  g.fillStyle = col;
  g.globalAlpha *= 0.5 + 0.5 * press;
  g.beginPath();
  g.arc(0, -0.04, 0.2, 0, TAU);
  g.fill();
  g.restore();
}
