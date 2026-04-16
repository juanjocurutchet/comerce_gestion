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
import { LicenseBlock, ActivationScreen, TrialUpgradeModal } from './components/LicenseGuard'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'
import { useClientStore } from './store/clientStore'
import { useLicenseStore } from './store/licenseStore'

function PrivateRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  const dark = useThemeStore((s) => s.dark)
  const { features, isAdmin, loaded: clientLoaded, load: loadClient } = useClientStore()
  const { status, checked, check } = useLicenseStore()
  const [showUpgrade, setShowUpgrade] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    loadClient()
    check()
  }, [])

  useEffect(() => {
    if (isAdmin || !status?.valid) return
    const daysLeft = Number(status?.daysLeft ?? 999)
    if (daysLeft > 3) return
    const cacheKey = `gcom_upgrade_modal_${status?.vence_en || 'unknown'}`
    try {
      if (sessionStorage.getItem(cacheKey) === '1') return
      sessionStorage.setItem(cacheKey, '1')
    } catch {
      void 0
    }
    setShowUpgrade(true)
  }, [status, isAdmin])

  if (!checked || !clientLoaded) return null

  if (!isAdmin) {
    if (status?.reason === 'no_key' || status?.reason === 'not_found') {
      return <ActivationScreen onActivated={() => check()} />
    }
    if (status && !status.valid) {
      return <LicenseBlock status={status} onRetry={() => check()} />
    }
  }

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {!window.__IS_PWA__ && <UpdateNotifier />}
      <TrialUpgradeModal
        status={status}
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <MainLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  {features.productos     && <Route path="/productos"     element={<Productos />} />}
                  {features.stock         && <Route path="/stock"         element={<Stock />} />}
                  {features.ventas        && <Route path="/ventas"        element={<Ventas />} />}
                  {features.cotizaciones  && <Route path="/cotizaciones"  element={<Cotizaciones />} />}
                  {features.proveedores   && <Route path="/proveedores"   element={<Proveedores />} />}
                  <Route path="/clientes"      element={<Clientes />} />
                  <Route path="/gastos"        element={<Gastos />} />
                  <Route path="/listas-precio" element={<ListasPrecios />} />
                  {features.caja          && <Route path="/caja"          element={<Caja />} />}
                  {features.reportes      && <Route path="/reportes"      element={<Reportes />} />}
                  {features.usuarios      && <Route path="/usuarios"      element={<Usuarios />} />}
                  {features.configuracion && <Route path="/configuracion" element={<Configuracion />} />}
                  {features.backup        && <Route path="/backup"        element={<Backup />} />}
                  {isAdmin                && <Route path="/comercios"     element={<Comercios />} />}
                  {isAdmin                && <Route path="/licencias"     element={<Licencias />} />}
                  <Route path="/ayuda" element={<Ayuda />} />
                </Routes>
              </MainLayout>
            </PrivateRoute>
          }
        />
      </Routes>
    </HashRouter>
  )
}
