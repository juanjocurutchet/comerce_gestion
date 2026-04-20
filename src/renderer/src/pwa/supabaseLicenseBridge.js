import {
  checkLicenseWeb,
  activateLicenseWeb,
  requestUpgradeWeb,
  submitDemoOnboardingWeb
} from '@shared/web-license.js'
import {
  licenseAdminGetAll,
  licenseAdminCreate,
  licenseAdminUpdate,
  licenseAdminDelete,
  licenseAdminListUpgradeRequests,
  licenseAdminListCommerces,
  licenseAdminGetAllAsUser,
  licenseAdminCreateAsUser,
  licenseAdminUpdateAsUser,
  licenseAdminDeleteAsUser,
  licenseAdminListUpgradeRequestsAsUser,
  licenseAdminListCommercesAsUser,
  licenseAdminListDemoOnboardingAsUser,
  licenseAdminProvisionDemoRequestAsUser,
  licenseAdminProvisionManualDemoAsUser,
  licenseAdminUpdateDemoOnboardingMessageAsUser,
  licenseAdminDeleteDemoOnboardingAsUser,
  licenseAdminDeleteDemoOnboardingFullAsUser,
  licenseAdminDeleteLicenseFullAsUser
} from '@shared/web-license-admin.js'
import {
  isPwaAdminBuild,
  getPwaLicenseServiceRole,
  usesJwtLicenseAdmin,
  hasPwaAdminEmailAllowlist,
  isEmailInPwaAdminAllowlist
} from './pwaEnv.js'

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
  'El panel de licencias no está disponible en esta versión. Usá la aplicación de escritorio o contactá soporte.'

const ERR_LICENSE_PWA_LEGACY_KEY =
  'No hay permisos para el panel de licencias en esta instalación. Contactá soporte.'

const ERR_LICENSE_JWT_RLS =
  'No tenés permiso para el panel de licencias o la sesión caducó. Iniciá sesión de nuevo o contactá soporte.'

function isLicenseJwtBridgeMode(cfg) {
  if (cfg?.url && cfg?.anonKey) return true
  return usesJwtLicenseAdmin()
}

async function assertPwaLicenseAdminCaller(cfg) {
  if (isLicenseJwtBridgeMode(cfg)) {
    if (!window.api?.cloudAuth?.getSession) {
      throw new Error('Inicio de sesión con email no disponible. Recargá la página o contactá soporte.')
    }
    const wrapped = await window.api.cloudAuth.getSession()
    if (!wrapped?.ok) throw new Error(wrapped?.error || 'Iniciá sesión de nuevo con tu email y contraseña.')
    const session = wrapped.data?.session
    const email = session?.user?.email
    if (!email) throw new Error('La sesión no tiene email. Volvé a iniciar sesión.')
    if (hasPwaAdminEmailAllowlist() && !isEmailInPwaAdminAllowlist(email)) {
      const chk = await window.api?.cloudAuth?.isLicenseAdminFromJwt?.()
      if (!chk?.ok || !chk.data) {
        throw new Error('Tu usuario no tiene permiso para el panel de licencias o la sesión venció.')
      }
    }
    return
  }
  if (isPwaAdminBuild()) return
  throw new Error('No hay permisos para el panel de licencias en esta instalación. Contactá soporte.')
}

async function getAccessTokenOrThrow() {
  const tr = await window.api.cloudAuth.getAccessToken()
  if (!tr?.ok || !tr.data) {
    throw new Error('Sesión no válida. Iniciá sesión de nuevo.')
  }
  return tr.data
}

export function patchApiWithSupabaseLicense(api, cfg) {
  const storage = createLocalStorageBackend()
  const useJwt = isLicenseJwtBridgeMode(cfg)
  const serviceKey = useJwt ? '' : getPwaLicenseServiceRole()
  const legacyAdminCfg = !useJwt && serviceKey && cfg?.url ? { url: cfg.url, serviceKey } : null

  const stubDesktop = async () => ({ ok: false, error: ERR_LICENSE_DESKTOP })
  const stubPwaAdminNeedKey = async () => ({
    ok: false,
    error: useJwt ? ERR_LICENSE_JWT_RLS : ERR_LICENSE_PWA_LEGACY_KEY
  })

  const stubNoAdmin = useJwt
    ? null
    : !legacyAdminCfg
      ? isPwaAdminBuild()
        ? stubPwaAdminNeedKey
        : stubDesktop
      : null

  const userCfg = useJwt && cfg?.url && cfg?.anonKey ? { url: cfg.url, anonKey: cfg.anonKey } : null

  async function runJwt(run) {
    try {
      await assertPwaLicenseAdminCaller(cfg)
      if (!userCfg) throw new Error('Falta configuración Supabase pública (url / anon key).')
      const token = await getAccessTokenOrThrow()
      return await run(userCfg, token)
    } catch (e) {
      return { ok: false, error: e?.message || String(e) }
    }
  }

  async function runLegacy(run) {
    if (!legacyAdminCfg) return stubPwaAdminNeedKey()
    try {
      await assertPwaLicenseAdminCaller(cfg)
    } catch (e) {
      return { ok: false, error: e?.message || String(e) }
    }
    return await run()
  }

  api.license = {
    check: () => checkLicenseWeb(cfg, storage),

    activate: (rawKey) => activateLicenseWeb(cfg, rawKey, storage),

    getStoredKey: () => storage.readKey(),

    getAll:
      stubNoAdmin ||
      (useJwt
        ? async () => runJwt((uc, t) => licenseAdminGetAllAsUser({ ...uc, accessToken: t }))
        : async () => runLegacy(() => licenseAdminGetAll(legacyAdminCfg))),

    create:
      stubNoAdmin ||
      (useJwt
        ? async (payload) => runJwt((uc, t) => licenseAdminCreateAsUser({ ...uc, accessToken: t }, payload))
        : async (payload) => runLegacy(() => licenseAdminCreate(legacyAdminCfg, payload))),

    update:
      stubNoAdmin ||
      (useJwt
        ? async (id, payload) =>
            runJwt((uc, t) => licenseAdminUpdateAsUser({ ...uc, accessToken: t }, id, payload))
        : async (id, payload) => runLegacy(() => licenseAdminUpdate(legacyAdminCfg, id, payload))),

    delete:
      stubNoAdmin ||
      (useJwt
        ? async (id) => runJwt((uc, t) => licenseAdminDeleteAsUser({ ...uc, accessToken: t }, id))
        : async (id) => runLegacy(() => licenseAdminDelete(legacyAdminCfg, id))),

    requestUpgrade: (payload) => requestUpgradeWeb(cfg, payload),

    listUpgradeRequests:
      stubNoAdmin ||
      (useJwt
        ? async () => runJwt((uc, t) => licenseAdminListUpgradeRequestsAsUser({ ...uc, accessToken: t }))
        : async () => runLegacy(() => licenseAdminListUpgradeRequests(legacyAdminCfg))),

    listCommerces:
      stubNoAdmin ||
      (useJwt
        ? async () => runJwt((uc, t) => licenseAdminListCommercesAsUser({ ...uc, accessToken: t }))
        : async () => runLegacy(() => licenseAdminListCommerces(legacyAdminCfg))),

    listDemoOnboarding:
      stubNoAdmin ||
      (useJwt
        ? async () => runJwt((uc, t) => licenseAdminListDemoOnboardingAsUser({ ...uc, accessToken: t }))
        : async () => ({ ok: false, error: ERR_LICENSE_PWA_LEGACY_KEY })),

    provisionDemoOnboarding:
      stubNoAdmin ||
      (useJwt
        ? async (requestId, membershipRole, options) =>
            runJwt((uc, t) =>
              licenseAdminProvisionDemoRequestAsUser(
                { ...uc, accessToken: t },
                requestId,
                membershipRole,
                options
              )
            )
        : async () => ({ ok: false, error: ERR_LICENSE_PWA_LEGACY_KEY })),

    provisionManualDemo:
      stubNoAdmin ||
      (useJwt
        ? async (payload) =>
            runJwt((uc, t) => licenseAdminProvisionManualDemoAsUser({ ...uc, accessToken: t }, payload))
        : async () => ({ ok: false, error: ERR_LICENSE_PWA_LEGACY_KEY })),

    updateDemoOnboardingMessage:
      stubNoAdmin ||
      (useJwt
        ? async (id, deliveryMessage) =>
            runJwt((uc, t) =>
              licenseAdminUpdateDemoOnboardingMessageAsUser(
                { ...uc, accessToken: t },
                id,
                deliveryMessage
              )
            )
        : async () => ({ ok: false, error: ERR_LICENSE_PWA_LEGACY_KEY })),

    deleteDemoOnboarding:
      stubNoAdmin ||
      (useJwt
        ? async (id) =>
            runJwt((uc, t) => licenseAdminDeleteDemoOnboardingAsUser({ ...uc, accessToken: t }, id))
        : async () => ({ ok: false, error: ERR_LICENSE_PWA_LEGACY_KEY })),

    deleteDemoOnboardingFull:
      stubNoAdmin ||
      (useJwt
        ? async (payload) =>
            runJwt((uc, t) =>
              licenseAdminDeleteDemoOnboardingFullAsUser({ ...uc, accessToken: t }, payload)
            )
        : async () => ({ ok: false, error: ERR_LICENSE_PWA_LEGACY_KEY })),

    deleteLicenseFull:
      stubNoAdmin ||
      (useJwt
        ? async (payload) =>
            runJwt((uc, t) => licenseAdminDeleteLicenseFullAsUser({ ...uc, accessToken: t }, payload))
        : async () => ({ ok: false, error: ERR_LICENSE_PWA_LEGACY_KEY }))
  }

  api.demoOnboarding = {
    submit: (payload) => submitDemoOnboardingWeb(cfg, payload)
  }
}
