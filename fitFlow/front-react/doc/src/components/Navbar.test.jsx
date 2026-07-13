import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Navbar from './Navbar';
import { defaultUser, renderWithProviders } from '../test/test-utils';

describe('Navbar', () => {
  it('shows public navigation when there is no user', async () => {
    renderWithProviders(<Navbar />, {
      authValue: { user: null, token: null, login: vi.fn(), logout: vi.fn() },
    });

    expect(screen.getByText('Fit Flow')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(screen.getByText('Cliente')).toBeInTheDocument();
    expect(screen.getByText('Nutricionista')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
  });

  it('shows client links and logs out authenticated users', async () => {
    const logout = vi.fn();
    renderWithProviders(<Navbar />, {
      authValue: { user: defaultUser, token: 'token', login: vi.fn(), logout },
    });

    expect(screen.getByRole('link', { name: 'Mis Planes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mi Diario' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByText(/Cerrar Sesi/i));

    expect(logout).toHaveBeenCalled();
  });

  it('shows role-specific links for admins and nutritionists', () => {
    const { unmount } = renderWithProviders(<Navbar />, {
      authValue: {
        user: { ...defaultUser, role: 'Administrador' },
        token: 'token',
        login: vi.fn(),
        logout: vi.fn(),
      },
    });

    expect(screen.getByRole('link', { name: 'Usuarios' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Alimentos' })).toBeInTheDocument();

    unmount();

    renderWithProviders(<Navbar />, {
      authValue: {
        user: { ...defaultUser, role: 'Nutricionista' },
        token: 'token',
        login: vi.fn(),
        logout: vi.fn(),
      },
    });

    expect(screen.getByRole('link', { name: 'Crear Plan' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Alimentos' })).toBeInTheDocument();
  });
});
