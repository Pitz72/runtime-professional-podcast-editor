// Lightweight i18n: Italian + US English, no external dependencies.
// The locale is persisted in localStorage and mirrored to the main process
// so the native menu and system dialogs follow the same language.

import { create } from 'zustand';

export type Locale = 'it' | 'en';

const en = {
  // Welcome
  'welcome.tagline': 'Compose your show from music, ambience, voice tracks and sound effects. Arrange clips on a multi-track timeline, apply mastering and audio presets, and export the final mix to WAV or MP3.',
  'welcome.newProject': 'New Project',
  'welcome.loadProject': 'Load Project',
  'welcome.version': 'Version',
  'welcome.createdBy': 'Created by',
  'welcome.recentProjects': 'Recent projects',
  'welcome.language': 'Language',

  // Transport
  'transport.mastering': 'Mastering:',
  'transport.save': 'Save',
  'transport.format': 'Format:',
  'transport.export': 'Export',
  'transport.exporting': 'Exporting...',
  'transport.play': 'Play',
  'transport.pause': 'Pause',
  'transport.stop': 'Stop',

  // File bin
  'fileBin.title': 'File Bin',
  'fileBin.import': '+ Import',
  'fileBin.dropHint': 'Drag & drop compatible audio files here.\n(mp3, wav, ogg, flac)',
  'fileBin.deleteFile': 'Delete file',

  // Properties
  'properties.title': 'Properties',
  'properties.selectHint': 'Select a track, clip, or file to see its properties.',
  'properties.trackNotFound': 'Track not found.',
  'properties.clipNotFound': 'Clip not found.',
  'properties.fileNotFound': 'File not found.',
  'properties.type': 'Type',
  'properties.volume': 'Volume',
  'properties.ducking': 'Automatic Ducking',
  'properties.duckingDesc': 'Lowers volume when voice is present.',
  'properties.presets': 'Audio Presets',
  'properties.presetsDesc': 'Choose a preset to enhance the audio.',
  'properties.noPreset': '- No Preset -',
  'properties.clipProperties': 'Clip Properties',
  'properties.startTime': 'Start Time',
  'properties.duration': 'Duration',
  'properties.track': 'Track',
  'properties.loopClip': 'Loop Clip',
  'properties.loopDesc': 'Repeats this clip for the entire project duration.',
  'properties.fileProperties': 'File Properties',
  'properties.path': 'Path',
  'properties.noPath': 'This file has no path on disk and will not reload after saving the project.',
  'properties.notLoaded': 'Audio not loaded: the file was missing when the project was opened.',

  // Timeline
  'timeline.addVoiceTrack': 'Add Voice Track',
  'timeline.addMusicTrack': 'Add Music Track',
  'timeline.zoom': 'Zoom',
  'timeline.deleteTrack': 'Delete track {name}',
  'timeline.pasteHere': 'Paste here',
  'timeline.copyClip': 'Copy clip',
  'timeline.deleteClip': 'Delete clip',

  // Toasts / errors
  'toast.projectSaved': 'Project saved.',
  'toast.exportedTo': 'Audio exported to {path}',
  'toast.exportFailed': 'Audio export failed: {error}',
  'toast.saveFailed': 'Could not save the project: {error}',
  'toast.openFailed': 'Could not open the project: {error}',
  'toast.missingFiles': 'Some audio files could not be loaded:\n{files}\nTheir clips are kept in the timeline but will stay silent until the files are restored.',
  'toast.emptyProject': 'The project is empty. Add some clips before exporting.',
  'toast.fileSkipped': 'File "{name}" was skipped: {error}',
  'toast.decodeFailed': 'Could not decode the following files:\n{files}',
  'toast.readFailed': 'Could not read file: {name}',
  'toast.projectRecovered': 'Unsaved project recovered from the automatic backup.',

  // Dialogs (renderer-initiated, shown natively)
  'dialog.unsavedTitle': 'Unsaved Changes',
  'dialog.unsavedMessage': 'The current project has unsaved changes.',
  'dialog.unsavedDetail': 'If you continue, your changes will be lost.',
  'dialog.discard': 'Discard Changes',
  'dialog.recoverTitle': 'Recover Project',
  'dialog.recoverMessage': 'An automatic backup with unsaved changes was found.',
  'dialog.recoverDetail': 'Do you want to recover it?',
  'dialog.recover': 'Recover',

  'dialog.openProject': 'Open Project',
  'dialog.saveProject': 'Save Project',
  'dialog.exportAudio': 'Export Audio',
  'dialog.importAudio': 'Import Audio Files',
  'dialog.audioFiles': 'Audio Files',
  'dialog.projectFiles': 'Project Files',

  'unknownError': 'unknown error',
} as const;

const it: Record<TranslationKey, string> = {
  // Welcome
  'welcome.tagline': 'Componi la tua trasmissione con musica, ambienti, tracce voce ed effetti sonori. Disponi i clip su una timeline multitraccia, applica mastering e preset audio, ed esporta il mix finale in WAV o MP3.',
  'welcome.newProject': 'Nuovo Progetto',
  'welcome.loadProject': 'Apri Progetto',
  'welcome.version': 'Versione',
  'welcome.createdBy': 'Creato da',
  'welcome.recentProjects': 'Progetti recenti',
  'welcome.language': 'Lingua',

  // Transport
  'transport.mastering': 'Mastering:',
  'transport.save': 'Salva',
  'transport.format': 'Formato:',
  'transport.export': 'Esporta',
  'transport.exporting': 'Esportazione...',
  'transport.play': 'Riproduci',
  'transport.pause': 'Pausa',
  'transport.stop': 'Stop',

  // File bin
  'fileBin.title': 'Archivio File',
  'fileBin.import': '+ Importa',
  'fileBin.dropHint': 'Trascina qui i file audio compatibili.\n(mp3, wav, ogg, flac)',
  'fileBin.deleteFile': 'Elimina file',

  // Properties
  'properties.title': 'Proprietà',
  'properties.selectHint': 'Seleziona una traccia, un clip o un file per vederne le proprietà.',
  'properties.trackNotFound': 'Traccia non trovata.',
  'properties.clipNotFound': 'Clip non trovato.',
  'properties.fileNotFound': 'File non trovato.',
  'properties.type': 'Tipo',
  'properties.volume': 'Volume',
  'properties.ducking': 'Ducking Automatico',
  'properties.duckingDesc': 'Abbassa il volume quando è presente la voce.',
  'properties.presets': 'Preset Audio',
  'properties.presetsDesc': 'Scegli un preset per migliorare l\'audio.',
  'properties.noPreset': '- Nessun Preset -',
  'properties.clipProperties': 'Proprietà Clip',
  'properties.startTime': 'Inizio',
  'properties.duration': 'Durata',
  'properties.track': 'Traccia',
  'properties.loopClip': 'Clip in Loop',
  'properties.loopDesc': 'Ripete questo clip per l\'intera durata del progetto.',
  'properties.fileProperties': 'Proprietà File',
  'properties.path': 'Percorso',
  'properties.noPath': 'Questo file non ha un percorso su disco e non verrà ricaricato dopo il salvataggio del progetto.',
  'properties.notLoaded': 'Audio non caricato: il file era mancante all\'apertura del progetto.',

  // Timeline
  'timeline.addVoiceTrack': 'Aggiungi Traccia Voce',
  'timeline.addMusicTrack': 'Aggiungi Traccia Musica',
  'timeline.zoom': 'Zoom',
  'timeline.deleteTrack': 'Elimina traccia {name}',
  'timeline.pasteHere': 'Incolla qui',
  'timeline.copyClip': 'Copia clip',
  'timeline.deleteClip': 'Elimina clip',

  // Toasts / errors
  'toast.projectSaved': 'Progetto salvato.',
  'toast.exportedTo': 'Audio esportato in {path}',
  'toast.exportFailed': 'Esportazione audio fallita: {error}',
  'toast.saveFailed': 'Impossibile salvare il progetto: {error}',
  'toast.openFailed': 'Impossibile aprire il progetto: {error}',
  'toast.missingFiles': 'Alcuni file audio non sono stati caricati:\n{files}\nI loro clip restano nella timeline ma rimarranno muti finché i file non saranno ripristinati.',
  'toast.emptyProject': 'Il progetto è vuoto. Aggiungi qualche clip prima di esportare.',
  'toast.fileSkipped': 'File "{name}" saltato: {error}',
  'toast.decodeFailed': 'Impossibile decodificare i seguenti file:\n{files}',
  'toast.readFailed': 'Impossibile leggere il file: {name}',
  'toast.projectRecovered': 'Progetto non salvato recuperato dal backup automatico.',

  // Dialogs
  'dialog.unsavedTitle': 'Modifiche non salvate',
  'dialog.unsavedMessage': 'Il progetto corrente ha modifiche non salvate.',
  'dialog.unsavedDetail': 'Se continui, le modifiche andranno perse.',
  'dialog.discard': 'Scarta le modifiche',
  'dialog.recoverTitle': 'Recupera Progetto',
  'dialog.recoverMessage': 'È stato trovato un backup automatico con modifiche non salvate.',
  'dialog.recoverDetail': 'Vuoi recuperarlo?',
  'dialog.recover': 'Recupera',

  'dialog.openProject': 'Apri Progetto',
  'dialog.saveProject': 'Salva Progetto',
  'dialog.exportAudio': 'Esporta Audio',
  'dialog.importAudio': 'Importa File Audio',
  'dialog.audioFiles': 'File Audio',
  'dialog.projectFiles': 'File Progetto',

  'unknownError': 'errore sconosciuto',
};

export type TranslationKey = keyof typeof en;

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { en, it };

const STORAGE_KEY = 'rrpt-locale';

export function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'it' || stored === 'en') return stored;
  } catch { /* storage unavailable */ }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('it') ? 'it' : 'en';
}

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useI18nStore = create<I18nState>((set) => ({
  locale: detectLocale(),
  setLocale: (locale) => {
    try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* storage unavailable */ }
    window.electron?.setLocale(locale);
    set({ locale });
  },
}));

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}

/** Reactive hook: re-renders on locale change. */
export function useT() {
  const locale = useI18nStore(s => s.locale);
  return (key: TranslationKey, params?: Record<string, string | number>) =>
    interpolate(dictionaries[locale][key], params);
}

/** Imperative translation for non-component code (toasts, services). */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  return interpolate(dictionaries[useI18nStore.getState().locale][key], params);
}
