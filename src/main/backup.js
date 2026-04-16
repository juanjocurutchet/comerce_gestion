import { app, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { copyFileSync, readdirSync, unlinkSync, existsSync, mkdirSync, statSync } from 'fs'
import { configDB, getDb } from './db/index.js'
import {
  SNAPSHOT_STORE_INSERT_ORDER,
  getSnapshotDeleteOrder,
  parseWebSnapshotJson,
  buildSnapshotPayload,
  assertAllowedSnapshotTable
} from '../shared/webSnapshotFormat.js'

function getDbPath() {
  return join(app.getPath('userData'), 'comercio.db')
}

function getDefaultBackupDir() {
  return join(app.getPath('userData'), 'backups')
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function getBackupConfig() {
  const cfg = configDB.getAll()
  return {
    backupDir: cfg.backupDir || getDefaultBackupDir(),
    keepLast: parseInt(cfg.backupKeepLast || '10', 10),
    autoBackup: cfg.backupAuto !== 'false'
  }
}

function listBackups(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter(f => f.startsWith('comercio_backup_') && f.endsWith('.db'))
    .map(f => {
      const fullPath = join(dir, f)
      const stat = statSync(fullPath)
      return { name: f, path: fullPath, size: stat.size, fecha: stat.mtime.toISOString() }
    })
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
}

function runBackup(backupDir, keepLast) {
  ensureDir(backupDir)
  const dbPath = getDbPath()
  if (!existsSync(dbPath)) throw new Error('Base de datos no encontrada')

  const now = new Date()
  const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const destFile = join(backupDir, `comercio_backup_${ts}.db`)

  copyFileSync(dbPath, destFile)

  configDB.set('backupLastDate', now.toISOString())

  const all = listBackups(backupDir)
  if (all.length > keepLast) {
    all.slice(keepLast).forEach((b) => {
      try {
        unlinkSync(b.path)
      } catch {
        void 0
      }
    })
  }

  return { file: `comercio_backup_${ts}.db`, path: destFile, fecha: now.toISOString() }
}

function insertRowSqlite(db, table, row) {
  assertAllowedSnapshotTable(table)
  const keys = Object.keys(row).filter((k) => row[k] !== undefined)
  if (!keys.length) return
  const quoted = keys.map((k) => `"${String(k).replace(/"/g, '""')}"`).join(', ')
  const placeholders = keys.map(() => '?').join(', ')
  const sql = `INSERT INTO "${table}" (${quoted}) VALUES (${placeholders})`
  db.prepare(sql).run(...keys.map((k) => row[k]))
}

function exportWebSnapshotFromSqlite() {
  const db = getDb()
  const stores = {}
  for (const name of SNAPSHOT_STORE_INSERT_ORDER) {
    try {
      stores[name] = db.prepare(`SELECT * FROM "${name}"`).all()
    } catch {
      stores[name] = []
    }
  }
  const json = JSON.stringify(buildSnapshotPayload(stores))
  configDB.setMany({ backupLastDate: new Date().toISOString() })
  return { json }
}

function importWebSnapshotToSqlite(jsonText) {
  const parsed = parseWebSnapshotJson(jsonText)
  const { stores } = parsed
  const db = getDb()
  db.exec('PRAGMA foreign_keys = OFF')
  try {
    const tx = db.transaction(() => {
      for (const name of getSnapshotDeleteOrder()) {
        assertAllowedSnapshotTable(name)
        db.prepare(`DELETE FROM "${name}"`).run()
      }
      for (const name of SNAPSHOT_STORE_INSERT_ORDER) {
        const rows = stores[name]
        if (!Array.isArray(rows)) continue
        for (const row of rows) {
          insertRowSqlite(db, name, row)
        }
      }
    })
    tx()
  } finally {
    db.exec('PRAGMA foreign_keys = ON')
  }
  return true
}

export function setupBackup() {
  try {
    const cfg = getBackupConfig()
    if (!cfg.autoBackup) return

    const lastBackup = configDB.getAll().backupLastDate
    const now = Date.now()
    const last = lastBackup ? new Date(lastBackup).getTime() : 0
    const horasPasadas = (now - last) / 1000 / 3600

    if (horasPasadas >= 24) {
      runBackup(cfg.backupDir, cfg.keepLast)
    }
  } catch {
    void 0
  }

  ipcMain.handle('backup:run', async () => {
    try {
      const cfg = getBackupConfig()
      const result = runBackup(cfg.backupDir, cfg.keepLast)
      return { ok: true, data: result }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('backup:getList', async () => {
    try {
      const cfg = getBackupConfig()
      const cfg2 = configDB.getAll()
      return {
        ok: true,
        data: {
          backups: listBackups(cfg.backupDir),
          lastDate: cfg2.backupLastDate || null,
          backupDir: cfg.backupDir,
          keepLast: cfg.keepLast,
          autoBackup: cfg.autoBackup
        }
      }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('backup:chooseDir', async (event) => {
    const { BrowserWindow } = await import('electron')
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win, {
      title: 'Seleccionar carpeta de backups',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || !result.filePaths.length) return { ok: false }
    return { ok: true, data: result.filePaths[0] }
  })

  ipcMain.handle('backup:restore', async (event, backupPath) => {
    try {
      const dbPath = getDbPath()
      if (!existsSync(backupPath)) throw new Error('Archivo de backup no encontrado')
      const cfg = getBackupConfig()
      ensureDir(cfg.backupDir)
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      copyFileSync(dbPath, join(cfg.backupDir, `comercio_preRestore_${ts}.db`))
      copyFileSync(backupPath, dbPath)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('backup:delete', async (_event, backupPath) => {
    try {
      if (existsSync(backupPath)) unlinkSync(backupPath)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('backup:exportWeb', async () => {
    try {
      const data = exportWebSnapshotFromSqlite()
      return { ok: true, data }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('backup:importWeb', async (_event, jsonText) => {
    try {
      importWebSnapshotToSqlite(jsonText)
      return { ok: true, data: true }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })
}
