export const COMMERCE_ID_STORAGE_KEY = 'gcom_commerce_id'

export function makeCommerceId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `commerce_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function getBrowserCommerceId() {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage.getItem(COMMERCE_ID_STORAGE_KEY)
  } catch {
    return null
  }
}

export function ensureBrowserCommerceId(preferredId = null) {
  if (typeof localStorage === 'undefined') return preferredId || makeCommerceId()
  try {
    let current = localStorage.getItem(COMMERCE_ID_STORAGE_KEY)
    if (!current) {
      current = preferredId || makeCommerceId()
      localStorage.setItem(COMMERCE_ID_STORAGE_KEY, current)
    }
    return current
  } catch {
    return preferredId || makeCommerceId()
  }
}
