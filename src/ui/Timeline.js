import { MoveClipCommand } from '../commands/MoveClipCommand.js';
import { ResizeClipCommand } from '../commands/ResizeClipCommand.js';

/**
 * Timeline.js - Visualizzazione timeline con tracce e clip interattive
 */
export class Timeline extends EventTarget {
  constructor(project, commandManager, container) {
    super();
    this.project = project;
    this.commandManager = commandManager;
    this.container = container;
    this.timeScaleEl = document.getElementById('timeScale');
    this.container.tabIndex = 0;

    this.container.addEventListener('click', (e) => this.onTimelineClick(e));

    this.render();
  }

  render() {
    const projectDuration = this.project.duration;
    this.renderTimeScale();

    this.container.innerHTML = '';
    this.project.tracks.forEach((track, index) => {
      const row = this.createTrackRow(track, index);
      const clipsContainer = row.querySelector('.clips-container');

      track.clips.forEach(clip => {
        const clipEl = this.createClipElement(clip, projectDuration);
        clipsContainer.appendChild(clipEl);
      });

      this.container.appendChild(row);
    });
  }

  createTrackRow(track, index) {
    const row = document.createElement('div');
    row.className = 'track-row';
    row.dataset.trackId = track.id;
    row.dataset.index = String(index);
    row.draggable = true;

    const handle = document.createElement('div');
    handle.className = 'track-handle';
    handle.title = 'Trascina per riordinare le tracce';
    row.appendChild(handle);

    const label = document.createElement('div');
    label.textContent = track.name;
    label.className = 'track-label';
    row.appendChild(label);

    const clipsContainer = document.createElement('div');
    clipsContainer.className = 'clips-container';
    row.appendChild(clipsContainer);

    this.addTrackEventListeners(row, track, index);
    return row;
  }

  createClipElement(clip, projectDuration) {
    const clipEl = document.createElement('div');
    clipEl.className = 'timeline-clip';
    clipEl.textContent = clip.name;
    clipEl.dataset.clipId = clip.id;
    clipEl.draggable = true;

    const left = (clip.startTime / projectDuration) * 100;
    const width = (clip.duration / projectDuration) * 100;
    clipEl.style.left = `${left}%`;
    clipEl.style.width = `${width}%`;

    const leftHandle = document.createElement('div');
    leftHandle.className = 'clip-resize-handle left';
    clipEl.appendChild(leftHandle);

    const rightHandle = document.createElement('div');
    rightHandle.className = 'clip-resize-handle right';
    clipEl.appendChild(rightHandle);

    this.addClipEventListeners(clipEl, clip, leftHandle, rightHandle);
    return clipEl;
  }

  addTrackEventListeners(row, track, index) {
    row.addEventListener('click', (ev) => {
      if (ev.target.classList.contains('track-handle') || ev.target.classList.contains('timeline-clip')) return;
      this.dispatchEvent(new CustomEvent('selectionChanged', { detail: { type: 'track', track } }));
    });

    row.addEventListener('dragstart', (ev) => {
      if (!ev.target.classList.contains('track-row')) return;
      ev.dataTransfer.effectAllowed = 'move';
      ev.dataTransfer.setData('text/plain', String(index));
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => row.classList.remove('dragging'));
    row.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
    row.addEventListener('drop', (ev) => {
      ev.preventDefault();
      row.classList.remove('drag-over');
      const fromIndex = parseInt(ev.dataTransfer.getData('text/plain'), 10);
      const toIndex = parseInt(row.dataset.index, 10);
      if (!Number.isNaN(fromIndex) && !Number.isNaN(toIndex)) {
        this.dispatchEvent(new CustomEvent('reorderRequested', { detail: { fromIndex, toIndex } }));
      }
    });
  }

  addClipEventListeners(clipEl, clip, leftHandle, rightHandle) {
    let dragStartX = 0;
    let originalStartTime = 0;
    let originalDuration = 0;

    clipEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('selectionChanged', { detail: { type: 'clip', clip, trackId: clip.trackId } }));
    });

    // --- Move Clip Logic ---
    clipEl.addEventListener('dragstart', (e) => {
      if (e.target !== clipEl) return;
      e.stopPropagation();
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', clip.id);
      dragStartX = e.clientX;
      originalStartTime = clip.startTime;
      clipEl.style.opacity = '0.5';
    });

    clipEl.addEventListener('dragend', (e) => {
      if (e.target !== clipEl) return;
      e.stopPropagation();
      clipEl.style.opacity = '1';

      const dx = e.clientX - dragStartX;
      const timelineWidth = this.container.getBoundingClientRect().width;
      const deltaTime = (dx / timelineWidth) * this.project.duration;
      const newStartTime = Math.max(0, originalStartTime + deltaTime);

      if (newStartTime !== originalStartTime) {
        const command = new MoveClipCommand(this.project, clip.id, newStartTime, originalStartTime);
        this.commandManager.execute(command);
      }
    });

    // --- Resize Logic ---
    const addResizeListener = (handle, direction) => {
      handle.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = 'col-resize';
        dragStartX = e.clientX;
        originalStartTime = clip.startTime;
        originalDuration = clip.duration;
        clipEl.style.opacity = '0.5';
      });

      handle.addEventListener('dragend', (e) => {
        e.stopPropagation();
        clipEl.style.opacity = '1';

        const dx = e.clientX - dragStartX;
        const timelineWidth = this.container.getBoundingClientRect().width;
        const deltaTime = (dx / timelineWidth) * this.project.duration;

        let newStart = originalStartTime;
        let newDuration = originalDuration;

        if (direction === 'left') {
          newStart = Math.max(0, originalStartTime + deltaTime);
          newDuration = Math.max(0.1, originalDuration - (newStart - originalStartTime));
        } else { // right
          newDuration = Math.max(0.1, originalDuration + deltaTime);
        }

        if (newStart !== originalStartTime || newDuration !== originalDuration) {
          const command = new ResizeClipCommand(this.project, clip.id, newStart, newDuration, originalStartTime, originalDuration);
          this.commandManager.execute(command);
        }
      });
    };

    addResizeListener(leftHandle, 'left');
    addResizeListener(rightHandle, 'right');
  }

  renderTimeScale() {
    if (!this.timeScaleEl) return;
    const duration = this.project.duration;
    const minutes = Math.ceil(duration / 60);
    this.timeScaleEl.innerHTML = '';
    for (let m = 0; m <= minutes; m++) {
      const tick = document.createElement('div');
      tick.textContent = `${m}:00`;
      tick.style.minWidth = '48px';
      tick.style.textAlign = 'right';
      tick.style.paddingRight = '4px';
      this.timeScaleEl.appendChild(tick);
    }
  }

  onTimelineClick(e) {
    if (e.target.classList.contains('timeline-clip')) return;
    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, x / rect.width));
    const time = fraction * this.project.duration;
    this.dispatchEvent(new CustomEvent('seekRequested', { detail: { time } }));
  }
}