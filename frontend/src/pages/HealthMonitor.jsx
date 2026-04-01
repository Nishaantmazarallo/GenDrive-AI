import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import axios from 'axios'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import './HealthMonitor.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export default function HealthMonitor() {
  const navigate = useNavigate()
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/health')
      .then(res => {
        setHealth(res.data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching health data:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="loading">Loading health data...</div>
  }

  if (!health) {
    return <div className="error">Error loading health data</div>
  }

  const voltageChart = {
    labels: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'Now'],
    datasets: [{
      label: '12V Battery Voltage',
      data: health.voltage_history,
      borderColor: '#f87171',
      backgroundColor: 'rgba(248, 113, 113, 0.2)',
      tension: 0.35,
      fill: true
    }]
  }

  const chargeChart = {
    labels: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'],
    datasets: [{
      label: 'Battery % After Charge',
      data: health.charging_history.map(ch => ch.to),
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56, 189, 248, 0.25)',
      tension: 0.35,
      fill: true
    }]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        max: 100
      }
    }
  }

  return (
    <div className="health-monitor">
      <h2>🔋 Vehicle Health & Safety Monitor</h2>

      <div className="grid">
        <div className="card">
          <div className="card-title">12V Battery Voltage</div>
          <div className="status critical">{health.voltage.value} V ({health.voltage.status})</div>
        </div>

        <div className="card">
          <div className="card-title">Battery Temperature</div>
          <div className="status critical">{health.battery_temperature.value} °C ({health.battery_temperature.status})</div>
        </div>

        <div className="card">
          <div className="card-title">Motor Temperature</div>
          <div className="status critical">{health.motor_temperature.value} °C ({health.motor_temperature.status})</div>
        </div>

        <div className="card">
          <div className="card-title">Battery Health</div>
          <div className="status critical">{health.battery_health.value}% ({health.battery_health.status})</div>
        </div>

        <div className="card">
          <div className="card-title">Charging Cycles</div>
          <div className="status">{health.charging_cycles} Cycles</div>
        </div>

        <div className="card">
          <div className="card-title">Estimated Battery Life</div>
          <div className="status critical">{health.estimated_life_years} Years Remaining</div>
        </div>

        <div className="card">
          <div className="card-title">AI Health Status</div>
          <div className="status critical">
            ⚠️ Critical Battery Risk — Immediate Service Required
          </div>
        </div>

        <div className="card chart-card">
          <div className="card-title">Voltage Trend (Recent)</div>
          <div className="chart-container">
            <Line data={voltageChart} options={chartOptions} />
          </div>
        </div>

        <div className="card chart-card">
          <div className="card-title">Charging Session Outcome Trend</div>
          <div className="chart-container">
            <Line data={chargeChart} options={chartOptions} />
          </div>
        </div>

        <div className="card charge-history">
          <div className="card-title">Charging History (Last 7 Sessions)</div>
          <div className="history">
            {health.charging_history.map((ch, idx) => (
              <div key={idx}>
                {idx + 1}️⃣ {ch.from}% → {ch.to}% | {ch.time} min
              </div>
            ))}
          </div>
          <div className="status critical" style={{ marginTop: '15px' }}>
            ⚠️ Pattern Detected: Frequent Fast Charging → Accelerated Battery Wear
          </div>
        </div>
      </div>

      <button onClick={() => navigate('/')}>
        ← Back to Trip Planner
      </button>
    </div>
  )
}
