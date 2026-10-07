/**
 * Minimal structural inputs for the pure domain functions. They are `Pick`s of the API DTOs
 * (src/shared/api-schemas.ts), so callers can pass full `Completion` / `PlanItem` objects or
 * lightweight fixtures in tests.
 */
import type { Completion, PlanItem } from '../shared/api-schemas';

/** What scheduling needs from a completion. `doneBy` is optional (only used for "last done by"). */
export type CompletionLike = Pick<Completion, 'taskId' | 'doneOn'> &
  Partial<Pick<Completion, 'doneBy'>>;

/** What per-person stats need from a completion. */
export type PersonCompletion = Pick<Completion, 'doneOn' | 'doneBy'>;

/** What week suggestions and supplies need from a plan item. */
export type PlanItemLike = Pick<PlanItem, 'taskId' | 'weekStart' | 'status'>;
