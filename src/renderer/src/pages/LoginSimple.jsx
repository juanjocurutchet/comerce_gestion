import React, { useState } from 'react'
import { Form, Input, Button, Card, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useClientStore } from '../store/clientStore'
import { useLicenseStore } from '../store/licenseStore'
import { looksLikeEmail } from '../pwa/pwaEnv.js'

const COMMERCE_ID_STORAGE_KEY = 'gcom_commerce_id'

const { Title, Text } = Typography

function mapMembershipToCommerceRole(memberships) {
  const roles = (memberships || []).map((m) => String(m?.role || '').toLowerCase()).filter(Boolean)
  if (roles.some((r) => r === 'owner')) return 'propietario'
  if (roles.some((r) => r === 'admin')) return 'gestor'
  return 'cliente'
}

const LoginSimple = () => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const setUser = useAuthStore((s) => s.setUser)
  const loadClient = useClientStore((s) => s.load)
  const checkLicense = useLicenseStore((s) => s.check)
  const navigate = useNavigate()

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
      const pwa = typeof window !== 'undefined' && window.__IS_PWA__
      const cloudEnabled = pwa && window.api?.cloudAuth?.signIn
      let res = null

      if (cloudEnabled) {
        if (!looksLikeEmail(u)) {
          alert('Ingresá un email válido.')
          return
        }
        const cloud = await window.api.cloudAuth.signIn(u, p)
        if (!cloud?.ok) {
          alert(cloud?.error || 'Credenciales inválidas')
          return
        }
        const session = await window.api.cloudAuth.getSession()
        const sessUser = session?.ok ? session.data?.session?.user : null
        const email = sessUser?.email || u
        const userId = sessUser?.id || email
        const mustChangePassword =
          sessUser?.user_metadata?.gcom_must_change_password === true
        const membershipsResp = await window.api.cloudAuth.getMemberships()
        const memberships = membershipsResp?.ok && Array.isArray(membershipsResp.data) ? membershipsResp.data : []
        const licenseAdminRpc = await window.api.cloudAuth.isLicenseAdminFromJwt?.()
        const isLicenseAdminOnly =
          !memberships.length && licenseAdminRpc?.ok === true && licenseAdminRpc.data === true
        if (!memberships.length && !isLicenseAdminOnly) {
          try {
            await window.api.cloudAuth.signOut()
          } catch {
            void 0
          }
          alert(t('login.noCommerceAssigned'))
          return
        }
        const commerceRole = memberships.length ? mapMembershipToCommerceRole(memberships) : 'propietario'
        const primaryCommerceId = memberships.map((m) => m.commerce_id).find(Boolean)
        if (primaryCommerceId) {
          try {
            await window.api?.config?.setMany?.({ commerceId: primaryCommerceId })
            localStorage.setItem(COMMERCE_ID_STORAGE_KEY, primaryCommerceId)
          } catch {
            void 0
          }
        }
        const cloudUser = {
          id: `cloud:${userId}`,
          nombre: email,
          username: email,
          rol: commerceRole,
          memberships,
          authSource: 'cloud',
          mustChangePassword
        }
        res = { ok: true, data: cloudUser }
      } else {
        // Escritorio / modo sin cloud auth: mantiene login local legado.
        res = await window.api.usuarios.login(u, p)
      }

      if (res?.ok && res.data) {
        const source = res.data?.authSource || 'local'
        setUser({ ...res.data, authSource: source })
        await loadClient()
        await checkLicense()
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

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #001529 0%, #003a8c 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Card style={{ width: 380, borderRadius: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2}>Nexo Commerce</Title>
          <p>Sistema de Gestión Comercial</p>
        </div>

        <Form
          onFinish={handleSubmit}
          layout="vertical"
          initialValues={{ username: '', password: '' }}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Ingrese usuario o email' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email" autoComplete="username" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Ingrese contraseña' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Contraseña" autoComplete="current-password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              Ingresar
            </Button>
          </Form.Item>
        </Form>

        {typeof window !== 'undefined' && window.__IS_PWA__ ? (
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 8, fontSize: 12 }}>
            {t('login.cloudHint')}
          </Text>
        ) : (
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 8, fontSize: 12 }}>
            {t('login.defaultHint')}
          </Text>
        )}
      </Card>
    </div>
  )
}

export default LoginSimple
