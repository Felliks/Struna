// The player's settings, kept on the device: the music's and the sounds' volumes, how strong the effects are (shake,
// zoom, strobes; 0 is calm), the difficulty, the audio offset (calibrate.js), whether a song picked on the songs screen
// is heard (`preview`), the touch controls ('auto': one finger held upright, two thumbs held
// sideways; 'swipe'; 'zones'; 'buttons': input.js, ui/pads.js; `ctlPicked` once the player has chosen them), easy chords (a touch gesture giving half a chord gives the whole) and the hints
// of what to press ('auto': a known move's note drawn smaller; 'always': every note full; 'off': none; render/layers/hints.js).
const KEY = 'sim.settings',
  DEFAULTS = { music: 1, sfx: 0.8, effects: 0.6, difficulty: 'easy', calib: 0, preview: true, controls: 'auto', easyChords: true, haptics: 'full', hints: 'auto' };

export class Settings {
  constructor() {
    this.v = { ...DEFAULTS };
    try {
      Object.assign(this.v, JSON.parse(localStorage.getItem(KEY)) ?? {});
      // (the offset used to be kept on its own)
      const old = localStorage.getItem('sim.calib');
      if (old !== null && !localStorage.getItem(KEY)) this.v.calib = +old;
    } catch {}
  }
  get(k) {
    return this.v[k];
  }
  set(k, val) {
    this.v[k] = val;
    try {
      localStorage.setItem(KEY, JSON.stringify(this.v));
    } catch {}
  }
}
