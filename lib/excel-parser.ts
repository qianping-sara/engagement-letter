import * as XLSX from 'xlsx'
import type { ExcelRow } from './types'

// Column header aliases from the Master Control Sheet
const COLUMN_MAP: Record<string, keyof ExcelRow> = {
  'client code': 'client_code',
  'client_code': 'client_code',
  'client name': 'client_name',
  'client_name': 'client_name',
  'client group': 'client_group',
  'client_group': 'client_group',
  'status': 'status',
  'date sent': 'date_sent',
  'signed sa received?': 'signed_sa_received',
  'paper': 'paper_copy',
  'tax and compliance': 'tax_and_compliance_fee',
  'taxation and compliance services': 'tax_and_compliance_fee',
  'tax_and_compliance_fee': 'tax_and_compliance_fee',
  'asic 2026': 'asic_fee',
  'asic administration and registered agent services': 'asic_fee',
  'asic_fee': 'asic_fee',
  'quarterly activity': 'quarterly_activity_fee',
  'quarterly activity statement services': 'quarterly_activity_fee',
  'quarterly_activity_fee': 'quarterly_activity_fee',
  'bookkeeping/administrative': 'bookkeeping_fee',
  'bookkeeping and administrative services': 'bookkeeping_fee',
  'bookkeeping_fee': 'bookkeeping_fee',
  'foundation annual comp': 'foundation_annual_comp_fee',
  'foundation annual compliance services': 'foundation_annual_comp_fee',
  'foundation_annual_comp_fee': 'foundation_annual_comp_fee',
  'fbt': 'fbt_fee',
  'fringe benefit tax services': 'fbt_fee',
  'fbt_fee': 'fbt_fee',
  'family office': 'family_office_fee',
  'family office services': 'family_office_fee',
  'family_office_fee': 'family_office_fee',
  'annual tax planning': 'annual_tax_planning_fee',
  'annual taxation planning services': 'annual_tax_planning_fee',
  'annual_tax_planning_fee': 'annual_tax_planning_fee',
  'adhoc advice': 'adhoc_advice_fee',
  'adhoc_advice_fee': 'adhoc_advice_fee',
  'prep of financial reports and trust & company minutes': 'financial_reports_fee',
  'preparation of financial reports and trust & company minutes': 'financial_reports_fee',
  'financial_reports_fee': 'financial_reports_fee',
  'total tax & compliance 2026': 'total_oxygen_fee',
  'smsf tax & compliance 2026': 'smsf_tax_compliance_fee',
  'smsf taxation and compliance services': 'smsf_tax_compliance_fee',
  'smsf_tax_compliance_fee': 'smsf_tax_compliance_fee',
  'smsf asic 2026': 'smsf_asic_fee',
  'smsf_asic_fee': 'smsf_asic_fee',
  'smsf bas 2026': 'smsf_bas_fee',
  'smsf_bas_fee': 'smsf_bas_fee',
  'total smsf 2026': 'total_lumiere_fee',
  'contact': 'contact_name',
  'contact_name': 'contact_name',
  'salutation': 'salutation',
  'client email': 'client_email',
  'client_email': 'client_email',
  'opc director': 'opc_director',
  'opc_director': 'opc_director',
  'opc director 2': 'opc_director_2',
  'opc_director_2': 'opc_director_2',
  'opc manager': 'opc_manager',
  'opc_manager': 'opc_manager',
  'opc crm': 'opc_crm',
  'opc_crm': 'opc_crm',
  'lpa director': 'lpa_director',
  'lpa_director': 'lpa_director',
  'lpa manager': 'lpa_manager',
  'lpa_manager': 'lpa_manager',
  'postal address 1': 'postal_address_1',
  'postal_address_1': 'postal_address_1',
  'suburb': 'suburb',
  'state': 'state',
  'postcode': 'postcode',
  'country': 'country',
  'comments': 'comments',
}

function parseMoney(value: unknown): number {
  if (value == null || value === '') return 0
  if (typeof value === 'number') return Math.round(value * 100)
  const str = String(value).replace(/[$,\s]/g, '')
  const num = parseFloat(str)
  return isNaN(num) ? 0 : Math.round(num * 100)
}

function parseBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  const str = String(value || '').toLowerCase().trim()
  return str === 'yes' || str === 'y' || str === 'true' || str === '1'
}

export function parseExcelBuffer(buffer: ArrayBuffer): ExcelRow[] {
  const workbook = XLSX.read(buffer, { type: 'array' })

  // Use first sheet
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]

  // Convert to array of arrays to handle merged cells
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: false,
  })

  if (rawData.length === 0) return []

  // Normalize headers
  const rows: ExcelRow[] = []

  for (const rawRow of rawData) {
    const row: Partial<ExcelRow> = {}

    for (const [key, value] of Object.entries(rawRow)) {
      const normalizedKey = key.toLowerCase().trim()
      const mappedField = COLUMN_MAP[normalizedKey]
      if (!mappedField) continue

      // Parse by field type
      if (
        mappedField === 'tax_and_compliance_fee' ||
        mappedField === 'asic_fee' ||
        mappedField === 'quarterly_activity_fee' ||
        mappedField === 'bookkeeping_fee' ||
        mappedField === 'foundation_annual_comp_fee' ||
        mappedField === 'fbt_fee' ||
        mappedField === 'family_office_fee' ||
        mappedField === 'annual_tax_planning_fee' ||
        mappedField === 'adhoc_advice_fee' ||
        mappedField === 'financial_reports_fee' ||
        mappedField === 'total_oxygen_fee' ||
        mappedField === 'smsf_tax_compliance_fee' ||
        mappedField === 'smsf_asic_fee' ||
        mappedField === 'smsf_bas_fee' ||
        mappedField === 'total_lumiere_fee'
      ) {
        ;(row as Record<string, unknown>)[mappedField] = parseMoney(value)
      } else if (mappedField === 'signed_sa_received' || mappedField === 'paper_copy') {
        ;(row as Record<string, unknown>)[mappedField] = parseBool(value)
      } else {
        ;(row as Record<string, unknown>)[mappedField] = String(value || '').trim()
      }
    }

    // Skip rows with no client code
    if (!row.client_code || row.client_code === '') continue

    // Compute totals if not present
    if (!row.total_oxygen_fee) {
      row.total_oxygen_fee =
        (row.tax_and_compliance_fee ?? 0) +
        (row.asic_fee ?? 0) +
        (row.quarterly_activity_fee ?? 0) +
        (row.bookkeeping_fee ?? 0) +
        (row.foundation_annual_comp_fee ?? 0) +
        (row.fbt_fee ?? 0) +
        (row.family_office_fee ?? 0) +
        (row.annual_tax_planning_fee ?? 0) +
        (row.adhoc_advice_fee ?? 0) +
        (row.financial_reports_fee ?? 0)
    }

    if (!row.total_lumiere_fee) {
      row.total_lumiere_fee =
        (row.smsf_tax_compliance_fee ?? 0) +
        (row.smsf_asic_fee ?? 0) +
        (row.smsf_bas_fee ?? 0)
    }

    rows.push(row as ExcelRow)
  }

  return rows
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-AU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export function formatCentsDisplay(cents: number): string {
  return `$${formatCents(cents)}`
}
