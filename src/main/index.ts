import { app, shell, BrowserWindow, ipcMain, Menu, Tray, nativeImage, screen } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { JsonFileStore } from './storage'

const MARGIN = 24 // gap between the widget and the screen edge
const LEFT_KEEP_CLEAR = 200 // desktop icons live on the left; the card never gets wider than the rest
const GLOW = 32 // body padding (16px each side) so the card's glow isn't clipped

let win: BrowserWindow
let tray: Tray // kept in a module variable so it isn't garbage-collected

// Where the widget sits. It remembers the edge on the side of the screen you dropped it,
// so when the board opens the card grows away from that edge instead of off-screen.
interface Spot {
  top: number
  left?: number
  right?: number
}
let spot: Spot
let locked = false // "Lock position" in the tray
let lastFit: Electron.Rectangle | undefined // where fitWindow last put the window

const stateFile = (): string => join(app.getPath('userData'), 'window-state.json')
const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi)

function loadWindowState(): void {
  const area = screen.getPrimaryDisplay().workArea
  spot = { top: area.y + MARGIN, right: area.x + area.width - MARGIN } // default: top-right
  try {
    const saved = JSON.parse(readFileSync(stateFile(), 'utf8'))
    const s = saved.spot
    if (typeof s?.top === 'number' && (typeof s.left === 'number' || typeof s.right === 'number')) {
      spot = s
    }
    locked = saved.locked === true
  } catch {
    // No file yet, or unreadable: keep the defaults.
  }
}

const saveWindowState = (): void => writeFileSync(stateFile(), JSON.stringify({ spot, locked }))

// Called when a drag ends: remember the new spot, anchored to the nearer side of the screen.
function rememberSpot(): void {
  const b = win.getBounds()
  // 'moved' also fires for our own resizes; only a real drag should change the spot.
  if (lastFit && b.x === lastFit.x && b.y === lastFit.y) return
  const area = screen.getDisplayMatching(b).workArea
  const onRightHalf = b.x + b.width / 2 > area.x + area.width / 2
  spot = onRightHalf ? { top: b.y, right: b.x + b.width } : { top: b.y, left: b.x }
  saveWindowState()
}

// Window bounds for a card of this size at the saved spot, kept fully on screen
// (handles a card that grew, or a monitor that was unplugged since last time).
function boundsFor(cardWidth: number, cardHeight: number): Electron.Rectangle {
  const anchorX = spot.right ?? spot.left ?? 0
  const area = screen.getDisplayNearestPoint({ x: anchorX, y: spot.top }).workArea
  const width = Math.min(Math.ceil(cardWidth) + GLOW, area.width - LEFT_KEEP_CLEAR - MARGIN)
  const height = Math.min(Math.ceil(cardHeight) + GLOW, area.height - 2 * MARGIN)
  const x = spot.right !== undefined ? spot.right - width : anchorX
  return {
    x: clamp(x, area.x, area.x + area.width - width),
    y: clamp(spot.top, area.y, area.y + area.height - height),
    width,
    height
  }
}

// Phase 1 "desktop widget": frameless, transparent, no taskbar entry, not on top,
// so normal windows cover it and it shows through when the desktop is visible.
// Phase 2 (WorkerW attach) will make it survive Win+D as well.
function createWindow(): void {
  win = new BrowserWindow({
    ...boundsFor(460, 760), // start at the saved spot; the renderer then fits the height
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // showInactive = appear without stealing focus from whatever you're doing.
  win.on('ready-to-show', () => win.showInactive())
  win.setMovable(!locked)
  win.on('moved', rememberSpot) // fires when a drag (by the clock, see App.tsx) ends

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// The renderer reports the card's size; shrink-wrap the window to it at the saved spot.
// Keeps the transparent window from blocking clicks on the desktop around the card.
function fitWindow(cardWidth: number, cardHeight: number): void {
  lastFit = boundsFor(cardWidth, cardHeight)
  win.setBounds(lastFit)
}

// In dev, Electron has to be told which app folder to run at login; the installed exe doesn't.
const loginItem = app.isPackaged ? {} : { path: process.execPath, args: [app.getAppPath()] }

const autoStartEnabled = (): boolean => app.getLoginItemSettings(loginItem).openAtLogin
const setAutoStart = (on: boolean): void =>
  app.setLoginItemSettings({ ...loginItem, openAtLogin: on })

// Turn auto-start on the very first time the app runs; after that the tray toggle decides.
function enableAutoStartOnFirstRun(): void {
  const marker = join(app.getPath('userData'), '.autostart-initialized')
  if (existsSync(marker)) return
  setAutoStart(true)
  writeFileSync(marker, '')
}

function toggleWindow(): void {
  if (win.isVisible()) win.hide()
  else win.showInactive()
}

function createTray(): void {
  tray = new Tray(nativeImage.createFromPath(icon).resize({ width: 16, height: 16 }))
  tray.setToolTip('Task Widget')
  tray.on('click', toggleWindow)
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show / Hide', click: toggleWindow },
      {
        label: 'Lock position',
        type: 'checkbox',
        checked: locked,
        click: (item) => {
          locked = item.checked
          win.setMovable(!locked)
          saveWindowState()
        }
      },
      {
        label: 'Start with Windows',
        type: 'checkbox',
        checked: autoStartEnabled(),
        click: (item) => setAutoStart(item.checked)
      },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ])
  )
}

// Only one widget at a time (e.g. auto-start plus a manual launch).
if (!app.requestSingleInstanceLock()) app.exit(0)

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('fit-window', (_, width: number, height: number) => fitWindow(width, height))

  // Tasks live in %APPDATA%/task-widget/tasks.json. Swap JsonFileStore for another TaskStore to change backends.
  const store = new JsonFileStore(join(app.getPath('userData'), 'tasks.json'))
  ipcMain.handle('tasks:load', () => store.load())
  ipcMain.handle('tasks:save', (_, tasks) => store.save(tasks))

  loadWindowState()
  createWindow()
  createTray()
  enableAutoStartOnFirstRun()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
