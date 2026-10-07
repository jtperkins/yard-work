import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LogRow, Timeline, TimelineGroup } from './Timeline';

describe('Timeline', () => {
  it('renders grouped log rows as nested lists', () => {
    render(
      <Timeline label="Sign-offs">
        <TimelineGroup label="Oct 7" aside="2 entries">
          <LogRow
            title="Mow lawn"
            meta="Yard worker · logged by JT"
            note="Front only"
            color="cat-lawn"
          />
          <LogRow title="Scoop litter" actions={<button>Delete</button>} muted />
        </TimelineGroup>
      </Timeline>,
    );
    expect(screen.getByRole('list', { name: 'Sign-offs' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Oct 7' })).toBeInTheDocument();
    expect(screen.getByText('2 entries')).toBeInTheDocument();
    expect(screen.getByText('Front only')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('packs LogRows on one rule with layout="rows"', () => {
    render(
      <Timeline label="History" layout="rows">
        <LogRow title="Oct 7" meta="Done by JT" />
        <LogRow title="Sep 30" meta="Done by JT" />
      </Timeline>,
    );
    const list = screen.getByRole('list', { name: 'History' });
    expect(list).toHaveAttribute('data-layout', 'rows');
    expect(list).not.toHaveClass('gap-6');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
