import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { cx } from "./utils";
import "./ui-overlay.css";

export type ToastTone = "success" | "info" | "error";

export interface ToastOptions {
  title: string;
  message?: string;
  tone?: ToastTone;
  /** ms até auto-dismiss (default 4000). */
  duration?: number;
}

export interface ToastContextValue {
  show: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
  success: (title: string, message?: string) => number;
  info: (title: string, message?: string) => number;
  error: (title: string, message?: string) => number;
}

interface ToastItem {
  id: number;
  title: string;
  message?: string;
  tone: ToastTone;
}

const TOAST_DURATION_MS = 4000;
const TONE_SYMBOL: Record<ToastTone, string> = {
  success: "✓",
  info: "i",
  error: "!",
};

const ToastContext = createContext<ToastContextValue | null>(null);

/** Acessa a API de toasts. Deve ser usado dentro de <ToastProvider>. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast deve ser usado dentro de <ToastProvider>.");
  }
  return ctx;
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}) {
  return (
    <div className={cx("ui-toast", `ui-toast--${toast.tone}`)} role="status">
      <span className="ui-toast__icon" aria-hidden="true">
        {TONE_SYMBOL[toast.tone]}
      </span>
      <div className="ui-toast__content">
        <div className="ui-toast__title">{toast.title}</div>
        {toast.message ? (
          <div className="ui-toast__msg">{toast.message}</div>
        ) : null}
      </div>
      <button
        type="button"
        className="ui-toast__close"
        aria-label="Fechar notificação"
        onClick={() => onDismiss(toast.id)}
      >
        ×
      </button>
    </div>
  );
}

/**
 * Provider de toasts Eyris — stack fixo top-right 320px, auto-dismiss 4s,
 * tons success/info/error.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (options: ToastOptions): number => {
      const id = nextId.current;
      nextId.current += 1;
      const item: ToastItem = {
        id,
        title: options.title,
        message: options.message,
        tone: options.tone ?? "info",
      };
      setToasts((prev) => [...prev, item]);
      const duration = options.duration ?? TOAST_DURATION_MS;
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      );
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      dismiss,
      success: (title, message) => show({ title, message, tone: "success" }),
      info: (title, message) => show({ title, message, tone: "info" }),
      error: (title, message) => show({ title, message, tone: "error" }),
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ui-toasts" aria-live="polite">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
