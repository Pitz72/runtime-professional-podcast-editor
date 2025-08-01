# Documento di Architettura e Roadmap Futura per Runtime Radio

Questo documento descrive l'architettura finale proposta per il progetto e una roadmap di possibili evoluzioni per trasformarlo in un software di livello premium.

---

## 1. Architettura Finale Proposta

L'applicazione sarà un'applicazione desktop nativa basata su **Electron**, che offre un eccellente equilibrio tra sviluppo rapido basato sul web e integrazione con il sistema operativo.

*   **Frontend (Renderer Process):**
    *   **Framework:** React con Vite per un'esperienza di sviluppo veloce e moderna.
    *   **Linguaggio:** TypeScript per la robustezza e la manutenibilità del codice.
    *   **Gestione dello Stato:** Lo stato principale dell'applicazione (`project`) è gestito nel componente `App.tsx` e arricchito con un sistema di cronologia per l'Undo/Redo tramite il custom hook `useHistoryState`.
    *   **UI:** L'interfaccia è costruita con un'architettura a componenti (es. `Timeline`, `PropertiesPanel`, `FileBin`) per una chiara separazione delle responsabilità.

*   **Backend (Main Process):**
    *   **Ambiente:** Node.js, fornito da Electron.
    *   **Responsabilità:**
        1.  **Gestione delle Finestre:** Creazione e gestione delle finestre dell'applicazione (`BrowserWindow`).
        2.  **Integrazione con il Sistema Operativo:** Gestione di dialoghi nativi per l'apertura e il salvataggio dei file, menu di sistema personalizzati, etc.
        3.  **Operazioni Sicure:** Gestione di qualsiasi logica che richieda accesso a risorse sensibili, come chiavi API o il filesystem in modo privilegiato. Anche se l'uso dell'API Gemini è stato sospeso, l'architettura è pronta per gestire in modo sicuro future chiamate di rete.

*   **Comunicazione (Main <-> Renderer):**
    *   La comunicazione tra il backend e il frontend avviene in modo sicuro tramite un **Preload Script** e il `contextBridge` di Electron.
    *   Questo previene l'esposizione di API sensibili di Node.js al frontend, seguendo le migliori pratiche di sicurezza di Electron.

---

## 2. Roadmap per Funzionalità Premium

Di seguito una lista di funzionalità suggerite, suddivise per categoria, per l'evoluzione futura del prodotto.

#### Categoria: Miglioramenti dell'Editing (Core Editing)

*   **Crossfades Automatici:** Creazione automatica di dissolvenze incrociate (crossfade) quando due clip si sovrappongono per eliminare click e pop e rendere le transizioni più fluide.
*   **Automazione del Volume/Pan:** Possibilità di disegnare "buste" (automation envelopes) direttamente sulle tracce per controllare dinamicamente il volume e il bilanciamento stereo (panning) nel tempo.
*   **Raggruppamento di Clip:** Funzione per raggruppare più clip in modo da poterle spostare e modificare come un singolo oggetto.
*   **Ripple Edit (Editing a Catena):** Una modalità di editing in cui la modifica di una clip (es. accorciandola o spostandola) sposta automaticamente tutte le clip successive sulla timeline.

#### Categoria: Elaborazione Audio Avanzata

*   **Supporto per Plugin VST/AU:** Permettere agli utenti di caricare i propri plugin di effetti (VST, AU) di terze parti. Questa è una feature complessa ma fondamentale per un'utenza professionale.
*   **Analisi Audio in Tempo Reale:** Aggiungere un loudness meter (LUFS) e uno spettrogramma in tempo reale per un monitoraggio audio più accurato durante il mixaggio e il mastering.
*   **Registrazione Diretta:** Aggiungere la possibilità di registrare audio direttamente da un microfono all'interno dell'applicazione.

#### Categoria: Funzionalità Intelligenti (AI & Quality of Life)

*   **Editing basato sul Testo (Text-Based Editing):**
    1.  **Trascrizione Automatica:** Integrare un modello di trascrizione (potenzialmente un modello locale per evitare costi API, es. Whisper.cpp) per generare il testo dall'audio.
    2.  **Editing Sincronizzato:** Collegare il testo all'audio in modo che l'eliminazione di una parola nel testo tagli la porzione corrispondente di audio. Questa è una funzionalità rivoluzionaria per i podcaster.
*   **Rimozione Automatica dei Silenzi:** Uno strumento che rileva le pause più lunghe di una certa durata e permette all'utente di accorciarle o eliminarle con un solo click.
*   **Equalizzatore Adattivo (AI):** Una funzione che analizza una traccia vocale e suggerisce automaticamente una curva di equalizzazione per migliorarne la chiarezza e rimuovere frequenze problematiche.

#### Categoria: Miglioramenti UX/UI

*   **Template di Progetto:** Possibilità per gli utenti di salvare e caricare dei template di progetto (es. con tracce e effetti già impostati).
*   **Esportazione Multi-formato:** Aggiungere opzioni per esportare il file finale in diversi formati, come MP3 (con controllo del bitrate) e FLAC, oltre all'attuale WAV.
*   **Gestione Avanzata del File Bin:** Introdurre la possibilità di creare cartelle e organizzare meglio i file multimediali all'interno del File Bin.
