/**
 * Errors thrown by the API client. Every failed request becomes an `ApiRequestError` so screens
 * (and the query client's retry policy, which reads `status`) can branch on one shape.
 */

/** Why a request failed, beyond the HTTP status. */
export type ApiErrorKind =
  /** The server answered with a non-2xx status (`status` is set, `message` is its `{error}`). */
  | 'http'
  /** No response at all (offline, DNS, aborted). `status` is 0. */
  | 'network'
  /** 2xx response whose body did not match the shared DTO schema. */
  | 'invalid-response';

export class ApiRequestError extends Error {
  readonly status: number;
  readonly kind: ApiErrorKind;

  constructor(
    status: number,
    message: string,
    kind: ApiErrorKind = 'http',
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ApiRequestError';
    this.status = status;
    this.kind = kind;
  }
}

export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}

/** HTTP status of an API error (0 for network failures), or `undefined` for anything else. */
export function apiErrorStatus(error: unknown): number | undefined {
  return isApiRequestError(error) ? error.status : undefined;
}

/** True when the server rejected the request because there is no valid session. */
export function isUnauthorized(error: unknown): boolean {
  return apiErrorStatus(error) === 401;
}

/** True for 409 conflicts (task already planned this week, plan item already signed off). */
export function isConflict(error: unknown): boolean {
  return apiErrorStatus(error) === 409;
}

/** True when the request never reached the server. */
export function isNetworkError(error: unknown): boolean {
  return isApiRequestError(error) && error.kind === 'network';
}
