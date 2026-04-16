/** Adaptador IndexedDB (PWA); misma interfaz que SQLite. */
import { initIndexedDB, transaction, objectStore, promisifyRequest } from './schema.js'
import { ensureBrowserCommerceId } from '../../shared/commerceScope.js'

let db = null

function makeSyncId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `sync_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

async function getDb() {
  if (!db) {
    const clientName = localStorage.getItem('clientName') || 'demo'
    db = await initIndexedDB(clientName)
  }
  return db
}

async function getAll(storeName, index = null) {
  const database = await getDb()
  const tx = transaction(database, [storeName])
  const store = objectStore(tx, storeName)
  const target = index ? store.index(index) : store
  return promisifyRequest(target.getAll())
}

async function getById(storeName, id) {
  const database = await getDb()
  const tx = transaction(database, [storeName])
  const store = objectStore(tx, storeName)
  return promisifyRequest(store.get(id))
}

async function create(storeName, data) {
  const database = await getDb()
  const tx = transaction(database, [storeName], 'readwrite')
  const store = objectStore(tx, storeName)
  const now = new Date().toISOString()
  if (!data.createdAt) {
    data.createdAt = now
  }
  if (!data.created_at) data.created_at = data.createdAt
  if (!data.updatedAt) data.updatedAt = now
  if (!data.updated_at) data.updated_at = data.updatedAt
  if (!data.sync_id) data.sync_id = makeSyncId()
  if (!data.commerce_id) data.commerce_id = ensureBrowserCommerceId()
  
  return promisifyRequest(store.add(data))
}

async function update(storeName, data) {
  const database = await getDb()
  const tx = transaction(database, [storeName], 'readwrite')
  const store = objectStore(tx, storeName)
  data.updatedAt = new Date().toISOString()
  data.updated_at = data.updatedAt
  if (!data.commerce_id) data.commerce_id = ensureBrowserCommerceId()
  
  return promisifyRequest(store.put(data))
}

async function remove(storeName, id) {
  const database = await getDb()
  const tx = transaction(database, [storeName], 'readwrite')
  const store = objectStore(tx, storeName)
  return promisifyRequest(store.delete(id))
}

async function query(storeName, indexName, value) {
  const database = await getDb()
  const tx = transaction(database, [storeName])
  const store = objectStore(tx, storeName)
  const index = store.index(indexName)
  return promisifyRequest(index.getAll(value))
}

async function queryByDateRange(storeName, indexName, desde, hasta) {
  if (!desde || !hasta) return getAll(storeName, indexName)
  const database = await getDb()
  const tx = transaction(database, [storeName])
  const store = objectStore(tx, storeName)
  const index = store.index(indexName)
  const range = IDBKeyRange.bound(desde, `${hasta}\uffff`)
  return promisifyRequest(index.getAll(range))
}

async function queryByManyValues(storeName, indexName, values) {
  if (!values?.length) return []
  const uniqueValues = [...new Set(values)]
  const database = await getDb()
  const tx = transaction(database, [storeName])
  const store = objectStore(tx, storeName)
  const index = store.index(indexName)
  const out = []
  for (const value of uniqueValues) {
    const rows = await promisifyRequest(index.getAll(value))
    if (rows?.length) out.push(...rows)
  }
  return out
}

function normalizeListOptions(options = {}, defaultPageSize = 20) {
  const page = Math.max(1, Number(options.page) || 1)
  const pageSize = Math.max(1, Number(options.pageSize) || defaultPageSize)
  const paginate = options.paginate === true
  return { paginate, page, pageSize }
}

function paginateRows(rows, options = {}, defaultPageSize = 20) {
  const { paginate, page, pageSize } = normalizeListOptions(options, defaultPageSize)
  if (!paginate) return rows
  const total = rows.length
  const start = (page - 1) * pageSize
  return {
    items: rows.slice(start, start + pageSize),
    total,
    page,
    pageSize
  }
}

async function withUsuarioNombre(rows) {
  if (!rows?.length) return rows || []
  const usuarios = await getAll('usuarios')
  const map = new Map(usuarios.map((u) => [u.id, u.nombre]))
  return rows.map((r) => ({ ...r, usuario_nombre: map.get(r.usuario_id) ?? null }))
}

const usuariosAdapter = {
  async login(username, password) {
    try {
      const users = await query('usuarios', 'username', username)
      const user = users.find(u => u.username === username && u.password === password)
      return user || null
    } catch {
      return null
    }
  },

  async getAll() {
    return getAll('usuarios')
  },

  async create(data) {
    return create('usuarios', data)
  },

  async update(data) {
    return update('usuarios', data)
  },

  async updatePassword(id, password) {
    const user = await getById('usuarios', id)
    if (user) {
      user.password = password
      return update('usuarios', user)
    }
    return null
  },

  async delete(id) {
    const user = await getById('usuarios', id)
    if (user) {
      user.activo = 0
      user.deletedAt = new Date().toISOString()
      user.deleted_at = user.deletedAt
      return update('usuarios', user)
    }
    return null
  }
}

const categoriasAdapter = {
  async getAll() {
    const all = await getAll('categorias')
    return all.filter(c => c.activo !== 0)
  },

  async getAllIncludingInactive() {
    return getAll('categorias')
  },

  async create(data) {
    return create('categorias', { ...data, activo: 1 })
  },

  async update(data) {
    return update('categorias', data)
  },

  async delete(id) {
    const item = await getById('categorias', id)
    if (item) {
      item.activo = 0
      item.deletedAt = new Date().toISOString()
      item.deleted_at = item.deletedAt
      return update('categorias', item)
    }
    return null
  }
}

const proveedoresAdapter = {
  async getAll() {
    const all = await getAll('proveedores')
    return all.filter(p => p.activo !== 0)
  },

  async getAllIncludingInactive() {
    return getAll('proveedores')
  },

  async create(data) {
    return create('proveedores', { ...data, activo: 1 })
  },

  async update(data) {
    return update('proveedores', data)
  },

  async delete(id) {
    const item = await getById('proveedores', id)
    if (item) {
      item.activo = 0
      item.deletedAt = new Date().toISOString()
      item.deleted_at = item.deletedAt
      return update('proveedores', item)
    }
    return null
  }
}

const productosAdapter = {
  async getAll() {
    const all = await getAll('productos')
    return all.filter(p => p.activo !== 0)
  },

  async getById(id) {
    const p = await getById('productos', id)
    if (!p || p.activo === 0) return null
    return p
  },

  async getByCodigo(codigo) {
    try {
      const products = await query('productos', 'codigo', codigo)
      return products.find(p => p.codigo === codigo && p.activo !== 0) || null
    } catch {
      return null
    }
  },

  async getStockBajo() {
    const all = await getAll('productos')
    return all.filter(p => p.activo !== 0 && p.stock_actual <= p.stock_minimo)
  },

  async getVencimientosCercanos() {
    const all = await getAll('productos')
    const hoy = new Date()
    const limite = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 días
    
    return all.filter(p => {
      if (!p.fecha_vencimiento || p.activo === 0) return false
      const venc = new Date(p.fecha_vencimiento)
      return venc <= limite && venc >= hoy
    })
  },

  async findDuplicate(nombre, codigo) {
    const all = await getAll('productos')
    return all.find(p => 
      p.activo !== 0 && (
        (nombre && p.nombre?.toLowerCase() === nombre.toLowerCase()) ||
        (codigo && p.codigo === codigo)
      )
    ) || null
  },

  async create(data, usuarioId) {
    return create('productos', { 
      ...data, 
      activo: 1,
      stock_actual: data.stock_actual || 0,
      createdBy: usuarioId 
    })
  },

  async update(data) {
    return update('productos', data)
  },

  async delete(id) {
    const item = await getById('productos', id)
    if (item) {
      item.activo = 0
      item.deletedAt = new Date().toISOString()
      item.deleted_at = item.deletedAt
      return update('productos', item)
    }
    return null
  },

  async sumarStock(id, cantidad, usuarioId, fechaVencLote) {
    const database = await getDb()
    const tx = transaction(database, ['productos', 'movimientos_stock'], 'readwrite')
    const prodStore = objectStore(tx, 'productos')
    const producto = await promisifyRequest(prodStore.get(id))

    if (!producto) throw new Error('Producto no encontrado')

    const stockAnterior = producto.stock_actual
    const stockNuevo = stockAnterior + cantidad
    producto.stock_actual = stockNuevo
    if (fechaVencLote && (!producto.fecha_vencimiento || new Date(fechaVencLote) < new Date(producto.fecha_vencimiento))) {
      producto.fecha_vencimiento = fechaVencLote
    }

    await promisifyRequest(prodStore.put(producto))
    const movStore = objectStore(tx, 'movimientos_stock')
    await promisifyRequest(movStore.add({
      producto_id: id,
      tipo: 'ingreso',
      cantidad,
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo,
      motivo: 'suma_stock',
      referencia_tipo: 'manual',
      usuario_id: usuarioId,
      fecha: new Date().toISOString(),
      fecha_vencimiento: fechaVencLote || null,
      commerce_id: producto.commerce_id || ensureBrowserCommerceId()
    }))

    return { success: true }
  },

  async updatePreciosMasivo(porcentaje, categoriaId) {
    const all = await getAll('productos')
    const productos = categoriaId 
      ? all.filter(p => p.categoria_id === categoriaId && p.activo !== 0)
      : all.filter(p => p.activo !== 0)
    
    const database = await getDb()
    const tx = transaction(database, ['productos'], 'readwrite')
    const store = objectStore(tx, 'productos')
    
    for (const producto of productos) {
      const factor = 1 + (porcentaje / 100)
      producto.precio_venta = Math.round(producto.precio_venta * factor * 100) / 100
      await promisifyRequest(store.put(producto))
    }
    
    return productos.length
  }
}

const ventasAdapter = {
  async getAll(desde, hasta, options = {}) {
    let ventas = await queryByDateRange('ventas', 'fecha', desde, hasta)
    ventas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    const { paginate } = normalizeListOptions(options, 15)
    if (!desde || !hasta) {
      if (paginate) {
        ventas = ventas.slice(0, Math.max(ventas.length, 100))
      } else {
        ventas = ventas.slice(0, 100)
      }
    }
    ventas = await withUsuarioNombre(ventas)
    if (paginate) {
      return paginateRows(ventas, options, 15)
    }
    if (!desde || !hasta) {
      ventas = ventas.slice(0, 100)
    }
    return ventas
  },

  async getById(id) {
    return getById('ventas', id)
  },

  async getItems(venta_id) {
    const items = await query('venta_items', 'venta_id', venta_id)
    if (!items.length) return []
    const productos = await getAll('productos')
    const pmap = new Map(productos.map((p) => [p.id, p]))
    return items.map((it) => {
      const p = pmap.get(it.producto_id)
      return {
        ...it,
        producto_nombre: p?.nombre ?? '',
        producto_codigo: p?.codigo ?? ''
      }
    })
  },

  async create(venta, items, usuarioId, clienteId) {
    const database = await getDb()
    const tx = transaction(
      database,
      ['ventas', 'venta_items', 'productos', 'movimientos_stock', 'cajas', 'movimientos_caja', 'cuenta_corriente'],
      'readwrite'
    )

    const commerceId = ensureBrowserCommerceId()
    const ventaData = {
      ...venta,
      usuario_id: usuarioId,
      cliente_id: clienteId || null,
      fecha: new Date().toISOString(),
      estado: 'completada',
      commerce_id: venta.commerce_id || commerceId
    }
    delete ventaData.id

    const ventaStore = objectStore(tx, 'ventas')
    const ventaResult = await promisifyRequest(ventaStore.add(ventaData))
    const ventaId = ventaResult

    const itemStore = objectStore(tx, 'venta_items')
    const prodStore = objectStore(tx, 'productos')
    const movStore = objectStore(tx, 'movimientos_stock')
    const fecha = new Date().toISOString()

    for (const item of items) {
      const { id: _omitId, ...itemSinId } = item
      await promisifyRequest(
        itemStore.add({
          ...itemSinId,
          venta_id: ventaId,
          commerce_id: commerceId
        })
      )

      const producto = await promisifyRequest(prodStore.get(item.producto_id))
      if (producto) {
        const stockAnterior = producto.stock_actual
        const stockNuevo = stockAnterior - item.cantidad
        producto.stock_actual = stockNuevo

        await promisifyRequest(prodStore.put(producto))

        await promisifyRequest(
          movStore.add({
            producto_id: item.producto_id,
            tipo: 'egreso',
            cantidad: item.cantidad,
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            motivo: 'venta',
            referencia_id: ventaId,
            referencia_tipo: 'venta',
            usuario_id: usuarioId,
            fecha,
            commerce_id: commerceId
          })
        )
      }
    }

    if (venta.metodo_pago === 'cuenta_corriente' && clienteId) {
      const ccStore = objectStore(tx, 'cuenta_corriente')
      await promisifyRequest(
        ccStore.add({
          cliente_id: clienteId,
          venta_id: ventaId,
          tipo: 'cargo',
          monto: venta.total,
          descripcion: `Venta #${ventaId}`,
          usuario_id: usuarioId || null,
          fecha,
          commerce_id: commerceId
        })
      )
    } else {
      const cajaStore = objectStore(tx, 'cajas')
      const allCajas = await promisifyRequest(cajaStore.getAll())
      const cajaAbierta =
        allCajas.filter((c) => c.estado === 'abierta').sort((a, b) => b.id - a.id)[0] || null
      if (cajaAbierta) {
        const movCajaStore = objectStore(tx, 'movimientos_caja')
        await promisifyRequest(
          movCajaStore.add({
            caja_id: cajaAbierta.id,
            tipo: 'venta',
            monto: venta.total,
            descripcion: `Venta #${ventaId}`,
            metodo_pago: venta.metodo_pago || 'efectivo',
            referencia_id: ventaId,
            fecha,
            commerce_id: commerceId
          })
        )
      }
    }

    return ventaId
  },

  async anular(id, usuarioId) {
    const venta = await getById('ventas', id)
    if (!venta || venta.estado !== 'completada') {
      throw new Error('La venta no existe o ya fue anulada')
    }
    const items = await query('venta_items', 'venta_id', id)
    const cajas = await getAll('cajas')
    const cajaAbierta = cajas.filter((c) => c.estado === 'abierta').sort((a, b) => b.id - a.id)[0] || null

    const database = await getDb()
    const tx = transaction(database, ['ventas', 'productos', 'movimientos_stock', 'movimientos_caja'], 'readwrite')
    const ventaStore = objectStore(tx, 'ventas')
    const prodStore = objectStore(tx, 'productos')
    const movStore = objectStore(tx, 'movimientos_stock')
    const movCajaStore = objectStore(tx, 'movimientos_caja')
    const fecha = new Date().toISOString()
    const commerceId = venta.commerce_id || ensureBrowserCommerceId()

    venta.estado = 'anulada'
    await promisifyRequest(ventaStore.put(venta))

    for (const item of items) {
      const producto = await promisifyRequest(prodStore.get(item.producto_id))
      if (!producto) continue
      const stockAnterior = Number(producto.stock_actual) || 0
      const cant = Number(item.cantidad) || 0
      const stockNuevo = stockAnterior + cant
      producto.stock_actual = stockNuevo
      await promisifyRequest(prodStore.put(producto))
      await promisifyRequest(
        movStore.add({
          producto_id: item.producto_id,
          tipo: 'ingreso',
          cantidad: cant,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          motivo: 'anulacion_venta',
          referencia_id: id,
          referencia_tipo: 'venta',
          usuario_id: usuarioId || null,
          fecha,
          commerce_id: commerceId
        })
      )
    }

    if (cajaAbierta != null && venta.total != null) {
      await promisifyRequest(
        movCajaStore.add({
          caja_id: cajaAbierta.id,
          tipo: 'egreso',
          monto: venta.total,
          descripcion: `Anulación Venta #${id}`,
          metodo_pago: venta.metodo_pago || 'efectivo',
          referencia_id: id,
          fecha,
          commerce_id: commerceId
        })
      )
    }

    return true
  },

  async resumenHoy() {
    const hoy = new Date().toISOString().split('T')[0]
    const ventasHoy = (await queryByDateRange('ventas', 'fecha', hoy, hoy)).filter(
      (v) => v.estado === 'completada'
    )
    
    return {
      cantidad: ventasHoy.length,
      total: ventasHoy.reduce((sum, v) => sum + (v.total || 0), 0)
    }
  },

  async resumenPeriodo(desde, hasta) {
    const ventasFiltradas = (await queryByDateRange('ventas', 'fecha', desde, hasta)).filter(
      (v) => v.estado === 'completada'
    )
    const resumen = {}
    ventasFiltradas.forEach(v => {
      const dia = new Date(v.fecha).toISOString().split('T')[0]
      if (!resumen[dia]) {
        resumen[dia] = { dia, cantidad: 0, total: 0 }
      }
      resumen[dia].cantidad++
      resumen[dia].total += v.total || 0
    })
    
    return Object.values(resumen).sort((a, b) => a.dia.localeCompare(b.dia))
  }
}

const stockAdapter = {
  async getMovimientos(producto_id) {
    return producto_id 
      ? query('movimientos_stock', 'producto_id', producto_id)
      : await getAll('movimientos_stock')
  },

  async ajuste(data, usuarioId) {
    const database = await getDb()
    const tx = transaction(database, ['productos', 'movimientos_stock'], 'readwrite')
    const prodStore = objectStore(tx, 'productos')
    const movStore = objectStore(tx, 'movimientos_stock')
    const prod = await promisifyRequest(prodStore.get(data.producto_id))
    if (!prod) throw new Error('Producto no encontrado')

    const stockAnterior = Number(prod.stock_actual) || 0
    const qty = Number(data.cantidad) || 0
    const stockNuevo =
      data.tipo === 'ingreso' ? stockAnterior + qty : stockAnterior - qty
    prod.stock_actual = stockNuevo
    await promisifyRequest(prodStore.put(prod))

    const fecha = new Date().toISOString()
    await promisifyRequest(
      movStore.add({
        producto_id: data.producto_id,
        tipo: data.tipo,
        cantidad: qty,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        motivo: data.motivo || 'Ajuste',
        referencia_tipo: 'ajuste',
        usuario_id: usuarioId || null,
        fecha_vencimiento: data.fecha_vencimiento || null,
        fecha,
        commerce_id: prod.commerce_id || ensureBrowserCommerceId()
      })
    )

    if (data.tipo === 'ingreso' && data.fecha_vencimiento) {
      const idx = movStore.index('producto_id')
      const movs = await promisifyRequest(idx.getAll(data.producto_id))
      const fechas = movs
        .filter((m) => m.tipo === 'ingreso' && m.fecha_vencimiento)
        .map((m) => m.fecha_vencimiento)
        .filter(Boolean)
        .sort()
      const minF = fechas[0]
      if (minF) {
        const p2 = await promisifyRequest(prodStore.get(data.producto_id))
        if (p2) {
          p2.fecha_vencimiento = minF
          await promisifyRequest(prodStore.put(p2))
        }
      }
    }

    return { success: true }
  },

  async deleteMovimientosByProducto(productoId) {
    const database = await getDb()
    const tx = transaction(database, ['movimientos_stock'], 'readwrite')
    const movStore = objectStore(tx, 'movimientos_stock')
    const idx = movStore.index('producto_id')
    const movs = await promisifyRequest(idx.getAll(productoId))
    for (const m of movs) {
      await promisifyRequest(movStore.delete(m.id))
    }
    return movs.length
  }
}

const cajaAdapter = {
  async getCajaAbierta() {
    const cajas = await getAll('cajas')
    const abiertas = cajas.filter((c) => c.estado === 'abierta')
    return abiertas.sort((a, b) => b.id - a.id)[0] || null
  },

  async getAll() {
    const cajas = await getAll('cajas')
    const sorted = cajas.sort((a, b) => b.id - a.id).slice(0, 50)
    return withUsuarioNombre(sorted)
  },

  async getMovimientos(caja_id) {
    return query('movimientos_caja', 'caja_id', caja_id)
  },

  async abrir(saldo_inicial, usuarioId) {
    return create('cajas', {
      saldo_inicial,
      usuario_id: usuarioId,
      fecha_apertura: new Date().toISOString(),
      estado: 'abierta'
    })
  },

  async cerrar(id) {
    const caja = await getById('cajas', id)
    if (!caja) return null

    const movs = await query('movimientos_caja', 'caja_id', id)
    const byTipo = {}
    for (const m of movs) {
      const t = m.tipo
      if (!t) continue
      byTipo[t] = (byTipo[t] || 0) + (Number(m.monto) || 0)
    }
    const totalVentas = byTipo.venta || 0
    const totalIngresos = byTipo.ingreso || 0
    const totalEgresos = byTipo.egreso || 0
    const saldoInicial = Number(caja.saldo_inicial) || 0
    const saldoFinal = saldoInicial + totalVentas + totalIngresos - totalEgresos

    caja.estado = 'cerrada'
    caja.fecha_cierre = new Date().toISOString()
    caja.saldo_final = saldoFinal
    caja.total_ventas = totalVentas
    caja.total_ingresos = totalIngresos
    caja.total_egresos = totalEgresos
    await update('cajas', caja)
    return { saldoFinal, totalVentas, totalIngresos, totalEgresos }
  },

  async addMovimiento(data) {
    return create('movimientos_caja', {
      ...data,
      fecha: new Date().toISOString()
    })
  }
}

const cotizacionesAdapter = {
  async getAll(options = {}) {
    let rows = await getAll('cotizaciones')
    rows.sort((a, b) => b.id - a.id)
    const { paginate } = normalizeListOptions(options, 15)
    if (paginate) {
      const enriched = await withUsuarioNombre(rows)
      return paginateRows(enriched, options, 15)
    }
    rows = rows.slice(0, 100)
    return withUsuarioNombre(rows)
  },
  async getById(id) {
    const c = await getById('cotizaciones', id)
    if (!c) return null
    const [enriched] = await withUsuarioNombre([c])
    return enriched
  },
  async getItems(id) {
    const items = await query('cotizacion_items', 'cotizacion_id', id)
    if (!items.length) return []
    const productos = await getAll('productos')
    const pmap = new Map(productos.map((p) => [p.id, p]))
    return items.map((it) => ({
      ...it,
      codigo: it.codigo ?? pmap.get(it.producto_id)?.codigo ?? null
    }))
  },
  async create(cotizacion, items, usuarioId) {
    const database = await getDb()
    const tx = transaction(database, ['cotizaciones', 'cotizacion_items'], 'readwrite')
    const cotStore = objectStore(tx, 'cotizaciones')
    const itemStore = objectStore(tx, 'cotizacion_items')
    const commerceId = cotizacion.commerce_id || ensureBrowserCommerceId()
    const cotData = {
      ...cotizacion,
      usuario_id: usuarioId || null,
      fecha: cotizacion.fecha || new Date().toISOString(),
      estado: cotizacion.estado || 'pendiente',
      commerce_id: commerceId
    }
    const cotId = await promisifyRequest(cotStore.add(cotData))
    for (const item of items || []) {
      await promisifyRequest(
        itemStore.add({
          cotizacion_id: cotId,
          producto_id: item.producto_id || null,
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
          commerce_id: commerceId
        })
      )
    }
    return cotId
  },
  async updateEstado(id, estado) {
    const item = await getById('cotizaciones', id)
    if (item) {
      item.estado = estado
      return update('cotizaciones', item)
    }
    return null
  },
  async delete(id) {
    const database = await getDb()
    const tx = transaction(database, ['cotizaciones', 'cotizacion_items'], 'readwrite')
    const cotStore = objectStore(tx, 'cotizaciones')
    const itemStore = objectStore(tx, 'cotizacion_items')
    const idx = itemStore.index('cotizacion_id')
    const rows = await promisifyRequest(idx.getAll(id))
    for (const row of rows) {
      await promisifyRequest(itemStore.delete(row.id))
    }
    await promisifyRequest(cotStore.delete(id))
    return true
  }
}

const configAdapter = {
  async getAll() {
    const configs = await getAll('configuracion')
    return configs.reduce((acc, c) => ({ ...acc, [c.clave]: c.valor }), {})
  },

  async set(clave, valor) {
    return update('configuracion', { clave, valor, commerce_id: ensureBrowserCommerceId() })
  },

  async setMany(obj) {
    const database = await getDb()
    const tx = transaction(database, ['configuracion'], 'readwrite')
    const store = objectStore(tx, 'configuracion')
    
    for (const [clave, valor] of Object.entries(obj)) {
      await promisifyRequest(store.put({ clave, valor, commerce_id: ensureBrowserCommerceId() }))
    }
    
    return true
  }
}

function ventaDiaKey(fecha) {
  return new Date(fecha).toISOString().split('T')[0]
}

const reportesAdapter = {
  async ventasPorDia(desde, hasta) {
    return ventasAdapter.resumenPeriodo(desde, hasta)
  },

  async ventasPorProducto(desde, hasta) {
    const ventas = await queryByDateRange('ventas', 'fecha', desde, hasta)
    const ventaIds = [
      ...new Set(
      ventas
        .filter(
          (v) =>
            v.estado === 'completada'
        )
        .map((v) => v.id)
      )
    ]
    const items = await queryByManyValues('venta_items', 'venta_id', ventaIds)
    const productos = await getAll('productos')
    const prodMap = new Map(productos.map((p) => [p.id, p]))
    const agg = new Map()
    for (const it of items) {
      const p = prodMap.get(it.producto_id)
      if (!p) continue
      const cur = agg.get(it.producto_id) || {
        nombre: p.nombre,
        codigo: p.codigo,
        cantidad_vendida: 0,
        total_vendido: 0
      }
      cur.cantidad_vendida += Number(it.cantidad) || 0
      cur.total_vendido += Number(it.subtotal) || 0
      agg.set(it.producto_id, cur)
    }
    return [...agg.values()].sort((a, b) => b.total_vendido - a.total_vendido).slice(0, 20)
  },

  async ventasPorCategoria(desde, hasta) {
    const ventas = await queryByDateRange('ventas', 'fecha', desde, hasta)
    const ventaIds = [
      ...new Set(
      ventas
        .filter(
          (v) =>
            v.estado === 'completada'
        )
        .map((v) => v.id)
      )
    ]
    const items = await queryByManyValues('venta_items', 'venta_id', ventaIds)
    const productos = await getAll('productos')
    const categorias = await getAll('categorias')
    const prodMap = new Map(productos.map((p) => [p.id, p]))
    const catMap = new Map(categorias.map((c) => [c.id, c.nombre]))
    const agg = new Map()
    for (const it of items) {
      const p = prodMap.get(it.producto_id)
      if (!p) continue
      const cid = p.categoria_id == null ? '__sin__' : p.categoria_id
      const categoria = p.categoria_id == null ? null : catMap.get(p.categoria_id) || null
      const cur = agg.get(cid) || { categoria, total: 0 }
      cur.total += Number(it.subtotal) || 0
      cur.categoria = categoria
      agg.set(cid, cur)
    }
    return [...agg.values()].sort((a, b) => b.total - a.total)
  },

  async resumenGeneral() {
    const ventas = await getAll('ventas')
    const productos = await getAll('productos')
    const proveedores = await getAll('proveedores')
    let totalVentas = 0
    let montoTotal = 0
    for (const v of ventas) {
      if (v.estado === 'completada') {
        totalVentas++
        montoTotal += Number(v.total) || 0
      }
    }
    let totalProductos = 0
    let stockBajo = 0
    for (const p of productos) {
      if (p.activo !== 0) {
        totalProductos++
        if ((Number(p.stock_actual) || 0) <= (Number(p.stock_minimo) || 0)) {
          stockBajo++
        }
      }
    }
    let totalProveedores = 0
    for (const pr of proveedores) {
      if (pr.activo !== 0) totalProveedores++
    }

    return {
      total_ventas: totalVentas,
      monto_total: montoTotal,
      total_productos: totalProductos,
      stock_bajo: stockBajo,
      total_proveedores: totalProveedores
    }
  }
}

const clientesAdapter = {
  async getAll() {
    const all = await getAll('clientes')
    return all.filter(c => c.activo !== 0)
  },
  async getById(id) { return getById('clientes', id) },
  async create(data) { return create('clientes', { ...data, activo: 1 }) },
  async update(data) { return update('clientes', data) },
  async delete(id) {
    const item = await getById('clientes', id)
    if (item) {
      item.activo = 0
      item.deletedAt = new Date().toISOString()
      item.deleted_at = item.deletedAt
      return update('clientes', item)
    }
    return null
  }
}

const cuentaCorrienteAdapter = {
  async _totalesPorCliente() {
    const allCc = await getAll('cuenta_corriente')
    const saldoPorCliente = new Map()
    for (const m of allCc) {
      const cid = m.cliente_id
      if (cid == null) continue
      const monto = Number(m.monto) || 0
      const delta = m.tipo === 'cargo' ? monto : -monto
      saldoPorCliente.set(cid, (saldoPorCliente.get(cid) || 0) + delta)
    }
    return saldoPorCliente
  },

  async getAllSaldos() {
    const allClientes = await getAll('clientes')
    const clientes = allClientes.filter((c) => c.activo !== 0)
    const saldoPorCliente = await this._totalesPorCliente()
    return clientes
      .map((c) => ({
        ...c,
        saldo: saldoPorCliente.get(c.id) ?? 0
      }))
      .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), undefined, { sensitivity: 'base' }))
  },

  async getMovimientos(cliente_id) {
    let rows = await query('cuenta_corriente', 'cliente_id', cliente_id)
    rows = [...rows].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    const ventas = await getAll('ventas')
    const vmap = new Map(ventas.map((v) => [v.id, v.total]))
    return rows.map((r) => ({
      ...r,
      venta_total: r.venta_id != null ? vmap.get(r.venta_id) ?? null : null
    }))
  },

  async getSaldo(cliente_id) {
    const saldoPorCliente = await this._totalesPorCliente()
    return saldoPorCliente.get(cliente_id) ?? 0
  },

  async registrarPago(cliente_id, monto, descripcion, usuarioId) {
    return create('cuenta_corriente', {
      cliente_id,
      monto: Number(monto) || 0,
      descripcion: descripcion || 'Pago',
      usuario_id: usuarioId,
      tipo: 'pago',
      fecha: new Date().toISOString()
    })
  },

  async registrarCargo(cliente_id, venta_id, monto, descripcion, usuarioId) {
    return create('cuenta_corriente', {
      cliente_id,
      venta_id,
      monto: Number(monto) || 0,
      descripcion,
      usuario_id: usuarioId,
      tipo: 'cargo',
      fecha: new Date().toISOString()
    })
  }
}

const listasPreciosAdapter = {
  async getAll() {
    const all = await getAll('listas_precio')
    return all.filter(l => l.activa !== 0)
  },
  async create(data) { return create('listas_precio', { ...data, activa: 1 }) },
  async update(data) { return update('listas_precio', data) },
  async delete(id) {
    const item = await getById('listas_precio', id)
    if (item) {
      item.activa = 0
      return update('listas_precio', item)
    }
    return null
  },
  async getItems(listaId) { return query('lista_precio_items', 'lista_id', listaId) },
  async setItem(listaId, productoId, precio) {
    return create('lista_precio_items', { lista_id: listaId, producto_id: productoId, precio })
  },
  async removeItem(listaId, productoId) {
    const items = await query('lista_precio_items', 'lista_id', listaId)
    const item = items.find(i => i.producto_id === productoId)
    if (item) {
      return remove('lista_precio_items', item.id)
    }
    return null
  },
  async getAllItems(listaId) { return this.getItems(listaId) }
}

const gastosAdapter = {
  async getAll(desde, hasta, options = {}) {
    let gastos = await queryByDateRange('gastos', 'fecha', desde, hasta)
    gastos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    const { paginate } = normalizeListOptions(options, 20)
    if (!desde || !hasta) {
      if (paginate) {
        gastos = gastos.slice(0, Math.max(gastos.length, 100))
      } else {
        gastos = gastos.slice(0, 100)
      }
    }
    if (paginate) {
      return paginateRows(gastos, options, 20)
    }
    return gastos
  },
  async create(data, usuarioId) {
    return create('gastos', {
      ...data,
      usuario_id: usuarioId,
      fecha: data.fecha || new Date().toISOString()
    })
  },
  async delete(id) { return remove('gastos', id) },
  async resumenMes() {
    const gastos = await getAll('gastos')
    const mesActual = new Date().toISOString().slice(0, 7)
    const gastosMes = gastos.filter(g => g.fecha?.startsWith(mesActual))
    return {
      total: gastosMes.reduce((sum, g) => sum + (g.monto || 0), 0)
    }
  }
}

/** Cierra la conexión IndexedDB en memoria; la próxima operación reabre. */
export function resetIndexedDbCache() {
  if (db) {
    try {
      db.close()
    } catch {
      void 0
    }
    db = null
  }
}

export const indexedDbAdapter = {
  usuarios: usuariosAdapter,
  productos: productosAdapter,
  categorias: categoriasAdapter,
  proveedores: proveedoresAdapter,
  ventas: ventasAdapter,
  stock: stockAdapter,
  caja: cajaAdapter,
  cotizaciones: cotizacionesAdapter,
  config: configAdapter,
  reportes: reportesAdapter,
  clientes: clientesAdapter,
  cuentaCorriente: cuentaCorrienteAdapter,
  listasPrecios: listasPreciosAdapter,
  gastos: gastosAdapter
}