import { describe, expect, it } from 'vitest';
import tasksJson from '../../data/tasks.json';
import suppliesJson from '../../data/supplies.json';
import houseJson from '../../data/house.json';
import {
  CATEGORIES,
  houseSchema,
  l10n,
  suppliesFileSchema,
  taskSchema,
  tasksFileSchema,
} from './catalog-schema';

const validTask = {
  id: 'mow-lawn',
  name: { en: 'Mow', es: 'Chapia' },
  category: 'lawn',
  area: 'lawn',
  frequencyDays: 14,
  estimatedMinutes: 60,
  who: 'yard',
  priority: 'normal',
  instructions: { en: 'Mow it', es: 'Chapee' },
  supplies: [],
  confirmed: false,
};

describe('catalog schema', () => {
  it('accepts the bundled data files', () => {
    expect(tasksFileSchema.safeParse(tasksJson).success).toBe(true);
    expect(suppliesFileSchema.safeParse(suppliesJson).success).toBe(true);
    expect(houseSchema.safeParse(houseJson).success).toBe(true);
  });

  it('keeps the Phase 1 stub task ids', () => {
    const ids = tasksFileSchema.parse(tasksJson).map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining(['rust-inspection', 'mow-lawn', 'daily-cat-care']));
  });

  it('house.json labels and colours every category', () => {
    const house = houseSchema.parse(houseJson);
    expect(Object.keys(house.categories).sort()).toEqual([...CATEGORIES].sort());
  });

  it('rejects unknown keys, bad slugs, bad months and missing translations', () => {
    expect(taskSchema.safeParse(validTask).success).toBe(true);
    expect(taskSchema.safeParse({ ...validTask, extra: 1 }).success).toBe(false);
    expect(taskSchema.safeParse({ ...validTask, id: 'Mow Lawn' }).success).toBe(false);
    expect(taskSchema.safeParse({ ...validTask, activeMonths: [0] }).success).toBe(false);
    expect(taskSchema.safeParse({ ...validTask, name: { en: 'Mow', es: ' ' } }).success).toBe(
      false,
    );
    expect(taskSchema.safeParse({ ...validTask, category: 'pool' }).success).toBe(false);
  });

  it('house requires every category', () => {
    const house = houseSchema.parse(houseJson);
    const { cats: _omit, ...partial } = house.categories;
    expect(houseSchema.safeParse({ ...house, categories: partial }).success).toBe(false);
  });

  it('l10n picks the language', () => {
    expect(l10n({ en: 'Cats', es: 'Gatos' }, 'es')).toBe('Gatos');
    expect(l10n({ en: 'Cats', es: 'Gatos' }, 'en')).toBe('Cats');
  });
});
