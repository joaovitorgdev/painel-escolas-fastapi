/* =========================================================
   DASHBOARD
   ========================================================= */
const svg = $('#map');
const [VW, VH] = D.vb;
const full = {x:-10, y:-10, w:VW + 20, h:VH + 20};
let vb = {...full};
const st = {reg:null, mun:null};
const gM = document.createElementNS(NS, 'g'), gR = document.createElementNS(NS, 'g'), gL = document.createElementNS(NS, 'g'), gP = document.createElementNS(NS, 'g');
svg.append(gM, gR, gP, gL);
const munEls = {};
MUN.forEach(m => {
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', m.d); p.setAttribute('class', 'mun c' + REG[m.sre].cor);
  p.dataset.id = m.id; munEls[m.id] = p; gM.append(p);
});
const regEls = REG.map(r => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', r.d); p.setAttribute('class', 'reg'); gR.append(p); return p; });
const regLbls = REG.map(r => { const t = document.createElementNS(NS, 'text'); t.setAttribute('class', 'lbl'); t.textContent = r.nome.replace('Metropolitana ', 'Metrop. '); gL.append(t); return t; });
const LBL_ORDER = REG.map((r, i) => i).sort((a, b) => REG[b].bb[2] * REG[b].bb[3] - REG[a].bb[2] * REG[a].bb[3]);
const munLbl = document.createElementNS(NS, 'text'); munLbl.setAttribute('class', 'lbl'); gL.append(munLbl);
let pinEls = [];
function buildPins(){
  gP.innerHTML = '';
  pinEls = ESC.map(e => {
    const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'pin'); g.dataset.id = e.id;
    g.innerHTML = `<circle r="5"></circle><text x="9" y="4"></text>`;
    g.querySelector('text').textContent = e.nome;
    gP.append(g); return g;
  });
}
buildPins();

function scaleF(){ const r = svg.getBoundingClientRect(); if (!r.width) return 1; return Math.max(vb.w / r.width, vb.h / r.height); }
function setVB(v){
  vb = v; svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
  const f = scaleF();
  const showPinLbl = st.mun != null;
  pinEls.forEach((g, i) => {
    const e = ESC[i];
    g.setAttribute('transform', `translate(${e.x} ${e.y}) scale(${f})`);
    const vis = st.mun != null ? e.sre === st.reg : st.reg != null ? e.sre === st.reg : true;
    g.style.display = vis ? '' : 'none';
    const big = st.mun != null && e.mun === st.mun;
    g.classList.toggle('big', big);
    g.querySelector('circle').setAttribute('r', big ? 7 : st.reg != null ? 5.5 : 3.6);
    g.querySelector('text').style.display = (showPinLbl && big) ? '' : 'none';
  });
  const placed = [];
  LBL_ORDER.forEach(i => {
    const t = regLbls[i], r = REG[i];
    t.setAttribute('x', r.lbl[0]); t.setAttribute('y', r.lbl[1]);
    t.setAttribute('font-size', 9.5 * f); t.setAttribute('stroke-width', 2.6 * f);
    let show = st.reg == null || (st.reg === i && st.mun == null);
    if (show && st.reg == null){
      const w = t.textContent.length * 5.6 * f, h = 11 * f, bx = [r.lbl[0] - w / 2, r.lbl[1] - h, w, h + 2 * f];
      if (placed.some(p => bx[0] < p[0] + p[2] && p[0] < bx[0] + bx[2] && bx[1] < p[1] + p[3] && p[1] < bx[1] + bx[3])) show = false; else placed.push(bx);
    }
    t.style.display = show ? '' : 'none';
  });
  const hint = $('#legHint'); if (hint) hint.textContent = st.mun != null ? 'Clique numa escola para abrir o relatório' : st.reg != null ? 'Clique num município para ver as escolas' : 'Clique numa regional para aproximar';
  if (st.mun != null){
    const m = munById[st.mun];
    munLbl.textContent = m.nome; munLbl.style.display = '';
    munLbl.setAttribute('x', m.bb[0] + m.bb[2] / 2); munLbl.setAttribute('y', m.bb[1] - 6 * f);
    munLbl.setAttribute('font-size', 15 * f); munLbl.setAttribute('stroke-width', 3.5 * f);
  } else munLbl.style.display = 'none';
}
let anim;
function animateTo(t){
  cancelAnimationFrame(anim);
  const from = {...vb}, t0 = performance.now(), dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 650;
  const ease = x => 1 - Math.pow(1 - x, 4);
  const step = now => {
    const k = ease(Math.min(1, (now - t0) / dur));
    setVB({x: from.x + (t.x - from.x) * k, y: from.y + (t.y - from.y) * k, w: from.w + (t.w - from.w) * k, h: from.h + (t.h - from.h) * k});
    if (k < 1) anim = requestAnimationFrame(step);
  };
  anim = requestAnimationFrame(step);
}
function fitBox(bb, pad, minW){
  let [x, y, w, h] = bb;
  const cx = x + w / 2, cy = y + h / 2;
  w = Math.max(w * (1 + pad), minW); h = Math.max(h * (1 + pad), minW * VH / VW);
  const r = svg.getBoundingClientRect(); const ar = r.width && r.height ? r.width / r.height : VW / VH;
  if (w / h < ar) w = h * ar; else h = w / ar;
  return {x: cx - w / 2, y: cy - h / 2, w, h};
}
const HEAT = {
  wifi:{l:'% com Wi-Fi', f:s => s.length ? 100 * s.filter(e => e.wifi.possui).length / s.length : null, u:'%'},
  sala:{l:'% com sala', f:s => s.length ? 100 * s.filter(e => e.sala.possui).length / s.length : null, u:'%'},
  vel:{l:'Mbps médio', f:s => s.length ? s.reduce((a, e) => a + e.con.vel, 0) / s.length : null, u:' Mbps'},
  obra:{l:'% obras concluídas', f:s => s.length ? 100 * s.filter(e => e.con.obra.startsWith('Concluída')).length / s.length : null, u:'%'},
  pcs:{l:'PCs/escola', f:s => s.length ? s.reduce((a, e) => a + pcsTotal(e), 0) / s.length : null, u:''}};
let heat = 'cor';
function paintMap(){
  const leg = $('#heatLeg');
  if (heat === 'cor'){ MUN.forEach(m => { munEls[m.id].style.fill = ''; }); leg.hidden = true; return; }
  const H = HEAT[heat], vals = REG.map(r => H.f(ESC.filter(e => e.sre === r.id)));
  const nz = vals.filter(v => v != null), lo = Math.min(...nz), hi = Math.max(...nz), span = (hi - lo) || 1;
  MUN.forEach(m => { const v = vals[m.sre]; munEls[m.id].style.fill = v == null ? 'var(--surface-2)' : `color-mix(in srgb, var(--accent) ${Math.round(12 + 88 * (v - lo) / span)}%, var(--surface-2))`; });
  const f = v => Math.round(v).toLocaleString('pt-BR') + H.u;
  leg.hidden = false; leg.innerHTML = `<b>${H.l}</b><span>${f(lo)}</span><i class="hbar"></i><span>${f(hi)}</span>`;
}
$('#heatSel').addEventListener('change', e => { heat = e.target.value; paintMap(); });
function applyMap(){
  MUN.forEach(m => {
    const el = munEls[m.id];
    el.classList.toggle('dim', st.reg != null && m.sre !== st.reg);
    el.classList.toggle('soft', st.mun != null && m.sre === st.reg && m.id !== st.mun);
    el.classList.toggle('hl', st.mun === m.id);
  });
  regEls.forEach((p, i) => p.classList.toggle('sel', i === st.reg));
  if (st.mun != null) { const hl = munEls[st.mun]; hl.parentNode.append(hl); }
  let target = full;
  if (st.mun != null) target = fitBox(munById[st.mun].bb, 1.1, 46);
  else if (st.reg != null) target = fitBox(REG[st.reg].bb, .14, 60);
  else { const r = svg.getBoundingClientRect(); target = fitBox([0, 0, VW, VH], .02, 0); }
  animateTo(target);
  renderCrumbs();
}
function renderCrumbs(){
  const c = $('#crumbs'); let h = `<button data-lv="state">Minas Gerais</button>`;
  if (st.reg != null) h += `<span class="sep">›</span><button data-lv="reg">${esc(regName(st.reg))}</button>`;
  if (st.mun != null) h += `<span class="sep">›</span><button data-lv="mun" disabled>${esc(munById[st.mun].nome)}</button>`;
  c.innerHTML = h;
}
$('#crumbs').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  stopCarousel();
  if (b.dataset.lv === 'state') select(null, null);
  if (b.dataset.lv === 'reg') select(st.reg, null);
});

// map interactions
const tip = $('#tip'), box = $('#mapBox');
function placeTip(ev, html){
  tip.innerHTML = html; tip.style.opacity = 1;
  const r = box.getBoundingClientRect();
  let x = ev.clientX - r.left + 14, y = ev.clientY - r.top + 14;
  if (x + 240 > r.width) x -= 260;
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
}
svg.addEventListener('mousemove', ev => {
  const pin = ev.target.closest('.pin');
  if (pin){ const e = ESC.find(s => s.id == pin.dataset.id); placeTip(ev, `<b>${esc(e.nome)}</b><br>${esc(munById[e.mun].nome)} · ${fmt(e.alunos)} alunos<br>Clique para abrir o relatório`); return; }
  const p = ev.target.closest('.mun');
  if (p){ const m = munById[p.dataset.id]; const n = ESC.filter(e => e.mun === m.id).length;
    placeTip(ev, `<b>${esc(m.nome)}</b><br>${esc(regName(m.sre))}<br>${n ? n + (n > 1 ? ' escolas cadastradas' : ' escola cadastrada') : 'Nenhuma escola cadastrada'}`); return; }
  tip.style.opacity = 0;
});
svg.addEventListener('mouseleave', () => tip.style.opacity = 0);
svg.addEventListener('click', ev => {
  const pin = ev.target.closest('.pin');
  if (pin){ stopCarousel(); openSchool(+pin.dataset.id); return; }
  const p = ev.target.closest('.mun'); if (!p) return;
  stopCarousel();
  const m = munById[p.dataset.id];
  if (st.reg !== m.sre) select(m.sre, null);
  else select(m.sre, m.id);
});
window.addEventListener('resize', () => { if (curTab === 'dash') applyMap(); });

// filters
function fillReg(){
  $('#fReg').innerHTML = `<option value="">Todas as regionais</option>` + regSorted.map(r => `<option value="${r.id}">${esc('SRE ' + r.nome)}</option>`).join('');
}
function fillMun(){
  const list = MUN.filter(m => st.reg == null || m.sre === st.reg).sort((a, b) => coll.compare(a.nome, b.nome));
  const cnt = id => ESC.filter(e => e.mun === id).length;
  const withE = list.filter(m => cnt(m.id)), without = list.filter(m => !cnt(m.id));
  $('#fMun').innerHTML = `<option value="">${st.reg == null ? 'Todos os municípios' : 'Todos da regional'}</option>`
    + `<optgroup label="Com escolas cadastradas">` + withE.map(m => `<option value="${m.id}">${esc(m.nome)} (${cnt(m.id)})</option>`).join('') + `</optgroup>`
    + `<optgroup label="Demais municípios">` + without.map(m => `<option value="${m.id}">${esc(m.nome)}</option>`).join('') + `</optgroup>`;
}
function select(reg, mun){
  st.reg = reg; st.mun = mun;
  fillMun();
  $('#fReg').value = reg ?? ''; $('#fMun').value = mun ?? '';
  applyMap(); renderIndicators();
}
$('#fReg').addEventListener('change', e => { stopCarousel(); select(e.target.value === '' ? null : +e.target.value, null); });
$('#fMun').addEventListener('change', e => { stopCarousel(); const v = e.target.value; if (v === '') select(st.reg, null); else select(munById[v].sre, v); });

// indicators
function scope(){ return ESC.filter(e => (st.reg == null || e.sre === st.reg) && (st.mun == null || e.mun === st.mun)); }
function donut(el, pct){
  const R = 42, C = 2 * Math.PI * R;
  if (!el.querySelector('.arc')){
    el.innerHTML = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${R}" fill="none" stroke="var(--accent-soft)" stroke-width="12"/><circle class="arc" cx="50" cy="50" r="${R}" fill="none" stroke="var(--accent)" stroke-width="12" stroke-linecap="round" stroke-dasharray="0 ${C}"/></svg><div class="v num">0%</div>`;
    el.getBoundingClientRect();
  }
  el.querySelector('.arc').setAttribute('stroke-dasharray', `${C * pct / 100} ${C}`);
  contar(el.querySelector('.v'), Math.round(pct), {suf:'%'});
}
const DEV = [
  {k:'chromebooks', t:'Chromebooks', ic:'cb'}, {k:'pos81', t:'Positivo 81 2021', ic:'mini'}, {k:'pos230', t:'Positivo 230 2021', ic:'nb'},
  {k:'daten', t:'Daten 122 2017', ic:'sff'}, {k:'pos06', t:'Positivo 06 2015', ic:'tower'}, {k:'outros', t:'Outros computadores', ic:'mon'}];
const ICONS = {
  cb:`<svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="2"><rect x="14" y="4" width="36" height="24" rx="2" fill="var(--surface)"/><path d="M8 32h48l-3 4H11z" fill="var(--line)"/></svg>`,
  mini:`<svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="2"><rect x="26" y="3" width="12" height="34" rx="2" fill="var(--ink)" opacity=".85"/><path d="M30 8h4" stroke="var(--surface)"/></svg>`,
  nb:`<svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 4h34l4 26H11z" fill="var(--ink)" opacity=".8"/><path d="M6 31h52l-2 5H8z" fill="var(--ink)" opacity=".9"/></svg>`,
  sff:`<svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="2"><rect x="24" y="2" width="16" height="36" rx="2" fill="var(--ink)" opacity=".85"/><circle cx="32" cy="8" r="1.5" fill="var(--surface)"/></svg>`,
  tower:`<svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="2"><rect x="21" y="2" width="22" height="36" rx="2" fill="var(--ink)" opacity=".85"/><path d="M26 8h12M26 12h12" stroke="var(--surface)"/></svg>`,
  mon:`<svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="2"><rect x="12" y="3" width="40" height="26" rx="2" fill="var(--surface)"/><path d="M32 29v6M22 37h20"/></svg>`};
function renderIndicators(){
  const s = scope(), n = s.length || 1;
  // KPIs
  if (st.mun != null){ $('#kMunLab').textContent = 'Município'; $('#kMun').textContent = munById[st.mun].nome; $('#kMun').dataset.v = ''; $('#kMun').classList.add('txt'); $('#kMunSub').textContent = regName(st.reg); }
  else { $('#kMunLab').textContent = 'Total de municípios'; $('#kMun').classList.remove('txt');
    contar($('#kMun'), st.reg == null ? MUN.length : MUN.filter(m => m.sre === st.reg).length);
    $('#kMunSub').textContent = st.reg == null ? `em ${REG.length} regionais` : regName(st.reg); }
  contar($('#kEsc'), s.length);
  $('#scopeLab').textContent = st.mun != null ? munById[st.mun].nome : st.reg != null ? regName(st.reg) : 'Minas Gerais';
  donut($('#dnInfo'), s.length ? 100 * s.filter(e => e.sala.possui).length / n : 0);
  donut($('#dnWifi'), s.length ? 100 * s.filter(e => e.wifi.possui).length / n : 0);
  if (s.length) contar($('#kLinks'), s.reduce((a, e) => a + e.con.links, 0) / n, {casas:1}); else { $('#kLinks').textContent = '—'; $('#kLinks').dataset.v = ''; }
  contar($('#kAps'), s.reduce((a, e) => a + e.wifi.aps, 0));
  // velocity
  const B = [['0–300', v => v <= 300], ['301–600', v => v > 300 && v <= 600], ['601–1000', v => v > 600 && v <= 1000], ['> 1000', v => v > 1000]];
  const cnts = B.map(([, f]) => s.filter(e => f(e.con.vel)).length);
  const mx = Math.max(1, ...cnts); const step = mx <= 4 ? 1 : mx <= 10 ? 2 : mx <= 25 ? 5 : 10; const top = Math.ceil(mx / step) * step;
  const ticks = []; for (let t = 0; t <= top; t += step) ticks.push(t);
  $('#velBars').innerHTML = `<h4>Faixa de velocidade contratada (Mbps) · nº de escolas</h4>` + B.map(([l], i) =>
    `<div class="bar"><span class="lab">${l}</span><div class="trk"><div class="bf" style="width:${100 * cnts[i] / top}%"></div></div><span class="val num">${cnts[i]}</span></div>`).join('')
    + `<div class="axis"><div></div><div class="num">${ticks.map(t => `<span>${t}</span>`).join('')}</div><div></div></div>`;
  const OB = [['Concluída', e => e.con.obra.startsWith('Concluída')], ['Em execução', e => e.con.obra === 'Em execução'], ['Prevista', e => e.con.obra.startsWith('Prevista')], ['Não prevista', e => e.con.obra === 'Não prevista']];
  $('#velBars').insertAdjacentHTML('beforeend', `<h4 style="margin-top:8px">Obras de cabeamento lógico e elétrico · nº de escolas</h4><div class="obras">${OB.map(([l, f]) => `<div><b class="num" data-k="ob${l}" data-n="${s.filter(f).length}"></b><span>${l}</span></div>`).join('')}</div>`);
  // pcs
  const tot = {}; DEV.forEach(d => tot[d.k] = s.reduce((a, e) => a + e.parque[d.k], 0));
  const all = Object.values(tot).reduce((a, b) => a + b, 0);
  $('#pcs').innerHTML = DEV.map(d => `<div class="pc">${ICONS[d.ic]}<span class="n num" data-k="pc${d.k}" data-n="${tot[d.k]}"></span><span class="t" title="${d.t}">${d.t}</span></div>`).join('')
    + `<div class="pc total"><span class="n num" data-k="pctot" data-n="${all}"></span><span class="t">Computadores no total</span></div>`;
  // conta a partir do valor anterior de cada chave (o HTML é refeito a cada recorte)
  $$('[data-n]', $('#v-dash')).forEach(el => { el.dataset.v = ant[el.dataset.k] || 0; contar(el, +el.dataset.n); ant[el.dataset.k] = +el.dataset.n; });
}
const ant = {};

// carousel
let carT = null, carI = 0, carStart = 0, carRaf;
const CAR_MS = 6000;
function startCarousel(){
  carI = st.reg == null ? 0 : Math.max(0, regSorted.findIndex(r => r.id === st.reg));
  $('#btnCar').classList.add('on'); $('#btnCar span').textContent = 'Parar carrossel'; $('#carBar').hidden = false;
  const go = () => { const r = regSorted[carI]; select(r.id, null); $('#carName').textContent = 'SRE ' + r.nome; $('#carPos').textContent = `${carI + 1}/${regSorted.length}`; carStart = performance.now(); carI = (carI + 1) % regSorted.length; };
  go(); carT = setInterval(go, CAR_MS);
  const tick = now => { $('#carFill').style.width = Math.min(100, 100 * (now - carStart) / CAR_MS) + '%'; carRaf = requestAnimationFrame(tick); };
  carRaf = requestAnimationFrame(tick);
}
function stopCarousel(){
  if (!carT) return; clearInterval(carT); carT = null; cancelAnimationFrame(carRaf);
  $('#btnCar').classList.remove('on'); $('#btnCar span').textContent = 'Ativar carrossel'; $('#carBar').hidden = true;
}
$('#btnCar').addEventListener('click', () => carT ? stopCarousel() : startCarousel());

$('#btnExpDash').addEventListener('click', () => openDashExport());

