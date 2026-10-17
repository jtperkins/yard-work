import { describe, expect, it } from 'vitest';
import { addMonthsISO } from './dates';
import {
  addInterval,
  compareByUrgency,
  intervalDays,
  isDailyTask,
  latestByTask,
  latestPartialByTask,
  percentOnTrack,
  taskStatus,
  taskStatuses,
  urgencyRank,
  type TaskStatus,
} from './schedule';
import { CHAPIA, DAILY, RUST, done, makeOneOff, makeTask, partialDone } from './test-fixtures';

const TODAY = '2026-10-17';

describe('recurring task with partial sign-offs', () => {
  it('(a) only a partial: never, due today, in progress', () => {
    const s = taskStatus(CHAPIA, [partialDone('chapia', '2026-10-17', 'Half the lawn')], TODAY);
    expect(s.state).toBe('never');
    expect(s.nextDue).toBe('2026-10-17');
    expect(s.inProgress).toEqual({ on: '2026-10-17', note: 'Half the lawn', by: 'JT' });
  });

  it('(b) a later full sign-off resets the schedule and clears in progress', () => {
    const s = taskStatus(
      CHAPIA,
      [partialDone('chapia', '2026-10-17', 'Half'), done('chapia', '2026-10-24')],
      '2026-10-24',
    );
    expect(s.nextDue).toBe('2026-11-07');
    expect(s.inProgress).toBeUndefined();
  });

  it('(b2) a partial after a full one keeps the schedule from the full one', () => {
    const s = taskStatus(
      CHAPIA,
      [done('chapia', '2026-10-24'), partialDone('chapia', '2026-11-05', 'Edges left')],
      '2026-11-05',
    );
    expect(s.nextDue).toBe('2026-11-07');
    expect(s.state).toBe('due-soon');
    expect(s.inProgress?.on).toBe('2026-11-05');
    expect(s.lastDone).toBe('2026-10-24');
  });

  it('(b3) a partial older than the last full sign-off is ignored', () => {
    const s = taskStatus(
      CHAPIA,
      [partialDone('chapia', '2026-10-20', 'Half'), done('chapia', '2026-10-24')],
      '2026-10-24',
    );
    expect(s.inProgress).toBeUndefined();
  });

  it('uses createdAt to order a full and a partial on the same day', () => {
    const full = { ...done('chapia', '2026-10-24'), createdAt: '2026-10-24T10:00:00Z' };
    const later = {
      ...partialDone('chapia', '2026-10-24', 'More'),
      createdAt: '2026-10-24T15:00:00Z',
    };
    expect(taskStatus(CHAPIA, [full, later], '2026-10-24').inProgress?.on).toBe('2026-10-24');
    const earlier = { ...later, createdAt: '2026-10-24T08:00:00Z' };
    expect(taskStatus(CHAPIA, [full, earlier], '2026-10-24').inProgress).toBeUndefined();
  });

  it('latestByTask only counts full sign-offs; latestPartialByTask the newest partial', () => {
    const rows = [
      done('t', '2026-10-01'),
      partialDone('t', '2026-10-05', 'a'),
      partialDone('t', '2026-10-08', 'b'),
    ];
    const full = latestByTask(rows, TODAY);
    expect(full.get('t')?.doneOn).toBe('2026-10-01');
    expect(latestPartialByTask(rows, TODAY, full).get('t')?.doneOn).toBe('2026-10-08');
  });
});

describe('one-off tasks', () => {
  it('(c) without a sign-off: never when undated, otherwise by due date', () => {
    expect(taskStatus(makeOneOff('t'), [], TODAY).state).toBe('never');
    expect(taskStatus(makeOneOff('t', '2026-10-30'), [], TODAY).state).toBe('ok');
    expect(taskStatus(makeOneOff('t', '2026-10-19'), [], TODAY).state).toBe('due-soon');
    expect(taskStatus(makeOneOff('t', '2026-10-10'), [], TODAY).state).toBe('overdue');
  });

  it('(d) a full sign-off makes it done, and removing it reopens it', () => {
    const task = makeOneOff('t', '2026-10-10');
    const s = taskStatus(task, [done('t', '2026-10-16')], TODAY);
    expect(s.state).toBe('done');
    expect(s.nextDue).toBeUndefined();
    expect(s.lastDone).toBe('2026-10-16');
    expect(taskStatus(task, [], TODAY).state).toBe('overdue');
    expect(taskStatus(makeOneOff('t'), [], TODAY).state).toBe('never');
    const withLater = taskStatus(
      task,
      [done('t', '2026-10-15'), partialDone('t', '2026-10-16', 'x')],
      TODAY,
    );
    expect(withLater.state).toBe('done');
    expect(withLater.inProgress).toBeUndefined();
  });

  it('(e) only a partial: never with in progress, not done', () => {
    const s = taskStatus(makeOneOff('t'), [partialDone('t', '2026-10-16', 'half')], TODAY);
    expect(s.state).toBe('never');
    expect(s.inProgress?.note).toBe('half');
  });
});

describe('intervals', () => {
  it('(f) six months: never done is due today, done 2026-08-31 is due 2027-02-28', () => {
    const none = taskStatus(RUST, [], TODAY);
    expect(none.state).toBe('never');
    expect(none.nextDue).toBe(TODAY);
    expect(taskStatus(RUST, [done('rust-inspection', '2026-08-31')], TODAY).nextDue).toBe(
      '2027-02-28',
    );
  });

  it('(g) addMonthsISO clamps to the end of the month', () => {
    expect(addMonthsISO('2026-08-31', 6)).toBe('2027-02-28');
    expect(addMonthsISO('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsISO('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonthsISO('2026-11-15', 3)).toBe('2027-02-15');
  });

  it('(h) intervalDays, isDailyTask and the due-soon window', () => {
    expect(intervalDays(makeTask({ id: 'x', intervalCount: 2, intervalUnit: 'week' }))).toBe(14);
    expect(intervalDays(RUST)).toBe(180);
    expect(intervalDays(makeOneOff('x'))).toBeNull();
    expect(isDailyTask(DAILY)).toBe(true);
    expect(isDailyTask(CHAPIA)).toBe(false);
    expect(isDailyTask(makeOneOff('x'))).toBe(false);
    // 6 months: window 3. Done 2026-04-17 is due 2026-10-17, so 3 days before is due-soon.
    const sixMonths = (today: string) =>
      taskStatus(RUST, [done('rust-inspection', '2026-04-17')], today).state;
    expect(sixMonths('2026-10-13')).toBe('ok');
    expect(sixMonths('2026-10-14')).toBe('due-soon');
    // 2 days: window 1.
    const twoDays = makeTask({ id: 'y', intervalCount: 2, intervalUnit: 'day' });
    expect(taskStatus(twoDays, [done('y', '2026-10-15')], '2026-10-15').state).toBe('ok');
    expect(taskStatus(twoDays, [done('y', '2026-10-15')], '2026-10-16').state).toBe('due-soon');
  });

  it('addInterval handles days, weeks and months', () => {
    expect(addInterval('2026-10-01', { intervalCount: 10, intervalUnit: 'day' })).toBe(
      '2026-10-11',
    );
    expect(addInterval('2026-10-01', { intervalCount: 2, intervalUnit: 'week' })).toBe(
      '2026-10-15',
    );
    expect(addInterval('2026-10-31', { intervalCount: 1, intervalUnit: 'month' })).toBe(
      '2026-11-30',
    );
  });

  it('a daily task is due-soon on the day it is due, overdue the day after', () => {
    expect(taskStatus(DAILY, [done('daily', '2026-10-16')], TODAY).state).toBe('due-soon');
    expect(taskStatus(DAILY, [done('daily', '2026-10-17')], TODAY).state).toBe('ok');
    expect(taskStatus(DAILY, [done('daily', '2026-10-15')], TODAY).state).toBe('overdue');
  });

  it('ignores sign-offs dated after today and ad-hoc rows', () => {
    const s = taskStatus(CHAPIA, [done('chapia', '2026-10-20'), done(null, '2026-10-16')], TODAY);
    expect(s.state).toBe('never');
  });
});

describe('percentOnTrack and ordering', () => {
  const s = (state: TaskStatus['state'], nextDue?: string): TaskStatus => ({
    taskId: 'x',
    state,
    frequencyDays: 14,
    ...(nextDue ? { nextDue } : {}),
  });

  it('(i) percentOnTrack ignores done tasks', () => {
    expect(percentOnTrack([s('ok'), s('overdue'), s('done'), s('done')])).toBe(50);
    expect(percentOnTrack([s('done')])).toBe(100);
    expect(percentOnTrack([])).toBe(100);
    expect(percentOnTrack([s('due-soon'), s('never'), s('never'), s('ok')])).toBe(50);
  });

  it('urgencyRank puts done last, and compareByUrgency orders by due date', () => {
    expect(urgencyRank('overdue')).toBe(urgencyRank('never'));
    expect(urgencyRank('done')).toBeGreaterThan(urgencyRank('ok'));
    const list = [s('done'), s('ok', '2026-11-01'), s('overdue', '2026-10-01'), s('due-soon')];
    expect([...list].sort(compareByUrgency).map((x) => x.state)).toEqual([
      'overdue',
      'due-soon',
      'ok',
      'done',
    ]);
  });

  it('taskStatuses maps every task in one pass', () => {
    const map = taskStatuses([CHAPIA, RUST], [done('chapia', '2026-10-10')], TODAY);
    expect(map.get('chapia')?.state).toBe('ok');
    expect(map.get('rust-inspection')?.state).toBe('never');
  });
});
