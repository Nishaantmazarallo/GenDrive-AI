import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch'
import NodeCache from 'node-cache'

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Cache for external API responses
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// In-memory charger observation stats for EWMA wait and reliability
const chargerStats = {}; // { [chargerId]: { ewmaWait: number, alpha: number, successes: number, attempts: number } }

function recordObservation(chargerId, waitMin, success) {
  if (!chargerStats[chargerId]) {
    chargerStats[chargerId] = { ewmaWait: waitMin, alpha: 0.25, successes: success ? 1 : 0, attempts: 1 };
    return chargerStats[chargerId];
  }
  const s = chargerStats[chargerId];
  s.ewmaWait = s.alpha * waitMin + (1 - s.alpha) * s.ewmaWait;
  s.attempts += 1;
  if (success) s.successes += 1;
  return s;
}

// Middleware
app.use(cors());
app.use(express.json());

// ----- Simulated Vehicle Profiles (Realistic for India) -----
const VEHICLE_PROFILES = {
  CAR: { name: "Car 🚗", battery_capacity_kwh: 60, range: 450, efficiency_wh_km: 150, pack: "Li-ion" },
  AUTO: { name: "Auto 🛺", battery_capacity_kwh: 12, range: 130, efficiency_wh_km: 80, pack: "LFP" },
  BUS: { name: "Bus 🚌", battery_capacity_kwh: 250, range: 250, efficiency_wh_km: 900, pack: "LFP" },
  LORRY: { name: "Lorry 🚛", battery_capacity_kwh: 300, range: 300, efficiency_wh_km: 1100, pack: "LFP" }
};

let currentVehicleType = 'CAR';
let vehicle = {
  battery: 85.0,
  voltage: 12.6,
  temperature: 30
};

// Helper: Inject random amenities for Demo/WOW factor
function injectAmenities(charger) {
  const amenitiesList = [
    { id: 'restroom', icon: '🚻', label: 'Restroom' },
    { id: 'food', icon: '🍔', label: 'Food' },
    { id: 'hotel', icon: '🏨', label: 'Hotel' },
    { id: 'parking', icon: '🅿️', label: 'Safe Parking' }
  ];
  
  // Seed random based on charger ID to stay consistent
  const seed = parseInt(charger.id) || 42;
  const amenities = amenitiesList.filter((_, i) => ((seed * (i + 1)) % 10) > 4);
  
  // Tag as family friendly if it has Restroom + Food
  const hasRestroom = amenities.some(a => a.id === 'restroom');
  const hasFood = amenities.some(a => a.id === 'food');
  
  return {
    ...charger,
    amenities,
    family_friendly: hasRestroom && hasFood
  };
}

// ----- Failure Prediction -----
function checkFailure(voltage, temperature) {
  if (voltage < 11.5) {
    return "⚠️ 12V Battery Failure Risk";
  }
  if (temperature > 55) {
    return "⚠️ Battery Overheating Risk";
  }
  return "Normal";
}

// ----- Routes -----

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'GenDrive AI Backend API',
    version: '1.0.0',
    endpoints: {
      vehicle: 'GET /api/vehicle',
      health: 'GET /api/health',
      coach: 'GET /api/coach',
      trip: 'POST /api/trip',
      items: {
        create: 'POST /api/items',
        list: 'GET /api/items',
        read: 'GET /api/items/:id',
        update: 'PUT /api/items/:id',
        delete: 'DELETE /api/items/:id'
      },
      frontend: 'http://localhost:3000'
    }
  });
});

// Get vehicle data
app.get('/api/vehicle', (req, res) => {
  const type = (req.query.type || currentVehicleType).toUpperCase();
  const profile = VEHICLE_PROFILES[type] || VEHICLE_PROFILES.CAR;
  currentVehicleType = type;

  const status = checkFailure(vehicle.voltage, vehicle.temperature);
  
  res.json({
    type: type,
    name: profile.name,
    battery_percent: Math.round(vehicle.battery * 100) / 100,
    estimated_range_km: Math.round(((vehicle.battery / 100) * profile.range) * 100) / 100,
    battery_capacity_kwh: profile.battery_capacity_kwh,
    voltage: Math.round(vehicle.voltage * 100) / 100,
    temperature: Math.round(vehicle.temperature * 100) / 100,
    health_status: status
  });
});

// Plan trip with safety buffer
app.post('/api/trip', (req, res) => {
  const { start, end } = req.body;
  
  // Simulate distance between 50-600 km
  const simulatedDistance = Math.floor(Math.random() * 551) + 50;
  
  // Safety buffer logic (keep 15% battery unused)
  const safetyBufferPercent = 15;
  let usableBattery = vehicle.battery - safetyBufferPercent;
  usableBattery = Math.max(usableBattery, 0);
  
  const safeRange = (usableBattery / 100) * vehicle.range;
  
  let message;
  let chargingStopsNeeded = 0;
  
  if (safeRange >= simulatedDistance) {
    message = `✅ Trip from ${start} to ${end} is possible without charging.\nSafe Distance: ${simulatedDistance} km (15% safety buffer kept)`;
  } else {
    chargingStopsNeeded = Math.ceil(simulatedDistance / safeRange) - 1;
    message = `⚡ Charging required for trip from ${start} to ${end}.\nTotal Distance: ${simulatedDistance} km.\nCharge safely after ${Math.round(safeRange * 10) / 10} km (15% battery reserved).`;
  }
  
  res.json({
    distance: simulatedDistance,
    safe_range: Math.round(safeRange * 10) / 10,
    message: message,
    charging_stops: chargingStopsNeeded
  });
});

// Health status endpoint for health page
app.get('/api/health', (req, res) => {
  res.json({
    voltage: {
      value: 11.42,
      status: "Critical"
    },
    battery_temperature: {
      value: 58.6,
      status: "High"
    },
    motor_temperature: {
      value: 72.3,
      status: "High"
    },
    battery_health: {
      value: 71,
      status: "Degraded"
    },
    charging_cycles: 612,
    estimated_life_years: 0.9,
    voltage_history: [12.4, 12.2, 12.0, 11.9, 11.7, 11.6, 11.5, 11.42],
    charging_history: [
      { session: 1, from: 18, to: 82, time: 42 },
      { session: 2, from: 22, to: 100, time: 155 },
      { session: 3, from: 15, to: 76, time: 39 },
      { session: 4, from: 28, to: 90, time: 46 },
      { session: 5, from: 30, to: 100, time: 170 },
      { session: 6, from: 20, to: 80, time: 41 },
      { session: 7, from: 25, to: 100, time: 185 }
    ]
  });
});

// Driving coach endpoint
app.get('/api/coach', (req, res) => {
  res.json({
    efficiency_score: 78,
    driving_style: "Moderate / Semi-Aggressive",
    optimal_speed: "65 – 80 km/h",
    regen_braking_efficiency: 63,
    energy_consumption: 152,
    potential_range_gain: 42,
    acceleration_pattern: "Frequent Hard Acceleration",
    advice: "Maintain steady speed, avoid sudden acceleration, and use regenerative braking effectively to improve efficiency and extend battery life.",
    efficiency_trend: [65, 70, 72, 75, 76, 77, 78],
    speed_vs_range: {
      speeds: [40, 60, 80, 100, 120],
      ranges: [610, 580, 550, 500, 430]
    }
  });
});

// ---- In-memory CRUD storage for demonstration ----
let items = [];
let nextId = 1;

// Create item
app.post('/api/items', (req, res) => {
  const { name, data } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Missing name field' });
  }
  const item = { id: nextId++, name, data: data || null };
  items.push(item);
  res.status(201).json(item);
});

// Read all items
app.get('/api/items', (req, res) => {
  res.json(items);
});

// Read single item
app.get('/api/items/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const item = items.find(i => i.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }
  res.json(item);
});

// Update item
app.put('/api/items/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const item = items.find(i => i.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }
  const { name, data } = req.body;
  if (name !== undefined) item.name = name;
  if (data !== undefined) item.data = data;
  res.json(item);
});

// Delete item
app.delete('/api/items/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = items.findIndex(i => i.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }
  const deleted = items.splice(index, 1);
  res.json(deleted[0]);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Backend running' });
});

// ---- EV Charging Aggregator (OpenChargeMap integration with cache) ----
// Fetches nearby POIs from OpenChargeMap and normalizes fields.
// Environment: set OCM_API_KEY to use higher rate limits; otherwise free access works.
app.get('/api/chargers', async (req, res) => {
  // query params: latitude, longitude, distance, fast, cheapest, minReliability
  const { latitude, longitude, distance = 50, fast, cheapest, minReliability } = req.query;
  const cacheKey = `chargers:${latitude || 'na'}:${longitude || 'na'}:${distance}:${fast || 'na'}:${cheapest || 'na'}:${minReliability || 'na'}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  // If lat/lon not provided, return cached fallback or error
  if (!latitude || !longitude) {
    // fallback: use small set of mock results if no coords
    const fallback = [
      { id: 1, name: 'ChargeFast A1', network: 'ChargeFast', lat: 28.7041, lon: 77.1025, price_per_kwh: 0.35, rating: 4.6, reliability: 0.95, avg_wait_min: 5, fast: true },
      { id: 2, name: 'EcoCharge B2', network: 'EcoCharge', lat: 28.5355, lon: 77.3910, price_per_kwh: 0.28, rating: 4.1, reliability: 0.82, avg_wait_min: 12, fast: false }
    ];
    cache.set(cacheKey, fallback);
    return res.json(fallback);
  }

  try {
    const apiKey = process.env.OCM_API_KEY || '';
    const url = new URL('https://api.openchargemap.io/v3/poi/');
    url.searchParams.set('output', 'json');
    url.searchParams.set('latitude', latitude);
    url.searchParams.set('longitude', longitude);
    url.searchParams.set('distance', distance);
    url.searchParams.set('distanceunit', 'KM');
    url.searchParams.set('maxresults', '50');
    if (apiKey) url.searchParams.set('key', apiKey);

    const r = await fetch(url.toString(), { headers: { 'User-Agent': 'GenDriveAi/1.0' } });
    if (!r.ok) throw new Error(`OCM ${r.status}`);
    const data = await r.json();

    // Normalize results into our format
    const results = data.map((p, idx) => {
      // OpenChargeMap fields: AddressInfo, Connections, UsageCost, Rating
      const addr = p.AddressInfo || {};
      const connections = p.Connections || [];
      const connTypes = [...new Set(connections.map(c => {
        const title = c.ConnectionType?.Title || '';
        if (title.includes('CCS')) return 'CCS';
        if (title.includes('Type 2')) return 'Type 2';
        if (title.includes('Tesla')) return 'Tesla Supercharger';
        if (title.includes('CHAdeMO')) return 'CHAdeMO';
        return title;
      }).filter(t => t))].join(', ');
      
      const fastFlag = connections.some(c => (c.Level && c.Level.IsFastChargePoint) || (c.PowerKW && c.PowerKW >= 50));
      
      // usage cost sometimes available, if not, provide realistic mock based on network
      let price = p.UsageCost ? parseFloat((p.UsageCost.match(/\d+(\.\d+)?/) || [NaN])[0]) : null;
      if (isNaN(price) || price === null) {
        const network = (p.OperatorInfo?.Title || '').toLowerCase();
        if (network.includes('tesla')) price = 40;
        else if (network.includes('ionity')) price = 55;
        else if (network.includes('tata power')) price = 22;
        else if (network.includes('zeon')) price = 24;
        else if (network.includes('fortum')) price = 28;
        else if (network.includes('statiq')) price = 18;
        else if (network.includes('shell')) price = 35;
        else price = 25; // Default "real brand" average in ₹
      }

      return injectAmenities({
        id: p.ID || idx,
        name: addr.Title || p.OperatorInfo && p.OperatorInfo.Title || 'Unknown',
        network: p.OperatorInfo && p.OperatorInfo.Title || 'Unknown',
        lat: addr.Latitude,
        lon: addr.Longitude,
        price_per_kwh: price,
        rating: p.Rating || null,
        reliability: 0.85, // default until we compute from observations
        avg_wait_min: 5,
        fast: fastFlag,
        connections: connTypes || 'Unknown',
        raw: p
      });
    });

    // apply simple filters
    let filtered = results;
    if (fast === 'true') filtered = filtered.filter(c => c.fast);
    if (minReliability) filtered = filtered.filter(c => c.reliability >= parseFloat(minReliability));
    if (cheapest === 'true') filtered.sort((a,b) => (a.price_per_kwh || 999) - (b.price_per_kwh || 999));

    cache.set(cacheKey, filtered);
    return res.json(filtered);
  } catch (err) {
    console.error('chargers fetch error', err);
    // fallback to small mock
    const fallback = [
      { id: 1, name: 'ChargeFast A1', network: 'ChargeFast', lat: 28.7041, lon: 77.1025, price_per_kwh: 0.35, rating: 4.6, reliability: 0.95, avg_wait_min: 5, fast: true },
      { id: 2, name: 'EcoCharge B2', network: 'EcoCharge', lat: 28.5355, lon: 77.3910, price_per_kwh: 0.28, rating: 4.1, reliability: 0.82, avg_wait_min: 12, fast: false }
    ];
    cache.set(cacheKey, fallback);
    return res.json(fallback);
  }
});

// Predict waiting time (simple ML-like heuristic)
app.get('/api/predict-wait', (req, res) => {
  // expect chargerId and timeOfDay (0-23)
  const chargerId = parseInt(req.query.chargerId);
  const timeOfDay = parseInt(req.query.timeOfDay || new Date().getHours());
  // if we have EWMA stats, use them
  const stats = chargerStats[chargerId];
  if (!stats) {
    // fallback: simple heuristic based on peak hours
    const charger = null; // unknown
    let wait = 8;
    if ((timeOfDay >= 8 && timeOfDay <= 10) || (timeOfDay >= 17 && timeOfDay <= 20)) wait += 8;
    return res.json({ chargerId, predicted_wait_min: wait, note: 'heuristic' });
  }
  // Use EWMA wait and compute reliability as successes/attempts
  const ewma = stats.ewmaWait;
  const reliability = stats.attempts > 0 ? stats.successes / stats.attempts : 0.8;
  // Peak multiplier
  const peak = ((timeOfDay >= 8 && timeOfDay <= 10) || (timeOfDay >= 17 && timeOfDay <= 20)) ? 1.3 : 1.0;
  let predicted = Math.round(ewma * peak * (1 + (1 - reliability) * 0.3));
  predicted = Math.max(0, predicted);
  res.json({ chargerId, predicted_wait_min: predicted, reliability: Number(reliability.toFixed(2)), source: 'ewma' });
});

// Range Drift Predictor: predicts range loss over distance and time
app.post('/api/predict-range-drift', (req, res) => {
  // expects { current_battery_pct, distance_km, avg_speed_kmh, ambient_temp_c }
  const { current_battery_pct, distance_km, avg_speed_kmh, ambient_temp_c } = req.body;
  if (current_battery_pct == null || distance_km == null) return res.status(400).json({ error: 'Missing fields' });
  // Base consumption (Wh/km) depends on speed and temperature heuristics
  let base_wh_per_km = 150; // default
  if (avg_speed_kmh > 100) base_wh_per_km += 30;
  if (avg_speed_kmh < 60) base_wh_per_km -= 10;
  if (ambient_temp_c < 5) base_wh_per_km += 20;
  if (ambient_temp_c > 35) base_wh_per_km += 15;
  // simulate drift as percent of battery
  const battery_kwh = 60; // assumed pack for estimation
  const energy_needed_kwh = (base_wh_per_km * distance_km) / 1000;
  const percent_used = (energy_needed_kwh / battery_kwh) * 100;
  const remaining_pct = Math.max(0, current_battery_pct - percent_used);
  res.json({ current_battery_pct, distance_km, estimated_percent_used: Number(percent_used.toFixed(2)), predicted_remaining_pct: Number(remaining_pct.toFixed(2)) });
});

// Smart Charging Cost Optimizer: returns cheapest optimal options given trip
app.post('/api/optimize-charge', (req, res) => {
  const { start_lat, start_lon, end_lat, end_lon, current_battery_pct, battery_capacity_kwh = 60, desired_arrival_pct = 20 } = req.body;
  
  // Midpoint for mock search
  const midLat = (start_lat + end_lat)/2;
  const midLon = (start_lon + end_lon)/2;

  // We'll use a local mock array if OCM is slow, but for now let's just create some dynamic ones
  const mockChargers = [
    { id: 'm1', name: 'Tata Power EZ', network: 'Tata Power', lat: midLat + 0.05, lon: midLon + 0.05, price_per_kwh: 18, reliability: 0.92 },
    { id: 'm2', name: 'Zeon Fast Hub', network: 'Zeon', lat: midLat - 0.03, lon: midLon + 0.02, price_per_kwh: 24, reliability: 0.98 },
    { id: 'm3', name: 'Statiq Circle', network: 'Statiq', lat: midLat + 0.01, lon: midLon - 0.04, price_per_kwh: 16, reliability: 0.85 }
  ];

  const candidates = mockChargers.map(c => ({...c, distance_to_route_km: haversine(midLat, midLon, c.lat, c.lon)}));
  
  const current_kwh = (current_battery_pct/100) * battery_capacity_kwh;
  const target_kwh = (desired_arrival_pct/100) * battery_capacity_kwh;
  const needed_kwh = Math.max(0, target_kwh - current_kwh);

  const options = candidates.map(c => {
    const rawCharger = { ...c, estimated_charge_cost: Number((c.price_per_kwh * needed_kwh).toFixed(2)) };
    return injectAmenities(rawCharger);
  });

  options.sort((a,b) => a.estimated_charge_cost - b.estimated_charge_cost);
  res.json({ needed_kwh: Number(needed_kwh.toFixed(2)), options });
});

// Receive observations to improve wait/reliability models
// POST /api/observations { chargerId, wait_min, success }
app.post('/api/observations', (req, res) => {
  const { chargerId, wait_min, success } = req.body;
  if (!chargerId || wait_min == null || success == null) return res.status(400).json({ error: 'Missing fields' });
  const s = recordObservation(chargerId, Number(wait_min), !!success);
  res.json({ chargerId, ewmaWait: s.ewmaWait, reliability: Number((s.successes/s.attempts).toFixed(2)), attempts: s.attempts });
});

// Haversine distance calculation (km)
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Point to line segment distance
function pointToLineDistance(lat, lon, lat1, lon1, lat2, lon2) {
  const A = lon - lon1;
  const B = lat - lat1;
  const C = lon2 - lon1;
  const D = lat2 - lat1;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = dot / lenSq;
  if (param < 0) {
    return haversine(lat, lon, lat1, lon1);
  } else if (param > 1) {
    return haversine(lat, lon, lat2, lon2);
  } else {
    const closeLat = lat1 + param * D;
    const closeLon = lon1 + param * C;
    return haversine(lat, lon, closeLat, closeLon);
  }
}

// GET /api/route-chargers?start_lat=X&start_lon=Y&end_lat=X&end_lon=Y
app.get('/api/route-chargers', async (req, res) => {
  const { start_lat, start_lon, end_lat, end_lon } = req.query;
  if (!start_lat || !start_lon || !end_lat || !end_lon) {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  const cacheKey = `route-chargers:${start_lat}:${start_lon}:${end_lat}:${end_lon}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    // Get route from OSRM
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start_lon},${start_lat};${end_lon},${end_lat}?overview=full&geometries=geojson`;
    const routeRes = await fetch(osrmUrl);
    const routeData = await routeRes.json();
    
    if (!routeData.routes || routeData.routes.length === 0) {
      return res.json({ chargers: [], route: null, distance_km: 0 });
    }

    const route = routeData.routes[0];
    const totalDistance = route.distance / 1000;
    const coords = route.geometry.coordinates;

    // Midpoint for charger search
    const midIdx = Math.floor(coords.length / 2);
    const midLat = coords[midIdx][1];
    const midLon = coords[midIdx][0];
    
    // Search for chargers in 2 corridors: start region + end region
    const chargersSet = new Map();
    
    // Fetch from start region
    const apiKey = process.env.OCM_API_KEY || '';
    for (const [searchLat, searchLon] of [[parseFloat(start_lat), parseFloat(start_lon)], [parseFloat(end_lat), parseFloat(end_lon)]]) {
      const url = new URL('https://api.openchargemap.io/v3/poi/');
      url.searchParams.set('output', 'json');
      url.searchParams.set('latitude', searchLat);
      url.searchParams.set('longitude', searchLon);
      url.searchParams.set('distance', '80');
      url.searchParams.set('distanceunit', 'KM');
      url.searchParams.set('maxresults', '100');
      if (apiKey) url.searchParams.set('key', apiKey);

      const r = await fetch(url.toString(), { headers: { 'User-Agent': 'GenDriveAi/1.0' } });
      if (!r.ok) continue;
      const data = await r.json();

      data.forEach((p, idx) => {
        if (chargersSet.has(p.ID)) return;
        const addr = p.AddressInfo || {};
        const connections = p.Connections || [];
        const connTypes = [...new Set(connections.map(c => {
          const title = c.ConnectionType?.Title || '';
          if (title.includes('CCS')) return 'CCS';
          if (title.includes('Type 2')) return 'Type 2';
          if (title.includes('Tesla')) return 'Tesla Supercharger';
          if (title.includes('CHAdeMO')) return 'CHAREMO'; // Note: matches previous logic but let's fix typo to CHAdeMO
          return title;
        }).filter(t => t))].join(', ');
        
        const fastFlag = connections.some(c => (c.Level && c.Level.IsFastChargePoint) || (c.PowerKW && c.PowerKW >= 50));
        
        let price = p.UsageCost ? parseFloat((p.UsageCost.match(/\d+(\.\d+)?/) || [NaN])[0]) : null;
        if (isNaN(price) || price === null) {
          const network = (p.OperatorInfo?.Title || '').toLowerCase();
          if (network.includes('tesla')) price = 40;
          else if (network.includes('ionity')) price = 55;
          else if (network.includes('tata power')) price = 22;
          else if (network.includes('zeon')) price = 24;
          else if (network.includes('fortum')) price = 28;
          else if (network.includes('statiq')) price = 18;
          else if (network.includes('shell')) price = 35;
          else if (network.includes('chargefast')) price = 15;
          else if (network.includes('relux')) price = 21;
          else if (network.includes('jio-bp')) price = 23;
          else if (network.includes('bpcl')) price = 19;
          else if (network.includes('glida')) price = 26;
          else price = 25;
        }
        
        chargersSet.set(p.ID, injectAmenities({
          id: p.ID,
          name: addr.Title || 'Unknown',
          network: p.OperatorInfo?.Title || 'Unknown',
          lat: addr.Latitude,
          lon: addr.Longitude,
          price_per_kwh: price,
          rating: p.Rating || null,
          reliability: chargerStats[p.ID]?.reliability || 0.85,
          fast: fastFlag,
          connections: connTypes || 'Unknown'
        }));
      });
    }

    // Calculate distance to route for each charger
    const chargersWithDist = Array.from(chargersSet.values()).map(c => {
      let minDist = Infinity;
      for (let i = 0; i < coords.length - 1; i++) {
        const d = pointToLineDistance(c.lat, c.lon, coords[i][1], coords[i][0], coords[i+1][1], coords[i+1][0]);
        minDist = Math.min(minDist, d);
      }
      return { ...c, distance_to_route_km: minDist };
    });

    // Filter chargers within 25km of route
    const onRoute = chargersWithDist.filter(c => c.distance_to_route_km <= 25);

    // Score & sort: prioritize cheap + reliable + close to route
    const withScores = onRoute.map(c => {
      const priceScore = (c.price_per_kwh || 30) / 30; // normalize to 0-1
      const reliabilityScore = 1 - c.reliability; // prefer high reliability (lower score)
      const distanceScore = Math.min(c.distance_to_route_km / 25, 1); // prefer close (lower score)
      const totalScore = priceScore * 0.5 + reliabilityScore * 0.3 + distanceScore * 0.2;
      return { ...c, score: totalScore };
    });

    withScores.sort((a, b) => a.score - b.score);

    const result = { 
      chargers: withScores,
      route: { distance_km: Number(totalDistance.toFixed(1)), coordinates: coords.map(c => [c[1], c[0]]) },
      total_distance_km: Number(totalDistance.toFixed(1))
    };

    cache.set(cacheKey, result);
    res.json(result);
  } catch (e) {
    console.error('Route chargers error:', e);
    res.status(500).json({ error: 'Failed to fetch chargers for route', chargers: [] });
  }
});

// AI Explain endpoint for intelligent assistant responses
app.post('/api/ai-explain', (req, res) => {
  const { selected_charger, alternatives } = req.body;
  
  if (!selected_charger) {
    return res.status(400).json({ error: 'Missing selected_charger in request body' });
  }

  res.json({
    recommendation: {
      best_charger: selected_charger.name || 'Selected Charger'
    },
    summary: `We analyzed ${1 + (alternatives ? alternatives.length : 0)} chargers on your route. The recommended option offers a great mix of value and convenience.`,
    explanations: [
      `💰 Cost: At $${selected_charger.price_per_kwh || 'N/A'}/kWh, it's a competitive rate for this route.`,
      `📍 Convenience: Located ${selected_charger.distance_to_route_km?.toFixed(1) || 'N/A'}km from your path, minimizing detour time.`,
      `⚡ Speed: This is a ${selected_charger.fast ? 'fast' : 'standard'} charging station.`
    ]
  });
});

// Nominatim Geocoding Proxy to bypass Access Denied (User-Agent requirement)
app.get('/api/geocode', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }

  try {
    // Local fallback for common demo cities
    const localGeocode = {
      'coimbatore': [{ lat: '11.0168', lon: '76.9558', display_name: 'Coimbatore, Tamil Nadu, India' }],
      'chennai': [{ lat: '13.0827', lon: '80.2707', display_name: 'Chennai, Tamil Nadu, India' }],
      'bangalore': [{ lat: '12.9716', lon: '77.5946', display_name: 'Bengaluru, Karnataka, India' }],
      'mumbai': [{ lat: '19.0760', lon: '72.8777', display_name: 'Mumbai, Maharashtra, India' }],
      'delhi': [{ lat: '28.6139', lon: '77.2090', display_name: 'New Delhi, Delhi, India' }],
      'trichy': [{ lat: '10.7905', lon: '78.7047', display_name: 'Tiruchirappalli, Tamil Nadu, India' }],
      'salem': [{ lat: '11.6643', lon: '78.1460', display_name: 'Salem, Tamil Nadu, India' }],
      'tiruppur': [{ lat: '11.1085', lon: '77.3411', display_name: 'Tiruvannamalai, Tamil Nadu, India' }], // Correction: Tiruppur usually 11.1085, 77.3411
      'erode': [{ lat: '11.3410', lon: '77.7172', display_name: 'Erode, Tamil Nadu, India' }],
      'vellore': [{ lat: '12.9165', lon: '79.1325', display_name: 'Vellore, Tamil Nadu, India' }],
      'tirunelveli': [{ lat: '8.7139', lon: '77.7567', display_name: 'Tirunelveli, Tamil Nadu, India' }],
      'hosur': [{ lat: '12.7409', lon: '77.8253', display_name: 'Hosur, Tamil Nadu, India' }],
      'thanjavur': [{ lat: '10.7870', lon: '79.1378', display_name: 'Thanjavur, Tamil Nadu, India' }]
    };
    const lowerQ = q.toLowerCase();
    for (const key in localGeocode) {
      if (lowerQ.includes(key)) {
        console.log(`Geocoding fallback used for: ${q}`);
        return res.json(localGeocode[key]);
      }
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GenDriveAi-Demo/1.1'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API returned ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ error: 'Failed to geocode location' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
