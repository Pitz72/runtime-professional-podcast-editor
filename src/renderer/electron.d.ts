export interface FileDialogFilter {
  name: string;
  extensions: string[];
}

export interface ElectronBridge {
  platform: NodeJS.Platform;

  openFileDialog(options?: {
    title?: string;
    multiple?: boolean;
    filters?: FileDialogFilter[];
  }): Promise<{ canceled: boolean; filePaths: string[] }>;

  saveFileDialog(options?: {
    title?: string;
    defaultPath?: string;
    filters?: FileDialogFilter[];
  }): Promise<{ canceled: boolean; filePath?: string }>;

  confirm(options: {
    title?: string;
    message: string;
    detail?: string;
    confirmLabel?: string;
  }): Promise<boolean>;

  readFile(filePath: string): Promise<ArrayBuffer>;
  writeFile(filePath: string, data: string | ArrayBuffer): Promise<boolean>;
  fileExists(filePath: string): Promise<boolean>;

  getFilePath(file: File): string;

  setDirty(dirty: boolean): void;
  setLocale(locale: 'it' | 'en'): void;

  getRecentProjects(): Promise<string[]>;
  addRecentProject(projectPath: string): Promise<boolean>;

  autosaveWrite(payload: { projectPath: string | null; data: string }): Promise<boolean>;
  autosaveRead(): Promise<{ savedAt: number; projectPath: string | null; data: string } | null>;
  autosaveClear(): Promise<boolean>;

  onMenuEvent(channel: string, callback: (...args: unknown[]) => void): () => void;
}

declare global {
  interface Window {
    electron?: ElectronBridge;
  }
}

export {};
