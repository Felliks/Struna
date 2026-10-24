// The world system: a pack of hand-made parts by slot (registry.js) and the rules a song's world is put together from
// them by (affinity.js, compose.js), drawn by render.js. The pack: the 22 places' parts (places.js) and parts of its
// own (parts/*; parts/atl: an artist's, world/artists.js), each registered once, here, in this order (the order a world's choices go through, so it is the same
// everywhere). A new part is a file in parts/ and a line here.
import './places.js';
import './parts/weather/basic.js';
import './parts/weather/extra.js';
import './parts/skies/pack1.js';
import './parts/marks/pack1.js';
import './parts/marks/pack2.js';
import './parts/performers/pack1.js';
import './parts/clones/pack1.js';
import './parts/atl/skies.js';
import './parts/atl/land.js';
import './parts/atl/weather.js';
import './parts/atl/performers.js';
import './parts/atl/clones.js';
import './parts/atl/favs.js';
import './parts/atl/angels.js';

export { composeWorld } from './compose.js';
export { drawWorldSky, drawWorldBack, groundOf } from './render.js';
export { partOf, partsOf } from './registry.js';
