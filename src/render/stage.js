// The stage: where each stretch of the run is on screen. The run (run.js, level.js) measures him by distance only, always
// forward; the stage lays that distance out in one continuous world, a stretch run "the other way" really going to -x
// (no mirror: nothing on screen ever swaps sides), each shaft standing where the stretch before it ended, the stretch
// after it leaving from its foot. A stretch's place on stage is P(d) = ox + dir * (d - d0) (shafts: dir = 1, so their
// lanes are where the keys say).
//
// Every layer that draws things of one stretch (roofs, obstacles, him) draws them in its own distance through inSeg,
// which turns the frame round for a stretch run to -x; the backdrop (sky, places' rows, weather) is drawn on stage.

export function stageSegs(L) {
  let cur = null;
  for (const s of L.segs) {
    const d0 = L.xAt(s.t0);
    if (L.vertical(s)) {
      const ox = cur ? cur.ox + cur.dir * (d0 - cur.d0) : d0;
      s.st = { d0, ox, dir: 1 };
    } else s.st = { d0, ox: cur ? cur.ox + cur.dir * (d0 - cur.d0) : d0, dir: s.dir ?? 1 };
    cur = s.st;
  }
}

// a stretch's distance x on stage
export const onStage = (s, x) => s.st.ox + s.st.dir * (x - s.st.d0);

// the hero's ground height the backdrop rests on: the roof he is on, and through a shaft from the roof above to the one
// below, eased (so the far rows never drift from shaft to shaft); down a ladder of islands (level.js ladder) island
// by island, eased through each flight, and the shaft after it from its bottom
export function restY(L, t) {
  const i = L.segs.findIndex(s => t >= s.t0 && t < s.t1),
    s = L.segs[i] ?? L.segs.at(-1);
  if (!L.vertical(s)) return s.y0 + (L.stairDy?.(t) ?? 0);
  const a = L.segs[i - 1]?.y1 ?? s.y0,
    b = L.segs[i + 1]?.y0 ?? s.y1,
    u = Math.max(0, Math.min(1, (t - s.t0) / (s.t1 - s.t0)));
  return a + (b - a) * u * u * (3 - 2 * u);
}

// draw a stretch's things in its own distance: the camera's x as that stretch sees it, the frame turned round when it
// runs to -x, f.flip saying which way (text and pointers stay readable through util.upright)
export function inSeg(f, s, draw) {
  const { g, v } = f,
    st = s.st,
    X = v.x,
    flip = f.flip;
  v.x = st.dir > 0 ? st.d0 + X - st.ox : st.d0 + st.ox - X - v.vw;
  // (the stretch's way composed with the frame's: in a mirror act the whole picture is turned too, so a stretch run to
  // +x reads mirrored and one run to -x reads right; words turn back by the product)
  f.flip = (flip ?? 1) * st.dir;
  if (st.dir < 0) {
    g.save();
    g.transform(-1, 0, 0, 1, v.W, 0);
  }
  try {
    draw();
  } finally {
    if (st.dir < 0) g.restore();
    v.x = X;
    f.flip = flip;
  }
}
