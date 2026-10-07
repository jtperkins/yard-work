import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EntryHeader } from './EntryHeader';

describe('EntryHeader', () => {
  it('shows the author, badges, meta and actions in a header', async () => {
    const onDelete = vi.fn();
    render(
      <article aria-label="note">
        <EntryHeader
          author="José"
          badges={<span>Pinned</span>}
          meta={<time dateTime="2026-10-07T12:00:00Z">Oct 7</time>}
          actions={
            <button type="button" onClick={onDelete}>
              Delete
            </button>
          }
        />
      </article>,
    );
    const header = screen.getByRole('article', { name: 'note' }).querySelector('header');
    expect(header).not.toBeNull();
    expect(header).toHaveTextContent('JoséPinned');
    expect(screen.getByText('Oct 7').tagName).toBe('TIME');
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('omits the meta line and actions when not given', () => {
    const { container } = render(<EntryHeader author="Ana" />);
    expect(container.querySelectorAll('p')).toHaveLength(1);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
