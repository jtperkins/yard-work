import { swatchStyle } from './CategoryChip';
import { cx } from './cx';

/**
 * What a calendar mark stands for: `done` (filled dot), `due` (hollow ring — projected, not
 * yet done) or `planned` (small tinted square — on the plan, not yet done).
 */
export type DayMarkKind = 'done' | 'due' | 'planned';

export interface DayMarkProps {
  kind: DayMarkKind;
  /** Colour token (e.g. `cat-lawn`). Defaults to a neutral ink tone. */
  color?: string;
  /** Accessible name; omit when nearby text names it (the mark is then decorative). */
  label?: string;
  className?: string;
}

const SHAPE: Record<DayMarkKind, string> = {
  done: 'rounded-full bg-(--swatch)',
  due: 'rounded-full border-[1.5px] border-(--swatch) bg-transparent',
  planned: 'rounded-[2px] border-[1.5px] border-(--swatch) bg-(--swatch-soft)',
};

/**
 * One small calendar mark. Shape — not colour alone — carries the kind, so a legend built from
 * these reads in greyscale and for colour-blind viewers.
 */
export function DayMark({ kind, color = 'ink-subtle', label, className }: DayMarkProps) {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-kind={kind}
      style={swatchStyle(color)}
      className={cx('inline-block size-2 shrink-0', SHAPE[kind], className)}
    />
  );
}

export interface DayMarkLegendProps {
  /** One entry per kind shown, e.g. `{ kind: 'done', label: 'Signed off' }`. */
  items: readonly { kind: DayMarkKind; label: string }[];
  /** Accessible name of the legend list. */
  label: string;
  className?: string;
}

/** Key for DayMarks: each kind's (neutral) mark next to its caption, in one wrapping row. */
export function DayMarkLegend({ items, label, className }: DayMarkLegendProps) {
  return (
    <ul
      aria-label={label}
      className={cx(
        'm-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs text-ink-muted',
        className,
      )}
    >
      {items.map((item) => (
        <li key={item.kind} className="flex items-center gap-1.5">
          <DayMark kind={item.kind} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export interface DayMarkItem {
  key: string;
  kind: DayMarkKind;
  /** Colour token; neutral when omitted. */
  color?: string;
}

export interface DayMarksProps {
  marks: readonly DayMarkItem[];
  /** Marks drawn before collapsing the rest into a "+n" tally (default 4). */
  max?: number;
  className?: string;
}

/**
 * A compact cluster of DayMarks for a calendar cell (decorative — put the day's summary in the
 * cell's accessible name). Extra marks collapse into a "+n" tally so cells never overflow.
 */
export function DayMarks({ marks, max = 4, className }: DayMarksProps) {
  if (marks.length === 0) return null;
  const limit = Math.max(1, max);
  const shown = marks.length > limit ? marks.slice(0, limit - 1) : marks;
  const rest = marks.length - shown.length;
  return (
    <span aria-hidden className={cx('flex flex-wrap items-center gap-[3px]', className)}>
      {shown.map((m) => (
        <DayMark key={m.key} kind={m.kind} color={m.color} />
      ))}
      {rest > 0 && (
        <span className="text-[10px] font-semibold leading-none tabular-nums text-ink-subtle">
          +{rest}
        </span>
      )}
    </span>
  );
}
