import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const checks: Record<string, string> = {}

  // Check env vars
  checks.DATA_BASE = process.env.DATA_BASE ? 'set (length: ' + process.env.DATA_BASE.length + ')' : 'NOT SET'
  checks.OPENAI_API_KEY = process.env.OPENAI_API_KEY ? 'set' : 'NOT SET'

  // Try importing postgres
  try {
    const pg = await import('postgres')
    checks.postgres_import = 'OK - type: ' + typeof pg.default
  } catch (e) {
    checks.postgres_import = 'FAILED: ' + (e instanceof Error ? e.message : String(e))
  }

  // Try importing drizzle
  try {
    const drizzle = await import('drizzle-orm/postgres-js')
    checks.drizzle_import = 'OK - type: ' + typeof drizzle.drizzle
  } catch (e) {
    checks.drizzle_import = 'FAILED: ' + (e instanceof Error ? e.message : String(e))
  }

  // Try importing local _db
  try {
    const db = await import('./_db/index.js')
    checks.db_import = 'OK - type: ' + typeof db.getDb
  } catch (e) {
    checks.db_import = 'FAILED: ' + (e instanceof Error ? e.message : String(e))
  }

  // Try connecting to db
  try {
    const { getDb } = await import('./_db/index.js')
    const { conversations } = await import('./_db/schema.js')
    const db = getDb()
    const result = await db.select().from(conversations).limit(1)
    checks.db_query = 'OK - got ' + result.length + ' rows'
  } catch (e) {
    checks.db_query = 'FAILED: ' + (e instanceof Error ? e.message : String(e))
  }

  res.json(checks)
}
