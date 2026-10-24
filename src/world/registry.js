// The pack: every part a song's world can be put together from, by slot. A part is one hand-made piece of a world:
//   sky     a piece of the sky (a sun, a ringed planet, an aurora): draw(f), after the sky's gradient
//   far     the far rows of the background (hills, a skyline): draw(f)
//   near    the near rows of the background (pines, rooftops): draw(f)
//   ground  the running surface: draw(f, a, b, y) (a place's ground: render/places/*)
//   mark    a landmark far off, repeated now and then along the way: draw(f)
//   weather what hangs in the air: back(f) behind the world (optional), front(f, k) over it (k: how much, 0..1)
//   performer how the singer's hologram dancing far off in the sky is drawn: draw(f, p) (layers/performer.js has p)
//   clone   how the clones are dressed: draw(f, p) over each clone's body (layers/clones.js has p)
// Every part has an id (unique in its slot), its media ('air' | 'space' | 'water': where it can be), tags (what kind of
// thing it is: affinity.js reads them) and optionally a mood [arousal, valence, hardness] (the songs it suits best).
// A part is added by registering it (parts/*, places.js): nothing else changes, and it joins every world it suits.
export const SLOTS = ['sky', 'far', 'near', 'ground', 'mark', 'weather', 'performer', 'clone'];
export const MEDIA = ['air', 'space', 'water'];

const PARTS = new Map(SLOTS.map(s => [s, new Map()]));

export function registerPart(part) {
  const { id, slot, media } = part;
  if (!PARTS.has(slot)) throw new Error(`part ${id}: no slot ${slot}`);
  if (!media?.length || !media.every(m => MEDIA.includes(m))) throw new Error(`part ${id}: media ${media}`);
  if (PARTS.get(slot).has(id)) throw new Error(`part ${slot}:${id} registered twice`);
  if (slot === 'weather' ? !part.front && !part.back : !part.draw) throw new Error(`part ${slot}:${id}: nothing to draw`);
  const kept = { tags: [], ...part };
  for (const k of ['draw', 'front', 'back']) if (part[k]) kept[k] = guarded(`${slot}:${id}`, part[k]);
  PARTS.get(slot).set(id, kept);
}
// a part's drawing, in a canvas state of its own, and if it ever throws, left out from then on (logged once): one
// broken part never costs the frame
function guarded(name, fn) {
  let broken = false;
  return (f, ...a) => {
    if (broken) return;
    f.g.save();
    try {
      return fn(f, ...a);
    } catch (e) {
      broken = true;
      console.warn(`world part ${name} left out:`, e);
    } finally {
      f.g.restore();
    }
  };
}
// the parts of a slot, in the order they were registered (so a world is the same on every device)
export const partsOf = slot => [...PARTS.get(slot).values()];
export const partOf = (slot, id) => PARTS.get(slot).get(id) ?? null;
