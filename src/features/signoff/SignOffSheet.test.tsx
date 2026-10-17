import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeTask } from '../../domain/test-fixtures';
import { createFakeApi, jsonResponse, makeCompletion } from '../../api/test-utils';
import { renderScreen } from '../shared/test-utils';
import { SignOffSheet } from './SignOffSheet';

const task = makeTask({ id: 'chapia', title: 'Chapia' });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  // 2026-10-07 10:00 in Costa Rica (UTC−6)
  vi.setSystemTime(new Date('2026-10-07T16:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
});

function setup(props: Partial<Parameters<typeof SignOffSheet>[0]> = {}, me: string | null = 'JT') {
  const onClose = vi.fn();
  const api = createFakeApi();
  api.on('GET /api/completions/latest', { completions: [] });
  const r = renderScreen(<SignOffSheet open onClose={onClose} task={task} {...props} />, {
    me,
    api,
  });
  return { ...r, onClose };
}

describe('SignOffSheet', () => {
  it('posts the sign-off with a client id, the chosen person, date and note', async () => {
    const { api, user, onClose } = setup();
    api.on('POST /api/completions', ({ body }) =>
      jsonResponse(makeCompletion({ ...(body as object), loggedBy: 'JT' }), 201),
    );

    const dialog = await screen.findByRole('dialog', { name: 'Sign off work' });
    const doneBy = within(dialog).getByRole('combobox', { name: /Done by/ });
    await waitFor(() => expect(doneBy).toHaveValue('JT'));
    await user.clear(doneBy);
    await user.type(doneBy, 'Luis');
    const date = within(dialog).getByLabelText(/Date/);
    expect(date).toHaveValue('2026-10-07');
    await user.clear(date);
    await user.type(date, '2026-10-06');
    await user.type(within(dialog).getByRole('textbox', { name: /Note/ }), '  Front and back  ');
    await user.click(screen.getByRole('button', { name: 'Sign off' }));

    await waitFor(() => expect(api.callsTo('POST /api/completions')).toHaveLength(1));
    const body = api.callsTo('POST /api/completions')[0]!.body as Record<string, unknown>;
    expect(body).toMatchObject({
      taskId: 'chapia',
      doneOn: '2026-10-06',
      doneBy: 'Luis',
      note: 'Front and back',
    });
    expect(body).not.toHaveProperty('partial');
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body).not.toHaveProperty('title');
    expect(onClose).toHaveBeenCalled();
    // Announced through the toaster's always-mounted live region.
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Signed off: Chapia/));
  });

  it('offers Dario as a done-by suggestion', async () => {
    setup();
    const dialog = await screen.findByRole('dialog');
    const input = within(dialog).getByRole('combobox', { name: /Done by/ });
    const list = dialog.ownerDocument.getElementById(input.getAttribute('list') ?? '');
    const options = Array.from(list?.querySelectorAll('option') ?? []).map((o) => o.value);
    expect(options).toContain('Dario');
  });

  it('a partial sign-off needs a note saying what is left, then sends partial', async () => {
    const { api, user } = setup();
    api.on('POST /api/completions', ({ body }) =>
      jsonResponse(makeCompletion(body as object), 201),
    );
    await screen.findByRole('dialog');
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /Done by/ })).toHaveValue('JT'),
    );
    await user.click(screen.getByRole('radio', { name: 'Partially done' }));
    expect(screen.getByRole('textbox', { name: /What’s left/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save progress' }));
    expect(await screen.findByText('Say what’s left to do.')).toBeInTheDocument();
    expect(api.callsTo('POST /api/completions')).toHaveLength(0);

    await user.type(screen.getByRole('textbox', { name: /What’s left/ }), 'Edges not done');
    await user.click(screen.getByRole('button', { name: 'Save progress' }));
    await waitFor(() => expect(api.callsTo('POST /api/completions')).toHaveLength(1));
    expect(api.callsTo('POST /api/completions')[0]!.body).toMatchObject({
      taskId: 'chapia',
      partial: true,
      note: 'Edges not done',
    });
  });

  it('validates required name and future dates without posting', async () => {
    const { api, user } = setup();
    await screen.findByRole('dialog');
    const doneBy = screen.getByRole('combobox', { name: /Done by/ });
    await waitFor(() => expect(doneBy).toHaveValue('JT'));
    await user.clear(doneBy);
    const date = screen.getByLabelText(/Date/);
    await user.clear(date);
    await user.type(date, '2026-10-09');
    await user.click(screen.getByRole('button', { name: 'Sign off' }));
    expect(await screen.findByText('Required')).toBeInTheDocument();
    expect(screen.getByText('The date can’t be in the future.')).toBeInTheDocument();
    expect(api.callsTo('POST /api/completions')).toHaveLength(0);
  });

  it('Undo in the toast deletes the new sign-off', async () => {
    const { api, user } = setup();
    api.on('POST /api/completions', ({ body }) =>
      jsonResponse(makeCompletion(body as object), 201),
    );
    api.on('DELETE /api/completions/:id', { ok: true });
    await screen.findByRole('dialog');
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /Done by/ })).toHaveValue('JT'),
    );
    await user.click(screen.getByRole('button', { name: 'Sign off' }));
    const undo = await screen.findByRole('button', { name: 'Undo' });
    await waitFor(() => expect(api.callsTo('POST /api/completions')).toHaveLength(1));
    const id = (api.callsTo('POST /api/completions')[0]!.body as { id: string }).id;
    api.on(`DELETE /api/completions/${id}`, { ok: true });
    await act(async () => {
      await user.click(undo);
    });
    await waitFor(() => expect(api.callsTo(`DELETE /api/completions/${id}`)).toHaveLength(1));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Undone'));
  });

  it('asks signed-out visitors to sign in instead of showing the form', async () => {
    setup({}, null);
    await screen.findByRole('dialog');
    expect(await screen.findByRole('link', { name: 'Sign in to sign off' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    renderScreen(<SignOffSheet open={false} onClose={() => {}} task={task} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
