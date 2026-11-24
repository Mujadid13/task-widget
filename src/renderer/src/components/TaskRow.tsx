import type { Task } from '../types'
import { TaskMeta } from './TaskMeta'
import { TaskEditor, type TaskPatch } from './TaskEditor'

const iconButton =
  'rounded-md p-1.5 text-slate-400 hover:bg-slate-700/50 focus-visible:outline-2 focus-visible:outline-accent-200'

/** Pencil + trash buttons, shared by list rows and the "Do this now" card. */
export function TaskActions({
  onEdit,
  onDelete,
  className = ''
}: {
  onEdit: () => void
  onDelete: () => void
  className?: string
}): React.JSX.Element {
  return (
    <div className={`flex shrink-0 gap-0.5 ${className}`}>
      <button
        onClick={onEdit}
        aria-label="Edit task"
        title="Edit"
        className={`${iconButton} hover:text-accent-200`}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
      <button
        onClick={onDelete}
        aria-label="Delete task"
        title="Delete"
        className={`${iconButton} hover:text-rose-300`}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        </svg>
      </button>
    </div>
  )
}

export interface TaskRowProps {
  task: Task
  now: Date
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (patch: TaskPatch) => void
  onDelete: () => void
  categoryOptions: string[]
}

/** One task in a list. Draggable onto board columns; swaps to the edit form when editing. */
export function TaskRow({
  task,
  now,
  editing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  categoryOptions
}: TaskRowProps): React.JSX.Element {
  if (editing) {
    return (
      <li className="rounded-xl bg-slate-900/60 p-3">
        <TaskEditor
          task={task}
          onSave={onSave}
          onCancel={onCancel}
          categoryOptions={categoryOptions}
        />
      </li>
    )
  }
  const done = task.status === 'done'
  return (
    <li
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
      className="group relative cursor-grab border-l-2 border-accent-300/30 pl-3 active:cursor-grabbing"
    >
      <div>
        <p className={`break-words ${done ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
          {task.title}
        </p>
        <TaskMeta task={task} now={now} />
      </div>
      {/* Floats over the row on hover/focus, so titles use the full width the rest of the time. */}
      <TaskActions
        onEdit={onEdit}
        onDelete={onDelete}
        className="absolute top-0 right-0 rounded-lg bg-slate-900 shadow-lg shadow-slate-950 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
      />
    </li>
  )
}
