/**
 * api.js — API helper for making authenticated requests to the backend.
 * Automatically refreshes and attaches the JWT Bearer token.
 */

import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

/**
 * Get a fresh access token — refreshes automatically if expired.
 */
async function getFreshToken() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) {
    throw new Error('Not authenticated. Please sign in again.')
  }
  // Update localStorage with fresh token
  localStorage.setItem('access_token', session.access_token)
  return session.access_token
}

/**
 * Make an authenticated API request.
 * @param {string} endpoint - The API endpoint (e.g., '/analyze', '/history')
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<any>} - The JSON response
 */
export async function apiFetch(endpoint, options = {}) {
  // Always get a fresh token (Supabase auto-refreshes if expired)
  const token = await getFreshToken()

  const headers = {
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }))
    throw new Error(error.detail || `API error ${response.status}`)
  }

  return response.json()
}

/**
 * Upload audio file for analysis.
 * @param {Blob} audioBlob - The recorded audio blob
 * @param {string} filename - Original filename
 * @returns {Promise<object>} - Analysis result
 */
export async function uploadAudio(audioBlob, filename = 'recording.wav') {
  const formData = new FormData()
  formData.append('audio', audioBlob, filename)

  return apiFetch('/analyze', {
    method: 'POST',
    body: formData,
  })
}

/**
 * Fetch analysis history.
 * @param {string} period - 'day', 'week', 'month', 'year', 'all'
 * @param {number} limit - Max records
 * @returns {Promise<object>} - History response
 */
export async function fetchHistory(period = 'all', limit = 50) {
  return apiFetch(`/history?period=${period}&limit=${limit}`)
}

/**
 * Fetch trend summary.
 * @param {string} period - 'day', 'week', 'month', 'year', 'all'
 * @returns {Promise<object>} - Trend response
 */
export async function fetchTrend(period = 'month') {
  return apiFetch(`/history/trend?period=${period}`)
}
