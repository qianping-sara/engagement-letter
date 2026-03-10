import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const clients = await sql`SELECT * FROM clients WHERE id = ${parseInt(id)}`
    if (clients.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    const entities = await sql`
      SELECT * FROM client_entities WHERE client_id = ${parseInt(id)} ORDER BY entity_type, entity_name
    `
    return NextResponse.json({ client: clients[0], entities })
  } catch (error) {
    console.error('[v0] GET /api/clients/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const {
      salutation, client_email, contact_name, letter_date,
      tax_and_compliance_fee, asic_fee, quarterly_activity_fee,
      bookkeeping_fee, foundation_annual_comp_fee, fbt_fee,
      family_office_fee, annual_tax_planning_fee, adhoc_advice_fee,
      financial_reports_fee, smsf_tax_compliance_fee, smsf_asic_fee,
      smsf_bas_fee, comments, locked_fields, entities,
      status,
    } = body

    // Compute totals
    const oxygenFields = [
      tax_and_compliance_fee, asic_fee, quarterly_activity_fee, bookkeeping_fee,
      foundation_annual_comp_fee, fbt_fee, family_office_fee, annual_tax_planning_fee,
      adhoc_advice_fee, financial_reports_fee,
    ]
    const total_oxygen_sub = oxygenFields.reduce((s, v) => s + (Number(v) || 0), 0)
    const total_oxygen_fee = total_oxygen_sub + Math.round(total_oxygen_sub * 0.1)

    const lumiereFields = [smsf_tax_compliance_fee, smsf_asic_fee, smsf_bas_fee]
    const total_lumiere_sub = lumiereFields.reduce((s, v) => s + (Number(v) || 0), 0)
    const total_lumiere_fee = total_lumiere_sub + Math.round(total_lumiere_sub * 0.1)

    const total_fees = total_oxygen_fee + total_lumiere_fee

    const newStatus = status || 'edited'

    const updated = await sql`
      UPDATE clients SET
        salutation = ${salutation},
        client_email = ${client_email},
        contact_name = ${contact_name},
        letter_date = ${letter_date},
        tax_and_compliance_fee = ${Number(tax_and_compliance_fee) || 0},
        asic_fee = ${Number(asic_fee) || 0},
        quarterly_activity_fee = ${Number(quarterly_activity_fee) || 0},
        bookkeeping_fee = ${Number(bookkeeping_fee) || 0},
        foundation_annual_comp_fee = ${Number(foundation_annual_comp_fee) || 0},
        fbt_fee = ${Number(fbt_fee) || 0},
        family_office_fee = ${Number(family_office_fee) || 0},
        annual_tax_planning_fee = ${Number(annual_tax_planning_fee) || 0},
        adhoc_advice_fee = ${Number(adhoc_advice_fee) || 0},
        financial_reports_fee = ${Number(financial_reports_fee) || 0},
        smsf_tax_compliance_fee = ${Number(smsf_tax_compliance_fee) || 0},
        smsf_asic_fee = ${Number(smsf_asic_fee) || 0},
        smsf_bas_fee = ${Number(smsf_bas_fee) || 0},
        total_oxygen_fee = ${total_oxygen_fee},
        total_lumiere_fee = ${total_lumiere_fee},
        total_fees = ${total_fees},
        comments = ${comments || null},
        locked_fields = ${locked_fields || []},
        status = ${newStatus},
        updated_at = NOW()
      WHERE id = ${parseInt(id)}
      RETURNING *
    `

    // Update entities if provided
    if (entities && Array.isArray(entities)) {
      await sql`DELETE FROM client_entities WHERE client_id = ${parseInt(id)} AND is_locked = false`
      for (const entity of entities) {
        if (entity.entity_name?.trim()) {
          await sql`
            INSERT INTO client_entities (client_id, entity_type, entity_name, is_locked)
            VALUES (${parseInt(id)}, ${entity.entity_type}, ${entity.entity_name.trim()}, ${entity.is_locked || false})
          `
        }
      }
    }

    const updatedEntities = await sql`
      SELECT * FROM client_entities WHERE client_id = ${parseInt(id)} ORDER BY entity_type, entity_name
    `

    return NextResponse.json({ client: updated[0], entities: updatedEntities })
  } catch (error) {
    console.error('[v0] PATCH /api/clients/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
  }
}
