import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

// Connection string from environment
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error(`
╔════════════════════════════════════════════════════════════════════╗
║                    DATABASE_URL NOT CONFIGURED                      ║
╠════════════════════════════════════════════════════════════════════╣
║ To connect to your Supabase database:                              ║
║                                                                     ║
║ 1. Go to Supabase Dashboard → Your Project                         ║
║ 2. Click Settings (gear icon) → Database                           ║
║ 3. Scroll to "Connection string" section                           ║
║ 4. Copy the URI and add it to your .env file:                      ║
║                                                                     ║
║ DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
╚════════════════════════════════════════════════════════════════════╝
  `)
  throw new Error("DATABASE_URL environment variable is not set. See console for instructions.")
}

// Create postgres connection with connection pooling
const client = postgres(connectionString, {
  max: 20, // Maximum pool size
  idle_timeout: 30, // Idle connection timeout in seconds
  connect_timeout: 10, // Connection timeout in seconds
  prepare: false, // Disable prepared statements for Supabase compatibility
})

// Create Drizzle instance with schema
export const db = drizzle(client, { schema })

// Export schema for convenience
export * from "./schema"

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`
    console.log("Database connection successful")
    return true
  } catch (error) {
    console.error("Database connection failed:", error)
    return false
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  await client.end()
}
