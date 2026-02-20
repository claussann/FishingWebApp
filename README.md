# 🎣 Fishing Inventory

> Il tuo diario di pesca digitale | Your digital fishing diary

---

## 🇮🇹 Italiano

### Descrizione

**Fishing Inventory** è una web app frontend-only per gestire la tua attrezzatura da pesca, salvare i tuoi spot preferiti, tenere un diario delle uscite e consultare le statistiche — tutto salvato in locale sul tuo browser, senza nessun account o server.

### ✨ Funzionalità

- 🌤️ **Meteo in tempo reale** — cerca qualsiasi città e ottieni temperatura, vento e umidità (API Open-Meteo + Nominatim, completamente gratuite)
- 🎣 **Gestione Attrezzatura** — aggiungi canne, mulinelli e minuteria con tipo, ambiente di pesca (mare, barca, acqua dolce), tecnica, grammatura, quantità e note
- 📍 **Spot di Pesca** — salva i tuoi spot sulla mappa con geolocalizzazione GPS, categoria (spiaggia, lago, fiume...) e note
- 📔 **Diario Uscite** — registra ogni sessione con data, orario, spot utilizzato, attrezzatura usata e commenti
- 📊 **Statistiche** — grafico uscite per mese, top spot più visitati, top attrezzatura più usata, record personali
- 💾 **Backup JSON** — esporta tutti i dati in un file `.json` e importali su qualsiasi altro dispositivo
- 🌙☀️ **Tema Dark / Light** — cambia tema con un click, preferenza salvata automaticamente

### 🗺️ Tecnologie Utilizzate

| Tecnologia | Utilizzo |
|---|---|
| HTML / CSS / JavaScript vanilla | Core dell'applicazione |
| [Leaflet.js](https://leafletjs.com/) | Mappa interattiva |
| [OpenStreetMap](https://www.openstreetmap.org/) | Tile della mappa (gratuito) |
| [Open-Meteo](https://open-meteo.com/) | API meteo (gratuita, no key) |
| [Nominatim](https://nominatim.org/) | Geocoding città (gratuito) |
| Google Fonts (Syne + Nunito) | Tipografia |
| localStorage | Salvataggio dati in locale |

### 🚀 Come Avviare
Non è richiesta nessuna installazione. Basta:

1. Clona o scarica la repository
```bash
git clone https://github.com/claussann/FishingWebApp.git
```
2. Entra nella cartella
```bash
cd fishing-inventory
```
3. Apri `index.html` nel browser

> ⚠️ Per la geolocalizzazione GPS, alcuni browser richiedono che il file sia servito tramite `http://` (non `file://`). In quel caso usa un server locale semplice:
> ```bash
> npx serve .
> # oppure
> python -m http.server 8080
> ```

### 📁 Struttura del Progetto
```
fishing-inventory/
├── index.html      # Struttura HTML e modali
├── style.css       # Stili, tema dark/light, responsive
├── script.js       # Logica app, API, localStorage
└── README.md       # Questo file
```

### 💾 Backup e Importazione
- Clicca **💾 Esporta** per scaricare un file `fishing-inventory-backup-YYYY-MM-DD.json`
- Clicca **📂 Importa** per caricare un backup su un altro dispositivo
- Il file JSON contiene: attrezzatura, spot e diario uscite

### 🛠️ Personalizzazione
Tutte le variabili di stile si trovano in cima a `style.css` nella sezione `:root`. Puoi cambiare colori, font e dimensioni facilmente.

### 📱 Versione Mobile
È in sviluppo una versione **React Native** con Expo che include funzionalità aggiuntive come foto attrezzatura dalla fotocamera, notifiche e promemoria, e GPS nativo.

### 📄 Licenza
Questo progetto è rilasciato sotto licenza [MIT](LICENSE).

---

## 🇬🇧 English

### Description
**Fishing Inventory** is a frontend-only web app to manage your fishing gear, save your favourite spots, keep a fishing diary and track your statistics — everything stored locally in your browser, no account or server required.

### ✨ Features
- 🌤️ **Real-time Weather** — search any city and get temperature, wind and humidity (Open-Meteo + Nominatim APIs, completely free)
- 🎣 **Gear Management** — add rods, reels and tackle with type, fishing environment (sea, boat, freshwater), technique, weight, quantity and notes
- 📍 **Fishing Spots** — save your spots on the map with GPS geolocation, category (beach, lake, river...) and notes
- 📔 **Fishing Diary** — log every session with date, time, spot used, gear used and comments
- 📊 **Statistics** — monthly outing chart, top visited spots, top gear used, personal records
- 💾 **JSON Backup** — export all your data to a `.json` file and import it on any other device
- 🌙☀️ **Dark / Light Theme** — switch theme with one click, preference saved automatically

### 🗺️ Technologies Used
| Technology | Purpose |
|---|---|
| HTML / CSS / Vanilla JavaScript | App core |
| [Leaflet.js](https://leafletjs.com/) | Interactive map |
| [OpenStreetMap](https://www.openstreetmap.org/) | Map tiles (free) |
| [Open-Meteo](https://open-meteo.com/) | Weather API (free, no key needed) |
| [Nominatim](https://nominatim.org/) | City geocoding (free) |
| Google Fonts (Syne + Nunito) | Typography |
| localStorage | Local data storage |

### 🚀 Getting Started
No installation required. Simply:

1. Clone or download the repository
```bash
git clone https://github.com/your-username/fishing-inventory.git
```
2. Enter the folder
```bash
cd fishing-inventory
```
3. Open `index.html` in your browser

> ⚠️ For GPS geolocation, some browsers require the file to be served over `http://` (not `file://`). In that case use a simple local server:
> ```bash
> npx serve .
> # or
> python -m http.server 8080
> ```

### 📁 Project Structure
```
fishing-inventory/
├── index.html      # HTML structure and modals
├── style.css       # Styles, dark/light theme, responsive
├── script.js       # App logic, APIs, localStorage
└── README.md       # This file
```

### 💾 Backup & Import
- Click **💾 Export** to download a `fishing-inventory-backup-YYYY-MM-DD.json` file
- Click **📂 Import** to load a backup on another device
- The JSON file contains: gear, spots and fishing diary entries

### 🛠️ Customisation
All style variables are at the top of `style.css` in the `:root` section. You can easily change colours, fonts and sizes.

### 📱 Mobile Version
A **React Native** version with Expo is in development, featuring additional capabilities such as gear photos from the camera, push notifications and reminders, and native GPS.

### 📄 License
This project is released under the [MIT](LICENSE) license.

---

Made with ❤️ and 🎣
