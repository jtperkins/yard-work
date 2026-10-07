import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast, type ToastOptions } from './Toast';

function Trigger({ options }: { options: ToastOptions }) {
  const { toast } = useToast();
  return <button onClick={() => toast(options)}>Go</button>;
}

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows a status toast that auto-dismisses', () => {
    render(
      <ToastProvider>
        <Trigger options={{ title: 'Signed off', tone: 'success', duration: 1000 }} />
      </ToastProvider>,
    );
    // The live region is mounted (empty) before any toast, so the new text gets announced.
    const live = screen.getByRole('status');
    expect(live).toBeEmptyDOMElement();
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(live).toHaveTextContent('Signed off');
    expect(screen.getAllByText('Signed off')).toHaveLength(2); // announcer + visible toast
    act(() => vi.advanceTimersByTime(1001));
    expect(live).toBeEmptyDOMElement();
    expect(screen.queryByText('Signed off')).not.toBeInTheDocument();
  });

  it('runs the action (Undo) and dismisses', () => {
    const onAction = vi.fn();
    render(
      <ToastProvider>
        <Trigger options={{ title: 'Signed off', action: { label: 'Undo', onAction } }} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onAction).toHaveBeenCalledOnce();
    expect(screen.queryByText('Signed off')).not.toBeInTheDocument();
  });

  it('pauses while hovered and can be dismissed', () => {
    render(
      <ToastProvider dismissLabel="Cerrar">
        <Trigger options={{ title: 'Saved', duration: 1000 }} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    const toast = screen.getByRole('button', { name: 'Cerrar' }).closest('[data-toast]')!;
    fireEvent.mouseEnter(toast);
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('danger toasts are alerts; max limits the stack', () => {
    render(
      <ToastProvider max={1}>
        <Trigger options={{ title: 'Failed', tone: 'danger' }} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Failed');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.getAllByRole('button', { name: 'Dismiss' })).toHaveLength(1);
  });

  it('announces how to reach the action, and the hotkey moves focus there and back', () => {
    render(
      <ToastProvider actionHint="Pulse F8.">
        <Trigger
          options={{
            title: 'Signed off',
            description: 'Done by JT',
            action: { label: 'Undo', onAction: () => {} },
          }}
        />
      </ToastProvider>,
    );
    const go = screen.getByRole('button', { name: 'Go' });
    go.focus();
    fireEvent.click(go);
    expect(screen.getByRole('status')).toHaveTextContent('Signed off. Done by JT. Pulse F8.');

    fireEvent.keyDown(document, { key: 'F8' });
    const undo = screen.getByRole('button', { name: 'Undo' });
    expect(undo).toHaveFocus();
    // Focus pauses the timer, so the toast outlives its 10 s default.
    act(() => vi.advanceTimersByTime(20_000));
    expect(undo).toBeInTheDocument();

    fireEvent.keyDown(undo, { key: 'Escape' });
    expect(go).toHaveFocus();
  });

  it('returns focus after using the action reached by the hotkey', () => {
    const onAction = vi.fn();
    render(
      <ToastProvider>
        <Trigger options={{ title: 'Signed off', action: { label: 'Undo', onAction } }} />
      </ToastProvider>,
    );
    const go = screen.getByRole('button', { name: 'Go' });
    go.focus();
    fireEvent.click(go);
    fireEvent.keyDown(document, { key: 'F8' });
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onAction).toHaveBeenCalledOnce();
    expect(go).toHaveFocus();
  });

  it('re-announces a repeated message', () => {
    render(
      <ToastProvider>
        <Trigger options={{ title: 'Saved' }} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    const first = screen.getByRole('status').firstElementChild;
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(screen.getByRole('status').firstElementChild).not.toBe(first);
  });

  it('useToast throws outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Trigger options={{ title: 'x' }} />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});
