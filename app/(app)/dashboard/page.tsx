import { createClient } from '@/lib/supabase/server'
import { OnboardingForm } from '@/components/OnboardingForm'
import { NextFixtureCard } from '@/components/NextFixtureCard'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { StatRow } from '@/components/ui/StatRow'
import { Badge } from '@/components/ui/Badge'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: club } = await supabase
    .from('clubs')
    .select('id, name, abbreviation, stadium_name')
    .eq('owner_id', user!.id)
    .maybeSingle()

  if (!club) {
    return <OnboardingForm />
  }

  const { data: league } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('owner_profile_id', user!.id)
    .maybeSingle()

  const { data: standingsRows } = await supabase
    .from('league_standings')
    .select('club_id, won, drawn, lost, goals_for, goals_against, points')
    .eq('league_id', league!.id)

  const standings = (standingsRows ?? [])
    .map((s) => ({ ...s, gd: s.goals_for - s.goals_against }))
    .sort((a, b) => b.points - a.points || b.gd - a.gd || b.goals_for - a.goals_for)

  const position = standings.findIndex((s) => s.club_id === club.id) + 1
  const myStanding = standings.find((s) => s.club_id === club.id)

  const { data: squadSelection } = await supabase
    .from('squad_selections')
    .select('formation')
    .eq('club_id', club.id)
    .maybeSingle()

  const { count: playerCount } = await supabase
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', club.id)

  const { data: nextFixture } = await supabase
    .from('fixtures')
    .select('id, matchday, home_club_id, away_club_id')
    .eq('league_id', league!.id)
    .eq('status', 'scheduled')
    .order('matchday', { ascending: true })
    .limit(1)
    .maybeSingle()

  const { data: recentFixtures } = await supabase
    .from('fixtures')
    .select('id, matchday, home_club_id, away_club_id')
    .eq('league_id', league!.id)
    .eq('status', 'completed')
    .order('matchday', { ascending: false })
    .limit(3)

  const clubIds = new Set<string>()
  if (nextFixture) {
    clubIds.add(nextFixture.home_club_id)
    clubIds.add(nextFixture.away_club_id)
  }
  for (const f of recentFixtures ?? []) {
    clubIds.add(f.home_club_id)
    clubIds.add(f.away_club_id)
  }

  const relatedClubs = clubIds.size
    ? (await supabase.from('clubs').select('id, name, abbreviation').in('id', Array.from(clubIds))).data ?? []
    : []
  const clubMap = new Map(relatedClubs.map((c) => [c.id, c]))

  const fixtureIds = (recentFixtures ?? []).map((f) => f.id)
  const recentMatches = fixtureIds.length
    ? (await supabase.from('matches').select('fixture_id, home_score, away_score').in('fixture_id', fixtureIds)).data ?? []
    : []
  const matchMap = new Map(recentMatches.map((m) => [m.fixture_id, m]))

  return (
    <main className="p-4">
      <SectionLabel>Club</SectionLabel>
      <p className="font-display text-3xl leading-none text-chalk">{club.name}</p>
      <p className="mb-6 text-mist">
        {club.abbreviation} &middot; {club.stadium_name}
      </p>

      {nextFixture && (
        <NextFixtureCard
          matchday={nextFixture.matchday}
          isHome={nextFixture.home_club_id === club.id}
          opponent={clubMap.get(
            nextFixture.home_club_id === club.id ? nextFixture.away_club_id : nextFixture.home_club_id
          )}
        />
      )}

      <SectionLabel>{league?.name ?? 'League'}</SectionLabel>
      <div className="mb-6 rounded-lg border border-surface-raised bg-surface px-4">
        <StatRow label="Position" value={`${position} of ${standings.length}`} />
        {myStanding && (
          <>
            <StatRow label="Record" value={`${myStanding.won}W ${myStanding.drawn}D ${myStanding.lost}L`} />
            <StatRow label="Goal difference" value={myStanding.gd > 0 ? `+${myStanding.gd}` : myStanding.gd} />
            <StatRow label="Points" value={myStanding.points} />
          </>
        )}
      </div>

      <SectionLabel>Squad</SectionLabel>
      <div className="mb-6 rounded-lg border border-surface-raised bg-surface px-4">
        <StatRow label="Players" value={playerCount ?? 0} />
        <StatRow label="Formation" value={squadSelection?.formation ?? '—'} />
      </div>

      {recentFixtures && recentFixtures.length > 0 && (
        <>
          <SectionLabel>Recent Results</SectionLabel>
          <div className="mb-6 space-y-2">
            {recentFixtures.map((f) => {
              const match = matchMap.get(f.id)
              if (!match) return null
              const isHome = f.home_club_id === club.id
              const opponent = clubMap.get(isHome ? f.away_club_id : f.home_club_id)
              const myScore = isHome ? match.home_score : match.away_score
              const oppScore = isHome ? match.away_score : match.home_score
              const tone = myScore > oppScore ? 'pitch' : myScore === oppScore ? 'mist' : 'alert'
              const label = myScore > oppScore ? 'W' : myScore === oppScore ? 'D' : 'L'
              return (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-lg border border-surface-raised bg-surface px-4 py-3"
                >
                  <div>
                    <p className="text-sm text-chalk">
                      {isHome ? 'vs' : '@'} {opponent?.name ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-mist">Matchday {f.matchday}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-lg text-chalk">
                      {myScore}–{oppScore}
                    </span>
                    <Badge tone={tone}>{label}</Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </main>
  )
}
