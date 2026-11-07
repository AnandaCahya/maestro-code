import React, { useMemo } from 'react'
import {
  BarChart2,
  CheckCircle2,
  Clock,
  Flame,
  User,
  Layers,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { useProjectStore } from '../../store/useProjectStore'

export const ProjectDashboardView: React.FC = () => {
  const { projectData } = useProjectStore()
  const tasks = projectData.tasks || []

  const total = tasks.length
  const completed = tasks.filter((t) => t.status === 'done').length
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length
  const review = tasks.filter((t) => t.status === 'review').length
  const todo = tasks.filter((t) => t.status === 'todo').length
  const backlog = tasks.filter((t) => t.status === 'backlog').length

  const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0

  // Types breakdown
  const typeCounts = useMemo(() => {
    const counts = { epic: 0, story: 0, task: 0, bug: 0, subtask: 0 }
    for (const t of tasks) {
      const type = t.type || 'task'
      if (counts[type] !== undefined) counts[type]++
    }
    return counts
  }, [tasks])

  // Priority breakdown
  const priorityCounts = useMemo(() => {
    const counts = { urgent: 0, high: 0, medium: 0, low: 0 }
    for (const t of tasks) {
      if (counts[t.priority] !== undefined) counts[t.priority]++
    }
    return counts
  }, [tasks])

  // Assignee workload
  const assigneeWorkload = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>()
    for (const t of tasks) {
      const name = t.assignee?.trim() || 'Unassigned'
      const cur = map.get(name) || { total: 0, done: 0 }
      cur.total++
      if (t.status === 'done') cur.done++
      map.set(name, cur)
    }
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total)
  }, [tasks])

  return (
    <div className="flex-1 w-full h-full flex flex-col gap-4 overflow-y-auto pr-1">
      {/* Top Header */}
      <div className="flex items-center justify-between p-3 rounded-xl glass-panel border border-white/[0.05]">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-studio-emerald" />
          <h3 className="text-xs font-semibold text-white">Project Analytics & Dashboard</h3>
        </div>
        <span className="text-[10px] font-mono text-studio-muted">
          Health: {completionPercent >= 70 ? 'On Track' : completionPercent >= 40 ? 'Progressing' : 'Starting'}
        </span>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl glass-panel border border-white/[0.06] flex flex-col gap-1">
          <span className="text-[10px] text-studio-muted font-mono flex items-center gap-1">
            <Layers className="w-3 h-3 text-studio-cyan" /> Total Issues
          </span>
          <span className="text-xl font-bold text-white font-mono">{total}</span>
          <span className="text-[10px] text-studio-subtle">{tasks.length} tracked across project</span>
        </div>

        <div className="p-3.5 rounded-xl glass-panel border border-studio-emerald/20 flex flex-col gap-1">
          <span className="text-[10px] text-studio-muted font-mono flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-studio-emerald" /> Completed
          </span>
          <span className="text-xl font-bold text-studio-emerald font-mono">{completed}</span>
          <span className="text-[10px] text-studio-emerald/70">{completionPercent}% completion rate</span>
        </div>

        <div className="p-3.5 rounded-xl glass-panel border border-studio-amber/20 flex flex-col gap-1">
          <span className="text-[10px] text-studio-muted font-mono flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-studio-amber" /> In Progress / Review
          </span>
          <span className="text-xl font-bold text-studio-amber font-mono">{inProgress + review}</span>
          <span className="text-[10px] text-studio-muted">{inProgress} coding, {review} review</span>
        </div>

        <div className="p-3.5 rounded-xl glass-panel border border-studio-rose/20 flex flex-col gap-1">
          <span className="text-[10px] text-studio-muted font-mono flex items-center gap-1">
            <Flame className="w-3 h-3 text-studio-rose" /> Urgent & High
          </span>
          <span className="text-xl font-bold text-studio-rose font-mono">
            {priorityCounts.urgent + priorityCounts.high}
          </span>
          <span className="text-[10px] text-studio-muted">
            {priorityCounts.urgent} urgent, {priorityCounts.high} high
          </span>
        </div>
      </div>

      {/* Status Progress Meter Bar */}
      <div className="p-4 rounded-2xl glass-panel border border-white/[0.06] flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-white">Status Breakdown</span>
          <span className="font-mono text-studio-muted text-[11px]">{completed}/{total} resolved</span>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="w-full h-3 rounded-full bg-black/40 overflow-hidden flex border border-white/5">
          {total > 0 ? (
            <>
              <div
                style={{ width: `${(completed / total) * 100}%` }}
                className="bg-studio-emerald h-full transition-all"
                title={`Done: ${completed}`}
              />
              <div
                style={{ width: `${(review / total) * 100}%` }}
                className="bg-studio-violet h-full transition-all"
                title={`Review: ${review}`}
              />
              <div
                style={{ width: `${(inProgress / total) * 100}%` }}
                className="bg-studio-amber h-full transition-all"
                title={`In Progress: ${inProgress}`}
              />
              <div
                style={{ width: `${(todo / total) * 100}%` }}
                className="bg-studio-cyan h-full transition-all"
                title={`To Do: ${todo}`}
              />
              <div
                style={{ width: `${(backlog / total) * 100}%` }}
                className="bg-white/10 h-full transition-all"
                title={`Backlog: ${backlog}`}
              />
            </>
          ) : (
            <div className="w-full bg-white/5 h-full" />
          )}
        </div>

        {/* Status Legend */}
        <div className="flex items-center gap-4 text-[10px] font-mono text-studio-muted flex-wrap pt-1">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-studio-emerald" /> Done ({completed})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-studio-violet" /> Review ({review})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-studio-amber" /> In Progress ({inProgress})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-studio-cyan" /> To Do ({todo})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-white/20" /> Backlog ({backlog})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Issue Types Distribution */}
        <div className="p-4 rounded-2xl glass-panel border border-white/[0.06] flex flex-col gap-2.5">
          <h4 className="text-xs font-semibold text-white">Issue Types Distribution</h4>
          <div className="flex flex-col gap-2 font-mono text-xs">
            {Object.entries(typeCounts).map(([type, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={type} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="capitalize text-studio-text">{type}</span>
                    <span className="text-studio-muted">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-black/40 overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full ${
                        type === 'bug'
                          ? 'bg-studio-rose'
                          : type === 'epic'
                          ? 'bg-studio-violet'
                          : type === 'story'
                          ? 'bg-studio-cyan'
                          : 'bg-studio-amber'
                      }`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="p-4 rounded-2xl glass-panel border border-white/[0.06] flex flex-col gap-2.5">
          <h4 className="text-xs font-semibold text-white">Priority Distribution</h4>
          <div className="flex flex-col gap-2 font-mono text-xs">
            {Object.entries(priorityCounts).map(([prio, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={prio} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="capitalize text-studio-text">{prio}</span>
                    <span className="text-studio-muted">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-black/40 overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full ${
                        prio === 'urgent'
                          ? 'bg-studio-rose'
                          : prio === 'high'
                          ? 'bg-studio-amber'
                          : prio === 'medium'
                          ? 'bg-studio-cyan'
                          : 'bg-white/20'
                      }`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Workload by Assignee */}
      <div className="p-4 rounded-2xl glass-panel border border-white/[0.06] flex flex-col gap-2.5">
        <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-studio-cyan" /> Workload by Member
        </h4>
        <div className="flex flex-col gap-1.5">
          {assigneeWorkload.map(([name, data]) => {
            const memberPct = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0
            return (
              <div
                key={name}
                className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-studio-accent/20 border border-studio-accent/30 flex items-center justify-center text-[10px] text-studio-accent font-semibold uppercase">
                    {name.slice(0, 2)}
                  </div>
                  <span className="text-white font-medium">{name}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-studio-muted text-[11px]">
                    {data.done}/{data.total} completed ({memberPct}%)
                  </span>
                  <div className="w-20 h-1.5 rounded-full bg-black/40 overflow-hidden hidden sm:block">
                    <div
                      className="h-full rounded-full bg-studio-emerald"
                      style={{ width: `${memberPct}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
