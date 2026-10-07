import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog, Dialog, Sheet } from './Dialog';

function Harness({ variant = 'dialog' as 'dialog' | 'sheet', onClose = () => {} }) {
  const [open, setOpen] = useState(false);
  const Comp = variant === 'sheet' ? Sheet : Dialog;
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Comp
        open={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        title="Sign off"
        description="Record the work"
        footer={<button>Save</button>}
      >
        <input aria-label="Done by" />
      </Comp>
    </>
  );
}

describe.each(['dialog', 'sheet'] as const)('%s', (variant) => {
  it('is a labelled modal dialog that focuses its first field', async () => {
    render(<Harness variant={variant} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = screen.getByRole('dialog', { name: 'Sign off' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Record the work');
    expect(screen.getByLabelText('Done by')).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('closes on Escape and restores focus to the opener', async () => {
    const onClose = vi.fn();
    render(<Harness variant={variant} onClose={onClose} />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await userEvent.click(opener);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('traps focus with Tab / Shift+Tab', async () => {
    render(<Harness variant={variant} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    // Order inside: Close, input, Save.
    screen.getByRole('button', { name: 'Save' }).focus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
  });

  it('closes from the close button and the backdrop', async () => {
    const onClose = vi.fn();
    render(<Harness variant={variant} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await userEvent.click(screen.getByTestId('dialog-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('ConfirmDialog', () => {
  it('focuses Cancel and calls onConfirm / onClose', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        open
        onClose={onClose}
        onConfirm={onConfirm}
        title="Delete sign-off?"
        confirmLabel="Delete"
      />,
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('passes a translated close label to the × button', () => {
    render(
      <ConfirmDialog
        open
        onClose={() => {}}
        onConfirm={() => {}}
        title="¿Borrar?"
        confirmLabel="Borrar"
        cancelLabel="Cancelar"
        closeLabel="Cerrar"
      />,
    );
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });
});
