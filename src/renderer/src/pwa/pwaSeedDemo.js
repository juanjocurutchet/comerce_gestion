/** Demo en PWA (IndexedDB); misma idea que `main/seed.js` en Electron. */
import {
  categoriasDB,
  proveedoresDB,
  productosDB,
  stockDB
} from '@shared/db/interface.js'
import { CATEGORIAS, PROVEEDORES, PRODUCTOS, DEMO_PRODUCT_CODES } from '@shared/seedDemoData.js'

async function ensureCategoria(nombre, descripcion) {
  const list = await categoriasDB.getAllIncludingInactive()
  const row = list.find((c) => c.nombre === nombre)
  if (row) {
    if (row.activo === 0) {
      await categoriasDB.update({ ...row, activo: 1, descripcion })
    }
    return row.id
  }
  return categoriasDB.create({ nombre, descripcion })
}

async function ensureProveedor(p) {
  const list = await proveedoresDB.getAllIncludingInactive()
  const row = list.find((x) => x.nombre === p.nombre)
  if (row) {
    if (row.activo === 0) {
      await proveedoresDB.update({
        ...row,
        activo: 1,
        contacto: p.contacto,
        telefono: p.telefono,
        email: p.email,
        direccion: p.direccion
      })
    }
    return row.id
  }
  return proveedoresDB.create({
    nombre: p.nombre,
    contacto: p.contacto,
    telefono: p.telefono,
    email: p.email,
    direccion: p.direccion
  })
}

export async function runPwaSeedDemo(usuarioId) {
  const catIds = []
  for (const c of CATEGORIAS) {
    catIds.push(await ensureCategoria(c.nombre, c.descripcion))
  }

  const provIds = []
  for (const pr of PROVEEDORES) {
    provIds.push(await ensureProveedor(pr))
  }

  let creados = 0
  let omitidos = 0

  for (const row of PRODUCTOS) {
    const [codigo, nombre, desc, catIdx, provIdx, pc, pv, stock, stockMin, unidad] = row
    const existing = await productosDB.getByCodigo(codigo)
    if (existing) {
      omitidos++
      continue
    }
    const catId = catIds[catIdx]
    const provId = provIds[provIdx]
    const id = await productosDB.create(
      {
        codigo,
        nombre,
        descripcion: desc,
        categoria_id: catId,
        proveedor_id: provId,
        precio_compra: pc,
        precio_venta: pv,
        stock_actual: 0,
        stock_minimo: stockMin,
        unidad
      },
      usuarioId || null
    )
    if (stock > 0 && id) {
      await stockDB.ajuste(
        {
          producto_id: id,
          tipo: 'ingreso',
          cantidad: stock,
          motivo: 'Stock inicial (demo)'
        },
        usuarioId || null
      )
    }
    creados++
  }

  return {
    creados,
    omitidos,
    categorias: catIds.length,
    proveedores: provIds.length
  }
}

export async function clearPwaSeedDemo() {
  let eliminados = 0
  for (const codigo of DEMO_PRODUCT_CODES) {
    const prod = await productosDB.getByCodigo(codigo)
    if (!prod) continue
    await stockDB.deleteMovimientosByProducto(prod.id)
    await productosDB.delete(prod.id)
    eliminados++
  }

  const provList = await proveedoresDB.getAllIncludingInactive()
  for (const p of PROVEEDORES) {
    const row = provList.find((x) => x.nombre === p.nombre)
    if (row && row.activo !== 0) {
      await proveedoresDB.update({ ...row, activo: 0 })
    }
  }

  const catList = await categoriasDB.getAllIncludingInactive()
  for (const c of CATEGORIAS) {
    const row = catList.find((x) => x.nombre === c.nombre)
    if (row) await categoriasDB.delete(row.id)
  }

  return { eliminados }
}
