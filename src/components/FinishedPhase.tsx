import { CurrentGame, HeadToHeadRecord } from '../hooks/useScrabbleGame'
import { HeadToHead } from './HeadToHead'

interface FinishedPhaseProps {
  game: CurrentGame
  totals: { player1: number; player2: number }
  headToHead: HeadToHeadRecord | null
  victoryPoem: string
  generatingPoem: boolean
  onNewGame: () => void
}

export function FinishedPhase({
  game,
  totals,
  headToHead,
  victoryPoem,
  generatingPoem,
  onNewGame,
}: FinishedPhaseProps) {
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-amber-400/30 text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-3xl text-amber-100 mb-2">Game Over</h2>

        {game.winner ? (
          <p className="text-xl text-amber-400 mb-6">{game.winner} wins!</p>
        ) : (
          <p className="text-xl text-amber-400 mb-6">It&rsquo;s a draw!</p>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div
            className={`p-4 rounded-xl ${
              game.winner === game.player1
                ? 'bg-amber-400/20 border border-amber-400'
                : 'bg-amber-200/10'
            }`}
          >
            <p className="text-amber-200/80 truncate">{game.player1}</p>
            <p className="text-3xl text-amber-100">{totals.player1}</p>
          </div>
          <div
            className={`p-4 rounded-xl ${
              game.winner === game.player2
                ? 'bg-amber-400/20 border border-amber-400'
                : 'bg-amber-200/10'
            }`}
          >
            <p className="text-amber-200/80 truncate">{game.player2}</p>
            <p className="text-3xl text-amber-100">{totals.player2}</p>
          </div>
        </div>

        {headToHead && (
          <div className="p-4 bg-amber-200/10 rounded-lg border border-amber-400/20 mb-6">
            <p className="text-amber-200/70 text-sm">Overall Head to Head</p>
            <HeadToHead
              record={headToHead}
              player1Label={game.player1}
              player2Label={game.player2}
            />
          </div>
        )}

        {/* Victory Poem */}
        <div className="p-4 bg-gradient-to-br from-amber-300/15 to-amber-400/10 rounded-lg border border-amber-400/25 mb-6">
          <p className="text-amber-500 text-xs uppercase tracking-widest mb-2 text-center">
            ✨ Ode to the Victor ✨
          </p>
          {generatingPoem ? (
            <p className="text-amber-200/70 text-center italic animate-pulse">
              Composing a masterpiece...
            </p>
          ) : (
            <p className="text-amber-100 text-center italic whitespace-pre-line leading-relaxed">
              {victoryPoem}
            </p>
          )}
        </div>

        <button
          onClick={onNewGame}
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:from-amber-600 active:to-amber-700 text-white rounded-lg transition-all duration-300 tracking-wide font-medium text-lg"
        >
          New Game
        </button>
      </div>
    </div>
  )
}
