// How to play, shown while a song loads and in the pause (the point of need, the way Muse Dash and Hi-Fi Rush show
// their moves): each move as the note it is in the run (hints.js: its colour, its arrow; a child who cannot read yet
// knows it by those), beside how it is pressed on this device right now: the keys on a PC, the swipe on a phone held
// upright (drawn moving), the half of the screen held sideways, the button on the screen, or the gamepad's button when
// one is plugged in. One word each at most; a held move shown as a note with a bar after it. Laid out in a row on a wide
// screen, in two columns on a narrow one (index.html .ctlcard).
import { MOVE_COLOUR } from '../hints.js';
import { tr } from '../i18n.js';

// the moves: the action, its colour, its arrow's turn (degrees, 0 = right), its word
const MOVES = [
  ['jump', MOVE_COLOUR.jump, -90, 'jump'],
  ['slide', MOVE_COLOUR.slide, 90, 'slide'],
  ['right', MOVE_COLOUR.kick, 0, 'kick'],
  ['left', MOVE_COLOUR.grab, 180, 'kick behind'],
];
const GOLD = '#ffd84a';
// (an arrow, drawn: the game's fonts have none)
const arrow = (deg, c, w = 0.26) => `<path d="M-0.42 0H0.36M0.06 -0.3L0.38 0L0.06 0.3" transform="rotate(${deg})" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
// the move as its note in the run: a dark disc ringed in its colour, its arrow in it
const note = (c, deg) => `<svg class="cc-note" viewBox="-1 -1 2 2" aria-hidden="true"><circle r="0.86" fill="#0b0a12" stroke="${c}" stroke-width="0.14"/>${arrow(deg, c)}</svg>`;
const key = k => `<kbd>${k}</kbd>`;
const KEYS = { jump: ['↑', 'W', tr('Space')], slide: ['↓', 'S'], right: ['→', 'D'], left: ['←', 'A'] };
// (a gamepad's face buttons in their usual colours; the d-pad drawn as a cross with its arm lit)
const PADB = { jump: ['A', '#3fbf6a'], slide: ['B', '#e0484f'], right: ['X', '#3f7fe0'], left: ['LB', '#8a8a96'] };
const dpad = deg =>
  `<svg class="cc-in" viewBox="-1 -1 2 2" aria-hidden="true"><path d="M-0.3 -0.9H0.3V-0.3H0.9V0.3H0.3V0.9H-0.3V0.3H-0.9V-0.3H-0.3Z" fill="#2a2834" stroke="#fff4" stroke-width="0.06"/><rect x="0.32" y="-0.28" width="0.54" height="0.56" rx="0.08" fill="#fff" transform="rotate(${deg})"/></svg>`;
// a finger's swipe that way, drawn moving (its trail and the fingertip running along it, again and again)
const swipe = (deg, c) =>
  `<svg class="cc-in cc-swipe" viewBox="-1 -1 2 2" aria-hidden="true"><g transform="rotate(${deg})"><path d="M-0.7 0H0.6" stroke="${c}" stroke-opacity="0.35" stroke-width="0.14" stroke-linecap="round"/><path d="M0.42 -0.26L0.72 0L0.42 0.26" fill="none" stroke="${c}" stroke-width="0.12" stroke-linecap="round" stroke-linejoin="round"/><circle class="cc-tip" r="0.2" fill="#fff"/></g></svg>`;
// a tap: rings spreading under a fingertip
const tap = c => `<svg class="cc-in cc-tap" viewBox="-1 -1 2 2" aria-hidden="true"><circle class="cc-ring" r="0.5" fill="none" stroke="${c}" stroke-width="0.1"/><circle r="0.22" fill="#fff"/></svg>`;
// a phone held sideways, the half that does it lit, a tap or a swipe in it
const half = (right, c, deg = null) =>
  `<svg class="cc-in cc-half" viewBox="-1.5 -1 3 2" aria-hidden="true"><rect x="-1.4" y="-0.85" width="2.8" height="1.7" rx="0.22" fill="#15131c" stroke="#fff5" stroke-width="0.06"/><rect x="${right ? 0.02 : -1.36}" y="-0.81" width="1.34" height="1.62" rx="0.16" fill="${c}" fill-opacity="0.3"/><g transform="translate(${right ? 0.7 : -0.7} 0) scale(0.5)">${deg === null ? `<circle class="cc-ring" r="0.6" fill="none" stroke="${c}" stroke-width="0.16"/><circle r="0.28" fill="#fff"/>` : `<g transform="rotate(${deg})"><path d="M-0.7 0H0.6" stroke="#fff" stroke-opacity="0.4" stroke-width="0.2" stroke-linecap="round"/><circle class="cc-tip" r="0.3" fill="#fff"/></g>`}</g></svg>`;
// the four buttons on the screen, the one that does it lit
const pads = act =>
  `<svg class="cc-in" viewBox="-1.6 -1 3.2 2" aria-hidden="true">${[
    ['slide', -1.05, 0.45],
    ['jump', -0.45, -0.35],
    ['right', 1.05, 0.45],
    ['left', 0.45, -0.35],
  ]
    .map(([a, x, y]) => {
      const m = MOVES.find(q => q[0] === a);
      return `<g transform="translate(${x} ${y}) scale(0.42)"><circle r="0.9" fill="${a === act ? m[1] : '#0000'}" fill-opacity="${a === act ? 0.45 : 0}" stroke="${a === act ? m[1] : '#fff4'}" stroke-width="0.14"/>${arrow(m[2], a === act ? '#fff' : '#fff6', 0.22)}</g>`;
    })
    .join('')}</svg>`;

// how a move is pressed in a scheme: 'keys' | 'swipe' | 'zones' | 'buttons' | 'pad'
function input(scheme, [act, c, deg]) {
  if (scheme === 'keys') return `<span class="cc-keys">${KEYS[act].map(key).join('')}</span>`;
  if (scheme === 'pad') return `<span class="cc-keys">${dpad(deg)}<kbd class="cc-pb" style="--b:${PADB[act][1]}">${PADB[act][0]}</kbd></span>`;
  if (scheme === 'buttons') return pads(act);
  if (scheme === 'zones') return act === 'jump' ? half(false, c) : act === 'right' ? half(true, c) : half(act === 'left', c, deg);
  // (one finger: a tap is a jump too, the quickest)
  return act === 'jump' ? `<span class="cc-keys">${tap(c)}${swipe(deg, c)}</span>` : swipe(deg, c);
}
// what an overdrive is pressed with, and a hold
const OD = { keys: () => `${key('Shift')}${key('E')}`, pad: () => `<kbd class="cc-pb" style="--b:${GOLD}">Y</kbd>`, touch: () => `<svg class="cc-in" viewBox="-1 -1 2 2" aria-hidden="true"><circle r="0.8" fill="${GOLD}"/><path d="M0.1 -0.5L-0.28 0.06H-0.02L-0.12 0.5L0.28 -0.08H0.02Z" fill="#1a1200"/></svg>` };

// the card for a scheme, into an element; `big`: the loading screen's (the pause's is compact)
export function controlsCard(el, scheme, { big = false } = {}) {
  const tiles = MOVES.map(
      m => `<div class="cc-tile" style="--c:${m[1]}">${note(m[1], m[2])}<div class="cc-how">${input(scheme, m)}</div><b>${tr(m[3])}</b></div>`,
    ).join(''),
    // (a held move: its note with a bar running on after it, and the same press kept down)
    hold = `<div class="cc-tile cc-wide" style="--c:${MOVE_COLOUR.slide}"><svg class="cc-note" viewBox="-1 -1 4 2" aria-hidden="true"><rect x="0" y="-0.22" width="2.8" height="0.44" rx="0.22" fill="${MOVE_COLOUR.slide}" fill-opacity="0.35"/><circle r="0.86" fill="#0b0a12" stroke="${MOVE_COLOUR.slide}" stroke-width="0.14"/>${arrow(90, MOVE_COLOUR.slide)}</svg><b>${tr('keep it pressed')}</b></div>`,
    od = `<div class="cc-tile cc-wide" style="--c:${GOLD}"><span class="cc-keys">${(scheme === 'keys' ? OD.keys : scheme === 'pad' ? OD.pad : OD.touch)()}</span><b>${tr('overdrive')}</b></div>`;
  el.className = `ctlcard${big ? ' big' : ''}`;
  // (the pause's: the four moves only, it is a reminder; the loading screen's teaches the held move and the overdrive too)
  el.innerHTML = big ? `<div class="cc-grid">${tiles}</div><div class="cc-row">${hold}${od}</div><p class="cc-beat">${tr('press on the beat, when the ring closes')}</p>` : `<div class="cc-grid">${tiles}</div>`;
}
// the scheme now: a gamepad in use, the keys, or the touch scheme in force (main.js controls)
export function schemeNow(touch, controls) {
  const gp = typeof navigator !== 'undefined' && navigator.getGamepads ? [...navigator.getGamepads()].some(g => g?.connected) : false;
  if (gp) return 'pad';
  if (!touch) return 'keys';
  return controls;
}
