"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

// Track if mermaid has been initialized
let mermaidInitialized = false;

function initMermaid() {
  if (mermaidInitialized) return;
  mermaidInitialized = true;

  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "loose",
    themeVariables: {
      primaryColor: "#6366f1",
      primaryTextColor: "#f4f4f5",
      primaryBorderColor: "#4f46e5",
      lineColor: "#71717a",
      secondaryColor: "#27272a",
      tertiaryColor: "#18181b",
      background: "#09090b",
      mainBkg: "#18181b",
      secondBkg: "#27272a",
      border1: "#3f3f46",
      border2: "#52525b",
      arrowheadColor: "#a1a1aa",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      fontSize: "14px",
      textColor: "#e4e4e7",
      nodeTextColor: "#f4f4f5",
    },
    flowchart: {
      htmlLabels: true,
      curve: "basis",
      padding: 15,
      nodeSpacing: 50,
      rankSpacing: 50,
    },
  });
}

interface MermaidChartProps {
  chart: string;
  className?: string;
}

export function MermaidChart({ chart, className = "" }: MermaidChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const renderAttemptRef = useRef(0);

  useEffect(() => {
    // Initialize mermaid on first render
    initMermaid();

    const currentAttempt = ++renderAttemptRef.current;

    const renderChart = async () => {
      const trimmedChart = chart.trim();

      if (!trimmedChart) {
        setIsLoading(false);
        setError("No chart content provided");
        return;
      }

      // Basic validation - check if chart starts with a valid mermaid diagram type
      const validDiagramTypes = [
        'flowchart', 'graph', 'sequenceDiagram', 'classDiagram',
        'stateDiagram', 'erDiagram', 'gantt', 'pie', 'journey',
        'gitGraph', 'mindmap', 'timeline', 'quadrantChart',
        'requirementDiagram', 'C4Context', 'sankey', 'xychart'
      ];

      const firstWord = trimmedChart.split(/[\s\n]/)[0].toLowerCase();
      const isValidStart = validDiagramTypes.some(type =>
        firstWord === type.toLowerCase() || firstWord.startsWith(type.toLowerCase())
      );

      if (!isValidStart) {
        setIsLoading(false);
        // Don't show error UI for clearly non-mermaid content - just return null
        setError(null);
        setSvg("");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Generate unique ID for this chart
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Render the chart
        const { svg: renderedSvg } = await mermaid.render(id, trimmedChart);

        // Only update if this is still the current render attempt
        if (currentAttempt === renderAttemptRef.current) {
          setSvg(renderedSvg);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        if (currentAttempt === renderAttemptRef.current) {
          setError(err instanceof Error ? err.message : "Failed to render chart");
          setIsLoading(false);
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(renderChart, 50);
    return () => clearTimeout(timer);
  }, [chart]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="flex items-center gap-2 text-zinc-400">
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <span className="text-sm">Rendering chart...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-500/10 border border-red-500/20 rounded-xl ${className}`}>
        <div className="flex items-center gap-2 text-red-400 mb-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          <span className="font-medium">Chart Error</span>
        </div>
        <p className="text-sm text-zinc-400">{error}</p>
        <pre className="mt-2 p-2 bg-zinc-900/50 rounded text-xs text-zinc-500 overflow-x-auto">
          {chart}
        </pre>
      </div>
    );
  }

  // If no SVG rendered (invalid content that was filtered out), return null
  if (!svg) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`mermaid-container overflow-x-auto ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{
        background: "rgba(255, 255, 255, 0.02)",
        borderRadius: "0.75rem",
        padding: "1rem",
        border: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    />
  );
}

// Helper function to extract mermaid code blocks from markdown
export function extractMermaidBlocks(content: string): { type: "text" | "mermaid"; content: string }[] {
  const blocks: { type: "text" | "mermaid"; content: string }[] = [];
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match;

  while ((match = mermaidRegex.exec(content)) !== null) {
    // Add text before mermaid block
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index).trim();
      if (textContent) {
        blocks.push({ type: "text", content: textContent });
      }
    }

    // Add mermaid block
    blocks.push({ type: "mermaid", content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex).trim();
    if (textContent) {
      blocks.push({ type: "text", content: textContent });
    }
  }

  return blocks.length > 0 ? blocks : [{ type: "text", content }];
}
