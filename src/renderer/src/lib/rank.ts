import type { Task } from '../types'

const group = (t: Task): number => (t.status === 'in-progress' ? 0 : t.status === 'backlog' ? 1 : 2)
const due = (t: Task): number => (t.due ? Date.parse(t.due) : Infinity) // no due date = last

/**
 * "What to do now" order:
 * 1. In progress, then backlog, then completed
 * 2. Earliest due first (so overdue tasks lead); tasks without a due date go last
 * 3. Ties: highest priority (P1) first, then oldest first
 */
export function rankTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      group(a) - group(b) ||
      due(a) - due(b) || // Infinity - Infinity is NaN, which falls through like 0
      a.priority - b.priority ||
      a.createdAt.localeCompare(b.createdAt)
  )
}
