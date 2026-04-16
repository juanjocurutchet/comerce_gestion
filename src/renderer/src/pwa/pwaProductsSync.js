import { configDB } from '@shared/db/interface.js'
import { ensureBrowserCommerceId } from '@shared/commerceScope.js'
import { initIndexedDB, transaction, objectStore, promisifyRequest } from '../../../adapters/indexeddb/schema.js'

const PRODUCT_COLUMNS = [
  'id',
  'codigo',
  'nombre',
  'descripcion',
  'categoria_id',
  'proveedor_id',
  'precio_compra',
  'precio_venta',
  'stock_actual',
  'stock_minimo',
  'unidad',
  'fecha_vencimiento',
  'dias_alerta_vencimiento',
  'activo',
  'created_at',
  'updated_at',
  'deleted_at',
  'sync_id',
  'commerce_id'
]

const SYNC_KEYS = {
  push: 'syncProductosLastPushAt',
  pull: 'syncProductosLastPullAt',
  sync: 'syncProductosLastSyncAt'
}

async function getIndexedDb() {
  const clientName = localStorage.getItem('clientName') || 'demo'
  return initIndexedDB(clientName)
}

async function getStoreRows(storeName) {
  const database = await getIndexedDb()
  const tx = transaction(database, [storeName], 'readonly')
  return promisifyRequest(objectStore(tx, storeName).getAll())
}

async function putStoreRows(storeName, rows) {
  const database = await getIndexedDb()
  const tx = transaction(database, [storeName], 'readwrite')
  const store = objectStore(tx, storeName)
  for (const row of rows) {
    await promisifyRequest(store.put(row))
  }
}

function getHeaders(anonKey, accessToken = null, extra = {}) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${accessToken || anonKey}`,
    'Content-Type': 'application/json',
    ...extra
  }
}

async function parseSupabaseResponse(res) {
  if (res.ok) {
    if (res.status === 204) return null
    return res.json()
  }
  let detail = `HTTP ${res.status}`
  try {
    const body = await res.json()
    detail = body?.message || body?.error_description || body?.hint || body?.details || detail
  } catch {
    void 0
  }
  throw new Error(detail)
}

function sanitizeProductRow(row, commerceId) {
  const clean = {}
  for (const key of PRODUCT_COLUMNS) {
    if (row[key] !== undefined) clean[key] = row[key]
  }
  if (clean.activo === undefined) clean.activo = 1
  if (!clean.commerce_id) clean.commerce_id = commerceId
  if (!clean.updated_at) clean.updated_at = new Date().toISOString()
  if (!clean.created_at) clean.created_at = clean.updated_at
  return clean
}

function buildProductsUrl(baseUrl, commerceId, updatedAfter) {
  const params = new URLSearchParams()
  params.set('select', PRODUCT_COLUMNS.join(','))
  params.set('commerce_id', `eq.${commerceId}`)
  params.set('order', 'updated_at.asc')
  if (updatedAfter) params.set('updated_at', `gt.${updatedAfter}`)
  return `${baseUrl}/rest/v1/productos?${params.toString()}`
}

async function fetchRemoteProducts(cfg, commerceId, accessToken, updatedAfter = null) {
  const res = await fetch(buildProductsUrl(cfg.url, commerceId, updatedAfter), {
    headers: getHeaders(cfg.anonKey, accessToken)
  })
  return parseSupabaseResponse(res)
}

async function fetchUserCommerces(cfg, accessToken) {
  const params = new URLSearchParams()
  params.set('select', 'commerce_id,role,activo')
  params.set('activo', 'eq.true')
  const res = await fetch(`${cfg.url}/rest/v1/user_commerces?${params.toString()}`, {
    headers: getHeaders(cfg.anonKey, accessToken)
  })
  return parseSupabaseResponse(res)
}

async function pushRemoteProducts(cfg, accessToken, rows) {
  if (!rows.length) return 0
  const chunkSize = 250
  let pushed = 0
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const res = await fetch(`${cfg.url}/rest/v1/productos?on_conflict=commerce_id,id`, {
      method: 'POST',
      headers: getHeaders(cfg.anonKey, accessToken, {
        Prefer: 'resolution=merge-duplicates,return=minimal'
      }),
      body: JSON.stringify(chunk)
    })
    await parseSupabaseResponse(res)
    pushed += chunk.length
  }
  return pushed
}

async function getSyncMeta() {
  const cfg = await configDB.getAll()
  return {
    lastPushAt: cfg?.[SYNC_KEYS.push] || null,
    lastPullAt: cfg?.[SYNC_KEYS.pull] || null,
    lastSyncAt: cfg?.[SYNC_KEYS.sync] || null
  }
}

async function saveSyncMeta(data) {
  await configDB.setMany(data)
}

async function getCommerceId() {
  const cfg = await configDB.getAll()
  return cfg?.commerceId || ensureBrowserCommerceId()
}

export function createPwaProductsSyncApi(cfg, authApi) {
  const configured = Boolean(cfg?.url && cfg?.anonKey)

  async function getRequiredAccessToken() {
    const token = await authApi?.getAccessToken?.()
    if (!token) {
      throw new Error('Iniciá sesión en Supabase para sincronizar con RLS')
    }
    return token
  }

  async function assertCommerceAccess(commerceId, accessToken) {
    const rows = await fetchUserCommerces(cfg, accessToken)
    const memberships = (rows || []).map((r) => r.commerce_id).filter(Boolean)
    if (!memberships.includes(commerceId)) {
      throw new Error(`La sesión cloud no tiene acceso al commerce_id local (${commerceId})`)
    }
    return memberships
  }

  return {
    async getStatus() {
      const commerceId = await getCommerceId()
      const meta = await getSyncMeta()
      const authStatus = await authApi?.getSession?.()
      let memberships = []
      let membershipMatch = false
      if (authStatus?.session?.access_token) {
        try {
          const rows = await fetchUserCommerces(cfg, authStatus.session.access_token)
          memberships = (rows || []).map((r) => r.commerce_id).filter(Boolean)
          membershipMatch = memberships.includes(commerceId)
        } catch {
          memberships = []
          membershipMatch = false
        }
      }
      return {
        configured,
        commerceId,
        cloudSession: authStatus?.session
          ? {
              email: authStatus.session.user?.email || '',
              expires_at: authStatus.session.expires_at || null
            }
          : null,
        cloudMemberships: memberships,
        cloudMembershipMatch: membershipMatch,
        ...meta
      }
    },

    async pullProducts(options = {}) {
      if (!configured) throw new Error('Supabase no está configurado en la PWA')

      const accessToken = await getRequiredAccessToken()
      const commerceId = await getCommerceId()
      await assertCommerceAccess(commerceId, accessToken)
      const meta = await getSyncMeta()
      const updatedAfter = options.full ? null : meta.lastPullAt
      const remoteRows = await fetchRemoteProducts(cfg, commerceId, accessToken, updatedAfter)
      const normalized = (remoteRows || []).map((row) => sanitizeProductRow(row, commerceId))
      if (normalized.length) {
        await putStoreRows('productos', normalized)
      }

      const now = new Date().toISOString()
      await saveSyncMeta({
        [SYNC_KEYS.pull]: now,
        [SYNC_KEYS.sync]: now
      })

      return {
        pulled: normalized.length,
        mode: options.full ? 'full' : 'incremental',
        lastPullAt: now
      }
    },

    async pushProducts(options = {}) {
      if (!configured) throw new Error('Supabase no está configurado en la PWA')

      const accessToken = await getRequiredAccessToken()
      const commerceId = await getCommerceId()
      await assertCommerceAccess(commerceId, accessToken)
      const meta = await getSyncMeta()
      const updatedAfter = options.full ? null : meta.lastPushAt
      const localRows = (await getStoreRows('productos'))
        .map((row) => sanitizeProductRow(row, commerceId))
        .filter((row) => row.commerce_id === commerceId)
        .filter((row) => !updatedAfter || (row.updated_at && row.updated_at > updatedAfter))

      const pushed = await pushRemoteProducts(cfg, accessToken, localRows)
      const now = new Date().toISOString()
      await saveSyncMeta({
        [SYNC_KEYS.push]: now,
        [SYNC_KEYS.sync]: now
      })

      return {
        pushed,
        mode: options.full ? 'full' : 'incremental',
        lastPushAt: now
      }
    },

    async syncProducts(options = {}) {
      const push = await this.pushProducts(options)
      const pull = await this.pullProducts(options)
      const now = new Date().toISOString()
      await saveSyncMeta({ [SYNC_KEYS.sync]: now })
      return {
        pushed: push.pushed,
        pulled: pull.pulled,
        mode: options.full ? 'full' : 'incremental',
        lastSyncAt: now
      }
    }
  }
}
