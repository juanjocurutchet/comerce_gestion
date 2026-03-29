import { app, shell, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  usuariosDB, categoriasDB, proveedoresDB, productosDB,
  ventasDB, stockDB, cajaDB, configDB, reportesDB
} from './db/index.js'
import { setupPrint } from './print.js'
import { setupBackup } from './backup.js'

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
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.comercio.gestion')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))
  setupPrint()
  setupBackup()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

// ─── IPC Handlers ────────────────────────────────────────────────────────────

function handle(channel, fn) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return { ok: true, data: fn(...args) }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })
}

// Usuarios
handle('usuarios:login', (u, p) => usuariosDB.login(u, p))
handle('usuarios:getAll', () => usuariosDB.getAll())
handle('usuarios:create', (d) => usuariosDB.create(d))
handle('usuarios:update', (d) => usuariosDB.update(d))
handle('usuarios:updatePassword', (id, p) => usuariosDB.updatePassword(id, p))
handle('usuarios:delete', (id) => usuariosDB.delete(id))

// Categorías
handle('categorias:getAll', () => categoriasDB.getAll())
handle('categorias:create', (d) => categoriasDB.create(d))
handle('categorias:update', (d) => categoriasDB.update(d))
handle('categorias:delete', (id) => categoriasDB.delete(id))

// Proveedores
handle('proveedores:getAll', () => proveedoresDB.getAll())
handle('proveedores:create', (d) => proveedoresDB.create(d))
handle('proveedores:update', (d) => proveedoresDB.update(d))
handle('proveedores:delete', (id) => proveedoresDB.delete(id))

// Productos
handle('productos:getAll', () => productosDB.getAll())
handle('productos:getByCodigo', (c) => productosDB.getByCodigo(c))
handle('productos:getStockBajo', () => productosDB.getStockBajo())
handle('productos:create', (d) => productosDB.create(d))
handle('productos:update', (d) => productosDB.update(d))
handle('productos:delete', (id) => productosDB.delete(id))

// Ventas
handle('ventas:getAll', (d, h) => ventasDB.getAll(d, h))
handle('ventas:getById', (id) => ventasDB.getById(id))
handle('ventas:getItems', (id) => ventasDB.getItems(id))
handle('ventas:create', (v, i, u) => ventasDB.create(v, i, u))
handle('ventas:anular', (id) => ventasDB.anular(id))
handle('ventas:resumenHoy', () => ventasDB.resumenHoy())
handle('ventas:resumenPeriodo', (d, h) => ventasDB.resumenPeriodo(d, h))

// Stock
handle('stock:getMovimientos', (id) => stockDB.getMovimientos(id))
handle('stock:ajuste', (d, u) => stockDB.ajuste(d, u))

// Caja
handle('caja:getCajaAbierta', () => cajaDB.getCajaAbierta())
handle('caja:getAll', () => cajaDB.getAll())
handle('caja:getMovimientos', (id) => cajaDB.getMovimientos(id))
handle('caja:abrir', (s, u) => cajaDB.abrir(s, u))
handle('caja:cerrar', (id) => cajaDB.cerrar(id))
handle('caja:addMovimiento', (d) => cajaDB.addMovimiento(d))

// Configuración
handle('config:getAll', () => configDB.getAll())
handle('config:setMany', (obj) => configDB.setMany(obj))

// Reportes
handle('reportes:ventasPorDia', (d, h) => reportesDB.ventasPorDia(d, h))
handle('reportes:ventasPorProducto', (d, h) => reportesDB.ventasPorProducto(d, h))
handle('reportes:ventasPorCategoria', (d, h) => reportesDB.ventasPorCategoria(d, h))
handle('reportes:resumenGeneral', () => reportesDB.resumenGeneral())
