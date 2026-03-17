"use client"

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

// Track if mermaid has been initialized
let mermaidInitialized = false

function initMermaid() {
  if (mermaidInitialized) return
  mermaidInitialized = true

  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    themeVariables: {
      primaryColor: '#6366f1',
      primaryTextColor: '#f4f4f5',
      primaryBorderColor: '#4f46e5',
      lineColor: '#71717a',
      secondaryColor: '#27272a',
      tertiaryColor: '#18181b',
      background: '#09090b',
      mainBkg: '#18181b',
      secondBkg: '#27272a',
      border1: '#3f3f46',
      border2: '#52525b',
      arrowheadColor: '#a1a1aa',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '14px',
      textColor: '#e4e4e7',
      nodeTextColor: '#f4f4f5',
    },
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
      padding: 15,
      nodeSpacing: 50,
      rankSpacing: 50,
    },
  })
}

export function MermaidNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(node.attrs.chart)
  const renderAttemptRef = useRef(0)

  const chart = node.attrs.chart as string

  // Helper to get helpful error message
  const getErrorHelp = (errMessage: string): string => {
    const lowerMsg = errMessage.toLowerCase();
    
    if (lowerMsg.includes('syntax') || lowerMsg.includes('parse')) {
      return 'Check for: missing quotes, unmatched brackets, or invalid characters in node labels.';
    }
    if (lowerMsg.includes('node') && lowerMsg.includes('undefined')) {
      return 'Make sure all referenced nodes are defined. Check for typos in node IDs.';
    }
    if (lowerMsg.includes('edge') || lowerMsg.includes('arrow')) {
      return 'Check arrow syntax. Use --> for arrows, --- for lines.';
    }
    if (lowerMsg.includes('label')) {
      return 'Labels with special characters should be in quotes: [Label with "quotes"].';
    }
    if (lowerMsg.includes('subgraph')) {
      return 'Make sure subgraphs are properly closed with "end".';
    }
    if (lowerMsg.includes('class')) {
      return 'Check class definitions. Class names should match node names.';
    }
    
    return 'Click "Edit" to fix the diagram syntax.';
  };

  useEffect(() => {
    initMermaid()

    const currentAttempt = ++renderAttemptRef.current

    const renderChart = async () => {
      const trimmedChart = chart.trim()

      if (!trimmedChart) {
        setIsLoading(false)
        setError('No chart content provided. Click "Edit" to add your diagram.')
        return
      }

      // Basic validation - check if chart starts with a valid mermaid diagram type
      const validDiagramTypes = [
        'flowchart', 'graph', 'sequenceDiagram', 'classDiagram',
        'stateDiagram', 'erDiagram', 'gantt', 'pie', 'journey',
        'gitGraph', 'mindmap', 'timeline', 'quadrantChart',
        'requirementDiagram', 'C4Context', 'sankey', 'xychart'
      ]

      const firstWord = trimmedChart.split(/[\s\n]/)[0].toLowerCase()
      const isValidStart = validDiagramTypes.some(type =>
        firstWord === type.toLowerCase() || firstWord.startsWith(type.toLowerCase())
      )

      if (!isValidStart) {
        setIsLoading(false)
        setError(`Invalid diagram type "${firstWord}". Use: flowchart, graph, sequenceDiagram, classDiagram, etc.`)
        return
      }

      setIsLoading(true)
      setError(null)

      // Pre-validate common syntax issues
      const lines = trimmedChart.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip comments and directives
        if (line.startsWith('%%') || line.startsWith('%%{') || line.startsWith('{')) continue;
        
        // Skip lines that are just arrows or node definitions
        if (line.match(/^-->-?/) || line.match(/^A\[/) || line.match(/^A\(/) || line.match(/^A{/)) continue;
      }

      try {
        // Try rendering with a unique ID
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const { svg: renderedSvg } = await mermaid.render(id, trimmedChart)

        if (currentAttempt === renderAttemptRef.current) {
          setSvg(renderedSvg)
          setIsLoading(false)
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err)
        if (currentAttempt === renderAttemptRef.current) {
          const errMsg = err instanceof Error ? err.message : 'Failed to render chart';
          const helpText = getErrorHelp(errMsg);
          setError(`${errMsg}\n\n${helpText}`);
          setIsLoading(false)
        }
      }
    }

    const timer = setTimeout(renderChart, 100)
    return () => clearTimeout(timer)
  }, [chart])

  const handleSave = () => {
    updateAttributes({ chart: editValue })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(chart)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <NodeViewWrapper className="mermaid-node">
        <div
          className={`relative rounded-xl overflow-hidden border ${
            selected ? 'border-indigo-500' : 'border-white/10'
          }`}
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-300">Edit Mermaid Diagram</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 text-xs rounded-lg bg-indigo-500/80 hover:bg-indigo-500 text-white transition-all"
              >
                Save
              </button>
            </div>
          </div>
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full h-48 p-4 bg-transparent text-zinc-200 text-sm font-mono resize-none focus:outline-none"
            placeholder="Enter Mermaid diagram code..."
          />
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper className="mermaid-node">
      <div
        ref={containerRef}
        className={`relative rounded-xl overflow-hidden border transition-all ${
          selected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-white/10'
        }`}
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <FlowchartIcon className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-medium text-zinc-400">Mermaid Diagram</span>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="px-2 py-1 text-xs rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
          >
            Edit
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-zinc-400">
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                <span className="text-sm">Rendering chart...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 rounded-lg">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" x2="12" y1="8" y2="12" />
                  <line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
                <span className="font-medium">Chart Error</span>
              </div>
              <p className="text-sm text-zinc-400">{error}</p>
            </div>
          )}

          {!isLoading && !error && svg && (
            <div
              className="overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )}
        </div>
      </div>
    </NodeViewWrapper>
  )
}

const FlowchartIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="6" height="4" rx="1" strokeWidth={2} />
    <rect x="15" y="3" width="6" height="4" rx="1" strokeWidth={2} />
    <rect x="9" y="17" width="6" height="4" rx="1" strokeWidth={2} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7v3a2 2 0 002 2h8a2 2 0 002-2V7M12 12v5" />
  </svg>
)
