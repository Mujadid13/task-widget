import { ElectronAPI } from '@electron-toolkit/preload'
import type { Task } from '../renderer/src/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      fitWindow: (width: number, height: number) => void
      loadTasks: () => Promise<Task[]>
      saveTasks: (tasks: Task[]) => Promise<void>
    }
  }
}
