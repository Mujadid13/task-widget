import { useEffect, useRef, useState } from 'react'
import type { Status, Task } from './types'
import { categories } from './types'
import { rankTasks } from './lib/rank'
import { useNow } from './lib/time'
import { TaskMeta } from './components/TaskMeta'
import { TaskEditor, type TaskPatch } from './components/TaskEditor'
import { TaskActions, TaskRow } from './components/TaskRow'
import { Board } from './components/Board'

const clock = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
// Starting values for the add form.
const newTask: TaskPatch = { title: '', priority: 2, category: 'personal', status: 'backlog' }

const date = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

function App(): React.JSX.Element {
  const now = useNow()
  // Saved to tasks.json by the main process (see src/main/storage.ts).
  const [tasks, setTasks] = useState<Task[]>([])
  // Becomes true once the saved tasks arrive. Until then nothing is saved, so a slow
  // or failed load can never overwrite the file with an empty list.
  const loaded = useRef(false)
  const [boardOpen, setBoardOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const cardRef = useRef<HTMLElement>(null)

  // Keep the window shrink-wrapped to the card. Width is the card's max for the current
  // mode (the window decides the real width); height is measured whenever the card changes.
  useEffect(() => {
    window.api
      .loadTasks()
      .then((saved) => {
        setTasks(saved)
        loaded.current = true
      })
      .catch((e) => console.error('Could not load tasks', e))
  }, [])

  // Save after every change (the main process writes the file atomically).
  useEffect(() => {
    if (loaded.current)
      window.api.saveTasks(tasks).catch((e) => console.error('Could not save tasks', e))
  }, [tasks])

  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const fit = (): void => window.api.fitWindow(boardOpen ? 1040 : 460, card.offsetHeight)
    const observer = new ResizeObserver(fit)
    observer.observe(card)
    return () => observer.disconnect()
  }, [boardOpen])

  // "Do this now" = top of the ranking (see lib/rank.ts); completed tasks never qualify.
  const ranked = rankTasks(tasks)
  const open = ranked.filter((t) => t.status !== 'done')
  const [current, ...rest] = open

  // Built-in categories first, then any custom ones already used, so they can be picked again.
  const categoryOptions = [...new Set([...categories, ...tasks.map((t) => t.category)])]

  const update = (id: string, patch: Partial<Task>): void =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)))

  const move = (id: string, status: Status): void => update(id, { status })

  const save = (id: string, patch: TaskPatch): void => {
    update(id, patch)
    setEditingId(null)
  }

  const remove = (task: Task): void => {
    if (confirm(`Delete "${task.title}"?`)) setTasks((ts) => ts.filter((t) => t.id !== task.id))
  }

  const add = (patch: TaskPatch): void => {
    setTasks((ts) => [
      ...ts,
      { ...patch, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    ])
    setAdding(false)
  }

  const row = (t: Task): React.JSX.Element => (
    <TaskRow
      categoryOptions={categoryOptions}
      key={t.id}
      task={t}
      now={now}
      editing={editingId === t.id}
      onEdit={() => setEditingId(t.id)}
      onCancel={() => setEditingId(null)}
      onSave={(patch) => save(t.id, patch)}
      onDelete={() => remove(t)}
    />
  )

  return (
    <main
      ref={cardRef}
      // Fills the window up to a max width (wider in board mode). @container lets children
      // adapt to the card's actual width (the @sm:/@2xl: classes) rather than the window's.
      className={`@container flex w-full ${boardOpen ? 'max-w-[1040px]' : 'max-w-[460px]'} flex-col gap-6 rounded-3xl border border-teal-300/20 bg-slate-950/75 p-5 text-lg sm:p-8 text-slate-100 shadow-[0_0_40px_-8px_rgba(45,212,191,0.35)] backdrop-blur-xl`}
    >
      {/* The clock is the hidden drag handle for moving the widget around the desktop. */}
      <header className="[-webkit-app-region:drag]">
        <p className="text-5xl font-light @sm:text-7xl tracking-tight tabular-nums">
          {clock.format(now)}
        </p>
        <p className="mt-1 text-lg text-slate-300 @sm:text-xl">{date.format(now)}</p>
      </header>

      {/* The board lists in-progress tasks itself, so the big card steps aside to give it room. */}
      {boardOpen ? null : current ? (
        // key = task id, so the card re-mounts and slides in when the next task takes over.
        <section
          key={current.id}
          className="animate-slide-in rounded-2xl border border-emerald-300/25 bg-gradient-to-br from-teal-400/15 to-sky-500/10 p-5"
        >
          {editingId === current.id ? (
            <TaskEditor
              categoryOptions={categoryOptions}
              task={current}
              onSave={(patch) => save(current.id, patch)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <>
              <div className="flex items-start justify-between">
                <p className="text-xs font-bold tracking-[0.2em] text-teal-300">DO THIS NOW</p>
                <TaskActions
                  onEdit={() => setEditingId(current.id)}
                  onDelete={() => remove(current)}
                  className="-mt-1.5 -mr-1.5"
                />
              </div>
              <h1 className="mt-1 text-2xl leading-tight font-semibold break-words @sm:text-4xl">
                {current.title}
              </h1>
              <div className="mt-3">
                <TaskMeta task={current} now={now} />
              </div>
              <button
                onClick={() => move(current.id, 'done')}
                className="mt-5 w-full rounded-xl bg-teal-400/90 py-2.5 text-lg font-semibold text-slate-950 transition hover:bg-teal-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-200"
              >
                Done
              </button>
            </>
          )}
        </section>
      ) : (
        <section className="animate-slide-in rounded-2xl border border-emerald-300/25 p-5 text-center text-xl text-slate-200">
          All clear. Nothing left to do 🎉
        </section>
      )}

      {boardOpen ? (
        <Board tasks={ranked} onMove={move} renderRow={row} />
      ) : (
        rest.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-bold tracking-[0.2em] text-slate-400">UP NEXT</h2>
            <ul className="flex flex-col gap-3">{rest.slice(0, 3).map(row)}</ul>
          </section>
        )
      )}

      <footer className="flex flex-col gap-2">
        {adding ? (
          <div className="rounded-xl border border-teal-300/25 bg-slate-900/60 p-3">
            <TaskEditor
              categoryOptions={categoryOptions}
              task={newTask}
              onSave={add}
              onCancel={() => setAdding(false)}
              submitLabel="Add task"
            />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="rounded-xl border border-dashed border-slate-500/40 py-2 text-slate-300 hover:border-teal-300/60 hover:text-teal-200"
          >
            + Add task
          </button>
        )}
        <button
          onClick={() => setBoardOpen((b) => !b)}
          className="self-end text-sm text-slate-400 hover:text-teal-200"
        >
          {boardOpen ? 'Close board' : `Board (${tasks.length})`}
        </button>
      </footer>
    </main>
  )
}

export default App
