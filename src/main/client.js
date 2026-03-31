import { app, ipcMain } from 'electron'
import { join } from 'path'
import { readFileSync, existsSync } from 'fs'

const DEFAULT_FEATURES = {
  ventas: true,
  cotizaciones: true,
  productos: true,
  stock: true,
  proveedores: true,
  caja: true,
  reportes: true,
  usuarios: true,
  backup: true,
  configuracion: true
}

function findResourceFile(filename) {
  const candidates = [
    join(process.resourcesPath, 'resources', filename),
    join(app.getAppPath(), '..', 'resources', filename),
    join(__dirname, '../../resources', filename)
  ]
  return candidates.find(p => existsSync(p)) || null
}

function loadClientConfig() {
  const jsonPath = findResourceFile('client.json')
  if (jsonPath) {
    try {
      return JSON.parse(readFileSync(jsonPath, 'utf-8'))
    } catch {}
  }
  return { clientId: 'default', clientName: '', features: DEFAULT_FEATURES }
}

function loadLogo() {
  const logoPath = findResourceFile('logo.png')
  const iconPath = findResourceFile('logo_icon.png')
  const toBase64 = (p) => {
    try { return `data:image/png;base64,${readFileSync(p).toString('base64')}` } catch { return null }
  }
  return {
    full: logoPath ? toBase64(logoPath) : null,
    icon: iconPath ? toBase64(iconPath) : null
  }
}

let _clientConfig = null

export function getClientConfig() {
  if (!_clientConfig) {
    _clientConfig = loadClientConfig()
    _clientConfig.features = { ...DEFAULT_FEATURES, ..._clientConfig.features }
  }
  return _clientConfig
}

export function setupClient() {
  ipcMain.handle('client:getConfig', () => ({ ...getClientConfig(), logo: loadLogo() }))
}
