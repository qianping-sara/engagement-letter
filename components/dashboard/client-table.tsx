'use client'

import { useState } from 'react'
import { FileEdit, Download, CheckSquare, Square } from 'lucide-react'
import type { Client } from '@/lib/types'
import { StatusBadge } from './status-badge'

interface ClientTableProps {
  clients: Client[]
  loading: boolean
  selectedIds: Set<number>
  onToggleSelect: (id: number) => void
  onSelectAll: () => void
  onClearAll: () => void
  onEditClient: (id: number) => void
  onMarkSent: (ids: number[]) => void
}

function formatFee(cents: number): string {
  if (!cents) return '—'
  return '$' + (cents / 100).toLocaleString('en-AU', { minimumFractionDigits: 0 })
}

export function ClientTable({
  clients,
  loading,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearAll,
  onEditClient,
  onMarkSent,
}: ClientTableProps) {
  const [sortField, setSortField] = useState<keyof Client>('client_code')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (field: keyof Client) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = [...clients].sort((a, b) => {
    const av = a[sortField]
    const bv = b[sortField]
    if (av == null) return 1
    if (bv == null) return -1
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
    return sortDir === 'asc' ? cmp : -cmp
  })

  const allSelected = clients.length > 0 && clients.every((c) => selectedIds.has(c.id))

  const SortIcon = ({ field }: { field: keyof Client }) => {
    if (sortField !== field) return <span className="text-muted-foreground/30 ml-1">↕</span>
    return <span className="text-primary ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const Th = ({
    field, label, className = '',
  }: { field: keyof Client; label: string; className?: string }) => (
    <th
      onClick={() => handleSort(field)}
      className={`px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none whitespace-nowrap ${className}`}
    >
      {label}
      <SortIcon field={field} />
    </th>
  )

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 bg-background z-10">
          <tr className="border-b border-border">
            <th className="px-3 py-2.5 w-8">
              <button
                onClick={allSelected ? onClearAll : onSelectAll}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {allSelected ? (
                  <CheckSquare size={14} className="text-primary" />
                ) : (
                  <Square size={14} />
                )}
              </button>
            </th>
            <Th field="client_code" label="Code" />
            <Th field="client_name" label="Client" className="min-w-[200px]" />
            <Th field="client_group" label="Group" className="min-w-[200px]" />
            <Th field="status" label="Status" />
            <Th field="excel_status" label="Excel Status" className="min-w-[140px]" />
            <Th field="total_fees" label="Total Fees" />
            <Th field="total_oxygen_fee" label="Oxygen" />
            <Th field="total_lumiere_fee" label="Lumiere" />
            <Th field="last_synced_at" label="Synced" />
            <th className="px-3 py-2.5 w-16 sticky right-0 bg-background z-20" />
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={10} className="py-16 text-center text-sm text-muted-foreground">
                Loading…
              </td>
            </tr>
          ) : sorted.length === 0 ? (
            <tr>
              <td colSpan={10} className="py-16 text-center text-sm text-muted-foreground">
                No clients found
              </td>
            </tr>
          ) : (
            sorted.map((client) => {
              const isSelected = selectedIds.has(client.id)
              return (
                <tr
                  key={client.id}
                  className={[
                    'border-b border-border transition-colors',
                    isSelected ? 'bg-primary/5' : 'hover:bg-muted/50',
                    client.status === 'updated' ? 'border-l-2 border-l-primary' : '',
                  ].join(' ')}
                >
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => onToggleSelect(client.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare size={14} className="text-primary" />
                      ) : (
                        <Square size={14} />
                      )}
                    </button>
                  </td>
              <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                {client.client_code}
              </td>
              <td className="px-3 py-2.5 max-w-[220px]">
                <div className="text-xs font-medium truncate">{client.client_name}</div>
              </td>
              <td className="px-3 py-2.5 max-w-[220px]">
                <div className="text-xs text-muted-foreground truncate">{client.client_group}</div>
              </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <StatusBadge status={client.status} size="sm" />
                  </td>
                  <td className="px-3 py-2.5 max-w-[160px] text-xs text-muted-foreground truncate" title={client.excel_status ?? ''}>
                    {client.excel_status || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap font-medium">
                    {formatFee(client.total_fees)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap text-muted-foreground">
                    {formatFee(client.total_oxygen_fee)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap text-muted-foreground">
                    {client.total_lumiere_fee ? formatFee(client.total_lumiere_fee) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {client.last_synced_at
                      ? new Date(client.last_synced_at).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                        })
                      : '—'}
                  </td>
                  <td className="px-3 py-2.5 sticky right-0 bg-background">
                    <button
                      onClick={() => onEditClient(client.id)}
                      className="p-1.5 rounded transition-colors bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                      title="Edit client"
                    >
                      <FileEdit size={13} />
                    </button>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
