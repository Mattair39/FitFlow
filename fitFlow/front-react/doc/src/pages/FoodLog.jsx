import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function FoodLog() {
  const { token } = useContext(AuthContext);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [planForDate, setPlanForDate] = useState(null);
  const [planStatus, setPlanStatus] = useState(null);
  const [, setFoods] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchFoods = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:8000/foods", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFoods(data);
      }
    } catch (error) {
      console.error('Error fetching foods:', error);
    }
  }, [token]);

  const fetchPlanForDate = useCallback(async () => {
    if (!selectedDate) return;

    try {
      const response = await fetch(
        `http://localhost:8000/nutrition-plans/by-date/${selectedDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setPlanForDate(data);
      } else if (response.status === 404) {
        setPlanForDate(null);
        setEntries([]);
      }
    } catch (error) {
      console.error('Error fetching plan:', error);
      setPlanForDate(null);
      setEntries([]);
    }
  }, [selectedDate, token]);

  const fetchPlanStatus = useCallback(async () => {
    if (!selectedDate) return;

    try {
      // NUEVO: Agregar timestamp para evitar cache del browser
      const timestamp = new Date().getTime();
      const response = await fetch(
        `http://localhost:8000/nutrition-plans/status/${selectedDate}?t=${timestamp}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache', // Forzar no-cache
            'Pragma': 'no-cache'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Plan status recibido (con timestamp):', data);
        setPlanStatus(data);
      } else {
        setPlanStatus(null);
      }
    } catch (error) {
      console.error('Error fetching plan status:', error);
      setPlanStatus(null);
    }
  }, [selectedDate, token]);

  // MEJORADO: FunciÃ³n para actualizar entries con datos ya consumidos
  const updateEntriesWithConsumedData = useCallback(() => {
    console.log('INICIO updateEntriesWithConsumedData');

    if (!planForDate || !planForDate.meals) {
      console.log('No hay planForDate o meals');
      return;
    }

    if (!planStatus || !planStatus.detail) {
      console.log('No hay planStatus o detail');
      return;
    }

    console.log('Plan meals:', planForDate.meals);
    console.log('Status detail:', planStatus.detail);

    const updatedEntries = planForDate.meals.map((meal, index) => {
      console.log(`Procesando meal ${index}:`, meal);

      // Buscar el estado actual de esta comida en planStatus con diferentes estrategias
      let statusDetail = null;

      // Estrategia 1: Match exacto
      statusDetail = planStatus.detail.find(
        detail => detail.meal_type === meal.meal_type && detail.food_name === meal.food_name
      );

      // Estrategia 2: Case insensitive si no encuentra match exacto
      if (!statusDetail) {
        statusDetail = planStatus.detail.find(
          detail => detail.meal_type?.toLowerCase() === meal.meal_type?.toLowerCase() &&
                    detail.food_name?.toLowerCase() === meal.food_name?.toLowerCase()
        );
      }

      // Estrategia 3: Por food_id si existe
      if (!statusDetail && meal.food_id) {
        statusDetail = planStatus.detail.find(
          detail => detail.food_id === meal.food_id && detail.meal_type === meal.meal_type
        );
      }

      const consumedPortion = statusDetail ? statusDetail.consumed_portion : 0;

      console.log(`Resultado para ${meal.meal_type} - ${meal.food_name}:`);
      console.log(`  Planificado: ${meal.portion_size}`);
      console.log(`  Consumido: ${consumedPortion}`);
      console.log(`  Status encontrado:`, !!statusDetail);

      return {
        food_id: meal.food_id,
        meal_type: meal.meal_type,
        portion_size: "",
        planned_portion: meal.portion_size,
        consumed_portion: consumedPortion,
        food_name: meal.food_name
      };
    });

    console.log('Entries actualizados:', updatedEntries);
    setEntries(updatedEntries);
  }, [planForDate, planStatus]);

  useEffect(() => {
    fetchFoods();
  }, [fetchFoods]);

  useEffect(() => {
    if (selectedDate) {
      fetchPlanForDate();
      fetchPlanStatus();
    }
  }, [fetchPlanForDate, fetchPlanStatus, selectedDate]);

  // MEJORADO: Efecto para actualizar entries cuando cambia el planStatus
  useEffect(() => {
    console.log('useEffect disparado - planForDate:', !!planForDate, 'planStatus:', !!planStatus);
    if (planForDate && planStatus && planStatus.detail) {
      console.log('Condiciones cumplidas, ejecutando updateEntriesWithConsumedData...');
      updateEntriesWithConsumedData();
    } else {
      console.log('Condiciones NO cumplidas para actualizar entries');
    }
  }, [planForDate, planStatus, updateEntriesWithConsumedData]);

  const deletePlan = async (planId, planName, force = false) => {
    const confirmMessage = force
      ? `Â¿EstÃ¡s seguro de que quieres eliminar "${planName}" del ${selectedDate} y TODOS sus registros asociados?`
      : `Â¿EstÃ¡s seguro de que quieres eliminar "${planName}" del ${selectedDate}?`;

    if (!confirm(confirmMessage)) return;

    try {
      const endpoint = force
        ? `http://localhost:8000/nutrition-plans/${planId}/force`
        : `http://localhost:8000/nutrition-plans/${planId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const responseData = await response.json();

      if (response.ok) {
        setMessage(responseData.message);
        fetchPlanForDate();
        fetchPlanStatus();
      } else if (response.status === 400 && !force) {
        const forceDelete = confirm(
          `${responseData.detail}\n\nÂ¿Quieres eliminar el plan junto con todos sus registros?`
        );
        if (forceDelete) {
          deletePlan(planId, planName, true);
        }
      } else {
        setMessage(`Error: ${responseData.detail || 'Error al eliminar el plan'}`);
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      setMessage("Error de conexiÃ³n al eliminar el plan");
    }
  };

  const handleEntryChange = (index, field, value) => {
    const updated = [...entries];
    updated[index][field] = value;
    setEntries(updated);
  };

  // MEJORADO: ValidaciÃ³n que considera lo ya consumido con tolerancia para decimales
  const validatePortionSize = (entryIndex, inputValue) => {
    if (!inputValue || inputValue === "") return null;

    const entry = entries[entryIndex];
    const plannedPortion = parseFloat(entry.planned_portion);
    const alreadyConsumed = parseFloat(entry.consumed_portion || 0);
    const inputPortion = parseFloat(inputValue);

    if (isNaN(inputPortion) || inputPortion < 0) {
      return "Ingresa un nÃºmero vÃ¡lido mayor o igual a 0";
    }

    // NUEVA VALIDACIÃ“N: Verificar que la suma no exceda lo planificado con tolerancia decimal
    const totalAfterInput = alreadyConsumed + inputPortion;
    const tolerance = 0.001; // Tolerancia para errores de precisiÃ³n de punto flotante

    if (totalAfterInput > plannedPortion + tolerance) {
      const remaining = Math.round((plannedPortion - alreadyConsumed) * 1000) / 1000; // Redondear a 3 decimales
      return `Solo puedes agregar ${remaining} mÃ¡s (ya consumiste ${alreadyConsumed}, planificado: ${plannedPortion})`;
    }

    return null; // VÃ¡lido
  };

  // FunciÃ³n para calcular el restante disponible con precisiÃ³n
  const getRemainingPortion = (entry) => {
    const planned = parseFloat(entry.planned_portion);
    const consumed = parseFloat(entry.consumed_portion || 0);
    const remaining = planned - consumed;
    // Redondear a 3 decimales y asegurar que no sea negativo
    return Math.max(0, Math.round(remaining * 1000) / 1000);
  };


  const getPortionDisplay = (planned, consumed) => {
    if (consumed === 0) return `0/${planned}`;
    return `${consumed}/${planned}`;
  };

  const handleSubmit = async () => {
    if (entries.length === 0) {
      setMessage("No hay plan para esta fecha. No se pueden registrar comidas.");
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (selectedDate > today) {
      setMessage("No puedes registrar comidas para fechas futuras. Solo puedes registrar comidas para hoy o fechas pasadas.");
      return;
    }

    // Validar todas las entradas antes de enviar
    const validationErrors = [];
    const validEntries = [];

    entries.forEach((entry, index) => {
      if (entry.portion_size && entry.portion_size > 0) {
        const error = validatePortionSize(index, entry.portion_size);
        if (error) {
          validationErrors.push(`${entry.meal_type} - ${entry.food_name}: ${error}`);
        } else {
          validEntries.push(entry);
        }
      }
    });

    if (validationErrors.length > 0) {
      setMessage(`Errores de validaciÃ³n:\n${validationErrors.join('\n')}`);
      return;
    }

    if (validEntries.length === 0) {
      setMessage("Ingresa al menos una porciÃ³n vÃ¡lida para registrar.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const payload = validEntries.map(entry => ({
        food_id: entry.food_id,
        meal_type: entry.meal_type,
        portion_size: parseFloat(entry.portion_size),
        date: selectedDate
      }));

      const response = await fetch("http://localhost:8000/food-logs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setMessage(`${validEntries.length} registros guardados correctamente para ${selectedDate}`);

        // Actualizar el estado del plan con mÃºltiples estrategias
        console.log('Registro exitoso, actualizando estado...');

        // Estrategia 1: ActualizaciÃ³n inmediata
        await fetchPlanStatus();

        // Estrategia 2: ActualizaciÃ³n con delay mayor
        setTimeout(async () => {
          console.log('Segunda actualizaciÃ³n (500ms delay)...');
          await fetchPlanStatus();

          // Estrategia 3: Forzar actualizaciÃ³n manual
          setTimeout(() => {
            console.log('Tercera actualizaciÃ³n manual...');
            updateEntriesWithConsumedData();
          }, 200);
        }, 500);

        // Estrategia 4: ActualizaciÃ³n final con delay largo
        setTimeout(async () => {
          console.log('ActualizaciÃ³n final (1000ms delay)...');
          await fetchPlanStatus();
        }, 1000);

        // Limpiar los campos de entrada
        const resetEntries = entries.map(entry => ({
          ...entry,
          portion_size: ""
        }));
        setEntries(resetEntries);
      } else {
        const errorData = await response.json();
        setMessage(`Error: ${errorData.detail || 'Error al guardar registros'}`);
      }
    } catch (error) {
      console.error('Error saving entries:', error);
      setMessage("Error de conexiÃ³n al guardar registros");
    } finally {
      setLoading(false);
    }
  };

  const getComplianceColor = (percentage) => {
    if (percentage >= 80 && percentage <= 120) return '#28a745'; // Verde
    if (percentage >= 50) return '#ffc107'; // Amarillo
    return '#dc3545'; // Rojo
  };

  const getComplianceText = (status) => {
    switch (status) {
      case 'completo': return 'âœ“ Completo';
      case 'parcial': return 'â— Parcial';
      case 'pendiente': return 'â—‹ Pendiente';
      default: return status;
    }
  };

  const isFutureDate = () => {
    const today = new Date().toISOString().split('T')[0];
    return selectedDate > today;
  };

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#ff5722',
        color: 'white',
        padding: '2rem',
        borderRadius: '8px',
        textAlign: 'center',
        marginBottom: '2rem'
      }}>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '300' }}>
          Registro Diario de Alimentos
        </h1>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '1rem', opacity: 0.9 }}>
          Registra tu consumo diario siguiendo tu plan nutricional
        </p>
      </div>

      {/* Selector de Fecha */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#495057' }}>
          Seleccionar Fecha
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '1rem',
          alignItems: 'end'
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#495057'
            }}>
              Fecha del plan
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #ced4da',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            />
            {isFutureDate() && (
              <div style={{
                color: '#dc3545',
                fontSize: '0.875rem',
                marginTop: '0.25rem',
                fontWeight: '500'
              }}>
                &#9888;&#65039; No puedes registrar comidas para fechas futuras
              </div>
            )}
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#495057'
            }}>
              Plan disponible
            </label>
            {planForDate ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem',
                backgroundColor: '#e8f5e8',
                border: '2px solid #d4edda',
                borderRadius: '6px'
              }}>
                <div style={{ flex: 1 }}>
                  <strong style={{ color: '#155724' }}>
                    {planForDate.name} ({selectedDate})
                  </strong>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                    {planForDate.meals.length} comidas planificadas
                  </div>
                </div>
                <button
                  onClick={() => deletePlan(planForDate.plan_id, planForDate.name)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  Eliminar Plan
                </button>
              </div>
            ) : (
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#f8d7da',
                border: '2px solid #f5c6cb',
                borderRadius: '6px',
                color: '#721c24'
              }}>
                No hay plan para esta fecha
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mensaje de estado */}
      {message && (
        <div style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          borderRadius: '6px',
          backgroundColor: message.includes('Error') || message.includes('No puedes') ? '#f8d7da' : '#d4edda',
          color: message.includes('Error') || message.includes('No puedes') ? '#721c24' : '#155724',
          border: `1px solid ${message.includes('Error') || message.includes('No puedes') ? '#f5c6cb' : '#c3e6cb'}`,
          whiteSpace: 'pre-line'
        }}>
          {message}
        </div>
      )}

      {/* Estado del Plan */}
      {planStatus && planStatus.total_planned > 0 && (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#495057' }}>
            Estado del Plan: {planStatus.plan_name}
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              padding: '1rem',
              backgroundColor: '#e3f2fd',
              borderRadius: '6px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1976d2' }}>
                {planStatus.fulfilled_count}/{planStatus.total_planned}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                Comidas Cumplidas
              </div>
            </div>

            <div style={{
              padding: '1rem',
              backgroundColor: '#f3e5f5',
              borderRadius: '6px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#7b1fa2' }}>
                {Math.round(planStatus.adherence_percentage)}%
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                Adherencia al Plan
              </div>
            </div>
          </div>

          {/* Detalle de cumplimiento por comida */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem'
          }}>
            {planStatus.detail.map((item, index) => (
              <div key={index} style={{
                padding: '1rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                border: `2px solid ${getComplianceColor(item.compliance_percentage)}`
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <strong style={{ color: '#2c3e50' }}>
                    {item.meal_type}
                  </strong>
                  <span style={{
                    color: getComplianceColor(item.compliance_percentage),
                    fontWeight: 'bold',
                    fontSize: '0.875rem'
                  }}>
                    {getComplianceText(item.status)}
                  </span>
                </div>

                <div style={{ marginBottom: '0.5rem' }}>
                  {item.food_name}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.875rem',
                  color: '#6c757d',
                  marginBottom: '0.5rem'
                }}>
                  <span>Progreso: {getPortionDisplay(item.planned_portion, item.consumed_portion)}</span>
                  <span>{item.compliance_percentage}% cumplido</span>
                </div>

                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#e9ecef',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${Math.min(item.compliance_percentage, 100)}%`,
                    height: '100%',
                    backgroundColor: getComplianceColor(item.compliance_percentage),
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulario de Registro */}
      {planForDate && entries.length > 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          opacity: isFutureDate() ? 0.5 : 1
        }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: '#495057' }}>
            Registrar Consumo para {selectedDate}
            {isFutureDate() && (
              <span style={{ color: '#dc3545', fontSize: '0.9rem', fontWeight: 'normal', display: 'block' }}>
                (No disponible para fechas futuras)
              </span>
            )}
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {entries.map((entry, index) => {
              const validationError = entry.portion_size ? validatePortionSize(index, entry.portion_size) : null;
              const remainingPortion = getRemainingPortion(entry);
              const alreadyConsumed = parseFloat(entry.consumed_portion || 0);

              return (
                <div key={index} style={{
                  padding: '1rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                  border: `1px solid ${validationError ? '#dc3545' : '#e9ecef'}`
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <strong style={{ color: '#2c3e50' }}>
                      {entry.meal_type}
                    </strong>
                    <span style={{
                      fontSize: '0.875rem',
                      color: '#6c757d'
                    }}>
                      Planificado: {entry.planned_portion}
                    </span>
                  </div>

                  <div style={{ marginBottom: '0.5rem', color: '#495057' }}>
                    {entry.food_name}
                  </div>

                  {/* Mostrar informaciÃ³n del consumo actual */}
                  {alreadyConsumed > 0 && (
                    <div style={{
                      backgroundColor: '#e8f5e8',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      marginBottom: '0.5rem',
                      fontSize: '0.875rem'
                    }}>
                      <div style={{ color: '#155724' }}>
                        âœ“ Ya consumiste: {Math.round(alreadyConsumed * 1000) / 1000}
                      </div>
                      <div style={{ color: '#6c757d' }}>
                        Restante disponible: {remainingPortion}
                      </div>
                    </div>
                  )}

                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max={remainingPortion}
                    placeholder={`PorciÃ³n a agregar (mÃ¡ximo: ${remainingPortion})`}
                    value={entry.portion_size}
                    onChange={(e) => handleEntryChange(index, 'portion_size', e.target.value)}
                    disabled={isFutureDate() || remainingPortion <= 0.001}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `2px solid ${validationError ? '#dc3545' : '#ced4da'}`,
                      borderRadius: '4px',
                      fontSize: '1rem',
                      opacity: isFutureDate() || remainingPortion <= 0.001 ? 0.6 : 1,
                      cursor: isFutureDate() || remainingPortion <= 0.001 ? 'not-allowed' : 'text'
                    }}
                  />

                  {remainingPortion <= 0.001 && !isFutureDate() && (
                    <div style={{
                      color: '#28a745',
                      fontSize: '0.8rem',
                      marginTop: '0.25rem',
                      fontWeight: '500'
                    }}>
                      âœ“ Plan completado para esta comida
                    </div>
                  )}

                  {validationError && (
                    <div style={{
                      color: '#dc3545',
                      fontSize: '0.8rem',
                      marginTop: '0.25rem'
                    }}>
                      {validationError}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center' }}>
            <button
              onClick={handleSubmit}
              disabled={loading || isFutureDate()}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: loading || isFutureDate() ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: loading || isFutureDate() ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Guardando...' : isFutureDate() ? 'No disponible para fechas futuras' : 'Guardar Registros'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            color: '#6c757d',
            fontSize: '1.1rem',
            marginBottom: '1rem'
          }}>
            {selectedDate
              ? "No hay plan nutricional para la fecha seleccionada"
              : "Selecciona una fecha para ver el plan nutricional"
            }
          </div>
          {selectedDate && (
            <p style={{
              margin: 0,
              color: '#6c757d',
              fontSize: '0.9rem'
            }}>
              {isFutureDate()
                ? "No puedes registrar comidas para fechas futuras"
                : "Contacta a tu nutricionista para que te asigne un plan para esta fecha"
              }
            </p>
          )}
        </div>
      )}
    </div>
  );
}
