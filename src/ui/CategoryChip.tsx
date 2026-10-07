import type { CSSProperties } from 'react';
import { cx } from './cx';

/** Inline style that exposes a colour token (and its `-soft` tint) as --swatch / --swatch-soft. */
export function swatchStyle(color: string): CSSProperties {
  return {
    '--swatch': `var(--${color})`,
    '--swatch-soft': `var(--${color}-soft, color-mix(in oklab, var(--${color}) 18%, var(--surface)))`,
  } as CSSProperties;
}

export interface CategoryDotProps {
  /** Colour token name, e.g. `cat-lawn` (see src/styles/tokens.css). */
  color: string;
  size?: 'sm' | 'md';
  /** Hollow ring instead of a filled dot (e.g. projected / not-yet-done). */
  hollow?: boolean;
  /** Accessible name; omit when adjacent text already names it (dot is then decorative). */
  label?: string;
  className?: string;
}

/** A small colour dot carrying category identity next to text. */
export function CategoryDot({
  color,
  size = 'md',
  hollow = false,
  label,
  className,
}: CategoryDotProps) {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={swatchStyle(color)}
      className={cx(
        'inline-block shrink-0 rounded-full',
        size === 'sm' ? 'size-2' : 'size-2.5',
        hollow ? 'border-[1.5px] border-(--swatch) bg-transparent' : 'bg-(--swatch)',
        className,
      )}
    />
  );
}

export interface CategoryChipProps {
  label: string;
  /** Colour token name, e.g. `cat-lawn`. The chip uses the token and its `-soft` tint. */
  color: string;
  size?: 'sm' | 'md';
  className?: string;
}

/** Tinted pill naming a category, with its colour dot. Non-interactive (see ToggleChip). */
export function CategoryChip({ label, color, size = 'sm', className }: CategoryChipProps) {
  return (
    <span
      style={swatchStyle(color)}
      className={cx(
        'inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-pill bg-(--swatch-soft) font-medium text-ink',
        size === 'sm' ? 'h-6 px-2 text-xs' : 'h-7 px-2.5 text-sm',
        className,
      )}
    >
      <span aria-hidden className="size-2 shrink-0 rounded-full bg-(--swatch)" />
      <span className="truncate">{label}</span>
    </span>
  );
}
