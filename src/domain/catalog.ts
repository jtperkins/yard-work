/**
 * Catalog loading (plan §5): structural validation with the frozen zod schemas from
 * src/shared/catalog-schema.ts plus the referential checks the schemas can't express
 * (unique ids, task areas and supplies that exist in house.json / supplies.json, ...).
 *
 * `getCatalog()` returns the bundled data/*.json catalog (validated once, memoised). A test over
 * the real files (catalog.test.ts) fails CI on invalid data or dangling ids.
 */
import tasksJson from '../../data/tasks.json';
import suppliesJson from '../../data/supplies.json';
import houseJson from '../../data/house.json';
import {
  houseSchema,
  suppliesFileSchema,
  tasksFileSchema,
  type House,
  type Supply,
  type SupplyId,
  type Task,
  type TaskId,
} from '../shared/catalog-schema';

export {
  CATEGORIES,
  LANGS,
  PRIORITIES,
  WHO,
  l10n,
  type AreaId,
  type Category,
  type CategoryInfo,
  type House,
  type L10n,
  type Lang,
  type Priority,
  type Season,
  type Supply,
  type SupplyId,
  type Task,
  type TaskId,
  type TaskSupply,
  type Who,
} from '../shared/catalog-schema';

export interface Catalog {
  tasks: readonly Task[];
  supplies: readonly Supply[];
  house: House;
  taskById: ReadonlyMap<TaskId, Task>;
  supplyById: ReadonlyMap<SupplyId, Supply>;
}

/** Unvalidated catalog input (e.g. parsed JSON). */
export interface RawCatalog {
  tasks: unknown;
  supplies: unknown;
  house: unknown;
}

export class CatalogError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid catalog:\n- ${issues.join('\n- ')}`);
    this.name = 'CatalogError';
    this.issues = issues;
  }
}

export type CatalogResult = { ok: true; catalog: Catalog } | { ok: false; issues: string[] };

export const BUNDLED_CATALOG: RawCatalog = {
  tasks: tasksJson,
  supplies: suppliesJson,
  house: houseJson,
};

function schemaIssues(
  file: string,
  error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] },
): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.map(String).join('.');
    return `${file}${path ? `.${path}` : ''}: ${issue.message}`;
  });
}

function duplicates<T>(values: readonly T[]): T[] {
  const seen = new Set<T>();
  const dupes = new Set<T>();
  for (const v of values) (seen.has(v) ? dupes : seen).add(v);
  return [...dupes];
}

/** Validates a raw catalog and returns every problem found (never throws). */
export function validateCatalog(raw: RawCatalog): CatalogResult {
  const tasksParsed = tasksFileSchema.safeParse(raw.tasks);
  const suppliesParsed = suppliesFileSchema.safeParse(raw.supplies);
  const houseParsed = houseSchema.safeParse(raw.house);

  const issues: string[] = [];
  if (!tasksParsed.success) issues.push(...schemaIssues('tasks', tasksParsed.error));
  if (!suppliesParsed.success) issues.push(...schemaIssues('supplies', suppliesParsed.error));
  if (!houseParsed.success) issues.push(...schemaIssues('house', houseParsed.error));
  if (!tasksParsed.success || !suppliesParsed.success || !houseParsed.success) {
    return { ok: false, issues };
  }

  const tasks = tasksParsed.data;
  const supplies = suppliesParsed.data;
  const house = houseParsed.data;

  for (const id of duplicates(tasks.map((t) => t.id))) issues.push(`tasks: duplicate id "${id}"`);
  for (const id of duplicates(supplies.map((s) => s.id)))
    issues.push(`supplies: duplicate id "${id}"`);
  for (const m of duplicates(house.rainyMonths))
    issues.push(`house.rainyMonths: duplicate month ${m}`);
  for (const p of duplicates(house.people.map((name) => name.toLocaleLowerCase())))
    issues.push(`house.people: duplicate name "${p}"`);

  const supplyIds = new Set(supplies.map((s) => s.id));
  for (const task of tasks) {
    if (!Object.hasOwn(house.areas, task.area)) {
      issues.push(`tasks.${task.id}.area: unknown area "${task.area}" (not in house.areas)`);
    }
    for (const ref of task.supplies) {
      if (!supplyIds.has(ref.id)) {
        issues.push(`tasks.${task.id}.supplies: unknown supply "${ref.id}"`);
      }
    }
    for (const id of duplicates(task.supplies.map((s) => s.id))) {
      issues.push(`tasks.${task.id}.supplies: duplicate supply "${id}"`);
    }
    for (const m of duplicates(task.activeMonths ?? [])) {
      issues.push(`tasks.${task.id}.activeMonths: duplicate month ${m}`);
    }
  }

  if (issues.length > 0) return { ok: false, issues };
  return {
    ok: true,
    catalog: {
      tasks,
      supplies,
      house,
      taskById: new Map(tasks.map((t) => [t.id, t])),
      supplyById: new Map(supplies.map((s) => [s.id, s])),
    },
  };
}

/** Validates and returns the catalog; throws `CatalogError` listing every problem. */
export function loadCatalog(raw: RawCatalog = BUNDLED_CATALOG): Catalog {
  const result = validateCatalog(raw);
  if (!result.ok) throw new CatalogError(result.issues);
  return result.catalog;
}

let bundled: Catalog | undefined;

/** The bundled data/*.json catalog, validated once and memoised. */
export function getCatalog(): Catalog {
  bundled ??= loadCatalog(BUNDLED_CATALOG);
  return bundled;
}
