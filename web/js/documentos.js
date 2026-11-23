/* ---------- casca da aba ---------- */
function renderDoc(){
  const host = $('#v-doc');
  if (host.dataset.sec !== docTab){
    host.dataset.sec = docTab;
    host.innerHTML = `<div class="doc">
      <div class="doc-head">
        <div><h1>Documentos</h1></div>
        <div class="seg" role="tablist" aria-label="Seções de documentos">
          <button role="tab" data-s="drives" aria-selected="${docTab === 'drives'}">${SVG(IC.cloud)}Drives compartilhados <span class="ct-n" id="nLinks">0</span></button>
          <button role="tab" data-s="repo" aria-selected="${docTab === 'repo'}">${SVG(IC.book)}Repositório <span class="ct-n" id="nRepo">0</span></button>
          <button role="tab" data-s="nte" aria-selected="${docTab === 'nte'}">${SVG(IC.camera)}Área dos NTEs <span class="ct-n" id="nNte">0</span></button>
          <button role="tab" data-s="orc" aria-selected="${docTab === 'orc'}">${SVG(IC.book)}Orçamentos <span class="ct-n" id="nOrc">0</span></button>
        </div>
        <span class="sp"></span><div class="stat"><span class="pill" id="docSync"></span><div class="use" id="docUse" hidden></div></div>
      </div>
      <div id="docNote"></div>
      <div id="docSec" style="display:flex;flex-direction:column;gap:12px"></div>
    </div>`;
    $$('.seg button', host).forEach(b => b.addEventListener('click', () => { docTab = b.dataset.s; docQ = ''; store.set('painel.docTab', docTab); renderDoc(); }));
    buildSec($('#docSec'));
    paintUsage();
  }
  $('#nLinks').textContent = fmt(DOC.links.length);
  $('#nRepo').textContent = fmt(DOC.arquivos.filter(r => r.cat !== 'escola').length);
  $('#nNte').textContent = fmt(new Set(DOC.fotos.map(f => f.ek)).size);
  $('#nNte').title = 'Escolas com fotos enviadas'; $('#nOrc').textContent = fmt(DOC.orc.length);
  const sync = $('#docSync');
  sync.className = 'pill ' + (DOC.mode === 'db' ? 'good' : DOC.mode === 'local' ? 'warn' : '');
  sync.textContent = DOC.mode === 'db' ? 'Salvo para toda a equipe' : DOC.mode === 'local' ? 'Prévia sem salvamento' : 'Conectando…';
  const note = DOC.mode === 'local'
    ? 'Prévia sem salvamento: o que você incluir aqui some ao recarregar. Abra o painel pelo link publicado para que tudo fique salvo para a equipe.'
    : DOC.mode === 'db' && !DOC.canWrite ? 'Seu acesso é de consulta. Para cadastrar links, enviar arquivos ou fotos, peça ao responsável pelo sistema acesso de colaborador.' : '';
  $('#docNote').innerHTML = note ? `<div class="mode-note">${SVG(IC.info)}<span>${note}</span></div>` : '';
  renderDocBody();
}
function buildSec(sec){
  const lead = {
    drives:['Drives compartilhados', 'Links das pastas do Google Drive, OneDrive e SharePoint usadas pela equipe, pelos NTEs e pelas regionais. O arquivo continua no drive; aqui fica o atalho.'],
    repo:['Repositório de documentos', 'Atas de registro de preço em que o órgão é participante, manuais e normas de referência. Os arquivos ficam guardados aqui.'],
    orc:['Orçamentos de rede lógica e elétrica', 'Propostas de empresas para cabeamento lógico e instalação elétrica das escolas. Cada orçamento fica também na pasta da escola, e o menor valor de cada obra é destacado.'],
    nte:['Área dos NTEs', 'Escolha a escola para enviar fotos, anexar plantas e projetos e informar os dados atuais. Tudo fica na pasta da escola e aparece no relatório dela.'],
  }[docTab];
  const addLbl = {drives:'Adicionar link', repo:'Adicionar documento', orc:'Novo orçamento'}[docTab];
  const ph = docTab === 'nte' ? 'Buscar escola ou INEP…' : docTab === 'orc' ? 'Buscar escola ou empresa…' : 'Buscar…';
  const bar = `<div class="sec-bar"><div class="lead"><h2>${lead[0]}</h2><p>${lead[1]}</p></div>
    <div class="search">${SVG(IC.search)}<input class="inp" id="docQ" type="search" placeholder="${ph}" aria-label="${ph}"></div>
    ${addLbl ? `<button class="btn primary" id="docAdd">${SVG(IC.plus)}${addLbl}</button>` : ''}</div>`;
  if (docTab === 'nte'){
    sec.innerHTML = `${bar}<div class="nte-layout">
      <aside class="nte-side card">
        <label class="fl">Regional (NTE)<select class="sel" id="nteReg"><option value="">Todas as regionais (${REG.length})</option>${regSorted.map(r => `<option value="${r.id}">NTE ${esc(r.nome)}</option>`).join('')}</select></label>
        <div class="chipset" id="nteFilt">${[['todas', 'Todas'], ['sem', 'Sem fotos'], ['com', 'Com fotos']].map(([k, t]) => `<button class="chipf" data-f="${k}" aria-pressed="${nte.f === k}">${t}</button>`).join('')}</div>
        <div class="prog" id="nteProg"></div>
        <div class="slist" id="nteList"></div>
      </aside>
      <div class="nte-main" id="docBody"></div></div>`;
    const reg = $('#nteReg', sec); reg.value = nte.reg;
    reg.addEventListener('change', () => { nte.reg = reg.value; store.set('painel.nteReg', nte.reg); if (nte.ek){ const e = byEk(nte.ek); if (e && nte.reg !== '' && e.sre !== +nte.reg) nte.ek = null; } renderNteList(); renderNteMain(); });
    $$('#nteFilt button', sec).forEach(b => b.addEventListener('click', () => { nte.f = b.dataset.f; $$('#nteFilt button', sec).forEach(x => x.setAttribute('aria-pressed', x === b)); renderNteList(); }));
  } else sec.innerHTML = `${bar}<div id="docBody" style="display:flex;flex-direction:column;gap:12px"></div>`;
  const q = $('#docQ', sec); q.value = docQ;
  q.addEventListener('input', () => { docQ = q.value; docTab === 'nte' ? renderNteList() : renderDocBody(); });
  const add = $('#docAdd', sec);
  if (add) add.addEventListener('click', () => { if (!canAdd()) return noWriteMsg(); ({drives:() => openLinkForm(), repo:() => openRepoForm(), orc:() => openOrcForm()})[docTab](); });
}
function renderDocBody(){
  const b = $('#docBody'); if (!b) return;
  if (docTab === 'drives') bodyDrives(b); else if (docTab === 'repo') bodyRepo(b); else if (docTab === 'orc') bodyOrc(b); else { renderNteList(); renderNteMain(); return; }
  resolveNames(b);
}
function emptyBox(ic, t, s, btn){ return `<div class="card empty" style="min-height:220px">${SVG(ic, 1.6)}<b>${t}</b><span style="max-width:460px">${s}</span>${btn || ''}</div>`; }
function chipsHtml(all, cur, attr){ return `<div class="chipset"><button class="chipf" ${attr}="" aria-pressed="${cur === ''}">Todos <i>${all.reduce((a, c) => a + c.n, 0)}</i></button>${all.map(c => `<button class="chipf" ${attr}="${esc(c.k)}" aria-pressed="${cur === c.k}">${esc(c.t)} <i>${c.n}</i></button>`).join('')}</div>`; }

/* ---------- drives ---------- */
function provOf(u){
  let h = ''; try { h = new URL(u).hostname.replace(/^www\./, ''); } catch {}
  if (/(^|\.)drive\.google\.com$|(^|\.)docs\.google\.com$/.test(h)) return {n:'Google Drive', h, ic:IC.folder};
  if (/sharepoint\.com$|onedrive\.live\.com$|^1drv\.ms$/.test(h)) return {n:'OneDrive / SharePoint', h, ic:IC.cloud};
  return {n:'Link externo', h, ic:IC.link};
}
function bodyDrives(b){
  const q = norm(docQ), all = DOC.links;
  if (!all.length){ b.innerHTML = emptyBox(IC.cloud, 'Nenhum drive cadastrado ainda', 'Cadastre as pastas compartilhadas para que a equipe e as regionais encontrem tudo em um só lugar.', `<button class="btn primary" id="emptyAdd">${SVG(IC.plus)}Adicionar o primeiro link</button>`); $('#emptyAdd', b).addEventListener('click', () => canAdd() ? openLinkForm() : noWriteMsg()); return; }
  const list = all.filter(l => (!linkCat || l.cat === linkCat) && (!q || norm([l.titulo, l.desc, l.url, l.cat, regOk(l.sre) && REG[l.sre].nome].join(' ')).includes(q)));
  b.innerHTML = chipsHtml(LINK_CATS.map(c => ({k:c, t:c, n:all.filter(l => l.cat === c).length})).filter(c => c.n), linkCat, 'data-lc') +
    (list.length ? `<div class="lgrid">${list.map(l => { const u = safeUrl(l.url), p = provOf(u || ''), g = regOk(l.sre); return `<div class="lcard card">
      <div class="lh"><span class="prov">${SVG(p.ic)}</span><div style="min-width:0;flex:1"><h3>${esc(l.titulo)}</h3><div class="dom">${esc(p.n)}${p.h ? ' · ' + esc(p.h) : ''}</div></div>
        ${canDel(l) ? `<button class="icon-btn" data-edit="${esc(l.id)}" aria-label="Editar link">${SVG(IC.edit)}</button><button class="icon-btn del" data-del="${esc(l.id)}" aria-label="Remover link">${SVG(IC.trash)}</button>` : ''}</div>
      ${l.desc ? `<p>${esc(l.desc)}</p>` : ''}
      <div class="lf"><span class="pill acc">${esc(l.cat || 'Outros')}</span>${g ? `<span class="pill">NTE ${esc(g.nome)}</span>` : ''}<span class="who">por ${whoHtml(l)} · ${fmtDate(l.criadoEm)}</span>
        ${u ? `<button class="icon-btn" data-copy="${esc(u)}" aria-label="Copiar link">${SVG(IC.copy)}</button><a class="btn" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${SVG(IC.ext)}Abrir</a>` : '<span class="pill bad">Link inválido</span>'}</div>
    </div>`; }).join('')}</div>` : emptyBox(IC.search, 'Nenhum link encontrado', 'Ajuste a busca ou a categoria selecionada.'));
  $$('[data-lc]', b).forEach(c => c.addEventListener('click', () => { linkCat = c.dataset.lc; renderDocBody(); }));
  $$('[data-copy]', b).forEach(c => c.addEventListener('click', () => copyText(c.dataset.copy)));
  $$('[data-edit]', b).forEach(c => c.addEventListener('click', () => { const r = DOC.links.find(x => x.id === c.dataset.edit); if (r) openLinkForm(r); }));
  $$('[data-del]', b).forEach(c => c.addEventListener('click', () => { const r = DOC.links.find(x => x.id === c.dataset.del); if (r) confirmDel('link', r.titulo, () => delRow('links', r)); }));
}
function openLinkForm(l){
  const ov = modal({title:l ? 'Editar link' : 'Adicionar link de drive', body:`
    <label class="fl">Nome da pasta ou documento<input class="inp" id="lkTit" maxlength="120" placeholder="Ex.: Projetos de cabeamento – SRE Juiz de Fora"></label>
    <label class="fl">Link<input class="inp" id="lkUrl" type="url" placeholder="https://drive.google.com/drive/folders/…"></label>
    <div class="form-grid">
      <label class="fl">Categoria<select class="sel" id="lkCat">${LINK_CATS.map(c => `<option>${esc(c)}</option>`).join('')}</select></label>
      <label class="fl">Vale para<select class="sel" id="lkReg"><option value="">Toda a rede</option>${regSorted.map(r => `<option value="${r.id}">NTE ${esc(r.nome)}</option>`).join('')}</select></label>
    </div>
    <label class="fl">Descrição (opcional)<textarea class="inp" id="lkDesc" maxlength="400" placeholder="O que tem na pasta e quem mantém"></textarea></label>
    <div class="note">Confira se a pasta está compartilhada com quem precisa acessar. Este cadastro guarda só o endereço e não altera as permissões do drive.</div>
    <div class="ferr" id="lkErr" hidden></div>`,
    foot:`<button class="btn" data-close>Cancelar</button><button class="btn primary" id="lkOk">${l ? 'Salvar alterações' : 'Salvar link'}</button>`});
  if (l){ $('#lkTit', ov).value = l.titulo || ''; $('#lkUrl', ov).value = l.url || ''; $('#lkCat', ov).value = l.cat || 'Outros'; $('#lkReg', ov).value = Number.isInteger(l.sre) ? l.sre : ''; $('#lkDesc', ov).value = l.desc || ''; }
  $('#lkOk', ov).addEventListener('click', async ev => {
    const t = $('#lkTit', ov).value.trim(), u = safeUrl($('#lkUrl', ov).value), err = $('#lkErr', ov), rg = $('#lkReg', ov).value;
    if (!t || !u){ err.hidden = false; err.textContent = !t ? 'Informe o nome da pasta ou documento.' : 'Informe um link completo, começando com https://'; return; }
    const data = {titulo:t, url:u, cat:$('#lkCat', ov).value, sre:rg === '' ? null : +rg, desc:$('#lkDesc', ov).value.trim()};
    ev.target.disabled = true;
    try { l ? await updRow('links', l.id, data) : await addRow('links', data); closeModal(); toast(l ? 'Link atualizado' : 'Link salvo'); }
    catch (e) { ev.target.disabled = false; err.hidden = false; err.textContent = errMsg(e); }
  });
}

/* ---------- repositório ---------- */
function arpState(vig){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(vig || ''); if (!m) return null;
  const days = Math.round((new Date(+m[1], m[2] - 1, +m[3]) - new Date(new Date().toDateString())) / 86400000);
  return {days, k:days < 0 ? 'b' : days <= 60 ? 'w' : 'g'};
}
function arpPill(vig){
  const s = arpState(vig); if (!s) return '';
  return s.k === 'b' ? '<span class="pill bad">Vencida</span>' : s.k === 'w' ? `<span class="pill warn">Vence em ${plural(s.days, 'dia', 'dias')}</span>` : '<span class="pill good">Vigente</span>';
}
function bodyRepo(b){
  const q = norm(docQ), all = DOC.arquivos.filter(r => r.cat !== 'escola');
  if (!all.length){ b.innerHTML = emptyBox(IC.book, 'O repositório ainda está vazio', 'Envie as atas de registro de preço em que o órgão é participante, os manuais dos equipamentos e as normas de referência.', `<button class="btn primary" id="emptyAdd">${SVG(IC.plus)}Adicionar o primeiro documento</button>`); $('#emptyAdd', b).addEventListener('click', () => canAdd() ? openRepoForm() : noWriteMsg()); return; }
  const hay = r => norm([r.titulo, r.desc, r.nome, r.arp && typeof r.arp === 'object' && Object.values(r.arp).join(' ')].join(' '));
  const list = all.filter(r => (!repCat || r.cat === repCat) && (!q || hay(r).includes(q)));
  const groups = REP_CATS.map(c => ({...c, rows:list.filter(r => (REP_CATS.some(x => x.k === r.cat) ? r.cat : 'outro') === c.k)})).filter(g => g.rows.length);
  groups.forEach(g => { if (g.k === 'arp') g.rows.sort((a, b) => String((a.arp || {}).vig || '9999').localeCompare(String((b.arp || {}).vig || '9999'))); });
  const arps = all.filter(r => r.cat === 'arp'), st = {g:0, w:0, b:0};
  arps.forEach(r => { const s = arpState((r.arp || {}).vig); if (s) st[s.k]++; });
  b.innerHTML = (arps.length ? `<div class="arp-sum"><div class="g"><b class="num">${st.g}</b><span>atas vigentes</span></div><div class="w"><b class="num">${st.w}</b><span>vencem em até 60 dias</span></div><div class="b"><b class="num">${st.b}</b><span>atas vencidas</span></div></div>` : '') +
    chipsHtml(REP_CATS.map(c => ({k:c.k, t:c.t, n:all.filter(r => r.cat === c.k).length})).filter(c => c.n), repCat, 'data-rc') +
    (groups.length ? groups.map(g => `<section class="rgroup card"><div class="rgroup-h"><h3>${g.t}</h3><small>${g.s}</small><span class="ct-n" style="margin-left:auto">${g.rows.length}</span></div>
      ${g.rows.map(r => rowHtml(r, {arp:true, edit:true})).join('')}</section>`).join('')
    : emptyBox(IC.search, 'Nenhum documento encontrado', 'Ajuste a busca ou a categoria selecionada.'));
  $$('[data-rc]', b).forEach(c => c.addEventListener('click', () => { repCat = c.dataset.rc; renderDocBody(); }));
  bindRows(b);
}
/* linha de documento, usada no repositório e na pasta da escola */
function rowHtml(r, o = {}){
  const url = assetUrl(r) || safeUrl(r.link), isLink = r.link && !r.asset && !r._local, x = isLink ? 'lnk' : extOf(r.nome);
  const lab = x === 'lnk' ? 'LINK' : (x || 'arq').toUpperCase().slice(0, 4), cls = x === 'lnk' ? 'lnk' : x === 'pdf' ? 'pdf' : IMG_EXT.includes(x) ? 'img' : '';
  const a = o.arp && r.cat === 'arp' && r.arp && typeof r.arp === 'object' ? r.arp : null;
  return `<div class="rrow"><span class="xt ${cls}">${esc(lab)}</span>
    <div class="ri"><b>${esc(r.titulo)}</b>${r.tipo ? ` <span class="pill acc" style="margin-left:4px">${esc(catName(ESCDOC_CATS, r.tipo))}</span>` : ''}
      <div class="rm">${[r.nome && !isLink ? esc(r.nome) : '', fmtSize(r.tam), 'enviado por ' + whoHtml(r) + ' em ' + fmtDate(r.criadoEm)].filter(Boolean).join(' · ')}</div>
      ${a ? `<div class="arp">${[['ARP nº', a.num], ['Órgão gerenciador', a.org], ['Fornecedor', a.forn], ['Vigência até', fmtIso(a.vig)]].filter(p => p[1]).map(p => `<div><span>${p[0]}</span> <b>${esc(p[1])}</b></div>`).join('')}</div>${a.obj ? `<div class="rd"><span style="color:var(--muted)">Objeto:</span> ${esc(a.obj)}</div>` : ''}` : ''}
      ${r.desc ? `<div class="rd">${esc(r.desc)}</div>` : ''}</div>
    <div class="ra">${a ? arpPill(a.vig) : ''}${url ? `<a class="btn sm" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${SVG(IC.ext)}Abrir</a>` : ''}
      ${canDel(r) ? `${o.edit ? `<button class="icon-btn" data-redit="${esc(r.id)}" aria-label="Editar documento">${SVG(IC.edit)}</button>` : ''}<button class="icon-btn del" data-rdel="${esc(r.id)}" aria-label="Remover documento">${SVG(IC.trash)}</button>` : ''}</div></div>`;
}
function bindRows(root){
  $$('[data-rdel]', root).forEach(c => c.addEventListener('click', () => { const r = DOC.arquivos.find(x => x.id === c.dataset.rdel); if (r) confirmDel('documento', r.titulo, () => delRow('arquivos', r)); }));
  $$('[data-redit]', root).forEach(c => c.addEventListener('click', () => { const r = DOC.arquivos.find(x => x.id === c.dataset.redit); if (r) openRepoForm(r); }));
}
/* r = documento em edição; e = escola (quando o documento é da pasta da escola) */
function openRepoForm(r, e){
  const isEsc = !!e || (r && r.cat === 'escola'); if (r && r.cat === 'escola' && !e) e = byEk(r.ek);
  const canUp = DOC.mode !== 'db' || !!DOC.assets, cats = isEsc ? ESCDOC_CATS : REP_CATS;
  const ov = modal({title:r ? 'Editar documento' : isEsc ? `Anexar documento · ${e ? e.nome : 'escola'}` : 'Adicionar documento ao repositório', wide:true, body:`
    <div class="form-grid">
      <label class="fl">${isEsc ? 'Tipo de documento' : 'Categoria'}<select class="sel" id="rcCat">${cats.map(c => `<option value="${c.k}">${c.t}</option>`).join('')}</select></label>
      <label class="fl">Título<input class="inp" id="rcTit" maxlength="160" placeholder="${isEsc ? 'Ex.: Planta baixa – pavimento térreo' : 'Ex.: Manual do usuário – Chromebook'}"></label>
    </div>
    ${r ? '<div class="note">Para trocar o arquivo, remova este documento e envie o novo.</div>' : `
    <div class="opts" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      <label class="opt"><input type="radio" name="rcSrc" value="file" ${canUp ? 'checked' : 'disabled'}><div><b>Enviar arquivo</b><span>${canUp ? 'PDF ou imagem, até 20 MB' : 'Seu acesso não permite enviar arquivos'}</span></div></label>
      <label class="opt"><input type="radio" name="rcSrc" value="link" ${canUp ? '' : 'checked'}><div><b>Link do arquivo</b><span>Para Word, Excel ou arquivos maiores no Drive</span></div></label>
    </div>
    <div id="rcFileWrap"><div class="drop" id="rcDrop"><input type="file" id="rcFile" accept=".pdf,image/*,.csv,.txt,.md,.json">${SVG(IC.up)}<div><b>Escolha o arquivo</b> ou arraste para cá</div><div id="rcFileName" style="margin-top:4px"></div></div></div>
    <label class="fl" id="rcLinkWrap" hidden>Link<input class="inp" id="rcUrl" type="url" placeholder="https://…"></label>`}
    ${isEsc ? '' : `<div id="rcArp" style="display:flex;flex-direction:column;gap:12px">
      <div class="fsub">Dados da ata</div>
      <div class="form-grid">
        <label class="fl">Nº da ARP<input class="inp" id="rcNum" maxlength="40" placeholder="Ex.: 123/2026"></label>
        <label class="fl">Órgão gerenciador<input class="inp" id="rcOrg" maxlength="120" placeholder="Ex.: SEPLAG-MG"></label>
        <label class="fl">Fornecedor<input class="inp" id="rcForn" maxlength="120"></label>
        <label class="fl">Vigência até<input class="inp" id="rcVig" type="date"></label>
        <label class="fl full">Objeto<input class="inp" id="rcObj" maxlength="300" placeholder="Ex.: Execução de cabeamento lógico e elétrico"></label>
      </div></div>`}
    <label class="fl">Observações (opcional)<textarea class="inp" id="rcDesc" maxlength="500" placeholder="${isEsc ? 'Ex.: versão atualizada após a obra' : 'Ex.: versão vigente, itens em que o órgão é participante'}"></textarea></label>
    <div class="ferr" id="rcErr" hidden></div>`,
    foot:`<button class="btn" data-close>Cancelar</button><button class="btn primary" id="rcOk">${r ? 'Salvar alterações' : 'Salvar documento'}</button>`});
  const src = () => ($('input[name="rcSrc"]:checked', ov) || {}).value;
  const sync = () => { if (!r){ $('#rcFileWrap', ov).hidden = src() !== 'file'; $('#rcLinkWrap', ov).hidden = src() !== 'link'; } const ar = $('#rcArp', ov); if (ar) ar.hidden = $('#rcCat', ov).value !== 'arp'; };
  $$('input[name="rcSrc"]', ov).forEach(x => x.addEventListener('change', sync)); $('#rcCat', ov).addEventListener('change', sync);
  if (r){
    $('#rcCat', ov).value = isEsc ? (r.tipo || 'outro') : r.cat;
    $('#rcTit', ov).value = r.titulo || ''; $('#rcDesc', ov).value = r.desc || '';
    if (r.arp && typeof r.arp === 'object' && !isEsc){ $('#rcNum', ov).value = r.arp.num || ''; $('#rcOrg', ov).value = r.arp.org || ''; $('#rcForn', ov).value = r.arp.forn || ''; $('#rcVig', ov).value = r.arp.vig || ''; $('#rcObj', ov).value = r.arp.obj || ''; }
  } else if (!isEsc && repCat) $('#rcCat', ov).value = repCat;
  sync();
  const fi = $('#rcFile', ov), drop = $('#rcDrop', ov);
  if (drop){
    ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, () => drop.classList.add('over')));
    ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, () => drop.classList.remove('over')));
    fi.addEventListener('change', () => { const f = fi.files[0]; $('#rcFileName', ov).textContent = f ? `${f.name} · ${fmtSize(f.size)}` : ''; if (f && !$('#rcTit', ov).value.trim()) $('#rcTit', ov).value = f.name.replace(/\.[^.]+$/, ''); });
  }
  $('#rcOk', ov).addEventListener('click', async ev => {
    const err = $('#rcErr', ov), fail = m => { err.hidden = false; err.textContent = m; };
    const t = $('#rcTit', ov).value.trim(), cat = $('#rcCat', ov).value;
    if (!t) return fail('Informe o título do documento.');
    const row = isEsc ? {cat:'escola', tipo:cat, titulo:t, desc:$('#rcDesc', ov).value.trim()} : {cat, titulo:t, desc:$('#rcDesc', ov).value.trim()};
    if (isEsc && e) Object.assign(row, {ek:ekey(e), sre:e.sre, escNome:e.nome});
    if (cat === 'arp' && !isEsc) row.arp = {num:$('#rcNum', ov).value.trim(), org:$('#rcOrg', ov).value.trim(), forn:$('#rcForn', ov).value.trim(), vig:$('#rcVig', ov).value, obj:$('#rcObj', ov).value.trim()};
    const f = fi && fi.files[0], u = r ? null : safeUrl(($('#rcUrl', ov) || {}).value);
    if (!r){
      if (src() === 'file' && !f) return fail('Escolha o arquivo a enviar.');
      if (src() === 'file' && !OK_EXT[extOf(f.name)]) return fail(`Arquivos .${extOf(f.name)} não são aceitos aqui. Salve como PDF ou escolha “Link do arquivo” e cole o endereço do Drive.`);
      if (src() === 'file' && f.size > MAXB && !IMG_EXT.includes(extOf(f.name))) return fail(ERR.too_large);
      if (src() === 'link' && !u) return fail('Informe um link completo, começando com https://');
    }
    ev.target.disabled = true; ev.target.textContent = !r && src() === 'file' ? 'Enviando arquivo…' : 'Salvando…';
    try {
      if (r) await updRow('arquivos', r.id, row);
      else { if (src() === 'file') Object.assign(row, await upFile(f)); else row.link = u; await addRow('arquivos', row); }
      closeModal(); toast(r ? 'Documento atualizado' : isEsc ? 'Documento anexado à escola' : 'Documento salvo no repositório');
    } catch (x) { ev.target.disabled = false; ev.target.textContent = r ? 'Salvar alterações' : 'Salvar documento'; fail(errMsg(x)); }
  });
}

/* ---------- pasta da escola (fotos, documentos, dados do NTE) ---------- */
const REDE_PILL = k => { const x = REDE.find(y => y.k === k); return x ? `<span class="pill ${x.c}">${x.t}</span>` : ''; };
function consol(e){
  const out = {}; const regs = regsOf(e);
  ['resp', 'cont', 'rede', 'pcOk', 'pcDef'].forEach(k => { const r = regs.find(x => x[k] !== '' && x[k] != null && x[k] !== 'nv'); if (r) out[k] = {v:r[k], r}; });
  return out;
}
function folderHtml(e, ctx){
  const ph = photosOf(e), cats = PH_CATS.map(c => ({k:c.k, t:c.t, n:ph.filter(f => f.cat === c.k).length})).filter(c => c.n);
  const orcs = orcOf(e), low = lowestSet(), shown = ph.filter(f => !phCat || f.cat === phCat), cov = coverOf(e), cv = consol(e), regs = regsOf(e), docs = docsOf(e);
  const kv = [['Responsável na escola', cv.resp && esc(cv.resp.v)], ['Contato', cv.cont && esc(cv.cont.v)], ['Situação da rede', cv.rede && REDE_PILL(cv.rede.v)], ['Computadores funcionando', cv.pcOk && fmt(cv.pcOk.v)], ['Computadores com defeito', cv.pcDef && fmt(cv.pcDef.v)]].filter(p => p[1]);
  const last = regs[0];
  return `<div class="folder" data-ek="${esc(ekey(e))}">
    <section class="fsec ${ctx === 'rel' ? 'flat' : 'card'}" ${ctx === 'rel' ? 'style="padding:0"' : ''}>
      <div class="fsec-h"><h3>Fotos da escola <small>${ph.length ? plural(ph.length, 'foto', 'fotos') : 'nenhuma ainda'}</small></h3>
        ${ctx === 'rel' ? `<button class="btn sm" data-nte-esc="${e.id}">${SVG(IC.camera)}Abrir na Área dos NTEs</button>` : ''}
        <button class="btn primary sm" data-ph-add>${SVG(IC.camera)}Adicionar fotos</button></div>
      ${ph.length ? (cats.length > 1 ? chipsHtml(cats, phCat, 'data-pc') : '') + `<div class="gal">${shown.map(f => { const u = assetUrl(f); return u ? `<button class="ph ${cov && cov.id === f.id ? 'cap' : ''}" data-ph="${esc(f.id)}" aria-label="Ampliar foto: ${esc(f.legenda || catName(PH_CATS, f.cat))}"><img src="${esc(u)}" alt="${esc(f.legenda || 'Foto da escola')}" loading="lazy"><span class="ph-t">${esc(catName(PH_CATS, f.cat))}</span>${f.legenda ? `<span class="ph-c">${esc(f.legenda)}</span>` : ''}</button>` : ''; }).join('')}</div>`
      : `<div class="empty-in">${SVG(IC.img, 1.6)}<b>Esta escola ainda não tem fotos</b><span>Fotografe a fachada, a sala de informática, o rack e os pontos de Wi-Fi. Você pode escolher várias de uma vez.</span><button class="btn primary" data-ph-add>${SVG(IC.camera)}Adicionar as primeiras fotos</button></div>`}
    </section>
    <section class="fsec ${ctx === 'rel' ? 'flat' : 'card'}" ${ctx === 'rel' ? 'style="padding:0"' : ''}>
      <div class="fsec-h"><h3>Dados informados pelo NTE <small>${last ? 'atualizado em ' + (fmtIso(last.data) || fmtDate(last.criadoEm)) : 'nenhuma atualização'}</small></h3><button class="btn sm" data-up-add>${SVG(IC.edit)}Atualizar dados</button></div>
      ${kv.length ? `<dl class="kv sm">${kv.map(p => `<div><dt>${p[0]}</dt><dd>${p[1]}</dd></div>`).join('')}</dl>` : `<div class="note">Ninguém informou responsável, situação da rede ou computadores desta escola. Use “Atualizar dados” depois da visita ou do contato com a escola.</div>`}
      ${regs.length ? `<details class="hist"><summary>Histórico de atualizações (${regs.length})</summary>${regs.map(r => `<div class="hrow"><div><b>${esc(r.tipo || 'Atualização')}</b> <span class="rm">· ${fmtIso(r.data) || fmtDate(r.criadoEm)} · por ${whoHtml(r)}</span>${r.obs ? `<p>${esc(r.obs)}</p>` : ''}</div>${canDel(r) ? `<button class="icon-btn del" data-up-del="${esc(r.id)}" aria-label="Remover atualização">${SVG(IC.trash)}</button>` : ''}</div>`).join('')}</details>` : ''}
    </section>
    <section class="fsec ${ctx === 'rel' ? 'flat' : 'card'}" ${ctx === 'rel' ? 'style="padding:0"' : ''}>
      <div class="fsec-h"><h3>Orçamentos de rede lógica e elétrica <small>${orcs.length ? plural(orcs.length, 'orçamento', 'orçamentos') : 'nenhum ainda'}</small></h3>${orcs.length > 1 ? `<button class="btn sm" data-orc-cmp="${esc(ekey(e))}">Comparar propostas</button>` : ''}<button class="btn sm" data-orc-add>${SVG(IC.plus)}Novo orçamento</button></div>
      ${orcs.length ? `<div class="drows">${orcs.map(r => orcRow(r, {low})).join('')}</div>` : `<div class="note">Cadastre as propostas recebidas para cabeamento lógico e instalação elétrica. Com mais de uma proposta para a mesma obra, o menor valor aparece destacado.</div>`}
    </section>
    <section class="fsec ${ctx === 'rel' ? 'flat' : 'card'}" ${ctx === 'rel' ? 'style="padding:0"' : ''}>
      <div class="fsec-h"><h3>Plantas, projetos e documentos <small>${docs.length ? plural(docs.length, 'arquivo', 'arquivos') : 'nenhum ainda'}</small></h3><button class="btn sm" data-doc-add>${SVG(IC.plus)}Anexar documento</button></div>
      ${docs.length ? `<div class="drows">${docs.map(r => rowHtml(r)).join('')}</div>` : `<div class="note">Anexe a planta baixa, o projeto de cabeamento lógico e elétrico e laudos. Para arquivos grandes, use o link do Drive.</div>`}
    </section></div>`;
}
function bindFolder(root, e){
  const need = fn => () => canAdd() ? fn() : noWriteMsg();
  $$('[data-ph-add]', root).forEach(b => b.addEventListener('click', need(() => openPhotoForm(e))));
  $$('[data-up-add]', root).forEach(b => b.addEventListener('click', need(() => openUpdForm(e))));
  $$('[data-doc-add]', root).forEach(b => b.addEventListener('click', need(() => openRepoForm(null, e))));
  $$('[data-orc-add]', root).forEach(b => b.addEventListener('click', need(() => openOrcForm(null, e))));
  bindOrc(root);
  $$('[data-pc]', root).forEach(c => c.addEventListener('click', () => { phCat = c.dataset.pc; docRefresh(); }));
  $$('[data-ph]', root).forEach(x => x.addEventListener('click', () => openLb(e, photosOf(e).filter(f => (!phCat || f.cat === phCat) && assetUrl(f)), x.dataset.ph)));
  $$('.ph img', root).forEach(im => im.addEventListener('error', () => im.parentElement.classList.add('broken')));
  $$('[data-up-del]', root).forEach(c => c.addEventListener('click', () => { const r = DOC.nte.find(x => x.id === c.dataset.upDel); if (r) confirmDel('atualização', `${r.tipo || 'Atualização'} de ${fmtIso(r.data) || fmtDate(r.criadoEm)}`, () => delRow('nte', r)); }));
  bindRows(root);
  resolveNames(root);
}
function openLb(e, list, id){
  if (!list.length) return;
  let i = Math.max(0, list.findIndex(f => f.id === id)), arm = false;
  const ov = modal({title:e.nome, wide:true, body:'<div id="lbBox"></div>',
    foot:`<button class="btn" id="lbPrev">Anterior</button><button class="btn" id="lbNext">Próxima</button><span style="flex:1"></span><a class="btn" id="lbOpen" target="_blank" rel="noopener noreferrer">${SVG(IC.ext)}Abrir original</a><button class="btn primary" data-close>Fechar</button>`});
  const show = () => {
    i = (i + list.length) % list.length; arm = false; const f = list[i], u = assetUrl(f), cov = coverOf(e);
    $('#lbBox', ov).innerHTML = `<figure class="lb"><img src="${esc(u)}" alt="${esc(f.legenda || 'Foto da escola')}">
      <div class="lbm"><span class="pill acc">${esc(catName(PH_CATS, f.cat))}</span><span class="lbi num">${i + 1} de ${list.length}</span><span style="flex:1"></span>
        ${cov && cov.id === f.id ? '<span class="pill good">Capa da escola</span>' : `<button class="btn sm" id="lbCap">Usar como capa</button>`}
        ${canDel(f) ? `<button class="btn sm danger" id="lbDel">Excluir foto</button>` : ''}</div>
      ${f.legenda ? `<div class="lbc">${esc(f.legenda)}</div>` : ''}
      <div class="lbi">Enviada por ${whoHtml(f)} em ${fmtDate(f.criadoEm)}${f.tam ? ' · ' + fmtSize(f.tam) : ''}</div></figure>`;
    $('#lbOpen', ov).href = u; resolveNames(ov);
    const cap = $('#lbCap', ov); if (cap) cap.addEventListener('click', async () => { try { await setCover(e, f.id); toast('Capa atualizada'); show(); } catch (x) { toast(errMsg(x)); } });
    const del = $('#lbDel', ov); if (del) del.addEventListener('click', async () => {
      if (!arm){ arm = true; del.textContent = 'Confirmar exclusão'; del.classList.add('solid'); return; }
      del.disabled = true; try { await delRow('fotos', f); list.splice(i, 1); toast('Foto excluída'); if (!list.length) return closeModal(); show(); } catch (x) { del.disabled = false; toast(errMsg(x)); } });
  };
  $('#lbPrev', ov).addEventListener('click', () => { i--; show(); }); $('#lbNext', ov).addEventListener('click', () => { i++; show(); });
  const keys = ev => { if (!ov.isConnected) return document.removeEventListener('keydown', keys); if (ev.key === 'ArrowLeft'){ i--; show(); } else if (ev.key === 'ArrowRight'){ i++; show(); } };
  document.addEventListener('keydown', keys);
  show();
}
function openPhotoForm(e){
  const canUp = DOC.mode !== 'db' || !!DOC.assets;
  let items = [];
  const ov = modal({title:`Adicionar fotos · ${e.nome}`, wide:true, body:`
    <div class="note">As fotos ficam na pasta desta escola e aparecem no relatório dela. Fotos grandes são reduzidas automaticamente antes do envio.</div>
    <div class="drop ${canUp ? '' : 'off'}"><input type="file" id="pfIn" accept="image/png,image/jpeg,image/webp,image/gif" multiple ${canUp ? '' : 'disabled'}>${SVG(IC.camera)}<div>${canUp ? '<b>Escolha as fotos</b> ou arraste para cá' : 'Seu acesso não permite enviar fotos'}</div><div style="font-size:12px;margin-top:3px">Até 20 fotos por envio</div></div>
    <div class="pitems" id="pfList"></div>
    <div class="ferr" id="pfErr" hidden></div>`,
    foot:`<button class="btn" data-close>Cancelar</button><button class="btn primary" id="pfOk" disabled>Enviar fotos</button>`});
  const err = $('#pfErr', ov), fail = m => { err.hidden = !m; err.textContent = m || ''; }, ok = $('#pfOk', ov);
  const paint = () => {
    $('#pfList', ov).innerHTML = items.map((it, i) => `<div class="pitem ${it.err ? 'err' : ''}" data-i="${i}"><img src="${it.u}" alt="">
      <div class="pf"><select class="sel" data-k="cat" aria-label="Tipo da foto">${PH_CATS.map(c => `<option value="${c.k}" ${c.k === it.cat ? 'selected' : ''}>${c.t}</option>`).join('')}</select>
        <input class="inp" data-k="leg" maxlength="140" placeholder="Legenda (opcional)" value="${esc(it.leg)}" aria-label="Legenda"></div>
      <button class="icon-btn" data-rm="${i}" aria-label="Retirar foto" ${it.busy ? 'disabled' : ''}>${SVG(IC.x)}</button>
      ${it.msg ? `<div class="st">${esc(it.msg)}</div>` : ''}</div>`).join('');
    ok.disabled = !items.length; ok.textContent = items.length ? `Enviar ${plural(items.length, 'foto', 'fotos')}` : 'Enviar fotos';
    $$('[data-rm]', ov).forEach(x => x.addEventListener('click', () => { URL.revokeObjectURL(items[+x.dataset.rm].u); items.splice(+x.dataset.rm, 1); paint(); }));
  };
  $('#pfList', ov).addEventListener('input', ev => { const row = ev.target.closest('[data-i]'); if (row && ev.target.dataset.k) items[+row.dataset.i][ev.target.dataset.k] = ev.target.value; });
  const fi = $('#pfIn', ov), drop = fi.parentElement;
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, () => drop.classList.add('over')));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, () => drop.classList.remove('over')));
  fi.addEventListener('change', () => {
    fail('');
    [...fi.files].forEach(f => {
      if (!IMG_EXT.includes(extOf(f.name))) return fail(`“${f.name}” não é uma foto aceita (use JPG, PNG ou WEBP).`);
      if (items.length >= 20) return fail('Limite de 20 fotos por envio. Envie estas e adicione as demais depois.');
      const prev = items[items.length - 1];
      items.push({f, u:URL.createObjectURL(f), cat:prev ? prev.cat : (phCat || (photosOf(e).length ? 'salas' : 'fachada')), leg:''});
    });
    fi.value = ''; paint();
  });
  ok.addEventListener('click', async () => {
    fail(''); ok.disabled = true; let n = 0;
    for (const it of [...items]){
      it.msg = 'Enviando…'; it.busy = true; it.err = false; paint(); ok.disabled = true; ok.textContent = 'Enviando…';
      try {
        const up = await upFile(it.f);
        const row = {ek:ekey(e), sre:e.sre, escNome:e.nome, cat:it.cat, legenda:it.leg.trim(), tam:up.tam, nome:up.nome};
        if (up.asset) row.asset = up.asset; else row._local = up._local;
        await addRow('fotos', row);
        n++; items.splice(items.indexOf(it), 1);
      } catch (x) { it.busy = false; it.err = true; it.msg = errMsg(x); }
    }
    items.forEach(it => { it.busy = false; }); paint();
    if (items.length) fail(`${plural(n, 'foto salva', 'fotos salvas')}. As ${items.length === 1 ? 'outra não foi enviada' : 'outras não foram enviadas'}; revise e tente de novo.`);
    else { closeModal(); toast(`${plural(n, 'foto salva', 'fotos salvas')} em ${esc(e.nome)}`); }
  });
}
function openUpdForm(e){
  const cv = consol(e), val = k => cv[k] ? esc(cv[k].v) : '';
  const ov = modal({title:`Atualizar dados · ${e.nome}`, wide:true, body:`
    <div class="note">Informe só o que você confirmou. Os campos deixados em branco mantêm o valor da última atualização.</div>
    <div class="form-grid">
      <label class="fl">Tipo de registro<select class="sel" id="nfTipo">${NTE_TIPOS.map(t => `<option>${t}</option>`).join('')}</select></label>
      <label class="fl">Data<input class="inp" id="nfData" type="date" value="${todayIso()}" max="${todayIso()}"></label>
      <label class="fl">Responsável na escola<input class="inp" id="nfResp" maxlength="120" placeholder="Nome e função" value="${val('resp')}"></label>
      <label class="fl">Contato<input class="inp" id="nfCont" maxlength="120" placeholder="Telefone ou e-mail" value="${val('cont')}"></label>
      <label class="fl">Situação da rede<select class="sel" id="nfRede"><option value="">Manter como está</option>${REDE.map(x => `<option value="${x.k}">${x.t}</option>`).join('')}</select></label>
      <div class="form-grid" style="gap:10px">
        <label class="fl">PCs funcionando<input class="inp num" id="nfPcOk" type="number" min="0" step="1" inputmode="numeric" value="${val('pcOk')}"></label>
        <label class="fl">PCs com defeito<input class="inp num" id="nfPcDef" type="number" min="0" step="1" inputmode="numeric" value="${val('pcDef')}"></label>
      </div>
      <label class="fl full">Observações<textarea class="inp" id="nfObs" maxlength="2000" placeholder="O que foi verificado, problemas encontrados e próximos passos"></textarea></label>
    </div>
    <div class="ferr" id="nfErr" hidden></div>`,
    foot:`<button class="btn" data-close>Cancelar</button><button class="btn primary" id="nfOk">Salvar atualização</button>`});
  $('#nfOk', ov).addEventListener('click', async ev => {
    const err = $('#nfErr', ov), n = v => v === '' ? '' : Math.max(0, Math.round(+v) || 0), g = id => $(id, ov).value;
    const row = {ek:ekey(e), sre:e.sre, escNome:e.nome, tipo:g('#nfTipo'), data:g('#nfData'), resp:g('#nfResp').trim(), cont:g('#nfCont').trim(), rede:g('#nfRede'), pcOk:n(g('#nfPcOk')), pcDef:n(g('#nfPcDef')), obs:g('#nfObs').trim()};
    const same = (k, a) => cv[k] && String(cv[k].v) === String(a);
    if (same('resp', row.resp)) row.resp = ''; if (same('cont', row.cont)) row.cont = ''; if (same('pcOk', row.pcOk)) row.pcOk = ''; if (same('pcDef', row.pcDef)) row.pcDef = '';
    if (!row.resp && !row.cont && !row.rede && row.pcOk === '' && row.pcDef === '' && !row.obs){ err.hidden = false; err.textContent = 'Nada mudou. Altere um dado ou escreva uma observação.'; return; }
    ev.target.disabled = true;
    try { await addRow('nte', row); closeModal(); toast('Atualização salva'); }
    catch (x) { ev.target.disabled = false; err.hidden = false; err.textContent = errMsg(x); }
  });
}

/* ---------- área dos NTEs ---------- */
function nteSchools(){
  const q = norm(docQ);
  return ESC.filter(e => (nte.reg === '' || e.sre === +nte.reg) && (!q || norm([e.nome, e.inep, munById[e.mun].nome].join(' ')).includes(q))
    && (nte.f === 'todas' || (nte.f === 'sem') === (photosOf(e).length === 0)))
    .sort((a, b) => nte.reg === '' ? coll.compare(REG[a.sre].nome, REG[b.sre].nome) || coll.compare(a.nome, b.nome) : coll.compare(a.nome, b.nome));
}
function renderNteList(){
  const list = $('#nteList'); if (!list) return;
  const scope = ESC.filter(e => nte.reg === '' || e.sre === +nte.reg), com = scope.filter(e => photosOf(e).length).length;
  $('#nteProg').innerHTML = `<div><strong class="num">${com}</strong> de <span class="num">${scope.length}</span> escolas com fotos</div><div class="bar2"><b style="width:${scope.length ? Math.round(com / scope.length * 100) : 0}%"></b></div>`;
  const ss = nteSchools();
  list.innerHTML = ss.length ? ss.map(e => {
    const n = photosOf(e).length, cov = coverOf(e), u = cov && assetUrl(cov), r = regsOf(e)[0];
    return `<button class="srow" data-ek="${esc(ekey(e))}" aria-selected="${nte.ek === ekey(e)}"><span class="sthumb">${u ? `<img src="${esc(u)}" alt="" loading="lazy">` : SVG(IC.school)}</span>
      <span><b>${esc(e.nome)}</b><span>${esc(munById[e.mun].nome)}${nte.reg === '' ? ' · ' + esc(REG[e.sre].nome) : ''}</span><span class="${n ? '' : 'none'}">${n ? plural(n, 'foto', 'fotos') : 'Sem fotos'}${r ? ' · atualizada em ' + (fmtIso(r.data) || fmtDate(r.criadoEm)) : ''}</span></span></button>`; }).join('')
    : `<div class="snote">Nenhuma escola encontrada${nte.f === 'sem' ? '. Todas as escolas deste filtro já têm fotos.' : '.'}</div>`;
  $$('.srow img', list).forEach(im => im.addEventListener('error', () => im.remove()));
  $$('.srow', list).forEach(b => b.addEventListener('click', () => { nte.ek = b.dataset.ek; renderNteList(); renderNteMain(); if (matchMedia('(max-width:980px)').matches) $('#docBody').scrollIntoView({behavior:'smooth', block:'start'}); }));
}
function renderNteMain(){
  const m = $('#docBody'); if (!m) return;
  const e = nte.ek && byEk(nte.ek);
  if (!e){
    const scope = ESC.filter(s => nte.reg === '' || s.sre === +nte.reg), ks = new Set(scope.map(ekey));
    const fotos = DOC.fotos.filter(f => ks.has(f.ek)), regs = DOC.nte.filter(r => ks.has(r.ek));
    const acts = [...fotos.map(f => ({t:'Foto', r:f, ms:f.criadoEm, txt:`${catName(PH_CATS, f.cat)}${f.legenda ? ' · ' + f.legenda : ''}`})), ...regs.map(r => ({t:r.tipo || 'Atualização', r, ms:r.criadoEm, txt:r.obs || 'Dados atualizados'}))].sort((a, b) => b.ms - a.ms).slice(0, 8);
    m.innerHTML = `<div class="ov-stats"><div><b class="num">${new Set(fotos.map(f => f.ek)).size}<span style="font-size:14px;color:var(--muted)"> / ${scope.length}</span></b><span>escolas com fotos</span></div><div><b class="num">${fmt(fotos.length)}</b><span>fotos enviadas</span></div><div><b class="num">${fmt(regs.length)}</b><span>atualizações de dados</span></div></div>
      <div class="how card"><h3>Como enviar fotos e dados de uma escola</h3><ol><li>Escolha a regional e clique na escola na lista ao lado. Use “Sem fotos” para ver o que falta.</li><li>Em <b>Adicionar fotos</b>, selecione as imagens, indique o que cada uma mostra e envie.</li><li>Em <b>Atualizar dados</b>, informe responsável, situação da rede e computadores.</li><li>Em <b>Anexar documento</b>, guarde planta baixa e projetos da escola.</li><li>Em <b>Novo orçamento</b>, registre as propostas de rede lógica e elétrica.</li></ol></div>
      <div class="act card"><h3>Últimos envios</h3>${acts.length ? acts.map(a => { const s = byEk(a.r.ek); return `<div class="arow"><span class="k">${esc(a.t)}</span><span class="t">${s ? `<button class="lnk" data-pick="${esc(a.r.ek)}">${esc(s.nome)}</button>` : esc(a.r.escNome || 'Escola')} <span class="who">· ${esc(a.txt.length > 90 ? a.txt.slice(0, 90) + '…' : a.txt)}</span></span><span class="who">${whoHtml(a.r)} · ${fmtDate(a.ms)}</span></div>`; }).join('') : '<div class="who">Ainda não há envios. Os mais recentes aparecem aqui.</div>'}</div>`;
    $$('[data-pick]', m).forEach(b => b.addEventListener('click', () => { nte.ek = b.dataset.pick; const s = byEk(nte.ek); if (s && nte.reg !== '' && s.sre !== +nte.reg){ nte.reg = String(s.sre); $('#nteReg').value = nte.reg; } renderNteList(); renderNteMain(); }));
    resolveNames(m); return;
  }
  const cov = coverOf(e), u = cov && assetUrl(cov);
  m.innerHTML = `<div class="card fhead"><div class="cov">${u ? `<img src="${esc(u)}" alt="Capa de ${esc(e.nome)}">` : SVG(IC.school, 1.6)}</div>
    <div class="ft"><h2>${esc(e.nome)}</h2><div class="rm">${esc(regName(e.sre).replace('SRE', 'NTE'))} · ${esc(munById[e.mun].nome)} · INEP <span class="num">${esc(e.inep)}</span></div></div>
    <div class="fa"><button class="btn" id="openRel">${SVG(IC.school)}Relatório completo</button></div></div>${folderHtml(e, 'nte')}`;
  $('#openRel', m).addEventListener('click', () => openSchool(e.id));
  $$('.fhead img', m).forEach(im => im.addEventListener('error', () => im.remove()));
  bindFolder(m, e);
}
function goNte(id){
  const e = ESC.find(s => s.id === id); if (!e) return;
  nte.ek = ekey(e); nte.reg = String(e.sre); nte.f = 'todas'; docTab = 'nte'; docQ = ''; store.set('painel.nteReg', nte.reg);
  $('#v-doc').dataset.sec = ''; showTab('doc'); $('#v-doc').scrollTop = 0;
}
document.addEventListener('click', ev => { const b = ev.target.closest('[data-nte-esc]'); if (b) goNte(+b.dataset.nteEsc); });
function photoPill(e){ const n = photosOf(e).length; return `<span class="pill ${n ? 'acc' : ''}">${n ? plural(n, 'foto', 'fotos') : 'Sem fotos'}</span>`; }

/* ---------- orçamentos de rede lógica e elétrica ---------- */
const ORC_TIPOS = [{k:'logica', t:'Rede lógica'}, {k:'eletrica', t:'Rede elétrica'}, {k:'ambas', t:'Lógica e elétrica'}];
const ORC_ST = [{k:'rec', t:'Recebido', c:''}, {k:'ana', t:'Em análise', c:'warn'}, {k:'apr', t:'Aprovado', c:'good'}, {k:'rep', t:'Não aprovado', c:'bad'}];
const orcF = {reg:'', tipo:'', st:''};
const brl = v => Number(v).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
const orcOf = e => DOC.orc.filter(r => r.ek === ekey(e));
function lowestSet(){
  const m = {}, s = new Set();
  DOC.orc.forEach(r => { if (r.status === 'rep' || !(r.valor > 0)) return; (m[r.ek + '|' + r.tipo] = m[r.ek + '|' + r.tipo] || []).push(r); });
  Object.values(m).forEach(a => { if (a.length > 1){ const min = Math.min(...a.map(x => x.valor)); a.filter(x => x.valor === min).forEach(x => s.add(x.id)); } });
  return s;
}
function orcRow(r, o = {}){
  const url = assetUrl(r) || safeUrl(r.link), st = ORC_ST.find(x => x.k === r.status) || ORC_ST[0], s = byEk(r.ek);
  const exp = r.validade && r.validade < todayIso() && r.status !== 'apr' && r.status !== 'rep';
  const meta = [r.data ? 'orçamento de ' + fmtIso(r.data) : '', r.validade ? 'válido até ' + fmtIso(r.validade) : '', r.pontos !== '' && r.pontos != null ? plural(r.pontos, 'ponto', 'pontos') : '', r.ref ? 'ref.: ' + esc(r.ref) : ''].filter(Boolean).join(' · ');
  return `<div class="orow"><div class="oi">
      <b>${esc(catName(ORC_TIPOS, r.tipo))}${r.forn ? ' · ' + esc(r.forn) : ''}</b>
      ${o.school ? `<div class="rm">${s ? `<button class="lnk" data-orc-school="${esc(r.ek)}">${esc(s.nome)}</button>` : esc(r.escNome || 'Escola')} · ${esc(r.munNome || (s ? munById[s.mun].nome : ''))}${regOk(r.sre) ? ' · NTE ' + esc(REG[r.sre].nome) : ''}</div>` : ''}
      ${meta ? `<div class="rm">${meta}</div>` : ''}
      ${r.obs ? `<div class="rd">${esc(r.obs)}</div>` : ''}
      <div class="rm">enviado por ${whoHtml(r)} em ${fmtDate(r.criadoEm)}${r.tam ? ' · ' + fmtSize(r.tam) : ''}</div>
      ${DOC.orc.filter(x => x.ek === r.ek && x.tipo === r.tipo).length > 1 ? `<button class="lnk" style="font-size:12.5px;margin-top:4px;color:var(--accent-strong)" data-orc-cmp="${esc(r.ek)}">Comparar as ${DOC.orc.filter(x => x.ek === r.ek && x.tipo === r.tipo).length} propostas</button>` : ''}</div>
    <div class="oval"><b class="num">${r.valor > 0 ? brl(r.valor) : '—'}</b>${o.low && o.low.has(r.id) ? '<span class="pill good">Menor valor</span>' : ''}${exp ? '<span class="pill bad">Validade vencida</span>' : ''}</div>
    <div class="ra">${canAdd() ? `<select class="sel sm" data-orc-st="${esc(r.id)}" aria-label="Situação do orçamento">${ORC_ST.map(x => `<option value="${x.k}" ${x.k === (r.status || 'rec') ? 'selected' : ''}>${x.t}</option>`).join('')}</select>` : `<span class="pill ${st.c}">${st.t}</span>`}
      ${url ? `<a class="btn sm" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${SVG(IC.ext)}Abrir</a>` : ''}
      ${canDel(r) ? `<button class="icon-btn" data-orc-edit="${esc(r.id)}" aria-label="Editar orçamento">${SVG(IC.edit)}</button><button class="icon-btn del" data-orc-del="${esc(r.id)}" aria-label="Remover orçamento">${SVG(IC.trash)}</button>` : ''}</div></div>`;
}
function bindOrc(root){
  $$('[data-orc-st]', root).forEach(s => s.addEventListener('change', async () => { try { await updRow('orc', s.dataset.orcSt, {status:s.value}); toast('Situação atualizada'); } catch (x) { toast(errMsg(x)); docRefresh(); } }));
  $$('[data-orc-edit]', root).forEach(c => c.addEventListener('click', () => { const r = DOC.orc.find(x => x.id === c.dataset.orcEdit); if (r) openOrcForm(r); }));
  $$('[data-orc-del]', root).forEach(c => c.addEventListener('click', () => { const r = DOC.orc.find(x => x.id === c.dataset.orcDel); if (r) confirmDel('orçamento', `${catName(ORC_TIPOS, r.tipo)}${r.forn ? ' · ' + r.forn : ''}`, () => delRow('orc', r)); }));
  $$('[data-orc-cmp]', root).forEach(c => c.addEventListener('click', () => { const s = byEk(c.dataset.orcCmp); if (s) openCompare(s); }));
  $$('[data-orc-school]', root).forEach(c => c.addEventListener('click', () => { const s = byEk(c.dataset.orcSchool); if (s) goNte(s.id); }));
}
function bodyOrc(b){
  const q = norm(docQ), all = DOC.orc, low = lowestSet();
  if (!all.length){ b.innerHTML = emptyBox(IC.book, 'Nenhum orçamento cadastrado', 'Os NTEs enviam aqui os orçamentos de cabeamento lógico e de instalação elétrica das escolas, com fornecedor, valor e o arquivo da proposta.', `<button class="btn primary" id="emptyAdd">${SVG(IC.plus)}Cadastrar o primeiro orçamento</button>`); $('#emptyAdd', b).addEventListener('click', () => canAdd() ? openOrcForm() : noWriteMsg()); return; }
  const base = all.filter(r => (orcF.reg === '' || r.sre === +orcF.reg) && (!q || norm([r.escNome, r.forn, r.ref, r.obs, r.munNome].join(' ')).includes(q)));
  const list = base.filter(r => (!orcF.tipo || r.tipo === orcF.tipo) && (!orcF.st || (r.status || 'rec') === orcF.st));
  const apr = base.filter(r => r.status === 'apr'), ana = base.filter(r => r.status === 'ana');
  const cnt = (arr, k, f) => arr.filter(r => (f ? (r.status || 'rec') : r.tipo) === k).length;
  b.innerHTML = `<div class="ov-stats four"><div><b class="num">${fmt(base.length)}</b><span>orçamentos</span></div><div><b class="num">${fmt(new Set(base.map(r => r.ek)).size)}</b><span>escolas com orçamento</span></div><div><b class="num">${fmt(ana.length)}</b><span>em análise</span></div><div><b class="num">${brl(apr.reduce((a, r) => a + (+r.valor || 0), 0))}</b><span>aprovados (${fmt(apr.length)})</span></div></div>
    <div class="ofilt"><label class="fl" style="min-width:200px">Regional<select class="sel" id="orReg"><option value="">Todas as regionais</option>${regSorted.map(r => `<option value="${r.id}">NTE ${esc(r.nome)}</option>`).join('')}</select></label>
      <div class="chipset">${[['', 'Todos os tipos', base.length], ...ORC_TIPOS.map(t => [t.k, t.t, cnt(base, t.k)])].map(([k, t, n]) => `<button class="chipf" data-ot="${k}" aria-pressed="${orcF.tipo === k}">${t} <i>${n}</i></button>`).join('')}</div>
      <div class="chipset">${[['', 'Todas as situações'], ...ORC_ST.map(s => [s.k, s.t])].map(([k, t]) => `<button class="chipf" data-os="${k}" aria-pressed="${orcF.st === k}">${t}${k ? ` <i>${cnt(base, k, 1)}</i>` : ''}</button>`).join('')}</div></div>
    ${list.length ? `<section class="card rgroup">${list.map(r => orcRow(r, {school:true, low})).join('')}</section>` : emptyBox(IC.search, 'Nenhum orçamento para este filtro', 'Ajuste a regional, o tipo ou a situação.')}`;
  $('#orReg', b).value = orcF.reg;
  $('#orReg', b).addEventListener('change', ev => { orcF.reg = ev.target.value; renderDocBody(); });
  $$('[data-ot]', b).forEach(c => c.addEventListener('click', () => { orcF.tipo = c.dataset.ot; renderDocBody(); }));
  $$('[data-os]', b).forEach(c => c.addEventListener('click', () => { orcF.st = c.dataset.os; renderDocBody(); }));
  bindOrc(b);
}
/* r = orçamento em edição; e = escola já definida (pasta da escola) */
function openOrcForm(r, e){
  if (r && !e) e = byEk(r.ek);
  const canUp = DOC.mode !== 'db' || !!DOC.assets;
  const ov = modal({title:r ? 'Editar orçamento' : e ? `Novo orçamento · ${e.nome}` : 'Novo orçamento', wide:true, body:`
    ${e ? '' : `<div class="form-grid">
      <label class="fl">Regional (NTE)<select class="sel" id="orRg"><option value="">Selecione…</option>${regSorted.map(x => `<option value="${x.id}">NTE ${esc(x.nome)}</option>`).join('')}</select></label>
      <label class="fl">Escola<select class="sel" id="orEs" disabled><option value="">Escolha a regional primeiro</option></select></label></div>`}
    <div class="form-grid">
      <label class="fl">Tipo de obra<select class="sel" id="orTipo">${ORC_TIPOS.map(t => `<option value="${t.k}">${t.t}</option>`).join('')}</select></label>
      <label class="fl">Fornecedor / empresa<input class="inp" id="orForn" maxlength="120" placeholder="Nome da empresa que fez a proposta"></label>
      <label class="fl">Valor total (R$)<input class="inp num" id="orVal" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00"></label>
      <label class="fl">Pontos de rede previstos<input class="inp num" id="orPts" type="number" min="0" step="1" inputmode="numeric" placeholder="Opcional"></label>
      <label class="fl">Data do orçamento<input class="inp" id="orData" type="date" value="${todayIso()}" max="${todayIso()}"></label>
      <label class="fl">Validade da proposta<input class="inp" id="orVal2" type="date"></label>
      <label class="fl">Ata ou referência<input class="inp" id="orRef" maxlength="80" placeholder="Ex.: ARP SEPLAG nº 045/2026"></label>
      <label class="fl">Situação<select class="sel" id="orSt">${ORC_ST.map(s => `<option value="${s.k}">${s.t}</option>`).join('')}</select></label>
      <label class="fl full">Observações<textarea class="inp" id="orObs" maxlength="1000" placeholder="Itens incluídos, prazo de execução, condições de pagamento"></textarea></label>
    </div>
    ${r ? '<div class="note">Para trocar o arquivo da proposta, remova este orçamento e cadastre de novo.</div>' : `
    <div class="fsub">Proposta</div>
    <div class="drop ${canUp ? '' : 'off'}"><input type="file" id="orFile" accept=".pdf,image/*" ${canUp ? '' : 'disabled'}>${SVG(IC.up)}<div>${canUp ? '<b>Anexe a proposta</b> em PDF ou foto (até 20 MB)' : 'Seu acesso não permite enviar arquivos'}</div><div id="orFileName" style="margin-top:4px"></div></div>
    <label class="fl">Ou link da proposta no Drive (opcional)<input class="inp" id="orLink" type="url" placeholder="https://…"></label>`}
    <div class="ferr" id="orErr" hidden></div>`,
    foot:`<button class="btn" data-close>Cancelar</button><button class="btn primary" id="orOk">${r ? 'Salvar alterações' : 'Salvar orçamento'}</button>`});
  const g = id => $(id, ov);
  if (!e){ const rg = g('#orRg'), es = g('#orEs');
    rg.addEventListener('change', () => { const ls = ESC.filter(s => s.sre === +rg.value).sort((a, b) => coll.compare(a.nome, b.nome)); es.disabled = rg.value === ''; es.innerHTML = rg.value === '' ? '<option value="">Escolha a regional primeiro</option>' : '<option value="">Selecione a escola…</option>' + ls.map(s => `<option value="${s.id}">${esc(s.nome)} · ${esc(munById[s.mun].nome)}</option>`).join(''); });
    if (orcF.reg !== ''){ rg.value = orcF.reg; rg.dispatchEvent(new Event('change')); } }
  if (r){ g('#orTipo').value = r.tipo || 'logica'; g('#orForn').value = r.forn || ''; g('#orVal').value = r.valor > 0 ? r.valor : ''; g('#orPts').value = r.pontos ?? ''; g('#orData').value = r.data || ''; g('#orVal2').value = r.validade || ''; g('#orRef').value = r.ref || ''; g('#orSt').value = r.status || 'rec'; g('#orObs').value = r.obs || ''; }
  const fi = g('#orFile'); if (fi) fi.addEventListener('change', () => { const f = fi.files[0]; g('#orFileName').textContent = f ? `${f.name} · ${fmtSize(f.size)}` : ''; });
  g('#orOk').addEventListener('click', async ev => {
    const err = g('#orErr'), fail = m => { err.hidden = false; err.textContent = m; };
    const sc = e || ESC.find(s => s.id === +(g('#orEs') || {}).value);
    if (!sc) return fail('Selecione a regional e a escola.');
    const val = g('#orVal').value === '' ? 0 : Math.round(+g('#orVal').value * 100) / 100, pts = g('#orPts').value;
    if (!(val > 0)) return fail('Informe o valor total do orçamento.');
    if (!g('#orForn').value.trim()) return fail('Informe o fornecedor ou a empresa.');
    const row = {ek:ekey(sc), sre:sc.sre, escNome:sc.nome, munNome:munById[sc.mun].nome, tipo:g('#orTipo').value, forn:g('#orForn').value.trim(), valor:val, pontos:pts === '' ? '' : Math.max(0, Math.round(+pts)), data:g('#orData').value, validade:g('#orVal2').value, ref:g('#orRef').value.trim(), status:g('#orSt').value, obs:g('#orObs').value.trim()};
    const f = fi && fi.files[0], u = safeUrl((g('#orLink') || {}).value);
    if (!r){
      if (f && !OK_EXT[extOf(f.name)]) return fail('Anexe a proposta em PDF ou foto. Para Word ou Excel, cole o link do Drive.');
      if (f && f.size > MAXB && !IMG_EXT.includes(extOf(f.name))) return fail(ERR.too_large);
      if (!f && !u && !confirm_nofile) { confirm_nofile = true; return fail('Nenhuma proposta anexada. Clique em salvar de novo para registrar assim mesmo.'); }
    }
    ev.target.disabled = true; ev.target.textContent = f ? 'Enviando proposta…' : 'Salvando…';
    try {
      if (r) await updRow('orc', r.id, row);
      else { if (f) Object.assign(row, await upFile(f)); else if (u) row.link = u; await addRow('orc', row); }
      confirm_nofile = false; closeModal(); toast(r ? 'Orçamento atualizado' : 'Orçamento salvo'); if (!r && docTab === 'orc' && orcF.reg !== '' && orcF.reg !== String(sc.sre)) { orcF.reg = ''; renderDocBody(); }
    } catch (x) { ev.target.disabled = false; ev.target.textContent = r ? 'Salvar alterações' : 'Salvar orçamento'; fail(errMsg(x)); }
  });
}
let confirm_nofile = false;


/* ---------- quadro comparativo de propostas ---------- */
function openCompare(e){
  const all = orcOf(e), today = todayIso();
  const groups = ORC_TIPOS.map(t => ({t, rows:all.filter(r => r.tipo === t.k).sort((a, b) => a.valor - b.valor)})).filter(g => g.rows.length);
  const ok = r => r.status !== 'rep' && !(r.validade && r.validade < today) && r.valor > 0;
  const pp = r => r.pontos > 0 ? r.valor / r.pontos : null;
  const stName = r => (ORC_ST.find(x => x.k === (r.status || 'rec')) || ORC_ST[0]).t;
  let tsv = `Comparativo de propostas\t${e.nome}\tINEP ${e.inep}\n`;
  const body = groups.map(g => {
    const cols = g.rows, elig = cols.filter(ok), allPts = elig.length > 0 && elig.every(r => pp(r) != null), min = Math.min(...cols.map(r => r.valor));
    const rec = elig.length ? [...elig].sort((a, b) => allPts ? pp(a) - pp(b) : a.valor - b.valor)[0] : null;
    const diff = r => r.valor === min ? 'menor valor' : `+ ${brl(r.valor - min)} (+${((r.valor / min - 1) * 100).toLocaleString('pt-BR', {maximumFractionDigits:1})}%)`;
    const defs = [
      ['Valor total', r => `<b class="num">${brl(r.valor)}</b>`, r => brl(r.valor)],
      ['Pontos de rede', r => r.pontos !== '' && r.pontos != null ? fmt(r.pontos) : '—', r => r.pontos !== '' && r.pontos != null ? r.pontos : ''],
      ['Valor por ponto', r => pp(r) != null ? `<span class="num">${brl(pp(r))}</span>` : '—', r => pp(r) != null ? brl(pp(r)) : ''],
      ['Diferença para o menor valor', r => diff(r), r => diff(r)],
      ['Data do orçamento', r => fmtIso(r.data) || '—', r => fmtIso(r.data)],
      ['Validade da proposta', r => r.validade ? fmtIso(r.validade) + (r.validade < today ? ' <span class="pill bad">vencida</span>' : '') : '—', r => fmtIso(r.validade)],
      ['Ata ou referência', r => r.ref ? esc(r.ref) : '—', r => r.ref || ''],
      ['Situação', r => { const s = ORC_ST.find(x => x.k === (r.status || 'rec')) || ORC_ST[0]; return `<span class="pill ${s.c}">${s.t}</span>`; }, stName],
      ['Observações', r => r.obs ? esc(r.obs) : '—', r => (r.obs || '').replace(/\s+/g, ' ')],
      ['Proposta', r => { const u = assetUrl(r) || safeUrl(r.link); return u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">Abrir arquivo</a>` : '—'; }, r => safeUrl(r.link) || (r.nome || '')],
    ];
    tsv += `\n${g.t.t}\n\t${cols.map(r => r.forn || '—').join('\t')}\n` + defs.map(d => `${d[0]}\t${cols.map(r => d[2](r)).join('\t')}`).join('\n') + `\nSugestão\t${cols.map(r => rec && r.id === rec.id ? 'Recomendada' : '').join('\t')}\n`;
    const notes = [];
    notes.push(rec ? `<b>Sugestão:</b> ${esc(rec.forn || 'proposta')}, com o ${allPts ? 'menor valor por ponto' : 'menor valor total'} entre as propostas válidas e não reprovadas.` : 'Nenhuma proposta pode ser sugerida: todas estão reprovadas, vencidas ou sem valor.');
    const pts = cols.map(r => r.pontos).filter(p => p !== '' && p != null);
    if (pts.length && pts.length < cols.length) notes.push('Nem todas as propostas informam o número de pontos, então a sugestão usa o valor total.');
    else if (new Set(pts).size > 1) notes.push('As propostas têm quantidades de pontos diferentes. Compare pelo valor por ponto.');
    return `<section class="cmpg"><h3>${g.t.t} <small>${plural(cols.length, 'proposta', 'propostas')}</small></h3>
      <div class="cmpw"><table class="cmp"><thead><tr><th></th>${cols.map(r => `<th class="${rec && r.id === rec.id ? 'rec' : ''}">${esc(r.forn || '—')}<div class="bd">${rec && r.id === rec.id ? '<span class="pill good">Recomendada</span>' : ''}${r.valor === min && cols.length > 1 ? '<span class="pill acc">Menor valor</span>' : ''}</div></th>`).join('')}</tr></thead>
      <tbody>${defs.map(d => `<tr><th scope="row">${d[0]}</th>${cols.map(r => `<td class="${rec && r.id === rec.id ? 'rec' : ''}">${d[1](r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="note">${notes.join(' ')}</div></section>`;
  }).join('');
  const ov = modal({title:`Comparativo de propostas · ${e.nome}`, wide:true, body:`<div class="rm" style="margin-top:-6px">${esc(munById[e.mun].nome)} · INEP ${esc(e.inep)}</div>${body}<div class="note">A sugestão considera só o preço. A decisão final também avalia prazo de execução, qualidade dos materiais e adequação à ata de registro de preço.</div>`,
    foot:`<button class="btn" id="cmpCopy">${SVG(IC.copy)}Copiar quadro</button><button class="btn primary" data-close>Fechar</button>`});
  $('.modal', ov).classList.add('xwide');
  $('#cmpCopy', ov).addEventListener('click', () => copyText(tsv, 'Quadro copiado. Cole no Excel ou no documento do processo.'));
}

docConnect();



