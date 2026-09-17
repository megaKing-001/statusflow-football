'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { onboardManager } from '@/lib/actions/club'
import { Button } from '@/components/ui/Button'
import { SectionLabel } from '@/components/ui/SectionLabel'

export function OnboardingForm() {
  const [clubName, setClubName] = useState('')
  const [abbreviation, setAbbreviation] = useState('')
  const [stadiumName, setStadiumName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await onboardManager({
      clubName: clubName.trim(),
      abbreviation: abbreviation.trim(),
      stadiumName: stadiumName.trim(),
      idempotencyKey,
    })

    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="p-4">
      <SectionLabel>Create Your Club</SectionLabel>
      <p className="mb-6 text-sm text-mist">
        Choose a name, abbreviation, and stadium. You&apos;ll get a starter
        squad and a place in a beginner division right away.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text" placeholder="Club name" required
          value={clubName} onChange={(e) => setClubName(e.target.value)}
          className="w-full rounded-lg border border-surface-raised bg-surface px-3 py-2.5 text-chalk placeholder:text-mist"
        />
        <input
          type="text" placeholder="Abbreviation (e.g. RVA)" required maxLength={4}
          value={abbreviation} onChange={(e) => setAbbreviation(e.target.value.toUpperCase())}
          className="w-full rounded-lg border border-surface-raised bg-surface px-3 py-2.5 text-chalk placeholder:text-mist"
        />
        <input
          type="text" placeholder="Stadium name" required
          value={stadiumName} onChange={(e) => setStadiumName(e.target.value)}
          className="w-full rounded-lg border border-surface-raised bg-surface px-3 py-2.5 text-chalk placeholder:text-mist"
        />
        {error && <p className="text-sm text-alert">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating club...' : 'Create Club'}
        </Button>
      </form>
    </main>
  )
}
