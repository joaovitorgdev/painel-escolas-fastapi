/* =========================================================
   ESCOLAS
   ========================================================= */
let escState = {view:'pick', reg:null, id:null};
let rmMode = false, rmSel = new Set();
const SECS = [
  {k:'con', t:'Conectividade', ic:'<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0"/><circle cx="12" cy="19.5" r="1"/>'},
  {k:'sala', t:'Sala de informática', ic:'<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>'},
  {k:'wifi', t:'Wi-Fi', ic:'<circle cx="12" cy="12" r="2"/><path d="M7.5 7.5a6.4 6.4 0 0 0 0 9M16.5 7.5a6.4 6.4 0 0 1 0 9M4.6 4.6a10.5 10.5 0 0 0 0 14.8M19.4 4.6a10.5 10.5 0 0 1 0 14.8"/>'},
  {k:'parque', t:'Parque tecnológico', ic:'<rect x="2" y="5" width="13" height="10" rx="1.5"/><path d="M5 19h7M8.5 15v4"/><rect x="17" y="4" width="5" height="15" rx="1"/>'},
  {k:'docs', t:'Fotos, orçamentos, documentos e dados do NTE', ic:'<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>'},
];
let openSecs = new Set(['con', 'docs']);

function openSchool(id){ const e = ESC.find(s => s.id === id); escState = {view:'report', reg:e.sre, id}; showTab('esc'); }

function renderEsc(){
  const host = $('#v-esc');
  if (escState.view === 'pick') return renderPick(host);
  if (escState.view === 'list') return renderList(host);
  renderReport(host);
}
function renderList(host){
  const list = ESC.filter(e => e.sre === escState.reg).sort((a, b) => coll.compare(a.nome, b.nome));
  host.innerHTML = `<div class="esc">
    <div class="list-head">
      <div class="l"><button class="btn" id="chgReg"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg>Trocar regional</button><div style="min-width:0"><h2>Escolas da ${esc(regName(escState.reg))}</h2></div></div>
      <div class="c"><button class="btn primary" id="addE"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>Adicionar escola</button><button class="btn ${rmMode?'danger solid':'danger'}" id="rmE"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>Remover escola</button></div>
      <div class="r" style="color:var(--muted);font-size:13px"><b class="num" style="color:var(--ink)">${list.length}</b> escola${list.length === 1 ? '' : 's'} · ${MUN.filter(m => m.sre === escState.reg).length} municípios</div>
    </div>
    ${rmMode ? `<div class="rm-bar"><span>Selecione as escolas que serão removidas</span><span class="sp"></span><span id="rmCount">${rmSel.size} selecionada${rmSel.size === 1 ? '' : 's'}</span><button class="btn" id="rmCancel">Cancelar</button><button class="btn danger solid" id="rmOk" ${rmSel.size ? '' : 'disabled'}>Remover selecionadas</button></div>` : ''}
    <div class="esc-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg><span>O cadastro das escolas é de exemplo neste protótipo: incluir, editar ou remover vale só até recarregar a página. Fotos, documentos e orçamentos de cada escola ficam salvos.</span></div>
    <div class="cards">${list.length ? list.map(e => `<div class="ecard card ${rmSel.has(e.id)?'sel':''}" data-id="${e.id}" tabindex="0" role="button">
      ${rmMode ? `<input type="checkbox" class="chk" ${rmSel.has(e.id)?'checked':''} aria-label="Selecionar ${esc(e.nome)}">` : ''}
      <h3>${esc(e.nome)}</h3>
      <div class="meta">${esc(munById[e.mun].nome)} · INEP <span class="num">${e.inep}</span> · <span class="num">${fmt(e.alunos)}</span> alunos</div>
      <div class="pills"><span class="pill acc">${esc(e.con.tipo)} · ${fmt(e.con.vel)} Mbps</span><span class="pill ${e.wifi.possui?'good':'bad'}">Wi-Fi: ${yn(e.wifi.possui)}</span><span class="pill ${e.sala.possui?'good':'warn'}">Sala de informática: ${yn(e.sala.possui)}</span><span class="pill">${fmt(pcsTotal(e))} computadores</span>${photoPill(e)}</div>
    </div>`).join('') : `<div class="card empty" style="grid-column:1/-1;min-height:200px"><b>Nenhuma escola cadastrada nesta regional</b><span>Use “Adicionar escola” para incluir a primeira.</span></div>`}</div>
  </div>`;
  $('#chgReg').addEventListener('click', () => { escState = {view:'pick', reg:null}; rmMode = false; rmSel.clear(); renderEsc(); });
  $('#addE').addEventListener('click', () => openSchoolForm(null));
  $('#rmE').addEventListener('click', () => { rmMode = !rmMode; rmSel.clear(); renderEsc(); });
  if (rmMode){
    $('#rmCancel').addEventListener('click', () => { rmMode = false; rmSel.clear(); renderEsc(); });
    $('#rmOk').addEventListener('click', async ev => { const btn = ev.currentTarget, n = rmSel.size; btn.disabled = true;
      try { await removerEscolas([...rmSel]); rmSel.clear(); rmMode = false; renderEsc(); toast(`${n} escola${n === 1 ? ' removida' : 's removidas'}`); }
      catch (x) { btn.disabled = false; toast(errMsg(x)); } });
  }
  $$('.ecard', host).forEach(c => {
    const act = () => { const id = +c.dataset.id;
      if (rmMode){ rmSel.has(id) ? rmSel.delete(id) : rmSel.add(id); renderEsc(); }
      else { escState = {view:'report', reg:escState.reg, id}; renderEsc(); $('#v-esc').scrollTop = 0; } };
    c.addEventListener('click', act); c.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); act(); } });
  });
}
const schoolArt = `<svg viewBox="0 0 260 260" aria-hidden="true"><rect width="260" height="260" fill="var(--accent-soft)"/><rect y="196" width="260" height="64" fill="var(--line)"/>
  <path d="M40 110 130 62l90 48v86H40z" fill="var(--surface)" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/>
  <path d="M30 114 130 58l100 56" fill="none" stroke="var(--accent-strong)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  ${[60,95,165,200].map(x => `<rect x="${x-12}" y="124" width="24" height="22" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/><rect x="${x-12}" y="160" width="24" height="22" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/>`).join('')}
  <rect x="116" y="148" width="28" height="48" rx="2" fill="var(--accent)"/><circle cx="130" cy="100" r="11" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2.5"/>
  <path d="M130 62V34" stroke="var(--accent-strong)" stroke-width="3"/><path d="M130 34h22l-5 7 5 7h-22" fill="var(--bad)"/></svg>`;
function kvt(rows){ return `<table class="kvt">${rows.map(([k, v, n]) => `<tr><td>${esc(k)}</td><td class="${n?'n':''}">${v}</td></tr>`).join('')}</table>`; }
function secBody(e, k){
  if (k === 'con') return `<div class="two">${kvt([['Operadora', esc(e.con.oper)], ['Tipo de link', esc(e.con.tipo)], ['Quantidade de links', e.con.links], ['Velocidade contratada', fmt(e.con.vel) + ' Mbps'], ['Programa / contrato', esc(e.con.prog)]])}
    ${kvt([['Pontos de rede lógica', fmt(e.con.pontos)], ['Rack', esc(e.con.rack)], ['Obra de cabeamento lógico e elétrico', esc(e.con.obra)], ['Última verificação do link', '14/10/2026'], ['Situação do link', '<span class="pill good">Operacional</span>']])}</div>`;
  if (k === 'sala') return e.sala.possui ? `<div class="two">${kvt([['Possui sala de informática', 'Sim'], ['Computadores na sala', fmt(e.sala.pcs)], ['Situação', esc(e.sala.estado)]])}${kvt([['Área aproximada', e.sala.area + ' m²'], ['Pontos de rede na sala', fmt(Math.round(e.sala.pcs * 1.1))], ['Climatização', e.sala.pcs > 20 ? 'Ar-condicionado' : 'Ventiladores']])}</div>`
    : `<div class="note">A escola não possui sala de informática cadastrada.</div>`;
  if (k === 'wifi') return e.wifi.possui ? `<div class="two">${kvt([['Possui Wi-Fi', 'Sim'], ['Pontos de acesso (APs)', fmt(e.wifi.aps)], ['Cobertura estimada', e.wifi.cob + '%']])}${kvt([['Controladora', esc(e.wifi.ctrl)], ['Redes (SSID)', esc(e.wifi.ssid)], ['Instalação', '2024']])}</div>`
    : `<div class="note">A escola não possui rede Wi-Fi instalada.</div>`;
  if (k === 'parque') return `<div class="two">${kvt([...DEV.map(d => [d.t, fmt(e.parque[d.k]), 1]), ['Total de computadores', `<b>${fmt(pcsTotal(e))}</b>`, 1]])}${kvt([['Projetores', fmt(e.proj), 1], ['Lousas digitais', fmt(e.lousas), 1], ['Impressoras', fmt(e.impr), 1]])}</div>`;
  if (k === 'docs') return folderHtml(e, 'rel');
}
function secSum(e, k){
  if (k === 'con') return `<span class="pill acc">${esc(e.con.tipo)}</span><span class="pill">${fmt(e.con.vel)} Mbps</span><span class="pill">${e.con.links} link${e.con.links > 1 ? 's' : ''}</span>`;
  if (k === 'sala') return `<span class="pill ${e.sala.possui?'good':'warn'}">${e.sala.possui ? e.sala.pcs + ' computadores' : 'Não possui'}</span>`;
  if (k === 'wifi') return `<span class="pill ${e.wifi.possui?'good':'bad'}">${e.wifi.possui ? e.wifi.aps + ' APs' : 'Não possui'}</span>`;
  if (k === 'parque') return `<span class="pill">${fmt(pcsTotal(e))} computadores</span>`;
  if (k === 'docs') return `${photoPill(e)}<span class="pill">${docsOf(e).length} documento${docsOf(e).length === 1 ? '' : 's'}</span>${orcOf(e).length ? `<span class="pill acc">${plural(orcOf(e).length, 'orçamento', 'orçamentos')}</span>` : ''}`;
}
function renderReport(host){
  const e = ESC.find(s => s.id === escState.id);
  if (!e){ escState = {view:'list', reg:escState.reg}; return renderEsc(); }
  host.innerHTML = `<div class="esc">
    <div class="esc-title">
      <div class="card tt"><nav class="crumb" aria-label="Você está em"><button data-crumb="pick">Escolas</button><span class="sep">›</span><button data-crumb="list">${esc(regName(e.sre))}</button><span class="sep">›</span><b>${esc(e.nome)}</b></nav></div>
      <div class="acts">
        <button class="btn" id="rBack"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg>Voltar à listagem</button>
        <button class="btn" id="rEdit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>Editar dados</button>
        <button class="btn primary" id="rPdf"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M12 11v6M9.5 14.5 12 17l2.5-2.5"/></svg>Salvar em PDF</button>
      </div>
    </div>
    <div class="esc-top">
      <div class="photo">${(() => { const c = coverOf(e), u = c && assetUrl(c); return u ? `<img src="${u}" alt="Foto da escola">` : schoolArt; })()}<button class="phb" data-ph-add-top>${coverOf(e) ? 'Adicionar fotos' : 'Adicionar foto'}</button></div>
      <div class="card basic">
        <h2>${esc(e.nome)}</h2>
        <div class="sub">${esc(regName(e.sre))} · ${esc(munById[e.mun].nome)} – MG</div>
        <dl class="kv">
          <div><dt>Código INEP</dt><dd class="num">${e.inep}</dd></div>
          <div><dt>Telefone</dt><dd>${esc(e.tel)}</dd></div>
          <div><dt>E-mail</dt><dd>${esc(e.email)}</dd></div>
          <div class="wide"><dt>Endereço</dt><dd>${esc(e.end)} – ${esc(e.bairro)}, ${esc(munById[e.mun].nome)} – MG, CEP ${esc(e.cep)}</dd></div>
          <div><dt>Turnos</dt><dd>${esc(e.turnos)}</dd></div>
          <div><dt>Alunos</dt><dd class="num">${fmt(e.alunos)}</dd></div>
          <div><dt>Turmas</dt><dd class="num">${fmt(e.turmas)}</dd></div>
          <div><dt>Dependência</dt><dd>Estadual</dd></div>
          <div class="wide" style="grid-column:1/-1"><dt>Modalidades de ensino</dt><dd style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:5px">${e.mods.map(m => `<span class="pill acc">${esc(m)}</span>`).join('')}</dd></div>
        </dl>
      </div>
    </div>
    <div>${SECS.map(s => `<div class="acc card ${openSecs.has(s.k)?'open':''}" data-k="${s.k}">
      <button class="acc-h" aria-expanded="${openSecs.has(s.k)}"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${s.ic}</svg></span><b>${s.t}</b><span class="sum">${secSum(e, s.k)}</span><svg class="tri" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 4l10 8-10 8z"/></svg></button>
      <div class="acc-b">${secBody(e, s.k)}</div></div>`).join('')}</div>
  </div>`;
  $$('.acc-h', host).forEach(b => b.addEventListener('click', () => { const a = b.closest('.acc'); const k = a.dataset.k; a.classList.toggle('open'); const o = a.classList.contains('open'); b.setAttribute('aria-expanded', o); o ? openSecs.add(k) : openSecs.delete(k); }));
  $('#rBack').addEventListener('click', () => { escState = {view:'list', reg:e.sre}; renderEsc(); });
  $$('[data-crumb]', host).forEach(b => b.addEventListener('click', () => { escState = b.dataset.crumb === 'pick' ? {view:'pick', reg:null} : {view:'list', reg:e.sre}; renderEsc(); $('#v-esc').scrollTop = 0; }));
  $('#rEdit').addEventListener('click', () => openSchoolForm(e));
  $('#rPdf').addEventListener('click', () => {
    const ov = modal({title:'Salvar relatório em PDF', body:`<p style="margin:0;color:var(--muted)">Escolha as seções que entram no PDF de <b style="color:var(--ink)">${esc(e.nome)}</b>.</p>
      <label class="ck"><input type="checkbox" checked disabled>Dados básicos da escola (sempre incluído)</label>
      ${SECS.map(s => `<label class="ck"><input type="checkbox" value="${s.k}" checked>${s.t}</label>`).join('')}`,
      foot:`<button class="btn" data-close>Cancelar</button><button class="btn primary" id="pOk">Gerar PDF</button>`});
    $('#pOk', ov).addEventListener('click', ev => busy(ev.target, 'Gerando PDF…', async () => { await schoolPdf(e, $$('input[value]:checked', ov).map(i => i.value)); closeModal(); }));
  });
  $('[data-ph-add-top]', host).addEventListener('click', () => canAdd() ? openPhotoForm(e) : noWriteMsg());
  bindFolder(host, e); $$('.photo img', host).forEach(im => im.addEventListener('error', () => im.remove()));
}
function openSchoolForm(e){
  const isNew = !e; const reg = isNew ? escState.reg : e.sre;
  const muns = MUN.filter(m => m.sre === reg).sort((a, b) => coll.compare(a.nome, b.nome));
  const MODS = ['Ensino Fundamental – Anos Iniciais','Ensino Fundamental – Anos Finais','Ensino Médio','Ensino Médio em Tempo Integral','EJA','Educação Profissional'];
  const d = e || {nome:'', inep:'', mun:muns[0].id, end:'', bairro:'Centro', cep:'', tel:'', email:'', alunos:300, turnos:'Manhã e tarde', mods:['Ensino Médio'], con:{vel:300, links:1, tipo:'Fibra óptica', oper:'Vivo'}, wifi:{possui:true, aps:6}, sala:{possui:true, pcs:20}};
  const ov = modal({title: isNew ? `Adicionar escola · ${regName(reg)}` : 'Editar dados da escola', wide:true, body:`
    <div class="eyebrow">Dados básicos</div>
    <div class="form-grid">
      <label class="fl full">Nome da escola<input class="inp" id="eNome" value="${esc(d.nome)}" placeholder="ex.: E.E. Professora Maria da Silva"></label>
      <label class="fl">Código INEP<input class="inp" id="eInep" value="${esc(d.inep)}" inputmode="numeric" placeholder="31xxxxxx"></label>
      <label class="fl">Município<select class="sel" id="eMun">${muns.map(m => `<option value="${m.id}" ${m.id === d.mun ? 'selected' : ''}>${esc(m.nome)}</option>`).join('')}</select></label>
      <label class="fl full">Endereço<input class="inp" id="eEnd" value="${esc(d.end)}" placeholder="Rua, número"></label>
      <label class="fl">Telefone<input class="inp" id="eTel" value="${esc(d.tel)}" placeholder="(31) 3000-0000"></label>
      <label class="fl">E-mail<input class="inp" id="eMail" value="${esc(d.email)}" placeholder="escola@example.org"></label>
      <label class="fl">Alunos<input class="inp" id="eAl" type="number" value="${d.alunos}"></label>
      <label class="fl">Turnos<select class="sel" id="eTur">${['Manhã e tarde','Manhã, tarde e noite','Integral','Manhã e noite'].map(t => `<option ${t === d.turnos ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <div class="fl full">Modalidades de ensino<div class="vlist">${MODS.map(m => `<label class="ck" style="font-weight:400;color:var(--ink)"><input type="checkbox" class="eMod" value="${m}" ${d.mods.includes(m) ? 'checked' : ''}>${m}</label>`).join('')}</div></div>
    </div>
    <div class="eyebrow" style="margin-top:6px">Tecnologia</div>
    <div class="form-grid">
      <label class="fl">Tipo de link<select class="sel" id="eTipo">${['Fibra óptica','Rádio','Satélite'].map(t => `<option ${t === d.con.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="fl">Operadora<input class="inp" id="eOper" value="${esc(d.con.oper)}"></label>
      <label class="fl">Velocidade contratada (Mbps)<input class="inp" id="eVel" type="number" value="${d.con.vel}"></label>
      <label class="fl">Quantidade de links<input class="inp" id="eLinks" type="number" min="1" value="${d.con.links}"></label>
      <label class="fl">Pontos de acesso Wi-Fi (0 = sem Wi-Fi)<input class="inp" id="eAps" type="number" min="0" value="${d.wifi.aps}"></label>
      <label class="fl">Computadores na sala de informática (0 = sem sala)<input class="inp" id="ePcs" type="number" min="0" value="${d.sala.pcs}"></label>
    </div>`,
    foot:`<button class="btn" data-close>Cancelar</button><button class="btn primary" id="eOk">${isNew ? 'Cadastrar escola' : 'Salvar alterações'}</button>`});
  $('#eOk', ov).addEventListener('click', async ev => {
    const nome = $('#eNome', ov).value.trim(); if (!nome){ $('#eNome', ov).focus(); $('#eNome', ov).style.borderColor = 'var(--bad)'; return; }
    const mun = +$('#eMun', ov).value, m = munById[mun];
    const aps = +$('#eAps', ov).value || 0, pcs = +$('#ePcs', ov).value || 0;
    const t = e ? structuredClone(e) : {sre:reg, bairro:'Centro', cep:'—', turmas:10,
      con:{prog:'Contrato estadual', pontos:30, rack:'Rack 12U', obra:'Não prevista'}, sala:{estado:'Em uso', area:45}, wifi:{cob:75, ctrl:'Controladora em nuvem', ssid:'Escola-Estudante / Escola-Admin'},
      parque:{chromebooks:0, pos81:0, pos230:0, daten:0, pos06:0, outros:0}, proj:1, lousas:0, impr:1};
    Object.assign(t, {nome, inep:$('#eInep', ov).value.trim() || '—', end:$('#eEnd', ov).value.trim() || '—', tel:$('#eTel', ov).value.trim() || '—', email:$('#eMail', ov).value.trim() || '—',
      alunos:+$('#eAl', ov).value || 0, turnos:$('#eTur', ov).value, mods:$$('.eMod:checked', ov).map(i => i.value)});
    t.turmas = Math.max(1, Math.round(t.alunos / 30));
    if (t.mun !== mun){ t.mun = mun; t.x = +(m.bb[0] + m.bb[2] / 2).toFixed(2); t.y = +(m.bb[1] + m.bb[3] / 2).toFixed(2); }
    Object.assign(t.con, {tipo:$('#eTipo', ov).value, oper:$('#eOper', ov).value, vel:+$('#eVel', ov).value || 0, links:+$('#eLinks', ov).value || 1});
    Object.assign(t.wifi, {aps, possui:aps > 0}); Object.assign(t.sala, {pcs, possui:pcs > 0, estado:pcs > 0 ? (t.sala.estado === '—' ? 'Em uso' : t.sala.estado) : '—'});
    const btn = ev.currentTarget; btn.disabled = true;
    try {
      const r = await salvarEscola(t);
      if (isNew) escState = {view:'report', reg, id:r.id};
      closeModal(); renderEsc(); toast(isNew ? 'Escola cadastrada' : 'Dados da escola atualizados');
    } catch (x) { btn.disabled = false; toast(errMsg(x)); }
  });
}
function afterDataChange(){ paintMap(); buildPins(); fillMun(); $('#fMun').value = st.mun ?? ''; renderIndicators(); setVB(vb); }


/* ---- busca e escolha de regional na aba Escolas ---- */
let pickQ = '';
function renderPick(host){
  const cnt = id => ESC.filter(e => e.sre === id).length;
  host.innerHTML = `<div class="pick"><div class="pick-card card">
    <h1>Encontre uma escola</h1>
    <p>Busque pelo nome, município ou código INEP, ou escolha a Superintendência Regional de Ensino para ver todas as escolas dela.</p>
    <div class="search" style="width:100%">${SVG(IC.search)}<input class="inp" id="pickQ" type="search" placeholder="Ex.: Ipê Amarelo, Almenara ou 99416129" aria-label="Buscar escola" autocomplete="off"></div>
    <div id="pickRes"></div>
    <div class="fsub" style="margin:18px 0 0">Regionais (${REG.length})</div>
    <div class="reg-grid">${regSorted.map(r => `<button data-r="${r.id}"><span>${esc(r.nome)}</span><i class="num">${cnt(r.id)}</i></button>`).join('')}</div>
  </div></div>`;
  const go = id => { escState = {view:'list', reg:id}; rmMode = false; rmSel.clear(); pickQ = ''; renderEsc(); };
  $$('.reg-grid button', host).forEach(b => b.addEventListener('click', () => go(+b.dataset.r)));
  const q = $('#pickQ', host), res = $('#pickRes', host);
  const paint = () => {
    const t = norm(pickQ.trim());
    if (t.length < 2){ res.innerHTML = ''; return; }
    const hits = ESC.filter(e => norm([e.nome, e.inep, munById[e.mun].nome, REG[e.sre].nome].join(' ')).includes(t)).sort((a, b) => coll.compare(a.nome, b.nome));
    res.innerHTML = hits.length ? `<div class="hits">${hits.slice(0, 12).map(e => `<button data-e="${e.id}"><b>${esc(e.nome)}</b><span>${esc(munById[e.mun].nome)} · ${esc(regName(e.sre))} · INEP ${esc(e.inep)}</span></button>`).join('')}${hits.length > 12 ? `<div class="who" style="padding:6px 10px">Mais ${hits.length - 12} resultados. Refine a busca.</div>` : ''}</div>`
      : `<div class="who" style="padding:10px 2px">Nenhuma escola encontrada para “${esc(pickQ.trim())}”.</div>`;
    $$('[data-e]', res).forEach(b => b.addEventListener('click', () => { pickQ = ''; openSchool(+b.dataset.e); $('#v-esc').scrollTop = 0; }));
  };
  q.value = pickQ; q.addEventListener('input', () => { pickQ = q.value; paint(); }); paint();
  q.addEventListener('keydown', ev => { if (ev.key === 'Enter'){ const f = $('[data-e]', res); if (f) f.click(); } });
}

