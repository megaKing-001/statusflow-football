'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { renamePlayer } from '@/lib/actions/player'
import { Badge } from '@/components/ui/Badge'

export function PlayerNameEditor({
  playerId,
  name,
  position,
  age,
  overall,
}: {
  playerId: string
  name: string
  position: string
  age: number
  overall: number
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSave() {
    setError(null)
    const trimmed = value.trim()
    if (!trimmed) {
      setError('Name cannot be empty.')
      return
    }
    setSaving(true)
    const result = await renamePlayer({ playerId, name: trimmed })
    setSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }
    setEditing(false)
    router.refresh()
  }

  if (editing) {
    return (
      <div className="border-b border-surface-raised py-2.5 last:border-0">
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={40}
            className="flex-1 rounded border border-surface-raised bg-night px-2 py-1 text-sm text-chalk"
          />
          <button onClick={handleSave} disabled={saving} className="text-xs font-semibold text-pitch">
            {saving ? '...' : 'Save'}
          </button>
          <button onClick={() => { setEditing(false); setValue(name); setError(null) }} className="text-xs text-mist">
            Cancel
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-alert">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between border-b border-surface-raised py-2.5 last:border-0">
      <div className="flex items-center gap-3">
        <Badge tone="mist">{position}</Badge>
        <button onClick={() => setEditing(true)} className="text-left">
          <p className="text-sm text-chalk underline decoration-mist decoration-dotted underline-offset-2">
            {name}
          </p>
          <p className="text-xs text-mist">Age {age}</p>
        </button>
      </div>
      <span className="font-display text-xl text-chalk">{overall}</span>
    </div>
  )
}
