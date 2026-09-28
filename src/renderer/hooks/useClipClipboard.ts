import { useState, useCallback } from 'react';
import { AudioClip } from '@shared/types';
import { newId } from '../store';

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
      fadeIn: clip.fadeIn,
      fadeOut: clip.fadeOut,
      originalId: clip.id,
      originalTrackId: clip.trackId,
    };
    setClipboard(clipboardClip);
  }, []);

  const pasteClip = useCallback((targetTrackId: string, pasteTime: number): AudioClip | null => {
    if (!clipboard) return null;

    return {
      id: newId('clip'),
      fileId: clipboard.fileId,
      trackId: targetTrackId,
      startTime: pasteTime,
      duration: clipboard.duration,
      offset: clipboard.offset,
      isLooped: clipboard.isLooped,
      fadeIn: clipboard.fadeIn,
      fadeOut: clipboard.fadeOut,
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