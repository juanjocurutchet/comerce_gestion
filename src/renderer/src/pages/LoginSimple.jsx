import React, { useState, useEffect } from 'react'
import { Form, Input, Button, Card, Typography, Divider, Alert } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useClientStore } from '../store/clientStore'
import { usesJwtLicenseAdmin } from '../pwa/pwaEnv.js'

const { Title, Text } = Typography

const LoginSimple = () => {
  const showAdminCloud =
    typeof window !== 'undefined' && window.__IS_PWA__ && usesJwtLicenseAdmin()
  const [loading, setLoading] = useState(false)
  const [cloudLoading, setCloudLoading] = useState(false)
  const [cloudErr, setCloudErr] = useState('')
  const [cloudEmail, setCloudEmail] = useState(null)
  const setUser = useAuthStore((s) => s.setUser)
  const loadClient = useClientStore((s) => s.load)
  const navigate = useNavigate()

  useEffect(() => {
    if (!showAdminCloud || !window.api?.cloudAuth?.getSession) return
    let cancel = false
    ;(async () => {
      const r = await window.api.cloudAuth.getSession()
      if (cancel || !r?.ok) return
      const email = r.data?.session?.user?.email
      if (email) setCloudEmail(email)
    })()
    return () => {
      cancel = true
    }
  }, [])

  const handleSubmit = async (values) => {
    setLoading(true)
    try {
      if (!window.api?.usuarios?.login) {
        alert(
          'La API no está inicializada. Si usás la PWA, abrí /index-pwa.html o reiniciá con npm run dev:pwa y entrá por http://localhost:3000/ (debe cargar la versión web).'
        )
        return
      }
      const u = String(values.username ?? '').trim()
      const p = String(values.password ?? '')
      const res = await window.api.usuarios.login(u, p)

      if (res?.ok && res.data) {
        setUser(res.data)
        navigate('/dashboard')
      } else {
        alert(res?.error || 'Credenciales inválidas')
      }
    } catch (error) {
      alert(`Error en el login: ${error?.message || error}`)
    } finally {
      setLoading(false)
    }
  }

  const onCloudAdmin = async ({ adminEmail, adminPassword }) => {
    setCloudLoading(true)
    setCloudErr('')
    try {
      const r = await window.api.cloudAuth.signIn(adminEmail, adminPassword)
      if (!r?.ok) {
        setCloudErr(r?.error || 'No se pudo iniciar sesión')
        return
      }
      await loadClient()
      const s = await window.api.cloudAuth.getSession()
      if (s?.ok && s.data?.session?.user?.email) setCloudEmail(s.data.session.user.email)
    } catch (e) {
      setCloudErr(e?.message || String(e))
    } finally {
      setCloudLoading(false)
    }
  }

  const onCloudSignOut = async () => {
    setCloudLoading(true)
    setCloudErr('')
    try {
      await window.api.cloudAuth.signOut()
      setCloudEmail(null)
      await loadClient()
    } catch (e) {
      setCloudErr(e?.message || String(e))
    } finally {
      setCloudLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #001529 0%, #003a8c 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Card style={{ width: 380, borderRadius: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2}>Nexo Commerce</Title>
          <p>Sistema de Gestión Comercial</p>
        </div>

        <Form
          onFinish={handleSubmit}
          layout="vertical"
          initialValues={{ username: 'admin', password: 'admin123' }}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Ingrese usuario' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Usuario" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Ingrese contraseña' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Contraseña" />
          </Form.Item>
          
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              block
              size="large"
            >
              Ingresar
            </Button>
          </Form.Item>
        </Form>

        {showAdminCloud && (
          <>
            <Divider plain style={{ margin: '20px 0' }}>
              Administración (Supabase)
            </Divider>
            <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
              Usá el mismo email que en Supabase Auth. El CRUD de licencias va directo a PostgREST con tu sesión (JWT) y
              RLS: ejecutá <code>supabase/licencias-license-admin-rls.sql</code> y agregá tu correo en la tabla{' '}
              <code>license_admin_allowlist</code>. En el build: <code>VITE_SUPABASE_URL</code> y{' '}
              <code>VITE_SUPABASE_ANON_KEY</code>. Opcional: <code>VITE_PWA_ADMIN_EMAILS</code> para mostrar el menú
              solo a ciertos emails, o <code>VITE_PWA_LICENSE_CLOUD_ADMIN=true</code> sin lista en el cliente.
            </Text>
            {cloudErr ? <Alert type="error" message={cloudErr} showIcon style={{ marginBottom: 12 }} /> : null}
            {cloudEmail ? (
              <div style={{ textAlign: 'center' }}>
                <Text type="success">Sesión admin: {cloudEmail}</Text>
                <Button block style={{ marginTop: 12 }} onClick={onCloudSignOut} loading={cloudLoading}>
                  Cerrar sesión admin (cloud)
                </Button>
              </div>
            ) : (
              <Form layout="vertical" onFinish={onCloudAdmin}>
                <Form.Item
                  name="adminEmail"
                  label="Email"
                  rules={[{ required: true, type: 'email', message: 'Email válido' }]}
                >
                  <Input prefix={<MailOutlined />} placeholder="admin@tuempresa.com" autoComplete="username" />
                </Form.Item>
                <Form.Item
                  name="adminPassword"
                  label="Contraseña"
                  rules={[{ required: true, message: 'Ingresá la contraseña' }]}
                >
                  <Input.Password prefix={<LockOutlined />} placeholder="Contraseña Supabase" autoComplete="current-password" />
                </Form.Item>
                <Button type="default" htmlType="submit" loading={cloudLoading} block>
                  Ingresar como admin (cloud)
                </Button>
              </Form>
            )}
          </>
        )}

        <p style={{ textAlign: 'center', fontSize: 12, color: '#999', marginTop: 16 }}>
          Usuario local por defecto: admin / admin123
        </p>
      </Card>
    </div>
  )
}

export default LoginSimple