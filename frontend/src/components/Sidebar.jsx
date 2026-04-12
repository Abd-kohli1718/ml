import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTransition } from './PageTransition'
import './Sidebar.css'

const menuItems = [
  { id: 'recording', icon: 'mic', label: 'Recording', route: '/dashboard' },
  { id: 'analytics', icon: 'analytics', label: 'Analytics', route: '/analytics' },
  { id: 'calendar', icon: 'calendar', label: 'Calendar', route: '/calendar' },
  { id: 'records', icon: 'records', label: 'Records', route: '/history' },
]

const icons = {
  mic: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" x2="12" y1="19" y2="22"/>
    </svg>
  ),
  analytics: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/>
      <path d="m19 9-5 5-4-4-3 3"/>
    </svg>
  ),
  calendar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
      <line x1="16" x2="16" y1="2" y2="6"/>
      <line x1="8" x2="8" y1="2" y2="6"/>
      <line x1="3" x2="21" y1="10" y2="10"/>
    </svg>
  ),
  records: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" x2="8" y1="13" y2="13"/>
      <line x1="16" x2="8" y1="17" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
}

function Sidebar({ activeItem }) {
  const [hoveredItem, setHoveredItem] = useState(null)
  const { navigateWithTransition, isTransitioning } = useTransition()
  const location = useLocation()

  // Auto-detect active item from route if not provided
  const getActiveFromRoute = () => {
    if (location.pathname === '/analytics') return 'analytics'
    if (location.pathname === '/calendar') return 'calendar'
    if (location.pathname === '/history') return 'records'
    return 'recording'
  }
  const currentActive = activeItem || getActiveFromRoute()

  const handleClick = (item) => {
    // Don't navigate if already on the same route or transitioning
    if (location.pathname === item.route || isTransitioning) return
    navigateWithTransition(item.route)
  }

  return (
    <div className="sidebar">
      {/* Title area */}
      <div className="sidebar-header">
        <h1 className="sidebar-title">Voice Diary</h1>
        <p className="sidebar-subtitle">Your voice. Your health record.</p>
      </div>

      {/* Navigation menu */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const isActive = currentActive === item.id
          return (
            <button
              key={item.id}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => handleClick(item)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              id={`nav-${item.id}`}
            >
              <div className="sidebar-item-left">
                <span className="sidebar-icon">{icons[item.icon]}</span>
                <span className="sidebar-label">{item.label}</span>
              </div>
              <div className="sidebar-item-right">
                <span className={`toggle-dot ${isActive ? 'on' : ''}`}></span>
                <span className={`toggle-dot secondary ${isActive ? 'on' : ''}`}></span>
              </div>
              {isActive && <div className="active-glow"></div>}
            </button>
          )
        })}
      </nav>

      {/* Decorative handwritten text */}
      <div className="sidebar-footer">
        <p className="handwritten-text">Highlight as intended</p>
        <p className="handwritten-text secondary">Feeling strong today</p>
      </div>
    </div>
  )
}

export default Sidebar
