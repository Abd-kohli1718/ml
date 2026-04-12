/**
 * MobileNav.jsx — Bottom navigation bar for mobile screens.
 * Only visible on screens < 768px (controlled by CSS).
 */
import { useTransition } from './PageTransition'
import { useLocation } from 'react-router-dom'

const navItems = [
  {
    id: 'dashboard',
    label: 'Home',
    path: '/dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: 'record',
    label: 'Record',
    path: '/record',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" x2="12" y1="19" y2="22"/>
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'History',
    path: '/history',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    id: 'analytics',
    label: 'Insights',
    path: '/analytics',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
]

function MobileNav() {
  const { navigateWithTransition } = useTransition()
  const location = useLocation()
  const currentPath = location.pathname

  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {navItems.map(item => (
        <button
          key={item.id}
          className={`mobile-nav-item ${currentPath === item.path ? 'active' : ''}`}
          onClick={() => navigateWithTransition(item.path)}
          aria-label={item.label}
          id={`mobile-nav-${item.id}`}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

export default MobileNav
