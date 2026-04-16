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
      } catch {
        writeStoredSession(null)
        return { configured: true, session: null }
      }
    },

    async signIn(email, password) {
      if (!configured) throw new Error('Supabase no está configurado en la PWA')
      if (!email || !password) throw new Error('Completá email y contraseña')
      return signInWithPassword(cfg, String(email).trim(), String(password))
    },

    async signOut() {
      const stored = readStoredSession()
      writeStoredSession(null)
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
    }
  }
}
