import { createClient } from '@/lib/supabase/server'
import { MatchViewer3D } from '@/components/MatchViewer3D'
import Link from 'next/link'

type MatchEvent = {
  minute: number
  type: 'goal' | 'chance' | 'yellow_card' | 'half_time' | 'full_time'
  team?: 'home' | 'away'
  outcome?: 'saved' | 'missed'
}

export default async function WatchMatchPage({ params }: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: fixture } = await supabase
    .from('fixtures')
    .select('id, home_club_id, away_club_id, status, leagues!inner(owner_profile_id)')
    .eq('id', fixtureId)
    .single()

  const league = fixture?.leagues as unknown as { owner_profile_id: string | null } | undefined
  if (!fixture || league?.owner_profile_id !== user!.id) {
    return (
      <main className="p-4">
        <p className="text-mist">Match not found.</p>
      </main>
    )
  }

  if (fixture.status !== 'completed') {
    return (
      <main className="p-4">
        <p className="text-mist">This match hasn&apos;t been played yet.</p>
        <Link href="/fixtures" className="mt-4 inline-block text-sm text-pitch">
          Back to fixtures
        </Link>
      </main>
    )
  }

  const { data: clubs } = await supabase
    .from('clubs')
    .select('id, name')
    .in('id', [fixture.home_club_id, fixture.away_club_id])
  const clubMap = new Map((clubs ?? []).map((c) => [c.id, c.name]))
  const homeName = clubMap.get(fixture.home_club_id) ?? 'Home'
  const awayName = clubMap.get(fixture.away_club_id) ?? 'Away'

  const { data: match } = await supabase
    .from('matches')
    .select('home_score, away_score, events')
    .eq('fixture_id', fixtureId)
    .single()

  if (!match) {
    return (
      <main className="p-4">
        <p className="text-mist">Match data not found.</p>
      </main>
    )
  }

  const events = (match.events ?? []) as MatchEvent[]

  return (
    <MatchViewer3D
      fixtureId={fixtureId}
      homeName={homeName}
      awayName={awayName}
      homeScore={match.home_score}
      awayScore={match.away_score}
      events={events}
    />
  )
}
