import { useState, useEffect, useRef, useCallback } from 'react'
import { useTransition } from './PageTransition'
import './MicRecorder.css'

function MicRecorder() {
  const [isHolding, setIsHolding] = useState(false)
  const [progress, setProgress] = useState(0)
  const [completed, setCompleted] = useState(false)
  const animationRef = useRef(null)
  const startTimeRef = useRef(null)
  const { navigateWithTransition } = useTransition()

  const HOLD_DURATION = 2000 // 2 seconds

  const startHold = useCallback(() => {
    if (completed) return
    setIsHolding(true)
    setProgress(0)
    setCompleted(false)
    startTimeRef.current = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current
      const pct = Math.min(elapsed / HOLD_DURATION, 1)
      setProgress(pct)

      if (pct < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Hold completed — navigate!
        setCompleted(true)
        setIsHolding(false)
        setTimeout(() => {
          navigateWithTransition('/record')
        }, 300) // brief delay for visual feedback
      }
    }
    animationRef.current = requestAnimationFrame(animate)
  }, [completed, navigateWithTransition])

  const cancelHold = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    if (!completed) {
      setIsHolding(false)
      setProgress(0)
    }
  }, [completed])

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  // Prevent context menu on long press (mobile)
  const preventContext = (e) => e.preventDefault()

  // SVG circle math
  const radius = 82
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - progress * circumference

  // Dynamic glow color based on progress
  const glowIntensity = progress * 0.6
  const progressColor = progress < 0.5
    ? `rgba(180, 140, 80, ${0.3 + progress * 0.8})`
    : `rgba(210, 140, 50, ${0.5 + progress * 0.5})`

  return (
    <div className="mic-recorder">
      {/* Title */}
      <h2 className="recorder-title">Main Focus</h2>

      {/* Mic Circle */}
      <div
        className={`mic-circle-wrapper ${isHolding ? 'holding' : ''} ${completed ? 'completed' : ''}`}
        style={{
          '--glow-intensity': glowIntensity,
          '--progress-color': progressColor,
        }}
      >
        {/* Pulse rings (visible while holding) */}
        {isHolding && (
          <>
            <div className="pulse-ring ring-1"></div>
            <div className="pulse-ring ring-2"></div>
            <div className="pulse-ring ring-3"></div>
          </>
        )}

        {/* Completion flash */}
        {completed && <div className="completion-flash"></div>}

        {/* Progress ring */}
        <svg className="progress-ring" viewBox="0 0 200 200">
          {/* Background track */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth="5"
          />
          {/* Progress arc */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="url(#holdGradient)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 100 100)"
            className="progress-arc"
          />
          <defs>
            <linearGradient id="holdGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4943A" />
              <stop offset="50%" stopColor="#C87B28" />
              <stop offset="100%" stopColor="#E8A84C" />
            </linearGradient>
          </defs>
        </svg>

        {/* Inner circle with mic icon */}
        <div
          className="mic-inner-circle"
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
          onTouchCancel={cancelHold}
          onContextMenu={preventContext}
          role="button"
          tabIndex={0}
          aria-label="Press and hold to record"
          id="mic-hold-btn"
          style={{
            transform: isHolding ? 'scale(0.94)' : completed ? 'scale(1.06)' : 'scale(1)',
            background: isHolding
              ? `radial-gradient(circle at center, rgba(232, 168, 76, ${0.15 + progress * 0.25}), #ebe5da)`
              : completed
                ? 'radial-gradient(circle at center, rgba(232, 168, 76, 0.3), #ebe5da)'
                : undefined,
          }}
        >
          <div className="mic-icon-wrapper">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" x2="12" y1="19" y2="22"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Progress percentage label */}
      {isHolding && (
        <div className="hold-progress-label">
          {Math.round(progress * 100)}%
        </div>
      )}

      {/* Instructions */}
      <div className="recorder-instructions">
        <p className="instruction-title">VERY IMPORTANT</p>
        <p className="instruction-text">
          Press and hold the mic button for 2 seconds<br />
          to begin recording your voice
        </p>
      </div>

      {/* Hold indicator text */}
      <div className={`hold-hint ${isHolding ? 'active' : ''}`}>
        <span className="hold-hint-icon">◉</span>
        {isHolding ? 'Keep holding...' : 'Press & hold to start'}
      </div>
    </div>
  )
}

export default MicRecorder
