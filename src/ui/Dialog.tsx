import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { cx } from './cx';
import { getFocusable } from './internal/focusable';

let openCount = 0;

export interface DialogProps {
  open: boolean;
  /** Called on Esc, backdrop click or the close button. */
  onClose: () => void;
  /** Dialog heading (also its accessible name). */
  title: ReactNode;
  /** Supporting text under the title (its accessible description). */
  description?: ReactNode;
  children?: ReactNode;
  /** Sticky action row at the bottom (buttons). */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Accessible label of the close button. */
  closeLabel?: string;
  /** Element to focus on open; defaults to the first focusable element in the body. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Close when the backdrop is clicked (default true). */
  closeOnBackdrop?: boolean;
}

interface ModalProps extends DialogProps {
  variant: 'dialog' | 'sheet';
}

const WIDTH = {
  dialog: { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' },
  sheet: { sm: 'md:max-w-sm', md: 'md:max-w-lg', lg: 'md:max-w-2xl' },
} as const;

/** Shared engine for Dialog and Sheet: portal, scrim, focus trap, Esc, scroll lock, focus restore. */
function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeLabel = 'Close',
  initialFocusRef,
  closeOnBackdrop = true,
  variant,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    openCount += 1;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const target =
      initialFocusRef?.current ??
      (bodyRef.current && getFocusable(bodyRef.current)[0]) ??
      panelRef.current;
    target?.focus();

    return () => {
      openCount -= 1;
      if (openCount === 0) document.body.style.overflow = prevOverflow;
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, [open, initialFocusRef]);

  if (!open) return null;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCloseRef.current();
      return;
    }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const items = getFocusable(panelRef.current);
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const sheet = variant === 'sheet';

  return createPortal(
    <div
      className={cx(
        'fixed inset-0 z-50 flex justify-center',
        sheet ? 'items-end md:items-center md:p-6' : 'items-end p-0 sm:items-center sm:p-6',
      )}
    >
      <div
        aria-hidden
        data-testid="dialog-backdrop"
        className="absolute inset-0 animate-fade-in bg-overlay backdrop-blur-[2px]"
        onMouseDown={closeOnBackdrop ? () => onCloseRef.current() : undefined}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cx(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden border border-line bg-surface shadow-raised outline-none',
          sheet
            ? 'animate-sheet-up rounded-t-[22px] pb-[env(safe-area-inset-bottom)] md:animate-pop-in md:rounded-card md:pb-0'
            : 'animate-sheet-up rounded-t-[22px] pb-[env(safe-area-inset-bottom)] sm:animate-pop-in sm:rounded-card sm:pb-0',
          WIDTH[variant][size],
        )}
      >
        {sheet && (
          <span
            aria-hidden
            className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-pill bg-line-strong md:hidden"
          />
        )}
        <div className="flex items-start gap-3 px-5 pb-2 pt-4 sm:px-6 sm:pt-5">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-display text-xl font-semibold leading-tight text-ink">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm text-ink-muted">
                {description}
              </p>
            )}
          </div>
          <IconButton
            label={closeLabel}
            icon={X}
            size="sm"
            onClick={() => onCloseRef.current()}
            className="-mr-1.5 -mt-0.5"
          />
        </div>
        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-2 sm:px-6">
          {children}
        </div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-line bg-surface-sunken/50 px-5 py-3 sm:flex-row sm:justify-end sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Modal dialog: `role="dialog"`, `aria-modal`, focus trap, Esc / backdrop to close, focus
 * restored on close, body scroll locked. A bottom panel on phones, centred card from `sm`.
 */
export function Dialog(props: DialogProps) {
  return <Modal {...props} variant="dialog" />;
}

/**
 * Bottom sheet on phones (with grab handle), centred dialog from `md`. Same behaviour and props
 * as Dialog — use it for task flows like signing off work.
 */
export function Sheet(props: DialogProps) {
  return <Modal {...props} variant="sheet" />;
}

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Accessible name of the close (×) button; pass the translated "Close". */
  closeLabel?: string;
  /** `danger` for destructive actions (default). */
  tone?: 'danger' | 'primary';
  /** Shows a spinner on the confirm button. */
  busy?: boolean;
}

/** Yes/no confirmation built on Dialog. Focus starts on Cancel (the safe choice). */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  closeLabel,
  tone = 'danger',
  busy = false,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      closeLabel={closeLabel}
      size="sm"
      initialFocusRef={cancelRef}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            loading={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
