// The props of a song's world (kinds.js bat, pick, throw; level.js lays them, render/layers/props.js draws them): what
// a clone throws at him, what lies on the roof for him to pick up, the threat he throws it at (one that fires on him if
// he does not) and what the thrower stands on, each of the place the world is built on (a bottle in a city, a pinecone
// in a forest, a snowball off an ice pillar, a skull off a tomb, a data cube off a hover pad). A place not listed takes
// its kind's (its tags, world/places.js PLACE_TAGS, given by who asks) instead.

//   fly    what a thrower throws (batted home)
//   item   what lies on the roof (picked up, thrown)
//   aim    the threats it is thrown at, in turn, each one that lives or works there and could be there: the place's own
//          first (a hornet hive in a forest, a jellyfish in the deep, a vulture over the desert, a fire spirit over the
//          lava, a ghost in a graveyard, a gargoyle off a castle, an ice sentry in the arctic, a speaker stack over a rave,
//          a paper lantern over a night market, a crane's turret over a factory or a scrapyard, a sniper on a rooftop
//          in a city), then the AI's own where its machines belong (a camera on a cable, a quadcopter, an orb sentry in
//          space, a clone with a rifle on a hover platform, a force field's emitter): never a machine in the wild
//   stand  what a thrower (or a sniper) stands on: a billboard, a stone pillar, a tree stump, a tomb, a hover pad
//   mat    what the place's things are made of (a shared threat's skin: metal, neon, rust, stone, wood, ice, crystal...)
export const THEMES = {
  city: { fly: 'bottle', item: 'brick', aim: ['sniper', 'drone', 'eye'], stand: 'board', mat: 'metal' },
  synth: { fly: 'cube', item: 'cube', aim: ['gunner', 'drone', 'field'], stand: 'board', mat: 'neon' },
  forest: { fly: 'cone', item: 'rock', aim: ['hive', 'raven'], stand: 'stump', mat: 'wood' },
  desert: { fly: 'rock', item: 'jar', aim: ['vulture', 'sniper'], stand: 'pillar', mat: 'stone' },
  station: { fly: 'datacube', item: 'bolt', aim: ['sentry', 'field', 'gunner'], stand: 'pad', mat: 'metal' },
  factory: { fly: 'gear', item: 'bolt', aim: ['crane', 'drone', 'field'], stand: 'board', mat: 'rust' },
  rave: { fly: 'glowstick', item: 'cube', aim: ['speaker', 'drone', 'field'], stand: 'board', mat: 'neon' },
  volcano: { fly: 'lava', item: 'rock', aim: ['spirit', 'firebird'], stand: 'pillar', mat: 'stone' },
  ocean: { fly: 'coconut', item: 'shell', aim: ['jelly', 'angler'], stand: 'pillar', mat: 'coral' },
  arctic: { fly: 'snowball', item: 'ice', aim: ['shard', 'sniper'], stand: 'pillar', mat: 'ice' },
  circuit: { fly: 'datacube', item: 'datacube', aim: ['eye', 'sentry', 'field'], stand: 'pad', mat: 'neon' },
  tokyo: { fly: 'can', item: 'bottle', aim: ['lantern', 'sniper', 'drone'], stand: 'board', mat: 'paper' },
  graveyard: { fly: 'skull', item: 'bone', aim: ['wisp', 'raven', 'gargoyle'], stand: 'tomb', mat: 'stone' },
  arena: { fly: 'ball', item: 'ball', aim: ['speaker', 'drone'], stand: 'board', mat: 'metal' },
  casino: { fly: 'dice', item: 'chip', aim: ['eye', 'drone'], stand: 'board', mat: 'gold' },
  castle: { fly: 'rock', item: 'jar', aim: ['gargoyle', 'lantern', 'wisp'], stand: 'tomb', mat: 'iron' },
  skies: { fly: 'crystal', item: 'crystal', aim: ['shard', 'eagle'], stand: 'pillar', mat: 'crystal' },
  bazaar: { fly: 'jar', item: 'jar', aim: ['lantern', 'sniper'], stand: 'board', mat: 'paper' },
  kowloon: { fly: 'can', item: 'bottle', aim: ['eye', 'sniper', 'gunner'], stand: 'board', mat: 'neon' },
  moon: { fly: 'rock', item: 'bolt', aim: ['sentry', 'gunner', 'field'], stand: 'pad', mat: 'metal' },
  mall: { fly: 'can', item: 'ball', aim: ['eye', 'speaker', 'drone'], stand: 'board', mat: 'neon' },
  wasteland: { fly: 'gear', item: 'brick', aim: ['vulture', 'crane', 'gunner'], stand: 'board', mat: 'rust' },
  // (the artists' packs' places, world/artists.js: over the black snow a marabou, a flying boombox jamming the air, a red
  // smoke with eyes; over the stone rings of the rave a spirit drum, a skull kite and an equaliser skull; in the radio
  // limbo the jammer, the smoke and the equaliser; and over the snow and the stones an ophan, a wheel within wheels of
  // eyes, as the oldest descriptions of angels have them: "Ангелы")
  blacksnow: { fly: 'snowball', item: 'kettlebell', aim: ['marabou', 'ophan', 'jammer', 'shadow'], stand: 'pillar', mat: 'metal' },
  holyrave: { fly: 'glowstick', item: 'vinyl', aim: ['drum', 'ophan', 'totem', 'eqskull'], stand: 'board', mat: 'neon' },
  apocradio: { fly: 'tube', item: 'cassette', aim: ['jammer', 'shadow', 'eqskull'], stand: 'pad', mat: 'rust' },
  // (the worlds after the owner's favourites, from their words: at an ant's height a magnifying glass gathering the
  // sun, a fire salamander on a leaf and a soldier ant clacking its mandibles ("Архитектор", "Урожай"); on the slopes of
  // the dream volcano a tentacle up out of the deep, a rusty mini-rocket and the echo-zeppelin ("Фудзи"); over the
  // empty, blissful Earth a gull, the red car's runaway hubcap and a dragonfly ("Последний человек на Земле", "Под небом
  // салатовым"); over the ash and snow turning spring a crow, a grumpy snow-walker, a cartoon meteor falling out of the
  // sky and a beetle ("Удобрением", "Подснежник"); over the jungle delta a crocodile up out of the swamp, a marabou
  // and a pterodactyl ("Крокодил", "Марабу"))
  anthill: { fly: 'rock', item: 'sugar', aim: ['magnifier', 'salamander', 'soldierant'], stand: 'stump', mat: 'wood' },
  fujisan: { fly: 'rock', item: 'snowball', aim: ['tentacle', 'minirocket', 'blimp'], stand: 'pillar', mat: 'stone' },
  lastman: { fly: 'ball', item: 'lettuce', aim: ['seagull', 'hubcap', 'dragonfly'], stand: 'board', mat: 'metal' },
  crocsky: { fly: 'cone', item: 'seed', aim: ['crocodile', 'marabou', 'ptero'], stand: 'stump', mat: 'wood' },
  compost: { fly: 'cone', item: 'seed', aim: ['raven', 'snowwalker', 'meteor', 'beetle'], stand: 'stump', mat: 'wood' },
};
// (by its tags, for a place of its own: the first of them that says something; its medium first, the deep and space
// being the strictest about what can be in them)
const BY_TAG = [
  ['water', THEMES.ocean],
  ['space', THEMES.station],
  ['cold', { fly: 'snowball', item: 'ice', aim: ['shard', 'sniper'], stand: 'pillar', mat: 'ice' }],
  ['gothic', THEMES.graveyard],
  ['party', THEMES.rave],
  ['industrial', THEMES.factory],
  ['tech', THEMES.circuit],
  ['neon', THEMES.synth],
  ['fantasy', THEMES.skies],
  ['nature', THEMES.forest],
  ['ancient', THEMES.desert],
  ['urban', THEMES.city],
];
export function themeOf(place, tags = []) {
  if (THEMES[place]) return THEMES[place];
  return BY_TAG.find(([k]) => tags.includes(k))?.[1] ?? THEMES.city;
}
// how high each threat is over the roof (where it is hit), metres: all of them over his head, ahead of him (hung,
// hovering, flying), or a sniper's chest on its rooftop past the road
export const AIM_Y = {
  drone: 2.9,
  gunner: 3.1,
  field: 2.7,
  sentry: 2.9,
  eye: 2.85,
  crane: 3.0,
  speaker: 3.0,
  lantern: 2.85,
  wisp: 2.8,
  spirit: 2.85,
  shard: 2.85,
  hive: 2.95,
  vulture: 3.0,
  raven: 2.9,
  gargoyle: 3.0,
  firebird: 3.0,
  eagle: 3.0,
  jelly: 3.0,
  angler: 2.85,
  sniper: 2.75,
  jammer: 2.9,
  marabou: 3.0,
  shadow: 2.85,
  drum: 2.9,
  totem: 3.0,
  eqskull: 2.9,
  magnifier: 3.05,
  salamander: 2.85,
  soldierant: 2.9,
  tentacle: 2.8,
  minirocket: 2.95,
  blimp: 3.1,
  seagull: 3.0,
  hubcap: 2.85,
  dragonfly: 2.9,
  snowwalker: 2.9,
  beetle: 2.95,
  meteor: 3.0,
  crocodile: 2.7,
  ptero: 3.05,
  ophan: 3.1,
};
// where a thrower stands at t (kinds.js bat; level.js its row): dC ahead of him at the contact, on a rooftop past the
// road that moves at its own parallax (par of his run carried along with him), so it stays in the picture from its
// wind-up to its fall
export const throwerX = (L, o, t) => L.xAt(t) + o.dC + (1 - o.par) * (L.xAt(o.tc) - L.xAt(t));
// where a threat is at t (level.js o.tx: where it is hit, at o.ti): hung, hovering or flying, there; a sniper on a
// rooftop past the road, that rooftop at its own parallax (three quarters of his run carried along with him, as a far
// row moves) and a stand's width further on, so it is in view sooner, and he never runs up to the foot of its stand
export const SNIPER_PAR = 0.75;
export const threatX = (L, o, t) => (o.aim === 'sniper' ? o.tx + 1.6 + SNIPER_PAR * (L.xAt(t) - L.xAt(o.ti)) : o.tx);
