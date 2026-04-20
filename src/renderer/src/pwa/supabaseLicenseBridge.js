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
  'El panel de licencias solo está disponible en la aplicación de escritorio (con service key en resources/supabase.json).'

const ERR_LICENSE_PWA_LEGACY_KEY =
  'PWA (legacy): definí VITE_SUPABASE_LICENSE_SERVICE_ROLE en el build. La clave queda en el JS del cliente: no uses esto en sitios públicos.'

const ERR_LICENSE_JWT_RLS =
  'Licencias (RLS): en Supabase ejecutá supabase/licencias-license-admin-rls.sql, insertá tu email en public.license_admin_allowlist, y en el build usá VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY. Iniciá sesión admin (cloud) en el login. Opcional: VITE_PWA_ADMIN_EMAILS o VITE_PWA_LICENSE_CLOUD_ADMIN=true para mostrar el panel.'

async function assertPwaLicenseAdminCaller() {
  if (usesJwtLicenseAdmin()) {
    if (!window.api?.cloudAuth?.getSession) {
      throw new Error('Autenticación cloud no disponible (revisá VITE_SUPABASE_URL y anon key en el build).')
    }
    const wrapped = await window.api.cloudAuth.getSession()
    if (!wrapped?.ok) throw new Error(wrapped?.error || 'Iniciá sesión con Supabase Auth (sección admin en el login).')
    const session = wrapped.data?.session
    const email = session?.user?.email
    if (!email) throw new Error('La sesión cloud no tiene email.')
    if (hasPwaAdminEmailAllowlist() && !isEmailInPwaAdminAllowlist(email)) {
      const chk = await window.api?.cloudAuth?.isLicenseAdminFromJwt?.()
      if (!chk?.ok || !chk.data) {
        throw new Error(
          'Tu email no está en VITE_PWA_ADMIN_EMAILS ni en la allowlist de licencias en Supabase (license_admin_allowlist), o la sesión venció.'
        )
      }
    }
    return
  }
  if (isPwaAdminBuild()) return
  throw new Error(
    'Para el panel de licencias en PWA: RLS (VITE_PWA_LICENSE_CLOUD_ADMIN o VITE_PWA_ADMIN_EMAILS + SQL en Supabase), o solo en entornos cerrados VITE_PWA_ADMIN=true con service role en el cliente.'
  )
}

async function getAccessTokenOrThrow() {
  const tr = await window.api.cloudAuth.getAccessToken()
  if (!tr?.ok || !tr.data) {
    throw new Error('Sin sesión Supabase. Iniciá sesión admin (cloud) en el login.')
  }
  return tr.data
}

export function patchApiWithSupabaseLicense(api, cfg) {
  const storage = createLocalStorageBackend()
  const useJwt = usesJwtLicenseAdmin()
  const serviceKey = getPwaLicenseServiceRole()
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
      await assertPwaLicenseAdminCaller()
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
      await assertPwaLicenseAdminCaller()
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
