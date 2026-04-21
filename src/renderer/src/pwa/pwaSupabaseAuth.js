import { isLikelyNetworkFailure } from '@shared/web-license.js'
import { clearCloudUserSnapshot } from './cloudAuthSnapshot.js'

const STORAGE_KEY = 'gcom_supabase_session'

function buildHeaders(apiKey, extra = {}) {
  return {
    apikey: apiKey,
    'Content-Type': 'application/json',
    ...extra
  }
}

function readStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeStoredSession(session) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    void 0
  }
}

async function parseJsonResponse(res) {
  if (res.ok) {
    if (res.status === 204) return null
    return res.json()
  }
  let detail = `HTTP ${res.status}`
  try {
    const body = await res.json()
    detail = body?.msg || body?.message || body?.error_description || body?.error || detail
  } catch {
    void 0
  }
  throw new Error(detail)
}

function isExpired(session) {
  if (!session?.expires_at) return true
  return Date.now() >= Number(session.expires_at) * 1000
}

async function signInWithPassword(cfg, email, password) {
  const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: buildHeaders(cfg.anonKey),
    body: JSON.stringify({ email, password })
  })
  const data = await parseJsonResponse(res)
  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    expires_in: data.expires_in,
    token_type: data.token_type,
    user: data.user
  }
  writeStoredSession(session)
  return session
}

async function refreshSession(cfg, refreshToken) {
  if (!refreshToken) return null
  const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: buildHeaders(cfg.anonKey),
    body: JSON.stringify({ refresh_token: refreshToken })
  })
  const data = await parseJsonResponse(res)
  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    expires_in: data.expires_in,
    token_type: data.token_type,
    user: data.user
  }
  writeStoredSession(session)
  return session
}

export function createPwaSupabaseAuthApi(cfg) {
  const configured = Boolean(cfg?.url && cfg?.anonKey)

  return {
    async getSession() {
      if (!configured) return { configured: false, session: null }
      const stored = readStoredSession()
      if (!stored) return { configured: true, session: null }
      if (!isExpired(stored)) return { configured: true, session: stored }
      try {
        const refreshed = await refreshSession(cfg, stored.refresh_token)
        return { configured: true, session: refreshed }
      } catch (e) {
        const msg = e?.message || String(e)
        if (isLikelyNetworkFailure(e, msg) && stored) {
          return { configured: true, session: stored }
        }
        writeStoredSession(null)
        return { configured: true, session: null }
      }
    },

    async signIn(email, password) {
      if (!configured) throw new Error('Supabase no está configurado en la PWA')
      const em = String(email || '').trim()
      const pwd = String(password ?? '').trim()
      if (!em || !pwd) throw new Error('Completá email y contraseña')
      return signInWithPassword(cfg, em, pwd)
    },

    async signOut() {
      const stored = readStoredSession()
      writeStoredSession(null)
      clearCloudUserSnapshot()
      if (!configured || !stored?.access_token) return true
      try {
        await fetch(`${cfg.url}/auth/v1/logout`, {
          method: 'POST',
          headers: buildHeaders(cfg.anonKey, {
            Authorization: `Bearer ${stored.access_token}`
          })
        })
      } catch {
        void 0
      }
      return true
    },

    async getAccessToken() {
      const { session } = await this.getSession()
      return session?.access_token || null
    },

    async updatePassword(newPassword) {
      if (!configured) throw new Error('Supabase no está configurado en la PWA')
      const stored = readStoredSession()
      if (!stored?.access_token) throw new Error('Sin sesión')
      const pwd = String(newPassword || '').trim()
      if (pwd.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres')
      const res = await fetch(`${cfg.url}/auth/v1/user`, {
        method: 'PUT',
        headers: buildHeaders(cfg.anonKey, {
          Authorization: `Bearer ${stored.access_token}`,
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          password: pwd,
          data: { gcom_must_change_password: false }
        })
      })
      const data = await parseJsonResponse(res)
      const u = data?.user ?? data
      if (u && typeof u === 'object' && u.id) {
        const next = { ...stored, user: u }
        writeStoredSession(next)
      }
      return data
    },

    async getMemberships() {
      if (!configured) throw new Error('Supabase no está configurado en la PWA')
      const token = await this.getAccessToken()
      if (!token) return []
      const params = new URLSearchParams()
      params.set('select', 'commerce_id,role,activo')
      params.set('activo', 'eq.true')
      const res = await fetch(`${cfg.url}/rest/v1/user_commerces?${params.toString()}`, {
        headers: buildHeaders(cfg.anonKey, {
          Authorization: `Bearer ${token}`
        })
      })
      const rows = await parseJsonResponse(res)
      return Array.isArray(rows) ? rows : []
    },

    async getLicenseAdminFromJwt() {
      if (!configured) return false
      const token = await this.getAccessToken()
      if (!token) return false
      try {
        const res = await fetch(`${cfg.url}/rest/v1/rpc/license_admin_from_jwt`, {
          method: 'POST',
          headers: buildHeaders(cfg.anonKey, {
            Authorization: `Bearer ${token}`
          }),
          body: '{}'
        })
        if (!res.ok) return false
        const data = await res.json()
        return data === true || data === 'true' || data === 't'
      } catch {
        return false
      }
    }
  }
}
