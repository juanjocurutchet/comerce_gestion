/**
 * CRUD de licencias vía PostgREST con service role (misma idea que `main/license.js`).
 * Solo para PWA build admin; la clave en Vite queda en el bundle — no usar en sitios públicos.
 */

function generateLicenseKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `GCOM-${seg()}-${seg()}-${seg()}`
}

async function adminFetch(url, serviceKey, method, path, body) {
  const base = String(url || '').replace(/\/$/, '')
  const res = await fetch(`${base}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: body !== undefined && body !== null ? JSON.stringify(body) : undefined
  })
  const text = await res.text()
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const j = JSON.parse(text)
      detail = j.message || j.error_description || j.hint || j.details || j.code || detail
    } catch {
      if (text) detail = `${detail} — ${text.slice(0, 240)}`
    }
    throw new Error(detail)
  }
  if (method === 'DELETE' || res.status === 204) return null
  if (!text) return null
  return JSON.parse(text)
}

export async function licenseAdminGetAll({ url, serviceKey }) {
  try {
    const rows = await adminFetch(url, serviceKey, 'GET', 'licencias?select=*&order=created_at.desc', null)
    return { ok: true, data: Array.isArray(rows) ? rows : [] }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

export async function licenseAdminCreate({ url, serviceKey }, payload) {
  try {
    const rows = await adminFetch(url, serviceKey, 'POST', 'licencias', {
      ...payload,
      clave: generateLicenseKey()
    })
    const row = Array.isArray(rows) ? rows[0] : rows
    return { ok: true, data: row }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

export async function licenseAdminUpdate({ url, serviceKey }, id, payload) {
  try {
    const rows = await adminFetch(url, serviceKey, 'PATCH', `licencias?id=eq.${encodeURIComponent(id)}`, payload)
    const row = Array.isArray(rows) ? rows[0] : rows
    return { ok: true, data: row }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

export async function licenseAdminDelete({ url, serviceKey }, id) {
  try {
    await adminFetch(url, serviceKey, 'DELETE', `licencias?id=eq.${encodeURIComponent(id)}`, null)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

export async function licenseAdminListUpgradeRequests({ url, serviceKey }) {
  try {
    const rows = await adminFetch(
      url,
      serviceKey,
      'GET',
      'upgrade_requests?select=*&order=requested_at.desc',
      null
    )
    return { ok: true, data: Array.isArray(rows) ? rows : [] }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

export async function licenseAdminListCommerces({ url, serviceKey }) {
  try {
    const rows = await adminFetch(
      url,
      serviceKey,
      'GET',
      'commerces?select=id,nombre,activo&order=nombre.asc',
      null
    )
    return { ok: true, data: Array.isArray(rows) ? rows : [] }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}
