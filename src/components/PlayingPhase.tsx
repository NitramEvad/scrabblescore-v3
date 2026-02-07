import { CurrentGame } from '../hooks/useScrabbleGame'
import { PlayerCard } from './PlayerCard'
import { ScoreInput } from './ScoreInput'
import { TurnHistory } from './TurnHistory'

interface PlayingPhaseProps {
  game: CurrentGame
  totals: { player1: number; player2: number }
  currentPlayer: string | null
  scoreInput: string
  onScoreChange: (value: string) => void
  onAddScore: () => void
  slowTurnComment: string
  editingTurn: number | null
  editScore: string
  onEditStart: (index: number, currentScore: number) => void
  onEditSave: (index: number) => void
  onEditCancel: () => void
  onEditScoreChange: (value: string) => void
  formatDuration: (ms: number) => string
  onEndGame: () => void
  isSaving: boolean
  saveError: string | null
}

export function PlayingPhase({
  game,
  totals,
  currentPlayer,
  scoreInput,
  onScoreChange,
  onAddScore,
  slowTurnComment,
  editingTurn,
  editScore,
  onEditStart,
  onEditSave,
  onEditCancel,
  onEditScoreChange,
  formatDuration,
  onEndGame,
  isSaving,
  saveError,
}: PlayingPhaseProps) {
  const roundNumber = Math.floor(game.turns.length / 2) + 1

  return (
    <div className="max-w-2xl mx-auto">
      {/* Scoreboard */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
        <PlayerCard
          name={game.player1}
          score={totals.player1}
          isActive={currentPlayer === game.player1}
        />
        <PlayerCard
          name={game.player2}
          score={totals.player2}
          isActive={currentPlayer === game.player2}
        />
      </div>

      <ScoreInput
        value={scoreInput}
        onChange={onScoreChange}
        onSubmit={onAddScore}
        currentPlayer={currentPlayer}
        roundNumber={roundNumber}
        slowTurnComment={slowTurnComment}
      />

      <TurnHistory
        turns={game.turns}
        editingTurn={editingTurn}
        editScore={editScore}
        onEditStart={onEditStart}
        onEditSave={onEditSave}
        onEditCancel={onEditCancel}
        onEditScoreChange={onEditScoreChange}
        formatDuration={formatDuration}
      />

      {saveError && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-400/40 rounded-lg">
          <p className="text-red-300 text-sm text-center">{saveError}</p>
        </div>
      )}

      <button
        onClick={onEndGame}
        disabled={isSaving}
        className="w-full py-4 bg-gradient-to-r from-red-500/80 to-red-600/80 hover:from-red-400 hover:to-red-500 active:from-red-600 active:to-red-700 disabled:from-gray-500 disabled:to-gray-600 text-white rounded-lg transition-all duration-300 tracking-wide border border-red-400/30 font-medium"
      >
        {isSaving ? 'Saving...' : 'End Game'}
      </button>
    </div>
  )
}
