const SNAPSHOT_KEY = 'gcom_cloud_user_snapshot'

export function writeCloudUserSnapshot(supabaseUserId, cloudUser) {
  try {
    if (!supabaseUserId || !cloudUser || typeof cloudUser !== 'object') return
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ v: 1, supabaseUserId, cloudUser }))
  } catch {
    void 0
  }
}

export function readCloudUserSnapshot() {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY)
    if (!raw) return null
    const o = JSON.parse(raw)
    if (!o?.supabaseUserId || !o?.cloudUser) return null
    return o
  } catch {
    return null
  }
}

export function clearCloudUserSnapshot() {
  try {
    localStorage.removeItem(SNAPSHOT_KEY)
  } catch {
    void 0
  }
}
