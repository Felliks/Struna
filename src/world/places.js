// The hand-made places (render/places/*) as parts of the pack: each place's sky piece (when it has more than the plain
// sun and moon), its far and its near rows (when it draws them apart), its ground and its landmarks, with the place's
// medium, tags and mood. The places stay as they were made: a world based on a place draws its near rows (and its
// obstacles, its shafts); the rest of the world may come from anywhere in the pack.
import { LOOKS, MARKS as PLACE_MARKS } from '../render/places/index.js';
import { celestial } from '../render/places/kit.js';
import { MOOD, PACK_MOOD } from '../places.js';
import { registerPart } from './registry.js';
import { ARTISTS } from './artists.js';
import { PLACE_TAGS, SLOT_TAGS, placeMedium, placeTags } from './tags.js';

export { PLACE_TAGS, placeMedium, placeTags };

// the landmarks each place draws (look.js has the same lists; a place's own extra ones, like the city's billboards
// drawn in its rows, are not lent)
const MARK_NAMES = {
  city: ['tower', 'bridge', 'stadium'],
  forest: ['waterfall', 'ruins', 'giant'],
  desert: ['arch', 'turbines', 'wreck'],
  synth: ['palms', 'pyramid', 'skyline'],
  station: ['dish', 'ring', 'asteroids'],
  factory: ['cooling', 'crane', 'furnace'],
  rave: ['booth', 'speakers', 'pyro'],
  volcano: ['cone', 'spires', 'lavafall'],
  ocean: ['whale', 'temple', 'wreckship'],
  arctic: ['icebreaker', 'radar', 'cathedral'],
  wasteland: ['plane', 'skull', 'billboard'],
  mall: ['dome', 'escalators', 'fountain'],
  moon: ['dome', 'lander', 'rover'],
  kowloon: ['hologram', 'magtrain', 'torii'],
  bazaar: ['dragon', 'paifang', 'pagoda'],
  skies: ['temple', 'airships', 'balloons'],
  castle: ['keep', 'belltower', 'rampart'],
  casino: ['eiffel', 'fountain', 'marquee'],
  arena: ['scoreboard', 'jumbotron', 'goalposts'],
  graveyard: ['crypt', 'church', 'oak'],
  tokyo: ['pagoda', 'torii', 'fuji'],
  circuit: ['cpu', 'cooler', 'ram'],
  blacksnow: ['skulltotem', 'staticmast', 'frozenradio'],
  holyrave: ['stonering', 'skulldrums', 'perpetuum'],
  apocradio: ['boombox', 'doorstack', 'eyetv'],
  anthill: ['spire', 'orchid', 'dandelion'],
  fujisan: ['shell', 'rustrocket', 'echoship'],
  lastman: ['serpentine', 'throne', 'wave'],
  compost: ['seedling', 'maypole', 'bush', 'crystal'],
  crocsky: ['pyramid', 'agarics', 'stilthut'],
};
// the places whose sky piece is more than the plain sun and moon (kit.js celestial)
const OWN_SKIES = new Set(['arctic', 'castle', 'circuit', 'graveyard', 'mall', 'moon', 'ocean', 'skies', 'station', 'synth', 'volcano', 'bazaar', 'blacksnow', 'holyrave', 'apocradio', 'anthill', 'fujisan', 'lastman', 'compost', 'crocsky']);

// the plain sun and moon, a part of every open-air world
registerPart({ id: 'sun', slot: 'sky', media: ['air'], tags: ['mild'], draw: f => celestial(f) });

for (const [p, look] of Object.entries(LOOKS)) {
  // (an artist's pack's place's parts are the pack's: compose.js keeps them to its songs, now and then lending them)
  const base = { media: [placeMedium(p)], tags: placeTags(p), mood: MOOD[p] ?? PACK_MOOD[p], place: p, pack: ARTISTS.find(a => a.places.includes(p))?.id };
  const slotTags = slot => [...base.tags, ...(SLOT_TAGS[p]?.[slot] ?? [])];
  if (OWN_SKIES.has(p) && look.sky) registerPart({ ...base, id: p, slot: 'sky', tags: slotTags('sky'), draw: f => look.sky(f) });
  if (look.far && look.near) {
    registerPart({ ...base, id: p, slot: 'far', tags: slotTags('far'), draw: f => look.far(f) });
    registerPart({ ...base, id: p, slot: 'near', draw: f => look.near(f) });
  }
  registerPart({ ...base, id: p, slot: 'ground', draw: (f, a, b, y) => look.ground(f, a, b, y) });
  for (const n of MARK_NAMES[p]) {
    const draw = PLACE_MARKS[p]?.[n];
    if (draw) registerPart({ ...base, id: `${p}:${n}`, slot: 'mark', draw });
  }
}
