import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { cn } from '../../lib/cn';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, string> = {
  success: 'border-slate-200 text-slate-800',
  error: 'border-red-200 text-slate-800',
  info: 'border-slate-200 text-slate-800',
};

const toneIcons: Record<ToastTone, typeof CircleCheck> = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
};

const toneIconClasses: Record<ToastTone, string> = {
  success: 'text-emerald-600',
  error: 'text-red-600',
  info: 'text-slate-500',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const timers = useRef<number[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      counter.current += 1;
      const id = counter.current;
      setToasts((current) => [...current, { id, message, tone }]);

      const timer = window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 4500);
      timers.current.push(timer);
    },
    [],
  );

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6"
      >
        {toasts.map((toast) => {
          const Icon = toneIcons[toast.tone];
          return (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg shadow-slate-900/10',
                toneStyles[toast.tone],
              )}
            >
              <Icon
                className={cn('mt-0.5 h-4 w-4 shrink-0', toneIconClasses[toast.tone])}
                aria-hidden
              />
              <p className="flex-1 text-xs leading-relaxed">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Fechar aviso"
                className="-mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast precisa estar dentro de ToastProvider.');
  }
  return context;
}
