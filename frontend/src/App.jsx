import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import TripPlanner from './pages/TripPlanner'
import HealthMonitor from './pages/HealthMonitor'
import DrivingCoach from './pages/DrivingCoach'
import ChargingHub from './pages/ChargingHub'
import AIAssistant from './pages/AIAssistant'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TripPlanner />} />
        <Route path="/health" element={<HealthMonitor />} />
        <Route path="/coach" element={<DrivingCoach />} />
        <Route path="/charging-hub" element={<ChargingHub />} />
        <Route path="/ai-assistant" element={<AIAssistant />} />
      </Routes>
    </Router>
  )
}

export default App
