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

  onMenuEvent(channel: string, callback: () => void): () => void;
}

declare global {
  interface Window {
    electron?: ElectronBridge;
  }
}

export {};
