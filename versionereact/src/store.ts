import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Project, Track, AudioFile, AudioClip, TrackKind, SelectedItem } from '../types';

// History for undo/redo
interface HistoryState {
  past: Project[];
  present: Project;
  future: Project[];
}

export interface AppState {
  // Project state
  project: Project | null;
  selectedItem: SelectedItem | null;

  // Playback state
  isPlaying: boolean;
  currentTime: number;
  isBuffering: boolean;
  isExporting: boolean;

  // UI state
  zoomIndex: number;
  showWelcome: boolean;

  // History for undo/redo
  history: HistoryState;

  // Actions
  setProject: (project: Project | null) => void;
  updateProject: (updater: (project: Project) => Project) => void;
  setSelectedItem: (item: SelectedItem | null) => void;

  // Playback actions
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setIsBuffering: (buffering: boolean) => void;
  setIsExporting: (exporting: boolean) => void;

  // UI actions
  setZoomIndex: (index: number) => void;
  setShowWelcome: (show: boolean) => void;

  // History actions
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Project actions
  addTrack: (kind: TrackKind) => void;
  deleteTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  addClip: (trackId: string, clip: AudioClip) => void;
  updateClip: (clipId: string, updates: Partial<AudioClip>) => void;
  deleteClip: (trackId: string, clipId: string) => void;
  addFile: (file: AudioFile) => void;
  updateFile: (fileId: string, updates: Partial<AudioFile>) => void;
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    project: null,
    selectedItem: null,
    isPlaying: false,
    currentTime: 0,
    isBuffering: false,
    isExporting: false,
    zoomIndex: 4, // Default zoom level
    showWelcome: true,
    history: {
      past: [],
      present: null as any, // Will be set when project is loaded
      future: []
    },

    // Basic setters
    setProject: (project) => set({ project, showWelcome: !project }),
    updateProject: (updater) => {
      const { project } = get();
      if (!project) return;
      const newProject = updater(project);
      set({ project: newProject });
    },
    setSelectedItem: (selectedItem) => set({ selectedItem }),
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setCurrentTime: (currentTime) => set({ currentTime }),
    setIsBuffering: (isBuffering) => set({ isBuffering }),
    setIsExporting: (isExporting) => set({ isExporting }),
    setZoomIndex: (zoomIndex) => set({ zoomIndex }),
    setShowWelcome: (showWelcome) => set({ showWelcome }),

    // History management
    saveToHistory: () => {
      const { project, history } = get();
      if (!project) return;

      set({
        history: {
          past: [...history.past, history.present],
          present: JSON.parse(JSON.stringify(project)), // Deep clone
          future: []
        }
      });
    },

    undo: () => {
      const { history } = get();
      if (history.past.length === 0) return;

      const previous = history.past[history.past.length - 1];
      const newPast = history.past.slice(0, -1);

      set({
        project: JSON.parse(JSON.stringify(previous)), // Deep clone
        history: {
          past: newPast,
          present: previous,
          future: [history.present, ...history.future]
        }
      });
    },

    redo: () => {
      const { history } = get();
      if (history.future.length === 0) return;

      const next = history.future[0];
      const newFuture = history.future.slice(1);

      set({
        project: JSON.parse(JSON.stringify(next)), // Deep clone
        history: {
          past: [...history.past, history.present],
          present: next,
          future: newFuture
        }
      });
    },

    canUndo: () => get().history.past.length > 0,
    canRedo: () => get().history.future.length > 0,

    // Project actions
    addTrack: (kind) => {
      const { project, saveToHistory } = get();
      if (!project) return;

      saveToHistory();

      const trackCount = project.tracks.filter(t => t.kind === kind).length;
      const newTrack: Track = {
        id: `track-${Date.now()}`,
        name: `${kind} ${trackCount + 1}`,
        kind,
        clips: [],
        volume: kind === TrackKind.Background ? 0.4 : kind === TrackKind.Voice ? 1.0 : 0.8,
        isMuted: false,
        isSolo: false,
        isDuckingEnabled: kind === TrackKind.Music || kind === TrackKind.Background,
      };

      set({
        project: {
          ...project,
          tracks: [...project.tracks, newTrack]
        }
      });
    },

    deleteTrack: (trackId) => {
      const { project, saveToHistory, selectedItem } = get();
      if (!project) return;

      saveToHistory();

      const newTracks = project.tracks.filter(t => t.id !== trackId);
      const newSelectedItem = selectedItem?.type === 'track' && selectedItem.id === trackId
        ? null
        : selectedItem;

      set({
        project: { ...project, tracks: newTracks },
        selectedItem: newSelectedItem
      });
    },

    updateTrack: (trackId, updates) => {
      const { project } = get();
      if (!project) return;

      set({
        project: {
          ...project,
          tracks: project.tracks.map(track =>
            track.id === trackId ? { ...track, ...updates } : track
          )
        }
      });
    },

    addClip: (trackId, clip) => {
      const { project, saveToHistory } = get();
      if (!project) return;

      saveToHistory();

      set({
        project: {
          ...project,
          tracks: project.tracks.map(track =>
            track.id === trackId
              ? { ...track, clips: [...track.clips, clip] }
              : track
          )
        }
      });
    },

    updateClip: (clipId, updates) => {
      const { project } = get();
      if (!project) return;

      set({
        project: {
          ...project,
          tracks: project.tracks.map(track => ({
            ...track,
            clips: track.clips.map(clip =>
              clip.id === clipId ? { ...clip, ...updates } : clip
            )
          }))
        }
      });
    },

    deleteClip: (trackId, clipId) => {
      const { project, saveToHistory } = get();
      if (!project) return;

      saveToHistory();

      set({
        project: {
          ...project,
          tracks: project.tracks.map(track =>
            track.id === trackId
              ? { ...track, clips: track.clips.filter(c => c.id !== clipId) }
              : track
          )
        }
      });
    },

    addFile: (file) => {
      const { project } = get();
      if (!project) return;

      set({
        project: {
          ...project,
          files: [...project.files, file]
        }
      });
    },

    updateFile: (fileId, updates) => {
      const { project } = get();
      if (!project) return;

      set({
        project: {
          ...project,
          files: project.files.map(file =>
            file.id === fileId ? { ...file, ...updates } : file
          )
        }
      });
    }
  }))
);

// Selectors for computed values
export const useProject = () => useAppStore((state) => state.project);
export const useSelectedItem = () => useAppStore((state) => state.selectedItem);
export const usePlaybackState = () => useAppStore((state) => ({
  isPlaying: state.isPlaying,
  currentTime: state.currentTime,
  isBuffering: state.isBuffering,
  isExporting: state.isExporting
}));
export const useHistory = () => useAppStore((state) => ({
  canUndo: state.canUndo(),
  canRedo: state.canRedo(),
  undo: state.undo,
  redo: state.redo
}));