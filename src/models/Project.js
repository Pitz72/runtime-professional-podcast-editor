/**
 * Project.js - Modello principale del progetto Runtime Radio
 * Gestisce tracce, clip, stato del progetto e serializzazione
 */

export class Project extends EventTarget {
  constructor() {
    super();
    this.tracks = [];
    this.name = 'Nuovo Progetto';
    this.duration = 300; // 5 minuti di default
    this.sampleRate = 44100;
    this.version = '0.0.2';
    
    this.initializeDefaultTracks();
  }

  initializeDefaultTracks() {
    this.tracks = [
      { id: 'music', name: 'Music', type: 'music', clips: [], volume: 0.7, pan: 0, muted: false, solo: false },
      { id: 'background', name: 'Background', type: 'background', clips: [], volume: 0.5, pan: 0, muted: false, solo: false },
      { id: 'voice', name: 'Voice', type: 'voice', clips: [], volume: 1.0, pan: 0, muted: false, solo: false },
      { id: 'fx', name: 'FX', type: 'fx', clips: [], volume: 0.8, pan: 0, muted: false, solo: false }
    ];
  }

  addTrack(type) {
    const allowed = ['voice', 'music', 'background', 'fx'];
    const t = (type || '').toLowerCase();
    if (!allowed.includes(t)) {
      console.warn('Tipo traccia non valido:', type);
      return null;
    }
    const count = this.tracks.filter(tr => tr.type === t).length;
    const nameMap = { voice: 'Voice', music: 'Music', background: 'Background', fx: 'FX' };
    const name = count === 0 ? nameMap[t] : `${nameMap[t]} ${count + 1}`;
    const idBase = t;
    let id = idBase;
    // Evita collisioni ID con quelli di default
    if (this.tracks.some(tr => tr.id === id)) {
      id = `${idBase}-${Date.now().toString(36).slice(5)}`;
    }
    const newTrack = { id, name, type: t, clips: [], volume: 1.0, pan: 0, muted: false, solo: false };
    this.tracks.push(newTrack);
    this.dispatchEvent(new CustomEvent('projectChanged', { detail: { type: 'trackAdded', track: newTrack } }));
    return newTrack;
  }

  reorderTracks(fromIndex, toIndex) {
    const len = this.tracks.length;
    if (fromIndex < 0 || fromIndex >= len || toIndex < 0 || toIndex >= len) return;
    if (fromIndex === toIndex) return;
    const [moved] = this.tracks.splice(fromIndex, 1);
    this.tracks.splice(toIndex, 0, moved);
    this.dispatchEvent(new CustomEvent('projectChanged', { detail: { type: 'tracksReordered', fromIndex, toIndex } }));
  }

  removeTrack(trackId) {
    const index = this.tracks.findIndex(t => t.id === trackId);
    if (index !== -1) {
      const [removedTrack] = this.tracks.splice(index, 1);
      this.dispatchEvent(new CustomEvent('projectChanged', { detail: { type: 'trackRemoved', trackId, removedTrack } }));
      return removedTrack;
    }
    return null;
  }

  addClip(trackId, clip) {
    const track = this.tracks.find(t => t.id === trackId);
    if (track) {
      clip.id = this.generateClipId();
      clip.trackId = trackId; // Assicura che la clip abbia sempre il riferimento alla sua traccia
      track.clips.push(clip);
      this.dispatchEvent(new CustomEvent('projectChanged', { detail: { type: 'clipAdded', trackId, clip } }));
    }
  }

  removeClip(trackId, clipId) {
    const track = this.tracks.find(t => t.id === trackId);
    if (track) {
      const index = track.clips.findIndex(c => c.id === clipId);
      if (index !== -1) {
        track.clips.splice(index, 1);
        this.dispatchEvent(new CustomEvent('projectChanged', { detail: { type: 'clipRemoved', trackId, clipId } }));
      }
    }
  }

  updateTrackProperty(trackId, property, value) {
    const track = this.tracks.find(t => t.id === trackId);
    if (track && Object.prototype.hasOwnProperty.call(track, property)) {
      track[property] = value;
      this.dispatchEvent(new CustomEvent('projectChanged', { detail: { type: 'trackUpdated', trackId, property, value } }));
    }
  }

  updateClipProperty(clipId, property, value) {
    for (const track of this.tracks) {
      const clip = track.clips.find(c => c.id === clipId);
      if (clip) {
        clip[property] = value;
        this.dispatchEvent(new CustomEvent('projectChanged', { detail: { type: 'clipUpdated', clipId, property, value } }));
        return;
      }
    }
  }

  generateClipId() {
    return 'clip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  clear() {
    this.name = 'Nuovo Progetto';
    this.initializeDefaultTracks();
    this.dispatchEvent(new CustomEvent('projectChanged', { detail: { type: 'cleared' } }));
  }

  serialize() {
    return {
      version: this.version,
      name: this.name,
      duration: this.duration,
      sampleRate: this.sampleRate,
      tracks: this.tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => ({ // Clip non contengono più audio data, solo riferimenti
          id: clip.id,
          name: clip.name,
          audioId: clip.audioId,
          startTime: clip.startTime,
          duration: clip.duration,
          volume: clip.volume || 1.0,
          fadeIn: clip.fadeIn || 0,
          fadeOut: clip.fadeOut || 0
        }))
      })),
      createdAt: new Date().toISOString()
    };
  }

  async loadFromData(data) {
    // Validazione versione
    if (!data.version || data.version !== this.version) {
      console.warn('Versione progetto diversa, potrebbero esserci incompatibilità');
    }

    this.name = data.name || 'Progetto Importato';
    this.duration = data.duration || 300;
    this.sampleRate = data.sampleRate || 44100;
    
    if (data.tracks && Array.isArray(data.tracks)) {
      this.tracks = data.tracks;
      
      // Garantire che le proprietà esistano
      for (const track of this.tracks) {
        if (typeof track.pan !== 'number') track.pan = 0;
      }
    }

    this.dispatchEvent(new CustomEvent('projectChanged', { detail: { type: 'loaded' } }));
  }

  getTrack(trackId) {
    return this.tracks.find(t => t.id === trackId);
  }

  getAllClips() {
    return this.tracks.flatMap(track => 
      track.clips.map(clip => ({ ...clip, trackId: track.id }))
    );
  }

  getDurationInSamples() {
    return Math.floor(this.duration * this.sampleRate);
  }
}