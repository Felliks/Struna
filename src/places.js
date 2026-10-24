// The places a song can be (the look of each is in render/places/), and the obstacles that belong there, by kind. A
// new place is an entry here, a line in FOR_STYLE and a drawing module in render/places/.
export const PLACES = {
  city: { skins: { jump: ['ac', 'vent', 'crate'], slide: ['scaffold', 'sign', 'shutter'], smash: ['glass', 'bricks'], grab: ['crane'], hazard: ['citysaw', 'razor', 'cityzap', 'cityneon', 'cityglass', 'cityfan'] } },
  synth: { skins: { jump: ['cone', 'block', 'gate'], slide: ['laser', 'arch', 'ring'], smash: ['holo', 'neonwall'], grab: ['neonbar'], hazard: ['synthzap', 'prism', 'synthsaw', 'glitchcube', 'synthlaser', 'synthorb'] } },
  forest: { skins: { jump: ['log', 'rock', 'stump'], slide: ['branch', 'beehive', 'vinearch'], smash: ['logwall', 'thorns'], grab: ['vine'], hazard: ['thornball', 'thornlog', 'stingers', 'hornets', 'vineknot', 'beartrap'] } },
  desert: { skins: { jump: ['cactus', 'boulder', 'drum'], slide: ['woodsign', 'cloth', 'bones'], smash: ['adobe', 'fence'], grab: ['rope'], hazard: ['cactusball', 'bonespikes', 'desertsaw', 'scorpion', 'tumbleweed', 'skulltrap'] } },
  station: { skins: { jump: ['cargo', 'canister', 'console'], slide: ['drone', 'beam', 'duct'], smash: ['field', 'airlock'], grab: ['handle'], hazard: ['spacemine', 'stationzap', 'stationsaw', 'satellite', 'plasmaorb', 'stationlaser'] } },
  rave: { skins: { jump: ['speaker', 'flightcase', 'monitor'], slide: ['truss', 'laserbar', 'banner'], smash: ['ledpanel', 'booth'], grab: ['trussbar'], hazard: ['ravezap', 'discosaw', 'ravespikes', 'discoball', 'speakerspit', 'ravelaser'] } },
  volcano: { skins: { jump: ['lavarock', 'skulls', 'spike'], slide: ['brazier', 'jaw', 'embers'], smash: ['obsidian', 'bonegate'], grab: ['chain'], hazard: ['lavabomb', 'obsidianshard', 'magmaspikes', 'firejet', 'lavablob', 'magmaorb'] } },
  ocean: { skins: { jump: ['coral', 'anchor', 'chest'], slide: ['jelly', 'net', 'ribs'], smash: ['aquarium', 'barnacles'], grab: ['anchorchain'], hazard: ['seamine', 'urchin', 'coralspikes', 'jellystinger', 'angler', 'clamjaws'] } },
  arctic: { skins: { jump: ['iceblock', 'sled', 'fueldrum'], slide: ['icicles', 'frozenarch', 'cornice'], smash: ['icewall', 'snowwall'], grab: ['icerope'], hazard: ['iceshard', 'icespikes', 'arcticsaw', 'icefangs', 'frostflake', 'blizzard'] } },
  factory: { skins: { jump: ['toxic', 'gearbox', 'pallet'], slide: ['pipe', 'hook', 'saw'], smash: ['grating', 'boiler'], grab: ['chain'], hazard: ['factorysaw', 'factoryzap', 'factoryspikes', 'grapnel', 'grinder', 'crusher'] } },
  circuit: { skins: { jump: ['cpuChip', 'cpuCap', 'cpuSink'], slide: ['cpuRibbon', 'cpuFan', 'cpuBus'], smash: ['cpuWall', 'cpuRam'], grab: ['cpuJumper'], hazard: ['cpusaw', 'cpuzap', 'cpucube', 'cpugears', 'cpulaser', 'cpufan'] } },
  tokyo: { skins: { jump: ['tkVend', 'tkStone', 'tkBarrels'], slide: ['tkLanterns', 'tkNoren', 'tkSign'], smash: ['tkShoji', 'tkTiles'], grab: ['tkTorii'], hazard: ['tkneon', 'tksaw', 'tkspikes', 'tkpetals', 'tkzap', 'tkfan'] } },
  graveyard: { skins: { jump: ['gvTomb', 'gvPumpkin', 'gvCoffin'], slide: ['gvBough', 'gvWeb', 'gvGarland'], smash: ['gvGate', 'gvWall'], grab: ['gvBar'], hazard: ['gvChomp', 'gvFence', 'gvWisp', 'gvSpirit', 'gvScythe', 'gvBurr'] } },
  arena: { skins: { jump: ['arBag', 'arWedge', 'arCooler'], slide: ['arCam', 'arScarves', 'arRig'], smash: ['arScreen', 'arBarrier'], grab: ['arBar'], hazard: ['arZap', 'arDrone', 'arShatter', 'arFan', 'arPyro', 'arStack'] } },
  casino: { skins: { jump: ['csSlot', 'csChips', 'csDice'], slide: ['csMarquee', 'csChandelier', 'csRoulette'], smash: ['csGlassdoor', 'csChipwall'], grab: ['csBar'], hazard: ['csChipsaw', 'csDicecube', 'csNeon', 'csZap', 'csWheel', 'csGlass'] } },
  castle: { skins: { jump: ['gtGargoyle', 'gtCoffin', 'gtCandelabra'], slide: ['gtPortcullis', 'gtChandelier', 'gtBanner'], smash: ['gtGlass', 'gtStonewall'], grab: ['gtChainbar'], hazard: ['gtMace', 'gtSpikes', 'gtBlade', 'gtTorch', 'gtChain', 'gtWisp'] } },
  skies: { skins: { jump: ['skCloud', 'skRock', 'skPropbox'], slide: ['skBalloon', 'skPennants', 'skGondola'], smash: ['skWindow', 'skColumn'], grab: ['skTrapeze'], hazard: ['skSaw', 'skStorm', 'skBolt', 'skMill', 'skWhirl', 'skHail'] } },
  bazaar: { skins: { jump: ['bzJar', 'bzCrates', 'bzDrum'], slide: ['bzLanterns', 'bzAwning', 'bzBoard'], smash: ['bzScreen', 'bzBricks'], grab: ['bzPole'], hazard: ['bzCleaver', 'bzCracker', 'bzLion', 'bzWok', 'bzNeon', 'bzSpikes'] } },
  kowloon: { skins: { jump: ['kwTank', 'kwGenerator', 'kwFoam'], slide: ['kwHoloSign', 'kwLaundry', 'kwWires'], smash: ['kwHoloPane', 'kwTileWall'], grab: ['kwPipeBar'], hazard: ['kwSaw', 'kwRazor', 'kwZap', 'kwNeon', 'kwFan', 'kwGlitch'] } },
  moon: { skins: { jump: ['moRock', 'moProbe', 'moO2'], slide: ['moArm', 'moSolar', 'moTube'], smash: ['moVisor', 'moSandbags'], grab: ['moBoom'], hazard: ['moMine', 'moSat', 'moOrb', 'moShards', 'moLaser', 'moDevil'] } },
  mall: { skins: { jump: ['mlBust', 'mlPlanter', 'mlBasin'], slide: ['mlNeon', 'mlBanner', 'mlBridge'], smash: ['mlPane', 'mlColumn'], grab: ['mlRail'], hazard: ['mlZap', 'mlNeonSign', 'mlShatter', 'mlFan', 'mlDisco', 'mlPrism'] } },
  wasteland: { skins: { jump: ['wsTyres', 'wsBarrel', 'wsEngine'], slide: ['wsSign', 'wsWing', 'wsChains'], smash: ['wsSheet', 'wsPlanks'], grab: ['wsGirder'], hazard: ['wsSaw', 'wsSpikes', 'wsHubmine', 'wsFlamer', 'wsHarpoon', 'wsGrinder'] } },
  blacksnow: { skins: { jump: ['bsKettle', 'bsTyre', 'bsBarrel'], slide: ['bsPipe', 'bsHook', 'bsLine'], smash: ['bsKafel', 'bsGate'], grab: ['bsPipeBar'], hazard: ['bsSaw', 'bsIcicle', 'bsCable', 'bsSpikes', 'bsFan', 'bsMazut'] } },
  holyrave: { skins: { jump: ['hrBassbin', 'hrLectern', 'hrCase'], slide: ['hrHalo', 'hrLaserArch', 'hrStrobebar'], smash: ['hrStained', 'hrEyewall'], grab: ['hrTrussHalo'], hazard: ['hrVinylSaw', 'hrStrobeZap', 'hrLaserFan', 'hrHaloSpin', 'hrBassShock', 'hrGlitch'] } },
  apocradio: { skins: { jump: ['rdBoombox', 'rdRadiola', 'rdDrum'], slide: ['rdWires', 'rdHorn', 'rdDial'], smash: ['rdTVwall', 'rdSheet'], grab: ['rdMast'], hazard: ['rdDishSaw', 'rdStatic', 'rdTesla', 'rdNeedle', 'rdSpark', 'rdFeedback'] } },
  anthill: { skins: { jump: ['ahGrain', 'ahBlock', 'ahSpool'], slide: ['ahBeam', 'ahArch', 'ahRoot'], smash: ['ahComb', 'ahClay'], grab: ['ahTwig'], hazard: ['ahJaws', 'ahSaw', 'ahNeedles', 'ahLaser', 'ahWings', 'ahResin'] } },
  fujisan: { skins: { jump: ['fjRock', 'fjBonsai', 'fjTaiko'], slide: ['fjBlossom', 'fjCloud', 'fjKoi'], smash: ['fjScreen', 'fjIce'], grab: ['fjPine'], hazard: ['fjPetalSaw', 'fjIcicles', 'fjBolt', 'fjSpikes', 'fjFan', 'fjLava'] } },
  lastman: { skins: { jump: ['lmChair', 'lmCar', 'lmTV'], slide: ['lmVines', 'lmBranch'], smash: ['lmWindow', 'lmWall'], grab: ['lmPipe'], hazard: ['lmSaw', 'lmThorns', 'lmSpore', 'lmBees', 'lmVine', 'lmGlass'] } },
  crocsky: { skins: { jump: ['crLog', 'crAgaric', 'crFrog'], slide: ['crScroll', 'crRoot', 'crVines'], smash: ['crReeds', 'crAquarium'], grab: ['crBranch'], hazard: ['crJaws', 'crThorns', 'crSpore', 'crHornets', 'crVine', 'crSaw'] } },
  compost: { skins: { jump: ['cmMushroom', 'cmCore', 'cmCan'], slide: ['cmWorm', 'cmLeaf', 'cmRoots'], smash: ['cmSoil', 'cmJar'], grab: ['cmStem'], hazard: ['cmTrap', 'cmThorns', 'cmSpore', 'cmBeetle', 'cmVine', 'cmSaw'] } },
};
// what each thing to kick through is made of: how the cursor makes it (glass and metal are carried in; masonry, wood
// and plants are painted in with the brush), the sound it breaks with and the colour of its pieces
export const MATERIAL = {
  glass: 'glass',
  holo: 'glass',
  field: 'glass',
  grating: 'glass',
  airlock: 'metal',
  boiler: 'metal',
  bricks: 'stone',
  adobe: 'stone',
  neonwall: 'stone',
  logwall: 'wood',
  fence: 'wood',
  thorns: 'wood',
  ledpanel: 'glass',
  booth: 'glass',
  obsidian: 'stone',
  bonegate: 'wood',
  aquarium: 'glass',
  barnacles: 'stone',
  icewall: 'glass',
  snowwall: 'stone',
  cpuWall: 'glass',
  cpuRam: 'metal',
  tkShoji: 'wood',
  tkTiles: 'stone',
  gvGate: 'metal',
  gvWall: 'stone',
  arScreen: 'glass',
  arBarrier: 'metal',
  csGlassdoor: 'glass',
  csChipwall: 'stone',
  gtGlass: 'glass',
  gtStonewall: 'stone',
  skWindow: 'glass',
  skColumn: 'stone',
  bzScreen: 'wood',
  bzBricks: 'stone',
  kwHoloPane: 'glass',
  kwTileWall: 'stone',
  moVisor: 'glass',
  moSandbags: 'stone',
  mlPane: 'glass',
  mlColumn: 'stone',
  wsSheet: 'metal',
  wsPlanks: 'wood',
  bsKafel: 'stone',
  bsGate: 'glass',
  hrStained: 'glass',
  hrEyewall: 'glass',
  rdTVwall: 'glass',
  rdSheet: 'metal',
  ahComb: 'glass',
  ahClay: 'stone',
  fjScreen: 'wood',
  fjIce: 'glass',
  lmWindow: 'glass',
  lmWall: 'stone',
  cmSoil: 'stone',
  cmJar: 'glass',
  crReeds: 'wood',
  crAquarium: 'glass',
};
export const PAINTED = new Set(['stone', 'wood']);

// the place for a song: one for the whole song (a city song stays in the city; the place grows with the music, it is
// never swapped but once, midway, into its second), the one whose mood is nearest the song's: each place sits at a point
// of [arousal, valence, hardness] (profile.js), the song's seed choosing among the five nearest (a nearer one more
// likely), so songs of one mood spread over several places and every place turns up in a library of songs
export const MOOD = {
  city: [0.6, 0.4, 0.5], synth: [0.55, 0.7, 0.3], forest: [0.2, 0.5, 0.1], desert: [0.55, 0.7, 0.35], station: [0.3, 0.45, 0.15],
  factory: [0.85, 0.3, 0.9], rave: [0.85, 0.65, 0.6], volcano: [0.85, 0.2, 0.85], ocean: [0.3, 0.4, 0.15], arctic: [0.4, 0.6, 0.15],
  circuit: [0.75, 0.35, 0.7], tokyo: [0.5, 0.55, 0.35], kowloon: [0.7, 0.25, 0.6], moon: [0.35, 0.35, 0.25], casino: [0.75, 0.8, 0.4],
  castle: [0.55, 0.25, 0.45], mall: [0.45, 0.8, 0.15], wasteland: [0.8, 0.2, 0.8], skies: [0.5, 0.7, 0.3], bazaar: [0.6, 0.65, 0.3],
  graveyard: [0.5, 0.1, 0.5], arena: [0.8, 0.6, 0.5],
};
// the places of the artists' packs (world/artists.js), at their points of the same table: never a song's place by its
// mood alone (so no song's level moves as the packs grow), only an artist's own songs' (a frozen sea of black snow in
// black and white and one red, a rite of a rave on rings of stone adrift, a limbo between radio stations; an anthill
// as tall as a mountain built to a glowing plan, a dream of a sacred volcano over a sea of clouds, the empty Earth
// summer and bliss under a lettuce-green sky, a spring bursting out of ash and snow, a jungle delta under the sky a
// crocodile swallowed)
export const PACK_MOOD = {
  blacksnow: [0.5, 0.2, 0.55],
  holyrave: [0.85, 0.45, 0.7],
  apocradio: [0.75, 0.3, 0.75],
  anthill: [0.9, 0.35, 0.95],
  fujisan: [0.65, 0.65, 0.5],
  lastman: [0.35, 0.55, 0.45],
  compost: [0.45, 0.4, 0.15],
  crocsky: [0.7, 0.45, 0.6],
};
// the places nearest a profile's mood, nearest first (`but`: places left out)
// (the song's mood stretched over the range songs actually span (arousal 0.4..0.9, hardness 0.3..0.7: measured over
// the library), so the table's corners are reached and not only its middle)
const c01 = x => Math.max(0, Math.min(1, x));
export function nearest(P, table, but = []) {
  const at = [c01((P.arousal - 0.4) / 0.5), P.valence, c01((P.hardness - 0.3) / 0.4)];
  return Object.keys(table)
    .filter(k => !but.includes(k))
    .map(k => [k, Math.hypot(...table[k].map((v, i) => v - at[i]))])
    .sort((a, b) => a[1] - b[1])
    .map(e => e[0]);
}
// one of the first n of a list, the earlier ones likelier (weights n, n-1, ...)
export function weighted(list, n, r) {
  const m = Math.min(n, list.length),
    total = (m * (m + 1)) / 2;
  let x = r() * total;
  for (let i = 0; i < m; i++) if ((x -= m - i) < 0) return list[i];
  return list[0];
}
export function pickPlace(profile, r, but = []) {
  return weighted(nearest(profile, MOOD, but), 5, r);
}
