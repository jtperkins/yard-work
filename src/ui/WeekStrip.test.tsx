import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WeekStrip, type WeekStripDay } from './WeekStrip';

const days: WeekStripDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w, i) => ({
  key: `d${i}`,
  weekday: w,
  day: String(5 + i),
  label: `${w} ${5 + i}`,
  isToday: i === 2,
  highlighted: i === 3,
}));

describe('WeekStrip', () => {
  it('lists seven days with accessible labels, marking today and the highlighted day', () => {
    render(<WeekStrip days={days} label="This week" highlightLabel="Yard day" />);
    const list = screen.getByRole('list', { name: 'This week' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(7);
    expect(items[2]).toHaveAttribute('aria-current', 'date');
    expect(items[3]).toHaveAttribute('data-highlighted', 'true');
    expect(items[3]).toHaveAccessibleName('Thu 8');
    expect(items[3]).toHaveTextContent('Yard day');
  });
});
