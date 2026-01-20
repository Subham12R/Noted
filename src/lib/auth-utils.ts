import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export async function getServerSession() {
  const headersList = await headers()
  const session = await auth.api.getSession({
    headers: headersList,
  })
  return session
}

export async function requireAuth() {
  const session = await getServerSession()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }
  return session
}
