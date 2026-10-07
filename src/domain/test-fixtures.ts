/** Test-only builders for domain unit tests. */
import type { House, Supply, Task } from '../shared/catalog-schema';
import type { Completion } from '../shared/api-schemas';
import type { PlanItemLike } from './types';

export const HOUSE: Pick<House, 'rainyMonths'> = { rainyMonths: [5, 6, 7, 8, 9, 10, 11] };

/** Dry season (Dec–Apr) months, as used by watering/painting tasks. */
export const DRY_MONTHS = [12, 1, 2, 3, 4];

export function makeTask(overrides: Partial<Task> & Pick<Task, 'id'>): Task {
  return {
    name: { en: overrides.id, es: overrides.id },
    category: 'garden',
    area: 'whole-property',
    frequencyDays: 14,
    estimatedMinutes: 30,
    who: 'anyone',
    priority: 'normal',
    instructions: { en: 'Do it', es: 'Hágalo' },
    supplies: [],
    confirmed: false,
    ...overrides,
  };
}

export function makeSupply(id: string): Supply {
  return { id, name: { en: id, es: id } };
}

export function done(
  taskId: string | null,
  doneOn: string,
  doneBy = 'JT',
): Pick<Completion, 'taskId' | 'doneOn' | 'doneBy'> {
  return { taskId, doneOn, doneBy };
}

export function planned(
  taskId: string | null,
  weekStart: string,
  status: PlanItemLike['status'] = 'planned',
): PlanItemLike {
  return { taskId, weekStart, status };
}

/** Mow: 7 days in rainy season, 14 in dry. */
export const MOW = makeTask({
  id: 'mow-lawn',
  category: 'lawn',
  frequencyDays: 14,
  frequencyDaysBySeason: { rainy: 7, dry: 14 },
  priority: 'high',
  who: 'yard',
});

/** Daily cat care. */
export const DAILY = makeTask({ id: 'daily-cat-care', category: 'cats', frequencyDays: 1 });

/** Watering: every 3 days, dry season only. */
export const WATER = makeTask({ id: 'water-garden', frequencyDays: 3, activeMonths: DRY_MONTHS });

/** "Before rainy season" pattern: active March–April, long cadence. */
export const ROOF = makeTask({
  id: 'roof-inspection',
  category: 'house',
  frequencyDays: 300,
  activeMonths: [3, 4],
});
