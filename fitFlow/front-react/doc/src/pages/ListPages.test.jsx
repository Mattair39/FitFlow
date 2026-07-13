import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Admins from './Admins';
import Nutritionists from './Nutritionists';
import Users from './Users';
import Foods from './Foods';
import { jsonResponse, renderWithProviders } from '../test/test-utils';

const people = [
  {
    user_id: 1,
    first_name: 'Ana',
    last_name: 'Lopez',
    cedula: '1710034065',
    email: 'ana@example.com',
    role: 'Administrador',
  },
];

describe('list pages', () => {
  it('renders admins from the API', async () => {
    globalThis.fetch = vi.fn(() => jsonResponse(people));

    renderWithProviders(<Admins />);

    expect(await screen.findByText('Ana Lopez')).toBeInTheDocument();
    expect(screen.getByText(/ana@example.com/i)).toBeInTheDocument();
  });

  it('renders nutritionists from the API', async () => {
    globalThis.fetch = vi.fn(() => jsonResponse([{ ...people[0], role: 'Nutricionista' }]));

    renderWithProviders(<Nutritionists />);

    expect(await screen.findByText('Ana Lopez')).toBeInTheDocument();
    expect(screen.getByText('Nutricionista')).toBeInTheDocument();
  });

  it('renders, views and deletes users', async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse([{ ...people[0], role: 'Cliente' }]))
      .mockImplementationOnce(() => jsonResponse({}, true, 200));

    renderWithProviders(<Users />);

    expect(await screen.findByText('Ana Lopez')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Eliminar'));

    await waitFor(() => expect(globalThis.alert).toHaveBeenCalledWith('Usuario eliminado.'));
    expect(screen.queryByText('Ana Lopez')).not.toBeInTheDocument();
  });
});

describe('Foods', () => {
  const food = {
    food_id: 1,
    name: 'Avena',
    description: 'Integral',
    calories_per_portion: 120,
    protein_per_portion: 4,
    fat_per_portion: 2,
    carbs_per_portion: 20,
    portion_unit: 'g',
  };

  it('loads foods and opens the create dialog', async () => {
    globalThis.fetch = vi.fn(() => jsonResponse([food]));

    renderWithProviders(<Foods />);

    expect(await screen.findByText('Avena')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /A.adir Alimento/i }));

    expect(screen.getByText('Nuevo Alimento')).toBeInTheDocument();
  });

  it('creates, edits and deletes foods', async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse([food]))
      .mockImplementationOnce(() => jsonResponse({ ...food, name: 'Banano' }))
      .mockImplementationOnce(() => jsonResponse([food]))
      .mockImplementationOnce(() => jsonResponse({}, true, 200));

    renderWithProviders(<Foods />);

    expect(await screen.findByText('Avena')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Editar'));
    await userEvent.clear(screen.getByLabelText('Nombre'));
    await userEvent.type(screen.getByLabelText('Nombre'), 'Banano');
    await userEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/foods/1',
      expect.objectContaining({ method: 'PUT' }),
    ));

    await userEvent.click(screen.getByLabelText('Eliminar'));

    await waitFor(() => expect(screen.queryByText('Avena')).not.toBeInTheDocument());
  });
});
