// types/electron.d.ts
export interface IElectronAPI {
  invokeGemini: (prompt: string) => Promise<{ text?: string, error?: string }>;
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}
