import React, { useCallback, useEffect, useState } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import Editor from './components/Editor';
import { ToastContainer, notify } from './components/Toast';
import { useAppStore } from './store';
import { useAudioEngine } from './hooks/useAudioEngine';
import { openProjectFromDisk, saveProjectToDisk } from './services/projectIO';
import { ExportFormat, getExportMimeType } from './services/audioUtils';

const App: React.FC = () => {
  const project = useAppStore(s => s.project);
  const isDirty = useAppStore(s => s.isDirty);
  const newProject = useAppStore(s => s.newProject);
  const loadProject = useAppStore(s => s.loadProject);
  const markSaved = useAppStore(s => s.markSaved);
  const undo = useAppStore(s => s.undo);
  const redo = useAppStore(s => s.redo);

  const [audioState, audioActions] = useAudioEngine(project);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('wav');

  /** Ask before throwing away unsaved changes. */
  const confirmDiscard = useCallback(async (): Promise<boolean> => {
    if (!isDirty) return true;
    if (window.electron) {
      return window.electron.confirm({
        title: 'Unsaved Changes',
        message: 'The current project has unsaved changes.',
        detail: 'If you continue, your changes will be lost.',
        confirmLabel: 'Discard Changes',
      });
    }
    return window.confirm('The current project has unsaved changes. Discard them?');
  }, [isDirty]);

  const handleNewProject = useCallback(async () => {
    if (!(await confirmDiscard())) return;
    audioActions.stop();
    newProject();
  }, [confirmDiscard, newProject, audioActions]);

  const handleOpenProject = useCallback(async () => {
    if (!(await confirmDiscard())) return;
    try {
      const result = await openProjectFromDisk(audioActions.decodeAudioData);
      if (!result) return;
      audioActions.stop();
      loadProject(result.project, result.path);
      if (result.missingFiles.length > 0) {
        notify.warning(
          `Some audio files could not be loaded:\n${result.missingFiles.join('\n')}\n` +
          'Their clips are kept in the timeline but will stay silent until the files are restored.'
        );
      }
    } catch (error) {
      notify.error(`Could not open the project: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }, [confirmDiscard, loadProject, audioActions]);

  const handleSaveProject = useCallback(async (saveAs: boolean = false) => {
    const { project: current, projectPath: currentPath } = useAppStore.getState();
    if (!current) return;
    try {
      const savedPath = await saveProjectToDisk(current, currentPath, saveAs);
      if (savedPath) {
        markSaved(savedPath);
        notify.info('Project saved.');
      }
    } catch (error) {
      notify.error(`Could not save the project: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }, [markSaved]);

  const handleExportAudio = useCallback(async (format?: ExportFormat) => {
    const { project: current } = useAppStore.getState();
    if (!current || !window.electron) return;
    const chosenFormat = format ?? exportFormat;
    try {
      const blob = await audioActions.exportAudio(chosenFormat);
      if (!blob) {
        notify.warning('The project is empty. Add some clips before exporting.');
        return;
      }
      const dialogResult = await window.electron.saveFileDialog({
        title: 'Export Audio',
        defaultPath: `${current.name.replace(/[\\/:*?"<>|\s]+/g, '_')}.${chosenFormat}`,
        filters: [{ name: getExportMimeType(chosenFormat), extensions: [chosenFormat] }],
      });
      if (dialogResult.canceled || !dialogResult.filePath) return;
      await window.electron.writeFile(dialogResult.filePath, await blob.arrayBuffer());
      notify.info(`Audio exported to ${dialogResult.filePath}`);
    } catch (error) {
      notify.error(`Audio export failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }, [audioActions, exportFormat]);

  // Wire the native application menu to real actions.
  useEffect(() => {
    const bridge = window.electron;
    if (!bridge) return;
    const unsubscribers = [
      bridge.onMenuEvent('menu:new-project', () => { void handleNewProject(); }),
      bridge.onMenuEvent('menu:open-project', () => { void handleOpenProject(); }),
      bridge.onMenuEvent('menu:save-project', () => { void handleSaveProject(false); }),
      bridge.onMenuEvent('menu:save-project-as', () => { void handleSaveProject(true); }),
      bridge.onMenuEvent('menu:export-audio', () => { void handleExportAudio(); }),
      bridge.onMenuEvent('menu:undo', undo),
      bridge.onMenuEvent('menu:redo', redo),
    ];
    return () => unsubscribers.forEach(unsub => unsub());
  }, [handleNewProject, handleOpenProject, handleSaveProject, handleExportAudio, undo, redo]);

  return (
    <div className="h-screen w-screen bg-gray-900 text-gray-200 flex flex-col overflow-hidden">
      {project ? (
        <Editor
          audioState={audioState}
          audioActions={audioActions}
          onSaveProject={() => { void handleSaveProject(false); }}
          onExportAudio={(format) => { void handleExportAudio(format); }}
          exportFormat={exportFormat}
          onExportFormatChange={setExportFormat}
        />
      ) : (
        <WelcomeScreen
          onNewProject={() => { void handleNewProject(); }}
          onLoadProject={() => { void handleOpenProject(); }}
        />
      )}
      <ToastContainer />
    </div>
  );
};

export default App;
