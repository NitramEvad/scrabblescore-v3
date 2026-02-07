import { Turn } from '../supabase'

interface TurnHistoryProps {
  turns: Turn[]
  editingTurn: number | null
  editScore: string
  onEditStart: (index: number, currentScore: number) => void
  onEditSave: (index: number) => void
  onEditCancel: () => void
  onEditScoreChange: (value: string) => void
  formatDuration: (ms: number) => string
}

export function TurnHistory({
  turns,
  editingTurn,
  editScore,
  onEditStart,
  onEditSave,
  onEditCancel,
  onEditScoreChange,
  formatDuration,
}: TurnHistoryProps) {
  if (turns.length === 0) return null

  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-amber-400/30 mb-4 md:mb-6">
      <h3 className="text-amber-200/80 text-sm mb-3">Turn History</h3>
      <div
        className="custom-scrollbar space-y-2 max-h-48 overflow-y-auto pr-2"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor:
            'rgba(245, 200, 140, 0.5) rgba(180, 150, 120, 0.15)',
        }}
      >
        {turns.map((turn, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-2 px-3 bg-amber-200/10 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <span className="text-amber-500/60 text-xs w-6">
                #{index + 1}
              </span>
              <span className="text-amber-100">{turn.player}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-amber-200/50 text-xs">
                {formatDuration(turn.duration)}
              </span>
              {editingTurn === index ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editScore}
                    onChange={(e) => onEditScoreChange(e.target.value)}
                    className="w-16 px-2 py-1 bg-amber-100/15 border border-amber-400/40 rounded text-amber-100 text-center text-sm"
                    autoFocus
                  />
                  <button
                    onClick={() => onEditSave(index)}
                    className="text-green-400 hover:text-green-300 p-1"
                  >
                    ✓
                  </button>
                  <button
                    onClick={onEditCancel}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-amber-100 font-medium w-12 text-right">
                    {turn.score}
                  </span>
                  <button
                    onClick={() => onEditStart(index, turn.score)}
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
  )
}
