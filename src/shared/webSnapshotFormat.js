/** Formato único de snapshot JSON (PWA IndexedDB / SQLite desktop). */

export const SNAPSHOT_FORMAT = 'nexo-commerce-pwa'
export const SNAPSHOT_VERSION = 1

/** Límite aproximado de tamaño del JSON al importar (UTF-8). */
export const SNAPSHOT_MAX_IMPORT_BYTES = 45 * 1024 * 1024

/** Orden de inserción al importar (padres antes que hijos con FK). */
export const SNAPSHOT_STORE_INSERT_ORDER = [
  'usuarios',
  'categorias',
  'proveedores',
  'productos',
  'clientes',
  'listas_precio',
  'lista_precio_items',
  'cajas',
  'movimientos_caja',
  'ventas',
  'venta_items',
  'movimientos_stock',
  'cotizaciones',
  'cotizacion_items',
  'cuenta_corriente',
  'gastos',
  'configuracion'
]

const ALLOWED_STORES = new Set(SNAPSHOT_STORE_INSERT_ORDER)

export function getSnapshotDeleteOrder() {
  return [...SNAPSHOT_STORE_INSERT_ORDER].reverse()
}

export function buildSnapshotPayload(stores, exportedAt = new Date().toISOString()) {
  return {
    format: SNAPSHOT_FORMAT,
    version: SNAPSHOT_VERSION,
    exportedAt,
    stores
  }
}

function validateSnapshot(parsed) {
  if (!parsed || typeof parsed !== 'object') throw new Error('JSON inválido')
  if (parsed.format !== SNAPSHOT_FORMAT) {
    throw new Error('No es un respaldo de Nexo Commerce (formato JSON de la app)')
  }
  const ver = Number(parsed.version)
  if (Number.isNaN(ver) || ver < 1) throw new Error('Versión de respaldo no reconocida')
  if (ver > SNAPSHOT_VERSION) {
    throw new Error(
      `Este archivo es de una versión más nueva del formato (${ver}). Actualizá la aplicación e intentá de nuevo.`
    )
  }
  if (ver !== SNAPSHOT_VERSION) throw new Error(`Versión de respaldo no soportada: ${parsed.version}`)
  if (!parsed.stores || typeof parsed.stores !== 'object') throw new Error('Falta la sección "stores"')
}

/**
 * Parsea y valida el texto JSON de un snapshot (import).
 * @param {string} jsonText
 * @returns {object} payload validado
 */
export function parseWebSnapshotJson(jsonText) {
  if (typeof jsonText !== 'string' || !jsonText.trim()) {
    throw new Error('El archivo está vacío o no contiene texto.')
  }
  const bytes = new TextEncoder().encode(jsonText).length
  if (bytes > SNAPSHOT_MAX_IMPORT_BYTES) {
    const mb = Math.round(bytes / 1024 / 1024)
    const maxMb = Math.round(SNAPSHOT_MAX_IMPORT_BYTES / 1024 / 1024)
    throw new Error(`El archivo es demasiado grande (${mb} MB). El máximo permitido es ${maxMb} MB.`)
  }
  let parsed
  try {
    parsed = JSON.parse(jsonText)
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error('No es un JSON válido (revisá que sea un export generado por Nexo Commerce).')
    }
    throw e
  }
  validateSnapshot(parsed)
  return parsed
}

/** @param {string} table */
export function assertAllowedSnapshotTable(table) {
  if (!ALLOWED_STORES.has(table)) {
    throw new Error(`Tabla no permitida en snapshot: ${table}`)
  }
}
