'use client'

import type { Client } from '@/lib/types'

interface StatusBadgeProps {
  status: Client['status']
  size?: 'sm' | 'default'
}

const STATUS_STYLES: Record<Client['status'], string> = {
  pending: 'bg-muted text-muted-foreground',
  updated: 'bg-primary/10 text-primary border border-primary/20',
  edited: 'bg-secondary text-secondary-foreground border border-border',
  generated: 'bg-foreground text-background',
  sent: 'bg-muted text-muted-foreground',
  no_sa: 'bg-muted text-muted-foreground/60',
}

const STATUS_LABELS: Record<Client['status'], string> = {
  pending: 'Pending',
  updated: 'Updated',
  edited: 'Edited',
  generated: 'Generated',
  sent: 'Sent',
  no_sa: 'No SA',
}

export function StatusBadge({ status, size = 'default' }: StatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded font-medium uppercase tracking-wide',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1',
        STATUS_STYLES[status] || STATUS_STYLES.pending,
      ].join(' ')}
    >
      {STATUS_LABELS[status] || status}
    </span>
  )
}
