import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterAdmin from './RegisterAdmin';
import RegisterClient from './RegisterClient';
import RegisterNutritionist from './RegisterNutritionist';
import { jsonResponse, renderWithProviders } from '../test/test-utils';

function input(name) {
  return document.querySelector(`[name="${name}"]`);
}

async function fillTextFields(values) {
  for (const [name, value] of Object.entries(values)) {
    fireEvent.change(input(name), { target: { name, value } });
  }
}

async function chooseCombobox(index, optionName) {
  await userEvent.click(screen.getAllByRole('combobox')[index]);
  await userEvent.click(screen.getByRole('option', { name: optionName }));
}

describe('RegisterClient', () => {
  it('validates required fields and submits a valid client', async () => {
    globalThis.fetch = vi.fn(() => jsonResponse({ ok: true }));
    renderWithProviders(<RegisterClient />);

    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(await screen.findByText(/Hay errores/i)).toBeInTheDocument();

    await fillTextFields({
      cedula: '1710034065',
      first_name: 'Ana',
      last_name: 'Lopez',
      email: 'ana@example.com',
      password: 'Strong1@',
      birth_date: '1994-05-01',
      height_cm: '165',
      weight_current_kg: '60',
      weight_goal_kg: '58',
    });
    await chooseCombobox(0, 'Femenino');
    await chooseCombobox(1, 'Moderado');
    await chooseCombobox(2, 'Bajar Peso');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/register/client',
      expect.objectContaining({ method: 'POST' }),
    ));
    expect(await screen.findByText(/Cliente registrado/i)).toBeInTheDocument();
  });

  it('shows API validation messages for client registration', async () => {
    globalThis.fetch = vi.fn(() => jsonResponse({ detail: [{ loc: ['body', 'email'], msg: 'invalid' }] }, false, 422));
    renderWithProviders(<RegisterClient />);

    await fillTextFields({
      cedula: '1710034065',
      first_name: 'Ana',
      last_name: 'Lopez',
      email: 'ana@example.com',
      password: 'Strong1@',
      birth_date: '1994-05-01',
      height_cm: '165',
      weight_current_kg: '60',
      weight_goal_kg: '58',
    });
    await chooseCombobox(0, 'Femenino');
    await chooseCombobox(1, 'Moderado');
    await chooseCombobox(2, 'Bajar Peso');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(await screen.findByText(/body.email - invalid/i)).toBeInTheDocument();
  });
});

describe('RegisterAdmin', () => {
  async function fillAdmin(overrides = {}) {
    await fillTextFields({
      cedula: '1710034065',
      first_name: 'Root',
      last_name: 'Admin',
      email: 'admin@example.com',
      password: 'Strong1@',
      birth_date: '1990-01-01',
      sex: 'Masculino',
      department: 'Soporte',
      phone_number: '0999999999',
      ...overrides,
    });
  }

  it('submits success and handles network errors', async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse({ ok: true }))
      .mockImplementationOnce(() => Promise.reject(new Error('offline')));
    renderWithProviders(<RegisterAdmin />);

    await fillAdmin();
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(await screen.findByText(/Administrador registrado/i)).toBeInTheDocument();

    await fillAdmin();
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(await screen.findByText(/Error de conexi/i)).toBeInTheDocument();
  });

  it('validates admin fields and shows backend validation details', async () => {
    globalThis.fetch = vi.fn(() => jsonResponse({
      detail: [{ loc: ['body', 'email'], msg: 'already exists' }],
    }, false, 422));
    renderWithProviders(<RegisterAdmin />);

    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(await screen.findByText(/Hay errores/i)).toBeInTheDocument();
    expect(screen.getAllByText('Requerido').length).toBeGreaterThan(0);

    await fillAdmin();
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(await screen.findByText(/body.email - already exists/i)).toBeInTheDocument();
  });
});

describe('RegisterNutritionist', () => {
  it('submits success and displays backend errors', async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse({ ok: true }))
      .mockImplementationOnce(() => jsonResponse({ detail: 'Cedula duplicada' }, false, 400));
    renderWithProviders(<RegisterNutritionist />);

    async function fillNutritionist() {
      await fillTextFields({
        cedula: '0926687856',
        first_name: 'Nutri',
        last_name: 'Coach',
        email: 'nutri@example.com',
        password: 'Strong1@',
        birth_date: '1988-01-01',
        certification_number: 'CERT-1',
      });
      await chooseCombobox(0, 'Femenino');
      await chooseCombobox(1, /Deportiva/i);
    }

    await fillNutritionist();
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(await screen.findByText(/Nutricionista registrado/i)).toBeInTheDocument();

    await fillNutritionist();
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(await screen.findByText(/Cedula duplicada/i)).toBeInTheDocument();
  });
});
