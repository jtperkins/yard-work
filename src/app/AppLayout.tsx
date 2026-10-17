import { Leaf } from 'lucide-react';
import { useMemo } from 'react';
import { matchPath, Outlet, useLocation } from 'react-router';
import { useSession } from '../api';
import { RouterLink } from '../features/shared';
import { useLang, useT, type Lang } from '../i18n';
import { AppShell, BrandMark, LanguageToggle, Stack, type NavItem as ShellNavItem } from '../ui';
import { AccountPanel, HeaderAccount } from './AccountControls';
import { NAV_ITEMS } from './nav';

/** App frame: ui AppShell (sidebar ≥768px, bottom tabs + "More" below) with language + account. */
export function AppLayout() {
  const t = useT('common');
  const { lang, setLang } = useLang();
  const location = useLocation();
  const { pathname } = location;
  const session = useSession();

  const items = useMemo<ShellNavItem[]>(
    () =>
      NAV_ITEMS.map((item) => ({
        key: item.to,
        href: item.to,
        label: t(item.labelKey),
        icon: item.icon,
        primary: item.primary,
        active: matchPath({ path: item.to, end: item.end ?? false }, pathname) !== null,
      })),
    [t, pathname],
  );

  const languageToggle = (
    <LanguageToggle<Lang> value={lang} onChange={setLang} label={t('lang.label')} size="sm" />
  );

  return (
    <AppShell
      brand={<BrandMark name={t('app.name')} tagline={t('app.tagline')} icon={Leaf} />}
      navItems={session.isSignedIn ? items : []}
      linkComponent={RouterLink}
      headerActions={
        <>
          {languageToggle}
          <HeaderAccount />
        </>
      }
      sidebarFooter={<AccountPanel />}
      moreContent={
        <Stack gap="md">
          {languageToggle}
          <AccountPanel />
        </Stack>
      }
      // A sign-in link (navigation) or sign-out in the More sheet closes it.
      moreCloseKey={`${location.key}|${session.name ?? ''}`}
      navLabel={t('nav.main')}
      moreLabel={t('nav.more')}
      closeLabel={t('actions.close')}
      skipLinkLabel={t('nav.skipToContent')}
    >
      <Outlet />
    </AppShell>
  );
}
