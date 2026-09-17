import { ReactNode } from 'react'

export function StatRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-surface-raised py-2.5 last:border-0">
      <span className="text-sm text-mist">{label}</span>
      <span className="font-display text-base font-semibold text-chalk">{value}</span>
    </div>
  )
}
