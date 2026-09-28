import React, { useCallback, useMemo, useState } from 'react';
import FileBin from './FileBin';
import PropertiesPanel from './PropertiesPanel';
import Timeline from './Timeline';
import TransportControls from './TransportControls';
import { AudioFile, Track, AudioClip, CompressorSettings } from '@shared/types';
import { ZOOM_LEVELS } from '../constants';
import { MASTERING_PRESETS } from '../presets';
import { useAppStore, newId } from '../store';
import { AudioEngineState, AudioEngineActions } from '../hooks/useAudioEngine';
import { useClipClipboard } from '../hooks/useClipClipboard';
import { useKeyboardShortcuts, KeyboardShortcut } from '../hooks/useKeyboardShortcuts';
import { validateAudioFile, ExportFormat } from '../services/audioUtils';
import { getSnapTargets, snapTime, clampToFreeSpace, SNAP_THRESHOLD_PX } from '../services/timelineUtils';
import { notify } from './Toast';
import { t } from '../i18n';
import { UndoIcon, RedoIcon } from './icons';
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
    const isDirty = useAppStore(s => s.isDirty);
    const canUndo = useAppStore(s => s.canUndo);
    const canRedo = useAppStore(s => s.canRedo);
    const undo = useAppStore(s => s.undo);
    const redo = useAppStore(s => s.redo);

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

            // Measure the track rect NOW (drop time): a fresh rect already reflects
            // scroll position, so no scrollLeft math — the old approach double-counted
            // the scroll offset and used a rect captured at drag start.
            const trackElement = document.getElementById(`track-${track.id}`);
            const trackRect = trackElement?.getBoundingClientRect();
            const overlayLeft = event.active.rect.current.translated?.left ?? 0;

            const dropX = trackRect ? overlayLeft - trackRect.left : 0;
            let startTime = Math.max(0, dropX / pixelsPerSecond);

            // Snap to grid/edges/playhead, then resolve overlaps on the target track.
            const snapThreshold = SNAP_THRESHOLD_PX / pixelsPerSecond;
            startTime = snapTime(startTime, getSnapTargets(project, null, audioActions.getCurrentTime()), snapThreshold);
            const targetTrack = project.tracks.find(tr => tr.id === track.id);
            if (targetTrack) {
                startTime = clampToFreeSpace(targetTrack.clips, startTime, file.duration);
            }

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
            notify.error(t('toast.decodeFailed', { files: failed.join('\n') }));
        }
    }, [audioActions, addFiles, saveToHistory]);

    /** Import File objects dropped from the OS. */
    const handleFileDrop = useCallback(async (files: File[]) => {
        const candidates: ImportCandidate[] = [];
        for (const file of files) {
            const validation = validateAudioFile(file);
            if (!validation.isValid) {
                notify.warning(t('toast.fileSkipped', { name: file.name, error: validation.error ?? '' }));
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
            title: t('dialog.importAudio'),
            multiple: true,
            filters: [{ name: t('dialog.audioFiles'), extensions: ['wav', 'mp3', 'ogg', 'flac', 'aac', 'm4a'] }],
        });
        if (result.canceled || result.filePaths.length === 0) return;

        const candidates: ImportCandidate[] = [];
        for (const path of result.filePaths) {
            const name = path.split(/[\\/]/).pop() || path;
            try {
                candidates.push({ name, path, type: '', data: await bridge.readFile(path) });
            } catch {
                notify.error(t('toast.readFailed', { name }));
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
        const current = useAppStore.getState().project;
        const targetTrack = current?.tracks.find(tr => tr.id === trackId);
        const draft = clipboard.pasteClip(trackId, pasteTime);
        if (!draft) return;

        const startTime = targetTrack
            ? clampToFreeSpace(targetTrack.clips, draft.startTime, draft.duration)
            : draft.startTime;
        addClip(trackId, { ...draft, startTime });
    }, [clipboard, addClip]);

    // Keyboard shortcuts
    const keyboardShortcuts: KeyboardShortcut[] = useMemo(() => [
        {
            key: ' ',
            action: () => {
                audioActions.playPause();
            },
            description: 'Play / Pause'
        },
        {
            key: 's',
            action: () => {
                const selected = useAppStore.getState().selectedItem;
                if (selected?.type === 'clip') {
                    useAppStore.getState().splitClip(selected.id, audioActions.getCurrentTime());
                }
            },
            description: 'Split clip at playhead'
        },
        {
            key: 's',
            ctrlKey: true,
            action: () => {
                onSaveProject();
            },
            description: 'Save project'
        },
        {
            key: 'z',
            ctrlKey: true,
            action: () => {
                useAppStore.getState().undo();
            },
            description: 'Undo'
        },
        {
            key: 'y',
            ctrlKey: true,
            action: () => {
                useAppStore.getState().redo();
            },
            description: 'Redo'
        },
        {
            key: 'z',
            ctrlKey: true,
            shiftKey: true,
            action: () => {
                useAppStore.getState().redo();
            },
            description: 'Redo'
        },
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
                    handlePasteClip(selected.id, audioActions.getCurrentTime());
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
    ], [handleCopyClip, handlePasteClip, deleteClip, clipboard.hasClipboardContent, audioActions, onSaveProject]);

    useKeyboardShortcuts(keyboardShortcuts);

    if (!project) return null;

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
                {/* Master Studio Console Header */}
                <header className="bg-slate-900/95 px-4 py-2 border-b border-slate-800/90 flex items-center justify-between shadow-lg z-20 backdrop-blur-md">
                    <div className="flex items-center gap-3.5">
                        {/* Brand Badge */}
                        <div className="flex items-center gap-2.5 select-none">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center shadow-md shadow-purple-500/20">
                                <span className="text-white font-black text-xs tracking-tighter">RR</span>
                            </div>
                            <div className="hidden sm:block">
                                <div className="flex items-center gap-1.5 leading-none">
                                    <h1 className="text-xs font-black tracking-wider text-white">RUNTIME RADIO</h1>
                                    <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60 font-bold">PRO</span>
                                    {isDirty && (
                                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400/80" title="Modifiche non salvate" />
                                    )}
                                </div>
                                <span className="text-[9px] text-slate-400 tracking-wider uppercase font-semibold">Studio Console</span>
                            </div>
                        </div>

                        <span className="text-slate-700 hidden sm:inline">|</span>

                        {/* Editable Project Name */}
                        <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1 focus-within:border-purple-500 transition-colors shadow-inner">
                            <span className="text-xs text-slate-500">📁</span>
                            <input
                                type="text"
                                value={project.name}
                                onChange={(e) => useAppStore.getState().renameProject(e.target.value)}
                                placeholder={t('transport.untitled')}
                                aria-label={t('transport.projectName')}
                                className="bg-transparent text-xs text-slate-100 font-bold tracking-wide focus:outline-none max-w-[180px] sm:max-w-[220px] truncate"
                            />
                        </div>

                        {/* Quick Undo / Redo */}
                        <div className="flex items-center gap-0.5 border-l border-slate-800 pl-2">
                            <button
                                onClick={() => undo()}
                                disabled={!canUndo()}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md disabled:opacity-30 transition-colors"
                                title="Annulla (Ctrl+Z)"
                            >
                                <UndoIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => redo()}
                                disabled={!canRedo()}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md disabled:opacity-30 transition-colors"
                                title="Ripristina (Ctrl+Y)"
                            >
                                <RedoIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Master Transport & Metering */}
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
                        onMeterUpdate={audioActions.onMeterUpdate}
                        onTimeUpdate={audioActions.onTimeUpdate}
                    />
                </header>

                {/* Workspace Center (Sidebar + Timeline) */}
                <div className="flex flex-1 overflow-hidden">
                    <aside className="w-80 flex flex-col bg-slate-900/90 border-r border-slate-800 shadow-xl z-10 select-none">
                        <FileBin
                            files={project.files}
                            onFileDrop={handleFileDrop}
                            onImportClick={window.electron ? handleImportFiles : undefined}
                            onFileDelete={deleteFile}
                            onFileClick={(id) => setSelectedItem({ type: 'file', id })}
                        />
                        <PropertiesPanel selectedItem={selectedItem} project={project} />
                    </aside>
                    <main className="flex-1 flex flex-col overflow-y-auto bg-slate-950">
                        <Timeline
                            project={project}
                            updateProject={updateProject}
                            onInteractionStart={saveToHistory}
                            selectedItem={selectedItem}
                            onSelectItem={setSelectedItem}
                            onAddTrack={addTrack}
                            onDeleteTrack={deleteTrack}
                            onDeleteClip={deleteClip}
                            onSeek={audioActions.seek}
                            onTimeUpdate={audioActions.onTimeUpdate}
                            getCurrentTime={audioActions.getCurrentTime}
                            isPlaying={audioState.isPlaying}
                            pixelsPerSecond={pixelsPerSecond}
                            zoomIndex={zoomIndex}
                            onZoomChange={setZoomIndex}
                            hasClipboardContent={clipboard.hasClipboardContent}
                            onCopyClip={handleCopyClip}
                            onPasteClip={handlePasteClip}
                        />
                    </main>
                </div>

                {/* Studio Footer Status Bar */}
                <footer className="h-7 bg-slate-950 border-t border-slate-800/90 px-4 flex items-center justify-between text-[11px] text-slate-400 select-none shadow-sm z-20">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                            <span className="text-slate-300 font-mono text-[10px]">ENGINE READY</span>
                        </div>
                        <span className="text-slate-700">•</span>
                        <span className="text-slate-400 font-mono text-[10px]">44.1 kHz • PCM 16-BIT</span>
                        <span className="text-slate-700 hidden sm:inline">•</span>
                        <span className="hidden sm:inline">
                            {project.tracks.length} tracce ({project.tracks.flatMap(t => t.clips).length} clip, {project.files.length} file)
                        </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[10px] text-slate-500">
                        <span>[SPAZIO] PLAY/PAUSE</span>
                        <span>[S] SPLIT</span>
                        <span>[CANC] ELIMINA</span>
                        <span>[ALT] BYPASS SNAP</span>
                    </div>
                </footer>

                {/* Drag Overlay with Pro Card Design */}
                <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) }}>
                    {activeDragFile ? (
                        <div className="bg-slate-900/95 p-3 rounded-lg shadow-2xl border border-purple-500 min-w-[220px] pointer-events-none backdrop-blur-md">
                            <p className="text-xs font-bold text-white truncate">{activeDragFile.name}</p>
                            <p className="text-[10px] font-mono text-purple-300 mt-0.5">{activeDragFile.duration.toFixed(2)}s</p>
                        </div>
                    ) : null}
                </DragOverlay>
            </div>
        </DndContext>
    );
};

export default Editor;
