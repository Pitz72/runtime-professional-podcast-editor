# Runtime Radio Podcast Toolkit — Roadmap Progettuale

**Documento vivo** · Ultima revisione: 13 Luglio 2026 (a valle del ciclo v0.0.1 → v0.0.3)
**Owner:** Simone Pizzi · **Repository:** [Pitz72/runtime-professional-podcast-editor](https://github.com/Pitz72/runtime-professional-podcast-editor)

---

## 1. Visione e Missione

> **Permettere a giornalisti e podcaster di realizzare prodotti audio di altissimo livello senza possedere le competenze tecniche dell'editing audio e del suono.**

L'utente target non è un fonico: è una persona che ha **contenuti** (interviste, servizi, narrazioni, rubriche) e ha bisogno che il risultato finale suoni *professionale* — livelli a norma di piattaforma, voce pulita e presente, musica che non copre il parlato, transizioni morbide — senza mai dover capire cosa siano un compressore, un threshold o un LUFS.

Il software deve quindi essere **opinionated**: prende decisioni tecniche corrette al posto dell'utente, gliele mostra in linguaggio umano, e gli lascia il controllo solo dove serve davvero (il contenuto, il montaggio, il gusto).

### 1.1 Principi di prodotto (non negoziabili)

| # | Principio | Conseguenza pratica |
|---|-----------|---------------------|
| P1 | **Locale-first, zero costi per l'utente** | Nessuna API a pagamento (regola stabilita il 13/07/2026: Gemini eliminato e mai più reintrodotto). Ogni elaborazione — enhancement, trascrizione, analisi — gira sulla macchina dell'utente. |
| P2 | **Vera app desktop** | Dialog nativi, menu nativo, path su disco, dirty flag, recovery, persistenza ambiente. Mai pattern da web app. |
| P3 | **Linguaggio umano, non da fonico** | "Troppo forte" invece di "−3 dBFS"; "Migliora la voce" invece di "compressore 4:1". I parametri tecnici esistono ma stanno sotto un livello "avanzato". |
| P4 | **Due lingue: Italiano e English (US)** | Ogni stringa nuova nasce già in entrambe (dizionari tipizzati in `i18n.ts` — una chiave mancante è un errore di compilazione). |
| P5 | **Il lavoro dell'utente è sacro** | Undo sempre disponibile, autosave di recupero, conferme prima di azioni distruttive, mai sovrascritture silenziose. |
| P6 | **Qualità verificabile** | Ogni release passa i gate: `tsc --noEmit` strict (renderer+main), ESLint `--max-warnings 0`, suite Vitest verde, build di produzione, smoke test. Standard di rilascio: versione → changelog dedicato → commit → push → verifica sync SHA. |

### 1.2 Stato attuale (v0.0.3 "Mestiere")

Il ciclo 13/07/2026 ha risolto tutte le criticità **gravissime** (v0.0.1 "Fondamenta": integrazione Electron reale, stato unificato, persistenza su path, sicurezza IPC, undo/redo), **gravi** (v0.0.2 "Precisione": ducking corretto, playhead senza re-render, export in worker, waveform fedeli, posizioni esatte, toast) e **medie** (v0.0.3 "Mestiere": i18n IT/EN, autosave+recenti+finestra, menu contestuale, snapping+anti-overlap, loop nativo).

L'app oggi è: **un editor multitraccia solido, sicuro e testato** (31 test, strict TS). Non è ancora: lo strumento che mantiene la promessa della missione. Le fasi seguenti colmano questa distanza.

---

## 2. Struttura della Roadmap

Sei fasi ordinate per **dipendenza logica e valore per l'utente target**. Ogni fase è una release minore con codename, e ogni feature riporta: motivazione per il target, approccio tecnico, criteri di accettazione (AC), stima (S ≈ ore, M ≈ 1-2 giorni, L ≈ 3-5 giorni, XL ≈ oltre una settimana di lavoro equivalente).

```
v0.0.4 ──► v0.1.0 ──► v0.2.0 ──► v0.3.0 ──► v0.4.0 ──► v0.5.0 ──► v1.0.0
Editor      Suono      Voce       Parole     Redazione  Distrib.   Uscita
completo    giusto     (rec)      (trascr.)  (workflow) (release)  pubblica
```

---

## 3. FASE 1 — v0.0.4 "L'Attrezzatura" (editor completo)

**Obiettivo:** chiudere le lacune funzionali che frustrerebbero chiunque monti audio, prima ancora di parlare di qualità sonora. Senza queste, il resto non ha fondamenta d'uso.

### 3.1 Split del clip al playhead — **priorità assoluta**
- **Perché:** tagliare un'intervista è l'operazione n.1 del giornalista. Oggi si può solo rifilare dai bordi.
- **Come:** azione `splitClip(clipId, time)` nello store: il clip diventa due clip contigui (`[start, t]` e `[t, end]`, il secondo con `offset` aggiornato). Scorciatoia **S** (sul clip selezionato, alla posizione del playhead) + voce nel menu contestuale "Dividi qui". Uno snapshot di history per l'operazione.
- **AC:** split a metà clip produce due clip che riproducono l'audio identico all'originale senza gap né click; undo li ricompone; split fuori dai bordi del clip è un no-op. Test unitari sulla funzione pura di split.
- **Stima:** M

### 3.2 Fade in/out per clip e crossfade automatico
- **Perché:** ogni taglio netto produce attacchi bruschi e potenziali click. I fade sono ciò che fa suonare "montato bene" anche un montaggio semplice.
- **Come:** campi `fadeIn`/`fadeOut` (secondi) su `AudioClip`; maniglie triangolari trascinabili agli angoli superiori del clip; rendering con `linearRampToValueAtTime` su un gain dedicato per clip (playback ed export condividono `buildAudioGraph`). **Crossfade automatico**: quando due clip sulla stessa traccia vengono accostati con sovrapposizione intenzionale (drag con modificatore, o comando "Crossfade" sul punto di giunzione), si generano fade complementari (equal-power). Default: micro-fade di 5 ms su ogni bordo di clip per eliminare i click (invisibile all'utente).
- **AC:** fade visibili sulla waveform; micro-fade sempre attivi (nessun click su tagli netti, verificabile con file di test a onda quadra); export identico al playback; serializzazione nel progetto (schemaVersion 2 con migrazione da 1).
- **Stima:** L

### 3.3 Mute / Solo con UI
- **Perché:** esistono nel modello dati e nel motore, ma **non hanno controlli**: feature fantasma ereditata.
- **Come:** pulsanti M/S nell'header di ogni traccia (giallo/verde, stato evidente), scorciatoie M e S con traccia selezionata... (S è presa dallo split: usare **Shift+S** per solo). Comportamento standard: un solo può coesistere con altri solo (somma dei solo), mute esclude.
- **Nota tecnica:** oggi il motore suona "il primo solo trovato" — va corretto in "tutti i solo attivi".
- **AC:** M/S cliccabili e visibili senza aprire il pannello proprietà; il playback riflette il cambiamento al play successivo; persistiti nel progetto.
- **Stima:** S

### 3.4 Rinomina di tracce e progetto
- **Perché:** "Untitled Project" per sempre e tracce anonime rendono i progetti ingestibili.
- **Come:** doppio click sul nome traccia → input inline (Escape annulla, Invio conferma); nome progetto editabile nell'header dell'editor; il nome progetto alimenta il `defaultPath` di salvataggio/export (già in essere).
- **AC:** rename traccia/progetto persiste, entra nella history, il titolo della finestra mostra `nomeProgetto — Runtime Radio Podcast Toolkit` con `*` se dirty (via IPC `setTitle`).
- **Stima:** S

### 3.5 Trasporto e navigazione da editor vero
- **Perché:** i riflessi motori di chi monta: senza, ogni azione costa un click.
- **Cosa:**
  - **Barra spaziatrice** = play/pausa (con la guardia input già esistente).
  - **Click sul righello** = seek immediato (oggi si può solo trascinare il playhead).
  - **Home/End** = inizio / fine contenuto; **frecce ←/→** = nudge del clip selezionato (±0.1s, con Shift ±1s).
  - **Ctrl+rotella** = zoom centrato sul cursore; **rotella orizzontale/Shift+rotella** = pan.
  - **Display del tempo corrente** (mm:ss.cc) nel trasporto, aggiornato via subscription (non state).
  - **Auto-follow del playhead** durante il play (scroll che insegue, disattivabile cliccando la timeline).
- **AC:** ogni scorciatoia documentata in un pannello "Scorciatoie" richiamabile con **?** e localizzato IT/EN.
- **Stima:** M

### 3.6 Meter master e volume master
- **Perché:** l'utente non ha oggi alcuna percezione visiva di *quanto* sta suonando il mix, né un controllo globale.
- **Come:** `AnalyserNode` sul master bus (solo in playback); meter stereo peak con hold e indicatore di clip (rosso persistente finché non cliccato); slider volume master (post-mastering, solo monitor — **non** influenza l'export, esplicitato in tooltip).
- **AC:** meter fluido (~30fps, rAF, zero re-render React — pattern playhead); clipping evidenziato; volume master persistito come preferenza, non nel progetto.
- **Stima:** M

### 3.7 Feedback di avanzamento (import ed export)
- **Perché:** file da 200MB decodificano in secondi "muti": l'utente pensa al blocco.
- **Come:** import: barra indeterminata per file, coda visibile nel File Bin ("3 di 5..."); export: il worker già esiste — aggiungere messaggi di progresso (`{phase: 'render'|'normalize'|'encode', pct}`) e una piccola modal di progresso con Annulla (termina worker e render).
- **AC:** nessuna operazione > 2s senza feedback visivo; Annulla funziona senza lasciare stato sporco.
- **Stima:** M

### 3.8 Pulizia residua
- Multi-selezione clip (Ctrl+click, marquee) con spostamento/cancellazione di gruppo — **Stima L**, può slittare a Fase 4 se pesa troppo.
- Duplicazione clip rapida (Ctrl+D alla posizione playhead).
- Cursore "grabbing" coerente e hover states; tooltips localizzati ovunque.

**Uscita di fase:** un montaggio completo (import → taglia → sposta → fade → livelli → export) è eseguibile senza mai toccare il mouse per il trasporto e senza mai produrre un click udibile.

---

## 4. FASE 2 — v0.1.0 "Il Suono Giusto" (la promessa della missione)

**Obiettivo:** è la fase che trasforma l'editor nello strumento della missione: *l'output è a norma broadcast anche se l'utente non sa cosa significhi*.

### 4.1 Loudness conforme agli standard (LUFS) — **la feature simbolo del prodotto**
- **Perché:** il picco a −1 dB (attuale) non è il volume percepito. Le piattaforme normalizzano in LUFS: un podcast masterizzato "a orecchio" suona più piano/più forte degli altri, o viene ricompresso male. Consegnare a −16 LUFS integrati con true peak ≤ −1 dBTP è *la* differenza tra amatoriale e professionale — ed è esattamente la competenza che il target non ha.
- **Come:**
  1. Implementare la misura **ITU-R BS.1770-4** (K-weighting: filtro shelving alto + high-pass; gating a −70 LUFS assoluto e −10 LU relativo) come funzione pura su canali raw in `encoders.ts` → gira nel worker di export. È matematica ben documentata, ~200 righe, testabile con i file di riferimento EBU.
  2. **True peak** via oversampling 4× (interpolazione) sulla misura del picco.
  3. Pipeline di export: render → misura LUFS integrata → gain di normalizzazione al target → limiter true-peak (−1 dBTP) → encode.
  4. UI: nel dialogo di export, selettore **in linguaggio piattaforma**: "🎙️ Podcast standard (−16 LUFS)" / "🎵 Spotify & YouTube (−14 LUFS)" / "📻 Radio EBU R128 (−23 LUFS)" / "Personalizzato" (avanzato). Report post-export: "Loudness finale: −16.0 LUFS, picco −1.0 dB ✓".
- **AC:** file EBU di riferimento misurati entro ±0.1 LU; export a target verificato con misura esterna (ffmpeg loudnorm); i preset sono la scelta di default, il custom è nascosto sotto "Avanzate". Test unitari sul misuratore con segnali sintetici noti (sinusoide −23 LUFS ecc.).
- **Stima:** XL (ma è il cuore del prodotto)

### 4.2 "Migliora la voce" — enhancement automatico locale
- **Perché:** i preset statici attuali non guardano il segnale. Il target vuole un bottone, non una catena.
- **Come (tutto locale, P1):**
  1. **Analisi del clip/traccia**: noise floor (percentile basso dell'energia RMS su finestre), sibilanza (energia 5–9 kHz relativa), dinamica (crest factor), rumble (< 80 Hz), DC offset.
  2. **Decisione parametrica**: high-pass adattivo (75–120 Hz), noise gate con soglia dal noise floor misurato, de-esser (compressione della banda sibilante) solo se serve, compressione dolce dimensionata sul crest factor, EQ di presenza.
  3. **UI**: un pulsante "✨ Migliora la voce" sulla traccia → analisi (progress) → applicazione con **anteprima A/B** (toggle "Prima/Dopo" durante il play) e slider unico "Intensità" (leggero/medio/forte). Sotto "Avanzate", i parametri reali per chi li vuole.
  4. Architettura: l'analisi gira nel worker (funzioni pure su canali raw); il risultato è un `AudioPreset` esteso (gate e de-esser = nuovi nodi nella catena di `buildAudioGraph`: gate implementabile con analisi offline + automazione gain; de-esser con banda + compressore).
- **AC:** su una registrazione test con rumore di fondo e sibilanza, l'A/B mostra miglioramento evidente senza artefatti pesanti; l'applicazione è reversibile (undo, e il preset resta ispezionabile); tempo di analisi < 5s per 10 min di audio.
- **Stima:** XL
- **Estensione futura (backlog):** integrazione di **RNNoise** (denoise neurale, open source, C compilato in WASM — locale e gratuito) come opzione "Riduzione rumore avanzata".

### 4.3 Metering in linguaggio umano
- **Perché:** il meter tecnico (Fase 1) parla dB; il target capisce semafori.
- **Come:** accanto al meter, badge di stato calcolato su finestre brevi: 🟢 "Livello ok" / 🟡 "Un po' piano" / 🔴 "Sta distorcendo" + suggerimento contestuale ("Alza il volume della traccia Voce"). Loudness short-term mostrata come "volume percepito" con la stessa scala dei preset di export.
- **Stima:** M (dipende da 4.1 per la misura)

### 4.4 Ducking parlante
- **Perché:** oggi è fisso (20%, 50ms/500ms). Il target non deve conoscere attack/release, ma deve poter dire "di più / di meno".
- **Come:** nel pannello traccia musica: slider "Quanto abbassare sotto la voce" (Poco −6 dB / Medio −12 dB / Molto −20 dB) + "Velocità" (Morbida/Normale/Rapida) → mappati sui parametri reali. Anteprima immediata al play.
- **AC:** i valori sono per-traccia e persistiti; il default resta sensato (Medio/Normale).
- **Stima:** S

### 4.5 Preset ripensati per outcome
- **Perché:** "Warm Broadcast Voice" è già linguaggio-utente, ma la lista mescola strumenti ed effetti creativi.
- **Come:** riorganizzare i preset in due gruppi: **Correzione** ("Voce più chiara", "Meno rimbombo", "Telefono/VoIP ripulito") ed **Effetti** ("Telefono anni '50", "Radio vintage"); descrizione di una riga per ciascuno, localizzata.
- **Stima:** S

**Uscita di fase:** un utente registra con un microfono USB in una stanza normale, preme "Migliora la voce", esporta con "Podcast standard" → il file è indistinguibile, ai livelli e alla pulizia, da una produzione professionale entry-level. *Questa è la missione.*

---

## 5. FASE 3 — v0.2.0 "La Voce" (registrazione integrata)

**Obiettivo:** chiudere il cerchio produttivo: oggi si può solo importare audio registrato altrove. La vecchia feature di registrazione era codice morto ed è stata rimossa in v0.0.1: va **riprogettata da zero**, bene.

### 5.1 Registrazione su traccia
- **Come:**
  - Selettore dispositivo di input (`enumerateDevices`, con permessi gestiti e messaggi chiari se negati), memorizzato nelle preferenze.
  - **Armamento traccia** (pulsante ⏺ sull'header delle tracce Voice), monitor livelli pre-registrazione (meter + "parla per provare il livello": troppo basso/ok/troppo alto).
  - Registrazione **WAV PCM non compresso** (via AudioWorklet → accumulo Float32 → encode WAV nel worker; niente MediaRecorder/webm: qualità piena e durata affidabile — il vecchio approccio webm aveva durata `Infinity`).
  - Il file registrato viene **salvato subito su disco** (cartella del progetto o cartella registrazioni configurabile) → entra nel File Bin con un path reale (coerente con la persistenza), e il clip appare sulla traccia armata alla posizione del playhead, in crescita visiva durante la registrazione.
  - Conto alla rovescia 3-2-1 opzionale; punch-in sul playhead; Escape annulla (con conferma).
- **AC:** registrare 30 minuti non degrada la UI (accumulo su disco a chunk, non in RAM illimitata); crash a metà registrazione non perde l'audio già scritto (file WAV riparabile: header aggiornato a chiusura, recovery che sistema l'header); il file registrato ricarica correttamente alla riapertura del progetto.
- **Stima:** XL

### 5.2 Sovraincisione e retake
- Riascolto delle altre tracce durante la registrazione (monitoraggio con latenza gestita); "riprova ultima take" che accoda le take alternative dello stesso segmento con scelta rapida.
- **Stima:** L (le take multiple possono slittare)

### 5.3 Cartella di progetto
- **Perché:** con la registrazione nasce l'esigenza di un posto dove vivono gli asset del progetto.
- **Come:** opzione (default per i nuovi progetti) "progetto come cartella": `MioShow/MioShow.json + MioShow/audio/…`; all'import, offerta di **copiare i file nella cartella progetto** (progetti portabili/archiviabili). Path relativi nel JSON quando i file sono nella cartella (schemaVersion 3).
- **AC:** un progetto-cartella zippato e riaperto su un altro PC funziona al 100%.
- **Stima:** L

**Uscita di fase:** l'intero ciclo produttivo (registra → monta → migliora → esporta) vive dentro l'app.

---

## 6. FASE 4 — v0.3.0 "Le Parole" (trascrizione e contenuto)

**Obiettivo:** le killer feature da giornalista. Tutto locale (P1).

### 6.1 Trascrizione locale (Whisper)
- **Come:** integrazione di **whisper.cpp** come binario/addon invocato dal main process (il renderer resta sandboxed); modelli scaricabili on-demand dentro l'app (small/medium multilingua — download una tantum con progress, ospitati su sorgenti ufficiali) con gestione dello spazio disco; trascrizione con timestamp a livello di parola; pannello trascrizione affiancato alla timeline, click su una parola = seek.
- **AC:** 10 minuti di parlato italiano trascritti in tempo ragionevole su una macchina media (modello small), con timestamp allineati (< 200ms di errore percepito); UI non bloccata; annullabile.
- **Stima:** XL

### 6.2 Editing dal testo (modello Descript, prima iterazione)
- **Come:** selezione di un intervallo di testo → azioni "Elimina" (rimuove il segmento audio con micro-crossfade sui bordi e richiude il buco — *ripple delete*) ed "Evidenzia in timeline". Le modifiche sono normali operazioni sui clip: history, undo, tutto già in essere.
- **AC:** eliminare una frase dal testo produce un montaggio senza click né salti innaturali; la trascrizione si mantiene sincronizzata dopo l'edit.
- **Stima:** XL

### 6.3 Rimozione automatica dei silenzi
- **Come:** analisi RMS con soglia adattiva → proposta di tagli (visualizzati come segmenti evidenziati) con soglie in linguaggio umano ("pause oltre 2 secondi") e **anteprima prima di applicare**; applicazione = split+delete+ripple con micro-fade.
- **AC:** mai applicazione cieca: sempre proposta → revisione → conferma; undo in un colpo solo (batch history).
- **Stima:** L

### 6.4 Rilevamento dei riempitivi ("ehm", "cioè...") — *esplorativo*
- Basato sulla trascrizione (parole riempitive note per lingua) → stessa UX a proposta. Dipende dalla qualità dei timestamp di Whisper sul parlato italiano.
- **Stima:** M (dopo 6.1/6.2)

**Uscita di fase:** un giornalista monta un'intervista di 40 minuti *leggendola*, non riascoltandola.

---

## 7. FASE 5 — v0.4.0 "La Redazione" (workflow editoriale)

**Obiettivo:** dal singolo montaggio alla produzione seriale di un programma.

### 7.1 Template di puntata
- Progetti-modello (sigla, bed, spazi per i servizi già disposti e nominati) salvabili come "Template" e istanziabili da "Nuovo da template" nella Welcome; template di esempio inclusi (in entrambe le lingue).
- **Stima:** M

### 7.2 Libreria asset condivisa
- Libreria globale (jingle, sigle, bed, effetti) indipendente dal progetto: cartella gestita + pannello dedicato con anteprima al click e drag verso la timeline; i preferiti di ogni show a portata di mano senza reimportare.
- **Stima:** L

### 7.3 Capitoli e marker
- Marker sulla timeline (M sul playhead… ricollocare le scorciatoie in conflitto), con nome e colore; navigazione tra marker; **export capitoli**: ID3v2 chapters nell'MP3 e file `chapters.txt`/JSON per le piattaforme.
- **Stima:** L

### 7.4 Metadata di pubblicazione
- Pannello "Pubblicazione": titolo puntata, show, autore, copertina (immagine → resize), descrizione → scritti come **tag ID3v2** nell'MP3 esportato (implementazione tag writer pura in `encoders.ts`, testabile).
- **AC:** l'MP3 esportato mostra titolo/artista/copertina in un player standard.
- **Stima:** M

### 7.5 Note e annotazioni
- Note testuali per traccia/progetto (visibili nel pannello proprietà) per appunti di redazione ("qui manca il lancio del servizio").
- **Stima:** S

**Uscita di fase:** produrre la puntata n. 100 costa un decimo della puntata n. 1.

---

## 8. FASE 6 — v0.5.0 "La Distribuzione" (release engineering)

**Obiettivo:** far arrivare l'app agli utenti in modo professionale e aggiornabile.

| Voce | Dettaglio | Stima |
|---|---|---|
| **Icona applicazione** | Icona `.ico` multi-risoluzione nel build NSIS (oggi assente!), icona finestra, icona file `.json` di progetto associato (estensione dedicata `.rrpp` valutabile con schemaVersion) | S |
| **CI GitHub Actions** | Workflow su push/PR: typecheck + lint + test + build renderer/main; badge nel README | S |
| **Auto-updater** | `electron-updater` + pubblicazione su GitHub Releases; canale stabile; UX: notifica discreta "Nuova versione disponibile — Riavvia per aggiornare"; rispetta P5 (mai riavvii forzati) | M |
| **Firma del codice** | Valutare certificato di code signing per Windows (costo/beneficio da decidere: senza firma, SmartScreen mostra l'avviso; documentare il workaround per gli utenti nel frattempo) | decisione |
| **Installer rifinito** | Pagina lingua (IT/EN), licenza, changelog nell'installer, disinstallazione pulita (opzione di conservare i dati utente) | S |
| **Documentazione utente** | Guida rapida in-app ("Il tuo primo podcast in 10 minuti") IT/EN + USER_GUIDE.md riscritta sullo stato reale | M |
| **Telemetria: NO** | Nessuna raccolta dati. Il crash log resta locale; un pulsante "Segnala un problema" apre GitHub Issues con il log pronto da incollare (azione manuale dell'utente) | S |

**Uscita di fase:** un utente scarica l'installer, installa, riceve aggiornamenti — senza mai vedere un terminale.

---

## 9. v1.0.0 — Criteri di uscita

La 1.0 non è una data: è una **checklist**. Si dichiara 1.0 quando:

- [ ] Tutte le fasi 1–6 completate (le voci "possono slittare" escluse esplicitamente).
- [ ] **Il test della missione**: una persona senza alcuna competenza audio, con la sola guida in-app, produce e pubblica una puntata (registrata, montata, migliorata, a −16 LUFS, con metadata) giudicata "professionale" in un blind test con una produzione di riferimento.
- [ ] Zero criticità gravi o superiori aperte; suite ≥ 80 test; gate CI verdi da ≥ 4 settimane.
- [ ] Progetti retrocompatibili dalla 0.1.0 in avanti (migrazioni schemaVersion testate).
- [ ] Documentazione utente completa IT/EN.

---

## 10. Backlog post-1.0 (non pianificato, in ordine sparso)

- **Riduzione rumore neurale** (RNNoise/DeepFilterNet in WASM) come livello "avanzato" del Migliora-voce.
- **macOS**: il codice è già cross-platform al 95% (menu role, accelerator, path); serve hardware di test e notarizzazione.
- **Clip gain envelope** (automazione volume disegnabile sul clip) — il gradino "pro-am" successivo ai fade.
- **Time-stretching** leggero dei clip (allineare un bed musicale alla durata del parlato).
- **Esportazione stem** (una traccia per file) per interscambio con fonici esterni.
- **Pubblicazione diretta**: generazione feed RSS locale / integrazione con host podcast via API *solo se gratuite per l'utente* (P1 vincolante).
- **Sistema plugin** (estensioni di terze parti sandboxed) — solo a piattaforma matura.
- **Collaborazione** (progetti condivisi) — esplicitamente fuori scope fino a domanda reale degli utenti.
- **Rilevamento musica/parlato automatico** all'import (classificazione della traccia suggerita).

---

## 11. Rischi tecnici e mitigazioni

| Rischio | Impatto | Mitigazione |
|---|---|---|
| **Precisione LUFS** (4.1) implementata male → promessa mancata | Alto | Validazione contro i file di riferimento EBU Tech 3341/3342 e cross-check con `ffmpeg loudnorm` nei test; nessun rilascio senza tolleranza ±0.1 LU |
| **Whisper su macchine deboli** (6.1) | Medio | Modello small di default, scelta modello con stima tempi, elaborazione annullabile, aspettative chiare in UI ("~2× durata audio") |
| **Registrazione lunga e memoria** (5.1) | Alto | Scrittura su disco a chunk fin dal primo secondo; mai buffer RAM illimitati; test con registrazioni ≥ 1h |
| **Gate/de-esser real-time in Web Audio** (4.2) | Medio | Implementazione offline-first (analisi + automazione pre-calcolata) dove il real-time è fragile; A/B sempre disponibile |
| **Crescita del bundle** (Whisper, RNNoise) | Basso | Download on-demand dei modelli fuori dall'installer; installer sotto i 150 MB |
| **Regressioni audio non coperte da unit test** | Medio | Aggiungere test di rendering: progetti sintetici notevoli → render offline → asserzioni su RMS/picchi per segmento (golden tests) |
| **Scope creep** (questa roadmap è ambiziosa) | Alto | Una fase per release, gate di qualità invariabili, le voci "può slittare" si tagliano senza discussione se la fase supera il budget |

---

## 12. Regole operative permanenti

1. **Ogni release**: bump versione (package.json + `APP_VERSION` + output builds) → entry CHANGELOG + `docs/vX.Y.Z.md` → commit → push → verifica sync SHA locale/remoto.
2. **Ogni feature**: stringhe nuove in IT **e** EN nello stesso commit; test per la logica pura; nessun `any` nuovo; nessun `alert()`.
3. **Ogni fase**: si chiude con smoke test sull'app Electron reale e aggiornamento di questo documento (stato → "fatto", scostamenti annotati).
4. **Mai**: API a pagamento per l'utente, pattern web-app, sovrascritture silenziose del lavoro.

---

*Documento redatto il 13/07/2026 a valle della revisione totale e del ciclo di rifondazione v0.0.1 → v0.0.3.*
