import {
  usuariosDB,
  categoriasDB,
  proveedoresDB,
  productosDB,
  ventasDB,
  stockDB,
  cajaDB,
  configDB,
  reportesDB,
  cotizacionesDB,
  clientesDB,
  cuentaCorrienteDB,
  listasPrecioDB,
  gastosDB
} from '@shared/db/interface.js'
import { runPwaSeedDemo, clearPwaSeedDemo } from './pwaSeedDemo.js'

function ipcWrap(promise) {
  return promise.then(
    (data) => ({ ok: true, data }),
    (e) => ({ ok: false, error: e?.message || String(e) })
  )
}

function stripPassword(user) {
  if (!user || typeof user !== 'object') return user
  const { password: _p, ...rest } = user
  return rest
}

/** Combina mock base con APIs respaldadas por IndexedDB (forma tipo IPC). */
export function buildDbBackedWindowApi(base) {
  const api = { ...base }

  api.usuarios = {
    login: async (username, password) => {
      try {
        const user = await usuariosDB.login(username, password)
        if (!user) return { ok: false, error: 'Credenciales inválidas' }
        return { ok: true, data: stripPassword(user) }
      } catch (e) {
        return { ok: false, error: e?.message || String(e) }
      }
    },
    getAll: async () => {
      const list = await usuariosDB.getAll()
      const data = (list || []).map((u) => stripPassword(u))
      return { ok: true, data }
    },
    create: async (data) => ipcWrap(Promise.resolve(usuariosDB.create(data))),
    update: async (data) => ipcWrap(Promise.resolve(usuariosDB.update(data))),
    updatePassword: async (id, password) =>
      ipcWrap(Promise.resolve(usuariosDB.updatePassword(id, password))),
    delete: async (id) => ipcWrap(Promise.resolve(usuariosDB.delete(id)))
  }

  api.categorias = {
    getAll: () => ipcWrap(Promise.resolve(categoriasDB.getAll())),
    create: (d) => ipcWrap(Promise.resolve(categoriasDB.create(d))),
    update: (d) => ipcWrap(Promise.resolve(categoriasDB.update(d))),
    delete: (id) => ipcWrap(Promise.resolve(categoriasDB.delete(id)))
  }

  api.proveedores = {
    getAll: () => ipcWrap(Promise.resolve(proveedoresDB.getAll())),
    create: (d) => ipcWrap(Promise.resolve(proveedoresDB.create(d))),
    update: (d) => ipcWrap(Promise.resolve(proveedoresDB.update(d))),
    delete: (id) => ipcWrap(Promise.resolve(proveedoresDB.delete(id)))
  }

  api.productos = {
    getAll: () => ipcWrap(Promise.resolve(productosDB.getAll())),
    getByCodigo: (c) => ipcWrap(Promise.resolve(productosDB.getByCodigo(c))),
    getStockBajo: () => ipcWrap(Promise.resolve(productosDB.getStockBajo())),
    getVencimientosCercanos: () => ipcWrap(Promise.resolve(productosDB.getVencimientosCercanos())),
    findDuplicate: (nombre, codigo) => ipcWrap(Promise.resolve(productosDB.findDuplicate(nombre, codigo))),
    create: (d, usuarioId) => ipcWrap(Promise.resolve(productosDB.create(d, usuarioId))),
    sumarStock: (id, cantidad, usuarioId, fechaVencLote) =>
      ipcWrap(Promise.resolve(productosDB.sumarStock(id, cantidad, usuarioId, fechaVencLote))),
    update: (d) => ipcWrap(Promise.resolve(productosDB.update(d))),
    delete: (id) => ipcWrap(Promise.resolve(productosDB.delete(id))),
    updatePreciosMasivo: (pct, catId) =>
      ipcWrap(Promise.resolve(productosDB.updatePreciosMasivo(pct, catId)))
  }

  api.ventas = {
    getAll: (d, h, options) => ipcWrap(Promise.resolve(ventasDB.getAll(d, h, options))),
    getById: (id) => ipcWrap(Promise.resolve(ventasDB.getById(id))),
    getItems: (id) => ipcWrap(Promise.resolve(ventasDB.getItems(id))),
    create: (v, items, u, clienteId) =>
      ipcWrap(Promise.resolve(ventasDB.create(v, items, u, clienteId))),
    anular: (id, usuarioId) => ipcWrap(Promise.resolve(ventasDB.anular(id, usuarioId))),
    resumenHoy: () => ipcWrap(Promise.resolve(ventasDB.resumenHoy())),
    resumenPeriodo: (d, h) => ipcWrap(Promise.resolve(ventasDB.resumenPeriodo(d, h)))
  }

  api.stock = {
    getMovimientos: (id) => ipcWrap(Promise.resolve(stockDB.getMovimientos(id))),
    ajuste: (d, u) => ipcWrap(Promise.resolve(stockDB.ajuste(d, u)))
  }

  api.caja = {
    getCajaAbierta: () => ipcWrap(Promise.resolve(cajaDB.getCajaAbierta())),
    getAll: () => ipcWrap(Promise.resolve(cajaDB.getAll())),
    getMovimientos: (id) => ipcWrap(Promise.resolve(cajaDB.getMovimientos(id))),
    abrir: (s, u) => ipcWrap(Promise.resolve(cajaDB.abrir(s, u))),
    cerrar: (id) => ipcWrap(Promise.resolve(cajaDB.cerrar(id))),
    addMovimiento: (d) => ipcWrap(Promise.resolve(cajaDB.addMovimiento(d)))
  }

  api.config = {
    getAll: () => ipcWrap(Promise.resolve(configDB.getAll())),
    setMany: (obj) => ipcWrap(Promise.resolve(configDB.setMany(obj)))
  }

  api.reportes = {
    ventasPorDia: (d, h) => ipcWrap(Promise.resolve(reportesDB.ventasPorDia(d, h))),
    ventasPorProducto: (d, h) => ipcWrap(Promise.resolve(reportesDB.ventasPorProducto(d, h))),
    ventasPorCategoria: (d, h) => ipcWrap(Promise.resolve(reportesDB.ventasPorCategoria(d, h))),
    resumenGeneral: () => ipcWrap(Promise.resolve(reportesDB.resumenGeneral()))
  }

  api.cotizaciones = {
    getAll: (options) => ipcWrap(Promise.resolve(cotizacionesDB.getAll(options))),
    getById: (id) => ipcWrap(Promise.resolve(cotizacionesDB.getById(id))),
    getItems: (id) => ipcWrap(Promise.resolve(cotizacionesDB.getItems(id))),
    create: (c, items, uid) => ipcWrap(Promise.resolve(cotizacionesDB.create(c, items, uid))),
    updateEstado: (id, estado) => ipcWrap(Promise.resolve(cotizacionesDB.updateEstado(id, estado))),
    delete: (id) => ipcWrap(Promise.resolve(cotizacionesDB.delete(id)))
  }

  api.clientes = {
    getAll: () => ipcWrap(Promise.resolve(clientesDB.getAll())),
    create: (d) => ipcWrap(Promise.resolve(clientesDB.create(d))),
    update: (d) => ipcWrap(Promise.resolve(clientesDB.update(d))),
    delete: (id) => ipcWrap(Promise.resolve(clientesDB.delete(id)))
  }

  api.cuentaCorriente = {
    getAllSaldos: () => ipcWrap(Promise.resolve(cuentaCorrienteDB.getAllSaldos())),
    getMovimientos: (id) => ipcWrap(Promise.resolve(cuentaCorrienteDB.getMovimientos(id))),
    getSaldo: (id) => ipcWrap(Promise.resolve(cuentaCorrienteDB.getSaldo(id))),
    registrarPago: (clienteId, monto, desc, uid) =>
      ipcWrap(Promise.resolve(cuentaCorrienteDB.registrarPago(clienteId, monto, desc, uid))),
    registrarCargo: (clienteId, ventaId, monto, desc, uid) =>
      ipcWrap(Promise.resolve(cuentaCorrienteDB.registrarCargo(clienteId, ventaId, monto, desc, uid)))
  }

  api.listasPrecio = {
    getAll: () => ipcWrap(Promise.resolve(listasPrecioDB.getAll())),
    create: (d) => ipcWrap(Promise.resolve(listasPrecioDB.create(d))),
    update: (d) => ipcWrap(Promise.resolve(listasPrecioDB.update(d))),
    delete: (id) => ipcWrap(Promise.resolve(listasPrecioDB.delete(id))),
    getItems: (id) => ipcWrap(Promise.resolve(listasPrecioDB.getItems(id))),
    setItem: (listaId, productoId, precio) =>
      ipcWrap(Promise.resolve(listasPrecioDB.setItem(listaId, productoId, precio))),
    removeItem: (listaId, productoId) =>
      ipcWrap(Promise.resolve(listasPrecioDB.removeItem(listaId, productoId))),
    getAllItems: (listaId) => ipcWrap(Promise.resolve(listasPrecioDB.getAllItems(listaId)))
  }

  api.gastos = {
    getAll: (d, h, options) => ipcWrap(Promise.resolve(gastosDB.getAll(d, h, options))),
    create: (d, uid) => ipcWrap(Promise.resolve(gastosDB.create(d, uid))),
    delete: (id) => ipcWrap(Promise.resolve(gastosDB.delete(id))),
    resumenMes: () => ipcWrap(Promise.resolve(gastosDB.resumenMes()))
  }

  api.seed = {
    run: (usuarioId) => ipcWrap(runPwaSeedDemo(usuarioId)),
    clear: () => ipcWrap(clearPwaSeedDemo())
  }

  return api
}
