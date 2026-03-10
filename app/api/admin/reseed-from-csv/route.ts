import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { parseMasterCsv } from '@/lib/csv-master-parser'
import type { MasterCsvRow } from '@/lib/csv-master-parser'

/**
 * POST /api/admin/reseed-from-csv
 * Clears client-related data and re-imports from the uploaded CSV (2026 Master Control Sheet).
 * Run scripts/migrate-add-csv-columns.sql once before first use.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    const rows: MasterCsvRow[] = parseMasterCsv(text)
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No valid rows in CSV' }, { status: 400 })
    }

    // Clear in FK order
    await sql`DELETE FROM generation_log`
    await sql`DELETE FROM client_entities`
    await sql`DELETE FROM clients`
    await sql`DELETE FROM sync_history`

    let inserted = 0
    for (const row of rows) {
      const workflowStatus =
        row.excel_status && (row.excel_status.toLowerCase().includes('no sa') || row.excel_status.toLowerCase() === 'no_sa')
          ? 'no_sa'
          : 'pending'

      const totalFees = row.total_oxygen_fee + row.total_lumiere_fee

      // CSV date is MM/DD/YYYY
      let dateSentVal: string | null = null
      if (row.date_sent && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(row.date_sent)) {
        const [mm, dd, yyyy] = row.date_sent.split('/')
        dateSentVal = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
      }

      await sql`
        INSERT INTO clients (
          client_code, client_name, client_group, status,
          excel_status, date_sent, signed_sa_received, paper_copy,
          contact_name, salutation, client_email,
          postal_address_1, suburb, state, postcode, country,
          opc_director, opc_director_2, opc_manager, opc_crm,
          lpa_director, lpa_manager,
          total_2026_compliance_including_asic,
          tax_and_compliance_fee, asic_fee, quarterly_activity_fee,
          bookkeeping_fee, foundation_annual_comp_fee, fbt_fee,
          family_office_fee, annual_tax_planning_fee, adhoc_advice_fee,
          financial_reports_fee,
          total_oxygen_fee, check_fees_split,
          smsf_tax_compliance_fee, smsf_asic_fee, smsf_bas_fee,
          total_lumiere_fee,
          corporate_secretarial_services, corporate_secretarial_services_smsf,
          asic_2025_smsf_trustee, asic_2025_non_smsf_trustee,
          total_opc_lpa_fees_2026,
          total_fees,
          comments, last_synced_at
        ) VALUES (
          ${row.client_code}, ${row.client_name}, ${row.client_group},
          ${workflowStatus},
          ${row.excel_status || null}, ${dateSentVal},
          ${row.signed_sa_received}, ${row.paper_copy},
          ${row.contact_name}, ${row.salutation}, ${row.client_email},
          ${row.postal_address_1}, ${row.suburb}, ${row.state},
          ${row.postcode}, ${row.country},
          ${row.opc_director}, ${row.opc_director_2}, ${row.opc_manager}, ${row.opc_crm},
          ${row.lpa_director}, ${row.lpa_manager},
          ${row.total_2026_compliance_including_asic},
          ${row.tax_and_compliance_fee}, ${row.asic_fee}, ${row.quarterly_activity_fee},
          ${row.bookkeeping_fee}, ${row.foundation_annual_comp_fee}, ${row.fbt_fee},
          ${row.family_office_fee}, ${row.annual_tax_planning_fee}, ${row.adhoc_advice_fee},
          ${row.financial_reports_fee},
          ${row.total_oxygen_fee}, ${row.check_fees_split},
          ${row.smsf_tax_compliance_fee}, ${row.smsf_asic_fee}, ${row.smsf_bas_fee},
          ${row.total_lumiere_fee},
          ${row.corporate_secretarial_services}, ${row.corporate_secretarial_services_smsf},
          ${row.asic_2025_smsf_trustee}, ${row.asic_2025_non_smsf_trustee},
          ${row.total_opc_lpa_fees_2026},
          ${totalFees},
          ${row.comments}, NOW()
        )
      `
      inserted++
    }

    return NextResponse.json({
      success: true,
      inserted,
      message: `Cleared and re-imported ${inserted} clients from CSV.`,
    })
  } catch (err) {
    console.error('[reseed-from-csv]', err)
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('column') && msg.includes('does not exist')) {
      return NextResponse.json(
        { error: 'Run scripts/migrate-add-csv-columns.sql on your database first, then retry.' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
