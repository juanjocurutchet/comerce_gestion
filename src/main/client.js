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

function loadClientConfig() {
  const candidates = [
    join(process.resourcesPath, 'resources', 'client.json'),
    join(app.getAppPath(), '..', 'resources', 'client.json'),
    join(__dirname, '../../resources/client.json')
  ]

  for (const path of candidates) {
    if (existsSync(path)) {
      try {
        return JSON.parse(readFileSync(path, 'utf-8'))
      } catch {
        break
      }
    }
  }

  return { clientId: 'default', clientName: '', features: DEFAULT_FEATURES }
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
  ipcMain.handle('client:getConfig', () => getClientConfig())
}
