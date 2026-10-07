/** Pure text builders for the Week screen (range label, WhatsApp share message). */
import { translate, type Lang } from '../../i18n';
import { CR_TIMEZONE, addDays, localeFor, parseISODate, type ISODate } from '../../shared/dates';

function noonUTC(iso: ISODate): Date {
  const { year, month, day } = parseISODate(iso);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/** "Oct 5 – 11" / "5–11 oct" (year added when it isn't the current one). */
export function formatWeekRange(monday: ISODate, lang: Lang, withYear = false): string {
  const fmt = new Intl.DateTimeFormat(localeFor(lang), {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: CR_TIMEZONE,
  });
  return fmt.formatRange(noonUTC(monday), noonUTC(addDays(monday, 6)));
}

export interface ShareItem {
  title: string;
  assignee?: string | null;
  done: boolean;
}

export interface ShareSupply {
  name: string;
  have: boolean;
}

export interface ShareInput {
  lang: Lang;
  appName: string;
  weekStart: ISODate;
  /** Formatted yard day (already in `lang`), e.g. "jueves 9". Omit to leave the line out. */
  yardDay?: string;
  /** Planned + done items (skipped ones left out by the caller). */
  items: readonly ShareItem[];
  supplies: readonly ShareSupply[];
  /** Link back to this week's plan. */
  url: string;
}

/** The WhatsApp message (WhatsApp markdown: *bold*). Always in `input.lang`. */
export function buildShareText(input: ShareInput): string {
  const { lang } = input;
  const t = (key: Parameters<typeof translate<'week'>>[2], vars?: Record<string, string>) =>
    translate(lang, 'week', key, vars);
  const lines: string[] = [];
  lines.push(
    t('msg.heading', { app: input.appName, range: formatWeekRange(input.weekStart, lang) }),
  );
  if (input.yardDay) lines.push(t('msg.yardDay', { day: input.yardDay }));
  lines.push('', t('msg.plan'));
  if (input.items.length === 0) lines.push(t('msg.noJobs'));
  for (const item of input.items) {
    const text = item.done
      ? t('msg.done', { task: item.title })
      : item.assignee
        ? t('msg.assignee', { task: item.title, name: item.assignee })
        : item.title;
    lines.push(`${item.done ? '✅' : '☐'} ${text}`);
  }
  if (input.supplies.length > 0) {
    lines.push('', t('msg.supplies'));
    for (const s of input.supplies) {
      lines.push(`• ${s.have ? t('msg.supplyHave', { supply: s.name }) : s.name}`);
    }
  }
  lines.push('', t('msg.link', { url: input.url }));
  return lines.join('\n');
}

/** `https://wa.me/?text=…` share link for a message. */
export function whatsAppHref(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
