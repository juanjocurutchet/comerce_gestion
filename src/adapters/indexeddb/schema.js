/**
 * Esquema de IndexedDB para PWA
 * Convierte el esquema SQLite a IndexedDB
 */

export const DB_NAME = 'GestionComercio'
export const DB_VERSION = 1

export function initIndexedDB(clientName = '') {
  return new Promise((resolve, reject) => {
    const dbName = clientName ? `${DB_NAME}_${clientName}` : DB_NAME
    const request = indexedDB.open(dbName, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      
      // Usuarios
      if (!db.objectStoreNames.contains('usuarios')) {
        const usuarios = db.createObjectStore('usuarios', { keyPath: 'id', autoIncrement: true })
        usuarios.createIndex('username', 'username', { unique: true })
      }
      
      // Categorías
      if (!db.objectStoreNames.contains('categorias')) {
        const categorias = db.createObjectStore('categorias', { keyPath: 'id', autoIncrement: true })
        categorias.createIndex('nombre', 'nombre', { unique: true })
      }
      
      // Proveedores
      if (!db.objectStoreNames.contains('proveedores')) {
        const proveedores = db.createObjectStore('proveedores', { keyPath: 'id', autoIncrement: true })
        proveedores.createIndex('nombre', 'nombre')
      }
      
      // Productos
      if (!db.objectStoreNames.contains('productos')) {
        const productos = db.createObjectStore('productos', { keyPath: 'id', autoIncrement: true })
        productos.createIndex('codigo', 'codigo', { unique: true })
        productos.createIndex('nombre', 'nombre')
        productos.createIndex('categoria_id', 'categoria_id')
        productos.createIndex('proveedor_id', 'proveedor_id')
      }
      
      // Ventas
      if (!db.objectStoreNames.contains('ventas')) {
        const ventas = db.createObjectStore('ventas', { keyPath: 'id', autoIncrement: true })
        ventas.createIndex('fecha', 'fecha')
        ventas.createIndex('usuario_id', 'usuario_id')
        ventas.createIndex('cliente_id', 'cliente_id')
      }
      
      // Venta Items
      if (!db.objectStoreNames.contains('venta_items')) {
        const ventaItems = db.createObjectStore('venta_items', { keyPath: 'id', autoIncrement: true })
        ventaItems.createIndex('venta_id', 'venta_id')
        ventaItems.createIndex('producto_id', 'producto_id')
      }
      
      // Movimientos Stock
      if (!db.objectStoreNames.contains('movimientos_stock')) {
        const movStock = db.createObjectStore('movimientos_stock', { keyPath: 'id', autoIncrement: true })
        movStock.createIndex('producto_id', 'producto_id')
        movStock.createIndex('fecha', 'fecha')
        movStock.createIndex('referencia', ['referencia_id', 'referencia_tipo'])
      }
      
      // Cajas
      if (!db.objectStoreNames.contains('cajas')) {
        const cajas = db.createObjectStore('cajas', { keyPath: 'id', autoIncrement: true })
        cajas.createIndex('fecha_apertura', 'fecha_apertura')
        cajas.createIndex('estado', 'estado')
      }
      
      // Movimientos Caja
      if (!db.objectStoreNames.contains('movimientos_caja')) {
        const movCaja = db.createObjectStore('movimientos_caja', { keyPath: 'id', autoIncrement: true })
        movCaja.createIndex('caja_id', 'caja_id')
        movCaja.createIndex('fecha', 'fecha')
      }
      
      // Cotizaciones
      if (!db.objectStoreNames.contains('cotizaciones')) {
        const cotizaciones = db.createObjectStore('cotizaciones', { keyPath: 'id', autoIncrement: true })
        cotizaciones.createIndex('fecha', 'fecha')
        cotizaciones.createIndex('estado', 'estado')
      }
      
      // Cotización Items
      if (!db.objectStoreNames.contains('cotizacion_items')) {
        const cotItems = db.createObjectStore('cotizacion_items', { keyPath: 'id', autoIncrement: true })
        cotItems.createIndex('cotizacion_id', 'cotizacion_id')
        cotItems.createIndex('producto_id', 'producto_id')
      }
      
      // Configuración
      if (!db.objectStoreNames.contains('configuracion')) {
        db.createObjectStore('configuracion', { keyPath: 'clave' })
      }
      
      // Clientes
      if (!db.objectStoreNames.contains('clientes')) {
        const clientes = db.createObjectStore('clientes', { keyPath: 'id', autoIncrement: true })
        clientes.createIndex('nombre', 'nombre')
        clientes.createIndex('dni', 'dni')
      }
      
      // Cuenta Corriente
      if (!db.objectStoreNames.contains('cuenta_corriente')) {
        const cc = db.createObjectStore('cuenta_corriente', { keyPath: 'id', autoIncrement: true })
        cc.createIndex('cliente_id', 'cliente_id')
        cc.createIndex('fecha', 'fecha')
        cc.createIndex('venta_id', 'venta_id')
      }
      
      // Listas de Precios
      if (!db.objectStoreNames.contains('listas_precio')) {
        const listas = db.createObjectStore('listas_precio', { keyPath: 'id', autoIncrement: true })
        listas.createIndex('nombre', 'nombre')
      }
      
      // Lista Precio Items
      if (!db.objectStoreNames.contains('lista_precio_items')) {
        const listaItems = db.createObjectStore('lista_precio_items', { keyPath: 'id', autoIncrement: true })
        listaItems.createIndex('lista_id', 'lista_id')
        listaItems.createIndex('producto_id', 'producto_id')
        listaItems.createIndex('unique_item', ['lista_id', 'producto_id'], { unique: true })
      }
      
      // Gastos
      if (!db.objectStoreNames.contains('gastos')) {
        const gastos = db.createObjectStore('gastos', { keyPath: 'id', autoIncrement: true })
        gastos.createIndex('fecha', 'fecha')
        gastos.createIndex('categoria', 'categoria')
      }
    }
  })
}

// Utilidades para transacciones IndexedDB
export function transaction(db, stores, mode = 'readonly') {
  return db.transaction(stores, mode)
}

export function objectStore(transaction, storeName) {
  return transaction.objectStore(storeName)
}

// Wrapper para promisificar operaciones IndexedDB
export function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}