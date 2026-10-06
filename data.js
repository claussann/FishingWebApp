/* Pure data helpers shared by the app and the regression tests. No network. */
(function (root) {
  'use strict';
  const keys = { attrezzatura: 'fi_attrezzatura', spot: 'fi_spot', diario: 'fi_diario', catture: 'fi_catture' };
  const text = (value, max = 4000) => typeof value === 'string' ? value.slice(0, max) : '';
  const id = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
  const date = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value + 'T12:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
  };
  const photo = value => typeof value === 'string' && value.length <= 1800000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) ? value : null;
  function record(type, input) {
    if (!input || typeof input !== 'object' || !id(input.id)) throw new Error('Un elemento contiene un ID non valido.');
    const out = { id: input.id, note: text(input.note), createdAt: Number.isFinite(Date.parse(input.createdAt)) ? new Date(input.createdAt).toISOString() : new Date().toISOString() };
    if (Number.isFinite(Date.parse(input.updatedAt))) out.updatedAt = new Date(input.updatedAt).toISOString();
    if (type === 'attrezzatura') {
      if (!['canna', 'mulinello', 'minuteria'].includes(input.tipo) || !text(input.nome, 160).trim()) throw new Error('Attrezzatura: nome o tipo non valido.');
      Object.assign(out, { tipo: input.tipo, nome: text(input.nome, 160), tipologia: text(input.tipologia, 300), ambiente: ['mare', 'barca', 'dolce'].includes(input.ambiente) ? input.ambiente : '', tecnica: text(input.tecnica, 120), quantita: Math.max(1, Math.min(9999, parseInt(input.quantita, 10) || 1)), favorito: input.favorito === true });
    } else if (type === 'spot') {
      if (!text(input.nome, 160).trim() || !Number.isFinite(input.lat) || !Number.isFinite(input.lng) || Math.abs(input.lat) > 90 || Math.abs(input.lng) > 180) throw new Error('Spot: nome o coordinate non valide.');
      Object.assign(out, { nome: text(input.nome, 160), lat: input.lat, lng: input.lng, categoria: text(input.categoria, 60), foto: photo(input.foto), favorito: input.favorito === true });
    } else {
      if (!date(input.data)) throw new Error('Diario o catture: data non valida.');
      out.data = input.data;
      out.spotId = id(input.spotId) ? input.spotId : '';
      if (type === 'diario') {
        out.ora = /^([01]\d|2[0-3]):[0-5]\d$/.test(input.ora) ? input.ora : '';
        out.attIds = Array.isArray(input.attIds) ? [...new Set(input.attIds.filter(id))] : [];
      } else {
        if (!text(input.specie, 160).trim()) throw new Error('Cattura: specie non valida.');
        Object.assign(out, { specie: text(input.specie, 160), peso: input.peso !== '' && input.peso != null && Number.isFinite(Number(input.peso)) && Number(input.peso) >= 0 ? String(Number(input.peso)) : '', lunghezza: Number(input.lunghezza) > 0 ? String(Number(input.lunghezza)) : '', rilasciata: input.rilasciata === true, uscitaId: id(input.uscitaId) ? input.uscitaId : '', foto: photo(input.foto) });
      }
    }
    return out;
  }
  function validateBackup(input) {
    if (!input || Array.isArray(input) || typeof input !== 'object' || !['attrezzatura', 'spot', 'diario'].every(k => Array.isArray(input[k]))) throw new Error('Scegli un backup Fishing Inventory con attrezzatura, spot e diario.');
    const out = { version: text(input.version, 20), exportDate: text(input.exportDate, 40) };
    for (const type of Object.keys(keys)) {
      const list = input[type] === undefined && type === 'catture' ? [] : input[type];
      if (!Array.isArray(list) || list.length > 10000) throw new Error('Backup troppo grande o struttura non valida.');
      const seen = new Set();
      out[type] = list.map(item => {
        const clean = record(type, item);
        if (seen.has(clean.id)) throw new Error('Il backup contiene ID duplicati nella stessa raccolta.');
        seen.add(clean.id); return clean;
      });
    }
    if (input.checklist && typeof input.checklist === 'object') out.checklist = { technique: text(input.checklist.technique, 40), checked: Array.isArray(input.checklist.checked) ? input.checklist.checked.filter(id).slice(0, 100) : [] };
    return out;
  }
  function merge(current, incoming) {
    const entries = new Map(current.map(item => [item.id, item]));
    incoming.forEach(item => entries.set(item.id, item));
    return Array.from(entries.values());
  }
  function writeAtomic(storage, updates) {
    const old = Object.fromEntries(Object.keys(updates).map(key => [key, storage.getItem(key)]));
    try {
      for (const [key, value] of Object.entries(updates)) storage.setItem(key, JSON.stringify(value));
    } catch (error) {
      for (const key of Object.keys(old)) { if (old[key] === null) storage.removeItem(key); else storage.setItem(key, old[key]); }
      throw error;
    }
  }
  const api = { keys, date, photo, record, validateBackup, merge, writeAtomic };
  root.FIData = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
