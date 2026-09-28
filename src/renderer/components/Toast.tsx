import React, { useEffect } from 'react';
import { create } from 'zustand';
import { InfoIcon } from './icons';

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

const TOAST_CONFIG: Record<
  ToastType,
  { bg: string; border: string; text: string; iconBg: string; badge: string }
> = {
  info: {
    bg: 'bg-slate-900/95',
    border: 'border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]',
    text: 'text-slate-100',
    iconBg: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40',
    badge: 'INFO',
  },
  warning: {
    bg: 'bg-slate-900/95',
    border: 'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
    text: 'text-slate-100',
    iconBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/40',
    badge: 'AVVISO',
  },
  error: {
    bg: 'bg-slate-900/95',
    border: 'border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.2)]',
    text: 'text-slate-100',
    iconBg: 'bg-red-500/20 text-red-400 border border-red-500/40',
    badge: 'ERRORE',
  },
};

const AUTO_DISMISS_MS = 6000;

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: number) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const config = TOAST_CONFIG[toast.type];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-md shadow-2xl max-w-md whitespace-pre-line transition-all transform animate-in slide-in-from-right duration-200 ${config.bg} ${config.border}`}
    >
      <div className={`p-1 rounded-lg shrink-0 ${config.iconBg}`}>
        {toast.type === 'error' ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        ) : toast.type === 'warning' ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        ) : (
          <InfoIcon className="w-4 h-4" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[9px] font-mono font-bold tracking-wider uppercase text-slate-400">
            {config.badge}
          </span>
        </div>
        <p className={`text-xs font-medium leading-relaxed ${config.text}`}>{toast.message}</p>
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="text-slate-500 hover:text-slate-200 transition-colors p-1 leading-none -mr-1 -mt-1 rounded"
        aria-label="Chiudi notifica"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore(s => s.toasts);
  const dismiss = useToastStore(s => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-9 right-4 z-[100] flex flex-col gap-2.5 items-end pointer-events-auto">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
};
