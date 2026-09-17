import { createClient } from '@/lib/supabase/server'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { PlayMatchButton } from '@/components/PlayMatchButton'

export default async function FixturesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: club } = await supabase
    .from('clubs')
    .select('id')
    .eq('owner_id', user!.id)
    .maybeSingle()

  if (!club) {
    return (
      <main className="p-4">
        <SectionLabel>Fixtures</SectionLabel>
        <p className="text-mist">Create a club first to see your fixtures.</p>
      </main>
    )
  }

  const { data: league } = await supabase
    .from('leagues')
    .select('id')
    .eq('owner_profile_id', user!.id)
    .maybeSingle()

  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('id, matchday, status, home_club_id, away_club_id')
    .eq('league_id', league!.id)
    .or(`home_club_id.eq.${club.id},away_club_id.eq.${club.id}`)
    .order('matchday', { ascending: true })

  const allFixtures = fixtures ?? []
  const clubIds = new Set<string>()
  for (const f of allFixtures) {
    clubIds.add(f.home_club_id)
    clubIds.add(f.away_club_id)
  }

  const { data: clubs } = clubIds.size
    ? await supabase.from('clubs').select('id, name').in('id', Array.from(clubIds))
    : { data: [] }
  const clubMap = new Map((clubs ?? []).map((c) => [c.id, c.name]))

  const completedIds = allFixtures.filter((f) => f.status === 'completed').map((f) => f.id)
  const { data: matches } = completedIds.length
    ? await supabase.from('matches').select('fixture_id, home_score, away_score').in('fixture_id', completedIds)
    : { data: [] }
  const matchMap = new Map((matches ?? []).map((m) => [m.fixture_id, m]))

  const upcoming = allFixtures.filter((f) => f.status === 'scheduled')
  const completed = allFixtures.filter((f) => f.status === 'completed').sort((a, b) => b.matchday - a.matchday)
  const nextFixtureId = upcoming[0]?.id

  return (
    <main className="p-4">
      <SectionLabel>Fixtures</SectionLabel>

      {upcoming.length > 0 && (
        <>
          <p className="mb-2 mt-4 font-display text-xs uppercase tracking-widest text-mist">Upcoming</p>
          <div className="space-y-2">
            {upcoming.map((f) => {
              const isHome = f.home_club_id === club.id
              const opponentName = clubMap.get(isHome ? f.away_club_id : f.home_club_id) ?? 'Unknown'
              return (
                <div key={f.id} className="rounded-lg border border-surface-raised bg-surface p-4">
                  <p className="mb-1 text-xs text-mist">Matchday {f.matchday} &middot; {isHome ? 'Home' : 'Away'}</p>
                  <p className="mb-3 font-display text-xl text-chalk">
                    {isHome ? 'vs' : '@'} {opponentName}
                  </p>
                  {f.id === nextFixtureId && <PlayMatchButton fixtureId={f.id} />}
                </div>
              )
            })}
          </div>
        </>
      )}

      {completed.length > 0 && (
        <>
          <p className="mb-2 mt-6 font-display text-xs uppercase tracking-widest text-mist">Completed</p>
          <div className="space-y-2">
            {completed.map((f) => {
              const isHome = f.home_club_id === club.id
              const opponentName = clubMap.get(isHome ? f.away_club_id : f.home_club_id) ?? 'Unknown'
              const match = matchMap.get(f.id)
              if (!match) return null
              const myScore = isHome ? match.home_score : match.away_score
              const oppScore = isHome ? match.away_score : match.home_score
              const tone = myScore > oppScore ? 'pitch' : myScore === oppScore ? 'mist' : 'alert'
              const label = myScore > oppScore ? 'W' : myScore === oppScore ? 'D' : 'L'
              return (
                <Link key={f.id} href={`/match/${f.id}`} className="flex items-center justify-between rounded-lg border border-surface-raised bg-surface px-4 py-3">
                  <div>
                    <p className="text-sm text-chalk">{isHome ? 'vs' : '@'} {opponentName}</p>
                    <p className="text-xs text-mist">Matchday {f.matchday}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-lg text-chalk">{myScore}–{oppScore}</span>
                    <Badge tone={tone}>{label}</Badge>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}

      {upcoming.length === 0 && completed.length === 0 && (
        <p className="mt-4 text-mist">No fixtures found.</p>
      )}
    </main>
  )
}
