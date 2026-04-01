import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import './CostChart.css'

export default function CostChart({ costData }) {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    if (!costData || !costData.chargers || costData.chargers.length === 0) return

    const ctx = chartRef.current.getContext('2d')

    // Destroy previous chart if exists
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    const chargers = costData.chargers.slice(0, 6) // Top 6 chargers

    const data = {
      labels: chargers.map(c => c.name?.substring(0, 15) + (c.name?.length > 15 ? '...' : '')),
      datasets: [
        {
          label: 'Charging Cost (₹)',
          data: chargers.map(c => c.charging_cost || 0),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: '#22c55e',
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: 'Deviation Cost (₹)',
          data: chargers.map(c => c.deviation_cost || 0),
          backgroundColor: 'rgba(248, 113, 113, 0.8)',
          borderColor: '#f87171',
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: 'Time Cost (₹)',
          data: chargers.map(c => c.time_cost || 0),
          backgroundColor: 'rgba(56, 189, 248, 0.8)',
          borderColor: '#38bdf8',
          borderWidth: 2,
          borderRadius: 6,
        }
      ]
    }

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#e2e8f0',
              padding: 15,
              font: { size: 11 }
            }
          },
          title: {
            display: true,
            text: 'Cost Comparison Across Chargers',
            color: '#e2e8f0',
            font: { size: 14, weight: 'bold' }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#e2e8f0',
            bodyColor: '#cbd5e1',
            borderColor: '#475569',
            borderWidth: 1,
            callbacks: {
              afterBody: function (context) {
                const idx = context[0].dataIndex
                const charger = chargers[idx]
                return [
                  '',
                  `Total: ₹${charger.total_effective_cost}`,
                  charger.comparison || ''
                ]
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            ticks: { color: '#94a3b8', font: { size: 10 } },
            grid: { color: '#334155' }
          },
          y: {
            stacked: true,
            ticks: {
              color: '#94a3b8',
              callback: value => '₹' + value
            },
            grid: { color: '#334155' }
          }
        }
      }
    })

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [costData])

  if (!costData || !costData.chargers || costData.chargers.length === 0) {
    return (
      <div className="cost-chart">
        <h3>📊 Cost Comparison</h3>
        <p className="no-data">No cost data available. Calculate costs from the Trip Planner.</p>
      </div>
    )
  }

  return (
    <div className="cost-chart">
      <h3>📊 Cost Comparison</h3>

      {costData.recommendation && (
        <div className="recommendation-badge">
          <span className="badge-icon">🏆</span>
          <div>
            <strong>Recommended: {costData.recommendation.best_charger}</strong>
            <p>Total Cost: ₹{costData.recommendation.total_cost}</p>
          </div>
        </div>
      )}

      <div className="chart-container">
        <canvas ref={chartRef}></canvas>
      </div>

      <div className="cost-summary">
        <div className="summary-item">
          <span className="label">Trip Distance:</span>
          <span className="value">{costData.trip_distance_km} km</span>
        </div>
        <div className="summary-item">
          <span className="label">Energy Needed:</span>
          <span className="value">{costData.needed_kwh} kWh</span>
        </div>
        <div className="summary-item">
          <span className="label">Time Value:</span>
          <span className="value">₹{costData.value_of_time_per_hour}/hr</span>
        </div>
      </div>

      <div className="cost-breakdown">
        <h4>Cost Breakdown Legend</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="color" style={{ background: '#22c55e' }}></span>
            <span>Charging Cost - Energy consumed at this station</span>
          </div>
          <div className="legend-item">
            <span className="color" style={{ background: '#f87171' }}></span>
            <span>Deviation Cost - Extra distance from route</span>
          </div>
          <div className="legend-item">
            <span className="color" style={{ background: '#38bdf8' }}></span>
            <span>Time Cost - Wait + charging time value</span>
          </div>
        </div>
      </div>
    </div>
  )
}

