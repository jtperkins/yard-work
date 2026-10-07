import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { supplyTicksKey, useSupplyTicks } from './supplyTicks';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('useSupplyTicks', () => {
  it('persists ticks per week and reloads them when the week changes', () => {
    localStorage.setItem(supplyTicksKey('2026-10-12'), JSON.stringify(['gloves']));
    const { result, rerender } = renderHook(({ week }) => useSupplyTicks(week), {
      initialProps: { week: '2026-10-05' },
    });
    expect(result.current.ticks.size).toBe(0);
    act(() => result.current.toggle('wire-brush', true));
    expect(result.current.ticks.has('wire-brush')).toBe(true);
    expect(JSON.parse(localStorage.getItem(supplyTicksKey('2026-10-05'))!)).toEqual(['wire-brush']);

    rerender({ week: '2026-10-12' });
    expect([...result.current.ticks]).toEqual(['gloves']);

    rerender({ week: '2026-10-05' });
    act(() => result.current.toggle('wire-brush', false));
    expect(localStorage.getItem(supplyTicksKey('2026-10-05'))).toBeNull();
  });

  it('keeps working when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useSupplyTicks('2026-10-05'));
    act(() => result.current.toggle('gloves', true));
    expect(result.current.ticks.has('gloves')).toBe(true);
  });

  it('ignores corrupt stored values', () => {
    localStorage.setItem(supplyTicksKey('2026-10-05'), '{not json');
    const { result } = renderHook(() => useSupplyTicks('2026-10-05'));
    expect(result.current.ticks.size).toBe(0);
  });
});
