import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTransition } from '../components/PageTransition'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'
import FormInput from '../components/FormInput'
import '../styles/AuthForms.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { navigateWithTransition } = useTransition()
  const { signInWithGoogle, signInWithEmail } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmail(email, password)
      navigateWithTransition('/dashboard')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    try {
      await signInWithGoogle()
      // OAuth redirect happens automatically
    } catch (err) {
      setError(err.message || 'Google sign-in failed')
    }
  }

  return (
    <AuthLayout>
      <div className="auth-content">
        <h1 className="auth-title fade-in-up">Welcome Back</h1>
        <p className="auth-subtitle fade-in-up">Track your Voice. Understand your health.</p>
        <p className="auth-description fade-in-up">
          AI-powered voice analysis to monitor health changes and detect early signs of disease
        </p>

        {error && (
          <p className="fade-in-up" style={{ color: '#c0392b', fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="auth-form fade-in-up">
          <div className="input-group">
            <FormInput
              type="email"
              id="login-email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <FormInput
              type="password"
              id="login-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="checkbox-group">
            <label className="checkbox-wrapper" htmlFor="remember-me">
              <input
                type="checkbox"
                id="remember-me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="checkbox-box"></span>
              <span className="checkbox-text">Remember me</span>
            </label>
          </div>

          <button type="submit" id="login-button" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <Link to="#" className="auth-link forgot-link fade-in-up">
          Forgot password?
        </Link>

        <div className="divider fade-in-up">
          <span className="divider-line"></span>
          <span className="divider-text">or</span>
          <span className="divider-line"></span>
        </div>

        <button type="button" id="google-signin-login" className="btn-google fade-in-up" onClick={handleGoogleSignIn}>
          <svg className="google-icon" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>

        <p className="switch-text fade-in-up">
          Don't have an account? <Link to="/signup" className="auth-link">Sign up</Link>
        </p>
      </div>
    </AuthLayout>
  )
}

export default Login
