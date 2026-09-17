import { ReactNode } from 'react'

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 font-display text-xs font-bold uppercase tracking-widest text-mist">
      {children}
    </p>
  )
}
