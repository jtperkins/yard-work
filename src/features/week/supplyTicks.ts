import { useCallback, useState } from 'react';
import type { ISODate } from '../../shared/dates';

/** localStorage key for a week's "have it" ticks. */
export const supplyTicksKey = (weekStart: ISODate) => `yw.supplies.${weekStart}`;

function read(weekStart: ISODate): ReadonlySet<string> {
  try {
    const raw = globalThis.localStorage?.getItem(supplyTicksKey(weekStart));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []);
  } catch {
    return new Set();
  }
}

function write(weekStart: ISODate, ticks: ReadonlySet<string>): void {
  try {
    const key = supplyTicksKey(weekStart);
    if (ticks.size === 0) globalThis.localStorage?.removeItem(key);
    else globalThis.localStorage?.setItem(key, JSON.stringify([...ticks]));
  } catch {
    // Storage blocked (private mode, quota): ticks still work for this visit.
  }
}

/**
 * Per-week, per-device "have it" ticks for the supplies list. Local only (never synced);
 * every storage access is guarded so a blocked localStorage just means ticks don't persist.
 */
export function useSupplyTicks(weekStart: ISODate) {
  const [state, setState] = useState(() => ({ week: weekStart, ticks: read(weekStart) }));
  // Switching weeks: load that week's ticks (state derived during render, no effect needed).
  const current = state.week === weekStart ? state : { week: weekStart, ticks: read(weekStart) };
  if (current !== state) setState(current);

  const toggle = useCallback(
    (supplyId: string, have: boolean) => {
      setState((prev) => {
        const base = prev.week === weekStart ? prev.ticks : read(weekStart);
        const next = new Set(base);
        if (have) next.add(supplyId);
        else next.delete(supplyId);
        write(weekStart, next);
        return { week: weekStart, ticks: next };
      });
    },
    [weekStart],
  );

  return { ticks: current.ticks, toggle };
}
