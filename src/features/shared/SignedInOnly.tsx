import { Navigate, Outlet, useLocation } from 'react-router';
import { paths } from '../../app/paths';
import { RequireAuth } from './RequireAuth';

/**
 * Layout route that keeps every screen inside it private: signed-out visitors are sent to
 * /login?next=<where they were going>, and come back there after signing in.
 */
export function SignedInOnly() {
  const location = useLocation();
  return (
    <RequireAuth
      fallback={<Navigate to={paths.login(`${location.pathname}${location.search}`)} replace />}
    >
      <Outlet />
    </RequireAuth>
  );
}
