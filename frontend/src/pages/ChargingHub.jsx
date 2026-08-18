import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import axios from 'axios'
import './ChargingHub.css'

export default function ChargingHub() {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])

  const [chargers, setChargers] = useState([])
  const [fastOnly, setFastOnly] = useState(false)
  const [cheapest, setCheapest] = useState(false)
  const [minReliability, setMinReliability] = useState(0)
  const [loading, setLoading] = useState(true)

  const [selectedCharger, setSelectedCharger] = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [obsWait, setObsWait] = useState(5)
  const [obsSuccess, setObsSuccess] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [safetyReport, setSafetyReport] = useState({ dark: 0, noStaff: 0, remote: 0, reportsCount: 0 })
  const [safetyIssues, setSafetyIssues] = useState({ dark: false, noStaff: false, remote: false })

  const [optResult, setOptResult] = useState(null)
  const [optParams, setOptParams] = useState({ start_lat: 11.1271, start_lon: 79.2800, end_lat: 12.9716, end_lon: 79.1643, current_battery_pct: 30, battery_capacity_kwh: 60, desired_arrival_pct: 80 })

  async function fetchChargersForLocation(lat, lon, distance) {
    setLoading(true)
    try {
      const q = [`latitude=${lat}`, `longitude=${lon}`, `distance=${distance}`]
      if (fastOnly) q.push('fast=true')
      if (cheapest) q.push('cheapest=true')
      if (minReliability) q.push(`minReliability=${minReliability}`)
      const url = '/api/chargers?' + q.join('&')
      const res = await axios.get(url)
      setChargers(res.data)
    } catch (e) {
      console.error('chargers error', e)
    }
    setLoading(false)
  }

  useEffect(() => {
    mapInstance.current = L.map(mapRef.current).setView([11.1271, 79.2800], 9)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current)
    // Fetch chargers for Tamil Nadu by default
    fetchChargersForLocation(11.1271, 79.2800, 100)
    return () => mapInstance.current && mapInstance.current.remove()
  }, [])

  useEffect(() => {
    renderMarkers()
  }, [chargers])

  async function fetchChargers() {
    setLoading(true)
    try {
      const q = []
      if (fastOnly) q.push('fast=true')
      if (cheapest) q.push('cheapest=true')
      if (minReliability) q.push(`minReliability=${minReliability}`)
      const url = '/api/chargers' + (q.length ? `?${q.join('&')}` : '')
      const res = await axios.get(url)
      setChargers(res.data)
    } catch (e) {
      console.error('chargers error', e)
    }
    setLoading(false)
  }

  function clearMarkers() {
    markersRef.current.forEach(m => mapInstance.current.removeLayer(m))
    markersRef.current = []
  }

  function renderMarkers() {
    if (!mapInstance.current) return
    clearMarkers()
    chargers.forEach(c => {
      const color = c.reliability >= 0.9 ? 'green' : c.reliability >= 0.8 ? 'orange' : 'red'
      const marker = L.circleMarker([c.lat, c.lon], { radius: 8, color, fillColor: color, fillOpacity: 0.8 }).addTo(mapInstance.current)
      
      // Enhanced popup with click-to-details
      const popupHTML = `
        <div style="font-size:12px; cursor: pointer;">
          <b>${c.name}</b><br/>
          Network: ${c.network}<br/>
          💰 Price: ₹${c.price_per_kwh ? c.price_per_kwh.toFixed(2) : 'N/A'}/kWh<br/>
          🔌 Connector: ${c.connections || 'N/A'}<br/>
          Reliability: ${Math.round(c.reliability*100)}%<br/>
          Rating: ${c.rating || 'N/A'}<br/>
          <button style="margin-top:6px; padding: 4px 8px; background: #22c55e; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="window.selectCharger && window.selectCharger(${c.id})">
            View details & report
          </button>
        </div>
      `
      marker.bindPopup(popupHTML)
      marker.on('click', () => selectChargerDetail(c))
      markersRef.current.push(marker)
    })
    if (chargers.length) {
      const group = L.featureGroup(markersRef.current)
      mapInstance.current.fitBounds(group.getBounds().pad(0.5))
    }
  }

  async function selectChargerDetail(charger) {
    setSelectedCharger(charger)
    setPrediction(null)
    try {
      const res = await axios.get(`/api/predict-wait?chargerId=${charger.id}&timeOfDay=${new Date().getHours()}`)
      setPrediction(res.data)
      
      const safetyRes = await axios.get(`/api/safety-reports/${charger.id}`)
      setSafetyReport(safetyRes.data)
    } catch (e) {
      console.error('prediction/safety error', e)
    }
  }

  async function submitSafetyReport() {
    if (!selectedCharger) return
    setSubmitting(true)
    try {
      await axios.post('/api/safety-reports', {
        chargerId: selectedCharger.id,
        issues: safetyIssues
      })
      const safetyRes = await axios.get(`/api/safety-reports/${selectedCharger.id}`)
      setSafetyReport(safetyRes.data)
      alert('Safety report submitted! Thank you for helping the community.')
      setSafetyIssues({ dark: false, noStaff: false, remote: false })
    } catch (e) {
      console.error('safety report error', e)
    }
    setSubmitting(false)
  }

  async function submitObservation() {
    if (!selectedCharger) return
    setSubmitting(true)
    try {
      const res = await axios.post('/api/observations', {
        chargerId: selectedCharger.id,
        wait_min: Number(obsWait),
        success: obsSuccess
      })
      setPrediction(res.data)
      alert('Observation recorded!')
      setObsWait(5)
    } catch (e) {
      console.error('obs error', e)
      alert('Error submitting observation')
    }
    setSubmitting(false)
  }

  async function runOptimize() {
    setOptResult(null)
    try {
      const res = await axios.post('/api/optimize-charge', optParams)
      setOptResult(res.data)
    } catch (e) {
      console.error('opt error', e)
    }
  }

  const [citySearch, setCitySearch] = useState('')
  const cities = [
    { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
    { name: 'Coimbatore', lat: 11.0168, lon: 76.9558 },
    { name: 'Madurai', lat: 9.9252, lon: 78.1198 },
    { name: 'Trichy', lat: 10.7905, lon: 78.7047 },
    { name: 'Salem', lat: 11.6643, lon: 78.1460 },
    { name: 'Tiruppur', lat: 11.1085, lon: 77.3411 },
    { name: 'Erode', lat: 11.3410, lon: 77.7172 },
    { name: 'Vellore', lat: 12.9165, lon: 79.1325 },
    { name: 'Tirunelveli', lat: 8.7139, lon: 77.7567 },
    { name: 'Thoothukudi', lat: 8.8049, lon: 78.1460 },
    { name: 'Nagercoil', lat: 8.1833, lon: 77.4119 },
    { name: 'Hosur', lat: 12.7409, lon: 77.8253 },
    { name: 'Thanjavur', lat: 10.7870, lon: 79.1378 },
    { name: 'Dindigul', lat: 10.3673, lon: 77.9803 }
  ]

  async function searchCity() {
    if (!citySearch) return
    setLoading(true)
    try {
      const res = await axios.get(`/api/geocode?q=${encodeURIComponent(citySearch + ', Tamil Nadu')}`)
      if (res.data && res.data.length > 0) {
        const city = {
          name: res.data[0].display_name.split(',')[0],
          lat: parseFloat(res.data[0].lat),
          lon: parseFloat(res.data[0].lon)
        }
        fetchChargersForCity(city)
      } else {
        alert('City not found')
      }
    } catch (e) {
      console.error('search error', e)
    }
    setLoading(false)
  }

  async function fetchChargersForCity(city) {
    setLoading(true)
    try {
      const q = [`latitude=${city.lat}`, `longitude=${city.lon}`, `distance=50`]
      if (fastOnly) q.push('fast=true')
      if (cheapest) q.push('cheapest=true')
      if (minReliability) q.push(`minReliability=${minReliability}`)
      const url = '/api/chargers?' + q.join('&')
      const res = await axios.get(url)
      setChargers(res.data)
      // Pan map to city
      if (mapInstance.current) {
        mapInstance.current.setView([city.lat, city.lon], 12)
      }
    } catch (e) {
      console.error('chargers error', e)
    }
    setLoading(false)
  }

  return (
    <div className="charging-hub">
      <h2>Charging Hub — Aggregated Chargers & Optimizer</h2>
      
      <div className="city-search" style={{marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'center'}}>
        <input 
          type="text" 
          placeholder="Search any city in Tamil Nadu..." 
          value={citySearch} 
          onChange={e => setCitySearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && searchCity()}
          style={{padding: '10px', width: '300px', borderRadius: '4px', border: '1px solid #334155', background: '#1e293b', color: 'white'}}
        />
        <button onClick={searchCity} style={{padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Search City</button>
      </div>

      <div className="city-buttons" style={{display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '20px'}}>
        {cities.map(city => (
          <button key={city.name} onClick={() => fetchChargersForCity(city)} className="city-btn">
            {city.name}
          </button>
        ))}
      </div>

      <div className="hub-grid">
        <div className="sidebar card">
          <div className="filters">
            <label><input type="checkbox" checked={fastOnly} onChange={e => { setFastOnly(e.target.checked); }} /> Fast chargers only</label>
            <label><input type="checkbox" checked={cheapest} onChange={e => { setCheapest(e.target.checked); }} /> Sort cheapest</label>
            <label>Min Reliability: <input type="range" min="0" max="1" step="0.01" value={minReliability} onChange={e => setMinReliability(e.target.value)} /> {minReliability}</label>
            <button onClick={() => fetchChargersForLocation(11.1271, 79.2800, 100)} className="mt">Apply filters</button>
          </div>

          <div className="list">
            <h3>Chargers</h3>
            {loading ? <div>Loading...</div> : (
              chargers.length === 0 ? <div>No chargers</div> : chargers.map(c => (
                <div key={c.id} className={"charger-row" + (selectedCharger?.id === c.id ? " selected" : "")} onClick={() => selectChargerDetail(c)}>
                  <div className="left">
                    <b>{c.name}</b>
                    <div className="meta">{c.network} • ₹{c.price_per_kwh?.toFixed(2) || 'N/A'}/kWh</div>
                    <div className="meta-secondary">🔌 {c.connections || 'N/A'}</div>
                    <div className="meta">{Math.round(c.reliability*100)}% reliability</div>
                  </div>
                  <div className="right">
                    <button onClick={(e) => { e.stopPropagation(); mapInstance.current.setView([c.lat, c.lon], 15); }}>View</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="optimizer">
            <h3>Cost Optimizer</h3>
            <label>Start Lat <input type="number" value={optParams.start_lat} onChange={e => setOptParams({...optParams, start_lat: parseFloat(e.target.value)})} /></label>
            <label>Start Lon <input type="number" value={optParams.start_lon} onChange={e => setOptParams({...optParams, start_lon: parseFloat(e.target.value)})} /></label>
            <label>End Lat <input type="number" value={optParams.end_lat} onChange={e => setOptParams({...optParams, end_lat: parseFloat(e.target.value)})} /></label>
            <label>End Lon <input type="number" value={optParams.end_lon} onChange={e => setOptParams({...optParams, end_lon: parseFloat(e.target.value)})} /></label>
            <label>Current Battery % <input type="number" value={optParams.current_battery_pct} onChange={e => setOptParams({...optParams, current_battery_pct: parseFloat(e.target.value)})} /></label>
            <label>Desired Arrival % <input type="number" value={optParams.desired_arrival_pct} onChange={e => setOptParams({...optParams, desired_arrival_pct: parseFloat(e.target.value)})} /></label>
            <button onClick={runOptimize}>Find Cheapest Options</button>

            {optResult && (
              <div className="opt-result">
                <div>Needed kWh: {optResult.needed_kwh}</div>
                <ul>
                  {optResult.options.map(o => (
                    <li key={o.chargerId}>{o.name} ({o.network}) — ₹{o.estimated_charge_cost} • {o.distance_to_route_km} km • reliability {Math.round(o.reliability*100)}%</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="map-wrap">
          <div ref={mapRef} className="map"></div>
        </div>

        {selectedCharger && (
          <div className="detail-panel card">
            <div className="detail-header">
              <h3>{selectedCharger.name}</h3>
              <button onClick={() => setSelectedCharger(null)} className="close-btn">✕</button>
            </div>
            
            <div className="detail-info">
              <div><b>Network:</b> {selectedCharger.network}</div>
              <div><b>💰 Price:</b> <span style={{color: '#22c55e', fontWeight: 'bold'}}>₹{selectedCharger.price_per_kwh?.toFixed(2) || 'N/A'}/kWh</span></div>
              <div><b>🔌 Connector:</b> {selectedCharger.connections || 'N/A'}</div>
              <div><b>⚡ Fast charger:</b> {selectedCharger.fast ? '✓ Yes' : '✗ No'}</div>
              <div><b>⭐ Rating:</b> {selectedCharger.rating || 'N/A'}</div>
            </div>

            {prediction && (
              <div className="predictions">
                <h4>📊 Current Predictions</h4>
                <div className="pred-item">
                  <span>Expected wait:</span> <b>{prediction.predicted_wait_min} min</b>
                </div>
                <div className="pred-item">
                  <span>Reliability:</span> <b>{Math.round((prediction.reliability || 0)*100)}%</b>
                </div>
                <div className="pred-note">{prediction.source === 'ewma' ? '(Based on observations)' : '(Estimated)' }</div>
              </div>
            )}

            <div className="observations">
              <h4>📝 Report Observation</h4>
              <label>Wait time (min): <input type="number" min="0" value={obsWait} onChange={e => setObsWait(e.target.value)} /></label>
              <label><input type="checkbox" checked={obsSuccess} onChange={e => setObsSuccess(e.target.checked)} /> Successful charge</label>
              <button onClick={submitObservation} disabled={submitting} className="submit-obs">{submitting ? 'Submitting...' : 'Submit'}</button>
            </div>

            <div className="safety-section" style={{marginTop: '20px', borderTop: '1px solid #334155', paddingTop: '15px'}}>
              <h4>🛡️ Community Safety Insights</h4>
              {safetyReport.reportsCount > 0 ? (
                <div style={{fontSize: '12px', marginBottom: '10px'}}>
                  {safetyReport.dark > 0 && <span style={{color: '#f87171', display: 'block'}}>⚠️ Reported: Poor Lighting ({safetyReport.dark})</span>}
                  {safetyReport.noStaff > 0 && <span style={{color: '#f87171', display: 'block'}}>⚠️ Reported: No Staff present ({safetyReport.noStaff})</span>}
                  {safetyReport.remote > 0 && <span style={{color: '#f87171', display: 'block'}}>⚠️ Reported: Very Remote area ({safetyReport.remote})</span>}
                  {safetyReport.dark === 0 && safetyReport.noStaff === 0 && safetyReport.remote === 0 && <span style={{color: '#22c55e'}}>✓ No safety issues reported recently.</span>}
                </div>
              ) : <p style={{fontSize: '11px', color: '#94a3b8'}}>No safety reports yet. Be the first!</p>}
              
              <div className="report-safety" style={{background: '#0f172a', padding: '10px', borderRadius: '8px', marginTop: '10px'}}>
                <div style={{fontSize: '12px', fontWeight: 'bold', marginBottom: '8px'}}>Report Safety Issues:</div>
                <label style={{display: 'block', fontSize: '11px'}}><input type="checkbox" checked={safetyIssues.dark} onChange={e => setSafetyIssues({...safetyIssues, dark: e.target.checked})} /> Poor Lighting</label>
                <label style={{display: 'block', fontSize: '11px'}}><input type="checkbox" checked={safetyIssues.noStaff} onChange={e => setSafetyIssues({...safetyIssues, noStaff: e.target.checked})} /> No Staff</label>
                <label style={{display: 'block', fontSize: '11px', marginBottom: '8px'}}><input type="checkbox" checked={safetyIssues.remote} onChange={e => setSafetyIssues({...safetyIssues, remote: e.target.checked})} /> Too Remote</label>
                <button onClick={submitSafetyReport} disabled={submitting} style={{width: '100%', fontSize: '11px', background: '#475569'}}>Submit Safety Check</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
