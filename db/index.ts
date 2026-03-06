import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema'

const { Pool } = pg

let pool: pg.Pool | null = null

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATA_BASE,
      ssl: { rejectUnauthorized: false },
      max: 5,
    })
  }
  return pool
}

export function getDb() {
  return drizzle(getPool(), { schema })
}
