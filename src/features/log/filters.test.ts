import { describe, expect, it } from 'vitest';
import { makeCompletion } from '../../api/test-utils';
import {
  defaultFilters,
  filterCompletions,
  groupByDay,
  isDefaultFilters,
  isInvalidRange,
  peopleOf,
  readFilters,
  writeFilters,
} from './filters';

const TODAY = '2026-10-07';

describe('log filters in the URL', () => {
  it('defaults to everyone and the last 90 days', () => {
    expect(readFilters(new URLSearchParams(), TODAY)).toEqual({
      person: '',
      from: '2026-07-10',
      to: TODAY,
    });
    expect(isDefaultFilters(defaultFilters(TODAY), TODAY)).toBe(true);
  });

  it('round-trips non-default values and drops defaults', () => {
    const filters = { person: 'JT', from: '', to: '2026-09-30' };
    const params = writeFilters(filters, TODAY);
    expect(params.toString()).toBe('person=JT&from=&to=2026-09-30');
    expect(readFilters(params, TODAY)).toEqual(filters);
    expect(writeFilters(defaultFilters(TODAY), TODAY).toString()).toBe('');
  });

  it('ignores malformed dates', () => {
    const f = readFilters(new URLSearchParams('from=2026-13-01&to=x'), TODAY);
    expect(f.from).toBe('');
    expect(f.to).toBe('');
  });

  it('flags a backwards range', () => {
    expect(isInvalidRange({ from: '2026-10-02', to: '2026-10-01' })).toBe(true);
    expect(isInvalidRange({ from: '2026-10-01', to: '2026-10-01' })).toBe(false);
    expect(isInvalidRange({ from: '', to: '2026-10-01' })).toBe(false);
  });
});

describe('filterCompletions', () => {
  const rows = [
    makeCompletion({ id: '1', taskId: 'chapia', doneOn: '2026-10-01', doneBy: 'Yard worker' }),
    makeCompletion({
      id: '2',
      taskId: 'sweep',
      doneOn: '2026-10-03',
      doneBy: 'JT',
      createdAt: '2026-10-03T12:00:00.000Z',
    }),
    makeCompletion({
      id: '3',
      taskId: null,
      title: 'Gate latch',
      doneOn: '2026-10-03',
      doneBy: ' jt ',
      createdAt: '2026-10-03T18:00:00.000Z',
    }),
  ];
  const base = { person: '', from: '', to: '' };

  it('sorts newest first, by date then logging time', () => {
    expect(filterCompletions(rows, base).map((c) => c.id)).toEqual(['3', '2', '1']);
  });

  it('matches people case- and space-insensitively', () => {
    expect(filterCompletions(rows, { ...base, person: 'JT' }).map((c) => c.id)).toEqual(['3', '2']);
  });

  it('applies the date range too', () => {
    expect(
      filterCompletions(rows, { ...base, from: '2026-10-02', to: '2026-10-03' }).map((c) => c.id),
    ).toEqual(['3', '2']);
  });

  it('lists distinct people and groups by day', () => {
    expect(peopleOf(rows)).toEqual(['JT', 'Yard worker']);
    const groups = groupByDay(filterCompletions(rows, base));
    expect(groups.map((g) => [g.date, g.items.length])).toEqual([
      ['2026-10-03', 2],
      ['2026-10-01', 1],
    ]);
  });
});
