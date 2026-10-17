/** Pages Functions bindings & secrets (wrangler.toml + .dev.vars / `wrangler pages secret`). */
export interface Env {
  DB: D1Database;
  /** private R2 bucket holding incident attachments (never public) */
  INCIDENT_FILES: R2Bucket;
  /** shared house code people type to sign in (≥ 8 chars) */
  HOUSE_CODE: string;
  /** HMAC key for the yw_session cookie (32+ random bytes) */
  SESSION_SECRET: string;
}

/** Per-request data shared between `_middleware.ts` and route handlers (`context.data`). */
export type AppData = {
  /** session name from a valid `yw_session` cookie, or `null` when signed out */
  user: string | null;
};

export type AppContext<P extends string = string> = EventContext<Env, P, AppData>;
export type AppFunction<P extends string = string> = PagesFunction<Env, P, AppData>;
