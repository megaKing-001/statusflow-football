'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

type PlayMatchInput = {
  fixtureId: string
  idempotencyKey: string
}

export async function playMatch(input: PlayMatchInput) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not signed in.' }
  }

  // Authorization check: this fixture's league must belong to the
  // calling user. fixtures/leagues are public-read, so this is a
  // normal select - the point isn't hiding the data, it's refusing
  // to SIMULATE a fixture that isn't this player's to play.
  const { data: fixture, error: fixtureError } = await supabase
    .from('fixtures')
    .select('id, leagues!inner(owner_profile_id)')
    .eq('id', input.fixtureId)
    .single()

  if (fixtureError || !fixture) {
    return { error: 'Fixture not found.' }
  }

  const league = fixture.leagues as unknown as { owner_profile_id: string | null }
  if (league.owner_profile_id !== user.id) {
    return { error: 'This fixture does not belong to your league.' }
  }

  const service = createServiceClient()
  const { data, error } = await service.rpc('simulate_matchday', {
    p_fixture_id: input.fixtureId,
    p_idempotency_key: input.idempotencyKey,
  })

  if (error) {
    return { error: error.message }
  }

  return { data: data[0] }
}
