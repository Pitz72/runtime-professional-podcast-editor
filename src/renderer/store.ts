import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Project, Track, AudioFile, AudioClip, TrackKind, SelectedItem } from '@shared/types';
import { INITIAL_ZOOM_LEVEL, createInitialTracks } from './constants';

const HISTORY_LIMIT = 50;

/**
 * Structural clone of a project for history snapshots.
 * AudioBuffers are shared by reference: they are immutable for our purposes
 * and a JSON deep clone would silently destroy them.
 */
const cloneProject = (p: Project): Project => ({
  ...p,
  tracks: p.tracks.map(t => ({ ...t, clips: t.clips.map(c => ({ ...c })) })),
  files: p.files.map(f => ({ ...f })),
});

const newId = (prefix: string): string => `${prefix}-${crypto.randomUUID()}`;

export interface AppState {
  project: Project | null;
  projectPath: string | null;
  isDirty: boolean;
  selectedItem: SelectedItem;
  zoomIndex: number;
  history: { past: Project[]; future: Project[] };

  // Project lifecycle
  newProject: () => void;
  loadProject: (project: Project, path: string | null) => void;
  markSaved: (path: string) => void;

  // Generic mutation (marks dirty, does NOT snapshot history)
  updateProject: (updater: (project: Project) => Project) => void;

  // UI state
  setSelectedItem: (item: SelectedItem) => void;
  setZoomIndex: (index: number) => void;

  // History
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Domain actions (each snapshots history where appropriate)
  addTrack: (kind: TrackKind) => void;
  deleteTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  addClip: (trackId: string, clip: AudioClip) => void;
  updateClip: (clipId: string, updates: Partial<AudioClip>) => void;
  deleteClip: (clipId: string) => void;
  addFiles: (files: AudioFile[]) => void;
  deleteFile: (fileId: string) => void;
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    project: null,
    projectPath: null,
    isDirty: false,
    selectedItem: null,
    zoomIndex: INITIAL_ZOOM_LEVEL,
    history: { past: [], future: [] },

    newProject: () => {
      set({
        project: {
          name: 'Untitled Project',
          tracks: createInitialTracks(),
          files: [],
        },
        projectPath: null,
        isDirty: false,
        selectedItem: null,
        history: { past: [], future: [] },
      });
    },

    loadProject: (project, path) => {
      set({
        project,
        projectPath: path,
        isDirty: false,
        selectedItem: null,
        history: { past: [], future: [] },
      });
    },

    markSaved: (path) => set({ projectPath: path, isDirty: false }),

    updateProject: (updater) => {
      const { project } = get();
      if (!project) return;
      set({ project: updater(project), isDirty: true });
    },

    setSelectedItem: (selectedItem) => set({ selectedItem }),
    setZoomIndex: (zoomIndex) => set({ zoomIndex }),

    saveToHistory: () => {
      const { project, history } = get();
      if (!project) return;
      const past = [...history.past, cloneProject(project)].slice(-HISTORY_LIMIT);
      set({ history: { past, future: [] } });
    },

    undo: () => {
      const { project, history } = get();
      if (!project || history.past.length === 0) return;
      const previous = history.past[history.past.length - 1];
      set({
        project: previous,
        isDirty: true,
        history: {
          past: history.past.slice(0, -1),
          future: [cloneProject(project), ...history.future],
        },
      });
    },

    redo: () => {
      const { project, history } = get();
      if (!project || history.future.length === 0) return;
      const next = history.future[0];
      set({
        project: next,
        isDirty: true,
        history: {
          past: [...history.past, cloneProject(project)].slice(-HISTORY_LIMIT),
          future: history.future.slice(1),
        },
      });
    },

    canUndo: () => get().history.past.length > 0,
    canRedo: () => get().history.future.length > 0,

    addTrack: (kind) => {
      const { project, saveToHistory, updateProject } = get();
      if (!project) return;
      saveToHistory();

      const trackCount = project.tracks.filter(t => t.kind === kind).length;
      const newTrack: Track = {
        id: newId('track'),
        name: `${kind} ${trackCount + 1}`,
        kind,
        clips: [],
        volume: kind === TrackKind.Background ? 0.4 : kind === TrackKind.Voice ? 1.0 : 0.8,
        isMuted: false,
        isSolo: false,
        isDuckingEnabled: kind === TrackKind.Music || kind === TrackKind.Background,
      };

      updateProject(p => {
        const tracks = [...p.tracks];
        if (kind === TrackKind.Voice) {
          // Keep voice tracks grouped together.
          let lastVoiceIndex = -1;
          for (let i = tracks.length - 1; i >= 0; i--) {
            if (tracks[i].kind === TrackKind.Voice) {
              lastVoiceIndex = i;
              break;
            }
          }
          if (lastVoiceIndex !== -1) {
            tracks.splice(lastVoiceIndex + 1, 0, newTrack);
          } else {
            tracks.push(newTrack);
          }
        } else {
          tracks.push(newTrack);
        }
        return { ...p, tracks };
      });
    },

    deleteTrack: (trackId) => {
      const { project, saveToHistory, updateProject, selectedItem } = get();
      if (!project) return;
      saveToHistory();

      updateProject(p => ({ ...p, tracks: p.tracks.filter(t => t.id !== trackId) }));

      if (selectedItem?.type === 'track' && selectedItem.id === trackId) {
        set({ selectedItem: null });
      }
    },

    updateTrack: (trackId, updates) => {
      get().updateProject(p => ({
        ...p,
        tracks: p.tracks.map(track =>
          track.id === trackId ? { ...track, ...updates } : track
        ),
      }));
    },

    addClip: (trackId, clip) => {
      const { saveToHistory, updateProject } = get();
      saveToHistory();
      updateProject(p => ({
        ...p,
        tracks: p.tracks.map(track =>
          track.id === trackId
            ? { ...track, clips: [...track.clips, clip] }
            : track
        ),
      }));
    },

    updateClip: (clipId, updates) => {
      get().updateProject(p => ({
        ...p,
        tracks: p.tracks.map(track => ({
          ...track,
          clips: track.clips.map(clip =>
            clip.id === clipId ? { ...clip, ...updates } : clip
          ),
        })),
      }));
    },

    deleteClip: (clipId) => {
      const { saveToHistory, updateProject, selectedItem } = get();
      saveToHistory();
      updateProject(p => ({
        ...p,
        tracks: p.tracks.map(track => ({
          ...track,
          clips: track.clips.filter(c => c.id !== clipId),
        })),
      }));
      if (selectedItem?.type === 'clip' && selectedItem.id === clipId) {
        set({ selectedItem: null });
      }
    },

    addFiles: (files) => {
      if (files.length === 0) return;
      get().updateProject(p => ({ ...p, files: [...p.files, ...files] }));
    },

    deleteFile: (fileId) => {
      const { saveToHistory, updateProject, selectedItem } = get();
      saveToHistory();
      updateProject(p => ({
        ...p,
        files: p.files.filter(f => f.id !== fileId),
        tracks: p.tracks.map(track => ({
          ...track,
          clips: track.clips.filter(clip => clip.fileId !== fileId),
        })),
      }));

      const { project } = get();
      if (selectedItem?.type === 'file' && selectedItem.id === fileId) {
        set({ selectedItem: null });
      } else if (selectedItem?.type === 'clip' && project) {
        const clipExists = project.tracks.some(t => t.clips.some(c => c.id === selectedItem.id));
        if (!clipExists) set({ selectedItem: null });
      }
    },
  }))
);

export { newId };

// Keep the main process informed so it can warn before closing with unsaved changes.
useAppStore.subscribe(
  state => state.isDirty,
  dirty => window.electron?.setDirty(dirty)
);
