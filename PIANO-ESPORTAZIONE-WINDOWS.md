# Piano di Lavoro: Da Applicazione Web a Eseguibile Windows 11 con Tauri

Questo documento serve come guida dettagliata per trasformare il progetto "Runtime Radio - Podcast Creation Kit" da un'applicazione web basata su React a un eseguibile nativo per Windows 11. Useremo [Tauri](https://tauri.app/) per questo processo, in quanto offre prestazioni superiori, maggiore sicurezza e un pacchetto finale più leggero rispetto ad alternative come Electron.

**Obiettivo Principale:** Creare un file `.exe` e un installer `.msi` stand-alone che funzionino su Windows 11, risolvendo la vulnerabilità critica legata alla chiave API di Gemini.

---

## Roadmap Dettagliata

Seguiremo i seguenti passi in ordine. Man mano che un'attività viene completata, la segneremo come tale.

### Fase 1: Setup e Verifica Iniziale

Questa fase assicura che l'ambiente di sviluppo sia correttamente configurato e che l'applicazione web funzioni come previsto.

- [x] **TASK-EXEC-001: Verificare i Prerequisiti di Sistema**
  - Assicurarsi che [Node.js](https://nodejs.org/) (versione LTS raccomandata) e un gestore di pacchetti (npm o yarn) siano installati.

- [x] **TASK-EXEC-002: Installare le Dipendenze del Progetto**
  - Aprire un terminale nella root del progetto ed eseguire il comando:
    ```bash
    npm install
    ```

- [x] **TASK-EXEC-003: Verificare il Funzionamento dell'App Web**
  - Eseguire il server di sviluppo locale con:
    ```bash
    npm run dev
    ```
  - Aprire il browser all'indirizzo fornito (solitamente `http://localhost:5173`) e confermare che la `WelcomeScreen` e l'`Editor` funzionino correttamente.

### Fase 2: Integrazione di Tauri

In questa fase integreremo Tauri nel progetto esistente.

- [ ] **TASK-EXEC-004: Installare i Prerequisiti per Tauri**
  - **Microsoft C++ Build Tools:** Necessari per la compilazione. Installarli tramite il Visual Studio Installer. [Guida Ufficiale](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
  - **Rust:** Il linguaggio usato per il backend di Tauri. Installarlo tramite `rustup-init.exe`. [Guida Ufficiale](https://www.rust-lang.org/tools/install).

- [ ] **TASK-EXEC-005: Aggiungere la CLI di Tauri**
  - Aggiungere il pacchetto della Command Line Interface di Tauri come dipendenza di sviluppo:
    ```bash
    npm install --save-dev @tauri-apps/cli
    ```

- [ ] **TASK-EXEC-006: Inizializzare Tauri nel Progetto**
  - Eseguire il comando di inizializzazione e seguire le istruzioni:
    ```bash
    npx tauri init
    ```
  - **Configurazione chiave durante l'init:**
    - *What is your app name?* -> `Runtime Radio`
    - *What should the window title be?* -> `Runtime Radio - Podcast Creation Kit`
    - *Where are your web assets located?* -> `dist` (la directory di output di Vite)
    - *What is the URL of your dev server?* -> `http://localhost:5173` (o l'URL mostrato da `npm run dev`)
  - Questo creerà una nuova directory `src-tauri` nel progetto.

### Fase 3: Migrazione Funzionalità Core a Tauri e Rust

Questa è la fase più critica. Sposteremo la logica sensibile e le interazioni con il sistema operativo dal frontend (JavaScript) al backend (Rust).

- [ ] **TASK-EXEC-007: [CRITICO] Spostare la Logica API Gemini su Rust**
  1.  **Rimuovere la chiave API dal frontend:** Cancellare la logica che carica `GEMINI_API_KEY` in `vite.config.ts`.
  2.  **Creare un comando Tauri in Rust:** Definire una funzione in `src-tauri/src/main.rs` che riceva un prompt dal frontend, chiami l'API di Gemini usando una crate Rust come `reqwest`, e restituisca il risultato.
  3.  **Gestire la Chiave API in Sicurezza:** La chiave API verrà letta da una variabile d'ambiente *solo* sul lato Rust, durante la compilazione o l'esecuzione, e non sarà mai esposta al frontend.
  4.  **Invocare il comando dal frontend:** Sostituire la chiamata diretta all'SDK di Gemini in TypeScript con una chiamata a `invoke('nome_del_comando_rust', { ... })` dall'API di Tauri.

- [ ] **TASK-EXEC-008: Configurare `tauri.conf.json`**
  - Aprire il file `src-tauri/tauri.conf.json` e configurare:
    - `"identifier"`: Un identificatore unico per l'applicazione (es. `com.runtime.podcast-editor`).
    - `"icon"`: Fornire un set di icone per l'applicazione.
    - `"allowlist"`: Configurare le API del sistema operativo a cui l'app può accedere (es. `fs` per il filesystem, `dialog` per le finestre di dialogo, `http` per le richieste di rete).

- [ ] **TASK-EXEC-009: Migrare API del Filesystem**
  - Sostituire la logica di caricamento/salvataggio dei file `.json` del progetto e l'esportazione dei file `.wav` con le API native di Tauri (`@tauri-apps/api/dialog` e `@tauri-apps/api/fs`). Questo garantirà finestre di dialogo native ("Apri File", "Salva File") e un'esperienza utente più fluida.

### Fase 4: Build e Testing Finale

- [ ] **TASK-EXEC-010: Compilare l'Applicazione**
  - Eseguire il comando di build di Tauri. Questo comando si occuperà di:
    1.  Compilare il frontend React con `vite build`.
    2.  Compilare il backend Rust.
    3.  Unire il tutto in un eseguibile e creare l'installer.
    ```bash
    npx tauri build
    ```
  - I file finali si troveranno in `src-tauri/target/release/bundle/`.

- [ ] **TASK-EXEC-011: Testare l'Eseguibile**
  - Copiare l'installer `.msi` su una macchina Windows 11 (preferibilmente una macchina virtuale pulita per un test accurato).
  - Eseguire l'installazione e avviare l'applicazione.
  - Verificare tutte le funzionalità: creazione progetto, caricamento, salvataggio, editing audio, export `.wav` e, soprattutto, la funzionalità basata su Gemini.

- [ ] **TASK-EXEC-012: Aggiornare la Documentazione**
  - Modificare il file `README.md` principale per includere le istruzioni su come compilare l'applicazione desktop per gli sviluppatori futuri.

---

### Fase 5: Pulizia

- [ ] **Cancellare questo file (`PIANO-ESPORTAZIONE-WINDOWS.md`)** una volta che tutti i task saranno stati completati con successo. 