# AdSense: codice predisposto, attivazione dell’account da completare

Publisher già presente nel progetto: `ca-pub-9299744740820480`.
Unità display già presente: `1789596216`.
`ads.txt` conserva `google.com, pub-9299744740820480, DIRECT, f08c47fec0942fa0`.
Non sono stati creati account, unità nuove o richieste di approvazione.

## Comportamento implementato

- Annunci soltanto nella parte editoriale della Home, nelle Guide e nelle pagine editoriali già predisposte. Nessun banner nei moduli, nell’assistente o negli archivi personali vuoti.
- Rimosso il banner sticky mobile; distanza dai comandi, etichetta “Pubblicità”, slot responsive e caricamento vicino all’area visibile.
- Tag annunci caricato una sola volta sul dominio effettivo. Nessun aggiornamento automatico delle unità.
- Google Funding Choices integra il messaggio di consenso pubblicato nell’account. Il tag AdSense parte solo dopo un segnale TCF valido: consenso a Purpose 1 e Google 755, oppure GDPR dichiarato non applicabile dalla CMP. Nessun consenso è dedotto da checkbox locali.
- Preferenze privacy riapribili dal footer; revoca del consenso interrompe le richieste e ricarica la pagina se erano già stati caricati annunci. Salvare eventuali moduli aperti prima di cambiare le preferenze.
- Slot non riempiti o libreria bloccata vengono nascosti. Su localhost sono semplici spazi dimostrativi: nessuna CMP o impression reale.
- `robots.txt`, sitemap, canonical, pagine di guida all’app, Contatti e Privacy accessibili senza account.

## Dopo l’approvazione della pubblicazione da parte del proprietario

1. Verificare che publisher e unità appartengano al proprio account e che l’unità sia ancora un annuncio display responsive valido.
2. In AdSense → Siti, aprire `fishing-inventory.it` e controllare lo stato e gli eventuali motivi di rifiuto. Codice, meta di verifica e ads.txt sono già nel sito; non presentare la richiesta fino alla pubblicazione dei contenuti finali.
3. In Privacy e messaggi → Regolamenti europei, creare o modificare un messaggio per il sito. Collegare `/privacy.html`, configurare finalità e fornitori, includere scelte accetta/rifiuta/gestisci, e pubblicare. Le impostazioni devono corrispondere all’effettivo uso del sito.
4. Verificare su una sessione nuova del dominio reale: prima di decidere non parte `adsbygoogle.js`; rifiutando restano disponibili app e contenuti; accettando gli annunci vengono richiesti soltanto per slot visibili; Preferenze privacy riapre la CMP.
5. Controllare `https://fishing-inventory.it/ads.txt`, il dominio canonico e i redirect www. Inviare o ripetere la verifica del sito nel proprio account quando pronta.
6. Attendere la decisione di Google. Un ID valido o uno slot inserito non attestano l’approvazione. Non fare clic sui propri annunci e non usare traffico artificiale.

Una CMP assente, non pubblicata o senza segnale valido lascia gli annunci spenti. Il comportamento reale di Funding Choices e il riempimento degli annunci vanno verificati sul dominio, con l’account: i test locali verificano la logica, non lo stato del publisher. L’approvazione non può essere garantita attraverso modifiche al codice.

## Servizi meteo

Open-Meteo è stato sostituito perché il piano gratuito è destinato all’uso non commerciale. MET Norway fornisce dati aperti CC BY 4.0 senza chiave, con attribuzione, coordinate arrotondate e cache fino alla scadenza. Sono previste richieste CORS semplici con Origin per un sito a basso traffico. Se il traffico cresce serve un proxy con cache secondo le condizioni MET; non è stato introdotto un backend a pagamento.

## Fonti ufficiali verificate il 6 ottobre 2026

- https://support.google.com/adsense/answer/1346295?hl=it
- https://support.google.com/adsense/answer/13554020?hl=it
- https://support.google.com/adsense/answer/10961068?hl=it
- https://support.google.com/adsense/answer/12171612?hl=it
- https://open-meteo.com/en/pricing
- https://api.met.no/doc/TermsOfService
- https://api.met.no/doc/License
