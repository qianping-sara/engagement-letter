'use client'

import Image from 'next/image'
import Link from 'next/link'

interface AppHeaderProps {
  right?: React.ReactNode
}

export function AppHeader({ right }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
      <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-[6px] overflow-hidden flex items-center justify-center bg-primary">
            <Image
              src="/ascentium-icon.png"
              alt="Ascentium"
              width={24}
              height={24}
              className="w-full h-full object-cover rounded-[6px]"
            />
          </div>
          <span className="text-sm font-semibold tracking-tight">EL Manager</span>
        </div>
        <span className="text-border">|</span>
        <span className="text-xs text-muted-foreground">
          Engagement Letter Automation — 30 June 2026
        </span>
      </Link>
      <div className="flex items-center gap-2">
        {right}
      </div>
    </header>
  )
}
