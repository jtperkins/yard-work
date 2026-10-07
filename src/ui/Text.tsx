import type { ReactNode } from 'react';
import { cx } from './cx';
import type { IconComponent } from './types';

const SIZE = { xs: 'text-xs', sm: 'text-sm', md: 'text-base', lg: 'text-lg' } as const;
const TONE = {
  default: 'text-ink',
  muted: 'text-ink-muted',
  subtle: 'text-ink-subtle',
  accent: 'text-accent',
  primary: 'text-primary',
  danger: 'text-danger',
} as const;
const WEIGHT = { normal: 'font-normal', medium: 'font-medium', semibold: 'font-semibold' } as const;

export interface TextProps {
  as?: 'p' | 'span' | 'div';
  size?: keyof typeof SIZE;
  tone?: keyof typeof TONE;
  weight?: keyof typeof WEIGHT;
  /** Keep the text's own line breaks (e.g. a message preview). */
  preLine?: boolean;
  /** Keep line breaks and runs of spaces exactly as typed (e.g. a person's note). */
  preWrap?: boolean;
  /** Break long unbroken words/URLs instead of overflowing. */
  breakWords?: boolean;
  /** Tabular figures for numbers that line up. */
  tabular?: boolean;
  /** Fraunces display face (for figures and pull-quotes). */
  display?: boolean;
  /** Clip to one line with an ellipsis. */
  truncate?: boolean;
  /** Small-caps label style (uppercase, tracked out) — for eyebrow labels. */
  caps?: boolean;
  /** Italic (quoted notes). */
  italic?: boolean;
  /** Decorative icon before the text (sized to the text). */
  icon?: IconComponent;
  id?: string;
  /** Language of the content when it differs from the page (e.g. a Spanish message preview). */
  lang?: string;
  className?: string;
  children?: ReactNode;
}

/** Body copy with token tones. Use instead of hand-styled `<p>`/`<span>` in screens. */
export function Text({
  as: Tag = 'p',
  size = 'md',
  tone = 'default',
  weight = 'normal',
  preLine = false,
  preWrap = false,
  breakWords = false,
  tabular = false,
  display = false,
  truncate = false,
  caps = false,
  italic = false,
  icon: Icon,
  id,
  lang,
  className,
  children,
}: TextProps) {
  return (
    <Tag
      id={id}
      lang={lang}
      className={cx(
        'm-0',
        SIZE[size],
        TONE[tone],
        WEIGHT[weight],
        preLine && 'whitespace-pre-line',
        preWrap && 'whitespace-pre-wrap',
        breakWords && 'break-words',
        tabular && 'tabular-nums',
        display && 'font-display',
        truncate && 'truncate',
        caps && 'uppercase tracking-[0.12em]',
        italic && 'italic',
        Icon && 'flex items-center gap-1.5',
        Tag === 'p' && !truncate && 'text-pretty',
        className,
      )}
    >
      {Icon && <Icon aria-hidden className="size-[1.15em] shrink-0" />}
      {children}
    </Tag>
  );
}
