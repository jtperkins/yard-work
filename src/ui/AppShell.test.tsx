import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarDays, ClipboardList, ScrollText } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { AppShell, BrandMark, NavBar, TabBar, type NavItem } from './AppShell';
import type { LinkComponentProps } from './types';

const items: NavItem[] = [
  { key: 'board', href: '/', label: 'Board', icon: ClipboardList, active: true },
  { key: 'cal', href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'log', href: '/log', label: 'Log', icon: ScrollText, primary: false },
];

describe('NavBar', () => {
  it('renders links with aria-current on the active item', () => {
    render(<NavBar items={items} label="Primary" />);
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(within(nav).getByRole('link', { name: 'Board' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Log' })).not.toHaveAttribute('aria-current');
  });

  it('uses the caller-supplied link component', () => {
    const seen: string[] = [];
    function RouterLink({ href, children, ...rest }: LinkComponentProps) {
      seen.push(href);
      return (
        <a href={`#${href}`} {...rest}>
          {children}
        </a>
      );
    }
    render(<NavBar items={items} linkComponent={RouterLink} />);
    expect(seen).toEqual(['/', '/calendar', '/log']);
    expect(screen.getByRole('link', { name: 'Calendar' })).toHaveAttribute('href', '#/calendar');
  });
});

describe('TabBar', () => {
  it('shows primary items and a More sheet with the rest', async () => {
    // A router-style link (no document navigation, which jsdom can't do).
    function SpaLink({ href, children, onClick, ...rest }: LinkComponentProps) {
      return (
        <a
          href={href}
          {...rest}
          onClick={(e) => {
            e.preventDefault();
            onClick?.();
          }}
        >
          {children}
        </a>
      );
    }
    render(
      <TabBar items={items} linkComponent={SpaLink} moreLabel="Más" moreContent={<p>extra</p>} />,
    );
    expect(screen.getByRole('link', { name: 'Board' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Log' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Más' }));
    const sheet = screen.getByRole('dialog', { name: 'Más' });
    expect(within(sheet).getByText('extra')).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole('link', { name: 'Log' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the More sheet when moreCloseKey changes (e.g. a link in moreContent navigated)', async () => {
    const { rerender } = render(
      <TabBar items={items} moreContent={<p>extra</p>} moreCloseKey="/" />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('dialog', { name: 'More' })).toBeInTheDocument();
    rerender(<TabBar items={items} moreContent={<p>extra</p>} moreCloseKey="/" />);
    expect(screen.getByRole('dialog', { name: 'More' })).toBeInTheDocument();
    rerender(<TabBar items={items} moreContent={<p>extra</p>} moreCloseKey="/login" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('marks More active when a secondary item is current', () => {
    const onlyLogActive = items.map((i) => ({ ...i, active: i.key === 'log' }));
    render(<TabBar items={onlyLogActive} />);
    expect(screen.getByRole('button', { name: 'More' }).className).toContain('text-primary');
  });
});

describe('AppShell', () => {
  it('renders skip link, brand, header actions, main and both navs', () => {
    const onLang = vi.fn();
    render(
      <AppShell
        brand={<BrandMark name="Yard Work" tagline="House journal" icon={ClipboardList} />}
        navItems={items}
        headerActions={<button onClick={onLang}>ES</button>}
        sidebarFooter={<span>footer</span>}
      >
        <h1>Page</h1>
      </AppShell>,
    );
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(screen.getByRole('main')).toContainElement(
      screen.getByRole('heading', { name: 'Page' }),
    );
    expect(screen.getAllByText('Yard Work')).toHaveLength(2);
    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'ES' })).toBeInTheDocument();
    expect(screen.getByText('footer')).toBeInTheDocument();
  });
});
