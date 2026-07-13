import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import App from './App';
import theme from './theme';
import { AuthContext } from './context/AuthContext';

vi.mock('lottie-react', () => ({ default: () => <div data-testid="lottie" /> }));

describe('App', () => {
  it('renders the route shell with navbar and home route', () => {
    window.history.pushState({}, 'Home', '/');

    render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthContext.Provider value={{ user: null, token: null, login: vi.fn(), logout: vi.fn() }}>
          <App />
        </AuthContext.Provider>
      </ThemeProvider>,
    );

    expect(screen.getByText('Fit Flow')).toBeInTheDocument();
    expect(screen.getByText(/Bienvenido a FitFlow/i)).toBeInTheDocument();
  });
});
