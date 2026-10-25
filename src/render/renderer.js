// The renderer: draws a run as a pure picture of its state at song time t (it never changes the run). It owns the
// view (scale, camera, shake), the cursor's plan, the view-only effects (particles, flash limiter), and the layers,
// drawn back to front. Each layer is a function of one frame record `f` (or an object with draw(f)); a new layer is a
// new entry in the list.
//
// The song's one place (render/places/) is on screen throughout, laid out on one continuous stage (stage.js): a
// stretch run the other way really goes the other way across it, so nothing ever swaps sides, and the backdrop rests on
// the roof he is on (it never drifts from shaft to shaft).
import { makeFX } from '../fx.js';
import { makeLook } from '../look.js';
import { makeDirector } from './director.js';
import { drawBuild } from './layers/build.js';
import { drawPerformer } from './layers/performer.js';
import { drawLyrics } from './layers/lyrics.js';
import { Mirror, drawBlackout, drawBoss, drawChaser, drawFore, modeAmount } from './layers/modes.js';
import { CursorPlan, LADDER_ZOOM } from './cursor-plan.js';
import { View } from './view.js';
import { inSeg, onStage, restY, stageSegs } from './stage.js';
import { clamp, smooth, warmGlows } from './util.js';
import { at, fieldOf } from './physics.js';
import { rehearse, warmRun } from './rehearse.js';
import { FALL_V, launchApex } from '../run.js';
import { drawBack, drawSky } from './layers/sky.js';
import { warmWorld } from '../world/render.js';
import { LOOKS } from './places/index.js';
import { drawRoofs, drawShafts } from './layers/roofs.js';
import { drawObstacles } from './layers/obstacles.js';
import { drawGhost, drawHero } from './layers/hero.js';
import { drawHeld, warmProps } from './layers/props.js';
import { drawSystem } from './layers/system.js';
import { drawAnomaly, drawSongWave, drawTunnel, drawWarp } from './layers/world.js';
import { drawCursor } from './layers/cursor.js';
import { Particles } from './layers/particles.js';
import { drawPixels } from './layers/atmosphere.js';
import { weatherBack, weatherFront } from './layers/weather.js';
import { Post } from './layers/post.js';
import { drawHud } from './layers/hud.js';
import { drawAura, drawString } from './layers/string.js';
import { drawHints } from './layers/hints.js';
import { drawCoach, warmCoach } from './layers/coach.js';
import { drawVoice, evolve, pump, skyEvents } from './layers/voice.js';
import { KOs, drawAlly, drawEchoes } from './layers/clones.js';
import { Glitch } from './layers/glitch.js';
import { inkAction, lens, overAll, pixelated, warmLenses } from './layers/lens.js';
import { drawCharacter, drawFinale, drawSecretDoor, drawSecretSky } from './layers/character.js';
import { HitStop, drawImpact, drawKeyline } from './layers/juice.js';

// the resolution's steps (of the screen's pixels, at most 2 per CSS pixel)
const SCALES = [1, 0.85, 0.72, 0.6, 0.5];
const media = q => typeof matchMedia === 'function' && matchMedia(q).matches;

export class Renderer {
  constructor(canvas) {
    this.cv = canvas;
    // (opaque: the browser need not blend the page under it)
    this.g = canvas.getContext('2d', { alpha: false });
    this.view = new View();
    this.touch = media('(pointer: coarse)');
    // the player's effects setting, 0..1 (settings.js); the picture's quality, 1 or 0 (no glows, less weather) when
    // the device cannot keep up
    this.effects = 1;
    this.quality = 1;
    this.slow = 0;
    // (a computer's retina screen starts a little under its full pixels (about 1.44 a CSS pixel, not 2): half again as
    // many pixels cost the card more than they show; the dynamic resolution takes it up when the frames keep time)
    this.step = (devicePixelRatio || 1) >= 2 && !media('(pointer: coarse)') ? 2 : 0;
    this.good = 0;
    this.reduced = media('(prefers-reduced-motion: reduce)');
    this.particles = new Particles();
    this.kos = new KOs();
    this.post = new Post(this.reduced);
    this.glitch = new Glitch(this.reduced);
    // (the picture held on a big blow and its impact frame, layers/juice.js)
    this.stop = new HitStop(this.reduced);
    // back to front, in the world's (zoomed, shaken, maybe mirrored) frame, then over the screen
    // (him and the pixels round him in his stretch's own distance; the cursor and the particles are on stage already)
    // (in a shaft he keeps facing the way he ran into it: turned round about himself when that was to -x)
    const his = draw => f =>
      inSeg(f, f.heroSeg, () => {
        if (!f.L.vertical(f.heroSeg) || (f.heroSeg.face ?? 1) > 0) {
          if (draw === drawHero) {
            drawEchoes(f, this.history);
            drawAlly(f, this.history);
            if (this.ghost?.J && this.ghost.mode !== 'dead') drawGhost(f, this.ghost.J);
          }
          return draw(f);
        }
        const X = f.v.sx(f.run.heroX(Math.max(0, f.t))),
          flip = f.flip;
        f.g.save();
        f.g.translate(X, 0);
        f.g.scale(-1, 1);
        f.g.translate(-X, 0);
        // (mirrored here too: words drawn in it turn back upright)
        f.flip = -flip;
        draw(f);
        f.flip = flip;
        f.g.restore();
      });
    const kos = f => this.kos.draw(f),
      hero = his(drawHero),
      // (what is in his hands: a bat, a thing he carries, layers/props.js)
      held = his(drawHeld),
      particles = f => this.particles.draw(f, f.dt),
      pixels = his(drawPixels);
    this.world = [drawSky, drawAnomaly, drawSecretSky, evolve, drawVoice, skyEvents, drawTunnel, drawWarp, drawPerformer, drawBoss, drawLyrics, weatherBack, drawSongWave, drawBack, drawBuild, drawBlackout, pump, lens(true), drawShafts, drawRoofs, drawChaser, drawObstacles, drawSecretDoor, kos, drawFinale, drawAura, hero, held, drawCursor, particles, pixels, weatherFront, drawFore];
    // what he has to read and answer (the things in his way, the storms in a shaft, the clones, him, the cursor, the
    // sparks of a hit): under a lens over the whole world it is drawn after the lens, on a canvas of its own, in its
    // own colours with an outline in the lens's ink (lens.js inkAction), so no lens ever takes an obstacle away; the
    // world's front (its weather, the things passing close) goes under the lens with the rest of the world then
    this.acting = new Set([drawChaser, drawObstacles, drawSecretDoor, kos, drawFinale, drawAura, hero, held, drawCursor, particles, pixels]);
    this.lensWorld = lens(false);
    // (the background off, settings 'plain': the sky a plain gradient of the song's colours, none of the place's rows,
    // landmarks, weather, sky events or the singer behind; the boss, the lyrics, the roofs and all he must read kept)
    this.plainOut = new Set([drawAnomaly, drawSecretSky, evolve, drawVoice, skyEvents, drawTunnel, drawWarp, drawPerformer, weatherBack, drawSongWave, drawBack, drawBuild, weatherFront, drawFore]);
    this.plainSky = f => {
      const { g, v, T } = f,
        gr = g.createLinearGradient(0, 0, 0, v.H);
      gr.addColorStop(0, T.sky[0]);
      gr.addColorStop(1, T.sky[2]);
      g.fillStyle = gr;
      g.fillRect(-v.W, -v.H, v.W * 3, v.H * 3);
    };
    this.behind = new Set([drawSky, drawAnomaly, drawSecretSky, drawTunnel, drawSongWave, evolve, drawVoice, skyEvents, drawPerformer, drawBoss, weatherBack, drawBack, weatherFront]);
    this.mirror = new Mirror();
    // (the world's picture held on a big blow after the mirror, so the screen's effects over it, his keyline, the impact
    // frame and the HUD run on with the music)
    this.screen = [f => this.mirror.draw(f), f => (f.held = this.stop.apply(f)), f => this.post.draw(f), f => this.glitch.draw(f), drawKeyline, f => drawImpact(f, this.stop, this.post), f => f.flushLabels(), drawCharacter, drawSystem, drawHints, drawCoach, drawString, drawHud];
    this.resize();
    addEventListener('resize', () => this.resize());
    this.reset();
  }
  // a layer of the world drawn, or with the background off (settings 'plain') left out or drawn plain
  layer(fn, f) {
    if (!this.plain) return fn(f);
    if (fn === this.world[0]) return this.plainSky(f);
    if (!this.plainOut.has(fn)) fn(f);
  }
  resize() {
    // (the backing store at the screen's pixels (at most 2 per CSS pixel) times the resolution scale: a device that
    // cannot keep up draws fewer pixels, never fewer things; the camera's metres stay the same, so the plan does)
    const dpr = Math.min(2, devicePixelRatio || 1) * SCALES[this.step ?? 0];
    this.view.res = SCALES[this.step ?? 0];
    this.view.resize(innerWidth, innerHeight, dpr);
    this.cv.width = this.view.W;
    this.cv.height = this.view.H;
    this.cv.style.width = innerWidth + 'px';
    this.cv.style.height = innerHeight + 'px';
    if (this.vw !== innerWidth || this.vh !== innerHeight) this.plan = null;
    this.vw = innerWidth;
    this.vh = innerHeight;
    // the screen's safe area (CSS px): the notch, the rounded corners, the home bar; the HUD keeps inside it
    const el = typeof document !== 'undefined' && document.getElementById('safe'),
      cs = el && getComputedStyle(el),
      px = k => parseFloat(cs?.[k]) || 0;
    this.safe = { t: px('paddingTop'), r: px('paddingRight'), b: px('paddingBottom'), l: px('paddingLeft') };
  }
  // the look as this frame sees it: the act, the hour, how much night, the landmarks shown (the third from halfway)
  frameLook(lk, sc, day, mf) {
    const F = (this.lookOf ??= new Map()).get(lk) ?? (this.lookOf.set(lk, Object.create(lk)), this.lookOf.get(lk));
    F.act = sc;
    F.day = day;
    F.time = day.u < 0.5 ? day.a : day.b;
    F.night = (day.a === 'night' ? 1 - day.u : 0) + (day.b === 'night' ? day.u : 0);
    F.landmarks = mf.grow >= 0.5 && lk.extra ? (lk.allLandmarks ??= [...lk.landmarks, lk.extra]) : lk.landmarks;
    return F;
  }
  // the run taken back (the cursor's undo): the time runs back, so what kept its last frames starts over
  rewound() {
    this.lastT = null;
    this.history = [];
    this.pendingKO = [];
    this.impacts = [];
    this.stop.reset();
  }
  // the picture so far, copied once a frame into a canvas of its own for the effects that lay it back over itself
  // (the mirror, the drop's burst, the snare's chroma, the glitch): one copy shared by them all (a canvas drawn onto
  // itself makes the browser copy the whole of it each time)
  // (fresh: copied again even if it was this frame, as the background's lens wants what is under it now)
  snapshot(g, fresh = false) {
    if (fresh || this.snapAt !== this.frameNo) {
      const b = (this.snapBuf ??= document.createElement('canvas'));
      if (b.width !== g.canvas.width || b.height !== g.canvas.height) Object.assign(b, { width: g.canvas.width, height: g.canvas.height });
      const x = b.getContext('2d');
      x.globalCompositeOperation = 'copy';
      x.drawImage(g.canvas, 0, 0);
      this.snapAt = this.frameNo;
    }
    return this.snapBuf;
  }
  // the canvas what he must read is drawn on under a lens over the whole world: the screen's size, cleared
  actLayer(g) {
    const c = (this.actBuf ??= document.createElement('canvas'));
    if (c.width !== g.canvas.width || c.height !== g.canvas.height) Object.assign(c, { width: g.canvas.width, height: g.canvas.height });
    const x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, c.width, c.height);
    return x;
  }
  // the run's first frame drawn out of sight before its song starts: its look made and its lenses warmed (warmLenses,
  // in draw) while it loads, not as it plays
  prewarm(run) {
    // (the coach's vignette made now, not on its first slow motion)
    warmCoach();
    try {
      this.draw(run, 0);
    } catch (e) {
      console.error('prewarm:', e);
    }
  }
  // what the run will need made before it starts, from its first frame f (rehearse.js warmRun)
  warmRun(f) {
    warmRun(this, f);
  }
  // the song rehearsed while it loads, on a run of its own that is never played (rehearse.js); `enough()` true ends it
  // early (the song is ready to play)
  rehearse(run, enough) {
    return rehearse(this, run, 2, enough);
  }
  // a new run: the camera, the plan and the view-only effects start over
  reset() {
    this.view.ready = false;
    this.plan = null;
    this.particles.clear();
    this.post.reset();
    this.lastEvent = 0;
    this.lastAct = 0;
    this.lastT = null;
    this.seen = {};
    this.trail = [];
    this.kos.clear();
    this.pendingKO = [];
    this.impacts = [];
    this.stop.reset();
    this.warmed = false;
    // his last poses (the echoes behind him on a drop)
    this.history = [];
  }
  ensure(run) {
    if (this.L !== run.L) {
      this.L = run.L;
      stageSegs(run.L);
      this.particles.stage = (t, x) => {
        const s = run.L.segAt(Math.max(0, t));
        // (and the roof there, what is thrown falls back to; none in a shaft)
        return { x: onStage(s, x), dir: s.st.dir, y0: run.L.vertical(s) ? null : s.y0 };
      };
      this.fx = makeFX(run.L.A, run.L.segs, run.L.finale);
      // this song's dress for its place (look.js): palette, time of day, weather, landmarks
      this.look = makeLook(run.L.place, run.L.profile, run.L.A.seed, run.L.A, run.L.dress);
      // (and, when the song is rewritten into another place midway, that place's own look)
      this.looks = { [run.L.place]: this.look };
      if (run.L.place2 && run.L.place2 !== run.L.place && run.L.rewriteT < Infinity) this.looks[run.L.place2] = makeLook(run.L.place2, run.L.profile, run.L.A.seed ^ 0x2e2e, run.L.A, run.L.dress);
      this.director = makeDirector(run.L, this.look);
      // the way ahead kept in view: the song's top speed (its 98th percentile) for 0.75 s, the reading time rhythm games
      // give (osu! 600-900 ms), past the 2.7 m a thing stands ahead of him when it is pressed for (a box is jumped from
      // well before it); on a phone held upright that zooms the camera out (view.js)
      const vs = [];
      for (let t = 0; t < run.L.A.dur; t += 0.25) vs.push(run.L.vAt(t));
      vs.sort((a, b) => a - b);
      this.view.ahead = 0.75 * (vs[Math.floor(vs.length * 0.98)] ?? 6) + 2.7;
      this.resize();
      this.plan = null;
    }
    if (!this.plan || this.plan.run !== run) {
      this.plan = new CursorPlan(run, this.view);
      this.lastAct = 0;
      this.actHit = null;
    }
  }
  // how much the camera's pivot is his (1 in a shaft) rather than the roof line's (0 on a roof), eased over 0.4 s either
  // side of a shaft's ends
  inShaft(L, s, t) {
    if (L.vertical(s)) return 1;
    const i = L.segs.indexOf(s),
      a = L.segs[i - 1],
      b = L.segs[i + 1];
    return Math.max(a && L.vertical(a) ? 1 - smooth(s.t0, s.t0 + 0.4, t) : 0, b && L.vertical(b) ? smooth(s.t1 - 0.4, s.t1, t) : 0);
  }
  // a shaft read in time: it goes by at FALL_V, faster than a wide screen's height in a beat, so the camera pulls back
  // (about him, at the edge he comes from) till two and a half beats of it lie between him and the far edge, easing in
  // and out over a beat at its ends; never back past 0.6
  shaftZoom(run, t, s) {
    if (!run.L.vertical(s) || s.climb) return 1;
    const v = this.view,
      beat = run.L.A.beat,
      z = Math.max(0.6, Math.min(1, (v.vh * 0.84 - 1.2) / (FALL_V * beat * 2.5))),
      edge = Math.min(smooth(s.t0, s.t0 + beat, t), 1 - smooth(s.t1 - beat, s.t1, t));
    return 1 - (1 - z) * edge;
  }
  // how much room to make behind him (0..1): a clone running up from behind, from four beats before its kick, eased in
  // over a beat and out after it (a phone held upright shows little behind him: the camera slides on to show it come)
  behindRoom(run, t) {
    const beat = run.L.A.beat;
    let room = 0;
    for (const o of run.L.obs) {
      if (o.t > t + 4 * beat) break;
      if (o.type !== 'foeback' || o.t < t - beat) continue;
      room = Math.max(room, Math.min(smooth(o.t - 4 * beat, o.t - 3 * beat, t), 1 - smooth(o.t + 0.1, o.t + beat, t)));
    }
    return room;
  }
  // a ladder of islands under way (level.js ladder): how far into it (0..1, eased in over the two beats before the cut
  // and out over two after the last touch), the leap to come or under way, and the camera pulled back for it: on a
  // phone held upright far enough that the next island is in view before the leap for it (cursor-plan.js LADDER_ZOOM);
  // on a wide screen far enough that his island and the next one below it are in the picture at once
  ladder(run, t) {
    const L = run.L,
      beat = L.A.beat,
      v = this.view;
    for (const is of L.isles ?? []) {
      if (!is.ladder) continue;
      const a = is.t0 - 4 * beat,
        b = is.rolls.at(-1).t;
      if (t < a - 2 * beat || t > b + 3 * beat) continue;
      const room = Math.min(smooth(a - 2 * beat, a, t), 1 - smooth(b + beat, b + 3 * beat, t)),
        drop = Math.max(...is.leaps.map(o => o.dyFrom - o.dy)),
        vh0 = v.H / v.ppm0,
        // (up: far enough back that the island he takes off from and his head at the top of the launch are in the
        // picture at once, under the HUD's band)
        top = is.rise ? Math.max(...is.leaps.map(o => launchApex(o.dyFrom - o.dy, o.air))) : 0,
        z = is.rise ? Math.min(v.portrait ? LADDER_ZOOM : 1, vh0 / ((top + 2.1) / 0.72)) : v.portrait ? LADDER_ZOOM : Math.min(1, vh0 / ((drop + 2.6) / 0.64));
      return { is, room, zoom: 1 - (1 - z) * room, o: is.leaps.find(o => o.t + o.air > t) ?? null };
    }
    return null;
  }
  // up a ladder of islands: the camera's height rides the climb itself, not him: each island's rise eased in over its
  // flight (smoothstep, so it never jerks), a third of a flight ahead of him (the island he goes to in the picture as he
  // takes off), and a third of how far the launch has him over the island he goes to; then kept so that the island under
  // him stays in the picture and his head under the HUD's band
  riseCam(run, t, is, hud) {
    const v = this.view,
      ahead = 0.35 * is.leaps[0].air,
      at = q => is.leaps.reduce((y, o) => y + (o.dy - o.dyFrom) * smooth(o.t, o.t + o.air, q), 0),
      o = is.leaps.findLast(q => q.t <= t && t < q.t + q.air),
      y0 = is.seg.y0,
      over = o ? 0.3 * Math.max(0, run.y - (y0 + o.dy)) : 0,
      y = y0 + at(t + ahead) - v.vh * v.roofUp + over;
    return Math.max(Math.min(y, run.y - 0.08 * v.vh), run.y + 2.1 - (v.vh - hud) * 0.9);
  }
  // the camera's target (on stage): the hero a fifth in from the edge behind him, the roof 30 % up, rising with his jumps
  // (he stays in the lower part of the picture, the cursor's sky above him stays its own); centred on a shaft
  // while he is in it, with the way ahead in view: he is near the top falling (all the way down in sight), near the
  // bottom flying up
  // how far into the middle he is drawn (0..1), eased over about half a second each way
  freeCam(run, t, s, beat) {
    // (only a string well under way, three moves in, and nothing for three beats ahead; on the same roof)
    const want = run.string?.links.length >= 3 && run.mode === 'run' && !run.L.flightAt?.(t) && !run.L.obs.some(o => !o.res && o.t > t - 0.2 && o.t < t + 3.2 * beat && o.type !== 'lane') && run.L.segAt(t + 3 * beat) === s ? 1 : 0,
      dt = Math.max(0, Math.min(0.1, t - (this.fcT ?? t)));
    this.fcT = t;
    this.fc = (this.fc ?? 0) + (want - (this.fc ?? 0)) * (1 - Math.exp(-dt * 4.5));
    const e = this.fc;
    return e * e * (3 - 2 * e);
  }
  cameraTarget(run, t, s) {
    const v = this.view;
    // (his body is drawn a metre and more above run.y in a shaft: aimed at its middle, its top and the shield round it in
    // the picture, falling)
    // (falling on a low screen he is kept under the HUD's band, his head and shield clear of the health bar)
    const hud = (64 * v.dpr) / v.ppm;
    // (a climb: not on him but on the climb's own steady line up, so he is seen to drop with each beam and leap up off
    // it, and the beams falling past; him in the lower half, the sky over him where the cursor lets them go)
    // (a little ahead of time: the camera's own ease lags it)
    if (s.climb) return { x: s.st.ox - v.vw / 2, y: s.y0 + (s.y1 - s.y0) * clamp((t + 0.45 - s.t0) / (s.t1 - s.t0), 0, 1) - v.vh * (v.portrait ? 0.22 : 0.16) };
    if (run.L.vertical(s)) return { x: s.st.ox - v.vw / 2, y: s.kind === 'rise' ? run.y - v.vh * 0.14 : run.y + 1.2 - Math.min(v.vh * 0.84, v.vh - 1.4 - hud) };
    if (run.mode === 'dead') return { x: onStage(s, run.J[0]) - v.vw * 0.5, y: Math.min(run.J[1] - 0.9, s.y0) - v.vh * v.roofUp };
    // (tucked too soon in a leap, short of the run: the camera keeps half to the run, so the island stays put and he is
    // seen to drop short of it)
    const hx = onStage(s, run.short ? (run.heroX(t) + run.L.xAt(t)) / 2 : run.heroX(t)),
      // (in a flight he is further in from the edge, his cape and trailing legs in the picture, and the camera follows his
      // height by half, so he is seen to climb and dive, not the world to lurch)
      w = run.L.flightAt?.(t),
      beat = run.L.A.beat,
      f = w ? Math.min(1, Math.max(0, (t - (w.t0 - beat)) / beat), Math.max(0, (w.t1 + beat - t) / beat)) : 0,
      fe = f * f * (3 - 2 * f),
      lead = v.lead + fe * v.vw * 0.14 + this.behindRoom(run, t) * v.vw * (v.portrait ? 0.2 : 0.08);
    // (running up to a climb: the camera rising and centring on where it will be, ahead of time, so its beams come in
    // view as the cursor brings them)
    const nc = run.L.segs[run.L.segs.indexOf(s) + 1],
      ck = nc?.climb ? smooth(nc.t0 - 4, nc.t0 - 1, t) : 0,
      // (a freestyle string up and nothing ahead for a while: he comes into the middle of the picture, his dance the show;
      // two beats before the next thing in his way the camera eases back to show what is coming)
      fc = this.freeCam(run, t, s, beat),
      rx = (s.st.dir > 0 ? hx - lead : hx - v.vw + lead) * (1 - fc) + (hx - v.vw / 2) * fc,
      // (over islands: the camera rides the one he is on or leaping to, so his leaps up and down are seen, not lost)
      // (and follows his leaps up only a little there, so the islands ahead stay in the picture under him)
      isle = run.L.isles?.some(q => t >= q.t0 - beat && t < q.t1 + beat),
      base = s.y0 + (run.L.isleCam?.(t) ?? 0),
      ry0 = base - v.vh * v.roofUp + (isle ? 0.3 : 0.85 - 0.4 * fe) * Math.max(0, run.y - base),
      // (down a ladder: from a beat and more before each leap to its touch, framed on the island he leaps to, low in
      // the picture (a fifth up: clear of the music's punches in), with him on the one he leaps off still in it under
      // the HUD)
      ld = this.ladder(run, t),
      lo = ld?.o,
      lw = lo ? smooth(lo.t - 2.2 * lo.air / 2, lo.t - 1.2 * lo.air / 2, t) : 0,
      ry = ld?.is.rise ? this.riseCam(run, t, ld.is, hud) : lw > 0 ? ry0 + (Math.max(lo.seg.y0 + lo.dy - 0.22 * v.vh, lo.seg.y0 + lo.dyFrom + 2.4 - (v.vh - hud) * 0.9) - ry0) * lw : ry0;
    // (but never leaving him out of the picture: on a narrow screen he is still well back from it)
    if (ck > 0) {
      const cx = Math.min(hx - v.vw * 0.15, Math.max(hx - v.vw * 0.85, nc.st.ox - v.vw / 2));
      return { x: rx + (cx - rx) * ck, y: ry + (nc.y0 - v.vh * (v.portrait ? 0.22 : 0.16) - ry) * ck };
    }
    return { x: rx, y: ry };
  }
  // how long the last frame took (ms, real time): the resolution follows it (dynamic resolution), aiming at 60 fps (a
  // 120 Hz screen that gets 60 is not slow). Each second whose frames run late on the whole (their 80th percentile past
  // 1.3 x 16.7 ms) takes the resolution a step down, and eight good seconds in a row try a step back up (after a step up
  // that failed, the next try waits twice as long: each step is a hitch of its own, the canvas and what is drawn at its
  // size made anew). Hitches (a tab coming back) are left out. Only at the lowest
  // resolution, still slow, do the glows go (quality 0), and they come back first.
  frameTime(ms) {
    if (ms > 250) return;
    const w = (this.win ??= []),
      wk = (this.works ??= []);
    w.push(ms);
    wk.push(this.work ?? 0);
    if (w.length < 60) return;
    const sorted = [...w].sort((a, b) => a - b),
      works = [...wk].sort((a, b) => a - b);
    w.length = wk.length = 0;
    const budget = 1000 / 60,
      p80 = sorted[Math.floor(sorted.length * 0.8)],
      work = works[Math.floor(works.length * 0.8)],
      now = performance.now();
    // (a step down that did not make the frames faster while the frames' own work is well inside the budget: the frame
    // rate is capped (a battery saver holds the screen to 30 fps), not the drawing slow; the step is undone and none is
    // tried for a while. Frames slow with their work over the budget are slow drawing, even if a step down did not show
    // yet in the frame gaps (they come in whole refreshes: 33 ms before and after): never taken for a cap)
    // (each time it is found capped again, it waits twice as long: every step down and back is two hitches)
    if (this.downAt && p80 > this.before * 0.9 && work < budget * 0.75) {
      this.capWait = Math.min(240000, (this.capWait ?? 15000) * 2);
      this.capped = now + this.capWait;
      this.step--;
      this.resize();
    }
    this.downAt = 0;
    this.slow = p80;
    if (p80 > budget * 1.3 && !(now < this.capped)) {
      this.good = 0;
      if (this.step < SCALES.length - 1) {
        this.downAt = now;
        this.before = p80;
        // (a step up undone at once: wait longer before the next)
        if (now - (this.upAt ?? -1e9) < 3000) this.wait = Math.min(64, (this.wait ?? 8) * 2);
        this.step++;
        this.resize();
      } else if (this.quality) this.quality = 0;
    } else if (p80 < budget * 1.1 && ++this.good >= (this.wait ?? 8) && (this.step > 0 || !this.quality)) {
      this.good = 0;
      this.upAt = now;
      if (!this.quality) this.quality = 1;
      else {
        this.step--;
        this.resize();
      }
    }
  }
  // the events since the last frame: the run's (hits, grades, landings) and the cursor's slams
  events(run, t, T) {
    const v = this.view;
    for (; this.lastEvent < run.fx.length; this.lastEvent++) {
      const e = run.fx[this.lastEvent];
      // (a boss's fist kicked back, or a piece of the cursor, flies off by itself: no clone to throw)
      if (e.k === 'ko' && e.o?.skin !== 'fist' && e.o?.skin !== 'bit') this.pendingKO.push(e);
      // (a big blow holds the world's picture a few frames, the music running on: juice.js)
      this.stop.add(e, run);
      v.addTrauma(this.particles.event(e, T));
      // a blow landing (a clone, a pane, a thing beaten): the camera knocked the way it goes, and an impact frame (post.js:
      // speed lines from the point it lands on; the picture inverted for a frame on the big ones: a clone at the streak's
      // top tiers or in the overdrive, a pane kicked through, a lid burst up through on a drop)
      if (e.k === 'ko' || e.k === 'smash' || e.k === 'shatter' || (e.k === 'prop' && e.o?.type === 'bat')) {
        const back = e.back ? -1 : 1;
        v.kick(e.t, back, e.k === 'shatter' && e.up ? -0.4 : 0.15, e.k === 'ko' ? 0.2 : 0.12);
        this.impacts.push({ t: e.t, x: e.x, y: e.y, big: (e.k === 'ko' && (run.tier >= 2 || !!run.od)) || (e.k === 'smash' && !e.dash) || !!e.lid });
        if (this.impacts.length > 8) this.impacts.shift();
      }
    }
    const acts = this.plan.acts;
    while (this.lastAct < acts.length && acts[this.lastAct].ts <= t) {
      const a = acts[this.lastAct++];
      if (t - a.ts < 0.2) {
        v.addTrauma(this.particles.slam(a));
        // (and the screen's shockwave, post.js: from the act's first beat, in its new colours)
        this.actHit = { t: a.ts, col: T.line };
      }
    }
  }
  // the world breaking up with the music (particles): in a build the roof he has just left crumbles on each kick; in a
  // drop a piece of the place ahead blows apart on each downbeat; at the end of a cursor chase he catches it
  happenings(run, t, mf, T) {
    const L = run.L,
      s = L.segAt(t);
    if (run.mode !== 'run' || L.vertical(s)) return;
    const x = L.xAt(t),
      st = (tt, xx) => ({ t: tt, x: xx });
    if (mf.build > 0.2 && mf.kickT !== this.lastKick && t - mf.kickT < 0.05) {
      this.lastKick = mf.kickT;
      this.particles.event({ k: 'crumble', ...st(t, x - 2.5 - 1.5 * mf.build), y: s.y0 }, T);
    }
    if (mf.amp >= 1 && mf.down > 0.9 && this.lastDown !== Math.round(t * 4)) {
      this.lastDown = Math.round(t * 4);
      this.particles.event({ k: 'blast', ...st(t, x + 5 + 3 * ((t * 7.3) % 1)), y: s.y0 + 2.5 + 2 * ((t * 3.1) % 1) }, T);
    }
    const a = L.acts?.find(q => q.mode === 'cursorchase' && t >= q.t1 - 0.02 && t < q.t1 + 0.03);
    if (a && this.caught !== a) {
      this.caught = a;
      const e = { k: 'finisher', t, x: x + 1.5, y: s.y0 + 1.2 };
      this.view.addTrauma(this.particles.event(e, T) * 0.6);
      this.stop.add(e, run);
    }
  }
  draw(run, t) {
    // (every blend mode the layers use drawn once, a speck in a corner, before anything: the graphics card builds its
    // program for each the first time it is used, a stall of a frame or more if that is mid-song (a lens first coming
    // on); here it is paid at the start)
    if (!this.warm) {
      this.warm = true;
      const g = this.g ?? this.canvas?.getContext('2d');
      if (g) {
        g.save();
        g.globalAlpha = 0.004;
        g.fillStyle = '#808080';
        for (const op of ['lighter', 'multiply', 'screen', 'difference', 'overlay', 'soft-light', 'saturation', 'destination-in', 'destination-out', 'source-in']) {
          g.globalCompositeOperation = op;
          g.fillRect(0, 0, 1, 1);
        }
        g.restore();
      }
    }
    this.ensure(run);
    const v = this.view,
      g = this.g,
      L = run.L,
      tt = Math.max(0, t),
      s = L.segAt(tt),
      heroSeg = L.segAt(run.mode === 'dead' ? run.deadT : tt),
      dt = this.lastT === null ? 0 : Math.min(0.05, Math.max(0, t - this.lastT)),
      mf = this.fx(tt);
    this.lastT = t;
    // (the roof 30 % up the screen; a phone held sideways in two thumbs covers its lower corners: higher, so he and what
    // comes at him are above them)
    v.roofUp = this.touch && !v.portrait ? 0.4 : 0.3;
    // (a climb: the camera pulled well back, so the beams the cursor brings and their notes are in the picture with him,
    // the next one and the one after: a picture 14 m tall on any screen)
    // (pulling back gradually from four seconds before it, as he runs up to the edge, so the cursor bringing the first
    // beams is seen whole, notes and all)
    const near = L.segs.find(q => q.climb && tt > q.t0 - 4 && tt < q.t1 + 0.8),
      cw = near ? Math.min(clamp((tt - (near.t0 - 4)) / 2.5, 0, 1), 1 - clamp((tt - near.t1) / 0.8, 0, 1)) : 0;
    // (a ladder of islands: pulled back for the next island, renderer.ladder)
    v.widen(Math.min(1 - (1 - Math.min(1, v.H / v.ppm0 / 17)) * (cw * cw * (3 - 2 * cw)), this.ladder(run, tt)?.zoom ?? 1));
    v.follow(this.cameraTarget(run, tt, heroSeg), dt, run.mode === 'run' && t - run.landT > (heroSeg.turn ? 1.1 : 0.5));
    // (the camera's speed along the stage, for what moves against it: the weather's streaks, weather/kit.js)
    if (dt > 0) {
      const cvx = (v.x - (this.camX ?? v.x)) / dt;
      if (Math.abs(cvx) < 40) v.cvx = (v.cvx ?? cvx) + (cvx - (v.cvx ?? cvx)) * Math.min(1, dt / 0.05);
    }
    this.camX = v.x;
    v.cvy = v.vy;
    // (the backdrop rests where the camera rests on the roof he is on)
    // (down or up a shaft: from the roof above to the one below as far as he has got down it, not by the clock, so the
    // far rows never drift the wrong way against his fall)
    let ry = restY(L, tt);
    if (L.vertical(heroSeg) && run.mode !== 'dead') {
      const i = L.segs.indexOf(heroSeg),
        a = L.segs[i - 1]?.y1 ?? heroSeg.y0,
        b = L.segs[i + 1]?.y0 ?? heroSeg.y1;
      if (Math.abs(b - a) > 0.5) ry = a + (b - a) * clamp((run.y - a) / (b - a), 0, 1);
    }
    v.rest = ry - v.vh * v.roofUp;
    // the colours (look.js: the act's, at the hour the song has got to; the overdrive is a drop of the player's own: the
    // drop's palette all through it) and the shot (director.js)
    const place = L.placeAt?.(tt) ?? L.place,
      lk = this.looks[place] ?? this.look,
      sc = lk.sceneAt(tt),
      T = lk.palAt(tt, mf.amp >= 1 || !!run.od),
      day = lk.dayAt(tt),
      shot = this.director(tt);
    this.events(run, t, T);
    if (dt > 0) this.particles.trail(run, tt, mf);
    // (as the song grows the place shows more of itself: its third landmark from halfway)
    // (one object per look, its frame's own fields set on it over the look's: a copy of the look each frame was garbage)
    const look = this.frameLook(lk, sc, day, mf),
      f = { g, v, run, L, T, look, t, tv: shot.tv, shot, dt, mf, plan: this.plan, seg: s, heroSeg, seen: this.seen, trail: this.trail, effects: this.effects, touch: this.touch, controls: this.controls, safe: this.safe, hints: this.hints ?? 'auto', teach: this.teach ?? null, marks: new Map(), spots: {}, place, flip: 1, glow: this.quality, impacts: this.impacts, actHit: this.actHit, paused: this.pausedFor ?? 0, R: this };
    // the music in the camera, as hard as the song (look.react) and the player's effects setting allow: a punch on
    // each downbeat and kick, a big one on a drop, creeping in through a build, the bass pumping a hard song's world;
    // the drop, the build and a hard song's kicks shake it; a chill song's camera breathes slowly instead
    // (the music decides when and how hard, the field (physics.js) how: each punch taken up over about 50 ms, never in
    // one frame, the music's zoom all told never past 8 %; the camera's every motion gone with the effects setting at 0
    // or reduced motion asked for, km)
    // (the effects turned well down: no flashes, negative frames or glitches either, as with reduced motion)
    this.post.calm = this.glitch.calm = this.effects < 0.35;
    const k = this.effects * (this.reduced ? 0.3 : 1),
      km = this.reduced ? 0 : this.effects,
      rx = lk.react * k,
      rm = lk.react * km,
      F = fieldOf(f),
      q = name => (F ? at(F, name, tt) : 0),
      breathe = (1 - lk.react) * km * 0.012 * Math.sin((2 * Math.PI * tt) / (8 * L.A.beat)),
      punch = rm * (q('Zd') + q('Zb') * lk.react + q('Zp')),
      zoom = shot.zoom + km * shot.move + 0.08 * Math.tanh(punch / 0.08) + 0.05 * km * q('Zu') + breathe,
      // (the music's shake as trauma (squared in view.js with the blows'): the drop's, a build's kicks, a hard song's)
      shake = rm * Math.sqrt(0.35 * q('Sd') + 0.15 * q('Sb') + 0.1 * q('Sk') * (lk.react > 0.6 ? 1 : 0));
    // (the world answers the flow: harder the higher his streak, hardest in the overdrive)
    f.react = Math.min(1.3, rx * (1 + 0.15 * run.tier + (run.od ? 0.4 : 0)));
    // (the first frame of a run: what would otherwise be built on the first blow is built now)
    if (!this.warmed) {
      this.warmed = true;
      const foe = L.obs.find(o => o.type === 'foe' || o.type === 'foeback');
      if (foe) this.kos.warm(f, foe);
      this.particles.warm(T);
      // (the props' sprites, each in the palette it will be seen in: layers/props.js)
      warmProps(f);
      // (spare canvases for the glows of colours first met while it plays: util.js)
      warmGlows();
      // (the pictures the song's worlds paint once and stamp: world/render.js)
      warmWorld(f, this.looks ?? { [L.place]: lk }, LOOKS);
    }
    for (const e of this.pendingKO.splice(0)) this.kos.add(f, e.o, e.t, e.swept, e.back);
    if (dt > 0 && run.J && run.mode === 'run') {
      this.history.push(Float32Array.from(run.J));
      if (this.history.length > 14) this.history.shift();
    } else if (run.mode !== 'run') this.history.length = 0;
    // (the cursor's tools on the camera: rotate tips the world one way then the other bar by bar, zoom pushes in and
    // eases off; character.js)
    const tool = L.tools?.find(q => tt >= q.t0 && tt < q.t1),
      tu = tool ? Math.min(smooth(tool.t0, tool.t0 + L.A.beat, tt), 1 - smooth(tool.t1 - L.A.beat, tool.t1, tt)) : 0,
      bar = Math.floor((tt - (tool?.t0 ?? 0)) / (4 * L.A.beat)),
      ease = smooth(0, 0.6 * L.A.beat, (tt - (tool?.t0 ?? 0)) % (4 * L.A.beat)),
      sw = (n => (n % 2 ? 1 : -1))(bar),
      // (a climb: the camera leans into each leap, the way he goes, easing back as he lands: side to side up the climb)
      cp = run.climbPose,
      // (and pulls back through it, so the beams the cursor lets go above him are in the picture)
      climbOut = 1,
      lean = cp && !cp.wall && !cp.entry && !cp.falling ? 0.07 * (cp.face ?? 1) * Math.sin(Math.PI * Math.min(1, cp.u ?? 0)) : 0,
      // (and as he lands on a beam it kicks the other way and judders, the beam's weight taking his, on the beat)
      // (taken up over 30 ms, not in the frame he lands)
      landed = cp?.wall && (cp.since ?? 1) < 0.3 ? (1 - (cp.since ?? 0) / 0.3) * (1 - Math.exp(-(cp.since ?? 0) / 0.03)) : 0,
      landTip = -0.06 * (cp?.face ?? 1) * landed * landed,
      // (every tilt of the camera the camera's motion: gone with the effects at 0 or reduced motion)
      rot = ((tool?.tool === 'rotate' ? tu * 0.2 * (sw * ease + -sw * (1 - ease)) : 0) + lean + landTip + shot.rot) * km,
      // (never out past the world's edges: zoom only pushes in, and a tipped frame is pushed in to keep its corners)
      zf = (tool?.tool === 'zoom' ? 1 + km * tu * (0.15 + 0.13 * sw * (2 * ease - 1)) : 1) * (1 + 1.1 * Math.abs(rot));
    const sz = this.shaftZoom(run, tt, heroSeg),
      // (the zoom's pivot: in a shaft him, the camera following him there; on a roof where he rests in the picture, a
      // metre over the roof's line, so his jumps never swing the world about with the music's punches; handed from one to
      // the other over 0.4 s either side of a shaft's ends)
      vert = run.mode === 'dead' ? 0 : this.inShaft(L, heroSeg, tt),
      pivotY = v.sy(run.y + 1) * vert + (v.H - (v.vh * v.roofUp + 1) * v.ppm) * (1 - vert),
      pivotX = v.sx(onStage(heroSeg, run.heroX(tt))) * vert + (heroSeg.st.dir > 0 ? v.lead * v.ppm : v.W - v.lead * v.ppm) * (1 - vert);
    v.motion = km;
    v.apply(g, t, (v.tight ? Math.min(1.04, zoom * zf) : zoom * zf) * sz * climbOut, pivotX, pivotY, Math.hypot(shake, 0.6 * landed * km), rot);
    // (a ceiling act: the world turned over, through flat, on its first beat and back on its last)
    // (and back over once he has won, so he stands on his feet at the end)
    const over = modeAmount(L, tt, 'ceiling') * (run.victory ? Math.max(0, 1 - (tt - run.victory.t0) / L.A.beat) : 1);
    f.upside = over > 0.5;
    if (over > 0) g.transform(1, 0, 0, Math.cos(Math.PI * over), 0, (1 - Math.cos(Math.PI * over)) * v.H * 0.5);
    // (a mirror act: the world turned left to right too, through edge-on on its first beat; the keys swap with it,
    // main.js; what must read the right way round is drawn upright, f.flip)
    const side = modeAmount(L, tt, 'mirror');
    if (side > 0) {
      g.transform(Math.cos(Math.PI * side), 0, 0, 1, (1 - Math.cos(Math.PI * side)) * v.W * 0.5, 0);
      if (side > 0.5) f.flip = -1;
    }
    this.happenings(run, tt, mf, T);
    // (the world behind him on its own clock: slowed in the inhale before a drop)
    // (its moments of the music on that clock too, so 'since the last kick' stays true)
    const lag = tt - shot.tv,
      fw = lag === 0 ? f : { ...f, t: shot.tv, dt: shot.inhale ? f.dt * 0.2 : f.dt, mf: { ...mf, kickT: mf.kickT - lag, snareT: mf.snareT - lag, dropT: mf.dropT - lag } };
    this.frameNo = (this.frameNo ?? 0) + 1;
    f.snap = fresh => this.snapshot(g, fresh);
    f.snapStale = () => (this.snapAt = -1);
    // (what must stay readable, words and key hints, under a lens over the whole world is drawn after the lens and the
    // screen's effects (its bloom, its glitches), where it would have been: kept with the frame's transform and alpha)
    const labels = [];
    f.lensed = overAll(f);
    f.pixelated = f.lensed && pixelated(f);
    // (and with which way the frame read then: a stretch run to -x is drawn mirrored, its words turned back upright)
    f.label = f.lensed ? fn => labels.push([g.getTransform(), g.globalAlpha, fn, f.flip]) : fn => fn();
    f.flushLabels = () => {
      const flip = f.flip;
      for (const [m, a, fn, fl] of labels) {
        g.setTransform(m);
        g.globalAlpha = a;
        f.flip = fl;
        fn();
      }
      f.flip = flip;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
    };
    // (the song's lenses warmed on its run's first frame, lens.js warmLenses)
    if (this.warmFor !== run) {
      this.warmFor = run;
      warmLenses(f, this.actLayer(g).canvas);
      this.warmRun(f);
    }
    if (!f.lensed) {
      this.lensWorld(f);
      for (const layer of this.world) this.layer(layer, this.behind.has(layer) ? fw : f);
    } else {
      // (the world, its front too, under the lens; then what he must read over it on a canvas of its own, in the frame's
      // transform as it stood, and laid on with the lens's ink round it)
      const T0 = g.getTransform(),
        a0 = g.globalAlpha;
      for (const layer of this.world) if (!this.acting.has(layer)) this.layer(layer, this.behind.has(layer) ? fw : f);
      g.setTransform(1, 0, 0, 1, 0, 0);
      this.lensWorld(f);
      const A = this.actLayer(g);
      A.setTransform(T0);
      A.globalAlpha = a0;
      f.g = A;
      try {
        for (const layer of this.world) if (this.acting.has(layer)) layer(f);
      } finally {
        f.g = g;
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      inkAction(f, g, A.canvas);
      f.snapStale();
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    for (const layer of this.screen) layer(f);
  }
}
