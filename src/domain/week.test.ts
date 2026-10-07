import { describe, expect, it } from 'vitest';
import { projectedDoneOn, suggestForWeek } from './week';
import { DAILY, HOUSE, MOW, WATER, done, makeTask, planned } from './test-fixtures';

const TODAY = '2026-10-07'; // Wednesday
const MONDAY = '2026-10-05';

const overdueHigh = makeTask({ id: 'overdue-high', priority: 'high', frequencyDays: 7 });
const overdueLow = makeTask({ id: 'overdue-low', priority: 'low', frequencyDays: 7 });
const neverNormal = makeTask({ id: 'never-normal', priority: 'normal', frequencyDays: 30 });
const dueThisWeek = makeTask({
  id: 'due-this-week',
  priority: 'low',
  frequencyDays: 10,
  who: 'yard',
});
const dueLater = makeTask({ id: 'due-later', priority: 'high', frequencyDays: 30 });
const alreadyPlanned = makeTask({ id: 'already-planned', frequencyDays: 7 });

const completions = [
  done('overdue-high', '2026-09-20'), // due 09-27
  done('overdue-low', '2026-09-25'), // due 10-02
  done('due-this-week', '2026-10-01'), // due 10-11 (Sunday)
  done('due-later', '2026-10-01'), // due 10-31
  done('already-planned', '2026-09-01'),
];

describe('suggestForWeek', () => {
  const tasks = [
    dueLater,
    dueThisWeek,
    neverNormal,
    overdueLow,
    overdueHigh,
    alreadyPlanned,
    DAILY,
  ];

  it('suggests due/overdue/never tasks not already planned, sorted by urgency then priority', () => {
    const result = suggestForWeek(
      tasks,
      completions,
      [planned('already-planned', MONDAY)],
      MONDAY,
      HOUSE,
      TODAY,
    );
    expect(result.map((s) => s.task.id)).toEqual([
      'overdue-high',
      'never-normal',
      'overdue-low',
      'due-this-week',
    ]);
    expect(result[1]).toMatchObject({ dueOn: TODAY, status: { state: 'never' } });
    expect(result[3]).toMatchObject({ dueOn: '2026-10-11', who: 'yard' });
  });

  it('normalises any date to its Monday', () => {
    const fromWednesday = suggestForWeek(tasks, completions, [], TODAY, HOUSE, TODAY);
    const fromMonday = suggestForWeek(tasks, completions, [], MONDAY, HOUSE, TODAY);
    expect(fromWednesday).toEqual(fromMonday);
  });

  it('done and skipped plan items also suppress; other weeks and ad-hoc items do not', () => {
    const items = [
      planned('overdue-high', MONDAY, 'done'),
      planned('overdue-low', MONDAY, 'skipped'),
      planned('never-normal', '2026-09-28'),
      planned(null, MONDAY),
    ];
    const ids = suggestForWeek(tasks, completions, items, MONDAY, HOUSE, TODAY).map(
      (s) => s.task.id,
    );
    expect(ids).not.toContain('overdue-high');
    expect(ids).not.toContain('overdue-low');
    expect(ids).toContain('never-normal');
  });

  it('leaves daily tasks out unless asked', () => {
    const ids = (includeDaily: boolean) =>
      suggestForWeek([DAILY], [], [], MONDAY, HOUSE, TODAY, { includeDaily }).map((s) => s.task.id);
    expect(ids(false)).toEqual([]);
    expect(ids(true)).toEqual(['daily-cat-care']);
  });

  it('uses the season cadence (rainy mowing is weekly)', () => {
    const result = suggestForWeek(
      [MOW],
      [done('mow-lawn', '2026-10-03')],
      [],
      MONDAY,
      HOUSE,
      TODAY,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ dueOn: '2026-10-10', status: { state: 'due-soon' } });
  });

  it('skips tasks dormant all week, includes them once they become active within the week', () => {
    expect(suggestForWeek([WATER], [], [], MONDAY, HOUSE, TODAY)).toEqual([]);
    // Week of Mon 2026-11-30: watering resumes Tue 2026-12-01.
    const result = suggestForWeek([WATER], [], [], '2026-11-30', HOUSE, '2026-11-26');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ dueOn: '2026-12-01', status: { state: 'dormant' } });
  });

  it('does not suggest an overdue task for a future week that is entirely dormant', () => {
    const today = '2026-04-28';
    const history = [done('water-garden', '2026-04-20')];
    expect(suggestForWeek([WATER], history, [], '2026-04-27', HOUSE, today)).toHaveLength(1);
    expect(suggestForWeek([WATER], history, [], '2026-05-04', HOUSE, today)).toEqual([]);
  });

  it('a later week also picks up tasks due before it starts', () => {
    const ids = suggestForWeek([dueLater], completions, [], '2026-10-26', HOUSE, TODAY).map(
      (s) => s.task.id,
    );
    expect(ids).toEqual(['due-later']);
  });

  describe('items still planned in an earlier week', () => {
    // weed-beds every 14 days, last done 09-24 → due 10-08, already planned this week.
    const weed = makeTask({ id: 'weed-beds', frequencyDays: 14 });
    const history = [done('weed-beds', '2026-09-24')];
    const yardHouse = { ...HOUSE, yardDay: 4 }; // Thursday
    const NEXT = '2026-10-12';

    it('are not suggested again next week when the cadence does not bring them back', () => {
      const items = [planned('weed-beds', MONDAY)];
      expect(suggestForWeek([weed], history, items, NEXT, yardHouse, TODAY)).toEqual([]);
      // Without this week's plan it would be suggested (due 10-08 ≤ next Sunday).
      expect(suggestForWeek([weed], history, [], NEXT, yardHouse, TODAY)).toHaveLength(1);
    });

    it('come back once a cadence after that week’s yard day', () => {
      const weekly = makeTask({ id: 'rake', frequencyDays: 7 });
      const result = suggestForWeek(
        [weekly],
        [done('rake', '2026-09-20')], // overdue now
        [planned('rake', MONDAY)],
        NEXT,
        yardHouse,
        TODAY,
      );
      // Projected done Thu 10-08 → due Thu 10-15, not "overdue".
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        dueOn: '2026-10-15',
        status: { state: 'ok', lastDone: '2026-09-20', nextDue: '2026-10-15' },
      });
    });

    it('ignore done/skipped items and stale items from past weeks', () => {
      for (const items of [
        [planned('weed-beds', MONDAY, 'skipped')],
        [planned('weed-beds', '2026-09-28')], // last week, never done: still due
      ]) {
        expect(suggestForWeek([weed], history, items, NEXT, yardHouse, TODAY)).toHaveLength(1);
      }
    });
  });

  it('projects a planned item onto its yard day, clamped to today and the week', () => {
    expect(projectedDoneOn(MONDAY, TODAY, 4)).toBe('2026-10-08');
    expect(projectedDoneOn(MONDAY, TODAY, 1)).toBe(TODAY);
    expect(projectedDoneOn(MONDAY, '2026-10-12', 4)).toBe('2026-10-11');
    expect(projectedDoneOn('2026-10-12', TODAY)).toBe('2026-10-12');
  });
});
