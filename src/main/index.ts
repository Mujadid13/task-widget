import { app, shell, BrowserWindow, ipcMain, Menu, Tray, nativeImage, screen } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { JsonFileStore } from './storage'
import type { Corner } from '../renderer/src/types'

const MARGIN = 24 // gap between the widget and the screen edge
const LEFT_KEEP_CLEAR = 200 // desktop icons live on the left; the card never gets wider than the rest
const GLOW = 32 // body padding (16px each side) so the card's glow isn't clipped
const MIN_ZOOM = 0.6
const MAX_ZOOM = 2

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
let zoom = 1 // widget scale, changed with the corner grip (see App.tsx) and saved
let lastCard = { width: 460, height: 760 } // card size in CSS px, as last reported
let resizeTimer: ReturnType<typeof setInterval> | undefined

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
    if (typeof saved.zoom === 'number') zoom = clamp(saved.zoom, MIN_ZOOM, MAX_ZOOM)
  } catch {
    // No file yet, or unreadable: keep the defaults.
  }
}

const saveWindowState = (): void =>
  writeFileSync(stateFile(), JSON.stringify({ spot, locked, zoom }))

// The spot for these bounds, anchored to the nearer side of the screen.
function spotFor(b: Electron.Rectangle): Spot {
  const area = screen.getDisplayMatching(b).workArea
  const onRightHalf = b.x + b.width / 2 > area.x + area.width / 2
  return onRightHalf ? { top: b.y, right: b.x + b.width } : { top: b.y, left: b.x }
}

// Called when a drag ends: remember the new spot.
function rememberSpot(): void {
  const b = win.getBounds()
  // 'moved' also fires for our own resizes; only a real drag should change the spot.
  if (lastFit && b.x === lastFit.x && b.y === lastFit.y) return
  spot = spotFor(b)
  saveWindowState()
}

// Window bounds for a card of this size (CSS px, scaled by zoom) at the saved spot, kept fully
// on screen (handles a card that grew, or a monitor that was unplugged since last time).
function boundsFor(cardWidth: number, cardHeight: number): Electron.Rectangle {
  const anchorX = spot.right ?? spot.left ?? 0
  const area = screen.getDisplayNearestPoint({ x: anchorX, y: spot.top }).workArea
  const width = Math.min(
    Math.ceil((cardWidth + GLOW) * zoom),
    area.width - LEFT_KEEP_CLEAR - MARGIN
  )
  const height = Math.min(Math.ceil((cardHeight + GLOW) * zoom), area.height - 2 * MARGIN)
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
  win.webContents.on('did-finish-load', () => win.webContents.setZoomFactor(zoom))

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
  lastCard = { width: cardWidth, height: cardHeight }
  lastFit = boundsFor(cardWidth, cardHeight)
  win.setBounds(lastFit)
}

// Scale the whole widget. The card's CSS size doesn't change with zoom, so refit the window here.
// keepBottom pins the bottom edge (resizing from a top corner); otherwise the top stays put.
function applyZoom(z: number, keepBottom?: number): void {
  const next = clamp(Math.round(z * 100) / 100, MIN_ZOOM, MAX_ZOOM)
  if (next === zoom) return
  zoom = next
  win.webContents.setZoomFactor(zoom)
  if (keepBottom !== undefined) {
    spot.top = keepBottom - boundsFor(lastCard.width, lastCard.height).height
  }
  fitWindow(lastCard.width, lastCard.height)
}

const isCorner = (c: unknown): c is Corner =>
  c === 'top-left' || c === 'top-right' || c === 'bottom-left' || c === 'bottom-right'

// Corner-grip drag: follow the real cursor until the renderer says the mouse was released.
// Screen coordinates are unaffected by the page's own zoom, which changes during the drag.
// The dragged corner's horizontal edge tracks the cursor; the opposite corner stays put.
function startResize(corner: Corner): void {
  stopResize()
  const b = win.getBounds()
  const fromTop = corner.startsWith('top')
  // Anchor to the side opposite the grip, so the widget grows toward the cursor.
  spot = corner.endsWith('left') ? { top: b.y, right: b.x + b.width } : { top: b.y, left: b.x }
  const bottom = b.y + b.height
  const start = { y: screen.getCursorScreenPoint().y, height: b.height, zoom }
  resizeTimer = setInterval(() => {
    const dy = (screen.getCursorScreenPoint().y - start.y) * (fromTop ? -1 : 1) // outward = bigger
    applyZoom((start.zoom * (start.height + dy)) / start.height, fromTop ? bottom : undefined)
  }, 16)
}

function stopResize(): void {
  if (!resizeTimer) return
  clearInterval(resizeTimer)
  resizeTimer = undefined
  spot = spotFor(win.getBounds()) // back to the usual nearer-side anchor for board growth
  saveWindowState()
}

// One fixed entry name, so dev and installed copies share a single login entry instead of
// adding one each. In dev, Electron also has to be told which app folder to run; the exe doesn't.
const loginItem = {
  name: 'TaskWidget',
  ...(app.isPackaged ? {} : { path: process.execPath, args: [app.getAppPath()] })
}

const autoStartEnabled = (): boolean => app.getLoginItemSettings(loginItem).openAtLogin
const setAutoStart = (on: boolean): void =>
  app.setLoginItemSettings({ ...loginItem, openAtLogin: on })

// An installed copy turns auto-start on the first time it runs; after that the tray toggle decides.
// The marker records which exe did it, because dev runs share this data folder and must not make
// a fresh install skip the step. Dev runs never turn auto-start on by themselves.
function enableAutoStartOnFirstRun(): void {
  if (!app.isPackaged) return
  const marker = join(app.getPath('userData'), '.autostart-initialized')
  if (existsSync(marker) && readFileSync(marker, 'utf8') === process.execPath) return
  setAutoStart(true)
  writeFileSync(marker, process.execPath)
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
        label: 'Reset size',
        click: () => {
          applyZoom(1)
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
  electronApp.setAppUserModelId('com.mujadidsana.taskwidget') // must match appId in electron-builder.yml

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('fit-window', (_, width: number, height: number) => fitWindow(width, height))
  ipcMain.on('resize-start', (_, corner: unknown) => isCorner(corner) && startResize(corner))
  ipcMain.on('resize-end', stopResize)
  ipcMain.on('zoom-by', (_, delta: number) => {
    applyZoom(zoom + delta)
    saveWindowState()
  })

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
