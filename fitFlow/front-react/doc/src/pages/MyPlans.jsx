import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function MyPlans() {
  const { token } = useContext(AuthContext);
  const [plans, setPlans] = useState([]);
  const [weekOverview, setWeekOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [expandedPlan, setExpandedPlan] = useState(null);

  // Estados de filtros
  const [viewMode, setViewMode] = useState("week"); // "week", "list", "month"
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [filters, setFilters] = useState({
    specificDate: "",
    startDate: "",
    endDate: "",
    monthYear: ""
  });

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (filters.specificDate) {
        params.append("specific_date", filters.specificDate);
      } else if (filters.startDate && filters.endDate) {
        params.append("start_date", filters.startDate);
        params.append("end_date", filters.endDate);
      } else if (filters.monthYear) {
        params.append("month_year", filters.monthYear);
      }

      const response = await fetch(
        `http://localhost:8000/nutrition-plans/my-plans?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setPlans(data);
      } else {
        setMessage("Error al cargar los planes");
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      setMessage("Error de conexión al cargar planes");
    } finally {
      setLoading(false);
    }
  }, [filters, token]);

  const fetchWeekOverview = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/nutrition-plans/week-overview?week_offset=${currentWeekOffset}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setWeekOverview(data);
      } else {
        setMessage("Error al cargar la vista semanal");
      }
    } catch (error) {
      console.error('Error fetching week overview:', error);
      setMessage("Error de conexión al cargar vista semanal");
    } finally {
      setLoading(false);
    }
  }, [currentWeekOffset, token]);

  useEffect(() => {
    if (viewMode === "week") {
      fetchWeekOverview();
    } else {
      fetchPlans();
    }
  }, [fetchPlans, fetchWeekOverview, viewMode]);

  const deletePlan = async (planId, planName, planDate, force = false) => {
    const confirmMessage = force
      ? `¿Estás seguro de que quieres eliminar "${planName}" del ${planDate} y TODOS sus registros asociados?`
      : `¿Estás seguro de que quieres eliminar "${planName}" del ${planDate}?`;

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
        // Recargar la vista actual
        if (viewMode === "week") {
          fetchWeekOverview();
        } else {
          fetchPlans();
        }
      } else if (response.status === 400 && !force) {
        const forceDelete = confirm(
          `${responseData.detail}\n\n¿Quieres eliminar el plan junto con todos sus registros?`
        );
        if (forceDelete) {
          deletePlan(planId, planName, planDate, true);
        }
      } else {
        setMessage(`Error: ${responseData.detail || 'Error al eliminar el plan'}`);
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      setMessage("Error de conexión al eliminar el plan");
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value,
      // Limpiar otros filtros cuando se selecciona uno específico
      ...(filterName === 'specificDate' && value ? { startDate: "", endDate: "", monthYear: "" } : {}),
      ...(filterName === 'startDate' && value ? { specificDate: "", monthYear: "" } : {}),
      ...(filterName === 'monthYear' && value ? { specificDate: "", startDate: "", endDate: "" } : {})
    }));
  };

  const clearFilters = () => {
    setFilters({
      specificDate: "",
      startDate: "",
      endDate: "",
      monthYear: ""
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateShort = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getDayName = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long'
    });
  };

  const groupPlansByDate = (plans) => {
    const grouped = plans.reduce((acc, plan) => {
      const date = plan.plan_date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(plan);
      return acc;
    }, {});

    return Object.entries(grouped).sort(([a], [b]) => new Date(b) - new Date(a));
  };

  const toggleExpanded = (planId) => {
    setExpandedPlan(expandedPlan === planId ? null : planId);
  };

  if (loading) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#6c757d'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem'
        }}></div>
        Cargando planes nutricionales...
      </div>
    );
  }

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '1400px',
      margin: '0 auto',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        marginBottom: '2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{
            margin: 0,
            color: '#2c3e50',
            fontSize: '2rem',
            fontWeight: '600'
          }}>
            Mis Planes Nutricionales
          </h1>
          <p style={{
            margin: '0.5rem 0 0 0',
            color: '#6c757d',
            fontSize: '1rem'
          }}>
            Gestiona y revisa tus planes de alimentación por fechas
          </p>
        </div>

        {/* Selector de Vista */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.5rem',
          marginBottom: '1.5rem'
        }}>
          {["week", "list", "month"].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: viewMode === mode ? '#007bff' : '#f8f9fa',
                color: viewMode === mode ? 'white' : '#495057',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              {mode === "week" ? "Vista Semanal" : mode === "list" ? "Lista" : "Mes"}
            </button>
          ))}
        </div>

        {/* Filtros para Vista Lista */}
        {viewMode === "list" && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            alignItems: 'end'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Fecha Específica
              </label>
              <input
                type="date"
                value={filters.specificDate}
                onChange={(e) => handleFilterChange('specificDate', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Desde
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Hasta
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Mes
              </label>
              <input
                type="month"
                value={filters.monthYear}
                onChange={(e) => handleFilterChange('monthYear', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <button
              onClick={clearFilters}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Limpiar
            </button>
          </div>
        )}
      </div>

      {/* Mensaje de estado */}
      {message && (
        <div style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          borderRadius: '6px',
          backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda',
          color: message.includes('Error') ? '#721c24' : '#155724',
          border: `1px solid ${message.includes('Error') ? '#f5c6cb' : '#c3e6cb'}`
        }}>
          {message}
        </div>
      )}

      {/* Vista Semanal */}
      {viewMode === "week" && weekOverview && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {/* Navegación de Semanas */}
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid #e9ecef',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8f9fa'
          }}>
            <button
              onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ← Semana Anterior
            </button>

            <div style={{ textAlign: 'center', fontWeight: '600', color: '#495057' }}>
              {formatDate(weekOverview.week_start)} - {formatDate(weekOverview.week_end)}
              {currentWeekOffset === 0 && (
                <div style={{ fontSize: '0.875rem', color: '#6c757d', fontWeight: 'normal' }}>
                  (Semana Actual)
                </div>
              )}
            </div>

            <button
              onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Semana Siguiente →
            </button>
          </div>

          {/* Días de la Semana */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '1px',
            backgroundColor: '#e9ecef'
          }}>
            {weekOverview.days.map((day, index) => (
              <div
                key={index}
                style={{
                  backgroundColor: 'white',
                  padding: '1rem',
                  minHeight: '150px',
                  position: 'relative',
                  border: day.is_today ? '2px solid #007bff' : 'none'
                }}
              >
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: day.is_today ? '#007bff' : '#495057',
                  marginBottom: '0.5rem'
                }}>
                  {getDayName(day.date)}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#6c757d',
                  marginBottom: '1rem'
                }}>
                  {formatDateShort(day.date)}
                  {day.is_today && (
                    <span style={{
                      marginLeft: '0.5rem',
                      backgroundColor: '#007bff',
                      color: 'white',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.7rem'
                    }}>
                      HOY
                    </span>
                  )}
                </div>

                {day.has_plan ? (
                  <div style={{
                    backgroundColor: '#e8f5e8',
                    padding: '0.75rem',
                    borderRadius: '4px',
                    border: '1px solid #d4edda'
                  }}>
                    <div style={{
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: '#155724',
                      marginBottom: '0.5rem'
                    }}>
                      {day.plan.name}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6c757d',
                      marginBottom: '0.5rem'
                    }}>
                      {day.plan.meals_count} comidas
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '0.25rem',
                      flexWrap: 'wrap'
                    }}>
                      <button
                        onClick={() => toggleExpanded(day.plan.plan_id)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          cursor: 'pointer'
                        }}
                      >
                        {expandedPlan === day.plan.plan_id ? 'Ocultar' : 'Ver'}
                      </button>
                      <button
                        onClick={() => deletePlan(day.plan.plan_id, day.plan.name, day.date.toISOString ? day.date.toISOString().split('T')[0] : day.date)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          cursor: 'pointer'
                        }}
                      >
                        Eliminar
                      </button>
                    </div>

                    {/* Detalles expandidos */}
                    {expandedPlan === day.plan.plan_id && (
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem',
                        backgroundColor: 'white',
                        borderRadius: '3px',
                        border: '1px solid #dee2e6',
                        fontSize: '0.7rem'
                      }}>
                        {day.plan.meals.map((meal, i) => (
                          <div key={i} style={{ marginBottom: '0.25rem' }}>
                            <strong>{meal.meal_type}:</strong> {meal.food_name} ({meal.portion_size})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '0.75rem',
                    borderRadius: '4px',
                    border: '2px dashed #dee2e6',
                    textAlign: 'center',
                    color: '#6c757d',
                    fontSize: '0.8rem'
                  }}>
                    Sin plan
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vista Lista */}
      {viewMode === "list" && (
        <div>
          {plans.length === 0 ? (
            <div style={{
              backgroundColor: 'white',
              padding: '3rem',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                color: '#6c757d',
                fontSize: '1.1rem'
              }}>
                No se encontraron planes para los filtros seleccionados
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {groupPlansByDate(plans).map(([date, datePlans]) => (
                <div key={date} style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  overflow: 'hidden'
                }}>
                  {/* Header de Fecha */}
                  <div style={{
                    padding: '1rem',
                    backgroundColor: '#f8f9fa',
                    borderBottom: '1px solid #e9ecef'
                  }}>
                    <h3 style={{
                      margin: 0,
                      color: '#2c3e50',
                      fontSize: '1.2rem'
                    }}>
                      {formatDate(date)} - {getDayName(date)}
                      {date === new Date().toISOString().split('T')[0] && (
                        <span style={{
                          marginLeft: '1rem',
                          backgroundColor: '#007bff',
                          color: 'white',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.8rem'
                        }}>
                          HOY
                        </span>
                      )}
                    </h3>
                  </div>

                  {/* Planes de esta fecha */}
                  <div style={{ padding: '1rem' }}>
                    {datePlans.map(plan => (
                      <div key={plan.plan_id} style={{
                        padding: '1rem',
                        border: '1px solid #e9ecef',
                        borderRadius: '6px',
                        marginBottom: '1rem'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.5rem'
                        }}>
                          <h4 style={{
                            margin: 0,
                            color: '#495057',
                            fontSize: '1.1rem'
                          }}>
                            {plan.name}
                          </h4>

                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => toggleExpanded(plan.plan_id)}
                              style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '0.875rem',
                                cursor: 'pointer'
                              }}
                            >
                              {expandedPlan === plan.plan_id ? 'Contraer' : 'Ver Detalles'}
                            </button>

                            <button
                              onClick={() => deletePlan(plan.plan_id, plan.name, plan.plan_date)}
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
                              Eliminar
                            </button>
                          </div>
                        </div>

                        {plan.description && (
                          <p style={{
                            margin: '0 0 0.5rem 0',
                            color: '#6c757d',
                            fontSize: '0.9rem'
                          }}>
                            {plan.description}
                          </p>
                        )}

                        <div style={{
                          fontSize: '0.875rem',
                          color: '#6c757d'
                        }}>
                          {plan.meals.length} comidas planificadas
                        </div>

                        {/* Detalles expandidos */}
                        {expandedPlan === plan.plan_id && (
                          <div style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '6px'
                          }}>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                              gap: '1rem'
                            }}>
                              {plan.meals.map((meal, index) => (
                                <div key={index} style={{
                                  padding: '0.75rem',
                                  backgroundColor: 'white',
                                  borderRadius: '4px',
                                  border: '1px solid #e9ecef'
                                }}>
                                  <div style={{
                                    fontWeight: '600',
                                    color: '#2c3e50',
                                    marginBottom: '0.25rem',
                                    fontSize: '0.9rem'
                                  }}>
                                    {meal.meal_type}
                                  </div>
                                  <div style={{
                                    color: '#495057',
                                    marginBottom: '0.25rem'
                                  }}>
                                    {meal.food_name}
                                  </div>
                                  <div style={{
                                    color: '#6c757d',
                                    fontSize: '0.875rem'
                                  }}>
                                    Porción: {meal.portion_size}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
