import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createFakeApi, jsonResponse } from '../../api/test-utils';
import { renderScreen } from '../shared/test-utils';
import { LoginScreen, safeNext } from './index';

describe('safeNext', () => {
  it.each([
    [null, '/'],
    ['/tasks', '/tasks'],
    ['/tasks/chapia?x=1', '/tasks/chapia?x=1'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    ['https://evil.example', '/'],
    ['/login?next=/week', '/'],
  ])('%s → %s', (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });
});

describe('LoginScreen', () => {
  function setup(me: string | null = null) {
    const api = createFakeApi();
    return renderScreen(<LoginScreen />, {
      api,
      me,
      path: '/login?next=%2Ftasks',
      route: '/login',
    });
  }

  it('signs in with name + house code and returns to `next`', async () => {
    const { api, user, location } = setup();
    api.on('POST /api/login', ({ body }) =>
      jsonResponse({ name: (body as { name: string }).name }),
    );
    await user.type(await screen.findByRole('textbox', { name: /Name/ }), '  José ');
    await user.type(screen.getByLabelText(/House code/), 'open-sesame');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(location()).toBe('/tasks'));
    expect(api.callsTo('POST /api/login')[0]!.body).toEqual({ name: 'José', code: 'open-sesame' });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Welcome, José'));
  });

  it('explains a wrong house code and clears it', async () => {
    const { api, user, location } = setup();
    api.on('POST /api/login', jsonResponse({ error: 'Wrong code' }, 401));
    await user.type(await screen.findByRole('textbox', { name: /Name/ }), 'JT');
    const code = screen.getByLabelText(/House code/);
    await user.type(code, 'nope');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(
      await screen.findByText('That house code isn’t right. Check it and try again.'),
    ).toBeInTheDocument();
    expect(code).toHaveValue('');
    expect(code).toHaveAttribute('aria-invalid', 'true');
    expect(location()).toBe('/login?next=%2Ftasks');
  });

  it('validates required fields before calling the API', async () => {
    const { api, user } = setup();
    await user.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(screen.getAllByText('Required')).toHaveLength(2);
    expect(api.callsTo('POST /api/login')).toHaveLength(0);
  });

  it('shows the signed-in state with continue and sign out', async () => {
    const { api, user } = setup('JT');
    api.on('POST /api/logout', { name: null });
    expect(
      await screen.findByText(
        'Signed in as JT. You can sign off work, edit tasks and report incidents.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/tasks');
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('textbox', { name: /Name/ })).toBeInTheDocument();
  });

  it('is in Spanish when the UI is', async () => {
    renderScreen(<LoginScreen />, { lang: 'es', path: '/login', route: '/login' });
    expect(screen.getByRole('heading', { level: 1, name: 'Ingresar' })).toBeInTheDocument();
    expect(await screen.findByLabelText(/Código de la casa/)).toBeInTheDocument();
  });
});
