import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createFakeApi, jsonResponse } from '../../api/test-utils';
import { makeOneOff, makeTask } from '../../domain/test-fixtures';
import { renderScreen } from '../shared/test-utils';
import { TaskFormScreen } from './TaskFormScreen';

describe('TaskFormScreen', () => {
  it('creates a task and opens it under the id the server made', async () => {
    const api = createFakeApi();
    api.on('POST /api/tasks', jsonResponse({ task: makeOneOff('new-task') }, 201));
    const { user, location } = renderScreen(<TaskFormScreen />, {
      api,
      me: 'JT',
      path: '/tasks/new',
      route: '/tasks/new',
    });
    expect(screen.getByRole('heading', { level: 1, name: 'New task' })).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: /Name/ }), 'New');
    await user.click(screen.getByRole('button', { name: 'Create task' }));
    await waitFor(() => expect(api.callsTo('POST /api/tasks')).toHaveLength(1));
    expect(api.callsTo('POST /api/tasks')[0]!.body).toMatchObject({ title: 'New', kind: 'once' });
    await waitFor(() => expect(location()).toBe('/tasks/new-task'));
  });

  it('edits an existing task with a PATCH', async () => {
    const api = createFakeApi();
    const task = makeTask({ id: 'chapia', title: 'Chapia' });
    api.on('GET /api/tasks/chapia', { task });
    api.on('PATCH /api/tasks/chapia', { task: { ...task, priority: 'low' } });
    const { user, location } = renderScreen(<TaskFormScreen />, {
      api,
      me: 'JT',
      path: '/tasks/chapia/edit',
      route: '/tasks/:id/edit',
    });
    expect(await screen.findByRole('heading', { level: 1, name: 'Edit task' })).toBeInTheDocument();
    await user.selectOptions(await screen.findByLabelText('Priority'), 'Low priority');
    await user.click(screen.getByRole('button', { name: 'Save task' }));
    await waitFor(() => expect(api.callsTo('PATCH /api/tasks/chapia')).toHaveLength(1));
    expect(api.callsTo('PATCH /api/tasks/chapia')[0]!.body).toMatchObject({
      priority: 'low',
      kind: 'recurring',
      intervalCount: 14,
      intervalUnit: 'day',
    });
    await waitFor(() => expect(location()).toBe('/tasks/chapia'));
  });

  it('says so when the task to edit does not exist', async () => {
    renderScreen(<TaskFormScreen />, {
      me: 'JT',
      path: '/tasks/nope/edit',
      route: '/tasks/:id/edit',
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Task not found' }),
    ).toBeInTheDocument();
  });
});
