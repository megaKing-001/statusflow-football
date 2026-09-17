import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { BottomNav } from '@/components/BottomNav'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header />
      <div className="flex-1 pb-20">{children}</div>
      <BottomNav />
    </div>
  )
}
