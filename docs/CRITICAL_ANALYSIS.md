# Analisi Critica e Roadmap Evolutiva: Runtime Radio Podcast Toolkit

**Data:** 30 Novembre 2025
**Stato Attuale:** Prototipo Avanzato / MVP (Minimum Viable Product)
**Obiettivo:** Applicazione Professionale (DAW)

Questo documento fornisce un'analisi severa e realistica dello stato attuale del progetto, evidenziando le criticità che impediscono all'applicazione di essere considerata "Enterprise-Grade" o veramente professionale, e propone soluzioni concrete.

---

## 🚨 Criticità Bloccanti (Severity: HIGH)

Questi problemi rendono l'applicazione inadatta all'uso professionale per progetti reali di lunga durata (es. podcast di 1+ ore).

### 1. "Fake" Virtualization & Scalabilità UI
- **Problema**: La documentazione vanta una "Advanced Timeline Virtualization", ma il codice (`Timeline.tsx`) renderizza **tutti** i clip nel DOM.
- **Conseguenza**: Con un progetto di 1 ora e centinaia di tagli, il DOM avrà migliaia di nodi. Il browser diventerà lento, laggoso e potrebbe crashare. L'interfaccia diventerà inutilizzabile per editing di precisione.
- **Soluzione**: Implementare una vera virtualizzazione (es. `react-window` o logica custom) che renderizza *solo* i clip visibili nella viewport corrente.

### 2. Gestione Memoria Audio (Il "Muro" della RAM)
- **Problema**: L'applicazione carica l'intero file audio decodificato in memoria (`AudioBuffer`).
- **Conseguenza**: Un podcast di 1 ora in WAV stereo 44.1kHz occupa circa 600MB di RAM grezza. Con undo/redo history, copie, e multiple tracce, si raggiunge rapidamente il limite di memoria del tab del browser (spesso ~2-4GB), causando il crash "Aw, Snap!".
- **Soluzione**: Non si può caricare tutto in RAM. Serve un approccio **Streaming** o **Chunking**. L'audio deve essere caricato/decodificato on-demand dal disco (FileSystem Access API) o gestito tramite `AudioWorklet` che streamma solo i dati necessari.

### 3. Feature "Fantasma" (Trust Killer)
- **Problema**: L'interfaccia promette esportazione FLAC e AAC, ma il codice fa silenziosamente fallback su WAV.
- **Conseguenza**: Un professionista che scarica un file aspettandosi un FLAC e riceve un WAV rinominato (o peggio) perderà immediatamente fiducia nel tool.
- **Soluzione**: Rimuovere le opzioni dall'UI finché non sono implementate, oppure integrare encoder reali (es. versioni WASM di `libflac` e `fdk-aac`).

### 4. Elaborazione Audio nel Main Thread
- **Problema**: Gran parte della logica di composizione del grafo audio avviene nel main thread o dipende dalla reattività di React.
- **Conseguenza**: Durante operazioni pesanti di UI (zoom, scroll veloce), l'audio potrebbe "singhiozzare" (glitch) perché il thread principale è bloccato.
- **Soluzione**: Spostare l'intero motore audio in un `AudioWorklet` dedicato e usare `SharedArrayBuffer` per la comunicazione, disaccoppiando completamente l'audio dall'UI.

---

## ⚠️ Debito Tecnico e Architetturale (Severity: MEDIUM)

### 1. Struttura del Progetto "Amatoriale"
- **Problema**: File sorgente nella root, mix di configurazione e codice.
- **Soluzione**: Standardizzare la struttura (`src/components`, `src/services`, `src/hooks`, `src/utils`, `public/`).

### 2. Testing UI Inesistente
- **Problema**: Ci sono unit test (presumibilmente), ma mancano test E2E (Playwright/Cypress) che simulino un flusso di lavoro reale.
- **Soluzione**: Implementare test che verifichino: Import -> Edit -> Export.

### 3. Dipendenza da Librerie Legacy
- **Problema**: Uso di `lamejs` (ultima release anni fa, lento in JS puro).
- **Soluzione**: Passare a implementazioni WebAssembly (WASM) per encoding MP3/LAME, che sono 10-20x più veloci e stabili.

---

## 🚀 Roadmap per l'Evoluzione Professionale

Per trasformare questo MVP in un competitor di strumenti come Descript o Audacity Web, serve un cambio di paradigma.

### Fase 1: Consolidamento Core (1-2 Mesi)
1.  **Refactoring Strutturale**: Spostare tutto in `src/`.
2.  **Fix Virtualizzazione**: Implementare rendering condizionale nella Timeline.
3.  **Onestà UI**: Disabilitare export FLAC/AAC.
4.  **WASM Encoder**: Sostituire `lamejs` con `vmsg` o build WASM di LAME.

### Fase 2: Scalabilità & Performance (2-3 Mesi)
1.  **Audio Streaming Engine**: Riscrivere l'engine per non dipendere da `AudioBuffer` completi. Usare `FileSystemFileHandle` per leggere chunk dal disco on-demand.
2.  **Off-Main-Thread Architecture**: Spostare la logica di mixing e processing interamente in Worker/Worklet.

### Fase 3: Feature Professionali (3+ Mesi)
1.  **Analisi Spettrale Reale**: Implementare FFT in tempo reale su Canvas (non DOM) per visualizzare lo spettro.
2.  **Plugin System**: Permettere l'uso di plugin VST3 (via porting WASM) o un formato proprietario JS.
3.  **Cloud Sync**: Integrazione reale con storage cloud per backup e collaborazione.

## 💡 Conclusione

Il progetto ha un'ottima base concettuale e un'interfaccia promettente ("The Sonic Generational Evolution"). Tuttavia, **sotto il cofano, è ancora un giocattolo tecnologico**. Le limitazioni di memoria e rendering attuali impediscono l'uso per podcast professionali lunghi.

La priorità assoluta non è aggiungere feature (AI, effetti), ma **risolvere la scalabilità** (Virtualizzazione UI + Streaming Audio). Senza queste basi, il software crollerà sotto il peso di un progetto reale.
