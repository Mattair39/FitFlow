import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateNutritionalPlan from './CreateNutritionalPlan';
import EnhancedNutritionPlanner from './EnhancedNutritionPlanner';
import FoodLog from './FoodLog';
import MyPlans from './MyPlans';
import Profile from './Profile';
import { defaultUser, jsonResponse, renderWithProviders } from '../test/test-utils';

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

const plan = {
  plan_id: 1,
  name: 'Plan lunes',
  description: 'Balanceado',
  plan_date: '2099-01-01',
  meals: [
    {
      food_id: 1,
      food_name: 'Avena',
      meal_type: 'Desayuno',
      portion_size: 1,
    },
  ],
};

const planStatus = {
  plan_name: 'Plan lunes',
  total_planned: 1,
  fulfilled_count: 0,
  adherence_percentage: 0,
  detail: [
    {
      food_id: 1,
      food_name: 'Avena',
      meal_type: 'Desayuno',
      planned_portion: 1,
      consumed_portion: 0,
      compliance_percentage: 0,
      status: 'pendiente',
    },
  ],
};

describe('CreateNutritionalPlan', () => {
  it('loads foods and clients and generates an AI plan', async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse([food]))
      .mockImplementationOnce(() => jsonResponse([{ user_id: 9, first_name: 'Carlos', last_name: 'Diaz' }]))
      .mockImplementationOnce(() => jsonResponse([]))
      .mockImplementationOnce(() => jsonResponse({ plan_data: { ...plan, meals: plan.meals }, statistics: {
        target_calories: 2000,
        generated_calories: 1980,
        accuracy_percentage: 99,
        meal_count: 1,
      } }));

    renderWithProviders(<CreateNutritionalPlan />, {
      authValue: {
        user: { ...defaultUser, user_id: 2, role: 'Nutricionista' },
        token: 'token',
        login: vi.fn(),
        logout: vi.fn(),
      },
    });

    expect(await screen.findByText(/Carlos Diaz/i)).toBeInTheDocument();

    await userEvent.selectOptions(document.querySelector('select[name="user_id"]'), '9');

    const generateButton = screen.getByRole('button', { name: /Generar Plan Automatico/i });
    await waitFor(() => expect(generateButton).not.toBeDisabled());
    await userEvent.click(generateButton);

    await waitFor(() => expect(globalThis.alert).toHaveBeenCalledWith(expect.stringContaining('Plan generado')));
  });

  it('adds a manual meal and submits a valid plan', async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse([food]))
      .mockImplementationOnce(() => jsonResponse([{ user_id: 9, first_name: 'Carlos', last_name: 'Diaz' }]))
      .mockImplementationOnce(() => jsonResponse([]))
      .mockImplementationOnce(() => jsonResponse({ ok: true }));

    renderWithProviders(<CreateNutritionalPlan />, {
      authValue: {
        user: { ...defaultUser, user_id: 2, role: 'Nutricionista' },
        token: 'token',
        login: vi.fn(),
        logout: vi.fn(),
      },
    });

    expect(await screen.findByText(/Carlos Diaz/i)).toBeInTheDocument();

    fireEvent.change(document.querySelector('select[name="user_id"]'), {
      target: { name: 'user_id', value: '9' },
    });
    fireEvent.change(document.querySelector('input[name="name"]'), {
      target: { name: 'name', value: 'Plan manual' },
    });

    await userEvent.click(screen.getByRole('button', { name: /Agregar Comida/i }));

    fireEvent.change(document.querySelector('select[name="meal_type"]'), {
      target: { name: 'meal_type', value: 'Desayuno' },
    });
    fireEvent.change(document.querySelector('select[name="food_id"]'), {
      target: { name: 'food_id', value: '1' },
    });
    fireEvent.change(document.querySelector('input[name="portion_size"]'), {
      target: { name: 'portion_size', value: '1' },
    });

    await userEvent.click(screen.getByRole('button', { name: /Crear Plan Nutricional/i }));

    await waitFor(() => expect(globalThis.alert).toHaveBeenCalledWith('Plan nutricional creado correctamente'));
  });
});

describe('EnhancedNutritionPlanner', () => {
  const analysis = {
    analysis: {
      daily_requirements: { bmr: 1400, tdee: 2100, rcde: 1900 },
      bmi_analysis: { value: 22, category: 'Peso normal', status: 'normal' },
      goal_analysis: { weeks_estimated: 8, weight_change_needed: -4, feasible: true },
      recommendations: ['Mantener habitos'],
    },
  };

  it('loads options, analysis and generates a plan', async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse([{ type: 'simple', name: 'Simple', description: 'Base' }]))
      .mockImplementationOnce(() => jsonResponse([{ type: 'standard', name: 'Standard', description: 'Mifflin' }]))
      .mockImplementationOnce(() => jsonResponse(analysis))
      .mockImplementationOnce(() => jsonResponse({
        message: 'generado',
        plan_data: {
          name: 'Plan generado',
          type: 'simple',
          target_calories: 1900,
          description: 'Base',
          meals: [{ meal_type: 'Desayuno', target_calories: 475, percentage: 25 }],
        },
      }));

    renderWithProviders(<EnhancedNutritionPlanner />);

    expect(await screen.findByText(/Tu An/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Generar Plan/i }));

    expect(await screen.findByText('Plan generado')).toBeInTheDocument();
  });

  it('compares calculators', async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse([{ type: 'simple', name: 'Simple', description: 'Base' }]))
      .mockImplementationOnce(() => jsonResponse([{ type: 'standard', name: 'Standard', description: 'Mifflin' }]))
      .mockImplementationOnce(() => jsonResponse(analysis))
      .mockImplementationOnce(() => jsonResponse({
        comparison: {
          standard: { requirements: { target_calories: 1900, bmr: 1400 }, macros: { protein_g: 100 } },
          sport: { requirements: { target_calories: 2100, bmr: 1500 }, macros: { protein_g: 130 } },
          differences: { calories: 200, protein_g: 30 },
        },
        recommendation: 'Usa standard',
      }));

    renderWithProviders(<EnhancedNutritionPlanner />);

    await screen.findByText(/Tu An/i);
    await userEvent.click(screen.getByRole('button', { name: /Comparar/i }));

    expect(await screen.findByText(/Usa standard/i)).toBeInTheDocument();
  });
});

describe('FoodLog', () => {
  it('loads the plan for the day and saves entries', async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse([food]))
      .mockImplementationOnce(() => jsonResponse(plan))
      .mockImplementationOnce(() => jsonResponse(planStatus))
      .mockImplementationOnce(() => jsonResponse({}, true, 200))
      .mockImplementationOnce(() => jsonResponse({ ...planStatus, fulfilled_count: 1 }))
      .mockImplementationOnce(() => jsonResponse({ ...planStatus, fulfilled_count: 1 }))
      .mockImplementationOnce(() => jsonResponse({ ...planStatus, fulfilled_count: 1 }));

    renderWithProviders(<FoodLog />);

    expect((await screen.findAllByText(/Plan lunes/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Avena/i)).length).toBeGreaterThan(0);

    await userEvent.type(screen.getByPlaceholderText(/Porci/i), '1');
    await userEvent.click(screen.getByRole('button', { name: /Guardar Registros/i }));

    await waitFor(() => expect(screen.getByText(/registros guardados/i)).toBeInTheDocument());
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(7), { timeout: 1500 });
  });

  it('blocks invalid portions and future date submissions', async () => {
    globalThis.fetch = vi.fn((url) => {
      if (String(url).includes('/foods')) return jsonResponse([food]);
      if (String(url).includes('/by-date/')) return jsonResponse(plan);
      if (String(url).includes('/status/')) return jsonResponse(planStatus);
      return jsonResponse({}, true, 200);
    });

    renderWithProviders(<FoodLog />);

    expect((await screen.findAllByText(/Avena/i)).length).toBeGreaterThan(0);

    await userEvent.type(await screen.findByPlaceholderText(/Porci/i), '2');
    await userEvent.click(screen.getByRole('button', { name: /Guardar Registros/i }));

    await waitFor(() => expect(document.body.textContent).toContain('Solo puedes agregar'));

    fireEvent.change(document.querySelector('input[type="date"]'), {
      target: { value: '2099-01-01' },
    });

    await waitFor(() => expect(document.body.textContent).toContain('fechas futuras'));
  });

  it('shows empty state when there is no plan for the selected date', async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse([food]))
      .mockImplementationOnce(() => jsonResponse({ detail: 'not found' }, false, 404))
      .mockImplementationOnce(() => jsonResponse({ detail: 'not found' }, false, 404));

    renderWithProviders(<FoodLog />);

    expect(await screen.findByText(/No hay plan para esta fecha/i)).toBeInTheDocument();
  });

  it('validates plan ids before deleting a plan', async () => {
    const unsafePlan = { ...plan, plan_id: '../bad' };
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse([food]))
      .mockImplementationOnce(() => jsonResponse(unsafePlan))
      .mockImplementationOnce(() => jsonResponse(planStatus));
    globalThis.fetch = fetchMock;

    renderWithProviders(<FoodLog />);

    expect((await screen.findAllByText(/Plan lunes/i)).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: /Eliminar Plan/i }));

    expect(await screen.findByText(/plan inv/i)).toBeInTheDocument();
    expect(globalThis.confirm).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('deletes plans using encoded safe urls', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse([food]))
      .mockImplementationOnce(() => jsonResponse(plan))
      .mockImplementationOnce(() => jsonResponse(planStatus))
      .mockImplementationOnce(() => jsonResponse({ detail: 'Tiene registros' }, false, 400))
      .mockImplementationOnce(() => jsonResponse({ message: 'Plan eliminado' }))
      .mockImplementationOnce(() => jsonResponse({ detail: 'not found' }, false, 404))
      .mockImplementationOnce(() => jsonResponse({ detail: 'not found' }, false, 404));
    globalThis.fetch = fetchMock;

    renderWithProviders(<FoodLog />);

    expect((await screen.findAllByText(/Plan lunes/i)).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: /Eliminar Plan/i }));

    await waitFor(() => expect(screen.getByText(/Plan eliminado/i)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/nutrition-plans/1',
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/nutrition-plans/1/force',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('MyPlans', () => {
  it('renders week overview and list mode', async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse({
        week_start: '2099-01-01',
        week_end: '2099-01-07',
        days: [
          { date: '2099-01-01', is_today: false, has_plan: true, plan },
          ...Array.from({ length: 6 }, (_, index) => ({
            date: `2099-01-0${index + 2}`,
            is_today: false,
            has_plan: false,
          })),
        ],
      }))
      .mockImplementationOnce(() => jsonResponse([plan]));

    renderWithProviders(<MyPlans />);

    expect(await screen.findByText(/Plan lunes/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ver' }));
    expect(await screen.findByText(/Desayuno:/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Lista' }));

    expect(await screen.findByText(/Balanceado/i)).toBeInTheDocument();
    expect(await screen.findByText(/Porci.n:/i)).toBeInTheDocument();
  });

  it('applies and clears list filters', async () => {
    const fetchMock = vi.fn((url) => {
      if (String(url).includes('week-overview')) {
        return jsonResponse({
          week_start: '2099-01-01',
          week_end: '2099-01-07',
          days: Array.from({ length: 7 }, (_, index) => ({
            date: `2099-01-0${index + 1}`,
            is_today: index === 0,
            has_plan: false,
          })),
        });
      }
      return jsonResponse([plan]);
    });
    globalThis.fetch = fetchMock;

    renderWithProviders(<MyPlans />);

    expect((await screen.findAllByText(/Sin plan/i)).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: 'Lista' }));
    expect(await screen.findByText(/Plan lunes/i)).toBeInTheDocument();

    fireEvent.change(document.querySelector('input[type="date"]'), {
      target: { value: '2099-01-01' },
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('specific_date=2099-01-01'),
      expect.any(Object),
    ));

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('my-plans?'),
      expect.any(Object),
    ));
  });

  it('deletes a plan from the week view and reloads data', async () => {
    const weekOverview = {
      week_start: '2099-01-01',
      week_end: '2099-01-07',
      days: [
        { date: '2099-01-01', is_today: false, has_plan: true, plan },
        ...Array.from({ length: 6 }, (_, index) => ({
          date: `2099-01-0${index + 2}`,
          is_today: false,
          has_plan: false,
        })),
      ],
    };
    globalThis.fetch = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse(weekOverview))
      .mockImplementationOnce(() => jsonResponse({ message: 'Eliminado' }))
      .mockImplementationOnce(() => jsonResponse({ ...weekOverview, days: weekOverview.days.map((day) => ({ ...day, has_plan: false })) }));

    renderWithProviders(<MyPlans />);

    expect(await screen.findByText(/Plan lunes/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(await screen.findByText('Eliminado')).toBeInTheDocument();
  });
});

describe('Profile', () => {
  it('renders client dashboard metrics', async () => {
    globalThis.fetch = vi.fn(() => jsonResponse({
      basic_metrics: {
        user_info: {
          name: 'Ana Lopez',
          age: 32,
          height_cm: 165,
          weight_current: 60,
          weight_goal: 58,
          goal: 'Bajar_Peso',
          activity_level: 'Moderado',
        },
        calculated_metrics: {
          bmi: 22,
          bmi_category: 'Peso normal',
          metabolismo_basal: 1400,
          get: 2100,
          rcde: 1900,
          weight_change_needed: -2,
          weeks_to_goal: 4,
          recommended_exercise_calories: 200,
        },
        macronutrient_targets: {
          protein_kcal: 400,
          protein_g: 100,
          carbs_kcal: 900,
          carbs_g: 225,
          fat_kcal: 600,
          fat_g: 67,
        },
      },
      today_consumption: {
        total_protein: 50,
        total_carbs: 120,
        total_fat: 30,
        by_meal: { Desayuno: 400 },
      },
      caloric_compliance: {
        consumed_calories: 1200,
        target_calories: 1900,
        percentage: 63,
        difference: -700,
      },
      weekly_adherence: {
        adherence_percentage: 80,
        days_with_logs: 4,
        days_elapsed: 5,
      },
      week_daily_consumption: [{ day_name: 'Lun', calories: 1200, target: 1900 }],
    }));

    renderWithProviders(<Profile />);

    expect(await screen.findByText(/Dashboard Nutricional/i)).toBeInTheDocument();
    expect(screen.getByText('Ana Lopez')).toBeInTheDocument();
  });

  it('renders a simple profile for non-client users', () => {
    renderWithProviders(<Profile />, {
      authValue: {
        user: { ...defaultUser, role: 'Administrador' },
        token: 'token',
        login: vi.fn(),
        logout: vi.fn(),
      },
    });

    expect(screen.getByText('Perfil')).toBeInTheDocument();
    expect(screen.getByText(/Administrador/i)).toBeInTheDocument();
  });

  it('renders an unauthenticated state', () => {
    renderWithProviders(<Profile />, {
      authValue: { user: null, token: null, login: vi.fn(), logout: vi.fn() },
    });

    expect(screen.getByText(/No has iniciado sesi/i)).toBeInTheDocument();
  });

  it('renders unavailable metric state when the dashboard request fails', async () => {
    globalThis.fetch = vi.fn(() => jsonResponse({ detail: 'error' }, false, 500));

    renderWithProviders(<Profile />);

    expect(await screen.findByText(/M.tricas no disponibles/i)).toBeInTheDocument();
  });
});
