/* ---- abas com link direto (#dashboard, #relatorios, #escolas, #documentos) ---- */
const TAB_HASH = {dash:'dashboard', rel:'relatorios', esc:'escolas', doc:'documentos'};
function hashTab(){ const h = (location.hash || '').slice(1); return Object.keys(TAB_HASH).find(k => TAB_HASH[k] === h) || null; }

/* ---------------- init ---------------- */
fillReg(); fillMun(); renderIndicators(); renderCrumbs();
requestAnimationFrame(() => { setVB(fitBox([0, 0, VW, VH], .02, 0)); });
syncSaved(); initRel(); renderSheet();
$('#btnHelp').addEventListener('click', openHelp);
{ const t0 = hashTab(); if (t0 && t0 !== 'dash') showTab(t0); }
window.addEventListener('hashchange', () => { const t = hashTab(); if (t && t !== curTab) showTab(t); });
