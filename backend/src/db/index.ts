import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { config } from "dotenv"
import path from "node:path"
import * as schema from "./schema.js"

// Load envs regardless of whether backend is run from repo root or backend/
config({ path: path.resolve(process.cwd(), ".env") })
config({ path: path.resolve(process.cwd(), "backend/.env"), override: true })

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error("DATABASE_URL is not set")

const client = postgres(connectionString, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
  prepare: false,
})

export const db = drizzle(client, { schema })
export * from "./schema.js"

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`
    return true
  } catch {
    return false
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  await client.end()
}
