/**
 * AudioEngine.js - Motore audio basato su Web Audio API
 * Gestisce playback, mixer, routing audio e cache dei buffer.
 */

export class AudioEngine extends EventTarget {
  constructor(project) {
    super();
    this.project = project;
    this.audioContext = null;
    this.masterGain = null;
    this.isPlaying = false;
    this.currentTime = 0;
    this.playStartTime = 0; // Tempo del context, non del progetto
    this.pausedAt = 0; // Tempo del progetto
    this.activeSources = []; // Mantiene traccia delle sorgenti audio attive
    this.audioBufferCache = new Map();
    
    this.initializeAudioContext();
  }

  async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      
      if (this.audioContext.state === 'suspended') {
        console.log('AudioContext sospeso, sarà riattivato al primo play');
      }
      
      console.log('AudioEngine inizializzato, sample rate:', this.audioContext.sampleRate);
    } catch (error) {
      console.error('Errore nell\'inizializzazione AudioContext:', error);
      throw new Error('Web Audio API non supportata');
    }
  }

  // --- Gestione Playback ---

  async play() {
    if (this.isPlaying) return;

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.isPlaying = true;
      this.playStartTime = this.audioContext.currentTime;
      this.buildAndScheduleGraph();
      this.startPlaybackLoop();
      
      this.dispatchEvent(new CustomEvent('playStateChanged', { 
        detail: { isPlaying: true, currentTime: this.currentTime } 
      }));
      
      console.log('Playback avviato da:', this.formatTime(this.currentTime));
    } catch (error) {
      console.error('Errore durante play:', error);
      this.isPlaying = false;
    }
  }

  pause() {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.pausedAt = this.currentTime;
    this.stopAllSources();
    this.stopPlaybackLoop();
    
    this.dispatchEvent(new CustomEvent('playStateChanged', { 
      detail: { isPlaying: false, currentTime: this.currentTime } 
    }));
    
    console.log('Playback in pausa a:', this.formatTime(this.currentTime));
  }

  stop() {
    if (!this.isPlaying && this.currentTime === 0) return;

    this.isPlaying = false;
    this.stopAllSources();
    this.stopPlaybackLoop();
    this.currentTime = 0;
    this.pausedAt = 0;
    
    this.dispatchEvent(new CustomEvent('playStateChanged', { 
      detail: { isPlaying: false, currentTime: 0 } 
    }));
    
    console.log('Playback fermato');
  }

  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  seek(time) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.pause();
    
    this.currentTime = Math.max(0, time);
    this.pausedAt = this.currentTime;
    
    this.dispatchEvent(new CustomEvent('timeUpdate', { 
      detail: { currentTime: this.currentTime } 
    }));
    
    if (wasPlaying) this.play();
    
    console.log('Seek a:', this.formatTime(this.currentTime));
  }

  // --- Costruzione Grafo Audio ---

  buildAndScheduleGraph() {
    this.stopAllSources(); // Pulisce sorgenti precedenti
    const now = this.audioContext.currentTime;

    this.project.tracks.forEach(track => {
      if (track.muted) return;

      // Creare nodi per la traccia (gain, pan)
      const trackGain = this.audioContext.createGain();
      trackGain.gain.value = track.volume;
      const trackPanner = this.audioContext.createStereoPanner();
      trackPanner.pan.value = track.pan;

      trackGain.connect(trackPanner);
      trackPanner.connect(this.masterGain);

      track.clips.forEach(clip => {
        const buffer = this.audioBufferCache.get(clip.audioId);
        if (!buffer) return;

        const clipStartInTimeline = clip.startTime;
        const clipEndInTimeline = clip.startTime + clip.duration;

        // Se la clip è già finita, non la schedulare
        if (clipEndInTimeline <= this.currentTime) return;

        const when = now + Math.max(0, clipStartInTimeline - this.currentTime);
        const offset = Math.max(0, this.currentTime - clipStartInTimeline);
        const duration = Math.max(0, clip.duration - offset);

        if (duration <= 0) return;

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(trackGain);
        source.start(when, offset, duration);
        this.activeSources.push(source);
      });
    });
  }

  stopAllSources() {
    this.activeSources.forEach(source => source.stop());
    this.activeSources = [];
  }

  // --- Loop di aggiornamento UI ---

  startPlaybackLoop() {
    const update = () => {
      if (!this.isPlaying) return;
      const elapsed = this.audioContext.currentTime - this.playStartTime;
      this.currentTime = this.pausedAt + elapsed;
      
      this.dispatchEvent(new CustomEvent('timeUpdate', { 
        detail: { currentTime: this.currentTime } 
      }));
      
      this.playbackLoopId = requestAnimationFrame(update);
    };
    this.playbackLoopId = requestAnimationFrame(update);
  }

  stopPlaybackLoop() {
    if (this.playbackLoopId) {
      cancelAnimationFrame(this.playbackLoopId);
      this.playbackLoopId = null;
    }
  }

  // --- Gestione Buffer Audio ---

  cacheAudioBuffer(id, buffer) {
    this.audioBufferCache.set(id, buffer);
  }

  decodeAudioData(arrayBuffer) {
    return this.audioContext.decodeAudioData(arrayBuffer);
  }

  // --- Utilità ---

  setMasterVolume(value) {
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(value * value, this.audioContext.currentTime);
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  getCurrentTime() {
    return this.currentTime;
  }

  getFormattedTime() {
    return this.formatTime(this.currentTime);
  }

  dispose() {
    this.stop();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
