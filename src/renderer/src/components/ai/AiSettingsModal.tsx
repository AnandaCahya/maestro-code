import React, { useState } from 'react'
import {
  X,
  Sparkles,
  Key,
  Shield,
  Cpu,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  Plus,
  ExternalLink,
  Sliders,
  CheckCircle2
} from 'lucide-react'
import { useAiStore } from '../../store/useAiStore'
import type { AiProviderConfig } from '../../../preload/index.d'

interface AiSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AiSettingsModal: React.FC<AiSettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    providers,
    models,
    credentialSummaries,
    privacySettings,
    selectedProviderId,
    selectedModelId,
    selectProvider,
    selectModel,
    saveCredential,
    deleteCredential,
    testConnection,
    updatePrivacy,
    clearAllHistory
  } = useAiStore()

  const [activeTab, setActiveTab] = useState<'providers' | 'models' | 'privacy'>('providers')
  const [editingProviderId, setEditingProviderId] = useState<string>('openai')
  const [apiKeyInput, setApiKeyInput] = useState<string>('')
  const [showApiKey, setShowApiKey] = useState<boolean>(false)
  const [isTesting, setIsTesting] = useState<boolean>(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [customBaseUrl, setCustomBaseUrl] = useState<string>('')
  const [newExclusionPattern, setNewExclusionPattern] = useState<string>('')

  if (!isOpen) return null

  const activeProvider = providers.find((p) => p.id === editingProviderId) || providers[0]
  const currentCred = credentialSummaries.find((c) => c.providerId === editingProviderId)

  const handleTestConnection = async () => {
    if (!activeProvider) return
    setIsTesting(true)
    setTestResult(null)
    const res = await testConnection(activeProvider.id, apiKeyInput || undefined)
    setIsTesting(false)
    setTestResult({
      ok: res.ok,
      message: res.message || (res.ok ? 'Connection successful!' : 'Connection failed')
    })
  }

  const handleSaveKey = async () => {
    if (!activeProvider) return
    if (apiKeyInput.trim()) {
      await saveCredential(activeProvider.id, apiKeyInput.trim())
      setApiKeyInput('')
      setTestResult({ ok: true, message: 'API key saved securely.' })
    }
  }

  const handleDeleteKey = async () => {
    if (!activeProvider) return
    await deleteCredential(activeProvider.id)
    setApiKeyInput('')
    setTestResult({ ok: true, message: 'API key removed.' })
  }

  const handleAddExclusion = async () => {
    if (!newExclusionPattern.trim()) return
    const updated = [...privacySettings.excludedPatterns, newExclusionPattern.trim()]
    await updatePrivacy({ excludedPatterns: updated })
    setNewExclusionPattern('')
  }

  const handleRemoveExclusion = async (pattern: string) => {
    const updated = privacySettings.excludedPatterns.filter((p) => p !== pattern)
    await updatePrivacy({ excludedPatterns: updated })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-studio-card border border-studio-border rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-studio-border bg-studio-surface/50">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-studio-accent/15 text-studio-accent border border-studio-accent/30 shadow-glow-accent">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-studio-text">AI Configuration & Privacy</h2>
              <p className="text-[11px] text-studio-muted">Manage provider keys, model selection, and data boundaries</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-studio-muted hover:text-studio-text hover:bg-studio-surface transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-studio-border px-5 bg-studio-bg/60">
          <button
            onClick={() => setActiveTab('providers')}
            className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'providers'
                ? 'border-studio-accent text-studio-accent'
                : 'border-transparent text-studio-muted hover:text-studio-text'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Providers & Keys</span>
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'models'
                ? 'border-studio-accent text-studio-accent'
                : 'border-transparent text-studio-muted hover:text-studio-text'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Model Registry</span>
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'privacy'
                ? 'border-studio-accent text-studio-accent'
                : 'border-transparent text-studio-muted hover:text-studio-text'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Privacy & Safety</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-studio-text space-y-4">
          {activeTab === 'providers' && (
            <div className="space-y-4">
              {/* Provider Selector Pills */}
              <div className="flex flex-wrap gap-2">
                {providers.map((p) => {
                  const cred = credentialSummaries.find((c) => c.providerId === p.id)
                  const isSelected = p.id === editingProviderId
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setEditingProviderId(p.id)
                        setTestResult(null)
                        setApiKeyInput('')
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-studio-accent/15 border-studio-accent text-studio-accent shadow-sm'
                          : 'bg-studio-surface border-studio-border text-studio-muted hover:text-studio-text'
                      }`}
                    >
                      <span>{p.name}</span>
                      {p.isLocal ? (
                        <span className="text-[10px] px-1 py-0.2 bg-studio-cyan/20 text-studio-cyan rounded">Local</span>
                      ) : cred?.hasKey ? (
                        <span className="w-2 h-2 rounded-full bg-studio-emerald" title="Key configured" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-studio-rose/60" title="No key configured" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Selected Provider Details */}
              {activeProvider && (
                <div className="p-4 rounded-lg bg-studio-surface/50 border border-studio-border/70 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-studio-text text-sm">{activeProvider.name}</h3>
                      <p className="text-[11px] text-studio-muted">
                        Endpoint: <code className="text-studio-accent/90">{activeProvider.baseUrl || 'Official API'}</code>
                      </p>
                    </div>
                    {currentCred?.hasKey && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded bg-studio-emerald/10 border border-studio-emerald/30 text-studio-emerald text-[11px]">
                        <Check className="w-3 h-3" />
                        <span>Key Configured ({currentCred.maskedKey})</span>
                      </div>
                    )}
                  </div>

                  {!activeProvider.isLocal && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-studio-muted">
                        {currentCred?.hasKey ? 'Replace API Key' : 'Enter API Key'}
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showApiKey ? 'text' : 'password'}
                            value={apiKeyInput}
                            onChange={(e) => setApiKeyInput(e.target.value)}
                            placeholder={currentCred?.hasKey ? currentCred.maskedKey : 'sk-...'}
                            className="w-full bg-studio-bg border border-studio-border rounded-md px-3 py-1.5 text-xs text-studio-text focus:outline-none focus:border-studio-accent pr-8 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-2 top-2 text-studio-muted hover:text-studio-text cursor-pointer"
                          >
                            {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <button
                          onClick={handleSaveKey}
                          disabled={!apiKeyInput.trim()}
                          className="px-3 py-1.5 rounded-md bg-studio-accent text-studio-bg font-medium hover:bg-studio-accentHover disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          Save
                        </button>
                        {currentCred?.hasKey && (
                          <button
                            onClick={handleDeleteKey}
                            title="Remove key"
                            className="p-1.5 rounded-md border border-studio-border text-studio-muted hover:text-studio-rose hover:border-studio-rose/50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Test Connection Button & Result */}
                  <div className="pt-2 flex items-center justify-between border-t border-studio-border/60">
                    <button
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-studio-surface border border-studio-border hover:border-studio-accent/60 text-studio-text transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-studio-accent' : ''}`} />
                      <span>{isTesting ? 'Testing connection...' : 'Test Connection'}</span>
                    </button>

                    {testResult && (
                      <div
                        className={`flex items-center gap-1.5 text-[11px] ${
                          testResult.ok ? 'text-studio-emerald' : 'text-studio-rose'
                        }`}
                      >
                        {testResult.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        <span>{testResult.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'models' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-studio-muted">Select active model for AI Chat:</span>
                <span className="text-[11px] text-studio-accent font-mono">{selectedModelId}</span>
              </div>
              <div className="space-y-2">
                {models.map((m) => {
                  const isSelected = m.id === selectedModelId
                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        selectProvider(m.providerId)
                        selectModel(m.id)
                      }}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-studio-accent/10 border-studio-accent'
                          : 'bg-studio-surface/40 border-studio-border/60 hover:border-studio-border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-studio-text">{m.name}</span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-studio-surface text-studio-muted border border-studio-border">
                            {m.providerId}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-[11px] text-studio-accent font-medium">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-studio-muted mt-1">{m.description}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2 text-[10px] font-mono text-studio-muted">
                        <span className="px-1.5 py-0.5 rounded bg-studio-card border border-studio-border/60">
                          Context: {(m.capabilities.contextWindow / 1000).toFixed(0)}k tokens
                        </span>
                        {m.capabilities.streaming && (
                          <span className="px-1.5 py-0.5 rounded bg-studio-emerald/10 text-studio-emerald border border-studio-emerald/20">
                            Streaming
                          </span>
                        )}
                        {m.capabilities.toolCalling && (
                          <span className="px-1.5 py-0.5 rounded bg-studio-cyan/10 text-studio-cyan border border-studio-cyan/20">
                            Tool Calling
                          </span>
                        )}
                        {m.capabilities.vision && (
                          <span className="px-1.5 py-0.5 rounded bg-studio-violet/10 text-studio-violet border border-studio-violet/20">
                            Vision
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              {/* AI Enable Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-studio-surface/50 border border-studio-border">
                <div>
                  <h4 className="font-medium text-studio-text">Enable AI Capabilities</h4>
                  <p className="text-[11px] text-studio-muted">Toggle all AI operations globally in this workspace</p>
                </div>
                <input
                  type="checkbox"
                  checked={privacySettings.aiEnabled}
                  onChange={(e) => updatePrivacy({ aiEnabled: e.target.checked })}
                  className="accent-studio-accent w-4 h-4 cursor-pointer"
                />
              </div>

              {/* Secret Redaction Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-studio-surface/50 border border-studio-border">
                <div>
                  <h4 className="font-medium text-studio-text">Automatic Secret Redaction</h4>
                  <p className="text-[11px] text-studio-muted">
                    Masks detected API keys, bearer tokens, and private keys before sending to any provider
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={privacySettings.secretRedaction}
                  onChange={(e) => updatePrivacy({ secretRedaction: e.target.checked })}
                  className="accent-studio-accent w-4 h-4 cursor-pointer"
                />
              </div>

              {/* Exclusions */}
              <div className="space-y-2 p-3 rounded-lg bg-studio-surface/50 border border-studio-border">
                <h4 className="font-medium text-studio-text">Excluded Files & Glob Patterns</h4>
                <p className="text-[11px] text-studio-muted">
                  These files will never be attached or sent to any AI provider:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newExclusionPattern}
                    onChange={(e) => setNewExclusionPattern(e.target.value)}
                    placeholder="e.g. **/.env* or **/passwords.txt"
                    className="flex-1 bg-studio-bg border border-studio-border rounded-md px-3 py-1.5 text-xs text-studio-text focus:outline-none focus:border-studio-accent font-mono"
                  />
                  <button
                    onClick={handleAddExclusion}
                    disabled={!newExclusionPattern.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-studio-surface border border-studio-border hover:border-studio-accent text-studio-text cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {privacySettings.excludedPatterns.map((pat) => (
                    <span
                      key={pat}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-studio-card border border-studio-border text-[11px] font-mono text-studio-text"
                    >
                      <span>{pat}</span>
                      <button
                        onClick={() => handleRemoveExclusion(pat)}
                        className="text-studio-muted hover:text-studio-rose cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Data & History Management */}
              <div className="p-3 rounded-lg bg-studio-surface/50 border border-studio-border flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-studio-text">Clear AI Conversation History</h4>
                  <p className="text-[11px] text-studio-muted">Permanently wipe stored chat sessions and attachments</p>
                </div>
                <button
                  onClick={clearAllHistory}
                  className="px-3 py-1.5 rounded-md border border-studio-rose/40 text-studio-rose hover:bg-studio-rose/10 transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-studio-border bg-studio-surface/50">
          <span className="text-[11px] text-studio-muted">
            Secrets stored in OS encrypted secure storage
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-studio-accent text-studio-bg font-medium hover:bg-studio-accentHover transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
