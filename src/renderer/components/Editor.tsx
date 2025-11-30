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
import { validateAudioFile } from '../services/audioUtils';


interface EditorProps {
    project: Project;
    setProject: React.Dispatch<React.SetStateAction<Project | null>>;
}

const Editor: React.FC<EditorProps> = ({ project, setProject }) => {
    const [selectedItem, setSelectedItem] = useState<{ type: 'track' | 'clip', id: string } | null>(null);
    const [zoomIndex, setZoomIndex] = useState(INITIAL_ZOOM_LEVEL);

    const timelineRef = useRef<TimelineHandle>(null);
    const pixelsPerSecond = ZOOM_LEVELS[zoomIndex];

    const [audioState, audioActions] = useAudioEngine(project);
    const { performCleanup } = useMemoryCleanup(project);
    const clipboard = useClipClipboard();

    // Preload resources for better performance
    usePreloadResources();

    const handleSetMastering = useCallback((preset: CompressorSettings | undefined) => {
        setProject(p => p ? { ...p, mastering: preset } : null);
    }, [setProject]);

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
        audioActions.initAudioContext();

        // Validate files first
        const validationPromises = files.map(file => validateAudioFile(file));
        const validationResults = await Promise.all(validationPromises);

        const validFiles = files.filter((file, index) => {
            const result = validationResults[index];
            if (!result.isValid) {
                alert(`File "${file.name}" is invalid: ${result.error}`);
                return false;
            }
            if (result.warnings && result.warnings.length > 0) {
                console.warn(`File "${file.name}" warnings:`, result.warnings);
                // Show warnings but still allow the file
                result.warnings.forEach(warning => console.warn(warning));
            }
            return true;
        });

        if (validFiles.length === 0) {
            return;
        }

        const newFilesPromises = validFiles.map(file => {
            return new Promise<AudioFile | null>((resolve) => {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const dataUrl = e.target?.result as string;
                        // To get duration, we still need to decode it.
                        const response = await fetch(dataUrl);
                        const arrayBuffer = await response.arrayBuffer();
                        const audioContext = new AudioContext();
                        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                        audioContext.close();
                        resolve({
                            id: `file-${Date.now()}-${Math.random()}`,
                            name: file.name,
                            url: dataUrl, // Save the Data URL
                            type: file.type,
                            duration: audioBuffer.duration,
                            buffer: audioBuffer,
                        });
                    } catch (error) {
                        console.error("Failed to decode audio file:", file.name, error);
                        alert(`Could not decode audio file: ${file.name}`);
                        resolve(null);
                    }
                };
                reader.readAsDataURL(file); // Read file as Data URL
            });
        });

        Promise.all(newFilesPromises).then(newFiles => {
            const successfullyLoadedFiles = newFiles.filter((f): f is AudioFile => f !== null);
            if (successfullyLoadedFiles.length > 0) {
                setProject(p => p ? { ...p, files: [...p.files, ...successfullyLoadedFiles] } : null);
            }
        });
    }, [audioActions, setProject]);

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
        setProject(p => {
            if (!p) return null;
            const newTrack: Track = {
                id: `track-${Date.now()}`,
                name: `${kind} ${p.tracks.filter(t => t.kind === kind).length + 1}`,
                kind: kind,
                clips: [],
                volume: kind === TrackKind.Background ? 0.4 : kind === TrackKind.Voice ? 1.0 : 0.8,
                isMuted: false,
                isSolo: false,
                isDuckingEnabled: kind === TrackKind.Music || kind === TrackKind.Background,
            };
            const tracks = [...p.tracks];
            if (kind === TrackKind.Voice) {
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
    };

    const deleteTrack = (trackId: string) => {
        setProject(p => {
            if (!p) return null;
            const newTracks = p.tracks.filter(t => t.id !== trackId);
            // If the deleted track was selected, unselect it
            if (selectedItem?.type === 'track' && selectedItem.id === trackId) {
                setSelectedItem(null);
            }
            return { ...p, tracks: newTracks };
        })
    }

    const deleteFile = useCallback((fileId: string) => {
        setProject(p => {
            if (!p) return null;

            // Remove the file from the files array
            const newFiles = p.files.filter(f => f.id !== fileId);

            // Remove all clips that reference this file
            const newTracks = p.tracks.map(track => ({
                ...track,
                clips: track.clips.filter(clip => clip.fileId !== fileId)
            }));

            // If a clip from this file was selected, unselect it
            if (selectedItem?.type === 'clip') {
                const clipExists = newTracks.some(track =>
                    track.clips.some(clip => clip.id === selectedItem.id)
                );
                if (!clipExists) {
                    setSelectedItem(null);
                }
            }

            return { ...p, files: newFiles, tracks: newTracks };
        });
    }, [selectedItem, setSelectedItem]);

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
            setProject(p => {
                if (!p) return null;
                return {
                    ...p,
                    tracks: p.tracks.map(track =>
                        track.id === trackId
                            ? { ...track, clips: [...track.clips, newClip] }
                            : track
                    )
                };
            });
        }
    }, [clipboard, setProject]);

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
                    setProject(p => {
                        if (!p) return null;
                        return {
                            ...p,
                            tracks: p.tracks.map(track => ({
                                ...track,
                                clips: track.clips.filter(clip => clip.id !== selectedItem.id)
                            }))
                        };
                    });
                    setSelectedItem(null);
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