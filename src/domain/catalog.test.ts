import { describe, expect, it } from 'vitest';
import tasksJson from '../../data/tasks.json';
import suppliesJson from '../../data/supplies.json';
import houseJson from '../../data/house.json';
import { CATEGORIES } from '../shared/catalog-schema';
import { eachDay } from './dates';
import {
  BUNDLED_CATALOG,
  CatalogError,
  getCatalog,
  l10n,
  loadCatalog,
  validateCatalog,
  type RawCatalog,
} from './catalog';
import { taskStatuses } from './schedule';

// Vitest stubs CSS imports (even ?raw), so read the token file with Node's fs. The specifier is
// non-literal because the browser tsconfig (which covers src/) has no Node types.
const fsSpecifier = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fsSpecifier)) as {
  readFileSync: (path: URL, encoding: 'utf8') => string;
};
const tokensCss = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8');
const steps = (text: string) => text.split('\n').filter((line) => line.trim() !== '');
const clone = <T>(value: T): T => structuredClone(value);
const raw = (): RawCatalog => ({
  tasks: clone(tasksJson),
  supplies: clone(suppliesJson),
  house: clone(houseJson),
});

describe('bundled catalog (data/*.json)', () => {
  const catalog = getCatalog();

  it('loads and validates', () => {
    expect(() => loadCatalog()).not.toThrow();
    expect(validateCatalog(BUNDLED_CATALOG)).toMatchObject({ ok: true });
    expect(getCatalog()).toBe(catalog); // memoised
  });

  it('has the full starter content', () => {
    expect(catalog.tasks.length).toBeGreaterThanOrEqual(30);
    expect(catalog.supplies.length).toBeGreaterThanOrEqual(28);
    expect(catalog.taskById.size).toBe(catalog.tasks.length);
    expect(catalog.supplyById.size).toBe(catalog.supplies.length);
  });

  it('keeps the Phase 1 stub ids (referenced by D1 rows and the server)', () => {
    for (const id of ['rust-inspection', 'mow-lawn', 'daily-cat-care']) {
      expect(catalog.taskById.has(id)).toBe(true);
    }
  });

  it('marks every task as a draft needing owner confirmation', () => {
    expect(catalog.tasks.every((t) => !t.confirmed)).toBe(true);
  });

  it('uses every category and every area, and every supply is needed by some task', () => {
    const usedCategories = new Set(catalog.tasks.map((t) => t.category));
    expect([...CATEGORIES].filter((c) => !usedCategories.has(c))).toEqual([]);
    const usedAreas = new Set(catalog.tasks.map((t) => t.area));
    expect(Object.keys(catalog.house.areas).filter((a) => !usedAreas.has(a))).toEqual([]);
    const usedSupplies = new Set(catalog.tasks.flatMap((t) => t.supplies.map((s) => s.id)));
    expect(catalog.supplies.map((s) => s.id).filter((id) => !usedSupplies.has(id))).toEqual([]);
  });

  it('category colours are existing tokens named after the category', () => {
    for (const [key, info] of Object.entries(catalog.house.categories)) {
      expect(info.color).toBe(`cat-${key}`);
      expect(tokensCss).toContain(`--${info.color}:`);
    }
  });

  it('instructions and safety have the same steps in English and Spanish', () => {
    for (const task of catalog.tasks) {
      const en = steps(task.instructions.en);
      const es = steps(task.instructions.es);
      expect(en.length, task.id).toBeGreaterThanOrEqual(3);
      expect(es.length, task.id).toBe(en.length);
      if (task.safety) {
        expect(steps(task.safety.es).length, task.id).toBe(steps(task.safety.en).length);
      }
    }
  });

  it('task and supply names are unique in each language', () => {
    for (const lang of ['en', 'es'] as const) {
      const taskNames = catalog.tasks.map((t) => l10n(t.name, lang));
      expect(new Set(taskNames).size).toBe(taskNames.length);
      const supplyNames = catalog.supplies.map((s) => l10n(s.name, lang));
      expect(new Set(supplyNames).size).toBe(supplyNames.length);
    }
  });

  it('house config matches the property', () => {
    expect(catalog.house.rainyMonths).toEqual([5, 6, 7, 8, 9, 10, 11]);
    expect(catalog.house.yardDay).toBeGreaterThanOrEqual(1);
    expect(catalog.house.people.length).toBeGreaterThan(0);
  });

  it('season-specific and seasonal tasks are set up as planned', () => {
    const mow = catalog.taskById.get('mow-lawn');
    expect(mow?.frequencyDaysBySeason).toEqual({ rainy: 7, dry: 14 });
    expect(catalog.taskById.get('daily-cat-care')?.frequencyDays).toBe(1);
    expect(catalog.taskById.get('water-garden')?.activeMonths).toEqual([12, 1, 2, 3, 4]);
    for (const id of ['roof-inspection', 'gutters-deep-clean']) {
      expect(catalog.taskById.get(id)?.activeMonths, id).toEqual([3, 4]);
    }
  });

  it('every task has a computable status on every day of a year', () => {
    for (const day of eachDay('2026-01-01', '2026-12-31')) {
      const statuses = taskStatuses(catalog.tasks, [], day, catalog.house);
      expect(statuses.size).toBe(catalog.tasks.length);
    }
  });
});

describe('validateCatalog referential checks', () => {
  type Mutable = {
    tasks: Record<string, unknown>[];
    supplies: Record<string, unknown>[];
    house: Record<string, unknown>;
  };
  const mutate = (fn: (data: Mutable) => void): RawCatalog => {
    const data = raw() as unknown as Mutable;
    fn(data);
    return data as unknown as RawCatalog;
  };
  const issuesOf = (input: RawCatalog): string[] => {
    const result = validateCatalog(input);
    return result.ok ? [] : result.issues;
  };

  it('reports dangling supplies and unknown areas', () => {
    const input = mutate((d) => {
      d.tasks[0]!.supplies = [{ id: 'unobtainium' }];
      d.tasks[1]!.area = 'moon';
    });
    const issues = issuesOf(input);
    expect(issues).toContain('tasks.rust-inspection.supplies: unknown supply "unobtainium"');
    expect(issues.some((i) => i.includes('unknown area "moon"'))).toBe(true);
  });

  it('reports duplicate ids, duplicate supply refs and duplicate months/people', () => {
    const input = mutate((d) => {
      d.tasks.push(clone(d.tasks[0]!));
      d.supplies.push(clone(d.supplies[0]!));
      d.tasks[3]!.supplies = [{ id: 'gloves' }, { id: 'gloves' }];
      d.tasks[3]!.activeMonths = [1, 1];
      d.house.rainyMonths = [5, 5];
      d.house.people = ['JT', 'jt'];
    });
    const issues = issuesOf(input);
    expect(issues).toEqual(
      expect.arrayContaining([
        'tasks: duplicate id "rust-inspection"',
        'supplies: duplicate id "wire-brush"',
        'tasks.mow-lawn.supplies: duplicate supply "gloves"',
        'tasks.mow-lawn.activeMonths: duplicate month 1',
        'house.rainyMonths: duplicate month 5',
        'house.people: duplicate name "jt"',
      ]),
    );
  });

  it('reports schema errors with file and path prefixes', () => {
    const input = mutate((d) => {
      d.tasks[0]!.frequencyDays = 0;
      d.supplies[0]!.name = { en: 'x' };
      d.house.yardDay = 9;
    });
    const issues = issuesOf(input);
    expect(issues.some((i) => i.startsWith('tasks.0.frequencyDays:'))).toBe(true);
    expect(issues.some((i) => i.startsWith('supplies.0.name.es:'))).toBe(true);
    expect(issues.some((i) => i.startsWith('house.yardDay:'))).toBe(true);
    expect(
      issuesOf({ tasks: {}, supplies: [], house: houseJson }).some((i) => i.startsWith('tasks:')),
    ).toBe(true);
  });

  it('loadCatalog throws a CatalogError listing every issue', () => {
    const input = mutate((d) => {
      d.tasks[0]!.supplies = [{ id: 'nope' }];
    });
    expect(() => loadCatalog(input)).toThrow(CatalogError);
    try {
      loadCatalog(input);
    } catch (error) {
      expect(error).toBeInstanceOf(CatalogError);
      expect((error as CatalogError).issues).toHaveLength(1);
      expect((error as CatalogError).message).toContain('unknown supply "nope"');
    }
  });
});
