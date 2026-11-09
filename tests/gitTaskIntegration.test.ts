import { describe, it, expect } from 'vitest'
import {
  formatCommitMessageWithTask,
  extractTaskIdsFromCommitMessage,
  evaluateGitEventTaskTransition,
  verifyTaskBranchesExistence
} from '../src/main/services/gitService'

describe('Git and Task Integration (Section 13.5)', () => {
  it('formats commit messages with task context and custom templates', () => {
    const task = {
      id: 'MST-42',
      title: 'Fix auth token refresh',
      type: 'fix',
      branchName: 'feature/MST-42-auth'
    }

    // Default template fallback
    expect(formatCommitMessageWithTask('', task, 'handle 401 error')).toBe(
      '[MST-42] handle 401 error'
    )

    // Conventional commits template
    const template1 = '${taskType}(${taskId}): ${message}'
    expect(formatCommitMessageWithTask(template1, task, 'handle 401 error')).toBe(
      'fix(MST-42): handle 401 error'
    )

    // Detailed template with branch and title
    const template2 = '[{taskId}] {taskTitle} - {message} (branch: {branchName})'
    expect(formatCommitMessageWithTask(template2, task, 'completed')).toBe(
      '[MST-42] Fix auth token refresh - completed (branch: feature/MST-42-auth)'
    )
  })

  it('extracts multiple task IDs from commit messages', () => {
    const msg1 = 'feat: implement terminal PTY and DAP fixes #MST-1, #MST-2 and closes MST-3'
    const extracted1 = extractTaskIdsFromCommitMessage(msg1)
    expect(extracted1).toContain('MST-1')
    expect(extracted1).toContain('MST-2')
    expect(extracted1).toContain('MST-3')

    const msg2 = '[MST-101] Quick bugfix for #102'
    const extracted2 = extractTaskIdsFromCommitMessage(msg2)
    expect(extracted2).toContain('MST-101')
    expect(extracted2).toContain('MST-102')

    // Empty message
    expect(extractTaskIdsFromCommitMessage('')).toEqual([])
  })

  it('evaluates automatic task status transitions on Git events', () => {
    // Commit with fix/close keywords moves to done
    expect(
      evaluateGitEventTaskTransition('commit', 'in_progress', 'fix #MST-1 null pointer')
    ).toBe('done')
    expect(
      evaluateGitEventTaskTransition('commit', 'review', 'Closes #MST-2 completely')
    ).toBe('done')

    // Commit on todo/backlog task moves to in_progress
    expect(
      evaluateGitEventTaskTransition('commit', 'todo', 'WIP: start implementing feature')
    ).toBe('in_progress')
    expect(
      evaluateGitEventTaskTransition('commit', 'backlog', 'initial commit')
    ).toBe('in_progress')

    // Push event moves in_progress to review
    expect(evaluateGitEventTaskTransition('push', 'in_progress')).toBe('review')

    // Merge event moves to done
    expect(evaluateGitEventTaskTransition('merge', 'review')).toBe('done')

    // No transition needed if already done
    expect(
      evaluateGitEventTaskTransition('commit', 'done', 'fix minor comment')
    ).toBeNull()
  })

  it('verifies task branches existence detecting missing or deleted branches', async () => {
    // Test on invalid/empty path safely handles missing
    const res = await verifyTaskBranchesExistence('C:/non-existent-repo-path', [
      'feature/MST-1',
      'feature/MST-2'
    ])
    expect(res.missing).toHaveLength(2)
    expect(res.existing).toHaveLength(0)
  })
})
