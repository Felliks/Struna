// The places' tags (world/places.js registers their parts with them; compose.js and affinity.js read them; the
// artists' packs' guests are gated by them, artists.js): kept apart from the places' drawing so a level can read them.
// each place: its medium, then its tags (what kind of place, its heat, its age; and the rule tags of its time and its
// mood, affinity.js RULES: the always-night places are 'night')
export const PLACE_TAGS = {
  city: ['air', 'urban', 'modern', 'mild'],
  synth: ['air', 'neon', 'future', 'warm'],
  forest: ['air', 'nature', 'ancient', 'mild'],
  desert: ['air', 'nature', 'ancient', 'hot'],
  station: ['space', 'tech', 'future', 'cold'],
  factory: ['air', 'industrial', 'modern', 'hot'],
  rave: ['air', 'neon', 'party', 'modern', 'night'],
  volcano: ['air', 'nature', 'ancient', 'hot'],
  ocean: ['water', 'nature', 'ancient', 'cold'],
  arctic: ['air', 'nature', 'modern', 'cold'],
  circuit: ['air', 'tech', 'future', 'neon'],
  tokyo: ['air', 'urban', 'neon', 'modern', 'night'],
  graveyard: ['air', 'gothic', 'ancient', 'cold', 'night'],
  arena: ['air', 'urban', 'party', 'modern'],
  casino: ['air', 'urban', 'party', 'neon', 'night'],
  castle: ['air', 'gothic', 'ancient', 'mild', 'night'],
  skies: ['air', 'nature', 'fantasy', 'mild'],
  bazaar: ['air', 'urban', 'ancient', 'warm', 'night'],
  kowloon: ['air', 'urban', 'neon', 'future', 'night'],
  moon: ['space', 'tech', 'future', 'cold'],
  mall: ['air', 'urban', 'party', 'modern'],
  wasteland: ['air', 'industrial', 'future', 'hot'],
  blacksnow: ['air', 'radio', 'occult', 'fantasy', 'cold', 'dark', 'night'],
  holyrave: ['air', 'acid', 'occult', 'folk', 'fantasy', 'night'],
  apocradio: ['air', 'radio', 'acid', 'fantasy', 'warm', 'dark'],
  anthill: ['air', 'insect', 'build', 'nature', 'warm', 'day'],
  fujisan: ['air', 'mountain', 'nature', 'fantasy', 'mild', 'night'],
  lastman: ['air', 'summer', 'nature', 'coast', 'warm', 'day', 'bright'],
  compost: ['air', 'garden', 'nature', 'ember', 'warm'],
  crocsky: ['air', 'jungle', 'nature', 'folk', 'warm'],
};
// tags of one slot of a place's only (the spring's far rows hold its cartoon blast; the swallowed sky is a night's)
export const SLOT_TAGS = { compost: { far: ['blast'] }, crocsky: { sky: ['night'] } };

export const placeMedium = p => PLACE_TAGS[p][0];
export const placeTags = p => PLACE_TAGS[p].slice(1);

