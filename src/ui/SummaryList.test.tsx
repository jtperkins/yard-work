import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SummaryList } from './SummaryList';

const items = ['a', 'b', 'c'].map((k) => ({ key: k, content: `Item ${k}`, aside: `${k}-aside` }));

describe('SummaryList', () => {
  it('renders a named list with content and asides', () => {
    render(<SummaryList label="Overdue" items={items} />);
    const list = screen.getByRole('list', { name: 'Overdue' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Item aa-aside');
  });

  it('caps the rows at max', () => {
    render(<SummaryList label="Overdue" items={items} max={2} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
