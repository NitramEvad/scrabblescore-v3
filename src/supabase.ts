import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

if (supabase) {
  console.log('[Supabase] Client initialized for:', supabaseUrl)
} else {
  console.warn('[Supabase] Client NOT initialized — VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing')
}

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

/** Sanitize a player name for use in PostgREST filter expressions. */
function sanitizeFilterValue(value: string): string {
  return value.replace(/[(),.*\\]/g, '')
}

export async function saveGame(
  game: GameRecord
): Promise<{ success: boolean; error: string | null }> {
  if (!supabase) return { success: false, error: null }

  console.log('[Supabase] Attempting to save game:', JSON.stringify(game, null, 2))

  const { data, error } = await supabase.from('games').insert([game]).select()

  if (error) {
    console.error('[Supabase] Insert error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    return { success: false, error: `${error.message} (code: ${error.code})` }
  }

  console.log('[Supabase] Game saved successfully:', data)
  return { success: true, error: null }
}

export async function getGameHistory(): Promise<GameRecord[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('games')
    .select('*')
    .order('game_date', { ascending: false })

  if (error) {
    console.error('[Supabase] Error fetching games:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    return []
  }
  console.log('[Supabase] Fetched', data?.length ?? 0, 'games')
  return data || []
}

export async function getHeadToHeadRecord(
  player1: string,
  player2: string
): Promise<{ wins: number; losses: number; draws: number }> {
  if (!supabase) return { wins: 0, losses: 0, draws: 0 }

  const p1 = sanitizeFilterValue(player1)
  const p2 = sanitizeFilterValue(player2)

  const { data, error } = await supabase
    .from('games')
    .select('*')
    .or(
      `and(player1.ilike.${p1},player2.ilike.${p2}),and(player1.ilike.${p2},player2.ilike.${p1})`
    )

  if (error || !data) {
    console.error('[Supabase] Error fetching head to head:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    })
    return { wins: 0, losses: 0, draws: 0 }
  }

  const record = { wins: 0, losses: 0, draws: 0 }
  const p1Lower = player1.toLowerCase()

  data.forEach((game) => {
    if (!game.winner) {
      record.draws++
    } else if (game.winner.toLowerCase() === p1Lower) {
      record.wins++
    } else {
      record.losses++
    }
  })

  return record
}
