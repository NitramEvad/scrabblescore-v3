import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://epqhqffynlfuwvpprlcw.supabase.co'
const supabaseAnonKey = 'sb_publishable_0GVmCKvMYE3LBvJuNlM6Eg_Fd_no8BC'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface GameRecord {
  id?: string
  created_at?: string
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

export async function saveGame(game: GameRecord): Promise<GameRecord | null> {
  const { data, error } = await supabase
    .from('games')
    .insert([game])
    .select()
    .single()
  
  if (error) {
    console.error('Error saving game:', error)
    return null
  }
  return data
}

export async function getGameHistory(): Promise<GameRecord[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching games:', error)
    return []
  }
  return data || []
}

export async function getHeadToHeadRecord(player1: string, player2: string): Promise<{ wins: number; losses: number; draws: number }> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .or(`and(player1.ilike.${player1},player2.ilike.${player2}),and(player1.ilike.${player2},player2.ilike.${player1})`)
  
  if (error || !data) {
    console.error('Error fetching head to head:', error)
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
