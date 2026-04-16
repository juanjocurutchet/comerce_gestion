/** Export / import de IndexedDB como un único JSON (respaldo web). */
import { initIndexedDB } from '../../../adapters/indexeddb/schema.js'
import { configDB } from '@shared/db/interface.js'
import {
  SNAPSHOT_FORMAT,
  SNAPSHOT_VERSION,
  SNAPSHOT_MAX_IMPORT_BYTES,
  SNAPSHOT_STORE_INSERT_ORDER,
  parseWebSnapshotJson,
  buildSnapshotPayload
} from '@shared/webSnapshotFormat.js'

export { SNAPSHOT_FORMAT, SNAPSHOT_VERSION, SNAPSHOT_MAX_IMPORT_BYTES, parseWebSnapshotJson }

const ALL_STORES = [...SNAPSHOT_STORE_INSERT_ORDER]

function openDb() {
  const clientName = typeof localStorage !== 'undefined' ? localStorage.getItem('clientName') || 'demo' : 'demo'
  return initIndexedDB(clientName)
}

function readAllStores(db) {
  return new Promise((resolve, reject) => {
    const out = {}
    let i = 0
    function next() {
      if (i >= ALL_STORES.length) {
        resolve(out)
        return
      }
      const name = ALL_STORES[i++]
      const tx = db.transaction(name, 'readonly')
      const req = tx.objectStore(name).getAll()
      req.onsuccess = () => {
        out[name] = req.result || []
        next()
      }
      req.onerror = () => reject(req.error)
    }
    next()
  })
}

/** @returns {Promise<string>} JSON del snapshot */
export async function exportWebSnapshot() {
  const db = await openDb()
  try {
    const stores = await readAllStores(db)
    const payload = buildSnapshotPayload(stores)
    const json = JSON.stringify(payload)
    await configDB.setMany({ backupLastDate: new Date().toISOString() })
    return json
  } finally {
    try {
      db.close()
    } catch {
      void 0
    }
  }
}

/** Reemplaza IndexedDB por el snapshot; invalida la conexión cacheada del adaptador. */
export async function importWebSnapshot(jsonText) {
  const parsed = parseWebSnapshotJson(jsonText)
  const { stores } = parsed

  const db = await openDb()
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(ALL_STORES, 'readwrite')
      tx.onerror = () => reject(tx.error)
      tx.oncomplete = () => resolve()

      for (const name of ALL_STORES) {
        tx.objectStore(name).clear()
      }
      for (const name of SNAPSHOT_STORE_INSERT_ORDER) {
        const rows = stores[name]
        if (!Array.isArray(rows)) continue
        const st = tx.objectStore(name)
        for (const row of rows) {
          st.put(row)
        }
      }
    })
  } finally {
    try {
      db.close()
    } catch {
      void 0
    }
  }

  const { resetIndexedDbCache } = await import('../../../adapters/indexeddb/index.js')
  resetIndexedDbCache()
}
