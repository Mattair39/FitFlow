// fitFlow/front-react/src/pages/EnhancedNutritionPlanner.jsx
import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';

const API_BASE_URL = 'http://localhost:8000';
const CALCULATOR_PATTERN = /^[a-zA-Z0-9_-]+$/;

function getSafeId(value) {
  const numericValue = Number(value);
  return Number.isSafeInteger(numericValue) && numericValue > 0 ? String(numericValue) : null;
}

function getSafeCalculatorType(value) {
  return CALCULATOR_PATTERN.test(value) ? value : 'standard';
}

function buildApiUrl(pathSegments, query = {}) {
  const url = new URL(API_BASE_URL);
  url.pathname = pathSegments.map(segment => encodeURIComponent(segment)).join('/');
  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  return url.toString();
}

export default function EnhancedNutritionPlanner() {
  const { token, user } = useContext(AuthContext);
  const [planTypes, setPlanTypes] = useState([]);
  const [calculatorTypes, setCalculatorTypes] = useState([]);
  const [selectedPlanType, setSelectedPlanType] = useState('simple');
  const [selectedCalculator, setSelectedCalculator] = useState('standard');
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchPlanTypes = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/nutrition-enhanced/plan-types', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPlanTypes(data);
      }
    } catch (error) {
      console.error('Error fetching plan types:', error);
    }
  }, [token]);

  const fetchCalculatorTypes = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/nutrition-enhanced/calculator-types', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCalculatorTypes(data);
      }
    } catch (error) {
      console.error('Error fetching calculator types:', error);
    }
  }, [token]);

  const fetchAnalysis = useCallback(async (calcType = 'standard') => {
    const safeUserId = getSafeId(user?.user_id);
    if (!safeUserId) return;

    try {
      const response = await fetch(
        buildApiUrl(
          ['nutrition-enhanced', 'client', safeUserId, 'analysis'],
          { calculator_type: getSafeCalculatorType(calcType) }
        ),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
    }
  }, [token, user?.user_id]);

  useEffect(() => {
    fetchPlanTypes();
    fetchCalculatorTypes();
    if (user?.role === 'Cliente') {
      fetchAnalysis();
    }
  }, [fetchAnalysis, fetchCalculatorTypes, fetchPlanTypes, user?.role]);

  const generatePlan = async () => {
    if (!user?.user_id) {
      setMessage('Error: Usuario no identificado');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:8000/nutrition-enhanced/generate-plan', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: user.user_id,
          plan_date: planDate,
          plan_type: selectedPlanType,
          calculator_type: selectedCalculator
        })
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedPlan(data);
        setMessage(`✅ ${data.message}`);
      } else {
        const errorData = await response.json();
        setMessage(`❌ Error: ${errorData.detail || 'Error al generar plan'}`);
      }
    } catch (error) {
      setMessage('❌ Error de conexión al generar plan');
      console.error('Error generating plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const compareCalculators = async () => {
    const safeUserId = getSafeId(user?.user_id);
    if (!safeUserId) return;

    setLoading(true);
    try {
      const response = await fetch(
        buildApiUrl(['nutrition-enhanced', 'compare-calculators', safeUserId]),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setComparison(data);
      }
    } catch (error) {
      console.error('Error comparing calculators:', error);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0'
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
    <div style={{
      padding: '2rem',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>

      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '2rem',
        background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
        color: 'white',
        padding: '2rem',
        borderRadius: '16px'
      }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '300' }}>
          Planificador Nutricional Mejorado
        </h1>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.1rem', opacity: 0.9 }}>
          Genera planes optimizados con diferentes métodos de cálculo
        </p>
      </div>

      {/* Configuración del Plan */}
      <div style={cardStyle}>
        <h3 style={{ color: '#333', marginBottom: '1rem' }}>⚙️ Configuración del Plan</h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Método de Cálculo
            </label>
            <select
              value={selectedCalculator}
              onChange={(e) => {
                setSelectedCalculator(e.target.value);
                fetchAnalysis(e.target.value);
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            >
              {calculatorTypes.map(calc => (
                <option key={calc.type} value={calc.type}>
                  {calc.name}
                </option>
              ))}
            </select>
            {calculatorTypes.find(c => c.type === selectedCalculator) && (
              <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                {calculatorTypes.find(c => c.type === selectedCalculator).description}
              </p>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Tipo de Plan
            </label>
            <select
              value={selectedPlanType}
              onChange={(e) => setSelectedPlanType(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            >
              {planTypes.map(plan => (
                <option key={plan.type} value={plan.type}>
                  {plan.name}
                </option>
              ))}
            </select>
            {planTypes.find(p => p.type === selectedPlanType) && (
              <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                {planTypes.find(p => p.type === selectedPlanType).description}
              </p>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Fecha del Plan
            </label>
            <input
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={generatePlan}
            disabled={loading}
            style={{
              ...buttonStyle,
              backgroundColor: loading ? '#ccc' : '#28a745',
              color: 'white'
            }}
          >
            {loading ? 'Generando...' : 'Generar Plan'}
          </button>

          <button
            onClick={compareCalculators}
            disabled={loading}
            style={{
              ...buttonStyle,
              backgroundColor: loading ? '#ccc' : '#17a2b8',
              color: 'white'
            }}
          >
            {loading ? 'Comparando...' : 'Comparar Métodos'}
          </button>
        </div>
      </div>

      {/* Mensaje de estado */}
      {message && (
        <div style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          borderRadius: '8px',
          backgroundColor: message.includes('Error') || message.includes('❌') ? '#ffebee' : '#e8f5e8',
          color: message.includes('Error') || message.includes('❌') ? '#c62828' : '#2e7d32',
          border: `1px solid ${message.includes('Error') || message.includes('❌') ? '#ef5350' : '#66bb6a'}`
        }}>
          {message}
        </div>
      )}

      {/* Análisis Nutricional */}
      {analysis && (
        <div style={cardStyle}>
          <h3 style={{ color: '#333', marginBottom: '1rem' }}>
            Tu Análisis Nutricional
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{
              padding: '1rem',
              backgroundColor: '#e3f2fd',
              borderRadius: '8px',
              border: '1px solid #2196f3'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#1976d2' }}>Requerimientos Diarios</h4>
              <p><strong>Metabolismo Basal:</strong> {analysis.analysis.daily_requirements.bmr} kcal</p>
              <p><strong>Gasto Total:</strong> {analysis.analysis.daily_requirements.tdee} kcal</p>
              <p><strong>Objetivo Diario:</strong> {analysis.analysis.daily_requirements.rcde} kcal</p>
            </div>

            <div style={{
              padding: '1rem',
              backgroundColor: '#e8f5e8',
              borderRadius: '8px',
              border: '1px solid #4caf50'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#388e3c' }}>Estado Físico</h4>
              <p><strong>IMC:</strong> {analysis.analysis.bmi_analysis.value} ({analysis.analysis.bmi_analysis.category})</p>
              <p><strong>Estado:</strong> {analysis.analysis.bmi_analysis.status}</p>
              <p><strong>Rango saludable:</strong> 18.5 - 24.9</p>
            </div>

            <div style={{
              padding: '1rem',
              backgroundColor: '#fff3e0',
              borderRadius: '8px',
              border: '1px solid #ff9800'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#f57c00' }}>Tu Objetivo</h4>
              <p><strong>Tiempo estimado:</strong> {analysis.analysis.goal_analysis.weeks_estimated} semanas</p>
              <p><strong>Cambio necesario:</strong> {Math.abs(analysis.analysis.goal_analysis.weight_change_needed)} kg</p>
              <p><strong>Factible:</strong> {analysis.analysis.goal_analysis.feasible ? 'Sí' : 'Revisar objetivo'}</p>
            </div>
          </div>

          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <h4 style={{ color: '#495057', marginBottom: '0.5rem' }}>Recomendaciones para ti:</h4>
            <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
              {analysis.analysis.recommendations.map((rec, index) => (
                <li key={index} style={{ marginBottom: '0.5rem' }}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Plan Generado */}
      {generatedPlan && (
        <div style={cardStyle}>
          <h3 style={{ color: '#333', marginBottom: '1rem' }}>
             {generatedPlan.plan_data.name}
          </h3>

          <div style={{
            padding: '1rem',
            backgroundColor: '#e8f5e8',
            borderRadius: '8px',
            marginBottom: '1rem',
            border: '1px solid #4caf50'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#388e3c' }}>Plan: {generatedPlan.plan_data.type === 'simple' ? 'Básico' : 'Deportivo'}</h4>
                <p style={{ margin: 0 }}><strong>Objetivo diario:</strong> {generatedPlan.plan_data.target_calories} kcal</p>
              </div>
              <div style={{ fontSize: '3rem' }}>
                {generatedPlan.plan_data.type === 'simple' ? '🍽️' : '🏃‍♂️'}
              </div>
            </div>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>
              {generatedPlan.plan_data.description}
            </p>
            {generatedPlan.plan_data.sport_notes && (
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666', fontStyle: 'italic' }}>
                💡 {generatedPlan.plan_data.sport_notes}
              </p>
            )}
          </div>

          <div>
            <h4 style={{ color: '#495057', marginBottom: '1rem' }}>Distribución de Comidas:</h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              {generatedPlan.plan_data.meals.map((meal, index) => (
                <div key={index} style={{
                  padding: '1rem',
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  border: '2px solid #e9ecef',
                  textAlign: 'center'
                }}>
                  <h5 style={{ margin: '0 0 0.5rem 0', color: '#495057', fontSize: '1.1rem' }}>
                    {meal.meal_type}
                  </h5>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745', marginBottom: '0.5rem' }}>
                    {meal.target_calories} kcal
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>
                    {meal.percentage}% del total
                  </div>
                  {meal.focus && (
                    <div style={{
                      marginTop: '0.5rem',
                      fontSize: '0.8rem',
                      color: '#495057',
                      backgroundColor: '#f8f9fa',
                      padding: '0.25rem',
                      borderRadius: '4px'
                    }}>
                      {meal.focus}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Comparación de Métodos */}
      {comparison && (
        <div style={cardStyle}>
          <h3 style={{ color: '#333', marginBottom: '1rem' }}>
            📊 Comparación de Métodos de Cálculo
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{
              padding: '1rem',
              backgroundColor: '#e3f2fd',
              borderRadius: '8px',
              border: '1px solid #2196f3'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#1976d2' }}>Método Estándar</h4>
              <p><strong>Calorías diarias:</strong> {comparison.comparison.standard.requirements.target_calories} kcal</p>
              <p><strong>Proteínas:</strong> {comparison.comparison.standard.macros.protein_g} g</p>
              <p><strong>Metabolismo basal:</strong> {comparison.comparison.standard.requirements.bmr} kcal</p>
            </div>

            <div style={{
              padding: '1rem',
              backgroundColor: '#f3e5f5',
              borderRadius: '8px',
              border: '1px solid #9c27b0'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#7b1fa2' }}>Método Deportivo</h4>
              <p><strong>Calorías diarias:</strong> {comparison.comparison.sport.requirements.target_calories} kcal</p>
              <p><strong>Proteínas:</strong> {comparison.comparison.sport.macros.protein_g} g</p>
              <p><strong>Metabolismo basal:</strong> {comparison.comparison.sport.requirements.bmr} kcal</p>
            </div>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: '#fff3e0',
            borderRadius: '8px',
            border: '1px solid #ff9800',
            marginBottom: '1rem'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#f57c00' }}>Diferencias</h4>
            <p><strong>Calorías:</strong> {comparison.comparison.differences.calories > 0 ? '+' : ''}{comparison.comparison.differences.calories} kcal más con método deportivo</p>
            <p><strong>Proteínas:</strong> {comparison.comparison.differences.protein_g > 0 ? '+' : ''}{comparison.comparison.differences.protein_g} g más con método deportivo</p>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: '#e8f5e8',
            borderRadius: '8px',
            border: '1px solid #4caf50'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#388e3c' }}>💡 Recomendación para ti</h4>
            <p style={{ margin: 0 }}>{comparison.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}
