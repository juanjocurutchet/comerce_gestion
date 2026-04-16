/** Puerta de acceso única a la DB (SQLite o IndexedDB vía adaptador). */
let dbAdapter = null

export function setDbAdapter(adapter) {
  dbAdapter = adapter
}

function ensureAdapter() {
  if (!dbAdapter) {
    throw new Error('Database adapter not configured. Call setDbAdapter() first.')
  }
  return dbAdapter
}

export const usuariosDB = {
  login: async (username, password) => {
    const adapter = ensureAdapter()
    return await adapter.usuarios.login(username, password)
  },

  getAll: async () => {
    const adapter = ensureAdapter()
    return await adapter.usuarios.getAll()
  },

  create: async (data) => {
    const adapter = ensureAdapter()
    return await adapter.usuarios.create(data)
  },

  update: async (data) => {
    const adapter = ensureAdapter()
    return await adapter.usuarios.update(data)
  },

  updatePassword: async (id, password) => {
    const adapter = ensureAdapter()
    return await adapter.usuarios.updatePassword(id, password)
  },

  delete: async (id) => {
    const adapter = ensureAdapter()
    return await adapter.usuarios.delete(id)
  }
}

export const productosDB = {
  getAll: async () => {
    const adapter = ensureAdapter()
    return await adapter.productos.getAll()
  },

  getById: async (id) => {
    const adapter = ensureAdapter()
    return await adapter.productos.getById(id)
  },

  getByCodigo: async (codigo) => {
    const adapter = ensureAdapter()
    return await adapter.productos.getByCodigo(codigo)
  },

  getStockBajo: async () => {
    const adapter = ensureAdapter()
    return await adapter.productos.getStockBajo()
  },

  getVencimientosCercanos: async () => {
    const adapter = ensureAdapter()
    return await adapter.productos.getVencimientosCercanos()
  },

  findDuplicate: async (nombre, codigo) => {
    const adapter = ensureAdapter()
    return await adapter.productos.findDuplicate(nombre, codigo)
  },

  create: async (data, usuarioId) => {
    const adapter = ensureAdapter()
    return await adapter.productos.create(data, usuarioId)
  },

  sumarStock: async (id, cantidad, usuarioId, fechaVencLote = null) => {
    const adapter = ensureAdapter()
    return await adapter.productos.sumarStock(id, cantidad, usuarioId, fechaVencLote)
  },

  update: async (data) => {
    const adapter = ensureAdapter()
    return await adapter.productos.update(data)
  },

  delete: async (id) => {
    const adapter = ensureAdapter()
    return await adapter.productos.delete(id)
  },

  ajustarStock: async (id, cantidad) => {
    const adapter = ensureAdapter()
    return await adapter.productos.ajustarStock(id, cantidad)
  },

  updatePreciosMasivo: async (porcentaje, categoriaId) => {
    const adapter = ensureAdapter()
    return await adapter.productos.updatePreciosMasivo(porcentaje, categoriaId)
  }
}

export const categoriasDB = {
  getAll: async () => {
    const adapter = ensureAdapter()
    return await adapter.categorias.getAll()
  },

  create: async (data) => {
    const adapter = ensureAdapter()
    return await adapter.categorias.create(data)
  },

  update: async (data) => {
    const adapter = ensureAdapter()
    return await adapter.categorias.update(data)
  },

  delete: async (id) => {
    const adapter = ensureAdapter()
    return await adapter.categorias.delete(id)
  },

  getAllIncludingInactive: async () => {
    const adapter = ensureAdapter()
    if (typeof adapter.categorias.getAllIncludingInactive === 'function') {
      return await adapter.categorias.getAllIncludingInactive()
    }
    return await adapter.categorias.getAll()
  }
}

export const proveedoresDB = {
  getAll: async () => {
    const adapter = ensureAdapter()
    return await adapter.proveedores.getAll()
  },

  create: async (data) => {
    const adapter = ensureAdapter()
    return await adapter.proveedores.create(data)
  },

  update: async (data) => {
    const adapter = ensureAdapter()
    return await adapter.proveedores.update(data)
  },

  delete: async (id) => {
    const adapter = ensureAdapter()
    return await adapter.proveedores.delete(id)
  },

  getAllIncludingInactive: async () => {
    const adapter = ensureAdapter()
    if (typeof adapter.proveedores.getAllIncludingInactive === 'function') {
      return await adapter.proveedores.getAllIncludingInactive()
    }
    return await adapter.proveedores.getAll()
  }
}

export const ventasDB = {
  getAll: async (desde, hasta, options) => {
    const adapter = ensureAdapter()
    return await adapter.ventas.getAll(desde, hasta, options)
  },

  getById: async (id) => {
    const adapter = ensureAdapter()
    return await adapter.ventas.getById(id)
  },

  getItems: async (venta_id) => {
    const adapter = ensureAdapter()
    return await adapter.ventas.getItems(venta_id)
  },

  create: async (venta, items, usuarioId, clienteId) => {
    const adapter = ensureAdapter()
    return await adapter.ventas.create(venta, items, usuarioId, clienteId)
  },

  anular: async (id, usuarioId) => {
    const adapter = ensureAdapter()
    return await adapter.ventas.anular(id, usuarioId)
  },

  resumenHoy: async () => {
    const adapter = ensureAdapter()
    return await adapter.ventas.resumenHoy()
  },

  resumenPeriodo: async (desde, hasta) => {
    const adapter = ensureAdapter()
    return await adapter.ventas.resumenPeriodo(desde, hasta)
  }
}

export const stockDB = {
  getMovimientos: async (producto_id) => {
    const adapter = ensureAdapter()
    return await adapter.stock.getMovimientos(producto_id)
  },

  ajuste: async (data, usuarioId) => {
    const adapter = ensureAdapter()
    return await adapter.stock.ajuste(data, usuarioId)
  },

  deleteMovimientosByProducto: async (productoId) => {
    const adapter = ensureAdapter()
    if (typeof adapter.stock.deleteMovimientosByProducto !== 'function') return 0
    return await adapter.stock.deleteMovimientosByProducto(productoId)
  }
}

export const cajaDB = {
  getCajaAbierta: async () => {
    const adapter = ensureAdapter()
    return await adapter.caja.getCajaAbierta()
  },

  getAll: async () => {
    const adapter = ensureAdapter()
    return await adapter.caja.getAll()
  },

  getMovimientos: async (caja_id) => {
    const adapter = ensureAdapter()
    return await adapter.caja.getMovimientos(caja_id)
  },

  abrir: async (saldo_inicial, usuarioId) => {
    const adapter = ensureAdapter()
    return await adapter.caja.abrir(saldo_inicial, usuarioId)
  },

  cerrar: async (id) => {
    const adapter = ensureAdapter()
    return await adapter.caja.cerrar(id)
  },

  addMovimiento: async (data) => {
    const adapter = ensureAdapter()
    return await adapter.caja.addMovimiento(data)
  }
}

export const cotizacionesDB = {
  getAll: async (options) => {
    const adapter = ensureAdapter()
    return await adapter.cotizaciones.getAll(options)
  },

  getById: async (id) => {
    const adapter = ensureAdapter()
    return await adapter.cotizaciones.getById(id)
  },

  getItems: async (cotizacion_id) => {
    const adapter = ensureAdapter()
    return await adapter.cotizaciones.getItems(cotizacion_id)
  },

  create: async (cotizacion, items, usuarioId) => {
    const adapter = ensureAdapter()
    return await adapter.cotizaciones.create(cotizacion, items, usuarioId)
  },

  updateEstado: async (id, estado) => {
    const adapter = ensureAdapter()
    return await adapter.cotizaciones.updateEstado(id, estado)
  },

  delete: async (id) => {
    const adapter = ensureAdapter()
    return await adapter.cotizaciones.delete(id)
  }
}

export const configDB = {
  getAll: async () => {
    const adapter = ensureAdapter()
    return await adapter.config.getAll()
  },

  set: async (clave, valor) => {
    const adapter = ensureAdapter()
    return await adapter.config.set(clave, valor)
  },

  setMany: async (obj) => {
    const adapter = ensureAdapter()
    return await adapter.config.setMany(obj)
  }
}

export const reportesDB = {
  ventasPorDia: async (desde, hasta) => {
    const adapter = ensureAdapter()
    return await adapter.reportes.ventasPorDia(desde, hasta)
  },

  ventasPorProducto: async (desde, hasta) => {
    const adapter = ensureAdapter()
    return await adapter.reportes.ventasPorProducto(desde, hasta)
  },

  ventasPorCategoria: async (desde, hasta) => {
    const adapter = ensureAdapter()
    return await adapter.reportes.ventasPorCategoria(desde, hasta)
  },

  resumenGeneral: async () => {
    const adapter = ensureAdapter()
    return await adapter.reportes.resumenGeneral()
  }
}

export const clientesDB = {
  getAll: async () => {
    const adapter = ensureAdapter()
    return await adapter.clientes.getAll()
  },

  getById: async (id) => {
    const adapter = ensureAdapter()
    return await adapter.clientes.getById(id)
  },

  create: async (data) => {
    const adapter = ensureAdapter()
    return await adapter.clientes.create(data)
  },

  update: async (data) => {
    const adapter = ensureAdapter()
    return await adapter.clientes.update(data)
  },

  delete: async (id) => {
    const adapter = ensureAdapter()
    return await adapter.clientes.delete(id)
  }
}

export const cuentaCorrienteDB = {
  getAllSaldos: async () => {
    const adapter = ensureAdapter()
    return await adapter.cuentaCorriente.getAllSaldos()
  },

  getMovimientos: async (cliente_id) => {
    const adapter = ensureAdapter()
    return await adapter.cuentaCorriente.getMovimientos(cliente_id)
  },

  getSaldo: async (cliente_id) => {
    const adapter = ensureAdapter()
    return await adapter.cuentaCorriente.getSaldo(cliente_id)
  },

  registrarPago: async (cliente_id, monto, descripcion, usuarioId) => {
    const adapter = ensureAdapter()
    return await adapter.cuentaCorriente.registrarPago(cliente_id, monto, descripcion, usuarioId)
  },

  registrarCargo: async (cliente_id, venta_id, monto, descripcion, usuarioId) => {
    const adapter = ensureAdapter()
    return await adapter.cuentaCorriente.registrarCargo(cliente_id, venta_id, monto, descripcion, usuarioId)
  }
}

export const listasPrecioDB = {
  getAll: async () => {
    const adapter = ensureAdapter()
    return await adapter.listasPrecios.getAll()
  },

  create: async (data) => {
    const adapter = ensureAdapter()
    return await adapter.listasPrecios.create(data)
  },

  update: async (data) => {
    const adapter = ensureAdapter()
    return await adapter.listasPrecios.update(data)
  },

  delete: async (id) => {
    const adapter = ensureAdapter()
    return await adapter.listasPrecios.delete(id)
  },

  getItems: async (listaId) => {
    const adapter = ensureAdapter()
    return await adapter.listasPrecios.getItems(listaId)
  },

  setItem: async (listaId, productoId, precio) => {
    const adapter = ensureAdapter()
    return await adapter.listasPrecios.setItem(listaId, productoId, precio)
  },

  removeItem: async (listaId, productoId) => {
    const adapter = ensureAdapter()
    return await adapter.listasPrecios.removeItem(listaId, productoId)
  },

  getAllItems: async (listaId) => {
    const adapter = ensureAdapter()
    return await adapter.listasPrecios.getAllItems(listaId)
  }
}

export const gastosDB = {
  getAll: async (desde, hasta, options) => {
    const adapter = ensureAdapter()
    return await adapter.gastos.getAll(desde, hasta, options)
  },

  create: async (data, usuarioId) => {
    const adapter = ensureAdapter()
    return await adapter.gastos.create(data, usuarioId)
  },

  delete: async (id) => {
    const adapter = ensureAdapter()
    return await adapter.gastos.delete(id)
  },

  resumenMes: async () => {
    const adapter = ensureAdapter()
    return await adapter.gastos.resumenMes()
  }
}