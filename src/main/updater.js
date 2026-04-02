import { ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'

autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

let mainWindow = null

export function setupUpdater(win) {
  if (process.windowsStore) return

  mainWindow = win

  const send = (event, data) => {
    if (mainWindow?.webContents && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send(event, data)
    }
  }

  autoUpdater.on('checking-for-update', () => {
    send('updater:checking')
  })

  autoUpdater.on('update-available', (info) => {
    send('updater:available', { version: info.version, releaseNotes: info.releaseNotes })
  })

  autoUpdater.on('update-not-available', () => {
    send('updater:not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    send('updater:progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    send('updater:downloaded', { version: info.version })
  })

  autoUpdater.on('error', (err) => {
    send('updater:error', { message: err.message })
  })

  ipcMain.handle('updater:check', async () => {
    try {
      await autoUpdater.checkForUpdates()
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })

  autoUpdater.checkForUpdatesAndNotify().catch(() => {})
}
