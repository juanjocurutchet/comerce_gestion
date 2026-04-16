import { app, shell, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

app.setPath('userData', join(app.getPath('appData'), 'GestionComercio'))

// Importar abstracción de DB y adaptador SQLite
import { sqliteAdapter } from '../adapters/sqlite/index.js'
import { setDbAdapter } from '../shared/db/interface.js'
import {
  usuariosDB, categoriasDB, proveedoresDB, productosDB,
  ventasDB, stockDB, cajaDB, configDB, reportesDB, cotizacionesDB,
  clientesDB, cuentaCorrienteDB, gastosDB, listasPrecioDB
} from '../shared/db/interface.js'
import { setupPrint } from './print.js'
import { setupBackup } from './backup.js'
import { setupSeed } from './seed.js'
import { setupUpdater } from './updater.js'
import { setupClient, getClientConfig } from './client.js'
import { setupLicense } from './license.js'

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: getClientConfig().clientName || 'Nexo Commerce',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  Menu.setApplicationMenu(null)

  win.on('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.comercio.gestion')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))
  
  // Configurar adaptador de base de datos SQLite
  setDbAdapter(sqliteAdapter)
  
  setupClient()
  setupLicense()
  setupPrint()
  setupBackup()
  setupSeed()
  const win = createWindow()
  setupUpdater(win)
  ipcMain.on('window:setTitle', (_, title) => { if (title) win.setTitle(title) })
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

function handle(channel, fn) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      const result = await fn(...args)
      return { ok: true, data: result }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })
}

handle('usuarios:login', (u, p) => usuariosDB.login(u, p))
handle('usuarios:getAll', () => usuariosDB.getAll())
handle('usuarios:create', (d) => usuariosDB.create(d))
handle('usuarios:update', (d) => usuariosDB.update(d))
handle('usuarios:updatePassword', (id, p) => usuariosDB.updatePassword(id, p))
handle('usuarios:delete', (id) => usuariosDB.delete(id))

handle('categorias:getAll', () => categoriasDB.getAll())
handle('categorias:create', (d) => categoriasDB.create(d))
handle('categorias:update', (d) => categoriasDB.update(d))
handle('categorias:delete', (id) => categoriasDB.delete(id))

handle('proveedores:getAll', () => proveedoresDB.getAll())
handle('proveedores:create', (d) => proveedoresDB.create(d))
handle('proveedores:update', (d) => proveedoresDB.update(d))
handle('proveedores:delete', (id) => proveedoresDB.delete(id))

handle('productos:getAll', () => productosDB.getAll())
handle('productos:getByCodigo', (c) => productosDB.getByCodigo(c))
handle('productos:getStockBajo', () => productosDB.getStockBajo())
handle('productos:getVencimientosCercanos', () => productosDB.getVencimientosCercanos())
handle('productos:findDuplicate', (nombre, codigo) => productosDB.findDuplicate(nombre, codigo))
handle('productos:create', (d, usuarioId) => productosDB.create(d, usuarioId))
handle('productos:sumarStock', (id, cantidad, usuarioId, fechaVencLote) => productosDB.sumarStock(id, cantidad, usuarioId, fechaVencLote))
handle('productos:update', (d) => productosDB.update(d))
handle('productos:delete', (id) => productosDB.delete(id))

handle('ventas:getAll', (d, h, options) => ventasDB.getAll(d, h, options))
handle('ventas:getById', (id) => ventasDB.getById(id))
handle('ventas:getItems', (id) => ventasDB.getItems(id))
handle('ventas:create', (v, i, u, clienteId) => ventasDB.create(v, i, u, clienteId))
handle('ventas:anular', (id, usuarioId) => ventasDB.anular(id, usuarioId))
handle('ventas:resumenHoy', () => ventasDB.resumenHoy())
handle('ventas:resumenPeriodo', (d, h) => ventasDB.resumenPeriodo(d, h))

handle('stock:getMovimientos', (id) => stockDB.getMovimientos(id))
handle('stock:ajuste', (d, u) => stockDB.ajuste(d, u))

handle('caja:getCajaAbierta', () => cajaDB.getCajaAbierta())
handle('caja:getAll', () => cajaDB.getAll())
handle('caja:getMovimientos', (id) => cajaDB.getMovimientos(id))
handle('caja:abrir', (s, u) => cajaDB.abrir(s, u))
handle('caja:cerrar', (id) => cajaDB.cerrar(id))
handle('caja:addMovimiento', (d) => cajaDB.addMovimiento(d))

handle('config:getAll', () => configDB.getAll())
handle('config:setMany', (obj) => configDB.setMany(obj))
handle('cloudAuth:getSession', () => ({ configured: false, session: null, reason: 'desktop_not_supported_yet' }))
handle('cloudAuth:signIn', () => { throw new Error('La autenticación cloud PWA todavía no está disponible en escritorio.') })
handle('cloudAuth:signOut', () => true)
handle('sync:getStatus', () => ({ configured: false, reason: 'desktop_not_supported_yet' }))
handle('sync:pullProducts', () => { throw new Error('La sincronización PWA con Supabase todavía no está disponible en escritorio.') })
handle('sync:pushProducts', () => { throw new Error('La sincronización PWA con Supabase todavía no está disponible en escritorio.') })
handle('sync:syncProducts', () => { throw new Error('La sincronización PWA con Supabase todavía no está disponible en escritorio.') })

handle('reportes:ventasPorDia', (d, h) => reportesDB.ventasPorDia(d, h))
handle('reportes:ventasPorProducto', (d, h) => reportesDB.ventasPorProducto(d, h))
handle('reportes:ventasPorCategoria', (d, h) => reportesDB.ventasPorCategoria(d, h))
handle('reportes:resumenGeneral', () => reportesDB.resumenGeneral())

handle('cotizaciones:getAll', (options) => cotizacionesDB.getAll(options))
handle('cotizaciones:getById', (id) => cotizacionesDB.getById(id))
handle('cotizaciones:getItems', (id) => cotizacionesDB.getItems(id))
handle('cotizaciones:create', (c, items, uid) => cotizacionesDB.create(c, items, uid))
handle('cotizaciones:updateEstado', (id, estado) => cotizacionesDB.updateEstado(id, estado))
handle('cotizaciones:delete', (id) => cotizacionesDB.delete(id))

handle('clientes:getAll', () => clientesDB.getAll())
handle('clientes:create', (d) => clientesDB.create(d))
handle('clientes:update', (d) => clientesDB.update(d))
handle('clientes:delete', (id) => clientesDB.delete(id))

handle('cuentaCorriente:getAllSaldos', () => cuentaCorrienteDB.getAllSaldos())
handle('cuentaCorriente:getMovimientos', (id) => cuentaCorrienteDB.getMovimientos(id))
handle('cuentaCorriente:getSaldo', (id) => cuentaCorrienteDB.getSaldo(id))
handle('cuentaCorriente:registrarPago', (clienteId, monto, desc, uid) => cuentaCorrienteDB.registrarPago(clienteId, monto, desc, uid))
handle('cuentaCorriente:registrarCargo', (clienteId, ventaId, monto, desc, uid) =>
  cuentaCorrienteDB.registrarCargo(clienteId, ventaId, monto, desc, uid))

handle('gastos:getAll', (d, h, options) => gastosDB.getAll(d, h, options))
handle('gastos:create', (d, uid) => gastosDB.create(d, uid))
handle('gastos:delete', (id) => gastosDB.delete(id))
handle('gastos:resumenMes', () => gastosDB.resumenMes())

handle('listasPrecio:getAll', () => listasPrecioDB.getAll())
handle('listasPrecio:create', (d) => listasPrecioDB.create(d))
handle('listasPrecio:update', (d) => listasPrecioDB.update(d))
handle('listasPrecio:delete', (id) => listasPrecioDB.delete(id))
handle('listasPrecio:getItems', (id) => listasPrecioDB.getItems(id))
handle('listasPrecio:setItem', (listaId, productoId, precio) => listasPrecioDB.setItem(listaId, productoId, precio))
handle('listasPrecio:removeItem', (listaId, productoId) => listasPrecioDB.removeItem(listaId, productoId))
handle('listasPrecio:getAllItems', (listaId) => listasPrecioDB.getAllItems(listaId))

handle('productos:updatePreciosMasivo', (pct, catId) => productosDB.updatePreciosMasivo(pct, catId))
