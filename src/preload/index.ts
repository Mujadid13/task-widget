import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Corner, Task } from '../renderer/src/types'

// Custom APIs for renderer
const api = {
  /** Ask the main process to resize the window to fit the card. */
  fitWindow: (width: number, height: number): void => ipcRenderer.send('fit-window', width, height),
  /** Corner grip: the main process follows the cursor between these two calls. */
  resizeStart: (corner: Corner): void => ipcRenderer.send('resize-start', corner),
  resizeEnd: (): void => ipcRenderer.send('resize-end'),
  /** Scale the widget up or down by a step (keyboard resizing). */
  zoomBy: (delta: number): void => ipcRenderer.send('zoom-by', delta),
  loadTasks: (): Promise<Task[]> => ipcRenderer.invoke('tasks:load'),
  saveTasks: (tasks: Task[]): Promise<void> => ipcRenderer.invoke('tasks:save', tasks)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
