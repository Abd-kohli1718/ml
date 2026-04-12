import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { TransitionProvider } from './components/PageTransition'
import { AuthProvider, useAuth } from './context/AuthContext'
import MobileNav from './components/MobileNav'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Record from './pages/Record'
import Analytics from './pages/Analytics'
import Calendar from './pages/Calendar'
import History from './pages/History'
import './styles/mobile.css'

// Protected route wrapper — redirects to login if not authenticated
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#8a7e6b' }}>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

// Public route — redirects to dashboard if already logged in
function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#8a7e6b' }}>Loading...</div>
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

// Inner app — renders routes + mobile nav (needs to be inside Router for useLocation)
function AppRoutes() {
  const { user } = useAuth()

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/record" element={<ProtectedRoute><Record /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
      </Routes>
      {/* Mobile bottom nav — only shown when user is logged in, hidden on desktop via CSS */}
      {user && <MobileNav />}
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        {/* TransitionProvider wraps all routes — enables cinematic transitions app-wide */}
        <TransitionProvider>
          <AppRoutes />
        </TransitionProvider>
      </Router>
    </AuthProvider>
  )
}

export default App
