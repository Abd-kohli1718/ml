import Sidebar from '../components/Sidebar'
import HowItWorks from '../components/HowItWorks'
import MicRecorder from '../components/MicRecorder'
import './Dashboard.css'

function Dashboard() {

  return (
    <div className="dashboard-page">
      {/* Desktop background texture */}
      <div className="desk-texture" aria-hidden="true"></div>

      {/* The notebook */}
      <div className="notebook">
        {/* Book edge tabs - left */}
        <div className="book-tabs book-tabs-left" aria-hidden="true">
          <div className="book-tab tab-plus">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
          <div className="book-tab tab-close">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>
        </div>

        {/* Book edge tabs - right */}
        <div className="book-tabs book-tabs-right" aria-hidden="true">
          <div className="book-tab tab-mark"></div>
          <div className="book-tab tab-plus-small">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
          <div className="book-tab tab-arrow">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        {/* Book leather binding */}
        <div className="book-binding-left" aria-hidden="true"></div>
        <div className="book-binding-right" aria-hidden="true"></div>

        {/* ---- LEFT PAGE (Dark) ---- */}
        <div className="notebook-page page-left">
          <Sidebar activeItem="recording" />
        </div>

        {/* ---- CENTER SPINE ---- */}
        <div className="notebook-spine" aria-hidden="true">
          <div className="spine-fold"></div>
          <div className="spine-shadow-left"></div>
          <div className="spine-shadow-right"></div>
          {/* Ribbon bookmark */}
          <div className="ribbon-bookmark">
            <div className="ribbon-tail"></div>
          </div>
        </div>

        {/* ---- CENTER CONTENT (How It Works) ---- */}
        <div className="notebook-page page-center">
          <HowItWorks />
        </div>

        {/* ---- RIGHT PAGE (Light) ---- */}
        <div className="notebook-page page-right">
          <MicRecorder />
        </div>
      </div>
    </div>
  )
}

export default Dashboard
