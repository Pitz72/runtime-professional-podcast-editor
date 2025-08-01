import '../types/electron.d.ts';

export async function invokeGemini(prompt: string): Promise<{ text?: string, error?: string }> {
  console.log("Invoking Gemini through secure channel...");
  if (window.api && window.api.invokeGemini) {
    try {
      const result = await window.api.invokeGemini(prompt);
      if (result.error) {
        console.error("Error from main process:", result.error);
        return { error: result.error };
      }
      return { text: result.text };
    } catch (error) {
      console.error("Error invoking Gemini via IPC:", error);
      return { error: 'Failed to communicate with the main process.' };
    }
  } else {
    console.error('Electron API is not available on the window object. Are you running in a browser?');
    // Return a mock error or handle as a fallback
    return { error: 'This feature is only available in the desktop app.' };
  }
}
