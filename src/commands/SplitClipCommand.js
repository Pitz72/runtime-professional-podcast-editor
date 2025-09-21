/**
 * SplitClipCommand.js - Comando per dividere una clip in due
 */
export class SplitClipCommand {
  constructor(project, clip, splitTime) {
    this.project = project;
    this.originalClip = clip;
    this.splitTime = splitTime;
    this.originalDuration = clip.duration;
    this.newClip = null; // La seconda metà della clip, creata dopo lo split
  }

  execute() {
    const { startTime, duration, trackId } = this.originalClip;
    const splitPoint = this.splitTime - startTime;

    if (splitPoint <= 0 || splitPoint >= duration) {
      console.warn('Split time is outside the clip bounds.');
      return; // Non eseguire se il punto di split è invalido
    }

    // 1. Accorcia la clip originale
    this.project.updateClipProperty(this.originalClip.id, 'duration', splitPoint);

    // 2. Crea la nuova clip per la seconda metà
    this.newClip = {
      name: `${this.originalClip.name} (2)`,
      audioId: this.originalClip.audioId,
      startTime: this.splitTime,
      duration: this.originalDuration - splitPoint,
      volume: this.originalClip.volume
    };

    this.project.addClip(trackId, this.newClip);
    console.log(`Clip ${this.originalClip.id} split at ${this.splitTime}s. New clip ${this.newClip.id} created.`);
  }

  undo() {
    if (!this.newClip) return;

    // 1. Rimuovi la seconda metà della clip
    this.project.removeClip(this.newClip.trackId, this.newClip.id);

    // 2. Ripristina la durata della clip originale
    this.project.updateClipProperty(this.originalClip.id, 'duration', this.originalDuration);
    console.log(`Undo split: Clip ${this.newClip.id} removed and ${this.originalClip.id} restored.`);
  }
}
