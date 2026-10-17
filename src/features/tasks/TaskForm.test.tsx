import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeOneOff, makeTask } from '../../domain/test-fixtures';
import { renderScreen } from '../shared/test-utils';
import { TaskForm } from './TaskForm';

function setup(props: Partial<Parameters<typeof TaskForm>[0]> = {}) {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  const r = renderScreen(
    <TaskForm submitLabel="Create task" onSubmit={onSubmit} onCancel={onCancel} {...props} />,
  );
  return { ...r, onSubmit, onCancel };
}

describe('TaskForm', () => {
  it('starts as a one-off with a due date and no interval fields', () => {
    setup();
    expect(screen.getByLabelText(/Due date/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Repeat every/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Unit')).not.toBeInTheDocument();
  });

  it('choosing Recurring shows the interval fields and sends "every 2 weeks"', async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByRole('textbox', { name: /Name/ }), '  Check the roof ');
    await user.click(screen.getByRole('radio', { name: 'Recurring' }));
    expect(screen.queryByLabelText(/Due date/)).not.toBeInTheDocument();

    const count = screen.getByLabelText(/Repeat every/);
    await user.clear(count);
    await user.type(count, '2');
    await user.selectOptions(screen.getByLabelText('Unit'), 'weeks');
    await user.type(
      screen.getByRole('textbox', { name: /Steps/ }),
      'Climb up{Enter}{Enter}Look around',
    );
    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      title: 'Check the roof',
      kind: 'recurring',
      intervalCount: 2,
      intervalUnit: 'week',
      dueOn: null,
      steps: ['Climb up', 'Look around'],
      priority: 'normal',
      titleEs: null,
      stepsEs: null,
    });
  });

  it('One-off hides the interval and sends the due date', async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByRole('textbox', { name: /Name/ }), 'Fix the gate latch');
    await user.click(screen.getByRole('radio', { name: 'Recurring' }));
    expect(screen.getByLabelText(/Repeat every/)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'One-off' }));
    expect(screen.queryByLabelText(/Repeat every/)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/Due date/), '2026-10-30');
    await user.click(screen.getByRole('button', { name: 'Create task' }));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      kind: 'once',
      intervalCount: null,
      intervalUnit: null,
      dueOn: '2026-10-30',
    });
  });

  it('needs a name, and a whole number for the interval', async () => {
    const { user, onSubmit } = setup();
    await user.click(screen.getByRole('button', { name: 'Create task' }));
    expect(await screen.findByText('Enter a name.')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: /Name/ }), 'Gate');
    await user.click(screen.getByRole('radio', { name: 'Recurring' }));
    const count = screen.getByLabelText(/Repeat every/);
    await user.clear(count);
    await user.type(count, '0');
    await user.click(screen.getByRole('button', { name: 'Create task' }));
    expect(await screen.findByText('Enter a whole number from 1 to 365.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('opens the Spanish section when the task has Spanish text and sends cleared fields as null', async () => {
    const task = makeTask({
      id: 'chapia',
      title: 'Chapia',
      titleEs: 'Chapia (zacate)',
      stepsEs: ['Uno'],
      safety: 'Gloves',
    });
    const { user, onSubmit } = setup({ initial: task, submitLabel: 'Save task' });
    expect(screen.getByRole('textbox', { name: /Name \(Spanish\)/ })).toHaveValue(
      'Chapia (zacate)',
    );
    await user.clear(screen.getByRole('textbox', { name: /Name \(Spanish\)/ }));
    await user.clear(screen.getByRole('textbox', { name: /Safety/ }));
    await user.click(screen.getByRole('button', { name: 'Save task' }));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      kind: 'recurring',
      intervalCount: 14,
      intervalUnit: 'day',
      titleEs: null,
      safety: null,
      stepsEs: ['Uno'],
    });
  });

  it('editing a one-off keeps its due date', async () => {
    const { user, onSubmit } = setup({
      initial: makeOneOff('latch', '2026-11-01'),
      submitLabel: 'Save task',
    });
    expect(screen.getByLabelText(/Due date/)).toHaveValue('2026-11-01');
    await user.click(screen.getByRole('button', { name: 'Save task' }));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ kind: 'once', dueOn: '2026-11-01' });
  });

  it('cancels', async () => {
    const { user, onCancel } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
