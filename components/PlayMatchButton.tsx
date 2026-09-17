'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { playMatch } from '@/lib/actions/match'
import { Button } from '@/components/ui/Button'

export function PlayMatchButton({ fixtureId }: { fixtureId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const router = useRouter()

  async function handleClick() {
    setError(null)
    setLoading(true)
    const result = await playMatch({ fixtureId, idempotencyKey })
    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    router.push(`/match/${fixtureId}`)
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={loading} className="w-full">
        {loading ? 'Simulating...' : 'Simulate Match'}
      </Button>
      {error && <p className="mt-2 text-sm text-alert">{error}</p>}
    </div>
  )
}
