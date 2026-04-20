/** Quita comillas si alguien pegó el valor como `"https://..."` en Vercel o en .env. */
function unwrapQuotedEnv(value) {
  let s = String(value ?? '').trim()
  while (s.length >= 2) {
    const a = s[0]
    const b = s[s.length - 1]
    if ((a === '"' && b === '"') || (a === "'" && b === "'")) s = s.slice(1, -1).trim()
    else break
  }
  return s
}

/** Configuración pública Supabase para el build PWA (Vite). */
export function getPublicSupabaseConfig() {
  const url = unwrapQuotedEnv(import.meta.env?.VITE_SUPABASE_URL)
    .replace(/\/$/, '')
  const anonKey = unwrapQuotedEnv(import.meta.env?.VITE_SUPABASE_ANON_KEY)
  return { url, anonKey }
}

/** URL pública de la PWA (panel Licencias). En build: `VITE_PUBLIC_DEMO_URL`. En Electron: `resources/client.json` → publicDemoUrl. */
export function getPwaPublicDemoUrl() {
  return unwrapQuotedEnv(import.meta.env?.VITE_PUBLIC_DEMO_URL)
}

/** Si es true, la PWA se comporta como build interno (sin gate de licencia comercial; solo entornos cerrados). */
export function isPwaAdminBuild() {
  return import.meta.env?.VITE_PWA_ADMIN === 'true'
}

/**
 * Emails (Supabase Auth) autorizados para menú admin y panel de licencias en PWA.
 * Separados por coma; comparación sin mayúsculas. Sin tabla en BD por ahora.
 */
export function getPwaAdminEmailAllowlist() {
  const raw = import.meta.env?.VITE_PWA_ADMIN_EMAILS
  if (raw == null || String(raw).trim() === '') return []
  return String(raw)
    .split(/[,;\n]+/)
    .map((e) => unwrapQuotedEnv(e).toLowerCase().trim())
    .filter(Boolean)
}

export function hasPwaAdminEmailAllowlist() {
  return getPwaAdminEmailAllowlist().length > 0
}

export function isEmailInPwaAdminAllowlist(email) {
  const e = String(email || '').toLowerCase().trim()
  if (!e) return false
  return getPwaAdminEmailAllowlist().includes(e)
}

/**
 * Panel de licencias PWA con PostgREST + JWT de usuario y RLS en Postgres
 * (tabla public.license_admin_allowlist). Sin service role ni API serverless.
 *
 * Se activa con VITE_PWA_LICENSE_CLOUD_ADMIN=true o con VITE_PWA_ADMIN_EMAILS
 * (la lista en cliente solo acota la UI; la autorización real está en RLS).
 */
export function usesJwtLicenseAdmin() {
  const raw = import.meta.env?.VITE_PWA_LICENSE_CLOUD_ADMIN
  const v = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (v === 'true' || v === '1' || v === 'yes') return true
  return hasPwaAdminEmailAllowlist()
}

/** Para unificar login: usuario local o email Supabase admin. */
export function looksLikeEmail(value) {
  const s = String(value ?? '').trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

/**
 * Service role en el cliente: solo modo legacy (sin JWT admin en RLS).
 */
export function getPwaLicenseServiceRole() {
  if (usesJwtLicenseAdmin()) return ''
  const k = import.meta.env?.VITE_SUPABASE_LICENSE_SERVICE_ROLE
  return typeof k === 'string' ? unwrapQuotedEnv(k) : ''
}
