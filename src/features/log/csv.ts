import type { Catalog } from '../../domain/catalog';
import type { Completion } from '../../shared/api-schemas';
import type { Lang } from '../../shared/catalog-schema';
import { categoryLabel, describeWork } from './describe';

export type CsvCell = string | number | null | undefined;

/** Characters that make a spreadsheet treat a cell as a formula (CSV injection). */
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * One RFC 4180 field. Free text that could start a spreadsheet formula gets a leading `'`
 * (OWASP CSV-injection guidance); fields with a comma, quote, CR/LF or edge whitespace are
 * quoted with inner quotes doubled. `null`/`undefined` become an empty field.
 */
export function escapeCsvField(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text) || text !== text.trim()) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/** Rows → CSV text with CRLF line endings (RFC 4180), no trailing newline. */
export function toCsv(rows: readonly (readonly CsvCell[])[]): string {
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n');
}

export interface LogCsvHeaders {
  date: string;
  task: string;
  category: string;
  doneBy: string;
  signedBy: string;
  note: string;
  taskId: string;
  loggedAt: string;
}

export interface LogCsvOptions {
  catalog: Pick<Catalog, 'taskById' | 'house'>;
  lang: Lang;
  headers: LogCsvHeaders;
  /** Category column text for ad-hoc work. */
  adHocLabel: string;
}

/** The log as CSV, one row per sign-off in the given order, names in `lang`. */
export function buildLogCsv(completions: readonly Completion[], options: LogCsvOptions): string {
  const { catalog, lang, headers, adHocLabel } = options;
  const header = [
    headers.date,
    headers.task,
    headers.category,
    headers.doneBy,
    headers.signedBy,
    headers.note,
    headers.taskId,
    headers.loggedAt,
  ];
  const rows = completions.map((c) => {
    const work = describeWork(c, catalog, lang);
    const category = work.category
      ? categoryLabel(catalog, work.category, lang)
      : work.adHoc
        ? adHocLabel
        : '';
    return [c.doneOn, work.title, category, c.doneBy, c.loggedBy, c.note, c.taskId, c.createdAt];
  });
  return toCsv([header, ...rows]);
}

/** `yard-work-log-2026-10-07.csv` */
export function logCsvFilename(today: string): string {
  return `yard-work-log-${today}.csv`;
}
