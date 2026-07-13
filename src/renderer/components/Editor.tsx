import React, { useCallback, useMemo, useState } from 'react';
import FileBin from './FileBin';
import PropertiesPanel from './PropertiesPanel';
import Timeline from './Timeline';
import TransportControls from './TransportControls';
import { AudioFile, Track, AudioClip, CompressorSettings } from '@shared/types';
import { ZOOM_LEVELS, APP_NAME } from '../constants';
import { MASTERING_PRESETS } from '../presets';
import { useAppStore, newId } from '../store';
import { AudioEngineState, AudioEngineActions } from '../hooks/useAudioEngine';
import { useClipClipboard } from '../hooks/useClipClipboard';
import { useKeyboardShortcuts, KeyboardShortcut } from '../hooks/useKeyboardShortcuts';
import { validateAudioFile, ExportFormat } from '../services/audioUtils';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, defaultDropAnimationSideEffects } from '@dnd-kit/core';

interface EditorProps {
    audioState: AudioEngineState;
    audioActions: AudioEngineActions;
    onSaveProject: () => void;
    onExportAudio: (format: ExportFormat) => void;
    exportFormat: ExportFormat;
    onExportFormatChange: (format: ExportFormat) => void;
}

/** A file queued for import, from either an OS drop or the native dialog. */
interface ImportCandidate {
    name: string;
    path?: string;
    type: string;
    data: ArrayBuffer;
}

const Editor: React.FC<EditorProps> = ({
    audioState,
    audioActions,
    onSaveProject,
    onExportAudio,
    exportFormat,
    onExportFormatChange,
}) => {
    const project = useAppStore(s => s.project);
    const selectedItem = useAppStore(s => s.selectedItem);
    const setSelectedItem = useAppStore(s => s.setSelectedItem);
    const zoomIndex = useAppStore(s => s.zoomIndex);
    const setZoomIndex = useAppStore(s => s.setZoomIndex);
    const updateProject = useAppStore(s => s.updateProject);
    const saveToHistory = useAppStore(s => s.saveToHistory);
    const addTrack = useAppStore(s => s.addTrack);
    const deleteTrack = useAppStore(s => s.deleteTrack);
    const addClip = useAppStore(s => s.addClip);
    const deleteClip = useAppStore(s => s.deleteClip);
    const addFiles = useAppStore(s => s.addFiles);
    const deleteFile = useAppStore(s => s.deleteFile);

    const pixelsPerSecond = ZOOM_LEVELS[zoomIndex];
    const clipboard = useClipClipboard();

    // dnd-kit state
    const [activeDragFile, setActiveDragFile] = useState<AudioFile | null>(null);
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Require 5px movement to start drag, allows clicks
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        if (active.data.current?.type === 'file') {
            setActiveDragFile(active.data.current.file);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragFile(null);

        if (!over || !project) return;

        if (over.data.current?.type === 'track' && active.data.current?.type === 'file') {
            const file = active.data.current.file as AudioFile;
            const track = over.data.current.track as Track;

            const overElementNode = over.rect;
            const dropX = (event.active.rect.current.translated?.left || 0) - overElementNode.left;

            const trackElement = document.getElementById(`track-${track.id}`);
            const timelineContainer = trackElement?.closest('.overflow-auto');
            const scrollLeft = timelineContainer ? timelineContainer.scrollLeft : 0;

            const adjustedDropX = dropX + scrollLeft;
            const startTime = Math.max(0, adjustedDropX / pixelsPerSecond);

            const newClip: AudioClip = {
                id: newId('clip'),
                fileId: file.id,
                trackId: track.id,
                startTime: startTime,
                duration: file.duration,
                offset: 0,
                isLooped: false,
            };

            addClip(track.id, newClip);
        }
    };

    const handleSetMastering = useCallback((preset: CompressorSettings | undefined) => {
        saveToHistory();
        updateProject(p => ({ ...p, mastering: preset ?? MASTERING_PRESETS[0].settings }));
    }, [updateProject, saveToHistory]);

    /** Decode candidates and add them to the project bin. */
    const importCandidates = useCallback(async (candidates: ImportCandidate[]) => {
        const imported: AudioFile[] = [];
        const failed: string[] = [];

        for (const candidate of candidates) {
            try {
                const buffer = await audioActions.decodeAudioData(candidate.data);
                imported.push({
                    id: newId('file'),
                    name: candidate.name,
                    path: candidate.path,
                    type: candidate.type,
                    duration: buffer.duration,
                    buffer,
                });
            } catch {
                failed.push(candidate.name);
            }
        }

        if (imported.length > 0) {
            saveToHistory();
            addFiles(imported);
        }
        if (failed.length > 0) {
            alert(`Could not decode the following files:\n\n${failed.join('\n')}`);
        }
    }, [audioActions, addFiles, saveToHistory]);

    /** Import File objects dropped from the OS. */
    const handleFileDrop = useCallback(async (files: File[]) => {
        const candidates: ImportCandidate[] = [];
        for (const file of files) {
            const validation = validateAudioFile(file);
            if (!validation.isValid) {
                alert(`File "${file.name}" was skipped: ${validation.error}`);
                continue;
            }
            candidates.push({
                name: file.name,
                path: window.electron?.getFilePath(file) || undefined,
                type: file.type,
                data: await file.arrayBuffer(),
            });
        }
        await importCandidates(candidates);
    }, [importCandidates]);

    /** Import via the native open dialog. */
    const handleImportFiles = useCallback(async () => {
        const bridge = window.electron;
        if (!bridge) return;
        const result = await bridge.openFileDialog({
            title: 'Import Audio Files',
            multiple: true,
            filters: [{ name: 'Audio Files', extensions: ['wav', 'mp3', 'ogg', 'flac', 'aac', 'm4a'] }],
        });
        if (result.canceled || result.filePaths.length === 0) return;

        const candidates: ImportCandidate[] = [];
        for (const path of result.filePaths) {
            const name = path.split(/[\\/]/).pop() || path;
            try {
                candidates.push({ name, path, type: '', data: await bridge.readFile(path) });
            } catch {
                alert(`Could not read file: ${name}`);
            }
        }
        await importCandidates(candidates);
    }, [importCandidates]);

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
            addClip(trackId, newClip);
        }
    }, [clipboard, addClip]);

    // Keyboard shortcuts
    const keyboardShortcuts: KeyboardShortcut[] = useMemo(() => [
        {
            key: 'c',
            ctrlKey: true,
            action: () => {
                const selected = useAppStore.getState().selectedItem;
                if (selected?.type === 'clip') {
                    handleCopyClip(selected.id);
                }
            },
            description: 'Copy selected clip'
        },
        {
            key: 'v',
            ctrlKey: true,
            action: () => {
                const selected = useAppStore.getState().selectedItem;
                if (selected?.type === 'track' && clipboard.hasClipboardContent) {
                    handlePasteClip(selected.id, audioState.currentTime);
                }
            },
            description: 'Paste clip to selected track'
        },
        {
            key: 'Delete',
            action: () => {
                const selected = useAppStore.getState().selectedItem;
                if (selected?.type === 'clip') {
                    deleteClip(selected.id);
                }
            },
            description: 'Delete selected clip'
        }
    ], [handleCopyClip, handlePasteClip, deleteClip, clipboard.hasClipboardContent, audioState.currentTime]);

    useKeyboardShortcuts(keyboardShortcuts);

    if (!project) return null;

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
                <header className="bg-gray-800 p-2 border-b border-gray-700 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-purple-400">{APP_NAME}</h1>
                    <TransportControls
                        isPlaying={audioState.isPlaying}
                        onPlayPause={audioActions.playPause}
                        onStop={audioActions.stop}
                        onSave={onSaveProject}
                        onExport={onExportAudio}
                        onMasteringChange={handleSetMastering}
                        isExporting={audioState.isExporting}
                        currentMastering={project.mastering}
                        exportFormat={exportFormat}
                        onExportFormatChange={onExportFormatChange}
                    />
                </header>
                <div className="flex flex-1 overflow-hidden">
                    <aside className="w-1/4 max-w-xs flex flex-col bg-gray-800 border-r border-gray-700">
                        <FileBin
                            files={project.files}
                            onFileDrop={handleFileDrop}
                            onImportClick={window.electron ? handleImportFiles : undefined}
                            onFileDelete={deleteFile}
                            onFileClick={(id) => setSelectedItem({ type: 'file', id })}
                        />
                        <PropertiesPanel selectedItem={selectedItem} project={project} />
                    </aside>
                    <main className="flex-1 flex flex-col overflow-y-auto">
                        <Timeline
                            project={project}
                            updateProject={updateProject}
                            onInteractionStart={saveToHistory}
                            selectedItem={selectedItem}
                            onSelectItem={setSelectedItem}
                            onAddTrack={addTrack}
                            onDeleteTrack={deleteTrack}
                            onDeleteClip={deleteClip}
                            currentTime={audioState.currentTime}
                            onSeek={audioActions.seek}
                            isPlaying={audioState.isPlaying}
                            pixelsPerSecond={pixelsPerSecond}
                            zoomIndex={zoomIndex}
                            onZoomChange={setZoomIndex}
                            onCopyClip={handleCopyClip}
                            onPasteClip={handlePasteClip}
                        />
                    </main>
                </div>

                <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) }}>
                    {activeDragFile ? (
                        <div className="bg-gray-700 p-2 rounded-md shadow-lg border border-purple-500 min-w-[200px] pointer-events-none">
                            <p className="text-sm font-medium text-white truncate">{activeDragFile.name}</p>
                            <p className="text-xs text-gray-400">{activeDragFile.duration.toFixed(2)}s</p>
                        </div>
                    ) : null}
                </DragOverlay>
            </div>
        </DndContext>
    );
};

export default Editor;
