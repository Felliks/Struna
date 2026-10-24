// A set's perks (Balatro's jokers, Hades's boons): three songs in a row with one life between them, and after each song
// won one of three perks to keep for the rest of the set. Each changes how a run is played (run.js reads L.perks).
export const PERKS = {
  shield: { name: 'SHIELD', hint: 'the first two misses of each song cost nothing' },
  vampire: { name: 'VAMPIRE', hint: 'every perfect heals you a little' },
  magnet: { name: 'MAGNET', hint: 'the timing windows are a third wider' },
  overcharge: { name: 'OVERCHARGE', hint: 'the overdrive charges half again as fast' },
  glass: { name: 'GLASS CANNON', hint: 'x1.5 points, but misses hurt twice as much' },
  secondwind: { name: 'SECOND WIND', hint: 'once in the set: back from deletion with 30 health' },
  chainer: { name: 'CHAIN REACTION', hint: 'combinations are worth three times as much' },
};
// three perks not yet taken, by a seed
export function offer(taken, seed) {
  const left = Object.keys(PERKS).filter(k => !taken.includes(k));
  let h = seed >>> 0;
  const out = [];
  while (out.length < 3 && left.length) {
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
    out.push(left.splice(h % left.length, 1)[0]);
  }
  return out;
}
