import { describe, expect, it } from 'vitest';
import { suppliesForPlan } from './supplies';
import { makeSupply, makeTask, planned } from './test-fixtures';

const WEEK = '2026-10-05';
const note = { en: 'Small can', es: 'Lata pequeña' };

const supplies = [
  makeSupply('gloves'),
  makeSupply('primer'),
  makeSupply('brush'),
  makeSupply('bait'),
];
const tasks = [
  makeTask({ id: 'rust', supplies: [{ id: 'brush' }, { id: 'primer', note }, { id: 'gloves' }] }),
  makeTask({ id: 'mow', supplies: [{ id: 'gloves' }] }),
  makeTask({ id: 'ants', supplies: [{ id: 'bait' }, { id: 'gloves' }] }),
  makeTask({ id: 'water', supplies: [] }),
];

describe('suppliesForPlan', () => {
  it('returns unique supplies in catalog order with the tasks needing each', () => {
    const result = suppliesForPlan(
      [planned('mow', WEEK), planned('rust', WEEK), planned('water', WEEK)],
      tasks,
      supplies,
    );
    expect(result.map((r) => r.supply.id)).toEqual(['gloves', 'primer', 'brush']);
    expect(result[0]?.tasks.map((t) => t.task.id)).toEqual(['mow', 'rust']);
    expect(result[1]?.tasks).toEqual([{ task: tasks[0], note }]);
    expect(result[2]?.tasks[0]).not.toHaveProperty('note');
  });

  it('ignores skipped, ad-hoc, unknown and duplicate plan items; keeps done ones', () => {
    const result = suppliesForPlan(
      [
        planned('ants', WEEK, 'skipped'),
        planned(null, WEEK),
        planned('ghost', WEEK),
        planned('mow', WEEK, 'done'),
        planned('mow', WEEK),
      ],
      tasks,
      supplies,
    );
    expect(result).toEqual([{ supply: supplies[0], tasks: [{ task: tasks[1] }] }]);
  });

  it('ignores supply ids missing from the catalog and dedupes a supply listed twice', () => {
    const odd = makeTask({ id: 'odd', supplies: [{ id: 'nope' }, { id: 'bait' }, { id: 'bait' }] });
    const result = suppliesForPlan([planned('odd', WEEK)], [odd], supplies);
    expect(result).toEqual([{ supply: supplies[3], tasks: [{ task: odd }] }]);
  });

  it('is empty for an empty plan', () => {
    expect(suppliesForPlan([], tasks, supplies)).toEqual([]);
  });
});
