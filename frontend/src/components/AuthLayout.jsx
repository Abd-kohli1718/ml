import leftPanel from '../assets/left-panel.png'
import rightPanel from '../assets/right-panel.png'
import './AuthLayout.css'

function AuthLayout({ children }) {
  return (
    <div className="auth-page">
      {/* Full-screen split background */}
      <div className="auth-bg">
        <div className="auth-bg-left">
          <img src={leftPanel} alt="" className="bg-image" draggable="false" />
          <div className="bg-left-overlay"></div>
          {/* Floating sketch elements */}
          <div className="floating-element float-1">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(120,100,80,0.15)" strokeWidth="1">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div className="floating-element float-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(120,100,80,0.12)" strokeWidth="1">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
        </div>
        <div className="auth-bg-right">
          <img src={rightPanel} alt="" className="bg-image" draggable="false" />
          <div className="bg-right-overlay"></div>
          {/* Floating medical shapes */}
          <div className="floating-element float-3">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </div>
          <div className="floating-element float-4">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5">
              <path d="M12 2v20M2 12h20"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Centered glass card */}
      <div className="auth-card-container">
        <div className="auth-card">
          <div className="auth-card-inner">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
