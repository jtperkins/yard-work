import type { ReactNode } from 'react';
import { cx } from './cx';

export interface ClipboardSheetRow {
  key: string;
  /** The job. */
  title: ReactNode;
  /** Small line under the job (area, note, time estimate). */
  detail?: ReactNode;
  /** Pre-filled assignee. */
  assignee?: ReactNode;
  /** Already signed off: prints the tick, who and when instead of blank lines. */
  done?: { by: ReactNode; date: ReactNode };
}

export interface ClipboardSheetColumns {
  task: string;
  assignee: string;
  doneBy: string;
  date: string;
  initials: string;
}

export interface ClipboardSheetProps {
  /** Sheet heading (e.g. "Week of 5–11 October"). */
  title: ReactNode;
  /** Line under the heading (e.g. yard day). */
  subtitle?: ReactNode;
  /** Small brand/header text at the top left. */
  brand?: ReactNode;
  columns: ClipboardSheetColumns;
  rows: readonly ClipboardSheetRow[];
  /** Empty ruled rows for unplanned work (default 3). */
  blankRows?: number;
  /** Signature lines at the foot, e.g. ["Checked by", "Date"]. */
  signatures?: readonly string[];
  /** Tick-box lists printed under the table (e.g. supplies to bring). */
  lists?: readonly { title: string; items: readonly ReactNode[] }[];
  /** Extra sections between the table and the signatures (e.g. a supplies list). */
  children?: ReactNode;
  className?: string;
}

const cell = 'border border-print-ink/60 px-2 py-2 align-top';
const blankLine = 'block h-5 border-b border-print-ink/40';

/**
 * A printable job-site sign-off sheet: tick box, job, assignee, then blank "done by / date /
 * initials" lines, extra blank rows and signature lines. Ink on paper; pair with
 * `<MediaOnly media="print">`.
 */
export function ClipboardSheet({
  title,
  subtitle,
  brand,
  columns,
  rows,
  blankRows = 3,
  signatures = [],
  lists = [],
  children,
  className,
}: ClipboardSheetProps) {
  const blanks = Array.from({ length: blankRows }, (_, i) => i);
  return (
    <article className={cx('bg-print-paper text-[11pt] leading-snug text-print-ink', className)}>
      <header className="mb-4 flex items-end justify-between gap-4 border-b-2 border-print-ink pb-2">
        <div>
          {brand && (
            <p className="m-0 text-[9pt] font-semibold uppercase tracking-[0.16em]">{brand}</p>
          )}
          <h2 className="m-0 font-display text-[18pt] font-semibold">{title}</h2>
        </div>
        {subtitle && <p className="m-0 text-right text-[10pt]">{subtitle}</p>}
      </header>

      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left text-[9pt] uppercase tracking-[0.08em]">
            <th scope="col" className={cx(cell, 'w-8')}>
              <span className="sr-only">✓</span>
            </th>
            <th scope="col" className={cell}>
              {columns.task}
            </th>
            <th scope="col" className={cx(cell, 'w-[16%]')}>
              {columns.assignee}
            </th>
            <th scope="col" className={cx(cell, 'w-[18%]')}>
              {columns.doneBy}
            </th>
            <th scope="col" className={cx(cell, 'w-[13%]')}>
              {columns.date}
            </th>
            <th scope="col" className={cx(cell, 'w-[10%]')}>
              {columns.initials}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="break-inside-avoid">
              <td className={cx(cell, 'text-center')}>
                <span
                  aria-hidden
                  className="inline-grid size-4 place-items-center border-[1.5px] border-print-ink text-[10pt] leading-none"
                >
                  {row.done ? '✓' : ''}
                </span>
              </td>
              <td className={cell}>
                <span className="block font-semibold">{row.title}</span>
                {row.detail && <span className="block text-[9pt]">{row.detail}</span>}
              </td>
              <td className={cell}>{row.assignee ?? <span className={blankLine} />}</td>
              <td className={cell}>{row.done ? row.done.by : <span className={blankLine} />}</td>
              <td className={cell}>{row.done ? row.done.date : <span className={blankLine} />}</td>
              <td className={cell}>
                <span className={blankLine} />
              </td>
            </tr>
          ))}
          {blanks.map((i) => (
            <tr key={`blank-${i}`} aria-hidden className="break-inside-avoid">
              <td className={cx(cell, 'text-center')}>
                <span className="inline-block size-4 border-[1.5px] border-print-ink" />
              </td>
              {[0, 1, 2, 3, 4].map((c) => (
                <td key={c} className={cx(cell, 'h-9')} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {lists.map((list) => (
        <section key={list.title} className="mt-5 break-inside-avoid">
          <h3 className="m-0 mb-2 text-[10pt] font-semibold uppercase tracking-[0.12em]">
            {list.title}
          </h3>
          <ul className="m-0 grid list-none grid-cols-2 gap-x-6 gap-y-1 p-0 text-[10pt]">
            {list.items.map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block size-3 shrink-0 border border-print-ink"
                />
                {item}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {children && <div className="mt-5">{children}</div>}

      {signatures.length > 0 && (
        <footer className="mt-8 flex break-inside-avoid flex-wrap gap-x-10 gap-y-6">
          {signatures.map((label) => (
            <div key={label} className="min-w-[12rem] flex-1">
              <div className="h-8 border-b border-print-ink" />
              <p className="m-0 mt-1 text-[9pt] uppercase tracking-[0.1em]">{label}</p>
            </div>
          ))}
        </footer>
      )}
    </article>
  );
}
