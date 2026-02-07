import { GameRecord } from '../supabase'
import { HeadToHeadRecord } from '../hooks/useScrabbleGame'
import { HeadToHead } from './HeadToHead'

interface SetupPhaseProps {
  player1Name: string
  player2Name: string
  onPlayer1Change: (name: string) => void
  onPlayer2Change: (name: string) => void
  headToHead: HeadToHeadRecord | null
  validationError: string | null
  onStartGame: () => void
  gameHistory: GameRecord[]
  showHistory: boolean
  onToggleHistory: () => void
}

export function SetupPhase({
  player1Name,
  player2Name,
  onPlayer1Change,
  onPlayer2Change,
  headToHead,
  validationError,
  onStartGame,
  gameHistory,
  showHistory,
  onToggleHistory,
}: SetupPhaseProps) {
  const canStart = player1Name.trim() && player2Name.trim() && !validationError

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-amber-400/30">
        <h2 className="text-2xl text-amber-100 mb-6 text-center">New Game</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-amber-200/80 text-sm mb-2 tracking-wide">
              Player One
            </label>
            <input
              type="text"
              value={player1Name}
              onChange={(e) => onPlayer1Change(e.target.value)}
              maxLength={30}
              placeholder="Enter name"
              className="w-full px-4 py-3 bg-amber-100/10 border border-amber-400/30 rounded-lg text-amber-100 placeholder-amber-300/50 focus:outline-none focus:border-amber-400 transition-colors text-base"
            />
          </div>

          <div>
            <label className="block text-amber-200/80 text-sm mb-2 tracking-wide">
              Player Two
            </label>
            <input
              type="text"
              value={player2Name}
              onChange={(e) => onPlayer2Change(e.target.value)}
              maxLength={30}
              placeholder="Enter name"
              className="w-full px-4 py-3 bg-amber-100/10 border border-amber-400/30 rounded-lg text-amber-100 placeholder-amber-300/50 focus:outline-none focus:border-amber-400 transition-colors text-base"
            />
          </div>

          {validationError && (
            <p className="text-red-400 text-sm text-center">{validationError}</p>
          )}

          {headToHead && (
            <div className="mt-4 p-4 bg-amber-200/10 rounded-lg border border-amber-400/20">
              <p className="text-amber-200/70 text-sm text-center">
                Head to Head Record
              </p>
              <HeadToHead record={headToHead} />
            </div>
          )}

          <button
            onClick={onStartGame}
            disabled={!canStart}
            className="w-full mt-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:from-amber-600 active:to-amber-700 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-300 tracking-wide font-medium text-lg"
          >
            Start Game
          </button>
        </div>

        {gameHistory.length > 0 && (
          <button
            onClick={onToggleHistory}
            className="w-full mt-4 py-3 text-amber-400 hover:text-amber-300 active:text-amber-500 transition-colors text-sm"
          >
            {showHistory ? 'Hide' : 'View'} Game History ({gameHistory.length}{' '}
            games)
          </button>
        )}

        {showHistory && (
          <div className="mt-4 max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
            {gameHistory.map((game) => (
              <div
                key={game.id}
                className="p-3 bg-amber-200/10 rounded-lg text-sm"
              >
                <div className="flex justify-between text-amber-100">
                  <span>
                    {game.player1} vs {game.player2}
                  </span>
                  <span className="text-amber-400">
                    {game.player1_score} - {game.player2_score}
                  </span>
                </div>
                <div className="text-amber-200/50 text-xs mt-1">
                  {game.created_at
                    ? new Date(game.created_at).toLocaleDateString()
                    : ''}{' '}
                  &bull; Winner: {game.winner || 'Draw'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
