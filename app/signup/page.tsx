'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })

    if (error) {
      setError(error.message)
      return
    }

    if (data.session) {
      router.push('/dashboard')
    } else {
      setMessage('Account created - check your email to confirm before logging in.')
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Create your manager account</h1>
        <input
          type="text" placeholder="Display name" required
          value={displayName} onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        <input
          type="email" placeholder="Email" required
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        <input
          type="password" placeholder="Password" required minLength={6}
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}
        <button type="submit" className="w-full rounded bg-black py-2 text-white">
          Sign up
        </button>
        <p className="text-sm">
          Already have an account? <a href="/login" className="underline">Log in</a>
        </p>
      </form>
    </main>
  )
}
