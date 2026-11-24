import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rankTasks } from '../src/renderer/src/lib/rank.ts'
import type { Task } from '../src/renderer/src/types.ts'

const hour = 3_600_000
const at = (h: number): string => new Date(Date.now() + h * hour).toISOString()
const task = (id: string, extra: Partial<Task> = {}): Task => ({
  id,
  title: id,
  priority: 2,
  category: 'work',
  status: 'backlog',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...extra
})
const ids = (tasks: { id: string }[]): string[] => tasks.map((t) => t.id)

test('in progress comes before backlog, completed comes last', () => {
  const ranked = rankTasks([
    task('done', { status: 'done', due: at(-5) }),
    task('backlog-overdue', { due: at(-2) }),
    task('working', { status: 'in-progress' })
  ])
  assert.deepEqual(ids(ranked), ['working', 'backlog-overdue', 'done'])
})

test('overdue first, then earliest due, then no due date', () => {
  const ranked = rankTasks([
    task('no-due'),
    task('tomorrow', { due: at(24) }),
    task('overdue', { due: at(-1) }),
    task('soon', { due: at(1) })
  ])
  assert.deepEqual(ids(ranked), ['overdue', 'soon', 'tomorrow', 'no-due'])
})

test('same due time: highest priority first, then oldest', () => {
  const due = at(3)
  const ranked = rankTasks([
    task('p3', { due, priority: 3 }),
    task('p1-new', { due, priority: 1, createdAt: '2026-02-01T00:00:00.000Z' }),
    task('p1-old', { due, priority: 1 })
  ])
  assert.deepEqual(ids(ranked), ['p1-old', 'p1-new', 'p3'])
})

test('tasks without a due date are ordered by priority', () => {
  const ranked = rankTasks([task('p3', { priority: 3 }), task('p1', { priority: 1 })])
  assert.deepEqual(ids(ranked), ['p1', 'p3'])
})

test('does not mutate the input array', () => {
  const input = [task('b', { priority: 3 }), task('a', { priority: 1 })]
  rankTasks(input)
  assert.deepEqual(ids(input), ['b', 'a'])
})
