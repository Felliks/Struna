// How well a part suits a world: the rules that keep a mix one world and not a pile of places (research: Borderlands
// 4's licensed parts, Starbound's biome sections, Minecraft's climate-nearest biomes, WFC's exclusions):
//   - a part can only be where its medium is (nothing of the open air under water, nothing under water in space)
//   - it is likelier the more tags it shares with the world's base (its kind, its heat, its age)
//   - it is likelier the nearer its mood to the song's (a part with no mood of its own is neutral)
//   - some tags never meet (snow where it is hot; a carnival among the graves; pollen on the ice; dead leaves in the
//     desert)
//   - what covers most of the screen (the sky, the ground) keeps to the world's heat: no ice underfoot in a warm market,
//     no frozen moon over a hot one
//   - the sky holds one big body: a sky piece with its planet or moon and a guest landmark filling the sky (a ring
//     world, a zeppelin) never meet, or the two fight for the eye
//   - some kinds of thing only go with some songs (GATES): a cartoon blast far off never in a calm or a happy song,
//     the angels only over a dark, an epic or a raving one, the gloomy (black snow, skulls, crows) never in a happy
//     soft one, the sunny (the lettuce sky, its fluff, its dancers) never in a sad one, the acid rave never in a calm one
//   - the time of a world and its mood are rule tags (RULES): they keep day from night and bright from dark, but two
//     parts sharing one are no more alike for it (kin counts only what a thing is)
// A world's tags: its base place's (places.js), with its far place's joined in.
const NEVER = [
  // (the artists' packs' (artists.js): day never at night, the sunny never with the gloomy; the summer's lettuce sky,
  // its fluff and its dancers never among graves and castles; the jungle never in the desert's or a volcano's heat;
  // the anthill's ant-high world never with a city's, a factory's or a machine's (one scale to a world); no cartoon
  // blast over a party)
  ['day', 'night'],
  ['bright', 'dark'],
  ['summer', 'gothic'],
  ['jungle', 'hot'],
  ['insect', 'urban'],
  ['insect', 'industrial'],
  ['insect', 'tech'],
  ['blast', 'party'],
  ['snow', 'hot'],
  ['sand', 'cold'],
  ['embers', 'cold'],
  ['petals', 'industrial'],
  ['confetti', 'gothic'],
  ['party', 'gothic'],
  ['pollen', 'cold'],
  ['petals', 'cold'],
  ['pollen', 'hot'],
  ['leaves', 'hot'],
];
// the heats, cold to hot: a cold part and a warm or hot world (or the other way round) clash
const HEAT = { cold: 0, mild: 1, warm: 2, hot: 3 };
export const HEATS = Object.keys(HEAT);
const heats = tags => tags.filter(t => t in HEAT).map(t => HEAT[t]);
export function heatClash(tags, world) {
  const a = heats(tags),
    b = heats(world);
  if (!a.length || !b.length) return false;
  // (any pair near enough is a fit: a part both mild and cold sits in a mild world)
  return a.every(x => b.every(y => Math.abs(x - y) >= 2 && Math.min(x, y) === 0));
}
// the parts that fill the sky with one big body (a planet, a huge moon, a sun, a ring world's arc, a hovering giant):
// a world has one of them at most
export const SKY_BODIES = new Set([
  'sky:castle',
  'sky:graveyard',
  'sky:moon',
  'sky:station',
  'sky:synth',
  'sky:gasgiant',
  'sky:eclipse',
  'sky:moons',
  'sky:blackhole',
  'sky:riser',
  'sky:wiremoon',
  'sky:apocradio',
  'sky:holyrave',
  'sky:acideye',
  'sky:helios',
  'sky:cyclone',
  'sky:blacksnow',
  'sky:fujisan',
  'sky:lastman',
  'sky:crocsky',
  'sky:ophanim',
  'sky:binary',
  'sky:shattered',
  'mark:ringworld',
  'mark:jellyfish',
  'mark:zeppelin',
  'mark:pyramidship',
  'mark:skies:airships',
]);
export const skyBody = (slot, id) => SKY_BODIES.has(`${slot}:${id}`);

// the tags that say what a world is like, not what it is (its time, its mood): kept apart by NEVER and GATES, never
// counted as kin
const RULES = new Set(['day', 'night', 'bright', 'dark', 'blast']);
// a song's mood as the places' tables read it (places.js nearest): arousal, valence, hardness, each 0..1
const c01 = x => Math.max(0, Math.min(1, x));
const moodOf = P => [c01((P.arousal - 0.4) / 0.5), P.valence, c01((P.hardness - 0.3) / 0.4)];
// the songs a kind of thing may be in (a part with one of these tags is in a song's world only where its mood allows)
const GATES = {
  blast: ([a, v]) => a >= 0.45 && v <= 0.6,
  angel: ([a, v]) => v <= 0.5 || a >= 0.7,
  dark: ([, v, h]) => v <= 0.55 || h >= 0.6,
  bright: ([, v]) => v >= 0.4,
  acid: ([a]) => a >= 0.4,
};
// whether a part (its tags) may be in a song of mood P
export const gated = (tags, P) => {
  if (!P) return true;
  const M = moodOf(P);
  return tags.every(t => !GATES[t] || GATES[t](M));
};

export const never = (a, b) => NEVER.some(([x, y]) => (a.includes(x) && b.includes(y)) || (a.includes(y) && b.includes(x)));

// shared tags between a part and a world's tags
export const kin = (tags, world) => tags.filter(t => !RULES.has(t) && world.includes(t)).length;

// how near a mood [arousal, valence, hardness] is to a song's profile, 0..1
export function moodNear(mood, P) {
  if (!mood || !P) return 0.5;
  const d = (mood[0] - P.arousal) ** 2 + (mood[1] - P.valence) ** 2 + (mood[2] - P.hardness) ** 2;
  return Math.exp(-d / 0.12);
}

// a part's weight in a world (0: it cannot be there): `wild` lets any medium in and weighs all alike
export function weight(part, world, P, wild = false) {
  if (!wild && !part.media.includes(world.medium)) return 0;
  if (never([part.id, ...part.tags], world.tags)) return 0;
  if (!gated(part.tags, P)) return 0;
  if (wild) return 1;
  // (shared tags count, but not so much that a part with many common tags is in every world: linear, not squared)
  return (0.6 + kin(part.tags, world.tags)) * (0.35 + moodNear(part.mood, P)) * (part.weight ?? 1);
}

// one of `list` by weight (null if none can be)
export function choose(r, list, wf) {
  const w = list.map(wf),
    sum = w.reduce((s, q) => s + q, 0);
  if (sum <= 0) return null;
  let x = r() * sum;
  for (let i = 0; i < list.length; i++) if ((x -= w[i]) < 0) return list[i];
  return list.at(-1);
}
