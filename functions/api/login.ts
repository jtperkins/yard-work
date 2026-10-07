/** POST /api/login {name, code} → Me + yw_session cookie. Wrong code → 401 after a delay. */
import type { Me } from '../../src/shared/api-schemas';
import { loginReqSchema } from '../../src/shared/api-schemas';
import {
  HttpError,
  LOGIN_FAILURE_DELAY_MS,
  houseCodeMatches,
  json,
  readJson,
  route,
  sessionCookie,
  signSession,
} from '../../server/lib';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const onRequestPost = route(async ({ request, env }) => {
  const { name, code } = await readJson(request, loginReqSchema);
  if (!env.HOUSE_CODE || !env.SESSION_SECRET) {
    throw new HttpError(500, 'Server is not configured: set HOUSE_CODE and SESSION_SECRET');
  }
  if (!(await houseCodeMatches(code, env.HOUSE_CODE))) {
    await sleep(LOGIN_FAILURE_DELAY_MS);
    throw new HttpError(401, 'Wrong house code');
  }
  const token = await signSession(name, env.SESSION_SECRET);
  const body: Me = { name };
  return json(body, 200, { 'set-cookie': sessionCookie(token, request) });
});
