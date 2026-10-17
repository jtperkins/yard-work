/** GET /api/completions/latest (public) → newest full + newest partial sign-off per task, no date limit. */
import type { CompletionsRes } from '../../../src/shared/api-schemas';
import { json, latestCompletions, route } from '../../../server/lib';

export const onRequestGet = route(async ({ env }) => {
  const body: CompletionsRes = { completions: await latestCompletions(env.DB) };
  return json(body);
});
