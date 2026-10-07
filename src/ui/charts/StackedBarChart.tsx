import { useRef, useState, type ReactNode } from 'react';
import { useElementWidth } from '../internal/useElementWidth';
import { ChartFigure, ChartLegend, ChartTooltip } from './ChartFigure';
import { niceTicks, slotColor, topRoundedBar } from './scale';

export interface StackedSeries {
  key: string;
  label: string;
  /**
   * Categorical colour slot 1–8. Defaults to the series' position + 1, so keep the series
   * order stable across renders (e.g. sorted by name) — colour must follow the entity.
   */
  slot?: number;
}

export interface StackedRow {
  key: string;
  /** Short x-axis label (e.g. "Oct 5"). */
  label: string;
  /** Long label for tooltip / table (defaults to `label`). */
  fullLabel?: string;
  values: Readonly<Record<string, number>>;
}

export interface StackedBarChartProps {
  title: ReactNode;
  description?: ReactNode;
  series: readonly StackedSeries[];
  rows: readonly StackedRow[];
  /** Plot height in px (excluding legend / axis labels). */
  height?: number;
  formatValue?: (value: number) => string;
  totalLabel?: string;
  /** First column header of the table view. */
  categoryColumnLabel?: string;
  showTableLabel?: string;
  hideTableLabel?: string;
}

const M = { top: 10, right: 4, bottom: 24, left: 30 };
const GAP = 2;
const MAX_BAR = 24;

/**
 * Stacked columns (e.g. completions per person per week): one y-axis from zero, ≤ 24px bars
 * with a rounded top, 2px surface gaps between segments, legend above, per-column tooltip on
 * hover and keyboard focus, and a table view.
 */
export function StackedBarChart({
  title,
  description,
  series,
  rows,
  height = 200,
  formatValue = (v) => String(v),
  totalLabel = 'Total',
  categoryColumnLabel = '',
  showTableLabel,
  hideTableLabel,
}: StackedBarChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef, 560);
  const [hover, setHover] = useState<number | null>(null);

  const colorOf = (s: StackedSeries, i: number) => slotColor(s.slot ?? i + 1);
  const totals = rows.map((r) => series.reduce((sum, s) => sum + (r.values[s.key] ?? 0), 0));
  const ticks = niceTicks(Math.max(0, ...totals));
  const yMax = ticks[ticks.length - 1] ?? 1;

  const innerW = Math.max(40, width - M.left - M.right);
  const innerH = height;
  const band = rows.length > 0 ? innerW / rows.length : innerW;
  const barW = Math.min(MAX_BAR, Math.max(4, band * 0.62));
  const y = (v: number) => M.top + innerH - (v / yMax) * innerH;
  const labelEvery = Math.max(1, Math.ceil(rows.length / Math.max(1, Math.floor(innerW / 46))));
  const svgH = M.top + innerH + M.bottom;

  const summary = (i: number) => {
    const r = rows[i]!;
    const parts = series.map((s) => `${s.label} ${formatValue(r.values[s.key] ?? 0)}`);
    return `${r.fullLabel ?? r.label}: ${parts.join(', ')}; ${totalLabel} ${formatValue(totals[i] ?? 0)}`;
  };

  const hovered = hover !== null ? rows[hover] : undefined;

  return (
    <ChartFigure
      title={title}
      description={description}
      legend={
        series.length >= 2 ? (
          <ChartLegend
            items={series.map((s, i) => ({ key: s.key, label: s.label, color: colorOf(s, i) }))}
          />
        ) : undefined
      }
      table={{
        columns: [categoryColumnLabel, ...series.map((s) => s.label), totalLabel],
        rows: rows.map((r, i) => [
          r.fullLabel ?? r.label,
          ...series.map((s) => formatValue(r.values[s.key] ?? 0)),
          formatValue(totals[i] ?? 0),
        ]),
      }}
      showTableLabel={showTableLabel}
      hideTableLabel={hideTableLabel}
    >
      <div ref={wrapRef} className="relative w-full">
        <svg
          role="group"
          aria-label={typeof title === 'string' ? title : undefined}
          width={width}
          height={svgH}
          viewBox={`0 0 ${width} ${svgH}`}
          className="block max-w-full"
        >
          {ticks.map((t) => (
            <g key={t} aria-hidden>
              <line
                x1={M.left}
                x2={width - M.right}
                y1={y(t)}
                y2={y(t)}
                className={t === 0 ? 'stroke-chart-axis' : 'stroke-chart-grid'}
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
              <text
                x={M.left - 6}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-ink-subtle text-[10px] tabular-nums"
              >
                {formatValue(t)}
              </text>
            </g>
          ))}
          {rows.map((r, i) => {
            const cx = M.left + band * i + band / 2;
            const x = cx - barW / 2;
            let acc = 0;
            const segs = series
              .map((s, si) => ({ s, si, v: r.values[s.key] ?? 0 }))
              .filter((d) => d.v > 0);
            return (
              <g
                key={r.key}
                role="img"
                aria-label={summary(i)}
                tabIndex={0}
                className="outline-none [&:focus-visible>rect:first-child]:stroke-focus"
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                <rect
                  x={M.left + band * i}
                  y={M.top}
                  width={band}
                  height={innerH}
                  rx={6}
                  strokeWidth={2}
                  className={hover === i ? 'fill-surface-sunken/70' : 'fill-transparent'}
                />
                {segs.map((d, k) => {
                  const y0 = y(acc);
                  acc += d.v;
                  const y1 = y(acc);
                  const isTop = k === segs.length - 1;
                  const h = Math.max(1, y0 - y1 - (k > 0 ? GAP : 0));
                  const top = y0 - (k > 0 ? GAP : 0) - h;
                  return (
                    <path
                      key={d.s.key}
                      aria-hidden
                      d={
                        isTop
                          ? topRoundedBar(x, top, barW, h, 4)
                          : `M${x},${top}h${barW}v${h}h${-barW}Z`
                      }
                      style={{ fill: colorOf(d.s, d.si) }}
                    />
                  );
                })}
                {i % labelEvery === 0 && (
                  <text
                    aria-hidden
                    x={cx}
                    y={M.top + innerH + 16}
                    textAnchor="middle"
                    className="fill-ink-subtle text-[10px]"
                  >
                    {r.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hovered && hover !== null && (
          <ChartTooltip
            x={Math.min(Math.max(M.left + band * hover + band / 2, 70), width - 70)}
            y={y(totals[hover] ?? 0)}
          >
            <div className="mb-1 font-semibold text-ink">{hovered.fullLabel ?? hovered.label}</div>
            {series.map((s, si) => (
              <div key={s.key} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-0.5 w-3 rounded-full"
                  style={{ background: colorOf(s, si) }}
                />
                <span className="font-semibold tabular-nums">
                  {formatValue(hovered.values[s.key] ?? 0)}
                </span>
                <span className="text-ink-muted">{s.label}</span>
              </div>
            ))}
            <div className="mt-1 border-t border-line pt-1 text-ink-muted">
              <span className="font-semibold tabular-nums text-ink">
                {formatValue(totals[hover] ?? 0)}
              </span>{' '}
              {totalLabel}
            </div>
          </ChartTooltip>
        )}
      </div>
    </ChartFigure>
  );
}
