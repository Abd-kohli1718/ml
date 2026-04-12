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
    id: 'calendar',
    label: 'Calendar',
    path: '/calendar',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
        <line x1="16" x2="16" y1="2" y2="6"/>
        <line x1="8" x2="8" y1="2" y2="6"/>
        <line x1="3" x2="21" y1="10" y2="10"/>
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

import { useAuth } from '../context/AuthContext'

function MobileNav() {
  const { navigateWithTransition } = useTransition()
  const location = useLocation()
  const currentPath = location.pathname
  const { signOut } = useAuth()

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      try {
        await signOut()
      } catch (e) {
        console.error(e)
      }
    }
  }

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
      
      {/* Logout Button */}
      <button
        className="mobile-nav-item"
        onClick={handleLogout}
        aria-label="Log out"
        id="mobile-nav-logout"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        <span>Logout</span>
      </button>
    </nav>
  )
}

export default MobileNav
