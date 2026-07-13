import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from './Home';
import Login from './Login';
import { defaultUser, jsonResponse, renderWithProviders } from '../test/test-utils';

vi.mock('lottie-react', () => ({ default: () => <div data-testid="lottie" /> }));

describe('Login', () => {
  it('submits credentials and calls login on success', async () => {
    const login = vi.fn();
    globalThis.fetch = vi.fn(() => jsonResponse({ access_token: 'access-token' }));

    renderWithProviders(<Login />, {
      authValue: { user: null, token: null, login, logout: vi.fn() },
      route: '/login',
    });

    await userEvent.type(screen.getByRole('textbox', { name: /C.dula/i }), '1710034065');
    await userEvent.type(screen.getByLabelText(/Contrase/i), 'Strong1@');
    await userEvent.click(screen.getByRole('button', { name: /Iniciar sesi/i }));

    await waitFor(() => expect(login).toHaveBeenCalledWith('access-token'));
  });

  it('shows an error when login fails', async () => {
    globalThis.fetch = vi.fn(() => jsonResponse({ detail: 'bad credentials' }, false, 401));

    renderWithProviders(<Login />, {
      authValue: { user: null, token: null, login: vi.fn(), logout: vi.fn() },
      route: '/login',
    });

    await userEvent.click(screen.getByRole('button', { name: /Iniciar sesi/i }));

    expect(await screen.findByText(/incorrecta/i)).toBeInTheDocument();
  });
});

describe('Home', () => {
  it('renders authenticated state and successful API result', async () => {
    localStorage.setItem('token', 'token');
    globalThis.fetch = vi.fn(() => jsonResponse([{ id: 1, name: 'Ana' }]));

    renderWithProviders(<Home />, {
      authValue: { user: defaultUser, token: 'token', login: vi.fn(), logout: vi.fn() },
    });

    expect(screen.getByText(/Bienvenido a FitFlow/i)).toBeInTheDocument();
    expect(screen.getByText(/Sesi/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Probar \/auth\/users/i }));

    expect(await screen.findByText(/Respuesta JSON/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Ana/i).length).toBeGreaterThan(0);
  });

  it('shows token and network errors for manual API calls', async () => {
    renderWithProviders(<Home />, {
      authValue: { user: null, token: null, login: vi.fn(), logout: vi.fn() },
    });

    await userEvent.click(screen.getByRole('button', { name: /Probar \/auth\/admins/i }));
    expect(screen.getByText(/No hay token/i)).toBeInTheDocument();

    localStorage.setItem('token', 'token');
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));

    await userEvent.click(screen.getByRole('button', { name: /Probar \/auth\/nutritionists/i }));
    expect(await screen.findByText(/Error de red: offline/i)).toBeInTheDocument();
  });
});
