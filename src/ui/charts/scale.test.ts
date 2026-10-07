import { describe, expect, it } from 'vitest';
import { niceTicks, slotColor, topRoundedBar } from './scale';

describe('niceTicks', () => {
  it('starts at zero and covers the max with nice steps', () => {
    expect(niceTicks(7)).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(100)).toEqual([0, 25, 50, 75, 100]);
    expect(niceTicks(3)).toEqual([0, 1, 2, 3]);
    expect(niceTicks(0)).toEqual([0, 1]);
    expect(niceTicks(10)).toEqual([0, 5, 10]);
    expect(niceTicks(0.4)).toEqual([0, 1]);
  });
});

describe('topRoundedBar', () => {
  it('builds a closed path with a square base', () => {
    const d = topRoundedBar(0, 10, 20, 50, 4);
    expect(d.startsWith('M0,60')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
  });
});

describe('slotColor', () => {
  it('clamps to the 8 categorical slots', () => {
    expect(slotColor(1)).toBe('var(--chart-1)');
    expect(slotColor(12)).toBe('var(--chart-8)');
  });
});
