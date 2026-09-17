'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

const FORMATIONS = ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2']
const MENTALITIES = ['defensive', 'balanced', 'attacking'] as const
const MENTALITY_HINTS: Record<(typeof MENTALITIES)[number], string> = {
  defensive: 'Stronger defense, weaker attack.',
  balanced: 'No adjustment either way.',
  attacking: 'Stronger attack, weaker defense.',
}
const POSITION_ORDER = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST']

type Player = { id: string; name: string; position: string; age: number; overall: number }

export function TacticsEditor({
  clubId,
  players,
  initialFormation,
  initialMentality,
  initialStartingIds,
}: {
  clubId: string
  players: Player[]
  initialFormation: string
  initialMentality: string
  initialStartingIds: string[]
}) {
  const [formation, setFormation] = useState(initialFormation)
  const [mentality, setMentality] = useState<string>(initialMentality)
  const [startingIds, setStartingIds] = useState(new Set(initialStartingIds))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  const sorted = [...players].sort((a, b) => {
    const posDiff = POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position)
    return posDiff !== 0 ? posDiff : b.overall - a.overall
  })

  function toggle(id: string) {
    setSaved(false)
    setStartingIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 11) {
        next.add(id)
      }
      return next
    })
  }

  const hasGoalkeeper = players.some((p) => startingIds.has(p.id) && p.position === 'GK')

  async function handleSave() {
    setError(null)
    setSaving(true)

    const startingArray = Array.from(startingIds)
    const benchArray = players.filter((p) => !startingIds.has(p.id)).map((p) => p.id)

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('squad_selections')
      .update({
        formation,
        mentality,
        starting_player_ids: startingArray,
        bench_player_ids: benchArray,
      })
      .eq('club_id', clubId)

    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSaved(true)
    router.refresh()
  }

  return (
    <div>
      <p className="mb-2 font-display text-xs uppercase tracking-widest text-mist">Formation</p>
      <select
        value={formation}
        onChange={(e) => setFormation(e.target.value)}
        className="mb-4 w-full rounded-lg border border-surface-raised bg-surface px-3 py-2.5 text-chalk"
      >
        {FORMATIONS.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>

      <p className="mb-2 font-display text-xs uppercase tracking-widest text-mist">Mentality</p>
      <select
        value={mentality}
        onChange={(e) => setMentality(e.target.value)}
        className="mb-1 w-full rounded-lg border border-surface-raised bg-surface px-3 py-2.5 text-chalk"
      >
        {MENTALITIES.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <p className="mb-4 text-xs text-mist">{MENTALITY_HINTS[mentality as keyof typeof MENTALITY_HINTS]}</p>

      <div className="mb-2 flex items-center justify-between">
        <p className="font-display text-xs uppercase tracking-widest text-mist">
          Starting XI &middot; {startingIds.size}/11
        </p>
        {!hasGoalkeeper && startingIds.size > 0 && (
          <span className="text-xs text-alert">No goalkeeper selected</span>
        )}
      </div>

      <div className="mb-4 rounded-lg border border-surface-raised bg-surface px-4">
        {sorted.map((p) => {
          const isStarting = startingIds.has(p.id)
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className="flex w-full items-center justify-between border-b border-surface-raised py-2.5 text-left last:border-0"
            >
              <div className="flex items-center gap-3">
                <Badge tone="mist">{p.position}</Badge>
                <div>
                  <p className="text-sm text-chalk">{p.name}</p>
                  <p className="text-xs text-mist">Overall {p.overall}</p>
                </div>
              </div>
              <Badge tone={isStarting ? 'pitch' : 'mist'}>{isStarting ? 'Starting' : 'Bench'}</Badge>
            </button>
          )
        })}
      </div>

      {error && <p className="mb-3 text-sm text-alert">{error}</p>}
      {saved && <p className="mb-3 text-sm text-pitch">Lineup saved.</p>}

      <Button onClick={handleSave} disabled={startingIds.size !== 11 || saving} className="w-full">
        {saving ? 'Saving...' : startingIds.size !== 11 ? `Select ${11 - startingIds.size} more` : 'Save Lineup'}
      </Button>
    </div>
  )
}
