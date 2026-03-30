import { app, ipcMain } from 'electron'
import { machineIdSync } from 'node-machine-id'
import { join, extname } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

const GRACE_DAYS = 15
const CACHE_PATH = () => join(app.getPath('userData'), 'license_cache.json')

function loadSupabaseConfig() {
  const candidates = [
    join(process.resourcesPath, 'resources', 'supabase.json'),
    join(app.getAppPath(), '..', 'resources', 'supabase.json'),
    join(__dirname, '../../resources/supabase.json')
  ]
  for (const p of candidates) {
    if (existsSync(p)) {
      try { return JSON.parse(readFileSync(p, 'utf-8')) } catch {}
    }
  }
  return null
}

function readCache() {
  try {
    if (existsSync(CACHE_PATH())) return JSON.parse(readFileSync(CACHE_PATH(), 'utf-8'))
  } catch {}
  return null
}

function writeCache(data) {
  try { writeFileSync(CACHE_PATH(), JSON.stringify(data)) } catch {}
}

function daysSince(isoDate) {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000)
}

function daysUntil(isoDate) {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86400000)
}

async function fetchLicense(url, key, machineId) {
  const res = await fetch(
    `${url}/rest/v1/licencias?machine_id=eq.${encodeURIComponent(machineId)}&select=*`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    }
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const rows = await res.json()
  return rows[0] || null
}

async function checkLicense() {
  const cfg = loadSupabaseConfig()
  if (!cfg?.url || !cfg?.anonKey) {
    return { valid: false, reason: 'no_config' }
  }

  const machineId = machineIdSync()

  try {
    const row = await fetchLicense(cfg.url, cfg.anonKey, machineId)

    if (!row) {
      writeCache(null)
      return { valid: false, reason: 'not_found', offline: false }
    }

    const cache = { ...row, last_check: new Date().toISOString() }
    writeCache(cache)

    if (!row.activo) return { valid: false, reason: 'disabled', offline: false, clienteNombre: row.cliente_nombre }

    const days = daysUntil(row.vence_en)
    if (days < 0) return { valid: false, reason: 'expired', offline: false, vence_en: row.vence_en, clienteNombre: row.cliente_nombre }

    return { valid: true, offline: false, daysLeft: days, vence_en: row.vence_en, clienteNombre: row.cliente_nombre }

  } catch {
    const cache = readCache()
    if (!cache) return { valid: false, reason: 'not_found', offline: true }

    if (!cache.activo) return { valid: false, reason: 'disabled', offline: true }

    if (daysUntil(cache.vence_en) < 0) return { valid: false, reason: 'expired', offline: true, vence_en: cache.vence_en }

    const daysOffline = daysSince(cache.last_check)
    const grace = cache.grace_days ?? GRACE_DAYS
    if (daysOffline > grace) return { valid: false, reason: 'grace_exceeded', offline: true, daysOffline, grace }

    return {
      valid: true,
      offline: true,
      daysOffline,
      daysRemaining: grace - daysOffline,
      grace,
      vence_en: cache.vence_en,
      clienteNombre: cache.cliente_nombre
    }
  }
}

async function adminFetch(method, path, body, serviceKey, url) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' ? 'return=representation' : 'return=representation'
    },
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export function setupLicense() {
  ipcMain.handle('license:check', async () => {
    return await checkLicense()
  })

  ipcMain.handle('license:getAll', async () => {
    const cfg = loadSupabaseConfig()
    if (!cfg?.serviceKey) return { ok: false, error: 'Sin acceso admin' }
    try {
      const rows = await adminFetch('GET', 'licencias?select=*&order=created_at.desc', null, cfg.serviceKey, cfg.url)
      return { ok: true, data: rows }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('license:create', async (_e, payload) => {
    const cfg = loadSupabaseConfig()
    if (!cfg?.serviceKey) return { ok: false, error: 'Sin acceso admin' }
    try {
      const rows = await adminFetch('POST', 'licencias', payload, cfg.serviceKey, cfg.url)
      return { ok: true, data: rows[0] }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('license:update', async (_e, id, payload) => {
    const cfg = loadSupabaseConfig()
    if (!cfg?.serviceKey) return { ok: false, error: 'Sin acceso admin' }
    try {
      const rows = await adminFetch('PATCH', `licencias?id=eq.${id}`, payload, cfg.serviceKey, cfg.url)
      return { ok: true, data: rows[0] }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('license:delete', async (_e, id) => {
    const cfg = loadSupabaseConfig()
    if (!cfg?.serviceKey) return { ok: false, error: 'Sin acceso admin' }
    try {
      await adminFetch('DELETE', `licencias?id=eq.${id}`, null, cfg.serviceKey, cfg.url)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('license:getMachineId', () => {
    try { return machineIdSync() } catch { return null }
  })
}
