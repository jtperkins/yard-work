import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StackedBarChart, type StackedRow } from './StackedBarChart';

const series = [
  { key: 'jt', label: 'JT' },
  { key: 'yw', label: 'Yard worker' },
];
const rows: StackedRow[] = [
  { key: 'w1', label: 'Sep 28', values: { jt: 2, yw: 1 } },
  { key: 'w2', label: 'Oct 5', fullLabel: 'Week of Oct 5', values: { jt: 3 } },
];

describe('StackedBarChart', () => {
  it('renders a legend for ≥ 2 series and a labelled column per row', () => {
    render(<StackedBarChart title="By person" series={series} rows={rows} />);
    expect(screen.getByRole('group', { name: 'By person' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((l) => l.textContent)).toEqual([
      'JT',
      'Yard worker',
    ]);
    expect(
      screen.getByRole('img', { name: 'Sep 28: JT 2, Yard worker 1; Total 3' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Week of Oct 5: JT 3, Yard worker 0; Total 3' }),
    ).toBeInTheDocument();
  });

  it('colours series by slot in order (colour follows the entity)', () => {
    const { container } = render(
      <StackedBarChart
        title="x"
        series={[
          { key: 'jt', label: 'JT', slot: 4 },
          { key: 'yw', label: 'YW' },
        ]}
        rows={rows}
      />,
    );
    const fills = Array.from(container.querySelectorAll('path')).map((p) => p.style.fill);
    expect(fills).toContain('var(--chart-4)');
    expect(fills).toContain('var(--chart-2)');
  });

  it('shows a tooltip on focus and offers a table view', () => {
    render(<StackedBarChart title="By person" series={series} rows={rows} />);
    fireEvent.focus(screen.getByRole('img', { name: /^Sep 28/ }));
    expect(screen.getAllByText('Sep 28').length).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole('button', { name: 'Show table' }));
    expect(screen.getByRole('columnheader', { name: 'Yard worker' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Week of Oct 5' })).toBeInTheDocument();
  });

  it('omits the legend for a single series', () => {
    render(<StackedBarChart title="x" series={[series[0]!]} rows={rows} />);
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});
