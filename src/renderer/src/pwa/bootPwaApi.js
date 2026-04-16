import { initDatabase, ensurePwaMinimalData } from '@shared/db-init.js'
import { createPwaMockApi } from './pwaMockApi.js'
import { buildDbBackedWindowApi } from './pwaDbBridge.js'
import { getPublicSupabaseConfig, isPwaAdminBuild } from './pwaEnv.js'
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
      signOut: wrapIpc(() => cloudAuthApi.signOut())
    }
    window.api.sync = {
      getStatus: wrapIpc((options) => syncApi.getStatus(options)),
      pullProducts: wrapIpc((options) => syncApi.pullProducts(options)),
      pushProducts: wrapIpc((options) => syncApi.pushProducts(options)),
      syncProducts: wrapIpc((options) => syncApi.syncProducts(options))
    }
    window.api.client.getConfig = async () => ({
      clientName: '',
      publicDemoUrl: '',
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
      isAdmin: isPwaAdminBuild(),
      logo: { full: null, icon: null }
    })
  }
}
