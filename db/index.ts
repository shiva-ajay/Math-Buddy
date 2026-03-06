import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

let client: ReturnType<typeof postgres> | null = null

function getClient() {
  if (!client) {
    if (!process.env.DATA_BASE) {
      throw new Error('DATA_BASE environment variable is not set')
    }
    client = postgres(process.env.DATA_BASE, {
      ssl: 'require',
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
    })
  }
  return client
}

export function getDb() {
  return drizzle(getClient(), { schema })
}
