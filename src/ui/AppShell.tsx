import { useState, type ReactNode } from 'react';
import { Ellipsis } from 'lucide-react';
import { Sheet } from './Dialog';
import { cx } from './cx';
import type { IconComponent, LinkComponent, LinkComponentProps } from './types';

export interface NavItem {
  key: string;
  href: string;
  label: string;
  icon: IconComponent;
  /** Current page (the caller decides from its router). */
  active?: boolean;
  /** Shown in the phone tab bar; others go under "More". Default true. */
  primary?: boolean;
}

function DefaultLink({ href, children, ...rest }: LinkComponentProps) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

export interface NavBarProps {
  items: readonly NavItem[];
  /** Router link adapter; defaults to a plain `<a href>`. */
  linkComponent?: LinkComponent;
  /** Accessible name of the `<nav>`. */
  label?: string;
  className?: string;
}

/** Vertical navigation list (desktop sidebar). */
export function NavBar({
  items,
  linkComponent: Link = DefaultLink,
  label = 'Main',
  className,
}: NavBarProps) {
  return (
    <nav aria-label={label} className={className}>
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
                className={cx(
                  'group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-(--duration-fast)',
                  item.active
                    ? 'bg-primary-soft text-primary-soft-ink'
                    : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
                )}
              >
                <span
                  aria-hidden
                  className={cx(
                    'absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-full bg-primary transition-opacity',
                    item.active ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <Icon aria-hidden className="size-[18px] shrink-0" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export interface TabBarProps {
  items: readonly NavItem[];
  linkComponent?: LinkComponent;
  label?: string;
  /** Label of the overflow tab that opens the sheet with non-primary items. */
  moreLabel?: string;
  /** Extra content at the bottom of the "More" sheet (e.g. language, account). */
  moreContent?: ReactNode;
  /** Accessible name of the sheet's close button. */
  closeLabel?: string;
  /**
   * Changing this value closes the "More" sheet. Pass something that changes on navigation (and
   * sign-in/out), so a link or action inside `moreContent` doesn't leave the sheet open on top.
   */
  moreCloseKey?: string | number;
  className?: string;
}

const tabClass = (active: boolean) =>
  cx(
    'flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors',
    active ? 'text-primary' : 'text-ink-subtle hover:text-ink',
  );

const tabIconClass = (active: boolean) =>
  cx(
    'grid h-7 w-12 place-items-center rounded-pill transition-colors duration-(--duration-base)',
    active && 'bg-primary-soft',
  );

/** Phone bottom tab bar: primary items + a "More" tab opening a sheet with the rest. */
export function TabBar({
  items,
  linkComponent: Link = DefaultLink,
  label = 'Main',
  moreLabel = 'More',
  moreContent,
  closeLabel,
  moreCloseKey,
  className,
}: TabBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [seenCloseKey, setSeenCloseKey] = useState(moreCloseKey);
  if (moreCloseKey !== seenCloseKey) {
    setSeenCloseKey(moreCloseKey);
    setMoreOpen(false);
  }
  const primary = items.filter((i) => i.primary !== false);
  const secondary = items.filter((i) => i.primary === false);
  const moreActive = secondary.some((i) => i.active);
  const hasMore = secondary.length > 0 || moreContent !== undefined;

  return (
    <>
      <nav
        aria-label={label}
        className={cx(
          'fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/92 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_-12px_rgb(0_0_0/0.25)] backdrop-blur-md print:hidden',
          className,
        )}
      >
        <ul className="m-0 flex h-16 list-none items-stretch p-0 px-1">
          {primary.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.key} className="flex min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-current={item.active ? 'page' : undefined}
                  className={tabClass(!!item.active)}
                >
                  <span className={tabIconClass(!!item.active)}>
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span className="max-w-full truncate px-1">{item.label}</span>
                </Link>
              </li>
            );
          })}
          {hasMore && (
            <li className="flex min-w-0 flex-1">
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen(true)}
                className={tabClass(moreActive)}
              >
                <span className={tabIconClass(moreActive)}>
                  <Ellipsis aria-hidden className="size-5" />
                </span>
                <span className="max-w-full truncate px-1">{moreLabel}</span>
              </button>
            </li>
          )}
        </ul>
      </nav>
      <Sheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title={moreLabel}
        closeLabel={closeLabel}
      >
        {secondary.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {secondary.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={item.active ? 'page' : undefined}
                    onClick={() => setMoreOpen(false)}
                    className={cx(
                      'flex h-12 items-center gap-3 rounded-md px-3 text-base font-medium transition-colors',
                      item.active
                        ? 'bg-primary-soft text-primary-soft-ink'
                        : 'text-ink hover:bg-surface-sunken',
                    )}
                  >
                    <Icon aria-hidden className="size-5 text-ink-muted" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {moreContent && <div className="mt-4 border-t border-line pt-4">{moreContent}</div>}
      </Sheet>
    </>
  );
}

export interface AppShellProps {
  /** Wordmark / logo (shown in the sidebar on desktop, the top bar on phones). */
  brand: ReactNode;
  navItems: readonly NavItem[];
  /** Router link adapter used for every nav link. */
  linkComponent?: LinkComponent;
  /** Top-bar controls, right-aligned (language toggle, account / sign-in). */
  headerActions?: ReactNode;
  /** Bottom of the desktop sidebar. */
  sidebarFooter?: ReactNode;
  /** Extra content in the phone "More" sheet. */
  moreContent?: ReactNode;
  /** Changing this value closes the phone "More" sheet (see `TabBar`). */
  moreCloseKey?: string | number;
  navLabel?: string;
  moreLabel?: string;
  closeLabel?: string;
  skipLinkLabel?: string;
  /** Page content (rendered in `<main id="main">`). */
  children: ReactNode;
}

/**
 * Responsive app frame: skip link; sticky top bar; left sidebar from `md` (768px); bottom tab
 * bar with "More" sheet below it; `<main id="main">` sized for comfortable reading.
 */
export function AppShell({
  brand,
  navItems,
  linkComponent,
  headerActions,
  sidebarFooter,
  moreContent,
  moreCloseKey,
  navLabel = 'Main',
  moreLabel,
  closeLabel,
  skipLinkLabel = 'Skip to content',
  children,
}: AppShellProps) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15.5rem_minmax(0,1fr)] print:block">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-inverse"
      >
        {skipLinkLabel}
      </a>

      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-line bg-surface/55 px-4 py-5 md:flex print:hidden!">
        <div className="px-1">{brand}</div>
        <NavBar
          items={navItems}
          linkComponent={linkComponent}
          label={navLabel}
          className="flex-1"
        />
        {sidebarFooter && <div className="border-t border-line pt-4">{sidebarFooter}</div>}
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line/70 bg-paper/85 px-3 backdrop-blur-md md:gap-3 md:border-transparent md:px-8 print:hidden">
          <div className="min-w-0 md:hidden">{brand}</div>
          <div className="ml-auto flex items-center gap-2">{headerActions}</div>
        </header>
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 outline-none md:px-8 md:pb-16 md:pt-4 print:max-w-none print:p-0"
        >
          {children}
        </main>
      </div>

      <TabBar
        items={navItems}
        linkComponent={linkComponent}
        label={navLabel}
        moreLabel={moreLabel}
        moreContent={moreContent}
        moreCloseKey={moreCloseKey}
        closeLabel={closeLabel}
        className="md:hidden"
      />
    </div>
  );
}

export interface BrandMarkProps {
  /** Product name. */
  name: string;
  /** Small line under the name (shown from `md` up, where the sidebar has room). */
  tagline?: string;
  icon?: IconComponent;
}

/** Wordmark: leaf badge + name in the display face. */
export function BrandMark({ name, tagline, icon: Icon }: BrandMarkProps) {
  return (
    <span className="flex items-center gap-2.5">
      {Icon && (
        <span className="grid size-8 shrink-0 -rotate-6 place-items-center rounded-[10px] bg-primary text-primary-ink shadow-card">
          <Icon aria-hidden className="size-[18px]" />
        </span>
      )}
      <span className="flex min-w-0 flex-col leading-none">
        <span className="truncate font-display text-lg font-semibold text-ink">{name}</span>
        {tagline && (
          <span className="mt-1 hidden text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] text-ink-subtle md:block">
            {tagline}
          </span>
        )}
      </span>
    </span>
  );
}
