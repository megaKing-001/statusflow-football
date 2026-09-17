'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function renamePlayer(input: { playerId: string; name: string }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not signed in.' }
  }

  const service = createServiceClient()
  const { error } = await service.rpc('rename_player', {
    p_owner_id: user.id,
    p_player_id: input.playerId,
    p_name: input.name,
  })

  if (error) {
    return { error: error.message }
  }

  return { data: true }
}
