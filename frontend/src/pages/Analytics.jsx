import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import HowItWorks from '../components/HowItWorks'
import { fetchHistory, fetchTrend } from '../lib/api'
import './Analytics.css'
import '../pages/Dashboard.css'

function Analytics() {
  const [animateIn, setAnimateIn] = useState(false)
  const [chartProgress, setChartProgress] = useState(0)
  const [healthScore, setHealthScore] = useState(0)
  const [trendText, setTrendText] = useState('')
  const [scores, setScores] = useState([])
  const [insights, setInsights] = useState([])
  const [statusCounts, setStatusCounts] = useState({ stable: 0, mild: 0, alert: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [recordCount, setRecordCount] = useState(0)

  useEffect(() => {
    requestAnimationFrame(() => setAnimateIn(true))
    let start = Date.now()
    const duration = 1200
    const animate = () => {
      const p = Math.min((Date.now() - start) / duration, 1)
      setChartProgress(p)
      if (p < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)

    // Fetch real data
    async function loadData() {
      setIsLoading(true)
      try {
        const [historyData, trendData] = await Promise.all([
          fetchHistory('all', 50),
          fetchTrend('all'),
        ])

        if (trendData.latest_score != null) setHealthScore(Math.round(trendData.latest_score))
        if (trendData.trend_summary) setTrendText(trendData.trend_summary)
        if (trendData.record_count != null) setRecordCount(trendData.record_count)

        if (historyData.records && historyData.records.length > 0) {
          const recs = historyData.records
          // Scores for line chart (oldest first)
          setScores(recs.map(r => r.health_score || 0).reverse())

          // Count statuses
          const counts = { stable: 0, mild: 0, alert: 0 }
          recs.forEach(r => {
            if (r.status === 'Stable') counts.stable++
            else if (r.status === 'Slight Change') counts.mild++
            else counts.alert++
          })
          setStatusCounts(counts)

          // Insights from latest record
          const latest = recs[0]
          if (latest.observations && latest.observations.length > 0) {
            setInsights(latest.observations.slice(0, 4))
          }
        }
      } catch (err) {
        console.error('Analytics load failed:', err.message)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // Line chart
  const chartW = 280, chartH = 120
  const buildPath = () => {
    if (scores.length < 2) return ''
    const step = chartW / (scores.length - 1)
    return scores.map((val, i) => {
      const x = i * step
      const y = chartH - (val / 100) * chartH
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    }).join(' ')
  }
  const buildArea = () => {
    const path = buildPath()
    if (!path) return ''
    return `${path} L${chartW},${chartH} L0,${chartH} Z`
  }

  // Donut chart
  const total = statusCounts.stable + statusCounts.mild + statusCounts.alert
  const donutSegments = total > 0 ? [
    { label: 'Stable', pct: (statusCounts.stable / total) * 100, color: '#5BA68A' },
    { label: 'Mild', pct: (statusCounts.mild / total) * 100, color: '#E8954C' },
    { label: 'Alert', pct: (statusCounts.alert / total) * 100, color: '#6B9EC4' },
  ].filter(s => s.pct > 0) : []

  const donutRadius = 50
  const donutCircum = 2 * Math.PI * donutRadius
  let donutOffset = 0

  return (
    <div className="dashboard-page">
      <div className="desk-texture" aria-hidden="true"></div>

      <div className="notebook">
        <div className="book-binding-left" aria-hidden="true"></div>
        <div className="book-binding-right" aria-hidden="true"></div>
        <div className="book-tabs book-tabs-left" aria-hidden="true"></div>
        <div className="book-tabs book-tabs-right" aria-hidden="true"></div>

        <div className="notebook-page page-left">
          <Sidebar activeItem="analytics" />
        </div>

        <div className="notebook-spine" aria-hidden="true">
          <div className="spine-fold"></div>
          <div className="spine-shadow-left"></div>
          <div className="spine-shadow-right"></div>
          <div className="ribbon-bookmark"><div className="ribbon-tail"></div></div>
        </div>

        <div className="notebook-page page-center">
          <HowItWorks />
        </div>

        <div className="notebook-page page-right">
          <div className={`analytics-content ${animateIn ? 'visible' : ''}`}>

            <div className="analytics-header">
              <h2 className="analytics-title">Health Insights</h2>
              <p className="analytics-subtitle">
                {recordCount > 0 ? `Based on ${recordCount} recording${recordCount > 1 ? 's' : ''}` : 'Record your voice to see analytics'}
              </p>
            </div>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#b8a080', fontStyle: 'italic' }}>Loading analytics...</div>
            ) : recordCount === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#b8a080" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 16, opacity: 0.5 }}>
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" x2="12" y1="19" y2="22"/>
                </svg>
                <p style={{ color: '#b8a080', fontWeight: 500 }}>No data yet</p>
                <p style={{ color: '#a09080', fontSize: '0.85rem', marginTop: 4 }}>Record your voice to see health analytics here</p>
              </div>
            ) : (
              <div className="analytics-grid">

                {/* Line Chart — Voice Score Trend */}
                <div className="analytics-card chart-card">
                  <h3 className="card-title">Voice Score Trend ({scores.length} recordings)</h3>
                  <div className="line-chart-container">
                    {scores.length >= 2 ? (
                      <svg viewBox={`-30 -10 ${chartW + 40} ${chartH + 30}`} className="line-chart-svg">
                        {[0, 25, 50, 75, 100].map(v => {
                          const y = chartH - (v / 100) * chartH
                          return (
                            <g key={v}>
                              <line x1="0" y1={y} x2={chartW} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />
                              <text x="-8" y={y + 4} fontSize="8" fill="#aaa" textAnchor="end">{v}</text>
                            </g>
                          )
                        })}
                        <path d={buildArea()} fill="url(#areaGrad)" opacity={chartProgress} />
                        <path d={buildPath()} fill="none" stroke="#5BA68A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          strokeDasharray={chartW * 3} strokeDashoffset={chartW * 3 * (1 - chartProgress)}
                          style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
                        {scores.map((val, i) => {
                          const x = i * (chartW / (scores.length - 1))
                          const y = chartH - (val / 100) * chartH
                          return <circle key={i} cx={x} cy={y} r="3" fill="#5BA68A" opacity={chartProgress} style={{ transition: `opacity 0.3s ease ${i * 0.08}s` }} />
                        })}
                        <defs>
                          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#5BA68A" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#5BA68A" stopOpacity="0.02" />
                          </linearGradient>
                        </defs>
                      </svg>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '30px', color: '#b8a080', fontSize: '0.85rem' }}>
                        Need at least 2 recordings to show trend chart
                      </div>
                    )}
                  </div>
                </div>

                {/* Donut — Status Distribution */}
                <div className="analytics-card controls-card">
                  <div className="donut-container">
                    <svg viewBox="0 0 130 130" className="donut-svg">
                      {donutSegments.map((seg, i) => {
                        const dashLen = (seg.pct / 100) * donutCircum * chartProgress
                        const offset = donutOffset
                        donutOffset += (seg.pct / 100) * donutCircum
                        return (
                          <circle key={i} cx="65" cy="65" r={donutRadius} fill="none"
                            stroke={seg.color} strokeWidth="14"
                            strokeDasharray={`${dashLen} ${donutCircum}`}
                            strokeDashoffset={-offset} transform="rotate(-90 65 65)"
                            strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
                        )
                      })}
                      <text x="65" y="62" textAnchor="middle" fontSize="16" fontWeight="700" fill="#2d2520">{healthScore}</text>
                      <text x="65" y="76" textAnchor="middle" fontSize="8" fill="#999">/100</text>
                    </svg>
                    <div className="donut-legend">
                      {donutSegments.map((seg, i) => (
                        <div className="legend-item" key={i}>
                          <span className="legend-dot" style={{ background: seg.color }}></span>
                          <span className="legend-label">{seg.label} ({Math.round(seg.pct)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="controls-section">
                    <div className="control-row">
                      <div className="control-info">
                        <span className="control-label">Total Recordings</span>
                        <span className="control-desc">{recordCount}</span>
                      </div>
                    </div>
                    <div className="control-row">
                      <div className="control-info">
                        <span className="control-label">Avg Score</span>
                        <span className="control-desc">{scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0}/100</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Insights */}
                <div className="analytics-card insights-card" style={{ gridColumn: '1 / -1' }}>
                  <h3 className="card-title">Latest Insights</h3>
                  {insights.length > 0 ? (
                    <ul className="insights-list">
                      {insights.map((insight, i) => (
                        <li key={i} className={`insight-item ${i === 0 ? 'good' : 'warn'}`}>
                          <span className="insight-dot"></span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: '#b8a080', fontStyle: 'italic', padding: '10px 0' }}>No insights yet. Record your voice to get health observations.</p>
                  )}

                  <div className="score-badge">
                    <div className="score-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    </div>
                    <div className="score-text">
                      <span className="score-label">Voice Health Score</span>
                      <span className="score-value">{healthScore}<span className="score-max">/100</span></span>
                      <span className="score-desc">{trendText || 'Based on your voice recordings'}</span>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
