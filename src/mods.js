// Modifiers (Beat Saber's, Pistol Whip's): a known song made a new task, each worth a bonus on the score (they add up).
// Picked per song on the map (ui/map.js); the level is the same, only how it is played and shown changes.
export const MODS = {
  nightcore: { name: 'NIGHTCORE', hint: 'the song at 1.25x, higher and faster', bonus: 0.2 },
  ghosts: { name: 'GHOSTS', hint: 'what is in your way fades out before you get there', bonus: 0.12 },
  blind: { name: 'BLIND', hint: 'the world shows only on the beat', bonus: 0.25 },
  onelife: { name: 'ONE LIFE', hint: 'one miss and you are deleted', bonus: 0.15 },
  upside: { name: 'UPSIDE DOWN', hint: 'the whole song upside down', bonus: 0.08 },
};
// the score's multiplier for a set of modifiers
export const modBonus = mods => 1 + (mods ?? []).reduce((s, m) => s + (MODS[m]?.bonus ?? 0), 0);
// the song's speed under them
export const modRate = mods => (mods?.includes('nightcore') ? 1.25 : 1);
