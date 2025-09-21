/**
 * Properties.js - Pannello proprietà base
 */
export class Properties {
  constructor(project, container) {
    this.project = project;
    this.container = container;
    this.lastSelection = null;
  }

  render() {
    this.container.innerHTML = `<p>Seleziona una traccia o una clip per vedere le proprietà.</p>`;
  }

  showSelection(selection) {
    this.lastSelection = selection;
    if (!selection) {
      this.render();
      return;
    }

    if (selection.type === 'track') {
      const t = selection.track;
      this.container.innerHTML = `
        <div>
          <h3>Traccia: ${t.name}</h3>
          <label>Volume <input type="range" min="0" max="1" step="0.01" value="${t.volume}" id="prop-volume" /></label>
          <label>Pan <input type="range" min="-1" max="1" step="0.01" value="${typeof t.pan === 'number' ? t.pan : 0}" id="prop-pan" /></label>
        </div>
      `;

      this.container.querySelector('#prop-volume').addEventListener('input', (e) => {
        this.project.updateTrackProperty(t.id, 'volume', parseFloat(e.target.value));
      });
      const panEl = this.container.querySelector('#prop-pan');
      if (panEl) {
        panEl.addEventListener('input', (e) => {
          this.project.updateTrackProperty(t.id, 'pan', parseFloat(e.target.value));
        });
      }
    } else if (selection.type === 'clip') {
      const c = selection.clip;
      this.container.innerHTML = `
        <div>
          <h3>Clip: ${c.name}</h3>
          <p>Inizio: ${c.startTime.toFixed(2)}s, Durata: ${c.duration.toFixed(2)}s</p>
        </div>
      `;
    }
  }
}