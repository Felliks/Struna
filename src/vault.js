// The player's own songs, kept on the device (IndexedDB) so the map can play them again: the file's bytes by its key.
// Nothing leaves the browser.
const DB = 'sim.vault',
  STORE = 'songs';
const open = () =>
  new Promise((res, rej) => {
    const q = indexedDB.open(DB, 1);
    q.onupgradeneeded = () => q.result.createObjectStore(STORE);
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
  });
async function tx(mode, f) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode),
      q = f(t.objectStore(STORE));
    t.oncomplete = () => res(q?.result);
    t.onerror = () => rej(t.error);
  });
}
export const vaultPut = (key, bytes, name) => tx('readwrite', s => s.put({ bytes, name }, key)).catch(() => null);
export const vaultGet = key => tx('readonly', s => s.get(key)).catch(() => null);
// a song let go from the device (the songs screen: deleted by the player, after the moment to undo it)
export const vaultDel = key => tx('readwrite', s => s.delete(key)).catch(() => null);
// every song kept: its key and file name (the list of the player's own songs, whether or not a run of it was finished)
export const vaultList = () =>
  tx('readonly', s => s.getAllKeys())
    .then(keys => (keys ?? []).map(k => ({ key: String(k), name: String(k).replace(/^file:/, '').replace(/:\d+$/, '') })))
    .catch(() => []);
