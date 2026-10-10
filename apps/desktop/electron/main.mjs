import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Dev mode is opt-in via JARVIS_DEV=1 (the Dev launcher sets it).
// app.isPackaged is always false when running from node_modules, so it can't
// be the signal — using it made the production launcher load a dead Vite URL
// and show a blank chrome-error page.
const isDev = process.env.JARVIS_DEV === '1'
const VITE_DEV_URL = 'http://127.0.0.1:5174'

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0a0f1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  if (isDev) {
    mainWindow.loadURL(VITE_DEV_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('maximized-changed', true)
  })

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('maximized-changed', false)
  })
}

// ── IPC handlers ─────────────────────────────────────────────────────────
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on('window:close', () => mainWindow?.close())

// ── File system IPC ────────────────────────────────────────────────────
ipcMain.handle('selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  })
  if (result.canceled || !result.filePaths[0]) return null
  return result.filePaths[0]
})

ipcMain.handle('readDirectory', async (_event, dirPath) => {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
    return entries
      .filter(e => !e.name.startsWith('.git'))
      .sort((a, b) => {
        // folders first, then alphabetical
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      .map(e => ({ name: e.name, isDirectory: e.isDirectory() }))
  } catch (err) {
    return { error: err.message }
  }
})

// ── File read/write IPC ─────────────────────────────────────────────────
ipcMain.handle('readFile', async (_event, filePath) => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    return { content }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('writeFile', async (_event, filePath, content) => {
  try {
    await fs.promises.writeFile(filePath, content, 'utf-8')
    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
})

// ── Network IPC (renderer has no CORS privileges; main does) ──────────
ipcMain.handle('fetch:text', async (_event, url) => {
  try {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      return { ok: false, error: 'Only http(s) URLs are allowed' }
    }
    const res = await fetch(url, {
      headers: { 'User-Agent': 'JarvisMarkIII/3.0 (+desktop assistant)' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    const text = await res.text()
    return { ok: true, text }
  } catch (err) {
    return { ok: false, error: err?.message || String(err) }
  }
})

ipcMain.on('openExternal', (_event, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    shell.openExternal(url)
  }
})

// ── System stats (CPU / memory) ────────────────────────────────────────
let prevCpuInfo = os.cpus()
let prevCpuSampleAt = Date.now()
ipcMain.handle('getSystemStats', () => {
  const now = Date.now()
  const cur = os.cpus()
  const elapsed = (now - prevCpuSampleAt) * (cur[0]?.speed || 1)
  let idle = 0, total = 0
  for (let i = 0; i < cur.length; i++) {
    const p = cur[i].times
    const q = prevCpuInfo[i]?.times || p
    idle += p.idle - q.idle
    total += (p.user - q.user) + (p.nice - q.nice) + (p.sys - q.sys) + (p.idle - q.idle) + (p.irq - q.irq)
  }
  prevCpuInfo = cur
  prevCpuSampleAt = now
  const cpu = elapsed > 0 && total > 0 ? Math.max(0, Math.min(100, 100 - (idle / total) * 100)) : 0
  const mem = (1 - os.freemem() / os.totalmem()) * 100
  return { cpu, mem }
})

// ── App info ──────────────────────────────────────────────────────────
ipcMain.handle('getAppInfo', () => ({ version: app.getVersion(), electron: process.versions.electron }))

// ── App lifecycle ────────────────────────────────────────────────────────
app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
