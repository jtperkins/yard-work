import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checklist, ChecklistRow } from './ChecklistRow';

describe('ChecklistRow', () => {
  it('renders title, meta, status and a Sign off action', async () => {
    const onSignOff = vi.fn();
    render(
      <Checklist label="Due">
        <ChecklistRow
          title="Mow lawn"
          meta="Every 7 days"
          status={<span>Overdue</span>}
          color="cat-lawn"
          onSignOff={onSignOff}
        />
      </Checklist>,
    );
    expect(screen.getByRole('list', { name: 'Due' })).toBeInTheDocument();
    expect(screen.getByText('Every 7 days')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sign off' }));
    expect(onSignOff).toHaveBeenCalledOnce();
  });

  it('names the default button after the job when given signOffAriaLabel', () => {
    render(
      <Checklist>
        <ChecklistRow title="Mow" onSignOff={() => {}} signOffAriaLabel="Sign off: Mow" />
        <ChecklistRow title="Rake" onSignOff={() => {}} signOffAriaLabel="Sign off: Rake" />
      </Checklist>,
    );
    const mow = screen.getByRole('button', { name: 'Sign off: Mow' });
    expect(mow).toHaveTextContent('Sign off');
    expect(screen.getByRole('button', { name: 'Sign off: Rake' })).toBeInTheDocument();
  });

  it('a custom action replaces the default button', () => {
    render(
      <Checklist>
        <ChecklistRow
          title="Mow"
          onSignOff={() => {}}
          action={<a href="/login">Sign in to sign off</a>}
        />
      </Checklist>,
    );
    expect(screen.queryByRole('button', { name: 'Sign off' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in to sign off' })).toBeInTheDocument();
  });

  it('stamps when done, animating only on the transition', () => {
    const { rerender, container } = render(
      <Checklist>
        <ChecklistRow title="Mow" onSignOff={() => {}} stampLabel="Hecho" />
      </Checklist>,
    );
    expect(screen.queryByText('Hecho')).not.toBeInTheDocument();
    rerender(
      <Checklist>
        <ChecklistRow title="Mow" onSignOff={() => {}} stampLabel="Hecho" done />
      </Checklist>,
    );
    const stamp = screen.getByText('Hecho');
    expect(stamp.className).toContain('animate-stamp-in');
    expect(screen.queryByRole('button', { name: 'Sign off' })).not.toBeInTheDocument();
    expect(container.querySelector('li')).toHaveAttribute('data-done', 'true');
  });

  it('does not animate rows that mount already done', () => {
    render(
      <Checklist>
        <ChecklistRow title="Mow" done />
      </Checklist>,
    );
    expect(screen.getByText('Done').className).not.toContain('animate-stamp-in');
  });
});
