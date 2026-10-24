// The calibration screen: the metronome plays, the player taps along (finger, mouse or space), the eyes flash on each
// tap, and the median offset is saved.
import { Calibrator } from '../calibrate.js';
import { tr } from '../i18n.js';

const $ = s => document.querySelector(s);

export function bindCalibration(S, song, applied, onBack) {
  let cal = null,
    timer = 0;
  const status = t => ($('#cstatus').textContent = t),
    tap = e => {
      if (!cal) return;
      if (e.type === 'keydown' && e.code !== 'Space') return;
      // (the screen's buttons are not taps: back, start again)
      if (e.type === 'pointerdown' && e.target?.closest?.('button')) return;
      e.preventDefault();
      const n = cal.tap(e.timeStamp);
      $('#ceyes').classList.add('flash');
      setTimeout(() => $('#ceyes').classList.remove('flash'), 80);
      status(tr('{n} taps', { n }));
    },
    stop = () => {
      cancelAnimationFrame(timer);
      removeEventListener('keydown', tap);
      $('#calibrate').removeEventListener('pointerdown', tap);
    };
  $('#cstart').onclick = () => {
    stop();
    cal = new Calibrator(song);
    cal.start();
    status(tr('tap on every click…'));
    addEventListener('keydown', tap);
    $('#calibrate').addEventListener('pointerdown', tap);
    const wait = () => {
      if (!cal.done) return (timer = requestAnimationFrame(wait));
      stop();
      const ms = cal.result;
      if (ms === null) return status(tr('not enough taps on the clicks: try again'));
      S.set('calib', ms);
      applied();
      status(tr('audio offset: {ms} ms (saved)', { ms }));
      cal = null;
    };
    timer = requestAnimationFrame(wait);
  };
  $('#cback').onclick = () => {
    stop();
    cal = null;
    onBack();
  };
  return () => status(tr('ready'));
}
