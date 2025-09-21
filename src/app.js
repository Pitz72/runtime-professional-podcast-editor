/**
 * Runtime Radio v0.0.3 "Modularis" - Entry point principale
 * Inizializza l'applicazione e gestisce gli event listener di base
 */

import { Project } from './models/Project.js?v=0.0.3';
import { AudioEngine } from './audio/AudioEngine.js?v=0.0.3';
import { Timeline } from './ui/Timeline.js?v=0.0.3';
import { FileBin } from './ui/FileBin.js?v=0.0.3';
import { Transport } from './ui/Transport.js?v=0.0.3';
import { Properties } from './ui/Properties.js?v=0.0.3';
import { CommandManager } from './commands/CommandManager.js';
import { AddTrackCommand } from './commands/AddTrackCommand.js';
import { SplitClipCommand } from './commands/SplitClipCommand.js';

class RuntimeRadioApp {
  constructor() {
    this.project = new Project();
    this.audioEngine = new AudioEngine(this.project);
    this.commandManager = new CommandManager();

    // Inizializziamo prima Timeline e DOM della toolbar presente in index.html
    this.timeline = new Timeline(this.project, this.commandManager, document.getElementById('timeline'));
    this.fileBin = new FileBin(this.project, this.audioEngine, document.getElementById('dropzone'), document.getElementById('binList'));
    this.properties = new Properties(this.project, document.getElementById('propertiesContent'));

    // Inizializza Transport solo dopo il resto del DOM
    this.transport = new Transport(this.audioEngine, document.querySelector('.transport'));
    
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    console.log('Runtime Radio v0.0.4 "Foundation" inizializzato');
  }

  setupEventListeners() {
    // Toolbar principale
    document.getElementById('newProjectBtn').addEventListener('click', () => this.newProject());
    document.getElementById('openProjectBtn').addEventListener('click', () => this.openProject());
    document.getElementById('saveProjectBtn').addEventListener('click', () => this.saveProject());

    // Aggiungi traccia per tipo (+)
    const addBtn = document.getElementById('addTrackBtn');
    const addSel = document.getElementById('addTrackType');
    if (addBtn && addSel) {
      addBtn.addEventListener('click', () => {
        const type = addSel.value;
        this.commandManager.execute(new AddTrackCommand(this.project, type));
      });
    }

    // Volume Master
    const master = document.getElementById('masterVolume');
    if (master) {
      master.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (!Number.isNaN(val)) this.audioEngine.setMasterVolume(val);
      });
    }
    
    // Event listener per comunicazione tra componenti
    this.project.addEventListener('projectChanged', () => {
      this.timeline.render();
      this.properties.render();
    });
    
    this.timeline.addEventListener('selectionChanged', (e) => {
      this.properties.showSelection(e.detail);
    });

    // Riordino tracce via drag & drop dalla Timeline
    this.timeline.addEventListener('reorderRequested', (e) => {
      const { fromIndex, toIndex } = e.detail || {};
      if (typeof fromIndex === 'number' && typeof toIndex === 'number') {
        this.project.reorderTracks(fromIndex, toIndex);
      }
    });

    // Seek su click in timeline
    this.timeline.addEventListener('seekRequested', (e) => {
      const { time } = e.detail || {};
      if (typeof time === 'number') {
        this.audioEngine.seek(time);
      }
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Evita conflitti quando si scrive in input/textarea
      if (e.target.matches('input, textarea, [contenteditable]')) return;
      
      // Undo/Redo
      if (e.ctrlKey && e.code === 'KeyZ') {
        e.preventDefault();
        this.commandManager.undo();
        return;
      }
      if (e.ctrlKey && e.code === 'KeyY') {
        e.preventDefault();
        this.commandManager.redo();
        return;
      }

      switch (e.code) {
        case 'KeyN':
          if (e.ctrlKey) { e.preventDefault(); this.newProject(); }
          break;
        case 'KeyO':
          if (e.ctrlKey) { e.preventDefault(); this.openProject(); }
          break;
        case 'KeyS':
          if (e.ctrlKey) { e.preventDefault(); this.saveProject(); }
          break;
        case 'Space':
          e.preventDefault();
          this.transport.togglePlayPause();
          break;
        case 'Equal': // Ctrl+= per aggiungere traccia del tipo selezionato
          if (e.ctrlKey) {
            e.preventDefault();
            const sel = document.getElementById('addTrackType');
            if (sel) {
              this.commandManager.execute(new AddTrackCommand(this.project, sel.value));
            }
          }
          break;
      }
    });
  }

  newProject() {
    if (confirm('Creare un nuovo progetto? I cambiamenti non salvati andranno persi.')) {
      this.project.clear();
      this.audioEngine.stop();
      console.log('Nuovo progetto creato');
    }
  }

  async openProject() {
    try {
      const fileHandle = await window.showOpenFilePicker({
        types: [{ description: 'Runtime Radio Project', accept: { 'application/json': ['.json'] } }]
      });
      const file = await fileHandle[0].getFile();
      const data = JSON.parse(await file.text());
      await this.project.loadFromData(data);
      console.log('Progetto caricato:', file.name);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Errore nel caricamento del progetto:', err);
        alert('Errore nel caricamento del progetto. Verificare il formato del file.');
      }
    }
  }

  async saveProject() {
    try {
      const data = this.project.serialize();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      
      if (window.showSaveFilePicker) {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: `runtime-radio-project-${new Date().toISOString().slice(0, 10)}.json`,
          types: [{ description: 'Runtime Radio Project', accept: { 'application/json': ['.json'] } }]
        });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        // Fallback per browser senza File System Access API
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `runtime-radio-project-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      console.log('Progetto salvato');
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Errore nel salvataggio:', err);
        alert('Errore nel salvataggio del progetto.');
      }
    }
  }
}

// Inizializza l'app quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
  window.runtimeRadio = new RuntimeRadioApp();
});