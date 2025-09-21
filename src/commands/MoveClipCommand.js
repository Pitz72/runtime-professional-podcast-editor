/**
 * MoveClipCommand.js - Comando per spostare una clip
 */
export class MoveClipCommand {
  constructor(project, clipId, newStartTime, oldStartTime) {
    this.project = project;
    this.clipId = clipId;
    this.newStartTime = newStartTime;
    this.oldStartTime = oldStartTime;
  }

  execute() {
    this.project.updateClipProperty(this.clipId, 'startTime', this.newStartTime);
  }

  undo() {
    this.project.updateClipProperty(this.clipId, 'startTime', this.oldStartTime);
  }
}
