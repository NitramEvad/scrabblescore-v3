// Frontend data layer — talks to the PHP/MySQL REST API.
//
// The API base URL defaults to "/api" (same-origin deployment, e.g. the
// frontend and API both served from scrabblescore.tookay.net). Override with
// VITE_API_BASE_URL only if the API lives on a different origin.

const API_BASE_URL = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'
).replace(/\/$/, '')

export interface GameRecord {
  id?: string
  game_date?: string
  player1: string
  player2: string
  player1_score: number
  player2_score: number
  winner: string | null
  turns: Turn[]
  duration_minutes: number
}

export interface Turn {
  player: string
  score: number
  timestamp: number
  duration: number
}

export async function saveGame(
  game: GameRecord
): Promise<{ success: boolean; error: string | null }> {
  try {
    const res = await fetch(`${API_BASE_URL}/games.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(game),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok || !data?.success) {
      const error = data?.error ?? `Save failed (HTTP ${res.status})`
      console.error('[API] Insert error:', error)
      return { success: false, error }
    }

    return { success: true, error: null }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Network error'
    console.error('[API] Insert request failed:', error)
    return { success: false, error }
  }
}

export async function getGameHistory(): Promise<GameRecord[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/games.php`)
    if (!res.ok) {
      console.error(`[API] Error fetching games: HTTP ${res.status}`)
      return []
    }
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.error('[API] Error fetching games:', err)
    return []
  }
}

export async function getHeadToHeadRecord(
  player1: string,
  player2: string
): Promise<{ wins: number; losses: number; draws: number }> {
  try {
    const params = new URLSearchParams({ p1: player1, p2: player2 })
    const res = await fetch(`${API_BASE_URL}/head-to-head.php?${params}`)
    if (!res.ok) {
      console.error(`[API] Error fetching head to head: HTTP ${res.status}`)
      return { wins: 0, losses: 0, draws: 0 }
    }
    const data = await res.json()
    return {
      wins: data?.wins ?? 0,
      losses: data?.losses ?? 0,
      draws: data?.draws ?? 0,
    }
  } catch (err) {
    console.error('[API] Error fetching head to head:', err)
    return { wins: 0, losses: 0, draws: 0 }
  }
}

// --- AI text (proxied server-side so the Anthropic key is never in the browser) ---
// These return null on any failure; callers fall back to built-in text.

async function requestAiText(body: Record<string, unknown>): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/ai.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    const data = await res.json()
    return typeof data?.text === 'string' ? data.text : null
  } catch {
    return null
  }
}

export function requestVictoryPoem(params: {
  winner: string
  loser: string
  winnerScore: number
  loserScore: number
}): Promise<string | null> {
  return requestAiText({ kind: 'poem', ...params })
}

export function requestSlowTurnComment(params: {
  player: string
  minutes: number
}): Promise<string | null> {
  return requestAiText({ kind: 'quip', ...params })
}
