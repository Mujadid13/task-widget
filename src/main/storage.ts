import { promises as fs } from 'fs'
import type { Status, Task } from '../renderer/src/types'

/** Anything that can load and save the task list. Swap in SQLite, Todoist, etc. by implementing this. */
export interface TaskStore {
  load(): Promise<Task[]>
  save(tasks: Task[]): Promise<void>
}

// Record<Status, …> makes the compiler flag this if a status is added or renamed.
const validStatus: Record<Status, true> = { backlog: true, 'in-progress': true, done: true }

function isTask(t: unknown): t is Task {
  const o = t as Task
  return (
    typeof o === 'object' &&
    o !== null &&
    typeof o.id === 'string' &&
    typeof o.title === 'string' &&
    (o.due === undefined || typeof o.due === 'string') &&
    [1, 2, 3].includes(o.priority) &&
    typeof o.category === 'string' &&
    validStatus[o.status] === true &&
    typeof o.createdAt === 'string'
  )
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/** Tasks in a JSON file. Writes are atomic; an unreadable file is backed up, never overwritten. */
export class JsonFileStore implements TaskStore {
  private readonly file: string
  private queue: Promise<void> = Promise.resolve()

  constructor(file: string) {
    this.file = file
  }

  async load(): Promise<Task[]> {
    let text: string
    try {
      text = await fs.readFile(this.file, 'utf8')
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [] // first run
      throw e
    }

    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
    if (!Array.isArray(data)) {
      // Corrupt: move it aside for manual recovery and start empty rather than crash.
      await fs.rename(this.file, this.backupName())
      return []
    }

    const tasks = data.filter(isTask)
    // Some entries were bad: keep a copy of the original, since the next save drops them.
    if (tasks.length !== data.length) await fs.copyFile(this.file, this.backupName())
    return tasks
  }

  save(tasks: Task[]): Promise<void> {
    // Chain writes so two saves never interleave on the temp file.
    this.queue = this.queue.catch(() => {}).then(() => this.write(tasks))
    return this.queue
  }

  private async write(tasks: Task[]): Promise<void> {
    const tmp = `${this.file}.tmp`
    await fs.writeFile(tmp, JSON.stringify(tasks, null, 2))
    // Write-then-rename: a crash mid-save leaves the old tasks.json intact, never half a file.
    for (let attempt = 1; ; attempt++) {
      try {
        return await fs.rename(tmp, this.file)
      } catch (e) {
        // Windows: antivirus or the search indexer can hold the file for a moment.
        const code = (e as NodeJS.ErrnoException).code
        if (attempt === 5 || !['EPERM', 'EBUSY', 'EACCES'].includes(code ?? '')) throw e
        await sleep(50 * attempt)
      }
    }
  }

  private backupName(): string {
    return `${this.file}.corrupt-${Date.now()}`
  }
}
