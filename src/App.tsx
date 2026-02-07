import { useState, useEffect } from 'react'
import { saveGame, getGameHistory, getHeadToHeadRecord, GameRecord, Turn } from './supabase'

// Background patterns representing interests
const backgroundPatterns = [
  // Cambridge - Gothic arches
  {
    background: `
      radial-gradient(ellipse 100% 150% at 50% 0%, rgba(60,80,120,0.3) 0%, transparent 50%),
      repeating-linear-gradient(90deg, transparent 0px, transparent 60px, rgba(80,70,60,0.15) 60px, rgba(80,70,60,0.15) 62px),
      repeating-linear-gradient(0deg, transparent 0px, transparent 100px, rgba(80,70,60,0.1) 100px, rgba(80,70,60,0.1) 102px),
      linear-gradient(180deg, #2a2520 0%, #3d3530 50%, #2a2822 100%)`,
    size: 'cover'
  },
  // Wine - Rich burgundy waves
  {
    background: `
      radial-gradient(ellipse 80% 50% at 10% 90%, rgba(120,40,60,0.4) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 90% 10%, rgba(100,30,50,0.3) 0%, transparent 50%),
      radial-gradient(ellipse 100% 60% at 50% 100%, rgba(80,20,40,0.35) 0%, transparent 70%),
      linear-gradient(135deg, #2d1a1f 0%, #3d2028 50%, #2a1820 100%)`,
    size: 'cover'
  },
  // Paragliding - Open sky
  {
    background: `
      radial-gradient(ellipse 120% 80% at 30% 20%, rgba(140,180,220,0.2) 0%, transparent 50%),
      radial-gradient(ellipse 80% 60% at 70% 70%, rgba(100,140,180,0.15) 0%, transparent 40%),
      radial-gradient(ellipse 50% 30% at 20% 60%, rgba(200,220,240,0.1) 0%, transparent 50%),
      linear-gradient(180deg, #1e3040 0%, #2a4050 30%, #354858 70%, #3d525f 100%)`,
    size: 'cover'
  },
  // Annecy - Lake reflections
  {
    background: `
      radial-gradient(ellipse 150% 40% at 50% 80%, rgba(80,160,180,0.25) 0%, transparent 60%),
      radial-gradient(ellipse 100% 30% at 30% 90%, rgba(60,140,160,0.2) 0%, transparent 50%),
      radial-gradient(ellipse 80% 50% at 70% 30%, rgba(100,180,160,0.15) 0%, transparent 40%),
      linear-gradient(180deg, #1a2e30 0%, #234040 40%, #1e3838 100%)`,
    size: 'cover'
  },
  // Yoga - Warm sunset meditation
  {
    background: `
      radial-gradient(circle at 50% 50%, rgba(220,180,120,0.15) 0%, rgba(200,150,100,0.1) 20%, transparent 45%),
      radial-gradient(circle at 50% 50%, transparent 35%, rgba(180,130,80,0.08) 36%, transparent 38%),
      radial-gradient(circle at 50% 50%, transparent 50%, rgba(160,110,60,0.06) 51%, transparent 53%),
      radial-gradient(ellipse 120% 80% at 80% 90%, rgba(180,100,60,0.2) 0%, transparent 50%),
      linear-gradient(135deg, #2e2418 0%, #3d3020 50%, #2a2218 100%)`,
    size: 'cover'
  }
]

interface CurrentGame {
  id: string
  player1: string
  player2: string
  turns: Turn[]
  startTime: number
  endTime?: number
  winner?: string | null
  finalScores?: { player1: number; player2: number }
}

function App() {
  // Game state
  const [gamePhase, setGamePhase] = useState<'setup' | 'playing' | 'finished'>('setup')
  const [player1Name, setPlayer1Name] = useState('')
  const [player2Name, setPlayer2Name] = useState('')
  const [currentGame, setCurrentGame] = useState<CurrentGame | null>(null)
  const [scoreInput, setScoreInput] = useState('')
  const [editingTurn, setEditingTurn] = useState<number | null>(null)
  const [editScore, setEditScore] = useState('')
  const [gameHistory, setGameHistory] = useState<GameRecord[]>([])
  const [lastTurnTime, setLastTurnTime] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [victoryPoem, setVictoryPoem] = useState('')
  const [generatingPoem, setGeneratingPoem] = useState(false)
  const [slowTurnComment, setSlowTurnComment] = useState('')
  const [headToHead, setHeadToHead] = useState<{ wins: number; losses: number; draws: number } | null>(null)
  const [bgIndex, setBgIndex] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  // Threshold for "slow" turn (60 seconds)
  const SLOW_TURN_THRESHOLD = 60000

  // Load game history from Supabase on mount
  useEffect(() => {
    const loadHistory = async () => {
      const history = await getGameHistory()
      setGameHistory(history)
      setIsLoading(false)
    }
    loadHistory()
  }, [])

  // Load head-to-head when player names change
  useEffect(() => {
    const loadHeadToHead = async () => {
      if (player1Name.trim() && player2Name.trim()) {
        const record = await getHeadToHeadRecord(player1Name.trim(), player2Name.trim())
        setHeadToHead(record)
      } else {
        setHeadToHead(null)
      }
    }
    loadHeadToHead()
  }, [player1Name, player2Name])

  // Format duration
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (minutes > 0) return `${minutes} m ${secs} s`
    return `${secs} s`
  }

  // Generate victory poem
  const generateVictoryPoem = async (winnerName: string, loserName: string, winnerScore: number, loserScore: number) => {
    setGeneratingPoem(true)
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Write a short, playful, slightly over-the-top celebratory poem (4-6 lines) praising ${winnerName} for their glorious Scrabble victory over ${loserName}. The final score was ${winnerScore} to ${loserScore}. Be funny and theatrical, perhaps gently teasing the loser. Keep it lighthearted and fun. Just the poem, no introduction.`
          }]
        })
      })
      const data = await response.json()
      const poem = data.content?.map((item: { text?: string }) => item.text || '').join('\n') || 'A worthy champion has emerged!'
      setVictoryPoem(poem)
    } catch {
      setVictoryPoem(`All hail ${winnerName}, the Scrabble sovereign!\nWhose letters aligned in ways most buoyant!\nWhile ${loserName} tried their best, it's true,\nBut ${winnerScore} to ${loserScore}? There's nothing they could do!`)
    }
    setGeneratingPoem(false)
  }

  // Generate a cheeky comment for slow turns
  const getSlowTurnComment = async (playerName: string, durationMs: number): Promise<string> => {
    const minutes = Math.floor(durationMs / 60000)
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 200,
          messages: [{
            role: "user",
            content: `Write a single short, cheeky one-liner (max 15 words) gently mocking ${playerName} for taking ${minutes} minute${minutes > 1 ? 's' : ''} on their Scrabble turn. Be playful and funny, not mean. Just the quip, nothing else.`
          }]
        })
      })
      const data = await response.json()
      return data.content?.[0]?.text || `${playerName} apparently needed a nap mid-turn...`
    } catch {
      const fallbacks = [
        `${playerName} is playing Scrabble or writing a novel?`,
        `Did ${playerName} fall asleep on the tiles?`,
        `${playerName}'s turn sponsored by continental drift.`,
        `Somewhere, a glacier moved faster than ${playerName}.`,
        `${playerName}: Making "quick thinking" an oxymoron since today.`
      ]
      return fallbacks[Math.floor(Math.random() * fallbacks.length)]
    }
  }

  // Calculate totals for a game
  const calculateTotals = (game: CurrentGame | null): { player1: number; player2: number } => {
    if (!game || !game.turns) return { player1: 0, player2: 0 }
    return game.turns.reduce(
      (acc, turn) => {
        if (turn.player === game.player1) acc.player1 += turn.score
        else acc.player2 += turn.score
        return acc
      },
      { player1: 0, player2: 0 }
    )
  }

  // Start a new game
  const startGame = () => {
    if (!player1Name.trim() || !player2Name.trim()) return

    const newGame: CurrentGame = {
      id: Date.now().toString(),
      player1: player1Name.trim(),
      player2: player2Name.trim(),
      turns: [],
      startTime: Date.now(),
    }
    setCurrentGame(newGame)
    setLastTurnTime(Date.now())
    setGamePhase('playing')
  }

  // Get current player
  const getCurrentPlayer = (): string | null => {
    if (!currentGame) return null
    const turnCount = currentGame.turns.length
    return turnCount % 2 === 0 ? currentGame.player1 : currentGame.player2
  }

  // Add a score
  const addScore = async () => {
    const score = parseInt(scoreInput, 10)
    if (isNaN(score) || score < 0 || !lastTurnTime) return

    const now = Date.now()
    const duration = now - lastTurnTime
    const player = getCurrentPlayer()

    if (!player) return

    const newTurn: Turn = {
      player,
      score,
      timestamp: now,
      duration,
    }

    setCurrentGame((prev) => prev ? ({
      ...prev,
      turns: [...prev.turns, newTurn],
    }) : null)
    setLastTurnTime(now)
    setScoreInput('')

    // Check if turn was slow and generate a cheeky comment
    if (duration > SLOW_TURN_THRESHOLD) {
      setSlowTurnComment('Thinking of something witty...')
      const comment = await getSlowTurnComment(player, duration)
      setSlowTurnComment(comment)
      setTimeout(() => setSlowTurnComment(''), 5000)
    } else {
      setSlowTurnComment('')
    }
  }

  // Edit a score
  const saveEdit = (index: number) => {
    const newScore = parseInt(editScore, 10)
    if (isNaN(newScore) || newScore < 0) return

    setCurrentGame((prev) => prev ? ({
      ...prev,
      turns: prev.turns.map((turn, i) =>
        i === index ? { ...turn, score: newScore } : turn
      ),
    }) : null)
    setEditingTurn(null)
    setEditScore('')
  }

  // End game
  const endGame = async () => {
    if (!currentGame) return

    setIsSaving(true)
    const totals = calculateTotals(currentGame)
    let winner: string | null = null
    if (totals.player1 > totals.player2) winner = currentGame.player1
    else if (totals.player2 > totals.player1) winner = currentGame.player2

    const durationMinutes = Math.floor((Date.now() - currentGame.startTime) / 60000)

    // Save to Supabase
    const gameRecord: GameRecord = {
      player1: currentGame.player1,
      player2: currentGame.player2,
      player1_score: totals.player1,
      player2_score: totals.player2,
      winner,
      turns: currentGame.turns,
      duration_minutes: durationMinutes
    }

    await saveGame(gameRecord)

    // Refresh history
    const history = await getGameHistory()
    setGameHistory(history)

    // Update head to head
    const record = await getHeadToHeadRecord(currentGame.player1, currentGame.player2)
    setHeadToHead(record)

    const finishedGame: CurrentGame = {
      ...currentGame,
      endTime: Date.now(),
      winner,
      finalScores: totals,
    }

    setCurrentGame(finishedGame)
    setGamePhase('finished')
    setIsSaving(false)

    // Generate victory poem if there's a winner
    if (winner) {
      const loser = winner === currentGame.player1 ? currentGame.player2 : currentGame.player1
      const winnerScore = winner === currentGame.player1 ? totals.player1 : totals.player2
      const loserScore = winner === currentGame.player1 ? totals.player2 : totals.player1
      generateVictoryPoem(winner, loser, winnerScore, loserScore)
    } else {
      setVictoryPoem("A draw! Both minds equally matched,\nNo victor, no vanquished, no pride scratched.\nShake hands, dear foes, and play once more,\nFor next time, someone must settle the score!")
    }
  }

  // Reset for new game
  const newGame = () => {
    setGamePhase('setup')
    setCurrentGame(null)
    setScoreInput('')
    setEditingTurn(null)
    setVictoryPoem('')
    setSlowTurnComment('')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #4a3830 0%, #6a4a42 50%, #3a3a4e 100%)'
      }}>
        <div className="text-amber-200 text-xl">
          Loading...
        </div>
      </div>
    )
  }

  const totals = calculateTotals(currentGame)

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background with pattern */}
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: backgroundPatterns[bgIndex].background,
          backgroundSize: backgroundPatterns[bgIndex].size
        }}
      />

      {/* Subtle overlay for consistency */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.2) 100%)'
      }} />

      {/* Background cycle button */}
      <button
        onClick={() => setBgIndex((prev) => (prev + 1) % backgroundPatterns.length)}
        className="absolute top-4 right-4 z-20 px-3 py-2 bg-black/30 hover:bg-black/50 active:bg-black/60 text-amber-200/70 hover:text-amber-200 text-xs rounded-full transition-all border border-amber-400/20"
      >
        Theme {bgIndex + 1}/5
      </button>

      {/* Content */}
      <div className="relative z-10 min-h-screen p-4 pb-8">
        {/* Header */}
        <header className="text-center mb-6">
          <h1 className="text-3xl md:text-5xl font-light tracking-wide text-amber-100" style={{
            textShadow: '2px 2px 20px rgba(0,0,0,0.5)'
          }}>
            Scrabble
          </h1>
          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-600 to-transparent mx-auto mt-2" />
          <p className="text-amber-200/60 mt-2 text-sm tracking-widest uppercase">Score Tracker</p>
        </header>

        {/* Setup Phase */}
        {gamePhase === 'setup' && (
          <div className="max-w-md mx-auto">
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-amber-400/30">
              <h2 className="text-2xl text-amber-100 mb-6 text-center">New Game</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-amber-200/80 text-sm mb-2 tracking-wide">Player One</label>
                  <input
                    type="text"
                    value={player1Name}
                    onChange={(e) => setPlayer1Name(e.target.value)}
                    placeholder="Enter name"
                    className="w-full px-4 py-3 bg-amber-100/10 border border-amber-400/30 rounded-lg text-amber-100 placeholder-amber-300/50 focus:outline-none focus:border-amber-400 transition-colors text-base"
                  />
                </div>

                <div>
                  <label className="block text-amber-200/80 text-sm mb-2 tracking-wide">Player Two</label>
                  <input
                    type="text"
                    value={player2Name}
                    onChange={(e) => setPlayer2Name(e.target.value)}
                    placeholder="Enter name"
                    className="w-full px-4 py-3 bg-amber-100/10 border border-amber-400/30 rounded-lg text-amber-100 placeholder-amber-300/50 focus:outline-none focus:border-amber-400 transition-colors text-base"
                  />
                </div>

                {headToHead && (
                  <div className="mt-4 p-4 bg-amber-200/10 rounded-lg border border-amber-400/20">
                    <p className="text-amber-200/70 text-sm text-center">Head to Head Record</p>
                    {headToHead.wins + headToHead.losses + headToHead.draws === 0 ? (
                      <p className="text-amber-100 text-center mt-2">First match!</p>
                    ) : (
                      <div className="flex justify-center gap-6 mt-2 text-center">
                        <div>
                          <p className="text-2xl text-green-400">{headToHead.wins}</p>
                          <p className="text-xs text-amber-200/60">Wins</p>
                        </div>
                        <div>
                          <p className="text-2xl text-amber-400">{headToHead.draws}</p>
                          <p className="text-xs text-amber-200/60">Draws</p>
                        </div>
                        <div>
                          <p className="text-2xl text-red-400">{headToHead.losses}</p>
                          <p className="text-xs text-amber-200/60">Losses</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={startGame}
                  disabled={!player1Name.trim() || !player2Name.trim()}
                  className="w-full mt-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:from-amber-600 active:to-amber-700 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-300 tracking-wide font-medium text-lg"
                >
                  Start Game
                </button>
              </div>

              {gameHistory.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full mt-4 py-3 text-amber-400 hover:text-amber-300 active:text-amber-500 transition-colors text-sm"
                >
                  {showHistory ? 'Hide' : 'View'} Game History ({gameHistory.length} games)
                </button>
              )}

              {showHistory && (
                <div className="mt-4 max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
                  {gameHistory.map((game) => (
                    <div key={game.id} className="p-3 bg-amber-200/10 rounded-lg text-sm">
                      <div className="flex justify-between text-amber-100">
                        <span>{game.player1} vs {game.player2}</span>
                        <span className="text-amber-400">{game.player1_score} - {game.player2_score}</span>
                      </div>
                      <div className="text-amber-200/50 text-xs mt-1">
                        {game.created_at ? new Date(game.created_at).toLocaleDateString() : ''} • Winner: {game.winner || 'Draw'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Playing Phase */}
        {gamePhase === 'playing' && currentGame && (
          <div className="max-w-2xl mx-auto">
            {/* Scoreboard */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
              <div className={`bg-black/20 backdrop-blur-sm rounded-xl p-3 md:p-4 border transition-all duration-300 ${getCurrentPlayer() === currentGame.player1
                  ? 'border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'border-amber-400/30'
                }`}>
                <p className="text-amber-200/80 text-sm truncate">{currentGame.player1}</p>
                <p className="text-3xl md:text-4xl text-amber-100 mt-1">{totals.player1}</p>
                {getCurrentPlayer() === currentGame.player1 && (
                  <p className="text-amber-400 text-xs mt-2 animate-pulse">Playing...</p>
                )}
              </div>
              <div className={`bg-black/20 backdrop-blur-sm rounded-xl p-3 md:p-4 border transition-all duration-300 ${getCurrentPlayer() === currentGame.player2
                  ? 'border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'border-amber-400/30'
                }`}>
                <p className="text-amber-200/80 text-sm truncate">{currentGame.player2}</p>
                <p className="text-3xl md:text-4xl text-amber-100 mt-1">{totals.player2}</p>
                {getCurrentPlayer() === currentGame.player2 && (
                  <p className="text-amber-400 text-xs mt-2 animate-pulse">Playing...</p>
                )}
              </div>
            </div>

            {/* Score Input */}
            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-amber-400/30 mb-4 md:mb-6">
              <p className="text-amber-200/80 text-sm mb-2">
                Round {Math.floor(currentGame.turns.length / 2) + 1} • {getCurrentPlayer()}'s turn
              </p>
              <div className="flex gap-3 items-center">
                {/* Custom number input with styled arrows */}
                <div className="flex-1 flex items-center bg-amber-100/10 border border-amber-400/30 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setScoreInput(prev => Math.max(0, (parseInt(prev, 10) || 0) - 1).toString())}
                    className="px-4 py-4 text-amber-300 hover:text-amber-100 hover:bg-amber-400/20 active:bg-amber-400/30 transition-all border-r border-amber-400/30 text-xl font-light"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={scoreInput}
                    onChange={(e) => setScoreInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addScore()}
                    placeholder="0"
                    min="0"
                    className="flex-1 px-4 py-4 bg-transparent text-amber-100 text-xl text-center placeholder-amber-300/50 focus:outline-none"
                  />
                  <button
                    onClick={() => setScoreInput(prev => ((parseInt(prev, 10) || 0) + 1).toString())}
                    className="px-4 py-4 text-amber-300 hover:text-amber-100 hover:bg-amber-400/20 active:bg-amber-400/30 transition-all border-l border-amber-400/30 text-xl font-light"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={addScore}
                  disabled={!scoreInput}
                  className="px-6 py-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                >
                  Add
                </button>
              </div>

              {/* Slow turn mockery */}
              {slowTurnComment && (
                <div className="mt-3 p-3 bg-amber-200/15 rounded-lg border border-amber-400/30 animate-pulse">
                  <p className="text-amber-200 text-sm italic text-center">🐌 {slowTurnComment}</p>
                </div>
              )}
            </div>

            {/* Turn History */}
            {currentGame.turns.length > 0 && (
              <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-amber-400/30 mb-4 md:mb-6">
                <h3 className="text-amber-200/80 text-sm mb-3">Turn History</h3>
                <div
                  className="custom-scrollbar space-y-2 max-h-48 overflow-y-auto pr-2"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(245, 200, 140, 0.5) rgba(180, 150, 120, 0.15)'
                  }}
                >
                  {currentGame.turns.map((turn, index) => (
                    <div key={index} className="flex items-center justify-between py-2 px-3 bg-amber-200/10 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-amber-500/60 text-xs w-6">#{index + 1}</span>
                        <span className="text-amber-100">{turn.player}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-amber-200/50 text-xs">{formatDuration(turn.duration)}</span>
                        {editingTurn === index ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              inputMode="numeric"
                              value={editScore}
                              onChange={(e) => setEditScore(e.target.value)}
                              className="w-16 px-2 py-1 bg-amber-100/15 border border-amber-400/40 rounded text-amber-100 text-center text-sm"
                              autoFocus
                            />
                            <button onClick={() => saveEdit(index)} className="text-green-400 hover:text-green-300 p-1">
                              ✓
                            </button>
                            <button onClick={() => setEditingTurn(null)} className="text-red-400 hover:text-red-300 p-1">
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-amber-100 font-medium w-12 text-right">{turn.score}</span>
                            <button
                              onClick={() => { setEditingTurn(index); setEditScore(turn.score.toString()) }}
                              className="text-amber-400/70 hover:text-amber-300 text-xs p-1"
                            >
                              edit
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* End Game Button */}
            <button
              onClick={endGame}
              disabled={isSaving}
              className="w-full py-4 bg-gradient-to-r from-red-500/80 to-red-600/80 hover:from-red-400 hover:to-red-500 active:from-red-600 active:to-red-700 disabled:from-gray-500 disabled:to-gray-600 text-white rounded-lg transition-all duration-300 tracking-wide border border-red-400/30 font-medium"
            >
              {isSaving ? 'Saving...' : 'End Game'}
            </button>
          </div>
        )}

        {/* Finished Phase */}
        {gamePhase === 'finished' && currentGame && (
          <div className="max-w-md mx-auto">
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-amber-400/30 text-center">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-3xl text-amber-100 mb-2">Game Over</h2>

              {currentGame.winner ? (
                <p className="text-xl text-amber-400 mb-6">{currentGame.winner} wins!</p>
              ) : (
                <p className="text-xl text-amber-400 mb-6">It's a draw!</p>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className={`p-4 rounded-xl ${currentGame.winner === currentGame.player1 ? 'bg-amber-400/20 border border-amber-400' : 'bg-amber-200/10'}`}>
                  <p className="text-amber-200/80 truncate">{currentGame.player1}</p>
                  <p className="text-3xl text-amber-100">{totals.player1}</p>
                </div>
                <div className={`p-4 rounded-xl ${currentGame.winner === currentGame.player2 ? 'bg-amber-400/20 border border-amber-400' : 'bg-amber-200/10'}`}>
                  <p className="text-amber-200/80 truncate">{currentGame.player2}</p>
                  <p className="text-3xl text-amber-100">{totals.player2}</p>
                </div>
              </div>

              {/* Head to Head Record */}
              {headToHead && (
                <div className="p-4 bg-amber-200/10 rounded-lg border border-amber-400/20 mb-6">
                  <p className="text-amber-200/70 text-sm">Overall Head to Head</p>
                  <div className="flex justify-center gap-8 mt-3">
                    <div>
                      <p className="text-2xl text-green-400">{headToHead.wins}</p>
                      <p className="text-xs text-amber-200/60">{currentGame.player1} wins</p>
                    </div>
                    <div>
                      <p className="text-2xl text-amber-400">{headToHead.draws}</p>
                      <p className="text-xs text-amber-200/60">Draws</p>
                    </div>
                    <div>
                      <p className="text-2xl text-red-400">{headToHead.losses}</p>
                      <p className="text-xs text-amber-200/60">{currentGame.player2} wins</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Victory Poem */}
              <div className="p-4 bg-gradient-to-br from-amber-300/15 to-amber-400/10 rounded-lg border border-amber-400/25 mb-6">
                <p className="text-amber-500 text-xs uppercase tracking-widest mb-2 text-center">✨ Ode to the Victor ✨</p>
                {generatingPoem ? (
                  <p className="text-amber-200/70 text-center italic animate-pulse">Composing a masterpiece...</p>
                ) : (
                  <p className="text-amber-100 text-center italic whitespace-pre-line leading-relaxed">{victoryPoem}</p>
                )}
              </div>

              <button
                onClick={newGame}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:from-amber-600 active:to-amber-700 text-white rounded-lg transition-all duration-300 tracking-wide font-medium text-lg"
              >
                New Game
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
