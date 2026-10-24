// The buttons' layout editor (Rocket League Sideswipe's "control customization"): the buttons shown where they are, one
// dragged with a finger goes where the finger goes, the one picked last gets its size and opacity from two sliders,
// reset puts the way the phone is held back to the defaults. Each way the phone is held has its own layout (turn it
// over to set the other). Opened from the settings (over a sketch of where he runs and his ground are) or from the
// pause (over the run itself, held). Every change is kept at once (settings 'pads').
import { OPACITY, SIZE, wayOf } from './pads.js';
import { tr } from '../i18n.js';

const $ = s => document.querySelector(s);

export function padEditor(pads, S) {
  const box = $('#padedit'),
    size = $('#pesize'),
    op = $('#peop'),
    guide = $('#peguide');
  size.min = SIZE[0];
  size.max = SIZE[1];
  op.min = OPACITY[0];
  op.max = OPACITY[1];
  op.step = 0.05;
  let sel = 'jump',
    drag = null,
    after = null;
  // the layout of the way the phone is held now, as saved (each button a copy to change)
  const current = () => {
    const L = pads.layout(),
      out = {};
    for (const a of ['jump', 'slide', 'left', 'right']) out[a] = { ...L[a] };
    return { L, out };
  };
  const save = out => {
    const all = { ...(S.get('pads') ?? {}) };
    all[wayOf(innerWidth, innerHeight)] = out;
    S.set('pads', all);
    pads.place();
  };
  const pick = a => {
    sel = a;
    for (const [k, b] of Object.entries(pads.b)) b.classList.toggle('sel', k === a);
    const { L } = current();
    size.value = L[a].s;
    op.value = L[a].o;
  };
  const label = () =>
    ($('#peway').textContent = tr(wayOf(innerWidth, innerHeight) === 'portrait' ? 'held upright' : 'held sideways'));
  // (a sketch of the run behind them: his ground and him on it, about where the camera puts them, render/view.js)
  const sketch = () => {
    if (guide.hidden) return;
    const W = innerWidth,
      H = innerHeight,
      d = devicePixelRatio || 1,
      g = guide.getContext('2d'),
      up = W < H,
      gy = H * (up ? 0.7 : 0.6),
      hx = W * (up ? 0.14 : 0.25),
      u = Math.min(W, H) * (up ? 0.09 : 0.1);
    guide.width = W * d;
    guide.height = H * d;
    g.setTransform(d, 0, 0, d, 0, 0);
    g.clearRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.55)';
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(0, gy);
    g.lineTo(W, gy);
    // (him running: a head, a body, legs and arms mid-stride)
    g.moveTo(hx + u * 0.25, gy - u * 1.2);
    g.arc(hx + u * 0.1, gy - u * 1.2, u * 0.15, 0, Math.PI * 2);
    g.moveTo(hx + u * 0.05, gy - u * 1.05);
    g.lineTo(hx - u * 0.05, gy - u * 0.55);
    g.lineTo(hx + u * 0.3, gy - u * 0.25);
    g.lineTo(hx + u * 0.25, gy);
    g.moveTo(hx - u * 0.05, gy - u * 0.55);
    g.lineTo(hx - u * 0.3, gy - u * 0.2);
    g.lineTo(hx - u * 0.45, gy - u * 0.05);
    g.moveTo(hx, gy - u * 0.95);
    g.lineTo(hx + u * 0.35, gy - u * 0.75);
    g.moveTo(hx, gy - u * 0.95);
    g.lineTo(hx - u * 0.3, gy - u * 0.7);
    g.stroke();
    // (a thing coming at him)
    g.strokeStyle = 'rgba(255,138,61,0.7)';
    g.strokeRect(W * (up ? 0.6 : 0.62), gy - u * 0.7, u * 0.7, u * 0.7);
  };
  const refresh = () => {
    label();
    pick(sel);
    sketch();
  };
  pads.el.addEventListener('pointerdown', e => {
    if (!document.body.classList.contains('padedit')) return;
    const b = e.target.closest('b');
    if (!b) return;
    e.preventDefault();
    pick(b.dataset.a);
    const { L } = current();
    drag = { id: e.pointerId, a: b.dataset.a, dx: L[b.dataset.a].x * L.W - e.clientX, dy: L[b.dataset.a].y * L.H - e.clientY };
    b.setPointerCapture(e.pointerId);
  });
  pads.el.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const { L, out } = current(),
      r = out[drag.a].s / 2,
      // (kept whole on the screen, a few px in from its edges)
      cx = Math.max(r + 4, Math.min(L.W - r - 4, e.clientX + drag.dx)),
      cy = Math.max(r + 4, Math.min(L.H - r - 4, e.clientY + drag.dy));
    out[drag.a].x = cx / L.W;
    out[drag.a].y = cy / L.H;
    save(out);
  });
  const end = e => drag && e.pointerId === drag.id && (drag = null);
  pads.el.addEventListener('pointerup', end);
  pads.el.addEventListener('pointercancel', end);
  size.oninput = () => {
    const { out } = current();
    out[sel].s = +size.value;
    save(out);
  };
  op.oninput = () => {
    const { out } = current();
    out[sel].o = +op.value;
    save(out);
  };
  $('#pereset').onclick = () => {
    const all = { ...(S.get('pads') ?? {}) };
    delete all[wayOf(innerWidth, innerHeight)];
    S.set('pads', all);
    pads.place();
    refresh();
  };
  $('#pedone').onclick = () => close();
  addEventListener('resize', () => box.hidden || refresh());
  function close() {
    box.hidden = true;
    document.body.classList.remove('padedit');
    for (const b of Object.values(pads.b)) b.classList.remove('sel');
    const f = after;
    after = null;
    f?.();
  }
  // `sketch`: draw where he runs (from the settings; from the pause the run is behind); `done` called when it closes
  return {
    open({ sketch: withSketch = true, done = null } = {}) {
      after = done;
      guide.hidden = !withSketch;
      box.hidden = false;
      document.body.classList.add('padedit');
      pads.tint({});
      refresh();
    },
    get isOpen() {
      return !box.hidden;
    },
  };
}
