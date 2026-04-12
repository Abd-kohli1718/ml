import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import HowItWorks from '../components/HowItWorks'
import { useTransition } from '../components/PageTransition'
import './Calendar.css'
import '../pages/Dashboard.css'

// ---- Mock health data for calendar days ----
const generateMockData = (year, month) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const data = {}

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    // Skip future dates
    if (date > today) continue

    const rand = Math.random()
    let status, label
    if (rand < 0.42) {
      status = 'normal'
      label = 'Normal'
    } else if (rand < 0.6) {
      status = 'normal'
      label = 'Healthy day'
    } else if (rand < 0.75) {
      status = 'mild'
      label = 'Mild variation'
    } else if (rand < 0.85) {
      status = 'alert'
      label = 'Alert'
    } else {
      status = 'missed'
      label = 'Missed'
    }

    // Generate random waveform bars
    const waveform = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10) + 2)

    data[d] = {
      status,
      label,
      waveform,
      pitch: (80 + Math.random() * 140).toFixed(0),
      energy: (40 + Math.random() * 50).toFixed(0),
      duration: `${Math.floor(Math.random() * 4 + 1)}m ${Math.floor(Math.random() * 50 + 10)}s`,
    }
  }
  return data
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

// ---- DayCard Component ----
function DayCard({ day, data, isToday, isSelected, onClick, animDelay }) {
  if (!day) {
    return <div className="day-card empty" />
  }

  const status = data?.status || null
  const statusClass = status ? `status-${status}` : ''
  const todayClass = isToday ? 'today' : ''
  const selectedClass = isSelected ? 'selected' : ''

  return (
    <div
      className={`day-card ${statusClass} ${todayClass} ${selectedClass}`}
      onClick={() => onClick(day)}
      style={{ animationDelay: `${animDelay}ms` }}
      id={`day-card-${day}`}
    >
      <span className="day-number">{day}</span>
      {data && data.status !== 'missed' && (
        <div className="day-waveform">
          {data.waveform.slice(0, 6).map((h, i) => (
            <div
              key={i}
              className={`waveform-bar ${data.status}`}
              style={{ height: `${h}px` }}
            />
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
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    cells.push(<DayCard key={`empty-${i}`} day={null} animDelay={0} onClick={() => {}} />)
  }
  // Day cells
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
        {WEEKDAYS.map(w => (
          <div key={w} className="weekday-label">{w}</div>
        ))}
      </div>
      <div className="calendar-grid">
        {cells}
      </div>
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
  const popupRef = useRef(null)
  const { navigateWithTransition } = useTransition()

  useEffect(() => {
    requestAnimationFrame(() => setAnimateIn(true))
  }, [])

  // Generate mock data when month changes
  useEffect(() => {
    setHealthData(generateMockData(currentYear, currentMonth))
    setSelectedDay(null)
  }, [currentMonth, currentYear])

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(y => y - 1)
    } else {
      setCurrentMonth(m => m - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(y => y + 1)
    } else {
      setCurrentMonth(m => m + 1)
    }
  }

  const handleDayClick = (day) => {
    if (!healthData[day]) return
    // Get position of the clicked card
    const el = document.getElementById(`day-card-${day}`)
    if (el) {
      const rect = el.getBoundingClientRect()
      // Position popup near the card
      let x = rect.right + 12
      let y = rect.top - 20
      // Keep within viewport
      if (x + 240 > window.innerWidth) x = rect.left - 252
      if (y + 200 > window.innerHeight) y = window.innerHeight - 220
      if (y < 10) y = 10
      setPopupPos({ x, y })
    }
    setSelectedDay(day === selectedDay ? null : day)
  }

  const closePopup = () => setSelectedDay(null)

  // Calculate progress
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate()
  const recordedDays = Object.values(healthData).filter(d => d.status !== 'missed').length
  const progressPct = Math.round((recordedDays / totalDays) * 100)
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
          {/* Progress indicator */}
          <div className="calendar-progress">
            <div className="progress-ring-container">
              <svg className="progress-ring" width="38" height="38" viewBox="0 0 34 34">
                <circle className="progress-ring-bg" cx="17" cy="17" r="14"
                  fill="none" strokeWidth="3" />
                <circle className="progress-ring-fill" cx="17" cy="17" r="14"
                  fill="none" strokeWidth="3" strokeLinecap="round"
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

        {/* CENTER - How It Works */}
        <div className="notebook-page page-center">
          <HowItWorks />
        </div>

        {/* RIGHT PAGE - Calendar Grid */}
        <div className="notebook-page page-right">
          <div className={`calendar-content ${animateIn ? 'visible' : ''}`}>
            {/* Header */}
            <div className="calendar-header">
              <h2 className="calendar-title">Your Health Calendar</h2>
              <p className="calendar-subtitle">Track your daily voice and health activity</p>
            </div>

            {/* Month Navigation */}
            <div className="calendar-month-nav">
              <span className="month-label">
                {MONTHS[currentMonth]} {currentYear}
              </span>
              <div className="month-nav-buttons">
                <button className="month-nav-btn" onClick={prevMonth} id="btn-prev-month">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button className="month-nav-btn" onClick={nextMonth} id="btn-next-month">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="calendar-legend">
              <div className="legend-tag">
                <div className="legend-color normal"></div>
                Normal / Healthy
              </div>
              <div className="legend-tag">
                <div className="legend-color mild"></div>
                Mild variation
              </div>
              <div className="legend-tag">
                <div className="legend-color alert"></div>
                Alert
              </div>
              <div className="legend-tag">
                <div className="legend-color missed"></div>
                Missed
              </div>
            </div>

            {/* Calendar Grid */}
            <CalendarGrid
              year={currentYear}
              month={currentMonth}
              healthData={healthData}
              selectedDay={selectedDay}
              onDayClick={handleDayClick}
            />

            {/* Footer note */}
            <p className="calendar-footer-note">
              <span>●</span> Click on a day to view details
            </p>
          </div>
        </div>
      </div>

      {/* Day Detail Popup */}
      {selectedDay && selectedData && (
        <>
          <div className="calendar-overlay" onClick={closePopup} />
          <div
            className="day-detail-popup"
            ref={popupRef}
            style={{ left: popupPos.x, top: popupPos.y }}
          >
            <button className="popup-close" onClick={closePopup}>✕</button>
            <p className="popup-date">
              {MONTHS[currentMonth]} {selectedDay}, {currentYear}
            </p>
            <div className="popup-status">
              <span className={`popup-status-dot ${selectedData.status}`}></span>
              <span>{selectedData.label}</span>
            </div>

            {selectedData.status !== 'missed' && (
              <div className="popup-waveform">
                {selectedData.waveform.map((h, i) => (
                  <div
                    key={i}
                    className={`waveform-bar ${selectedData.status}`}
                    style={{ height: `${h * 2.5}px` }}
                  />
                ))}
              </div>
            )}

            <div className="popup-details">
              {selectedData.status !== 'missed' ? (
                <>
                  <div className="popup-detail-row">
                    <span className="popup-detail-label">Avg Pitch</span>
                    <span className="popup-detail-value">{selectedData.pitch} Hz</span>
                  </div>
                  <div className="popup-detail-row">
                    <span className="popup-detail-label">Energy</span>
                    <span className="popup-detail-value">{selectedData.energy}%</span>
                  </div>
                  <div className="popup-detail-row">
                    <span className="popup-detail-label">Duration</span>
                    <span className="popup-detail-value">{selectedData.duration}</span>
                  </div>
                </>
              ) : (
                <div className="popup-detail-row">
                  <span className="popup-detail-label">No recording made</span>
                </div>
              )}
            </div>

            {/* Navigate to Records page for this date */}
            {selectedData.status !== 'missed' && (
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Calendar
