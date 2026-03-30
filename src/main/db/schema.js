export function initSchema(db, clientName = '') {
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'vendedor',
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      descripcion TEXT
    );

    CREATE TABLE IF NOT EXISTS proveedores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      contacto TEXT,
      telefono TEXT,
      email TEXT,
      direccion TEXT,
      notas TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      categoria_id INTEGER REFERENCES categorias(id),
      proveedor_id INTEGER REFERENCES proveedores(id),
      precio_compra REAL NOT NULL DEFAULT 0,
      precio_venta REAL NOT NULL DEFAULT 0,
      stock_actual REAL NOT NULL DEFAULT 0,
      stock_minimo REAL NOT NULL DEFAULT 0,
      unidad TEXT DEFAULT 'unidad',
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT DEFAULT (datetime('now','localtime')),
      subtotal REAL NOT NULL DEFAULT 0,
      descuento REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      metodo_pago TEXT DEFAULT 'efectivo',
      estado TEXT DEFAULT 'completada',
      notas TEXT,
      usuario_id INTEGER REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS venta_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
      producto_id INTEGER NOT NULL REFERENCES productos(id),
      cantidad REAL NOT NULL,
      precio_unitario REAL NOT NULL,
      subtotal REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS movimientos_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER NOT NULL REFERENCES productos(id),
      tipo TEXT NOT NULL,
      cantidad REAL NOT NULL,
      stock_anterior REAL NOT NULL,
      stock_nuevo REAL NOT NULL,
      motivo TEXT,
      referencia_id INTEGER,
      referencia_tipo TEXT,
      fecha TEXT DEFAULT (datetime('now','localtime')),
      usuario_id INTEGER REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS cajas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha_apertura TEXT DEFAULT (datetime('now','localtime')),
      fecha_cierre TEXT,
      saldo_inicial REAL NOT NULL DEFAULT 0,
      saldo_final REAL,
      total_ventas REAL DEFAULT 0,
      total_ingresos REAL DEFAULT 0,
      total_egresos REAL DEFAULT 0,
      estado TEXT DEFAULT 'abierta',
      usuario_id INTEGER REFERENCES usuarios(id),
      notas TEXT
    );

    CREATE TABLE IF NOT EXISTS movimientos_caja (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caja_id INTEGER NOT NULL REFERENCES cajas(id),
      tipo TEXT NOT NULL,
      monto REAL NOT NULL,
      descripcion TEXT,
      metodo_pago TEXT DEFAULT 'efectivo',
      referencia_id INTEGER,
      fecha TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS configuracion (
      clave TEXT PRIMARY KEY,
      valor TEXT
    );

    CREATE TABLE IF NOT EXISTS cotizaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT DEFAULT (datetime('now','localtime')),
      subtotal REAL NOT NULL DEFAULT 0,
      descuento REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      estado TEXT DEFAULT 'pendiente',
      notas TEXT,
      validez_dias INTEGER DEFAULT 30,
      usuario_id INTEGER REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS cotizacion_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cotizacion_id INTEGER NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
      producto_id INTEGER REFERENCES productos(id),
      nombre TEXT NOT NULL,
      cantidad REAL NOT NULL,
      precio_unitario REAL NOT NULL,
      subtotal REAL NOT NULL
    );
  `)

  const adminExists = db.prepare("SELECT id FROM usuarios WHERE username = 'admin'").get()
  if (!adminExists) {
    db.prepare(`
      INSERT INTO usuarios (nombre, username, password, rol)
      VALUES ('Administrador', 'admin', 'admin123', 'admin')
    `).run()
  }

  const configCount = db.prepare("SELECT COUNT(*) as c FROM configuracion").get()
  const defaultName = clientName || 'Mi Comercio'
  if (configCount.c === 0) {
    const insertConfig = db.prepare("INSERT INTO configuracion (clave, valor) VALUES (?, ?)")
    insertConfig.run('nombreComercio', defaultName)
    insertConfig.run('direccion', '')
    insertConfig.run('telefono', '')
    insertConfig.run('cuit', '')
    insertConfig.run('ticketFooter', 'Gracias por su compra!')
  } else if (clientName) {
    db.prepare("UPDATE configuracion SET valor=? WHERE clave='nombreComercio' AND valor='Mi Comercio'").run(clientName)
  }

  const catCount = db.prepare('SELECT COUNT(*) as c FROM categorias').get()
  if (catCount.c === 0) {
    const insertCat = db.prepare('INSERT INTO categorias (nombre) VALUES (?)')
    ;['General', 'Bebidas', 'Alimentos', 'Limpieza', 'Electrónica', 'Ropa', 'Otros'].forEach(n => insertCat.run(n))
  }
}
