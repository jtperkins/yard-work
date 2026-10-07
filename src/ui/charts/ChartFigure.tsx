import { useId, useState, type ReactNode } from 'react';
import { Table } from 'lucide-react';
import { cx } from '../cx';

export interface ChartTable {
  columns: readonly string[];
  rows: ReadonlyArray<readonly ReactNode[]>;
}

export interface ChartFigureProps {
  title: ReactNode;
  description?: ReactNode;
  /** Legend row rendered above the plot. */
  legend?: ReactNode;
  children: ReactNode;
  /** Data table alternative to the visual (toggle below the chart). */
  table?: ChartTable;
  showTableLabel?: string;
  hideTableLabel?: string;
  className?: string;
}

/**
 * `<figure>` wrapper shared by the charts: title + description as the caption, an optional
 * legend, the plot, and a "Show table" disclosure so no value is hover-only.
 */
export function ChartFigure({
  title,
  description,
  legend,
  children,
  table,
  showTableLabel = 'Show table',
  hideTableLabel = 'Hide table',
  className,
}: ChartFigureProps) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();
  const titleId = useId();
  return (
    <figure aria-labelledby={titleId} className={cx('m-0 flex min-w-0 flex-col gap-3', className)}>
      <figcaption>
        <span
          id={titleId}
          className="block font-display text-lg font-semibold leading-tight text-ink"
        >
          {title}
        </span>
        {description && <span className="mt-0.5 block text-sm text-ink-muted">{description}</span>}
      </figcaption>
      {legend}
      {children}
      {table && (
        <div>
          <button
            type="button"
            aria-expanded={showTable}
            aria-controls={tableId}
            onClick={() => setShowTable((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-sm text-xs font-semibold text-ink-muted underline-offset-2 hover:text-ink hover:underline"
          >
            <Table aria-hidden className="size-3.5" />
            {showTable ? hideTableLabel : showTableLabel}
          </button>
          <div
            id={tableId}
            hidden={!showTable}
            className="mt-2 max-h-72 overflow-auto rounded-md border border-line"
          >
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-surface-sunken">
                <tr>
                  {table.columns.map((c, i) => (
                    <th
                      key={i}
                      scope="col"
                      className="px-3 py-2 text-xs font-semibold text-ink-muted"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, r) => (
                  <tr key={r} className="border-t border-line">
                    {row.map((cell, c) =>
                      c === 0 ? (
                        <th key={c} scope="row" className="px-3 py-1.5 font-medium text-ink">
                          {cell}
                        </th>
                      ) : (
                        <td key={c} className="px-3 py-1.5 tabular-nums text-ink-muted">
                          {cell}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </figure>
  );
}

export interface ChartTooltipProps {
  /** Position in px relative to the chart's positioned wrapper (anchor = top-centre). */
  x: number;
  y: number;
  children: ReactNode;
}

/** Floating readout for hovered / focused marks. Decorative duplicate of the mark's label. */
export function ChartTooltip({ x, y, children }: ChartTooltipProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap rounded-md border border-line bg-surface-raised px-2.5 py-1.5 text-xs text-ink shadow-raised"
      style={{ left: x, top: y }}
    >
      {children}
    </div>
  );
}

export interface LegendItem {
  key: string;
  label: ReactNode;
  color: string;
}

/** Swatch legend (rect keys, mirroring bar marks). */
export function ChartLegend({ items }: { items: readonly LegendItem[] }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs text-ink-muted">
      {items.map((it) => (
        <li key={it.key} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: it.color }} />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
