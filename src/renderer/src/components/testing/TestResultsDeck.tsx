import React, { useRef, useEffect } from 'react'
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  RotateCcw,
  Trash2,
  Copy,
  Check
} from 'lucide-react'
import { useTestStore } from '../../store/useTestStore'

export const TestResultsDeck: React.FC = () => {
  const {
    outputLines,
    lastSummary,
    status,
    clearOutput,
    runAllTests,
    runFailedTests,
    selectedTest
  } = useTestStore()
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [outputLines.length])

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121318]/90 font-mono text-xs overflow-hidden select-none">
      {/* Action and Summary Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.04] bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium text-white/90">
            <FlaskConical className="w-3.5 h-3.5 text-studio-amber" />
            <span>Test Results</span>
          </div>

          {lastSummary && (
            <div className="flex items-center gap-2 text-[11px]">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-studio-emerald/20 text-studio-emerald font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                {lastSummary.passed} Passed
              </span>
              {lastSummary.failed > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-studio-rose/20 text-studio-rose font-semibold">
                  <XCircle className="w-3 h-3" />
                  {lastSummary.failed} Failed
                </span>
              )}
              <span className="flex items-center gap-1 text-studio-muted">
                <Clock className="w-3 h-3" />
                {lastSummary.duration}ms
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={runFailedTests}
            disabled={!lastSummary || lastSummary.failed === 0 || status === 'running'}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-studio-amber disabled:opacity-30 cursor-pointer transition-colors text-[11px]"
            title="Rerun Failed Tests"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Rerun Failed</span>
          </button>
          <button
            onClick={runAllTests}
            disabled={status === 'running'}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-studio-accent/20 hover:bg-studio-accent/30 text-studio-accent font-medium border border-studio-accent/30 disabled:opacity-30 cursor-pointer transition-all active:scale-95 text-[11px]"
            title="Run All Tests"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Run All</span>
          </button>
          <div className="h-4 w-px bg-white/10 mx-1" />
          <button
            onClick={clearOutput}
            className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
            title="Clear Output"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Split: Output Stream & Optional Selected Test Inspector */}
      <div className="flex-1 flex overflow-hidden">
        {/* Output Stream */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-0.5 font-mono text-[11px] leading-relaxed">
          {outputLines.map((line, idx) => {
            let color = 'text-white/80'
            if (line.includes('PASS') || line.includes('passed') || line.includes('✓')) {
              color = 'text-studio-emerald font-semibold'
            } else if (line.includes('FAIL') || line.includes('failed') || line.includes('✕') || line.includes('Error:')) {
              color = 'text-studio-rose font-semibold'
            } else if (line.startsWith('===') || line.startsWith('Running')) {
              color = 'text-studio-amber font-semibold'
            }

            return (
              <div key={idx} className={`whitespace-pre-wrap ${color}`}>
                {line}
              </div>
            )
          })}
        </div>

        {/* Selected Test Detail Drawer (if selected) */}
        {selectedTest && (
          <div className="w-80 border-l border-white/[0.04] bg-black/20 p-3 flex flex-col gap-2 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
              <span className="font-semibold text-white truncate text-[11px]">{selectedTest.name}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                  selectedTest.status === 'passed'
                    ? 'bg-studio-emerald/20 text-studio-emerald'
                    : selectedTest.status === 'failed'
                    ? 'bg-studio-rose/20 text-studio-rose'
                    : 'bg-white/10 text-studio-muted'
                }`}
              >
                {selectedTest.status}
              </span>
            </div>

            <div className="text-[11px] text-studio-muted space-y-1">
              <div>
                <span className="text-white/60">File: </span>
                <span className="text-studio-cyan">{selectedTest.filePath.split(/[\\/]/).pop()}</span>
              </div>
              <div>
                <span className="text-white/60">Line: </span>
                <span className="text-studio-amber">{selectedTest.line}</span>
              </div>
              {selectedTest.suiteName && (
                <div>
                  <span className="text-white/60">Suite: </span>
                  <span className="text-white">{selectedTest.suiteName}</span>
                </div>
              )}
              {selectedTest.duration !== undefined && (
                <div>
                  <span className="text-white/60">Duration: </span>
                  <span>{selectedTest.duration}ms</span>
                </div>
              )}
            </div>

            {selectedTest.error && (
              <div className="mt-2 p-2 rounded-lg bg-studio-rose/10 border border-studio-rose/20 text-studio-rose text-[11px] whitespace-pre-wrap">
                <div className="font-bold mb-1">Failure Details:</div>
                {selectedTest.error.message}
                {selectedTest.error.stack && (
                  <div className="text-[10px] text-studio-rose/70 mt-1 font-mono">
                    {selectedTest.error.stack}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
