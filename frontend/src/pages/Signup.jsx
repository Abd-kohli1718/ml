import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTransition } from '../components/PageTransition'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'
import FormInput from '../components/FormInput'
import '../styles/AuthForms.css'

function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const { navigateWithTransition } = useTransition()
  const { signUpWithEmail, signInWithGoogle } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await signUpWithEmail(email, password, fullName)
      setSuccess('Account created! Check your email to confirm, then log in.')
      setTimeout(() => navigateWithTransition('/login'), 2000)
    } catch (err) {
      setError(err.message || 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message || 'Google sign-in failed')
    }
  }

  return (
    <AuthLayout>
      <div className="auth-content">
        <h1 className="auth-title fade-in-up">Create an Account</h1>
        <p className="auth-subtitle fade-in-up">Join now to start tracking your voice health.</p>

        {error && (
          <p className="fade-in-up" style={{ color: '#c0392b', fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>
            {error}
          </p>
        )}
        {success && (
          <p className="fade-in-up" style={{ color: '#27ae60', fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>
            {success}
          </p>
        )}

        <form onSubmit={handleSubmit} className="auth-form fade-in-up" style={{ marginTop: '24px' }}>
          <div className="input-group">
            <FormInput
              type="text"
              id="signup-fullname"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <FormInput
              type="email"
              id="signup-email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <FormInput
              type="password"
              id="signup-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="checkbox-group">
            <label className="checkbox-wrapper" htmlFor="agree-terms">
              <input
                type="checkbox"
                id="agree-terms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
              />
              <span className="checkbox-box"></span>
              <span className="checkbox-text">I agree to the Terms of Service</span>
            </label>
            <span className="checkbox-subtext">Subscribe to newsletter</span>
          </div>

          <button type="submit" id="signup-button" className="btn-primary" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="switch-text fade-in-up">
          Already have an account? <Link to="/login" className="auth-link">Log in</Link>
        </p>

        <div className="divider fade-in-up">
          <span className="divider-line"></span>
          <span className="divider-text">or</span>
          <span className="divider-line"></span>
        </div>

        <button type="button" id="google-signin-signup" className="btn-google fade-in-up" onClick={handleGoogleSignIn}>
          <svg className="google-icon" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    </AuthLayout>
  )
}

export default Signup
