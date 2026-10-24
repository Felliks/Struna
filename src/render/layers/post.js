// Over the finished picture: the drop's burst (a zoom blur), negative frame and white flash, the build's speed lines, the build's strobe on the beat, the hit's red,
// a vignette breathing with the bass, and the frame round the simulation pulsing on the kick (the video's screen).
//
// With prefers-reduced-motion there are no full flashes or negative frames at all; otherwise every flash the music calls
// for is shown (the owner's call: no limit a second).
import { mulberry } from '../../rng.js';
import { rgba } from '../util.js';

export class Post {
  constructor(reduced) {
    this.reduced = reduced;
  }
  reset() {}
  // (kept for the last two sizes: a step of the dynamic resolution and back does not make it anew)
  vignette(W, H) {
    if (this.vg?.width !== W || this.vg?.height !== H) {
      const prev = this.vg;
      this.vg = this.vg2?.width === W && this.vg2?.height === H ? this.vg2 : null;
      this.vg2 = prev;
      if (this.vg) return this.vg;
      this.vg = Object.assign(document.createElement('canvas'), { width: W, height: H });
      const g = this.vg.getContext('2d'),
        gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(1, 'rgba(0,0,0,0.55)');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
    }
    return this.vg;
  }
  // bloom: what is bright in the picture glows over it. The frame is shrunk into a small canvas (384 px on its long
  // side: big enough that the browser keeps it on the GPU; a plain bilinear shrink, as a smoother one builds mipmaps of
  // the whole frame), its darks crushed (it is multiplied by itself: the square keeps what is bright), softened (shrunk a
  // quarter and stretched back) and added back over the whole screen,
  // breathing with the kick. One extra pass over the screen in all.
  bloom(f) {
    const { g, v, mf } = f,
      W = v.W,
      H = v.H,
      k = W >= H ? 384 / W : 384 / H,
      w = Math.round(W * k),
      h = Math.round(H * k);
    if (!this.bl) this.bl = document.createElement('canvas');
    const b = this.bl;
    if (b.width !== w || b.height !== h) Object.assign(b, { width: w, height: h });
    const x = b.getContext('2d');
    x.imageSmoothingQuality = 'low';
    x.globalCompositeOperation = 'copy';
    x.drawImage(g.canvas, 0, 0, w, h);
    x.globalCompositeOperation = 'multiply';
    x.drawImage(b, 0, 0);
    // (softened by shrinking it a quarter and back, not a canvas filter: a filter makes the card set up a layer of its
    // own every frame, and a busy frame waits for it)
    const q = (this.bq ??= document.createElement('canvas')),
      qw = Math.max(8, Math.round(w / 4)),
      qh = Math.max(8, Math.round(h / 4));
    if (q.width !== qw || q.height !== qh) Object.assign(q, { width: qw, height: qh });
    const y = q.getContext('2d');
    y.globalCompositeOperation = 'copy';
    y.drawImage(b, 0, 0, qw, qh);
    x.globalCompositeOperation = 'copy';
    x.imageSmoothingEnabled = true;
    x.drawImage(q, 0, 0, w, h);
    g.save();
    // (stretched back with plain bilinear smoothing: the blur is already in it)
    g.imageSmoothingQuality = 'low';
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = Math.min(1, (0.6 + 0.4 * mf.kick * mf.amp) * (0.75 + 0.25 * (f.react ?? 0.5)));
    g.drawImage(b, 0, 0, W, H);
    g.restore();
  }
  // whether a flash may be shown: every one, unless the player asked for less motion (no limit on how many a second:
  // the owner wants every flash the music calls for)
  allowed() {
    return !this.reduced;
  }
  draw(f) {
    const { g, v, run: R, t, mf, T } = f,
      W = v.W,
      H = v.H,
      since = t - mf.dropT;
    if (f.glow) this.bloom(f);
    // the drop: the picture bursts outward (a zoom blur: the frame laid back over itself, larger, fading out over half a
    // second), with or without the flash
    if (since >= 0 && since < 0.5 && !this.reduced) {
      const u = 1 - since / 0.5,
        b = f.snap();
      g.globalCompositeOperation = 'lighter';
      for (const [sc, al] of [
        [1.03, 0.22],
        [1.07, 0.14],
      ]) {
        g.globalAlpha = al * u;
        g.drawImage(b, (W * (1 - sc * (1 + 0.04 * u))) / 2, (H * (1 - sc * (1 + 0.04 * u))) / 2, W * sc * (1 + 0.04 * u), H * sc * (1 + 0.04 * u));
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
    // the build: speed lines rushing in from the edges, more and faster as it rises
    if (mf.build > 0.2 && !this.reduced) {
      const n = Math.round(10 + 30 * mf.build),
        rr = mulberry(Math.floor(t * 12));
      g.strokeStyle = rgba('#ffffff', 0.08 + 0.18 * mf.build * (0.5 + 0.5 * mf.beat));
      g.lineWidth = 1.5 * v.dpr;
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const a = rr() * Math.PI * 2,
          r0 = Math.max(W, H) * (0.75 - 0.25 * rr() * mf.build),
          r1 = r0 - Math.max(W, H) * (0.08 + 0.12 * mf.build);
        g.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0);
        g.lineTo(W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1);
      }
      g.stroke();
    }
    if (since >= 0 && since < 0.3 && this.allowed(mf.dropT)) {
      if (since < 0.05) {
        g.globalCompositeOperation = 'difference';
        g.fillStyle = '#fff';
        g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'source-over';
      }
      g.fillStyle = `rgba(255,255,255,${0.55 * (1 - since / 0.3)})`;
      g.fillRect(0, 0, W, H);
    }
    // a new part of the song (an act's first beat: a new look, maybe a new kind of play; Geometry Dash's portal): a
    // shockwave out from him over the screen and a soft flash, so the change reads as the song's, on its beat
    const act = f.actHit;
    if (act && t - act.t >= 0 && t - act.t < 0.7 && !this.reduced) {
      const u = (t - act.t) / 0.7,
        [hx, hy] = f.spots?.hero ?? [W / 2, H / 2],
        R = Math.hypot(W, H) * (0.1 + 0.9 * Math.sqrt(u));
      g.save();
      g.globalCompositeOperation = 'screen';
      g.strokeStyle = rgba(act.col ?? '#ffffff', 0.55 * (1 - u));
      g.lineWidth = (14 * (1 - u) + 2) * v.dpr;
      g.beginPath();
      g.arc(hx, hy, R, 0, Math.PI * 2);
      g.stroke();
      if (u < 0.25 && this.allowed(act.t)) {
        g.fillStyle = rgba(act.col ?? '#ffffff', 0.22 * (1 - u / 0.25));
        g.fillRect(0, 0, W, H);
      }
      g.restore();
    }
    // a blow's impact frame (anime's impact frames, a fighting game's): speed lines bursting from where it lands for a
    // tenth of a second; on a big one the picture inverted for a frame first (a flash: limited like the others)
    for (const im of f.impacts ?? []) {
      const d = t - im.t;
      if (d < 0 || d > 0.12) continue;
      const x = v.sx(im.x),
        y = v.sy(im.y),
        rr = mulberry(Math.round(im.t * 1000)),
        u = d / 0.12;
      if (im.big && d < 0.025 && this.allowed(im.t)) {
        g.globalCompositeOperation = 'difference';
        g.fillStyle = '#fff';
        g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'source-over';
      }
      if (this.reduced) continue;
      g.strokeStyle = rgba('#ffffff', 0.85 * (1 - u));
      g.lineWidth = (im.big ? 3 : 2) * v.dpr;
      g.beginPath();
      for (let i = 0; i < (im.big ? 22 : 12); i++) {
        const a = rr() * Math.PI * 2,
          r0 = (0.25 + 0.6 * u + 0.3 * rr()) * v.ppm,
          r1 = r0 + (0.6 + 1.2 * rr()) * v.ppm * (1 - 0.5 * u);
        g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
        g.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      }
      g.stroke();
    }
    // a hard song: on a hard snare the picture doubles sideways (a chromatic glitch); in a drop the kicks strobe, softly
    // and no more than three times a second
    const rx = f.react ?? 0;
    if (rx > 0.6 && mf.snare > 0.45) {
      const dx = (3 + 9 * mf.snare) * v.dpr * rx;
      // (from the frame's one copy of the picture, renderer.snapshot)
      const b = f.snap();
      g.globalCompositeOperation = 'screen';
      g.globalAlpha = 0.22 * mf.snare;
      g.drawImage(b, dx, 0);
      g.drawImage(b, -dx, 0);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
    if (rx > 0.65 && mf.amp >= 1 && t - mf.kickT < 0.06 && this.allowed(mf.kickT)) {
      g.fillStyle = `rgba(255,255,255,${0.12 * rx})`;
      g.fillRect(0, 0, W, H);
    }
    // a chill song: a soft glow from above and motes drifting in it
    const calm = (f.look?.calm ?? 0) * (1 - rx);
    if (calm > 0.25) {
      const gl = g.createRadialGradient(W * 0.6, 0, 0, W * 0.6, 0, H * 0.9);
      gl.addColorStop(0, rgba(T.sky[2], 0.18 * calm * (0.7 + 0.3 * mf.bass)));
      gl.addColorStop(1, rgba(T.sky[2], 0));
      g.fillStyle = gl;
      g.fillRect(0, 0, W, H);
      const rr = mulberry(21);
      g.fillStyle = `rgba(255,255,255,${0.35 * calm})`;
      for (let i = 0; i < 18; i++) {
        const x = (rr() * W + t * 8 * v.dpr * (rr() + 0.3)) % W,
          y = (rr() * H - t * 5 * v.dpr * (rr() + 0.2) + H * 10) % H;
        g.beginPath();
        g.arc(x, y, (1 + 2 * rr()) * v.dpr, 0, Math.PI * 2);
        g.fill();
      }
    }
    // the build closes in (bars from top and bottom), and in the last half beat before the drop the world holds its
    // breath (it darkens), so the drop lands on light
    if (mf.build > 0.15 && !this.reduced) {
      const bh = H * 0.07 * mf.build;
      g.fillStyle = '#000';
      g.fillRect(0, 0, W, bh);
      g.fillRect(0, H - bh, W, bh);
    }
    const beatLen = f.L.A.beat;
    if (mf.toDrop < beatLen / 2 && mf.toDrop > 0) {
      g.fillStyle = `rgba(0,0,0,${0.55 * (1 - mf.toDrop / (beatLen / 2))})`;
      g.fillRect(0, 0, W, H);
    }
    // the build: a soft tint on the beat (well under a flash's contrast)
    if (mf.build > 0.3) {
      g.fillStyle = rgba(T.hold, 0.12 * mf.build * mf.beat);
      g.fillRect(0, 0, W, H);
    }
    if (R.mode !== 'dead' && t - R.hitT < 0.25) {
      g.fillStyle = `rgba(255,0,48,${0.22 * (1 - (t - R.hitT) / 0.25)})`;
      g.fillRect(0, 0, W, H);
    }
    // (the vignette is drawn once per screen size and laid over, its strength breathing with the bass)
    g.globalAlpha = 1 - 0.45 * mf.bass;
    g.drawImage(this.vignette(W, H), 0, 0);
    g.globalAlpha = 1;
    const p = Math.max(mf.kick, 0.6 * mf.beat) * mf.amp,
      lw = (3 + 6 * p) * v.dpr;
    // (its glow: a wider faint frame under it, no blur)
    g.strokeStyle = rgba(T.line, (0.12 + 0.2 * p) * f.glow);
    g.lineWidth = lw * 4;
    g.strokeRect(0, 0, W, H);
    g.strokeStyle = rgba(T.line, 0.35 + 0.6 * p);
    g.lineWidth = lw;
    g.strokeRect(lw / 2, lw / 2, W - lw, H - lw);
  }
}
