import {
  checkLicenseWeb,
  activateLicenseWeb,
  requestUpgradeWeb
} from '@shared/web-license.js'

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

/** Parchea `window.api.license` (check/activate/getStoredKey); admin solo en desktop. */
export function patchApiWithSupabaseLicense(api, cfg) {
  const storage = createLocalStorageBackend()

  api.license = {
    check: () => checkLicenseWeb(cfg, storage),

    activate: (rawKey) => activateLicenseWeb(cfg, rawKey, storage),

    getStoredKey: () => storage.readKey(),

    getAll: async () => ({
      ok: false,
      error: 'El panel de licencias solo está disponible en la aplicación de escritorio.'
    }),

    create: async () => ({
      ok: false,
      error: 'El panel de licencias solo está disponible en la aplicación de escritorio.'
    }),

    update: async () => ({
      ok: false,
      error: 'El panel de licencias solo está disponible en la aplicación de escritorio.'
    }),

    delete: async () => ({
      ok: false,
      error: 'El panel de licencias solo está disponible en la aplicación de escritorio.'
    }),

    requestUpgrade: (payload) => requestUpgradeWeb(cfg, payload),

    listUpgradeRequests: async () => ({
      ok: false,
      error: 'El panel de licencias solo está disponible en la aplicación de escritorio.'
    }),

    listCommerces: async () => ({
      ok: false,
      error: 'El panel de licencias solo está disponible en la aplicación de escritorio.'
    })
  }
}
