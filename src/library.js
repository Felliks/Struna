// The player's library on this device: the songs they liked (with enough of each to list and play it again: its title,
// artist, cover and where it is heard from), their own playlists (named, the same kind of item in the order they put
// them), the covers read from their own files (tags.js), and what was played last.
// Kept in localStorage; nothing leaves the browser.
const get = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? d;
  } catch {
    return d;
  }
};
const put = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};
const LIKED = 'sim.liked',
  COVERS = 'sim.covers',
  LISTS = 'sim.playlists';
// what is kept of a song to list and play it again (a cover made on the device, a data: URL, is not kept: too big)
const itemOf = e => ({ key: e.key, title: e.title, artist: e.artist ?? '', art: e.art && !e.art.startsWith('data:') ? e.art : null, link: e.link ?? (e.audius ? `audius:${e.audius}` : null), at: Date.now() });

export class Library {
  constructor() {
    // (newest first: { key, title, artist, art, link, at })
    this.liked = get(LIKED, []);
    this.covers = get(COVERS, {});
    // (the player's playlists, in the order they were made: { id, name, items: [as liked], at })
    this.lists = get(LISTS, []);
    this.listeners = new Set();
  }
  // `f(key)` after a like or an unlike anywhere (the songs screen, the pause, the results)
  onChange(f) {
    this.listeners.add(f);
  }
  isLiked(key) {
    return this.liked.some(x => x.key === key);
  }
  // a song liked or let go; `e` what to keep of it; its new state
  toggle(e) {
    const was = this.isLiked(e.key);
    if (was) this.liked = this.liked.filter(x => x.key !== e.key);
    else this.liked.unshift(itemOf(e));
    put(LIKED, this.liked);
    for (const f of this.listeners) f(e.key);
    return !was;
  }
  // a like let go put back where it was (an undo), or the liked songs in a new order (keys)
  restore(item, i) {
    if (this.isLiked(item.key)) return;
    this.liked.splice(Math.min(i, this.liked.length), 0, item);
    put(LIKED, this.liked);
    for (const f of this.listeners) f(item.key);
  }
  likedItem(key) {
    return this.liked.find(x => x.key === key) ?? null;
  }

  // ---- playlists: made, named, deleted (and put back), a song in or out of one, their songs in a new order
  list(id) {
    return this.lists.find(l => l.id === id) ?? null;
  }
  saveLists() {
    put(LISTS, this.lists);
  }
  makeList(name) {
    const l = { id: `p${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`, name, items: [], at: Date.now() };
    this.lists.push(l);
    this.saveLists();
    return l;
  }
  renameList(id, name) {
    const l = this.list(id);
    if (l && name) (l.name = name), this.saveLists();
  }
  // (the list and where it was, for an undo)
  dropList(id) {
    const i = this.lists.findIndex(l => l.id === id);
    if (i < 0) return null;
    const [l] = this.lists.splice(i, 1);
    this.saveLists();
    return { l, i };
  }
  putList(l, i) {
    if (!this.list(l.id)) this.lists.splice(Math.min(i, this.lists.length), 0, l), this.saveLists();
  }
  inList(id, key) {
    return !!this.list(id)?.items.some(x => x.key === key);
  }
  // a song into a playlist at its end, or (an undo) the item taken out put back at `i`; or out of it (where it was)
  addTo(id, e, i) {
    const l = this.list(id);
    if (!l || l.items.some(x => x.key === e.key)) return;
    if (i === undefined) l.items.push(itemOf(e));
    else l.items.splice(Math.min(i, l.items.length), 0, e);
    this.saveLists();
  }
  takeFrom(id, key) {
    const l = this.list(id),
      i = l ? l.items.findIndex(x => x.key === key) : -1;
    if (i < 0) return null;
    const [item] = l.items.splice(i, 1);
    this.saveLists();
    return { item, i };
  }
  orderList(id, keys) {
    const l = this.list(id);
    if (!l) return;
    const at = new Map(keys.map((k, i) => [k, i]));
    l.items.sort((a, b) => (at.get(a.key) ?? 1e9) - (at.get(b.key) ?? 1e9));
    this.saveLists();
  }
  cover(key) {
    return this.covers[key] ?? null;
  }
  setCover(key, url) {
    if (!url) return;
    this.covers[key] = url;
    put(COVERS, this.covers);
  }
}
