// Music from Audius (an open music network whose API lets apps and games stream its tracks; its Open Music License
// covers that, and an artist can keep a track out of it): searched or browsed by genre in the browser, streamed in full
// straight from Audius (its API and its storage answer any page: no server of ours in between), always credited to its
// artist with a link back. Only what fits a run: streamable to anyone, not gated, 1.5 to 7 minutes (no hour-long DJ
// mixes), no parental warning.
const API = 'https://api.audius.co/v1',
  APP = 'SIMEXE-BeatRun';

// the genres offered as chips (Audius's own names)
export const GENRES = [
  'Electronic',
  'Drum & Bass',
  'Dubstep',
  'House',
  'Techno',
  'Trap',
  'Hip-Hop/Rap',
  'Pop',
  'Rock',
  'Lo-Fi',
  'Ambient',
];

const fit = t =>
  t.is_streamable !== false &&
  !t.is_stream_gated &&
  !t.is_delete &&
  t.duration >= 90 &&
  t.duration <= 420 &&
  !t.parental_warning_type;
const shape = t => ({
  id: t.id,
  title: t.title,
  artist: t.user?.name ?? '',
  url: `https://audius.co${t.permalink}`,
  art: t.artwork?.['480x480'] ?? t.artwork?.['150x150'] ?? null,
  dur: t.duration,
  genre: t.genre,
  license: t.license ?? null,
});
async function get(path) {
  const r = await fetch(`${API}${path}${path.includes('?') ? '&' : '?'}app_name=${APP}`);
  if (!r.ok) throw new Error(`audius ${r.status}`);
  return (await r.json()).data ?? [];
}
// what is trending in a genre (or overall), or what a search finds
export const trending = async genre =>
  (await get(`/tracks/trending?limit=60${genre ? `&genre=${encodeURIComponent(genre)}` : ''}`)).filter(fit).map(shape);
export const search = async q =>
  (await get(`/tracks/search?limit=60&query=${encodeURIComponent(q)}`)).filter(fit).map(shape);
export const track = async id => shape(await get(`/tracks/${encodeURIComponent(id)}`));
// several tracks by id, in their order (asked eight at a time: a longer ask goes unanswered)
export async function tracks(ids) {
  const parts = [];
  for (let i = 0; i < ids.length; i += 8) parts.push(ids.slice(i, i + 8));
  const got = (
      await Promise.all(
        parts.map(p => get(`/tracks?${p.map(id => `id=${encodeURIComponent(id)}`).join('&')}`).catch(() => [])),
      )
    ).flat(),
    by = new Map(got.map(t => [t.id, t]));
  return ids
    .map(id => by.get(id))
    .filter(t => t && fit(t))
    .map(shape);
}
// songs of artists known well beyond Audius, which they put there themselves (the most played of each, picked by hand:
// Audius's own trending is mostly names nobody knows); listed first among the popular ones
export const KNOWN = [
  // Skrillex, RAC, Zedd, Steve Aoki & 3LAU, deadmau5 (two), Disclosure (two)
  'G0wyE',
  'n1zqQ',
  'ljjdG',
  'agVo1',
  '2lkqG',
  'zZlAp',
  'jEQy4',
  'rEdqpyZ',
  // REZZ, Zeds Dead (two), NGHTMRE, ODESZA, 3LAU, Kill Paris, Slow Magic
  'DBpQn',
  'LKAze',
  'aNzxr',
  'Zk09216',
  'K7vE9',
  'rKbzWyZ',
  'epQkz',
  'x5RrY',
  // Wuki, Boys Noize, Masego, RUSS, Soulja Boy, Dirty Audio, Kayzo, ATTLAS, Alina Baraz, Miquela
  '2PEEp',
  'oEg42',
  'n0404',
  'qEJgB',
  'aa4Y87Q',
  'E7dzJ',
  'VvxyN',
  'x5dg3',
  'y8NWZ',
  'LKWVl',
];
// the track's full audio (its stream redirects to the node that holds it)
export const streamUrl = id => `${API}/tracks/${encodeURIComponent(id)}/stream?app_name=${APP}`;
// where a track's audio is in the end, found ahead (a song picked on the songs screen, or as a song starts loading:
// main.js): its stream goes through two redirects, a second and more before the first byte (the API, then the node,
// which signs a link to its storage), so the link they end at is asked for once, its answer let go at its headers, and
// the song fetched from there straight away. Kept a quarter of an hour (the storage's link holds for two). A promise of
// that link, or of null (then the stream itself)
const ends = new Map(),
  FRESH = 15 * 60e3;
export function resolve(id) {
  const had = ends.get(id);
  if (had && performance.now() - had.at < FRESH) return had.url;
  const ctl = new AbortController(),
    e = { at: performance.now() };
  e.url = fetch(streamUrl(id), { signal: ctl.signal, priority: 'low' })
    .then(r => {
      ctl.abort();
      return r.ok && r.redirected ? r.url : null;
    })
    .catch(() => null)
    .then(url => (url || ends.delete(id), url));
  ends.set(id, e);
  return e.url;
}
export async function audio(id) {
  const r = await fetch(streamUrl(id));
  if (!r.ok) throw new Error(`audius ${r.status}`);
  return r.arrayBuffer();
}
