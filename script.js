/**
 * ============================================================
 * FISHING INVENTORY v2 — script.js
 * Funzionalità:
 *   - Splash screen (5s)
 *   - Home con meteo (Open-Meteo + Nominatim)
 *   - Attrezzatura (CRUD + filtri)
 *   - Spot di Pesca (Leaflet + OpenStreetMap + geoloc)
 *   - Diario Uscite (data, ora, spot, attrezzatura, note)
 *   - Statistiche (grafico canvas, mini-stat, top list)
 *   - Backup JSON
 * Tutto salvato in localStorage, zero dipendenze esterne (tranne Leaflet)
 * ============================================================
 */

/* ============================================================
   KEYS LOCALSTORAGE
   ============================================================ */
const LS_ATT    = 'fi_attrezzatura';
const LS_SPOT   = 'fi_spot';
const LS_DIARIO = 'fi_diario';
const LS_THEME  = 'fi_theme';

/* ============================================================
   DATI TECNICHE DI PESCA
   Struttura: ambiente -> array di tecniche
   ============================================================ */
const TECNICHE_PESCA = {
  mare: [
    'Surfcasting',
    'Spinning da riva',
    'Rock Fishing',
    'Bolognese',
    'Pesca all\'Inglese',
    'Beach Ledgering',
    'Eging (Cefalopodi)',
    'Light Game',
    'Pesca a Fondo',
    'Big Game',
  ],
  barca: [
    'Traina',
    'Bolentino',
    'Jigging Verticale',
    'Slow Jigging / Slow Pitch',
    'Drifting / Scarroccio',
    'Spinning da barca',
    'Coppatura (col vivo)',
    'Tataki',
    'Bottom Fishing',
  ],
  dolce: [
    'Carpfishing',
    'Feeder / Method Feeder',
    'Spinning',
    'Pesca a Mosca (Fly Fishing)',
    'Bolognese',
    'Pesca al Colpo',
    'Pesca all\'Inglese',
    'Ledgering',
    'Streetfishing',
    'Trout Area',
    'Tenkara',
    'Pesca al Tocco',
    'Catfishing (Siluro)',
  ],
};

/* Etichette leggibili per gli ambienti */
const AMBIENTE_LABELS = {
  mare:  '🌊 Mare',
  barca: '⛵ Barca',
  dolce: '🏞️ Acqua Dolce',
};

/* Etichette leggibili per le categorie spot */
const SPOT_CAT_LABELS = {
  'spiaggia':    '🏖️ Spiaggia',
  'scogliera':   '🪨 Scogliera',
  'porto':       '⚓ Porto/Molo',
  'diga':        '🚧 Diga/Frangiflutti',
  'mare-aperto': '🌊 Mare Aperto',
  'laguna':      '🐟 Laguna/Estuario',
  'lago':        '🏞️ Lago',
  'fiume':       '〰️ Fiume',
  'torrente':    '💧 Torrente',
  'canale':      '🌿 Canale',
  'diga-invaso': '🏔️ Diga/Invaso',
};

/* ============================================================
   STATO GLOBALE
   ============================================================ */
let map           = null;
let currentMarker = null;
let currentLatLng = null;
let spotMarkers   = [];
let currentFilter = 'tutti';
let statsYear     = new Date().getFullYear();

/* ============================================================
   UTILITY
   ============================================================ */
function lsGet(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : []; }
  catch(e) { return []; }
}
function lsSet(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'});
}
function fmtDay(iso)   { return new Date(iso).getDate(); }
function fmtMonth(iso) { return new Date(iso).toLocaleDateString('it-IT',{month:'short'}).toUpperCase(); }
function fmtYear(iso)  { return new Date(iso).getFullYear(); }

/* ============================================================
   SPLASH SCREEN (5 secondi)
   ============================================================ */
function initSplash() {
  const splash = document.getElementById('splash-screen');
  const app    = document.getElementById('app');

  setTimeout(() => {
    splash.style.transition = 'opacity 0.7s ease';
    splash.style.opacity = '0';
    setTimeout(() => {
      splash.style.display = 'none';
      app.classList.remove('hidden');
      initApp();
    }, 700);
  }, 5000);
}

/* ============================================================
   INIT APP
   ============================================================ */
function initApp() {
  initTheme();
  initNavbar();
  initMeteo();
  initAttrezzaturaEvents();
  initSpotEvents();
  initDiarioEvents();
  initStatisticheEvents();
  initBackup();
  updateStats();
  renderUltimaUscita();
}

/* ============================================================
   TEMA DARK / LIGHT
   ============================================================ */
function initTheme() {
  const saved = localStorage.getItem(LS_THEME) || 'dark';
  applyTheme(saved);

  // Bottone desktop
  document.getElementById('btn-theme').addEventListener('click', toggleTheme);
  // Bottone mobile
  const mobTheme = document.getElementById('btn-theme-mob');
  if (mobTheme) mobTheme.addEventListener('click', () => {
    toggleTheme();
    document.getElementById('mobile-nav').classList.add('hidden');
  });
}

function toggleTheme() {
  const isLight = document.body.classList.contains('light');
  applyTheme(isLight ? 'dark' : 'light');
}

function applyTheme(theme) {
  const isLight = theme === 'light';
  document.body.classList.toggle('light', isLight);
  localStorage.setItem(LS_THEME, theme);

  // Aggiorna icona bottoni
  const icon = isLight ? '☀️' : '🌙';
  const btnTheme    = document.getElementById('btn-theme');
  const btnThemeMob = document.getElementById('btn-theme-mob');
  if (btnTheme)    btnTheme.textContent    = icon;
  if (btnThemeMob) btnThemeMob.textContent = `${icon} Cambia Tema`;
}


function showSection(name) {
  // Chiudi mobile nav se aperto
  document.getElementById('mobile-nav').classList.add('hidden');

  document.querySelectorAll('.nav-btn[data-section]').forEach(b =>
    b.classList.toggle('active', b.dataset.section === name));

  document.querySelectorAll('.section').forEach(s => {
    const isTarget = s.id === 'section-' + name;
    s.classList.toggle('active', isTarget);
    s.classList.toggle('hidden', !isTarget);
  });

  if (name === 'attrezzatura') renderAttrezzatura();
  else if (name === 'spot') {
    setTimeout(() => {
      if (!map) initMap();
      else { map.invalidateSize(); }
      renderSpotList();
    }, 120);
  }
  else if (name === 'diario') renderDiario();
  else if (name === 'statistiche') {
    statsYear = new Date().getFullYear();
    document.getElementById('stats-year').textContent = statsYear;
    renderStatistiche();
  }
  else if (name === 'home') {
    updateStats();
    renderUltimaUscita();
  }
}

function initNavbar() {
  // Desktop nav
  document.querySelectorAll('.nav-btn[data-section]').forEach(b =>
    b.addEventListener('click', () => showSection(b.dataset.section)));

  // Hamburger mobile
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('mobile-nav').classList.toggle('hidden');
  });

  // Mobile nav buttons
  document.querySelectorAll('.mob-btn[data-section]').forEach(b =>
    b.addEventListener('click', () => showSection(b.dataset.section)));
}

function updateStats() {
  const s = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  s('stat-att',    lsGet(LS_ATT).length);
  s('stat-spot',   lsGet(LS_SPOT).length);
  s('stat-uscite', lsGet(LS_DIARIO).length);
}

/* ============================================================
   METEO — Open-Meteo + Nominatim
   ============================================================ */
const WMO = {
  0:{e:'☀️',d:'Sereno'},1:{e:'🌤️',d:'Quasi sereno'},2:{e:'⛅',d:'Parzialmente nuvoloso'},
  3:{e:'☁️',d:'Coperto'},45:{e:'🌫️',d:'Nebbia'},48:{e:'🌫️',d:'Nebbia con brina'},
  51:{e:'🌦️',d:'Pioggerella leggera'},53:{e:'🌦️',d:'Pioggerella'},55:{e:'🌧️',d:'Pioggerella forte'},
  61:{e:'🌧️',d:'Pioggia leggera'},63:{e:'🌧️',d:'Pioggia'},65:{e:'🌧️',d:'Pioggia intensa'},
  71:{e:'🌨️',d:'Neve leggera'},73:{e:'❄️',d:'Neve'},75:{e:'❄️',d:'Neve intensa'},
  80:{e:'🌦️',d:'Rovesci'},81:{e:'🌧️',d:'Rovesci moderati'},82:{e:'⛈️',d:'Rovesci forti'},
  95:{e:'⛈️',d:'Temporale'},96:{e:'⛈️',d:'Temporale con grandine'},99:{e:'⛈️',d:'Temporale forte'},
};

function initMeteo() {
  const btn = document.getElementById('btn-meteo');
  const inp = document.getElementById('meteo-city');
  if (btn) btn.addEventListener('click', searchMeteo);
  if (inp) inp.addEventListener('keydown', e => { if(e.key==='Enter') searchMeteo(); });
}

async function searchMeteo() {
  const city = (document.getElementById('meteo-city').value || '').trim();
  if (!city) return;
  setMeteoState('loading');
  try {
    const geo = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
      { headers:{'Accept-Language':'it'} }
    ).then(r => r.json());

    if (!geo.length) { setMeteoState('error'); return; }
    const { lat, lon, display_name } = geo[0];
    const cityName = display_name.split(',')[0];

    const m = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode&timezone=auto`
    ).then(r => r.json());

    if (!m.current) { setMeteoState('error'); return; }
    const c = m.current;
    const w = WMO[c.weathercode] || {e:'🌡️',d:'N/D'};

    document.getElementById('meteo-icon-display').textContent = w.e;
    document.getElementById('meteo-temp').textContent         = `${Math.round(c.temperature_2m)}°C`;
    document.getElementById('meteo-city-name').textContent    = cityName;
    document.getElementById('meteo-desc').textContent         = w.d;
    document.getElementById('meteo-extra').innerHTML = `
      <span class="meteo-chip">💨 ${c.wind_speed_10m} km/h</span>
      <span class="meteo-chip">💧 ${c.relative_humidity_2m}%</span>
    `;
    setMeteoState('result');
  } catch(err) {
    console.error(err);
    setMeteoState('error');
  }
}

function setMeteoState(state) {
  ['loading','error','result'].forEach(s =>
    document.getElementById('meteo-'+s).classList.toggle('hidden', s !== state));
}

/* ============================================================
   ULTIMA USCITA (home)
   ============================================================ */
function renderUltimaUscita() {
  const diario = lsGet(LS_DIARIO);
  const el     = document.getElementById('ultima-uscita-content');
  if (!el) return;

  if (!diario.length) {
    el.innerHTML = '<p class="empty-inline">Nessuna uscita registrata ancora.</p>';
    return;
  }

  // Ordina per data decrescente
  const sorted = [...diario].sort((a,b) => new Date(b.data) - new Date(a.data));
  const u = sorted[0];

  const spotNome = u.spotId
    ? (lsGet(LS_SPOT).find(s => s.id === u.spotId)?.nome || '–')
    : '–';

  const attNomi = (u.attIds || []).map(id => {
    const a = lsGet(LS_ATT).find(a => a.id === id);
    return a ? a.nome : null;
  }).filter(Boolean);

  el.innerHTML = `
    <div class="ultima-row">
      <span class="ultima-badge">📅 ${fmtDate(u.data)}</span>
      <div class="ultima-info">
        <div class="ultima-nome">📍 ${escHtml(spotNome)}</div>
        <div class="ultima-meta">
          ${u.ora ? `🕐 ${u.ora} &nbsp;·&nbsp; ` : ''}
          ${attNomi.length ? `🎣 ${attNomi.map(escHtml).join(', ')}` : 'Nessuna attrezzatura'}
        </div>
        ${u.note ? `<div class="ultima-note">${escHtml(u.note)}</div>` : ''}
      </div>
    </div>
  `;
}

/* ============================================================
   ATTREZZATURA
   ============================================================ */
function initAttrezzaturaEvents() {
  document.getElementById('btn-add-att').addEventListener('click', () => {
    document.getElementById('modal-att').classList.remove('hidden');
  });
  document.getElementById('modal-att-close').addEventListener('click', closeModalAtt);
  document.getElementById('modal-att').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-att')) closeModalAtt();
  });
  document.getElementById('form-att').addEventListener('submit', saveAttrezzatura);

  // Cambio ambiente → aggiorna tecnica dinamicamente
  document.getElementById('att-ambiente').addEventListener('change', function() {
    const gruppo   = document.getElementById('att-tecnica-group');
    const selTec   = document.getElementById('att-tecnica');
    const ambiente = this.value;

    if (ambiente && TECNICHE_PESCA[ambiente]) {
      selTec.innerHTML = '<option value="">-- Seleziona tecnica --</option>';
      TECNICHE_PESCA[ambiente].forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        selTec.appendChild(opt);
      });
      gruppo.style.display = 'flex';
    } else {
      gruppo.style.display = 'none';
      selTec.innerHTML = '<option value="">-- Seleziona tecnica --</option>';
    }
  });

  document.querySelectorAll('.filter-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      currentFilter = b.dataset.filter;
      renderAttrezzatura();
    });
  });
}

function closeModalAtt() {
  document.getElementById('modal-att').classList.add('hidden');
  document.getElementById('form-att').reset();
  document.getElementById('form-att-error').classList.add('hidden');
  document.getElementById('att-tecnica-group').style.display = 'none';
}

function saveAttrezzatura(e) {
  e.preventDefault();
  const tipo      = document.getElementById('att-tipo').value;
  const nome      = document.getElementById('att-nome').value.trim();
  const tipologia = document.getElementById('att-tipologia').value.trim();
  const note      = document.getElementById('att-note').value.trim();
  const ambiente  = document.getElementById('att-ambiente').value;
  const tecnica   = document.getElementById('att-tecnica').value;
  const quantita  = parseInt(document.getElementById('att-quantita').value) || 1;

  if (!tipo || !nome) {
    document.getElementById('form-att-error').classList.remove('hidden');
    return;
  }
  const item = {
    id: genId(), tipo, nome, tipologia, note,
    ambiente, tecnica, quantita,
    createdAt: new Date().toISOString()
  };
  const lista = lsGet(LS_ATT);
  lista.push(item);
  lsSet(LS_ATT, lista);

  closeModalAtt();
  renderAttrezzatura();
  updateStats();
}

function renderAttrezzatura() {
  const lista    = lsGet(LS_ATT);
  const filtered = currentFilter === 'tutti' ? lista : lista.filter(i => i.tipo === currentFilter);
  const container = document.getElementById('att-list');
  const emptyEl   = document.getElementById('att-empty');
  const countEl   = document.getElementById('sidebar-count');

  container.querySelectorAll('.att-item').forEach(el => el.remove());
  if (countEl) countEl.textContent = `${filtered.length} element${filtered.length===1?'o':'i'}`;

  if (!filtered.length) { emptyEl.style.display='block'; return; }
  emptyEl.style.display = 'none';

  const labels = {canna:'🎣 Canna', mulinello:'⚙️ Mulinello', minuteria:'🪝 Minuteria'};

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'att-item';
    card.dataset.tipo = item.tipo;

    // Riga badge superiore: tipo + quantità + ambiente
    const ambienteHtml = item.ambiente
      ? `<span class="att-ambiente-badge">${AMBIENTE_LABELS[item.ambiente] || item.ambiente}</span>`
      : '';
    const qtaHtml = (item.quantita && item.quantita > 1)
      ? `<span class="att-qty-badge">✕${item.quantita}</span>`
      : '';
    const tecnicaHtml = item.tecnica
      ? `<div class="att-tecnica-text">🎯 ${escHtml(item.tecnica)}</div>`
      : '';

    card.innerHTML = `
      <div class="att-item-header">
        <span class="att-tipo-badge badge-${item.tipo}">${labels[item.tipo]||item.tipo}</span>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          ${ambienteHtml}
          ${qtaHtml}
          <span class="att-date">${fmtDate(item.createdAt)}</span>
        </div>
      </div>
      <div class="att-nome">${escHtml(item.nome)}</div>
      ${item.tipologia ? `<div class="att-tipologia">📐 ${escHtml(item.tipologia)}</div>` : ''}
      ${tecnicaHtml}
      ${item.note ? `<div class="att-note-text">${escHtml(item.note)}</div>` : ''}
      <div class="att-item-footer">
        <button class="btn-delete" data-id="${item.id}">🗑️ Elimina</button>
      </div>
    `;
    card.querySelector('.btn-delete').addEventListener('click', () => deleteAttrezzatura(item.id));
    container.appendChild(card);
  });
}

function deleteAttrezzatura(id) {
  lsSet(LS_ATT, lsGet(LS_ATT).filter(i => i.id !== id));
  renderAttrezzatura();
  updateStats();
}

/* ============================================================
   SPOT DI PESCA
   ============================================================ */
function initSpotEvents() {
  document.getElementById('btn-save-spot').addEventListener('click', openSpotModal);
  document.getElementById('modal-spot-close').addEventListener('click', closeModalSpot);
  document.getElementById('modal-spot').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-spot')) closeModalSpot();
  });
  document.getElementById('form-spot').addEventListener('submit', saveSpot);
}

function initMap() {
  map = L.map('map').setView([41.9, 12.5], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom:19
  }).addTo(map);

  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        currentLatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        map.setView([currentLatLng.lat, currentLatLng.lng], 13);
        currentMarker = L.marker([currentLatLng.lat, currentLatLng.lng], {
          icon: makeIcon('📍', '#00C9A7')
        }).addTo(map).bindPopup('<b>📍 Sei qui!</b>').openPopup();
        document.getElementById('geo-error').classList.add('hidden');
      },
      err => { document.getElementById('geo-error').classList.remove('hidden'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  } else {
    document.getElementById('geo-error').classList.remove('hidden');
  }

  map.on('click', e => {
    currentLatLng = { lat: e.latlng.lat, lng: e.latlng.lng };
    if (currentMarker) map.removeLayer(currentMarker);
    currentMarker = L.marker([currentLatLng.lat, currentLatLng.lng], {
      icon: makeIcon('📍', '#00C9A7')
    }).addTo(map).bindPopup('<b>Posizione selezionata</b>').openPopup();
  });

  renderSpotMarkers();
}

function makeIcon(emoji, color) {
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.4)">
      <span style="transform:rotate(45deg);font-size:17px">${emoji}</span></div>`,
    iconSize:[36,36], iconAnchor:[18,36], popupAnchor:[0,-38]
  });
}

function openSpotModal() {
  if (!currentLatLng) {
    alert('Attiva la geolocalizzazione oppure clicca sulla mappa per selezionare una posizione.');
    return;
  }
  document.getElementById('spot-coords-preview').textContent =
    `📌 ${currentLatLng.lat.toFixed(6)}, ${currentLatLng.lng.toFixed(6)}`;
  document.getElementById('modal-spot').classList.remove('hidden');
}

function closeModalSpot() {
  document.getElementById('modal-spot').classList.add('hidden');
  document.getElementById('form-spot').reset();
  document.getElementById('form-spot-error').classList.add('hidden');
}

function saveSpot(e) {
  e.preventDefault();
  const nome      = document.getElementById('spot-nome').value.trim();
  const note      = document.getElementById('spot-note').value.trim();
  const categoria = document.getElementById('spot-categoria').value;
  if (!nome) { document.getElementById('form-spot-error').classList.remove('hidden'); return; }

  const spot = {
    id: genId(), nome, note, categoria,
    lat: currentLatLng.lat, lng: currentLatLng.lng,
    createdAt: new Date().toISOString()
  };
  const lista = lsGet(LS_SPOT);
  lista.push(spot);
  lsSet(LS_SPOT, lista);

  addSpotMarker(spot);
  closeModalSpot();
  renderSpotList();
  updateStats();
}

function addSpotMarker(spot) {
  if (!map) return;
  const marker = L.marker([spot.lat, spot.lng], { icon: makeIcon('🎣', '#FFD166') }).addTo(map);
  marker.bindPopup(`<div style="font-family:'Nunito',sans-serif;min-width:160px">
    <b>🎣 ${escHtml(spot.nome)}</b><br>
    ${spot.note ? `<small style="color:#555">${escHtml(spot.note)}</small><br>` : ''}
    <small style="color:#888">${fmtDate(spot.createdAt)}</small><br>
    <small style="color:#aaa;font-family:monospace">${spot.lat.toFixed(4)}, ${spot.lng.toFixed(4)}</small>
  </div>`);
  spotMarkers.push({ id:spot.id, marker });
}

function renderSpotMarkers() {
  spotMarkers.forEach(({marker}) => map && map.removeLayer(marker));
  spotMarkers = [];
  lsGet(LS_SPOT).forEach(s => addSpotMarker(s));
}

function renderSpotList() {
  const lista     = lsGet(LS_SPOT);
  const container = document.getElementById('spot-list');
  const emptyEl   = document.getElementById('spot-empty');
  container.querySelectorAll('.spot-item').forEach(el => el.remove());

  if (!lista.length) { emptyEl.style.display='block'; return; }
  emptyEl.style.display = 'none';

  lista.forEach(spot => {
    const card = document.createElement('div');
    card.className = 'spot-item';
    const catLabel = spot.categoria ? SPOT_CAT_LABELS[spot.categoria] || spot.categoria : null;
    card.innerHTML = `
      <div class="spot-item-header">
        <span class="spot-nome">🎣 ${escHtml(spot.nome)}</span>
        ${catLabel ? `<span class="spot-cat-badge">${catLabel}</span>` : ''}
      </div>
      <span class="spot-coords-text">📌 ${spot.lat.toFixed(5)}, ${spot.lng.toFixed(5)}</span>
      ${spot.note ? `<div class="spot-note-text">${escHtml(spot.note)}</div>` : ''}
      <span class="spot-date">📅 ${fmtDate(spot.createdAt)}</span>
      <div class="spot-actions">
        <button class="btn-go-spot" data-lat="${spot.lat}" data-lng="${spot.lng}" data-id="${spot.id}">🗺️ Vedi mappa</button>
        <button class="btn-delete" data-id="${spot.id}">🗑️ Elimina</button>
      </div>
    `;
    card.querySelector('.btn-go-spot').addEventListener('click', () => {
      if (map) {
        map.setView([spot.lat, spot.lng], 14);
        const found = spotMarkers.find(m => m.id === spot.id);
        if (found) found.marker.openPopup();
        document.getElementById('map').scrollIntoView({ behavior:'smooth' });
      }
    });
    card.querySelector('.btn-delete').addEventListener('click', () => deleteSpot(spot.id));
    container.appendChild(card);
  });
}

function deleteSpot(id) {
  lsSet(LS_SPOT, lsGet(LS_SPOT).filter(s => s.id !== id));
  const found = spotMarkers.find(m => m.id === id);
  if (found && map) { map.removeLayer(found.marker); spotMarkers = spotMarkers.filter(m => m.id !== id); }
  renderSpotList();
  updateStats();
}

/* ============================================================
   DIARIO USCITE
   ============================================================ */
function initDiarioEvents() {
  document.getElementById('btn-add-uscita').addEventListener('click', openModalUscita);
  document.getElementById('modal-uscita-close').addEventListener('click', closeModalUscita);
  document.getElementById('modal-uscita').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-uscita')) closeModalUscita();
  });
  document.getElementById('form-uscita').addEventListener('submit', saveUscita);
}

function openModalUscita() {
  // Precompila data odierna
  document.getElementById('uscita-data').value = new Date().toISOString().slice(0,10);

  // Popola select spot
  const selSpot = document.getElementById('uscita-spot');
  selSpot.innerHTML = '<option value="">-- Nessuno / Non salvato --</option>';
  lsGet(LS_SPOT).forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.nome;
    selSpot.appendChild(opt);
  });

  // Popola checkbox attrezzatura
  const checksDiv = document.getElementById('uscita-att-checks');
  checksDiv.innerHTML = '';
  const att = lsGet(LS_ATT);
  if (!att.length) {
    checksDiv.innerHTML = '<p class="empty-inline">Nessuna attrezzatura salvata.</p>';
  } else {
    const labels = {canna:'🎣',mulinello:'⚙️',minuteria:'🪝'};
    att.forEach(a => {
      const div = document.createElement('div');
      div.className = 'check-item';
      div.innerHTML = `
        <input type="checkbox" id="chk-${a.id}" value="${a.id}" />
        <label for="chk-${a.id}">
          ${labels[a.tipo]||''} ${escHtml(a.nome)}
          ${a.tipologia ? `<span class="check-label-badge"> · ${escHtml(a.tipologia)}</span>` : ''}
        </label>
      `;
      checksDiv.appendChild(div);
    });
  }

  document.getElementById('modal-uscita').classList.remove('hidden');
}

function closeModalUscita() {
  document.getElementById('modal-uscita').classList.add('hidden');
  document.getElementById('form-uscita').reset();
  document.getElementById('form-uscita-error').classList.add('hidden');
}

function saveUscita(e) {
  e.preventDefault();
  const data = document.getElementById('uscita-data').value;
  if (!data) { document.getElementById('form-uscita-error').classList.remove('hidden'); return; }

  const ora    = document.getElementById('uscita-ora').value;
  const spotId = document.getElementById('uscita-spot').value;
  const note   = document.getElementById('uscita-note').value.trim();

  // Raccogli attrezzatura selezionata
  const attIds = Array.from(
    document.querySelectorAll('#uscita-att-checks input[type="checkbox"]:checked')
  ).map(cb => cb.value);

  const uscita = { id:genId(), data, ora, spotId, attIds, note, createdAt:new Date().toISOString() };
  const lista  = lsGet(LS_DIARIO);
  lista.push(uscita);
  lsSet(LS_DIARIO, lista);

  closeModalUscita();
  renderDiario();
  updateStats();
  renderUltimaUscita();
}

function renderDiario() {
  const lista     = lsGet(LS_DIARIO);
  const container = document.getElementById('diario-list');
  const emptyEl   = document.getElementById('diario-empty');
  container.querySelectorAll('.uscita-card').forEach(el => el.remove());

  if (!lista.length) { emptyEl.style.display='block'; return; }
  emptyEl.style.display = 'none';

  // Ordina per data decrescente
  const sorted = [...lista].sort((a,b) => new Date(b.data) - new Date(a.data));
  const spots  = lsGet(LS_SPOT);
  const atts   = lsGet(LS_ATT);

  sorted.forEach(u => {
    const spotNome = u.spotId ? (spots.find(s => s.id === u.spotId)?.nome) : null;
    const attNomi  = (u.attIds||[]).map(id => atts.find(a => a.id === id)?.nome).filter(Boolean);

    const card = document.createElement('div');
    card.className = 'uscita-card';
    card.innerHTML = `
      <div class="uscita-date-block">
        <span class="uscita-day">${fmtDay(u.data)}</span>
        <span class="uscita-month">${fmtMonth(u.data)}</span>
        <span class="uscita-year">${fmtYear(u.data)}</span>
      </div>
      <div class="uscita-body">
        <div class="uscita-header-row">
          ${u.ora ? `<span class="uscita-ora">🕐 ${u.ora}</span>` : '<span></span>'}
          <div class="uscita-actions">
            <button class="btn-delete" data-id="${u.id}">🗑️ Elimina</button>
          </div>
        </div>
        <div class="uscita-tags">
          ${spotNome ? `<span class="uscita-tag tag-spot">📍 ${escHtml(spotNome)}</span>` : ''}
          ${attNomi.map(n => `<span class="uscita-tag tag-att">🎣 ${escHtml(n)}</span>`).join('')}
        </div>
        ${u.note ? `<div class="uscita-note-text">${escHtml(u.note)}</div>` : ''}
      </div>
    `;
    card.querySelector('.btn-delete').addEventListener('click', () => deleteUscita(u.id));
    container.appendChild(card);
  });
}

function deleteUscita(id) {
  lsSet(LS_DIARIO, lsGet(LS_DIARIO).filter(u => u.id !== id));
  renderDiario();
  updateStats();
  renderUltimaUscita();
}

/* ============================================================
   STATISTICHE
   ============================================================ */
const MESI = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

function initStatisticheEvents() {
  document.getElementById('btn-year-prev').addEventListener('click', () => {
    statsYear--;
    document.getElementById('stats-year').textContent = statsYear;
    renderStatistiche();
  });
  document.getElementById('btn-year-next').addEventListener('click', () => {
    statsYear++;
    document.getElementById('stats-year').textContent = statsYear;
    renderStatistiche();
  });
}

function renderStatistiche() {
  const diario = lsGet(LS_DIARIO);
  const spots  = lsGet(LS_SPOT);
  const atts   = lsGet(LS_ATT);

  // --- Uscite per mese nell'anno selezionato ---
  const perMese = Array(12).fill(0);
  diario.forEach(u => {
    const d = new Date(u.data);
    if (d.getFullYear() === statsYear) perMese[d.getMonth()]++;
  });

  const hasData = perMese.some(v => v > 0);
  document.getElementById('chart-empty').classList.toggle('hidden', hasData);

  // Disegna grafico canvas
  drawChart(perMese, hasData);

  // --- Mini stat ---
  const set = (id, v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  set('ms-tot-uscite', diario.length);

  const spotVisitati = new Set(diario.map(u=>u.spotId).filter(Boolean)).size;
  set('ms-spot-unici', spotVisitati);

  const attUsate = new Set(diario.flatMap(u=>u.attIds||[])).size;
  set('ms-att-usate', attUsate);

  // Mese top (anno corrente completo)
  const perMeseAll = Array(12).fill(0);
  diario.forEach(u => { const d=new Date(u.data); perMeseAll[d.getMonth()]++; });
  const maxVal = Math.max(...perMeseAll);
  const meseTop = maxVal > 0 ? MESI[perMeseAll.indexOf(maxVal)] : '-';
  set('ms-mese-top', meseTop);

  // --- Top spot ---
  const spotCount = {};
  diario.forEach(u => {
    if (u.spotId) spotCount[u.spotId] = (spotCount[u.spotId]||0) + 1;
  });
  const topSpots = Object.entries(spotCount)
    .sort((a,b)=>b[1]-a[1]).slice(0,5)
    .map(([id,cnt]) => ({ nome: spots.find(s=>s.id===id)?.nome||'Spot eliminato', cnt }));

  renderTopList('top-spot-list', topSpots, '📍', 'uscite');

  // --- Top attrezzatura ---
  const attCount = {};
  diario.forEach(u => (u.attIds||[]).forEach(id => {
    attCount[id] = (attCount[id]||0) + 1;
  }));
  const topAtts = Object.entries(attCount)
    .sort((a,b)=>b[1]-a[1]).slice(0,5)
    .map(([id,cnt]) => ({ nome: atts.find(a=>a.id===id)?.nome||'Attrezz. eliminata', cnt }));

  renderTopList('top-att-list', topAtts, '🎣', 'uscite');
}

function renderTopList(containerId, items, emoji, suffix) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!items.length) { el.innerHTML = '<p class="empty-inline">Nessun dato disponibile.</p>'; return; }
  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
  el.innerHTML = items.map((item,i) => `
    <div class="top-item">
      <span class="top-rank">${medals[i]||i+1}</span>
      <span class="top-name">${emoji} ${escHtml(item.nome)}</span>
      <span class="top-count">${item.cnt} ${suffix}</span>
    </div>
  `).join('');
}

/* ============================================================
   GRAFICO CANVAS — Uscite per Mese
   ============================================================ */
let chartInstance = null; // riferimento per distruggere prima di ridisegnare

function drawChart(data, hasData) {
  const canvas = document.getElementById('chart-uscite');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Dimensioni
  const W = canvas.parentElement.offsetWidth || 600;
  const H = 220;
  canvas.width  = W;
  canvas.height = H;
  ctx.clearRect(0, 0, W, H);

  if (!hasData) return;

  const maxVal  = Math.max(...data, 1);
  const padL    = 36;
  const padR    = 16;
  const padT    = 20;
  const padB    = 40;
  const barW    = Math.floor((W - padL - padR) / 12);
  const barGap  = Math.floor(barW * 0.25);
  const barActW = barW - barGap;
  const chartH  = H - padT - padB;

  // Griglia orizzontale
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const y = padT + chartH - (chartH / steps) * i;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W - padR, y);
    ctx.stroke();
    // Label valori
    const val = Math.round((maxVal / steps) * i);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '11px Nunito, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(val, padL - 4, y + 4);
  }

  // Barre con gradiente
  data.forEach((val, i) => {
    if (val === 0) return;
    const x   = padL + i * barW + Math.floor(barGap / 2);
    const bH  = (val / maxVal) * chartH;
    const y   = padT + chartH - bH;

    const grad = ctx.createLinearGradient(0, y, 0, y + bH);
    grad.addColorStop(0, '#00C9A7');
    grad.addColorStop(1, '#4E8CF6');
    ctx.fillStyle = grad;

    // Barra con angoli arrotondati in alto
    roundRect(ctx, x, y, barActW, bH, 5);
    ctx.fill();

    // Valore sopra la barra
    ctx.fillStyle = '#00C9A7';
    ctx.font = 'bold 11px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(val, x + barActW / 2, y - 6);
  });

  // Etichette mesi
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '11px Nunito, sans-serif';
  ctx.textAlign = 'center';
  MESI.forEach((m, i) => {
    const x = padL + i * barW + Math.floor(barW / 2);
    ctx.fillText(m, x, H - padB + 18);
  });
}

/** Disegna un rettangolo con angoli superiori arrotondati */
function roundRect(ctx, x, y, w, h, r) {
  if (h < r) r = h;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ============================================================
   BACKUP — ESPORTA
   ============================================================ */
function initBackup() {
  // --- ESPORTA ---
  const doExport = () => {
    const backup = {
      exportDate:   new Date().toISOString(),
      version:      '2.0',
      attrezzatura: lsGet(LS_ATT),
      spot:         lsGet(LS_SPOT),
      diario:       lsGet(LS_DIARIO),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `fishing-inventory-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  document.getElementById('btn-backup').addEventListener('click', doExport);
  const mobBackup = document.getElementById('btn-backup-mob');
  if (mobBackup) mobBackup.addEventListener('click', doExport);

  // --- IMPORTA ---
  const fileInput = document.getElementById('import-file-input');

  // Apri file picker al click dei bottoni importa
  const openImport = () => {
    fileInput.value = ''; // reset per permettere di selezionare lo stesso file due volte
    fileInput.click();
  };
  document.getElementById('btn-import').addEventListener('click', openImport);
  const mobImport = document.getElementById('btn-import-mob');
  if (mobImport) mobImport.addEventListener('click', openImport);

  // Quando l'utente sceglie un file
  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = JSON.parse(evt.target.result);
        showImportPreview(data);
      } catch (err) {
        showImportError('File non valido: non è un JSON corretto.');
      }
    };
    reader.onerror = () => showImportError('Errore nella lettura del file.');
    reader.readAsText(file);
  });

  // Chiudi modale importazione
  document.getElementById('modal-import-close').addEventListener('click', closeModalImport);
  document.getElementById('btn-import-cancel').addEventListener('click', closeModalImport);
  document.getElementById('modal-import').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-import')) closeModalImport();
  });
}

/** Mostra la modale con anteprima dei dati del backup da importare */
function showImportPreview(data) {
  // Validazione struttura minima
  const errEl = document.getElementById('import-error');
  errEl.classList.add('hidden');

  if (typeof data !== 'object' || data === null) {
    showImportError('Struttura del file non riconosciuta.');
    return;
  }

  const att    = Array.isArray(data.attrezzatura) ? data.attrezzatura : [];
  const spot   = Array.isArray(data.spot)         ? data.spot         : [];
  const diario = Array.isArray(data.diario)        ? data.diario       : [];

  if (!att.length && !spot.length && !diario.length) {
    showImportError('Il file è vuoto o non contiene dati riconoscibili.');
    return;
  }

  // Formatta data esportazione
  let exportDateStr = '–';
  if (data.exportDate) {
    try { exportDateStr = fmtDate(data.exportDate); } catch(e) {}
  }

  document.getElementById('import-preview').innerHTML = `
    <div style="margin-bottom:8px;font-size:0.78rem;color:var(--c-white30)">
      File del <strong style="color:var(--c-white60)">${exportDateStr}</strong>
      ${data.version ? ` · versione <strong style="color:var(--c-white60)">${escHtml(data.version)}</strong>` : ''}
    </div>
    <div style="display:flex;flex-direction:column;gap:6px">
      <div>🎣 <strong>${att.length}</strong> attrezzature</div>
      <div>📍 <strong>${spot.length}</strong> spot di pesca</div>
      <div>📔 <strong>${diario.length}</strong> uscite nel diario</div>
    </div>
  `;

  // Salva dati in memoria temporanea per il confirm
  window._importData = { att, spot, diario };

  // Bottone conferma
  document.getElementById('btn-import-confirm').onclick = () => confirmImport();

  document.getElementById('modal-import').classList.remove('hidden');
  // Chiudi menu mobile se aperto
  document.getElementById('mobile-nav').classList.add('hidden');
}

/** Mostra errore nella modale (o in un alert se la modale non è ancora aperta) */
function showImportError(msg) {
  document.getElementById('import-preview').innerHTML =
    `<span style="color:var(--c-coral)">❌ ${escHtml(msg)}</span>`;
  document.getElementById('import-error').classList.add('hidden');
  document.getElementById('modal-import').classList.remove('hidden');
}

/** Esegue l'importazione sovrascrivendo i dati locali */
function confirmImport() {
  const { att, spot, diario } = window._importData || {};
  if (!att && !spot && !diario) return;

  lsSet(LS_ATT,    att    || []);
  lsSet(LS_SPOT,   spot   || []);
  lsSet(LS_DIARIO, diario || []);

  closeModalImport();
  window._importData = null;

  // Aggiorna UI
  updateStats();
  renderUltimaUscita();

  // Feedback visivo
  showToast('✅ Backup importato con successo!', 'success');

  // Se l'utente è su una sezione già aperta, aggiornala
  if (currentSection === 'attrezzatura') renderAttrezzatura();
  else if (currentSection === 'diario')  renderDiario();
  else if (currentSection === 'statistiche') renderStatistiche();
  else if (currentSection === 'spot') {
    renderSpotList();
    if (map) renderSpotMarkers();
  }
}

function closeModalImport() {
  document.getElementById('modal-import').classList.add('hidden');
  window._importData = null;
}

/* ============================================================
   TOAST NOTIFICA
   ============================================================ */
/**
 * Mostra un toast temporaneo in basso allo schermo.
 * @param {string} msg  - Testo del messaggio
 * @param {string} type - 'success' | 'error'
 */
function showToast(msg, type = 'success') {
  // Rimuovi toast esistenti
  document.querySelectorAll('.fi-toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = 'fi-toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
    z-index: 9999; padding: 12px 24px; border-radius: 30px;
    font-family: var(--font-body); font-size: 0.9rem; font-weight: 800;
    white-space: nowrap; pointer-events: none;
    box-shadow: 0 8px 30px rgba(0,0,0,0.5);
    animation: toastIn 0.3s ease, toastOut 0.4s ease 2.6s forwards;
    ${type === 'success'
      ? 'background: linear-gradient(135deg,#00C9A7,#4E8CF6); color: white;'
      : 'background: linear-gradient(135deg,#FF6B6B,#FF4444); color: white;'}
  `;

  // Keyframes inline se non esistono già
  if (!document.getElementById('toast-style')) {
    const style = document.createElement('style');
    style.id = 'toast-style';
    style.textContent = `
      @keyframes toastIn  { from{opacity:0;transform:translateX(-50%) translateY(16px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
      @keyframes toastOut { from{opacity:1} to{opacity:0;transform:translateX(-50%) translateY(16px)} }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

/* ============================================================
   RIDISEGNA GRAFICO AL RESIZE
   ============================================================ */
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (document.getElementById('section-statistiche').classList.contains('active')) {
      renderStatistiche();
    }
  }, 200);
});

/* ============================================================
   AVVIO
   ============================================================ */
document.addEventListener('DOMContentLoaded', initSplash);
