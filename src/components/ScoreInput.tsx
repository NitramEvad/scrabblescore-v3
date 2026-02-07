interface ScoreInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  currentPlayer: string | null
  roundNumber: number
  slowTurnComment: string
}

export function ScoreInput({
  value,
  onChange,
  onSubmit,
  currentPlayer,
  roundNumber,
  slowTurnComment,
}: ScoreInputProps) {
  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-amber-400/30 mb-4 md:mb-6">
      <p className="text-amber-200/80 text-sm mb-2">
        Round {roundNumber} &bull; {currentPlayer}&rsquo;s turn
      </p>
      <div className="flex gap-3 items-center">
        <div className="flex-1 flex items-center bg-amber-100/10 border border-amber-400/30 rounded-lg overflow-hidden">
          <button
            onClick={() =>
              onChange(
                Math.max(0, (parseInt(value, 10) || 0) - 1).toString()
              )
            }
            className="px-4 py-4 text-amber-300 hover:text-amber-100 hover:bg-amber-400/20 active:bg-amber-400/30 transition-all border-r border-amber-400/30 text-xl font-light"
          >
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            placeholder="0"
            min="0"
            className="flex-1 px-4 py-4 bg-transparent text-amber-100 text-xl text-center placeholder-amber-300/50 focus:outline-none"
          />
          <button
            onClick={() =>
              onChange(((parseInt(value, 10) || 0) + 1).toString())
            }
            className="px-4 py-4 text-amber-300 hover:text-amber-100 hover:bg-amber-400/20 active:bg-amber-400/30 transition-all border-l border-amber-400/30 text-xl font-light"
          >
            +
          </button>
        </div>
        <button
          onClick={onSubmit}
          disabled={!value}
          className="px-6 py-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
        >
          Add
        </button>
      </div>

      {slowTurnComment && (
        <div className="mt-3 p-3 bg-amber-200/15 rounded-lg border border-amber-400/30 animate-pulse">
          <p className="text-amber-200 text-sm italic text-center">
            🐌 {slowTurnComment}
          </p>
        </div>
      )}
    </div>
  )
}
