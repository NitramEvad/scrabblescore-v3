import { useState, useEffect, useCallback } from 'react'
import {
  saveGame,
  getGameHistory,
  getHeadToHeadRecord,
  GameRecord,
  Turn,
} from '../supabase'
import { useDebounce } from './useDebounce'
import { SLOW_TURN_THRESHOLD, LOCALSTORAGE_GAME_KEY } from '../constants'

export type GamePhase = 'setup' | 'playing' | 'finished'

export interface CurrentGame {
  id: string
  player1: string
  player2: string
  turns: Turn[]
  startTime: number
  endTime?: number
  winner?: string | null
  finalScores?: { player1: number; player2: number }
}

export type HeadToHeadRecord = { wins: number; losses: number; draws: number }

// --- localStorage helpers ---

function loadGameFromStorage(): {
  game: CurrentGame
  phase: GamePhase
  lastTurnTime: number
} | null {
  try {
    const raw = localStorage.getItem(LOCALSTORAGE_GAME_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.game && parsed?.phase === 'playing') return parsed
  } catch {
    localStorage.removeItem(LOCALSTORAGE_GAME_KEY)
  }
  return null
}

function persistGameToStorage(
  game: CurrentGame | null,
  phase: GamePhase,
  lastTurnTime: number | null
) {
  if (phase === 'playing' && game) {
    localStorage.setItem(
      LOCALSTORAGE_GAME_KEY,
      JSON.stringify({ game, phase, lastTurnTime })
    )
  } else {
    localStorage.removeItem(LOCALSTORAGE_GAME_KEY)
  }
}

// --- Slow-turn comment generation ---

const slowTurnFallbacks = [
  (name: string) => `${name} is playing Scrabble or writing a novel?`,
  (name: string) => `Did ${name} fall asleep on the tiles?`,
  (name: string) => `${name}'s turn sponsored by continental drift.`,
  (name: string) => `Somewhere, a glacier moved faster than ${name}.`,
  (name: string) =>
    `${name}: Making "quick thinking" an oxymoron since today.`,
]

async function getSlowTurnComment(
  playerName: string,
  durationMs: number
): Promise<string> {
  const minutes = Math.floor(durationMs / 60000)
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: `Write a single short, cheeky one-liner (max 15 words) gently mocking ${playerName} for taking ${minutes} minute${minutes > 1 ? 's' : ''} on their Scrabble turn. Be playful and funny, not mean. Just the quip, nothing else.`,
          },
        ],
      }),
    })
    const data = await response.json()
    return (
      data.content?.[0]?.text ||
      `${playerName} apparently needed a nap mid-turn...`
    )
  } catch {
    const fn =
      slowTurnFallbacks[Math.floor(Math.random() * slowTurnFallbacks.length)]
    return fn(playerName)
  }
}

async function generateVictoryPoemFromAPI(
  winnerName: string,
  loserName: string,
  winnerScore: number,
  loserScore: number
): Promise<string> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Write a short, playful, slightly over-the-top celebratory poem (4-6 lines) praising ${winnerName} for their glorious Scrabble victory over ${loserName}. The final score was ${winnerScore} to ${loserScore}. Be funny and theatrical, perhaps gently teasing the loser. Keep it lighthearted and fun. Just the poem, no introduction.`,
          },
        ],
      }),
    })
    const data = await response.json()
    return (
      data.content
        ?.map((item: { text?: string }) => item.text || '')
        .join('\n') || 'A worthy champion has emerged!'
    )
  } catch {
    return `All hail ${winnerName}, the Scrabble sovereign!\nWhose letters aligned in ways most buoyant!\nWhile ${loserName} tried their best, it's true,\nBut ${winnerScore} to ${loserScore}? There's nothing they could do!`
  }
}

// --- Main hook ---

export function useScrabbleGame() {
  // Try restoring an in-progress game from localStorage
  const restored = loadGameFromStorage()

  const [gamePhase, setGamePhase] = useState<GamePhase>(
    restored ? 'playing' : 'setup'
  )
  const [player1Name, setPlayer1Name] = useState(
    restored?.game.player1 ?? ''
  )
  const [player2Name, setPlayer2Name] = useState(
    restored?.game.player2 ?? ''
  )
  const [currentGame, setCurrentGame] = useState<CurrentGame | null>(
    restored?.game ?? null
  )
  const [scoreInput, setScoreInput] = useState('')
  const [editingTurn, setEditingTurn] = useState<number | null>(null)
  const [editScore, setEditScore] = useState('')
  const [gameHistory, setGameHistory] = useState<GameRecord[]>([])
  const [lastTurnTime, setLastTurnTime] = useState<number | null>(
    restored?.lastTurnTime ?? null
  )
  const [isLoading, setIsLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [victoryPoem, setVictoryPoem] = useState('')
  const [generatingPoem, setGeneratingPoem] = useState(false)
  const [slowTurnComment, setSlowTurnComment] = useState('')
  const [headToHead, setHeadToHead] = useState<HeadToHeadRecord | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Debounce player names for head-to-head lookup (400ms)
  const debouncedPlayer1 = useDebounce(player1Name, 400)
  const debouncedPlayer2 = useDebounce(player2Name, 400)

  // Persist game state to localStorage whenever it changes
  useEffect(() => {
    persistGameToStorage(currentGame, gamePhase, lastTurnTime)
  }, [currentGame, gamePhase, lastTurnTime])

  // Load game history on mount
  useEffect(() => {
    const loadHistory = async () => {
      const history = await getGameHistory()
      setGameHistory(history)
      setIsLoading(false)
    }
    loadHistory()
  }, [])

  // Load head-to-head when debounced player names change
  useEffect(() => {
    const loadHeadToHead = async () => {
      if (debouncedPlayer1.trim() && debouncedPlayer2.trim()) {
        const record = await getHeadToHeadRecord(
          debouncedPlayer1.trim(),
          debouncedPlayer2.trim()
        )
        setHeadToHead(record)
      } else {
        setHeadToHead(null)
      }
    }
    loadHeadToHead()
  }, [debouncedPlayer1, debouncedPlayer2])

  // Calculate totals
  const calculateTotals = useCallback(
    (game: CurrentGame | null): { player1: number; player2: number } => {
      if (!game?.turns) return { player1: 0, player2: 0 }
      return game.turns.reduce(
        (acc, turn) => {
          if (turn.player === game.player1) acc.player1 += turn.score
          else acc.player2 += turn.score
          return acc
        },
        { player1: 0, player2: 0 }
      )
    },
    []
  )

  const totals = calculateTotals(currentGame)

  // Get current player
  const getCurrentPlayer = useCallback((): string | null => {
    if (!currentGame) return null
    return currentGame.turns.length % 2 === 0
      ? currentGame.player1
      : currentGame.player2
  }, [currentGame])

  // Format duration
  const formatDuration = useCallback((ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (minutes > 0) return `${minutes} m ${secs} s`
    return `${secs} s`
  }, [])

  // Validate player names
  const validatePlayerNames = useCallback((): string | null => {
    const p1 = player1Name.trim()
    const p2 = player2Name.trim()
    if (!p1 || !p2) return 'Both player names are required.'
    if (p1.length > 30 || p2.length > 30)
      return 'Player names must be 30 characters or less.'
    if (p1.toLowerCase() === p2.toLowerCase())
      return 'Player names must be different.'
    return null
  }, [player1Name, player2Name])

  // Start a new game
  const startGame = useCallback(() => {
    if (validatePlayerNames()) return

    const newGame: CurrentGame = {
      id: Date.now().toString(),
      player1: player1Name.trim(),
      player2: player2Name.trim(),
      turns: [],
      startTime: Date.now(),
    }
    setCurrentGame(newGame)
    setLastTurnTime(Date.now())
    setSaveError(null)
    setGamePhase('playing')
  }, [player1Name, player2Name, validatePlayerNames])

  // Add a score
  const addScore = useCallback(async () => {
    const score = parseInt(scoreInput, 10)
    if (isNaN(score) || score < 0 || !lastTurnTime) return

    const now = Date.now()
    const duration = now - lastTurnTime
    const player = getCurrentPlayer()
    if (!player) return

    const newTurn: Turn = { player, score, timestamp: now, duration }

    setCurrentGame((prev) =>
      prev ? { ...prev, turns: [...prev.turns, newTurn] } : null
    )
    setLastTurnTime(now)
    setScoreInput('')

    if (duration > SLOW_TURN_THRESHOLD) {
      setSlowTurnComment('Thinking of something witty...')
      const comment = await getSlowTurnComment(player, duration)
      setSlowTurnComment(comment)
      setTimeout(() => setSlowTurnComment(''), 5000)
    } else {
      setSlowTurnComment('')
    }
  }, [scoreInput, lastTurnTime, getCurrentPlayer])

  // Edit a score
  const saveEdit = useCallback(
    (index: number) => {
      const newScore = parseInt(editScore, 10)
      if (isNaN(newScore) || newScore < 0) return

      setCurrentGame((prev) =>
        prev
          ? {
              ...prev,
              turns: prev.turns.map((turn, i) =>
                i === index ? { ...turn, score: newScore } : turn
              ),
            }
          : null
      )
      setEditingTurn(null)
      setEditScore('')
    },
    [editScore]
  )

  // End game
  const endGame = useCallback(async () => {
    if (!currentGame) return

    setIsSaving(true)
    setSaveError(null)
    const endTotals = calculateTotals(currentGame)
    let winner: string | null = null
    if (endTotals.player1 > endTotals.player2) winner = currentGame.player1
    else if (endTotals.player2 > endTotals.player1)
      winner = currentGame.player2

    const durationMinutes = Math.floor(
      (Date.now() - currentGame.startTime) / 60000
    )

    const gameRecord: GameRecord = {
      player1: currentGame.player1,
      player2: currentGame.player2,
      player1_score: endTotals.player1,
      player2_score: endTotals.player2,
      winner,
      turns: currentGame.turns,
      duration_minutes: durationMinutes,
    }

    const saved = await saveGame(gameRecord)

    if (!saved) {
      setSaveError('Failed to save game. Please try again.')
      setIsSaving(false)
      return
    }

    const history = await getGameHistory()
    setGameHistory(history)

    const record = await getHeadToHeadRecord(
      currentGame.player1,
      currentGame.player2
    )
    setHeadToHead(record)

    const finishedGame: CurrentGame = {
      ...currentGame,
      endTime: Date.now(),
      winner,
      finalScores: endTotals,
    }

    setCurrentGame(finishedGame)
    setGamePhase('finished')
    setIsSaving(false)

    if (winner) {
      const loser =
        winner === currentGame.player1
          ? currentGame.player2
          : currentGame.player1
      const winnerScore =
        winner === currentGame.player1 ? endTotals.player1 : endTotals.player2
      const loserScore =
        winner === currentGame.player1 ? endTotals.player2 : endTotals.player1
      setGeneratingPoem(true)
      const poem = await generateVictoryPoemFromAPI(
        winner,
        loser,
        winnerScore,
        loserScore
      )
      setVictoryPoem(poem)
      setGeneratingPoem(false)
    } else {
      setVictoryPoem(
        "A draw! Both minds equally matched,\nNo victor, no vanquished, no pride scratched.\nShake hands, dear foes, and play once more,\nFor next time, someone must settle the score!"
      )
    }
  }, [currentGame, calculateTotals])

  // Reset for new game
  const newGame = useCallback(() => {
    setGamePhase('setup')
    setCurrentGame(null)
    setScoreInput('')
    setEditingTurn(null)
    setVictoryPoem('')
    setSlowTurnComment('')
    setSaveError(null)
  }, [])

  return {
    // State
    gamePhase,
    player1Name,
    player2Name,
    currentGame,
    scoreInput,
    editingTurn,
    editScore,
    gameHistory,
    isLoading,
    showHistory,
    victoryPoem,
    generatingPoem,
    slowTurnComment,
    headToHead,
    isSaving,
    saveError,
    totals,

    // Setters
    setPlayer1Name,
    setPlayer2Name,
    setScoreInput,
    setEditingTurn,
    setEditScore,
    setShowHistory,

    // Actions
    startGame,
    addScore,
    saveEdit,
    endGame,
    newGame,
    getCurrentPlayer,
    formatDuration,
    validatePlayerNames,
  }
}
