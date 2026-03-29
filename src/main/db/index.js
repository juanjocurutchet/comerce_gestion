import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { initSchema } from './schema.js'

let db

export function getDb() {
  if (!db) {
    const dbPath = join(app.getPath('userData'), 'comercio.db')
    db = new Database(dbPath)
    initSchema(db)
  }
  return db
}

// ─── Usuarios ───────────────────────────────────────────────────────────────

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

// ─── Categorías ─────────────────────────────────────────────────────────────

export const categoriasDB = {
  getAll: () => getDb().prepare('SELECT * FROM categorias ORDER BY nombre').all(),
  create: (data) => getDb().prepare('INSERT INTO categorias (nombre, descripcion) VALUES (@nombre, @descripcion)').run(data),
  update: (data) => getDb().prepare('UPDATE categorias SET nombre=@nombre, descripcion=@descripcion WHERE id=@id').run(data),
  delete: (id) => getDb().prepare('DELETE FROM categorias WHERE id=?').run(id)
}

// ─── Proveedores ─────────────────────────────────────────────────────────────

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

// ─── Productos ───────────────────────────────────────────────────────────────

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
  create: (data) => getDb().prepare(`
    INSERT INTO productos (codigo, nombre, descripcion, categoria_id, proveedor_id, precio_compra, precio_venta, stock_actual, stock_minimo, unidad)
    VALUES (@codigo, @nombre, @descripcion, @categoria_id, @proveedor_id, @precio_compra, @precio_venta, @stock_actual, @stock_minimo, @unidad)
  `).run(data),
  update: (data) => getDb().prepare(`
    UPDATE productos SET codigo=@codigo, nombre=@nombre, descripcion=@descripcion,
    categoria_id=@categoria_id, proveedor_id=@proveedor_id, precio_compra=@precio_compra,
    precio_venta=@precio_venta, stock_minimo=@stock_minimo, unidad=@unidad WHERE id=@id
  `).run(data),
  delete: (id) => getDb().prepare('UPDATE productos SET activo=0 WHERE id=?').run(id),
  ajustarStock: (id, cantidad) => getDb().prepare('UPDATE productos SET stock_actual = stock_actual + ? WHERE id=?').run(cantidad, id)
}

// ─── Ventas ──────────────────────────────────────────────────────────────────

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
  create: (venta, items, usuarioId) => {
    const db = getDb()
    const insertVenta = db.prepare(`
      INSERT INTO ventas (subtotal, descuento, total, metodo_pago, notas, usuario_id)
      VALUES (@subtotal, @descuento, @total, @metodo_pago, @notas, @usuario_id)
    `)
    const insertItem = db.prepare(`
      INSERT INTO venta_items (venta_id, producto_id, cantidad, precio_unitario, subtotal)
      VALUES (@venta_id, @producto_id, @cantidad, @precio_unitario, @subtotal)
    `)
    const updateStock = db.prepare('UPDATE productos SET stock_actual = stock_actual - ? WHERE id=?')
    const insertMov = db.prepare(`
      INSERT INTO movimientos_stock (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia_id, referencia_tipo, usuario_id)
      VALUES (?, 'egreso', ?, ?, ?, 'venta', ?, 'venta', ?)
    `)

    return db.transaction(() => {
      const result = insertVenta.run({ ...venta, usuario_id: usuarioId })
      const ventaId = result.lastInsertRowid
      for (const item of items) {
        insertItem.run({ ...item, venta_id: ventaId })
        const prod = db.prepare('SELECT stock_actual FROM productos WHERE id=?').get(item.producto_id)
        const stockNuevo = prod.stock_actual - item.cantidad
        updateStock.run(item.cantidad, item.producto_id)
        insertMov.run(item.producto_id, item.cantidad, prod.stock_actual, stockNuevo, ventaId, usuarioId)
      }
      return ventaId
    })()
  },
  anular: (id) => getDb().prepare("UPDATE ventas SET estado='anulada' WHERE id=?").run(id),
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

// ─── Movimientos de Stock ────────────────────────────────────────────────────

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
        INSERT INTO movimientos_stock (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia_tipo, usuario_id)
        VALUES (?, ?, ?, ?, ?, ?, 'ajuste', ?)
      `).run(data.producto_id, data.tipo, data.cantidad, prod.stock_actual, stockNuevo, data.motivo, usuarioId)
    })()
  }
}

// ─── Caja ────────────────────────────────────────────────────────────────────

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

// ─── Reportes ────────────────────────────────────────────────────────────────

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
