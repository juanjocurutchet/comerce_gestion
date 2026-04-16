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

/** Si es true, la PWA se comporta como build interno (menú Licencias, sin gate de licencia). */
export function isPwaAdminBuild() {
  return import.meta.env?.VITE_PWA_ADMIN === 'true'
}

/**
 * Service role de Supabase solo para panel Licencias en PWA admin.
 * Queda embebida en el JS del cliente: usar solo en despliegues privados, nunca en web pública.
 */
export function getPwaLicenseServiceRole() {
  if (!isPwaAdminBuild()) return ''
  const k = import.meta.env?.VITE_SUPABASE_LICENSE_SERVICE_ROLE
  return typeof k === 'string' ? unwrapQuotedEnv(k) : ''
}
