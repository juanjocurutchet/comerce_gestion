import { contextBridge, ipcRenderer } from 'electron'

const on = (channel, cb) => {
  const handler = (_event, data) => cb(data)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args)

contextBridge.exposeInMainWorld('api', {
  usuarios: {
    login: (u, p) => invoke('usuarios:login', u, p),
    getAll: () => invoke('usuarios:getAll'),
    create: (d) => invoke('usuarios:create', d),
    update: (d) => invoke('usuarios:update', d),
    updatePassword: (id, p) => invoke('usuarios:updatePassword', id, p),
    delete: (id) => invoke('usuarios:delete', id)
  },
  categorias: {
    getAll: () => invoke('categorias:getAll'),
    create: (d) => invoke('categorias:create', d),
    update: (d) => invoke('categorias:update', d),
    delete: (id) => invoke('categorias:delete', id)
  },
  proveedores: {
    getAll: () => invoke('proveedores:getAll'),
    create: (d) => invoke('proveedores:create', d),
    update: (d) => invoke('proveedores:update', d),
    delete: (id) => invoke('proveedores:delete', id)
  },
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
  ventas: {
    getAll: (d, h) => invoke('ventas:getAll', d, h),
    getById: (id) => invoke('ventas:getById', id),
    getItems: (id) => invoke('ventas:getItems', id),
    create: (v, i, u) => invoke('ventas:create', v, i, u),
    anular: (id, usuarioId) => invoke('ventas:anular', id, usuarioId),
    resumenHoy: () => invoke('ventas:resumenHoy'),
    resumenPeriodo: (d, h) => invoke('ventas:resumenPeriodo', d, h)
  },
  stock: {
    getMovimientos: (id) => invoke('stock:getMovimientos', id),
    ajuste: (d, u) => invoke('stock:ajuste', d, u)
  },
  caja: {
    getCajaAbierta: () => invoke('caja:getCajaAbierta'),
    getAll: () => invoke('caja:getAll'),
    getMovimientos: (id) => invoke('caja:getMovimientos', id),
    abrir: (s, u) => invoke('caja:abrir', s, u),
    cerrar: (id) => invoke('caja:cerrar', id),
    addMovimiento: (d) => invoke('caja:addMovimiento', d)
  },
  seed: {
    run: (usuarioId) => invoke('seed:run', usuarioId),
    clear: () => invoke('seed:clear')
  },
  backup: {
    run: () => invoke('backup:run'),
    getList: () => invoke('backup:getList'),
    chooseDir: () => invoke('backup:chooseDir'),
    restore: (path) => invoke('backup:restore', path),
    delete: (path) => invoke('backup:delete', path)
  },
  config: {
    getAll: () => invoke('config:getAll'),
    setMany: (obj) => invoke('config:setMany', obj)
  },
  print: {
    ticket: (html, options) => invoke('print:ticket', html, options)
  },
  reportes: {
    ventasPorDia: (d, h) => invoke('reportes:ventasPorDia', d, h),
    ventasPorProducto: (d, h) => invoke('reportes:ventasPorProducto', d, h),
    ventasPorCategoria: (d, h) => invoke('reportes:ventasPorCategoria', d, h),
    resumenGeneral: () => invoke('reportes:resumenGeneral')
  },
  cotizaciones: {
    getAll: () => invoke('cotizaciones:getAll'),
    getById: (id) => invoke('cotizaciones:getById', id),
    getItems: (id) => invoke('cotizaciones:getItems', id),
    create: (c, items, uid) => invoke('cotizaciones:create', c, items, uid),
    updateEstado: (id, estado) => invoke('cotizaciones:updateEstado', id, estado),
    delete: (id) => invoke('cotizaciones:delete', id)
  },
  client: {
    getConfig: () => invoke('client:getConfig'),
    setTitle: (title) => ipcRenderer.send('window:setTitle', title)
  },
  license: {
    check: () => invoke('license:check'),
    activate: (key) => invoke('license:activate', key),
    getStoredKey: () => invoke('license:getStoredKey'),
    getAll: () => invoke('license:getAll'),
    create: (payload) => invoke('license:create', payload),
    update: (id, payload) => invoke('license:update', id, payload),
    delete: (id) => invoke('license:delete', id)
  },
  updater: {
    check: () => invoke('updater:check'),
    install: () => invoke('updater:install'),
    onChecking: (cb) => on('updater:checking', cb),
    onAvailable: (cb) => on('updater:available', cb),
    onNotAvailable: (cb) => on('updater:not-available', cb),
    onProgress: (cb) => on('updater:progress', cb),
    onDownloaded: (cb) => on('updater:downloaded', cb),
    onError: (cb) => on('updater:error', cb)
  }
})
