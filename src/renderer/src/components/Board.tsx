import { useState } from 'react'
import type { Status, Task } from '../types'
import { statuses, statusLabels } from '../types'

/** Backlog / In progress / Completed columns, side by side; each scrolls on its own. Drop a dragged task row on a section to move it there. */
export function Board({
  tasks,
  onMove,
  renderRow
}: {
  tasks: Task[]
  onMove: (id: string, status: Status) => void
  renderRow: (task: Task) => React.ReactNode
}): React.JSX.Element {
  const [over, setOver] = useState<Status | null>(null) // section being dragged over, for highlight

  return (
    // Stacked when the card is narrow, side by side once it is wide enough.
    <div className="grid gap-4 @2xl:grid-cols-3">
      {statuses.map((status) => {
        const items = tasks.filter((t) => t.status === status)
        return (
          <section
            key={status}
            onDragOver={(e) => {
              e.preventDefault() // required, or the browser refuses the drop
              setOver(status)
            }}
            onDragLeave={(e) => {
              // Ignore leave events fired when moving between child elements.
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null)
            }}
            onDrop={(e) => {
              e.preventDefault()
              setOver(null)
              onMove(e.dataTransfer.getData('text/plain'), status)
            }}
            className={`flex max-h-80 flex-col @2xl:h-[min(30rem,60vh)] @2xl:max-h-none rounded-xl border p-3 transition-colors ${
              over === status ? 'border-accent-300/60 bg-accent-400/10' : 'border-slate-500/15'
            }`}
          >
            <h3 className="mb-2 flex justify-between text-xs font-bold tracking-[0.2em] text-slate-400">
              {statusLabels[status].toUpperCase()}
              <span className="tabular-nums">{items.length}</span>
            </h3>
            {items.length > 0 ? (
              <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                {items.map(renderRow)}
              </ul>
            ) : (
              <p className="my-auto text-center text-sm text-slate-500">Drop tasks here</p>
            )}
          </section>
        )
      })}
    </div>
  )
}
