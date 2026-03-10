import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { buildTemplateData } from '@/lib/template-builder'
import type { Client, ClientEntity } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { client_ids } = body as { client_ids: number[] }

    if (!client_ids || client_ids.length === 0) {
      return NextResponse.json({ error: 'No client IDs provided' }, { status: 400 })
    }

    const results: { client_id: number; client_code: string; group_name: string; data: object }[] = []

    for (const clientId of client_ids) {
      const clients = await sql`SELECT * FROM clients WHERE id = ${clientId}`
      if (clients.length === 0) continue

      const client = clients[0] as unknown as Client
      const entities = await sql`
        SELECT * FROM client_entities WHERE client_id = ${clientId}
      ` as unknown as ClientEntity[]

      const templateData = buildTemplateData(client, entities)

      // Log generation
      await sql`
        INSERT INTO generation_log (client_id, snapshot)
        VALUES (${clientId}, ${JSON.stringify(templateData)})
      `

      // Mark as generated (track timestamp via generation_log only)
      await sql`
        UPDATE clients SET status = 'generated', updated_at = NOW()
        WHERE id = ${clientId}
      `

      results.push({
        client_id: clientId,
        client_code: client.client_code,
        group_name: client.client_group,
        data: templateData,
      })
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('[v0] POST /api/generate error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
