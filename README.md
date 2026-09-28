<div align="center">
<img width="1200" height="475" alt="Runtime Radio Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🎙️ Runtime Radio Podcast Toolkit

**Version 0.0.3 "Mestiere"**

Desktop application for podcast production built with React 19, TypeScript, and Electron. Designed specifically for journalists, podcasters, and content creators to produce broadcast-quality audio locally, offline, and without audio engineering expertise.

---

## 🎯 Vision & Principles

The mission of Runtime Radio Podcast Toolkit is to allow anyone to create high-level podcast productions without having to master the technical complexities of sound engineering (compressor ratios, thresholds, or LUFS).

1. **Locale-First, Zero Cost**: 100% offline, running on the user's hardware. No cloud subscriptions, no external APIs.
2. **True Desktop App**: Native OS dialogs, system application menu, real disk paths, dirty-flag exit confirmation, and crash-recovery slots.
3. **Human Language**: Simple, intuitive controls rather than obscure acoustic jargon.
4. **Bilingual by Design**: Fully typed Italian and English (US) interface and native menus.
5. **Sacred User Work**: 50-step undo/redo, automatic crash-recovery backup every 60s, non-destructive workflows.
6. **Verifiable Quality**: Strict TypeScript, 0-warning ESLint, automated Vitest suite.

---

## ✨ Features (v0.0.3)

- **🎵 Multi-Track Timeline**:
  - Drag & drop audio from the File Bin directly onto Voice, Music, Background, and FX tracks via `@dnd-kit`.
  - **Magnetic Snapping**: Snap to 1s grid, clip boundaries, and playhead (hold `Alt` to bypass).
  - **Anti-Overlap Engine**: Automatic placement into nearest free gaps to prevent accidental track collisions.
  - **Native Looping**: Single-node audio looping with accurate segment seek support.
  - **Optimized Ruler**: Adaptive tick density and scale rendering.
- **🎚️ Audio Processing & Effects**:
  - Parametric EQ (High-pass, Low-pass, Peaking, High-shelf, Low-shelf) and dynamics compressor.
  - **Hardware-like Ducking**: Music and background automatically duck during speech with zero-lag scheduled ramps.
  - **22 Curated Presets**: 6 voice, 8 music, and 8 mastering presets.
- **📤 Export Engine**:
  - Offline mix rendering with background Web Worker encoding (`exportEncoder.worker.ts`) — the UI never freezes.
  - Output formats: **WAV** (lossless PCM) and **MP3** (via `lamejs`).
  - Professional peak normalization to **−1 dBFS** headroom.
- **💾 Workspace & Desktop Integration**:
  - **Crash-Recovery Slot**: Periodic autosave (`userData/autosave.json`) with startup restoration prompt.
  - **Recent Projects**: Quick access to recent `.json` projects from Welcome Screen and native `File → Open Recent`.
  - **Window Memory**: Bounds and maximized state remembered between sessions.
  - **Local Crash Log**: Uncaught exceptions logged locally to `userData/error.log`.
- **⌨️ Shortcuts & Context Menus**:
  - Context menu on right click: *Paste Here* on tracks; *Copy* and *Delete* on clips.
  - Keyboard shortcuts: `Ctrl+C` (Copy), `Ctrl+V` (Paste), `Delete` (Delete clip), with input protection.
  - System menu accelerators: `Ctrl+N`, `Ctrl+O`, `Ctrl+S`, `Ctrl+Shift+S`, `Ctrl+E`, `Ctrl+Z`, `Ctrl+Y`.
- **🌍 Internationalization (i18n)**:
  - Complete Italian and English (US) coverage across UI, toasts, dialogs, and native menus.

---

## ⚠️ Current Limitations

- **Clip Split**: Clips can currently be trimmed from both ends; splitting a clip at the playhead position (**S**) is scheduled for **v0.0.4**.
- **Fades**: Clip fade-in/fade-out handles and automatic 5ms micro-fades are scheduled for **v0.0.4**.
- **Mute/Solo Controls**: Implemented in engine and data model; visual [M] and [S] track buttons arrive in **v0.0.4**.
- **Loudness Compliance**: Currently normalized to -1 dBFS peak; ITU-R BS.1770-4 (-16 LUFS) targeting arrives in **v0.1.0**.
- **Memory Footprint**: Audio files are decoded in RAM. Best performance with files under 200MB until the streaming architecture arrives in **v0.2.0**.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **npm** 9+

### Development
```bash
git clone https://github.com/Pitz72/runtime-professional-podcast-editor.git
cd runtime-professional-podcast-editor
npm install
npm run dev
```

### Verification & Testing
```bash
npm run typecheck    # TypeScript strict check (renderer + main)
npm run lint         # ESLint (0 warnings allowed)
npm run test:run     # Vitest automated test suite (31 tests)
```

### Build Production Installer (Windows)
```bash
npm run build
# Output: builds/0.0.3/
```

---

## 🏗️ Architecture

```
src/
├── main/            # Electron main process (window, native menus, secure IPC, autosave slot)
│   ├── main.cts
│   └── preload.cts  # Sandboxed ContextBridge API
├── renderer/        # React UI (Vite + React 19 + Tailwind CSS)
│   ├── components/  # Timeline, Editor, Clip, PropertiesPanel, FileBin, Transport, etc.
│   ├── hooks/       # useAudioEngine, useClipClipboard, useKeyboardShortcuts, useWaveformData
│   ├── services/    # audioUtils, encoders, exportService, projectIO, timelineUtils
│   ├── workers/     # exportEncoder.worker.ts (off-thread WAV/MP3 encoding)
│   ├── i18n.ts      # Typed bilingual dictionaries (IT / EN)
│   ├── presets.ts   # Curated EQ and compressor presets
│   └── store.ts     # Unified Zustand store with 50-step undo/redo history
└── shared/          # Shared TypeScript models (Project schemaVersion 1)
```

### Tech Stack
| Layer | Technology | Version |
|---|---|---|
| **Desktop Platform** | Electron | 39.2.4 |
| **Frontend Framework** | React + TypeScript | React 19.1 / TS 5.8 |
| **Build & Bundling** | Vite | 6.2.0 |
| **Styling** | Tailwind CSS | 3.4.17 |
| **State & History** | Zustand | 5.0.8 |
| **Drag & Drop** | @dnd-kit/core | 6.3.1 |
| **Audio Processing** | Web Audio API + OfflineAudioContext | Native |
| **Encoding** | Web Worker + lamejs | 1.2.1 |
| **Testing** | Vitest | 3.2.4 |
| **Packaging** | electron-builder (NSIS) | 26.0.12 |

---

## 📖 Documentation

- **[Roadmap verso la v1.0](docs/ROADMAP.md)**: Progettazione e visione completa a 6 fasi.
- **[Changelog](docs/CHANGELOG.md)**: Cronologia dettagliata delle versioni.
- **[v0.0.3 "Mestiere"](docs/v0.0.3.md)**: Release note v0.0.3 (i18n, autosave, snapping, context menu).
- **[v0.0.2 "Precisione"](docs/v0.0.2.md)**: Release note v0.0.2 (worker export, ducking fix, playhead).
- **[v0.0.1 "Fondamenta"](docs/v0.0.1.md)**: Release note v0.0.1 (reboot da web app a vera app desktop).
- **[User Guide](docs/USER_GUIDE.md)**: Guida utente aggiornata.
- **[Regression Testing](docs/REGRESSION_TESTING.md)**: Checklist e procedure QA.

---

## 🗺️ Roadmap Sintetica

- **v0.0.4 "L'Attrezzatura"**: Split clip al playhead (**S**), Fade-in/Fade-out con micro-fade 5ms, pulsanti Mute/Solo visibili, barra spaziatrice per play/pausa, click-to-seek sul righello, rinomina traccia inline.
- **v0.1.0 "Il Suono Giusto"**: Normalizzazione conforme **ITU-R BS.1770-4** (-16 LUFS), funzione locale *"Migliora la Voce"*, Master Peak/VU Meter in linguaggio umano.
- **v0.2.0 "La Voce"**: Registrazione multitraccia integrata con scrittura su disco a chunk.
- **v0.3.0 "Le Parole"**: Trascrizione locale con Whisper.cpp, text-based editing, rimozione pause.
- **v0.4.0 "La Redazione"**: Template di puntata, capitoli ID3v2, metadati di pubblicazione.
- **v0.5.0 "La Distribuzione"**: Auto-updater, icona applicazione, installer rifinito.
- **v1.0.0**: Rilascio pubblico generale.

---

## 📄 License

MIT License — Created by **Simone Pizzi**

---

**Runtime Radio Podcast Toolkit v0.0.3 "Mestiere"** 🎙️
