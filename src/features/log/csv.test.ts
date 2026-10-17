import { describe, expect, it } from 'vitest';
import { makeCompletion } from '../../api/test-utils';
import { makeTask } from '../../domain/test-fixtures';
import { buildLogCsv, escapeCsvField, logCsvFilename, toCsv, type LogCsvHeaders } from './csv';

const headers: LogCsvHeaders = {
  date: 'Date',
  task: 'Task',
  partial: 'Partial',
  doneBy: 'Done by',
  signedBy: 'Signed by',
  note: 'Note',
  taskId: 'Task ID',
  loggedAt: 'Logged at (UTC)',
};

describe('escapeCsvField', () => {
  it.each([
    ['plain', 'plain'],
    ['José Ñandú', 'José Ñandú'],
    ['a,b', '"a,b"'],
    ['say "hi"', '"say ""hi"""'],
    ['line 1\nline 2', '"line 1\nline 2"'],
    ['cr\r\nlf', '"cr\r\nlf"'],
    [' padded ', '" padded "'],
    ['', ''],
  ])('%j → %j', (input, expected) => {
    expect(escapeCsvField(input)).toBe(expected);
  });

  it('turns null and undefined into empty fields and keeps numbers', () => {
    expect(escapeCsvField(null)).toBe('');
    expect(escapeCsvField(undefined)).toBe('');
    expect(escapeCsvField(42)).toBe('42');
    expect(escapeCsvField(-3)).toBe('-3');
  });

  it.each([
    ['=HYPERLINK("http://x")', '"\'=HYPERLINK(""http://x"")"'],
    ['+1 555', "'+1 555"],
    ['-rm', "'-rm"],
    ['@SUM(A1)', "'@SUM(A1)"],
    ['\tTab', "'\tTab"],
  ])('neutralises formula-looking text %j', (input, expected) => {
    expect(escapeCsvField(input)).toBe(expected);
  });
});

describe('toCsv', () => {
  it('joins fields with commas and rows with CRLF, no trailing newline', () => {
    expect(
      toCsv([
        ['a', 'b'],
        ['c,d', null],
      ]),
    ).toBe('a,b\r\n"c,d",');
  });
});

describe('buildLogCsv', () => {
  const chapia = makeTask({ id: 'chapia', title: 'Chapia', titleEs: 'Chapia (zacate)' });
  const archived = makeTask({
    id: 'old-job',
    title: 'Paint the old shed',
    archivedAt: '2026-10-01T00:00:00Z',
  });
  const taskById = new Map([chapia, archived].map((t) => [t.id, t]));

  it('writes a header and one row per sign-off in the given language', () => {
    const rows = [
      makeCompletion({
        taskId: 'chapia',
        doneOn: '2026-10-05',
        doneBy: 'Jardinero',
        loggedBy: 'JT',
        note: 'Front, "back" and sides, done',
        createdAt: '2026-10-05T20:00:00.000Z',
      }),
      makeCompletion({
        taskId: null,
        title: 'Fix the gate latch',
        doneOn: '2026-10-04',
        doneBy: 'JT',
        loggedBy: 'JT',
        note: null,
        createdAt: '2026-10-04T15:00:00.000Z',
      }),
    ];
    const csv = buildLogCsv(rows, { taskById, lang: 'es', headers, partialLabel: 'Partial' });
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('Date,Task,Partial,Done by,Signed by,Note,Task ID,Logged at (UTC)');
    expect(lines[1]).toBe(
      [
        '2026-10-05',
        escapeCsvField('Chapia (zacate)'),
        '',
        'Jardinero',
        'JT',
        '"Front, ""back"" and sides, done"',
        'chapia',
        '2026-10-05T20:00:00.000Z',
      ].join(','),
    );
    expect(lines[2]).toBe('2026-10-04,Fix the gate latch,,JT,JT,,,2026-10-04T15:00:00.000Z');
  });

  it('keeps the title of an archived task and flags partial rows', () => {
    const csv = buildLogCsv([makeCompletion({ taskId: 'old-job', partial: true, note: 'half' })], {
      taskById,
      lang: 'en',
      headers,
      partialLabel: 'Partial',
    });
    const row = csv.split('\r\n')[1]!;
    expect(row).toContain(',Paint the old shed,Partial,');
    expect(row).toContain(',old-job,');
  });

  it('keeps a task id that no longer exists at all', () => {
    const csv = buildLogCsv([makeCompletion({ taskId: 'retired-task', note: null })], {
      taskById,
      lang: 'en',
      headers,
      partialLabel: 'Partial',
    });
    expect(csv.split('\r\n')[1]).toContain(',retired-task,,');
  });

  it('names the file after the export date', () => {
    expect(logCsvFilename('2026-10-07')).toBe('yard-work-log-2026-10-07.csv');
  });
});
