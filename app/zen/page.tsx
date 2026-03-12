'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Upload, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react'
import { AppHeader } from '@/components/layout/app-header'

export default function ZenPage() {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) {
      setFile(dropped)
      setError(null)
      setSuccess(null)
    }
  }, [])

  const handleRun = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const syncRes = await fetch('/api/sync', { method: 'POST', body: formData })
      const syncData = await syncRes.json()
      if (!syncRes.ok) {
        throw new Error(syncData.error || 'Sync failed')
      }
      const clientIds: number[] = syncData.client_ids ?? []
      if (clientIds.length === 0) {
        setSuccess('File synced. No clients to generate ELs for.')
        return
      }
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_ids: clientIds }),
      })
      if (!genRes.ok) {
        const errData = await genRes.json().catch(() => ({}))
        throw new Error(errData.error || 'Generate failed')
      }
      const blob = await genRes.blob()
      const disposition = genRes.headers.get('Content-Disposition')
      const match = disposition?.match(/filename="?([^";]+)"?/)
      const filename = match?.[1] ?? (clientIds.length === 1 ? 'EL.docx' : 'ELs-2026.zip')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      setSuccess(`${clientIds.length} EL${clientIds.length > 1 ? 's' : ''} generated and downloaded`)
      setFile(null)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <AppHeader
        right={
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to dashboard
          </Link>
        }
      />

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg border border-border rounded-lg bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h1 className="text-sm font-semibold tracking-tight">Zen Mode</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload Master Control Sheet (.xlsx / .xls / .csv) — sync and generate ELs for all entries, then download ZIP.
            </p>
          </div>

          <div className="p-5 space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={[
                'border-2 border-dashed rounded-lg cursor-pointer transition-colors p-10 text-center',
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
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) {
                    setFile(f)
                    setError(null)
                    setSuccess(null)
                  }
                }}
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
                  <Upload size={24} className="mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drop your Excel file here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground/60">.xlsx · .xls · .csv</p>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-xs text-destructive flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 text-xs text-primary flex items-start gap-2">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                <span>{success}</span>
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-border flex justify-end">
            <button
              onClick={handleRun}
              disabled={!file || loading}
              className="flex items-center gap-2 px-4 py-2 text-xs bg-foreground text-background rounded hover:opacity-90 transition-opacity font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Syncing & generating…
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Sync & Generate ELs
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
