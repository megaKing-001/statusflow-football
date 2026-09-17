import { ReactNode } from 'react'

type Tone = 'pitch' | 'gold' | 'mist' | 'alert'

export function Badge({ children, tone = 'mist' }: { children: ReactNode; tone?: Tone }) {
  const tones: Record<Tone, string> = {
    pitch: 'bg-pitch/15 text-pitch',
    gold: 'bg-gold/15 text-gold',
    mist: 'bg-mist/15 text-mist',
    alert: 'bg-alert/15 text-alert',
  }
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold font-display tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
