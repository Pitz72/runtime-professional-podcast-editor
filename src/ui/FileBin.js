/**
 * FileBin.js - Gestione area drag & drop dei file audio
 */
export class FileBin {
  constructor(project, audioEngine, dropzoneEl, listEl) {
    this.project = project;
    this.audioEngine = audioEngine;
    this.dropzoneEl = dropzoneEl;
    this.listEl = listEl;

    this.initDropzone();
  }

  initDropzone() {
    this.dropzoneEl.addEventListener('click', () => {
      document.getElementById('file-input').click();
    });

    document.getElementById('file-input').addEventListener('change', (e) => {
      this.handleFiles(e.target.files);
      e.target.value = '';
    });

    ['dragenter', 'dragover'].forEach(evt => {
      this.dropzoneEl.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropzoneEl.style.background = 'linear-gradient(135deg, #262626 0%, #1f1f1f 100%)';
        this.dropzoneEl.style.borderColor = '#525252';
      });
    });

    ;['dragleave', 'drop'].forEach(evt => {
      this.dropzoneEl.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropzoneEl.style.background = 'linear-gradient(135deg, #1f1f1f 0%, #1a1a1a 100%)';
        this.dropzoneEl.style.borderColor = '#404040';
      });
    });

    this.dropzoneEl.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      this.handleFiles(files);
    });
  }

  async handleFiles(fileList) {
    const files = Array.from(fileList).filter(f => f.type.startsWith('audio/'));
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      try {
        const audioBuffer = await this.audioEngine.decodeAudioData(arrayBuffer);
        const audioId = `audio_${Date.now()}`;
        this.audioEngine.cacheAudioBuffer(audioId, audioBuffer);

        const item = { 
          id: crypto.randomUUID(), 
          name: file.name, 
          duration: audioBuffer.duration,
          audioId: audioId
        };
        this.addToList(item);
      } catch (error) {
        console.error(`Errore nella decodifica del file ${file.name}:`, error);
        alert(`Non è stato possibile decodificare il file: ${file.name}`);
      }
    }
  }

  addToList(item) {
    const li = document.createElement('li');
    li.className = 'bin-item';
    li.innerHTML = `
      <span>${item.name} (${item.duration.toFixed(2)}s)</span>
      <button data-id="${item.id}">Aggiungi a Voice</button>
    `;

    li.querySelector('button').addEventListener('click', () => {
      this.project.addClip('voice', {
        name: item.name,
        startTime: 0,
        duration: item.duration,
        audioId: item.audioId,
        volume: 1.0
      });
    });

    this.listEl.appendChild(li);
  }
}