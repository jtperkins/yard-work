import { createContext, useContext, useId, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { cx } from './cx';

interface FieldContextValue {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export interface FieldControlProps {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
  required?: boolean;
  invalid?: boolean;
}

/**
 * Merges a control's own a11y props with the surrounding Field's (id, aria-describedby,
 * aria-invalid, required). Used by Input, Textarea, Select, DateInput and ComboInput.
 */
export function useFieldControl({
  id,
  'aria-describedby': describedBy,
  'aria-invalid': ariaInvalid,
  required,
  invalid,
}: FieldControlProps) {
  const field = useContext(FieldContext);
  const isInvalid =
    Boolean(
      invalid ?? (ariaInvalid !== undefined && ariaInvalid !== false && ariaInvalid !== 'false'),
    ) || !!field?.invalid;
  return {
    id: id ?? field?.id,
    'aria-describedby': [describedBy, field?.describedBy].filter(Boolean).join(' ') || undefined,
    'aria-invalid': isInvalid || undefined,
    required: required ?? field?.required,
  };
}

/** Shared visual recipe for text-like controls. */
export const controlClasses = cx(
  'w-full rounded-md border bg-surface-raised text-base text-ink shadow-[inset_0_1px_2px_rgb(0_0_0/0.04)] sm:text-sm',
  'placeholder:text-ink-subtle transition-[border-color,box-shadow] duration-(--duration-fast)',
  'border-line-strong hover:border-ink-subtle',
  'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20',
  'aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/20',
  'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-70',
);

export interface FieldProps {
  label: ReactNode;
  children: ReactNode;
  /** Helper text under the control. */
  hint?: ReactNode;
  /** Error message; marks the control invalid and is announced via aria-describedby. */
  error?: ReactNode;
  required?: boolean;
  /** Text shown after the label for optional fields, e.g. "optional". */
  optionalLabel?: string;
  /** Explicit control id (otherwise generated). */
  id?: string;
  className?: string;
}

/** Label + control + hint/error wiring. Wrap exactly one form control. */
export function Field({
  label,
  children,
  hint,
  error,
  required = false,
  optionalLabel,
  id,
  className,
}: FieldProps) {
  const generated = useId();
  const controlId = id ?? `field-${generated}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const value: FieldContextValue = {
    id: controlId,
    describedBy: [errorId, hintId].filter(Boolean).join(' ') || undefined,
    invalid: Boolean(error),
    required,
  };
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={controlId}
        className="flex items-baseline gap-2 text-sm font-semibold text-ink"
      >
        {label}
        {!required && optionalLabel && (
          <span className="text-xs font-normal text-ink-subtle">{optionalLabel}</span>
        )}
      </label>
      <FieldContext.Provider value={value}>{children}</FieldContext.Provider>
      {hint && (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-center gap-1 text-xs font-medium text-danger">
          <CircleAlert aria-hidden className="size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
