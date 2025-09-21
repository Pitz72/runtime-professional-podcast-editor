/**
 * ResizeClipCommand.js - Comando per ridimensionare una clip
 */
export class ResizeClipCommand {
  constructor(project, clipId, newStart, newDuration, oldStart, oldDuration) {
    this.project = project;
    this.clipId = clipId;
    this.newStart = newStart;
    this.newDuration = newDuration;
    this.oldStart = oldStart;
    this.oldDuration = oldDuration;
  }

  execute() {
    this.project.updateClipProperty(this.clipId, 'startTime', this.newStart);
    this.project.updateClipProperty(this.clipId, 'duration', this.newDuration);
  }

  undo() {
    this.project.updateClipProperty(this.clipId, 'startTime', this.oldStart);
    this.project.updateClipProperty(this.clipId, 'duration', this.oldDuration);
  }
}
