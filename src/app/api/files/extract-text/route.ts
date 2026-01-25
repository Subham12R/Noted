import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-utils"

export const runtime = "nodejs"
export const maxDuration = 60

// Sanitize extracted text - remove garbled characters and clean up
function sanitizeText(text: string): string {
  return text
    // Remove CJK characters that are likely garbled (not intentional Chinese/Japanese/Korean)
    .replace(/[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g, "")
    // Remove other common garbled Unicode ranges
    .replace(/[\uE000-\uF8FF]/g, "") // Private Use Area
    .replace(/[\u2000-\u200F]/g, " ") // Various spaces and formatting
    // Normalize whitespace
    .replace(/\s+/g, " ")
    // Remove excessive newlines
    .replace(/\n{3,}/g, "\n\n")
    // Trim each line
    .split("\n")
    .map(line => line.trim())
    .join("\n")
    .trim()
}

// Parse PDF using pdfjs-dist legacy build for Node.js
async function parsePDF(buffer: Buffer): Promise<{ text: string; numpages: number; info: unknown }> {
  // Use legacy build for Node.js compatibility
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs")

  // Set up fake worker for Node.js - convert to file URL for cross-platform support
  if (typeof window === "undefined") {
    const path = await import("path")
    const { pathToFileURL } = await import("url")
    const workerPath = path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")
    pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href
  }

  const uint8Array = new Uint8Array(buffer)
  const pdf = await pdfjsLib.getDocument({
    data: uint8Array,
    useSystemFonts: true,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise

  const numPages = pdf.numPages
  let fullText = ""

  // Extract text from each page
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item: unknown) => (item as { str?: string }).str || "")
      .join(" ")
    fullText += pageText + "\n\n"
  }

  const metadata = await pdf.getMetadata().catch(() => null)

  return {
    text: fullText.trim(),
    numpages: numPages,
    info: metadata?.info || {},
  }
}

// POST /api/files/extract-text - Extract text from a PDF
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let buffer: Buffer

    // Check if this is a FormData request (file upload)
    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await request.formData()
      const file = formData.get("file") as File | null

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 })
      }

      if (file.type !== "application/pdf") {
        return NextResponse.json({ error: "File is not a PDF" }, { status: 400 })
      }

      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } else {
      // Handle JSON request (URL or fileId)
      const body = await request.json()
      const { url, fileId, base64 } = body

      // If base64 data is provided directly
      if (base64) {
        buffer = Buffer.from(base64, "base64")
      }
      // If fileId is provided, fetch the file URL from database
      else if (fileId) {
        const { db, files } = await import("@/db")
        const { eq, and } = await import("drizzle-orm")

        const [file] = await db
          .select()
          .from(files)
          .where(and(eq(files.id, fileId), eq(files.userId, session.user.id)))

        if (!file) {
          return NextResponse.json({ error: "File not found" }, { status: 404 })
        }

        if (!file.mimeType.includes("pdf")) {
          return NextResponse.json({ error: "File is not a PDF" }, { status: 400 })
        }

        // Fetch the PDF from storage URL
        const response = await fetch(file.url)
        if (!response.ok) {
          return NextResponse.json({ error: "Failed to fetch PDF from storage" }, { status: 400 })
        }

        const arrayBuffer = await response.arrayBuffer()
        buffer = Buffer.from(arrayBuffer)
      }
      // If URL is provided (must be a real HTTP URL, not blob)
      else if (url) {
        // Check if it's a data URL
        if (url.startsWith("data:application/pdf;base64,")) {
          const base64Data = url.replace("data:application/pdf;base64,", "")
          buffer = Buffer.from(base64Data, "base64")
        }
        // Skip blob URLs - they can't be fetched server-side
        else if (url.startsWith("blob:")) {
          return NextResponse.json(
            { error: "Blob URLs cannot be processed server-side. Please upload the file directly." },
            { status: 400 }
          )
        }
        // Regular HTTP URL
        else {
          const response = await fetch(url)
          if (!response.ok) {
            return NextResponse.json({ error: "Failed to fetch PDF" }, { status: 400 })
          }

          const arrayBuffer = await response.arrayBuffer()
          buffer = Buffer.from(arrayBuffer)
        }
      } else {
        return NextResponse.json(
          { error: "Either file, url, fileId, or base64 is required" },
          { status: 400 }
        )
      }
    }

    // Parse the PDF
    const data = await parsePDF(buffer)

    // Extract metadata
    const metadata = {
      pages: data.numpages,
      info: data.info,
    }

    // Clean up and sanitize the text
    let text = sanitizeText(data.text)

    // Limit text length for AI context
    const maxLength = 50000 // ~12,500 tokens
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + "\n\n[... Content truncated due to length ...]"
    }

    return NextResponse.json({
      success: true,
      text,
      metadata,
      charCount: text.length,
      estimatedTokens: Math.ceil(text.length / 4),
    })
  } catch (error) {
    console.error("PDF text extraction error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extract text from PDF" },
      { status: 500 }
    )
  }
}
