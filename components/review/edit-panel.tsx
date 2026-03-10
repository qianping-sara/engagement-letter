'use client'

import { useState, useEffect } from 'react'
import { X, Lock, Unlock, Plus, Trash2, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import type { Client, ClientEntity } from '@/lib/types'
import { StatusBadge } from '@/components/dashboard/status-badge'

interface EditPanelProps {
  clientId: number | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

type EntityType = ClientEntity['entity_type']

const ENTITY_TYPES: { type: EntityType; label: string; plural: string }[] = [
  { type: 'individual', label: 'Individual', plural: 'Individual(s)' },
  { type: 'trust', label: 'Trust', plural: 'Trust(s)' },
  { type: 'company', label: 'Company', plural: 'Company(ies)' },
  { type: 'smsf', label: 'SMSF', plural: 'Self-Managed Superannuation Fund(s)' },
  { type: 'foundation', label: 'Foundation', plural: 'Foundation(s)' },
  { type: 'partnership', label: 'Partnership', plural: 'Partnership(s)' },
]

const OXYGEN_FEES: { field: keyof Client; label: string }[] = [
  { field: 'tax_and_compliance_fee', label: 'Tax & Compliance' },
  { field: 'quarterly_activity_fee', label: 'Quarterly Activity Statements' },
  { field: 'asic_fee', label: 'ASIC Administration' },
  { field: 'bookkeeping_fee', label: 'Bookkeeping & Admin' },
  { field: 'foundation_annual_comp_fee', label: 'Foundation Annual Compliance' },
  { field: 'fbt_fee', label: 'Fringe Benefit Tax' },
  { field: 'family_office_fee', label: 'Family Office Services' },
  { field: 'annual_tax_planning_fee', label: 'Annual Tax Planning' },
  { field: 'adhoc_advice_fee', label: 'Adhoc Advice' },
  { field: 'financial_reports_fee', label: 'Financial Reports & Minutes' },
]

const LUMIERE_FEES: { field: keyof Client; label: string }[] = [
  { field: 'smsf_tax_compliance_fee', label: 'SMSF Tax & Compliance' },
  { field: 'smsf_bas_fee', label: 'SMSF Quarterly Activity' },
  { field: 'smsf_asic_fee', label: 'SMSF ASIC Administration' },
]

function centsToInput(cents: number): string {
  if (!cents) return ''
  return String(Math.round(cents / 100))
}

function inputToCents(val: string): number {
  const n = parseFloat(val.replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : Math.round(n * 100)
}

function formatDisplay(cents: number): string {
  if (!cents) return '—'
  return '$' + (cents / 100).toLocaleString('en-AU', { minimumFractionDigits: 0 })
}

export function EditPanel({ clientId, open, onClose, onSaved }: EditPanelProps) {
  const [client, setClient] = useState<Client | null>(null)
  const [entities, setEntities] = useState<ClientEntity[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lockedFields, setLockedFields] = useState<Set<string>>(new Set())
  const [showLumiere, setShowLumiere] = useState(false)
  const [expandedEntityTypes, setExpandedEntityTypes] = useState<Set<string>>(new Set())

  // Form state
  const [form, setForm] = useState<Partial<Client>>({})
  const [entityList, setEntityList] = useState<ClientEntity[]>([])

  useEffect(() => {
    if (open && clientId) {
      fetchClient(clientId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clientId])

  const fetchClient = async (id: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${id}`)
      const data = await res.json()
      setClient(data.client)
      setEntities(data.entities)
      setEntityList(data.entities)
      setLockedFields(new Set(data.client.locked_fields || []))
      setForm(data.client)

      const hasLumiere =
        (data.client.smsf_tax_compliance_fee ?? 0) > 0 ||
        (data.client.smsf_asic_fee ?? 0) > 0 ||
        (data.client.smsf_bas_fee ?? 0) > 0
      setShowLumiere(hasLumiere)

      // Expand entity types that have entries
      const typesWithData = new Set(data.entities.map((e: ClientEntity) => e.entity_type))
      setExpandedEntityTypes(typesWithData as Set<string>)
    } finally {
      setLoading(false)
    }
  }

  const setField = (field: keyof Client, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const toggleLock = (field: string) => {
    setLockedFields((prev) => {
      const next = new Set(prev)
      if (next.has(field)) next.delete(field)
      else next.add(field)
      return next
    })
  }

  const toggleEntityType = (type: string) => {
    setExpandedEntityTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const addEntity = (type: EntityType) => {
    const newEntity: ClientEntity = {
      id: -(Date.now()),
      client_id: clientId!,
      entity_type: type,
      entity_name: '',
      is_locked: false,
      created_at: new Date().toISOString(),
    }
    setEntityList((prev) => [...prev, newEntity])
  }

  const updateEntityName = (id: number, name: string) => {
    setEntityList((prev) =>
      prev.map((e) => (e.id === id ? { ...e, entity_name: name } : e))
    )
  }

  const removeEntity = (id: number) => {
    setEntityList((prev) => prev.filter((e) => e.id !== id))
  }

  // Computed totals
  const oxygenSub = OXYGEN_FEES.reduce((sum, { field }) => {
    const val = form[field] as number ?? 0
    return sum + val
  }, 0)
  const oxygenGst = Math.round(oxygenSub * 0.1)
  const oxygenTotal = oxygenSub + oxygenGst

  const lumiereSub = LUMIERE_FEES.reduce((sum, { field }) => {
    const val = form[field] as number ?? 0
    return sum + val
  }, 0)
  const lumiereGst = Math.round(lumiereSub * 0.1)
  const lumiereTotal = lumiereSub + lumiereGst

  const grandTotal = oxygenTotal + lumiereTotal

  const handleSave = async () => {
    if (!clientId) return
    setSaving(true)
    try {
      const payload = {
        salutation: form.salutation,
        client_email: form.client_email,
        contact_name: form.contact_name,
        letter_date: form.letter_date,
        tax_and_compliance_fee: form.tax_and_compliance_fee,
        asic_fee: form.asic_fee,
        quarterly_activity_fee: form.quarterly_activity_fee,
        bookkeeping_fee: form.bookkeeping_fee,
        foundation_annual_comp_fee: form.foundation_annual_comp_fee,
        fbt_fee: form.fbt_fee,
        family_office_fee: form.family_office_fee,
        annual_tax_planning_fee: form.annual_tax_planning_fee,
        adhoc_advice_fee: form.adhoc_advice_fee,
        financial_reports_fee: form.financial_reports_fee,
        smsf_tax_compliance_fee: form.smsf_tax_compliance_fee,
        smsf_asic_fee: form.smsf_asic_fee,
        smsf_bas_fee: form.smsf_bas_fee,
        comments: form.comments,
        locked_fields: Array.from(lockedFields),
        entities: entityList,
        status: 'edited',
      }

      await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Side panel */}
      <div className="relative z-10 ml-auto bg-background border-l border-border w-full max-w-[560px] flex flex-col h-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            {client && (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{client.client_code}</span>
                  <StatusBadge status={client.status} size="sm" />
                </div>
                <h2 className="text-sm font-semibold mt-0.5 text-balance">{client.client_group}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{client.client_name}</p>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw size={16} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* General Info */}
            <section className="px-5 py-4 border-b border-border">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                General Information
              </h3>
              <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                <FormField label="Letter Date">
                  <input
                    type="date"
                    value={form.letter_date ? String(form.letter_date).slice(0, 10) : ''}
                    onChange={(e) => setField('letter_date', e.target.value)}
                    className="field-input"
                  />
                </FormField>
                <FormField label="Salutation" field="salutation" locked={lockedFields.has('salutation')} onToggleLock={() => toggleLock('salutation')}>
                  <input
                    type="text"
                    value={String(form.salutation || '')}
                    onChange={(e) => setField('salutation', e.target.value)}
                    placeholder="e.g. Brian"
                    className="field-input"
                  />
                </FormField>
                <FormField label="Contact Name">
                  <input
                    type="text"
                    value={String(form.contact_name || '')}
                    onChange={(e) => setField('contact_name', e.target.value)}
                    placeholder="e.g. Mr John Smith"
                    className="field-input"
                  />
                </FormField>
                <FormField label="Email" field="client_email" locked={lockedFields.has('client_email')} onToggleLock={() => toggleLock('client_email')}>
                  <input
                    type="email"
                    value={String(form.client_email || '')}
                    onChange={(e) => setField('client_email', e.target.value)}
                    className="field-input"
                  />
                </FormField>
              </div>
            </section>

            {/* Entities */}
            <section className="px-5 py-4 border-b border-border">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Schedule of Entities
              </h3>
              <div className="space-y-2">
                {ENTITY_TYPES.map(({ type, plural }) => {
                  const typeEntities = entityList.filter((e) => e.entity_type === type)
                  const isExpanded = expandedEntityTypes.has(type)
                  return (
                    <div key={type} className="border border-border rounded overflow-hidden">
                      <button
                        onClick={() => toggleEntityType(type)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown size={12} className="text-muted-foreground" />
                          ) : (
                            <ChevronRight size={12} className="text-muted-foreground" />
                          )}
                          <span className="font-medium">{plural}</span>
                          {typeEntities.length > 0 && (
                            <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-muted-foreground">
                              {typeEntities.length}
                            </span>
                          )}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-border bg-muted/30 p-2 space-y-1.5">
                          {typeEntities.map((entity) => (
                            <div key={entity.id} className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={entity.entity_name}
                                onChange={(e) => updateEntityName(entity.id, e.target.value)}
                                placeholder="Entity name…"
                                className="field-input flex-1 text-xs"
                              />
                              <button
                                onClick={() => removeEntity(entity.id)}
                                className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => addEntity(type)}
                            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors py-0.5"
                          >
                            <Plus size={11} />
                            Add entity
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Oxygen Fees */}
            <section className="px-5 py-4 border-b border-border">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Oxygen Private Clients — Fees
              </h3>
              <div className="space-y-1">
                {OXYGEN_FEES.map(({ field, label }) => (
                  <FeeRow
                    key={field}
                    label={label}
                    field={String(field)}
                    value={form[field] as number ?? 0}
                    locked={lockedFields.has(String(field))}
                    onToggleLock={() => toggleLock(String(field))}
                    onChange={(cents) => setField(field, cents)}
                    originalValue={client?.[field] as number}
                  />
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-border space-y-1 font-mono text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatDisplay(oxygenSub)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GST (10%)</span>
                  <span>{formatDisplay(oxygenGst)}</span>
                </div>
                <div className="flex justify-between font-semibold text-foreground text-sm">
                  <span>Total Oxygen Fee (incl. GST)</span>
                  <span>{formatDisplay(oxygenTotal)}</span>
                </div>
              </div>
            </section>

            {/* Lumiere toggle */}
            <section className="px-5 py-4 border-b border-border">
              <button
                onClick={() => setShowLumiere(!showLumiere)}
                className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>Lumiere Private Advisory — Fees</span>
                {showLumiere ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>

              {showLumiere && (
                <div className="mt-3 space-y-1">
                  {LUMIERE_FEES.map(({ field, label }) => (
                    <FeeRow
                      key={field}
                      label={label}
                      field={String(field)}
                      value={form[field] as number ?? 0}
                      locked={lockedFields.has(String(field))}
                      onToggleLock={() => toggleLock(String(field))}
                      onChange={(cents) => setField(field, cents)}
                      originalValue={client?.[field] as number}
                    />
                  ))}
                  <div className="mt-3 pt-3 border-t border-border space-y-1 font-mono text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatDisplay(lumiereSub)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>GST (10%)</span>
                      <span>{formatDisplay(lumiereGst)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-foreground text-sm">
                      <span>Total Lumiere Fee (incl. GST)</span>
                      <span>{formatDisplay(lumiereTotal)}</span>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Grand total */}
            <section className="px-5 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Total Fees (incl. GST)</span>
                <span className="text-lg font-mono font-bold text-primary">
                  {formatDisplay(grandTotal)}
                </span>
              </div>
            </section>

            {/* Comments */}
            <section className="px-5 py-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Comments
              </h3>
              <textarea
                value={String(form.comments || '')}
                onChange={(e) => setField('comments', e.target.value)}
                rows={3}
                className="field-input w-full resize-none text-xs"
                placeholder="Internal notes…"
              />
            </section>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border shrink-0">
          <div className="text-xs text-muted-foreground">
            {lockedFields.size > 0 && (
              <span className="flex items-center gap-1">
                <Lock size={11} />
                {lockedFields.size} field{lockedFields.size > 1 ? 's' : ''} locked
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 text-xs border border-border rounded hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs bg-foreground text-background rounded hover:opacity-90 transition-opacity font-medium disabled:opacity-40"
            >
              {saving ? <RefreshCw size={11} className="animate-spin" /> : null}
              {saving ? 'Saving…' : 'Save & Mark Edited'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Sub-components

function FormField({
  label, field, locked, onToggleLock, children,
}: {
  label: string
  field?: string
  locked?: boolean
  onToggleLock?: () => void
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">{label}</label>
        {field && onToggleLock && (
          <button
            onClick={onToggleLock}
            className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            title={locked ? 'Unlock field' : 'Lock field'}
          >
            {locked ? <Lock size={10} /> : <Unlock size={10} />}
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function FeeRow({
  label, field, value, locked, onToggleLock, onChange, originalValue,
}: {
  label: string
  field: string
  value: number
  locked: boolean
  onToggleLock: () => void
  onChange: (cents: number) => void
  originalValue?: number
}) {
  const [inputVal, setInputVal] = useState(centsToInput(value))

  // Sync inputVal when value changes from parent
  useEffect(() => {
    setInputVal(centsToInput(value))
  }, [value])

  const isDirty = originalValue !== undefined && value !== originalValue

  return (
    <div className="flex items-center gap-2 group">
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground truncate">{label}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isDirty && (
          <span className="text-[10px] text-primary font-mono bg-primary/10 px-1 rounded">
            edited
          </span>
        )}
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">$</span>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value)
              onChange(inputToCents(e.target.value))
            }}
            disabled={locked}
            className={[
              'w-24 pl-5 pr-2 py-1 text-xs text-right font-mono border border-border rounded focus:outline-none focus:border-ring',
              locked ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-background',
            ].join(' ')}
          />
        </div>
        <button
          onClick={onToggleLock}
          className="p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          title={locked ? 'Unlock' : 'Lock'}
        >
          {locked ? <Lock size={11} className="text-primary" /> : <Unlock size={11} />}
        </button>
      </div>
    </div>
  )
}
