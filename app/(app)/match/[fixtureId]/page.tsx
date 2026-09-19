import { createClient } from '@/lib/supabase/server'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'

type MatchEvent = {
  minute: number
  type: 'goal' | 'chance' | 'yellow_card' | 'half_time' | 'full_time'
  team?: 'home' | 'away'
  outcome?: 'saved' | 'missed'
}

type MatchStats = {
  shots: number
  shots_on_target: number
  possession: number
  yellow_cards: number
  corners: number
}

function eventLabel(e: MatchEvent, homeName: string, awayName: string) {
  const teamName = e.team === 'home' ? homeName : e.team === 'away' ? awayName : ''
  switch (e.type) {
    case 'goal':
      return `⚽ Goal — ${teamName}`
    case 'chance':
      return `${teamName} chance (${e.outcome === 'saved' ? 'saved' : 'missed'})`
    case 'yellow_card':
      return `🟨 Yellow card — ${teamName}`
    case 'half_time':
      return 'Half-time'
    case 'full_time':
      return 'Full-time'
    default:
      return e.type
  }
}

function StatCompareRow({ label, home, away }: { label: string; home: number; away: number }) {
  return (
    <div className="flex items-center justify-between border-b border-surface-raised py-2.5 last:border-0">
      <span className="w-12 text-right font-display text-base font-semibold text-chalk">{home}</span>
      <span className="text-xs uppercase tracking-widest text-mist">{label}</span>
      <span className="w-12 text-left font-display text-base font-semibold text-chalk">{away}</span>
    </div>
  )
}

export default async function MatchPage({ params }: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: fixture } = await supabase
    .from('fixtures')
    .select('id, matchday, home_club_id, away_club_id, status, leagues!inner(owner_profile_id)')
    .eq('id', fixtureId)
    .single()

  const league = fixture?.leagues as unknown as { owner_profile_id: string | null } | undefined
  if (!fixture || league?.owner_profile_id !== user!.id) {
    return (
      <main className="p-4">
        <SectionLabel>Match</SectionLabel>
        <p className="text-mist">Match not found.</p>
      </main>
    )
  }

  if (fixture.status !== 'completed') {
    return (
      <main className="p-4">
        <SectionLabel>Match</SectionLabel>
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
    .select('home_score, away_score, events, home_stats, away_stats')
    .eq('fixture_id', fixtureId)
    .single()

  if (!match) {
    return (
      <main className="p-4">
        <SectionLabel>Match</SectionLabel>
        <p className="text-mist">Match data not found.</p>
      </main>
    )
  }

  const events = (match.events ?? []) as MatchEvent[]
  const homeStats = match.home_stats as MatchStats | null
  const awayStats = match.away_stats as MatchStats | null

  const tone =
    match.home_score > match.away_score ? 'pitch' : match.home_score === match.away_score ? 'mist' : 'alert'

  return (
    <main className="p-4">
      <SectionLabel>Match</SectionLabel>
      <p className="mb-4 text-xs text-mist">Matchday {fixture.matchday}</p>

      <div className="mb-6 rounded-lg border border-surface-raised bg-surface p-4 text-center">
        <div className="flex items-center justify-between">
          <p className="flex-1 text-sm text-chalk">{homeName}</p>
          <p className="font-display text-3xl text-chalk">
            {match.home_score}–{match.away_score}
          </p>
          <p className="flex-1 text-sm text-chalk">{awayName}</p>
        </div>
        <Badge tone={tone as 'pitch' | 'mist' | 'alert'}>Full-time</Badge>
      </div>

      <p className="mb-2 font-display text-xs uppercase tracking-widest text-mist">Match Events</p>
      <div className="mb-6 rounded-lg border border-surface-raised bg-surface px-4">
        {events.length === 0 && <p className="py-3 text-sm text-mist">No events recorded.</p>}
        {events.map((e, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-surface-raised py-2.5 last:border-0"
          >
            <span className="w-10 shrink-0 text-xs text-mist">{e.minute}&apos;</span>
            <span className="text-sm text-chalk">{eventLabel(e, homeName, awayName)}</span>
          </div>
        ))}
      </div>

      {homeStats && awayStats && (
        <>
          <p className="mb-2 font-display text-xs uppercase tracking-widest text-mist">Match Stats</p>
          <div className="mb-6 rounded-lg border border-surface-raised bg-surface px-4">
            <StatCompareRow label="Possession %" home={homeStats.possession} away={awayStats.possession} />
            <StatCompareRow label="Shots" home={homeStats.shots} away={awayStats.shots} />
            <StatCompareRow
              label="Shots on Target"
              home={homeStats.shots_on_target}
              away={awayStats.shots_on_target}
            />
            <StatCompareRow label="Corners" home={homeStats.corners} away={awayStats.corners} />
            <StatCompareRow label="Yellow Cards" home={homeStats.yellow_cards} away={awayStats.yellow_cards} />
          </div>
        </>
      )}

      <Link
        href={`/match/${fixtureId}/watch`}
        className="mb-3 block rounded-lg border border-pitch px-4 py-2.5 text-center text-sm font-medium text-pitch"
      >
        Watch (test)
      </Link>

      <Link
        href="/fixtures"
        className="block rounded-lg bg-pitch px-4 py-2.5 text-center text-sm font-medium text-night"
      >
        Back to Fixtures
      </Link>
    </main>
  )
}
