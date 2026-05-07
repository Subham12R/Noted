import { auth } from "./auth.js"

export async function getServerSession(req: Request) {
  return auth.api.getSession({ headers: req.headers })
}

export async function requireAuth(req: Request) {
  const session = await getServerSession(req)
  if (!session?.user) throw new Error("Unauthorized")
  return session
}
