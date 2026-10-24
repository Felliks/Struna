// The results: a title, stars for the accuracy, the score, a strip of every obstacle along the song coloured by its
// grade (red: hit), the counts, and sharing (an image of the results and a line of text; never the song itself).
import { tr } from '../i18n.js';
import { icon } from '../render/icons.js';

const $ = s => document.querySelector(s);
const GRADE_COL = { perfect: '#ffe14d', great: '#5ee7ff', good: '#ffffff', hit: '#ff3b4f' };

// 3 stars from 95 %, 2 from 80 %, 1 for making it
export const starsFor = r => (!r.over.win ? 0 : r.acc >= 0.95 ? 3 : r.acc >= 0.8 ? 2 : 1);
// the song's rank (a letter, as rhythm games give one: osu!, Hi-Fi Rush) by accuracy, SS a flawless near-perfect run;
// and the next one up and how many more perfects it wanted (the misses made perfect first, then the goods, then the
// greats): the near miss that makes one more try
const RANKS = [
  ['SS', 0.97, '#ffe14d'],
  ['S', 0.93, '#ffd27a'],
  ['A', 0.85, '#5ee7ff'],
  ['B', 0.72, '#7dff9a'],
  ['C', 0, '#c9ccd2'],
];
export function rankOf(r) {
  if (!r.over.win) return null;
  const c = r.counts,
    i = RANKS.findIndex(([k, a]) => r.acc >= a && (k !== 'SS' || c.miss === 0));
  if (i <= 0) return { rank: RANKS[0], next: null, need: 0 };
  const n = c.perfect + c.great + c.good + c.miss,
    want = RANKS[i - 1][1] * n - (c.perfect + c.great * 0.75 + c.good * 0.5);
  // (each miss made perfect is worth a whole note, a good half, a great a quarter)
  let got = 0,
    need = 0;
  for (const [count, worth] of [[c.miss, 1], [c.good, 0.5], [c.great, 0.25]])
    for (let k = 0; k < count && got < want - 1e-9; k++) ((got += worth), need++);
  return { rank: RANKS[i], next: RANKS[i - 1], need };
}

function graph(run, level) {
  const cv = $('#rgraph'),
    g = cv.getContext('2d'),
    W = cv.width,
    H = cv.height,
    dur = level.A.dur;
  g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.06)';
  g.fillRect(0, H / 2 - 1, W, 2);
  for (const o of level.obs) {
    if (!o.res || o.res === 'skip') continue;
    const x = (o.t / dur) * W,
      col = o.res === 'hit' ? GRADE_COL.hit : GRADE_COL[o.grade] ?? '#888',
      h = o.res === 'hit' ? H * 0.9 : o.grade === 'perfect' ? H * 0.6 : o.grade === 'great' ? H * 0.45 : H * 0.3;
    g.fillStyle = col;
    g.fillRect(x - 1.5, (H - h) / 2, 3, h);
  }
  if (run.over && !run.over.win) {
    g.fillStyle = 'rgba(255,59,79,0.25)';
    g.fillRect((run.t / dur) * W, 0, W, H);
  }
}

export function showResults(run, level, title, isBest) {
  const r = run,
    stars = starsFor(r);
  $('#rtitle').textContent = tr(r.over.win ? (r.counts.miss === 0 ? 'FLAWLESS' : 'YOU MADE IT') : 'DELETED');
  // (the song itself is named on the panel under it: ui/select.js's cover, main.js)
  $('#rsub').textContent = r.over.win ? (isBest ? tr('new best') : '') : tr('Struna wins this time');
  $('#rsub').hidden = !$('#rsub').textContent;
  $('#rstars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  // (the rank, and the next one up: how many more perfects it wanted, in marks, no words)
  const rk = rankOf(r),
    el = $('#rrank');
  el.hidden = !rk;
  if (rk) {
    el.innerHTML = `<b style="color:${rk.rank[2]};text-shadow:0 0 18px ${rk.rank[2]}">${rk.rank[0]}</b>${rk.next ? `<small>→ <span style="color:${rk.next[2]}">${rk.next[0]}</span> +${rk.need} ★</small>` : ''}`;
  }
  $('#rscore').textContent = r.score.toLocaleString('en-US');
  // the counts as the marks the run showed (a star, a diamond, a dot, a cross; the longest streak a flame): no words
  $('#rstats').replaceChildren(
    ...[
      ['star', '#ffe14d', r.counts.perfect],
      ['diamond', '#5ee7ff', r.counts.great],
      ['dot', '#ffffff', r.counts.good],
      ['cross', '#ff2b3a', r.counts.miss],
      ['flame', '#ff8a3d', r.maxCombo],
    ].map(([name, col, n]) => {
      const el = document.createElement('span'),
        cv = document.createElement('canvas'),
        d = Math.min(2, devicePixelRatio || 1);
      el.className = 'stat';
      cv.width = cv.height = 28 * d;
      const g = cv.getContext('2d');
      icon(g, name, 14 * d, 14 * d, 22 * d, col);
      el.append(cv, String(n));
      return el;
    }),
  );
  $('#rstats').title = tr('max combo {c} · accuracy {a}%', { c: r.maxCombo, a: Math.round(r.acc * 100) });
  graph(r, level);
  $('#share').onclick = () => share(r, title, stars);
}

// an image card of the result
function card(r, title, stars) {
  const cv = document.createElement('canvas');
  cv.width = 1080;
  cv.height = 1080;
  const g = cv.getContext('2d');
  g.fillStyle = '#05070f';
  g.fillRect(0, 0, 1080, 1080);
  g.fillStyle = '#ff1a2e';
  g.shadowColor = '#ff1a2e';
  g.shadowBlur = 30;
  for (const x of [470, 610]) {
    g.beginPath();
    g.ellipse(x, 260, 46, 24, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.shadowBlur = 0;
  g.textAlign = 'center';
  g.fillStyle = '#f4f6ff';
  g.font = "900 64px Unbounded, 'Arial Black', sans-serif";
  g.fillText(tr(r.over.win ? (r.counts.miss === 0 ? 'FLAWLESS' : 'I MADE IT') : 'DELETED'), 540, 420);
  g.font = "700 40px 'JetBrains Mono', monospace";
  g.fillStyle = '#8a90ad';
  g.fillText(title.slice(0, 34), 540, 490);
  g.fillStyle = '#ffe14d';
  g.font = '90px sans-serif';
  g.fillText('★'.repeat(stars) + '☆'.repeat(3 - stars), 540, 630);
  g.font = "900 110px Unbounded, 'Arial Black', sans-serif";
  g.fillText(r.score.toLocaleString('en-US'), 540, 790);
  g.fillStyle = '#f4f6ff';
  g.font = "700 38px 'JetBrains Mono', monospace";
  g.fillText(tr('accuracy {a}% · combo {c}', { a: Math.round(r.acc * 100), c: r.maxCombo }), 540, 870);
  g.fillStyle = '#ff1a2e';
  g.font = "900 46px Unbounded, 'Arial Black', sans-serif";
  g.fillText('SIM.EXE', 540, 990);
  return cv;
}

async function share(r, title, stars) {
  const text = tr(r.over.win ? 'I ran "{title}" in SIM.EXE: {score} pts, {stars}, {acc}%' : 'The AI deleted me on "{title}" in SIM.EXE: {score} pts, {stars}, {acc}%', { title, score: r.score.toLocaleString('en-US'), stars: '★'.repeat(stars) + '☆'.repeat(3 - stars), acc: Math.round(r.acc * 100) }),
    blob = await new Promise(res => card(r, title, stars).toBlob(res, 'image/png')),
    file = new File([blob], 'sim-exe.png', { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) return await navigator.share({ files: [file], text });
    if (navigator.share) return await navigator.share({ text });
  } catch {
    // (the player closed the share sheet)
    return;
  }
  // no share sheet (a desktop browser): the image downloads and the text goes to the clipboard
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'sim-exe.png';
  a.click();
  try {
    await navigator.clipboard.writeText(text);
    $('#share').textContent = tr('copied');
  } catch {}
}
