import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  try {
    let clients
    let countResult

    if (status && status !== 'all') {
      if (search) {
        clients = await sql`
          SELECT * FROM clients
          WHERE status = ${status}
            AND (
              client_code ILIKE ${'%' + search + '%'} OR
              client_name ILIKE ${'%' + search + '%'} OR
              client_group ILIKE ${'%' + search + '%'} OR
              client_email ILIKE ${'%' + search + '%'}
            )
          ORDER BY client_code ASC
          LIMIT ${limit} OFFSET ${offset}
        `
        countResult = await sql`
          SELECT COUNT(*) as count FROM clients
          WHERE status = ${status}
            AND (
              client_code ILIKE ${'%' + search + '%'} OR
              client_name ILIKE ${'%' + search + '%'} OR
              client_group ILIKE ${'%' + search + '%'} OR
              client_email ILIKE ${'%' + search + '%'}
            )
        `
      } else {
        clients = await sql`
          SELECT * FROM clients
          WHERE status = ${status}
          ORDER BY client_code ASC
          LIMIT ${limit} OFFSET ${offset}
        `
        countResult = await sql`SELECT COUNT(*) as count FROM clients WHERE status = ${status}`
      }
    } else {
      if (search) {
        clients = await sql`
          SELECT * FROM clients
          WHERE
            client_code ILIKE ${'%' + search + '%'} OR
            client_name ILIKE ${'%' + search + '%'} OR
            client_group ILIKE ${'%' + search + '%'} OR
            client_email ILIKE ${'%' + search + '%'}
          ORDER BY client_code ASC
          LIMIT ${limit} OFFSET ${offset}
        `
        countResult = await sql`
          SELECT COUNT(*) as count FROM clients
          WHERE
            client_code ILIKE ${'%' + search + '%'} OR
            client_name ILIKE ${'%' + search + '%'} OR
            client_group ILIKE ${'%' + search + '%'} OR
            client_email ILIKE ${'%' + search + '%'}
        `
      } else {
        clients = await sql`
          SELECT * FROM clients ORDER BY client_code ASC LIMIT ${limit} OFFSET ${offset}
        `
        countResult = await sql`SELECT COUNT(*) as count FROM clients`
      }
    }

    // Stats
    const statsResult = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE true) AS total,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'updated') AS updated,
        COUNT(*) FILTER (WHERE status = 'edited') AS edited,
        COUNT(*) FILTER (WHERE status = 'generated') AS generated,
        COUNT(*) FILTER (WHERE status = 'sent') AS sent,
        COUNT(*) FILTER (WHERE status = 'no_sa') AS no_sa
      FROM clients
    `

    const lastSync = await sql`
      SELECT synced_at, filename, rows_added, rows_updated FROM sync_history
      ORDER BY synced_at DESC LIMIT 1
    `

    return NextResponse.json({
      clients,
      total: parseInt(countResult[0]?.count || '0'),
      page,
      limit,
      stats: statsResult[0],
      lastSync: lastSync[0] || null,
    })
  } catch (error) {
    console.error('[v0] GET /api/clients error:', error)
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
}
