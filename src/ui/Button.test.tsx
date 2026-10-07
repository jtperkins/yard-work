import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button, LinkButton, buttonClasses } from './Button';

describe('Button', () => {
  it('is a type="button" button that calls onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toHaveAttribute('type', 'button');
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders icons as decorative', () => {
    const { container } = render(<Button leadingIcon={Plus}>Add</Button>);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button')).toHaveAccessibleName('Add');
  });

  it('loading disables the button and sets aria-busy', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Saving
      </Button>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies variant and size recipes', () => {
    expect(buttonClasses({ variant: 'danger', size: 'sm' })).toContain('bg-danger');
    expect(buttonClasses({ fullWidth: true })).toContain('w-full');
  });
});

describe('LinkButton', () => {
  it('renders an anchor by default', () => {
    render(<LinkButton href="/week">Plan</LinkButton>);
    expect(screen.getByRole('link', { name: 'Plan' })).toHaveAttribute('href', '/week');
  });

  it('is polymorphic via `as`, forwarding the component props', () => {
    function FakeLink({
      to,
      children,
      className,
    }: {
      to: string;
      children?: ReactNode;
      className?: string;
    }) {
      return (
        <a href={`#${to}`} className={className} data-router="yes">
          {children}
        </a>
      );
    }
    render(
      <LinkButton as={FakeLink} to="/tasks" variant="secondary">
        Tasks
      </LinkButton>,
    );
    const link = screen.getByRole('link', { name: 'Tasks' });
    expect(link).toHaveAttribute('href', '#/tasks');
    expect(link).toHaveAttribute('data-router', 'yes');
    expect(link.className).toContain('border-line-strong');
  });
});
