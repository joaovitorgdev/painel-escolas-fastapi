/* =========================================================
   EXPORTAÇÕES REAIS (Excel, CSV, PDF), GUIA DE USO, BUSCA DE ESCOLAS
   ========================================================= */
const LIBS = {
  xlsx:'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  jspdf:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  autotable:'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
};
const libP = {};
function loadLib(k){
  if (!libP[k]) libP[k] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = LIBS[k]; s.onload = res; s.onerror = () => { libP[k] = null; rej(new Error('lib')); }; document.head.append(s); });
  return libP[k];
}
const stamp = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const slug = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'arquivo';
async function saveFile(filename, data){
  try {
    const b = data instanceof Blob ? data : new Blob([data]), u = URL.createObjectURL(b), a = document.createElement('a');
    a.href = u; a.download = filename; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
    toast(`Arquivo pronto: ${esc(filename)}`); return true;
  } catch { toast('Não foi possível baixar o arquivo neste acesso.'); return false; }
}
async function busy(btn, label, fn){
  const old = btn.innerHTML; btn.disabled = true; btn.textContent = label;
  try { await fn(); } catch (e) { toast(e && e.message === 'lib' ? 'Não foi possível carregar o gerador de arquivos. Verifique a conexão e tente de novo.' : 'Não foi possível gerar o arquivo.'); }
  finally { btn.disabled = false; btn.innerHTML = old; }
}
/* ---- CSV / Excel ---- */
const csvCell = v => { const s = String(v ?? ''); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function toCsv(aoa){ return '﻿' + aoa.map(r => r.map(csvCell).join(';')).join('\r\n'); }
async function toXlsx(sheets){
  await loadLib('xlsx');
  const wb = XLSX.utils.book_new();
  sheets.forEach(({name, aoa, widths}) => { const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = (widths || aoa[0].map((_, i) => Math.min(48, Math.max(10, ...aoa.map(r => String(r[i] ?? '').length + 2))))).map(w => ({wch:w})); XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31)); });
  return new Uint8Array(XLSX.write(wb, {bookType:'xlsx', type:'array'}));
}
/* ---- PDF ---- */
const pt = s => String(s ?? '').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/≠/g, 'diferente de').replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, '...').replace(/·/g, '-').replace(/[^\x00-\xFF]/g, '');
const ACC = [15, 122, 108], INK = [18, 48, 43], MUT = [90, 111, 106];
async function newPdf(title, sub, landscape){
  await loadLib('jspdf'); await loadLib('autotable');
  const doc = new window.jspdf.jsPDF({orientation:landscape ? 'landscape' : 'portrait', unit:'mm', format:'a4'});
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(12, 58, 52); doc.rect(0, 0, W, 18, 'F');
  doc.setTextColor(234, 245, 242); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Painel de Escolas (demo)', 12, 11.5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text(pt('DADOS FICTÍCIOS'), W - 12, 11.5, {align:'right'});
  doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text(pt(title), 12, 30);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...MUT); doc.text(pt(sub), 12, 36.5);
  doc._y = 42;
  return doc;
}
function pdfH(doc, t){
  if (doc._y > doc.internal.pageSize.getHeight() - 30){ doc.addPage(); doc._y = 16; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...ACC); doc.text(pt(t), 12, doc._y + 4); doc._y += 7;
}
function pdfTable(doc, head, body, opts = {}){
  doc.autoTable({startY:doc._y, head:head ? [head.map(pt)] : undefined, body:body.map(r => r.map(c => pt(c))), margin:{left:12, right:12},
    styles:{font:'helvetica', fontSize:opts.fs || 8.5, cellPadding:1.8, textColor:INK, lineColor:[212, 223, 219], lineWidth:.1, overflow:'linebreak'},
    headStyles:{fillColor:[216, 238, 232], textColor:[10, 90, 80], fontStyle:'bold'}, alternateRowStyles:{fillColor:[245, 248, 247]},
    columnStyles:opts.cs || {}, theme:'grid'});
  doc._y = doc.lastAutoTable.finalY + 6;
}
function pdfKV(doc, rows){ pdfTable(doc, null, rows, {cs:{0:{fontStyle:'bold', textColor:MUT, cellWidth:62}}}); }
function pdfFinish(doc){
  const n = doc.getNumberOfPages(), W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= n; i++){ doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(...MUT); doc.text(pt(`Gerado em ${new Date().toLocaleString('pt-BR')} - página ${i} de ${n}`), W - 12, H - 6, {align:'right'}); doc.text(pt('Protótipo: dados cadastrais das escolas são fictícios'), 12, H - 6); }
  return doc.output('arraybuffer');
}
async function imgData(url){
  try {
    const b = await (await fetch(url)).blob(); const bmp = await createImageBitmap(b);
    const k = Math.min(1, 900 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
    return {d:c.toDataURL('image/jpeg', .82), w:c.width, h:c.height};
  } catch { return null; }
}

/* ---- Dashboard ---- */
function dashData(){
  const s = scope(), n = s.length || 1;
  const lab = st.mun != null ? `${munById[st.mun].nome} (${regName(st.reg)})` : st.reg != null ? regName(st.reg) : 'Minas Gerais (todas as regionais)';
  const pct = f => s.length ? Math.round(100 * s.filter(f).length / n) + '%' : '-';
  const B = [['0 a 300 Mbps', v => v <= 300], ['301 a 600 Mbps', v => v > 300 && v <= 600], ['601 a 1000 Mbps', v => v > 600 && v <= 1000], ['Acima de 1000 Mbps', v => v > 1000]];
  const tot = {}; DEV.forEach(d => tot[d.k] = s.reduce((a, e) => a + e.parque[d.k], 0));
  const resumo = [['Indicador', 'Valor'], ['Recorte', lab], ['Escolas', s.length], ['Escolas com sala de informática', pct(e => e.sala.possui)], ['Escolas com Wi-Fi', pct(e => e.wifi.possui)],
    ['Pontos de acesso Wi-Fi', s.reduce((a, e) => a + e.wifi.aps, 0)], ['Média de links por escola', s.length ? (s.reduce((a, e) => a + e.con.links, 0) / n).toLocaleString('pt-BR', {maximumFractionDigits:1}) : '-'],
    ...B.map(([l, f]) => [`Escolas com link de ${l}`, s.filter(e => f(e.con.vel)).length]),
    ...[['Concluída', e => e.con.obra.startsWith('Concluída')], ['Em execução', e => e.con.obra === 'Em execução'], ['Prevista', e => e.con.obra.startsWith('Prevista')], ['Não prevista', e => e.con.obra === 'Não prevista']].map(([l, f]) => [`Obra de cabeamento: ${l}`, s.filter(f).length]),
    ...DEV.map(d => [d.t, tot[d.k]]), ['Total de computadores', Object.values(tot).reduce((a, b) => a + b, 0)]];
  const escolas = [['Escola', 'INEP', 'Regional', 'Município', 'Alunos', 'Velocidade (Mbps)', 'Links', 'Sala de informática', 'Wi-Fi', 'APs', 'Computadores', 'Obra de cabeamento', 'Fotos (NTE)', 'Orçamentos']]
    .concat([...s].sort((a, b) => coll.compare(REG[a.sre].nome, REG[b.sre].nome) || coll.compare(a.nome, b.nome)).map(e => [e.nome, e.inep, REG[e.sre].nome, munById[e.mun].nome, e.alunos, e.con.vel, e.con.links, yn(e.sala.possui), yn(e.wifi.possui), e.wifi.aps, pcsTotal(e), e.con.obra, photosOf(e).length, orcOf(e).length]));
  return {lab, resumo, escolas};
}
function openDashExport(){
  stopCarousel();
  const d = dashData();
  const ov = modal({title:'Exportar dashboard', body:`
    <div class="note">Recorte aplicado: <b>${esc(d.lab)}</b> · ${plural(d.escolas.length - 1, 'escola', 'escolas')}. Para outro recorte, feche e escolha a regional ou o município no filtro.</div>
    <div class="opts" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      <label class="opt"><input type="radio" name="fmtD" value="xlsx" checked><div><b>Planilha Excel</b><span>Indicadores e lista de escolas, para trabalhar os números</span></div></label>
      <label class="opt"><input type="radio" name="fmtD" value="pdf"><div><b>PDF</b><span>Resumo dos indicadores para anexar ou enviar</span></div></label>
    </div>`, foot:`<button class="btn" data-close>Cancelar</button><button class="btn primary" id="doExpD">Baixar arquivo</button>`});
  $('#doExpD', ov).addEventListener('click', ev => busy(ev.target, 'Gerando…', async () => {
    const f = $('input[name=fmtD]:checked', ov).value, base = `dashboard-${slug(d.lab)}-${stamp()}`;
    if (f === 'xlsx') await saveFile(base + '.xlsx', await toXlsx([{name:'Indicadores', aoa:d.resumo}, {name:'Escolas', aoa:d.escolas}]));
    else {
      const doc = await newPdf('Dashboard do parque tecnológico', `Recorte: ${d.lab}`);
      pdfH(doc, 'Indicadores'); pdfKV(doc, d.resumo.slice(1).map(r => [r[0], typeof r[1] === 'number' ? fmt(r[1]) : r[1]]));
      pdfH(doc, 'Escolas do recorte'); pdfTable(doc, ['Escola', 'Município', 'Mbps', 'Sala', 'Wi-Fi', 'PCs', 'Obra'], d.escolas.slice(1).map(r => [r[0], r[3], fmt(r[5]), r[7], r[8], fmt(r[10]), r[11]]), {fs:7.5});
      await saveFile(base + '.pdf', pdfFinish(doc));
    }
    closeModal();
  }));
}

/* ---- Relatórios ---- */
function openRelExport(){
  if (!rel.cols.length && !rel.group){ toast('Escolha as colunas antes de exportar'); return; }
  const t = relTable();
  const ov = modal({title:'Exportar relatório', body:`
    <div class="note"><b>${esc(t.name)}</b> · ${esc(relDesc())} · ${plural(t.vw.n, 'escola', 'escolas')}${t.vw.mode === 'group' ? ` em ${t.vw.rows.length} grupos` : ''}. O arquivo sai exatamente como a tabela está na tela, com filtros, busca e ordem.</div>
    <div class="opts">
      <label class="opt"><input type="radio" name="fmtR" value="xlsx" checked><div><b>Excel</b><span>Para fazer contas e gráficos</span></div></label>
      <label class="opt"><input type="radio" name="fmtR" value="pdf"><div><b>PDF</b><span>Para anexar ou enviar</span></div></label>
      <label class="opt"><input type="radio" name="fmtR" value="csv"><div><b>CSV</b><span>Para importar em outro sistema</span></div></label>
    </div>`,
    foot:`<button class="btn" data-close>Cancelar</button><button class="btn primary" id="rOk">Baixar arquivo</button>`});
  $('#rOk', ov).addEventListener('click', ev => busy(ev.target, 'Gerando…', async () => {
    const f = $('input[name=fmtR]:checked', ov).value, base = `relatorio-${slug(t.name)}-${stamp()}`;
    const fl = rel.filters.map(x => `${V[x.k].l} ${opLabel(V[x.k].t, x.op)} ${x.v}`).concat(rel.q.trim() ? [`Busca: ${rel.q.trim()}`] : []);
    const tot = t.tot.some(x => x !== '') ? [t.tot] : [];
    if (f === 'csv') await saveFile(base + '.csv', toCsv([t.head, ...t.raw, ...tot]));
    else if (f === 'xlsx') await saveFile(base + '.xlsx', await toXlsx([{name:'Relatório', aoa:[t.head, ...t.raw, ...tot]}, {name:'Sobre', aoa:[['Relatório', t.name], ['Formato', relDesc()], ['Escolas', t.vw.n], ['Gerado em', new Date().toLocaleString('pt-BR')], ...(fl.length ? fl.map(x => ['Filtro', x]) : [['Filtro', 'Nenhum']])]}]));
    else {
      const doc = await newPdf(t.name, `${relDesc()} - ${plural(t.vw.n, 'escola', 'escolas')}${fl.length ? ' - ' + fl.join('; ') : ''}`, t.head.length > 5);
      pdfTable(doc, t.head, [...t.txt, ...(tot.length ? [t.totTxt] : [])], {fs:t.head.length > 9 ? 6.5 : 7.5});
      await saveFile(base + '.pdf', pdfFinish(doc));
    }
    closeModal();
  }));
}

/* ---- Relatório da escola em PDF ---- */
async function schoolPdf(e, secs){
  const doc = await newPdf(e.nome, `${regName(e.sre)} - ${munById[e.mun].nome} - MG - INEP ${e.inep}`);
  const cov = coverOf(e), im = cov && await imgData(assetUrl(cov));
  if (im){ const w = 60, h = Math.min(60, w * im.h / im.w); doc.addImage(im.d, 'JPEG', doc.internal.pageSize.getWidth() - 12 - w, 40, w, h); }
  pdfH(doc, 'Dados básicos');
  doc.autoTable({startY:doc._y, body:[['Endereço', `${e.end} - ${e.bairro}, ${munById[e.mun].nome} - MG, CEP ${e.cep}`], ['Telefone', e.tel], ['E-mail', e.email], ['Alunos', fmt(e.alunos)], ['Turmas', fmt(e.turmas)], ['Turnos', e.turnos], ['Modalidades', e.mods.join('; ')]].map(r => r.map(pt)),
    margin:{left:12, right:im ? 78 : 12}, styles:{font:'helvetica', fontSize:8.5, cellPadding:1.8, textColor:INK, lineColor:[212, 223, 219], lineWidth:.1}, columnStyles:{0:{fontStyle:'bold', textColor:MUT, cellWidth:34}}, theme:'grid'});
  doc._y = Math.max(doc.lastAutoTable.finalY, im ? 102 : 0) + 6;
  if (secs.includes('con')){ pdfH(doc, 'Conectividade'); pdfKV(doc, [['Operadora', e.con.oper], ['Tipo de link', e.con.tipo], ['Quantidade de links', e.con.links], ['Velocidade contratada', fmt(e.con.vel) + ' Mbps'], ['Programa / contrato', e.con.prog], ['Pontos de rede lógica', fmt(e.con.pontos)], ['Rack', e.con.rack], ['Obra de cabeamento lógico e elétrico', e.con.obra]].map(r => r.map(String))); }
  if (secs.includes('sala')){ pdfH(doc, 'Sala de informática'); pdfKV(doc, e.sala.possui ? [['Possui sala de informática', 'Sim'], ['Computadores na sala', fmt(e.sala.pcs)], ['Situação', e.sala.estado], ['Área aproximada', e.sala.area + ' m²']] : [['Possui sala de informática', 'Não']]); }
  if (secs.includes('wifi')){ pdfH(doc, 'Wi-Fi'); pdfKV(doc, e.wifi.possui ? [['Possui Wi-Fi', 'Sim'], ['Pontos de acesso (APs)', fmt(e.wifi.aps)], ['Cobertura estimada', e.wifi.cob + '%'], ['Controladora', e.wifi.ctrl], ['Redes (SSID)', e.wifi.ssid]] : [['Possui Wi-Fi', 'Não']]); }
  if (secs.includes('parque')){ pdfH(doc, 'Parque tecnológico'); pdfKV(doc, [...DEV.map(d => [d.t, fmt(e.parque[d.k])]), ['Total de computadores', fmt(pcsTotal(e))], ['Projetores', fmt(e.proj)], ['Lousas digitais', fmt(e.lousas)], ['Impressoras', fmt(e.impr)]]); }
  if (secs.includes('docs')){
    const cv = consol(e), last = regsOf(e)[0], orcs = orcOf(e), docs = docsOf(e), ph = photosOf(e);
    pdfH(doc, 'Dados informados pelo NTE');
    const kv = [['Responsável na escola', cv.resp && cv.resp.v], ['Contato', cv.cont && cv.cont.v], ['Situação da rede', cv.rede && (REDE.find(x => x.k === cv.rede.v) || {}).t], ['Computadores funcionando', cv.pcOk && fmt(cv.pcOk.v)], ['Computadores com defeito', cv.pcDef && fmt(cv.pcDef.v)], ['Última atualização', last ? (fmtIso(last.data) || fmtDate(last.criadoEm)) : ''], ['Fotos enviadas', String(ph.length)]].filter(r => r[1]);
    pdfKV(doc, kv.length ? kv : [['Situação', 'Nenhuma atualização do NTE']]);
    if (orcs.length){ const low = lowestSet(); pdfH(doc, 'Orçamentos de rede lógica e elétrica'); pdfTable(doc, ['Tipo', 'Fornecedor', 'Valor', 'Pontos', 'Validade', 'Situação', ''], orcs.map(r => [catName(ORC_TIPOS, r.tipo), r.forn || '', brl(r.valor || 0), r.pontos !== '' && r.pontos != null ? String(r.pontos) : '', fmtIso(r.validade), (ORC_ST.find(x => x.k === (r.status || 'rec')) || ORC_ST[0]).t, low.has(r.id) ? 'Menor valor' : ''])); }
    if (docs.length){ pdfH(doc, 'Plantas, projetos e documentos'); pdfTable(doc, ['Documento', 'Tipo', 'Enviado em'], docs.map(r => [r.titulo, catName(ESCDOC_CATS, r.tipo), fmtDate(r.criadoEm)])); }
  }
  await saveFile(`relatorio-escola-${slug(e.nome)}-${stamp()}.pdf`, pdfFinish(doc));
}

/* ---- Guia de uso ---- */
function openHelp(){
  modal({title:'Como usar o Painel de Escolas', wide:true, body:`
    <div class="guide">
      <section><h4>${SVG('<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>')}Dashboard</h4><p>Visão geral do parque tecnológico. Clique numa regional no mapa para aproximar e num município para ver as escolas. Os indicadores mudam conforme o recorte. <b>Exportar</b> baixa os números em Excel ou PDF.</p></section>
      <section><h4>${SVG('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>')}Relatórios</h4><p>Abra um <b>modelo pronto</b> ou crie um novo. Em <b>Colunas</b> escolha os dados, em <b>Filtrar</b> restrinja as escolas e em <b>Agrupar por</b> veja totais por regional ou município. Clique numa escola para abrir o relatório dela. Salve para a equipe e baixe em Excel, PDF ou CSV.</p></section>
      <section><h4>${SVG(IC.school)}Escolas</h4><p>Busque pelo nome, município ou INEP, ou escolha a regional. O relatório da escola reúne conectividade, sala de informática, Wi-Fi, parque e a pasta com fotos, orçamentos e documentos. <b>Salvar em PDF</b> gera o relatório completo.</p></section>
      <section><h4>${SVG(IC.folder)}Documentos</h4><p><b>Drives compartilhados</b> guarda atalhos para pastas. <b>Repositório</b> guarda atas de registro de preço, manuais e normas. Na <b>Área dos NTEs</b>, cada escola tem uma pasta para fotos, dados e documentos. <b>Orçamentos</b> reúne as propostas de rede lógica e elétrica, com comparativo.</p></section>
    </div>
    <div class="fsub">O que fica salvo</div>
    <div class="two-notes"><div class="note"><b style="color:var(--good)">Fica salvo para toda a equipe:</b> links, documentos do repositório, fotos, documentos e dados enviados pelos NTEs, orçamentos e relatórios salvos.</div>
      <div class="note"><b style="color:var(--warn)">Dados fictícios:</b> escolas, códigos INEP, endereços e indicadores são inventados (demo de portfólio).</div></div>
    <div class="fsub">Quem pode fazer o quê</div>
    <table class="kvt"><tr><td>Leitor</td><td>Consulta tudo e baixa arquivos.</td></tr><tr><td>Colaborador</td><td>Também cadastra links, envia fotos, documentos e orçamentos, e muda a situação dos orçamentos.</td></tr><tr><td>Editor</td><td>Também edita e remove itens enviados por qualquer pessoa.</td></tr></table>
    <div class="note">O acesso é definido no menu Compartilhar da página. Cada pessoa pode remover o que ela mesma enviou.</div>`,
    foot:`<button class="btn primary" data-close>Entendi</button>`});
}

