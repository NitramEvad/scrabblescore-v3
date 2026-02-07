interface PlayerCardProps {
  name: string
  score: number
  isActive: boolean
}

export function PlayerCard({ name, score, isActive }: PlayerCardProps) {
  return (
    <div
      className={`bg-black/20 backdrop-blur-sm rounded-xl p-3 md:p-4 border transition-all duration-300 ${
        isActive
          ? 'border-amber-400 shadow-lg shadow-amber-500/20'
          : 'border-amber-400/30'
      }`}
    >
      <p className="text-amber-200/80 text-sm truncate">{name}</p>
      <p className="text-3xl md:text-4xl text-amber-100 mt-1">{score}</p>
      {isActive && (
        <p className="text-amber-400 text-xs mt-2 animate-pulse">Playing...</p>
      )}
    </div>
  )
}
