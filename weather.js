/* MET Norway (CC BY 4.0). Low-volume simple CORS via Origin; no API secrets.
 * Honour expiry, round coordinates to four decimals, never poll automatically. */
'use strict';
let fiWeatherBusy = false;
const fiWeatherCache = new Map();
async function fiFetchJSON(url, signal) {
  const response = await fetch(url, {signal, credentials:'omit'});
  if (!response.ok) throw new Error(response.status === 429 ? 'Servizio molto richiesto. Riprova più tardi.' : 'Servizio meteo temporaneamente non disponibile.');
  return {data:await response.json(),expires:Date.parse(response.headers.get('Expires'))};
}
function fiWeatherSymbol(symbol) {
  if (/thunder/.test(symbol)) return ['⛈️','Temporale'];
  if (/snow|sleet/.test(symbol)) return ['🌨️','Neve o nevischio'];
  if (/heavyrain/.test(symbol)) return ['🌧️','Pioggia intensa'];
  if (/rain/.test(symbol)) return ['🌦️','Pioggia'];
  if (/fog/.test(symbol)) return ['🌫️','Nebbia'];
  if (/partlycloudy/.test(symbol)) return ['⛅','Parzialmente nuvoloso'];
  if (/fair/.test(symbol)) return ['🌤️','Poco nuvoloso'];
  if (/cloudy/.test(symbol)) return ['☁️','Nuvoloso'];
  if (/clearsky/.test(symbol)) return ['☀️','Sereno'];
  return ['🌡️','Previsione disponibile'];
}
searchMeteo = async function () {
  const city = document.getElementById('meteo-city').value.trim();
  if (!city || fiWeatherBusy) return;
  if (!navigator.onLine) { document.getElementById('meteo-error').textContent = 'Sei offline. Il meteo richiede internet.'; setMeteoState('error'); return; }
  const cached = fiWeatherCache.get(city.toLocaleLowerCase('it'));
  fiWeatherBusy = true; const button = document.getElementById('btn-meteo'); button.disabled = true;
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 12000);
  setMeteoState('loading');
  try {
    let entry = cached && cached.expires > Date.now() ? cached : null;
    if (!entry) {
      const {data:locations} = await fiFetchJSON('https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(city) + '&format=json&limit=1', controller.signal);
      if (!locations.length) throw new Error('Città non trovata. Prova anche provincia o paese.');
      const place = locations[0];
      const response = await fiFetchJSON('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=' + Number(place.lat).toFixed(4) + '&lon=' + Number(place.lon).toFixed(4), controller.signal);
      const time = response.data.properties?.timeseries?.find(point => Date.parse(point.time) >= Date.now()) || response.data.properties?.timeseries?.[0];
      if (!time?.data?.instant?.details) throw new Error('Previsione non disponibile per questa località.');
      entry = {city:place.display_name.split(',')[0],forecast:time,expires:Number.isFinite(response.expires) ? response.expires : Date.now()+3600000};
      fiWeatherCache.set(city.toLocaleLowerCase('it'),entry);
    }
    const values = entry.forecast.data.instant.details;
    const summary = entry.forecast.data.next_1_hours?.summary?.symbol_code || entry.forecast.data.next_6_hours?.summary?.symbol_code || '';
    const [icon,label] = fiWeatherSymbol(summary);
    document.getElementById('meteo-icon-display').textContent = icon;
    document.getElementById('meteo-temp').textContent = Math.round(values.air_temperature) + '°C';
    document.getElementById('meteo-city-name').textContent = entry.city;
    document.getElementById('meteo-desc').textContent = label + ' · ' + new Date(entry.forecast.time).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
    const chips = document.getElementById('meteo-extra'); chips.replaceChildren();
    for (const text of ['💨 ' + Math.round(values.wind_speed*3.6) + ' km/h','💧 ' + Math.round(values.relative_humidity) + '%']) { const span = document.createElement('span'); span.className = 'meteo-chip'; span.textContent = text; chips.append(span); }
    setMeteoState('result');
  } catch (error) {
    document.getElementById('meteo-error').textContent = error.name === 'AbortError' ? 'La ricerca sta impiegando troppo tempo. Riprova.' : error.message === 'Failed to fetch' ? 'Servizio non raggiungibile. Verifica la connessione o riprova più tardi.' : error.message;
    setMeteoState('error');
  } finally { clearTimeout(timeout); fiWeatherBusy = false; button.disabled = false; }
};
