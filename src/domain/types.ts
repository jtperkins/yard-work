/**
 * Minimal structural inputs for the pure domain functions. They are `Pick`s of the API DTOs
 * (src/shared/api-schemas.ts), so callers can pass full `Completion` objects or lightweight
 * fixtures in tests.
 */
import type { Completion } from '../shared/api-schemas';

/**
 * What scheduling needs from a completion. Everything but `taskId` and `doneOn` is optional:
 * a missing `partial` counts as a full sign-off (ad-hoc rows and fixtures).
 */
export type CompletionLike = Pick<Completion, 'taskId' | 'doneOn'> &
  Partial<Pick<Completion, 'doneBy' | 'partial' | 'note' | 'createdAt'>>;

/** What per-person stats need from a completion. `partial` is optional (missing = full). */
export type PersonCompletion = Pick<Completion, 'doneOn' | 'doneBy'> &
  Partial<Pick<Completion, 'partial'>>;
