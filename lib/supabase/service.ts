import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Privileged client: bypasses RLS entirely via the service_role key.
// NEVER import this into a Client Component. NEVER pass a client-
// supplied user id into functions called through this client - only
// ever pass the id that came back from auth.getUser() on the session
// client above.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
