// The language pickers (one in the songs screen's sheet, one in the pause, one in the settings): every language by its
// own name, and 'auto' (the browser's); a pick is kept and loaded at once (i18n.js), and every picker on the page marks
// it, as does the globe that opens the menu's sheet (its current code on it).
import { LANGS, LANG, langChoice, onLangChange, setLang, tr } from '../i18n.js';

const pickers = new Set();
// the choice marked on every picker and the globe's code shown
function mark() {
  const choice = langChoice();
  for (const box of pickers) for (const b of box.children) b.classList.toggle('on', b.dataset.v === choice);
  const auto = box => box.querySelector('[data-v="auto"]');
  for (const box of pickers) if (auto(box)) auto(box).textContent = tr('auto');
  for (const el of document.querySelectorAll('.langbtn span')) el.textContent = LANG.toUpperCase();
}
onLangChange(mark);

// a picker built in `box`; `picked()` called after the language has changed
export function languagePicker(box, picked) {
  box.replaceChildren(
    ...[['auto', tr('auto')], ...LANGS].map(([v, name]) => {
      const b = document.createElement('button');
      b.dataset.v = v;
      b.textContent = name;
      // (each name in its own language, whatever the page's)
      if (v !== 'auto') b.lang = v;
      b.onclick = async () => {
        await setLang(v);
        picked?.(v);
      };
      return b;
    }),
  );
  pickers.add(box);
  mark();
}
