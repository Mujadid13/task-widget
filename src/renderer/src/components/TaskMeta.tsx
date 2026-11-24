import type { Task } from '../types'
import { formatDue } from '../lib/time'

const priorityStyle = {
  1: 'bg-rose-400/20 text-rose-200',
  2: 'bg-amber-400/20 text-amber-200',
  3: 'bg-sky-400/20 text-sky-200'
}

/** Priority badge, category and due label, shared by the big card and the list rows. */
export function TaskMeta({ task, now }: { task: Task; now: Date }): React.JSX.Element {
  const overdue = task.due !== undefined && new Date(task.due) < now
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className={`rounded-full px-2 py-0.5 font-semibold ${priorityStyle[task.priority]}`}>
        P{task.priority}
      </span>
      <span className="text-slate-400 capitalize">{task.category}</span>
      {task.due && task.status !== 'done' && (
        <span className={overdue ? 'font-semibold text-rose-300' : 'text-slate-300'}>
          {formatDue(task.due, now)}
        </span>
      )}
    </div>
  )
}
