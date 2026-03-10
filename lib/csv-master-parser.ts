/**
 * Parser for 2026 Master Control Sheet - v2.csv
 * Maps every CSV column to DB/client fields. Amounts stored in cents.
 *
 * Calculation logic (aligned with CSV):
 * - Total Tax & Compliance 2026 (Oxygen): use CSV value when present (ex-GST); else sum of 10 Oxygen line items.
 * - Total SMSF 2026 (Lumiere): use CSV value when present; else sum of 3 SMSF line items.
 * - Total fees = Oxygen + Lumiere (no extra GST on import; letter template adds 10% for display).
 */

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let i = 0
  while (i < line.length) {
    if (line[i] === '"') {
      i += 1
      let field = ''
      while (i < line.length) {
        if (line[i] === '"') {
          i += 1
          if (line[i] === '"') {
            field += '"'
            i += 1
          } else break
        } else {
          field += line[i]
          i += 1
        }
      }
      out.push(field.trim())
    } else {
      let field = ''
      while (i < line.length && line[i] !== ',') {
        field += line[i]
        i += 1
      }
      out.push(field.trim())
    }
    if (line[i] === ',') i += 1
  }
  return out
}

function parseMoney(value: string): number {
  const s = value.replace(/[$,\s]/g, '')
  if (s === '' || s === '-' || /^-?\s*$/.test(s)) return 0
  const num = parseFloat(s)
  return isNaN(num) ? 0 : Math.round(num * 100)
}

function parseBool(value: string): boolean {
  const t = value.toLowerCase().trim()
  return t === 'yes' || t === 'y' || t === 'true' || t === '1'
}

// CSV header (trimmed) -> our field key
const CSV_HEADER_MAP: Record<string, string> = {
  'client code': 'client_code',
  'client name': 'client_name',
  'client group': 'client_group',
  'status': 'excel_status',
  'date sent': 'date_sent',
  'signed sa received?': 'signed_sa_received',
  'paper': 'paper_copy',
  'total 2026 compliance including asic': 'total_2026_compliance_including_asic',
  'tax and compliance': 'tax_and_compliance_fee',
  'asic 2026': 'asic_fee',
  'quarterly activity': 'quarterly_activity_fee',
  'bookkeeping/administrative': 'bookkeeping_fee',
  'foundation annual comp': 'foundation_annual_comp_fee',
  'fbt': 'fbt_fee',
  'family office': 'family_office_fee',
  'annual tax planning': 'annual_tax_planning_fee',
  'adhoc advice': 'adhoc_advice_fee',
  'prep of financial reports and trust & company minutes': 'financial_reports_fee',
  'total tax & compliance 2026': 'total_oxygen_fee',
  'check fees split': 'check_fees_split',
  'smsf tax & compliance 2026': 'smsf_tax_compliance_fee',
  'smsf asic 2026': 'smsf_asic_fee',
  'smsf bas 2026': 'smsf_bas_fee',
  'total smsf 2026': 'total_lumiere_fee',
  'corporate secretarial services': 'corporate_secretarial_services',
  'corporate secretarial services - smsf': 'corporate_secretarial_services_smsf',
  '2025 asic fee (based on $300 per company) smsf trustee': 'asic_2025_smsf_trustee',
  '2025 asic fee (based on $300 per company) non smsf trustee': 'asic_2025_non_smsf_trustee',
  'total opc/lpa fees 2026': 'total_opc_lpa_fees_2026',
  'contact': 'contact_name',
  'salutation': 'salutation',
  'client email': 'client_email',
  'opc director': 'opc_director',
  'opc director 2': 'opc_director_2',
  'opc manager': 'opc_manager',
  'opc crm': 'opc_crm',
  'lpa director': 'lpa_director',
  'lpa manager': 'lpa_manager',
  'postal address 1': 'postal_address_1',
  'suburb': 'suburb',
  'state': 'state',
  'postcode': 'postcode',
  'country': 'country',
  'comments': 'comments',
}

const MONEY_KEYS = new Set([
  'total_2026_compliance_including_asic', 'tax_and_compliance_fee', 'asic_fee',
  'quarterly_activity_fee', 'bookkeeping_fee', 'foundation_annual_comp_fee',
  'fbt_fee', 'family_office_fee', 'annual_tax_planning_fee', 'adhoc_advice_fee',
  'financial_reports_fee', 'total_oxygen_fee', 'smsf_tax_compliance_fee',
  'smsf_asic_fee', 'smsf_bas_fee', 'total_lumiere_fee',
  'corporate_secretarial_services', 'corporate_secretarial_services_smsf',
  'asic_2025_smsf_trustee', 'asic_2025_non_smsf_trustee', 'total_opc_lpa_fees_2026',
])
const BOOL_KEYS = new Set(['signed_sa_received', 'paper_copy'])

export interface MasterCsvRow {
  client_code: string
  client_name: string
  client_group: string
  excel_status: string
  date_sent: string | null
  signed_sa_received: boolean
  paper_copy: boolean
  total_2026_compliance_including_asic: number
  tax_and_compliance_fee: number
  asic_fee: number
  quarterly_activity_fee: number
  bookkeeping_fee: number
  foundation_annual_comp_fee: number
  fbt_fee: number
  family_office_fee: number
  annual_tax_planning_fee: number
  adhoc_advice_fee: number
  financial_reports_fee: number
  total_oxygen_fee: number
  check_fees_split: string | null
  smsf_tax_compliance_fee: number
  smsf_asic_fee: number
  smsf_bas_fee: number
  total_lumiere_fee: number
  corporate_secretarial_services: number
  corporate_secretarial_services_smsf: number
  asic_2025_smsf_trustee: number
  asic_2025_non_smsf_trustee: number
  total_opc_lpa_fees_2026: number
  contact_name: string | null
  salutation: string | null
  client_email: string | null
  opc_director: string | null
  opc_director_2: string | null
  opc_manager: string | null
  opc_crm: string | null
  lpa_director: string | null
  lpa_manager: string | null
  postal_address_1: string | null
  suburb: string | null
  state: string | null
  postcode: string | null
  country: string | null
  comments: string | null
}

const EMPTY_ROW: MasterCsvRow = {
  client_code: '',
  client_name: '',
  client_group: '',
  excel_status: '',
  date_sent: null,
  signed_sa_received: false,
  paper_copy: false,
  total_2026_compliance_including_asic: 0,
  tax_and_compliance_fee: 0,
  asic_fee: 0,
  quarterly_activity_fee: 0,
  bookkeeping_fee: 0,
  foundation_annual_comp_fee: 0,
  fbt_fee: 0,
  family_office_fee: 0,
  annual_tax_planning_fee: 0,
  adhoc_advice_fee: 0,
  financial_reports_fee: 0,
  total_oxygen_fee: 0,
  check_fees_split: null,
  smsf_tax_compliance_fee: 0,
  smsf_asic_fee: 0,
  smsf_bas_fee: 0,
  total_lumiere_fee: 0,
  corporate_secretarial_services: 0,
  corporate_secretarial_services_smsf: 0,
  asic_2025_smsf_trustee: 0,
  asic_2025_non_smsf_trustee: 0,
  total_opc_lpa_fees_2026: 0,
  contact_name: null,
  salutation: null,
  client_email: null,
  opc_director: null,
  opc_director_2: null,
  opc_manager: null,
  opc_crm: null,
  lpa_director: null,
  lpa_manager: null,
  postal_address_1: null,
  suburb: null,
  state: null,
  postcode: null,
  country: null,
  comments: null,
}

export function parseMasterCsv(csvText: string): MasterCsvRow[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.length > 0)
  if (lines.length < 2) return []

  const headerRow = parseCsvLine(lines[0])
  const keyIndices: { key: string; idx: number }[] = []
  for (let i = 0; i < headerRow.length; i++) {
    const normalized = headerRow[i].toLowerCase().trim()
    const ourKey = CSV_HEADER_MAP[normalized]
    if (ourKey) keyIndices.push({ key: ourKey, idx: i })
  }

  const rows: MasterCsvRow[] = []
  for (let r = 1; r < lines.length; r++) {
    const cells = parseCsvLine(lines[r])
    const row = { ...EMPTY_ROW }

    for (const { key, idx } of keyIndices) {
      const raw = cells[idx] ?? ''
      const val = raw.trim()
      if (MONEY_KEYS.has(key)) {
        ;(row as Record<string, number>)[key] = parseMoney(val)
      } else if (BOOL_KEYS.has(key)) {
        ;(row as Record<string, boolean>)[key] = parseBool(val)
      } else if (key === 'check_fees_split') {
        row.check_fees_split = val === '' || /^\s*-\s*$/.test(val) ? null : val
      } else {
        ;(row as Record<string, string | null>)[key] = val === '' ? null : val
      }
    }

    // Use CSV totals when present; else derive from components (no +10% on import)
    if (row.total_oxygen_fee === 0) {
      row.total_oxygen_fee =
        row.tax_and_compliance_fee + row.asic_fee + row.quarterly_activity_fee +
        row.bookkeeping_fee + row.foundation_annual_comp_fee + row.fbt_fee +
        row.family_office_fee + row.annual_tax_planning_fee + row.adhoc_advice_fee +
        row.financial_reports_fee
    }
    if (row.total_lumiere_fee === 0) {
      row.total_lumiere_fee =
        row.smsf_tax_compliance_fee + row.smsf_asic_fee + row.smsf_bas_fee
    }

    if (!row.client_code) continue
    rows.push(row)
  }

  return rows
}
