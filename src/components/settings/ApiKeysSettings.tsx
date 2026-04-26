"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"

const PROVIDERS = [
  { value: "openai", label: "OpenAI", placeholder: "sk-..." },
  { value: "anthropic", label: "Anthropic (Claude)", placeholder: "sk-ant-..." },
  { value: "gemini", label: "Google Gemini", placeholder: "AIza..." },
  { value: "groq", label: "Groq", placeholder: "gsk_..." },
  { value: "custom", label: "Custom / Self-Hosted", placeholder: "Your API key" },
] as const

interface StoredKey {
  id: string
  provider: string
  label: string
  baseUrl: string | null
  modelOverride: string | null
  isActive: boolean
  createdAt: string
}

export function ApiKeysSettings() {
  const [keys, setKeys] = useState<StoredKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [provider, setProvider] = useState<string>("openai")
  const [label, setLabel] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [modelOverride, setModelOverride] = useState("")
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    fetchKeys()
  }, [])

  async function fetchKeys() {
    setIsLoading(true)
    try {
      const res = await fetch("/api/user/api-keys")
      if (!res.ok) throw new Error("Failed to load keys")
      const data = await res.json()
      setKeys(data.keys || [])
    } catch {
      toast.error("Failed to load API keys")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    if (!label.trim() || !apiKey.trim()) {
      toast.error("Label and API key are required")
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          label: label.trim(),
          apiKey: apiKey.trim(),
          baseUrl: baseUrl.trim() || undefined,
          modelOverride: modelOverride.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to save key")
      }
      toast.success("API key saved securely")
      setShowForm(false)
      setLabel(""); setApiKey(""); setBaseUrl(""); setModelOverride(""); setProvider("openai")
      fetchKeys()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save key")
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleActive(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/user/api-keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      })
      if (!res.ok) throw new Error()
      setKeys(prev => prev.map(k => k.id === id ? { ...k, isActive: !current } : k))
    } catch {
      toast.error("Failed to update key")
    }
  }

  async function deleteKey(id: string) {
    if (!confirm("Delete this API key? This cannot be undone.")) return
    try {
      const res = await fetch(`/api/user/api-keys/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setKeys(prev => prev.filter(k => k.id !== id))
      toast.success("Key deleted")
    } catch {
      toast.error("Failed to delete key")
    }
  }

  const providerLabel = (p: string) => PROVIDERS.find(x => x.value === p)?.label ?? p

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">API Keys</h3>
          <p className="text-sm text-zinc-500 mt-0.5">
            Add your own keys for OpenAI, Gemini, Claude, Groq, or self-hosted models. Keys are encrypted and never shared.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3a1 1 0 011 1v3h3a1 1 0 010 2H9v3a1 1 0 01-2 0V9H4a1 1 0 010-2h3V4a1 1 0 011-1z"/>
          </svg>
          Add Model / Key
        </button>
      </div>

      {/* Security note */}
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        <svg className="h-4 w-4 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm.75 10.5h-1.5v-1.5h1.5v1.5zm0-3h-1.5V4.5h1.5V8.5z"/>
        </svg>
        Your keys are encrypted with AES-256-GCM before storage and are never sent to the browser in plaintext.
      </div>

      {/* Key list */}
      {isLoading ? (
        <div className="py-8 text-center text-zinc-400 text-sm">Loading...</div>
      ) : keys.length === 0 ? (
        <div className="py-8 text-center text-zinc-400 text-sm border border-dashed border-zinc-300 rounded-xl">
          No API keys saved yet. Add one to use your own model quota.
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden">
          {keys.map(k => (
            <div key={k.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-zinc-50">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-900 truncate">{k.label}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-500 shrink-0">{providerLabel(k.provider)}</span>
                  {k.isActive && <span className="text-xs px-1.5 py-0.5 rounded-md bg-green-100 text-green-700 shrink-0">Active</span>}
                </div>
                {k.baseUrl && <p className="text-xs text-zinc-400 mt-0.5 truncate">{k.baseUrl}</p>}
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <button
                  onClick={() => toggleActive(k.id, k.isActive)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${k.isActive ? "border-zinc-300 text-zinc-600 hover:bg-zinc-100" : "border-zinc-300 text-zinc-400 hover:bg-zinc-100"}`}
                >
                  {k.isActive ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => deleteKey(k.id)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Key Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-900">Add API Key</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4.293 4.293a1 1 0 011.414 0L8 6.586l2.293-2.293a1 1 0 111.414 1.414L9.414 8l2.293 2.293a1 1 0 01-1.414 1.414L8 9.414l-2.293 2.293a1 1 0 01-1.414-1.414L6.586 8 4.293 5.707a1 1 0 010-1.414z"/>
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Provider</label>
                <select
                  value={provider}
                  onChange={e => setProvider(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Label</label>
                <input
                  type="text"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="e.g. My OpenAI Key"
                  className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">API Key</label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={PROVIDERS.find(p => p.value === provider)?.placeholder ?? "Your API key"}
                    className="w-full px-3 py-2 pr-10 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                      {showKey
                        ? <path d="M8 3C4 3 1 8 1 8s3 5 7 5 7-5 7-5-3-5-7-5zm0 8a3 3 0 110-6 3 3 0 010 6z"/>
                        : <path d="M2 2l12 12M8 5a3 3 0 012.83 4M5.17 5.17A3 3 0 008 11a3 3 0 002.83-2M1 8s2-4 7-4M15 8s-2 4-7 4"/>
                      }
                    </svg>
                  </button>
                </div>
              </div>
              {provider === "custom" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Base URL <span className="text-zinc-400 font-normal">(e.g. http://localhost:11434/v1)</span></label>
                    <input
                      type="url"
                      value={baseUrl}
                      onChange={e => setBaseUrl(e.target.value)}
                      placeholder="https://your-endpoint.com/v1"
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Default Model <span className="text-zinc-400 font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={modelOverride}
                      onChange={e => setModelOverride(e.target.value)}
                      placeholder="e.g. mistral:7b"
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-zinc-100 flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !label.trim() || !apiKey.trim()}
                className="px-4 py-2 text-sm font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? "Saving..." : "Save Key"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
