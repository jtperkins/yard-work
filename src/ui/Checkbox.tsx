import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cx } from './cx';

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onChange' | 'checked' | 'size'
> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Visible label (clicking it toggles). */
  label: ReactNode;
  /** Secondary line under the label. */
  description?: ReactNode;
  /** Strike the label through when checked (to-do / packing-list style). */
  strikeWhenChecked?: boolean;
  className?: string;
}

/** Checkbox with label. A native input underneath, so forms and keyboards just work. */
export function Checkbox({
  checked,
  onCheckedChange,
  label,
  description,
  strikeWhenChecked = false,
  className,
  id,
  disabled,
  ...rest
}: CheckboxProps) {
  const generated = useId();
  const inputId = id ?? `cb-${generated}`;
  const descId = description ? `${inputId}-desc` : undefined;
  return (
    <div className={cx('group flex items-start gap-3', disabled && 'opacity-60', className)}>
      <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-describedby={descId}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className={cx(
            'peer absolute inset-0 m-0 size-5 cursor-pointer appearance-none rounded-[5px] border-[1.5px] border-line-strong bg-surface-raised',
            'transition-colors duration-(--duration-fast) checked:border-primary checked:bg-primary hover:border-ink-subtle',
            'disabled:cursor-not-allowed',
          )}
          {...rest}
        />
        <Check
          aria-hidden
          strokeWidth={3}
          className="pointer-events-none relative size-3.5 text-primary-ink opacity-0 transition-opacity peer-checked:opacity-100"
        />
      </span>
      <span className="min-w-0">
        <label
          htmlFor={inputId}
          className={cx(
            'cursor-pointer text-sm font-medium text-ink transition-colors',
            checked && strikeWhenChecked && 'text-ink-muted line-through decoration-ink-subtle',
          )}
        >
          {label}
        </label>
        {description && (
          <span id={descId} className="block text-xs text-ink-muted">
            {description}
          </span>
        )}
      </span>
    </div>
  );
}
