import { LogIn, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useLogout, useSession } from '../api';
import { useErrorMessage } from '../features/shared';
import { useT } from '../i18n';
import { Avatar, Button, IconButton, LinkButton, Skeleton, Stack, Text, useToast } from '../ui';
import { paths } from './paths';

function useSignOut() {
  const logout = useLogout();
  const { toast } = useToast();
  const t = useT('common');
  const errorMessage = useErrorMessage();
  return {
    pending: logout.isPending,
    signOut: () =>
      logout.mutate(undefined, {
        onSuccess: () => toast({ title: t('account.signedOut') }),
        onError: (error) =>
          toast({
            tone: 'danger',
            title: t('account.signOutFailed'),
            description: errorMessage(error),
          }),
      }),
  };
}

function useLoginHref(): string | null {
  const location = useLocation();
  if (location.pathname === paths.login()) return null;
  return paths.login(`${location.pathname}${location.search}`);
}

/** Compact account control for the top bar: avatar + sign out, or a "Sign in" button. */
export function HeaderAccount() {
  const session = useSession();
  const t = useT('common');
  const { signOut, pending } = useSignOut();
  const loginHref = useLoginHref();

  if (session.isPending) return <Skeleton shape="circle" width="2rem" />;
  if (session.name) {
    return (
      <Stack direction="row" gap="xs" align="center">
        <Avatar name={session.name} size="sm" labelled />
        <IconButton
          label={t('nav.signOut')}
          icon={LogOut}
          size="sm"
          onClick={signOut}
          disabled={pending}
        />
      </Stack>
    );
  }
  if (!loginHref) return null;
  return (
    <LinkButton as={Link} to={loginHref} size="sm" variant="secondary" leadingIcon={LogIn}>
      {t('nav.signIn')}
    </LinkButton>
  );
}

/** Fuller account block for the desktop sidebar footer and the phone "More" sheet. */
export function AccountPanel() {
  const session = useSession();
  const t = useT('common');
  const { signOut, pending } = useSignOut();
  const loginHref = useLoginHref();

  if (session.isPending) return <Skeleton shape="line" width="60%" />;
  if (session.name) {
    return (
      <Stack gap="sm">
        <Stack direction="row" gap="sm" align="center">
          <Avatar name={session.name} size="md" />
          <Text size="sm" weight="medium" truncate>
            {t('nav.signedInAs', { name: session.name })}
          </Text>
        </Stack>
        <Button variant="ghost" size="sm" leadingIcon={LogOut} onClick={signOut} loading={pending}>
          {t('nav.signOut')}
        </Button>
      </Stack>
    );
  }
  return (
    <Stack gap="sm">
      <Text size="sm" tone="muted">
        {t('account.readOnly')}
      </Text>
      {loginHref && (
        <LinkButton as={Link} to={loginHref} size="sm" variant="secondary" leadingIcon={LogIn}>
          {t('nav.signIn')}
        </LinkButton>
      )}
    </Stack>
  );
}
