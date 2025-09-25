import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Find matching shortcut
    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatches = !!event.ctrlKey === !!shortcut.ctrlKey;
      const shiftMatches = !!event.shiftKey === !!shortcut.shiftKey;
      const altMatches = !!event.altKey === !!shortcut.altKey;
      const metaMatches = !!event.metaKey === !!shortcut.metaKey;

      return keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches;
    });

    if (matchingShortcut) {
      event.preventDefault();
      event.stopPropagation();
      matchingShortcut.action();
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Return shortcut descriptions for UI display
  const getShortcutDescriptions = useCallback(() => {
    return shortcuts.map(shortcut => {
      const modifiers = [];
      if (shortcut.ctrlKey) modifiers.push('Ctrl');
      if (shortcut.shiftKey) modifiers.push('Shift');
      if (shortcut.altKey) modifiers.push('Alt');
      if (shortcut.metaKey) modifiers.push('Cmd');

      const keyCombo = [...modifiers, shortcut.key.toUpperCase()].join(' + ');
      return {
        combo: keyCombo,
        description: shortcut.description,
      };
    });
  }, [shortcuts]);

  return {
    getShortcutDescriptions,
  };
};