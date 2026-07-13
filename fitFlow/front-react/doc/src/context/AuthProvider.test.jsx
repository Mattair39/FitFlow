import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthContext } from './AuthContext';
import { AuthProvider } from './AuthProvider';
import { renderWithProviders, jsonResponse } from '../test/test-utils';

function Consumer() {
  return (
    <AuthContext.Consumer>
      {({ user, token, login, logout }) => (
        <div>
          <span>{user ? user.first_name : 'anon'}</span>
          <span>{token || 'no-token'}</span>
          <button onClick={() => login('new-token')}>login</button>
          <button onClick={logout}>logout</button>
        </div>
      )}
    </AuthContext.Consumer>
  );
}

describe('AuthProvider', () => {
  it('loads stored auth state and logs out', async () => {
    localStorage.setItem('user', JSON.stringify({ first_name: 'Luis' }));
    localStorage.setItem('token', 'stored-token');

    renderWithProviders(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
      { authValue: undefined },
    );

    expect(screen.getByText('Luis')).toBeInTheDocument();
    expect(screen.getByText('stored-token')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'logout' }));

    expect(screen.getByText('anon')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('fetches the current user during login and persists auth state', async () => {
    globalThis.fetch = vi.fn(() => jsonResponse({ first_name: 'Ana', user_id: 1 }));

    renderWithProviders(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
      { authValue: undefined },
    );

    await userEvent.click(screen.getByRole('button', { name: 'login' }));

    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument());
    expect(localStorage.getItem('token')).toBe('new-token');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/auth/me',
      expect.objectContaining({ headers: { Authorization: 'Bearer new-token' } }),
    );
  });
});
