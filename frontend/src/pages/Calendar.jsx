import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import HowItWorks from '../components/HowItWorks'
import { useTransition } from '../components/PageTransition'
import { fetchHistory } from '../lib/api'
import './Calendar.css'
import '../pages/Dashboard.css'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

// Map API status → calendar status
const mapStatus = (status) => {
  if (status === 'Stable') return { status: 'normal', label: 'Normal' }
  if (status === 'Slight Change') return { status: 'mild', label: 'Mild Change' }
  return { status: 'alert', label: 'Alert' }
}

// ---- DayCard Component ----
function DayCard({ day, data, isToday, isSelected, onClick, animDelay }) {
  if (!day) return <div className="day-card empty" />

  const status = data?.status || null
  const statusClass = status ? `status-${status}` : ''
  const todayClass = isToday ? 'today' : ''
  const selectedClass = isSelected ? 'selected' : ''

  return (
    <div
      className={`day-card ${statusClass} ${todayClass} ${selectedClass}`}
      onClick={() => data && onClick(day)}
      style={{ animationDelay: `${animDelay}ms`, cursor: data ? 'pointer' : 'default' }}
      id={`day-card-${day}`}
    >
      <span className="day-number">{day}</span>
      {data && data.waveform && (
        <div className="day-waveform">
          {data.waveform.slice(0, 6).map((h, i) => (
            <div key={i} className={`waveform-bar ${data.status}`} style={{ height: `${h}px` }} />
          ))}
        </div>
      )}
      {data && (
        <span className={`day-status-tag ${data.status}`}>
          {data.label}
        </span>
      )}
    </div>
  )
}

// ---- CalendarGrid Component ----
function CalendarGrid({ year, month, healthData, selectedDay, onDayClick }) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  const cells = []
  for (let i = 0; i < firstDay; i++) {
    cells.push(<DayCard key={`empty-${i}`} day={null} animDelay={0} onClick={() => {}} />)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = isCurrentMonth && today.getDate() === d
    cells.push(
      <DayCard
        key={d}
        day={d}
        data={healthData[d]}
        isToday={isToday}
        isSelected={selectedDay === d}
        onClick={onDayClick}
        animDelay={(firstDay + d) * 25}
      />
    )
  }

  return (
    <div className="calendar-grid-wrapper">
      <div className="calendar-weekdays">
        {WEEKDAYS.map(w => <div key={w} className="weekday-label">{w}</div>)}
      </div>
      <div className="calendar-grid">{cells}</div>
    </div>
  )
}


// ---- Main Calendar Page ----
function Calendar() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [healthData, setHealthData] = useState({})
  const [selectedDay, setSelectedDay] = useState(null)
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 })
  const [animateIn, setAnimateIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const popupRef = useRef(null)
  const { navigateWithTransition } = useTransition()

  useEffect(() => {
    requestAnimationFrame(() => setAnimateIn(true))
  }, [])

  // Fetch real data when month changes
  useEffect(() => {
    async function loadCalendarData() {
      setIsLoading(true)
      setSelectedDay(null)
      const data = {}

      try {
        const result = await fetchHistory('all', 100)
        if (result.records && result.records.length > 0) {
          result.records.forEach(record => {
            const date = new Date(record.created_at)
            // Only include records from the current displayed month
            if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
              const day = date.getDate()
              const statusInfo = mapStatus(record.status)
              const waveform = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10) + 2)
              data[day] = {
                status: statusInfo.status,
                label: statusInfo.label,
                waveform,
                score: record.health_score || 0,
                summary: record.summary || '',
                observations: record.observations || [],
              }
            }
          })
        }
      } catch (err) {
        console.error('Failed to load calendar data:', err.message)
      } finally {
        setHealthData(data)
        setIsLoading(false)
      }
    }
    loadCalendarData()
  }, [currentMonth, currentYear])

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  const handleDayClick = (day) => {
    if (!healthData[day]) return
    const el = document.getElementById(`day-card-${day}`)
    if (el) {
      const rect = el.getBoundingClientRect()
      let x = rect.right + 12, y = rect.top - 20
      if (x + 240 > window.innerWidth) x = rect.left - 252
      if (y + 200 > window.innerHeight) y = window.innerHeight - 220
      if (y < 10) y = 10
      setPopupPos({ x, y })
    }
    setSelectedDay(day === selectedDay ? null : day)
  }

  const closePopup = () => setSelectedDay(null)

  // Calculate progress from real data only
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate()
  const recordedDays = Object.keys(healthData).length
  const progressPct = totalDays > 0 ? Math.round((recordedDays / totalDays) * 100) : 0
  const circumference = 2 * Math.PI * 14

  const selectedData = selectedDay ? healthData[selectedDay] : null

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
          <Sidebar activeItem="calendar" />
          <div className="calendar-progress">
            <div className="progress-ring-container">
              <svg className="progress-ring" width="38" height="38" viewBox="0 0 34 34">
                <circle className="progress-ring-bg" cx="17" cy="17" r="14" fill="none" strokeWidth="3" />
                <circle className="progress-ring-fill" cx="17" cy="17" r="14" fill="none" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (circumference * progressPct / 100)} />
              </svg>
              <span className="progress-percent">{progressPct}%</span>
            </div>
            <div className="progress-info">
              <span className="progress-label">{recordedDays}/{totalDays} days</span>
              <span className="progress-sublabel">Recorded this month</span>
            </div>
          </div>
        </div>

        {/* SPINE */}
        <div className="notebook-spine" aria-hidden="true">
          <div className="spine-fold"></div>
          <div className="spine-shadow-left"></div>
          <div className="spine-shadow-right"></div>
          <div className="ribbon-bookmark"><div className="ribbon-tail"></div></div>
        </div>

        {/* CENTER */}
        <div className="notebook-page page-center">
          <HowItWorks />
        </div>

        {/* RIGHT PAGE - Calendar Grid */}
        <div className="notebook-page page-right">
          <div className={`calendar-content ${animateIn ? 'visible' : ''}`}>
            <div className="calendar-header">
              <h2 className="calendar-title">Your Health Calendar</h2>
              <p className="calendar-subtitle">Days with recordings are highlighted</p>
            </div>

            <div className="calendar-month-nav">
              <span className="month-label">{MONTHS[currentMonth]} {currentYear}</span>
              <div className="month-nav-buttons">
                <button className="month-nav-btn" onClick={prevMonth} id="btn-prev-month">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <button className="month-nav-btn" onClick={nextMonth} id="btn-next-month">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </div>
            </div>

            <div className="calendar-legend">
              <div className="legend-tag"><div className="legend-color normal"></div> Normal</div>
              <div className="legend-tag"><div className="legend-color mild"></div> Mild</div>
              <div className="legend-tag"><div className="legend-color alert"></div> Alert</div>
            </div>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#b8a080', fontStyle: 'italic' }}>Loading...</div>
            ) : (
              <CalendarGrid
                year={currentYear}
                month={currentMonth}
                healthData={healthData}
                selectedDay={selectedDay}
                onDayClick={handleDayClick}
              />
            )}

            <p className="calendar-footer-note">
              <span>●</span> {recordedDays === 0 ? 'No recordings this month. Record your voice to see data here.' : 'Click on a highlighted day to view details'}
            </p>
          </div>
        </div>
      </div>

      {/* Day Detail Popup */}
      {selectedDay && selectedData && (
        <>
          <div className="calendar-overlay" onClick={closePopup} />
          <div className="day-detail-popup" ref={popupRef} style={{ left: popupPos.x, top: popupPos.y }}>
            <button className="popup-close" onClick={closePopup}>✕</button>
            <p className="popup-date">{MONTHS[currentMonth]} {selectedDay}, {currentYear}</p>
            <div className="popup-status">
              <span className={`popup-status-dot ${selectedData.status}`}></span>
              <span>{selectedData.label}</span>
            </div>

            {selectedData.waveform && (
              <div className="popup-waveform">
                {selectedData.waveform.map((h, i) => (
                  <div key={i} className={`waveform-bar ${selectedData.status}`} style={{ height: `${h * 2.5}px` }} />
                ))}
              </div>
            )}

            <div className="popup-details">
              <div className="popup-detail-row">
                <span className="popup-detail-label">Score</span>
                <span className="popup-detail-value">{selectedData.score}/100</span>
              </div>
              {selectedData.summary && (
                <div className="popup-detail-row">
                  <span className="popup-detail-label">Summary</span>
                  <span className="popup-detail-value" style={{ fontSize: '0.75rem' }}>{selectedData.summary.split('.')[0]}</span>
                </div>
              )}
            </div>

            <button
              className="popup-view-record"
              onClick={() => {
                const dateStr = `${MONTHS[currentMonth]} ${selectedDay}, ${currentYear}`
                closePopup()
                navigateWithTransition(`/history?date=${encodeURIComponent(dateStr)}`)
              }}
              id="btn-view-record"
            >
              <span>View full record</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default Calendar
