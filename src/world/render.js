// A composed world drawn (compose.js): the sky's piece; behind the base's rows its guest landmarks, then the far rows
// of its far place, then its own landmark, its near rows and what its place draws over them (after: beams, heat), a
// veil of the horizon's haze over what is behind each (one air over parts from different places: Ori's and Hollow
// Knight's fog planes); and its ground.
import { partOf } from './registry.js';
import { rgba } from '../render/util.js';

// a veil of the horizon's haze from a quarter of the way down the screen, a deep at the bottom
function veil(f, a) {
  const { g, v, T } = f,
    gr = g.createLinearGradient(0, v.H * 0.25, 0, v.H);
  gr.addColorStop(0, rgba(T.sky[2], 0));
  gr.addColorStop(1, rgba(T.sky[2], a));
  g.fillStyle = gr;
  g.fillRect(-v.W, v.H * 0.25, v.W * 3, v.H * 2);
}

export function drawWorldSky(f, spec) {
  partOf('sky', spec.sky)?.draw(f);
}

// `look`: the base place's own drawing (render/places/*), for its own landmark and, when it does not draw its rows
// apart, its whole background
export function drawWorldBack(f, spec, look, ownMark) {
  for (const id of spec.guests) partOf('mark', id)?.draw(f);
  if (spec.guests.length) veil(f, 0.35);
  if (!spec.far || !look.near) return look.back(f);
  // (the base's own landmark and near rows through their parts (registry.js): one that ever throws is left out, never
  // the frame)
  if (ownMark) (partOf('mark', `${spec.base}:${spec.own}`)?.draw ?? ownMark)(f);
  partOf('far', spec.far)?.draw(f);
  if (spec.far !== spec.base) veil(f, 0.18);
  (partOf('near', spec.base)?.draw ?? look.near)(f);
  look.after?.(f);
}

// the ground's part for a stretch of the place `place` (a world's own place: its spec's ground; another's, as made)
export const groundOf = (spec, place) => partOf('ground', spec && place === spec.base ? spec.ground : place);

// the song's worlds' parts made ready while it loads (renderer.js, its first frame drawn out of sight): each part's and
// each place's own warm(f), if it has one (the pictures it paints once and stamps), for each of the song's looks, in its
// own palette and in its drop's
export function warmWorld(f, looks, LOOKS) {
  for (const lk of new Set(Object.values(looks))) {
    const m = lk.mix,
      fs = [false, true].map(drop => ({ ...f, look: lk, place: lk.place, T: lk.palAt ? lk.palAt(0, drop) : f.T, mf: { ...f.mf, amp: drop ? 1 : 0 } })),
      parts = m
        ? [['sky', m.sky], ['far', m.far], ['near', m.base], ['ground', m.ground], ['weather', m.weather], ['performer', m.performer], ['clone', m.clone], ['mark', `${m.base}:${m.own}`], ...m.guests.map(id => ['mark', id])]
        : [];
    for (const ff of fs) {
      try {
        LOOKS[lk.place]?.warm?.(ff);
        for (const [slot, id] of parts) partOf(slot, id)?.warm?.(ff);
      } catch (e) {
        console.error('warmWorld:', e);
      }
    }
  }
}
