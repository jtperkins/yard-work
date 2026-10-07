import { describe, expect, it } from 'vitest';
import { todayCR } from './dates';
import {
  activePeriodStart,
  compareByUrgency,
  effectiveFrequency,
  firstActiveOnOrAfter,
  isActive,
  latestByTask,
  nextDueDate,
  percentOnTrack,
  projectDueDates,
  seasonFor,
  taskStatus,
  taskStatuses,
  urgencyRank,
  type TaskStatus,
} from './schedule';
import { DAILY, DRY_MONTHS, HOUSE, MOW, ROOF, WATER, done, makeTask } from './test-fixtures';

const TODAY = '2026-10-07'; // Wednesday, rainy season

describe('seasonFor', () => {
  it('switches at the configured rainy-month boundaries', () => {
    expect(seasonFor('2026-04-30', HOUSE)).toBe('dry');
    expect(seasonFor('2026-05-01', HOUSE)).toBe('rainy');
    expect(seasonFor('2026-11-30', HOUSE)).toBe('rainy');
    expect(seasonFor('2026-12-01', HOUSE)).toBe('dry');
  });

  it('is all dry when no rainy months are configured', () => {
    expect(seasonFor('2026-07-01', { rainyMonths: [] })).toBe('dry');
  });
});

describe('effectiveFrequency', () => {
  it('uses the season override when present', () => {
    expect(effectiveFrequency(MOW, '2026-10-07', HOUSE)).toBe(7);
    expect(effectiveFrequency(MOW, '2026-02-10', HOUSE)).toBe(14);
  });

  it('falls back to frequencyDays without (or with a partial) override', () => {
    expect(effectiveFrequency(DAILY, '2026-10-07', HOUSE)).toBe(1);
    const rainyOnly = makeTask({
      id: 'x',
      frequencyDays: 30,
      frequencyDaysBySeason: { rainy: 14 },
    });
    expect(effectiveFrequency(rainyOnly, '2026-06-01', HOUSE)).toBe(14);
    expect(effectiveFrequency(rainyOnly, '2026-01-01', HOUSE)).toBe(30);
  });
});

describe('active months', () => {
  it('isActive: all year without activeMonths, otherwise by month', () => {
    expect(isActive(MOW, '2026-07-15')).toBe(true);
    expect(isActive(WATER, '2026-12-01')).toBe(true);
    expect(isActive(WATER, '2026-04-30')).toBe(true);
    expect(isActive(WATER, '2026-05-01')).toBe(false);
    expect(isActive(makeTask({ id: 'x', activeMonths: [] }), '2026-05-01')).toBe(true);
  });

  it('firstActiveOnOrAfter jumps to the 1st of the next active month (across years)', () => {
    expect(firstActiveOnOrAfter(WATER, '2026-12-15')).toBe('2026-12-15');
    expect(firstActiveOnOrAfter(WATER, '2026-05-10')).toBe('2026-12-01');
    expect(firstActiveOnOrAfter(ROOF, '2026-05-10')).toBe('2027-03-01');
    expect(firstActiveOnOrAfter(ROOF, '2026-02-28')).toBe('2026-03-01');
    expect(firstActiveOnOrAfter(MOW, '2026-05-10')).toBe('2026-05-10');
  });

  it('activePeriodStart finds the start of the current active run (wrapping the year)', () => {
    expect(activePeriodStart(WATER, '2027-02-15')).toBe('2026-12-01');
    expect(activePeriodStart(WATER, '2026-12-20')).toBe('2026-12-01');
    expect(activePeriodStart(ROOF, '2026-04-20')).toBe('2026-03-01');
    expect(activePeriodStart(MOW, '2026-04-20')).toBeNull();
    const allYear = makeTask({ id: 'x', activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] });
    expect(activePeriodStart(allYear, '2026-04-20')).toBeNull();
    expect(isActive(allYear, '2026-04-20')).toBe(true);
  });
});

describe('nextDueDate', () => {
  it('evaluates the season at lastDone, not at the due date', () => {
    // Done in dry season (14 days) even though the due date falls in rainy season.
    expect(nextDueDate(MOW, '2026-04-28', '2026-04-28', HOUSE)).toBe('2026-05-12');
    // Done in rainy season (7 days) even though the due date falls in dry season.
    expect(nextDueDate(MOW, '2026-11-28', '2026-11-28', HOUSE)).toBe('2026-12-05');
  });

  it('never done → today, or the first active day when dormant', () => {
    expect(nextDueDate(MOW, undefined, TODAY, HOUSE)).toBe(TODAY);
    expect(nextDueDate(WATER, undefined, TODAY, HOUSE)).toBe('2026-12-01');
  });
});

describe('taskStatus', () => {
  it('never done and active → never, due today', () => {
    expect(taskStatus(MOW, [], TODAY, HOUSE)).toEqual({
      taskId: 'mow-lawn',
      state: 'never',
      nextDue: TODAY,
      daysUntilDue: 0,
      frequencyDays: 7,
    });
  });

  it('overdue / due-soon / ok around the 3-day window', () => {
    const overdue = taskStatus(MOW, [done('mow-lawn', '2026-09-20')], TODAY, HOUSE);
    expect(overdue).toMatchObject({ state: 'overdue', nextDue: '2026-09-27', daysUntilDue: -10 });

    const dueToday = taskStatus(MOW, [done('mow-lawn', '2026-09-30')], TODAY, HOUSE);
    expect(dueToday).toMatchObject({ state: 'due-soon', daysUntilDue: 0 });

    const soon = taskStatus(MOW, [done('mow-lawn', '2026-10-03')], TODAY, HOUSE);
    expect(soon).toMatchObject({ state: 'due-soon', nextDue: '2026-10-10', daysUntilDue: 3 });

    const ok = taskStatus(MOW, [done('mow-lawn', '2026-10-04')], TODAY, HOUSE);
    expect(ok).toMatchObject({ state: 'ok', nextDue: '2026-10-11', daysUntilDue: 4 });
  });

  it('daily tasks: done today ok, due today due-soon, missed a day overdue', () => {
    expect(taskStatus(DAILY, [done('daily-cat-care', TODAY)], TODAY, HOUSE).state).toBe('ok');
    expect(taskStatus(DAILY, [done('daily-cat-care', '2026-10-06')], TODAY, HOUSE)).toMatchObject({
      state: 'due-soon',
      daysUntilDue: 0,
    });
    expect(taskStatus(DAILY, [done('daily-cat-care', '2026-10-05')], TODAY, HOUSE)).toMatchObject({
      state: 'overdue',
      daysUntilDue: -1,
    });
    expect(taskStatus(DAILY, [], TODAY, HOUSE).state).toBe('never');
  });

  it('short cadences are not "due soon" right after being done', () => {
    const today = '2026-02-10';
    expect(taskStatus(WATER, [done('water-garden', today)], today, HOUSE).state).toBe('ok');
    expect(taskStatus(WATER, [done('water-garden', '2026-02-09')], today, HOUSE).state).toBe(
      'due-soon',
    );
  });

  it('season switch: cadence follows the season at the last sign-off', () => {
    // Last mowed 2026-04-25 (dry → 14 days) → due 2026-05-09, checked 2026-05-08 (rainy).
    const s = taskStatus(MOW, [done('mow-lawn', '2026-04-25')], '2026-05-08', HOUSE);
    expect(s).toMatchObject({ nextDue: '2026-05-09', state: 'due-soon', frequencyDays: 7 });
    // Last mowed 2026-11-29 (rainy → 7 days) → due 2026-12-06, checked 2026-12-07 (dry).
    const t = taskStatus(MOW, [done('mow-lawn', '2026-11-29')], '2026-12-07', HOUSE);
    expect(t).toMatchObject({ nextDue: '2026-12-06', state: 'overdue', frequencyDays: 14 });
  });

  it('dormant months: not due, shows when it resumes', () => {
    const s = taskStatus(WATER, [done('water-garden', '2026-04-20', 'Ana')], TODAY, HOUSE);
    expect(s).toEqual({
      taskId: 'water-garden',
      state: 'dormant',
      lastDone: '2026-04-20',
      lastDoneBy: 'Ana',
      nextDue: '2026-12-01',
      daysUntilDue: 55,
      frequencyDays: 3,
    });
    expect(taskStatus(WATER, [], TODAY, HOUSE)).toMatchObject({
      state: 'dormant',
      nextDue: '2026-12-01',
    });
  });

  it('due date inside a dormant period moves to the first active day', () => {
    const history = [done('water-garden', '2026-04-29')]; // raw due 2026-05-02 (dormant)
    expect(taskStatus(WATER, history, '2026-12-01', HOUSE)).toMatchObject({
      state: 'due-soon',
      nextDue: '2026-12-01',
      daysUntilDue: 0,
    });
    expect(taskStatus(WATER, history, '2026-12-05', HOUSE)).toMatchObject({
      state: 'overdue',
      nextDue: '2026-12-01',
      daysUntilDue: -4,
    });
  });

  it('overdue from a previous active period is counted from the current period start', () => {
    const marchOnly = makeTask({ id: 'm', frequencyDays: 20, activeMonths: [3, 4] });
    // raw due 2025-03-25 (active month, but last year's period)
    const s = taskStatus(marchOnly, [done('m', '2025-03-05')], '2026-03-10', HOUSE);
    expect(s).toMatchObject({ state: 'overdue', nextDue: '2026-03-01', daysUntilDue: -9 });
    // before-rainy-season pattern: raw due 2026-01-04 (dormant) → due 2026-03-01
    const r = taskStatus(ROOF, [done('roof-inspection', '2025-03-10')], '2026-03-15', HOUSE);
    expect(r).toMatchObject({ state: 'overdue', nextDue: '2026-03-01' });
  });

  it('a future raw due date in a dormant month resumes on the next active day', () => {
    const s = taskStatus(ROOF, [done('roof-inspection', '2026-04-15')], '2026-04-20', HOUSE);
    expect(s).toMatchObject({ state: 'ok', nextDue: '2027-03-01' });
  });

  it('uses the latest own sign-off and ignores other tasks, ad-hoc and future rows', () => {
    const rows = [
      done('mow-lawn', '2026-09-01', 'A'),
      done('mow-lawn', '2026-10-05', 'B'),
      done('mow-lawn', '2026-10-20', 'Future'),
      done('daily-cat-care', '2026-10-07'),
      done(null, '2026-10-07'),
    ];
    expect(taskStatus(MOW, rows, TODAY, HOUSE)).toMatchObject({
      lastDone: '2026-10-05',
      lastDoneBy: 'B',
      state: 'ok',
    });
  });

  it('omits lastDoneBy when the completion has no doneBy', () => {
    const s = taskStatus(MOW, [{ taskId: 'mow-lawn', doneOn: '2026-10-05' }], TODAY, HOUSE);
    expect(s.lastDone).toBe('2026-10-05');
    expect('lastDoneBy' in s).toBe(false);
  });
});

describe('Costa Rica vs UTC boundaries', () => {
  it('23:30 in Costa Rica is still "today" although UTC has rolled over', () => {
    const now = new Date('2026-10-08T05:30:00Z'); // 23:30 on Oct 7 in CR
    const today = todayCR(now);
    expect(today).toBe('2026-10-07');
    // Cat care signed off on Oct 7 (CR) is not due again yet.
    expect(taskStatus(DAILY, [done('daily-cat-care', '2026-10-07')], today, HOUSE).state).toBe(
      'ok',
    );
  });

  it('00:00 in Costa Rica (06:00Z) rolls the day', () => {
    const today = todayCR(new Date('2026-10-08T06:00:00Z'));
    expect(today).toBe('2026-10-08');
    expect(taskStatus(DAILY, [done('daily-cat-care', '2026-10-07')], today, HOUSE).state).toBe(
      'due-soon',
    );
  });

  it('season flips on the CR date, not the UTC date', () => {
    // 2026-04-30 22:00 CR = 2026-05-01 04:00Z
    const today = todayCR(new Date('2026-05-01T04:00:00Z'));
    expect(today).toBe('2026-04-30');
    expect(seasonFor(today, HOUSE)).toBe('dry');
    expect(isActive(WATER, today)).toBe(true);
  });
});

describe('taskStatuses / latestByTask', () => {
  it('matches taskStatus for every task', () => {
    const rows = [done('mow-lawn', '2026-10-01'), done('daily-cat-care', '2026-10-07')];
    const map = taskStatuses([MOW, DAILY, WATER], rows, TODAY, HOUSE);
    for (const t of [MOW, DAILY, WATER]) {
      expect(map.get(t.id)).toEqual(taskStatus(t, rows, TODAY, HOUSE));
    }
  });

  it('latestByTask keeps the newest row per task and skips ad-hoc', () => {
    const rows = [
      done('a', '2026-01-02'),
      done('a', '2026-01-05'),
      done('a', '2026-01-03'),
      done(null, '2026-02-01'),
    ];
    const map = latestByTask(rows);
    expect(map.size).toBe(1);
    expect(map.get('a')?.doneOn).toBe('2026-01-05');
    expect(latestByTask(rows, '2026-01-04').get('a')?.doneOn).toBe('2026-01-03');
  });
});

describe('percentOnTrack & urgency', () => {
  const s = (state: TaskStatus['state']) => ({ state });

  it('counts active tasks that are not overdue/never', () => {
    expect(percentOnTrack([s('ok'), s('due-soon'), s('overdue')])).toBe(67);
    expect(percentOnTrack([s('ok'), s('never'), s('dormant'), s('dormant')])).toBe(50);
    expect(percentOnTrack([s('dormant')])).toBe(100);
    expect(percentOnTrack([])).toBe(100);
  });

  it('ranks overdue and never together, then due-soon, ok, dormant', () => {
    expect(urgencyRank('overdue')).toBe(urgencyRank('never'));
    const list: Pick<TaskStatus, 'state' | 'nextDue'>[] = [
      { state: 'dormant', nextDue: '2026-12-01' },
      { state: 'ok', nextDue: '2026-10-20' },
      { state: 'never', nextDue: TODAY },
      { state: 'due-soon', nextDue: '2026-10-09' },
      { state: 'overdue', nextDue: '2026-09-01' },
      { state: 'ok' },
    ];
    expect([...list].sort(compareByUrgency).map((x) => x.state)).toEqual([
      'overdue',
      'never',
      'due-soon',
      'ok',
      'ok',
      'dormant',
    ]);
  });
});

describe('projectDueDates', () => {
  it('projects at the current cadence within the range', () => {
    expect(projectDueDates(MOW, '2026-10-01', '2026-10-01', '2026-10-31', HOUSE, TODAY)).toEqual([
      '2026-10-08',
      '2026-10-15',
      '2026-10-22',
      '2026-10-29',
    ]);
  });

  it('switches cadence when the projection crosses into dry season', () => {
    expect(
      projectDueDates(MOW, '2026-11-20', '2026-11-20', '2026-12-31', HOUSE, '2026-11-20'),
    ).toEqual(['2026-11-27', '2026-12-04', '2026-12-18']);
  });

  it('projects overdue and never-done tasks from today', () => {
    expect(projectDueDates(MOW, '2026-09-01', '2026-10-01', '2026-10-31', HOUSE, TODAY)).toEqual([
      '2026-10-07',
      '2026-10-14',
      '2026-10-21',
      '2026-10-28',
    ]);
    expect(projectDueDates(MOW, undefined, '2026-10-01', '2026-10-15', HOUSE, TODAY)).toEqual([
      '2026-10-07',
      '2026-10-14',
    ]);
  });

  it('skips dormant months', () => {
    expect(
      projectDueDates(WATER, '2026-04-28', '2026-04-01', '2026-12-07', HOUSE, '2026-04-28'),
    ).toEqual(['2026-12-01', '2026-12-04', '2026-12-07']);
    // projection that starts active and runs into the dormant period
    expect(
      projectDueDates(WATER, '2026-04-24', '2026-04-01', '2026-12-02', HOUSE, '2026-04-24'),
    ).toEqual(['2026-04-27', '2026-04-30', '2026-12-01']);
  });

  it('daily tasks fill every day; empty for past or inverted ranges', () => {
    expect(projectDueDates(DAILY, TODAY, '2026-10-05', '2026-10-11', HOUSE, TODAY)).toEqual([
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ]);
    expect(projectDueDates(MOW, '2026-09-01', '2026-09-01', '2026-09-30', HOUSE, TODAY)).toEqual(
      [],
    );
    expect(projectDueDates(MOW, TODAY, '2026-10-31', '2026-10-01', HOUSE, TODAY)).toEqual([]);
  });

  it('works for long ranges with a dry-season-only task', () => {
    const paint = makeTask({ id: 'paint', frequencyDays: 180, activeMonths: DRY_MONTHS });
    expect(
      projectDueDates(paint, '2026-01-10', '2026-01-01', '2028-12-31', HOUSE, '2026-01-10'),
    ).toEqual(['2026-12-01', '2027-12-01', '2028-12-01']);
  });
});
