// The trophies and the story's logs. (The songs screen itself: select.js.)
import { LOGS } from '../meta.js';
import { SIGNS } from '../character.js';
import { tr, trName } from '../i18n.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);


export function drawMemory(meta) {
  const P = $('#panel'),
    cards = Object.values(meta.s.songs).filter(s => s.trophy);
  P.innerHTML = `<div class="sheet wide"><button class="x" aria-label="${tr('close')}">×</button><h3>${tr('MEMORY')}</h3><p class="a">${tr('{n} trophies · {w} wins', { n: cards.length, w: meta.s.wins })}</p>
    <div class="cards2">${cards.map(s => `<div class="trophy" style="--h:${s.trophy.hue}"><b>${esc(trName(s.trophy.name))}</b><small>${esc(s.title)} · ${tr(SIGNS[s.trophy.sign]?.name ?? '')}${s.found?.secret ? ' · ◆' : ''}</small></div>`).join('') || `<p class="a">${tr('win a song to keep its boss here')}</p>`}</div></div>`;
  P.hidden = false;
  P.querySelector('.x').onclick = () => (P.hidden = true);
}
// the story's logs found, and how many are still out there
export function drawLogs(meta) {
  const P = $('#panel');
  P.innerHTML = `<div class="sheet wide"><button class="x" aria-label="${tr('close')}">×</button><h3>${tr('LOGS')}</h3><p class="a">${meta.s.logs.length} / ${LOGS.length}</p>
    <div class="logs">${LOGS.map(([id, name, text]) => (meta.s.logs.includes(id) ? `<p><b>${tr('LOG {n}', { n: name.slice(4) })}</b> ${esc(tr(text))}</p>` : `<p class="lockd"><b>${tr('LOG {n}', { n: name.slice(4) })}</b> ████████ ██ ███████</p>`)).join('')}</div></div>`;
  P.hidden = false;
  P.querySelector('.x').onclick = () => (P.hidden = true);
}
