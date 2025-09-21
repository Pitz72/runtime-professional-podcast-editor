/**
 * AddTrackCommand.js - Comando per aggiungere una traccia
 */
export class AddTrackCommand {
  constructor(project, type) {
    this.project = project;
    this.type = type;
    this.track = null; // La traccia creata verrà memorizzata qui
  }

  execute() {
    this.track = this.project.addTrack(this.type);
    if (this.track) {
      console.log('AddTrackCommand executed, track created:', this.track.id);
    }
  }

  undo() {
    if (this.track) {
      this.project.removeTrack(this.track.id);
      console.log('AddTrackCommand undone, track removed:', this.track.id);
    }
  }
}
