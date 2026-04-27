import React, { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layout/MainLayout'
import Login from './pages/LoginSimple'
import Dashboard from './pages/Dashboard'
import Productos from './pages/Productos'
import Stock from './pages/Stock'
import Ventas from './pages/Ventas'
import Proveedores from './pages/Proveedores'
import Clientes from './pages/Clientes'
import Gastos from './pages/Gastos'
import ListasPrecios from './pages/ListasPrecios'
import Caja from './pages/Caja'
import Reportes from './pages/Reportes'
import Usuarios from './pages/Usuarios'
import Configuracion from './pages/Configuracion'
import Backup from './pages/Backup'
import Cotizaciones from './pages/Cotizaciones'
import Licencias from './pages/Licencias'
import Comercios from './pages/Comercios'
import Ayuda from './pages/Ayuda'
import UpdateNotifier from './components/UpdateNotifier'
import { LicenseBlock, ActivationScreen } from './components/LicenseGuard'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'
import { useClientStore } from './store/clientStore'
import { useLicenseStore } from './store/licenseStore'
import { isPwaAdminBuild } from './pwa/pwaEnv.js'
import { restorePwaCloudSession } from './pwa/restorePwaCloudSession.js'

const BOOT_TIMEOUT_MS = 8000

function withTimeout(promise, ms = BOOT_TIMEOUT_MS) {
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => setTimeout(() => reject(new Error('boot_timeout')), ms))
  ])
}

function PrivateRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  return user ? children : <Navigate to="/login" replace />
}

/** Clave GCOM / estado de suscripción después del login (local o nube). Los admins del panel no pasan por acá. */
function CommercialLicenseGate({ children }) {
  const user = useAuthStore((s) => s.user)
  const { isAdmin } = useClientStore()
  const { status, check } = useLicenseStore()

  const isPwa = typeof window !== 'undefined' && window.__IS_PWA__
  const needsCommercialLicense =
    (isPwa && !isPwaAdminBuild() && !isAdmin) || (!isPwa && !isAdmin)

  if (needsCommercialLicense) {
    if (status?.reason === 'no_key' || status?.reason === 'not_found') {
      return <ActivationScreen onActivated={() => check()} />
    }
    if (status && !status.valid) {
      return <LicenseBlock status={status} onRetry={() => check()} />
    }
  }

  return children
}

function LicensedRoutes() {
  const { features, isAdmin } = useClientStore()
  return (
    <PrivateRoute>
      <CommercialLicenseGate>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            {features.productos && <Route path="/productos" element={<Productos />} />}
            {features.stock && <Route path="/stock" element={<Stock />} />}
            {features.ventas && <Route path="/ventas" element={<Ventas />} />}
            {features.cotizaciones && <Route path="/cotizaciones" element={<Cotizaciones />} />}
            {features.proveedores && <Route path="/proveedores" element={<Proveedores />} />}
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/gastos" element={<Gastos />} />
            <Route path="/listas-precio" element={<ListasPrecios />} />
            {features.caja && <Route path="/caja" element={<Caja />} />}
            {features.reportes && <Route path="/reportes" element={<Reportes />} />}
            {features.usuarios && <Route path="/usuarios" element={<Usuarios />} />}
            {features.configuracion && <Route path="/configuracion" element={<Configuracion />} />}
            {features.backup && <Route path="/backup" element={<Backup />} />}
            {isAdmin && <Route path="/comercios" element={<Comercios />} />}
            {isAdmin && <Route path="/licencias" element={<Licencias />} />}
            <Route path="/ayuda" element={<Ayuda />} />
          </Routes>
        </MainLayout>
      </CommercialLicenseGate>
    </PrivateRoute>
  )
}

export default function App() {
  const dark = useThemeStore((s) => s.dark)
  const { loaded: clientLoaded, load: loadClient } = useClientStore()
  const { checked, check } = useLicenseStore()
  const [bootDone, setBootDone] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    void (async () => {
      try {
        await withTimeout(restorePwaCloudSession())
        await withTimeout(loadClient())
        await withTimeout(check())
      } catch {
        // Evita pantalla negra si alguna llamada queda colgada/offline en el arranque.
        if (!useClientStore.getState().loaded) useClientStore.setState({ loaded: true })
        if (!useLicenseStore.getState().checked) {
          useLicenseStore.setState({
            checked: true,
            status: { valid: false, offline: true, reason: 'not_found' }
          })
        }
      } finally {
        setBootDone(true)
      }
    })()
  }, [])

  if (!bootDone || !checked || !clientLoaded) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #001529 0%, #003a8c 100%)',
          color: '#fff',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}
      >
        Iniciando Nexo Commerce...
      </div>
    )
  }

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {!window.__IS_PWA__ && <UpdateNotifier />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<LicensedRoutes />} />
      </Routes>
    </HashRouter>
  )
}
