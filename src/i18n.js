// The player's language: English (the source), or one of the languages the game is translated into, each a pack of
// its own (i18n-<code>.js, loaded only when it is picked): DICT, its words keyed by the English exactly as the code
// writes it; LINES, the two voices' lines (lines.js) by group in their order there; ADJ / NOUN / WORD (+ AFTER, JOIN),
// the parts of the names the game makes up (bosses, sectors). `tr()` gives an English source back in the player's
// language, `translateDom()` does the same for the page's own words (index.html), `trName()` for a made-up name. Only
// what is shown goes through here: what the logic keeps, hashes or stores stays English.

// the languages, each by its own name (as the pickers show them); English has no pack
export const LANGS = [
  ['en', 'English'],
  ['es', 'Español'],
  ['pt', 'Português'],
  ['de', 'Deutsch'],
  ['fr', 'Français'],
  ['it', 'Italiano'],
  ['pl', 'Polski'],
  ['uk', 'Українська'],
  ['ru', 'Русский'],
  ['tr', 'Türkçe'],
  ['ja', '日本語'],
  ['ko', '한국어'],
  ['zh', '中文'],
];
// (each loaded by its own literal path: a bundler or a reader sees every pack)
const PACKS = {
  es: () => import('./i18n-es.js'),
  pt: () => import('./i18n-pt.js'),
  de: () => import('./i18n-de.js'),
  fr: () => import('./i18n-fr.js'),
  it: () => import('./i18n-it.js'),
  pl: () => import('./i18n-pl.js'),
  uk: () => import('./i18n-uk.js'),
  ru: () => import('./i18n-ru.js'),
  tr: () => import('./i18n-tr.js'),
  ja: () => import('./i18n-ja.js'),
  ko: () => import('./i18n-ko.js'),
  zh: () => import('./i18n-zh.js'),
};

const KEY = 'sim.lang',
  storage = {
    get() {
      try {
        return localStorage.getItem(KEY);
      } catch {
        return null;
      }
    },
    set(v) {
      try {
        if (v === 'auto') localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, v);
      } catch {
        // (storage off: the choice holds for this session only)
      }
    },
  };
// the player's choice: ?lang= in the address, else what was picked, else 'auto' (the browser's language)
export function langChoice() {
  let q = null;
  try {
    q = new URLSearchParams(location.search).get('lang');
  } catch {
    // (no page: the tools run the modules under node)
  }
  return q ?? storage.get() ?? 'auto';
}
// the language a choice means: a code the game has, else English
function resolve(choice) {
  let code = choice;
  if (choice === 'auto') {
    try {
      code = navigator.language ?? 'en';
    } catch {
      code = 'en';
    }
  }
  code = String(code).slice(0, 2).toLowerCase();
  return code in PACKS ? code : 'en';
}

// the language now and its pack (live bindings: the modules that import them see a change)
export let LANG = 'en';
let PACK = null,
  DICT = null;
const listeners = new Set();
// call `f` after every change of language (the pickers mark the choice, screens that wrote words redraw them)
export const onLangChange = f => listeners.add(f);

async function apply(choice) {
  const code = resolve(choice),
    pack = code === 'en' ? null : await PACKS[code]();
  LANG = code;
  PACK = pack;
  DICT = pack?.DICT ?? null;
  try {
    document.documentElement.lang = code;
  } catch {
    // (no page)
  }
  translateDom();
  for (const f of listeners) f(code);
}
// the language the player chose (or the browser's), loaded: once, before anything is shown
export const initLang = () => apply(langChoice());
// a language picked: kept, loaded, the page's words put in it (the canvas reads it every frame)
export function setLang(choice) {
  storage.set(choice);
  return apply(choice);
}
// the lines of a group (lines.js) in the language now, in their order there; null in English or where there are none
export const linesOf = group => PACK?.LINES?.[group] ?? null;

const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
// the English source in the player's language, its {name}s filled from vars
export function tr(en, vars = {}) {
  return fill(DICT?.[en] ?? en, vars);
}

// a made-up name ("THE WOBBLING CURSOR", "SECTOR 3A2 · BURNING CACHE") in the player's language: each part's last word
// is its noun, and the other words agree with it (an adjective takes the noun's gender), before it or, in a language
// that puts them after (AFTER), after it
export function trName(s) {
  if (!PACK?.NOUN || !s) return s ?? '';
  const { ADJ, NOUN, WORD = {}, AFTER = false, JOIN = ' ' } = PACK;
  return String(s)
    .split(' · ')
    .map(part => {
      const w = part.replace(/^THE /, '').split(' '),
        noun = w.at(-1),
        gender = NOUN[noun]?.[1] ?? 0,
        words = w.map(x => NOUN[x]?.[0] ?? ADJ[x]?.[gender] ?? ADJ[x]?.[0] ?? WORD[x] ?? x);
      // (the adjectives after the noun: noun first; a code like 3A2 after SECTOR stays where it is)
      if (AFTER && NOUN[noun] && words.length > 1) words.unshift(words.pop());
      return words.join(JOIN);
    })
    .join(' · ');
}

// the page's own words: every text node and the attributes a player sees or hears, matched whole (trimmed), the
// whitespace round them kept; a node done is marked so a second pass leaves it
// (each translated text keeps its English, so a change of language can put it back or in another)
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'],
  source = new WeakMap();
export function translateDom(root = document) {
  if (typeof document === 'undefined') return;
  const walker = document.createTreeWalker(root.body ?? root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.parentElement?.closest('script, style')) continue;
    // (the words as one line: the page's source may wrap a sentence over lines, the key has it on one)
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(n.nodeValue),
      en = source.get(n) ?? m[2].replace(/\s+/g, ' ');
    // (a node never translated and with no translation now is not one of the page's words)
    if (!source.has(n) && !DICT?.[en]) continue;
    source.set(n, en);
    n.nodeValue = m[1] + (DICT?.[en] ?? en) + m[3];
  }
  for (const el of (root.body ?? root).querySelectorAll(ATTRS.map(a => `[${a}]`).join(','))) {
    for (const a of ATTRS) {
      const key = `i18n${a.replace(/-./g, x => x[1].toUpperCase())}`,
        en = el.dataset[key] ?? el.getAttribute(a)?.trim();
      if (!en || (!el.dataset[key] && !DICT?.[en])) continue;
      el.dataset[key] = en;
      el.setAttribute(a, DICT?.[en] ?? en);
    }
  }
  // (the canvas draws in the display fonts too: the glyphs of the language now loaded at once, not on the first frame
  // that needs them)
  const sample = Object.values(DICT ?? {})
    .slice(0, 40)
    .join('');
  for (const f of ['900 20px Unbounded', '800 20px Unbounded', '700 20px Unbounded', "700 20px 'JetBrains Mono'"])
    document.fonts?.load(f, sample || 'A').catch(() => {});
}
