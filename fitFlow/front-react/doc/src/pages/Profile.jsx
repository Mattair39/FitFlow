import { useContext, useState, useEffect, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

// Componente de Tooltip explicativo
const InfoTooltip = ({ title, explanation, formula }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <span
        style={{
          cursor: 'help',
          marginLeft: '0.5rem',
          color: '#1976d2',
          fontSize: '0.9rem',
          fontWeight: 'bold'
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        ℹ️
      </span>

      {showTooltip && (
        <div style={{
          position: 'absolute',
          top: '25px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#333',
          color: 'white',
          padding: '1rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 1000,
          width: '300px',
          fontSize: '0.85rem',
          lineHeight: '1.4'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#4fc3f7' }}>
            {title}
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            {explanation}
          </div>
          {formula && (
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              padding: '0.5rem',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.8rem'
            }}>
              <strong>Fórmula:</strong> {formula}
            </div>
          )}
          <div style={{
            position: 'absolute',
            top: '-5px',
            left: '50%',
            width: '10px',
            height: '10px',
            backgroundColor: '#333',
            transform: 'translateX(-50%) rotate(45deg)'
          }}></div>
        </div>
      )}
    </div>
  );
};

// Componente de métrica con tooltip
const MetricCard = ({ icon, title, value, subtitle, color, tooltip }) => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: `2px solid ${color}20`,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: 'pointer'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
  }}>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
      <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>{icon}</span>
      <h3 style={{ margin: 0, color: color, fontSize: '1.1rem' }}>{title}</h3>
      {tooltip && <InfoTooltip {...tooltip} />}
    </div>
    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#333', marginBottom: '0.5rem' }}>
      {value}
    </div>
    {subtitle && (
      <div style={{ fontSize: '0.9rem', color: '#666' }}>
        {subtitle}
      </div>
    )}
  </div>
);

export default function Profile() {
  const { user, token } = useContext(AuthContext);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/dashboard/nutrition-metrics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user?.role === 'Cliente' && token) {
      fetchMetrics();
    } else {
      setLoading(false);
    }
  }, [fetchMetrics, token, user?.role]);

  if (!user) {
    return (
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <h3>No has iniciado sesión.</h3>
      </div>
    );
  }

  if (user.role !== 'Cliente') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
        <div style={{
          padding: '2rem',
          maxWidth: '500px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2>Perfil</h2>
          <p><strong>Nombre:</strong> {user.first_name} {user.last_name}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Cédula:</strong> {user.cedula}</p>
          <p><strong>Rol:</strong> {user.role}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px',
        fontSize: '1.2rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          Cargando métricas nutricionales...
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div style={{
        margin: '2rem',
        padding: '1.5rem',
        backgroundColor: '#e3f2fd',
        borderRadius: '8px',
        border: '1px solid #2196f3'
      }}>
        <h3>⚠️ Métricas no disponibles</h3>
        <p>No se pudieron cargar las métricas. Asegúrate de tener un perfil de cliente configurado.</p>
      </div>
    );
  }

  const { basic_metrics, today_consumption, caloric_compliance, weekly_adherence, week_daily_consumption } = metrics;

  // Colores del tema
  const colors = {
    primary: '#1976d2',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#2196f3',
    purple: '#9c27b0'
  };

  // Definir tooltips explicativos
  const tooltips = {
    bmi: {
      title: "Índice de Masa Corporal (IMC)",
      explanation: "Medida que relaciona tu peso con tu altura para evaluar si estás en un rango de peso saludable.",
      formula: "IMC = peso (kg) / altura (m)²"
    },
    mb: {
      title: "Metabolismo Basal (MB)",
      explanation: "Cantidad mínima de energía que tu cuerpo necesita para mantener funciones vitales en reposo (respiración, circulación, etc.).",
      formula: "Hombres: MB = 10×peso + 6.25×altura - 5×edad + 5\nMujeres: MB = 10×peso + 6.25×altura - 5×edad - 161"
    },
    get: {
      title: "Gasto Energético Total (GET)",
      explanation: "Energía total que gastas en un día, incluyendo metabolismo basal más actividad física.",
      formula: "GET = MB × Factor de Actividad\n(Sedentario: 1.2, Ligero: 1.375, Moderado: 1.55, Intenso: 1.725, Extremo: 1.9)"
    },
    rcde: {
      title: "Requerimiento Calórico Diario Estimado (RCDE)",
      explanation: "Calorías que debes consumir diariamente para alcanzar tu objetivo de peso.",
      formula: "Bajar peso: GET - 500\nMantener: GET\nSubir peso: GET + 300"
    },
    compliance: {
      title: "Cumplimiento Calórico",
      explanation: "Porcentaje de tu objetivo calórico que has consumido hoy. El rango óptimo es 90-110%.",
      formula: "% Cumplimiento = (Calorías consumidas / RCDE) × 100"
    },
    adherence: {
      title: "Adherencia Semanal",
      explanation: "Porcentaje de días de esta semana en los que has registrado al menos una comida.",
      formula: "% Adherencia = (Días con registros / Días transcurridos) × 100"
    }
  };

  const COLORS = ['#FF8042', '#00C49F', '#FFBB28', '#0088FE'];

  // Datos para gráficos
  const macroData = [
    {
      name: 'Proteínas',
      value: today_consumption.total_protein * 4,
      target: basic_metrics.macronutrient_targets.protein_kcal,
      grams: today_consumption.total_protein
    },
    {
      name: 'Carbohidratos',
      value: today_consumption.total_carbs * 4,
      target: basic_metrics.macronutrient_targets.carbs_kcal,
      grams: today_consumption.total_carbs
    },
    {
      name: 'Grasas',
      value: today_consumption.total_fat * 9,
      target: basic_metrics.macronutrient_targets.fat_kcal,
      grams: today_consumption.total_fat
    }
  ];

  const mealData = Object.entries(today_consumption.by_meal).map(([meal, calories]) => ({
    name: meal,
    calories: Math.round(calories)
  }));

  const getComplianceColor = (percentage) => {
    if (percentage >= 90 && percentage <= 110) return colors.success;
    if (percentage < 90) return colors.warning;
    return colors.error;
  };

  return (
      <div style={{
        padding: '1.5rem',
        backgroundColor: '#f8f9fa',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>

        {/* Header */}
        <div style={{
          marginBottom: '2rem',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '2rem',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{margin: 0, fontSize: '2.5rem', fontWeight: '300'}}>
            🏃‍♂️ Dashboard Nutricional
          </h1>
          <p style={{margin: '0.5rem 0 0 0', fontSize: '1.2rem', opacity: 0.9}}>
            {basic_metrics.user_info.name}
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          backgroundColor: 'rgba(255,255,255,0.1)',
          padding: '1.5rem',
          borderRadius: '12px',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem'}}>
              {basic_metrics.user_info.age}
            </div>
            <div style={{fontSize: '0.9rem', opacity: 0.8}}>
              Años
            </div>
          </div>

          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem'}}>
              {basic_metrics.user_info.height_cm} cm
            </div>
            <div style={{fontSize: '0.9rem', opacity: 0.8}}>
              Altura
            </div>
          </div>

          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem'}}>
              {basic_metrics.user_info.weight_current} kg
            </div>
            <div style={{fontSize: '0.9rem', opacity: 0.8}}>
              Peso Actual
            </div>
          </div>

          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem'}}>
              {basic_metrics.user_info.weight_goal} kg
            </div>
            <div style={{fontSize: '0.9rem', opacity: 0.8}}>
              Peso Objetivo
            </div>
          </div>

          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: '1.6rem', fontWeight: 'bold', marginBottom: '0.5rem'}}>
              {basic_metrics.user_info.goal}
            </div>
            <div style={{fontSize: '0.9rem', opacity: 0.8}}>
              Objetivo
            </div>
          </div>

          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: '1.6rem', fontWeight: 'bold', marginBottom: '0.5rem'}}>
              {basic_metrics.user_info.activity_level}
            </div>
            <div style={{fontSize: '0.9rem', opacity: 0.8}}>
              Actividad
            </div>
          </div>
        </div>

        {/* Métricas principales */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>

          <MetricCard
              icon="📊"
              title="IMC"
              value={`${basic_metrics.calculated_metrics.bmi}`}
              subtitle={basic_metrics.calculated_metrics.bmi_category}
              color={colors.info}
              tooltip={tooltips.bmi}
          />

          <MetricCard
              icon="⚡"
              title="Metabolismo Basal"
              value={`${basic_metrics.calculated_metrics.metabolismo_basal}`}
              subtitle="kcal/día en reposo"
              color={colors.purple}
              tooltip={tooltips.mb}
          />

          <MetricCard
              icon="🔥"
              title="Gasto Energético Total"
              value={`${basic_metrics.calculated_metrics.get}`}
              subtitle="kcal/día con actividad"
              color={colors.warning}
              tooltip={tooltips.get}
          />

          <MetricCard
              icon="🎯"
              title="RCDE"
              value={`${basic_metrics.calculated_metrics.rcde}`}
              subtitle="kcal/día objetivo"
              color={colors.primary}
              tooltip={tooltips.rcde}
          />
        </div>

        {/* Métricas de cumplimiento */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>

          {/* Cumplimiento Calórico */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: `2px solid ${getComplianceColor(caloric_compliance.percentage)}20`
          }}>
            <div style={{display: 'flex', alignItems: 'center', marginBottom: '1rem'}}>
              <h3 style={{margin: 0, color: colors.warning}}>🔥 Calorías Hoy</h3>
              <InfoTooltip {...tooltips.compliance} />
            </div>

            <div style={{display: 'flex', alignItems: 'baseline', marginBottom: '1rem'}}>
            <span style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: getComplianceColor(caloric_compliance.percentage)
            }}>
              {caloric_compliance.consumed_calories}
            </span>
              <span style={{fontSize: '1.2rem', marginLeft: '0.5rem', color: '#666'}}>
              / {caloric_compliance.target_calories} kcal
            </span>
            </div>

            <div style={{
              width: '100%',
              height: '12px',
              backgroundColor: '#e0e0e0',
              borderRadius: '6px',
              overflow: 'hidden',
              marginBottom: '1rem'
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(caloric_compliance.percentage, 100)}%`,
                backgroundColor: getComplianceColor(caloric_compliance.percentage),
                transition: 'width 0.8s ease',
                borderRadius: '6px'
              }}></div>
            </div>

            <div style={{
              fontSize: '1.1rem',
              fontWeight: 'bold',
              color: getComplianceColor(caloric_compliance.percentage)
            }}>
              {caloric_compliance.percentage}% del objetivo
            </div>
            <div style={{fontSize: '0.9rem', color: '#666'}}>
              Diferencia: {caloric_compliance.difference > 0 ? '+' : ''}{caloric_compliance.difference} kcal
            </div>
          </div>

          {/* Adherencia Semanal */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: `2px solid ${colors.info}20`
          }}>
            <div style={{display: 'flex', alignItems: 'center', marginBottom: '1rem'}}>
              <h3 style={{margin: 0, color: colors.info}}>📅 Adherencia Semanal</h3>
              <InfoTooltip {...tooltips.adherence} />
            </div>

            <div style={{display: 'flex', alignItems: 'baseline', marginBottom: '1rem'}}>
            <span style={{fontSize: '2.5rem', fontWeight: 'bold', color: colors.info}}>
              {weekly_adherence.adherence_percentage}%
            </span>
            </div>

            <div style={{
              width: '100%',
              height: '12px',
              backgroundColor: '#e0e0e0',
              borderRadius: '6px',
              overflow: 'hidden',
              marginBottom: '1rem'
            }}>
              <div style={{
                height: '100%',
                width: `${weekly_adherence.adherence_percentage}%`,
                backgroundColor: colors.info,
                transition: 'width 0.8s ease',
                borderRadius: '6px'
              }}></div>
            </div>

            <div style={{fontSize: '1rem', color: '#666'}}>
              {weekly_adherence.days_with_logs} de {weekly_adherence.days_elapsed} días con registros
            </div>
          </div>

          {/* Progreso hacia objetivo */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: `2px solid ${colors.success}20`
          }}>
            <h3 style={{margin: '0 0 1rem 0', color: colors.success}}>🎯 Progreso hacia Objetivo</h3>

            <div style={{marginBottom: '1rem'}}>
              <p><strong>Peso actual:</strong> {basic_metrics.user_info.weight_current} kg</p>
              <p><strong>Peso objetivo:</strong> {basic_metrics.user_info.weight_goal} kg</p>
              <p><strong>Faltan:</strong> {Math.abs(basic_metrics.calculated_metrics.weight_change_needed)} kg</p>
            </div>

            <div style={{
              padding: '1rem',
              backgroundColor: '#f0f8ff',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              <p style={{margin: '0 0 0.5rem 0', fontSize: '0.9rem'}}>
                <strong>⏱️ Tiempo estimado:</strong> {basic_metrics.calculated_metrics.weeks_to_goal} semanas
              </p>
              <p style={{margin: 0, fontSize: '0.9rem'}}>
                <strong>🏃‍♂️ Ejercicio
                  recomendado:</strong> {basic_metrics.calculated_metrics.recommended_exercise_calories} kcal/día
              </p>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem'}}>

          {/* Evolución Semanal */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{marginBottom: '1rem', color: colors.primary}}>📈 Evolución Calórica - 7 Días</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={week_daily_consumption}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="day_name" stroke="#666"/>
                <YAxis stroke="#666"/>
                <Tooltip
                    formatter={(value, name) => [
                      `${value} kcal`,
                      name === 'calories' ? 'Consumido' : 'Objetivo'
                    ]}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                />
                <Legend/>
                <Line
                    type="monotone"
                    dataKey="calories"
                    stroke="#8884d8"
                    strokeWidth={3}
                    name="Consumido"
                    dot={{fill: '#8884d8', strokeWidth: 2, r: 5}}
                />
                <Line
                    type="monotone"
                    dataKey="target"
                    stroke="#82ca9d"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    name="Objetivo"
                    dot={{fill: '#82ca9d', strokeWidth: 2, r: 4}}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Macronutrientes */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{marginBottom: '1rem', color: colors.success}}>🥗 Macronutrientes Hoy</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                    data={macroData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({name, value}) => `${name}: ${Math.round(value)} kcal`}
                >
                  {macroData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>
                  ))}
                </Pie>
                <Tooltip
                    formatter={(value) => [`${Math.round(value)} kcal`]}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: '8px'
                    }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráficos adicionales */}
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>

          {/* Distribución por Comidas */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{marginBottom: '1rem', color: colors.warning}}>🍽️ Distribución por Comidas</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={mealData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="name" stroke="#666"/>
                <YAxis stroke="#666"/>
                <Tooltip
                    formatter={(value) => [`${value} kcal`, 'Calorías']}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: '8px'
                    }}
                />
                <Bar dataKey="calories" fill="#8884d8" radius={[4, 4, 0, 0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Objetivos de Macronutrientes detallados */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{marginBottom: '1rem', color: colors.purple}}>🎯 Objetivos de Macronutrientes</h3>

            {[
              {
                name: 'Proteínas',
                consumed: today_consumption.total_protein,
                target: basic_metrics.macronutrient_targets.protein_g,
                color: '#f44336'
              },
              {
                name: 'Carbohidratos',
                consumed: today_consumption.total_carbs,
                target: basic_metrics.macronutrient_targets.carbs_g,
                color: '#ff9800'
              },
              {
                name: 'Grasas',
                consumed: today_consumption.total_fat,
                target: basic_metrics.macronutrient_targets.fat_g,
                color: '#4caf50'
              }
            ].map((macro, index) => {
              const percentage = (macro.consumed / macro.target) * 100;
              return (
                  <div key={index} style={{marginBottom: '1.5rem'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                      <span style={{fontWeight: 'bold'}}>{macro.name}</span>
                      <span style={{fontSize: '0.9rem', color: '#666'}}>
                    {Math.round(macro.consumed)}g / {Math.round(macro.target)}g ({Math.round(percentage)}%)
                  </span>
                    </div>

                    <div style={{
                      width: '100%',
                      height: '10px',
                      backgroundColor: '#e0e0e0',
                      borderRadius: '5px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(percentage, 100)}%`,
                        backgroundColor: macro.color,
                        transition: 'width 0.6s ease',
                        borderRadius: '5px'
                      }}></div>
                    </div>

                    {percentage < 80 && (
                        <div style={{fontSize: '0.8rem', color: macro.color, marginTop: '0.25rem'}}>
                          ⚠️ Por debajo del objetivo
                        </div>
                    )}
                    {percentage > 120 && (
                        <div style={{fontSize: '0.8rem', color: macro.color, marginTop: '0.25rem'}}>
                          🔺 Por encima del objetivo
                        </div>
                    )}
                  </div>
              );
            })}
          </div>
        </div>


      </div>
  );
}
