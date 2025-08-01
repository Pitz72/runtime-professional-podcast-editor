# Runtime Radio - Documento di Progettazione Software

## 1. Visione e Obiettivi del Progetto

**Obiettivo Principale:** Creare un software di editing audio desktop, chiamato "Runtime Radio", specificamente progettato per la produzione di podcast e contenuti parlati.

**Visione:** Il software deve trovare un equilibrio perfetto tra **potenza professionale** e **semplicità d'uso**. Deve offrire risultati di alta qualità, paragonabili a quelli di software più complessi come Adobe Audition, ma con un'interfaccia più intuitiva e un set di funzionalità mirato esclusivamente alle necessità dei podcaster, escludendo tutto ciò che non è essenziale per questo scopo. L'utente target è un creatore di contenuti che potrebbe non avere competenze tecniche avanzate di ingegneria del suono, ma che desidera comunque un prodotto finale di livello "premium".

---

## 2. Stack Tecnologico Proposto

Per garantire stabilità, performance e una buona esperienza di sviluppo, si propone il seguente stack tecnologico:

*   **Applicazione Desktop:** **Electron** - Un framework maturo e stabile per creare applicazioni desktop cross-platform utilizzando tecnologie web. Offre un'ottima integrazione con l'ambiente Node.js per operazioni sicure.
*   **Frontend Framework:** **React** - Una libreria UI leader del settore con un vasto ecosistema.
*   **Build Tool:** **Vite** - Un build tool di nuova generazione che offre un'esperienza di sviluppo estremamente veloce.
*   **Linguaggio:** **TypeScript** - Per aggiungere la tipizzazione statica al JavaScript, migliorando la robustezza e la manutenibilità del codice.
*   **Styling:** **Tailwind CSS** - Un framework CSS utility-first che verrà integrato nel processo di build tramite **PostCSS** per la massima performance e personalizzazione.
*   **Testing:** **Vitest** - Un framework di test moderno e veloce, perfettamente integrato con l'ecosistema di Vite, che useremo per unit test e test di componenti.

---

## 3. Architettura del Software

L'applicazione seguirà l'architettura standard e sicura di Electron, basata sulla separazione dei processi:

*   **Processo Main (Backend):**
    *   Basato su Node.js.
    *   **Responsabilità:**
        *   Gestione del ciclo di vita dell'applicazione e delle finestre (`BrowserWindow`).
        *   Interazione con il sistema operativo (es. menu, dialoghi di salvataggio/apertura file).
        *   Gestione di tutte le operazioni sensibili che richiedono accesso al filesystem o a chiavi API (anche se non usate inizialmente, l'architettura sarà predisposta).
    *   Il codice sorgente risiederà in una cartella dedicata, es. `electron/`.

*   **Processo Renderer (Frontend):**
    *   È l'interfaccia utente dell'applicazione, essenzialmente un'applicazione web React.
    *   Gira in un ambiente browser-like e **non ha accesso diretto alle API di Node.js**.
    *   Il codice sorgente risiederà nella cartella `src/`.

*   **Script di Preload:**
    *   Funziona come un ponte sicuro tra il processo Main e il Renderer.
    *   Espone selettivamente funzionalità del backend al frontend tramite l'API `contextBridge`, senza compromettere la sicurezza.

---

## 4. Features per la Prima Versione (Minimum Viable Product - MVP)

La prima versione del software si concentrerà sull'implementazione pulita delle seguenti funzionalità essenziali:

1.  **Gestione del Progetto:**
    *   Creazione di un nuovo progetto vuoto.
    *   Salvataggio e caricamento di progetti in un formato `.json` tramite dialoghi di sistema nativi.

2.  **Interfaccia Utente Principale:**
    *   **File Bin:** Per importare e gestire i file audio sorgente.
    *   **Timeline:** Un'interfaccia multi-traccia per assemblare le clip audio.
    *   **Properties Panel:** Per visualizzare e modificare le proprietà della traccia o della clip selezionata.

3.  **Editing sulla Timeline:**
    *   **Visualizzazione Forme d'Onda:** Le clip devono mostrare la forma d'onda dell'audio per un editing preciso.
    *   **Spostamento:** Spostare clip sulla timeline e tra le tracce tramite drag-and-drop.
    *   **Taglio (Trim):** Accorciare o allungare l'inizio e la fine di una clip tramite maniglie interattive.
    *   **Divisione (Split):** Dividere una clip in due nel punto della testina di riproduzione.
    *   **Cancellazione:** Eliminare clip e tracce.

4.  **Sistema di Annulla/Ripeti (Undo/Redo):**
    *   Un sistema robusto per annullare e ripetere tutte le principali azioni di editing.

5.  **Motore Audio e Processamento:**
    *   Utilizzo della **Web Audio API** per tutta l'elaborazione audio in tempo reale.
    *   **Preset Professionali:** Una selezione di alta qualità per:
        *   **Voce:** (es. "Podcast Clarity", "Warm Voice").
        *   **Musica:** (es. "Music Bed" con scoop sulle medie frequenze).
        *   **Mastering:** Preset per portare il volume finale a standard di settore (es. "Spotify Loud", "Apple Podcasts Natural").
    *   **Ducking Automatico:** Funzionalità per abbassare automaticamente il volume della musica quando la voce è presente.

6.  **Esportazione:**
    *   Esportazione del mix finale in formato **WAV** di alta qualità.

---

## 5. Roadmap per l'Evoluzione Futura (Post-MVP)

Una volta consolidato l'MVP, si potranno esplorare le seguenti funzionalità "premium":

*   **Editing Avanzato:**
    *   Crossfades automatici tra clip.
    *   Automazione di volume e panning tramite "buste" disegnabili.
    *   Raggruppamento di clip.

*   **Funzionalità Intelligenti:**
    *   **Editing basato sul Testo:** Trascrizione dell'audio e possibilità di editare l'audio modificando il testo.
    *   **Rimozione Automatica dei Silenzi.**

*   **Elaborazione Audio e Formati:**
    *   Supporto per plugin **VST/AU** di terze parti.
    *   Esportazione in formati compressi come **MP3**.

*   **UX/UI:**
    *   Template di progetto personalizzabili.
    *   Registrazione audio diretta nell'applicazione.
