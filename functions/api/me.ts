/** GET /api/me → Me ({name} or {name: null}). */
import type { Me } from '../../src/shared/api-schemas';
import { json, route } from '../../server/lib';

export const onRequestGet = route(async ({ data }) => {
  const body: Me = { name: data.user };
  return json(body);
});
