// Export utilities for converting HTML content to various formats

// Type declarations for html2pdf.js
declare const html2pdf: {
  (): {
    set: (options: Record<string, unknown>) => {
      from: (element: HTMLElement) => {
        save: (filename: string) => Promise<void>
      }
    }
  }
}

/**
 * Load html2pdf.js dynamically (client-side only)
 */
async function loadHtml2Pdf(): Promise<typeof html2pdf> {
  if (typeof window === "undefined") {
    throw new Error("html2pdf can only be used in the browser")
  }

  // Check if already loaded
  if ((window as Window & typeof globalThis & { html2pdf?: typeof html2pdf }).html2pdf) {
    return (window as Window & typeof globalThis & { html2pdf: typeof html2pdf }).html2pdf
  }

  // Dynamically import
  const html2pdfModule = await import("html2pdf.js")
  return html2pdfModule.default || html2pdfModule
}

/**
 * Export content as PDF
 */
export async function exportToPdf(htmlContent: string, filename: string): Promise<void> {
  const html2pdfLib = await loadHtml2Pdf()

  // Create a temporary container with proper styling
  const container = document.createElement("div")
  container.innerHTML = htmlContent
  container.style.cssText = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #1a1a1a;
    padding: 40px;
    max-width: 800px;
    margin: 0 auto;
  `

  // Style headings
  container.querySelectorAll("h1").forEach((el) => {
    (el as HTMLElement).style.cssText = "font-size: 28px; font-weight: 700; margin: 24px 0 12px;"
  })
  container.querySelectorAll("h2").forEach((el) => {
    (el as HTMLElement).style.cssText = "font-size: 22px; font-weight: 600; margin: 20px 0 10px;"
  })
  container.querySelectorAll("h3").forEach((el) => {
    (el as HTMLElement).style.cssText = "font-size: 18px; font-weight: 600; margin: 16px 0 8px;"
  })

  // Style code blocks
  container.querySelectorAll("pre").forEach((el) => {
    (el as HTMLElement).style.cssText = "background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; font-family: monospace; font-size: 13px;"
  })
  container.querySelectorAll("code").forEach((el) => {
    if ((el as HTMLElement).parentElement?.tagName !== "PRE") {
      (el as HTMLElement).style.cssText = "background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px;"
    }
  })

  // Style blockquotes
  container.querySelectorAll("blockquote").forEach((el) => {
    (el as HTMLElement).style.cssText = "border-left: 4px solid #e0e0e0; padding-left: 16px; margin: 16px 0; color: #666;"
  })

  // Style lists
  container.querySelectorAll("ul, ol").forEach((el) => {
    (el as HTMLElement).style.cssText = "margin: 12px 0; padding-left: 24px;"
  })

  // Style task lists
  container.querySelectorAll('input[type="checkbox"]').forEach((el) => {
    (el as HTMLInputElement).style.cssText = "margin-right: 8px;"
  })

  // Style horizontal rules
  container.querySelectorAll("hr").forEach((el) => {
    (el as HTMLElement).style.cssText = "border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;"
  })

  document.body.appendChild(container)

  const options = {
    margin: [10, 10, 10, 10],
    filename: `${filename}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    },
  }

  try {
    await html2pdfLib().set(options).from(container).save(filename)
  } finally {
    document.body.removeChild(container)
  }
}

/**
 * Convert HTML content to Markdown
 */
export function htmlToMarkdown(html: string): string {
  const tempDiv = document.createElement("div")
  tempDiv.innerHTML = html

  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || ""
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return ""
    }

    const element = node as HTMLElement
    const tagName = element.tagName.toLowerCase()
    const children = Array.from(element.childNodes).map(processNode).join("")

    switch (tagName) {
      case "h1":
        return `# ${children}\n\n`
      case "h2":
        return `## ${children}\n\n`
      case "h3":
        return `### ${children}\n\n`
      case "h4":
        return `#### ${children}\n\n`
      case "h5":
        return `##### ${children}\n\n`
      case "h6":
        return `###### ${children}\n\n`
      case "p":
        return `${children}\n\n`
      case "br":
        return "\n"
      case "strong":
      case "b":
        return `**${children}**`
      case "em":
      case "i":
        return `*${children}*`
      case "s":
      case "del":
      case "strike":
        return `~~${children}~~`
      case "u":
        return `<u>${children}</u>`
      case "code":
        if (element.parentElement?.tagName.toLowerCase() === "pre") {
          return children
        }
        return `\`${children}\``
      case "pre":
        const lang = element.querySelector("code")?.className.match(/language-(\w+)/)?.[1] || ""
        return `\`\`\`${lang}\n${children}\n\`\`\`\n\n`
      case "blockquote":
        return children
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n") + "\n\n"
      case "ul":
        return children + "\n"
      case "ol":
        return children + "\n"
      case "li":
        const parent = element.parentElement
        const isOrdered = parent?.tagName.toLowerCase() === "ol"
        const prefix = isOrdered
          ? `${Array.from(parent!.children).indexOf(element) + 1}. `
          : "- "
        const checkbox = element.querySelector('input[type="checkbox"]')
        if (checkbox) {
          const checked = (checkbox as HTMLInputElement).checked
          return `- [${checked ? "x" : " "}] ${children.replace(/^\s*\[\s*[xX ]?\s*\]\s*/, "").trim()}\n`
        }
        return `${prefix}${children.trim()}\n`
      case "a":
        const href = element.getAttribute("href") || ""
        return `[${children}](${href})`
      case "img":
        const src = element.getAttribute("src") || ""
        const alt = element.getAttribute("alt") || ""
        return `![${alt}](${src})`
      case "hr":
        return "---\n\n"
      case "mark":
        return `==${children}==`
      case "sup":
        return `^${children}^`
      case "sub":
        return `~${children}~`
      case "table":
        return processTable(element)
      default:
        return children
    }
  }

  function processTable(table: HTMLElement): string {
    const rows = Array.from(table.querySelectorAll("tr"))
    if (rows.length === 0) return ""

    let result = ""
    rows.forEach((row, rowIndex) => {
      const cells = Array.from(row.querySelectorAll("th, td"))
      const cellContents = cells.map((cell) => processNode(cell).trim())
      result += `| ${cellContents.join(" | ")} |\n`

      if (rowIndex === 0) {
        result += `| ${cells.map(() => "---").join(" | ")} |\n`
      }
    })

    return result + "\n"
  }

  return processNode(tempDiv).trim()
}

/**
 * Export content as Markdown file
 */
export function exportToMarkdown(htmlContent: string, filename: string): void {
  const markdown = htmlToMarkdown(htmlContent)
  downloadFile(markdown, `${filename}.md`, "text/markdown")
}

/**
 * Export content as plain text
 */
export function exportToText(htmlContent: string, filename: string): void {
  const tempDiv = document.createElement("div")
  tempDiv.innerHTML = htmlContent
  const text = tempDiv.textContent || tempDiv.innerText || ""
  downloadFile(text, `${filename}.txt`, "text/plain")
}

/**
 * Export content as HTML file
 */
export function exportToHtml(htmlContent: string, filename: string): void {
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${filename}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
      line-height: 1.6;
      color: #1a1a1a;
    }
    h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
    pre { background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #ddd; padding-left: 16px; margin-left: 0; color: #666; }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`

  downloadFile(fullHtml, `${filename}.html`, "text/html")
}

/**
 * Helper function to download a file
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
