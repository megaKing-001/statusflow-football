'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

type OnboardInput = {
  clubName: string
  abbreviation: string
  stadiumName: string
  idempotencyKey: string
}

export async function onboardManager(input: OnboardInput) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not signed in.' }
  }

  const service = createServiceClient()
  const { data, error } = await service.rpc('onboard_new_manager', {
    p_owner_id: user.id,
    p_club_name: input.clubName,
    p_abbreviation: input.abbreviation,
    p_stadium_name: input.stadiumName,
    p_idempotency_key: input.idempotencyKey,
  })

  if (error) {
    return { error: error.message }
  }

  return { data: data[0] }
}
