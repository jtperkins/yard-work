import type { ReactNode } from 'react';

export interface VisuallyHiddenProps {
  children: ReactNode;
  /** Render as a different inline element. */
  as?: 'span' | 'div' | 'h2' | 'h3';
}

/** Content for assistive technology only (screen-reader text). */
export function VisuallyHidden({ children, as: Tag = 'span' }: VisuallyHiddenProps) {
  return <Tag className="sr-only">{children}</Tag>;
}
