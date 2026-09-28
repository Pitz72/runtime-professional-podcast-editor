# Regression Testing Guide — Runtime Radio Podcast Toolkit

**Target Version:** 0.0.3 "Mestiere"  
**Platform:** Windows Desktop Application (Electron + React 19 + TypeScript)  
**Quality Rule:** Every release must satisfy the gates below before merge or packaging.

---

## 🚦 1. Automated Verification Gates

Execute these three commands in order. All must exit with code 0:

```bash
# 1. Typecheck (Renderer + Main process)
npm run typecheck

# 2. Linting (Zero warnings permitted)
npm run lint

# 3. Unit & Integration Test Suite
npm run test:run
```

### Current Automated Test Coverage (31 Tests in `tests/audioUtils.test.ts`):
- [x] **WAV Encoding**: Correct 44-byte RIFF/WAVE header, byte sizing, and zero-length safety.
- [x] **Peak Normalization**: Peak target clamped to −1 dBFS (`NORMALIZE_TARGET_PEAK ≈ 0.8913`), silent audio preserved.
- [x] **Sample Rate Mapping**: Lamejs compatible sample rate mapping (up to 48 kHz).
- [x] **Linear Resampling**: Sample count calculation and downsampling interpolation.
- [x] **Segment Waveform Peak Computation**: Extracts peaks only for the active clip segment (`offset → offset + duration`).
- [x] **Timeline Snapping**: Snapping to grid (1s), clip boundaries, playhead, and positive time clamp.
- [x] **Anti-Overlap Engine**: Placement into closest available track gap, small-gap skipping, packing to track end.
- [x] **Resize Boundaries**: Clipping at neighboring clip start/end boundaries.
- [x] **File Validation**: File size caps (>2GB rejected, <1KB rejected), format detection.
- [x] **Project Serialization**: Roundtrip serialize/parse, exclusion of volatile `AudioBuffer` objects, rejection of invalid JSON, dropping orphan clips referencing non-existent files, volume clamping (0.0 to 1.0).

---

## 🏗️ 2. Build Pipeline Verification

Verify production compilation of both main and renderer processes:

```bash
# Compile Vite frontend bundle
npm run build:renderer

# Compile Electron main process (tsconfig.electron.json)
npm run build:main
```

Ensure the `dist/` directory contains:
- `dist/index.html`
- `dist/assets/main-*.js`
- `dist/assets/main-*.css`
- `dist/assets/exportEncoder.worker-*.js`
- `dist/main/main.cjs`
- `dist/main/preload.cjs`

---

## 🧪 3. Manual Desktop Smoke Test Checklist

Execute these manual tests on the running application (`npm run dev` or unpacked build):

### A. Window Lifecycle & Environment Memory
- [ ] **Launch**: App opens centered or maximized according to previous state.
- [ ] **Window State Memory**: Resize window to 1100x700, close app, reopen. Window opens at 1100x700.
- [ ] **Single Instance**: Attempting to launch a second instance focuses the existing window rather than opening duplicate processes.
- [ ] **Language Sync**: Change language to *Italiano* on the Welcome Screen. Verify:
  - Welcome labels change immediately.
  - Native application menus (`File`, `Modifica`, `Visualizza`, `Aiuto`) change immediately.
  - Close confirmation dialog appears in Italian.

### B. Project Persistence & Data Protection
- [ ] **New Project**: Click "Nuovo Progetto" — editor loads with 4 initial tracks (Music, Background, Voice 1, Sound FX).
- [ ] **Dirty Flag**: Add a clip or modify volume — title bar indicates unsaved changes.
- [ ] **Exit Confirmation**: Click the window close [✕] button with unsaved changes. The native dialog prompts to discard or cancel.
- [ ] **Save Project**: Press `Ctrl+S` — opens native Windows Save dialog. Save as `test_show.json`.
- [ ] **Recent Projects**: Close app, reopen. `test_show.json` appears in the "Progetti recenti" list and in `File → Apri Recenti`.
- [ ] **Crash Recovery Slot**:
  1. Open a project and make modifications.
  2. Wait 60 seconds (autosave interval).
  3. Force kill the app from Task Manager.
  4. Relaunch the app.
  5. The recovery dialog prompts: *"È stato trovato un backup automatico con modifiche non salvate. Vuoi recuperarlo?"*
  6. Click "Recupera" — workspace is restored with audio re-decoded from disk paths.

### C. File Bin & Drag-and-Drop
- [ ] **OS Drag & Drop**: Drag a WAV/MP3 file from Windows Explorer into the File Bin. File appears with name and duration.
- [ ] **Import Button**: Click `+ Importa` in File Bin. Select audio files via native dialog. Files load properly.
- [ ] **File Delete**: Hover over a file card and click [✕]. Associated clips on the timeline are cleanly removed without errors.

### D. Timeline Editing & DAW Ergonomics
- [ ] **Bin to Timeline**: Drag file from bin to Voice traccia. Clip appears at cursor position.
- [ ] **Magnetic Snapping**: Drag clip near 1s markers or other clip edges — clip snaps cleanly.
- [ ] **Alt Bypass**: Hold `Alt` while dragging — snapping is disabled for smooth sub-second positioning.
- [ ] **Anti-Overlap**: Drag a clip directly on top of another clip on the same track. Clip shifts to the nearest free gap.
- [ ] **Trimming**: Drag left/right handles of a clip. Waveform and playback adjust accordingly.
- [ ] **Loop Toggle**: In Properties panel, enable "Loop Clip" for a music track. Clip shows loop icon and repeats indefinitely.
- [ ] **Context Menu**:
  - Right-click on empty track space → "Incolla qui" appears.
  - Right-click on clip → "Copia clip" and "Elimina clip" appear.
- [ ] **Keyboard Shortcuts**:
  - Select clip + `Ctrl+C`, select track + `Ctrl+V`: Clip pasted at playhead time.
  - Select clip + `Delete`: Clip removed and pushed to undo history.
  - `Ctrl+Z` / `Ctrl+Y`: Reverts and reapplies timeline actions.

### E. Audio Engine & Ducking
- [ ] **Playback**: Click Play (or spacebar once implemented). Playhead moves smoothly at 60fps without UI stutter.
- [ ] **Automatic Ducking**: Place a voice clip overlapping a music clip. Start playback. Music volume smoothly ducks to 20% during voice and returns to normal afterwards.
- [ ] **Stop**: Clicking Stop halts audio and resets playhead to 0.

### F. Export Engine (Web Worker)
- [ ] **WAV Export**: Select WAV, click "Esporta". File renders in background worker, saves via native dialog, and plays cleanly in external media player.
- [ ] **MP3 Export**: Select MP3, click "Esporta". Worker encodes to 192kbps MP3 without freezing the UI.
- [ ] **Peak Headroom**: Analyze exported file in an external meter — peak does not exceed −1.0 dBFS.