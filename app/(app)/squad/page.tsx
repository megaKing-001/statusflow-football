import { createClient } from '@/lib/supabase/server'
import { SectionLabel } from '@/components/ui/SectionLabel'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { PlayerNameEditor } from '@/components/PlayerNameEditor'

const POSITION_ORDER = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST']

function sortByPosition<T extends { position: string; overall: number }>(players: T[]) {
  return [...players].sort((a, b) => {
    const posDiff = POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position)
    return posDiff !== 0 ? posDiff : b.overall - a.overall
  })
}

export default async function SquadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: club } = await supabase
    .from('clubs')
    .select('id, name')
    .eq('owner_id', user!.id)
    .maybeSingle()

  if (!club) {
    return (
      <main className="p-4">
        <SectionLabel>Squad</SectionLabel>
        <p className="text-mist">Create a club first.</p>
      </main>
    )
  }

  const { data: players } = await supabase
    .from('players')
    .select('id, name, position, age, overall')
    .eq('club_id', club.id)

  const { data: squadSelection } = await supabase
    .from('squad_selections')
    .select('formation, mentality, starting_player_ids, bench_player_ids')
    .eq('club_id', club.id)
    .maybeSingle()

  const allPlayers = players ?? []
  const startingIds = new Set(squadSelection?.starting_player_ids ?? [])
  const benchIds = new Set(squadSelection?.bench_player_ids ?? [])

  const starters = sortByPosition(allPlayers.filter((p) => startingIds.has(p.id)))
  const bench = sortByPosition(allPlayers.filter((p) => benchIds.has(p.id)))


  return (
    <main className="p-4">
      <SectionLabel>Squad</SectionLabel>
      <p className="mb-6 text-mist">
        {allPlayers.length} players &middot; {squadSelection?.formation ?? '—'} &middot;{' '}
        {squadSelection?.mentality ?? '—'}
      </p>

      <Link
        href="/squad/edit"
        className="mb-6 block rounded-lg bg-pitch px-4 py-2.5 text-center text-sm font-medium text-night"
      >
        Edit Lineup
      </Link>

      <p className="mb-2 font-display text-xs uppercase tracking-widest text-mist">Starting XI</p>
      <div className="mb-6 rounded-lg border border-surface-raised bg-surface px-4">
        {starters.map((p) => (
          <PlayerNameEditor
            key={p.id}
            playerId={p.id}
            name={p.name}
            position={p.position}
            age={p.age}
            overall={p.overall}
          />
        ))}
        {starters.length === 0 && <p className="py-3 text-sm text-mist">No starting lineup set.</p>}
      </div>

      <p className="mb-2 font-display text-xs uppercase tracking-widest text-mist">Bench</p>
      <div className="rounded-lg border border-surface-raised bg-surface px-4">
        {bench.map((p) => (
          <PlayerNameEditor
            key={p.id}
            playerId={p.id}
            name={p.name}
            position={p.position}
            age={p.age}
            overall={p.overall}
          />
        ))}
        {bench.length === 0 && <p className="py-3 text-sm text-mist">No bench players.</p>}
      </div>
    </main>
  )
}
