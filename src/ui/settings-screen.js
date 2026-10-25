// The settings screen: volumes, effects strength, difficulty, the language and the audio offset, applied as they change.
import { tr } from '../i18n.js';
import { languagePicker } from './language.js';

const $ = s => document.querySelector(s);

// apply the settings to what they steer
export function applySettings(S, { song, sfx, renderer }) {
  song.volume = S.get('music');
  sfx.volume = S.get('sfx');
  renderer.effects = S.get('effects');
  renderer.plain = !!S.get('plain');
  song.setCalib(S.get('calib'));
}

export function bindSettings(S, targets, onDone, onLang) {
  const sliders = { '#smusic': 'music', '#ssfx': 'sfx', '#seffects': 'effects' },
    offset = () => ($('#calib').textContent = tr('{ms} ms', { ms: S.get('calib') })),
    diff = () => document.querySelectorAll('#sdiff button').forEach(b => b.classList.toggle('on', b.dataset.v === S.get('difficulty'))),
    ctl = () => {
      document.querySelectorAll('#sctl button').forEach(b => b.classList.toggle('on', b.dataset.v === S.get('controls')));
      // (the buttons' layout, once they are the controls)
      $('#spads').hidden = S.get('controls') !== 'buttons';
    },
    hints = () => document.querySelectorAll('#shints button').forEach(b => b.classList.toggle('on', b.dataset.v === S.get('hints')));
  document.querySelectorAll('#shints button').forEach(
    b =>
      (b.onclick = () => {
        S.set('hints', b.dataset.v);
        hints();
      }),
  );
  document.querySelectorAll('#sctl button').forEach(
    b =>
      (b.onclick = () => {
        S.set('controls', b.dataset.v);
        S.set('ctlPicked', true);
        ctl();
      }),
  );
  $('#seasy').onchange = e => S.set('easyChords', e.target.checked);
  $('#splain').onchange = e => {
    S.set('plain', e.target.checked);
    applySettings(S, targets);
  };
  // (it used to be on or off)
  const buzz = () => document.querySelectorAll('#shaptics button').forEach(b => b.classList.toggle('on', b.dataset.v === ({ true: 'full', false: 'off' }[S.get('haptics')] ?? S.get('haptics'))));
  document.querySelectorAll('#shaptics button').forEach(
    b =>
      (b.onclick = () => {
        S.set('haptics', b.dataset.v);
        buzz();
      }),
  );
  for (const [id, key] of Object.entries(sliders))
    $(id).oninput = e => {
      S.set(key, +e.target.value);
      applySettings(S, targets);
    };
  document.querySelectorAll('#sdiff button').forEach(
    b =>
      (b.onclick = () => {
        S.set('difficulty', b.dataset.v);
        diff();
      }),
  );
  for (const [id, d] of [
    ['#cminus', -10],
    ['#cplus', 10],
  ])
    $(id).onclick = () => {
      S.set('calib', S.get('calib') + d);
      applySettings(S, targets);
      offset();
    };
  // (Bluetooth headphones: the sound comes about 170 ms late (AirPods ~168 ms); the calibration screen measures it exactly)
  $('#cbt').onclick = () => {
    S.set('calib', 170);
    applySettings(S, targets);
    offset();
  };
  languagePicker(document.querySelector('#slang'), () => onLang?.());
  $('#settingsok').onclick = onDone;
  // (refresh the controls whenever the screen opens)
  return () => {
    for (const [id, key] of Object.entries(sliders)) $(id).value = S.get(key);
    diff();
    offset();
    ctl();
    hints();
    $('#seasy').checked = S.get('easyChords');
    $('#splain').checked = !!S.get('plain');
    buzz();
  };
}
