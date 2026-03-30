import React, { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layout/MainLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Productos from './pages/Productos'
import Stock from './pages/Stock'
import Ventas from './pages/Ventas'
import Proveedores from './pages/Proveedores'
import Caja from './pages/Caja'
import Reportes from './pages/Reportes'
import Usuarios from './pages/Usuarios'
import Configuracion from './pages/Configuracion'
import Backup from './pages/Backup'
import Cotizaciones from './pages/Cotizaciones'
import UpdateNotifier from './components/UpdateNotifier'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'
import { useClientStore } from './store/clientStore'

function PrivateRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  const dark = useThemeStore((s) => s.dark)
  const { features, load } = useClientStore()

  useEffect(() => {
    document.body.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    load()
  }, [])

  return (
    <HashRouter>
      <UpdateNotifier />
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
                  {features.productos    && <Route path="/productos"    element={<Productos />} />}
                  {features.stock        && <Route path="/stock"        element={<Stock />} />}
                  {features.ventas       && <Route path="/ventas"       element={<Ventas />} />}
                  {features.cotizaciones && <Route path="/cotizaciones" element={<Cotizaciones />} />}
                  {features.proveedores  && <Route path="/proveedores"  element={<Proveedores />} />}
                  {features.caja         && <Route path="/caja"         element={<Caja />} />}
                  {features.reportes     && <Route path="/reportes"     element={<Reportes />} />}
                  {features.usuarios     && <Route path="/usuarios"     element={<Usuarios />} />}
                  {features.configuracion && <Route path="/configuracion" element={<Configuracion />} />}
                  {features.backup       && <Route path="/backup"       element={<Backup />} />}
                </Routes>
              </MainLayout>
            </PrivateRoute>
          }
        />
      </Routes>
    </HashRouter>
  )
}
