import { createClient } from '@/lib/supabase/server'
import { SectionLabel } from '@/components/ui/SectionLabel'

export default async function ClubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: club } = await supabase
    .from('clubs')
    .select('id, name, abbreviation, stadium_name')
    .eq('owner_id', user!.id)
    .maybeSingle()

  if (!club) {
    return (
      <main className="p-4">
        <SectionLabel>Club</SectionLabel>
        <p className="text-mist">Create a club first.</p>
      </main>
    )
  }

  const { data: league } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('owner_profile_id', user!.id)
    .maybeSingle()

  const { data: standingsRows } = await supabase
    .from('league_standings')
    .select('club_id, played, won, drawn, lost, goals_for, goals_against, points')
    .eq('league_id', league!.id)

  const clubIds = (standingsRows ?? []).map((s) => s.club_id)
  const { data: clubs } = clubIds.length
    ? await supabase.from('clubs').select('id, name, abbreviation').in('id', clubIds)
    : { data: [] }
  const clubMap = new Map((clubs ?? []).map((c) => [c.id, c]))

  const standings = (standingsRows ?? [])
    .map((s) => ({ ...s, gd: s.goals_for - s.goals_against }))
    .sort((a, b) => b.points - a.points || b.gd - a.gd || b.goals_for - a.goals_for)

  return (
    <main className="p-4">
      <SectionLabel>Club</SectionLabel>
      <p className="font-display text-3xl leading-none text-chalk">{club.name}</p>
      <p className="mb-6 text-mist">
        {club.abbreviation} &middot; {club.stadium_name}
      </p>

      <SectionLabel>{league?.name ?? 'League'} &middot; Table</SectionLabel>
      <div className="overflow-hidden rounded-lg border border-surface-raised">
        <div className="grid grid-cols-[2rem_1fr_2.5rem_3rem_3rem] gap-2 bg-surface-raised px-3 py-2 text-xs text-mist">
          <span>#</span>
          <span>Club</span>
          <span className="text-right">P</span>
          <span className="text-right">GD</span>
          <span className="text-right">Pts</span>
        </div>
        {standings.map((s, i) => {
          const c = clubMap.get(s.club_id)
          const isMe = s.club_id === club.id
          return (
            <div
              key={s.club_id}
              className={`grid grid-cols-[2rem_1fr_2.5rem_3rem_3rem] gap-2 border-t border-surface-raised px-3 py-2.5 text-sm ${
                isMe ? 'bg-pitch/10' : 'bg-surface'
              }`}
            >
              <span className="text-mist">{i + 1}</span>
              <span className={isMe ? 'font-semibold text-chalk' : 'text-chalk'}>
                {c?.name ?? 'Unknown'}
              </span>
              <span className="text-right text-mist">{s.played}</span>
              <span className="text-right text-mist">{s.gd > 0 ? `+${s.gd}` : s.gd}</span>
              <span className="text-right font-display text-base text-chalk">{s.points}</span>
            </div>
          )
        })}
      </div>
    </main>
  )
}
