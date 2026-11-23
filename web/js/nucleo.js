const D = window.PAINEL;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const NS = 'http://www.w3.org/2000/svg';
const fmt = n => Number(n).toLocaleString('pt-BR');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const coll = new Intl.Collator('pt-BR');
const REG = D.regionais, MUN = D.municipios;
const munById = Object.fromEntries(MUN.map(m => [m.id, m]));
const ESC = D.escolas;
const regSorted = [...REG].sort((a, b) => coll.compare(a.nome, b.nome));
const regName = i => 'SRE ' + REG[i].nome;
/* movimento: reduzido quando o sistema pede */
const MOV = matchMedia('(prefers-reduced-motion: reduce)');
const comTransicao = fn => document.startViewTransition && !MOV.matches ? document.startViewTransition(fn) : fn();
/* número que conta do valor anterior até o novo (600 ms, saída forte) */
function contar(el, alvo, {casas = 0, suf = ''} = {}){
  const de = +el.dataset.v || 0; el.dataset.v = alvo;
  const f = x => x.toLocaleString('pt-BR', {minimumFractionDigits:casas, maximumFractionDigits:casas}) + suf;
  cancelAnimationFrame(el._raf);
  if (MOV.matches || de === alvo){ el.textContent = f(alvo); return; }
  const t0 = performance.now();
  const passo = now => { const k = Math.min(1, (now - t0) / 600); el.textContent = f(de + (alvo - de) * (1 - Math.pow(1 - k, 4))); if (k < 1) el._raf = requestAnimationFrame(passo); };
  el._raf = requestAnimationFrame(passo);
}
const pcsTotal = e => Object.values(e.parque).reduce((a, b) => a + b, 0);


/* ---------------- toast & modal ---------------- */
let toastT;
function toast(msg){ const t = $('#toast'); t.innerHTML = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200); }
function modal({title, body, foot, wide}){
  const root = $('#modalRoot');
  root.innerHTML = `<div class="ov"><div class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal-h"><h3>${esc(title)}</h3><button class="x" data-close aria-label="Fechar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <div class="modal-b">${body}</div><div class="modal-f">${foot}</div></div></div>`;
  const ov = root.firstElementChild;
  ov.addEventListener('click', ev => { if (ev.target === ov || ev.target.closest('[data-close]')) closeModal(); });
  const f = ov.querySelector('input,select,textarea'); if (f) setTimeout(() => f.focus(), 30);
  return ov;
}
/* sai em 140 ms; se outro modal abrir nesse meio-tempo, ele substitui este */
function closeModal(){
  const ov = $('#modalRoot .ov'); if (!ov || ov.classList.contains('saindo')) return;
  ov.classList.add('saindo'); setTimeout(() => ov.remove(), 150);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeSaved(); } });

/* ---------------- tabs ---------------- */
let curTab = 'dash';
function showTab(t){
  curTab = t;
  try { history.replaceState(null, '', '#' + TAB_HASH[t]); } catch {}
  $$('.tab').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === t));
  ['dash','rel','esc','doc'].forEach(k => $('#v-' + k).hidden = k !== t);
  if (t !== 'dash') stopCarousel();
  if (t === 'dash') requestAnimationFrame(() => setVB(vb));
  if (t === 'esc') renderEsc();
  if (t === 'rel') renderSheet();
  if (t === 'doc') renderDoc();
}
$$('.tab').forEach(b => b.addEventListener('click', () => {
  if (b.dataset.tab === 'esc' && curTab === 'esc') { escState = {view: escState.reg != null ? 'list' : 'pick', reg: escState.reg}; }
  comTransicao(() => showTab(b.dataset.tab));
}));

