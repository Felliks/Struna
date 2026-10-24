// The looks of the places (places.js has what they are): each draws its own sky piece (optional), background,
// running surface, all playing the song.
import city, { LANDMARKS as cityMarks } from './city.js';
import synth, { LANDMARKS as synthMarks } from './synth.js';
import forest, { LANDMARKS as forestMarks } from './forest.js';
import desert, { LANDMARKS as desertMarks } from './desert.js';
import station, { LANDMARKS as stationMarks } from './station.js';
import factory, { LANDMARKS as factoryMarks } from './factory.js';
import rave, { LANDMARKS as raveMarks } from './rave.js';
import volcano, { LANDMARKS as volcanoMarks } from './volcano.js';
import ocean, { LANDMARKS as oceanMarks } from './ocean.js';
import arctic, { LANDMARKS as arcticMarks } from './arctic.js';

import circuit, { LANDMARKS as circuitMarks } from './circuit.js';

import tokyo, { LANDMARKS as tokyoMarks } from './tokyo.js';

import graveyard, { LANDMARKS as graveyardMarks } from './graveyard.js';

import arena, { LANDMARKS as arenaMarks } from './arena.js';

import casino, { LANDMARKS as casinoMarks } from './casino.js';

import castle, { LANDMARKS as castleMarks } from './castle.js';

import skies, { LANDMARKS as skiesMarks } from './skies.js';

import bazaar, { LANDMARKS as bazaarMarks } from './bazaar.js';

import kowloon, { LANDMARKS as kowloonMarks } from './kowloon.js';

import moon, { LANDMARKS as moonMarks } from './moon.js';

import mall, { LANDMARKS as mallMarks } from './mall.js';

import wasteland, { LANDMARKS as wastelandMarks } from './wasteland.js';

import blacksnow, { LANDMARKS as blacksnowMarks } from './blacksnow.js';

import holyrave, { LANDMARKS as holyraveMarks } from './holyrave.js';

import apocradio, { LANDMARKS as apocradioMarks } from './apocradio.js';

import anthill, { LANDMARKS as anthillMarks } from './anthill.js';

import fujisan, { LANDMARKS as fujisanMarks } from './fujisan.js';

import lastman, { LANDMARKS as lastmanMarks } from './lastman.js';

import compost, { LANDMARKS as compostMarks } from './compost.js';

import crocsky, { LANDMARKS as crocskyMarks } from './crocsky.js';

export const LOOKS = { city, synth, forest, desert, station, factory, rave, volcano, ocean, arctic, circuit, tokyo, graveyard, arena, casino, castle, skies, bazaar, kowloon, moon, mall, wasteland, blacksnow, holyrave, apocradio, anthill, fujisan, lastman, compost, crocsky };

// every place's landmarks by name, so a song's world can borrow another place's (mix.js)
export const MARKS = { city: cityMarks, synth: synthMarks, forest: forestMarks, desert: desertMarks, station: stationMarks, factory: factoryMarks, rave: raveMarks, volcano: volcanoMarks, ocean: oceanMarks, arctic: arcticMarks, circuit: circuitMarks, tokyo: tokyoMarks, graveyard: graveyardMarks, arena: arenaMarks, casino: casinoMarks, castle: castleMarks, skies: skiesMarks, bazaar: bazaarMarks, kowloon: kowloonMarks, moon: moonMarks, mall: mallMarks, wasteland: wastelandMarks, blacksnow: blacksnowMarks, holyrave: holyraveMarks, apocradio: apocradioMarks, anthill: anthillMarks, fujisan: fujisanMarks, lastman: lastmanMarks, compost: compostMarks, crocsky: crocskyMarks };
