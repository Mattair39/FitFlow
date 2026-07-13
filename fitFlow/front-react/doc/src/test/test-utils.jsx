import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { vi } from 'vitest';
import theme from '../theme';
import { AuthContext } from '../context/AuthContext';

export const defaultUser = {
  user_id: 1,
  first_name: 'Ana',
  last_name: 'Lopez',
  email: 'ana@example.com',
  cedula: '1710034065',
  birth_date: '1994-05-01',
  sex: 'Femenino',
  role: 'Cliente',
};

export function renderWithProviders(
  ui,
  {
    route = '/',
    authValue = {
      user: defaultUser,
      token: 'token-123',
      login: vi.fn(),
      logout: vi.fn(),
    },
  } = {},
) {
  window.history.pushState({}, 'Test page', route);

  return render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </AuthContext.Provider>
    </ThemeProvider>,
  );
}

export function jsonResponse(data, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
  });
}
