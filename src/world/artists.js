// The artists' packs: a song by an artist with a pack of its own is dressed in that pack's places and leans to its
// parts. Only the look follows the artist (the place a song is drawn in, its obstacles' skins, its props, the parts of
// its world): what is played (every obstacle's kind, time, lane and length) is the song's alone, from its sound, so a
// race against a friend's copy of the song with no tags (or other tags) is the same race, only dressed otherwise.
//   match   whether a song is the artist's: its artist tag, or a title of the form "<artist> - <title>" (a video's,
//           its uploader in the artist tag)
//   places  the pack's places (places.js PACK_MOOD): the song's is the one nearest its mood, its second (the place it
//           is rewritten into midway, if it is) the next nearest
//   boost   the tags the pack's world leans to: a part with them is likelier in the song's world (compose.js)
//   dress   per place, the parts it is always seen with, the song's seed choosing one of each list
//   titles  a song's own title calling up a part or a place (lowercase, ё read as е, the first that the title holds);
//           `whole`: the song stays in its place all through (its second place is its first: the owner's favourites, each
//           a world of its own)
//   guests  the pack's places any other song may be dressed in (guestDress): where its mood is nearer one of them than
//           any of the game's own places, and its mood passes the place's gates (affinity.js GATES: the gloomy black
//           snow and limbo never for a happy soft song, the sunny lettuce sky never for a sad one), one song in three by
//           its seed. The anthill (one song's ant-high world) and the spring out of the ash (its cartoon blast) stay
//           the artist's own
import { MOOD, PACK_MOOD, PLACES, nearest } from '../places.js';
import { gated } from './affinity.js';
import { placeTags } from './tags.js';
import { AIM_Y, THEMES } from '../props.js';

// a name or a title as it is read: composed (a file's tags may spell й and ё as a letter and its mark apart), lowercase,
// ё read as е
const plain = s => (s ?? '').normalize('NFC').toLowerCase().replace(/ё/g, 'е');
// a name as a whole word in a list of names ("ATL", "ATL, Stewart", "ATL x Ka тет", "ATL ACIDHOUZE", "АТЛ")
const word = (s, re) => re.test(` ${plain(s)} `);
const ATL = /[\s,&×/()+;]+(atl|атл)(?=[\s,&×/()+;.]|$)/;

export const ARTISTS = [
  {
    id: 'atl',
    match: (artist, title) => word(artist, ATL) || word(/^(.*?)\s[-–—]\s/.exec(title ?? '')?.[1], ATL),
    places: ['blacksnow', 'holyrave', 'apocradio', 'anthill', 'fujisan', 'lastman', 'compost', 'crocsky'],
    boost: ['acid', 'occult', 'radio', 'province', 'folk'],
    // (none: another artist's song is never dressed in this pack's places)
    guests: [],
    dress: {
      blacksnow: { far: ['blacksnow', 'blacksnow', 'blacksnow', 'mandrakes'], ground: ['blacksnow'], sky: ['blacksnow', 'blacksnow', 'cyclone', 'ophanim'], weather: ['blacksnow', 'blacksnow', 'feathers'], performer: ['inkbrush', 'inkbrush', 'seraph'], clone: ['crowcrown', 'goggles', 'skullhood'] },
      holyrave: { far: ['holyrave', 'holyrave', 'megaliths', 'mandrakes'], ground: ['holyrave', 'holyrave', 'glyphstone'], sky: ['holyrave', 'ophanim', 'acideye', 'helios'], weather: ['acidrain', 'acidrain', 'confetti'], performer: ['acidbones', 'shaman', 'seraph'], clone: ['thirdeye', 'crowcrown', 'skullhood'] },
      apocradio: { far: ['apocradio', 'apocradio', 'mandrakes'], ground: ['apocradio', 'apocradio', 'glyphstone'], sky: ['apocradio', 'cyclone', 'wavesky'], weather: ['static', 'static', 'feathers'], performer: ['ether', 'shaman'], clone: ['goggles', 'skullhood', 'thirdeye'] },
      // (the favourites' worlds: each always its own, through and through)
      anthill: { far: ['anthill'], ground: ['anthill'], sky: ['anthill'], weather: ['motes'], performer: ['chitin'], clone: ['anthelm'], solo: [true] },
      fujisan: { far: ['fujisan'], ground: ['fujisan'], sky: ['fujisan'], weather: ['velvetdust'], performer: ['velvet'], clone: ['snailshell'], solo: [true] },
      lastman: { far: ['lastman'], ground: ['lastman'], sky: ['lastman'], weather: ['fluff'], performer: ['haring', 'haring', 'furcoat'], clone: ['shades'], solo: [true] },
      crocsky: { far: ['crocsky'], ground: ['crocsky'], sky: ['crocsky'], weather: ['mushroomrain'], performer: ['drummer'], clone: ['crochood'], solo: [true] },
      compost: { far: ['compost'], ground: ['compost'], sky: ['compost'], weather: ['ashrain'], performer: ['sprouts'], clone: ['leafhat'], solo: [true] },
    },
    titles: [
      // (the owner's favourites first (their remixes and drum mixes too), then the songs of each world by their titles
      // (game/.cache/atl/WORLDS.md), then the angels', then the older pack's)
      ['архитектор', { base: 'anthill', whole: true }],
      ['фудзи', { base: 'fujisan', whole: true }],
      ['последний человек', { base: 'lastman', whole: true }],
      ['удобрением', { base: 'compost', whole: true }],
      ['таракан', { base: 'anthill' }],
      ['урожай', { base: 'anthill', sky: 'ophanim' }],
      ['генератор ахиней', { base: 'anthill' }],
      ['тяжесть', { base: 'fujisan' }],
      ['небом салатовым', { base: 'lastman' }],
      ['суперсоник', { base: 'lastman' }],
      ['притопил', { base: 'lastman' }],
      ['серпантин', { base: 'lastman' }],
      ['подснежник', { base: 'compost' }],
      ['гори ясно', { base: 'compost' }],
      ['хоровод', { base: 'compost' }],
      ['в грязь', { base: 'compost' }],
      ['вороний грай', { base: 'compost' }],
      ['крокодил', { base: 'crocsky', whole: true }],
      ['марабу', { base: 'crocsky' }],
      ['шаман', { base: 'crocsky' }],
      ['водяной', { base: 'crocsky' }],
      ['волчья ягода', { base: 'crocsky' }],
      ['жабры', { base: 'crocsky' }],
      ['ангел', { sky: 'ophanim', performer: 'seraph' }],
      ['крылья', { sky: 'ophanim', performer: 'seraph' }],
      ['черным снегом', { base: 'blacksnow', sky: 'ophanim', weather: 'blacksnow', performer: 'seraph' }],
      ['священный рейв', { base: 'holyrave', sky: 'ophanim' }],
      ['ниже нуля', { base: 'blacksnow', weather: 'blacksnow' }],
      ['мерзлота', { base: 'blacksnow', weather: 'blacksnow' }],
      ['грустный диджей', { base: 'holyrave' }],
      ['радио апокалипсис', { base: 'apocradio' }],
      ['66.6', { base: 'apocradio', mark: 'apocradio:boombox' }],
      ['кривой эфир', { base: 'apocradio', weather: 'static' }],
      ['гелиоз', { sky: 'helios' }],
      ['лимб', { base: 'apocradio', sky: 'acideye' }],
      ['центр циклона', { sky: 'cyclone' }],
      ['ящик', { sky: 'wavesky' }],
      ['вечный двигатель', { base: 'holyrave', mark: 'holyrave:perpetuum' }],
      ['стоунхендж', { base: 'holyrave', mark: 'holyrave:stonering' }],
      ['кости', { clone: 'skullhood' }],
      ['behemoth', { base: 'apocradio' }],
      ['industrial', { base: 'apocradio' }],
    ],
  },
];

// a song's pack, if its artist (or its title) has one: { pack, place, place2, forced, boost }, where place and place2
// stand for the places its level was built in (its own, from its sound); null for any other song
export function artistDress(artist, title, P, seed, place2 = null) {
  const pack = ARTISTS.find(a => a.match(artist, title));
  if (!pack) return null;
  const t = plain(title),
    called = pack.titles.find(([k]) => t.includes(k))?.[1] ?? {},
    { base, whole, ...forced } = called,
    // (nearest the song's mood among the pack's places, the seed choosing between the two nearest, a nearer likelier)
    order = nearest(P, Object.fromEntries(pack.places.map(p => [p, PACK_MOOD[p]]))),
    first = base ?? (((seed >>> 3) % 3 === 2 ? order[1] : order[0]) ?? order[0]),
    second = whole ? first : (order.find(p => p !== first) ?? first);
  return { pack: pack.id, place: first, place2: place2 ? second : null, forced, boost: pack.boost };
}
// another song's dress in a pack's place (ARTISTS guests): { pack, place, place2, forced, boost, guest }, or null. Its
// place is the guest nearest its mood when that is nearer than the nearest of the game's own places and its gates let
// it in (the place's own tags, world/places.js), one song in three by its seed; its second place (place2: what it is
// rewritten into midway) stays its own. Only the look follows: the level is built as before and dressed after it
export function guestDress(P, seed, place2 = null) {
  if ((Math.imul(seed ^ 0x6e57, 2654435761) >>> 0) % 3) return null;
  const dist = table => {
      const at = nearest(P, table)[0],
        q = [Math.max(0, Math.min(1, (P.arousal - 0.4) / 0.5)), P.valence, Math.max(0, Math.min(1, (P.hardness - 0.3) / 0.4))];
      return [at, Math.hypot(...table[at].map((x, i) => x - q[i]))];
    },
    [own, dOwn] = dist(MOOD);
  for (const pack of ARTISTS) {
    const ok = (pack.guests ?? []).filter(p => gated(placeTags(p), P));
    if (!ok.length) continue;
    const [g, d] = dist(Object.fromEntries(ok.map(p => [p, PACK_MOOD[p]])));
    if (d < dOwn) return { pack: pack.id, place: g, place2, forced: {}, boost: null, guest: true, own };
  }
  return null;
}
// the parts a pack's place is always seen with, one of each list by the seed (a title's own come first)
export function packParts(id, place, seed, forced = {}) {
  const pack = ARTISTS.find(a => a.id === id),
    d = pack?.dress[place];
  if (!d) return { ...forced };
  const out = {};
  Object.entries(d).forEach(([slot, list], k) => (out[slot] = list[(Math.imul(seed ^ (k * 0x9e37), 2654435761) >>> 0) % list.length]));
  return { ...out, ...forced };
}
// a level dressed in its pack's places (artistDress): each obstacle's skin the same of its kind in the new place
// (the n-th thing to jump in the one, the n-th in the other: the level's own stream of choices untouched), each prop
// the new place's (what is thrown, what lies on the roof, the threat it is thrown at); nothing played changes
export function dressLevel(L, d) {
  if (!d) return L;
  const from = { [L.place]: d.place, ...(L.place2 ? { [L.place2]: d.place2 ?? d.place } : {}) },
    to = p => from[p] ?? d.place,
    was = L.placeAt;
  for (const o of L.obs) {
    const p0 = was(o.t),
      p1 = to(p0);
    for (const q of [p0, L.place, L.place2].filter(Boolean)) {
      const skins = PLACES[q]?.skins,
        kind = skins && Object.keys(skins).find(k => skins[k].includes(o.skin));
      if (!kind) continue;
      const list = PLACES[to(q)].skins[kind];
      o.skin = list[skins[kind].indexOf(o.skin) % list.length];
      break;
    }
    const th = THEMES[p1];
    if (o.type === 'bat') o.fly = th.fly;
    if (o.type === 'pick' || o.type === 'throw') o.item = th.item;
    if (o.type === 'throw') {
      o.aim = d.forced.aim ?? th.aim[(o.pid ?? 0) % th.aim.length];
      o.ty = AIM_Y[o.aim];
    }
  }
  for (const s of L.segs) if (s.place) s.place = to(s.place);
  return Object.assign(L, { place: d.place, place2: L.place2 ? to(L.place2) : L.place2, placeAt: t => to(was(t)), dress: d });
}
