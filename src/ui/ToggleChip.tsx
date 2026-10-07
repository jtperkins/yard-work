import type { ButtonHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { swatchStyle } from './CategoryChip';
import { cx } from './cx';

export interface ToggleChipProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange' | 'children'
> {
  label: string;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  /** Optional colour token (e.g. `cat-lawn`) shown as a dot. */
  color?: string;
  /** Optional count shown after the label. */
  count?: number;
}

/** Pressable filter chip (`aria-pressed`), e.g. for filtering a list by category or person. */
export function ToggleChip({
  label,
  pressed,
  onPressedChange,
  color,
  count,
  className,
  ...rest
}: ToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      style={color ? swatchStyle(color) : undefined}
      className={cx(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-pill border px-3 text-sm font-medium transition-colors duration-(--duration-fast)',
        pressed
          ? 'border-primary bg-primary-soft text-primary-soft-ink'
          : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink',
        className,
      )}
      {...rest}
    >
      {pressed ? (
        <Check aria-hidden className="size-3.5" />
      ) : (
        color && <span aria-hidden className="size-2 rounded-full bg-(--swatch)" />
      )}
      {label}
      {count !== undefined && <span className="tabular-nums text-xs text-ink-subtle">{count}</span>}
    </button>
  );
}
