// The songs screen's menus and its undo, the way a phone's and a computer's apps show them: a sheet from the bottom on
// a phone (its handle dragged down, a tap beside it or Escape closes it), a small menu by the button or the pointer on
// a computer (the arrows go through it, Escape closes it); and a line at the bottom after a song is removed, with an
// undo for a few seconds (what was removed only let go for good when it goes).
const isPhone = () => matchMedia('(max-width: 640px), (pointer: coarse)').matches;
let shown = null;

// the menu open now, if any (Escape on the songs screen closes it first: select.js)
export const menuOpen = () => !!shown;
export function closeMenu() {
  if (!shown) return;
  const { el, bg, back } = shown;
  shown = null;
  el.classList.remove('in');
  bg.classList.remove('in');
  setTimeout(() => (el.remove(), bg.remove()), 220);
  back?.focus?.({ preventScroll: true });
}
// a menu: `fill(el)` puts what is in it (buttons in it are gone through by the arrows); by `anchor` (an element) or at
// x, y (the pointer) on a computer, a sheet on a phone
export function openMenu({ anchor, x, y, fill, cls = '' }) {
  closeMenu();
  const phone = isPhone(),
    bg = document.createElement('div'),
    el = document.createElement('div');
  bg.className = `mbg${phone ? ' phone' : ''}`;
  el.className = `msheet ${phone ? 'phone' : 'pop'} ${cls}`;
  el.setAttribute('role', 'menu');
  el.tabIndex = -1;
  if (phone) el.innerHTML = '<i class="grab" aria-hidden="true"></i>';
  fill(el);
  document.body.append(bg, el);
  shown = { el, bg, back: document.activeElement };
  bg.onpointerdown = ev => (ev.preventDefault(), closeMenu());
  if (!phone) {
    // (beside its button, or where the pointer was; inside the screen either way)
    const a = anchor?.getBoundingClientRect?.(),
      w = el.offsetWidth,
      h = el.offsetHeight,
      px = a ? a.right - w : x,
      py = a ? (a.bottom + h + 8 < innerHeight ? a.bottom + 6 : a.top - h - 6) : y;
    el.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, px))}px`;
    el.style.top = `${Math.max(8, Math.min(innerHeight - h - 8, py))}px`;
  } else grabbable(el);
  requestAnimationFrame(() => (el.classList.add('in'), bg.classList.add('in')));
  (el.querySelector('button:not(:disabled)') ?? el).focus({ preventScroll: true });
  el.addEventListener('keydown', ev => {
    const all = [...el.querySelectorAll('button:not(:disabled), input')],
      i = all.indexOf(document.activeElement);
    if (ev.key === 'Escape') ev.stopPropagation(), ev.preventDefault(), closeMenu();
    else if ((ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && document.activeElement?.tagName !== 'INPUT') {
      ev.preventDefault();
      all[(i + (ev.key === 'ArrowDown' ? 1 : all.length - 1)) % all.length]?.focus();
    }
  });
  return el;
}
// (a phone's sheet pulled down by its top: let go far enough down, it closes; else it springs back)
function grabbable(el) {
  let y0 = null,
    dy = 0;
  el.addEventListener('pointerdown', ev => {
    if (ev.target.closest('button, input, a') || el.scrollTop > 0) return;
    y0 = ev.clientY;
    dy = 0;
    el.classList.add('held');
  });
  el.addEventListener('pointermove', ev => {
    if (y0 === null) return;
    dy = Math.max(0, ev.clientY - y0);
    el.style.transform = `translateY(${dy}px)`;
  });
  const up = () => {
    if (y0 === null) return;
    y0 = null;
    el.classList.remove('held');
    el.style.transform = '';
    if (dy > 70) closeMenu();
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
}

// ---- the undo: `text` said, `back()` if the player takes it back, `done()` once the moment has passed
let pending = null;
export function undoable(text, back, done = () => {}) {
  // (a second removal lets the first go for good)
  settle();
  let el = document.querySelector('#undo');
  if (!el) {
    el = document.createElement('div');
    el.id = 'undo';
    el.className = 'undo';
    el.setAttribute('role', 'status');
    el.innerHTML = '<span class="ut"></span><button class="ub"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg><span></span></button><i class="ubar"></i>';
    document.body.append(el);
  }
  el.querySelector('.ut').textContent = text;
  el.querySelector('.ub span').textContent = undoable.word?.() ?? 'undo';
  const p = (pending = { done, timer: setTimeout(settle, 5000) });
  el.querySelector('.ub').onclick = () => {
    if (pending !== p) return;
    clearTimeout(p.timer);
    pending = null;
    hide(el);
    back();
  };
  el.classList.remove('in');
  // (its bar shrinks over the seconds left: started afresh)
  void el.offsetWidth;
  el.classList.add('in');
}
function hide(el = document.querySelector('#undo')) {
  el?.classList.remove('in');
}
// what is waiting to be let go, let go now (another removal, the page hidden)
export function settle() {
  if (!pending) return;
  const p = pending;
  pending = null;
  clearTimeout(p.timer);
  hide();
  p.done();
}
addEventListener('pagehide', settle);
