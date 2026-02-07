import { HeadToHeadRecord } from '../hooks/useScrabbleGame'

interface HeadToHeadProps {
  record: HeadToHeadRecord
  player1Label?: string
  player2Label?: string
}

export function HeadToHead({ record, player1Label, player2Label }: HeadToHeadProps) {
  const total = record.wins + record.losses + record.draws

  if (total === 0) {
    return <p className="text-amber-100 text-center mt-2">First match!</p>
  }

  return (
    <div className="flex justify-center gap-6 mt-2 text-center">
      <div>
        <p className="text-2xl text-green-400">{record.wins}</p>
        <p className="text-xs text-amber-200/60">
          {player1Label ? `${player1Label} wins` : 'Wins'}
        </p>
      </div>
      <div>
        <p className="text-2xl text-amber-400">{record.draws}</p>
        <p className="text-xs text-amber-200/60">Draws</p>
      </div>
      <div>
        <p className="text-2xl text-red-400">{record.losses}</p>
        <p className="text-xs text-amber-200/60">
          {player2Label ? `${player2Label} wins` : 'Losses'}
        </p>
      </div>
    </div>
  )
}
