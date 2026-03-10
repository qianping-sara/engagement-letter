import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { buildTemplateData } from '@/lib/template-builder'
import { renderDocx, getTemplatePath } from '@/lib/docx-renderer'
import { existsSync } from 'fs'
import JSZip from 'jszip'
import type { Client, ClientEntity } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { client_ids } = body as { client_ids: number[] }

    if (!client_ids || client_ids.length === 0) {
      return NextResponse.json({ error: 'No client IDs provided' }, { status: 400 })
    }

    if (!existsSync(getTemplatePath())) {
      return NextResponse.json(
        { error: 'Template not found. Place 2026 SA template_1.docx in project root.' },
        { status: 503 }
      )
    }

    const results: { client_id: number; client_code: string; group_name: string; buffer: Buffer }[] = []

    for (const clientId of client_ids) {
      const clients = await sql`SELECT * FROM clients WHERE id = ${clientId}`
      if (clients.length === 0) continue

      const client = clients[0] as unknown as Client
      const entities = await sql`
        SELECT * FROM client_entities WHERE client_id = ${clientId}
      ` as unknown as ClientEntity[]

      const templateData = buildTemplateData(client, entities)
      const buffer = renderDocx(templateData)

      await sql`
        INSERT INTO generation_log (client_id, snapshot)
        VALUES (${clientId}, ${JSON.stringify(templateData)})
      `
      await sql`
        UPDATE clients SET status = 'generated', updated_at = NOW()
        WHERE id = ${clientId}
      `

      results.push({
        client_id: clientId,
        client_code: client.client_code,
        group_name: client.client_group,
        buffer,
      })
    }

    if (results.length === 0) {
      return NextResponse.json({ error: 'No valid clients found' }, { status: 400 })
    }

    const safeName = (s: string) => s.replace(/[^a-zA-Z0-9-_]/g, '_')

    if (results.length === 1) {
      const { client_code, buffer } = results[0]
      const filename = `EL-${safeName(client_code)}.docx`
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    const zip = new JSZip()
    for (const { client_code, buffer } of results) {
      zip.file(`EL-${safeName(client_code)}.docx`, buffer)
    }
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    })
    const zipFilename = 'ELs-2026.zip'
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
      },
    })
  } catch (error) {
    console.error('[v0] POST /api/generate error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
