import type { ReactNode } from 'react';
import { cx } from './cx';

export interface MediaOnlyProps {
  /** `print`: hidden on screen, shown when printing. `screen`: the reverse. */
  media: 'print' | 'screen';
  as?: 'div' | 'section';
  className?: string;
  children?: ReactNode;
}

/** Shows content only on screen or only on paper (print stylesheet without custom CSS). */
export function MediaOnly({ media, as: Tag = 'div', className, children }: MediaOnlyProps) {
  return (
    <Tag
      data-media={media}
      className={cx(media === 'print' ? 'hidden print:block' : 'print:hidden', className)}
    >
      {children}
    </Tag>
  );
}
