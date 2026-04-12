import { useState, useEffect, useRef, useCallback } from 'react'
import { useTransition } from '../components/PageTransition'
import { uploadAudio } from '../lib/api'
import './Record.css'

function Record() {
  const { navigateWithTransition } = useTransition()
  const [isRecording, setIsRecording] = useState(false)
  const [timer, setTimer] = useState(0) // seconds elapsed
  const [waveData, setWaveData] = useState(Array(40).fill(0.3))
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState(null)
  const intervalRef = useRef(null)
  const waveIntervalRef = useRef(null)

  // Real audio recording refs
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const analyserRef = useRef(null)

  // Format time as M:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Current date/time
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  // Start recording — real mic capture
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Set up analyser for real waveform
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)
      analyserRef.current = analyser

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      })
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100) // collect data every 100ms

      setIsRecording(true)
      setTimer(0)
      setResult(null)

      // Timer
      intervalRef.current = setInterval(() => {
        setTimer(prev => prev + 1)
      }, 1000)

      // Animate waveform from real audio data
      waveIntervalRef.current = setInterval(() => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
          analyserRef.current.getByteFrequencyData(dataArray)
          // Map frequency data to waveform bars
          const bars = Array(40).fill(0).map((_, i) => {
            const idx = Math.floor((i / 40) * dataArray.length)
            return Math.max(0.05, dataArray[idx] / 255)
          })
          setWaveData(bars)
        }
      }, 120)

    } catch (err) {
      console.error('Microphone access denied:', err)
      alert('Please allow microphone access to record your voice.')
    }
  }, [])

  // Stop recording
  const stopRecording = useCallback(() => {
    setIsRecording(false)
    clearInterval(intervalRef.current)
    clearInterval(waveIntervalRef.current)
    setWaveData(Array(40).fill(0.3))

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
  }, [])

  // Auto-start recording on mount
  useEffect(() => {
    const timeout = setTimeout(() => startRecording(), 600)
    return () => {
      clearTimeout(timeout)
      clearInterval(intervalRef.current)
      clearInterval(waveIntervalRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [startRecording])

  // Cancel → go back to dashboard
  const handleCancel = () => {
    stopRecording()
    navigateWithTransition('/dashboard')
  }

  // Upload → stop, send to API, and show result
  const handleUpload = async () => {
    stopRecording()

    // Wait a beat for the MediaRecorder to flush
    await new Promise(resolve => setTimeout(resolve, 300))

    if (audioChunksRef.current.length === 0) {
      alert('No audio recorded. Please try again.')
      return
    }

    setIsUploading(true)
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      const analysisResult = await uploadAudio(audioBlob, 'recording.webm')
      setResult(analysisResult)
      // Navigate to history after a brief moment to see the result
      setTimeout(() => navigateWithTransition('/history'), 3000)
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Analysis failed: ' + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="record-page">
      {/* Notebook ring holes */}
      <div className="notebook-rings" aria-hidden="true">
        {[...Array(5)].map((_, i) => (
          <div className="ring-hole" key={i}></div>
        ))}
      </div>

      {/* Top-right date/time */}
      <div className="record-datetime">
        <span className="record-date">{dateStr}</span>
        <span className="record-time">{timeStr}</span>
      </div>

      {/* Menu icon */}
      <button className="record-menu-btn" aria-label="Menu" id="record-menu">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="4" y1="6" x2="20" y2="6"/>
          <line x1="4" y1="12" x2="20" y2="12"/>
          <line x1="4" y1="18" x2="20" y2="18"/>
        </svg>
      </button>

      {/* Waveform visualization */}
      <div className="waveform-container" aria-hidden="true">
        {waveData.map((height, i) => (
          <div
            className="wave-bar"
            key={i}
            style={{
              height: `${height * 100}%`,
              opacity: 0.15 + height * 0.35,
              transition: isRecording ? 'height 0.1s ease' : 'height 0.5s ease',
            }}
          ></div>
        ))}
      </div>

      {/* Timer display */}
      <div className="timer-container">
        <div className="timer-display">
          <span className="timer-value">{formatTime(timer)}</span>
          <div className="timer-divider"></div>
          <span className="timer-seconds">{timer}<span className="timer-unit">s</span></span>
        </div>
      </div>

      {/* RECORD / UPLOADING / RESULT label */}
      <p className="record-label">
        {isUploading ? 'ANALYZING...' : result ? `SCORE: ${result.health_score}/100` : 'RECORD'}
      </p>

      {/* Center action row */}
      <div className="action-row">
        {/* Cancel button */}
        <button className="leather-btn cancel-btn" onClick={handleCancel} id="cancel-btn" disabled={isUploading}>
          <span className="leather-btn-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </span>
          <span className="leather-btn-text">CANCEL</span>
        </button>

        {/* Center mic button */}
        <div className={`record-mic-wrapper ${isRecording ? 'active' : ''}`}>
          <button
            className="record-mic-btn"
            onClick={isRecording ? stopRecording : startRecording}
            id="record-mic-btn"
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            disabled={isUploading}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" x2="12" y1="19" y2="22"/>
            </svg>
          </button>
          {isRecording && (
            <>
              <div className="rec-pulse rec-p1"></div>
              <div className="rec-pulse rec-p2"></div>
            </>
          )}
        </div>

        {/* Upload button */}
        <button className="leather-btn upload-btn" onClick={handleUpload} id="upload-btn" disabled={isUploading}>
          <span className="leather-btn-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </span>
          <span className="leather-btn-text">{isUploading ? 'WAIT...' : 'UPLOAD'}</span>
        </button>
      </div>

      {/* Transcript / Result area */}
      <div className="transcript-area">
        {result ? (
          <p className="transcript-text">
            <strong>{result.status}</strong> — {result.summary}
          </p>
        ) : (
          <p className="transcript-text">
            {isRecording
              ? 'Recording your voice... Speak naturally for at least 5 seconds, then press UPLOAD.'
              : isUploading
                ? 'Analyzing your voice patterns with AI...'
                : 'Press the mic button to start recording.'}
          </p>
        )}
      </div>
    </div>
  )
}

export default Record
