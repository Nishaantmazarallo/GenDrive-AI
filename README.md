# GenDrive AI - React & Express Version

A modern EV (Electric Vehicle) smart trip planner with vehicle health monitoring and driving coach features.

## Project Structure

```
GenDriveAi/
├── backend/              # Express.js API server
│   ├── package.json
│   ├── server.js        # Main API server with all routes
│   └── node_modules/
├── frontend/            # React + Vite frontend
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── pages/
│       │   ├── TripPlanner.jsx      # Main trip planning page
│       │   ├── TripPlanner.css
│       │   ├── HealthMonitor.jsx    # Vehicle health monitoring
│       │   ├── HealthMonitor.css
│       │   ├── DrivingCoach.jsx     # Driving optimization tips
│       │   └── DrivingCoach.css
│       └── components/
└── README.md
```

## Features

### 🗺️ Trip Planner
- **Location Autocomplete**: Search for start and destination using Nominatim
- **Route Visualization**: Interactive map with Leaflet and OSRM routing
- **Charging Calculations**: Automatic charging stop recommendations based on battery vs distance
- **Real-time Vehicle Data**: Display battery percentage and estimated range

### 🔋 Vehicle Health Monitor
- **Battery Metrics**: Voltage, temperature, health percentage
- **Historical Trends**: Charts showing voltage degradation and charging patterns
- **Charging History**: Last 7 charging sessions with wear pattern analysis
- **AI Diagnostics**: Automated health status alerts

### 🚗 Driving Coach
- **Efficiency Metrics**: Real-time driving efficiency score (0-100)
- **Speed Impact Analysis**: Visual chart showing range loss at higher speeds
- **Driving Style Analysis**: AI recommendations for optimizing efficiency
- **Energy Optimization**: Focus on regenerative braking and smooth acceleration

## Technologies Used

### Frontend
- **React 18** - UI framework
- **React Router** - Client-side routing
- **Vite** - Build tool and dev server
- **Leaflet** - Interactive maps
- **Chart.js** - Data visualization
- **Axios** - HTTP client
- **CSS3** - Modern styling

### Backend
- **Express.js** - REST API framework
- **CORS** - Cross-origin resource sharing
- **Node.js** - JavaScript runtime

### External APIs
- **Nominatim** - Location geocoding and search
- **OSRM** - Open Source Routing Machine (routing)
- **OpenStreetMap** - Map tiles

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm (v8 or higher)

### Installation

1. **Navigate to backend and install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Navigate to frontend and install dependencies:**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

**Terminal 1 - Start Backend Server:**
```bash
cd backend
npm start
```
Backend will run on `http://localhost:5000`

**Terminal 2 - Start Frontend Dev Server:**
```bash
cd frontend
npm run dev
```
Frontend will run on `http://localhost:3000`

Open `http://localhost:3000` in your browser to access the application.

## API Endpoints

### `/api/vehicle` (GET)
Returns current vehicle status:
```json
{
  "battery_percent": 85,
  "estimated_range_km": 272,
  "voltage": 12.6,
  "temperature": 30,
  "health_status": "Normal"
}
```

### Basic CRUD Example (demo items)
To illustrate typical CRUD operations, the backend exposes a simple in-memory store at `/api/items`:

- **Create**: `POST /api/items` with JSON `{ "name": "Example", "data": { ... } }` returns the created item with `id`.
- **List**: `GET /api/items` returns an array of items.
- **Read**: `GET /api/items/:id` returns a single item by ID.
- **Update**: `PUT /api/items/:id` with fields `name` and/or `data` updates the item.
- **Delete**: `DELETE /api/items/:id` removes the item and returns it.

Example curl commands:
```bash
# create
curl -X POST http://localhost:5000/api/items -H "Content-Type: application/json" \
  -d '{"name":"test","data":{"foo":"bar"}}'

# list
curl http://localhost:5000/api/items

# update
curl -X PUT http://localhost:5000/api/items/1 -H "Content-Type: application/json" \
  -d '{"name":"updated"}'

# delete
curl -X DELETE http://localhost:5000/api/items/1
```

### `/api/trip` (POST)
Plans a trip with charging calculations:
**Request:**
```json
{
  "start": "Location A",
  "end": "Location B"
}
```
**Response:**
```json
{
  "distance": 450,
  "safe_range": 272.5,
  "message": "Charging required...",
  "charging_stops": 1
}
```

### `/api/health` (GET)
Returns detailed vehicle health metrics with historical data

### `/api/coach` (GET)
Returns driving efficiency analysis and recommendations

## Component Overview

### TripPlanner.jsx
Main page with:
- Battery and range display
- Location search with autocomplete
- Interactive map with route visualization
- Charging stop markers
- Trip results display

### HealthMonitor.jsx
Health dashboard with:
- 7 core metrics cards
- Voltage trend chart
- Charging history with wear analysis
- Responsive grid layout

### DrivingCoach.jsx
Coaching page with:
- 8 efficiency metric cards
- Efficiency trend chart
- Speed vs. range impact analysis
- AI-driven recommendations

## Styling

The app uses a modern dark theme with:
- **Primary Colors**: Cyan (#38bdf8), Green (#22c55e), Red (#f87171)
- **Background**: Dark blue-gray gradient
- **Component Cards**: Layered gradient backgrounds with shadows
- **Responsive Design**: Mobile-friendly with flexbox/grid layouts

## Development

### Hot Module Replacement (HMR)
Vite provides instant module replacement during development. Changes to React components will reflect immediately in the browser.

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
```
Creates optimized bundle in `frontend/dist/`

**Backend:**
For production, use a process manager like PM2:
```bash
npm install -g pm2
pm2 start backend/server.js
```

## Future Enhancements

- [ ] User authentication and profiles
- [ ] Real vehicle data integration (OBD-II)
- [ ] Trip history and statistics
- [ ] Charging station finder integration
- [ ] Real-time traffic integration
- [ ] Mobile app version
- [ ] WebSocket for live data updates
- [ ] Database integration (MongoDB/PostgreSQL)

## Troubleshooting

### Port Already in Use
- Backend: `lsof -i :5000` and `kill -9 <PID>` to free port 5000
- Frontend: `lsof -i :3000` and `kill -9 <PID>` to free port 3000

### CORS Issues
Ensure backend server is running on port 5000 before starting frontend.

### Map Not Loading
Check browser console for errors. Ensure Leaflet CSS is loaded in `index.html`.

### API Errors
Verify backend server is running and check `/health` endpoint at `http://localhost:5000/health`

## License

MIT License - Feel free to use and modify this project.

## Support

For issues and feature requests, please create an issue in the repository.
