'use client'

import type { DashboardStats } from '@/lib/types'

interface StatsBarProps {
  stats: DashboardStats
  activeFilter: string
  onFilter: (status: string) => void
}

const STATUS_CONFIG = [
  { key: 'all', label: 'All', color: 'text-foreground' },
  { key: 'pending', label: 'Pending', color: 'text-muted-foreground' },
  { key: 'updated', label: 'Updated', color: 'text-primary' },
  { key: 'edited', label: 'Edited', color: 'text-foreground' },
  { key: 'generated', label: 'Generated', color: 'text-foreground' },
  { key: 'sent', label: 'Sent', color: 'text-muted-foreground' },
  { key: 'no_sa', label: 'No SA', color: 'text-muted-foreground' },
]

function getCount(stats: DashboardStats, key: string): number {
  if (key === 'all') return stats.total
  return stats[key as keyof DashboardStats] as number ?? 0
}

export function StatsBar({ stats, activeFilter, onFilter }: StatsBarProps) {
  return (
    <div className="flex items-center gap-0 border-b border-border overflow-x-auto shrink-0">
      {STATUS_CONFIG.map((s, i) => {
        const count = getCount(stats, s.key)
        const isActive = activeFilter === s.key
        return (
          <button
            key={s.key}
            onClick={() => onFilter(s.key)}
            className={[
              'flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap transition-colors border-b-2 -mb-px',
              isActive
                ? 'border-primary text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground',
              i > 0 ? 'border-l border-border border-b-2' : '',
            ].join(' ')}
          >
            <span>{s.label}</span>
            <span
              className={[
                'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded text-xs font-mono font-medium',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              ].join(' ')}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
