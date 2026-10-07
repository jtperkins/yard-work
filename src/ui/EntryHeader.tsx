import type { ReactNode } from 'react';
import { Avatar } from './Avatar';
import { cx } from './cx';

export interface EntryHeaderProps {
  /** Author's name: shown as the title and used for the avatar's initials and colour. */
  author: string;
  /** Badges after the name (e.g. "You", "Pinned"). */
  badges?: ReactNode;
  /** Small line under the name, typically a `<time>`. */
  meta?: ReactNode;
  /** Right-aligned controls (e.g. a delete IconButton). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Byline for an authored entry such as a handoff note or comment: avatar, name with badges, a
 * small meta line (when) and trailing actions. Renders a `<header>`, so put it inside the entry's
 * `<article>`.
 */
export function EntryHeader({ author, badges, meta, actions, className }: EntryHeaderProps) {
  return (
    <header className={cx('mb-2 flex items-start gap-3', className)}>
      <Avatar name={author} size="md" />
      <div className="min-w-0 flex-1">
        <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-ink">
          <span className="min-w-0 break-words">{author}</span>
          {badges}
        </p>
        {meta !== undefined && <p className="m-0 text-xs text-ink-subtle">{meta}</p>}
      </div>
      {actions && <div className="-mr-1 flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  );
}
