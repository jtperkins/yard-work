import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { useSession } from '../../api';
import { useT } from '../../i18n';
import { Card, EmptyState, PageHeader, SkeletonText } from '../../ui';
import { SignInCta } from './SignInCta';

/**
 * FROZEN PROPS (Phase 1). Owned by feature agent A.
 *
 * Gate for sign-in-only screens (the router wraps /handoff with it). While the session is
 * loading it shows a skeleton; when signed out it renders `fallback` or, by default, a
 * sign-in prompt (SignInCta / redirect to /login?next=…); when signed in it renders `children`.
 */
export interface RequireAuthProps {
  children: ReactNode;
  /** Rendered instead of `children` when signed out. Defaults to a sign-in prompt. */
  fallback?: ReactNode;
}

export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const session = useSession();
  const t = useT('auth');
  const tc = useT('common');

  if (session.isPending) {
    return (
      <div aria-busy="true" aria-label={tc('a11y.loading')}>
        <SkeletonText lines={4} />
      </div>
    );
  }
  if (session.isSignedIn) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;

  return (
    <>
      <PageHeader title={t('gate.title')} description={t('gate.description')} />
      <Card padding="lg">
        <EmptyState
          icon={Lock}
          title={t('gate.cardTitle')}
          description={t('gate.cardBody')}
          action={<SignInCta label={tc('nav.signIn')} size="md" />}
        />
      </Card>
    </>
  );
}
