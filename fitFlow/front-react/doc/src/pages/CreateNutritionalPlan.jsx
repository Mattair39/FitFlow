import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function CreateNutritionalPlan() {
  const { token, user } = useContext(AuthContext);
  const [foods, setFoods] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    user_id: "",
    nutritionist_id: user ? user.user_id : "",
    name: "",
    description: "",
    plan_date: new Date().toISOString().split('T')[0], // Fecha por defecto: hoy
    meals: []
  });
  const [errors, setErrors] = useState({});
  const [existingPlan, setExistingPlan] = useState(null);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  const fetchInitialData = useCallback(async () => {
    try {
      const [foodsRes, clientsRes] = await Promise.all([
        fetch("http://localhost:8000/foods", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("http://localhost:8000/auth/clients", { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (foodsRes.ok) {
        const foodsData = await foodsRes.json();
        setFoods(foodsData);
      }

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [token]);

  const checkExistingPlan = useCallback(async () => {
    if (!form.user_id || !form.plan_date) return;

    setCheckingExisting(true);
    try {
      const response = await fetch(
        `http://localhost:8000/nutrition-plans/my-plans?specific_date=${form.plan_date}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        const plans = await response.json();
        const existingForUser = plans.find(p => p.user_id === parseInt(form.user_id));
        setExistingPlan(existingForUser || null);
      }
    } catch (error) {
      console.error('Error checking existing plan:', error);
    } finally {
      setCheckingExisting(false);
    }
  }, [form.plan_date, form.user_id, token]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    // Verificar si ya existe un plan para la fecha seleccionada
    if (form.user_id && form.plan_date) {
      checkExistingPlan();
    }
  }, [checkExistingPlan, form.user_id, form.plan_date]);

  const addMeal = () => {
    setForm({
      ...form,
      meals: [...form.meals, { food_id: "", meal_type: "", portion_size: "" }]
    });
  };

  const removeMeal = (index) => {
    setForm({
      ...form,
      meals: form.meals.filter((_, i) => i !== index)
    });
  };

  const handleMealChange = (i, e) => {
    const updated = [...form.meals];
    updated[i][e.target.name] = e.target.value;
    setForm({ ...form, meals: updated });

    // Limpiar errores específicos del meal
    if (errors[`meal_${i}_${e.target.name}`]) {
      setErrors({ ...errors, [`meal_${i}_${e.target.name}`]: null });
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });

    // Limpiar errores del campo
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

   const generateAIPlan = async () => {
    if (!form.user_id || !form.plan_date) {
      alert("Selecciona un cliente y fecha primero");
      return;
    }

    setGeneratingAI(true);
    try {
      const response = await fetch("http://localhost:8000/nutrition-optimizer/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: parseInt(form.user_id),
          plan_date: form.plan_date
        })
      });

      if (response.ok) {
        const data = await response.json();

        // Actualizar el formulario con el plan generado
        setForm(prev => ({
          ...prev,
          name: data.plan_data.name,
          description: data.plan_data.description,
          meals: data.plan_data.meals
        }));

        alert(`✅ Plan generado exitosamente!\n\n📊 Estadísticas:\n• Objetivo: ${data.statistics.target_calories} kcal\n• Generado: ${data.statistics.generated_calories} kcal\n• Precisión: ${data.statistics.accuracy_percentage}%\n• Comidas: ${data.statistics.meal_count}\n\nRevisa el plan y guárdalo cuando estés listo.`);

      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.detail || 'Error al generar plan'}`);
      }
    } catch (error) {
      console.error('Error generating AI plan:', error);
      alert("Error de conexión al generar plan");
    } finally {
      setGeneratingAI(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validaciones básicas
    if (!form.user_id) newErrors.user_id = "Selecciona un cliente";
    if (!form.name.trim()) newErrors.name = "El nombre es obligatorio";
    if (!form.plan_date) newErrors.plan_date = "La fecha es obligatoria";
    if (form.meals.length === 0) newErrors.meals = "Agrega al menos una comida";

    // Validar que la fecha no sea anterior a hoy
    const today = new Date().toISOString().split('T')[0];
    if (form.plan_date < today) {
      newErrors.plan_date = "La fecha no puede ser anterior a hoy";
    }

    // Validar cada comida
    form.meals.forEach((meal, i) => {
      if (!meal.food_id) newErrors[`meal_${i}_food_id`] = "Selecciona un alimento";
      if (!meal.meal_type) newErrors[`meal_${i}_meal_type`] = "Selecciona el tipo de comida";
      if (!meal.portion_size || meal.portion_size <= 0) {
        newErrors[`meal_${i}_portion_size`] = "Ingresa una porción válida";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (existingPlan) {
      if (!confirm(`Ya existe un plan para el ${form.plan_date}. ¿Quieres continuar? Esto podría crear conflictos.`)) {
        return;
      }
    }

    try {
      const response = await fetch("http://localhost:8000/nutrition-plans", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      if (response.ok) {
        alert("Plan nutricional creado correctamente");
        // Reset form
        setForm({
          user_id: "",
          nutritionist_id: user.user_id,
          name: "",
          description: "",
          plan_date: new Date().toISOString().split('T')[0],
          meals: []
        });
        setExistingPlan(null);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.detail || 'Error al crear plan'}`);
      }
    } catch (error) {
      console.error('Error creating plan:', error);
      alert("Error de conexión al crear plan");
    }
  };

  const containerStyle = {
    padding: '2rem',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  };

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '2px solid #e0e0e0',
    fontSize: '1rem',
    transition: 'border-color 0.2s ease'
  };

  const selectStyle = {
    ...inputStyle,
    backgroundColor: 'white',
    cursor: 'pointer'
  };

  const buttonStyle = {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '2rem',
        background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
        color: 'white',
        padding: '2rem',
        borderRadius: '16px'
      }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '300' }}>
          📋 Crear Plan Nutricional
        </h1>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.1rem', opacity: 0.9 }}>
          Diseña un plan personalizado para una fecha específica
        </p>
      </div>

      {/* Información Básica del Plan */}
      <div style={cardStyle}>
        <h3 style={{ marginBottom: '1rem', color: '#333' }}>📝 Información del Plan</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.9rem', color: '#666', display: 'block', marginBottom: '0.5rem' }}>
              Cliente *
            </label>
            <select
              name="user_id"
              value={form.user_id}
              onChange={handleChange}
              style={{
                ...selectStyle,
                borderColor: errors.user_id ? '#f44336' : '#e0e0e0'
              }}
            >
              <option value="">-- Selecciona un cliente --</option>
              {clients.map(c => (
                <option key={c.user_id} value={c.user_id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
            {errors.user_id && (
              <div style={{ color: '#f44336', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                {errors.user_id}
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.9rem', color: '#666', display: 'block', marginBottom: '0.5rem' }}>
              Fecha del Plan *
            </label>
            <input
              type="date"
              name="plan_date"
              value={form.plan_date}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              style={{
                ...inputStyle,
                borderColor: errors.plan_date ? '#f44336' : '#e0e0e0'
              }}
            />
            {errors.plan_date && (
              <div style={{ color: '#f44336', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                {errors.plan_date}
              </div>
            )}
          </div>
        </div>

        {/* Alerta de plan existente */}
        {checkingExisting && (
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#e3f2fd',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            🔍 Verificando planes existentes...
          </div>
        )}

        {existingPlan && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#fff3cd',
            borderRadius: '8px',
            border: '1px solid #ffc107',
            marginBottom: '1rem'
          }}>
            <strong>⚠️ Plan existente encontrado:</strong><br />
            Ya existe el plan "{existingPlan.name}" para esta fecha.
            Solo se permite un plan por día por cliente.
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.9rem', color: '#666', display: 'block', marginBottom: '0.5rem' }}>
            Nombre del Plan *
          </label>
          <input
            name="name"
            placeholder="Ej: Plan de Aumento de Masa - Lunes"
            value={form.name}
            onChange={handleChange}
            style={{
              ...inputStyle,
              borderColor: errors.name ? '#f44336' : '#e0e0e0'
            }}
          />
          {errors.name && (
            <div style={{ color: '#f44336', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              {errors.name}
            </div>
          )}
        </div>

        <div>
          <label style={{ fontSize: '0.9rem', color: '#666', display: 'block', marginBottom: '0.5rem' }}>
            Descripción (opcional)
          </label>
          <textarea
            name="description"
            placeholder="Descripción detallada del plan..."
            value={form.description}
            onChange={handleChange}
            rows={3}
            style={{
              ...inputStyle,
              resize: 'vertical'
            }}
          />
        </div>
      </div>

      {/* Comidas del Plan */}
      <div style={cardStyle}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <h3 style={{margin: 0, color: '#333'}}>Comidas del Plan</h3>

          <div style={{display: 'flex', gap: '0.5rem'}}>
            {/* Botón IA */}
            <button
                onClick={generateAIPlan}
                disabled={generatingAI || !form.user_id || !form.plan_date}
                style={{
                  ...buttonStyle,
                  backgroundColor: generatingAI ? '#999' : '#9C27B0',
                  color: 'white',
                  fontSize: '0.9rem',
                  padding: '10px 16px'
                }}
                title="Genera automáticamente un plan nutricional balanceado"
            >
              {generatingAI ? '⏳ Generando...' : 'Generar Plan Automatico'}
            </button>

            {/* Botón manual */}
            <button
                onClick={addMeal}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#4CAF50',
                  color: 'white'
                }}
            >
              ➕ Agregar Comida
            </button>
          </div>
        </div>


        {errors.meals && (
            <div style={{
              color: '#f44336',
              fontSize: '0.9rem',
              marginBottom: '1rem',
              padding: '0.75rem',
              backgroundColor: '#ffebee',
              borderRadius: '6px'
            }}>
              {errors.meals}
            </div>
        )}

        {form.meals.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              color: '#666'
            }}>
              <div style={{fontSize: '2rem', marginBottom: '1rem'}}>🍽️</div>
              <p>No hay comidas agregadas. Haz clic en "Agregar Comida" para empezar.</p>
            </div>
        ) : (
            form.meals.map((meal, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 2fr 1fr auto',
                  gap: '1rem',
                  alignItems: 'end',
                  marginBottom: '1rem',
                  padding: '1rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0'
                }}>
                  <div>
                    <label style={{fontSize: '0.9rem', color: '#666', display: 'block', marginBottom: '0.5rem'}}>
                      Tipo de Comida *
                    </label>
                    <select
                        name="meal_type"
                        value={meal.meal_type}
                        onChange={(e) => handleMealChange(i, e)}
                        style={{
                          ...selectStyle,
                          borderColor: errors[`meal_${i}_meal_type`] ? '#f44336' : '#e0e0e0'
                        }}
                    >
                      <option value="">-- Selecciona --</option>
                      {["Desayuno", "Almuerzo", "Cena", "Snack"].map(t => (
                          <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {errors[`meal_${i}_meal_type`] && (
                        <div style={{color: '#f44336', fontSize: '0.8rem', marginTop: '0.25rem'}}>
                          {errors[`meal_${i}_meal_type`]}
                        </div>
                    )}
                  </div>

                  <div>
                    <label style={{fontSize: '0.9rem', color: '#666', display: 'block', marginBottom: '0.5rem'}}>
                      Alimento *
                    </label>
                    <select
                        name="food_id"
                        value={meal.food_id}
                        onChange={(e) => handleMealChange(i, e)}
                        style={{
                          ...selectStyle,
                          borderColor: errors[`meal_${i}_food_id`] ? '#f44336' : '#e0e0e0'
                        }}
                    >
                      <option value="">-- Selecciona --</option>
                      {foods.map(f => (
                          <option key={f.food_id} value={f.food_id}>{f.name}</option>
                      ))}
                    </select>
                    {errors[`meal_${i}_food_id`] && (
                        <div style={{color: '#f44336', fontSize: '0.8rem', marginTop: '0.25rem'}}>
                          {errors[`meal_${i}_food_id`]}
                        </div>
                    )}
                  </div>

                  <div>
                    <label style={{fontSize: '0.9rem', color: '#666', display: 'block', marginBottom: '0.5rem'}}>
                      Porciones *
                    </label>
                    <input
                        name="portion_size"
                        type="number"
                        step="0.1"
                        min="0.1"
                        placeholder="1.0"
                        value={meal.portion_size}
                        onChange={(e) => handleMealChange(i, e)}
                        style={{
                          ...inputStyle,
                          borderColor: errors[`meal_${i}_portion_size`] ? '#f44336' : '#e0e0e0'
                        }}
                    />
                    {errors[`meal_${i}_portion_size`] && (
                        <div style={{color: '#f44336', fontSize: '0.8rem', marginTop: '0.25rem'}}>
                          {errors[`meal_${i}_portion_size`]}
                        </div>
                    )}
                  </div>

                  <button
                      onClick={() => removeMeal(i)}
                      style={{
                        ...buttonStyle,
                        backgroundColor: '#f44336',
                        color: 'white',
                        padding: '12px'
                      }}
                      title="Eliminar comida"
                  >
                    🗑️
                  </button>
                </div>
            ))
        )}
      </div>

      {/* Botones de Acción */}
      <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
        <button
            onClick={() => setForm({
              user_id: "",
              nutritionist_id: user.user_id,
              name: "",
              description: "",
              plan_date: new Date().toISOString().split('T')[0],
              meals: []
            })}
            style={{
              ...buttonStyle,
              backgroundColor: '#757575',
              color: 'white'
            }}
        >
          🔄 Limpiar Formulario
        </button>

        <button
            onClick={handleSubmit}
            disabled={existingPlan && !confirm}
            style={{
              ...buttonStyle,
              backgroundColor: existingPlan ? '#ff9800' : '#2196F3',
              color: 'white',
              fontSize: '1.1rem',
              padding: '14px 28px'
            }}
        >
          {existingPlan ? '⚠️ Crear de Todas Formas' : '✅ Crear Plan Nutricional'}
        </button>
      </div>
    </div>
  );
}
