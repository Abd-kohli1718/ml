import { useTransition } from './PageTransition'
import { useAuth } from '../context/AuthContext'
import './HowItWorks.css'

const steps = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" x2="12" y1="19" y2="22"/>
      </svg>
    ),
    title: 'Record Voice',
    desc: 'Speak naturally',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8V4H8"/>
        <rect width="16" height="12" x="4" y="8" rx="2"/>
        <path d="M2 14h2"/>
        <path d="M20 14h2"/>
        <path d="M15 13v2"/>
        <path d="M9 13v2"/>
      </svg>
    ),
    title: 'AI',
    desc: 'Speak naturally',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/>
        <path d="m19 9-5 5-4-4-3 3"/>
      </svg>
    ),
    title: 'AI Analysis',
    desc: 'Understand past patterns',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
    title: 'Track Progress',
    desc: 'Visualize well-being',
  },
]

function HowItWorks() {
  const { navigateWithTransition } = useTransition()
  const { signOut } = useAuth()

  return (
    <div className="how-it-works">
      <h3 className="hiw-title">How It Works</h3>
      <div className="hiw-steps">
        {steps.map((step, i) => (
          <div className="hiw-step" key={i}>
            <div className="hiw-icon-circle">
              {step.icon}
            </div>
            <div className="hiw-text">
              <p className="hiw-step-title">{step.title}</p>
              <p className="hiw-step-desc">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>


      {/* Logout button */}
      <button className="logout-btn" onClick={() => signOut()} id="logout-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Log Out
      </button>
    </div>
  )
}

export default HowItWorks
