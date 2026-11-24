import { useState } from 'react'
import type { Status, Task } from '../types'
import { statuses, statusLabels } from '../types'

export type TaskPatch = Pick<Task, 'title' | 'due' | 'priority' | 'category' | 'status'>

// <input type="datetime-local"> wants local "YYYY-MM-DDTHH:mm", not UTC ISO.
const toLocalInput = (iso?: string): string => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

const CUSTOM = '__custom' // select value that reveals the free-text category box

const field =
  'w-full rounded-lg border border-slate-500/30 bg-slate-900/70 px-2 py-1.5 text-sm text-slate-100 focus:border-accent-300/60 focus:outline-none'

/** Form for adding or editing a task. Enter saves, Escape cancels. */
export function TaskEditor({
  task,
  onSave,
  onCancel,
  categoryOptions,
  submitLabel = 'Save'
}: {
  task: TaskPatch // starting values
  categoryOptions: string[] // built-ins + custom ones already in use
  onSave: (patch: TaskPatch) => void
  onCancel: () => void
  submitLabel?: string
}): React.JSX.Element {
  const [custom, setCustom] = useState(false)
  const [hasDue, setHasDue] = useState(task.due !== undefined) // due date is opt-in

  const save = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const title = String(f.get('title')).trim()
    if (!title) return
    const due = f.get('due') as string | null // null when the date field is hidden
    const category = String(f.get(custom ? 'customCategory' : 'category')).trim()
    if (!category) return
    onSave({
      title,
      due: due ? new Date(due).toISOString() : undefined, // no date = no due date
      priority: Number(f.get('priority')) as Task['priority'],
      category,
      status: f.get('status') as Status
    })
  }

  return (
    <form
      onSubmit={save}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      className="@container flex flex-col gap-2"
    >
      <input
        name="title"
        defaultValue={task.title}
        aria-label="Title"
        placeholder="What needs doing?"
        required
        autoFocus
        className={field}
      />
      {hasDue ? (
        <div className="flex gap-2">
          {/* required while shown, so a half-filled date can't be silently dropped */}
          <input
            type="datetime-local"
            name="due"
            defaultValue={toLocalInput(task.due)}
            aria-label="Due date"
            required
            className={field}
          />
          <button
            type="button"
            onClick={() => setHasDue(false)}
            className="shrink-0 rounded-lg px-2 text-sm text-slate-400 hover:text-rose-300"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setHasDue(true)}
          className="self-start rounded-lg px-1 py-0.5 text-sm text-slate-400 hover:text-accent-200"
        >
          + Add due date
        </button>
      )}
      {/* One field per line when the form is narrow. */}
      <div className="grid gap-2 @xs:grid-cols-[auto_1fr_1fr]">
        <select
          name="priority"
          defaultValue={task.priority}
          aria-label="Priority"
          className={field}
        >
          <option value={1}>P1</option>
          <option value={2}>P2</option>
          <option value={3}>P3</option>
        </select>
        <select
          name="category"
          defaultValue={task.category}
          aria-label="Category"
          onChange={(e) => setCustom(e.target.value === CUSTOM)}
          className={field}
        >
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {c[0].toUpperCase() + c.slice(1)}
            </option>
          ))}
          <option value={CUSTOM}>Custom…</option>
        </select>
        <select name="status" defaultValue={task.status} aria-label="Status" className={field}>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
      </div>
      {custom && (
        <input
          name="customCategory"
          aria-label="Custom category"
          placeholder="Your category, e.g. Gym"
          required
          autoFocus
          className={field}
        />
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:text-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-accent-400/90 px-3 py-1.5 text-sm font-semibold text-accent-ink hover:bg-accent-300"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
