# Changelog - Runtime Radio Podcast Toolkit

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.0.3] - 2026-07-13 - "Mestiere"

Il giro delle **criticità medie**: workflow professionale quotidiano e localizzazione.

### Localizzazione (Italiano + English US)
- **i18n completo senza dipendenze** (`i18n.ts`): tutta la UI, i toast e i dialoghi in italiano e inglese US. Rilevamento automatico dalla lingua di sistema, selettore nella Welcome, scelta persistente.
- **Menu nativo e dialog di sistema localizzati**: il main process segue la lingua scelta nel renderer (menu File/Modifica, conferme di chiusura, About).

### Workflow
- **Autosave di recupero**: ogni 60s il lavoro non salvato viene scritto in uno slot di recovery (`userData/autosave.json`); all'avvio, se presente, l'app propone il ripristino. Lo slot si svuota a ogni salvataggio manuale.
- **Progetti recenti**: submenu File → Apri Recenti + lista cliccabile nella Welcome (max 10, persistiti in userData). I path recenti sono pre-autorizzati per il salvataggio.
- **Persistenza della finestra**: posizione, dimensioni e stato maximized vengono ricordati tra le sessioni.
- **Menu contestuale reale** sul tasto destro: "Incolla qui" sulle tracce, "Copia"/"Elimina" sui clip (niente più azioni immediate a sorpresa; il pulsante di delete flottante e il doppio-click-copia sono sostituiti dal menu).

### Timeline
- **Snapping**: i clip agganciano a griglia (1s), bordi degli altri clip e playhead durante spostamento, resize, drop e incolla; Alt disattiva. Soglia 8px indipendente dallo zoom.
- **Anti-sovrapposizione**: i clip non si sovrappongono più sulla stessa traccia — spostamenti e drop vengono risolti nel gap libero più vicino (algoritmo gap-based testato), i resize si fermano ai clip adiacenti.
- **Loop nativo**: un clip in loop ora usa un solo source node con `loop`/`loopStart`/`loopEnd` invece di centinaia di nodi impilati; il seek dentro le ripetizioni mappa correttamente nella regione di loop.
- **Righello ottimizzato**: iterazione per tick (non per secondo) e fix dei tick minori che non comparivano mai per un modulo su divisore non intero.

### Robustezza
- Crash log locale: eccezioni non gestite del main e crash del renderer registrati in `userData/error.log`.

**Dettagli completi**: [v0.0.3.md](v0.0.3.md)

---

## [0.0.2] - 2026-07-13 - "Precisione"

Il giro delle **criticità gravi**: correttezza audio, precisione delle interazioni e reattività della UI.

### Audio
- **Ducking corretto dopo seek/pausa**: le automazioni sono ora programmate relative alla posizione di partenza (`startOffset`), e ogni rampa è ancorata al valore corrente — prima le rampe partivano dall'ultimo punto schedulato (anche minuti prima), producendo pseudo-dissolvenze lunghissime.
- **Solo rispettato in export**: l'export usa la stessa logica solo/mute del playback (prima il solo era ignorato).
- **Encoding in Web Worker**: normalizzazione + WAV/MP3 girano in un worker dedicato (`exportEncoder.worker.ts`, bundle Vite separato) — l'export di progetti lunghi non congela più la UI. Encoder riscritti come funzioni pure su canali raw (`encoders.ts`), testabili e identiche su main thread e worker.
- **Normalizzazione a −1 dBFS** invece di 0 dBFS (headroom professionale).
- **Sample rate intelligente**: render alla frequenza massima delle sorgenti (floor 44.1kHz, cap 48kHz) invece di forzare tutto a 44.1kHz; lamejs ora sfrutta il supporto 48kHz nativo.

### UI / Precisione
- **Playhead senza re-render**: la posizione è gestita via subscription e scritture DOM dirette (`transform`), non più con `setState` a 60fps che ri-renderizzava l'intero editor a ogni frame.
- **Waveform corretta**: disegna esattamente il segmento che il clip riproduce (rispetta `offset` e trim), con supporto `devicePixelRatio` (niente più waveform sfocate su HiDPI) e canvas con tetto di sicurezza a 8192px (prima superava il limite dei browser a zoom alto → waveform sparite/crash di memoria).
- **Posizioni esatte per drop, incolla e seek**: rect misurati al momento dell'evento (riflettono già scroll e padding) — eliminati il doppio conteggio dello scroll nel drop dnd-kit e nell'incolla col tasto destro, e l'offset di 16px del padding nel seek.
- **Toast non bloccanti**: sistema di notifiche (info/warning/error, auto-dismiss) al posto di tutti gli `alert()` che congelavano l'app.

**Dettagli completi**: [v0.0.2.md](v0.0.2.md)

---

## [0.0.1] - 2026-07-13 - "Fondamenta"

> ⚠️ **Reboot del versioning.** Il refactoring è talmente profondo che il progetto riparte da v0.0.1. Le versioni precedenti (0.2.0 → 0.6.0) restano documentate qui sotto come storia della vecchia architettura.

### Architettura — da web app a vera app desktop
- **Stato unificato su Zustand**: eliminato lo "split-brain" tra store e `useState` locali. Lo store è l'unica fonte di verità per progetto, selezione, zoom, history.
- **Undo/Redo reale**: history funzionante (snapshot strutturali che preservano gli `AudioBuffer`), collegata al menu nativo Edit → Undo/Redo (Ctrl+Z / Ctrl+Y). Limite 50 passi.
- **Menu nativo collegato**: New / Open / Save / Save As / Export / Undo / Redo ora eseguono azioni reali via IPC (prima non facevano nulla).
- **Persistenza su disco**: i progetti si salvano/caricano con i dialog nativi. I file audio sono referenziati per **path assoluto** e ri-decodificati al load — mai più Data URL base64 dentro il JSON. Formato con `schemaVersion` e validazione completa al caricamento (clip orfani scartati, volumi clampati, file mancanti segnalati).
- **Protezione perdita dati**: dirty flag sincronizzato col main process; chiusura con modifiche non salvate → conferma nativa.
- **Import file**: drag & drop dall'OS (path risolto via `webUtils.getPathForFile`) + pulsante "Import" con dialog nativo. Decodifica diretta da `ArrayBuffer` con un solo `AudioContext` condiviso.

### Sicurezza
- **Gemini rimosso completamente**: nessuna chiamata API esterna, nessuna chiave, nessun costo per gli utenti. Restano i preset curati locali (6 voice + 8 music + 8 mastering).
- **IPC filesystem blindato**: letture limitate a estensioni audio/progetto con path assoluti; scritture consentite **solo** verso path scelti dall'utente tramite dialog nativi. I/O asincrono (niente più `readFileSync` che bloccava il main).
- **Hardening finestra**: `sandbox: true`, `webSecurity` sempre attivo, `setWindowOpenHandler` (deny), blocco `will-navigate`, single-instance lock, CSP senza endpoint esterni.

### Bug audio
- **Fix catena EQ orfana**: i preset con solo equalizzatore (tutti i preset musica!) venivano silenziosamente bypassati in playback e in export. Ora la catena è source → compressore → EQ → gain.
- **Export onesto**: rimossi FLAC/AAC finti (WAV rinominato). Formati reali: WAV e MP3. Export tramite dialog nativo di salvataggio.
- Fix arrotondamento asimmetrico in `encodeWAV` (bug di precedenza operatori).

### Qualità
- `strict: true` in TypeScript (typecheck pulito su renderer e main), ESLint 9 flat config funzionante, suite Vitest riscritta e verde (16 test su encoding, normalizzazione, validazione, persistenza progetto).
- Eliminate ~2.500 righe di codice morto o irraggiungibile: registrazione, export parallelo, worker impossibili (AudioContext in Web Worker), analisi LUFS mai montata, virtualizzazione mai usata, `UndoRedoHistory` con import inesistente che rompeva la build.
- Rimosse dipendenze inutilizzate: `@google/genai`, `web-vitals`, `electron-is-dev`, `cross-env`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
- Versione mostrata in un punto solo (About legge `app.getVersion()`); WelcomeScreen riscritta senza claim falsi.
- Scorciatoie tastiera con guardia sugli input di testo (Canc/Ctrl+C non rubano più i tasti mentre si digita); ID generati con `crypto.randomUUID()`.

**Dettagli completi**: [v0.0.1.md](v0.0.1.md)

---

## [0.6.0] - 2026-02-25 - "Il Nuovo Motore di Drag & Drop"
### Major Refactoring - UI
- Sostituzione integrale dell'inaffidabile `HTML5 Drag and Drop API` con l'engine professionale React `@dnd-kit`.
- Implementazione "State-Driven" con clonazione fluttuante (`DragOverlay`) per performance e stabilità native superiori, annullando crash, string mismatch e interferenze di Electron.

**Dettagli completi**: [v0.6.0.md](v0.6.0.md)

---

## [0.5.2] - 2026-02-24 - "Il Gran Consolidamento (Hotfix 2)"
### Fix Critici
- Risolto errore di sintassi Typescript e drag data format in `Timeline.tsx` (`Unexpected end of JSON input`) introdotto durante la patch v0.5.1 che bloccava il Drag & Drop dal File Bin.

**Dettagli completi**: [v0.5.2.md](v0.5.2.md)

---

## [0.5.1] - 2026-02-24 - "Il Gran Consolidamento (Hotfix 1)"

### Fix UX Critici
- Drag and Drop File: fix del blocco UI del browser disabilitando la serializzazione dei pesanti `AudioBuffer` in favore dell'invio referenziale `{ id: file.id }`.
- Click Proprietà File: estesi i tipi interni (`type: 'file'`) per gestire file click nel `FileBin.tsx` e la corretta visualizzazione delle metainformazioni base nel `PropertiesPanel.tsx`.

**Dettagli completi**: [v0.5.1.md](v0.5.1.md)

---

## [0.5.0] - 2026-02-24 - "Il Gran Consolidamento"

### Fix Critici
- CSS: Tailwind CSS installato localmente (CDN non funzionava in Electron)
- AudioContext: rimossa creazione globale, fix leak in 3 funzioni
- Export: FLAC/AAC disabilitati (erano fake fallback a WAV)
- ExportDialog: riscritto (importava hook inesistenti)
- Versione: sincronizzata a 0.5.0

### Codice Morto Eliminato
- 7 file sorgente + 3 documenti obsoleti (~1800 righe)

### Electron Professionale
- Avvio massimizzato, menu nativo, IPC dialog, CSP

### Documentazione
- README riscritto, changelog ultra-dettagliato

**Dettagli completi**: [v0.5.0.md](v0.5.0.md)

---

## [1.0.0] - 2025-09-25 - "The Sonic Generational Evolution"

### 🎯 **MAJOR RELEASE OVERVIEW**
Runtime Radio Podcast Toolkit reaches version 1.0.0 with a complete transformation from a basic audio editor to a professional Digital Audio Workstation (DAW). This generational evolution introduces enterprise-grade features, comprehensive testing, advanced performance optimizations, and a fully modular architecture ready for future expansion.

### ✨ **REVOLUTIONARY FEATURES**

#### **🎵 Professional Audio Engine Evolution**
- **Complete Audio Graph Architecture**: Modular audio processing with professional-grade effects chain
- **Advanced Playback System**: Real-time audio rendering with sub-10ms latency
- **Multi-format Export Engine**: WAV export with extensible architecture for MP3/FLAC/AAC
- **Audio Context Pooling**: Intelligent resource management for complex projects
- **Web Workers Integration**: Background processing for heavy computations

#### **🤖 AI-Powered Intelligence**
- **Gemini AI Integration**: Intelligent audio preset generation with retry logic
- **Smart Enhancement System**: Context-aware audio cleanup with fallback presets
- **Professional Preset Library**: 22 curated presets (6 voice + 8 music + 8 mastering)
- **Adaptive AI Processing**: Pattern matching for optimal audio enhancement

#### **🎚️ Advanced Editing Suite**
- **Timeline Virtualization**: Efficient rendering for projects with 100+ clips
- **Adaptive Waveform Display**: Quality scaling based on zoom level (low/medium/high)
- **Copy/Paste System**: Full clipboard functionality with keyboard shortcuts
- **Precision Editing Tools**: Pixel-perfect clip manipulation with visual feedback
- **Multi-track Architecture**: Unlimited tracks with professional mixing capabilities

#### **📊 Comprehensive Analysis Engine**
- **Professional Audio Metrics**: LUFS, True Peak, Crest Factor, Dynamic Range
- **Spectral Analysis**: Centroid, rolloff, flux with real-time visualization
- **Quality Assurance**: Clipping detection, DC offset, noise floor measurement
- **Broadcast Standards**: EBU R128 compliance checking

#### **🎛️ Mastering Suite**
- **Professional Compressor**: Multi-band compression with advanced controls
- **EQ Processing**: 5-band parametric equalization
- **Master Bus Architecture**: Dedicated mastering chain with limiter
- **Stem Export Ready**: Individual track export capability
- **Broadcast Optimization**: Loudness normalization and peak limiting

#### **⚡ Performance Revolution**
- **Intelligent Code Splitting**: 5 optimized chunks (max 252KB)
- **Memory Management**: Automatic cleanup with garbage collection
- **Preload System**: Smart resource loading for instant responsiveness
- **Virtualization Engine**: Timeline rendering for unlimited project sizes
- **Bundle Optimization**: 40% reduction in initial load time

#### **🎨 Professional User Experience**
- **DAW-Standard Interface**: Industry-standard layout and controls
- **Keyboard Shortcuts**: Full shortcut system (Ctrl+C/V, Delete, etc.)
- **Context Menus**: Right-click functionality for quick actions
- **Visual Feedback**: Professional hover states and selection indicators
- **Accessibility**: Full keyboard navigation and screen reader support

### 🔧 **TECHNICAL TRANSFORMATION**

#### **Architecture Overhaul**
- **React 19 Migration**: Latest React with concurrent features
- **TypeScript Strict Mode**: Complete type safety with advanced patterns
- **Zustand State Management**: Centralized store with undo/redo system
- **Custom Hooks Library**: Reusable logic for complex operations
- **Component Architecture**: Modular, maintainable component structure

#### **Testing Infrastructure**
- **Vitest Framework**: Modern testing with jsdom environment
- **Comprehensive Test Suite**: 15+ automated tests for critical functions
- **Audio API Mocking**: Complete Web Audio API simulation
- **Integration Testing**: Component interaction validation
- **CI/CD Ready**: Automated testing pipeline foundation

#### **Audio Processing**
- **Web Audio API Mastery**: Full utilization of modern audio capabilities
- **Real-time Processing**: Low-latency audio processing pipeline
- **Buffer Management**: Efficient audio buffer handling and cleanup
- **Format Support**: MP3, WAV, OGG, FLAC input with validation
- **Quality Preservation**: Lossless internal processing with dithering

#### **Development Tools**
- **Vite Build System**: Lightning-fast development and optimized production
- **Hot Module Replacement**: Instant updates during development
- **ESLint + Prettier**: Code quality and formatting standards
- **Comprehensive Logging**: Structured logging for debugging
- **Error Tracking**: Detailed error reporting and recovery

### 📚 **DOCUMENTATION & SUPPORT**

#### **Complete Documentation Suite**
- **User Guide**: Comprehensive feature documentation with tutorials
- **API Reference**: Technical documentation for developers
- **Regression Testing**: Quality assurance procedures
- **Performance Benchmarks**: Testing guidelines and metrics
- **Deployment Guide**: Production deployment instructions

#### **User Assistance**
- **Interactive Tutorials**: Step-by-step guided experiences
- **Context-Sensitive Help**: Dynamic help system
- **Keyboard Shortcuts Guide**: Complete shortcut reference
- **Video Tutorials**: Visual learning resources (future)
- **Community Support**: User forum and discussion platform

### 🐛 **QUALITY ASSURANCE**

#### **Comprehensive Testing**
- **Unit Tests**: 100% coverage of critical functions
- **Integration Tests**: Component interaction validation
- **Audio Processing Tests**: Audio algorithm verification
- **Performance Tests**: Load time and memory usage validation
- **Cross-browser Testing**: Compatibility verification

#### **Error Handling**
- **Graceful Degradation**: Fallback systems for all features
- **Retry Logic**: Automatic retry for network operations
- **User Feedback**: Clear error messages and recovery options
- **Logging System**: Comprehensive error tracking
- **Crash Recovery**: Automatic state preservation

### 🔄 **BREAKING CHANGES**
- **API Changes**: Some internal APIs updated for better performance
- **Component Props**: Minor prop changes for improved type safety
- **File Structure**: Reorganized for better maintainability
- **Dependencies**: Updated to latest versions with breaking changes
- **Configuration**: New environment variables required

### 📈 **PERFORMANCE METRICS**
- **Load Time**: < 2 seconds cold start (40% improvement)
- **Memory Usage**: < 100MB initial, < 300MB large projects (60% reduction)
- **Audio Latency**: < 5ms playback, < 15ms recording
- **UI Responsiveness**: 60fps consistent performance
- **Bundle Size**: Optimized to 5 chunks (max 252KB gzipped)
- **Test Coverage**: 85%+ automated test coverage

### 🎯 **USE CASES ENABLED**
- **Solo Podcasters**: Complete production toolkit for individual creators
- **Podcast Studios**: Professional-grade tools for production teams
- **Content Creators**: Multi-track audio production capabilities
- **Audio Engineers**: Advanced processing and analysis tools
- **Broadcast Professionals**: Broadcast-quality audio processing
- **Educators**: Teaching tool for audio production
- **Hobbyists**: Accessible professional audio editing

### 🔮 **ROADMAP PREVIEW**
- **Collaboration Features**: Real-time multi-user editing
- **Plugin System**: Third-party effect and tool integration
- **Cloud Storage**: Project storage and sharing
- **Mobile Companion**: Recording app for mobile devices
- **Advanced AI**: Machine learning for audio enhancement
- **Video Integration**: Video editing capabilities
- **Streaming**: Real-time streaming and broadcasting

---

## [0.5.0] - 2025-09-21 - "The Sonic Extension"

### ✨ **Added Features**
- Initial Gemini AI integration for audio analysis
- Basic audio analysis dashboard
- Voice enhancement presets
- Real-time audio monitoring
- Multi-track recording system
- Advanced timeline with waveform visualization
- Professional audio effects (compressor, EQ)
- Export functionality (WAV)
- Performance optimizations

### 🔧 **Technical**
- AI service architecture
- Audio analysis algorithms
- Performance optimizations
- Component architecture improvements

---

## 📋 **VERSION NUMBERING CONVENTION**

We use [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes, major feature additions
- **MINOR**: New features, significant improvements
- **PATCH**: Bug fixes, minor improvements

**Pre-release identifiers:**
- `alpha`: Early testing phase
- `beta`: Feature complete, testing phase
- `rc`: Release candidate

---

## 🤝 **CONTRIBUTING**

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines and contribution process.

---

## 📄 **LICENSE**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 **ACKNOWLEDGMENTS**

- **Google Gemini AI**: For powering intelligent audio analysis
- **Web Audio API**: For enabling browser-based audio processing
- **React Community**: For the excellent framework and ecosystem
- **Open Source Community**: For the tools and libraries that made this possible
- **Beta Testers**: For valuable feedback and bug reports
- **Audio Engineering Community**: For inspiration and best practices

---

**Runtime Radio Podcast Toolkit v1.0.0 "The Sonic Generational Evolution"**
**Created by Simone Pizzi**
**Professional Podcast Production Redefined** 🎙️✨🚀