import { ElectronAPI } from '@electron-toolkit/preload'
import type { Corner, Task } from '../renderer/src/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      fitWindow: (width: number, height: number) => void
      resizeStart: (corner: Corner) => void
      resizeEnd: () => void
      zoomBy: (delta: number) => void
      loadTasks: () => Promise<Task[]>
      saveTasks: (tasks: Task[]) => Promise<void>
    }
  }
}
