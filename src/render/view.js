// The view: the canvas's size in device pixels, its scale (pixels per metre) and the camera, and the mapping from the
// world (metres, y up) to the screen (pixels, y down). Every drawing module goes through it.
//
// The camera (after the parkour video's): the hero a fifth in from the left so what the cursor puts in his way is on
// screen before he gets to it, the roof 30 % up so the cursor has the sky to work in; it rides his run exactly (no lag
// to make the world swim), eases its height with a critically damped spring, punches in on the music, and shakes by
// trauma (Eiserloh, "Juicing Your Cameras With Math": the shake is trauma squared, trauma decays linearly, the offsets
// are smooth noise, not white noise).
import { clamp } from './util.js';
import { noise2 } from './physics.js';

export class View {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vy = 0;
    this.ready = false;
    this.trauma = 0;
    this.zoom = 1;
    // the metres of the way ahead that must be in view (renderer.js: the level's top speed times the reading time); a
    // narrow screen (a phone held upright) is zoomed out for it
    this.ahead = 0;
    // how far up the screen the roof he runs on sits (renderer.js)
    this.roofUp = 0.3;
    this.resize(1, 1, 1);
  }
  resize(w, h, dpr) {
    this.dpr = dpr;
    this.W = Math.round(w * dpr);
    this.H = Math.round(h * dpr);
    this.portrait = this.W < this.H;
    // close on him, as in the video: portrait about 4.8 m across, landscape about 7.2 m of height (more on a big screen);
    // but never so close
    // that less than `ahead` metres lie past him (the hero `lead` in from the edge, a thing read 0.45 m inside it); but
    // never so far that a metre is under 38 CSS pixels (he is 1.8 m: smaller than 68 px he stops reading as a man)
    const lf = this.portrait ? 0.12 : 0.24,
      need = Math.min(Math.max(9, w / 38), (this.ahead + 0.45) / (1 - lf));
    // (a big screen, a computer's or a tablet's, shows more of the world round him instead of a bigger him: a metre is
    // never more than 80 CSS pixels, so he stays about a sixth of a computer screen's height)
    const base = Math.min(this.portrait ? this.W / 4.8 : this.H / 7.2, 80 * dpr);
    this.ppm = Math.min(base, this.W / need);
    // (zoomed out for the way ahead: the music's punches in must not take it back, renderer.js)
    this.tight = this.ppm < base * 0.98;
    this.vw = this.W / this.ppm;
    this.vh = this.H / this.ppm;
    this.lead = this.vw * lf;
    Object.assign(this, { ppm0: this.ppm, lf });
    // (the scale at the screen's full resolution: what is drawn once and kept (the words over him) is drawn at it and
    // scaled, so a step of the dynamic resolution (res, renderer.js) never makes it anew)
    this.ppmFull = this.ppm / (this.res ?? 1);
  }
  // the camera pulled back for a while (u 0..1 of a scale under 1): fewer pixels a metre, so more of the world is in
  // the picture, and every layer that culls by the view sees it (a zoom of the finished picture would leave them
  // culling by the close one)
  widen(u) {
    if (!this.ppm0) return;
    this.ppm = this.ppm0 * u;
    this.vw = this.W / this.ppm;
    this.vh = this.H / this.ppm;
    this.lead = this.vw * this.lf;
  }
  sx(x) {
    return (x - this.x) * this.ppm;
  }
  sy(y) {
    return this.H - (y - this.y) * this.ppm;
  }
  // world point from a screen point
  wx(X) {
    return this.x + X / this.ppm;
  }
  wy(Y) {
    return this.y + (this.H - Y) / this.ppm;
  }
  // where the camera's left edge is for a hero at x (the cursor plan uses it to know when things come into view)
  leftFor(heroX) {
    return heroX - this.lead;
  }
  addTrauma(v) {
    this.trauma = clamp(Math.max(this.trauma, v), 0, 1);
  }
  // one frame: follow the target; x is ridden exactly when `ride`, eased otherwise
  follow(target, dt, ride) {
    if (!this.ready) {
      Object.assign(this, { x: target.x, y: target.y, vy: 0, ty: target.y, tx: target.x, ready: true });
      return;
    }
    // (off the ride, eased towards the target and carried at its own speed, so a steady run is not trailed and
    // the ride taking over again finds the camera where it is: no snap; a jump of the target is not a speed)
    const k = 1 - Math.exp(-dt * 5),
      tvx = this.tx === undefined || dt <= 0 ? 0 : (target.x - this.tx) / dt,
      fx = this.x + (Math.abs(tvx) < 40 ? tvx * dt : 0);
    this.tx = target.x;
    this.x = ride ? target.x : fx + (target.x - fx) * k;
    // the height: a critically damped spring (no overshoot, no lag at rest) that also matches the target's own speed,
    // so a steady climb or fall up a shaft is not trailed (a plain spring lags 2v/w behind: up a fast shaft that put him
    // in the middle of the picture, the way ahead out of sight); a jump of the target (a new stretch) is not a speed
    const tv = this.ty === undefined || dt <= 0 ? 0 : (target.y - this.ty) / dt;
    this.ty = target.y;
    const w = 7,
      a = w * w * (target.y - this.y) + 2 * w * ((Math.abs(tv) < 40 ? tv : 0) - this.vy);
    this.vy += a * dt;
    this.y += this.vy * dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
  }
  // the transform for this frame: zoom and a tilt (radians) about a focus point, the trauma shake (the blows' trauma and
  // the music's, `music`, added as trauma and squared together; the offsets smooth noise, each axis its own; all of it,
  // and the blows' kicks, scaled by `motion`: 0 with the effects at 0 or reduced motion, renderer.js)
  apply(g, t, zoom, focusX, focusY, music = 0, rot = 0) {
    const m = this.motion ?? 1,
      s = Math.min(1, (this.trauma + music) ** 2) * this.ppm * 0.12 * m,
      a = zoom * Math.cos(rot),
      b = zoom * Math.sin(rot),
      // (a blow's kick: the picture knocked the way the blow goes, at once, and eased back: Vlambeer's camera kick, not
      // a random shake)
      k = this.kickT === undefined || t < this.kickT ? 0 : Math.exp(-(t - this.kickT) / 0.06) * this.kickA * this.ppm * m;
    g.setTransform(a, b, -b, a, focusX - (a * focusX - b * focusY) + noise2(t * 11, 1) * s + k * this.kickX, focusY - (b * focusX + a * focusY) + noise2(t * 11, 7) * s + k * this.kickY);
  }
  // knock the picture: towards (dx, dy) (screen, a unit vector), `amp` metres
  kick(t, dx, dy, amp = 0.18) {
    Object.assign(this, { kickT: t, kickX: dx, kickY: dy, kickA: amp });
  }
}
