import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { parseExcelBuffer } from '@/lib/excel-parser'
import type { ExcelRow, ConflictItem } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const rows: ExcelRow[] = parseExcelBuffer(buffer)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No valid rows found in file' }, { status: 400 })
    }

    let added = 0
    let updated = 0
    let skipped = 0
    const addedClients: { client_code: string; client_name: string }[] = []
    const updatedClients: { client_code: string; client_name: string }[] = []
    const conflicts: ConflictItem[] = []

    for (const row of rows) {
      if (!row.client_code) { skipped++; continue }

      // Check if client exists
      const existing = await sql`
        SELECT id, locked_fields, status, client_code, client_name,
          tax_and_compliance_fee, asic_fee, quarterly_activity_fee,
          bookkeeping_fee, fbt_fee, family_office_fee, annual_tax_planning_fee,
          adhoc_advice_fee, financial_reports_fee, foundation_annual_comp_fee,
          smsf_tax_compliance_fee, smsf_asic_fee, smsf_bas_fee,
          salutation, client_email, contact_name
        FROM clients WHERE client_code = ${row.client_code}
      `

      if (existing.length === 0) {
        // New client - insert
        // Use CSV/Excel totals when present (ex-GST); else sum components (no +10% on import)
        const oxygenSub =
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
        const oxygenTotal = (row.total_oxygen_fee != null && row.total_oxygen_fee > 0) ? row.total_oxygen_fee : oxygenSub
        const lumiereSub =
          (row.smsf_tax_compliance_fee ?? 0) +
          (row.smsf_asic_fee ?? 0) +
          (row.smsf_bas_fee ?? 0)
        const lumiereTotal = (row.total_lumiere_fee != null && row.total_lumiere_fee > 0) ? row.total_lumiere_fee : lumiereSub

        // Determine internal workflow status (separate from raw Excel "Status" column)
        let clientStatus: 'pending' | 'no_sa' = 'pending'
        if (row.status) {
          const s = row.status.toLowerCase()
          if (s.includes('no sa') || s === 'no_sa') clientStatus = 'no_sa'
        }

        await sql`
          INSERT INTO clients (
            client_code, client_name, client_group, status,
            excel_status,
            contact_name, salutation, client_email,
            postal_address_1, suburb, state, postcode, country,
            opc_director, opc_director_2, opc_manager, opc_crm,
            lpa_director, lpa_manager,
            tax_and_compliance_fee, asic_fee, quarterly_activity_fee,
            bookkeeping_fee, foundation_annual_comp_fee, fbt_fee,
            family_office_fee, annual_tax_planning_fee, adhoc_advice_fee,
            financial_reports_fee, smsf_tax_compliance_fee, smsf_asic_fee,
            smsf_bas_fee, total_oxygen_fee, total_lumiere_fee, total_fees,
            paper_copy, comments, last_synced_at
          ) VALUES (
            ${row.client_code}, ${row.client_name || ''}, ${row.client_group || ''},
            ${clientStatus},
            ${row.status || null},
            ${row.contact_name || null}, ${row.salutation || null}, ${row.client_email || null},
            ${row.postal_address_1 || null}, ${row.suburb || null},
            ${row.state || null}, ${row.postcode || null}, ${row.country || null},
            ${row.opc_director || null}, ${row.opc_director_2 || null},
            ${row.opc_manager || null}, ${row.opc_crm || null},
            ${row.lpa_director || null}, ${row.lpa_manager || null},
            ${row.tax_and_compliance_fee ?? 0}, ${row.asic_fee ?? 0},
            ${row.quarterly_activity_fee ?? 0}, ${row.bookkeeping_fee ?? 0},
            ${row.foundation_annual_comp_fee ?? 0}, ${row.fbt_fee ?? 0},
            ${row.family_office_fee ?? 0}, ${row.annual_tax_planning_fee ?? 0},
            ${row.adhoc_advice_fee ?? 0}, ${row.financial_reports_fee ?? 0},
            ${row.smsf_tax_compliance_fee ?? 0}, ${row.smsf_asic_fee ?? 0},
            ${row.smsf_bas_fee ?? 0}, ${oxygenTotal}, ${lumiereTotal},
            ${oxygenTotal + lumiereTotal},
            ${row.paper_copy ?? false},
            ${row.comments || null}, NOW()
          )
        `
        added++
        addedClients.push({
          client_code: row.client_code,
          client_name: row.client_name || '',
        })
      } else {
        const existingClient = existing[0]
        const lockedFields: string[] = existingClient.locked_fields || []

        // Check for conflicts on locked fields
        const feeFieldsToCheck: Array<{ field: keyof ExcelRow; dbField: string }> = [
          { field: 'tax_and_compliance_fee', dbField: 'tax_and_compliance_fee' },
          { field: 'asic_fee', dbField: 'asic_fee' },
          { field: 'quarterly_activity_fee', dbField: 'quarterly_activity_fee' },
          { field: 'bookkeeping_fee', dbField: 'bookkeeping_fee' },
          { field: 'fbt_fee', dbField: 'fbt_fee' },
          { field: 'family_office_fee', dbField: 'family_office_fee' },
          { field: 'annual_tax_planning_fee', dbField: 'annual_tax_planning_fee' },
          { field: 'adhoc_advice_fee', dbField: 'adhoc_advice_fee' },
          { field: 'financial_reports_fee', dbField: 'financial_reports_fee' },
          { field: 'smsf_tax_compliance_fee', dbField: 'smsf_tax_compliance_fee' },
          { field: 'salutation', dbField: 'salutation' },
          { field: 'client_email', dbField: 'client_email' },
        ]

        const rowConflicts: ConflictItem[] = []
        let hasUnlockedChanges = false

        for (const { field, dbField } of feeFieldsToCheck) {
          const excelVal = row[field]
          const dbVal = existingClient[dbField]
          if (excelVal !== undefined && excelVal !== dbVal) {
            if (lockedFields.includes(dbField)) {
              rowConflicts.push({
                client_code: row.client_code,
                client_name: row.client_name || existingClient.client_name,
                field: dbField,
                excel_value: excelVal,
                current_value: dbVal,
                is_locked: true,
              })
            } else {
              hasUnlockedChanges = true
            }
          }
        }

        conflicts.push(...rowConflicts)

        // Only update unlocked fields that changed
        if (hasUnlockedChanges) {
          const oxygenSub =
            (row.tax_and_compliance_fee ?? existingClient.tax_and_compliance_fee) +
            (row.asic_fee ?? existingClient.asic_fee) +
            (row.quarterly_activity_fee ?? existingClient.quarterly_activity_fee) +
            (row.bookkeeping_fee ?? existingClient.bookkeeping_fee) +
            (row.foundation_annual_comp_fee ?? existingClient.foundation_annual_comp_fee) +
            (row.fbt_fee ?? existingClient.fbt_fee) +
            (row.family_office_fee ?? existingClient.family_office_fee) +
            (row.annual_tax_planning_fee ?? existingClient.annual_tax_planning_fee) +
            (row.adhoc_advice_fee ?? existingClient.adhoc_advice_fee) +
            (row.financial_reports_fee ?? existingClient.financial_reports_fee)
          const oxygenTotal = (row.total_oxygen_fee != null && row.total_oxygen_fee > 0) ? row.total_oxygen_fee : oxygenSub
          const lumiereSub =
            (row.smsf_tax_compliance_fee ?? existingClient.smsf_tax_compliance_fee) +
            (row.smsf_asic_fee ?? existingClient.smsf_asic_fee) +
            (row.smsf_bas_fee ?? existingClient.smsf_bas_fee)
          const lumiereTotal = (row.total_lumiere_fee != null && row.total_lumiere_fee > 0) ? row.total_lumiere_fee : lumiereSub

          // Only update if status is still pending
          const newStatus =
            existingClient.status === 'pending' ? 'updated' : existingClient.status

          await sql`
            UPDATE clients SET
              client_name = ${row.client_name || existingClient.client_name},
              client_group = ${row.client_group || existingClient.client_group},
              excel_status = COALESCE(${row.status || null}, excel_status),
              contact_name = COALESCE(${row.contact_name || null}, contact_name),
              client_email = CASE WHEN ${lockedFields.includes('client_email')} THEN client_email ELSE COALESCE(${row.client_email || null}, client_email) END,
              salutation = CASE WHEN ${lockedFields.includes('salutation')} THEN salutation ELSE COALESCE(${row.salutation || null}, salutation) END,
              postal_address_1 = COALESCE(${row.postal_address_1 || null}, postal_address_1),
              suburb = COALESCE(${row.suburb || null}, suburb),
              state = COALESCE(${row.state || null}, state),
              postcode = COALESCE(${row.postcode || null}, postcode),
              opc_director = COALESCE(${row.opc_director || null}, opc_director),
              opc_director_2 = COALESCE(${row.opc_director_2 || null}, opc_director_2),
              opc_manager = COALESCE(${row.opc_manager || null}, opc_manager),
              lpa_director = COALESCE(${row.lpa_director || null}, lpa_director),
              lpa_manager = COALESCE(${row.lpa_manager || null}, lpa_manager),
              tax_and_compliance_fee = CASE WHEN ${lockedFields.includes('tax_and_compliance_fee')} THEN tax_and_compliance_fee ELSE ${row.tax_and_compliance_fee ?? 0} END,
              asic_fee = CASE WHEN ${lockedFields.includes('asic_fee')} THEN asic_fee ELSE ${row.asic_fee ?? 0} END,
              quarterly_activity_fee = CASE WHEN ${lockedFields.includes('quarterly_activity_fee')} THEN quarterly_activity_fee ELSE ${row.quarterly_activity_fee ?? 0} END,
              bookkeeping_fee = CASE WHEN ${lockedFields.includes('bookkeeping_fee')} THEN bookkeeping_fee ELSE ${row.bookkeeping_fee ?? 0} END,
              foundation_annual_comp_fee = CASE WHEN ${lockedFields.includes('foundation_annual_comp_fee')} THEN foundation_annual_comp_fee ELSE ${row.foundation_annual_comp_fee ?? 0} END,
              fbt_fee = CASE WHEN ${lockedFields.includes('fbt_fee')} THEN fbt_fee ELSE ${row.fbt_fee ?? 0} END,
              family_office_fee = CASE WHEN ${lockedFields.includes('family_office_fee')} THEN family_office_fee ELSE ${row.family_office_fee ?? 0} END,
              annual_tax_planning_fee = CASE WHEN ${lockedFields.includes('annual_tax_planning_fee')} THEN annual_tax_planning_fee ELSE ${row.annual_tax_planning_fee ?? 0} END,
              adhoc_advice_fee = CASE WHEN ${lockedFields.includes('adhoc_advice_fee')} THEN adhoc_advice_fee ELSE ${row.adhoc_advice_fee ?? 0} END,
              financial_reports_fee = CASE WHEN ${lockedFields.includes('financial_reports_fee')} THEN financial_reports_fee ELSE ${row.financial_reports_fee ?? 0} END,
              smsf_tax_compliance_fee = CASE WHEN ${lockedFields.includes('smsf_tax_compliance_fee')} THEN smsf_tax_compliance_fee ELSE ${row.smsf_tax_compliance_fee ?? 0} END,
              smsf_asic_fee = CASE WHEN ${lockedFields.includes('smsf_asic_fee')} THEN smsf_asic_fee ELSE ${row.smsf_asic_fee ?? 0} END,
              smsf_bas_fee = CASE WHEN ${lockedFields.includes('smsf_bas_fee')} THEN smsf_bas_fee ELSE ${row.smsf_bas_fee ?? 0} END,
              total_oxygen_fee = ${oxygenTotal},
              total_lumiere_fee = ${lumiereTotal},
              total_fees = ${oxygenTotal + lumiereTotal},
              status = ${newStatus},
              last_synced_at = NOW(),
              updated_at = NOW()
            WHERE id = ${existingClient.id}
          `
          updated++
          updatedClients.push({
            client_code: existingClient.client_code,
            client_name: existingClient.client_name,
          })
        } else {
          skipped++
        }
      }
    }

    // Log sync history
    await sql`
      INSERT INTO sync_history (filename, rows_processed, rows_added, rows_updated, rows_skipped, conflicts)
      VALUES (
        ${file.name},
        ${rows.length},
        ${added},
        ${updated},
        ${skipped},
        ${JSON.stringify(conflicts)}
      )
    `

    return NextResponse.json({
      success: true,
      rows_processed: rows.length,
      added,
      updated,
      skipped,
      conflicts,
      added_clients: addedClients,
      updated_clients: updatedClients,
    })
  } catch (error) {
    console.error('[v0] POST /api/sync error:', error)
    return NextResponse.json({ error: 'Sync failed: ' + String(error) }, { status: 500 })
  }
}

export async function GET() {
  try {
    const history = await sql`
      SELECT * FROM sync_history ORDER BY synced_at DESC LIMIT 10
    `
    return NextResponse.json({ history })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
