import type { CSSProperties } from 'react';
import { cx } from './cx';

/** Initials for a display name: "Yard worker" → "YW", "JT" → "JT", "neighbor" → "N". */
export function initialsOf(name: string): string {
  const all = name.trim().split(/\s+/).filter(Boolean);
  // Skip separators such as "/" or "&" ("Vecino / Neighbor" → "VN").
  const lettered = all.filter((w) => /^[\p{L}\p{N}]/u.test(w));
  if (lettered.length === 0) return all.length === 0 ? '?' : all[0]!.charAt(0);
  const words = lettered;
  if (words.length === 1) {
    const w = words[0]!;
    // Keep short all-caps names (e.g. "JT") intact.
    return w.length <= 3 && w === w.toUpperCase() ? w : w.charAt(0).toUpperCase();
  }
  return (words[0]!.charAt(0) + words[1]!.charAt(0)).toUpperCase();
}

/** Stable chart slot (1–8) for a name, so a person keeps one colour everywhere. */
export function slotForName(name: string): number {
  let h = 0;
  for (const ch of name.trim().toLowerCase()) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return (h % 8) + 1;
}

const SIZE = { sm: 'size-6 text-[10px]', md: 'size-8 text-xs', lg: 'size-11 text-sm' } as const;

export interface AvatarProps {
  name: string;
  size?: keyof typeof SIZE;
  /** Chart colour slot 1–8; defaults to a stable hash of the name. */
  colorSlot?: number;
  /**
   * When true the avatar is announced (role="img", aria-label = name). Default false: avatars
   * usually sit next to the visible name and are decorative.
   */
  labelled?: boolean;
  className?: string;
}

/** Initials in a tinted circle. */
export function Avatar({ name, size = 'md', colorSlot, labelled = false, className }: AvatarProps) {
  const slot = colorSlot ?? slotForName(name);
  const style = {
    '--avatar': `var(--chart-${slot})`,
    backgroundColor: 'color-mix(in oklab, var(--avatar) 22%, var(--surface))',
    boxShadow: 'inset 0 0 0 1.5px color-mix(in oklab, var(--avatar) 55%, transparent)',
  } as CSSProperties;
  return (
    <span
      role={labelled ? 'img' : undefined}
      aria-label={labelled ? name : undefined}
      aria-hidden={labelled ? undefined : true}
      style={style}
      className={cx(
        'inline-grid shrink-0 select-none place-items-center rounded-full font-semibold tracking-wide text-ink',
        SIZE[size],
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
