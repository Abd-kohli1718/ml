/**
 * PageTransition.jsx
 * 
 * Cinematic page transition system using a fullscreen video overlay.
 * Provides a React Context so any component in the tree can trigger
 * a premium transition before navigating to a new route.
 * 
 * Usage:
 *   1. Wrap your <Router> with <TransitionProvider>
 *   2. In any component: const { navigateWithTransition } = useTransition()
 *   3. Call navigateWithTransition('/target-route') instead of navigate()
 */

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './PageTransition.css'

// ---- Try to import video (Vite handles static assets) ----
let transitionVideo = null
try {
  // Dynamic import workaround — Vite resolves this at build time
  transitionVideo = new URL('../assets/video/transition.mp4', import.meta.url).href
} catch {
  transitionVideo = null
}

// ============================================
// CONTEXT
// ============================================
const TransitionContext = createContext(null)

/**
 * Hook to access transition navigation from any component.
 * @returns {{ navigateWithTransition: (route: string) => void, isTransitioning: boolean }}
 */
export function useTransition() {
  const ctx = useContext(TransitionContext)
  if (!ctx) {
    throw new Error('useTransition must be used within a <TransitionProvider>')
  }
  return ctx
}

// ============================================
// TRANSITION OVERLAY COMPONENT
// ============================================
function TransitionOverlay({ isActive, onVideoEnd, useVideo }) {
  const videoRef = useRef(null)
  const [phase, setPhase] = useState('idle') // idle | playing | fade-out

  // When activated, start the transition
  useEffect(() => {
    if (isActive) {
      setPhase('playing')
      document.body.classList.add('transitioning')

      if (useVideo && videoRef.current) {
        // Reset video to start
        videoRef.current.currentTime = 0
        const playPromise = videoRef.current.play()
        if (playPromise) {
          playPromise.catch(() => {
            // Video play failed — use fallback timing
            setTimeout(handleEnd, 900)
          })
        }
      } else {
        // CSS fallback animation — auto-complete after duration
        setTimeout(handleEnd, 900)
      }
    } else {
      setPhase('idle')
      document.body.classList.remove('transitioning')
    }

    return () => {
      document.body.classList.remove('transitioning')
    }
  }, [isActive])

  const handleEnd = useCallback(() => {
    setPhase('fade-out')
    // Small delay for the fade-out animation to play
    setTimeout(() => {
      onVideoEnd()
      setPhase('idle')
    }, 450)
  }, [onVideoEnd])

  const handleVideoEnded = () => {
    handleEnd()
  }

  // Also handle video error — fallback to timed transition
  const handleVideoError = () => {
    setTimeout(handleEnd, 600)
  }

  const overlayClass = [
    'page-transition-overlay',
    phase === 'playing' ? 'active' : '',
    phase === 'fade-out' ? 'active fade-out' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={overlayClass} id="page-transition-overlay">
      <div className="transition-backdrop" />

      {useVideo ? (
        <video
          ref={videoRef}
          className="transition-video"
          muted
          playsInline
          preload="auto"
          onEnded={handleVideoEnded}
          onError={handleVideoError}
        >
          <source src={transitionVideo} type="video/mp4" />
        </video>
      ) : (
        /* CSS fallback: notebook page-flip animation */
        <div className="transition-fallback">
          <div className="fallback-page fallback-page-left" />
          <div className="fallback-page fallback-page-right" />
          <div className="fallback-spine" />
          <div className="fallback-pulse">
            <div className="fallback-pulse-ring" />
            <div className="fallback-pulse-ring" />
            <div className="fallback-pulse-ring" />
            <div className="fallback-pulse-dot" />
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// PROVIDER COMPONENT
// ============================================
export function TransitionProvider({ children }) {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [targetRoute, setTargetRoute] = useState(null)
  const [videoAvailable, setVideoAvailable] = useState(false)
  const navigateRef = useRef(null)
  const lockRef = useRef(false)

  // Check if video file is actually loadable
  useEffect(() => {
    if (!transitionVideo) return

    const testVideo = document.createElement('video')
    testVideo.preload = 'auto'
    testVideo.muted = true

    const handleCanPlay = () => {
      setVideoAvailable(true)
      cleanup()
    }
    const handleError = () => {
      setVideoAvailable(false)
      cleanup()
    }
    const cleanup = () => {
      testVideo.removeEventListener('canplaythrough', handleCanPlay)
      testVideo.removeEventListener('error', handleError)
      testVideo.src = ''
    }

    testVideo.addEventListener('canplaythrough', handleCanPlay)
    testVideo.addEventListener('error', handleError)
    testVideo.src = transitionVideo
  }, [])

  /**
   * Navigate to a route with cinematic transition.
   * Prevents double-clicks and concurrent transitions.
   */
  const navigateWithTransition = useCallback((route) => {
    // Prevent concurrent transitions
    if (lockRef.current || isTransitioning) return

    lockRef.current = true
    setTargetRoute(route)
    setIsTransitioning(true)
  }, [isTransitioning])

  /**
   * Called when the transition video/animation completes.
   * Performs the actual route navigation, then resets state.
   */
  const handleTransitionEnd = useCallback(() => {
    if (targetRoute && navigateRef.current) {
      navigateRef.current(targetRoute)
    }
    // Reset all state
    setIsTransitioning(false)
    setTargetRoute(null)
    lockRef.current = false
  }, [targetRoute])

  const contextValue = {
    navigateWithTransition,
    isTransitioning,
  }

  return (
    <TransitionContext.Provider value={contextValue}>
      {/* NavigateBridge lives inside Router context to access useNavigate */}
      <NavigateBridge navigateRef={navigateRef} />
      {children}
      <TransitionOverlay
        isActive={isTransitioning}
        onVideoEnd={handleTransitionEnd}
        useVideo={videoAvailable}
      />
    </TransitionContext.Provider>
  )
}

/**
 * Internal bridge component — captures the navigate function from
 * React Router's context and stores it in a ref accessible by the provider.
 * This allows the provider to call navigate() without being a direct
 * child of <Router>.
 */
function NavigateBridge({ navigateRef }) {
  const navigate = useNavigate()
  useEffect(() => {
    navigateRef.current = navigate
  }, [navigate, navigateRef])
  return null
}

export default TransitionProvider
