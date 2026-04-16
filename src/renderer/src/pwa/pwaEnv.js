/** Configuración pública Supabase para el build PWA (Vite). */
export function getPublicSupabaseConfig() {
  const url = (import.meta.env?.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || ''
  return { url, anonKey }
}

/** Si es true, la PWA se comporta como build interno (menú Licencias, sin gate de licencia). */
export function isPwaAdminBuild() {
  return import.meta.env?.VITE_PWA_ADMIN === 'true'
}
