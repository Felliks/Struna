// A song's world put together from the pack (registry.js) around its base place: a spec of which part fills each slot.
// One base rules (its near rows, its obstacles, its shafts); the far rows, the sky, the ground, one or two landmarks and
// the weather come from parts that suit it (affinity.js), the song's seed choosing among them by weight, so the same
// song always has the same world. Each slot has its own rule; a new slot is a new rule here, a new part needs none.
import { mulberry } from '../rng.js';
import { partOf, partsOf } from './registry.js';
import { HEATS, choose, heatClash, kin, skyBody, weight } from './affinity.js';
import { placeMedium, placeTags } from './places.js';

// how often a slot keeps the base's own part, how often a landmark comes from anywhere (a wild one), how often there
// is a second guest landmark; how much likelier the pack's own landmarks and skies are than the places' (so the more
// the pack holds, the more of it is seen)
const KEEP = { far: 0.3, ground: 0.35 },
  WILD = 0.1,
  SECOND = 0.45,
  PACK = 2;

// the base's own part of a slot (its id is the place's name), if it has one
const own = (slot, base) => partOf(slot, base);

// spec: { base, far, sky, ground, own, guests: [mark ids], weather, performer, clone, wild }; `forced` (a slot -> id)
// overrides any slot (`own`: which of the base's own landmarks), `marks`: the base's own landmark names; `boost`: the
// tags an artist's pack leans to (artists.js), a part with them likelier the more it has (in any world of the song's);
// `pack`: the song's artist's pack (artists.js), its own parts likelier still; `time`: the hour the song starts at
// (look.js): a day's or a night's is a rule tag of its world (affinity.js RULES), so a night's stardust never falls on a
// sunny day
export function composeWorld(base, seed, P, marks, forced = {}, boost = null, pack = null, time = null) {
  const r = mulberry((Math.imul(seed, 2246822519) ^ 0x3a17) >>> 0),
    hour = time === 'day' ? ['day'] : time === 'night' ? ['night'] : [],
    world = { medium: placeMedium(base), tags: [...new Set([...placeTags(base), ...hour])] },
    // (an artist's pack's parts are the artist's alone: never in a song of another, so no crocodile sky or fly agarics
    // in anyone else's world; in its artist's song they lead, and a part of none of the pack's tags is much less likely
    // there)
    parts = slot => partsOf(slot).filter(p => !p.pack || p.pack === pack),
    lean = p => (p.pack ? 4 : !boost ? 1 : kin(p.tags, boost) ? 1 + 3 * kin(p.tags, boost) : 0.08),
    w = (p, wild) => weight(p, world, P, wild) * (p.place ? 1 : PACK) * lean(p),
    others = (slot, but = []) => parts(slot).filter(p => p.place !== base && !but.includes(p.id)),
    wild = r() < WILD;
  // the far rows: the base's own a part of the time (only if it draws them apart), else another place's
  const far = forced.far ?? (own('far', base) && r() < KEEP.far ? base : (choose(r, others('far'), p => w(p))?.id ?? (own('far', base) ? base : null)));
  // (the world's tags take in its far place's: what is far off is part of what this world is)
  if (far && partOf('far', far)?.tags) world.tags = [...new Set([...world.tags, ...partOf('far', far).tags])];
  // (the sky, the ground and the weather cover most of the screen: they keep to the world's heat, its base's when it
  // has one, a far place's only when it has none)
  const heat = placeTags(base).some(t => HEATS.includes(t)) ? placeTags(base) : world.tags,
    fits = p => !heatClash(p.tags, heat);
  const sky = forced.sky ?? choose(r, parts('sky').filter(p => p.id !== far && fits(p)), p => w(p))?.id ?? 'sun';
  const ground = forced.ground ?? (r() < KEEP.ground ? base : (choose(r, others('ground').filter(fits), p => w(p))?.id ?? base));
  // the landmarks: one of the base's own, a guest, now and then a second guest (never the base's)
  // (one big body in the sky: with a sky piece that has its planet or moon, no guest filling the sky, and of two guests
  // only one of them)
  const free = marks.filter(n => !(skyBody('sky', sky) && skyBody('mark', `${base}:${n}`))),
    pickedMine = (free.length ? free : marks)[Math.floor(r() * (free.length || marks.length))],
    mine = forced.own ?? pickedMine,
    roomy = (p, but) => !skyBody('mark', p.id) || !(skyBody('sky', sky) || skyBody('mark', `${base}:${mine}`) || (but && skyBody('mark', but))),
    // (a world of its own (forced.solo: an artist's favourite's, artists.js) has only its own landmarks: a second of
    // them for its guest, none of anyone else's)
    rest = marks.filter(n => n !== mine),
    g1 = forced.mark ?? (forced.solo ? `${base}:${rest[Math.floor(r() * rest.length)] ?? mine}` : choose(r, others('mark').filter(p => roomy(p)), p => w(p, wild))?.id),
    g2 = forced.solo ? null : r() < SECOND ? choose(r, others('mark', [g1]).filter(p => roomy(p, g1)), p => w(p))?.id : null;
  // (the weather only of the world's kind: rain in a city, sand in a desert, never a haze of nowhere over it all)
  const weather = forced.weather ?? choose(r, parts('weather').filter(p => kin(p.tags, world.tags) > 0 && fits(p)), p => w(p))?.id ?? 'clear';
  // (who dances in its sky, and how its clones are dressed)
  const performer = forced.performer ?? choose(r, parts('performer'), p => w(p))?.id ?? null,
    clone = forced.clone ?? choose(r, parts('clone'), p => w(p))?.id ?? null;
  return { base, far, sky, ground, own: mine, guests: [g1, g2].filter(Boolean), weather, performer, clone, wild };
}
