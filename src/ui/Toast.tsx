import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { cx } from './cx';
import type { IconComponent } from './types';

export type ToastTone = 'neutral' | 'success' | 'danger';

export interface ToastAction {
  label: string;
  /** Called when the action is pressed; the toast then dismisses itself. */
  onAction: () => void;
}

export interface ToastOptions {
  title: ReactNode;
  description?: ReactNode;
  tone?: ToastTone;
  /** One action button, e.g. Undo. */
  action?: ToastAction;
  /** Auto-dismiss after ms (default 5000, or 10000 with an action). `Infinity` to persist. */
  duration?: number;
  /** Reuse an id to replace an existing toast. */
  id?: string;
}

interface ToastRecord extends Required<Pick<ToastOptions, 'tone' | 'duration'>> {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ToastAction;
}

export interface ToastApi {
  /** Shows a toast; returns its id. */
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Access the toast API. Must be inside a ToastProvider. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}

export interface ToastProviderProps {
  children: ReactNode;
  /** Accessible name of the dismiss button. */
  dismissLabel?: string;
  /** Accessible name of the notifications region. */
  regionLabel?: string;
  /** Max toasts on screen (oldest dropped first). */
  max?: number;
  /**
   * Key (`KeyboardEvent.key`) that moves focus to the newest toast's action, e.g. Undo
   * (default `F8`). Escape — or using the toast — returns focus to where it was.
   */
  hotkey?: string;
  /** Read out after a toast that has an action, so keyboard users know how to reach it. */
  actionHint?: string;
}

let counter = 0;

/**
 * Holds toast state and renders the Toaster region (portal to body). Toasts are announced through
 * two always-mounted live regions (polite, and assertive for `danger`), because screen readers
 * often skip live regions that arrive already filled in.
 */
export function ToastProvider({
  children,
  dismissLabel = 'Dismiss',
  regionLabel = 'Notifications',
  max = 3,
  hotkey = 'F8',
  actionHint = `Press ${hotkey} to reach it.`,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const regionRef = useRef<HTMLElement>(null);
  /** Where focus was before the hotkey jumped into the region. */
  const returnFocus = useRef<HTMLElement | null>(null);

  const dismiss = useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (o: ToastOptions) => {
      counter += 1;
      const id = o.id ?? `toast-${counter}`;
      const record: ToastRecord = {
        id,
        title: o.title,
        description: o.description,
        action: o.action,
        tone: o.tone ?? 'neutral',
        duration: o.duration ?? (o.action ? 10_000 : 5000),
      };
      setToasts((list) => [...list.filter((t) => t.id !== id), record].slice(-max));
      return id;
    },
    [max],
  );

  const restoreFocus = useCallback(() => {
    const target = returnFocus.current;
    returnFocus.current = null;
    if (target?.isConnected) target.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== hotkey || event.altKey || event.ctrlKey || event.metaKey) return;
      const region = regionRef.current;
      const items = region?.querySelectorAll<HTMLElement>('[data-toast]');
      const newest = items?.[items.length - 1];
      const target =
        newest?.querySelector<HTMLElement>('[data-toast-action]') ??
        newest?.querySelector<HTMLElement>('button');
      if (!region || !target) return;
      event.preventDefault();
      if (
        !region.contains(document.activeElement) &&
        document.activeElement instanceof HTMLElement
      ) {
        returnFocus.current = document.activeElement;
      }
      target.focus();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [hotkey]);

  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster
        regionRef={regionRef}
        toasts={toasts}
        onDismiss={dismiss}
        onReturnFocus={restoreFocus}
        dismissLabel={dismissLabel}
        regionLabel={regionLabel}
        actionHint={actionHint}
      />
    </ToastContext.Provider>
  );
}

interface ToasterProps {
  regionRef: RefObject<HTMLElement | null>;
  toasts: readonly ToastRecord[];
  onDismiss: (id: string) => void;
  onReturnFocus: () => void;
  dismissLabel: string;
  regionLabel: string;
  actionHint: string;
}

function latest(toasts: readonly ToastRecord[], danger: boolean): ToastRecord | undefined {
  for (let i = toasts.length - 1; i >= 0; i -= 1) {
    const t = toasts[i];
    if (t && (t.tone === 'danger') === danger) return t;
  }
  return undefined;
}

/** Screen-reader text for one toast; keyed by id so a repeat of the same text is re-announced. */
function Announcement({ toast: t, actionHint }: { toast: ToastRecord; actionHint: string }) {
  return (
    <span>
      {t.title}
      {t.description ? <>. {t.description}</> : null}
      {t.action ? <>. {actionHint}</> : null}
    </span>
  );
}

/** The on-screen stack. Sits above the mobile tab bar; bottom-right on desktop. */
function Toaster({
  regionRef,
  toasts,
  onDismiss,
  onReturnFocus,
  dismissLabel,
  regionLabel,
  actionHint,
}: ToasterProps) {
  if (typeof document === 'undefined') return null;
  const polite = latest(toasts, false);
  const assertive = latest(toasts, true);
  return createPortal(
    <section
      ref={regionRef}
      aria-label={regionLabel}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onReturnFocus();
      }}
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-3 md:bottom-6 md:left-auto md:right-6 md:items-end md:px-0 print:hidden"
    >
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {polite && <Announcement key={polite.id} toast={polite} actionHint={actionHint} />}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
        {assertive && <Announcement key={assertive.id} toast={assertive} actionHint={actionHint} />}
      </div>
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          toast={t}
          onDismiss={onDismiss}
          onReturnFocus={onReturnFocus}
          dismissLabel={dismissLabel}
        />
      ))}
    </section>,
    document.body,
  );
}

const TONE_ICON: Record<ToastTone, { icon: IconComponent; cls: string }> = {
  neutral: { icon: Info, cls: 'text-ink-inverse/70' },
  success: { icon: CircleCheck, cls: 'text-success-soft' },
  danger: { icon: CircleAlert, cls: 'text-danger-soft' },
};

function ToastItem({
  toast: t,
  onDismiss,
  onReturnFocus,
  dismissLabel,
}: {
  toast: ToastRecord;
  onDismiss: (id: string) => void;
  onReturnFocus: () => void;
  dismissLabel: string;
}) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(t.duration);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paused || !Number.isFinite(remaining.current)) return;
    const started = Date.now();
    const timer = setTimeout(() => onDismiss(t.id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - started;
    };
  }, [paused, onDismiss, t.id]);

  /** Closing a toast that holds focus hands focus back instead of dropping it on <body>. */
  const close = () => {
    if (ref.current?.contains(document.activeElement)) onReturnFocus();
    onDismiss(t.id);
  };

  const { icon: Icon, cls } = TONE_ICON[t.tone];
  return (
    <div
      ref={ref}
      data-toast=""
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-card bg-ink py-3 pl-4 pr-2 text-ink-inverse shadow-raised"
    >
      <Icon aria-hidden className={cx('mt-0.5 size-5 shrink-0', cls)} />
      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-sm font-semibold">{t.title}</p>
        {t.description && <p className="mt-0.5 text-sm text-ink-inverse/75">{t.description}</p>}
      </div>
      {t.action && (
        <button
          type="button"
          data-toast-action=""
          onClick={() => {
            t.action?.onAction();
            close();
          }}
          className="h-8 shrink-0 rounded-sm px-3 text-sm font-bold uppercase tracking-wider text-accent-soft transition-colors hover:bg-ink-inverse/10"
        >
          {t.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label={dismissLabel}
        title={dismissLabel}
        onClick={close}
        className="grid size-8 shrink-0 place-items-center rounded-sm text-ink-inverse/70 transition-colors hover:bg-ink-inverse/10 hover:text-ink-inverse"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
