// Project persistence: native dialogs + real files on disk.
// Audio is referenced by absolute path and re-decoded on load,
// never embedded in the project JSON.

import { Project, Track, AudioFile, AudioClip, TrackKind, PROJECT_SCHEMA_VERSION } from '@shared/types';

export interface LoadResult {
  project: Project;
  path: string;
  missingFiles: string[];
}

const PROJECT_FILTERS = [{ name: 'Project Files', extensions: ['json'] }];

export function requireBridge() {
  if (!window.electron) {
    throw new Error('Desktop bridge unavailable: the app must run inside Electron.');
  }
  return window.electron;
}

/** Serializable snapshot: buffers stripped, only paths persisted. */
export function serializeProject(project: Project): string {
  const persisted = {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    name: project.name,
    mastering: project.mastering,
    tracks: project.tracks,
    files: project.files.map(({ id, name, path, type, duration }) => ({
      id, name, path, type, duration,
    })),
  };
  return JSON.stringify(persisted, null, 2);
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Validate and normalize a parsed project file.
 * Throws with a human-readable message when the structure is unusable;
 * silently drops clips that reference unknown files.
 */
export function parseProject(json: string): Project {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('The file is not valid JSON.');
  }

  const data = raw as Record<string, unknown>;
  if (typeof data !== 'object' || data === null) throw new Error('Invalid project structure.');
  if (typeof data.name !== 'string' || !Array.isArray(data.tracks) || !Array.isArray(data.files)) {
    throw new Error('The file is not a Runtime Radio project.');
  }

  const files: AudioFile[] = (data.files as unknown[]).flatMap(f => {
    const file = f as Record<string, unknown>;
    if (typeof file?.id !== 'string' || typeof file?.name !== 'string') return [];
    return [{
      id: file.id,
      name: file.name,
      path: typeof file.path === 'string' ? file.path : undefined,
      type: typeof file.type === 'string' ? file.type : 'audio/wav',
      duration: isFiniteNumber(file.duration) ? file.duration : 0,
    }];
  });
  const fileIds = new Set(files.map(f => f.id));

  const validKinds = new Set<string>(Object.values(TrackKind));
  const tracks: Track[] = (data.tracks as unknown[]).flatMap(t => {
    const track = t as Record<string, unknown>;
    if (typeof track?.id !== 'string' || typeof track?.name !== 'string') return [];
    if (typeof track.kind !== 'string' || !validKinds.has(track.kind)) return [];
    const trackId: string = track.id;
    const trackName: string = track.name;

    const clips: AudioClip[] = (Array.isArray(track.clips) ? track.clips as unknown[] : []).flatMap(c => {
      const clip = c as Record<string, unknown>;
      if (typeof clip?.id !== 'string' || typeof clip?.fileId !== 'string') return [];
      if (!fileIds.has(clip.fileId)) return []; // orphan clip: drop
      if (!isFiniteNumber(clip.startTime) || !isFiniteNumber(clip.duration) || !isFiniteNumber(clip.offset)) return [];
      return [{
        id: clip.id,
        fileId: clip.fileId,
        trackId,
        startTime: Math.max(0, clip.startTime),
        duration: Math.max(0, clip.duration),
        offset: Math.max(0, clip.offset),
        isLooped: clip.isLooped === true,
      }];
    });

    return [{
      id: trackId,
      name: trackName,
      kind: track.kind as TrackKind,
      clips,
      volume: isFiniteNumber(track.volume) ? Math.min(1, Math.max(0, track.volume)) : 0.8,
      isMuted: track.isMuted === true,
      isSolo: track.isSolo === true,
      effects: track.effects as Track['effects'],
      isDuckingEnabled: track.isDuckingEnabled === true,
    }];
  });

  return {
    schemaVersion: isFiniteNumber(data.schemaVersion) ? data.schemaVersion : PROJECT_SCHEMA_VERSION,
    name: data.name,
    tracks,
    files,
    mastering: data.mastering as Project['mastering'],
  };
}

/**
 * Decode every referenced audio file from disk.
 * Files that are missing or fail to decode are reported, not fatal.
 */
export async function hydrateProjectAudio(
  project: Project,
  decode: (data: ArrayBuffer) => Promise<AudioBuffer>
): Promise<{ project: Project; missingFiles: string[] }> {
  const bridge = requireBridge();
  const missingFiles: string[] = [];

  const files = await Promise.all(project.files.map(async (file) => {
    if (!file.path) {
      missingFiles.push(file.name);
      return file;
    }
    try {
      const data = await bridge.readFile(file.path);
      const buffer = await decode(data);
      return { ...file, buffer, duration: buffer.duration };
    } catch {
      missingFiles.push(file.name);
      return file;
    }
  }));

  return { project: { ...project, files }, missingFiles };
}

export async function openProjectFromDisk(
  decode: (data: ArrayBuffer) => Promise<AudioBuffer>
): Promise<LoadResult | null> {
  const bridge = requireBridge();
  const result = await bridge.openFileDialog({
    title: 'Open Project',
    filters: PROJECT_FILTERS,
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const path = result.filePaths[0];
  const data = await bridge.readFile(path);
  const json = new TextDecoder().decode(data);
  const parsed = parseProject(json);
  const { project, missingFiles } = await hydrateProjectAudio(parsed, decode);
  return { project, path, missingFiles };
}

/**
 * Save the project. Uses the known path unless `saveAs` is requested
 * (or the project has never been saved). Returns the path, or null if canceled.
 */
export async function saveProjectToDisk(
  project: Project,
  currentPath: string | null,
  saveAs: boolean
): Promise<string | null> {
  const bridge = requireBridge();

  let targetPath = currentPath;
  if (!targetPath || saveAs) {
    const result = await bridge.saveFileDialog({
      title: 'Save Project',
      defaultPath: `${project.name.replace(/[\\/:*?"<>|\s]+/g, '_')}.json`,
      filters: PROJECT_FILTERS,
    });
    if (result.canceled || !result.filePath) return null;
    targetPath = result.filePath;
  }

  await bridge.writeFile(targetPath, serializeProject(project));
  return targetPath;
}
