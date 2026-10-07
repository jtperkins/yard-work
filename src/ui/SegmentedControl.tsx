import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from './cx';
import type { IconComponent } from './types';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: IconComponent;
  /** Accessible name when `label` is not plain text (or is abbreviated). */
  ariaLabel?: string;
  /** BCP-47 language of the label, e.g. for a language switcher. */
  lang?: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group. */
  label: string;
  size?: 'sm' | 'md';
  /** Stretch segments to fill the container. */
  fullWidth?: boolean;
  className?: string;
}

/**
 * Single choice among a few options, shown as a segmented pill (`role="radiogroup"`).
 * Arrow keys move and select; only the selected segment is a tab stop.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  fullWidth = false,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
  const selectedIndex = options.findIndex((o) => o.value === value);
  const focusIndex = selectedIndex >= 0 ? selectedIndex : (enabled[0] ?? 0);

  const move = (from: number, delta: number) => {
    if (enabled.length === 0) return;
    const pos = enabled.indexOf(from);
    const next = enabled[(pos + delta + enabled.length) % enabled.length]!;
    refs.current[next]?.focus();
    onChange(options[next]!.value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        move(index, 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        move(index, -1);
        break;
      case 'Home':
        e.preventDefault();
        move(enabled[0]!, 0);
        break;
      case 'End':
        e.preventDefault();
        move(enabled[enabled.length - 1]!, 0);
        break;
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx(
        'inline-flex items-center gap-0.5 rounded-pill border border-line bg-surface-sunken p-0.5',
        fullWidth ? 'flex w-full' : 'w-fit max-w-full',
        className,
      )}
    >
      {options.map((o, i) => {
        const selected = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={o.ariaLabel}
            lang={o.lang}
            disabled={o.disabled}
            tabIndex={i === focusIndex ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cx(
              'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-pill font-semibold transition-[background-color,color,box-shadow] duration-(--duration-base) ease-out',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3.5 text-sm',
              fullWidth && 'flex-1',
              selected
                ? 'bg-surface-raised text-ink shadow-card'
                : 'text-ink-muted hover:text-ink disabled:opacity-40',
            )}
          >
            {Icon && <Icon aria-hidden className="size-4" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
