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
    getVencimientosCercanos: () => invoke('productos:getVencimientosCercanos'),
    findDuplicate: (nombre, codigo) => invoke('productos:findDuplicate', nombre, codigo),
    create: (d, usuarioId) => invoke('productos:create', d, usuarioId),
    sumarStock: (id, cantidad, usuarioId, fechaVencLote) => invoke('productos:sumarStock', id, cantidad, usuarioId, fechaVencLote),
    update: (d) => invoke('productos:update', d),
    delete: (id) => invoke('productos:delete', id),
    updatePreciosMasivo: (pct, catId) => invoke('productos:updatePreciosMasivo', pct, catId)
  },
  ventas: {
    getAll: (d, h, options) => invoke('ventas:getAll', d, h, options),
    getById: (id) => invoke('ventas:getById', id),
    getItems: (id) => invoke('ventas:getItems', id),
    create: (v, i, u, clienteId) => invoke('ventas:create', v, i, u, clienteId),
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
    delete: (path) => invoke('backup:delete', path),
    exportWeb: () => invoke('backup:exportWeb'),
    importWeb: (jsonText) => invoke('backup:importWeb', jsonText)
  },
  sync: {
    getStatus: () => invoke('sync:getStatus'),
    pullProducts: (options) => invoke('sync:pullProducts', options),
    pushProducts: (options) => invoke('sync:pushProducts', options),
    syncProducts: (options) => invoke('sync:syncProducts', options)
  },
  cloudAuth: {
    getSession: () => invoke('cloudAuth:getSession'),
    signIn: (email, password) => invoke('cloudAuth:signIn', email, password),
    signOut: () => invoke('cloudAuth:signOut')
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
    getAll: (options) => invoke('cotizaciones:getAll', options),
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
    delete: (id) => invoke('license:delete', id),
    requestUpgrade: (payload) => invoke('license:requestUpgrade', payload),
    listUpgradeRequests: () => invoke('license:listUpgradeRequests'),
    listCommerces: () => invoke('license:listCommerces')
  },
  clientes: {
    getAll: () => invoke('clientes:getAll'),
    create: (d) => invoke('clientes:create', d),
    update: (d) => invoke('clientes:update', d),
    delete: (id) => invoke('clientes:delete', id)
  },
  cuentaCorriente: {
    getAllSaldos: () => invoke('cuentaCorriente:getAllSaldos'),
    getMovimientos: (id) => invoke('cuentaCorriente:getMovimientos', id),
    getSaldo: (id) => invoke('cuentaCorriente:getSaldo', id),
    registrarPago: (clienteId, monto, desc, uid) => invoke('cuentaCorriente:registrarPago', clienteId, monto, desc, uid),
    registrarCargo: (clienteId, ventaId, monto, desc, uid) =>
      invoke('cuentaCorriente:registrarCargo', clienteId, ventaId, monto, desc, uid)
  },
  gastos: {
    getAll: (d, h, options) => invoke('gastos:getAll', d, h, options),
    create: (d, uid) => invoke('gastos:create', d, uid),
    delete: (id) => invoke('gastos:delete', id),
    resumenMes: () => invoke('gastos:resumenMes')
  },
  listasPrecio: {
    getAll: () => invoke('listasPrecio:getAll'),
    create: (d) => invoke('listasPrecio:create', d),
    update: (d) => invoke('listasPrecio:update', d),
    delete: (id) => invoke('listasPrecio:delete', id),
    getItems: (id) => invoke('listasPrecio:getItems', id),
    setItem: (listaId, productoId, precio) => invoke('listasPrecio:setItem', listaId, productoId, precio),
    removeItem: (listaId, productoId) => invoke('listasPrecio:removeItem', listaId, productoId),
    getAllItems: (listaId) => invoke('listasPrecio:getAllItems', listaId)
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
