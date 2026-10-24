// What players do, counted (PostHog, product analytics): the page opened (where from: its utm tags and referrer, PostHog
// reads them), a song loaded and started (which, from where, how hard, with what modifiers), how its run ended (won,
// died where, quit) and the lesson. Anonymous: an id kept in the browser's storage, no cookies, no names; nothing of the
// player's own songs leaves the device but their length and where they came from (a file, a link).
// Off on the developer's own machine, under the tests and the bot, and while KEY is empty. The library is fetched after
// the page has loaded, when the browser is idle; events before it are queued.
const KEY = '',
  HOST = 'https://us.i.posthog.com',
  LIB = 'https://us-assets.i.posthog.com/static/array.js',
  Q = new URLSearchParams(location.search),
  OFF = !KEY || /^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname) || Q.has('probe') || Q.has('bot') || navigator.webdriver;

const queue = [];
let ph = null,
  loading = false;

function load() {
  if (OFF || loading) return;
  loading = true;
  const go = () => {
    const s = document.createElement('script');
    s.src = LIB;
    s.async = true;
    s.onload = () => {
      const p = window.posthog;
      if (!p?.init) return;
      p.init(KEY, {
        api_host: HOST,
        persistence: 'localStorage',
        person_profiles: 'always',
        autocapture: false,
        capture_pageview: true,
        capture_pageleave: true,
        disable_session_recording: true,
        // (the game's frame loop is busy: no heatmaps, dead-click watching, surveys or network timing over the canvas;
        // the events are sent by hand (game analytics' practice); the page's load (web vitals) is measured; a script
        // error on a player's device is caught)
        enable_heatmaps: false,
        capture_dead_clicks: false,
        capture_performance: { web_vitals: true, network_timing: false },
        disable_surveys: true,
        capture_exceptions: true,
      });
      ph = p;
      for (const [e, props] of queue.splice(0)) ph.capture(e, props);
    };
    document.head.appendChild(s);
  };
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 4000 });
  else setTimeout(go, 1500);
}

// the player's life in the game, kept on the device and sent with every event (the funnel's goals: a first song
// finished, three, a return the next day): the day first seen, songs ended (won or lost) and won, all time
const LIFE = 'struna.life';
function life(event, props) {
  let L;
  try {
    L = JSON.parse(localStorage.getItem(LIFE) ?? 'null');
  } catch {
    L = null;
  }
  const today = Math.floor(Date.now() / 864e5);
  L ??= { first: today, songs: 0, wins: 0 };
  if (event === 'song_end') {
    L.songs++;
    if (props.result === 'win') L.wins++;
  }
  try {
    localStorage.setItem(LIFE, JSON.stringify(L));
  } catch {
    // (storage off: counted for this page only)
  }
  return { day: today - L.first, life_songs: L.songs, life_wins: L.wins };
}

// an event with its properties (sent at once if the library is in, else when it comes)
export function track(event, props = {}) {
  props = { ...props, ...life(event, props) };
  // (?tlog: the events written to the console, sent or not, to check them)
  if (Q.has('tlog')) console.log('[track]', event, JSON.stringify(props));
  if (OFF) return;
  if (ph) ph.capture(event, props);
  else if (queue.length < 100) queue.push([event, props]);
}

if (!OFF) {
  if (document.readyState === 'complete') load();
  else addEventListener('load', load, { once: true });
}
