import { useAuthStore } from '../store/authStore'
import { readCloudUserSnapshot, writeCloudUserSnapshot } from './cloudAuthSnapshot.js'
import { buildCloudUser, persistPrimaryCommerceId } from './cloudSessionShared.js'

function mergeSnapshotUser(sessionUser, snapCloudUser) {
  return {
    ...snapCloudUser,
    mustChangePassword: sessionUser?.user_metadata?.gcom_must_change_password === true
  }
}

function buildOfflineFallbackUser(sessionUser, snapshot = null) {
  const email = sessionUser?.email || ''
  const userId = sessionUser?.id || email
  const memberships = Array.isArray(snapshot?.memberships) ? snapshot.memberships : []
  return {
    id: `cloud:${userId}`,
    nombre: email,
    username: email,
    rol: snapshot?.rol || 'cliente',
    memberships,
    authSource: 'cloud',
    mustChangePassword: sessionUser?.user_metadata?.gcom_must_change_password === true
  }
}

export async function restorePwaCloudSession() {
  if (typeof window === 'undefined' || !window.__IS_PWA__ || !window.api?.cloudAuth?.getSession) return

  const { user, setUser } = useAuthStore.getState()
  if (user) return

  const wrapped = await window.api.cloudAuth.getSession()
  if (!wrapped?.ok) return
  const inner = wrapped.data
  const sessionUser = inner?.session?.user
  if (!sessionUser?.id) return

  const mRes = await window.api.cloudAuth.getMemberships()
  const membershipOk = mRes?.ok === true
  const memberships = membershipOk && Array.isArray(mRes.data) ? mRes.data : []

  let licenseAdminRpc = { ok: false, data: false }
  try {
    licenseAdminRpc = (await window.api.cloudAuth.isLicenseAdminFromJwt?.()) ?? licenseAdminRpc
  } catch {
    void 0
  }

  if (membershipOk) {
    const built = buildCloudUser({ sessionUser, memberships, licenseAdminRpc })
    if (!built.ok) {
      const snap = readCloudUserSnapshot()
      if (snap?.supabaseUserId === sessionUser.id && snap.cloudUser) {
        const merged = mergeSnapshotUser(sessionUser, snap.cloudUser)
        await persistPrimaryCommerceId(merged.memberships || [])
        setUser(merged)
      }
      return
    }
    await persistPrimaryCommerceId(memberships)
    writeCloudUserSnapshot(sessionUser.id, built.cloudUser)
    setUser(built.cloudUser)
    return
  }

  const snap = readCloudUserSnapshot()
  if (snap?.supabaseUserId === sessionUser.id && snap.cloudUser) {
    const merged = mergeSnapshotUser(sessionUser, snap.cloudUser)
    await persistPrimaryCommerceId(merged.memberships || [])
    setUser(merged)
    return
  }

  setUser(buildOfflineFallbackUser(sessionUser))
}
