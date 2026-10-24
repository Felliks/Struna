// A list of songs put in the player's own order, by hand, the way a music app lets them (Spotify, Apple Music):
//   a mouse   drags a row by its grip (shown on hover or focus), the others sliding aside to make its place, the list
//             scrolled when it is held near an edge; a right click opens the row's menu;
//   a finger  holds a row a moment (it lifts, a tick of the phone's buzz) and drags it, or lets go to open its menu;
//             a quick swipe up or down still scrolls, a tap still picks; a swipe to the left shows the row's remove,
//             swiped right across it removes it straight away (where the list allows);
//   the keys  are the songs screen's own (select.js: Alt or Ctrl with up or down).
// Only transforms move while dragging (the rows' places measured once at the start, a frame's work per move at most).
// `o`: sort() / remove(row) (whether the list allows them), move(from, to), menu(row, x, y), swipe(row) (removed by a
// swipe or its button), full() (whether a full swipe removes without the button: not a file deleted from the device).

// the songs of a list in a saved order (keys); a song not in it keeps its default place among the others
export function inOrder(list, saved, key = e => e.key) {
  if (!saved?.length) return list;
  const at = new Map(saved.map((k, i) => [k, i])),
    out = list.filter(e => at.has(key(e))).sort((a, b) => at.get(key(a)) - at.get(key(b)));
  list.forEach((e, i) => at.has(key(e)) || out.splice(Math.min(i, out.length), 0, e));
  return out;
}

const HOLD = 350,
  SLOP = 8,
  EDGE = 64,
  GAP = 4,
  REVEAL = 84;

export function sortable(list, o) {
  // the gesture under way: null, or { id, type, row, x0, y0, mode: 'wait' | 'grip' | 'lifted' | 'drag' | 'swipe' }
  let g = null,
    // (a click right after a drag, a lift or a swipe is not a pick)
    eat = false,
    // the row showing its remove (swiped open)
    open = null,
    raf = 0;
  const rows = () => [...list.querySelectorAll(':scope > .row')];

  function clear() {
    clearTimeout(g?.timer);
    cancelAnimationFrame(raf);
    raf = 0;
    g = null;
  }
  function close(row = open, now = false) {
    if (!row) return;
    row.classList.toggle('settle', !now);
    row.style.removeProperty('--sx');
    row.classList.remove('open', 'swiping', 'far');
    if (open === row) open = null;
    // (its remove taken away once the row has slid back over it)
    setTimeout(() => row.classList.contains('open') || row.classList.contains('swiping') || row.querySelector(':scope > .swipedel')?.remove(), now ? 0 : 220);
  }
  // (the remove behind a row, shown as it is swiped)
  function del(row) {
    let b = row.querySelector(':scope > .swipedel');
    if (!b) {
      b = document.createElement('button');
      b.className = 'swipedel';
      b.setAttribute('aria-label', o.label?.() ?? 'remove');
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/></svg>';
      b.onclick = ev => {
        ev.stopPropagation();
        o.swipe(row);
      };
      row.append(b);
    }
    return b;
  }

  // ---- the drag: the rows' places measured, the one held moved by the pointer, the others aside to make its place
  function begin() {
    const all = rows(),
      from = all.indexOf(g.row);
    if (from < 0) return clear();
    Object.assign(g, { mode: 'drag', all, from, to: from, tops: all.map(r => r.offsetTop), hs: all.map(r => r.offsetHeight), s0: list.scrollTop, y: g.y ?? g.y0, shift: all.map(() => 0) });
    g.h = g.hs[from] + GAP;
    // (the place it would land, outlined: where the others made room)
    g.slot = document.createElement('i');
    g.slot.className = 'slot';
    Object.assign(g.slot.style, { top: `${g.tops[from]}px`, height: `${g.hs[from]}px` });
    list.append(g.slot);
    list.classList.add('sorting');
    g.row.classList.add('dragging');
    g.row.setAttribute('aria-grabbed', 'true');
    for (const r of all) if (r !== g.row) r.classList.add('make');
    tick();
  }
  function tick() {
    if (g?.mode !== 'drag') return;
    raf = requestAnimationFrame(tick);
    // (held near the list's top or bottom: the list scrolled, faster the nearer)
    const r = list.getBoundingClientRect(),
      play = document.querySelector('#stage .go')?.getBoundingClientRect(),
      bottom = play && play.top > r.top + 120 && play.top < r.bottom ? play.top : r.bottom,
      up = r.top + EDGE - g.y,
      down = g.y - (bottom - EDGE);
    if (up > 0) list.scrollTop -= Math.min(18, up / 3);
    else if (down > 0) list.scrollTop += Math.min(18, down / 3);
    const dy = g.y - g.y0 + list.scrollTop - g.s0,
      mid = g.tops[g.from] + g.hs[g.from] / 2 + dy;
    let to = g.from;
    for (let i = g.from + 1; i < g.all.length && mid > g.tops[i] + g.hs[i] / 2; i++) to = i;
    for (let i = g.from - 1; i >= 0 && mid < g.tops[i] + g.hs[i] / 2; i--) to = i;
    g.row.style.transform = `translateY(${dy}px)`;
    if (to === g.to) return;
    g.to = to;
    g.slot.style.transform = `translateY(${landing(g)}px)`;
    g.all.forEach((row, i) => {
      const s = i > g.from && i <= to ? -g.h : i < g.from && i >= to ? g.h : 0;
      if (s !== g.shift[i]) (g.shift[i] = s), (row.style.transform = s ? `translateY(${s}px)` : '');
    });
  }
  // (how far from its own place the row held lands)
  const landing = ({ from, to, tops, hs }) => (to > from ? tops[to] + hs[to] - hs[from] - tops[from] : to < from ? tops[to] - tops[from] : 0);
  function drop() {
    const { row, all, from, to, slot } = g,
      at = landing(g);
    clear();
    // (the row set down in its place, then the list made that order for real: the rows moved, no transforms left)
    row.classList.add('landing');
    row.style.transform = `translateY(${at}px)`;
    setTimeout(() => {
      list.classList.add('calm');
      list.classList.remove('sorting');
      slot.remove();
      for (const r of all) r.classList.remove('make', 'dragging', 'landing'), (r.style.transform = '');
      row.removeAttribute('aria-grabbed');
      if (to !== from) {
        const ref = all[to];
        list.insertBefore(row, to > from ? ref.nextSibling : ref);
        o.move(from, to);
      }
    }, 170);
  }

  // ---- the pointer
  list.addEventListener('pointerdown', ev => {
    const row = ev.target.closest('.row');
    eat = false;
    if (open && open !== row) close();
    if (!row || g || ev.button > 0) return;
    const grip = ev.target.closest('.grip');
    // (a finger may start a hold or a swipe on the row's own buttons too: a tap on them is still theirs)
    if (ev.target.closest(ev.pointerType === 'touch' ? 'a, input, .swipedel' : 'button:not(.grip), a, input')) return;
    g = { id: ev.pointerId, type: ev.pointerType, row, x0: ev.clientX, y0: ev.clientY, x: ev.clientX, y: ev.clientY, mode: 'wait' };
    if (ev.pointerType !== 'touch') {
      if (!grip || !o.sort()) return clear();
      // (the grip held: no text picked, the pointer kept by the row wherever it goes)
      ev.preventDefault();
      g.mode = 'grip';
      row.setPointerCapture?.(ev.pointerId);
      return;
    }
    // (a finger held still: the row lifts; to drag it where the list has an order of its own, else its menu at once)
    g.timer = setTimeout(() => {
      if (g?.mode !== 'wait') return;
      navigator.vibrate?.(12);
      eat = true;
      if (!o.sort()) {
        const { x, y } = g;
        clear();
        return o.menu(row, x, y);
      }
      g.mode = 'lifted';
      row.classList.add('lifted');
    }, HOLD);
  });
  list.addEventListener('pointermove', ev => {
    if (!g || ev.pointerId !== g.id) return;
    g.x = ev.clientX;
    g.y = ev.clientY;
    const dx = g.x - g.x0,
      dy = g.y - g.y0;
    if (g.mode === 'grip' && Math.abs(dy) > 3) begin();
    else if (g.mode === 'lifted' && Math.hypot(dx, dy) > SLOP) g.row.classList.remove('lifted'), begin();
    else if (g.mode === 'wait' && Math.hypot(dx, dy) > SLOP) {
      // (moved before the hold: sideways to the left is a swipe where the row can go, anything else the list's scroll)
      if (Math.abs(dx) > Math.abs(dy) * 1.4 && (dx < 0 || g.row === open) && o.remove(g.row)) {
        clearTimeout(g.timer);
        g.mode = 'swipe';
        g.base = g.row === open ? -REVEAL : 0;
        g.row.classList.add('swiping');
        g.row.classList.remove('settle');
        del(g.row);
      } else clear();
    }
    if (g?.mode === 'swipe') {
      const w = g.row.offsetWidth,
        sx = Math.min(0, Math.max(-w, g.base + dx));
      g.row.style.setProperty('--sx', `${sx}px`);
      g.row.classList.toggle('far', o.full(g.row) && sx < -w * 0.55);
    }
  });
  function up(ev) {
    if (!g || ev.pointerId !== g.id) return;
    const { mode, row, x, y } = g;
    if (mode === 'drag') return (eat = true), drop();
    clear();
    if (mode === 'lifted') {
      row.classList.remove('lifted');
      // (held and let go where it was: its menu, as a phone's apps do)
      if (ev.type === 'pointerup') o.menu(row, x, y);
    } else if (mode === 'swipe') {
      eat = true;
      const sx = parseFloat(row.style.getPropertyValue('--sx')) || 0;
      row.classList.remove('swiping', 'far');
      row.classList.add('settle');
      if (o.full(row) && sx < -row.offsetWidth * 0.55 && ev.type === 'pointerup') return o.swipe(row);
      if (sx < -REVEAL / 2) {
        row.style.setProperty('--sx', `${-REVEAL}px`);
        row.classList.add('open');
        open = row;
      } else close(row);
    }
  }
  list.addEventListener('pointerup', up);
  list.addEventListener('pointercancel', up);
  // (a finger that lifted a row or swipes one: the page does not scroll under it)
  list.addEventListener(
    'touchmove',
    ev => {
      if (g && g.mode !== 'wait' && ev.cancelable) ev.preventDefault();
    },
    { passive: false },
  );
  list.addEventListener('scroll', () => open && !g && close(), { passive: true });
  list.addEventListener(
    'click',
    ev => {
      if (eat) {
        eat = false;
        ev.stopPropagation();
        ev.preventDefault();
        return;
      }
      if (open && !ev.target.closest('.swipedel')) {
        ev.stopPropagation();
        close();
      }
    },
    true,
  );
  list.addEventListener('contextmenu', ev => {
    const row = ev.target.closest('.row');
    if (!row) return;
    ev.preventDefault();
    // (a finger's long press is the lift above; a right click opens the menu where it was)
    if (g?.type === 'touch' || ev.pointerType === 'touch' || eat) return;
    o.menu(row, ev.clientX, ev.clientY);
  });
  return {
    // (the list drawn afresh: no gesture or swiped row is left over)
    reset() {
      g?.slot?.remove();
      clear();
      open = null;
      list.classList.remove('sorting');
    },
    close: () => close(open, true),
  };
}
