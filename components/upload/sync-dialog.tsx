'use client'

import { useState, useCallback, useRef } from 'react'
import { X, Upload, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'
import type { ConflictItem } from '@/lib/types'

interface SyncDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

interface SyncResult {
  rows_processed: number
  added: number
  updated: number
  skipped: number
  conflicts: ConflictItem[]
  added_clients?: { client_code: string; client_name: string }[]
  updated_clients?: { client_code: string; client_name: string }[]
}

export function SyncDialog({ open, onClose, onSuccess }: SyncDialogProps) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setLoading(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }, [])

  const handleSync = async (replaceAll = false) => {
    if (!file) return
    if (replaceAll && !file.name.toLowerCase().endsWith('.csv')) {
      setError('Replace-all only accepts .csv (2026 Master Control Sheet)')
      return
    }
    setLoading(true)
    setError(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const url = replaceAll ? '/api/admin/reseed-from-csv' : '/api/sync'
      const res = await fetch(url, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || (replaceAll ? 'Reseed failed' : 'Sync failed'))
      if (replaceAll) {
        setResult({ rows_processed: data.inserted, added: data.inserted, updated: 0, skipped: 0, conflicts: [] })
      } else {
        setResult(data)
      }
      onSuccess()
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="relative z-10 bg-background border border-border w-full max-w-lg mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Sync Master Data</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload Master Control Sheet (.xlsx / .csv)
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-muted rounded transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!result ? (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={[
                  'border-2 border-dashed rounded cursor-pointer transition-colors p-8 text-center',
                  dragging
                    ? 'border-primary bg-primary/5'
                    : file
                    ? 'border-border bg-muted/50'
                    : 'border-border hover:border-muted-foreground/50',
                ].join(' ')}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                />
                {file ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB — click to replace
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload size={20} className="mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drop your Excel file here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground/60">.xlsx · .xls · .csv</p>
                  </div>
                )}
              </div>

              {/* Diff notice */}
              <div className="bg-muted/50 border border-border rounded px-4 py-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Incremental sync — not a full overwrite</p>
                <p>New clients will be added. Modified unlocked fields will be updated. Locked fields will trigger a conflict warning.</p>
                <p className="mt-2 text-amber-600 dark:text-amber-400">To match CSV exactly: run <code className="px-1 bg-muted rounded">scripts/migrate-add-csv-columns.sql</code> once, then use &quot;Replace all from CSV&quot; below.</p>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded px-4 py-3 text-xs text-destructive flex items-start gap-2">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </>
          ) : (
            /* Result summary */
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary shrink-0" />
                <span className="text-sm font-medium">Sync complete</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Processed', value: result.rows_processed },
                  { label: 'Added', value: result.added },
                  { label: 'Updated', value: result.updated },
                ].map((stat) => (
                  <div key={stat.label} className="bg-muted rounded p-3 text-center">
                    <div className="text-xl font-mono font-semibold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>

              {(result.added_clients?.length || 0) > 0 && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="font-medium text-foreground">
                    New clients ({result.added_clients!.length})
                  </div>
                  <div className="max-h-24 overflow-y-auto border border-border rounded">
                    {result.added_clients!.map((c) => (
                      <div
                        key={c.client_code}
                        className="px-3 py-1 border-b border-border last:border-0 flex items-center justify-between gap-2"
                      >
                        <span className="font-mono text-[11px]">{c.client_code}</span>
                        <span className="text-[11px] truncate">{c.client_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(result.updated_clients?.length || 0) > 0 && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="font-medium text-foreground">
                    Updated clients ({result.updated_clients!.length})
                  </div>
                  <div className="max-h-24 overflow-y-auto border border-border rounded">
                    {result.updated_clients!.map((c) => (
                      <div
                        key={c.client_code}
                        className="px-3 py-1 border-b border-border last:border-0 flex items-center justify-between gap-2"
                      >
                        <span className="font-mono text-[11px]">{c.client_code}</span>
                        <span className="text-[11px] truncate">{c.client_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.conflicts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                    <AlertTriangle size={12} />
                    {result.conflicts.length} conflict{result.conflicts.length > 1 ? 's' : ''} detected — locked fields skipped
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-border rounded">
                    {result.conflicts.map((c, i) => (
                      <div
                        key={i}
                        className="px-3 py-2 text-xs border-b border-border last:border-0 flex items-center justify-between gap-4"
                      >
                        <div>
                          <span className="font-medium">{c.client_code}</span>
                          <span className="text-muted-foreground ml-2">{c.field}</span>
                        </div>
                        <div className="text-right text-muted-foreground shrink-0">
                          Excel: <span className="text-foreground font-mono">{String(c.excel_value)}</span>
                          {' → '}
                          <span className="text-foreground font-mono">{String(c.current_value)}</span>
                          <span className="ml-1 text-primary">(locked)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
          {result ? (
            <>
              <button
                onClick={reset}
                className="flex items-center gap-1.5 px-3 py-2 text-xs border border-border rounded hover:bg-muted transition-colors"
              >
                <RefreshCw size={12} />
                Sync again
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-xs bg-foreground text-background rounded hover:opacity-90 transition-opacity font-medium"
              >
                Done
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleClose}
                className="px-3 py-2 text-xs border border-border rounded hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              {file?.name?.toLowerCase().endsWith('.csv') && (
                <button
                  onClick={() => handleSync(true)}
                  disabled={!file || loading}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs border border-amber-500/50 text-amber-600 dark:text-amber-400 rounded hover:bg-amber-500/10 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Clear all clients and re-import from this CSV (run migrate-add-csv-columns.sql first)"
                >
                  Replace all from CSV
                </button>
              )}
              <button
                onClick={() => handleSync(false)}
                disabled={!file || loading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    Syncing…
                  </>
                ) : (
                  <>
                    <Upload size={12} />
                    Sync Data
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
