// What the hero remembers of the player, kept on the device only (localStorage, nothing sent anywhere): per song, how
// many runs, how many won, where he died the last few times. The animator reads it (anim.js: a glance at the player at
// the start of another try, a warning before a place he died at); the shell writes it at the end of a run (main.js).
const KEY = 'sim.memory';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}
// a song's memory (an empty one in the tests and the probes)
export function remember(song) {
  const m = load()[song];
  return { runs: m?.runs ?? 0, wins: m?.wins ?? 0, deaths: m?.deaths ?? [] };
}
// a run over: counted, its death (song time) kept, the last five
export function record(song, { win, deathT = null }) {
  const all = load(),
    m = (all[song] ??= { runs: 0, wins: 0, deaths: [] });
  m.runs++;
  if (win) m.wins++;
  if (deathT !== null) m.deaths = [...m.deaths, Math.round(deathT * 100) / 100].slice(-5);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // (storage off: he forgets)
  }
}
