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
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'

function PrivateRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  const dark = useThemeStore((s) => s.dark)

  // Sincroniza clase CSS en <body> para scrollbars y elementos fuera de Ant Design
  useEffect(() => {
    document.body.classList.toggle('dark', dark)
  }, [dark])

  return (
    <HashRouter>
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
                  <Route path="/productos" element={<Productos />} />
                  <Route path="/stock" element={<Stock />} />
                  <Route path="/ventas" element={<Ventas />} />
                  <Route path="/cotizaciones" element={<Cotizaciones />} />
                  <Route path="/proveedores" element={<Proveedores />} />
                  <Route path="/caja" element={<Caja />} />
                  <Route path="/reportes" element={<Reportes />} />
                  <Route path="/usuarios" element={<Usuarios />} />
                  <Route path="/configuracion" element={<Configuracion />} />
                  <Route path="/backup" element={<Backup />} />
                </Routes>
              </MainLayout>
            </PrivateRoute>
          }
        />
      </Routes>
    </HashRouter>
  )
}
