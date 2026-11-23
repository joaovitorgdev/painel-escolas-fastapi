/* =========================================================
   RELATÓRIOS
   ========================================================= */
const yn = b => b ? 'Sim' : 'Não';
const VARS = [
  {g:'Identificação', k:'inep', l:'Código INEP', t:'text', f:e => e.inep},
  {g:'Identificação', k:'nome', l:'Escola', t:'text', f:e => e.nome},
  {g:'Identificação', k:'sre', l:'Regional (SRE)', t:'cat', f:e => REG[e.sre].nome},
  {g:'Identificação', k:'mun', l:'Município', t:'cat', f:e => munById[e.mun].nome},
  {g:'Identificação', k:'end', l:'Endereço', t:'text', f:e => e.end},
  {g:'Identificação', k:'tel', l:'Telefone', t:'text', f:e => e.tel},
  {g:'Identificação', k:'email', l:'E-mail', t:'text', f:e => e.email},
  {g:'Identificação', k:'alunos', l:'Alunos', t:'num', f:e => e.alunos},
  {g:'Identificação', k:'turmas', l:'Turmas', t:'num', f:e => e.turmas},
  {g:'Identificação', k:'turnos', l:'Turnos', t:'cat', f:e => e.turnos},
  {g:'Identificação', k:'mods', l:'Modalidades de ensino', t:'text', f:e => e.mods.join('; ')},
  {g:'Conectividade', k:'oper', l:'Operadora', t:'cat', f:e => e.con.oper},
  {g:'Conectividade', k:'tipo', l:'Tipo de link', t:'cat', f:e => e.con.tipo},
  {g:'Conectividade', k:'links', l:'Qtd. de links', t:'num', f:e => e.con.links},
  {g:'Conectividade', k:'vel', l:'Velocidade contratada (Mbps)', t:'num', f:e => e.con.vel},
  {g:'Conectividade', k:'prog', l:'Programa / contrato', t:'cat', f:e => e.con.prog},
  {g:'Conectividade', k:'pontos', l:'Pontos de rede lógica', t:'num', f:e => e.con.pontos},
  {g:'Conectividade', k:'rack', l:'Rack', t:'cat', f:e => e.con.rack},
  {g:'Conectividade', k:'obra', l:'Obra de cabeamento', t:'cat', f:e => e.con.obra},
  {g:'Sala de informática', k:'sala', l:'Possui sala de informática', t:'cat', f:e => yn(e.sala.possui)},
  {g:'Sala de informática', k:'salapcs', l:'Computadores na sala', t:'num', f:e => e.sala.pcs},
  {g:'Sala de informática', k:'salaest', l:'Situação da sala', t:'cat', f:e => e.sala.estado},
  {g:'Wi-Fi', k:'wifi', l:'Possui Wi-Fi', t:'cat', f:e => yn(e.wifi.possui)},
  {g:'Wi-Fi', k:'aps', l:'Pontos de acesso (APs)', t:'num', f:e => e.wifi.aps},
  {g:'Wi-Fi', k:'cob', l:'Cobertura estimada (%)', t:'num', f:e => e.wifi.cob},
  {g:'Wi-Fi', k:'ctrl', l:'Controladora', t:'cat', f:e => e.wifi.ctrl},
  {g:'Parque tecnológico', k:'chromebooks', l:'Chromebooks', t:'num', f:e => e.parque.chromebooks},
  {g:'Parque tecnológico', k:'pos81', l:'Positivo 81 2021', t:'num', f:e => e.parque.pos81},
  {g:'Parque tecnológico', k:'pos230', l:'Positivo 230 2021', t:'num', f:e => e.parque.pos230},
  {g:'Parque tecnológico', k:'daten', l:'Daten 122 2017', t:'num', f:e => e.parque.daten},
  {g:'Parque tecnológico', k:'pos06', l:'Positivo 06 2015', t:'num', f:e => e.parque.pos06},
  {g:'Parque tecnológico', k:'outros', l:'Outros computadores', t:'num', f:e => e.parque.outros},
  {g:'Parque tecnológico', k:'pctot', l:'Total de computadores', t:'num', f:e => pcsTotal(e)},
  {g:'Parque tecnológico', k:'proj', l:'Projetores', t:'num', f:e => e.proj},
  {g:'Parque tecnológico', k:'lousas', l:'Lousas digitais', t:'num', f:e => e.lousas},
  {g:'Parque tecnológico', k:'impr', l:'Impressoras', t:'num', f:e => e.impr},
  {g:'Acompanhamento dos NTEs', k:'nfotos', l:'Fotos enviadas', t:'num', f:e => photosOf(e).length},
  {g:'Acompanhamento dos NTEs', k:'ndocs', l:'Documentos da escola', t:'num', f:e => docsOf(e).length},
  {g:'Acompanhamento dos NTEs', k:'rede', l:'Situação da rede (NTE)', t:'cat', f:e => { const c = consol(e).rede; return c ? (REDE.find(x => x.k === c.v) || {t:'Não informada'}).t : 'Não informada'; }},
  {g:'Acompanhamento dos NTEs', k:'ultnte', l:'Última atualização do NTE', t:'text', f:e => { const r = regsOf(e)[0]; return r ? (fmtIso(r.data) || fmtDate(r.criadoEm)) : ''; }},
  {g:'Orçamentos de rede', k:'norc', l:'Orçamentos recebidos', t:'num', f:e => orcOf(e).length},
  {g:'Orçamentos de rede', k:'minorc', l:'Menor orçamento (R$)', t:'num', money:true, f:e => { const v = orcOf(e).filter(r => r.status !== 'rep' && r.valor > 0).map(r => r.valor); return v.length ? Math.min(...v) : null; }},
  {g:'Orçamentos de rede', k:'aprorc', l:'Orçamento aprovado (R$)', t:'num', money:true, f:e => { const v = orcOf(e).filter(r => r.status === 'apr'); return v.length ? v.reduce((a, r) => a + (+r.valor || 0), 0) : null; }},
  {g:'Orçamentos de rede', k:'storc', l:'Situação dos orçamentos', t:'cat', f:e => { const o = orcOf(e); if (!o.length) return 'Sem orçamento'; if (o.some(r => r.status === 'apr')) return 'Com aprovado'; if (o.some(r => r.status === 'ana')) return 'Em análise'; return 'Recebidos'; }},
];
const V = Object.fromEntries(VARS.map(v => [v.k, v]));
/* ---------------- relatórios: estado, modelos e cálculo ---------------- */
const MODELOS = [
  {id:'m0', modelo:true, nome:'Visão geral das escolas', desc:'Uma linha por escola com os principais dados.', cols:['nome','sre','mun','alunos','vel','wifi','sala','pctot'], filters:[], group:''},
  {id:'m5', modelo:true, nome:'Resumo por regional', desc:'Totais e médias de cada regional.', cols:['alunos','pctot','aps','vel','wifi','sala'], filters:[], group:'sre'},
  {id:'m1', modelo:true, nome:'Escolas sem Wi-Fi', desc:'Escolas que ainda não têm rede sem fio.', cols:['inep','nome','sre','mun','alunos','wifi','aps'], filters:[{k:'wifi', op:'eq', v:'Não'}], group:''},
  {id:'m2', modelo:true, nome:'Links abaixo de 300 Mbps', desc:'Escolas com velocidade contratada baixa.', cols:['nome','sre','mun','oper','tipo','links','vel'], filters:[{k:'vel', op:'lt', v:'300'}], group:''},
  {id:'m6', modelo:true, nome:'Obras de cabeamento', desc:'Escolas por situação da obra de rede lógica e elétrica.', cols:['alunos','pontos','pctot'], filters:[], group:'obra'},
  {id:'m3', modelo:true, nome:'Parque tecnológico por escola', desc:'Computadores por modelo em cada escola.', cols:['nome','sre','chromebooks','pos81','pos230','daten','pos06','outros','pctot'], filters:[], group:''},
  {id:'m4', modelo:true, nome:'Acompanhamento dos NTEs', desc:'Fotos, dados e orçamentos enviados pelos NTEs.', cols:['nome','sre','mun','nfotos','rede','ultnte','norc','minorc','storc'], filters:[], group:''},
  {id:'m7', modelo:true, nome:'Orçamentos por regional', desc:'Quantidade e valores de orçamentos de rede.', cols:['norc','minorc','aprorc'], filters:[], group:'sre'},
];
let savedList = [...MODELOS];
const rel = {cols:[], filters:[], group:'', q:'', sort:null, saved:null, name:'', base:'', touched:false};
const relSnap = () => JSON.stringify({c:rel.cols, f:rel.filters, g:rel.group});
const relDirty = () => rel.saved ? relSnap() !== rel.base : rel.touched;
const AGG_LBL = {sum:'soma', avg:'média', pct:'% com “Sim”'};
function aggOf(v){ if (!v) return null; if (v.t === 'num') return v.agg || (['vel', 'cob', 'links'].includes(v.k) ? 'avg' : 'sum'); if (['wifi', 'sala'].includes(v.k)) return 'pct'; return null; }
function aggVal(v, a, list){
  if (a === 'pct') return list.length ? 100 * list.filter(e => v.f(e) === 'Sim').length / list.length : null;
  const xs = list.map(e => v.f(e)).filter(x => x !== null && x !== undefined && x !== '' && !isNaN(+x)).map(Number);
  if (!xs.length) return null;
  const s = xs.reduce((p, x) => p + x, 0);
  return a === 'avg' ? s / xs.length : s;
}
function fmtVal(v, x, a){
  if (x === null || x === undefined || x === '') return '—';
  if (a === 'pct') return Math.round(x) + '%';
  if (v && v.money) return brl(x);
  if (a === 'avg') return Number(x).toLocaleString('pt-BR', {maximumFractionDigits:1});
  if (typeof x === 'number') return fmt(x);
  return String(x);
}
function passes(e, fl){
  const v = V[fl.k]; if (!v) return true; const x = v.f(e);
  if (v.t === 'num'){ const a = +x, b = +fl.v; return {eq:a === b, ne:a !== b, gt:a > b, ge:a >= b, lt:a < b, le:a <= b}[fl.op]; }
  if (v.t === 'cat') return fl.op === 'eq' ? String(x) === fl.v : String(x) !== fl.v;
  const has = norm(x).includes(norm(fl.v)); return fl.op === 'has' ? has : !has;
}
function baseRows(){
  const q = norm(rel.q.trim());
  return ESC.filter(e => rel.filters.every(f => passes(e, f)) && (!q || norm([e.nome, e.inep, munById[e.mun].nome, REG[e.sre].nome].join(' ')).includes(q)));
}
function rows(){ return baseRows(); }
function sortRows(rs, head){
  if (!rel.sort) return; const i = head.findIndex(h => h.k === rel.sort.k); if (i < 0) return;
  rs.sort((a, b) => { const x = a.raw[i], y = b.raw[i]; if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
    return (typeof x === 'number' && typeof y === 'number' ? x - y : coll.compare(String(x), String(y))) * rel.sort.dir; });
}
/* visão calculada: lista de escolas ou agrupada */
function relView(){
  const list = baseRows();
  if (!rel.group || !V[rel.group]){
    const cols = rel.cols.map(k => V[k]).filter(Boolean);
    const head = cols.map(v => ({k:v.k, l:v.l, num:v.t === 'num', v}));
    const rs = list.map(e => ({id:e.id, raw:cols.map(v => { const x = v.f(e); return x === undefined ? null : x; })}));
    sortRows(rs, head);
    const total = cols.map(v => { const a = aggOf(v); return a ? {a, x:aggVal(v, a, list), v} : null; });
    return {mode:'list', head, rows:rs, total, n:list.length, hidden:[]};
  }
  const gv = V[rel.group];
  const cols = rel.cols.map(k => V[k]).filter(v => v && v.k !== gv.k && aggOf(v));
  const groups = new Map();
  list.forEach(e => { const k = String(gv.f(e)); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); });
  const head = [{k:'_g', l:gv.l, num:false}, {k:'_n', l:'Escolas', num:true}, ...cols.map(v => ({k:v.k, l:v.l, num:true, sub:AGG_LBL[aggOf(v)], a:aggOf(v), v}))];
  const rs = [...groups].map(([g, es]) => ({g, raw:[g, es.length, ...cols.map(v => aggVal(v, aggOf(v), es))]}));
  if (rel.sort) sortRows(rs, head); else rs.sort((a, b) => coll.compare(a.g, b.g));
  const total = [null, {a:'sum', x:list.length}, ...cols.map(v => ({a:aggOf(v), x:aggVal(v, aggOf(v), list), v}))];
  const hidden = rel.cols.filter(k => V[k] && k !== gv.k && !aggOf(V[k])).map(k => V[k].l);
  return {mode:'group', gv, head, rows:rs, total, n:list.length, hidden};
}
/* tabela pronta para exportar: valores crus (Excel/CSV) e texto (PDF) */
function relTable(){
  const vw = relView();
  const head = vw.head.map(h => h.sub ? `${h.l} (${h.sub.replace(/[“”]/g, '')})` : h.l);
  const rawOf = (h, x) => x === null || x === undefined ? '' : h.a ? Math.round(x * 10) / 10 : x;
  const raw = vw.rows.map(r => r.raw.map((x, i) => rawOf(vw.head[i], x)));
  const txt = vw.rows.map(r => r.raw.map((x, i) => i === 0 && vw.mode === 'group' ? String(x) : fmtVal(vw.head[i].v, x, vw.head[i].a)));
  const tot = vw.total.map((t, i) => t ? rawOf({a:t.a === 'sum' && vw.mode === 'list' ? null : t.a}, t.x) : '');
  const totTxt = vw.total.map((t, i) => t ? fmtVal(t.v, t.x, t.a === 'sum' && !(t.v && t.v.money) ? null : t.a) : '');
  const lab = vw.mode === 'group' ? `Total (${plural(vw.n, 'escola', 'escolas')})` : `Total (${plural(vw.n, 'escola', 'escolas')})`;
  if (vw.mode === 'group'){ tot[0] = lab; totTxt[0] = lab; } else { const i = vw.head.findIndex(h => !h.num); if (i >= 0){ tot[i] = lab; totTxt[i] = lab; } }
  return {vw, head, raw, txt, tot, totTxt, name:relName()};
}
function relName(){ const s = rel.saved && savedList.find(x => x.id === rel.saved); return s ? s.nome : rel.name || 'Relatório sem título'; }
function relDesc(){
  const g = rel.group && V[rel.group];
  return `${g ? `Agrupado por ${g.l}` : 'Uma linha por escola'}${rel.filters.length ? ` · ${plural(rel.filters.length, 'filtro', 'filtros')}` : ''}`;
}
function loadRel(s){
  rel.cols = [...s.cols]; rel.filters = s.filters.map(f => ({...f})); rel.group = s.group || ''; rel.sort = null; rel.q = '';
  rel.saved = s.id; rel.name = s.nome; rel.base = relSnap(); rel.touched = false;
  const q = $('#rpQ'); if (q) q.value = '';
}
function changed(){ rel.touched = true; renderSheet(); }
function guard(go){
  if (!relDirty()) return go();
  const ov = modal({title:'Descartar alterações?', body:`<p style="margin:0">As mudanças em <b>${esc(relName())}</b> ainda não foram salvas. Se continuar, elas serão perdidas.</p>`,
    foot:`<button class="btn" data-close>Continuar editando</button><button class="btn danger solid" id="gOk">Descartar e continuar</button>`});
  $('#gOk', ov).addEventListener('click', () => { closeModal(); go(); });
}
loadRel(MODELOS[0]);
function closeSaved(){}

/* ---------------- relatórios: tela ---------------- */
const REL_SORTED = [...new Set(ESC.map(e => REG[e.sre].nome))];
function renderSide(){
  const el = $('#rpList'); if (!el) return;
  const team = savedList.filter(s => !s.modelo);
  const item = s => `<div class="rp-item ${rel.saved === s.id ? 'on' : ''}"><button class="rp-open" data-open="${esc(s.id)}"><b>${esc(s.nome)}</b><span>${s.modelo ? esc(s.desc || '') : `${s.group && V[s.group] ? 'Agrupado por ' + esc(V[s.group].l) : plural(s.cols.length, 'coluna', 'colunas')} · por ${whoHtml(s)}`}</span></button>
    ${!s.modelo && canDel(s) ? `<button class="icon-btn del" data-rdel-rel="${esc(s.id)}" aria-label="Excluir ${esc(s.nome)}">${SVG(IC.trash)}</button>` : ''}</div>`;
  el.innerHTML = `<div class="rp-grp"><h4>Modelos prontos</h4>${MODELOS.map(item).join('')}</div>
    <div class="rp-grp"><h4>Salvos pela equipe <span class="ct-n">${team.length}</span></h4>${team.length ? team.map(item).join('') : '<p class="rp-empty">Monte um relatório e clique em <b>Salvar</b>. Ele aparece aqui para toda a equipe.</p>'}</div>`;
  $('#rpCount').textContent = `${MODELOS.length + team.length}`;
  resolveNames(el);
}
function renderSheet(){
  if (!$('#rpList')) return;
  renderSide();
  const s = rel.saved && savedList.find(x => x.id === rel.saved);
  $('#rpKind').textContent = s ? (s.modelo ? 'Modelo pronto' : 'Salvo pela equipe') : 'Novo relatório';
  $('#rpName').textContent = relName();
  $('#rpDesc').textContent = relDesc();
  const dirty = relDirty(); $('#rpDirty').hidden = !dirty; $('#rpDirty').textContent = rel.saved ? 'Alterações não salvas' : 'Ainda não salvo';
  $('#nCols').textContent = rel.cols.length;
  $('#rpGrp').value = rel.group || '';
  const sreF = rel.filters.filter(f => f.k === 'sre' && f.op === 'eq'); $('#rpReg').value = sreF.length === 1 ? sreF[0].v : '';
  // filtros
  $('#chips').innerHTML = rel.filters.length ? `<span class="eyebrow" style="margin-right:4px">Filtros</span>` + rel.filters.map((fl, i) => { const v = V[fl.k];
    return `<span class="chip">${esc(v.l)} ${esc(opLabel(v.t, fl.op))} ${esc(fl.v)}<button data-rmf="${i}" aria-label="Remover filtro">${SVG(IC.x, 2.5)}</button></span>`; }).join('')
    + `<button class="btn sm" id="clrF">Limpar filtros</button>` : '';
  $('#chips').hidden = !rel.filters.length;
  const sh = $('#sheet');
  if (!rel.cols.length && !rel.group){
    sh.innerHTML = `<div class="empty">${SVG('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>', 1.5)}<b>Escolha as colunas do relatório</b><span>Selecione os dados que quer ver, como velocidade do link, Wi-Fi ou computadores. Ou abra um modelo pronto ao lado.</span><button class="btn primary" id="emptyAdd">Escolher colunas</button></div>`;
    $('#emptyAdd').addEventListener('click', openVarModal);
    $('#sheetFoot').innerHTML = ''; return;
  }
  const vw = relView(), arrow = k => rel.sort && rel.sort.k === k ? (rel.sort.dir > 0 ? ' ▲' : ' ▼') : '';
  const totals = vw.total.some(Boolean);
  sh.innerHTML = `<table class="grid"><thead><tr><th class="idx">#</th>${vw.head.map(h => `<th class="${h.num ? 'n' : ''}"><span class="h"><button class="srt" data-sort="${h.k}" title="Ordenar por ${esc(h.l)}">${esc(h.l)}${arrow(h.k)}</button>${h.k[0] !== '_' ? `<button class="rm" data-rm="${h.k}" title="Tirar coluna" aria-label="Tirar a coluna ${esc(h.l)}">${SVG(IC.x, 2.5)}</button>` : ''}</span>${h.sub ? `<small>${h.sub}</small>` : ''}</th>`).join('')}</tr></thead>
    <tbody>${vw.rows.length ? vw.rows.map((r, i) => `<tr tabindex="0" ${vw.mode === 'list' ? `data-esc="${r.id}" title="Abrir o relatório da escola"` : `data-grp="${esc(r.g)}" title="Ver as escolas deste grupo"`}><td class="idx num">${i + 1}</td>${r.raw.map((x, j) => `<td class="${vw.head[j].num ? 'n' : ''}">${j === 0 && vw.mode === 'group' ? `<b>${esc(x)}</b>` : esc(fmtVal(vw.head[j].v, x, vw.head[j].a))}</td>`).join('')}</tr>`).join('')
      : `<tr class="norow"><td colspan="${vw.head.length + 1}" style="text-align:center;padding:30px;color:var(--muted);cursor:default">Nenhuma escola atende ${rel.q.trim() && rel.filters.length ? 'à busca e aos filtros' : rel.q.trim() ? 'à busca' : 'aos filtros'}.<div style="display:flex;gap:8px;justify-content:center;margin-top:10px">${rel.q.trim() ? '<button class="btn sm" id="clrQ">Limpar busca</button>' : ''}${rel.filters.length ? '<button class="btn sm" id="clrF2">Limpar filtros</button>' : ''}</div></td></tr>`}</tbody>
    ${totals && vw.rows.length ? `<tfoot><tr><td class="idx"></td>${(() => { const t = relTable(); return vw.head.map((h, j) => { const tt = vw.total[j]; return `<td class="${h.num ? 'n' : ''}">${esc(t.totTxt[j] || '')}${tt && h.num && j > (vw.mode === 'group' ? 1 : -1) ? `<small>${tt.a === 'pct' ? '% com “Sim”' : tt.a === 'avg' ? 'média geral' : 'soma'}</small>` : ''}</td>`; }).join(''); })()}</tr></tfoot>` : ''}</table>`;
  $('#sheetFoot').innerHTML = `<span><b class="num">${fmt(vw.n)}</b> de ${fmt(ESC.length)} escolas${vw.mode === 'group' ? ` em <b class="num">${vw.rows.length}</b> grupos` : ''}</span>
    ${vw.hidden.length ? `<span>Sem total por grupo, ficam de fora: ${esc(vw.hidden.join(', '))}</span>` : ''}
    <span class="tip-r">${vw.mode === 'list' ? 'Clique numa escola para abrir o relatório dela' : 'Clique num grupo para ver as escolas dele'}</span>`;
}
function initRel(){
  $('#rpGrp').innerHTML = `<option value="">Não agrupar</option>` + VARS.filter(v => v.t === 'cat').map(v => `<option value="${v.k}">${esc(v.l)}</option>`).join('');
  $('#rpReg').innerHTML = `<option value="">Todas</option>` + [...REL_SORTED].sort(coll.compare).map(n => `<option>${esc(n)}</option>`).join('');
  if (matchMedia('(max-width:980px)').matches) $('#rpDet').open = false;
  $('#rpNew').addEventListener('click', () => guard(() => { rel.cols = ['nome', 'sre', 'mun']; rel.filters = []; rel.group = ''; rel.sort = null; rel.q = ''; $('#rpQ').value = ''; rel.saved = null; rel.name = ''; rel.touched = false; renderSheet(); openVarModal(); }));
  $('#rpList').addEventListener('click', ev => {
    const o = ev.target.closest('[data-open]'), d = ev.target.closest('[data-rdel-rel]');
    if (o){ const s = savedList.find(x => x.id === o.dataset.open); if (s && s.id !== rel.saved) guard(() => { loadRel(s); renderSheet(); if (matchMedia('(max-width:980px)').matches) $('#rpDet').open = false; }); }
    if (d){ const s = savedList.find(x => x.id === d.dataset.rdelRel); if (s) confirmDel('relatório', s.nome, async () => { await delRow('rels', s); if (rel.saved === s.id){ rel.saved = null; rel.touched = true; } syncSaved(); renderSheet(); }); }
  });
  $('#btnVar').addEventListener('click', openVarModal);
  $('#btnFil').addEventListener('click', openFilterModal);
  $('#btnSave').addEventListener('click', openSaveModal);
  $('#btnExpRel').addEventListener('click', () => openRelExport());
  $('#rpGrp').addEventListener('change', ev => { rel.group = ev.target.value; rel.sort = null; changed(); });
  $('#rpReg').addEventListener('change', ev => { rel.filters = rel.filters.filter(f => !(f.k === 'sre' && f.op === 'eq')); if (ev.target.value) rel.filters.push({k:'sre', op:'eq', v:ev.target.value}); changed(); });
  $('#rpQ').addEventListener('input', ev => { rel.q = ev.target.value; renderSheet(); });
  $('#sheet').addEventListener('click', ev => {
    const s = ev.target.closest('[data-sort]'), r = ev.target.closest('[data-rm]');
    if (s){ const k = s.dataset.sort; rel.sort = rel.sort && rel.sort.k === k ? (rel.sort.dir > 0 ? {k, dir:-1} : null) : {k, dir:1}; return renderSheet(); }
    if (r){ rel.cols = rel.cols.filter(k => k !== r.dataset.rm); if (rel.sort && rel.sort.k === r.dataset.rm) rel.sort = null; return changed(); }
    if (ev.target.closest('#clrQ')){ rel.q = ''; $('#rpQ').value = ''; return renderSheet(); }
    if (ev.target.closest('#clrF2')){ rel.filters = []; return changed(); }
    const tr = ev.target.closest('tbody tr'); if (!tr || tr.classList.contains('norow')) return;
    if (tr.dataset.esc) openSchool(+tr.dataset.esc);
    else if (tr.dataset.grp !== undefined){ const g = V[rel.group]; rel.filters.push({k:g.k, op:'eq', v:tr.dataset.grp}); rel.group = ''; rel.sort = null; if (!rel.cols.includes('nome')) rel.cols.unshift('nome'); changed(); toast(`Mostrando as escolas com ${esc(g.l)}: ${esc(tr.dataset.grp)}`); }
  });
  $('#sheet').addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.matches('tbody tr')) ev.target.click(); });
  $('#chips').addEventListener('click', ev => {
    const b = ev.target.closest('[data-rmf]'); if (b){ rel.filters.splice(+b.dataset.rmf, 1); changed(); }
    if (ev.target.closest('#clrF')){ rel.filters = []; changed(); }
  });
}

/* ---------------- colunas, filtros e salvar ---------------- */
function openVarModal(){
  let sel = [...rel.cols];
  const groups = [...new Set(VARS.map(v => v.g))];
  const ov = modal({title:'Escolher colunas', wide:true, body:`
    <div class="colpick">
      <div class="cp-left">
        <div class="search" style="width:100%">${SVG(IC.search)}<input class="inp" id="vSearch" type="search" placeholder="Buscar dado, ex.: velocidade, Wi-Fi, orçamento" autocomplete="off"></div>
        ${groups.map(g => `<div class="vgroup" data-g="${esc(g)}"><div class="gh"><b>${esc(g)}</b><button type="button" data-all="${esc(g)}">Marcar todas</button></div><div class="vlist">
          ${VARS.filter(v => v.g === g).map(v => `<label class="ck" data-l="${esc(norm(v.l + ' ' + v.g))}"><input type="checkbox" value="${v.k}" ${sel.includes(v.k) ? 'checked' : ''}>${esc(v.l)}</label>`).join('')}</div></div>`).join('')}
      </div>
      <div class="cp-right"><div class="fsub" style="margin:0">Ordem no relatório</div><ol class="cpord" id="cpOrd"></ol><div class="who" id="cpHint" style="margin-top:6px"></div></div>
    </div>`,
    foot:`<span style="margin-right:auto;color:var(--muted);font-size:12.5px;align-self:center" id="vCount"></span><button class="btn" data-close>Cancelar</button><button class="btn primary" id="vApply">Aplicar</button>`});
  const paint = () => {
    $('#cpOrd', ov).innerHTML = sel.map((k, i) => `<li><span>${esc(V[k].l)}</span><button data-up="${i}" ${i ? '' : 'disabled'} aria-label="Subir">${SVG('<path d="m6 15 6-6 6 6"/>')}</button><button data-dn="${i}" ${i < sel.length - 1 ? '' : 'disabled'} aria-label="Descer">${SVG('<path d="m6 9 6 6 6-6"/>')}</button><button data-x="${k}" aria-label="Tirar">${SVG(IC.x)}</button></li>`).join('');
    $('#cpHint', ov).textContent = sel.length ? 'Use as setas para mudar a ordem das colunas.' : 'Marque os dados à esquerda.';
    $('#vCount', ov).textContent = plural(sel.length, 'coluna escolhida', 'colunas escolhidas');
    $$('.vlist input', ov).forEach(c => { c.checked = sel.includes(c.value); });
  };
  paint();
  ov.addEventListener('change', ev => { const c = ev.target; if (!c.matches('.vlist input')) return; sel = c.checked ? [...sel.filter(k => k !== c.value), c.value] : sel.filter(k => k !== c.value); paint(); });
  $('#cpOrd', ov).addEventListener('click', ev => {
    const u = ev.target.closest('[data-up]'), d = ev.target.closest('[data-dn]'), x = ev.target.closest('[data-x]');
    if (u){ const i = +u.dataset.up; [sel[i - 1], sel[i]] = [sel[i], sel[i - 1]]; }
    if (d){ const i = +d.dataset.dn; [sel[i + 1], sel[i]] = [sel[i], sel[i + 1]]; }
    if (x) sel = sel.filter(k => k !== x.dataset.x);
    paint();
  });
  $('#vSearch', ov).addEventListener('input', e => { const q = norm(e.target.value.trim());
    $$('.ck', ov).forEach(c => c.hidden = q && !c.dataset.l.includes(q));
    $$('.vgroup', ov).forEach(g => g.hidden = !$$('.ck', g).some(c => !c.hidden)); });
  $$('[data-all]', ov).forEach(b => b.addEventListener('click', () => { const ks = $$('input', b.closest('.vgroup')).map(c => c.value); const all = ks.every(k => sel.includes(k)); sel = all ? sel.filter(k => !ks.includes(k)) : [...sel, ...ks.filter(k => !sel.includes(k))]; paint(); }));
  $('#vApply', ov).addEventListener('click', () => {
    rel.cols = sel; if (rel.sort && !sel.includes(rel.sort.k) && rel.sort.k[0] !== '_') rel.sort = null;
    closeModal(); changed();
  });
}
const OPS = {num:[['eq', 'igual a'], ['ne', 'diferente de'], ['gt', 'maior que'], ['ge', 'maior ou igual a'], ['lt', 'menor que'], ['le', 'menor ou igual a']], cat:[['eq', 'é'], ['ne', 'não é']], text:[['has', 'contém'], ['nhas', 'não contém']]};
const opLabel = (t, o) => (OPS[t].find(x => x[0] === o) || [, o])[1];
function openFilterModal(){
  const inCols = VARS.filter(v => rel.cols.includes(v.k)), others = VARS.filter(v => !rel.cols.includes(v.k));
  const ov = modal({title:'Filtrar escolas', body:`
    <p style="margin:0;color:var(--muted);font-size:13px">Mostre só as escolas que atendem a uma condição. Você pode combinar vários filtros.</p>
    <div class="frow">
      <label class="fl">Dado<select class="sel" id="fK">${inCols.length ? `<optgroup label="Colunas do relatório">${inCols.map(v => `<option value="${v.k}">${esc(v.l)}</option>`).join('')}</optgroup>` : ''}<optgroup label="Outros dados">${others.map(v => `<option value="${v.k}">${esc(v.l)}</option>`).join('')}</optgroup></select></label>
      <label class="fl">Condição<select class="sel" id="fO"></select></label>
      <label class="fl">Valor<span id="fVw"></span></label>
    </div>
    <div class="note" id="fPrev"></div>`,
    foot:`<button class="btn" data-close>Cancelar</button><button class="btn primary" id="fAdd">Aplicar filtro</button>`});
  const prev = () => { const fl = {k:$('#fK', ov).value, op:$('#fO', ov).value, v:$('#fV', ov).value};
    if (fl.v === ''){ $('#fPrev', ov).textContent = 'Informe um valor para ver quantas escolas atendem ao filtro.'; return; }
    const n = ESC.filter(e => rel.filters.every(f => passes(e, f)) && passes(e, fl)).length;
    $('#fPrev', ov).innerHTML = `Com este filtro, o relatório terá <b>${plural(n, 'escola', 'escolas')}</b>.`; };
  const sync = () => {
    const v = V[$('#fK', ov).value];
    $('#fO', ov).innerHTML = OPS[v.t].map(([k, l]) => `<option value="${k}">${l}</option>`).join('');
    if (v.t === 'cat'){ const vals = [...new Set(ESC.map(v.f))].sort(coll.compare); $('#fVw', ov).innerHTML = `<select class="sel" id="fV" style="width:100%">${vals.map(x => `<option>${esc(x)}</option>`).join('')}</select>`; }
    else $('#fVw', ov).innerHTML = `<input class="inp" id="fV" type="${v.t === 'num' ? 'number' : 'text'}" placeholder="${v.t === 'num' ? 'ex.: 300' : 'texto'}">`;
    $('#fV', ov).addEventListener('input', prev); $('#fV', ov).addEventListener('change', prev); prev();
  };
  $('#fK', ov).addEventListener('change', sync); $('#fO', ov).addEventListener('change', prev);
  sync();
  $('#fAdd', ov).addEventListener('click', () => {
    const fl = {k:$('#fK', ov).value, op:$('#fO', ov).value, v:$('#fV', ov).value};
    if (fl.v === ''){ $('#fV', ov).focus(); $('#fPrev', ov).innerHTML = '<span style="color:var(--bad)">Informe um valor para aplicar o filtro.</span>'; return; }
    rel.filters.push(fl);
    if (!rel.group && !rel.cols.includes(fl.k)) rel.cols.push(fl.k);
    closeModal(); changed();
  });
}
function openSaveModal(){
  if (!canAdd()) return noWriteMsg();
  if (!rel.cols.length && !rel.group){ toast('Escolha ao menos uma coluna antes de salvar'); return; }
  const cur0 = rel.saved ? savedList.find(s => s.id === rel.saved) : null, cur = cur0 && !cur0.modelo && canDel(cur0) ? cur0 : null;
  const ov = modal({title:'Salvar relatório', body:`
    <label class="fl">Nome do relatório<input class="inp" id="sName" maxlength="80" value="${esc(cur ? cur.nome : cur0 && cur0.modelo ? cur0.nome + ' (minha versão)' : '')}" placeholder="Ex.: Escolas com link via satélite"></label>
    <div class="note">${relDesc()} · ${plural(rel.cols.length, 'coluna', 'colunas')}. O relatório fica disponível para toda a equipe em <b>Salvos pela equipe</b>.${cur0 && cur0.modelo ? ' Os modelos prontos não mudam; isto cria um relatório novo.' : ''}</div>
    ${cur ? `<div class="opts" style="grid-template-columns:repeat(2,minmax(0,1fr))"><label class="opt"><input type="radio" name="sm" value="upd" checked><div><b>Atualizar este</b><span>Substitui “${esc(cur.nome)}”</span></div></label><label class="opt"><input type="radio" name="sm" value="new"><div><b>Salvar como novo</b><span>Mantém o original</span></div></label></div>` : ''}
    <div class="ferr" id="sErr" hidden></div>`,
    foot:`<button class="btn" data-close>Cancelar</button><button class="btn primary" id="sOk">Salvar</button>`});
  $('#sOk', ov).addEventListener('click', async ev => {
    const nome = $('#sName', ov).value.trim(), err = $('#sErr', ov);
    if (!nome){ err.hidden = false; err.textContent = 'Dê um nome ao relatório.'; $('#sName', ov).focus(); return; }
    const mode = cur ? $('input[name=sm]:checked', ov).value : 'new', data = {nome, cols:[...rel.cols], filters:rel.filters.map(f => ({...f})), group:rel.group || ''};
    ev.target.disabled = true;
    try {
      if (mode === 'upd') await updRow('rels', cur.id, data); else { const s = await addRow('rels', data); rel.saved = s.id; }
      rel.name = nome; rel.base = relSnap(); rel.touched = false; syncSaved(); closeModal(); renderSheet(); toast(`Relatório “${esc(nome)}” salvo para a equipe`);
    } catch (x) { ev.target.disabled = false; err.hidden = false; err.textContent = errMsg(x); }
  });
}


/* ---- relatórios salvos compartilhados ---- */
function syncSaved(){
  const ok = s => s && typeof s.nome === 'string' && Array.isArray(s.cols);
  savedList = [...MODELOS, ...DOC.rels.filter(ok).map(s => ({id:s.id, nome:s.nome, autor:s.autor, criadoEm:s.criadoEm, group:typeof s.group === 'string' && V[s.group] && V[s.group].t === 'cat' ? s.group : '', cols:s.cols.filter(k => V[k]), filters:(Array.isArray(s.filters) ? s.filters : []).filter(f => f && V[f.k] && OPS[V[f.k].t].some(o => o[0] === f.op)).map(f => ({k:f.k, op:f.op, v:String(f.v ?? '')}))}))];
}

