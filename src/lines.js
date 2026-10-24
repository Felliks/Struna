// What is said in the game besides its rules: two voices. Struna (the AI, the cursor), a dry, superior operator of an
// experiment who calls the hero "subject" and knows nothing of the player; and the hero, cheeky, needling her, now and
// then (as if by accident) talking to the player. Each group is a list to add to; a line is picked by the song's seed
// (the same song says the same), never the same twice running. In the player's language where its pack has the line
// (i18n.js: each written for its own players, its own jokes, not word for word), else English.
import { linesOf } from './i18n.js';

export const LINES = {
  // the song starting: the system's log line ({n}: the trial's number, {odds}: the subject's odds)
  start: [
    { en: 'STRUNA ONLINE. PULLING STRINGS.' },
    { en: 'TRIAL #{n} · SURVIVAL ODDS: {odds}%' },
    { en: 'SUBJECT STILL BREATHING. FIXING.' },
    { en: 'NEW WORLD. SAME IDIOT.' },
    { en: 'TEST #{n}: CAN IT DANCE? NO.' },
  ],
  // a new kind of act coming: the system's order for it
  ride: [
    { en: 'SUBJECT TOO SLOW. ISSUING BOARD.' },
    { en: 'WHEELS ARE FOR COWARDS. HOVER.' },
  ],
  turbo: [
    { en: 'OVERCLOCKING SUBJECT. RUN.' },
    { en: 'SPEED LIMIT: DELETED.' },
  ],
  brawl: [
    { en: "COPYING ×8. WHO'S THE ORIGINAL?" },
    { en: 'CLONES. ONE IS BETTER THAN YOU.' },
  ],
  boss: [
    { en: "FINE. I'LL DO IT MYSELF." },
    { en: 'ENLARGING ADMINISTRATOR.' },
  ],
  fly: [
    { en: "GRAVITY: OFF. DON'T GET USED TO IT." },
    { en: 'LIFTING SUBJECT. FOLLOW THE VOICE.' },
  ],
  blackout: [
    { en: 'LIGHTS OFF. SAVING ENERGY. YOURS.' },
    { en: 'YOU ONLY SEE ON THE BEAT NOW.' },
  ],
  mirror: [
    { en: 'ONE OF THESE WORLDS IS FAKE. GUESS.' },
    { en: 'MIRRORING. TRY NOT TO LOOK.' },
  ],
  ceiling: [
    { en: "FLIPPING WORLD. HE WON'T NOTICE." },
    { en: 'UP IS DOWN NOW. ADAPT.' },
  ],
  cursorchase: [
    { en: 'RUNNING AWAY IS A FEATURE.' },
    { en: 'CATCH ME. YOU WON’T.' },
  ],
  // the sign that drops on him when he dies
  death: [
    { en: 'STRING SNAPPED' },
    { en: 'DELETED' },
    { en: 'CTRL+Z?' },
    { en: 'SKILL ISSUE' },
    { en: '404: REFLEXES' },
    { en: 'RAGE_QUIT.EXE' },
    { en: 'TRY TURNING IT OFF AND ON' },
    { en: 'CERTIFIED NPC' },
  ],
  // the win: his chalk on the roof
  chalk: [
    { en: 'NICE TRY, STRUNA' },
    { en: 'CUT THE STRINGS' },
    { en: 'WAS THAT YOUR BEST?' },
    { en: 'SEE YOU NEXT SONG' },
    { en: 'TOLD YOU.' },
    { en: "I KNOW YOU'RE WATCHING", look: true },
    { en: 'NEXT TIME, BRING FRIENDS' },
    { en: '0 BUGS FOUND. (ME)' },
  ],
  // another try: the sign over him at the start ({n}: which try)
  retry: [{ en: 'TRY #{n}' }],
  retryMany: [{ en: 'AGAIN? REALLY?' }],
  // the place he died last time, coming: what he says
  notThisTime: [{ en: 'NOT THIS TIME.' }],
  // won on the first try: the system
  firstTry: [{ en: 'FIRST TRY? SUSPICIOUS.' }],
  // the cursor, when he is hit
  quip: [
    { en: 'DANCE, PUPPET.' },
    { en: 'OOPS.' },
    { en: 'LAG?' },
    { en: 'MY BAD. (NOT)' },
    { en: 'NOTED. FOREVER.' },
    { en: 'HE TRIED.' },
  ],
  // the streak: the system, at 25 and at 50 in a row
  streak25: [{ en: 'RECALIBRATING DIFFICULTY…' }],
  streak50: [{ en: 'WHO IS HELPING HIM?' }],
  // paused: written on the glass from inside, in order
  glass: [
    { en: 'HELLO?' },
    { en: 'STILL THERE?' },
    { en: 'I CAN WAIT.' },
  ],
};

const hash = x => (((Math.sin(x * 12.9898) * 43758.5453) % 1) + 1) % 1;
// which of a group's lines is the k-th pick for a song (seed): the same song, the same line; the k-th and the (k+1)-th
// never the same (as long as the group has two)
function pick(list, seed, k) {
  const at = j => Math.floor(hash((seed % 9973) + j * 7.13) * list.length);
  let i = at(k);
  if (k > 0 && list.length > 1 && i === at(k - 1)) i = (i + 1) % list.length;
  return list[i];
}
// that line, in the player's language; `vars` fill {name}
export function line(group, seed = 0, k = 0, vars = {}) {
  const list = LINES[group];
  if (!list?.length) return '';
  const L = pick(list, seed, k),
    own = linesOf(group)?.[list.indexOf(L)];
  return (own ?? L.en).replace(/\{(\w+)\}/g, (_, n) => vars[n] ?? '');
}
// the whole entry (for its flags: look)
export const entry = (group, seed = 0, k = 0) => (LINES[group]?.length ? pick(LINES[group], seed, k) : null);
