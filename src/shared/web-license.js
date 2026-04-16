/** Licencia vía Supabase REST (`licencias`); solo anon key, nunca service_role en el bundle. */

export const LICENSE_GRACE_DAYS_DEFAULT = 15

export function daysSince(isoDate) {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000)
}

export function daysUntil(isoDate) {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86400000)
}

export async function fetchLicenseRow(url, anonKey, licenseKey) {
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

/** Valida licencia contra Supabase; `storage` persiste clave y caché. */
export async function checkLicenseWeb(cfg, storage) {
  if (!cfg?.url || !cfg?.anonKey) {
    return { valid: false, reason: 'no_config' }
  }

  const licenseKey = storage.readKey()
  if (!licenseKey) return { valid: false, reason: 'no_key' }

  try {
    const row = await fetchLicenseRow(cfg.url, cfg.anonKey, licenseKey)

    if (!row) {
      storage.writeCache(null)
      return { valid: false, reason: 'not_found', offline: false }
    }

    storage.writeCache({ ...row, last_check: new Date().toISOString() })

    if (!row.activo) {
      return { valid: false, reason: 'disabled', offline: false, clientName: row.cliente_nombre }
    }

    const days = daysUntil(row.vence_en)
    if (days < 0) {
      return {
        valid: false,
        reason: 'expired',
        offline: false,
        vence_en: row.vence_en,
        clientName: row.cliente_nombre
      }
    }

    return {
      valid: true,
      offline: false,
      daysLeft: days,
      vence_en: row.vence_en,
      clientName: row.cliente_nombre,
      features: row.features || null
    }
  } catch {
    const cache = storage.readCache()
    if (!cache) return { valid: false, reason: 'not_found', offline: true }
    if (!cache.activo) return { valid: false, reason: 'disabled', offline: true }
    if (daysUntil(cache.vence_en) < 0) {
      return { valid: false, reason: 'expired', offline: true }
    }

    const daysOffline = daysSince(cache.last_check)
    const grace = cache.grace_days ?? LICENSE_GRACE_DAYS_DEFAULT
    if (daysOffline > grace) {
      return { valid: false, reason: 'grace_exceeded', offline: true, daysOffline, grace }
    }

    return {
      valid: true,
      offline: true,
      daysOffline,
      daysRemaining: grace - daysOffline,
      grace,
      vence_en: cache.vence_en,
      clientName: cache.cliente_nombre,
      features: cache.features || null
    }
  }
}

/** Activa y persiste `rawKey` si existe y está vigente en Supabase. */
export async function activateLicenseWeb(cfg, rawKey, storage) {
  if (!cfg?.url || !cfg?.anonKey) {
    return { ok: false, error: 'Sin configuración de servidor' }
  }
  const key = rawKey.trim().toUpperCase()
  try {
    const row = await fetchLicenseRow(cfg.url, cfg.anonKey, key)
    if (!row) return { ok: false, error: 'Clave no encontrada. Verificá que sea correcta.' }
    if (!row.activo) return { ok: false, error: 'Esta clave fue desactivada. Contactá al soporte.' }
    if (daysUntil(row.vence_en) < 0) {
      return { ok: false, error: 'Esta clave está vencida. Renovála para continuar.' }
    }
    storage.writeKey(key)
    storage.writeCache({ ...row, last_check: new Date().toISOString() })
    return { ok: true, clientName: row.cliente_nombre }
  } catch {
    return { ok: false, error: 'Sin conexión a internet. Necesitás conexión para activar la app por primera vez.' }
  }
}

export async function requestUpgradeWeb(cfg, payload) {
  if (!cfg?.url || !cfg?.anonKey) {
    return { ok: false, error: 'Sin configuración de servidor' }
  }
  try {
    const res = await fetch(`${cfg.url}/rest/v1/upgrade_requests`, {
      method: 'POST',
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        ...payload,
        requested_at: new Date().toISOString()
      })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { ok: true }
  } catch {
    return { ok: false, error: 'No se pudo enviar la solicitud de upgrade.' }
  }
}
