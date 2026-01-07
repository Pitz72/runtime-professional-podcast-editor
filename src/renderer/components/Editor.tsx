import React, { useState, useCallback, useRef, useEffect } from 'react';
import FileBin from './FileBin';
import PropertiesPanel from './PropertiesPanel';
import Timeline from './Timeline';
import TransportControls from './TransportControls';
import { Project, AudioFile, Track, TrackKind, AudioClip, CompressorSettings, TimelineHandle } from '@shared/types';
import { ZOOM_LEVELS, INITIAL_ZOOM_LEVEL, APP_NAME } from '../constants';
import { MASTERING_PRESETS } from '../presets';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { useMemoryCleanup } from '../hooks/useMemoryCleanup';
import { useClipClipboard } from '../hooks/useClipClipboard';
import { useKeyboardShortcuts, KeyboardShortcut } from '../hooks/useKeyboardShortcuts';
import { usePreloadResources } from '../hooks/usePreloadResources';
import { useFileImporter } from '../hooks/useFileImporter';
import { useAppStore, useProject } from '../store';
import { audioCache } from '../services/AudioCache';

const Editor: React.FC = () => {
    const project = useProject();
    const setProject = useAppStore(state => state.setProject);
    const updateProject = useAppStore(state => state.updateProject);
    const addTrackAction = useAppStore(state => state.addTrack);
    const deleteTrackAction = useAppStore(state => state.deleteTrack);
    // Real delete file from store needs a new action or manual update, let's use manual update for now via setProject

    const [selectedItem, setSelectedItem] = useState<{ type: 'track' | 'clip', id: string } | null>(null);
    const [zoomIndex, setZoomIndex] = useState(INITIAL_ZOOM_LEVEL);

    const timelineRef = useRef<TimelineHandle>(null);
    const pixelsPerSecond = ZOOM_LEVELS[zoomIndex];

    const [audioState, audioActions] = useAudioEngine(project);
    const { performCleanup } = useMemoryCleanup(project);
    const clipboard = useClipClipboard();
    const { importFiles } = useFileImporter();

    // Preload resources for better performance
    usePreloadResources();

    const handleSetMastering = useCallback((preset: CompressorSettings | undefined) => {
        if (!project) return;
        updateProject(p => ({ ...p, mastering: preset }));
    }, [project, updateProject]);

    useEffect(() => {
        // Set default mastering on project load
        if (project && !project.mastering) {
            handleSetMastering(MASTERING_PRESETS[0].settings);
        }
    }, [project, handleSetMastering]);

    useEffect(() => {
        if (project?.files) {
            audioActions.hydrateBuffers(project.files);
        }
    }, [project?.files, audioActions]);

    const handleFileDrop = useCallback(async (files: File[]) => {
        await importFiles(files);
    }, [importFiles]);

    const handleStop = useCallback(() => {
        audioActions.stop();
    }, [audioActions]);

    const handleSeek = useCallback((time: number) => {
        audioActions.seek(time);
    }, [audioActions]);

    const handlePlayPause = useCallback(() => {
        audioActions.playPause();
    }, [audioActions]);

    const addTrack = (kind: TrackKind) => {
        addTrackAction(kind);
    };

    const deleteTrack = (trackId: string) => {
        deleteTrackAction(trackId);
        if (selectedItem?.type === 'track' && selectedItem.id === trackId) {
            setSelectedItem(null);
        }
    }

    const deleteFile = useCallback((fileId: string) => {
        if (!project) return;

        // Clear from cache to prevent memory leaks
        audioCache.delete(fileId);

        // We need to implement deleteFile in the store or do it manually here.
        // Doing it manually to match previous logic but using store setter
        updateProject(p => {
             // Remove the file from the files array
            const newFiles = p.files.filter(f => f.id !== fileId);


            // Remove all clips that reference this file
            const newTracks = p.tracks.map(track => ({
                ...track,
                clips: track.clips.filter(clip => clip.fileId !== fileId)
            }));

            return { ...p, files: newFiles, tracks: newTracks };
        });

        // If a clip from this file was selected, unselect it
        if (selectedItem?.type === 'clip' && project) {
             // This check is slightly complex because we need the *new* state to be 100% sure,
             // but checking current state is mostly fine for UI
             const fileClips = project.tracks.flatMap(t => t.clips).filter(c => c.fileId === fileId);
             if (fileClips.some(c => c.id === selectedItem.id)) {
                 setSelectedItem(null);
             }
        }
    }, [project, updateProject, selectedItem, setSelectedItem]);

    const handleSaveProject = useCallback(() => {
        if (!project) return;
        // Strip out the buffer before saving, the data URL is what we persist
        const projectToSave = { ...project, files: project.files.map(({ buffer, ...rest }) => rest) };
        const projectJson = JSON.stringify(projectToSave, null, 2);
        const blob = new Blob([projectJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name.replace(/\s/g, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [project]);

    const handleExportAudio = useCallback(async (format: 'wav' | 'mp3' | 'flac' | 'aac' = 'wav') => {
        await audioActions.exportAudio(format);
    }, [audioActions]);

    // Clipboard functions
    const handleCopyClip = useCallback((clipId: string) => {
        const clip = project?.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
        if (clip) {
            clipboard.copyClip(clip);
        }
    }, [project, clipboard]);

    const handlePasteClip = useCallback((trackId: string, pasteTime: number) => {
        const newClip = clipboard.pasteClip(trackId, pasteTime);
        if (newClip) {
            const addClipAction = useAppStore.getState().addClip;
            addClipAction(trackId, newClip);
        }
    }, [clipboard]);

    // Keyboard shortcuts
    const keyboardShortcuts: KeyboardShortcut[] = [
        {
            key: 'c',
            ctrlKey: true,
            action: () => {
                if (selectedItem?.type === 'clip') {
                    handleCopyClip(selectedItem.id);
                }
            },
            description: 'Copy selected clip'
        },
        {
            key: 'v',
            ctrlKey: true,
            action: () => {
                if (selectedItem?.type === 'track' && clipboard.hasClipboardContent) {
                    // Paste at current time or playhead position
                    const pasteTime = audioState.currentTime;
                    handlePasteClip(selectedItem.id, pasteTime);
                }
            },
            description: 'Paste clip to selected track'
        },
        {
            key: 'Delete',
            action: () => {
                if (selectedItem?.type === 'clip') {
                    // Find and delete the clip
                    // Need to find trackId for the clip
                    if (!project) return;

                    const track = project.tracks.find(t => t.clips.some(c => c.id === selectedItem.id));
                    if (track) {
                        const deleteClipAction = useAppStore.getState().deleteClip;
                        deleteClipAction(track.id, selectedItem.id);
                        setSelectedItem(null);
                    }
                }
            },
            description: 'Delete selected clip'
        }
    ];

    useKeyboardShortcuts(keyboardShortcuts);

    // Audio engine handles its own cleanup

    return (
        <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
            <header className="bg-gray-800 p-2 border-b border-gray-700 flex items-center justify-between">
                <h1 className="text-xl font-bold text-purple-400">{APP_NAME}</h1>
                <TransportControls
                    isPlaying={audioState.isPlaying}
                    onPlayPause={handlePlayPause}
                    onStop={handleStop}
                    onSave={handleSaveProject}
                    onExport={handleExportAudio}
                    onMasteringChange={handleSetMastering}
                    isBuffering={audioState.isBuffering}
                    isExporting={audioState.isExporting}
                    currentMastering={project.mastering}
                />
            </header>
            <div className="flex flex-1 overflow-hidden">
                <aside className="w-1/4 max-w-xs flex flex-col bg-gray-800 border-r border-gray-700">
                    <FileBin files={project.files} onFileDrop={handleFileDrop} onFileDelete={deleteFile} />
                    <PropertiesPanel selectedItem={selectedItem} project={project} setProject={setProject} />
                </aside>
                <main className="flex-1 flex flex-col overflow-y-auto">
                    <Timeline
                        ref={timelineRef}
                        project={project}
                        setProject={setProject}
                        selectedItem={selectedItem}
                        onSelectItem={setSelectedItem}
                        onAddTrack={addTrack}
                        onDeleteTrack={deleteTrack}
                        currentTime={audioState.currentTime}
                        onSeek={handleSeek}
                        isPlaying={audioState.isPlaying}
                        pixelsPerSecond={pixelsPerSecond}
                        zoomIndex={zoomIndex}
                        onZoomChange={setZoomIndex}
                        onCopyClip={handleCopyClip}
                        onPasteClip={handlePasteClip}
                    />
                </main>
            </div>
        </div>
    );
};

export default Editor;