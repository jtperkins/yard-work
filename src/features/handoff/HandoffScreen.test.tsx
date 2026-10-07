import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, makeCompletion, makeNote } from '../../api/test-utils';
import type { FakeApi } from '../../api/test-utils';
import { renderScreen } from '../log/screen-test-utils';
import { HandoffScreen } from './HandoffScreen';

const pinned = makeNote({
  id: '00000000-0000-4000-8000-0000000000b1',
  author: 'Owner',
  body: 'CATS\n- Names: Luna, Sol, Coco',
  pinned: true,
  createdAt: '2026-09-01T15:00:00.000Z',
});
const recent = makeNote({
  id: '00000000-0000-4000-8000-0000000000b2',
  author: 'Neighbor',
  body: 'Water was off Tuesday morning',
  pinned: false,
  createdAt: '2026-10-06T15:00:00.000Z',
});

function routes(api: FakeApi) {
  let notes = [pinned, recent];
  api.on('GET /api/notes', () => jsonResponse({ notes }));
  api.on('GET /api/completions/latest', () =>
    jsonResponse({
      completions: [makeCompletion({ taskId: 'mow-lawn', doneOn: '2026-09-01' })],
    }),
  );
  api.on('GET /api/completions', () =>
    jsonResponse({
      completions: [
        makeCompletion({ taskId: 'trash-out', doneOn: '2026-10-05', doneBy: 'Yard worker' }),
      ],
    }),
  );
  api.on('POST /api/notes', (call) => {
    const body = call.body as { id: string; body: string; pinned?: boolean };
    return jsonResponse(
      {
        id: body.id,
        author: 'JT',
        body: body.body,
        pinned: body.pinned ?? false,
        createdAt: '2026-10-07T18:00:00.000Z',
      },
      201,
    );
  });
  api.on(`DELETE /api/notes/${recent.id}`, () => {
    notes = notes.filter((n) => n.id !== recent.id);
    return jsonResponse({ ok: true });
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-07T18:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('HandoffScreen', () => {
  it('is gated when signed out and never requests the private notes', async () => {
    const { api } = renderScreen(<HandoffScreen />, { path: '/handoff', user: null, routes });
    expect(screen.getByRole('heading', { level: 1, name: 'Handoff' })).toBeInTheDocument();
    expect(await screen.findByText('Handoff notes are private')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How this works' })).toBeInTheDocument();
    expect(screen.queryByText(pinned.body)).not.toBeInTheDocument();
    expect(api.callsTo('GET /api/notes')).toHaveLength(0);
  });

  it('shows the state of the house, pinned and recent notes when signed in', async () => {
    renderScreen(<HandoffScreen />, { path: '/handoff', user: 'JT', routes });
    const pinnedSection = (await screen.findByRole('heading', { name: /Pinned/ })).closest(
      'section',
    )!;
    expect(await within(pinnedSection).findByText(/Luna, Sol, Coco/)).toBeInTheDocument();
    const notesSection = screen.getByRole('heading', { name: /^Notes/ }).closest('section')!;
    expect(within(notesSection).getByText(recent.body)).toBeInTheDocument();

    const state = screen.getByRole('region', { name: 'State of the house' });
    expect(within(state).getByRole('heading', { name: /Overdue/ })).toBeInTheDocument();
    expect(await within(state).findByText(/by Yard worker/)).toBeInTheDocument();
  });

  it('posts a pinned note from the template', async () => {
    const { api } = renderScreen(<HandoffScreen />, { path: '/handoff', user: 'JT', routes });
    await userEvent.click(await screen.findByRole('button', { name: 'Start from the template' }));
    const box = screen.getByLabelText('Note');
    expect((box as HTMLTextAreaElement).value).toMatch(/^CATS\n/);
    await userEvent.click(screen.getByRole('checkbox', { name: /Pin to top/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Post note' }));

    await waitFor(() => expect(api.callsTo('POST /api/notes')).toHaveLength(1));
    const body = api.callsTo('POST /api/notes')[0]!.body as Record<string, unknown>;
    expect(body.pinned).toBe(true);
    expect(String(body.body)).toMatch(/^CATS\n- Names:/);
    expect(typeof body.id).toBe('string');
    expect((box as HTMLTextAreaElement).value).toBe('');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Note posted'));
  });

  it('requires text before posting', async () => {
    const { api } = renderScreen(<HandoffScreen />, { path: '/handoff', user: 'JT', routes });
    await userEvent.click(await screen.findByRole('button', { name: 'Post note' }));
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(api.callsTo('POST /api/notes')).toHaveLength(0);
  });

  it('confirms before deleting someone else’s note', async () => {
    const { api } = renderScreen(<HandoffScreen />, { path: '/handoff', user: 'JT', routes });
    await userEvent.click(await screen.findByRole('button', { name: 'Delete note by Neighbor' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete this note?' });
    expect(dialog).toHaveTextContent('This note was written by Neighbor');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete note' }));
    await waitFor(() => expect(api.callsTo(`DELETE /api/notes/${recent.id}`)).toHaveLength(1));
    await waitFor(() => expect(screen.queryByText(recent.body)).not.toBeInTheDocument());
  });
});
