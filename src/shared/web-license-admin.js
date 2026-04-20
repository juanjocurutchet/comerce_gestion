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

async function adminFetchAsUser(url, anonKey, accessToken, method, path, body) {
  const base = String(url || '').replace(/\/$/, '')
  const res = await fetch(`${base}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
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

function adminBackendPath() {
  const p =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_ONBOARDING_API_PATH
      ? String(import.meta.env.VITE_ADMIN_ONBOARDING_API_PATH)
      : '/api/admin-onboarding'
  return p.replace(/\/$/, '') || '/api/admin-onboarding'
}

async function postAdminOnboarding(accessToken, body) {
  const res = await fetch(adminBackendPath(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const j = JSON.parse(text)
      detail = j.message || j.error_description || j.hint || j.details || j.error || detail
    } catch {
      if (text) detail = `${detail} — ${text.slice(0, 240)}`
    }
    throw new Error(detail)
  }
  if (!text) return { ok: false, error: 'Respuesta vacía del servidor' }
  const parsed = JSON.parse(text)
  const outer = Array.isArray(parsed) ? parsed[0] : parsed
  if (outer && typeof outer === 'object' && outer.ok === false) {
    const hint = outer.hint ? ` ${String(outer.hint)}` : ''
    return { ok: false, error: `${outer.error || 'Error'}${hint}`, raw: outer }
  }
  const payload =
    outer && typeof outer === 'object' && outer.ok === true && outer.data !== undefined
      ? outer.data
      : outer
  return { ok: true, data: payload }
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

export async function licenseAdminGetAllAsUser({ url, anonKey, accessToken }) {
  try {
    const rows = await adminFetchAsUser(
      url,
      anonKey,
      accessToken,
      'GET',
      'licencias?select=*&order=created_at.desc',
      null
    )
    return { ok: true, data: Array.isArray(rows) ? rows : [] }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

export async function licenseAdminCreateAsUser({ url, anonKey, accessToken }, payload) {
  try {
    const rows = await adminFetchAsUser(url, anonKey, accessToken, 'POST', 'licencias', {
      ...payload,
      clave: generateLicenseKey()
    })
    const row = Array.isArray(rows) ? rows[0] : rows
    return { ok: true, data: row }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

export async function licenseAdminUpdateAsUser({ url, anonKey, accessToken }, id, payload) {
  try {
    const rows = await adminFetchAsUser(
      url,
      anonKey,
      accessToken,
      'PATCH',
      `licencias?id=eq.${encodeURIComponent(id)}`,
      payload
    )
    const row = Array.isArray(rows) ? rows[0] : rows
    return { ok: true, data: row }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

export async function licenseAdminDeleteAsUser({ url, anonKey, accessToken }, id) {
  try {
    await adminFetchAsUser(
      url,
      anonKey,
      accessToken,
      'DELETE',
      `licencias?id=eq.${encodeURIComponent(id)}`,
      null
    )
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

export async function licenseAdminListUpgradeRequestsAsUser({ url, anonKey, accessToken }) {
  try {
    const rows = await adminFetchAsUser(
      url,
      anonKey,
      accessToken,
      'GET',
      'upgrade_requests?select=*&order=requested_at.desc',
      null
    )
    return { ok: true, data: Array.isArray(rows) ? rows : [] }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

export async function licenseAdminListCommercesAsUser({ url, anonKey, accessToken }) {
  try {
    const rows = await adminFetchAsUser(
      url,
      anonKey,
      accessToken,
      'GET',
      'commerces?select=id,nombre,activo&order=nombre.asc',
      null
    )
    return { ok: true, data: Array.isArray(rows) ? rows : [] }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

export async function licenseAdminListDemoOnboardingAsUser({ url, anonKey, accessToken }) {
  try {
    const rows = await adminFetchAsUser(
      url,
      anonKey,
      accessToken,
      'GET',
      'demo_onboarding_requests?select=*&order=created_at.desc',
      null
    )
    return { ok: true, data: Array.isArray(rows) ? rows : [] }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

export async function licenseAdminProvisionDemoRequestAsUser(
  { accessToken },
  requestId,
  membershipRole = 'owner',
  options = {}
) {
  try {
    return await postAdminOnboarding(accessToken, {
      op: 'provision_demo_request',
      requestId,
      membershipRole,
      ...options
    })
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

export async function licenseAdminProvisionManualDemoAsUser({ accessToken }, payload) {
  try {
    const {
      email,
      businessName,
      membershipRole = 'owner',
      demoDays,
      password,
      createLicense
    } = payload || {}
    return await postAdminOnboarding(accessToken, {
      op: 'provision_manual',
      email,
      businessName,
      membershipRole,
      demoDays,
      password,
      createLicense
    })
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

export async function licenseAdminUpdateDemoOnboardingMessageAsUser(
  { url, anonKey, accessToken },
  id,
  deliveryMessage
) {
  try {
    const rows = await adminFetchAsUser(
      url,
      anonKey,
      accessToken,
      'PATCH',
      `demo_onboarding_requests?id=eq.${encodeURIComponent(id)}`,
      { delivery_message: String(deliveryMessage || '') }
    )
    const row = Array.isArray(rows) ? rows[0] : rows
    return { ok: true, data: row }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

export async function licenseAdminDeleteDemoOnboardingAsUser({ url, anonKey, accessToken }, id) {
  try {
    await adminFetchAsUser(
      url,
      anonKey,
      accessToken,
      'DELETE',
      `demo_onboarding_requests?id=eq.${encodeURIComponent(id)}`,
      null
    )
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

export async function licenseAdminDeleteDemoOnboardingFullAsUser({ accessToken }, payload) {
  try {
    return await postAdminOnboarding(accessToken, {
      op: 'delete_onboarding_full',
      requestId: payload?.requestId,
      commerceId: payload?.commerceId,
      activationKey: payload?.activationKey
    })
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

export async function licenseAdminDeleteLicenseFullAsUser({ accessToken }, payload) {
  try {
    return await postAdminOnboarding(accessToken, {
      op: 'delete_license_full',
      licenseId: payload?.licenseId,
      commerceId: payload?.commerceId,
      activationKey: payload?.activationKey
    })
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}
