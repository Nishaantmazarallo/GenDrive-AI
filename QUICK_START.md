# Quick Start Guide

## One-Command Setup (if using npm-run scripts)

### Start Backend (Terminal 1)
```bash
cd backend && npm start
```

### Start Frontend (Terminal 2)
```bash
cd frontend && npm run dev
```

Then open: **http://localhost:3000**

## Available Scripts

### Backend
- `npm start` - Start development server on port 5000
- `npm run dev` - Start with nodemon (auto-restart on changes)

### Frontend
- `npm run dev` - Start Vite dev server on port 3000
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Key Features at a Glance

| Feature | Location | Description |
|---------|----------|-------------|
| **Trip Planning** | Home page | Search locations, get routes, charging stops |
| **Health Monitor** | `/health` | Battery status, voltage trends, charging patterns |
| **Driving Coach** | `/coach` | Efficiency tips, speed analysis, driving advice |

## File Modifications from Original

### What Changed
- Removed Python Flask backend (`app.py`)
- Removed Flask HTML templates
- Removed `requirements.txt`
- Added Express.js backend with REST API
- Added React frontend with Vite
- Added React Router for navigation
- Added Chart.js for visualizations

### What Stayed the Same
- Core business logic and calculations
- UI design and styling themes
- Feature set and functionality
- API data structures (adapted for JSON)

## Environment Variables

Create a `.env` file in the `backend` directory if needed:
```
PORT=5000
NODE_ENV=development
```

## Debugging Tips

### Check API Response
```bash
curl http://localhost:5000/health
curl http://localhost:5000/api/vehicle
```

### Monitor Browser Network Tab
(Open Developer Tools > Network tab to see all API calls)

### Enable CORS Debug
Check backend terminal for CORS-related errors when making requests from frontend.
