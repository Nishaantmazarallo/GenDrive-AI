import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import axios from 'axios'
import CostChart from './CostChart'
import './TripPlanner.css'

const FULL_RANGE = 550
const BUFFER = 15

export default function TripPlanner() {
  const navigate = useNavigate()
  const [battery, setBattery] = useState(85)
  const [range, setRange] = useState(0)
  const [vehicleInfo, setVehicleInfo] = useState(null)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [startSuggestions, setStartSuggestions] = useState([])
  const [endSuggestions, setEndSuggestions] = useState([])
  const [tripResult, setTripResult] = useState('')
  
  // Route chargers state
  const [startCoords, setStartCoords] = useState(null)
  const [endCoords, setEndCoords] = useState(null)
  const [routeChargers, setRouteChargers] = useState([])
  const [routeDistance, setRouteDistance] = useState(0)
  const [loadingChargers, setLoadingChargers] = useState(false)
  const [sortBy, setSortBy] = useState('score') // score, price, reliability, distance
  const [showChargersPanel, setShowChargersPanel] = useState(false)
  const [selectedCharger, setSelectedCharger] = useState(null)
  
  const [vehicleType, setVehicleType] = useState('CAR')
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const routeLine = useRef(null)
  const chargerMarkers = useRef([])

  useEffect(() => {
    // Initialize map
    mapInstance.current = L.map(mapRef.current).setView([20.59, 78.96], 5)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance.current)

    // Fetch vehicle data
    axios.get(`/api/vehicle?type=${vehicleType}`)
      .then(res => {
        setVehicleInfo(res.data)
        // Set initial battery from API if it's the first load
        if (battery === 85) { // default value
          setBattery(Math.round(res.data.battery_percent))
        }
        const profileRange = res.data.estimated_range_km / (res.data.battery_percent / 100)
        setRange(Math.round((battery / 100) * profileRange))
      })
      .catch(err => console.error('Error fetching vehicle data:', err))

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
      }
    }
  }, [vehicleType])

  useEffect(() => {
    if (vehicleInfo) {
      const profileMaxRange = vehicleInfo.estimated_range_km / (vehicleInfo.battery_percent / 100)
      setRange(Math.round((battery / 100) * profileMaxRange))
    }
  }, [battery])

  const autoSearch = async (query, isStart) => {
    if (query.length < 2) {
      isStart ? setStartSuggestions([]) : setEndSuggestions([])
      return
    }

    try {
      const res = await axios.get(`/api/geocode`, { params: { q: query } })
      isStart ? setStartSuggestions(res.data) : setEndSuggestions(res.data)
    } catch (err) {
      console.error('Search error:', err)
    }
  }

  const selectPlace = (displayName, isStart) => {
    if (isStart) {
      setStart(displayName)
      setStartSuggestions([])
    } else {
      setEnd(displayName)
      setEndSuggestions([])
    }
  }

  const clearChargerMarkers = () => {
    chargerMarkers.current.forEach(m => mapInstance.current.removeLayer(m))
    chargerMarkers.current = []
  }

  const displayChargers = (chargers) => {
    clearChargerMarkers()
    chargers.forEach(c => {
      const color = c.fast ? '#ff4444' : (c.reliability >= 0.9 ? '#22c55e' : '#f97316')
      const marker = L.circleMarker([c.lat, c.lon], { radius: 10, color, fillColor: color, fillOpacity: 0.8 })
        .addTo(mapInstance.current)
      
      const popupHTML = `
        <div style="font-size:12px;">
          <b>${c.name}</b><br/>
          💰 ₹${c.price_per_kwh?.toFixed(2) || 'N/A'}/kWh<br/>
          🔌 ${c.connections || 'N/A'}<br/>
          ⚡ ${c.fast ? 'Fast' : 'Standard'}<br/>
          <div style="margin-top:5px; padding-top:5px; border-top:1px solid #444;">
            ${c.amenities?.map(a => `<span title="${a.label}" style="margin-right:5px;">${a.icon}</span>`).join('') || ''}
            ${c.family_friendly ? '<span title="Family Friendly">👨‍👩‍👧‍👦</span>' : ''}
          </div>
          📊 Reliability: ${Math.round(c.reliability * 100)}%<br/>
          📏 Route distance: ${c.distance_to_route_km?.toFixed(1)}km
        </div>
      `
      marker.bindPopup(popupHTML)
      marker.on('click', () => setSelectedCharger(c))
      chargerMarkers.current.push(marker)
    })
  }

  const fetchChargersOnRoute = async () => {
    if (!startCoords || !endCoords) {
      alert('Please plan a trip first')
      return
    }

    setLoadingChargers(true)
    try {
      const res = await axios.get('/api/route-chargers', {
        params: {
          start_lat: startCoords.lat,
          start_lon: startCoords.lon,
          end_lat: endCoords.lat,
          end_lon: endCoords.lon
        }
      })

      setRouteChargers(res.data.chargers || [])
      if (res.data.route && res.data.route.coordinates) {
        setRouteDistance(res.data.total_distance_km)
        displayChargers(res.data.chargers || [])
        setShowChargersPanel(true)
        
        // Save trip data for AI Assistant
        localStorage.setItem('genDriveTrip', JSON.stringify({
          distance: res.data.total_distance_km,
          chargers: res.data.chargers || []
        }))
      }
    } catch (err) {
      console.error('Error fetching route chargers:', err)
      alert('Error loading chargers for this route')
    }
    setLoadingChargers(false)
  }

  const getSortedChargers = () => {
    let sorted = [...routeChargers]
    switch(sortBy) {
      case 'price':
        sorted.sort((a, b) => (a.price_per_kwh || 999) - (b.price_per_kwh || 999))
        break
      case 'reliability':
        sorted.sort((a, b) => b.reliability - a.reliability)
        break
      case 'distance':
        sorted.sort((a, b) => a.distance_to_route_km - b.distance_to_route_km)
        break
      default:
        sorted.sort((a, b) => a.score - b.score)
    }
    return sorted
  }

  const planTrip = async () => {
    if (!start || !end) {
      alert('Please enter both locations')
      return
    }

    try {
      // Get coordinates
      const startRes = await axios.get('/api/geocode', { params: { q: start } })
      const startData = startRes.data

      const endRes = await axios.get('/api/geocode', { params: { q: end } })
      const endData = endRes.data

      if (startData.length === 0 || endData.length === 0) {
        alert('Could not find locations')
        return
      }

      const startLat = startData[0].lat
      const startLon = startData[0].lon
      const endLat = endData[0].lat
      const endLon = endData[0].lon

      setStartCoords({ lat: startLat, lon: startLon })
      setEndCoords({ lat: endLat, lon: endLon })

      // Get route
      const routeRes = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`
      )
      const routeData = await routeRes.json()

      if (routeData.routes.length === 0) {
        alert('Could not find route')
        return
      }

      const coords = routeData.routes[0].geometry.coordinates
      const totalDistance = routeData.routes[0].distance / 1000

      const latlngs = coords.map(c => [c[1], c[0]])

      if (routeLine.current) {
        mapInstance.current.removeLayer(routeLine.current)
      }

      routeLine.current = L.polyline(latlngs, {
        color: 'blue',
        weight: 4
      }).addTo(mapInstance.current)

      mapInstance.current.fitBounds(routeLine.current.getBounds())

      // Calculate charging
      const batteryNum = parseInt(battery)
      const usableRange = ((batteryNum - BUFFER) / 100) * FULL_RANGE
      
      let stops = Math.max(0, Math.ceil(totalDistance / usableRange) - 1)
      if (totalDistance > 150) {
        stops = 3
      }

      let instructions = `Distance: ${totalDistance.toFixed(1)} km\n\n`
      instructions += `Usable Range per Charge: ${usableRange.toFixed(0)} km\n\n`
      instructions += `Charging Stops Required: ${stops}\n\n`

      if (stops > 0) {
        try {
          // Fetch real chargers on route
          const chargersRes = await axios.get('/api/route-chargers', {
            params: {
              start_lat: startLat,
              start_lon: startLon,
              end_lat: endLat,
              end_lon: endLon
            }
          })
          const allChargers = chargersRes.data.chargers || []
          
          instructions += 'Recommended Real Charging Stops:\n'
          
          for (let i = 1; i <= stops; i++) {
            const progress = i / (stops + 1)
            const targetIdx = Math.floor(coords.length * progress)
            const targetLat = coords[targetIdx][1]
            const targetLon = coords[targetIdx][0]
            
            // Find closest real charger to this point on route
            let bestCharger = null
            let minDist = Infinity
            
            allChargers.forEach(c => {
              const d = Math.sqrt(Math.pow(c.lat - targetLat, 2) + Math.pow(c.lon - targetLon, 2))
              if (d < minDist) {
                minDist = d
                bestCharger = c
              }
            })

            if (bestCharger) {
              const popupContent = `
                <div style="font-family: inherit; padding: 5px;">
                  <strong style="color: #22c55e;">⚡ Stop ${i}: ${bestCharger.name}</strong><br/>
                  <span style="color: #f97316; font-size: 0.9em;">${bestCharger.network}</span><br/>
                  <div style="margin-top: 5px; border-top: 1px solid #444; pt-2;">
                    💰 <b>₹${bestCharger.price_per_kwh?.toFixed(2) || 'N/A'}/kWh</b><br/>
                    🔌 ${bestCharger.connections || 'Unknown'}
                  </div>
                </div>
              `;
              L.marker([bestCharger.lat, bestCharger.lon])
                .addTo(mapInstance.current)
                .bindPopup(popupContent)
              
              instructions += `Stop ${i}: ${bestCharger.name} (${bestCharger.network})\n`
              instructions += `   💰 Price: ₹${bestCharger.price_per_kwh?.toFixed(2) || 'N/A'}/kWh\n`
              instructions += `   🔌 Connector: ${bestCharger.connections || 'Unknown'}\n\n`
            } else {
              // Fallback to approximate point
              L.marker([targetLat, targetLon])
                .addTo(mapInstance.current)
                .bindPopup(`⚡ Charging Stop ${i} (Approx)`)
              instructions += `Stop ${i} at approx ${(progress * totalDistance).toFixed(0)} km\n`
            }
          }
        } catch (charError) {
          console.error('Error fetching real chargers for planTrip:', charError)
          // Fallback to approximate points
          for (let i = 1; i <= stops; i++) {
            const idx = Math.floor(coords.length * (i / (stops + 1)))
            const lat = coords[idx][1]
            const lon = coords[idx][0]
            L.marker([lat, lon])
              .addTo(mapInstance.current)
              .bindPopup(`⚡ Charging Stop ${i}`)
          }
        }
      } else {
        instructions += 'No charging needed\n'
      }

      setTripResult(instructions)

      // Automatically fetch chargers on route and show cost comparison
      setLoadingChargers(true)
      try {
        const charRes = await axios.get('/api/route-chargers', {
          params: { start_lat: startLat, start_lon: startLon, end_lat: endLat, end_lon: endLon }
        })
        setRouteChargers(charRes.data.chargers || [])
        setRouteDistance(charRes.data.total_distance_km)
        displayChargers(charRes.data.chargers || [])
        setShowChargersPanel(true)
        
        // Save for AI assistant
        localStorage.setItem('genDriveTrip', JSON.stringify({
          distance: charRes.data.total_distance_km,
          chargers: charRes.data.chargers || []
        }))
      } catch (charErr) {
        console.error('Auto charger fetch error:', charErr)
      }
      setLoadingChargers(false)

      // Call backend API (original trip record)
      try {
        await axios.post('/api/trip', { start, end })
      } catch (axErr) {
        console.error('Trip planning axios error:', axErr)
      }
    } catch (err) {
      console.error('Error planning trip fetch:', err)
      alert('Network Fetch Error planning trip: ' + err.message + '\nCheck console for details.')
    }
  }

  return (
    <div className="trip-planner">
      <h2>GenDrive AI — EV Smart Trip & Route Chargers</h2>

      <div className="stats">
        <div className="card">
          Battery (%)<br />
          <input 
            type="number" 
            min="0" 
            max="100" 
            value={battery} 
            onChange={(e) => setBattery(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
            style={{
              width: '60px',
              background: '#1a1a1a',
              color: '#38bdf8',
              border: '1px solid #334155',
              borderRadius: '4px',
              textAlign: 'center',
              fontSize: '18px',
              fontWeight: 'bold',
              marginTop: '5px'
            }}
          />
        </div>
        <div className="card">
          Range<br />
          <b id="range">{range} km</b>
        </div>
        <div className="card vehicle-select">
          Vehicle Type<br />
          <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
            <option value="CAR">Car 🚗</option>
            <option value="AUTO">Auto 🛺</option>
            <option value="BUS">Bus 🚌</option>
            <option value="LORRY">Lorry 🚛</option>
          </select>
        </div>
      </div>

      <div className="input-container">
        <div className="autocomplete-wrapper">
          <input
            type="text"
            placeholder="Start Location"
            value={start}
            onChange={(e) => {
              setStart(e.target.value)
              autoSearch(e.target.value, true)
            }}
          />
          {startSuggestions.length > 0 && (
            <div className="suggestions">
              {startSuggestions.map((place, idx) => (
                <div
                  key={idx}
                  onClick={() => selectPlace(place.display_name, true)}
                >
                  {place.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="autocomplete-wrapper">
          <input
            type="text"
            placeholder="Destination"
            value={end}
            onChange={(e) => {
              setEnd(e.target.value)
              autoSearch(e.target.value, false)
            }}
          />
          {endSuggestions.length > 0 && (
            <div className="suggestions">
              {endSuggestions.map((place, idx) => (
                <div
                  key={idx}
                  onClick={() => selectPlace(place.display_name, false)}
                >
                  {place.display_name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="button-group">
        <button onClick={planTrip}>Plan Trip</button>
        {startCoords && endCoords && (
          <button onClick={fetchChargersOnRoute} disabled={loadingChargers} style={{background: loadingChargers ? '#888' : '#f97316'}}>
            {loadingChargers ? 'Loading chargers...' : '⚡ Find Chargers on Route'}
          </button>
        )}
        <button onClick={() => navigate('/charging-hub')}>Open Charging Hub →</button>
        <button onClick={() => navigate('/ai-assistant')} style={{background: 'linear-gradient(90deg, #8b5cf6, #6d28d9)'}}>Open AI Assistant ✨</button>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: showChargersPanel ? '1fr 280px' : '1fr', gap: '10px'}}>
        <div ref={mapRef} className="map"></div>

        {showChargersPanel && routeChargers.length > 0 && (
          <div className="chargers-panel">
            <div className="panel-header">
              <h4>Chargers on Route</h4>
              <button onClick={() => setShowChargersPanel(false)} style={{background: 'none', border: 'none', color: '#a0aec0', cursor: 'pointer', fontSize: '18px'}}>✕</button>
            </div>

            <div className="sort-controls">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{width: '100%', padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #444', background: '#1a1a1a', color: '#fff'}}>
                <option value="score">🎯 Best Value</option>
                <option value="price">💰 Cheapest</option>
                <option value="reliability">⭐ Most Reliable</option>
                <option value="distance">📍 Closest</option>
              </select>
            </div>

            <div className="chargers-list">
              <div style={{fontSize: '11px', color: '#a0aec0', marginBottom: '8px'}}>Found {routeChargers.length} chargers within 25km of route</div>
              {getSortedChargers().map(c => (
                <div key={c.id} className={'charger-card' + (selectedCharger?.id === c.id ? ' selected' : '')} onClick={() => setSelectedCharger(c)}>
                  <div style={{fontSize: '12px', fontWeight: 'bold', marginBottom: '4px'}}>{c.name}</div>
                  <div style={{fontSize: '11px', color: '#f97316'}}>{c.network}</div>
                  <div style={{display: 'flex', gap: '4px', margin: '4px 0'}}>
                    {c.amenities?.map(a => (
                      <span key={a.id} title={a.label} style={{fontSize: '14px'}}>{a.icon}</span>
                    ))}
                    {c.family_friendly && <span title="Family Friendly" style={{fontSize: '14px'}}>👨‍👩‍👧‍👦</span>}
                  </div>
                  <div style={{fontSize: '11px', color: '#22c55e', marginTop: '2px'}}>💰 ₹{c.price_per_kwh?.toFixed(2) || 'N/A'}/kWh</div>
                  <div style={{fontSize: '11px', color: '#38bdf8'}}>🔌 {c.connections?.substring(0, 20) || 'N/A'}</div>
                  <div style={{fontSize: '11px', marginTop: '3px'}}>📏 {c.distance_to_route_km?.toFixed(1)}km away</div>
                  <div style={{fontSize: '11px'}}>{'⚡ ' + (c.fast ? 'Fast' : 'Standard')}</div>
                </div>
              ))}
            </div>

            {selectedCharger && (
              <div className="selected-detail">
                <h5>{selectedCharger.name}</h5>
                <div style={{fontSize: '12px'}}>
                  <div>Network: {selectedCharger.network}</div>
                  <div>💰 ₹{selectedCharger.price_per_kwh?.toFixed(2) || 'N/A'}/kWh</div>
                  <div>🔌 {selectedCharger.connections}</div>
                  <div>📊 Reliability: {Math.round(selectedCharger.reliability*100)}%</div>
                  <div>⚡ {selectedCharger.fast ? 'Fast charger' : 'Standard charger'}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {tripResult && (
        <pre className="trip-result">{tripResult}</pre>
      )}

      {routeChargers.length > 0 && (
        <div style={{marginTop: '20px'}}>
          <CostChart costData={{
            trip_distance_km: routeDistance || 0,
            needed_kwh: Math.round((routeDistance || 0) * 0.15),
            value_of_time_per_hour: 400,
            chargers: routeChargers.map(c => {
              const chg = ((routeDistance || 0) * 0.15) * (c.price_per_kwh || 15);
              const dev = (c.distance_to_route_km || 0) * 6;
              const time = c.fast ? 60 : 200;
              return {
                ...c,
                charging_cost: Math.round(chg),
                deviation_cost: Math.round(dev),
                time_cost: Math.round(time),
                total_effective_cost: Math.round(chg + dev + time)
              }
            }),
            recommendation: {
              best_charger: routeChargers[0]?.name || 'Unknown',
              total_cost: Math.round((((routeDistance || 0) * 0.15) * (routeChargers[0]?.price_per_kwh || 15)) + ((routeChargers[0]?.distance_to_route_km || 0) * 6) + (routeChargers[0]?.fast ? 60 : 200))
            }
          }} />
        </div>
      )}
    </div>
  )
}
