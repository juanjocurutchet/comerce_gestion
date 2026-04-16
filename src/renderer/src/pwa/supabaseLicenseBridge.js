import {
  checkLicenseWeb,
  activateLicenseWeb,
  requestUpgradeWeb
} from '@shared/web-license.js'
import {
  licenseAdminGetAll,
  licenseAdminCreate,
  licenseAdminUpdate,
  licenseAdminDelete,
  licenseAdminListUpgradeRequests,
  licenseAdminListCommerces
} from '@shared/web-license-admin.js'
import { isPwaAdminBuild, getPwaLicenseServiceRole } from './pwaEnv.js'

const LS_KEY = 'gcom_stored_license_key'
const LS_CACHE = 'gcom_license_cache'

function createLocalStorageBackend() {
  return {
    readKey: () => {
      try {
        return localStorage.getItem(LS_KEY)
      } catch {
        return null
      }
    },
    writeKey: (k) => {
      try {
        localStorage.setItem(LS_KEY, k)
      } catch {
        void 0
      }
    },
    readCache: () => {
      try {
        const raw = localStorage.getItem(LS_CACHE)
        if (!raw) return null
        return JSON.parse(raw)
      } catch {
        return null
      }
    },
    writeCache: (data) => {
      try {
        if (data == null) localStorage.removeItem(LS_CACHE)
        else localStorage.setItem(LS_CACHE, JSON.stringify(data))
      } catch {
        void 0
      }
    }
  }
}

const ERR_LICENSE_DESKTOP =
  'El panel de licencias solo está disponible en la aplicación de escritorio (con service key en resources/supabase.json).'

const ERR_LICENSE_PWA_NEED_SERVICE_ROLE =
  'PWA admin: definí VITE_SUPABASE_LICENSE_SERVICE_ROLE en el build (service role de Supabase) para crear/editar licencias. Cualquier visitante podría extraerla del bundle: usalo solo en despliegues privados, o gestioná licencias desde escritorio / SQL Editor de Supabase.'

/** Parchea `window.api.license` (check/activate/getStoredKey); CRUD admin en PWA solo con service role + build admin. */
export function patchApiWithSupabaseLicense(api, cfg) {
  const storage = createLocalStorageBackend()
  const serviceKey = getPwaLicenseServiceRole()
  const adminCfg = serviceKey && cfg?.url ? { url: cfg.url, serviceKey } : null

  const stubDesktop = async () => ({ ok: false, error: ERR_LICENSE_DESKTOP })
  const stubPwaAdminNeedKey = async () => ({ ok: false, error: ERR_LICENSE_PWA_NEED_SERVICE_ROLE })

  const stubAdmin = adminCfg ? null : isPwaAdminBuild() ? stubPwaAdminNeedKey : stubDesktop

  api.license = {
    check: () => checkLicenseWeb(cfg, storage),

    activate: (rawKey) => activateLicenseWeb(cfg, rawKey, storage),

    getStoredKey: () => storage.readKey(),

    getAll: stubAdmin ? stubAdmin : () => licenseAdminGetAll(adminCfg),

    create: stubAdmin ? stubAdmin : (payload) => licenseAdminCreate(adminCfg, payload),

    update: stubAdmin ? stubAdmin : (id, payload) => licenseAdminUpdate(adminCfg, id, payload),

    delete: stubAdmin ? stubAdmin : (id) => licenseAdminDelete(adminCfg, id),

    requestUpgrade: (payload) => requestUpgradeWeb(cfg, payload),

    listUpgradeRequests: stubAdmin ? stubAdmin : () => licenseAdminListUpgradeRequests(adminCfg),

    listCommerces: stubAdmin ? stubAdmin : () => licenseAdminListCommerces(adminCfg)
  }
}
