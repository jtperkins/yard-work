import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeApi, jsonResponse, makeIncident, makeIncidentFile } from '../../api/test-utils';
import { RequireAuth } from '../shared/RequireAuth';
import { renderScreen } from '../shared/test-utils';
import { IncidentDetailScreen } from './IncidentDetailScreen';
import { IncidentsScreen } from './IncidentsScreen';
import { NewIncidentScreen } from './NewIncidentScreen';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-17T18:00:00Z')); // 12:00 in Costa Rica
});
afterEach(() => vi.useRealTimers());

const INCIDENT_ID = '11111111-1111-4111-8111-111111111111';

function mb(n: number): File {
  const file = new File([new Uint8Array(4)], 'big.mp4', { type: 'video/mp4' });
  return Object.defineProperty(file, 'size', { value: n * 1024 * 1024 });
}

describe('IncidentsScreen', () => {
  it('shows the sign-in prompt when signed out and never requests incidents', async () => {
    const api = createFakeApi();
    api.on('GET /api/incidents', { incidents: [] });
    renderScreen(
      <RequireAuth>
        <IncidentsScreen />
      </RequireAuth>,
      { api, path: '/incidents' },
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign in to see this page' }),
    ).toBeInTheDocument();
    expect(api.callsTo('GET /api/incidents')).toHaveLength(0);
  });

  it('lists reports with type, time in Costa Rica, place and file count', async () => {
    const api = createFakeApi();
    api.on('GET /api/incidents', {
      incidents: [
        {
          ...makeIncident({
            id: INCIDENT_ID,
            type: 'poking-around',
            occurredAt: '2026-10-16T20:30:00.000Z',
            location: 'Back gate',
          }),
          fileCount: 2,
        },
      ],
    });
    renderScreen(<IncidentsScreen />, { api, me: 'JT', path: '/incidents' });
    const list = await screen.findByRole('list', { name: 'Incident reports' });
    const row = within(list).getByRole('link', { name: /Someone poking around/ });
    expect(row).toHaveAttribute('href', `/incidents/${INCIDENT_ID}`);
    expect(row).toHaveTextContent(/Oct 16, 2026.*2:30\s?PM/);
    expect(row).toHaveTextContent('Back gate');
    expect(row).toHaveTextContent('2 files');
    expect(screen.getByRole('link', { name: 'Report incident' })).toHaveAttribute(
      'href',
      '/incidents/new',
    );
  });

  it('has an empty state', async () => {
    const api = createFakeApi();
    api.on('GET /api/incidents', { incidents: [] });
    renderScreen(<IncidentsScreen />, { api, me: 'JT', path: '/incidents' });
    expect(await screen.findByText('No incidents reported')).toBeInTheDocument();
  });
});

describe('NewIncidentScreen', () => {
  function setup() {
    const api = createFakeApi();
    api.on('POST /api/incidents', ({ body }) => {
      const req = body as { id: string };
      return jsonResponse(
        { incident: makeIncident({ id: req.id, ...(body as object) }), files: [] },
        201,
      );
    });
    return renderScreen(<NewIncidentScreen />, { api, me: 'JT', path: '/incidents/new' });
  }

  it('blocks submit without a description', async () => {
    const { api, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Save report' }));
    expect(await screen.findByText('Describe what happened.')).toBeInTheDocument();
    expect(api.callsTo('POST /api/incidents')).toHaveLength(0);
  });

  it('uses a select for the type with the four options, and defaults the time to now', () => {
    setup();
    const type = screen.getByLabelText('What kind');
    expect(type.tagName).toBe('SELECT');
    expect(
      within(type)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Sighting', 'Someone poking around', 'Trespassing', 'Other']);
    expect(screen.getByLabelText(/When/)).toHaveValue('2026-10-17T12:00');
  });

  it('shows a readable error for a 60 MB video and does not attach it', async () => {
    const { user } = setup();
    await user.upload(screen.getByLabelText('Add files'), mb(60));
    expect(
      await screen.findByText('“big.mp4” is too large (max 50 MB for this type).'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Attached files' })).not.toBeInTheDocument();
  });

  it('rejects a file type that is not allowed even if the picker let it through', async () => {
    setup();
    const user = userEvent.setup({ applyAccept: false });
    await user.upload(
      screen.getByLabelText('Add files'),
      new File(['x'], 'notes.txt', { type: 'text/plain' }),
    );
    expect(await screen.findByText('“notes.txt” isn’t a supported file type.')).toBeInTheDocument();
  });

  it('accepts a HEIC file with an empty type and uploads it as image/heic', async () => {
    const { api, user, location } = setup();
    api.on(/* any incident id */ `POST /api/incidents/${INCIDENT_ID}/files`, () =>
      jsonResponse(makeIncidentFile({ fileName: 'x.heic', contentType: 'image/heic' }), 201),
    );
    await user.type(screen.getByRole('textbox', { name: /What happened/ }), 'Man at the gate');
    await user.upload(
      screen.getByLabelText('Add files'),
      new File([new Uint8Array(10)], 'x.heic', { type: '' }),
    );
    expect(screen.queryByText(/supported file type/)).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Attached files' })).toHaveTextContent('x.heic');

    // Answer the upload for whatever id the client generated.
    api.on('POST /api/incidents', ({ body }) => {
      const req = body as { id: string };
      api.on(`POST /api/incidents/${req.id}/files`, () =>
        jsonResponse(makeIncidentFile({ incidentId: req.id, contentType: 'image/heic' }), 201),
      );
      return jsonResponse({ incident: makeIncident({ id: req.id }), files: [] }, 201);
    });
    await user.click(screen.getByRole('button', { name: 'Save report' }));

    await waitFor(() => expect(location()).toMatch(/^\/incidents\/[0-9a-f-]{36}$/));
    const upload = api.calls.find((c) => c.path.endsWith('/files'))!;
    expect(upload.init?.headers).toMatchObject({ 'content-type': 'image/heic' });
    expect(api.callsTo('POST /api/incidents')[0]!.body).toMatchObject({
      description: 'Man at the gate',
      type: 'sighting',
      occurredAt: '2026-10-17T18:00:00.000Z',
    });
  });

  it('keeps the saved report when an upload fails and offers a retry', async () => {
    const { api, user, location } = setup();
    api.on('POST /api/incidents', ({ body }) => {
      const req = body as { id: string };
      let attempts = 0;
      api.on(`POST /api/incidents/${req.id}/files`, () => {
        attempts += 1;
        return attempts === 1
          ? jsonResponse({ error: 'Max 10 files per incident' }, 413)
          : jsonResponse(makeIncidentFile({ incidentId: req.id }), 201);
      });
      return jsonResponse({ incident: makeIncident({ id: req.id }), files: [] }, 201);
    });
    await user.type(screen.getByRole('textbox', { name: /What happened/ }), 'Two men');
    await user.upload(
      screen.getByLabelText('Add files'),
      new File([new Uint8Array(10)], 'a.png', { type: 'image/png' }),
    );
    await user.click(screen.getByRole('button', { name: 'Save report' }));

    expect(await screen.findByText('Report saved')).toBeInTheDocument();
    expect(await screen.findByText('Max 10 files per incident')).toBeInTheDocument();
    expect(location()).toBe('/incidents/new');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(location()).toMatch(/^\/incidents\/[0-9a-f-]{36}$/));
  });
});

describe('IncidentDetailScreen', () => {
  function setup() {
    const api = createFakeApi();
    api.on(`GET /api/incidents/${INCIDENT_ID}`, {
      incident: makeIncident({ id: INCIDENT_ID, people: 'Two men in a grey truck' }),
      files: [
        makeIncidentFile({ id: 'f1', fileName: 'gate.png', contentType: 'image/png' }),
        makeIncidentFile({ id: 'f2', fileName: 'shot.heic', contentType: 'image/heic' }),
        makeIncidentFile({ id: 'f3', fileName: 'notes.pdf', contentType: 'application/pdf' }),
      ],
    });
    return renderScreen(<IncidentDetailScreen />, {
      api,
      me: 'JT',
      path: `/incidents/${INCIDENT_ID}`,
      route: '/incidents/:id',
    });
  }

  it('shows the report, previews images inline and links the other files', async () => {
    const { container } = setup();
    expect(await screen.findByRole('heading', { level: 1, name: 'Sighting' })).toBeInTheDocument();
    expect(screen.getByText('Man looking over the fence')).toBeInTheDocument();
    expect(screen.getByText('Two men in a grey truck')).toBeInTheDocument();
    expect(screen.getByText('Reported by JT')).toBeInTheDocument();
    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('src', '/api/incidents/files/f1');
    expect(screen.getByRole('link', { name: 'notes.pdf' })).toHaveAttribute(
      'href',
      '/api/incidents/files/f3',
    );
    expect(screen.getByRole('link', { name: 'shot.heic' })).toBeInTheDocument();
  });

  it('deletes after a confirmation', async () => {
    const { api, user, location } = setup();
    api.on(`DELETE /api/incidents/${INCIDENT_ID}`, { ok: true });
    await user.click(await screen.findByRole('button', { name: 'Delete report' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete this report?' });
    expect(api.callsTo(`DELETE /api/incidents/${INCIDENT_ID}`)).toHaveLength(0);
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(api.callsTo(`DELETE /api/incidents/${INCIDENT_ID}`)).toHaveLength(1),
    );
    await waitFor(() => expect(location()).toBe('/incidents'));
  });

  it('handles a report that does not exist', async () => {
    renderScreen(<IncidentDetailScreen />, {
      me: 'JT',
      path: `/incidents/${INCIDENT_ID}`,
      route: '/incidents/:id',
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Incident not found' }),
    ).toBeInTheDocument();
  });
});
