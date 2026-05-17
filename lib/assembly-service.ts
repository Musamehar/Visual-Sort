// lib/assembly-service.ts
// Service to communicate with COAL Assembly Backend API

type AlgorithmKey = "Bubble Sort" | "Selection Sort" | "Insertion Sort" | "Quick Sort" | "Merge Sort"

export type SortFrame = number[]

export type SortEvent = {
  type: "init" | "pass" | "done"
  indices?: number[]
  passNumber?: number
}

export type SortResponse = {
  success: boolean
  algorithm: AlgorithmKey
  initialArray: number[]
  finalArray: number[]
  frames: SortFrame[]
  totalFrames: number
  events: SortEvent[]
  stats: {
    totalFrames: number
    totalPasses: number
    algorithm: AlgorithmKey
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const API_TIMEOUT = 30000 // 30 seconds for sort operations

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = API_TIMEOUT) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Check if API server is healthy
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    return response.ok
  } catch (error) {
    console.warn('[AssemblyService] API health check failed:', error)
    return false
  }
}

/**
 * Send sort request to Assembly backend
 * @param algorithm - Sorting algorithm name
 * @param arrayData - Array of numbers to sort
 * @returns Sort response with frames and events
 */
export async function sortWithAssemblyBackend(
  algorithm: AlgorithmKey,
  arrayData: number[]
): Promise<SortResponse> {
  try {
    const response = await fetchWithTimeout(`${API_URL}/api/sort`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        algorithm,
        arrayData,
        arraySize: arrayData.length
      })
    }, API_TIMEOUT)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'API request failed')
    }

    const data: SortResponse = await response.json()
    return data
  } catch (error) {
    let message = 'Unknown error'

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        message = `Request timeout (${API_TIMEOUT / 1000}s). The backend might be processing. Try again in a moment.`
      } else {
        message = error.message
      }
    }

    console.error('[AssemblyService] Sort request failed:', message)
    throw new Error(`Assembly backend error: ${message}`)
  }
}

/**
 * Get list of available algorithms
 */
export async function getAvailableAlgorithms() {
  try {
    const response = await fetch(`${API_URL}/api/algorithms`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) throw new Error('Failed to fetch algorithms')

    return await response.json()
  } catch (error) {
    console.warn('[AssemblyService] Failed to get algorithms:', error)
    return null
  }
}

/**
 * Convert frames from Assembly backend format to internal format
 * @param response - Response from Assembly backend
 * @returns Frames and events in Visual Sort format
 */
export function convertAssemblyFrames(response: SortResponse): {
  frames: number[][]
  events: Array<{
    type: "init" | "compare" | "swap" | "done"
    indices: number[]
    values?: number[]
  }>
} {
  const events = response.events.map(evt => ({
    type: (evt.type === 'pass' ? 'swap' : evt.type) as "init" | "compare" | "swap" | "done",
    indices: evt.indices || [],
    values: undefined
  }))

  return {
    frames: response.frames,
    events
  }
}
