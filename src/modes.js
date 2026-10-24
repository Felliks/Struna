// What kind of play each act of the song is (acts.js), so that one song is not one long run (Geometry Dash changes its
// game mode at portals, Sayonara Wild Hearts its vehicle with the song's sections). A song gets some of them, not all,
// chosen by its sections, its mood and its seed:
//   drops     ride (a hoverboard, faster), turbo (a sprint at a third again his speed, the world streaking past), brawl (clones from in front and from behind: → and ←), cursor chase (the
//             cursor flees low ahead of him dropping things, and is caught at the end), and once those have been, the
//             world turned over or mirrored; the last of several drops: the boss (the cursor grown huge in the sky,
//             slamming the beat into the roof). A kind of play comes back only once the song has had all the others
//   breaks    ceiling (the world turns over: he runs upside down), mirror (a twin world hangs over his, upside down),
//             blackout (the lights go out: what is in his way shows on its beat)
//   verses    flight (a verse a voice carries: he flies, up and down through rings on the voice's syllables; one a song,
//             the other sung verses are run, the voice playing their bars, level.js)
//   solos     the string (a flight over the solo: its rings on the solo's own notes, at their pitch, strung on a line of
//             light that rings as each is played; analyze.js finds them)
//   builds    the chase (something from the simulation's dark comes after him, closer with each miss) in most songs
//   the drop nearest the middle of a long song: the place is rewritten into another
// A song always opens as a plain run: its first act and any act begun in its first OPEN bars are run whatever they are
// (`open`), and the song's lens (look.js) comes in only after them, with the first drop (`lensAt`): the player meets the
// world as it is before it is turned over, mirrored or pixelated
const OPEN = 8;
export function planModes(A, P, acts, r) {
  // (the drops proper: a drop's start or the phrase line in one, not a new sound inside it)
  const drops = acts.filter(a => a.kind === 'drop' && !a.sound),
    verses = acts.filter(a => a.kind === 'verse');
  const dropPool = P.hardness > 0.5 ? ['brawl', 'turbo', 'ride', 'cursorchase'] : P.style === 'chill' ? ['ride', 'cursorchase', 'brawl', 'turbo'] : ['ride', 'brawl', 'turbo', 'cursorchase'],
    breakPool = ['ceiling', 'mirror', 'blackout'],
    d0 = Math.floor(r() * 3),
    b0 = Math.floor(r() * 3);
  const mode = new Map(),
    used = new Map(),
    n = m => used.get(m) ?? 0,
    // (each act the kind of play this song has had least of so far, its own pool's order breaking ties: a song shows
    // all it can before anything comes back; a drop may also turn the world over, a break may also ride)
    take = (a, list) => {
      const m = [...list].sort((x, y) => n(x) - n(y))[0];
      used.set(m, n(m) + 1);
      mode.set(a, m);
    },
    turn = (list, k) => [...list.slice(k), ...list.slice(0, k)];
  // (an act begun only by a new sound, not a drop or the break after one, keeps the play it is in: its look changes)
  for (const a of acts.filter(q => (q.kind === 'drop' || q.kind === 'break') && !q.sound).sort((p, q) => p.t0 - q.t0)) {
    if (a.kind === 'drop' && drops.length >= 2 && a === drops[drops.length - 1]) mode.set(a, 'boss');
    else if (a.kind === 'drop') take(a, [...turn(dropPool, d0 % dropPool.length), ...turn(['ceiling', 'mirror'], b0 % 2)]);
    else take(a, [...turn(breakPool, b0), 'ride']);
  }
  // (a verse with a voice in it, one of them, flown)
  let flights = 0;
  for (const a of verses.filter(q => !q.sound)) {
    const i0 = Math.floor(a.t0 * A.fps),
      i1 = Math.min(A.env.voice?.length ?? 0, Math.floor(Math.min(a.t1, a.t0 + 16 * A.beat) * A.fps));
    let s = 0;
    for (let i = i0; i < i1; i++) s += A.env.voice[i];
    if (flights < 1 && i1 > i0 && s / (i1 - i0) > 0.14 && a.t1 - a.t0 >= 8 * A.beat) {
      mode.set(a, 'fly');
      flights++;
    }
  }
  // (a solo, always: the string)
  for (const a of acts) if (a.kind === 'solo') mode.set(a, 'fly');
  const first = Math.min(...acts.map(a => a.t0)),
    open = a => a.t0 === first || a.t0 < OPEN * 4 * A.beat;
  // (an act begun by a new sound goes on with the play of the act before it)
  const inOrder = [...acts].sort((p, q) => p.t0 - q.t0);
  inOrder.forEach((a, i) => a.sound && !mode.has(a) && i && mode.has(inOrder[i - 1]) && mode.set(a, mode.get(inOrder[i - 1])));
  for (const a of acts) if (open(a)) mode.delete(a);
  const after = acts.filter(a => !open(a)).sort((p, q) => p.t0 - q.t0),
    lensAt = (after.find(a => a.kind === 'drop') ?? after[0])?.t0 ?? Infinity;
  const middle = drops.length >= 2 && A.dur > 90 ? drops.reduce((m, a) => (Math.abs(a.t0 - A.dur / 2) < Math.abs(m.t0 - A.dur / 2) ? a : m)) : null;
  // (a part played mini, Geometry Dash's size portal, over whatever kind of play it is: light, bright music, its highs
  // over its lows; the two brightest of a song at most, after the first drop, not a boss's or a flight's)
  const mini = new Set(
    after
      .filter(a => !['boss', 'fly'].includes(mode.get(a)) && a.t0 >= lensAt && brightness(A, a) > 1.1)
      .sort((p, q) => brightness(A, q) - brightness(A, p))
      .slice(0, 2),
  );
  return {
    acts: acts.map(a => ({ ...a, mode: mode.get(a) ?? 'run', mini: mini.has(a), rewrite: a === middle, open: open(a) })),
    chase: r() < 0.75,
    lensAt,
  };
}
// how light and bright a part is: its bars' highs against their lows
function brightness(A, a) {
  const bars = A.bars.filter(b => b.t0 >= a.t0 && b.t0 < a.t1),
    hi = bars.reduce((s, b) => s + b.high, 0),
    lo = bars.reduce((s, b) => s + b.low, 0);
  return lo ? hi / lo : 0;
}
