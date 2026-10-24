// An artist's page on the songs screen, from Audius: who they are (their name, their picture, how many follow them) and
// their songs the game plays (the same rule as audius.js: streamable to anyone, not gated, 1.5 to 7 minutes, no
// parental warning), most played first. Found from one of their songs on Audius, or by their name (the game's own
// songs, a link's): the account of that name, a verified one first, then the most followed. Asked once per page
// (kept for the session); a song the player made their own is no business of Audius's (select.js lists their files).
const API = 'https://api.audius.co/v1',
  APP = 'SIMEXE-BeatRun',
  KEY = 'sim.artists.1';
async function get(path) {
  const r = await fetch(`${API}${path}${path.includes('?') ? '&' : '?'}app_name=${APP}`);
  if (!r.ok) throw new Error(`audius ${r.status}`);
  return (await r.json()).data ?? null;
}
const fit = t => t.is_streamable !== false && !t.is_stream_gated && !t.is_delete && t.duration >= 90 && t.duration <= 420 && !t.parental_warning_type;
// (a song as the recommended list keeps one: what the owner's list needs too, tools/recommend.mjs)
export const songOf = t => ({ id: t.id, title: t.title, artist: t.user?.name ?? '', art: t.artwork?.['480x480'] ?? t.artwork?.['150x150'] ?? null, dur: t.duration, url: `https://audius.co${t.permalink}`, plays: t.play_count ?? 0 });
const kept = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
})();
const keep = (k, v) => {
  kept[k] = v;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(kept));
  } catch {}
  return v;
};

// one song of theirs as Audius has it (its plays, its artist's id)
export async function song(id) {
  if (kept[`t:${id}`]) return kept[`t:${id}`];
  const t = await get(`/tracks/${encodeURIComponent(id)}`);
  return keep(`t:${id}`, { ...songOf(t), user: t.user?.id ?? null });
}
// the artist: { id, name, handle, pic, followers, url, songs: [songOf] }, or null when Audius knows none by that name
export async function artist({ audius, name }) {
  let uid = audius ? (await song(audius)).user : null;
  if (!uid && name) {
    const k = `n:${name.toLowerCase()}`;
    uid = kept[k] ?? null;
    if (!(k in kept)) {
      const users = (await get(`/users/search?query=${encodeURIComponent(name)}&limit=20`)) ?? [],
        same = users.filter(u => u.name?.trim().toLowerCase() === name.trim().toLowerCase()).sort((a, b) => (b.is_verified ? 1 : 0) - (a.is_verified ? 1 : 0) || (b.follower_count ?? 0) - (a.follower_count ?? 0));
      uid = keep(k, same[0]?.id ?? null);
    }
  }
  if (!uid) return null;
  if (kept[`u:${uid}`]) return kept[`u:${uid}`];
  const [u, ts] = await Promise.all([get(`/users/${encodeURIComponent(uid)}`), get(`/users/${encodeURIComponent(uid)}/tracks?limit=50&sort_method=plays`)]);
  return keep(`u:${uid}`, {
    id: uid,
    name: u?.name ?? name ?? '',
    handle: u?.handle ?? '',
    pic: u?.profile_picture?.['480x480'] ?? u?.profile_picture?.['150x150'] ?? null,
    followers: u?.follower_count ?? 0,
    url: u?.handle ? `https://audius.co/${u.handle}` : null,
    songs: (ts ?? [])
      .filter(fit)
      .map(songOf)
      .sort((a, b) => b.plays - a.plays),
  });
}
