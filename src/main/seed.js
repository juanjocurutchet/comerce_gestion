import { ipcMain } from 'electron'
import { getDb } from './db/index.js'

const CATEGORIAS = [
  { nombre: 'Plantas de Interior',        descripcion: 'Plantas para ambientes cerrados' },
  { nombre: 'Plantas de Exterior',        descripcion: 'Plantas para jardín y exteriores' },
  { nombre: 'Plantas Artificiales',       descripcion: 'Plantas y flores artificiales decorativas' },
  { nombre: 'Macetas y Contenedores',     descripcion: 'Macetas plásticas, cerámicas y jardineras' },
  { nombre: 'Ramos y Flores Cortadas',    descripcion: 'Ramos frescos y flores cortadas' },
  { nombre: 'Tierra y Sustratos',         descripcion: 'Sustratos, tierra negra y agregados' },
  { nombre: 'Pesticidas y Fertilizantes', descripcion: 'Abonos, fertilizantes e insecticidas' },
  { nombre: 'Decoración',                 descripcion: 'Piedras, musgo y accesorios decorativos' },
]

const PROVEEDORES = [
  { nombre: 'Vivero del Norte S.A.',   contacto: 'Carlos Méndez',   telefono: '0341-4123456', email: 'ventas@viveronorte.com',   direccion: 'Ruta 9 Km 12, Rosario' },
  { nombre: 'Plásticos Jardín S.R.L.', contacto: 'Ana Gutiérrez',   telefono: '011-47891234',  email: 'pedidos@plasticojardin.com', direccion: 'Av. Industrial 540, Bs. As.' },
  { nombre: 'AgroQuím S.A.',           contacto: 'Roberto Sosa',    telefono: '0351-4567890',  email: 'comercial@agroquim.com.ar',  direccion: 'Parque Industrial, Córdoba' },
  { nombre: 'Floral Import',           contacto: 'Lucía Pereyra',   telefono: '011-52341122',  email: 'info@floralimport.com.ar',   direccion: 'Mercado Central, Bs. As.' },
  { nombre: 'Deco Verde',              contacto: 'Martín Álvarez',  telefono: '0221-4981234',  email: 'deco@decoverde.com.ar',      direccion: 'Calle 13 N°455, La Plata' },
]

// [ codigo, nombre, descripcion, cat_idx, prov_idx, p_compra, p_venta, stock, stock_min, unidad ]
const PRODUCTOS = [
  // ── Plantas de Interior (cat 0, prov 0)
  ['PLI001', 'Pothos (Epipremnum) 14cm',       'Planta colgante de fácil cuidado',          0, 0,  350,  650,  30, 5, 'unidad'],
  ['PLI002', 'Sansevieria 20cm',               'Lengua de suegra, muy resistente',           0, 0,  420,  850,  20, 4, 'unidad'],
  ['PLI003', 'Helecho Boston 15cm',            'Helecho de interior, requiere humedad',      0, 0,  380,  700,  25, 5, 'unidad'],
  ['PLI004', 'Ficus Benjamina 60cm',           'Árbol de interior elegante',                 0, 0, 1200, 2200,  12, 3, 'unidad'],
  ['PLI005', 'Dracaena Marginata 40cm',        'Planta de interior moderna',                 0, 0,  900, 1800,  10, 3, 'unidad'],
  ['PLI006', 'Cactus Variado 10cm',            'Mix de cactus en maceta pequeña',            0, 0,  180,  350,  50, 10,'unidad'],
  ['PLI007', 'Suculentas Mix 8cm',             'Colección de suculentas surtidas',           0, 0,  150,  290,  60, 10,'unidad'],
  ['PLI008', 'Orquídea Phalaenopsis 2 varas',  'Orquídea con 2 varas florales',              0, 0, 1800, 3500,   8, 2, 'unidad'],
  ['PLI009', 'Lirio de Paz 20cm',              'Spathiphyllum, purifica el aire',            0, 0,  450,  850,  18, 4, 'unidad'],
  ['PLI010', 'Palmera Kentia 50cm',            'Palmera de interior de bajo mantenimiento',  0, 0, 1500, 2800,   6, 2, 'unidad'],

  // ── Plantas de Exterior (cat 1, prov 0)
  ['PLE001', 'Lavanda 15cm',                   'Arbusto aromático lila',                     1, 0,  280,  520,  35, 8, 'unidad'],
  ['PLE002', 'Jazmín Trepador 20cm',           'Trepadora de flor blanca perfumada',         1, 0,  350,  650,  20, 4, 'unidad'],
  ['PLE003', 'Rosa Arbustiva 30cm',            'Rosa en varios colores disponibles',         1, 0,  480,  950,  25, 5, 'unidad'],
  ['PLE004', 'Geranio 15cm',                   'Flor colorida para exterior',                1, 0,  200,  380,  40, 8, 'unidad'],
  ['PLE005', 'Bugambilia 25cm',                'Trepadora de flor fucsia intensa',           1, 0,  420,  820,  15, 3, 'unidad'],
  ['PLE006', 'Naranjo en Maceta 60cm',         'Árbol frutal ornamental',                    1, 0, 2200, 4200,   5, 2, 'unidad'],
  ['PLE007', 'Limonero en Maceta 60cm',        'Árbol frutal cítrico ornamental',            1, 0, 2000, 3900,   5, 2, 'unidad'],
  ['PLE008', 'Ciprés Italiano 80cm',           'Árbol perenne de forma columnar',            1, 0,  950, 1800,   8, 2, 'unidad'],

  // ── Plantas Artificiales (cat 2, prov 4)
  ['PLA001', 'Planta Artificial 40cm',         'Planta verde decorativa de interior',        2, 4,  600, 1200,  20, 4, 'unidad'],
  ['PLA002', 'Planta Artificial 80cm',         'Arbusto artificial para rincones',           2, 4, 1100, 2100,  12, 3, 'unidad'],
  ['PLA003', 'Árbol Artificial 1.5m',          'Árbol decorativo de gran presencia',         2, 4, 2800, 5200,   6, 2, 'unidad'],
  ['PLA004', 'Suculenta Artificial 10cm',      'Suculenta decorativa sin mantenimiento',     2, 4,  180,  350,  30, 6, 'unidad'],
  ['PLA005', 'Orquídea Artificial',            'Orquídea decorativa muy realista',           2, 4,  750, 1400,  15, 3, 'unidad'],

  // ── Macetas y Contenedores (cat 3, prov 1)
  ['MAC001', 'Maceta Plástica 15cm',           'Maceta redonda con plato incluido',          3, 1,   80,  150,  60, 10,'unidad'],
  ['MAC002', 'Maceta Plástica 25cm',           'Maceta mediana con plato',                   3, 1,  140,  260,  50, 10,'unidad'],
  ['MAC003', 'Maceta Plástica 35cm',           'Maceta grande con plato',                    3, 1,  220,  420,  30, 6, 'unidad'],
  ['MAC004', 'Maceta Cerámica 15cm',           'Maceta de cerámica esmaltada',               3, 1,  350,  680,  25, 5, 'unidad'],
  ['MAC005', 'Maceta Cerámica 25cm',           'Maceta cerámica premium',                    3, 1,  580, 1100,  15, 3, 'unidad'],
  ['MAC006', 'Macetón Terracota 40cm',         'Macetón clásico de terracota',               3, 1,  480,  920,  12, 3, 'unidad'],
  ['MAC007', 'Jardinera Rectangular 60cm',     'Jardinera para balcón o borde',              3, 1,  320,  620,  20, 4, 'unidad'],
  ['MAC008', 'Colgante Macramé',               'Soporte colgante artesanal para maceta',     3, 4,  280,  550,  18, 4, 'unidad'],

  // ── Ramos y Flores Cortadas (cat 4, prov 3)
  ['RAM001', 'Ramo de Rosas x12',              'Rosas frescas variedad híbrida',             4, 3,  900, 1800,  15, 3, 'unidad'],
  ['RAM002', 'Ramo Mixto Primaveral',          'Combinación de flores de temporada',         4, 3,  700, 1400,  12, 3, 'unidad'],
  ['RAM003', 'Girasoles x6',                   'Girasoles frescos de tallo largo',           4, 3,  500,  980,  10, 2, 'unidad'],
  ['RAM004', 'Liliums x5',                     'Liliums blancos o rosados',                  4, 3,  650, 1250,   8, 2, 'unidad'],
  ['RAM005', 'Margaritas x10',                 'Margaritas blancas frescas',                 4, 3,  350,  680,  15, 3, 'unidad'],

  // ── Tierra y Sustratos (cat 5, prov 0)
  ['TIE001', 'Tierra Negra 20L',               'Tierra fértil para todo uso',                5, 0,  380,  720,  40, 8, 'unidad'],
  ['TIE002', 'Sustrato Universal 10L',         'Sustrato premium con nutrientes',            5, 0,  280,  520,  35, 7, 'unidad'],
  ['TIE003', 'Sustrato para Cactus 5L',        'Sustrato drenante especial',                 5, 0,  180,  340,  25, 5, 'unidad'],
  ['TIE004', 'Perlita 2L',                     'Mejorador de drenaje y aireación',           5, 0,  120,  230,  30, 6, 'unidad'],
  ['TIE005', 'Mantillo 20L',                   'Abono orgánico enriquecido',                 5, 0,  420,  800,  20, 4, 'unidad'],

  // ── Pesticidas y Fertilizantes (cat 6, prov 2)
  ['PES001', 'Fertilizante Plantas Verdes 500ml','Fórmula alta en nitrógeno',               6, 2,  280,  540,  30, 6, 'unidad'],
  ['PES002', 'Fertilizante para Flores 500ml',  'Estimula la floración',                    6, 2,  290,  550,  28, 6, 'unidad'],
  ['PES003', 'Insecticida Sistémico 250ml',     'Controla pulgones y cochinillas',           6, 2,  350,  680,  20, 4, 'unidad'],
  ['PES004', 'Fungicida Preventivo 250ml',      'Previene hongos y mildiu',                  6, 2,  320,  620,  18, 4, 'unidad'],
  ['PES005', 'Abono Orgánico 1kg',              'Abono de liberación lenta',                 6, 2,  240,  460,  25, 5, 'unidad'],

  // ── Decoración (cat 7, prov 4)
  ['DEC001', 'Piedras Decorativas 1kg',        'Piedras de colores para macetas',            7, 4,  120,  230,  40, 8, 'kg'],
  ['DEC002', 'Guijarros Blancos 1kg',          'Guijarros blancos pulidos',                  7, 4,  130,  250,  35, 7, 'kg'],
  ['DEC003', 'Musgo Natural Seco 200g',        'Musgo para decoración y base',               7, 4,  180,  350,  20, 4, 'unidad'],
  ['DEC004', 'Cáscara de Pino Decorativa 2L',  'Mulch decorativo natural',                   7, 4,  160,  300,  25, 5, 'unidad'],
  ['DEC005', 'Grava Volcánica 1kg',            'Piedra volcánica para drenaje y deco',       7, 4,  150,  280,  30, 6, 'kg'],
]

export function setupSeed() {

  ipcMain.handle('seed:run', (_event, usuarioId) => {
    try {
      const db = getDb()

      // Preparar statements fuera de la transacción
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
        VALUES (?, 'ingreso', ?, 0, ?, 'Stock inicial (seed)', 'ajuste', ?)
      `)

      const run = db.transaction(() => {
        // ── Categorías ────────────────────────────────────────────────────
        const catIds = []
        for (const c of CATEGORIAS) {
          insertCat.run(c.nombre, c.descripcion)
          const row = getCat.get(c.nombre)
          catIds.push(row.id)
        }

        // ── Proveedores ───────────────────────────────────────────────────
        const provIds = []
        for (const p of PROVEEDORES) {
          const existe = existeProv.get(p.nombre)
          if (!existe) {
            insertProv.run(p.nombre, p.contacto, p.telefono, p.email, p.direccion)
          }
          const row = getProv.get(p.nombre)
          provIds.push(row.id)
        }

        // ── Productos ─────────────────────────────────────────────────────
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
      console.error('[Seed] Error:', e)
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('seed:clear', (_event) => {
    try {
      const db = getDb()
      const codigos = PRODUCTOS.map(p => p[0])
      const ph = codigos.map(() => '?').join(',')

      const getProds     = db.prepare(`SELECT id FROM productos WHERE codigo IN (${ph})`)
      const delMovs      = db.prepare('DELETE FROM movimientos_stock WHERE producto_id=?')
      const delProd      = db.prepare(`DELETE FROM productos WHERE codigo IN (${ph})`)
      const desactProv   = db.prepare('UPDATE proveedores SET activo=0 WHERE nombre=?')
      const delCat       = db.prepare('DELETE FROM categorias WHERE nombre=?')

      const run = db.transaction(() => {
        const prods = getProds.all(...codigos)
        for (const p of prods) delMovs.run(p.id)
        delProd.run(...codigos)
        for (const p of PROVEEDORES) desactProv.run(p.nombre)
        for (const c of CATEGORIAS) {
          try { delCat.run(c.nombre) } catch {}
        }
        return { eliminados: prods.length }
      })

      const data = run()
      return { ok: true, data }
    } catch (e) {
      console.error('[Seed] Clear error:', e)
      return { ok: false, error: e.message }
    }
  })
}
