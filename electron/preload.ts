import { contextBridge, ipcRenderer } from 'electron';

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('api', {
  invokeGemini: (prompt: string) => ipcRenderer.invoke('gemini:invoke', prompt),
});

// --------- Preload scripts can be used to expose APIs to the renderer process safely.
// For example, you can expose a function that sends a message to the main process.
// contextBridge.exposeInMainWorld('myAPI', {
//   doAThing: () => ipcRenderer.send('do-a-thing'),
// });
