// A song's words, timed (LRCLIB: an open database of synced lyrics, which answers a page directly): [[seconds, line]...]
// or null; by its artist, title and length, else a search's synced match that is this song: its title and its artist
// both found in the asked ones (or the other way round) and its length within a few seconds (a search returns anything
// sharing a word: a German song once got another band's words). Kept on the device per song.
const KEY = 'sim.lyrics2:';
const fold = s =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\(.*?\)|\[.*?\]|feat\..*$|ft\..*$/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
const near = (a, b) => !!a && !!b && (a.includes(b) || b.includes(a));
export async function lyricsOf(artist, title, dur) {
  const k = KEY + `${artist}|${title}`;
  try {
    const kept = localStorage.getItem(k);
    if (kept !== null) return kept ? JSON.parse(kept) : null;
  } catch {}
  const q = new URLSearchParams({ artist_name: artist, track_name: title.replace(/\s*\((over )?slowed.*\)|\s*\[.*?\]/gi, '') });
  if (dur) q.set('duration', Math.round(+dur));
  let rec = await fetch(`https://lrclib.net/api/get?${q}`).then(r => (r.ok ? r.json() : null));
  if (!rec?.syncedLyrics) {
    const list = await fetch(`https://lrclib.net/api/search?${new URLSearchParams({ q: `${artist} ${title}` })}`).then(r => (r.ok ? r.json() : []));
    const fa = fold(artist),
      ft = fold(title);
    rec =
      list.find(
        x =>
          x.syncedLyrics &&
          near(fold(x.trackName), ft) &&
          (!fa || near(fold(x.artistName), fa)) &&
          (!dur || !x.duration || Math.abs(x.duration - dur) < 4),
      ) ?? null;
  }
  const lines = (rec?.syncedLyrics ?? '')
    .split('\n')
    .map(l => l.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/))
    .filter(Boolean)
    .map(m => [+m[1] * 60 + +m[2], m[3]]);
  try {
    localStorage.setItem(k, lines.length ? JSON.stringify(lines) : '');
  } catch {}
  return lines.length ? lines : null;
}
