import { ipcOk, ipcErr } from './ipcShape.js'
import { exportWebSnapshot, importWebSnapshot } from './pwaSnapshot.js'
import { configDB } from '@shared/db/interface.js'
import { getPwaPublicDemoUrl } from './pwaEnv.js'

export function createPwaMockApi() {
  return {
    usuarios: {
      getAll: async () => ipcOk([]),
      login: async (u, p) => {
        const user = String(u ?? '').trim()
        const pass = String(p ?? '')
        if (user === 'admin' && (pass === 'admin' || pass === 'admin123')) {
          return ipcOk({ id: 1, nombre: 'Admin', username: 'admin', rol: 'admin' })
        }
        return ipcErr('Credenciales inválidas')
      },
      create: async (data) => ipcOk({ id: Date.now(), ...data }),
      update: async (data) => ipcOk(data),
      updatePassword: async () => ipcOk(true),
      delete: async () => ipcOk(true)
    },

    productos: {
      getAll: async () => ipcOk([]),
      getByCodigo: async () => ipcOk(null),
      getStockBajo: async () => ipcOk([]),
      getVencimientosCercanos: async () => ipcOk([]),
      findDuplicate: async () => ipcOk(null),
      create: async (data) => ipcOk({ id: Date.now(), ...data }),
      update: async (data) => ipcOk(data),
      delete: async () => ipcOk(true),
      sumarStock: async () => ipcOk(true),
      updatePreciosMasivo: async () => ipcOk(0)
    },

    categorias: {
      getAll: async () => ipcOk([]),
      create: async (data) => ipcOk({ id: Date.now(), ...data }),
      update: async (data) => ipcOk(data),
      delete: async () => ipcOk(true)
    },

    proveedores: {
      getAll: async () => ipcOk([]),
      create: async (data) => ipcOk({ id: Date.now(), ...data }),
      update: async (data) => ipcOk(data),
      delete: async () => ipcOk(true)
    },

    ventas: {
      getAll: async () => ipcOk([]),
      getById: async () => ipcOk(null),
      getItems: async () => ipcOk([]),
      create: async () => ipcOk(Date.now()),
      anular: async () => ipcOk(true),
      resumenHoy: async () => ipcOk({ cantidad: 0, total: 0 }),
      resumenPeriodo: async () => ipcOk([])
    },

    stock: {
      getMovimientos: async () => ipcOk([]),
      ajuste: async () => ipcOk(true)
    },

    caja: {
      getCajaAbierta: async () => ipcOk(null),
      getAll: async () => ipcOk([]),
      getMovimientos: async () => ipcOk([]),
      abrir: async () => ipcOk({ id: Date.now() }),
      cerrar: async () => ipcOk(true),
      addMovimiento: async () => ipcOk(true)
    },

    config: {
      getAll: async () => ipcOk({}),
      setMany: async () => ipcOk(true)
    },

    reportes: {
      ventasPorDia: async () => ipcOk([]),
      ventasPorProducto: async () => ipcOk([]),
      ventasPorCategoria: async () => ipcOk([]),
      resumenGeneral: async () =>
        ipcOk({
          total_ventas: 0,
          monto_total: 0,
          total_productos: 0,
          stock_bajo: 0,
          total_proveedores: 0
        })
    },

    cotizaciones: {
      getAll: async () => ipcOk([]),
      getById: async () => ipcOk(null),
      getItems: async () => ipcOk([]),
      create: async () => ipcOk(Date.now()),
      updateEstado: async () => ipcOk(true),
      delete: async () => ipcOk(true)
    },

    clientes: {
      getAll: async () => ipcOk([]),
      create: async (data) => ipcOk({ id: Date.now(), ...data }),
      update: async (data) => ipcOk(data),
      delete: async () => ipcOk(true)
    },

    cuentaCorriente: {
      getAllSaldos: async () => ipcOk([]),
      getMovimientos: async () => ipcOk([]),
      getSaldo: async () => ipcOk(0),
      registrarPago: async () => ipcOk(true),
      registrarCargo: async () => ipcOk(true)
    },

    listasPrecio: {
      getAll: async () => ipcOk([]),
      create: async (data) => ipcOk({ id: Date.now(), ...data }),
      update: async (data) => ipcOk(data),
      delete: async () => ipcOk(true),
      getItems: async () => ipcOk([]),
      setItem: async () => ipcOk(true),
      removeItem: async () => ipcOk(true),
      getAllItems: async () => ipcOk([])
    },

    gastos: {
      getAll: async () => ipcOk([]),
      create: async (data) => ipcOk({ id: Date.now(), ...data }),
      delete: async () => ipcOk(true),
      resumenMes: async () => ipcOk({ total: 0 })
    },

    backup: {
      getList: async () => {
        let lastDate = null
        let keepLast = 10
        let autoBackup = false
        try {
          const cfg = await configDB.getAll()
          lastDate = cfg.backupLastDate || null
          keepLast = parseInt(String(cfg.backupKeepLast || '10'), 10) || 10
          autoBackup = cfg.backupAuto !== 'false' && cfg.backupAuto !== '0'
        } catch {
          /* sin adaptador aún */
        }
        return ipcOk({
          backups: [],
          lastDate,
          backupDir: '(navegador · IndexedDB)',
          keepLast,
          autoBackup
        })
      },
      exportWeb: async () => {
        try {
          const json = await exportWebSnapshot()
          return ipcOk({ json })
        } catch (e) {
          return ipcErr(e)
        }
      },
      importWeb: async (jsonText) => {
        try {
          await importWebSnapshot(jsonText)
          return ipcOk(true)
        } catch (e) {
          return ipcErr(e)
        }
      },
      run: async () =>
        ipcErr('En la versión web usá «Exportar copia JSON» en esta pantalla. El backup a archivo .db es solo en la app de escritorio.'),
      chooseDir: async () => ipcErr('No disponible en el navegador.'),
      restore: async () => ipcErr('En la web restaurá con «Importar JSON».'),
      delete: async () => ipcErr('No disponible en el navegador.')
    },

    sync: {
      getStatus: async () => ipcErr('Sincronización no configurada en esta compilación.'),
      pullProducts: async () => ipcErr('Sincronización no configurada en esta compilación.'),
      pushProducts: async () => ipcErr('Sincronización no configurada en esta compilación.'),
      syncProducts: async () => ipcErr('Sincronización no configurada en esta compilación.')
    },

    cloudAuth: {
      getSession: async () => ipcOk({ configured: false, session: null }),
      signIn: async () => ipcErr('Autenticación cloud no configurada en esta compilación.'),
      signOut: async () => ipcOk(true),
      updatePassword: async () => ipcErr('Autenticación cloud no configurada en esta compilación.')
    },

    seed: {
      run: async () =>
        ipcErr(
          'Podés importar un respaldo JSON desde Backup, o cargar datos en la app de escritorio y exportar desde allí cuando haya paridad.'
        ),
      clear: async () => ipcErr('No disponible en PWA hasta definir borrado seguro de datos demo.')
    },

    print: {
      ticket: async (html, _options) => {
        try {
          const w = window.open('', '_blank', 'width=400,height=600')
          if (!w) return ipcErr('Ventana emergente bloqueada')
          w.document.write(html)
          w.document.close()
          w.focus()
          w.print()
          return ipcOk(true)
        } catch (e) {
          return ipcErr(e)
        }
      }
    },

    client: {
      getConfig: async () => ({
        clientName: '',
        publicDemoUrl: getPwaPublicDemoUrl(),
        features: {
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
        },
        isAdmin: true,
        logo: { full: null, icon: null }
      }),
      load: async () => ({
        nombre: 'Cliente Demo PWA',
        version: '1.0.0',
        configurado: true
      }),
      save: async () => true,
      setTitle: (title) => {
        document.title = title || 'Nexo Commerce'
      }
    },

    license: {
      check: async () => ({ valid: true, daysLeft: 365, type: 'demo' }),
      activate: async () =>
        ipcErr(
          'Definí VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el build para activar con clave, o usá la app de escritorio.'
        ),
      getStoredKey: () => null,
      getAll: async () => ipcErr('Panel de licencias solo en la app de escritorio.'),
      create: async () => ipcErr('Panel de licencias solo en la app de escritorio.'),
      update: async () => ipcErr('Panel de licencias solo en la app de escritorio.'),
      delete: async () => ipcErr('Panel de licencias solo en la app de escritorio.'),
      requestUpgrade: async () => ipcOk(true),
      listUpgradeRequests: async () => ipcErr('Panel de licencias solo en la app de escritorio.'),
      listCommerces: async () => ipcErr('Panel de licencias solo en la app de escritorio.'),
      listDemoOnboarding: async () => ipcErr('Panel de licencias solo en la app de escritorio.'),
      provisionDemoOnboarding: async () => ipcErr('Panel de licencias solo en la app de escritorio.'),
      provisionManualDemo: async () => ipcErr('Panel de licencias solo en la app de escritorio.')
    },

    demoOnboarding: {
      submit: async () =>
        ipcErr('Definí VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el build para enviar la solicitud.')
    },

    updater: {
      check: async () => ipcOk(null),
      install: async () => ipcOk(true),
      onAvailable: () => () => {},
      onNotAvailable: () => () => {},
      onProgress: () => () => {},
      onDownloaded: () => () => {},
      onError: () => () => {},
      onChecking: () => () => {}
    },

    exportData: async () => {},

    importData: async () => {},

    showOpenDialog: async () => ({ canceled: true }),

    getClientName: () => localStorage.getItem('clientName') || 'demo',

    setClientName: (name) => {
      localStorage.setItem('clientName', name)
    },

    autoUpdater: {
      onAvailable: () => {},
      onDownloaded: () => {},
      downloadUpdate: () => {},
      quitAndInstall: () => {
        location.reload()
      }
    }
  }
}
