import { Hono } from "hono"
import { checkDatabaseConnection } from "../db/index.js"

const app = new Hono()

app.get("/", async (c) => {
  const dbOk = await checkDatabaseConnection()
  return c.json({ status: "ok", timestamp: new Date().toISOString(), db: dbOk ? "connected" : "disconnected" })
})

export default app
