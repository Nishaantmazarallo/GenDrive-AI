import { Link, useLocation } from 'react-router-dom'
import './Navbar.css'

export default function Navbar() {
  const location = useLocation()
  
  return (
    <nav className="navbar">
      <div className="nav-brand">
        <span className="logo">⚡ GenDrive AI</span>
      </div>
      <div className="nav-links">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Trip Planner</Link>
        <Link to="/charging-hub" className={location.pathname === '/charging-hub' ? 'active' : ''}>Charging Hub</Link>
        <Link to="/health" className={location.pathname === '/health' ? 'active' : ''}>Health Monitor</Link>
        <Link to="/battery-health" className={location.pathname === '/battery-health' ? 'active' : ''}>AI Diagnostics 🔋</Link>
        <Link to="/ai-assistant" className={`ai-btn ${location.pathname === '/ai-assistant' ? 'active' : ''}`}>AI Assistant ✨</Link>
      </div>
    </nav>
  )
}
