import { useState, useEffect } from 'react'
import axios from 'axios'
import './BatteryHealth.css'

export default function BatteryHealth() {
  const [healthData, setHealthData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await axios.get('/api/battery-insights')
        setHealthData(res.data)
      } catch (err) {
        console.error('Error fetching battery health:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchHealth()
  }, [])

  if (loading) return <div className="loading">Analyzing Battery Cells... 🔋</div>

  return (
    <div className="battery-health">
      <header className="health-header">
        <h1>🔋 EV Battery AI Diagnostics</h1>
        <p>Real-time cell analysis & State of Health (SOH) monitoring</p>
      </header>

      <div className="health-main-grid">
        <div className="card status-card">
          <h3>State of Health (SOH)</h3>
          <div className="gauge-container">
            <div className="gauge">
              <div className="gauge-fill" style={{ width: `${healthData?.soh}%`, background: healthData?.soh > 90 ? '#22c55e' : '#eab308' }}></div>
            </div>
            <span className="gauge-value">{healthData?.soh}%</span>
          </div>
          <p className="status-note">Your battery is in <b>{healthData?.soh > 90 ? 'Excellent' : 'Good'}</b> condition.</p>
          <div className="stats-mini">
            <div className="stat">
              <span>Cycles</span>
              <b>{healthData?.cycles}</b>
            </div>
            <div className="stat">
              <span>Est. Life</span>
              <b>{healthData?.projected_life_years} Years</b>
            </div>
          </div>
        </div>

        <div className="card efficiency-card">
          <h3>Efficiency Insights</h3>
          <div className="efficiency-value">
            <span className="val">{healthData?.efficiency_insights.avg_efficiency}</span>
            <span className="unit">Wh/km</span>
          </div>
          <p>Trend: <span className="trend-up">↑ {healthData?.efficiency_insights.trend}</span></p>
          <div className="best-trip">
            Best Trip: <b>{healthData?.efficiency_insights.best_trip_efficiency} Wh/km</b>
          </div>
        </div>
      </div>

      <div className="factors-section">
        <h3>Health Impact Factors</h3>
        <div className="factors-grid">
          {healthData?.health_factors.map((f, i) => (
            <div key={i} className={`factor-card ${f.impact.toLowerCase()}`}>
              <div className="factor-header">
                <h4>{f.factor}</h4>
                <span className="impact-tag">{f.impact}</span>
              </div>
              <div className="factor-value">{f.value}</div>
              <p className="advice">{f.advice}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="ai-recommendations card">
        <h3>💡 AI Pro-Tips for Longevity</h3>
        <ul>
          <li>Keep battery between <b>20% and 80%</b> for daily use.</li>
          <li>Avoid frequent <b>Ultra-Fast DC charging</b> (over 100kW) when not needed.</li>
          <li>Pre-condition your battery in <b>extreme temperatures</b> before charging.</li>
          <li>Accelerate smoothly to reduce high-current stress on battery cells.</li>
        </ul>
      </div>
    </div>
  )
}
