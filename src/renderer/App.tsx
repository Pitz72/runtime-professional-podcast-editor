import React, { useCallback, useEffect, useRef, useState } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import Editor from './components/Editor';
import { ToastContainer, notify } from './components/Toast';
import { useAppStore } from './store';
import { useAudioEngine } from './hooks/useAudioEngine';
import { openProjectFromDisk, openProjectByPath, saveProjectToDisk, serializeProject, parseProject, hydrateProjectAudio, LoadResult } from './services/projectIO';
import { ExportFormat, getExportMimeType } from './services/audioUtils';
import { useI18nStore, t } from './i18n';

const AUTOSAVE_INTERVAL_MS = 60_000;

const App: React.FC = () => {
  const project = useAppStore(s => s.project);
  const newProject = useAppStore(s => s.newProject);
  const loadProject = useAppStore(s => s.loadProject);
  const markSaved = useAppStore(s => s.markSaved);
  const undo = useAppStore(s => s.undo);
  const redo = useAppStore(s => s.redo);
  const locale = useI18nStore(s => s.locale);

  const [audioState, audioActions] = useAudioEngine(project);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('wav');
  const recoveryCheckedRef = useRef(false);

  // Keep the native menu/dialog language in sync from startup.
  useEffect(() => {
    window.electron?.setLocale(locale);
  }, [locale]);

  /** Ask before throwing away unsaved changes. */
  const confirmDiscard = useCallback(async (): Promise<boolean> => {
    if (!useAppStore.getState().isDirty) return true;
    if (window.electron) {
      return window.electron.confirm({
        title: t('dialog.unsavedTitle'),
        message: t('dialog.unsavedMessage'),
        detail: t('dialog.unsavedDetail'),
        confirmLabel: t('dialog.discard'),
      });
    }
    return window.confirm(`${t('dialog.unsavedMessage')} ${t('dialog.unsavedDetail')}`);
  }, []);

  const applyLoadResult = useCallback((result: LoadResult | { project: LoadResult['project']; path: string | null; missingFiles: string[] }) => {
    audioActions.stop();
    loadProject(result.project, result.path);
    if (result.path) void window.electron?.addRecentProject(result.path);
    if (result.missingFiles.length > 0) {
      notify.warning(t('toast.missingFiles', { files: result.missingFiles.join('\n') }));
    }
  }, [audioActions, loadProject]);

  const handleNewProject = useCallback(async () => {
    if (!(await confirmDiscard())) return;
    audioActions.stop();
    void window.electron?.autosaveClear();
    newProject();
  }, [confirmDiscard, newProject, audioActions]);

  const handleOpenProject = useCallback(async () => {
    if (!(await confirmDiscard())) return;
    try {
      const result = await openProjectFromDisk(audioActions.decodeAudioData);
      if (!result) return;
      void window.electron?.autosaveClear();
      applyLoadResult(result);
    } catch (error) {
      notify.error(t('toast.openFailed', { error: error instanceof Error ? error.message : t('unknownError') }));
    }
  }, [confirmDiscard, applyLoadResult, audioActions]);

  const handleOpenRecent = useCallback(async (path: string) => {
    if (!(await confirmDiscard())) return;
    try {
      const result = await openProjectByPath(path, audioActions.decodeAudioData);
      void window.electron?.autosaveClear();
      applyLoadResult(result);
    } catch (error) {
      notify.error(t('toast.openFailed', { error: error instanceof Error ? error.message : t('unknownError') }));
    }
  }, [confirmDiscard, applyLoadResult, audioActions]);

  const handleSaveProject = useCallback(async (saveAs: boolean = false) => {
    const { project: current, projectPath: currentPath } = useAppStore.getState();
    if (!current) return;
    try {
      const savedPath = await saveProjectToDisk(current, currentPath, saveAs);
      if (savedPath) {
        markSaved(savedPath);
        void window.electron?.addRecentProject(savedPath);
        void window.electron?.autosaveClear();
        notify.info(t('toast.projectSaved'));
      }
    } catch (error) {
      notify.error(t('toast.saveFailed', { error: error instanceof Error ? error.message : t('unknownError') }));
    }
  }, [markSaved]);

  const handleExportAudio = useCallback(async (format?: ExportFormat) => {
    const { project: current } = useAppStore.getState();
    if (!current || !window.electron) return;
    const chosenFormat = format ?? exportFormat;
    try {
      const blob = await audioActions.exportAudio(chosenFormat);
      if (!blob) {
        notify.warning(t('toast.emptyProject'));
        return;
      }
      const dialogResult = await window.electron.saveFileDialog({
        title: t('dialog.exportAudio'),
        defaultPath: `${current.name.replace(/[\\/:*?"<>|\s]+/g, '_')}.${chosenFormat}`,
        filters: [{ name: getExportMimeType(chosenFormat), extensions: [chosenFormat] }],
      });
      if (dialogResult.canceled || !dialogResult.filePath) return;
      await window.electron.writeFile(dialogResult.filePath, await blob.arrayBuffer());
      notify.info(t('toast.exportedTo', { path: dialogResult.filePath }));
    } catch (error) {
      notify.error(t('toast.exportFailed', { error: error instanceof Error ? error.message : t('unknownError') }));
    }
  }, [audioActions, exportFormat]);

  // Crash-recovery: offer the autosave slot once at startup.
  useEffect(() => {
    if (recoveryCheckedRef.current || !window.electron) return;
    recoveryCheckedRef.current = true;

    void (async () => {
      const bridge = window.electron!;
      const slot = await bridge.autosaveRead();
      if (!slot?.data) return;

      const recover = await bridge.confirm({
        title: t('dialog.recoverTitle'),
        message: t('dialog.recoverMessage'),
        detail: t('dialog.recoverDetail'),
        confirmLabel: t('dialog.recover'),
      });
      if (!recover) {
        void bridge.autosaveClear();
        return;
      }

      try {
        const parsed = parseProject(slot.data);
        const { project: hydrated, missingFiles } = await hydrateProjectAudio(parsed, audioActions.decodeAudioData);
        applyLoadResult({ project: hydrated, path: slot.projectPath, missingFiles });
        // Recovered content is unsaved by definition.
        useAppStore.setState({ isDirty: true });
        notify.info(t('toast.projectRecovered'));
      } catch (error) {
        notify.error(t('toast.openFailed', { error: error instanceof Error ? error.message : t('unknownError') }));
      }
    })();
  }, [audioActions, applyLoadResult]);

  // Periodic autosave of unsaved work into the recovery slot.
  useEffect(() => {
    if (!window.electron) return;
    const interval = setInterval(() => {
      const { project: current, projectPath, isDirty: dirty } = useAppStore.getState();
      if (!current || !dirty) return;
      void window.electron?.autosaveWrite({
        projectPath,
        data: serializeProject(current),
      });
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Wire the native application menu to real actions.
  useEffect(() => {
    const bridge = window.electron;
    if (!bridge) return;
    const unsubscribers = [
      bridge.onMenuEvent('menu:new-project', () => { void handleNewProject(); }),
      bridge.onMenuEvent('menu:open-project', () => { void handleOpenProject(); }),
      bridge.onMenuEvent('menu:open-recent', (path) => {
        if (typeof path === 'string') void handleOpenRecent(path);
      }),
      bridge.onMenuEvent('menu:save-project', () => { void handleSaveProject(false); }),
      bridge.onMenuEvent('menu:save-project-as', () => { void handleSaveProject(true); }),
      bridge.onMenuEvent('menu:export-audio', () => { void handleExportAudio(); }),
      bridge.onMenuEvent('menu:undo', undo),
      bridge.onMenuEvent('menu:redo', redo),
    ];
    return () => unsubscribers.forEach(unsub => unsub());
  }, [handleNewProject, handleOpenProject, handleOpenRecent, handleSaveProject, handleExportAudio, undo, redo]);

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
          onOpenRecent={(path) => { void handleOpenRecent(path); }}
        />
      )}
      <ToastContainer />
    </div>
  );
};

export default App;
