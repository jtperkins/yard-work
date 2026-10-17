import { describe, expect, it } from 'vitest';
import {
  completionMatchesRange,
  insertCompletion,
  insertNote,
  newestForTask,
  removeFromLatest,
  upsertLatest,
} from './cache';
import { makeCompletion, makeNote } from './test-utils';

describe('completion cache transforms', () => {
  it('inserts in server order (doneOn desc, createdAt desc) and replaces by id', () => {
    const a = makeCompletion({ doneOn: '2026-10-03' });
    const b = makeCompletion({ doneOn: '2026-10-01' });
    const c = makeCompletion({ doneOn: '2026-10-02' });
    expect(insertCompletion([a, b], c).map((x) => x.id)).toEqual([a.id, c.id, b.id]);
    const edited = { ...a, note: 'x' };
    expect(insertCompletion([a, b], edited)).toEqual([edited, b]);
  });

  it('matches ranges on from, to and task', () => {
    const c = makeCompletion({ doneOn: '2026-10-02', taskId: 'chapia' });
    expect(completionMatchesRange(c, {})).toBe(true);
    expect(completionMatchesRange(c, { from: '2026-10-03' })).toBe(false);
    expect(completionMatchesRange(c, { to: '2026-10-01' })).toBe(false);
    expect(completionMatchesRange(c, { task: 'other-task' })).toBe(false);
    expect(
      completionMatchesRange(c, { from: '2026-10-02', to: '2026-10-02', task: 'chapia' }),
    ).toBe(true);
  });

  it('upsertLatest replaces an older entry, keeps a newer one and ignores ad-hoc work', () => {
    const old = makeCompletion({ doneOn: '2026-09-20' });
    const other = makeCompletion({ taskId: 'other-task', doneOn: '2026-10-01' });
    const fresh = makeCompletion({ doneOn: '2026-10-06' });

    const up = upsertLatest([other, old], fresh);
    expect(up.changed).toBe(true);
    expect(up.replaced).toBe(old);
    expect(up.list.map((x) => x.id)).toEqual([fresh.id, other.id]);

    const backdated = makeCompletion({ doneOn: '2026-09-01' });
    expect(upsertLatest([fresh], backdated).changed).toBe(false);
    expect(upsertLatest([fresh], makeCompletion({ taskId: null, title: 'x' })).changed).toBe(false);
  });

  it('removeFromLatest restores a fallback for the same task only', () => {
    const fresh = makeCompletion({ doneOn: '2026-10-06' });
    const prev = makeCompletion({ doneOn: '2026-09-20' });
    expect(removeFromLatest([fresh], fresh.id, prev)).toEqual([prev]);
    expect(removeFromLatest([fresh], fresh.id, undefined)).toEqual([]);
    expect(removeFromLatest([fresh], fresh.id, makeCompletion({ taskId: 'other-task' }))).toEqual(
      [],
    );
    expect(removeFromLatest([fresh], 'missing', prev)).toEqual([fresh]);
  });

  it('newestForTask searches every list, skipping the excluded id', () => {
    const a = makeCompletion({ doneOn: '2026-09-01' });
    const b = makeCompletion({ doneOn: '2026-09-15' });
    const gone = makeCompletion({ doneOn: '2026-10-01' });
    expect(newestForTask([[a], [b, gone]], 'chapia', gone.id, false)).toBe(b);
    expect(newestForTask([[a]], 'other-task', gone.id, false)).toBeUndefined();
  });
});

describe('partial sign-offs in the latest list', () => {
  it('upsertLatest keeps the full entry and adds the partial one beside it', () => {
    const full = makeCompletion({ taskId: 't', doneOn: '2026-09-20' });
    const partial = makeCompletion({ taskId: 't', doneOn: '2026-10-01', partial: true });
    const up = upsertLatest([full], partial);
    expect(up.changed).toBe(true);
    expect(up.replaced).toBeUndefined();
    expect(up.list.map((c) => c.id)).toEqual([partial.id, full.id]);

    const newerPartial = makeCompletion({ taskId: 't', doneOn: '2026-10-05', partial: true });
    const again = upsertLatest(up.list, newerPartial);
    expect(again.replaced).toBe(partial);
    expect(again.list.map((c) => c.id)).toEqual([newerPartial.id, full.id]);
  });

  it('a full sign-off does not displace the partial entry either', () => {
    const partial = makeCompletion({ taskId: 't', doneOn: '2026-10-01', partial: true });
    const full = makeCompletion({ taskId: 't', doneOn: '2026-10-02' });
    const up = upsertLatest([partial], full);
    expect(up.list.map((c) => c.id)).toEqual([full.id, partial.id]);
    expect(up.replaced).toBeUndefined();
  });

  it('removeFromLatest of a partial leaves the full entry and ignores a full fallback', () => {
    const full = makeCompletion({ taskId: 't', doneOn: '2026-09-20' });
    const partial = makeCompletion({ taskId: 't', doneOn: '2026-10-01', partial: true });
    expect(removeFromLatest([partial, full], partial.id, undefined)).toEqual([full]);
    expect(removeFromLatest([partial, full], partial.id, full)).toEqual([full]);
    const olderPartial = makeCompletion({ taskId: 't', doneOn: '2026-09-25', partial: true });
    expect(removeFromLatest([partial, full], partial.id, olderPartial).map((c) => c.id)).toEqual([
      olderPartial.id,
      full.id,
    ]);
  });

  it('newestForTask only considers rows of the asked kind', () => {
    const full = makeCompletion({ taskId: 't', doneOn: '2026-10-09' });
    const partial = makeCompletion({ taskId: 't', doneOn: '2026-10-01', partial: true });
    expect(newestForTask([[full, partial]], 't', 'x', true)).toBe(partial);
    expect(newestForTask([[full, partial]], 't', 'x', false)).toBe(full);
    expect(newestForTask([[full]], 't', 'x', true)).toBeUndefined();
  });
});

describe('note cache transforms', () => {
  it('keeps pinned notes first, then newest', () => {
    const pinned = makeNote({ pinned: true, createdAt: '2026-01-01T00:00:00.000Z' });
    const older = makeNote({ createdAt: '2026-09-01T00:00:00.000Z' });
    const newer = makeNote({ createdAt: '2026-10-01T00:00:00.000Z' });
    expect(insertNote([pinned, older], newer).map((n) => n.id)).toEqual([
      pinned.id,
      newer.id,
      older.id,
    ]);
  });
});
