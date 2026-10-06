/* Fishing Inventory 4: usability, local assistant and recoverable data operations. */
'use strict';
const FI_RENDER = { attrezzatura: renderAttrezzatura, spot: renderSpotList, diario: renderDiario, catture: renderCatture };
const FI_FORM = { attrezzatura: 'form-att', spot: 'form-spot', diario: 'form-uscita', catture: 'form-cattura' };
const FI_LIST = { attrezzatura: ['att-list', '.att-item'], spot: ['spot-list', '.spot-item'], diario: ['diario-list', '.uscita-card'], catture: ['catture-list', '.cattura-card'] };
const FI_CHECKLIST = {
  generale: ['Canna e mulinello', 'Filo, ami e accessori', 'Esche e montature', 'Guadino e pinza', 'Acqua, cappello e protezione solare', 'Licenza e regolamenti locali', 'Meteo e accesso allo spot', 'Sacchetto per i rifiuti'],
  spinning: ['Canna e mulinello da spinning', 'Artificiali e moschettoni', 'Terminali e trecciato', 'Pinza e guadino', 'Occhiali e scarpe adatte', 'Acqua e protezione solare', 'Regolamenti e condizioni dello spot', 'Sacchetto per i rifiuti'],
  surfcasting: ['Canne e mulinelli', 'Picchetti e supporti', 'Piombi, shock leader e terminali', 'Esche e contenitore', 'Lampada e batterie', 'Acqua e abbigliamento', 'Meteo, mare e regolamenti', 'Sacchetto per i rifiuti'],
  carpfishing: ['Canne, mulinelli e rod pod', 'Avvisatori e batterie', 'Boilies, inneschi e pastura', 'Terminali e piombi', 'Guadino e materassino', 'Acqua e riparo', 'Regolamenti del lago e meteo', 'Sacchetto per i rifiuti']
};
let fiUndo = null, fiModalReturnFocus = null, fiLastModal = null;
function monitorServiceWorker(registration) {
  const offerUpdate = () => {
    if (!registration.waiting || !navigator.serviceWorker.controller || document.getElementById('fi-update')) return;
    const button = document.createElement('button'); button.id = 'fi-update'; button.className = 'text-action'; button.textContent = 'Nuova versione · Ricarica';
    button.addEventListener('click', () => registration.waiting?.postMessage({type:'SKIP_WAITING'}));
    document.querySelector('.workspace-bar').append(button);
  };
  offerUpdate(); registration.addEventListener('updatefound', () => {
    registration.installing?.addEventListener('statechange', offerUpdate);
  });
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (document.getElementById('fi-update') && !refreshing) { refreshing = true; location.reload(); }
  });
}
function localToday() {
  const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function filteredRecords(type, records) {
  const query = (document.getElementById('search-' + type)?.value || '').trim().toLocaleLowerCase('it');
  const favourite = document.getElementById('favourites-' + type)?.checked;
  const order = document.getElementById('sort-' + type)?.value;
  let result = records.filter(item => {
    const spot = lsGet(LS_SPOT).find(s => s.id === item.spotId)?.nome || '';
    return (!favourite || item.favorito) && (!query || [item.nome, item.specie, item.tipo, item.tipologia, item.tecnica, item.note, item.categoria, item.data, spot].filter(Boolean).join(' ').toLocaleLowerCase('it').includes(query));
  });
  result.sort((a, b) => order === 'nome' ? String(a.nome || a.specie || a.data).localeCompare(String(b.nome || b.specie || b.data), 'it') : (String(b.data || b.createdAt).localeCompare(String(a.data || a.createdAt)) * (order === 'meno-recenti' ? -1 : 1)));
  const summary = document.getElementById('summary-' + type);
  if (summary) summary.textContent = query || favourite ? `${result.length} risultati su ${records.length}` : `${records.length} ${records.length === 1 ? 'elemento salvato' : 'elementi salvati'} sul dispositivo`;
  return result;
}
function upsertItem(list, item, formId) {
  const form = document.getElementById(formId);
  const existing = list.findIndex(entry => entry.id === form.dataset.editId);
  if (existing !== -1) {
    Object.assign(item, { id: list[existing].id, createdAt: list[existing].createdAt, favorito: list[existing].favorito, updatedAt: new Date().toISOString() });
    list[existing] = item;
  } else list.push(item);
}
function refreshAll() {
  updateStats(); renderUltimaUscita(); updateOnboarding();
  if (FI_RENDER[currentSection]) window[{attrezzatura:'renderAttrezzatura',spot:'renderSpotList',diario:'renderDiario',catture:'renderCatture'}[currentSection]]();
  if (currentSection === 'statistiche') renderStatistiche();
  if (map) renderSpotMarkers();
}
function decorateList(type) {
  let list = filteredRecords(type, lsGet(FIData.keys[type]));
  if (type === 'attrezzatura' && currentFilter !== 'tutti') list = list.filter(item => item.tipo === currentFilter);
  const [container, selector] = FI_LIST[type];
  document.querySelectorAll('#' + container + ' ' + selector).forEach((card, index) => {
    const item = list[index]; if (!item) return;
    const actions = card.querySelector('.att-item-footer, .spot-actions, .uscita-actions, .cattura-footer');
    const edit = document.createElement('button'); edit.className = 'btn-edit'; edit.textContent = 'Modifica'; edit.setAttribute('aria-label', 'Modifica ' + (item.nome || item.specie || item.data));
    edit.addEventListener('click', () => editRecord(type, item.id)); actions?.prepend(edit);
    if (['attrezzatura', 'spot'].includes(type)) {
      const star = document.createElement('button'); star.className = 'btn-favourite'; star.textContent = item.favorito ? '★' : '☆'; star.setAttribute('aria-pressed', String(!!item.favorito)); star.setAttribute('aria-label', item.favorito ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti');
      star.addEventListener('click', () => { const records = lsGet(FIData.keys[type]); const found = records.find(i => i.id === item.id); found.favorito = !found.favorito; lsSet(FIData.keys[type], records); refreshAll(); triggerAutosave(); }); actions?.prepend(star);
    }
    if (type === 'catture') {
      const detail = document.createElement('p'); detail.className = 'capture-detail';
      detail.textContent = [lsGet(LS_SPOT).find(s => s.id === item.spotId)?.nome, item.lunghezza ? item.lunghezza + ' cm' : '', item.rilasciata ? '↺ Rilasciata' : ''].filter(Boolean).join(' · ');
      card.querySelector('.cattura-body')?.append(detail);
    }
  });
  const empty = document.querySelector('#' + container + ' .empty-state p');
  if (empty && !list.length) empty.textContent = lsGet(FIData.keys[type]).length ? 'Nessun risultato. Prova un’altra ricerca o togli i filtri.' : {attrezzatura:'Il tuo inventario inizia da una canna. Premi Aggiungi per cominciare.',spot:'Salva un punto sulla mappa o inserisci le coordinate, anche offline.',diario:'La tua prima uscita aspetta di essere raccontata. Premi Nuova uscita.',catture:'Una foto, una specie, un ricordo. Registra la tua prima cattura.'}[type];
}
// All callers (including existing save buttons) use the decorated renderer.
renderAttrezzatura = function () { FI_RENDER.attrezzatura(); decorateList('attrezzatura'); };
renderSpotList = function () { FI_RENDER.spot(); decorateList('spot'); };
renderDiario = function () { FI_RENDER.diario(); decorateList('diario'); };
renderCatture = function () { FI_RENDER.catture(); decorateList('catture'); };
function fillSpotSelect(selectId, selected = '') {
  const select = document.getElementById(selectId); select.replaceChildren(new Option('Nessuno / non salvato', ''));
  lsGet(LS_SPOT).forEach(spot => select.add(new Option(spot.nome, spot.id)));
  select.value = selected;
}
function editRecord(type, id) {
  const item = lsGet(FIData.keys[type]).find(entry => entry.id === id); if (!item) return;
  const form = document.getElementById(FI_FORM[type]); form.reset(); form.dataset.editId = id;
  const set = (field, value) => { document.getElementById(field).value = value ?? ''; };
  if (type === 'attrezzatura') {
    set('att-tipo', item.tipo); set('att-nome', item.nome); set('att-tipologia', item.tipologia); set('att-ambiente', item.ambiente);
    document.getElementById('att-ambiente').dispatchEvent(new Event('change'));
    set('att-tecnica', item.tecnica); set('att-quantita', item.quantita || 1); set('att-note', item.note);
  } else if (type === 'spot') {
    set('spot-nome', item.nome); set('spot-categoria', item.categoria); set('spot-note', item.note); set('spot-lat', item.lat); set('spot-lng', item.lng);
    window._spotFotoBase64 = item.foto; document.getElementById('spot-foto-img').src = FIData.photo(item.foto) || ''; document.getElementById('spot-foto-preview').classList.toggle('hidden', !item.foto);
  } else if (type === 'diario') {
    openModalUscita(); set('uscita-data', item.data); set('uscita-ora', item.ora); set('uscita-spot', item.spotId); set('uscita-note', item.note);
    document.querySelectorAll('#uscita-att-checks input').forEach(input => { input.checked = (item.attIds || []).includes(input.value); });
  } else {
    set('cattura-data', item.data); set('cattura-specie', item.specie); set('cattura-peso', item.peso); set('cattura-note', item.note); set('cattura-lunghezza', item.lunghezza); fillSpotSelect('cattura-spot', item.spotId);
    document.getElementById('cattura-rilasciata').checked = !!item.rilasciata;
    window._catFotoBase64 = item.foto; document.getElementById('cattura-foto-img').src = FIData.photo(item.foto) || ''; document.getElementById('cattura-foto-preview').classList.toggle('hidden', !item.foto);
  }
  const overlay = form.closest('.modal-overlay'); overlay.querySelector('h3').textContent = 'Modifica ' + {attrezzatura:'attrezzatura',spot:'spot',diario:'uscita',catture:'cattura'}[type]; overlay.classList.remove('hidden');
}
function softDelete(key, id, type) {
  const list = lsGet(key), item = list.find(entry => entry.id === id); if (!item) return;
  // Write the recovery first. If storage is full the original data are untouched.
  try { FIData.writeAtomic(localStorage, { fi_deleted: { key, item, type }, [key]: list.filter(entry => entry.id !== id) }); }
  catch { showToast('Eliminazione non eseguita: impossibile conservare la copia di recupero.', 'error'); return; }
  fiUndo = { key, item, type }; showUndo(); refreshAll(); triggerAutosave();
}
function showUndo() {
  if (!fiUndo) return;
  document.getElementById('undo-message').textContent = 'Eliminato: ' + (fiUndo.item.nome || fiUndo.item.specie || fmtDate(fiUndo.item.data));
  document.getElementById('undo-bar').classList.remove('hidden');
}
function undoDelete() {
  if (!fiUndo) return;
  const list = lsGet(fiUndo.key); if (!list.some(item => item.id === fiUndo.item.id)) list.push(fiUndo.item);
  lsSet(fiUndo.key, list); localStorage.removeItem('fi_deleted'); fiUndo = null;
  document.getElementById('undo-bar').classList.add('hidden'); refreshAll(); triggerAutosave(); showToast('Elemento ripristinato.');
}
function applyImport() {
  const data = window._importData; if (!data) return;
  const mode = document.getElementById('import-mode').value;
  const current = buildBackup(), updates = {};
  try {
    // Persist a valid recovery snapshot before changing any live collection.
    localStorage.setItem('fi_pre_import', JSON.stringify(current));
    for (const [type, key] of Object.entries(FIData.keys)) {
      const incoming = data[{attrezzatura:'att',spot:'spot',diario:'diario',catture:'catture'}[type]] || [];
      updates[key] = mode === 'merge' ? FIData.merge(current[type], incoming) : incoming;
    }
    if (data.checklist && mode === 'replace') updates.fi_checklist = data.checklist;
    FIData.writeAtomic(localStorage, updates);
  } catch (error) { showToast('Importazione non eseguita: spazio insufficiente o archivio bloccato. Esporta un backup e libera spazio.', 'error'); return; }
  closeModalImport(); refreshAll(); renderChecklist(); triggerAutosave(); showToast(mode === 'merge' ? 'Backup unito ai tuoi dati.' : 'Dati sostituiti. La copia precedente è recuperabile da Backup.');
}
function recoverImport() {
  let recovery;
  try { recovery = FIData.validateBackup(JSON.parse(localStorage.getItem('fi_pre_import'))); }
  catch { showToast('Nessuna copia di recupero disponibile.', 'error'); return; }
  // Same review dialog, so recovering never replaces current entries silently.
  showImportPreview(recovery); document.getElementById('import-mode').value = 'replace';
  document.getElementById('modal-salva-info').classList.add('hidden');
}
function getChecklist() {
  try {
    const saved = JSON.parse(localStorage.getItem('fi_checklist'));
    if (saved && FI_CHECKLIST[saved.technique] && Array.isArray(saved.checked)) return saved;
  } catch {}
  return { technique: 'generale', checked: [] };
}
function renderChecklist() {
  const state = getChecklist(); document.getElementById('checklist-technique').value = state.technique;
  const list = document.getElementById('checklist-items'); list.replaceChildren();
  let complete = 0;
  FI_CHECKLIST[state.technique].forEach((label, index) => {
    const key = state.technique + '-' + index;
    const row = document.createElement('label'), input = document.createElement('input'), span = document.createElement('span');
    input.type = 'checkbox'; input.checked = state.checked.includes(key); if (input.checked) complete++;
    span.textContent = label; row.append(input, span);
    input.addEventListener('change', () => { const next = getChecklist(); next.checked = input.checked ? [...new Set([...next.checked, key])] : next.checked.filter(item => item !== key); lsSet('fi_checklist', next); renderChecklist(); triggerAutosave(); }); list.append(row);
  });
  document.getElementById('checklist-count').textContent = `${complete}/${FI_CHECKLIST[state.technique].length}`;
}
function updateOnboarding() {
  const counts = [lsGet(LS_ATT).length, lsGet(LS_SPOT).length, lsGet(LS_DIARIO).length];
  ['step-gear', 'step-spot', 'step-trip'].forEach((id, index) => { document.getElementById(id).classList.toggle('complete', counts[index] > 0); });
  document.getElementById('onboarding').classList.toggle('hidden', counts.every(count => count > 0));
}
function syncNavigation(name) {
  document.getElementById('hamburger')?.setAttribute('aria-expanded', 'false');
  document.querySelectorAll('[data-section], [data-section-link]').forEach(button => {
    const active = (button.dataset.section || button.dataset.sectionLink) === name;
    button.classList.toggle('active', active); if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  const title = document.querySelector('#section-' + name + ' h1, #section-' + name + ' h2');
  if (title) { title.tabIndex = -1; title.focus({ preventScroll: true }); }
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function newRecord(type) {
  const form = document.getElementById(FI_FORM[type]); form.reset(); delete form.dataset.editId;
  const error = form.querySelector('.form-error'); error?.classList.add('hidden');
  const overlay = form.closest('.modal-overlay'); overlay.querySelector('h3').textContent = {attrezzatura:'Nuova attrezzatura',spot:'Salva spot',diario:'Nuova uscita',catture:'Nuova cattura'}[type];
  if (type === 'attrezzatura') document.getElementById('att-tecnica-group').style.display = 'none';
  if (type === 'catture') { document.getElementById('cattura-data').value = localToday(); fillSpotSelect('cattura-spot'); resetFoto('cattura-foto-input','cattura-foto-img','cattura-foto-preview','_catFotoBase64'); }
}
function initModalAccessibility() {
  const overlays = [...document.querySelectorAll('.modal-overlay'), document.getElementById('assistant-panel')];
  overlays.forEach(overlay => {
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
    const title = overlay.querySelector('h3, h2'); if (title) { title.id ||= overlay.id + '-title'; overlay.setAttribute('aria-labelledby', title.id); }
    new MutationObserver(() => {
      const visible = !overlay.classList.contains('hidden');
      if (visible && fiLastModal !== overlay) {
        fiModalReturnFocus = document.activeElement; fiLastModal = overlay;
        const first = overlay.querySelector('input:not([type=file]):not([type=checkbox]),select,button'); first?.focus();
      } else if (!visible && fiLastModal === overlay) {
        fiLastModal = null; fiModalReturnFocus?.focus?.();
      }
      document.body.classList.toggle('modal-open', overlays.some(dialog => !dialog.classList.contains('hidden')));
      const blocked = overlays.some(dialog => !dialog.classList.contains('hidden'));
      document.getElementById('app').inert = blocked;
      document.querySelector('.bottom-nav').inert = blocked;
    }).observe(overlay, { attributes: true, attributeFilter: ['class'] });
  });
  document.addEventListener('keydown', event => {
    const visible = overlays.filter(overlay => !overlay.classList.contains('hidden'));
    const dialog = visible[visible.length - 1]; if (!dialog) return;
    if (event.key === 'Escape') {
      const close = { 'modal-att':closeModalAtt, 'modal-spot':closeModalSpot, 'modal-uscita':closeModalUscita, 'modal-cattura':closeModalCattura, 'modal-import':closeModalImport }[dialog.id];
      if (close) close(); else dialog.classList.add('hidden'); event.preventDefault();
    }
    if (event.key === 'Tab') {
      const controls = [...dialog.querySelectorAll('button,input,select,textarea,a[href]')].filter(el => !el.disabled && el.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { last?.focus(); event.preventDefault(); }
      else if (!event.shiftKey && document.activeElement === last) { first?.focus(); event.preventDefault(); }
    }
  });
}
function exportCSV(type) {
  const rows = lsGet(FIData.keys[type]); if (!rows.length) { showToast('Aggiungi almeno un elemento prima di esportare.', 'error'); return; }
  const columns = {attrezzatura:['nome','tipo','tipologia','quantita','ambiente','tecnica','note'],spot:['nome','lat','lng','categoria','note'],diario:['data','ora','spot','attrezzatura','note'],catture:['data','specie','peso','lunghezza','spot','rilasciata','note']}[type];
  const safe = value => { let text = String(value ?? ''); if (/^[=+\-@\t\r]/.test(text)) text = "'" + text; return '"' + text.replaceAll('"','""') + '"'; };
  const content = '\ufeff' + [columns, ...rows.map(row => columns.map(key => key === 'spot' ? lsGet(LS_SPOT).find(s => s.id === row.spotId)?.nome || '' : key === 'attrezzatura' ? (row.attIds || []).map(id => lsGet(LS_ATT).find(a => a.id === id)?.nome).filter(Boolean).join(', ') : row[key]))].map(row => row.map(safe).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([content], {type:'text/csv;charset=utf-8'})); const a = document.createElement('a'); a.href = url; a.download = 'fishing-' + type + '-' + localToday() + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function renderCaptureInsights() {
  const captures = lsGet(LS_CATTURE).filter(item => Number(item.data.slice(0,4)) === statsYear);
  const weights = captures.filter(item => item.peso !== '' && Number.isFinite(Number(item.peso))).map(item => Number(item.peso));
  const species = new Map(); captures.forEach(item => species.set(item.specie, (species.get(item.specie) || 0) + 1));
  document.getElementById('capture-insights').innerHTML = `<div class="capture-metrics"><div><strong>${captures.length}</strong><span>Catture</span></div><div><strong>${species.size}</strong><span>Specie</span></div><div><strong>${weights.length ? Math.max(...weights).toLocaleString('it-IT', {maximumFractionDigits:2}) + ' kg' : '—'}</strong><span>Peso massimo registrato</span></div><div><strong>${captures.filter(item => item.rilasciata).length}</strong><span>Rilasciate</span></div></div><p class="service-note">${captures.length ? 'Specie più registrata: ' + escHtml([...species].sort((a,b) => b[1]-a[1])[0][0]) : 'Registra una cattura per iniziare. Non servono foto o peso.'}</p>`;
  const monthly = Array(12).fill(0); lsGet(LS_DIARIO).filter(item => Number(item.data.slice(0,4)) === statsYear).forEach(item => monthly[Number(item.data.slice(5,7))-1]++);
  document.getElementById('chart-text').textContent = 'Uscite nel ' + statsYear + ': ' + monthly.map((count,index) => MESI[index] + ' ' + count).join(', ');
}
const fiOriginalStats = renderStatistiche;
renderStatistiche = function () { fiOriginalStats(); renderCaptureInsights(); };

// Rules and local inventory lookup, deliberately labelled as non-generative.
function bussolaAnswer(question) {
  const q = question.toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const answer = (text, label, section, action) => ({text, label, section, action});
  if (/backup|salv|sicuro|dati|dispositivo|esport|import/.test(q)) return answer('I dati si salvano subito in questo browser, ma cancellare i dati del sito può eliminarli. Premi Backup per scaricare il file JSON con inventario, spot, diario, catture e checklist. Sul nuovo dispositivo usa Importa: “Unisci” conserva gli elementi già presenti. La copia di recupero prima dell’ultima importazione è nel menu Backup.', 'Apri Backup', null, 'backup');
  if (/offline|internet|connession/.test(q)) return answer('Dopo il primo caricamento online l’app conserva le pagine per lavorare offline. Inventario, diario, catture, checklist e questo assistente funzionano senza rete. Meteo, mappe di sfondo e annunci richiedono internet; puoi sempre aggiungere uno spot scrivendo le coordinate.', 'Vai agli spot', 'spot');
  if (/install|iphone|android|telefono/.test(q)) return answer('Su Chrome/Edge usa “Installa” quando disponibile. Su iPhone apri il sito in Safari, premi Condividi e “Aggiungi alla schermata Home”. Installare non trasferisce i dati: conserva un backup JSON prima di cambiare browser o dispositivo.', 'Leggi la guida', null, 'help');
  if (/meteo|vento|piogg/.test(q)) return answer('Nella Home scrivi una città e premi Cerca: vedrai temperatura, vento e umidità. Sono dati indicativi: per scegliere un’uscita controlla anche previsioni locali, mare e allerte. L’app non può garantire condizioni sicure o una buona cattura.', 'Apri Home', 'home');
  if (/spinning|surfcasting|carpfishing|prepar|checklist/.test(q)) {
    const technique = /surfcasting/.test(q) ? 'surfcasting' : /carpfishing/.test(q) ? 'carpfishing' : /spinning/.test(q) ? 'spinning' : 'generale';
    return {...answer('Per ' + technique + ' parti da questa lista: ' + FI_CHECKLIST[technique].join('; ') + '. La checklist nella Home conserva le tue spunte. Prima di uscire verifica sempre autorizzazioni e condizioni del luogo.', 'Apri questa checklist', 'home', 'checklist'), technique};
  }
  if (/statistic|grafico|quante|quanti|riepilog/.test(q)) return answer(`Nel tuo archivio: attrezzature ${lsGet(LS_ATT).length}, spot ${lsGet(LS_SPOT).length}, uscite ${lsGet(LS_DIARIO).length}, catture ${lsGet(LS_CATTURE).length}. Nelle Statistiche puoi cambiare anno e vedere uscite mensili, spot più visitati e record delle catture.`, 'Apri statistiche', 'statistiche');
  if (/cattur|pesce|foto|peso|rilasc/.test(q)) return answer('In Catture premi Aggiungi cattura. Data e specie sono obbligatorie; peso, foto, spot, lunghezza e rilascio sono facoltativi. “Modifica” aggiorna un ricordo già salvato. Le foto vengono ridotte per occupare meno spazio.', 'Registra una cattura', 'catture', 'new-catch');
  if (/spot|mappa|coordinate|gps/.test(q)) return answer('In Spot seleziona un punto sulla mappa e premi Salva spot. Puoi anche usare “Spot da coordinate” per inserire latitudine e longitudine, oppure “Usa la mia posizione” autorizzando il browser. Stelle e ricerca ti aiutano a ritrovare i posti. La mappa non verifica accessi o divieti.', 'Apri spot', 'spot');
  if (/diario|uscita/.test(q)) return answer('Nel Diario scegli Nuova uscita: inserisci la data, seleziona uno spot e spunta l’attrezzatura utilizzata. Aggiungi alle note condizioni ed esca: ti saranno utili quando tornerai nello stesso luogo. Puoi modificare l’uscita in seguito.', 'Nuova uscita', 'diario', 'new-trip');
  if (/cerca|trova|dove|shimano|daiwa|canna|mulinello/.test(q)) {
    const terms = q.split(/\s+/).filter(word => word.length > 3 && !['trova','cerca','dove','sono','della','delle','canna','canne','miei','mie','mulinello','attrezzatura'].includes(word));
    const found = lsGet(LS_ATT).filter(item => terms.some(term => [item.nome,item.tipologia,item.tecnica].join(' ').toLowerCase().includes(term))).slice(0,5);
    if (found.length) return answer('Nel tuo inventario ho trovato: ' + found.map(item => item.nome).join(', ') + '. Puoi aprire Attrezzatura e usare la ricerca per vedere i dettagli.', 'Apri inventario', 'attrezzatura');
  }
  if (/attrezz|inventario|aggiung|modific|preferit/.test(q)) return answer('In Attrezzatura premi Aggiungi e scegli tipo, nome e quantità. Ambiente e tecnica aiutano a catalogare il materiale. Usa la ricerca per nome o note, “Modifica” per correggere un elemento e la stella per averlo tra i preferiti.', 'Apri inventario', 'attrezzatura');
  if (/elimin|annull|recuper/.test(q)) return answer('Quando elimini un elemento appare “Annulla eliminazione”. L’ultima eliminazione resta recuperabile anche dopo aver riaperto l’app, fino a una nuova eliminazione. Per recuperare dati precedenti a un’importazione apri Backup e scegli Ripristina.', 'Apri Backup', null, 'backup');
  return answer('Posso aiutarti con inventario, spot, diario, catture, backup e checklist. Per cominciare aggiungi una canna, salva uno spot e registra la prima uscita. Se hai una domanda diversa, prova a nominare la funzione: uso risposte guidate e non un modello generativo.', 'Aggiungi attrezzatura', 'attrezzatura', 'new-gear');
}
function assistantMessage(text, who, response) {
  const messages = document.getElementById('assistant-messages'), box = document.createElement('div'); box.className = 'message message-' + who;
  const p = document.createElement('p'); p.textContent = text; box.append(p);
  if (response?.label) {
    const button = document.createElement('button'); button.className = 'text-action'; button.textContent = response.label + ' →';
    button.addEventListener('click', () => {
      document.getElementById('assistant-panel').classList.add('hidden');
      if (response.section) showSection(response.section);
      if (response.action === 'backup') document.getElementById('btn-backup').click();
      else if (response.action === 'help') location.href = '/help.html';
      else if (response.action === 'checklist') { const state = getChecklist(); if (state.technique !== response.technique) lsSet('fi_checklist', {technique:response.technique,checked:[]}); renderChecklist(); document.querySelector('.card-checklist').scrollIntoView({behavior:'smooth'}); }
      else if (response.action) runAction(response.action);
    }); box.append(button);
  }
  messages.append(box); if (messages.children.length > 24) messages.firstElementChild.remove(); messages.scrollTop = messages.scrollHeight;
}
function askBussola(question) { assistantMessage(question, 'user'); const result = bussolaAnswer(question); assistantMessage(result.text, 'assistant', result); }
function runAction(action) {
  if (action === 'new-trip') { showSection('diario'); document.getElementById('btn-add-uscita').click(); }
  if (action === 'new-gear') { showSection('attrezzatura'); document.getElementById('btn-add-att').click(); }
  if (action === 'new-catch') { showSection('catture'); document.getElementById('btn-add-cattura').click(); }
}
function initEnhancements() {
  if (window.fiEnhanced) return; window.fiEnhanced = true;
  updateOnboarding(); renderChecklist(); initModalAccessibility();
  document.querySelectorAll('.qstat').forEach(tile => {
    tile.setAttribute('role','button'); tile.tabIndex = 0;
    tile.addEventListener('keydown', event => { if (['Enter',' '].includes(event.key)) { event.preventDefault(); tile.click(); } });
  });
  try { const value = JSON.parse(localStorage.getItem('fi_deleted')); if (value && Object.values(FIData.keys).includes(value.key) && value.item?.id) { fiUndo = value; showUndo(); } } catch {}
  document.getElementById('undo-button').addEventListener('click', undoDelete);
  document.getElementById('undo-dismiss').addEventListener('click', () => document.getElementById('undo-bar').classList.add('hidden'));
  document.getElementById('btn-recover-import').addEventListener('click', recoverImport);
  document.getElementById('hamburger').addEventListener('click', () => document.getElementById('hamburger').setAttribute('aria-expanded', String(!document.getElementById('mobile-nav').classList.contains('hidden'))));
  new MutationObserver(() => document.getElementById('hamburger').setAttribute('aria-expanded', String(!document.getElementById('mobile-nav').classList.contains('hidden')))).observe(document.getElementById('mobile-nav'), {attributes:true,attributeFilter:['class']});
  document.querySelectorAll('[data-section-link]').forEach(button => button.addEventListener('click', () => showSection(button.dataset.sectionLink)));
  document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => runAction(button.dataset.action)));
  document.querySelectorAll('[data-export-csv]').forEach(button => button.addEventListener('click', () => exportCSV(button.dataset.exportCsv)));
  for (const type of Object.keys(FIData.keys)) {
    for (const control of ['search-','sort-','favourites-']) document.getElementById(control + type)?.addEventListener(control === 'search-' ? 'input' : 'change', () => window[{attrezzatura:'renderAttrezzatura',spot:'renderSpotList',diario:'renderDiario',catture:'renderCatture'}[type]]());
  }
  // Reset new/edit state before the existing open handlers run.
  for (const [type,id] of Object.entries({attrezzatura:'btn-add-att',spot:'btn-save-spot',diario:'btn-add-uscita',catture:'btn-add-cattura'})) document.getElementById(id).addEventListener('click', () => newRecord(type), {capture:true});
  document.getElementById('btn-manual-spot').addEventListener('click', () => { newRecord('spot'); currentLatLng = null; openSpotModal(); });
  document.getElementById('btn-locate').addEventListener('click', () => {
    if (!navigator.geolocation) { showToast('Geolocalizzazione non disponibile. Puoi inserire le coordinate.', 'error'); return; }
    navigator.geolocation.getCurrentPosition(position => { currentLatLng = {lat:position.coords.latitude,lng:position.coords.longitude}; if (map) map.setView([currentLatLng.lat,currentLatLng.lng],14); document.getElementById('geo-error').classList.add('hidden'); showToast('Posizione trovata. Premi Salva spot.'); }, () => { document.getElementById('geo-error').classList.remove('hidden'); }, {timeout:10000,enableHighAccuracy:true});
  });
  document.getElementById('checklist-technique').addEventListener('change', event => { lsSet('fi_checklist',{technique:event.target.value,checked:[]}); renderChecklist(); triggerAutosave(); });
  document.getElementById('checklist-reset').addEventListener('click', () => { const state = getChecklist(); state.checked = []; lsSet('fi_checklist',state); renderChecklist(); triggerAutosave(); });
  document.querySelectorAll('[data-open-assistant]').forEach(button => button.addEventListener('click', () => { document.getElementById('assistant-panel').classList.remove('hidden'); if (!document.getElementById('assistant-messages').children.length) assistantMessage('Ciao! Sono Bussola. Ti aiuto a orientarti nell’app, preparare la checklist e ritrovare le funzioni. Da dove vuoi iniziare?', 'assistant'); }));
  document.getElementById('assistant-close').addEventListener('click', () => document.getElementById('assistant-panel').classList.add('hidden'));
  document.querySelectorAll('[data-question]').forEach(button => button.addEventListener('click', () => askBussola(button.dataset.question)));
  document.getElementById('assistant-form').addEventListener('submit', event => { event.preventDefault(); const input = document.getElementById('assistant-input'); if (!input.value.trim()) return; askBussola(input.value.trim()); input.value = ''; });
  const online = () => { document.getElementById('connection-status').textContent = navigator.onLine ? 'Dati sul dispositivo · pronto a pescare' : 'Sei offline · i tuoi dati restano disponibili'; document.querySelector('.status-dot').classList.toggle('offline', !navigator.onLine); };
  online(); window.addEventListener('online',online); window.addEventListener('offline',online);
  window.addEventListener('hashchange', () => { const section = location.hash.slice(1); if (section && section !== currentSection && document.getElementById('section-' + section)) showSection(section); });
  window.addEventListener('storage', event => { if (Object.values(FIData.keys).includes(event.key)) refreshAll(); });
  const hash = location.hash.slice(1); showSection(document.getElementById('section-' + hash) ? hash : 'home');
  document.querySelectorAll('form[id^="form-"]').forEach(form => form.addEventListener('submit', () => { updateOnboarding(); }, {capture:false}));
}
