/** Licencia vía Supabase REST (`licencias`); solo anon key, nunca service_role en el bundle. */

export const LICENSE_GRACE_DAYS_DEFAULT = 15

export function daysSince(isoDate) {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000)
}

export function daysUntil(isoDate) {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86400000)
}

export async function fetchLicenseRow(url, anonKey, licenseKey) {
  const base = String(url || '').replace(/\/$/, '')
  const res = await fetch(
    `${base}/rest/v1/licencias?clave=eq.${encodeURIComponent(licenseKey)}&select=*`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      }
    }
  )
  const text = await res.text()
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const j = JSON.parse(text)
      detail = j.message || j.hint || j.details || j.code || detail
    } catch {
      if (text) detail = `${detail}: ${text.slice(0, 200)}`
    }
    throw new Error(detail)
  }
  if (!text) return null
  const rows = JSON.parse(text)
  return Array.isArray(rows) ? rows[0] || null : null
}

/** Valida licencia contra Supabase; `storage` persiste clave y caché. */
export async function checkLicenseWeb(cfg, storage) {
  let url
  let anonKey
  try {
    ;({ url, anonKey } = assertSupabasePublicCfg(cfg))
  } catch {
    return { valid: false, reason: 'no_config' }
  }

  const licenseKey = storage.readKey()
  if (!licenseKey) return { valid: false, reason: 'no_key' }

  try {
    const row = await fetchLicenseRow(url, anonKey, licenseKey)

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

function assertSupabasePublicCfg(cfg) {
  const url = String(cfg?.url || '').trim().replace(/\/$/, '')
  const anonKey = String(cfg?.anonKey || '').trim()
  if (!url || !anonKey) {
    throw new Error(
      'Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el build de la PWA. En Vercel: Project → Settings → Environment Variables, guardá y hacé Redeploy.'
    )
  }
  if (!/^https:\/\//i.test(url)) {
    throw new Error('VITE_SUPABASE_URL debe ser https://… (ej. https://TU-PROYECTO.supabase.co sin /rest al final).')
  }
  if (anonKey.length < 20) {
    throw new Error('VITE_SUPABASE_ANON_KEY no parece válida (demasiado corta). Copiala de Supabase → Project Settings → API.')
  }
  return { url, anonKey }
}

/** Activa y persiste `rawKey` si existe y está vigente en Supabase. */
export async function activateLicenseWeb(cfg, rawKey, storage) {
  let safeCfg
  try {
    safeCfg = assertSupabasePublicCfg(cfg)
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
  const key = rawKey.trim().toUpperCase()
  try {
    const row = await fetchLicenseRow(safeCfg.url, safeCfg.anonKey, key)
    if (!row) return { ok: false, error: 'Clave no encontrada. Verificá que sea correcta.' }
    if (!row.activo) return { ok: false, error: 'Esta clave fue desactivada. Contactá al soporte.' }
    if (daysUntil(row.vence_en) < 0) {
      return { ok: false, error: 'Esta clave está vencida. Renovála para continuar.' }
    }
    storage.writeKey(key)
    storage.writeCache({ ...row, last_check: new Date().toISOString() })
    return { ok: true, clientName: row.cliente_nombre }
  } catch (e) {
    const msg = e?.message || String(e)
    if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
      return {
        ok: false,
        error:
          'Sin conexión o el navegador bloqueó la petición a Supabase. Revisá internet, bloqueadores y que VITE_SUPABASE_URL sea https://TU-PROYECTO.supabase.co (sin /rest al final).'
      }
    }
    return {
      ok: false,
      error: `${msg}. En Vercel verificá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY; en Supabase que anon pueda SELECT en public.licencias (si hay RLS, ejecutá supabase/licencias-rls-anon-select.sql).`
    }
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
