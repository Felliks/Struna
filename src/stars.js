// A song's star: the move it is about. Without one every song plays the same (a run of jumps and slides, the rare moves
// only where the music happens to ask for them); with one each song is its own task (Rhythm Heaven: every game a verb
// of its own), and over the song the star is told as a story in four parts (kishōtenketsu, Koichi Hayashida's levels):
//   ki     brought in: now and then, alone, before the first drop's run-up (learned)
//   shō    built up: more often, before a drop and between drops
//   ten    turned: on the drops, often, and with its twist (its partner move: clones from behind as well as in front,
//          panes in a corridor, a swing on from a glide)
//   ketsu  played out: after the last drop, star and twist together
// A set's last song (main.js) plays the stars of the songs before it together (a remix).
import { mulberry } from './rng.js';

// the stars: their twist partner, and how well each suits a song (its profile, profile.js)
const STARS = {
  foe: { twist: 'foeback', suits: P => 0.4 + P.hardness },
  chord: { twist: 'foe', suits: P => 0.3 + P.arousal },
  smash: { twist: 'dash', suits: P => 0.3 + 0.8 * P.hardness },
  dash: { twist: 'smash', suits: P => 0.2 + P.arousal },
  long: { twist: 'glide', suits: P => 0.3 + P.chill },
  glide: { twist: 'grab', suits: P => 0.3 + 0.6 * (1 - P.hardness) },
  grab: { twist: 'zip', suits: P => 0.3 + 0.6 * P.valence },
  zip: { twist: 'grind', suits: P => 0.25 + 0.5 * P.valence + 0.3 * P.arousal },
  // (the props, level.js: a thing thrown at him batted home, a thing picked up and thrown; laid by the level's own pass
  // over the bars, not slot by slot: starKind leaves them to it. Their twist on the drops is their own (two throwers
  // taking turns, a pick and its throw chained into the next), with clones in front or panes as the slots' partner)
  bat: { twist: 'foe', suits: P => 0.4 + 0.55 * P.hardness + 0.3 * P.arousal },
  pick: { twist: 'smash', suits: P => 0.35 + 0.6 * P.valence + 0.35 * P.arousal },
};
// the stars the level lays itself (level.js props), not asked of a bar's slots
export const PROPS = new Set(['bat', 'pick']);
// the stars that last (held through beats): they fit only a bar's first slots
export const LASTING = new Set(['dash', 'long', 'glide', 'grab', 'zip', 'grind']);
// how often a slot is asked to be a star, by the part of the story it is in
export const STAR_RATE = { ki: 0.3, sho: 0.55, ten: 0.75, ketsu: 0.6 };

// the song's star plan: { star, stars, phaseAt(t), kindsAt(t) }; `force`: the stars of the songs before it that a set's
// last song plays with its own (a remix), `avoid`: stars not to pick (the songs before in a set), `locked`: moves the
// player has not unlocked yet (meta.js)
export function starPlan(A, P, acts, { locked = [], force = null, avoid = [] } = {}) {
  const r = mulberry((A.seed ?? 1) ^ 0x5a17),
    ok = k => !locked.includes(k) && !locked.includes(STARS[k].twist),
    // (one of the three that suit the song best, by its seed; the songs before it in a set left out)
    ranked = Object.keys(STARS)
      .filter(k => ok(k) && !avoid.includes(k) && !(force ?? []).includes(k))
      .sort((a, b) => STARS[b].suits(P) - STARS[a].suits(P)),
    star = ranked[Math.floor(r() * Math.min(3, ranked.length))] ?? 'foe',
    stars = [star, ...(force ?? []).filter(k => STARS[k] && ok(k) && k !== star)],
    twist = STARS[star].twist;
  // the parts of the story by the song's drops: before the first, its first half brought in, its second built up; on
  // a drop, turned; after the last one, played out (a song with no drop: by thirds)
  const drops = acts.filter(a => a.kind === 'drop').sort((p, q) => p.t0 - q.t0),
    dur = A.dur ?? 180;
  const phaseAt = t => {
    if (!drops.length) return t < dur * 0.3 ? 'ki' : t < dur * 0.6 ? 'sho' : t < dur * 0.85 ? 'ten' : 'ketsu';
    if (t < drops[0].t0) return t < drops[0].t0 / 2 ? 'ki' : 'sho';
    if (drops.some(d => t >= d.t0 && t < d.t1)) return 'ten';
    return t >= drops.at(-1).t1 ? 'ketsu' : 'sho';
  };
  const kindsAt = t => {
    const ph = phaseAt(t);
    return ph === 'ten' || ph === 'ketsu' ? [...stars, twist] : stars;
  };
  return { star, stars, twist, phaseAt, kindsAt };
}

// the obstacle a star asks a slot to be, if the slot can take it (its sound, its place in the bar, what the bar already
// has, the room left in it); else null and the slot is what its music asks
export function starKind(k, s, b, { beat, has, gapped, kick, skins, pick, WALL, room }) {
  const strong = s.k % 2 === 0,
    calm = b.kind === 'calm';
  switch (k) {
    case 'foe':
      return strong && !calm && (kick || s.hi > 0.3) && !has('smash') ? { type: 'foe', h: 1.8, skin: 'clone' } : null;
    case 'foeback':
      return strong && !calm && !kick && s.mid > 0.2 && !has('smash') ? { type: 'foeback', h: 1.8, skin: 'clone' } : null;
    case 'chord':
      return strong && s.k && !has('chord') && Math.max(s.lo, s.mid, s.hi) > 0.25 ? (kick ? { type: 'chord', keys: ['jump', 'right'], h: 0.7, skin: pick(skins.jump) } : { type: 'chord', keys: ['slide', 'right'], h: 0, skin: pick(skins.slide) }) : null;
    case 'smash':
      return strong && s.hi > 0.3 && !has('smash') && !has('foe') ? { type: 'smash', h: WALL, skin: pick(skins.smash) } : null;
    case 'dash':
      return s.k % 2 === 0 && !calm && !has('dash') && !has('smash') && room >= 2.5 * beat ? { type: 'dash', dur: beat * 2, h: WALL, skin: pick(skins.smash) } : null;
    case 'long':
      return !has('long') && room >= 2 * beat ? { type: 'long', dur: 1.5 * beat, skin: 'ceiling' } : null;
    case 'glide':
      return strong && !gapped && room >= 2.5 * beat ? { type: 'glide', dur: 2 * beat, skin: 'stream' } : null;
    case 'grab':
      return strong && !gapped && room >= 2.5 * beat ? { type: 'grab', dur: 2 * beat, skin: pick(skins.grab) } : null;
    case 'zip':
    case 'grind':
      return s.k % 4 === 0 && !calm && !gapped && !has('zip') && !has('grind') && room >= 3.5 * beat ? (k === 'zip' ? { type: 'zip', dur: beat * 3, skin: 'line' } : { type: 'grind', dur: beat * 3, skin: 'rail' }) : null;
  }
  return null;
}
