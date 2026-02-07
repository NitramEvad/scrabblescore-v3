import { useState } from 'react'
import { useScrabbleGame } from './hooks/useScrabbleGame'
import { backgroundPatterns } from './constants'
import { SetupPhase } from './components/SetupPhase'
import { PlayingPhase } from './components/PlayingPhase'
import { FinishedPhase } from './components/FinishedPhase'

function App() {
  const game = useScrabbleGame()
  const [bgIndex, setBgIndex] = useState(0)

  if (game.isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background:
            'linear-gradient(135deg, #4a3830 0%, #6a4a42 50%, #3a3a4e 100%)',
        }}
      >
        <div className="text-amber-200 text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background with pattern */}
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: backgroundPatterns[bgIndex].background,
          backgroundSize: backgroundPatterns[bgIndex].size,
        }}
      />

      {/* Subtle overlay for consistency */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.2) 100%)',
        }}
      />

      {/* Background cycle button */}
      <button
        onClick={() =>
          setBgIndex((prev) => (prev + 1) % backgroundPatterns.length)
        }
        className="absolute top-4 right-4 z-20 px-3 py-2 bg-black/30 hover:bg-black/50 active:bg-black/60 text-amber-200/70 hover:text-amber-200 text-xs rounded-full transition-all border border-amber-400/20"
      >
        Theme {bgIndex + 1}/{backgroundPatterns.length}
      </button>

      {/* Content */}
      <div className="relative z-10 min-h-screen p-4 pb-8">
        {/* Header */}
        <header className="text-center mb-6">
          <h1
            className="text-3xl md:text-5xl font-light tracking-wide text-amber-100"
            style={{ textShadow: '2px 2px 20px rgba(0,0,0,0.5)' }}
          >
            Scrabble
          </h1>
          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-600 to-transparent mx-auto mt-2" />
          <p className="text-amber-200/60 mt-2 text-sm tracking-widest uppercase">
            Score Tracker
          </p>
        </header>

        {game.gamePhase === 'setup' && (
          <SetupPhase
            player1Name={game.player1Name}
            player2Name={game.player2Name}
            onPlayer1Change={game.setPlayer1Name}
            onPlayer2Change={game.setPlayer2Name}
            headToHead={game.headToHead}
            validationError={game.validatePlayerNames()}
            onStartGame={game.startGame}
            gameHistory={game.gameHistory}
            showHistory={game.showHistory}
            onToggleHistory={() => game.setShowHistory(!game.showHistory)}
          />
        )}

        {game.gamePhase === 'playing' && game.currentGame && (
          <PlayingPhase
            game={game.currentGame}
            totals={game.totals}
            currentPlayer={game.getCurrentPlayer()}
            scoreInput={game.scoreInput}
            onScoreChange={game.setScoreInput}
            onAddScore={game.addScore}
            slowTurnComment={game.slowTurnComment}
            editingTurn={game.editingTurn}
            editScore={game.editScore}
            onEditStart={(index, score) => {
              game.setEditingTurn(index)
              game.setEditScore(score.toString())
            }}
            onEditSave={game.saveEdit}
            onEditCancel={() => game.setEditingTurn(null)}
            onEditScoreChange={game.setEditScore}
            formatDuration={game.formatDuration}
            onEndGame={game.endGame}
            isSaving={game.isSaving}
            saveError={game.saveError}
          />
        )}

        {game.gamePhase === 'finished' && game.currentGame && (
          <FinishedPhase
            game={game.currentGame}
            totals={game.totals}
            headToHead={game.headToHead}
            victoryPoem={game.victoryPoem}
            generatingPoem={game.generatingPoem}
            onNewGame={game.newGame}
          />
        )}
      </div>
    </div>
  )
}

export default App
