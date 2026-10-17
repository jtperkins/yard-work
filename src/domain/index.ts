/**
 * Pure domain logic: scheduling and stats.
 * Everything takes "today" as an injected CR calendar date — no hidden clock reads.
 * Date helpers are re-exported from src/shared/dates.ts via ./dates.
 */
export * from './dates';
export * from './schedule';
export * from './stats';
export * from './types';
