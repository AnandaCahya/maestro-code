import React, { useState, useEffect, useMemo } from 'react'
import {
  Puzzle,
  Search,
  CheckCircle2,
  XCircle,
  FolderPlus,
  Trash2,
  Power,
  Play,
  Command,
  ExternalLink,
  Sparkles,
  Info,
  ShieldCheck,
  Package,
  Layers,
  ChevronRight,
  ChevronDown
} from 'lucide-react'
import { useExtensionStore } from '../../store/useExtensionStore'
import { useEditorStore } from '../../store/useEditorStore'
import type { MaestroExtension } from '../../../../preload/index.d'

export const ExtensionsDeck: React.FC = () => {
  const {
    extensions,
    contributedCommands,
    recommendations,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedExtension,
    selectExtension,
    loadExtensions,
    loadRecommendations,
    toggleExtension,
    installLocalExtension,
    uninstallExtension,
    executeCommand
  } = useExtensionStore()

  const { workspacePath } = useEditorStore()

  useEffect(() => {
    loadExtensions(workspacePath || undefined)
    if (workspacePath) {
      loadRecommendations(workspacePath)
    }
  }, [workspacePath])

  const handleInstallFromFolder = async () => {
    if (!window.maestroAPI) return
    const target = await window.maestroAPI.openDirectoryDialog()
    if (target) {
      await installLocalExtension(target)
    }
  }

  // Filter extensions based on activeTab and searchQuery
  const filteredExtensions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    let list = extensions

    if (activeTab === 'recommended') {
      list = extensions.filter((e) => recommendations.includes(e.id))
    }

    if (q) {
      list = list.filter(
        (e) =>
          e.displayName.toLowerCase().includes(q) ||
          e.name.toLowerCase().includes(q) ||
          e.publisher.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q)
      )
    }

    return list
  }, [extensions, activeTab, searchQuery, recommendations])

  const installedCount = extensions.length
  const recommendedCount = recommendations.length

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-xs select-none">
      {/* Header and Search */}
      <div className="p-2.5 border-b border-white/[0.04] flex flex-col gap-2 bg-black/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-studio-amber/20 flex items-center justify-center text-studio-amber shrink-0">
              <Puzzle className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-white tracking-wide uppercase text-[11px]">
              Extensions
            </span>
          </div>

          <button
            onClick={handleInstallFromFolder}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-studio-amber transition-colors text-[11px] font-medium cursor-pointer border border-white/[0.06]"
            title="Install Unpacked Extension Folder"
          >
            <FolderPlus className="w-3 h-3" />
            <span>Install Folder</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-1 bg-white/[0.04] px-2 py-1 rounded-lg border border-white/[0.06]">
          <Search className="w-3 h-3 text-studio-muted shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search extensions (name, publisher)..."
            className="bg-transparent border-none outline-none text-white text-[11px] placeholder:text-studio-muted/50 w-full"
          />
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 text-[11px] font-mono">
          <button
            onClick={() => setActiveTab('installed')}
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
              activeTab === 'installed'
                ? 'bg-white/15 text-white font-bold'
                : 'text-studio-muted hover:text-white'
            }`}
          >
            Installed ({installedCount})
          </button>
          <button
            onClick={() => setActiveTab('recommended')}
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
              activeTab === 'recommended'
                ? 'bg-studio-amber/25 text-studio-amber font-bold'
                : 'text-studio-muted hover:text-studio-amber'
            }`}
          >
            Recommended ({recommendedCount})
          </button>
        </div>
      </div>

      {/* Main Extension List */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
        {filteredExtensions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-2 text-studio-muted">
            <Package className="w-8 h-8 text-studio-muted/40" />
            <div className="text-xs font-medium text-white/70">
              {activeTab === 'recommended' && recommendations.length === 0
                ? 'No recommendations in .vscode/extensions.json'
                : 'No extensions match query'}
            </div>
            <p className="text-[11px] text-studio-muted max-w-xs leading-relaxed">
              Install extensions from unpacked folders or explore builtin tools.
            </p>
          </div>
        ) : (
          filteredExtensions.map((ext) => {
            const isSelected = selectedExtension?.id === ext.id
            const commands = ext.manifest.contributes?.commands || []

            return (
              <div
                key={ext.id}
                onClick={() => selectExtension(isSelected ? null : ext)}
                className={`p-2 rounded-xl transition-all cursor-pointer border flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-studio-amber/10 border-studio-amber/30 text-white shadow-lg'
                    : 'bg-white/[0.015] border-white/[0.04] hover:bg-white/[0.03] text-studio-muted hover:text-white'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-white/[0.06] flex items-center justify-center text-studio-amber shrink-0 border border-white/[0.06]">
                      <Puzzle className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate text-[11px] flex items-center gap-1.5">
                        <span>{ext.displayName}</span>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/[0.08] text-studio-muted">
                          v{ext.version}
                        </span>
                      </div>
                      <div className="text-[10px] text-studio-muted font-mono truncate">
                        {ext.publisher}
                      </div>
                    </div>
                  </div>

                  {/* Badges and action buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {ext.isBuiltin ? (
                      <span className="px-1.5 py-0.2 rounded-full bg-studio-cyan/20 text-studio-cyan text-[9px] font-mono font-bold">
                        BUILT-IN
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          uninstallExtension(ext.id)
                        }}
                        className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-studio-rose transition-colors"
                        title="Uninstall Extension"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleExtension(ext.id, !ext.isEnabled)
                      }}
                      className={`p-1 rounded transition-colors ${
                        ext.isEnabled
                          ? 'text-studio-emerald hover:bg-studio-emerald/10'
                          : 'text-studio-muted hover:bg-white/10'
                      }`}
                      title={ext.isEnabled ? 'Disable Extension' : 'Enable Extension'}
                    >
                      <Power className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-[10px] text-studio-muted line-clamp-2 leading-relaxed">
                  {ext.description || 'No description provided.'}
                </p>

                {/* Expanded Details Drawer */}
                {isSelected && (
                  <div className="mt-2 pt-2 border-t border-white/[0.06] flex flex-col gap-2 animate-fade-in text-[10px] font-mono">
                    <div className="flex flex-col gap-0.5">
                      <div className="text-white/60">ID: {ext.id}</div>
                      <div className="text-white/60">State: <span className={ext.isEnabled ? 'text-studio-emerald' : 'text-studio-rose'}>{ext.state}</span></div>
                    </div>

                    {/* Contributed Commands */}
                    {commands.length > 0 && (
                      <div className="flex flex-col gap-1 mt-1">
                        <div className="text-studio-amber font-semibold uppercase text-[9px]">
                          Contributed Commands ({commands.length}):
                        </div>
                        <div className="flex flex-col gap-1">
                          {commands.map((cmd) => (
                            <button
                              key={cmd.command}
                              onClick={(e) => {
                                e.stopPropagation()
                                executeCommand(cmd.command)
                              }}
                              className="flex items-center justify-between px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-left transition-colors text-white group cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5 truncate mr-1">
                                <Command className="w-2.5 h-2.5 text-studio-amber" />
                                <span className="truncate">{cmd.title}</span>
                              </div>
                              <Play className="w-2.5 h-2.5 text-studio-accent opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
