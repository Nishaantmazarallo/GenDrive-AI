import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import TripPlanner from './pages/TripPlanner'
import HealthMonitor from './pages/HealthMonitor'
import DrivingCoach from './pages/DrivingCoach'
import ChargingHub from './pages/ChargingHub'
import AIAssistant from './pages/AIAssistant'
import BatteryHealth from './pages/BatteryHealth'

function App() {
  return (
    <Router>
      <Navbar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<TripPlanner />} />
          <Route path="/health" element={<HealthMonitor />} />
          <Route path="/coach" element={<DrivingCoach />} />
          <Route path="/charging-hub" element={<ChargingHub />} />
          <Route path="/ai-assistant" element={<AIAssistant />} />
          <Route path="/battery-health" element={<BatteryHealth />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
