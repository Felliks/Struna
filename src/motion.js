// How long his moves take, from the song's tempo. Rhythm games put the player's press on the music (Geometry Dash, Bit.Trip
// Runner: obstacles in musical patterns, a jump on a beat or a half beat) and land what it does on the music too (Hi-Fi
// Rush: pressed on one beat, the hit lands on a later one, the animation stretched to land there even when the press was
// a little off). So every press here is on the half-beat grid, and every move ends on it:
//   - a jump lasts a whole number of half beats, the one nearest 0.8 s (a cinematic hang: the peak twice the height of
//     what he clears); he lands on the grid
//   - a slide is held for a whole number of half beats; a kick meets the pane on a grid point after the press
//   - where the music is quick (a sung line, a drop's fill) a move may be shorter, down to a hop of 0.4 s and a duck of
//     0.3 s (on the grid too): the level gives such a thing its own `air` or `slide` (kinds.js)
// Shared by the level (where things go) and the run (how he moves), so the two always agree.
const H = 1.5,
  REST_MIN = 0.25;

export function makeMotion(beat) {
  const grid = beat / 2,
    // the multiple of the half beat nearest `x` (at least one, at most `max` of them)
    snap = (x, max = 8) => grid * Math.max(1, Math.min(max, Math.round(x / grid))),
    air = snap(0.8),
    slide = snap(0.6),
    kickAt = snap(0.3),
    hop = Math.min(air, grid * Math.ceil(0.4 / grid - 1e-6)),
    duck = Math.min(slide, grid * Math.ceil(0.3 / grid - 1e-6));
  return {
    beat,
    grid,
    snap,
    jumpH: H,
    air,
    slide,
    hop,
    duck,
    kickAt,
    // flying_kick meets the pane 41 % of the way through the part of it that is played
    kickDur: kickAt / 0.41,
    // nothing is pressed sooner than this after a move has ended (a breath between moves)
    rest: Math.max(REST_MIN, grid),
  };
}
