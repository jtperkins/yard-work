import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ChartFigure, ChartLegend } from './ChartFigure';

describe('ChartFigure', () => {
  it('captions the figure and toggles the table view', async () => {
    render(
      <ChartFigure
        title="Activity"
        description="Last 12 months"
        table={{ columns: ['Day', 'Count'], rows: [['Oct 5', 3]] }}
        showTableLabel="Show data"
        hideTableLabel="Hide data"
      >
        <div>plot</div>
      </ChartFigure>,
    );
    expect(screen.getByRole('figure', { name: 'Activity' })).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Show data' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await userEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Hide data' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('rowheader', { name: 'Oct 5' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '3' })).toBeInTheDocument();
  });

  it('ChartLegend lists series', () => {
    render(<ChartLegend items={[{ key: 'a', label: 'JT', color: 'var(--chart-1)' }]} />);
    expect(screen.getByRole('listitem')).toHaveTextContent('JT');
  });
});
