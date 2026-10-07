/**
 * Runs before every /api/* handler (plan §4 + §14.3):
 *  - parses the `yw_session` cookie into `context.data.user`
 *  - 401 for writes without a session (except login/logout) and for any /api/notes request
 *  - turns uncaught errors into `{ error }` JSON (500)
 */
import {
  type AppFunction,
  errorResponse,
  requiresSession,
  sessionUser,
  toErrorResponse,
} from '../../server/lib';

export const onRequest: AppFunction = async (ctx) => {
  try {
    ctx.data.user = await sessionUser(ctx.request, ctx.env.SESSION_SECRET);
    const { pathname } = new URL(ctx.request.url);
    if (!ctx.data.user && requiresSession(ctx.request.method, pathname)) {
      return errorResponse(401, 'Sign in required');
    }
    return await ctx.next();
  } catch (err) {
    return toErrorResponse(err);
  }
};
