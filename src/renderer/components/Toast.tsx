import React, { useEffect } from 'react';
import { create } from 'zustand';

// Non-blocking notifications replacing window.alert(): a desktop app must
// never freeze the whole UI to report an error.

export type ToastType = 'info' | 'warning' | 'error';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (type: ToastType, message: string) => void;
  dismiss: (id: number) => void;
}

let nextToastId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (type, message) =>
    set(state => ({ toasts: [...state.toasts, { id: nextToastId++, type, message }] })),
  dismiss: (id) =>
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
}));

/** Imperative helper usable outside React components. */
export const notify = {
  info: (message: string) => useToastStore.getState().push('info', message),
  warning: (message: string) => useToastStore.getState().push('warning', message),
  error: (message: string) => useToastStore.getState().push('error', message),
};

const TOAST_STYLES: Record<ToastType, string> = {
  info: 'border-blue-500 bg-blue-950/95',
  warning: 'border-yellow-500 bg-yellow-950/95',
  error: 'border-red-500 bg-red-950/95',
};

const AUTO_DISMISS_MS = 6000;

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-xl text-sm text-gray-100 max-w-md whitespace-pre-line ${TOAST_STYLES[toast.type]}`}
    >
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-gray-400 hover:text-white leading-none text-lg"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore(s => s.toasts);
  const dismiss = useToastStore(s => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 items-end">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
};
