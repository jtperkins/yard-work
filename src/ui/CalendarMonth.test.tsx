import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CalendarMonth } from './CalendarMonth';

function renderCal(onSelect = vi.fn()) {
  render(
    <CalendarMonth
      month="2026-10"
      label="October 2026"
      today="2026-10-07"
      selected={null}
      onSelect={onSelect}
      renderDay={(d) => (d.date === '2026-10-05' ? <span>dot</span> : null)}
    />,
  );
  return onSelect;
}

describe('CalendarMonth', () => {
  it('renders a labelled 6×7 grid with weekday headers', () => {
    renderCal();
    expect(screen.getByRole('grid', { name: 'October 2026' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(7);
    expect(screen.getAllByRole('gridcell')).toHaveLength(42);
    expect(screen.getByText('dot')).toBeInTheDocument();
  });

  it('marks today and makes it the tab stop', () => {
    renderCal();
    const today = screen.getByRole('button', { name: '2026-10-07' });
    expect(today).toHaveAttribute('aria-current', 'date');
    expect(today).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('button', { name: '2026-10-08' })).toHaveAttribute('tabindex', '-1');
  });

  it('navigates with arrows / Home / End and selects with Enter', async () => {
    const onSelect = renderCal();
    const today = screen.getByRole('button', { name: '2026-10-07' });
    today.focus();
    fireEvent.keyDown(today, { key: 'ArrowRight' });
    expect(screen.getByRole('button', { name: '2026-10-08' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(screen.getByRole('button', { name: '2026-10-15' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(screen.getByRole('button', { name: '2026-10-12' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(screen.getByRole('button', { name: '2026-10-18' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('2026-10-18');
  });

  it('reflects the selected day', () => {
    render(
      <CalendarMonth
        month="2026-10"
        label="Oct"
        selected="2026-10-03"
        dayLabel={(d) => `Day ${d}`}
      />,
    );
    const cell = screen.getByRole('button', { name: 'Day 2026-10-03' }).closest('td')!;
    expect(cell).toHaveAttribute('aria-selected', 'true');
  });
});
