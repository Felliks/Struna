// A song's look: one place (places.js) dressed for this song alone. The song's profile (profile.js) sets the bounds
// and its seed picks within them, so the same song always looks the same, two songs of a kind look related but not
// alike, and the look always fits the mood:
//   - colour (research: valence goes with lightness, arousal with colourfulness, dark and saturated reads as
//     aggressive; fast major music finds light saturated yellows, slow minor music dark greyish blues; Valdez and
//     Mehrabian 1994, Palmer et al. 2013): a hue family by style, lightness by valence and time of day, chroma by arousal
//   - time of day (and the hours the song moves on through) and weather, from those that suit the place and the mood
//   - landmarks: two of the place's own, by seed
// The colours what to jump / slide under / grab keep their families (warm / cold / magenta) in every look, so the game
// reads the same everywhere.
import { oklch } from './color.js';
import { mulberry, pick } from './rng.js';
import { nearest, weighted } from './places.js';
import { actAt, songActs } from './acts.js';
import { composeWorld } from './world/index.js';
import { packParts } from './world/artists.js';

// hue families (degrees) per style: [centre, spread]
// (hue says little about emotion next to lightness and chroma, so each style has several families: two songs of a
// kind can land far apart in hue and still both read right)
const HUES = {
  hard: [[18, 14], [340, 12], [285, 14], [195, 14], [125, 12]],
  dark: [[255, 25], [215, 20], [300, 20], [170, 15]],
  bright: [[60, 25], [320, 20], [25, 15], [100, 15]],
  chill: [[195, 25], [295, 25], [150, 20], [30, 15]],
  epic: [[230, 30], [40, 20], [270, 20]],
};
const TIMES = {
  hard: ['night', 'night', 'dusk'],
  dark: ['night', 'dusk', 'night'],
  bright: ['day', 'dusk', 'dawn'],
  chill: ['dawn', 'dusk', 'day', 'night'],
  epic: ['dusk', 'night', 'dawn'],
};
// the sky's lightness at its top, middle and horizon, per time of day
const SKY_L = { deep: [0.08, 0.2, 0.36], night: [0.1, 0.18, 0.3], dusk: [0.22, 0.42, 0.68], dawn: [0.42, 0.66, 0.84], day: [0.58, 0.74, 0.88], space: [0.06, 0.1, 0.16] };
// the weather each place can have, and the moods it leans to
const WEATHER = {
  city: { rain: ['dark', 'hard'], fog: ['chill', 'dark'], snow: ['chill', 'epic'], clear: ['bright', 'epic', 'hard'] },
  forest: { fog: ['dark', 'chill'], rain: ['dark'], fireflies: ['chill', 'bright', 'epic'], snow: ['chill'] },
  desert: { clear: ['bright', 'chill'], sand: ['hard', 'epic', 'dark'] },
  synth: { clear: ['bright', 'chill'], rain: ['dark', 'hard'], stars: ['epic', 'chill'] },
  station: { stars: ['chill', 'bright', 'epic', 'dark'], debris: ['hard', 'epic'] },
  factory: { smog: ['dark', 'hard'], rain: ['dark'], embers: ['hard', 'epic'] },
  rave: { clear: ['bright', 'epic'], smog: ['hard', 'dark'], confetti: ['bright', 'epic', 'hard'] },
  volcano: { embers: ['hard', 'epic', 'dark'], smog: ['dark', 'hard'] },
  ocean: { bubbles: ['chill', 'dark', 'bright'], fog: ['dark', 'chill'] },
  arctic: { snow: ['chill', 'epic', 'bright'], clear: ['bright', 'chill'], sand: ['epic'] },
  circuit: { clear: ['bright', 'chill', 'epic'], debris: ['hard', 'epic'], smog: ['dark', 'hard'] },
  tokyo: { rain: ['dark', 'hard', 'chill'], fog: ['chill', 'dark'], snow: ['chill', 'epic'], clear: ['bright', 'epic'] },
  graveyard: { fog: ['dark', 'chill', 'epic'], rain: ['dark', 'hard'], embers: ['hard', 'epic'], fireflies: ['chill'] },
  arena: { confetti: ['bright', 'epic', 'hard'], clear: ['bright', 'epic'], rain: ['hard', 'dark'], smog: ['hard'] },
  casino: { clear: ['bright', 'epic'], confetti: ['bright', 'epic', 'hard'], smog: ['dark', 'hard'] },
  castle: { fog: ['dark', 'chill'], rain: ['dark', 'hard'], stars: ['epic', 'chill'], snow: ['chill', 'epic'] },
  skies: { clear: ['bright', 'epic', 'chill'], fog: ['chill', 'dark'], rain: ['dark', 'hard'], stars: ['epic', 'chill'] },
  bazaar: { clear: ['bright', 'chill'], fog: ['dark', 'chill'], rain: ['dark', 'hard'], confetti: ['bright', 'hard', 'epic'], embers: ['hard', 'epic'] },
  kowloon: { rain: ['dark', 'hard', 'chill'], smog: ['hard', 'dark'], fog: ['chill', 'dark'] },
  moon: { stars: ['chill', 'epic', 'bright', 'dark'], debris: ['hard', 'epic'], sand: ['hard', 'dark'] },
  mall: { clear: ['bright', 'chill'], confetti: ['bright', 'epic'], bubbles: ['chill', 'dark'], rain: ['dark'] },
  wasteland: { sand: ['hard', 'epic', 'dark'], embers: ['hard', 'epic'], smog: ['dark', 'hard'], clear: ['epic'] },
  blacksnow: { blacksnow: ['dark', 'chill', 'hard', 'epic'], feathers: ['dark', 'hard'] },
  holyrave: { acidrain: ['hard', 'dark', 'epic'], confetti: ['bright', 'epic'] },
  apocradio: { static: ['hard', 'dark', 'epic'], soot: ['dark', 'hard'] },
  anthill: { motes: ['hard', 'epic', 'dark', 'bright', 'chill'] },
  fujisan: { velvetdust: ['bright', 'epic', 'chill', 'hard', 'dark'] },
  lastman: { fluff: ['chill', 'bright', 'dark', 'epic', 'hard'] },
  compost: { ashrain: ['dark', 'chill', 'bright', 'epic', 'hard'] },
  crocsky: { mushroomrain: ['dark', 'chill', 'bright', 'epic', 'hard'] },
};
const LANDMARKS = {
  city: ['tower', 'bridge', 'billboards', 'stadium'],
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

// the lenses the song's simulation is rendered through (render/layers/lens.js), each at a point of [arousal, valence,
// hardness] like the places (places.js MOOD); `back` ones lie over the background only (the action keeps its colours)
const LENSES = {
  pixel: [0.6, 0.6, 0.4], led: [0.75, 0.6, 0.6], vhs: [0.4, 0.35, 0.4], comic: [0.7, 0.7, 0.5], ascii: [0.7, 0.3, 0.6],
  thermal: [0.85, 0.3, 0.85], blueprint: [0.45, 0.55, 0.3], nightvision: [0.6, 0.15, 0.6], tron: [0.8, 0.45, 0.7], manga: [0.75, 0.5, 0.6],
  riso: [0.5, 0.75, 0.3], fisheye: [0.85, 0.6, 0.7], datamosh: [0.9, 0.25, 0.9], amber: [0.4, 0.25, 0.4],
};
// (a pack's place keeps to lenses of its kind: ink, tape and a two-tone over the black snow, light over the rave's
// stones, tape and noise over the radio limbo)
const PACK_LENSES = { blacksnow: ['manga', 'vhs', 'duo', 'comic', 'amber', 'riso'], holyrave: ['tron', 'kaleido', 'led', 'fisheye', 'pixel', 'comic'], apocradio: ['vhs', 'datamosh', 'duo', 'nightvision', 'amber', 'comic'], anthill: ['amber', 'kaleido', 'tron', 'thermal', 'duo', 'fisheye'], fujisan: ['watercolor', 'riso', 'manga', 'kaleido', 'duo', 'comic'], lastman: ['watercolor', 'riso', 'comic', 'kaleido', 'gameboy', 'amber'], compost: ['thermal', 'watercolor', 'riso', 'duo', 'comic', 'amber'], crocsky: ['watercolor', 'kaleido', 'comic', 'duo', 'riso', 'thermal'] };
const BACK_LENSES = { duo: [0.5, 0.4, 0.4], gameboy: [0.5, 0.7, 0.2], kaleido: [0.6, 0.75, 0.3], watercolor: [0.25, 0.6, 0.1] };

// a palette for hue h at a time of day
function palette(P, h, time, jit) {
  const [lt, lm, lh] = SKY_L[time],
    // brighter for happier songs, darker for sadder ones (within the time of day)
    lv = 0.85 + 0.3 * P.valence,
    C = 0.04 + 0.16 * P.arousal + jit(0.02),
    // the horizon leans warm at dusk and dawn
    hHor = time === 'dusk' || time === 'dawn' ? h + 35 + jit(10) : h + jit(15),
    wh = P.style === 'hard' ? 30 + jit(15) : (h + 160 + jit(40)) % 360;
  const pal = {
    sky: [oklch(Math.min(0.9, lt * lv), C * 0.7, h), oklch(Math.min(0.92, lm * lv), C * 0.9, (h + hHor) / 2), oklch(Math.min(0.94, lh * lv), C, hHor)],
    far: oklch(Math.max(0.08, lm * lv * 0.55), C * 0.6, h),
    near: oklch(Math.max(0.05, lm * lv * 0.3), C * 0.5, h),
    win: [oklch(0.82, 0.12, wh), oklch(0.72, 0.16, wh + 20), oklch(0.93, 0.05, wh)],
    line: oklch(0.78, Math.min(0.3, C * 1.3 + 0.06), (h + 180 + jit(30)) % 360),
    jump: oklch(0.8, 0.12 + 0.07 * P.arousal, 60 + jit(12)),
    slide: oklch(0.84, 0.1 + 0.06 * P.arousal, 205 + jit(10)),
    hold: oklch(0.7, 0.16 + 0.06 * P.arousal, 335 + jit(10)),
  };
  // the drop's palette: the same act turned up, its hues swung round and richer (cut to on a drop's first beat, cut back
  // after it; the action colours never change)
  const hd = (h + 40 + jit(20)) % 360,
    Cd = Math.min(0.3, C * 1.5 + 0.04),
    palDrop = {
      ...pal,
      sky: [oklch(lt * lv * 0.8, Cd * 0.8, hd), oklch(lm * lv, Cd, hd + 20), oklch(Math.min(0.92, lh * lv), Cd, hd + 45)],
      far: oklch(Math.max(0.08, lm * lv * 0.5), Cd * 0.7, hd),
      near: oklch(Math.max(0.05, lm * lv * 0.28), Cd * 0.6, hd),
      line: oklch(0.82, Math.min(0.32, Cd * 1.3 + 0.06), (hd + 180) % 360),
    };
  return { pal, palDrop };
}
// the tones of the artists' packs' places (world/artists.js): their own hue families, and their colours bent after
// the palette is made (the jitter drawn as for any place, so nothing else of the look moves), the action colours kept:
//   blacksnow  black and white and one red (the videos' grammar: grey skies, ink, a red line and a red light or two)
//   holyrave   acid: toxic green, magenta and violet neon on a violet black night
//   apocradio  amber and teal under a static sky, the magenta of flowers out of a radio
const grey = (c, k = 0.012, h = 80) => {
  const n = parseInt(c.slice(1), 16),
    L = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return oklch(Math.min(0.96, 0.15 + 0.8 * L ** 0.8), k, h);
};
export const TONE = {
  blacksnow: {
    hues: [[60, 10], [250, 10]],
    bend(p, drop) {
      p.sky = p.sky.map((c, i) => (drop && i === 2 ? oklch(0.36, 0.11, 27) : grey(c, 0.006)));
      p.far = grey(p.far, 0.006);
      p.near = drop ? oklch(0.14, 0.03, 25) : grey(p.near, 0.004);
      p.win = [oklch(0.9, 0.03, 85), oklch(0.58, 0.21, 27), oklch(0.96, 0.01, 90)];
      p.line = oklch(0.6, 0.22, 27);
    },
  },
  holyrave: {
    hues: [[150, 12], [325, 12], [285, 12]],
    bend(p, drop) {
      p.win = [oklch(0.88, 0.26, 145), oklch(0.68, 0.3, 335), oklch(0.95, 0.04, 300)];
      p.line = drop ? oklch(0.72, 0.3, 335) : oklch(0.86, 0.27, 145);
      p.near = oklch(0.1, 0.05, 290);
      // (the night of the rite: violet black, a toxic glow low on the horizon; on a drop, magenta)
      p.sky = drop ? [oklch(0.1, 0.06, 300), oklch(0.18, 0.12, 320), oklch(0.32, 0.2, 340)] : [oklch(0.08, 0.05, 285), oklch(0.15, 0.08, 270), oklch(0.28, 0.14, 160)];
      p.far = oklch(0.2, 0.06, 290);
    },
  },
  apocradio: {
    hues: [[45, 12], [195, 10], [30, 10]],
    bend(p) {
      p.win = [oklch(0.82, 0.16, 70), oklch(0.6, 0.2, 350), oklch(0.75, 0.12, 190)];
      p.line = oklch(0.74, 0.13, 190);
    },
  },
  // (the favourites' worlds: the anthill's golden afternoon at an ant's height under a turquoise sky, gold and orchid;
  // the sacred mountain's black velvet over a purple dawn; the empty Earth's lettuce-green sky over gold fields; the
  // ash and embers turning spring, its drops green)
  anthill: {
    hues: [[75, 10], [330, 10]],
    bend(p, drop) {
      p.sky = drop ? [oklch(0.6, 0.11, 225), oklch(0.8, 0.12, 85), oklch(0.82, 0.16, 50)] : [oklch(0.64, 0.09, 215), oklch(0.84, 0.09, 95), oklch(0.86, 0.12, 70)];
      p.far = oklch(0.6, 0.1, 115);
      p.near = oklch(0.32, 0.07, 60);
      p.win = [oklch(0.86, 0.16, 80), oklch(0.66, 0.22, 340), oklch(0.95, 0.05, 90)];
      p.line = drop ? oklch(0.7, 0.24, 340) : oklch(0.86, 0.17, 80);
    },
  },
  fujisan: {
    hues: [[300, 10], [345, 10]],
    bend(p, drop) {
      p.sky = drop ? [oklch(0.1, 0.05, 285), oklch(0.26, 0.13, 315), oklch(0.7, 0.14, 45)] : [oklch(0.08, 0.04, 290), oklch(0.2, 0.1, 300), oklch(0.55, 0.15, 345)];
      p.far = oklch(0.32, 0.07, 300);
      p.near = oklch(0.16, 0.04, 295);
      p.win = [oklch(0.84, 0.1, 50), oklch(0.72, 0.17, 355), oklch(0.96, 0.02, 300)];
      p.line = oklch(0.8, 0.15, 350);
    },
  },
  lastman: {
    hues: [[95, 10], [220, 10]],
    bend(p, drop) {
      // (the lettuce-green sky of "Под небом салатовым", to mint at the horizon)
      p.sky = drop ? [oklch(0.66, 0.17, 135), oklch(0.8, 0.15, 145), oklch(0.92, 0.09, 110)] : [oklch(0.72, 0.14, 132), oklch(0.85, 0.11, 150), oklch(0.94, 0.06, 168)];
      p.far = oklch(0.6, 0.12, 150);
      p.near = oklch(0.5, 0.1, 105);
      p.win = [oklch(0.88, 0.15, 90), oklch(0.62, 0.22, 30), oklch(0.97, 0.02, 100)];
      p.line = oklch(0.87, 0.16, 92);
    },
  },
  crocsky: {
    hues: [[180, 10], [140, 10]],
    bend(p, drop) {
      // (inside the crocodile: a night throat over an aquamarine horizon; a drop's sun floods it gold)
      p.sky = drop ? [oklch(0.55, 0.1, 200), oklch(0.78, 0.12, 170), oklch(0.93, 0.12, 95)] : [oklch(0.16, 0.05, 210), oklch(0.36, 0.09, 195), oklch(0.7, 0.12, 182)];
      p.far = oklch(0.42, 0.08, 165);
      p.near = oklch(0.22, 0.05, 150);
      p.win = [oklch(0.88, 0.15, 90), oklch(0.62, 0.22, 28), oklch(0.85, 0.12, 182)];
      p.line = oklch(0.84, 0.13, 182);
    },
  },
  compost: {
    hues: [[40, 10], [140, 10]],
    bend(p, drop) {
      p.sky = drop ? [oklch(0.2, 0.04, 170), oklch(0.36, 0.07, 150), oklch(0.62, 0.12, 125)] : [oklch(0.13, 0.02, 30), oklch(0.25, 0.03, 40), oklch(0.42, 0.11, 40)];
      p.far = drop ? oklch(0.3, 0.08, 140) : oklch(0.21, 0.03, 40);
      p.near = oklch(0.13, 0.02, 40);
      p.win = [oklch(0.82, 0.19, 140), oklch(0.7, 0.2, 38), oklch(0.93, 0.05, 100)];
      p.line = drop ? oklch(0.86, 0.21, 140) : oklch(0.74, 0.18, 45);
    },
  },
};
// (the time a pack's place starts at, its hours moving on through the song as any place's: a grey dusk into a black
// night and a pale dawn)
const PACK_TIME = { blacksnow: 'dusk', apocradio: 'dusk' };
const FIXED_TIME = { holyrave: 'night', anthill: 'day', fujisan: 'dawn', lastman: 'day', compost: 'dusk', crocsky: 'dusk', station: 'space', ocean: 'deep', rave: 'night', moon: 'space', tokyo: 'night', castle: 'night', graveyard: 'night', casino: 'night', bazaar: 'night', kowloon: 'night' };
// how far each act's hue swings from the song's (degrees), by the act's order
const SWING = [0, 30, -25, 45, -40, 60, 15, -50];

// the hours a song passes through, from its own (Sayonara's levels and a night out: the light moves on with the music,
// slowly, across the whole song; ending towards the morning)
const PATH = { dawn: ['dawn', 'day', 'dusk'], day: ['day', 'dusk', 'night'], dusk: ['dusk', 'night', 'dawn'], night: ['night', 'night', 'dawn'] };

// `dress`: an artist's song's (world/artists.js artistDress), its pack's parts and the tags its world leans to
export function makeLook(place, P, seed, A = null, dress = null) {
  // (its own stream, so the look does not move when the level's generation changes)
  const r = mulberry(seed ^ 0x5eed),
    jit = s => (r() * 2 - 1) * s,
    tone = TONE[place],
    [hc, hs] = pick(r, tone?.hues ?? HUES[P.style]),
    h = (hc + jit(hs) + 360) % 360,
    time = FIXED_TIME[place] ?? (PACK_TIME[place] ? (pick(r, TIMES[P.style]), PACK_TIME[place]) : pick(r, TIMES[P.style])),
    path = FIXED_TIME[place] ? [time] : PATH[time];
  // (a pack's place's palettes bent to its tone)
  const toned = q => (tone && (tone.bend(q.pal, false), tone.bend(q.palDrop, true)), q);
  // (each palette of an act made with the same jitter, so its hours differ only by the hour)
  const pals = (hue, salt) => path.map(tm => toned(palette(P, hue, tm, ((q => s => (q() * 2 - 1) * s)(mulberry(seed ^ salt))))));
  const { pal, palDrop } = toned(palette(P, h, time, jit));
  // the song's own world put together from the pack's parts (world/; ?world=plain: the place as it was made; ?sky= ?far=
  // ?ground= ?mark= ?weather= ?performer= ?clone=: a part forced, for a look at it)
  const q = typeof location === 'undefined' ? new Map() : new URLSearchParams(location.search),
    pinned = Object.fromEntries(['sky', 'far', 'ground', 'mark', 'weather', 'performer', 'clone'].filter(k => q.get(k)).map(k => [k, q.get(k)])),
    // (an artist's song: its pack's parts for its place, then its title's, under what the address forces; a landmark
    // of its own place called up is its own one)
    // (another song dressed in a pack's place (artists.js guestDress): only that place's world is the pack's, the
    // place it is rewritten into keeps to the game's own)
    pack = dress && !(dress.guest && place !== dress.place) ? dress : null,
    called = pack ? packParts(pack.pack, place, seed, pack.forced) : {};
  if (called.mark?.startsWith(`${place}:`)) (called.own = called.mark.slice(place.length + 1)), delete called.mark;
  const mix = q.get('world') === 'plain' ? null : composeWorld(place, seed, P, LANDMARKS[place], { ...called, ...pinned }, pack?.boost, pack?.pack, time);
  // weather: one of the place's, the ones that lean to this song's style twice as likely (a mixed world's: its own,
  // mix.js)
  const ws = Object.entries(WEATHER[place]).flatMap(([w, moods]) => (moods.includes(P.style) ? [w, w] : [w])),
    lm2 = [...LANDMARKS[place]];
  const landmarks = mix ? [mix.own] : [lm2.splice(Math.floor(r() * lm2.length), 1)[0], lm2.splice(Math.floor(r() * lm2.length), 1)[0]];
  // (the one left over shows up when the song has grown halfway)
  const extra = mix ? null : (lm2[0] ?? null),
    weather = mix ? (pick(r, ws), mix.weather) : pick(r, ws);
  // the acts: the same place at the same hour in the same weather, only its colours drifting a little (further on a
  // drop); each with a palette for each hour of the song's path
  const acts = A ? songActs(A) : [{ i: 0, t0: 0, t1: 1e9, kind: 'intro' }],
    rs = mulberry(seed ^ 0xac75),
    scenes = acts.map(a => {
      const hue = a.i ? (h + SWING[a.i % SWING.length] * (a.kind === 'drop' ? 0.5 : 0.3) + (rs() * 2 - 1) * 6 + 360) % 360 : h;
      return { ...a, hue, keys: pals(hue, 0x1000 + a.i) };
    }),
    dur = A?.dur ?? 1;
  const sceneAt = t => scenes[actAt(scenes, t).i];
  // where in its path of hours the song is at t: hours a and b, u of the way from a to b
  const dayAt = t => {
    const p = Math.max(0, Math.min(1, t / dur)) * (path.length - 1),
      i = Math.min(path.length - 2, Math.floor(p));
    return path.length < 2 ? { a: path[0], b: path[0], u: 0, i: 0 } : { a: path[i], b: path[i + 1], u: p - i, i };
  };
  // the palette at t (drop: the drop's): the act's, its hour mixed in, faded in from the last act's over two beats
  // (memoized in steps: a palette is a few dozen colours, not remade every frame)
  const memo = new Map(),
    beat = A?.beat ?? 0.5;
  const palAt = (t, drop) => {
    const sc = sceneAt(t),
      prev = scenes[sc.i - 1],
      d = dayAt(t),
      du = Math.round(d.u * 24) / 24,
      fu = prev ? Math.min(1, Math.round(((t - sc.t0) / (2 * beat)) * 12) / 12) : 1,
      k = `${sc.i}|${d.i}|${du}|${fu}|${drop}`;
    let out = memo.get(k);
    if (!out) {
      const key = drop ? 'palDrop' : 'pal',
        at = q => (path.length < 2 ? q.keys[0][key] : mixPal(q.keys[d.i][key], q.keys[d.i + 1][key], du));
      out = fu >= 1 ? at(sc) : mixPal(at(prev), at(sc), fu);
      if (memo.size > 400) memo.clear();
      memo.set(k, out);
    }
    return out;
  };
  // (the lens on a stream of its own, so the rest of the look stays as it was; ?lens= forces one, for a look at it)
  const rl = mulberry(seed ^ 0x1e45),
    forced = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('lens'),
    near = PACK_LENSES[place] ?? nearest(P, { ...LENSES, ...BACK_LENSES }),
    // (its signature lens, one of the six nearest its mood, on its first drop; a second, set against it, on its second
    // drop (from the far half of the near ones: a sensor's look against a retro one, ink against neon); a third for a long
    // song, over four minutes)
    first = forced ?? weighted(near, 6, rl),
    second = forced ?? weighted(near.filter(k => k !== first).slice(4), 6, rl),
    third = A && A.dur > 240 ? weighted(near.filter(k => k !== first && k !== second), 6, rl) : null,
    lenses = forced ? [forced] : [first, second, ...(third ? [third] : [])],
    lens = lenses[0],
    duo = [oklch(0.16, 0.08, (h + 200) % 360), oklch(0.85, 0.14, (h + 20 + 60 * rl()) % 360)];
  return {
    lens,
    lenses,
    duo,
    place,
    time,
    path,
    weather,
    pal,
    palDrop,
    landmarks,
    extra,
    scenes,
    sceneAt,
    dayAt,
    palAt,
    // how built-up / overgrown, and how hard the world reacts: a hard song's world punches, shakes and glitches, a chill
    // song's breathes
    density: 0.35 + 0.5 * r(),
    glitch: P.hardness > 0.5,
    react: Math.max(0.25, Math.min(1, 0.2 + 1.1 * P.hardness)),
    calm: P.chill,
    hue: h,
    mix,
  };
}
// two palettes mixed, u of the way from a to b (hex colours mixed channel by channel; arrays item by item)
const hexMix = (a, b, u) => {
  const p = parseInt(a.slice(1), 16),
    q = parseInt(b.slice(1), 16),
    c = s => Math.round(((p >> s) & 255) * (1 - u) + ((q >> s) & 255) * u);
  return '#' + ((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0');
};
export function mixPal(a, b, u) {
  const out = {};
  for (const k in a) out[k] = Array.isArray(a[k]) ? a[k].map((x, i) => hexMix(x, b[k][i], u)) : typeof a[k] === 'string' && a[k][0] === '#' ? hexMix(a[k], b[k], u) : a[k];
  return out;
}
