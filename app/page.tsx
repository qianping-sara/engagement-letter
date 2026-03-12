'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Search, Upload, RefreshCw, CheckSquare, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { AppHeader } from '@/components/layout/app-header'
import { StatsBar } from '@/components/dashboard/stats-bar'
import { ClientTable } from '@/components/dashboard/client-table'
import { SyncDialog } from '@/components/upload/sync-dialog'
import { EditPanel } from '@/components/review/edit-panel'
import type { Client, DashboardStats } from '@/lib/types'

const EMPTY_STATS: DashboardStats = {
  total: 0, pending: 0, updated: 0, edited: 0, generated: 0, sent: 0, no_sa: 0,
}

const PAGE_SIZE = 50

export default function DashboardPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [syncOpen, setSyncOpen] = useState(false)
  const [editClientId, setEditClientId] = useState<number | null>(null)
  const [lastSync, setLastSync] = useState<{
    synced_at: string; filename: string; rows_added: number; rows_updated: number
  } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState<string | null>(null)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      })
      const res = await fetch(`/api/clients?${params}`)
      const data = await res.json()
      setClients(data.clients || [])
      setStats(data.stats || EMPTY_STATS)
      setTotal(data.total || 0)
      if (data.lastSync) setLastSync(data.lastSync)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, debouncedSearch])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // Reset page when filter changes
  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
  }, [statusFilter, debouncedSearch])

  const handleFilter = (status: string) => {
    setStatusFilter(status)
    setSelectedIds(new Set())
  }

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    setSelectedIds(new Set(clients.map((c) => c.id)))
  }

  const handleClearAll = () => setSelectedIds(new Set())

  const handleGenerate = async () => {
    if (selectedIds.size === 0) return
    setGenerating(true)
    setGenerateResult(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_ids: Array.from(selectedIds) }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        setGenerateResult(err?.error ? `Error: ${err.error}` : 'Generate failed')
        return
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition')
      const match = disposition?.match(/filename="?([^";]+)"?/)
      const filename = match?.[1] ?? (selectedIds.size === 1 ? 'EL.docx' : 'ELs-2026.zip')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      setGenerateResult(`${selectedIds.size} EL${selectedIds.size > 1 ? 's' : ''} generated and downloaded`)
      fetchClients()
      setSelectedIds(new Set())
    } catch (e) {
      setGenerateResult(`Error: ${e instanceof Error ? e.message : 'Generate failed'}`)
    } finally {
      setGenerating(false)
    }
  }

  const handleMarkSent = async (ids: number[]) => {
    for (const id of ids) {
      await fetch(`/api/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      })
    }
    fetchClients()
    setSelectedIds(new Set())
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const selectedClients = clients.filter((c) => selectedIds.has(c.id))
  const hasSentOrNoSaSelected = selectedClients.some(
    (c) => c.status === 'sent' || c.status === 'no_sa'
  )

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <AppHeader
        right={
          <>
            {lastSync && (
              <span className="text-xs text-muted-foreground hidden md:inline">
                Last sync:{' '}
                {new Date(lastSync.synced_at).toLocaleDateString('en-AU', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}{' '}
                · +{lastSync.rows_added} new · {lastSync.rows_updated} updated
              </span>
            )}
            <button
              onClick={() => fetchClients()}
              className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setSyncOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity font-medium"
            >
              <Upload size={12} />
              Sync Excel
            </button>
            <Link
              href="/zen"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-foreground text-background rounded hover:opacity-90 transition-opacity font-medium"
            >
              Zen Mode
            </Link>
          </>
        }
      />

      {/* Stats / filter bar */}
      <div className="flex justify-center border-b border-border bg-background/80">
        <div className="w-[90%]">
          <StatsBar stats={stats} activeFilter={statusFilter} onFilter={handleFilter} />
        </div>
      </div>

      {/* Search + batch actions */}
      <div className="flex items-center justify-center py-2.5 border-b border-border shrink-0 bg-muted/30">
        <div className="flex items-center gap-3 w-[90%]">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, group, name, email…"
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded focus:outline-none focus:border-ring"
          />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <span className="text-xs text-muted-foreground font-mono">
            {total.toLocaleString()} client{total !== 1 ? 's' : ''}
          </span>

          {/* Batch actions */}
          {selectedIds.size > 0 && !hasSentOrNoSaSelected && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-muted-foreground">
                {selectedIds.size} selected
              </span>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-foreground text-background rounded hover:opacity-90 transition-opacity font-medium disabled:opacity-40"
              >
                {generating ? (
                  <RefreshCw size={11} className="animate-spin" />
                ) : (
                  <CheckSquare size={11} />
                )}
                {generating ? 'Generating…' : `Generate ${selectedIds.size} EL${selectedIds.size > 1 ? 's' : ''}`}
              </button>
              <button
                onClick={() => handleMarkSent(Array.from(selectedIds))}
                className="px-3 py-1.5 text-xs border border-border rounded hover:bg-muted transition-colors"
              >
                Mark Sent
              </button>
              <button
                onClick={handleClearAll}
                className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Generate result toast */}
          {generateResult && (
            <div className="flex items-center gap-2 ml-auto bg-foreground text-background text-xs px-3 py-1.5 rounded">
              <CheckSquare size={11} className="text-primary" />
              {generateResult}
              <button onClick={() => setGenerateResult(null)}>
                <X size={11} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 flex justify-center overflow-hidden">
        <div className="w-[90%] flex flex-col">
          <ClientTable
            clients={clients}
            loading={loading}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onClearAll={handleClearAll}
            onEditClient={(id) => setEditClientId(id)}
            onMarkSent={handleMarkSent}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-2.5 border-t border-border shrink-0 bg-muted/20">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {total} total
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 hover:bg-muted rounded transition-colors disabled:opacity-30"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 hover:bg-muted rounded transition-colors disabled:opacity-30"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
          </div>
      </div>

      {/* Dialogs */}
      <SyncDialog
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        onSuccess={() => {
          setSyncOpen(false)
          setTimeout(fetchClients, 300)
        }}
      />

      <EditPanel
        clientId={editClientId}
        open={editClientId !== null}
        onClose={() => setEditClientId(null)}
        onSaved={() => {
          fetchClients()
          setEditClientId(null)
        }}
      />
    </div>
  )
}
