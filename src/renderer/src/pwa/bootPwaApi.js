import { initDatabase, ensurePwaMinimalData } from '@shared/db-init.js'
import { createPwaMockApi } from './pwaMockApi.js'
import { buildDbBackedWindowApi } from './pwaDbBridge.js'
import {
  getPublicSupabaseConfig,
  getPwaPublicDemoUrl,
  isPwaAdminBuild,
  hasPwaAdminEmailAllowlist,
  isEmailInPwaAdminAllowlist,
  usesJwtLicenseAdmin
} from './pwaEnv.js'
import { patchApiWithSupabaseLicense } from './supabaseLicenseBridge.js'
import { createPwaProductsSyncApi } from './pwaProductsSync.js'
import { createPwaSupabaseAuthApi } from './pwaSupabaseAuth.js'
function wrapIpc(fn) {
  return async (...args) => {
    try {
      return { ok: true, data: await fn(...args) }
    } catch (e) {
      return { ok: false, error: e?.message || String(e) }
    }
  }
}

export async function bootPwaApi() {
  window.__IS_PWA__ = true
  await initDatabase()
  await ensurePwaMinimalData()

  const base = createPwaMockApi()
  window.api = buildDbBackedWindowApi(base)

  const supaPublic = getPublicSupabaseConfig()
  if (supaPublic.url && supaPublic.anonKey) {
    patchApiWithSupabaseLicense(window.api, supaPublic)
    const cloudAuthApi = createPwaSupabaseAuthApi(supaPublic)
    const syncApi = createPwaProductsSyncApi(supaPublic, cloudAuthApi)
    window.api.cloudAuth = {
      getSession: wrapIpc(() => cloudAuthApi.getSession()),
      signIn: wrapIpc((email, password) => cloudAuthApi.signIn(email, password)),
      signOut: wrapIpc(() => cloudAuthApi.signOut()),
      getAccessToken: wrapIpc(() => cloudAuthApi.getAccessToken()),
      getMemberships: wrapIpc(() => cloudAuthApi.getMemberships()),
      isLicenseAdminFromJwt: wrapIpc(() => cloudAuthApi.getLicenseAdminFromJwt()),
      updatePassword: wrapIpc((newPassword) => cloudAuthApi.updatePassword(newPassword))
    }

    window.api.client.getConfig = async () => {
      let isAdmin = isPwaAdminBuild()
      if (!isAdmin) {
        try {
          const r = await cloudAuthApi.getSession()
          const email = r?.session?.user?.email
          if (!email) {
            void 0
          } else if (usesJwtLicenseAdmin()) {
            if (hasPwaAdminEmailAllowlist()) {
              if (isEmailInPwaAdminAllowlist(email)) isAdmin = true
              else if (await cloudAuthApi.getLicenseAdminFromJwt()) isAdmin = true
            } else {
              isAdmin = true
            }
          } else if (await cloudAuthApi.getLicenseAdminFromJwt()) {
            // Sesión Supabase + license_admin_allowlist: menú admin aunque no definas VITE_PWA_LICENSE_CLOUD_ADMIN
            isAdmin = true
          }
        } catch {
          void 0
        }
      }
      return {
        clientName: '',
        publicDemoUrl: getPwaPublicDemoUrl(),
        features: {
          ventas: true,
          cotizaciones: true,
          productos: true,
          stock: true,
          proveedores: true,
          caja: true,
          reportes: true,
          usuarios: true,
          backup: true,
          configuracion: true
        },
        isAdmin,
        logo: { full: null, icon: null }
      }
    }
    window.api.sync = {
      getStatus: wrapIpc((options) => syncApi.getStatus(options)),
      pullProducts: wrapIpc((options) => syncApi.pullProducts(options)),
      pushProducts: wrapIpc((options) => syncApi.pushProducts(options)),
      syncProducts: wrapIpc((options) => syncApi.syncProducts(options))
    }
  }
}
