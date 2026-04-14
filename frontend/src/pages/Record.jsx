import { useState, useEffect, useRef, useCallback } from 'react'
import { useTransition } from '../components/PageTransition'
import { uploadAudio } from '../lib/api'
import './Record.css'

function Record() {
  const { navigateWithTransition } = useTransition()
  const [isRecording, setIsRecording] = useState(false)
  const [timer, setTimer] = useState(0)
  const [waveData, setWaveData] = useState(Array(40).fill(0.3))
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState(null)
  const intervalRef = useRef(null)
  const waveIntervalRef = useRef(null)

  // Audio refs
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const analyserRef = useRef(null)
  const audioContextRef = useRef(null)

  // State lock refs — prevents race conditions
  const isRecordingRef = useRef(false)
  const isBusyRef = useRef(false) // blocks all mic actions while starting/stopping

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

  // ─── STOP ────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      // Already stopped or busy? resolve immediately
      if (!isRecordingRef.current) { resolve(); return }

      isBusyRef.current = true
      isRecordingRef.current = false
      setIsRecording(false)

      // Kill timers
      clearInterval(intervalRef.current)
      clearInterval(waveIntervalRef.current)
      setWaveData(Array(40).fill(0.3))

      // Stop MediaRecorder and wait for onstop
      const mr = mediaRecorderRef.current
      if (mr && mr.state !== 'inactive') {
        mr.onstop = () => {
          isBusyRef.current = false
          resolve()
        }
        mr.stop()
      } else {
        isBusyRef.current = false
        resolve()
      }

      // Kill mic stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }

      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }
    })
  }, [])

  // ─── START ───────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (isRecordingRef.current || isBusyRef.current) return

    isBusyRef.current = true
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Analyser for waveform
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      audioContextRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)
      analyserRef.current = analyser

      // MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const mr = new MediaRecorder(stream, { mimeType })
      audioChunksRef.current = []

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorderRef.current = mr
      mr.start(100)

      isRecordingRef.current = true
      setIsRecording(true)
      setTimer(0)
      setResult(null)

      // Timer
      intervalRef.current = setInterval(() => setTimer(p => p + 1), 1000)

      // Waveform animation
      waveIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return
        const arr = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(arr)
        const bars = Array(40).fill(0).map((_, i) => {
          const idx = Math.floor((i / 40) * arr.length)
          return Math.max(0.05, arr[idx] / 255)
        })
        setWaveData(bars)
      }, 120)

    } catch (err) {
      console.error('Microphone access denied:', err)
      alert('Please allow microphone access to record your voice.')
    } finally {
      isBusyRef.current = false
    }
  }, [])

  // ─── TOGGLE ──────────────────────────────────────────────
  const toggleRecording = useCallback(() => {
    if (isBusyRef.current) return
    if (isRecordingRef.current) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [startRecording, stopRecording])

  // Auto-start on mount
  useEffect(() => {
    const t = setTimeout(() => startRecording(), 600)
    return () => {
      clearTimeout(t)
      clearInterval(intervalRef.current)
      clearInterval(waveIntervalRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(tr => tr.stop())
      }
    }
  }, [startRecording])

  // Cancel → dashboard
  const handleCancel = async () => {
    await stopRecording()
    navigateWithTransition('/dashboard')
  }

  // Upload → stop, convert, send
  const handleUpload = async () => {
    if (isUploading) return
    setIsUploading(true)

    // Force-stop recording first and wait for it
    await stopRecording()

    if (audioChunksRef.current.length === 0) {
      alert('No audio recorded. Please try again.')
      setIsUploading(false)
      return
    }

    try {
      const mime = mediaRecorderRef.current?.mimeType || 'audio/webm'
      const audioBlob = new Blob(audioChunksRef.current, { type: mime })

      let finalBlob = audioBlob
      let filename = mime.includes('mp4') ? 'recording.m4a' : 'recording.webm'

      // Try WAV conversion
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const buf = await ctx.decodeAudioData(await audioBlob.arrayBuffer())
        finalBlob = audioBufferToWav(buf)
        filename = 'recording.wav'
        ctx.close()
      } catch (e) {
        console.warn('WAV conversion failed, using raw format:', e)
      }

      const analysisResult = await uploadAudio(finalBlob, filename)
      setResult(analysisResult)
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
        {isUploading ? 'ANALYZING...' : result ? `SCORE: ${result.health_score}/100` : isRecording ? 'RECORDING' : 'RECORD'}
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

        {/* Center mic button — toggles recording */}
        <div className={`record-mic-wrapper ${isRecording ? 'active' : ''}`}>
          <button
            className="record-mic-btn"
            onClick={toggleRecording}
            id="record-mic-btn"
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            disabled={isUploading}
          >
            {isRecording ? (
              /* Stop icon (square) when recording */
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
            ) : (
              /* Mic icon when stopped */
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" x2="12" y1="19" y2="22"/>
              </svg>
            )}
          </button>
          {isRecording && (
            <>
              <div className="rec-pulse rec-p1"></div>
              <div className="rec-pulse rec-p2"></div>
            </>
          )}
        </div>

        {/* Upload button */}
        <button className="leather-btn upload-btn" onClick={handleUpload} id="upload-btn" disabled={isUploading || !isRecording && audioChunksRef.current.length === 0}>
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

// --- Helper: Convert AudioBuffer to WAV Blob ---
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = 1 // PCM
  const bitDepth = 16
  
  const result = (() => {
    if (numChannels === 2) {
      const L = buffer.getChannelData(0)
      const R = buffer.getChannelData(1)
      const len = L.length + R.length
      const res = new Float32Array(len)
      let idx = 0, src = 0
      while (idx < len) { res[idx++] = L[src]; res[idx++] = R[src]; src++ }
      return res
    }
    return buffer.getChannelData(0)
  })()

  const dataLen = result.length * (bitDepth / 8)
  const buf = new ArrayBuffer(44 + dataLen)
  const v = new DataView(buf)

  const ws = (offset, s) => { for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i)) }

  ws(0, 'RIFF')
  v.setUint32(4, 36 + dataLen, true)
  ws(8, 'WAVE')
  ws(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, format, true)
  v.setUint16(22, numChannels, true)
  v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true)
  v.setUint16(32, numChannels * (bitDepth / 8), true)
  v.setUint16(34, bitDepth, true)
  ws(36, 'data')
  v.setUint32(40, dataLen, true)

  let off = 44
  for (let i = 0; i < result.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, result[i]))
    v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
  }

  return new Blob([v], { type: 'audio/wav' })
}
