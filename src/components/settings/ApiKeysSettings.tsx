"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"

const PROVIDERS = [
  { value: "openai",    label: "OpenAI",              placeholder: "sk-..." },
  { value: "anthropic", label: "Anthropic (Claude)",  placeholder: "sk-ant-..." },
  { value: "groq",      label: "Groq",                placeholder: "gsk_..." },
  { value: "minimax",   label: "MiniMax",             placeholder: "eyJ..." },
  { value: "nvidia",    label: "NVIDIA NIM",          placeholder: "nvapi-..." },
  { value: "gemini",    label: "Google Gemini",       placeholder: "AIza..." },
  { value: "custom",    label: "Custom / Self-Hosted", placeholder: "Your API key" },
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

  useEffect(() => { fetchKeys() }, [])

  async function fetchKeys() {
    setIsLoading(true)
    try {
      const res = await fetch("/api/user/api-keys")
      if (!res.ok) throw new Error()
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
      window.dispatchEvent(new CustomEvent("userApiKeysUpdated"))
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
      window.dispatchEvent(new CustomEvent("userApiKeysUpdated"))
    } catch {
      toast.error("Failed to delete key")
    }
  }

  const providerLabel = (p: string) => PROVIDERS.find(x => x.value === p)?.label ?? p

  const inputCls = "w-full px-3 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors"

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-white">API Keys</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Add your own keys for OpenAI, Gemini, Claude, Groq, or self-hosted models. Keys are encrypted and never shared.
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3a1 1 0 011 1v3h3a1 1 0 010 2H9v3a1 1 0 01-2 0V9H4a1 1 0 010-2h3V4a1 1 0 011-1z"/>
          </svg>
          Add Model / Key
        </button>
      </div>

      {/* Key list */}
      {isLoading ? (
        <div className="py-8 text-center text-zinc-400 dark:text-zinc-500 text-sm">Loading...</div>
      ) : keys.length === 0 ? (
        <div className="py-8 text-center text-zinc-400 dark:text-zinc-500 text-sm border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl">
          No API keys saved yet. Add one to use your own model quota.
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
          {keys.map(k => (
            <div key={k.id} className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-zinc-900 dark:text-white truncate">{k.label}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shrink-0">{providerLabel(k.provider)}</span>
                  {k.isActive && <span className="text-xs px-1.5 py-0.5 rounded-md bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 shrink-0">Active</span>}
                </div>
                {k.baseUrl && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">{k.baseUrl}</p>}
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <button
                  onClick={() => toggleActive(k.id, k.isActive)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  {k.isActive ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => deleteKey(k.id)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-500/30 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Add API Key</h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-500 transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4.293 4.293a1 1 0 011.414 0L8 6.586l2.293-2.293a1 1 0 111.414 1.414L9.414 8l2.293 2.293a1 1 0 01-1.414 1.414L8 9.414l-2.293 2.293a1 1 0 01-1.414-1.414L6.586 8 4.293 5.707a1 1 0 010-1.414z"/>
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Provider</label>
                <select
                  value={provider}
                  onChange={e => setProvider(e.target.value)}
                  className={inputCls}
                >
                  {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Label</label>
                <input
                  type="text"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="e.g. My OpenAI Key"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">API Key</label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={PROVIDERS.find(p => p.value === provider)?.placeholder ?? "Your API key"}
                    className={`${inputCls} pr-10 font-mono`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      {showKey
                        ? <><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></>
                        : <><path d="M2 2l12 12M6.5 6.6A3 3 0 0011 11M5 5a7 7 0 00-4 3s2.5 5 7 5a7 7 0 003.5-1M1 8s2-4 7-4"/></>
                      }
                    </svg>
                  </button>
                </div>
              </div>
              {provider === "nvidia" && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Model <span className="text-zinc-400 dark:text-zinc-500 font-normal">(optional, defaults to Llama 3.1 70B)</span>
                  </label>
                  <select
                    value={modelOverride}
                    onChange={e => setModelOverride(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">meta/llama-3.1-70b-instruct (default)</option>
                    <option value="moonshotai/kimi-k2-thinking">Kimi K2 Thinking (MoonshotAI)</option>
                    <option value="meta/llama-3.1-405b-instruct">Llama 3.1 405B</option>
                    <option value="meta/llama-3.1-70b-instruct">Llama 3.1 70B</option>
                    <option value="meta/llama-3.1-8b-instruct">Llama 3.1 8B</option>
                    <option value="nvidia/llama-3.1-nemotron-70b-instruct">Nemotron 70B</option>
                    <option value="mistralai/mixtral-8x22b-instruct-v0.1">Mixtral 8x22B</option>
                    <option value="microsoft/phi-3-medium-128k-instruct">Phi-3 Medium 128K</option>
                    <option value="google/gemma-2-27b-it">Gemma 2 27B</option>
                  </select>
                </div>
              )}
              {provider === "minimax" && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Model <span className="text-zinc-400 dark:text-zinc-500 font-normal">(optional, defaults to MiniMax-M2.5)</span>
                  </label>
                  <select
                    value={modelOverride}
                    onChange={e => setModelOverride(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">MiniMax-M2.5 (default)</option>
                    <option value="MiniMax-M2.7">MiniMax-M2.7 — ~60 tps</option>
                    <option value="MiniMax-M2.7-highspeed">MiniMax-M2.7 Highspeed — ~100 tps</option>
                    <option value="MiniMax-M2.5">MiniMax-M2.5 — ~60 tps</option>
                    <option value="MiniMax-M2.5-highspeed">MiniMax-M2.5 Highspeed — ~100 tps</option>
                    <option value="MiniMax-M2.1">MiniMax-M2.1 — ~60 tps</option>
                    <option value="MiniMax-M2.1-highspeed">MiniMax-M2.1 Highspeed — ~100 tps</option>
                    <option value="MiniMax-M2">MiniMax-M2 — Agentic + reasoning</option>
                  </select>
                </div>
              )}
              {provider === "custom" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Base URL <span className="text-zinc-400 dark:text-zinc-500 font-normal">(e.g. http://localhost:11434/v1)</span>
                    </label>
                    <input
                      type="url"
                      value={baseUrl}
                      onChange={e => setBaseUrl(e.target.value)}
                      placeholder="https://your-endpoint.com/v1"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Default Model <span className="text-zinc-400 dark:text-zinc-500 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={modelOverride}
                      onChange={e => setModelOverride(e.target.value)}
                      placeholder="e.g. mistral:7b"
                      className={inputCls}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !label.trim() || !apiKey.trim()}
                className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
