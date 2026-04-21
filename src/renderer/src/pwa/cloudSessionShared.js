const COMMERCE_ID_STORAGE_KEY = 'gcom_commerce_id'

export function mapMembershipToCommerceRole(memberships) {
  const roles = (memberships || []).map((m) => String(m?.role || '').toLowerCase()).filter(Boolean)
  if (roles.some((r) => r === 'owner')) return 'propietario'
  if (roles.some((r) => r === 'admin')) return 'gestor'
  return 'cliente'
}

export function buildCloudUser({ sessionUser, memberships, licenseAdminRpc }) {
  const lic = licenseAdminRpc ?? { ok: false, data: false }
  const isLicenseAdminOnly =
    !(memberships || []).length && lic.ok === true && lic.data === true
  if (!(memberships || []).length && !isLicenseAdminOnly) {
    return { ok: false, error: 'no_commerce' }
  }
  const email = sessionUser?.email || ''
  const userId = sessionUser?.id || email
  const commerceRole = (memberships || []).length
    ? mapMembershipToCommerceRole(memberships)
    : 'propietario'
  const mustChangePassword = sessionUser?.user_metadata?.gcom_must_change_password === true
  return {
    ok: true,
    cloudUser: {
      id: `cloud:${userId}`,
      nombre: email,
      username: email,
      rol: commerceRole,
      memberships: memberships || [],
      authSource: 'cloud',
      mustChangePassword
    }
  }
}

export async function persistPrimaryCommerceId(memberships) {
  const primaryCommerceId = (memberships || []).map((m) => m.commerce_id).find(Boolean)
  if (!primaryCommerceId) return
  try {
    await window.api?.config?.setMany?.({ commerceId: primaryCommerceId })
    localStorage.setItem(COMMERCE_ID_STORAGE_KEY, primaryCommerceId)
  } catch {
    void 0
  }
}
