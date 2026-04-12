import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import HowItWorks from '../components/HowItWorks'
import { fetchHistory, fetchTrend } from '../lib/api'
import './Analytics.css'
import '../pages/Dashboard.css'

// Mock pitch data for the line chart
const pitchData = [35, 55, 42, 68, 50, 75, 60, 45, 70, 55, 48, 62]
const pitchLabels = ['0', '50', '100', '150', '200', '250', '300']

// Mock bar data for mood analysis
const moodData = {
  stress: [4, 6, 8, 5, 3, 7],
  energy: [5, 7, 3, 6, 8, 4],
  sleep: [7, 5, 6, 8, 4, 9],
}

// Donut chart data
const donutSegments = [
  { label: 'Stable', pct: 55, color: '#5BA68A' },
  { label: 'Variable', pct: 28, color: '#E8954C' },
  { label: 'Alert', pct: 17, color: '#6B9EC4' },
]

function Analytics() {
  const [animateIn, setAnimateIn] = useState(false)
  const [chartProgress, setChartProgress] = useState(0)
  const [speechRate, setSpeechRate] = useState(true)
  const [tremorRange, setTremorRange] = useState('weekly')
  const [healthScore, setHealthScore] = useState(82)
  const [trendText, setTrendText] = useState('')
  const [realInsights, setRealInsights] = useState(null)
  const [realScores, setRealScores] = useState(null)

  useEffect(() => {
    requestAnimationFrame(() => setAnimateIn(true))
    // Animate charts progressively
    let start = Date.now()
    const duration = 1200
    const animate = () => {
      const elapsed = Date.now() - start
      const p = Math.min(elapsed / duration, 1)
      setChartProgress(p)
      if (p < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)

    // Fetch real data from API
    async function loadData() {
      try {
        const [historyData, trendData] = await Promise.all([
          fetchHistory('month', 12),
          fetchTrend('month'),
        ])
        if (trendData.latest_score != null) {
          setHealthScore(Math.round(trendData.latest_score))
        }
        if (trendData.trend_summary) {
          setTrendText(trendData.trend_summary)
        }
        if (historyData.records && historyData.records.length > 0) {
          // Use real scores for the line chart
          const scores = historyData.records.map(r => r.health_score || 50).reverse()
          setRealScores(scores)
          // Use real observations for insights
          const latest = historyData.records[0]
          if (latest.observations && latest.observations.length > 0) {
            setRealInsights(latest.observations.slice(0, 3))
          }
        }
      } catch (err) {
        console.log('Analytics using mock data:', err.message)
      }
    }
    loadData()
  }, [])

  // Build SVG path for pitch line chart — use real scores if available
  const chartData = realScores || pitchData
  const chartW = 280, chartH = 120
  const buildPath = () => {
    const len = chartData.length
    const step = chartW / (len - 1)
    const maxVal = 100
    return chartData.map((val, i) => {
      const x = i * step
      const y = chartH - (val / maxVal) * chartH
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    }).join(' ')
  }
  const buildArea = () => {
    const path = buildPath()
    return `${path} L${chartW},${chartH} L0,${chartH} Z`
  }

  // Donut chart SVG
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

        {/* LEFT PAGE */}
        <div className="notebook-page page-left">
          <Sidebar activeItem="analytics" />
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

        {/* RIGHT PAGE - Analytics Content */}
        <div className="notebook-page page-right">
          <div className={`analytics-content ${animateIn ? 'visible' : ''}`}>

            {/* Header */}
            <div className="analytics-header">
              <h2 className="analytics-title">Health Insights</h2>
              <p className="analytics-subtitle">Understanding your voice patterns over time</p>
            </div>

            {/* Charts Grid */}
            <div className="analytics-grid">

              {/* ---- TOP LEFT: Pitch Variation Chart ---- */}
              <div className="analytics-card chart-card">
                <h3 className="card-title">Voice Trend – Last 30 Days</h3>
                <div className="line-chart-container">
                  <svg viewBox={`-30 -10 ${chartW + 40} ${chartH + 30}`} className="line-chart-svg">
                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map(v => {
                      const y = chartH - (v / 100) * chartH
                      return (
                        <g key={v}>
                          <line x1="0" y1={y} x2={chartW} y2={y}
                            stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />
                          <text x="-8" y={y + 4} fontSize="8" fill="#aaa" textAnchor="end">{v}</text>
                        </g>
                      )
                    })}
                    {/* X-axis labels */}
                    {pitchLabels.map((lbl, i) => (
                      <text key={i} x={i * (chartW / 6)} y={chartH + 16}
                        fontSize="7" fill="#aaa" textAnchor="middle">{lbl}</text>
                    ))}
                    {/* Area fill */}
                    <path
                      d={buildArea()}
                      fill="url(#areaGrad)"
                      opacity={chartProgress}
                    />
                    {/* Line */}
                    <path
                      d={buildPath()}
                      fill="none"
                      stroke="#5BA68A"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={chartW * 3}
                      strokeDashoffset={chartW * 3 * (1 - chartProgress)}
                      style={{ transition: 'stroke-dashoffset 1.2s ease' }}
                    />
                    {/* Data dots */}
                    {chartData.map((val, i) => {
                      const x = i * (chartW / (chartData.length - 1))
                      const y = chartH - (val / 100) * chartH
                      return (
                        <circle key={i} cx={x} cy={y} r="3"
                          fill="#5BA68A" opacity={chartProgress}
                          style={{ transition: `opacity 0.3s ease ${i * 0.08}s` }}
                        />
                      )
                    })}
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5BA68A" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#5BA68A" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* ---- TOP RIGHT: Donut + Controls ---- */}
              <div className="analytics-card controls-card">
                {/* Donut chart */}
                <div className="donut-container">
                  <svg viewBox="0 0 130 130" className="donut-svg">
                    {donutSegments.map((seg, i) => {
                      const dashLen = (seg.pct / 100) * donutCircum * chartProgress
                      const offset = donutOffset
                      donutOffset += (seg.pct / 100) * donutCircum
                      return (
                        <circle key={i}
                          cx="65" cy="65" r={donutRadius}
                          fill="none"
                          stroke={seg.color}
                          strokeWidth="14"
                          strokeDasharray={`${dashLen} ${donutCircum}`}
                          strokeDashoffset={-offset}
                          transform="rotate(-90 65 65)"
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dasharray 1s ease' }}
                        />
                      )
                    })}
                    {/* Center text */}
                    <text x="65" y="62" textAnchor="middle" fontSize="16" fontWeight="700" fill="#2d2520">{healthScore}</text>
                    <text x="65" y="76" textAnchor="middle" fontSize="8" fill="#999">/100</text>
                  </svg>
                  <div className="donut-legend">
                    {donutSegments.map((seg, i) => (
                      <div className="legend-item" key={i}>
                        <span className="legend-dot" style={{ background: seg.color }}></span>
                        <span className="legend-label">{seg.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Toggle controls */}
                <div className="controls-section">
                  <div className="control-row">
                    <div className="control-info">
                      <span className="control-label">Speech Rate</span>
                      <span className="control-desc">Words per minute</span>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={speechRate}
                        onChange={(e) => setSpeechRate(e.target.checked)} />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <div className="control-row">
                    <div className="control-info">
                      <span className="control-label">Tremor Instability</span>
                    </div>
                    <div className="range-toggle">
                      <button className={`range-btn ${tremorRange === 'weekly' ? 'active' : ''}`}
                        onClick={() => setTremorRange('weekly')}>W</button>
                      <button className={`range-btn ${tremorRange === 'monthly' ? 'active' : ''}`}
                        onClick={() => setTremorRange('monthly')}>M</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ---- BOTTOM LEFT: Bar Chart (Mood Analysis) ---- */}
              <div className="analytics-card mood-card">
                <h3 className="card-title">Mood Analysis</h3>
                <div className="bar-chart-row">
                  {Object.entries(moodData).map(([key, values]) => (
                    <div className="bar-group" key={key}>
                      <div className="bars">
                        {values.map((v, i) => (
                          <div key={i} className="bar-wrapper">
                            <div
                              className={`bar bar-${key}`}
                              style={{
                                height: `${(v / 10) * 100 * chartProgress}%`,
                                transition: `height 0.8s ease ${i * 0.1}s`,
                              }}
                            ></div>
                          </div>
                        ))}
                      </div>
                      <span className="bar-label">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ---- BOTTOM RIGHT: Insights + Score ---- */}
              <div className="analytics-card insights-card">
                <h3 className="card-title">Insights</h3>
                <ul className="insights-list">
                  {(realInsights || [
                    'Your voice has remained stable this week',
                    'Slight increase in pauses detected',
                    'Pitch variation is within normal range',
                  ]).map((insight, i) => (
                    <li key={i} className={`insight-item ${i === 1 ? 'warn' : 'good'}`}>
                      <span className="insight-dot"></span>
                      {insight}
                    </li>
                  ))}
                </ul>

                {/* Voice Health Score card */}
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
                    <span className="score-desc">{trendText || 'Based on recent voice patterns'}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
