import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Task } from '../renderer/src/types'

// Custom APIs for renderer
const api = {
  /** Ask the main process to resize the window to fit the card. */
  fitWindow: (width: number, height: number): void => ipcRenderer.send('fit-window', width, height),
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
