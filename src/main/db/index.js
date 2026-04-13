import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { initSchema } from './schema.js'
import { getClientConfig } from '../client.js'

let db

export function getDb() {
  if (!db) {
    const dbPath = join(app.getPath('userData'), 'comercio.db')
    db = new Database(dbPath)
    const { clientName } = getClientConfig()
    initSchema(db, clientName)
  }
  return db
}

export const usuariosDB = {
  login: (username, password) =>
    getDb().prepare('SELECT * FROM usuarios WHERE username=? AND password=? AND activo=1').get(username, password),
  getAll: () =>
    getDb().prepare('SELECT id, nombre, username, rol, activo, created_at FROM usuarios ORDER BY nombre').all(),
  create: (data) =>
    getDb().prepare('INSERT INTO usuarios (nombre, username, password, rol) VALUES (@nombre, @username, @password, @rol)').run(data),
  update: (data) =>
    getDb().prepare('UPDATE usuarios SET nombre=@nombre, username=@username, rol=@rol, activo=@activo WHERE id=@id').run(data),
  updatePassword: (id, password) =>
    getDb().prepare('UPDATE usuarios SET password=? WHERE id=?').run(password, id),
  delete: (id) =>
    getDb().prepare('UPDATE usuarios SET activo=0 WHERE id=?').run(id)
}

export const categoriasDB = {
  getAll: () => getDb().prepare('SELECT * FROM categorias ORDER BY nombre').all(),
  create: (data) => getDb().prepare('INSERT INTO categorias (nombre, descripcion) VALUES (@nombre, @descripcion)').run(data),
  update: (data) => getDb().prepare('UPDATE categorias SET nombre=@nombre, descripcion=@descripcion WHERE id=@id').run(data),
  delete: (id) => getDb().prepare('DELETE FROM categorias WHERE id=?').run(id)
}

export const proveedoresDB = {
  getAll: () => getDb().prepare('SELECT * FROM proveedores WHERE activo=1 ORDER BY nombre').all(),
  create: (data) => getDb().prepare(`
    INSERT INTO proveedores (nombre, contacto, telefono, email, direccion, notas)
    VALUES (@nombre, @contacto, @telefono, @email, @direccion, @notas)
  `).run(data),
  update: (data) => getDb().prepare(`
    UPDATE proveedores SET nombre=@nombre, contacto=@contacto, telefono=@telefono,
    email=@email, direccion=@direccion, notas=@notas WHERE id=@id
  `).run(data),
  delete: (id) => getDb().prepare('UPDATE proveedores SET activo=0 WHERE id=?').run(id)
}

export const productosDB = {
  getAll: () => getDb().prepare(`
    SELECT p.*, c.nombre as categoria_nombre, pr.nombre as proveedor_nombre
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
    WHERE p.activo=1 ORDER BY p.nombre
  `).all(),
  getById: (id) => getDb().prepare('SELECT * FROM productos WHERE id=?').get(id),
  getByCodigo: (codigo) => getDb().prepare('SELECT * FROM productos WHERE codigo=? AND activo=1').get(codigo),
  getStockBajo: () => getDb().prepare('SELECT * FROM productos WHERE stock_actual <= stock_minimo AND activo=1').all(),
  getVencimientosCercanos: () => {
    return getDb().prepare(`
      SELECT p.*, c.nombre as categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.activo=1
        AND p.fecha_vencimiento IS NOT NULL AND p.fecha_vencimiento != ''
        AND date(p.fecha_vencimiento) <= date('now', '+' || COALESCE(p.dias_alerta_vencimiento, 7) || ' days')
      ORDER BY p.fecha_vencimiento ASC
    `).all()
  },

  findDuplicate: (nombre, codigo) => {
    const db = getDb()
    if (codigo) {
      const byCode = db.prepare('SELECT * FROM productos WHERE codigo=? AND activo=1').get(codigo)
      if (byCode) return { ...byCode, matchBy: 'codigo' }
    }
    const byName = db.prepare("SELECT * FROM productos WHERE LOWER(nombre)=LOWER(?) AND activo=1").get(nombre)
    if (byName) return { ...byName, matchBy: 'nombre' }
    return null
  },

  create: (data, usuarioId) => {
    const db = getDb()
    return db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO productos (codigo, nombre, descripcion, categoria_id, proveedor_id, precio_compra, precio_venta, stock_actual, stock_minimo, unidad, fecha_vencimiento)
        VALUES (@codigo, @nombre, @descripcion, @categoria_id, @proveedor_id, @precio_compra, @precio_venta, @stock_actual, @stock_minimo, @unidad, @fecha_vencimiento)
      `).run(data)
      const id = result.lastInsertRowid
      if (data.stock_actual > 0) {
        db.prepare(`
          INSERT INTO movimientos_stock (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia_tipo, usuario_id)
          VALUES (?, 'ingreso', ?, 0, ?, 'Stock inicial', 'ajuste', ?)
        `).run(id, data.stock_actual, data.stock_actual, usuarioId || null)
      }
      return id
    })()
  },

  sumarStock: (id, cantidad, usuarioId, fechaVencLote = null) => {
    const db = getDb()
    return db.transaction(() => {
      const prod = db.prepare('SELECT stock_actual FROM productos WHERE id=?').get(id)
      const stockNuevo = prod.stock_actual + cantidad
      db.prepare('UPDATE productos SET stock_actual=? WHERE id=?').run(stockNuevo, id)
      db.prepare(`
        INSERT INTO movimientos_stock (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia_tipo, usuario_id, fecha_vencimiento)
        VALUES (?, 'ingreso', ?, ?, ?, 'Reposición de stock', 'ajuste', ?, ?)
      `).run(id, cantidad, prod.stock_actual, stockNuevo, usuarioId || null, fechaVencLote || null)
      if (fechaVencLote) {
        db.prepare(`
          UPDATE productos SET fecha_vencimiento = (
            SELECT MIN(fecha_vencimiento) FROM movimientos_stock
            WHERE producto_id=? AND tipo='ingreso' AND fecha_vencimiento IS NOT NULL
          ) WHERE id=?
        `).run(id, id)
      }
      return stockNuevo
    })()
  },

  update: (data) => getDb().prepare(`
    UPDATE productos SET codigo=@codigo, nombre=@nombre, descripcion=@descripcion,
    categoria_id=@categoria_id, proveedor_id=@proveedor_id, precio_compra=@precio_compra,
    precio_venta=@precio_venta, stock_minimo=@stock_minimo, unidad=@unidad,
    fecha_vencimiento=@fecha_vencimiento, dias_alerta_vencimiento=@dias_alerta_vencimiento WHERE id=@id
  `).run(data),
  delete: (id) => getDb().prepare('UPDATE productos SET activo=0 WHERE id=?').run(id),
  ajustarStock: (id, cantidad) => getDb().prepare('UPDATE productos SET stock_actual = stock_actual + ? WHERE id=?').run(cantidad, id)
}

export const ventasDB = {
  getAll: (desde, hasta) => {
    const q = desde && hasta
      ? "SELECT v.*, u.nombre as usuario_nombre FROM ventas v LEFT JOIN usuarios u ON v.usuario_id=u.id WHERE date(v.fecha) BETWEEN ? AND ? ORDER BY v.fecha DESC"
      : "SELECT v.*, u.nombre as usuario_nombre FROM ventas v LEFT JOIN usuarios u ON v.usuario_id=u.id ORDER BY v.fecha DESC LIMIT 100"
    return desde && hasta ? getDb().prepare(q).all(desde, hasta) : getDb().prepare(q).all()
  },
  getById: (id) => getDb().prepare('SELECT * FROM ventas WHERE id=?').get(id),
  getItems: (venta_id) => getDb().prepare(`
    SELECT vi.*, p.nombre as producto_nombre, p.codigo as producto_codigo
    FROM venta_items vi JOIN productos p ON vi.producto_id=p.id WHERE vi.venta_id=?
  `).all(venta_id),
  create: (venta, items, usuarioId, clienteId) => {
    const db = getDb()
    const insertVenta    = db.prepare(`
      INSERT INTO ventas (subtotal, descuento, total, metodo_pago, notas, usuario_id, cliente_id)
      VALUES (@subtotal, @descuento, @total, @metodo_pago, @notas, @usuario_id, @cliente_id)
    `)
    const insertItem     = db.prepare(`
      INSERT INTO venta_items (venta_id, producto_id, cantidad, precio_unitario, subtotal)
      VALUES (@venta_id, @producto_id, @cantidad, @precio_unitario, @subtotal)
    `)
    const updateStock    = db.prepare('UPDATE productos SET stock_actual = stock_actual - ? WHERE id=?')
    const getStock       = db.prepare('SELECT stock_actual FROM productos WHERE id=?')
    const insertMovStock = db.prepare(`
      INSERT INTO movimientos_stock (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia_id, referencia_tipo, usuario_id)
      VALUES (?, 'egreso', ?, ?, ?, 'venta', ?, 'venta', ?)
    `)
    const getCajaAbierta = db.prepare("SELECT id FROM cajas WHERE estado='abierta' ORDER BY id DESC LIMIT 1")
    const insertMovCaja  = db.prepare(`
      INSERT INTO movimientos_caja (caja_id, tipo, monto, descripcion, metodo_pago, referencia_id)
      VALUES (?, 'venta', ?, ?, ?, ?)
    `)

    const insertCC = db.prepare(`
      INSERT INTO cuenta_corriente (cliente_id, venta_id, tipo, monto, descripcion, usuario_id)
      VALUES (?, ?, 'cargo', ?, ?, ?)
    `)

    return db.transaction(() => {
      const result  = insertVenta.run({ ...venta, usuario_id: usuarioId, cliente_id: clienteId || null })
      const ventaId = result.lastInsertRowid

      for (const item of items) {
        insertItem.run({ ...item, venta_id: ventaId })
        const prod      = getStock.get(item.producto_id)
        const stockNuevo = prod.stock_actual - item.cantidad
        updateStock.run(item.cantidad, item.producto_id)
        insertMovStock.run(item.producto_id, item.cantidad, prod.stock_actual, stockNuevo, ventaId, usuarioId)
      }

      if (venta.metodo_pago === 'cuenta_corriente' && clienteId) {
        insertCC.run(clienteId, ventaId, venta.total, `Venta #${ventaId}`, usuarioId || null)
      } else {
        const caja = getCajaAbierta.get()
        if (caja) {
          insertMovCaja.run(caja.id, venta.total, `Venta #${ventaId}`, venta.metodo_pago, ventaId)
        }
      }

      return ventaId
    })()
  },
  anular: (id, usuarioId) => {
    const db = getDb()
    const getVenta       = db.prepare("SELECT * FROM ventas WHERE id=? AND estado='completada'")
    const getItems       = db.prepare('SELECT * FROM venta_items WHERE venta_id=?')
    const getStock       = db.prepare('SELECT stock_actual FROM productos WHERE id=?')
    const updateEstado   = db.prepare("UPDATE ventas SET estado='anulada' WHERE id=?")
    const restoreStock   = db.prepare('UPDATE productos SET stock_actual = stock_actual + ? WHERE id=?')
    const insertMovStock = db.prepare(`
      INSERT INTO movimientos_stock (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia_id, referencia_tipo, usuario_id)
      VALUES (?, 'ingreso', ?, ?, ?, 'anulacion_venta', ?, 'venta', ?)
    `)
    const getCajaAbierta = db.prepare("SELECT id FROM cajas WHERE estado='abierta' ORDER BY id DESC LIMIT 1")
    const insertMovCaja  = db.prepare(`
      INSERT INTO movimientos_caja (caja_id, tipo, monto, descripcion, metodo_pago, referencia_id)
      VALUES (?, 'egreso', ?, ?, ?, ?)
    `)

    return db.transaction(() => {
      const venta = getVenta.get(id)
      if (!venta) throw new Error('La venta no existe o ya fue anulada')

      updateEstado.run(id)

      const items = getItems.all(id)
      for (const item of items) {
        const prod = getStock.get(item.producto_id)
        const stockNuevo = prod.stock_actual + item.cantidad
        restoreStock.run(item.cantidad, item.producto_id)
        insertMovStock.run(item.producto_id, item.cantidad, prod.stock_actual, stockNuevo, id, usuarioId || null)
      }

      const caja = getCajaAbierta.get()
      if (caja) {
        insertMovCaja.run(caja.id, venta.total, `Anulación Venta #${id}`, venta.metodo_pago, id)
      }

      return true
    })()
  },
  resumenHoy: () => getDb().prepare(`
    SELECT COUNT(*) as cantidad, COALESCE(SUM(total),0) as total
    FROM ventas WHERE date(fecha)=date('now','localtime') AND estado='completada'
  `).get(),
  resumenPeriodo: (desde, hasta) => getDb().prepare(`
    SELECT date(fecha) as dia, COUNT(*) as cantidad, SUM(total) as total
    FROM ventas WHERE date(fecha) BETWEEN ? AND ? AND estado='completada'
    GROUP BY dia ORDER BY dia
  `).all(desde, hasta)
}

export const stockDB = {
  getMovimientos: (producto_id) => {
    const q = producto_id
      ? 'SELECT ms.*, p.nombre as producto_nombre FROM movimientos_stock ms JOIN productos p ON ms.producto_id=p.id WHERE ms.producto_id=? ORDER BY ms.fecha DESC LIMIT 100'
      : 'SELECT ms.*, p.nombre as producto_nombre FROM movimientos_stock ms JOIN productos p ON ms.producto_id=p.id ORDER BY ms.fecha DESC LIMIT 200'
    return producto_id ? getDb().prepare(q).all(producto_id) : getDb().prepare(q).all()
  },
  ajuste: (data, usuarioId) => {
    const db = getDb()
    return db.transaction(() => {
      const prod = db.prepare('SELECT stock_actual FROM productos WHERE id=?').get(data.producto_id)
      const stockNuevo = data.tipo === 'ingreso'
        ? prod.stock_actual + data.cantidad
        : prod.stock_actual - data.cantidad
      db.prepare('UPDATE productos SET stock_actual=? WHERE id=?').run(stockNuevo, data.producto_id)
      db.prepare(`
        INSERT INTO movimientos_stock (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia_tipo, usuario_id, fecha_vencimiento)
        VALUES (?, ?, ?, ?, ?, ?, 'ajuste', ?, ?)
      `).run(data.producto_id, data.tipo, data.cantidad, prod.stock_actual, stockNuevo, data.motivo, usuarioId, data.fecha_vencimiento || null)
      if (data.tipo === 'ingreso' && data.fecha_vencimiento) {
        db.prepare(`
          UPDATE productos SET fecha_vencimiento = (
            SELECT MIN(fecha_vencimiento) FROM movimientos_stock
            WHERE producto_id=? AND tipo='ingreso' AND fecha_vencimiento IS NOT NULL
          ) WHERE id=?
        `).run(data.producto_id, data.producto_id)
      }
    })()
  }
}

export const cajaDB = {
  getCajaAbierta: () => getDb().prepare("SELECT * FROM cajas WHERE estado='abierta' ORDER BY id DESC LIMIT 1").get(),
  getAll: () => getDb().prepare('SELECT c.*, u.nombre as usuario_nombre FROM cajas c LEFT JOIN usuarios u ON c.usuario_id=u.id ORDER BY c.id DESC LIMIT 50').all(),
  getMovimientos: (caja_id) => getDb().prepare('SELECT * FROM movimientos_caja WHERE caja_id=? ORDER BY id DESC').all(caja_id),
  abrir: (saldo_inicial, usuarioId) => {
    return getDb().prepare('INSERT INTO cajas (saldo_inicial, usuario_id) VALUES (?, ?)').run(saldo_inicial, usuarioId)
  },
  cerrar: (id) => {
    const db = getDb()
    return db.transaction(() => {
      const movs = db.prepare('SELECT tipo, SUM(monto) as total FROM movimientos_caja WHERE caja_id=? GROUP BY tipo').all(id)
      const caja = db.prepare('SELECT * FROM cajas WHERE id=?').get(id)
      const totalVentas = movs.find(m => m.tipo === 'venta')?.total || 0
      const totalIngresos = movs.find(m => m.tipo === 'ingreso')?.total || 0
      const totalEgresos = movs.find(m => m.tipo === 'egreso')?.total || 0
      const saldoFinal = caja.saldo_inicial + totalVentas + totalIngresos - totalEgresos
      db.prepare(`
        UPDATE cajas SET estado='cerrada', fecha_cierre=datetime('now','localtime'),
        saldo_final=?, total_ventas=?, total_ingresos=?, total_egresos=? WHERE id=?
      `).run(saldoFinal, totalVentas, totalIngresos, totalEgresos, id)
      return { saldoFinal, totalVentas, totalIngresos, totalEgresos }
    })()
  },
  addMovimiento: (data) => {
    return getDb().prepare(`
      INSERT INTO movimientos_caja (caja_id, tipo, monto, descripcion, metodo_pago, referencia_id)
      VALUES (@caja_id, @tipo, @monto, @descripcion, @metodo_pago, @referencia_id)
    `).run(data)
  }
}

export const cotizacionesDB = {
  getAll: () => getDb().prepare(`
    SELECT c.*, u.nombre as usuario_nombre
    FROM cotizaciones c
    LEFT JOIN usuarios u ON c.usuario_id = u.id
    ORDER BY c.id DESC LIMIT 100
  `).all(),

  getById: (id) => getDb().prepare(`
    SELECT c.*, u.nombre as usuario_nombre
    FROM cotizaciones c LEFT JOIN usuarios u ON c.usuario_id=u.id
    WHERE c.id=?
  `).get(id),

  getItems: (cotizacion_id) => getDb().prepare(`
    SELECT ci.*, p.codigo
    FROM cotizacion_items ci
    LEFT JOIN productos p ON ci.producto_id = p.id
    WHERE ci.cotizacion_id = ?
  `).all(cotizacion_id),

  create: (cotizacion, items, usuarioId) => {
    const db = getDb()
    const insertCot  = db.prepare(`
      INSERT INTO cotizaciones (subtotal, descuento, total, notas, validez_dias, usuario_id)
      VALUES (@subtotal, @descuento, @total, @notas, @validez_dias, @usuario_id)
    `)
    const insertItem = db.prepare(`
      INSERT INTO cotizacion_items (cotizacion_id, producto_id, nombre, cantidad, precio_unitario, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    return db.transaction(() => {
      const info = insertCot.run({ ...cotizacion, usuario_id: usuarioId || null })
      const id = Number(info.lastInsertRowid)
      for (const item of items) {
        insertItem.run(id, item.producto_id || null, item.nombre, item.cantidad, item.precio_unitario, item.subtotal)
      }
      return id
    })()
  },

  updateEstado: (id, estado) =>
    getDb().prepare('UPDATE cotizaciones SET estado=? WHERE id=?').run(estado, id),

  delete: (id) =>
    getDb().prepare('DELETE FROM cotizaciones WHERE id=?').run(id)
}

export const configDB = {
  getAll: () => {
    const rows = getDb().prepare('SELECT clave, valor FROM configuracion').all()
    return rows.reduce((acc, r) => ({ ...acc, [r.clave]: r.valor }), {})
  },
  set: (clave, valor) =>
    getDb().prepare('INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor').run(clave, valor),
  setMany: (obj) => {
    const stmt = getDb().prepare('INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor')
    const tx = getDb().transaction((data) => {
      for (const [k, v] of Object.entries(data)) stmt.run(k, v ?? '')
    })
    tx(obj)
  }
}

export const reportesDB = {
  ventasPorDia: (desde, hasta) => getDb().prepare(`
    SELECT date(fecha) as dia, COUNT(*) as cantidad, SUM(total) as total, AVG(total) as promedio
    FROM ventas WHERE date(fecha) BETWEEN ? AND ? AND estado='completada'
    GROUP BY dia ORDER BY dia
  `).all(desde, hasta),
  ventasPorProducto: (desde, hasta) => getDb().prepare(`
    SELECT p.nombre, p.codigo, SUM(vi.cantidad) as cantidad_vendida, SUM(vi.subtotal) as total_vendido
    FROM venta_items vi
    JOIN ventas v ON vi.venta_id=v.id
    JOIN productos p ON vi.producto_id=p.id
    WHERE date(v.fecha) BETWEEN ? AND ? AND v.estado='completada'
    GROUP BY p.id ORDER BY total_vendido DESC LIMIT 20
  `).all(desde, hasta),
  ventasPorCategoria: (desde, hasta) => getDb().prepare(`
    SELECT c.nombre as categoria, SUM(vi.subtotal) as total
    FROM venta_items vi
    JOIN ventas v ON vi.venta_id=v.id
    JOIN productos p ON vi.producto_id=p.id
    LEFT JOIN categorias c ON p.categoria_id=c.id
    WHERE date(v.fecha) BETWEEN ? AND ? AND v.estado='completada'
    GROUP BY c.id ORDER BY total DESC
  `).all(desde, hasta),
  resumenGeneral: () => getDb().prepare(`
    SELECT
      (SELECT COUNT(*) FROM ventas WHERE estado='completada') as total_ventas,
      (SELECT COALESCE(SUM(total),0) FROM ventas WHERE estado='completada') as monto_total,
      (SELECT COUNT(*) FROM productos WHERE activo=1) as total_productos,
      (SELECT COUNT(*) FROM productos WHERE stock_actual <= stock_minimo AND activo=1) as stock_bajo,
      (SELECT COUNT(*) FROM proveedores WHERE activo=1) as total_proveedores
  `).get()
}

export const clientesDB = {
  getAll: () => getDb().prepare('SELECT * FROM clientes WHERE activo=1 ORDER BY nombre').all(),
  getById: (id) => getDb().prepare('SELECT * FROM clientes WHERE id=?').get(id),
  create: (data) => getDb().prepare(`
    INSERT INTO clientes (nombre, telefono, dni, email, notas)
    VALUES (@nombre, @telefono, @dni, @email, @notas)
  `).run(data),
  update: (data) => getDb().prepare(`
    UPDATE clientes SET nombre=@nombre, telefono=@telefono, dni=@dni, email=@email, notas=@notas WHERE id=@id
  `).run(data),
  delete: (id) => getDb().prepare('UPDATE clientes SET activo=0 WHERE id=?').run(id)
}

export const cuentaCorrienteDB = {
  getAllSaldos: () => getDb().prepare(`
    SELECT c.*,
      COALESCE(SUM(CASE WHEN cc.tipo='cargo' THEN cc.monto ELSE -cc.monto END), 0) as saldo
    FROM clientes c
    LEFT JOIN cuenta_corriente cc ON cc.cliente_id = c.id
    WHERE c.activo=1
    GROUP BY c.id ORDER BY c.nombre
  `).all(),
  getMovimientos: (cliente_id) => getDb().prepare(`
    SELECT cc.*, v.total as venta_total
    FROM cuenta_corriente cc
    LEFT JOIN ventas v ON cc.venta_id = v.id
    WHERE cc.cliente_id = ?
    ORDER BY cc.fecha DESC
  `).all(cliente_id),
  getSaldo: (cliente_id) => {
    const r = getDb().prepare(`
      SELECT COALESCE(SUM(CASE WHEN tipo='cargo' THEN monto ELSE -monto END), 0) as saldo
      FROM cuenta_corriente WHERE cliente_id = ?
    `).get(cliente_id)
    return r?.saldo || 0
  },
  registrarPago: (cliente_id, monto, descripcion, usuarioId) => getDb().prepare(`
    INSERT INTO cuenta_corriente (cliente_id, tipo, monto, descripcion, usuario_id)
    VALUES (?, 'pago', ?, ?, ?)
  `).run(cliente_id, monto, descripcion || 'Pago', usuarioId || null),
  registrarCargo: (cliente_id, venta_id, monto, descripcion, usuarioId) => getDb().prepare(`
    INSERT INTO cuenta_corriente (cliente_id, venta_id, tipo, monto, descripcion, usuario_id)
    VALUES (?, ?, 'cargo', ?, ?, ?)
  `).run(cliente_id, venta_id, monto, descripcion, usuarioId || null)
}

export const gastosDB = {
  getAll: (desde, hasta) => {
    const q = desde && hasta
      ? `SELECT g.*, u.nombre as usuario_nombre FROM gastos g LEFT JOIN usuarios u ON g.usuario_id=u.id WHERE date(g.fecha) BETWEEN ? AND ? ORDER BY g.fecha DESC`
      : `SELECT g.*, u.nombre as usuario_nombre FROM gastos g LEFT JOIN usuarios u ON g.usuario_id=u.id ORDER BY g.fecha DESC LIMIT 100`
    return desde && hasta ? getDb().prepare(q).all(desde, hasta) : getDb().prepare(q).all()
  },
  create: (data, usuarioId) => getDb().prepare(`
    INSERT INTO gastos (fecha, monto, descripcion, categoria, usuario_id)
    VALUES (COALESCE(@fecha, datetime('now','localtime')), @monto, @descripcion, @categoria, @usuario_id)
  `).run({ ...data, usuario_id: usuarioId || null }),
  delete: (id) => getDb().prepare('DELETE FROM gastos WHERE id=?').run(id),
  resumenMes: () => getDb().prepare(`
    SELECT COALESCE(SUM(monto), 0) as total
    FROM gastos WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now', 'localtime')
  `).get()
}
