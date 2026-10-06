# Fishing Inventory 4

PWA gratuita per organizzare attrezzatura, spot, uscite e catture. HTML, CSS e JavaScript statici, senza build, backend o account. I dati restano nel browser e i backup JSON delle versioni precedenti conservano gli stessi identificatori e collegamenti.

## Funzioni

- Home immediata, azioni rapide, percorso iniziale, tema chiaro/scuro e navigazione mobile.
- Tema mare con blu profondo, bianco schiuma, superfici metalliche e onda SVG con effetto 3D. Il comando Effetti conserva la preferenza; le animazioni rispettano la riduzione del movimento del dispositivo e si fermano quando la hero non è visibile. Nessuna libreria grafica aggiuntiva.
- Inventario, spot, diario e catture con inserimento, modifica, ricerca e ordinamento.
- Preferiti per attrezzatura e spot; ultima eliminazione annullabile anche dopo una riapertura.
- Spot su Leaflet/OpenStreetMap o con coordinate manuali, disponibili anche se la mappa non carica. Posizione richiesta soltanto premendo il pulsante dedicato.
- Catture con foto ridotta, peso, lunghezza, spot e indicazione del rilascio.
- Statistiche sulle uscite e riepilogo annuale delle catture.
- Checklist per uscita generica, spinning, surfcasting e carpfishing.
- Backup JSON completo, importazione validata con unione/sostituzione e copia di recupero. CSV per consultare le singole raccolte con un foglio di calcolo.
- Bussola: assistente gratuito con regole e risposte guidate, locale e offline. Non è un modello AI generativo e non invia domande a servizi esterni.
- Meteo MET Norway CC BY 4.0 con attribuzione, richieste manuali, cache e gestione degli errori. Non è un bollettino di sicurezza.
- App shell e pagine editoriali disponibili offline dopo il primo caricamento. Aggiornamenti tramite service worker con pulsante di ricarica.
- AdSense predisposto con ID originali, consenso certificato Google, caricamento degli slot visibili e anteprima senza annunci reali. L’attivazione nell’account è descritta in [ADSENSE_SETUP.md](ADSENSE_SETUP.md).

## Avvio locale

Con Python installato, aprire un terminale nella cartella del progetto:

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Aprire `http://127.0.0.1:8765/`. Non aprire `index.html` con `file://`: service worker e alcune API richiedono un’origine HTTP/HTTPS. In alternativa usare un normale server statico, per esempio Live Server.

## Verifica

Node.js 18 o successivo, senza installare pacchetti:

```sh
node --test tests/regression.test.cjs
```

I test verificano compatibilità dei backup v3, date e coordinate, neutralizzazione degli URL foto, ID duplicati, importazione, recupero dopo eliminazione, modifica senza duplicazione, rollback in caso di quota esaurita, risposte guidate, consenso pubblicitario e file dell’app shell.

## File principali

| File | Responsabilità |
| --- | --- |
| `index.html`, `style.css`, `upgrade.css` | Interfaccia responsive |
| `script.js` | Funzioni principali e archivio locale |
| `upgrade.js` | Ricerca, modifica, recupero, checklist, accessibilità e Bussola |
| `data.js` | Validazione, importazione e scritture protette |
| `weather.js` | MET Norway e ricerca geografica |
| `ads-config.js`, `ads.js`, `ads.css` | Configurazione e caricamento pubblicitario |
| `sw.js`, `manifest.json` | PWA e uso offline |
| `help.html`, `privacy.html`, `contact.html` | Istruzioni e informazioni pubbliche |
| `guide*.html`, `pages.css` | Guide editoriali di pesca |
| `ads.txt`, `robots.txt`, `sitemap.xml`, `CNAME` | File pubblici di distribuzione |

## Conservazione dei dati

Le chiavi originali restano `fi_attrezzatura`, `fi_spot`, `fi_diario`, `fi_catture`. La checklist e le copie di recupero usano chiavi aggiuntive, senza migrare o cancellare l’archivio esistente. Non esiste sincronizzazione cloud. Cambiare browser, profilo o dispositivo richiede trasferire un backup JSON.

Foto e copie di recupero consumano spazio locale. Se il browser non può scrivere, la modifica non viene dichiarata salvata. La copia pre-importazione viene scritta prima di sostituire i dati e la scrittura delle raccolte viene ripristinata in caso di errore. Il recupero mantiene soltanto l’ultima importazione e l’ultima eliminazione.

Il backup automatico su file richiede File System Access e un file selezionato nella sessione corrente. Non apre finestre di salvataggio o download ripetuti in background. Su browser non compatibili usare il download manuale.

## Pubblicazione

Distribuzione statica dal repository già associato a GitHub Pages e al dominio indicato in `CNAME`. Non introdurre una build. Il proprietario deve approvare il push delle modifiche prima della pubblicazione.

Nel codice restano publisher `ca-pub-9299744740820480` e unità `1789596216`. Sono valori già presenti nel repository, non una conferma dello stato dell’account. Pubblicare il messaggio CMP e verificare il sito in AdSense è necessario per attivare effettivamente la monetizzazione. Google decide l’approvazione.

## Limiti dei servizi esterni

Mappe di sfondo, ricerca geografica, meteo e annunci richiedono internet. MET Norway consente richieste browser semplici per siti a basso volume, identificati dall’Origin, rispettando cache e limiti: ad alto traffico serve un proxy con cache. Nominatim viene usato soltanto su ricerca esplicita della città, senza autocomplete. Dati meteo e mappe non attestano condizioni sicure o autorizzazioni alla pesca.
