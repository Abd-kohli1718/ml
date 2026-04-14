import { useState, useEffect } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { useTransition } from '../components/PageTransition'
import Sidebar from '../components/Sidebar'
import HowItWorks from '../components/HowItWorks'
import { fetchHistory } from '../lib/api'
import './History.css'
import '../pages/Dashboard.css'

// Helper: get score color category
const getScoreCategory = (score) => {
  if (score >= 80) return 'good'
  if (score >= 65) return 'moderate'
  return 'warning'
}

// Helper: map API status to card status
const mapStatus = (status) => {
  if (status === 'Stable') return { status: 'normal', label: 'Normal' }
  if (status === 'Slight Change') return { status: 'mild', label: 'Mild Change' }
  return { status: 'alert', label: 'Alert' }
}

// Helper: generate waveform from score
const generateWaveform = (score) => {
  return Array(20).fill(0).map(() => Math.floor(2 + Math.random() * 8))
}

// ---- Voice Entry Card Component ----
function VoiceCard({ entry, index, isHighlighted }) {
  const category = getScoreCategory(entry.score)

  return (
    <div
      className={`voice-card status-${entry.status}${isHighlighted ? ' highlighted' : ''}`}
      style={{ animationDelay: `${index * 80}ms` }}
      id={`voice-card-${entry.id}`}
    >
      {/* Top: Date + Status + Add button */}
      <div className="card-top">
        <div>
          <div className="card-date">{entry.date}</div>
          <div className={`card-status-badge ${entry.status}`}>
            <span className={`card-status-dot ${entry.status}`}></span>
            {entry.statusLabel}
          </div>
        </div>
        <button className="card-add-btn" aria-label="More options">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Middle: Title + Score */}
      <div className="card-middle">
        <h3 className="card-title">{entry.title}</h3>
        <div className="card-score">
          <span className={`score-number ${category}`}>{entry.score}</span>
          <span className="score-max">/100</span>
          <span className={`score-indicator ${category}`}></span>
        </div>
      </div>

      {/* Insights */}
      <ul className="card-insights">
        {entry.insights.map((insight, i) => (
          <li key={i} className={`card-insight ${i === 0 ? 'highlight' : ''}`}>
            <span className="insight-bullet"></span>
            {insight}
          </li>
        ))}
      </ul>

      {/* Waveform */}
      <div className="card-waveform">
        {entry.waveform.map((h, i) => (
          <div
            key={i}
            className={`card-wave-bar ${entry.status}`}
            style={{ height: `${(h / 10) * 100}%` }}
          />
        ))}
      </div>

      {/* Meta row */}
      <div className="card-meta">
        <span className="meta-item">Score: <span>{entry.score}/100</span></span>
        <span className="meta-item">Status: <span>{entry.statusLabel}</span></span>
      </div>
    </div>
  )
}


// ---- Main History Page ----
function History() {
  const [animateIn, setAnimateIn] = useState(false)
  const { navigateWithTransition } = useTransition()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const highlightDate = searchParams.get('date') || null

  // Real data only — no dummy data
  const [records, setRecords] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    requestAnimationFrame(() => setAnimateIn(true))
  }, [])

  // Fetch real records from API — refetch on every navigation (location.key changes)
  useEffect(() => {
    async function loadRecords() {
      setIsLoading(true)
      try {
        const data = await fetchHistory('all', 50)
        if (data.records && data.records.length > 0) {
          const transformed = data.records.map((r, i) => {
            const statusInfo = mapStatus(r.status)
            const date = new Date(r.created_at)
            return {
              id: r.id || i + 1,
              date: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
              status: statusInfo.status,
              statusLabel: statusInfo.label,
              title: r.summary ? r.summary.split('.')[0] : r.status,
              score: r.health_score || 0,
              insights: r.observations || [],
              waveform: generateWaveform(r.health_score || 50),
              duration: '--',
              pitch: '--',
            }
          })
          setRecords(transformed)
        } else {
          setRecords([])
        }
      } catch (err) {
        console.error('Failed to load history:', err.message)
      } finally {
        setIsLoading(false)
      }
    }
    loadRecords()
  }, [location.key])

  // Auto-scroll to highlighted card
  useEffect(() => {
    if (highlightDate) {
      const matchEntry = records.find(d => d.date === highlightDate)
      if (matchEntry) {
        setTimeout(() => {
          const el = document.getElementById(`voice-card-${matchEntry.id}`)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 600)
      }
    }
  }, [highlightDate, records])

  // Compute stats
  const totalRecords = records.length
  const avgScore = totalRecords > 0
    ? Math.round(records.reduce((sum, d) => sum + d.score, 0) / totalRecords)
    : 0
  const normalCount = records.filter(d => d.status === 'normal').length

  return (
    <div className="dashboard-page">
      <div className="desk-texture" aria-hidden="true"></div>

      <div className="notebook">
        <div className="book-binding-left" aria-hidden="true"></div>
        <div className="book-binding-right" aria-hidden="true"></div>
        <div className="book-tabs book-tabs-left" aria-hidden="true"></div>
        <div className="book-tabs book-tabs-right" aria-hidden="true"></div>

        {/* LEFT PAGE - Sidebar */}
        <div className="notebook-page page-left">
          <Sidebar activeItem="records" />
          {/* Back to dashboard button */}
          <button
            className="history-back-btn"
            onClick={() => navigateWithTransition('/dashboard')}
            id="btn-back-dashboard"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Dashboard
          </button>
        </div>

        {/* SPINE */}
        <div className="notebook-spine" aria-hidden="true">
          <div className="spine-fold"></div>
          <div className="spine-shadow-left"></div>
          <div className="spine-shadow-right"></div>
          <div className="ribbon-bookmark"><div className="ribbon-tail"></div></div>
        </div>

        {/* CENTER - How It Works */}
        <div className="notebook-page page-center">
          <HowItWorks />
        </div>

        {/* RIGHT PAGE - History Content */}
        <div className="notebook-page page-right">
          <div className={`history-content ${animateIn ? 'visible' : ''}`}>

            {/* Header */}
            <div className="history-header">
              <div className="history-header-text">
                <h2 className="history-title">Your Voice History</h2>
                <p className="history-subtitle">
                  Real analysis records from your voice sessions
                </p>
              </div>
              <button className="history-settings-btn" aria-label="Settings" id="btn-history-settings">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              </button>
            </div>

            {/* Stats Bar */}
            {records.length > 0 && (
              <div className="history-stats">
                <div className="history-stat">
                  <div className="stat-value">{totalRecords}</div>
                  <div className="stat-label">Total Records</div>
                </div>
                <div className="history-stat">
                  <div className={`stat-value ${getScoreCategory(avgScore) === 'good' ? 'good' : 'warn'}`}>
                    {avgScore}
                  </div>
                  <div className="stat-label">Avg Score</div>
                </div>
                <div className="history-stat">
                  <div className="stat-value good">{normalCount}</div>
                  <div className="stat-label">Normal Days</div>
                </div>
              </div>
            )}

            {/* Date filter banner (when navigated from Calendar) */}
            {highlightDate && (
              <div className="history-date-banner">
                <div className="date-banner-left">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                    <line x1="16" x2="16" y1="2" y2="6"/>
                    <line x1="8" x2="8" y1="2" y2="6"/>
                    <line x1="3" x2="21" y1="10" y2="10"/>
                  </svg>
                  <span>Viewing record for <strong>{highlightDate}</strong></span>
                </div>
                <button
                  className="date-banner-close"
                  onClick={() => setSearchParams({})}
                  aria-label="Clear filter"
                >✕</button>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="history-empty">
                <p style={{ color: '#b8a080', fontStyle: 'italic' }}>Loading your records...</p>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && records.length === 0 && (
              <div className="history-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#b8a080" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16, opacity: 0.5 }}>
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" x2="12" y1="19" y2="22"/>
                </svg>
                <p style={{ color: '#b8a080', fontWeight: 500, fontSize: '1.05rem' }}>No recordings yet</p>
                <p style={{ color: '#a09080', fontSize: '0.85rem', marginTop: 4 }}>Record your voice to see analysis results here</p>
              </div>
            )}

            {/* Cards Grid */}
            {!isLoading && records.length > 0 && (
              <div className="history-grid">
                {records.map((entry, index) => (
                  <VoiceCard
                    key={entry.id}
                    entry={entry}
                    index={index}
                    isHighlighted={highlightDate === entry.date}
                  />
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

export default History
