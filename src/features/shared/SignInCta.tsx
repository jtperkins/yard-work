import { LogIn } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { paths } from '../../app/paths';
import { useT } from '../../i18n';
import { LinkButton } from '../../ui';

/**
 * FROZEN PROPS (Phase 1). Owned by feature agent A.
 *
 * Shown in place of a write control when nobody is signed in (e.g. instead of "Sign off").
 * Renders a link-styled button to `/login?next=<returnTo>`; label defaults to
 * common:'actions.signInToSignOff'.
 */
export interface SignInCtaProps {
  /** Button label; defaults to the translated "Sign in to sign off". */
  label?: string;
  /** Path to return to after signing in; defaults to the current location. */
  returnTo?: string;
  /** Visual size, forwarded to the underlying ui button. */
  size?: 'sm' | 'md';
}

export function SignInCta({ label, returnTo, size = 'sm' }: SignInCtaProps) {
  const t = useT('common');
  const location = useLocation();
  const next = returnTo ?? `${location.pathname}${location.search}`;
  return (
    <LinkButton
      as={Link}
      to={paths.login(next)}
      variant="secondary"
      size={size}
      leadingIcon={LogIn}
    >
      {label ?? t('actions.signInToSignOff')}
    </LinkButton>
  );
}
