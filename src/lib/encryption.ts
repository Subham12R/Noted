import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getKey(): Buffer {
  const raw = process.env.NODE_ENCRYPTION_KEY
  if (!raw) throw new Error("NODE_ENCRYPTION_KEY is not set")
  const key = Buffer.from(raw, "hex")
  if (key.length !== 32) throw new Error("NODE_ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars)")
  return key
}

export function encryptApiKey(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  // Format: iv:authTag:ciphertext (all hex)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`
}

export function decryptApiKey(ciphertext: string): string {
  const key = getKey()
  const parts = ciphertext.split(":")
  if (parts.length !== 3) throw new Error("Invalid encrypted key format")
  const [ivHex, authTagHex, encryptedHex] = parts
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")
  const encrypted = Buffer.from(encryptedHex, "hex")
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8")
}

export function maskApiKey(plaintext: string): string {
  if (plaintext.length <= 8) return "****"
  return `${plaintext.slice(0, 4)}****${plaintext.slice(-4)}`
}
