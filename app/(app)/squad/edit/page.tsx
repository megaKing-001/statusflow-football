import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { TacticsEditor } from '@/components/TacticsEditor'

export default async function EditSquadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: club } = await supabase
    .from('clubs')
    .select('id')
    .eq('owner_id', user!.id)
    .maybeSingle()

  if (!club) {
    redirect('/dashboard')
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

  return (
    <main className="p-4">
      <SectionLabel>Edit Lineup</SectionLabel>
      <TacticsEditor
        clubId={club.id}
        players={players ?? []}
        initialFormation={squadSelection?.formation ?? '4-4-2'}
        initialMentality={squadSelection?.mentality ?? 'balanced'}
        initialStartingIds={squadSelection?.starting_player_ids ?? []}
      />
    </main>
  )
}
