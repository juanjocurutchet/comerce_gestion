import { app, shell, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  usuariosDB, categoriasDB, proveedoresDB, productosDB,
  ventasDB, stockDB, cajaDB, configDB, reportesDB, cotizacionesDB
} from './db/index.js'
import { setupPrint } from './print.js'
import { setupBackup } from './backup.js'
import { setupSeed } from './seed.js'
import { setupUpdater } from './updater.js'
import { setupClient } from './client.js'

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Gestión Comercio',
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

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.comercio.gestion')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))
  setupClient()
  setupPrint()
  setupBackup()
  setupSeed()
  const win = createWindow()
  setupUpdater(win)
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

function handle(channel, fn) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return { ok: true, data: fn(...args) }
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
handle('productos:findDuplicate', (nombre, codigo) => productosDB.findDuplicate(nombre, codigo))
handle('productos:create', (d, usuarioId) => productosDB.create(d, usuarioId))
handle('productos:sumarStock', (id, cantidad, usuarioId) => productosDB.sumarStock(id, cantidad, usuarioId))
handle('productos:update', (d) => productosDB.update(d))
handle('productos:delete', (id) => productosDB.delete(id))

handle('ventas:getAll', (d, h) => ventasDB.getAll(d, h))
handle('ventas:getById', (id) => ventasDB.getById(id))
handle('ventas:getItems', (id) => ventasDB.getItems(id))
handle('ventas:create', (v, i, u) => ventasDB.create(v, i, u))
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

handle('reportes:ventasPorDia', (d, h) => reportesDB.ventasPorDia(d, h))
handle('reportes:ventasPorProducto', (d, h) => reportesDB.ventasPorProducto(d, h))
handle('reportes:ventasPorCategoria', (d, h) => reportesDB.ventasPorCategoria(d, h))
handle('reportes:resumenGeneral', () => reportesDB.resumenGeneral())

handle('cotizaciones:getAll', () => cotizacionesDB.getAll())
handle('cotizaciones:getById', (id) => cotizacionesDB.getById(id))
handle('cotizaciones:getItems', (id) => cotizacionesDB.getItems(id))
handle('cotizaciones:create', (c, items, uid) => cotizacionesDB.create(c, items, uid))
handle('cotizaciones:updateEstado', (id, estado) => cotizacionesDB.updateEstado(id, estado))
handle('cotizaciones:delete', (id) => cotizacionesDB.delete(id))
