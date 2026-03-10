import type { Client, ClientEntity, TemplateData } from './types'
import { formatCents } from './excel-parser'

function centsToDisplay(cents: number): string {
  return formatCents(cents)
}

export function buildTemplateData(
  client: Client,
  entities: ClientEntity[]
): TemplateData {
  // Group entities by type
  const individuals = entities
    .filter((e) => e.entity_type === 'individual')
    .map((e) => e.entity_name)
  const trusts = entities
    .filter((e) => e.entity_type === 'trust')
    .map((e) => e.entity_name)
  const companies = entities
    .filter((e) => e.entity_type === 'company')
    .map((e) => e.entity_name)
  const smsfs = entities
    .filter((e) => e.entity_type === 'smsf')
    .map((e) => e.entity_name)
  const foundations = entities
    .filter((e) => e.entity_type === 'foundation')
    .map((e) => e.entity_name)
  const partnerships = entities
    .filter((e) => e.entity_type === 'partnership')
    .map((e) => e.entity_name)

  // Build oxygen items (only non-zero fees)
  const oxygenFeeMap: { field: keyof Client; label: string }[] = [
    { field: 'tax_and_compliance_fee', label: 'Taxation and Compliance Services' },
    { field: 'quarterly_activity_fee', label: 'Quarterly Activity Statement Services' },
    { field: 'asic_fee', label: 'ASIC Administration and Registered Agent Services (to be invoiced annually in June)' },
    { field: 'bookkeeping_fee', label: 'Bookkeeping and Administrative Services' },
    { field: 'foundation_annual_comp_fee', label: 'Foundation Annual Compliance Services' },
    { field: 'fbt_fee', label: 'Fringe Benefit Tax Services' },
    { field: 'family_office_fee', label: 'Family Office Services' },
    { field: 'annual_tax_planning_fee', label: 'Annual Taxation Planning Services' },
    { field: 'adhoc_advice_fee', label: 'Adhoc Advice' },
    { field: 'financial_reports_fee', label: 'Preparation of Financial Reports and Trust & Company minutes for relevant entities' },
  ]

  const oxygen_items = oxygenFeeMap
    .filter((item) => (client[item.field] as number) > 0)
    .map((item) => ({
      name: item.label,
      amount: centsToDisplay(client[item.field] as number),
    }))

  const oxygenSubtotalCents = oxygenFeeMap.reduce(
    (sum, item) => sum + (client[item.field] as number),
    0
  )
  const oxygenGstCents = Math.round(oxygenSubtotalCents * 0.1)
  const oxygenTotalCents = oxygenSubtotalCents + oxygenGstCents

  // Build lumiere items
  const lumiereFeeMap: { field: keyof Client; label: string }[] = [
    { field: 'smsf_tax_compliance_fee', label: 'SMSF Taxation and Compliance Services' },
    { field: 'smsf_bas_fee', label: 'Quarterly Activity Statement Services' },
    { field: 'smsf_asic_fee', label: 'ASIC Administration and Registered Agent Services (to be invoiced annually in June)' },
  ]

  const lumiere_items = lumiereFeeMap
    .filter((item) => (client[item.field] as number) > 0)
    .map((item) => ({
      name: item.label,
      amount: centsToDisplay(client[item.field] as number),
    }))

  const lumiereSubtotalCents = lumiereFeeMap.reduce(
    (sum, item) => sum + (client[item.field] as number),
    0
  )
  const lumiereGstCents = Math.round(lumiereSubtotalCents * 0.1)
  const lumiereTotalCents = lumiereSubtotalCents + lumiereGstCents

  const grandTotalCents = oxygenTotalCents + lumiereTotalCents

  const has_oxygen = oxygenSubtotalCents > 0
  const has_lumiere = lumiereSubtotalCents > 0
  const has_smsf = smsfs.length > 0 || client.smsf_tax_compliance_fee > 0
  const has_foundation = foundations.length > 0 || client.foundation_annual_comp_fee > 0

  return {
    letter_date: client.letter_date
      ? new Date(client.letter_date).toLocaleDateString('en-AU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('en-AU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
    client_name: client.contact_name || client.client_name,
    client_email: client.client_email || '',
    salutation: client.salutation || client.contact_name || '',
    client_group: client.client_group,
    individuals,
    trusts,
    companies,
    smsfs,
    foundations,
    partnerships,
    oxygen_items,
    oxygen_subtotal: centsToDisplay(oxygenSubtotalCents),
    oxygen_gst: centsToDisplay(oxygenGstCents),
    oxygen_total: centsToDisplay(oxygenTotalCents),
    has_oxygen,
    lumiere_items,
    lumiere_subtotal: centsToDisplay(lumiereSubtotalCents),
    lumiere_gst: centsToDisplay(lumiereGstCents),
    lumiere_total: centsToDisplay(lumiereTotalCents),
    has_lumiere,
    grand_total: centsToDisplay(grandTotalCents),
    has_smsf,
    has_foundation,
  }
}
