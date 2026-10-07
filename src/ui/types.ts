import type { ComponentPropsWithoutRef, ComponentType, ElementType, ReactNode } from 'react';

/** Any icon component that accepts a className (lucide-react icons fit). */
export type IconComponent = ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>;

/** Semantic tones shared by Badge, StatTile, Toast, ... */
export type Tone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

/**
 * Props for a polymorphic component: its own props, an `as` element/component, and every prop
 * of that element except the ones the component defines itself.
 */
export type PolymorphicProps<C extends ElementType, Own> = Own & {
  as?: C;
} & Omit<ComponentPropsWithoutRef<C>, keyof Own | 'as'>;

/**
 * The link component a caller supplies to navigation components (AppShell, NavBar, TabBar),
 * e.g. a three-line adapter over a router's Link: `({ href, ...p }) => <Link to={href} {...p} />`.
 */
export interface LinkComponentProps {
  href: string;
  className?: string;
  children?: ReactNode;
  'aria-current'?: 'page';
  'aria-label'?: string;
  onClick?: () => void;
}

export type LinkComponent = ComponentType<LinkComponentProps>;
