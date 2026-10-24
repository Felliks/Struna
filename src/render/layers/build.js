// The world being rendered (the director's build, 0 at the start to 1 at the first drop): the place behind him shows
// through a veil of the simulation's dark, its grid laid over it, a scan line sweeping down it each bar writing it in,
// the grid flashing on the kick; less of it as the song builds, gone by the drop. Only behind: what he runs on and
// what he must deal with are drawn whole from the start.
export function drawBuild(f) {
  const { g, v, mf, t, T, shot, L } = f,
    u = 1 - (shot?.build ?? 1);
  if (u <= 0.01) return;
  const W = v.W,
    H = v.H,
    m = v.ppm;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = `rgba(4,6,12,${0.8 * u})`;
  g.fillRect(0, 0, W, H);
  // the grid, on the world at half its scroll (far behind), flashing on the kick
  g.strokeStyle = T.line;
  g.globalAlpha = u * (0.25 + 0.45 * mf.kick);
  g.lineWidth = v.dpr;
  g.beginPath();
  const step = 1.5 * m,
    ox = -((v.x * m * 0.5) % step),
    oy = (v.y * m * 0.5) % step;
  for (let X = ox; X < W; X += step) {
    g.moveTo(X, 0);
    g.lineTo(X, H);
  }
  for (let Y = oy; Y < H; Y += step) {
    g.moveTo(0, Y);
    g.lineTo(W, Y);
  }
  g.stroke();
  // the scan line writing the world in, once a bar
  const bar = 4 * L.A.beat,
    sy = ((t % bar) / bar) * H;
  g.globalAlpha = u;
  g.fillStyle = T.line;
  g.fillRect(0, sy, W, 2 * v.dpr);
  g.globalAlpha = 0.25 * u;
  g.fillRect(0, sy - 30 * v.dpr, W, 30 * v.dpr);
  g.restore();
}
