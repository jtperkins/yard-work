/** POST /api/logout → Me {name: null} and clears the session cookie. */
import type { Me } from '../../src/shared/api-schemas';
import { clearSessionCookie, json, route } from '../../server/lib';

export const onRequestPost = route(async ({ request }) => {
  const body: Me = { name: null };
  return json(body, 200, { 'set-cookie': clearSessionCookie(request) });
});
