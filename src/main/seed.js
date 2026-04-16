import { ipcMain } from 'electron'
import { getDb } from './db/index.js'
import { CATEGORIAS, PROVEEDORES, PRODUCTOS, DEMO_PRODUCT_CODES } from '../shared/seedDemoData.js'

export function setupSeed() {

  ipcMain.handle('seed:run', (_event, usuarioId) => {
    try {
      const db = getDb()

      const insertCat  = db.prepare('INSERT OR IGNORE INTO categorias (nombre, descripcion) VALUES (?, ?)')
      const getCat     = db.prepare('SELECT id FROM categorias WHERE nombre=?')
      const insertProv = db.prepare('INSERT INTO proveedores (nombre, contacto, telefono, email, direccion) VALUES (?, ?, ?, ?, ?)')
      const getProv    = db.prepare('SELECT id FROM proveedores WHERE nombre=? AND activo=1 ORDER BY id DESC LIMIT 1')
      const existeProv = db.prepare('SELECT id FROM proveedores WHERE nombre=? AND activo=1')
      const insertProd = db.prepare(`
        INSERT OR IGNORE INTO productos
          (codigo, nombre, descripcion, categoria_id, proveedor_id, precio_compra, precio_venta, stock_actual, stock_minimo, unidad)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const getProd    = db.prepare('SELECT id FROM productos WHERE codigo=?')
      const insertMov  = db.prepare(`
        INSERT INTO movimientos_stock
          (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia_tipo, usuario_id)
        VALUES (?, 'ingreso', ?, 0, ?, 'Stock inicial (demo)', 'ajuste', ?)
      `)

      const run = db.transaction(() => {
        const catIds = []
        for (const c of CATEGORIAS) {
          insertCat.run(c.nombre, c.descripcion)
          const row = getCat.get(c.nombre)
          catIds.push(row.id)
        }

        const provIds = []
        for (const p of PROVEEDORES) {
          const existe = existeProv.get(p.nombre)
          if (!existe) {
            insertProv.run(p.nombre, p.contacto, p.telefono, p.email, p.direccion)
          }
          const row = getProv.get(p.nombre)
          provIds.push(row.id)
        }

        let creados = 0
        let omitidos = 0
        for (const p of PRODUCTOS) {
          const [codigo, nombre, desc, catIdx, provIdx, pc, pv, stock, stockMin, unidad] = p
          const catId  = catIds[catIdx]
          const provId = provIds[provIdx]
          const result = insertProd.run(codigo, nombre, desc, catId, provId, pc, pv, stock, stockMin, unidad)
          if (result.changes > 0) {
            const prod = getProd.get(codigo)
            if (stock > 0 && prod) {
              insertMov.run(prod.id, stock, stock, usuarioId || null)
            }
            creados++
          } else {
            omitidos++
          }
        }

        return { creados, omitidos, categorias: catIds.length, proveedores: provIds.length }
      })

      const data = run()
      return { ok: true, data }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('seed:clear', (_event) => {
    try {
      const db = getDb()
      const codigos = DEMO_PRODUCT_CODES
      const ph = codigos.map(() => '?').join(',')

      const getProds   = db.prepare(`SELECT id FROM productos WHERE codigo IN (${ph})`)
      const delMovs    = db.prepare('DELETE FROM movimientos_stock WHERE producto_id=?')
      const softProd   = db.prepare(`UPDATE productos SET activo=0, categoria_id=NULL, proveedor_id=NULL WHERE codigo IN (${ph})`)
      const desactProv = db.prepare('UPDATE proveedores SET activo=0 WHERE nombre=?')
      const delCat     = db.prepare('DELETE FROM categorias WHERE nombre=?')

      const run = db.transaction(() => {
        const prods = getProds.all(...codigos)
        for (const p of prods) delMovs.run(p.id)
        softProd.run(...codigos)
        for (const p of PROVEEDORES) desactProv.run(p.nombre)
        for (const c of CATEGORIAS) {
          try { delCat.run(c.nombre) } catch {}
        }
        return { eliminados: prods.length }
      })

      const data = run()
      return { ok: true, data }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })
}
