'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

const items: { href: string; label: string; icon: ReactNode }[] = [
  { href: '/dashboard', label: 'Home', icon: <path d="M3 11.5 12 4l9 7.5M5 10v9h14v-9" /> },
  { href: '/squad', label: 'Squad', icon: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" /> },
  { href: '/fixtures', label: 'Fixtures', icon: <path d="M4 5h16v15H4V5ZM4 9h16M8 3v4M16 3v4" /> },
  { href: '/club', label: 'Club', icon: <path d="m12 3 8 3v6c0 4.5-3.3 7.9-8 9-4.7-1.1-8-4.5-8-9V6l8-3Z" /> },
  { href: '/more', label: 'More', icon: <path d="M5 12h.01M12 12h.01M19 12h.01" /> },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-surface-raised bg-surface">
      {items.map((item) => {
        const active = pathname?.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs ${active ? 'text-pitch' : 'text-mist'}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              {item.icon}
            </svg>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
