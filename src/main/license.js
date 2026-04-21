import { app, ipcMain } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs'

const GRACE_DAYS = 15
const CACHE_PATH = () => join(app.getPath('userData'), 'license_cache.json')
const KEY_PATH   = () => join(app.getPath('userData'), 'license_key.json')

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

function readStoredKey() {
  try {
    if (existsSync(KEY_PATH())) return JSON.parse(readFileSync(KEY_PATH(), 'utf-8')).key
  } catch {}
  return null
}

function writeStoredKey(key) {
  try {
    if (key == null || key === '') {
      if (existsSync(KEY_PATH())) unlinkSync(KEY_PATH())
      return
    }
    writeFileSync(KEY_PATH(), JSON.stringify({ key }))
  } catch {}
}

function daysSince(isoDate) {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000)
}

function daysUntil(isoDate) {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86400000)
}

async function fetchByKey(url, anonKey, licenseKey) {
  const res = await fetch(
    `${url}/rest/v1/licencias?clave=eq.${encodeURIComponent(licenseKey)}&select=*`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      }
    }
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const rows = await res.json()
  return rows[0] || null
}

async function adminFetch(method, path, body, serviceKey, url) {
  const base = String(url || '').replace(/\/$/, '')
  const res = await fetch(`${base}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const text = await res.text()
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const j = JSON.parse(text)
      detail = j.message || j.error_description || j.hint || j.details || j.code || detail
      if (typeof j === 'object' && j !== null && !j.message && text.length < 400) {
        detail = `${detail}: ${text}`
      }
    } catch {
      if (text) detail = `${detail} — ${text.slice(0, 240)}`
    }
    throw new Error(detail)
  }
  if (!text) return null
  return JSON.parse(text)
}

async function checkLicense() {
  const cfg = loadSupabaseConfig()
  if (!cfg?.url || !cfg?.anonKey) return { valid: false, reason: 'no_config' }

  const licenseKey = readStoredKey()
  if (!licenseKey) return { valid: false, reason: 'no_key' }

  try {
    const row = await fetchByKey(cfg.url, cfg.anonKey, licenseKey)

    if (!row) {
      writeStoredKey(null)
      writeCache(null)
      return { valid: false, reason: 'not_found', offline: false }
    }

    if (!row.activo) {
      writeStoredKey(null)
      writeCache(null)
      return { valid: false, reason: 'disabled', offline: false, clientName: row.cliente_nombre }
    }

    const days = daysUntil(row.vence_en)
    if (days < 0) {
      writeStoredKey(null)
      writeCache(null)
      return { valid: false, reason: 'expired', offline: false, vence_en: row.vence_en, clientName: row.cliente_nombre }
    }

    writeCache({ ...row, last_check: new Date().toISOString() })

    return { valid: true, offline: false, daysLeft: days, vence_en: row.vence_en, clientName: row.cliente_nombre, features: row.features || null }

  } catch {
    const cache = readCache()
    if (!cache) return { valid: false, reason: 'not_found', offline: true }
    if (!cache.activo) return { valid: false, reason: 'disabled', offline: true }
    if (daysUntil(cache.vence_en) < 0) return { valid: false, reason: 'expired', offline: true }

    const daysOffline = daysSince(cache.last_check)
    const grace = cache.grace_days ?? GRACE_DAYS
    if (daysOffline > grace) return { valid: false, reason: 'grace_exceeded', offline: true, daysOffline, grace }

    return { valid: true, offline: true, daysOffline, daysRemaining: grace - daysOffline, grace, vence_en: cache.vence_en, clientName: cache.cliente_nombre, features: cache.features || null }
  }
}

function generateKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `GCOM-${seg()}-${seg()}-${seg()}`
}

export function setupLicense() {
  ipcMain.handle('license:check', async () => checkLicense())

  ipcMain.handle('license:getStoredKey', () => readStoredKey())

  ipcMain.handle('license:activate', async (_e, key) => {
    const cfg = loadSupabaseConfig()
    if (!cfg?.url || !cfg?.anonKey) return { ok: false, error: 'Sin configuración de servidor' }
    try {
      const row = await fetchByKey(cfg.url, cfg.anonKey, key.trim().toUpperCase())
      if (!row) return { ok: false, error: 'Clave no encontrada. Verificá que sea correcta.' }
      if (!row.activo) return { ok: false, error: 'Esta clave fue desactivada. Contactá al soporte.' }
      if (daysUntil(row.vence_en) < 0) return { ok: false, error: 'Esta clave está vencida. Renovála para continuar.' }
      writeStoredKey(key.trim().toUpperCase())
      writeCache({ ...row, last_check: new Date().toISOString() })
      return { ok: true, clientName: row.cliente_nombre }
    } catch {
      return { ok: false, error: 'Sin conexión a internet. Necesitás conexión para activar la app por primera vez.' }
    }
  })

  ipcMain.handle('license:getAll', async () => {
    const cfg = loadSupabaseConfig()
    if (!cfg?.serviceKey) return { ok: false, error: 'Sin acceso admin' }
    try {
      const rows = await adminFetch('GET', 'licencias?select=*&order=created_at.desc', null, cfg.serviceKey, cfg.url)
      return { ok: true, data: rows }
    } catch (e) { return { ok: false, error: e.message } }
  })

  ipcMain.handle('license:create', async (_e, payload) => {
    const cfg = loadSupabaseConfig()
    if (!cfg?.serviceKey) return { ok: false, error: 'Sin acceso admin' }
    try {
      const data = await adminFetch('POST', 'licencias', { ...payload, clave: generateKey() }, cfg.serviceKey, cfg.url)
      const row = Array.isArray(data) ? data[0] : data
      return { ok: true, data: row }
    } catch (e) { return { ok: false, error: e.message } }
  })

  ipcMain.handle('license:update', async (_e, id, payload) => {
    const cfg = loadSupabaseConfig()
    if (!cfg?.serviceKey) return { ok: false, error: 'Sin acceso admin' }
    try {
      const data = await adminFetch('PATCH', `licencias?id=eq.${encodeURIComponent(id)}`, payload, cfg.serviceKey, cfg.url)
      const row = Array.isArray(data) ? data[0] : data
      return { ok: true, data: row }
    } catch (e) { return { ok: false, error: e.message } }
  })

  ipcMain.handle('license:delete', async (_e, id) => {
    const cfg = loadSupabaseConfig()
    if (!cfg?.serviceKey) return { ok: false, error: 'Sin acceso admin' }
    try {
      await adminFetch('DELETE', `licencias?id=eq.${id}`, null, cfg.serviceKey, cfg.url)
      return { ok: true }
    } catch (e) { return { ok: false, error: e.message } }
  })

  ipcMain.handle('license:listUpgradeRequests', async () => {
    const cfg = loadSupabaseConfig()
    if (!cfg?.serviceKey) return { ok: false, error: 'Sin acceso admin' }
    try {
      const rows = await adminFetch('GET', 'upgrade_requests?select=*&order=requested_at.desc', null, cfg.serviceKey, cfg.url)
      return { ok: true, data: rows }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('license:listCommerces', async () => {
    const cfg = loadSupabaseConfig()
    if (!cfg?.serviceKey) return { ok: false, error: 'Sin acceso admin' }
    try {
      const rows = await adminFetch('GET', 'commerces?select=*&order=created_at.desc', null, cfg.serviceKey, cfg.url)
      return { ok: true, data: rows }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('license:listCommerceDeactivationHistory', async () => {
    const cfg = loadSupabaseConfig()
    if (!cfg?.serviceKey) return { ok: false, error: 'Sin acceso admin' }
    try {
      const rows = await adminFetch(
        'GET',
        'commerce_deactivation_history?select=*&order=created_at.desc',
        null,
        cfg.serviceKey,
        cfg.url
      )
      return { ok: true, data: Array.isArray(rows) ? rows : [] }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('license:requestUpgrade', async (_e, payload) => {
    const cfg = loadSupabaseConfig()
    if (!cfg?.url || !cfg?.anonKey) return { ok: false, error: 'Sin configuración de servidor' }
    try {
      const res = await fetch(`${cfg.url}/rest/v1/upgrade_requests`, {
        method: 'POST',
        headers: {
          apikey: cfg.anonKey,
          Authorization: `Bearer ${cfg.anonKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          ...payload,
          requested_at: new Date().toISOString()
        })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message || 'No se pudo enviar la solicitud.' }
    }
  })
}
