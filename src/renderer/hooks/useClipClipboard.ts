import { useState, useCallback } from 'react';
import { AudioClip } from '@shared/types';

export interface ClipboardClip extends Omit<AudioClip, 'id' | 'trackId'> {
  originalId: string;
  originalTrackId: string;
}

export const useClipClipboard = () => {
  const [clipboard, setClipboard] = useState<ClipboardClip | null>(null);

  const copyClip = useCallback((clip: AudioClip) => {
    const clipboardClip: ClipboardClip = {
      fileId: clip.fileId,
      startTime: clip.startTime,
      duration: clip.duration,
      offset: clip.offset,
      isLooped: clip.isLooped,
      originalId: clip.id,
      originalTrackId: clip.trackId,
    };
    setClipboard(clipboardClip);
  }, []);

  const pasteClip = useCallback((targetTrackId: string, pasteTime: number): AudioClip | null => {
    if (!clipboard) return null;

    return {
      id: `clip-${Date.now()}-${Math.random()}`,
      fileId: clipboard.fileId,
      trackId: targetTrackId,
      startTime: pasteTime,
      duration: clipboard.duration,
      offset: clipboard.offset,
      isLooped: clipboard.isLooped,
    };
  }, [clipboard]);

  const clearClipboard = useCallback(() => {
    setClipboard(null);
  }, []);

  const hasClipboardContent = clipboard !== null;

  return {
    copyClip,
    pasteClip,
    clearClipboard,
    hasClipboardContent,
    clipboardContent: clipboard,
  };
};