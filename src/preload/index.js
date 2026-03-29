import { contextBridge, ipcRenderer } from 'electron'

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args)

contextBridge.exposeInMainWorld('api', {
  // Usuarios
  usuarios: {
    login: (u, p) => invoke('usuarios:login', u, p),
    getAll: () => invoke('usuarios:getAll'),
    create: (d) => invoke('usuarios:create', d),
    update: (d) => invoke('usuarios:update', d),
    updatePassword: (id, p) => invoke('usuarios:updatePassword', id, p),
    delete: (id) => invoke('usuarios:delete', id)
  },
  // Categorías
  categorias: {
    getAll: () => invoke('categorias:getAll'),
    create: (d) => invoke('categorias:create', d),
    update: (d) => invoke('categorias:update', d),
    delete: (id) => invoke('categorias:delete', id)
  },
  // Proveedores
  proveedores: {
    getAll: () => invoke('proveedores:getAll'),
    create: (d) => invoke('proveedores:create', d),
    update: (d) => invoke('proveedores:update', d),
    delete: (id) => invoke('proveedores:delete', id)
  },
  // Productos
  productos: {
    getAll: () => invoke('productos:getAll'),
    getByCodigo: (c) => invoke('productos:getByCodigo', c),
    getStockBajo: () => invoke('productos:getStockBajo'),
    findDuplicate: (nombre, codigo) => invoke('productos:findDuplicate', nombre, codigo),
    create: (d, usuarioId) => invoke('productos:create', d, usuarioId),
    sumarStock: (id, cantidad, usuarioId) => invoke('productos:sumarStock', id, cantidad, usuarioId),
    update: (d) => invoke('productos:update', d),
    delete: (id) => invoke('productos:delete', id)
  },
  // Ventas
  ventas: {
    getAll: (d, h) => invoke('ventas:getAll', d, h),
    getById: (id) => invoke('ventas:getById', id),
    getItems: (id) => invoke('ventas:getItems', id),
    create: (v, i, u) => invoke('ventas:create', v, i, u),
    anular: (id) => invoke('ventas:anular', id),
    resumenHoy: () => invoke('ventas:resumenHoy'),
    resumenPeriodo: (d, h) => invoke('ventas:resumenPeriodo', d, h)
  },
  // Stock
  stock: {
    getMovimientos: (id) => invoke('stock:getMovimientos', id),
    ajuste: (d, u) => invoke('stock:ajuste', d, u)
  },
  // Caja
  caja: {
    getCajaAbierta: () => invoke('caja:getCajaAbierta'),
    getAll: () => invoke('caja:getAll'),
    getMovimientos: (id) => invoke('caja:getMovimientos', id),
    abrir: (s, u) => invoke('caja:abrir', s, u),
    cerrar: (id) => invoke('caja:cerrar', id),
    addMovimiento: (d) => invoke('caja:addMovimiento', d)
  },
  // Backup
  backup: {
    run: () => invoke('backup:run'),
    getList: () => invoke('backup:getList'),
    chooseDir: () => invoke('backup:chooseDir'),
    restore: (path) => invoke('backup:restore', path),
    delete: (path) => invoke('backup:delete', path)
  },
  // Configuración
  config: {
    getAll: () => invoke('config:getAll'),
    setMany: (obj) => invoke('config:setMany', obj)
  },
  // Impresión
  print: {
    ticket: (html, options) => invoke('print:ticket', html, options)
  },
  // Reportes
  reportes: {
    ventasPorDia: (d, h) => invoke('reportes:ventasPorDia', d, h),
    ventasPorProducto: (d, h) => invoke('reportes:ventasPorProducto', d, h),
    ventasPorCategoria: (d, h) => invoke('reportes:ventasPorCategoria', d, h),
    resumenGeneral: () => invoke('reportes:resumenGeneral')
  }
})
