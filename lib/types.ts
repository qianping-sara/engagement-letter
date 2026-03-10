export type ClientStatus = 'pending' | 'updated' | 'edited' | 'generated' | 'sent' | 'no_sa'

export interface Client {
  id: number
  client_code: string
  client_name: string
  client_group: string
  status: ClientStatus
  contact_name: string | null
  salutation: string | null
  client_email: string | null
  postal_address_1: string | null
  suburb: string | null
  state: string | null
  postcode: string | null
  country: string | null
  letter_date: string | null
  opc_director: string | null
  opc_director_2: string | null
  opc_manager: string | null
  opc_crm: string | null
  lpa_director: string | null
  lpa_manager: string | null
  // Oxygen fees (in cents)
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
  // Lumiere / SMSF fees (in cents)
  smsf_tax_compliance_fee: number
  smsf_asic_fee: number
  smsf_bas_fee: number
  // Computed totals (in cents)
  total_oxygen_fee: number
  total_lumiere_fee: number
  total_fees: number
  // CSV-only columns (from 2026 Master Control Sheet; optional until migration)
  excel_status?: string | null
  total_2026_compliance_including_asic?: number
  check_fees_split?: string | null
  corporate_secretarial_services?: number
  corporate_secretarial_services_smsf?: number
  asic_2025_smsf_trustee?: number
  asic_2025_non_smsf_trustee?: number
  total_opc_lpa_fees_2026?: number
  // Overrides
  user_overrides: Record<string, unknown>
  locked_fields: string[]
  // Meta
  paper_copy: boolean
  date_sent: string | null
  signed_sa_received: boolean
  comments: string | null
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export interface ClientEntity {
  id: number
  client_id: number
  entity_type: 'individual' | 'trust' | 'company' | 'foundation' | 'smsf' | 'partnership'
  entity_name: string
  is_locked: boolean
  created_at: string
}

export interface SyncHistory {
  id: number
  filename: string
  rows_processed: number
  rows_added: number
  rows_updated: number
  rows_skipped: number
  conflicts: ConflictItem[]
  synced_at: string
}

export interface ConflictItem {
  client_code: string
  client_name: string
  field: string
  excel_value: unknown
  current_value: unknown
  is_locked: boolean
}

export interface GenerationLog {
  id: number
  client_id: number
  generated_at: string
  snapshot: Record<string, unknown>
  filename: string | null
  is_stale: boolean
}

export interface DashboardStats {
  total: number
  pending: number
  updated: number
  edited: number
  generated: number
  sent: number
  no_sa: number
}

export interface ClientWithEntities extends Client {
  entities: ClientEntity[]
}

// Excel row shape after parsing
export interface ExcelRow {
  client_code: string
  client_name: string
  client_group: string
  status?: string
  date_sent?: string
  signed_sa_received?: boolean
  paper_copy?: boolean
  total_fees_check?: number
  tax_and_compliance_fee?: number
  asic_fee?: number
  quarterly_activity_fee?: number
  bookkeeping_fee?: number
  foundation_annual_comp_fee?: number
  fbt_fee?: number
  family_office_fee?: number
  annual_tax_planning_fee?: number
  adhoc_advice_fee?: number
  financial_reports_fee?: number
  total_oxygen_fee?: number
  smsf_tax_compliance_fee?: number
  smsf_asic_fee?: number
  smsf_bas_fee?: number
  total_lumiere_fee?: number
  contact_name?: string
  salutation?: string
  client_email?: string
  opc_director?: string
  opc_director_2?: string
  opc_manager?: string
  opc_crm?: string
  lpa_director?: string
  lpa_manager?: string
  postal_address_1?: string
  suburb?: string
  state?: string
  postcode?: string
  country?: string
  comments?: string
}

// Template data shape for docxtemplater
export interface TemplateData {
  letter_date: string
  client_name: string
  client_email: string
  salutation: string
  client_group: string
  // Entities
  individuals: string[]
  trusts: string[]
  companies: string[]
  smsfs: string[]
  foundations: string[]
  partnerships: string[]
  // Oxygen items
  oxygen_items: { name: string; amount: string }[]
  oxygen_subtotal: string
  oxygen_gst: string
  oxygen_total: string
  has_oxygen: boolean
  // Lumiere items
  lumiere_items: { name: string; amount: string }[]
  lumiere_subtotal: string
  lumiere_gst: string
  lumiere_total: string
  has_lumiere: boolean
  // Grand total
  grand_total: string
  // Conditional blocks
  has_smsf: boolean
  has_foundation: boolean
}
