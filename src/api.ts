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

// --- Word lookup (validity from the Scrabble word list, definitions with it) ---

export interface WordSense {
  definition: string | null
  /** Set when the list files this word as a form of another, e.g. DID of DO. */
  formOf: string | null
  /** What that other word means, when this sense has no meaning of its own. */
  formOfDefinition: string | null
  partOfSpeech: string | null
  inflections: string[]
  related: { word: string; partOfSpeech: string | null }[]
}

export interface WordLookupResult {
  word: string
  valid: boolean
  lexicon: string
  lexiconName: string
  /** Why the word isn't playable. Null when it is. */
  reason: string | null
  /** False when the list confirms the word but doesn't define it. */
  hasDefinition: boolean
  senses: WordSense[]
}

export interface WordDefinition {
  word: string
  definition: string | null
  /** 'lexicon' | 'claude', or null when no definition could be found. */
  source: string | null
}

/**
 * Look a word up in the Scrabble word list.
 *
 * Throws rather than returning a verdict when the API can't be reached, so a
 * network problem is never mistaken for "not a word".
 */
export async function lookupWord(word: string): Promise<WordLookupResult> {
  const res = await fetch(`${API_BASE_URL}/words.php?w=${encodeURIComponent(word)}`)
  const data = await res.json().catch(() => null)

  if (!res.ok || typeof data?.valid !== 'boolean') {
    throw new Error(data?.error ?? `Lookup failed (HTTP ${res.status})`)
  }

  return data as WordLookupResult
}

/** Fetch a definition for a valid word the list itself leaves undefined. */
export async function defineWord(word: string): Promise<WordDefinition> {
  const res = await fetch(
    `${API_BASE_URL}/words.php?w=${encodeURIComponent(word)}&define=1`
  )
  const data = await res.json().catch(() => null)

  if (!res.ok || data === null) {
    throw new Error(data?.error ?? `Definition lookup failed (HTTP ${res.status})`)
  }

  return data as WordDefinition
}
