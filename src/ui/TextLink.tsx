import type { ElementType, ReactNode } from 'react';
import { cx } from './cx';
import type { IconComponent, PolymorphicProps } from './types';

export type TextLinkProps<C extends ElementType = 'a'> = PolymorphicProps<
  C,
  {
    children?: ReactNode;
    /** `muted` for secondary links (e.g. "Back"). */
    tone?: 'primary' | 'muted';
    leadingIcon?: IconComponent;
    trailingIcon?: IconComponent;
    className?: string;
  }
>;

/** Inline text link. Polymorphic like LinkButton: `<TextLink as={Link} to="/tasks">`. */
export function TextLink<C extends ElementType = 'a'>({
  as,
  tone = 'primary',
  leadingIcon: Lead,
  trailingIcon: Trail,
  className,
  children,
  ...rest
}: TextLinkProps<C>) {
  const Component: ElementType = as ?? 'a';
  return (
    <Component
      className={cx(
        'inline-flex items-center gap-1 rounded-sm font-medium underline decoration-1 underline-offset-[3px] transition-colors',
        tone === 'primary'
          ? 'text-primary decoration-primary/40 hover:decoration-primary'
          : 'text-ink-muted decoration-transparent hover:text-ink hover:decoration-line-strong',
        className,
      )}
      {...rest}
    >
      {Lead && <Lead aria-hidden className="size-4" />}
      {children}
      {Trail && <Trail aria-hidden className="size-4" />}
    </Component>
  );
}
