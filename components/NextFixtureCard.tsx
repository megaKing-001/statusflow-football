type Opponent = { id: string; name: string; abbreviation: string } | undefined

export function NextFixtureCard({
  matchday,
  isHome,
  opponent,
}: {
  matchday: number
  isHome: boolean
  opponent: Opponent
}) {
  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-surface-raised bg-surface">
      <div className="h-1 bg-gold" />
      <div className="p-4">
        <p className="mb-1 font-display text-xs uppercase tracking-widest text-mist">
          Matchday {matchday} &middot; {isHome ? 'Home' : 'Away'}
        </p>
        <p className="font-display text-2xl text-chalk">
          {isHome ? 'vs' : '@'} {opponent?.name ?? 'TBD'}
        </p>
      </div>
    </div>
  )
}
