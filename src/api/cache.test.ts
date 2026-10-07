import { describe, expect, it } from 'vitest';
import {
  applyPlanPatch,
  completionMatchesRange,
  insertCompletion,
  insertNote,
  markPlanItemDone,
  newestForTask,
  removeFromLatest,
  revertPlanItemsForCompletion,
  upsertLatest,
} from './cache';
import { makeCompletion, makeNote, makePlanItem } from './test-utils';

const NOW = '2026-10-07T18:00:00.000Z';

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
    const c = makeCompletion({ doneOn: '2026-10-02', taskId: 'mow-lawn' });
    expect(completionMatchesRange(c, {})).toBe(true);
    expect(completionMatchesRange(c, { from: '2026-10-03' })).toBe(false);
    expect(completionMatchesRange(c, { to: '2026-10-01' })).toBe(false);
    expect(completionMatchesRange(c, { task: 'trash-out' })).toBe(false);
    expect(
      completionMatchesRange(c, { from: '2026-10-02', to: '2026-10-02', task: 'mow-lawn' }),
    ).toBe(true);
  });

  it('upsertLatest replaces an older entry, keeps a newer one and ignores ad-hoc work', () => {
    const old = makeCompletion({ doneOn: '2026-09-20' });
    const other = makeCompletion({ taskId: 'trash-out', doneOn: '2026-10-01' });
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
    expect(removeFromLatest([fresh], fresh.id, makeCompletion({ taskId: 'trash-out' }))).toEqual(
      [],
    );
    expect(removeFromLatest([fresh], 'missing', prev)).toEqual([fresh]);
  });

  it('newestForTask searches every list, skipping the excluded id', () => {
    const a = makeCompletion({ doneOn: '2026-09-01' });
    const b = makeCompletion({ doneOn: '2026-09-15' });
    const gone = makeCompletion({ doneOn: '2026-10-01' });
    expect(newestForTask([[a], [b, gone]], 'mow-lawn', gone.id)).toBe(b);
    expect(newestForTask([[a]], 'trash-out', gone.id)).toBeUndefined();
  });
});

describe('plan cache transforms', () => {
  it('marks done and reverts by completion id', () => {
    const item = makePlanItem();
    const done = markPlanItemDone(
      [item],
      item.id,
      { id: 'c1', doneOn: '2026-10-06', doneBy: 'Yard worker' },
      NOW,
    );
    expect(done[0]).toMatchObject({
      status: 'done',
      completion: { id: 'c1', doneOn: '2026-10-06', doneBy: 'Yard worker' },
      updatedAt: NOW,
    });
    expect(revertPlanItemsForCompletion(done, 'c1', NOW)[0]).toMatchObject({
      status: 'planned',
      completion: null,
    });
  });

  it('applies parsed patches: undefined keeps, null clears', () => {
    const item = makePlanItem({ assignee: 'JT', note: 'front only' });
    expect(
      applyPlanPatch(item, { assignee: undefined, note: null, status: 'skipped' }, NOW),
    ).toMatchObject({
      assignee: 'JT',
      note: null,
      status: 'skipped',
    });
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
