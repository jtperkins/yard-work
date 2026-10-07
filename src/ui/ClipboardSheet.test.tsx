import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ClipboardSheet } from './ClipboardSheet';

const columns = {
  task: 'Job',
  assignee: 'Assigned',
  doneBy: 'Done by',
  date: 'Date',
  initials: 'Initials',
};

describe('ClipboardSheet', () => {
  it('prints a header, a row per job, blank rows and signature lines', () => {
    render(
      <ClipboardSheet
        brand="Yard Work"
        title="Week of 5 Oct"
        subtitle="Yard day: Thursday"
        columns={columns}
        rows={[
          { key: 'a', title: 'Mow', detail: 'Lawn', assignee: 'Luis' },
          { key: 'b', title: 'Rust check', done: { by: 'JT', date: '6 Oct' } },
        ]}
        blankRows={2}
        signatures={['Checked by', 'Date']}
        lists={[{ title: 'Bring', items: ['Gloves', 'Rake'] }]}
      >
        <p>Supplies</p>
      </ClipboardSheet>,
    );
    expect(screen.getByRole('heading', { name: 'Week of 5 Oct' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual([
      '✓',
      'Job',
      'Assigned',
      'Done by',
      'Date',
      'Initials',
    ]);
    const rows = screen.getAllByRole('row');
    // header + 2 jobs (blank rows are aria-hidden)
    expect(rows).toHaveLength(3);
    expect(within(rows[1]!).getByText('Luis')).toBeInTheDocument();
    expect(rows[2]).toHaveTextContent('JT');
    expect(rows[2]).toHaveTextContent('6 Oct');
    expect(screen.getByText('Supplies')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bring' })).toBeInTheDocument();
    expect(screen.getByText('Rake').closest('li')).toBeInTheDocument();
    expect(screen.getByText('Checked by')).toBeInTheDocument();
  });
});
