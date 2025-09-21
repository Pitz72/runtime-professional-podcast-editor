/**
 * Transport.js - Controlli di trasporto (play/pause/stop) e timecode
 */
export class Transport {
  constructor(audioEngine, container) {
    this.audioEngine = audioEngine;
    this.container = container;

    // Attendere che il DOM sia ready (soluzione più robusta)
    setTimeout(() => this.initializeElements(), 0);
  }

  initializeElements() {
    // Preferisci cercare dentro il container per evitare problemi di timing
    const scope = this.container || document;
    this.btnPlay = scope.querySelector('#playBtn');
    this.btnStop = scope.querySelector('#stopBtn');
    this.timecodeEl = scope.querySelector('#timecode');

    console.log('Transport elements found:', {
      play: this.btnPlay,
      stop: this.btnStop,
      timecode: this.timecodeEl
    });

    this.attachEvents();
  }

  attachEvents() {
    // Se audioEngine non è ancora pronto, attendere
    if (!this.audioEngine || !this.audioEngine.addEventListener) {
      console.error('AudioEngine non disponibile per Transport');
      return;
    }

    // Aggiungere listeners solo se gli elementi esistono
    if (this.btnPlay) {
      this.btnPlay.addEventListener('click', () => this.togglePlayPause());
    } else {
      console.warn('Pulsante Play non trovato');
    }

    if (this.btnStop) {
      this.btnStop.addEventListener('click', () => this.audioEngine.stop());
    } else {
      console.warn('Pulsante Stop non trovato');
    }

    // Eventi AudioEngine
    this.audioEngine.addEventListener('timeUpdate', (e) => {
      if (this.timecodeEl) {
        this.timecodeEl.textContent = this.audioEngine.getFormattedTime();
      }
    });

    this.audioEngine.addEventListener('playStateChanged', (e) => {
      if (this.timecodeEl) {
        this.timecodeEl.textContent = this.audioEngine.getFormattedTime();
      }
    });
  }

  togglePlayPause() {
    if (this.audioEngine) {
      this.audioEngine.togglePlayPause();
    }
  }
}