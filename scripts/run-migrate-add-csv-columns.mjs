#!/usr/bin/env node
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load .env from project root
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const envPath = resolve(root, '.env')
try {
  const env = readFileSync(envPath, 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
} catch (e) {
  console.error('Could not load .env:', e.message)
  process.exit(1)
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set in .env')
  process.exit(1)
}

const { neon } = await import('@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)
const migration = readFileSync(resolve(__dirname, 'migrate-add-csv-columns.sql'), 'utf8')

try {
  await sql(migration)
  console.log('Migration completed: migrate-add-csv-columns.sql')
} catch (err) {
  console.error('Migration failed:', err.message)
  process.exit(1)
}
