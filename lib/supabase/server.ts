import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Session-scoped client: runs AS the logged-in user, respects RLS.
// Use this to check WHO is calling (auth.getUser()), never to run
// privileged writes directly.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component - safe to ignore
            // if middleware is refreshing sessions.
          }
        },
      },
    }
  )
}
