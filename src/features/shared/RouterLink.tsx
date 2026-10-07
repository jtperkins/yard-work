import { Link } from 'react-router';
import type { LinkComponentProps } from '../../ui';

/** Adapter so src/ui navigation (AppShell, NavBar, TabBar) can render react-router links. */
export function RouterLink({ href, ...rest }: LinkComponentProps) {
  return <Link to={href} {...rest} />;
}
