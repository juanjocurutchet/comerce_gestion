/** Init DB en cliente: PWA → IndexedDB; Electron renderer → SQLite vía main (sin adaptador aquí). */

import { setDbAdapter } from './db/interface.js'
import { usuariosDB, categoriasDB, configDB } from './db/interface.js'
import { ensureBrowserCommerceId } from './commerceScope.js'

export async function initDatabase() {
  if (typeof window === 'undefined') return

  if (window.__IS_PWA__) {
    const { indexedDbAdapter } = await import('../adapters/indexeddb/index.js')
    setDbAdapter(indexedDbAdapter)
    return
  }

  if (typeof window !== 'undefined' && window.api?.usuarios?.login) {
    return
  }
}

/** Primera ejecución PWA: admin y datos mínimos alineados con el esquema SQLite. */
export async function ensurePwaMinimalData() {
  if (typeof window === 'undefined' || !window.__IS_PWA__) return

  const localCommerceId = ensureBrowserCommerceId()

  const users = await usuariosDB.getAll()
  if (!users?.length) {
    await usuariosDB.create({
      nombre: 'Administrador',
      username: 'admin',
      password: 'admin',
      rol: 'admin',
      activo: 1
    })
  }

  const cats = await categoriasDB.getAll()
  if (!cats?.length) {
    await categoriasDB.create({ nombre: 'Otros', descripcion: 'General' })
  }

  const cfg = await configDB.getAll()
  if (!cfg || Object.keys(cfg).length === 0) {
    await configDB.setMany({
      commerceId: localCommerceId,
      nombreComercio: 'Mi Comercio',
      direccion: '',
      telefono: '',
      cuit: '',
      ticketFooter: 'Gracias por su compra!'
    })
  } else if (!cfg.commerceId) {
    await configDB.setMany({ commerceId: localCommerceId })
  } else {
    ensureBrowserCommerceId(cfg.commerceId)
  }
}

export function useDatabase() {
  return { ready: true }
}
