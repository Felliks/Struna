// The buttons on the screen (settings 'controls': 'buttons'), for a player who would rather press than swipe: four round
// buttons, each the way it points on the screen, as an arrow key is (input.js: a button is a swipe that way, held while
// the finger stays on it; two at once, a chord). Each one where the player put it, as big and as see-through as they
// like (Rocket League Sideswipe's layout: ui/pads-edit.js moves them), a layout for the phone held upright and one for
// it held sideways (settings 'pads'). By default two under each thumb on the arc it sweeps from its corner, the lower
// one nearer the edge, mirrored left and right, below his ground and clear of the screen's side edges (Android's back)
// and bottom (the home bar). Each is tinted the colour of the move it gives as the world is turned now (hints.js:
// colour = move), lit the moment a finger lands on it. Only shown while a song plays (index.html: body.playing.pads)
// or while they are being placed (body.padedit).
import { MOVE_COLOUR } from '../hints.js';

// the buttons, by the screen direction each gives (input.js's actions before the world's swap), and their arrows' turn
const PADS = [
  ['jump', -90],
  ['slide', 90],
  ['left', 180],
  ['right', 0],
];
const MOVE = { jump: 'jump', slide: 'slide', right: 'kick', left: 'grab' };
// the size and see-through limits (CSS px across; opacity)
export const SIZE = [44, 150],
  OPACITY = [0.15, 1];

// the layout a phone starts with, held `way` ('portrait' | 'landscape') on a W x H screen: each button's middle (as a
// share of the screen, so it keeps its place on another phone), its size and opacity. (px from the corner each thumb
// rests at: the lower one by the edge, the upper one in along the thumb's arc)
export function defaults(way, W, H) {
  const up = way === 'portrait',
    s = up ? 76 : 70,
    near = up ? [68, 96] : [62, 62],
    far = up ? [150, 186] : [146, 118],
    at = ([dx, dy], right) => ({ x: (right ? W - dx : dx) / W, y: (H - dy) / H, s, o: 0.5 });
  return { slide: at(near, false), jump: at(far, false), right: at(near, true), left: at(far, true) };
}
export const wayOf = (W, H) => (W < H ? 'portrait' : 'landscape');

export class Pads {
  // `layouts`: () => the saved layouts { portrait?, landscape? } (settings 'pads')
  constructor(el, layouts = () => null) {
    this.el = el;
    this.layouts = layouts;
    this.on = false;
    this.swap = '';
    this.b = {};
    for (const [a, deg] of PADS) {
      const b = document.createElement('b');
      b.dataset.a = a;
      b.innerHTML = `<svg viewBox="-1 -1 2 2" style="transform: rotate(${deg}deg)"><path d="M-0.3 -0.48 L0.26 0 L-0.3 0.48" /></svg>`;
      el.append(b);
      this.b[a] = b;
    }
    this.place();
    this.tint({});
    addEventListener('resize', () => this.place());
  }
  // the layout for the way the phone is held now (the saved one, any button it lacks from the defaults)
  layout() {
    const W = innerWidth,
      H = innerHeight,
      way = wayOf(W, H);
    return { way, W, H, ...defaults(way, W, H), ...(this.layouts()?.[way] ?? {}) };
  }
  // each button put where the layout has it (on a resize, a turn of the phone, a change in the editor)
  place() {
    const L = this.layout();
    this.at_ = [];
    for (const [a] of PADS) {
      const { x, y, s, o } = L[a],
        cx = x * L.W,
        cy = y * L.H,
        st = this.b[a].style;
      st.left = `${cx - s / 2}px`;
      st.top = `${cy - s / 2}px`;
      st.width = st.height = `${s}px`;
      st.setProperty('--o', o);
      this.at_.push([a, cx, cy, s / 2]);
    }
  }
  show(on) {
    if (on === this.on) return;
    this.on = on;
    document.body.classList.toggle('pads', on);
    if (!on) for (const b of Object.values(this.b)) b.classList.remove('down');
  }
  // the button under a point (CSS px), or null: a little past its edge still counts (a thumb is wide), the nearest of
  // two; anywhere else is not a button (a finger there swipes as before)
  at(x, y) {
    if (!this.on) return null;
    let best = null,
      bd = Infinity;
    for (const [a, cx, cy, r] of this.at_) {
      const d = Math.hypot(x - cx, y - cy) - r;
      if (d < 16 && d < bd) ((bd = d), (best = a));
    }
    return best;
  }
  lit(a, on) {
    this.b[a]?.classList.toggle('down', on);
  }
  // each button in the colour of the move it gives now (`swap`: modes.js screenSwap, an action -> the one it is on the
  // screen); written only when the world turns
  tint(swap) {
    const key = JSON.stringify(swap);
    if (key === this.swap) return;
    this.swap = key;
    // (the screen's way -> the action it gives: the swap is its own inverse)
    for (const [a] of PADS) this.b[a].style.setProperty('--c', MOVE_COLOUR[MOVE[swap[a] ?? a]]);
  }
}
