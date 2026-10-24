// A song's words, timed (LRCLIB: an open database of synced lyrics, which answers a page directly): [[seconds, line]...]
// or null; by its artist, title and length, else the first synced match of a search. Kept on the device per song.
const KEY = 'sim.lyrics:';
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
    rec = list.find(x => x.syncedLyrics) ?? null;
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
