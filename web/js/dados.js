/* =========================================================
   DOCUMENTOS — drives, repositório e pasta de cada escola (fotos, documentos, dados do NTE)
   Gravados no servidor (servidor/app.py) e compartilhados pela equipe.
   ========================================================= */
const DOC = {mode:'connecting', links:[], arquivos:[], nte:[], fotos:[], orc:[], rels:[], meta:{}, db:null, assets:null, user:null, me:null, canEdit:false, canWrite:true, names:{}, usage:null};
const DOC_PATH = {links:'links', arquivos:'arquivos', nte:'nte_registros', fotos:'escola_fotos', orc:'orcamentos', rels:'relatorios_salvos'};
const store = {
  get(k, d){ try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v){ try { localStorage.setItem(k, v); } catch {} },
};
let docTab = store.get('painel.docTab', 'drives'); if (!['drives','repo','nte','orc'].includes(docTab)) docTab = 'drives';
let docQ = '', linkCat = '', repCat = '', phCat = '';
const nte = {reg:store.get('painel.nteReg', ''), f:'todas', ek:null};
const LINK_CATS = ['Contratos e ARPs', 'Obras e cabeamento', 'Escolas', 'Equipe', 'Outros'];
const REP_CATS = [
  {k:'arp', t:'Atas de registro de preço', s:'ARPs em que o órgão é participante'},
  {k:'manual', t:'Manuais', s:'Equipamentos, sistemas e procedimentos'},
  {k:'norma', t:'Normas e orientações', s:'Resoluções, ofícios e notas técnicas'},
  {k:'outro', t:'Outros documentos', s:'Modelos, planilhas e materiais de apoio'},
];
const PH_CATS = [
  {k:'fachada', t:'Fachada e entrada'}, {k:'salas', t:'Salas e pátio'}, {k:'info', t:'Sala de informática'}, {k:'rack', t:'Rack e equipamentos de rede'},
  {k:'cabo', t:'Cabeamento e quadro elétrico'}, {k:'wifi', t:'Pontos de Wi-Fi'}, {k:'outra', t:'Outras'},
];
const ESCDOC_CATS = [{k:'planta', t:'Planta baixa'}, {k:'projeto', t:'Projeto de cabeamento'}, {k:'laudo', t:'Laudo ou relatório'}, {k:'outro', t:'Outro documento'}];
const NTE_TIPOS = ['Atualização de dados', 'Visita técnica', 'Ocorrência'];
const REDE = [{k:'ok', t:'Funcionando', c:'good'}, {k:'parcial', t:'Funcionando parcialmente', c:'warn'}, {k:'parada', t:'Sem funcionamento', c:'bad'}, {k:'nv', t:'Não verificada', c:''}];
const OK_EXT = {pdf:'application/pdf', png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', webp:'image/webp', csv:'text/csv', txt:'text/plain', md:'text/markdown', json:'application/json'};
const IMG_EXT = ['png','jpg','jpeg','gif','webp'];
const MAXB = 20 * 1048576;
const SVG = (p, w = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC = {
  folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  cloud:'<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 8.5a4.75 4.75 0 0 1-.5 9.5z"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  book:'<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>',
  camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  up:'<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
  school:'<path d="M3 10 12 4l9 6"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
  img:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 18 5-5 4 4 3-3 4 4"/>',
};
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const safeUrl = u => /^https?:\/\/\S+$/i.test(String(u ?? '').trim()) ? String(u).trim() : null;
const assetUrl = r => r && typeof r.asset === 'string' && /^[\w-]{8,64}$/.test(r.asset) ? '/_blob/' + r.asset : (r && typeof r._local === 'string' ? r._local : null);
const extOf = n => (String(n ?? '').split('.').pop() || '').toLowerCase();
const fmtSize = b => !b ? '' : b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toLocaleString('pt-BR', {maximumFractionDigits:1}) + ' MB';
const fmtDate = ms => ms ? new Date(ms).toLocaleDateString('pt-BR') : '';
const fmtIso = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
const todayIso = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const plural = (n, s, p) => `${fmt(n)} ${n === 1 ? s : p}`;
const canDel = r => DOC.mode === 'local' || DOC.canEdit || (r.autor && r.autor === DOC.me);
const regOk = i => Number.isInteger(i) && REG[i] ? REG[i] : null;
const catName = (list, k) => (list.find(c => c.k === k) || list[list.length - 1]).t;
/* chave estável da escola: INEP quando existe */
const ekey = e => /^\d{8}$/.test(String(e.inep)) ? String(e.inep) : 'id' + e.id;
const byEk = k => ESC.find(e => ekey(e) === k);
const photosOf = e => DOC.fotos.filter(f => f.ek === ekey(e));
const docsOf = e => DOC.arquivos.filter(r => r.cat === 'escola' && r.ek === ekey(e));
const regsOf = e => DOC.nte.filter(r => r.ek === ekey(e));
function coverOf(e){
  const ph = photosOf(e).filter(assetUrl); if (!ph.length) return null;
  const m = DOC.meta[ekey(e)];
  return ph.find(f => m && f.id === m.capa) || ph.find(f => f.cat === 'fachada') || ph[0];
}
function whoHtml(r){
  if (DOC.mode === 'local') return 'você';
  if (!r.autor) return 'alguém da equipe';
  return `<span data-uid="${esc(r.autor)}">${esc(DOC.names[r.autor] || '…')}</span>`;
}
function resolveNames(root){
  const spans = $$('[data-uid]', root); if (!spans.length) return;
  const ids = [...new Set(spans.map(s => s.dataset.uid))];
  const fill = () => spans.forEach(s => { s.textContent = DOC.names[s.dataset.uid] || 'alguém da equipe'; });
  if (!DOC.user || typeof DOC.user.profiles !== 'function') return fill();
  DOC.user.profiles(ids).then(ps => { ids.forEach(id => { DOC.names[id] = (ps && ps[id] && ps[id].name) || 'alguém da equipe'; }); fill(); }).catch(fill);
}
const ERR = {
  too_large:'O arquivo passa de 20 MB. Reduza o tamanho ou cadastre o link da pasta onde ele está.',
  unsupported_type:'Esse formato não é aceito. Envie PDF ou imagem, ou cadastre o link do arquivo no Drive.',
  quota_or_state:'O espaço de armazenamento do sistema está cheio. Remova arquivos antigos ou cadastre como link.',
  rate_limited:'Muitos envios seguidos. Aguarde alguns segundos e tente de novo.',
  not_granted:'Seu acesso não permite gravar aqui. Peça ao responsável pelo sistema acesso de colaborador.',
  revoked:'Seu acesso foi alterado. Recarregue a página.',
  conflito:'Outra pessoa alterou esta escola enquanto você editava. Os dados foram atualizados; confira e salve de novo.',
};
const errMsg = e => ERR[e && e.code] || 'Não foi possível salvar. Verifique a conexão e tente de novo.';

/* ---------- conexão com a API (servidor/app.py) ---------- */
async function api(metodo, url, corpo, tipo){
  const op = {method:metodo, headers:{}};
  if (corpo instanceof Blob){ op.body = corpo; op.headers['Content-Type'] = tipo || corpo.type || 'application/octet-stream'; }
  else if (corpo !== undefined){ op.body = JSON.stringify(corpo); op.headers['Content-Type'] = 'application/json'; }
  let r;
  try { r = await fetch(url, op); } catch { throw {code:'offline'}; }
  if (!r.ok){ let e = {}; try { e = await r.json(); } catch {} throw {code:e.code || 'http_' + r.status}; }
  return r.status === 204 ? null : r.json();
}
/* aplica um retrato completo do servidor (boot ou sincronização) */
function aplicar(t){
  if (DOC.versao && t.versao < DOC.versao) return;  // resposta atrasada de uma sincronização anterior
  DOC.versao = t.versao;
  Object.entries(DOC_PATH).forEach(([k, path]) => { DOC[k] = t[path] || []; });
  DOC.meta = t.meta || {};
  if (t.escolas && JSON.stringify(t.escolas) !== JSON.stringify(ESC)){
    ESC.length = 0; ESC.push(...t.escolas);
    afterDataChange();
  }
}
async function sincronizar(){
  aplicar(await api('GET', '/api/tudo'));
  docRefresh(); refreshUsage();
}
function docConnect(){
  DOC.mode = 'db'; DOC.assets = true; DOC.canEdit = true; DOC.canWrite = true;
  aplicar(D);
  docRefresh(); refreshUsage();
  // outras pessoas da equipe: confere a versão a cada 15 s com a aba visível e ao voltar para ela
  const ver = async () => {
    if (document.hidden) return;
    try { const {versao} = await api('GET', '/api/versao'); if (versao !== DOC.versao) await sincronizar(); } catch {}
  };
  setInterval(ver, 15000);
  document.addEventListener('visibilitychange', ver);
}
function docRefresh(){
  syncSaved();
  if (curTab === 'doc') renderDoc();
  else if (curTab === 'esc' && escState.view !== 'pick') renderEsc();
  else if (curTab === 'rel') renderSheet();
}
function refreshUsage(){ api('GET', '/api/uso').then(u => { DOC.usage = u; paintUsage(); }).catch(() => {}); }
function paintUsage(){
  const el = $('#docUse'), u = DOC.usage; if (!el) return;
  if (!u || !u.maxBytes){ el.hidden = true; return; }
  const p = Math.min(100, Math.round(u.bytes / u.maxBytes * 100));
  el.hidden = false; el.className = 'use' + (p >= 90 ? ' full' : '');
  el.title = `${fmt(u.files)} arquivos armazenados`;
  el.innerHTML = `<span>Armazenamento: ${fmtSize(u.bytes) || '0 KB'} de ${fmtSize(u.maxBytes)}</span><i><b style="width:${p}%"></b></i>`;
}
async function addRow(col, data){ const r = await api('POST', '/api/c/' + DOC_PATH[col], data); await sincronizar(); return r; }
async function updRow(col, id, patch){ await api('PATCH', `/api/c/${DOC_PATH[col]}/${encodeURIComponent(id)}`, patch); await sincronizar(); }
async function delRow(col, r){ await api('DELETE', `/api/c/${DOC_PATH[col]}/${encodeURIComponent(r.id)}`); await sincronizar(); }
async function setCover(e, id){ await api('PUT', '/api/meta/' + encodeURIComponent(ekey(e)), {capa:id}); await sincronizar(); }
/* escolas: cadastro, edição e remoção gravam no servidor */
async function salvarEscola(t){
  try {
    const r = t.id ? await api('PUT', '/api/escolas/' + t.id, t) : await api('POST', '/api/escolas', t); await sincronizar(); return r;
  } catch (x) { if (x.code === 'conflito') await sincronizar().catch(() => {}); throw x; }
}
async function removerEscolas(ids){ await api('POST', '/api/escolas/remover', {ids}); await sincronizar(); }
/* fotos de celular são reduzidas para 2000 px antes do envio */
async function shrink(f){
  if (!/^image\/(jpeg|png|webp)$/.test(f.type) || typeof createImageBitmap !== 'function') return f;
  try {
    const bmp = await createImageBitmap(f, {imageOrientation:'from-image'});
    const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    if (k === 1 && f.size < 1.5 * 1048576){ bmp.close && bmp.close(); return f; }
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height); bmp.close && bmp.close();
    const b = await new Promise(r => c.toBlob(r, 'image/jpeg', .86));
    if (!b || (k === 1 && b.size >= f.size)) return f;
    return new File([b], f.name.replace(/\.[^.]+$/, '') + '.jpg', {type:'image/jpeg'});
  } catch { return f; }
}
async function upFile(f0){
  const f = await shrink(f0);
  const r = await api('POST', '/api/arquivos?nome=' + encodeURIComponent(f.name), f, OK_EXT[extOf(f.name)]);
  refreshUsage();
  return {asset:r.id, tam:r.sizeBytes, nome:f.name};
}
function confirmDel(what, name, fn){
  const ov = modal({title:'Remover ' + what, body:`<p style="margin:0">Remover <b>${esc(name)}</b>? ${what === 'link' || what === 'relatório' ? `O ${what} sai da lista para toda a equipe.` : 'O item e o arquivo enviado saem do sistema para toda a equipe.'}</p>`,
    foot:`<button class="btn" data-close>Cancelar</button><button class="btn danger solid" id="cdOk">Remover</button>`});
  $('#cdOk', ov).addEventListener('click', async ev => { ev.target.disabled = true; try { await fn(); closeModal(); toast('Removido'); } catch (e) { ev.target.disabled = false; toast(errMsg(e)); } });
}
async function copyText(t, msg = 'Link copiado'){
  try { await navigator.clipboard.writeText(t); toast(msg); }
  catch { toast(msg.startsWith('Link') ? `Copie o link: <span style="user-select:all">${esc(t)}</span>` : 'Não foi possível copiar automaticamente.'); }
}
const canAdd = () => DOC.mode !== 'connecting' && DOC.canWrite;
const noWriteMsg = () => toast(DOC.mode === 'connecting' ? 'Aguarde a conexão com o sistema.' : 'Seu acesso é de consulta. Peça acesso de colaborador para enviar.');

