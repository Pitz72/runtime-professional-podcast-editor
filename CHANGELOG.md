# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Funzionalità "Auto-Leveling" per normalizzare il volume delle clip (in corso).
- Sistema di test con Vitest (in corso).

## [0.1.0] - 2024-07-31

Questa è la prima release stabile dopo una fase di refactoring e stabilizzazione.

### Added
- **Funzionalità di Editing Essenziali:**
  - Visualizzazione della forma d'onda per tutte le clip sulla timeline.
  - Possibilità di spostare le clip tramite drag-and-drop.
  - Possibilità di accorciare (trim) le clip tramite maniglie interattive.
  - Possibilità di dividere (split) una clip nel punto della testina di riproduzione.
  - Funzionalità per cancellare clip e intere tracce.
- **Sistema di Annulla/Ripeti (Undo/Redo):**
  - Implementato un sistema completo di cronologia delle azioni.
  - Aggiunti pulsanti nell'interfaccia e supporto per le scorciatoie da tastiera (`Ctrl+Z`, `Ctrl+Y`).
- **Preset Audio Migliorati:**
  - Aggiunto un preset "Podcast Music Bed" ottimizzato per la musica di sottofondo.
- **Documentazione:**
  - Creato il file `USER_GUIDE.md` per gli utenti finali.

### Changed
- **Architettura Stabile su Electron:**
  - Il progetto è stato consolidato per utilizzare esclusivamente Electron, rimuovendo la precedente configurazione per Tauri.
- **Sicurezza della Chiave API:**
  - La gestione della chiave API di Gemini è stata spostata dal frontend al processo `main` di Electron, prevenendone l'esposizione al client.
  - Creato un canale di comunicazione sicuro (IPC) per future interazioni con l'IA.

### Fixed
- Risolto un conflitto architetturale interno che manteneva configurazioni sia per Electron che per Tauri.
- Corretta la struttura dei componenti per passare correttamente le `props` necessarie alle funzionalità di editing.
