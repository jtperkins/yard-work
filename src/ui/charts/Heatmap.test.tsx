import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Heatmap, heatLevel } from './Heatmap';

const values = { '2026-10-05': 1, '2026-10-06': 4, '2026-10-07': 2 };

function renderMap() {
  return render(
    <Heatmap
      title="Activity"
      start="2026-09-01"
      end="2026-10-07"
      values={values}
      formatCell={(d, n) => `${n} on ${d}`}
    />,
  );
}

describe('heatLevel', () => {
  it('maps counts to 0–5', () => {
    expect(heatLevel(0, 4)).toBe(0);
    expect(heatLevel(1, 4)).toBe(2);
    expect(heatLevel(4, 4)).toBe(5);
    expect(heatLevel(3, 0)).toBe(0);
  });
});

describe('Heatmap', () => {
  it('renders a labelled grid with one cell per day in range', () => {
    renderMap();
    const grid = screen.getByRole('grid', { name: 'Activity' });
    expect(grid.querySelectorAll('[role="gridcell"]')).toHaveLength(37);
    expect(screen.getByRole('gridcell', { name: '4 on 2026-10-06' })).toHaveAttribute(
      'data-level',
      '5',
    );
  });

  it('has a single tab stop (the end date) and moves with arrow keys', () => {
    renderMap();
    const end = screen.getByRole('gridcell', { name: '2 on 2026-10-07' });
    expect(end).toHaveAttribute('tabindex', '0');
    end.focus();
    fireEvent.keyDown(end, { key: 'ArrowUp' });
    expect(screen.getByRole('gridcell', { name: '4 on 2026-10-06' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
    expect(screen.getByRole('gridcell', { name: '0 on 2026-09-29' })).toHaveFocus();
    // Clamped to the end of the range.
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(screen.getByRole('gridcell', { name: '2 on 2026-10-07' })).toHaveFocus();
  });

  it('shows a readout on hover', () => {
    renderMap();
    fireEvent.pointerEnter(screen.getByRole('gridcell', { name: '1 on 2026-10-05' }));
    expect(screen.getAllByText('1 on 2026-10-05').length).toBeGreaterThan(0);
  });

  it('offers a table of active days, newest first', () => {
    renderMap();
    fireEvent.click(screen.getByRole('button', { name: 'Show table' }));
    const rows = screen.getAllByRole('rowheader').map((r) => r.textContent);
    expect(rows).toEqual(['2026-10-07', '2026-10-06', '2026-10-05']);
  });
});
