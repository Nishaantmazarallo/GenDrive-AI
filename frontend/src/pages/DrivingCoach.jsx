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
import './DrivingCoach.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export default function DrivingCoach() {
  const navigate = useNavigate()
  const [coach, setCoach] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/coach')
      .then(res => {
        setCoach(res.data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching coach data:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="loading">Loading driving coach data...</div>
  }

  if (!coach) {
    return <div className="error">Error loading driving coach data</div>
  }

  const efficiencyChart = {
    labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'Now'],
    datasets: [{
      label: 'Efficiency Score',
      data: coach.efficiency_trend,
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
      tension: 0.3,
      fill: true
    }]
  }

  const speedChart = {
    labels: coach.speed_vs_range.speeds,
    datasets: [{
      label: 'Estimated Range (km)',
      data: coach.speed_vs_range.ranges,
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56, 189, 248, 0.2)',
      tension: 0.3,
      fill: true
    }]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
  }

  return (
    <div className="driving-coach">
      <h2>🚗 AI Driving Coach — Range Optimization</h2>

      <div className="grid">
        <div className="card">
          <div className="card-title">Driving Efficiency Score</div>
          <div className="value">{coach.efficiency_score} / 100</div>
        </div>

        <div className="card">
          <div className="card-title">Driving Style</div>
          <div className="value warn">{coach.driving_style}</div>
        </div>

        <div className="card">
          <div className="card-title">Optimal Speed Zone</div>
          <div className="value">{coach.optimal_speed}</div>
        </div>

        <div className="card">
          <div className="card-title">Regen Braking Efficiency</div>
          <div className="value">{coach.regen_braking_efficiency}%</div>
        </div>

        <div className="card">
          <div className="card-title">Energy Consumption</div>
          <div className="value">{coach.energy_consumption} Wh/km</div>
        </div>

        <div className="card">
          <div className="card-title">Potential Range Gain</div>
          <div className="value">+{coach.potential_range_gain} km (≈ +8%)</div>
        </div>

        <div className="card">
          <div className="card-title">Acceleration Pattern</div>
          <div className="value bad">{coach.acceleration_pattern}</div>
        </div>

        <div className="card">
          <div className="card-title">AI Driving Advice</div>
          <div className="value advice-text">
            {coach.advice}
          </div>
        </div>

        <div className="card chart-card">
          <div className="card-title">Driving Efficiency Trend</div>
          <div className="chart-container">
            <Line data={efficiencyChart} options={chartOptions} />
          </div>
        </div>

        <div className="card chart-card">
          <div className="card-title">Speed vs Range Impact</div>
          <div className="chart-container">
            <Line data={speedChart} options={chartOptions} />
          </div>
        </div>
      </div>

      <button onClick={() => navigate('/')}>
        ← Back to Trip Planner
      </button>
    </div>
  )
}
